# 420 · Prototipo: historial de artistas y lugares, pieza 1 (OL-389)

**Fecha:** 2026-10-12 (tarde). **Rama:** `historial-propuestas`, desde `origin/main` (`d5cc52cc`). **Gestor:** Claude Fable 5.1 (Gestor de cambios VI). **Sin código de la app, sin migración.**
**Estado:** página armada y publicada en privado para los comentarios del founder; esperando la firma.

## El encargo

Founder (2026-10-12, 13:10): «Vamos con todo a abordar Historial de artistas y lugares, como lo definiste en ese orden.» El orden es el que el gestor V propuso el 8 de octubre y el founder aceptó: (1) trayectoria en la ficha del artista e historial en la del lugar, derivados sin tablas nuevas, con prototipo primero; (2) anunciado vs. realizado («se canceló» de un toque); (3) «Tu año» como imagen; (4) currículo y reporte en PDF; (5) lo anterior a la app e integrantes. Esta bitácora es la pieza 1: el prototipo. La investigación está en `docs/investigaciones/artistas.md` y `lugares.md`.

Dos decisiones del founder del mismo día mandan aquí: «lo pasado se queda, pero separado y sin enlaces rotos» (OL-377, X1 «como pasado» · X2 plegado, firmado) y «Pon enlace a objetos del pasado para que se vea quién fue, pero claramente que sean pasados y no se perciban activos» (OL-388, bitácora 419).

## Lo que hay hoy en producción (y por qué duele)

- La ficha del artista enseña solo sus fechas próximas (`cargarFechas`, con `filtroSinPasar()`). Leo Traeger tocó tres veces en octubre (CDC Raúl Gamboa dos veces, Museo Francisco Cossío una) y su ficha dice «Aún no tiene fechas publicadas. ¿Sabes de una? Publícala.»
- «Lugares» cuenta los lugares de las fechas próximas: vale 0 para Leo Traeger aunque se haya presentado en dos (investigación §3).
- La ficha del lugar enseña solo los próximos: el CC200 tuvo 13 eventos con 11 artistas en el 9° Festival de Cine UASLP y hoy enseña uno.
- En la base hay 171 eventos pasados visibles, en 35 lugares y con 94 artistas (cuenta de solo lectura del 12 de oct). La ficha del evento en pasado existe desde OL-383 y desde OL-388 se enlaza desde lo ligado.

## La página: `docs/rediseno/prototipos/historial-propuestas.html`

Mismo armazón que `inicio-propuestas.html` (OL-377/OL-386): dos teléfonos (Hoy = producción, el otro con los ejercicios), la hoja con preajustes, medidor y ejercicios, y el estado guardado en el navegador. Datos reales de solo lectura, extraídos el 12 de oct por la tarde con la llave de servicio desde el `.env` local (nunca en el repo): seis artistas (Leo Traeger, Latife Zetune, Jesús Coronado, Rob Maldonado, Los Sabrosetes, Oscar Formacio) y seis lugares (CC200, Museo del Ferrocarril, CDC Raúl Gamboa, ACHE Galería, Teatro de la Paz, Museo Francisco Cossío) con todos sus eventos visibles, pasados y próximos, sus artistas, cuántos dijeron «Voy» y cuántos los siguen. Las imágenes (67) van reducidas a `historial-propuestas/` (webp, 240 y 800 px de ancho). Un selector en la hoja cambia la ficha en los dos teléfonos.

La ficha se dibuja como la de producción: barra con «Artistas» / «Lugares», portada 3:2 con el velo y el avatar (o el símbolo SN sin portada), chip de disciplina o tipo, nombre y meta; los tres números; las acciones (Compartir, Cómo llegar, redes); «Próximas fechas» / «Próximos eventos» con los renglones de siempre y «Publicar»; «Dónde» (lugar) y «Sobre»; la pastilla «Seguir». Lo único nuevo es lo que cada ejercicio dice.

