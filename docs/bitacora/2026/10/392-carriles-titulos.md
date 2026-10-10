# 392 · Títulos de carril más grandes y nombres cortos (OL-361)

**Fecha:** 2026-10-09 · **Rama:** `carriles-titulos` · **Sin migración.**

## Pedido
Founder, 2026-10-09: «Me gustaría que los títulos de cada carril sean más grandes. Para esto sintetizar artistas con eventos esta semana y lugares con eventos esta semana. Puede ser artistas de la semana, Lugares de la semana. Además cambiar Festivales y expos.»

## Qué cambió
- `src/components/Destacados.module.css`: todos los títulos de carril de Inicio comparten `.destacados h2`; suben un escalón de la escala, de `--letra-xl` (19px) a `--letra-2xl` (26px, el siguiente token que ya existe; no se añadió ninguno). `min-width: 0` en el título y `flex: none` en el enlace: el título largo pasa a dos líneas y el enlace «Ver …» ni crece (sigue en `--letra-sm`, 15px) ni se encoge.
- `src/components/CarrilEsqueleto.module.css`: la barra del título del esqueleto sube de 20 a 28px (una línea de 26px × 1,1), para que no salte al cargar.
- Renombres: «Lugares con eventos esta semana» → «Lugares de la semana»; «Artistas con eventos esta semana» → «Artistas de la semana»; «Festivales y exposiciones» → «Festivales y expos». En `src/app/page.tsx`, `CarrilAgenda.tsx` (títulos, que también dan el nombre accesible del `<section>`), comentarios de `Inicio.tsx`, `inicio.ts`, `agendaPorClase.ts`, `buscarUnificado.ts`, `destacados.ts`, pruebas (`Inicio.componentes.test.mjs`, `agendaPorClase.test.ts`) y el fixture del respaldo. Los documentos de diseño y las bitácoras se quedan como estaban (historia).

## Medida (Chrome real, Bricolage cargada, respaldo local)
- 390: los cinco títulos del fixture a 26px y en una línea (29px de alto); el enlace empieza en x=263–275, el título más largo termina en x=227.
- 320: «Destacados» y «Esta semana» en una línea; «Lugares de la semana», «Artistas destacadxs» y «Artistas de la semana» pasan a dos líneas (57px) y terminan justo donde empieza el enlace, que lleva 8px de relleno a la izquierda: no chocan ni se truncan.
- El fixture no tiene Tus planes, Seleccionados, Festivales, Nuevos ni Más adelante; usan el mismo `.destacados h2`, así que se ven igual.

## Verificación
`npm run lint` (0 errores; 1 aviso previo en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (3441 pasan), `npm run inventario` (sin novedades), `npm run medir` (37 pantallas × 4 anchos, sin novedades; no hubo que tocar presupuestos), `Inicio.componentes.test.mjs` 8/8.

## Capturas (`docs/rediseno/capturas-392/`)
- `inicio-390.png`: Inicio a 390×844; «Destacados» y «Esta semana» más grandes, «Ver la agenda ›» igual que antes.
- `inicio-390-completa.png`: la pantalla entera a 390; los cinco carriles con sus títulos nuevos en una línea.
- `inicio-320.png`: Inicio a 320; los títulos de una palabra caben con su enlace.
- `inicio-320-completa.png`: la pantalla entera a 320; «Lugares de la semana», «Artistas destacadxs» y «Artistas de la semana» en dos líneas junto a su enlace (la barra de navegación fija sale a media altura por la captura de página completa).
