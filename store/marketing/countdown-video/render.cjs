// node render.cjs [fps] [times...]  — no times = full render to frames/; times = preview stills to preview/
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FPS = 30, DUR = 30;
const args = process.argv.slice(2).map(Number);
(async () => {
  const browser = await chromium.launch();
  const url = 'file://' + path.join(__dirname, 'anim.html');
  const preview = args.length > 0;
  const outDir = path.join(__dirname, preview ? 'preview' : 'frames');
  fs.mkdirSync(outDir, { recursive: true });
  const frames = preview ? args : Array.from({ length: FPS * DUR }, (_, i) => i / FPS);
  const W = preview ? 1 : 4;
  const errors = [];
  await Promise.all(Array.from({ length: W }, async (_, w) => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.evaluate(() => window.ready);
    await page.waitForTimeout(300);
    for (let i = w; i < frames.length; i += W) {
      const t = frames[i];
      await page.evaluate((t) => window.setTime(t), t);
      const name = preview ? `t${t.toFixed(2)}.jpg` : `${String(i).padStart(4, '0')}.jpg`;
      await page.screenshot({ path: path.join(outDir, name), type: 'jpeg', quality: 94 });
    }
  }));
  await browser.close();
  if (errors.length) { console.error('PAGE ERRORS:', [...new Set(errors)].slice(0, 5)); process.exit(1); }
  console.log(`rendered ${frames.length} frame(s) -> ${outDir}`);
})();
