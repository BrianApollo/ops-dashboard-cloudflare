/**
 * D1 access for the mirror store (`records` table) + per-request table cache.
 */

import type { D1Like, ShimTable } from './schema';

export interface StoredRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
  updatedAt: string;
}

export interface TableData {
  rows: StoredRecord[];
  byId: Map<string, StoredRecord>;
}

/** Per-request context: caches whole tables so lookups/links/formulas reuse loads.
 *  Caches the PROMISE, not the result — concurrent callers must share one load,
 *  or a list request decorating thousands of rows stampedes D1 and OOMs. */
export class RequestStore {
  private cache = new Map<string, Promise<TableData>>();
  constructor(public db: D1Like) {}

  getTable(tableName: string): Promise<TableData> {
    const hit = this.cache.get(tableName);
    if (hit) return hit;
    const promise = (async (): Promise<TableData> => {
      const res = await this.db
        .prepare(`SELECT id, fields, created_time, updated_at FROM records WHERE table_name = ?`)
        .bind(tableName)
        .all();
      const rows: StoredRecord[] = res.results.map((r) => ({
        id: r.id as string,
        fields: JSON.parse(r.fields as string) as Record<string, unknown>,
        createdTime: r.created_time as string,
        updatedAt: r.updated_at as string,
      }));
      return { rows, byId: new Map(rows.map((r) => [r.id, r])) };
    })();
    this.cache.set(tableName, promise);
    promise.catch(() => this.cache.delete(tableName));
    return promise;
  }

  invalidate(tableName: string): void {
    this.cache.delete(tableName);
  }

  private metaCache = new Map<string, Promise<string | null>>();

  getMetaValue(key: string): Promise<string | null> {
    const hit = this.metaCache.get(key);
    if (hit) return hit;
    const promise = this.db
      .prepare(`SELECT value FROM meta WHERE key = ?`)
      .bind(key)
      .first()
      .then((row) => (row ? (row.value as string) : null));
    this.metaCache.set(key, promise);
    return promise;
  }
}

export function newRecId(): string {
  return 'rec' + randomBase62(14);
}

export function newAttId(): string {
  return 'att' + randomBase62(14);
}

function randomBase62(n: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < n; i++) out += alphabet[bytes[i] % 62];
  return out;
}

/** Airtable omits empty values from `fields` — mirror that on every serialize. */
export function serializeFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    if (v === '') continue;
    if (v === false) continue; // unchecked checkboxes are omitted
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Normalize a write payload value for storage: null/''/[] clears the field. */
export function isEmptyValue(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

export interface PreparedWrite {
  sql: string;
  args: unknown[];
}

export function upsertRecordStmt(
  tableName: string,
  rec: StoredRecord
): PreparedWrite {
  return {
    sql: `INSERT OR REPLACE INTO records (table_name, id, fields, created_time, updated_at) VALUES (?, ?, ?, ?, ?)`,
    args: [tableName, rec.id, JSON.stringify(rec.fields), rec.createdTime, rec.updatedAt],
  };
}

export function deleteRecordStmt(tableName: string, id: string): PreparedWrite {
  return { sql: `DELETE FROM records WHERE table_name = ? AND id = ?`, args: [tableName, id] };
}

export function mutationLogStmt(
  tableName: string,
  op: 'create' | 'update' | 'delete',
  recordId: string,
  payload: unknown
): PreparedWrite {
  return {
    sql: `INSERT INTO mutations_log (ts, table_name, op, record_id, payload) VALUES (?, ?, ?, ?, ?)`,
    args: [new Date().toISOString(), tableName, op, recordId, payload === undefined ? null : JSON.stringify(payload)],
  };
}

export async function runBatch(db: D1Like, writes: PreparedWrite[]): Promise<void> {
  if (writes.length === 0) return;
  await db.batch(writes.map((w) => db.prepare(w.sql).bind(...w.args)));
}

export interface AirtableErrorShape {
  error: { type: string; message: string };
}

export function airtableError(status: number, type: string, message: string): Response {
  return new Response(JSON.stringify({ error: { type, message } } satisfies AirtableErrorShape), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
