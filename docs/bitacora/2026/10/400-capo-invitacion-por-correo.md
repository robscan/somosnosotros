# 400 · Una invitación del CAPO por dirección de correo (OL-369)

**Fecha:** 2026-10-10. **Rama:** `capo-invitacion-por-correo`, base `origin/main` (`c121be99`). **Hecho por:** el gestor V. Sin migración.

## De dónde sale

El 2026-09-28 una misma dirección recibió 13 invitaciones del CAPO: varios artistas del catálogo comparten la cuenta de una agencia y el script escribía una vez por artista. El arreglo se hizo ese día en la rama `capo-un-correo-por-direccion` y **nunca se unió**. Apareció al revisar las ramas viejas con el founder («resuelve ramas viejas, ¿sirven?»). En producción, `invitaciones_enviadas` tiene 285 envíos a 266 direcciones distintas: 19 repetidos.

## Qué cambia en `scripts/capo/invitar.ts`

- **El arreglo de entonces, tal cual** (commit reaplicado sobre main sin conflictos): `elegirTanda` deja pasar un correo por artista **y uno por dirección**, sin distinguir mayúsculas ni espacios (`normalizarCorreo`), y salta las direcciones que ya recibieron invitación en tandas anteriores. `invitadosPrevios` devuelve los artistas y también las direcciones ya invitadas.
- **Un riesgo nuevo que se cierra:** si leer la tabla fallaba con cualquier mensaje que dijera «does not exist», el script trataba el error como «nadie ha sido invitado» y reenviaba a todo el catálogo. Eso incluía una columna que falta (código 42703), justo lo que pasaría si la consulta pide `correo` y la tabla no lo tuviera. Ahora solo «la tabla no existe» (42P01, PGRST205 o «relation … does not exist») vale como vacío; cualquier otro error corta el envío.

## Pruebas

`scripts/capo/invitar.test.ts`: 14 pruebas. Las del arreglo de entonces (una por dirección; salta las ya invitadas) y tres nuevas de `invitadosPrevios` (junta artistas y direcciones; tabla ausente = vacío; columna ausente = error). Control: con el filtro anterior la prueba de la columna ausente falla; con el arreglo, las 14 pasan.

## Lo que no cambia

No se envió ningún correo. La tabla `invitaciones_enviadas` ya tiene la columna `correo` en producción (comprobado). Las próximas tandas siguen con «un correo por buzón» (regla del founder del 2026-09-28).
