
(function(){
  var m=document.getElementById('loadmsg');
  function fatal(msg){ m.hidden=false; m.textContent=msg }
  if(!window.THREE){ fatal('3D 引擎加载失败，请刷新页面重试。'); return }
  try{ startGame(); initHelp(); m.hidden=true; }catch(e){ fatal('启动失败：'+(e&&e.message||e)); }
  function initHelp(){
    var h=document.getElementById('help'), seen=false;
    try{seen=localStorage.getItem('gearlab.help')==='1'}catch(e){}
    function close(){h.hidden=true; try{localStorage.setItem('gearlab.help','1')}catch(e){}}
    document.getElementById('bHelpOk').addEventListener('click',close);
    document.getElementById('bHelp').addEventListener('click',function(){h.hidden=false});
    if(!seen && !document.body.classList.contains('career')) h.hidden=false;
  }
  window.startGame=startGame;
  function startGame(){

(function(){
'use strict';
/* ===== constants: scene unit = 1 cm ===== */
var M=0.2, TH=0.6, GAP=1.0, BASE=0.15, TAU2=Math.PI*2;
function layerColor(l){return new THREE.Color().setHSL((0.09+l*0.19)%1,0.55,0.52)}
function maxLayer(){var m=0;for(var i=0;i<G.length;i++)if(G[i].layer>m)m=G[i].layer;return m}
var noRebuild=false, G=[], comps=[], nextId=1, paused=false;
var careerMode=!new URLSearchParams(location.search).has('sandbox'), career=null, careerRunning=0, careerGears=[], refitStart=0, careerLimit=Infinity, careerBroken=false;
var airDrag=1, bearingDrag=1;
var P={tau:1, rpm:120, cap:300, mu:0.05, inf:false, heatOff:false, fxOff:false, bhOn:false, bbOn:false, hard:false, chart:false, accel:100, rpmL:Math.log10(120), rpmS:'120', mul:1, capB:0, capT:0, capG:0, q:1, snd:true, bgm:true, mat:'steel', autoQ:true, color:null}, GRAV=9.81, ETA=0.98;
/* ===== materials: SI properties (density, specific heat, melting point, latent heat, tensile strength) ===== */
var MATS={
 steel:{k:'steel',name:'合金钢',rho:7850,cp:490,Tm:1700,Lf:2.7e5,uts:9.0e8,col:0x9ea6ad,met:0.92,rou:0.36,eps:0.8,temper:true,cf:0.55},
 alu:{k:'alu',name:'铝合金',rho:2700,cp:900,Tm:930,Lf:3.97e5,uts:3.1e8,col:0xc4cacf,met:0.95,rou:0.3,eps:0.3,temper:false,cf:0.5},
 brass:{k:'brass',name:'黄铜',rho:8500,cp:380,Tm:1180,Lf:1.6e5,uts:4.2e8,col:0xc9a04a,met:0.95,rou:0.32,eps:0.35,temper:false,cf:0.5},
 ti:{k:'ti',name:'钛合金',rho:4430,cp:526,Tm:1900,Lf:3.7e5,uts:9.5e8,col:0x9a9ca0,met:0.9,rou:0.4,eps:0.5,temper:false,cf:0.6},
 w:{k:'w',name:'钨',rho:19300,cp:134,Tm:3695,Lf:1.92e5,uts:9.8e8,col:0x6d7176,met:0.9,rou:0.38,eps:0.45,temper:false,cf:0.6},
 nylon:{k:'nylon',name:'MC901 尼龙',rho:1150,cp:1700,Tm:493,Lf:1.7e5,uts:8.0e7,col:0xe6dfcc,met:0,rou:0.55,eps:0.9,temper:false,cf:0.8},
 pom:{k:'pom',name:'POM 聚甲醛',rho:1410,cp:1460,Tm:438,Lf:1.5e5,uts:6.5e7,col:0xc9d3d0,met:0,rou:0.43,eps:0.88,temper:false,cf:0.78},
 s45c:{k:'s45c',name:'S45C 中碳钢',rho:7850,cp:480,Tm:1730,Lf:2.7e5,uts:6.9e8,col:0x9ea6ad,met:0.92,rou:0.36,eps:0.75,temper:true,cf:0.55},
 sus303:{k:'sus303',name:'SUS303 不锈钢',rho:7930,cp:500,Tm:1670,Lf:2.6e5,uts:6.2e8,col:0xbfc9cf,met:0.94,rou:0.30,eps:0.45,temper:false,cf:0.57},
 scm415:{k:'scm415',name:'SCM415 渗碳钢',rho:7850,cp:470,Tm:1750,Lf:2.7e5,uts:9.0e8,col:0x858f9e,met:0.93,rou:0.32,eps:0.73,temper:true,cf:0.58},
 carbon:{k:'carbon',name:'碳纤维复合轮缘',rho:1700,cp:950,Tm:620,Lf:2e5,uts:1.6e9,col:0x505c6b,met:0.28,rou:0.44,eps:0.83,temper:false,cf:0.71},
 ceramic:{k:'ceramic',name:'自约束陶瓷',rho:2850,cp:780,Tm:2550,Lf:4e5,uts:1.9e9,col:0xdfc9aa,met:0.18,rou:0.44,eps:0.78,temper:false,cf:0.64},
 lattice:{k:'lattice',name:'主动承载晶格',rho:2200,cp:590,Tm:3250,Lf:5e5,uts:3e9,col:0x72a89d,met:0.73,rou:0.32,eps:0.63,temper:false,cf:0.66},
 field:{k:'field',name:'场束缚轮缘',rho:1800,cp:530,Tm:4350,Lf:8e5,uts:4e9,col:0xa7a5d8,met:0.81,rou:0.30,eps:0.58,temper:false,cf:0.7},
 singular:{k:'singular',name:'奇点锚定轮缘',rho:1500,cp:610,Tm:5400,Lf:9e5,uts:5e9,col:0xcdbe8a,met:0.88,rou:0.27,eps:0.57,temper:false,cf:0.73}
};
var MAT_KEYS=['steel','alu','brass','ti','w','nylon'];
function fT(m,T){var c=m.cf*m.Tm,w=0.1*m.Tm; function sg(x){return 1/(1+Math.exp((x-c)/w))} return Math.max(0.003,sg(Math.min(T,1e6))/sg(293.15))}   /* strength retained at temperature T */
var hardStat={teeth:0,burst:0,melt:0,shaft:0};
function hpush(f){history.push(f); if(history.length>100) history.shift()}
var tool='place', teeth=20, layer=0, selected=null, history=[];

function rOf(n){return M*n/2}
function tipSpeed(g){return g ? Math.abs(g.omega)*(g.r+M)/100 : 0}
function lY(l){return BASE+l*GAP}
function ang2(dx,dz){return Math.atan2(-dz,dx)}   // world angle: (x,z)=R(cos a,-sin a)

/* ===== three setup ===== */
var stage=document.getElementById('stage');
var renderer=new THREE.WebGLRenderer({antialias:true});
var pr=Math.min(window.devicePixelRatio||1,1.5); renderer.setPixelRatio(pr);
stage.appendChild(renderer.domElement);
var scene=new THREE.Scene();
scene.background=new THREE.Color(0x12161a);
scene.fog=new THREE.Fog(0x12161a,350,4000);
var camera=new THREE.PerspectiveCamera(45,1,0.05,120000);
camera.position.set(12,30,36);
var controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.target.set(8,0,0);
controls.enableDamping=true; controls.dampingFactor=0.12;
controls.maxPolarAngle=Math.PI/2-0.03; controls.minDistance=1.5; controls.maxDistance=60000;
controls.update();
var hemi=new THREE.HemisphereLight(0xdfe7ee,0x2a2f35,0.95); scene.add(hemi);
var sun=new THREE.DirectionalLight(0xfff1d8,0.95); sun.position.set(40,90,30); scene.add(sun); scene.add(sun.target);
var fill=new THREE.DirectionalLight(0x8fb4d8,0.35); fill.position.set(-50,30,-40); scene.add(fill);
var ground=new THREE.Mesh(new THREE.PlaneGeometry(100000,100000),new THREE.MeshStandardMaterial({color:0x1a2026,roughness:1,metalness:0,envMapIntensity:0}));
ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
/* shadows: one sun, frustum fitted to the gears, refreshed only while something moves */
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate=false;
sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); sun.shadow.bias=-0.0005; sun.shadow.normalBias=0.04;
var shadowDirty=true;
function fitShadow(){
  var x0=1e18,x1=-1e18,z0=1e18,z1=-1e18,y1=2,i,g;
  for(i=0;i<G.length;i++){g=G[i]; x0=Math.min(x0,g.x-g.r-M); x1=Math.max(x1,g.x+g.r+M); z0=Math.min(z0,g.z-g.r-M); z1=Math.max(z1,g.z+g.r+M); y1=Math.max(y1,lY(g.layer)+TH)}
  if(x1<x0){x0=-10;x1=10;z0=-10;z1=10}
  var cx=(x0+x1)/2, cz=(z0+z1)/2, ext=Math.min(400,Math.max((x1-x0),(z1-z0),y1*1.5,10)*0.62+3);
  sun.target.position.set(cx,0,cz);
  sun.position.set(cx+0.40*ext*4,0.85*ext*4,cz+0.30*ext*4);
  var c=sun.shadow.camera; c.left=-ext; c.right=ext; c.top=ext; c.bottom=-ext; c.near=0.5; c.far=ext*10; c.updateProjectionMatrix();
  shadowDirty=true;
}
/* procedural studio environment (sky gradient + soft boxes) for metal reflections */
var envOn=false;
(function(){
  try{
    var es=new THREE.Scene();
    /* sky gradient as vertex colours on a basic material: a custom ShaderMaterial would skip the RGBE encoding PMREM expects and come out blown-out white */
    var sg=new THREE.SphereGeometry(50,32,16), sp=sg.attributes.position, cl=new Float32Array(sp.count*3), vi, hy, t, cc;
    for(vi=0;vi<sp.count;vi++){
      hy=sp.getY(vi)/50;
      if(hy>0){t=Math.pow(hy,0.6); cc=[0.16+0.14*t,0.18+0.17*t,0.20+0.22*t]} else {t=Math.pow(-hy,0.5); cc=[0.16-0.13*t,0.18-0.145*t,0.20-0.16*t]}
      cl[vi*3]=cc[0]; cl[vi*3+1]=cc[1]; cl[vi*3+2]=cc[2];
    }
    sg.setAttribute('color',new THREE.BufferAttribute(cl,3));
    es.add(new THREE.Mesh(sg,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
    function box(w,h,col,x,y,z){var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:col,side:THREE.DoubleSide})); m.position.set(x,y,z); m.lookAt(0,0,0); es.add(m)}
    box(30,18,new THREE.Color(2.2,2.0,1.8),20,36,14);
    box(8,34,new THREE.Color(0.8,1.2,2.0),-40,12,-8);
    box(26,6,new THREE.Color(1.2,1.1,1.0),-6,18,-40);
    box(18,10,new THREE.Color(0.9,0.8,0.7),12,6,42);
    var pm=new THREE.PMREMGenerator(renderer); var rt0=pm.fromScene(es,0.03); scene.environment=rt0.texture; pm.dispose(); envOn=true;
    hemi.intensity=0.4; sun.intensity=1.0; fill.intensity=0.25;
  }catch(e){envOn=false}
})();
var grid=new THREE.GridHelper(2000,200,0x3b4853,0x252d34); grid.position.y=0.01; scene.add(grid);
var grid2=new THREE.GridHelper(2000,2000,0x20272d,0x20272d); grid2.position.y=0.005; grid2.visible=false;
var gridBig=new THREE.GridHelper(200000,2000,0x3b4853,0x252d34); gridBig.position.y=0.01; gridBig.visible=false; scene.add(gridBig);

var composer=null, bloom=null, bloomOn=false, warpPass=null;
function resize(){
  var w=stage.clientWidth||window.innerWidth, h=stage.clientHeight||window.innerHeight;
  renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
  if(composer){composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w,h)}
}
if(window.ResizeObserver) new ResizeObserver(resize).observe(stage);
window.addEventListener('resize',resize); resize();

/* ===== gear geometry: 20° involute teeth, bevelled edges, real area and polar moment ===== */
var PA=20*Math.PI/180, INVP=Math.tan(PA)-PA, COSPA=Math.cos(PA);
function invA(rho,rb){if(rho<=rb) return 0; var a=Math.acos(rb/rho); return Math.tan(a)-a}
function axR(n){return Math.min(0.25,Math.max(0.03,rOf(n)*0.2))}
function bearingRadius(n){return axR(n)*0.96/100}
function rootR(n){var r=rOf(n); return Math.max(r-1.25*M,r*0.45)}
function smoothSides(geo){
  var pos=geo.attributes.position, nor=geo.attributes.normal, cnt=pos.count, map=new Map(), i, key, a, o, x, y, z, nx, ny, l;
  for(i=0;i<cnt;i++){
    if(Math.abs(nor.getZ(i))>0.05) continue;
    key=Math.round(pos.getX(i)*2000)+','+Math.round(pos.getY(i)*2000);
    a=map.get(key); if(!a){a=[]; map.set(key,a)}
    a.push(nor.getX(i),nor.getY(i),0);
  }
  for(i=0;i<cnt;i++){
    if(Math.abs(nor.getZ(i))>0.05) continue;
    key=Math.round(pos.getX(i)*2000)+','+Math.round(pos.getY(i)*2000); a=map.get(key);
    x=nor.getX(i); y=nor.getY(i); nx=0; ny=0;
    for(o=0;o<a.length;o+=3){ if(a[o]*x+a[o+1]*y>0.766){nx+=a[o]; ny+=a[o+1]} }
    l=Math.hypot(nx,ny); if(l>1e-6) nor.setXYZ(i,nx/l,ny/l,0);
  }
  nor.needsUpdate=true;
}
function plateGeo(n,mask,swept){
  var r=rOf(n), Ro=r+M, Rr=rootR(n), rb=r*COSPA, p=TAU2/n, ax=axR(n), i, j, c, q, a;
  var st=n<=60?6:(n<=150?4:(n<=300?3:2)), s0=Math.max(rb,Rr), rad=[Rr];
  if(s0>Rr+1e-6) rad.push(s0);
  for(j=1;j<=st;j++) rad.push(s0+(Ro-s0)*j/st);
  var dl=rad.map(function(v){return Math.min(p*0.45,Math.max(0.05*p,p/4+INVP-invA(v,rb)))});
  var pts=[];
  for(i=0;!swept&&i<n;i++){
    c=i*p;
    if(mask&&mask.has(i)){
      pts.push([Rr,c-dl[0]],[Rr+M*0.38,c-dl[0]*0.55],[Rr+M*0.16,c-dl[0]*0.1],[Rr+M*0.52,c+dl[0]*0.35],[Rr+M*0.1,c+dl[0]*0.8],[Rr,c+dl[0]]);
    } else {
      for(j=0;j<rad.length;j++) pts.push([rad[j],c-dl[j]]);
      if(n<=150) pts.push([Ro,c]);
      for(j=rad.length-1;j>=0;j--) pts.push([rad[j],c+dl[j]]);
    }
    if(n<=150) pts.push([Rr,c+p/2]);
  }
  var xy=pts.map(function(v){return [v[0]*Math.cos(v[1]),v[0]*Math.sin(v[1])]});
  var s=new THREE.Shape(), area=0, J=0, k, u, w, cr;
  for(k=0;k<xy.length;k++){
    u=xy[k]; w=xy[(k+1)%xy.length];
    if(k===0) s.moveTo(u[0],u[1]); else s.lineTo(u[0],u[1]);
    cr=u[0]*w[1]-w[0]*u[1]; area+=cr/2; J+=cr*(u[0]*u[0]+u[0]*w[0]+w[0]*w[0]+u[1]*u[1]+u[1]*w[1]+w[1]*w[1])/12;
  }
  if(swept){
    var core=Rr+.023;
    s.moveTo(core,0);
    for(i=1;i<128;i++){a=i*TAU2/128; s.lineTo(core*Math.cos(a),core*Math.sin(a))}
    area=Math.PI*core*core; J=area*core*core/2;
  }
  s.closePath();
  var hole=new THREE.Path(); hole.absarc(0,0,ax,0,TAU2,true); s.holes.push(hole);
  var ah=Math.PI*ax*ax; area-=ah; J-=Math.PI*ax*ax*ax*ax/2;
  var hubR=Math.max(ax*2.2,Rr*0.2);
  if(Rr>1.8){
    var cnt=Rr<4?5:(Rr<12?6:8), inner=hubR*1.15, outer=Rr*0.86, rc=(inner+outer)/2, hr=Math.min((outer-inner)*0.42,rc*Math.sin(Math.PI/cnt)*0.8);
    for(i=0;i<cnt;i++){
      a=i*TAU2/cnt; var h=new THREE.Path();
      h.absarc(rc*Math.cos(a),rc*Math.sin(a),hr,0,TAU2,true); s.holes.push(h);
      ah=Math.PI*hr*hr; area-=ah; J-=ah*(hr*hr/2+rc*rc);
    }
  }
  var bev=n<=150, bt=bev?0.02:0;
  var geo=new THREE.ExtrudeGeometry(s,{depth:TH-2*bt,bevelEnabled:bev,bevelThickness:0.02,bevelSize:0.014,bevelOffset:0,bevelSegments:1,curveSegments:swept?16:8});
  if(bev) geo.translate(0,0,bt);
  smoothSides(geo);
  geo.rotateX(-Math.PI/2);
  geo.userData={area:Math.max(area,1e-6),J:Math.max(J,1e-9)};
  return geo;
}
var geoCache=new Map();
function gearGeo(n){
  var g=geoCache.get(n);
  if(g){ geoCache.delete(n); geoCache.set(n,g); return g }   /* refresh recency */
  g=plateGeo(n,null); geoCache.set(n,g);
  if(geoCache.size>24){   /* keep memory bounded: drop the oldest geometry no gear or ghost is using */
    var it=geoCache.keys(), k, r;
    while(geoCache.size>24 && !(r=it.next()).done){
      k=r.value; if(k===n||(typeof ghostN!=='undefined'&&k===ghostN)||G.some(function(q){return q.n===k&&!q.ownGeo})) continue;
      geoCache.get(k).dispose(); geoCache.delete(k);
    }
  }
  return g;
}
/* brushed-metal micro roughness (shared) */
var roughTex=null;
try{
  var cvs=document.createElement('canvas'); cvs.width=cvs.height=256;
  var cx2=cvs.getContext('2d'), im=cx2.createImageData(256,256), dd=im.data, rowv=new Float32Array(256), ii, jj, vv;
  for(ii=0;ii<256;ii++) rowv[ii]=Math.random();
  for(jj=0;jj<256;jj++) for(ii=0;ii<256;ii++){
    vv=0.64+0.2*rowv[jj]+0.16*Math.random(); if(Math.random()<0.004) vv*=0.55;
    var o4=(jj*256+ii)*4; dd[o4]=dd[o4+1]=dd[o4+2]=vv*255; dd[o4+3]=255;
  }
  cx2.putImageData(im,0,0);
  roughTex=null;   /* micro texture removed: it aliased into a moire pattern and cost frame time */
}catch(e){roughTex=null}
var pinMat=new THREE.MeshStandardMaterial({color:0xe9e2d0,roughness:0.6});
var steelMat=new THREE.MeshStandardMaterial({color:0x8d969e,metalness:0.85,roughness:0.4,roughnessMap:roughTex});
var motorMat=new THREE.MeshStandardMaterial({color:0xff8a1f,emissive:0x7a3000,roughness:0.5});
var unitCyl=new THREE.CylinderGeometry(1,1,1,24);
var caseMat=new THREE.MeshStandardMaterial({color:0x353e44,metalness:0.68,roughness:0.4});
var finMat=new THREE.MeshStandardMaterial({color:0xaf7841,metalness:0.62,roughness:0.39});
var bracketGeo=new THREE.BoxGeometry(1,1,1);
function motorHousing(g,hubR,hh){
  var mm=new THREE.Group(), r=Math.max(0.38,Math.min(1.05,hubR*1.46));
  function cylinder(mat,rad,height,y){
    var mesh=new THREE.Mesh(unitCyl,mat); mesh.scale.set(rad,height,rad); mesh.position.y=y; mesh.castShadow=true; mm.add(mesh);
  }
  cylinder(steelMat,r*.38,.43,hh+.215);
  cylinder(finMat,r*.76,.14,hh+.47);
  cylinder(caseMat,r,1.14,hh+1.07);
  for(var i=0;i<5;i++) cylinder(finMat,r*1.055,.042,hh+.57+i*.22);
  cylinder(caseMat,r*.89,.18,hh+1.70);
  if(careerMode){
    var rail=new THREE.Mesh(bracketGeo,caseMat), leg=new THREE.Mesh(bracketGeo,caseMat), foot=new THREE.Mesh(bracketGeo,caseMat);
    rail.scale.set(.28,.22,g.r+.63); rail.position.set(0,hh+.49,(g.r+.63)/2);
    leg.scale.set(.35,hh+.55,.35); leg.position.set(0,(hh+.55)/2-BASE,g.r+.55);
    foot.scale.set(.82,.15,.74); foot.position.set(0,.077-BASE,g.r+.55);
    [rail,leg,foot].forEach(function(part){part.castShadow=true; part.receiveShadow=true; mm.add(part)});
  }
  mm.position.set(g.x,lY(g.layer),g.z); mm.visible=false; scene.add(mm); return mm;
}

function baseOf(g){
  var b;
  if(g.cc) b=new THREE.Color(parseInt(g.cc.slice(1),16));
  else {
    b=new THREE.Color(g.mt.col);
    b.lerp(layerColor(g.layer),g.mt.met>0.5?(careerMode ? .035 : .2):.12);
  }
  if(g.motor&&!careerMode) b.lerp(new THREE.Color(0xff8a1f),0.55);
  return b;
}
function refreshBase(g){ g.base=baseOf(g); g.mat.color.copy(g.base); g.lastEm=-1; }
function setGearColor(g,hex){ g.cc=hex||null; refreshBase(g); g.mat.metalness=g.cc?0.3:g.mt.met; g.mat.roughness=g.cc?0.5:g.mt.rou; g.lastEm=-1; }
function machinedFinish(material){
  var applyRadiance=material.onBeforeCompile;
  material.onBeforeCompile=function(shader){
    applyRadiance(shader);
    shader.vertexShader='varying vec3 turnedPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n turnedPosition=position;');
    shader.fragmentShader='varying vec3 turnedPosition;\n'+shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\n'+
      'float turnedPhase=length(turnedPosition.xz)*38.0;\n'+
      'float turnedFace=smoothstep('+(TH-.065).toFixed(3)+','+(TH-.022).toFixed(3)+',turnedPosition.y);\n'+
      'float turnedCut=(0.5+0.5*sin(turnedPhase+0.35*sin(turnedPhase*0.39)))*turnedFace*(1.0-smoothstep(0.46,1.45,fwidth(turnedPhase)));\n'+
      'diffuseColor.rgb*=1.0-0.058*turnedCut; roughnessFactor+=0.082*turnedCut;');
  };
}
function addRimRadiance(g){
  g.discGlow=new THREE.Color(0); g.hubGlow=new THREE.Color(0);
  g.mat.onBeforeCompile=function(shader){
    shader.uniforms.gearRadius={value:g.r+M};
    shader.uniforms.discGlow={value:g.discGlow}; shader.uniforms.hubGlow={value:g.hubGlow};
    shader.vertexShader='varying vec2 gearLocal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngearLocal=position.xz;');
    shader.fragmentShader='varying vec2 gearLocal; uniform float gearRadius; uniform vec3 discGlow,hubGlow;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\nfloat radial=length(gearLocal)/gearRadius;\n'+
      'vec3 innerGlow=mix(hubGlow,discGlow,smoothstep(.26,.64,radial));\n'+
      'totalEmissiveRadiance=mix(innerGlow,totalEmissiveRadiance,smoothstep(.64,.96,radial));');
  };
}
function buildMesh(g){
  var grp=new THREE.Group(), n=g.n, r=g.r, Rr=rootR(n), ax=axR(n), mt=g.mt;
  var base=baseOf(g); g.base=base;
  g.mat=new THREE.MeshStandardMaterial({color:base.clone(),metalness:careerMode?Math.min(.74,mt.met):mt.met,roughness:mt.rou,roughnessMap:roughTex});
  if(careerMode) addRimRadiance(g);
  if(g.cc){g.mat.metalness=0.3; g.mat.roughness=0.5}
  if(careerMode && mt.met>.5) machinedFinish(g.mat);
  var geo=g.broken&&g.broken.size?(g.ownGeo=plateGeo(n,g.broken)):gearGeo(n);
  var body=new THREE.Mesh(geo,g.mat); body.castShadow=true; body.receiveShadow=true; grp.add(body); g.body=body;
  var hubR=Math.max(ax*2.2,Rr*0.2), hh=TH+0.12;
  g.pinMat=pinMat.clone(); g.hubMat=steelMat.clone(); g.hubMat.roughness=0.5;
  var hub=new THREE.Mesh(unitCyl,g.hubMat); hub.scale.set(hubR,hh,hubR); hub.position.y=hh/2; hub.castShadow=true; grp.add(hub); g.hub=hub;
  if(Rr>0.6){
    var mr=Math.min(Rr*0.1,0.14), mk=new THREE.Mesh(unitCyl,g.pinMat);
    mk.scale.set(mr,0.05,mr); mk.position.set(Rr*0.68,TH+0.03,0); grp.add(mk); g.marker=mk;
  }
  g.motorMesh=motorHousing(g,hubR,hh);
  grp.position.set(g.x,lY(g.layer),g.z);
  grp.rotation.y=g.angle;
  g.grp3=grp; scene.add(grp);
}
function disposeGear(g){
  scene.remove(g.grp3); scene.remove(g.motorMesh); g.mat.dispose(); g.hubMat.dispose(); g.pinMat.dispose();
  if(g.ownGeo){g.ownGeo.dispose(); g.ownGeo=null}
}
function retooth(g){
  if(g.ownGeo) g.ownGeo.dispose();
  g.ownGeo=g.broken.size?plateGeo(g.n,g.broken):null;
  g.body.geometry=g.ownGeo||gearGeo(g.n);
}

