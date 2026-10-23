# 489 · Administración con el canon del front, parte B: el resto de las pantallas (OL-457)

**Fecha:** 2026-10-23. **Rama:** `admin-canon-2`, desde `origin/main` (`d9a4cd56`, con la parte A unida, #575). **Operador:** agente de la pieza
(Claude) para el Gestor VII, sin otros agentes. **Migración:** ninguna. **Capturas:** [`docs/rediseno/capturas-489/`](../../../rediseno/capturas-489/)
(`B-01` a `B-13`, tres columnas: antes, después y el par del front; y `B-medidas.json`). **Estado:** espera la revisión del gestor.

## El pedido

El founder, tras la parte A: «publica y arranca»; antes: «acepto tus recomendaciones para optimizar toda la sección que mencionas, incluido el
grafo». La parte B lleva al canon del front lo que faltaba: portada, Ciudades y el panel de ciudad, Propuestas, Corridas, Showcase y su ficha, Por
aprobar, Grafo, Obras colectivas y los manuales. La parte A (bitácora 488) ya les había puesto la barra de las fichas.

## Qué pieza del front reemplaza a cuál

| Antes (propio de Administración) | Ahora (del front) | Dónde |
| --- | --- | --- |
| El renglón propio `admin/fila` (con `admin/total` para el número y el chevron) | El renglón de Ajustes, `ui/Renglon` `.ajuste` (icono, título, detalle, y a la derecha el `span` con el número y el chevron) | 18 componentes: portada (Pendiente, Obras, Grafo, Ciudades), Ciudades, Corridas, Obras, Showcase (Por aprobar, Investigar, grupo, ficha: estado, señales, evidencias, redes, investigar), Por aprobar, la hoja de añadir ciudad, el rol de una persona |
| Filtros, Orden y Vista como chips con flecha en una fila suelta bajo el buscador, y las disciplinas debajo | `ui/Cabecera` bajo la barra, como Lugares: Filtros sin flecha y con su cuenta, Orden y Vista con la flecha de la ciudad; las disciplinas y lo puesto, su segundo nivel; el buscador debajo | Showcase |
| La fila de chips de tipos suelta | En `ui/Cabecera` | Corridas (solo sale con dos tipos o más) |
| El icono de mira (el de «Estás aquí») por ciudad | El pin de la hoja de ciudades del front | Ciudades |
| La etiqueta de estado con 6 px a la izquierda al principio de la línea | Sin ese margen | panel de una ciudad |
| «2 por revisar» centrada bajo una cabecera alineada a la izquierda | A la izquierda, bajo la cabecera de ficha | ficha del Showcase |
| Atrás propio del Grafo (chevron suelto en x 8) | `AtrasIcono` del front: redondo de 44, elevado, en el margen de 20, como sobre la portada de una ficha | Grafo |
| Manuales: tarjetas por entrada, índice de enlaces subrayados en píldoras y «Volver al…» al final | La página de Ayuda del front (`legal.module.css`: texto corrido con sus títulos sobre la página de tarea), el índice con chips del front que bajan sin apilar historial (`ui/Salto`); sin «Volver» (lo hace la barra) | manual del grafo y del showcase |
| Ficha de una obra: nombre en la barra y como título | Igual que la ficha pública de persona: el nombre en la barra (oculto al lector) y el título en la página; no cambia | Obras colectivas › una obra |

**Lo que se borró:** de `admin.module.css`, la familia `.fila` (rejilla, icono, título, detalle, alerta) y el caso aparte de la píldora en una fila
(su partir en dos va ahora en la píldora); la fila de chips suelta de `.lista`; de `Manual.module.css`, `.manual`, `.intro`, `.indice`, `.volver`, la
tarjeta de la entrada. `admin.module.css` queda en 741 líneas (752 tras la parte A), sin clases sin uso. Un `import` que quedó sin uso
(`FiltrosShowcase.tsx`).

**Lo nuevo, justificado (poco):** en `admin.module.css`, que la barra quede por encima del relleno blanco de `ui/Cabecera` y que esta se pegue bajo
ella (lo mismo que `.listado` hizo en la parte A, ahora en `.lista` para Showcase y Corridas), y el aire del segundo nivel; en `ciudades.module.css`,
el área extra de la barra de avance con los nombres de áreas de `ui/Renglon` y que las barras de avance empiecen bajo el texto; en
`showcase.module.css`, la casilla del puntaje como rejilla dentro del `span` de la acción.

**Lo que se queda (sin par en el front, ya firmado):** las tarjetas de indicador de la portada, de Corridas y del panel de ciudad; las tarjetas de
propuesta y de evidencia (Propuestas, Por aprobar); las tarjetas de candidato del Showcase; el lienzo y los mandos del Grafo; el formulario de Obras.

## Medido (390 × 844, `B-medidas.json`)

- Atrás: 44 × 44 en (20, 6) en las 13 pantallas, también el Grafo (antes en x 8).
- Renglones de la portada, Ciudades, Corridas, Por aprobar y la ficha del Showcase: mismas alturas que antes (79–104, 61–115…); el renglón de
  Ajustes mide lo mismo que la fila propia, que ya lo copiaba.
- Profundidad 7–9 (Grafo 11, como antes), sin desbordes nuevos ni toques de menos de 44.

## Pruebas

- `npm run lint` (2 avisos de antes, ajenos), `npm run typecheck`, `npm test`: 4 636 pruebas, todas bien.
- `TEST_DATABASE_URL=… npm run test:db`: 2 403 pruebas, 0 fallaron (sin migración).
- Pruebas de componentes de Administración (Ciudades, Candidatos del Showcase, Ficha del Showcase, CompletarFicha, Por aprobar, Fichas
  administradas, CabeceraLista): 49 de 49, con toques reales; ninguna tuvo que cambiar.
- `npm run inventario`: sin novedades. `npm run medir`: 58 pantallas × 4 anchos, sin novedades; 4 pantallas bajaron de nodos (anotado).
- `next build`: correcto.

## Capturas (antes, después y el par del front), abiertas y descritas

- `B-01-portada.png` — iguales a la vista: el renglón de Ajustes ya medía lo mismo que la fila propia; al lado, Ajustes.
- `B-02-ciudades.png` — cada ciudad con el pin de la hoja de ciudades (antes la mira), su estado, cifras, propuestas en violeta y «Abrir» /
  «Ocultar»; al lado, la hoja de ciudades del front.
- `B-03-ciudad.png` — el panel de Oaxaca: «Abierta» ya sin el aire de 6 px al principio de la línea.
- `B-04-propuestas.png` — la bandeja, igual (tarjetas sin par), con la barra de la parte A.
- `B-05-corridas.png` — los renglones de Ajustes con su píldora de estado; la barra de avance empieza bajo el texto; al lado, Ajustes.
- `B-06-showcase.png` — Filtros, Orden y Vista en la cabecera pegada bajo la barra (Filtros sin flecha), las disciplinas debajo con el aire de la
  columna, el buscador y los renglones «Por aprobar» e «Investigar»; al lado, Lugares del front.
- `B-07-showcase-ficha.png` — «2 por revisar» a la izquierda bajo la cabecera de ficha; Estado y la rúbrica en renglones de Ajustes.
- `B-08-showcase-estado.png` — la hoja de Estado sobre la ficha nueva.
- `B-09-por-aprobar.png` — igual a la vista: el renglón del artista es ya el de Ajustes.
- `B-10-grafo.png` — el Atrás redondo blanco de 44 en el margen de 20, como el de una ficha sobre su portada (al lado, la ficha de un lugar).
- `B-11-obras.png` — igual: la barra de la parte A y el chip de hora de 44.
- `B-12-manual.png` — el manual del grafo como la página de Ayuda: texto corrido, el índice en chips, títulos por bloque y entrada.
- `B-13-manual-showcase.png` — el manual del showcase igual, con «Gobierno» en el índice y su texto corrido.
- `B-medidas.json` — las medidas de antes, después y del front.

## Archivos

`src/app/admin/**` (los 18 componentes del renglón, `Grafo.tsx` y `Grafo.module.css`, los dos manuales y `Manual.module.css`, `OpcionesLista.tsx`,
`VistaCandidatos.tsx`, `corridas/page.tsx`, `ListaCiudades.tsx`, `admin.module.css`, `ciudades.module.css`, `showcase.module.css`),
`scripts/ops/auditoria-ui/comparar-admin-front.mjs` (`--parte=B`), `maqueta-pantalla.mjs` (el manual del showcase), `medidas.aceptadas.json`,
`docs/rediseno/capturas-489/`, `docs/ops/OPEN_LOOPS.md`. No toca los archivos de OL-451.
