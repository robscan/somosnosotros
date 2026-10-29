# 510 · Avisos al teléfono: hora, forma y resumen diario (OL-478, prototipo)

**Fecha:** 2026-10-29. **Rama:** `avisos-hora-y-forma`, desde `origin/main` (`42319716`). **Gestor:** Gestor de cambios VII (operador: agente Claude, árbol aislado). **Sin código de la app ni migración.** Solo el prototipo, sus guiones y las capturas.
**Estado:** prototipo, espera firma. El código va después de la firma.

Términos (una línea cada uno):
- **Resumen diario:** un solo aviso al día con lo nuevo de lo que sigues, en vez de un aviso por evento.
- **Silencio:** las horas en que no sale ningún aviso (9 pm a 9 am); lo que llega se guarda.
- **Subtítulo:** la segunda línea en negritas de un aviso de la app del iPhone (APNs lo admite; la web no).
- **Hilo (`thread-id`):** la marca con la que iOS junta en una pila los avisos de una misma cosa.
- **Pantalla real:** la app compilada contra el respaldo local y guardada con `maqueta-pantalla.mjs` (regla de OL-409).

## El encargo

El founder, el 29 de octubre: «Quiero que las notificaciones funcionen muy bien. Ese es nuestro gancho para mantener fresca la información y el interés de los usuarios». Aceptó las recomendaciones de `docs/investigaciones/avisos-con-la-app-nativa.md`: un resumen diario de lo nuevo de lo que sigues (a las 9 am, o al publicar si es de día), también lo que cargan las rutinas, «Me interesa» solo con cambios y cancelación, «Esta semana en {ciudad}» los jueves a las 7 pm con 3 destacados y permiso propio (no se manda si no hay 3), guardar la ciudad de quien lo pide, título = nombre del evento con la razón debajo, y no duplicar en el iPhone que tiene web y app. La fase 1 (fiabilidad, OL-476, bitácora 508) está en su rama; esta pieza es la fase 2 (hora y forma) y la 5 («Esta semana») del plan del documento, en prototipo.

## El prototipo

`docs/rediseno/prototipos/avisos-hora-y-forma.html` (armazón de propuestas: pantalla, estado con su variante Hoy · A · B, tamaños 320 · 390 · 430, notas con los textos de cada aviso y medidor). Lo arma `scripts/ops/auditoria-ui/prototipo/avisos-hora-y-forma.mjs` con la plantilla de al lado; las maquetas salen de `maqueta-pantalla.mjs --solo=av-` (seis pantallas nuevas en su lista: Inicio sin sesión y con la de Ana, Ajustes, Novedades, la portada de Administración y la hoja de ciudades).

Dos clases de pantalla:
- **Lo que vive en la app es la pantalla real.** Inicio, Ajustes, Novedades y Administración son el CSS servido y el cuerpo tal cual. La propuesta solo mueve o copia piezas que existen, con sus clases de producción (el generador falla si una clase no está): la tarjeta de `ActivarAvisos` (campana, frase, `ui/Boton` píldora «Activar» y la ✕ de «Ahora no»), los renglones `Renglon/ajuste` con `ui/Palanca`, el renglón de «Perfil» (valor y chevron), la nota de Ajustes, la hoja de ciudades de Artistas (`ui/Hoja` con los renglones de `Ciudad`) y el indicador de Administración con su desglose. Lo nuevo de CSS es mínimo (`av-`): la tarjeta como última del carril (variante A) y la ventana del permiso de iOS.
- **Lo del sistema se dibuja.** La pantalla de bloqueo, el centro de avisos, el permiso de iOS, el cajón de Android y el aviso de la Mac no son de la app: no hay maqueta real que copiar. Van dibujados (`ab-`) con la letra del sistema de la Mac (SF Pro) y medidas aproximadas de iOS 26 a 390 pt (aviso de 370 de ancho, icono de 38, título y cuerpo de 15/20). El icono es `public/icono-192.png` (el mismo SN negro sobre crema del `.icon` de la app). **Hay que confirmarlas** con una captura del iPhone del founder cuando OL-476 deje llegar el primer aviso a la app.

