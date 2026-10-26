/* Código QR en la votación, resultados públicos (solo ganadores) y control para publicarlos */
(function(){
  const css=`
.gwrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
.gcard{background:var(--surface);border-radius:20px;box-shadow:var(--shadow);padding:18px 14px 16px;display:flex;flex-direction:column;align-items:center;gap:10px;border-top:8px solid var(--c);animation:gin .8s cubic-bezier(.3,1.5,.5,1) both;animation-delay:var(--d)}
@keyframes gin{from{opacity:0;transform:translateY(30px) scale(.85)}to{opacity:1;transform:none}}
.gpill{background:var(--c);color:#fff;font-weight:800;font-size:13px;border-radius:99px;padding:5px 12px;text-align:center}
.gcard[style*="yellow"] .gpill{color:#1C1C1C}
.gpeople{display:flex;gap:10px;justify-content:center;width:100%}
.gp{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;max-width:190px}
.gp img{width:100%;aspect-ratio:448/571;object-fit:contain;background:#fff;border-radius:14px;border:5px solid var(--c)}
.gp .wname{font-size:22px}
.gsub{font-size:12.5px;color:var(--ink-soft)}
.winners-head{text-align:center;align-items:center}
.winners-head h1{font-size:clamp(28px,7vw,40px)}
.extras{display:flex;flex-direction:column;gap:10px;width:100%}
.extras .btn{width:100%}
.qrmodal{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55);display:grid;place-items:center;padding:16px}
.qrbox{background:var(--surface);border-radius:20px;padding:20px;max-width:380px;width:100%;display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center;box-shadow:var(--shadow)}
.qrbox img{width:100%;max-width:300px;aspect-ratio:1;background:#fff;border-radius:12px;border:5px solid var(--ink);padding:4px}
.qrbox h2{font-size:24px}
.pubbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;border-radius:12px;padding:10px 12px;font-size:14px;
  background:color-mix(in srgb,var(--red) 12%,transparent);border:1px solid color-mix(in srgb,var(--red) 35%,transparent)}
.pubbar .row{display:flex;gap:6px}
#resetBtn{align-self:flex-start}
.pubbar.on{background:color-mix(in srgb,var(--green) 14%,transparent);border-color:color-mix(in srgb,var(--green) 45%,transparent)}
@media (prefers-reduced-motion: reduce){.gcard{animation:none}}`;
  const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
})();


/* ---- QR generado en la página (dirección pública + código de acceso) ---- */
const QR_DATA='41:fe8ca123bfc17fabce106eaaade86bb74eb002e5dba40a9e9aec1669f4b507faaaaaaafe0153d6b4003af08f5573a6eb9107fd76a2aa3c2a090dc22133b2385fdf50784eedf6fdcfa8afbc0b4c1a14d4506942176a4453166869e59f44bd559f0a8db4b4ac2d8bea39a3a02ee3fb237fdd5e2eb3cbb1828b2d5283a6f61624165cf21c979e5b807876a6162e53ee3480a8c8d3d86cc4ad19bfe63f87b373d122e63722d98fbbd177fa805dfab346ff8e48ef6bd04681e5f18bad2bd40fa5d519d85a96eaf6e9fdf50426eab152fe3e05b53e0';
function qrPropio(){
  const [n,hx]=QR_DATA.split(':');const N=+n;
  const bits=[...hx].map(h=>parseInt(h,16).toString(2).padStart(4,'0')).join('');
  const s=12,m=4,W=(N+2*m)*s,c=document.createElement('canvas');c.width=c.height=W;
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,W);g.fillStyle='#1c1c1c';
  for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(bits[y*N+x]==='1')g.fillRect((x+m)*s,(y+m)*s,s,s);
  const bw=W*0.30,bh=W*0.12,bx=(W-bw)/2,by=(W-bh)/2;
  g.fillStyle='#fff';g.fillRect(bx-s*0.6,by-s*0.6,bw+s*1.2,bh+s*1.2);
  ['#D2423B','#FFD23F','#76B043'].forEach((col,i)=>{g.save();g.translate(bx+bw*(i+0.5)/3,by+bh/2);g.rotate(0.45);
    g.fillStyle=col;g.beginPath();g.ellipse(0,0,bw/8,bh/2.1,0,0,6.29);g.fill();
    g.strokeStyle='#fff';g.lineWidth=s*0.45;g.beginPath();g.moveTo(0,-bh/2.3);g.quadraticCurveTo(bw/16,0,0,bh/2.3);g.stroke();g.restore()});
  return c.toDataURL('image/png');
}

/* ---- Nueva ronda: si el administrador reinició la votación, este teléfono puede volver a votar ---- */
(async function(){
  try{
    const r=await fetch(API_URL+'?pub=1',{cache:'no-store'}).then(r=>r.json());
    if(typeof r.ronda!=='number')return;
    let prev=lsGet('bicafe_ronda');
    if(prev===null&&lsGet('bicafe_voto_2026'))prev='0';
    lsSet('bicafe_ronda',String(r.ronda));
    if(prev!==null&&prev!==String(r.ronda)){
      try{localStorage.removeItem('bicafe_voto_2026')}catch(e){}
      if(typeof state!=='undefined'&&state.voted){state.voted=null;state.step=-1;state.votes={};if(PEOPLE.length)render()}
    }
  }catch(e){}
})();

