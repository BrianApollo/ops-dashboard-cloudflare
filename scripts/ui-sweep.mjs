/** Full-product sweep: render every route, assert expected content, collect errors. */
import { chromium } from 'playwright';
import fs from 'fs';
import crypto from 'crypto';

const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split('\n')
  .filter((l) => l.trim() && !l.startsWith('#'))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const b64u = (s) => Buffer.from(s).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const p = b64u(JSON.stringify({ sub: 'recSHIMTESTADMIN0', email: 'shim-test@accotta.local', role: 'admin', iat: now, exp: now + 7200 }));
const jwt = `${h}.${p}.${crypto.createHmac('sha256', env.JWT_SECRET).update(`${h}.${p}`).digest('base64url')}`;

const BASE = 'https://ops-dashboard-d1-78t.pages.dev';
const PAGES = [
  ['Overview',        '/ops/overview',                      ['Script']],
  ['Products list',   '/ops',                               ['All Products', 'Campaigns', 'Scripts']],
  ['Product detail',  '/ops/products/recPc2e5euNZgdLKo',    ['IgniteX', 'Scripts', 'Videos', 'Campaigns']],
  ['Manage',          '/ops/manage',                        ['Manage']],
  ['Profile Hub',     '/ops/profile-hub',                   ['Profile']],
  ['Schedules',       '/ops/schedules',                     ['Tonight']],
  ['Rules',           '/ops/rules',                         ['Rule']],
  ['Infrastructure',  '/ops/infrastructure',                ['Hailey Simmons']],
  ['Editor portal',   '/videos',                            ['Video']],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
await ctx.addCookies([{ name: 'ops_session', value: jwt, domain: 'ops-dashboard-d1-78t.pages.dev', path: '/', httpOnly: true, secure: true, sameSite: 'Strict' }]);
const page = await ctx.newPage();

let consoleErrors = [];
let failedRequests = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 150)); });
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 150)));
page.on('response', (r) => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url().replace(BASE, '')}`.slice(0, 120)); });

let pass = 0, fail = 0;
for (const [name, path, expects] of PAGES) {
  consoleErrors = []; failedRequests = [];
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(5000);
    const url = page.url();
    const text = await page.evaluate(() => document.body.innerText);
    const missing = expects.filter((e) => !text.includes(e));
    const stayed = url.includes(path) || path === '/ops';
    const problems = [];
    if (!stayed) problems.push(`redirected to ${url}`);
    if (missing.length) problems.push(`missing content: ${missing.join(', ')}`);
    if (consoleErrors.length) problems.push(`console errors: ${consoleErrors.slice(0, 2).join(' | ')}`);
    if (failedRequests.length) problems.push(`failed requests: ${failedRequests.slice(0, 3).join(' | ')}`);
    if (problems.length) { console.log(`FAIL  ${name}: ${problems.join(' ;; ')}`); fail++; }
    else { console.log(`PASS  ${name} (${text.length} chars)`); pass++; }
  } catch (err) {
    console.log(`ERROR ${name}: ${String(err).slice(0, 150)}`);
    fail++;
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
