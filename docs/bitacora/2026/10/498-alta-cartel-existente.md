# 498 · Tu cartel a un evento que ya está (prototipo)

**Pieza:** OL-466. **Rama:** `alta-cartel-existente`, base `origin/main` (`58034ad7`). **Fecha:** 2026-10-28. **Operador:** Claude (agente del Gestor de cambios VII).
**Manda:** el founder (2026-10-28): «cuando se sube un cartel de un evento, y después de analizarlo con IA, notamos que ya está registrado, pero el registro no tiene cartel, esta va a ser una situación bastante común. Entonces, al decirle al usuario que el evento tal vez ya existe, también hay que presentar la opción de mantener el evento original, pero usar el nuevo [cartel]». Aprobó la propuesta del gestor: «vamos por prototipo».
**Estado:** prototipo listo, **espera firma**. Sin código de la app, sin migración. El código va tras la firma.

## Dónde verlo

- Prototipo: `docs/rediseno/prototipos/alta-cartel-existente.html` (se abre con doble clic; la letra la trae Google Fonts como en los demás prototipos). Tres pantallas en los chips de arriba (1 · Al leer el cartel, 2 · Revisa al publicar, 3 · Al terminar), sus estados debajo (★ = recomendada, «Hoy» = la app como está), los anchos 320 · 390 · 430 · 1280, el medidor bajo el teléfono y las notas a la derecha (se pliegan). Dentro del teléfono se puede tocar: las respuestas de «¿Es este?», el renglón, «Ver el evento» y Atrás.
- Hecho sobre la pantalla real (regla de OL-409): `maqueta-pantalla.mjs` compila la app contra el respaldo local con la lectura del cartel simulada y guarda la espera, «Revisa» con «¿Es este?» (un parecido sin cartel y otro con cartel), «Publicado» tras «No, es otro» y las fichas reales antes y después. `prototipo/alta-cartel-existente.mjs` arma el archivo con el CSS servido y el cuerpo de cada pantalla tal cual; la propuesta solo mueve y cambia de texto piezas que ya existen (falla si una clase no está en el CSS servido).

## El caso

Ana sube el cartel «Noche de Danzón» (vie 9 de oct, 8 pm, Teatro de la Paz). La IA lo lee. Ya hay «Noche de danzón con la Orquesta Típica» ese día y en ese sitio, de Marcos, **sin cartel**, sin precio y sin descripción (lo cargó una agenda). Hoy: Ana revisa todo, toca «Publicar» y solo entonces el servidor pregunta «¿Es este?»; sus salidas son «No, es otro: publicar de todos modos» (un duplicado) o tocar el renglón, que abre la ficha y pierde lo capturado. No hay forma de decir «sí, es este, ponle mi cartel».

## Los estados y qué se reutiliza

| Estado | Qué se ve | Pieza que se reutiliza | Nuevo |
| --- | --- | --- | --- |
| **C2 · Preguntar al leer** (recomendado) | En la misma espera: el cartel de Ana se queda grande (ya sin latir), «Leyendo el cartel…» se vuelve la caja «¿Es este?» con el renglón del que ya está, y el pie dice «Sí, es este: ponerle mi cartel». En la caja, «No, es otro: seguir». | `PasoEspera` (el `img` de `.leyendo`), `ui/Parecidos` + `RenglonParecido` tal cual, `ui/Boton` primario en el pie de `PorPasos`, secundario en la caja. | Los textos. Un paso en el alta (el de la espera) que puede pintar la caja. |
| C1 · Como primer paso | Lo mismo, con la cabeza de «Revisa» (miniatura, «Leído del cartel», título) en vez del cartel grande. | `CabezaCartel`. | — |
| **A1 · Revisa, sin cartel** (recomendado) | La pregunta final se queda (por si se cambió el día o el sitio). Mientras pregunta, el pie dice «Sí, es este: ponerle mi cartel»; en la caja, «No, es otro: publicar de todos modos», como hoy. El renglón sigue abriendo la ficha. | `ui/Parecidos`, `RenglonParecido`, el pie de `PorPasos`. | Los textos; la caja se desplaza a la vista al llegar. |
| A2 · Los dos en la caja | Lo literal del encargo: primario y secundario dentro de la caja; el pie sigue en «Publicar». | Lo mismo. | — |
| **B · Ya tiene cartel** | El pie: «Sí, es este: ir al evento» (lo que hoy hace tocar el renglón, dicho). En la caja, en segundo plano: «Sí, es este: cambiar su cartel por el mío» y «No, es otro…». A quien no lo publicó, el mismo botón apagado y debajo «Solo quien lo publicó puede cambiarlo.». | `ui/Boton` (apagado con `aria-disabled`, como el «Publicar» cuando falta algo) y la nota bajo un botón del canon (`FormularioCanon/notaBoton`). | Los textos. |
| Tras «No, es otro» en 1 | «Revisa» ya no vuelve a preguntar si no cambió el nombre, el día ni el sitio. | La firma de hoy (`firmaParecidos`). | — |
| **Al terminar** | «Publicado» con otra frase: sello verde, «Listo: tu cartel ya está en el evento», «Le pusimos tu cartel y completamos su precio, su descripción y quién se presenta. Así lo ve la gente:», la tarjeta del evento **que ya estaba** con el cartel de Ana, «Ver el evento», «Compartir», «Descargar el cartel». En B: «Listo: cambiamos su cartel por el tuyo» y «Todo lo demás sigue igual». | `Publicado.tsx` entero (OL-304), `RenglonEvento`. | La frase, armada con lo que de verdad se completó. |
| La ficha, después | La ficha real del evento de Marcos con el cartel de Ana arriba, «$150», «Cartel» para descargar, «Artistas: Orquesta Típica de San Luis», «Sobre el evento» y «Publicado por Marcos Ledesma». | La ficha de siempre. | — |

