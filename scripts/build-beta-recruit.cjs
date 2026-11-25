/** Beta-tester recruitment graphics (feed 1080×1350 and story 1080×1920) from brand assets + a real app screen. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const b64 = (p) => fs.readFileSync(path.join(ROOT, p)).toString('base64');
const svg = (p) => `data:image/svg+xml;base64,${b64(p)}`;
const font = (pkg, f) => b64(`node_modules/@expo-google-fonts/${pkg}/${f}`);
const CSS_FONTS = `@font-face{font-family:PJS;font-weight:800;src:url(data:font/ttf;base64,${font('plus-jakarta-sans', '800ExtraBold/PlusJakartaSans_800ExtraBold.ttf')})}
@font-face{font-family:PJS;font-weight:700;src:url(data:font/ttf;base64,${font('plus-jakarta-sans', '700Bold/PlusJakartaSans_700Bold.ttf')})}
@font-face{font-family:Inter;font-weight:500;src:url(data:font/ttf;base64,${font('inter', '500Medium/Inter_500Medium.ttf')})}
@font-face{font-family:Inter;font-weight:600;src:url(data:font/ttf;base64,${font('inter', '600SemiBold/Inter_600SemiBold.ttf')})}`;
const shot = `data:image/png;base64,${b64('store/screenshots/raw/1.png')}`;
const M = {
  adu: svg('assets/mascots/adu/adu-excited-wave.svg'),
  doki: svg('assets/mascots/doki/doki-happy-hold.svg'),
  piso: svg('assets/mascots/piso/piso-celebrating-idle.svg'),
  sunny: svg('assets/mascots/sunny/sunny-happy-wave.svg'),
  logo: svg('assets/branding/logo-symbol.svg'),
};

function html(story) {
  const H = story ? 1920 : 1350;
  return `<!doctype html><html><head><style>${CSS_FONTS}
*{box-sizing:border-box}body{margin:0;width:1080px;height:${H}px;overflow:hidden;background:#FAF8F3;font-family:Inter;color:#172B36;position:relative}
.blob1{position:absolute;right:-180px;top:${story ? 560 : 330}px;width:820px;height:820px;border-radius:50%;background:#C9F0DF}
.blob2{position:absolute;left:-120px;bottom:-160px;width:420px;height:420px;border-radius:50%;background:#FFDCC8}
.blob3{position:absolute;right:-60px;top:-80px;width:280px;height:280px;border-radius:50%;background:#E6E1F8}
.top{position:absolute;left:72px;top:${story ? 120 : 64}px;display:flex;align-items:center;gap:16px}
.top img{width:64px;height:64px}.top b{font-family:PJS;font-weight:800;font-size:38px}
.tag{display:inline-block;background:#174B49;color:#fff;font-family:PJS;font-weight:700;font-size:28px;letter-spacing:3px;padding:12px 24px;border-radius:999px}
.left{position:absolute;left:72px;top:${story ? 250 : 160}px;width:${story ? 936 : 560}px;display:flex;flex-direction:column;align-items:flex-start}
h1{font-family:PJS;font-weight:800;font-size:${story ? 104 : 70}px;line-height:1.04;margin:24px 0 0;letter-spacing:-1.5px}
h1 span{color:#174B49}
p.sub{font-size:${story ? 38 : 27}px;line-height:1.4;margin:20px 0 0;color:#2F4A57;font-weight:500}
.perks{display:grid;gap:12px;width:${story ? 560 : 520}px;margin-top:${story ? 44 : 30}px}
.perk{display:flex;align-items:center;gap:14px;background:#fff;border:2px solid #E6E1D6;border-radius:20px;padding:12px 18px;font-size:${story ? 30 : 24}px;font-weight:600;line-height:1.25}
.perk i{flex:none;font-style:normal;display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#C9F0DF;color:#174B49;font-size:22px;font-weight:700}
.phone{position:absolute;right:56px;top:${story ? 850 : 360}px;width:${story ? 340 : 330}px;height:${story ? 680 : 660}px;border-radius:48px;background:#172B36;padding:11px;transform:rotate(4deg);box-shadow:0 40px 80px rgba(23,43,54,.28)}
.phone img{width:100%;height:100%;border-radius:38px;object-fit:cover;object-position:top;display:block}
.m{position:absolute}
.cta{position:absolute;left:72px;right:72px;bottom:${story ? 110 : 56}px;z-index:2;background:#174B49;color:#fff;border-radius:28px;padding:28px 36px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.cta b{font-family:PJS;font-weight:800;font-size:${story ? 46 : 38}px;line-height:1.1}
.cta small{display:block;font-size:24px;opacity:.85;margin-top:8px;font-weight:500}
.cta .pill{background:#C9F0DF;color:#174B49;font-family:PJS;font-weight:800;font-size:30px;padding:18px 26px;border-radius:999px;white-space:nowrap}
</style></head><body>
<div class="blob1"></div><div class="blob2"></div><div class="blob3"></div>
<div class="top"><img src="${M.logo}"><b>AdultingOS</b></div>
<div class="left"><span class="tag">BETA TESTERS WANTED</span>
<h1>Adulting is hard.<br><span>Help us make it easier.</span></h1>
<p class="sub">Try AdultingOS before anyone else — the friendly app for bills, ID renewals and everyday life admin.</p>
<div class="perks">
<div class="perk"><i>✓</i>Free early access on Android</div>
<div class="perk"><i>✓</i>No sign-up — just install</div>
<div class="perk"><i>✓</i>Meet Adu, your AI adulting buddy</div>
<div class="perk"><i>✓</i>Your feedback shapes the app</div></div></div>
<div class="phone"><img src="${shot}"></div>
<img class="m" src="${M.adu}" style="width:${story ? 230 : 190}px;right:${story ? 320 : 300}px;top:${story ? 1340 : 930}px">
<img class="m" src="${M.piso}" style="width:${story ? 160 : 130}px;right:${story ? 40 : 40}px;top:${story ? 1420 : 980}px">
<div class="cta"><div><b>Join the 14-day beta</b><small>Android phone + Gmail account · 18+</small></div><div class="pill">Comment “BETA” 👋</div></div>
</body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [name, story] of [['beta-testers-wanted-1080x1350', false], ['beta-testers-wanted-story-1080x1920', true]]) {
    await page.setViewportSize({ width: 1080, height: story ? 1920 : 1350 });
    await page.setContent(html(story));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ROOT, `store/marketing/${name}.png`) });
  }
  await browser.close();
  console.log('Wrote store/marketing/*');
})();
