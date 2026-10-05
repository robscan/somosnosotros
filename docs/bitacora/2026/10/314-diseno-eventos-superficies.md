# 314 — Sesión de diseño de Eventos: sugerencias al publicar, renglón «Dónde» y teclado (OL-286)

**Fecha:** 2026-10-05 · **Quién:** Gestor de cambios IV (Fable 5.1) · **Rama:** `prototipo-eventos-donde` · **Solo prototipo y medición; nada de `src/`.**

## Qué se hizo

1. **Prototipo navegable** `docs/rediseno/prototipos/eventos-superficies.html` (HTML autónomo, móvil primero, con las medidas de `globals.css` y las piezas de `ui/Renglon`, `ui/Hoja`, `ui/Ficha`, `ui/Campo` + `ui/Limpiar`). Nueve casos en un selector:
   - **Al publicar un evento** (parte de OL-273; casos H1, H2 y H4 de `docs/investigaciones/eventos-modelo.md` § 10). La sugerencia tiene la forma de lo que se crearía: la ficha de la exposición o del festival **en punteado mientras no existe**. H1: un toque («Publicar la exposición»). H2: se pide solo el último día en el calendario. H4: aparece al publicar el segundo evento, con los dos eventos unidos por una línea. «Ahora no» sale sin más; tras aceptar hay «Deshacer».
   - **Renglón «Dónde»**: siempre abre el mapa de la plataforma con una hoja media. Lugar del directorio: su ficha resumida. Sitio fuera del directorio: pin temporal punteado, «Cómo llegar» y, solo con sesión y si no es negocio, «Agregar como lugar» (alta ya rellenada; al publicar, el pin deja de ser temporal). Sin punto: mapa sin pin y «Buscarlo en Mapas». Reservado: queda como hoy, no abre el mapa.
   - **Elegir un sitio al publicar** (notas del founder del 2026-09-29): la dirección leída es una confirmación, no un campo; al tocar «Listo» con un sitio fuera del directorio se pregunta: solo este evento, guardarlo como lugar o sitio reservado.
   - Todos los campos de texto llevan la ✕.
2. **Teclado en «Editar novedad»** (reporte del founder del 2026-10-04), medido en el simulador (iPhone 15 Pro, iOS 26.3, Safari, teclado en pantalla) con la app compilada contra el respaldo local:
   - Con «Título» enfocado, el campo queda visible y la página se puede desplazar hasta «Guardar cambios» y «Borrar la novedad» (capturas 1 y 2). Ahí no hay defecto.
   - **Defecto reproducido:** al tocar «Texto (opcional)» con el teclado ya abierto, el editor de texto largo (`ui/CampoLargo`, capa `position: fixed; inset: 0`) queda anclado a la ventana de maquetación, que el teclado dejó desplazada: la cabecera («Texto (opcional)», «Listo») y el texto quedan arriba, fuera de la vista, y se ve la pantalla en blanco (captura 3). Arrastrando hacia abajo aparece (captura 4). Afecta a todo formulario con `CampoLargo`.
   - Propuesta (código, pieza aparte y con el visto bueno del founder): dimensionar la capa con `visualViewport` (alto y desplazamiento), como ya hace `ui/Hoja` con `--alto-visible`.
3. Lección para la memoria: el teclado en pantalla del simulador solo sale con Simulator.app abierto; arrancado solo con `simctl` aparece nada más la barra de flechas.

## Evidencia

`docs/rediseno/capturas-314/` (32 PNG):
- `teclado-1…4`: lo descrito arriba (1179×2556).
- 28 capturas del prototipo a 390×844 (2×), una por estado: `h1-*` (alta, sugerencia punteada, aceptada con «Deshacer», ficha con el renglón «Exposición», ficha de la exposición), `h2-*` (sugerencia sin periodo, calendario vacío, último día elegido con la banda, publicada), `h4-*` (sugerencia de festival, aceptada, festival), `catalogo-*`, `publico-*` (ficha, mapa con pin punteado y «Agregar como lugar», alta con «Falta el tipo», alta lista, mapa con el lugar ya creado), `negocio-1`, `sinpunto-*`, `reservado-1`, `sitio-*` (alta con «Falta dónde es», lista bajo el campo, sitio elegido con la dirección como confirmación, hoja de tres opciones, renglón resuelto).
- Medido con Chrome: sin errores de página, sin desplazamiento horizontal y ningún elemento fuera de la columna a 320 y 390. Letra Bricolage cargada (comprobada en `document.fonts`). Las abrí todas en hojas de contacto.

## Pendiente de decidir con el founder

- Si esta forma de sugerir (ficha en punteado) sustituye a la tarjeta del prototipo de Codex.
- Cómo sabe el sistema que un sitio es un negocio (propuesta: por la categoría que da el mapa en ese punto; el admin sigue revisando).
- Tipo nuevo «Plaza o jardín».
- Las tres opciones al elegir un sitio fuera del directorio, y su orden.
- Arreglo del editor de texto largo con el teclado (pieza de código aparte).

## Decisiones del founder (2026-10-05, tras ver la primera vuelta)

- **La ficha en punteado sustituye** a la tarjeta de sugerencia del prototipo de Codex (OL-273).
- **Negocios:** de acuerdo con identificarlos por la categoría que da el mapa en ese punto (bar, café, restaurante): ahí no se ofrece «Agregar como lugar».
- **Tipo de lugar nuevo:** «Plaza, jardín o parque» («si agrega plaza o jardín/ parque»). El prototipo ya usa la lista real de tipos más este.
- Siguen abiertas: las tres opciones al elegir un sitio fuera del directorio y el arreglo del texto largo con el teclado.

## Segunda vuelta (2026-10-05, tarde): festival con programa completo y taller con sesiones

Pedido del founder: «agregar elementos al flujo de eventos en caso de ser festival o taller». Dos casos nuevos en el mismo prototipo (H6 y H7 del modelo):

- **El cartel trae varios eventos de un festival.** Tras leer el cartel, una sola pantalla: «El cartel trae 3 eventos», cada uno como renglón con su fecha, hora y sede, todos marcados. Un toque publica los marcados y los junta en el festival («Programa registrado: 3 eventos»); el que se desmarca queda como borrador. No hay que subir el cartel tres veces ni esperar al segundo evento.
- **Taller de varias sesiones.** El alta es la de siempre; «Cuándo» dice «4 sesiones · Sábados de noviembre · 10:00» y al tocarlo se ven las fechas leídas, con «Quitar» en cada una. Se publica un solo taller; su ficha lista las sesiones y marca la que va en otra sede. «Voy» es al taller entero.
- Capturas `programa-1…4` y `taller-1…4` en `docs/rediseno/capturas-314/` (390×844): revisar con tres marcados, con uno fuera (punteado, «Incluir»), publicados con el festival, ficha del festival; alta del taller, hoja de sesiones, publicado con sus cuatro fechas, ficha con «Sesión n de 4». Sin errores ni desbordes a 320 y 390.
- Falta en el prototipo: corregir un dato de un evento del programa antes de publicar, y funciones repetidas de una misma obra (H8).
