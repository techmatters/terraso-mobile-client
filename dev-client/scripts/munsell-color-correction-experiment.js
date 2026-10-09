#!/usr/bin/env node
//
// Per-device color-correction experiment. See docs/munsell-capture-findings.md.
// Usage: node scripts/munsell-color-correction-experiment.js <run.json> [greycard|whibal|self]
// Finding: a per-device matrix does NOT beat a good in-scene-neutral WB — it
// only compensates for imperfect WB. The self-anchor floor is scatter (noise),
// not a correctable transform.
//
// Per-device color-correction experiment. After a practical grey WB, fit a
// correction (3x3, 3x3+offset, degree-2 root-polynomial) that maps measured
// -> expected, per device, on a TRAIN split of captures; report median
// ΔE2000 on a HELD-OUT test split. Quantifies how much a per-device "soil
// profile" would claw back of the intrinsic color-science error.
const fs=require('fs');
const J=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const ANCHOR=process.argv[3]||"greycard"; const caps=J.captures||[]; const excluded=new Set(J.excluded_chips||[]);
const dev=c=>{const m=c.image_metadata?.model||'';if(/iphone/i.test(m))return 'iPhone';const pm=m.match(/pixel\s*(\d+[a-z]*)/i);if(pm)return 'Pixel '+pm[1];return 'other';};
const med=a=>{if(!a.length)return null;a=[...a].sort((x,y)=>x-y);return a[a.length>>1];};
// Lab + dE2000
function lin2xyz(r,g,b){return[0.4124*r+0.3576*g+0.1805*b,0.2126*r+0.7152*g+0.0722*b,0.0193*r+0.1192*g+0.9505*b];}
const F=t=>t>Math.pow(6/29,3)?Math.cbrt(t):t/(3*(6/29)**2)+4/29;
function lab(v){const[X,Y,Z]=lin2xyz(Math.max(0,v[0]),Math.max(0,v[1]),Math.max(0,v[2]));const fx=F(X/0.95047),fy=F(Y),fz=F(Z/1.08883);return[116*fy-16,500*(fx-fy),200*(fy-fz)];}
function dE(l1,l2){const[L1,a1,b1]=l1,[L2,a2,b2]=l2;const C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2);const aC=(C1+C2)/2;const G=0.5*(1-Math.sqrt(aC**7/(aC**7+25**7)));const a1p=a1*(1+G),a2p=a2*(1+G);const C1p=Math.hypot(a1p,b1),C2p=Math.hypot(a2p,b2);const aCp=(C1p+C2p)/2;const h=(ap,bp)=>{if(ap===0&&bp===0)return 0;let x=Math.atan2(bp,ap)*180/Math.PI;return x<0?x+360:x;};const h1=h(a1p,b1),h2=h(a2p,b2);const dL=L2-L1,dC=C2p-C1p;let dh;if(C1p*C2p===0)dh=0;else{let d=h2-h1;dh=d>180?d-360:d<-180?d+360:d;}const dH=2*Math.sqrt(C1p*C2p)*Math.sin(dh*Math.PI/360);let ah;if(C1p*C2p===0)ah=h1+h2;else{let d=Math.abs(h1-h2);ah=d>180?(h1+h2+360)/2:(h1+h2)/2;}const T=1-0.17*Math.cos((ah-30)*Math.PI/180)+0.24*Math.cos(2*ah*Math.PI/180)+0.32*Math.cos((3*ah+6)*Math.PI/180)-0.2*Math.cos((4*ah-63)*Math.PI/180);const aLp=(L1+L2)/2;const SL=1+0.015*(aLp-50)**2/Math.sqrt(20+(aLp-50)**2);const SC=1+0.045*aCp;const SH=1+0.015*aCp*T;const dTh=30*Math.exp(-(((ah-275)/25)**2));const RC=2*Math.sqrt(aCp**7/(aCp**7+25**7));const RT=-RC*Math.sin(2*dTh*Math.PI/180);return Math.sqrt((dL/SL)**2+(dC/SC)**2+(dH/SH)**2+RT*(dC/SC)*(dH/SH));}
// features
const fLin=m=>[m[0],m[1],m[2]];
const fAff=m=>[m[0],m[1],m[2],1];
const fRoot=m=>{const sq=(a,b)=>Math.sqrt(Math.max(0,a*b));return[m[0],m[1],m[2],sq(m[0],m[1]),sq(m[0],m[2]),sq(m[1],m[2])];};
// least squares: fit W (3 x K) minimizing ||X W^T - Y||^2 via normal eqns per channel
function solve(A,b){ // A: KxK, b: K -> x (Gaussian elim)
  const K=A.length; const M=A.map((r,i)=>[...r,b[i]]);
  for(let c=0;c<K;c++){ let p=c; for(let r=c+1;r<K;r++) if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r; [M[c],M[p]]=[M[p],M[c]]; const pv=M[c][c]||1e-12; for(let r=0;r<K;r++){ if(r===c)continue; const f=M[r][c]/pv; for(let k=c;k<=K;k++) M[r][k]-=f*M[c][k]; } }
  return M.map((r,i)=>r[K]/(r[i]||1e-12));
}
function fit(feats,targets){ const K=feats[0].length; const XtX=Array.from({length:K},()=>Array(K).fill(0)); const Xty=[[],[],[]].map(()=>Array(K).fill(0));
  for(let n=0;n<feats.length;n++){ const x=feats[n],y=targets[n]; for(let i=0;i<K;i++){ for(let j=0;j<K;j++) XtX[i][j]+=x[i]*x[j]; for(let o=0;o<3;o++) Xty[o][i]+=x[i]*y[o]; } }
  return [0,1,2].map(o=>solve(XtX,Xty[o])); } // W: 3 rows of length K
const apply=(W,x)=>W.map(row=>row.reduce((s,w,i)=>s+w*x[i],0));

// gather greycard-anchored rows per device
const byDev={};
caps.forEach((c,ci)=>{ if((ANCHOR==="self" ? c.wb_correction?.source!=="auto" : c.wb_correction?.reference!=="ref_card:"+ANCHOR))return; const d=dev(c); if(d==='other')d; (byDev[d]=byDev[d]||[]).push([c,ci]); });
for(const d of ['iPhone','Pixel 7','Pixel 4']){ const list=byDev[d]||[]; if(list.length<6){console.log(d,'too few');continue;}
  const train=[],test=[];
  for(const [c,ci] of list){ const bucket=(ci%2===0)?train:test; for(const cell of (c.cells||[])){ if(cell.is_reference||cell.delta_e==null||excluded.has(cell.expected_notation))continue; const m=cell.measured_linear_rgb,e=cell.expected_linear_rgb,rw=cell.raw_linear_rgb; if(!m||!e||!rw)continue; const mx=Math.max(rw[0],rw[1],rw[2]); if(mx>=0.98||mx<0.02)continue; bucket.push({m,e,de:cell.delta_e}); } }
  if(train.length<30||test.length<30){console.log(d,"too few clean chips (train="+train.length+" test="+test.length+")");continue;} const base=med(test.map(r=>r.de));
  const models={'3x3':fLin,'3x3+off':fAff,'rootpoly2':fRoot};
  const out=[d.padEnd(8),'base='+base.toFixed(2)];
  for(const [name,ff] of Object.entries(models)){ const W=fit(train.map(r=>ff(r.m)),train.map(r=>r.e)); const des=test.map(r=>dE(lab(apply(W,ff(r.m))),lab(r.e))); out.push(name+'='+med(des).toFixed(2)); }
  console.log(out.join('  '), ' (train chips='+train.length+', test='+test.length+')');
}
