# 359 · Integridad de altas, sesiones y publicación (OL-330)

**Versión pública; el completo está en somosnosotros-privado/seguridad/359-integridad-eventos-completo.md.**

**Fecha:** 2026-10-07. **Rama:** `integridad-eventos-sql`, base `origin/main` `f72a76fd`. Operador Codex; reserva del gestor. **Estado:** candidato probado localmente; sin migración remota ni unión.

Una inauguración admite una sola exposición ligada, también ante escrituras simultáneas. El alta de lugar con horario conserva una operación por cuenta: reintentar devuelve lo guardado, sin repetir sus franjas; el alta por pasos mantiene esa clave mientras los datos no cambian. Las sesiones deben cumplir su cupo, fechas y correspondencia con el evento al terminar la transacción. La publicación de un borrador vuelve por una ruta interna y muestra el rechazo del servidor.

**Migración:** `20261007140000_integridad_eventos.sql`. Añade dos índices únicos, la operación del lugar, una guardia privada y disparadores; no borra ni corrige datos existentes. La función de alta conserva su firma y permisos de quien llama. La guardia y la validación interna usan permisos elevados, ruta de búsqueda vacía y ningún permiso de llamada directa para anon, authenticated o service_role; no devuelven datos de eventos. La guardia es una fila interna que ordena las escrituras simultáneas sin modificar la revisión del evento; esos roles no pueden acceder a su tabla. La validación al final permite sustituir o eliminar sesiones dentro de la misma transacción.

**Antes de publicar:** el gestor debe comprobar los datos existentes con las consultas privadas previas a aplicar, aplicar la migración desde una copia que contenga todas las de main más esta rama y verificar los objetos antes de unir el código. Si hay datos incompatibles, detenerse y reservar su tratamiento: esta pieza no los modifica. Sin variables nuevas.

**Verificación:** 1.866 comprobaciones SQL correctas en PostgreSQL 17 local con 89 migraciones (41 nuevas, conexiones concurrentes reales); lint sin errores (advertencia preexistente), typecheck, 3.093 unitarias correctas, 18 pruebas del formulario en Chromium, inventario y build/medición 35×4 correctos. Capturas privadas de alta y aviso de publicación a 390×844; aviso sin errores de página ni desborde, con la fuente real. Datos de prueba y servicios simulados; sin escrituras ni envíos reales. Evidencia detallada privada.

**Límites:** las transacciones que leían una versión anterior de los datos pueden requerir reintento. Cambiar la zona o el periodo de un evento debe dejar coherentes sus sesiones en la misma transacción; si no, se rechaza todo. Validación en producción y Safari físico pendientes del gestor/founder; los controles locales no autorizan la salida a tiendas.
