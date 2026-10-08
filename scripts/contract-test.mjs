#!/usr/bin/env node
/**
 * Contract test: fires the request patterns the app actually uses at BOTH
 * backends — the D1 shim and Airtable directly — and diffs normalized JSON.
 *
 *   node scripts/contract-test.mjs                   # shim = http://127.0.0.1:8788
 *   node scripts/contract-test.mjs --shim https://ops-dashboard-d1.pages.dev --jwt <token>
 *
 * Read-only against Airtable. Requires a seeded admin JWT for the shim
 * (scripts/seed-test-user.mjs prints one).
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
const argVal = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const SHIM = argVal('--shim', 'http://127.0.0.1:8788');
const AT = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}`;

// Mint an admin JWT (same as seed-test-user) unless one is passed.
function mintJwt() {
  const b64u = (s) => Buffer.from(s).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64u(JSON.stringify({ sub: 'recSHIMTESTADMIN0', email: 'shim-test@accotta.local', role: 'admin', iat: now, exp: now + 3600 }));
  const s = crypto.createHmac('sha256', env.JWT_SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}
const JWT = argVal('--jwt', mintJwt());

let lastAt = 0;
async function fetchJson(url, headers) {
  if (url.startsWith(AT)) { // throttle Airtable to 5 req/s
    const w = 210 - (Date.now() - lastAt);
    if (w > 0) await new Promise((r) => setTimeout(r, w));
    lastAt = Date.now();
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} for ${url}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Fetch ALL pages of a list query from one backend. */
async function fetchAllPages(base, pathAndQuery, headers) {
  const records = [];
  let offset;
  do {
    const sep = pathAndQuery.includes('?') ? '&' : '?';
    const url = `${base}/${pathAndQuery}${offset ? `${sep}offset=${encodeURIComponent(offset)}` : ''}`;
    const data = await fetchJson(url, headers);
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

// ─────────────────────────────────────────────────────────────
// NORMALIZATION
// ─────────────────────────────────────────────────────────────
const SEEDED_IDS = new Set(['recSHIMTESTADMIN0']);

function normalizeValue(v) {
  if (Array.isArray(v)) {
    // Attachment arrays: URLs differ by design (Airtable CDN vs R2) — compare identity, not URL.
    if (v.length && typeof v[0] === 'object' && v[0] !== null && 'url' in v[0]) {
      return v.map((a) => ({ id: a.id, filename: a.filename, size: a.size, type: a.type }));
    }
    return v.map(normalizeValue);
  }
  if (typeof v === 'number') return Math.round(v * 1e6) / 1e6;
  return v;
}

function normalizeRecords(records) {
  return records
    .filter((r) => !SEEDED_IDS.has(r.id))
    .map((r) => {
      const fields = {};
      for (const [k, val] of Object.entries(r.fields)) fields[k] = normalizeValue(val);
      return { id: r.id, createdTime: r.createdTime, fields };
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function diffRecords(name, atRecs, shimRecs) {
  const problems = [];
  const atById = new Map(atRecs.map((r) => [r.id, r]));
  const shimById = new Map(shimRecs.map((r) => [r.id, r]));
  for (const id of atById.keys()) if (!shimById.has(id)) problems.push(`  missing in shim: ${id} (drift? created in Airtable after mirror)`);
  for (const id of shimById.keys()) if (!atById.has(id)) problems.push(`  extra in shim: ${id} (drift? deleted in Airtable after mirror)`);
  for (const [id, at] of atById) {
    const sh = shimById.get(id);
    if (!sh) continue;
    const keys = new Set([...Object.keys(at.fields), ...Object.keys(sh.fields)]);
    for (const k of keys) {
      const a = JSON.stringify(at.fields[k]);
      const s = JSON.stringify(sh.fields[k]);
      if (a !== s) problems.push(`  ${id} field "${k}": airtable=${String(a).slice(0, 120)} shim=${String(s).slice(0, 120)}`);
    }
    if (at.createdTime !== sh.createdTime) problems.push(`  ${id} createdTime: ${at.createdTime} vs ${sh.createdTime}`);
  }
  return problems;
}

// ─────────────────────────────────────────────────────────────
// CHECKS
// ─────────────────────────────────────────────────────────────
const e = encodeURIComponent;

async function main() {
  // Find a real product name to filter by (most-linked one for coverage)
  const products = await fetchJson(`${AT}/Products`, { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` });
  const productName = products.records
    .map((r) => ({ name: r.fields['Product Name'], n: (r.fields['Videos'] || []).length }))
    .sort((a, b) => b.n - a.n)[0].name;
  console.log(`Filter product: ${productName}\n`);

  const checks = [
    ['Products full', 'Products'],
    ['Users editors filter', `Users?filterByFormula=${e(`({Role} = 'Video Editor')`)}`],
    [`Videos by product`, `Videos?filterByFormula=${e(`{Product} = '${productName}'`)}`],
    ['Video Scripts full (counts!)', 'Video Scripts'],
    ['Video Scripts projection', `Video Scripts?fields[]=${e('Scripts Past To Do')}&fields[]=${e('Videos')}`],
    ['Campaigns launched fields', `Campaigns?filterByFormula=${e(`{Status} = 'Launched'`)}&fields[]=${e('FB Campaign ID')}&fields[]=${e('RedTrack Campaign Id')}`],
    ['Campaigns AND-filter', `Campaigns?filterByFormula=${e(`AND({FB Campaign ID} != '', {Product} != '')`)}&fields[]=${e('FB Campaign ID')}&fields[]=${e('Product')}`],
    ['Schedule pending sorted', `Schedule?filterByFormula=${e(`{Status} = 'Pending'`)}&sort[0][field]=${e('Scheduled At')}&sort[0][direction]=asc`],
    ['Campaign Launch Setup full', 'Campaign Launch Setup'],
    ['AI Videos by product', `AI Videos?filterByFormula=${e(`{Product} = '${productName}'`)}`],
    ['Images by product', `Images?filterByFormula=${e(`{Product} = '${productName}'`)}`],
    ['Temp Images full', 'Temp Images'],
    ['Profiles active filter', `Profiles?filterByFormula=${e(`({Profile Status} = 'Active')`)}`],
    ['Profiles by table ID', 'tble3Qky3A2j8LpSj'],
    ['Ad Presets full', 'Ad Presets'],
    ['Advertorials full', 'Advertorials'],
    ['Videos full (pagination)', 'Videos'],
  ];

  let pass = 0, fail = 0;
  for (const [name, q] of checks) {
    try {
      const atPath = q.replace(/^tble3Qky3A2j8LpSj/, e('Profiles')); // Airtable accepts IDs too, but keep both honest
      const [atRecs, shimRecs] = [
        normalizeRecords(await fetchAllPages(AT, q, { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` })),
        normalizeRecords(await fetchAllPages(`${SHIM}/api/airtable`, q, { Authorization: `Bearer ${JWT}` })),
      ];
      const problems = diffRecords(name, atRecs, shimRecs);
      if (problems.length === 0) {
        console.log(`PASS  ${name} (${atRecs.length} records)`);
        pass++;
      } else {
        console.log(`FAIL  ${name} (${atRecs.length} at / ${shimRecs.length} shim) — ${problems.length} diffs`);
        for (const p of problems.slice(0, 12)) console.log(p);
        if (problems.length > 12) console.log(`  … ${problems.length - 12} more`);
        fail++;
      }
    } catch (err) {
      console.log(`ERROR ${name}: ${err.message}`);
      fail++;
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e2) => { console.error(e2); process.exit(1); });
