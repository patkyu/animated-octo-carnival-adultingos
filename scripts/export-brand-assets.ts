/**
 * Renders the brand system to files:
 *   assets/branding/*            logo symbol, wordmarks (SVG + PNG)
 *   assets/mascots/<id>/*        every expression/pose/view (SVG) + key PNGs
 *   assets/illustrations/*       empty / error / offline / success scenes
 *   apps/mobile/assets/*         launcher, adaptive, monochrome, splash, favicon
 *   store/icons, store/feature-graphic
 *   docs/branding/contact-sheet.png  visual review sheet
 *
 * Run: npx tsx scripts/export-brand-assets.ts
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import {
  EXPRESSIONS, MASCOTS, MASCOT_IDS, POSES, VIEWS, el, g, logoSymbol, logoSymbolGroup, mascotSvg, palette, sceneSvg,
  svgDocument, toSvgString, type SvgNode,
} from '../packages/brand/src/index';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright') as typeof import('playwright');
const ROOT = resolve(__dirname, '..');

const fontB64 = (pkg: string, file: string) =>
  readFileSync(join(ROOT, 'node_modules/@expo-google-fonts', pkg, file)).toString('base64');
const FONT_CSS = `
@font-face { font-family: 'Plus Jakarta Sans'; font-weight: 800; src: url(data:font/ttf;base64,${fontB64('plus-jakarta-sans', '800ExtraBold/PlusJakartaSans_800ExtraBold.ttf')}) format('truetype'); }
@font-face { font-family: 'Plus Jakarta Sans'; font-weight: 600; src: url(data:font/ttf;base64,${fontB64('plus-jakarta-sans', '600SemiBold/PlusJakartaSans_600SemiBold.ttf')}) format('truetype'); }
@font-face { font-family: 'Inter'; font-weight: 500; src: url(data:font/ttf;base64,${fontB64('inter', '500Medium/Inter_500Medium.ttf')}) format('truetype'); }
`;

function write(path: string, content: string | Buffer) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

const svg = (n: SvgNode) => `<?xml version="1.0" encoding="UTF-8"?>\n${toSvgString(n)}\n`;
const inner = (n: SvgNode) => (n.c ?? []).map((c) => toSvgString(c)).join('\n');

/* ---------------- Wordmarks (text converted at render time with embedded font) ---------------- */
function wordmark(layout: 'horizontal' | 'stacked', theme: 'light' | 'dark'): SvgNode {
  const text = theme === 'light' ? palette.ink : palette.warmIvory;
  const os = theme === 'light' ? palette.deepTeal : palette.softMint;
  const variant = theme === 'light' ? 'color' : 'onDark';
  const word = (x: number, y: number, size: number, anchor: string): SvgNode => ({
    t: 'text',
    p: { x, y, fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', fontWeight: 800, fontSize: size, fill: text, textAnchor: anchor, letterSpacing: -1 },
    text: 'Adulting',
  });
  if (layout === 'horizontal') {
    return svgDocument('0 0 465 120', [
      logoSymbolGroup(variant, 'translate(0 0)'),
      { t: 'text', p: { x: 136, y: 80, fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', fontWeight: 800, fontSize: 58, fill: text, letterSpacing: -1 }, text: 'Adulting' },
      { t: 'text', p: { x: 374, y: 80, fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', fontWeight: 600, fontSize: 58, fill: os, letterSpacing: -1 }, text: 'OS' },
    ]);
  }
  return svgDocument('0 0 400 250', [
    logoSymbolGroup(variant, 'translate(140 0)'),
    { t: 'text', p: { x: 200, y: 200, fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', fontWeight: 800, fontSize: 52, fill: text, textAnchor: 'middle', letterSpacing: -1 }, text: 'AdultingOS' },
    { t: 'text', p: { x: 200, y: 236, fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 17, fill: theme === 'light' ? palette.slate : palette.softMint, textAnchor: 'middle' }, text: "Life is complicated. Adulting shouldn't be." },
  ]);
}

/* ---------------- Icon compositions ---------------- */
// Full-bleed launcher icon (legacy + iOS + Play source): teal square, glyph centred.
const launcherIcon = svgDocument('0 0 1024 1024', [
  el('rect', { width: 1024, height: 1024, fill: palette.deepTeal }),
  g({ transform: 'translate(132 132) scale(6.333)' }, logoSymbol('glyph').c ?? []),
]);
// Adaptive foreground: art must sit inside the 66% safe zone (≈ 676px of 1024).
const adaptiveForeground = svgDocument('0 0 1024 1024', [
  g({ transform: 'translate(272 272) scale(4)' }, logoSymbol('glyph').c ?? []),
]);
const adaptiveMonochrome = svgDocument('0 0 1024 1024', [
  g({ transform: 'translate(272 272) scale(4)' }, logoSymbol('glyphMono', '#000000').c ?? []),
]);
const splashIcon = svgDocument('0 0 1024 1024', [g({ transform: 'translate(212 212) scale(5)' }, logoSymbol('color').c ?? [])]);
const playIcon = svgDocument('0 0 512 512', [
  el('rect', { width: 512, height: 512, fill: palette.deepTeal }),
  g({ transform: 'translate(66 66) scale(3.1667)' }, logoSymbol('glyph').c ?? []),
]);

function featureGraphic(): string {
  const m = (id: 'adu' | 'doki' | 'piso', t: string, expr: 'happy' | 'excited' | 'neutral', pose: 'wave' | 'hold' | 'idle') =>
    `<g transform="${t}">${inner(mascotSvg(id, { expression: expr, pose }))}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
  <rect width="1024" height="500" fill="${palette.warmIvory}"/>
  <circle cx="790" cy="250" r="230" fill="${palette.softMint}"/>
  <circle cx="1010" cy="40" r="90" fill="${palette.lavender}"/>
  <circle cx="610" cy="470" r="70" fill="${palette.peach}"/>
  <g opacity="0.9">
    <rect x="640" y="70" width="70" height="70" rx="16" fill="#fff" stroke="${palette.softBlueDeep}" stroke-width="4"/>
    <rect x="640" y="70" width="70" height="20" rx="8" fill="${palette.softBlueDeep}"/>
    <path d="M 660 115 l 9 9 l 20 -20" fill="none" stroke="${palette.deepTeal}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  ${m('doki', 'translate(555 235) scale(1.1)', 'happy', 'hold')}
  ${m('adu', 'translate(655 115) scale(1.5)', 'happy', 'wave')}
  ${m('piso', 'translate(790 262) scale(0.95)', 'excited', 'hold')}
  <g transform="translate(64 120) scale(0.9)">${inner(logoSymbol('color'))}</g>
  <text x="180" y="196" font-family="Plus Jakarta Sans" font-weight="800" font-size="56" fill="${palette.ink}" letter-spacing="-1">Adulting<tspan fill="${palette.deepTeal}" font-weight="600">OS</tspan></text>
  <text x="64" y="300" font-family="Plus Jakarta Sans" font-weight="800" font-size="38" fill="${palette.ink}">Life is complicated.</text>
  <text x="64" y="348" font-family="Plus Jakarta Sans" font-weight="800" font-size="38" fill="${palette.deepTeal}">Adulting shouldn't be.</text>
</svg>`;
}

async function main() {
  // ---- SVG files ----
  write('assets/branding/logo-symbol.svg', svg(logoSymbol('color')));
  write('assets/branding/logo-symbol-on-dark.svg', svg(logoSymbol('onDark')));
  write('assets/branding/logo-symbol-mono-teal.svg', svg(logoSymbol('mono', palette.deepTeal)));
  write('assets/branding/logo-symbol-mono-black.svg', svg(logoSymbol('mono', '#000000')));
  write('assets/branding/logo-symbol-mono-white.svg', svg(logoSymbol('mono', '#FFFFFF')));
  const wordmarks = {
    'wordmark-horizontal-light': wordmark('horizontal', 'light'),
    'wordmark-horizontal-dark': wordmark('horizontal', 'dark'),
    'logo-stacked-light': wordmark('stacked', 'light'),
    'logo-stacked-dark': wordmark('stacked', 'dark'),
  };
  for (const [name, node] of Object.entries(wordmarks)) write(`assets/branding/${name}.svg`, svg(node));

  let count = 0;
  for (const id of MASCOT_IDS) {
    for (const view of VIEWS) {
      write(`assets/mascots/${id}/turnaround/${id}-${view}.svg`, svg(mascotSvg(id, { view })));
      count++;
    }
    for (const expression of EXPRESSIONS) {
      for (const pose of POSES) {
        write(`assets/mascots/${id}/${id}-${expression}-${pose}.svg`, svg(mascotSvg(id, { expression, pose })));
        count++;
      }
    }
    for (const kind of ['empty', 'error', 'offline', 'success'] as const) {
      write(`assets/illustrations/${id}-${kind}.svg`, svg(sceneSvg(id, kind)));
      count++;
    }
  }

  // ---- PNG renders ----
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  async function png(markup: string, w: number, h: number, out: string, opts: { background?: string; omitBackground?: boolean } = {}) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(
      `<!doctype html><html><head><style>${FONT_CSS} html,body{margin:0;padding:0;background:${opts.background ?? 'transparent'}} svg{display:block;width:${w}px;height:${h}px}</style></head><body>${markup}</body></html>`,
    );
    await page.evaluate(() => document.fonts.ready);
    const buf = await page.screenshot({ omitBackground: opts.omitBackground ?? !opts.background, type: 'png' });
    write(out, buf);
  }
  const s = (n: SvgNode) => toSvgString(n);

  await png(s(logoSymbol('color')), 1024, 1024, 'assets/branding/logo-symbol-1024.png');
  await png(s(logoSymbol('onDark')), 1024, 1024, 'assets/branding/logo-symbol-on-dark-1024.png');
  await png(s(wordmarks['wordmark-horizontal-light']), 1395, 360, 'assets/branding/wordmark-horizontal-light.png');
  await png(s(wordmarks['wordmark-horizontal-dark']), 1395, 360, 'assets/branding/wordmark-horizontal-dark.png', { background: palette.deepTeal });
  await png(s(wordmarks['logo-stacked-light']), 1200, 750, 'assets/branding/logo-stacked-light.png');
  await png(s(wordmarks['logo-stacked-dark']), 1200, 750, 'assets/branding/logo-stacked-dark.png', { background: palette.deepTeal });

  // App icons (Expo config consumes these)
  await png(s(launcherIcon), 1024, 1024, 'apps/mobile/assets/icon.png', { background: palette.deepTeal });
  await png(s(adaptiveForeground), 1024, 1024, 'apps/mobile/assets/adaptive-icon.png');
  await png(s(adaptiveMonochrome), 1024, 1024, 'apps/mobile/assets/adaptive-icon-monochrome.png');
  await png(s(splashIcon), 1024, 1024, 'apps/mobile/assets/splash-icon.png');
  await png(s(launcherIcon), 196, 196, 'apps/mobile/assets/favicon.png', { background: palette.deepTeal });
  await png(s(adaptiveForeground), 432, 432, 'assets/icons/adaptive-foreground-432.png');
  await png(s(adaptiveMonochrome), 432, 432, 'assets/icons/adaptive-monochrome-432.png');
  write('assets/icons/adaptive-background.txt', `Adaptive icon background colour: ${palette.deepTeal}\n`);

  // Play Store
  await png(s(playIcon), 512, 512, 'store/icons/play-store-icon-512.png', { background: palette.deepTeal });
  await png(featureGraphic(), 1024, 500, 'store/feature-graphic/feature-graphic-1024x500.png', { background: palette.warmIvory });
  write('store/feature-graphic/feature-graphic-1024x500.svg', featureGraphic());

  // Key mascot PNGs for marketing / stickers (transparent)
  for (const id of MASCOT_IDS) {
    for (const expression of EXPRESSIONS) {
      await png(s(mascotSvg(id, { expression, pose: expression === 'happy' ? 'wave' : 'idle' })), 600, 600, `assets/mascots/${id}/png/${id}-${expression}.png`);
    }
  }

  // Contact sheet: every mascot × expression, poses, views, scenes, logos.
  const cell = (n: SvgNode, label: string, w = 150, h = 150) =>
    `<figure style="margin:0;width:${w}px;text-align:center"><div style="width:${w}px;height:${h}px">${toSvgString({ ...n, p: { ...n.p, width: w, height: h } })}</div><figcaption>${label}</figcaption></figure>`;
  const rows = MASCOT_IDS.map(
    (id) => `<section><h2>${MASCOTS[id].name} — ${MASCOTS[id].role} · “${MASCOTS[id].phrase}”</h2><div class="row">
      ${EXPRESSIONS.map((e) => cell(mascotSvg(id, { expression: e }), e)).join('')}
      ${cell(mascotSvg(id, { pose: 'wave', expression: 'happy' }), 'wave')}
      ${cell(mascotSvg(id, { pose: 'hold', expression: 'neutral' }), 'hold')}
      ${VIEWS.slice(1).map((v) => cell(mascotSvg(id, { view: v }), v)).join('')}
      ${cell(sceneSvg(id, 'empty'), 'empty state', 172, 150)}
      ${cell(sceneSvg(id, 'error'), 'error state', 172, 150)}
    </div></section>`,
  ).join('');
  const logos = `<section><h2>Logo system</h2><div class="row">
    ${cell(logoSymbol('color'), 'symbol')}${cell(logoSymbol('onDark'), 'on dark')}${cell(logoSymbol('mono'), 'mono')}
    <div style="background:${palette.deepTeal};padding:8px;border-radius:12px">${cell(logoSymbol('mono', '#fff'), '<span style="color:#fff">mono white</span>')}</div>
    ${cell(wordmarks['wordmark-horizontal-light'], 'horizontal', 375, 97)}
    ${cell(wordmarks['logo-stacked-light'], 'stacked', 240, 150)}
    ${[48, 32, 24].map((px) => cell(logoSymbol('color'), `${px}px`, px, px)).join('')}
    ${cell(launcherIcon, 'launcher')}
  </div></section>`;
  const sheetHtml = `<div style="font-family:Inter;color:${palette.ink};padding:24px;background:${palette.warmIvory}"><h1 style="font-family:'Plus Jakarta Sans';margin:0 0 12px">AdultingOS brand contact sheet</h1>${logos}${rows}</div>
  <style>section{margin-bottom:12px} h2{font-size:16px;margin:8px 0} .row{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end} figcaption{font-size:11px;color:${palette.slate}}</style>`;
  await page.setViewportSize({ width: 2100, height: 1000 });
  await page.setContent(`<!doctype html><html><head><style>${FONT_CSS} body{margin:0}</style></head><body>${sheetHtml}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  write('docs/branding/contact-sheet.png', await page.screenshot({ fullPage: true }));

  await browser.close();
  console.log(`Exported ${count} mascot/illustration SVGs and all icon/store PNGs.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
