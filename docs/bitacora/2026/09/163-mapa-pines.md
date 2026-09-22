# 163 · Mapa de lugares: pines — día siempre visible, pin compacto, verde de seguidos (OL-128)

**Fecha:** 2026-09-22
**Rama:** `mapa-pines` (creada desde `origin/main`, `731970a`; confirmada con `git branch --show-current` antes del primer commit)
**Pieza:** OL-128 y bitácora 163, encargadas por el gestor (Gestor de cambios II) tras la prueba del founder en su iPhone con OL-125 en producción.

## Qué pedía

El founder, en el chat del gestor, tras probar el mapa en producción (`23c90ae`):

> «El letrero de día se muestra y oculta según zoom en mapa, y el envolvente circular tiene mucho padding, pienso que se puede compactar más el pin. […] a los resaltados los pintamos naranjas pero no les ponemos día. Por último los resaltados, como son seguidos se les debe poner el mismo color de seguidos, revisa consistencia en lenguaje visual. En general los tamaños de pines de mapa son: Lugar normal sin fecha (pin pequeño), Lugar con fecha (pin mediano con tres letras de día), Lugares seguidos, con fecha y sin fecha.»

Cuatro correcciones sobre `src/components/Mapa.tsx`, más el doc 35 y el prototipo.

## Qué se hizo

### 1. El día ya no se esconde por el zoom

Mapbox retira por defecto los símbolos que chocan entre sí al acercar o alejar (colisión entre "Hoy"/días vecinos, o con los nombres de los lugares). La capa `CAPA_DIA` ahora lleva `text-allow-overlap: true` y `text-ignore-placement: true`: el día se pinta siempre. Un `symbol-sort-key` compartido (`prioridad`, seguido > con día > el resto) decide quién queda visualmente encima si dos símbolos de verdad se superponen, aplicado también a `CAPA_NOMBRES` para que un seguido gane el sitio a su nombre igual que antes.

### 2. Pin compacto

El círculo mediano (con día) baja de 32 a 24 px (`RADIO_MEDIANO = 12`, antes 16). A 10 px de letra, «Sáb» en DIN Pro Bold mide unos 19 px de ancho; a 24 px de diámetro el aire baja a 2–3 px por lado, en vez de los ~7 px que dejaba el círculo de 32. `RADIO_PEQUENO` (sin día) sigue en 5 px, sin cambios.

### 3. Dos tamaños solamente, iguales con o sin seguir

Antes un lugar seguido sin evento medía 7 px, un tamaño propio. Ahora el radio depende solo de si hay día (`RADIO_MEDIANO`/`RADIO_PEQUENO`); "seguido" ya no toca el tamaño, solo el color y el aro. Así un seguido con evento es un pin mediano verde, y un seguido sin evento es un pin pequeño verde — el mismo tamaño que le tocaría sin serlo.

### 4. El color de los seguidos: verde de «Sigues», no naranja

Busqué cómo se pinta hoy el estado "ya decidido" en la app: `src/app/globals.css` define `--ok: #1f6f43` ("verde: algo ya decidido (Vas, Sigues) — distinto de `--primario` a propósito, para no invitar a tocarlo otra vez, OL-106") y `src/components/ui/BotonRenglon.module.css` lo usa en `.decidido` (el botón «Sigues» de los renglones de Lugares y Artistas). Es exactamente el lenguaje visual que pedía el founder. Cambié `seguidoColor` en `agregarCapas()` de `colorDiseno("--destacado", ...)` a `colorDiseno("--ok", ...)`, para el punto, el aro y el nombre; ya no hay un "texto" aparte (`--destacado-texto`): `--ok` funciona igual para relleno y para letra, con buen contraste sobre el fondo del mapa.

### 5. Doc 35 y prototipo