Los textos de «Hoy» no están escritos a mano: salen de `contenidoPush` (`src/lib/avisos.ts`) compilado en el generador, con las fechas del prototipo (jueves 8 de octubre de 2026, San Luis Potosí).

## Decisiones que propongo (lo recomendado, marcado en el prototipo)

1. **Resumen diario, variante A**: el título cuenta («3 nuevos de lo que sigues») y el cuerpo nombra el primero. Al tocar abre Novedades, que ya pinta cada evento con su razón encima del nombre. B (el primer evento de título y «Y 2 más de lo que sigues» de subtítulo) sigue a la letra «título = evento», pero promete un evento y abre una lista, y en la web «y 2 más» queda a media frase.
2. **«3 nuevos de lo que sigues», no «3 eventos nuevos de lo que sigues».** El del encargo tiene 33 caracteres; medido en el dibujo, con «ahora» en la misma línea caben unos 30 a 390 y 28 a 375 (el iPhone más angosto con iOS 26), y el sistema lo corta en «sigu…». El de 25 cabe.
3. **Título = el evento** en todos los demás; la razón en el subtítulo (app) o al principio del cuerpo (web y Android); en el cuerpo, **la fecha primero** (nunca se corta).
4. **Fecha corta en los avisos**: «vie 9 · 8 pm» (sin «Mañana» ni «Hoy», salvo el recordatorio y lo de última hora). Ahorra unos 8 caracteres y evita el «Ahora es Mañana» de hoy (la M mayúscula a media frase sale de `formatearCuando`).
5. **Recortes del servidor**: el título no se recorta (cada teléfono corta a su ancho); en el resumen se recorta el nombre del primer evento a 34 caracteres con «…» para que la fecha y «y N más» no se pierdan (recortar todo el cuerpo a 80 no bastó: el sistema parte por palabras y se perdía «y 3 más»); la descripción de un evento suelto se recorta para que el cuerpo quepa en 72 caracteres (dos líneas a 375).
6. **Hilos**: `lo-nuevo` (resumen y evento suelto), `evento-{id}` (recordatorio, cambio y cancelación del mismo evento juntos), `destacados-{ciudad}`. Hoy, sin hilo, iOS junta todo en una pila y el recordatorio tapa lo demás.
7. **La tarjeta de «Esta semana», variante B**: la de `ActivarAvisos` en el sitio del banner de compartir, en la segunda visita (otro día) o tras abrir 2 destacados, nunca la primera vez; esa visita no sale el banner (una cosa a la vez). Se ve sin deslizar y no suma nada a la pantalla. A (última tarjeta del carril) solo la vería quien recorre los 12 destacados.
8. **Ajustes › Avisos**: dos renglones nuevos con piezas que ya existen, «Lo destacado de la semana» (palanca, «Los jueves a las 7 pm, 3 planes») y «Ciudad» (solo encendido, abre la hoja de ciudades), y una línea «Te llegan en: iPhone (app) · Mac (Safari)». «Por correo» y «En el teléfono» no cambian.
9. **Sin duplicados**: si la persona tiene la app en su iPhone, el aviso va solo a la app; la web de ese iPhone lo dice («En este iPhone te llegan por la app»); Safari de la Mac sigue recibiendo.
10. **Medición sin nombres**: un indicador más en «Últimos 7 días» de Administración, «Avisos abiertos · 11 · de 48 que salieron, sin saber quién», con su desglose por tipo.

## Los textos de cada aviso (propuesta)

