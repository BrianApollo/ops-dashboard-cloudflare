/**
 * Direct Airtable REST client for the cron worker.
 * Does not go through the Pages proxy — uses secrets directly.
 */

import type { Env, ScheduleRecord, ProfileRecord, MasterProfileRecord } from './types';
import { scheduleToday } from './types';
import type { ScalingRuleRecord } from './rule-types';

const AIRTABLE_BASE_URL = 'https://api.airtable.com/v0';

// =============================================================================
// GENERIC HELPERS
// =============================================================================

async function airtableRequest(
  env: Env,
  table: string,
  path: string,
  options?: RequestInit,
): Promise<unknown> {
  const url = `${AIRTABLE_BASE_URL}/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable ${response.status}: ${text}`);
  }

  return response.json();
}

// =============================================================================
// MASTER PROFILE TOKEN
// =============================================================================

/**
 * Fetch the master profile's permanent access token.
 * Reads Master Profile table → linked Profile record → Permanent Token.
 */
export async function getMasterProfileToken(env: Env): Promise<string> {
  // 1. Read the Master Profile table (should have one record with linked profile)
  const masterData = (await airtableRequest(env, 'Master Profile', '')) as {
    records: MasterProfileRecord[];
  };

  if (!masterData.records.length) {
    throw new Error('No master profile configured');
  }

  // Airtable seeds new tables with blank rows and returns them in view order, so
  // records[0] is often empty. Take the first row that is actually configured.
  const master = masterData.records.find(
    (record) => record.fields['Profile Record']?.length,
  );
  if (!master) {
    throw new Error(
      `Master profile has no linked profile (checked ${masterData.records.length} record(s))`,
    );
  }

  const linkedProfileIds = master.fields['Profile Record']!;

  // 2. Fetch the actual profile record to get the token
  const profileData = (await airtableRequest(
    env,
    'Profiles',
    `/${linkedProfileIds[0]}`,
  )) as ProfileRecord;

  const token = profileData.fields['Permanent Token'];
  if (!token) {
    throw new Error('Master profile has no permanent token');
  }

  return token;
}

// =============================================================================
// SCHEDULE TABLE
// =============================================================================

/**
 * Fetch all pending scheduled actions where Scheduled At <= today.
 * "Today" is the GMT+7 date, matching how users pick dates in the UI.
 */
export async function fetchPendingActions(env: Env): Promise<ScheduleRecord[]> {
  const today = scheduleToday();
  const formula = encodeURIComponent(
    `AND({Status} = 'Pending', IS_BEFORE({Scheduled At}, DATEADD('${today}', 1, 'days')))`,
  );
  const url = `?filterByFormula=${formula}`;

  const allRecords: ScheduleRecord[] = [];
  let offset: string | undefined;

  do {
    const fetchUrl = offset ? `${url}&offset=${offset}` : url;
    const data = (await airtableRequest(env, 'Schedule', fetchUrl)) as {
      records: ScheduleRecord[];
      offset?: string;
    };
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
}

/**
 * Update a schedule record's fields.
 */
export async function updateScheduleRecord(
  env: Env,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await airtableRequest(env, 'Schedule', `/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

// =============================================================================
// SCALING RULES TABLE
// =============================================================================

/**
 * Fetch all scaling rules from Airtable.
 */
export async function fetchScalingRules(env: Env): Promise<ScalingRuleRecord[]> {
  const allRecords: ScalingRuleRecord[] = [];
  let offset: string | undefined;

  do {
    const fetchUrl = offset ? `?offset=${offset}` : '';
    const data = (await airtableRequest(env, 'Scaling Rules', fetchUrl)) as {
      records: ScalingRuleRecord[];
      offset?: string;
    };
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
}

// =============================================================================
// RULE EXECUTION LOG TABLE
// =============================================================================

/**
 * Create a rule execution log entry in Airtable.
 */
export async function createRuleExecutionLog(
  env: Env,
  fields: Record<string, unknown>,
): Promise<void> {
  await airtableRequest(env, 'Rule Execution Log', '', {
    method: 'POST',
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
}
