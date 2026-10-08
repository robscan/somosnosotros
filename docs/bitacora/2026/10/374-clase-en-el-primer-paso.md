# 374 · La clase del evento se elige en el primer paso del alta (Evento · Exposición · Taller · Festival)

**Pieza:** OL-345. **Rama:** `clase-en-el-primer-paso` (sobre `origin/main` `0a6fd24e`). **Fecha:** 2026-10-07/08. **Operador:** Claude Opus 5.5 (agente del gestor IV).
**Estado:** hecho y probado con los componentes reales en Chrome (headless, letra de la app) y con la medición de la app compilada contra el respaldo local; falta el iPhone real (lista al final). Sin migración, sin variables de entorno.

## Qué se encargó

El founder (2026-10-08) no encontraba la exposición: «no veo la opción de especificar que es una galería/exposición temporal en museo, solo veo festival». Hasta hoy la clase solo se cambiaba en «Revisa › Cómo ocurre › Cambiar» (OL-321, bitácora 350): el título la proponía en silencio y nada en el primer paso decía que existía. Aprobó la propuesta del gestor: **en el primer paso, bajo el campo del nombre, en cuanto hay texto, cuatro chips «Evento · Exposición · Taller · Festival» con el sugerido ya marcado; un toque y sigue, sin paso nuevo. «Revisa» lo confirma como hoy.**

## Qué hay

- **`PasoNombre` (`PasosEvento.tsx`)**: bajo el campo, la fila de chips de la clase. Es `ui/Chips` con `ui/Chip` (la fila y el chip de los filtros): un solo renglón que se desliza de lado si no cabe, nunca en dos. Orden fijo (el de `CLASES`): Evento · Exposición · Taller · Festival. Sin rótulo a la vista ni texto de ayuda; la fila se nombra «Cómo ocurre» solo para el lector, y cada chip es un conmutador (`aria-pressed`). Marcado: la clase de las respuestas, que el reductor ya mantenía (`claseSugerida(nombre)` mientras no esté fijada, «Evento» por omisión, la del cartel o la elegida). Cuando el marcado no cabe (a 320, «Festival» es el último), la fila se desliza sola hasta dejarlo entero, sin mover la página; lo repite cuando termina de llegar la letra (Bricolage cambia el ancho de los chips).
- **Cuándo salen** (`clasesALaVista` en `pasos.ts`): en cuanto el nombre tiene texto, o cuando la clase ya está fijada aunque el nombre esté vacío (la trajo el cartel o se eligió y luego se borró el nombre). Sin nada escrito el paso queda solo con su campo, como antes.
- **Tocar un chip** manda `cambiar(claseElegida(clase))`: `claseElegida` (nuevo en `pasos.ts`) es `{ clase, claseFijada: true }`, lo mismo que ya mandaba «¿Cómo ocurre?» desde «Revisa» (ahora `AltaEvento` y `EditarEvento` lo usan también en su `onClase`). Lo demás no se duplica: el reductor (`con` → `conClase`) conserva nombre, dónde, quién y precio y deja de partida los días que hubiera; `faltan` decide el paso del tiempo de cada clase. El toque **no avanza**: el paso sigue en «¿Cómo se llama?» (el nombre se puede seguir escribiendo y ya no cambia la clase) y «Siguiente» lleva a lo primero que falte de esa clase.
- **Orden de pasos por clase** (sin cambios, ya era el de OL-321; comprobado en pruebas): Evento → «¿Qué día es?» → «¿A qué hora?» → «¿Dónde es?» → «¿Cuánto cuesta?»; Exposición → «¿Cuándo se puede visitar?» (sustituye al día y la hora, con la misma barra de avance) → Dónde → Cuánto; Taller → «¿Qué días son las sesiones?» → Dónde → Cuánto; Festival → «¿Qué actividades tiene?» (su programa, armado a mano) → Cuánto (sin Dónde: cada actividad tiene su sede). «¿Qué día es?» no cambia de pregunta para la exposición porque la exposición no pasa por él: tiene su propio paso desde OL-321.
- **Desde «Revisa»**: tocar el nombre abre el mismo paso con los chips; elegir otra clase ahí y «Siguiente» pregunta lo que le falte (p. ej. hasta cuándo se visita) y vuelve a «Revisa», el mismo recorrido que «Cambiar».
- **«Revisa»** sigue con su primer renglón «Cómo ocurre · Cambiar» y la hoja «¿Cómo ocurre?» (regla del founder de no quitar salidas).
- **La tira Evento · Lugar · Artista** (OL-313) no cambia. Vive en el paso del cartel («Sube el cartel / No tengo cartel»), no en «¿Cómo se llama?»: las dos filas nunca están en la misma pantalla.
- **Editar por pasos** (OL-319, `EditarEvento`) no lleva los chips: entra por «Revisa» y ahí la clase se cambia con sus reglas (un festival con actividades no deja de serlo, `HojaClase fija`). `Preguntas` gana la opción `clases`, que solo pasa el alta.
- **`lib/eventos.ts`**: `CLASES` gana `corto` (lo que dice el chip: «Taller» en vez de «Taller o curso», para que la fila quepa). **`ui/Chip`**: `Chips` acepta `ref` (para deslizarla hasta un chip).

