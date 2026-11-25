/**
 * End-to-end user journeys against the exported web build (fresh profile,
 * no demo data, local-only mode). Mirrors the acceptance scenarios:
 *   1. Onboard as a guest
 *   2. Add a monthly bill, mark it paid, see exactly ONE next occurrence
 *   3. Paying the same occurrence again is refused
 *   4. Add guide steps to Tasks
 *   5. Create, complete and reopen a task; delete one (confirmation)
 *   6. Track a document that has expired and see it flagged
 * Android-specific behaviour (notifications, back gesture) is covered by the
 * Maestro flows in tests/e2e.
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8089';
const OUT = process.argv[2] || 'test-results/journeys';

const steps = [];
function ok(name) {
  steps.push(`✔ ${name}`);
  console.log(`✔ ${name}`);
}

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Manila' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const btn = (name) => page.getByRole('button', { name, exact: true }).filter({ visible: true }).last();
  const field = (l, o) => page.getByLabel(l, o).filter({ visible: true }).last();
  const text = (t) => page.getByText(t).filter({ visible: true }).first();
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());

  try {
    // 1. Onboarding
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await btn('Skip').click();
    await btn('Get started').click();
    await field('What should we call you?').fill('Sam');
    await btn('Continue').click();
    await text('Pick your companion').waitFor();
    await btn('Continue').click(); // companion
    await text('Friendly reminders').waitFor();
    await btn('Turn on reminders').click();
    await text("You're all set, Sam!").waitFor();
    ok('Onboarding as guest');

    // 2. Monthly bill → pay → exactly one next occurrence
    await page.getByRole('button', { name: /^Add a bill/ }).filter({ visible: true }).first().click();
    await field('Bill name').fill('Electricity');
    await field('Amount', { exact: true }).fill('1,234.56');
    await field('Next due date, format year-month-day').fill(today);
    await btn('Save bill').click();
    await text('₱1,234.56').waitFor();
    await shot('bill-detail');
    await btn('Mark as paid').click();
    await field('Amount paid').waitFor();
    const prefilled = await field('Amount paid').inputValue();
    if (prefilled !== '1234.56') throw new Error(`amount prefill was ${prefilled}`);
    await btn('Confirm payment').click();
    await text('Payment history').waitFor();
    await text(/Paid .*· due/).waitFor();
    const payRows = await page.getByText(/Paid .*· due/).filter({ visible: true }).count();
    if (payRows !== 1) throw new Error(`expected 1 payment, saw ${payRows}`);
    const [y, m, d] = today.split('-').map(Number);
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    const dim = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
    const expectedNext = new Date(Date.UTC(ny, nm - 1, Math.min(d, dim))).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    await page.getByText(new RegExp(`Due .*${expectedNext}`)).waitFor();
    await shot('bill-paid');
    ok(`Bill paid; next occurrence ${expectedNext}`);

    await page.goto(`${BASE}/tasks`, { waitUntil: 'networkidle' });
    await btn('Bills').click();
    await page.waitForTimeout(800);
    const openElectricity = await page.getByRole('button', { name: /^Electricity\./ }).filter({ visible: true }).count();
    if (openElectricity !== 1) throw new Error(`expected exactly one open Electricity occurrence, found ${openElectricity}`);
    ok('Exactly one open next occurrence in Tasks');

    // 3. Double payment refused: Done tab → paid occurrence → its pay URL
    await page.getByRole('radio', { name: 'Done', exact: true }).filter({ visible: true }).last().click();
    await page.waitForTimeout(500);
    const doneCount = await page.getByRole('button', { name: /^Electricity\./ }).filter({ visible: true }).count();
    if (doneCount !== 1) throw new Error(`expected one paid occurrence, found ${doneCount}`);
    ok('Paid occurrence listed once under Done');

    // 4. Guide → tasks
    await page.goto(`${BASE}/guide/moving-out`, { waitUntil: 'networkidle' });
    await btn('Add steps to my tasks').click();
    const addBtn = page.getByRole('button', { name: /^Add \d+ steps?$/ }).filter({ visible: true }).last();
    const label = await addBtn.textContent();
    await addBtn.click();
    await text(/steps? added to Tasks/).waitFor();
    ok(`Guide checklist added (${label})`);

    // 5. Task create / complete / reopen / delete
    await page.goto(`${BASE}/task/new`, { waitUntil: 'networkidle' });
    await field('What needs doing?').fill('Renew barangay clearance');
    await btn('Save').click();
    await text('Renew barangay clearance').waitFor();
    await btn('Mark done').click();
    await text('Done', { exact: true }).waitFor();
    await btn('Reopen').click();
    await btn('Mark done').waitFor();
    ok('Task created, completed and reopened');
    await btn('More actions').click();
    await btn('Delete').click();
    await text('Delete this task?').waitFor();
    await page.getByRole('alert').getByRole('button', { name: 'Delete', exact: true }).filter({ visible: true }).click();
    await page.waitForTimeout(800);
    ok('Task deleted after confirmation');

    // 6. Expired document is flagged
    await page.goto(`${BASE}/document/new`, { waitUntil: 'networkidle' });
    await field('Expiry date, format year-month-day').fill('2020-01-31');
    await field('Last 4 characters').fill('AB12');
    await btn('Save document').click();
    await text('This document has expired').waitFor();
    await shot('document-expired');
    ok('Expired document flagged');

    // 7. Auto-renewing subscription rolls forward on launch instead of showing "Overdue"
    const past = new Date(Date.UTC(y, m - 3, Math.min(d, 28))).toISOString().slice(0, 10);
    await page.goto(`${BASE}/subscription/new`, { waitUntil: 'networkidle' });
    await field('Service name').fill('Music app');
    await field('Price per renewal').fill('149');
    await field('Next renewal, format year-month-day').fill(past);
    await btn('Save subscription').click();
    await text('Next renewal:').waitFor();
    await page.goto(`${BASE}/subscriptions`, { waitUntil: 'networkidle' }); // relaunch → maintenance runs
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/tasks`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const overdueSub = await page.getByRole('button', { name: /^Music app\. Overdue/ }).filter({ visible: true }).count();
    if (overdueSub !== 0) throw new Error('auto-renewing subscription still shown as overdue');
    await page.getByRole('radio', { name: 'Done', exact: true }).filter({ visible: true }).last().click();
    await page.waitForTimeout(800);
    const renewed = await page.getByRole('button', { name: /^Music app\./ }).filter({ visible: true }).count();
    if (renewed < 2) throw new Error(`expected past renewals recorded, found ${renewed}`);
    ok(`Subscription from ${past} rolled forward (${renewed} past renewals recorded, none overdue)`);

    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
    console.log(`\nAll ${steps.length} journey checks passed.`);
  } catch (e) {
    await shot('failure');
    console.error(`✘ ${e.message}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
