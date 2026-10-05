# OL-280 · Mixcloud en novedades

App Next16.3.8 compilada con Bricolage real. Perfil, sesión y novedad guardada son inventados y solo existen en loopback; el enlace de Randomatic Oct26 y su reproductor de Mixcloud son reales. No se reproduce audio ni se guarda/publica/borra contenido. La comprobación en iPhone/Safari físico sigue pendiente.

`node docs/rediseno/capturas-308/verificar.mjs` levanta el respaldo propio y la app compilada contra `http://127.0.0.1:49780` con valores públicos inventados. Se necesita compilar previamente con las mismas variables descritas en el script. `--servidor` permite revisar el banco por navegador entrando por `http://127.0.0.1:30482/`, que instala exclusivamente la sesión ficticia local. No usar credenciales de producción.

Los ocho casos de [qa.json](qa.json) verifican el feed con barra final, la carga de «Randomatic Oct26»/00:00 dentro del iframe real y el ancho del documento. La edición parte de una URL guardada **sin barra final**. La recarga repite la ficha sin modificar la fila. Las capturas se toman después de cargar fuentes, portada y terminar la aparición del proveedor.

| Caso |320×844|390×844|
|---|---|---|
|Publicar novedad|[PNG](nueva-320.png)|[PNG](nueva-390.png)|
|Editar novedad guardada|[PNG](editar-320.png)|[PNG](editar-390.png)|
|Ficha del artista|[PNG](ficha-320.png)|[PNG](ficha-390.png)|
|Recarga de ficha|[PNG](recarga-320.png)|[PNG](recarga-390.png)|

La causa se confirmó también sin la app: el widget oficial con `/robscan/randomatic-oct-26` falla; con `/robscan/randomatic-oct-26/` carga. Se conserva su estado en00:00. Código y reproducción se documentan en [bit308](../../bitacora/2026/10/308-mixcloud-incrustado.md).
