# 383 · Toda imagen que sube la persona se prepara en su teléfono antes de comprobar el peso

**Pieza:** OL-352. **Rama:** `comprimir-subidas` (sobre `origin/main` `23cf9bf2`). **Fecha:** 2026-10-08. **Operador:** Claude (agente del gestor V).
**Estado:** hecho y probado con pruebas unitarias y de componentes en Chromium (subida de verdad con Storage simulado); falta el iPhone del founder y la vista previa de Vercel. **Sin migración.**

## Qué vio el founder (2026-10-08)

Al crear un cartel con la foto propia (y al subir una portada), «La foto pesa más de 5 MB» con una captura de pantalla del carrusel de Instagram (PNG grande). «El usuario no tiene compresores; ¿le podemos ayudar a comprimir la foto como la necesitamos? Podemos incluir compresor en todos los casos.»

**La causa:** `subirFoto` rechazaba `archivo.size > 5 MB` **antes** de reducir. Una captura de pantalla del iPhone (PNG de 1290×2796) pesa 5-9 MB y, reducida y en JPEG, unos cientos de KB: se rechazaba algo que cabía de sobra.

## Qué cambió

1. **`prepararImagen`** (`src/lib/imagen.ts`, sustituye a `reducirImagen`): una sola preparación para todas las subidas.
   - **Lee** con `createImageBitmap(archivo, { imageOrientation: "from-image" })` (gira según el EXIF); si falla, sin opciones; si falla, con una `<img>` y `decode()` (HEIC en un Safari viejo, un PNG raro: lo que el navegador sepa mostrar).
   - **Reduce** al lado máximo de su uso (abajo) con `imageSmoothingQuality = "high"`. Nunca agranda.
   - **Pasa a JPEG** con fondo blanco y calidad **0,85**; si no cabe en el tope (5 MB, el del bucket), **0,75** y **0,65**; si aún no, baja el lado a **¾** y a **½** con las mismas calidades (`ajustarAlTope`, separada del lienzo para probarla). Con la mitad cabe siempre.
   - **PNG solo con transparencia real** (algún píxel no opaco, mirado solo en PNG, WebP y GIF) y si cabe: un logotipo conserva su fondo transparente. Una captura de pantalla no tiene transparencia: va a JPEG.
   - Una JPEG que ya cabe en el lado y pesa ≤ 600 KB se sube tal cual (como antes).
   - Devuelve `{ archivo }` (nombre `.jpg` o `.png` y su tipo) o `{ fallo: "lectura" }`.
2. **`subirFoto` prepara siempre antes de comprobar el peso** (`src/lib/subirFoto.ts`) y recibe el uso (`"cartel" | "portada" | "perfil"`, por omisión `portada`). «La foto pesa más de 5 MB. Elige otra.» (`motivo: "pesa"`) solo sale si no se pudo preparar y la original pasa del tope; si no se pudo leer y cabe, «No se pudo leer la imagen. Prueba con otra.» (`motivo: "lectura"`, nuevo). Si un navegador devolviera algo preparado de más de 5 MB, tampoco se sube (el bucket lo rechazaría con un aviso menos claro).
3. **Todos los caminos pasan por `subirFoto`** (revisado uno por uno):

   | Camino | Archivo | Uso |
   |---|---|---|
   | Cartel del alta y de editar evento | `nuevo/evento/useLeerCartel.ts` (lo usan `PasoCartel` y editar) | `cartel` (2000) |
   | Foto propia del creador de cartel (OL-337) | `eventos/[id]/cartel/CreadorCartel.tsx` | `cartel` (2000) |
   | Portada de lugar (alta por pasos y editar) | `nuevo/lugar/PasosLugar.tsx`, `lugares/FormularioLugar.tsx` | `portada` (1600) |
   | Foto y portada de artista (alta por pasos, alta corta con «Agregar foto» de `Publicado`, editar) | `nuevo/artista/PasosArtista.tsx`, `AltaArtista.tsx`, `artistas/FormularioArtista.tsx` | `portada` (1600) |
   | Foto de perfil | `ajustes/editar/FormularioPerfil.tsx` | `perfil` (800) |

   No suben imágenes: `SelectorQuien.tsx` (solo muestra fotos), `admin/[seccion]/page.tsx` (la administración pone direcciones, no archivos). La pared (`obra/[id]/pared/Pared.tsx`) sube su instantánea PNG dibujada por la app al bucket de instantáneas, no una imagen de la persona: no cambia. El creador de cartel antes reducía a 1600 por `subirFoto`; ahora a 2000.
