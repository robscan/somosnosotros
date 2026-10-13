# 423 · Prototipo: «Tu año» como imagen para compartir (OL-392)

**Fecha:** 2026-10-12 (tarde). **Rama:** `tu-anio-propuestas`, desde `origin/main` (`242ef825`, ya con el historial de OL-390). **Gestor:** Claude Fable 5.1 (Gestor de cambios VI). **Sin código de la app, sin migración.**
**Estado:** firmada por el founder el 12 de oct por la noche («Te acepto porque no es importante ahora. Vamos a avanzar»), tal como la segunda propuesta: P año · F publicación · C calma · E crema · D cifras y lo más · N · Q solo quien gestiona · O en la sección. Pasa a código como OL-394 (bitácora 425). Pieza 3 de 5 del historial («sigue con piezas faltantes», 12 de oct).

## El encargo

Del plan del historial que el founder aceptó el 8 de octubre (ASIGNACIONES, registro 47): pieza 3, «"Tu año" como imagen con el creador de cartel», a partir de su pedido de «currículos, reportes y "Tu año" tipo Spotify». Las piezas 1 (OL-390) y 2 (OL-391, en curso) ya dan los datos: lo pasado por artista y por lugar, y la marca «se canceló».

## La página: `docs/rediseno/prototipos/tu-anio-propuestas.html`

Mismo armazón que `historial-propuestas.html` (OL-389) y el módulo de portadas del sistema de `portadas-sistema.html` (OL-374). El teléfono de la izquierda enseña **la imagen tal cual se compartiría** (un lienzo de 1080 px, como un cartel del creador, escalado); el de la derecha, **dónde se abre en la app** (la ficha con su sección abierta, o el perfil) y la **vista previa** con «Compartir», «Guardar», «Publicación / Historia» y «Otra pinta». Datos reales de solo lectura (12 de oct): la cuenta del founder (36 eventos a los que dijo «Voy» y ya pasaron, 19 lugares, 42 artistas; su foto de perfil), Leo Traeger y Oscar Formacio, el CC200 y el Museo Francisco Cossío. Los carteles de sus eventos (58) y las imágenes de OL-389 van reducidos en `tu-anio-propuestas/` (111 archivos, 1,7 MB).

### Segunda vuelta (12 de oct, tarde)

El founder vio la primera página: «composición deficiente, saturada y poco legible». Tenía razón: la figura de las portadas iba detrás de los números sobre violeta pleno, tres tarjetas iguales y tres líneas de «lo más». La segunda vuelta separa **C · la composición** (calma · cartel · pila) de **E · el color** (crema · color · fotos) y cambia la propuesta a **calma sobre crema**: un solo número protagonista (440 px) con su frase («eventos a los que fuiste»), los otros dos chicos debajo, una sola línea de «lo más», y la figura de las portadas chica (300 px) en su esquina sin tocar texto; crema y negro de las portadas del sistema, el color del sujeto solo en la figura. Las capturas de abajo son de esta vuelta.

### Los ejercicios

- **P · El periodo:** año («Tu 2026», y mientras no acabe «del 17 sep al 12 oct») · este mes («Tu octubre») · hasta hoy («Tu año»).
- **F · El formato:** publicación 4:5 (1080×1350) · historia 9:16 (1080×1920, con 290 px libres arriba y 380 abajo para la interfaz de Instagram).
- **C · La composición:** calma (número protagonista, figura chica en su esquina) · cartel (banda de color arriba con la figura y el título, números abajo sobre crema) · pila (solo tipografía, los números apilados con su palabra, el primero en el color del sujeto).
- **E · El color:** crema (fondo crema y texto negro; el color del sujeto en la figura y un acento) · color (el fondo del color del sujeto con texto crema) · fotos (mosaico de carteles con velo, solo en la banda de «cartel»).
- **D · Qué dice:** solo cifras · cifras y lo más (una línea: «Donde más fuiste: MAC · 5 veces») · cifras y lista (4 títulos en publicación, 6 en historia, «y 28 más»).
- **N · Nombre y foto arriba.**
- **Q · Quién puede sacarla:** solo quien gestiona (la persona desde su perfil; el artista o el lugar desde su ficha si la gestionan) · cualquiera («2026 de Leo Traeger»).
- **O · Dónde se abre:** en la sección (botón «Tu año» al final de «Trayectoria» / «Historial» / «Tus planes») · junto a Compartir · en el menú «···» · aviso en Inicio solo en diciembre.

