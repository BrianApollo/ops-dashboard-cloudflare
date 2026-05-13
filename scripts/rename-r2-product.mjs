/**
 * One-off rename: "Miraculous Medal" → "MiraculousMedal"
 *
 * Scope: ONLY the product with Airtable record ID reclLl7QIZZ3RuMi4.
 * Touches:
 *   - Cloudflare R2 (copy + delete object via storage worker)
 *   - Airtable Images / Videos tables (update URL field + name field)
 *
 * Default mode is DRY RUN — pass `--apply` to actually mutate.
 *
 * Usage:
 *   node scripts/rename-r2-product.mjs           # dry run
 *   node scripts/rename-r2-product.mjs --apply   # actually rename
 *
 * Reads creds from .dev.vars (Airtable) and .env (storage worker URL).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// =============================================================================
// CONFIG
// =============================================================================

const PRODUCT_RECORD_ID = 'reclLl7QIZZ3RuMi4';
const PRODUCT_NAME = 'MiraculousMedal';
const OLD_TOKEN = 'Miraculous Medal';
const NEW_TOKEN = 'MiraculousMedal';

const APPLY = process.argv.includes('--apply');

// =============================================================================
// ENV LOADING (.dev.vars + .env)
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const raw of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

const devVars = loadEnvFile(path.join(projectRoot, '.dev.vars'));
const env = loadEnvFile(path.join(projectRoot, '.env'));

const AIRTABLE_API_KEY = devVars.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = devVars.AIRTABLE_BASE_ID;
const STORAGE_WORKER_URL = env.VITE_CF_STORAGE_WORKER_URL;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in .dev.vars');
  process.exit(1);
}
if (!STORAGE_WORKER_URL) {
  console.error('Missing VITE_CF_STORAGE_WORKER_URL in .env');
  process.exit(1);
}

// =============================================================================
// AIRTABLE
// =============================================================================

async function airtable(pathPart, init = {}) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${pathPart}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${init.method ?? 'GET'} ${pathPart} → ${res.status}: ${body}`);
  }
  return res.json();
}

async function listAllRecords(table, productField) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    // Filter by linked product record id via FIND on the joined IDs.
    // Airtable can't filter linked records by id in a formula directly, so
    // we filter by name and verify id in JS.
    params.set('filterByFormula', `{${productField}} = '${PRODUCT_NAME}'`);
    if (offset) params.set('offset', offset);
    const data = await airtable(`${encodeURIComponent(table)}?${params.toString()}`);
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  // Verify by record id
  return records.filter((r) => {
    const linked = r.fields[productField];
    return Array.isArray(linked) && linked.includes(PRODUCT_RECORD_ID);
  });
}

async function patchRecord(table, recordId, fields) {
  return airtable(`${encodeURIComponent(table)}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

// =============================================================================
// STORAGE WORKER
// =============================================================================

async function presign(key, contentType, contentLength) {
  const res = await fetch(`${STORAGE_WORKER_URL}/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, contentType, contentLength }),
  });
  if (!res.ok) {
    throw new Error(`presign ${key} → ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function deleteKey(key) {
  const res = await fetch(`${STORAGE_WORKER_URL}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (res.status === 404) return; // already gone
  if (!res.ok) {
    throw new Error(`delete ${key} → ${res.status}: ${await res.text()}`);
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function extractKey(url) {
  const u = new URL(url);
  return decodeURIComponent(u.pathname).replace(/^\/+/, '');
}

function buildNewUrl(oldUrl) {
  // Replace the token everywhere it appears in the URL string.
  // Handle both raw " " and "%20" representations.
  return oldUrl
    .split(OLD_TOKEN).join(NEW_TOKEN)
    .split(encodeURIComponent(OLD_TOKEN)).join(encodeURIComponent(NEW_TOKEN));
}

function applyTokenSwap(s) {
  return s.split(OLD_TOKEN).join(NEW_TOKEN);
}

async function fetchAsBlob(url) {
  // Use encodeURI to handle any raw spaces in the URL safely for fetch.
  const safeUrl = new URL(url);
  safeUrl.pathname = encodeURI(decodeURIComponent(safeUrl.pathname));
  const res = await fetch(safeUrl.toString());
  if (!res.ok) {
    throw new Error(`fetch ${url} → ${res.status}`);
  }
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  const buffer = await res.arrayBuffer();
  return { buffer, contentType, contentLength: buffer.byteLength };
}

// =============================================================================
// PROCESS ONE RECORD
// =============================================================================

async function processRecord({ table, record, urlField, nameField }) {
  const id = record.id;
  const oldUrl = record.fields[urlField];
  const oldName = record.fields[nameField] ?? '';

  if (!oldUrl) {
    console.log(`  - ${id} skip: no ${urlField}`);
    return 'skip';
  }

  const oldHasToken = oldUrl.includes(OLD_TOKEN) || oldUrl.includes(encodeURIComponent(OLD_TOKEN));
  const nameHasToken = typeof oldName === 'string' && oldName.includes(OLD_TOKEN);

  if (!oldHasToken && !nameHasToken) {
    console.log(`  - ${id} skip: already migrated (no "${OLD_TOKEN}" in URL or name)`);
    return 'skip';
  }

  const oldKey = extractKey(oldUrl);
  const newKey = applyTokenSwap(oldKey);
  const newUrl = buildNewUrl(oldUrl);
  const newName = applyTokenSwap(oldName);

  console.log(`  + ${id}`);
  console.log(`      old: ${oldKey}`);
  console.log(`      new: ${newKey}`);
  if (newName !== oldName) {
    console.log(`      name: "${oldName}" → "${newName}"`);
  }

  if (!APPLY) {
    return 'would-rename';
  }

  // 1. Fetch the file
  const { buffer, contentType, contentLength } = await fetchAsBlob(oldUrl);

  // 2. Get presigned upload URL for new key
  const presignData = await presign(newKey, contentType, contentLength);

  // 3. PUT the file to the presigned URL
  const putRes = await fetch(presignData.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: buffer,
  });
  if (!putRes.ok) {
    throw new Error(`PUT to R2 failed: ${putRes.status}`);
  }

  // 4. Update Airtable record (URL + name)
  const updateFields = { [urlField]: newUrl };
  if (newName !== oldName) updateFields[nameField] = newName;
  await patchRecord(table, id, updateFields);

  // 5. Delete old key (only after Airtable update succeeded)
  await deleteKey(oldKey);

  console.log(`      ✓ done`);
  return 'renamed';
}

// =============================================================================
// MAIN
// =============================================================================

async function processTable({ table, productField, urlField, nameField }) {
  console.log(`\n${table}:`);
  const records = await listAllRecords(table, productField);
  console.log(`  found ${records.length} record(s) for product ${PRODUCT_NAME} (${PRODUCT_RECORD_ID})`);

  const counts = { renamed: 0, 'would-rename': 0, skip: 0, failed: 0 };
  for (const rec of records) {
    try {
      const status = await processRecord({ table, record: rec, urlField, nameField });
      counts[status] = (counts[status] ?? 0) + 1;
    } catch (err) {
      console.error(`  ! ${rec.id} failed: ${err.message}`);
      counts.failed++;
    }
  }
  console.log(`  summary: ${JSON.stringify(counts)}`);
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (will mutate R2 + Airtable)' : 'DRY RUN'}`);
  console.log(`Product: "${OLD_TOKEN}" → "${NEW_TOKEN}"`);
  console.log(`Record id: ${PRODUCT_RECORD_ID}`);
  console.log(`Worker: ${STORAGE_WORKER_URL}`);
  console.log(`Base: ${AIRTABLE_BASE_ID}`);

  await processTable({
    table: 'Images',
    productField: 'Product',
    urlField: 'Image Drive Link',
    nameField: 'Image Name',
  });

  await processTable({
    table: 'Videos',
    productField: 'Product',
    urlField: 'Creative Link',
    nameField: 'Video Name',
  });

  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} complete.`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
