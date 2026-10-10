# 398 · Prototipo con ejercicios para las tarjetas de Inicio (OL-367)

**Fecha:** 2026-10-10. **Rama:** `prototipo-inicio-tarjetas`, base `origin/main` (`2f77dbf1`; se empezó sobre `c121be99` y se adelantó sin cambios propios antes del primer commit). **Operador:** Claude (agente del gestor V). **Sin código de la app y sin migración.**
**Estado:** prototipo listo para que el founder lo pruebe en su iPhone; lo publica el gestor como página privada.

## Lo que pidió el founder (textual)

- «antes necesito ver prototipos con ejercicios para las cards de inicio, se ve super saturado».
- Después, el mismo día (vía el gestor): «Creo que el elemento de check que indica si voy, se ve muy grande y satura. Además de que es repetitivo y poco útil, ya se resuelve en los carriles si va. Me gustaría considerar reemplazarlo por un componente de fecha […] en esa imagen hay un componente cuadrado que tiene mes y día (podrían ser días también). Me gustaría ver ese ajuste en prototipo, el icono de check se iría en ese caso.» Es el ejercicio E8.

## Diagnóstico del gestor (producción, 390×844, 2026-10-10)

1. **Doble título:** la franja de color repite en mayúsculas lo que el cartel ya dice («GUITARRA EN EL OTOÑO», «CINEMA», «CICLO FELLINI», «MERK LOCAL EDICIÓN CATRINAS»).
2. **Mayúsculas pesadas y cortes feos** en la franja: «LABORATORIO DE EXPLORACIÓ…», «NOCHE / ASTRONÓMIC / A» (palabra partida sin guion), «DÍA NACIONAL DE LAS CACTÁCEAS…».
3. **Un botón blanco de 48 px en cada tarjeta** encima de la franja (Destacados 7, Esta semana 20, Nuevos 5); lugares y artistas también con botón grande (campana, persona+).
4. **Pastillas sobre el cartel:** «Evento» en casi todas; «Hoy» que repite el «hoy · 09:00» de abajo; «Hoy · Sesión 1 de 4» y «Taller» apiladas en dos filas tapando el cartel.
5. **Demasiados colores:** cada franja de un color distinto (oliva, café, azul, naranja, magenta, rojo) y el violeta a la vez en fecha, enlaces, «Hoy» y el anillo de «Ahora».
6. **La fila «Ahora» repite:** «En 1 h 11 min» bajo tres círculos seguidos.
7. **Siete carriles** con el mismo peso (título de 26 px y «Ver la agenda ›» violeta cada uno). Conteo por carril (tarjetas / rótulos / botones): Destacados 8/15/7, Esta semana 20/40/20, Festivales y expos 16/32/0, Nuevos 5/10/5, Lugares de la semana 21/0/21, Artistas destacadxs 9/0/9, Artistas de la semana 12/0/12.

## Referencia del founder: Apple Music, Conciertos

El carril «Conciertos» de Apple Music en iPhone (descripción del gestor; no hay imagen en el repo):

- Tarjeta cuadrada 1:1 con la imagen del concierto a sangre, esquinas redondeadas.
- Arriba a la izquierda, con unos 12 px de margen, un **sello de fecha** cuadrado de esquinas redondeadas (~40×44 px a 390 de ancho): fondo blanco casi opaco, arriba el mes pequeño en minúsculas y gris («oct», ~11 px), debajo el día grande en negro («11», ~24 px, peso medio). Nada más encima de la imagen: ni botones ni pastillas.
- Debajo de la tarjeta, en tres renglones: el título en negro (una línea, ~17 px), el lugar en gris y la fecha con hora en gris («dom 11 de oct · 6 p.m.»). Sin color de acento.

## El prototipo

[`docs/rediseno/prototipos/inicio-tarjetas.html`](../../../rediseno/prototipos/inicio-tarjetas.html) con sus imágenes en [`inicio-tarjetas/`](../../../rediseno/prototipos/inicio-tarjetas/). Mismo armazón que la barra «Ahora» (bitácora 388): tokens de `src/app/globals.css`, Bricolage Grotesque de Google Fonts, el logotipo real, la barra de la app, la fila de contexto y la barra de secciones. La página no lleva `<!doctype>` ni `<head>`: la publicación la envuelve. El teléfono usa siempre los tokens claros de la app; los controles y el fondo de alrededor siguen el tema de quien mira (claro u oscuro).

**Cómo se ve:**
- **En el iPhone:** Inicio a todo lo ancho, sin marco, y un botón flotante «Ejercicios · Calma» que abre una hoja con los preajustes, el medidor, los interruptores, las pruebas y las notas.
- **Desde 760 px:** el teléfono (390×844, escalado para caber) y los controles al lado.
- **Desde 1180 px:** «Hoy» a la izquierda, la combinación a la derecha y los controles al costado; los dos teléfonos se desplazan juntos.

Abre en «Calma» y recuerda la última combinación en ese navegador. Con `#hoy`, `#calma` o `#minima` en el enlace abre en ese preajuste.

### Cómo se armó «Hoy»

