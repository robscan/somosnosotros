# 135 · Lugar y dirección en el alta de evento

**Fecha:** 2026-09-21 · **Rama:** `alta-evento-lugar` · **OL:** OL-100 · **PR:** pendiente (reentrega tras revisión del gestor)

Pieza A7 de la cola. Sobre L2, L3 y L37 (segunda mitad) de la lista del founder (2026-09-21).

## Qué pidió el founder

- **L2.** «Cuando usuario quiere publicar evento, el primer campo se pone en focus y sale teclado. Eso hace que botón de subir cartel se recorra y oculte, eso lo vi en android, confirma que esto suceda y no haya sido que el usuario seleccionó sin que lo notara. No me gusta que se recorra la opción de subir cartel porque no es visible.»
- **L3.** «Cuando se sube cartel se lee la dirección y nombre de lugar, pero dice "Falta", no es correcto ese letrero, debe decir confirmar porque al entrar dirección aparece escrita pero sin seleccionar en el mapa, hay que pulir eso para que sea claro lo que el usuario debe hacer, de entrada tratar de que sí se identifique una dirección con mapbox.»
- **L37 (segunda mitad).** «El lugar pide confirmación aunque sí se escribe un lugar y lo que hace es pedir confirmación de ese lugar sin tomar en cuenta contexto, por ejemplo me sugiere lugares en Soledad de Graciano Sánchez aunque de hecho cerca de donde estoy hay una calle con ese nombre. Incluso podría estar dentro del lugar. Sigue siendo complicado y confuso el momento de asignación de lugar en eventos. Además el hecho de que la retroalimentación de sistema aparezca dentro del botón hace difícil leerla, el estándar es colocarla debajo del botón principal de creación, ejemplo: Falta ubicación. O mejor aún debajo del campo faltante como help text.»

