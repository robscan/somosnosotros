# 113 - Avisos fiables (OL-079)

Fecha: 2026-09-18. Rama: `codex/avisos-fiables`, base `68d6cbe`.
Reserva expresa del gestor: 113 / OL-079 / `20260918140000_avisos_fiables.sql`.
El comprobador de reservas ya ve 116; se conserva la reserva 113. No se edita OPEN_LOOPS.
Solo codigo y banco local. Sin produccion, entregas reales, push Git, merge ni cron instalado.

## Contrato implementado

- `guardar_evento_con_avisos(uuid,jsonb,jsonb,jsonb,timestamptz,uuid)` es una envolvente SECURITY INVOKER de `guardar_evento_completo`, con sus mismos argumentos y respuesta. Activa `app.avisos_outbox=on` exclusivamente en la transaccion y restaura el valor previo. No acepta actor, destinatario, cuota ni una bandera de encolado del cliente. Mantiene RLS, version esperada, cerrojo/idempotencia de operacion y artistas de la RPC interior.
- Las acciones llaman solo a la envolvente. `after` intenta drenar la cola ya confirmada; nunca crea ni envia avisos por el camino legado. Si muere `after`, sobreviven jobs y cursores. Se conserva la lectura de cupo y sus acciones, sin duplicarlas. `sitio_direccion` y `sitio_pin_pendiente` se incorporan a las claves de entrada para integracion con Terra.
- Triggers de eventos y sitio privado crean/coalescen un job por evento/transaccion; fecha + sitio resulta en `ambos`. Todo revierte con un fallo posterior de artistas. El worker ve la version final despues del commit. Reintentar la operacion no crea otro job.
- Cambiar, reparar, retirar o mover un sitio privado actualiza la revision del padre (tambien el padre anterior si cambia la FK). Una revision es estrictamente creciente, incluso en una transaccion larga. No se toca la migracion atomica original ni su algoritmo FOR UPDATE.
- Cuota conservadora de tres anuncios nuevos por autor en 24 h, con cerrojo SQL por autor. El origen sobrevive a borrar el evento. Las altas posteriores se guardan pero su anuncio queda `suprimido`. El backfill de altas de las ultimas 24 h cuenta para cuota, sin crear avisos. READ COMMITTED obligatorio para altas opt-in; aislamientos de snapshot fijo fallan cerrados.
- Escrituras con UID nulo nunca producen anuncios de alta/cambio. Decision posterior del gestor: los recordatorios SI incluyen eventos futuros importados/preexistentes con un `Voy` vigente; procedencia y antiguedad de creacion no sustituyen esa intencion. Los pasados no entran. Se conserva el marcador legado de recordatorio ya entregado.
- Fanout SQL con cursor UUID durable, bloques de 100 personas, sin limite REST/5000. Cambios crean una Novedad por job/persona, incluso sin consentimiento de canales. No se elimina historia anterior al editar. Los destinatarios se calculan desde artistas/lugar finales o `Voy`, excluyendo actor y autor del evento.
- Correo y cada endpoint push tienen filas/resultados independientes. Cuatro slots SQL globales, claims con SKIP LOCKED, lease de 90 s y token CAS para preparar/confirmar. No se sostiene una transaccion SQL mientras hay HTTP. Un token vencido no confirma la entrega recuperada por otro worker.
- Antes de cada HTTP se revalida consentimiento, pertenencia al publico, visibilidad, snapshot vigente, endpoint/cuenta, lease y caducidad. En correo se consulta Auth en cada intento: error, ausencia o correo sin confirmar no es entrega. Si cambia el correo, se descarta el cuerpo viejo.
- Snapshot por lista de campos publicos: titulo, fecha/zona y nombre de sitio. `sitio_direccion` se lee con `to_jsonb(e)` para compatibilidad con 181600 y solo si NO es reservado. No se consulta sitio privado para el payload, ni se incluyen pins o indicaciones. Un cambio de direccion publica tambien altera el snapshot del recheck. El tipo TS admite el campo opcional; Terra conserva la presentacion.
- Cuerpo de correo serializado y persistido ANTES de HTTP; todos los retries usan exactamente esos bytes y clave `aviso/<entrega UUID>`. Las fechas relativas se fijan al materializar, no al crear el job, y caducan a medianoche de la zona. Tambien caducan al iniciar el evento, a las 23 h del job de alta/cambio o del primer intento, lo que corresponda antes.
- HTTP de ambos canales abortable hasta 8 s, sin redirects. `web-push` cifra/firma; `fetch` impone plazo total (el timeout propio de la libreria es solo inactividad del socket). RPC/Auth tienen plazo hasta 5 s. Deadline compartido por toda la invocacion (cron 40 s, after 5 s): cada paso recibe solo el tiempo restante, con 1 s reservado para ACK y otro para informe. Auth usa fetch abortable por consulta, sin mutar el cliente compartido. Un proveedor tardio se aborta antes de agotar la reserva; si no llega el ACK, recupera el lease. Hasta 40 claims y diez bloques de fanout por invocacion; cuatro promesas de entrega, nunca cientos. No se retorna mientras otro loop sigue enviando.
- Retry exponencial de 60 s hasta una hora, maximo ocho intentos; 429/408/5xx/red reintentables, otros 4xx permanentes. Jobs/entregas vencidos dejan estado auditable. El informe devuelve pendientes/fallidas/caducadas/jobs sin expandir; errores de ruta devuelven 503 sin secretos.
- Recordatorio invalidado por cambio real puede reemplazarse para canales/endpoints aun sin intento. No se reinicia un canal aceptado o con resultado incierto bajo una clave distinta. El aviso de cambio es independiente. Titulo cambiado sin cambio de fecha/sitio no genera otro aviso; el recheck descarta contenido viejo.