- **Hora:** sáb 10 de oct de 2026, 11:49 en San Luis Potosí, la de las capturas de producción.
- **Datos:** los públicos que extrajo el gestor a las 11:51 (60 eventos vigentes, 14 lugares, 14 artistas), tal cual, sin inventar eventos.
- **Con el código de la app, no con una copia:** un guion del scratchpad empaquetó con esbuild las funciones de `src/lib` y escribió el modelo que va dentro de la página (`<script type="application/json">`):
  - carriles: `calcularCarrilesAgenda`, `carrilTusPlanes`;
  - tarjetas: `tarjetaConClase`, `rotulosDeTarjeta`, `ordenarTarjetasPorFoto`, `tituloCorto`;
  - colores: `degradadoTarjeta`, `paletaPropia`, `legible`;
  - fila «Ahora»: `candidatosAhora`, `clasificarAhora`, `rotuloCirculo`;
  - lugares: `tarjetasDeSemana`;
  - festivales: `sedesDeFestival`, `portadaDeFestival`.
- **Persona de ejemplo (dicho en la página):** dijo «Voy» a la presentación de Kopk Poj (hoy 13:00) y le interesan el tributo a The Beatles (hoy 20:00) y KOWAIFEST (sáb 17). Con sesión, Inicio abre con «Tus planes»: 8 carriles; sin sesión serían los 7 de las capturas.
- **Carriles que salen:** Tus planes 3 tarjetas, Destacados 6, Esta semana 20, Festivales y expos 18, Nuevos eventos 3, Lugares de la semana 13, Artistas destacadxs 7, Artistas de la semana 7.
- **Lo que difiere por los datos:**
  1. Los datos ya traen las tres exposiciones de Pedro Friedeberg y sus inauguraciones, que en las capturas de las 11:49 no salían. Por eso la fila «Ahora» dice «Ahora», «En 11 min», tres «En 1 h 11 min», «En 1 h 41 min» y dos «Inaugura hoy».
  2. «Nuevos eventos»: la app lleva lo nuevo que pasa después de esta semana, con 3 como mínimo; los datos llegan al 18 de oct y con esa regla saldría vacío. Aquí lleva lo nuevo que no cupo arriba: Un León Marinero en Puebla y en Morelia, y Fotomúsica.
  3. Las sesiones del laboratorio (4 sábados, de 17:00 a 20:00) salen de su cartel: los datos no traen la tabla de sesiones, y sin ella la app lo partiría por días.
  4. Portadas de lugar: las 10 de los datos, más CEART, Cineteca Alameda y Raúl Gamboa, que ya estaban en el prototipo 388. Cinco eventos sin cartel en sitios cuya portada no vino salen como tarjeta de título (en producción quizá con la foto del lugar).
  5. Artistas: los datos no traen sus fechas ni sus novedades. Dicen su disciplina en gris, salvo Yanel Villarreal (hoy 16:00) y Un León Marinero (jue 15), y no hay «Nuevo video». Un festival con actos dice «Varias sedes» sin el número de actividades, porque los datos solo traen los actos de esta semana.
- **Imágenes:** 52 públicas pedidas al optimizador de la propia app (`somosnosotros.org/_next/image`, las variantes que ya sirve: 768 para carteles, 384 para avatares; ninguna cayó a la URL directa) y reducidas con `sharp` a 400 px de ancho, webp calidad 70. Con el logotipo, el símbolo SN y la imagen sin foto son 55 archivos y 1,1 MB.

### Los ejercicios

Cada uno mueve una sola palanca y se pueden combinar.

- **E1 · Un solo título.** Con cartel, la tarjeta es el cartel entero en 4:5 (165×206): en 2:3 se le cortaban los lados. El título va debajo, como oración («DESIERTO» → «Desierto»; las siglas cortas se quedan), en dos líneas como mucho. Si no cabe, se corta en la última palabra entera, con «…». Sin cartel, se queda la tarjeta de título. *Explora lo firmado en OL-357/360 («título + cartel»).*
- **E2 · El botón solo cuando importa.** En reposo, sin botón. Si ya decidiste, un sello de 24 px que dice el estado y no es un botón: palomita en verde para «Voy», marcador para «Te interesa». Lugares y artistas, sin el botón de seguir. *Explora OL-176.* Con E8 queda sin efecto.
- **E3 · Rótulos fuera del cartel.** Nada encima del cartel. La clase va chica arriba del título: EVENTO, TALLER, EXPO, FESTIVAL (en la franja o debajo, según E1). «Hoy» y la sesión van en la línea de cuándo («hoy · 17:00 · sesión 1 de 4»). El dato que queda («Te interesa», «2 van») va en la misma ceja; si no cabe, baja al renglón siguiente sin cortarse.
  - **E3b · Evento por omisión:** solo se rotula lo que no es evento.
