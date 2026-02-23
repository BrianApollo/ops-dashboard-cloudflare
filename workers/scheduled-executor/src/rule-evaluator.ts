/**
 * Core rule evaluation engine.
 *
 * Fetches scaling rules from Airtable, resolves target campaigns,
 * evaluates ROAS conditions via Facebook insights, executes actions,
 * and logs results to both Airtable and D1.
 */

import type { Env } from './types';
import type {
  ParsedRule,
  ActionResult,
  RuleExecutionLog,
  RuleEvaluationSummary,
} from './rule-types';
import {
  recordToRule,
  shouldRunRule,
  evaluateRoasCondition,
  calculateNewBudget,
  getDateRange,
  formatDate,
  sleep,
} from './rule-types';
import { getMasterProfileToken, fetchScalingRules } from './airtable';
import {
  fetchAdAccounts,
  fetchActiveCampaigns,
  fetchCampaignInsightsDaily,
  updateCampaignBudget,
  updateCampaignStatus,
} from './facebook';
import type { FbCampaign, DailyInsight } from './facebook';
import { ensureRuleLogTable } from './d1';
import { logRuleExecution } from './rule-logger';

// =============================================================================
// OPTIONS
// =============================================================================

export interface EvaluateOptions {
  currentUtcHour?: number;
  ruleId?: string;
  force?: boolean;
  dryRun?: boolean;
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

export async function evaluateRules(
  env: Env,
  options: EvaluateOptions = {},
): Promise<RuleEvaluationSummary> {
  const startTime = Date.now();
  const results: RuleExecutionLog[] = [];

  // 1. Ensure D1 table exists
  await ensureRuleLogTable(env.DB);

  // 2. Fetch and parse all scaling rules
  console.log('[rules] Fetching scaling rules...');
  const rawRules = await fetchScalingRules(env);
  let rules = rawRules.map(recordToRule);
  console.log(`[rules] Found ${rules.length} rule(s)`);

  // Filter to specific rule if requested
  if (options.ruleId) {
    rules = rules.filter((r) => r.id === options.ruleId);
    if (rules.length === 0) {
      console.log(`[rules] Rule ${options.ruleId} not found`);
      return { rulesEvaluated: 0, totalActions: 0, results: [] };
    }
  }

  // Filter by schedule match (unless forced)
  if (!options.force && options.currentUtcHour !== undefined) {
    rules = rules.filter((r) => shouldRunRule(r, options.currentUtcHour!));
    if (rules.length === 0) {
      console.log(`[rules] No rules scheduled for UTC hour ${options.currentUtcHour}`);
      return { rulesEvaluated: 0, totalActions: 0, results: [] };
    }
  }

  console.log(`[rules] Evaluating ${rules.length} rule(s)...`);

  // 3. Fetch master profile token
  const accessToken = await getMasterProfileToken(env);

  // 4. Resolve all active campaigns (shared across rules)
  console.log('[rules] Fetching ad accounts and campaigns...');
  const adAccounts = await fetchAdAccounts(accessToken, env.FB_APP_SECRET);
  console.log(`[rules] Found ${adAccounts.length} active ad account(s)`);

  const allCampaigns: FbCampaign[] = [];
  for (const account of adAccounts) {
    try {
      const campaigns = await fetchActiveCampaigns(
        account.id,
        accessToken,
        env.FB_APP_SECRET,
      );
      allCampaigns.push(...campaigns);
    } catch (err) {
      console.error(`[rules] Failed to fetch campaigns for ${account.id}:`, err);
    }
  }
  console.log(`[rules] Found ${allCampaigns.length} active campaign(s) total`);

  // 5. Determine the maximum lookback needed across all rules
  const maxDays = Math.max(
    ...rules
      .filter((r) => r.condition)
      .map((r) => r.condition!.days),
    1,
  );

  // 6. Fetch daily insights for the lookback period (once, shared)
  const dateRange = getDateRange(maxDays);
  const since = dateRange[0];
  const until = dateRange[dateRange.length - 1];
  console.log(`[rules] Fetching insights from ${since} to ${until} (${maxDays} days)...`);

  // Build map: campaignId → Map<date, roas>
  const roasMap = new Map<string, Map<string, number>>();

  for (const account of adAccounts) {
    try {
      const insights = await fetchCampaignInsightsDaily(
        account.id,
        since,
        until,
        accessToken,
        env.FB_APP_SECRET,
      );
      for (const row of insights) {
        if (!roasMap.has(row.campaign_id)) {
          roasMap.set(row.campaign_id, new Map());
        }
        roasMap.get(row.campaign_id)!.set(row.date_start, row.purchase_roas);
      }
    } catch (err) {
      console.error(`[rules] Failed to fetch insights for ${account.id}:`, err);
    }
  }

  // 7. Evaluate each rule sequentially
  let totalActions = 0;

  for (const rule of rules) {
    const ruleStart = Date.now();

    try {
      const logEntry = await evaluateSingleRule(
        rule,
        allCampaigns,
        roasMap,
        accessToken,
        env,
        options.dryRun ?? false,
      );
      logEntry.durationMs = Date.now() - ruleStart;
      totalActions += logEntry.campaignsMatched;

      await logRuleExecution(env, logEntry);
      results.push(logEntry);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[rules] Rule "${rule.name}" failed:`, errorMessage);

      const logEntry: RuleExecutionLog = {
        id: crypto.randomUUID(),
        ruleId: rule.id,
        ruleName: rule.name,
        executedAt: new Date().toISOString(),
        campaignsEvaluated: 0,
        campaignsMatched: 0,
        actionsTaken: '[]',
        status: 'Failed',
        error: errorMessage,
        durationMs: Date.now() - ruleStart,
      };

      await logRuleExecution(env, logEntry);
      results.push(logEntry);
    }
  }

  console.log(
    `[rules] Done: ${rules.length} rules evaluated, ${totalActions} actions, ${Date.now() - startTime}ms`,
  );

  return { rulesEvaluated: rules.length, totalActions, results };
}

// =============================================================================
// SINGLE RULE EVALUATION
// =============================================================================

async function evaluateSingleRule(
  rule: ParsedRule,
  allCampaigns: FbCampaign[],
  roasMap: Map<string, Map<string, number>>,
  accessToken: string,
  env: Env,
  dryRun: boolean,
): Promise<RuleExecutionLog> {
  console.log(`[rules] Evaluating rule "${rule.name}" (${rule.select}, ${rule.scope})`);

  // Resolve target campaigns
  const targetCampaigns = resolveTargetCampaigns(rule, allCampaigns);
  console.log(`[rules] Rule "${rule.name}": ${targetCampaigns.length} target campaign(s)`);

  if (targetCampaigns.length === 0) {
    return {
      id: crypto.randomUUID(),
      ruleId: rule.id,
      ruleName: rule.name,
      executedAt: new Date().toISOString(),
      campaignsEvaluated: 0,
      campaignsMatched: 0,
      actionsTaken: '[]',
      status: 'No Match',
      durationMs: 0,
    };
  }

  // Handle Maximum Global Budget separately
  if (rule.select === 'Maximum Global Budget') {
    const actionResults = await handleMaxGlobalBudget(
      rule,
      targetCampaigns,
      accessToken,
      env.FB_APP_SECRET,
      dryRun,
    );

    return {
      id: crypto.randomUUID(),
      ruleId: rule.id,
      ruleName: rule.name,
      executedAt: new Date().toISOString(),
      campaignsEvaluated: targetCampaigns.length,
      campaignsMatched: actionResults.length,
      actionsTaken: JSON.stringify(actionResults),
      status: determineStatus(actionResults, dryRun),
      durationMs: 0,
    };
  }

  // ROAS-based rules (Budget Change, Status Change)
  if (!rule.condition || !rule.action) {
    throw new Error(`Rule "${rule.name}" has no parseable condition or action`);
  }

  const ruleDateRange = getDateRange(rule.condition.days);
  const matchedCampaigns: FbCampaign[] = [];

  for (const campaign of targetCampaigns) {
    const campaignRoas = roasMap.get(campaign.id);
    if (!campaignRoas) continue;

    if (evaluateRoasCondition(rule.condition, campaignRoas, ruleDateRange)) {
      matchedCampaigns.push(campaign);
    }
  }

  console.log(
    `[rules] Rule "${rule.name}": ${matchedCampaigns.length}/${targetCampaigns.length} campaigns matched condition`,
  );

  if (matchedCampaigns.length === 0) {
    return {
      id: crypto.randomUUID(),
      ruleId: rule.id,
      ruleName: rule.name,
      executedAt: new Date().toISOString(),
      campaignsEvaluated: targetCampaigns.length,
      campaignsMatched: 0,
      actionsTaken: '[]',
      status: 'No Match',
      durationMs: 0,
    };
  }

  // Execute actions
  const actionResults = await executeRuleActions(
    rule,
    matchedCampaigns,
    accessToken,
    env.FB_APP_SECRET,
    dryRun,
  );

  return {
    id: crypto.randomUUID(),
    ruleId: rule.id,
    ruleName: rule.name,
    executedAt: new Date().toISOString(),
    campaignsEvaluated: targetCampaigns.length,
    campaignsMatched: matchedCampaigns.length,
    actionsTaken: JSON.stringify(actionResults),
    status: determineStatus(actionResults, dryRun),
    durationMs: 0,
  };
}

// =============================================================================
// CAMPAIGN RESOLUTION
// =============================================================================

function resolveTargetCampaigns(
  rule: ParsedRule,
  allCampaigns: FbCampaign[],
): FbCampaign[] {
  if (rule.scope === 'Global') {
    return allCampaigns;
  }

  // Scoped: match by campaign name (case-insensitive contains)
  return allCampaigns.filter((c) =>
    rule.appliesTo.some((name) =>
      c.name.toLowerCase().includes(name.toLowerCase()),
    ),
  );
}

// =============================================================================
// MAXIMUM GLOBAL BUDGET
// =============================================================================

async function handleMaxGlobalBudget(
  rule: ParsedRule,
  campaigns: FbCampaign[],
  accessToken: string,
  appSecret: string,
  dryRun: boolean,
): Promise<ActionResult[]> {
  const maxBudgetDollars = rule.action?.value;
  if (!maxBudgetDollars || maxBudgetDollars <= 0) {
    throw new Error(`Invalid max budget value for rule "${rule.name}"`);
  }
  const maxBudgetCents = Math.round(maxBudgetDollars * 100);

  // Sum all campaign daily budgets (in cents)
  let totalBudgetCents = 0;
  const campaignsWithBudget = campaigns.filter((c) => {
    const budget = parseInt(c.daily_budget || '0', 10);
    if (budget > 0) {
      totalBudgetCents += budget;
      return true;
    }
    return false;
  });

  console.log(
    `[rules] Max Global Budget: total=$${(totalBudgetCents / 100).toFixed(2)}, cap=$${maxBudgetDollars}`,
  );

  if (totalBudgetCents <= maxBudgetCents) {
    console.log('[rules] Total budget within cap, no action needed');
    return [];
  }

  const ratio = maxBudgetCents / totalBudgetCents;
  const results: ActionResult[] = [];

  for (const campaign of campaignsWithBudget) {
    const currentBudget = parseInt(campaign.daily_budget || '0', 10);
    const newBudget = Math.max(100, Math.floor(currentBudget * ratio));

    if (dryRun) {
      results.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        action: 'set_max_budget',
        previousValue: currentBudget,
        newValue: newBudget,
        success: true,
      });
      continue;
    }

    try {
      await updateCampaignBudget(campaign.id, newBudget, accessToken, appSecret);
      results.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        action: 'set_max_budget',
        previousValue: currentBudget,
        newValue: newBudget,
        success: true,
      });
    } catch (err) {
      results.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        action: 'set_max_budget',
        previousValue: currentBudget,
        newValue: newBudget,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await sleep(500);
  }

  return results;
}

// =============================================================================
// ROAS-BASED ACTIONS
// =============================================================================

async function executeRuleActions(
  rule: ParsedRule,
  matchedCampaigns: FbCampaign[],
  accessToken: string,
  appSecret: string,
  dryRun: boolean,
): Promise<ActionResult[]> {
  const action = rule.action!;
  const results: ActionResult[] = [];

  for (const campaign of matchedCampaigns) {
    const currentBudgetCents = parseInt(campaign.daily_budget || '0', 10);

    try {
      if (action.type === 'turn_off') {
        if (!dryRun) {
          await updateCampaignStatus(campaign.id, 'PAUSED', accessToken, appSecret);
        }
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          action: 'turn_off',
          previousValue: 'ACTIVE',
          newValue: 'PAUSED',
          success: true,
        });
      } else if (action.type === 'increase_budget' || action.type === 'reduce_budget') {
        if (!currentBudgetCents) {
          console.warn(
            `[rules] Campaign ${campaign.id} has no daily_budget, skipping budget change`,
          );
          continue;
        }

        const newBudgetCents = calculateNewBudget(currentBudgetCents, action);
        if (newBudgetCents === null) continue;

        if (!dryRun) {
          await updateCampaignBudget(campaign.id, newBudgetCents, accessToken, appSecret);
        }
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          action: action.type,
          previousValue: currentBudgetCents,
          newValue: newBudgetCents,
          success: true,
        });
      }
    } catch (err) {
      results.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        action: action.type,
        previousValue: action.type === 'turn_off' ? 'ACTIVE' : currentBudgetCents,
        newValue: action.type === 'turn_off' ? 'PAUSED' : 0,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await sleep(500);
  }

  return results;
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

function determineStatus(
  actionResults: ActionResult[],
  dryRun: boolean,
): RuleExecutionLog['status'] {
  if (dryRun) return 'Dry Run';
  if (actionResults.length === 0) return 'No Match';
  const allSuccess = actionResults.every((r) => r.success);
  const allFailed = actionResults.every((r) => !r.success);
  if (allSuccess) return 'Success';
  if (allFailed) return 'Failed';
  return 'Partial';
}