4. **El aviso del alta de evento** (`falloAlSubir`, `eventos/estadoCartel.ts`): con `lectura` dice «No se pudo leer la imagen.» (sin el «Prueba con otra», que ya dice el chip), como hace con `pesa`.
5. **Mientras prepara** se ve el estado de espera que ya tenía cada flujo: «Leyendo el cartel…» / «Subiendo el cartel…» en el alta, «Subiendo la foto…» en el creador, «Subiendo…» y «Subiendo la foto…» en la portada. Sin avisos nuevos.
6. **Topes del servidor sin cambio** (OL-329: 12 Mpx, 8000 px por lado, `imagenAdmitida`; y el plugin de Fotos de OL-332): lo más grande que sube ahora son 2000 px de lado (4 Mpx).

## Lados y calidades, y por qué

- **Cartel (2000):** el creador dibuja la historia a 1080×1920 y la foto va a sangre: una foto vertical necesita ~1920 px de alto para no estirarse (con 1600 se estiraba un 20 %). El cartel del evento además se lee (lectura automática) y se abre a pantalla completa en el visor, donde la letra chica tiene que leerse.
- **Portada (1600, igual que antes):** se sirve por el optimizador de Vercel, cuyo ancho mayor útil en el teléfono es 1280 (3× de 390 ≈ 1170). La foto del artista se queda aquí y no en 800 porque también sale en carteles y al compartir.
- **Perfil (800):** solo se ve de avatar.
- **Calidad 0,85** primero (antes 0,82 fija): casi siempre basta y deja la letra de un cartel nítida; 0,75 y 0,65 solo si no cabe. Con 5 MB de tope, en la práctica nunca se llega a bajar el lado.

## Pesos antes y después

La captura de prueba (`capturaPng`, hecha con el lienzo en las pruebas: barra, foto del carrusel con grano y doce renglones de texto) pesa **6 334 228 bytes** en PNG, 1290×2796. Antes se rechazaba en las tres pantallas («pesa más de 5 MB»).

| Uso | Lado | Después (JPEG 0,85) | Medido en |
|---|---|---|---|
| Cartel del alta | 923×2000 | 365 688 bytes (357 KB) | prueba de componentes (`AltaEvento`) |
| Foto propia del creador | 923×2000 | 365 688 bytes | prueba de componentes (`CreadorCartel`) |
| Portada de lugar | 738×1600 | 214 191 bytes (209 KB) | prueba de componentes (`AltaLugar`) |
| Perfil | 369×800 | 46 151 bytes (45 KB) | Chromium, misma captura |

Con 0,65 la de 2000 pesaría 183 743 bytes: la primera calidad cabe con mucho margen.

## Pruebas

- `npm run lint` (solo el aviso viejo de `VisorImagen`), `npm run typecheck`, `npm test` (**3405**, 187 archivos), `npm run inventario` (sin novedades) y `npm run medir` (37 pantallas × 4 anchos, sin novedades).
- **Unitarias nuevas:**
  - `src/lib/imagen.test.ts` (8): `ajustarAlTope` con un codificador simulado: la primera calidad basta en un intento; baja la calidad antes que el lado; baja el lado a 1500 y 1000 (de 2000); si nada cabe, null tras los 9 intentos; un codificador que no da nada o da vacío no cuenta; otro tope. Los lados por uso, y fuera del navegador no toca el archivo.
  - `src/lib/subirFoto.test.ts` (10, 4 nuevas): una captura de más de 5 MB que se comprime sube; el lado por uso (800, 1600, 2000); sin poder leer, «pesa» si la original pasa del tope y «No se pudo leer la imagen» si no, y nunca sube; lo que aún preparado pasa del tope no sube. La de «no sube ni reduce una foto demasiado grande» se quitó: es justo lo que esta pieza cambia.
  - `estadoCartel.test.ts`: el aviso de `lectura`.