- **E4 · Color quieto.** El violeta queda para el cuándo. «Ver la agenda ›» va en gris, la franja y la tarjeta de título en un solo tono oscuro (`--banda`), y «Hoy» y «Te interesa» sin color. El anillo de «Ahora» queda violeta liso, sin el naranja. El verde de «Voy» se queda (dice un estado) y la barra de secciones no cambia (es de toda la app). *Explora el «degradado vivo» firmado, que en las historias se queda.*
- **E5 · Jerarquía de tamaños.** Destacados, Tus planes y Festivales y expos siguen grandes; Esta semana y Nuevos van en tarjeta mediana (cartel 4:5 de 132 px: se ven dos y media). Lugares y artistas, en avatares de 64 px con el nombre en una línea y sin botón, porque no cabe.
- **E6 · Menos carriles.** «Nuevos eventos» deja de ser carril: sus tarjetas entran en Esta semana, por fecha, y lo nuevo lleva una marca «Nuevo», arriba a la izquierda del cartel o en la ceja con E3. Las dos filas de artistas se juntan en «Artistas». Con «Tus planes» serían seis carriles, así que lugares y artistas comparten «Lugares y artistas de la semana»: cinco como máximo.
- **E7 · «Ahora» sin repetir.** Si varios empiezan a la misma hora, solo el primero dice la cuenta atrás y los demás la hora: «En 1 h 11 min», «13:00», «13:00». Las dos «Inaugura hoy» del final se quedan, porque no son cuenta atrás.
- **E8 · Fecha en el cartel** (pedido del founder). El botón de «Voy» desaparece de todas las tarjetas de eventos, sin sello de estado. En su lugar va un sello de fecha arriba a la izquierda del cartel, con los tokens de la app y sin colores nuevos: fondo `--vidrio`, el mes en `--letra-2xs` gris y el día en `--letra-2xl` 600. Debajo de la tarjeta van, como en la referencia, el título (con E1), el lugar y la fecha con hora en gris. En «Tus planes», «Vas» va en texto, porque ya no hay palomita que lo diga.
  - Contenido del sello: un día, «oct» / «11»; un rango del mismo mes, «oct» / «10–11».
  - **Un rango entre meses (decidido aquí):** si no ha empezado, desde cuándo, «oct» / «12 →»; si ya está pasando, hasta cuándo, con el mes del cierre, «oct» / «→ 28». De lo que ya está abierto importa cuándo se acaba, y CINEMA «sep 29 →» parecería que no ha empezado. La flecha es un SVG de trazo, no un glifo: Bricolage no la trae.
  - Tocar el sello abre la ficha, como el resto de la tarjeta: está dentro del enlace.
  - **E8b · Días esta semana:** en los próximos 7 días, el día de la semana en vez del mes («sáb» / «17»; hoy, «hoy» / «10»).

### Preajustes

- **Hoy:** todo apagado.
- **Calma** (recomendación del gestor, ajustada por el pedido del founder): E1 + E3 + E7 + E8, sin E2.
- **Mínima:** todo encendido, con E3b y E8b; E2 queda sin efecto porque está E8.

### El medidor

Siempre visible arriba de la hoja (en el teléfono) o del panel. Cuenta lo que se ve **ahora** en el teléfono, entre la fila de contexto y la barra de secciones; un elemento cuenta si se ve al menos la mitad. Al lado, la cifra de «Hoy» medida en un teléfono gemelo en la misma posición: el de la izquierda a lo ancho, uno oculto en el teléfono. En verde lo que baja respecto de «Hoy».

- **Rótulos:** las pastillas, cada parte de la ceja de E3, el sello de estado de E2, el sello de fecha de E8 y la marca «Nuevo». Los de E3 y E8 cuentan aunque ya no vayan sobre el cartel.
- **Botones:** los de «Voy» y seguir de las tarjetas.
- **Colores:** los colores de la interfaz, sin los carteles. Grises, blancos y casi negros no cuentan; dos colores son el mismo si caen en el mismo tono (12 de 30°) y en la misma luz (oscuro o claro).
- **Mayúsculas:** títulos en mayúsculas de 13 px o más. La ceja chica de E3 no entra aquí, ya cuenta como rótulo.
- **Cortados:** títulos a los que les falta texto o tienen una palabra partida en dos renglones. Para no contar los 1–2 px que asoman las letras de Bricolage, un título está cortado si esconde media línea o más.

**Cifras por preajuste** (390×844; «bajando» es una pantalla abajo, 732 px):

| | Rótulos | Botones | Colores | Mayúsculas | Cortados |
|---|---|---|---|---|---|
| Hoy, pliegue | 4 | 4 | 6 | 4 | 2 |
| Calma, pliegue | 8 | 0 | 2 | 0 | 0 |
| Mínima, pliegue | 6 | 0 | 1 | 0 | 0 |
| Hoy, bajando | 8 | 2 | 3 | 2 | 1 |
| Calma, bajando | 6 | 0 | 1 | 0 | 1 |
| Mínima, bajando | 6 | 0 | 0 | 0 | 1 |

«Calma» tiene más rótulos que «Hoy» en el pliegue (8 frente a 4): son las cejas de E3 («EVENTO · VAS») y los sellos de fecha de E8, ya fuera del cartel salvo la fecha. El cortado de «bajando» es «Día Nacional de las Cactáceas en el…», cortado en palabra entera. Con «Mínima» en «bajando» no queda ningún color: E4 deja el violeta solo para el cuándo y E8 pone el cuándo en gris.

**Cada ejercicio solo** (en el pliegue salvo donde se dice; «Hoy» en la misma posición, 4/4/6/4/2 en el pliegue):
- E1: 4 / 4 / 3 / 0 / 0.
- E2: 6 / 0 / 6 / 4 / 0 (los dos sellos de estado cuentan como rótulos; sin botón la franja es más ancha y ya no parte palabras).
- E3: 5 / 4 / 6 / 4 / 2. E3 + E3b: 2 / 4 / 6 / 4 / 2.
- E4: 4 / 4 / 2 / 4 / 2.
- E5 en Esta semana: 8 / 2 / 4 / 5 / 1 (Hoy: 6 / 2 / 4 / 4 / 1); en lugares y artistas: 3 / 0 / 1 / 1 / 8 (Hoy: 2 / 7 / 2 / 2 / 2). Ocho nombres cortados en una línea.
- E6 en Esta semana: 7 / 2 / 4 / 4 / 1; en el carril que junta lugares y artistas: 2 / 3 / 3 / 2 / 2. Aquí «Hoy» enseña otro carril a esa altura y la comparación no es pareja.
- E7: igual que «Hoy». El medidor no cuenta repeticiones; el cambio está en las horas bajo los círculos (captura 12).
- E8: 6 / 0 / 5 / 4 / 0. E8 + E8b: igual.

