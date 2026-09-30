# 270 · P11 Protección: inventario y medición del DOM como pruebas en la CI (OL-242)

**Fecha:** 2026-09-30 · **Rama:** `ui-proteccion`, desde `origin/ui-chips` (`c61de7a3`) con `origin/restructura-ui` unida (`33f92dfe`; el único choque fue OPEN_LOOPS, resuelto conservando los dos lados) · **OL:** OL-242 · **PR:** #280 (sin unir; va montado sobre #279, `ui-chips`, que va sobre #278, #277, #276, #275, #274, #273, #272, #271, #270, #269 y #268, y sobre #266, `restructura-ui`, los scripts de la auditoría) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Pieza P11 del plan de OL-227 (doc 50, § 7 y § 9).

## Pedido

Encargo del Gestor de cambios III, con el criterio de siempre («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código») y el objetivo del doc 50: «la CI falla con un `z-index` literal, un margen negativo, un desborde o un toque < 44». Sin cambiar la interfaz ni el CSS de la app: lo que hoy falla se declara con su porqué y queda para P12.

## Lo que había

- Las herramientas de la auditoría eran informes, no pruebas: `inventario-css.mjs` escribía un JSON y `medir.js` medía el primer `main` del documento. Con el streaming de React ese primer `main` es el esqueleto (3 nodos; el de verdad, con 188, llega oculto en otro `<div hidden>` hasta que React lo coloca), y contaba los toques por su caja: un chip de 36 con `::before` de 44 salía como fallo.
- Ninguna comprobación de estilos ni de DOM en la CI. Las `*.componentes.test.mjs` no corren en ella.
- Los números del respaldo cambiaban con la hora: sus eventos son relativos a hoy y, según el código, el de dentro de 7 días a las 19:00 entra a «Esta semana» pasadas las 19:00 (una tarjeta más) y los de hoy salen al pasar.

## Lo que se hizo

### 1. `npm run inventario` (Node puro, un segundo)
- `inventario-css.mjs` deja de escribir un informe y falla si hay un `z-index` que no es `var(--z-…)` (con o sin `± n`), un color literal fuera de las definiciones `--*` de `globals.css`, `100vw` o un margen negativo (`-3px`, `calc(-1 * …)`) sin excepción, o si suben los **bloques duplicados** (≥ 4 declaraciones iguales en ≥ 2 reglas) o las **medidas en duro** (píxeles fuera de los tokens, salvo 0, 1 y 2). Que bajen está bien y se anota con `npm run inventario -- --aceptar`, que solo reemplaza su bloque de cifras en `inventario.aceptado.json`.
- Las excepciones van por archivo y, si hace falta, selector, cada una con su porqué; una que ya no hace falta también falla (es análisis estático, no tiene variación).

### 2. `npm run medir` (un minuto; Chrome de la Mac o Chromium)
- `medir-pantallas.mjs` levanta el respaldo local y la app compilada contra él (puertos que da el sistema, sin llaves: URL, llave anon y token de Mapbox inventados), abre las pantallas de `pantallas-prod.json` y `pantallas-sesion.json` (con la sesión de Ana en las segundas) a **320×568, 390×844, 820×1180 y 1280×800** y reparte el trabajo en cuatro navegadores. Espera por señal: `networkidle`, `document.fonts.ready`, que React haya colocado todo lo que llega por streaming, que el mapa no diga «Cargando el mapa…», que no quede una animación con fin y 30 cuadros sin cambios en el DOM (cuadros y no milisegundos: con la máquina cargada el mapa también avanza más despacio); si no se aquieta o no cargó Bricolage, esa pantalla falla en vez de medir mal.
- **Qué falla** (por pantalla y ancho): más nodos o más profundidad que el presupuesto de `medidas.aceptadas.json`; un hijo fuera de la caja de su padre; desplazamiento horizontal; un control con **toque real** menor de 44 (`elementFromPoint` caminando desde el centro de cada borde, calibrado con cajas de 36 a 44 y extensiones de 0 a 4 px: sale la medida exacta; los enlaces dentro del texto quedan exentos); un accionable **tapado** por una capa fija o pegajosa que el desplazamiento no libera (se busca arriba del todo y al final, y a cada candidato se le lleva al centro: si ahí ya recibe el toque solo pasaba bajo una barra); un margen negativo; un error de página.
- **Determinista y sin red:** las imágenes y el estilo del mapa (vacío pero con atribución, para que salgan el logo y la ⓘ) se contestan en el navegador; `reloj-fijo.cjs` congela `Date` en el respaldo y en la app (miércoles 2026-10-07, 10:00 en Ciudad de México) y el navegador fija el mismo instante, así que servidor y pantalla ven el mismo «ahora» y salen los mismos números cualquier día y hora (en la Mac y en la CI salieron idénticos).
- `medir.js` cuenta bajo `<body>` (sin lo oculto ni lo que no es contenido; un `<svg>` vale uno) y gana `tapados` y el toque real; `auditar.mjs` y `resumir.mjs` lo siguen usando.
- **Pantallas:** las 19 de las dos listas más `s10-buscar`, `s11-alta-artista` (las altas de evento y de lugar de las listas pasan a su URL de hoy, `/nuevo?tipo=…`), `s12-lugares-hoja-llena` (la rueda sobre su cuerpo hasta `data-hoja="llena"`) y `s13-lugares-ficha-en-hoja` (`/lugares?lugar=…`); cada una lleva su `plantilla` (raíz, ficha, tarea o hoja) para agrupar la salida.

