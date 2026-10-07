# 353 · Creador de cartel por plantillas

**Pieza:** OL-324 (punto 5, el último, del orden firmado). **Rama:** `creador-de-cartel` (sobre `origin/main` `20fd86d0`). **Fecha:** 2026-10-07. **Operador:** Claude Opus 5.5 (agente del gestor IV).
**Estado:** hecho y probado con la app compilada contra el respaldo local (Chrome de la Mac a 390 y 320) y con el banco de PostgreSQL local; falta el iPhone real, medir en la vista previa de Vercel con sesión y que el gestor aplique la migración. **Migración que solo añade:** `20261007120000_carteles_generados.sql`.

## Qué se encargó

Construir el generador del doc [52](../../../rediseno/52-generador-de-flyers.md) (aceptado en lo general por el founder): plantillas hechas de antemano, cuatro opciones por evento elegidas por reglas (sin IA), máximos por campo, formatos 4:5 y 9:16, memoria del estilo del lugar, color de la foto e imagen por orden. Resolver como prueba técnica las dudas del §4 (cómo se dibuja) y dejar la estructura para un tope o un cobro **sin decidirlos**.

## El dibujo: decidido con medidas

Prueba corta antes de diseñar (el §4 lo pedía: decide qué CSS se puede usar):

| Motor (1080 px, con foto real de 1,7 MP) | Armar el SVG | Rasterizar | PNG | JPEG 88 |
| --- | --- | --- | --- | --- |
| satori + @resvg/resvg-js | 4–6 ms | 68–170 ms (1,4 s si carga las fuentes del sistema: hay que apagarlo) | 1,7–2,3 MB | 210–270 KB |
| **satori + sharp (librsvg)** | 3–5 ms | **41–130 ms** | 1,9–2,8 MB | 210–265 KB |

A la vista salen iguales (comparadas lado a lado). **Elegido: satori + sharp**, en el servidor. sharp ya hacía falta para preparar la foto, sacar su color y dar el JPEG; resvg era un paquete nativo más y más lento con foto. `next/og` no sirve: no deja leer las cajas que coloca satori (`onNodeDetected`), que es la comprobación de que nada se sale.

**Salida en JPEG de calidad 90 sin submuestreo de color** (no PNG, que pedía el encargo): con foto el PNG pesa 1,7–2,8 MB y el JPEG ~0,15–0,25 MB, y Instagram y WhatsApp vuelven a comprimir los dos. Las letras de color quedan nítidas con 4:4:4. Anotado como decisión por confirmar.

Medido en la app compilada (`next start`, Mac M, petición completa con sesión, consulta al respaldo y foto ya en caché; mediana de seis plantillas):

| Caso | Miniatura (360) | Tamaño real (1080) |
| --- | --- | --- |
| 4:5 con foto | 88–94 ms · 33 KB | 181–193 ms · 140–156 KB |
| 9:16 con foto | 92–97 ms · 36 KB | 232–244 ms · 150–167 KB |
| 4:5 sin foto | 29 ms · 19 KB | 99 ms · 83 KB |
| 9:16 sin foto | 32 ms · 20 KB | 130 ms · 91 KB |

`Server-Timing` de un cartel 4:5 con foto: preparar la foto 26 ms, SVG 8 ms, rasterizar 129 ms. El paquete de la función (`.nft.json` de la ruta) suma 33 MB rastreados en la Mac, lejos del tope de 250 MB de Vercel; las cinco letras van con `outputFileTracingIncludes` y satori va fuera del paquete (`serverExternalPackages`: su harfbuzz en WebAssembly se lee de `node_modules`; empaquetado, la ruta no existe y da 500, visto en el primer `next start`). **Falta medir en la vista previa de Vercel:** la ruta pide sesión de quien gestiona el evento y desde aquí no se puede entrar a producción; con una sesión, abrir `/api/cartel-nuevo/<slug>?plantilla=cine-sangre&formato=4x5` y leer `Server-Timing`. Si Vercel no aguantara, la salida anotada es dibujar en el teléfono con `<canvas>` y subir el PNG, pero el tiempo medido no lo sugiere.

## Qué hay

