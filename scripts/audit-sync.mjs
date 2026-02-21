#!/usr/bin/env node
/**
 * Airtable ↔ D1 Sync Audit Script
 * Compares all tables and reports differences.
 */

import { execSync } from 'child_process';

const AT_BASE = 'https://api.airtable.com/v0/app539oH1FIBuVBh9';
const AT_KEY = process.env.AIRTABLE_API_KEY;
const PROJECT_DIR = 'C:\\Users\\Jay\\Desktop\\Jay\\ops-dashboard-cloudflare';

// ─── Table definitions ───────────────────────────────────────────────────────
const TABLES = [
  {
    d1Table: 'profiles',
    atTable: 'Profiles',
    fields: {
      'Profile Name': 'profile_name',
      'Profile Status': 'profile_status',
      'Profile FB UID': 'profile_fb_id',
      'Permanent Token': 'permanent_token',
    },
  },
  {
    d1Table: 'business_managers',
    atTable: 'Business Managers',
    fields: {
      'BM Name': 'bm_name',
      'BM Status': 'bm_status',
      'BM ID': 'bm_fb_id',
      'Verification Status': 'verification_status',
    },
  },
  {
    d1Table: 'ad_accounts',
    atTable: 'Ad Accounts',
    fields: {
      'Ad Acc Name': 'ad_acc_name',
      'Ad Acc Status': 'ad_acc_status',
      'Currency': 'currency',
      'Amount Spent': 'amount_spent',
      'Timezone': 'timezone',
    },
  },
  {
    d1Table: 'pages',
    atTable: 'Pages',
    fields: {
      'Page Name': 'page_name',
      'Page ID': 'page_fb_id',
      'Published': 'published',
      'Fan Count': 'fan_count',
    },
  },
  {
    d1Table: 'pixels',
    atTable: 'Pixels',
    fields: {
      'Pixel Name': 'pixel_name',
      'Pixel ID': 'pixel_fb_id',
      'Available': 'available',
      'Last Fired Time': 'last_fired_time',
    },
  },
  {
    d1Table: 'users',
    atTable: 'Users',
    fields: {
      'Name': 'name',
      'Role': 'role',
      'Email': 'email',
    },
  },
  {
    d1Table: 'products',
    atTable: 'Products',
    fields: {
      'Product Name': 'product_name',
      'Status': 'status',
    },
  },
  {
    d1Table: 'campaigns',
    atTable: 'Campaigns',
    fields: {
      'Name': 'campaign_name',
      'Status': 'status',
      'FB Campaign ID': 'fb_campaign_id',
      'FB Ad Account ID': 'fb_ad_account_id',
    },
  },
  {
    d1Table: 'images',
    atTable: 'Images',
    fields: {
      'Image Name': 'image_name',
      'Image Drive Link': 'image_drive_link',
    },
  },
  {
    d1Table: 'videos',
    atTable: 'Videos',
    fields: {
      'Video Name': 'video_name',
      'Status': 'status',
    },
  },
  {
    d1Table: 'video_scripts',
    atTable: 'Video Scripts',
    fields: {
      'Name': 'script_name',
    },
  },
  {
    d1Table: 'ad_presets',
    atTable: 'Ad Presets',
    fields: {
      'Preset Name': 'preset_name',
    },
  },
  {
    d1Table: 'advertorials',
    atTable: 'Advertorials',
    fields: {
      'Advertorial Name': 'advertorial_name',
      'Final Advertorial Link': 'final_link',
      'Advertorial Checked': 'is_checked',
    },
  },
  {
    d1Table: 'scaling_rules',
    atTable: 'Scaling Rules',
    fields: {
      'Name': 'name',
      'Rule Scope': 'rule_scope',
      'If': 'if_condition',
      'Then': 'then_action',
    },
  },
];

// ─── Airtable fetch (all pages) ─────────────────────────────────────────────
async function fetchAirtable(tableName) {
  const records = [];
  let offset = null;
  do {
    const url = `${AT_BASE}/${encodeURIComponent(tableName)}?pageSize=100${offset ? `&offset=${offset}` : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AT_KEY}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable ${tableName} error ${res.status}: ${text}`);
    }
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset || null;
  } while (offset);
  return records;
}

// ─── D1 query ────────────────────────────────────────────────────────────────
function queryD1(sql) {
  const cmd = `npx wrangler d1 execute DB --remote --command "${sql.replace(/"/g, '\\"')}" --json`;
  const raw = execSync(cmd, {
    cwd: PROJECT_DIR,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: '1b61024eb1ac5521d490185855ece11f' },
  });
  // wrangler outputs warnings before JSON - find the JSON array
  const jsonStart = raw.indexOf('[');
  if (jsonStart === -1) throw new Error(`No JSON in D1 output: ${raw.slice(0, 200)}`);
  const parsed = JSON.parse(raw.slice(jsonStart));
  return parsed[0]?.results || [];
}