### Las pruebas

Cuatro tareas, cada una con un cronómetro:
- «¿Qué puedes ver hoy en la tarde?»
- «Encuentra un taller»
- «¿A qué ya dijiste que vas?»
- «¿Qué festival está pasando?»

«Empezar» lleva el teléfono arriba y cierra la hoja. Una barra abajo enseña la tarea y el tiempo; tocarla lo detiene, guarda el tiempo en `localStorage` (con try/catch) para el preajuste o la combinación de ese momento, y vuelve a abrir la hoja en las pruebas. Cada tarea enseña los tiempos de Hoy, Calma y Mínima, y los de una combinación propia si los hay. «Borrar los tiempos» pide un segundo toque.

## Comprobado con toques reales

Navegador integrado, servido con el mismo esqueleto que pone la publicación.

**A 390×844.** Clic por coordenadas; antes, `elementFromPoint` en el centro de cada control.
- Con la hoja cerrada, el centro del botón flotante, el de un sello de fecha y el de un círculo devuelven ese elemento. La hoja cerrada está `inert` y escondida, y el velo no recibe toques.
- Con la hoja abierta, todos sus controles responden en su centro: los 3 preajustes, los 10 interruptores, los 4 botones de prueba, «Borrar» y la ✕.
- Los toques hacen lo que deben:
  - El sello de fecha abre la ficha de esa tarjeta, dos veces y en dos tarjetas, también con la versión final.
  - El botón flotante abre la hoja.
  - «Mínima» aplica todo, y el interruptor E4 se apaga.
  - «Empezar» en «Encuentra un taller» cierra la hoja y enseña la barra del cronómetro; tocar la barra lo detiene, guarda 7,3 s y vuelve a abrir la hoja en las pruebas.
  - La ✕ cierra la hoja y el foco vuelve al botón.
  - Tocar el velo la cierra sin tocar lo de abajo.
  - En «Hoy», «Voy» en el tributo a The Beatles lo pone verde, cambia «Te interesa» por «Hoy» (como la app) y el gemelo cambia igual.

**A 1280×800.** Clic en «Calma» y en los interruptores; desplazar con la rueda el teléfono de la derecha mueve también el de la izquierda (500 = 500) y el medidor se rehace.

**Otras medidas.**
- A 1024×768, un teléfono y el panel.
- A 400 px no hay desplazamiento lateral (ancho del documento 400) y los controles llevan 16 px a cada lado.
- En modo oscuro, el marco se oscurece y el teléfono sigue claro.
- Sin errores de página. El único 404 es el favicon que pide el navegador en local; la publicación pone su propio icono.

## Capturas

[`docs/rediseno/capturas-398/`](../../../rediseno/capturas-398/), Chrome de la Mac con playwright-core: 390×844 a 2× y una a 1280×800. Abiertas una por una:

