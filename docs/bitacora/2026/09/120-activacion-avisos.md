# 120 - Activacion operativa de avisos

Fecha: 2026-09-19. OL-086. Rama: `codex/avisos-operacion`, base `eb2f80e`.
Reserva formal del gestor para registrar la activacion, separada de la
implementacion OL-079 y su bitacora 113. Esta bitacora referencia el commit
operativo `f6c78d2`; no renumera ni reescribe la 113.

## Autorizacion y ejecucion inicial

El founder autorizo activar `entregar`, instalar el cron y verificar un drenaje.
El preflight vio captura activa con su corte original, entrega apagada, dos jobs de
cambio activos y cero entregas o leases. Se guardo respaldo privado de la
configuracion y se instalaron `pg_cron` y `pg_net`; Vault recibio URL y secreto del
cron sin registrar valores.

Se creo el job `avisos-pendientes` cada cinco minutos, se activo entrega y se fijo
la frontera de recordatorios. Un drenaje manual autorizado devolvio HTTP 200, cero
envios/fallos/pendientes. La primera ejecucion programada tambien devolvio HTTP 200
sin timeout. No habia destinatario elegible: no se envio ni simulo correo o push,
y por ello no existe firma de recepcion del founder.

## Pausa reversible por frontera no demostrable

La revision del gestor señalo que el cron actual sobre el build nuevo no prueba que
deployments anteriores o sus `after` legados ya no puedan accederse. Sin acceso de
control de Vercel no fue posible acreditar esa frontera. Conforme al rollback de
113, se desactivo el job `id=1` mediante `cron.alter_job`, se restauro
`entregar=false` y `recordatorios_desde=NULL`, y se conservaron `capturar=true`,
el corte original, esquema y cola. Tras mas de 90 segundos: cero leases; la unica
ejecucion posterior visible fue la de las 00:10Z, iniciada antes de la pausa, HTTP
200 y sin entregas. No se borraron deployments, secretos, cola ni marcadores, y no
se reanimo el emisor legado.

El founder decidio que, cuando exista una frontera comprobable, el cron debe correr
solo en dos rondas, mañana y noche; no cada cinco minutos. El correo requiere
consentimiento explicito por canal (`avisos_correo`): seguir un lugar o marcar
`Voy` no lo habilita por si solo.

## Bloqueo para reactivar

Falta evidencia de que los deployments previos no ejecutan el emisor legado ni
admiten su ruta autenticada. Con ella, el gestor debe fijar las dos horas exactas
en San Luis Potosi, reactivar el job existente con ese horario, restablecer entrega
y una nueva frontera de recordatorios, y revisar una ejecucion completa. No se debe
reactivar antes ni usar los HTTP 200 anteriores como prueba de recepcion externa.

## Continuacion (2026-09-19): prueba de la frontera, horario y plan sin ejecutar

Se retomo la pieza en el mismo worktree/rama, traida a `origin/main` (merge
`e07245f`, sin push). Todo lo de abajo es lectura o preparacion; no se toco
`avisos_config`, el job ni Vercel.

**Como emite el camino legado.** El codigo previo a la envolvente (por ejemplo
`0a30598`, PR103) no tiene una ruta HTTP propia ni exige `CRON_SECRET`: la accion
del servidor `guardarEvento`/`actualizarEvento` llama `after(() => avisarNuevoEvento(...))`
o `avisarCambioEvento(...)` en `src/app/eventos/acciones.ts`, y esa funcion
(`src/lib/avisos.ts`) manda correo/push de inmediato con `clienteAdmin()`
(`SUPABASE_SERVICE_ROLE_KEY`), `enviarCorreo` (`RESEND_API_KEY`) y `enviarPush`
(llaves VAPID) leidos de `process.env` en ese deployment, sin ninguna bandera que
lo apague. Es decir: basta con que una persona use el formulario de un deployment
viejo todavia accesible, con las llaves reales de produccion en su entorno, para
que se manden avisos reales por el camino antiguo — no hace falta conocer una URL
ni un secreto de cron.

**Prueba externa reunida (solo lectura, sin Vercel).** Se listaron con
`gh api repos/robscan/somosnosotros/commits/<sha>/statuses` los deployments de
Vercel asociados a los ultimos commits de produccion (`eb2f80e`, `0a30598`,
`e6905e8`) y de PRs recientes (98 a 104); el estado combinado de GitHub solo
expone el enlace al panel de Vercel (requiere sesion), no la URL publica. Las
URLs publicas de vista previa por rama SI aparecen en los comentarios que el bot
de Vercel deja en cada PR (`gh pr view <n> --json comments`). Se probaron ocho de
esas URLs de vista previa (PRs 98-104, incluida la de `codex/cierre-pendientes`
que produjo `eb2f80e`) con `curl -I`: las ocho responden `302` hacia
`https://vercel.com/sso-api?...`, con `set-cookie` de `_vercel_sso_nonce` y
`x-robots-tag: noindex` — la proteccion estandar de Vercel (SSO) esta activa y
un visitante anonimo nunca llega al codigo de la app ni puede accionar el
formulario. Eso cubre las vistas previas de rama de esas piezas.