- **`docs/rediseno/35-mapa-de-lugares.md`:** decisión 6 con las palabras literales del founder; tabla de pines reescrita (dos tamaños, verde de seguidos, nunca se esconde); párrafo «Por qué 24 px y no 32» y «por qué el día nunca se esconde»; sección de capturas actualizada.
- **`docs/rediseno/prototipos/mapa-lugares.html`:** token `--ok` añadido a los tokens del documento; `.lugar.seguido` pasa de `--destacado` a `--ok`; el radio del círculo con día baja de 16 a 12 (24 px de diámetro); un seguido sin día vuelve a 5 px (antes 7, tamaño propio que ya no existe); comentarios y las descripciones de los cuatro estados actualizados. Cuatro capturas retomadas.

## Evidencia

- `npm run lint && npm run typecheck && npm test` (989 pruebas) y `npm run build`, en verde.
- **Prototipo:** cuatro estados a 390×844 reales (Chrome vía `playwright-core`, `document.fonts.check('16px "Bricolage Grotesque"')` = `true`) en `docs/rediseno/capturas-35/`, retomados con el pin compacto y el verde. Abrí los cuatro PNG antes de entregarlos.
- **App real, con Mapbox de verdad:** el gestor me dio el token público (`somosnosotros-privado/mapbox-token-publico.txt`, nunca copiado a este repo, nunca impreso en esta bitácora ni en ningún mensaje) en un `.env.local` temporal, junto con la URL del respaldo local de datos inventados (los mismos doce lugares del prototipo, con sesión y dos seguimientos). `next build && next start`, capturado con `playwright-core` en tres zooms:
  - `app-mapa-zoom-barrio--390x844.png` — el encuadre inicial, ya con Mapbox real: confirma los dos tamaños y el verde de los dos seguidos (Museo Federico Silva sin día, MUNI con «Vie»), y el Centro de las Artes (destacado, no seguido) en tinta con «Hoy».
  - `app-mapa-zoom-ciudad--390x844.png` — alejado varias colonias: todos los días siguen legibles, ninguno desaparece por el cambio de zoom.
  - `app-mapa-zoom-calle--390x844.png` — acercado a nivel de calle: el pin compacto y el aro se ven nítidos, sin el margen amplio de antes.
  - `app-mapa-sin-sesion--390x844.png` — mismo encuadre, sin sesión: los dos lugares vuelven a la tinta normal, sin verde ni aro.
  - Abrí los cuatro PNG antes de entregarlos y los comparé contra el prototipo firmado y corregido, estado por estado.
  - Al terminar: apagué `next start` y el respaldo, borré `.env.local` (nunca tuvo más que el token de Mapbox y la URL del respaldo), y confirmé con `git status` que el token no quedó en ningún archivo del repo.

## Límites

- No até el ancho real del texto a un cálculo de fuente (no hay `canvas`/DOM con "DIN Pro Bold" disponible en este entorno de build): usé la estimación del propio Mapbox renderizado (verificada visualmente en las cuatro capturas reales) en vez de una medición programática exacta. Si el founder ve el pin todavía holgado o apretado en su iPhone, el ajuste es un número (`RADIO_MEDIANO` en `Mapa.tsx`).
- Los tres "zooms" (ciudad, barrio, calle) los definí con la rueda del mouse simulada por `playwright-core`, no son niveles de zoom exactos y con nombre fijo de Mapbox: son representativos de "alejado", "el encuadre normal" y "acercado", suficientes para ver que el día no desaparece y que el pin se ve bien a distintas escalas.
- No probé el clic sobre un pin a escala de calle (para ver la hoja con el pin compacto ya elegido): dos intentos con coordenadas distintas no acertaron el pin en el navegador headless. La mecánica de la hoja (crece 30 %, sube el botón de ubicación) ya está cubierta por las capturas de OL-125 y por el prototipo; falta solo verla con Mapbox real muy acercado.

## Pendiente

- Prueba del founder en su iPhone (Safari): que el día no se esconda al hacer pellizco, que el pin se sienta compacto y no apretado, y que el verde de los seguidos se lea bien sobre el mapa.

## Corrección tras la aceptación del gestor: la ⓘ de Mapbox tapada