- **Componentes en Chromium** (Playwright; la subida es la de verdad, `subirFoto` + `prepararImagen`, y solo Storage es un doble que mide en la página lo que llega; `src/lib/imagenDePrueba.mjs`):
  - `AltaEvento`: la captura de 6,3 MB sube como JPEG de 357 KB y 923×2000 a `lugares/<id>/evento-<uuid>.jpg`; «Leyendo el cartel…» mientras; la lectura y «Revisa» usan lo subido; ningún «pesa más de 5 MB». **EXIF girado:** una JPEG de 2400×1800 con orientación 6 sube a 1500×2000 y con la esquina de arriba a la izquierda azul (bien girada). **No es imagen:** un texto llamado `.jpg` dice «No se pudo leer la imagen.» y no se sube nada.
  - `CreadorCartel`: la misma captura como foto propia: «Subiendo la foto…», JPEG de 923×2000 a `lugares/ana/cartel-foto-<uuid>.jpg`, se comprueba y queda «Tu foto».
  - `AltaLugar`: la captura como portada: «Subiendo…» y el botón «Subiendo la foto…», JPEG de 738×1600 y < 1 MB, y la portada a la vista.
  - Las pruebas de siempre de esos tres archivos y de `EditarEvento`, `ClasesEvento`, `Sugerencias`, `AltaArtista`, `FormularioLugar.editar` y `FormularioArtista` siguen en verde (158/158 en los siete, más 7/7 de `CreadorCartel` y 19/19 de `AltaLugar`).

## Capturas (`docs/rediseno/capturas-383/`, 390×844)

Abiertas y miradas una por una. La imagen es la captura de prueba (sol, cerros y el texto del pie), hecha aquí.

- `383-alta-1-leyendo`: el alta de evento con la miniatura de la captura (el sol, los cerros y los renglones de texto debajo) y «Leyendo el cartel…» mientras se prepara y sube. Letra Bricolage, a 2×.
- `383-alta-2-revisa`: «Revisa» con «Leído del cartel» y la miniatura de lo **ya subido** (el JPEG preparado), nítida, con los renglones de texto legibles a ese tamaño.
- `383-cartel-1-subiendo`: «¿Cuál te gusta?» con «Subiendo la foto…» en el renglón de la cámara. Las cuatro miniaturas salen en rosa liso: en la prueba, el servidor del cartel es un PNG de un píxel (como en las pruebas de la 366), no los diseños. Letra Arial (el arnés de esa prueba no carga Bricolage).
- `383-cartel-2-tu-foto`: el renglón «Tu foto · Quitar la foto» con la miniatura de la foto ya preparada (el sol y los cerros).
- `383-portada-1-subiendo`: «¿Quieres agregar algo?» del alta de lugar con «Subiendo…» en el campo y el botón del pie «Subiendo la foto…» apagado.
- `383-portada-2-puesta`: la portada puesta (recortada por la vista, el sol y los cerros) y «Cambiar la foto»; el botón vuelve a «Listo».

## Decisiones del operador (por confirmar)

1. **Un archivo que el teléfono no sabe leer ya no se sube** aunque pese menos de 5 MB (antes se subía tal cual). Lo que no se puede dibujar en el lienzo tampoco lo puede usar el cartel del servidor (solo JPEG, PNG y WebP, OL-329) y casi nunca lo muestran los navegadores. En el iPhone, Safari entrega las fotos HEIC como JPEG al elegirlas y, si no, las lee con `createImageBitmap` o con `<img>`.
2. **Sin medición nueva.** El encargo pedía añadir el motivo del fallo «si hay acciones de subida medidas»: la lista cerrada de `medir.ts` solo mide el éxito de la foto propia (`cartel_foto_puesta`) y la lectura del cartel (`cartel_leido`), ninguna subida fallida. Medir los fallos sería un evento nuevo (p. ej. `foto_no_subida` con `motivo: pesa | lectura | subida`) y su renglón en el aviso de privacidad: lo decide el founder.
3. **GIF animado** pasa a JPEG con su primer cuadro (como antes, que también lo reducía a JPEG).
4. El fondo de lo transparente que no cabe como PNG sale **blanco**, no negro.

## Pendiente

- El iPhone del founder (Safari y la app instalada): una captura de pantalla real del carrusel por el creador de cartel, una portada y una foto HEIC de la cámara; la vista previa de Vercel.
- Medir los fallos de subida si el founder lo quiere (decisión 2).
