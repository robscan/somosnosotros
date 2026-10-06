# 330 · El camino con cartel del alta por pasos: subir, leer, preguntar solo lo que falta

**Pieza:** OL-302. **Rama:** `cartel-por-pasos` (sobre `origin/main` `434a8790`). **Fecha:** 2026-10-05. **Operador:** Claude Sonnet 5.5.
**Estado:** hecho y probado en Chrome (headless) con los componentes reales y el servidor y Storage simulados; falta el iPhone real (lista al final). Sin migraciones. Un cambio aditivo en una acción del servidor (`leerCartelAccion`).

## Qué se encargó

Pieza 3 del plan de construcción de la bitácora [323](323-publicar-por-pasos.md), sobre el armazón de la [328](328-armazon-por-pasos.md): que «Sube el cartel» del primer paso de `/nuevo/evento` abra el selector del teléfono, lea el cartel y rellene lo que pueda, y que el flujo pregunte solo lo que falte. Hoy (palabras del founder, en su iPhone) «Sube el cartel» lo llevaba al alta de siempre, donde tenía que volver a tocar «Sube el cartel». Prototipo firmado: `docs/rediseno/prototipos/publicar-por-pasos.html`, casos «legible» y «medias»; capturas de referencia `docs/rediseno/capturas-323/legible-*` y `medias-*`. El creador de cartel no entra (primera fase sin él).

## Lo que hay

Archivos nuevos (todo lo propio va aparte, para unir sin dolor con la pieza 4):

- `src/app/nuevo/evento/cartelPorPasos.ts` — la regla, sin DOM: `respuestasDelCartel(leido, quienActual)` vuelve lo leído respuestas (solo las que el cartel trae) y `pasosQueFaltan(leido)` dice qué se pregunta después.
- `src/app/nuevo/evento/useLeerCartel.ts` — el hook que sube y lee: confirma el cupo, sube con `subirFoto`, llama a `leerCartelAccion`, y se cae a un fallo con texto llano si algo se corta. Devuelve lo que dice el recuadro, la miniatura de «Leyendo», el cartel subido y los gestos.
- `src/app/nuevo/evento/PasoCartel.tsx` + `.module.css` — `PasoInicio` (movido aquí desde `PasosEvento.tsx`), `PasoLeyendo` y `CabezaCartel` (la cabeza de «Revisa» con el cartel).
- `cartelPorPasos.test.ts` (15 unitarias) y 19 pruebas de componentes nuevas en `AltaEvento.componentes.test.mjs`.

Cambios en lo compartido, los mínimos:

- `AltaEvento.tsx`: tres props nuevas (`usuarioId`, `cartelActivo`, `cupo`), la llamada al hook, el campo escondido `imagen` con el cartel subido, el caso «Leyendo» y el nuevo `PasoInicio`. El reductor, `pasos.ts`, `usePasosEvento.ts` y el tipo `Paso` **no se tocaron**: «Leyendo» es estado de la pantalla (el hook), no un paso del flujo.
- `PasosEvento.tsx`: se quita `PasoInicio` y sus importes (`Link`, `IconoCamara`).
- `Revisa.tsx`: la prop `cartel` y la cabeza con miniatura y sello.
- `page.tsx`: carga el cupo (`cupoDeCartel`, solo si hay lectura de cartel) y pasa `usuarioId`, `cartelActivo` y `cupo`.
- `AltaEvento.module.css`: sale `.subir` (ahora en `PasoCartel.module.css`).
- `globals.css`: dos tokens, `--ancho-cartel-leyendo` (168 px) y `--ancho-cartel-revisa` (96 px).
- `eventos/acciones.ts`: `leerCartelAccion` devuelve además `horaLeida` y `costoLeido` (ver decisión 1). El alta de siempre no los usa y no cambia.

## Cómo funciona

