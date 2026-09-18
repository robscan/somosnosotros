# Directorios alfabéticos

Pedido del founder, 2026-09-18: Artistas y Lugares se ordenan alfabéticamente y ofrecen un índice de letras para llegar al tramo buscado. En Lugares, **Cerca de mí** sustituye ese orden por distancia y al quitarlo vuelve al orden alfabético. Los carriles de Destacados y Con eventos esta semana usan tarjetas rectangulares con imágenes al doble de tamaño; las fichas con foto real se muestran antes que los placeholders, conservando el orden editorial o de fecha dentro de cada grupo.

La letra de Artistas vive en la URL y se filtra en el servidor, sin cargar el catálogo completo. No hay migraciones, variables de entorno ni cambios de permisos.

Checkpoint final local: `a9810fe`. Verificado con 44 pruebas focalizadas (orden, acentos, cercanía, carril semanal y foto/placeholder), typecheck y lint sin errores (queda un warning previo en el logotipo). La revisión visual requiere datos del directorio: en este worktree el entorno local no cargó Artistas y no mostró índice, por lo que no sustituye la prueba en preview/Safari del founder.
