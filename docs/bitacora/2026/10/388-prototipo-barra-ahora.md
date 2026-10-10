# 388 · Prototipo: la barra «Ahora» de Inicio y la regla de las 3 horas (OL-357)

**Fecha:** 2026-10-09. **Rama:** `prototipo-barra-ahora`, base `origin/main` (`0c8fd99f`). **Operador:** Claude (chat «Barra marquee de eventos en directo»).
**Estado:** prototipo probado en Chrome de la Mac (390×844 y 320) y publicado como página privada para verlo en el iPhone: https://claude.ai/artifact/YKtiejd9wXBZCGtfKYcqvi. **Sin código de la app y sin migración.** Falta la firma del founder.

## Qué pidió el founder (textual)

«crea una barra con marquee tipo noticiero, que aparezca en la parte superior debajo de las barras, que diga: Sucediendo ahora, próximo para hoy y mañana. Destacados, etc (analiza y cuestiona lo que te digo, propón clasificación de ese contenido de manera eficiente. Ojo con presentar eventos que ya pasaron y terminaron, ya he visto que sigues poniendo eventos de hoy a las 10 am y son las 6 pm. Incluso podríamos pensar en una disposición tipo guía de canales de cable.» Después: «primero prototipo».

## Por qué salen eventos de las 10:00 a las 18:00

No es un fallo de filtro, es una regla. Un evento **sin hora de fin** se da por terminado a la medianoche de su día (`terminaDe`, `src/lib/fechas.ts:328`; la columna generada `termina` de `20260917100000_zona_horaria.sql:81`, que usa `filtroSinPasar`). Viene de una decisión del founder del 2026-09-16: «los eventos de hoy se quedan a la vista hasta que termine el día o termine el evento». Comprobado en producción el 2026-10-09 a las 16:15: «Inauguración: Dos siglos a través de la lente, hoy · 10:00» seguía primero en «Esta semana».

La medida que sostiene el cambio está en `src/app/nuevo/evento/pasos.ts:469`: de 36 eventos con hora de fin (2026-10-05), 20 duran 3 h o menos (9 de 2 h, 6 de 3 h y 5 de 1 h), 12 son jornadas de museo de 7 a 9 h que ya traen su fin y 2 terminan al día siguiente.

## Lo que se cuestionó y lo que eligió el founder

1. **El marquee (texto corriendo sin parar):** cuesta leerlo y tocarlo, pide pausa por accesibilidad (WCAG 2.2.2: lo que se mueve más de 5 s) y va contra «una sola cosa a la vez». **Eligió un aviso a la vez:** cambia cada 5 s, se pasa con el dedo, al tocarlo abre la ficha y se queda quieto con «Reducir movimiento».
2. **«Destacados» no va en la barra:** ya tiene carril. La barra solo lleva lo que caduca pronto, por hora; un destacado que pasa hoy sí sale, por su hora.
3. **Sin hora de fin: eligió «3 h en toda la app».** Cambia su regla del 2026-09-16: la barra, la Agenda y los carriles de Inicio dejan de mostrar el evento 3 h después de empezar.
4. **La guía tipo canales de cable: eligió «primero en festivales».** Va dentro del programa de un festival (sedes en filas, horas en columnas, línea de «ahora»), en una pieza aparte. En Inicio, con los pocos eventos diarios de hoy, la cuadrícula saldría casi vacía.

## El prototipo

[`docs/rediseno/prototipos/barra-ahora.html`](../../../rediseno/prototipos/barra-ahora.html). Mismo armazón que los anteriores: tokens de `globals.css`, Bricolage de Google Fonts, el logotipo real (`public/logotipo.svg`) y la tira oscura. La barra usa `--banda` (de OL-351): **ningún color nuevo**. Debajo, «Destacados» y «Esta semana» se calculan con la misma regla que la barra, para ver que lo terminado sale de todas partes.

**La tira:** el día (vie 9 oct con los datos reales, sáb 31 oct para los actos de un festival, dom 1 nov para el último día de una exposición), la regla sin hora de fin (3 h contra la medianoche de hoy), la hora (07:00 a 23:55, o «Hora real» de San Luis Potosí, que se recalcula cada minuto como lo haría la app instalada), si la barra se va o se queda al bajar, y el movimiento. «Cómo decide la barra» resume las reglas.

**La barra:** franja `--banda` debajo de las dos barras fijas (BarraApp de 56 y la de contexto de 52, medidas en somosnosotros.org). Cada aviso es como un titular de noticiero: arriba la etiqueta con la hora y el lugar; debajo el título a todo lo ancho, en una línea. La urgencia se lee en el relleno de la etiqueta: lleno violeta con punto que late para **Ahora**, con borde blanco para **En un rato** y para la exposición que inaugura o cierra, apagado para **Hoy** y **Mañana**. Debajo, un segmento por aviso (como las historias de Instagram) se llena en 5 s. A la derecha, el botón de lista abre una hoja con **todo** lo de hoy, sin tope y por grupos: ofrece lo mismo sin movimiento y no obliga a esperar 40 s.

**Las reglas** (el orden es el de la barra):
1. **Ahora:** ya empezó y no ha terminado. Con hora de fin dice «Hasta 20:00»; sin ella, «Desde 17:30» (no se inventa un «hasta»).
2. **En un rato:** empieza en menos de 2 h, con la cuenta atrás («En 30 min», «En 1 h 15 min»).
3. **Exposiciones:** solo el día que inaugura o el último, hasta las 18:00 si no tiene horario (supuesto por confirmar).
4. **Hoy:** lo que empieza más tarde hoy.
5. **Mañana:** solo si ya no queda nada hoy o desde las 20:00.
6. Tope de 8. Del festival salen sus actos, nunca el festival entero (OL-347). Si no hay nada, la barra no sale y la línea gris vuelve bajo las barras.

**Los gestos:** tocar abre la ficha (en el prototipo, un aviso dice cuál); deslizar a un lado pasa al siguiente o al anterior; mantener el dedo la detiene; con el foco del teclado también se detiene y las flechas pasan. Los arrastres terminan solo con `pointerup` y `pointercancel` (Safari táctil dispara `pointerleave` en el primer movimiento). No cambia sola con la lista abierta ni con la pantalla escondida.

Datos: lectura pública de somosnosotros.org el vie 9 de oct a las 16:15. Sin hora de fin salvo el laboratorio de Aurora Co-Lab (17:00 a 20:00, de su cartel). Los del 31 oct y el 1 nov son parciales: solo lo que salía en Inicio.

## Capturas

[`docs/rediseno/capturas-388/`](../../../rediseno/capturas-388/), Chrome de la Mac con playwright-core, 390×844 (y una a 320), a 2×. Abiertas una por una:

- `01-vie-1615-regla-nueva.png` — 16:15: «EN 1 H 15 MIN · 17:30 · Centro de las Artes…» y «Presentación de Caracolas para Luciana». La inauguración de las 10:00 ya no está (terminó a las 13:00).
- `02-vie-1800-regla-de-hoy.png` — **el caso del founder:** con la regla de hoy, a las 18:00 la barra dice «AHORA · Desde 10:00 · Museo Francisco Cossío», «Inauguración: Dos siglos a través de la lente».
- `03-vie-1800-regla-nueva.png` — la misma hora con 3 h: «AHORA · Desde 17:30» y Caracolas para Luciana.
- `04-vie-1800-lista-regla-de-hoy.png` — la hoja con la regla de hoy: en «Ahora», la de las 10:00 «en curso» junto a la de las 17:30.
- `05-vie-1800-lista-regla-nueva.png` — la hoja con 3 h: Ahora (17:30), En un rato (18:30 «en 30 min», 19:00 «en 1 h»), Más tarde hoy (20:00).
- `06-vie-2100-entra-manana.png` — 21:00: tras los cuatro de «Ahora» entra «MAÑANA · 9:00 · Jardín Botánico El Izotal» (quinto de ocho segmentos).
- `07-sab31-1300-actos-de-festival.png` — «EN 1 H · 14:00 · Helipuerto…» y «Efecto Tlacoyo en Electric Universe Festival»: sale el acto, no el festival.
- `08-dom1-1200-ultimo-dia-expo.png` — «ÚLTIMO DÍA» y «La memoria del agua, exposición de Alejandra Fersco», con borde.
- `09-dom1-2230-sin-barra.png` — nada hoy ni mañana: la barra no sale y la línea gris vuelve bajo las barras.
- `10-al-bajar-se-va.png` — tras bajar 520 px solo quedan las dos barras de siempre.
- `11-al-bajar-se-queda.png` — la barra fija debajo de las dos barras: 108 + 72 px arriba.
- `12-vie-1800-a-320.png` — a 320: «EN 30 MIN · 18:30 · Centro de las Artes de S…» y el título cortado con puntos; nada se sale.

## Lo que queda por decidir (founder)

- **Firma del prototipo.**
- **Al bajar, ¿se va o se queda?** Recomendación: **se va**. Fija suma 72 px a los 108 de las dos barras: con la barra de secciones (60) quedarían 240 de 844 px para marcos, el 28 % de la pantalla, mientras la persona ya está mirando carriles. Al volver arriba, la barra vuelve a estar.
- El supuesto de las exposiciones sin horario (hasta las 18:00).
- (Tercera vuelta) **La entrada a las historias:** la barra con miniatura (recomendación: ocupa 72 px, dice qué pasa y cuándo sin tocarla, y conserva la lista completa) o la fila de círculos (más reconocible y enseña los carteles, pero ocupa unos 112 px y solo dice una hora).
- (Tercera vuelta) **Tarjetas:** título grande en toda la app, como pidió el founder, o solo en Inicio. Además, la fecha de «Caracolas para Luciana»: el cartel dice jueves 8 y la app viernes 9.

## Lo que costaría el código (después de la firma)

- **La regla de 3 h (pieza propia, recomendado):** `terminaDe` y `eventoPaso` (`lib/fechas`), `ocurrenciaPaso` (`lib/ocurrencias`, que ya pasa por `terminaDe`) y la columna generada `termina`. Hace falta **una migración** que recalcule `termina` con `inicio + 3 h` cuando `fin` es nulo, pensada como cambio de expresión de una columna generada (no se puede alterar en sitio: quitarla y volver a crearla con sus índices, o una columna nueva y cambiar `filtroSinPasar`). Afecta a todo lo que lee «ya pasó»: Agenda, Inicio, Lugares («En curso»), avisos, mapa y panel. Pruebas de `fechas`, `ocurrencias`, `inicio` y del banco de migraciones.
- **La barra:** un componente cliente en Inicio con lógica pura en `lib/` (la clasificación del prototipo, con pruebas) sobre los datos que Inicio ya carga (no hace falta consulta nueva: hoy y mañana ya están en «Esta semana»). Se recalcula cada minuto en el teléfono. La hoja usa `ui/Hoja`. Medición con `npm run medir`.
- **El orden por cercanía** dentro de cada grupo (lo pidió el análisis) necesita la ubicación que Inicio ya usa para ordenar; el prototipo ordena solo por hora.

## Arreglo tras la primera versión: el teléfono no recibía toques

El founder preguntó «¿Qué pasa con el icono de listado?». Con toques reales (clic de ratón en el navegador integrado a 375×812) el icono se marcaba pero la lista no se abría. La causa: el velo de la hoja, transparente con la hoja cerrada, cubría todo el teléfono y se quedaba con **todos** los toques (icono, barra y tarjetas); `elementFromPoint` en el centro del icono devolvía `#velo`. Las pruebas anteriores usaban `element.click()`, que no pasa por esa comprobación de qué hay bajo el dedo, y por eso no lo vieron. Arreglo: el velo lleva `pointer-events: none` y solo los recibe con la hoja abierta.

Al probar los gestos con toques reales salió otro fallo: un deslizamiento que empieza con el dedo quieto más de 350 ms se tomaba como «mantener» y no pasaba de aviso. Ahora el deslizamiento gana aunque la barra ya se hubiera detenido.

Comprobado con toques reales: el icono abre la lista, la ✕ y tocar fuera la cierran, tocar el aviso y una tarjeta dicen qué ficha se abriría, y deslizar pasa al siguiente aviso. Con eventos de puntero de tipo táctil: un deslizamiento lento pasa de aviso sin abrir la ficha, mantener la detiene y al soltar sigue en el mismo aviso, y un toque corto abre la ficha. Página publicada otra vez en el mismo enlace. Las capturas no cambian: el velo era invisible.

## Tercera vuelta: historias con el cartel, estética propia y título grande

**Lo que dijo el founder (textual):** «¿y si exploramos formato de historia? con imagen de cartel?»; después, con capturas de Apple Music («Playlists hechas para ti», «Estaciones para ti»): «¿y si creamos nuestra propia estética tipo Music de Apple? con degradados y partículas animadas?»; y, viendo las tarjetas de la primera versión: «me encanta como se ve en el prototipo por ejemplo el título en grande sobre la card de imagen, es una representación pero la sencillez ayuda a no gastar tanta atención y consumir rápido el contenido».

**Lo que se encontró en los carteles** (lectura pública de somosnosotros.org, 23 imágenes a 768 px, la medida que la app ya sirve con `next/image`; carpeta `docs/rediseno/prototipos/barra-ahora/`, 1,6 MB):
- De los 16 eventos de hoy y mañana, **5 no tienen cartel**: la app enseña la foto del edificio (Raúl Gamboa, IPBA, Museo del Ferrocarril ×2, Cineteca Alameda). En una pantalla vertical de historia, eso es una foto de arquitectura sin información.
- Las proporciones varían: casi todos 4:5, el laboratorio y la noche astronómica 3:4, tres cuadrados (linterna, pinceles, catrinas) y dos apaisados (Dos siglos 1,34, la Murcisemana 1,77). Las fotos de lugar son todas apaisadas.
- **Un dato a revisar:** el cartel de «Caracolas para Luciana» dice «JUEVES 8·OCT·2026 · 17.30 h», y la app lo tiene el vie 9 de oct a las 17:30. Una de las dos fechas está mal.

**La regla de la estética** (como Apple Music, que deja intacta la portada de cada disco y pone sus degradados solo en lo suyo): el cartel del lugar o del artista se enseña tal cual; lo que arma la app lleva nuestros degradados. Eso es el fondo de la historia y la portada de un evento sin cartel. Los colores salen del propio cartel: se reduce a 16×20 y se juntan los píxeles por tono. Un cartel casi sin color (croma menor de 70 de 255: la foto sepia de la trentina, el laboratorio en blanco y negro, Caracolas, Desierto, la linterna) usa una paleta propia, elegida por el id del evento. Son seis, con nombre de aquí: Cantera, Xantolo (el violeta de marca hacia el cempasúchil), Huasteca, Real de Catorce, Media Luna y Tangamanga. La línea gráfica no cambia: los degradados viven en superficies oscuras (la historia) y en portadas, no en la interfaz, que sigue clara.

**El prototipo** (mismo archivo; la tira ahora elige formato, tarjetas, día y estética, y lo demás pasa a «Más ajustes y reglas»):
- **Formato.** «Barra + historias»: la barra lleva a la izquierda la miniatura del cartel (dice que al tocarla se ve el cartel), y tocarla abre las historias en ese aviso. «Círculos + historias»: una fila de círculos como Instagram; el anillo de «Ahora» gira con el degradado de marca, el de «En un rato» es oscuro, los demás grises, y se apagan al verlos; debajo, «Ahora», «En 30 min» o «20:00». «Barra sola (v1)» queda para comparar.
- **Historias.** Pantalla completa sobre todo, con segmentos de 6 s (un cartel pide más lectura que un aviso). Cabecera con la etiqueta de urgencia, la hora y el lugar, y el título. Al centro, el cartel entero (proporción propia, esquinas de 8 y sombra). Abajo, «Ver ficha», «Me interesa» (estrella) y «Cómo llegar». Gestos como en Instagram: al apoyar el dedo se detiene; al soltar, si fue un toque de menos de 300 ms, pasa a la siguiente (o a la anterior en el tercio izquierdo); deslizar hacia abajo cierra. Al terminar la última, vuelve a Inicio.
- **Sin cartel**, la historia es tipográfica, como la portada de una lista de Apple Music. El sello SMSNSTRS va arriba a la derecha y, abajo a la izquierda, «Hoy · 19:00», el título a 44 px en 800 condensado y el lugar. Lleva una sombra suave detrás del texto para que el blanco se lea con cualquier paleta: con Media Luna, el título quedaba sobre azul claro, el mismo problema de contraste que tiene «Nueva música» de Apple.
- **Estética.** «Degradado vivo»: un lienzo de 36×72 con cuatro luces que se mueven despacio (el navegador lo estira, y el estirado ya es el desenfoque, sin filtros) y 36 partículas como polvo en la luz. Solo corre con la historia abierta y visible; con «Reducir movimiento» queda un cuadro quieto y sin partículas. «Cartel desenfocado»: el cartel borroso detrás; sin cartel, la foto del lugar oscurecida.
- **Tarjetas: título grande** (lo que pidió el founder, por defecto). La tarjeta de la v1, con el título corto en mayúsculas arriba a la izquierda, ahora sobre el degradado de los colores de su cartel: el color más vivo a media luz, con las luces abajo y a la derecha para que la esquina del título quede oscura. El título corto sale de cómo ya se escriben los títulos de la app: lo que va antes de los dos puntos. En Inicio se lee; el cartel se mira al abrir la historia. «Tarjetas: cartel» enseña los carteles como hoy, para comparar.

**Fallos encontrados al probar con toques reales, y su arreglo:**
- Tocar la barra no abría nada con ratón ni en Android: el clic da el foco al botón, el foco detenía la barra y el arreglo del deslizamiento lento lo tomaba por «mantener». «Mantener» se mide ahora con su propio aviso, y el foco solo detiene la barra si viene del teclado. En el iPhone no pasaba: Safari no da el foco a un botón al tocarlo.
- En las historias, un toque de más de 0,22 s contaba como «mantener». Ahora decide la duración al soltar (300 ms).
- Con los círculos, la página se ensanchaba y se cortaba a la derecha: `overflow: clip` no evita que el contenido ensanche el marco. Lo arreglan `min-width: 0` y la columna `minmax(0, 1fr)` del cuerpo.
- Las etiquetas pisaban los círculos: la imagen tomaba su alto natural. El anillo lleva ahora una sola celda fija.
- El sello de las portadas generadas salía estirado en «Tarjetas: cartel».
- El marco del foco salía en la ✕ al abrir con un toque. Ahora solo sale si se abre con el teclado.
- Mientras la historia se cierra (0,2 s), su capa seguía recibiendo toques: uno rápido sobre un círculo contaba como «siguiente». Ahora una historia que se cierra no recibe toques.

El founder dijo «cancela círculos, el formato de barra funciona» y, al ver que ya se estaban quitando, «no no, déjalos, pensé que no los habías terminado. Deja como está, lo reviso». Los círculos se quitaron y se repusieron tal cual; el prototipo queda con las dos entradas para que las revise.

Comprobado con toques reales (clic por coordenadas a 390×844 en el navegador integrado):
- La barra abre las historias.
- Un toque a la derecha pasa a la siguiente (0→1→2) y uno a la izquierda vuelve (2→1).
- Deslizar hacia abajo cierra y el foco vuelve a la barra.
- El círculo abre su historia, y su anillo se apaga al verla.
- «Me interesa» se marca sin pasar de historia.
- «Ver ficha» cierra y dice qué ficha se abriría.

Con eventos de puntero, mantener 600 ms detiene la historia y al soltar sigue en la misma. El ancho del documento se mantiene en 390 con los círculos.

**Capturas nuevas** (Chrome con playwright-core, 390×844 y una a 320, sin errores de página), abiertas una por una:
- `13-inicio-titulo-grande.png` — Inicio a las 16:15: la barra con la miniatura del cartel de Caracolas («EN 1 H 15 MIN») y Destacados con «LA MÚSICA DE LA GENERACIÓN TRENTINA» sobre granate y «LABORATORIO DE EXPLORACIÓN SONORA» sobre azul y violeta.
- `14-historia-cartel-degradado.png` — la historia de Caracolas: el cartel entero sobre el degradado de sus propios colores (azul y beige) con partículas.
- `15-historia-sin-cartel-degradado.png` — «¡Ah, qué la canción!: coro, baile y solistas», tipográfica sobre Media Luna, con el sello, «Hoy · 19:00» y el lugar; el título se lee sobre la sombra de abajo.
- `16-historia-cartel-desenfocado.png` — la misma de Caracolas con su cartel borroso detrás.
- `17-historia-sin-cartel-foto-lugar.png` — la del Raúl Gamboa con la foto del edificio oscurecida.
- `18-circulos-1800.png` — los círculos a las 18:00: «Ahora» con el anillo de degradado, «En 30 min» y «En 1 h» con anillo oscuro, «20:00» con anillo gris.
- `19-tarjetas-cartel.png` — «Tarjetas: cartel»: los carteles reales en los carriles y, en el de la canción (sin cartel), la portada de degradado con el sello.
- `20-tarjetas-titulo-esta-semana.png` — «Esta semana» con título grande: «PRESENTACIÓN DE CARACOLAS PARA LUCIANA, DE JACOBO REYNA» sobre verde y «¡AH, QUÉ LA CANCIÓN!» sobre azul.
- `21-historia-acto-de-festival.png` — sáb 31 oct a las 13:00: «Efecto Tlacoyo en Electric Universe Festival», el cartel sobre el morado sacado de él.
- `22-historia-sin-cartel-a-320.png` — la historia tipográfica a 320: el título en dos líneas, sin cortes.

**Cuarta opción de tarjeta: «título + cartel»** (founder: «¿podrías hacer una versión con tarjetas título grande y el cartel abajo para los que tienen?»), ahora la que sale por defecto. Es la tarjeta «Essentials» de Apple Music: arriba, una franja con el título corto sobre el degradado de su cartel; abajo, el cartel llena lo que queda, recortado desde arriba, que es donde suelen decir qué son. Sin cartel, la tarjeta entera es de título. La franja toma el alto de su título (hasta tres líneas: 59 a 78 px en una tarjeta de 165×248) y el cartel, el resto. El founder pidió «menos espacio para cartel, bájalo más» y se probó la franja al 58 % (144 y 104 px, cuatro líneas); después pidió revertir «la posición del cartel», y se volvió al alto del título.

Al hacerla se afinó el título corto:
- Sin dos puntos, corta en una coma seguida de minúscula: «Presentación de Caracolas para Luciana, de Jacobo Reyna» queda en «Presentación de Caracolas para Luciana».
- Se salta el tipo («Inauguración: Dos siglos…» queda en «Dos siglos a través de la lente»; «Inauguración: DESIERTO: …» en «DESIERTO») y el nombre del festival («CINEMA: El atractivo de la resistencia, …» queda en «El atractivo de la resistencia»), solo si lo que sigue empieza con mayúscula.
- «Verbena, Ritmo y Sabor: verbena musical» se queda con el festival.
- El corte de líneas va en el texto y no en la franja; antes asomaba una línea de más.

Comprobado con un toque real en una tarjeta (dice qué ficha se abriría); el ancho se mantiene en 390.

**El degradado, siempre del cartel** (founder: «¿podrías leer el color del cartel y definir el degradado en consecuencia?»). Antes, un cartel casi sin color usaba una paleta propia: la trentina, en sepia, salía granate y no se parecía a su cartel. Ahora:
- **Siempre del cartel:** el degradado sale de sus colores, también si es sepia o blanco y negro. Las paletas propias quedan solo para los eventos sin cartel.
- **Fondo legible:** el fondo de la tarjeta es el color más vivo del cartel, oscurecido lo justo para que el título blanco se lea (luminancia ≤ 0,12, contraste de 6:1 o más) y no a la mitad fija.
- **Unión con el cartel, probada y quitada:** la franja se fundía con el color del borde de arriba del cartel, para que el cartel pareciera salir de ella. El founder: «pusiste un degradado desde la imagen, ese efecto particularmente no me gusta». Se quitó con su cálculo, y la franja acaba en un corte limpio contra el cartel, como en «Essentials».

**Sin título repetido** (founder: «ahora tenemos la situación de que el título se duplica»). En «título + cartel» y en «título grande», debajo de la tarjeta ya no va el título: solo cuándo (violeta) y dónde (gris). El título completo va en el nombre del botón (lo lee el lector de pantalla), en la ficha y en la historia. En «Tarjetas: cartel» se queda debajo, porque el cartel no lo dice con las palabras de la app.

**El símbolo SN, no el logotipo** (founder: «si vas a usar logo en tus propuestas pon el símbolo de SN porfas. colócalo en las cards sin cartel también en la parte de abajo»):
- La historia sin cartel lleva arriba a la derecha el símbolo SN del arte final (`docs/diseno/logotipo/LogoFinal/SN - Symbol.svg`), en una copia en blanco para el prototipo (`barra-ahora/simbolo-sn-blanco.svg`), en vez del logotipo SMSNSTRS.
- Las tarjetas sin cartel lo llevan abajo a la derecha (18 px de alto), con «Hoy» abajo a la izquierda. En «Tarjetas: cartel», un evento sin cartel usa la misma tarjeta de título y se quita la portada generada aparte.
- La cabecera de la app sigue con el logotipo: es la de producción.
- Al ponerlo, el símbolo caía arriba a la izquierda, encima del título: `.portada > img` le fijaba arriba y a la izquierda en 0. Se le da su `inset` completo.

Captura `26-tarjeta-sin-cartel-con-simbolo.png`: «¡AH, QUÉ LA CANCIÓN!» sobre azul con «Hoy» y el símbolo SN abajo, junto a «DESIERTO» con su cartel.

Resultado en las capturas 23, 24 y 14:
- La trentina, en azul pizarra.
- El laboratorio, en negro oliva.
- Caracolas, en azul, también de fondo en su historia con el beige de su cartel.

- `23-tarjetas-titulo-y-cartel.png` — Destacados: «LA MÚSICA DE LA GENERACIÓN TRENTINA» sobre azul pizarra con su cartel debajo, cortado limpio (la foto y «Hoy»), y «LABORATORIO DE EXPLORACIÓN SONORA» sobre negro oliva con su cartel negro; debajo de cada una, solo «hoy · 18:30» o «mañana · 17:00» y el lugar.
- `24-tarjetas-titulo-y-cartel-esta-semana.png` — Esta semana: «PRESENTACIÓN DE CARACOLAS PARA LUCIANA» en tres líneas sobre azul con su cartel beige debajo, y la canción (sin cartel) entera de título.
- `25-tarjetas-titulo-y-cartel-a-320.png` — lo mismo a 320, sin cortes.

**Lo que costaría en la app** (después de la firma):
- **Colores del cartel:** se calculan una vez, al subirlo (cuatro colores guardados con el evento, en la misma pasada que ya lo reduce, OL-352). Ni las tarjetas ni las historias vuelven a pedir la imagen para eso.
- **Portada de un evento sin cartel:** la regla del founder dice «sin portada, imagen ya generada con el símbolo SN, nunca compuesta en vivo». La portada de degradado se generaría como imagen con el creador de cartel (satori, OL-324: una plantilla más), así que cumple la regla. Solo el fondo de la historia se mueve en vivo.
- **Tarjetas de título grande:** son CSS sobre esos cuatro colores, sin imagen. Inicio pediría menos imágenes a Supabase (la cuota de tráfico ya se agotó una vez, 2026-10-03), y el cartel solo se carga al abrir su historia, precargando únicamente la siguiente.
- **Historias:** un componente cliente con un lienzo; las partículas solo con la historia abierta.

## Límites

- El prototipo no ordena por cercanía ni lee la ubicación.
- Accesibilidad: además de los gestos y de «Reducir movimiento», la norma pide una forma visible de pausar lo que cambia solo. La hoja ofrece todo sin movimiento, y el foco detiene la barra; un botón de pausa sería la versión estricta y no se puso para no llenar la franja.
- El aviso al gestor de cambios (Gestor V, sesión `local_51c2d1e4`) no se entregó: la sesión no arrancó. Se le reenvía con esta entrega.
