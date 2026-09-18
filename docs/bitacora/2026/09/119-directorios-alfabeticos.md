# Directorios alfabéticos

Pedido del founder, 2026-09-18: Artistas y Lugares se ordenan alfabéticamente y ofrecen un índice de letras para llegar al tramo buscado. En Lugares, **Cerca de mí** sustituye ese orden por distancia y al quitarlo vuelve al orden alfabético. Los carriles de Destacados y Con eventos esta semana usan tarjetas rectangulares con imágenes al doble de tamaño; las fichas con foto real se muestran antes que los placeholders, conservando el orden editorial o de fecha dentro de cada grupo.

La letra de Artistas vive en la URL y se filtra en el servidor, sin cargar el catálogo completo. No hay migraciones, variables de entorno ni cambios de permisos.

Checkpoint final local: `ffff3ad`. Verificado con 44 pruebas focalizadas (orden, acentos, cercanía, carril semanal y foto/placeholder), typecheck, lint sin errores (queda un warning previo en el logotipo) y build. Smoke de solo lectura con datos públicos: índice, letra, borrar búsqueda y reset en Artistas a 390×844; letra y reset en Lugares a 1280×800. Capturas privadas: `directorios-alfabeticos/artistas-390-final.png` y `directorios-alfabeticos/lugares-1280-final.png`. La cercanía no pidió ubicación real y se sostiene en las pruebas focalizadas; la tarjeta única no ocurrió con los datos públicos, pero conserva el rectángulo responsivo por CSS.
