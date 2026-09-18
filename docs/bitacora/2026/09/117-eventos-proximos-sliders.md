# 117 · Artistas y lugares con eventos esta semana

2026-09-18 · OL-083 · Rama `codex/eventos-proximos-sliders`, base `origin/main` `8f30d918`. Asignación del **Gestor de cambios**, que lleva revisión, integración y DevOps. Entrega local; sin push, merge ni despliegue propio.

## Pedido y decisión

El founder pidió un slider similar a Destacados en Artistas y Lugares, adicional a lo elegido por el admin, que haga accesibles quienes tienen eventos próximos y los ordene por fecha. Confirmó expresamente: **«Hoy y próximos 7 días (como la agenda)»**. El título es **Con eventos esta semana**; no significa semana calendario hasta el domingo.

## Resultado

- Carril adicional debajo de Destacados en `/artistas` y en la vista Lista de `/lugares`, con avatares redondos y fotos anchas respectivamente. La fecha/hora admite varias líneas para leerse completa.
- Una tarjeta por entidad con su primera aparición vigente, ordenada por instante, nombre e id. Dos apariciones simultáneas de una ficha se desempatan por id del evento. Las tarjetas llevan a la ficha del artista/lugar.
- Eventos de hoy y hasta el séptimo día inclusive en la zona del evento. Un evento empezado antes entra si sigue vigente según `termina` y dice «En curso». Con fin se usa ese instante; sin fin la base ya calcula la medianoche local. Un evento retirado/oculto (`visible=false`; no existe estado separado de cancelación) no entra.
- Entidades y eventos de la ciudad seleccionada, visibles. Se excluyen lugares privados, ocultos o no legibles incluso con sesión admin. Un evento sin lugar registrado sí puede mostrar a su artista, sin revelar direcciones.
- No exige asistentes ni elección editorial. No modifica el ranking, las reglas de quitar destacados ni los pines del mapa. Una entidad puede aparecer en ambas tiras porque son criterios independientes.
- Sin tarjetas, la sección desaparece. Con una se reutiliza la disposición existente de tarjeta ancha. Igual que Destacados, se oculta con búsqueda o filtros de tipo/disciplina/detalle; Cerca de mí no cambia el orden cronológico del carril. En Mapa permanece la experiencia actual.
- Memoria horizontal por URL con clave `eventos-semana`, separada de `destacados`. Se conserva al volver de fichas o de Mapa a Lista.

## Datos y alcance técnico

`cargarEventosSemana.ts` consulta Supabase con el cliente existente y joins, por lotes de 500 en orden total. No hay consultas por cada ficha ni corte global de 500: las tarjetas son independientes de la paginación del directorio y de sus consultas antiguas. La ventana SQL de nueve días es solo un margen UTC; la selección exacta por zona se hace en `eventosSemana.ts`. Si falla cualquier lote, se descarta el carril parcial y el resto del directorio sigue funcionando.

Sin migraciones, dependencias ni variables nuevas. No se modifican las cargas de detalle ni el select de próxima fecha que está trabajando otra tarea (`sitio_direccion`). Los datos se actualizan al volver a cargar la ruta, sujetos al caché de navegación existente; no se añade un temporizador en una página que permanece abierta. La lectura por lotes crece con el número de relaciones de eventos de la ciudad; no requiere un RPC nuevo en esta pieza.

## Verificación

- `npm run lint`: sin errores; warning preexistente de `k` sin usar en `docs/diseno/logotipo/iconos-sn.mjs`.
- `npm run typecheck`: correcto.
- `npm test`: **392 pruebas en 43 archivos**, incluidas 13 nuevas: vacío, hoy y límite de siete días, octavo día excluido, zona de Tokio, evento en curso y terminado, oculto/cancelado, privado y lugar no legible, múltiples eventos y desempates, enlaces/imágenes, fechas inválidas, segundo lote y error de lectura.
- `npm run build`: correcto. El último build incluye el desempate por evento.
- Playwright/Chromium sobre **build de producción local** (`next start`, puerto 3018), lectura pública de datos reales: 5 artistas y 16 lugares en la consulta de esta sesión, sin duplicados; enlaces a fichas; desplazamiento separado; regreso del historial; cambio Mapa/Lista; búsqueda, vacío de búsqueda y filtros sin carril. No se realizaron escrituras a producción.
- Capturas antes/después en 390×844 (3x) y 1280×800, inspeccionadas completas. Antes: producción existente. Después: build local. Presentes: barra, búsqueda/chips, Destacados y nuevo título; fotos, nombres y fechas semanales legibles; siguiente tarjeta asoma; navegación y botón de registro conservados. El carril horizontal se extiende a la derecha en escritorio como el original. La prueba real de Safari del iPhone del founder no se ha realizado.
- El primer harness de escritorio conservó una búsqueda previa en sessionStorage y no encontró el carril: se aisló el estado de captura, se repitió el recorrido y pasó. No fue un fallo del producto: conservar la búsqueda es el comportamiento existente.

Evidencia y harness en `/Users/apple-1/.codex/visualizations/2026/09/18/01a0b61e-abcd-7483-a141-116715ad40d4/eventos-semana/`: ocho PNG `sn-semana-{artistas,lugares}-{antes,despues}[-1280].png` y `sn-semana-qa.cjs`. El harness se ejecutó con `SN_QA_URL=http://localhost:3018 node /tmp/sn-semana-qa.cjs`.

## Entrega

Lista para revisión del gestor e integración en su cola separada del primer lote 100/101. Sin despliegue en esta tarea. `CLAUDE.md`, `DEFINICION.md`, `PLAN.md` y secretos sin cambios; se retiró únicamente el bloque que Next dev generó automáticamente en el worktree. Reservas 117/OL-083 contrastadas con `scripts/ops/siguiente-bitacora.sh`: 117 disponible, OL-082 reservado a otra tarea por el gestor.
