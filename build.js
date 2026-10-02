// Genera index.html (archivos separados) y dist/bitacora.html (todo en uno, para publicar como artifact de claude.ai)
const fs=require('fs');
const FONT='https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,500..900&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap';
const T='Bitácora de Obra', body=fs.readFileSync('src/body.html','utf8'), css=fs.readFileSync('src/styles.css','utf8'), js=fs.readFileSync('src/app.js','utf8');
fs.writeFileSync('index.html',`<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${T}</title>\n<link rel="stylesheet" href="${FONT}">\n<link rel="stylesheet" href="src/styles.css"></head>\n<body>\n${body}<script src="src/app.js"></script>\n</body></html>\n`);
fs.mkdirSync('dist',{recursive:true});
fs.writeFileSync('dist/bitacora.html',`<title>${T}</title>\n<link rel="stylesheet" href="${FONT}">\n<style>\n${css}</style>\n${body}<script>\n${js}</script>\n`);
