# 104 - Registro y envio push validados

Fecha: 2026-09-18. OL-073. Rama: `codex/push-seguro`.
Depende de `codex/base-verificacion` (95e5ba2), integrada solo en esta rama.
Main y los worktrees originales de Claude permanecen intactos.

## Alcance

- Validar proveedor HTTPS, formato y longitud de endpoint y llaves antes de
  registrar y antes de enviar; no se registran endpoints en los errores.
- Misma restriccion en SQL para cubrir escrituras directas a la API.
- Cupo de diez dispositivos por cuenta en SQL con bloqueo por cuenta y prueba
  concurrente. Renovar un dispositivo ya existente no consume otro sitio.
- No transferir suscripciones entre cuentas. Verificar propietario antes de
  consultar el cupo. Altas requieren READ COMMITTED (el modo de PostgREST).
- Cinco envios simultaneos por llamada y diez segundos de timeout de socket.
  Esto no es una garantia de tiempo total para todo el lote; la cola de avisos
  e idempotencia siguen siendo otra pieza del plan.
- No devolver exito si falla el guardado de preferencias. El registro y esas
  preferencias aun son dos operaciones; un fallo permite reintentar el alta.

## Migracion y publicacion pendiente

`20260918100000_push_validado.sql` esta reservada DESPUES de las migraciones
pendientes del 17: cupo de lecturas e indicadores historicos. No aplicar en
produccion antes de conciliar esas ramas y confirmar el orden del historial
remoto. La prueba actual aplica main + esta pieza, no aquellas ramas pendientes.

Los constraints son NOT VALID para conservar filas previas; validan toda nueva
escritura. El emisor filtra las filas previas no validas. No se borran filas ni se
desactivan preferencias mediante la migracion. DB y emisor deben desplegarse como
un mismo lote: la migracion por si sola no protege al emisor viejo de filas viejas.
Antes de desplegar: revisar cantidades y proveedores existentes sin exponer los
endpoints, respaldar el estado remoto y revisar de forma independiente.

No se han enviado avisos reales ni se han consultado suscripciones de produccion.
La compatibilidad de proveedor se comprobo con formatos de ejemplo, no con altas
reales en cada navegador. La prueba del iPhone sigue pendiente.

## Evidencia local

- 430 pruebas Vitest aprobadas (incluidas guardas del banco, validador, emisor
  simulado y accion del servidor).
- PostgreSQL 17: 34 migraciones y 51 comprobaciones aprobadas. Incluye 14 altas
  concurrentes con diez aceptadas y cuatro rechazadas, renovacion con cupo lleno,
  aislamiento de cuentas y rechazo de snapshots fijos para evitar conteos viejos.
- Build y typecheck aprobados; lint sin errores y el warning anterior en
  docs/diseno/logotipo/iconos-sn.mjs. Sin cambios visuales ni firma de interfaz.
- No se toco main, no hubo push, PR, merge a main ni cambios remotos.
- El revisor Astra independiente no pudo ejecutarse por cuota. El gestor reviso
  y probo el cambio, pero la revision independiente sigue PENDIENTE.

## Proveedores de referencia

- Google: https://web.dev/articles/codelab-notifications-push-server
- Mozilla: https://mozilla-services.github.io/autopush-rs/
- Apple: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- Microsoft: https://learn.microsoft.com/en-us/windows/apps/develop/notifications/push-notifications/wns-overview

Las rutas se tratan como opacas. Solo se aceptan los hosts o familias de hosts
de proveedores documentados; un proveedor nuevo requiere revision explicita.

## Continuidad

Siguiente: revisar independientemente OL-072/073 y conciliar los pendientes
tope-de-lecturas e indicadores-rol-de-entonces sin perder sus cambios sin commit.
Despues: nuevos-por-publicacion, entrar-texto-con-icono, guardado atomico,
cola de avisos y recorrido flyer-direccion-mapa-como llegar. Este ultimo aun no
se ha implementado. No declarar terminado el plan completo ni publicado este lote.