Los dos carteles lado a lado (estado B) pedirían una pieza nueva: no se dibujaron. En C2 se ven juntos sin piezas nuevas (el de la persona grande, el que ya está en la miniatura del renglón); en «Revisa», el de la persona está en la cabeza y el otro en el renglón.

## La recomendación

1. **Preguntar en cuanto se lee el cartel (C2)**, en la misma espera. La pregunta llega donde la persona está mirando, su cartel grande y el renglón del que ya está se ven juntos sin desplazar (comprobado a 390), no hay pantalla nueva y nadie revisa los datos de un evento que ya existe. Solo sale si el cartel trae nombre, día y sitio. C1 funciona igual pero cambia la pantalla de golpe y el cartel se ve chico.
2. **La respuesta principal va en el pie (A1)**, también en «Revisa»: un solo botón morado en pantalla (A2 tiene dos, y el «Publicar» del pie no sirve mientras se pregunta). Quien toca donde siempre no duplica el evento.
3. **Si ya tiene cartel (B)**, lo probable es que no haya nada que hacer: el pie lleva a la ficha; cambiar el cartel va en segundo plano y solo para quien lo publicó o la administración.
4. **Al terminar**, «Publicado» de siempre con «Listo: tu cartel ya está en el evento» y la tarjeta del evento original.

## Permisos y aviso (decididos con el founder; recomendación del gestor aprobada en bloque)

- **Poner cartel a un evento ajeno sin cartel:** cualquier persona con sesión. Se conserva el evento original: su ficha y su enlace, sus «Voy» y «Me interesa», sus enlaces y quien lo publicó.
- **Completar:** solo lo que al original le falta (descripción, precio, hora de fin, artistas); lo que ya tiene no se toca.
- **Cambiar un cartel que ya está:** solo quien lo publicó o la administración; a los demás, el botón apagado con su nota.
- **Aviso:** a quien lo publicó, al teléfono, con `avisarAlTelefono` de OL-465 (`src/lib/redes/herramientas.ts`, respeta `avisos_push`): «Ana le puso cartel a tu evento «…»». A la administración, un motivo nuevo `cartel_puesto` en sus avisos agrupados (`avisos_admin_encolar`, `MotivoAdmin` y `contenidoPushAdmin` en `src/lib/avisos.ts`). **No existe** un tipo de aviso «a quien publicó el evento» en `avisos_jobs` (sus tipos son `nuevo_evento`, `cambio` y `recordatorio`, para quien sigue o va): no se usa ni se dibuja nada nuevo para eso.

## Plan de código (tras la firma)

