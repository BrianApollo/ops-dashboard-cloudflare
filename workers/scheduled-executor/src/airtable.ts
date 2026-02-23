/**
 * Direct Airtable REST client for the cron worker.
 * Does not go through the Pages proxy — uses secrets directly.
 */

import type { Env, ScheduleRecord, ProfileRecord, MasterProfileRecord } from './types';

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

  const linkedProfileIds = masterData.records[0].fields['Profile Record'];
  if (!linkedProfileIds?.length) {
    throw new Error('Master profile has no linked profile');
  }

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
 */
export async function fetchPendingActions(env: Env): Promise<ScheduleRecord[]> {
  const today = new Date().toISOString().split('T')[0];
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
