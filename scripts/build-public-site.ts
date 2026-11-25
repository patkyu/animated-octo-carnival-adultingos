/**
 * Builds the public static website (apps/web-public/dist):
 *   /                 landing page with disclaimer and links
 *   /privacy          privacy policy   (from apps/mobile/src/content/legal.ts)
 *   /terms            terms of use     (same source)
 *   /delete-account   how to delete an account (no-sign-in accounts are deleted in the app)
 * Links are relative so the site works under a sub-path (GitHub Pages).
 * Also writes docs/privacy/privacy-policy.md and docs/privacy/terms-of-use.md.
 *
 * Run: npx tsx scripts/build-public-site.ts
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CONTACT_EMAIL, PRIVACY_POLICY, SITE_URL, TERMS, type LegalDoc } from '../apps/mobile/src/content/legal';
import { GOVERNMENT_DISCLAIMER } from '../packages/shared/src/disclaimers';

const ROOT = resolve(__dirname, '..');
const OUT = join(ROOT, 'apps/web-public/dist');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `
:root{--teal:#174B49;--mint:#C9F0DF;--ivory:#FAF8F3;--ink:#172B36;--slate:#526575;--line:#E6E1D6;--red:#B42318}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--ivory:#0F1E22;--ink:#EEF3F1;--slate:#A9BAC0;--line:#27424A;--teal:#7FD3B8;--mint:#1F4A44}}
*{box-sizing:border-box}body{margin:0;background:var(--ivory);color:var(--ink);font:16px/1.6 Inter,system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 64px}header{display:flex;align-items:center;gap:10px;padding:16px;max-width:760px;margin:0 auto}
header img{width:36px;height:36px}header a{font-weight:800;font-size:20px;color:var(--ink);text-decoration:none}
h1{font-size:30px;line-height:1.2}h2{font-size:20px;margin-top:28px}a{color:var(--teal)}.muted{color:var(--slate)}
.card{background:rgba(127,127,127,.06);border:1px solid var(--line);border-radius:16px;padding:16px;margin:16px 0}
label{display:grid;gap:6px;font-weight:600}input{font:inherit;padding:12px;border-radius:12px;border:1.5px solid var(--line);background:transparent;color:var(--ink)}
button{font:inherit;font-weight:700;border:0;border-radius:12px;padding:12px 18px;background:var(--teal);color:#fff;min-height:48px;cursor:pointer}
button.danger{background:var(--red)}button:disabled{opacity:.5}.hidden{display:none}footer{font-size:13px;color:var(--slate);margin-top:40px}`;

function page(title: string, body: string, r = '../'): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><link rel="icon" href="${r}icon.png"><style>${CSS}</style></head><body>
<header><img src="${r}icon.png" alt=""><a href="${r || './'}">AdultingOS</a></header><main>${body}
<footer><p>${esc(GOVERNMENT_DISCLAIMER)}</p><p><a href="${r}privacy/">Privacy</a> · <a href="${r}terms/">Terms</a> · <a href="${r}delete-account/">Delete account</a> · <a href="mailto:${CONTACT_EMAIL}">Contact</a></p></footer></main></body></html>`;
}

function legalHtml(d: LegalDoc): string {
  return `<h1>${esc(d.title)}</h1><p class="muted">Version ${esc(d.version)} · Effective ${esc(d.effective)}</p>` +
    d.sections.map((s) => `<h2>${esc(s.heading)}</h2>${s.body.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('');
}
function legalMd(d: LegalDoc): string {
  return `# ${d.title}\n\n_Version ${d.version} · Effective ${d.effective}_\n\n> Generated from apps/mobile/src/content/legal.ts — edit there. Published at ${SITE_URL}/privacy/ and /terms/. Have it reviewed by a lawyer before public launch.\n\n` +
    d.sections.map((s) => `## ${s.heading}\n\n${s.body.join('\n\n')}\n`).join('\n');
}

const DELETE_PAGE = `
<h1>Delete your AdultingOS account</h1>
<p>AdultingOS has no e-mail or password sign-in. Each installation of the app has its own private account, so your account is deleted from inside the app.</p>
<div class="card"><h2>How to delete your account</h2>
<ol><li>Open AdultingOS.</li><li>Go to <b>Profile → Privacy and security → Delete my account</b>.</li><li>Type <b>DELETE</b> and tap <b>Delete my account permanently</b>.</li></ol>
<p>Deletion is immediate. You can also export a copy first: <b>Profile → Export my data</b>.</p></div>
<div class="card"><h2>What is deleted</h2>
<p>Your account, tasks, bills, payments, documents, subscriptions, settings, achievements, consent history and Ask Adu conversations are permanently deleted, along with all AdultingOS data on your phone. We keep a record that a deletion happened (without your identity) and the text of feedback you sent, with your identity removed. Backups are overwritten within 30 days.</p></div>
<div class="card"><h2>If you no longer have the app</h2>
<p>Without the app, nobody can open your account — not even you. Accounts with no activity for 12 months are deleted automatically, with all their data.</p>
<p>For any other privacy or deletion request, e-mail <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p></div>`;

const LANDING = `
<h1>Life is complicated. Adulting shouldn't be.</h1>
<p>AdultingOS keeps bills, document renewals, deadlines and everyday responsibilities in one calm place — with practical, source-linked guides and Adu, your friendly AI adulting buddy.</p>
<img src="feature-graphic.png" alt="AdultingOS logo with mascots Adu, Doki and Piso" style="width:100%;border-radius:16px">
<div class="card"><h2>Important</h2><p>${esc(GOVERNMENT_DISCLAIMER)}</p>
<p>AdultingOS does not process government applications, execute bank transactions, or provide regulated financial services. AI-generated information may be incomplete or inaccurate.</p></div>`;

mkdirSync(join(OUT, 'privacy'), { recursive: true });
mkdirSync(join(OUT, 'terms'), { recursive: true });
mkdirSync(join(OUT, 'delete-account'), { recursive: true });
writeFileSync(join(OUT, 'index.html'), page('AdultingOS', LANDING, ''));
writeFileSync(join(OUT, 'privacy/index.html'), page('AdultingOS Privacy Policy', legalHtml(PRIVACY_POLICY)));
writeFileSync(join(OUT, 'terms/index.html'), page('AdultingOS Terms of Use', legalHtml(TERMS)));
writeFileSync(join(OUT, 'delete-account/index.html'), page('Delete your AdultingOS account', DELETE_PAGE));
writeFileSync(join(OUT, '.nojekyll'), '');
copyFileSync(join(ROOT, 'store/icons/play-store-icon-512.png'), join(OUT, 'icon.png'));
copyFileSync(join(ROOT, 'store/feature-graphic/feature-graphic-1024x500.png'), join(OUT, 'feature-graphic.png'));
mkdirSync(join(ROOT, 'docs/privacy'), { recursive: true });
writeFileSync(join(ROOT, 'docs/privacy/privacy-policy.md'), legalMd(PRIVACY_POLICY));
writeFileSync(join(ROOT, 'docs/privacy/terms-of-use.md'), legalMd(TERMS));
console.log('Public site written to apps/web-public/dist');
