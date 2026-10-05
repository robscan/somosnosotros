# 316 · El editor de texto largo con el teclado de iOS

**Pieza:** OL-288. **Rama:** `texto-largo-teclado` (base `origin/main` `409bae04`). **Fecha:** 2026-10-05.
**Estado:** arreglo probado en Chromium con un visualViewport simulado; falta la verificación con el teclado real del iPhone.

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
- `CampoLargo.tsx`: con área visible, la capa lleva `top` = offsetTop, `height` = alto visible y `bottom: auto`; la cabecera queda arriba de
  lo visible y el área de texto (`flex: 1`) ocupa el resto hasta el teclado. Sin área visible, el CSS de siempre (`inset: 0`). Sin cambios de CSS ni tokens nuevos.
- Al abrir, el cursor va al final del texto (`setSelectionRange(largo, largo)`) y el área se desplaza a esa posición (`scrollTop = scrollHeight`).
- Cierre («Listo»): no se fuerza ningún scroll de la página. La capa solo se desmonta; la página no se movía mientras estuvo abierta (la capa es `fixed`).
  Si iOS deja la página desplazada al bajar el teclado, es su reajuste nativo y está por verificar en el iPhone.

## Pruebas

- Nueva `src/components/ui/CampoLargo.componentes.test.mjs` (6 casos, Chromium 390×844): sin teclado la capa mide `[0, 844]` y el cursor queda
  en 10/10 de 10 caracteres; con visualViewport simulado de 508 de alto y offsetTop 43 la capa mide `[43, 551]`, la cabecera empieza en 43 y el área de texto
  termina en 551; el caso del teclado ya abierto antes de tocar el renglón; texto de 60 líneas con cursor al final y última línea a la vista (con y sin teclado);
  sin `visualViewport` no hay estilo en línea; «Listo» cierra, el valor viaja en el campo oculto y `scrollY` sigue en 0.
- Control negativo: sin el estilo en línea fallan los casos 2, 3 y 4 (pasan 3, fallan 3).
- `Hoja.componentes.test.mjs` sin cambios: 11 de 11 verdes; con la nueva, 17 de 17.
- `npm run lint`: 0 errores (1 aviso previo en `VisorImagen.componentes.test.mjs`). `npm run typecheck` verde. `npm run inventario`: sin novedades (medidasEnDuro 344 = aceptado 344).
- No se corrió la suite completa (regla de costo del 2026-09-18) ni el simulador de iOS.

## Falta verificar en el iPhone (gestor)

Con el teclado real: abrir «Editar novedad», tocar «Título», luego «Texto (opcional)»: cabecera visible arriba, cursor al final y texto sobre el teclado sin arrastrar;
«Listo» y comprobar que la página queda donde estaba. Repetir en un formulario de lugar o artista (CampoLargo sin controlar).
