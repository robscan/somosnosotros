# 010 · Alta de evento: una cosa a la vez (2026-09-13)

Rama `alta-evento-progresiva`. El founder, tras probar la Fase 3: "insisto en UX invisible, progressive disclosure. Hay una carga cognitiva impresionante en la ventana de alta de eventos; y al seleccionar otra fecha u hora se debería abrir el selector, no un botón adicional".

## Qué cambió

- **La pantalla de alta queda en: título + tres renglones ya resueltos + un botón.** `ui/Seccion`: cada renglón muestra lo decidido en una línea ("Cuándo · Mañana · 19:00", "Dónde · Casa 1100", "Cuánto · Gratis") y "Cambiar"; se abre solo al tocarlo y los demás se cierran. Los campos siguen en el formulario aunque el renglón esté cerrado (se envían igual).
- **Se abre solo lo que hace falta**: si no hay lugar preseleccionado, "Dónde" nace abierto; si al publicar hay un error, se abre solo el renglón con el error. Sin `useEffect`: el renglón abierto se deriva en el render (tocado > con error > "dónde" si falta > ninguno).
- **Dónde** en un solo control: el select de lugares; debajo, dos píldoras "Es en otro sitio" / "Sitio reservado" que cambian el modo y muestran sus campos, con la vuelta atrás en píldoras iguales. Sin radios de tres opciones arriba.
- **Cartel, foto, descripción y enlace** bajo "+ Más detalles"; el ofrecimiento del cartel es una línea de enlace, no una caja.
- **"Otra fecha" / "Otra hora" / "Otra hora de fin" abren el selector nativo al instante** (`input.showPicker()`, con `focus()` de reserva) desde un `<input type="date|time">` invisible; el chip pasa a mostrar lo elegido ("jue 24 de sep", "20:30") y queda activo. Menos chips: 5 horas (17–21) y "Sin fin / 1 h / 2 h / 3 h".
- Subtítulo: "Qué y cuándo; lo demás ya está resuelto y se puede cambiar." `yaPaso()` en `fechas.ts` para el aviso "Esa hora ya pasó" sin llamadas impuras en el render.

## Verificación (390×844, base real, usuario desechable borrado)

- Alta desde la ficha de un lugar: título, tres renglones cerrados, "+ Más detalles", Publicar. Cabe todo en una pantalla sin scroll.
- Sin lugar preseleccionado: "Dónde" abierto con el select y las píldoras.
- "Cuándo" abierto: tres filas de chips y la frase. "Otra fecha" → `showPicker` disponible y llamado; al elegir 24 de septiembre el chip dice "jue 24 de sep" y la frase "jueves, 24 de septiembre, 19:00".
- Lint, typecheck, 46 pruebas, build.

## Segunda vuelta (mismo día): el selector nativo no abría en el iPhone

El founder: "no sirve botón de otra fecha/hora, disminuye opciones de chips". Safari en iOS no abre el selector de fecha/hora por código (`showPicker()`/`focus()`): solo cuando el dedo toca el propio campo. Arreglo: el chip **es** el campo. `ChipNativo` pone el `<input type="date|time">` encima del chip, invisible y del mismo tamaño (`position:absolute; inset:0; opacity:0`), así el toque cae en él y el teléfono abre su selector; al elegir, el chip muestra lo elegido. Verificado con `elementFromPoint` sobre el centro del chip → el campo. Menos chips: Hoy · Mañana · Otra fecha; 18:00 · 19:00 · 20:00 · Otra hora; Termina: Sin fin · 2 h · Otra hora. Relleno y letra de los chips reducidos para que cada fila quepa en 390 px sin desplazarse (medido: `scrollWidth == clientWidth` en las tres filas).
