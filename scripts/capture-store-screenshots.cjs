/**
 * Store screenshot campaign: captures REAL screens of the working app (web
 * renderer, demo environment with synthetic data) and composes 1080×1920
 * marketing frames with captions.
 *
 * Before submission, re-capture the raw screens from the Android build on a
 * device/emulator (same routes, demo build) — see store/screenshots/README.md.
 *
 *   node scripts/serve-web.mjs apps/mobile/dist-web 8089 &
 *   node scripts/capture-store-screenshots.cjs
 *
 * Screenshot 6 (Ask Adu) is a REAL answer from the live backend: set
 * CONNECTED_BASE to a web build exported with the backend configured, plus
 * SUPABASE_URL / SUPABASE_ANON_KEY. A throwaway no-sign-in account is created
 * and deleted afterwards. The browser's Ask Adu call is relayed without a
 * browser Origin header (exactly how the Android app calls it), because Edge
 * Functions only accept allow-listed web origins.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://localhost:8089';
const RAW = path.join(ROOT, 'store/screenshots/raw');
const OUT = path.join(ROOT, 'store/screenshots/phone');

const SHOTS = [
  { n: 1, route: '/', title: 'Adulting, made simpler', sub: 'Your day, your deadlines and your buddy Adu — in one calm place.', bg: '#C9F0DF' },
  { n: 2, route: '/tasks', title: 'Keep track of everything', sub: 'Tasks, bills and repeats, sorted by what needs you first.', bg: '#DCEBFA' },
  { n: 3, route: '/documents', title: 'Never forget a renewal', sub: 'Doki reminds you 90, 30 and 7 days before IDs expire.', bg: '#E6E1F8' },
  { n: 4, route: '/bills', title: 'Make bills less stressful', sub: 'Piso tracks due dates and what you’ve paid. You enter the amounts.', bg: '#FFDCC8' },
  { n: 5, route: '/guide/first-job-requirements', title: 'Know what to do next', sub: 'Step-by-step checklists you can add to your tasks.', bg: '#E6E1F8' },
  { n: 6, title: 'Meet your AI adulting buddy', sub: 'Ask Adu explains, builds checklists and says when it can’t verify.', bg: '#C9F0DF', live: true },
  { n: 7, route: '/calendar', title: 'Plan ahead', sub: 'Month, week and agenda views with gentle reminders.', bg: '#DCEBFA' },
  { n: 8, route: '/mascots', title: 'Make adulting your own', sub: 'Pick your companion from the Adulting Buddies.', bg: '#FFF1C2' },
];

const font = (pkg, file) => fs.readFileSync(path.join(ROOT, 'node_modules/@expo-google-fonts', pkg, file)).toString('base64');
const FONTS = `@font-face{font-family:PJS;font-weight:800;src:url(data:font/ttf;base64,${font('plus-jakarta-sans', '800ExtraBold/PlusJakartaSans_800ExtraBold.ttf')})}
@font-face{font-family:Inter;font-weight:500;src:url(data:font/ttf;base64,${font('inter', '500Medium/Inter_500Medium.ttf')})}`;

(async () => {
  fs.mkdirSync(RAW, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, timezoneId: 'Asia/Manila', locale: 'en-PH' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  for (const s of SHOTS.filter((x) => !x.live)) {
    await page.goto(`${BASE}${s.route}`, { waitUntil: 'networkidle' });
    // Hide the "DEMO" badge only in marketing frames (data is synthetic either way).
    await page.addStyleTag({ content: '[aria-label="Demo mode with sample data"]{display:none!important}' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(RAW, `${s.n}.png`) });
  }
  if (process.env.CONNECTED_BASE) await captureAskAdu(browser);
  const frame = await ctx.newPage();
  await frame.setViewportSize({ width: 1080, height: 1920 });
  for (const s of SHOTS) {
    if (!fs.existsSync(path.join(RAW, `${s.n}.png`))) { console.log(`skip ${s.n} (no capture)`); continue; }
    const img = fs.readFileSync(path.join(RAW, `${s.n}.png`)).toString('base64');
    await frame.setContent(`<!doctype html><html><head><style>${FONTS}
      body{margin:0;width:1080px;height:1920px;background:${s.bg};font-family:Inter;overflow:hidden}
      .cap{padding:110px 80px 0;text-align:left}
      h1{font-family:PJS;font-weight:800;font-size:84px;line-height:1.05;margin:0;color:#172B36;letter-spacing:-1px}
      p{font-size:38px;line-height:1.35;color:#174B49;margin:28px 0 0}
      .phone{position:absolute;left:150px;top:560px;width:780px;height:1560px;border-radius:72px;background:#172B36;padding:18px;box-shadow:0 40px 80px rgba(23,43,54,.25)}
      .phone img{width:744px;height:1488px;border-radius:56px;display:block;object-fit:cover;object-position:top}
      </style></head><body><div class="cap"><h1>${s.title}</h1><p>${s.sub}</p></div>
      <div class="phone"><img src="data:image/png;base64,${img}"></div></body></html>`);
    await frame.evaluate(() => document.fonts.ready);
    await frame.screenshot({ path: path.join(OUT, `${String(s.n).padStart(2, '0')}-${s.title.toLowerCase().replace(/[^a-z]+/g, '-')}.png`) });
  }
  await browser.close();
  console.log('Wrote screenshots to store/screenshots/phone');
})();

async function captureAskAdu(browser) {
  const B = process.env.CONNECTED_BASE;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, timezoneId: 'Asia/Manila', locale: 'en-PH' });
  const page = await ctx.newPage();
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
  await page.route('**/functions/v1/ask-adu', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const headers = { ...req.headers() };
    delete headers.origin;
    delete headers.referer;
    const res = await fetch(req.url(), { method: 'POST', headers, body: req.postData() });
    return route.fulfill({ status: res.status, headers: { 'content-type': 'application/json', ...cors }, body: await res.text() });
  });
  const btn = (name) => page.getByRole('button', { name, exact: true }).filter({ visible: true }).last();
  const text = (t) => page.getByText(t).filter({ visible: true }).first();
  await page.goto(B, { waitUntil: 'networkidle' });
  await btn('Skip').click();
  await btn('Get started').click();
  await page.getByLabel('What should we call you?').filter({ visible: true }).last().fill('Sam');
  await btn('Continue').click();
  await text('Pick your companion').waitFor();
  await btn('Continue').click();
  await text('Friendly reminders').waitFor();
  await btn('Not now').click();
  await page.goto(`${B}/assistant`, { waitUntil: 'networkidle' });
  await btn('Review and continue').click({ timeout: 30000 });
  await btn('I understand — continue').click();
  await text('Try asking').waitFor({ timeout: 20000 });
  await page.getByText('How do I prepare for moving out?').filter({ visible: true }).first().click();
  await text('Review and choose').waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
  // Show the start of the answer (question + reply), not the end of the thread.
  await page.evaluate(() => document.querySelectorAll('div').forEach((d) => { if (d.scrollHeight > d.clientHeight + 40 && getComputedStyle(d).overflowY !== 'visible') d.scrollTop = 0; }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(RAW, '6.png') });
  const token = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sb-.*-auth-token$/.test(k)) return JSON.parse(localStorage.getItem(k)).access_token;
    }
    return null;
  });
  const del = await fetch(`${process.env.SUPABASE_URL}/functions/v1/delete-account`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: 'DELETE', source: 'in_app' }),
  }).then((r) => r.json());
  console.log(`Ask Adu captured; throwaway account deleted: ${del.deleted === true}`);
  await ctx.close();
}