**Lo que la prueba NO cubre.** No se pudo obtener la URL publica del deployment
de *Production* en si (la distinta de cada promocion, por ejemplo el
`6iCc9mbpMXiBv3BMWZgpqiSik39s` mencionado en OPEN_LOOPS): GitHub no la expone y
el operador no tiene sesion de Vercel. La proteccion "Vercel Authentication" se
configura por entorno (Preview/Production) en el proyecto; que las vistas previas
esten protegidas no dice si Production tambien lo esta, ni si quedan deployments
de Production anteriores a `eb2f80e` con URL propia todavia alcanzable sin login.
Esa es la pieza que falta y que solo se resuelve con acceso al panel de Vercel.

**Accion pendiente del founder, paso a paso (el operador no la ejecuta):**
1. Entrar a vercel.com → proyecto `somosnosotros` → Settings → Deployment
   Protection, y confirmar que "Vercel Authentication" (o "Standard Protection")
   cubre tambien el entorno *Production*, no solo *Preview*. Si Production no
   esta protegido, activarlo ahi mismo cierra el hueco sin borrar nada.
2. Si se prefiere no proteger Production (por ejemplo porque rompe algun
   integrador), ir a Deployments, filtrar por *Production* y revisar si hay
   promociones anteriores a `eb2f80e` cuya URL individual siga "Ready"/accesible;
   Vercel permite eliminar deployments viejos desde ahi (esto SI es destructivo:
   solo el founder lo decide y lo ejecuta).
3. Guardar una captura o nota de cual de las dos opciones quedo activa, para que
   esta bitacora se pueda cerrar con evidencia y no con un supuesto.

**Horario propuesto para las dos rondas (San Luis Potosi = `America/Mexico_City`,
horario fijo UTC-6 todo el ano desde el fin del horario de verano en Mexico; sin
cambio de horario que mover).** Dos horas separadas por unas 12 horas, una de
manana que coincide con el cron diario de Vercel existente (asi ambos caminos
leen la cola ya con el dia empezado) y otra de noche antes de que la gente
duerma:

- **09:05 hora local → `5 15 * * *` en pg_cron (UTC).** Cinco minutos despues del
  cron de Vercel a `/api/recordatorios` (15:00 UTC = 09:00 local), para no pisar
  exactamente el mismo minuto; ambos son seguros de correr juntos porque usan los
  mismos leases/CAS (bit113), el margen es solo para leer logs por separado.
- **21:05 hora local → `5 3 * * *` en pg_cron (UTC, dia siguiente).** Cierra el
  dia sin caer de madrugada.

Motivo: cubre alta/cambio del dia (manana) y lo publicado por la tarde (noche)
sin acercarse a la cadencia de cinco minutos que el founder ya descarto. Quedan
sujetas a que el founder confirme o ajuste la hora exacta.

**Plan de reactivacion exacto (no ejecutado).** Requiere primero cerrar el punto
de la frontera arriba y que el founder confirme las dos horas:

1. Dos horas distintas necesitan dos entradas de pg_cron: reprogramar el job
   `avisos-pendientes` (`id=1`) existente a la ronda de manana con
   `select cron.alter_job(1, schedule := '5 15 * * *');` y crear un segundo job
   `avisos-pendientes-noche` con `cron.schedule(...)` igual al original en URL,
   headers y `timeout_milliseconds`, pero `'5 3 * * *'`. (Una sola expresion tipo
   `'5 15,3 * * *'` en un solo job serviria igual de bien si se prefiere un job
   unico en vez de dos — pg_cron si admite listas de horas separadas por coma;
   la eleccion entre un job con dos horas o dos jobs separados queda a criterio
   del gestor, ambas son validas.)
2. Antes de tocar `entregar`, leer en solo lectura los 4 `avisos_jobs` activos
   (ver abajo) y confirmar cuantos siguen dentro de su ventana de caducidad.