Las cifras cambian por sujeto: en la persona eventos, lugares y artistas; en el artista fechas, lugares y cuántos fueron; en el lugar eventos, artistas y cuántos fueron. Una cifra en cero no se pinta (dos tarjetas en vez de tres). El medidor cuenta datos que dice la imagen, toques de la ficha a compartir, la letra más chica (34 px en 1080) y la medida.

### La propuesta del gestor (preajuste «Propuesta», por firmar)

**P año · F publicación · C calma · E crema · D cifras y lo más · N · Q solo quien gestiona · O en la sección.** Por qué está en la página («Por qué») y en la sección «Cómo se haría»: una plantilla nueva del creador de cartel que recibe sujeto y periodo, por la misma ruta a 1080 px; compartir con la hoja del teléfono con la imagen como archivo y, si no, guardar; colores de las portadas del sistema; nada de tablas nuevas; medir `tu_anio`.

## Capturas (`docs/rediseno/capturas-423/`)

La imagen a 1080 px tal cual (01 a 12) y la app a 390×844 (13 a 21):
- `01-imagen-tu-2026-calma-crema-4x5`: la propuesta: foto y «Robscan» arriba, «36» enorme en negro sobre crema, «eventos a los que fuiste», «Tu 2026 · del 17 sep al 12 oct» en gris, los triángulos anidados en violeta a la derecha sin tocar texto, «19 lugares · 42 artistas» chicos, una línea «Donde más fuiste: MAC · 5 veces», el símbolo SN y el dominio.
- `02-…-calma-historia`: lo mismo en 9:16 con sus tapas. `03-…-cartel`: la banda violeta arriba con «Tu 2026» y la figura, los tres números abajo. `04-…-cartel-fotos`: la banda con el mosaico de carteles. `05-…-pila`: los tres números apilados, el 36 en violeta. `06-…-calma-color`: calma sobre violeta con texto crema. `07-…-lista-historia`: con los títulos. `08-…-tu-octubre`: el periodo mes.
- `09-imagen-leo-traeger` (3 fechas, círculos anidados), `10-…-el-2026-de-leo-traeger-cartel` (Q cualquiera), `11-imagen-cc200` (13 eventos con 11 artistas · 2 fueron, retícula de cuadros azules), `12-imagen-cossio-pila`.
- `12-app-entrada-perfil-seccion`: Perfil con «Tus planes · 36 eventos a los que fuiste» y el botón «Tu año». `13-app-vista-previa-compartir` y `14-…-historia`: la vista previa. `15` a `18`: las cuatro entradas (sección, junto a Compartir, menú, aviso en Inicio). `19` y `20`: la hoja. `21-ancho-1280`.

## Tropiezos

- Primera vuelta rechazada por el founder (ver arriba); la figura al 55 % detrás del texto no vuelve.
- `.ceja` del armazón (la ceja de las tarjetas de Inicio) pisaba la ceja de la imagen: ahora `.ceja-l`.
- Para capturar la imagen a 1080 hay que esconder las otras columnas: el lienzo escalado vive dentro de un teléfono de 390.
- El año del founder cabe; un lugar con 200 eventos pediría «lo más» sin lista, que es la propuesta.

## Lo que sigue

Firma («Propuesta» o «Propuesta · F historia», por ejemplo) y, con ella, la pieza en código con un agente: la plantilla en `src/lib/carteles/plantillas/`, la ruta, la pantalla de vista previa, el botón en la sección (OL-390) y en Perfil, y la medición. Después la pieza 4 (currículo y reporte en PDF) y la 5 (lo anterior a la app e integrantes).
