/**
 * Shared Airtable types.
 * Single source of truth — imported by all feature data.ts files.
 */

export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

export interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}
