# 060 · La ✕ de cerrar, dibujada como icono

**Fecha:** 2026-09-16 (noche) · **Base:** hallazgo al probar el flujo de avisos en el simulador (iPhone 15 Pro, iOS 26.3): la ✕ de la hoja que sale tras tocar "Voy" se dibujaba como un cuadro con un signo de interrogación · **Rama:** `x-de-cerrar-icono`.

## Qué pasó
- Ocho piezas escribían la ✕ como letra (el carácter U+2715). Safari del simulador no la encuentra en ninguna fuente y pinta el cuadro de "letra que falta".
- **Confirmado antes de tocar nada**, en somosnosotros.org sin sesión: Lugares → Lista → "Cerca de mí" sin permiso de ubicación. El aviso "No pudimos leer tu ubicación…" salió con el cuadro en lugar de la ✕.
- **La causa no es de la app.** Un banco de prueba local mostró el mismo cuadro:
  - con la letra de la app, sin el eje de ancho, con la letra del sistema y sin tamaño óptico;
  - y también en un emoji (🎶).
  Las fuentes que traen esos caracteres sí están en el simulador (AppleColorEmoji, ZapfDingbats, AppleSymbols), pero su Safari no las usa. En un iPhone real probablemente se veía bien; no se pudo comprobar desde aquí.
- Aun así el cambio vale: el icono no depende de las fuentes del teléfono, se ve igual en todos lados y es el mismo que ya usan Cerrar, Limpiar y el buscador.

## Qué se hizo
- **La ✕ de texto pasa a `IconoCerrar`** (el SVG de `ui/Iconos`) en las ocho piezas:
  - `ui/Hoja` (todas las hojas, también la de avisos);
  - `ui/Aviso`;
  - `Cartel` (visor de la portada o el cartel);
  - `AgendaInicio` (quitar la fecha);
  - `VistaLugares` (chip "Cerca de mí");
  - `SelectorCuando` (quitar la hora de fin);
  - `SelectorQuien` (fichas de quién se presenta);
  - `SelectorEnlaces` (quitar un enlace).
- **Del tamaño que tenía la letra.** La ✕ de texto mide unos 0,7 em de trazo; el icono ocupa 14/24 de su caja. Por eso:
  - 22 px donde la letra iba a 19 px (hoja y visor);
  - 20 px donde iba a 17 px (Termina);
  - 18 px donde iba a 15 px (aviso, chips, fichas y enlaces).
- **Área de toque igual.** Ningún botón cambia de ancho ni de alto. Solo centran el icono (`display: grid; place-items: center`) y pierden el `font-size` o `font-weight` que ya no hacía nada.
- **Maquetación.** Salen dos `span` que solo envolvían la letra (chip "Cerca de mí" y fichas de Quién): el SVG va directo, sin envoltorios nuevos.
  - En esos dos sitios, los márgenes descuentan el aire interno del icono para que la ✕ quede donde estaba.
  - En el chip, la clase va dos veces para pesar más que el margen que `ui/Chip` da a sus iconos (el mismo recurso que `ui/Limpiar`).
- Los `aria-label` no cambian; los SVG llevan `aria-hidden`.

## Evidencia
- lint, typecheck, 178 pruebas y build en verde.
- **Simulador iPhone 15 Pro, iOS 26.3.** Antes y después en el mismo estado, contra `next dev` local con los datos de producción. Cada captura se miró entera y luego se midió (en puntos):

| Pieza | Antes | Después |
|---|---|---|
| Hoja "Dónde" | cuadro 28,7 a la izquierda del centro de su botón | ✕ de 12,7, en el centro exacto del botón de 44 |
| Aviso de ubicación | cuadro 13,5 a la izquierda | ✕ de 10,7, centrada; la caja del aviso no se mueve |
| Visor de la portada | cuadro 11 a la izquierda | ✕ de 12,7, centrada; el círculo sigue en 44 |
| Chip "Cerca de mí" | cuadro y un hueco sobrante | ✕ de 10,7, centrada en alto; 14,0 al borde (con la letra, 13,5) |
| Agenda con fecha | cuadro y un hueco sobrante | ✕ de 10,7; su centro a 21,2 del borde (con la letra, 21) |
| Termina (alta de evento) | cuadro; el botón se ensanchaba | ✕ de 11,3 en el centro de su botón de 44 |
| Fichas de Quién | cuadro; las fichas bajaban a dos filas | ✕ de 10,7; caben en una fila; a 19,2 y 18,5 del borde (con la letra, 18,8) |
| Enlaces | cuadro | ✕ de 10,7 en el centro de su botón de 48 |

- **Chromium a 375 px** (donde la letra sí se dibuja):
  - los botones miden lo mismo antes y después: 44 × 44, 48 × 48 y "Quitar la fecha" 32 × 40;
  - las fichas de Quién miden 199,3 y 114,5 px (antes, 198,8 y 113,9);
  - la ✕ de la hoja cierra la hoja, la del aviso cierra el aviso y la de la fecha la quita.
- Las tres piezas de las altas se vieron en una página de prueba local (`src/app/prueba-x`), borrada antes del commit, para no crear cuentas en producción.
- El simulador quedó como estaba: permiso de ubicación de Safari sin decidir y sin ubicación simulada.

## Queda
- "Quitar la fecha" de la agenda mide 32 × 40 px, por debajo de los 44. Ya era así (los chips de la cabecera miden 40 de alto) y no se tocó.
- Este simulador tampoco dibuja emoji: no sirve para revisar textos con emoji.
- Al verificar se vio que los eventos a la misma hora cambian de orden entre cargas: la consulta de la agenda ordena solo por `inicio`. Va como tarea aparte.

## Firma
Pendiente del founder en el iPhone.
