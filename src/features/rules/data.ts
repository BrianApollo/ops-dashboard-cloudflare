/**
 * Scaling Rules data layer.
 * Reads from D1 when VITE_DATA_PROVIDER=d1, otherwise Airtable.
 * Writes always go to Airtable (mutations not yet in D1).
 */

import { airtableFetch } from '../../core/data/airtable-client';
import type { ScalingRuleRecord, ScalingRule } from './types';
import { recordToRule, parseCondition, parseAction } from './types';

const TABLE = 'Scaling Rules';
const DATA_PROVIDER = import.meta.env.VITE_DATA_PROVIDER ?? 'airtable';

// =============================================================================
// D1 MAPPER
// =============================================================================

function mapD1ToScalingRule(row: Record<string, unknown>): ScalingRule {
  const conditionRaw = typeof row['ifCondition'] === 'string' ? row['ifCondition'] : '';
  const actionRaw = typeof row['thenAction'] === 'string' ? row['thenAction'] : '';
  return {
    id: String(row['id']),
    name: typeof row['name'] === 'string' ? row['name'] : '',
    scope: (typeof row['ruleScope'] === 'string' ? row['ruleScope'] : 'Global') as ScalingRule['scope'],
    appliesTo: [],
    select: (typeof row['selectType'] === 'string' ? row['selectType'] : 'Budget Change') as ScalingRule['select'],
    checkAt: (typeof row['checkAt'] === 'string' ? row['checkAt'] : 'Midnight') as ScalingRule['checkAt'],
    conditionRaw,
    actionRaw,
    condition: parseCondition(conditionRaw),
    action: parseAction(actionRaw),
    executeAt: (typeof row['executeActionAt'] === 'string' ? row['executeActionAt'] : 'Midnight') as ScalingRule['executeAt'],
  };
}

// =============================================================================
// FETCH ALL RULES
// =============================================================================

export async function fetchRules(): Promise<ScalingRule[]> {
  if (DATA_PROVIDER === 'd1') {
    const res = await fetch('/api/d1/scaling-rules');
    if (!res.ok) throw new Error(`D1 scaling-rules error: ${res.status}`);
    const data: { records: unknown[] } = await res.json();
    return data.records.map((r) => mapD1ToScalingRule(r as Record<string, unknown>));
  }

  const params = new URLSearchParams();
  params.set('sort[0][field]', 'Name');
  params.set('sort[0][direction]', 'asc');

  const response = await airtableFetch(`${TABLE}?${params.toString()}`);
  const data = (await response.json()) as { records: ScalingRuleRecord[] };
  return (data.records || []).map(recordToRule);
}

// =============================================================================
// CREATE RULE
// =============================================================================

export async function createRule(
  fields: Record<string, unknown>,
): Promise<ScalingRule> {
  const response = await airtableFetch(TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  const data = (await response.json()) as ScalingRuleRecord;
  return recordToRule(data);
}

// =============================================================================
// UPDATE RULE
// =============================================================================

export async function updateRule(
  recordId: string,
  fields: Record<string, unknown>,
): Promise<ScalingRule> {
  const response = await airtableFetch(`${TABLE}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
  const data = (await response.json()) as ScalingRuleRecord;
  return recordToRule(data);
}

// =============================================================================
// DELETE RULE
// =============================================================================

export async function deleteRule(recordId: string): Promise<void> {
  await airtableFetch(`${TABLE}/${recordId}`, {
    method: 'DELETE',
  });
}