/* ===== placement: snapping, overlap prevention, tooth phase ===== */
function validAt(x,z,n,l,ignore){
  var r=rOf(n), i, g, d, R;
  for(i=0;i<G.length;i++){
    g=G[i]; if(g===ignore||g.layer!==l) continue;
    R=r+g.r; d=Math.hypot(g.x-x,g.z-z);
    if(d<R-1e-4) return false;
    if(d>R+1e-4 && d<R+3*M-1e-4) return false;
  }
  return true;
}
function circInt(ax,az,ra,bx,bz,rb){
  var dx=bx-ax, dz=bz-az, d=Math.hypot(dx,dz);
  if(d<1e-9||d>ra+rb||d<Math.abs(ra-rb)) return [];
  var a=(ra*ra-rb*rb+d*d)/(2*d), h=Math.sqrt(Math.max(0,ra*ra-a*a));
  var mx=ax+a*dx/d, mz=az+a*dz/d;
  return [[mx+h*dz/d,mz-h*dx/d],[mx-h*dz/d,mz+h*dx/d]];
}
function solvePlace(px,pz,n,l){
  var r=rOf(n), i, g, d, th, best=null, bd=1e18;
  for(i=0;i<G.length;i++){
    g=G[i]; if(g.layer===l) continue;
    d=Math.hypot(g.x-px,g.z-pz); th=Math.max(0.7,0.18*Math.min(r,g.r));
    if(d<th && d<bd && validAt(g.x,g.z,n,l)){best=g; bd=d}
  }
  if(best) return {x:best.x,z:best.z,ok:true};
  if(validAt(px,pz,n,l)) return {x:px,z:pz,ok:true};
  var near=[];
  for(i=0;i<G.length;i++){
    g=G[i]; if(g.layer!==l) continue;
    d=Math.hypot(g.x-px,g.z-pz);
    if(d<r+g.r+6*M) near.push({g:g,d:d});
  }
  near.sort(function(a,b){return a.d-b.d}); near=near.slice(0,6);
  var cands=[], a, b, k, pts, R;
  for(i=0;i<near.length;i++){
    a=near[i].g; R=r+a.r; d=near[i].d;
    var ux=d<1e-6?1:(px-a.x)/d, uz=d<1e-6?0:(pz-a.z)/d;
    cands.push([a.x+ux*R,a.z+uz*R]);
    for(k=i+1;k<near.length;k++){
      b=near[k].g;
      pts=circInt(a.x,a.z,R,b.x,b.z,r+b.r);
      pts.forEach(function(q){cands.push(q)});
    }
  }
  var out=null, od=1e18;
  cands.forEach(function(q){
    var dd=Math.hypot(q[0]-px,q[1]-pz);
    if(dd<od && validAt(q[0],q[1],n,l)){out=q; od=dd}
  });
  if(out) return {x:out[0],z:out[1],ok:true};
  return {x:px,z:pz,ok:false};
}
function phaseFor(x,z,n,l,self){
  var r=rOf(n), i, o, d, phi, fA;
  for(i=0;i<G.length;i++){
    o=G[i]; if(o===self||o.layer!==l) continue;
    d=Math.hypot(o.x-x,o.z-z);
    if(Math.abs(d-(r+o.r))<0.01){
      phi=ang2(x-o.x,z-o.z);
      fA=(phi-o.angle)*o.n/TAU2;
      return phi+Math.PI-TAU2*(0.5-fA)/n;
    }
  }
  for(i=0;i<G.length;i++){
    o=G[i]; if(o===self) continue;
    if(Math.abs(o.x-x)<1e-3&&Math.abs(o.z-z)<1e-3) return o.angle;
  }
  return 0;
}
function meshCountAt(x,z,n,l){
  var c=0, r=rOf(n);
  G.forEach(function(o){ if(o.layer===l && Math.abs(Math.hypot(o.x-x,o.z-z)-(r+o.r))<0.01) c++ });
  return c;
}

