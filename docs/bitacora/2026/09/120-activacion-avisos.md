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
