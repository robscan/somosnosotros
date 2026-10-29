# Avisos con la app nativa: cómo funcionan hoy y qué proponer

**Fecha:** 29 de octubre de 2026. **Tipo:** investigación, solo documento. No cambia código, no toca la base, no enciende nada.
**Base leída:** rama `historial-escalable-codigo` sobre `main` (`a047afa9`). Los números de volumen son los que dio el gestor (14 días al 29 oct); no consulté producción.

Términos que uso (una línea cada uno):
- **Aviso / push:** la notificación que aparece en la pantalla del teléfono aunque la app esté cerrada.
- **Web Push:** el aviso que manda un navegador o la web instalada (Chrome, Android, Safari de Mac, iPhone con la web en el inicio).
- **APNs:** el servicio de Apple que entrega los avisos a la app de la tienda.
- **Cola (`avisos_jobs`):** la lista de avisos por mandar; un renglón por aviso y evento, no por persona.
- **Entrega (`avisos_entregas`):** un renglón por persona y por teléfono; ahí queda si salió, falló o caducó.
- **Latido:** la tarea de Supabase (pg_cron) que cada 5 minutos pide al servidor que vacíe la cola.
- **Expandir:** convertir un aviso de la cola en sus entregas (calcular a quién le toca).

## 1. El pedido

> «Revisemos cómo están funcionando hoy las notificaciones al tener ya acceso nativo desde la aplicación. Quiero que las notificaciones funcionen muy bien. Ese es nuestro gancho para mantener fresca la información y el interés de los usuarios. Entonces, en cuanto se publican nuevos eventos de los usuarios o de los artistas o de los lugares a los que los usuarios siguen o tienen interés, entonces que se enteren rápidamente. Habrá necesidad de analizar cuáles son las posibilidades de tener estas notificaciones, pero me gustaría que revisaras y que te asegures de que las estamos ocupando bien, que son oportunas, que están en el formato correcto y que sí también generan interés entre los usuarios. Ojo, algunos usuarios, sobre todo los nuevos, podrían no seguir ningún artista ni ningún lugar, pero ya tenemos también nosotros una sección de destacados. Esa sección de destacados debería de servir también para alimentar la información de usuarios que no tienen preferencias dadas de alta… analiza fuertemente, critica también lo que te pido, identifica áreas de oportunidad y propón planes».

## 2. Resumen en 10 líneas

1. **«Caducado» no quiere decir «perdido».** En la cola, un aviso no tiene estado de «terminado»: se queda «activo» hasta su hora límite y entonces pasa a «caducado», se haya mandado o no. Los 21 + 11 caducados son el final normal. Lo que de verdad pasó está en `avisos_entregas`, y esa tabla no se ha leído (§4).
2. **La rapidez ya está bien.** Al publicar, el aviso intenta salir en el mismo momento y el latido lo repite cada 5 minutos. Llega en segundos o en pocos minutos.
3. **El hueco grande es otro: casi nada de lo que entra al catálogo avisa.** Lo que carga la administración con las rutinas (agendas, Instagram, Cartelera CDMX, CAPO) se guarda sin sesión y no crea ningún aviso. Dentro de la app sí aparece en Novedades, pero al teléfono no llega.
4. **Tope de 3 avisos por autor al día.** El cuarto evento del día de una misma cuenta se guarda «suprimido» (los 4 suprimidos). Un festival de 10 actos avisa de los tres primeros y calla el resto.
5. **Formato:** el título dice «Nuevo en <lugar>» aunque la persona siga al artista y no al lugar. Un nombre de lugar largo se come el título y el nombre del evento queda abajo. Ningún aviso lleva imagen, no se agrupan y no se cuentan los toques.
6. **Horario:** no hay horas de silencio. El recordatorio sale cuando faltan 24 horas, así que un evento de las 11 pm se recuerda a las 11 pm del día anterior. El founder ya aprobó «recordatorio a las 9:00 am y silencio de 9 pm a 9 am» (plan VII, bitácora 449), pero no se ha construido.
7. **Quien no sigue a nadie no recibe ningún aviso.** Destacados (`tira_destacados`) no alimenta avisos, y tampoco se guarda en qué ciudad vive cada persona.
8. **Hay decisiones firmadas que siguen sin construirse:** el boletín quincenal y el apagado del correo por evento (OL-138, 23 sep), cancelar un evento antes de que pase con aviso a quienes van, y la hora de los avisos. Hoy el correo por evento sigue saliendo a quien lo tiene encendido.
9. **El gancho no se puede medir hoy.** No hay evento de medición «abrí un aviso», y las direcciones web muertas no se borran, así que «17 suscripciones» puede ser menos gente.
10. **Recomiendo este orden:** primero medir y limpiar (fiabilidad), después la hora y el formato con avisos agrupados, después avisar también lo que cargan las rutinas, y al final Destacados para quien no sigue a nadie, con su propio permiso.

