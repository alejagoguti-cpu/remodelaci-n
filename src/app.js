const SERVER='Google Drive', ROOT_NAME='Bitácora Remodelación', VISIT=[1,3,6];
const WD=['D','L','M','X','J','V','S'];
const DISC=['Eléctrica','Hidráulica','Sanitaria','Gas','Datos y CCTV','HVAC'];
const KINDS={
  'Eléctrica':['Toma 110 V','Toma 220 V','Interruptor','Salida de iluminación','Circuito / tablero','Salida TV'],
  'Hidráulica':['Punto agua fría','Punto agua caliente','Llave de paso / registro'],
  'Sanitaria':['Desagüe de piso','Desagüe de aparato','Ventilación','Caja / sifón'],
  'Gas':['Punto de gas','Tramo de tubería'],
  'Datos y CCTV':['Punto RJ45','Cámara','Salida coaxial'],
  'HVAC':['Salida A/A','Extracción','Ducto']};
const MEP_ST=[['proyectado','Proyectado',0],['instalado','Instalado',.5],['probado','Probado',.8],['cerrado','Cerrado',1]];
const FIN_ST=[['por comprar','Por comprar',0],['en obra','En obra',.3],['instalado','Instalado',.9],['recibido','Recibido',1]];
const ELEM=['Piso','Zócalo','Muro / revestimiento','Pintura','Cielo raso','Puerta','Ventana','Carpintería / mueble','Aparato sanitario','Grifería','Luminaria','Mesón / enchape','Otro'];
const UNITS=['m²','ml','und'];
const TAGS=[...DISC,'Acabados','General'];
const SEV=['alta','media','baja'];
const STAT={pendiente:'Pendiente',proceso:'En proceso',terminado:'Terminado'};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10);
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const dparts=s=>{const d=new Date(s+'T12:00');return{d:d.getDate(),m:d.toLocaleDateString('es',{month:'short'}).replace('.',''),w:d.toLocaleDateString('es',{weekday:'long'}),y:d.getFullYear()}};
const opts=(a,sel)=>a.map(x=>{const v=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:x;return`<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(l)}</option>`}).join('');

let S=null, mcp=null, F={}, view='joint', tab='registro', jtab='resumen', jgf='', jgt='', sync={s:'off'}, fatal=null, draft={files:[]};

/* ---------- Drive ---------- */
async function drive(tool,input){
  const r=await mcp.callTool(SERVER,tool,input);
  let p=r.payload;
  if(typeof p==='string'){try{p=JSON.parse(p)}catch(e){}}
  return p;
}
const files=p=>Array.isArray(p)?p:(p&&p.files)||[];
async function findOrCreate(title,parent){
  const q=`title = '${title}' and mimeType = 'application/vnd.google-apps.folder' and owner = 'me'`+(parent?` and parentId = '${parent}'`:'');
  const f=files(await drive('search_files',{query:q,excludeContentSnippets:true}))[0];
  if(f)return f.id;
  const c=await drive('create_file',{title,mimeType:'application/vnd.google-apps.folder',...(parent?{parentId:parent}:{})});
  return c.id;
}
async function ensureFolders(){
  if(!F.root)F.root=await findOrCreate(ROOT_NAME);
  if(!F.state)F.state=await findOrCreate('_estado',F.root);
}
const b64utf8=b=>new TextDecoder().decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0)));
function normalize(s){
  s.v=2;s.project=Object.assign({name:'Remodelación segundo piso',address:'',owner:'',lead:'',start:today()},s.project);
  s.rooms=(s.rooms||[]).map(r=>Object.assign(mkRoom(r.name),r,{mep:r.mep||[],fin:r.fin||[],punch:(r.punch||[]).map(x=>x.st?x:{...x,st:x.done?'aprobada':'pendiente'}),plans:r.plans||[],visits:r.visits||[]}));
  ['cx','ncr','insp','mat','plan'].forEach(k=>s[k]=s[k]||[]);
  EXT.migrate(s);
  return s;
}
async function loadState(){
  await ensureFolders();
  const list=files(await drive('search_files',{query:`parentId = '${F.state}' and title contains 'estado-'`,excludeContentSnippets:true,pageSize:50}))
    .filter(f=>/^estado-\d+\.json$/.test(f.title)).sort((a,b)=>b.title.localeCompare(a.title));
  if(!list.length)return normalize({});
  const d=await drive('download_file_content',{fileId:list[0].id});
  return normalize(JSON.parse(b64utf8(d.content)));
}
let saving=false,dirty=false,timer=null;
function touch(){dirty=true;setSync('saving');clearTimeout(timer);timer=setTimeout(persist,1200)}
async function persist(){
  if(saving)return;saving=true;dirty=false;
  try{
    await ensureFolders();
    await drive('create_file',{title:`estado-${String(Date.now()).padStart(13,'0')}.json`,parentId:F.state,contentMimeType:'application/json',disableConversionToGoogleType:true,textContent:JSON.stringify(S)});
    setSync(dirty?'saving':'ok',new Date());
    prune();
  }catch(e){setSync('err',e)}
  finally{saving=false;if(dirty)persist()}
}
async function prune(){
  try{
    const list=files(await drive('search_files',{query:`parentId = '${F.state}' and title contains 'estado-'`,excludeContentSnippets:true,pageSize:50}))
      .filter(f=>/^estado-\d+\.json$/.test(f.title)).sort((a,b)=>b.title.localeCompare(a.title));
    for(const f of list.slice(12))await drive('trash_file',{fileId:f.id});
  }catch(e){}
}
function setSync(s,x){
  sync={s,x};const el=$('#sync');if(!el)return;
  el.className='sync '+(s==='ok'?'':s);
  el.querySelector('span').textContent=s==='saving'?(BACKEND==='local'?'Guardando…':'Guardando en Drive…'):s==='ok'?(BACKEND==='local'?'Guardado en este navegador ':'Guardado en Drive ')+(x?x.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'}):''):s==='err'?'Sin guardar · reintentar':'Sin conexión';
  el.onclick=s==='err'?()=>persist():null;
}
function errText(e){
  const c=e&&e.code;
  if(c==='needs_reauth')return['Tu conexión con Google Drive venció.','Reconéctala en Configuración → Conectores de claude.ai y recarga esta página.'];
  if(c==='server_not_connected'||c==='selection_required')return['Google Drive no está conectado.','Esta app guarda en Drive a través de claude.ai. Ábrela desde claude.ai o agrega el conector en Configuración → Conectores.'];
  if(c==='not_in_manifest')return['No permitiste el acceso a Google Drive.','Recarga la página y acepta el permiso para guardar tu bitácora.'];
  if(c==='blocked_by_policy'||c==='approval_required')return['Tu organización bloquea esta acción en Drive.','Pide al administrador que la habilite.'];
  return['No se pudo hablar con Google Drive.',(e&&e.message)||'Intenta de nuevo en unos segundos.'];
}

/* archivos */
const toB64=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(blob)});
function shrink(file,max=1400,q=.8){
  return new Promise(res=>{
    const u=URL.createObjectURL(file),i=new Image();
    i.onload=()=>{const k=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);
      c.getContext('2d').drawImage(i,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>res(b),'image/jpeg',q)};
    i.onerror=()=>{URL.revokeObjectURL(u);res(null)};i.src=u;
  });
}
async function roomFolder(r){
  if(r.folderId)return r.folderId;
  await ensureFolders();
  r.folderId=await findOrCreate(`${pad(S.rooms.indexOf(r)+1)} ${r.name.replace(/'/g,'')}`,F.root);
  return r.folderId;
}
async function upload(r,title,blob,mime){
  const parentId=await roomFolder(r);
  if(blob.size>700000)throw{code:'bad_request',message:'El archivo supera 700 KB. Reduce su tamaño o súbelo como imagen.'};
  const c=await drive('create_file',{title,parentId,contentMimeType:mime,disableConversionToGoogleType:true,base64Content:await toB64(blob)});
  return c.id;
}
async function uploadPhotos(r,fl,prefix){
  const out=[];
  for(const f of fl){const b=await shrink(f);if(!b)continue;const name=`${prefix} · ${uid().slice(0,5)}.jpg`;out.push({id:await upload(r,name,b,'image/jpeg'),name})}
  return out;
}
const cache=new Map();let active=0;const queue=[];
function pump(){while(active<3&&queue.length){const j=queue.shift();active++;j().finally(()=>{active--;pump()})}}
function fileURL(id){
  if(!cache.has(id))cache.set(id,new Promise((res,rej)=>{
    queue.push(()=>drive('download_file_content',{fileId:id}).then(d=>res(`data:${d.mimeType||'image/jpeg'};base64,${d.content}`),e=>{cache.delete(id);rej(e)}));pump();
  }));
  return cache.get(id);
}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;io.unobserve(e.target);const el=e.target;
  fileURL(el.dataset.fid).then(u=>{el.classList.add('ok');el.innerHTML=`<img src="${u}" alt="">`}).catch(()=>{el.innerHTML='<div style="padding:10px;font-size:11px;color:var(--mute)">No se pudo cargar</div>'})}),{rootMargin:'200px'});