1. **Base, migración que solo añade:** `poner_cartel_a_evento(p_evento uuid, p_imagen text, p_colores jsonb, p_huella text, p_completar jsonb) returns jsonb`, `security definer`, `search_path = ''`, EXECUTE solo para `authenticated`. Pide sesión; el evento visible, sin borrador ni retiro, sin pasar. Sin cartel: cualquiera con sesión (`update … where imagen is null`, como `ponerCartel`, para que dos a la vez no se pisen). Con cartel: solo `creado_por = auth.uid()` o administración. Completa con `coalesce` solo lo vacío (descripción, precio, fin) y liga artistas con la misma regla de `p_quien` del alta, sin quitar ninguno. Llama a `avisos_admin_encolar('cartel_puesto', auth.uid())` y devuelve `{ id, slug, completado: [...], dueno }`. RLS de `eventos` sin tocar: la política «edita autor o admin» sigue igual; lo ajeno solo pasa por esta función. Banco PGlite y `test:db`: ajeno sin cartel sí, ajeno con cartel no, dueño con cartel sí, administración sí, lo que tiene no se pisa, carrera de dos, sin sesión no, pasado no.
2. **Acción del servidor** (`src/app/eventos/acciones.ts`): `ponerMiCartel(eventoId, datos del alta)`: valida la imagen con `imagenPermitida`, calcula colores y huella como `ponerCartel` (`coloresDeImagenEnMemoria`, `huellaDeCartel`), llama a la función y, si `dueno` no es quien llama, `avisarAlTelefono`. Devuelve lo completado para la frase del final. `eventos_parecidos` no cambia; para B la acción mira `creado_por` de los ids que devolvió (para apagar el botón) y la base vuelve a comprobarlo.
3. **Preguntar al leer (C2):** al terminar `useLeerCartel` con nombre, día y sitio resueltos, una acción de solo lectura llama a `eventos_parecidos`; con alguno, `AltaEvento` pinta la espera con la caja en vez de seguir. «No, es otro: seguir» guarda la firma como confirmada (la de hoy), así «Revisa» no vuelve a preguntar si nada cambió.
4. **«Revisa» (A1):** con parecidos, el pie dice la respuesta principal (`Revisa.tsx`), la caja se desplaza a la vista al llegar y `ui/Parecidos` acepta sus botones (hoy solo trae «No, es otro»). B: «ir al evento» con `replace`, como el renglón.
5. **Al terminar:** `Publicado` con `titulo` y `frase` opcionales; la tarjeta con el evento original y el cartel nuevo; la frase dice solo lo que se completó.
6. **Pruebas:** la acción (permisos, completar, aviso al dueño y no a uno mismo), componentes de `AltaEvento` (C2, A1, B apagado, firma), recorrido en Chrome a 390 con toques reales, captura móvil, y `medir`.

## Medición (`docs/rediseno/capturas-498/medidas.json`)

Dentro del marco, como `medir.js` (lo que se pinta; un svg cuenta uno). El bloque nuevo es lo marcado con `data-propuesta` (la caja, el pie y el final).

| Estado | Nodos | Prof. | Bloque (nodos / prof.) | Sin clase | Cortados | Desbordes | Toques < 44 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hoy · leyendo | 11 | 6 | – | – | 0 | 0 | 0 |
| C2 · sin cartel (320, 390, 430) | 28 | 10 | 18 / 7 | 0 | 0 | 0 | 0 |
| C2 · ya tiene cartel (320, 390) | 30 | 10 | 20 / 7 | 0 | 0 | 0 | 0 |
| C1 | 31 | 10 | 18 / 7 | 0 | 0 | 0 | 0 |
| Revisa · hoy | 64 | 10 | – | – | 0 | 0 | 0 |
| A1 (320, 390, 430, 1280) | 64 (98 a 1280) | 10 | 18 / 7 | 0 | 0 | 0 | 0 |
| A2 | 65 | 10 | 17 / 7 | 0 | 0 | 0 | 0 |
| B · quien lo publicó | 65 | 10 | 19 / 7 | 0 | 0 | 0 | 0 |
| B · otra persona (320, 390, 430) | 66 | 10 | 20 / 7 | 0 | 0 | 0 | 0 |
| Al terminar · tu cartel (320, 390, 430) | 31 | 9 | 5 / 3 | 0 | 0 | 0 | 0 |
| Al terminar · cambiamos su cartel | 31 | 9 | 5 / 3 | 0 | 0 | 0 | 0 |
| Ficha después / antes | 68 / 62 | 8 | – | – | 0 | 0 | 0 |

