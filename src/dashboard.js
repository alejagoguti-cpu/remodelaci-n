/* Estructura general (barra lateral, buscador) y dashboard de inicio */
const IC={
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 mep:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
 acabados:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
 cx:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 insp:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="m9 14 2 2 4-4"/>',
 ncr:'<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/>',
 punch:'<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
 mat:'<path d="m3 7 9-4 9 4v10l-9 4-9-4z"/><path d="m3 7 9 4 9-4M12 11v10"/>',
 plan:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
 visitas:'<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="14" r="3.5"/>',
 galeria:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 17-5-5-9 8"/>',
 proyecto:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
 room:'<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 down:'<path d="m6 9 6 6 6-6"/>'
};
const icon=(k,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;
const NAV=[['resumen','Dashboard','dashboard'],['mep','Redes MEP','mep'],['acabados','Acabados','acabados'],['cx','Puesta en marcha','cx'],['insp','Inspecciones','insp'],['ncr','No conformidades','ncr'],['punch','Observaciones','punch'],['mat','Materiales','mat'],['plan','Plan semanal','plan'],['visitas','Visitas','visitas'],['galeria','Galería','galeria'],['proyecto','Proyecto','proyecto']];

function shell(inner){
  const dow=new Date().getDay(),tds=today(),doneToday=S.rooms.filter(r=>r.visits.some(v=>v.date===tds)).length;
  return `<div class="shell">
  <aside class="side">
   <div class="logo"><span class="mark">${icon('room',22)}</span><div><b>Bitácora</b><small>de obra</small></div></div>
   <nav class="navs">
    ${NAV.map(([k,l,i])=>`<button class="nv ${view==='joint'&&jtab===k?'on':''}" data-act="jtab" data-v="${k}">${icon(i)}<span>${l}</span></button>`).join('')}
    <h6>Láminas · ${S.rooms.length}</h6>
    ${S.rooms.map((r,i)=>`<button class="nv rm ${view===r.id?'on':''}" data-act="go" data-id="${r.id}"><em>L-${pad(i+1)}</em><span>${esc(r.name)}</span><i class="dot ${r.status}"></i></button>`).join('')}
    <form class="addf" id="addf"><input id="newname" placeholder="＋ Nueva habitación" autocomplete="off"></form>
   </nav>
   <div class="side-foot">${VISIT.includes(dow)?`<b>Hoy es día de obra</b><br>${doneToday} de ${S.rooms.length} espacios con registro<br>`:''}
    ${BACKEND==='local'?'Modo local: datos solo en este navegador':`<a href="https://drive.google.com/drive/folders/${F.root||''}" target="_blank" rel="noopener">Abrir carpeta en Drive ↗</a>`}</div>
  </aside>
  <div class="content">
   <header class="topbar">
    <div class="search">${icon('search',18)}<input id="gsearch" placeholder="Buscar habitaciones, puntos MEP, acabados, observaciones…" autocomplete="off"><div id="sres" class="sres" hidden></div></div>
    <div class="week" title="Días de visita: lunes, miércoles y sábado">${[1,2,3,4,5,6,0].map(d=>`<b class="${VISIT.includes(d)?'v':''} ${d===dow?'t':''}">${WD[d]}</b>`).join('')}</div>
    <div class="sync" id="sync"><i></i><span></span></div>
   </header>
   <main class="main" id="main"><div class="wrap">${inner}</div></main>
  </div></div>`;
}

/* ---------- buscador global ---------- */
function searchAll(q){
  q=q.trim().toLowerCase();if(q.length<2)return[];
  const has=(...a)=>a.some(x=>String(x||'').toLowerCase().includes(q)),out=[];
  S.rooms.forEach(r=>{
    if(has(r.name))out.push({t:'Espacio',l:r.name,go:`room|${r.id}|registro`});
    r.mep.forEach(i=>{if(has(i.kind,i.loc,i.tag,i.disc))out.push({t:'MEP',l:`${i.kind} · ${i.loc||'sin ubicación'} · ${r.name}`,go:`room|${r.id}|mep`})});
    r.fin.forEach(i=>{if(has(i.el,i.mat,i.ref))out.push({t:'Acabado',l:`${i.el}: ${i.mat} · ${r.name}`,go:`room|${r.id}|acabados`})});
    r.punch.forEach(i=>{if(has(i.text))out.push({t:'Observación',l:`${i.text} · ${r.name}`,go:`room|${r.id}|observ`})});
    r.visits.forEach(v=>{if(has(v.note))out.push({t:'Visita',l:`${v.date} · ${v.note} · ${r.name}`,go:`room|${r.id}|registro`})});
  });
  S.ncr.forEach(n=>{if(has(n.title,n.no,n.desc))out.push({t:'NCR',l:`${n.no} · ${n.title}`,go:'joint|ncr'})});
  S.cx.forEach(c=>{if(has(c.name,c.tag))out.push({t:'Sistema',l:c.name,go:'joint|cx'})});
  S.mat.forEach(m=>{if(has(m.item))out.push({t:'Material',l:m.item,go:'joint|mat'})});
  return out.slice(0,9);
}
document.addEventListener('input',ev=>{
  if(ev.target.id!=='gsearch')return;
  const box=document.getElementById('sres'),res=searchAll(ev.target.value);
  box.hidden=!ev.target.value.trim();
  box.innerHTML=res.length?res.map(x=>`<button data-act="sgo" data-v="${esc(x.go)}"><b>${x.t}</b><span>${esc(x.l)}</span></button>`).join(''):'<div class="none">Sin resultados</div>';
});
document.addEventListener('click',ev=>{if(!ev.target.closest('.search')){const b=document.getElementById('sres');if(b)b.hidden=true}});
EXT.act.sgo=el=>{
  const p=el.dataset.v.split('|');
  if(p[0]==='room'){tab=p[2];go(p[1])}else{jtab=p[1];view='joint';render()}
};

/* ---------- gráficos ---------- */
function niceMax(v){if(v<=4)return 4;const p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p;return(n<=2?2:n<=5?5:10)*p}
function lineChart(labels,series){
  const W=640,H=250,L=34,R=12,T=14,B=30,max=niceMax(Math.max(1,...series.flatMap(s=>s.data))),iw=W-L-R,ih=H-T-B;
  const x=i=>L+(labels.length<2?iw/2:i*iw/(labels.length-1)),y=v=>T+ih-(v/max)*ih;
  const ticks=[0,1,2,3,4].map(k=>Math.round(max*k/4*10)/10);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Actividad semanal">
   ${ticks.map(t=>`<line x1="${L}" x2="${W-R}" y1="${y(t)}" y2="${y(t)}" class="gl"/><text x="${L-8}" y="${y(t)+4}" class="ax" text-anchor="end">${t}</text>`).join('')}
   ${labels.map((l,i)=>`<text x="${x(i)}" y="${H-8}" class="ax" text-anchor="middle">${l}</text>`).join('')}
   ${series.map(s=>`<path d="${s.data.map((v,i)=>(i?'L':'M')+x(i)+' '+y(v)).join(' ')} L${x(s.data.length-1)} ${y(0)} L${x(0)} ${y(0)}Z" fill="${s.color}" opacity=".07"/>
    <path d="${s.data.map((v,i)=>(i?'L':'M')+x(i)+' '+y(v)).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${s.data.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="${i===s.data.length-1?5:3}" fill="${i===s.data.length-1?s.color:'var(--sheet)'}" stroke="${s.color}" stroke-width="2"><title>${s.name} · ${labels[i]}: ${v}</title></circle>`).join('')}`).join('')}
  </svg>`;
}
function donut(parts,center,sub){
  const n=parts.reduce((a,p)=>a+p.v,0);let acc=0;
  const grad=n?parts.filter(p=>p.v).map(p=>{const a=acc/n*100;acc+=p.v;return`${p.c} ${a}% ${acc/n*100}%`}).join(','):'var(--rule) 0 100%';
  return `<div class="dn"><div class="donut2" style="background:conic-gradient(${grad})"><div><b>${center}</b><small>${sub}</small></div></div>
   <div class="lgd">${parts.map(p=>`<div><i style="background:${p.c}"></i><span>${p.l}</span><b>${p.v}</b></div>`).join('')}</div></div>`;
}

/* ---------- dashboard de inicio ---------- */
function weekStarts(n){const m=monday(today());return Array.from({length:n},(_,k)=>addDays(m,-7*(n-1-k)))}
function dashHome(){
  const t=total(),M=allMep(),A=allFin(),P=allPunch(),openPu=P.filter(openP);
  const wk=addDays(today(),-7),recent=d=>d&&d>=wk;
  const tot=M.reduce((a,i)=>a+Math.max(1,qtyOf(i)),0),tested=M.filter(i=>i.st==='probado'||i.st==='cerrado').reduce((a,i)=>a+Math.max(1,qtyOf(i)),0);
  const buy=A.filter(i=>i.st==='por comprar').length;
  const pill=(n,txt)=>`<span class="dl ${n>0?'up':'flat'}">${n>0?'↑ +'+n:'· 0'}</span><span class="dt">${txt}</span>`;
  const kpi=(title,val,ic,col,foot)=>`<div class="kpi"><div><small>${title}</small><b>${val}</b></div><span class="ki" style="--c:${col}">${icon(ic,26)}</span><div class="kf">${foot}</div></div>`;
  const ws=weekStarts(10),lab=ws.map(w=>w.slice(8)+'/'+w.slice(5,7));
  const vis=ws.map(w=>S.rooms.reduce((a,r)=>a+r.visits.filter(v=>v.date>=w&&v.date<=addDays(w,6)).length,0));
  const pho=ws.map(w=>S.rooms.reduce((a,r)=>a+r.visits.filter(v=>v.date>=w&&v.date<=addDays(w,6)).reduce((s,v)=>s+v.photos.length,0)+r.mep.filter(i=>i.date&&i.date>=w&&i.date<=addDays(w,6)).reduce((s,i)=>s+(i.photos||[]).length,0),0));
  const stC={pendiente:0,proceso:0,terminado:0};S.rooms.forEach(r=>stC[r.status]++);
  const mepC=MEP_ST.map(([k])=>M.filter(i=>i.st===k).reduce((a,i)=>a+Math.max(1,qtyOf(i)),0));
  const discBars=[...DISC.map((d,i)=>({n:d,a:M.filter(x=>x.disc===d),c:['#2f5be7','#18a999','#8b5cf6','#f2a31b','#ff7a45','#e5484d'][i]})),{n:'Acabados',a:A,c:'#1fa971',fin:true}].filter(x=>x.a.length);
  const barPct=x=>Math.round(avg(x.a.map(i=>x.fin?wFin(i.st):wMep(i.st)))*100);
  const index=`<div class="panel"><h3>Índice de láminas</h3><div class="tw"><table><tr><th>Lám.</th><th>Espacio</th><th>Estado</th><th>MEP</th><th>Acabados</th><th>Avance</th><th>Fotos</th></tr>
   ${S.rooms.map((r,i)=>`<tr class="go" data-act="go" data-id="${r.id}"><td class="mono">L-${pad(i+1)}</td><td><b>${esc(r.name)}</b></td><td><span class="pill ${r.status}">${STAT[r.status]}</span></td><td>${mepProg(r)===null?'—':mepProg(r)+'%'}</td><td>${finProg(r)===null?'—':finProg(r)+'%'}</td><td style="min-width:110px"><div class="row" style="flex-wrap:nowrap;align-items:center"><span class="bar"><i style="width:${prog(r)}%"></i></span><span class="mono">${prog(r)}%</span></div></td><td>${nPhotos(r)}</td></tr>`).join('')}</table></div></div>`;
  const open=openPu.sort((a,b)=>SEV.indexOf(a.sev)-SEV.indexOf(b.sev)).slice(0,6);
  const vs=S.rooms.flatMap(r=>r.visits.map(v=>({...v,room:r}))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  if(!S.rooms.length)return emptyRooms();
  return `
  <div class="kpis">
   ${kpi('Avance general',t+'%','dashboard','#2f5be7',`<span class="dt">${stC.terminado} de ${S.rooms.length} espacios terminados</span>`)}
   ${kpi('Redes MEP probadas',pct(tested,tot)+'%','mep','#18a999',pill(M.filter(i=>recent(i.date)).length,'puntos nuevos esta semana'))}
   ${kpi('Acabados por comprar',buy,'acabados','#f2a31b',`<span class="dt">de ${A.length} ítems de acabado</span>`)}
   ${kpi('Observaciones abiertas',openPu.length,'punch','#e5484d',pill(P.filter(x=>recent(x.date)).length,'nuevas esta semana'))}
  </div>
  <div class="row2">
   <div class="panel"><div class="ph-h"><h3>Actividad en obra</h3><div class="lgi"><span><i style="background:var(--blue)"></i>Visitas</span><span><i style="background:var(--signal)"></i>Fotos</span></div></div>
    <div class="ph-s">Últimas 10 semanas · ${vis.reduce((a,b)=>a+b,0)} visitas y ${pho.reduce((a,b)=>a+b,0)} fotos</div>
    ${lineChart(lab,[{name:'Visitas',data:vis,color:'var(--blue)'},{name:'Fotos',data:pho,color:'var(--signal)'}])}</div>
   <div class="panel"><div class="ph-h"><h3>Mapa de espacios</h3></div><div class="ph-s">Cada espacio según su avance</div>
    <div class="tiles">${S.rooms.map((r,i)=>`<button class="tile ${r.status}" data-act="go" data-id="${r.id}"><em>L-${pad(i+1)}</em><b>${esc(r.name)}</b><span class="bar"><i style="width:${prog(r)}%"></i></span><small>${prog(r)}% · ${STAT[r.status]}</small></button>`).join('')}</div></div>
  </div>
  <div class="row3">
   <div class="panel"><h3>Estado de espacios</h3>${donut([{l:'Terminados',v:stC.terminado,c:'var(--ok)'},{l:'En proceso',v:stC.proceso,c:'var(--warn)'},{l:'Pendientes',v:stC.pendiente,c:'var(--rule)'}],S.rooms.length,'espacios')}</div>
   <div class="panel"><h3>Redes MEP por estado</h3>${donut(MEP_ST.map((s,i)=>({l:s[1],v:mepC[i],c:['var(--rule)','var(--warn)','var(--blue)','var(--ok)'][i]})),tot,'puntos')}</div>
   <div class="panel"><h3>Avance por disciplina</h3>${discBars.length?discBars.map(x=>`<div class="pr"><span class="pi" style="--c:${x.c}">${icon(x.fin?'acabados':'mep',18)}</span><div><div class="prh"><b>${x.n}</b><span>${barPct(x)}%</span></div><div class="track"><i style="width:${barPct(x)}%;background:${x.c}"></i></div></div></div>`).join(''):'<div class="empty">Registra puntos MEP y acabados para ver el avance.</div>'}</div>
  </div>
  <div class="row2b">
   <div class="panel"><h3>Observaciones abiertas</h3>${open.length?open.map(x=>`<div class="hb" data-act="go" data-id="${x.room.id}" data-t="observ"><span>${esc(x.text)}</span><span class="tag sev-${x.sev}">${x.sev}</span><b class="mono">${esc(x.room.name)}</b></div>`).join(''):'<div class="empty">Sin observaciones abiertas.</div>'}</div>
   <div class="panel"><h3>Actividad reciente</h3>${vs.length?vs.map(v=>{const d=dparts(v.date);return`<div class="hb" data-act="go" data-id="${v.room.id}"><span><b>${esc(v.room.name)}</b> · ${esc(v.note)||'Registro fotográfico'}</span><span class="tag">${esc(v.tag||'General')}</span><b class="mono">${d.d} ${d.m}</b></div>`}).join(''):'<div class="empty">Aún no hay visitas.</div>'}</div>
  </div>
  ${index}`;
}