## 3. Qué se avisa hoy (y qué no)

| Aviso | Lo dispara | A quién | Canal | Cuándo sale | Texto (push) | Al tocar | Se suprime o se cae si… |
|---|---|---|---|---|---|---|---|
| **Nuevo evento** | Publicar desde la app (`guardar_evento_con_avisos` y las que lo envuelven: sesiones, clase, programa, exposición de inauguración) | Quien sigue el lugar **o** a un artista ligado y visible; nunca quien lo publicó | Push (web y APNs) y correo si `avisos_correo` | En el momento (`after`) o en el siguiente latido (≤ 5 min) | Título «Nuevo en {lugar}». Cuerpo «{evento} · {cuándo}» | `https://somosnosotros.org/eventos/{id}` (sin slug: el resumen público del evento no lo trae) | El autor ya publicó 3 en 24 h (suprimido) · lo cargó una rutina o un guion (no se crea) · se ocultó o ya empezó · pasó la medianoche del día en que se preparó · pasaron 23 h |
| **Cambio** de fecha o lugar | Editar fecha, hora, zona, lugar o dirección | Quien dijo «Voy» | Push, correo y una fila en Novedades | Igual | «Cambió {la fecha/el lugar}: {evento}» / «Ahora es {cuándo} · {lugar}» | La ficha | Un cambio de título no avisa · «Me interesa» no recibe nada |
| **Recordatorio** | El latido, cuando faltan ≤ 24 h | Quien dijo «Voy» (también en eventos cargados por rutinas) | Push y correo | En cuanto el evento entra a las 24 h: **a la misma hora del evento, un día antes** | «Mañana: {evento}» o «Hoy: …» / «{cuándo} · {lugar}» | La ficha | Quien dice «Voy» cuando el recordatorio ya se repartió no lo recibe |
| Aviso a la administración | Reclamo, reporte, alta de evento, lugar o artista por una persona, registro, cartel | Cuentas admin | Push, agrupado en tandas de 10 min (tope 60) | Igual | «Administración» / «Se publicó un evento nuevo» o «N cosas por revisar» | `/admin` | La acción la hizo la administración |
| Publicación en redes terminada (OL-465) | Termina el trabajo de Instagram y Facebook | Quien publicó | Push directo, sin cola | Al terminar | Lo arma la cola de redes | La hoja de redes | Avisos apagados |

**Lo que hoy NO avisa:**
- Los eventos que cargan las rutinas y los guiones: agendas de la Secretaría, rutina de agendas, carteles de Instagram aceptados, Cartelera CDMX, cargas históricas (`publicarEvento.ts`, migración `20261020120000`). Es la mayor parte del catálogo: solo la relectura de OL-470 trabaja sobre 682 eventos de un único origen de agenda.
- Un artista que se liga a un evento ya publicado (ligar o releer artistas): el aviso ya se repartió con los artistas de ese momento.
- «Me interesa», en todo: no recibe cambios, recordatorio ni cancelación.
- Destacados: ni a quien no sigue a nadie, ni a quien publicó cuando su evento entra a la tira.
- Cancelar: hoy solo se marca «Se canceló» en lo que ya pasó (OL-391). Un evento que se cae antes no avisa a nadie, y quien dijo «Voy» recibe el recordatorio igual.
- Artistas y lugares no se enteran de su actividad (alguien los sigue, van N). Los textos están firmados en doc 28 (L43, L44) y no se construyeron.
- Las personas nuevas: el permiso solo se pide después de un «Voy» o un «Seguir» (`ConsentimientoAvisos`, una sola vez por cuenta, `avisos_preguntado`). Eso está bien, pero quien no toca nada nunca ve la pregunta.

## 4. Fiabilidad, con los números

