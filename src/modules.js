/* Módulos de proyecto: entrega de sistemas, pruebas e inspecciones, no conformidades,
   observaciones, materiales y plan semanal. Diseño y textos propios. */
const EXT={act:{},views:{},tabs:[],reportHtml:()=>'',migrate:s=>s};
const save=()=>{touch();render()};
const sel=(id,a,v)=>`<select id="${id}">${opts(a,v)}</select>`;
const field=(l,inner,w)=>`<div ${w?`style="width:${w}px"`:'style="flex:1;min-width:150px"'}><label>${l}</label>${inner}</div>`;
const emptyBox=(t,m)=>`<div class="empty"><h3>${t}</h3>${m}</div>`;
const roomOpts=()=>[['','— Proyecto general —'],...S.rooms.map(r=>[r.id,r.name])];
const roomName=id=>(S.rooms.find(r=>r.id===id)||{name:'General'}).name;
const nextTo=(flow,from)=>flow[from]||[];
const stBtns=(flow,labels,from,act,id)=>nextTo(flow,from).map(t=>`<button class="btn alt sm" data-act="${act}" data-id="${id}" data-to="${t}">${labels[t]}</button>`).join('');
const GRAV=[['leve','Leve'],['grave','Grave'],['critica','Crítica']];

/* ====== 1. ENTREGA DE SISTEMAS ======
   Cada red se prueba en dos etapas (antes de energizar o presurizar, y en operación)
   y solo se entrega cuando no queda nada pendiente ni fallido y no hay incidencias graves abiertas. */
const SYS_TYPES=['Eléctrica','Hidráulica','Sanitaria','Gas','Datos y CCTV','HVAC'];
const PROTOCOLO={
 'Eléctrica':{previa:['Tablero con circuitos rotulados y planilla de cargas al día','Conductores del calibre de planos y bornes bien ajustados','Aislamiento de cada circuito medido antes de energizar','Tierra conectada a la barra y a cada tomacorriente'],
  operacion:['Cada interruptor enciende solo la luminaria asignada','Todas las tomas con tensión y polaridad correctas','El diferencial dispara con su botón de prueba y se rearma','Circuitos cargados varias horas sin calentamiento anormal']},
 'Hidráulica':{previa:['Tubería presurizada sin caída de presión durante la prueba','Soportes y pendientes según plano, sin tramos colgantes','Llaves de paso instaladas y rotuladas por zona','Red lavada antes de conectar los aparatos'],
  operacion:['Caudal y presión adecuados con varios puntos abiertos','Agua caliente a temperatura en el punto más lejano','Sin goteo en uniones tras 24 horas','Las válvulas abren y cierran por completo']},
 'Sanitaria':{previa:['Pendiente continua en todos los tramos horizontales','Registros accesibles y libres de escombro','Ventilación conectada y sin obstrucciones'],
  operacion:['Prueba de llenado sin pérdida de nivel','Evacuación rápida, sin gorgoteo ni retorno','Los sifones conservan su sello de agua','Sin humedad ni olores tras uso repetido']},
 'Gas':{previa:['Tubería y accesorios homologados, con soportes adecuados','Prueba de hermeticidad aprobada y registrada','Ventilación permanente del recinto verificada'],
  operacion:['Sin fugas comprobado con detector o espuma','Válvula de corte y regulador funcionan','Llama azul y estable en cada artefacto']},
 'Datos y CCTV':{previa:['Cables rotulados en ambos extremos','Canalización separada de la de potencia','Salidas terminadas en el conector definido'],
  operacion:['Cada punto de datos verificado con probador','Las cámaras envían imagen al grabador','Ángulos y cobertura según el diseño']},
 'HVAC':{previa:['Equipo fijado con espacios de servicio libres','Tubería frigorífica o ducto sellado y aislado','Drenaje con pendiente y sifón'],
  operacion:['Alcanza la temperatura de consigna','Sin vibración ni ruido anormal','El drenaje evacua sin goteos','El control remoto responde en todas sus funciones']}};