El gestor aceptó OL-128 y, al abrir las tres capturas de zoom, notó que la ⓘ de atribución de Mapbox quedaba tapada por el botón de ubicación: las dos viven en la esquina inferior izquierda del mapa (`logoPosition: "bottom-left"` y, en "ver", `AttributionControl` también en `"bottom-left"`). Esto ya estaba escrito en el doc 35 desde OL-124/125 («la ⓘ y la marca de Mapbox se ponen juntas, abajo, entre el botón de ubicación y "Registrar lugar"») pero nunca se codificó en OL-125: quedó pendiente sin que nadie lo notara hasta ver el mapa con Mapbox real.

**Corrección:** `src/components/Mapa.module.css`, una regla que centra el contenedor `mapboxgl-ctrl-bottom-left` (donde Mapbox agrupa el logo y la ⓘ cuando los dos apuntan a la misma esquina) con `left: 50%; transform: translateX(-50%)`, solo dentro de `.mapaCaja`/`.mapa` (el mapa de "ver"): el mapa embebido de las hojas Dónde está/Dónde es (modo "elegir") no se toca. Sin cambios en `Mapa.tsx`.

**Evidencia:** `npm run typecheck` en verde (cambio solo de CSS, sin lógica); captura real `atribucion-mapbox--390x844.png` (Mapbox de verdad, mismo respaldo y token que las demás de esta bitácora), abierta antes de entregar: la ⓘ y «mapbox» quedan centradas abajo, sin tocar el botón de ubicación ni «Registrar lugar».

### Segunda corrección: centrada, «mapbox» seguía tapada por «Registrar lugar»

El gestor abrió `atribucion-mapbox--390x844.png` y vio que, aunque ya no tocaba el botón de ubicación, la palabra «mapbox» quedaba detrás del borde izquierdo de «Registrar lugar» y la ⓘ pegada a ese botón: a 390 px de ancho, el hueco entre los dos botones no alcanza para centrar un bloque de 94 px (el ancho real del logo + la ⓘ, medido con `getBoundingClientRect`).

**Corrección:** en vez de centrar, `mapboxgl-ctrl-bottom-left` se alinea al mismo `left` que el botón de ubicación y se coloca **por encima** de él: `bottom: calc(16px + var(--toque) + 8px + max(0px, var(--alto-hoja, 0px) - var(--alto-nav) - env(safe-area-inset-bottom, 0px)))` — el mismo término de `--alto-hoja` que ya usa `.ubicacion` en `lugares.module.css` para subir sobre la hoja del pin, más el alto del botón (`--toque`) y 8 px de aire. Así la separación con el botón es siempre de 8 px, se mida cuando se mida (con o sin hoja abierta), y nunca puede coincidir con «Registrar lugar» (que vive a la derecha, no debajo de esto).

**Comprobación pedida por el gestor, con `getBoundingClientRect()` real (Playwright + Chrome, mismo respaldo y token):**

| Estado | Atribución vs. botón | Atribución vs. «Registrar lugar» | Atribución vs. hoja |
| --- | --- | --- | --- |
| Sin hoja | sin solape (`y` 639–712 vs. botón 720–768) | sin solape (`x` 20–114 vs. «Registrar lugar» 192–370) | — |
| Con hoja (Teatro de la Paz, por búsqueda) | sin solape (botón y atribución suben juntos, misma separación de 8 px) | «Registrar lugar» se retira con la hoja abierta (ya lo hacía) | sin solape (atribución en `y` 515–588; hoja empieza en `y` ≈ 692) |

Capturas reales: `atribucion-mapbox--390x844.png` (sin hoja) y `atribucion-mapbox-con-hoja--390x844.png` (con la hoja de Teatro de la Paz, abierta por la búsqueda para no depender de acertar el píxel exacto del pin). Las dos abiertas antes de entregar.

**Límite honesto:** en el encuadre de esta captura, la ⓘ queda encima del pin y el nombre de «Centro Cultural Universitario Bicentenario» (un lugar del respaldo, no un control de la pantalla): es el mismo comportamiento que ya tenía la esquina inferior izquierda en producción antes de esta pieza (un control de Mapbox flotando sobre el contenido del mapa, no sobre otro control de la app) — el gestor pidió comprobar contra el botón, «Registrar lugar» y la hoja, no contra los pines, y con datos reales de producción (58 lugares, no 12) la posición de cada pin es otra.