**Cómo corre (leído en `20260918140000_avisos_fiables.sql`, `20260925160000_dispositivos_apns.sql`, `avisosWorker.ts`, `push.ts` y la bitácora 120):**
1. Al publicar, un disparador de la base crea el aviso en la cola. Su hora límite es la más temprana entre «dentro de 23 h» y «cuando empieza el evento».
2. Lo vacían dos cosas: `after()` en la misma publicación (5 s) y el latido `avisos-pendientes` de pg_cron **cada 5 minutos** (founder, «cada 5», 18 sep, bitácora 120). Además, el cron de Vercel de las 9:00 llama a `/api/recordatorios`. Esto contesta la duda de la bitácora 449 («quién llama a la cola fuera del cron»): es el latido.
3. Expandir: lotes de 100 personas. Al preparar el texto, la hora límite se acorta a la medianoche del día, para que «Hoy» no se vuelva falso.
4. Envío: 4 a la vez, hasta 40 por llamada (unos 480 por hora). Reintenta hasta 8 veces, de 1 minuto hasta 1 hora de espera. Antes de cada envío revisa permiso, visibilidad y que el evento no haya cambiado.
5. **El aviso no tiene estado de «terminado».** Tras expandirse sigue «activo» y, al pasar su hora límite, cualquier latido lo marca «caducado». Por eso:
   - **21 «nuevo evento» caducados** = 21 avisos que llegaron a su hora límite. Pudieron salir a todos, a algunos o a nadie (si nadie seguía el lugar ni al artista). No es una falla en sí.
   - **4 suprimidos** = el tope de 3 por autor al día. Nunca salieron, a propósito.
   - **11 recordatorios caducados** = lo mismo que el primer punto: el final normal.
   - Un caducado con `contenido` vacío nunca se preparó y nunca salió. Ese sí sería una pérdida, porque el latido no corrió a tiempo.
6. **Sí hay tabla de entregas** (`avisos_entregas`): un renglón por persona y teléfono, con estado (`enviada` = la aceptó Apple, Google o Mozilla, no que se vio), `fallida`, `caducada` o `descartada`, código (`push_410`, `apns_410_unregistered`, `ya_no_aplica`…), intentos y horas.

**Riesgos que veo en el código:**
- **Pérdidas por tiempo de vida corto:** el aviso vive como mucho 1 hora en Apple o Google (`TTL ≤ 3600`). Un teléfono apagado de 10 pm a 7 am pierde lo de la noche. Además, Apple guarda **un solo aviso por app** mientras el teléfono está desconectado ([Apple](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns)).
- **Direcciones muertas:** si una dirección web responde 404 o 410, la entrega queda «fallida», pero la dirección no se borra (decisión de la bitácora 113). Cada aviso nuevo vuelve a fallar en ella. En APNs sí se borra. La bitácora 449 ya vio 9 entregas de madrugada fallidas.
- **Duplicados:** quien tiene la web instalada en el iPhone **y** la app recibe dos avisos, uno por cada dirección. No hay regla «un aviso por aparato».
- **Escala:** con 480 por hora, un lugar con 2 000 seguidores tardaría unas 5 horas y podría chocar con la medianoche. Hoy no pasa (21 teléfonos), pero es el techo.
- **El correo por evento sigue encendido**, contra lo firmado el 23 de septiembre (OL-138).

**Cómo medirlo ya (solo lectura; que lo corra el gestor):**
```sql
-- Qué pasó con cada tipo en 14 días
select j.tipo, j.estado, j.contenido is not null as preparado, count(distinct j.id) avisos, count(e.id) entregas,
  count(*) filter (where e.estado='enviada') enviadas, count(*) filter (where e.estado='fallida') fallidas,
  count(*) filter (where e.estado='caducada') caducadas, count(*) filter (where e.estado='descartada') descartadas
from avisos_jobs j left join avisos_entregas e on e.job_id=j.id
where j.creado_en > now()-interval '14 days' group by 1,2,3 order by 1,2;
-- Fallas por medio y código, y hora local de salida
select case when e.canal='correo' then 'correo' when e.endpoint like 'apns:%' then 'app' when e.endpoint like '%web.push.apple.com%' then 'safari'
  when e.endpoint like '%fcm.googleapis%' then 'chrome' else 'otro' end medio, e.estado, e.codigo,
  extract(hour from e.terminado_en at time zone 'America/Mexico_City') hora, count(*)
from avisos_entregas e where e.disponible > now()-interval '14 days' group by 1,2,3,4 order by 1,2,3,4;
-- Cuántos eventos nuevos avisaron, según su origen
select coalesce(ev.origen,'app') origen, count(*) eventos, count(j.id) con_aviso
from eventos ev left join avisos_jobs j on j.evento_id=ev.id and j.tipo='nuevo_evento'
where ev.creado_en > now()-interval '14 days' group by 1;
```
**Lo que falta medir:** cuánto tarda en salir (`terminado_en − creado_en`), cuántos avisos se tocan (no existe) y cuánta gente apaga los avisos (no se cuenta).