- `01-hoy-pliegue.png` — Inicio de hoy, igual en lo visual a la captura de producción. Fila «Ahora» con Cactáceas («Ahora», anillo violeta y naranja), Friedeberg «En 11 min», Guitarra y Kopk «En 1 h 11 min». «Tus planes» con «PRESENTACIÓ/N DE KOPK/POJ» partido, palomita verde, «Evento» y «Hoy»; el tributo con palomita blanca, «Evento» y «Te interesa». Abajo asoman Destacados y el botón «Ejercicios · Hoy».
- `02-hoy-bajando.png` — Destacados: Friedeberg con «Evento» y «Hoy»; el laboratorio con «Hoy · Sesión 1 de 4» y «Taller» apiladas. Esta semana: «DÍA NACIONAL / DE LAS / CACTÁCEAS…» y «GUITARRA EN EL OTOÑO» con sus botones, como en la segunda captura de producción.
- `03-e1-un-solo-titulo.png` — el cartel de Kopk entero en 4:5 y debajo «Presentación de Kopk Poj»; el tributo con la foto de la Cineteca y «Tributo a The Beatles con / Help!». Botones y pastillas siguen.
- `04-e2-boton-cuando-importa.png` — sin botones: palomita verde de 24 px en Kopk y marcador en el tributo. La franja más ancha ya no parte palabras («PRESENTACIÓN / DE KOPK POJ»); el tributo enseña «Evento» y «Hoy».
- `05-e3-rotulos-fuera.png` — sin pastillas: «EVENTO» en la franja de Kopk; en el tributo, «EVENTO ·» y debajo «TE INTERESA», sin cortarse.
- `06-e3-e3b-evento-por-omision.png` — Kopk sin ceja; el tributo solo con «TE INTERESA».
- `07-e4-color-quieto.png` — franjas negras; «Hoy» y «Te interesa» sin color; «Ver mi perfil ›» en gris; anillo de «Ahora» violeta liso.
- `08-e5-tamanos-esta-semana.png` — Esta semana en tarjetas de 132 px (dos y media) con «DÍA / NACIONAL / DE LAS…» apretado por el botón; Festivales y expos sigue grande.
- `09-e5-tamanos-lugares-artistas.png` — avatares de 64 px: «Museo de Ar…», «Museo Leon…», «MUNI Museo…», el símbolo SN en Casa de Cultura Banamex; Markosblues, Fozco, DwardNoize; sin botones.
- `10-e6-menos-carriles-esta-semana.png` — la marca «Nuevo» violeta en el cartel de las Cactáceas, junto a sus «Evento» y «Hoy».
- `11-e6-menos-carriles-lugares-artistas.png` — después de Festivales y expos, «Lugares y artistas de la semana» en un solo carril, sin enlace.
- `12-e7-ahora-sin-repetir.png` — bajo los círculos: «Ahora», «En 11 min», «En 1 h 11 min», «13:00», «13…».
- `13-e8-fecha-en-el-cartel.png` — sin botones; el sello «oct / 10» arriba a la izquierda del cartel, bajo la franja; «Evento» y «Vas» en Kopk; debajo, el lugar y luego «hoy · 13:00» en gris.
- `14-e8-e8b-dias-esta-semana.png` — los sellos dicen «hoy / 10».
- `15-e8-rangos-festivales.png` — CINEMA «oct / →24» y Ciclo Fellini «oct / →28» (ya están pasando); en Nuevos eventos, «oct / 16» y «oct / 17».
- `16-calma-pliegue.png` — Calma: carteles enteros con «oct / 10»; «EVENTO · VAS» (VAS violeta), «Presentación de Kopk Poj», el lugar y «hoy · 13:00» en gris; el tributo con «EVENTO · TE INTERESA». Sin botones ni pastillas.
- `17-calma-bajando.png` — Destacados con «EVENTO / Privacidad y elegancia / Galería Casa Diana / hoy · 12:00» y «TALLER / Laboratorio de exploración sonora / Aurora Co-Lab / hoy · 17:00 · sesión 1 de 4»; Esta semana con «Día Nacional de las / Cactáceas en el Jardín…».
- `18-minima-pliegue.png` — anillo violeta liso; sellos «hoy / 10»; cejas «VAS» y «TE INTERESA» sin «EVENTO»; «Ver mi perfil ›» en gris.
- `19-minima-bajando.png` — Destacados sin ceja en Friedeberg y «TALLER» en el laboratorio. Esta semana en mediana con «hoy / 10»; «NUEVO» sobre las Cactáceas, «Guitarra en el Otoño» sin ceja y «TALLER / Viajera». «Ver la agenda ›» en gris.
- `20-hoja-abierta.png` — la hoja en Calma sobre el teléfono oscurecido: preajustes, la línea «Calma · E1 · E3 · E7 · E8», el medidor (Calma 8 / 0 / 2 / 0 / 0, en verde lo que baja; Hoy 4 / 4 / 6 / 4 / 2) y los primeros interruptores con su nota de lo que exploran.
- `21-ancho-1280.png` — a 1280: «Hoy · como está en producción» a la izquierda, «Calma · E1 · E3 · E7 · E8» a la derecha y el panel con el medidor y los ejercicios.

## Lo que decidí yo

- E8 entre meses: «→ 28» si ya está pasando, «12 →» si no ha empezado.
- E8 en «Tus planes»: «Vas» en texto, porque sin la palomita no se sabría cuál es «Voy» y cuál «Te interesa». Es la regla de OL-364 al revés: allá «Voy» no llevaba texto porque lo decía el botón.
- E1 en 4:5, para que «la tarjeta es el cartel» no le corte los lados.
- E6 con sesión junta lugares y artistas para quedar en cinco carriles; «Nuevo» con marca propia, porque como pastilla perdía contra «Hoy» y no se veía.
- E5: avatares sin botón y nombre en una línea.
- E4: el anillo violeta liso y la barra de secciones sin tocar.
- E7: solo las cuentas atrás.
- Medidor: las definiciones de arriba (los rótulos de E3 y E8 cuentan; «Mayúsculas» cuenta títulos; los colores se agrupan por tono). El «Hoy» de comparación va en la misma posición del dedo.
- Abre en «Calma» para que el primer vistazo ya sea un cambio; «Hoy» está a un toque.

## Límites

- No está probado en Safari del iPhone: se probó en Chrome (navegador integrado y playwright-core). La página respeta «Reducir movimiento» (el anillo deja de girar y la hoja aparece sin animación) y usa `height: 100%`, no `100vh`.
- Los datos limitan la fidelidad en lo dicho arriba (Friedeberg, Nuevos, artistas, portadas de lugar).
- Fichas, historias, ciudad, Cuándo y Filtros no se abren: un aviso dice qué se abriría. Solo «Voy» y seguir cambian de verdad, y «Volver a la persona de ejemplo» los repone.
- Los guiones (modelo, imágenes, construcción y capturas) quedaron en el scratchpad de la sesión, no en el repo. La página trae su modelo dentro, así que se puede revisar sin ellos.

## Para publicar

La página `docs/rediseno/prototipos/inicio-tarjetas.html` y los 55 archivos de `docs/rediseno/prototipos/inicio-tarjetas/` (52 webp de carteles, lugares y artistas, `logotipo.svg`, `simbolo-sn-blanco.svg` y `sin-foto.webp`). La página los pide con rutas relativas `inicio-tarjetas/…`.

## Pendiente

Que el founder lo pruebe con los tres preajustes y las cuatro pruebas, y decida qué ejercicios pasan a una pieza de código.

## Ajuste tras la primera vista: la fecha a la derecha (E8c)

