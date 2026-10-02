# Bitácora de Obra · Remodelación segundo piso

Seguimiento de remodelación con foco en **redes MEP** (eléctrica, hidráulica, sanitaria, gas, datos/CCTV, HVAC) y **acabados**. Todo se guarda en **Google Drive** (carpeta `Bitácora Remodelación`).

## Qué incluye
- **Una lámina (carátula) por habitación** y un **proyecto conjunto** con dashboards.
- **Redes MEP** por habitación: puntos con estado (proyectado, instalado, probado, cerrado) y foto antes de cerrar el muro.
- **Acabados**: cuadro por elemento con material, cantidad y estado, y lista de compras.
- **Registro de obra** por visita (lunes, miércoles y sábado) con clima, personal, retrasos y fotos por disciplina.
- Módulos de proyecto:
  - **Entrega de sistemas**: pruebas previas y en operación por sistema, incidencias y entrega solo cuando todo cumple.
  - **Pruebas e inspecciones**: plantillas (presión de agua, aislamiento eléctrico, desagües, gas, pisos, pintura, impermeabilización).
  - **No conformidades**: abierta → causa analizada → corregida → cerrada.
  - **Observaciones**: pendiente → en corrección → por revisar → aprobada, con rechazos y reaperturas.
  - **Materiales**: ingresos, consumo, desperdicio y saldo.
  - **Plan semanal**: compromisos, cumplimiento y causas de incumplimiento.
- **Informe final** en Google Doc.

## Estructura
- `src/styles.css`, `src/app.js`, `src/modules.js`, `src/storage.js`, `src/dashboard.js`, `src/theme.css`, `src/body.html`, `config.js`: código fuente.
- `node build.js`: genera `index.html` y `dist/bitacora.html` (todo en uno).
- App publicada (privada): https://claude.ai/artifact/EYFQjdoNFFuWYtKoyajMkT

## Licencia
Sin licencia definida todavía (todos los derechos reservados). Elige una antes de compartir el código con terceros.

## Dónde se guardan los datos
| Cómo la abres | Dónde guarda |
|---|---|
| Desde claude.ai (app publicada) | Google Drive, con tu conector de claude.ai |
| Sitio web (GitHub Pages) con **modo local** | En el navegador de ese equipo (IndexedDB) |
| Sitio web con **Google Drive** | Google Drive, carpeta `Bitácora Remodelación` (requiere configurar `config.js`) |

### Google Drive en el sitio web
1. En Google Cloud Console crea un proyecto y activa la **Google Drive API**.
2. Crea un **ID de cliente de OAuth** de tipo *Aplicación web* y agrega como origen autorizado `https://alejagoguti-cpu.github.io`.
3. Pega el ID en `config.js` (`window.BO_CONFIG={googleClientId:'...'}`) y publica el cambio.
4. La app pide solo el permiso `drive.file`: ve únicamente los archivos que ella misma crea.

La conexión directa con Google no se ha probado con credenciales reales. El modo local y la app en claude.ai sí se probaron.
