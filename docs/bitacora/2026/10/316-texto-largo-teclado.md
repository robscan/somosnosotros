# 316 · El editor de texto largo con el teclado de iOS

**Pieza:** OL-288. **Rama:** `texto-largo-teclado` (base `origin/main` `409bae04`). **Fecha:** 2026-10-05.
**Estado:** arreglo verificado por el gestor en el simulador (iPhone 15 Pro, iOS 26.3, teclado real); segunda vuelta por la franja inferior, probada en Chromium; falta confirmar esa franja en el simulador.

## Defecto

Medido por el gestor en Safari (iPhone 15 Pro, iOS 26.3), bitácora 314: en «Editar novedad», con el teclado ya abierto por «Título», al tocar
«Texto (opcional)» se abre `ui/CampoLargo`. Su capa era `position: fixed; inset: 0`, anclada a la ventana de maquetación, que el teclado dejó
desplazada. La cabecera (título, contador, «Listo») y el inicio del texto quedaban arriba, fuera de la vista: una pantalla en blanco sobre
el teclado hasta arrastrar hacia abajo. Afecta a todo formulario que use CampoLargo.

## Causa

`position: fixed` mide contra la ventana de maquetación, no contra el área visible. `ui/Hoja` ya lo resolvía con `window.visualViewport`;
CampoLargo no.

## Arreglo

- Nuevo hook `src/components/ui/useAreaVisible.ts`, extraído tal cual de `Hoja` (misma condición: alto distinto de la ventana en más de 1 px u
  `offsetTop > 0`; escucha `resize` y `scroll` del visualViewport; `null` sin teclado o sin visualViewport). Parámetro `activo` para que
  CampoLargo solo escuche mientras está abierto. `Hoja.tsx` lo usa en lugar de su efecto propio; su salida (`top`, `height`, `ventana`) y su CSS no cambian.
- `CampoLargo.tsx`: con área visible, la capa lleva `top` = offsetTop; la cabecera queda arriba de lo visible y el área de texto (`flex: 1`) ocupa el resto hasta el teclado (primera versión: `height` = alto visible; ver la segunda vuelta). Sin área visible, el CSS de siempre (`inset: 0`). Sin cambios de CSS ni tokens nuevos.
- Al abrir, el cursor va al final del texto (`setSelectionRange(largo, largo)`) y el área se desplaza a esa posición (`scrollTop = scrollHeight`).
- Cierre («Listo»): no se fuerza ningún scroll de la página. La capa solo se desmonta; la página no se movía mientras estuvo abierta (la capa es `fixed`).
  Si iOS deja la página desplazada al bajar el teclado, es su reajuste nativo y está por verificar en el iPhone.

## Evidencia del simulador (gestor, `docs/rediseno/capturas-316/`, 1179×2556, abiertas una por una)

- `antes-titulo-con-teclado.png`: «Editar novedad» con el teclado abierto por «Título (opcional)»; el campo tiene el foco, el renglón «Texto (opcional)» muestra «Un adelanto del programa de noviembre.» y debajo se ve «Guardar cambios» tras la barra flotante de flechas de iOS 26. Es el punto de partida del defecto.
- `texto-largo-cabecera-visible-franja.png`: tras el primer arreglo. Arriba, cabecera «Texto (opcional)» y «Listo»; el cursor está al final de «Un adelanto del programa de noviembre.». Funciona. Defecto que queda: entre el borde inferior de la capa y el teclado (unos 100 puntos) se ve la página de debajo («Título (opcional)» y parte del video) detrás de la barra de flechas y de la píldora «localhost», porque `visualViewport.height` termina antes de esa barra translúcida.
- `tras-listo.png`: después de «Listo»; la página sigue en su sitio, con el video, «Título (opcional)», el renglón «Texto (opcional)» y «Guardar cambios».

## Segunda vuelta: la franja inferior

La capa mide ahora `top` = offsetTop y `height` = alto de la ventana, con `paddingBottom` = ventana − alto visible (el mismo enfoque que el `::after` de `Hoja`). El blanco llega hasta abajo de la ventana, pasando por detrás de la barra translúcida; cabecera y área de texto ocupan exactamente el alto visible, de modo que el texto sigue terminando sobre el teclado. Sin medidas en duro: todo sale del visualViewport.

## Pruebas

- Nueva `src/components/ui/CampoLargo.componentes.test.mjs` (6 casos, Chromium 390×844): sin teclado la capa mide `[0, 844]` y el cursor queda
  en 10/10 de 10 caracteres; con visualViewport simulado de 508 de alto y offsetTop 43 la capa arranca en 43, su blanco llega al menos a 844 (final de la ventana) y es opaco, la cabecera empieza en 43 y el área de texto
  termina en 551; el caso del teclado ya abierto antes de tocar el renglón; texto de 60 líneas con cursor al final y última línea a la vista (con y sin teclado);
  sin `visualViewport` no hay estilo en línea; «Listo» cierra, el valor viaja en el campo oculto y `scrollY` sigue en 0.
- Control negativo (primera versión): sin el estilo en línea fallan los casos 2, 3 y 4 (pasan 3, fallan 3).
- `Hoja.componentes.test.mjs` sin cambios: 11 de 11 verdes; con la nueva, 17 de 17.
- `npm run lint`: 0 errores (1 aviso previo en `VisorImagen.componentes.test.mjs`). `npm run typecheck` verde. `npm run inventario`: sin novedades (medidasEnDuro 344 = aceptado 344).
- No se corrió la suite completa (regla de costo del 2026-09-18) ni el simulador de iOS.

## Falta verificar en el simulador o iPhone (gestor)

Con el teclado real, además de la franja (que no se vea la página entre el texto y el teclado): abrir «Editar novedad», tocar «Título», luego «Texto (opcional)»: cabecera visible arriba, cursor al final y texto sobre el teclado sin arrastrar;
«Listo» y comprobar que la página queda donde estaba. Repetir en un formulario de lugar o artista (CampoLargo sin controlar).
