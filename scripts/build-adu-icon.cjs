/** Adu character icon: rounded-square (app-icon style) and circle (avatar) at 1024/512 px, from the brand SVG. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const adu = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'assets/mascots/adu/adu-happy-wave.svg')).toString('base64');
const page = (shape) => `<!doctype html><html><body style="margin:0;background:transparent">
<div style="position:relative;width:1024px;height:1024px;border-radius:${shape === 'circle' ? '50%' : '230px'};overflow:hidden;
 background:radial-gradient(circle at 50% 40%,#FFFDF8 0%,#FAF8F3 45%,#E6E1F8 100%)">
 <div style="position:absolute;left:-120px;top:-160px;width:560px;height:560px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.55),rgba(255,255,255,0) 70%)"></div>
 <div style="position:absolute;left:50%;top:52%;width:700px;height:700px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#FFF1C2 0%,rgba(255,241,194,.6) 45%,rgba(255,241,194,0) 70%)"></div>
 <div style="position:absolute;left:50%;top:86%;width:560px;height:90px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(ellipse,rgba(23,75,73,.22),rgba(23,75,73,0) 70%)"></div>
 <div style="position:absolute;left:50%;top:54%;width:820px;height:820px;transform:translate(-50%,-50%)">
  <img src="${adu}" style="width:100%;height:100%;filter:drop-shadow(0 24px 26px rgba(23,75,73,.25))">
  <div style="position:absolute;inset:0;-webkit-mask:url('${adu}') center/100% 100% no-repeat;
   background:radial-gradient(circle at 38% 30%,rgba(255,255,255,.5),rgba(255,255,255,0) 30%),radial-gradient(circle at 66% 82%,rgba(23,43,54,.16),rgba(23,43,54,0) 45%)"></div>
 </div>
 ${[[150,250,26],[860,210,20],[880,620,16],[130,700,14]].map(([x,y,r])=>`<svg style="position:absolute;left:${x-r}px;top:${y-r}px" width="${2*r}" height="${2*r}" viewBox="-1 -1 2 2"><path d="M0-1 .25-.25 1 0 .25.25 0 1-.25.25-1 0-.25-.25Z" fill="#F2C14E" opacity=".85"/></svg>`).join('')}
</div></body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  const out = path.join(ROOT, 'store/marketing/adu-icon');
  for (const shape of ['rounded', 'circle']) {
    await p.setContent(page(shape));
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(out, `adu-icon-${shape}-1024.png`), omitBackground: true });
  }
  await b.close();
})();
