# 170 · Pincel: la pared mantiene su proporción 16:9 y solo se escala (OL-135)

**Fecha:** 2026-09-22 · **OL:** OL-135 · **Rama:** `pared-proporcion` desde `origin/main` (`e5aac18`); después, unión de `origin/main` con OL-134 ya en producción (`16bd3e7`) y el trazo mínimo de 1 px pedido por el gestor · **Commits:** tres (la pieza, la unión y el mínimo; locales, el gestor sube y abre el PR). Sin migración. Sin council ni subagentes.

## Lo que dijo el founder (literal)

«Como lo abrí en un formato de pantalla vertical, se deformó el dibujo, eso no debe pasar, que mantenga aspect ratio y solo se escale.»

**Decisión del gestor (anotada en OPEN_LOOPS):** la pared tiene proporción fija 16:9 (una proyección); el lienzo se escala entero para caber en la ventana, centrado, y lo que sobra es margen del color de fondo; la instantánea se guarda y se repone en esa misma proporción (nunca estirada; una vieja con otra proporción se dibuja centrada conservando la suya); las posiciones normalizadas del mando se pintan sobre esa área 16:9, no sobre toda la ventana; el cursor y el grosor escalan con el lienzo.

## Causa

El lienzo era la ventana entera: el bitmap medía `clientWidth × clientHeight` (× devicePixelRatio) y las posiciones normalizadas (−1..1) se repartían sobre ese ancho y ese alto. En una pantalla vertical la X se comprimía y la Y se estiraba; la instantánea (un PNG al tamaño de la ventana donde se pintó) se dibujaba estirada al tamaño de la ventana nueva; y, de paso, cada cambio de tamaño ponía `lienzo.width` de nuevo, que borra el bitmap.

## Cambio

- **Unidades fijas.** `LIENZO = { ancho: 1920, alto: 1080 }` (`pincel.ts`). El bitmap del lienzo mide siempre eso; posiciones (`puntoEnPared`, `siguientesSegmentos`), trazos, grosor (`ANCHO_POR_GROSOR_PX` en unidades del lienzo), puntos de mando, «borrar» e instantánea viven ahí.
- **Encaje.** `encajar(ancho, alto, anchoMarco, altoMarco)` devuelve el rectángulo más grande con esa proporción que cabe en el marco, centrado (sin área → vacío); `rectanguloDelLienzo(anchoVentana, altoVentana)` es el encaje de LIENZO en la ventana. Pruebas puras: 1280×800 → 1280×720 con 40 px arriba y abajo; 390×844 → 390×219,375 centrado (top 312,3); 1920×1080 exacto; 2000×1080 → margen de 40 px a los lados; una instantánea 1280×800 dentro del lienzo → 1728×1080 con 96 px a los lados; sin área → rectángulo vacío.
- **La pared (`Pared.tsx`, `pared.module.css`).** Un `div.marco` absoluto dentro de `.pared` recibe `left/top/width/height` de `rectanguloDelLienzo(innerWidth, innerHeight)` (estado `marco`, medido al montar y en cada `resize`; hasta la primera medida, la ventana entera); dentro van el `canvas` (100 %) y los puntos de mando, cuyas coordenadas y diámetro se multiplican por `escala = marco.width / 1920` (el diámetro no baja de `DIAMETRO_PUNTO_MIN_PX` = 8 px en pantalla, para que siga viéndose en un teléfono: mi ajuste sobre «el cursor escala con el lienzo», por visibilidad). Cambiar de tamaño ya no toca el bitmap: nada se borra.
- **Instantánea.** Se sube el bitmap tal cual (`toBlob` / `toDataURL`, 1920×1080, sin volver a muestrear); al reponerla se dibuja con `encajar(imagen.width, imagen.height, 1920, 1080)`: la de 1920×1080 llena el lienzo, una vieja con otra proporción va centrada sin estirarse.
- **Miniatura de Administración.** `aspect-ratio: 16 / 9` y `object-fit: contain` (antes 16/10, que estiraba).
- **Trazo mínimo de 1 px en pantalla (gestor, tras la entrega).** `ANCHO_TRAZO_MIN_PX = 1` y `anchoEnLienzo(anchoUnidades, escala)` = el mayor entre el ancho en unidades y `1 / escala`; `trazarSegmento` lo aplica a los cuatro pinceles (línea, aire, gotas del spray y elipses del orgánico) con la escala del momento (`escalaRef`). Igual que el mínimo del punto, pero este queda en el bitmap: una pared que se ve en un teléfono guarda sus trazos finos con ese ancho (4,9 unidades a 390 px de ancho, 3 en una laptop de 1280). El área 16:9 sigue sin borde, por ahora (gestor: lo anota para el founder).

## Unión con `origin/main` (OL-134 en producción)

Merge de `16bd3e7` en `pared-proporcion`, resuelto a mano en `Pared.tsx` conservando las dos cosas: la lectura de `borrado_pared_en` + lista del bucket + `instantaneaVigente` (OL-134) y el `drawImage` con `encajar(imagen.width, imagen.height, LIENZO.ancho, LIENZO.alto)` (OL-135); el `clearRect` de `revisarBorrado` en unidades del lienzo; sin el `resize` del bitmap (OL-135 lo quitó). En `OPEN_LOOPS.md`, todo lo de main con OL-135 al frente de «Ahora» y su trozo al frente de «Last updated». Tras la unión, los cuatro casos de OL-134 repetidos con el respaldo: viva → «borrar (canal)» y 0 píxeles; cerrada al borrar y reabierta → 0 píxeles y «sin instantánea (Administración borró la pared)», miniatura fuera; sin aviso → 0 píxeles a los 6,5 s; instantánea vieja en el bucket → «no se repone». Y la proporción, igual que antes (abajo).