## Decisiones del operador (por confirmar)

1. **El chip no avanza.** «Un toque y sigue» lo leí como «sin paso nuevo»: el toque marca y el paso sigue; «Siguiente» avanza. Razones: el encargo pide que tras el toque el nombre ya no cambie la clase (se sigue escribiendo en el mismo paso) y los chips salen desde la primera letra, así que avanzar al tocar sacaría a la persona a media escritura. Si el founder prefiere que el toque avance (como los chips de día), es una línea en `Preguntas.tsx` (`contestar` en vez de `cambiar`).
2. **Aire entre el campo y los chips: el de la columna (20 px, 24 a la vista con el relleno de la fila).** El encargo pedía los chips «pegados al campo»; acercarlos más pide un margen negativo, que la medición no admite (la única excepción es la de Mapbox) y la maquetación plana evita, o un envoltorio. Quedan justo debajo, sin nada en medio, y la tira de tipos no comparte pantalla con ellos.
3. **A 320 no caben los cuatro** (300 px de chips en 280 de columna): la fila se desliza dentro de la columna, como las filas de chips de Administración y Buscar, y el marcado siempre se ve entero. «Festival» queda cortado en el borde cuando no está marcado: es la señal de que hay más. A 390 caben los cuatro.
4. **Sin medición nueva.** El encargo pedía `clase_elegida` si el canon mide los pasos del alta: no los mide (`lib/medir.ts`, OL-325: solo `evento_creado`, que ya lleva la `clase` con que se publicó). Si el founder quiere saber cuántas veces se corrige la propuesta del título, se añadiría `clase_elegida: { clase: [4 opciones], desde: ["nombre", "revisa"] }` y su renglón en el aviso de privacidad; no lo añadí sin esa decisión.
5. **La fila sale también cuando la clase ya está fijada con el nombre vacío** (cartel con clase sin título, o elegida y luego borrado el nombre): lo elegido no desaparece.

## Pruebas