### 3. La CI
Después de `build`: `npm run inventario`, `npx playwright-core install --with-deps --only-shell chromium` y `npm run medir`. Sin llaves. `playwright-core` (1.63.0) es dependencia de desarrollo: `npm ci` no baja navegadores y en la Mac sigue valiendo el Chrome real.

### 4. El respaldo local
`estado: "me_interesa"` en lugar de `interesa` (la app lo ignoraba) y foto para los tres artistas con evento próximo (Orquesta Sinfónica, Pimpolina y Feleal), con el cartel público de su propio evento: Inicio solo destaca a quien tiene foto y ya sale «Artistas destacados». Sin tocar nada más de sus datos.

### 5. Errores que salieron al probar
- **Un puerto «libre» que no lo era:** probar con `127.0.0.1` en macOS no ve un servidor en `*`; la prueba habría medido una app ajena (con su `.next` recompilado debajo, sin fuentes). Ahora los puertos los da el sistema y se comprueba que el proceso propio sigue vivo cuando el puerto responde.
- **`elementFromPoint` da por suyo casi un píxel más allá de la caja arriba y a la izquierda:** medir a medio píxel del borde daba 41 para una caja de 40. Se calibró (0 de 64 casos mal) y el sondeo arriba y a la izquierda empieza a un píxel.
- **Los toques miden en reposo:** primero salían distintos según hubiera o no desplazamiento previo (un título pegajoso pisa 1 px de un chip solo en un estado). Los controles que se ven se miden antes de mover nada; los que quedan fuera de la pantalla, al final, cada uno al centro.
- **El pulso del pin elegido** (medio segundo dentro del DOM): con diez navegadores a la vez la prueba lo medía a veces (+1 nodo y un hijo fuera de la caja de su padre). Se esperaba por milisegundos; ahora por cuadros, por el mapa y por las animaciones con fin.
- **Un carril vacío deja un esqueleto oculto** (`.vacio`): no sirve de señal de «cargando».

## Cifras aceptadas de hoy

**Inventario:** 104 archivos y 1 213 reglas · bloques duplicados **17** · medidas en duro **414** · `z-index` sin token 0 · color literal 0 · `100vw` 0 · margen negativo 0 (fuera de sus excepciones).

**Medición (nodos por ancho 320 · 390 · 820 · 1280 y profundidad):** Inicio 257 · 257 · 259 · 259 (11); con sesión 282 · 282 · 284 · 284 (9) · Agenda 265 · 265 · 267 · 267 (10) · Lugares 174 · 174 · 175 · 175 (12) · Artistas 134 · 134 · 136 · 136 (10) · ficha de evento 73 · 73 · 103 · 103 (9) · ficha de lugar 95 · 95 · 125 · 125 (12) · ficha de artista 54 · 54 · 84 · 84 (9) · Entrar 21 · 21 · 51 · 51 (7) · alta 48 · 48 · 82 · 82 (9) · Perfil 99 · 99 · 101 · 101 (11) · Buscar 23 · 23 · 57 · 57 (8) · hoja de Lugares llena 176 · 176 · 177 · 177 (12) · ficha en la hoja 162 · 162 · 163 · 163 (14); el resto, en `medidas.aceptadas.json`.

## Excepciones y su porqué

