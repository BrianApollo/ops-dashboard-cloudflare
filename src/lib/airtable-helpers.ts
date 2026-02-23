/**
 * Shared Airtable fetch helpers.
 * Replaces the copy-pasted do-while(offset) pagination pattern.
 */

import { airtableFetch } from '../core/data/airtable-client';
import type { AirtableRecord, AirtableResponse } from './airtable-types';

/**
 * Fetch ALL records from an Airtable table, handling pagination automatically.
 * @param tableOrUrl - Table name (e.g. 'Products') or full path with params
 */
export async function fetchAllAirtableRecords(tableOrUrl: string): Promise<AirtableRecord[]> {
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = offset
      ? `${tableOrUrl}${tableOrUrl.includes('?') ? '&' : '?'}offset=${offset}`
      : tableOrUrl;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);
  return allRecords;
}
