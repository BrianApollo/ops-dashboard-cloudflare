/**
 * Scaling Rules data layer. Reads/writes via the Cloudflare D1 data API.
 */

import { dbFetch } from '../../core/data/db-client';
import type { ScalingRuleRecord, ScalingRule } from './types';
import { recordToRule } from './types';

const TABLE = 'Scaling Rules';

// =============================================================================
// FETCH ALL RULES
// =============================================================================

export async function fetchRules(): Promise<ScalingRule[]> {
  const params = new URLSearchParams();
  params.set('sort[0][field]', 'Name');
  params.set('sort[0][direction]', 'asc');

  const response = await dbFetch(`${TABLE}?${params.toString()}`);
  const data = (await response.json()) as { records: ScalingRuleRecord[] };
  return (data.records || []).map(recordToRule);
}

// =============================================================================
// CREATE RULE
// =============================================================================

export async function createRule(
  fields: Record<string, unknown>,
): Promise<ScalingRule> {
  const response = await dbFetch(TABLE, {
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
  const response = await dbFetch(`${TABLE}/${recordId}`, {
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
  await dbFetch(`${TABLE}/${recordId}`, {
    method: 'DELETE',
  });
}
