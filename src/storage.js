/*
 * Almacenamiento alterno para cuando la app se abre fuera de claude.ai (por ejemplo en GitHub Pages).
 * Ambos adaptadores exponen la misma interfaz que el conector de Google Drive de claude.ai:
 *   callTool(servidor, herramienta, entrada) -> { payload }
 * así el resto de la app no cambia.
 *  - Local: guarda en IndexedDB de este navegador.
 *  - Google: usa la API REST de Google Drive con un token OAuth (scope drive.file).
 *    Requiere un ID de cliente de OAuth en config.js (ver README).
 */
let BACKEND='claude';
const BO_CONFIG=(typeof window!=='undefined'&&window.BO_CONFIG)||{};

function makeLocalMcp(){
  const open=()=>new Promise((res,rej)=>{const q=indexedDB.open('bitacora-local',1);q.onupgradeneeded=()=>q.result.createObjectStore('files',{keyPath:'id'});q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const dbp=open();
  const tx=async(mode,fn)=>{const db=await dbp;return new Promise((res,rej)=>{const t=db.transaction('files',mode),s=t.objectStore('files'),r=fn(s);t.oncomplete=()=>res(r.result);t.onerror=()=>rej(t.error)})};
  const all=()=>tx('readonly',s=>s.getAll());
  const meta=f=>({id:f.id,title:f.title,mimeType:f.mimeType,parentId:f.parentId,viewUrl:''});
  return{callTool:async(srv,tool,i)=>{
    let p;
    if(tool==='search_files'){
      const q=i.query,t=(q.match(/title = '([^']*)'/)||[])[1],c=(q.match(/title contains '([^']*)'/)||[])[1],par=(q.match(/parentId = '([^']*)'/)||[])[1],fo=/folder/.test(q);
      p={files:(await all()).filter(f=>!f.trashed&&(!t||f.title===t)&&(!c||f.title.includes(c))&&(!par||f.parentId===par)&&(!fo||f.mimeType.includes('folder'))).map(meta)};
    }else if(tool==='create_file'){
      const f={id:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),title:i.title,mimeType:i.mimeType||i.contentMimeType,parentId:i.parentId,text:i.textContent,b64:i.base64Content};
      await tx('readwrite',s=>s.put(f));p=meta(f);
    }else if(tool==='download_file_content'){
      const f=(await all()).find(x=>x.id===i.fileId);
      p={content:f.b64||btoa(unescape(encodeURIComponent(f.text||''))),mimeType:f.mimeType,id:f.id,title:f.title};
    }else if(tool==='trash_file'){
      await tx('readwrite',s=>s.delete(i.fileId));p={};
    }
    return{payload:p};
  }};
}

function makeGoogleMcp(token){
  const API='https://www.googleapis.com/drive/v3/files',UP='https://www.googleapis.com/upload/drive/v3/files',FIELDS='id,name,mimeType,webViewLink,parents';
  const auth={Authorization:'Bearer '+token};
  const fail=async r=>{const m=await r.text().catch(()=>'');throw{code:r.status===401?'needs_reauth':r.status===403?'blocked_by_policy':'upstream_error',message:`Google Drive respondió ${r.status}. ${m.slice(0,160)}`}};
  const meta=f=>({id:f.id,title:f.name,mimeType:f.mimeType,parentId:(f.parents||[])[0],viewUrl:f.webViewLink||''});
  const toQ=q=>q.replace(/title contains/g,'name contains').replace(/title =/g,'name =').replace(/parentId = '([^']*)'/g,"'$1' in parents").replace(/owner = 'me'/g,"'me' in owners")+' and trashed = false';
  const b64blob=(b,type)=>{const a=atob(b),u=new Uint8Array(a.length);for(let k=0;k<a.length;k++)u[k]=a.charCodeAt(k);return new Blob([u],{type})};
  return{callTool:async(srv,tool,i)=>{
    let p;
    if(tool==='search_files'){
      const r=await fetch(`${API}?q=${encodeURIComponent(toQ(i.query))}&fields=files(${FIELDS})&pageSize=${i.pageSize||50}`,{headers:auth});if(!r.ok)await fail(r);
      p={files:((await r.json()).files||[]).map(meta)};
    }else if(tool==='create_file'){
      const isFolder=(i.mimeType||'').includes('folder');
      const md={name:i.title,...(i.parentId?{parents:[i.parentId]}:{})};
      if(isFolder){
        const r=await fetch(`${API}?fields=${FIELDS}`,{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({...md,mimeType:'application/vnd.google-apps.folder'})});if(!r.ok)await fail(r);p=meta(await r.json());
      }else{
        const media=i.base64Content?b64blob(i.base64Content,i.contentMimeType):new Blob([i.textContent||''],{type:i.contentMimeType});
        if(i.contentMimeType==='text/html'&&!i.disableConversionToGoogleType)md.mimeType='application/vnd.google-apps.document'; else md.mimeType=i.contentMimeType;
        const fd=new FormData();fd.append('metadata',new Blob([JSON.stringify(md)],{type:'application/json'}));fd.append('file',media);
        const r=await fetch(`${UP}?uploadType=multipart&fields=${FIELDS}`,{method:'POST',headers:auth,body:fd});if(!r.ok)await fail(r);p=meta(await r.json());
      }
    }else if(tool==='download_file_content'){
      const r=await fetch(`${API}/${i.fileId}?alt=media`,{headers:auth});if(!r.ok)await fail(r);
      const buf=new Uint8Array(await r.arrayBuffer());let s='';for(let k=0;k<buf.length;k+=8192)s+=String.fromCharCode.apply(null,buf.subarray(k,k+8192));
      p={content:btoa(s),mimeType:r.headers.get('Content-Type')||'application/octet-stream',id:i.fileId};
    }else if(tool==='trash_file'){
      const r=await fetch(`${API}/${i.fileId}`,{method:'PATCH',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});if(!r.ok)await fail(r);p={};
    }
    return{payload:p};
  }};
}

