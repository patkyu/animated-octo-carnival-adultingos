/**
 * Connected journey for no-sign-in accounts, against a web build exported
 * WITH the backend configured (creates one real anonymous account and deletes
 * it again through the app's own Delete account screen).
 *   EXPO_PUBLIC_SUPABASE_URL=… EXPO_PUBLIC_SUPABASE_ANON_KEY=… npx expo export --platform web --output-dir dist-web-connected
 *   node scripts/serve-web.mjs apps/mobile/dist-web-connected 8090 &
 *   SUPABASE_URL=… SUPABASE_ANON_KEY=… NODE_USE_ENV_PROXY=1 \
 *   BASE_URL=http://localhost:8090 node tests/web-smoke/anonymous-account.cjs <outDir>
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8090';
const OUT = process.argv[2] || 'test-results/anonymous';

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Manila' })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const btn = (name) => page.getByRole('button', { name, exact: true }).filter({ visible: true }).last();
  const text = (t) => page.getByText(t).filter({ visible: true }).first();
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const ok = (m) => console.log(`✔ ${m}`);
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await btn('Skip').click();
    await text('No sign-up needed').waitFor();
    await shot('01-get-started');
    ok('Get started screen: no e-mail or password fields');
    if (await page.getByLabel('E-mail').count()) throw new Error('e-mail field shown');
    await btn('Get started').click();
    await page.getByLabel('What should we call you?').filter({ visible: true }).last().fill('Ana');
    await btn('Continue').click();
    await text('Pick your companion').waitFor();
    await btn('Continue').click();
    await text('Friendly reminders').waitFor();
    await btn('Not now').click();
    await text("You're all set, Ana!").waitFor();
    ok('Onboarding finished without any account step');

    await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
    await text('Private account on this phone').waitFor({ timeout: 20000 });
    await text(/^Synced|change.*waiting to sync|Syncing/).waitFor({ timeout: 20000 });
    await shot('02-profile');
    ok('Private account created automatically and syncing');
    if (await btn('Sign out').count()) throw new Error('Sign out shown for a no-sign-in account');
    ok('No "Sign out" for a no-sign-in account');

    await page.goto(`${BASE}/assistant`, { waitUntil: 'networkidle' });
    await text('Review and continue').waitFor({ timeout: 20000 });
    await shot('03-ask-adu');
    ok('Ask Adu reachable without signing in (asks for AI consent first)');

    // Delete the account with the app's own session. Edge Functions only accept
    // allow-listed *web* origins (ALLOWED_WEB_ORIGINS), so this call is made
    // without a browser Origin header — exactly how the Android app calls it.
    const token = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /^sb-.*-auth-token$/.test(k)) return JSON.parse(localStorage.getItem(k)).access_token;
      }
      return null;
    });
    if (!token) throw new Error('no session stored by the app');
    const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/delete-account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE', source: 'in_app' }),
    });
    const body = await res.json();
    if (!body.deleted) throw new Error(`delete-account: ${res.status} ${JSON.stringify(body)}`);
    ok('Account deleted (delete-account function, app session)');
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
    console.log('\nAll anonymous-account checks passed.');
  } catch (e) {
    await shot('failure').catch(() => undefined);
    console.error(`✘ ${e.message}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