### Los ejercicios

- **H1 · Dónde va lo que ya pasó:** no está (hoy) · plegado (sección propia bajo lo próximo, cerrada al abrir, como el «Ya pasó» del festival) · abierto (la misma sección abierta, seis más recientes y «Ver las 13») · pestañas («Próximas · 1» / «Historial · 13» dentro de la sección de fechas).
- **H2 · Cómo se llama:** «Ya pasó» (como el festival) · propio («Trayectoria» en el artista, «Historial» en el lugar) · «Antes».
- **H3 · Cómo se agrupa:** por día (como lo próximo) · por mes («Octubre de 2026», día en cada renglón) · plano (fecha completa en cada renglón). Siempre lo más reciente primero.
- **H4 · Cuántos fueron:** «2 fueron» a la derecha del renglón pasado, solo si alguien dijo «Voy».
- **H5 · Con quién, o quiénes:** en el artista «con Latife Zetune»; en el lugar los artistas del evento. Sale de `eventos_artistas`; no inventa colaboraciones (investigación §4).
- **K1 · Los tres números del artista:** hoy · «Lugares» cuenta todos (pasados y por venir; baja a la trayectoria si no hay próximas) · «Pasadas» en vez de «Lugares». El lugar no cambia.
- **Q1 · Quiénes han pasado por aquí:** no · fotos redondas con cuántas veces («Han pasado por aquí · 11» en el lugar, «Se ha presentado en · 2» en el artista) · chips con nombres. Cada una abre su ficha.
- **C1 · Un evento que se canceló:** marca el pasado más antiguo como «se canceló» para ver la regla: se queda, tachado y con su etiqueta roja, y no cuenta («2 fechas · 1 cancelado»).

Tocar un renglón pasado avisa «Aquí se abre la ficha del evento en pasado: …»; tocar una foto, «Aquí se abre la ficha: …». El medidor cuenta fechas pasadas visibles, toques hasta lo pasado, alto de la ficha y artistas o lugares distintos a la vista.

### La propuesta del gestor (preajuste «Propuesta», por firmar)

**H1 plegado · H2 propio · H3 por mes · H4 · H5 · K1 todos · Q1 fotos.** Lo próximo manda y lo pasado está a un toque, igual que el «Ya pasó» del festival que ya se firmó; «Trayectoria» e «Historial» porque «Ya pasó» en la ficha de una persona suena a otra cosa; por mes porque hoy todo es de septiembre y octubre pero en un año serán meses y después años, y el mes ya dice el año; cada renglón abre la ficha en pasado, en gris y con su fecha completa, sin parecer activo; «Fueron» solo cuando alguien fue; con quién tocó o quién pasó por el lugar es lo que vuelve útil un historial y ya está en los datos; «Lugares» cuenta todos los lugares; la fila de fotos es la cara del lugar. Nada pide tablas nuevas.

**La regla que falta firmar:** realizado salvo «se canceló». Un evento que ya pasó cuenta como realizado y entra al historial; quien gestiona el evento (o la administración) lo marca «se canceló» de un toque desde su ficha en pasado (pieza 2, un campo). C1 lo enseña.

### Medidas (390×844, Chrome real)

| Ficha y estado | Pasadas que se ven | Toques | Alto de la ficha | Con quién / dónde |
| --- | --- | --- | --- | --- |
| Leo Traeger · Hoy | 0 de 3 | no se llega | 894 px | 0 |
| Leo Traeger · Propuesta, plegado | 0 de 3 | 1 | 966 px | 2 |
| Leo Traeger · Propuesta, abierto | 3 de 3 | 1 | 1 531 px | 2 |
| CC200 · Hoy | 0 de 13 | no se llega | 1 273 px | 0 |
| CC200 · Propuesta, abierto | 13 de 13 | 1 | 3 036 px | 11 |

Plegado, la ficha crece 72 px (el renglón de la sección) respecto a hoy.

