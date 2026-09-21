# 26 · Lugar y dirección en el alta de evento

**Estado:** propuesta, esperando firma. **Prototipo:** [`prototipos/alta-evento-lugar.html`](prototipos/alta-evento-lugar.html) · **OL:** OL-100 · **Bitácora:** [135](../bitacora/2026/09/135-alta-evento-lugar.md)

## Lo que pidió el founder (2026-09-21), con sus palabras

- **L2.** «Cuando usuario quiere publicar evento, el primer campo se pone en focus y sale teclado. Eso hace que botón de subir cartel se recorra y oculte, eso lo vi en android, confirma que esto suceda y no haya sido que el usuario seleccionó sin que lo notara. No me gusta que se recorra la opción de subir cartel porque no es visible.»
- **L3.** «Cuando se sube cartel se lee la dirección y nombre de lugar, pero dice "Falta", no es correcto ese letrero, debe decir confirmar porque al entrar dirección aparece escrita pero sin seleccionar en el mapa, hay que pulir eso para que sea claro lo que el usuario debe hacer, de entrada tratar de que sí se identifique una dirección con mapbox.»
- **L37 (segunda mitad).** «El lugar pide confirmación aunque sí se escribe un lugar y lo que hace es pedir confirmación de ese lugar sin tomar en cuenta contexto, por ejemplo me sugiere lugares en Soledad de Graciano Sánchez aunque de hecho cerca de donde estoy hay una calle con ese nombre. Incluso podría estar dentro del lugar. Sigue siendo complicado y confuso el momento de asignación de lugar en eventos. Además el hecho de que la retroalimentación de sistema aparezca dentro del botón hace difícil leerla, el estándar es colocarla debajo del botón principal de creación, ejemplo: Falta ubicación. O mejor aún debajo del campo faltante como help text.»

## Lo que confirmé leyendo el código (sin tocar nada)

**L2, confirmado.** En [`FormularioEvento.tsx:525`](../../src/app/eventos/FormularioEvento.tsx) el campo del nombre tiene `autoFocus={esAlta}`. Al abrir el alta, el teclado sale solo. La tarjeta del cartel (`TarjetaCartel`, línea 521) va *antes* que el campo del nombre en el documento, así que el teclado no la tapa por estar debajo: la empuja fuera de la vista al reducir el alto útil de la pantalla y desplazar el scroll hacia el campo enfocado. No fue un toque del usuario: es el `autoFocus`.

**L3, confirmado y ubicado el bug.** `dondeResuelto` (línea 340) usa `sitioListo(otro)` (`direccionEvento.ts:16`), que exige `!otro.pinPendiente`. Cuando el cartel lee un lugar o una dirección (`leerCartel`, líneas 484-490) y no hay `lugarId` exacto, deja `pinPendiente: true` — el pin no se confirmó en el mapa. Con eso, `dondeResuelto` da `false` y el renglón Dónde muestra el letrero genérico **"Falta"** (línea 582), aunque ya hay un nombre y una dirección escritos. Es exactamente lo que describe el founder.

**L37, dos problemas distintos:**
1. **Retroalimentación dentro del botón.** Hoy "falta dónde" vive dentro de `<Boton>` (`canon.faltaBoton`, línea 712) y "falta confirmar el pin" dentro del botón "Listo" de la hoja (`HojaDondeEs.tsx:238`). Es el mismo patrón en `FormularioLugar.tsx`, `FormularioArtista.tsx` y `FormularioPerfil.tsx` — **fuera de esta pieza**: aquí solo se toca el alta de evento (docs de asignación); si el founder quiere el mismo cambio en las otras altas, es una pieza aparte.
2. **Sugerencias sin contexto.** `HojaDondeEs.tsx` ya ordena por cercanía real (`buscarDirecciones`/`sugerirLugares` reordenan con `distanciaKm` en `geocodificar.ts` y `buscarLugares.ts`) y `cerca` es el punto elegido, o el de "Estoy aquí" (`yo`, solo tras tocar el botón — `leerUbicacion(true)`), o si no hay ninguno, el centro de San Luis Potosí (`CIUDAD_INICIAL.centro`). **No se pide ubicación sin botón: cumple la regla de DEFINICION.** La confusión que describe el founder (una calle llamada "Soledad de Graciano Sánchez" contra el municipio del mismo nombre) es que la lista de sugerencias (`sug.renglon`, línea 163 y 271) solo muestra nombre y dirección — nunca dice a qué colonia o municipio pertenece cada resultado, así que dos aciertos con el mismo nombre son indistinguibles.

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