// ─── Normalize for comparison ────────────────────────────────────────────────
function normalize(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (Array.isArray(val)) return null; // linked records - ignore
  const s = String(val).trim();
  if (s === '') return null;
  return s;
}

// Status normalization: Airtable uses "To Do", D1 uses "todo"
function normalizeStatus(val, isStatusField) {
  if (!isStatusField) return normalize(val);
  const n = normalize(val);
  if (!n) return null;
  const lower = n.toLowerCase();
  if (lower === 'to do') return 'todo';
  return lower;
}

// ─── Compare one table ───────────────────────────────────────────────────────
async function auditTable(tableDef) {
  const { d1Table, atTable, fields } = tableDef;
  const d1Cols = Object.values(fields);

  // Fetch both
  const [atRecords, d1Rows] = await Promise.all([
    fetchAirtable(atTable),
    Promise.resolve(queryD1(`SELECT id, ${d1Cols.join(', ')} FROM ${d1Table}`)),
  ]);

  // Build maps
  const atMap = new Map();
  for (const rec of atRecords) {
    atMap.set(rec.id, rec.fields);
  }

  const d1Map = new Map();
  for (const row of d1Rows) {
    d1Map.set(row.id, row);
  }

  // Filter out test seed rows (IDs starting with rec_)
  const atIds = new Set([...atMap.keys()].filter(id => !id.startsWith('rec_')));
  const d1Ids = new Set([...d1Map.keys()].filter(id => !id.startsWith('rec_')));

  // Missing from D1
  const missing = [];
  for (const id of atIds) {
    if (!d1Ids.has(id)) {
      const nameField = Object.keys(fields)[0]; // first field is usually the name
      const name = atMap.get(id)?.[nameField] || '(no name)';
      missing.push({ id, name });
    }
  }

  // Extra in D1
  const extra = [];
  for (const id of d1Ids) {
    if (!atIds.has(id)) {
      extra.push(id);
    }
  }

  // Changed values
  const changes = [];
  for (const id of atIds) {
    if (!d1Ids.has(id)) continue;
    const atFields = atMap.get(id);
    const d1Row = d1Map.get(id);

    for (const [atField, d1Col] of Object.entries(fields)) {
      const isStatus = d1Col === 'status' || atField === 'Status';
      const atVal = normalizeStatus(atFields[atField], isStatus);
      const d1Val = normalizeStatus(d1Row[d1Col], isStatus);

      if (atVal !== d1Val) {
        // Skip linked record arrays (Airtable returns arrays for linked fields)
        if (Array.isArray(atFields[atField])) continue;
        changes.push({ id, field: d1Col, airtable: atFields[atField], d1: d1Row[d1Col] });
      }
    }
  }

  return { d1Table, atTable, missing, extra, changes, atCount: atIds.size, d1Count: d1Ids.size };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(70));
  console.log('  AIRTABLE ↔ CLOUDFLARE D1 SYNC AUDIT');
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(70));

  let totalMissing = 0, totalExtra = 0, totalChanged = 0;

  for (const tableDef of TABLES) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`TABLE: ${tableDef.d1Table} (Airtable: "${tableDef.atTable}")`);
    console.log(`${'─'.repeat(70)}`);

    try {
      const result = await auditTable(tableDef);
      console.log(`  Airtable rows: ${result.atCount}  |  D1 rows: ${result.d1Count}`);

      if (result.missing.length === 0 && result.extra.length === 0 && result.changes.length === 0) {
        console.log('  ✅ No differences');
      } else {
        if (result.missing.length > 0) {
          console.log(`\n  Missing from D1 (${result.missing.length}):`);
          for (const m of result.missing) {
            console.log(`    - ${m.id}  "${m.name}"`);
          }
        }
        if (result.extra.length > 0) {
          console.log(`\n  Extra in D1 (${result.extra.length}):`);
          for (const e of result.extra) {
            console.log(`    - ${e}`);
          }
        }
        if (result.changes.length > 0) {
          console.log(`\n  Changed values (${result.changes.length}):`);
          for (const c of result.changes) {
            const atStr = c.airtable === null || c.airtable === undefined ? 'NULL' : `"${String(c.airtable).slice(0, 60)}"`;
            const d1Str = c.d1 === null || c.d1 === undefined ? 'NULL' : `"${String(c.d1).slice(0, 60)}"`;
            console.log(`    ${c.id} | ${c.field} | ${atStr} → ${d1Str}`);
          }
        }
      }

      totalMissing += result.missing.length;
      totalExtra += result.extra.length;
      totalChanged += result.changes.length;
    } catch (err) {
      console.log(`  ❌ ERROR: ${err.message}`);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('  SUMMARY');
  console.log(`${'='.repeat(70)}`);
  console.log(`  Total missing from D1:  ${totalMissing}`);
  console.log(`  Total extra in D1:      ${totalExtra}`);
  console.log(`  Total changed values:   ${totalChanged}`);
  console.log(`${'='.repeat(70)}`);
}

main().catch(console.error);
