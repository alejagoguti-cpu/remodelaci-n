/*
 * Módulos de proyecto adaptados de OpenConstructionERP
 * https://github.com/datadrivenconstruction/OpenConstructionERP
 * Copyright (c) 2024-2026 Artem Boiko / DataDrivenConstruction y colaboradores. AGPL-3.0-or-later.
 *
 * Esta obra derivada toma de allí los modelos de datos, los flujos de estado y la lógica de
 * (a) commissioning: preparación y puerta de puesta en servicio,
 * (b) ncr: no conformidades,
 * (c) punchlist: pendientes con verificación y reapertura,
 * (d) inspections: inspecciones con listas de chequeo,
 * (e) site_inventory: movimientos y saldo de materiales,
 * (f) schedule_advanced: plan semanal Last Planner y PPC,
 * (g) daily_diary: diario de obra,
 * reescritos en JavaScript y traducidos al español. Se distribuye bajo AGPL-3.0-or-later (ver LICENSE y NOTICE).
 */
const EXT={act:{},views:{},tabs:[],reportHtml:()=>''};
const save=()=>{touch();render()};
const sel=(id,a,v)=>`<select id="${id}">${opts(a,v)}</select>`;
const field=(l,inner,w)=>`<div ${w?`style="width:${w}px"`:'style="flex:1;min-width:150px"'}><label>${l}</label>${inner}</div>`;
const emptyBox=(t,m)=>`<div class="empty"><h3 style="font:800 18px var(--display);text-transform:uppercase">${t}</h3>${m}</div>`;
const roomOpts=()=>[['','— Proyecto general —'],...S.rooms.map(r=>[r.id,r.name])];
const roomName=id=>(S.rooms.find(r=>r.id===id)||{name:'General'}).name;
const flow=(map,from)=>map[from]||[];
const stBtns=(map,labels,from,act,id)=>flow(map,from).map(t=>`<button class="btn alt sm" data-act="${act}" data-id="${id}" data-to="${t}">${labels[t]||t}</button>`).join('');

/* ====== 1. PUESTA EN MARCHA (commissioning) ====== */
const CX_TYPES=['Eléctrica','Hidráulica','Sanitaria','Gas','Datos y CCTV','HVAC'];
const CX_CAT={
 'Eléctrica':{pre:['Circuitos identificados, rotulados y coherentes con el cuadro de cargas.','Torque de bornes y conexiones del tablero revisado y marcado.','Aislamiento y continuidad de tierra medidos en cada circuito final.','Protecciones (breakers y diferencial) con el calibre del diseño.'],fun:['Cada toma e interruptor responde al circuito correcto.','El diferencial dispara con el botón de prueba y se rearma.','Polaridad y tensión correctas en todas las tomas.','Carga simultánea de circuitos sin disparo ni calentamiento.']},
 'Hidráulica':{pre:['Tubería sometida a prueba de presión sin pérdida durante el tiempo especificado.','Sistema lavado y sin residuos de obra.','Llaves de paso instaladas, rotuladas y accesibles.','Aislamiento continuo en agua caliente.'],fun:['Agua caliente llega a temperatura en el punto más lejano.','Presión y caudal suficientes en todos los puntos abiertos a la vez.','Sin fugas en uniones ni aparatos tras 24 h con presión.','Llaves de paso cierran y abren sin goteo.']},
 'Sanitaria':{pre:['Pendientes de desagüe verificadas contra el diseño.','Sifones y registros instalados y accesibles.','Ventilaciones conectadas y sin obstrucción.'],fun:['Prueba de llenado sin fugas ni pérdida de nivel.','Descarga simultánea de aparatos sin retorno ni gorgoteo.','Sellos de agua de sifones se mantienen.','Cajas de registro libres de residuos.']},
 'Gas':{pre:['Tubería y accesorios según norma, con soportes y protección.','Prueba de hermeticidad con presión y tiempo especificados.','Ventilación del recinto verificada.'],fun:['Sin fugas con solución jabonosa o detector.','Válvula de corte y regulador operan correctamente.','Llama estable en el artefacto.']},
 'Datos y CCTV':{pre:['Cableado rotulado en ambos extremos.','Canalizaciones separadas de potencia.','Puntos terminados en jack o conector especificado.'],fun:['Certificación de cada punto de datos aprobada.','Cada cámara transmite imagen al grabador.','Cobertura y ángulos según el diseño.']},
 'HVAC':{pre:['Equipo instalado según planos con espacios de servicio libres.','Drenaje de condensado con pendiente y sifón cebado.','Verificación eléctrica de motor y protecciones.'],fun:['Temperatura de impulsión alcanza el setpoint.','Sin ruido ni vibración anormal en operación.','Drenaje funciona sin goteos.','Control remoto/termostato responde correctamente.']}};
