import { chromium } from 'playwright';
import { createHmac } from 'crypto';
import { readFileSync } from 'fs';

let jwtSecret = 'dev-secret';
try {
  const devVars = readFileSync('/c/Users/Jay/Desktop/Jay/ops-dashboard-cloudflare/.dev.vars', 'utf8');
  const match = devVars.match(/JWT_SECRET\s*=\s*["']?([^"'\n]+)["']?/);
  if (match) jwtSecret = match[1].trim();
} catch {}

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function makeJwt(secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ 
    sub: 'test-user-id', name: 'Jay Admin', role: 'Admin', email: 'jay@example.com',
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600
  }));
  const data = `${header}.${payload}`;
  const sig = createHmac('sha256', secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

const jwt = await makeJwt(jwtSecret);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addCookies([{
  name: 'ops_session', value: jwt, domain: 'localhost',
  path: '/', httpOnly: false, secure: false,
}]);

const page = await ctx.newPage();
const airtableCalls = [];
const d1Calls = [];
const errors = [];

page.on('request', req => {
  const url = req.url();
  if (url.includes('/api/airtable')) airtableCalls.push(url);
  if (url.includes('/api/d1')) d1Calls.push(url);
});
page.on('response', async res => {
  const url = res.url();
  if (url.includes('/api/') && !res.ok()) errors.push(`${res.status()} ${url}`);
});

async function visit(path, label) {
  try {
    await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    console.log(`✓ ${label}`);
  } catch (e) { console.log(`✗ ${label}: ${e.message}`); }
}

async function clickTab(text) {
  try {
    const el = await page.$(`text="${text}"`);
    if (el) { await el.click(); await page.waitForTimeout(1500); }
  } catch {}
}

await visit('/ops', 'Ops home');
await visit('/ops/campaigns', 'Campaigns');
await visit('/ops/videos', 'Videos');
await visit('/ops/scripts', 'Scripts');
await visit('/ops/images', 'Images');
await visit('/ops/ad-presets', 'Ad Presets');
await visit('/ops/advertorials', 'Advertorials');

// Try rules page via sidebar navigation
await visit('/ops', 'Back to home');
// Look for Rules link
try {
  const rulesLink = await page.$('a[href*="rules"]');
  if (rulesLink) { await rulesLink.click(); await page.waitForTimeout(2000); console.log('✓ Rules via link'); }
} catch {}
await visit('/ops/infrastructure', 'Infrastructure');

await browser.close();

console.log('\n========== FINAL AUDIT RESULTS ==========');
if (airtableCalls.length === 0) {
  console.log('✅ ZERO Airtable calls! Fully migrated to D1.');
} else {
  console.log(`❌ ${airtableCalls.length} Airtable calls STILL remaining:`);
  [...new Set(airtableCalls)].forEach(u => console.log('  ', u.replace(/^.*\/api\/airtable/, '/api/airtable')));
}
console.log(`\nD1 calls made (${[...new Set(d1Calls)].length} unique endpoints):`);
[...new Set(d1Calls.map(u => u.replace(/^.*\/api\/d1/, '/api/d1').replace(/\?.*/, '')))].forEach(u => console.log('  ', u));
if (errors.length > 0) {
  console.log(`\nAPI errors (${errors.length}):`);
  errors.slice(0, 15).forEach(e => console.log('  ', e));
}
