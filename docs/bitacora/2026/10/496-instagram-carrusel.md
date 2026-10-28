# 496 · Carrusel en Instagram y Facebook: un festival con varios carteles (OL-464)

**Fecha:** 2026-10-27. **Rama:** `instagram-carrusel`, base `origin/instagram-festival` (OL-463, `f06ea344`), y luego `origin/main` (`190f4664`,
OL-463 ya unido; avance rápido). **Operador:** agente de la pieza (Gestor VII), sin otros agentes. **Estado:** en código, espera la revisión del
gestor y una publicación real de prueba. **Migración `20261028120000_instagram_carrusel.sql`** (añade columnas y un valor de formato; ninguna fila
cambia). Sin variables nuevas. Capturas: `docs/rediseno/capturas-496/`.

## El pedido

- Founder, 27 de octubre: «para el caso de festivales que además tengan más de un cartel en sus eventos, ¿se puede hacer un carrusel para
  publicar?»; dijo «Sí» a la propuesta.
- Encargo del gestor: la primera imagen es el cartel del marco (o su diseño de Crear cartel); después los carteles **distintos** de sus actos por
  venir, en orden de fecha, sin repetir, hasta 10, todos a 4:5 con el margen de su color; Instagram con contenedor de carrusel e hijos con sus
  etiquetas; Facebook con varias fotos; la hoja con una tira de miniaturas para quitar y reordenar; el registro con cuántas imágenes y el formato
  `carrusel`; y la función de base para «Esta semana» (solo la función y sus pruebas).

## Lo que dice la documentación de Meta (revisado hoy)

