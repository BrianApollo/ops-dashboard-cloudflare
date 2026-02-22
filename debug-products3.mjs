import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 800 });
const page = await browser.newPage();

const pageErrors = [];
const consoleErrors = [];

page.on('pageerror', err => {
  pageErrors.push(err.message);
  console.log('*** PAGE ERROR ***', err.message);
});
page.on('console', msg => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
    console.log('[CONSOLE ERROR]', msg.text());
  }
});

// Login
await page.goto('http://127.0.0.1:8788/login');
await page.waitForLoadState('networkidle');

const inputs = await page.locator('input').all();
for (const inp of inputs) {
  const type = await inp.getAttribute('type');
  const name = await inp.getAttribute('name');
  if (name === 'email' || type === 'email') await inp.fill('admin@trustapollo.com');
  if (type === 'password') await inp.fill('adf1234');
}

await page.screenshot({ path: 'debug3-filled.png' });
await page.click('button[type="submit"]');

// Wait for data to load
await page.waitForTimeout(8000);
await page.screenshot({ path: 'debug3-loaded.png' });

const info = await page.evaluate(() => ({
  url: window.location.href,
  hasSpinner: !!document.querySelector('[role="progressbar"]'),
  productsPagePresent: !!document.querySelector('[data-component="products-page"]'),
  bodyText: document.body.innerText.substring(0, 500),
}));

console.log('\n=== RESULT ===');
console.log(JSON.stringify(info, null, 2));
console.log('Page errors:', pageErrors.length ? pageErrors : 'none');
console.log('Console errors:', consoleErrors.length ? consoleErrors : 'none');

await browser.close();