function lazy(){document.querySelectorAll('.ph[data-fid]:not(.ok)').forEach(el=>io.observe(el))}
const phHtml=a=>a.map(f=>`<div class="ph" data-fid="${f.id}" data-act="zoom"></div>`).join('');

/* ---------- cálculos ---------- */
const wMep=s=>(MEP_ST.find(x=>x[0]===s)||[0,0,0])[2], wFin=s=>(FIN_ST.find(x=>x[0]===s)||[0,0,0])[2];
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const mepProg=r=>{const a=avg(r.mep.map(i=>wMep(i.st)));return a===null?null:Math.round(a*100)};
const finProg=r=>{const a=avg(r.fin.map(i=>wFin(i.st)));return a===null?null:Math.round(a*100)};
function prog(r){
  if(r.status==='terminado')return 100;
  const a=[...r.mep.map(i=>wMep(i.st)),...r.fin.map(i=>wFin(i.st))];
  if(a.length)return Math.round(avg(a)*100);
  return r.status==='proceso'?25:0;
}
const total=()=>S.rooms.length?Math.round(avg(S.rooms.map(prog))):0;
const nPhotos=r=>r.visits.reduce((a,v)=>a+v.photos.length,0)+r.mep.reduce((a,i)=>a+(i.photos||[]).length,0);
const room=()=>S.rooms.find(r=>r.id===view);
const mkRoom=name=>({id:uid(),name,level:'Nivel 2',area:'',scale:'1:50',ref:'',status:'pendiente',scope:'',notes:'',folderId:null,plans:[],visits:[],mep:[],fin:[],punch:[]});
const pct=(a,b)=>b?Math.round(a/b*100):0;
const dayDiff=s=>Math.round((new Date(today()+'T12:00')-new Date(s+'T12:00'))/864e5);
const lastVisit=r=>r.visits.length?r.visits.map(v=>v.date).sort().pop():null;
const allMep=()=>S.rooms.flatMap(r=>r.mep.map(i=>({...i,room:r})));
const allFin=()=>S.rooms.flatMap(r=>r.fin.map(i=>({...i,room:r})));
const allPunch=()=>S.rooms.flatMap(r=>r.punch.map(i=>({...i,room:r})));
const qtyOf=i=>Number(i.qty)||0;

/* ---------- vistas ---------- */
function render(){
  if(fatal){const[t,m]=errText(fatal);$('#app').innerHTML=`<div class="loading" style="grid-column:1/-1"><div><h3 style="font:800 22px var(--display);text-transform:uppercase">${esc(t)}</h3><p>${esc(m)}</p><button class="btn" onclick="location.reload()">Recargar</button></div></div>`;return}
  if(!S)return;
  if(view!=='joint'&&!room())view='joint';
  $('#app').innerHTML=shell(view==='joint'?jointView():roomView(room()));
  setSync(sync.s,sync.x);lazy();
}

/* ---------- proyecto conjunto + dashboards ---------- */
const JT=[['resumen','Dashboard'],['mep','Redes MEP'],['acabados','Acabados'],...EXT.tabs,['visitas','Visitas'],['galeria','Galería'],['proyecto','Proyecto']];
function jointView(){
  const lab=(JT.find(x=>x[0]===jtab)||[0,'Dashboard'])[1],p=S.project;
  const body=({resumen:dashHome,mep:dashMep,acabados:dashAcabados,visitas:dashVisitas,galeria:dashGaleria,proyecto:projectPanel,...EXT.views})[jtab]();
  return `<div class="pagehead"><div><h1>${jtab==='resumen'?'Dashboard':lab}</h1><p>${esc(p.name)}${p.address?' · '+esc(p.address):''}</p></div>
   <div class="actions"><button class="btn alt" data-act="jtab" data-v="galeria">Galería</button><button class="btn" data-act="jtab" data-v="proyecto">Generar informe</button></div></div>${body}`;
}
const emptyRooms=()=>`<div class="empty"><h3 style="font:800 18px var(--display);text-transform:uppercase">Primero agrega espacios</h3>Los dashboards se llenan con los puntos MEP y los acabados de cada habitación.
  <div class="chips">${['Sala','Habitación principal','Habitación 2','Habitación 3','Baño','Cocina','Estudio','Pasillo','Terraza'].map(n=>`<button data-act="quick" data-n="${n}">${n}</button>`).join('')}</div></div>`;
