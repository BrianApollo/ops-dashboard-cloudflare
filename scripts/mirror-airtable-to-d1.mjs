#!/usr/bin/env node
/**
 * Airtable → D1 mirror (full refresh, re-runnable).
 *
 * Fetches every table of the base exactly as the REST API serves it and stores
 * each record as JSON in the D1 `records` table (see scripts/d1/schema.sql).
 * Attachment fields are copied once to R2 (airtable-attachments/ prefix) and
 * their URLs rewritten to permanent R2 URLs, because Airtable CDN URLs expire.
 *
 * Usage:
 *   node scripts/mirror-airtable-to-d1.mjs             # generate scripts/d1/mirror-*.sql only
 *   node scripts/mirror-airtable-to-d1.mjs --apply     # generate + apply to REMOTE D1
 *   node scripts/mirror-airtable-to-d1.mjs --apply-local  # generate + apply to LOCAL D1 (wrangler dev state)
 *   (flags can be combined)
 *
 * Reads config from .env: AIRTABLE_API_KEY, AIRTABLE_BASE_ID,
 * CF_STORAGE_WORKER_URL, CF_R2_PUBLIC_URL, D1_DB_NAME.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

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
// SQL HELPERS — JSON.stringify output is single-line, so simple quoting works.
// ─────────────────────────────────────────────────────────────
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ─────────────────────────────────────────────────────────────
// ATTACHMENT COPY (Airtable CDN → R2 via the storage worker presign flow)
// ─────────────────────────────────────────────────────────────
async function copyAttachment(att, key) {
  const publicUrl = `${CF_R2_PUBLIC_URL}/${key}`;
  // Skip if already copied on a previous run
  const head = await fetch(publicUrl, { method: 'HEAD' });
  if (head.ok) return publicUrl;

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

  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': att.type || 'application/octet-stream' },
    body: buf,
  });
  if (!put.ok) throw new Error(`R2 PUT ${put.status} for ${key}`);
  return publicUrl;
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
const APPLY_REMOTE = process.argv.includes('--apply');
const APPLY_LOCAL = process.argv.includes('--apply-local');

(async () => {
  // 1. Schema
  console.log('Fetching base schema…');
  const meta = await atFetch(META);
  const tables = meta.tables;
  const fieldById = {};
  const tableById = {};
  for (const t of tables) { tableById[t.id] = t; for (const f of t.fields) fieldById[f.id] = { table: t, field: f }; }

  // Slim schema for the shim: names, types, link topology, primary fields.
  const COMPUTED_TYPES = new Set(['formula', 'rollup', 'count', 'multipleLookupValues', 'lastModifiedTime', 'createdTime', 'button', 'autoNumber']);
  const shimSchema = {
    tables: tables.map((t) => ({
      id: t.id,
      name: t.name,
      primaryField: t.fields.find((f) => f.id === t.primaryFieldId)?.name,
      fields: t.fields.map((f) => {
        const out = { name: f.name, type: f.type };
        if (f.type === 'multipleRecordLinks') {
          out.linkedTable = tableById[f.options?.linkedTableId]?.name;
          const inv = f.options?.inverseLinkFieldId ? fieldById[f.options.inverseLinkFieldId] : null;
          if (inv) out.inverseField = inv.field.name;
        }
        if (COMPUTED_TYPES.has(f.type)) out.computed = true;
        if (f.type === 'multipleLookupValues' || f.type === 'count' || f.type === 'rollup') {
          const rl = f.options?.recordLinkFieldId ? fieldById[f.options.recordLinkFieldId]?.field.name : undefined;
          const ff = f.options?.fieldIdInLinkedTable ? fieldById[f.options.fieldIdInLinkedTable]?.field.name : undefined;
          if (rl) out.viaLinkField = rl;
          if (ff) out.lookupField = ff;
        }
        return out;
      }),
    })),
  };

  // 2. Records (+ attachment rewriting)
  const statements = [];
  statements.push('DELETE FROM records;');
  const counts = {};
  let attCopied = 0, attSkipped = 0;

  for (const t of tables) {
    const attachmentFields = t.fields.filter((f) => f.type === 'multipleAttachments').map((f) => f.name);
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
          const already = (await fetch(`${CF_R2_PUBLIC_URL}/${key}`, { method: 'HEAD' })).ok;
          let url;
          try {
            url = await copyAttachment(att, key);
            already ? attSkipped++ : attCopied++;
          } catch (e) {
            console.warn(`  ! attachment ${att.id} (${fname} on ${r.id}): ${e.message} — keeping original URL`);
            url = att.url;
          }
          rewritten.push({ id: att.id, url, filename: att.filename, size: att.size, type: att.type });
        }
        fields[fname] = rewritten;
      }

      const lastUpload = typeof fields['Last Upload At'] === 'string' ? fields['Last Upload At'] : r.createdTime;
      statements.push(
        `INSERT OR REPLACE INTO records (table_name,id,fields,created_time,updated_at) VALUES (${q(t.name)},${q(r.id)},${q(JSON.stringify(fields))},${q(r.createdTime)},${q(lastUpload)});`
      );
    }
    console.log(`  ${records.length} records`);
  }

  statements.push(`INSERT OR REPLACE INTO meta (key,value) VALUES ('schema',${q(JSON.stringify(shimSchema))});`);
  statements.push(`INSERT OR REPLACE INTO meta (key,value) VALUES ('last_mirror',${q(new Date().toISOString())});`);
  statements.push(`INSERT OR REPLACE INTO meta (key,value) VALUES ('counts',${q(JSON.stringify(counts))});`);

  // 3. Write chunked SQL files (~900KB per chunk to stay well under statement/upload limits)
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
  console.table(counts);

  // 4. Apply
  for (const flag of [APPLY_REMOTE && '--remote', APPLY_LOCAL && '--local'].filter(Boolean)) {
    for (const file of files) {
      console.log(`wrangler d1 execute ${flag} ${path.basename(file)}…`);
      execSync(`npx wrangler d1 execute ${D1_DB_NAME} ${flag} -y --file "${file}"`, { cwd: ROOT, stdio: 'inherit' });
    }
  }
  console.log('Done.');
})().catch((e) => { console.error(e); process.exit(1); });
