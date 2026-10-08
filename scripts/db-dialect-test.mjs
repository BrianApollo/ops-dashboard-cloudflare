#!/usr/bin/env node
/**
 * DB-dialect test: verifies /api/db (Cloudflare-optimized: single response,
 * where-params, no pagination) returns the SAME record sets as the legacy
 * /api/airtable route for every converted query pattern, plus dialect
 * behaviors (no offset key, batch limit 200, X-Data-Backend header).
 *
 *   node scripts/db-dialect-test.mjs [--base http://127.0.0.1:8788]
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const argv = process.argv.slice(2);
const BASE = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'http://127.0.0.1:8788';

function mintJwt() {
  const b64u = (s) => Buffer.from(s).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64u(JSON.stringify({ sub: 'recSHIMTESTADMIN0', email: 'shim-test@accotta.local', role: 'admin', iat: now, exp: now + 3600 }));
  const s = crypto.createHmac('sha256', env.JWT_SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}
const H = { Authorization: `Bearer ${mintJwt()}` };

async function getJson(url) {
  const res = await fetch(url, { headers: H });
  if (!res.ok) throw new Error(`${res.status} ${url}: ${(await res.text()).slice(0, 200)}`);
  return { json: await res.json(), headers: res.headers };
}

async function legacyAll(q) {
  const records = [];
  let offset;
  do {
    const sep = q.includes('?') ? '&' : '?';
    const { json } = await getJson(`${BASE}/api/airtable/${q}${offset ? `${sep}offset=${offset}` : ''}`);
    records.push(...json.records);
    offset = json.offset;
  } while (offset);
  return records;
}

const ids = (records) => records.map((r) => r.id).sort().join(',');
const e = encodeURIComponent;

// [name, dbQuery, equivalent legacy query]
const CASES = [
  ['videos single-shot full table', 'Videos', 'Videos'],
  ['videos where product', `Videos?where[Product]=HydroBlast`, `Videos?filterByFormula=${e(`{Product} = 'HydroBlast'`)}`],
  ['users where role', `Users?where[Role]=${e('Video Editor')}`, `Users?filterByFormula=${e(`({Role} = 'Video Editor')`)}`],
  ['profiles where status', `tble3Qky3A2j8LpSj?where[${e('Profile Status')}]=Active`, `tble3Qky3A2j8LpSj?filterByFormula=${e(`({Profile Status} = 'Active')`)}`],
  ['campaigns whereNotEmpty', `Campaigns?whereNotEmpty[${e('FB Campaign ID')}]=1&whereNotEmpty[Product]=1`, `Campaigns?filterByFormula=${e(`AND({FB Campaign ID} != '', {Product} != '')`)}`],
  ['campaigns where status + fields', `Campaigns?where[Status]=Launched&fields[]=${e('FB Campaign ID')}`, `Campaigns?filterByFormula=${e(`{Status} = 'Launched'`)}&fields[]=${e('FB Campaign ID')}`],
  ['schedule whereAny + sort', `Schedule?whereAny[Status]=Success,Failed&sort[0][field]=${e('Executed At')}&sort[0][direction]=desc`, `Schedule?filterByFormula=${e(`OR({Status} = 'Success', {Status} = 'Failed')`)}&sort[0][field]=${e('Executed At')}&sort[0][direction]=desc`],
];

let pass = 0, fail = 0;
for (const [name, dbQ, legacyQ] of CASES) {
  try {
    const { json: dbRes, headers } = await getJson(`${BASE}/api/db/${dbQ}`);
    const legacy = await legacyAll(legacyQ);
    const problems = [];
    if ('offset' in dbRes) problems.push('db response has offset key (should never page)');
    if (headers.get('x-data-backend') !== 'd1') problems.push('missing X-Data-Backend header');
    if (ids(dbRes.records) !== ids(legacy)) problems.push(`record sets differ: db=${dbRes.records.length} legacy=${legacy.length}`);
    if (problems.length) { console.log(`FAIL  ${name}: ${problems.join('; ')}`); fail++; }
    else { console.log(`PASS  ${name} (${dbRes.records.length} records)`); pass++; }
  } catch (err) {
    console.log(`ERROR ${name}: ${err.message}`);
    fail++;
  }
}

// Batch limit: 201 updates must 422, 11 must be accepted (vs legacy limit 10).
try {
  const mk = (n) => ({ records: Array.from({ length: n }, () => ({ id: 'recSHIMTESTADMIN0', fields: {} })) });
  const r201 = await fetch(`${BASE}/api/db/Users`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(mk(201)) });
  const r11 = await fetch(`${BASE}/api/db/Users`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(mk(11)) });
  if (r201.status === 422 && r11.ok) { console.log('PASS  batch limit 200 (201→422, 11→ok)'); pass++; }
  else { console.log(`FAIL  batch limit: 201→${r201.status}, 11→${r11.status}`); fail++; }
} catch (err) { console.log(`ERROR batch limit: ${err.message}`); fail++; }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
