#!/usr/bin/env node
//
// Offline reducer experiments from per-ROI histograms (raw_histogram).
// Reconstructs candidate reducers (mean, mode, soft-dominant variants,
// stored median-cut), applies the capture's per-channel WB gain, and
// compares median ΔE2000 vs expected. Works on any capture that has a
// histogram (photo path, and iOS RAW once wired). Edit the `reducers` map
// to try new algorithms — no re-decode needed.
//
// On the uniform Munsell chart chips every reducer converges (one colour
// cluster per patch); the experiment discriminates on textured real-soil
// captures (multiple clusters), which is where soft-dominant could win.
//
// Usage:
//   node scripts/munsell-reducer-experiment.js <run.json>
//   produce the input with:  analyze-fixtures … --emit-histograms
const fs = require('fs');
const J = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const caps = J.captures || [];
const excluded = new Set(J.excluded_chips || []);
const med = a => { if(!a.length) return null; a=[...a].sort((x,y)=>x-y); return a[a.length>>1]; };
// sRGB gamma <-> linear
const s2l = g => g <= 0.04045 ? g/12.92 : Math.pow((g+0.055)/1.055, 2.4);
// bin (6-bit) -> linear color
function binColor(idx){ const r=(idx>>12)&63, g=(idx>>6)&63, b=idx&63; return [s2l(r/63), s2l(g/63), s2l(b/63)]; }
// Lab + dE2000 (same as compare-clip.js)
function lin2xyz(r,g,b){return[0.4124*r+0.3576*g+0.1805*b,0.2126*r+0.7152*g+0.0722*b,0.0193*r+0.1192*g+0.9505*b];}
const F=t=>t>Math.pow(6/29,3)?Math.cbrt(t):t/(3*(6/29)**2)+4/29;
function lab(v){const[X,Y,Z]=lin2xyz(Math.max(0,v[0]),Math.max(0,v[1]),Math.max(0,v[2]));const fx=F(X/0.95047),fy=F(Y),fz=F(Z/1.08883);return[116*fy-16,500*(fx-fy),200*(fy-fz)];}
function dE(l1,l2){const[L1,a1,b1]=l1,[L2,a2,b2]=l2;const C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2);const aC=(C1+C2)/2;const G=0.5*(1-Math.sqrt(aC**7/(aC**7+25**7)));const a1p=a1*(1+G),a2p=a2*(1+G);const C1p=Math.hypot(a1p,b1),C2p=Math.hypot(a2p,b2);const aCp=(C1p+C2p)/2;const h=(ap,bp)=>{if(ap===0&&bp===0)return 0;let x=Math.atan2(bp,ap)*180/Math.PI;return x<0?x+360:x;};const h1=h(a1p,b1),h2=h(a2p,b2);const dL=L2-L1,dC=C2p-C1p;let dh;if(C1p*C2p===0)dh=0;else{let d=h2-h1;dh=d>180?d-360:d<-180?d+360:d;}const dH=2*Math.sqrt(C1p*C2p)*Math.sin(dh*Math.PI/360);let ah;if(C1p*C2p===0)ah=h1+h2;else{let d=Math.abs(h1-h2);ah=d>180?(h1+h2+360)/2:(h1+h2)/2;}const T=1-0.17*Math.cos((ah-30)*Math.PI/180)+0.24*Math.cos(2*ah*Math.PI/180)+0.32*Math.cos((3*ah+6)*Math.PI/180)-0.2*Math.cos((4*ah-63)*Math.PI/180);const aLp=(L1+L2)/2;const SL=1+0.015*(aLp-50)**2/Math.sqrt(20+(aLp-50)**2);const SC=1+0.045*aCp;const SH=1+0.015*aCp*T;const dTh=30*Math.exp(-(((ah-275)/25)**2));const RC=2*Math.sqrt(aCp**7/(aCp**7+25**7));const RT=-RC*Math.sin(2*dTh*Math.PI/180);return Math.sqrt((dL/SL)**2+(dC/SC)**2+(dH/SH)**2+RT*(dC/SC)*(dH/SH));}

// parse flat histogram -> [{c:[r,g,b], n}] sorted by n desc
function parseHist(h){ const out=[]; for(let i=0;i<h.length;i+=2){ out.push({c:binColor(h[i]), n:h[i+1]}); } out.sort((a,b)=>b.n-a.n); return out; }
const wmean = bins => { let s=[0,0,0],N=0; for(const b of bins){s[0]+=b.c[0]*b.n;s[1]+=b.c[1]*b.n;s[2]+=b.c[2]*b.n;N+=b.n;} return N?[s[0]/N,s[1]/N,s[2]/N]:[0,0,0]; };
const dist = (a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
// soft-dominant: cluster bins within `radius` (linear) of the top bin; if that
// cluster holds >= `frac` of pixels, return its weighted centroid; else mean.
function softDom(bins, radius, frac){ if(!bins.length) return [0,0,0]; const top=bins[0].c; const N=bins.reduce((s,b)=>s+b.n,0); const cl=bins.filter(b=>dist(b.c,top)<=radius); const cn=cl.reduce((s,b)=>s+b.n,0); return cn/N>=frac ? wmean(cl) : wmean(bins); }

const reducers = {
  histMean: h => wmean(h),
  mode:     h => h[0].c,
  soft_r05_f50: h => softDom(h, 0.05, 0.5),
  soft_r05_f70: h => softDom(h, 0.05, 0.7),
  soft_r10_f60: h => softDom(h, 0.10, 0.6),
};
const results = {storedMean:[], storedDominant:[]};
for(const k of Object.keys(reducers)) results[k]=[];
let n=0;
for(const c of caps){
  for(const cell of (c.cells||[])){
    if(cell.is_reference||cell.delta_e==null) continue;
    if(excluded.has(cell.expected_notation)) continue;
    const raw=cell.raw_linear_rgb, meas=cell.measured_linear_rgb, exp=cell.expected_linear_rgb, hist=cell.raw_histogram, dom=cell.raw_linear_rgb_dominant;
    if(!raw||!meas||!exp||!hist||!hist.length) continue;
    n++;
    const gain=raw.map((v,i)=>v>1e-6?meas[i]/v:0);
    const apply=col=>dE(lab(col.map((v,i)=>gain[i]*v)), lab(exp));
    results.storedMean.push(cell.delta_e);
    if(dom) results.storedDominant.push(apply(dom));
    const bins=parseHist(hist);
    for(const [k,fn] of Object.entries(reducers)) results[k].push(apply(fn(bins)));
  }
}
console.log('cells with histogram:', n, '\n');
console.log('reducer'.padEnd(16), 'median ΔE');
const rows=[['storedMean(=mean)',results.storedMean],['storedDominant',results.storedDominant],...Object.keys(reducers).map(k=>[k,results[k]])];
for(const [name,arr] of rows) console.log('  '+name.padEnd(16), (med(arr)??0).toFixed(2), ' (n='+arr.length+')');
