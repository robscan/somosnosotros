# 285 · Purga de direcciones reservadas (OL-258)

**Fecha:** 2026-10-03. **Estado: checkpoint local, no listo para publicar.**
Operador Codex, sin subagentes. Rama `seguridad-purga-sitio`, worktree aislado,
base `bb6b8365d90606cb665fcf453b25ddda1e841f2a` (PR296 ya publicado).
Gestor de cambios III reservó OL-258, bit285 y la migración
`20261003130000_sitio_privado_purga.sql`, SQL/API/cron/pruebas y documentación
propia. Números comprobados con `scripts/ops/siguiente-bitacora.sh`.

## Implementación local

- Lectura del autor/admin hasta fin efectivo + 168 horas, independiente de que
  haya corrido la purga. Terceros conservan la ventana de revelación → fin + 2 h.
  El fin efectivo es `eventos.termina`, también cuando no hay fin explícito.
- `purgar_sitios_privados(integer)`: SECURITY DEFINER, `search_path` vacío,
  ejecución exclusiva de `service_role`, lote predeterminado 500, límite 1–1000.
  Bloquea eventos con `FOR UPDATE SKIP LOCKED` antes de borrar las copias, para
  coordinarse con la reprogramación. Devuelve solo el número eliminado.
- El trigger de revisión existente invalida formularios abiertos antes de la
  eliminación. Un trigger nuevo rechaza INSERT/UPDATE de copia ya vencida, incluso
  por servicio. La purga desactiva el opt-in de outbox durante su ejecución.
- La API `/api/purgar-sitios-privados` valida `CRON_SECRET` antes de crear el cliente
  de servicio, usa el plazo de SQL y no recibe un corte manipulable. Máximo 10
  lotes de 500, timeout HTTP de 4 s por lote, respuesta sin caché. Fallos y agotamiento
  de lotes devuelven 503; el contador solo incluye lotes confirmados. Un timeout
  puede dejar resultado desconocido del último lote: repetir es seguro.
- Segundo cron diario, `0 9 * * *` UTC (03:00 de Ciudad de México). La capacidad
  mínima de todos los planes admite ambos cron diarios; no se solicita cambiar
  de plan. [Límites oficiales consultados](https://vercel.com/docs/cron-jobs/usage-and-pricing).

La ventana de siete días cierra lectura, pero el borrado físico ocurre en una
ejecución posterior. En el plan con precisión por hora puede demorarse normalmente
hasta casi 25 h adicionales. Fallos, filas bloqueadas o rezago pueden ampliarlo:
operaciones debe revisar 503 en logs y repetir con el secreto existente, sin
registrarlo. No prometer eliminación física al segundo ni eliminación de copias
ya descargadas o respaldos históricos. Nunca se toca `lugares`, sean ocultos de
administración o privados reutilizables, ni se borran eventos o sus autores.

## Evidencia del checkpoint

- Regresión inicial sobre la base anterior: 3 fallos esperados (lectura vencida,
  escritura vencida y función ausente). Ajustado el caso UPDATE para ejercer el
  trigger con servicio: la nueva RLS impide al autor seleccionar la fila vencida.
- PostgreSQL real desechable en loopback: **70 migraciones y 1060 comprobaciones,
  cero fallos**. Cubre límite exacto, roles incluido admin, lotes/idempotencia,
  conservación del evento y lugares, revisión obsoleta, reposición directa y
  ambas carreras reales entre purga y reprogramación.
- API: **12 unitarias correctas** (credenciales, configuración, contadores,
  lotes, límite, error y timeout). Sin conexión a servicios externos.
- `npm run typecheck` y ESLint focalizado correctos. No se repitió todavía la
  suite global ni build/medir: el recorrido final de edición está pendiente.
- Evidencia local: `/tmp/sn-ol258-evidencia/pg-rojo.log`, `pg-verde-2.log` y
  `api-rojo.log`. No contiene datos de producción. No hubo SQL remoto ni envíos
  reales para OL258; la migración y el cron nuevos permanecen sin activar.

## Pendientes necesarios antes de una entrega publicable

1. El formulario actual exige dirección en un evento reservado: al purgarla,
   impide editar metadatos; la ficha puede anunciar una revelación que ya pasó.
   Coordinar ampliación con el gestor para ficha, página de edición, formulario,
   acción de guardado, validación y sus pruebas. No se tocaron estos archivos.
2. Permitir guardar metadatos de un reservado histórico sin copia, manteniendo
   la dirección ausente. Una reprogramación debe pedir una dirección nueva si
   ya se eliminó. La RPC tiene que comprobarlo en SQL y conservar revisión,
   idempotencia, cuotas y atomicidad. Verificar también formulario antiguo,
   revelación y concurrencia contra la nueva regla, sin recuperar datos borrados.
3. QA móvil del recorrido, integración final, revisión del gestor, CI y PR.
   La autorización directa del founder permite publicar la entrega una vez
   completa y probada; no convierte este checkpoint en candidato de producción.

**Bloqueo de coordinación:** la Mac quedó bloqueada y CUA no pudo desbloquearla.
Se pidió al founder desbloquearla. No se pudo enviar al gestor el cierre de
PR296 ni la solicitud de ampliación de OL258. Al retomar: entregar primero cierre
de bit284 (merge, migraciones y Production correctos), liberar su ventana remota,
pedir los archivos de edición mencionados y conciliar la autorización de publicar
entregas probadas en su memoria. No inventar la respuesta ni autoampliar ownership.
PR294/295, TestFlight y la excepción administrativa siguen fuera de esta pieza.