const SYS_ST={sin_iniciar:'Sin iniciar',en_pruebas:'En pruebas',listo:'Listo para entregar',entregado:'Entregado'};
const RES=[['pendiente','Pendiente'],['ok','Cumple'],['falla','Falla'],['na','No aplica']];
const SEV_INC=[['baja','Baja'],['media','Media'],['alta','Alta']];
function estadoSistema(s){
  const ap=s.tests.filter(t=>t.res!=='na'),ok=ap.filter(t=>t.res==='ok').length;
  const pend=ap.filter(t=>t.res==='pendiente').length,fall=ap.filter(t=>t.res==='falla').length;
  const graves=s.inc.filter(i=>i.abierta&&i.sev==='alta').length;
  const op=ap.filter(t=>t.etapa==='operacion'),pr=ap.filter(t=>t.etapa==='previa');
  const f=a=>a.length?a.filter(t=>t.res==='ok').length/a.length:1;
  const avance=ap.length?Math.round((f(pr)*.4+f(op)*.6)*100):0;
  const motivos=[];
  if(!ap.length)motivos.push('El sistema no tiene pruebas aplicables.');
  if(pend)motivos.push(`${pend} prueba(s) pendiente(s).`);
  if(fall)motivos.push(`${fall} prueba(s) con falla.`);
  if(graves)motivos.push(`${graves} incidencia(s) grave(s) abierta(s).`);
  return{avance,ok,total:ap.length,motivos,puede:motivos.length===0,nivel:(fall||graves)?'red':motivos.length?'amber':'green'};
}
function recalcular(s){
  if(s.estado==='entregado')return;
  const hecho=s.tests.some(t=>t.res!=='pendiente');
  s.estado=!hecho?'sin_iniciar':estadoSistema(s).puede?'listo':'en_pruebas';
}
EXT.views.cx=function(){
  const L=S.cx;
  const stats=`<div class="stats"><div><b>${L.length}</b><span>Sistemas</span></div><div><b>${L.filter(s=>s.estado==='entregado').length}</b><span>Entregados</span></div><div><b>${L.filter(s=>estadoSistema(s).nivel==='red').length}</b><span>Con bloqueo</span></div><div><b>${L.reduce((a,s)=>a+s.inc.filter(i=>i.abierta).length,0)}</b><span>Incidencias abiertas</span></div></div>`;
  const form=`<div class="panel"><h3>Nuevo sistema</h3><div class="row f">${field('Disciplina',sel('sy_t',SYS_TYPES,'Eléctrica'),150)}${field('Nombre',`<input id="sy_n" placeholder="Ej. Tablero TD-2, segundo piso">`)}${field('Tag',`<input id="sy_g" placeholder="TD-2">`,110)}${field('Ubicación',`<input id="sy_l" placeholder="Pasillo, muro norte">`)}<button class="btn" data-act="syadd">Crear con su protocolo</button></div>
   <small style="color:var(--mute)">Cada sistema trae pruebas previas (antes de energizar o presurizar) y pruebas en operación. Se entrega cuando todas cumplen y no quedan incidencias graves.</small></div>`;
  const etiqueta=t=>`<label style="font:700 11px var(--body);letter-spacing:.04em;text-transform:uppercase;color:var(--mute)">${t}</label>`;
  const cards=L.map(s=>{const e=estadoSistema(s);return`<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><div><h3>${esc(s.name)}</h3><small style="color:var(--mute)">${esc(s.tipo)}${s.tag?' · '+esc(s.tag):''}${s.loc?' · '+esc(s.loc):''}</small></div>
    <div class="row" style="align-items:center"><span class="pill ${e.nivel==='green'?'terminado':e.nivel==='amber'?'proceso':''}" ${e.nivel==='red'?'style="background:var(--bad)"':''}>${SYS_ST[s.estado]}</span><div class="ring" style="--p:${e.avance}" data-l="${e.avance}"></div></div></div>
    ${[['previa','Pruebas previas'],['operacion','Pruebas en operación']].map(([k,t])=>`<div>${etiqueta(t)}${s.tests.filter(x=>x.etapa===k).map(x=>`<div class="item" style="padding:7px 0"><div class="it-h"><span style="flex:1;min-width:200px">${esc(x.txt)}</span><select class="mini" data-syt="${s.id}|${x.id}">${opts(RES,x.res)}</select></div></div>`).join('')}</div>`).join('')}
    <div>${etiqueta('Incidencias')}
     ${s.inc.map(i=>`<div class="item ${i.abierta?'':'done'}" style="padding:7px 0"><div class="it-h"><b style="flex:1;min-width:200px">${esc(i.txt)}</b><span class="tag sev-${i.sev==='alta'?'alta':i.sev==='media'?'media':'baja'}">${SEV_INC.find(x=>x[0]===i.sev)[1]}</span><button class="btn alt sm" data-act="syinc" data-id="${s.id}|${i.id}">${i.abierta?'Resolver':'Reabrir'}</button></div></div>`).join('')||'<div class="it-s">Sin incidencias.</div>'}
     <div class="row f" style="margin-top:6px">${field('Nueva incidencia',`<input id="sy_i-${s.id}" placeholder="Qué falló o falta">`)}${field('Gravedad',`<select id="sy_s-${s.id}">${opts(SEV_INC,'media')}</select>`,130)}<button class="btn alt sm" data-act="syaddinc" data-id="${s.id}">Añadir</button></div></div>
    <div class="row" style="align-items:center">${s.estado==='entregado'?`<span style="color:var(--ok);font-weight:600">Entregado el ${esc(s.fecha||'')}</span><button class="btn alt sm" data-act="syundo" data-id="${s.id}">Deshacer entrega</button>`:`<button class="btn sig" data-act="syentregar" data-id="${s.id}" ${e.puede?'':'disabled'}>Entregar sistema</button>${e.motivos.map(w=>`<span style="color:var(--warn);font-size:12px">${esc(w)}</span>`).join(' ')}`}<button class="ghost" data-act="sydel" data-id="${s.id}" style="margin-left:auto">Eliminar</button></div></div>`}).join('');
  return stats+form+(cards||emptyBox('Aún no hay sistemas','Crea el primero: tablero eléctrico, red de agua, desagües, gas, datos o A/A.'));
};
EXT.act.syadd=()=>{
  const t=val('sy_t'),n=val('sy_n');if(!n)return toast('Escribe el nombre del sistema.');
  const p=PROTOCOLO[t];
  S.cx.push({id:uid(),name:n,tipo:t,tag:val('sy_g'),loc:val('sy_l'),estado:'sin_iniciar',fecha:'',
    tests:[...p.previa.map(x=>({id:uid(),etapa:'previa',txt:x,res:'pendiente'})),...p.operacion.map(x=>({id:uid(),etapa:'operacion',txt:x,res:'pendiente'}))],inc:[]});
  save();
};
EXT.act.sydel=el=>{S.cx=S.cx.filter(s=>s.id!==el.dataset.id);save()};
EXT.act.syaddinc=el=>{const s=S.cx.find(x=>x.id===el.dataset.id),t=val('sy_i-'+s.id);if(!t)return toast('Describe la incidencia.');s.inc.push({id:uid(),txt:t,sev:val('sy_s-'+s.id),abierta:true});recalcular(s);save()};
EXT.act.syinc=el=>{const[a,b]=el.dataset.id.split('|'),s=S.cx.find(x=>x.id===a),i=s.inc.find(x=>x.id===b);i.abierta=!i.abierta;recalcular(s);save()};
EXT.act.syentregar=el=>{const s=S.cx.find(x=>x.id===el.dataset.id),e=estadoSistema(s);if(!e.puede)return toast(e.motivos[0]);s.estado='entregado';s.fecha=today();save()};
EXT.act.syundo=el=>{const s=S.cx.find(x=>x.id===el.dataset.id);s.estado='en_pruebas';s.fecha='';recalcular(s);save()};