- Profundidad de la pantalla igual que hoy (10 en «Revisa»): lo nuevo no anida nada. En A1 el bloque (18) es la caja de hoy (16 nodos) y el pie que ya existía (2), con otro texto; A2 suma un botón a la caja (17); B, uno más y en B ajeno la nota (20 con el pie).
- «Sin clase» cuenta lo nuevo: los tres `span` de la meta del renglón son de `RenglonParecido` tal cual (`ui/Renglon` los maqueta con `.frente > small > span`).
- Fuera de la cuenta de cortados, lo que se corta a propósito: las claves que solo oye el lector (`sinClave`, 1 px); el precio de la tarjeta, que cede con puntos suspensivos (regla H-17 de `ui/Renglon`: a 320 «· $150» no cabe, y «· $120 a $250» a 390); y el título corto de la barra de la ficha (`tituloBarra`, `aria-hidden`).
- Toques < 44: ninguno en el bloque nuevo ni en la pantalla (medir.js por `elementFromPoint`).

## Recorrido con toques reales (`scripts/ops/auditoria-ui/capturar-alta-cartel-existente.mjs`)

Chrome de la Mac, clics de ratón por coordenadas (nunca `element.click()`) en los chips y dentro del teléfono; antes de cada toque dentro, `elementFromPoint` en el centro del botón comprueba que nada lo tapa. **42 comprobaciones, todas pasan; cero errores en consola.** Entre ellas: C2 cabe entero a 390; «Sí, es este: ponerle mi cartel» → «Listo: tu cartel ya está en el evento» → «Ver el evento» → la ficha con el cartel → Atrás vuelve; «No, es otro: seguir» → «Revisa» sin volver a preguntar; el renglón abre la ficha (no se quita lo que existe); «No, es otro: publicar de todos modos» publica como hoy; el botón apagado no hace nada; «ir al evento» abre su ficha; A1 tiene un solo botón principal y A2 dos; foco visible con Tab en el pie (2 px); contraste AA del texto de la caja (15,8) y de la nota (6,07); el apagado se anuncia con `aria-disabled` y el orden de lectura es «¿Es este?» → renglón → botones.

## Capturas (`docs/rediseno/capturas-498/`), abiertas y descritas

Del prototipo en Chrome, 2×, comprimidas con `comprimir.mjs` (miré la comprimida del final contra la original: sin franjas).

