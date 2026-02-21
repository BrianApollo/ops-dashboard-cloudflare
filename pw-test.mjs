/**
 * Playwright test: Infrastructure page → AdsPower section
 * Mocks Airtable API responses so the tree loads without real credentials.
 */
import { chromium } from 'file:///C:/Users/Jay/AppData/Roaming/npm/node_modules/playwright/index.mjs';
import { createHmac } from 'crypto';
import { readFileSync, mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'C:/Users/Jay/Desktop/Jay/pw-screenshots';
try { mkdirSync(SCREENSHOT_DIR, { recursive: true }); } catch {}

// ── Generate JWT token ────────────────────────────────────────────────────────
const devVars = readFileSync('c:/Users/Jay/Desktop/Jay/ops-dashboard-cloudflare/.dev.vars', 'utf8');
const jwtSecret = devVars.match(/JWT_SECRET=(.+)/)?.[1]?.trim();
if (!jwtSecret) throw new Error('JWT_SECRET not found in .dev.vars');

function generateJwt(payload) {
  const b64url = s => Buffer.from(JSON.stringify(s)).toString('base64url');
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const body = b64url({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 });
  const data = header + '.' + body;
  const sig = createHmac('sha256', jwtSecret).update(data).digest('base64url');
  return data + '.' + sig;
}

const authToken = generateJwt({ id: 'rec_admin', email: 'admin@trustmedia.com', role: 'admin' });
console.log('✅ JWT generated');

// ── Mock Airtable data ────────────────────────────────────────────────────────
const MOCK_PROFILES = {
  records: [
    {
      id: 'recProf001',
      fields: {
        'Profile ID': '101016335663438',
        'Profile Name': 'Charles Drew',
        'Profile Status': 'Active',
        'Permanent Token': 'EAA...',
        'Permanent Token End Date': '2026-06-01',
        'Token Valid': true,
        'Linked BM': [],
        'Linked Pages': [],
        'Last Sync': new Date().toISOString(),
        'Hidden': false,
        'Profile Email': 'charles.drew@example.com',
        'Profile FB Password': '',
        'Profile Email Password': '',
        'Profile 2FA': '',
        'Profile Birth Date': '',
        'Profile Link': '',
        'Profile Review Date': '',
        'Profile Security Email': '',
        'Security Email Password': '',
        'Proxy': '',
        'Profile YouTube Handle': '',
        'UID': '',
        'Profile Gender': '',
        'Profile Location': '',
        'Profile Year Created': '',
        'Linked AdsProfile': '',
      },
    },
    {
      id: 'recProf002',
      fields: {
        'Profile ID': '135725728256356',
        'Profile Name': 'Billah Hakeem',
        'Profile Status': 'Active',
        'Permanent Token': 'EAA...',
        'Permanent Token End Date': '2026-05-15',
        'Token Valid': true,
        'Linked BM': [],
        'Linked Pages': [],
        'Last Sync': new Date().toISOString(),
        'Hidden': false,
        'Linked AdsProfile': '',
      },
    },
  ],
};

const EMPTY_RECORDS = { records: [] };

const MOCK_AUTH_ME = {
  user: { id: 'rec_admin', email: 'admin@trustmedia.com', role: 'admin' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
let stepNum = 0;
async function screenshot(page, label) {
  stepNum++;
  const file = `${SCREENSHOT_DIR}/${String(stepNum).padStart(2, '0')}-${label}.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log(`📸 [${stepNum}] ${label}`);
  return file;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 860 });

  // ── Inject cookie ─────────────────────────────────────────────────────────
  await context.addCookies([{
    name: 'ops_session',
    value: authToken,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Strict',
  }]);

  // ── Mock API routes ───────────────────────────────────────────────────────
  // NOTE: Playwright matches routes LAST-registered FIRST. Register catch-all
  // first so specific routes registered after take priority.
  console.log('[setup] Mocking API routes...');

  // 1. Catch-all: all Airtable tables → empty (registered first = lowest priority)
  await page.route('**/api/airtable/**', route => {
    const path = route.request().url().replace(/^.*\/api\/airtable\//, '').split('?')[0];
    console.log('  → Mock (empty):', path);
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_RECORDS) });
  });

  // 2. Profiles table (registered after = higher priority)
  await page.route('**/api/airtable/tble3Qky3A2j8LpSj**', route => {
    console.log('  → Mock (profiles): tble3Qky3A2j8LpSj');
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PROFILES) });
  });

  // 3. Auth /me (highest priority)
  await page.route('**/api/auth/me', route => {
    console.log('  → Mock: /api/auth/me');
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_ME) });
  });

  // ── Navigate to app and wait for auth to settle ──────────────────────────
  console.log('\n[1] Navigating to app...');
  await page.goto(`${BASE_URL}/ops`, { waitUntil: 'load' });
  // Wait for sidebar to appear (auth settled)
  await page.waitForSelector('text=Infrastructure', { timeout: 10000 });
  console.log('✅ Logged in, sidebar visible. URL:', page.url());
  await screenshot(page, 'app-authenticated');

  // Click Infrastructure sidebar link
  console.log('Clicking Infrastructure...');
  await page.locator('text=Infrastructure').first().click();
  await page.waitForTimeout(4000);
  await screenshot(page, 'infrastructure-loaded');
  console.log('URL:', page.url());

  // ── Wait for profile nodes to appear ─────────────────────────────────────
  console.log('\n[2] Waiting for profile nodes...');
  const charlesLocator = page.locator('text=Charles Drew').first();
  try {
    await charlesLocator.waitFor({ timeout: 10000 });
    console.log('✅ Charles Drew profile node found!');
  } catch {
    console.log('⚠️  Charles Drew not found, checking page state...');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log('Page text (first 500):', bodyText.substring(0, 500));
    await screenshot(page, 'no-profile-debug');
  }

  await screenshot(page, 'tree-loaded');

  // ── Click Charles Drew ────────────────────────────────────────────────────
  console.log('\n[3] Clicking Charles Drew...');
  if (await charlesLocator.count() > 0) {
    await charlesLocator.click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'profile-sidebar-open');
  }

  // ── Check AdsPower section ────────────────────────────────────────────────
  console.log('\n[4] Checking AdsPower section...');
  await page.waitForTimeout(500);

  const adsPowerLocator = page.locator('text=AdsPower').first();
  if (await adsPowerLocator.count() > 0) {
    console.log('✅ AdsPower section is present!');
    await screenshot(page, 'adspower-section-found');

    // Check which state it's in
    const connectBtn = page.locator('button:has-text("Connect"), button:text-is("Connect")').first();
    const hasConnect = await connectBtn.count() > 0;

    if (hasConnect) {
      console.log('✅ "Connect" button visible (not yet linked)');
      await screenshot(page, 'adspower-not-linked');

      // Click Connect to open dropdown
      console.log('\n[5] Clicking Connect...');
      await connectBtn.click();
      await page.waitForTimeout(3000);
      await screenshot(page, 'adspower-connect-panel');

      // Check for error or dropdown
      const errorMsg = await page.locator('text=Could not reach AdsPower').first().count();
      if (errorMsg > 0) {
        console.log('⚠️  AdsPower unreachable (expected if AdsPower is not running)');
        await screenshot(page, 'adspower-unreachable');
      }

      const selectEl = page.locator('.MuiSelect-select').first();
      if (await selectEl.count() > 0) {
        console.log('✅ Dropdown loaded!');
        // Scroll the element into view before clicking
        await selectEl.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await screenshot(page, 'adspower-dropdown-scrolled');
        await selectEl.click({ force: true });
        await page.waitForTimeout(1000);
        await screenshot(page, 'adspower-dropdown-open');

        const options = await page.locator('[role="option"]').all();
        console.log(`Found ${options.length} AdsPower profiles`);
        for (const opt of options.slice(0, 5)) {
          console.log('  -', await opt.innerText().catch(() => '?'));
        }
        await screenshot(page, 'adspower-profiles-listed');
      }
    }
  } else {
    console.log('❌ AdsPower section NOT found');

    // Check if sidebar is open
    const sidebarText = await page.locator('text=Token Status').count();
    if (sidebarText > 0) {
      console.log('Sidebar is open (Token Status found) but no AdsPower section');
      const fullSidebar = await page.locator('[style*="overflow"]').last().innerText().catch(() => 'could not read');
      console.log('Sidebar content:', fullSidebar.substring(0, 800));
    }
    await screenshot(page, 'no-adspower-section');
  }

  // Final screenshot
  await screenshot(page, 'final-state');
  console.log('\n✅ Test complete! Screenshots in:', SCREENSHOT_DIR);

  await page.waitForTimeout(3000);
  await browser.close();
}

main().catch(err => {
  console.error('❌ Test error:', err.message);
  process.exit(1);
});