/* ====== 2. NO CONFORMIDADES ====== */
const NC_ST={abierta:'Abierta',analizada:'Causa analizada',corregida:'Corregida',cerrada:'Cerrada',descartada:'Descartada'};
const NC_FLOW={abierta:['analizada','descartada'],analizada:['corregida','descartada'],corregida:['cerrada','analizada'],cerrada:[],descartada:['abierta']};
const NC_TIPO=['Material','Mano de obra','Diseño','Instalación MEP','Acabado'];
const NC_CAUSA=['Material defectuoso','Falta de supervisión','Error de diseño','Método de trabajo','Falta de coordinación','Otra'];
const ncAbierta=n=>!['cerrada','descartada'].includes(n.st);
EXT.views.ncr=function(){
  const L=S.ncr,ab=L.filter(ncAbierta);
  const form=`<div class="panel"><h3>Nueva no conformidad</h3><div class="row f">${field('Título',`<input id="nc_t" placeholder="Ej. Tubo de agua fuera del trazado">`)}${field('Tipo',sel('nc_y',NC_TIPO,'Instalación MEP'),160)}${field('Gravedad',sel('nc_g',GRAV,'grave'),120)}${field('Espacio',sel('nc_r',roomOpts()),160)}</div>
   <div class="row f">${field('Qué se encontró',`<input id="nc_d" placeholder="Descripción y ubicación">`)}<button class="btn" data-act="ncadd">Registrar</button></div></div>`;
  const cards=[...L].reverse().map(n=>`<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><div><h3>${n.no} · ${esc(n.title)}</h3><small style="color:var(--mute)">${esc(n.type)} · ${esc(roomName(n.room))} · ${n.date}</small></div><div class="row" style="align-items:center"><span class="tag sev-${n.grav==='critica'?'alta':n.grav==='grave'?'media':'baja'}">${GRAV.find(x=>x[0]===n.grav)[1]}</span><span class="pill ${n.st==='cerrada'?'terminado':n.st==='abierta'?'':'proceso'}">${NC_ST[n.st]}</span></div></div>
   <p style="margin:0">${esc(n.desc)}</p>
   <div class="cols f">${field('Causa',`<select data-ncf="${n.id}|causa">${opts([['','—'],...NC_CAUSA],n.causa)}</select>`)}${field('Corrección',`<input data-ncf="${n.id}|correccion" value="${esc(n.correccion)}" placeholder="Qué se hará para repararlo">`)}${field('Prevención',`<input data-ncf="${n.id}|prevencion" value="${esc(n.prevencion)}" placeholder="Cómo evitar que se repita">`)}${field('Responsable',`<input data-ncf="${n.id}|resp" value="${esc(n.resp)}">`)}${field('Fecha límite',`<input type="date" data-ncf="${n.id}|limite" value="${esc(n.limite)}">`)}${field('Costo',`<input data-ncf="${n.id}|costo" value="${esc(n.costo)}" placeholder="0">`)}${field('Días de atraso',`<input type="number" data-ncf="${n.id}|dias" value="${esc(n.dias)}">`)}</div>
   <div class="row">${stBtns(NC_FLOW,NC_ST,n.st,'ncgo',n.id)}</div></div>`).join('');
  return `<div class="stats"><div><b>${L.length}</b><span>Registradas</span></div><div><b>${ab.length}</b><span>Abiertas</span></div><div><b>${ab.filter(n=>n.grav==='critica').length}</b><span>Críticas abiertas</span></div><div><b>${L.filter(n=>n.st==='cerrada').length}</b><span>Cerradas</span></div></div>`+form+(cards||emptyBox('Sin no conformidades','Anota aquí lo que no cumple con el diseño o la norma, con su causa y su corrección.'));
};
const nuevaNC=o=>S.ncr.push({id:uid(),no:'NC-'+String(S.ncr.length+1).padStart(3,'0'),st:'abierta',date:today(),causa:'',correccion:'',prevencion:'',resp:'',limite:'',costo:'',dias:'',...o});
EXT.act.ncadd=()=>{const t=val('nc_t');if(!t)return toast('Escribe el título.');nuevaNC({title:t,desc:val('nc_d'),type:val('nc_y'),grav:val('nc_g'),room:val('nc_r')});save()};
EXT.act.ncgo=el=>{const n=S.ncr.find(x=>x.id===el.dataset.id),to=el.dataset.to;if(!NC_FLOW[n.st].includes(to))return;
  if(to==='corregida'&&!n.correccion)return toast('Anota primero la corrección que se aplicó.');
  if(to==='cerrada'&&!n.prevencion)return toast('Para cerrar, anota cómo se evitará que se repita.');
  n.st=to;save()};