El founder, en un comentario sobre la tarjeta de «Tus planes» de la página publicada (2026-10-10): «prueba poniendo el componente de fecha donde antes estaba el de check». Se añadió el sub-interruptor **E8c · La fecha a la derecha**: el sello de mes y día va arriba a la derecha, donde estaba el botón de «Voy», y a la izquierda solo queda la marca «Nuevo» de E6. «Calma» pasa a ser E1 + E3 + E7 + E8 + E8c; con E8c apagado se compara con el sello a la izquierda. La llave de `localStorage` pasa a `inicio-tarjetas:estado:2` para que quien ya abrió la página vea la combinación nueva.

Comprobado en Chrome a 390×844, con la página envuelta como al publicarla: sin errores en la consola; un clic real en el centro del sello (`elementFromPoint` cae en la tarjeta) abre su ficha.

- `22-e8c-fecha-a-la-derecha.png` — «Calma» con E8c: en «Tus planes», el sello «oct / 10» arriba a la derecha del cartel de Kopk Poj y de la foto de la Cineteca; debajo, «EVENTO · VAS» y «EVENTO · TE INTERESA», título, lugar y hora; en «Destacados», el mismo sello a la derecha.

## Dos comentarios más del founder (2026-10-10)

- **«Para artistas se sigue chip de “Nuevo video” o audio»:** el agente había escrito que los datos no traían novedades; no era así, la exportación del gestor no las incluía. Se añadieron las reales de `novedades_artista` con la regla de la app (`selloNovedadArtista`, 7 días contra «ahora»): Markosblues, Un León Marinero y Sangre de Coyote con «Nuevo video»; DwardNoize y Robscan con «Nuevo audio». En la tarjeta grande de «Artistas destacadxs» va el chip sobre la foto, con el trato de «Hoy», en todas las combinaciones (también en «Hoy», que así es más fiel a producción); en las redondas y en los avatares de E5, en la línea de abajo.
- **«Si son mis planes decir que vas es redundante»:** en «Tus planes» ya no se dice «Vas»; solo se marca «Te interesa», que ahí es la excepción. Lo que no lo dice es a lo que vas.

Comprobado en Chrome a 390×844 con la página envuelta como al publicarla, sin errores: las cejas de «Tus planes» dicen «Evento», «Evento · Te interesa» y «Festival · Te interesa»; hay cinco rótulos de novedad en «Calma» y cinco en «Hoy».

- `23-artistas-nuevo-video.png` — «Calma»: «Artistas destacadxs» con Markosblues y su chip violeta «Nuevo video» abajo a la izquierda de la foto; Fozco sin novedad; debajo, «Artistas de la semana» en redondo.

## E9 · Artistas como eventos (comentario del founder)

Sobre el carril «Artistas destacadxs» (2026-10-10): «para este carril usar jerarquía de nuevos eventos». Se añadió **E9**, encendido en «Calma» y en «Mínima»: cada artista toma la tarjeta de un evento de esa misma combinación. La foto mide lo que el cartel (165×206 con E1; la mediana con E5), con «Nuevo video» o «Nuevo audio» encima. Debajo van la disciplina en la ceja, el nombre como título y el género; si toca esta semana, su fecha como la de un evento. Sin botón de seguir, igual que el evento sin «Voy»: se sigue desde la ficha. La disciplina y el género son los reales de cada ficha. La llave de `localStorage` pasa a `inicio-tarjetas:estado:3`.

Comprobado en Chrome a 390×844, sin errores. «Nuevos eventos» y «Artistas destacadxs» miden lo mismo: tira `grande cartel-45`, foto de 165×206, título de 17 px y ningún botón. Un clic real en la foto de Markosblues abre su ficha.

- `24-e9-artistas-como-eventos.png` — «Calma»: «Artistas destacadxs» con Markosblues («Nuevo video» sobre la foto; «MÚSICA», el nombre y «jazz, blues y soul») y Fozco («rock, metal y alternativo»), sin botones; debajo, «Artistas de la semana» en redondo como antes.

## Vuelven los chips de «Te interesa» y «van» (comentarios del founder)

En la tarjeta del tributo a The Beatles, «regresar a chip te interesa»; en la de Chatbot Challenge, «regresar a chip cuantos van». Con E3, el dato de la persona vuelve a ser un chip sobre el cartel, abajo a la izquierda como en producción: «Te interesa» con su fondo violeta claro, o cuántos van con el fondo de vidrio. La clase se queda arriba del título; «Hoy» y la sesión siguen en la línea de cuándo, así que el chip de «van» sale también en lo de hoy. La llave de `localStorage` pasa a `inicio-tarjetas:estado:4`.

Comprobado en Chrome a 390×844, sin errores. En «Tus planes», Kopk Poj lleva «1 va», y el tributo a The Beatles y KOWAIFEST llevan «Te interesa». En «Destacados», el laboratorio lleva «1 va», y DESIERTO y Chatbot Challenge «2 van».

- `25-chip-te-interesa.png` — «Calma», «Tus planes»: «Te interesa» en violeta claro sobre la foto de la Cineteca y «1 va» sobre el cartel de Kopk Poj; el sello de fecha arriba a la derecha.
- `26-chip-cuantos-van.png` — «Calma», «Destacados»: «2 van» sobre el cartel de Chatbot Challenge; Cinema sin chip.

## El mes del sello, en color (comentario del founder)