/* ===== gears ===== */
function gearMass(geo,mt){return mt.rho*geo.userData.area*1e-4*(TH/100)}
function gearDrag(n){return 0.024*Math.pow(rOf(n)/100,5)}
function addGear(n,x,z,l,angle,motor,mtk,ex){
  var mt=MATS[mtk]||MATS[P.mat]||MATS.steel, geo=gearGeo(n), u=geo.userData, r=rOf(n), rm=r/100, t=TH/100;
  var m=gearMass(geo,mt), I=mt.rho*t*u.J*1e-8;
  var g={id:nextId++,n:n,layer:l,x:x,z:z,r:r,angle:0,omega:0,k:0,comp:null,grp:null,motor:motor||null,
         I:I,mass:m,rm:rm,T:293.15,Tdisc:293.15,Thub:293.15,Tmax:293.15,mt:mt,melt:0,fat:0,broken:new Set(),free:false,F:0,v:0,Qm:0,sig:0,sigT:0,hoop:0,tau:0,Tsh:0,cphi:0};
  if(ex){
    if(Array.isArray(ex.broken)) ex.broken.forEach(function(i){ if(isFinite(i)&&i>=0&&i<n) g.broken.add(i|0) });
    if(isFinite(ex.fat)) g.fat=Math.max(0,Math.min(1,ex.fat));
    g.free=!!ex.free;
    if(typeof ex.color==='string'&&/^#[0-9a-fA-F]{6}$/.test(ex.color)) g.cc=ex.color;
  } else if(P.color) g.cc=P.color;
  g.angle=(angle===undefined)?phaseFor(x,z,n,l,null):angle;
  buildMesh(g); G.push(g);
  g.motorMesh.visible=!!g.motor;
  if(!noRebuild) rebuild();
  return g;
}
function removeGear(g){
  var i=G.indexOf(g); if(i<0) return;
  G.splice(i,1);
  disposeGear(g);
  if(selected===g) selected=null;
  if(!noRebuild) rebuild();
}

/* ===== kinematic graph ===== */
var axles=[], thEdges=[];
function rebuild(){
  var gm=new Map(), i, j, a, b, s;
  for(i=0;i<G.length;i++){
    a=G[i]; var key=a.x.toFixed(4)+','+a.z.toFixed(4);
    // Parked stages share the mounting point without coupling to the driven shaft.
    if(careerMode && a.layer>=careerRunning) key+=',parked';
    s=gm.get(key); if(!s){s={gears:[],k:0,vis:false,edges:[]}; gm.set(key,s)}
    s.gears.push(a); a.grp=s;
  }
  for(i=0;i<G.length;i++){
    a=G[i];
    for(j=i+1;j<G.length;j++){
      b=G[j]; if(a.layer!==b.layer||a.free||b.free) continue;
      var R=a.r+b.r, dx=a.x-b.x; if(Math.abs(dx)>R+0.05) continue;
      var dz=a.z-b.z; if(Math.abs(dz)>R+0.05) continue;
      if(Math.abs(Math.hypot(dx,dz)-R)<0.01){
        a.grp.edges.push([b.grp,a,b]); b.grp.edges.push([a.grp,b,a]);
      }
    }
  }
  comps=[];
  var groups=Array.from(gm.values());
  groups.forEach(function(q){q.hm=q.gears.some(function(g){return !!g.motor})});
  groups.sort(function(x,y){return (y.hm?1:0)-(x.hm?1:0)});
  groups.forEach(function(s0){
    if(s0.vis) return;
    var c={gears:[],motors:[],jam:false,w:0,I:0,b:0,D:0,mesh:0,sh:[],order:[],wp:0}, q=[s0];
    s0.k=1; s0.vis=true;
    while(q.length){
      var A=q.pop(); c.order.push(A);
      A.gears.forEach(function(gg){gg.k=A.k; gg.comp=c; c.gears.push(gg)});
      A.edges.forEach(function(e){
        var kb=-A.k*e[1].n/e[2].n, O=e[0];
        if(O.vis){ if(Math.abs(kb-O.k)>1e-9*Math.max(1,Math.abs(kb))) c.jam=true; }
        else{O.vis=true; O.k=kb; O.par=A; O.pg=e[2]; O.pp=e[1]; q.push(O)}
      });
    }
    var Lw=0, seen=new Set();
    c.gears.forEach(function(g){
      var k=Math.abs(g.k);
      c.I+=g.I*g.k*g.k; Lw+=g.I*g.omega*g.k;
      c.D+=gearDrag(g.n)*k*k*k;
      if(g.motor) c.motors.push(g);
      var sh=g.grp;
      if(!seen.has(sh)){
        seen.add(sh);
        var N=0, rb=1e9;
        sh.gears.forEach(function(q){N+=q.mass*GRAV; rb=Math.min(rb,bearingRadius(q.n))});
        sh.N=N; sh.rb=rb; c.sh.push({N:N,rb:rb,k:Math.abs(sh.k)});
        c.b+=shaftDrag(rb,sh.k);
        c.mesh+=sh.edges.length/2;
      }
    });
    c.w=c.jam?0:Lw/c.I;
    if(c.jam) c.gears.forEach(function(g){g.omega=0});
    comps.push(c);
  });
  thEdges=[];
  groups.forEach(function(sg){
    sg.edges.forEach(function(e){ if(e[1].id<e[2].id) thEdges.push([e[1],e[2],careerMode?.14:8]) });
    if(sg.gears.length>1){ var ls=sg.gears.slice().sort(function(p,q2){return p.layer-q2.layer}); for(var t=1;t<ls.length;t++) thEdges.push([ls[t-1],ls[t],careerMode?.85:15,true]) }
  });
  refreshAxles(groups);
  fitShadow();
}
function refreshAxles(groups){
  axles.forEach(function(m){scene.remove(m)}); axles=[];
  groups.forEach(function(s){
    var low=1e9, high=-1e9, rad=1e9;
    s.gears.forEach(function(g){
      var gl=0, k, o;
      if(g.layer>0){
        for(k=0;k<G.length;k++){
          o=G[k]; if(o.layer>=g.layer) continue;
          var d=Math.hypot(o.x-g.x,o.z-g.z);
          if(d>1e-3 && d<o.r+M+0.2){gl=lY(g.layer)-0.35;break}
        }
      }
      if(careerMode && g===G[careerRunning*2]) gl=lY(g.layer)-0.12;
      low=Math.min(low,gl); high=Math.max(high,lY(g.layer)+TH+0.18); rad=Math.min(rad,axR(g.n)*0.96);
    });
    var m=new THREE.Mesh(unitCyl,steelMat);
    m.scale.set(rad,high-low,rad); m.position.set(s.gears[0].x,(high+low)/2,s.gears[0].z);
    m.castShadow=true; m.userData.gear=s.gears[0]; scene.add(m); axles.push(m);
  });
}

/* ===== physics: one generalised coordinate per connected gear train ===== */
function shaftDrag(radius,ratio){return 2e-3*radius*ratio*ratio}
function shaftFriction(load,radius,ratio){return P.mu*load*radius*Math.abs(ratio)}
function cFric(c){var t=0; for(var i=0;i<c.sh.length;i++) t+=shaftFriction(c.sh[i].N,c.sh[i].rb,c.sh[i].k); return t*bearingDrag}
function loadSlope(linear,drag,net){return (linear+Math.hypot(linear,2*Math.sqrt(drag*net)))/2}
function estimateCareer(geometry,environment,drive){
  var count=geometry[0], input=geometry[1], upper=geometry[2], driven=geometry[3], mt=MATS[geometry[4]];
  var ms=gearMass(gearGeo(driven),mt), mu=gearMass(gearGeo(upper),mt), k=1;
  var firstRadius=bearingRadius(input), bearing=environment[1];
  var friction=shaftFriction(gearMass(gearGeo(input),mt)*GRAV,firstRadius,k);
  var linear=shaftDrag(firstRadius,k), drag=0, rb=bearingRadius(driven);
  for(var i=0;i<count;i++){
    var teeth=i===0?input:upper;
    drag+=gearDrag(teeth)*k*k*k;
    k*=teeth/driven;
    drag+=gearDrag(driven)*k*k*k;
    friction+=shaftFriction((ms+(i+1<count?mu:0))*GRAV,rb,k);
    linear+=shaftDrag(rb,k);
  }
  var net=drive[0]*Math.pow(ETA,count)-friction*bearing;
  if(net<=0) return 0;
  linear=linear*bearing+drive[0]/(drive[1]*TAU2/60);
  return net/loadSlope(linear,drag*environment[0],net)*k*60/TAU2;
}
function infStep(c,dt,w0){
  var g0=c.motors[0], eta=Math.pow(ETA,c.mesh), wOld=c.w, wNew=g0.k!==0?w0/g0.k:0, n=c.motors.length;
  c.w=wNew;
  var Tref=c.I*(wNew-wOld)/dt+(wNew===0?0:(wNew>0?1:-1))*cFric(c)+(c.b+c.D*Math.abs(wNew))*wNew;
  var Pw=Math.abs(Tref*wNew)/eta/n;
  c.motors.forEach(function(m){
    var mo=m.motor; mo.T=Math.abs(Tref)/Math.abs(m.k)/eta/n; mo.Tt=Math.max(mo.Tt||0,mo.T);
    mo.used=(mo.used||0)+Pw*dt; mo.Tpk=Math.max(mo.Tpk||0,mo.T);
  });
}
function supply(E){var t=Math.min(1,E/0.2); return t*t*(3-2*t)}
function physics(dt){
  var ci, c, mi, g, A, B, s, ts, w0=W0, end=careerGears[careerGears.length-1];
  for(ci=0;ci<comps.length;ci++){
    c=comps[ci];
    if(c.jam){c.w=0; continue;}
    if(P.inf && c.motors.length){infStep(c,dt,w0); continue;}
    A=0; B=0; var eta=Math.pow(ETA,c.mesh);
    for(mi=0;mi<c.motors.length;mi++){
      g=c.motors[mi]; s=supply(g.motor.E); ts=P.tau*s;
      A+=ts*g.k*eta; B+=ts/w0*g.k*g.k;
    }
    for(mi=0;mi<c.motors.length;mi++){ g=c.motors[mi]; s=supply(g.motor.E); g.motor.Tt=Math.max(g.motor.Tt||0,s*P.tau*Math.abs(1-g.k*c.w/w0)) }
    var friction=cFric(c), linear=B+c.b*bearingDrag, drag=c.D*airDrag, inertia=c.I;
    var net=Math.abs(A)-friction;
    if(careerMode && net>0){
      // Bound spin-up time without changing the speed at which drive and load balance.
      inertia=Math.min(inertia,8*loadSlope(linear,drag,net));
    }
    var priorW=c.w, limited=false;
    var den=inertia+dt*(linear+drag*Math.abs(c.w));
    var w1=(inertia*c.w+dt*A)/den;
    var fr=friction*dt/den, aw=Math.abs(w1);
    c.w=(aw<=fr)?0:(w1>0?1:-1)*(aw-fr);
    if(end && c===end.comp){
      var cap=careerLimit*TAU2/(60*Math.abs(end.k));
      limited=Math.abs(c.w)>cap;
      if(limited) c.w=Math.sign(c.w)*cap;
    }
    if(careerMode) c.loadAccel=limited?0:(c.w-priorW)*inertia/(c.I*dt);
    if(!careerMode && Math.abs(c.w)<1e-7) c.w=0;
    for(mi=0;mi<c.motors.length;mi++){
      g=c.motors[mi]; s=supply(g.motor.E);
      var tj=s*P.tau*(1-g.k*c.w/w0);
      var pin=w0*Math.max(tj,0)+0.03*P.tau*w0*(s>0?1:0);
      if(!careerMode) g.motor.E=Math.max(0,g.motor.E-pin*dt/P.cap);
      g.motor.T=Math.max(tj,0); g.motor.Tt=Math.max(g.motor.Tt||0,g.motor.T); g.motor.used=(g.motor.used||0)+pin*dt; g.motor.Tpk=Math.max(g.motor.Tpk||0,g.motor.T);
    }
  }
  for(ci=0;ci<G.length;ci++){
    g=G[ci];
    if(!isFinite(g.comp.w)) g.comp.w=0;
    g.omega=g.comp.w*g.k;
    if(!isFinite(g.omega)) g.omega=0;
    g.angle=(g.angle+g.omega*dt)%TAU2;
  }
}

/* ===== ghost preview ===== */
var ghost=null, ghostN=0, ghostMat=new THREE.MeshStandardMaterial({color:0x86c46d,transparent:true,opacity:0.55});
var ghostInfo=null;
function ensureGhost(){
  if(ghost && ghostN===teeth) return;
  if(ghost) scene.remove(ghost);
  ghost=new THREE.Mesh(gearGeo(teeth),ghostMat); ghostN=teeth; ghost.visible=false; scene.add(ghost);
}
function hideGhost(){ if(ghost) ghost.visible=false; ghostInfo=null; }

/* ===== pointer ===== */
var ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
function planePoint(ev,y){
  var rc=renderer.domElement.getBoundingClientRect();
  ndc.set(((ev.clientX-rc.left)/rc.width)*2-1,-((ev.clientY-rc.top)/rc.height)*2+1);
  ray.setFromCamera(ndc,camera);
  var o=ray.ray.origin, d=ray.ray.direction;
  if(Math.abs(d.y)<1e-6) return null;
  var t=(y-o.y)/d.y; if(t<0) return null;
  return {x:o.x+d.x*t,z:o.z+d.z*t};
}
function pickGear(ev){
  for(var l=maxLayer();l>=0;l--){
    var p=planePoint(ev,lY(l)+TH/2); if(!p) continue;
    var best=null, bd=1e18;
    for(var i=0;i<G.length;i++){
      var g=G[i]; if(g.layer!==l) continue;
      var d=Math.hypot(g.x-p.x,g.z-p.z);
      if(d<g.r+M*0.8 && d<bd){best=g; bd=d}
    }
    if(best) return best;
  }
  return null;
}
var ackTeeth=0; try{ if(localStorage.getItem('gearlab.warned')==='1') ackTeeth=-1 }catch(e){}
function acked(){return ackTeeth===-1}
function updateGhost(ev){
  if(tool!=='place'||(teeth>500&&!acked())){hideGhost(); return;}
  var p=planePoint(ev,lY(layer)+TH/2); if(!p){hideGhost(); return;}
  ensureGhost();
  var s=solvePlace(p.x,p.z,teeth,layer);
  ghost.position.set(s.x,lY(layer),s.z);
  ghost.rotation.y=phaseFor(s.x,s.z,teeth,layer,null);
  ghostMat.color.setHex(s.ok?0x86c46d:0xea5a4f);
  ghost.visible=true; ghostInfo=s;
}
function toast(msg,bad){
  var t=document.getElementById('toast'); t.textContent=msg; t.className='on'+(bad?' bad':'');
  clearTimeout(toast.h); toast.h=setTimeout(function(){t.className=''},1800);
}
function doPlace(ev){
  var p=planePoint(ev,lY(layer)+TH/2); if(!p) return;
  if(teeth>500&&!acked()){
    var rr=rOf(teeth)/50; $('warnTxt').textContent=teeth+' 齿的齿轮直径约 '+(rr<10?rr.toFixed(1):Math.round(rr))+' 米，建模有 '+(teeth*7).toLocaleString()+' 个轮廓点。第一次生成模型时手机可能卡几秒甚至更久，放多个会持续偏卡，低端手机可能闪退。建议先导出存档再放。要继续吗？（这个提示只会出现这一次）';
    $('warn').style.display='flex';
    var pe={clientX:ev.clientX,clientY:ev.clientY};
    $('warnNo').onclick=function(){$('warn').style.display='none'};
    $('warnYes').onclick=function(){$('warn').style.display='none'; ackTeeth=-1; try{localStorage.setItem('gearlab.warned','1')}catch(e){} toast('正在生成 '+teeth+' 齿模型，请稍候…'); setTimeout(function(){doPlace(pe)},60)};
    return;
  }
  var s=solvePlace(p.x,p.z,teeth,layer);
  if(!s.ok){toast('这里放不下：会与同层齿轮重叠',true); return;}
  var mc=meshCountAt(s.x,s.z,teeth,layer);
  var g=addGear(teeth,s.x,s.z,layer,undefined,null,P.mat);
  hpush(function(){removeGear(g)});
  var coax=g.grp.gears.length>1;
  toast(teeth+' 齿 · 第'+(layer+1)+'层'+(mc?' · 啮合 '+mc+' 个':'')+(coax?' · 已共轴相连':''));
}
function doMotor(g){
  var had=!!g.motor;
  g.motor=had?null:{E:1}; g.motorMesh.visible=!had; refreshBase(g); rebuild();
  hpush(function(){g.motor=had?{E:1}:null; g.motorMesh.visible=had; refreshBase(g); rebuild()});
  toast(had?'已拆下马达':'已装上马达，能源已满');
}
function doDel(g){
  var snap={n:g.n,x:g.x,z:g.z,l:g.layer,a:g.angle,m:g.motor,mt:g.mt.k,ex:{broken:Array.from(g.broken),fat:g.fat,free:g.free,color:g.cc}};
  removeGear(g);
  hpush(function(){addGear(snap.n,snap.x,snap.z,snap.l,snap.a,snap.m,snap.mt,snap.ex)});
  toast('已拆除 '+snap.n+' 齿齿轮');
}
var down=null, cv=renderer.domElement;
cv.addEventListener('pointerdown',function(e){
  $('acts').hidden=true; $('bMenu').style.borderColor='';
  down={x:e.clientX,y:e.clientY,t:performance.now(),moved:false};
  if(tool==='place') updateGhost(e);
});
cv.addEventListener('pointermove',function(e){
  if(down && Math.hypot(e.clientX-down.x,e.clientY-down.y)>8) down.moved=true;
  if(tool==='place' && (e.pointerType==='mouse'||down) && !(down&&down.moved)) updateGhost(e);
  else if(down&&down.moved) hideGhost();
});
cv.addEventListener('pointerup',function(e){
  var d=down; down=null;
  if(!d||d.moved||performance.now()-d.t>600){hideGhost(); return;}
  if(tool==='place') doPlace(e);
  else{
    var g=pickGear(e);
    if(!g){ if(tool==='sel') selected=null; }
    else if(tool==='motor') doMotor(g);
    else if(tool==='del') doDel(g);
    else if(tool==='sel') selected=(selected===g?null:g);
  }
  if(e.pointerType!=='mouse') hideGhost(); else updateGhost(e);
});
cv.addEventListener('pointerleave',function(e){ if(e.pointerType==='mouse') hideGhost(); });
cv.addEventListener('pointercancel',function(){down=null; hideGhost()});

/* ===== UI ===== */
function $(id){return document.getElementById(id)}
function setTeeth(v){
  v=Math.round(Number(v)); if(!isFinite(v)) return;
  teeth=Math.max(1,Math.min(10000,v)); $('tr').value=Math.round(Math.log10(teeth)*250); $('tn').value=teeth;
  document.querySelectorAll('#chips button').forEach(function(b){b.classList.toggle('on',Number(b.dataset.n)===teeth)});
}
[8,12,16,20,24,32,40,60,100,200,360,500,1000,3000,10000].forEach(function(n){
  var b=document.createElement('button'); b.textContent=n; b.dataset.n=n;
  b.addEventListener('click',function(){setTeeth(n)}); $('chips').appendChild(b);
});
$('tr').addEventListener('input',function(){var v=Math.round(Math.pow(10,this.value/250)); teeth=Math.max(1,Math.min(10000,v)); $('tn').value=teeth; document.querySelectorAll('#chips button').forEach(function(b){b.classList.toggle('on',Number(b.dataset.n)===teeth)})});
$('tn').addEventListener('input',function(){var v=Number(this.value); if(this.value!==''&&isFinite(v)&&v>=1&&v<=10000){teeth=Math.round(v); $('tr').value=Math.round(Math.log10(teeth)*250)}});
$('tn').addEventListener('change',function(){setTeeth(this.value||teeth)});
$('tm').addEventListener('click',function(){setTeeth(teeth-1)});
$('tp').addEventListener('click',function(){setTeeth(teeth+1)});
function setLayer(v){
  v=Math.round(Number(v)); if(!isFinite(v)||v<1) v=1;
  layer=v-1; $('ln').value=v; hideGhost();
  controls.target.y=lY(layer);
}
$('ln').addEventListener('change',function(){setLayer(this.value)});
$('lm').addEventListener('click',function(){setLayer(layer)});
$('lp').addEventListener('click',function(){setLayer(layer+2)});
$('bFit').addEventListener('click',function(){
  if(!G.length){toast('还没有齿轮',true);return}
  var x0=1e18,x1=-1e18,z0=1e18,z1=-1e18,y1=0;
  G.forEach(function(g){x0=Math.min(x0,g.x-g.r);x1=Math.max(x1,g.x+g.r);z0=Math.min(z0,g.z-g.r);z1=Math.max(z1,g.z+g.r);y1=Math.max(y1,lY(g.layer))});
  var cx=(x0+x1)/2,cz=(z0+z1)/2,ext=Math.max(x1-x0,z1-z0,y1,4);
  var dir=camera.position.clone().sub(controls.target).normalize();
  controls.target.set(cx,y1/2,cz);
  camera.position.copy(controls.target).add(dir.multiplyScalar(ext*1.5/Math.tan(camera.fov*Math.PI/360)*0.6+ext*0.5));
  controls.update();
});
function setTool(t){
  if(t===tool){ var sh=$('sh-'+t); sh.classList.toggle('on'); measureDock(); return; }
  tool=t; hideGhost();
  document.querySelectorAll('#tools button').forEach(function(b){b.classList.toggle('on',b.dataset.t===t)});
  document.querySelectorAll('.sheet').forEach(function(s){s.classList.toggle('on',s.id==='sh-'+t)});
  measureDock();
}
document.querySelectorAll('#tools button').forEach(function(b){b.addEventListener('click',function(){setTool(b.dataset.t)})});
function measureDock(){document.documentElement.style.setProperty('--dockh',$('dock').offsetHeight+'px')}
measureDock(); setTimeout(measureDock,300); window.addEventListener('resize',measureDock);

$('bDet').addEventListener('click',function(){var h=$('hud'); h.hidden=!h.hidden; this.style.borderColor=h.hidden?'':'var(--brass)'});
$('bMenu').addEventListener('click',function(){var h=$('acts'); h.hidden=!h.hidden; this.style.borderColor=h.hidden?'':'var(--brass)'});
$('bPause').addEventListener('click',function(){paused=!paused; this.textContent=paused?'继续':'暂停'});
$('bCharge').addEventListener('click',function(){
  var n=0, fx=0; G.forEach(function(g){if(g.motor){g.motor.E=1;g.motor.used=0;g.motor.Tpk=0;n++}
    g.T=g.Tdisc=g.Thub=g.Tmax=T0; g.melt=0; g.fat=0; g.lastTm=-1;
    if(g.broken.size||g.free){g.broken.clear(); g.free=false; retooth(g); fx++}});
  if(fx) rebuild();
  toast((n?'已为 '+n+' 个马达补满能源，':'还没有马达，')+'全部降温'+(fx?'，修复了 '+fx+' 个损坏的齿轮':''),!n&&!fx);
});
$('bUndo').addEventListener('click',function(){
  var f=history.pop(); if(f){f(); toast('已撤销')} else toast('没有可撤销的操作',true);
});
var clearArmed=false;
$('bClear').addEventListener('click',function(){
  var b=this;
  if(!clearArmed){clearArmed=true; b.textContent='再点一次确认'; setTimeout(function(){clearArmed=false; b.textContent='清空'},2500); return;}
  clearArmed=false; b.textContent='清空';
  G.slice().forEach(disposeGear); G.length=0; selected=null; history=[]; clearDebris(); hardStat.teeth=hardStat.burst=hardStat.melt=hardStat.shaft=0; rebuild(); toast('已清空');
});
var MULE=[0,1,3,5,7], W0=120*TAU2/60, EXT=0, WL=80;
/* parse a possibly astronomically large number ("1e500", "2.5e1000", "10^400") into log10; null if invalid */
function parseL(str){
  str=String(str).trim().replace(/[×x*]\s*10\s*\^/i,'e').replace(/^10\s*\^\s*/,'1e').replace(/,/g,'');
  var m=/^([0-9]*\.?[0-9]+)(?:e\s*([+-]?[0-9]+))?$/i.exec(str);
  if(!m) return null;
  var a=parseFloat(m[1]); if(!(a>0)) return null;
  var e=m[2]?parseInt(m[2],10):0; if(!isFinite(e)) return null;
  return Math.log10(a)+e;
}
function pv(id,old){var L=parseL($(id).value); if(L===null) return old; return Math.pow(10,Math.min(L,300))}
function pv0(id,old){var t=$(id).value.trim(); if(t==='0'||t==='') return 0; var L=parseL(t); if(L===null) return old; return Math.pow(10,Math.min(L,300))}
function fmtL(L){ if(L<6) return fmt(Math.pow(10,L)); var e=Math.floor(L), m=Math.pow(10,L-e); return m.toFixed(3)+'e+'+e }
function extOf(g){ if(EXT<=0) return 0; var w0=W0*(Math.abs(g.k)||1); return EXT*Math.min(1,Math.abs(g.omega)/w0) }
function dispRpm(g){ var e=extOf(g), v=rpmOf(g.omega); return e>0&&v>0?fmtL(Math.log10(v)+e):fmt(v) }
function dispTempL(g){ var T=g.T, e=extOf(g), L=Math.log10(Math.max(T,1)); if(e>0&&T>1e3) L+=0.75*e; if(P.capT>0) L=Math.min(L,Math.log10(P.capT)); return L }
function dispTemp(g){ var L=dispTempL(g); return L>=5?fmtL(L)+' K':fmtK(Math.pow(10,L)) }
function recalcSpeed(){
  var L=P.rpmL+MULE[P.mul-1]+Math.log10(TAU2/60);
  EXT=Math.max(0,L-WL); W0=Math.pow(10,Math.min(L,WL));
  var te=$('effRpm'); if(te) te.textContent=fmtL(P.rpmL+MULE[P.mul-1])+' rpm'+(EXT>0?'（物理引擎上限 1e'+Math.round(WL-Math.log10(TAU2/60))+'，其余按比例外推显示）':'');
  var mt=$('mulTxt'); if(mt) mt.textContent=['×1','×10','×1000','×10⁵','×10⁷'][P.mul-1];
  document.querySelectorAll('#mulChips button').forEach(function(b){b.classList.toggle('on',Number(b.dataset.m)===P.mul)});
}
function syncHeat(){ $('bHeat').classList.toggle('on',!P.heatOff); $('bChart').hidden=P.heatOff; }
$('bHeat').addEventListener('click',function(){
  P.heatOff=!P.heatOff; if(P.heatOff) G.forEach(function(g){g.T=T0});
  syncHeat(); toast(P.heatOff?'已关闭温度和发光：转得再快齿轮也不会变化':'已开启温度和发光');
});
function syncFx(){ $('bFx').classList.toggle('on',!P.fxOff); $('gFx').hidden=P.fxOff; }
$('bFx').addEventListener('click',function(){ P.fxOff=!P.fxOff; syncFx(); toast(P.fxOff?'已关闭时空特效':'已开启时空特效'); });
function syncBH(){ $('bBH').classList.toggle('on',P.bhOn); }
function syncBB(){ $('bBB').classList.toggle('on',P.bbOn); }
$('bBH').addEventListener('click',function(){ P.bhOn=!P.bhOn; if(!P.bhOn) clearBH(); syncBH(); toast(P.bhOn?'已启用黑洞坍缩：边缘速度超过光速时，最快的齿轮会坍缩成黑洞并吞噬周围的齿轮':'已关闭黑洞坍缩'); });
$('bBB').addEventListener('click',function(){ P.bbOn=!P.bbOn; if(!P.bbOn) clearBB(); syncBB(); toast(P.bbOn?'已启用宇宙大爆炸：边缘速度达到光速的 100 倍时触发':'已关闭宇宙大爆炸'); });
MAT_KEYS.forEach(function(k){var o=document.createElement('option'); o.value=k; o.textContent=MATS[k].name; $('mtSel').appendChild(o)});
$('mtSel').addEventListener('change',function(){P.mat=this.value; toast('新放置的齿轮材质：'+MATS[P.mat].name)});
function applyAllColor(c){ P.color=c; G.forEach(function(g){setGearColor(g,c)}); }
$('cSel').addEventListener('input',function(){applyAllColor(this.value); $('cHex').value=this.value});
$('cSel').addEventListener('change',function(){applyAllColor(this.value); toast('全部齿轮已改色，新放置的也用这个颜色（点“默认色”恢复）')});
$('cAll').addEventListener('click',function(){ if($('cHex').value.trim()) hexApply(); else { var c=$('cSel').value; applyAllColor(c); toast('已把全部齿轮改成所选颜色') } });
$('cDef').addEventListener('click',function(){ P.color=null; G.forEach(function(g){setGearColor(g,null)}); toast('已恢复默认的材质颜色') });
function hexApply(){ var v=$('cHex').value.trim(); if(v&&v[0]!=='#') v='#'+v; if(/^#[0-9a-fA-F]{3}$/.test(v)) v='#'+v[1]+v[1]+v[2]+v[2]+v[3]+v[3]; if(/^#[0-9a-fA-F]{6}$/.test(v)){applyAllColor(v.toLowerCase()); $('cSel').value=v.toLowerCase(); $('cHex').value=v.toLowerCase(); toast('已改色 '+v)} else toast('颜色格式应为 #RRGGBB',true) }
$('cHex').addEventListener('change',hexApply);
function syncHard(){ var b=$('bHard'); b.classList.toggle('on',P.hard); document.querySelector('.ttl').textContent=P.hard?'齿轮实验室·硬核':'齿轮实验室'; }
$('bHard').addEventListener('click',function(){
  P.hard=!P.hard;
  if(P.hard){ if(P.heatOff){P.heatOff=false; syncHeat()} toast('硬核模式：齿轮会断齿、疲劳、被离心力撕碎、软化并熔化。受力用刘易斯公式算，强度随温度下降',true) }
  else { toast('已关闭硬核模式：不再损坏（已损坏的齿轮保持原样）') }
  syncHard();
});
function syncChart(){ $('bChart').textContent=P.chart?'色温：图表':'色温：黑体'; }
$('bChart').addEventListener('click',function(){ P.chart=!P.chart; G.forEach(function(g){g.lastTm=-1}); syncChart(); toast(P.chart?'发光颜色改用你给的色温图':'发光颜色改用真实黑体辐射（普朗克定律）'); });
$('bQ').addEventListener('click',function(){ P.q=(P.q+1)%3; P.autoQ=false; applyQuality(); syncQ(); toast('画质：'+QN[P.q]+(P.q===0?'（关闭阴影，降低分辨率）':P.q===1?'（阴影 1024）':'（阴影 2048，高分辨率）')); });
function syncSnd(){ $('bSnd').classList.toggle('on',P.snd); }
$('bSnd').addEventListener('click',function(){ P.snd=!P.snd; sndInit(); syncSnd(); toast(P.snd?'音效已开':'音效已关'); });
function syncBgm(){ $('bBgm').classList.toggle('on',P.bgm); }
$('bBgm').addEventListener('click',function(){ P.bgm=!P.bgm; sndInit(); if(snd.ctx&&snd.ctx.state==='suspended') snd.ctx.resume(); syncBgm(); toast(P.bgm?'背景音乐已开（程序实时生成，随齿轮转速变化）':'背景音乐已关'); });
function syncInf(){P.inf=$('rInf').checked; $('bInf').classList.toggle('on',P.inf)}
function syncSettings(){P.accel=pv('rAcc',P.accel); P.tau=pv('rTau',P.tau); var L=parseL($('rRpm').value); if(L!==null){P.rpmL=L; P.rpmS=$('rRpm').value.trim(); P.rpm=Math.pow(10,Math.min(L,300))} P.cap=pv('rCap',P.cap); P.mu=pv('rMu',P.mu); P.capB=pv0('rCapB',P.capB); P.capT=pv0('rCapT',P.capT); P.capG=pv0('rCapG',P.capG); recalcSpeed(); syncInf()}
[1,2,3,4,5].forEach(function(m){var b=document.createElement('button'); b.textContent=m+'倍'; b.dataset.m=m; b.addEventListener('click',function(){P.mul=m; recalcSpeed(); toast('转速倍率 '+m+'：空载转速 ×'+['1','10','1000','10⁵','10⁷'][m-1])}); $('mulChips').appendChild(b)});
['rTau','rRpm','rCap','rMu','rAcc','rCapB','rCapT','rCapG'].forEach(function(id){$(id).addEventListener('input',syncSettings)});
$('rInf').addEventListener('change',syncSettings);
$('bInf').addEventListener('click',function(){$('rInf').checked=!$('rInf').checked; syncSettings(); toast(P.inf?'已开启无限扭矩与能源：只统计用量，不扣除':'已关闭无限模式')});
recalcSpeed();
$('bSet').addEventListener('click',function(){$('settings').classList.add('on')});
$('bClose').addEventListener('click',function(){$('settings').classList.remove('on')});
$('settings').addEventListener('pointerdown',function(e){if(e.target===this) this.classList.remove('on')});

/* ===== HUD ===== */
function fmt(v){return v>=1e6||(v>0&&v<1e-3)?v.toExponential(3):v.toFixed(v<10?3:1)}
function rpmOf(w){return Math.abs(w)*60/TAU2}
function updateHud(){
  var motors=[], jams=0;
  G.forEach(function(g){if(g.motor) motors.push(g)});
  comps.forEach(function(c){if(c.jam) jams++});
  $('cnt').textContent=G.length+' 个齿轮 · '+motors.length+' 个马达';
  var sel=selected, html;
  if(sel && G.indexOf(sel)<0){selected=null; sel=null}
  if(sel){
    var c=sel.comp, st=c.jam?'<span class="bad">卡死：传动比或转向互相矛盾</span>':(Math.abs(sel.omega)>1e-4?(sel.omega>=0?'正转':'反转'):'静止');
    var v=Math.abs(sel.omega)*sel.r/100;
    var hs2=sel.mt.name+' · '+(sel.mass*1000).toFixed(sel.mass<0.1?2:0)+' g'+(sel.F>0?' · 齿根应力 '+((P.hard?sel.sigT:sel.sig)/1e6).toFixed(1)+' MPa（强度 '+(sel.mt.uts*fT(sel.mt,sel.T)/1e6).toFixed(0)+'）':'')+(P.hard?' · 疲劳 '+(sel.fat*100).toFixed(0)+'% · 离心 '+(sel.hoop/1e6).toFixed(1)+' MPa'+(sel.melt>0?' · 熔化 '+(sel.melt*100).toFixed(0)+'%':'')+(sel.broken.size?' · 断齿 '+sel.broken.size:'')+(sel.free?' · 已脱离啮合':''):'');
    html=sel.n+' 齿 · 第'+(sel.layer+1)+'层 · '+dispRpm(sel)+' rpm · 线速度 '+(extOf(sel)>0?fmtL(Math.log10(Math.max(v,1e-300))+extOf(sel)):fmt(v))+' m/s<br><span class="dim">'+st+(sel.motor?' · 带马达':'')+' · 马达装在此轴，启动需 ≥ '+(c.jam?'∞':(cFric(c)/Math.abs(sel.k)/Math.pow(ETA,c.mesh)).toExponential(2))+' N·m</span><br><span class="dim">'+hs2+'</span>';
  } else if(jams){
    html='<span class="bad">有 '+jams+' 组齿轮卡死（红色）：啮合成环时传动比矛盾，无法转动。</span>';
  } else {
    var mxg=null,mx=0; G.forEach(function(g){var r=rpmOf(g.omega); if(r>mx){mx=r; mxg=g}});
    html='<span class="dim">最快转速 </span>'+(mxg?dispRpm(mxg):fmt(0))+' rpm';
  }
  if(P.hard) html+='<br><span class="bad">硬核损坏统计：断齿 '+hardStat.teeth+' · 断轴 '+hardStat.shaft+' · 爆裂 '+hardStat.burst+' · 熔毁 '+hardStat.melt+'</span>';
  if(G.length && !P.heatOff){
    var fg=G[0], fm=-1;
    G.forEach(function(g){var k=Math.abs(g.omega); if(k>fm||(k===fm&&g.T>fg.T)){fm=k; fg=g}});
    html+='<br><span class="dim">'+(fm>0?'最快':'最热')+'齿轮 '+fg.n+' 齿 · 温度 '+dispTemp(fg)+'，'+heatDesc(Math.pow(10,Math.min(300,dispTempL(fg))))+'</span>';
  }
  if(!P.fxOff && betaMax>=1e-6 && betaG){
    var bex=extOf(betaG); html+='<br><span class="dim">边缘线速度 '+(bex>0&&!(P.capB>0)?fmtL(Math.log10(Math.abs(betaG.omega)*(betaG.r+M)/100)+bex):fmt(Math.abs(betaG.omega)*(betaG.r+M)/100))+' m/s · '+(bex>0&&!(P.capB>0)?fmtL(Math.log10(betaMax*100)+bex)+'%':fmtPct(betaMax))+' 光速，'+relDesc(betaMax)+'</span>';
  }
  $('sel').innerHTML=html;
  var smx=0, sg=null;
  G.forEach(function(g){var k=Math.abs(g.omega); if(k>smx){smx=k; sg=g}});
  var sm=G.length+' 齿轮 · '+(sg?dispRpm(sg):fmt(0))+' rpm';
  if(!P.heatOff&&sg&&sg.T>400) {var dl=dispTempL(sg); sm+=' · '+(dl>=5?fmtL(dl):Math.round(Math.pow(10,dl)))+' K'}
  if(!P.fxOff&&betaMax>=1e-4) sm+=' · '+((betaG&&extOf(betaG)>0&&!(P.capB>0))?fmtL(Math.log10(betaMax*100)+extOf(betaG))+'%':fmtPct(betaMax))+' c';
  $('sum').textContent=sm;
  if(motors.length){
    var e=0,T=0,Tpk=0,U=0;
    motors.forEach(function(g){e+=g.motor.E; T=Math.max(T,g.motor.T||0); Tpk=Math.max(Tpk,g.motor.Tpk||0); U+=g.motor.used||0});
    e/=motors.length; if(P.inf) e=1;
    var bar=$('ebar'); bar.style.width=(e*100).toFixed(1)+'%'; bar.style.background=P.inf?'var(--brass)':(e>0.2?'var(--ok)':(e>0?'var(--brass)':'var(--bad)'));
    var fe=function(v){return v===0?'0':(v>=1e5||v<1e-2)?v.toExponential(2):v.toFixed(3)};
    $('etxt').innerHTML=(P.inf?'扭矩与能源 ∞（只统计，不扣除）':'马达平均能源 '+(e*100).toFixed(0)+'%'+(e<=0?' · 已耗尽，靠惯性减速':''))+'<br>当前扭矩 '+fe(T)+' N·m · 峰值 '+fe(Tpk)+' N·m · 已用能源 '+fe(U)+' J';
  } else {
    $('ebar').style.width='0'; $('etxt').textContent='没有马达：用“马达”工具点一个齿轮';
  }
}

/* ===== heat: air drag + bearing friction vs convection and radiation ===== */
var T0=293.15, T04=Math.pow(293.15,4), SIG=5.67e-8;
var careerThermalClock=3;
function heat(g,dt){
  var w=Math.abs(g.omega), rm=g.rm;
  var A=2.3*Math.PI*rm*rm+2*Math.PI*rm*0.006+1e-8;
  var ea=g.mt.eps*SIG*A;
  var Q=0.024*airDrag*Math.pow(rm,5)*w*w*w + bearingDrag*P.mu*g.mass*GRAV*(axR(g.n)*0.96/100)*w + (g.Qm||0);
  if(careerMode){
    // Half of the shaft's viscous loss heats the mounted gears. The bearing takes the rest.
    Q+=0.5*bearingDrag*shaftDrag(g.grp.rb,1)*w*w/g.grp.gears.length;
    // A local speed-driven heat source keeps the visual temperature gradient readable in vacuum.
    var rim=tipSpeed(g), target=T0+700*Math.log1p(Math.pow(rim/125,1.5));
    var rimHeat=ea*(Math.pow(target,4)-T04);
    // Only a bounded share of drivetrain losses heats the visible disc at extreme loads.
    Q=rimHeat+Math.min(Q,.55*(rimHeat+ea*(Math.pow(450,4)-T04)));
  }
  var h=(10+12*Math.sqrt(w*rm))*Math.sqrt(airDrag), mc=g.mass*g.mt.cp, ha=h*A;
  var Tp=g.T;
  if(!(Q<1e250)){ g.T=Math.exp((Math.log(0.024*airDrag)+5*Math.log(rm)+3*Math.log(w)-Math.log(g.mt.eps*SIG*A))/4); if(!isFinite(g.T)) g.T=Tp; if(P.capT>0&&g.T>P.capT) g.T=P.capT; return }
  if(!careerMode){g.T=coolStep(Tp,Q,ea,ha,mc,dt); return}
  g.T=coolStep(Tp,Q,ea,ha,mc*.45,dt);
  g.Tdisc=coolStep(g.Tdisc,0,ea*.38,ha*.38,mc*.40,dt);
  g.Thub=coolStep(g.Thub,0,ea*.14,ha*.14,mc*.15,dt);
  exchangeHeat(g,'T',mc*.45,g,'Tdisc',mc*.40,mc*.40/6,dt);
  exchangeHeat(g,'Tdisc',mc*.40,g,'Thub',mc*.15,mc*.15/14,dt);
}
function coolStep(Tp,Q,ea,ha,mc,dt){
  if(Q/ha<0.5&&Tp<T0+1) return T0+Q/ha;
  var Te=Math.pow(Q/ea+T04,0.25);
  var T=Math.max(Tp,Te), i, t2, f, d;
  for(i=0;i<40;i++){
    t2=T*T;
    f=mc*(T-Tp)/dt+ea*(t2*t2-T04)+ha*(T-T0)-Q;
    d=mc/dt+4*ea*t2*T+ha;
    var nt=T-f/d; if(nt<T0) nt=T0;
    if(Math.abs(nt-T)<1e-7*T){T=nt;break}
    T=nt;
  }
  return isFinite(T)?T:Tp;
}
function exchangeHeat(a,fieldA,ca,b,fieldB,cb,k,dt){
  var Q=(a[fieldA]-b[fieldB])*-Math.expm1(-k*dt*(1/ca+1/cb))/(1/ca+1/cb);
  a[fieldA]-=Q/ca; b[fieldB]+=Q/cb;
}
/* Blackbody emission: Planck spectrum x CIE 1931 matching functions (Wyman 2013 fit) -> XYZ -> sRGB.
   Brightness is the visible luminance on a log scale, 1.0 at the Sun's 5772 K. */
var BBN=600, BBLO=Math.log10(400), BBHI=9, BBR=new Float32Array(BBN), BBG=new Float32Array(BBN), BBB=new Float32Array(BBN), BBT=new Float32Array(BBN);
(function(){
  function gg(l,m,s1,s2){var t=(l-m)/(l<m?s1:s2); return Math.exp(-0.5*t*t)}
  function xyz(T){
    var X=0,Y=0,Z=0,l,x,B;
    for(l=380;l<=780;l+=10){
      x=1.4387769e7/(l*T); if(x>600) continue;
      B=Math.pow(l,-5)/Math.expm1(x);
      X+=B*(1.056*gg(l,599.8,37.9,31)+0.362*gg(l,442,16,26.7)-0.065*gg(l,501.1,20.4,26.2));
      Y+=B*(0.821*gg(l,568.8,46.9,40.5)+0.286*gg(l,530.9,16.3,31.1));
      Z+=B*(1.217*gg(l,437,11.8,36)+0.681*gg(l,459,26,13.8));
    }
    return [X,Y,Z];
  }
  function enc(v){v=Math.max(0,Math.min(1,v)); return v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-0.055}
  var Yref=xyz(5772)[1], i, T, c, r, g, b, m, br;
  for(i=0;i<BBN;i++){
    T=Math.pow(10,BBLO+(BBHI-BBLO)*i/(BBN-1)); c=xyz(T);
    r=3.2406*c[0]-1.5372*c[1]-0.4986*c[2]; g=-0.9689*c[0]+1.8758*c[1]+0.0415*c[2]; b=0.0557*c[0]-0.2040*c[1]+1.0570*c[2];
    r=Math.max(0,r); g=Math.max(0,g); b=Math.max(0,b); m=Math.max(r,g,b)||1;
    BBR[i]=enc(r/m); BBG[i]=enc(g/m); BBB[i]=enc(b/m);
    br=c[1]>0?(Math.log10(c[1]/Yref)+10.5)/10.5:0; BBT[i]=Math.max(0,Math.min(1,br));
  }
})();
function bbLut(T,out){
  if(!(T>=400)){out.setRGB(0,0,0); return 0}
  var u=(Math.log10(Math.min(T,1e9))-BBLO)/(BBHI-BBLO)*(BBN-1), i=Math.min(BBN-2,Math.floor(u)), f=u-i;
  out.setRGB(BBR[i]+(BBR[i+1]-BBR[i])*f, BBG[i]+(BBG[i+1]-BBG[i])*f, BBB[i]+(BBB[i+1]-BBB[i])*f);
  return BBT[i]+(BBT[i+1]-BBT[i])*f;
}
var CHART=[[1900,255,0,45],[2500,255,128,10],[3000,255,165,0],[3200,255,214,0],[3300,255,240,0],[3400,255,246,120],[3500,255,248,190],[4500,255,252,235],[5500,255,255,255],[6500,255,255,255],[7000,150,235,245],[9000,40,200,235],[10000,85,150,240],[12000,20,40,235],[18000,0,0,235]];
function chartColor(T,out){
  var n=CHART.length, i;
  if(T<=CHART[0][0]){out.setRGB(1,0,0.18); return}
  if(T>=CHART[n-1][0]){out.setRGB(0,0,235/255); return}
  for(i=1;i<n;i++) if(T<=CHART[i][0]) break;
  var a=CHART[i-1], b=CHART[i], f=(T-a[0])/(b[0]-a[0]);
  out.setRGB((a[1]+(b[1]-a[1])*f)/255,(a[2]+(b[2]-a[2])*f)/255,(a[3]+(b[3]-a[3])*f)/255);
}
function bb(T,out){var b=bbLut(T,out); if(careerMode){out.convertSRGBToLinear(); return b*sstep(750,1200,T)} if(b>0&&P.chart) chartColor(T,out); return b}
function sstep(a,b,x){var t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t)}
var HEAT=[[0,'常温'],[330,'发烫，像热水'],[373,'比沸水更烫'],[800,'灼热，但还没发光（约 800 K 起开始发红）'],[950,'暗红，刚开始发光（电炉丝、炭火）'],[1250,'橙红，和岩浆差不多（约 1000~1500 K）'],[1500,'橙黄，接近蜡烛火焰（约 1400 K）'],[1800,'钢已经熔化（钢的熔点约 1800 K）'],[1900,'蜡烛光（1900 K），红色'],[2000,'黎明或黄昏的阳光（2000~3000 K），橙色'],[2700,'钨丝灯泡（2700~3200 K），橙黄色'],[3200,'3200 K 摄影棚灯，黄色'],[3300,'石英灯（3300 K），亮黄色'],[3400,'3400 K 摄影棚灯、白色暖调荧光灯（3500 K），淡黄色'],[4000,'清晨或下午的阳光（4000~5000 K），近乎白色'],[4500,'白色冷调荧光灯（4500 K）、闪光灯泡（4200~5000 K）'],[5500,'日光、电子闪光灯（5500 K），白色；太阳表面 5772 K'],[6500,'日光型荧光灯（6500 K），白色'],[6600,'阴天（6500~7500 K），偏浅青的白'],[8000,'蓝天白云（8000~10000 K），天蓝色'],[10000,'日荫下（10000 K），蓝色'],[12000,'晴朗的蓝天（12000~25000 K），深蓝色'],[25000,'超过 2.5 万 K：颜色不再变化，亮度随温度无限增加'],[1e6,'超过太阳日冕（约 100 万 K），亮度仍在无限增加'],[1e7,'接近太阳核心（约 1500 万 K）'],[1e8,'比太阳核心还热']];
function heatDesc(T){var d=HEAT[0][1]; for(var i=0;i<HEAT.length;i++) if(T>=HEAT[i][0]) d=HEAT[i][1]; return d}
function fmtK(T){return T>=1e5?T.toExponential(2)+' K':Math.round(T)+' K（'+Math.round(T-273.15)+' °C）'}

/* ===== glow: emissive surface + additive halo, colours from blackbody temperature ===== */
function gainOf(T){var v=T<25000?1+3*sstep(1200,6000,T):4*Math.sqrt(T/25000); return P.capG>0?Math.min(v,P.capG):v}   /* HDR radiance boost: emission far above display white, which bloom turns into glare */
// Keep warm stages below the strongest bloom so blue-white terminal stages read as hotter.
function gearGlowGain(T){return careerMode?1.05+2.8*sstep(4000,19000,T):gainOf(T)}
var TEMPER=[[440,0xa7adb3],[470,0xd7c48f],[500,0xc9a24a],[530,0xa86a3a],[553,0x7c4d8e],[573,0x3c56a0],[593,0x6f94c4],[650,0x7a858e],[760,0x59616a],[900,0x2e3236]], tcol=new THREE.Color(), tcol2=new THREE.Color();
function temperTint(T,out){   /* oxide-film colours of steel, set by the highest temperature ever reached (they stay after cooling) */
  var i, n=TEMPER.length;
  if(T<=TEMPER[0][0]) return 0;
  if(T>=TEMPER[n-1][0]){out.setHex(TEMPER[n-1][1]); return 0.9}
  for(i=1;i<n;i++) if(T<=TEMPER[i][0]) break;
  var a=TEMPER[i-1], b=TEMPER[i], f=(T-a[0])/(b[0]-a[0]);
  out.setHex(a[1]); tcol2.setHex(b[1]); out.lerp(tcol2,f);
  return Math.min(0.85,(T-440)/40*0.85);
}
function glowAt(T,out){
  var b=bb(T,out);
  out.multiplyScalar(b*gearGlowGain(T));
  return b;
}
function look(g,dt){
  var em=g.comp&&g.comp.jam?0x5a1410:(g===selected?0x3d3210:(g.motor&&!careerMode?0x2e1a00:0x000000)), mt=g.mt;
  var T=g.T, hot=(careerMode?Math.max(T,g.Tdisc,g.Thub):T)>=700;
  if(!(hot||g.wasHot||g.lastEm!==em||(!careerMode&&g.lastTm!==g.Tmax)||g.melt>0||g.lastMelt)) return;
  g.mat.color.copy(g.base);
  if(!careerMode&&mt.temper&&g.Tmax>440){ var am=temperTint(g.Tmax,tcol); if(am>0) g.mat.color.lerp(tcol,am) }
  g.mat.emissive.setHex(em);
  g.hubMat.color.setHex(0x8d969e); g.hubMat.emissive.setHex(0); g.pinMat.color.setHex(0xe9e2d0); g.pinMat.emissive.setHex(0);
  if(careerMode){
    if(glowAt(T,hc)>0) g.mat.emissive.copy(hc);
    if(glowAt(g.Tdisc,g.discGlow)===0) g.discGlow.setHex(em);
    var hubGlow=glowAt(g.Thub,g.hubGlow);
    g.hubMat.color.multiplyScalar(1-.85*hubGlow); g.hubMat.emissive.copy(g.hubGlow);
    g.pinMat.emissive.copy(g.discGlow);
    if(hubGlow===0) g.hubGlow.setHex(em);
  }else if(hot){
    var b=bb(T,hc);
    if(b>0){
      var flicker=1+.045*Math.sin(performance.now()/55+g.id*1.7)+.03*Math.sin(performance.now()/23+g.id*3.1);
      var k=1-.85*b, e=Math.min(1e3,b*gearGlowGain(T)*flicker);
      g.mat.color.multiplyScalar(k); g.mat.emissive.copy(hc).multiplyScalar(e);
      g.hubMat.color.multiplyScalar(k); g.hubMat.emissive.copy(hc).multiplyScalar(e);
      g.pinMat.color.multiplyScalar(k); g.pinMat.emissive.copy(hc).multiplyScalar(e);
    }
  }
  if(!g.pull){
    var ms=g.melt||0, sg=P.hard?sstep(0.75*mt.Tm,mt.Tm,Math.min(T,1e9))*0.08:0;
    g.grp3.scale.set(1+0.22*ms,Math.max(0.2,1-0.55*ms-sg),1+0.22*ms);
  }
  g.wasHot=hot; g.lastEm=em; g.lastTm=g.Tmax; g.lastMelt=g.melt>0;
}
var hotLights=[], tmpC=new THREE.Color();
for(var li=0;li<4;li++){var pl=new THREE.PointLight(0xffaa55,0,0,1); scene.add(pl); hotLights.push(pl)}
function updateLight(){
  var hs=[], i, tmax=0;
  if(P.heatOff){for(i=0;i<4;i++) hotLights[i].intensity=0; bloomOn=false; hazeSel=[]; spark.emit=[]; return}
  hs=top4(900); tmax=top4.max; hazeSel=top4(600); spark.emit=top4(1200);
  for(i=0;i<4;i++){
    var L=hotLights[i], hg=hs[i];
    if(!hg){L.intensity=0; continue}
    var hb=bb(hg.T,tmpC); L.color.copy(tmpC);
    var pos=hg.grp3.position;
    L.position.set(pos.x,pos.y+Math.max(6,hg.r*.8),pos.z);
    L.distance=careerMode?Math.max(14,(hg.r+M)*6,pos.y*1.9):(hg.r+8)*12;
    L.intensity=Math.min(60,hb*gearGlowGain(hg.T)*.45);
  }
  bloomOn=!!composer&&tmax>=1400;
  if(bloom){
    var ex=Math.min(2,Math.max(0,Math.log10(tmax/25000)));
    bloom.strength=careerMode?.28+.45*sstep(1600,15000,tmax):.45+.9*sstep(1800,8000,tmax)+.6*ex;
    bloom.radius=careerMode?.54:.7+.15*ex;
  }
}

/* ===== sparks and embers thrown off hot gears ===== */
var hazeSel=[];
var spark={N:700,pos:null,vel:null,col:null,bcol:null,life:null,age:null,pts:null,head:0,emit:[],acc:[0,0,0,0]};
function ensureSparks(){
  if(spark.pts) return;
  var N=spark.N, geo=new THREE.BufferGeometry();
  spark.pos=new Float32Array(N*3); spark.col=new Float32Array(N*3);
  spark.vel=new Float32Array(N*3); spark.bcol=new Float32Array(N*3);
  spark.life=new Float32Array(N); spark.age=new Float32Array(N);
  for(var i=0;i<N;i++) spark.pos[i*3+1]=-1e4;
  geo.setAttribute('position',new THREE.BufferAttribute(spark.pos,3));
  geo.setAttribute('color',new THREE.BufferAttribute(spark.col,3));
  spark.pts=new THREE.Points(geo,new THREE.PointsMaterial({size:0.5,sizeAttenuation:true,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
  spark.pts.frustumCulled=false; scene.add(spark.pts);
}
function spawnSpark(g){
  var i=spark.head; spark.head=(i+1)%spark.N;
  var a=Math.random()*TAU2, rr=g.r+M*0.5, ca=Math.cos(a), sa=Math.sin(a);
  var tang=Math.min(500,Math.abs(g.omega)*rr)*(0.3+0.5*Math.random())*(g.omega>=0?1:-1);
  var out=20+60*Math.random(), up=40+140*Math.random();
  spark.pos[i*3]=g.x+ca*rr; spark.pos[i*3+1]=lY(g.layer)+TH/2; spark.pos[i*3+2]=g.z+sa*rr;
  spark.vel[i*3]=ca*out-sa*tang; spark.vel[i*3+1]=up; spark.vel[i*3+2]=sa*out+ca*tang;
  var b=bb(g.T,tmpC), br=0.6+0.8*Math.min(1,b);
  spark.bcol[i*3]=tmpC.r*br; spark.bcol[i*3+1]=tmpC.g*br; spark.bcol[i*3+2]=tmpC.b*br;
  spark.life[i]=0.5+1.1*Math.random(); spark.age[i]=0;
}
function updateSparks(dt,dist){
  if(P.heatOff){ if(spark.pts) spark.pts.visible=false; return }
  var i, k, N=spark.N, any=false;
  if(spark.emit.length){
    ensureSparks();
    for(k=0;k<spark.emit.length;k++){
      var g=spark.emit[k], rate=sstep(1200,6000,g.T)*90*Math.min(1,Math.abs(g.omega)/5);
      spark.acc[k]+=rate*dt;
      var sc=0; while(spark.acc[k]>=1){spark.acc[k]-=1; if(++sc<=20) spawnSpark(g)}
    }
  }
  if(!spark.pts) return;
  for(i=0;i<N;i++){
    if(spark.life[i]<=0) continue;
    spark.age[i]+=dt;
    if(spark.age[i]>=spark.life[i]){ spark.life[i]=0; spark.pos[i*3+1]=-1e4; spark.col[i*3]=spark.col[i*3+1]=spark.col[i*3+2]=0; continue }
    any=true;
    spark.vel[i*3+1]-=980*dt;
    spark.pos[i*3]+=spark.vel[i*3]*dt; spark.pos[i*3+1]+=spark.vel[i*3+1]*dt; spark.pos[i*3+2]+=spark.vel[i*3+2]*dt;
    if(spark.pos[i*3+1]<0.1){ spark.pos[i*3+1]=0.1; spark.vel[i*3+1]*=-0.35; spark.vel[i*3]*=0.7; spark.vel[i*3+2]*=0.7 }
    var f=1-spark.age[i]/spark.life[i]; f=f*f;
    spark.col[i*3]=spark.bcol[i*3]*f; spark.col[i*3+1]=spark.bcol[i*3+1]*f; spark.col[i*3+2]=spark.bcol[i*3+2]*f;
  }
  spark.pts.visible=any||spark.emit.length>0;
  spark.pts.material.size=Math.max(0.45,dist*0.0045);
  spark.pts.geometry.attributes.position.needsUpdate=true; spark.pts.geometry.attributes.color.needsUpdate=true;
}
function top4(minT){
  var hs=[], i, j, mn, t; top4.max=0;
  for(i=0;i<G.length;i++){
    t=G[i].T; if(t<=minT) continue;
    if(t>top4.max) top4.max=t;
    if(hs.length<4) hs.push(G[i]);
    else{ mn=0; for(j=1;j<4;j++) if(hs[j].T<hs[mn].T) mn=j; if(t>hs[mn].T) hs[mn]=G[i]; }
  }
  return hs;
}

/* ===== loads: torque carried by every mesh and shaft (tree from the motor shaft outward) ===== */
function computeLoads(dtT){
  var ci,c,i,j,s,g,ord,k,Is,D,sgn,aw,al,Tsh,dsh,tau,pg,pp,Ft,v,loss;
  for(i=0;i<G.length;i++){g=G[i]; g.F=0; g.Qm=0; g.v=0; g.tau=0; g.sig=0}
  for(ci=0;ci<comps.length;ci++){
    c=comps[ci]; ord=c.order;
    if(c.jam||!ord||!ord.length){c.wp=c.w; continue}
    aw=Math.abs(c.w);
    var Td=0, Tds=0, Rt=0;
    for(i=0;i<c.motors.length;i++){ g=c.motors[i]; Td+=Math.abs((g.motor.Tt||0)*g.k); Tds+=(g.motor.Tt||0)*g.k; g.motor.Tt=0 }
    sgn=aw>1e-9?(c.w>0?1:-1):(Tds>=0?1:-1);
    for(j=0;j<ord.length;j++){
      s=ord[j]; k=Math.abs(s.k); Is=0; D=0;
      for(i=0;i<s.gears.length;i++){g=s.gears[i]; Is+=g.I; D+=0.024*Math.pow(g.rm,5)}
      s.r0=sgn*(bearingDrag*(k*P.mu*s.N*s.rb+2e-3*s.rb*k*k*aw)+airDrag*D*k*k*k*aw*aw); s.Is=Is*s.k*s.k; Rt+=s.r0;
    }
    // Use actual acceleration in career mode; torque cut by the governor never reaches the teeth.
    if(careerMode) al=dtT>0?c.loadAccel:0;
    else if(c.motors.length) al=(sgn*Td*Math.pow(ETA,c.mesh)-Rt)/Math.max(c.I,1e-30);
    else al=dtT>0?(c.w-c.wp)/dtT:0;
    if(!isFinite(al)) al=0; c.wp=c.w;
    for(j=0;j<ord.length;j++){ s=ord[j]; s.St=s.r0+s.Is*al; if(!isFinite(s.St)) s.St=0 }
    for(j=ord.length-1;j>=0;j--){ s=ord[j]; if(s.par) s.par.St+=s.St }
    for(j=0;j<ord.length;j++){
      s=ord[j]; k=Math.abs(s.k)||1e-12;
      Tsh=Math.abs(s.St)/k; dsh=2*s.rb; tau=dsh>0?16*Tsh/(Math.PI*dsh*dsh*dsh):0;
      for(i=0;i<s.gears.length;i++){g=s.gears[i]; g.Tsh=Tsh; g.tau=tau}
      if(s.par){
        pg=s.pg; pp=s.pp; Ft=Tsh/pg.rm; v=aw*k*pg.rm; loss=(1-ETA)*Math.abs(s.St)*aw;
        pg.F=Math.max(pg.F,Ft); pp.F=Math.max(pp.F,Ft); pg.v=Math.max(pg.v,v); pp.v=Math.max(pp.v,v);
        pg.Qm+=loss*0.5; pp.Qm+=loss*0.5;
        pg.cphi=ang2(pp.x-pg.x,pp.z-pg.z); pp.cphi=ang2(pg.x-pp.x,pg.z-pp.z);
      }
    }
  }
  for(i=0;i<G.length;i++){
    g=G[i];
    if(g.F>0){ var Y=Math.max(0.06,0.484-2.87/g.n), Kv=Math.min(3,1+g.v/6.1); g.sig=g.F*Kv/(TH*10*M*10*Y)*1e6 }   /* Lewis bending stress at the tooth root, Pa */
  }
}
/* ===== hard mode: damage, fragments, molten pools ===== */
var frags=[], pools=[], hardFlash=0, hardShake=0, needRebuild=false, meltQ=[];
var shardGeo=new THREE.BoxGeometry(1,1,1);
function sparkBurst(px,py,pz,cnt,spd,T){
  ensureSparks();
  var k, i, a, el, sp, b=bb(T,tmpC), br=0.7+0.7*Math.min(1,b);
  for(k=0;k<cnt;k++){
    i=spark.head; spark.head=(i+1)%spark.N;
    a=Math.random()*TAU2; el=Math.random()*1.2-0.2; sp=spd*(0.3+0.7*Math.random());
    spark.pos[i*3]=px; spark.pos[i*3+1]=py; spark.pos[i*3+2]=pz;
    spark.vel[i*3]=Math.cos(a)*Math.cos(el)*sp; spark.vel[i*3+1]=Math.abs(Math.sin(el))*sp+60; spark.vel[i*3+2]=Math.sin(a)*Math.cos(el)*sp;
    spark.bcol[i*3]=tmpC.r*br; spark.bcol[i*3+1]=tmpC.g*br; spark.bcol[i*3+2]=tmpC.b*br;
    spark.life[i]=0.5+1.2*Math.random(); spark.age[i]=0;
  }
  spark.pts.visible=true;
}
function addFrag(geo,g,px,py,pz,vx,vy,vz,sx,sy,sz,rot){
  var mat=g.mat.clone(), m=new THREE.Mesh(geo,mat);
  m.position.set(px,py,pz); m.scale.set(sx,sy,sz); m.rotation.y=rot||0; m.castShadow=false; scene.add(m);
  var f={m:m,mat:mat,v:new THREE.Vector3(vx,vy,vz),w:new THREE.Vector3((Math.random()-0.5)*30,(Math.random()-0.5)*30,(Math.random()-0.5)*30),T0:g.T,T:g.T,age:0,rest:false,base:g.base.clone(),h:Math.max(0.1,sy*0.5)};
  frags.push(f);
  while(frags.length>70){var o=frags.shift(); scene.remove(o.m); o.mat.dispose(); if(o.own) o.m.geometry.dispose()}
  return f;
}
function updateFrags(dt){
  var i,f,sp;
  for(i=frags.length-1;i>=0;i--){
    f=frags[i]; f.age+=dt;
    f.T=T0+(f.T0-T0)*Math.exp(-f.age/18);
    if(!f.rest){
      f.v.y-=980*dt; f.m.position.addScaledVector(f.v,dt);
      f.m.rotation.x+=f.w.x*dt; f.m.rotation.y+=f.w.y*dt; f.m.rotation.z+=f.w.z*dt;
      if(f.m.position.y<f.h){
        f.m.position.y=f.h; f.v.y*=-0.28; f.v.x*=0.7; f.v.z*=0.7; f.w.multiplyScalar(0.6);
        sp=Math.abs(f.v.y)+Math.abs(f.v.x)+Math.abs(f.v.z); if(sp<25){f.rest=true; f.v.set(0,0,0)}
      }
    }
    if(f.T>650||f.hot){
      f.hot=f.T>650;
      if(f.hot){ var b=bb(f.T,hc); f.mat.color.copy(f.base).multiplyScalar(1-0.85*b); f.mat.emissive.copy(hc).multiplyScalar(b*gainOf(f.T)); }
      else { f.mat.color.copy(f.base).multiplyScalar(0.55); f.mat.emissive.setRGB(0,0,0) }
    }
  }
}
function spawnPool(g){
  var mt=g.mt, m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,28),new THREE.MeshStandardMaterial({color:0x202225,roughness:0.35,metalness:0.7}));
  var R=Math.max(0.8,g.r*0.7);
  m.position.set(g.x,lY(g.layer)+TH*0.5,g.z); m.scale.set(R,0.5,R); scene.add(m);
  var p={m:m,R:R,y:m.position.y,vy:0,T0:Math.max(mt.Tm,g.T>1e8?mt.Tm:Math.min(g.T,mt.Tm*1.3)),age:0,landed:false,mat:m.material};
  pools.push(p);
  while(pools.length>24){var o=pools.shift(); scene.remove(o.m); o.m.geometry.dispose(); o.mat.dispose()}
}
function updatePools(dt){
  var i,p,t,b,T;
  for(i=0;i<pools.length;i++){
    p=pools[i]; p.age+=dt;
    if(!p.landed){ p.vy-=980*dt; p.y+=p.vy*dt; if(p.y<=0.12){p.y=0.12; p.landed=true; p.age=0; sparkBurst(p.m.position.x,0.5,p.m.position.z,30,260,p.T0)} p.m.position.y=p.y; }
    else { t=Math.min(1,p.age/1.6); var e=1-Math.pow(1-t,3); p.m.scale.set(p.R*(1+0.5*e),0.14+0.36*(1-e),p.R*(1+0.5*e)) }
    T=T0+(p.T0-T0)*Math.exp(-p.age/(p.landed?22:60));
    if(T>650){ b=bb(T,hc); p.mat.color.setRGB(0.05,0.05,0.05); p.mat.emissive.copy(hc).multiplyScalar(b*gainOf(T)*0.9); p.hot=true }
    else if(p.hot){ p.hot=false; p.mat.emissive.setRGB(0,0,0); p.mat.color.setRGB(0.16,0.15,0.14); p.mat.roughness=0.85; p.mat.metalness=0.2 }
    p.T=T;
  }
}
function clearDebris(){
  frags.forEach(function(o){scene.remove(o.m); o.mat.dispose(); if(o.own) o.m.geometry.dispose()}); frags=[];
  pools.forEach(function(o){scene.remove(o.m); o.m.geometry.dispose(); o.mat.dispose()}); pools=[];
}
function breakTooth(g){
  if(g.free||!g.body) return;
  var n=g.n, p=TAU2/n, idx=Math.round((g.cphi-g.angle)/p), t;
  idx=((idx%n)+n)%n;
  for(t=0;t<n&&g.broken.has(idx);t++) idx=(idx+1)%n;
  if(g.broken.has(idx)) return;
  g.broken.add(idx); hardStat.teeth++; retooth(g);
  var a=g.angle+idx*p, R=g.r+M*0.5, px=g.x+Math.cos(a)*R, pz=g.z-Math.sin(a)*R, py=lY(g.layer)+TH/2;
  sparkBurst(px,py,pz,26,260+Math.min(900,Math.abs(g.omega)*g.r*0.25),Math.max(g.T,1600));
  addFrag(shardGeo,g,px,py,pz,(Math.random()-0.5)*260,120+Math.random()*220,(Math.random()-0.5)*260,M*0.7,TH*0.8,M*0.5,Math.random()*6);
  hardShake=Math.max(hardShake,camera.position.distanceTo(controls.target)*0.004); hardFlash=Math.max(hardFlash,0.12);
  sndHit('crack');
  if(g.broken.size>=Math.max(2,Math.ceil(n*0.25))){ g.free=true; needRebuild=true; toast(n+' 齿齿轮的齿大面积崩掉，已无法啮合传动',true) }
  else toast(n+' 齿齿轮断了一颗齿（共 '+g.broken.size+' 颗）：'+(g.sigT>g.mt.uts*fT(g.mt,g.T)?'齿根应力超过抗拉强度':'疲劳累积'),true);
}
function burstGear(g){
  hardStat.burst++;
  var pieces=3+Math.floor(Math.random()*3), cuts=[], i, a0=Math.random()*TAU2;
  for(i=0;i<pieces;i++) cuts.push(a0+i*TAU2/pieces+(Math.random()-0.5)*TAU2/pieces*0.6);
  var Ro=g.r+M, w=g.omega, sgn=w>=0?1:-1, pos=g.grp3.position, y=pos.y, rotation=career?career.angle(g):g.angle;
  for(i=0;i<pieces;i++){
    var A=cuts[i], B=(i+1<pieces?cuts[i+1]:cuts[0]+TAU2), sh=new THREE.Shape();
    if(careerMode){
      var toothPitch=TAU2/g.n, root=rootR(g.n), split=g.r*.31;
      var segments=Math.ceil((B-A)/toothPitch*15);
      sh.moveTo(split*Math.cos(A),split*Math.sin(A));
      for(var j=0;j<=segments;j++){
        var theta=A+(B-A)*j/segments, phase=theta/toothPitch;
        var radius=root+(Ro-root)*(1-sstep(.14,.36,Math.abs(phase-Math.round(phase))));
        sh.lineTo(radius*Math.cos(theta),radius*Math.sin(theta));
      }
      sh.lineTo(split*Math.cos(B),split*Math.sin(B));
      sh.lineTo(split*.48*Math.cos((A+B)/2),split*.48*Math.sin((A+B)/2));
      sh.closePath();
    }else{
      sh.moveTo(0,0); sh.lineTo(Ro*Math.cos(A),Ro*Math.sin(A)); sh.absarc(0,0,Ro,A,B,false); sh.lineTo(0,0);
    }
    var geo=new THREE.ExtrudeGeometry(sh,{depth:TH,bevelEnabled:false,curveSegments:8}); geo.rotateX(-Math.PI/2);
    var am=rotation+(A+B)/2, cr=Math.cos(am), sr=-Math.sin(am), tx=-Math.sin(am)*sgn, tz=-Math.cos(am)*sgn;
    var vt=careerMode?40+Math.random()*65:Math.min(2600,Math.abs(w)*Ro*0.6), vr=vt*0.35;
    var f=addFrag(geo,g,pos.x,y,pos.z,tx*vt+cr*vr,careerMode?25+Math.random()*60:150+Math.random()*450,tz*vt+sr*vr,1,1,1,rotation); f.own=true; f.h=0.4;
    f.w.y=Math.max(-60,Math.min(60,w*0.3));
  }
  sparkBurst(pos.x,y+TH/2,pos.z,careerMode?46:90,careerMode?105:900,Math.max(g.T,1800));
  hardFlash=careerMode?.32:1; hardShake=Math.max(hardShake,camera.position.distanceTo(controls.target)*(careerMode?.012:.03));
  sndHit('boom');
  if(!careerMode) toast(g.n+' 齿齿轮在离心力下炸裂：轮盘环向应力 '+(g.hoop/1e6).toFixed(0)+' MPa 超过了材料强度',true);
}
function meltGear(g){
  hardStat.melt++; spawnPool(g); sparkBurst(g.x,lY(g.layer)+TH/2,g.z,40,200,g.mt.Tm); sndHit('hiss');
  toast(g.n+' 齿'+g.mt.name+'齿轮熔化了，金属液滴落到台面上',true);
}
function meltStep(g,dtH){
  var m=g.mt;
  if(g.T>m.Tm){
    g.melt+=(g.T-m.Tm)*m.cp/m.Lf; g.T=m.Tm;
    if(g.melt>=1&&!g.dead){g.dead=1; meltQ.push(g)}
  } else if(g.melt>0&&g.T<m.Tm*0.999){ g.melt=Math.max(0,g.melt-dtH*0.03) }
}
function damage(dtT){
  var i,g,m,uts,w,Ro,sig,se,Nf,tauU,kills=[];
  for(i=0;i<G.length;i++){
    g=G[i]; if(g.dead) continue; m=g.mt; uts=m.uts*fT(m,g.T); w=Math.abs(g.omega); Ro=(g.r+M)/100;
    g.hoop=0.4125*m.rho*w*w*Ro*Ro*2; /* 游戏性：在实心圆盘公式上放大 2 倍，让爆裂更常见 */
    if(g.hoop>uts){g.dead=1; kills.push(g); continue}
    sig=g.sig*(1+Math.min(2,g.broken.size*0.35)); g.sigT=sig;
    if(g.F>0&&sig>0&&!g.free){
      if(sig>uts) breakTooth(g);
      else{ se=0.4*uts; if(sig>se){ Nf=1e6*Math.pow(se/sig,9); g.fat+=w/TAU2*P.accel*dtT/Nf; if(g.fat>=1){g.fat=0.6; breakTooth(g)} } }
    }
    tauU=0.6*MATS.steel.uts*fT(MATS.steel,g.T);
    if(g.grp&&g.grp.par&&g===g.grp.pg&&!g.free&&g.tau>tauU){
      g.free=true; needRebuild=true; hardStat.shaft++; sparkBurst(g.x,lY(g.layer)+TH/2,g.z,40,300,Math.max(g.T,1500)); sndHit('crack');
      toast(g.n+' 齿齿轮的轴被扭断了（剪应力 '+(g.tau/1e6).toFixed(0)+' MPa）：动力传不过去了',true);
    }
  }
  if(kills.length||meltQ.length){
    noRebuild=true;
    kills.forEach(function(k){burstGear(k); removeGear(k)});
    meltQ.forEach(function(k){ if(G.indexOf(k)>=0){meltGear(k); removeGear(k)} }); meltQ=[];
    noRebuild=false; needRebuild=true;
  }
  if(needRebuild){needRebuild=false; rebuild()}
}
function conduct(dt){
  var i,e,a,b,Q,fa,fb;
  for(i=0;i<thEdges.length;i++){
    e=thEdges[i]; a=e[0]; b=e[1];
    if(careerMode){
      var field=e[3]?'Thub':'T', share=e[3]?.15:.45;
      exchangeHeat(a,field,a.mass*a.mt.cp*share,b,field,b.mass*b.mt.cp*share,e[2],dt);
      continue;
    }
    if(!(a.T<1e5&&b.T<1e5)) continue;
    Q=e[2]*(a.T-b.T)*dt; if(Math.abs(Q)<1e-9) continue;
    fa=Math.abs(Q)/(a.mass*a.mt.cp*Math.max(1,Math.abs(a.T-b.T))); fb=Math.abs(Q)/(b.mass*b.mt.cp*Math.max(1,Math.abs(a.T-b.T)));
    if(fa>0.45||fb>0.45){Q*=0.45/Math.max(fa,fb)}
    a.T-=Q/(a.mass*a.mt.cp); b.T+=Q/(b.mass*b.mt.cp);
  }
}
/* ===== sound: gear voices (hum, whoosh, ticks, sizzle) + generative background music, all synthesised ===== */
var snd={ctx:null, act:0, ck:0, st:0, ci:-1, chordEnd:0, next:0, mel:7, cur:null};
var NCH=[[0,7,12,15,19],[-4,3,8,12,19],[-7,0,5,8,12],[-5,2,7,10,14]];      /* Dm - Bb - Gm - Am */
var HCH=[[0,7,12,15,19],[1,8,13,16,20],[0,7,12,15,18],[-2,4,10,13,19]];    /* hard mode: Dm - Eb - Dm(b5) - C dim, darker */
var NSC=[0,2,3,5,7,8,10], HSC=[0,1,3,5,7,8,10];
function noiseBuf(c,sec){var n=Math.floor(c.sampleRate*sec), b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0), i; for(i=0;i<n;i++) d[i]=Math.random()*2-1; return b}
function sndInit(){
  if(snd.ctx||!(P.snd||P.bgm)) return;
  try{
    var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    var c=new AC(), A=snd, i, ch, d, rl;
    A.ctx=c;
    A.comp=c.createDynamicsCompressor(); A.comp.connect(c.destination);
    A.fx=c.createGain(); A.fx.gain.value=P.snd?1:0; A.fx.connect(A.comp);
    A.bgm=c.createGain(); A.bgm.gain.value=P.bgm?0.9:0; A.duck=c.createGain(); A.bgm.connect(A.duck); A.duck.connect(A.comp);
    rl=Math.floor(c.sampleRate*2.6); var ir=c.createBuffer(2,rl,c.sampleRate);
    for(ch=0;ch<2;ch++){ d=ir.getChannelData(ch); for(i=0;i<rl;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/rl,2.6) }
    A.rev=c.createConvolver(); A.rev.buffer=ir; A.revG=c.createGain(); A.revG.gain.value=0.55; A.rev.connect(A.revG); A.revG.connect(A.bgm);
    A.dry=c.createGain(); A.dry.gain.value=0.7; A.dry.connect(A.bgm);
    A.padF=c.createBiquadFilter(); A.padF.type='lowpass'; A.padF.frequency.value=950; A.padF.connect(A.dry); A.padF.connect(A.rev);
    A.dl=c.createDelay(1.0); A.dl.delayTime.value=0.375; A.fbk=c.createGain(); A.fbk.gain.value=0.36; A.dl.connect(A.fbk); A.fbk.connect(A.dl); A.dl.connect(A.rev); A.dl.connect(A.dry);
    A.noise=noiseBuf(c,2);
    /* gear hum */
    A.h1=c.createOscillator(); A.h2=c.createOscillator(); A.h1.type='triangle'; A.h2.type='sawtooth';
    A.hf=c.createBiquadFilter(); A.hf.type='lowpass'; A.hf.frequency.value=800; A.hg=c.createGain(); A.hg.gain.value=0;
    A.h1.connect(A.hf); A.h2.connect(A.hf); A.hf.connect(A.hg); A.hg.connect(A.fx); A.h1.start(); A.h2.start();
    /* whoosh (air through teeth) and heat sizzle */
    A.ws=c.createBufferSource(); A.ws.buffer=A.noise; A.ws.loop=true; A.wf=c.createBiquadFilter(); A.wf.type='bandpass'; A.wf.Q.value=0.8; A.wg=c.createGain(); A.wg.gain.value=0;
    A.ws.connect(A.wf); A.wf.connect(A.wg); A.wg.connect(A.fx); A.ws.start();
    A.ss=c.createBufferSource(); A.ss.buffer=A.noise; A.ss.loop=true; A.sf=c.createBiquadFilter(); A.sf.type='highpass'; A.sf.frequency.value=3500; A.sg=c.createGain(); A.sg.gain.value=0;
    A.ss.connect(A.sf); A.sf.connect(A.sg); A.sg.connect(A.fx); A.ss.start();
    /* hard-mode low drone */
    A.dr=c.createOscillator(); A.dr.type='sawtooth'; A.dr.frequency.value=36.7; A.drf=c.createBiquadFilter(); A.drf.type='lowpass'; A.drf.frequency.value=140; A.drg=c.createGain(); A.drg.gain.value=0;
    A.dr.connect(A.drf); A.drf.connect(A.drg); A.drg.connect(A.bgm); A.dr.start();
    A.next=c.currentTime+0.3;
  }catch(e){snd.ctx=null}
}
document.addEventListener('pointerdown',function(){ sndInit(); if(snd.ctx&&snd.ctx.state==='suspended') snd.ctx.resume() },{passive:true});
document.addEventListener('visibilitychange',function(){ if(!snd.ctx) return; if(document.hidden) snd.ctx.suspend(); else snd.ctx.resume() });
function hz(semi,base){return (base||73.416)*Math.pow(2,semi/12)}
function padNote(t,f,len,v){
  var c=snd.ctx, k, o, g, at=Math.min(3,len*0.3), rel=3.5;
  g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+at); g.gain.setValueAtTime(v,t+len-0.1); g.gain.linearRampToValueAtTime(0,t+len+rel); g.connect(snd.padF);
  for(k=-1;k<=1;k+=2){ o=c.createOscillator(); o.type='triangle'; o.frequency.value=f; o.detune.value=k*6; o.connect(g); o.start(t); o.stop(t+len+rel+0.1) }
}
function pluck(t,f,v){
  var c=snd.ctx, o=c.createOscillator(), o2=c.createOscillator(), g=c.createGain(), g2=c.createGain();
  o.type='sine'; o.frequency.value=f; o2.type='triangle'; o2.frequency.value=f*2; g2.gain.value=0.25;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+0.006); g.gain.exponentialRampToValueAtTime(0.0008,t+1.6);
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(snd.dl); g.connect(snd.dry); o.start(t); o2.start(t); o.stop(t+1.7); o2.stop(t+1.7);
}
function tock(t,v){
  var c=snd.ctx, o=c.createOscillator(), g=c.createGain();
  o.type='sine'; o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(52,t+0.08);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+0.004); g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
  o.connect(g); g.connect(snd.dry); o.start(t); o.stop(t+0.2);
}
function tickN(t,v,hp,dur,dest){
  var c=snd.ctx, s=c.createBufferSource(), f=c.createBiquadFilter(), g=c.createGain();
  s.buffer=snd.noise; f.type='highpass'; f.frequency.value=hp; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.0005,t+dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t,Math.random()*1.5,dur+0.02);
}
function bgmStep(t,step){
  var A=snd, hard=P.hard, set=hard?HCH:NCH, sc=hard?HSC:NSC, i;
  if(t>=A.chordEnd){
    A.ci=(A.ci+1)%set.length; A.cur=set[A.ci]; var L=step*32;
    for(i=0;i<A.cur.length;i++) padNote(t,hz(A.cur[i]),L,0.045);
    A.chordEnd=t+L;
  }
  if(A.st%4===0) tock(t,A.st%16===0?0.42:0.28);
  if(A.st%2===1&&A.act>0.22) tickN(t,0.05+0.07*A.act,6500,0.04,A.dry);
  if(A.st%8===6&&A.act>0.55) tickN(t,0.06,2500,0.09,A.dry);
  if(A.st%2===0&&Math.random()<0.10+0.42*A.act){
    var f, r=Math.random();
    if(r<0.65&&A.cur){ f=hz(A.cur[1+Math.floor(Math.random()*(A.cur.length-1))]+12*(1+Math.floor(Math.random()*2))) }
    else { A.mel=Math.max(0,Math.min(13,A.mel+Math.floor(Math.random()*5)-2)); f=hz(24+sc[A.mel%7]+12*Math.floor(A.mel/7)) }
    pluck(t,f,0.10+0.08*A.act);
  }
  A.st++;
}
function sndUpdate(){
  var A=snd, c=A.ctx; if(!c||c.state!=='running') return;
  var mx=0, fm=0, Tm=293, i, g, w, t=c.currentTime;
  if(!paused) for(i=0;i<G.length;i++){ g=G[i]; w=Math.abs(g.omega); if(w>mx){mx=w; fm=w/TAU2*g.n} if(g.T>Tm) Tm=Math.min(g.T,1e9) }
  A.fx.gain.setTargetAtTime(P.snd?1:0,t,0.05); A.bgm.gain.setTargetAtTime(P.bgm?0.9:0,t,0.3);
  var sp=Math.log10(1+mx), act=Math.min(1,sp/3.2); A.act+=(act-A.act)*0.25;
  if(P.snd&&mx>1e-3){
    var pitch=14000*Math.tanh(55*Math.pow(2,Math.log10(1+fm)*1.6)/14000), vol=0.03+0.075*(1-Math.exp(-sp/2));
    A.h1.frequency.setTargetAtTime(pitch,t,0.08); A.h2.frequency.setTargetAtTime(pitch*2.003,t,0.08);
    A.hf.frequency.setTargetAtTime(Math.min(16000,500+fm*4+sp*600),t,0.1); A.hg.gain.setTargetAtTime(vol*(fm>40?1:Math.max(0.15,fm/40)),t,0.1);
    A.wf.frequency.setTargetAtTime(Math.min(14000,180+sp*700),t,0.1); A.wg.gain.setTargetAtTime(0.16*(1-Math.exp(-sp/2.5)),t,0.12);
    if(fm<40){ A.ck+=fm*0.1; var nn=0; while(A.ck>=1&&nn<8){ A.ck-=1; nn++; tickN(t+Math.random()*0.1,0.12+0.1*Math.min(1,sp/2),1200,0.025,A.fx) } } else A.ck=0;
  } else { A.hg.gain.setTargetAtTime(0,t,0.1); A.wg.gain.setTargetAtTime(0,t,0.1) }
  A.sg.gain.setTargetAtTime(P.snd&&Tm>650?0.05*Math.min(1,Math.log10(Tm/650)/2.5):0,t,0.3);
  A.drg.gain.setTargetAtTime(P.hard&&P.bgm?0.08:0,t,1.5);
  if(P.bgm){
    if(A.next<t-1) A.next=t+0.1;
    var step=60/(62+34*A.act)/2;
    while(A.next<t+0.4){ bgmStep(A.next,step); A.next+=step }
  } else A.next=Math.max(A.next,t);
}
function sndHit(kind){
  var A=snd, c=A.ctx; if(!c||c.state!=='running'||!P.snd) return;
  try{
    var t=c.currentTime;
    if(kind==='boom'){ tickN(t,0.7,40,1.1,A.fx); var o=c.createOscillator(), g=c.createGain(); o.type='sine'; o.frequency.setValueAtTime(90,t); o.frequency.exponentialRampToValueAtTime(30,t+0.9); g.gain.setValueAtTime(0.6,t); g.gain.exponentialRampToValueAtTime(0.001,t+1.0); o.connect(g); g.connect(A.fx); o.start(t); o.stop(t+1.05) }
    else if(kind==='hiss') tickN(t,0.14,3500,1.3,A.fx);
    else { tickN(t,0.35,1800,0.12,A.fx); var p=c.createOscillator(), pg=c.createGain(); p.type='sine'; p.frequency.value=2300+Math.random()*900; pg.gain.setValueAtTime(0.12,t); pg.gain.exponentialRampToValueAtTime(0.001,t+0.5); p.connect(pg); pg.connect(A.fx); p.start(t); p.stop(t+0.55) }
    if(P.bgm){ A.duck.gain.cancelScheduledValues(t); A.duck.gain.setTargetAtTime(0.25,t,0.02); A.duck.gain.setTargetAtTime(1,t+0.7,0.5) }
  }catch(e){}
}

