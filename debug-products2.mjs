import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const page = await browser.newPage();

const allConsole = [];
const pageErrors = [];

page.on('console', msg => {
  const entry = `[${msg.type()}] ${msg.text()}`;
  allConsole.push(entry);
});
page.on('pageerror', err => {
  pageErrors.push(err.message + '\n' + err.stack);
  console.log('\n*** PAGE ERROR ***\n', err.message, '\n', err.stack?.substring(0, 500));
});

// Go to /ops directly (assume already logged in or handle redirect)
await page.goto('http://127.0.0.1:8788/login');
await page.waitForLoadState('networkidle');

// Check if we're already past login
if (page.url().includes('login')) {
  console.log('On login page, filling credentials...');
  await page.fill('input[type="email"]', 'admin@trustapollo.com').catch(() => {});
  await page.fill('input[name="email"]', 'admin@trustapollo.com').catch(() => {});
  
  const emailFilled = await page.locator('input[type="email"]').count() > 0 || 
                       await page.locator('input[name="email"]').count() > 0;
  
  // Try all input fields
  const inputs = await page.locator('input').all();
  for (const input of inputs) {
    const type = await input.getAttribute('type');
    const name = await input.getAttribute('name');
    console.log(`Found input: type=${type} name=${name}`);
  }
}

await page.screenshot({ path: 'debug-login-page.png' });

// Find and fill the form
const emailInput = page.locator('input').first();
await emailInput.fill('admin@trustapollo.com');
const passwordInput = page.locator('input[type="password"]');
await passwordInput.fill('adf1234');
await page.screenshot({ path: 'debug-filled.png' });

const submitBtn = page.locator('button[type="submit"]');
await submitBtn.click();

// Wait for any navigation
await page.waitForTimeout(3000);
console.log('URL after submit:', page.url());
await page.screenshot({ path: 'debug-after-submit.png' });

// Wait longer for data to load
await page.waitForTimeout(8000);
console.log('URL after wait:', page.url());
await page.screenshot({ path: 'debug-final.png' });

// Get DOM info
const info = await page.evaluate(() => {
  const root = document.getElementById('root');
  return {
    url: window.location.href,
    rootChildCount: root?.childElementCount,
    bodyTextPreview: document.body.innerText.substring(0, 2000),
    hasSpinner: !!document.querySelector('[role="progressbar"]'),
    mainContent: document.querySelector('main')?.innerText?.substring(0, 500) || 
                 document.querySelector('[data-component="products-page"]')?.innerText?.substring(0, 500) ||
                 'no main/products-page found',
  };
});

console.log('\n=== DOM INFO ===');
console.log(JSON.stringify(info, null, 2));

console.log('\n=== ALL CONSOLE (last 30) ===');
allConsole.slice(-30).forEach(m => console.log(m));

console.log('\n=== PAGE ERRORS ===');
pageErrors.forEach(e => console.log(e));

await browser.close();