| Aviso | Cuándo | Título | Subtítulo (app) | Cuerpo (app) | Web y Android: cuerpo | Abre |
|---|---|---|---|---|---|---|
| Resumen (A) | 9 am con lo de la noche; de día al publicarse (se junta 15 min) | 3 nuevos de lo que sigues | — | Noche de danzón · Teatro de la Paz · vie 9 · 8 pm, y 2 más | igual | `/novedades?desde=aviso&tipo=resumen` |
| Un evento, por el lugar | igual, si en el día solo hay uno | Noche de danzón | Nuevo en Teatro de la Paz | vie 9 · 8 pm · Baile de salón con orquesta en vivo: danzón, mambo y… | Nuevo en Teatro de la Paz · vie 9 · 8 pm · Baile de salón con orquesta… | `/eventos/{slug}?desde=aviso&tipo=nuevo` |
| Un evento, por el artista | igual | Noche de danzón | De Luna Hermoso, a quien sigues | vie 9 · 8 pm · Teatro de la Paz | De Luna Hermoso, a quien sigues · vie 9 · 8 pm · Teatro de la Paz | igual |
| Recordatorio («Voy») | 9:00 del día; víspera 7 pm si empieza antes de las 11 am | Noche de danzón | Hoy a las 8 pm | Teatro de la Paz · Villerías 2, Centro | Hoy a las 8 pm · Teatro de la Paz · Villerías 2, Centro | `…&tipo=recordatorio` |
| Cambio («Voy» y «Me interesa») | al momento de día | Noche de danzón | Cambió la fecha · Cambió el lugar · Cambió la fecha y el lugar | Ahora es el sáb 10 · 8 pm · Teatro de la Paz | Cambió la fecha · Ahora es el sáb 10 · 8 pm · Teatro de la Paz | `…&tipo=cambio` |
| Cancelación («Voy» y «Me interesa») | igual | Noche de danzón | Se canceló | Era el vie 9 · 8 pm en Teatro de la Paz. | Se canceló · Era el vie 9 · 8 pm en Teatro de la Paz. | `…&tipo=cancelado` |
| Esta semana | jueves 7 pm, solo con permiso y solo si hay 3 | Esta semana en San Luis Potosí | Noche de danzón · vie 9 · 8 pm | Feleal: un viaje en acordeón · mié 14 ⏎ Ecos de papel · hasta el dom 18 | los tres, uno por renglón | `/?desde=aviso&tipo=destacados#destacados` |
| Última hora | al momento (de día) si empieza en menos de 24 h | Jam de jazz abierta | Nuevo en Foro Lunaria, para hoy | Hoy · 10 pm · Entrada libre, trae tu instrumento | Nuevo en Foro Lunaria, para hoy · Hoy · 10 pm · … | `…&tipo=nuevo` |

La cancelación queda lista para la fase 4 del plan (cancelar antes de que pase), que no existe todavía. «Me interesa» no recibe recordatorio. Con dirección reservada, el recordatorio solo dice el lugar. Nada dice quién publicó.

## Reglas de hora

1. **Silencio de 9 pm a 9 am**, en la hora de la ciudad del evento. Para el resumen, la de la ciudad de la persona (la de lo destacado, si la eligió) o la del primer evento. Hoy todas las ciudades del catálogo están en la hora del centro; un evento en Cancún saldría a las 9 de Cancún.
2. **Lo nuevo, una vez al día**: a las 9 am con lo que llegó de noche; de día, al publicarse, juntando 15 minutos (una agenda de 40 eventos es un aviso). Lo que llega después del aviso del día va al de mañana.
3. **Última hora** (lo propuesto por el gestor): si el evento empieza en menos de 24 horas, no espera al resumen y sale como aviso propio, aunque ya haya salido el del día. Si se publica en silencio y empieza antes de las 9 am, no se manda: queda en Novedades. El caso del encargo: publicado a las 8:30 pm para esa noche sale a las 8:45.
4. **Cambio y cancelación**: al momento de día; en silencio esperan a las 9, salvo que el evento empiece antes de esa hora (entonces salen al momento).
5. **Recordatorio**: 9:00 del día; la víspera a las 7 pm si empieza antes de las 11 am (ya aprobado en el plan VII, bitácora 449).
6. **Esta semana**: jueves 7 pm, uno por semana.
7. **Vida del aviso**: hasta que deja de servir (el inicio del evento o el final del día), no 1 hora como hoy (`TTL ≤ 3600`): un teléfono apagado de noche lo recibe al prenderlo.