## Corte de despliegue (requiere aprobacion)

La migracion no instala HTTP, extensiones, tareas ni activa entrega. `avisos_config` nace con `capturar=false`, `entregar=false`, `corte=NULL`, `recordatorios_desde=NULL`. RLS sin politicas y ACL cierran todas las tablas/RPC de cola a anon/authenticated, incluido admin de la app. Solo el operador SQL cambia config; el servicio puede leerla. Las funciones tienen path vacio. El cliente solo tiene EXECUTE de la envolvente invoker, no de los triggers/encolador.

1. Revisar e integrar en orden: CAPO 181200, Security 181300, outbox 181400, Storage 181500, direccion 181600. Aplicar migraciones con entrega apagada; comprobar config y ACL. NO hacer backfill de anuncios/cambios desde eventos preexistentes.
2. Preparar build nuevo con la envolvente y sin emisores legados. Antes de promoverlo, un operador autorizado fija la frontera de captura. Esto no habilita proveedores:

```sql
update public.avisos_config
set capturar=true, corte=clock_timestamp(), entregar=false,
    recordatorios_desde=null
where id;
```

3. Promover el build. Cada escritura vieja directa sigue solo su `after` legado; no genera job. Cada escritura nueva por envolvente genera solo outbox. Si captura/corte no estan listos, los nuevos guardados con cambios notificables fallan completos (`55000`), sin publicar un evento silenciosamente sin job. Una operacion ya confirmada puede devolver su resultado idempotente aun estando captura pausada.
4. Validar el contrato nuevo en entorno autorizado: mismo evento/privado/artistas/job, no privados en contenido, cuota, resultados del drenaje. Hasta aprobar entrega no hay HTTP, aunque un drenaje puede materializar filas y Novedades. Habilitar proveedores requiere otra decision explicita (`entregar=true`). No mantener captura sin entrega mas alla de la caducidad esperando luego enviar avisos antiguos.
5. Recordatorios tienen un corte separado: retirar/deshabilitar ejecuciones del cron viejo y sus URLs de deployment, esperar a que terminen sus ejecuciones/after pendientes, verificar `avisos_enviados`, y solo entonces fijar `recordatorios_desde=clock_timestamp()`. El nuevo endpoint no deduplica un envio legado todavia en vuelo cuyo marcador no se haya escrito. Por eso esta espera es requisito, no una garantia de exactamente una entrega.
6. Instalar Cron/Vault HTTP cada cinco minutos solo tras aprobacion (ejemplo siguiente). El cron Vercel diario puede seguir para indicadores y drena la misma cola con los mismos leases; por si solo no garantiza recuperacion a tiempo. Revisar backlog/capacidad antes de dar por cerrado el rollout.

