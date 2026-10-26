/* Código de acceso: llega dentro del QR (#c=...) y se recuerda en este teléfono.
   Las fotos y nombres viajan cifrados en datos.bin; solo se pueden abrir con el código. */
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
let CODE=(location.hash.match(/c=([a-z0-9]+)/)||[])[1]||lsGet('bicafe_c')||'';
if(location.hash.includes('c=')){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}
let PEOPLE=[],byId={},ALL=[],QR_IMG='';
async function loadData(code){
  const buf=new Uint8Array(await fetch('datos.bin',{cache:'no-cache'}).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}));
  const salt=buf.slice(0,16),iv=buf.slice(16,28),ct=buf.slice(28);
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ct);
  const u=new Uint8Array(plain),n=new DataView(plain).getUint32(0),h=JSON.parse(new TextDecoder().decode(u.slice(4,4+n)));
  const B=4+n,url=(o,t)=>URL.createObjectURL(new Blob([u.slice(B+o[0],B+o[0]+o[1])],{type:t}));
  return {people:h.people.map(p=>({...p,img:url(h.off[p.id],'image/jpeg')})),qr:url(h.qr,'image/png')};
}
async function gate(){
  if(!CODE)return false;
  try{
    const d=await loadData(CODE);
    PEOPLE=d.people;
    byId=Object.fromEntries(PEOPLE.map(p=>[p.id,p]));
    ALL=[...PEOPLE].sort((a,b)=>a.n.localeCompare(b.n,'es'));
    QR_IMG=(typeof qrPropio==='function')?qrPropio():d.qr;
    lsSet('bicafe_c',CODE);
    return true;
  }catch(e){lsSet('bicafe_c','');return false}
}
function loadingScreen(app){app.innerHTML='<section class="screen"><div class="card hero" style="align-items:center;text-align:center"><div class="drum">'+[0,1,2].map(i=>beanSVG(i)).join('')+'</div><p>Cargando…</p></div></section>'}
function lockScreen(app){
  app.innerHTML=`<section class="screen"><div class="card hero">
    <div class="stripe"><span></span><span></span><span></span></div>
    <h1>Reconocimientos BICAFE</h1>
    <p>Para entrar, escanea el código QR de la encuesta o escribe el código de acceso.</p>
    <form class="keyform" id="cf"><input id="cin" placeholder="Código de acceso" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn main" style="flex:0 0 auto">Entrar</button></form>
    <p class="status warn" id="cerr" hidden>Ese código no es válido.</p>
  </div></section>`;
  document.getElementById('cf').onsubmit=async e=>{e.preventDefault();CODE=document.getElementById('cin').value.trim().toLowerCase();
    if(await gate())location.reload();else document.getElementById('cerr').hidden=false};
}
const QS=[
 {key:'puntualidad',color:'red',pill:'Puntualidad y compromiso',title:'Puntualidad y compromiso',
  ask:'¿Qué colaborador o colaboradora se distingue por su puntualidad y por llegar temprano a la empresa, demostrando compromiso y responsabilidad?'},
 {key:'servicio',color:'yellow',pill:'Producción y Bodega',title:'Espíritu de servicio y colaboración',
  ask:'¿Qué compañero o compañera de las áreas de Producción y Bodega siempre está dispuesto(a) a ayudar, colaborar con los demás y brindar apoyo cuando se necesita?'},
 {key:'alegria',color:'green',pill:'Área Administrativa',title:'Alegría y compañerismo',
  ask:'¿Qué colaborador o colaboradora del área Administrativa se destaca por su alegría, actitud positiva y compañerismo, contribuyendo a crear un ambiente de trabajo agradable?'}
];
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function setQ(color){const r=document.documentElement.style;r.setProperty('--q',`var(--${color})`);r.setProperty('--q-ink',color==='yellow'?'#1C1C1C':'#FFFFFF')}
const beanSVG=i=>`<svg class="bean b${i}" viewBox="0 0 26 32" aria-hidden="true"><path class="shell" d="M13 2C6 2 2 9 2 17s4 13 11 13 11-6 11-14S20 2 13 2z"/><path class="crease" d="M15 5c-5 5 3 11-2 22"/></svg>`;
async function api(body){
  const r=await fetch(API_URL,{method:'POST',body:JSON.stringify(body)});
  return r.json();
}
/* Confeti de granos de café */
const cv=document.getElementById('fx'),cx=cv.getContext('2d');let parts=[],raf=0;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function size(){cv.width=innerWidth*devicePixelRatio;cv.height=innerHeight*devicePixelRatio}size();addEventListener('resize',size);
function burst(rect,color,n,big){
  if(reduce)return;
  const col=getComputedStyle(document.documentElement).getPropertyValue('--'+color).trim();
  const x0=rect.left+rect.width/2,y0=rect.top+rect.height/2;
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=(big?6:3.5)+Math.random()*(big?7:4);
    parts.push({x:x0,y:y0,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(big?6:3),r:Math.random()*6.28,vr:(Math.random()-.5)*.3,c:col,life:big?110:55,sz:big?9:6})}
  if(!raf)raf=requestAnimationFrame(tick);
}
function tick(){
  const d=devicePixelRatio;cx.clearRect(0,0,cv.width,cv.height);
  parts=parts.filter(p=>p.life-->0);
  for(const p of parts){p.vy+=.28;p.vx*=.98;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;
    cx.save();cx.translate(p.x*d,p.y*d);cx.rotate(p.r);cx.globalAlpha=Math.min(1,p.life/25);
    cx.fillStyle=p.c;cx.beginPath();cx.ellipse(0,0,p.sz*.7*d,p.sz*d,0,0,6.29);cx.fill();
    cx.strokeStyle='rgba(0,0,0,.25)';cx.lineWidth=1.4*d;cx.beginPath();cx.moveTo(0,-p.sz*.8*d);cx.quadraticCurveTo(p.sz*.35*d,0,0,p.sz*.8*d);cx.stroke();cx.restore()}
  raf=parts.length?requestAnimationFrame(tick):0;
}