El peor caso es a las 9:00: recordatorio, el cambio de anoche y el resumen juntos (estado «9:00 am, lo que esperó»). Con los hilos, el recordatorio y el cambio quedan en una pila.

## Reglas de duplicados

- Al dar de alta una suscripción web se guarda qué aparato es (iPhone, iPad, Mac, Android, computadora), con lo que ya sabe `plataformaActual()`. Las de antes no lo tienen: se completan la próxima vez que se abre esa web y, mientras, se siguen mandando.
- Si la persona tiene un token vivo de la app (`dispositivos_apns` sin `muerta_en`, OL-476), las suscripciones web de iPhone e iPad no reciben; las de Mac, Android y computadora sí.
- Si borra la app, Apple dice que el token murió (OL-476 lo marca) y la web vuelve a recibir sola.
- En Ajustes se dice dónde llegan, sin direcciones ni aparatos repetidos.

## Qué se reutiliza

`ActivarAvisos` (la tarjeta y su «Listo»), `ui/Boton`, `ui/Palanca`, `Renglon/ajuste`, la nota de Ajustes, la hoja de ciudades de Artistas, el indicador y el desglose de Administración, Novedades tal cual (ya pone la razón encima del nombre), `lib/visitasInicio` para contar la segunda visita, `medirCliente` con su lista cerrada, la cola de avisos (`avisos_jobs` / `avisos_entregas` / latido de 5 min), `tira_destacados` con una regla más alta, `muerta_en` de OL-476.

## Plan de código por piezas (después de la firma; migraciones que solo añaden; nombres los reserva el gestor)

Antes: OL-476 unida y la prueba de humo con el iPhone del founder (sin ella, ningún aviso llega a la app y nada de esto se puede ver).