const CX_SYS={not_started:'Sin iniciar',in_progress:'En pruebas',tests_complete:'Pruebas completas',commissioned:'En servicio'};
const CX_IT=[['pending','Pendiente'],['pass','Aprueba'],['fail','Falla'],['na','N/A']];
const SEVC=[['low','Baja'],['medium','Media'],['high','Alta'],['critical','Crítica']];
function readiness(sys){
  const fun=sys.checks.filter(c=>c.kind==='fun'),cnt=k=>fun.filter(c=>c.st===k).length;
  const passed=cnt('pass'),failed=cnt('fail'),na=cnt('na'),pending=fun.length-passed-failed-na;
  const applicable=fun.length-na,open=failed+pending,crit=sys.issues.filter(i=>i.open&&i.sev==='critical').length;
  const defined=applicable>0,pctv=defined?Math.round(passed/applicable*100):0,can=defined&&open===0&&crit===0;
  const why=[];
  if(!fun.length)why.push('El sistema no tiene pruebas funcionales.');
  else if(!defined)why.push('Todas las pruebas funcionales están en N/A; al menos una debe aprobar.');
  else if(open>0)why.push(`${open} prueba(s) funcional(es) sin aprobar.`);
  if(crit>0)why.push(`${crit} incidencia(s) crítica(s) abierta(s).`);
  const level=(crit>0||failed>0||!defined)?'red':can?'green':'amber';
  return{pct:pctv,defined,can,why,level,open,crit,total:fun.length};
}
function cxAuto(sys){
  if(sys.status==='commissioned')return;
  const any=sys.checks.some(c=>c.st!=='pending'),fun=sys.checks.filter(c=>c.kind==='fun');
  sys.status=!any?'not_started':(fun.length&&fun.every(c=>c.st!=='pending'))?'tests_complete':'in_progress';
}
EXT.views.cx=function(){
  const L=S.cx;
  const stats=`<div class="stats"><div><b>${L.length}</b><span>Sistemas</span></div><div><b>${L.filter(s=>s.status==='commissioned').length}</b><span>En servicio</span></div><div><b>${L.filter(s=>readiness(s).level==='red').length}</b><span>Con bloqueo</span></div><div><b>${L.reduce((a,s)=>a+s.issues.filter(i=>i.open).length,0)}</b><span>Incidencias abiertas</span></div></div>`;
  const form=`<div class="panel"><h3>Nuevo sistema a poner en marcha</h3><div class="row f">${field('Disciplina',sel('cxt',CX_TYPES,'Eléctrica'),150)}${field('Nombre',`<input id="cxn" placeholder="Ej. Tablero TD-2 · segundo piso">`)}${field('Tag',`<input id="cxg" placeholder="TD-2">`,110)}${field('Ubicación',`<input id="cxl" placeholder="Pasillo, muro norte">`)}<button class="btn" data-act="cxadd">Crear con su lista de pruebas</button></div>
   <small style="color:var(--mute)">Cada sistema trae pruebas previas (antes de energizar o presurizar) y pruebas funcionales. Solo las funcionales cuentan para ponerlo en servicio.</small></div>`;
  const cards=L.map(s=>{const r=readiness(s);return`<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><div><h3>${esc(s.name)}</h3><small style="color:var(--mute)">${esc(s.type)}${s.tag?' · '+esc(s.tag):''}${s.loc?' · '+esc(s.loc):''}</small></div>
    <div class="row" style="align-items:center"><span class="pill ${r.level==='green'?'terminado':r.level==='amber'?'proceso':''}" ${r.level==='red'?'style="background:var(--bad)"':''}>${CX_SYS[s.status]}</span><div class="ring" style="--p:${r.pct}" data-l="${r.pct}"></div></div></div>
    ${['pre','fun'].map(k=>`<div><label style="font:500 10px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mute)">${k==='pre'?'Pruebas previas':'Pruebas funcionales (definen la puesta en servicio)'}</label>
     ${s.checks.filter(c=>c.kind===k).map(c=>`<div class="item" style="padding:7px 0"><div class="it-h"><span style="flex:1;min-width:200px">${esc(c.text)}</span><select class="mini" data-cxc="${s.id}|${c.id}">${opts(CX_IT,c.st)}</select></div></div>`).join('')}</div>`).join('')}
    <div><label style="font:500 10px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mute)">Incidencias</label>
     ${s.issues.map(i=>`<div class="item ${i.open?'':'done'}" style="padding:7px 0"><div class="it-h"><b style="flex:1;min-width:200px">${esc(i.text)}</b><span class="tag sev-${i.sev==='critical'||i.sev==='high'?'alta':i.sev==='medium'?'media':'baja'}">${SEVC.find(x=>x[0]===i.sev)[1]}</span><button class="btn alt sm" data-act="cxissue" data-id="${s.id}|${i.id}">${i.open?'Cerrar':'Reabrir'}</button></div></div>`).join('')||'<div class="it-s">Sin incidencias.</div>'}
     <div class="row f" style="margin-top:6px">${field('Nueva incidencia',`<input id="cxi-${s.id}" placeholder="Qué falló o falta">`)}${field('Severidad',`<select id="cxs-${s.id}">${opts(SEVC,'medium')}</select>`,130)}<button class="btn alt sm" data-act="cxaddissue" data-id="${s.id}">Añadir</button></div></div>
    <div class="row" style="align-items:center">${s.status==='commissioned'?`<span style="color:var(--ok);font-weight:600">Puesto en servicio ${esc(s.at||'')}</span><button class="btn alt sm" data-act="cxrevoke" data-id="${s.id}">Revertir</button>`:`<button class="btn sig" data-act="cxcommission" data-id="${s.id}" ${r.can?'':'disabled'}>Poner en servicio</button>${r.why.map(w=>`<span style="color:var(--warn);font-size:12px">${esc(w)}</span>`).join(' ')}`}<button class="ghost" data-act="cxdel" data-id="${s.id}" style="margin-left:auto">Eliminar</button></div></div>`}).join('');
  return stats+form+(cards||emptyBox('Aún no hay sistemas','Crea el primero: tablero eléctrico, red de agua, desagües, gas, datos o A/A.'));
};
EXT.act.cxadd=el=>{
  const t=val('cxt'),n=val('cxn');if(!n)return toast('Escribe el nombre del sistema.');
  const c=CX_CAT[t];
  S.cx.push({id:uid(),name:n,type:t,tag:val('cxg'),loc:val('cxl'),status:'not_started',at:'',
    checks:[...c.pre.map(x=>({id:uid(),kind:'pre',text:x,st:'pending'})),...c.fun.map(x=>({id:uid(),kind:'fun',text:x,st:'pending'}))],issues:[]});
  save();
};
EXT.act.cxdel=el=>{S.cx=S.cx.filter(s=>s.id!==el.dataset.id);save()};
EXT.act.cxaddissue=el=>{const s=S.cx.find(x=>x.id===el.dataset.id),t=val('cxi-'+s.id);if(!t)return toast('Describe la incidencia.');s.issues.push({id:uid(),text:t,sev:val('cxs-'+s.id),open:true});save()};
EXT.act.cxissue=el=>{const[a,b]=el.dataset.id.split('|'),i=S.cx.find(x=>x.id===a).issues.find(x=>x.id===b);i.open=!i.open;save()};
EXT.act.cxcommission=el=>{const s=S.cx.find(x=>x.id===el.dataset.id),r=readiness(s);if(!r.can)return toast(r.why[0]);s.status='commissioned';s.at=today();save()};
EXT.act.cxrevoke=el=>{const s=S.cx.find(x=>x.id===el.dataset.id);s.status='tests_complete';s.at='';cxAuto(s);save()};

