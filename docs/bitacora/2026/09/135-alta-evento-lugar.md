# 135 · Lugar y dirección en el alta de evento

**Fecha:** 2026-09-21 · **Rama:** `alta-evento-lugar` · **OL:** OL-100 · **PR:** pendiente (espera A6 en `main`)

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

## Estado

Firmado. Espera solo la confirmación del gestor de que A6 (OL-099, precio numérico) esté en `main` — comparten `FormularioEvento.tsx` — para empezar el código.

## Pasos

- [x] Aviso de arranque al gestor y su visto bueno.
- [x] Rama `alta-evento-lugar` desde `origin/main`.
- [x] Medir el estado actual leyendo el código, sin tocar nada.
- [x] Documento de propuesta y prototipo (siete estados).
- [x] Prototipo publicado como Artifact y entregado en este chat para firma.
- [x] Commit local de los documentos.
- [x] Firma del founder (documento + prototipo), con ampliación del canon a todos los formularios.
- [ ] Confirmación del gestor: A6 (OL-099) en `main`.
- [ ] Código, pruebas focalizadas, build y capturas 390×844.
- [ ] Entrega consolidada al gestor.