/* ===== relativistic effects: rim speed as a fraction of c ===== */
var C_LIGHT=299792458, relSel=[], betaMax=0, betaG=null, supra=false, fxActive=false;
var expl={t:-1,pos:new THREE.Vector3(),Rmax:0,beta:1,far:0,shake:0,shakeV:new THREE.Vector3(),ring:null,sphere:null,pts:null,vel:null};
var tmpV=new THREE.Vector3(), tmpV2=new THREE.Vector3(), tmpR=new THREE.Vector3();
function betaOf(g){var b=tipSpeed(g)/C_LIGHT; return P.capB>0?Math.min(b,P.capB):b}
function ampOf(b){
  if(b<0.2) return 0;
  var a=0.12*sstep(0.2,0.5,b)+0.5*sstep(0.5,0.99,b)+0.9*sstep(0.99,1.0,b);
  if(b>1) a+=Math.min(6,1.2*Math.log10(b)+0.4*Math.min(1,b-1));
  return a;
}
function relDesc(b){
  return b<0.2?'无明显相对论效应':b<0.5?'时空出现细微扰动':b<0.99?'时空明显扭曲':b<1?'时空严重扭曲，即将越过光速':'超越光速，时空彻底撕裂';
}
function fmtPct(b){var p=b*100; return p>=1e6?p.toExponential(2)+'%':(p<0.01?p.toExponential(2):p.toFixed(p<10?2:1))+'%'}
function updateRel(){
  relSel=[]; betaMax=0; betaG=null;
  if(P.fxOff||career){supra=false; return}
  var i, g, b, arr=[];
  for(i=0;i<G.length;i++){
    g=G[i]; b=betaOf(g);
    if(b>betaMax){betaMax=b; betaG=g}
    if(b>=0.2) arr.push({g:g,b:b});
  }
  arr.sort(function(a,c){return c.b-a.b}); relSel=arr.slice(0,4);
  if(betaMax>=1){ if(!supra){supra=true; if(expl.t<0) startExplosion(betaG,betaMax)} }
  else if(betaMax<0.95) supra=false;
  if(P.bhOn && betaMax>=1 && !bh.on) startBH(betaG);
  if(P.bbOn && betaMax>=100){ if(!supraBB){supraBB=true; if(bbx.t<0) startBB(betaG,betaMax)} }
  else if(betaMax<95) supraBB=false;
}
/* ===== black hole collapse and cosmic big bang (optional) ===== */
var bh={on:false,t:0,pos:new THREE.Vector3(),Rs:1,Rs0:1,eat:0,sph:null,disk:null,origin:null};
var bbx={t:-1,pos:new THREE.Vector3(),R:0,far:0,shells:null,stars:null,done:false,shake:0};
var shakeV=new THREE.Vector3(), shakeAmp=0, supraBB=false;
function ensureBH(){
  if(bh.sph) return;
  bh.sph=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.MeshBasicMaterial({color:0x000000,fog:false}));
  bh.sph.visible=false; bh.sph.frustumCulled=false; scene.add(bh.sph);
  var mat=new THREE.ShaderMaterial({
    uniforms:{uT:{value:0}}, transparent:true, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:[
'varying vec2 vUv; uniform float uT;',
'void main(){',
'  vec2 p=vUv-0.5; float r=length(p)*2.0;',
'  if(r<0.3||r>1.0) discard;',
'  float x=(r-0.3)/0.7; float ang=atan(p.y,p.x);',
'  float spin=uT*(2.5/(0.3+x*x*2.0));',
'  float band=0.55+0.45*sin(ang*6.0+spin*4.0+x*40.0)*sin(ang*3.0-spin*2.0+x*17.0);',
'  float glow=pow(1.0-x,2.2)*1.6+0.12;',
'  vec3 hot=mix(vec3(1.0,0.95,0.85),vec3(1.0,0.45,0.08),smoothstep(0.0,0.55,x));',
'  hot=mix(hot,vec3(0.5,0.08,0.02),smoothstep(0.5,1.0,x));',
'  float edge=smoothstep(0.0,0.05,x)*(1.0-smoothstep(0.85,1.0,x));',
'  gl_FragColor=vec4(hot*glow*band*edge*2.2,1.0);',
'}'].join('\n')
  });
  bh.disk=new THREE.Mesh(new THREE.RingGeometry(2.1,7,128,8),mat);
  bh.disk.rotation.x=-Math.PI/2; bh.disk.visible=false; bh.disk.frustumCulled=false; scene.add(bh.disk);
}
function startBH(g){
  ensureBH();
  var bk=snapshot(); bk.cam=null;
  hpush(function(){clearBH(); applySave(bk)});
  bh.on=true; bh.t=0; bh.eat=0; bh.origin=g;
  bh.pos.set(g.x,lY(g.layer)+TH/2,g.z); bh.Rs0=Math.max(1.2,g.r*0.5); bh.Rs=bh.Rs0;
  bh.sph.position.copy(bh.pos); bh.disk.position.copy(bh.pos);
  bh.sph.visible=bh.disk.visible=true;
  toast('一个齿轮坍缩成了黑洞，正在吞噬周围的齿轮（点“撤销”可以恢复）',true);
}
function clearBH(){
  bh.on=false; bh.origin=null;
  if(bh.sph) bh.sph.visible=bh.disk.visible=false;
  G.forEach(function(g){ if(g.pull){g.pull=false; g.grp3.position.set(g.x,lY(g.layer),g.z); g.grp3.scale.setScalar(1)} });
}
function updateBH(dt){
  if(!bh.on) return;
  bh.t+=dt; var t=bh.t, i, g, gone=[];
  bh.Rs=bh.Rs0*(1+0.4*(1-Math.exp(-t/3)))+bh.eat;
  bh.sph.scale.setScalar(bh.Rs); bh.disk.scale.setScalar(bh.Rs); bh.disk.material.uniforms.uT.value=t;
  var pullR=Math.min(1e5,bh.Rs*(2.5+t*1.5));
  for(i=0;i<G.length;i++){
    g=G[i];
    if(g===bh.origin){
      var s0=Math.max(0,1-t/1.2); g.grp3.scale.setScalar(Math.max(1e-4,s0)); if(s0<=0) gone.push(g);
      continue;
    }
    if(!g.pull){
      var dx=g.x-bh.pos.x, dy=lY(g.layer)-bh.pos.y, dz=g.z-bh.pos.z, d=Math.sqrt(dx*dx+dy*dy+dz*dz);
      if(d<pullR){ g.pull=true; g.pt=0; g.pd=d; g.p0=new THREE.Vector3(g.x,lY(g.layer),g.z); g.pT=0.8+d*0.01 }
    }
    if(g.pull){
      g.pt+=dt; var k=Math.min(1,g.pt/g.pT), e=k*k, a=3*k*Math.PI;
      var ox=g.p0.x-bh.pos.x, oz=g.p0.z-bh.pos.z, c=Math.cos(a), sn=Math.sin(a);
      var rx=(ox*c-oz*sn)*(1-e), rz=(ox*sn+oz*c)*(1-e);
      g.grp3.position.set(bh.pos.x+rx, g.p0.y+(bh.pos.y-g.p0.y)*e, bh.pos.z+rz);
      g.grp3.scale.setScalar(Math.max(1e-4,1-Math.pow(k,1.5)));
      if(k>=1) gone.push(g);
    }
  }
  if(gone.length){
    noRebuild=true; gone.forEach(function(x){ if(x!==bh.origin) bh.eat+=0.15*x.r; removeGear(x) }); noRebuild=false; rebuild();
    if(gone.indexOf(bh.origin)>=0) bh.origin=null;
  }
}
function ensureBB(){
  if(bbx.shells) return;
  var cols=[0xffffff,0xffb060,0x6a80ff]; bbx.shells=[];
  cols.forEach(function(c){
    var m=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
    m.visible=false; m.frustumCulled=false; scene.add(m); bbx.shells.push(m);
  });
  var N=5000, pos=new Float32Array(N*3), col=new Float32Array(N*3), i, th, ph, r, T, tc=new THREE.Color();
  for(i=0;i<N;i++){
    th=Math.random()*TAU2; ph=Math.acos(2*Math.random()-1); r=60*Math.cbrt(Math.random());
    pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=r*Math.cos(ph); pos[i*3+2]=r*Math.sin(ph)*Math.sin(th);
    T=2500*Math.pow(14,Math.random()*Math.random()); bbLut(T,tc);          /* real star colours: 2500 K to 35000 K */
    var br=0.55+0.45*Math.random(); col[i*3]=tc.r*br; col[i*3+1]=tc.g*br; col[i*3+2]=tc.b*br;
  }
  var geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  bbx.stars=new THREE.Points(geo,new THREE.PointsMaterial({size:3,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
  bbx.stars.visible=false; bbx.stars.frustumCulled=false; scene.add(bbx.stars);
}
function startBB(g,b){
  ensureBB();
  bbx.t=0; bbx.done=false; bbx.pos.set(g.x,lY(g.layer)+TH/2,g.z);
  bbx.R=3e5*(1+Math.min(3,Math.log10(Math.max(1,b/100))));
  bbx.far=bbx.R*4;
  bbx.stars.position.copy(bbx.pos); bbx.stars.scale.setScalar(1); bbx.stars.visible=true; bbx.stars.material.opacity=1;
  bbx.shells.forEach(function(m){m.position.copy(bbx.pos); m.visible=true});
  toast('宇宙大爆炸！',true);
}
function clearBB(){
  bbx.t=-1; bbx.far=0; bbx.done=false;
  if(bbx.shells){ bbx.shells.forEach(function(m){m.visible=false}); bbx.stars.visible=false }
}
function bbFlash(t){
  var a=t<1.2?sstep(0,1.2,t):Math.exp(-(t-1.2)*0.45), col;
  if(t<2) col=[1,1,1]; else if(t<6) col=[1,0.9,0.6]; else if(t<12) col=[1,0.5,0.15]; else col=[0.6,0.08,0.03];
  return {a:a*(t>40?0:1),c:col};
}
function updateBB(dt){
  if(bbx.t<0&&!bbx.done) return;
  if(bbx.t>=0){
    bbx.t+=dt; var t=bbx.t, i, taus=[1.2,2.2,3.6], ops=[0.9,0.7,0.5];
    for(i=0;i<3;i++){
      var m=bbx.shells[i], rr=Math.max(1,bbx.R*0.9*(1-Math.exp(-t/taus[i])));
      m.scale.setScalar(rr);
      m.material.opacity=ops[i]*Math.min(1,t/0.4)*Math.exp(-t*(0.35+0.1*i));
    }
    bbx.stars.scale.setScalar(1+(bbx.R/60)*(1-Math.exp(-t/4)));
    bbx.shake=Math.max(0.0,0.06*Math.exp(-t*0.8));
    if(t>60){ bbx.t=-1; bbx.done=true; bbx.far=0; bbx.shells.forEach(function(m){m.visible=false}); bbx.shake=0 }
  }
}
function ensureExpl(){
  if(expl.ring) return;
  var base={transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false};
  expl.ring=new THREE.Mesh(new THREE.RingGeometry(0.965,1,180),new THREE.MeshBasicMaterial(Object.assign({color:0xa8c8ff},base)));
  expl.ring.rotation.x=-Math.PI/2; expl.ring.frustumCulled=false; expl.ring.visible=false; scene.add(expl.ring);
  expl.sphere=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.MeshBasicMaterial(Object.assign({color:0x7fb0ff},base)));
  expl.sphere.frustumCulled=false; expl.sphere.visible=false; scene.add(expl.sphere);
  var N=1600, geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));
  expl.pts=new THREE.Points(geo,new THREE.PointsMaterial(Object.assign({color:0xcfe0ff,size:4,sizeAttenuation:true},base)));
  expl.pts.frustumCulled=false; expl.pts.visible=false; scene.add(expl.pts);
  expl.vel=new Float32Array(N*3);
}
function startExplosion(g,b){
  ensureExpl();
  expl.t=0; expl.beta=b; expl.pos.set(g.x,lY(g.layer)+TH/2,g.z);
  expl.Rmax=20000*(1+Math.min(6,Math.log10(Math.max(1,b))));
  expl.far=expl.Rmax*4;
  var p=expl.pts.geometry.attributes.position.array, v=expl.vel, N=p.length/3, i, th, ph, sp;
  for(i=0;i<N;i++){
    p[i*3]=expl.pos.x; p[i*3+1]=expl.pos.y; p[i*3+2]=expl.pos.z;
    th=Math.random()*TAU2; ph=Math.acos(2*Math.random()-1); sp=expl.Rmax*(0.05+0.5*Math.random()*Math.random());
    v[i*3]=Math.sin(ph)*Math.cos(th)*sp; v[i*3+1]=Math.abs(Math.cos(ph))*sp*0.8; v[i*3+2]=Math.sin(ph)*Math.sin(th)*sp;
  }
  expl.pts.geometry.attributes.position.needsUpdate=true;
  expl.pts.material.size=Math.max(4,expl.Rmax*0.004);
  expl.ring.position.set(expl.pos.x,0.3,expl.pos.z); expl.sphere.position.copy(expl.pos); expl.pts.position.set(0,0,0);
  expl.ring.visible=expl.sphere.visible=expl.pts.visible=true;
  toast('超越光速！时空被撕裂了',true);
}
var lightPulseDuration=1.55, lightPulseAge=lightPulseDuration;
var shutterRims=[null,null];