/* ====== 3. OBSERVACIONES (pendientes con revisión) ====== */
const OB_ST={pendiente:'Pendiente',corrigiendo:'En corrección',por_revisar:'Por revisar',aprobada:'Aprobada'};
const OB_FLOW={pendiente:['corrigiendo'],corrigiendo:['por_revisar','pendiente'],por_revisar:['aprobada','corrigiendo'],aprobada:['pendiente']};
const OB_BTN={pendiente:'Reabrir',corrigiendo:'Empezar corrección',por_revisar:'Enviar a revisión',aprobada:'Aprobar'};
const openP=x=>x.st!=='aprobada';
function punchRow(x,roomId){
  const botones=nextTo(OB_FLOW,x.st).map(t=>{
    const rechazo=x.st==='por_revisar'&&t==='corrigiendo',reabrir=x.st==='aprobada'&&t==='pendiente';
    const txt=rechazo?'Rechazar':reabrir?'Reabrir':t==='pendiente'?'Devolver':OB_BTN[t];
    return `<button class="btn alt sm" data-act="obgo" data-id="${roomId}|${x.id}" data-to="${t}">${txt}</button>`}).join('');
  return `<div class="item ${openP(x)?'':'done'}"><div class="it-h"><b style="flex:1;min-width:180px">${esc(x.text)}</b><span class="tag">${esc(x.tag)}</span><span class="tag sev-${x.sev}">${x.sev}</span><span class="pill ${x.st==='aprobada'?'terminado':x.st==='pendiente'?'':'proceso'}">${OB_ST[x.st]}</span><button class="ghost" data-act="obdel" data-id="${roomId}|${x.id}">✕</button></div>
   <div class="it-s">${esc(roomName(roomId))}${x.rechazos?` · rechazada ${x.rechazos} vez/veces`:''}${x.reab?` · reabierta ${x.reab} vez/veces`:''}</div>
   ${(x.photos||[]).length?`<div class="grid sm">${phHtml(x.photos)}</div>`:''}<div class="row">${botones}</div></div>`;
}
EXT.punchRow=punchRow;
EXT.views.punch=function(){
  const A=allPunch(),f=EXT.pf||'abiertas';
  const mostrar=A.filter(x=>f==='todas'||(f==='abiertas'?openP(x):!openP(x))).sort((a,b)=>SEV.indexOf(a.sev)-SEV.indexOf(b.sev));
  const on=c=>c?'style="border-color:var(--signal);color:var(--signal)"':'';
  return `<div class="stats"><div><b>${A.length}</b><span>Total</span></div><div><b>${A.filter(openP).length}</b><span>Abiertas</span></div><div><b>${A.filter(x=>x.st==='por_revisar').length}</b><span>Por revisar</span></div><div><b>${A.filter(x=>x.rechazos||x.reab).length}</b><span>Con retrabajo</span></div></div>
  <div class="panel"><div class="chips" style="margin:0;justify-content:flex-start"><button data-act="obf" data-id="abiertas" ${on(f==='abiertas')}>Abiertas</button><button data-act="obf" data-id="aprobadas" ${on(f==='aprobadas')}>Aprobadas</button><button data-act="obf" data-id="todas" ${on(f==='todas')}>Todas</button></div>
  ${mostrar.map(x=>punchRow(x,x.room.id)).join('')||'<div class="empty">Nada en esta vista. Registra observaciones desde la pestaña Observaciones de cada lámina.</div>'}</div>`;
};
EXT.act.obf=el=>{EXT.pf=el.dataset.id;render()};
const buscarOb=s=>{const[r,i]=s.split('|'),R=S.rooms.find(x=>x.id===r);return[R,R.punch.find(x=>x.id===i)]};
EXT.act.obgo=el=>{const[R,x]=buscarOb(el.dataset.id),to=el.dataset.to;if(!OB_FLOW[x.st].includes(to))return;
  if(x.st==='por_revisar'&&to==='corrigiendo')x.rechazos=(x.rechazos||0)+1;
  if(x.st==='aprobada'&&to==='pendiente')x.reab=(x.reab||0)+1;
  x.st=to;save()};
EXT.act.obdel=el=>{const[R,x]=buscarOb(el.dataset.id);R.punch=R.punch.filter(p=>p!==x);save()};