1. **Forma y medición.** `contenidoPush` devuelve título, subtítulo, cuerpo, URL e hilo; `cuandoCorto` («vie 9 · 8 pm»); la razón por persona (artista antes que lugar), guardada al expandir en una columna nueva y nula `avisos_entregas.motivo`; `payloadApns` con `subtitle` y `thread-id`; en la web la razón al principio del cuerpo (el cuerpo ya se prepara por entrega, y la entrega sabe si es `apns:` o web); URL con `?desde=aviso&tipo=`; vida del aviso hasta su hora límite. Medición: `aviso_abierto` con `tipo` en la lista cerrada de `medir.ts`; un componente del layout que, al abrir con `desde=aviso`, lo mide, suma uno en una tabla nueva de conteos (`día`, `tipo`, `n`, sin cuenta ni teléfono, por una función con lista cerrada de tipos y solo del propio sitio) y quita los dos datos de la dirección (`replaceState`; no entran a la medición de páginas, que ya tiene lista blanca). El indicador «Avisos abiertos» suma las entregas enviadas de 7 días y esos conteos. Pruebas: textos con nombres largos (los 34 y los 72), web y app, el componente con la dirección limpia.
2. **Hora.** Una función de la base «siguiente hora permitida» (zona, instante); las entregas nacen con `disponible` en esa hora; cambio y cancelación con su excepción; `avisos_recordatorios` crea el de las 9:00 del día (y el de la víspera a las 7 pm); la hora límite de lo nuevo ya no se corta a la medianoche (los textos ya no dicen «Hoy»). Banco de la base con relojes en silencio, en la frontera de las 9 y en otra zona.
3. **Resumen diario en la cola.** Avisos «por persona y día»: una tabla nueva (bandeja: persona, evento, motivo, cuándo entró, en qué aviso salió) que llena la expansión de un evento nuevo en lugar de crear entregas; `avisos_jobs` gana una columna nula de persona y el tipo `resumen`; una función del latido junta la bandeja de cada persona (15 minutos de día, a las 9 lo de la noche, una vez al día, última hora aparte) y crea un aviso con su contenido (los eventos siguen visibles y por venir al mandarse; si no queda ninguno, no sale). **Las rutinas entran aquí**: `rutinas/publicarEvento.ts` (y las cargas de agendas) dejan sus eventos en la bandeja de quien sigue el lugar o al artista; el tope de 3 por autor ya no hace falta para lo nuevo (la persona recibe uno al día), y `avisos_origen` se sigue llenando. Banco: 40 eventos de una agenda dan un aviso; el segundo del día espera; última hora sale.
4. **Sin duplicados.** Columna nula `suscripciones_push.aparato`; el teléfono la manda al dar de alta y al abrir; la expansión salta las de iPhone e iPad de quien tiene la app viva; una lectura `mis_aparatos_avisos` para la línea de Ajustes.
5. **Esta semana en {ciudad}.** Columnas nuevas en `perfiles`: el permiso (falso por omisión), desde cuándo y la ciudad (el slug); el tipo `destacados`; una función del latido que los jueves a las 7 pm de cada ciudad toma los 3 primeros destacados de 7 días con la regla de aviso (elegido por la administración o 2 señales o más), quita a cada persona los que ya le llegaron, completa con el 4.º, 5.º… y no manda nada si no llega a 3. La tarjeta en Inicio (en el sitio del banner, segunda visita, «Ahora no» 30 días en el teléfono), los renglones de Ajustes y la hoja de ciudades. **Aviso de privacidad** (propuesta para la firma del founder): «Si pides lo destacado de la semana, guardamos la ciudad que elegiste para mandártelo; la cambias o lo apagas en Ajustes.» y «Contamos cuántos avisos se abren, por tipo y por día, sin saber quién.» Apple pide permiso explícito y forma de apagarlo dentro de la app para avisos que parecen promoción (guía 4.5.4): la tarjeta y el renglón lo cumplen.

Orden: 1 → 2 → 3 → 4 → 5. La 1 se puede probar con el iPhone del founder en cuanto llegue el primer aviso; la 3 cambia la cola y va con la 2 ya probada.

## Medición

`scripts/ops/auditoria-ui/capturar-avisos-hora-y-forma.mjs` (Chrome real de la Mac, el prototipo desde el disco): cada estado a 390 y los de la propuesta también a 320 y 430, más una pasada solo de medida a 375. **167 comprobaciones, 0 fallas, 0 errores en la consola.** Las cifras de cada estado y tamaño, en `capturas-510/medidas.json`.

- **Pantalla real (lo nuevo, `data-propuesta`)**, a 320, 390 y 430: 0 textos cortados, 0 desbordes, 0 toques de menos de 44 px, 0 `div` o `span` sin clase (el `span` sin clase del renglón «Ciudad» es el mismo marcado de producción del renglón «Perfil» y no se cuenta). Nodos de lo nuevo: la tarjeta 7 («Listo» 3), Ajustes 12 en 3 renglones (apagado 6 en 2, bloqueado 5), el indicador 6 y con su desglose 13. Profundidad de toda la pantalla: Inicio 11, Ajustes 9, Administración 8, Novedades 8 (igual que hoy: lo nuevo no anida más).
- **Avisos dibujados**: caben unos 30 caracteres en el título y 84 en dos líneas de cuerpo a 390; 28 y 79 a 375; 36 y 95 a 430. Ningún texto de la propuesta se corta a 375, 390 ni 430 (salvo «Nombres largos», hecho para cortarse, y Android cerrado, que enseña una línea a propósito). A 320 se cortan títulos de 25 o más: no hay iPhone con iOS 26 de ese ancho.
- **Recorrido con toques reales** (ratón en el centro de cada cosa dentro del teléfono, comprobado antes con `elementFromPoint`; nunca `element.click()`): el resumen abre Novedades; «Esta semana» abre Inicio en Destacados; un evento dice que abre su ficha con `?desde=aviso&tipo=nuevo`; «Activar» → permiso del sistema → «Permitir» → «Listo: te avisamos los jueves»; la ✕ quita la tarjeta y vuelve el banner; en A la tarjeta es la última del carril y «Activar» también lleva al permiso; en Ajustes la palanca apaga (y quita «Ciudad») y enciende, «Ciudad» abre «Ciudad de lo destacado», Querétaro la cierra y queda escrito, la ✕ vuelve; el indicador abre y cierra su desglose; los chips del armazón y el de 320.