Todas con su porqué en el JSON, «Permanente» o «Deuda (P12)».
- **Estilos (`z-index`, 3):** `lugares.module.css` `.ubicacion` y `.avisoMapa` y `Ficha.module.css` `.titulo`, los tres `z-index: 1` para ordenar hermanos dentro de su caja. **Márgenes negativos (8):** tres del admin (`.nota`, los chips y el menú a todo lo ancho), `SalirSinPublicar` `.salida p`, `EnlaceExterno` `.porque`, y, permanentes, la ✕ de `SelectorQuien`, la de `Aviso` (44 de toque sin engordar la fila) y el chevron del mando de la obra. **Colores (17):** permanentes los botones de Apple y de Google, el letrero impreso, el azul de sistema de iOS de `HojaInstalar`, el QR sobre blanco y la máscara de `[data-sigue]`; el resto, deuda (sombras, velos, marcos de video, el punto del mapa que repite `--sistema-azul` y la obra colectiva).
- **DOM (11):** permanentes el lienzo de Mapbox y el contenedor de sus controles fuera de la caja de su padre, el logo y la ⓘ de Mapbox (su toque no se agranda y con la hoja llena quedan cubiertos a propósito), el `input` de archivo invisible de 1×1 y «Mi ubicación» bajo la hoja llena; deuda: Perfil a 320 px (la fila de acciones y la colonia sobresalen 2 px), «Mi ubicación» a 320×568 (la hoja asoma le cubre la mitad) y el chip de ciudad de Buscar, que se toca de 43 porque el título de grupo pegajoso le pisa 1 px.

## Decidí yo (para que el gestor confirme)

- **Presupuestos por pantalla y ancho (23 × 4), no por plantilla:** un tope por plantilla le daría a la ficha más chica el hueco de la más grande. La plantilla solo agrupa la salida.
- **Reloj fijo** en el respaldo, la app y el navegador (sin él, los números dependían de la hora). El precio: una precarga de 13 líneas (`reloj-fijo.cjs`).
- **La prueba compila su propia copia de la app** (`next build` con las variables del respaldo, 5 a 15 s en la Mac y 6 s en la CI) y por eso deja el `.next` contra el respaldo: no se corre con `next dev` abierto. La CI compila dos veces (`build` de siempre y la de la prueba). La alternativa, darle esas variables al `build` y saltar la segunda, ahorra 28 s pero cambia lo que verifica el `build`.
- **`tapado` = lo que el desplazamiento no libera**, no «lo que pasa bajo una barra»: un control que pasa bajo la barra de abajo al desplazarse es normal; uno que queda bajo una capa fija arriba del todo o al final no se alcanza nunca.
- **Toque real con 44 estricto** (sin tolerancia) y los enlaces dentro del texto exentos (`display: inline`).
- **Pantallas nuevas:** Buscar, alta de artista, hoja llena y ficha en la hoja; y las URLs de las altas pasan a `/nuevo?tipo=…`.
- **Las fotos de artistas del respaldo** son los carteles de sus eventos (ya públicos en `imagenes.json`); no salió nada nuevo.
- **`--aceptar` anota lo de hoy, suba o baje;** el diff del JSON dice qué subió (subir un presupuesto es decisión del gestor).

## Verificación