/* ====== 4. PRUEBAS E INSPECCIONES ====== */
const PLANTILLAS={
 'Presión de agua':[['Presión aplicada (bar)','num'],['Tiempo de prueba (h)','num'],['La presión se mantiene','sn'],['Uniones secas','sn']],
 'Aislamiento y tierra':[['Resistencia de aislamiento (MΩ)','num'],['Tierra continua en todas las tomas','sn'],['Polaridad verificada','sn'],['Protecciones coinciden con la planilla','sn']],
 'Desagües':[['Llenado sin pérdida','sn'],['Pendiente continua','sn'],['Sellos de sifón intactos','sn'],['Notas','txt']],
 'Hermeticidad de gas':[['Presión de prueba (bar)','num'],['Sin caída de presión en el tiempo fijado','sn'],['Sin fugas con espuma o detector','sn']],
 'Recepción de piso':[['Desnivel máximo (mm en 2 m)','num'],['Caída hacia el desagüe','sn'],['Piezas sin fisuras ni sonido hueco','sn'],['Juntas parejas','sn']],
 'Recepción de pintura':[['Superficie bien preparada','sn'],['Color parejo','sn'],['Sin chorreos ni marcas','sn'],['Valoración general (1-5)','num']],
 'Impermeabilización':[['Prueba de inundación 24 h sin pérdida','sn'],['Remates continuos','sn'],['Notas','txt']]};
EXT.views.insp=function(){
  const L=S.insp;
  const form=`<div class="panel"><h3>Programar prueba o inspección</h3><div class="row f">${field('Tipo',sel('in_t',Object.keys(PLANTILLAS)),220)}${field('Espacio',sel('in_r',roomOpts()),170)}${field('Fecha',`<input type="date" id="in_d" value="${today()}">`,150)}<button class="btn" data-act="inadd">Programar</button></div></div>`;
  const cards=[...L].reverse().map(n=>{const hecho=n.st==='realizada';return`<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><div><h3>${esc(n.tpl)}</h3><small style="color:var(--mute)">${esc(roomName(n.room))} · ${n.date}</small></div><span class="pill ${n.res==='aprobada'?'terminado':n.res==='rechazada'?'':'proceso'}" ${n.res==='rechazada'?'style="background:var(--bad)"':''}>${hecho?(n.res==='aprobada'?'Aprobada':'Rechazada'):'Programada'}</span></div>
   ${n.items.map((it,k)=>`<div class="item" style="padding:7px 0"><div class="it-h"><span style="flex:1;min-width:200px">${esc(it.q)}</span>${
     it.t==='sn'?`<select class="mini" data-inr="${n.id}|${k}" ${hecho?'disabled':''}>${opts([['','—'],['si','Cumple'],['no','No cumple']],it.a)}</select>`:
     `<input style="width:${it.t==='txt'?240:100}px" data-inr="${n.id}|${k}" value="${esc(it.a)}" ${it.t==='num'?'type="number" step="any"':''} ${hecho?'disabled':''}>`}</div></div>`).join('')}
   <div class="row">${hecho?'':`<button class="btn sig sm" data-act="inreg" data-id="${n.id}">Registrar resultado</button>`}${n.res==='rechazada'?`<button class="btn alt sm" data-act="inrep" data-id="${n.id}">Reprogramar</button><button class="btn alt sm" data-act="inncr" data-id="${n.id}">Abrir no conformidad</button>`:''}<button class="ghost" data-act="indel" data-id="${n.id}" style="margin-left:auto">Eliminar</button></div></div>`}).join('');
  return `<div class="stats"><div><b>${L.length}</b><span>Pruebas</span></div><div><b>${L.filter(i=>i.st!=='realizada').length}</b><span>Por realizar</span></div><div><b>${L.filter(i=>i.res==='aprobada').length}</b><span>Aprobadas</span></div><div><b>${L.filter(i=>i.res==='rechazada').length}</b><span>Rechazadas</span></div></div>`+form+(cards||emptyBox('Sin pruebas programadas','Programa presión de agua, aislamiento eléctrico, desagües, gas, pisos o pintura y anota el resultado de cada punto.'));
};
EXT.act.inadd=()=>{const t=val('in_t');S.insp.push({id:uid(),tpl:t,room:val('in_r'),date:val('in_d')||today(),st:'programada',res:'',items:PLANTILLAS[t].map(([q,ty])=>({q,t:ty,a:''}))});save()};
EXT.act.inreg=el=>{const n=S.insp.find(x=>x.id===el.dataset.id),sn=n.items.filter(i=>i.t==='sn');
  if(sn.some(i=>!i.a))return toast('Responde todos los puntos de cumple o no cumple.');
  n.res=sn.some(i=>i.a==='no')?'rechazada':'aprobada';n.st='realizada';save()};
EXT.act.inrep=el=>{const n=S.insp.find(x=>x.id===el.dataset.id);n.st='programada';n.res='';n.items.forEach(i=>i.a='');save()};
EXT.act.indel=el=>{S.insp=S.insp.filter(x=>x.id!==el.dataset.id);save()};
EXT.act.inncr=el=>{const n=S.insp.find(x=>x.id===el.dataset.id);
  nuevaNC({title:'Prueba rechazada: '+n.tpl,desc:n.items.filter(i=>i.a==='no').map(i=>i.q).join('; '),type:'Instalación MEP',grav:'grave',room:n.room,origen:n.id});
  jtab='ncr';save()};