3. `update avisos_config set entregar=true, recordatorios_desde=clock_timestamp() where id;`
4. Reactivar ambos jobs de pg_cron (`cron.alter_job(..., active := true)`).
5. Esperar a la siguiente ronda programada (no forzar un drenaje manual fuera de
   horario) y revisar `cron.job_run_details` + `net._http_response` de esa
   ejecucion completa: HTTP 200, cuantos pendientes/enviados/fallidos/jobs sin
   expandir informa la respuesta, y en `avisos_enviados`/entregas si hubo alguna
   persona real elegible. Confirmar tambien que `/api/recordatorios` (Vercel,
   09:00 UTC-6) no duplique lo que ya movio la ronda de pg_cron de esa manana.
6. Recien con esa ejecucion limpia, informar al founder para que confirme
   recepcion real en su telefono/correo cuando exista un aviso natural elegible;
   los HTTP 200 no son esa prueba (ya lo dice la bitacora anterior).

**Rollback (igual al ya usado, sin cambios):** pausar ambos jobs de pg_cron con
`cron.alter_job(id, active := false)`, `entregar=false`, `recordatorios_desde=NULL`,
esperar 90 s y comprobar que no queden leases/proveedores en vuelo. Mantener
`capturar=true`, el corte y la cola; no regenerar cuerpos/claves ni reactivar el
emisor legado.

**Los 4 jobs en cola desde el 18 (leidos por el gestor, solo lectura).** El
operador no tiene sesion propia contra produccion en este worktree, asi que no
pudo inspeccionarlos el mismo; se apoya en la lectura que ya hizo el gestor el
19. Segun el contrato de outbox (bit113), cada job de alta/cambio caduca solo a
la mas temprana de: medianoche de la zona del evento, el inicio del evento, o
23 h desde que se creo/desde el primer intento — lo que llegue antes. Con esos
4 jobs abiertos desde el 18 y hoy 19, es probable que varios ya esten fuera de
su ventana de caducidad para cuando se reactive entrega: el propio
`avisos_preparar` los marcaria caducados sin mandar nada, sin que el operador
tenga que borrarlos ni tocarlos a mano. Propuesta: **no editar ni purgar esos 4
jobs**; dejar que el drenaje normal aplique su propia caducidad al reactivar, y
que el paso 2 del plan de arriba (lectura antes de `entregar=true`) sirva solo
para confirmar cuantos siguen vigentes y avisar al founder si alguno todavia
generaria un envio real, para que decida si lo quiere ver salir o prefiere
dejarlo caducar. No se propone regenerar cuerpos ni inventar una purga nueva:
esa lectura de confirmacion la debe hacer quien tenga sesion contra produccion
(el gestor), no este operador.

## Reactivación (2026-09-18, 19:02 hora local, gestión de cambios)

- **Autorización del founder:** confirmó que la protección de Vercel es la estándar (Standard Protection, que cubre también los despliegues antiguos de producción) y aceptó las dos horas, 09:05 y 21:05.
- **Cola leída antes de encender (solo lectura):** 4 avisos activos. El recordatorio del evento de las 20:00 de hoy caduca a las 02:00 UTC y no sale. Podían salir tres: dos «cambió el lugar» («Nos vamos con estilo» y «México, Mágico, Musical», editados desde la cuenta del founder) y el recordatorio de «Círculo de lectura» de mañana a las 10:00. A esos eventos solo van cuentas de administración; ninguna persona sin rol admin tiene canal activo. Se dejaron salir: sirven de prueba real de recepción.
- **Ejecutado en una transacción:** `cron.alter_job(1, schedule := '5 3,15 * * *')`, `update avisos_config set entregar = true, recordatorios_desde = clock_timestamp()` y `cron.alter_job(1, active := true)`. Resultado: `capturar = true`, `entregar = true`, `recordatorios_desde = 2026-09-19 01:02:15 UTC`, job activo con dos horas en un solo job.
- **Siguiente:** revisión de solo lectura de la primera ronda a las 21:15 (tarea programada). La prueba de recepción es que llegue a un teléfono o correo, no el HTTP 200.

## Cambio de cadencia (2026-09-18, 19:08 hora local)

- **Decisión del founder:** «cada 5». La tomó después de que el operador le explicara el techo de 40 entregas por invocación (hasta unas 480 por hora) y lo cortas que son las invocaciones. Sustituye a las dos rondas diarias (09:05 y 21:05) que había confirmado a las 19:00.
- **Ejecutado:** `cron.alter_job(1, schedule := '*/5 * * * *')`. El job sigue activo; `entregar` y `recordatorios_desde` no cambian.
- **Revisión:** tarea programada de solo lectura a las 19:22, sobre las rondas de las 19:10, 19:15 y 19:20.