Ya resuelto en otra pieza (OL-092, PR #113, en producción): el cartel no agregaba a sus artistas y ponía como artista a quien publica; la segunda lectura seguida se quedaba muda. No se rehace aquí.

## Qué se midió (sin tocar código)

1. **L2, confirmado.** `FormularioEvento.tsx:525` — el campo del nombre tiene `autoFocus={esAlta}`. Al abrir el alta, el teclado sale solo. La tarjeta del cartel (`TarjetaCartel`, línea 521) va antes que el campo en el documento, así que el teclado no la tapa por estar debajo: reduce el alto útil de la pantalla y el scroll queda en el campo enfocado, con la tarjeta fuera de la vista. No fue un toque del usuario.
2. **L3, confirmado y ubicado.** `dondeResuelto` (línea 340) usa `sitioListo(otro)` (`direccionEvento.ts:16`), que exige `!otro.pinPendiente`. Cuando el cartel lee un lugar o una dirección sin `lugarId` exacto (`leerCartel`, líneas 484-490), deja `pinPendiente: true`. Con eso, `dondeResuelto` da `false` y el renglón Dónde muestra "Falta" (línea 582) aunque ya haya nombre y dirección escritos.
3. **L37, dos causas distintas.** (a) La ayuda vive dentro del botón (`canon.faltaBoton`, `FormularioEvento.tsx:712` y `HojaDondeEs.tsx:238`) — mismo patrón en `FormularioLugar.tsx`, `FormularioArtista.tsx` y `FormularioPerfil.tsx`, fuera del alcance de esta pieza. (b) La búsqueda de sugerencias (`geocodificar.ts`, `buscarLugares.ts`) ya ordena por cercanía real y solo usa la ubicación tras un botón explícito ("Estoy aquí", `leerUbicacion(true)`) o el centro de San Luis Potosí como respaldo — cumple la regla de DEFINICION ("ubicación solo con botón"). La confusión no es de proximidad: es que la lista de sugerencias (`HojaDondeEs.tsx:163,271`) solo muestra nombre y dirección, nunca el municipio o colonia, así que una calle y un municipio con el mismo nombre son indistinguibles.

## Qué se propone

Documento completo con los seis puntos y las cinco preguntas para el founder: [`docs/rediseno/26-alta-evento-lugar.md`](../../../rediseno/26-alta-evento-lugar.md).

1. Quitar el `autoFocus` del nombre.
2. "Confirmar" en vez de "Falta" cuando ya hay nombre o dirección leídos, con la ayuda ("Confirma la ubicación en el mapa") bajo el renglón.
3. Contexto (colonia/municipio) en cada sugerencia, con lo que ya trae Mapbox.
4. Pregunta abierta: ¿reutilizar la posición ya cacheada del teléfono (`ubicacionCercanaFresca()`, sin pedir permiso de nuevo) para ordenar las sugerencias de esta pantalla, o seguir solo con el centro de la ciudad salvo "Estoy aquí"?
5. La ayuda baja del botón al campo — cambia la decisión 3 del canon de formularios, solo en esta pantalla (alta de evento); las otras altas quedan para una pieza aparte si el founder lo pide.
6. **Añadido a pedido del gestor, caso con nombre "Galeana #423, S.L.P."** (founder, 2026-09-21): medido qué se manda hoy a Mapbox (ninguna de las dos búsquedas manda `country` ni `bbox`, ni limpia el texto, ni reintenta) y por qué falla — Mapbox elige primero 10 candidatos por coincidencia de texto y solo después reordenamos por distancia; si la calle correcta no entra en esos 10 (por ser "Galeana" suelto, sin el "Hermenegildo"), ningún reordenamiento la rescata. Propuesta: ciudad de contexto en cascada (texto → lugar leído del cartel → ciudad del chip de la Agenda, hoy sin hilar hasta el alta → posición del teléfono → San Luis Potosí), `bbox` de esa ciudad, texto limpiado, segunda búsqueda automática solo si la primera no trae nada cercano (cuidando el gasto de Mapbox), y pin a mano centrado en el contexto si nada funciona.
7. **Regla de ubicación cambiada por el founder** (`main` `0d397f1`, mismo día): la ubicación aproximada ahora sí puede viajar a Mapbox para ayudar a buscar direcciones, pedida con un toque en el momento en que sirve. Resuelve la pregunta abierta del punto 4 (ya no hay que elegir A/B); el punto 4 queda: usar la posición cacheada si existe, o un botón "Usar mi ubicación para buscar cerca" dentro de "Dónde es" si no hay ninguna. Se propone también el texto nuevo del aviso de privacidad (punto 7 del documento), para que el founder lo firme junto con el prototipo.

## Prototipo

[`docs/rediseno/prototipos/alta-evento-lugar.html`](../../../rediseno/prototipos/alta-evento-lugar.html), siete estados a 390×844 con los tokens del canon: recién abierto (hoy con autofocus contra la propuesta sin él), lugar encontrado en el directorio, dirección leída sin punto confirmado ("Confirmar"), sugerencias con contexto y cercanía, el aviso "Falta ubicación." bajo el renglón al intentar publicar sin resolver Dónde, el caso con nombre "Galeana #423, S.L.P." con las sugerencias ya acotadas a San Luis Potosí, y el caso sin ninguna pista con el botón "Usar mi ubicación para buscar cerca". Verificado con el navegador de la sesión antes de mostrarlo (disciplina front-visual). Publicado como Artifact privado para que el founder lo vea en su teléfono: https://claude.ai/artifact/XwFiwzkiZvgrmLZwvfgGWk (versión 3)

## Firmado por el founder (2026-09-21)

Sus palabras a las cinco preguntas (completas en el documento 26):

1. «Ya no sé da en auto focus de input text en app de iOS, la solución funciona bien aquí, una vez que el usuario selecciona el input text es aceptable cualquier reacomodo natural en composición.»
2. «Confirmar.»
3. «Si en el campo, es ayuda para recuperarse del error en el contexto, aplica como canon para todos los formularios.» — aprueba y **amplía**: no queda acotado a esta pantalla. Anotado como corrección a la decisión 3 en [15-formularios-canon-flujo-y-estados.md](../../../rediseno/15-formularios-canon-flujo-y-estados.md); esta pieza sigue construyendo solo en el alta de evento (lo asignado), y se avisa al gestor para que agregue a la cola una pieza que lo aplique en `FormularioLugar.tsx`, `FormularioArtista.tsx` y `FormularioPerfil.tsx`.
4. «Si apruebo.» — cascada de contexto y segunda búsqueda automática del caso "Galeana #423, S.L.P.".
5. «Apruebo.» — texto nuevo del aviso de privacidad.

## Código, primera parte (2026-09-21, antes de que A6 entre a `main`)

Por indicación del gestor: empezar por lo que no comparte archivo con A6 (OL-099, que solo toca el campo de precio en `FormularioEvento.tsx` y `src/lib/eventos.ts`), dejando `FormularioEvento.tsx` para el final.

- **`src/app/eventos/direccionContexto.ts` (nuevo).** Lógica pura del punto 6 del documento: `limpiarDireccion` (quita `#`/`No.`, expande `esq.`/`col.` y alias de ciudad como "S.L.P."/"SLP"), `ciudadDelTexto`, `ciudadDeContexto` (la cascada firmada: texto → lugar leído → chip → posición del teléfono → San Luis Potosí), `bboxDesdeCentro`, `necesitaReintento`/`necesitaReintentoLugares` (¿hace falta la segunda búsqueda?) y `textoParaReintento`. 21 pruebas, incluido el caso con nombre "Galeana #423, S.L.P." → "Galeana 423, San Luis Potosí", y que Rioverde/Aguascalientes/Guadalajara piden reintento por estar lejos.
- **`src/lib/geocodificar.ts` y `src/lib/buscarLugares.ts`.** `urlGeocodificar`/`buscarDirecciones` y `urlSugerir`/`sugerirLugares` aceptan un `bbox` opcional (acota a la ciudad de contexto, nunca a un país: sigue sin `country`). `LugarSugerido` suma `ciudad` (colonia/municipio, para distinguir aciertos con el mismo nombre) y `distanciaM` (la que da Mapbox en el paso "sugerir", para decidir el reintento sin gastar una llamada de más). Pruebas existentes actualizadas, más una por cada bbox nuevo.
- **`src/app/eventos/HojaDondeEs.tsx`.** La ciudad de contexto (con `useMemo`) manda la `proximity` y el `bbox` de ambas búsquedas; una segunda búsqueda automática, una sola vez, si la primera no trae nada dentro de 20 km de esa ciudad (texto limpio + ciudad pegada). Las sugerencias (direcciones y lugares) muestran su colonia/municipio. Botón nuevo "Usar mi ubicación para buscar cerca" (con un toque, `leerUbicacionCercana()`), solo cuando no hay ninguna otra pista de ciudad — nunca automático. La ayuda de qué falta baja del botón "Listo" al campo o renglón correspondiente ("Falta el nombre del sitio.", "Falta confirmar el pin.", "Falta la dirección exacta."), aplicando ya el canon ampliado por el founder.
- **`src/app/privacidad/page.tsx`.** Línea de ubicación actualizada con el texto que firmó el founder.
- **Sin tocar:** `FormularioEvento.tsx` (autofocus, estado "Confirmar" del renglón Dónde, ayuda del botón principal, y el hilado de la ciudad del chip hasta el alta) — para cuando el gestor confirme A6 en `main`.

**Verificación:** `npm run lint && npm run typecheck && npm test`: lint y typecheck en verde; 728 pruebas en verde (23 nuevas), 7 en rojo preexistentes y ajenas (sin `pg` en este árbol). Build en verde. Sin capturas móviles todavía: no hay pantalla nueva que mostrar mientras `FormularioEvento.tsx` sigue como estaba (las capturas van con la segunda parte). Las pruebas de componentes con navegador real (`*.componentes.test.mjs`, que ejercitan `HojaDondeEs` con Mapbox simulado) no corrieron: este árbol de trabajo no tiene Playwright instalado (mismo tipo de hueco que `pg`, ya anotado en OPEN_LOOPS por otra pieza); la cobertura de esta entrega es con pruebas unitarias puras, sin gastar ninguna llamada real a Mapbox (piden respuestas grabadas).

## Traer `main` (OL-103 en producción)

El gestor pidió traer `main` a la rama cuando conviniera, porque OL-103 (botón "Publicar evento" en ciudades sin lugares) ya estaba en producción y toca `src/components/Publicar.tsx` y `src/app/page.tsx`, los mismos archivos que necesitaba para hilar la ciudad del chip. `git merge origin/main`: un solo conflicto, en `docs/ops/OPEN_LOOPS.md` (cabecera "Last updated", "Ahora" y "Decidido" — los tres, ambos lados habían añadido al mismo sitio); resuelto combinando los dos lados, verificado línea por línea que ninguna de `main` desapareció y sin duplicados. El resto (Pincel Fase 1, obras colectivas, OL-102, etc.) se fusionó solo. `npm run lint && npm run typecheck && npm test` y build en verde tras el merge (734 pruebas).

## Código, segunda parte: `FormularioEvento.tsx` y ciudad del chip (2026-09-21)

El gestor confirmó que OL-099 solo toca, en `FormularioEvento.tsx`, el estado inicial de `precio` y el `<input name="precio">`, y en `src/lib/eventos.ts`, `extraerNumero`, la validación del precio y una línea de `cartelAFormulario` — ninguna de esas líneas se tocó aquí.

- **`FormularioEvento.tsx`.** Sin `autoFocus` en el campo del nombre (L2). Renglón Dónde con tres estados: vacío (`dondeVacio`, "Falta"), leído-pendiente (`dondeConfirmar`, valor = el texto leído, letrero "Confirmar", ayuda "Confirma la ubicación en el mapa." debajo) y resuelto (como hoy). El botón "Publicar evento" ya no lleva el `<small>` interno; "Falta el nombre." y "Falta ubicación." bajaron a debajo de sus propios campos. Nueva prop `ciudadContexto` (la ciudad del chip), reenviada a `HojaDondeEs`.
- **`src/app/eventos/nuevo/page.tsx`.** Lee `?ciudad=` de la URL, la resuelve con `ciudadPorSlug`/`cargarCiudades()` y se la pasa a `FormularioEvento` como `ciudadContexto` — sin pedir ningún dato nuevo a la persona.
- **`src/components/Publicar.tsx`.** El botón "Publicar evento" ahora también lleva `?ciudad=` (como ya hacía "Registrar artista").
- **`src/app/page.tsx`.** Pasa `ciudad` (el slug de la Agenda, o `null` si es la ciudad inicial) al `<Publicar>`.

**Verificación:** `npm run lint && npm run typecheck && npm test`: en verde, 734 pruebas (sin cambios de número: esta parte no agregó pruebas propias, ya cubierta por `direccionContexto.test.ts` y las de `HojaDondeEs`/`geocodificar`/`buscarLugares` de la primera mitad); 7 rojas preexistentes y ajenas. Build en verde.

**Verificación visual (front-visual), sin Supabase ni Mapbox reales.** Sin backend local de PGlite a mano en esta sesión, se montó un arnés ligero en el scratchpad (mismo patrón de dobles que `flyer.componentes.test.mjs`, con `esbuild`, ya instalado — **sin instalar Playwright**, como pidió el gestor): sirve `FormularioEvento` real, con módulos simulados (acciones, ubicación, config, Supabase) y sin llamar nunca a Mapbox, en un servidor `http` llano abierto con el navegador de la sesión (390×?? — se emuló 375×812, la resolución móvil de la pane; los estados no dependen del ancho exacto). Tres estados mirados y confirmados contra la pantalla real (no solo el prototipo estático):
1. **Recién abierto, vacío:** sin autofocus, tarjeta del cartel visible, "Falta el nombre." bajo el campo, "Falta ubicación." bajo el renglón Dónde, botón sin texto pequeño adentro.
2. **Confirmar:** con `sitio_texto`/`sitio_direccion` puestos y sin punto, el renglón Dónde muestra el texto leído, el letrero dice "Confirmar" y debajo "Confirma la ubicación en el mapa." — nunca "Falta".
3. **Resuelto:** con un lugar del directorio elegido, Dónde muestra su nombre y "Cambiar", sin ninguna ayuda debajo.

No se generaron PNG (el navegador de esta sesión no expone guardar la captura a archivo sin Playwright); el arnés (`build.mjs`, en el scratchpad de la sesión) queda disponible por si el gestor quiere reabrirlo. Los estados que dependen de una búsqueda real a Mapbox (sugerencias con contexto y cercanía, botón "Usar mi ubicación") no se pudieron mirar en vivo sin red simulada; ya están cubiertos por las 21 pruebas de `direccionContexto.test.ts` y por el prototipo estático que firmó el founder.

## Traer `main` otra vez (OL-099 en producción)

El gestor confirmó que OL-099 (PR #123, `d0512dc`) ya estaba en `main` y pidió traerla para cerrar. `git merge origin/main`: un solo conflicto real, otra vez en `docs/ops/OPEN_LOOPS.md` (cabecera y sección "Ahora"); `FormularioEvento.tsx` se fusionó **solo**, sin conflicto — confirma que las líneas que evitó cada pieza (las de precio, las mías) no se tocaron entre sí. Al resolver OPEN_LOOPS se encontró y corrigió una errata de mi propio merge anterior (se había perdido la palabra "antes," al empalmar dos trozos de la cabecera "Last updated"); corregida sin tocar nada más de ese archivo. Verificado línea por línea que nada de `main` desapareció y sin duplicados. `npm run lint && npm run typecheck && npm test` (742 pruebas) y build en verde.

## Revisión del gestor y reentrega (2026-09-21)

El gestor revisó `c82efd7` y devolvió tres puntos sobre la búsqueda (dos bloqueantes) y, por separado, un aviso del founder sobre formularios que se salían de la tarjeta en su iPhone, con instrucción de comprobar `HojaDondeEs` con datos que rompan.

### 1 — El `bbox` excluía en vez de sesgar (bloqueante)
Un `bbox` no ordena como `proximity`: recorta. Con el respaldo (`origen: "inicial"`, sin ninguna pista real) acotar a 15 km de San Luis Potosí dejaba a cualquiera publicando en otra ciudad sin encontrar jamás su propia dirección — contradice "el contexto ordena, no limita". Arreglo en `direccionContexto.ts`:
- `bboxParaContexto(contexto)`: `undefined` cuando `origen === "inicial"`; el `bbox` de la ciudad en cualquier otro caso (texto, lugar, chip o posición — una pista real).
- `buscarConContexto(texto, contexto, buscar, haceFalta)`: hasta tres intentos, nunca más — (1) el texto con `bbox` si hay pista real; (2) si no hubo nada cerca, el texto limpio con la ciudad pegada, mismo `bbox`; (3) si aun así nada, una vez sin `bbox` (solo `proximity`). `HojaDondeEs.tsx` ya no arma la búsqueda a mano: llama a esta función, inyectando el `buscar` real (Mapbox) y el criterio de "cerca" (por coordenadas para direcciones, por `distanciaM` para lugares).
- 5 pruebas nuevas, con los tres casos que pidió el gestor: origen "inicial" → primera llamada sin `bbox`; chip en San Luis + dirección real en Matehuala (~190 km, que el texto no nombra) → el `bbox` de San Luis no la encuentra, la tercera búsqueda sin `bbox` sí; el caso "Galeana #423, S.L.P." sigue pasando (el reintento con el texto limpio la encuentra, sin necesitar una tercera llamada).

### 2 — Redondear lo que sale hacia Mapbox como pista de ubicación (bloqueante)
`redondearParaMapbox(p)`, a 3 decimales (~100 m), como pide la regla de ubicación de DEFINICION ("aproximada"). Se aplica a la posición del teléfono (cacheada o pedida con el botón) antes de entrar a la cascada de contexto — nunca al pin que la persona confirma a mano (`punto`), que es el dato del propio evento, no su ubicación. Una prueba fija el redondeo exacto.

### 3 — `?ciudad=` inventado o vacío no debe caer en San Luis Potosí por respaldo
`ciudadPorSlug` (la función general) cae en San Luis Potosí ante cualquier slug que no reconoce — correcto para otros usos, pero aquí un valor inventado en la URL terminaría sesgando la búsqueda como si la persona hubiera elegido esa ciudad. `ciudadDesdeSlug(slug, ciudades)`, nueva en `direccionContexto.ts`: solo resuelve si el slug coincide de verdad con una ciudad; cualquier otra cosa (inventado, vacío, `null`) cae en `null` — sin ciudad de contexto. Usada en `nuevo/page.tsx` en vez de `ciudadPorSlug` directo. 4 pruebas.

### Formularios que se salen de la tarjeta (aviso del founder a todos los operadores)
Medido con datos que rompen (dirección de 120+ caracteres, nombre de lugar largo, dos lugares para poder abrir la hoja) a 320, 375 y 390 px, con `getBoundingClientRect()` sobre cada elemento (no solo a ojo): **cero elementos con el borde derecho más allá del viewport y `scrollWidth === clientWidth` (sin scroll horizontal) en los nueve casos** (3 anchos × 3 pantallas: el renglón Dónde en "Confirmar", el renglón Dónde resuelto con un lugar de nombre largo, y la hoja "Dónde es" con ese mismo lugar en la lista) y también en "Es en otro sitio" con el nombre y la dirección largos precargados, a 320 y 390 px.

Un hallazgo real al mirarlo: la rama "Confirmar" mostraba `textoDelSitio(otro)` — nombre **y** dirección juntos — que con datos largos duplicaba el texto y volvía el renglón desproporcionadamente alto (sin desbordar horizontalmente, pero mal). Corregido para mostrar una sola línea leída (`otro.direccion || otro.sitioTexto`), como ya mostraba el prototipo firmado.

Revisión del CSS nuevo (`HojaDondeEs.module.css`): la única regla propia que agregó esta pieza es `.usarUbicacion` (un botón `flex`, no una rejilla). Se le agregó `min-width: 0` y `overflow-wrap: anywhere` al texto (envuelto en su propio `<span>`, antes iba suelto) y `flex-shrink: 0` al icono, para que un texto largo no empuje el botón fuera de su tarjeta. El resto de esta pieza reutiliza el canon (`ui/FormularioCanon`, `ui/Sugerencia`) sin estilos propios, tal como pide el founder; `FormularioCanon.module.css` (compartido por todos los formularios, no tocado aquí) ya trae `overflow-wrap: anywhere` en `.valor`, y la medición no encontró desbordes ahí tampoco.

**Verificación:** `npm run lint && npm run typecheck && npm test`: en verde, 751 pruebas (35 nuevas en total en `direccionContexto.test.ts`), 7 rojas preexistentes y ajenas (sin `pg`). Build en verde.

## Estado

Firmado, con el código completo (incluidas las tres correcciones del gestor y la comprobación de desbordes), y con `main` al día (OL-103 y OL-099). `npm run lint && npm run typecheck && npm test` y build en verde. Reentrega al gestor.

## Pasos

- [x] Aviso de arranque al gestor y su visto bueno.
- [x] Rama `alta-evento-lugar` desde `origin/main`.
- [x] Medir el estado actual leyendo el código, sin tocar nada.
- [x] Documento de propuesta y prototipo (siete estados).
- [x] Prototipo publicado como Artifact y entregado en este chat para firma.
- [x] Commit local de los documentos.
- [x] Firma del founder (documento + prototipo), con ampliación del canon a todos los formularios.
- [x] Código: contexto y búsqueda (`direccionContexto.ts`), `HojaDondeEs.tsx`, aviso de privacidad.
- [x] Traer `main` (OL-103 en producción), conflicto resuelto en OPEN_LOOPS.
- [x] `FormularioEvento.tsx`: autofocus, "Confirmar", ayuda bajo el campo, ciudad del chip.
- [x] Build y verificación visual (tres estados, sin Mapbox real).
- [ ] Entrega consolidada al gestor.
