# 26 · Lugar y dirección en el alta de evento

**Estado:** propuesta, esperando firma. **Prototipo:** [`prototipos/alta-evento-lugar.html`](prototipos/alta-evento-lugar.html) · **OL:** OL-100 · **Bitácora:** [135](../bitacora/2026/09/135-alta-evento-lugar.md)

## Lo que pidió el founder (2026-09-21), con sus palabras

- **L2.** «Cuando usuario quiere publicar evento, el primer campo se pone en focus y sale teclado. Eso hace que botón de subir cartel se recorra y oculte, eso lo vi en android, confirma que esto suceda y no haya sido que el usuario seleccionó sin que lo notara. No me gusta que se recorra la opción de subir cartel porque no es visible.»
- **L3.** «Cuando se sube cartel se lee la dirección y nombre de lugar, pero dice "Falta", no es correcto ese letrero, debe decir confirmar porque al entrar dirección aparece escrita pero sin seleccionar en el mapa, hay que pulir eso para que sea claro lo que el usuario debe hacer, de entrada tratar de que sí se identifique una dirección con mapbox.»
- **L37 (segunda mitad).** «El lugar pide confirmación aunque sí se escribe un lugar y lo que hace es pedir confirmación de ese lugar sin tomar en cuenta contexto, por ejemplo me sugiere lugares en Soledad de Graciano Sánchez aunque de hecho cerca de donde estoy hay una calle con ese nombre. Incluso podría estar dentro del lugar. Sigue siendo complicado y confuso el momento de asignación de lugar en eventos. Además el hecho de que la retroalimentación de sistema aparezca dentro del botón hace difícil leerla, el estándar es colocarla debajo del botón principal de creación, ejemplo: Falta ubicación. O mejor aún debajo del campo faltante como help text.»
- **Caso nuevo, vía el gestor (2026-09-21).** «Al leer cartel, especifica que falta dirección, al entrar a configurar pone dirección en campo (ejemplo Galeana #423, S.L.P., así viene en cartel) Pero muestra listado de sugerencias en Rioverde, Aguascalientes o guadalajara, es probable que la calle sea hermenegildo galeana en san luis por eso no la muestra como sugerencia, pero eso pasa mucho, la gente escribe parte de la calle solamente, necesito que el sistema pueda ayudar considerando contexto a ubicar dirección cerca.» Es el corazón de esta pieza: se usa como caso con nombre propio, «Galeana #423, S.L.P.», en el prototipo y en el código.

**Regla de ubicación cambiada, ya en `main` (2026-09-21, `0d397f1`).** El founder sustituyó la regla vieja («sirve para ordenar por cercanía, nada más») por una nueva en `docs/DEFINICION.md`: *«Ubicación: se pide con un toque de la persona, en el momento en que le sirve, y se usa para ayudarle (ordenar por cercanía, encontrar direcciones, centrar el mapa). Vive en su teléfono, aproximada y por poco tiempo: nunca se guarda en nuestra base ni se asocia a su cuenta. Puede viajar a Mapbox, aproximada, para buscar direcciones.»* Con sus palabras: *«si es necesario cambiar reglas de privacidad entonces lo hacemos pero el usuario agradecerá la ayuda»*. Esto **resuelve la pregunta 3 de la versión anterior de este documento** (ya no hace falta elegir entre A y B: la ubicación aproximada sí se usa para ayudar a buscar, con un toque cuando hace falta pedirla) y ajusta el punto 6 de abajo.

## Lo que confirmé leyendo el código (sin tocar nada)

**L2, confirmado.** En [`FormularioEvento.tsx:525`](../../src/app/eventos/FormularioEvento.tsx) el campo del nombre tiene `autoFocus={esAlta}`. Al abrir el alta, el teclado sale solo. La tarjeta del cartel (`TarjetaCartel`, línea 521) va *antes* que el campo del nombre en el documento, así que el teclado no la tapa por estar debajo: la empuja fuera de la vista al reducir el alto útil de la pantalla y desplazar el scroll hacia el campo enfocado. No fue un toque del usuario: es el `autoFocus`.

**L3, confirmado y ubicado el bug.** `dondeResuelto` (línea 340) usa `sitioListo(otro)` (`direccionEvento.ts:16`), que exige `!otro.pinPendiente`. Cuando el cartel lee un lugar o una dirección (`leerCartel`, líneas 484-490) y no hay `lugarId` exacto, deja `pinPendiente: true` — el pin no se confirmó en el mapa. Con eso, `dondeResuelto` da `false` y el renglón Dónde muestra el letrero genérico **"Falta"** (línea 582), aunque ya hay un nombre y una dirección escritos. Es exactamente lo que describe el founder.

**L37, dos problemas distintos:**
1. **Retroalimentación dentro del botón.** Hoy "falta dónde" vive dentro de `<Boton>` (`canon.faltaBoton`, línea 712) y "falta confirmar el pin" dentro del botón "Listo" de la hoja (`HojaDondeEs.tsx:238`). Es el mismo patrón en `FormularioLugar.tsx`, `FormularioArtista.tsx` y `FormularioPerfil.tsx` — **fuera de esta pieza**: aquí solo se toca el alta de evento (docs de asignación); si el founder quiere el mismo cambio en las otras altas, es una pieza aparte.
2. **Sugerencias sin contexto.** `HojaDondeEs.tsx` ya ordena por cercanía real (`buscarDirecciones`/`sugerirLugares` reordenan con `distanciaKm` en `geocodificar.ts` y `buscarLugares.ts`) y `cerca` es el punto elegido, o el de "Estoy aquí" (`yo`, solo tras tocar el botón — `leerUbicacion(true)`), o si no hay ninguno, el centro de San Luis Potosí (`CIUDAD_INICIAL.centro`). **No se pide ubicación sin botón: cumple la regla de DEFINICION.** La confusión que describe el founder (una calle llamada "Soledad de Graciano Sánchez" contra el municipio del mismo nombre) es que la lista de sugerencias (`sug.renglon`, línea 163 y 271) solo muestra nombre y dirección — nunca dice a qué colonia o municipio pertenece cada resultado, así que dos aciertos con el mismo nombre son indistinguibles.

**"Galeana #423, S.L.P.", medido: qué se le manda a Mapbox hoy.** Pedido explícito del gestor antes de proponer nada. Dos búsquedas distintas en el código, ninguna con sesgo fuerte de lugar:
- `urlGeocodificar` (`geocodificar.ts`, Geocoding v6 `forward`, para la dirección del campo "Buscar la dirección" en `HojaDondeEs.tsx`): manda `q`, `autocomplete=true`, `language=es`, `limit=10`, `proximity=<cerca>`, `types=address,street,place,locality,neighborhood`. **Sin `country`.** Sí manda `proximity` (hoy, con nada más escrito, cae al centro de San Luis Potosí).
- `urlSugerir` (`buscarLugares.ts`, Search Box v1 `suggest`, para "Nombre o dirección" en la lista de lugares): manda `q`, `session_token`, `language=es`, `limit=10`, `proximity=<cerca>`, `types=poi,address`. **Sin `country` tampoco.**
- Ninguna de las dos manda `bbox`, ninguna limpia el texto (`#`, `No.`, `S.L.P.` sin expandir) y ninguna reintenta con más contexto si el primer intento no trae nada cercano. `proximity` sí viaja siempre — el problema no es que falte el sesgo, es que **Mapbox decide primero qué 10 resultados devolver por coincidencia de texto, y solo después nosotros los reordenamos por distancia** (`sort((a,b) => distanciaKm(...))`, mismo archivo). Con "Galeana" suelto, Mapbox prioriza por nombre lugares que se llaman exactamente "Galeana" (hay municipios con ese nombre en varios estados) sobre una calle compuesta como "Hermenegildo Galeana" en San Luis: si esa calle no entra en los 10 candidatos que Mapbox eligió, ningún reordenamiento nuestro la puede rescatar — no estaba en la lista.

## Qué se propone

### 1 — Quitar el `autoFocus` del nombre (L2)
El campo del nombre deja de enfocarse solo al abrir el alta. La persona toca para escribir cuando quiere; mientras tanto, la tarjeta del cartel y todo el formulario se ven completos, sin teclado. Cambio de una línea (`autoFocus={esAlta}` → sin autofocus); ya no compite nada por ese primer toque.

### 2 — "Confirmar" en vez de "Falta", cuando ya hay algo escrito (L3)
Tres estados distintos para el renglón Dónde, no dos:
- **Vacío de verdad** (nada escrito): valor "Falta", icono de lupa → abre la hoja de búsqueda. Como hoy.
- **Leído, pendiente de confirmar** (hay nombre/dirección del cartel o de una sugerencia, pero el pin no está puesto o no coincide): valor = el texto leído (nombre o dirección), letrero de acción "Confirmar" en vez de "Falta", con una ayuda debajo del renglón: *"Confirma la ubicación en el mapa"*. Toca abrir la hoja directo en el mapa, no en la búsqueda.
- **Resuelto** (pin confirmado o lugar del directorio): como hoy, con "Cambiar".

Esto separa `dondeResuelto` (listo para publicar) de un nuevo `dondeIniciado` (hay algo, falta confirmar) — sin cambiar la regla de publicar: seguir exigiendo el pin confirmado antes de guardar, solo que el letrero ya no dice "Falta" cuando sí hay algo.

### 3 — Contexto en las sugerencias, para acertar a la primera (L3 y L37)
Cada sugerencia de la hoja "Dónde es" (lugares y direcciones) agrega una segunda línea con el municipio o colonia que ya trae Mapbox en el contexto (`ciudadDelContexto`, ya usado en otras búsquedas), para distinguir "Calle Soledad de Graciano Sánchez, San Luis Potosí" del municipio de Soledad de Graciano Sánchez. No pide un dato nuevo: ya viene en la respuesta de Mapbox y hoy se descarta.

### 4 — Cercanía de las sugerencias: ya resuelto por la nueva regla de ubicación
Con la regla nueva de `DEFINICION.md` (arriba), esto ya no es una decisión abierta: la ubicación aproximada sí ayuda a buscar direcciones, con un toque cuando hace falta pedirla. La hoja "Dónde es" usa, en este orden:
1. La última posición aproximada ya guardada en el teléfono (`ubicacionCercanaFresca()`, `src/lib/ubicacion.ts`), si sigue fresca — sin pedir permiso de nuevo, porque ya se pidió antes (Cercanos u otra pantalla).
2. Si no hay ninguna guardada, un botón para pedirla con un toque, dentro de la propia hoja "Dónde es" (no automático al abrir), con una frase corta de para qué: *"Usar mi ubicación para buscar cerca"*. Al tocarlo, se pide una vez (aproximada, la misma `leerUbicacionCercana()` de Cercanos) y se guarda para las próximas veces.
3. Si la persona no toca ese botón, se sigue con el centro de la ciudad de contexto (punto 6) o "Estoy aquí" sobre el mapa, como hoy.

Redondeada (~100 m, ya es lo que hace `ubicacion.ts`) al viajar a Mapbox como `proximity`; nunca a nuestro servidor.

### 5 — La ayuda va debajo del campo, no dentro del botón (L37, cambia el canon)
Esto **cambia una decisión firmada** del canon de formularios (docs/rediseno/15, decisión 3: "el botón dice qué falta"). El founder lo pide explícito: *"el estándar es colocarla debajo del botón principal de creación... o mejor aún debajo del campo faltante como help text"*. Se implementa la segunda opción, la que él mismo prefiere:
- El botón "Publicar evento" deja de llevar el `<small>` con "falta el nombre" / "falta dónde".
- Cada campo que falta muestra su propia ayuda debajo, en el renglón: "Falta el nombre" bajo el campo del nombre si está vacío, "Falta ubicación" bajo el renglón Dónde si no se confirmó.
- Mismo cambio en el botón "Listo" de la hoja "Es en otro sitio" (`HojaDondeEs.tsx`): la ayuda baja al renglón que falta, no al botón.
- **Alcance:** solo el alta de evento (`FormularioEvento.tsx`, `HojaDondeEs.tsx`), que es lo asignado en esta pieza. `FormularioLugar.tsx`, `FormularioArtista.tsx` y `FormularioPerfil.tsx` siguen con el patrón de hoy hasta que el founder pida extenderlo — se anota como pendiente, no se toca aquí.

### 6 — Direcciones a medias: usar el contexto para acercar la búsqueda ("Galeana #423, S.L.P.")
Esto ataca la causa medida arriba: que la calle correcta ni siquiera entra en los 10 candidatos que Mapbox propone. Cuatro cambios, del más barato al más caro:

1. **Leer el contexto que ya tenemos, sin pedir nada nuevo a la persona**, en el orden que fijó el founder (vía el gestor, 2026-09-21):
   - **(a) El propio texto.** Si trae "S.L.P.", "SLP", "San Luis" o el nombre completo de una ciudad conocida, una colonia o un código postal, se reconoce y se usa para acotar — antes de mandar nada a Mapbox.
   - **(b) El lugar que ya leyó el cartel**, si coincide con uno del directorio: su punto es la mejor pista, mejor que cualquier ciudad (ya se usa cuando hay `lugarId`; se propone usarlo también como `proximity` cuando el cartel trae *nombre y dirección* sin `lugarId` exacto).
   - **(c) La ciudad elegida en el chip de la Agenda**, desde la que se entró a "Publicar evento". **Hoy este dato no llega al alta de evento** (`/eventos/nuevo` no recibe `?ciudad=`; es un hueco que esta pieza tendría que cerrar, hilando el slug de la ciudad desde `Publicar.tsx` hasta `nuevo/page.tsx`).
   - **(d) La posición aproximada del teléfono** (punto 4: la ya cacheada, o pedida con un toque dentro de "Dónde es" si no hay ninguna) — con la nueva regla de `DEFINICION.md`, ya no hace falta guardar esto para "después"; se puede pedir aquí mismo si hace falta.
   - Si nada de eso resuelve, el centro de San Luis Potosí, como hoy.
2. **Con esa ciudad de contexto, mandar `proximity` a su centro (ya se hace, con el respaldo de hoy) y agregar `bbox`** del área metropolitana cuando el contexto sea una ciudad conocida, para que Mapbox no proponga ni considere nada fuera de esa área en el primer intento.
3. **Limpiar el texto antes de buscar:** quitar `#`, `No.`, expandir `S.L.P.`/`SLP` → `San Luis Potosí`, `esq.`, `col.` — para que "Galeana #423, S.L.P." llegue a Mapbox como algo más cercano a "Galeana 423, San Luis Potosí".
4. **Una segunda búsqueda automática, solo si la primera no dio nada cercano:** repetir con el texto limpio *más* el nombre de la ciudad de contexto pegado ("Galeana 423, San Luis Potosí"). Nunca en cada tecla — cuidando el gasto (punto 5 del gestor): la segunda búsqueda solo dispara cuando la primera ya llegó y no trajo nada dentro de un radio razonable de la ciudad de contexto.
5. **Si aun así no hay nada bueno, la salida no es una lista de ciudades lejanas.** Se ofrece poner el pin a mano en el mapa, centrado en la ciudad de contexto, con el texto escrito conservado tal cual (no se pierde lo que la persona ya tecleó).

**Qué sale del teléfono hacia Mapbox:** en todos los casos de arriba, lo que viaja es `proximity`/`bbox` — coordenadas de un centro de ciudad o de la posición aproximada de la persona, redondeada (~100 m) — directo del teléfono a Mapbox, nunca a nuestro servidor. Con la regla nueva de `DEFINICION.md` esto ya está aprobado en general; lo único que decide esta pieza es *cuándo* se pide esa posición (punto 4: cacheada primero, botón explícito si no hay ninguna).

### 7 — Una línea en el aviso de privacidad (pedido del gestor)
La regla de ubicación cambió en `DEFINICION.md`; el aviso de privacidad (`src/app/privacidad/page.tsx`) tiene una línea vieja que hay que actualizar en la fase de código, para que diga en llano lo mismo que la regla nueva. Hoy dice:

> «Tu ubicación, solo cuando tocas «Cerca de mí» o «Mi ubicación»: sirve para ordenar la lista o centrar el mapa y no se guarda.»

Propuesta de texto nuevo (para que el founder lo revise junto con el prototipo):

> «Tu ubicación, solo cuando la pides con un toque (por ejemplo «Cerca de mí» o al buscar una dirección al publicar un lugar o evento): sirve para ordenar la lista, centrar el mapa o acercar la búsqueda de direcciones. Vive en tu teléfono, aproximada y por poco tiempo; puede viajar a Mapbox para esa búsqueda, pero nunca se guarda en nuestra base ni queda asociada a tu cuenta.»

**Prototipo:** estado nuevo, "dirección leída del cartel, a medias → sugerencias cercanas primero → Confirmar", con el caso con nombre "Galeana #423, S.L.P." (ver estado 6, abajo).

## Qué cánones se tocan

| Canon | Cambio |
| --- | --- |
| Formularios (canon del alta) | Decisión 3 ("el botón dice qué falta") se acota: en el alta de evento, la ayuda va debajo del campo que falta, no dentro del botón. Las demás altas no cambian todavía. |
| DEFINICION — ubicación | Ya cambiada en `main` por el founder (2026-09-21, `0d397f1`): la ubicación aproximada ayuda a buscar direcciones y puede viajar a Mapbox. Esta pieza aplica esa regla nueva en el alta de evento y propone la línea del aviso de privacidad que la refleja (punto 7). |
| Maquetación plana, filtrar no es navegar, memoria de pantalla | No cambian. |

## Los siete estados del prototipo

1. **Recién abierto:** hoy (con `autoFocus`, teclado tapando la tarjeta) contra la propuesta (sin autofocus, tarjeta y campo visibles).
2. **Tras leer el cartel, lugar encontrado en el directorio:** Dónde resuelto con el nombre del lugar.
3. **Dirección leída, sin punto confirmado:** valor con el texto leído, letrero "Confirmar" y la ayuda *"Confirma la ubicación en el mapa"* debajo del renglón — no "Falta".
4. **Sugerencias con contexto y cercanía:** la hoja "Dónde es" con resultados que dicen su municipio/colonia.
5. **Intento de publicar sin ubicación:** el botón "Publicar evento" sin texto pequeño adentro; debajo del renglón Dónde, "Falta ubicación".
6. **Dirección a medias, caso "Galeana #423, S.L.P.":** el cartel leyó ese texto tal cual; la búsqueda lo limpia y lo acota a la ciudad de contexto (San Luis Potosí) antes de mostrar nada; las sugerencias salen todas cercanas ("Hermenegildo Galeana" primero, con su colonia), nunca Rioverde, Aguascalientes o Guadalajara; al elegir una, pasa al estado "Confirmar".
7. **Sin pista en el texto ni en el cartel:** un botón con un toque, "Usar mi ubicación para buscar cerca", con su frase de para qué (regla nueva de ubicación); si no se toca, sigue con el centro de la ciudad de contexto.

## Pregunta para el founder

1. ¿Confirmas que el `autoFocus` es la causa de L2 y que quitarlo resuelve lo que viste en Android?
2. ¿"Confirmar" en vez de "Falta" cuando ya hay nombre o dirección leídos, tal como se ve en el estado 3?
3. ¿Firmas que la ayuda baje del botón al campo, solo en esta pantalla (alta de evento), dejando las otras altas para una pieza aparte si la quieres extender?
4. Sobre el caso "Galeana #423, S.L.P." (punto 6): ¿apruebas usar como ciudad de contexto, en este orden, el texto mismo → el lugar leído del cartel → la ciudad del chip de la Agenda (hay que hilar ese dato hasta el alta, hoy no llega) → la posición del teléfono (cacheada, o pedida con un toque dentro de "Dónde es") → San Luis Potosí de respaldo? ¿Y la segunda búsqueda automática solo cuando la primera no trae nada cercano (para cuidar el gasto de Mapbox)?
5. ¿Apruebas el texto nuevo del aviso de privacidad (punto 7), que refleja la regla de ubicación que ya firmaste?

(La pregunta sobre reutilizar la posición cacheada de la versión anterior de este documento quedó resuelta por la nueva regla de ubicación en `DEFINICION.md`: ya no es una decisión abierta de esta pieza.)

## Cuándo empieza el código

Esta pieza comparte `FormularioEvento.tsx` con A6 (OL-099, precio numérico). El código de A7 espera a que A6 esté en `main` (lo confirma el gestor) y a la firma del founder sobre este documento y el prototipo.
