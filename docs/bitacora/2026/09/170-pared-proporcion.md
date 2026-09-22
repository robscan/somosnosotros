# 170 · Pincel: la pared mantiene su proporción 16:9 y solo se escala (OL-135)

**Fecha:** 2026-09-22 · **OL:** OL-135 · **Rama:** `pared-proporcion` desde `origin/main` (`e5aac18`), aparte de `pincel-borrar-fiable` (OL-134) · **Commit:** uno (local; el gestor sube y abre el PR). Sin migración. Sin council ni subagentes.

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

## Verificación

- `npm run typecheck` ✓ · `npm run lint` 0 errores (1 aviso previo en `docs/diseno/logotipo/iconos-sn.mjs`) · `npm test` 80 archivos, 1022/1022 ✓ (6 pruebas nuevas) · `npm run build` ✓.
- Chrome real (playwright-core con el Chrome de la Mac), respaldo local, con `?sonda=1`. El mismo dibujo (un cuadrado en coordenadas normalizadas ±0,5 — en la pared 16:9 es un rectángulo de 960×540 unidades —, una diagonal de aire y un punto de mando en el centro), medido con `getImageData`:
  - 1280×800: bitmap 1920×1080; marco `{left 0, top 40, 1280×720}`; escala 0,667; caja de lo pintado en pantalla 658,7×378,7 px (proporción 1,739); punto de mando en (640, 400), el centro del marco, de 18 px (27 unidades × 0,667).
  - Cambio de tamaño en vivo a 390×844 (misma pestaña): los mismos 65 632 píxeles pintados (nada se borra); marco `{left 0, top 312,3, 390×219,4}`; escala 0,203; caja 200,7×115,4 px, **la misma proporción 1,739**; punto en (195, 422), el centro, de 8 px (mínimo en pantalla).
  - Instantánea guardada: PNG de **1920×1080**, 65 KB. Recargada a 390×844: «instantánea de fondo: 65 KB», los mismos 65 632 píxeles y la misma proporción 1,739.
  - Instantánea vieja de 1280×800 (un círculo de 600 px) subida a mano y repuesta a 1280×800: caja 562,7×562,7 px, **proporción 1,000** (sigue siendo un círculo), centrada.

### Capturas reales (`docs/rediseno/capturas-170/`), abiertas y descritas

- `01-pared-1280x800.png`: la pared en una laptop; el rectángulo negro con la diagonal naranja y el punto naranja al centro, ocupando el ancho, con 40 px de fondo arriba y abajo; la sonda abajo a la izquierda, el QR arriba a la derecha.
- `02-pared-390x844-mismo-dibujo.png`: la misma pestaña estrechada a un teléfono vertical: el mismo dibujo, con la misma proporción, en una franja 16:9 centrada a media altura, fondo liso arriba y abajo; el título y el QR arriba, la sonda abajo.
- `03-pared-390x844-instantanea-repuesta.png`: la pared recargada en el teléfono: el dibujo repuesto desde la instantánea 1920×1080, igual que en la 02, con «instantánea de fondo: 65 KB» en la sonda.
- `04-instantanea-vieja-1280x800-encajada.png`: la pared en la laptop con una instantánea vieja de 1280×800: el círculo verde sigue redondo, centrado en el área 16:9.

## Límites

- Prueba con el respaldo local y Chrome; en producción no cambia nada del lado del servidor. Lo que solo puede confirmar el founder: la pared en su pantalla vertical y en el cañón.
- Con el lienzo a 1920 de ancho, en un teléfono (390 px) el trazo fino a grosor 1 se ve de 0,6 px: es la consecuencia de «el grosor escala con el lienzo». Si el founder quiere un grosor mínimo en pantalla, es un ajuste de una línea.
- El área 16:9 no lleva borde ni color propio (margen del color de fondo, según lo decidido); en un teléfono no se distingue dónde acaba la pared. Si hiciera falta, un marco sutil es otra línea de CSS.

## Archivos

`src/lib/pincel.ts`, `src/lib/pincel.test.ts`, `src/app/obra/[id]/pared/Pared.tsx`, `src/app/obra/[id]/pared/pared.module.css`, `src/app/admin/obras-colectivas/obras.module.css`, `docs/rediseno/capturas-170/` (4 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.
