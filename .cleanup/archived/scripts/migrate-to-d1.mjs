#!/usr/bin/env node
/**
 * Airtable → D1 Migration Script
 *
 * Fetches all data from Airtable and generates a SQL file that can be run with:
 *   wrangler d1 execute ops-dashboard-db --local --file=scripts/migration.sql
 *
 * Usage:
 *   node scripts/migrate-to-d1.mjs
 *   wrangler d1 execute ops-dashboard-db --local --file=scripts/migration.sql
 *
 * Re-runnable: uses INSERT OR IGNORE so safe to run multiple times.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────
// LOAD ENV
// ─────────────────────────────────────────────────────────────

const envPath = path.join(__dirname, '..', '.env');
const envRaw = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envRaw
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const eq = l.indexOf('=');
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()];
    })
);

const AIRTABLE_API_KEY = env.VITE_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = env.VITE_AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing VITE_AIRTABLE_API_KEY or VITE_AIRTABLE_BASE_ID in .env');
  process.exit(1);
}

const AT_BASE = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;
const HEADERS = { Authorization: `Bearer ${AIRTABLE_API_KEY}` };

// ─────────────────────────────────────────────────────────────
// AIRTABLE FETCH HELPERS
// ─────────────────────────────────────────────────────────────

/** Throttled fetch — 200ms between requests (5 req/s limit) */
let lastReqTime = 0;
async function atFetch(url) {
  const now = Date.now();
  const wait = 200 - (now - lastReqTime);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastReqTime = Date.now();
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status} for ${url}: ${body}`);
  }
  return res.json();
}

/** Fetch all records from a table (handles pagination) */
async function fetchAll(table) {
  const records = [];
  let offset;
  do {
    const url = `${AT_BASE}/${encodeURIComponent(table)}${offset ? `?offset=${offset}` : ''}`;
    const data = await atFetch(url);
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  console.log(`  Fetched ${records.length} records from "${table}"`);
  return records;
}

// ─────────────────────────────────────────────────────────────
// SQL HELPERS
// ─────────────────────────────────────────────────────────────

/** Escape a value for SQLite: null→NULL, bool→0/1, number→number, else quoted string.
 *  Values with newlines use SQLite printf() to avoid deep expression trees.
 *  printf '%' chars must be doubled. Single quotes are doubled per SQL standard.
 */
function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return String(v);
  const s = String(v).replace(/\r/g, '');
  if (!s.includes('\n')) {
    return `'${s.replace(/'/g, "''")}'`;
  }
  // Use printf() for multi-line values: escape \, %, ', and encode \n
  const escaped = s
    .replace(/\\/g, '\\\\')   // \ → \\
    .replace(/%/g, '%%')       // % → %% (printf format char)
    .replace(/'/g, "''")       // ' → '' (SQL quote)
    .replace(/\n/g, '\\n');    // newline → \n (printf interprets)
  return `printf('${escaped}')`;
}

function insertRow(table, cols, vals) {
  return `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${vals.map(sqlVal).join(', ')});`;
}

// ─────────────────────────────────────────────────────────────
// FIELD HELPERS
// ─────────────────────────────────────────────────────────────

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v) => (typeof v === 'number' ? v : null);
const bool = (v) => (v === true || v === 1 ? 1 : 0);
const linked = (v) => (Array.isArray(v) && v.length > 0 ? v[0] : null);

/**
 * Deduplicates Airtable records by a unique key field.
 * Returns { deduped: records[], remap: Map<dupId → primaryId> }
 *
 * When Airtable has two records with the same FB ID (e.g. two ad accounts
 * both mapped to "act_798872541994883"), only the first is inserted.
 * Any junction rows that reference a dup's Airtable record ID are remapped
 * to the surviving primary record ID.
 */
function dedupByField(records, fieldName) {
  const seen = new Map(); // fbId → primary airtable record id
  const remap = new Map(); // dup airtable id → primary airtable id
  const deduped = [];
  for (const r of records) {
    const key = str(r.fields[fieldName]);
    if (!key) {
      deduped.push(r); // no key → keep (will be skipped later by null check)
      continue;
    }
    if (!seen.has(key)) {
      seen.set(key, r.id);
      deduped.push(r);
    } else {
      remap.set(r.id, seen.get(key)); // this dup maps to the primary
    }
  }
  if (remap.size > 0) {
    const names = [...remap.entries()].map(([d, p]) => `  dup ${d} → primary ${p}`).join('\n');
    console.log(`  Deduplicated ${remap.size} records by "${fieldName}":\n${names}`);
  }
  return { deduped, remap };
}

