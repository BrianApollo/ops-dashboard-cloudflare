/**
 * ops-db-sync — keeps the D1 physical tables in step with production Airtable.
 *
 * Every 5 minutes (cron): fetches every Airtable table, diffs against the
 * matching D1 table (profiles, videos, …), and applies only the differences:
 * upserts changed rows, deletes removed rows, copies NEW attachments to R2,
 * applies schema drift (new Airtable fields → ALTER TABLE ADD COLUMN, new
 * tables → CREATE TABLE), and bumps the data-API cache version — only when
 * something actually changed.
 *
 * One-way: Airtable is the source of truth until cutover. Clone-side edits
 * are overwritten by design during the parallel-run phase.
 *
 * HTTP:
 *   POST /sync   (Authorization: Bearer <SYNC_TOKEN>) — run a sync now
 *   GET  /       — status: last sync stats
 */

// @ts-expect-error — shared plain-JS module (single source of the field↔column mapping)
import { buildSlimSchema, sqlTableName, encodeRow, upsertSql, decodeRow, createTableSql, createIndexSqls, columnPlan } from '../../../functions/lib/db-api/field-map.mjs';

export interface Env {
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  STORAGE_WORKER_URL: string;
  R2_PUBLIC_URL: string;
  SYNC_TOKEN: string;
  DB: D1Database;
}

