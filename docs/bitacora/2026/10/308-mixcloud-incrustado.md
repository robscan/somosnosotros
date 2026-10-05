# 308 · Mixcloud en novedades — OL-280

**Fecha:**2026-10-04. **Rama:** `mixcloud-incrustado`. **Base:** `origin/main f653e63967fb6f6873e54e6dfc1be4916c3e663c`. **Operador:** Codex `01a108e1-7881-7420-85d0-9ce1947405c1`.

## Reporte y reserva

El founder envió una captura de su iPhone: Publicar novedad para Robscan reconoce Mixcloud, pero el reproductor muestra «Sorry we can't find that content». El enlace se ve cortado en la captura; se pidió el completo. La API pública de Mixcloud devuelve una única coincidencia con el prefijo visible: [Randomatic Oct26](https://www.mixcloud.com/robscan/randomatic-oct-26/). Se reproduce y verifica con esa pista real, sin asumir una indisponibilidad de su contenido.

Gestor III reservó OL-280/bit308 y la rama desde main `f653e639`, con propiedad de `incrustado.ts`, `incrustado.test.ts`, regresiones de `novedadesArtista.test.ts` y QA/documentación propias. Confirmó que no hay choques con las otras piezas activas. La corrección debe servir para URLs guardadas, sin migrar datos. Sin SQL, escrituras remotas o producción; entrega PR sin unir, CI y vista previa. No se descongelan OL-275/276 ya publicadas.

## Causa comprobada y arreglo

`reconocerEnlace` elimina la barra final al normalizar la URL. `rutaMixcloud` acepta ambas formas y devuelve la ruta tal cual. La plantilla del iframe usaba esa ruta sin restaurar la barra requerida por la clave de Mixcloud.

Comparación en el widget oficial, con los mismos parámetros: `feed=/robscan/randomatic-oct-26` muestra el error del founder; `feed=/robscan/randomatic-oct-26/` muestra portada, título, autor y duración55:56, en00:00. La [documentación oficial](https://www.mixcloud.com/developers/widget/) también expresa la clave como `/usuario/show/`.

El código añade la barra únicamente al construir el `feed` del iframe, después de validar la ruta. No cambia `rutaMixcloud`, el reconocimiento ni las URLs guardadas. Así se corrigen la previa, la edición y las filas antiguas al leerlas; no hay que borrar o volver a publicar. Se conservan los dominios, sandbox, permisos, altura y ausencia de autoplay.

## Verificación

- Control negativo antes del arreglo:3 fallos/47 correctas entre los dos archivos focales; falla la URL guardada sin barra, la variante con query y el recorrido reconocimiento→validación→reproductor. Con el arreglo:50/50 correctas.
-107 pruebas focales correctas: incrustado, reconocimiento/validación de novedades, enlaces, video y acciones. Incluyen SoundCloud, Bandcamp, YouTube y Vimeo; las reglas de validación y seguridad actuales siguen pasando.
-137 archivos/1909 unitarias correctas. Lint/tipos correctos; único warning heredado en `VisorImagen.componentes.test.mjs:171`.
- Build Next16.3.8 correcto e inventario sin novedades. El primer intento de build no alcanzó Google Fonts dentro del sandbox; se repitió con acceso de red normal, sin cambiar certificados, fuente ni configuración del producto.
- [QA y capturas](../../../rediseno/capturas-308/README.md): app compilada,320×844 y390×844, alta, edición de una URL guardada sin barra, ficha y recarga. Perfil/sesión/fila inventados en un respaldo aislado; la pista y el iframe son reales. Se comprueban título,00:00, feed completo, tipografía Bricolage cargada y ausencia de desborde/errores. No se pulsa Play ni Publicar/Guardar/Borrar; ninguna escritura remota.
- Comprobación adicional por navegador de la app a390×844: formulario real con foco en Título, como en la captura del founder; el iframe muestra Randomatic Oct26.

## Entrega y límites

Corrección lista para PR sin unir y revisión final de Gestor III. La publicación requiere aprobación específica del founder y la ejecuta el gestor. La QA prueba carga del reproductor, sin iniciar audio. Safari en el iPhone físico se valida después de publicar. No hay migraciones ni variables de entorno nuevas.
