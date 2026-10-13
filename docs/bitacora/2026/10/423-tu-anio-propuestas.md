# 423 · Prototipo: «Tu año» como imagen para compartir (OL-392)

**Fecha:** 2026-10-12 (tarde). **Rama:** `tu-anio-propuestas`, desde `origin/main` (`242ef825`, ya con el historial de OL-390). **Gestor:** Claude Fable 5.1 (Gestor de cambios VI). **Sin código de la app, sin migración.**
**Estado:** página armada y publicada en privado para los comentarios del founder; esperando la firma. Pieza 3 de 5 del historial («sigue con piezas faltantes», 12 de oct).

## El encargo

Del plan del historial que el founder aceptó el 8 de octubre (ASIGNACIONES, registro 47): pieza 3, «"Tu año" como imagen con el creador de cartel», a partir de su pedido de «currículos, reportes y "Tu año" tipo Spotify». Las piezas 1 (OL-390) y 2 (OL-391, en curso) ya dan los datos: lo pasado por artista y por lugar, y la marca «se canceló».

## La página: `docs/rediseno/prototipos/tu-anio-propuestas.html`

Mismo armazón que `historial-propuestas.html` (OL-389) y el módulo de portadas del sistema de `portadas-sistema.html` (OL-374). El teléfono de la izquierda enseña **la imagen tal cual se compartiría** (un lienzo de 1080 px, como un cartel del creador, escalado); el de la derecha, **dónde se abre en la app** (la ficha con su sección abierta, o el perfil) y la **vista previa** con «Compartir», «Guardar», «Publicación / Historia» y «Otra pinta». Datos reales de solo lectura (12 de oct): la cuenta del founder (36 eventos a los que dijo «Voy» y ya pasaron, 19 lugares, 42 artistas; su foto de perfil), Leo Traeger y Oscar Formacio, el CC200 y el Museo Francisco Cossío. Los carteles de sus eventos (58) y las imágenes de OL-389 van reducidos en `tu-anio-propuestas/` (111 archivos, 1,7 MB).

### Los ejercicios

- **P · El periodo:** año («Tu 2026», y mientras no acabe «del 17 sep al 12 oct») · este mes («Tu octubre») · hasta hoy («Tu año»).
- **F · El formato:** publicación 4:5 (1080×1350) · historia 9:16 (1080×1920, con 290 px libres arriba y 380 abajo para la interfaz de Instagram).
- **E · La pinta:** Bauhaus (el color base del sujeto con las figuras de las portadas del sistema, al 55 %) · fotos (mosaico de los carteles bajo un velo oscuro) · tipográfico (crema y negro, los números enormes, la segunda cifra en violeta).
- **D · Qué dice:** solo cifras · cifras y lo más («Donde más fuiste: MAC · 5 veces», «A quien más viste», «El mes más movido») · cifras y lista (4 títulos en publicación, 6 en historia, «y 28 más»).
- **N · Nombre y foto arriba.**
- **Q · Quién puede sacarla:** solo quien gestiona (la persona desde su perfil; el artista o el lugar desde su ficha si la gestionan) · cualquiera («2026 de Leo Traeger»).
- **O · Dónde se abre:** en la sección (botón «Tu año» al final de «Trayectoria» / «Historial» / «Tus planes») · junto a Compartir · en el menú «···» · aviso en Inicio solo en diciembre.

Las cifras cambian por sujeto: en la persona eventos, lugares y artistas; en el artista fechas, lugares y cuántos fueron; en el lugar eventos, artistas y cuántos fueron. Una cifra en cero no se pinta (dos tarjetas en vez de tres). El medidor cuenta datos que dice la imagen, toques de la ficha a compartir, la letra más chica (34 px en 1080) y la medida.

### La propuesta del gestor (preajuste «Propuesta», por firmar)

**P año · F publicación · E Bauhaus · D cifras y lo más · N · Q solo quien gestiona · O en la sección.** Por qué está en la página («Por qué») y en la sección «Cómo se haría»: una plantilla nueva del creador de cartel que recibe sujeto y periodo, por la misma ruta a 1080 px; compartir con la hoja del teléfono con la imagen como archivo y, si no, guardar; colores de las portadas del sistema; nada de tablas nuevas; medir `tu_anio`.

## Capturas (`docs/rediseno/capturas-423/`)

La imagen a 1080 px tal cual (01 a 11) y la app a 390×844 (12 a 21):
- `01-imagen-tu-2026-bauhaus-4x5`: la propuesta para el founder: foto y «Robscan», «Tu 2026 · del 17 sep al 12 oct», 36 eventos · 19 lugares · 42 artistas, lo más (MAC 5 veces, Rob Maldonado 2 veces, septiembre 22 eventos), el símbolo SN y el dominio; triángulos anidados en violeta a la derecha.
- `02-…-historia`: lo mismo en 9:16 con sus tapas. `03-…-fotos`: mosaico de carteles. `04-…-tipografico`: crema y negro. `05-…-lista-historia`: con los títulos. `06-…-solo-cifras-sin-foto`. `07-…-tu-octubre`: el periodo mes.
- `08-imagen-leo-traeger` (3 fechas · 2 lugares, círculos anidados), `09-…-el-2026-de-leo-traeger` (Q cualquiera), `10-imagen-cc200` (13 eventos · 11 artistas · 2 fueron, retícula de cuadros), `11-imagen-cossio-fotos`.
- `12-app-entrada-perfil-seccion`: Perfil con «Tus planes · 36 eventos a los que fuiste» y el botón «Tu año». `13-app-vista-previa-compartir` y `14-…-historia`: la vista previa. `15` a `18`: las cuatro entradas (sección, junto a Compartir, menú, aviso en Inicio). `19` y `20`: la hoja. `21-ancho-1280`.

## Tropiezos

- `.ceja` del armazón (la ceja de las tarjetas de Inicio) pisaba la ceja de la imagen: ahora `.ceja-l`.
- Para capturar la imagen a 1080 hay que esconder las otras columnas: el lienzo escalado vive dentro de un teléfono de 390.
- El año del founder cabe; un lugar con 200 eventos pediría «lo más» sin lista, que es la propuesta.

## Lo que sigue

Firma («Propuesta» o «Propuesta · F historia», por ejemplo) y, con ella, la pieza en código con un agente: la plantilla en `src/lib/carteles/plantillas/`, la ruta, la pantalla de vista previa, el botón en la sección (OL-390) y en Perfil, y la medición. Después la pieza 4 (currículo y reporte en PDF) y la 5 (lo anterior a la app e integrantes).