## Capturas (`docs/rediseno/capturas-510/`, todas abiertas)

Las de la app en PNG de paleta; las del sistema en color completo (la paleta pintaba manchas en el degradado del fondo: comparé la original y la comprimida de `b-largos.png` a tamaño completo, y en color completo pesan casi lo mismo).

Bloqueo (app del iPhone), 390 × 844:
- `b-hoy.png`: los tres avisos de hoy tal cual: «Nuevo en Teatro de la Paz» / «Noche de danzón · Mañana · 8:00 pm», «Cambió la fecha: Noche de danzón» / «Ahora es Mañana · 8:00 pm · Teatro de la Paz» (dos líneas), «Mañana: Noche de danzón» a las 8 pm de la víspera.
- `b-resumen.png`: «3 nuevos de lo que sigues» entero en una línea con «ahora»; el cuerpo en dos líneas. `b-resumen-320.png`: a 320 el título se corta en «sigue…». `b-resumen-430.png`: holgado.
- `b-resumen-b.png`: B, «Noche de danzón» / «Y 2 más de lo que sigues» / «Teatro de la Paz · vie 9 · 8 pm. También: Feleal y Ecos de papel», en dos líneas.
- `b-uno-lugar.png`: «Noche de danzón» / «Nuevo en Teatro de la Paz» / «vie 9 · 8 pm · Baile de salón con orquesta en vivo: danzón, mambo y…».
- `b-uno-artista.png`: «De Luna Hermoso, a quien sigues» de subtítulo; cuerpo de una línea.
- `b-recordatorio.png`: viernes 9 a las 9:00, «Hoy a las 8 pm» / «Teatro de la Paz · Villerías 2, Centro».
- `b-cambio.png`: a las 12:40, «Cambió la fecha» y, debajo (de ayer), «Cambió el lugar» / «Ahora es en Foro Lunaria · vie 9 · 8 pm».
- `b-cancelado.png`: «Se canceló» / «Era el vie 9 · 8 pm en Teatro de la Paz.».
- `b-semana.png`: jueves 7:00 pm, fondo de noche: «Esta semana en San Luis Potosí» / «Noche de danzón · vie 9 · 8 pm» / Feleal y Ecos de papel, cada uno en su línea, sin cortes. `b-semana-320.png`: a 320 se cortan el título («San L…») y la línea de Feleal.
- `b-largos-hoy.png`: hoy con nombres largos: el título «Nuevo en Centro de las Artes d…» y el nombre del festival en el cuerpo, cortado en «función de…» sin fecha.
- `b-largos.png`: la propuesta: el título corta el festival, el subtítulo corta el lugar, el cuerpo «sáb 10 · 7 pm · Centro de las Artes de San Luis Potosí Centenario» entero; el resumen «4 nuevos de lo que sigues» con «Festival Internacional de Danza Con… · sáb 10 · 7 pm, y 3 más» entero. `b-largos-320.png`: a 320 se cortan también los cuerpos.
- `b-centro-hoy.png`: el centro de avisos sin hilos: una sola pila de la app con el recordatorio de hoy encima.
- `b-centro.png`: con hilos: tres pilas (recordatorio con el cambio detrás, el resumen con el de ayer detrás, «Esta semana» sola). `b-centro-430.png`: lo mismo a 430.
- `b-novedades.png`: Novedades real, a donde abre el resumen: cada evento con «Nuevo en …» o «Nueva fecha de …» encima del nombre.