/* ====== 5. MATERIALES EN OBRA ====== */
const MOV=[['in','Ingreso a obra'],['use','Consumo (instalado)'],['waste','Desperdicio o pérdida']];
function saldos(){
  const m={};
  S.mat.forEach(x=>{const k=x.item.trim().toLowerCase()+'|'+x.unit;const o=m[k]=m[k]||{item:x.item,unit:x.unit,in:0,use:0,waste:0,costo:0};const q=Number(x.qty)||0;o[x.type]+=q;if(x.type==='in')o.costo+=q*(Number(x.price)||0)});
  return Object.values(m).map(o=>({...o,saldo:o.in-o.use-o.waste,merma:o.in?o.waste/o.in*100:null}));
}
EXT.views.mat=function(){
  const st=saldos(),costo=st.reduce((a,o)=>a+o.costo,0),mermas=st.filter(o=>o.merma!==null).map(o=>o.merma);
  const form=`<div class="panel"><h3>Movimiento de material</h3><div class="row f">${field('Tipo',sel('mv_t',MOV,'in'),170)}${field('Material',`<input id="mv_i" list="mv_l" placeholder="Ej. Tubería PVC 1/2&quot;"><datalist id="mv_l">${[...new Set(S.mat.map(x=>x.item))].map(i=>`<option value="${esc(i)}">`).join('')}</datalist>`)}${field('Cantidad',`<input id="mv_q" type="number" step="any" min="0">`,90)}${field('Unidad',`<input id="mv_u" value="und">`,80)}${field('Costo unit.',`<input id="mv_p" type="number" step="any" min="0" placeholder="opcional">`,110)}${field('Espacio',sel('mv_r',roomOpts()),150)}${field('Fecha',`<input id="mv_d" type="date" value="${today()}">`,140)}<button class="btn" data-act="mvadd">Registrar</button></div></div>`;
  return `<div class="stats"><div><b>${st.length}</b><span>Materiales</span></div><div><b>${st.filter(o=>o.saldo<0).length}</b><span>Saldo negativo</span></div><div><b>${mermas.length?Math.round(avg(mermas))+'%':'—'}</b><span>Desperdicio medio</span></div><div><b>${Math.round(costo).toLocaleString('es')}</b><span>Costo de ingresos</span></div></div>`+form+
  `<div class="panel"><h3>Saldo en obra</h3>${st.length?`<div class="tw"><table><tr><th>Material</th><th>Ingresó</th><th>Instalado</th><th>Perdido</th><th>Saldo</th><th>Desperdicio</th></tr>${st.map(o=>`<tr><td><b>${esc(o.item)}</b></td><td>${o.in} ${esc(o.unit)}</td><td>${o.use}</td><td>${o.waste}</td><td style="font-weight:700;color:${o.saldo<0?'var(--bad)':'inherit'}">${Math.round(o.saldo*100)/100} ${esc(o.unit)}</td><td style="color:${o.merma>10?'var(--bad)':'inherit'}">${o.merma===null?'—':Math.round(o.merma)+'%'}</td></tr>`).join('')}</table></div>`:'<div class="empty">Registra lo que llega a obra y lo que se instala; el saldo se calcula solo.</div>'}</div>`+
  (S.mat.length?`<div class="panel"><h3>Movimientos</h3>${[...S.mat].reverse().slice(0,30).map(x=>`<div class="hb"><span>${esc(x.item)} · ${x.qty} ${esc(x.unit)}</span><span class="tag">${MOV.find(m=>m[0]===x.type)[1]}</span><b class="mono">${x.date} · ${esc(roomName(x.room))} <button class="ghost" data-act="mvdel" data-id="${x.id}">✕</button></b></div>`).join('')}</div>`:'');
};
EXT.act.mvadd=()=>{if(!val('mv_i')||!(Number(val('mv_q'))>0))return toast('Indica el material y una cantidad mayor que cero.');S.mat.push({id:uid(),type:val('mv_t'),item:val('mv_i'),qty:Number(val('mv_q')),unit:val('mv_u')||'und',price:val('mv_p'),room:val('mv_r'),date:val('mv_d')||today()});save()};
EXT.act.mvdel=el=>{S.mat=S.mat.filter(x=>x.id!==el.dataset.id);save()};