### 4 — Cercanía de las sugerencias: una decisión para el founder
Hoy la búsqueda ya ordena por cercanía real y solo usa la ubicación si la persona toca "Estoy aquí" en el mapa (cumple "ubicación solo con botón"). Falta decidir **una cosa nueva**: si además de eso, la hoja usa de entrada la última posición aproximada que ya quedó guardada en el teléfono por otra pantalla (`ubicacionCercanaFresca()`, `src/lib/ubicacion.ts` — no pide permiso de nuevo, ya se pidió antes en Cercanos), para que la lista de sugerencias salga ordenada por dónde está la persona *sin que lo pida en esta pantalla*. Dos caminos:
- **A. Reutilizar la posición cacheada** (si existe y sigue fresca): más precisa que el centro de la ciudad, sin pedir permiso nuevo — pero la persona no lo pidió *en esta pantalla*, aunque sí lo pidió antes en otra.
- **B. Sin ubicación aquí:** seguir con el centro de la ciudad (San Luis Potosí) como hoy, y que "Estoy aquí" sea la única forma de acercar la búsqueda a la persona en esta pantalla.

**Recomiendo A**, porque no widens el permiso (ya se pidió, ya se usa para lo mismo: ordenar por cercanía) y responde directo a la queja del founder. Lo dejo como pregunta explícita porque toca la regla de DEFINICION ("ubicación del usuario solo si la pide con un botón") y es su decisión, no la mía.

### 5 — La ayuda va debajo del campo, no dentro del botón (L37, cambia el canon)
Esto **cambia una decisión firmada** del canon de formularios (docs/rediseno/15, decisión 3: "el botón dice qué falta"). El founder lo pide explícito: *"el estándar es colocarla debajo del botón principal de creación... o mejor aún debajo del campo faltante como help text"*. Se implementa la segunda opción, la que él mismo prefiere:
- El botón "Publicar evento" deja de llevar el `<small>` con "falta el nombre" / "falta dónde".
- Cada campo que falta muestra su propia ayuda debajo, en el renglón: "Falta el nombre" bajo el campo del nombre si está vacío, "Falta ubicación" bajo el renglón Dónde si no se confirmó.
- Mismo cambio en el botón "Listo" de la hoja "Es en otro sitio" (`HojaDondeEs.tsx`): la ayuda baja al renglón que falta, no al botón.
- **Alcance:** solo el alta de evento (`FormularioEvento.tsx`, `HojaDondeEs.tsx`), que es lo asignado en esta pieza. `FormularioLugar.tsx`, `FormularioArtista.tsx` y `FormularioPerfil.tsx` siguen con el patrón de hoy hasta que el founder pida extenderlo — se anota como pendiente, no se toca aquí.

## Qué cánones se tocan

| Canon | Cambio |
| --- | --- |
| Formularios (canon del alta) | Decisión 3 ("el botón dice qué falta") se acota: en el alta de evento, la ayuda va debajo del campo que falta, no dentro del botón. Las demás altas no cambian todavía. |
| DEFINICION — ubicación con botón | Sin cambio de regla; se pregunta si se reutiliza la posición ya cacheada de otra pantalla (punto 4) — no es una llamada nueva al navegador ni un permiso nuevo. |
| Maquetación plana, filtrar no es navegar, memoria de pantalla | No cambian. |

## Los cinco estados del prototipo

1. **Recién abierto:** hoy (con `autoFocus`, teclado tapando la tarjeta) contra la propuesta (sin autofocus, tarjeta y campo visibles).
2. **Tras leer el cartel, lugar encontrado en el directorio:** Dónde resuelto con el nombre del lugar.
3. **Dirección leída, sin punto confirmado:** valor con el texto leído, letrero "Confirmar" y la ayuda *"Confirma la ubicación en el mapa"* debajo del renglón — no "Falta".
4. **Sugerencias con contexto y cercanía:** la hoja "Dónde es" con resultados que dicen su municipio/colonia.
5. **Intento de publicar sin ubicación:** el botón "Publicar evento" sin texto pequeño adentro; debajo del renglón Dónde, "Falta ubicación".

## Pregunta para el founder

1. ¿Confirmas que el `autoFocus` es la causa de L2 y que quitarlo resuelve lo que viste en Android?
2. ¿"Confirmar" en vez de "Falta" cuando ya hay nombre o dirección leídos, tal como se ve en el estado 3?
3. Cercanía de las sugerencias (punto 4): ¿A (reutilizar la posición ya cacheada, sin pedir permiso) o B (solo el centro de la ciudad, como hoy, salvo que toques "Estoy aquí")?
4. ¿Firmas que la ayuda baje del botón al campo, solo en esta pantalla (alta de evento), dejando las otras altas para una pieza aparte si la quieres extender?

## Cuándo empieza el código

Esta pieza comparte `FormularioEvento.tsx` con A6 (OL-099, precio numérico). El código de A7 espera a que A6 esté en `main` (lo confirma el gestor) y a la firma del founder sobre este documento y el prototipo.