const stacked=(arr,cols)=>{const n=arr.reduce((a,b)=>a+b,0)||1;return `<div class="stk">${arr.map((v,i)=>v?`<i style="width:${v/n*100}%;background:${cols[i]}" title="${v}"></i>`:'').join('')}</div>`};
const MEPCOL=['var(--rule)','var(--warn)','var(--blue)','var(--ok)'];

function jointResumen(){
  if(!S.rooms.length)return emptyRooms();
  const open=allPunch().filter(openP).sort((a,b)=>SEV.indexOf(a.sev)-SEV.indexOf(b.sev)).slice(0,8);
  const vs=S.rooms.flatMap(r=>r.visits.map(v=>({...v,room:r}))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  return `<div class="panel"><h3>Índice de láminas</h3><div class="tw"><table><tr><th>Lám.</th><th>Espacio</th><th>Estado</th><th>MEP</th><th>Acabados</th><th>Avance</th><th>Fotos</th></tr>
   ${S.rooms.map((r,i)=>`<tr class="go" data-act="go" data-id="${r.id}"><td style="font-family:var(--mono)">L-${pad(i+1)}</td><td><b>${esc(r.name)}</b></td><td><span class="pill ${r.status}">${STAT[r.status]}</span></td><td>${mepProg(r)===null?'—':mepProg(r)+'%'}</td><td>${finProg(r)===null?'—':finProg(r)+'%'}</td><td style="min-width:110px"><div class="row" style="flex-wrap:nowrap;align-items:center"><span class="bar"><i style="width:${prog(r)}%"></i></span><span style="font:12px var(--mono)">${prog(r)}%</span></div></td><td>${nPhotos(r)}</td></tr>`).join('')}</table></div></div>
  <div class="dgrid"><div class="panel"><h3>Observaciones abiertas</h3>${open.length?open.map(x=>`<div class="hb" data-act="go" data-id="${x.room.id}" data-t="observ"><span>${esc(x.text)}</span><span class="tag sev-${x.sev}">${x.sev}</span><b style="font:11px var(--mono);color:var(--mute)">${esc(x.room.name)}</b></div>`).join(''):'<div class="empty">Sin observaciones abiertas.</div>'}</div>
  <div class="panel"><h3>Actividad reciente</h3>${vs.length?vs.map(v=>{const d=dparts(v.date);return`<div class="hb" data-act="go" data-id="${v.room.id}"><span><b>${esc(v.room.name)}</b> · ${esc(v.note)||'Registro fotográfico'}</span><span class="tag">${esc(v.tag||'General')}</span><b style="font:11px var(--mono);color:var(--mute)">${d.d} ${d.m}</b></div>`}).join(''):'<div class="empty">Aún no hay visitas.</div>'}</div></div>`;
}

function dashMep(){
  if(!S.rooms.length)return emptyRooms();
  const M=allMep();
  if(!M.length)return `<div class="empty"><h3 style="font:800 18px var(--display);text-transform:uppercase">Aún no hay puntos MEP</h3>Entra a una lámina, pestaña Redes MEP, y registra tomas, puntos de agua, desagües, gas, datos y A/A con su foto antes de cerrar el muro.</div>`;
  const cnt=s=>M.filter(i=>i.st===s).reduce((a,i)=>a+Math.max(1,qtyOf(i)),0), tot=M.reduce((a,i)=>a+Math.max(1,qtyOf(i)),0);
  const noTest=M.filter(i=>i.st==='instalado'), noPhoto=M.filter(i=>i.st==='cerrado'&&!(i.photos||[]).length);
  const kinds={};M.forEach(i=>{const k=i.disc+' · '+i.kind;kinds[k]=(kinds[k]||0)+Math.max(1,qtyOf(i))});
  return `<div class="stats"><div><b>${tot}</b><span>Puntos totales</span></div><div><b>${pct(cnt('instalado')+cnt('probado')+cnt('cerrado'),tot)}%</b><span>Instalados</span></div><div><b>${pct(cnt('probado')+cnt('cerrado'),tot)}%</b><span>Probados</span></div><div><b>${pct(cnt('cerrado'),tot)}%</b><span>Muro cerrado</span></div></div>
  <div class="dgrid"><div class="panel"><h3>Avance por disciplina</h3>
   ${DISC.map(d=>{const a=M.filter(i=>i.disc===d);if(!a.length)return'';const c=MEP_ST.map(([k])=>a.filter(i=>i.st===k).reduce((s,i)=>s+Math.max(1,qtyOf(i)),0));return`<div class="hb2"><span>${d}</span>${stacked(c,MEPCOL)}<b>${c.reduce((x,y)=>x+y,0)}</b></div>`}).join('')}
   <div class="lg row" style="flex-direction:row;gap:14px;font-size:12px">${MEP_ST.map((s,i)=>`<span><i style="background:${MEPCOL[i]}"></i>${s[1]}</span>`).join('')}</div></div>
  <div class="panel"><h3>Matriz espacio × disciplina</h3><div class="tw"><table class="mx"><tr><th></th>${DISC.map(d=>`<th title="${d}">${d.slice(0,4)}</th>`).join('')}</tr>
   ${S.rooms.map(r=>`<tr class="go" data-act="go" data-id="${r.id}" data-t="mep"><td><b>${esc(r.name)}</b></td>${DISC.map(d=>{const a=r.mep.filter(i=>i.disc===d);if(!a.length)return'<td class="z">·</td>';const p=Math.round(avg(a.map(i=>wMep(i.st)))*100);return`<td style="background:color-mix(in srgb,var(--ok) ${p}%,var(--sheet))">${a.length}</td>`}).join('')}</tr>`).join('')}</table></div>
   <small style="color:var(--mute)">El número es la cantidad de ítems; el color, el avance.</small></div></div>
  <div class="dgrid"><div class="panel"><h3>Alertas antes de cerrar muros</h3>
   ${noTest.length?`<p style="margin:0;color:var(--warn);font-weight:600">${noTest.length} ítems instalados sin prueba</p>${noTest.slice(0,8).map(i=>`<div class="hb" data-act="go" data-id="${i.room.id}" data-t="mep"><span>${esc(i.kind)} · ${esc(i.loc)||'sin ubicación'}</span><span class="tag">${esc(i.disc)}</span><b style="font:11px var(--mono);color:var(--mute)">${esc(i.room.name)}</b></div>`).join('')}`:''}
   ${noPhoto.length?`<p style="margin:8px 0 0;color:var(--bad);font-weight:600">${noPhoto.length} ítems con muro cerrado y sin foto</p>${noPhoto.slice(0,8).map(i=>`<div class="hb" data-act="go" data-id="${i.room.id}" data-t="mep"><span>${esc(i.kind)} · ${esc(i.loc)||''}</span><span class="tag">${esc(i.disc)}</span><b style="font:11px var(--mono);color:var(--mute)">${esc(i.room.name)}</b></div>`).join('')}`:''}
   ${!noTest.length&&!noPhoto.length?'<div class="empty">Todo probado y documentado.</div>':''}</div>
  <div class="panel"><h3>Cantidades por tipo</h3>${Object.entries(kinds).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="hb"><span>${esc(k)}</span><span></span><b>${v}</b></div>`).join('')}</div></div>`;
}

function dashAcabados(){
  if(!S.rooms.length)return emptyRooms();
  const A=allFin();
  if(!A.length)return `<div class="empty"><h3 style="font:800 18px var(--display);text-transform:uppercase">Aún no hay cuadro de acabados</h3>Entra a una lámina, pestaña Acabados, y registra piso, muros, pintura, carpintería, aparatos y luminarias con su material y cantidad.</div>`;
  const cnt=FIN_ST.map(([k])=>A.filter(i=>i.st===k).length);
  const by=ELEM.map(e=>({e,a:A.filter(i=>i.el===e)})).filter(x=>x.a.length);
  const buy=A.filter(i=>i.st==='por comprar');
  const qty={};A.forEach(i=>{const k=i.el+' ('+i.unit+')';qty[k]=(qty[k]||0)+qtyOf(i)});
  return `<div class="stats">${FIN_ST.map((s,i)=>`<div><b>${cnt[i]}</b><span>${s[1]}</span></div>`).join('')}</div>
  <div class="dgrid"><div class="panel"><h3>Avance por elemento</h3>${by.map(({e,a})=>`<div class="hb2"><span>${e}</span>${stacked(FIN_ST.map(([k])=>a.filter(i=>i.st===k).length),['var(--rule)','var(--warn)','var(--blue)','var(--ok)'])}<b>${a.length}</b></div>`).join('')}
    <div class="lg row" style="flex-direction:row;gap:14px;font-size:12px">${FIN_ST.map((s,i)=>`<span><i style="background:${MEPCOL[i]}"></i>${s[1]}</span>`).join('')}</div></div>
   <div class="panel"><h3>Cantidades totales</h3>${Object.entries(qty).map(([k,v])=>`<div class="hb"><span>${esc(k)}</span><span></span><b>${Math.round(v*100)/100}</b></div>`).join('')}</div></div>
  <div class="panel"><h3>Lista de compras · ${buy.length} por comprar</h3>${buy.length?`<div class="tw"><table><tr><th>Espacio</th><th>Elemento</th><th>Material</th><th>Ref. / marca</th><th>Cantidad</th></tr>${buy.map(i=>`<tr class="go" data-act="go" data-id="${i.room.id}" data-t="acabados"><td>${esc(i.room.name)}</td><td>${esc(i.el)}</td><td>${esc(i.mat)}</td><td>${esc(i.ref)}</td><td>${esc(i.qty)} ${esc(i.unit)}</td></tr>`).join('')}</table></div>`:'<div class="empty">Todo comprado.</div>'}</div>`;
}

function dashVisitas(){
  if(!S.rooms.length)return emptyRooms();
  const set={};S.rooms.forEach(r=>r.visits.forEach(v=>{(set[v.date]=set[v.date]||new Set()).add(r.id)}));
  const now=new Date(today()+'T12:00'),mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7)-49);
  let due=0,hit=0;const weeks=[];
  for(let w=0;w<8;w++){const col=[];for(const off of[0,2,5]){const d=new Date(mon);d.setDate(mon.getDate()+w*7+off);
    const s=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,k=set[s]?set[s].size:0,past=d<now&&s!==today(),isT=s===today();
    if(past||isT&&k){due++;if(k)hit++}
    col.push(`<div class="cell ${k?'hit':past?'miss':isT?'now':''}" title="${s}: ${k} espacios">${k||''}</div>`)}
    const wd=new Date(mon);wd.setDate(mon.getDate()+w*7);weeks.push(`<div class="wk"><small>${wd.getDate()}/${wd.getMonth()+1}</small>${col.join('')}</div>`)}
  const rows=S.rooms.map(r=>({r,l:lastVisit(r)})).sort((a,b)=>(a.l||'').localeCompare(b.l||''));
  return `<div class="dgrid"><div class="panel"><h3>Cumplimiento de visitas · últimas 8 semanas</h3>
   <div class="row" style="align-items:center;gap:20px"><div class="donut" style="background:conic-gradient(var(--ok) 0 ${pct(hit,due)}%,var(--rule) ${pct(hit,due)}% 100%)"><b>${pct(hit,due)}%</b></div><div class="lg"><div>${hit} de ${due} días de obra con registro</div><div style="color:var(--mute)">Lunes, miércoles y sábado</div></div></div>
   <div class="cal"><div class="wk lab"><small></small><div>Lun</div><div>Mié</div><div>Sáb</div></div>${weeks.join('')}</div></div>
   <div class="panel"><h3>Última visita por espacio</h3>${rows.map(({r,l})=>{const d=l?dayDiff(l):null;return`<div class="hb" data-act="go" data-id="${r.id}"><span>${esc(r.name)}</span><span style="font:12px var(--mono);color:${d===null||d>4?'var(--signal)':'var(--mute)'}">${d===null?'sin registros':d===0?'hoy':'hace '+d+' d'}</span><b></b></div>`}).join('')}</div></div>`;
}

function dashGaleria(){
  const ph=[
    ...S.rooms.flatMap(r=>r.visits.flatMap(v=>v.photos.map(f=>({f,date:v.date,tag:v.tag||'General',r})))),
    ...S.rooms.flatMap(r=>r.mep.flatMap(i=>(i.photos||[]).map(f=>({f,date:i.date||'',tag:i.disc,r}))))
  ].filter(x=>(!jgf||x.r.id===jgf)&&(!jgt||x.tag===jgt)).sort((a,b)=>b.date.localeCompare(a.date));
  const on=c=>c?'style="border-color:var(--signal);color:var(--signal)"':'';
  return `<div class="panel"><h3>Registro fotográfico · ${ph.length} fotos</h3>
   <div class="chips" style="margin:0;justify-content:flex-start"><button data-act="gf" data-id="" ${on(!jgf)}>Todos los espacios</button>${S.rooms.map(r=>`<button data-act="gf" data-id="${r.id}" ${on(jgf===r.id)}>${esc(r.name)}</button>`).join('')}</div>
   <div class="chips" style="margin:0;justify-content:flex-start"><button data-act="gt" data-id="" ${on(!jgt)}>Todas las disciplinas</button>${TAGS.map(t=>`<button data-act="gt" data-id="${t}" ${on(jgt===t)}>${t}</button>`).join('')}</div>
   ${ph.length?`<div class="grid">${ph.slice(0,60).map(x=>`<div><div class="ph" data-fid="${x.f.id}" data-act="zoom"></div><div style="font:11px var(--mono);color:var(--mute);margin-top:3px">${x.date} · ${esc(x.r.name)} · ${esc(x.tag)}</div></div>`).join('')}</div>`:'<div class="empty">No hay fotografías con ese filtro.</div>'}</div>`;
}

function projectPanel(){
  const p=S.project;
  return `<div class="panel"><h3>Datos del proyecto</h3><div class="cols f">
   ${[['name','Nombre del proyecto'],['address','Dirección / ubicación'],['owner','Propietario'],['lead','Ingeniero / arquitecto responsable']].map(([k,l])=>`<div><label>${l}</label><input data-pf="${k}" value="${esc(p[k])}"></div>`).join('')}
  </div>
  <div class="row"><button class="btn sig" data-act="report" ${S.rooms.length?'':'disabled'} id="repbtn">Generar informe final en Drive</button>
  <span style="color:var(--mute);font-size:12px">Crea un Google Doc con portada, índice y, por lámina, carátula, redes MEP, cuadro de acabados y registro fotográfico.</span></div></div>`;
}

/* ---------- lámina ---------- */
function roomView(r){
  const i=S.rooms.indexOf(r),p=S.project,mp=mepProg(r),fp=finProg(r);
  const T=[['registro','Registro de obra',r.visits.length],['mep','Redes MEP',r.mep.length],['acabados','Acabados',r.fin.length],['planos','Planos',r.plans.length],['observ','Observaciones',r.punch.filter(openP).length||''],['notas','Notas','']];
  return `
  <div class="tb">
   <div class="name"><label>Espacio</label><input data-rf="name" value="${esc(r.name)}"></div>
   <div class="sheetno"><label>Lámina</label><b>L-${pad(i+1)}</b><span style="font:11px var(--mono);color:var(--mute)">de ${pad(S.rooms.length)}</span></div>
   <div class="c6"><label>Proyecto</label><div style="font-weight:600">${esc(p.name)}</div></div>
   <div class="c6"><label>Ubicación</label><div style="font-weight:600">${esc(p.address)||'—'}</div></div>
   <div class="c3"><label>Nivel</label><input data-rf="level" value="${esc(r.level)}"></div>
   <div class="c3"><label>Área (m²)</label><input data-rf="area" inputmode="decimal" value="${esc(r.area)}" placeholder="0.0"></div>
   <div class="c3"><label>Escala</label><input data-rf="scale" value="${esc(r.scale)}"></div>
   <div class="c3"><label>Ref. plano</label><input data-rf="ref" value="${esc(r.ref)}" placeholder="A-02"></div>
   <div class="c6"><label>Responsable</label><div style="font-weight:600">${esc(p.lead)||'—'}</div></div>
   <div class="c3"><label>Redes MEP</label><div style="font-weight:700">${mp===null?'—':mp+'%'}</div></div>
   <div class="c3"><label>Acabados</label><div style="font-weight:700">${fp===null?'—':fp+'%'}</div></div>
   <div class="c6"><label>Estado</label><div class="seg">${Object.entries(STAT).map(([k,v])=>`<button class="${r.status===k?'on '+k[0]:''}" data-act="status" data-v="${k}">${v}</button>`).join('')}</div></div>
   <div class="c6" style="display:flex;align-items:center;gap:12px"><div class="ring" style="--p:${prog(r)}" data-l="${prog(r)}"></div><span style="color:var(--mute);font-size:12px">Avance calculado con redes MEP y acabados</span></div>
  </div>
  <div class="tabs">${T.map(([k,l,n])=>`<button class="${tab===k?'on':''}" data-act="tab" data-v="${k}">${l}${n!==''&&n!==0?`<small>${n}</small>`:''}</button>`).join('')}</div>
  ${({registro:registroTab,mep:mepTab,acabados:acabadosTab,planos:planosTab,observ:observTab,notas:notasTab})[tab](r)}
  <div><button class="btn alt sm" data-act="delroom">Eliminar esta habitación</button></div>`;
}

function registroTab(r){
  const vs=[...r.visits].sort((a,b)=>b.date.localeCompare(a.date));
  return `<div class="panel"><h3>Nueva visita</h3>
   <div class="row f"><div style="width:160px"><label>Fecha</label><input type="date" id="vd" value="${draft.date||today()}"></div>
   <div style="width:170px"><label>Disciplina</label><select id="vt">${opts(TAGS,draft.tag||'General')}</select></div>
   <div style="width:140px"><label>Clima</label><select id="vw">${opts(['—','Soleado','Nublado','Lluvia'],draft.w||'—')}</select></div><div style="width:100px"><label>Personal</label><input id="vp" type="number" min="0" placeholder="n.º" value="${esc(draft.p||'')}"></div>
   <div style="flex:1;min-width:220px"><label>Observaciones</label><input id="vn" placeholder="Qué se encontró, qué avanzó, qué falta" value="${esc(draft.note||'')}"></div></div>
   <div class="row f">${field('Retrasos o impedimentos (opcional)',`<input id="vx" placeholder="Ej. Llegó tarde el material eléctrico">`)}</div>
   <label class="drop" id="drop"><input type="file" id="vf" accept="image/*" multiple>📷 Toma fotos o arrástralas aquí<br><small>Se comprimen y se guardan en la carpeta de este espacio en Drive</small></label>
   ${draft.files.length?`<div class="thumbs">${draft.files.map(f=>`<img class="tn" src="${f.url}" alt="">`).join('')}</div>`:''}
   <div><button class="btn sig" data-act="savevisit" id="svbtn">Guardar visita en Drive</button></div></div>
  <div class="panel"><h3>Historial</h3>${vs.length?vs.map(v=>{const d=dparts(v.date);return`<div class="visit"><div class="d"><b>${d.d}</b>${d.m} ${d.y}<br>${esc(d.w)}<br><button class="ghost" data-act="delvisit" data-id="${v.id}">Eliminar</button></div><div><span class="tag">${esc(v.tag||'General')}</span>${v.w&&v.w!=='—'?` <span class="tag">${esc(v.w)}</span>`:''}${v.p?` <span class="tag">${esc(v.p)} personas</span>`:''}${v.delay?` <span class="tag sev-media">Retraso: ${esc(v.delay)}</span>`:''}<p>${esc(v.note)||'<span style="color:var(--mute)">Solo registro fotográfico</span>'}</p>${v.photos.length?`<div class="grid">${phHtml(v.photos)}</div>`:''}</div></div>`}).join(''):'<div class="empty">Aún no hay visitas. Registra la de hoy arriba.</div>'}</div>`;
}

function mepTab(r){
  const d0=draft.md||DISC[0];
  const stSel=i=>`<select class="mini" data-mst="${i.id}">${opts(MEP_ST.map(s=>[s[0],s[1]]),i.st)}</select>`;
  const groups=DISC.map(d=>({d,a:r.mep.filter(i=>i.disc===d)})).filter(g=>g.a.length);
  return `<div class="panel"><h3>Nuevo punto de red</h3>
   <div class="row f"><div style="width:150px"><label>Disciplina</label><select id="md">${opts(DISC,d0)}</select></div>
   <div style="width:200px"><label>Tipo de punto</label><select id="mk">${opts(KINDS[d0])}</select></div>
   <div style="width:80px"><label>Cant.</label><input id="mq" type="number" min="1" value="1"></div>
   <div style="flex:1;min-width:180px"><label>Ubicación</label><input id="ml" placeholder="Muro norte, h = 0.30 m"></div>
   <div style="width:130px"><label>Circuito / tag</label><input id="mt" placeholder="C-04"></div>
   <button class="btn" data-act="addmep">Añadir</button></div>
   <small style="color:var(--mute)">Toma la foto de cada red antes de cerrar el muro o fundir el piso. Quedará guardada con el punto.</small></div>
  ${groups.length?groups.map(g=>`<div class="panel"><h3>${g.d} · ${g.a.length}</h3>${g.a.map(i=>`<div class="item">
    <div class="it-h"><b>${esc(i.kind)}${qtyOf(i)>1?' × '+qtyOf(i):''}</b><span class="tag">${esc(i.tag)||'sin tag'}</span>${stSel(i)}<button class="ghost" data-act="delmep" data-id="${i.id}">✕</button></div>
    <div class="it-s">${esc(i.loc)||'Sin ubicación'}${i.st==='cerrado'&&!(i.photos||[]).length?' · <span style="color:var(--bad);font-weight:600">Cerrado sin foto</span>':''}${i.st==='instalado'?' · <span style="color:var(--warn)">Falta probar</span>':''}</div>
    <div class="grid sm">${phHtml(i.photos||[])}<label class="addph">＋ Foto<input type="file" accept="image/*" multiple data-mph="${i.id}"></label></div></div>`).join('')}</div>`).join(''):'<div class="empty">Aún no hay puntos. Registra tomas, puntos de agua, desagües, gas, datos y A/A.</div>'}`;
}

function acabadosTab(r){
  return `<div class="panel"><h3>Nuevo ítem de acabado</h3>
   <div class="row f"><div style="width:190px"><label>Elemento</label><select id="fe">${opts(ELEM)}</select></div>
   <div style="flex:1;min-width:170px"><label>Material</label><input id="fm" placeholder="Porcelanato 60×60 mate"></div>
   <div style="width:160px"><label>Ref. / marca / color</label><input id="fr" placeholder="Gris humo"></div>
   <div style="width:90px"><label>Cantidad</label><input id="fq" type="number" step="0.01" min="0"></div>
   <div style="width:80px"><label>Unidad</label><select id="fu">${opts(UNITS)}</select></div>
   <button class="btn" data-act="addfin">Añadir</button></div></div>
  <div class="panel"><h3>Cuadro de acabados · ${r.fin.length}</h3>${r.fin.length?`<div class="tw"><table><tr><th>Elemento</th><th>Material</th><th>Ref.</th><th>Cant.</th><th>Estado</th><th></th></tr>
   ${r.fin.map(i=>`<tr><td><b>${esc(i.el)}</b></td><td>${esc(i.mat)}</td><td>${esc(i.ref)}</td><td style="white-space:nowrap">${esc(i.qty)} ${esc(i.unit)}</td><td><select class="mini" data-fst="${i.id}">${opts(FIN_ST.map(s=>[s[0],s[1]]),i.st)}</select></td><td><button class="ghost" data-act="delfin" data-id="${i.id}">✕</button></td></tr>`).join('')}</table></div>`:'<div class="empty">Define piso, muros, pintura, cielo, carpintería, aparatos y luminarias del espacio.</div>'}</div>`;
}

function planosTab(r){
  return `<div class="panel"><h3>Planos y documentos</h3>
   <label class="drop" id="pdrop"><input type="file" id="pf" accept="image/*,.pdf" multiple>📐 Sube planos MEP, arquitectónicos o de detalle (imagen o PDF hasta 700 KB)</label>
   ${r.plans.length?`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${r.plans.map(p=>p.mime.startsWith('image/')?`<div><div class="ph" data-fid="${p.id}" data-act="zoom"></div><div class="row" style="justify-content:space-between;font-size:12px;margin-top:4px"><span>${esc(p.name)}</span><button class="ghost" data-act="delplan" data-id="${p.id}">Quitar</button></div></div>`:`<div class="panel" style="padding:14px"><b>${esc(p.name)}</b><a href="https://drive.google.com/file/d/${p.id}/view" target="_blank" rel="noopener" style="color:var(--blue);font-weight:600">Abrir PDF en Drive ↗</a><button class="ghost" data-act="delplan" data-id="${p.id}">Quitar</button></div>`).join('')}</div>`:'<div class="empty">Sin planos todavía.</div>'}</div>`;
}

function observTab(r){
  return `<div class="panel"><h3>Nueva observación</h3>
   <div class="row f"><div style="flex:1;min-width:220px"><label>Descripción</label><input id="ot" placeholder="Ej. Desnivel en piso junto a la ducha"></div>
   <div style="width:150px"><label>Disciplina</label><select id="og">${opts(TAGS,'Acabados')}</select></div>
   <div style="width:110px"><label>Prioridad</label><select id="os">${opts(SEV,'media')}</select></div>
   <label class="btn alt" style="cursor:pointer">📷 Foto<input type="file" id="oph" accept="image/*" hidden></label>
   <button class="btn" data-act="addpunch" id="opbtn">Añadir</button></div></div>
  <div class="panel"><h3>Observaciones · ${r.punch.filter(openP).length} abiertas</h3>${r.punch.length?r.punch.map(x=>EXT.punchRow(x,r.id)).join(''):'<div class="empty">Sin observaciones. Anota lo que haya que corregir, con su foto.</div>'}</div>`;
}
function notasTab(r){
  return `<div class="panel f"><h3>Alcance y notas técnicas</h3>
   <div><label>Alcance de la remodelación en este espacio</label><textarea data-rf="scope" placeholder="Demolición, redes, muros, pisos, acabados…">${esc(r.scope)}</textarea></div>
   <div><label>Notas técnicas y decisiones</label><textarea data-rf="notes" placeholder="Condiciones encontradas, cambios aprobados, pendientes con el cliente…">${esc(r.notes)}</textarea></div></div>`;
}

/* ---------- acciones ---------- */
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,3200)}
function fail(e){const[t,m]=errText(e);toast(t+' '+m)}
function go(id){view=id;draft={files:[]};try{localStorage.setItem('bo-view',id)}catch(e){}render();$('#main')?.scrollTo(0,0)}
function addRoom(n){const r=mkRoom(n);S.rooms.push(r);touch();view=r.id;tab='registro';render()}
const val=id=>($('#'+id)?.value||'').trim();

document.addEventListener('click',async ev=>{
  const el=ev.target.closest('[data-act]');if(!el||!S)return;
  const a=el.dataset.act,r=room(),id=el.dataset.id;
  if(a==='go'){if(el.dataset.t)tab=el.dataset.t;return go(id)}
  if(a==='quick')return addRoom(el.dataset.n);
  if(a==='jtab'){jtab=el.dataset.v;view='joint';render();$('#main')?.scrollTo(0,0);return}
  if(a==='gf'){jgf=id;return render()}
  if(a==='gt'){jgt=id;return render()}
  if(a==='zoom'){const im=el.querySelector('img');if(im){$('#lbi').src=im.src;$('#lb').classList.add('on')}return}
  if(a==='tab'){tab=el.dataset.v;return render()}
  if(a==='status'){r.status=el.dataset.v;touch();return render()}
  if(a==='delroom'){if(el.dataset.c){S.rooms=S.rooms.filter(x=>x!==r);view='joint';touch();return render()}el.dataset.c=1;el.textContent='Confirmar: se quita del proyecto (los archivos quedan en Drive)';return}
  if(a==='addmep'){r.mep.push({id:uid(),disc:val('md'),kind:val('mk'),qty:Number(val('mq'))||1,loc:val('ml'),tag:val('mt'),st:'proyectado',date:today(),photos:[]});draft.md=val('md');touch();return render()}
  if(a==='delmep'){r.mep=r.mep.filter(x=>x.id!==id);touch();return render()}
  if(a==='addfin'){if(!val('fm'))return toast('Escribe el material.');r.fin.push({id:uid(),el:val('fe'),mat:val('fm'),ref:val('fr'),qty:val('fq'),unit:val('fu'),st:'por comprar'});touch();return render()}
  if(a==='delfin'){r.fin=r.fin.filter(x=>x.id!==id);touch();return render()}
  if(a==='addpunch')return addPunch(el);
  if(a==='delplan'){r.plans=r.plans.filter(x=>x.id!==id);touch();return render()}
  if(a==='delvisit'){r.visits=r.visits.filter(x=>x.id!==id);touch();return render()}
  if(a==='savevisit')return saveVisit(el);
  if(a==='report')return report(el);
  if(EXT.act[a])return EXT.act[a](el);
});
document.addEventListener('change',async ev=>{
  const t=ev.target;if(!S)return;
  if(EXT.change(t))return;
  if(t.dataset.pf){S.project[t.dataset.pf]=t.value;touch();if(t.dataset.pf==='name')render();return}
  if(t.dataset.rf){const r=room();r[t.dataset.rf]=t.value;touch();if(t.dataset.rf==='name')render();return}
  if(t.dataset.mst){const i=room().mep.find(x=>x.id===t.dataset.mst);i.st=t.value;touch();
    if(i.st==='cerrado'&&!(i.photos||[]).length)toast('Cierra solo con foto: agrega la foto de la red antes de tapar.');return render()}
  if(t.dataset.fst){room().fin.find(x=>x.id===t.dataset.fst).st=t.value;touch();return render()}
  if(t.dataset.mph){const r=room(),i=r.mep.find(x=>x.id===t.dataset.mph);
    try{toast('Subiendo foto…');const ph=await uploadPhotos(r,t.files,`MEP · ${i.disc} · ${i.kind}`);i.photos=[...(i.photos||[]),...ph];touch();toast('Foto guardada en Drive');render()}catch(e){fail(e)}return}
  if(t.id==='md'){draft.md=t.value;$('#mk').innerHTML=opts(KINDS[t.value]);return}
  if(t.id==='vd')draft.date=t.value;
  if(t.id==='vn')draft.note=t.value;
  if(t.id==='vt')draft.tag=t.value;
  if(t.id==='vf')addDraft(t.files);
  if(t.id==='pf')addPlans(t.files);
});
document.addEventListener('submit',ev=>{
  if(ev.target.id!=='addf')return;ev.preventDefault();
  const n=$('#newname').value.trim();if(n)addRoom(n);
});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')$('#lb').classList.remove('on')});
document.addEventListener('input',ev=>{if(ev.target.id==='vn')draft.note=ev.target.value});
['dragover','drop'].forEach(n=>document.addEventListener(n,ev=>{
  const z=ev.target.closest('#drop,#pdrop');if(!z)return;ev.preventDefault();
  z.classList.toggle('over',n==='dragover');
  if(n==='drop')z.id==='drop'?addDraft(ev.dataTransfer.files):addPlans(ev.dataTransfer.files);
}));

let pendingDraft=Promise.resolve();
function addDraft(fl){
  const list=[...fl];
  pendingDraft=pendingDraft.then(async()=>{
    for(const f of list){const b=await shrink(f);if(b)draft.files.push({blob:b,url:URL.createObjectURL(b)})}
    draft.date=$('#vd')?.value;draft.note=$('#vn')?.value;draft.tag=$('#vt')?.value;draft.w=$('#vw')?.value;draft.p=$('#vp')?.value;render();
  });
  return pendingDraft;
}
async function saveVisit(btn){
  await pendingDraft;
  const r=room(),note=val('vn'),date=$('#vd').value||today(),tag=$('#vt').value;
  if(!note&&!draft.files.length)return toast('Escribe una observación o agrega fotos.');
  btn.disabled=true;const photos=[];
  try{
        let k=0;
    for(const f of draft.files){btn.textContent=`Subiendo foto ${++k} de ${draft.files.length}…`;
      const name=`${date} · ${tag} · ${uid().slice(0,5)}.jpg`;photos.push({id:await upload(r,name,f.blob,'image/jpeg'),name})}
    r.visits.push({id:uid(),date,note,tag,photos,w:val('vw'),p:val('vp'),delay:val('vx')});if(r.status==='pendiente')r.status='proceso';
    draft={files:[]};touch();toast('Visita guardada en Drive');render();
  }catch(e){fail(e);btn.disabled=false;btn.textContent='Guardar visita en Drive'}
}
async function addPunch(btn){
  const r=room(),text=val('ot');if(!text)return toast('Describe la observación.');
  btn.disabled=true;
  try{const ph=await uploadPhotos(r,$('#oph').files,`OBS · ${$('#og').value}`);
    r.punch.push({id:uid(),text,tag:$('#og').value,sev:$('#os').value,st:'pendiente',date:today(),photos:ph});touch();render()}
  catch(e){fail(e);btn.disabled=false}
}
async function addPlans(fl){
  const r=room();
  try{for(const f of fl){
    const isImg=f.type.startsWith('image/');const b=isImg?await shrink(f,2400,.85):f;
    const id=await upload(r,'PLANO · '+f.name,b,isImg?'image/jpeg':f.type);
    r.plans.push({id,name:f.name,mime:isImg?'image/jpeg':f.type});}
    touch();toast('Planos guardados en Drive');render()}
  catch(e){fail(e)}
}

/* informe final (Google Doc) */
async function thumb(id){
  const u=await fileURL(id);
  return new Promise(res=>{const i=new Image();i.onload=()=>{const k=Math.min(1,520/i.width),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.7))};i.onerror=()=>res('');i.src=u});
}
const stL=(arr,k)=>(arr.find(x=>x[0]===k)||[0,k])[1];
async function report(btn){
  btn.disabled=true;const p=S.project;
  try{
    let h=`<h1>${esc(p.name)}</h1><p>${esc(p.address)}</p><p><b>Propietario:</b> ${esc(p.owner)||'—'}<br><b>Responsable técnico:</b> ${esc(p.lead)||'—'}</p><p><b>Avance general:</b> ${total()}%<br><b>Emitido:</b> ${today()}</p>
    <h2>Índice de láminas</h2><table border="1" cellpadding="5"><tr><th>Lámina</th><th>Espacio</th><th>Estado</th><th>Redes MEP</th><th>Acabados</th><th>Avance</th></tr>${S.rooms.map((r,i)=>`<tr><td>L-${pad(i+1)}</td><td>${esc(r.name)}</td><td>${STAT[r.status]}</td><td>${mepProg(r)??'—'}%</td><td>${finProg(r)??'—'}%</td><td>${prog(r)}%</td></tr>`).join('')}</table>`;
    h+=EXT.reportHtml();
    for(const[i,r]of S.rooms.entries()){
      btn.textContent=`Armando lámina ${i+1} de ${S.rooms.length}…`;
      h+=`<br style="page-break-before:always"><h1>L-${pad(i+1)} · ${esc(r.name)}</h1><table border="1" cellpadding="5"><tr><td><b>Nivel</b></td><td>${esc(r.level)}</td><td><b>Área</b></td><td>${esc(r.area)} m²</td></tr><tr><td><b>Escala</b></td><td>${esc(r.scale)}</td><td><b>Ref. plano</b></td><td>${esc(r.ref)}</td></tr><tr><td><b>Estado</b></td><td>${STAT[r.status]}</td><td><b>Avance</b></td><td>${prog(r)}%</td></tr></table>
      ${r.scope?`<h3>Alcance</h3><p>${esc(r.scope).replace(/\n/g,'<br>')}</p>`:''}
      ${r.mep.length?`<h3>Redes MEP</h3><table border="1" cellpadding="4"><tr><th>Disciplina</th><th>Punto</th><th>Cant.</th><th>Ubicación</th><th>Tag</th><th>Estado</th><th>Fotos</th></tr>${r.mep.map(x=>`<tr><td>${esc(x.disc)}</td><td>${esc(x.kind)}</td><td>${esc(x.qty)}</td><td>${esc(x.loc)}</td><td>${esc(x.tag)}</td><td>${stL(MEP_ST,x.st)}</td><td>${(x.photos||[]).length}</td></tr>`).join('')}</table>`:''}
      ${r.fin.length?`<h3>Cuadro de acabados</h3><table border="1" cellpadding="4"><tr><th>Elemento</th><th>Material</th><th>Ref.</th><th>Cantidad</th><th>Estado</th></tr>${r.fin.map(x=>`<tr><td>${esc(x.el)}</td><td>${esc(x.mat)}</td><td>${esc(x.ref)}</td><td>${esc(x.qty)} ${esc(x.unit)}</td><td>${stL(FIN_ST,x.st)}</td></tr>`).join('')}</table>`:''}
      ${r.punch.length?`<h3>Observaciones</h3><ul>${r.punch.map(x=>`<li>${openP(x)?'☐':'☑'} ${esc(x.text)} (${esc(x.tag)}, prioridad ${x.sev})</li>`).join('')}</ul>`:''}
      <h3>Registro de obra</h3>`;
      for(const v of [...r.visits].sort((a,b)=>a.date.localeCompare(b.date))){
        h+=`<p><b>${v.date}</b> · ${esc(v.tag||'General')} — ${esc(v.note)}</p>`;
        for(const f of v.photos.slice(0,8)){const t=await thumb(f.id).catch(()=>'');if(t)h+=`<img src="${t}" width="260"> `}
      }
    }
    btn.textContent='Subiendo informe…';
    const c=await drive('create_file',{title:`Informe de obra · ${p.name} · ${today()}`,parentId:F.root,contentMimeType:'text/html',textContent:`<html><body>${h}</body></html>`});
    toast('Informe creado en tu Drive');
    btn.outerHTML=`<a class="btn sig" href="${esc(c.viewUrl||'https://drive.google.com/drive/folders/'+F.root)}" target="_blank" rel="noopener">Abrir informe ↗</a>`;
  }catch(e){fail(e);btn.disabled=false;btn.textContent='Generar informe final en Drive'}
}

/* ---------- arranque ---------- */
(async()=>{
  try{
    mcp=await window.claude?.use('mcp');
    if(!mcp)mcp=await chooseBackend();
    S=await loadState();
    try{const v=localStorage.getItem('bo-view');if(v&&S.rooms.some(r=>r.id===v))view=v}catch(e){}
    sync={s:'ok',x:null};render();
  }catch(e){fatal=e;render()}
})();