/* ====== 6. PLAN SEMANAL (porcentaje de plan cumplido) ====== */
const CAUSAS=['Material','Mano de obra','Diseño o cambio','Clima','Actividad previa sin terminar','Otra'];
const PL_ST=[['planned','Comprometida'],['done','Cumplida'],['missed','No cumplida']];
const monday=d=>{const x=new Date(d+'T12:00');x.setDate(x.getDate()-((x.getDay()+6)%7));return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`};
const addDays=(d,n)=>{const x=new Date(d+'T12:00');x.setDate(x.getDate()+n);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`};
const ppc=a=>{const c=a.filter(x=>x.st!=='planned');return c.length?Math.round(c.filter(x=>x.st==='done').length/c.length*100):null};
EXT.views.plan=function(){
  const wk=EXT.wk||monday(today()),items=S.plan.filter(x=>x.week===wk);
  const hist=[5,4,3,2,1,0].map(k=>{const w=addDays(monday(today()),-7*k);return{w,p:ppc(S.plan.filter(x=>x.week===w))}});
  const prox=[1,2,3].map(k=>addDays(wk,7*k));
  const causas={};S.plan.filter(x=>x.st==='missed').forEach(x=>{const c=x.reason||'Otra';causas[c]=(causas[c]||0)+1});
  return `<div class="stats"><div><b>${ppc(items)===null?'—':ppc(items)+'%'}</b><span>Cumplimiento de la semana</span></div><div><b>${items.length}</b><span>Compromisos</span></div><div><b>${S.plan.filter(x=>x.constraint&&x.st==='planned').length}</b><span>Restricciones abiertas</span></div><div><b>${ppc(S.plan)===null?'—':ppc(S.plan)+'%'}</b><span>Cumplimiento acumulado</span></div></div>
  <div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h3>Semana del ${wk}</h3><div class="row"><button class="btn alt sm" data-act="plwk" data-id="-7">← Anterior</button><button class="btn alt sm" data-act="plwk" data-id="0">Esta semana</button><button class="btn alt sm" data-act="plwk" data-id="7">Siguiente →</button></div></div>
   <div class="row f">${field('Compromiso',`<input id="pl_t" placeholder="Ej. Tender la tubería de agua fría del baño">`)}${field('Espacio',sel('pl_r',roomOpts()),150)}${field('Disciplina',sel('pl_g',TAGS,'Hidráulica'),140)}${field('Restricción',`<input id="pl_c" placeholder="Qué impide empezar (opcional)">`)}<button class="btn" data-act="pladd">Comprometer</button></div>
   ${items.map(x=>`<div class="item"><div class="it-h"><b style="flex:1;min-width:200px">${esc(x.text)}</b><span class="tag">${esc(x.tag)}</span><span class="it-s">${esc(roomName(x.room))}</span><select class="mini" data-pls="${x.id}">${opts(PL_ST,x.st)}</select><button class="ghost" data-act="pldel" data-id="${x.id}">✕</button></div>
    ${x.constraint?`<div class="it-s" style="color:var(--warn)">Restricción: ${esc(x.constraint)}</div>`:''}${x.st==='missed'?`<div class="row f">${field('Por qué no se cumplió',`<select data-plr="${x.id}">${opts([['','— elegir —'],...CAUSAS],x.reason)}</select>`,260)}</div>`:''}</div>`).join('')||'<div class="empty">Sin compromisos esta semana. Planifica solo lo que de verdad se puede cumplir antes de cada visita.</div>'}</div>
  <div class="dgrid"><div class="panel"><h3>Cumplimiento · últimas 6 semanas</h3><div class="ppc">${hist.map(h=>`<div class="pcol" title="${h.w}"><i style="height:${h.p||0}%"></i><b>${h.p===null?'—':h.p+'%'}</b><small>${h.w.slice(5)}</small></div>`).join('')}</div></div>
  <div class="panel"><h3>Por qué no se cumple</h3>${Object.entries(causas).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="hb"><span>${k}</span><div class="bar big4"><i style="width:${v/Math.max(...Object.values(causas))*100}%;background:var(--warn)"></i></div><b>${v}</b></div>`).join('')||'<div class="empty">Sin incumplimientos registrados.</div>'}</div></div>
  <div class="panel"><h3>Próximas 3 semanas</h3>${prox.map(w=>{const a=S.plan.filter(x=>x.week===w);return`<div class="hb2" style="grid-template-columns:110px 1fr 100px"><span>${w}</span><span>${a.map(x=>esc(x.text)).join(' · ')||'<span style="color:var(--mute)">—</span>'}</span><b>${a.filter(x=>x.constraint).length} restricc.</b></div>`}).join('')}</div>`;
};
EXT.act.plwk=el=>{const n=Number(el.dataset.id);EXT.wk=n===0?monday(today()):addDays(EXT.wk||monday(today()),n);render()};
EXT.act.pladd=()=>{if(!val('pl_t'))return toast('Escribe el compromiso.');S.plan.push({id:uid(),week:EXT.wk||monday(today()),text:val('pl_t'),room:val('pl_r'),tag:val('pl_g'),constraint:val('pl_c'),st:'planned',reason:''});save()};
EXT.act.pldel=el=>{S.plan=S.plan.filter(x=>x.id!==el.dataset.id);save()};

/* ====== cambios de campos ====== */
EXT.change=t=>{
  if(t.dataset.syt){const[a,b]=t.dataset.syt.split('|'),s=S.cx.find(x=>x.id===a),p=s.tests.find(x=>x.id===b);p.res=t.value;
    if(p.res==='falla'&&!s.inc.some(i=>i.abierta&&i.ref===p.id))s.inc.push({id:uid(),txt:'Falla: '+p.txt,sev:p.etapa==='operacion'?'alta':'media',abierta:true,ref:p.id});
    if(s.estado==='entregado'&&p.res!=='ok'&&p.res!=='na'){s.estado='en_pruebas';s.fecha=''}
    recalcular(s);save();return true}
  if(t.dataset.ncf){const[a,k]=t.dataset.ncf.split('|');S.ncr.find(x=>x.id===a)[k]=t.value;touch();return true}
  if(t.dataset.inr){const[a,k]=t.dataset.inr.split('|');S.insp.find(x=>x.id===a).items[k].a=t.value;touch();return true}
  if(t.dataset.pls){const x=S.plan.find(p=>p.id===t.dataset.pls);x.st=t.value;if(x.st!=='missed')x.reason='';save();return true}
  if(t.dataset.plr){S.plan.find(p=>p.id===t.dataset.plr).reason=t.value;touch();return true}
  return false;
};
EXT.tabs=[['cx','Entrega de sistemas'],['insp','Pruebas e inspecciones'],['ncr','No conformidades'],['punch','Observaciones'],['mat','Materiales'],['plan','Plan semanal']];

/* Convierte datos guardados con versiones anteriores */
EXT.migrate=s=>{
  const m1={not_started:'sin_iniciar',in_progress:'en_pruebas',tests_complete:'listo',commissioned:'entregado'};
  s.cx=(s.cx||[]).map(x=>x.tests?x:({id:x.id,name:x.name,tipo:x.type,tag:x.tag,loc:x.loc,estado:m1[x.status]||'sin_iniciar',fecha:x.at||'',
    tests:(x.checks||[]).map(c=>({id:c.id,etapa:c.kind==='fun'?'operacion':'previa',txt:c.text,res:({pending:'pendiente',pass:'ok',fail:'falla',na:'na'})[c.st]||'pendiente'})),
    inc:(x.issues||[]).map(i=>({id:i.id,txt:i.text,sev:i.sev==='critical'||i.sev==='high'?'alta':i.sev==='medium'?'media':'baja',abierta:i.open,ref:i.ref}))}));
  const m2={identified:'abierta',under_review:'analizada',corrective_action:'analizada',verification:'corregida',closed:'cerrada',void:'descartada'};
  s.ncr=(s.ncr||[]).map(n=>n.grav?n:({...n,no:(n.no||'').replace('NCR','NC'),st:m2[n.st]||'abierta',grav:({minor:'leve',major:'grave',critical:'critica'})[n.sev]||'grave',causa:n.cause||'',correccion:n.corrective||'',prevencion:n.preventive||'',resp:'',limite:'',costo:n.cost||'',dias:n.days||''}));
  const m3={open:'pendiente',assigned:'pendiente',in_progress:'corrigiendo',resolved:'por_revisar',verified:'aprobada',closed:'aprobada'};
  s.rooms.forEach(r=>r.punch.forEach(x=>{if(m3[x.st])x.st=m3[x.st];if(x.reopened&&!x.reab){x.reab=x.reopened}}));
  const m4={scheduled:'programada',in_progress:'programada',completed:'realizada',failed:'realizada',cancelled:'programada'};
  s.insp=(s.insp||[]).map(i=>i.res!==undefined?i:({...i,st:m4[i.st]||'programada',res:i.st==='completed'?'aprobada':i.st==='failed'?'rechazada':'',
    items:(i.items||[]).map(it=>({...it,t:({pass_fail:'sn',numeric:'num',text:'txt',rating:'num'})[it.t]||it.t,a:it.a==='pass'?'si':it.a==='fail'?'no':it.a}))}));
  return s;
};

/* ====== informe ====== */
EXT.reportHtml=function(){
  let h='';
  if(S.cx.length)h+=`<br style="page-break-before:always"><h1>Entrega de sistemas</h1><table border="1" cellpadding="4"><tr><th>Sistema</th><th>Disciplina</th><th>Ubicación</th><th>Estado</th><th>Avance de pruebas</th><th>Incidencias abiertas</th></tr>${S.cx.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.tipo)}</td><td>${esc(s.loc)}</td><td>${SYS_ST[s.estado]}</td><td>${estadoSistema(s).avance}%</td><td>${s.inc.filter(i=>i.abierta).length}</td></tr>`).join('')}</table>`;
  if(S.insp.length)h+=`<h2>Pruebas e inspecciones</h2><table border="1" cellpadding="4"><tr><th>Prueba</th><th>Espacio</th><th>Fecha</th><th>Resultado</th></tr>${S.insp.map(i=>`<tr><td>${esc(i.tpl)}</td><td>${esc(roomName(i.room))}</td><td>${i.date}</td><td>${i.st==='realizada'?(i.res==='aprobada'?'Aprobada':'Rechazada'):'Programada'}</td></tr>`).join('')}</table>`;
  if(S.ncr.length)h+=`<h2>No conformidades</h2><table border="1" cellpadding="4"><tr><th>N.º</th><th>Título</th><th>Espacio</th><th>Gravedad</th><th>Estado</th><th>Corrección</th></tr>${S.ncr.map(n=>`<tr><td>${n.no}</td><td>${esc(n.title)}</td><td>${esc(roomName(n.room))}</td><td>${GRAV.find(x=>x[0]===n.grav)[1]}</td><td>${NC_ST[n.st]}</td><td>${esc(n.correccion)}</td></tr>`).join('')}</table>`;
  const sd=saldos();
  if(sd.length)h+=`<h2>Materiales en obra</h2><table border="1" cellpadding="4"><tr><th>Material</th><th>Ingresó</th><th>Instalado</th><th>Perdido</th><th>Saldo</th></tr>${sd.map(o=>`<tr><td>${esc(o.item)}</td><td>${o.in} ${esc(o.unit)}</td><td>${o.use}</td><td>${o.waste}</td><td>${Math.round(o.saldo*100)/100}</td></tr>`).join('')}</table>`;
  if(S.plan.length)h+=`<h2>Cumplimiento del plan semanal</h2><p>Acumulado: ${ppc(S.plan)===null?'—':ppc(S.plan)+'%'}</p>`;
  return h;
};
