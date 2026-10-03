# 284 · Borrado de lugares y ventana de direcciones reservadas (OL-257)

**Fecha:** 2026-10-03. **Rama:** `seguridad-h01-h02`, base `origin/main`
`567b39bcf059b1b9eae9fc21c25586613002788d`. Operador Codex, sin subagentes.
Reserva expresa de Gestor de cambios III (`local_004a210b-4803-4298-bd64-2666df33576c`),
tras el «Bien, comienza a ejecutar» del founder. El gestor autorizó subir la
rama y abrir PR, sin merge, publicación, SQL remoto ni envíos reales.

## Alcance y decisiones

Primera entrega de la auditoría: H01 y H02. La reserva excluye la purga a siete
días y el procedimiento excepcional de eliminación administrativa; el gestor
asignará esas piezas por separado. Ubicación web/nativa y TestFlight permanecen
fuera de esta rama; no se tocaron los archivos reservados de PR294/295.

El founder aceptó la ventana de direcciones reservadas: desde la revelación
hasta dos horas después del fin efectivo del evento. Sin fin explícito, se usa
la medianoche siguiente en la zona del evento y se suman dos horas reales.
Ocultar el evento revoca las nuevas lecturas de terceros inmediatamente.
Autor y administración mantienen acceso; esta entrega no aplica la futura
retención/purga a siete días.

Precisión expresa del founder: los lugares «ocultos» creados por administración
son distintos de las direcciones reservadas de eventos. Se conservan también
los lugares privados reutilizables de usuarios (OL-179). No caducan, se borran
ni se publican por estas reglas; la ventana afecta únicamente a la copia de
`eventos_sitio_privado`.

## Causas y corrección

**H01.** La comprobación del servidor contaba eventos bajo RLS, omitía autores
NULL y podía competir con una inserción. El `ON DELETE CASCADE` de la FK borraba
eventos de otras personas incluso por API directa. La migración
`20261003120000_lugares_borrar_sin_eventos_ajenos.sql` cambia esa FK a RESTRICT.
La RPC `borrar_lugar(uuid)`, SECURITY INVOKER y ejecutable solo con sesión,
bloquea la fila del lugar, comprueba autor/admin, borra exclusivamente eventos
del solicitante y después el lugar. Si queda un evento ajeno, oculto o sin autor,
la FK rechaza la operación y revierte también los borrados propios. El bloqueo
se coordina con las inserciones de hijos. Administración no tiene una excepción
implícita: el procedimiento excepcional sigue pendiente.

La acción `borrarLugar` invoca esa operación y convierte el fallo de FK en el
aviso existente «tiene eventos». No expone detalles SQL ni informa éxito ante
errores, falta de permisos, ausencia del lugar o RPC todavía sin migrar.

**H02.** La política de lectura privada solo exigía sesión y fecha de revelación:
seguía entregando dirección, coordenadas e indicaciones tras ocultar o terminar
el evento, o al bloquear a su autor. La migración
`20261003120100_sitio_privado_ventana.sql` exige además el evento visible,
reservado y accesible por su propia RLS, y `now() < termina + interval '2 hours'`.
El inicio de revelación es inclusivo y el final exclusivo. Se conserva la
gestión del autor/admin y las políticas de escritura existentes.

La ficha consulta esa fila autorizada para permitir las dos horas de gracia.
Un tercero sin fila privada o sin sesión conserva el 404 del evento pasado.
Durante la gracia explica que terminó, no muestra ni ejecuta «Voy/Me interesa»
y no invita a confirmar asistencia en el estado vacío. Metadatos genéricos y
ausencia de JSON-LD del evento pasado se conservan. No se añadió caché compartida.
La revocación protege nuevas consultas: no puede retirar una dirección ya
descargada, copiada o capturada por quien antes tuvo acceso.

## Evidencia reproducible

- PostgreSQL real, clúster desechable y exclusivo en loopback, sin leer `.env`.
  Antes del arreglo: 67 migraciones, 1,017 comprobaciones, **18 fallos** de las
  regresiones nuevas (cascada ajena, ocultos, NULL, vencimiento y bloqueo).
  Después: **69 migraciones, 1,034 comprobaciones, cero fallos**.