- **Verde en la Mac y en la CI:** `npm run inventario` («sin novedades»), `npm run medir` (23 pantallas × 4 anchos, 53 s, «sin novedades»), `npm run lint` (0 errores; 2 avisos que no son de la pieza), `npm run typecheck`, `npm test` (119 archivos, 1 602 pruebas) y `npm run build`.
- **Estrés:** con diez navegadores a la vez (dos corridas, 45 y 46 s) y con la Mac saturada de CPU (14 procesos quemando sobre 10 núcleos, 141 s): los mismos números y las mismas excepciones, «sin novedades». Las tres corridas de la CI (226, 228 y 219 s) también.
- **En rojo, a propósito (cada una revertida después):** `z-index: 5` en `Chip.module.css` → «z-index que no es un token sin excepción: components/ui/Chip.module.css .prueba { z-index: 5 }»; `color: #ff0000` → «color literal fuera de globals.css sin excepción: components/ui/Chip.module.css .prueba { color: #ff0000 }»; `margin-left: -8px` → «margen negativo sin excepción: … .prueba { margin-left: -8px }» y, en `BotonIcono` `.control`, `medir` con 97 hallazgos (`margen-negativo … margen 0 0 0 -8` y `fuera-de-la-caja … sale {"izq":8}`); `min-width: 100vw` en `.control` → «100vw sin excepción: components/ui/BotonIcono.module.css .control { min-width: 100vw }» y `medir` con 164 hallazgos, 23 de desplazamiento horizontal («01-inicio · a 1280 px: mide 1296 px en una ventana de 1280»); `.accion { width: 40px; height: 40px }` en `BotonIcono` → `medir` con 19 hallazgos, «toque · 01-inicio · button.BotonIcono/boton.BotonIcono/accion.BotonIcono/elevado a 320, 390, 820, 1280 px: se toca de 40×40 (su caja mide 40×40)». Y la barra de la app en `position: fixed`: «tapado · 02-agenda · a.Renglon/frente a 820, 1280 px: queda bajo h2.Grupo/titulo».
- **Tiempos de la CI:** antes, 139 s por corrida (el `build`, 28 s); después, 226, 228 y 219 s en tres corridas: +80 a +89 s (Chromium, 16 a 23 s, y `medir`, 67 a 71 s con 6 de compilación; `inventario` no llega a 1 s).

## Capturas

`docs/rediseno/capturas-270/`, PNG de paleta a 390×844 con el reloj fijo, del respaldo arreglado (las abrí):
1. **`270-01-agenda-te-interesa.png`:** la Agenda desplazada al viernes 16 de oct: el renglón de «Leonora in the morning light» con su píldora violeta «Te interesa» junto a la hora y el «✓» a la derecha; arriba, «Master Class» y, abajo, «OCA» y «DESIERTO» sin píldora.
2. **`270-02-inicio-artistas-destacados.png`:** Inicio con sesión desplazado a «Artistas destacados»: la Orquesta Sinfónica con su cartel y el círculo verde de «Ya lo sigues», Pimpolina con su foto y el «+» de seguir, y Feleal asomando; encima, «Lugares con eventos».

## Anotado para las piezas que siguen

- **P12 retiros.** Las excepciones marcadas «Deuda (P12)» de los dos JSON son la lista de trabajo: tres `z-index: 1` (`.ubicacion`, `.avisoMapa`, `Ficha .titulo`); doce archivos con colores por tokenizar (los blancos y el hueso son `--fondo`, los velos y sombras piden token; `Mapa.module.css` y `MapaDondeEs.module.css` son la misma copia); cinco márgenes negativos (admin ×3, `SalirSinPublicar`, `EnlaceExterno`); Perfil a 320 (+2 px); «Mi ubicación» a 320×568; el título pegajoso de Buscar sobre 1 px del chip. Además, 17 bloques duplicados y 414 medidas en duro (lista de la prueba). El informe viejo del inventario (tokens sin uso —`--ok-suave`, `--alto-filtros`, `--duracion-ficha`—, los literales más repetidos) ya no se calcula: está en `git show 33f92dfe:scripts/ops/auditoria-ui/inventario-css.mjs`. Las herramientas de informe (`auditar.mjs`, `resumir.mjs`, `medidas.mjs`, `medir-prototipo.mjs`) no las necesita la prueba y `medidas.mjs` usa selectores de antes de la reestructura: candidatas a retirar.
- **P13 lenguaje incluyente.** Los nombres accesibles de los controles de Mapbox salen en inglés en la prueba («Toggle attribution» de la ⓘ, «Mapbox homepage» del logo): la opción `locale` de `new mapboxgl.Map` los traduce. En el respaldo, «Ana Rentería» y «Marcos Ledesma» siguen siendo los usuarios inventados.

## Para el doc 50 (no lo toqué)

- § 9, puntos 1 a 3: cumplidos; las rutas reales son `scripts/ops/auditoria-ui/inventario-css.mjs` y `medir-pantallas.mjs` (no `scripts/ops/`), con `npm run inventario` y `npm run medir`, y las cifras aceptadas en `inventario.aceptado.json` y `medidas.aceptadas.json`. § 9, punto 2: «por plantilla» es por pantalla y ancho.
- Fila P11 de la tabla de piezas: hecha.

## Archivos

Sin migraciones ni variables de entorno; la CI no lleva llaves. +624 −144 líneas desde la unión (14 archivos, sin contar esta bitácora, OPEN_LOOPS y las dos capturas).

**Nuevos:** esta bitácora, `docs/rediseno/capturas-270/`, `scripts/ops/auditoria-ui/medir-pantallas.mjs`, `reloj-fijo.cjs`, `inventario.aceptado.json` y `medidas.aceptadas.json`. **Con cambios:** `scripts/ops/auditoria-ui/inventario-css.mjs`, `medir.js`, `pantallas-prod.json`, `pantallas-sesion.json`, `README.md` y `respaldo-local/fixture.mjs`; `.github/workflows/ci.yml`, `package.json` y `package-lock.json` (`playwright-core`, `inventario` y `medir`), `CLAUDE.md` (la línea de verificación rápida) y `docs/ops/OPEN_LOOPS.md`.
