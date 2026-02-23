/**
 * Rule types and parsers for the scheduled executor worker.
 * Subset of src/features/rules/types.ts — only what the worker needs.
 */

// =============================================================================
// TYPES
// =============================================================================

export type RuleScope = 'Global' | 'Scoped';

export type RuleSelect = 'Maximum Global Budget' | 'Budget Change' | 'Status Change';

export type CheckAt = 'Midnight';

export type ConditionOperator = 'over' | 'under';

export type ActionType = 'increase_budget' | 'reduce_budget' | 'turn_off' | 'set_max_budget';

export interface RuleCondition {
  metric: 'roas';
  operator: ConditionOperator;
  value: number;
  days: number;
}

export interface RuleAction {
  type: ActionType;
  value?: number;
}

export interface ScalingRuleRecord {
  id: string;
  fields: {
    Name: string;
    'Rule Scope': RuleScope;
    'Applies to [Campaigns]'?: string[];
    Select: RuleSelect;
    'Check At': CheckAt;
    If?: string;
    Then?: string;
    'Execute Action At'?: CheckAt;
  };
}

export interface ParsedRule {
  id: string;
  name: string;
  scope: RuleScope;
  appliesTo: string[];
  select: RuleSelect;
  checkAt: CheckAt;
  executeAt: CheckAt;
  condition: RuleCondition | null;
  action: RuleAction | null;
}

export interface ActionResult {
  campaignId: string;
  campaignName: string;
  action: string;
  previousValue: number | string;
  newValue: number | string;
  success: boolean;
  error?: string;
}

export interface RuleExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  executedAt: string;
  campaignsEvaluated: number;
  campaignsMatched: number;
  actionsTaken: string;
  status: 'Success' | 'Partial' | 'Failed' | 'No Match' | 'Dry Run';
  error?: string;
  durationMs: number;
}

export interface RuleEvaluationSummary {
  rulesEvaluated: number;
  totalActions: number;
  results: RuleExecutionLog[];
}

// =============================================================================
// PARSERS
// =============================================================================

export function parseCondition(raw: string | undefined): RuleCondition | null {
  if (!raw) return null;
  const match = raw.match(/roas\s+is\s+(over|under)\s+([\d.]+)\s+for\s+(\d+)\s+day/i);
  if (!match) return null;
  return {
    metric: 'roas',
    operator: match[1].toLowerCase() as ConditionOperator,
    value: parseFloat(match[2]),
    days: parseInt(match[3], 10),
  };
}

export function parseAction(raw: string | undefined): RuleAction | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (lower === 'turn off') return { type: 'turn_off' };
  const increaseMatch = raw.match(/increase\s+budget\s+by\s+([\d.]+)x/i);
  if (increaseMatch) return { type: 'increase_budget', value: parseFloat(increaseMatch[1]) };
  const reduceMatch = raw.match(/reduce\s+by\s+([\d.]+)%/i);
  if (reduceMatch) return { type: 'reduce_budget', value: parseFloat(reduceMatch[1]) };
  return null;
}

export function recordToRule(record: ScalingRuleRecord): ParsedRule {
  const f = record.fields;
  return {
    id: record.id,
    name: f.Name || '',
    scope: f['Rule Scope'] || 'Global',
    appliesTo: f['Applies to [Campaigns]'] || [],
    select: f.Select || 'Budget Change',
    checkAt: f['Check At'] || 'Midnight',
    executeAt: f['Execute Action At'] || 'Midnight',
    condition: parseCondition(f.If),
    action: parseAction(f.Then),
  };
}

// =============================================================================
// SCHEDULE MATCHING
// =============================================================================

/** Map CheckAt values to UTC hours they should fire at */
const SCHEDULE_MAP: Record<string, number[]> = {
  Midnight: [17], // midnight GMT+7 = 17:00 UTC
  // Future:
  // Noon: [5],
  // 'Every 6 Hours': [5, 11, 17, 23],
};

export function shouldRunRule(rule: ParsedRule, currentUtcHour: number): boolean {
  const allowedHours = SCHEDULE_MAP[rule.checkAt] || SCHEDULE_MAP['Midnight'];
  return allowedHours.includes(currentUtcHour);
}

// =============================================================================
// PURE EVALUATION HELPERS
// =============================================================================

/**
 * Check if a campaign's ROAS meets the condition for ALL days in the range.
 * Returns false if any day is missing data or fails the threshold.
 */
export function evaluateRoasCondition(
  condition: RuleCondition,
  dailyRoas: Map<string, number>,
  dateRange: string[],
): boolean {
  if (dateRange.length < condition.days) return false;

  for (const date of dateRange) {
    const roas = dailyRoas.get(date);
    if (roas === undefined) return false;
    if (condition.operator === 'over' && roas <= condition.value) return false;
    if (condition.operator === 'under' && roas >= condition.value) return false;
  }
  return true;
}

/**
 * Calculate new budget in cents based on the action.
 * Returns the new budget value, or null if not applicable.
 */
export function calculateNewBudget(
  currentBudgetCents: number,
  action: RuleAction,
): number | null {
  switch (action.type) {
    case 'increase_budget':
      return Math.round(currentBudgetCents * (action.value || 2));
    case 'reduce_budget': {
      const factor = 1 - ((action.value || 50) / 100);
      return Math.max(100, Math.round(currentBudgetCents * factor)); // min $1
    }
    default:
      return null;
  }
}

/**
 * Generate an array of date strings for the last N days (ending yesterday).
 */
export function getDateRange(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days; i >= 1; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
