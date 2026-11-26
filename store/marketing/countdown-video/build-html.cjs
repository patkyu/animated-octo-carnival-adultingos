// Builds the self-contained animation page (all assets inlined). setTime(t) draws frame t deterministically.
const fs = require('fs'), path = require('path');
const ROOT = '/home/user/adultingos';
const b64 = (p) => fs.readFileSync(path.join(ROOT, p)).toString('base64');
const svgURI = (p) => `data:image/svg+xml;base64,${b64(p)}`;
const pngURI = (p) => `data:image/png;base64,${b64(p)}`;
const font = (pkg, f) => b64(`node_modules/@expo-google-fonts/${pkg}/${f}`);
const T = JSON.parse(fs.readFileSync(path.join(__dirname, 'timeline.json')));
const VARIANTS = {
  adu: ['concern-idle', 'confused-idle', 'happy-idle', 'happy-wave', 'excited-wave', 'celebrating-idle', 'celebrating-wave', 'happy-hold'],
  doki: ['happy-hold', 'happy-wave', 'excited-wave', 'celebrating-wave'],
  piso: ['happy-idle', 'celebrating-idle', 'happy-wave', 'excited-wave'],
  tiki: ['happy-idle', 'excited-wave', 'happy-wave', 'celebrating-wave'],
  homi: ['happy-wave', 'celebrating-wave', 'happy-idle'],
  sunny: ['happy-wave', 'celebrating-idle', 'excited-wave'],
};
const MASCOT_SVGS = {};
for (const [m, vs] of Object.entries(VARIANTS)) for (const v of vs) MASCOT_SVGS[`${m}-${v}`] = svgURI(`assets/mascots/${m}/${m}-${v}.svg`);
const SHOTS = { home: 1, tasks: 2, docs: 3, bills: 4, ask: 6, cal: 7 };
const SHOT_URIS = Object.fromEntries(Object.entries(SHOTS).map(([k, n]) => [k, pngURI(`store/screenshots/raw/${n}.png`)]));
const LOGO = svgURI('assets/branding/logo-symbol.svg');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:PJS;font-weight:800;src:url(data:font/ttf;base64,${font('plus-jakarta-sans', '800ExtraBold/PlusJakartaSans_800ExtraBold.ttf')})}
@font-face{font-family:PJS;font-weight:700;src:url(data:font/ttf;base64,${font('plus-jakarta-sans', '700Bold/PlusJakartaSans_700Bold.ttf')})}
@font-face{font-family:Inter;font-weight:500;src:url(data:font/ttf;base64,${font('inter', '500Medium/Inter_500Medium.ttf')})}
@font-face{font-family:Inter;font-weight:600;src:url(data:font/ttf;base64,${font('inter', '600SemiBold/Inter_600SemiBold.ttf')})}
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden;background:#FAF8F3}
.layer{position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:hidden}
.a{position:absolute;left:0;top:0;will-change:transform,opacity}
.m{position:absolute;left:0;top:0;filter:drop-shadow(0 26px 22px rgba(23,43,54,.18))}
.m img{position:absolute;inset:0;width:100%;height:100%;display:none}
.m .sh{position:absolute;inset:0;-webkit-mask-size:100% 100%;mask-size:100% 100%;
  background:radial-gradient(circle at 36% 26%,rgba(255,255,255,.55),rgba(255,255,255,0) 34%),radial-gradient(circle at 70% 88%,rgba(23,43,54,.20),rgba(23,43,54,0) 50%)}