function makeShutterRim(g){
  var root=rootR(g.n), tip=g.r+M;
  var material=new THREE.ShaderMaterial({
    uniforms:{root:{value:root}, tip:{value:tip}, teeth:{value:g.n},
      halfPitch:{value:Math.PI/g.n}, baseRadius:{value:g.r*COSPA}, pitchInvolute:{value:INVP}, blur:{value:0},
      surface:{value:g.mat.color}, emission:{value:g.mat.emissive}},
    transparent:true, depthWrite:false,
    vertexShader:`
      varying vec3 local, normalView, eye;
      void main(){
        local=position;
        normalView=normalMatrix*normal;
        vec4 view=modelViewMatrix*vec4(position,1.0);
        eye=-view.xyz;
        gl_Position=projectionMatrix*view;
      }
    `,
    fragmentShader:`
      varying vec3 local, normalView, eye;
      uniform float root, tip, teeth, halfPitch, baseRadius, pitchInvolute, blur;
      uniform vec3 surface, emission;
      void main(){
        float radius=length(local.xz);
        float toothRadius=clamp((radius-root)/(tip-root),0.0,1.0);
        float involute=acos(min(1.0,baseRadius/radius));
        float width=clamp(.5+(pitchInvolute-tan(involute)+involute)/halfPitch,.10,.90);
        float phase=abs(fract(atan(-local.z,local.x)*teeth/6.2831853+.5)-.5)*2.0;
        float tooth=1.0-smoothstep(width-.022,width+.028,phase);
        // At long exposure, a pixel sees only the fraction of each turn occupied by a tooth.
        float coverage=mix(tooth,mix(width,.96,1.0-smoothstep(0.0,.25,toothRadius)),blur);
        float tipFade=1.0-.92*blur*smoothstep(.62,1.0,toothRadius);
        float coverageAlpha=coverage*tipFade*smoothstep(root-.021,root+.033,radius);
        if(coverageAlpha<.015) discard;
        vec3 n=normalize(normalView), v=normalize(eye);
        vec3 reflected=reflect(-v,n);
        vec3 softbox=normalize(vec3(-.44,.53,.73));
        float key=max(0.0,dot(reflected,softbox));
        float bounce=max(0.0,dot(reflected,normalize(vec3(.67,-.23,.70))));
        float brushed=.96+.04*sin(toothRadius*62.0);
        float grazing=pow(1.0-max(0.0,dot(n,v)),2.0);
        vec3 color=surface*(.61+.16*brushed+.09*grazing);
        color+=vec3(.70,.82,.92)*(.23*pow(key,16.0)+.07*pow(bounce,8.0));
        color+=emission*mix(.91,1.16,smoothstep(0.0,.8,toothRadius));
        gl_FragColor=vec4(color,coverageAlpha);
      }
    `
  });
  var edge=new THREE.LatheGeometry([
    new THREE.Vector2(root-.025,.012), new THREE.Vector2(tip-.015,.012),
    new THREE.Vector2(tip,.04), new THREE.Vector2(tip,TH-.04),
    new THREE.Vector2(tip-.015,TH+.005), new THREE.Vector2(root-.025,TH+.005)
  ],96);
  var mesh=new THREE.Mesh(edge,material), original=g.body.geometry, core=plateGeo(g.n,null,true);
  g.body.geometry=core;
  g.grp3.add(mesh);
  return { gear:g, mesh:mesh, original:original, core:core };
}

