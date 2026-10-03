# 286 · Eliminación excepcional de lugares (OL-259)

**Fecha:** 2026-10-03. **Estado:** candidato local completo, listo para revisión del gestor y CI.
Operador Codex, sin subagentes. Reserva de Gestor de cambios III:
`seguridad-borrado-excepcional`, base `5f166c51` (PR297 publicado), worktree
`/Users/apple-1/somosnosotros-seguridad-borrado-excepcional`. OL259/bit286 y
migración `20261003140000_borrado_excepcional_admin.sql`; script de numeración
comprobado. Cierre documental de OL258 incorporado mediante cherry-pick
`8601468b` → `06df3c30`. No se toca main ni cambios ajenos.

## Decisión y alcance

El founder respondió directamente en esta tarea: **«Conservar los eventos y
retirar su vínculo al lugar (recomendado)».** El gestor registró y confirmó los
límites adicionales de integridad y privacidad:

- `eventos.lugar_id` sigue RESTRICT; `borrar_lugar` y su comportamiento no cambian.
- Dos RPC aparte, exclusivamente para administración autenticada: consulta de
  impacto sin escrituras y ejecución atómica con motivo y confirmación del impacto.
- Conservar todos los eventos, su autoría, asistentes y demás relaciones.
  Lugar público: nombre como sitio sin ficha, misma visibilidad. Lugar privado u
  oculto: «Lugar retirado», sin copiar nombre/dirección/pin; los eventos quedan
  ocultos para que desvincularlos no los active en listados públicos. Conteo visible.
- El impacto cubre las siete FK que apuntan al lugar. Obras colectivas,
  contactos importados e historial de invitaciones bloquean la ejecución para
  preservar datos fuera de la autorización. Seguimientos, cuentas vinculadas y
  destacados del lugar se cuentan y se eliminan explícitamente.
- Auditoría mínima: administrador, fecha, UUID del lugar, motivo, cantidades y
  huella de confirmación; sin copias de eventos ni datos personales de terceros.
  Lectura exclusiva admin; sin permisos de escritura o eliminación desde la API.
- Sin avisos masivos; restaurar configuración de outbox tras éxito y error.
- Solo migración/pruebas, admin/acciones y MenuFicha, aviso de salida administrativa
  en ficha de lugar, capturas y documentación. No PR294/295, ubicación ni iOS.

## Implementación

La consulta de impacto genera una huella SHA-256 de la instantánea completa del
lugar, eventos y relaciones; solo devuelve nombre, cantidades y huella, ligada al
administrador. No guarda una solicitud ni consume datos privados de direcciones
reservadas. La ejecución bloquea padre e hijos, recalcula y exige la misma huella:
una actualización, alta, baja o sustitución obliga a revisar de nuevo.

El registro de auditoría y la desvinculación están en la misma transacción.
Reintentar la misma confirmación/actor/motivo devuelve el cierre previo. El acceso
se comprueba nuevamente aunque exista ese cierre. Las funciones tienen
search_path vacío, ejecución revocada para public/anon/service_role y comprobación
de rol en SQL además de la acción del servidor. La huella usa UTC para mantenerse
igual entre conexiones con distintas zonas horarias.

El menú de Administración › Lugares muestra «Eliminar lugar…». Al abrir consulta
el impacto. Explica la conservación de eventos y los vínculos que desaparecen;
requiere un motivo de 10–500 caracteres y confirmación explícita. Los bloqueos
de integridad impiden continuar; si cambia el impacto, exige otra revisión.
El error «tiene eventos» de la ficha ofrece a administración la salida al panel.

## Evidencia local y pendientes

- Regresión inicial PostgreSQL: consulta ausente, prueba roja. Durante la
  implementación, dos conexiones con zonas distintas detectaron una huella
  inestable; corregida con timezone UTC en la función de impacto.
- 71 migraciones y 1121 comprobaciones correctas, incluido el inventario completo
  de FK. Roles, lectura sin escritura, huella obsoleta,
  motivo, conservación de eventos/asistencias/autor NULL/ocultos, idempotencia,
  bloqueos de obras/contactos/invitaciones, rollback de auditoría y concurrencia.
- Funciones instaladas también como rol sin superusuario y conexión nueva.
- 13 unitarias nuevas de acciones: rojas antes; verdes después. Validación,
  errores sin detalles SQL, rol en servidor, invalidación de pantallas y cierre.
- UI inicial observada en CUA a390×844 antes de editar. Respaldo HTTP completamente
  sintético, cuenta *@example.com. No representa RLS ni usa proveedores reales.
- Candidato final: 1730 unitarias/129 archivos, typecheck, build e inventario verdes.
  Lint sin errores, una advertencia anterior en VisorImagen.componentes.test.mjs:169.
- QA CUA sobre el build final: escritorio 1280×720 y móvil 390×844, documento de
  390 px sin desborde; hoja normal y bloqueo de obra. Motivo solo no activa borrar;
  necesita también confirmación. En respaldo sintético se completó el recorrido
  y la ficha conservó evento/autoría/asistentes, sitio como texto y sin dirección.
  Capturas en `docs/rediseno/capturas-286/`: `build-escritorio.png`,
  `build-movil.png`, `build-bloqueado.png`, más antes/recorrido de desarrollo.
- La comprobación física en Safari/iPhone del founder sigue pendiente. `medir`
  queda a CI. Falta revisión del gestor/CI y publicación; no hay SQL remoto OL259.

Evidencia temporal: `/tmp/sn-ol259-evidencia/`. La aprobación vigente del founder
permite publicar cada entrega probada; se coordina ventana después de revisión.
Publicar la función no autoriza usarla para borrar un lugar real durante QA.