Web y Android:
- `o-web.png`: la web en el inicio del iPhone, sin subtítulo: «Noche de danzón» / «Nuevo en Teatro de la Paz · vie 9 · 8 pm · Baile de salón con orquesta en…» en dos líneas, y el resumen.
- `o-android.png`: el cajón de Android 15 (dibujo aproximado): cabecera «Somos Nosotrxs · 9:00», título y una línea de cuerpo, el SN grande a la derecha; el resumen pierde la fecha en el cerrado (se ve al abrirlo). `o-android-320.png`: a 320 se corta el título de «Esta semana».
- `o-mac.png`: el aviso de Safari en la Mac con «somosnosotros.org» bajo el título.

Horas:
- `h-dia.png`: el diagrama de un día de Ana (no es pantalla): silencio de 0 a 9 y de 21 a 24 en gris, la carga de la rutina de las 2:10 que espera, el resumen y el recordatorio de las 9, la fecha de Luna Hermoso de las 13:20 que va al resumen de mañana, la jam de las 20:30 que sale a las 20:45, el cambio de las 21:40 que espera y la cancelación de las 22:15 que sale. (La fila del jueves 19:00 queda abajo, fuera de la captura.)
- `h-830.png`: 8:45 pm: «Jam de jazz abierta» / «Nuevo en Foro Lunaria, para hoy» / «Hoy · 10 pm · Entrada libre, trae tu instrumento».
- `h-9am.png`: viernes 9:00: recordatorio, cambio y resumen juntos.

Permiso de «Esta semana» (Inicio real, sin sesión, Destacados):
- `d-hoy.png`: hoy, el banner «¿Te gusta Somos Nosotrxs?» tras el carril Destacados.
- `d-b.png`: B, en su sitio la tarjeta «¿Te avisamos lo destacado?» / «Cada jueves a las 7 pm, 3 planes en San Luis Potosí» con «Activar» y la ✕, en una línea de título. `d-b-320.png`: a 320 la frase va en dos renglones y el detalle en tres; nada se corta.
- `d-a.png`: A, la misma tarjeta como última del carril (el carril desplazado al final), con el botón debajo de la frase; el banner sigue más abajo. `d-a-320.png`: igual a 320.
- `d-permiso.png`: la ventana de iOS «“Somos Nosotrxs” quiere enviarte notificaciones» con «No permitir» y «Permitir», sobre la pantalla oscurecida.
- `d-ya.png`: quien ya tiene avisos: «¿También lo destacado de la semana?» con «Sí, también».
- `d-listo.png`: «Listo: te avisamos los jueves» con la palomita, en el sitio de la tarjeta.
- `recorrido-02-permiso.png`: la ventana de iOS tras tocar «Activar» en el recorrido.

Ajustes › Avisos (real, con el renglón del teléfono como en el iPhone con la app):
- `a-hoy.png`: «Por correo» y «En el teléfono · Activados en este iPhone».
- `a-si.png`: más «Lo destacado de la semana · Los jueves a las 7 pm, 3 planes» (encendido), «Ciudad · San Luis Potosí ›» y «Te llegan en: iPhone (app) · Mac (Safari)». `a-si-320.png`: a 320 el título del renglón va en dos líneas; la barra de arriba dice «At…» (eso ya pasa hoy en Ajustes a 320: es la `Barra` de producción, no de esta pieza).
- `a-no.png`: apagado, «Los jueves a las 7 pm, 3 planes de tu ciudad», sin el renglón de la ciudad.
- `a-hoja.png`: la hoja «Ciudad de lo destacado» con su nota y San Luis Potosí con la palomita, Ciudad de México, Querétaro y Oaxaca. `a-hoja-320.png` y `recorrido-03-hoja-ciudad.png`: la misma, a 320 y en el recorrido.
- `a-queretaro.png`: «Ciudad · Querétaro ›».
- `a-bloqueado.png`: «Bloqueados: se activan en Ajustes del iPhone», la palanca de lo destacado apagada y sin tocar: «Primero activa los avisos en el teléfono».
- `a-web.png`: la web del mismo iPhone: «En este iPhone te llegan por la app».

