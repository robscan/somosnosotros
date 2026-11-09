# 546 · OL-513 · Respaldo semanal de la base y de las fotos fuera de Supabase

**Fecha:** 2026-11-09. **Rama:** `respaldos` (solo documentos: el guion vive fuera del repo). **Quién:** Gestor de cambios IX. **Pieza 2 de la revisión completa OL-511** (bitácora 544). **Pedido del founder (textual):** «Adelante con las piezas 1 y 2, acepto tus recomendaciones.»

## Qué había
El último volcado propio de la base era del 18 de septiembre (antes de publicar), la computadora del founder no tenía destino de Time Machine, y las fotos del Storage (2 292 archivos, 471 MB) no tenían copia fuera de Supabase.

## Qué hay ahora
- **Guion `privado/gestor/respaldo/respaldo.sh`** (fuera del repo, lee las llaves del `.env` sin imprimirlas): volcado completo de la base con `pg_dump` en formato custom (esquemas `public`, `auth`, `storage`, `supabase_migrations`, `cron`), suma SHA-256 y conteo de tablas; conserva las 8 copias más recientes. Luego **`fotos.mjs`**: espejo local de los buckets `fotos` y `obras` leyendo la lista de `storage.objects` por la base y bajando solo lo que falta o cambió de tamaño (8 descargas a la vez). Registro en `backups/respaldo.log` (con las cadenas de conexión tapadas).
- **Programado en la Mac** con launchd (`~/Library/LaunchAgents/org.somosnosotros.respaldo.plist`): **domingos a las 03:00**, si la Mac está encendida. Se puede correr a mano con `zsh privado/gestor/respaldo/respaldo.sh`.
- **Primera corrida completa hoy a las 14:43–14:48:** base 3,5 MB con 106 tablas con datos; fotos 2 292 objetos bajados (471 MB), 0 fallos. Todo en `~/Proyectos/somosnosotros/backups/` (carpeta con permisos 700, fuera del repo).
- **Restauración probada** en un Postgres 17 local vacío: `pg_restore` trajo las mismas filas que producción (97 perfiles, 2 722 eventos, 649 lugares, 97 cuentas, 2 292 objetos de Storage); los avisos que dio fueron de permisos de roles del entorno de Supabase, esperables fuera de él, no de datos. La base de prueba se borró al terminar.

## Lo que falta y depende del founder
1. **Un destino fuera de esta Mac:** disco externo o nube para Time Machine (o para copiar `backups/` y `privado/`). Hasta entonces las copias viven solo en la Mac; cuando elija destino, se añade el cifrado con una contraseña que él guarde.
2. **Panel de Supabase › Database › Backups:** confirmar qué copias hace el proveedor (diarias, PITR) y cuándo se probó restaurar una. Va en la sesión de paneles de la revisión (12 preguntas).

## Verificación
No se tocó código del repo (`npm run lint && npm run typecheck && npm test` no aplican a esta pieza). Evidencia: `backups/respaldo.log`, `backups/base/2026-11-09/SHA256SUMS`, `backups/fotos/ULTIMO-ESPEJO.json` (fuera del repo).
