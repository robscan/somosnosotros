# 512 · Avisos al teléfono, pieza 1: forma y medición (y el correo apartado para el boletín)

**Pieza:** OL-480. **Rama:** `avisos-forma`, desde `origin/main` (`4dd7a8d6`) con `origin/avisos-hora-y-forma` unido (PR #601, el prototipo de OL-478, bitácora [510](510-avisos-hora-y-forma.md)). **Fecha:** 2026-10-29. **Operador:** agente del Gestor de cambios VII (Opus 5.5, árbol aislado).
**Manda:** la firma del founder del 2026-10-29 sobre el prototipo de OL-478 («Tomo todas tus recomendaciones») y, el mismo día, el añadido de las 13:40 («recuerda que de momento separamos solicitud de aprobación por correo, la vamos a usar después para el boletín. Pero actívala default para usuarios nuevos, aún sin enviar nada») con sus precisiones de las 14:00.
**Estado:** hecho, con **una migración** (`20261029170000_avisos_forma.sql`, solo añade) y una ruta nueva (`POST /api/avisos/abierto`); sin variables nuevas. Espera revisión del gestor y el «publica» del founder. No toqué producción, `.env` ni llaves. Es la pieza 1 de 5 del plan de código de la bitácora 510; las piezas 2 a 5 (hora, resumen en la cola, sin duplicados, «Esta semana») vienen después.

Términos (una línea cada uno):
- **Subtítulo:** la segunda línea en negritas de un aviso de la app del iPhone (APNs `alert.subtitle`); la web no lo tiene.
- **Hilo (`thread-id`):** la marca con la que iOS junta en una pila los avisos de una misma cosa; aquí, `evento-<id>`.
- **`tag`:** lo mismo en la web: un aviso con el mismo `tag` sustituye al anterior en vez de sumarse.
- **Motivo:** por qué le llega a cada persona un evento nuevo (sigue al artista o sigue el lugar), guardado por persona.

## 1. Qué se hizo

Dos commits de código en la rama, en este orden, y uno de evidencia:

1. `db905a1e` **Pieza 1: forma y medición.**
2. `dfb05af4` **El correo se separa para el boletín** (el añadido del founder, commit aparte como pidió el gestor).
3. Este documento, OPEN_LOOPS, las capturas y su guion.

### Pieza 1 · la forma

- `src/lib/fechas.ts`: `cuandoCorto` («vie 9 · 8 pm»; a dos semanas o más «vie 13 de nov · 8 pm»; varios días «del vie 25 al dom 27» o «hasta el dom 18») y, con `relativo`, «hoy a las 8 pm» / «mañana a las 8 pm» **en minúscula**, para ir a media frase (se acaba el «Ahora es Mañana»); `horaDeAviso` («8 pm», «8:30 pm», «1 pm», con «a la 1 pm»); `conMayuscula`.
- `src/lib/avisos.ts`: `contenidoPush` devuelve `{ titulo, subtitulo, cuerpo, url, hilo }`: título = el nombre del evento; la razón en el subtítulo; la fecha corta primero en el cuerpo; nada dice quién publicó. `cuerpoPush(forma, "app" | "web", jobId)` arma lo que va a cada aparato. `recortar` corta por la última palabra entera con «…» (sin «·» colgando): **título y subtítulo ≤ 40, cuerpo ≤ 110**; en «Nuevo en …» y «De …, a quien sigues» se corta el nombre y la frase queda entera. Lo de última hora (empieza en menos de 24 horas) dice «Hoy a las…».
- **El motivo por persona** (artista antes que lugar): `avisos_expandir` lo guarda en `avisos_entregas.motivo` (columna nueva y nula: `artista:<nombre>` del primero del cartel que sigue, o `lugar`); `avisos_autorizar` lo devuelve, con la **descripción** del evento y la **dirección del lugar** (públicas; nunca la de un sitio reservado). La foto del evento que compara la cola (`avisos_evento_publico`) no cambia: lo que ya estaba en la cola sigue valiendo.
- `src/lib/avisosWorker.ts`: la entrega sabe si va a la app (`{ apns }`) o a un navegador (`aparatoDe`) y arma su cuerpo con `cuerpoPush`.
- `src/lib/push.ts`: `payloadApns` (ahora exportada) pone `alert.subtitle` y `aps["thread-id"]`; `apns-collapse-id` sigue siendo el trabajo (`aviso-<job>`: un reintento no sale dos veces). **La vida del aviso** llega hasta su hora límite (`vence`), con tope de un día (antes 1 hora: un teléfono apagado de noche ya no lo recibía).
- **Web:** sin subtítulo, la razón abre el cuerpo («Nuevo en Teatro de la Paz · vie 9 · 8 pm · …»), el mismo título, `tag` = `evento-<id>` y un dato `aviso` con el trabajo. `public/sw.js`: el aviso nuevo de un evento sustituye al anterior del mismo evento y **suena** (`renotify`); si es un reintento del mismo trabajo, no suena dos veces (mira `getNotifications`). Los cuerpos sin `aviso` (administración, los de antes) se ven como siempre.
- `POST /api/avisos/prueba` (bitácora 508 §5) acepta además `evento_id`: manda el aviso de «evento nuevo» de ese evento con la forma nueva, tal cual lo arma la cola para la app, y devuelve en `aviso` lo que mandó (para el guion de abajo).

### Pieza 1 · la medición, sin saber quién

- La dirección de cada aviso lleva `?desde=aviso&tipo=<nuevo|cambio|recordatorio|cancelado>`.
- `src/lib/avisoAbierto.ts` (lista cerrada) y `src/components/AvisoAbierto.tsx` (en el layout): al abrir, quita los dos datos de la dirección con `replaceState` (no apila nada; recargar no cuenta otra vez; compartir no los lleva), espera a saber quién mira (la marca del layout) y, si no es la administración, mide `aviso_abierto` con el tipo (`medir.ts`, lista cerrada con su prueba) y llama a `POST /api/avisos/abierto`.
- `POST /api/avisos/abierto`: solo del propio sitio (`Sec-Fetch-Site`), un tipo de la lista, cuerpo acotado; llama con la llave de servicio a `avisos_contar_abierto`, que suma uno en `avisos_abiertos` (día en la hora del centro, tipo, n). **Sin cuenta, teléfono, IP ni evento.** Nadie más puede escribir ni leer esa tabla (RLS encendida, sin permisos para `anon` ni `authenticated`).
- `panel_avisos()` (solo administración, `security definer` con `search_path = ''`): avisos al teléfono que salieron en 7 días (entregas enviadas, sin contar a la administración de entonces) y los abiertos, contra los 7 anteriores y por tipo.
- Administración › Últimos 7 días: un séptimo indicador **«Avisos abiertos · 11 · de 48 mandados, sin saber quién · ▲ 4 más»**; al tocarlo, qué cuenta («nunca por persona») y el desglose («Evento nuevo: 8 de 28», …), sin enlace a ninguna lista. `Indicador.enlace` es opcional por eso. Si la función falla, solo falta ese indicador.
- Aviso de privacidad: «Contamos cuántos avisos se abren, por tipo y por día, sin saber quién: no se guarda tu cuenta, tu teléfono ni de qué evento era.» (La otra frase firmada, la de la ciudad guardada, es de la pieza 5.)

### Pieza 1 · las dos fallas de paso

- «Ahora es Mañana»: resuelto con `cuandoCorto` (minúscula a media frase).
- El «Atrás» de la barra interior (`ui/Barra`) a 320 se cortaba en «At…»: los lados ahora miden al menos lo suyo (`minmax(max-content, 1fr) minmax(0, max-content) minmax(max-content, 1fr)`, la regla que ya usaba la letra grande). Con espacio de sobra queda igual que antes, con el logotipo al centro exacto (medido a 390: 0 px de diferencia); a 320 el «Atrás» queda entero (78 px, 44 de toque) y el logotipo se corre 5 px. La barra con título (Administración) no cambia.

### El correo se separa para el boletín (añadido del founder)

- **La hoja de consentimiento** (`ConsentimientoAvisos`, tras el primer «Voy» o al seguir) ofrece solo **«En el teléfono» · «No, gracias»**; ya no ofrece «Por correo» ni «¿También por correo?». «No, gracias» no toca el correo (es el del boletín). El cierre dice «Se cambia en Ajustes». La hoja de instalar en iPhone sigue igual.
- **Ninguna entrega de la cola sale por correo:** `avisos_expandir` ya no crea entregas `canal = 'correo'` de ningún tipo, y `avisos_autorizar` descarta con `correo_pausado` cualquiera que hubiera quedado pendiente de antes. **Dejan de salir, desde que se aplique la migración:** el correo de «evento nuevo» de lo que sigues, el recordatorio del día de un «Voy» y el de cambio de fecha o lugar. **No se tocan** los correos de cuenta: el código de entrada, la bienvenida, la ficha que recibe un artista, los de la administración (no pasan por esta cola).
- **El cambio sigue en Novedades** de quien va, tenga o no teléfono dado de alta (ya era así; ahora con su prueba en la base). La cancelación de un evento por venir todavía no existe (fase 4 del plan): el founder ya decidió que irá **por el teléfono y a Novedades, nunca por correo**; su texto ya está listo («Se canceló» / «Era el vie 9 · 8 pm en Teatro de la Paz.») y el conteo ya acepta su tipo.
- **Correo encendido por omisión solo para cuentas nuevas:** `perfiles.avisos_correo` por omisión `true` y `crear_perfil` lo pone con `avisos_correo_desde = now()`. **Ninguna fila existente cambia** (la migración no actualiza `perfiles`; lo comprueba el banco). `avisos_correo` queda para el boletín (OL-138).
- **Ajustes › Avisos:** «Boletín por correo», con su palanca: «Por correo solo llegará el boletín, cuando exista».
- **Novedades:** la línea de abajo ya no dice «En este teléfono aún no»: dice **«Activa las notificaciones en este teléfono»** y «Activar» las activa ahí mismo (el permiso del sistema; en el iPhone sin instalar, la hoja con los pasos), sin mandar a Ajustes. Ya no menciona el correo.
- Aviso de privacidad: el correo sirve para el código y, cuando exista, el boletín; los avisos son al teléfono (y quedan en Novedades); y la frase pedida: «El correo de avisos viene encendido al crear tu cuenta, pero no te mandamos nada por correo hasta que exista el boletín. Lo apagas en Ajustes o con el enlace de baja que trae cada correo.» Ayuda: «Te preguntamos si quieres notificaciones de sus eventos nuevos en el teléfono».

## 2. Los textos finales

Fechas del prototipo: jueves 8 de octubre de 2026, 9:00, San Luis Potosí; la Noche de danzón es el viernes 9 a las 8 pm en el Teatro de la Paz.

| Aviso | Título | Subtítulo (app) | Cuerpo (app) | Web: cuerpo |
|---|---|---|---|---|
| Nuevo, por el lugar | Noche de danzón | Nuevo en Teatro de la Paz | vie 9 · 8 pm · Baile de salón con orquesta en vivo: danzón, mambo y chachachá para todo el público | Nuevo en Teatro de la Paz · vie 9 · 8 pm · Baile de salón con orquesta en vivo: danzón, mambo y chachachá… |
| Nuevo, por el artista | Noche de danzón | De Luna Hermoso, a quien sigues | vie 9 · 8 pm · Teatro de la Paz | De Luna Hermoso, a quien sigues · vie 9 · 8 pm · Teatro de la Paz |
| Nuevo, de última hora (ejemplo) | Jam de jazz | Nuevo en Foro Lunaria | Hoy a las 10 pm · … | Nuevo en Foro Lunaria · Hoy a las 10 pm · … |
| Recordatorio (viernes 9:00) | Noche de danzón | Hoy a las 8 pm | Teatro de la Paz · Villerías 2, Centro | Hoy a las 8 pm · Teatro de la Paz · Villerías 2, Centro |
| Cambio de fecha | Noche de danzón | Nueva fecha: sáb 10 · 8 pm | Teatro de la Paz | Nueva fecha: sáb 10 · 8 pm · Teatro de la Paz |
| Cambio para mañana | Noche de danzón | Nueva fecha: mañana a las 8 pm | Teatro de la Paz | Nueva fecha: mañana a las 8 pm · Teatro de la Paz |
| Cambio de lugar | Noche de danzón | Nuevo lugar: Foro Lunaria | vie 9 · 8 pm | Nuevo lugar: Foro Lunaria · vie 9 · 8 pm |
| Cambio de los dos | Noche de danzón | Nueva fecha y lugar | sáb 10 · 8 pm · Foro Lunaria | Nueva fecha y lugar · sáb 10 · 8 pm · Foro Lunaria |
| Se canceló (fase 4) | Noche de danzón | Se canceló | Era el vie 9 · 8 pm en Teatro de la Paz. | Se canceló · Era el vie 9 · 8 pm en Teatro de la Paz. |
| Nombres largos | Festival Internacional de Danza… | Nuevo en Centro de las Artes de San… | sáb 10 · 7 pm · Gala de clausura con compañías de México, Argentina y España en el foro principal | Nuevo en Centro de las Artes de San… · sáb 10 · 7 pm · Gala de clausura con compañías de México, Argentina y… |

Todos abren la ficha del evento con `?desde=aviso&tipo=…` y van en el hilo `evento-<id>`. Con sitio reservado, el recordatorio dice solo «Casa de Ana · sitio reservado».

Dos decisiones de operador, para que el gestor las mire:
- **Cambio:** seguí el encargo («Nueva fecha: vie 9 · 8 pm» de subtítulo, con la fecha nueva arriba) y no la tabla de la bitácora 510 («Cambió la fecha» / «Ahora es el sáb 10…»). Es más corto y la fecha nueva queda en negritas. Va a las preguntas.
- **Hilo:** `evento-<id>` (lo de la bitácora 510), no el id pelón: deja sitio a `lo-nuevo` y `destacados-<ciudad>` de las piezas 3 y 5.

## 3. Cómo se probó

- `npm run lint`: 0 errores (los 2 avisos ajenos de siempre: `capturar-inicio-vacio.mjs`, `VisorImagen.componentes.test.mjs`). `npm run typecheck`: verde.
- `npm test`: **4 953 de 4 953** (306 archivos). Nuevas: `avisos.test.ts` (cada forma, los recortes con nombres largos, la web y la app, sin «Mañana» a media frase), `fechas.test.ts` (`cuandoCorto`, zonas), `pushApns.test.ts` (subtitle, thread-id, collapse-id, la vida de un día), `push.test.ts` (TTL), `avisosWorker.test.ts` (un cuerpo para la app y otro para la web desde la misma entrega), `avisosSW.test.ts` (el aviso nuevo del mismo evento suena, el reintento no), `avisoAbierto.test.ts`, `panel.test.ts` (indicador y lectura), `api/avisos/abierto/route.test.ts`, `api/avisos/prueba/route.test.ts` (con `evento_id`).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **120 migraciones, 2 744 pruebas, 0 fallaron.** Banco nuevo `supabase/tests/pg/avisos-forma.test.mjs`: el motivo por persona (artista del cartel, lugar, los dos → artista; sin lugar solo llega a quien sigue a un artista), la forma del motivo, autorizar con descripción y dirección y nunca la de un sitio reservado, el conteo solo por el servidor (anon y authenticated no cuentan, no leen, no escriben), un tipo fuera de la lista no se cuenta, el panel solo de la administración y sin contarla (comparado contra lo de antes de la prueba: la base es compartida), sin ids, permisos y `search_path` vacío; y lo del correo: la cuenta nueva nace con el correo encendido y su fecha, el valor por omisión, la migración no actualiza `perfiles`, la cola no crea ninguna entrega por correo, un cambio a quien va sin teléfono queda en Novedades y no sale por ningún lado más, y una entrega por correo vieja se descarta con `correo_pausado`. `avisos-fiables.test.mjs` prueba ahora la cola (paginación de 1 007, leases, correcciones, recordatorios) con una suscripción de navegador por persona en vez del correo. **Control negativo:** con el motivo fijo en `lugar`, el banco falla en 4 comprobaciones (artista, artista antes que lugar, autorizar, sin lugar).
- `npm run test:componentes`: **768 de 769**. Nueva `AvisoAbierto.componentes.test.mjs` (4, Chrome real): cuenta una vez con el tipo y nada más, la dirección queda limpia (resto de la consulta y `#` intactos), no apila, recargar no cuenta; la administración no se cuenta; si la marca de quién mira llega tarde, espera; un tipo fuera de la lista no se cuenta y sin `desde=aviso` nada cambia. La que falló es ajena: «con Storage lento la foto elegida espera atenuada…» (`FormularioPerfil.componentes.test.mjs`, OL-353); sola pasa 2 de 2 (es de tiempos con la máquina cargada).
- `npm run inventario`: sin novedades.
- `npm run medir`: con el indicador nuevo, la portada de Administración (`s45-admin-portada`) tiene 6 nodos más (el indicador: `li`, botón y sus cuatro textos); subí su presupuesto a mano a 217 / 253 en `medidas.aceptadas.json` (solo esa línea). Con eso, otra vez: **60 pantallas × 4 anchos, sin novedades.**
- **Capturas** con `scripts/ops/auditoria-ui/capturar-avisos-forma.mjs` (la app real compilada contra el respaldo local, `RESPALDO_SIN_PREGUNTAR=1` nuevo en el respaldo para que a Ana aún no se le haya preguntado; Chrome real de la Mac; toques reales comprobados con `elementFromPoint`, nunca `element.click()`): **60 comprobaciones, 0 fallas, 0 errores en la consola.**

## 4. Capturas (`docs/rediseno/capturas-512/`, todas abiertas)

El aviso simulado (textos de `contenidoPush` + `cuerpoPush` + `payloadApns` compilados, dibujados como la pantalla de bloqueo; letra del sistema):
- `aviso-app.png` (390): los siete casos en la app: título del evento en negritas, la razón en negritas debajo, la fecha corta primero; «Nueva fecha: mañana a las 8 pm» en minúscula a media frase; nombres largos: «Festival Internacional de Danza…» / «Nuevo en Centro de las Artes de San…» y el cuerpo entero en tres líneas. `aviso-app-320.png`: lo mismo a 320.
- `aviso-web.png` (390): la web, sin subtítulo: la razón abre el cuerpo («Nuevo en Teatro de la Paz · vie 9 · 8 pm · …»), cortado con «…» en «chachachá…» y «Argentina y…».
- `aviso-payload.png`: lo que sale a Apple (`aps.alert.title/subtitle/body`, `thread-id: evento-e1`, `url` con `?desde=aviso&tipo=…`) y a la web (`tag: evento-e1`, `aviso: job-1`) para nuevo por el lugar, por el artista y el recordatorio.

Administración (real):
- `admin-avisos.png` (390): «Últimos 7 días» con el séptimo indicador «Avisos abiertos · 11 · de 48 mandados, sin saber quién · ▲ 4 más» debajo de «Voy y Me interesa».
- `admin-avisos-desglose.png`: tocado, marcado en morado; debajo «Avisos al teléfono que se tocaron… nunca por persona…» y los cuatro tipos (8 de 28, 2 de 9, 1 de 3, 0 de 8), sin enlace.
- `admin-avisos-320.png`: a 320, «de 48 mandados, sin / saber quién» en dos renglones, nada cortado.

El «Atrás»:
- `atras-320-antes.png`: Ajustes a 320 con la regla vieja puesta en la página: «At…».
- `atras-320-despues.png`: «Atrás» entero; el logotipo un poco a la derecha del centro.
- `atras-390-antes.png` y `atras-390-despues.png`: iguales (el mismo peso en bytes): a 390 nada cambia.

El correo para el boletín (real, con el iPhone simulado en Safari sin instalar):
- `hoja-consentimiento.png` (390) y `hoja-consentimiento-320.png`: tras «Voy» en Feleal: «Vas a Feleal: un viaje por el mundo en acordeón · Ya estás en la lista de quien va · ¿Te recordamos ese día?», un solo botón «En el teléfono» a todo el ancho y «No, gracias»; sin «Por correo».
- `hoja-no-gracias.png`: «Sin avisos. Se cambia en Ajustes.» y «A mi calendario · Con una alerta 1 hora antes · Agregar».
- `hoja-en-el-telefono.png`: «En el teléfono» en el iPhone sin instalar abre «Instala Somos Nosotrxs» con los tres pasos.
- `ajustes-boletin.png` (390) y `ajustes-boletin-320.png`: Avisos: «Boletín por correo · Por correo solo llegará el boletín, cuando exista» con la palanca encendida (Ana la tenía) y «En el teléfono · Instala la app para recibirlos».
- `novedades-activar.png` (390) y `novedades-activar-320.png`: al pie de Novedades «Activa las notificaciones en este teléfono» con «Activar».
- `novedades-activar-pasos.png`: tocar «Activar» abre los pasos ahí mismo, sin salir de Novedades.

## 5. Guion del gestor con el iPhone del founder (tras el «publica»)

Con la migración aplicada y el despliegue de Vercel en verde; lo mismo que la bitácora 508 §5, con `evento_id`:
1. Elegir un evento visible y por venir con lugar (`select id, titulo from public.eventos where visible and inicio > now() and lugar_id is not null order by inicio limit 5;`) y el id del founder (508 §5, paso 1).
2. `POST /api/avisos/prueba` con `{"usuario_id":"<id del founder>","evento_id":"<id del evento>"}` (el `net.http_post` de 508 §5 con ese cuerpo, o `curl … -d '{"usuario_id":"<id>","evento_id":"<id>"}'`).
3. La respuesta trae `aviso`: comprobar `titulo` = el evento, `subtitulo` = «Nuevo en <lugar>», `hilo` = `evento-<id>` y `url` con `?desde=aviso&tipo=nuevo`; y por teléfono `codigo: aceptado`.
4. En el iPhone del founder: el aviso con el nombre del evento arriba y «Nuevo en …» en negritas debajo (no «Nuevo en …: título»). Pedirle una captura de la pantalla de bloqueo: sirve también para confirmar las medidas dibujadas de la bitácora 510.
5. Que lo toque: abre la ficha y la dirección queda sin `?desde=aviso`; como es administración, no se cuenta (en Administración, «Avisos abiertos» no sube con sus toques).

## 6. Lo que quedó fuera

- Las piezas 2 a 5 del plan (la hora: silencio de 9 pm a 9 am y el resumen a las 9:10; el resumen diario en la cola; sin duplicados entre la web y la app del mismo iPhone; «Esta semana en {ciudad}» con su tarjeta, sus renglones de Ajustes y la frase de la ciudad en el aviso de privacidad). La hora límite de lo nuevo sigue cortándose a la medianoche (pieza 2).
- La cancelación de un evento por venir (fase 4): solo su texto y su tipo en el conteo.
- El prototipo de la bitácora 510 se arma con `contenidoPush`: si se vuelve a generar, sus «Hoy» ya mostrarán la forma nueva.
- La rama no trae el `main` de hoy (se movió mientras trabajaba): unirlo lo hace el gestor.

## 7. Preguntas al founder

1. **El aviso de cambio:** arriba el evento y debajo «Nueva fecha: sáb 10 · 8 pm» (y el lugar en el cuerpo), en vez de «Cambió la fecha» con «Ahora es el sáb 10 · 8 pm» debajo. ¿Lo dejamos así?
2. **Quien solo tenía avisos por correo** (sin teléfono dado de alta) deja de recibir avisos de eventos: le quedan Novedades dentro de la app y la línea «Activa las notificaciones en este teléfono». ¿Así, o se le avisa una vez de alguna forma?
3. **El boletín y las cuentas de antes:** quien ya tenía el correo encendido lo conserva encendido (ahora dice «Boletín por correo»). ¿Eso cuenta como su permiso para el boletín, o cuando exista el boletín se lo preguntamos otra vez?