- `npm run lint`: 0 errores (el aviso de siempre en `VisorImagen.componentes.test.mjs`). `npm run typecheck`: verde.
- `npm test`: **185 archivos, 3355 pruebas, en verde**. Nuevas en `nuevo/evento/clase.test.ts` (7, «la clase en el primer paso»): sin nombre no hay chips y con texto sí, con la propuesta marcada o «Evento»; la propuesta sigue al nombre al escribir y al borrar; el chip fija la clase sin dejar el paso y el nombre ya no la cambia (también «Evento» sobre «Taller de…»); la clase del cartel saca los chips con el nombre vacío; el orden de pasos de cada clase tras «Siguiente»; el chip hace lo mismo que la propuesta del título y que «Cambiar»; vuelto al nombre desde «Revisa», un chip cambia la clase, pregunta lo que falta y regresa. `lib/claseEvento.test.ts`: los nombres cortos de los chips.
- Componentes (Playwright, Chrome de la Mac), 5 nuevas en `AltaEvento.componentes.test.mjs`: los chips salen con texto (y se van al borrar), el sugerido marcado («Festival de jazz» → Festival, «Muestra de grabado» → Exposición), un renglón, justo bajo el campo y sobre el pie, sin rótulo; tocar fija (el nombre ya no la cambia) y «Siguiente» lleva a «¿Cuándo se puede visitar?», «¿Qué días son las sesiones?», «¿Qué actividades tiene?» o «¿Qué día es?» según el chip; la exposición elegida en el primer paso llega a «Revisa» con «Exposición · Cambiar» y se publica con `clase=exposicion`; a 320 un renglón que se desliza, la página sin desborde y el marcado entero; con 390×508 (el teclado) el campo enfocado, los chips y «Siguiente» enteros y sin nada encima. Suites de `nuevo/`, `ui/Chip` y `PorPasos`: **159 de 159**. Suite completa `npm run test:componentes`: **528 de 528**.
- `npm run inventario`: sin novedades (332 medidas en duro).
- `npm run medir`: **36 pantallas × 4 anchos**. Pantalla nueva **`s27-alta-evento-nombre-clase`** («¿Cómo se llama?» con «Festival de jazz del barrio» escrito y los chips a la vista): 21 nodos a 320 y 390, 55 a 820 y 1280, profundidad 6, presupuesto anotado en `medidas.aceptadas.json`. Teclado (390×508, las dos maneras): el campo y «Siguiente» de s27 enteros sobre el teclado. Ningún otro cambio de presupuesto; la única falla de la corrida entera fue una carga lenta de `03-lugares-mapa` a 1280 (el mapa, ajeno a esta pieza), que con `--solo=03-lugares` sale sin novedades.

## Capturas (`docs/rediseno/capturas-374/`)

De los componentes reales en Chrome, a 2× con la letra de la app (`FUENTE`), con la barra y el pie de `PorPasos` de verdad:

- `390-01-sin-texto.png`, `320-01-sin-texto.png`: «¿Cómo se llama?» con el campo vacío y «Falta el nombre»: sin chips.
- `390-02-festival-sugerido.png`: «Festival de jazz del barrio» con su ✕; debajo, en un renglón, Evento · Exposición · Taller · **Festival** (marcado, morado).
- `320-02-festival-sugerido.png`: lo mismo a 320: la fila se deslizó para enseñar entero «Festival» marcado; «Evento» queda cortado a la izquierda.
- `390-03-exposicion-elegida.png`, `320-03-exposicion-elegida.png`: «Ecos de papel» con **Exposición** marcada (elegida con un toque sobre «Festival…» y luego cambiado el nombre: la clase no se movió).
- `390x508-04-teclado.png`: la ventana del iPhone con el teclado (390×508): el campo enfocado con el nombre, los cuatro chips y «Siguiente» anclado abajo, todo a la vista.

## Qué probar en el iPhone

1. «+» → «No tengo cartel» → escribir «Exposición de grabado»: salen los chips con Exposición marcada; borrar todo: se van.
2. Escribir «Ecos de papel» (Evento marcado), tocar «Exposición»: queda marcada (mirar si el toque cierra el teclado: en Chrome no se puede saber); «Siguiente» → «¿Cuándo se puede visitar?». Seguir hasta «Revisa»: «Exposición · Cambiar».
3. Con el teclado abierto, que los chips se vean bajo el campo y «Siguiente» sobre el teclado.
4. A 320 (o con letra grande): «Festival de…» desliza la fila hasta enseñar «Festival».
5. Con un cartel que no traiga título pero sí la clase: los chips salen con esa clase marcada.
6. Editar un evento: tocar el nombre no enseña chips; «Cómo ocurre · Cambiar» sigue igual.

## Para el gestor

- Sin migración ni variables de entorno. Toca `ui/Chip` solo para aceptar `ref` en `Chips` (opcional; ningún uso existente cambia).
- Decisiones 1 (el chip no avanza) y 4 (sin `clase_elegida`) para el founder.
