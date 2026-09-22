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

- Revisión del gestor.
- Prueba del founder en su iPhone (Safari): que el día no se esconda al hacer pellizco, que el pin se sienta compacto y no apretado, y que el verde de los seguidos se lea bien sobre el mapa.