function updateShutterRim(index,gear,blur){
  var current=shutterRims[index];
  if(current&&current.gear!==gear){
    current.gear.body.geometry=current.original;
    current.gear.rimExposure=false;
    if(current.gear.marker) current.gear.marker.visible=!current.gear.smallF;
    current.gear.grp3.remove(current.mesh);
    current.mesh.geometry.dispose(); current.mesh.material.dispose(); current.core.dispose();
    current=shutterRims[index]=null;
  }
  if(!gear) return;
  if(!current){
    current=shutterRims[index]=makeShutterRim(gear);
    gear.rimExposure=true;
    if(gear.marker) gear.marker.visible=false;
  }
  current.mesh.material.uniforms.blur.value=blur;
  current.mesh.scale.copy(gear.body.scale);
}

function updateFx(dt,dist){
  if(!paused){updateBH(dt); updateBB(dt)}
  if(career){
    var end=careerGears[careerGears.length-1], speed=end?rpmOf(end.omega):0;
    var blur=end&&speed>45000&&career.shutterOpen()&&!P.fxOff&&!end.install
      ? sstep(45000,85000,speed)*(.22+.78*sstep(Math.log(50000),Math.log(1500000),Math.log(speed))) : 0;
    var mate=careerGears[careerGears.length-2];
    updateShutterRim(0,blur?end:null,blur);
    updateShutterRim(1,blur&&mate&&!mate.install?mate:null,blur);
  }
  var t, u=warpPass?warpPass.uniforms:null, i, n=0, hn=0, maxA=0, asp=camera.aspect, pulse=false;
  if(expl.t>=0){
    expl.t+=dt; t=expl.t;
    var rr=Math.max(1,expl.Rmax*(1-Math.exp(-t/0.9)));
    expl.ring.scale.set(rr,rr,1); expl.ring.material.opacity=0.9*Math.exp(-t*0.5);
    var sr=Math.max(1,0.55*expl.Rmax*(1-Math.exp(-t/0.45)));
    expl.sphere.scale.setScalar(sr); expl.sphere.material.opacity=0.55*Math.exp(-t*1.1);
    var p=expl.pts.geometry.attributes.position.array, v=expl.vel, k=Math.exp(-dt*0.8), N=p.length/3;
    for(i=0;i<N;i++){ p[i*3]+=v[i*3]*dt; p[i*3+1]+=v[i*3+1]*dt; p[i*3+2]+=v[i*3+2]*dt; v[i*3]*=k; v[i*3+1]*=k; v[i*3+2]*=k; }
    expl.pts.geometry.attributes.position.needsUpdate=true; expl.pts.material.opacity=Math.exp(-t*0.35);
    expl.shake=dist*0.03*Math.exp(-t*1.6);
    expl.shakeV.set((Math.random()-0.5)*2,(Math.random()-0.5)*2,(Math.random()-0.5)*2).multiplyScalar(expl.shake);
    if(t>10){expl.t=-1; expl.far=0; expl.shake=0; expl.ring.visible=expl.sphere.visible=expl.pts.visible=false}
  }
  if(u){
    if(!P.fxOff){
      for(i=0;i<relSel.length;i++){
        var g=relSel[i].g, a=ampOf(relSel[i].b); if(a<=0) continue;
        tmpV.set(g.x,lY(g.layer)+TH/2,g.z).project(camera); if(tmpV.z>1) continue;
        tmpR.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(g.r+M);
        tmpV2.set(g.x,lY(g.layer)+TH/2,g.z).add(tmpR).project(camera);
        var dx=(tmpV2.x-tmpV.x)*0.5*asp, dy=(tmpV2.y-tmpV.y)*0.5, ru=Math.sqrt(dx*dx+dy*dy);
        u.uP.value[n].set(tmpV.x*0.5+0.5,tmpV.y*0.5+0.5); u.uA.value[n]=a;
        u.uR.value[n]=Math.min(3,Math.max(0.05,ru*(2.5+1.5*a)));
        if(a>maxA) maxA=a; n++;
      }
    }
    if(!P.heatOff&&!P.fxOff){
      for(i=0;i<hazeSel.length;i++){
        var hg=hazeSel[i], ha=sstep(600,2500,hg.T); if(ha<=0.01) continue;
        var pos=hg.grp3.position, y=pos.y+TH/2;
        tmpV.set(pos.x,y,pos.z).project(camera); if(tmpV.z>1||tmpV.z<-1) continue;
        tmpR.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(hg.r+M);
        tmpV2.set(pos.x,y,pos.z).add(tmpR).project(camera);
        var hx=(tmpV2.x-tmpV.x)*0.5*asp, hy=(tmpV2.y-tmpV.y)*0.5, hr=Math.sqrt(hx*hx+hy*hy);
        u.uH.value[hn].set(tmpV.x*0.5+0.5,tmpV.y*0.5+0.5); u.uHA.value[hn]=ha*Math.min(2.5,1+0.5*Math.log10(Math.max(1,hg.T/2500)+1));
        u.uHR.value[hn]=Math.min(1.5,Math.max(0.05,hr*2.4)); hn++;
      }
    }
    u.uLightTime.value=1;
    if(lightPulseAge<lightPulseDuration){
      lightPulseAge+=dt;
      if(!P.fxOff&&end&&lightPulseAge<lightPulseDuration){
        camera.updateMatrixWorld();
        var center=end.grp3.position, y0=center.y+TH*.6, radius=end.r+M;
        tmpV.set(center.x,y0,center.z).project(camera);
        tmpR.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(radius);
        tmpV2.set(center.x,y0,center.z).add(tmpR).project(camera);
        var lightR=Math.hypot((tmpV2.x-tmpV.x)*.5*asp,(tmpV2.y-tmpV.y)*.5);
        if(tmpV.z>-1&&tmpV.z<1&&lightR>.003){
          u.uClip.value.set(camera.near,camera.far);
          var inv=camera.matrixWorldInverse.elements;
          var depth=-(inv[2]*center.x+inv[6]*y0+inv[10]*center.z+inv[14])+radius;
          u.uLight.value.set(tmpV.x*.5+.5,tmpV.y*.5+.5,lightR,depth);
          u.uLightTime.value=lightPulseAge/lightPulseDuration;
          pulse=true;
        }
      }
    }
    u.uHN.value=hn;
    u.uN.value=n; u.uAspect.value=asp; u.uTime.value=(performance.now()/1000)%1000; u.uCA.value=Math.min(1,maxA*0.4);
    if(expl.t>=0){
      t=expl.t; tmpV.copy(expl.pos).project(camera);
      var cx=tmpV.z>1?0.5:tmpV.x*0.5+0.5, cy=tmpV.z>1?0.5:tmpV.y*0.5+0.5;
      u.uShock.value.set(cx,cy,2.8*(1-Math.exp(-t/0.8)),Math.exp(-t*0.5));
      u.uFlash.value=Math.exp(-t*2.5); u.uFlashCol.value.set(0.75,0.88,1.0);
      u.uSwirl.value=0.9*Math.exp(-t*0.3)*(1+Math.min(2,Math.log10(Math.max(1,expl.beta))));
    } else { u.uShock.value.set(0.5,0.5,0,0); u.uFlash.value=0; u.uSwirl.value=0; u.uFlashCol.value.set(0.75,0.88,1.0); }
    if(bbx.t>=0){
      var fb=bbFlash(bbx.t);
      if(fb.a>u.uFlash.value){ u.uFlash.value=fb.a; u.uFlashCol.value.set(fb.c[0],fb.c[1],fb.c[2]); }
    }
    if(hardFlash>0.01&&hardFlash>u.uFlash.value){u.uFlash.value=hardFlash; u.uFlashCol.value.set(1,0.8,0.5)}
    if(bh.on){
      tmpV.copy(bh.pos).project(camera);
      if(tmpV.z<=1){
        tmpR.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(bh.Rs*3);
        tmpV2.copy(bh.pos).add(tmpR).project(camera);
        var bx=(tmpV2.x-tmpV.x)*0.5*asp, by=(tmpV2.y-tmpV.y)*0.5;
        u.uBH.value.set(tmpV.x*0.5+0.5,tmpV.y*0.5+0.5,Math.max(0.01,Math.sqrt(bx*bx+by*by)),1);
      } else u.uBH.value.set(0,0,0,0);
    } else u.uBH.value.set(0,0,0,0);
  }
  fxActive=n>0||hn>0||pulse||expl.t>=0||bh.on||bbx.t>=0||hardFlash>0.02;
  var sa=Math.max(expl.t>=0?expl.shake:0,bbx.t>=0?dist*bbx.shake:0,hardShake);
  shakeAmp=sa; if(sa>0) shakeV.set((Math.random()-0.5)*2,(Math.random()-0.5)*2,(Math.random()-0.5)*2).multiplyScalar(sa);
  if(bloom){ if(hardFlash>0.05) bloom.strength=Math.max(bloom.strength,1.3*hardFlash); if(bh.on||bbx.t>=0) bloom.strength=Math.max(bloom.strength,bh.on?0.7:1.2*Math.exp(-bbx.t*0.2)); if(expl.t>=0) bloom.strength=Math.max(bloom.strength,1.6*Math.exp(-expl.t*0.6)); else if(!bloomOn) bloom.strength=0 }
}

