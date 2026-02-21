import { chromium } from 'playwright';
import crypto from 'crypto';

// Generate JWT
const secret = '1b7a9fa98b9718c6c557d78884ab49722017024f8bd61968525615adb2716fe9';
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const now = Math.floor(Date.now()/1000);
const payload = Buffer.from(JSON.stringify({sub:'rec_user_001',email:'admin@example.com',role:'Admin',iat:now,exp:now+86400})).toString('base64url');
const sig = crypto.createHmac('sha256',secret).update(header+'.'+payload).digest('base64url');
const token = `${header}.${payload}.${sig}`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

// Inject auth cookie
await context.addCookies([{
  name: 'ops_session',
  value: token,
  domain: 'localhost',
  path: '/',
  httpOnly: true,
}]);

const page = await context.newPage();

// Track all API requests
const apiCalls = [];
page.on('request', req => {
  const url = req.url();
  if (url.includes('/api/')) {
    apiCalls.push({ method: req.method(), url: url.replace('http://localhost:5174', '') });
  }
});

page.on('response', res => {
  const url = res.url();
  if (url.includes('/api/')) {
    const entry = apiCalls.find(c => url.includes(c.url));
    if (entry) entry.status = res.status();
  }
});

// Navigate to products page
await page.goto('http://localhost:5174/ops/products');
await page.waitForTimeout(5000);

// Check for product dropdown text
let dropdownText = 'not found';
try {
  dropdownText = await page.locator('[data-testid="product-select"], .MuiSelect-select').first().textContent({ timeout: 3000 });
} catch {}

// Check network panel
console.log('=== API CALLS ===');
for (const call of apiCalls) {
  console.log(`${call.status || '???'} ${call.method} ${call.url}`);
}
console.log('=== PRODUCT DROPDOWN ===');
console.log(dropdownText);

// Take screenshot
await page.screenshot({ path: '/c/Users/Jay/Desktop/Jay/ops-dashboard-cloudflare/pw-diag-screenshot.png' });
console.log('=== SCREENSHOT SAVED ===');

await browser.close();