1. **Primer paso.** El recuadro «Sube el cartel» (200 px de alto, punteado violeta, la cámara en su círculo) es una etiqueta y **todo él es el control**: un `<input type="file" accept="image/*">` escondido lo cubre entero, como la tarjeta del alta de siempre (bitácora 093), así que en el iPhone el toque ofrece cámara o carrete. Debajo, «No tengo cartel» del mismo ancho. Si el servidor no tiene lectura de cartel (`cartelActivo` apagado), no hay recuadro y solo queda «No tengo cartel».
2. **«Leyendo».** Al elegir la foto, el paso cambia a «Leyendo»: el cartel elegido, chico y al centro (168 px de ancho, 4:5), late suavemente (quieto con «reducir movimiento»), y debajo «Leyendo el cartel…» con `role="status"`. Sin pie. La miniatura sale de la propia foto del teléfono (`URL.createObjectURL`), así que se ve desde el primer instante sin esperar a que suba. Dura lo que tarden, juntos: confirmar el cupo (`cupoDeCartel`), subir (`subirFoto`, que reduce y respeta los 5 MB de siempre) y `leerCartelAccion`, que aparta la lectura y cruza el lugar y los artistas con el directorio.
3. **Lo leído rellena las respuestas** (`respuestasDelCartel`): nombre; el día; la hora y el fin si el cartel trae hora; el lugar del directorio si el lector lo cruzó (si no, el sitio que dice el cartel, como «otro sitio» por confirmar); «Gratis» o el precio si el cartel dice uno de los dos; los artistas en «Quién» (con `quienTrasLeerCartel`: el cartel manda también sobre el artista propio que `Quién` trae de arranque); descripción y enlace si vienen. **Lo que el cartel no dice no se toca y sigue faltando**, así que `faltan` de `pasos.ts` (la regla de siempre) lo pregunta, en el orden de siempre: nombre, día, hora, dónde, cuánto.
4. **Con todo leído**, de «Leyendo» se pasa directo a «Revisa»: 2 toques en total (subir y publicar), el caso «legible» de la tabla de toques. **A medias** (caso «medias»), solo salen las preguntas que faltan.
5. **«Revisa» con cartel.** Arriba, la miniatura (96 px de ancho, 4:5) y, a su derecha pegados a su base, el sello «Leído del cartel» (paloma y texto en el verde de lo ya decidido) y el nombre. Los datos leídos y los contestados se ven iguales: renglón con icono, valor y «Cambiar»; tocar uno abre solo su pregunta (ya funcionaba). La imagen viaja al publicar en el campo `imagen` del formulario escondido, el mismo que manda el alta de siempre.
6. **Lo que no cambia:** la ruta sigue sin enlazar; el creador de cartel no entra; el alta de siempre (`FormularioEvento`) no se tocó.

### Cuando algo no sale (todo se dice en el recuadro y «No tengo cartel» sigue ahí)

| Situación | Qué dice el recuadro |
| --- | --- |
| Sin lecturas al abrir | «Se acabaron tus lecturas del mes» · «Se renuevan el 1 de noviembre.» y la salida «Pedir más lecturas» (una por cuenta; confirma que llegó; sin conexión lo dice y deja reintentar) |
| Ya pedidas | «Ya pedimos más para ti» · «Te escribimos en cuanto lo revisemos.» (quieto) |
| Se acabaron entre abrir y subir | lo mismo que «sin lecturas»; **no se sube nada** |
| El servidor rechaza la lectura por cupo | lo mismo; la foto no se queda |
| No se pudo subir | «No pude subir el cartel» · la causa («Puede ser tu conexión.» o «La imagen pesa más de 5 MB.») y «Probar con otra foto» |
| Subió pero no se pudo leer | «No pude leer el cartel» · «Llena los datos a mano; la imagen se queda puesta.» y «Probar con otra foto»; la imagen se queda, y «Revisa» la enseña **sin el sello** |
| Se cortó a mitad | «Se cortó a la mitad» · «Puede ser tu conexión.»; nunca se queda en «Leyendo» para siempre |

Los textos son los de `TarjetaCartel` y `estadoCartel.ts` (no se duplican: se importan `falloAlSubir`, `falloAlLeer`, `falloDeCorte`, `alLlegar`, `cuandoSeRenueva`). El recuadro es una región viva (`aria-live`): el lector de pantalla oye el fallo.

## Maquetación

Plana, sin envoltorios que no hagan trabajo ni `:has()` ni medidas por pantalla. Todo es hijo directo de `main` (la columna de `PorPasos`) salvo dos rejillas que sí agrupan: `.leyendo` (el cartel chico y su texto, centrados; un `width` del cartel no sobreviviría a la regla `width: auto` de la columna sin ella) y `.cabeza` de «Revisa» (rejilla con áreas `"foto sello" / "foto titulo"`, `align-items: end`, el nombre es el `h2` de siempre). **El recuadro es una etiqueta de cinco nodos** (`label > svg, b, small, input`): la cámara no lleva envoltorio, es el propio icono con su círculo (`border-radius` y `padding` sobre el `svg`). Eso mantiene `npm run medir` de la ruta en **14 nodos** con el recuadro, igual que antes (con envoltorios eran 16 y pasaba del presupuesto). Ningún color, `z-index`, margen negativo, `100vw` ni píxel fuera de los tokens.

