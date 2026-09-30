# Protección y auditoría de la interfaz (OL-227 y OL-242, bitácoras 256 y 270)

Herramientas de operación (no son código de la app). Las dos primeras son las pruebas que corre la CI en cada PR
(doc `docs/rediseno/50-restructura-ui.md`, § 9); el resto es lo que queda de la auditoría, el respaldo local y el prototipo.

## Las dos pruebas

- **`npm run inventario`** (Node puro, un segundo). Recorre los `.css` de `src`. Falla si aparece un `z-index` que no es un
  token (`var(--z-…)`, con o sin `± n`), un color literal fuera de los tokens de `globals.css`, `100vw` o un margen negativo
  sin excepción, o si suben los bloques duplicados o las medidas en duro (píxeles fuera de los tokens, salvo 0, 1 y 2) respecto
  a lo aceptado. Que bajen está bien.
- **`npm run medir`** (un minuto; necesita Chrome o Chromium). Levanta el respaldo local y la app compilada contra él y abre las
  pantallas de `pantallas-prod.json` y `pantallas-sesion.json` a 320, 390, 820 y 1280 px. Falla si una pantalla pasa de su
  presupuesto de nodos o de profundidad, o si tiene:
  - un hijo fuera de la caja de su padre, o desplazamiento horizontal;
  - un control cuyo toque real mide menos de 44 (se prueba con `elementFromPoint`, no con la caja: un chip de 36 con un
    `::before` de 44 pasa; los enlaces dentro de un texto quedan exentos);
  - un accionable tapado por un elemento fijo que el desplazamiento no libera;
  - un margen negativo o un error de página.

  No usa llaves reales ni red: las imágenes y el estilo del mapa se contestan en el navegador, y el reloj está fijo
  (`reloj-fijo.cjs`), así que salen los mismos números cualquier día y a cualquier hora. Compila la app en `.next`: no la
  corras con `next dev` abierto. La URL de Supabase, la llave y el token de Mapbox los pone la prueba (son inventados) y mandan
  sobre cualquier `.env.local`: la app solo llega al respaldo. Opciones: `--solo=texto` (solo las pantallas cuyo id lo
  contiene), `CHROME_EXECUTABLE` (el navegador; sin él, el Chrome de la Mac y si no el Chromium de Playwright, que se instala
  con `npx playwright-core install chromium`) y `MEDIR_HILOS` (los cuatro navegadores en paralelo).

Lo que no revisan: el desplazamiento interior de la hoja de Lugares ni las hojas cerradas (Ciudad, Cuándo, Filtros); el
toque se mide con la resolución de un píxel.

## Aceptar una excepción o una cifra

- Una regla que falla se arregla en el CSS. Si de verdad no se puede, se anota su excepción con el porqué en una línea: en
  `inventario.aceptado.json` (por archivo y, si hace falta, selector) o en `medidas.aceptadas.json` (por regla, elemento,
  pantalla y anchos). El porqué empieza por «Permanente:» (una regla de la marca o del sistema) o por «Deuda (P12):» (algo
  que se debe retirar). Cuando el CSS se arregla, se borra la excepción (el inventario falla si sobra una; `medir` la avisa).
- Las cifras se actualizan con un comando explícito, después de comprobar en el diff que solo bajaron:
  `npm run inventario -- --aceptar` (bloques duplicados y medidas en duro) y `npm run medir -- --aceptar` (nodos y
  profundidad por pantalla y ancho). Subir un presupuesto es una decisión del gestor y se explica en la bitácora.
- La CI (`.github/workflows/ci.yml`) corre las dos después de `build`: instala Chromium con `npx playwright-core install
  --with-deps --only-shell chromium` y no lleva ninguna llave.

## Respaldo local

`respaldo-local/`: Auth y PostgREST inventados sobre `fixture.mjs` (personas `*@example.com`, lugares, eventos y artistas
verosímiles; carteles públicos de `imagenes.json`). `npm run medir` lo levanta solo. Para usarlo a mano: `node
respaldo-local/server.mjs 8823`, un `.env.local` temporal con `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8823` y una llave
anon inventada, `next build && next start -p 3100`, y la sesión es la cookie `sb-127-auth-token` que exporta `fixture.mjs`
(`cookie`). Nunca toca producción ni un `.env` real.

## Lo que queda de la auditoría

- `medir.js`: lo que se evalúa dentro de cada página: nodos y profundidad bajo `<body>`, envoltorios, desbordes, márgenes
  negativos, apilamiento, toques reales menores de 44, accionables tapados, solapes y contraste. Lo usan la prueba y
  `medir-prototipo.mjs`. Los informes con los que se auditó (`auditar.mjs`, `resumir.mjs` y `medidas.mjs`) se retiraron en la
  bitácora 271: la prueba de arriba dice lo mismo y además falla. El informe viejo del inventario sigue en el historial
  (`scripts/ops/auditoria-ui/inventario-css.mjs` en el commit 33f92dfe).
- `comprimir.mjs <destino> origen.png=nombre.png …`: copia capturas al repo como PNG de paleta (sharp del `node_modules`).

## Prototipo de la reestructura (OL-227, doc 50 § 6)

- `prototipo/generar.py <raíz del repo>` escribe `docs/rediseno/prototipos/restructura-ui.html` a partir de sus assets
  (`logo.svg`, `mapa-base.svg`, `sn.txt`, `iconos.txt`) y de los carteles de `respaldo-local/imagenes.json`. Las
  correcciones se hacen en el generador y se regenera; el HTML no se edita a mano.
- Servir la carpeta: `python3 -m http.server 8090 --directory docs/rediseno/prototipos`.
- `capturar-prototipo.mjs <url> <carpeta>`: las 56 capturas de la v3 (teléfono 2×, tableta 1,5×, escritorio 1×)
  navegando el prototipo de verdad (los clics se despachan como eventos para que también funcionen sobre `<g>` del SVG;
  el desplazamiento se dispara con un evento `scroll` para que actúen la barra y la navegación que se guardan); imprime
  los errores de página y las respuestas 4xx/5xx. La hoja de Lugares se lleva a cada altura desplazando su
  contenedor (el prototipo expone sus alturas en `.hoja-lugares.detentes()`: recogida · asoma · media · llena). Incluye el muestrario de iconos para «seguir un lugar»
  (el mismo renglón con tres glifos), Inicio en modo lista con las tres letras de listas y los estados de las
  pastillas flotantes; con la séptima vuelta, el calendario de Cuándo (un día y un rango), «Otra ciudad» con
  sugerencias y la recarga, la ficha de artista desplazada con sus novedades y el muestrario del icono de Artistas.
  Después, `comprimir.mjs` hacia `docs/rediseno/capturas-NNN/`.
- `probar-hoja.mjs`, `probar-hoja-atras.mjs` y `probar-hoja-recogida.mjs <url>`: prueban con la rueda del Chrome el
  comportamiento de la hoja de Lugares (abre a foto + KPI, crece hasta llenar, luego desplaza el contenido; llena
  muestra Atrás; jalar recoge la lista a la cantidad y la ficha a su cabecera, y solo la ✕ cierra la ficha) e
  imprimen estado, desplazamiento y alturas en cada paso.
- `medir-prototipo.mjs <url>`: `medir.js` sobre cada pantalla del prototipo (envoltorios sin estilo, desbordes,
  márgenes negativos, toques < 44 y, desde la v2, iconos de control con contraste < 3:1 contra el fondo real del botón).
- Los scripts de Node de la auditoría y del prototipo usan `playwright-core` (ya es dependencia de desarrollo).