- **Carrusel en Instagram** ([publicar contenido](https://developers.facebook.com/docs/instagram-platform/content-publishing#carousel-posts)): un
  contenedor por imagen con `image_url` e `is_carousel_item=true` (las etiquetas, `user_tags`, van en cada hijo); luego el carrusel,
  `media_type=CAROUSEL` con `children` (de 2 a 10 ids, en orden), `caption` y `location_id`; esperar `FINISHED` y `media_publish`. Instagram recorta
  todas a la proporción de la primera: por eso todas van a 4:5. Las historias no llevan carrusel. Un carrusel cuenta como una publicación en el
  cupo de 100 al día.
- **Varias fotos en una página de Facebook** ([Pages API, posts](https://developers.facebook.com/docs/pages-api/posts)): cada foto a
  `POST /{page-id}/photos` con `published=false` (responde su `id`); luego `POST /{page-id}/feed` con `attached_media[i]={"media_fbid":"…"}` y
  `message`. Los mismos permisos que el espejo de OL-461 (`pages_manage_posts`).

## Qué se hizo

### Las imágenes (`src/lib/instagram/carrusel.ts`, puro: lo usan la hoja, la vista previa y la acción)

- **`armarCarrusel({ portada, eventos, ahora, zona, sinCartel })`**: la portada primero (clave `portada`: el cartel del marco o, sin él, su diseño
  de Crear cartel); luego un cartel por cada cartel **distinto** de los eventos por venir (por la fecha de su próxima función: un acto con funciones
  cuenta mientras le quede una), sin repetir (la misma imagen con otra consulta en la dirección es la misma). Varios actos con el mismo cartel → una
  imagen con los artistas de todos; un acto con el cartel del marco se suma a la portada. Un evento sin cartel no aporta (`"fuera"`, el festival) o
  aporta su diseño de Crear cartel (`"diseno"`). Cada imagen sabe sus eventos y las cuentas de sus artistas.
- **`elegirImagenes(todas, { orden, quitadas })`**: lo que eligió la hoja; van las primeras 10 y las demás quedan fuera (las últimas).
  **`imagenesPedidas`**: al publicar, solo claves que el servidor conoce, sin repetir, en su orden y hasta 10.
- **`etiquetasPorImagen(van, { lugar, permitidas })`**: el lugar en todas; los artistas de cada acto en la imagen de su cartel; quien organiza (y
  quien quedó sin imagen porque su cartel quedó fuera o se quitó) en la portada, o en la primera si la portada no va. `permitidas` son las de la
  foto de OL-463 (`etiquetasDeLaFoto`, con las quitadas y el tope de 20), así que nadie que la hoja quitó se etiqueta. Hasta 20 por imagen.
- **«Esta semana» (base, sin pantalla)**: la misma `armarCarrusel` con una portada aparte y `sinCartel: "diseno"`: la portada de la semana y sus
  nueve eventos, cada uno con su cartel o su diseño, en orden de fecha (pruebas en `carrusel.test.ts`). Falta el dibujo de esa portada y su pantalla.
- `resumenCarrusel` y `textoImagenes`: lo que dice la hoja («Carrusel de 10 imágenes, en este orden:», «Instagram deja 10: queda fuera
  «Concierto de cuencos».»).

### Los clientes

- **`lib/instagram/api.ts` · `publicarCarrusel({ imagenes: [{ imagen, etiquetas }], texto, ubicacion })`**: un hijo por imagen con
  `is_carousel_item=true` y sus `user_tags` (repartidas abajo, como en una imagen), esperando `FINISHED` de cada uno; el carrusel con `children` en
  orden, el texto y la ubicación; `FINISHED`; `media_publish` y `permalink`. Como en una imagen: si Instagram rechaza las etiquetas de un hijo (una
  cuenta privada) ese hijo va sin ellas, y si rechaza la ubicación el carrusel va sin ella, y se dice (`sinEtiquetas`); permiso y cupo con su clave;
  nada queda a medias (los contenedores sin publicar caducan solos). La espera y la publicación de una imagen quedaron en dos funciones que usan los
  dos caminos (`publicar` no cambia de comportamiento; sus 20 pruebas siguen).
- **`lib/facebook/api.ts` · `publicarEnPagina({ …, imagenes })`**: con más de una, cada foto sin publicar y luego `/feed` con `attached_media` en
  orden y el texto; una foto que falla no deja publicación. Con una, la publicación de siempre.

### Servidor y base

- **`datos.ts`**: los actos del festival traen su `imagen`; `cargarParaHoja` arma `carrusel` (vacío si no hay más de una imagen: la hoja de
  siempre). «Ya en Instagram» dice «Carrusel · Hoy, 10:00 am».
- **`acciones.ts`**: `prepararInstagram` manda las claves y títulos del carrusel. `publicarEnInstagram` recibe `imagenes` (las claves en el orden de
  la hoja); dibuja la portada como siempre (con su recorte o su diseño) y cada cartel de acto a 4:5 con el margen de su color (`encajarCartel`; uno que
  ya no se pudo bajar se deja fuera), sube cada JPEG y publica el carrusel con las etiquetas por imagen; con una sola imagen, la publicación de
  siempre (también si es el cartel de un acto). Anota `formato = 'carrusel'`, `imagenes` y `carrusel` (las direcciones en orden). El espejo y
  «Reintentar en Facebook» publican las mismas fotos en una publicación. Responde `imagenes`.
- **`/api/instagram/[id]`**: `imagen=<id del acto>` dibuja el cartel de ese acto del festival a 4:5 (solo actos de ese festival y con cartel);
  `mini=1`, a 240 de ancho para la tira.
- **Migración `20261028120000_instagram_carrusel.sql`**: `instagram_publicaciones.imagenes` (1 por omisión: todo lo de antes) y `.carrusel`
  (las direcciones, de 2 a 10), con su regla (un carrusel lleva de 2 a 10 y lo demás una; publicado, con tantas direcciones como imágenes);
  `facebook_publicaciones.imagenes`, que la base copia de la publicación de Instagram como ya copiaba el evento y el formato
  (`facebook_publicaciones_registro`, mismo cuerpo más esa columna). El formato acepta `carrusel` en las dos tablas: su `check` se cambia por uno
  que acepta un valor más. Banco: `supabase/tests/pg/instagram-carrusel.test.mjs` (15 comprobaciones).

### La hoja (`HojaInstagram`, piezas existentes)

- Con más de una imagen y en «Publicación 4:5»: la imagen grande es la primera del carrusel; debajo, **«Carrusel de N imágenes, en este orden:»** y
  una **tira horizontal** (`<ol>`, se desliza dentro de la hoja, nunca la página) con cada miniatura y sus tres botones `ui/BotonIcono` de 44 × 44:
  antes (‹), quitar (✕) y después (›); la primera no va antes, la última no va después y la única que queda no se quita. Nombres accesibles: «Mover
  antes: Charla de tarot», «Quitar del carrusel: …». Si hay más de 10: «Instagram deja 10: queda fuera «…».»; quitar una deja entrar a la que
  quedaba fuera. **«Volver a poner»** (`admin/enlace`, como «Volver a etiquetar») deshace quitar y mover. Si la primera es el cartel de un acto: «Va
  completo, con margen de su color.» (el «Recortar» y el «Otro diseño» son de la portada).
- Historia: «Las historias no llevan texto y duran 24 horas. Lleva solo la portada.», sin tira.
- Publicado: «Instagram: carrusel publicado, 10 imágenes · Ver» y «Facebook: publicado, 10 fotos · Ver».
- Con una sola imagen (un evento, o un festival sin carteles en sus actos) la hoja queda como hoy. Una respuesta sin `carrusel` también.
- CSS nuevo (`HojaInstagram.module.css`): `.tira`, `.lamina` y `.miniatura`, con tokens (`--control`, `--espacio-*`, `--radio`, `--borde`).

### Respaldo local

- `RESPALDO_CARRUSEL_IG=1` (lleva al festival de OL-463 consigo): el marco y los once actos con cartel (la Fogata con el de los Tambores), servidos
  desde `RESPALDO_CARRUSEL_DIR`. La API de mentira contesta los hijos (`900458001`…), el carrusel (`900464`) y `/feed`, y apunta lo que llega.

## Comprobado

- `npm run lint` (0 errores; los 2 avisos son de archivos ajenos), `npm run typecheck`, `npm test` (**4 772 pruebas** en 294 archivos; nuevas:
  `carrusel.test.ts` —portada primero, carteles distintos en orden de fecha, el de la portada que se suma, solo lo por venir y las funciones, tope de
  10 y las que quedan fuera, quitar deja entrar, el orden de la hoja, las claves pedidas, etiquetas por imagen con el lugar en todas y las sueltas en
  la portada, 20 por imagen, las permitidas de OL-463, «Esta semana» con portada aparte y diseños, lo que dice la hoja—; `api-carrusel.test.ts` —hijos
  con `is_carousel_item` y sus etiquetas, el carrusel con `children` en orden, texto y ubicación, la espera, un hijo sin etiquetas, el carrusel sin
  ubicación, permiso, imagen, cupo, de 2 a 10, sin token, red caída—; tres de varias fotos en `facebook/api.test.ts`),
  `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db` (115 migraciones, **2 571 pruebas, 0 fallaron**), `npm run inventario`
  (sin novedades), `npm run test:componentes` (**738 de 738**, con las 5 nuevas), `npm run medir` (60 pantallas × 4 anchos, **sin novedades**: el
  respaldo de siempre no trae carrusel, así que s46/s47 miden lo mismo) y `npm run build`.
- **Componentes con toques reales** (`src/components/instagram/HojaCarrusel.componentes.test.mjs`, 5 de 5, con las filas del respaldo y el toque
  comprobado con `elementFromPoint`): la tira con la portada y nueve carteles en orden, el que queda fuera dicho, 30 botones de 44 × 44; quitar
  deja entrar al undécimo y «Volver a poner» lo deshace; mover la portada después, la imagen grande cambia y «Publicar» manda las claves en ese
  orden; la historia sin tira y una sola imagen como siempre; a 320, la tira cabe y se desliza, nada se corta.
- **Recorrido en la app** (`node scripts/ops/auditoria-ui/capturar-instagram-carrusel.mjs . <carpeta>`, Chrome real, la app compilada contra el
  respaldo con `RESPALDO_CARRUSEL_IG=1` y las APIs de mentira): **todo bien, sin errores de página ni de consola**. Lo que llegó a Instagram tras
  quitar el Yoga y poner la Meditación primero: diez hijos y un carrusel con los diez en orden, el texto de la hoja solo en el carrusel, ubicación;
  etiquetas por imagen:

  ```
  imagen 1 (Meditación):        aether.slp marthafranco.demo
  imagen 2 (portada):           aether.slp culturamistica.demo
  imagen 3 (Taller de escritura): aether.slp          (Gustoño no tiene Instagram)
  imagen 4 (Charla de tarot):   aether.slp luna.arcana.demo
  imagen 5 (Mercadito):         aether.slp
  imagen 6 (Ceremonia de cacao): aether.slp sahumerio.demo
  imagen 7 (Lectura de cartas): aether.slp ixchel.ramos.demo
  imagen 8 (Tambores y Fogata): aether.slp tamborancestral.demo marthafranco.demo
  imagen 9 (Astrología):        aether.slp rocio.mendoza.demo
  imagen 10 (Concierto de cuencos): aether.slp oraculo.sonoro.demo
  ```

  En Facebook: diez fotos sin publicar y una publicación con las diez y el texto con el enlace marcado. «Ya en Instagram»: «Carrusel · Hoy, 10:00
  am». **A 320, 390 y 430 sin textos cortados ni desplazamiento a lo ancho** (la hoja arriba, en la tira y abajo).

## Capturas (`docs/rediseno/capturas-496/`, 390 × 844 salvo la 12; cada una abierta; carteles inventados por el recorrido)

- `01-lista-festival`: «Cultura Mística (demo)» en un renglón con su cartel, «Del 9 al 11 de oct · 11 actos», «Aether».
- `02-hoja-carrusel`: la portada grande (morado y amarillo), «Carrusel de 10 imágenes, en este orden:» y la tira con la portada, la Meditación y el
  Taller de escritura asomando; sus botones ‹ ✕ › (el ‹ de la primera, gris).
- `03-tira`: la tira a la vista y debajo «Instagram deja 10: queda fuera «Concierto de cuencos».» y las primeras etiquetas.
- `04-tira-al-final`: la tira deslizada hasta el final: Lectura de cartas, Tambores y fogata (un cartel vertical, con margen negro) y Astrología
  (apaisado, con margen de su morado); el › de la última, gris.
- `05-quitada`: quitado el Yoga, el Concierto de cuencos entra al final, ya no dice qué queda fuera y aparece «Volver a poner».
- `06-reordenada`: la Meditación primero (grande, cuadrada con su margen verde), «Va completo, con margen de su color.» y la tira con la portada
  segunda.
- `07-hoja-abajo`: las nueve etiquetas, la ubicación, el texto (956/2200), «También en Facebook» y «Publicar».
- `08-publicado`: «Instagram: carrusel publicado, 10 imágenes · Ver» y «Facebook: publicado, 10 fotos · Ver», «Listo».
- `09-lista-despues`: «Ya en Instagram · 2»: Cultura Mística con «Carrusel · Hoy, 10:00 am» y «Facebook: publicado».
- `10-historia`: «Historia 9:16», la portada a 9:16, «Las historias no llevan texto y duran 24 horas. Lleva solo la portada.», sin tira (ya
  publicado: el botón dice «Publicar otra vez»).
- `11-una-imagen`: Delirium Pollum: la hoja de siempre, sin tira ni «Carrusel».
- `12-tira-320`: a 320 de ancho: la tira con dos miniaturas a la vista y la línea de lo que queda fuera en dos renglones, sin cortes.

## Decisiones por confirmar (founder o gestor)

1. **El `check` de formato se cambia** (en las dos tablas) por uno que acepta un valor más (`carrusel`); lo demás de la migración solo añade. El
   encargo pedía «el formato `carrusel`»; la otra salida era dejar `4x5` y leer el carrusel de `imagenes > 1`.
2. **Quien queda sin imagen se etiqueta en la portada**: quien organiza, y los artistas de un acto cuyo cartel quedó fuera (más de 10) o se quitó.
   Así nadie de la lista de etiquetas de la hoja se pierde. Si la portada se quita, van en la primera.
3. **Los actos sin cartel no aportan imagen** en un festival (no se dibuja un diseño de Crear cartel por cada uno); sí en «Esta semana»
   (`sinCartel: "diseno"`), por decidir cuando se haga su pantalla.
4. **«Recortar» y «Otro diseño» son solo de la portada**; los carteles de los actos van siempre completos con margen de su color.
5. **Volver a poner** deshace quitar y mover a la vez (vuelve al orden del sistema), como «Volver a etiquetar».
6. Si al publicar el cartel de un acto ya no se puede bajar, se deja fuera y se publica con las que quedan (el resultado dice cuántas salieron).
7. Las direcciones de cada imagen quedan en `instagram_publicaciones.carrusel` para el espejo y su reintento; las imágenes siguen en `fotos/lugares/<admin>/`
   como las de OL-458 (se podrían borrar a las 24 h; sin cambio).

## Lo que el gestor debe hacer y probar en producción

1. Aplicar la migración `20261028120000_instagram_carrusel.sql` antes de unir. Sin variables nuevas (las de OL-458 y OL-461).
2. Administración › Instagram: abrir «Cultura Mística» (tiene carteles por día en sus actos): debe salir la tira con la portada y los carteles
   distintos de lo que falta del festival, sin repetir.
3. Quitar o mover alguno y **Publicar** (con «También en Facebook»). En Instagram: un carrusel con esas imágenes en ese orden, el texto y, en cada
   imagen, el lugar y los artistas de su acto. En Facebook: una publicación con las mismas fotos y el texto con el enlace.
4. Si Facebook falla, «Reintentar en Facebook» publica las mismas fotos.
5. Borrar a mano lo de prueba si no se queda.
