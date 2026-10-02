# 281 · La flecha de la ficha baja la hoja a recogida (OL-254)

**Fecha:** 2026-10-01 · **Rama:** `ficha-hoja-bajar`, desde `origin/main` (`122fc10f`) · **OL:** OL-254 · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows.

Reporte del founder (iPhone): en Lugares, con la ficha de un lugar en la hoja llena, el botón Atrás no bajaba la hoja a media. Su decisión: ese botón lleva un chevron hacia abajo y manda la hoja a **recogida** (la cabecera de la ficha), no a media.

## Causa (en una frase)

Al soltar el dedo, la hoja se pone en «inercia» (`enInercia`) y la limpia solo cuando se queda quieta 140 ms; el toque al botón termina justo antes del clic, así que el movimiento que pide el botón arranca con la inercia aún puesta y `pintar` lo toma por la inercia de una lista que baja de llena: devuelve la hoja a llena con un `scrollTop = llena` en cada cuadro. El botón no hacía nada.

Era la misma causa para cualquier `irA` desde llena (también `recoger` si hubiera un dedo reciente sobre la hoja y el asa). No era el gesto de mapa de OL-249 ni el `scroll-snap`: con un clic de ratón la prueba existente pasaba, porque no hay `touchend`. Se reprodujo con un toque real (`tap()` de Playwright, que manda `touchstart`, `touchend` y clic) tras subir la hoja con la rueda: se quedaba en `llena`.

## Cambio

- `HojaLugares.tsx`: `irA` pone `enInercia.current = false` antes de mover la hoja (un movimiento pedido no es la inercia de un dedo). Raíz, no parche del botón. Se corrige el comentario de `Manejo.irA`.
- `FichaHoja.tsx`: el botón usa `IconoCaret` (chevron abajo), `aria-label="Bajar la ficha"` y `irA("recogida")`; la clase `.atras` pasa a `.bajar` (`FichaHoja.module.css`). Se ve igual que antes: solo con la hoja llena (donde antes estaba Atrás, a la izquierda, en lugar de la ✕). No se cambia la visibilidad. Comentarios de ambos archivos al día.
- Sin cambios de medidas ni de tokens: el botón es el mismo `BotonIcono` de acción, solo cambia el glifo.

## Pruebas

- `HojaLugares.componentes.test.mjs`: la prueba de la ficha usa la flecha (llena → recogida, la ficha sigue abierta, ya no vuelve a media) y una nueva con toque real (`tap`): hoja llena y desplazada, toque a «Bajar la ficha», queda en recogida con su cabecera de 76. Comprobado que **falla sin el arreglo** (`llena` en vez de `recogida`) y pasa con él.
- `npm run lint`, `typecheck`, `test`, `inventario` y `medir` (sin novedades, sin tocar presupuestos); `test:componentes` 208 de 208.

## Evidencia

Build local contra el respaldo de datos inventados, Chrome 390×844 con toque y subida de la hoja con gestos reales de dedo, en `docs/rediseno/capturas-281/`:

- `ficha-llena-con-flecha-abajo.png`: la ficha del Teatro de la Paz en la hoja llena; arriba a la izquierda el chevron hacia abajo en la cabecera compacta, junto al título «Teatro de la Paz» y el menú «···»; debajo, la lista de eventos, el mapa «Dónde», «Sobre el lugar» y la pastilla «Seguir» abajo.
- `ficha-recogida-tras-tocar.png`: tras tocar el chevron, la hoja queda recogida: el mapa a pantalla casi completa con el pin «Dom» del teatro, y abajo solo la cabecera de la ficha (asa, ✕, título y «···») sobre la barra de navegación. La ficha no se cerró.