.cap{position:absolute;left:90px;width:900px;text-align:center;font-family:PJS;font-weight:800;color:#174B49}
.card{background:rgba(255,255,255,.92);border-radius:40px;padding:30px 40px;box-shadow:0 20px 50px rgba(23,43,54,.14)}
.item{position:absolute;left:0;top:0;border-radius:18px;box-shadow:0 14px 26px rgba(23,43,54,.16)}
.line{position:absolute;height:10px;border-radius:5px;background:#D9D3E8}
</style></head><body>
<div class="layer" id="bg"></div>
<div class="layer" id="S1"><div class="a" id="cam1" style="width:1080px;height:1920px;transform-origin:540px 1150px">
  <div class="a" id="wall" style="left:50px;top:430px;width:980px;height:1010px;border-radius:90px;background:linear-gradient(180deg,#EDE9FB,#E6E1F8);box-shadow:inset 0 -30px 60px rgba(23,43,54,.06)"></div>
  <div class="a" style="left:640px;top:520px;width:300px;height:330px;border-radius:60px;background:linear-gradient(180deg,#DCEBFA,#F4FAFF);box-shadow:inset 0 0 0 16px #FAF8F3,0 10px 24px rgba(23,43,54,.08)"></div>
  <div class="a" style="left:700px;top:610px;width:120px;height:46px;border-radius:30px;background:#fff;opacity:.95"></div>
  <div class="a" style="left:760px;top:590px;width:80px;height:60px;border-radius:40px;background:#fff;opacity:.95"></div>
  <div class="a" id="shelf1" style="left:110px;top:860px;width:400px;height:26px;border-radius:13px;background:#FFDCC8;box-shadow:0 10px 16px rgba(23,43,54,.10)"></div>
  <div class="a" id="shelf2" style="left:110px;top:1080px;width:400px;height:26px;border-radius:13px;background:#FFDCC8;box-shadow:0 10px 16px rgba(23,43,54,.10)"></div>
  <div class="a" style="left:30px;top:1330px;width:1020px;height:420px;border-radius:50%;background:radial-gradient(ellipse at 50% 40%,#FFE8DA,#FFDCC8);box-shadow:0 30px 60px rgba(23,43,54,.10)"></div>
  <div class="a" style="left:330px;top:1290px;width:420px;height:130px;border-radius:50%;background:#C9F0DF;opacity:.9"></div>
  <div class="a" style="left:930px;top:1230px;width:90px;height:90px;border-radius:24px 24px 30px 30px;background:#FFDCC8;box-shadow:inset 0 -12px 0 rgba(23,43,54,.06)"></div>
  <div class="a" style="left:925px;top:1150px;width:46px;height:90px;border-radius:50% 50% 50% 0;background:#9FDCC3;transform:rotate(-20deg)"></div>
  <div class="a" style="left:975px;top:1140px;width:46px;height:95px;border-radius:50% 50% 0 50%;background:#B7E7D2;transform:rotate(18deg)"></div>
  <div id="items"></div>
  <div id="m1"></div>
  <div class="a" id="dim" style="width:1080px;height:1920px;background:rgba(80,80,110,.10)"></div>
  <div class="a" id="magic" style="width:1080px;height:1920px;background:radial-gradient(circle at 540px 1150px,rgba(201,240,223,.95),rgba(201,240,223,.5) 35%,rgba(201,240,223,0) 70%)"></div>
  <div class="a" id="sunglow" style="width:1080px;height:1920px;background:radial-gradient(circle at 540px 520px,rgba(255,226,140,.55),rgba(255,241,194,.25) 30%,rgba(255,241,194,0) 60%)"></div>
</div></div>
<div class="layer" id="S3"></div>
<div class="layer" id="S4"></div>
<div class="layer" id="S5"></div>
<canvas class="layer" id="fx" width="1080" height="1920"></canvas>
<div class="layer" id="txt"></div>
<script>
const T=${JSON.stringify(T)};
const MS=${JSON.stringify(MASCOT_SVGS)};
const SHOT=${JSON.stringify(SHOT_URIS)};
const LOGO=${JSON.stringify(LOGO)};
const $=(id)=>document.getElementById(id);
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,x)=>a+(b-a)*x;
const E={lin:x=>x,in:x=>x*x*x,out:x=>1-Math.pow(1-x,3),inOut:x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2,
 back:x=>{const c1=1.9,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)},
 bounce:x=>{const n=7.5625,d=2.75;if(x<1/d)return n*x*x;if(x<2/d)return n*(x-=1.5/d)*x+.75;if(x<2.5/d)return n*(x-=2.25/d)*x+.9375;return n*(x-=2.625/d)*x+.984375}};
