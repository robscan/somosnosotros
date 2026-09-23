# 30 · El color de acción: tres candidatos que inviten a la acción (OL-141)

**Estado:** propuesta, sin código. Espera la firma del founder. · **Fecha:** 2026-09-23 · **Bitácora:** 176 · **Prototipo:** `prototipos/mapa-lugares.html?color=actual|A|B|C` (capturas en `capturas-176/`).

## El problema, con números

El founder (2026-09-23): «Ahora es momento de replantear color primario de plataforma para usar en CTAs primarios: es aguado, parecido a eventos a donde voy. Propón color dinámico que invite a la acción».

Hoy el color de acción es el **azul petróleo `#0f6b7c`** (`--primario`, doc LINEA_GRAFICA «El color de acción») y lo ya decidido («✓ Voy», «Sigues», los seguidos del mapa) va en **verde `#1f6f43`** (`--ok`). Los dos se parecen por dos razones medibles:

| | matiz (HSL) | luminosidad | contraste entre los dos |
|---|---|---|---|
| Acción `#0f6b7c` | 189° (azul verdoso) | 27 % | 1,0 : 1 |
| Decidido `#1f6f43` | 147° (verde) | 28 % | |

Misma luminosidad, 42° de matiz de distancia, en la misma familia fría: a un vistazo, el botón que invita y la marca de lo ya hecho se confunden. Y un azul petróleo oscuro y poco saturado (78 % pero a 27 % de luz) es «aguado»: no llama.

## Qué tiene que cumplir el nuevo color

1. **Contraste**: texto blanco encima ≥ 4,5 : 1 (WCAG AA para texto normal) y, como texto o icono sobre el fondo de contenido `#f6f5f1`, también ≥ 4,5 : 1.
2. **Lejos del verde** de lo decidido (matiz a más de 60°), y lejos del **naranja** de los destacados `#d35400` (24°) y del **rojo** de error `#b3261e` (3°), que ya tienen su significado.
3. **Saturado y a media luz**: que se vea vivo sobre blanco y sobre el mapa.
4. Que siga funcionando en todo lo que hoy lleva `--primario`: botón primario, píldora de la navegación inferior, pestaña y chip activos, botón de ubicación activo, pin con evento esta semana, marca del renglón en escritorio.

## Los tres candidatos

Medido con la fórmula de WCAG 2 (luminancia relativa), sobre blanco `#ffffff` (igual para texto blanco encima) y sobre el fondo de contenido `#f6f5f1`:

| | hex | matiz | sobre blanco / texto blanco | sobre `#f6f5f1` | distancia al verde `--ok` | distancia al naranja | distancia al rojo |
|---|---|---|---|---|---|---|---|
| **Actual** · azul petróleo | `#0f6b7c` | 189° | 6,2 : 1 | 5,6 : 1 | 42° | 165° | 174° |
| **A** · azul cobalto | `#1256d6` | 219° | **6,3 : 1** | 5,8 : 1 | 72° | 165° | 144° |
| **B** · ciruela | `#a3286b` | 327° | **6,8 : 1** | 6,3 : 1 | 180° | 57° | 36° |
| **C** · violeta | `#6d34c8` | 264° | **7,1 : 1** | 6,5 : 1 | 117° | 120° | 99° |

Los tres pasan AA (y AAA para texto grande) con texto blanco encima y como texto sobre el fondo. Ninguno comparte familia con el verde.

- **A · Azul cobalto `#1256d6`.** El azul de «acción» que la gente ya conoce (enlaces, botones de casi todo); 72° del verde y a más de 140° del naranja y del rojo. Es el candidato más seguro: no cambia el carácter de la app, la despierta.
- **B · Ciruela `#a3286b`.** El más distinto del verde (180°) y el más «propio»; pero queda a 36° del rojo de error: un botón ciruela y un letrero de error se parecerían de lejos. Si el founder lo elige, conviene revisar `--error`.
- **C · Violeta `#6d34c8`.** El más vivo y con el mejor contraste; lejos de todo lo que ya tiene significado (99° o más). Es el más «dinámico»; el riesgo es que sea más marca que interfaz (en los mapas compite menos con el verde de los seguidos que el actual).

**Recomendación del operador:** A como primera opción por convención y seguridad; C si el founder quiere que la plataforma se sienta distinta. B solo con un ajuste del rojo de error. El founder decide.

## Qué cambia y qué no, cuando firme

- **Cambia** `--primario` (y `--primario-suave` pasa a derivarse: `color-mix(in srgb, var(--primario) 12%, white)`, como ya hace el prototipo) en `src/app/globals.css`, y el color literal del pin con evento en `src/components/Mapa.tsx` (Mapbox pide el hex; hoy lo lee con `colorDiseno("--primario")`). Todo lo demás hereda del token.
- **No cambia**: el verde de lo decidido (`--ok`), el naranja de los destacados, el rojo de error, la tinta del texto. Un mismo estado se distingue también por su marca (✓ Voy, «Sigues») y su texto, no solo por el color: importa para quien no distingue bien los matices, porque los cuatro colores tienen luminosidad parecida.

## El mapa: menos ruido (mismo pedido del founder)

«Quita doble círculo de lugares que sigo. Demasiado ruido visual; las diferencias entre tipos de lugar se establecen, como ya lo dijimos, por tamaño y color. Usa negro para lugares que no sigo y sin eventos.»

| lugar | tamaño | color |
|---|---|---|
| sin evento esta semana, no seguido | 10 px | tinta `#1a1a1a` |
| con evento esta semana (día encima) | 24 px | color de acción |
| destacado (que no sigo) | según tenga día | naranja `--destacado` |
| seguido | según tenga día | verde `--ok` (gana a destacado y a evento) |

Sin aro en ningún caso; el día nunca se esconde (OL-128). Está dibujado en el prototipo (capturas 01 y 02); en la app son dos expresiones de `circle-color` en `Mapa.tsx` y quitar la capa `lugares-aro` (doc 35, tabla de pines, se actualiza al firmar).