## Verificación

- `npm run typecheck` ✓ · `npm run lint` 0 errores (1 aviso previo en `docs/diseno/logotipo/iconos-sn.mjs`) · `npm test` 80 archivos, 1030/1030 ✓ tras la unión (antes de ella 1022/1022; 6 pruebas nuevas de encaje y 3 del trazo mínimo) · `npm run build` ✓ (antes y después de la unión).
- Chrome real (playwright-core con el Chrome de la Mac), respaldo local, con `?sonda=1`, repetido tras la unión (las cifras de abajo son las de la primera pasada; en la segunda, con una línea fina más en el dibujo, la proporción es 1,43 en los dos tamaños y los píxeles conservados 72 842). El mismo dibujo (un cuadrado en coordenadas normalizadas ±0,5 — en la pared 16:9 es un rectángulo de 960×540 unidades —, una diagonal de aire, una línea fina de grosor 1 y un punto de mando en el centro), medido con `getImageData`:
  - 1280×800: bitmap 1920×1080; marco `{left 0, top 40, 1280×720}`; escala 0,667; caja de lo pintado en pantalla 658,7×378,7 px (proporción 1,739); punto de mando en (640, 400), el centro del marco, de 18 px (27 unidades × 0,667).
  - Cambio de tamaño en vivo a 390×844 (misma pestaña): los mismos 65 632 píxeles pintados (nada se borra); marco `{left 0, top 312,3, 390×219,4}`; escala 0,203; caja 200,7×115,4 px, **la misma proporción 1,739**; punto en (195, 422), el centro, de 8 px (mínimo en pantalla).
  - Instantánea guardada: PNG de **1920×1080**, 65 KB. Recargada a 390×844: «instantánea de fondo: 65 KB», los mismos 65 632 píxeles y la misma proporción 1,739.
  - Instantánea vieja de 1280×800 (un círculo de 600 px) subida a mano y repuesta a 1280×800: caja 562,7×562,7 px, **proporción 1,000** (sigue siendo un círculo), centrada.
  - Trazo mínimo: una línea de grosor 1 dibujada a 1280 px mide 3 unidades (2 filas con alfa > 50 %) y en el teléfono se ve de 0,6 px, discontinua; la misma línea dibujada ya a 390 px mide 4,9 unidades (4 filas) y se ve de 1 px, continua.

### Capturas reales (`docs/rediseno/capturas-170/`), abiertas y descritas

- `01-pared-1280x800.png`: la pared en una laptop; el rectángulo negro con la diagonal naranja, una línea fina horizontal bajo el rectángulo (grosor 1, unida al rectángulo por el segmento de continuidad del mismo mando) y el punto del mando; ocupa el ancho, con 40 px de fondo arriba y abajo; la sonda abajo a la izquierda, el QR arriba a la derecha.
- `02-pared-390x844-mismo-dibujo.png`: la misma pestaña estrechada a un teléfono vertical: el mismo dibujo, con la misma proporción, en una franja 16:9 centrada a media altura, fondo liso arriba y abajo; el título y el QR arriba, la sonda abajo. Debajo del rectángulo, las dos líneas finas: la dibujada a 1280 se ve discontinua (0,6 px) y la dibujada ya a 390, continua (1 px, el mínimo).
- `03-pared-390x844-instantanea-repuesta.png`: la pared recargada en el teléfono tras la unión con OL-134: el dibujo repuesto desde la instantánea 1920×1080, igual que en la 02, con «instantánea de fondo: 87 KB (subida 5:27:38 p.m.)» en la sonda — el arranque lee el borrado y el fondo y encaja la imagen.
- `04-instantanea-vieja-1280x800-encajada.png`: la pared en la laptop con una instantánea vieja de 1280×800: el círculo verde sigue redondo, centrado en el área 16:9.

## Límites

- Prueba con el respaldo local y Chrome; en producción no cambia nada del lado del servidor. Lo que solo puede confirmar el founder: la pared en su pantalla vertical y en el cañón.
- El trazo mínimo de 1 px queda en el bitmap: lo que se pinte mientras la pared se ve en un teléfono se guarda con ese ancho (4,9 unidades) y en el cañón se verá un poco más grueso que lo pintado allí (3 unidades). Es el precio de no guardar trazos.
- El área 16:9 no lleva borde ni color propio (margen del color de fondo, según lo decidido); en un teléfono no se distingue dónde acaba la pared. El gestor lo anota para el founder; es una línea de CSS.

## Archivos

`src/lib/pincel.ts`, `src/lib/pincel.test.ts`, `src/app/obra/[id]/pared/Pared.tsx`, `src/app/obra/[id]/pared/pared.module.css`, `src/app/admin/obras-colectivas/obras.module.css`, `docs/rediseno/capturas-170/` (4 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.
