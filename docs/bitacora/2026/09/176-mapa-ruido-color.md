# 176 · Mapa con menos ruido y color primario que invite a la acción (OL-141, E5) — prototipo y propuesta

**Fecha:** 2026-09-23 · **OL:** OL-141 · **Rama:** `mapa-ruido-color` desde `origin/main` (`b62c8ef`) · **Commit:** uno (local; el gestor sube y abre el PR). Solo prototipo y documento: **sin código hasta que el founder firme.** Esfuerzo medio. Sin council ni subagentes.

## Lo que dijo el founder (literal)

«Quita doble círculo de lugares que sigo. Demasiado ruido visual; las diferencias entre tipos de lugar se establecen, como ya lo dijimos, por tamaño y color. USA negro para lugares que no sigo y sin eventos. Ahora es momento de replantear color primario de plataforma para usar en CTAs primarios: es aguado, parecido a eventos a donde voy. Propón color dinámico que invite a la acción».

## Lo leído antes

La bitácora 163 (OL-128: dos tamaños, 24 y 10 px; verde de «Sigues» y aro para los seguidos; el día nunca se esconde), los pines reales en `src/components/Mapa.tsx` (`circle-color` por `privado`/`seguido`, capa `lugares-aro` solo para seguidos, `RADIO_MEDIANO`/`RADIO_PEQUENO`), `VistaLugares.tsx` (seguidos y destacados llegan por separado) y `docs/diseno/LINEA_GRAFICA.md` («El color de acción»: azul petróleo `#0f6b7c`).

## 1. El mapa: pines sin doble círculo, por tamaño y color

`docs/rediseno/prototipos/mapa-lugares.html`, los cuatro estados de siempre:

| lugar | tamaño | color |
|---|---|---|
| sin evento esta semana, no seguido | 10 px | tinta `#1a1a1a` (nombre en tinta) |
| con evento esta semana | 24 px con el día | color de acción |
| destacado que no sigo | según tenga día | naranja `--destacado` (nombre en `--destacado-texto`) |
| seguido | según tenga día | verde `--ok`; gana a destacado y a evento |

Sin aro en ningún caso (se quita el `.borde` y su regla). El orden de dibujo sigue igual (seguidos encima, luego con día). En la app sería: quitar la capa `lugares-aro`, `circle-color` con tinta por defecto y color de acción solo con día, y el naranja del destacado (hoy no se pinta) — pendiente de la firma.

## 2. El color de acción: tres candidatos (`docs/rediseno/30-color-primario.md`)

Por qué se parece al verde: misma luminosidad (27 % y 28 %), 42° de matiz de distancia, misma familia fría; contraste entre los dos 1,0 : 1. Los candidatos, medidos con WCAG 2 (texto blanco encima = sobre blanco; y sobre el fondo de contenido `#f6f5f1`):

| | hex | matiz | texto blanco / sobre blanco | sobre `#f6f5f1` | del verde | del naranja | del rojo |
|---|---|---|---|---|---|---|---|
| Actual · azul petróleo | `#0f6b7c` | 189° | 6,2 : 1 | 5,6 : 1 | 42° | 165° | 174° |
| A · azul cobalto | `#1256d6` | 219° | 6,3 : 1 | 5,8 : 1 | 72° | 165° | 144° |
| B · ciruela | `#a3286b` | 327° | 6,8 : 1 | 6,3 : 1 | 180° | 57° | 36° |
| C · violeta | `#6d34c8` | 264° | 7,1 : 1 | 6,5 : 1 | 117° | 120° | 99° |

Los tres pasan AA con texto blanco y como texto sobre el fondo. Recomendación del operador: A por convención y seguridad; C si el founder quiere que la plataforma se sienta distinta; B solo con un ajuste del rojo de error (a 36°). Cuando firme: cambia `--primario` (y `--primario-suave` pasa a derivarse con `color-mix`), el pin con evento del mapa hereda; el verde, el naranja, el rojo y la tinta no cambian.

En el prototipo, `?color=actual|A|B|C` pone el color y abre un muestrario en el primer teléfono con lo mismo en cada captura: botón primario «Publicar», píldora de la navegación, chip activo, pin con evento «Hoy», y al lado lo que ya es verde («✓ Voy» y un pin seguido «Vie»), con el hex y el actual de referencia.

## Verificación

- Solo prototipo y documentos: sin cambios en `src/`. `npm run lint` y `npm run typecheck` no aplican al HTML; el prototipo carga sin errores de página en Chrome real (`pageerror` vacío). `package.json` y lock intactos; sin `.env`.
- Capturas reales 390×844 (elemento `.telefono`, Chrome real vía playwright-core en el scratchpad de la sesión, `document.fonts.check('16px "Bricolage Grotesque"')` = `true`; medido en cada una: 0 aros; colores por pin: 5 en tinta, 4 en color de acción con día, 1 naranja (Centro de las Artes), 2 verdes (Museo Federico Silva, MUNI)).

### Capturas reales (`docs/rediseno/capturas-176/`), abiertas y descritas

- `01-mapa-sin-ubicacion-pines-sin-aro.png`: el encuadre inicial: los pines con día grandes y de color de acción (Teatro de la Paz «Hoy», Casa de Cultura del Barrio de Tlaxcala «Jue», Museo Laberinto «Sáb», CCUB «Mié»), el Centro de las Artes en naranja con «Hoy», el MUNI verde con «Vie», el Museo Federico Silva verde pequeño, y en tinta los puntos pequeños sin evento (Cineteca, Casa del Poeta, Ferrocarril, IPBA, Soledad). Ningún aro.
- `02-mapa-seguidos-por-tamano-y-color.png`: el estado «seguidos» del prototipo (el mismo dibujo: la regla vale en todos los estados); los seguidos se distinguen solo por el verde, sin aro. El pie con la explicación queda fuera del teléfono capturado.
- `03-color-actual-azul-petroleo.png`: el muestrario con el color de hoy: botón «Publicar», píldora, chip «Todos · 58» y pin «Hoy» en azul petróleo, junto a «✓ Voy» y el pin seguido en verde: se ve por qué se confunden.
- `04-color-A-azul-cobalto.png`: lo mismo en azul cobalto `#1256d6`: el botón y los pines con evento se despegan del verde.
- `05-color-B-ciruela.png`: lo mismo en ciruela `#a3286b`.
- `06-color-C-violeta.png`: lo mismo en violeta `#6d34c8`.

## Límites

- El mapa del prototipo es un dibujo (sin Mapbox); en la app los colores de los pines los pone `Mapa.tsx` con hex literales leídos de los tokens.
- La distancia de matiz no sustituye una prueba con el founder en su iPhone bajo el sol; por eso una captura por color, para comparar.

## Archivos

`docs/rediseno/prototipos/mapa-lugares.html`, `docs/rediseno/30-color-primario.md`, `docs/rediseno/capturas-176/` (6 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.