### 4.b Lo que dijo producción el 2026-10-29 (consultas de arriba, corridas por el gestor)

| Medio | Resultado (14 días) |
|---|---|
| App del iPhone (APNs) | **0 enviados**; 12 fallidos con código `worker_dependencia` tras 8 intentos (el envío lanza una excepción que el trabajador no registra) y 3 caducados antes de salir |
| Safari (web instalada o Mac) | 9 enviados; 12 fallidos con `push_410` (suscripciones muertas que nadie borra) |
| Chrome | 10 fallidos con `push_410` (muertas) |
| Correo | 1 enviado |

Los 4 dispositivos registrados en `dispositivos_apns` están en entorno `produccion` (desde el 26 de septiembre) y el último intento fue hoy. Conclusión: **ningún aviso ha llegado a la app nativa**; el error real no se ve porque el trabajador lo cambia por `worker_dependencia` sin guardar el mensaje. Primer sospechoso: la llave `.p8` en Vercel con saltos de línea escapados (`\n` literal), que hace fallar `crypto.sign`; segundo: la sesión HTTP/2 hacia APNs desde Vercel. Pieza inmediata (OL-476): guardar el motivo real en `codigo`, leer la llave con saltos escapados, marcar muertas las direcciones 410 y volver a probar con el iPhone del founder.

De los eventos creados en 14 días, los 52 hechos desde la app generaron 27 avisos; los 1 500 cargados por rutinas y agendas, ninguno (confirma el §2.3).

## 5. Formato y oportunidad

**Cómo se ve hoy** (`contenidoPush`, `payloadApns`, `public/sw.js`):
- En la pantalla de bloqueo del iPhone, el título ocupa una línea y el cuerpo dos a cuatro (calculado sobre 390 px; hay que confirmarlo con captura). «Nuevo en Centro de las Artes de San Luis Potosí Centenario» se corta, y lo que atrae (el nombre del evento) queda en segundo plano.
- La razón puede ser falsa: a quien sigue a un artista le llega «Nuevo en {lugar}». Novedades dentro de la app sí dice «Nueva fecha de {artista}».
- Sin imagen. APNs no la permite sin una **extensión de servicio** (un pequeño programa dentro de la app que baja la imagen antes de mostrar el aviso, activado con `mutable-content`). Eso pide una compilación nueva y revisión de Apple. En Web Push, Chrome y Android aceptan `image`. Para Safari, la tabla de compatibilidad no lo confirma: hay que probarlo en un teléfono.
- Sin agrupar: no se usa `thread-id` (agrupa por hilo en el centro de avisos) ni `relevance-score` (ordena el resumen de avisos de iOS). Se usa `apns-collapse-id`, que solo junta los reintentos de un mismo aviso.
- Al tocar: en la app se carga la ficha dentro de la app (`MainViewController.didReceive`) y en la web se abre la ventana. Funciona. No lleva marca de origen, así que no se sabe que vino de un aviso.
- Horas: lo nuevo sale cuando alguien publica, aunque sean las 2 am. El recordatorio sale a la hora del evento menos 24 h.

**Propuesta de formato** (para prototipo sobre la pantalla de bloqueo real):
- **Título = el evento** («Noche de jazz con Cuarteto Tierra»). **Subtítulo** (APNs lo admite) **= la razón** («Nuevo en Foro Lunaria», «Nueva fecha de Tlacuache» o «Destacado esta semana»). **Cuerpo = «sáb 1 nov · 8:00 pm · Foro Lunaria»**. En Web Push, que no tiene subtítulo, la razón va al principio del cuerpo.
- `thread-id` por lugar o artista: los avisos de un mismo foro se apilan.
- Hora: lo nuevo y los cambios, **nunca entre 9 pm y 9 am** (se guardan y salen a las 9). El recordatorio, **a las 9:00 am del día del evento**, y la víspera a las 7 pm si empieza antes de las 11 am. Esto ya está aprobado.
- **Un aviso por persona al día con lo nuevo de lo que sigue.** Si hay uno, el aviso del evento. Si hay varios, «3 eventos nuevos en lo que sigues» con el primero en el cuerpo, que abre Novedades. Así se pueden avisar las cargas de las rutinas sin inundar a nadie.
- El cambio y la cancelación siguen saliendo en el momento (es información que urge) y con «interruption-level» normal. No propongo «time-sensitive» (atraviesa el modo Concentración y pide permiso aparte).
- Tiempo de vida hasta la hora límite real, no 1 hora.

