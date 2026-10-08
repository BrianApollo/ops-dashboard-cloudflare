#!/usr/bin/env node
/**
 * Airtable → D1 mirror (full refresh, re-runnable) — PHYSICAL per-table schema.
 *
 * Each Airtable table becomes a real SQL table (snake_case name, one typed
 * column per field — see functions/lib/db-api/field-map.mjs, the single
 * source of truth for the mapping). Attachment files are copied once to R2
 * and their URLs rewritten to permanent R2 URLs.
 *
 * Usage:
 *   node scripts/mirror-airtable-to-d1.mjs             # generate scripts/d1/mirror-*.sql only
 *   node scripts/mirror-airtable-to-d1.mjs --apply     # generate + apply to REMOTE D1
 *   node scripts/mirror-airtable-to-d1.mjs --apply-local  # generate + apply to LOCAL D1
 *   node scripts/mirror-airtable-to-d1.mjs --apply --tables "Profiles,Business Managers"
 *       # PARTIAL: refresh only the named tables (drop+recreate those tables),
 *       # leave all other tables untouched
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  buildSlimSchema,
  createTableSql,
  sqlTableName,
  encodeRow,
  columnPlan,
} from '../functions/lib/db-api/field-map.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(__dirname, 'd1');

// ─────────────────────────────────────────────────────────────
// ENV
// ─────────────────────────────────────────────────────────────
const envRaw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const env = Object.fromEntries(
  envRaw.split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, CF_STORAGE_WORKER_URL, CF_R2_PUBLIC_URL, D1_DB_NAME } = env;
if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) { console.error('Missing Airtable env'); process.exit(1); }

const AT = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;
const META = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
const HEADERS = { Authorization: `Bearer ${AIRTABLE_API_KEY}` };

// ─────────────────────────────────────────────────────────────
// THROTTLED FETCH (5 req/s)
// ─────────────────────────────────────────────────────────────
let lastReq = 0;
async function atFetch(url) {
  const wait = 210 - (Date.now() - lastReq);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastReq = Date.now();
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Airtable ${res.status} for ${url}: ${await res.text()}`);
  return res.json();
}

async function fetchAll(tableName) {
  const records = [];
  let offset;
  do {
    const url = `${AT}/${encodeURIComponent(tableName)}${offset ? `?offset=${offset}` : ''}`;
    const data = await atFetch(url);
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

// ─────────────────────────────────────────────────────────────
// SQL LITERALS (the mirror emits a SQL file, so values are inlined)
// ─────────────────────────────────────────────────────────────
function lit(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function insertRowSql(slimTable, rec) {
  const { columns, values } = encodeRow(slimTable, rec);
  return `INSERT OR REPLACE INTO "${sqlTableName(slimTable.name)}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${values.map(lit).join(', ')});`;
}

// ─────────────────────────────────────────────────────────────
// ATTACHMENT COPY (Airtable CDN → R2 via the storage worker presign flow)
// ─────────────────────────────────────────────────────────────
async function copyAttachment(att, key) {
  const publicUrl = `${CF_R2_PUBLIC_URL}/${key}`;
  const head = await fetch(publicUrl, { method: 'HEAD' });
  if (head.ok) return { url: publicUrl, copied: false };

  const src = await fetch(att.url);
  if (!src.ok) throw new Error(`download ${src.status} for attachment ${att.id}`);
  const buf = Buffer.from(await src.arrayBuffer());

  const presign = await fetch(`${CF_STORAGE_WORKER_URL}/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, contentType: att.type || 'application/octet-stream', contentLength: buf.length }),
  });
  if (!presign.ok) throw new Error(`presign ${presign.status}: ${await presign.text()}`);
  const { uploadUrl } = await presign.json();

  const put = await fetch(uploadUrl.replace(/ /g, '%20'), {
    method: 'PUT',
    headers: { 'Content-Type': att.type || 'application/octet-stream' },
    body: buf,
  });
  if (!put.ok) throw new Error(`R2 PUT ${put.status} for ${key}`);
  return { url: publicUrl, copied: true };
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
const APPLY_REMOTE = process.argv.includes('--apply');
const APPLY_LOCAL = process.argv.includes('--apply-local');
const tablesArgIdx = process.argv.indexOf('--tables');
const ONLY_TABLES = tablesArgIdx >= 0 ? process.argv[tablesArgIdx + 1].split(',').map((s) => s.trim()) : null;

(async () => {
  console.log('Fetching base schema…');
  const meta = await atFetch(META);
  const slim = buildSlimSchema(meta.tables);

  let tables = slim.tables;
  if (ONLY_TABLES) {
    const unknown = ONLY_TABLES.filter((n) => !tables.some((t) => t.name === n));
    if (unknown.length) { console.error(`Unknown tables: ${unknown.join(', ')}`); process.exit(1); }
    tables = tables.filter((t) => ONLY_TABLES.includes(t.name));
    console.log(`PARTIAL mirror: ${tables.map((t) => t.name).join(', ')}`);
  }

  const metaById = new Map(meta.tables.map((t) => [t.id, t]));
  const statements = [];
  statements.push(`DROP TABLE IF EXISTS records;`); // retire the old JSON mirror store
  const counts = {};
  let attCopied = 0, attSkipped = 0;

  for (const t of tables) {
    const rawTable = metaById.get(t.id);
    const attachmentFields = rawTable.fields.filter((f) => f.type === 'multipleAttachments').map((f) => f.name);

    statements.push(`DROP TABLE IF EXISTS "${sqlTableName(t.name)}";`);
    statements.push(createTableSql(t));

    console.log(`Fetching ${t.name}…`);
    const records = await fetchAll(t.name);
    counts[t.name] = records.length;

    for (const r of records) {
      const fields = { ...r.fields };

      for (const fname of attachmentFields) {
        const v = fields[fname];
        if (!Array.isArray(v)) continue;
        const rewritten = [];
        for (const att of v) {
          const safeName = String(att.filename || 'file').replace(/[^\w.-]+/g, '_');
          const key = `airtable-attachments/${t.id}/${r.id}/${att.id}-${safeName}`;
          let url;
          try {
            const res = await copyAttachment(att, key);
            url = res.url;
            res.copied ? attCopied++ : attSkipped++;
          } catch (e) {
            console.warn(`  ! attachment ${att.id} (${fname} on ${r.id}): ${e.message} — keeping original URL`);
            url = att.url;
          }
          rewritten.push({ id: att.id, url, filename: att.filename, size: att.size, type: att.type });
        }
        fields[fname] = rewritten;
      }

      const lastUpload = typeof fields['Last Upload At'] === 'string' ? fields['Last Upload At'] : r.createdTime;
      statements.push(insertRowSql(t, { id: r.id, fields, createdTime: r.createdTime, updatedAt: lastUpload }));
    }
    console.log(`  ${records.length} records, ${columnPlan(t).length} columns`);
  }

  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  if (!ONLY_TABLES) {
    statements.push(`INSERT OR REPLACE INTO meta (key,value) VALUES ('schema',${q(JSON.stringify(slim))});`);
    statements.push(`INSERT OR REPLACE INTO meta (key,value) VALUES ('last_mirror',${q(new Date().toISOString())});`);
    statements.push(`INSERT OR REPLACE INTO meta (key,value) VALUES ('counts',${q(JSON.stringify(counts))});`);
  }
  // Bump the write-version so warm API instances drop their in-memory cache.
  statements.push(`INSERT INTO mutations_log (ts,table_name,op,record_id,payload) VALUES (${q(new Date().toISOString())},'_mirror','mirror','_mirror',NULL);`);

  // Write chunked SQL files
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const old of fs.readdirSync(OUT_DIR)) if (/^mirror-\d+\.sql$/.test(old)) fs.unlinkSync(path.join(OUT_DIR, old));
  const files = [];
  let chunk = [], size = 0, idx = 0;
  const flush = () => {
    if (!chunk.length) return;
    const file = path.join(OUT_DIR, `mirror-${String(idx).padStart(2, '0')}.sql`);
    fs.writeFileSync(file, chunk.join('\n'), 'utf8');
    files.push(file); idx++; chunk = []; size = 0;
  };
  for (const s of statements) {
    chunk.push(s); size += s.length;
    if (size > 900_000) flush();
  }
  flush();

  console.log(`\nTables: ${tables.length}; total records: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
  console.log(`Attachments copied: ${attCopied}, already present: ${attSkipped}`);
  console.log(`SQL chunks: ${files.length}`);

  for (const flag of [APPLY_REMOTE && '--remote', APPLY_LOCAL && '--local'].filter(Boolean)) {
    for (const file of files) {
      console.log(`wrangler d1 execute ${flag} ${path.basename(file)}…`);
      execSync(`npx wrangler d1 execute ${D1_DB_NAME} ${flag} -y --file "${file}"`, { cwd: ROOT, stdio: 'pipe' });
    }
  }
  console.log('Done.');
})().catch((e) => { console.error(e); process.exit(1); });