/* ====== 2. NO CONFORMIDADES (ncr) ====== */
const NCR_ST={identified:'Identificada',under_review:'En revisión',corrective_action:'Acción correctiva',verification:'Verificación',closed:'Cerrada',void:'Anulada'};
const NCR_FLOW={identified:['under_review','void'],under_review:['corrective_action','identified','void'],corrective_action:['verification','under_review','void'],verification:['closed','corrective_action'],closed:[],void:[]};
const NCR_TYPES=['Material','Mano de obra','Diseño','Instalación MEP','Acabado'];
const NCR_SEV=[['minor','Menor'],['major','Mayor'],['critical','Crítica']];
const NCR_CAUSE=['Material defectuoso','Falta de supervisión','Error de diseño','Método constructivo','Falta de coordinación','Otro'];
EXT.views.ncr=function(){
  const L=S.ncr,open=L.filter(n=>!['closed','void'].includes(n.st));
  const form=`<div class="panel"><h3>Nueva no conformidad</h3><div class="row f">${field('Título',`<input id="nct" placeholder="Ej. Tubo de agua instalado fuera de trazado">`)}${field('Tipo',sel('ncy',NCR_TYPES,'Instalación MEP'),160)}${field('Severidad',sel('ncs',NCR_SEV,'major'),120)}${field('Espacio',sel('ncr_room',roomOpts()),160)}</div>
   <div class="row f">${field('Descripción',`<input id="ncd" placeholder="Qué se encontró y dónde">`)}<button class="btn" data-act="ncadd">Registrar</button></div></div>`;
  const cards=[...L].reverse().map(n=>`<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><div><h3>${n.no} · ${esc(n.title)}</h3><small style="color:var(--mute)">${esc(n.type)} · ${esc(roomName(n.room))} · ${n.date}</small></div><div class="row" style="align-items:center"><span class="tag sev-${n.sev==='critical'?'alta':n.sev==='major'?'media':'baja'}">${NCR_SEV.find(x=>x[0]===n.sev)[1]}</span><span class="pill ${n.st==='closed'?'terminado':n.st==='identified'?'':'proceso'}">${NCR_ST[n.st]}</span></div></div>
   <p style="margin:0">${esc(n.desc)}</p>
   <div class="cols f">${field('Causa raíz',`<select data-ncf="${n.id}|cause">${opts([['','—'],...NCR_CAUSE],n.cause)}</select>`,'')}${field('Acción correctiva',`<input data-ncf="${n.id}|corrective" value="${esc(n.corrective)}">`)}${field('Acción preventiva',`<input data-ncf="${n.id}|preventive" value="${esc(n.preventive)}">`)}${field('Impacto en costo',`<input data-ncf="${n.id}|cost" value="${esc(n.cost)}" placeholder="0">`)}${field('Impacto en plazo (días)',`<input type="number" data-ncf="${n.id}|days" value="${esc(n.days)}">`)}</div>
   <div class="row">${stBtns(NCR_FLOW,NCR_ST,n.st,'ncgo',n.id)}</div></div>`).join('');
  return `<div class="stats"><div><b>${L.length}</b><span>Registradas</span></div><div><b>${open.length}</b><span>Abiertas</span></div><div><b>${open.filter(n=>n.sev==='critical').length}</b><span>Críticas abiertas</span></div><div><b>${L.filter(n=>n.st==='closed').length}</b><span>Cerradas</span></div></div>`+form+(cards||emptyBox('Sin no conformidades','Registra aquí lo que no cumple con el diseño o la norma, con su causa y acción correctiva.'));
};
EXT.act.ncadd=el=>{const t=val('nct');if(!t)return toast('Escribe el título.');S.ncr.push({id:uid(),no:'NCR-'+pad(S.ncr.length+1).padStart(3,'0'),title:t,desc:val('ncd'),type:val('ncy'),sev:val('ncs'),room:val('ncr_room'),st:'identified',date:today(),cause:'',corrective:'',preventive:'',cost:'',days:''});save()};
EXT.act.ncgo=el=>{const n=S.ncr.find(x=>x.id===el.dataset.id),to=el.dataset.to;if(!NCR_FLOW[n.st].includes(to))return;
  if(to==='closed'&&!n.corrective)return toast('Para cerrar, registra la acción correctiva.');n.st=to;save()};