Sobre el mes del sello de Fotomúsica en «Nuevos eventos» (2026-10-10): «resaltar con color». El mes (o el día de la semana con E8b) pasa a `--primario`, el violeta de la app, en peso 700, como el mes de una hoja de calendario. Es el mismo violeta del cuándo, así que también vale con E4. El número sigue en negro.

Comprobado en Chrome a 390×844, sin errores: el mes pinta `rgb(109, 52, 200)` sobre el fondo de vidrio del sello.

- `27-mes-del-sello-en-violeta.png` — «Calma», «Nuevos eventos»: «oct» en violeta sobre el 16 de Un León Marinero y el 17 de Fotomúsica.

## La sesión junto a la clase (comentario del founder)

Sobre la ceja del laboratorio en «Destacados» (2026-10-10): «¿podemos colocar las sesiones aquí?». Con E3, la sesión deja la línea de cuándo y va en la ceja, junto a la clase: «TALLER · SESIÓN 1 DE 4»; la línea de cuándo queda en «hoy · 17:00».

Comprobado en Chrome a 390×844, sin errores. La ceja cabe en una línea en la tarjeta de 165 px.

- `28-sesion-junto-a-la-clase.png` — «Calma», «Destacados»: el laboratorio con «TALLER · SESIÓN 1 DE 4» arriba del título, «1 va» sobre el cartel y «hoy · 17:00» abajo; a su lado, Privacidad y elegancia con «EVENTO».

## E10 · Sin cartel: título abajo (comentario del founder)

Sobre la tarjeta sin cartel del recital de la Academia Inspiratio en «Esta semana» (2026-10-10): «Título en la base, logo en extremo superior izquierdo». Se añadió **E10**, encendido en «Calma» y en «Mínima». En la tarjeta sin cartel, el símbolo SN (20 px) va arriba a la izquierda, y la fecha y «Nuevo» van juntos arriba a la derecha para que el símbolo quede solo en su esquina. Abajo van los chips y el título con su ceja. En «Hoy» la tarjeta sigue como en producción. La llave de `localStorage` pasa a `inicio-tarjetas:estado:5`.

Comprobado en Chrome a 390×844, sin errores. En las tres tarjetas sin cartel de «Esta semana» (el recital, la lectura a Olimpia Badillo y «Yo Marcos»), el símbolo está a 12 px de la esquina superior izquierda, el sello de fecha arriba a la derecha y el título termina a ras de la base de la tarjeta de 206 px.

- `29-e10-sin-cartel-titulo-abajo.png` — «Calma», «Esta semana»: el recital y la lectura a Olimpia Badillo con «SN» arriba a la izquierda, «oct 13» y «oct 15» arriba a la derecha, y «EVENTO» con el título abajo; debajo, «Festivales y expos» con sus sellos de rango («oct → 24», «oct → 28»).

## La fecha del pie, en violeta otra vez, y la proporción de Instagram (comentarios del founder)

- **«Resaltar con color la fecha, como antes»** (sobre el laboratorio en «Destacados»): con E8 la línea de cuándo había quedado en gris; vuelve a `--primario`, también en las tarjetas de artista de E9. El lugar sigue en gris, encima de la fecha, como en «Conciertos».
- **«¿La proporción puede ser la misma que se usa para publicar en Instagram?… Solo confirma»** (sobre CINEMA en «Festivales y expos»): confirmado y medido. Con E1 la tarjeta grande mide 165×206 (0,800, es decir 4:5, el post vertical de Instagram de 1080×1350) y la mediana de E5, 132×165. En «Hoy» mide 165×248 (casi 2:3) con la franja encima, por eso ahí el cartel se recorta. La tarjeta de CINEMA lleva el cartel de Chatbot Challenge porque el festival toma la portada de su próximo acto (OL-346, regla del founder); no es un respaldo, como dijo por error la respuesta automática.

Comprobado en Chrome a 390×844, sin errores: la fecha pinta `rgb(109, 52, 200)` y el lugar `rgb(92, 92, 92)`.

- `30-fecha-en-violeta.png` — «Calma», «Destacados»: «hoy · 12:00» y «hoy · 17:00» en violeta bajo «Galería Casa Diana» y «Aurora Co-Lab» en gris.

## E11 · «Tus planes», tu espacio (comentario del founder)

Sobre la cabecera de «Tus planes» (2026-10-10): «¿Cómo podemos resaltar todo el carril de planes? Se trata de que se entienda que este es su contenedor con sus eventos». Propuesta del gestor, como **E11**, encendido en «Calma» y en «Mínima»: región común, con una banda de `--primario-suave` (el violeta claro que ya usa el chip «Te interesa») de borde a borde detrás de todo el carril, del título a la última línea de las tarjetas. No suma elementos ni colores nuevos, y las tarjetas quedan alineadas con las de los demás carriles. Con E4 la banda pasa a un gris neutro. La llave de `localStorage` pasa a `inicio-tarjetas:estado:6`.

Comprobado en Chrome a 390×844, sin errores: la banda mide los 390 px de ancho y pinta `rgb(238, 231, 248)`. La primera tarjeta empieza en x = 20, igual que en «Destacados».

- `31-e11-tus-planes-tu-espacio.png` — «Calma»: «Tus planes» sobre la banda violeta clara, con Kopk Poj («1 va») y el tributo a The Beatles («Te interesa»); debajo, «Destacados» sobre el fondo de siempre.

## El festival en curso dice cuándo termina (comentario del founder)

