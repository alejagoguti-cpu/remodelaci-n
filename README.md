# Bitácora de Obra · Remodelación segundo piso

Seguimiento de remodelación con foco en **redes MEP** (eléctrica, hidráulica, sanitaria, gas, datos/CCTV, HVAC) y **acabados**.

- Una **lámina (carátula) por habitación**, y un **proyecto conjunto** con dashboards.
- **Redes MEP**: puntos por disciplina con estado (proyectado, instalado, probado, cerrado) y foto antes de cerrar el muro. Alerta de ítems sin probar o cerrados sin foto.
- **Acabados**: cuadro por elemento (piso, muros, pintura, cielo, carpintería, aparatos, luminarias) con material, cantidad y estado, y lista de compras.
- **Registro de obra** por visita (lunes, miércoles y sábado) con fotos por disciplina, planos y observaciones con foto.
- **Informe final**: genera un Google Doc con todo.
- Todo se guarda en **Google Drive**, carpeta `Bitácora Remodelación`.

## Estructura
- `src/styles.css`, `src/app.js`, `src/body.html`: código fuente.
- `node build.js`: genera `index.html` (archivos separados) y `dist/bitacora.html` (todo en uno).
- Versión publicada (privada): https://claude.ai/artifact/EYFQjdoNFFuWYtKoyajMkT

## Nota
El guardado en Drive usa el conector de Google Drive de claude.ai. Abierta fuera de claude.ai, la app no puede guardar.
Las ideas se inspiran en proyectos públicos de seguimiento de obra; no se copió código de terceros.
