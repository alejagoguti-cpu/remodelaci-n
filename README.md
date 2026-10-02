# Bitácora de Obra · Remodelación segundo piso

Seguimiento de remodelación con foco en **redes MEP** (eléctrica, hidráulica, sanitaria, gas, datos/CCTV, HVAC) y **acabados**. Todo se guarda en **Google Drive** (carpeta `Bitácora Remodelación`).

## Qué incluye
- **Una lámina (carátula) por habitación** y un **proyecto conjunto** con dashboards.
- **Redes MEP** por habitación: puntos con estado (proyectado, instalado, probado, cerrado) y foto antes de cerrar el muro.
- **Acabados**: cuadro por elemento con material, cantidad y estado, y lista de compras.
- **Registro de obra** por visita (lunes, miércoles y sábado) con clima, personal, retrasos y fotos por disciplina.
- Módulos adaptados de OpenConstructionERP:
  - **Puesta en marcha** (commissioning): pruebas previas y funcionales por sistema, incidencias y puerta de puesta en servicio.
  - **Inspecciones**: plantillas de prueba (presión, aislamiento, desagües, gas, pisos, pintura, impermeabilización).
  - **No conformidades** (NCR): flujo identificada → revisión → acción correctiva → verificación → cerrada.
  - **Observaciones**: flujo con verificación y reapertura.
  - **Materiales**: ingresos, consumo, desperdicio y saldo.
  - **Plan semanal** (Last Planner): compromisos, PPC y causas de incumplimiento.
- **Informe final** en Google Doc.

## Estructura
- `src/styles.css`, `src/app.js`, `src/modules.js`, `src/body.html`: código fuente.
- `node build.js`: genera `index.html` y `dist/bitacora.html` (todo en uno).
- App publicada (privada): https://claude.ai/artifact/EYFQjdoNFFuWYtKoyajMkT

## Licencia
**AGPL-3.0-or-later**, por derivar de [OpenConstructionERP](https://github.com/datadrivenconstruction/OpenConstructionERP). Ver `LICENSE` y `NOTICE`.

## Nota
El guardado en Drive usa el conector de Google Drive de claude.ai; fuera de claude.ai la app no puede guardar.
