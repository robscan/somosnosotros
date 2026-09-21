# 135 · Lugar y dirección en el alta de evento

**Fecha:** 2026-09-21 · **Rama:** `alta-evento-lugar` · **OL:** OL-100 · **PR:** pendiente (espera firma)

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

Documento completo con los cinco puntos y las cuatro preguntas para el founder: [`docs/rediseno/26-alta-evento-lugar.md`](../../../rediseno/26-alta-evento-lugar.md).

1. Quitar el `autoFocus` del nombre.
2. "Confirmar" en vez de "Falta" cuando ya hay nombre o dirección leídos, con la ayuda ("Confirma la ubicación en el mapa") bajo el renglón.
3. Contexto (colonia/municipio) en cada sugerencia, con lo que ya trae Mapbox.
4. Pregunta abierta: ¿reutilizar la posición ya cacheada del teléfono (`ubicacionCercanaFresca()`, sin pedir permiso de nuevo) para ordenar las sugerencias de esta pantalla, o seguir solo con el centro de la ciudad salvo "Estoy aquí"?
5. La ayuda baja del botón al campo — cambia la decisión 3 del canon de formularios, solo en esta pantalla (alta de evento); las otras altas quedan para una pieza aparte si el founder lo pide.

## Prototipo

[`docs/rediseno/prototipos/alta-evento-lugar.html`](../../../rediseno/prototipos/alta-evento-lugar.html), cinco estados a 390×844 con los tokens del canon: recién abierto (hoy con autofocus contra la propuesta sin él), lugar encontrado en el directorio, dirección leída sin punto confirmado ("Confirmar"), sugerencias con contexto y cercanía, y el aviso "Falta ubicación." bajo el renglón al intentar publicar sin resolver Dónde. Verificado con el navegador de la sesión antes de mostrarlo (disciplina front-visual). Publicado como Artifact privado para que el founder lo vea en su teléfono: https://claude.ai/artifact/XwFiwzkiZvgrmLZwvfgGWk

## Estado

Sin código. Espera la firma del founder sobre el documento y el prototipo, y que A6 (OL-099, precio numérico) esté en `main` — comparten `FormularioEvento.tsx`, lo confirma el gestor.

## Pasos

- [x] Aviso de arranque al gestor y su visto bueno.
- [x] Rama `alta-evento-lugar` desde `origin/main`.
- [x] Medir el estado actual leyendo el código, sin tocar nada.
- [x] Documento de propuesta y prototipo de cinco estados.
- [x] Prototipo publicado como Artifact y entregado en este chat para firma.
- [x] Commit local de los documentos.
- [ ] Firma del founder (documento + prototipo).
- [ ] Confirmación del gestor: A6 (OL-099) en `main`.
- [ ] Código, pruebas focalizadas, build y capturas 390×844.
- [ ] Entrega consolidada al gestor.
