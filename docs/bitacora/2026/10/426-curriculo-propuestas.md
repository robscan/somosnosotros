# 426 · Prototipo: el currículo del artista y el informe del lugar en PDF (OL-395)

**Fecha:** 2026-10-12 (noche). **Rama:** `curriculo-propuestas`, desde `origin/main` (`ac8e30e`, con OL-390 y OL-391). **Gestor:** Claude Fable 5.1 (Gestor de cambios VI). **Sin código de la app, sin migración.**
**Estado:** página armada y publicada en privado para los comentarios del founder; esperando la firma. Pieza 4 de 5 del historial («Publica y continúa con los otros pasos», 12 de oct).

## El encargo

Del plan del historial aceptado el 8 de octubre: pieza 4, «currículo del artista y reporte del lugar en PDF», a partir del pedido del founder de «currículos, reportes». Las investigaciones mandan: `docs/investigaciones/artistas.md` §8 (presentación profesional: el artista elige qué va, se descarga solo si lo habilita, nada inventado, lo realizado distinto de lo anunciado) y `docs/investigaciones/lugares.md` §6 y §7 (informe periódico bajo demanda con definiciones visibles; un festival marco no se suma además de sus actos; «Voy» no es asistencia; aviso de cobertura; primero registros tabulares, el PDF narrativo después).

## La página: `docs/rediseno/prototipos/curriculo-propuestas.html`

Armazón de `tu-anio-propuestas.html` (OL-392). El teléfono de la izquierda enseña **el documento tal cual saldría en PDF** (páginas carta o A4 a 96 ppp, escaladas, una tras otra); el de la derecha, **dónde se abre** en la ficha y **la hoja de opciones** (periodo, tamaño, «Preparar una reseña» apagado con «Pronto», «Descargar PDF», y según el ejercicio «Descargar la tabla» y «Copiar el enlace público»). Datos reales de solo lectura (12 de oct): Leo Traeger, Oscar Formacio y Jesús Coronado (con su reseña y redes), el CC200, el Museo Francisco Cossío y el Museo del Ferrocarril, con sus eventos pasados y próximos. Límite del prototipo: la extracción de los artistas trae solo al propio artista en cada fecha, así que «con quién» y «Ha tocado con» salen vacíos en los currículos; en código salen de `eventos_artistas` como en el historial (OL-390).

### Los ejercicios

- **T · Cómo se llama el del artista:** Presentación · Currículo · Trayectoria (título del PDF y del botón).
- **F · El tamaño:** carta (216 × 279 mm, la de México) · A4.
- **E · La pinta:** sobrio (blanco, negro, violeta en los rótulos) · crema.
- **R1 · Artista: la reseña y las redes** al principio, tal cual la ficha.
- **R2 · Artista: el orden:** reciente primero · cronológico.
- **R3 · Artista: las próximas fechas** al final.
- **R4 · Artista: con quién** y «N dijeron Voy» en cada fecha; la columna «Ha tocado con».
- **I1 · Lugar: el periodo:** este mes · año · todo (se elige en la hoja).
- **I2 · Lugar: cuánto detalle:** solo el cuadro de cifras · cifras y lista de actividades y artistas.
- **I3 · Lugar: «dijeron Voy»** con su definición («no es asistencia medida»).
- **Q · Quién puede sacarlo:** solo quien gestiona · y un enlace público «Presentación» (la descarga sigue siendo de quien gestiona).
- **O · Dónde se abre:** junto a «Tu año» al final de Trayectoria / Historial · en el menú «···».
- **X · Qué se descarga:** PDF · PDF y tabla (CSV).

El documento: cabecera con foto redonda, rótulo («PRESENTACIÓN» / «INFORME DE ACTIVIDAD»), nombre, meta, el símbolo SN y la dirección de la ficha; en el artista, «Reseña» con las redes, «Trayectoria · 3 fechas · 2 lugares» por año con fecha, título, lugar y «parte de …», «Lugares» (y «Ha tocado con»), «Próximas fechas»; en el lugar, «Periodo: octubre de 2026» con cuatro cifras y su definición debajo (actividades registradas, realizadas, artistas participantes, dijeron «Voy»), la nota de talleres, «Actividades del periodo» y «Artistas que pasaron» a dos columnas; pie con «Elaborado el 12 oct 2026 con Somos Nosotrxs a partir de lo publicado en la app … Puede estar incompleto» y la página. Lo cancelado (OL-391) sale tachado con su etiqueta y no cuenta. El medidor cuenta páginas, toques de la ficha al PDF, datos con definición a la vista y la letra más chica (7,9 pt, que se lee impresa).

### La propuesta del gestor (preajuste «Propuesta», por firmar)

**T presentación · F carta · E sobrio · R1 · R2 reciente · R3 · R4 · I1 mes · I2 lista · I3 · Q solo quien gestiona · O en la sección · X PDF.** Por qué en la página. Cómo se haría: cada página se dibuja con satori a 150 ppp y sharp la deja en JPEG, y un PDF de solo imágenes se escribe a mano (sin librería nueva); los datos son los del historial y la marca «se canceló»; solo quien gestiona descarga; el PDF lleva fecha, periodo y reglas de conteo.

## Capturas (`docs/rediseno/capturas-426/`)

Páginas a tamaño real (01 a 10) y la app a 390×844 (11 a 18), más la vista a lo ancho (19):
- `01-presentacion-leo-traeger-carta`: la propuesta. `02-…-cronologico`: título «Currículo» y orden cronológico. `03-…-crema`. `04-…-a4-sin-resena`. `05-presentacion-oscar-formacio`: con una expo abierta en «Próximas fechas».
- `06-informe-cc200-mes` y `07-…-pagina-2`: el informe de octubre del CC200 (12 actividades registradas: los 13 eventos menos el marco del festival; 11 artistas; 2 dijeron «Voy»), a dos páginas. `08-…-solo-cifras`. `09-…-todo-sin-voy`. `10-informe-cossio-mes`.
- `11-app-entrada-artista-seccion`: «Tu año» y «Presentación» juntos al final de Trayectoria. `12-app-hoja-presentacion`: la hoja con Carta/A4, «Preparar una reseña · Pronto» y «Descargar PDF». `13-…-con-enlace-y-csv`. `14-app-entrada-menu`. `15-app-entrada-lugar-seccion`. `16-app-hoja-informe-periodo`: Octubre / 2026 / Todo. `17` y `18`: la hoja de ejercicios. `19-ancho-1280`.

## Lo que sigue

Firma del founder; con ella, la pieza en código con un agente (plantilla de página en el creador de cartel, empaquetado PDF, ruta con permiso, hoja de opciones, botón junto a «Tu año»). Después la pieza 5 (lo anterior a la app e integrantes de grupos), que ya pide decisiones de datos.
