/**
 * Reset a user's password in Airtable.
 * Usage: node scripts/reset-password.mjs <email> <newPassword>
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = resolve(__dirname, '../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const AIRTABLE_API_KEY = env.VITE_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = env.VITE_AIRTABLE_BASE_ID;

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_LENGTH * 8
  );
  return `${arrayBufferToBase64(salt.buffer)}:${arrayBufferToBase64(hash)}`;
}

const [email, newPassword] = process.argv.slice(2);
if (!email || !newPassword) {
  console.error('Usage: node scripts/reset-password.mjs <email> <newPassword>');
  process.exit(1);
}

console.log(`Resetting password for: ${email}`);

// Look up user in Airtable
const formula = encodeURIComponent(`{Email} = '${email}'`);
const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula=${formula}`, {
  headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
});
const data = await res.json();

if (!data.records?.length) {
  console.error('User not found:', email);
  process.exit(1);
}

const record = data.records[0];
console.log('Found user:', record.fields.Name, '| Role:', record.fields.Role);

// Hash the new password
const hashed = await hashPassword(newPassword);

// Update Airtable
const patchRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users/${record.id}`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ fields: { Password: hashed } }),
});

if (!patchRes.ok) {
  const err = await patchRes.text();
  console.error('Failed to update password:', err);
  process.exit(1);
}

console.log('Password reset successfully!');
console.log(`Login with: ${email} / ${newPassword}`);
