#!/usr/bin/env node
/**
 * Seed the shim-test admin user into the D1 `users` table (local and/or
 * remote). Never touches Airtable. Re-run after each full re-mirror (the
 * mirror drops + recreates the table). The sync worker preserves this row.
 *
 *   node scripts/seed-test-user.mjs --local --remote
 */
import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSlimSchema, encodeRow, sqlTableName } from '../functions/lib/db-api/field-map.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const EMAIL = 'shim-test@accotta.local';
const PASSWORD = 'shim-test-7Qx!2025';
const REC_ID = 'recSHIMTESTADMIN0';

const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(PASSWORD, salt, 100_000, 32, 'sha256');
const stored = `${salt.toString('base64')}:${hash.toString('base64')}`;

// Column layout comes from the live schema, same as every other writer.
const meta = await (await fetch(`https://api.airtable.com/v0/meta/bases/${env.AIRTABLE_BASE_ID}/tables`, {
  headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` },
})).json();
const users = buildSlimSchema(meta.tables).tables.find((t) => t.name === 'Users');
if (!users) { console.error('No Users table in schema'); process.exit(1); }

const now = new Date().toISOString();
const { columns, values } = encodeRow(users, {
  id: REC_ID,
  createdTime: now,
  updatedAt: now,
  fields: { Name: 'Shim Test Admin', Email: EMAIL, Password: stored, Role: 'Admin', Active: true },
});
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const sql = `INSERT OR REPLACE INTO "${sqlTableName(users.name)}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${values.map(lit).join(', ')});`;
const file = path.join(ROOT, 'scripts', 'd1', 'seed-test-user.sql');
fs.writeFileSync(file, sql, 'utf8');

for (const flag of [process.argv.includes('--local') && '--local', process.argv.includes('--remote') && '--remote'].filter(Boolean)) {
  execSync(`npx wrangler d1 execute ${env.D1_DB_NAME} ${flag} -y --file "${file}"`, { cwd: ROOT, stdio: 'pipe' });
  console.log(`Seeded ${flag}`);
}

const b64u = (s) => Buffer.from(s).toString('base64url');
const nowSec = Math.floor(Date.now() / 1000);
const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const payload = b64u(JSON.stringify({ sub: REC_ID, email: EMAIL, role: 'admin', iat: nowSec, exp: nowSec + 86400 }));
const sig = crypto.createHmac('sha256', env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url');

console.log(`email: ${EMAIL}`);
console.log(`password: ${PASSWORD}`);
console.log(`jwt: ${header}.${payload}.${sig}`);