var QN=['低','中','高'], prMax=1.5;
function applyQuality(){
  var dpr=window.devicePixelRatio||1, q=P.q, sz=q===2?2048:1024;
  prMax=q===2?Math.min(dpr,2):(q===1?Math.min(dpr,1.25):0.7); pr=prMax; renderer.setPixelRatio(pr); resize();
  if(sun.shadow.mapSize.x!==sz){ sun.shadow.mapSize.set(sz,sz); if(sun.shadow.map){sun.shadow.map.dispose(); sun.shadow.map=null} }
  shadowDirty=true;
}
function syncQ(){ $('bQ').textContent='画质：'+QN[P.q]; }
/* ===== main loop ===== */
var fc=0, last=null, hudT=0, hc=new THREE.Color(), fpsAcc=0, fpsN=0;
function loop(t){
  requestAnimationFrame(loop);
  if(last===null){last=t; return}
  if(t<=last) return;
  var dt=Math.min(0.05,(t-last)/1000); last=t;
  if(!paused && !careerBroken){ physics(dt/2); physics(dt/2); }
  if(career) career.advance(paused?0:dt);
  var refitting=refitStart>0;
  if(refitting){
    var progress=Math.min(1,(performance.now()-refitStart)/360), ease=progress*progress*(3-2*progress);
    G.forEach(function(g){
      var old=g.refitFrom; if(!old) return;
      g.grp3.position.x=old.x+(g.x-old.x)*ease;
      g.grp3.position.z=old.z+(g.z-old.z)*ease;
      var scale=old.scale+(1-old.scale)*ease;
      g.body.scale.set(scale,1,scale);
      if(progress>=1) g.refitFrom=null;
    });
    axles.forEach(function(m){var p=m.userData.gear.grp3.position; m.position.x=p.x; m.position.z=p.z});
    if(progress>=1) refitStart=0;
  }
  fc++;
  var heatDt=Math.max(dt,0.001)*(careerMode?careerThermalClock:1), many=G.length>40, moving=false, assembling=false, hs=many?heatDt*2:heatDt;
  for(var i=0;i<G.length;i++){
    var g=G[i]; g.grp3.rotation.y=career?career.angle(g):g.angle;
    if(g.install){
      var install=g.install;
      install.elapsed+=dt;
      var drop=Math.max(0,Math.min(1,(install.elapsed-install.delay)/0.64));
      g.grp3.position.y=lY(g.layer)+install.lift*(1-drop*drop*(3-2*drop));
      if(drop<1){
        var engagement=Math.max(0,(drop-0.86)/0.14);
        var turn=g.grp3.rotation.y-install.angle;
        g.grp3.rotation.y=install.angle+(turn-TAU2*Math.round(turn/TAU2))*engagement;
      }else{g.install=null}
      assembling=true;
    }
    if(g.omega>1e-3||g.omega<-1e-3) moving=true;
    if(!paused && !careerBroken && !P.heatOff && (!many||((i+fc)&1)===0)){ heat(g,hs); if(g.T>g.Tmax) g.Tmax=g.T; if(P.hard) meltStep(g,hs); }
    look(g,dt);
  }
  if(!paused && !careerBroken && !P.heatOff) conduct(heatDt);
  var fdt=paused?0:dt;
  if(frags.length) updateFrags(fdt);
  if(pools.length) updatePools(fdt);
  hardFlash*=Math.exp(-fdt*6); hardShake*=Math.exp(-fdt*5);
  if((moving||refitting||assembling||shadowDirty||frags.length)&&((fc&1)===0||shadowDirty||refitting||assembling)){ renderer.shadowMap.needsUpdate=true; shadowDirty=false }
  var dist=camera.position.distanceTo(controls.target);
  var shw=P.q>=1&&dist<700; if(sun.castShadow!==shw) sun.castShadow=shw;
  for(var li=0;li<G.length;li++){ var lg=G[li], sm=(lg.r+M)/dist<0.012; if(sm!==lg.smallF){ lg.smallF=sm; lg.hub.visible=!sm; if(lg.marker) lg.marker.visible=!sm&&!lg.rimExposure } }
  var nn=Math.max(0.02,dist*0.01), ff=Math.max(3000,dist*80,expl.far,bbx.far);
  if(Math.abs(nn-camera.near)>camera.near*0.05||Math.abs(ff-camera.far)>camera.far*0.05){camera.near=nn; camera.far=ff; camera.updateProjectionMatrix()}
  scene.fog.near=dist*4+200; scene.fog.far=Math.max(dist*60+3000,expl.far*1.5,bbx.far*1.5);
  grid.visible=!careerMode&&dist<500; gridBig.visible=!careerMode&&dist>=120;
  controls.update();
  updateFx(fdt,dist);
  updateSparks(fdt,dist);
  var shk=shakeAmp>0;
  if(shk) camera.position.add(shakeV);
  if(careerMode&&bloom) bloom.enabled=bloomOn;
  if(composer&&(bloomOn||fxActive)){ try{composer.render()}catch(e){composer=null; renderer.render(scene,camera)} } else renderer.render(scene,camera);
  if(shk) camera.position.sub(shakeV);
  hudT+=dt; if(hudT>0.1){var td=hudT; hudT=0; computeLoads(paused?0:td); if(P.hard&&!paused) damage(td); updateRel(); updateHud(); if(career) career.draw(); updateLight(); sndUpdate()}
  fpsAcc+=dt; fpsN++;
  if(fpsAcc>1.5){ if(fpsAcc/fpsN>0.03){ if(pr>Math.min(0.75,prMax)){pr=Math.max(Math.min(0.75,prMax),pr-0.25); renderer.setPixelRatio(pr); resize()} else if(P.q>0&&P.autoQ){P.q--; applyQuality(); syncQ(); toast('帧率偏低，已自动降到画质：'+QN[P.q])} } fpsAcc=0; fpsN=0; }
}

