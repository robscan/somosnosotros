# 106 - Revision push: cupo y estado real del telefono

Fecha: 2026-09-18. OL-073 existente. Rama: `codex/push-revision`.
Base: `4ac044b`, sobre el trabajo revisado en la bitacora 104.

## Encargo y limites

El gestor autorizo implementar los hallazgos P1 y P2 de la revision
independiente en el worktree ya creado `somosnosotros-push-revision` y reservo
esta bitacora. El script de numeracion encontro 105 como ultima bitacora.
No se edito OPEN_LOOPS, ni las piezas de cuota de lecturas o indicadores.
Integracion posterior a cargo del gestor en `cierre-pendientes`.

## P1 - Endpoint inmutable

La migracion pendiente `20260918100000_push_validado.sql` ahora rechaza cambiar
`endpoint` en UPDATE, tambien para servicio. Renovar las llaves del mismo
endpoint sigue permitido con diez dispositivos. Para reemplazar un endpoint
se usa baja y alta; se conservan RLS, propietario y bloqueo de altas por cuenta.

La regresion enfrenta UPDATE de endpoint con renovacion en otra conexion y
exige rechazo 42501, renovacion aceptada y diez filas al final. Se mantiene la
prueba de catorce altas simultaneas, de las que solo diez pueden registrarse.

Control negativo: el runner leyo la migracion sin esa guarda mediante una
sustitucion exclusivamente en memoria. UPDATE y renovacion fueron aceptados,
el conteo dejo de ser diez y el banco salio con codigo 1. Los archivos no se
alteraron para esta comprobacion. Esto reprodujo la carrera reportada.

## P2 - Registro, cuenta y consentimiento

La accion de lectura `suscripcionPushActiva` autentica la sesion y consulta
endpoint propio y consentimiento activo en un solo JOIN de PostgREST con RLS.
No usa llave de servicio ni escribe datos. Entrada invalida, falta de sesion,
endpoint ajeno o ausente, consentimiento apagado y errores devuelven false.

`estadoPush` solo devuelve encendido con permiso del navegador concedido y
confirmacion del servidor. Un fallo conserva apagado y permite reintentar
usando la suscripcion existente. La compatibilidad previa a pedir permiso se
consulta sincronicamente, para no intercalar red entre el toque y el permiso.

El observador usado por el hook y la tarjeta relee al cambiar la sesion,
recuperar conexion o volver a la app. Invalida respuestas anteriores, tambien
tras una baja o al desmontar. Fijar encendido despues de un alta vuelve a
consultar la cuenta actual. Se respeta el cierre previo de la tarjeta.

El alta comprueba que UPDATE de preferencias devolvio el perfil actualizado;
cero filas no es exito. Los errores de servidor y de transporte conservan los
estados de fallo/reintento de Ajustes y de la tarjeta de activacion.
Registro y preferencias siguen siendo dos escrituras: no se agrego RPC atomico.
No se agrego gestion visual de dispositivos ni liberacion automatica de cupo.

## Verificacion local

- Instalacion local con `npm ci --ignore-scripts`, sin cambios al lockfile ni
  instalaciones globales.
- Suite Vitest: 461 pruebas aprobadas; las 37 de acciones y cliente push
  cubren estado, consentimiento, cuenta distinta, errores y respuestas tardias.
- PostgreSQL 17 local compartido, puerto 55439: 34 migraciones y 58
  comprobaciones aprobadas, mas el control negativo descrito arriba.
  Se aviso antes de usarlo y el runner uso su bloqueo y bases temporales propias.
  No se arranco ni apago el servicio.
- Typecheck y build aprobados. Build con configuracion Supabase vacia y
  telemetria de Next desactivada, sin acceso a produccion.
- Lint sin errores; conserva el warning previo de `k` sin uso en
  `docs/diseno/logotipo/iconos-sn.mjs`.
- No se cambio JSX visual, estilos ni textos; no se hizo rediseno ni captura
  de pantalla. La comprobacion del permiso real en iPhone sigue pendiente.

## Integracion

Se modifica una migracion todavia pendiente: no reaplicar sobre una base que
ya tenga registrada su version. El gestor debe conciliar primero las
migraciones pendientes del 17 de septiembre y desplegar SQL y emisor validado
como un lote. NOT VALID sigue conservando filas antiguas.

Commit local por archivos explicitos. Sin push, PR, merge, avisos reales,
consultas a produccion ni cambios de servicios o credenciales.