- **`src/lib/carteles/`** (puro salvo `dibujar`, `cargar` y `generar`, que son del servidor):
  - `fuentes/`: cinco instancias fijas de Bricolage Grotesque (condensada negra, ancha negra, ligera, media y regular; ~50 KB cada una) con su `OFL.txt`. satori no lee fuentes variables ni woff2. Salen de la fuente variable de Google Fonts (OFL, la misma de la app) con `scripts/carteles/instancias.py`, que también escribe `anchos.json`.
  - `medir.ts`: mide el texto con la tabla de anchos y lo parte en renglones antes de dibujar; busca el tamaño mayor que cabe en los renglones y el alto de su caja; renglones parejos en los títulos; si no cabe ni al mínimo, corta con «…» y lo dice. Los renglones se dibujan tal cual (satori no decide ningún corte).
  - `datos.ts`: los textos y sus máximos (doc 52 §3.2): etiqueta 28 (la disciplina o subcategoría del primer artista), título 80 en tres tramos (25/50/80), subtítulo 90 (solo si el título trae dos partes unidas por «:», raya o guion entre espacios: es el texto de la persona partido donde ella lo partió, sin IA), fecha y hora fijas («Sábado 11 de octubre», «19:00 h», «Del 9 al 11 de octubre», «Horario por día»), lugar 60, artistas 8 y «y N más», precio 24 con `claseDeCosto` («Entrada libre», «Cooperación solidaria», el texto de quien publicó; nunca «gratis» de la app) y la dirección corta `somosnosotros.org/e/<slug>`. Quita lo que la fuente no dibuja (emojis).
  - `paleta.ts`: 12 paletas (fondo, texto, suave, acento, texto sobre acento), **todas AA probadas par por par**; cada plantilla admite unas cuantas y elige la más parecida al tono dominante de la foto (pesa más el fondo); sin foto, la de siempre o una rotada por el id del evento.
  - `plantillas/`: **doce plantillas, seis familias × 2** sacadas de las muestras del founder (tipografía, foto y formas; sin ilustración ni lettering): cine (foto a sangre; banda de color), tipográfico (franja con la fecha girada; la fecha en grande), feria (papel picado de formas; boleto y confeti), zine (cinta, sello y resaltador, foto en duotono; letras recortadas), galería (foto con aire y tres columnas rotuladas; foto en columna) y deco (arco con abanico; sol con rayos, foto entonada). Cada una compone distinto por tramo de título, tiene versión con foto y sin foto (sin foto la fecha es la imagen), respeta lo que tapa la interfaz en una historia (250 px arriba, 340 abajo) y calcula el alto de cada texto antes de dar a la foto lo que sobra. Piezas comunes en `piezas.tsx`, tokens en `tokens.ts`.
  - `elegir.ts`: descarta las que piden foto si no hay ninguna imagen; ordena por afinidad (tipo de lugar, disciplina; cuenta en contra no enseñar a todos los artistas o tener que cortar el título); la memoria del lugar va primero; cuatro de familias distintas; «Ver otros diseños» trae la tanda siguiente (tres tandas).
  - `ofrecer.ts`: compone las doce sin dibujar (<1 ms) para saber cuáles cortan el título (capa 4 del doc).
  - `dibujar.ts`, `generar.ts`, `cargar.ts`: carga del evento con lugar, artistas y memoria; imagen por orden (foto del evento salvo que ya sea un cartel hecho aquí, portada o foto del artista, portada del lugar), **solo del Storage propio** (`cartelDescargable`); la imagen se trae una vez y queda en la caché de datos de Next un día y en la memoria del proceso (las cuatro miniaturas, la vista previa y la descarga piden la misma: cuida la cuota de salida de Supabase).
