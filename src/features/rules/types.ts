// =============================================================================
// SCALING RULES TYPES
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
  value?: number; // multiplier, percentage, or dollar amount
}

/** Raw Airtable record shape */
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

/** Parsed rule used in the UI */
export interface ScalingRule {
  id: string;
  name: string;
  scope: RuleScope;
  appliesTo: string[];
  select: RuleSelect;
  checkAt: CheckAt;
  conditionRaw: string;
  actionRaw: string;
  condition: RuleCondition | null;
  action: RuleAction | null;
  executeAt: CheckAt;
}

/** Form state for creating/editing rules */
export interface RuleFormState {
  name: string;
  scope: RuleScope;
  appliesTo: string;
  select: RuleSelect;
  checkAt: CheckAt;
  conditionMetric: 'roas';
  conditionOperator: ConditionOperator;
  conditionValue: string;
  conditionDays: string;
  actionType: ActionType;
  actionValue: string;
  executeAt: CheckAt;
}

// =============================================================================
// PARSE / SERIALIZE HELPERS
// =============================================================================

/**
 * Parse the "If" text field into structured condition.
 * Examples: "Roas is over 1.2 for 3 days", "Roas is under 1 for 2 days"
 */
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

/**
 * Parse the "Then" text field into structured action.
 * Examples: "Increase Budget by 2x", "Reduce by 50%", "Turn Off"
 */
export function parseAction(raw: string | undefined): RuleAction | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (lower === 'turn off') {
    return { type: 'turn_off' };
  }
  const increaseMatch = raw.match(/increase\s+budget\s+by\s+([\d.]+)x/i);
  if (increaseMatch) {
    return { type: 'increase_budget', value: parseFloat(increaseMatch[1]) };
  }
  const reduceMatch = raw.match(/reduce\s+by\s+([\d.]+)%/i);
  if (reduceMatch) {
    return { type: 'reduce_budget', value: parseFloat(reduceMatch[1]) };
  }
  return null;
}

/** Serialize condition back to Airtable "If" text */
export function serializeCondition(condition: RuleCondition | null): string {
  if (!condition) return '';
  return `Roas is ${condition.operator} ${condition.value} for ${condition.days} days`;
}

/** Serialize action back to Airtable "Then" text */
export function serializeAction(action: RuleAction | null): string {
  if (!action) return '';
  switch (action.type) {
    case 'turn_off':
      return 'Turn Off';
    case 'increase_budget':
      return `Increase Budget by ${action.value}x`;
    case 'reduce_budget':
      return `Reduce by ${action.value}%`;
    case 'set_max_budget':
      return action.value ? `$${action.value}` : '';
    default:
      return '';
  }
}

/** Convert Airtable record to parsed UI rule */
export function recordToRule(record: ScalingRuleRecord): ScalingRule {
  const f = record.fields;
  return {
    id: record.id,
    name: f.Name || '',
    scope: f['Rule Scope'] || 'Global',
    appliesTo: f['Applies to [Campaigns]'] || [],
    select: f.Select || 'Budget Change',
    checkAt: f['Check At'] || 'Midnight',
    conditionRaw: f.If || '',
    actionRaw: f.Then || '',
    condition: parseCondition(f.If),
    action: parseAction(f.Then),
    executeAt: f['Execute Action At'] || 'Midnight',
  };
}

/** Default form state for a new rule */
export function defaultFormState(scope: RuleScope): RuleFormState {
  return {
    name: '',
    scope,
    appliesTo: '',
    select: 'Budget Change',
    checkAt: 'Midnight',
    conditionMetric: 'roas',
    conditionOperator: 'over',
    conditionValue: '1',
    conditionDays: '3',
    actionType: 'increase_budget',
    actionValue: '2',
    executeAt: 'Midnight',
  };
}

/** Convert a ScalingRule to form state for editing */
export function ruleToFormState(rule: ScalingRule): RuleFormState {
  let actionType: ActionType = 'increase_budget';
  let actionValue = '';

  if (rule.action) {
    actionType = rule.action.type;
    actionValue = rule.action.value?.toString() || '';
  } else if (rule.select === 'Maximum Global Budget') {
    actionType = 'set_max_budget';
  }

  return {
    name: rule.name,
    scope: rule.scope,
    appliesTo: rule.appliesTo.join(', '),
    select: rule.select,
    checkAt: rule.checkAt,
    conditionMetric: 'roas',
    conditionOperator: rule.condition?.operator || 'over',
    conditionValue: rule.condition?.value?.toString() || '1',
    conditionDays: rule.condition?.days?.toString() || '3',
    actionType,
    actionValue,
    executeAt: rule.executeAt,
  };
}

/** Convert form state to Airtable fields for saving */
export function formStateToFields(form: RuleFormState) {
  const condition: RuleCondition | null =
    form.select !== 'Maximum Global Budget'
      ? {
          metric: 'roas',
          operator: form.conditionOperator,
          value: parseFloat(form.conditionValue) || 0,
          days: parseInt(form.conditionDays, 10) || 1,
        }
      : null;

  const action: RuleAction | null = (() => {
    switch (form.actionType) {
      case 'turn_off':
        return { type: 'turn_off' as const };
      case 'increase_budget':
        return { type: 'increase_budget' as const, value: parseFloat(form.actionValue) || 2 };
      case 'reduce_budget':
        return { type: 'reduce_budget' as const, value: parseFloat(form.actionValue) || 50 };
      case 'set_max_budget':
        return { type: 'set_max_budget' as const, value: parseFloat(form.actionValue) || 0 };
      default:
        return null;
    }
  })();

  return {
    Name: form.name,
    'Rule Scope': form.scope,
    Select: form.select,
    'Check At': form.checkAt,
    If: serializeCondition(condition),
    Then: serializeAction(action),
    'Execute Action At': form.executeAt,
  };
}
