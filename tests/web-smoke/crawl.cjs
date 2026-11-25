/**
 * Route crawl smoke test for the exported web build in demo mode.
 * Visits every primary screen, fails on uncaught page errors or React error
 * text, and saves a screenshot per route.
 *
 *   node scripts/serve-web.mjs apps/mobile/dist-web 8089 &
 *   node tests/web-smoke/crawl.cjs <outDir>
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:8089';
const OUT = process.argv[2] || 'test-results/crawl';
const ROUTES = [
  '/', '/tasks', '/guides', '/assistant', '/profile', '/calendar', '/search', '/notifications', '/add',
  '/documents', '/document/new', '/bills', '/bill/new', '/subscriptions', '/subscription/new', '/task/new',
  '/guide/first-job-requirements', '/guide/checklist/first-job-requirements', '/guide/nbi-clearance', '/guide/report/nbi-clearance',
  '/achievements', '/mascots', '/settings/profile', '/settings/appearance', '/settings/notifications', '/settings/privacy',
  '/settings/export', '/settings/delete-account', '/settings/help', '/settings/feedback', '/settings/legal?doc=privacy',
  '/settings/legal?doc=terms', '/settings/about', '/settings/categories', '/welcome', '/auth/sign-in', '/auth/register',
  '/auth/forgot', '/onboarding/personalize', '/onboarding/companion', '/onboarding/reminders', '/onboarding/first-step',
  '/task/does-not-exist', '/assistant/history',
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Manila', locale: 'en-PH' });
  const page = await ctx.newPage();
  let current = '';
  const failures = [];
  page.on('pageerror', (e) => failures.push(`${current}: pageerror ${e.message.slice(0, 300)}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/push token|favicon/i.test(m.text())) failures.push(`${current}: console.error ${m.text().slice(0, 300)}`);
  });
  // Seed the demo database once.
  current = 'seed';
  await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  for (const r of ROUTES) {
    current = r;
    await page.goto(`${BASE}${r}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText();
    if (/Something went wrong|couldn't start|Unmatched Route|This screen doesn't exist/i.test(body) && r !== '/task/does-not-exist') failures.push(`${r}: error text on page`);
    await page.screenshot({ path: path.join(OUT, `${r.replace(/[/?=]/g, '_') || 'root'}.png`) });
  }
  // The deleted-item fallback must render the friendly state.
  await page.goto(`${BASE}/task/does-not-exist`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (!(await page.getByText("This task isn't here anymore").count())) failures.push('/task/does-not-exist: missing safe fallback');
  await browser.close();
  console.log(`Visited ${ROUTES.length} routes`);
  if (failures.length) {
    console.log(failures.join('\n'));
    process.exit(1);
  }
  console.log('No page errors.');
})();
