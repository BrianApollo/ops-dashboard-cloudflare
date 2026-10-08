/**
 * Shared record types for the Cloudflare D1 data API.
 * The record shape is unchanged from the Airtable era by design — every
 * feature mapper keeps working: { id, fields, createdTime }.
 */

export interface DbRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

export interface DbResponse {
  records: DbRecord[];
  /** Only present on the legacy /api/airtable route; /api/db never pages. */
  offset?: string;
}