/* ---- Código QR ---- */
function qrBtnHTML(){return `<button class="btn ghost" id="qrBtn" type="button">Mostrar código QR</button>`}
function abrirQR(){
  const m=document.createElement('div');m.className='qrmodal';
  m.innerHTML=`<div class="qrbox" role="dialog" aria-label="Código QR de la encuesta">
    <h2>Escanea y vota</h2>
    <img src="${QR_IMG}" alt="Código QR de la encuesta">
    <p class="ask" style="margin:0">Muéstrale este código a tus compañeros para que voten desde su teléfono.</p>
    <button class="btn main" type="button" id="qrClose" style="width:100%">Cerrar</button></div>`;
  document.body.appendChild(m);
  const close=()=>m.remove();
  m.onclick=e=>{if(e.target===m)close()};
  m.querySelector('#qrClose').onclick=close;
}
function bindQR(){const b=document.getElementById('qrBtn');if(b)b.onclick=abrirQR}

/* ---- Después de votar ---- */
function extrasHTML(){
  return `<div class="extras">
    <button class="btn main" id="verRes" type="button">Ver resultados de la votación</button>
    ${qrBtnHTML()}
    <div id="resMsg"></div>
    <p class="status">Tu voto ya quedó registrado y no se puede cambiar.</p>
  </div>`;
}
function bindExtras(){
  bindQR();
  const b=document.getElementById('verRes');if(!b)return;
  b.onclick=async()=>{
    const msg=document.getElementById('resMsg');
    b.disabled=true;b.textContent='Consultando…';
    try{
      const r=await fetch(API_URL+'?pub=1').then(r=>r.json());
      if(r.ok&&r.publicado)return mostrarGanadores(r.ganadores);
      msg.innerHTML='<p class="status warn">Los resultados aún no se pueden ver. Se publicarán cuando termine la votación.</p>';
    }catch(e){msg.innerHTML='<p class="status warn">No se pudo consultar. Revisa tu conexión e inténtalo de nuevo.</p>'}
    b.disabled=false;b.textContent='Ver resultados de la votación';
  };
}
function ganadoresHTML(g){
  return QS.map((q,i)=>{
    const w=g&&g[q.key];
    if(!w||!w.ids||!w.ids.length)return `<div class="gcard" style="--c:var(--${q.color});--d:${i*0.9}s"><div class="gpill">${q.title}</div><p class="ask">Sin votos.</p></div>`;
    const ps=w.ids.map(id=>byId[id]).filter(Boolean);
    return `<div class="gcard" style="--c:var(--${q.color});--d:${i*0.9}s">
      <div class="gpill">${q.title}</div>
      <div class="gpeople">${ps.map(p=>`<div class="gp"><div class="crown">${beanSVG(i)}</div><img src="${p.img}" alt=""><div class="wname">${esc(p.n)}</div></div>`).join('')}</div>
      <div class="wvotes">${w.votos} votos · ${w.total?Math.round(w.votos/w.total*100):0}%${ps.length>1?' · empate':''}</div>
      <div class="gsub">${q.pill}</div></div>`;
  }).join('');
}
function mostrarGanadores(g){
  setQ('green');
  const app=document.getElementById('app');
  app.innerHTML=`<section class="screen">
    <div class="card winners-head"><div class="stripe" style="display:flex;height:8px;border-radius:99px;overflow:hidden;width:100%"><span></span><span></span><span></span></div>
      <div class="eyebrow">Reconocimientos BICAFE</div><h1>¡Felicidades a los ganadores!</h1>
      <p class="ask">Gracias a todos por participar y reconocer a sus compañeros.</p></div>
    <div class="gwrap">${ganadoresHTML(g)}</div>
    <div class="nav"><button class="btn ghost" id="volver" type="button">Volver</button></div>
  </section>`;
  scrollTo({top:0});
  document.getElementById('volver').onclick=()=>render();
  if(!reduce)QS.forEach((q,i)=>setTimeout(()=>{const el=app.querySelectorAll('.gcard')[i];if(!el)return;const r=(el.querySelector('img')||el).getBoundingClientRect();burst(r,q.color,50,true)},i*900+500));
}

/* ---- Control del administrador (página de resultados) ---- */
function publishHTML(){
  const p=!!st.publicado;
  const reset=st.confirmReset
    ?`<div class="pubbar"><span><b>Esto borra todos los votos</b> de la hoja y oculta a los ganadores. Todos podrán votar de nuevo.</span>
       <span class="row"><button class="btn sm danger" id="resetYes" type="button">${st.resetting?'Reiniciando…':'Sí, reiniciar'}</button><button class="btn sm ghost" id="resetNo" type="button">Cancelar</button></span></div>`
    :`<button class="btn sm ghost" id="resetBtn" type="button">Reiniciar votación</button>`;
  return `<div class="pubbar ${p?'on':''}"><span>${p?'Los empleados <b>ya pueden ver</b> a los ganadores.':'Los empleados <b>aún no pueden ver</b> los resultados.'}</span>
    <button class="btn sm ${p?'ghost':'main'}" id="pubBtn" type="button">${st.publishing?'Guardando…':(p?'Ocultar ganadores':'Publicar ganadores')}</button></div>
    ${reset}`;
}
function bindPublish(){
  const rb=document.getElementById('resetBtn');if(rb)rb.onclick=()=>{st.confirmReset=true;render()};
  const rn=document.getElementById('resetNo');if(rn)rn.onclick=()=>{st.confirmReset=false;render()};
  const ry=document.getElementById('resetYes');if(ry)ry.onclick=async()=>{
    if(st.resetting)return;st.resetting=true;render();
    try{await api({action:'reiniciar',k:st.key})}catch(e){}
    st.resetting=false;st.confirmReset=false;st.publicado=false;st.revealed={};st.cat=0;load();
  };
  const b=document.getElementById('pubBtn');if(!b)return;
  b.onclick=async()=>{
    if(st.publishing)return;st.publishing=true;render();
    try{const r=await api({action:'publicar',k:st.key,valor:!st.publicado});if(r.ok)st.publicado=!!r.publicado}catch(e){}
    st.publishing=false;render();
  };
}
