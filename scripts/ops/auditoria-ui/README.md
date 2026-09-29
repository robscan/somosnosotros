# Auditoría de la interfaz (OL-227, bitácora 256)

Herramientas con las que se midió la app para el doc `docs/rediseno/50-restructura-ui.md`. Son de operación, no
código de la app; sirven para repetir la medición en cada pieza de la reestructura (plan P11: convertirlas en pruebas).

- `inventario-css.mjs`: parsea los `.module.css` y `globals.css` (PostCSS del propio `node_modules`) y escribe
  `inventario-css.json` con tokens, medidas y colores en duro, alturas fijas, `z-index`, posiciones y bloques duplicados.
  `node scripts/ops/auditoria-ui/inventario-css.mjs`
- `medir.js`: lo que se evalúa dentro de cada página (nodos, profundidad, envoltorios, desbordes, márgenes negativos,
  apilamiento, toques < 44, solapes). `auditar.mjs` lo corre con el Chrome real de la Mac vía `playwright-core`
  (instalado con `npm install playwright-core --no-save` en una carpeta fuera del repo, nunca en `package.json`):
  `node auditar.mjs <base> <pantallas.json> <dirPng> <dirJson> [cookies.json|-] [movil,tableta,escritorio]`.
  `resumir.mjs <dirJson> [filtro]` imprime el resumen; `medidas.mjs <base> [cookies.json]` mide los defectos concretos.
- `comprimir.mjs <destino> origen.png=nombre.png …`: copia capturas al repo como PNG de paleta (sharp del `node_modules`).
- `respaldo-local/`: Auth y PostgREST inventados (`node server.mjs 8823`) sobre `fixture.mjs` (personas `*@example.com`,
  lugares y eventos verosímiles, carteles públicos de `imagenes.json`). La app se apunta con un `.env.local` temporal
  (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8823`, llave anon inventada), `next build && next start -p 3100`, y la
  sesión es la cookie `sb-127-auth-token` que exporta `fixture.mjs` (`cookie`). Nunca toca producción ni un `.env`.

## Prototipo de la reestructura (OL-227, doc 50 § 6)

- `prototipo/generar.py <raíz del repo>` escribe `docs/rediseno/prototipos/restructura-ui.html` a partir de sus assets
  (`logo.svg`, `mapa-base.svg`, `sn.txt`, `iconos.txt`) y de los carteles de `respaldo-local/imagenes.json`. Las
  correcciones se hacen en el generador y se regenera; el HTML no se edita a mano.
- Servir la carpeta: `python3 -m http.server 8090 --directory docs/rediseno/prototipos`.
- `capturar-prototipo.mjs <url> <carpeta>`: las 54 capturas de la v3 (teléfono 2×, tableta 1,5×, escritorio 1×)
  navegando el prototipo de verdad (los clics se despachan como eventos para que también funcionen sobre `<g>` del SVG;
  el desplazamiento se dispara con un evento `scroll` para que actúen la barra y la navegación que se guardan); imprime
  los errores de página y las respuestas 4xx/5xx. La hoja de Lugares se lleva a cada altura desplazando su
  contenedor (los espaciadores fijan asoma · media · llena). Incluye el muestrario de iconos para «seguir un lugar»
  (el mismo renglón con tres glifos), Inicio en modo lista con las tres letras de listas y los estados de las
  pastillas flotantes; con la séptima vuelta, el calendario de Cuándo (un día y un rango), «Otra ciudad» con
  sugerencias y la recarga, la ficha de artista desplazada con sus novedades y el muestrario del icono de Artistas.
  Después, `comprimir.mjs` hacia `docs/rediseno/capturas-NNN/`.
- Los tres scripts de Node usan `playwright-core` como `auditar.mjs` (instalado fuera del repo, ver arriba).
- `probar-hoja.mjs`, `probar-hoja-atras.mjs` y `probar-hoja-recogida.mjs <url>`: prueban con la rueda del Chrome el
  comportamiento de la hoja de Lugares (abre a foto + KPI, crece hasta llenar, luego desplaza el contenido; llena
  muestra Atrás; jalar recoge la lista a la cantidad y la ficha a su cabecera, y solo la ✕ cierra la ficha) e
  imprimen estado, desplazamiento y alturas en cada paso.
- `medir-prototipo.mjs <url>`: `medir.js` sobre cada pantalla del prototipo (envoltorios sin estilo, desbordes,
  márgenes negativos, toques < 44 y, desde la v2, iconos de control con contraste < 3:1 contra el fondo real del botón).