- `01-hoy-leyendo.png`: la espera de hoy: barra «Publicar» con ✕, el cartel «Noche de DANZÓN» atenuado y «Leyendo el cartel…».
- `02-c2-sin-cartel.png` (y `-320`, `-430`): el cartel ya nítido; debajo la caja gris «**¿Es este?** Ya hay uno parecido ese día en el mismo sitio:», el renglón con el símbolo SN, «Noche de danzón con la Orquesta Típica», «vie 9 de oct · 8:00 pm» y «Teatro de la Paz», y «No, es otro: seguir»; el pie morado «Sí, es este: ponerle mi cartel». A 320 el texto de la caja va en dos líneas y todo cabe; a 430 el título del renglón en una.
- `03-c2-ya-tiene-cartel-otra-persona.png` (y `-320`): el cartel de Ana «FELEAL» grande; en el renglón el cartel que ya tiene Feleal; «Sí, es este: cambiar su cartel por el mío» apagado (gris), «Solo quien lo publicó puede cambiarlo.», «No, es otro: seguir»; pie «Sí, es este: ir al evento». A 320 el botón apagado parte en dos líneas sin cortarse.
- `04-c1-primer-paso.png`: la cabeza de «Revisa» (miniatura, «✓ Leído del cartel», «Noche de Danzón»), la caja con «No, es otro: seguir» y el pie «Sí, es este: ponerle mi cartel».
- `05-revisa-hoy.png`: «Revisa» real con los seis renglones y la caja de hoy («No, es otro: publicar de todos modos»); el pie dice «Publicar».
- `06-revisa-a1-sin-cartel.png` (y `-320`, `-430`): igual, con el pie «Sí, es este: ponerle mi cartel». A 320 «vie 9 de oct · 8:00–11:00 pm» y «Orquesta Típica de San Luis» parten en dos líneas y «No, es otro: publicar de todos modos» en dos; nada cortado.
- `07-revisa-a2-los-dos-en-la-caja.png`: en la caja, «Sí, es este: ponerle mi cartel» morado y «No, es otro…» blanco; el pie sigue «Publicar»: dos morados a la vez.
- `08-revisa-b-quien-lo-publico.png`: «Revisa» de Feleal; la caja con su cartel en el renglón, «Sí, es este: cambiar su cartel por el mío» y «No, es otro…» blancos; pie «Sí, es este: ir al evento».
- `09-revisa-b-otra-persona.png` (y `-320`, `-430`): el de cambiar, gris y apagado, con «Solo quien lo publicó puede cambiarlo.» debajo.
- `10-revisa-tras-no-es-otro.png`: «Revisa» sin caja y con «Publicar».
- `11-final-tu-cartel.png` (y `-320`, `-430`): el sello verde, «Listo: tu cartel ya está en el evento» (dos líneas a 390, una a 430), la frase de lo que se completó, la tarjeta «Noche de danzón con la Orquesta Típica · vie 9 de oct · 8:00–11:00 pm · $150 · Teatro de la Paz» con el cartel de Ana, «Ver el evento», «Compartir», «Descargar el cartel». A 320 el precio cede (H-17).
- `12-final-cambiamos-su-cartel.png`: «Listo: cambiamos su cartel por el tuyo», «Todo lo demás sigue igual», la tarjeta de Feleal con el cartel de Ana («· $120 a $…» cede).
- `13-ficha-despues.png` y `13b-ficha-despues-artistas.png`: la ficha real con el cartel de Ana de portada, «8:00 pm vie 9 oct», «Costo $150», «Van 0», «Compartir · A mi calendario · Cómo llegar · Cartel»; abajo «Artistas: Orquesta Típica de San Luis · Orquesta · Grupo», «Sobre el evento» con la descripción leída y «Publicado por Marcos Ledesma» (el original no cambia de autor).
- `14-ficha-antes-hoy.png`: la misma ficha hoy: la foto del Teatro de la Paz, «Costo Gratis», sin «Cartel».
- `15-hoy-no-es-otro-publicado.png`: «Evento publicado» de hoy tras «No, es otro»: el segundo evento «Noche de Danzón».
- `16-revisa-a1-foco.png`: el foco de Tab (anillo morado de 2 px) en «Sí, es este: ponerle mi cartel».
- `17-recorrido-ficha-despues.png`: a donde llegó el recorrido tras «Ver el evento»: la ficha con el cartel.
- `18-revisa-a1-1280.png`: A1 en escritorio: la columna del alta al centro con la barra lateral; la caja y el pie del ancho de la columna.
- `19-prototipo-1280.png`: el armazón entero: chips, anchos, el teléfono en C2, el medidor (28 nodos, 10, 18, 7, 0, 0, 0, 0, 0) y las notas.

## Lo que cambió en las herramientas (no es código de la app)

- `respaldo-local/fixture.mjs`: con `RESPALDO_CARTEL_EXISTENTE=1`, la Noche de danzón sin cartel y `eventos_parecidos` en corto (el mismo día local, el mismo sitio, el mismo título o dos palabras con contenido en común); con `=despues`, la misma ficha con el cartel, el precio, la descripción y la Orquesta Típica. Sin la marca, `eventos_parecidos` sigue contestando nada: `npm run medir` y las demás capturas no cambian.
- `maqueta-pantalla.mjs`: `MAQUETA_LECTURA=1` arranca la app con la lectura simulada; `reloj: true` fija el reloj del navegador; cada paso recibe la dirección del respaldo; un paso que no llega deja `<id>-fallo.png`. El respaldo es http y `imagenPermitida` pide https: al publicar, el evento `formdata` vacía el campo `imagen` de lo que se manda (en pantalla no cambia nada).
- Nuevos: `prototipo/alta-cartel-existente.mjs` y su plantilla, `capturar-alta-cartel-existente.mjs`.

## Preguntas para el founder

1. ¿Preguntamos en cuanto se lee el cartel (C2, recomendado) o solo al final, en «Revisa», como hoy?
2. Si el evento dice «Gratis» porque nadie puso precio y el cartel dice $150, ¿lo cambiamos? Hoy la app guarda «sin precio» y lo enseña como «Gratis», así que no se distingue de un evento gratis de verdad. Recomiendo que sí, y que la frase del final lo diga.
3. A quien no publicó un evento que ya tiene cartel, ¿el botón apagado con «Solo quien lo publicó puede cambiarlo» o mejor «Ofrecer mi cartel», que le llega a quien lo publicó para que decida?
4. Si hay dos o más parecidos (raro: el mismo día, el mismo sitio y nombre parecido), ¿basta con que cada renglón abra su ficha, o quieres elegir aquí mismo cuál es?

¿Cuál variante firmas, con qué cambios?
