# 296 · Foco modal, enlaces de búsqueda y prueba de chips (OL-269)

**Fecha:** 2026-10-04. **Estado:** candidato local probado; pendiente CI, preview y revisión del gestor antes de publicar.

Reserva del Gestor de cambios III, mensaje151 y PR324/21ff1abf. Rama
`foco-busqueda`, worktree `/Users/apple-1/somosnosotros-foco-busqueda`, base
`ff855ad6b4507605dd5de1d4214c0f852eb96ecd` (cierre PR325). Comprobador confirmó
OL269/bit296 libres. No SQL, dependencias ni cambios en HojaLugares, ubicación,
apps/ios o archivos de otras piezas.

## Fallos reproducidos y corrección

- **H09:** producción abría Filtros dejando el foco en el botón del fondo,
  fuera del diálogo y sin `aria-modal`. Cuatro pruebas nuevas de teclado fallaron
  antes de corregir, frente a cuatro geométricas existentes correctas.
  `ui/Hoja` enfoca dentro al abrir, conserva autofocus del contenido, declara
  `aria-modal`, vuelve al disparador al cerrar y mantiene Tab/Shift+Tab dentro.
  El fondo queda `inert`, incluidos hermanos añadidos después; al cerrar restaura
  los valores anteriores. Una pila permite que Escape cierre solo la hoja superior
  y devuelva el foco a la anterior. Efecto independiente de la identidad de
  `onCerrar`: actualizar contenido no roba foco. StrictMode conserva autofocus
  durante su limpieza y montaje de comprobación. No se cambia CSS ni estructura
  visible. HojaFiltros hereda la corrección sin cambios propios.
- **H10:** `/artistas?q=Rob` redirigía a `/buscar?q=Rob`, pero el campo quedaba
  vacío. La página ahora entrega `q` como estado inicial al cliente; corre la
  búsqueda existente. Consume solo `q` con replaceState, conserva otros parámetros,
  hash y estado de historial, sin apilar. Conserva memoria de resultados al volver
  de una ficha o recargar la URL limpia. Dos pruebas de página fallaron antes y
  pasan después. No se cambia el motor de búsqueda ni sus permisos.
- **Chips:** el fallo de CI de OL268 dependía del muestreo de cuadros. La prueba
  pausa la animación real y la termina explícitamente: mide la posición final
  antes de retirar el nodo y la compara con la posición después de retirarlo.
  Comprueba que el filtro no cambia anticipadamente. Conserva tolerancia de2,5px,
  duración366ms y propiedades; producto FilaEventos/Chip intacto. Cinco ejecuciones
  consecutivas correctas. Control negativo en copia temporal: dejar4px del hueco
  provoca fallo en la comparación de2,5px (151,1875 frente a155,546875), demostrando
  que sigue detectando el salto. La alteración no entra al repositorio.

## Verificación reutilizable

- 1871 unitarias en137 archivos correctas; tipos correctos. Lint sin errores,
  warning previo de `page` en VisorImagen.componentes.test.mjs:171. Lint final de
  los archivos de pruebas nuevos sin novedades.
- Hoja8/8, FilaEventos11/11 y Buscar3/3 correctos; chips además5/5 secuenciales.
  Hoja cubre320/390, Tab/Shift+Tab, Escape, foco restaurado, autofocus, StrictMode,
  rerender, inert previo y tardío y dos hojas. Buscar cubre q, debounce, mínimo,
  historial y memoria. Durante preparación del harness se corrigió UTF-8 y la
  sustitución de process.env; esos fallos no eran del producto.
- Inventario sin novedades. Build16s; `medir`:24 pantallas×4 anchos,96 mediciones
  en82s, sin novedades ni presupuestos ampliados.
- QA de app **compilada**, respaldo local inventado (un artista renombrado a Rob
  Prueba solo en memoria): enlaces `/artistas?q=Rob` y `/lugares?q=Rob` muestran
  texto y resultados, URL sin q; abrir ficha y Atrás conserva la búsqueda.
  Filtros320/390:40 pasos de Tab/Shift+Tab por ancho permanecen dentro, Escape
  restaura disparador; sin scroll horizontal. Hoja de ciudad abre/cierra con
  foco dentro y restaurado. Cero errores de navegador.
- PNG reales `filtros-320.png`, `filtros-390.png`, `buscar-390.png` y
  `ciudad-390.png` abiertos e inspeccionados: cabeceras, controles, acciones y
  resultados visibles; filtros conservan disposición, el indicador de foco
  se ve dentro. Fuente de la app cargada. Sin cambios de maquetación.
- Se revisaron usos de Hoja (filtros, ciudad, calendario, menús, confirmaciones):
  no necesitan adaptación. Suite completa de componentes en CI como integración.

Evidencia: `/tmp/sn-ol269-evidencia/`; copia duradera en
`/Users/apple-1/.codex/visualizations/2026/10/02/01a0fece-65fd-79e3-a64d-296a4b8fa13c/foco-busqueda/`.
Son pruebas de Chromium, no firma de Safari físico. No se escribió contenido en
producción. Árbol principal preservado limpio en1b9461e4. Responsable Codex:
entregar candidato congelado al gestor, esperar CI exacta y revisión, publicar
con la autorización continua vigente y comprobar dominio. Safari físico del
founder pendiente; no se creó monitor.
