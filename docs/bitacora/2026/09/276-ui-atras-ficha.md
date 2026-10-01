# 276 · Fichas desde 792: el Atrás sobre la portada (OL-248)

**Fecha:** 2026-09-30 · **Rama:** `ui-atras-ficha`, desde `origin/main` (`74fdca0d`) · **OL:** OL-248 · **PR:** por abrir, contra `main` (sin unir hasta el «publica» del founder) · **Quién:** el gestor de cambios III.

## Pedido

Founder, probando la reestructura en tableta y escritorio: «el botón de “atrás” dentro de las fichas de eventos y artistas, se pone a un lado derecho del de publicar, no se entiende. Colocarlo arriba de la imagen, en el extremo superior izquierdo, a la altura de la barra de filtros. es un cambio menor, ahorra tokens».

## Qué pasaba

Desde 792 la ficha no llevaba barra propia: le prestaba su Atrás y su menú a la barra de la app (`EnBarra` → `prestamoBarra`), que ponía el Atrás en el hueco junto al «+» (decisión de la séptima vuelta del prototipo, doc 50 § 11). Junto al «+» el Atrás se leía como parte de «publicar».

## Qué cambió

- `src/components/ui/Ficha.module.css`: desde 792, en vez de esconder la barra de la ficha, queda solo su Atrás (`> :not(:first-child)` oculto), quieto (`position: static`, sin volverse compacta ni cambiar de color) y sobre la portada, arriba a la izquierda, con el aire de los chips de la fila de contexto bajo la barra de la app (`--barra-arriba: var(--espacio-1)`). Lo mismo para la barra sólida de una ficha sin portada. Desde 1048 cae sobre la esquina de la portada, que ya deja su aire bajo la barra.
- `src/components/BarraApp.tsx`: ya no pinta el Atrás prestado; el hueco izquierdo sigue reservado (vacío) para que el logotipo no se mueva al pasar de una pantalla a otra. El menú «···» sigue igual, a la derecha.
- `EnBarra` y `prestamoBarra`: se quita `volver` del préstamo (nadie lo usaba ya); `BarraFicha` solo presta el menú. Comentarios al día en `BarraApp.module.css` y `BarraFicha`.
- `Armazon.componentes.test.mjs`: las dos pruebas de la barra desde 792 esperan el menú y ningún Atrás en la barra de la app.
- `scripts/ops/auditoria-ui/medidas.aceptadas.json`: +1 nodo a 820 y 1280 en `06-ficha-evento`, `07-ficha-lugar-4`, `08-ficha-lugar-5`, `09-ficha-artista` y `s06-ficha-evento-voy` (la barra de la ficha deja de estar oculta: su cabecera y su Atrás cuentan, y el Atrás de la barra de la app deja de contar).

## Medida

- Chromium (Chrome de la Mac, `playwright-core`), app compilada contra el respaldo local, 1280×800, ficha de evento y de artista: la barra de la ficha a `display: grid`, `position: static`, 48 de alto, en `y = 76` (bajo la barra de la app de 56 y el aire de 20 de la ficha en dos columnas); el Atrás, un círculo blanco de 48×48 en `x = 204` (el borde de la columna, donde empieza la portada) y ningún `Atrás` dentro de la barra de la app. A 820: el círculo arriba a la izquierda del héroe, en el borde de la columna (captura 276-02).
- `npm run lint`, `npm run typecheck`: verdes. `Armazon.componentes.test.mjs`: 17 de 17. `npm run inventario`: 344 medidas en duro, las mismas. `npm run medir`: con los cinco presupuestos subidos, 24 pantallas × 4 anchos, sin novedades.

## Capturas (`docs/rediseno/capturas-276/`)

1. **`276-01`** · producción, ficha de evento a 820×1180, antes: el Atrás en la barra de la app, pegado al «+».
2. **`276-02`** · la rama, la misma ficha (respaldo local) a 820: el Atrás en un círculo blanco sobre la esquina superior izquierda de la portada, bajo la barra de la app; el «+» solo a la izquierda de la barra.
3. **`276-03`** · producción, ficha de artista a 1280×800, antes: el Atrás junto al «+».
4. **`276-04`** · la rama, ficha de artista a 1280: el Atrás sobre la esquina de la portada (el símbolo SN), a la altura del principio de la columna; el menú «···» sigue en la barra de la app.

## Límites

- El respaldo local con `next start` a mano necesita compilar con el `.env.local` propio: la compilación que deja `npm run medir` lleva incrustada la dirección de su propio respaldo y, servida aparte, toda ficha sale como «Esto ya no está». Me pasó al capturar; se recompiló con el `.env.local` y ya.
- Sin migraciones ni variables de entorno. `.env.local` (sin llaves reales) y `.next` borrados al cerrar.
