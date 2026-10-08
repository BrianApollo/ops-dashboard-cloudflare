/**
 * Shared data-fetch helpers for the Cloudflare D1 API.
 *
 * /api/db returns every matching row in ONE response — no pagination loops.
 * This replaces the per-file do-while(offset) pattern from the Airtable era.
 */

import { dbFetch } from '../core/data/db-client';
import type { DbRecord, DbResponse } from './db-types';

/**
 * Fetch all records from a table in a single request.
 * @param tableOrUrl - Table name (e.g. 'Products') or path with query params
 *                     (e.g. "Videos?where[Product]=HydroBlast&fields[]=Status")
 */
export async function fetchAllRecords(tableOrUrl: string, init?: RequestInit): Promise<DbRecord[]> {
  const response = await dbFetch(tableOrUrl, init);
  const data: DbResponse = await response.json();
  return data.records;
}
