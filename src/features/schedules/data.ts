/**
 * Schedule data layer.
 * Reads/writes to the "Schedule" Airtable table.
 */

import { dbFetch } from '../../core/data/db-client';
import { fetchAllRecords } from '../../lib/db-helpers';
import type { ScheduleRecord, ScheduledAction } from './types';
import { recordToScheduledAction } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const TABLE = 'Schedule';

// =============================================================================
// FETCH
// =============================================================================

/** Fetch all pending actions (Tonight tab) */
export async function fetchPendingActions(): Promise<ScheduledAction[]> {
  const url = `${TABLE}?where%5BStatus%5D=Pending&sort%5B0%5D%5Bfield%5D=Scheduled%20At&sort%5B0%5D%5Bdirection%5D=asc`;
  const allRecords = (await fetchAllRecords(url)) as unknown as ScheduleRecord[];
  return allRecords.map(recordToScheduledAction);
}

/** Fetch execution log (completed/failed actions) */
export async function fetchActionLog(): Promise<ScheduledAction[]> {
  const url = `${TABLE}?whereAny%5BStatus%5D=Success,Failed&sort%5B0%5D%5Bfield%5D=Executed%20At&sort%5B0%5D%5Bdirection%5D=desc`;
  const allRecords = (await fetchAllRecords(url)) as unknown as ScheduleRecord[];
  return allRecords.map(recordToScheduledAction);
}

// =============================================================================
// LOOKUP
// =============================================================================

/** Find a Campaign record ID by its Facebook Campaign ID */
export async function findCampaignRecordIdByFbId(fbCampaignId: string): Promise<string | undefined> {
  const where = `where%5BFB%20Campaign%20ID%5D=${encodeURIComponent(fbCampaignId)}`;
  const response = await dbFetch(`Campaigns?${where}&fields%5B%5D=Name&maxRecords=1`);
  const data = (await response.json()) as { records: { id: string }[] };
  return data.records?.[0]?.id;
}

// =============================================================================
// CREATE
// =============================================================================

/** Create a new scheduled action, auto-linking Campaign if found */
export async function createScheduledAction(
  fields: Record<string, unknown>,
): Promise<ScheduledAction> {
  // Try to link to an existing Campaign record by FB Campaign ID
  const fbCampaignId = fields['Campaign Id'] as string | undefined;
  if (fbCampaignId && !fields['Linked Campaign']) {
    try {
      console.log('[schedules] Looking up campaign for FB ID:', fbCampaignId);
      const recordId = await findCampaignRecordIdByFbId(fbCampaignId);
      console.log('[schedules] Lookup result:', recordId);
      if (recordId) {
        fields['Linked Campaign'] = [recordId];
      }
    } catch (err) {
      console.error('[schedules] Campaign lookup failed:', err);
    }
  }

  const response = await dbFetch(TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  const data = (await response.json()) as ScheduleRecord;
  return recordToScheduledAction(data);
}

// =============================================================================
// UPDATE / CANCEL
// =============================================================================

/** Cancel a pending action (delete the record) */
export async function cancelScheduledAction(recordId: string): Promise<void> {
  await dbFetch(`${TABLE}/${recordId}`, {
    method: 'DELETE',
  });
}
