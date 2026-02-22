/**
 * Core execution engine.
 * Fetches pending scheduled actions, executes them via Facebook API,
 * and logs results back to Airtable.
 */

import type { Env, ScheduleRecord } from './types';
import { getMasterProfileToken, fetchPendingActions, updateScheduleRecord } from './airtable';
import { updateCampaignBudget, updateCampaignStatus } from './facebook';

// =============================================================================
// EXECUTE ALL PENDING ACTIONS
// =============================================================================

export async function executeScheduledActions(env: Env): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  // 1. Get master profile token
  console.log('[executor] Fetching master profile token...');
  const accessToken = await getMasterProfileToken(env);
  console.log('[executor] Got token, fetching pending actions...');

  // 2. Fetch all pending actions
  const actions = await fetchPendingActions(env);
  console.log(`[executor] Found ${actions.length} pending action(s)`);

  if (actions.length === 0) {
    return { total: 0, success: 0, failed: 0 };
  }

  // 3. Execute each action independently
  const results = await Promise.allSettled(
    actions.map((action) => executeAction(action, accessToken, env)),
  );

  let success = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(`[executor] Done: ${actions.length} total, ${success} success, ${failed} failed`);
  return { total: actions.length, success, failed };
}

// =============================================================================
// EXECUTE SINGLE ACTION
// =============================================================================

async function executeAction(
  action: ScheduleRecord,
  accessToken: string,
  env: Env,
): Promise<boolean> {
  const { id, fields } = action;
  const campaignId = fields['Campaign Id'];
  const type = fields.Type;
  const execute = fields.Execute;

  console.log(`[executor] Processing action ${id}: type=${type}, campaign=${campaignId}, execute=${execute}`);

  if (!campaignId || !type || !execute) {
    console.log(`[executor] Action ${id}: missing required fields`);
    await safeUpdate(env, id, {
      Status: 'Failed',
      Response: JSON.stringify({ error: 'Missing required fields: Campaign Id, Type, or Execute' }),
    });
    return false;
  }

  // Mark as Running to prevent double-execution
  await safeUpdate(env, id, { Status: 'Running' });

  try {
    let result;

    if (type === 'Budget Change') {
      const dollars = parseFloat(execute);
      if (isNaN(dollars) || dollars <= 0) {
        throw new Error(`Invalid budget value: ${execute}`);
      }
      const cents = Math.round(dollars * 100);
      console.log(`[executor] Action ${id}: setting budget to ${cents} cents for campaign ${campaignId}`);
      result = await updateCampaignBudget(campaignId, cents, accessToken, env.FB_APP_SECRET);
    } else if (type === 'Status Change') {
      const status = execute.toUpperCase();
      if (status !== 'ACTIVE' && status !== 'PAUSED') {
        throw new Error(`Invalid status value: ${execute}. Must be ACTIVE or PAUSED`);
      }
      console.log(`[executor] Action ${id}: setting status to ${status} for campaign ${campaignId}`);
      result = await updateCampaignStatus(campaignId, status, accessToken, env.FB_APP_SECRET);
    } else {
      throw new Error(`Unknown action type: ${type}`);
    }

    console.log(`[executor] Action ${id}: FB API result:`, JSON.stringify(result));

    // Write result back to Airtable
    const today = new Date().toISOString().split('T')[0];
    await safeUpdate(env, id, {
      Status: result.success ? 'Success' : 'Failed',
      'Executed At': today,
      Response: JSON.stringify(result.response),
    });

    return result.success;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[executor] Action ${id} error:`, errorMessage);

    await safeUpdate(env, id, {
      Status: 'Failed',
      'Executed At': new Date().toISOString().split('T')[0],
      Response: JSON.stringify({ error: errorMessage }),
    });

    return false;
  }
}

/**
 * Safe Airtable update that won't throw and crash the whole action.
 * If the update itself fails, log the error but don't propagate.
 */
async function safeUpdate(
  env: Env,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  try {
    await updateScheduleRecord(env, recordId, fields);
  } catch (err) {
    console.error(`[executor] Failed to update record ${recordId}:`, err);
  }
}