/** Rows that exist only in D1 on purpose — never delete these. */
const PRESERVE_IDS = new Set(['recSHIMTESTADMIN0']); // seeded clone test login

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
let lastReq = 0;
async function atFetch(env: Env, url: string): Promise<any> {
  const wait = 210 - (Date.now() - lastReq);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastReq = Date.now();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` } });
  if (!res.ok) throw new Error(`Airtable ${res.status} for ${url}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

interface AtRecord { id: string; createdTime: string; fields: Record<string, unknown> }

async function fetchAll(env: Env, tableName: string): Promise<AtRecord[]> {
  const base = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
  const records: AtRecord[] = [];
  let offset: string | undefined;
  do {
    const data = await atFetch(env, `${base}${offset ? `?offset=${offset}` : ''}`);
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

interface AtAttachment { id: string; url: string; filename?: string; size?: number; type?: string }

async function copyAttachment(env: Env, tableId: string, recId: string, att: AtAttachment): Promise<{ url: string; copied: boolean }> {
  const safeName = String(att.filename || 'file').replace(/[^\w.-]+/g, '_');
  const key = `airtable-attachments/${tableId}/${recId}/${att.id}-${safeName}`;
  const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
  const head = await fetch(publicUrl, { method: 'HEAD' });
  if (head.ok) return { url: publicUrl, copied: false };

  const src = await fetch(att.url);
  if (!src.ok) throw new Error(`attachment download ${src.status}`);
  const buf = await src.arrayBuffer();

  const presign = await fetch(`${env.STORAGE_WORKER_URL}/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, contentType: att.type || 'application/octet-stream', contentLength: buf.byteLength }),
  });
  if (!presign.ok) throw new Error(`presign ${presign.status}`);
  const { uploadUrl } = (await presign.json()) as { uploadUrl: string };
  const put = await fetch(uploadUrl.replace(/ /g, '%20'), {
    method: 'PUT',
    headers: { 'Content-Type': att.type || 'application/octet-stream' },
    body: buf,
  });
  if (!put.ok) throw new Error(`R2 PUT ${put.status}`);
  return { url: publicUrl, copied: true };
}

// ─────────────────────────────────────────────────────────────
// SCHEMA DRIFT
// ─────────────────────────────────────────────────────────────
async function applySchemaDrift(env: Env, slim: any): Promise<boolean> {
  const storedRow = await env.DB.prepare(`SELECT value FROM meta WHERE key = 'schema'`).first();
  const storedJson = storedRow ? (storedRow.value as string) : null;
  const newJson = JSON.stringify(slim);
  if (storedJson === newJson) return false;

  const stored = storedJson ? JSON.parse(storedJson) : { tables: [] };
  const storedByName = new Map((stored.tables as any[]).map((t) => [t.name, t]));

  for (const t of slim.tables) {
    const prev = storedByName.get(t.name);
    if (!prev) {
      console.log(`[schema] new table ${t.name}`);
      await env.DB.prepare(createTableSql(t)).run();
      for (const idx of createIndexSqls(t)) await env.DB.prepare(idx).run();
      continue;
    }
    const prevCols = new Set(columnPlan(prev).map((c: any) => c.column));
    for (const c of columnPlan(t)) {
      if (!prevCols.has(c.column)) {
        const sqlType = c.kind === 'number' ? 'REAL' : c.kind === 'checkbox' ? 'INTEGER' : 'TEXT';
        console.log(`[schema] ${t.name}: new column ${c.column}`);
        await env.DB.prepare(`ALTER TABLE "${sqlTableName(t.name)}" ADD COLUMN "${c.column}" ${sqlType}`).run();
      }
    }
  }
  await env.DB.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('schema', ?)`).bind(newJson).run();
  return true;
}

// ─────────────────────────────────────────────────────────────
// SYNC
// ─────────────────────────────────────────────────────────────
export interface SyncStats {
  startedAt: string;
  ms: number;
  tables: number;
  upserts: number;
  deletes: number;
  attachmentsCopied: number;
  schemaChanged: boolean;
  changed: boolean;
}

async function syncOnce(env: Env): Promise<SyncStats> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const stats: SyncStats = { startedAt, ms: 0, tables: 0, upserts: 0, deletes: 0, attachmentsCopied: 0, schemaChanged: false, changed: false };

  const meta = await atFetch(env, `https://api.airtable.com/v0/meta/bases/${env.AIRTABLE_BASE_ID}/tables`);
  const slim = buildSlimSchema(meta.tables);
  stats.schemaChanged = await applySchemaDrift(env, slim);

  const statements: D1PreparedStatement[] = [];

  for (const t of slim.tables) {
    stats.tables++;
    const attachmentFieldNames = t.fields.filter((f: any) => f.type === 'multipleAttachments').map((f: any) => f.name);
    const atRecords = await fetchAll(env, t.name);

    const existingRes = await env.DB.prepare(`SELECT * FROM "${sqlTableName(t.name)}"`).all();
    const existing = new Map(existingRes.results.map((row) => {
      const dec = decodeRow(t, row) as { id: string; fields: Record<string, unknown>; createdTime: string };
      return [dec.id, dec];
    }));

    const seen = new Set<string>();
    for (const r of atRecords) {
      seen.add(r.id);
      const fields = { ...r.fields };

      for (const fname of attachmentFieldNames) {
        const v = fields[fname];
        if (!Array.isArray(v)) continue;
        const rewritten: AtAttachment[] = [];
        for (const att of v as AtAttachment[]) {
          let url = att.url;
          if (!url.startsWith(env.R2_PUBLIC_URL)) {
            try {
              const res = await copyAttachment(env, t.id, r.id, att);
              if (res.copied) stats.attachmentsCopied++;
              url = res.url;
            } catch (e) {
              console.warn(`attachment ${att.id}: ${(e as Error).message} — keeping original URL`);
            }
          }
          rewritten.push({ id: att.id, url, filename: att.filename, size: att.size, type: att.type });
        }
        fields[fname] = rewritten;
      }

      const lastUpload = typeof fields['Last Upload At'] === 'string' ? (fields['Last Upload At'] as string) : r.createdTime;
      const rec = { id: r.id, fields, createdTime: r.createdTime, updatedAt: lastUpload };

      // Normalize through the column mapping so the comparison matches what
      // a stored row decodes to (checkbox false drops, numbers coerce, …).
      const { columns, values } = encodeRow(t, rec);
      const rowObj: Record<string, unknown> = {};
      columns.forEach((c: string, i: number) => { rowObj[c] = values[i]; });
      const normalized = decodeRow(t, rowObj) as { fields: Record<string, unknown> };

      const prev = existing.get(r.id);
      if (prev && prev.createdTime === r.createdTime && stableStringify(prev.fields) === stableStringify(normalized.fields)) continue;

      statements.push(env.DB.prepare(upsertSql(t)).bind(...values));
      stats.upserts++;
    }

    for (const id of existing.keys()) {
      if (!seen.has(id) && !PRESERVE_IDS.has(id)) {
        statements.push(env.DB.prepare(`DELETE FROM "${sqlTableName(t.name)}" WHERE id = ?`).bind(id));
        stats.deletes++;
      }
    }
  }

  if (statements.length > 0 || stats.schemaChanged) {
    stats.changed = true;
    statements.push(
      env.DB.prepare(`INSERT INTO mutations_log (ts, table_name, op, record_id, payload) VALUES (?, '_sync', 'sync', '_sync', ?)`)
        .bind(startedAt, JSON.stringify({ upserts: stats.upserts, deletes: stats.deletes, schemaChanged: stats.schemaChanged }))
    );
    statements.push(env.DB.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('last_mirror', ?)`).bind(startedAt));
    for (let i = 0; i < statements.length; i += 50) {
      await env.DB.batch(statements.slice(i, i + 50));
    }
  }

  stats.ms = Date.now() - t0;
  await env.DB.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('last_sync_stats', ?)`)
    .bind(JSON.stringify(stats)).run();
  return stats;
}

// ─────────────────────────────────────────────────────────────
// WORKER
// ─────────────────────────────────────────────────────────────
export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      syncOnce(env)
        .then((s) => console.log(`[sync] ${s.upserts} upserts, ${s.deletes} deletes, ${s.attachmentsCopied} attachments, schema=${s.schemaChanged}, ${s.ms}ms`))
        .catch((err) => console.error('[sync] error:', err))
    );
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/sync' && request.method === 'POST') {
      if (request.headers.get('Authorization') !== `Bearer ${env.SYNC_TOKEN}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      try {
        const stats = await syncOnce(env);
        return new Response(JSON.stringify(stats), { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const last = await env.DB.prepare(`SELECT value FROM meta WHERE key = 'last_sync_stats'`).first();
    return new Response(JSON.stringify({ name: 'ops-db-sync', lastSync: last ? JSON.parse(last.value as string) : null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