## Decisiones del operador (no están en el encargo ni en el prototipo; las que más conviene revisar)

1. **Cambio en el servidor (aditivo).** `leerCartelAccion` devuelve ahora también `horaLeida` y `costoLeido`. Sin ellos no se puede saber qué leyó el lector de verdad: `cartelAFormulario` pone las 19:00 cuando hay fecha sin hora y «gratis» cuando el cartel no dice nada de precio (el alta de siempre se apoya en esos rellenos). Con ellos, «una fecha sin hora pregunta solo la hora» del encargo se puede cumplir. Prueba en `cupo.acciones.test.ts` (la hora y el precio, leídos y de relleno). Nadie más usa el campo; el alta de siempre sigue igual.
2. **Un precio que el cartel no dice se pregunta** (ampliación del encargo, que solo habla de la hora): el «Gratis» de relleno no cuenta como leído. El prototipo hace lo mismo en «medias» (la pregunta «¿Cuánto cuesta?» sale cuando el cartel no trae precio) y el doc 53 anota que lo que hoy se publica sin leerse es justo el problema.
3. **El fin:** con hora leída, el fin es el «Termina» del cartel (con la regla de `finConHora`: una hora menor que la de inicio es la madrugada del día siguiente) o, si no hay, **«sin hora de fin» ya contestado**. Casi ningún cartel trae hora de fin; preguntar «¿Cuánto dura?» en cada cartel sería preguntar de más y rompería los 2 toques del caso «legible». Se cambia desde «Revisa» con «Cambiar» en Cuándo.
4. **Un sitio que el cartel nombra y no está en el directorio** queda como «otro sitio» con el nombre y la dirección que dice el cartel y **`pinPendiente: true` siempre**, también si el cartel solo trae el nombre (el alta de siempre aceptaba un sitio sin dirección sin pin; aquí no, porque el encargo pide que «Dónde» se pregunte igual). El lector no da punto de mapa, así que `sitioPunto` es nulo. Hoy «Dónde» abre la hoja de siempre con eso de partida; la confirmación en el mapa es la pieza 4. Un lugar del directorio que el lector sí cruzó (`lugarId`) gana sobre el texto.
5. **El sello «Leído del cartel» va como en el prototipo** (a la derecha de la miniatura, sobre el nombre), no «sobre la tarjeta» como decía el encargo: es lo que muestra el prototipo firmado. Verde de lo decidido, como el prototipo.
6. **Si no se pudo leer, la imagen se queda** (el mensaje de la acción lo promete: «la imagen se queda puesta», y así lo hace el alta de siempre): se publica con ella si la persona sigue sin cartel leído. «Revisa» la enseña con su miniatura y sin sello. Si el servidor rechaza la lectura por cupo, en cambio, la foto **no** se queda.
7. **«Leyendo» no es un paso del reductor.** Es estado de la pantalla (`paso="leyendo"` solo para `PorPasos`), para no tocar el tipo `Paso` ni el reductor que comparte la pieza 4. Consecuencias: durante «Leyendo» no hay Atrás (solo la ✕, que sale sin preguntar porque el formulario todavía no cambió); y Atrás desde «Revisa» (con todo leído) vuelve al recuadro, saltando «Leyendo», como en el prototipo.
8. **El cupo se confirma antes de subir** (`cupoDeCartel`) para no dejar una foto en Storage si ya no hay lecturas; si no se pudo confirmar, sigue y decide `leerCartelAccion`, que lo aparta de verdad. No se vuelve a consultar al terminar (el alta de siempre sí, para su tarjeta; aquí el recuadro solo se vuelve a ver con Atrás y, si ya no hay lecturas, `leerCartelAccion` lo dice).
9. **Subir otro cartel desde Atrás:** lo que el nuevo trae reemplaza; lo que no trae se queda como estaba (no borra lo contestado).
10. **El recuadro sin lecturas es un botón gris** (borde sólido, cámara en gris) y, con el fallo, rojo claro con borde rojo, como la tarjeta del canon (`cartelSinCupo`, `cartelFallo`); «ya pedida» es quieta. El prototipo no dibuja estos estados.
11. **Dos tokens nuevos** (`--ancho-cartel-leyendo`, `--ancho-cartel-revisa`) en lugar de píxeles en duro; el prototipo da 168 y 96.
12. **`PasoInicio` y `.subir` se movieron** a `PasoCartel.tsx` y `PasoCartel.module.css` (en vez de editarlos en su sitio) para que los cambios de la pieza 4 en `PasosEvento.tsx` y `AltaEvento.module.css` no choquen con los míos. Si la unión tiene conflicto, será en las líneas de importes de `PasosEvento.tsx` (quité `Link` e `IconoCamara`) y en el comienzo de `AltaEvento.module.css`.
13. **`npm run medir` sin llave de lectura de carteles** (como en la CI) ya no ve el recuadro: la ruta mide 9 nodos y avisa «bajaron», sin fallar. Con una llave inventada (`ANTHROPIC_API_KEY=clave-inventada npm run medir -- --solo=s15`) mide el estado de producción: **14/14/48/48**, igual que el presupuesto. No toqué los presupuestos.

