import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 500 });
const page = await browser.newPage();

const errors = [];
const consoleMsgs = [];

page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  consoleMsgs.push(`[${type}] ${text}`);
  if (type === 'error') console.log('CONSOLE ERROR:', text);
});

page.on('pageerror', err => {
  errors.push(err.message);
  console.log('PAGE ERROR:', err.message);
});

console.log('Navigating to login...');
await page.goto('http://127.0.0.1:8788/login');
await page.screenshot({ path: 'debug-ss1-login.png' });

await page.fill('input[type="email"], input[name="email"]', 'admin@trustapollo.com');
await page.fill('input[type="password"], input[name="password"]', 'adf1234');
await page.click('button[type="submit"]');
console.log('Submitted login, waiting for redirect...');

await page.waitForURL('**/ops**', { timeout: 15000 }).catch(() => console.log('No redirect to /ops, URL:', page.url()));
await page.screenshot({ path: 'debug-ss2-after-login.png' });
console.log('URL after login:', page.url());

await page.waitForTimeout(6000);
await page.screenshot({ path: 'debug-ss3-loaded.png' });

const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
console.log('\nPage body text:\n', bodyText);

console.log('\n=== CONSOLE ERRORS ===');
consoleMsgs.filter(m => m.startsWith('[error]')).forEach(m => console.log(m));
console.log('\n=== PAGE ERRORS ===');
errors.forEach(e => console.log(e));

await browser.close();