- **Ruta `GET /api/cartel-nuevo/[id]`** (`?plantilla=&formato=4x5|9x16&ancho=360|720|1080&titulo=&descarga=1&v=`): solo quien gestiona el evento (si no, 404); JPEG; `Server-Timing`; con `descarga=1` va como archivo (`cartel-<slug>-<plantilla>.jpg`) y anota la fila en `carteles_generados`; sin él, caché privada de un día con `v` (la versión del evento).
- **Pantalla `/eventos/[id]/cartel`** con el armazón `PorPasos`: «¿Cuál te gusta?» (cuatro miniaturas en rejilla 2×2, toque elige, «Ver otros diseños») → «Así queda» (chips «Publicación 4:5» / «Historia 9:16», vista previa grande de la proporción del formato, y en el pie «Descargar el cartel» —el mismo `BotonDescargarCartel`, que en la app dice «Guardar en Fotos»— y «Usar como cartel del evento», que pregunta antes en una hoja). Si el diseño corta el título: «El título no cabe completo en este diseño.» y «Acortar título», que abre «Título del cartel» con ✕ y contador, encima de la vista previa (nunca bajo el pie); solo cambia el cartel. Memoria de pantalla (paso, tanda, diseño, formato y título).
- **«Usar como cartel del evento»** (`acciones.ts`): dibuja en el servidor, sube a `fotos/lugares/<id>/cartel-generado-<uuid>.jpg` con la sesión de quien lo usa, lo pone como `imagen` del evento, anota la fila con su `ruta` y vuelve a la ficha. La lectura con IA no se dispara (solo corre al subir en el alta). La imagen anterior no se borra.
- **Dónde entra:** en la ficha del evento, para quien lo gestiona, «Crear cartel» en el menú de ajustes (siempre) y como acción redonda en el sitio de «Cartel» cuando el evento no tiene cartel; en «Publicado» del alta, sin cartel, la sugerencia en punteado «Crea su cartel» (hoy no hay otra sugerencia en ese «Publicado»; si OL-323 suma la suya, va una sola).
- **`/e/<slug>`**: el proxy responde 308 a `/eventos/<slug>` sin consulta (`destinoEnlaceCorto`, probado con `curl`: `308 → /eventos/oca`).
- **`BotonDescargarCartel`** acepta `href` (la imagen generada) y olvida lo traído al cambiar de imagen. **`IconoCartel`** nuevo.
- **Migración `20261007120000_carteles_generados.sql`** (solo añade; la aplica el gestor): `id, evento_id, perfil_id, plantilla, formato, ruta, creado_en`, dos índices (por persona y fecha: el conteo del mes; por evento), RLS: lee su autor o la administración; escribe su autor, a su nombre y en un evento que gestiona; edita y borra solo la administración (el conteo no se toca desde la cuenta). Prueba en `supabase/tests/pg/carteles-generados.test.mjs`.

## Decisiones del operador (por confirmar)

1. satori + sharp en el servidor, no resvg ni dibujo en el teléfono (medidas arriba).
2. JPEG 90 (4:4:4) para todo, no PNG.
3. El sello: la dirección corta del evento (`somosnosotros.org/e/<slug>`) en el pie hace de sello discreto; si no cabe, solo el dominio. Va siempre (no hay cobro); la plantilla lo apaga con `sello: false` el día que el founder decida.
4. `/e/<slug>` como dirección corta (no existía).
5. Subtítulo solo partiendo el título donde la persona lo partió («:», raya o « - »); el reparto con IA (capa 3 del doc) queda anotado y sin hacer.
6. Sin foto se descarta solo «cine a sangre» (la única que necesita foto); las demás tienen versión sin foto, que también es el respaldo si la imagen falla al dibujar.
7. La memoria del lugar ve solo los carteles propios (la RLS lee lo de su autor): es «tu estilo en este lugar», no el del lugar entero.
8. «Crear cartel» en la ficha: en el menú siempre y redondo solo sin cartel (a 320 pasa a un segundo renglón, como manda la regla de las acciones).
9. Se ofrecen y se componen las opciones en 4:5; si una corta el título solo en 9:16, la pantalla no lo avisa (el corte se ve con «…»).
10. «Usar como cartel» no borra la imagen anterior del bucket (como el cambio de cartel en el formulario).
11. Las miniaturas y la vista previa se dibujan en el servidor (no en el teléfono, como proponía el §3.6): cuestan ~0,1 s y ~35 KB cada una y no se guardan en Storage.

## Para el founder (decide)

- El tope o cobro (su ejemplo: uno al mes sin costo y paquetes de 6 y 15): la tabla ya cuenta por persona y mes; no hay tope.
- Si el sello va siempre o solo en los sin costo.
- Si «Usar como cartel» se queda (guarda en Storage) o solo se descarga.

## Pruebas