## Pruebas

- **Unitarias** (`cartelPorPasos.test.ts`, 15): con todo leído no falta nada y el reductor cae en «Revisa»; a medias («medias»: solo dónde y cuánto, en ese orden); fecha sin hora (solo la hora; las 19:00 de relleno no se aplican); sin fecha (día y hora); sin título (el nombre); un sitio fuera del directorio, con solo el nombre y con solo la dirección (se pregunta siempre, por confirmar, sin punto); el lugar del directorio gana al texto; el precio (gratis, un monto, y el «gratis» de relleno que se pregunta); el fin (el del cartel, «sin hora de fin», madrugada del día siguiente y el fin sin hora de inicio leída que no cuenta); «Quién» (el cartel manda sobre el artista propio, y vacío si no nombra a nadie); descripción y enlace; un cartel sin nada deja todo por preguntar; lo que el cartel no trae no borra lo ya contestado. En `cupo.acciones.test.ts`, una más: `horaLeida` y `costoLeido`.
- **De componentes** (`AltaEvento.componentes.test.mjs`, 19 nuevas de 31; el harness suma dobles de `cupoDeCartel`, `leerCartelAccion`, `pedirMasLecturas` y `subirFoto`, gobernados desde `window.qa`, y sirve un cartel de mentira): el recuadro (campo `image/*` que cubre todo el recuadro, opacidad 0, del mismo ancho que «No tengo cartel»); subir → «Leyendo» (status, miniatura `blob:` de 168 px, sin pie, subida a la carpeta de siempre, lectura con la dirección de lo subido) → «Revisa» con «Leído del cartel», los cuatro renglones con sus textos, la miniatura del cartel subido, y publicar manda `imagen`, título, inicio, fin, lugar, precio y artistas correctos; a medias (solo dónde y cuánto, con el sello al final); la única pregunta que falta y Atrás de vuelta al recuadro; fecha sin hora (las 7:00 p.m. no vienen marcadas); sitio fuera del directorio (la hoja recibe lo leído «por confirmar»); sin cupo al abrir (el texto, «Pedir más lecturas», «Ya pedimos más», «No tengo cartel» sigue y no se subió nada); pedir más sin conexión y reintento; cupo agotado entre abrir y subir (no sube nada); cupo rechazado por el servidor (la foto no se queda, publica sin imagen); fallo al leer (causa, «No tengo cartel» sigue, la imagen se queda, sin sello, publica con ella); «Probar con otra foto» tras el fallo; fallo al subir (no llega a leer) y corte a mitad (no se queda leyendo); sin lectura de carteles (solo «No tengo cartel»); sin Atrás en «Leyendo» y Atrás desde «Revisa» al recuadro; el cartel late y con «reducir movimiento» no; **sin desbordes a 320 y 390** (recuadro, «Leyendo», «Revisa», sin lecturas, fallo y un nombre del tope de 120 caracteres); y **la regla de `npm run medir`** (toques de 44, tapados, hijos fuera de su caja, márgenes negativos) en esas pantallas a 320 y 390: 0 en todo.
- `npm run lint` (0 errores; el único aviso ya estaba en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (**145 archivos, 2119 pruebas**), `npm run test:componentes` (**362 pruebas, 0 fallos, 117 s**, con el Chrome de la Mac), `npm run inventario` (**sin novedades: 343 medidas en duro, 2 bloques duplicados**; mi primer CSS repetía un bloque del canon y lo rehíce), `npm run medir` (25 pantallas × 4 anchos, sin novedades; ver la decisión 13 sobre `s15`).

## Capturas (`docs/rediseno/capturas-330/`)

390×844 a 2×, con el harness de componentes (los componentes y el CSS reales, la letra Bricolage cargada con el `.woff2` de la compilación, el servidor y Storage simulados, reloj fijo del miércoles 7 de octubre de 2026, «reducir movimiento»). Sin el aro de foco que el programa pone en la pregunta de cada paso (con el dedo no se ve). Todas abiertas y revisadas.

1. `390-01-inicio` ↔ `legible-1-inicio`: igual: ✕ a la izquierda, «Publicar», el riel de avance en 0, el recuadro punteado violeta con la cámara en su círculo, «Sube el cartel» en violeta, «Leemos el nombre, la fecha, el lugar y el precio» en gris y «No tengo cartel» secundario del mismo ancho.
2. `390-02-leyendo` ↔ `legible-2`: el cartel (de mentira, morado) chico y al centro, de 168 de ancho con las esquinas redondeadas, y debajo «Leyendo el cartel…» en gris; sin pie y con la ✕ en la barra. Quieto (la prueba lo pide con «reducir movimiento»).
3. `390-03-revisa-leido` ↔ `legible-2-revisar`: «Revisa» con la línea de avance casi llena; a la izquierda la miniatura de 96 de ancho; a su derecha, pegados a su base, «✓ Leído del cartel» en verde y el nombre en dos renglones; los cuatro renglones sin etiqueta («jue 5 de nov · 19:00», «Teatro de la Paz», «Gratis», «Lucía Montaño», cada uno con su icono gris y «Cambiar» en violeta), el enlace quieto «Agregar artistas, descripción o enlace» y «Publicar» pegado abajo. Difiere: Cuándo con el formato de la app, el cartel de ejemplo no es el del prototipo.
4. `390-04-medias-cuanto` ↔ `medias-4-cuanto`: la única pregunta que falta, «¿Cuánto cuesta?», con las tres opciones grandes; Atrás en la barra y la línea de avance en 5/7.
5. `390-05-sin-cupo`: el recuadro quieto y gris: la cámara en gris, «Se acabaron tus lecturas del mes», «Se renuevan el 1 de noviembre.» y el chip «Pedir más lecturas»; debajo, «No tengo cartel». El prototipo no dibuja este estado.
6. `390-06-fallo-al-leer`: el recuadro con borde rojo y fondo rojo claro, la cámara violeta, «No pude leer el cartel», «Llena los datos a mano; la imagen se queda puesta.» en rojo y el chip «Probar con otra foto»; debajo, «No tengo cartel». El prototipo no dibuja este estado.

## Lo que falta / para las piezas siguientes

- **«Dónde»** (pieza 4): confirmar en el mapa el sitio por confirmar de un cartel (hoy abre la hoja de siempre con lo leído de partida) y las tres opciones del sitio.
- **«Publicado»** (pieza 5), y llevar `/nuevo` a este flujo (el «+») cuando la serie termine.
- Cartel de festival con programa y de taller con sesiones (necesitan modelo de datos); sale un solo evento del primero que lee el lector.
- El alta de siempre sigue en producción hasta la pieza 6.
- Pendiente fuera de esta pieza: `FormularioEvento` refresca el cupo al volver a la pantalla (foco, visibilidad, cambio de mes); aquí solo se consulta al abrir y antes de subir.

## Para probar en el iPhone

1. Abrir `/nuevo/evento` con sesión y tocar «Sube el cartel»: ¿ofrece la cámara y el carrete? ¿Con una foto del carrete (HEIC) sale la miniatura en «Leyendo»?
2. Con un cartel real y completo: ¿pasa de «Leyendo» directo a «Revisa» con «Leído del cartel» y los renglones bien? Publicar manda la imagen (la ficha del evento la enseña).
3. Con un cartel a medias (sin precio, o sin hora): ¿solo pregunta lo que falta? ¿Atrás desde la primera pregunta vuelve al recuadro?
4. Al volver de la cámara del teléfono, ¿el recuadro y «Leyendo» responden bien (el selector dispara un cambio de foco)?
5. Sin conexión (modo avión) tras elegir la foto: ¿sale el mensaje del recuadro y «No tengo cartel» sigue?
6. Con la cuenta sin lecturas (la 20 del mes): ¿el recuadro lo dice y «Pedir más lecturas» responde?