function googleToken(clientId){
  return new Promise((res,rej)=>{
    const go=()=>google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'https://www.googleapis.com/auth/drive.file',
      callback:t=>t.access_token?res(t.access_token):rej({code:'needs_reauth',message:t.error||'Sin permiso de Google Drive.'}),
      error_callback:e=>rej({code:'needs_reauth',message:e.type||'Se canceló el acceso a Google Drive.'})}).requestAccessToken();
    if(window.google&&google.accounts)return go();
    const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=go;s.onerror=()=>rej({code:'server_unavailable',message:'No se pudo cargar el acceso de Google.'});document.head.appendChild(s);
  });
}

/* Pantalla de inicio fuera de claude.ai */
function chooseBackend(){
  return new Promise(resolve=>{
    try{if(localStorage.getItem('bo-backend')==='local'){BACKEND='local';return resolve(makeLocalMcp())}}catch(e){}
    const g=BO_CONFIG.googleClientId;
    document.getElementById('app').innerHTML=`<div class="loading" style="grid-column:1/-1"><div style="max-width:520px">
      <div class="brand" style="color:var(--ink);justify-content:center;margin-bottom:14px"><i></i><span>Bitácora de Obra</span></div>
      <p style="margin:0 0 18px">Elige dónde guardar la información del proyecto.</p>
      <div class="row" style="justify-content:center">
       ${g?`<button class="btn sig" id="bg">Conectar Google Drive</button>`:`<button class="btn alt" disabled title="Falta configurar el ID de cliente de Google en config.js">Google Drive (sin configurar)</button>`}
       <button class="btn" id="bl">Usar en este navegador</button></div>
      <p style="font-size:12.5px;color:var(--mute);margin-top:16px">${g?'Con Google Drive, las fotos y los datos quedan en tu carpeta <b>Bitácora Remodelación</b>.':'Para guardar en Google Drive desde este sitio hay que poner un ID de cliente de Google en <code>config.js</code> (pasos en el README). También funciona abriéndola desde claude.ai.'} El modo local guarda solo en este navegador y este equipo.</p></div></div>`;
    document.getElementById('bl').onclick=()=>{try{localStorage.setItem('bo-backend','local')}catch(e){}BACKEND='local';resolve(makeLocalMcp())};
    const bg=document.getElementById('bg');
    if(bg)bg.onclick=async()=>{bg.disabled=true;bg.textContent='Esperando permiso…';
      try{BACKEND='google';resolve(makeGoogleMcp(await googleToken(g)))}
      catch(e){bg.disabled=false;bg.textContent='Conectar Google Drive';document.getElementById('toast').textContent=e.message||'No se pudo conectar.';document.getElementById('toast').hidden=false}};
  });
}