## Capturas (`docs/rediseno/capturas-420/`, 390×844)

- `01-hoy-artista-leo-traeger`: producción. «Fechas · Ninguna», «Lugares · 0», «Aún no tiene fechas publicadas» y luego «Sobre». Nada de lo que tocó.
- `02-hoy-lugar-cc200`: producción. «Eventos · 1 próximo»; un solo renglón (30 de oct).
- `03-propuesta-artista-plegado`: «Lugares · 2»; bajo «Publicar una fecha», el renglón «Trayectoria · 3 fechas · 2 lugares» con su chevrón.
- `04-propuesta-artista-abierto`: la sección abierta: «Se ha presentado en · 2» (CDC Raúl Gamboa «2 veces», Museo Francisco Cossío), «Octubre de 2026» y tres renglones en gris con miniatura, «jue 8 · 19:00», lugar y chevrón.
- `05-propuesta-lugar-plegado` y `06-propuesta-lugar-abierto-fotos`: el CC200 con «Historial · 13 eventos · 11 artistas»; abierto, la fila «Han pasado por aquí · 11» (Daniel Giménez Cacho «2 veces», …) y los renglones con «9° Festival de Cine UASLP» como ceja y los artistas de cada acto (H5).
- `07-propuesta-lugar-abierto-2`: más abajo en la misma lista.
- `08-h1-abierto-lugar-ver-los-13`: H1 abierto: seis renglones y «Ver los 13».
- `09-h1-pestanas-lugar`: «Eventos» con «Próximas · 1» / «Historial · 13».
- `10-h2-ya-paso-artista`: la sección llamada «Ya pasó» en el artista.
- `11-h3-por-dia` y `12-h3-plano`: agrupado por día («jue 8 de oct») y plano («jue 8 oct 2026 · 19:00»).
- `13-q1-chips-artista`: Q1 chips («Centro de Difusión Cultural Raúl Gamboa · 2»).
- `14-k1-pasadas`: el tercer número «Pasadas · 3».
- `15-c1-se-cancelo`: «2 fechas · 1 cancelado · 2 lugares»; la clase magistral tachada con «SE CANCELÓ».
- `16-propuesta-oscar-formacio-con-proximas` y `17-…-pasado`: un artista con una expo abierta («1 próxima») y dos pasadas (las inauguraciones).
- `18-propuesta-museo-ferrocarril`: 13 pasados de un solo artista.
- `19-propuesta-los-sabrosetes-sin-lugar`: una fecha en un sitio sin ficha (Jardín Colón): «Se ha presentado en» no sale.
- `20-propuesta-jesus-coronado-fueron`: H4: «1 fue» a la derecha del renglón.
- `21-hoja-ejercicios` y `22-hoja-ejercicios-2`: la hoja en el teléfono.
- `23-ancho-1280`: los dos teléfonos y la hoja a lo ancho.

## Tropiezos

- Tres clases del armazón pisaban a la ficha: `.portada` (la tarjeta de Inicio es una rejilla con áreas), `.velo` (el velo de la hoja, fijo e invisible) y `--espacio-8` (no existe). Las mías van con sufijo (`portada-h`, `velo-h`, `avatar-h`, `etiqueta-h`) y el relleno en píxeles.
- `redes` de Jesús Coronado viene como objeto, no como lista (forma vieja): la ficha se normaliza.
- `.fc .seccion ul` (rejilla) pisaba a la fila de fotos: `ul.gente` y `ul.chips` llevan su propio selector.

## Lo que sigue

Firma del founder con la fórmula de la página («Propuesta · H1 abierto», por ejemplo) y respuesta a la regla «realizado salvo "se canceló"». Después, la pieza 1 en código con un agente: consulta de lo pasado por artista y por lugar (sin tope de 30, con total aparte), la sección, los números y la fila de fotos; «Ya fui» (Y1, firmado en OL-377) para las expos. Luego las piezas 2 a 5.