- `npm test`: **2766**, 161 archivos (nuevas: paletas AA, medir, datos —tramos, máximos, precio, partir título, fechas—, elegir —descarte, afinidad, memoria, tandas— y el dibujo: 12 plantillas × 2 formatos × con y sin foto × 8 casos del banco —título de 107, sin nada, 8 artistas, lugar largo, precio largo, horario por día, palabra larguísima, subtítulo— comprobando con las cajas de satori que ningún texto se sale del lienzo, entra en lo que tapa la interfaz de una historia ni se encima con otro; con datos normales nada se corta con «…»; un caso por combinación se rasteriza y se comprueban sus medidas; ~19 s).
- `npm run test:db` (Postgres 17 local): **1647 comprobaciones, 0 fallos** con la migración nueva.
- Componentes de `BotonDescargarCartel` y `AltaEvento`: 93/93.
- `lint` (solo el aviso viejo de `VisorImagen`), `typecheck`, `inventario` sin novedades, `medir` sin novedades (29 pantallas × 4 anchos). La pantalla nueva no está en `medir` (su respaldo no sirve imágenes).
- Un rótulo de galería salió «CUÁND…» en la primera tanda de capturas (tamaño mayor que el mínimo); corregido y cubierto por la prueba «con datos normales nada se corta».

## Capturas (`docs/rediseno/capturas-353/`)

App compilada contra el respaldo local (fotos neutras hechas aquí: el marcador del doc 52 en tres tonos; sin terceros), Chrome a doble densidad.

- `353-390-01-opciones`: «¿Cuál te gusta?» con cuatro familias para un evento de teatro en un foro con portada verde (cine, deco, feria, tipográfico); la paleta sigue al verde de la foto. Bien: se lee el título en cada miniatura.
- `353-390-02-otras-opciones`: la segunda tanda (cine banda, deco sol, feria boleto, tipográfico fecha).
- `353-390-03-asi-queda-4x5` y `353-320-03`: «Así queda» en publicación; la vista previa toma el alto que deja el pie (en una primera vuelta, a 320 quedaba bajo el pie: se ajustó) y cabe entera en los dos anchos.
- `353-390-04-asi-queda-9x16` y `353-320-04`: historia, más angosta para caber; el texto empieza bajo los 250 px de la interfaz.
- `353-390-05-confirmar` y `353-320-05`: la hoja «¿Usar este cartel en el evento?».
- `353-390-06-opciones-titulo-largo` y `353-320-06`: título de 107 caracteres: todas cortan («…») y se ofrecen igual.
- `353-390-07-no-cabe` y `353-320-07`: «El título no cabe completo en este diseño.» y «Acortar título».
- `353-390-08-acortado` y `353-320-08`: el campo con ✕ y el cartel ya con «LXS COLOCAOS, la última fogueada».
- `353-390-09-opciones-sin-foto` y `353-320-09`: sin ninguna imagen: galería, deco, cine banda y tipográfico, cada una con la fecha como imagen. Lo flojo: «OCA» en galería deja mucho aire.
- `353-390-10-ficha-crear-cartel` y `353-320-10`: la ficha con «Crear cartel» en el sitio de «Cartel»; a 320 baja a un segundo renglón.
- `carteles/` (12, a tamaño real, como se descargan): cine a sangre 4:5 (foto cálida → paleta vino), deco arco 9:16, feria picado 4:5, cine banda 9:16, zine cinta 4:5 (duotono rosa), galería marco 4:5 y galería columna 9:16 con el título de 107 cortado, tipográfico franja 4:5 sin foto (fecha girada), feria boleto 9:16 sin foto, tipográfico fecha 4:5 (horario por día), zine recorte 4:5 (cooperación solidaria), deco sol 4:5 (título partido en « - »). Bien: nada se encima, los datos se leen a tamaño real, las historias dejan libre lo de la interfaz. Flojo: los títulos muy cortos dejan aire en tipográfico franja y galería; los datos de las historias quedan arriba del hueco de abajo (es lo que tapa Instagram).

No capturado: «Crea su cartel» en «Publicado» (pide recorrer el alta; sus pruebas de componentes pasan) y el teclado del iPhone sobre «Título del cartel».

## Pendiente

- Aplicar la migración (gestor) antes de unir.
- Medir en la vista previa de Vercel con sesión (`Server-Timing`).
- Probar en el iPhone: descarga y «Guardar en Fotos» de la imagen generada, el teclado sobre «Título del cartel», «Usar como cartel».
- Al unir con OL-318 (`confirmacion-cartel`), el botón trae su confirmación sola (es la misma pieza); el choque en `BotonDescargarCartel.tsx` es de dos líneas.