## 6. Personas sin seguimientos: Destacados como fuente

**Hoy:** `tira_destacados(eventos, ciudad)` da hasta 12 por ciudad: los elegidos a mano primero y luego por puntos (Voy 20, Me interesa 10, vista 1; entra con 1 Voy, 1 Me interesa o 6 vistas). La barra es baja para Inicio, y más baja todavía para interrumpir a alguien en su teléfono.

**Propuesta: «Esta semana en {ciudad}»**, un aviso semanal:
- **Qué:** los 3 primeros destacados que empiecen en los próximos 7 días. Título «Esta semana en San Luis Potosí». Subtítulo con el primero, cuerpo «y 2 más: {evento 2} · {evento 3}». Abre Inicio en esa ciudad, en el carril de Destacados.
- **Regla de entrada más alta que la de Inicio:** elegido por la administración, o 2 señales o más (Voy o Me interesa). Si no hay 3 que pasen la regla, **esa semana no se manda nada**.
- **Cuándo:** jueves a las 7 pm de la ciudad (para planear el fin de semana, antes del silencio). Máximo uno por semana.
- **A quién:** solo quien lo pidió con su propio interruptor, «Lo destacado de la semana». Apple exige permiso explícito para avisos que se parecen a la promoción, y una forma de apagarlos dentro de la app ([guía 4.5.4](https://developer.apple.com/app-store/review/guidelines/#4.5.4)). Quien sigue algo puede pedirlo también; de los eventos que ya le llegaron por lo que sigue no se le repite ninguno.
- **Ciudad:** hoy no se guarda por persona (va en la dirección, `?ciudad=`). Se guarda la ciudad que la persona tenía en pantalla cuando dijo que sí, y se puede cambiar en Ajustes.
- **Variante por evento (no la recomiendo al principio):** avisar cuando la administración elige un destacado en la ciudad. Más oportuna, pero sin control de cuántos llegan.

**Cuándo pedir el permiso** (iOS muestra su ventana una sola vez; si la persona dice que no, solo se puede volver a encender desde Ajustes del iPhone):
- Nunca al abrir la app por primera vez.
- Primero una tarjeta propia de la app, y la ventana de iOS solo después de un «sí» ahí. Así ya funciona tras «Voy» y «Seguir».
- Para quien no sigue a nadie: la tarjeta sale al final del carril de Destacados en la segunda visita (o después de abrir 2 destacados): «¿Te avisamos cada jueves de lo destacado en San Luis?» con «Sí» y «Ahora no». «Ahora no» se respeta 30 días. Una cosa a la vez: si en esa visita ya salió otra pregunta, esta espera.

## 7. Crítica al pedido

- **«Que se enteren rápidamente» ya se cumple; falta cobertura y mesura.** Con un aviso inmediato por cada publicación, una carga de agenda de 40 eventos se vuelve 40 avisos y la persona apaga la app. En iOS basta deslizar el aviso y tocar «Desactivar». Lo rápido solo importa en cambios, cancelaciones y recordatorios. Para lo nuevo es mejor el resumen diario.
- **«Siguen o tienen interés»:** «Me interesa» se pensó como una marca suave. Mandarle cada novedad lo vuelve un «Voy». Propongo darle solo cambio y cancelación (lo que le hace falta saber) y decidir aparte si recibe recordatorio.
- **Los nuevos no deben recibir avisos sin pedirlos.** Destacados sirve como fuente, pero con permiso propio. Mandarlo «porque sí» choca con la guía de Apple y con el principio de UX invisible: el aviso que nadie pidió es ruido.
- **«Que generen interés» no se puede afirmar hoy:** no se mide si se tocan. Con 21 teléfonos, los porcentajes no dicen mucho todavía. Primero hay que medir, y comparar cuando haya cientos.
- **Destacados es una lista corta y a veces débil:** con la regla de Inicio puede entrar un evento con una sola vista de seis. Para un aviso hace falta una regla más alta y aceptar semanas sin aviso.
- **Lo que no se pidió y pesa más:** que avise lo que carga la propia administración. Hoy quien sigue un museo no se entera por el teléfono de lo que trae su agenda mensual.

**Cómo medir el interés sin identificar a nadie:**
- Cada aviso abre su dirección con `?desde=aviso&tipo=nuevo|resumen|cambio|recordatorio|destacados`. Al abrir, `medirCliente("aviso_abierto", { tipo })` va a Vercel Analytics sin cuenta ni identificador; el aviso de privacidad ya dice «acciones sin nombre».
- Del lado del servidor, solo conteos por tipo y por semana: entregadas, fallidas y apagados (de `avisos_push` a falso).
- **Tasa de apertura = abiertos ÷ entregados**, por tipo y por semana, en el panel de Administración. Nunca por persona.

## 8. Áreas de oportunidad (no pedidas)

1. **Avisar lo que cargan las rutinas**, dentro del resumen diario (§5). Es lo que más acerca al gancho.
2. **Cancelar antes de que pase con aviso a quienes van**: ya aprobado en el plan VII, falta el prototipo.
3. **Recordatorio a las 9:00 del día**: ya aprobado. Es una pieza chica.
4. **A quien publicó: «Tu evento entró a Destacados»** y «Ya van 5 a {evento}» (textos L44 del doc 28). Hace que publicar valga la pena.
5. **Informe mensual al lugar o al artista** («En octubre te siguieron 12 personas; 34 dijeron Voy»). Mejor por correo o en la app que por push.
6. **Un artista ligado después**: avisar a sus seguidores como «Nueva fecha de {artista}» cuando se liga a un evento que todavía no empieza.
7. **El aviso de Instagram y Facebook:** las publicaciones de @smsnstrsapp ya llevan el enlace a la ficha. Esa salida no sirve para avisos individuales (la API no manda mensajes en masa y seguir cuentas está en pausa). Su papel es atraer gente nueva, no avisar a la que ya está.
8. **Imagen en el aviso** (el cartel 4:5): con la extensión de servicio en iOS y `image` en Chrome y Android. Es lo que más se nota, pero pide una compilación nueva. Va al final.
9. **Limpieza:** borrar o marcar las direcciones web muertas, y no mandar dos veces al mismo iPhone (web y app).

## 9. Plan por fases

| Fase | Pieza | ¿Prototipo? | Tiempo del gestor | Riesgos |
|---|---|---|---|---|
| **0** | Correr las consultas de §4 y anotar la línea base: enviadas, fallidas, hora, eventos sin aviso, gente con web y app a la vez | No | 1 h | Ninguno: solo lectura |
| **1** | **Fiabilidad y medición:** `?desde=aviso&tipo=` y `aviso_abierto`; tiempo de vida hasta la hora límite; direcciones web 404/410 marcadas como muertas sin borrar a ciegas; contadores semanales en Administración; apagar el correo por evento salvo el de cambio (OL-138) | No (solo un renglón en el panel) | 1 día | Tocar `avisos_autorizar` y `avisos_expandir` en caliente: migración que solo añade y banco de pruebas |
| **2** | **Hora y forma:** silencio de 9 pm a 9 am, recordatorio a las 9:00, título = evento, subtítulo = razón, `thread-id`, resumen diario de lo nuevo | Sí: el aviso dibujado sobre la pantalla de bloqueo real | 1,5–2 días | El resumen cambia la cola: avisos «por persona y día» en vez de «por evento». Hay que probar la medianoche y la zona de cada ciudad |
| **3** | **Cobertura:** las cargas de las rutinas y los artistas ligados después entran al resumen diario. El tope de 3 por autor deja de cortar actos de un mismo festival (cuentan como uno) | No | 1 día | Sin la fase 2 sería inundar: no se hace antes |
| **4** | **Cancelar antes de que pase** con aviso a «Voy» y «Me interesa», y sin recordatorio | Sí (ya pedido) | 1,5 días | Que no se pueda deshacer después del aviso: el texto debe decirlo |
| **5** | **«Esta semana en {ciudad}»** con su interruptor, la tarjeta de permiso en Destacados y la ciudad guardada | Sí | 2–3 días | Guía 4.5.4 de Apple (permiso explícito). Semanas vacías. Guardar la ciudad es un dato nuevo de la persona: va al aviso de privacidad |
| **6** | Avisos a quien publica y a quien administra (L44) e informe mensual | Sí | 1,5 días | Mensajes que parezcan vigilancia: nunca decir quién |
| **7** | Imagen en el aviso (extensión iOS + `image`) | Sí | 2 días + revisión de Apple | Compilación nueva. La imagen pesa y depende de la cuota de Storage |

El boletín quincenal (OL-138) sigue su camino propio y puede salir entre las fases 2 y 5. Su regla de «sobresaliente» debería ser la misma que la de la fase 5.

## 10. Decisiones que necesita el founder

1. **Lo nuevo de lo que sigues: ¿un aviso por evento o un resumen diario?** Recomiendo el resumen: un aviso al día, a las 9 am o a la hora de publicar si es de día.
2. **¿Avisamos también lo que carga la administración (rutinas)?** Recomiendo que sí, pero solo dentro del resumen.
3. **«Me interesa»:** ¿recibe solo cambio y cancelación (lo que recomiendo) o también el recordatorio?
4. **«Esta semana en {ciudad}»:** ¿jueves 7 pm, 3 eventos, solo con permiso propio y sin mandar nada si no hay 3?
5. **Regla de «destacado» para avisos:** ¿elegido a mano o 2 señales o más (más alta que la de Inicio)?
6. **¿Guardamos la ciudad** de quien pide los destacados? Es un dato nuevo y va al aviso de privacidad.
7. **Título = nombre del evento y razón abajo:** ¿de acuerdo, para verlo en el prototipo?
8. **Duplicados en el iPhone (web + app):** ¿se manda solo a la app cuando la persona la tiene? Riesgo: Safari de la Mac usa el mismo servicio que la web del iPhone, así que hay que distinguirlos con cuidado.

## 11. Fuentes

**Código y base:** `supabase/migrations/20260918140000_avisos_fiables.sql` (cola, estados, caducidad, tope de 3, destinatarios, recordatorios), `20260925160000_dispositivos_apns.sql` (APNs en la expansión), `20260922150000_avisos_admin.sql`, `20261003150000_perfiles_privados.sql` (`activar_mis_avisos_push`), `20261020120000_eventos_procedencia.sql` (las cargas no avisan), `20261023160000_destacados_tope_12.sql` (`tira_destacados`), `20261006160000_eventos_clase.sql`; `src/lib/avisos.ts`, `avisosWorker.ts`, `push.ts`, `rutinas/publicarEvento.ts`, `redes/herramientas.ts`, `medir.ts`, `useAvisosTelefono.ts`, `avisosPreguntados.ts`, `intencionAvisos.ts`; `src/app/api/avisos-pendientes/route.ts`, `api/recordatorios/route.ts`, `eventos/acciones.ts`, `eventos/[id]/Asistencia.tsx`, `novedades/consultas.ts`; `src/components/ConsentimientoAvisos.tsx`; `public/sw.js`; `apps/ios/ios/App/App/MainViewController.swift` y `App.entitlements`; `vercel.json`.

**Bitácoras y documentos:** 09/113 (avisos fiables), 09/120 (activación, latido cada 5 min), 09/147, 09/173 y `docs/rediseno/28-avisos-y-boletin.md` (boletín y textos L43/L44, decidido el 23 sep), 09/242 y 09/249 (avisos nativos en iOS), 10/422 (cancelado solo en pasado), 10/449 (plan VII: hora de los avisos, cancelar antes, boletín), 10/497 (OL-465), 10/491 y 10/492 (destacados automáticos y tope de 12); `docs/ops/OPEN_LOOPS.md`.

**Documentación externa consultada:**
- Apple, *Sending notification requests to APNs* (un aviso guardado por app sin conexión, `apns-expiration`, `apns-collapse-id`, prioridad): https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns
- Apple, *Generating a remote notification* (`subtitle`, `thread-id`, `mutable-content`, `interruption-level`, `relevance-score`, límite de 4 KB): https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification
- Apple, *App Review Guidelines* 4.5.4 (avisos promocionales solo con permiso explícito y forma de apagarlos): https://developer.apple.com/app-store/review/guidelines/#4.5.4
- Foro de Apple, respuesta del equipo técnico sobre el aviso único guardado: https://developer.apple.com/forums/thread/775455
- MDN, `showNotification` (`image`, `tag`, `renotify`): https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