No hay intervalo de escritura nueva sin captura: la envolvente falla cerrada. No hay doble camino para la misma escritura normal vieja/nueva. Una app vieja puede seguir enviando con sus fallos preexistentes: `after` volatil, cuota fuera de transaccion y marcador global. Esta migracion no puede reescribir el binario desplegado ni recuperar esos fallos. Evitar mantener deployments viejos accesibles tras terminar la transicion.

### Rollback

- Primero pausar el cron HTTP y poner `entregar=false`, `recordatorios_desde=NULL`. Esperar al menos 90 s y verificar que no queden proveedores/leases en vuelo. Un HTTP ya aceptado no se puede retirar.
- Si vuelve la app vieja: mantener esquema y cola, no deshacer tablas/migraciones. Las escrituras viejas no encolan; la nueva residual puede seguir capturando sin entregar. Si tambien se pone `capturar=false`, los guardados nuevos notificables fallaran completos; hacerlo solo al retirar ese deployment.
- Antes de volver a activar, inspeccionar/descartar jobs del intervalo segun corte y caducidad. No cambiar claves/cuerpos de entregas intentadas ni regenerarlas para esquivar la ventana del proveedor. No convertir todos los eventos del intervalo en anuncios nuevos.
- No reactivar recordatorios legados ciegamente tras haber enviado desde outbox: el camino viejo no entiende las entregas nuevas. Se necesita una frontera coordinada o conciliacion explicita de marcadores; si no, mantener recordatorios pausados durante rollback.

## Instalacion propuesta de Cron (NO ejecutada)