Administración (real):
- `m-hoy.png`: «Últimos 7 días» con sus seis indicadores.
- `m-si.png`: un séptimo, «Avisos abiertos · 11 · de 48 que salieron, sin saber quién · ▲ 4 más».
- `m-desglose.png`: abierto, «Los que se tocaron… Nunca por persona.» y los cuatro tipos (8 de 28, 2 de 9, 1 de 3, 0 de 8). `m-desglose-320.png`: a 320.

Recorrido: `recorrido-01-resumen-abre-novedades.png` (Novedades tras tocar el resumen).

## Lo que encontré y no es de esta pieza

- «Ahora es Mañana · 8:00 pm»: el texto de hoy del aviso de cambio pone «Mañana» con mayúscula a media frase (`contenidoPush` + `formatearCuando`). Se resuelve con la fecha corta de la pieza 1.
- La `Barra` de Ajustes a 320 corta «Atrás» en «At…» (producción, hoy).

## Preguntas al founder

1. **El resumen**: ¿el título dice cuántos («3 nuevos de lo que sigues», A, lo que recomiendo) o el nombre del primer evento (B)?
2. **El texto**: «3 eventos nuevos de lo que sigues» no cabe en la pantalla del iPhone (el sistema lo corta en «sigu…»). ¿Va «3 nuevos de lo que sigues»?
3. **La tarjeta de «Esta semana»**: ¿en el lugar del banner de compartir ese día (B, recomendado) o al final de Destacados (A)?
4. **A las 9 am** pueden llegar tres avisos juntos (el recordatorio, un cambio de anoche y el resumen). ¿Así, o el resumen 10 minutos después?
5. **Última hora**: un evento para esa misma noche ¿sale aunque esa persona ya recibió su aviso del día? (Recomiendo que sí.)
6. **Sin cuenta**: ¿la tarjeta sale también a quien no ha entrado, y «Activar» lo lleva a Entrar y de vuelta?
7. **La ciudad** se queda la que eligió (cambiar de ciudad en Inicio no la mueve) y se cambia en Ajustes. ¿De acuerdo?
8. **El aviso de privacidad**: ¿firmas las dos frases nuevas (la ciudad guardada y el conteo de avisos abiertos)?

Pide la firma: «¿Cuál variante firmas, con qué cambios?».

## Archivos

- `docs/rediseno/prototipos/avisos-hora-y-forma.html` (generado).
- `scripts/ops/auditoria-ui/prototipo/avisos-hora-y-forma.mjs` y `avisos-hora-y-forma.plantilla.html` (el generador y el armazón).
- `scripts/ops/auditoria-ui/capturar-avisos-hora-y-forma.mjs` (capturas, medida y recorrido).
- `scripts/ops/auditoria-ui/maqueta-pantalla.mjs` (seis pantallas `av-` en su lista).
- `docs/rediseno/capturas-510/` (50 PNG y `medidas.json`).

Para volver a armarlo:
```
node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> --solo=av-
node scripts/ops/auditoria-ui/prototipo/avisos-hora-y-forma.mjs <carpeta>
node scripts/ops/auditoria-ui/capturar-avisos-hora-y-forma.mjs <carpeta-de-capturas>
```
