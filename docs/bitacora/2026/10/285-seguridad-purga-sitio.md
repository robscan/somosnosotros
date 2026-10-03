# 285 · Purga de direcciones reservadas (OL-258)

**Fecha:** 2026-10-03. **Estado: entrega implementada y verificada; revisión y CI pendientes.**
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

## Pendientes del checkpoint inicial (resueltos en la entrega)

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


## Entrega completa — 2026-10-03

Desbloqueada la Mac, el gestor recibió el cierre de PR296 y verificó por su
cuenta merge, migraciones, FK RESTRICT y dominio. Cerró la ventana y amplió
expresamente la reserva de OL258 a ficha, edición, FormularioEvento, acciones,
lib/eventos, helper de retención y pruebas. No hay conflictos con PR294/295.

Se completó la edición histórica: permite cambiar metadatos de un reservado
vencido, sin reenviar su dirección. El estado original se relee en servidor;
SQL exige tanto el vencimiento original como el final propuesto, con bloqueo,
revisión e idempotencia. Una reprogramación dentro de la vigencia requiere una
dirección nueva; altas y eventos vigentes no pueden usar la excepción. La zona
original se conserva al no existir el pin eliminado. La ficha muestra que la
dirección dejó de estar disponible, sin anunciar una revelación pasada.

Verificación final local:

- PostgreSQL: **70 migraciones / 1068 comprobaciones correctas**. La regresión
  de edición fallaba en dos casos antes de completar la RPC. Ahora pasan
  metadatos después de purga y antes del cron, autor/admin, reintento, rechazo
  con rollback de fechas al reprogramar sin dirección y nueva dirección válida.
- **1717 unitarias / 128 archivos**, typecheck, lint e inventario correctos.
  Lint conserva un warning previo en VisorImagen.componentes.test.mjs:169.
- `next build` correcto con respaldo sintético en loopback, sin secretos reales.
- CUA en **390 × 844 CSS**, ancho de documento 390: cambiar título y guardar
  devuelve a la ficha; RPC simulada recibe `p_privado: null`. Reprogramar con el
  calendario exige confirmar dirección y deshabilita guardar. PostgreSQL real
  comprueba las escrituras y permisos: el respaldo HTTP no simula RLS.
- Build final mirado en móvil y escritorio. Aviso, alias y controles legibles,
  sin desborde horizontal. Capturas en `docs/rediseno/capturas-285/`: formulario
  antes, reprogramación pendiente, editar-build-movil, editar-build-escritorio y
  ficha-build-movil. La captura inicial de página completa quedó escalada por el
  navegador; las finales de viewport son 390 × 844 y se revisaron completas.
- `medir` queda a cargo del CI existente; QA local se hizo exclusivamente con CUA.
  Safari físico sigue pendiente del founder, sin presentarlo como probado.

Activación por entrega autorizada por el founder: después de revisión/CI,
coordinar ventana con el gestor, dry-run (debe listar solo la migración reservada),
aplicarla antes de la app, merge y Production del mismo SHA. Llamar una vez a la
ruta protegida para verificar la purga inicial, repetir para comprobar idempotencia
y verificar dominio. Reutiliza CRON_SECRET y la llave de servicio existentes;
no requiere variables nuevas. Registrar cantidades sin direcciones/IDs/secretos.

La migración instala reglas y funciones, no ejecuta la purga al aplicarse. Para
revertir la aplicación, mantener el cierre de lectura y pausar solo el cron si
fuera necesario; no restaurar direcciones ya eliminadas ni relajar las políticas.
El borrado físico afecta datos; revisión y prueba preceden su primera ejecución.
La eliminación excepcional administrativa sigue para una entrega separada.

## Incidencia de activación y corrección — 2026-10-03

PR297 en `43c0053b` superó CI37152224489 (incluido medir) y revisión del gestor;
este cedió la ventana de publicación. El dry-run remoto listó únicamente
`20261003130000`. Al aplicarla, PostgreSQL rechazó crear la función con
`SET app.avisos_outbox = 'off'` (42501). La transacción revirtió todo: el gestor
comprobó que no quedaron registro, funciones, trigger ni política nuevos.
No se mezcló el PR ni se ejecutó purga. Producción conserva PR296.

Causa reproducida en PostgreSQL local: una conexión nueva con un rol sin
superusuario no puede declarar ese parámetro todavía desconocido en la firma de
CREATE FUNCTION. La prueba anterior instalaba migraciones como superusuario y
no detectaba esa diferencia. La nueva regresión falló con 42501 antes del ajuste.

Se sustituye solamente ese SET por `set_config` dentro de la función, siguiendo
el patrón existente del guardado con avisos. Conserva el valor anterior y lo
restaura al terminar y al propagar errores, sin conceder permisos adicionales.
También se prueba que una purga real con opt-in inicialmente activo no encola
avisos y devuelve el estado del llamador. **70 migraciones / 1075 comprobaciones,
cero fallos**; ESLint focalizado y diff correctos. Evidencia local:
`/tmp/sn-ol258-evidencia/pg-sin-super-rojo.log` y `pg-sin-super-verde.log`.

Se reentrega el ajuste para revisión del gestor y nueva CI antes de repetir
activación. No cambia la interfaz; se reutilizan las capturas y pruebas del
mismo código UI. Se mantiene la reserva de la ventana, sin otras piezas.