/* ===== starter bench ===== */
function meshAt(o,deg,n,l){
  var a=deg*Math.PI/180, R=o.r+rOf(n);
  return addGear(n,o.x+Math.cos(a)*R,o.z-Math.sin(a)*R,l===undefined?o.layer:l,undefined,null);
}
function demo(){
  var g1=addGear(20,0,0,0,0,{E:1}); g1.motorMesh.visible=true;
  var g2=meshAt(g1,0,40);
  var g7=meshAt(g1,180,24);
  meshAt(g2,90,60);
  var g3=addGear(16,g2.x,g2.z,1,undefined,null);
  var g4=meshAt(g3,0,48);
  var g5=addGear(14,g4.x,g4.z,2,undefined,null);
  meshAt(g5,0,30);
  meshAt(g7,200,12);
  rebuild();
}
/* ===== save / load (auto, localStorage) + text export/import ===== */
var KEY='gearlab.v1';
function snapshot(){
  return {v:1,P:P,layer:layer,teeth:teeth,
    cam:[camera.position.toArray(),controls.target.toArray()],
    G:G.map(function(g){return [g.n,g.x,g.z,g.layer,g.angle,g.motor?g.motor.E:-1,g.mt.k,Array.from(g.broken),g.fat,g.free?1:0,g.cc||'']})};
}
function applySave(d){
  if(!d||!Array.isArray(d.G)) throw new Error('bad');
  var list=d.G.filter(function(a){
    return Array.isArray(a)&&a.length>=6&&a.slice(0,6).every(isFinite)&&a[0]>=1&&a[0]<=10000&&a[0]%1===0&&a[3]>=0&&a[3]%1===0;
  });
  noRebuild=true;
  G.slice().forEach(disposeGear);
  G.length=0; selected=null; history=[];
  clearDebris();
  list.forEach(function(a){addGear(a[0],a[1],a[2],a[3],a[4],a[5]>=0?{E:Math.min(1,a[5])}:null,a[6],{broken:a[7],fat:a[8],free:a[9]===1,color:a[10]})});
  noRebuild=false; rebuild();
  if(d.P){['tau','rpm','cap','mu'].forEach(function(k){if(isFinite(d.P[k])&&d.P[k]>0) P[k]=d.P[k]});}
  if(d.P&&isFinite(d.P.rpmL)){P.rpmL=d.P.rpmL; P.rpmS=typeof d.P.rpmS==='string'?d.P.rpmS:String(P.rpm)} else {P.rpmL=Math.log10(P.rpm); P.rpmS=String(P.rpm)} P.mul=(d.P&&d.P.mul>=1&&d.P.mul<=5)?d.P.mul|0:1; ['capB','capT','capG'].forEach(function(k){P[k]=(d.P&&isFinite(d.P[k])&&d.P[k]>0)?d.P[k]:0}); $('rCapB').value=P.capB||0; $('rCapT').value=P.capT||0; $('rCapG').value=P.capG||0; recalcSpeed(); $('rTau').value=P.tau; $('rRpm').value=P.rpmS; $('rCap').value=P.cap; $('rMu').value=P.mu; P.heatOff=!!(d.P&&d.P.heatOff); syncHeat(); P.fxOff=!!(d.P&&d.P.fxOff); syncFx(); P.bhOn=!!(d.P&&d.P.bhOn); P.bbOn=!!(d.P&&d.P.bbOn); syncBH(); syncBB(); P.inf=!!(d.P&&d.P.inf); $('rInf').checked=P.inf; syncInf();
  P.hard=!!(d.P&&d.P.hard); P.chart=!!(d.P&&d.P.chart); P.snd=!(d.P&&d.P.snd===false); P.bgm=!(d.P&&d.P.bgm===false); if(d.P&&isFinite(d.P.accel)&&d.P.accel>0) P.accel=d.P.accel; if(d.P&&d.P.q>=0&&d.P.q<=2) P.q=d.P.q|0; if(d.P&&MATS[d.P.mat]) P.mat=d.P.mat; $('mtSel').value=P.mat; P.color=(d.P&&typeof d.P.color==='string'&&/^#[0-9a-fA-F]{6}$/.test(d.P.color))?d.P.color:null; if(P.color) $('cSel').value=P.color; $('rAcc').value=P.accel; syncHard(); syncChart(); syncSnd(); syncBgm(); syncQ(); applyQuality();
  setTeeth(d.teeth||20); setLayer((d.layer||0)+1);
  try{ if(d.cam&&d.cam[0].every(isFinite)&&d.cam[1].every(isFinite)){camera.position.fromArray(d.cam[0]); controls.target.fromArray(d.cam[1]); controls.update()} }catch(e){}
  return list.length;
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(snapshot()))}catch(e){}}
var loaded=0;
try{ var raw=careerMode?null:localStorage.getItem(KEY); if(raw){ loaded=1; var cnt=applySave(JSON.parse(raw)); } }catch(e){ loaded=0; }
if(!careerMode){
  if(!loaded) demo();
  setInterval(save,3000);
  window.addEventListener('pagehide',save);
  document.addEventListener('visibilitychange',function(){if(document.hidden) save()});
}
$('bExp').addEventListener('click',function(){
  var ta=$('sv'); ta.value=JSON.stringify(snapshot()); ta.focus(); ta.select();
  try{ navigator.clipboard.writeText(ta.value).then(function(){toast('存档已复制')},function(){toast('已生成存档文本，请手动复制')}); }
  catch(e){ toast('已生成存档文本，请手动复制'); }
});
$('bImp').addEventListener('click',function(){
  try{ var n=applySave(JSON.parse($('sv').value)); save(); $('settings').classList.remove('on'); toast('已读取存档：'+n+' 个齿轮'); }
  catch(e){ toast('存档文本无效',true); }
});
try{
  if(!THREE.EffectComposer||!THREE.UnrealBloomPass) throw new Error('no post');
  var rt=new THREE.WebGLRenderTarget(2,2,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
  composer=new THREE.EffectComposer(renderer,rt);
  var heatDepth=careerMode&&(renderer.capabilities.isWebGL2||renderer.extensions.has('WEBGL_depth_texture'));
  if(heatDepth){
    composer.renderTarget1.depthTexture=new THREE.DepthTexture(2,2,THREE.UnsignedIntType);
    composer.renderTarget2.depthTexture=new THREE.DepthTexture(2,2,THREE.UnsignedIntType);
  }
  composer.addPass(new THREE.RenderPass(scene,camera));
  bloom=new THREE.UnrealBloomPass(new THREE.Vector2(256,256),0.8,0.7,0.8);
  var bs=bloom.setSize.bind(bloom); bloom.setSize=function(w,h){bs(Math.max(2,w>>1),Math.max(2,h>>1))};
  composer.addPass(bloom);
  warpPass=new THREE.ShaderPass({
    uniforms:{tDiffuse:{value:null},uAspect:{value:1},uTime:{value:0},uN:{value:0},uCA:{value:0},uFlash:{value:0},uSwirl:{value:0},uBH:{value:new THREE.Vector4()},uHN:{value:0},uH:{value:[new THREE.Vector2(),new THREE.Vector2(),new THREE.Vector2(),new THREE.Vector2()]},uHA:{value:[0,0,0,0]},uHR:{value:[1,1,1,1]},uFlashCol:{value:new THREE.Vector3(0.75,0.88,1.0)},
      uP:{value:[new THREE.Vector2(),new THREE.Vector2(),new THREE.Vector2(),new THREE.Vector2()]},
      uA:{value:[0,0,0,0]},uR:{value:[1,1,1,1]},uShock:{value:new THREE.Vector4(0.5,0.5,0,0)},
      uLight:{value:new THREE.Vector4()},uLightTime:{value:1},
      uDepth:{value:null},uHasDepth:{value:heatDepth?1:0},uClip:{value:new THREE.Vector2()}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:[
'uniform sampler2D tDiffuse; uniform float uAspect,uTime,uN,uCA,uFlash,uSwirl; uniform vec2 uP[4]; uniform float uA[4]; uniform float uR[4]; uniform vec4 uShock; uniform vec4 uBH; uniform vec3 uFlashCol; uniform float uHN; uniform vec2 uH[4]; uniform float uHA[4]; uniform float uHR[4]; varying vec2 vUv;',
'uniform sampler2D uDepth; uniform vec2 uClip; uniform float uHasDepth; uniform vec4 uLight; uniform float uLightTime;',
'float sceneZ(vec2 uv){',
'  float z=texture2D(uDepth,uv).r;',
'  return uClip.x*uClip.y/mix(uClip.y,uClip.x,z);',
'}',
'vec2 refractionUV(vec2 s){',
'  for(int j=0;j<4;j++){',
'    if(float(j)>=uHN) break;',
'    vec2 d=s-uH[j]; d.x*=uAspect; float R=uHR[j];',
'    vec2 e=vec2(d.x/R,(d.y-0.35*R)/(R*1.8)); float f=exp(-dot(e,e));',
'    float n1=sin(s.y*70.0-uTime*5.0+s.x*23.0); float n2=sin(s.y*43.0-uTime*3.3-s.x*31.0);',
'    s+=vec2(n1+0.6*n2,0.4*n2)*0.0022*uHA[j]*f;',
'  }',
'  if(uLightTime>=1.0) return s;',
'  if(uHasDepth>.5&&sceneZ(s)<uLight.w) return s;',
'  vec2 d=(s-uLight.xy)*vec2(uAspect,1.0);',
'  float r=length(d); float t=uLightTime;',
'  if(r<=uLight.z) return s;',
'  float q=(r/uLight.z-(1.12+2.8*t))/(0.27+0.35*t);',
'  float fade=smoothstep(0.0,0.07,t)*(1.0-smoothstep(0.13,1.0,t));',
'  float wave=(1.0-smoothstep(0.0,2.0,abs(q)))*sin(2.3*q)*fade;',
'  vec2 warped=s+d/r/vec2(uAspect,1.0)*wave*min(.24*uLight.z,.016);',
'  return uHasDepth>.5&&sceneZ(warped)<uLight.w?s:warped;',
'}',
'vec2 warpS(vec2 s,float kk){',
'  if(uBH.w>0.5){ vec2 d=s-uBH.xy; d.x*=uAspect; float r=max(length(d),1e-4); float te=uBH.z; d*=1.0-(te*te)/(r*r); d.x/=uAspect; s=uBH.xy+d; }',
'  for(int i=0;i<4;i++){',
'    if(float(i)>=uN) break;',
'    float a=uA[i]*kk; if(a<=0.0) continue;',
'    vec2 d=s-uP[i]; d.x*=uAspect;',
'    float R=uR[i]; float r=length(d); float q=r/R; float f=exp(-q*q);',
'    float ang=a*1.6*f; float cs=cos(ang), sn=sin(ang);',
'    d=vec2(cs*d.x-sn*d.y, sn*d.x+cs*d.y);',
'    float re=0.22*R*min(1.0,a*0.5); float r2=dot(d,d);',
'    d*=1.0-re*re/(r2+0.02*re*re+1e-8);',
'    d+=normalize(d+vec2(1e-6))*sin(q*14.0-uTime*6.0)*0.003*min(a,4.0)*f;',
'    d.x/=uAspect; s=uP[i]+d;',
'  }',
'  if(uShock.w>0.0){',
'    vec2 d=s-uShock.xy; d.x*=uAspect; float r=length(d);',
'    float diff=r-uShock.z; float w=0.04+0.05*uShock.z; float ring=exp(-(diff*diff)/(w*w));',
'    d+=d/max(r,1e-4)*ring*uShock.w*0.12*sin(diff/w*3.0);',
'    float sw=uSwirl*exp(-r*r*0.6); float cs=cos(sw), sn=sin(sw);',
'    d=vec2(cs*d.x-sn*d.y, sn*d.x+cs*d.y); d.x/=uAspect; s=uShock.xy+d;',
'  }',
'  return s;',
'}',
'void main(){',
'  vec3 c;',
'  vec2 uv=refractionUV(vUv);',
'  if(uN<0.5&&uBH.w<0.5&&uShock.w<=0.0) c=texture2D(tDiffuse,uv).rgb;',
'  else{',
'    c.r=texture2D(tDiffuse,warpS(uv,1.0)).r;',
'    c.g=texture2D(tDiffuse,warpS(uv,1.0+0.06*uCA)).g;',
'    c.b=texture2D(tDiffuse,warpS(uv,1.0+0.12*uCA)).b;',
'  }',
'  for(int i=0;i<4;i++){',
'    if(float(i)>=uN) break;',
'    float a=uA[i]; if(a<1.0) continue;',
'    vec2 d=vUv-uP[i]; d.x*=uAspect; float R=uR[i]; float r=length(d);',
'    float g=smoothstep(1.0,2.0,a); float ang=atan(d.y,d.x);',
'    float re=0.22*R*min(1.0,a*0.5); float rq=r/max(re,1e-4);',
'    float t1=(rq-1.0)/0.18; float ring=exp(-t1*t1);',
'    float t2=(rq-1.9)/0.7; float disk=exp(-t2*t2)*(0.5+0.5*sin(2.0*ang+rq*5.0-uTime*(2.0+a)));',
'    float dop=0.7+0.3*cos(ang);',
'    vec3 hot=mix(vec3(1.0,0.55,0.2),vec3(0.55,0.75,1.0),clamp(a*0.15,0.0,1.0));',
'    c+=(ring*1.6+disk*0.9)*dop*hot*g;',
'    float rc=re*0.55; c*=mix(1.0,smoothstep(rc*0.8,rc*1.2,r),g);',
'  }',
'  if(uShock.w>0.0){ vec2 d=vUv-uShock.xy; d.x*=uAspect; float r=length(d); float diff=r-uShock.z; float w=0.04+0.05*uShock.z; c+=exp(-(diff*diff)/(w*w))*uShock.w*vec3(0.45,0.7,1.0)*3.0; }',
'  c+=uFlash*uFlashCol*4.0;',
'  if(uBH.w>0.5){ float rb=length((vUv-uBH.xy)*vec2(uAspect,1.0)); if(rb<uBH.z*0.6) c=vec3(0.0); c+=vec3(1.0,0.82,0.55)*exp(-pow((rb-uBH.z*0.62)/(uBH.z*0.035),2.0))*1.5; }',
careerMode
  ? [
    '  float y=dot(c,vec3(0.2126,0.7152,0.0722));',
    '  float h=max(0.0,y-0.38);',
    '  if(h>0.0) c*=(0.38+0.62*h/(h+0.82))/y;',
    '  float p=max(c.r,max(c.g,c.b));',
    '  if(p>1.0){ float l=dot(c,vec3(0.2126,0.7152,0.0722)); c=mix(c,vec3(l),(p-1.0)/(p-l)); }',
  ].join('\n')
  : '  float m=max(c.r,max(c.g,c.b)); c=mix(c,vec3(m),smoothstep(1.5,1000.0,m)*0.85); m=max(c.r,max(c.g,c.b)); c/=max(1.0,m);',
'  gl_FragColor=vec4(c,1.0);',
'}'].join('\n')
  });
  if(heatDepth){
    var renderWarp=warpPass.render;
    warpPass.render=function(renderer,writeBuffer,readBuffer){
      this.uniforms.uDepth.value=readBuffer.depthTexture;
      renderWarp.apply(this,arguments);
    };
  }
  composer.addPass(warpPass);
  resize();
}catch(e){composer=null; bloom=null}
syncHeat(); syncFx(); syncBH(); syncBB(); syncHard(); syncChart(); syncSnd(); syncBgm(); syncQ(); applyQuality(); fitShadow();
if(careerMode){
  document.body.classList.add('career'); tool='sel'; P.snd=false; P.bgm=false; syncSnd(); syncBgm();
  scene.background.setHex(0x20272d); scene.fog.color.copy(scene.background);
  ground.material.color.setHex(0x1a2026);
  hemi.intensity=.56; fill.intensity=.6; fill.position.set(-45,50,45);
  ground.material.onBeforeCompile=function(shader){
    shader.vertexShader=shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 floorPosition;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfloorPosition=position.xy;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 floorPosition;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 tile=floorPosition*.25;
      vec2 px=max(fwidth(tile),vec2(.0001));
      vec2 d=abs(fract(tile+.5)-.5);
      vec2 line=1.0-smoothstep(vec2(.007),.020+px,d);
      float gridFade=1.0-smoothstep(.12,.36,max(px.x,px.y));
      diffuseColor.rgb*=1.0-max(line.x,line.y)*.27*gridFade;
    `);
  };
  career=window.LabProgress.start({
    material:MATS,
    stage:stage,
    togglePause:function(){paused=!paused; return paused},
    quality:function(){P.q=(P.q+1)%3; applyQuality(); syncQ(); return QN[P.q]},
    environment:function(air,bearing){airDrag=air; bearingDrag=bearing},
    estimate:estimateCareer,
    limit:function(rpm){careerLimit=rpm},
    breakGear:function(g,animate){
      if(!g || careerBroken) return;
      careerBroken=true;
      if(animate) burstGear(g);
      g.grp3.visible=false;
      comps.forEach(function(c){c.w=0});
      G.forEach(function(gear){gear.omega=0});
      shadowDirty=true;
    },
    drive:function(torque,rpm){P.tau=torque; P.rpm=rpm; P.rpmL=Math.log10(rpm); P.mul=1; P.cap=1e20; P.inf=false; recalcSpeed()},
    build:function(count,running,input,upper,driven,material,append,animate,cold){
      if(cold){ lightPulseAge=lightPulseDuration; careerBroken=false; hardShake=hardFlash=0; }
      var existing=append?G.length/2:0, previous=existing||cold?[]:G.slice(), x=0, z=0, i;
      careerRunning=running;
      if(append) for(i=running*2;i<G.length;i++) G[i].omega=0;
      if(!existing) refitStart=0;
      noRebuild=true;
      if(!existing){ G.slice().forEach(disposeGear); G.length=0; selected=null; clearDebris(); }
      else { x=G[G.length-1].x; z=G[G.length-1].z; }
      for(i=existing;i<count;i++){
        var drive=i===0?input:upper;
        addGear(drive,x,z,i,undefined,i===0?{E:1}:null,material);
        var heading=(i%2===0?0.15:-.15), spacing=rOf(drive)+rOf(driven);
        x+=Math.cos(heading)*spacing; z+=Math.sin(heading)*spacing;
        addGear(driven,x,z,i,undefined,null,material);
      }
      previous.forEach(function(old,index){
        var g=G[index];
        if(!g) return;
        g.omega=old.omega;
        if(g.mt===old.mt){g.T=old.T; g.Tdisc=old.Tdisc; g.Thub=old.Thub; g.Tmax=old.Tmax}
        if(animate){
          var scale=old.r*old.body.scale.x/g.r, p=old.grp3.position;
          g.refitFrom={x:p.x,z:p.z,scale:scale}; g.grp3.position.x=p.x; g.grp3.position.z=p.z;
          g.body.scale.set(scale,1,scale);
        }
      });
      noRebuild=false; rebuild();
      careerGears=G.slice(0,running*2);
      G.forEach(function(g){g.omega=g.comp.w*g.k});
      if(animate && append){
        for(i=existing*2;i<G.length;i++){
          var g=G[i], lift=Math.max(2.6,g.r*1.15);
          g.install={angle:g.angle,lift:lift,elapsed:0,delay:i%2===0?0.12:0.28};
          g.grp3.position.y+=lift;
        }
      }else if(animate){refitStart=performance.now()}
    },
    read:function(){return careerGears},
    tipSpeed:tipSpeed,
    lightPulse:function(){lightPulseAge=0},
    lightRpm:function(teeth){return C_LIGHT/tipSpeed({omega:TAU2/60,r:rOf(teeth)})},
    resize:resize,
    fit:function(terminal){
      var first=G[0], end=careerGears[careerGears.length-1]; if(!first||!end) return;
      var bounds=new THREE.Box3(), corner=new THREE.Vector3();
      var focus=terminal===true;
      (focus?[end]:G).forEach(function(g){
        var r=g.r+M, y=lY(g.layer)+TH+(g.install?g.install.lift:0);
        if(focus){r*=2.5; y+=1.5}
        bounds.expandByPoint(corner.set(g.x-r,focus?lY(g.layer)-.25:0,g.z-r));
        bounds.expandByPoint(corner.set(g.x+r,y,g.z+r));
      });
      if(!focus) bounds.expandByPoint(corner.set(first.x,lY(first.layer)+TH+2,first.z+first.r+1));
      var aim=bounds.getCenter(new THREE.Vector3());
      var mobile=camera.aspect<1.0;
      var arm=new THREE.Vector3(mobile?-.4:-.1,mobile?.86:.84,1).normalize();
      var right=new THREE.Vector3().crossVectors(camera.up,arm).normalize();
      var up=new THREE.Vector3().crossVectors(arm,right);
      var vf=Math.tan(camera.fov*Math.PI/360)*.84, hf=vf*camera.aspect, distance=0;
      for(var i=0;i<8;i++){
        corner.set(i&1?bounds.max.x:bounds.min.x,i&2?bounds.max.y:bounds.min.y,i&4?bounds.max.z:bounds.min.z).sub(aim);
        distance=Math.max(distance,corner.dot(arm)+Math.max(Math.abs(corner.dot(right))/hf,Math.abs(corner.dot(up))/vf));
      }
      controls.target.copy(aim); camera.position.copy(aim).addScaledVector(arm,distance); controls.update();
    }
  });
}
requestAnimationFrame(loop);
if(!careerMode){
  $('top').hidden=false; $('dock').hidden=false;
  toast(loaded?'已恢复上次的存档（自动保存）':'示例已运转：试试放置齿轮，或给任意齿轮装马达');
}
})();

  }
})();