/* ====== 3. OBSERVACIONES / PENDIENTES (punchlist) ====== */
const PU_ST={open:'Abierta',assigned:'Asignada',in_progress:'En proceso',resolved:'Resuelta',verified:'Verificada',closed:'Cerrada'};
const PU_FLOW={open:['assigned','in_progress'],assigned:['in_progress','open'],in_progress:['resolved','assigned','open'],resolved:['verified','open'],verified:['closed','open'],closed:['open']};
const openP=x=>!['verified','closed'].includes(x.st);
function punchRow(x,roomId){
  return `<div class="item ${openP(x)?'':'done'}"><div class="it-h"><b style="flex:1;min-width:180px">${esc(x.text)}</b><span class="tag">${esc(x.tag)}</span><span class="tag sev-${x.sev}">${x.sev}</span><span class="pill ${x.st==='closed'||x.st==='verified'?'terminado':x.st==='open'?'':'proceso'}">${PU_ST[x.st]}</span><button class="ghost" data-act="pudel" data-id="${roomId}|${x.id}">✕</button></div>
   <div class="it-s">${esc(roomName(roomId))}${x.due?' · vence '+x.due:''}${x.reopened?` · reabierta ${x.reopened} vez/veces`:''}${x.note?' · '+esc(x.note):''}</div>
   ${(x.photos||[]).length?`<div class="grid sm">${phHtml(x.photos)}</div>`:''}
   <div class="row">${stBtns(PU_FLOW,{open:'Reabrir',assigned:'Asignar',in_progress:'Iniciar',resolved:'Marcar resuelta',verified:'Verificar',closed:'Cerrar'},x.st,'pugo',roomId+'|'+x.id)}</div></div>`;
}
EXT.punchRow=punchRow;
EXT.views.punch=function(){
  const A=allPunch();const f=EXT.pf||'open';
  const shown=A.filter(x=>f==='all'||(f==='open'?openP(x):!openP(x))).sort((a,b)=>SEV.indexOf(a.sev)-SEV.indexOf(b.sev));
  const on=c=>c?'style="border-color:var(--signal);color:var(--signal)"':'';
  return `<div class="stats"><div><b>${A.length}</b><span>Total</span></div><div><b>${A.filter(openP).length}</b><span>Abiertas</span></div><div><b>${A.filter(x=>x.st==='resolved').length}</b><span>Por verificar</span></div><div><b>${A.filter(x=>x.reopened).length}</b><span>Reabiertas</span></div></div>
  <div class="panel"><div class="chips" style="margin:0;justify-content:flex-start"><button data-act="puf" data-id="open" ${on(f==='open')}>Abiertas</button><button data-act="puf" data-id="done" ${on(f==='done')}>Verificadas / cerradas</button><button data-act="puf" data-id="all" ${on(f==='all')}>Todas</button></div>
  ${shown.map(x=>punchRow(x,x.room.id)).join('')||'<div class="empty">Nada en esta vista. Registra observaciones desde la pestaña Observaciones de cada lámina.</div>'}</div>`;
};
EXT.act.puf=el=>{EXT.pf=el.dataset.id;render()};
const findPunch=s=>{const[r,i]=s.split('|'),R=S.rooms.find(x=>x.id===r);return[R,R.punch.find(x=>x.id===i)]};
EXT.act.pugo=el=>{const[R,x]=findPunch(el.dataset.id),to=el.dataset.to;if(!PU_FLOW[x.st].includes(to))return;
  if(to==='open'&&['verified','closed','resolved'].includes(x.st))x.reopened=(x.reopened||0)+1;x.st=to;save()};
