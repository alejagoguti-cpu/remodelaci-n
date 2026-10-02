// Genera index.html (archivos separados) y dist/bitacora.html (todo en uno, para publicar como artifact de claude.ai)
const fs=require('fs');
const FONT='https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
const T='Bitácora de Obra';
const read=f=>fs.readFileSync(f,'utf8');
const body=read('src/body.html');
const css=read('src/styles.css')+'\n'+read('src/theme.css');
const js=['storage','modules','dashboard','app'].map(n=>read(`src/${n}.js`)).join('\n');
fs.writeFileSync('index.html',`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${T}</title>
<link rel="stylesheet" href="${FONT}">
<link rel="stylesheet" href="src/styles.css">
<link rel="stylesheet" href="src/theme.css"></head>
<body>
${body}<script src="config.js"></script>
<script src="src/storage.js"></script>
<script src="src/modules.js"></script>
<script src="src/dashboard.js"></script>
<script src="src/app.js"></script>
</body></html>
`);
fs.mkdirSync('dist',{recursive:true});
fs.writeFileSync('dist/bitacora.html',`<title>${T}</title>\n<link rel="stylesheet" href="${FONT}">\n<style>\n${css}</style>\n${body}<script>\n${js}</script>\n`);