const P=(t,t0,t1,e='inOut')=>E[e](clamp((t-t0)/(t1-t0)));
function kf(t,K,e='inOut'){if(t<=K[0][0])return K[0][1];for(let i=0;i<K.length-1;i++){if(t<=K[i+1][0]){const x=E[e]((t-K[i][0])/(K[i+1][0]-K[i][0]));return lerp(K[i][1],K[i+1][1],x)}}return K[K.length-1][1]}
function rnd(seed){let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function mk(parent,tag,cls,style,html){const e=document.createElement(tag);if(cls)e.className=cls;if(style)e.style.cssText=style;if(html)e.innerHTML=html;$(parent).appendChild(e);return e}
function place(e,o){const s=o.s??1;e.style.transform='translate('+(o.x??0)+'px,'+(o.y??0)+'px) translate(-50%,-50%) rotate('+(o.r??0)+'deg) scale('+(s*(o.sx??1))+','+(s*(o.sy??1))+')';e.style.opacity=o.o??1;e.style.display=(o.o??1)<=0.001?'none':'block'}
// ---- mascots ----
class Mascot{constructor(parent,name,size){this.n=name;this.el=mk(parent,'div','m','width:'+size+'px;height:'+size+'px');this.imgs={};
 for(const k in MS){if(k.startsWith(name+'-')){const i=document.createElement('img');i.src=MS[k];this.el.appendChild(i);this.imgs[k.slice(name.length+1)]=i}}
 this.sh=document.createElement('div');this.sh.className='sh';this.el.appendChild(this.sh);this.cur=null}
 set(o){if(o.v&&o.v!==this.cur){if(this.cur)this.imgs[this.cur].style.display='none';this.imgs[o.v].style.display='block';const u='url("'+MS[this.n+'-'+o.v]+'")';this.sh.style.webkitMaskImage=u;this.sh.style.maskImage=u;this.cur=o.v}place(this.el,o)}}
// ---- scene 1/2: chaos items ----
const ITEMS=[];const IR=rnd(11);
function addItem(kind,target,org){const e=mk('items','div','item');let w=120,h=150;
 if(kind==='doc'){w=130;h=170;e.style.background='#fff';e.innerHTML='<div style="position:absolute;left:0;top:0;right:0;height:38px;border-radius:18px 18px 0 0;background:#E6E1F8"></div>'+[60,84,108,132].map((y,i)=>'<div class="line" style="left:18px;top:'+y+'px;width:'+(i==3?60:94)+'px"></div>').join('')}
 if(kind==='bill'){w=150;h=110;e.style.background='#fff';e.innerHTML='<div style="position:absolute;left:0;top:0;bottom:0;width:30px;border-radius:18px 0 0 18px;background:#FFDCC8"></div><div style="position:absolute;right:16px;top:16px;width:46px;height:46px;border-radius:50%;background:#FFF1C2;color:#B26A2E;font:800 28px PJS;display:grid;place-items:center">₱</div>'+[24,48,74].map((y,i)=>'<div class="line" style="background:#F2E3D9;left:44px;top:'+y+'px;width:'+(i==2?70:40)+'px"></div>').join('')}
 if(kind==='note'){w=110;h=110;e.style.background='#FFF1C2';e.style.borderRadius='10px';e.innerHTML=[30,54,78].map(y=>'<div class="line" style="background:#EFD98F;left:18px;top:'+y+'px;width:70px"></div>').join('')}
 if(kind==='cal'){w=140;h=150;e.style.background='#fff';e.innerHTML='<div style="position:absolute;left:0;top:0;right:0;height:40px;border-radius:18px 18px 0 0;background:#174B49"></div>'+Array.from({length:12},(_,i)=>'<div style="position:absolute;left:'+(18+(i%4)*28)+'px;top:'+(58+Math.floor(i/4)*28)+'px;width:16px;height:16px;border-radius:5px;background:'+(i==6?'#FFDCC8':'#E7F5EE')+'"></div>').join('')}
 if(kind==='clock'){w=120;h=120;e.style.background='#DCEBFA';e.style.borderRadius='50%';e.innerHTML='<div style="position:absolute;inset:14px;border-radius:50%;background:#fff"></div><div class="hand" style="position:absolute;left:57px;top:30px;width:6px;height:32px;border-radius:3px;background:#174B49;transform-origin:3px 30px"></div><div class="hand2" style="position:absolute;left:57px;top:40px;width:6px;height:22px;border-radius:3px;background:#E07A5F;transform-origin:3px 20px"></div>'}
 if(kind==='check'){w=130;h=160;e.style.background='#fff';e.innerHTML=[26,66,106].map(y=>'<div style="position:absolute;left:16px;top:'+y+'px;width:24px;height:24px;border-radius:7px;border:3px solid #9FDCC3"></div><div class="line" style="background:#E3EEE9;left:52px;top:'+(y+7)+'px;width:60px"></div>').join('')}
 e.style.width=w+'px';e.style.height=h+'px';
 ITEMS.push({e,kind,target,org,a0:IR()*6.28,rad:230+IR()*260,sp:(0.5+IR()*0.7)*(IR()<.5?-1:1),wob:IR()*6.28,spin:(IR()-.5)*120,yS:0.55+IR()*0.25,off:ITEMS.length})}
// targets (organized layout)
[[170,790],[250,790],[330,790],[410,790]].forEach(p=>addItem('doc',[...p,0],'doki'));
[[200,1028],[205,1012],[210,996],[400,1020]].forEach((p,i)=>addItem('bill',[...p,i==3?0:(i-1)*2],'piso'));
addItem('cal',[200,560,0],'tiki');addItem('cal',[360,560,0],'tiki');addItem('clock',[470,1015,0],'tiki');addItem('clock',[880,1230,0],'tiki');
[[690,930],[810,930],[690,1050],[810,1050]].forEach(p=>addItem('note',[...p,0],'homi'));
addItem('check',[560,620,0],'homi');addItem('check',[930,980,0],'homi');addItem('doc',[880,990,0],'doki');
const ORG={doki:T.enter_doki+0.15,piso:T.enter_piso+0.15,tiki:T.enter_tiki+0.15,homi:T.enter_homi+0.15};
const m1={adu:new Mascot('m1','adu',300),doki:new Mascot('m1','doki',210),piso:new Mascot('m1','piso',210),tiki:new Mascot('m1','tiki',190),homi:new Mascot('m1','homi',190),sunny:new Mascot('m1','sunny',200)};
// ---- scene 3 ----
const s3={};
s3.blobs=[[120,420,180,'#DCEBFA'],[950,380,140,'#E6E1F8'],[110,1500,220,'#FFF1C2'],[980,1560,200,'#FFDCC8'],[900,1180,90,'#FAF8F3'],[200,1100,70,'#FAF8F3']].map(([x,y,r,c])=>({x,y,e:mk('S3','div','a','width:'+r*2+'px;height:'+r*2+'px;border-radius:50%;background:'+c+';opacity:.8')}));
s3.phoneWrap=mk('S3','div','a','width:500px;height:1000px');
s3.phone=document.createElement('div');s3.phone.style.cssText='position:absolute;inset:0;border-radius:70px;background:linear-gradient(145deg,#24434F,#172B36 40%,#10202A);padding:16px;box-shadow:0 60px 90px rgba(23,43,54,.30),inset 0 2px 0 rgba(255,255,255,.18)';s3.phoneWrap.appendChild(s3.phone);
s3.screen=document.createElement('div');s3.screen.style.cssText='position:relative;width:100%;height:100%;border-radius:56px;overflow:hidden;background:#FAF8F3';s3.phone.appendChild(s3.screen);
s3.shots={};for(const k in SHOT){const i=document.createElement('img');i.src=SHOT[k];i.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;opacity:0';s3.screen.appendChild(i);s3.shots[k]=i}
s3.glare=document.createElement('div');s3.glare.style.cssText='position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,0) 35%,rgba(255,255,255,.22) 45%,rgba(255,255,255,0) 55%);pointer-events:none';s3.screen.appendChild(s3.glare);
s3.ripple=document.createElement('div');s3.ripple.style.cssText='position:absolute;left:0;top:0;width:120px;height:120px;border-radius:50%;border:8px solid #2E9C74;opacity:0';s3.screen.appendChild(s3.ripple);
s3.m={doki:new Mascot('S3','doki',200),piso:new Mascot('S3','piso',200),tiki:new Mascot('S3','tiki',190),adu:new Mascot('S3','adu',240),homi:new Mascot('S3','homi',160),sunny:new Mascot('S3','sunny',170)};
// ---- scene 4 ----
const s4={};
s4.rays=mk('S4','div','a','width:2400px;height:2400px;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.35) 0deg 9deg,rgba(255,255,255,0) 9deg 24deg)');
s4.stage=mk('S4','div','a','width:1100px;height:300px;border-radius:50%;background:radial-gradient(ellipse at 50% 35%,#DDF6EA,#C9F0DF 60%,#AEE3CC);box-shadow:0 30px 60px rgba(23,43,54,.15)');
s4.balloonsBg=[];const BR=rnd(5);for(let i=0;i<7;i++){const c=['#C9F0DF','#FFDCC8','#E6E1F8','#FFF1C2','#DCEBFA'][i%5];s4.balloonsBg.push({x:80+BR()*920,y:300+BR()*700,s:.5+BR()*.4,ph:BR()*6,e:mk('S4','div','a','width:90px;height:110px;border-radius:50% 50% 48% 48%;background:radial-gradient(circle at 35% 30%,#fff8,'+c+' 45%);opacity:.75')})}
s4.n14back=mk('S4','div','a','font:800 640px/1 PJS;letter-spacing:-40px;color:#7CC9A9;white-space:nowrap;text-shadow:'+Array.from({length:26},(_,i)=>(i*0.6)+'px '+(i+1)+'px 0 '+(i<20?'#6FBF9E':'#4E9F81')).join(',')+',0 60px 60px rgba(23,43,54,.28)');
s4.n14back.textContent='14';
s4.n14=mk('S4','div','a','font:800 640px/1 PJS;letter-spacing:-40px;white-space:nowrap;background:linear-gradient(160deg,#F4FFFA 0%,#DDF6EA 30%,#C9F0DF 55%,#A8E2C9 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent');
s4.n14.textContent='14';
s4.sheen=mk('S4','div','a','font:800 640px/1 PJS;letter-spacing:-40px;white-space:nowrap;background:linear-gradient(110deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.9) 50%,rgba(255,255,255,0) 60%);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent');
s4.sheen.textContent='14';
s4.m={adu:new Mascot('S4','adu',220),doki:new Mascot('S4','doki',190),tiki:new Mascot('S4','tiki',180),homi:new Mascot('S4','homi',180),piso:new Mascot('S4','piso',190),sunny:new Mascot('S4','sunny',190)};
s4.clip=mk('S4','div','a','width:96px;height:118px;border-radius:14px;background:#fff;box-shadow:0 10px 18px rgba(23,43,54,.18)','<div style="position:absolute;left:30px;top:-10px;width:36px;height:20px;border-radius:6px;background:#174B49"></div>'+[22,52,82].map(y=>'<div style="position:absolute;left:14px;top:'+y+'px;width:22px;height:22px;border-radius:7px;background:#2E9C74;color:#fff;font:800 16px/22px Inter;text-align:center">✓</div><div style="position:absolute;left:44px;top:'+(y+7)+'px;width:38px;height:9px;border-radius:5px;background:#D7EFE4"></div>').join(''));
s4.balloons=[0,1,2,3,4].map(i=>({c:['#FFDCC8','#E6E1F8','#C9F0DF','#FFF1C2','#DCEBFA'][i],e:mk('S4','div','a','width:110px;height:400px','<div style="position:absolute;left:0;top:0;width:110px;height:134px;border-radius:50% 50% 47% 47%;background:radial-gradient(circle at 35% 30%,#ffffffcc,'+['#FFCFB4','#D8D0F5','#B6E8D1','#FFE9A6','#C9DFF6'][i]+' 45%);box-shadow:inset -10px -14px 20px rgba(23,43,54,.08)"></div><div style="position:absolute;left:54px;top:134px;width:2px;height:240px;background:#9AA8B0"></div>')}));
// ---- scene 5 ----
const s5={};
s5.blobs=[[90,260,200,'#E6E1F8'],[1000,350,170,'#C9F0DF'],[60,1500,190,'#FFDCC8'],[1020,1450,210,'#FFF1C2']].map(([x,y,r,c])=>({x,y,e:mk('S5','div','a','width:'+r*2+'px;height:'+r*2+'px;border-radius:50%;background:'+c+';opacity:.55')}));
s5.logo=mk('S5','div','a','width:700px;height:330px;text-align:center','<img src="'+LOGO+'" style="width:190px;height:190px;filter:drop-shadow(0 18px 24px rgba(23,73,73,.25))"><div style="font:800 104px/1.1 PJS;color:#172B36;letter-spacing:-2px;margin-top:6px">Adulting<span style="color:#174B49">OS</span></div>');
s5.m={homi:new Mascot('S5','homi',170),doki:new Mascot('S5','doki',180),piso:new Mascot('S5','piso',180),tiki:new Mascot('S5','tiki',170),sunny:new Mascot('S5','sunny',170),adu:new Mascot('S5','adu',250)};
s5.sign=mk('S5','div','a','width:360px;height:150px','<div style="position:absolute;left:174px;top:120px;width:12px;height:110px;border-radius:6px;background:#D9B48F"></div><div style="position:absolute;inset:0 0 auto 0;height:130px;border-radius:30px;background:#fff;box-shadow:0 16px 30px rgba(23,43,54,.16),inset 0 0 0 6px #C9F0DF;display:grid;place-items:center;font:800 50px PJS;color:#174B49">See you soon!</div>');
// ---- text ----
function cap(html,css){return mk('txt','div','a',css,html)}
const tx={
 t1:cap('<div class="card" style="font:800 62px/1.15 PJS;color:#174B49;text-align:center">Adulting can be<br>overwhelming…</div>','width:820px'),
 t2:cap('<div class="card" style="font:800 60px/1.15 PJS;color:#174B49;text-align:center">But what if life had<br>a little help?</div>','width:860px'),
 t3a:cap('<div style="font:800 96px/1 PJS;color:#174B49;text-align:center;letter-spacing:-2px">Meet AdultingOS.</div>','width:1000px'),
 t3b:cap('<div style="font:600 42px/1.25 Inter;color:#2F4A57;text-align:center">Your personal operating system<br>for adulthood.</div>','width:960px'),
 t4a:cap('<div style="font:800 118px/1 PJS;color:#174B49;text-align:center;letter-spacing:-2px;text-shadow:0 6px 0 #fff,0 18px 30px rgba(23,43,54,.18)">14 DAYS TO GO!</div>','width:1040px'),
 t4b:cap('<div style="font:700 54px/1.1 PJS;color:#172B36;text-align:center">Until AdultingOS goes <span style="background:#174B49;color:#fff;border-radius:18px;padding:2px 18px">LIVE</span></div>','width:1000px'),
 t4c:cap('<div style="display:inline-block;font:700 50px/1 PJS;color:#174B49;background:#fff;border-radius:999px;padding:22px 44px;box-shadow:0 14px 30px rgba(23,43,54,.14)">On Google Play</div>','width:1000px;text-align:center'),
 t5a:cap('<div style="font:700 52px/1.2 PJS;color:#174B49;text-align:center">Life is complicated.<br>Adulting shouldn\\'t be.</div>','width:1000px'),
 t5b:cap('<div style="font:700 50px/1 PJS;color:#172B36;text-align:center">Coming soon to Google Play</div>','width:1000px'),
 t5c:cap('<div style="display:inline-block;font:800 70px/1 PJS;color:#fff;background:#174B49;border-radius:999px;padding:24px 56px;letter-spacing:1px;box-shadow:0 18px 36px rgba(23,73,73,.28)">14 DAYS TO GO</div>','width:1000px;text-align:center'),
};
function showText(e,t,tin,tout,x,y,mode='up'){const a=P(t,tin,tin+.45,'back'),b=tout?P(t,tout,tout+.35,'in'):0;const o=clamp(P(t,tin,tin+.3,'out')-b);
 place(e,{x,y:y+(mode==='up'?(1-a)*40:0)-b*20,s:mode==='pop'?lerp(.4,1,a):1,o})}
// ---- particles ----
const cx=$('fx').getContext('2d');
const PAL=['#174B49','#C9F0DF','#E6E1F8','#FFDCC8','#DCEBFA','#FFF1C2','#2E9C74','#F6B38E'];
function star(x,y,r,a,col){cx.save();cx.globalAlpha=a;cx.fillStyle=col;cx.beginPath();for(let i=0;i<8;i++){const rr=i%2?r*.32:r;const an=i*Math.PI/4;cx.lineTo(x+Math.cos(an)*rr,y+Math.sin(an)*rr)}cx.closePath();cx.fill();cx.restore()}
function sparkles(t,seed,n,box,col='#FFD66B',o=1){const R=rnd(seed);for(let i=0;i<n;i++){const x=box[0]+R()*box[2],y=box[1]+R()*box[3],ph=R()*6.28,sp=2+R()*3,r=8+R()*14;const a=Math.max(0,Math.sin(t*sp+ph));star(x,y,r*a,a*o,i%3?col:'#fff')}}
function confettiBurst(t,t0,x,y,n,seed,spd=900){const dt=t-t0;if(dt<0||dt>3)return;const R=rnd(seed);for(let i=0;i<n;i++){const an=-Math.PI/2+(R()-.5)*2.4,v=spd*(.4+R()*.8);const px=x+Math.cos(an)*v*dt*.9,py=y+Math.sin(an)*v*dt+900*dt*dt*.9;const rot=R()*6+dt*(R()-.5)*14;drawConf(px,py,rot,PAL[i%PAL.length],clamp(1-(dt-2.2)/0.8),R)}}
function drawConf(x,y,rot,col,a,R){cx.save();cx.globalAlpha=a;cx.translate(x,y);cx.rotate(rot);cx.fillStyle=col;if(R()<.5){cx.beginPath();cx.roundRect(-9,-5,18,10,3);cx.fill()}else{cx.beginPath();cx.arc(0,0,7,0,6.28);cx.fill()}cx.restore()}
function confettiRain(t,t0,t1,n,seed,speed=260){if(t<t0)return;const R=rnd(seed);for(let i=0;i<n;i++){const x0=R()*1080,st=t0+R()*(t1-t0-1),sp=speed*(.7+R()*.6),sw=R()*6.28,col=PAL[i%PAL.length];const dt=t-st;if(dt<0)continue;const y=-30+dt*sp;if(y>1960)continue;const x=x0+Math.sin(dt*2+sw)*40;drawConf(x,y,dt*3+sw,col,1,R)}}
function coin(x,y,r,spin){cx.save();cx.translate(x,y);cx.scale(Math.max(.15,Math.abs(Math.cos(spin))),1);cx.fillStyle='#F2C14E';cx.beginPath();cx.arc(0,0,r,0,6.28);cx.fill();cx.fillStyle='#FFE08A';cx.beginPath();cx.arc(0,0,r*.72,0,6.28);cx.fill();cx.fillStyle='#D99A2B';cx.font='800 '+(r*1.0)+'px PJS';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('₱',0,r*.06);cx.restore()}
// ---- frame ----
function wipe(el,t,t0,cx_,cy_){const r=P(t,t0,t0+.5,'inOut')*1500;el.style.clipPath=r>=1499?'none':'circle('+r+'px at '+cx_+'px '+cy_+'px)';el.style.display=t<t0?'none':'block'}
window.setTime=function(t){
 // background
 const bg=$('bg');bg.style.background=t<9?'linear-gradient(180deg,#F3EFE6,#FAF8F3)':t<15?'linear-gradient(180deg,#C9F0DF,#DCEBFA)':t<22?'radial-gradient(circle at 50% 35%,#FFF6EE,#FFE3D3 45%,#E9E3FA)':'#FAF8F3';
 // ===== S1/S2 =====
 const S1=$('S1');S1.style.display=t<9.6?'block':'none';
 if(t<9.6){
  const z=t<4?lerp(1,1.14,P(t,0,4,'inOut')):lerp(1.14,1,P(t,4,5.6,'inOut'));
  $('cam1').style.transform='scale('+z+')';
  $('dim').style.opacity=1-P(t,4,4.6);
  $('magic').style.opacity=kf(t,[[3.9,0],[4.3,.95],[5.6,0]]);
  $('sunglow').style.opacity=P(t,T.enter_sunny,T.enter_sunny+.6);
  for(const it of ITEMS){const ot=ORG[it.org]+it.off*0.03;const ang=it.a0+t*it.sp;const cxp=540+Math.cos(ang)*it.rad,cyp=1060+Math.sin(ang)*it.rad*it.yS+Math.sin(t*2+it.wob)*30;const crot=t*it.spin+it.wob*30;
   const k=P(t,ot,ot+.7,'back');const x=lerp(cxp,it.target[0],k),y=lerp(cyp,it.target[1],k),r=lerp(crot,it.target[2],P(t,ot,ot+.7,'out'));place(it.e,{x,y,r,s:lerp(.95,1,k)});
   if(it.kind==='clock'){const sp=t<ot?600:0;it.e.querySelector('.hand').style.transform='rotate('+(t<ot?t*sp:ot*600)+'deg)';it.e.querySelector('.hand2').style.transform='rotate('+(t<ot?t*sp*1.7:ot*1020)+'deg)'}}
  const shiver=t<4?Math.sin(t*22)*1.6:0;
  const av=t<1.8?'concern-idle':t<4?'confused-idle':t<T.organized?'happy-idle':'happy-wave';
  const relief=P(t,T.organized,T.organized+.4,'back');
  m1.adu.set({v:av,x:540,y:1180+Math.sin(t*2.2)*6,r:shiver+(t>=T.organized?Math.sin(t*5)*3:0),sy:1+0.04*Math.sin(relief*3.14),sx:1-0.03*Math.sin(relief*3.14)});
  const hop=(t0,x0,y0,x1,y1,h)=>{const k=P(t,t0,t0+.55,'out');return{x:lerp(x0,x1,k),y:lerp(y0,y1,k)-Math.sin(k*Math.PI)*h,o:t<t0?0:1,k}};
  let d=hop(T.enter_doki,-160,1300,230,1330,260);m1.doki.set({v:t<T.organized?'happy-hold':'happy-wave',...d,r:Math.sin(t*3)*3,s:1});
  let p=(()=>{const k=P(t,T.enter_piso,T.enter_piso+.6,'bounce');return{x:860,y:lerp(-200,1330,k),o:t<T.enter_piso?0:1}})();m1.piso.set({v:t<T.organized?'happy-idle':'celebrating-idle',...p,r:Math.sin(t*3+1)*3});
  let ti=hop(T.enter_tiki,1250,980,900,1090,200);m1.tiki.set({v:t<T.enter_tiki+.9?'excited-wave':'happy-idle',...ti,r:Math.sin(t*3+2)*4});
  let ho=hop(T.enter_homi,-160,1080,180,1100,220);m1.homi.set({v:'happy-wave',...ho,r:Math.sin(t*2.5)*3});
  const sk=P(t,T.enter_sunny,T.enter_sunny+.8,'back');m1.sunny.set({v:'happy-wave',x:540,y:lerp(-200,500,sk)+Math.sin(t*2)*10,o:t<T.enter_sunny?0:1,r:Math.sin(t*1.5)*6});
 }
 // ===== S3 =====
 const S3=$('S3');wipe(S3,t,T.s3-.15,540,1000);if(t>=15.6)S3.style.display='none';
 if(t>=T.s3-.15&&t<15.6){
  for(const b of s3.blobs)place(b.e,{x:b.x+Math.sin(t*.8+b.x)*20,y:b.y+Math.cos(t*.7+b.y)*24});
  const ein=P(t,T.s3,T.s3+.7,'back');const ry=lerp(-24,18,P(t,T.s3,15,'inOut'));
  s3.phoneWrap.style.transform='translate(290px,'+(lerp(1500,560,ein)+Math.sin(t*1.6)*10)+'px) perspective(2000px) rotateY('+ry+'deg) rotateX(6deg) scale('+lerp(.7,1,ein)+')';
  s3.glare.style.transform='translateX('+lerp(-300,300,P(t,T.s3,15,'lin'))+'px)';
  const seq=[['home',T.s3],['docs',T.tap_docs-.25],['bills',T.tap_bills-.25],['cal',T.tap_cal-.25],['tasks',T.tap_task-.35],['ask',T.tap_task+.75]];
  for(let i=0;i<seq.length;i++){const [k,t0]=seq[i];const t1=seq[i+1]?seq[i+1][1]:99;s3.shots[k].style.opacity=clamp(P(t,t0,t0+.25,'lin')-P(t,t1,t1+.25,'lin'))}
  const taps=[[T.tap_docs,230,330],[T.tap_bills,240,260],[T.tap_cal,240,420],[T.tap_task,80,260]];
  let rp=0;for(const [tt,x,y] of taps){const k=(t-tt)/.5;if(k>=0&&k<=1){s3.ripple.style.left=(x-60)+'px';s3.ripple.style.top=(y-60)+'px';s3.ripple.style.transform='scale('+(.4+k*1.2)+')';rp=1-k}}s3.ripple.style.opacity=rp;
  const ent=(t0)=>P(t,t0,t0+.5,'back');
  const tap=(tt)=>Math.sin(clamp((t-tt+.25)/.6)*Math.PI);
  s3.m.doki.set({v:t>T.tap_docs-.3&&t<T.tap_docs+.6?'excited-wave':'happy-wave',x:lerp(-150,170,ent(T.s3+.3))+tap(T.tap_docs)*50,y:930+Math.sin(t*2.4)*8,r:tap(T.tap_docs)*14});
  s3.m.piso.set({v:t>T.tap_bills-.3&&t<T.tap_bills+.6?'excited-wave':'happy-idle',x:lerp(-150,180,ent(T.s3+.5))+tap(T.tap_bills)*60,y:1360-tap(T.tap_bills)*60+Math.sin(t*2.6)*8,r:tap(T.tap_bills)*10});
  s3.m.tiki.set({v:t>T.tap_cal-.3&&t<T.tap_cal+.8?'excited-wave':'happy-idle',x:lerp(1250,910,ent(T.s3+.4)),y:930+Math.sin(t*2.2)*8,r:t>T.tap_cal&&t<T.tap_cal+.6?Math.sin(t*60)*9:Math.sin(t*2)*3});
  s3.m.adu.set({v:t<T.tap_task-.3?'happy-idle':t<T.tap_task+.9?'excited-wave':'celebrating-idle',x:lerp(1250,880,ent(T.s3+.7))-tap(T.tap_task)*120,y:1400-tap(T.tap_task)*120+Math.sin(t*2)*8,r:-tap(T.tap_task)*12});
  s3.m.homi.set({v:'happy-wave',x:lerp(-150,150,ent(T.s3+.9)),y:640+Math.sin(t*2)*10,r:Math.sin(t*2.2)*4});
  s3.m.sunny.set({v:'happy-wave',x:lerp(1250,930,ent(T.s3+1.0)),y:620+Math.sin(t*1.8)*12,r:Math.sin(t*1.4)*8});
 }
 // ===== S4 =====
 const S4=$('S4');wipe(S4,t,T.s4-.15,540,700);if(t>=22.6)S4.style.display='none';
 if(t>=T.s4-.15&&t<22.6){
  place(s4.rays,{x:540,y:700,r:t*8,o:.9});place(s4.stage,{x:540,y:1560});
  for(const b of s4.balloonsBg)place(b.e,{x:b.x+Math.sin(t+b.ph)*20,y:b.y-((t-15)*40)%200+Math.sin(t*1.3+b.ph)*10,s:b.s});
  const land=T.reveal_land;const k=P(t,T.s4,land,'in');let y14=lerp(-700,640,k);const sq=t>land?Math.exp(-(t-land)*6)*Math.sin((t-land)*22):0;
  const o14={x:540,y:y14+Math.sin(t*1.6)*(t>land+1?6:0),sx:1+sq*.06,sy:1-sq*.08,r:t<land?lerp(-8,0,k):sq*1.5};
  place(s4.n14back,{...o14,x:o14.x-14,y:o14.y-26});place(s4.n14,{...o14,x:o14.x-20,y:o14.y-34});place(s4.sheen,{...o14,x:o14.x-20,y:o14.y-34});
  s4.sheen.style.backgroundPosition=(100-((t-land)*45%140))+'% 0';
  // mascots
  const app=(t0)=>P(t,t0,t0+.5,'back');
  const cl=P(t,T.adu_climb,T.adu_climb+.7,'inOut');
  s4.m.adu.set({v:t<T.adu_climb?'happy-idle':t<T.adu_climb+.7?'excited-wave':(Math.floor(t*1.2)%2?'excited-wave':'celebrating-wave'),x:lerp(560,560,cl),y:lerp(1450,250,cl)-Math.sin(cl*Math.PI)*150+(cl>=1?Math.sin(t*4)*8:0),s:lerp(.4,1,app(land+.05)),o:t<land?0:1,r:cl>=1?Math.sin(t*3)*5:0});
  s4.m.doki.set({v:'happy-hold',x:130,y:1470+Math.sin(t*2.4)*8,s:app(land+.15),r:Math.sin(t*2)*4});place(s4.clip,{x:205,y:1460+Math.sin(t*2.4)*8,s:app(land+.25),r:-8+Math.sin(t*2)*4});
  s4.m.tiki.set({v:t>T.tiki_ring&&t<T.tiki_ring+.9?'excited-wave':'happy-wave',x:340,y:1500+Math.sin(t*2.2)*8,s:app(land+.25),r:t>T.tiki_ring&&t<T.tiki_ring+.7?Math.sin(t*60)*10:Math.sin(t*2)*4});
  s4.m.homi.set({v:t>T.balloons?'celebrating-wave':'happy-wave',x:740,y:1500+Math.sin(t*2.1)*8,s:app(land+.35),r:Math.sin(t*2.3)*4});
  s4.m.piso.set({v:t>T.coins-.2?'celebrating-idle':'happy-wave',x:950,y:1470+Math.sin(t*2.6)*8-(t>T.coins&&t<T.coins+.4?Math.sin((t-T.coins)/.4*Math.PI)*40:0),s:app(land+.45),r:Math.sin(t*2)*4});
  s4.m.sunny.set({v:'celebrating-idle',x:920,y:250+Math.sin(t*1.7)*12,s:app(land+.55),r:t*12%360*0+Math.sin(t*1.5)*8});
  s4.balloons.forEach((b,i)=>{const t0=T.balloons+i*.15;const dt=t-t0;place(b.e,{x:740+(i-2)*60+Math.sin(dt*2+i)*25,y:1420-dt*260+200,o:dt<0?0:clamp(1-(dt-5.5)),s:.8})});
 }
 // ===== S5 =====
 const S5=$('S5');wipe(S5,t,T.s5-.15,540,960);
 if(t>=T.s5-.15){
  for(const b of s5.blobs)place(b.e,{x:b.x+Math.sin(t*.7+b.x)*16,y:b.y+Math.cos(t*.6+b.y)*16});
  const lg=P(t,T.logo,T.logo+.6,'back');place(s5.logo,{x:540,y:420,s:lerp(.6,1,lg),o:P(t,T.logo,T.logo+.3,'out')});
  const row=[['homi',115,1080],['doki',300,1060],['adu',540,1090],['piso',780,1060],['tiki',965,1080],['sunny',190,820]];
  row.forEach(([n,x,y],i)=>{const t0=T.row+i*.12;const a=P(t,t0,t0+.5,'back');const wave=t>t0+.6;const v=n==='adu'?'happy-hold':n==='sunny'?'happy-wave':n==='piso'?(wave?'happy-wave':'happy-idle'):(Math.floor(t*1.1+i)%3===0?'celebrating-wave':'happy-wave');
   s5.m[n].set({v,x,y:lerp(y+250,y,a)+Math.sin(t*2.4+i)*7,o:t<t0?0:1,s:lerp(.5,1,a),r:Math.sin(t*2.2+i)*4})});
  const sg=P(t,T.sign,T.sign+.5,'back');place(s5.sign,{x:540,y:lerp(1060,870,sg)+Math.sin(t*2.4+2)*7,o:t<T.sign?0:1,s:lerp(.4,1,sg),r:Math.sin(t*2)*3});
 }
 // ===== text =====
 showText(tx.t1,t,0.6,3.75,540,300);
 showText(tx.t2,t,4.8,8.7,540,300);
 showText(tx.t3a,t,T.s3+.35,14.75,540,265,'pop');
 showText(tx.t3b,t,T.s3+1.0,14.75,540,385);
 showText(tx.t4a,t,T.reveal_land+.35,21.8,540,1075,'pop');
 showText(tx.t4b,t,T.reveal_land+1.2,21.8,540,1205);
 showText(tx.t4c,t,T.reveal_land+2.0,21.8,540,1320,'pop');
 showText(tx.t5a,t,T.logo+.9,null,540,690);
 showText(tx.t5b,t,25.0,null,540,1340);
 showText(tx.t5c,t,25.9,null,540,1460,'pop');
 // ===== particles =====
 cx.clearRect(0,0,1080,1920);
 if(t>=3.9&&t<9.2)sparkles(t,3,26,[60,380,960,1100],'#9FDCC3',P(t,3.9,4.4));
 if(t>=T.organized&&t<9.2)sparkles(t,4,14,[80,420,920,900],'#FFD66B');
 if(t>=T.enter_piso&&t<T.enter_piso+1.2)for(let i=0;i<3;i++){const t0=T.enter_piso+.2+i*.2,dt=t-t0;if(dt>0&&dt<.6)coin(820+i*40,lerp(500,1240,Math.min(1,dt/.5))+(dt>.5?-30:0),26,dt*12)}
 if(t>=T.s3&&t<15.2)sparkles(t,6,16,[40,180,1000,1500],'#fff',.9);
 confettiBurst(t,T.tap_task+.05,540,900,70,21,1100);
 if(t>=T.s4&&t<22.4){sparkles(t,8,24,[40,100,1000,1500],'#FFD66B');confettiBurst(t,T.reveal_land,540,600,120,31,1500);confettiRain(t,T.reveal_land,22.2,140,41,300);
  for(let i=0;i<7;i++){const t0=T.coins+i*.1,dt=t-t0;if(dt>0&&dt<1.4){const vx=(i-3)*90,vy=-900-i%3*120;coin(950+vx*dt,1380+vy*dt+1100*dt*dt,24,dt*14)}}
  // sunny rays sparkle
  for(let i=0;i<8;i++){const an=t*.8+i*Math.PI/4;star(920+Math.cos(an)*150,250+Math.sin(an)*150,14*(.6+.4*Math.sin(t*5+i)),.9,'#FFD66B')}}
 if(t>=T.s5){sparkles(t,9,18,[40,120,1000,1500],'#FFD66B',.8);confettiRain(t,T.s5+.2,30,70,51,200);if(t>28.4)sparkles(t,12,30,[100,200,880,1300],'#FFD66B',P(t,28.4,28.9))}
};
window.ready=Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode().catch(()=>{}))]);
</script></body></html>`;
fs.writeFileSync(path.join(__dirname, 'anim.html'), html);
console.log('anim.html', (html.length / 1e6).toFixed(1), 'MB');