- Casos H01: DELETE directo y RPC, tercero/autor/admin/anónimo, mezcla de eventos
  propios/ajenos con rollback completo, autor NULL, lugar vacío, reintento y
  privilegios de la función. Dos conexiones reales prueban ambos órdenes de la
  carrera entre insertar evento y borrar lugar.
- Casos H02: antes/durante/después de revelar, segundo previo al vencimiento,
  límite exacto fin + 2 h, ocultación, copia residual, bloqueo, eliminación,
  autor/admin/anónimo y fin implícito en México, Nueva York y Tokio. Los lugares
  privados de usuario y los ocultos de administración conservan sus datos.
- `npm run lint`: sin errores; un warning preexistente en
  `src/components/VisorImagen.componentes.test.mjs:169` (fuera del alcance).
- `npm run typecheck`, `npm run build`, `npm run inventario`: correctos;
  inventario sin novedades. Build con respaldo inventado en loopback.
- Suite unitaria: **1,696 pruebas / 126 archivos** correctos antes del último
  ajuste del estado vacío; después, tipos, lint focalizado y **17 pruebas
  focalizadas** correctas (incluye las dos regresiones añadidas al cierre).
- UI: CUA sobre el build local, cuenta sintética `*@example.com`, sin proveedores
  reales. Viewport CSS medido **390 × 844**, ancho de documento 390 (sin desborde).
  Aviso, acciones y dirección legibles; botones de asistencia ausentes. El
  respaldo simula las respuestas HTTP, no RLS: los permisos se prueban en PostgreSQL.
- `npm run medir` queda a cargo del job CI existente (navegador automatizado en
  GitHub Actions); la revisión local de navegador se hizo por CUA.

Capturas: [antes, ficha cerrada](../../../rediseno/capturas-284/movil-antes.png) y
[build con consulta reservada](../../../rediseno/capturas-284/movil-390-build.png).
La captura inicial se tomó a 325 × 703 CSS; la final a 390 × 844 CSS, comprobado
en DOM tras ajustar la escala del navegador integrado. Son evidencia de estados,
no una comparación de píxeles entre tamaños iguales ni una prueba de iPhone físico.

## Integración y estado operativo

**[PR296](https://github.com/robscan/somosnosotros/pull/296), preparado para revisión
del gestor; no activado en producción.** Código y pruebas en `178e74b7`; los
commits posteriores de esta entrega solo concilian documentación. El estado
vigente de CI y de la preview se consulta en los checks del PR (una preview no
significa que las migraciones estén aplicadas). Dos migraciones
nuevas; no se reescribió el historial SQL ni se cambian variables de entorno.
Aplicar ambas migraciones antes de publicar la aplicación, con la aprobación
específica de producción. Mientras la app anterior siga activa, la FK endurecida
puede impedir borrar un lugar con eventos propios; el nuevo RPC restaura ese
recorrido seguro al publicar la app.

Una vuelta atrás de la aplicación debe mantener la FK y la política endurecidas;
no restaurar CASCADE ni la lectura privada sin caducidad. No se elimina ni
transforma información existente al aplicar estas migraciones. La validación
inicial de la FK y el DDL requieren bloqueo de tabla: coordinar la ventana al
publicar, especialmente si hay escrituras concurrentes.

Revisión técnica del gestor (2026-10-03, PR296 sobre `67150c8b`): migraciones
correctas, sin bloqueos. Se atiende su ajuste documental de mover las capturas
a `docs/rediseno/capturas-284/`. Señaló además la excepción a la regla de
2026-09-14: para hacer efectiva la ventana aceptada por el founder el 2026-10-03,
la ficha reservada sigue accesible con sesión durante la gracia; las fichas
de dirección pública mantienen la regla anterior. Este efecto se comunicó
explícitamente al founder y al gestor, sin extender el plazo ni publicar.

Responsable siguiente: gestor, conciliar CI y OPS y proponer
la publicación autorizada al founder. Pendientes separados: purga a siete días,
eliminación administrativa excepcional, resto de auditoría y validación Safari
física del founder. No se consideran resueltos por este PR.