EXT.act.pudel=el=>{const[R,x]=findPunch(el.dataset.id);R.punch=R.punch.filter(p=>p!==x);save()};

/* ====== 4. INSPECCIONES (inspections / ITP) ====== */
const INSP_ST={scheduled:'Programada',in_progress:'En curso',completed:'Aprobada',failed:'No aprobada',cancelled:'Cancelada'};
const INSP_FLOW={scheduled:['in_progress','cancelled'],in_progress:[],completed:[],failed:['scheduled'],cancelled:[]};
const ITP={
 'Prueba de presión hidráulica':[['Presión de prueba aplicada (bar)','numeric'],['Duración de la prueba (h)','numeric'],['Mantiene presión sin pérdida','pass_fail'],['Sin fugas visibles en uniones','pass_fail']],
 'Continuidad y aislamiento eléctrico':[['Aislamiento medido (MΩ)','numeric'],['Continuidad del conductor de tierra','pass_fail'],['Polaridad correcta en tomas','pass_fail'],['Protecciones según cuadro de cargas','pass_fail']],
 'Prueba de desagües':[['Prueba de llenado sin fugas','pass_fail'],['Pendiente adecuada','pass_fail'],['Sifones con sello de agua','pass_fail'],['Observaciones','text']],
 'Prueba de hermeticidad de gas':[['Presión de prueba (bar)','numeric'],['Sin caída de presión en el tiempo especificado','pass_fail'],['Sin fugas con solución jabonosa','pass_fail']],
 'Recepción de piso':[['Nivelación (mm en 2 m)','numeric'],['Pendiente hacia desagüe','pass_fail'],['Sin piezas huecas o fisuradas','pass_fail'],['Juntas alineadas y uniformes','pass_fail']],
 'Recepción de pintura':[['Superficie lisa y seca antes de pintar','pass_fail'],['Color uniforme','pass_fail'],['Sin chorreaduras ni brochazos','pass_fail'],['Calificación general (1-5)','rating']],
 'Impermeabilización':[['Prueba de espejo de agua 24 h sin pérdida','pass_fail'],['Remates y sellos continuos','pass_fail'],['Observaciones','text']]};
const IT_LABEL={pass_fail:'Cumple',numeric:'Valor',text:'Texto',rating:'1-5'};
EXT.views.insp=function(){
  const L=S.insp,form=`<div class="panel"><h3>Programar inspección</h3><div class="row f">${field('Plantilla',sel('ipt',Object.keys(ITP)),240)}${field('Espacio',sel('ipr',roomOpts()),170)}${field('Fecha',`<input type="date" id="ipd" value="${today()}">`,150)}<button class="btn" data-act="inadd">Programar</button></div></div>`;
  const cards=[...L].reverse().map(n=>`<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><div><h3>${esc(n.tpl)}</h3><small style="color:var(--mute)">${esc(roomName(n.room))} · ${n.date}</small></div><span class="pill ${n.st==='completed'?'terminado':n.st==='failed'?'':'proceso'}" ${n.st==='failed'?'style="background:var(--bad)"':''}>${INSP_ST[n.st]}</span></div>
   ${n.st==='in_progress'||n.st==='completed'||n.st==='failed'?n.items.map((it,k)=>`<div class="item" style="padding:7px 0"><div class="it-h"><span style="flex:1;min-width:200px">${esc(it.q)}</span>${
     it.t==='pass_fail'?`<select class="mini" data-inr="${n.id}|${k}" ${n.st==='in_progress'?'':'disabled'}>${opts([['','—'],['pass','Cumple'],['fail','No cumple']],it.a)}</select>`:
     `<input style="width:${it.t==='text'?240:100}px" data-inr="${n.id}|${k}" value="${esc(it.a)}" ${it.t==='numeric'||it.t==='rating'?'type="number" step="any"':''} ${n.st==='in_progress'?'':'disabled'}>`}</div></div>`).join(''):''}
   <div class="row">${stBtns(INSP_FLOW,INSP_ST,n.st,'ingo',n.id).replace('data-to="scheduled"','data-to="scheduled"')}${n.st==='in_progress'?`<button class="btn sig sm" data-act="infin" data-id="${n.id}">Finalizar inspección</button>`:''}${n.st==='failed'?`<button class="btn alt sm" data-act="inncr" data-id="${n.id}">Crear no conformidad</button>`:''}</div></div>`).join('');
  return `<div class="stats"><div><b>${L.length}</b><span>Inspecciones</span></div><div><b>${L.filter(i=>i.st==='scheduled'||i.st==='in_progress').length}</b><span>Pendientes</span></div><div><b>${L.filter(i=>i.st==='completed').length}</b><span>Aprobadas</span></div><div><b>${L.filter(i=>i.st==='failed').length}</b><span>No aprobadas</span></div></div>`+form+(cards||emptyBox('Sin inspecciones','Programa pruebas de presión, aislamiento eléctrico, desagües, pisos o pintura, y registra el resultado de cada punto.'));
};
EXT.act.inadd=el=>{const t=val('ipt');S.insp.push({id:uid(),tpl:t,room:val('ipr'),date:val('ipd')||today(),st:'scheduled',items:ITP[t].map(([q,ty])=>({q,t:ty,a:''}))});save()};
EXT.act.ingo=el=>{const n=S.insp.find(x=>x.id===el.dataset.id),to=el.dataset.to;if(!INSP_FLOW[n.st].includes(to))return;n.st=to;if(to==='scheduled')n.items.forEach(i=>i.a='');save()};
EXT.act.infin=el=>{const n=S.insp.find(x=>x.id===el.dataset.id);
  const pf=n.items.filter(i=>i.t==='pass_fail');if(pf.some(i=>!i.a))return toast('Responde todos los puntos de cumple / no cumple.');
  n.st=pf.some(i=>i.a==='fail')?'failed':'completed';save()};
