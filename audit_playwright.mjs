import { chromium } from 'playwright';
import { readFileSync } from 'fs';

// Read JWT_SECRET from .dev.vars - use Windows-compatible path for Node
let jwtSecret = 'dev-secret';
try {
  const devVars = readFileSync('C:/Users/Jay/Desktop/Jay/ops-dashboard-cloudflare/.dev.vars', 'utf8');
  const match = devVars.match(/JWT_SECRET\s*=\s*["']?([^"'\n]+)["']?/);
  if (match) jwtSecret = match[1].trim();
  console.log('Read .dev.vars successfully');
} catch (e) {
  console.log('Could not read .dev.vars:', e.message);
}
console.log('JWT secret length:', jwtSecret.length);
console.log('JWT secret preview:', jwtSecret.slice(0, 8) + '...');

// Replicate EXACTLY the server's base64UrlEncode (uses btoa on raw binary string)
function base64UrlEncode(str) {
  // btoa equivalent in Node using binary/latin1 encoding
  const buf = Buffer.from(str, 'binary');
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makeJwt(secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    sub: 'test-user-id',
    email: 'jay@example.com',
    role: 'Admin',
    iat: now,
    exp: now + 3600
  }));

  const data = `${header}.${payload}`;

  // Use Web Crypto API (same as server) - available in Node 15+
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', keyMaterial, encoder.encode(data));

  // Match server: base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))
  const sigBytes = new Uint8Array(sigBuffer);
  let binaryString = '';
  for (const b of sigBytes) binaryString += String.fromCharCode(b);
  const sig = base64UrlEncode(binaryString);

  return `${data}.${sig}`;
}

const jwt = await makeJwt(jwtSecret);
console.log('JWT created, length:', jwt.length);

// Quick sanity check - verify against server before full audit
const testRes = await fetch('http://localhost:5173/api/auth/me', {
  headers: { Cookie: `ops_session=${jwt}` }
});
console.log('Auth check status:', testRes.status);
if (testRes.ok) {
  const body = await testRes.json();
  console.log('Auth check user:', JSON.stringify(body.user));
} else {
  const body = await testRes.text();
  console.log('Auth check body:', body);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addCookies([{
  name: 'ops_session',
  value: jwt,
  domain: 'localhost',
  path: '/',
  httpOnly: false,
  secure: false,
}]);

const page = await ctx.newPage();
const airtableCalls = [];
const d1Calls = [];
const otherApiCalls = [];
const errors = [];

page.on('request', req => {
  const url = req.url();
  if (url.includes('/api/airtable')) airtableCalls.push({ url, method: req.method() });
  else if (url.includes('/api/d1')) d1Calls.push({ url, method: req.method() });
  else if (url.includes('/api/')) otherApiCalls.push({ url, method: req.method() });
});

page.on('response', async res => {
  const url = res.url();
  if (url.includes('/api/') && !res.ok()) {
    errors.push(`${res.status()} ${res.request().method()} ${url}`);
  }
});

async function visitAndWait(path, label) {
  console.log(`\n=== Visiting ${label} (${path}) ===`);
  try {
    await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    console.log(`  Final URL: ${finalUrl}`);
  } catch (e) {
    console.log(`  Error loading ${label}: ${e.message}`);
  }
}

async function clickIfExists(selector, label) {
  try {
    const el = await page.$(selector);
    if (el) {
      await el.click();
      await page.waitForTimeout(2000);
      const finalUrl = page.url();
      console.log(`  Clicked: ${label} -> ${finalUrl}`);
    } else {
      console.log(`  Not found: ${label}`);
    }
  } catch (e) {
    console.log(`  Error clicking ${label}: ${e.message}`);
  }
}

// Navigate all main sections
await visitAndWait('/ops', 'Ops home');
await visitAndWait('/ops/campaigns', 'Campaigns');
await visitAndWait('/ops/videos', 'Videos');
await visitAndWait('/ops/scripts', 'Scripts');
await visitAndWait('/ops/images', 'Images');
await visitAndWait('/ops/ad-presets', 'Ad Presets');
await visitAndWait('/ops/advertorials', 'Advertorials');

// Try infrastructure via sidebar click
await visitAndWait('/ops', 'Back to ops');
await clickIfExists('a[href*="infrastructure"]', 'Infrastructure link');
await clickIfExists('a[href*="rules"]', 'Rules link');

await browser.close();

console.log('\n========== AUDIT RESULTS ==========');

console.log(`\nAirtable calls (${airtableCalls.length}):`);
const airtableUniq = [...new Set(airtableCalls.map(c => `${c.method} ${c.url.replace(/^.*\/api\/airtable/, '/api/airtable').replace(/\?.*/, '')}`))] ;
airtableUniq.forEach(u => console.log('  ', u));

console.log(`\nD1 calls (${d1Calls.length}):`);
const d1Uniq = [...new Set(d1Calls.map(c => `${c.method} ${c.url.replace(/^.*\/api\/d1/, '/api/d1').replace(/\?.*/, '')}`))] ;
d1Uniq.forEach(u => console.log('  ', u));

console.log(`\nOther API calls (${otherApiCalls.length} total, ${[...new Set(otherApiCalls.map(c => c.url.replace(/\?.*/, '')))].length} unique):`);
const otherUniq = [...new Set(otherApiCalls.map(c => `${c.method} ${c.url.replace(/^http:\/\/localhost:\d+/, '').replace(/\?.*/, '')}`))] ;
otherUniq.forEach(u => console.log('  ', u));

console.log(`\nErrors (${errors.length}):`);
errors.slice(0, 30).forEach(e => console.log('  ', e));

console.log('\n=== SUMMARY ===');
if (airtableCalls.length === 0) {
  console.log('ZERO Airtable calls detected. All data appears served from D1.');
} else {
  console.log(`${airtableCalls.length} Airtable calls remaining:`);
  airtableCalls.slice(0, 30).forEach(c => console.log('   ', c.method, c.url.replace(/^.*\/api\/airtable/, '/api/airtable')));
}