/** Extract Google Drive folder ID from a Drive URL or bare ID */
function parseDriveFolderId(driveLink) {
  if (!str(driveLink)) return null;
  const m = String(driveLink).match(/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : str(driveLink);
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  const lines = [];
  lines.push('-- Airtable → D1 Migration');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('-- Run with: wrangler d1 execute ops-dashboard-db --local --file=scripts/migration.sql');
  lines.push('');
  lines.push('PRAGMA foreign_keys = OFF;');
  lines.push('');

  // ──────────────────────────────────────────────
  // 1. USERS  (table: "Users", fields: Name, Role, Email)
  // ──────────────────────────────────────────────
  console.log('Fetching Users...');
  const usersRaw = await fetchAll('Users');
  lines.push('-- ─────────────────────────────── USERS');
  for (const r of usersRaw) {
    const f = r.fields;
    const role = Array.isArray(f['Role']) ? (f['Role'][0] ?? '') : (str(f['Role']) ?? '');
    const email = str(f['Email'] ?? f['email'] ?? f['E-mail'] ?? null);
    lines.push(insertRow('users', ['id', 'name', 'role', 'email', 'created_at'], [
      r.id,
      str(f['Name']) ?? 'Unknown',
      role,
      email,
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 2. SCALING RULES  (table: "Scaling Rules")
  // ──────────────────────────────────────────────
  console.log('Fetching Scaling Rules...');
  const rulesRaw = await fetchAll('Scaling Rules');
  lines.push('-- ─────────────────────────────── SCALING RULES');
  for (const r of rulesRaw) {
    const f = r.fields;
    lines.push(insertRow('scaling_rules', [
      'id', 'name', 'rule_scope', 'select_type', 'check_at',
      'if_condition', 'then_action', 'execute_action_at', 'created_at',
    ], [
      r.id,
      str(f['Name']) ?? '',
      str(f['Rule Scope']) ?? 'Global',
      str(f['Select']) ?? 'Budget Change',
      str(f['Check At']) ?? 'Midnight',
      str(f['If']),
      str(f['Then']),
      str(f['Execute Action At']) ?? 'Midnight',
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 3. PRODUCTS  (table: "Products")
  // ──────────────────────────────────────────────
  console.log('Fetching Products...');
  const productsRaw = await fetchAll('Products');
  lines.push('-- ─────────────────────────────── PRODUCTS');
  for (const r of productsRaw) {
    const f = r.fields;
    lines.push(insertRow('products', [
      'id', 'product_name', 'status', 'drive_folder_id', 'created_at',
    ], [
      r.id,
      str(f['Product Name']) ?? 'Unnamed',
      str(f['Status']) ?? 'Active',
      parseDriveFolderId(f['Drive Link']),
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // Product Assets — Airtable attachment arrays (Product Images + Logo)
  lines.push('-- ─────────────────────────────── PRODUCT ASSETS');
  for (const r of productsRaw) {
    const f = r.fields;
    const parseAtts = (field, type) => {
      const atts = f[field];
      if (!Array.isArray(atts)) return [];
      return atts.map((a, i) => ({
        id: a.id,
        url: a.url,
        filename: a.filename,
        type,
        sortOrder: i,
      }));
    };
    const assets = [
      ...parseAtts('Product Images', 'image'),
      ...parseAtts('Product Logo', 'logo'),
    ];
    for (const a of assets) {
      lines.push(insertRow('product_assets', [
        'id', 'product_id', 'url', 'filename', 'type', 'sort_order',
      ], [a.id, r.id, a.url, a.filename, a.type, a.sortOrder]));
    }
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 4. INFRASTRUCTURE — Profiles
  // ──────────────────────────────────────────────
  console.log('Fetching Profiles...');
  const profilesRaw = await fetchAll('tble3Qky3A2j8LpSj');
  lines.push('-- ─────────────────────────────── PROFILES');
  const skippedProfiles = [];
  for (const r of profilesRaw) {
    const f = r.fields;
    const fbId = str(f['Profile ID']);
    if (!fbId) {
      skippedProfiles.push(r.id);
      continue; // NOT NULL constraint
    }
    // bm_ids: linked BMs are available directly on profile records
    const linkedBmsRaw = Array.isArray(f['Linked BM']) ? f['Linked BM'] : [];
    // Will be resolved after BMs are processed; store raw for now
    r._linkedBmsRaw = linkedBmsRaw;
    lines.push(insertRow('profiles', [
      'id', 'profile_fb_id', 'profile_name', 'profile_status',
      'permanent_token', 'permanent_token_end_date', 'token_valid',
      'last_sync', 'hidden',
      'profile_email', 'profile_fb_password', 'profile_email_password',
      'profile_2fa', 'profile_birth_date', 'profile_link',
      'profile_review_date', 'profile_security_email', 'security_email_password',
      'proxy', 'profile_youtube_handle', 'uid',
      'profile_gender', 'profile_location', 'profile_year_created',
      'ads_power_profile_id', 'created_at',
    ], [
      r.id,
      fbId,
      str(f['Profile Name']) ?? fbId,
      str(f['Profile Status']),
      str(f['Permanent Token']),
      str(f['Permanent Token End Date']),
      bool(f['Token Valid']),
      str(f['Last Sync']),
      bool(f['Hidden']),
      str(f['Profile Email']),
      str(f['Profile FB Password']),
      str(f['Profile Email Password']),
      str(f['Profile 2FA']),
      str(f['Profile Birth Date']),
      str(f['Profile Link']),
      str(f['Profile Review Date']),
      str(f['Profile Security Email']),
      str(f['Security Email Password']),
      str(f['Proxy']),
      str(f['Profile YouTube Handle']),
      str(f['UID']),
      str(f['Profile Gender']),
      str(f['Profile Location']),
      str(f['Profile Year Created']),
      str(f['Linked AdsProfile']),
      str(r.createdTime),
    ]));
  }
  if (skippedProfiles.length) {
    console.log(`  Skipped ${skippedProfiles.length} profiles with no Profile ID`);
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 5. INFRASTRUCTURE — Business Managers
  // ──────────────────────────────────────────────
  console.log('Fetching Business Managers...');
  const bmsRawAll = await fetchAll('tbl1xnWkoju7WG8lb');
  const { deduped: bmsRaw, remap: bmsRemap } = dedupByField(bmsRawAll, 'BM ID');
  lines.push('-- ─────────────────────────────── BUSINESS MANAGERS');
  const skippedBms = [];
  for (const r of bmsRaw) {
    const f = r.fields;
    const bmId = str(f['BM ID']);
    if (!bmId) { skippedBms.push(r.id); continue; }
    // Collect ad_account_ids and pixel_ids as JSON arrays
    const linkedAccIds = Array.isArray(f['Linked Ad Accs']) ? f['Linked Ad Accs'] : [];
    const linkedPixelIds = Array.isArray(f['Linked Pixels']) ? f['Linked Pixels'] : [];
    // Store for later resolution (after validAdAccIds and validPixelIds are built)
    r._linkedAccIds = linkedAccIds;
    r._linkedPixelIds = linkedPixelIds;
    lines.push(insertRow('business_managers', [
      'id', 'bm_fb_id', 'bm_name', 'bm_status', 'verification_status',
      'system_user_id', 'system_user_token', 'system_user_created',
      'last_synced', 'hidden', 'created_at',
    ], [
      r.id,
      bmId,
      str(f['BM Name']) ?? bmId,
      str(f['BM Status']),
      str(f['Verification Status']),
      str(f['System User ID']),
      str(f['System User Token']),
      str(f['System User Created']),
      str(f['Last Synced']),
      bool(f['Hidden']),
      str(r.createdTime),
    ]));
  }
  if (skippedBms.length) console.log(`  Skipped ${skippedBms.length} BMs with no BM ID`);
  lines.push('');

  // ──────────────────────────────────────────────
  // 6. INFRASTRUCTURE — Ad Accounts
  // ──────────────────────────────────────────────
  console.log('Fetching Ad Accounts...');
  const adAccsRawAll = await fetchAll('tbltReEL235grY3Im');
  const { deduped: adAccsRaw, remap: adAccsRemap } = dedupByField(adAccsRawAll, 'Ad Acc ID');
  lines.push('-- ─────────────────────────────── AD ACCOUNTS');
  for (const r of adAccsRaw) {
    const f = r.fields;
    const accId = str(f['Ad Acc ID']);
    if (!accId) continue;
    lines.push(insertRow('ad_accounts', [
      'id', 'ad_acc_fb_id', 'ad_acc_name', 'ad_acc_status',
      'currency', 'amount_spent', 'timezone',
      'last_synced', 'hidden', 'created_at',
    ], [
      r.id,
      accId,
      str(f['Ad Acc Name']) ?? accId,
      str(f['Ad Acc Status']),
      str(f['Currency']),
      num(f['Amount Spent']) ?? 0,
      str(f['Timezone']),
      str(f['Last Synced']),
      bool(f['Hidden']),
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 7. INFRASTRUCTURE — Pages
  // ──────────────────────────────────────────────
  console.log('Fetching Pages...');
  const pagesRawAll = await fetchAll('tblUwiY8UQVi3yXBU');
  const { deduped: pagesRaw, remap: pagesRemap } = dedupByField(pagesRawAll, 'Page ID');
  lines.push('-- ─────────────────────────────── PAGES');
  for (const r of pagesRaw) {
    const f = r.fields;
    const pageId = str(f['Page ID']);
    if (!pageId) continue;
    lines.push(insertRow('pages', [
      'id', 'page_fb_id', 'page_name', 'published',
      'page_link', 'fan_count', 'last_synced', 'hidden', 'created_at',
    ], [
      r.id,
      pageId,
      str(f['Page Name']) ?? pageId,
      str(f['Published']),
      str(f['Page Link']),
      num(f['Fan Count']) ?? 0,
      str(f['Last Synced']),
      bool(f['Hidden']),
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 8. INFRASTRUCTURE — Pixels
  // ──────────────────────────────────────────────
  console.log('Fetching Pixels...');
  const pixelsRawAll = await fetchAll('tblsMDmQedp4B3pB8');
  const { deduped: pixelsRaw, remap: pixelsRemap } = dedupByField(pixelsRawAll, 'Pixel ID');
  lines.push('-- ─────────────────────────────── PIXELS');
  for (const r of pixelsRaw) {
    const f = r.fields;
    const pixelId = str(f['Pixel ID']);
    if (!pixelId) continue;
    // Store owner BMs for later resolution
    r._ownerBmIds = Array.isArray(f['Owner BM']) ? f['Owner BM'] : [];
    lines.push(insertRow('pixels', [
      'id', 'pixel_fb_id', 'pixel_name', 'available',
      'last_fired_time', 'last_synced', 'hidden', 'created_at',
    ], [
      r.id,
      pixelId,
      str(f['Pixel Name']) ?? pixelId,
      str(f['Available']),
      str(f['Last Fired Time']),
      str(f['Last Synced']),
      bool(f['Hidden']),
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 9. JSON COLUMN UPDATES — infrastructure linked records
  // ──────────────────────────────────────────────

  // Build sets of valid IDs (only records that were actually inserted)
  const validProfileIds = new Set(profilesRaw.filter((r) => str(r.fields['Profile ID'])).map((r) => r.id));
  const validBmIds = new Set(bmsRaw.filter((r) => str(r.fields['BM ID'])).map((r) => r.id));
  const validAdAccIds = new Set(adAccsRaw.filter((r) => str(r.fields['Ad Acc ID'])).map((r) => r.id));
  const validPageIds = new Set(pagesRaw.filter((r) => str(r.fields['Page ID'])).map((r) => r.id));
  const validPixelIds = new Set(pixelsRaw.filter((r) => str(r.fields['Pixel ID'])).map((r) => r.id));

  /** Resolve an ID through dedup remaps (returns primary inserted ID, or null if invalid) */
  const resolveAcc   = (id) => { const r = adAccsRemap.get(id);  return r ?? (validAdAccIds.has(id) ? id : null); };
  const resolveBm    = (id) => { const r = bmsRemap.get(id);     return r ?? (validBmIds.has(id)    ? id : null); };
  const resolvePage  = (id) => { const r = pagesRemap.get(id);   return r ?? (validPageIds.has(id)   ? id : null); };
  const resolvePixel = (id) => { const r = pixelsRemap.get(id);  return r ?? (validPixelIds.has(id)  ? id : null); };

  lines.push('-- ─────────────────────────────── PROFILE bm_ids');
  for (const r of profilesRaw) {
    if (!validProfileIds.has(r.id)) continue;
    const bmIds = (r._linkedBmsRaw ?? []).map(resolveBm).filter(Boolean);
    lines.push(`UPDATE profiles SET bm_ids = '${JSON.stringify(bmIds)}' WHERE id = '${r.id}';`);
  }
  lines.push('');

  lines.push('-- ─────────────────────────────── PROFILE page_ids (from pages inverse link)');
  // Build profile → pages map from pages' Linked Profiles field
  const profilePageMap = new Map();
  for (const r of pagesRaw) {
    if (!validPageIds.has(r.id)) continue;
    const linkedProfiles = r.fields['Linked Profiles'];
    if (!Array.isArray(linkedProfiles)) continue;
    for (const profileId of linkedProfiles) {
      if (!validProfileIds.has(profileId)) continue;
      const list = profilePageMap.get(profileId) ?? [];
      list.push(r.id);
      profilePageMap.set(profileId, list);
    }
  }
  for (const [profileId, pageIds] of profilePageMap) {
    lines.push(`UPDATE profiles SET page_ids = '${JSON.stringify(pageIds)}' WHERE id = '${profileId}';`);
  }
  lines.push('');

  lines.push('-- ─────────────────────────────── BM ad_account_ids + pixel_ids');
  for (const r of bmsRaw) {
    if (!validBmIds.has(r.id)) continue;
    const adAccIds = [...new Set((r._linkedAccIds ?? []).map(resolveAcc).filter(Boolean))];
    const pixIds = [...new Set((r._linkedPixelIds ?? []).map(resolvePixel).filter(Boolean))];
    lines.push(`UPDATE business_managers SET ad_account_ids = '${JSON.stringify(adAccIds)}', pixel_ids = '${JSON.stringify(pixIds)}' WHERE id = '${r.id}';`);
  }
  lines.push('');

  lines.push('-- ─────────────────────────────── PIXEL owner_bm_ids');
  for (const r of pixelsRaw) {
    if (!validPixelIds.has(r.id)) continue;
    const ownerBmIds = (r._ownerBmIds ?? []).map(resolveBm).filter(Boolean);
    lines.push(`UPDATE pixels SET owner_bm_ids = '${JSON.stringify(ownerBmIds)}' WHERE id = '${r.id}';`);
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 10. AD PRESETS
  // ──────────────────────────────────────────────
  console.log('Fetching Ad Presets...');
  const adPresetsRaw = await fetchAll('Ad Presets');
  lines.push('-- ─────────────────────────────── AD PRESETS');
  const validProductIds = new Set(productsRaw.map((r) => r.id));
  for (const r of adPresetsRaw) {
    const f = r.fields;
    const productId = linked(f['Product']);
    if (!productId || !validProductIds.has(productId)) continue; // skip orphans
    lines.push(insertRow('ad_presets', [
      'id', 'preset_name', 'product_id',
      'primary_text_1', 'primary_text_2', 'primary_text_3', 'primary_text_4', 'primary_text_5',
      'headline_1', 'headline_2', 'headline_3', 'headline_4', 'headline_5',
      'description_1', 'description_2', 'description_3', 'description_4', 'description_5',
      'call_to_action', 'beneficiary_name', 'payer_name', 'created_at',
    ], [
      r.id,
      str(f['Preset Name']) ?? 'Unnamed Preset',
      productId,
      str(f['Primary Text 1']), str(f['Primary Text 2']), str(f['Primary Text 3']),
      str(f['Primary Text 4']), str(f['Primary Text 5']),
      str(f['Headline 1']), str(f['Headline 2']), str(f['Headline 3']),
      str(f['Headline 4']), str(f['Headline 5']),
      str(f['Description 1']), str(f['Description 2']), str(f['Description 3']),
      str(f['Description 4']), str(f['Description 5']),
      str(f['Call to Action']),
      str(f['Beneficiary Name']),
      str(f['Payer Name']),
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 11. VIDEO SCRIPTS
  // ──────────────────────────────────────────────
  console.log('Fetching Video Scripts...');
  const scriptsRaw = await fetchAll('Video Scripts');
  lines.push('-- ─────────────────────────────── VIDEO SCRIPTS');
  const validUserIds = new Set(usersRaw.map((r) => r.id));
  for (const r of scriptsRaw) {
    const f = r.fields;
    const name = str(f['Name']);
    if (!name) continue;
    const productId = linked(f['Product']);
    const authorId = linked(f['Author']);
    lines.push(insertRow('video_scripts', [
      'id', 'script_name', 'product_id', 'author_id',
      'script_content', 'is_approved', 'needs_revision',
      'version', 'notes', 'hook', 'body', 'hook_number', 'base_script_number',
      'created_at',
    ], [
      r.id,
      name,
      productId && validProductIds.has(productId) ? productId : null,
      authorId && validUserIds.has(authorId) ? authorId : null,
      str(f['Script Content']),
      bool(f['Approved']),
      bool(f['Revision Needed']),
      num(f['Version']),
      str(f['Notes']),
      str(f['Hook']),
      str(f['Body']),
      num(f['Hook Number']),
      num(f['Base Script Number']),
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 12. VIDEOS
  // ──────────────────────────────────────────────
  console.log('Fetching Videos...');
  const videosRaw = await fetchAll('Videos');
  lines.push('-- ─────────────────────────────── VIDEOS');
  const validScriptIds = new Set(scriptsRaw.map((r) => r.id));
  for (const r of videosRaw) {
    const f = r.fields;
    const name = str(f['Video Name']);
    if (!name) continue;
    const productId = linked(f['Product']);
    const editorId = linked(f['Editor']);
    const scriptId = linked(f['Script']);

    // Normalize status: "To Do" → "todo"
    const rawStatus = str(f['Status']) ?? 'To Do';
    const statusMap = { 'to do': 'todo', 'todo': 'todo', 'review': 'review', 'available': 'available', 'used': 'used' };
    const status = statusMap[rawStatus.toLowerCase()] ?? 'todo';

    // Normalize format
    const rawFormat = str(f['Format']) ?? 'square';
    const formatMap = { 'square': 'square', 'vertical': 'vertical', 'youtube': 'youtube' };
    const format = formatMap[rawFormat.toLowerCase()] ?? 'square';

    lines.push(insertRow('videos', [
      'id', 'video_name', 'status', 'format', 'text_version',
      'product_id', 'editor_id', 'script_id',
      'creative_link', 'notes', 'scrollstopper_number', 'created_at',
    ], [
      r.id,
      name,
      status,
      format,
      str(f['Text Version']),
      productId && validProductIds.has(productId) ? productId : null,
      editorId && validUserIds.has(editorId) ? editorId : null,
      scriptId && validScriptIds.has(scriptId) ? scriptId : null,
      str(f['Creative Link']),
      str(f['Notes']),
      num(f['Scrollstopper Number']),
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 13. CAMPAIGNS
  // ──────────────────────────────────────────────
  console.log('Fetching Campaigns...');
  const campaignsRaw = await fetchAll('Campaigns');
  lines.push('-- ─────────────────────────────── CAMPAIGNS');

  // Build ad_presets ID set for FK reference
  const validAdPresetIds = new Set(adPresetsRaw.map((r) => r.id));

  // Build valid video/image ID sets for FK validation (populated in sections 12 & 14)
  // These will be available after those sections run — we build campaigns last in the loop
  // so we capture raw IDs now and resolve them inline
  const validCampaignIds = new Set();

  for (const r of campaignsRaw) {
    const f = r.fields;
    const name = str(f['Name']);
    if (!name) continue;
    const productId = linked(f['Product']);

    // Normalize status
    const rawStatus = str(f['Status']) ?? 'Preparing';
    const statusLower = rawStatus.toLowerCase();
    const status = statusLower === 'launched' ? 'Launched' : statusLower === 'cancelled' ? 'Cancelled' : 'Preparing';

    // selectedAdProfileId is a linked record → adPresets
    const selectedAdProfileIds = f['Selected Ad Profile'];
    const selectedAdProfileId = Array.isArray(selectedAdProfileIds) && selectedAdProfileIds.length > 0
      ? selectedAdProfileIds[0]
      : null;

    // Collect video_ids and image_ids as JSON arrays
    const rawVideoIds = Array.isArray(f['Videos Used In This Campaign']) ? f['Videos Used In This Campaign'] : [];
    const rawImageIds = Array.isArray(f['Images Used In This Campaign']) ? f['Images Used In This Campaign'] : [];
    // Store for later resolution (after validVideoIds and validImageIds are built)
    r._rawVideoIds = rawVideoIds;
    r._rawImageIds = rawImageIds;

    validCampaignIds.add(r.id);

    lines.push(insertRow('campaigns', [
      'id', 'campaign_name', 'status', 'product_id', 'platform',
      'redtrack_campaign_name', 'redtrack_campaign_id',
      'notes', 'start_date', 'end_date', 'budget', 'description',
      'fb_campaign_id', 'fb_ad_account_id', 'launch_profile_id', 'launched_data', 'launched_at',
      'launch_date', 'launch_time', 'location_targeting', 'website_url', 'utms',
      'ad_acc_used', 'page_used', 'pixel_used',
      'selected_ad_profile_id',
      'cta', 'display_link', 'link_variable', 'draft_profile_id',
      'reuse_creatives', 'launch_as_active', 'created_at',
    ], [
      r.id,
      name,
      status,
      productId && validProductIds.has(productId) ? productId : null,
      str(f['Platform']),
      str(f['RedTrack Campaign Name']),
      str(f['RedTrack Campaign Id']),
      str(f['Notes']),
      str(f['Start Date']),
      str(f['End Date']),
      num(f['Budget']),
      str(f['Description']),
      str(f['FB Campaign ID']),
      str(f['FB Ad Account ID']),
      str(f['Launch Profile ID']),
      str(f['Launched Data']),
      str(f['Launch Date']),  // Airtable uses same field for launch date and launched_at
      str(f['Launch Date']),
      str(f['Launch Time']),
      str(f['Location Targeting']),
      str(f['Website Url']),
      str(f['UTMs']),
      str(f['Ad Acc Used']),
      str(f['Page Used']),
      str(f['Pixel Used']),
      selectedAdProfileId && validAdPresetIds.has(selectedAdProfileId) ? selectedAdProfileId : null,
      str(f['CTA']),
      str(f['Display Link']),
      str(f['Link Variable']),
      str(f['Profile ID']),
      bool(f['Reuse Creatives']),
      bool(f['Launch As Active']),
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 14. IMAGES
  // ──────────────────────────────────────────────
  console.log('Fetching Images...');
  const imagesRaw = await fetchAll('Images');
  lines.push('-- ─────────────────────────────── IMAGES');
  for (const r of imagesRaw) {
    const f = r.fields;
    const name = str(f['Image Name']);
    if (!name) continue;
    const productId = linked(f['Product']);
    lines.push(insertRow('images', [
      'id', 'image_name', 'status', 'product_id', 'image_type',
      'drive_file_id', 'image_drive_link', 'thumbnail_url',
      'width', 'height', 'file_size', 'notes', 'count', 'created_at',
    ], [
      r.id,
      name,
      str(f['Status']) ?? 'pending',
      productId && validProductIds.has(productId) ? productId : null,
      str(f['Type']),
      str(f['Drive File ID']),
      str(f['Image Drive Link']),
      str(f['Thumbnail URL']),
      num(f['Width']),
      num(f['Height']),
      num(f['File Size']),
      str(f['Notes']),
      num(f['Count']) ?? 1,
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 15. TEMP IMAGES
  // ──────────────────────────────────────────────
  console.log('Fetching Temp Images...');
  const tempImagesRaw = await fetchAll('Temp Images');
  lines.push('-- ─────────────────────────────── TEMP IMAGES');
  for (const r of tempImagesRaw) {
    const f = r.fields;
    const productId = linked(f['Product']);
    lines.push(insertRow('temp_images', [
      'id', 'image_name', 'product_id', 'drive_link', 'created_at',
    ], [
      r.id,
      str(f['Image Name']) ?? str(f['Name']),
      productId && validProductIds.has(productId) ? productId : null,
      str(f['Drive Link']),
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 16. ADVERTORIALS
  // ──────────────────────────────────────────────
  console.log('Fetching Advertorials...');
  const advertorialsRaw = await fetchAll('Advertorials');
  lines.push('-- ─────────────────────────────── ADVERTORIALS');
  for (const r of advertorialsRaw) {
    const f = r.fields;
    const productId = linked(f['Product']);
    lines.push(insertRow('advertorials', [
      'id', 'advertorial_name', 'product_id',
      'advertorial_text', 'final_link', 'is_checked', 'created_at',
    ], [
      r.id,
      str(f['Advertorial Name']) ?? 'Unnamed Advertorial',
      productId && validProductIds.has(productId) ? productId : null,
      str(f['Advertorial Text']),
      str(f['Final Advertorial Link']),
      bool(f['Advertorial Checked']),
      str(r.createdTime),
    ]));
  }
  lines.push('');

  // ──────────────────────────────────────────────
  // 17. JSON COLUMN UPDATES — campaign video_ids + image_ids
  // ──────────────────────────────────────────────
  const validVideoIds = new Set(videosRaw.map((r) => r.id));
  const validImageIds = new Set(imagesRaw.map((r) => r.id));

  lines.push('-- ─────────────────────────────── CAMPAIGN video_ids + image_ids');
  for (const r of campaignsRaw) {
    if (!validCampaignIds.has(r.id)) continue;
    const videoIds = (r._rawVideoIds ?? []).filter((id) => validVideoIds.has(id));
    const imageIds = (r._rawImageIds ?? []).filter((id) => validImageIds.has(id));
    lines.push(`UPDATE campaigns SET video_ids = '${JSON.stringify(videoIds)}', image_ids = '${JSON.stringify(imageIds)}' WHERE id = '${r.id}';`);
  }
  lines.push('');

  lines.push('-- End of migration data.');

  // ──────────────────────────────────────────────
  // WRITE OUTPUT — split into chunks to stay under wrangler's body limit
  // Each entry in `lines` is either a complete statement or a blank/comment.
  // We split on `lines` boundaries (never inside a statement).
  // ──────────────────────────────────────────────

  const CHUNK_BYTES = 400 * 1024; // 400 KB per file

  const chunks = [[]];
  let chunkSize = 0;
  for (const line of lines) {
    const lineBytes = line.length + 1; // +1 for the \n
    // Split at a blank line when we're over the threshold
    if (chunkSize + lineBytes > CHUNK_BYTES && line === '') {
      chunks.push([]);
      chunkSize = 0;
    }
    chunks[chunks.length - 1].push(line);
    chunkSize += lineBytes;
  }

  const allSql = lines.join('\n');
  const outputPath = path.join(__dirname, 'migration.sql');
  fs.writeFileSync(outputPath, allSql, 'utf8');

  // Write chunked files
  for (let i = 0; i < chunks.length; i++) {
    const chunkPath = path.join(__dirname, `migration-part${i + 1}.sql`);
    fs.writeFileSync(chunkPath, chunks[i].join('\n'), 'utf8');
  }

  const statCounts = {
    users: usersRaw.length,
    scalingRules: rulesRaw.length,
    products: productsRaw.length,
    profiles: profilesRaw.length - skippedProfiles.length,
    businessManagers: bmsRaw.length - skippedBms.length,
    adAccounts: adAccsRaw.length,
    pages: pagesRaw.length,
    pixels: pixelsRaw.length,
    adPresets: adPresetsRaw.length,
    videoScripts: scriptsRaw.length,
    videos: videosRaw.length,
    campaigns: campaignsRaw.length,
    images: imagesRaw.length,
    tempImages: tempImagesRaw.length,
    advertorials: advertorialsRaw.length,
  };

  console.log(`\n✓ Migration SQL written to scripts/migration.sql (full) + ${chunks.length} parts`);
  console.log('\nRecord counts:');
  for (const [k, v] of Object.entries(statCounts)) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }
  console.log('\nNext step (run in order):');
  for (let i = 1; i <= chunks.length; i++) {
    console.log(`  wrangler d1 execute ops-dashboard-db --local --file=scripts/migration-part${i}.sql`);
  }
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