EXT.act.inncr=el=>{const n=S.insp.find(x=>x.id===el.dataset.id),bad=n.items.filter(i=>i.a==='fail').map(i=>i.q).join('; ');
  S.ncr.push({id:uid(),no:'NCR-'+pad(S.ncr.length+1).padStart(3,'0'),title:'Inspección no aprobada: '+n.tpl,desc:bad,type:'Instalación MEP',sev:'major',room:n.room,st:'identified',date:today(),cause:'',corrective:'',preventive:'',cost:'',days:'',insp:n.id});
  jtab='ncr';save()};

/* ====== 5. MATERIALES EN OBRA (site_inventory) ====== */
const MV=[['in','Ingreso a obra'],['use','Consumo (instalado)'],['waste','Desperdicio / pérdida']];
function stock(){
  const m={};
  S.mat.forEach(x=>{const k=x.item.toLowerCase()+'|'+x.unit;const o=m[k]=m[k]||{item:x.item,unit:x.unit,in:0,use:0,waste:0,cost:0};o[x.type]+=Number(x.qty)||0;if(x.type==='in')o.cost+=(Number(x.qty)||0)*(Number(x.price)||0)});
  return Object.values(m).map(o=>({...o,hand:o.in-o.use-o.waste,wasteR:o.in?o.waste/o.in*100:null}));
}
EXT.views.mat=function(){
  const st=stock(),total=st.reduce((a,o)=>a+o.cost,0);
  const form=`<div class="panel"><h3>Movimiento de material</h3><div class="row f">${field('Tipo',sel('mvt',MV,'in'),170)}${field('Material',`<input id="mvi" list="mvl" placeholder="Ej. Tubería PVC 1/2&quot;"><datalist id="mvl">${[...new Set(S.mat.map(x=>x.item))].map(i=>`<option value="${esc(i)}">`).join('')}</datalist>`)}${field('Cantidad',`<input id="mvq" type="number" step="any" min="0">`,90)}${field('Unidad',`<input id="mvu" value="und">`,80)}${field('Costo unit.',`<input id="mvp" type="number" step="any" min="0" placeholder="opcional">`,110)}${field('Espacio',sel('mvr',roomOpts()),150)}${field('Fecha',`<input id="mvd" type="date" value="${today()}">`,140)}<button class="btn" data-act="mvadd">Registrar</button></div></div>`;
  return `<div class="stats"><div><b>${st.length}</b><span>Materiales</span></div><div><b>${st.filter(o=>o.hand<0).length}</b><span>Saldo negativo</span></div><div><b>${st.length?Math.round(avg(st.filter(o=>o.wasteR!==null).map(o=>o.wasteR))||0)+'%':'—'}</b><span>Desperdicio medio</span></div><div><b>${Math.round(total).toLocaleString('es')}</b><span>Costo de ingresos</span></div></div>`+form+
  `<div class="panel"><h3>Saldo en obra</h3>${st.length?`<div class="tw"><table><tr><th>Material</th><th>Ingresó</th><th>Instalado</th><th>Perdido</th><th>Saldo</th><th>Desperdicio</th></tr>${st.map(o=>`<tr><td><b>${esc(o.item)}</b></td><td>${o.in} ${esc(o.unit)}</td><td>${o.use}</td><td>${o.waste}</td><td style="font-weight:700;color:${o.hand<0?'var(--bad)':'inherit'}">${Math.round(o.hand*100)/100} ${esc(o.unit)}</td><td style="color:${o.wasteR>10?'var(--bad)':'inherit'}">${o.wasteR===null?'—':Math.round(o.wasteR)+'%'}</td></tr>`).join('')}</table></div>`:'<div class="empty">Registra lo que llega a obra y lo que se instala; el saldo se calcula solo.</div>'}</div>`+
  (S.mat.length?`<div class="panel"><h3>Movimientos</h3>${[...S.mat].reverse().slice(0,30).map(x=>`<div class="hb"><span>${esc(x.item)} · ${x.qty} ${esc(x.unit)}</span><span class="tag">${MV.find(m=>m[0]===x.type)[1]}</span><b style="font:11px var(--mono);color:var(--mute)">${x.date} · ${esc(roomName(x.room))} <button class="ghost" data-act="mvdel" data-id="${x.id}">✕</button></b></div>`).join('')}</div>`:'');
};
EXT.act.mvadd=el=>{if(!val('mvi')||!(Number(val('mvq'))>0))return toast('Indica material y una cantidad mayor que cero.');S.mat.push({id:uid(),type:val('mvt'),item:val('mvi'),qty:Number(val('mvq')),unit:val('mvu')||'und',price:val('mvp'),room:val('mvr'),date:val('mvd')||today()});save()};
EXT.act.mvdel=el=>{S.mat=S.mat.filter(x=>x.id!==el.dataset.id);save()};