Sobre la línea de cuándo de CINEMA (2026-10-10): «Sería mejor decir que termina el "Viernes" 24 de oct». El 24 de octubre de 2026 es sábado (el 10 es sábado), así que con E8 un festival que ya empezó dice «Hasta el sáb 24 de oct», con el mismo formato que ya usan las exposiciones del carril («Hasta el dom 1 de nov»), en vez de «Del 29 de sep al 24 de oct». Ciclo Fellini queda en «Hasta el mié 28 de oct». El que no ha empezado conserva su rango, y en «Hoy» sigue el texto de producción.

Comprobado en Chrome a 390×844, sin errores. Las líneas de «Festivales y expos» con «Calma» dicen «Hasta el sáb 24 de oct», «Hasta el mié 28 de oct» y, en las expos, «Hasta el dom 1 de nov», «Hasta el lun 2 de nov», etc.; «Hoy» sigue con «Del 29 de sep al 24 de oct».

- `32-festival-hasta-cuando.png` — «Calma», «Festivales y expos»: CINEMA («Varias sedes», «Hasta el sáb 24 de oct») y Ciclo Fellini («Hasta el mié 28 de oct») con sus sellos «oct → 24» y «oct → 28».

## E11 sin banda: tres maneras de marcar «Tus planes»

El founder rechazó la banda de color («Rechazada la banda de color»). Se quitó de «Calma» y del código, junto con su captura 31. En su lugar hay tres ejercicios sin relleno, que no se suman: si hay varios encendidos, gana E11a y luego E11b. Ninguno va en «Calma» hasta que el founder elija.

- **E11a · Contorno:** un borde violeta fino (40 % de opacidad) con esquinas redondeadas encierra título y tarjetas, a 8 px del borde de la pantalla. Por dentro, el título y las tarjetas quedan a 20-21 px del borde, como en los demás carriles.
- **E11b · Línea:** una línea violeta de 3 px a la izquierda, en el margen, de la cabecera a la última tarjeta.
- **E11c · Ícono y aire:** el marcador de «Me interesa» en violeta junto a «Tus planes» y más espacio arriba y abajo del carril.

Comprobado en Chrome a 390×844, sin errores: «Calma» queda sin fondo en «Tus planes» y cada variante pone su clase. La primera tarjeta empieza en x = 21 con contorno y en x = 20 con línea y con ícono, igual que en «Destacados» (x = 20). «Mínima» toma el contorno.

- `33-e11a-tus-planes-contorno.png` — «Tus planes» dentro de una caja de borde violeta fino.
- `34-e11b-tus-planes-linea.png` — la línea violeta a la izquierda del carril, del título a la última tarjeta.
- `35-e11c-tus-planes-icono.png` — el marcador violeta junto a «Tus planes» y más aire arriba.

## Firma (2026-10-10)

**El founder, textual, en un comentario de la página:** «Listo, te acepto esta versión». A la pregunta de qué combinación veía: «E1 · E3 · E3B · E7 · E8 · E8C · E9 · E10», «y además los ejercicios que te pedí».

**Lo firmado**, que es el preajuste nuevo **«Firmada»** y la combinación con la que abre ahora la página:
- **E1 · Un solo título:** con cartel, la tarjeta es el cartel entero en 4:5 (la proporción del post vertical de Instagram) y el título va debajo como oración.
- **E3 + E3b · Rótulos fuera del cartel, evento por omisión:** la clase va chica arriba del título solo si no es evento (TALLER, EXPO, FESTIVAL), con la sesión al lado («TALLER · SESIÓN 1 DE 4»); «Hoy» va en la línea de cuándo. Sobre el cartel queda un solo chip: «Te interesa» o cuántos van.
- **E7 · «Ahora» sin repetir.**
- **E8 + E8c · Fecha en el cartel, a la derecha:** sin el botón de «Voy»; el sello de mes y día va arriba a la derecha, donde estaba el check, con el mes en violeta. Un festival en curso dice «Hasta el sáb 24 de oct».
- **E9 · Artistas como eventos** en «Artistas destacadxs», con «Nuevo video» o «Nuevo audio» sobre la foto y sin botón de seguir.
- **E10 · Sin cartel: título abajo**, con el símbolo SN arriba a la izquierda.
- **Los ajustes de los comentarios**, que ya están en el código para cualquier combinación: «Nuevo video/audio» reales en artistas; sin «Vas» en «Tus planes» (sí «Te interesa»); los chips de «Te interesa» y «van» sobre el cartel; la fecha del pie en violeta; el lugar en gris encima de la fecha.

**Queda por elegir:** cómo se marca «Tus planes» como contenedor (E11a contorno, recomendación del gestor; E11b línea; E11c ícono y aire; o nada). La banda de color está rechazada.

**Medidor con «Firmada»** (primera pantalla, 390×844): 5 rótulos, 0 botones, 1 color, 0 títulos en mayúsculas y 0 cortados, contra 4, 2, 3, 2 y 0 de «Hoy».

- `36-firmada-pliegue.png` — la versión firmada al abrir: «Tus planes» con Kopk Poj («1 va») y el tributo a The Beatles («Te interesa»), sin rótulo «EVENTO», con los sellos «oct 10» a la derecha y las fechas en violeta.
- `37-firmada-bajando.png` — «Destacados» con el laboratorio («TALLER · SESIÓN 1 DE 4», «1 va») y «Esta semana» con carteles 4:5 y sus sellos.
- `38-firmada-hoja.png` — la hoja de ejercicios con los cuatro preajustes, «Firmada» elegido, su combinación y el medidor.