Supabase documenta Cron + pg_net para HTTP y recomienda guardar credenciales en Vault. No requiere mover el worker a Edge Functions: el destino es el mismo servidor Next. Ver [programacion con Vault](https://supabase.com/docs/guides/functions/schedule-functions), [Cron](https://supabase.com/docs/guides/cron) y [API pg_net](https://github.com/supabase/pg_net).

El operador habilita `pg_cron`, `pg_net` y Vault conforme a las instrucciones oficiales; crea en Vault `avisos_url` (URL exacta del servidor estable, terminada en `/api/avisos-pendientes`) y `avisos_cron_secret` (mismo valor de CRON_SECRET en Vercel). Nunca incluir valores en git, comandos compartidos o bitacoras. Revisar jobs existentes para actualizar en lugar de duplicar.

Ejemplo pendiente de autorizacion, SOLO despues del corte:

```sql
select cron.schedule('avisos-pendientes', '*/5 * * * *', $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='avisos_url'),
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name='avisos_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$cron$);
```

Revisar tanto `cron.job_run_details` como estado HTTP en `net._http_response`: completar la sentencia SQL no demuestra un HTTP 200. Esta respuesta tampoco demuestra entrega final al buzon/telefono. La cola durable esta en las tablas de avisos, no en pg_net. Verificar que URL estable no redirija ni este bloqueada por proteccion de deployment; un 401/503 persistente debe alertar al operador. No registrar headers/Vault.

## Garantias y limites residuales

- Resend retiene claves durante 24 h y rechaza reutilizarlas con payload distinto. Aqui la ventana se acorta a 23 h y el cuerpo queda inmutable; 409 concurrente reintenta, conflicto de cuerpo es terminal. `enviada` significa aceptada por proveedor, no recibida/leida. Fuente primaria: [Resend Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
- Push NO es exactly-once: si se pierde el ACK despues de aceptar, un retry puede mostrar otro aviso. El SW usa tag del job y `renotify=false`, solo reemplazo visual mientras exista; no deduplicacion persistente. Un push ya aceptado puede llegar despues de un cambio/revocacion (TTL acotado). Ningun recheck hace atomico un proveedor externo con Postgres.
- CAS cerca confirmaciones y cuatro slots acotan los envios normales concurrentes. Pausas arbitrarias del proceso/red entre la ultima autorizacion y HTTP no admiten fencing del proveedor push. Timeouts y margen del lease reducen esa ventana, no demuestran exactamente una entrega.
- Si el evento/correo cambia tras un intento, se descarta el cuerpo anterior para no reutilizar la clave con contenido distinto. Un recordatorio de reemplazo no repite canales con intento previo, aunque aquel fallara o quedara incierto; los cambios se notifican por su job propio. Los marcadores legados globales no permiten recuperar historicamente fallos parciales por canal.
- Consentimiento, seguidores y `Voy` son revisados durante fanout y antes de enviar; no hay snapshot de toda la audiencia al instante del guardado. Nuevos seguidores/endpoints agregados despues de pasar el cursor pueden quedar fuera de ese job. Un recordatorio ya expandido no reincorpora personas que marquen Voy despues; esto tambien ocurria tras el envio diario legado.
- Capacidad deliberadamente finita: maximo 40 entregas por invocacion (hasta 480/h con solo un cron de cinco minutos; menos si proveedor lento). No prometer vaciar cualquier audiencia antes de su fecha. Monitorizar la edad/cantidad pendiente y aprobar frecuencia/capacidad adicional si el volumen la requiere. Las Novedades sobreviven a caducidad del aviso externo y se expanden aunque el job de cambio sea obsoleto.
- Tombstone de evento borrado registrado en origen (altas posteriores o backfill de 24 h): reusar su UUID de operacion provoca `23505` y revierte la recreacion/job. No recrea silenciosamente ni consume otra cuota. No reconstruye tombstones de eventos eliminados antes de instalarlo. La accion muestra error generico y necesita una nueva operacion intencional; no se cambia el formulario en esta pieza.
- La fila de origen se conserva para cuota/tombstone y la cola conserva diagnostico. `origen.autor` y `jobs.actor` referencian perfiles con ON DELETE SET NULL: borrar cuenta retira la identidad, no el UUID del evento/job. Las entregas referencian perfiles con ON DELETE CASCADE y se eliminan con sus cuerpos. El cuerpo contiene email y enlace de baja: acceso exclusivamente de servicio. Retencion adicional requiere politica del gestor; no se instala una purga compleja que rompa idempotencia o borre historia.
- Endpoints 404/410 quedan fallidos en esa entrega, no se borran automaticamente para no eliminar una suscripcion renovada concurrentemente. Depuracion de endpoints/retencion queda pendiente separado, sin UI nueva.
- Actualizaciones privadas directas pueden invertir el orden de locks frente a la RPC padre-primero: PostgreSQL resuelve un deadlock abortando una transaccion. No hay escritura parcial; el caller debe reintentar con version vigente.
- SKIP LOCKED se usa para filas de trabajo, no para afirmar una vista consistente general. Fuente: [PostgreSQL SELECT](https://www.postgresql.org/docs/current/sql-select.html).

## Evidencia local

- Dependencias locales: `npm ci --ignore-scripts --no-audit --no-fund`. Sin instalacion global. Node 22.6 emite warning de engine de eslint-visitor-keys; lint termina con cero errores y un warning preexistente en `docs/diseno/logotipo/iconos-sn.mjs:57`.
- `npm run typecheck` PASS; `npm test -- --run`: 548 pruebas / 53 archivos PASS antes del ultimo test de SW.
- `npm run build` PASS, sin credenciales de Supabase/Resend/VAPID/Mapbox y con telemetria desactivada. No hubo entregas ni red de produccion. No cambios visuales de formulario ni redisenos; SW probado como logica, no se afirma QA de push real/iPhone.
- Banco base: 38 migraciones; 245 checks PASS antes de ampliar los casos de recordatorio preexistente/importado y tombstone.
- Integracion en memoria, sin merge ni copiar archivos ajenos: migraciones/tests de `82a5d1a` (Security/CAPO/Storage) mas archivos locales, mismo `scripts/test-db.mjs` con su lock/roles/base efimera/cleanup: 41 migraciones / 590 checks PASS. No se arranca/apaga el servidor 55439.
- Se cubren rollback con fallo final, invisibilidad precommit, reintentos, privados y stale version, coalescencia, cuota concurrente/borrado, anon/ajeno/admin sin acceso a cola, paginacion de 1007 personas, 12 workers y 4 leases, token viejo, cuerpo estable/ACK perdido, consentimientos/endpoints revocados, Auth fallido, SSRF/redirect/timeout, resultados parciales, caducidad y convivencia de despliegues.
- El test local de snapshot agrega temporalmente la columna si falta y revierte ese DDL. Ademas se probo despues 181600 real en memoria (ver cierre); el helper `nombreSitio`/formulario de Terra y la integracion de ramas siguen a cargo del gestor, sin mezclar archivos de su propiedad.

### Cierre de QA

- Ultima bateria completa: 555 unitarias / 54 archivos PASS; typecheck y build PASS. Lint: cero errores, solo el warning preexistente mencionado. `git diff --check` limpio.
- Banco base con FK y borrado de cuenta: 38 migraciones / 257 checks PASS.
- Integracion en memoria con FK y borrado de cuenta: 41 migraciones / 597 checks PASS (Security/CAPO/Storage de `82a5d1a` mas outbox).
- Deadline: reloj que avanza, Auth lento sin HTTP, limites decrecientes por RPC, cancelacion de proveedor por presupuesto, fanout al segundo 39 sin claims, after de 5 s capaz de entregar. SW: mismo tag por retry, distinto por job, compatible con payload legado.
- QA adicional con catalogo y tests de `08e8dde` mas outbox local, incluyendo la migracion 181600 REAL: **42 migraciones / 627 checks PASS**, todo en memoria con el mismo runner/lock/cleanup. Guardado/cupo tras agregar ambas claves: 22 unitarias PASS. El fixture de direccion publica incluye pin para cumplir sus constraints.
- El gestor integra las ramas y el frontend de Terra; se le entregan ambas claves de formulario. Pendiente aprobacion explicita de produccion/captura/entrega/cron y prueba real autorizada de proveedor/iPhone. Nada publicado ni activado en esta sesion.

## Checkpoint de correccion de anuncio inicial (2026-09-18)

Continuacion OL-079 autorizada por gestion, en `codex/avisos-correcciones`,
worktree propio desde `4eee240`. Las migraciones pendientes no estan en prod;
se modifica solo 181400, sin numero nuevo ni cambios en 181100/181600.

Reproduccion propia con el runner y PostgreSQL compartido 127.0.0.1:55439:
alta con seguidor sin Voy, expansion y correccion de sitio_direccion dejan cero
anuncios iniciales vigentes. El control antes de expansion conserva su anuncio.
Antes de corregir: 42 migraciones / 631 checks, un fallo esperado en el caso
posterior a expansion. Despues del cambio preliminar: 42 migraciones / 633 checks,
cero fallos. Cada ejecucion usa los locks, base efimera y cleanup del runner;
no se arranca ni se apaga el servicio y no se contactan proveedores.

Implementacion preliminar: reemplazar solo alta vigente materializada, conservar
actor y limite de caducidad original, excluir correo/endpoint con primer intento
o entrega aceptada en anuncios anteriores. `avisos_preparar` toma un lock del job
y rechaza snapshots/estados obsoletos antes de persistir el cuerpo. La alta aun
sin materializar conserva su job y refresca revision/caducidad.

**Checkpoint, NO entrega final:** faltan pruebas especificas de expansion parcial,
leases y carreras de preparar/editar en ambas direcciones, cambios repetidos,
reservado/borrado, cuota suprimida y recordatorios independientes; comprobar
idempotencia correo/push y ejecutar unitarias focalizadas/suite/typecheck/lint/build.
Revisar corte/rollback y limites con esos resultados antes de entrega al gestor.
Los limites externos anteriores siguen vigentes: no se promete exactly-once.
El gestor solicita continuar con Terra; no se reinicia investigacion ni se publica.

## Correccion final del anuncio inicial tras editar direccion (OL-079)

El caso confirmado era una alta ya expandida sin entrega iniciada: al corregir la
direccion, el job de alta quedaba obsoleto y el aviso de cambio solo consultaba
`Voy`. Los seguidores elegibles perdian el anuncio inicial aunque la nueva
direccion fuera la version que debian recibir.

181400 conserva una alta pendiente sin contenido y actualiza su revision. Si la
alta ya se materializo, crea un reemplazo de tipo `nuevo_evento`, con la audiencia
inicial actual, el actor y la caducidad ya autorizados; no consume cuota ni extiende
la ventana. Los reemplazos excluyen por correo y endpoint solo entregas de otra
alta del mismo evento cuyo primer intento ya quedo registrado o fue aceptado. Las
entregas que no comenzaron vuelven a la cola con el snapshot actual. Cambios
repetidos antes de materializar coalescen en el mismo reemplazo; despues vuelven a
reemplazar solo lo que siga vigente.

`avisos_preparar` toma un cerrojo compartido del job y vuelve a comprobar estado,
caducidad y snapshot antes de guardar el cuerpo. La correccion toma el cerrojo de
la alta: si preparar llega primero, queda un intento incierto y no se duplica; si
la correccion llega primero, el claim viejo no se autoriza antes de HTTP. Ese
cerrojo no hace atomico a un proveedor externo: una pausa entre la ultima
autorizacion y HTTP sigue siendo incierta y se trata conservadoramente.

Se hallo ademas que `timestamptz` se convertia a JSON segun `TimeZone` de cada
sesion, por lo que un worker en otra conexion podia descartar un snapshot identico.
`avisos_evento_publico` fija inicio/fin como UTC canonico antes de comparar o
persistir el contenido. No modifica la zona local del evento, que se conserva para
el texto de aviso.

Cobertura PostgreSQL nueva: correccion antes y despues de expansion, bloque parcial
de 100 de 101 seguidores, correcciones repetidas, correo aceptado, claim/preparar
con dos conexiones y lock real, sitio reservado sin direccion privada, alta
suprimida por cuota, recordatorio reemplazado independiente y evento borrado. La
suite tambien conserva leases, concurrencia de cuatro slots, cambios de
consentimiento, cuotas, recordatorios e idempotencia originales. Resultado:
42 migraciones y 648 comprobaciones correctas en PostgreSQL local con lock,
base efimera y limpieza. No se arranco/paro el servicio compartido ni hubo red
de proveedores.

Worker: 18 pruebas focalizadas correctas, incluida perdida de ACK para correo y
push; cada reintento conserva los mismos bytes y la clave/tag del job. Suite:
658 pruebas en 61 archivos correctas. Typecheck y build correctos. Lint sin errores
con el warning heredado de `docs/diseno/logotipo/iconos-sn.mjs:57`.

Se revisaron corte y rollback: no cambian. La captura/entrega sigue apagada por
defecto, no se instala cron ni HTTP, y un rollback no debe regenerar cuerpos ni
reabrir canales con intento previo. La migracion aun no esta aplicada en produccion;
no hubo push, deploy, SQL remoto, secretos ni envios reales. La garantia continua
siendo entrega al proveedor como maximo una vez cuando hay ACK; despues de un ACK
perdido o una pausa en el limite externo solo se evita reabrir ese canal, sin
prometer exactly-once externo.

## Esquema y codigo publicados, entregas retenidas (2026-09-18)

PR104/eb2f80e desplegado en somosnosotros.org despues de aplicar181400 y181600.
El gestor habilito capturar=true y corte2026-09-18T23:04:19.708Z antes del nuevo
build. Entregar=false, recordatorios_desde=NULL; sin pg_cron/pg_net nuevos, sin
Vault nuevo, sin envios de prueba ni reenvio historico. Se comprobo ACL de cola,
config y worker contra anon/authenticated y POST no autenticado responde401.

La activacion de proveedores y recuperacion cada cinco minutos sigue pendiente
de respuesta expresa del founder. Se reitero la pregunta al quedar produccion
lista; no interpretar su aprobacion del despliegue como esta respuesta. Al corte
posterior se observo1 job/0 entregas. No mantener esta retencion como promesa de
recuperar anuncios caducados: al activar se respeta caducidad y la frontera de
recordatorios del procedimiento anterior. Pendientes el corte del cron legado,
prueba real autorizada y verificacion de capacidad. Codigo publicado no equivale
a avisos operativos ni a exactly-once externo.

## Activacion operativa autorizada (2026-09-19)

El founder autorizo activar entrega, instalar el cron y comprobar el primer
drenaje. Se trabajo desde `eb2f80e`, sin modificar codigo de aplicacion ni otras
entregas. El cron diario existente de Vercel ya apunta a `/api/recordatorios` del
build nuevo y al mismo worker outbox, por lo que no habia un emisor legado paralelo
que apagar. Antes de la frontera no habia leases ni entregas pendientes; los
marcadores historicos se conservan y el nuevo recordatorio los sigue respetando.

Snapshot previo redactado: `capturar=true`, `entregar=false`, corte
`2026-09-18T23:04:19.708187Z`, `recordatorios_desde=NULL`, dos jobs de cambio
activos y cero entregas/leases. Se guardo respaldo privado de `avisos_config` en
`/Users/apple-1/Backups/somosnosotros/avisos-operacion-2026-09-18/antes-entrega-config.dump`.
El respaldo pre-fase1 permanece como antecedente; ninguno contiene bytes de
Storage ni se usa para borrar/recrear la cola.

Se instalaron `pg_cron` y `pg_net`; Vault contiene solo los nombres
`avisos_url` y `avisos_cron_secret`, sin valores en repositorio, salida ni
bitacora. Se creo/actualizo el unico job `avisos-pendientes` (`id=1`, cada cinco
minutos), que hace POST al endpoint estable con la credencial desde Vault. Se
conservo el corte de captura original y se activo `entregar=true` con frontera de
recordatorios `2026-09-19T00:02:24.439213Z`.

La primera ejecucion manual autorizada de `/api/avisos-pendientes` devolvio 200:
0 envios, 0 fallos, 0 pendientes y 0 jobs por expandir. La primera ejecucion
programada termino correctamente a las `00:05:00Z`; `net._http_response` registro
HTTP 200 sin timeout. El estado posterior conserva dos jobs de cambio y dos de
recordatorio activos, pero cero entregas, leases o fallos: no habia una persona
elegible y por tanto no se invento un evento, destinatario ni prueba de proveedor.
No hay confirmacion de recepcion en correo/telefono hasta que exista un aviso
natural elegible.

Rollback si aparece 401/503 persistente o riesgo de duplicacion: pausar el job
`avisos-pendientes`, poner `entregar=false` y `recordatorios_desde=NULL`, esperar
90 segundos y comprobar leases/proveedores en vuelo. Mantener `capturar=true`, el
corte, esquema y cola; no regenerar cuerpos/claves, vaciar datos ni reactivar el
emisor legado. Un proveedor que ya acepto un HTTP no puede retirarse.