/* ====== 6. PLAN SEMANAL · LAST PLANNER (schedule_advanced) ====== */
const REASONS=['Material','Mano de obra','Diseño / cambio','Clima','Predecesora sin terminar','Otro'];
const PL_ST=[['planned','Comprometida'],['done','Cumplida'],['missed','No cumplida']];
const monday=d=>{const x=new Date(d+'T12:00');x.setDate(x.getDate()-((x.getDay()+6)%7));return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`};
const addDays=(d,n)=>{const x=new Date(d+'T12:00');x.setDate(x.getDate()+n);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`};
const ppc=a=>{const c=a.filter(x=>x.st!=='planned');return c.length?Math.round(c.filter(x=>x.st==='done').length/c.length*100):null};
EXT.views.plan=function(){
  const wk=EXT.wk||monday(today()),items=S.plan.filter(x=>x.week===wk);
  const hist=[5,4,3,2,1,0].map(k=>{const w=addDays(monday(today()),-7*k);return{w,p:ppc(S.plan.filter(x=>x.week===w))}});
  const look=[1,2,3].map(k=>addDays(wk,7*k));
  const rs={};S.plan.filter(x=>x.st==='missed').forEach(x=>rs[x.reason||'Otro']=(rs[x.reason||'Otro']||0)+1);
  return `<div class="stats"><div><b>${ppc(items)===null?'—':ppc(items)+'%'}</b><span>PPC semana</span></div><div><b>${items.length}</b><span>Compromisos</span></div><div><b>${S.plan.filter(x=>x.constraint&&x.st==='planned').length}</b><span>Restricciones abiertas</span></div><div><b>${ppc(S.plan)===null?'—':ppc(S.plan)+'%'}</b><span>PPC acumulado</span></div></div>
  <div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h3>Semana del ${wk}</h3><div class="row"><button class="btn alt sm" data-act="plwk" data-id="-7">← Anterior</button><button class="btn alt sm" data-act="plwk" data-id="0">Esta semana</button><button class="btn alt sm" data-act="plwk" data-id="7">Siguiente →</button></div></div>
   <div class="row f">${field('Compromiso',`<input id="plt" placeholder="Ej. Tender tubería de agua fría del baño">`)}${field('Espacio',sel('plr',roomOpts()),150)}${field('Disciplina',sel('plg',TAGS,'Hidráulica'),140)}${field('Restricción',`<input id="plc" placeholder="Qué impide empezar (opcional)">`)}<button class="btn" data-act="pladd">Comprometer</button></div>
   ${items.map(x=>`<div class="item"><div class="it-h"><b style="flex:1;min-width:200px">${esc(x.text)}</b><span class="tag">${esc(x.tag)}</span><span class="it-s">${esc(roomName(x.room))}</span><select class="mini" data-pls="${x.id}">${opts(PL_ST,x.st)}</select><button class="ghost" data-act="pldel" data-id="${x.id}">✕</button></div>
    ${x.constraint?`<div class="it-s" style="color:var(--warn)">Restricción: ${esc(x.constraint)}</div>`:''}${x.st==='missed'?`<div class="row f">${field('Causa del incumplimiento',`<select data-plr="${x.id}">${opts([['','— elegir —'],...REASONS],x.reason)}</select>`,260)}</div>`:''}</div>`).join('')||'<div class="empty">Sin compromisos esta semana. Planifica lo que realmente se puede cumplir antes de cada visita.</div>'}</div>
  <div class="dgrid"><div class="panel"><h3>PPC · últimas 6 semanas</h3><div class="ppc">${hist.map(h=>`<div class="pcol" title="${h.w}"><i style="height:${h.p||0}%"></i><b>${h.p===null?'—':h.p+'%'}</b><small>${h.w.slice(5)}</small></div>`).join('')}</div></div>
  <div class="panel"><h3>Causas de incumplimiento</h3>${Object.entries(rs).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="hb"><span>${k}</span><div class="bar big4"><i style="width:${v/Math.max(...Object.values(rs))*100}%;background:var(--warn)"></i></div><b>${v}</b></div>`).join('')||'<div class="empty">Sin incumplimientos registrados.</div>'}</div></div>
  <div class="panel"><h3>Mirada adelante · próximas 3 semanas</h3>${look.map(w=>{const a=S.plan.filter(x=>x.week===w);return`<div class="hb2" style="grid-template-columns:110px 1fr 90px"><span>${w}</span><span>${a.map(x=>esc(x.text)).join(' · ')||'<span style="color:var(--mute)">—</span>'}</span><b>${a.filter(x=>x.constraint).length} restricc.</b></div>`}).join('')}</div>`;
};
EXT.act.plwk=el=>{const n=Number(el.dataset.id);EXT.wk=n===0?monday(today()):addDays(EXT.wk||monday(today()),n);render()};
EXT.act.pladd=el=>{if(!val('plt'))return toast('Escribe el compromiso.');S.plan.push({id:uid(),week:EXT.wk||monday(today()),text:val('plt'),room:val('plr'),tag:val('plg'),constraint:val('plc'),st:'planned',reason:''});save()};
EXT.act.pldel=el=>{S.plan=S.plan.filter(x=>x.id!==el.dataset.id);save()};

/* ====== cambios de campos (select / input) de los módulos ====== */
EXT.change=t=>{
  if(t.dataset.cxc){const[a,b]=t.dataset.cxc.split('|'),s=S.cx.find(x=>x.id===a),c=s.checks.find(x=>x.id===b);c.st=t.value;
    if(c.st==='fail'&&!s.issues.some(i=>i.open&&i.ref===c.id))s.issues.push({id:uid(),text:'Falla: '+c.text,sev:c.kind==='fun'?'high':'medium',open:true,ref:c.id});
    if(s.status==='commissioned'&&c.st!=='pass'&&c.st!=='na'){s.status='in_progress';s.at=''}
    cxAuto(s);save();return true}
  if(t.dataset.ncf){const[a,k]=t.dataset.ncf.split('|');S.ncr.find(x=>x.id===a)[k]=t.value;touch();return true}
  if(t.dataset.inr){const[a,k]=t.dataset.inr.split('|');S.insp.find(x=>x.id===a).items[k].a=t.value;touch();return true}
  if(t.dataset.pls){const x=S.plan.find(p=>p.id===t.dataset.pls);x.st=t.value;if(x.st!=='missed')x.reason='';save();return true}
  if(t.dataset.plr){S.plan.find(p=>p.id===t.dataset.plr).reason=t.value;touch();return true}
  return false;
};
EXT.tabs=[['cx','Puesta en marcha'],['insp','Inspecciones'],['ncr','No conformidades'],['punch','Observaciones'],['mat','Materiales'],['plan','Plan semanal']];

/* ====== informe: secciones de módulos ====== */
EXT.reportHtml=function(){
  let h='';
  if(S.cx.length)h+=`<br style="page-break-before:always"><h1>Puesta en marcha de sistemas</h1><table border="1" cellpadding="4"><tr><th>Sistema</th><th>Disciplina</th><th>Ubicación</th><th>Estado</th><th>Preparación</th><th>Incidencias abiertas</th></tr>${S.cx.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.type)}</td><td>${esc(s.loc)}</td><td>${CX_SYS[s.status]}</td><td>${readiness(s).pct}%</td><td>${s.issues.filter(i=>i.open).length}</td></tr>`).join('')}</table>`;
  if(S.insp.length)h+=`<h2>Inspecciones</h2><table border="1" cellpadding="4"><tr><th>Inspección</th><th>Espacio</th><th>Fecha</th><th>Resultado</th></tr>${S.insp.map(i=>`<tr><td>${esc(i.tpl)}</td><td>${esc(roomName(i.room))}</td><td>${i.date}</td><td>${INSP_ST[i.st]}</td></tr>`).join('')}</table>`;
  if(S.ncr.length)h+=`<h2>No conformidades</h2><table border="1" cellpadding="4"><tr><th>N.º</th><th>Título</th><th>Espacio</th><th>Severidad</th><th>Estado</th><th>Acción correctiva</th></tr>${S.ncr.map(n=>`<tr><td>${n.no}</td><td>${esc(n.title)}</td><td>${esc(roomName(n.room))}</td><td>${NCR_SEV.find(x=>x[0]===n.sev)[1]}</td><td>${NCR_ST[n.st]}</td><td>${esc(n.corrective)}</td></tr>`).join('')}</table>`;
  const st=stock();
  if(st.length)h+=`<h2>Materiales en obra</h2><table border="1" cellpadding="4"><tr><th>Material</th><th>Ingresó</th><th>Instalado</th><th>Perdido</th><th>Saldo</th></tr>${st.map(o=>`<tr><td>${esc(o.item)}</td><td>${o.in} ${esc(o.unit)}</td><td>${o.use}</td><td>${o.waste}</td><td>${Math.round(o.hand*100)/100}</td></tr>`).join('')}</table>`;
  if(S.plan.length)h+=`<h2>Cumplimiento del plan semanal</h2><p>PPC acumulado: ${ppc(S.plan)===null?'—':ppc(S.plan)+'%'}</p>`;
  return h;
};
