#!/usr/bin/env node
/**
 * Write-path test: exercises the /api/db mutation engine end-to-end against a
 * deployment — create (single + batch), link writes with INVERSE-link
 * assertions, derived-count transitions, attachment merge semantics, batch
 * patch, and delete-with-detach. Creates its own records and removes them.
 *
 *   node scripts/write-test.mjs [--base https://ops-dashboard-d1-78t.pages.dev]
 *
 * Note: the db-sync worker deletes clone-only rows at its 5-minute tick, so
 * a run that straddles a tick can flake on a mid-test deletion — rerun.
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
const BASE = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'https://ops-dashboard-d1-78t.pages.dev';

const b64u = (s) => Buffer.from(s).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const H = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const P = b64u(JSON.stringify({ sub: 'recSHIMTESTADMIN0', email: 'shim-test@accotta.local', role: 'admin', iat: now, exp: now + 3600 }));
const JWT = `${H}.${P}.${crypto.createHmac('sha256', env.JWT_SECRET).update(`${H}.${P}`).digest('base64url')}`;

async function api(method, pathPart, body) {
  const res = await fetch(`${BASE}/api/db/${pathPart}`, {
    method,
    headers: { Authorization: `Bearer ${JWT}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathPart} → ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { console.log(`PASS  ${name}`); pass++; }
  else { console.log(`FAIL  ${name} ${detail}`); fail++; }
}

const PRODUCT = 'recPc2e5euNZgdLKo'; // IgniteX
const created = { videos: [], scripts: [], campaigns: [] };

try {
  // 1. Create a script linked to the product
  const script = await api('POST', 'Video%20Scripts', { fields: { Name: 'WRITE-TEST script', Product: [PRODUCT], 'Script Content': 'write-test content\n' } });
  created.scripts.push(script.id);
  check('create script with product link', Array.isArray(script.fields['Product']) && script.fields['Product'][0] === PRODUCT);

  // 2. Batch-create two videos linked to the script
  const vids = await api('POST', 'Videos', {
    records: [1, 2].map((n) => ({
      fields: { 'Video Name': `WRITE-TEST video ${n}`, Status: 'To Do', Format: 'Vertical', Product: [PRODUCT], Script: [script.id] },
    })),
  });
  created.videos.push(...vids.records.map((r) => r.id));
  check('batch create 2 videos', vids.records.length === 2);

  // 3. Inverse link: script's Videos array + derived counts
  let s = await api('GET', `Video%20Scripts/${script.id}`);
  check('inverse: script.Videos has both', created.videos.every((id) => (s.fields['Videos'] || []).includes(id)), JSON.stringify(s.fields['Videos']));
  check('counts: Scripts To Do = 2', s.fields['Scripts To Do'] === 2, `got ${s.fields['Scripts To Do']}`);
  check('counts: Scripts Past To Do = 0', (s.fields['Scripts Past To Do'] ?? 0) === 0);

  // 4. Batch patch one video → Available; counts shift, Calculation = 0.5
  await api('PATCH', 'Videos', { records: [{ id: created.videos[0], fields: { Status: 'Available' } }] });
  s = await api('GET', `Video%20Scripts/${script.id}`);
  check('counts after status change: 1 todo / 1 past', s.fields['Scripts To Do'] === 1 && s.fields['Scripts Past To Do'] === 1, JSON.stringify([s.fields['Scripts To Do'], s.fields['Scripts Past To Do']]));
  check('Calculation = 0.5', Math.abs((s.fields['Calculation'] ?? 0) - 0.5) < 1e-9, `got ${s.fields['Calculation']}`);

  // 5. Campaign + link a video; video's inverse "Used In Campaign" updates
  const camp = await api('POST', 'Campaigns', { fields: { Name: 'WRITE-TEST campaign', Product: [PRODUCT], Status: 'Preparing' } });
  created.campaigns.push(camp.id);
  await api('PATCH', `Campaigns/${camp.id}`, { fields: { 'Videos Used In This Campaign': [created.videos[0]] } });
  const v0 = await api('GET', `Videos/${created.videos[0]}`);
  check('inverse: video.Used In Campaign has campaign', (v0.fields['Used In Campaign'] || []).includes(camp.id), JSON.stringify(v0.fields['Used In Campaign']));

  // 6. Attachment merge on the campaign (add, then keep+add)
  const a1 = await api('PATCH', `Campaigns/${camp.id}`, { fields: { 'Nadeems PDF': [{ url: 'https://example.com/a.pdf', filename: 'a.pdf' }] } });
  const att1 = a1.fields['Nadeems PDF'];
  check('attachment add: 1 entry with generated att id', Array.isArray(att1) && att1.length === 1 && String(att1[0].id).startsWith('att'));
  const a2 = await api('PATCH', `Campaigns/${camp.id}`, { fields: { 'Nadeems PDF': [{ id: att1[0].id }, { url: 'https://example.com/b.pdf', filename: 'b.pdf' }] } });
  const att2 = a2.fields['Nadeems PDF'];
  check('attachment merge: kept + added = 2', Array.isArray(att2) && att2.length === 2 && att2[0].id === att1[0].id);

  // 7. Reject writes to computed fields
  let rejected = false;
  try { await api('PATCH', `Video%20Scripts/${script.id}`, { fields: { 'Scripts To Do': 99 } }); } catch { rejected = true; }
  check('computed field write rejected (422)', rejected);

  // 8. Product inverse gained the campaign
  const prod = await api('GET', `Products/${PRODUCT}`);
  check('inverse: product.Campaigns has campaign', (prod.fields['Campaigns'] || []).includes(camp.id));
} catch (err) {
  console.log(`ERROR mid-flow: ${err.message}`);
  fail++;
} finally {
  // Cleanup (delete-with-detach is itself part of the contract)
  try {
    if (created.videos.length) await api('DELETE', `Videos?${created.videos.map((id) => `records[]=${id}`).join('&')}`);
    for (const id of created.scripts) await api('DELETE', `Video%20Scripts/${id}`);
    for (const id of created.campaigns) await api('DELETE', `Campaigns/${id}`);
    const prod = await api('GET', `Products/${PRODUCT}`);
    const leaked = [...created.campaigns, ...created.scripts].filter((id) =>
      (prod.fields['Campaigns'] || []).includes(id) || (prod.fields['Video Scripts'] || []).includes(id));
    check('cleanup: product fully detached', leaked.length === 0, JSON.stringify(leaked));
  } catch (err) {
    console.log(`CLEANUP ERROR: ${err.message} — next sync tick removes leftovers`);
    fail++;
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
