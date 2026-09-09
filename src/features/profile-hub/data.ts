/**
 * Data layer for the Profile Hub page.
 *
 * Reads/writes the FULL Airtable "Profiles" record through the existing
 * server-side proxy (src/core/data/airtable-client). Field names live in
 * ./types.ts (PROFILE_GROUPS) — nowhere else.
 */

import { airtableFetch } from '../../core/data/airtable-client';
import type { AirtableRecord, AirtableResponse } from '../../lib/airtable-types';
import { listBMs, listPages } from '../infrastructure/data';
import type { HubProfile } from './types';
import { EDITABLE_FIELDS } from './types';

const TABLE = 'Profiles';

function toHubProfile(record: AirtableRecord): HubProfile {
  return { id: record.id, fields: { ...record.fields } };
}

/**
 * List every profile (paginated).
 */
export async function listHubProfiles(): Promise<HubProfile[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = offset ? `${TABLE}?offset=${offset}` : TABLE;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    all.push(...data.records);
    offset = data.offset;
  } while (offset);

  return all.map(toHubProfile);
}

/**
 * Strip anything that is not an editable field, so read-only values
 * (formulas, buttons, linked rollups) are never sent back to Airtable.
 */
function editableOnly(fields: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set(EDITABLE_FIELDS.map((f) => f.name));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}

export async function updateHubProfile(
  recordId: string,
  fields: Record<string, unknown>,
): Promise<HubProfile> {
  const response = await airtableFetch(`${TABLE}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: editableOnly(fields), typecast: true }),
  });
  return toHubProfile((await response.json()) as AirtableRecord);
}

export async function createHubProfile(
  fields: Record<string, unknown>,
): Promise<HubProfile> {
  const response = await airtableFetch(TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields: editableOnly(fields), typecast: true }),
  });
  return toHubProfile((await response.json()) as AirtableRecord);
}

export async function deleteHubProfile(recordId: string): Promise<void> {
  await airtableFetch(`${TABLE}/${recordId}`, { method: 'DELETE' });
}

// =============================================================================
// LINKED RECORD NAMES
// =============================================================================

/**
 * Airtable returns linked fields as record IDs. Build an id -> name map so the
 * Linked Assets card can show real names. Reuses the existing infrastructure
 * list helpers rather than re-querying those tables here.
 */
export async function fetchLinkedNames(): Promise<Record<string, string>> {
  const [bms, pages] = await Promise.all([listBMs(), listPages()]);

  const names: Record<string, string> = {};
  for (const bm of bms) names[bm.id] = bm.bmName || bm.bmId;
  for (const page of pages) names[page.id] = page.pageName || page.pageId;
  return names;
}

// =============================================================================
// FACEBOOK TOKEN CHECK
// =============================================================================

const FB_GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export interface TokenCheckResult {
  valid: boolean;
  name?: string;
  fbUserId?: string;
  error?: string;
}

/**
 * Ask Facebook whether the stored Permanent Token still works.
 * Same Graph endpoint the campaign flow uses (see features/facebook).
 */
export async function checkProfileToken(token: string): Promise<TokenCheckResult> {
  if (!token) return { valid: false, error: 'No token stored on this profile' };

  try {
    const response = await fetch(
      `${FB_GRAPH_API_BASE}/me?fields=id,name&access_token=${encodeURIComponent(token)}`,
    );
    const data = (await response.json()) as {
      id?: string;
      name?: string;
      error?: { message?: string };
    };

    if (!response.ok || data.error) {
      return { valid: false, error: data.error?.message || `HTTP ${response.status}` };
    }
    return { valid: true, name: data.name, fbUserId: data.id };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
