#!/usr/bin/env node
/**
 * Seed a shim-test admin user into the D1 mirror (local and/or remote).
 * Never touches Airtable. Re-run after each full re-mirror (the mirror's
 * DELETE wipes it).
 *
 *   node scripts/seed-test-user.mjs --local --remote
 *
 * Prints the credentials and a ready-to-use JWT for curl tests.
 */
import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const EMAIL = 'shim-test@accotta.local';
const PASSWORD = 'shim-test-7Qx!2025';
const REC_ID = 'recSHIMTESTADMIN0';

// PBKDF2 hash in the exact format functions/lib/auth.ts verifies: base64(salt):base64(hash)
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(PASSWORD, salt, 100_000, 32, 'sha256');
const stored = `${salt.toString('base64')}:${hash.toString('base64')}`;

const fields = { Name: 'Shim Test Admin', Email: EMAIL, Password: stored, Role: 'Admin', Active: true };
const now = new Date().toISOString();
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sql = `INSERT OR REPLACE INTO records (table_name,id,fields,created_time,updated_at) VALUES ('Users',${q(REC_ID)},${q(JSON.stringify(fields))},${q(now)},${q(now)});`;
const file = path.join(ROOT, 'scripts', 'd1', 'seed-test-user.sql');
fs.writeFileSync(file, sql, 'utf8');

for (const flag of [process.argv.includes('--local') && '--local', process.argv.includes('--remote') && '--remote'].filter(Boolean)) {
  execSync(`npx wrangler d1 execute ${env.D1_DB_NAME} ${flag} -y --file "${file}"`, { cwd: ROOT, stdio: 'pipe' });
  console.log(`Seeded ${flag}`);
}

// Mint a JWT the same way functions/lib/auth.ts does (HS256, 24h)
const b64u = (s) => Buffer.from(s).toString('base64url');
const nowSec = Math.floor(Date.now() / 1000);
const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const payload = b64u(JSON.stringify({ sub: REC_ID, email: EMAIL, role: 'admin', iat: nowSec, exp: nowSec + 86400 }));
const sig = crypto.createHmac('sha256', env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url');

console.log(`email: ${EMAIL}`);
console.log(`password: ${PASSWORD}`);
console.log(`jwt: ${header}.${payload}.${sig}`);
