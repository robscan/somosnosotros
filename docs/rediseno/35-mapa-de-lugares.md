# 35 · Mapa de lugares: ubicación, encuadre y pines con el día

**Estado:** prototipo para firmar (sin código). · **OL:** OL-124 · **Bitácora:** [159](../bitacora/2026/09/159-mapa-lugares-prototipo.md) · **Pieza:** B1 de la [cola](../ops/COLA_DE_PIEZAS.md). · **Prototipo:** [`prototipos/mapa-lugares.html`](prototipos/mapa-lugares.html) (se abre en el navegador, sin servidor ni llaves).

## De dónde sale

La lista del founder del 2026-09-21, tal cual:

- **L7.** «Agregar botón de ubicación actual y encuadre en mapa de lugares».
- **L11.** «Distinguir lugares con eventos pronto, considerar poner Hoy o "22" (fecha con formato calendario) del evento en el pin».
- **L31.** «En el mapa se resaltarán lugares destacados y con eventos esta semana, recordar volver a poner el botón de ubicación actual. Se puede usar el extremo inferior izquierdo similar a posición de back to top de listados para mantener consistencia».
- **L8.** «Considerar cambio de nombre de lugares a mapa». Es decisión del founder; al final va una recomendación.

## Qué se ve hoy

![Producción, 2026-09-22](capturas-35/produccion-mapa-hoy--390x844.png)

Captura real de somosnosotros.org/lugares tomada con Chrome a 390×844 el 2026-09-22 (`capturas-35/produccion-mapa-hoy--390x844.png`). Lo que se ve:

- **Al abrir, el mapa encuadra los 58 lugares a la vez.** Sale la ciudad entera y los lugares del centro quedan apelotonados en una bola de puntos con los nombres encimados («Casa de Cultura del Barrio de Tlaxcala» sobre «Museo Federico Silva»). Para ver algo hay que acercar con los dedos.
- **Ningún punto dice si el lugar tiene evento.** Todos son iguales: un punto del color de acción de 10 px. Un lugar con evento solo «gana el sitio» a otro cuando sus nombres chocan, y eso no se nota. El único que se distingue es el destacado (naranja): hoy, el Museo Federico Silva.
- **No hay botón de ubicación.** La ubicación se pide con la pestaña «Cercanos» de arriba, que centra el mapa en la persona. Fue lo que L31 pidió volver a poner.
- **La esquina de abajo a la izquierda la ocupa la ⓘ de Mapbox**, justo donde en los listados va el botón ↑ de volver arriba. La marca «mapbox» está debajo.
- **Abajo a la derecha, «Registrar lugar».** Al tocar un punto sale una tarjeta flotante (foto, nombre, tipo, «Próximo: sáb 26 sep · 19:00», botón chico «Ver») y Registrar se esconde.

## Qué cambia

1. **El encuadre al abrir** muestra lo que importa esta semana, no toda la ciudad.
2. **Cada pin dice cuándo:** «Hoy» o el día en dos letras si el lugar tiene evento en los próximos siete días.
3. **Los destacados llevan un aro** además del naranja que ya tienen.
4. **Botón de ubicación abajo a la izquierda**, el mismo botón que el ↑ de los listados.
5. **La tarjeta del pin es una hoja corta** con el nombre, el próximo evento y «Ver ficha».

Y dos consecuencias que también decide el founder: «Cercanos» sale de las pestañas del mapa (el botón hace lo mismo) y la ⓘ de Mapbox se mueve junto a la marca.

![Sin ubicación](capturas-35/prototipo-sin-ubicacion--390x844.png)

## Cómo se decide el encuadre

El mapa no filtra nada: todos los lugares siguen ahí al moverlo con el dedo. Solo cambia qué se ve al abrir (el contexto ordena, no limita).

- **Sin ubicación:** el mapa abarca los lugares con evento en los próximos siete días y los destacados. Si con eso quedan menos de tres, se completa con los lugares más cercanos al centro de la ciudad hasta llegar a seis. Nunca se acerca más que a la escala de barrio (la misma que hoy usa la búsqueda) ni se aleja más que la ciudad entera. Con cero lugares queda la ciudad, como hoy.
- **Con ubicación:** la persona al centro (el punto azul de siempre) y el mapa se acerca hasta que quepan los cinco lugares más cercanos; con el mismo tope de cerca y de lejos. Mover el mapa con el dedo no quita el punto azul; volver a tocar el botón vuelve a centrar.
- **Con un tipo elegido (Museo, Teatro…) o una búsqueda:** igual que hoy, se encuadra lo encontrado.
- **«Esta semana» es la misma regla que en la agenda:** hoy y los seis días que siguen (`tramo` en `src/lib/fechas.ts`). Así ningún día de la semana se repite dentro de la ventana y las dos letras no dan lugar a duda.

## Qué muestra cada pin

Los lugares siguen siendo capas del propio mapa (círculo y nombre), no elementos encima: el mapa resuelve los choques y la escala (decisión del 2026-09-14). Solo se añade texto dentro del círculo.

| Lugar | Pin | Nombre debajo |
| --- | --- | --- |
| Sin evento en siete días | Punto de 10 px del color de acción con línea blanca (como hoy) | Del color de acción |
| Con evento en los próximos seis días | Círculo de 28 px con el día en dos letras en blanco y negrita: Lu, Ma, Mi, Ju, Vi, Sá, Do | Igual; gana el sitio a los puntos si chocan |
| Con evento hoy | El mismo círculo con «Hoy» | Igual |
| Destacado | Naranja cempasúchil (decidido el 2026-09-16), 14 px, línea blanca de 2 px y un aro naranja alrededor (el «borde» de L31); encima de todos | Naranja oscuro; gana el sitio a todos |
| Destacado con evento | El círculo naranja con «Hoy» o el día, con su aro | Igual |
| El que tiene la tarjeta abierta | Crece un 30 % | Igual |
| Privado (solo lo ve el administrador) | Gris, como hoy | Gris |

Por qué el día en letras y no el número que proponía L11 («22»): con una ventana de siete días, «Ju» dice más que «24» (la persona piensa «el jueves», no «el 24»), cabe en el círculo sin achicar la letra, y «Hoy» queda como la única palabra, la que más importa. Mañana no lleva palabra propia: muestra su día, para que la regla sea una sola.

Los nombres del mapa siguen en la letra del estilo de Mapbox (DIN Pro Bold), como hoy; el prototipo los dibuja con Bricolage porque no carga Mapbox.

## Qué pasa al tocar un pin

![Pin tocado](capturas-35/prototipo-pin-tocado--390x844.png)

Sale una **hoja corta** pegada abajo, de borde a borde, encima de la navegación:

- Imagen del lugar (sin foto, el símbolo SN ya generado, en cuadro redondeado).
- Nombre, tipo y, si es destacado, la etiqueta «Destacado» con su punto naranja.
- El próximo evento en una línea: «Hoy · 20:00 · Orquesta Sinfónica de SLP». Sin evento: «Sin eventos próximos».
- Un solo botón, a lo ancho: **«Ver ficha»**. Una decisión por pantalla.

Mientras la hoja está abierta, el botón de ubicación y «Registrar lugar» se retiran (hoy Registrar ya lo hace). Tocar el mapa la cierra; tocar otro pin la cambia. No apila historial: es la misma pantalla (filtrar no es navegar).

Lo que cambia respecto a la tarjeta de hoy: ocupa el borde inferior en vez de flotar; dice el nombre del evento y no solo la fecha; y el botón es grande y va en la zona del pulgar, en vez del «Ver» chico a la derecha.

## El botón de ubicación

![Con ubicación](capturas-35/prototipo-con-ubicacion--390x844.png)

- **Dónde y cómo:** abajo a la izquierda, a 20 px del borde y a 16 px sobre la navegación. Es el mismo botón que el ↑ de los listados (`.volver` en `src/components/ui/Cabecera.module.css`): 48 px, redondo, blanco, con borde y la sombra flotante. Icono: la mira de ubicación que ya existe en la app (`IconoUbicacion`), en tinta.
- **Al tocarlo:** pide la ubicación al navegador (como hoy hace «Cercanos»), no la guarda y centra el mapa en la persona. Mientras llega, el icono late como los chips «en camino»; sin texto. Con ubicación, el icono pasa al color de acción con el centro relleno; volver a tocarlo vuelve a centrar.
- **Si la persona la niega o falla:** el mismo aviso de hoy encima del mapa («No pudimos leer tu ubicación. Actívala para este sitio en los ajustes del teléfono») y el botón sigue ahí.
- **Con la hoja del lugar abierta, se retira**, igual que Registrar.

Dos consecuencias:

1. **«Cercanos» sale de las pestañas del mapa.** Con el botón, la pestaña sería un segundo mando para la misma decisión, y eso lo prohíbe la casa (progressive disclosure: «jamás dos accionables para la misma decisión»). En la **Lista**, «Cercanos» se queda, porque ahí ordena los renglones por distancia. Las pestañas de Mapa y Lista quedan distintas por un chip; el tipo elegido sigue compartido por la URL, como hoy. Si el founder prefiere que las dos vistas tengan pestañas idénticas, la alternativa es dejar «Cercanos» en el mapa haciendo exactamente lo mismo que el botón: funciona, pero son dos mandos. **Recomendación: quitarla del mapa.**
2. **La ⓘ y la marca de Mapbox** (la licencia pide que las dos se vean) se ponen juntas, abajo, entre el botón de ubicación y «Registrar lugar». Mapbox deja elegir su posición; hoy están en la esquina izquierda.

## Estados

- **Vacío por causa:** sin lugares en la ciudad, el mapa muestra la ciudad y el texto de hoy; una búsqueda sin resultado dice «Ningún lugar se llama así. Si existe, regístralo», como hoy.
- **Carga:** «Cargando el mapa…», como hoy. El botón de ubicación no sale hasta que el mapa está listo.
- **Error con salida:** sin token o sin mapa, el aviso de hoy; ubicación negada, el aviso con la salida a los ajustes.
- **Éxito:** los tres estados del prototipo.

## L8 · ¿«Mapa» o «Lugares»? Recomendación para el founder

**Recomiendo seguir llamando «Lugares» a la sección**, por cuatro razones:

1. **La pestaña nombra lo que la persona busca, no la herramienta.** Alguien quiere saber a dónde ir; el mapa es la forma de verlo. «El texto habla del mundo de la persona, nunca de la maquinaria» (UX invisible).
2. **Lugares tiene dos vistas, y la lista no es un mapa.** «Mapa › Lista» se leería raro; «Lugares › Mapa · Lista» se lee solo.
3. **El icono ya es un pin.** Dice «mapa» sin decirlo. La navegación queda Agenda · Lugares · Artistas: los tres tipos de ficha del grafo cultural (doc 24), en paralelo.
4. **Convención.** Las apps que se llaman «Mapas» son mapas; la nuestra es un directorio que se ve en un mapa (ley de Jakob).

A favor de «Mapa», con honestidad: con los pines diciendo «Hoy» y el día, el mapa se vuelve «la agenda sobre el mapa», y mucha gente dice «ver el mapa»; es una palabra más corta; y es idea del founder. Si lo elige, cambia una etiqueta en la navegación y el título de la pestaña del navegador; la búsqueda seguiría diciendo «Buscar un lugar». Es barato probarlo después. Si lo que se busca es que el mapa pese más, ya es la primera vista de la sección.

## Lo que no cambia

El estilo claro y plano del mapa, los colores (acción y naranja), que la ubicación no se guarda y solo sirve para centrar, los chips de tipo, la búsqueda con su encuadre, la memoria de pantalla al volver de una ficha, «Registrar lugar», y que todo sigue siendo capas de Mapbox.

## Prototipo y capturas

`prototipos/mapa-lugares.html`: tres teléfonos a 390×844 con la misma pantalla. El mapa está dibujado a mano en SVG (calles, la Alameda, los cerros del sur), sin Mapbox ni token; los lugares son nombres reales del catálogo en posiciones inventadas. Tocar un pin abre su hoja, tocar el mapa la cierra, el botón pone o quita la ubicación. Fuente Bricolage Grotesque cargada de Google Fonts, como en los demás prototipos.

Capturas reales (Chrome de la Mac por `playwright-core`, `document.fonts.check('16px "Bricolage Grotesque"')` = true, 390×844 a doble densidad), en [`capturas-35/`](capturas-35/):

- `produccion-mapa-hoy--390x844.png` — producción hoy: toda la ciudad de golpe, los puntos del centro apelotonados y encimados, un destacado naranja, la ⓘ de Mapbox abajo a la izquierda y ningún botón de ubicación.
- `prototipo-sin-ubicacion--390x844.png` — al abrir: seis lugares con evento (dos «Hoy», uno naranja con aro; Mi, Ju, Vi, Sá), dos destacados con aro, puntos chicos para el resto, el botón de ubicación en tinta abajo a la izquierda y «mapbox ⓘ» entre los dos botones.
- `prototipo-con-ubicacion--390x844.png` — tras tocar el botón: el punto azul con halo al centro del mapa, los lugares cercanos alrededor (Teatro de la Paz «Hoy», Museo Laberinto «Sá», Museo Federico Silva naranja) y el botón en el color de acción.
- `prototipo-pin-tocado--390x844.png` — Teatro de la Paz tocado: el pin «Hoy» crece, abajo la hoja con el símbolo SN, «Teatro de la Paz», «Teatro», «Hoy · 20:00 · Orquesta Sinfónica de SLP» y el botón «Ver ficha» a lo ancho; los botones flotantes retirados.

## Qué toca en el código cuando se firme (para el operador)

- `src/components/Mapa.tsx`: el encuadre inicial (lugares de la semana y destacados; con ubicación, los cinco cercanos); en la capa de puntos, radio según `dia`; una capa de texto para «Hoy»/día dentro del círculo; el aro de los destacados; la ⓘ junto a la marca. La etiqueta del día se calcula en el servidor con la zona del evento (`ProximoEvento.zona`) y llega en las propiedades del punto.
- `src/app/lugares/VistaLugares.tsx` y `lugares.module.css`: el botón de ubicación (reutiliza `pedirUbicacion`), la tarjeta como hoja, «Cercanos» solo en la vista Lista.
- Sin migraciones ni variables nuevas. Pruebas focalizadas: la función que da «Hoy», «Ju» o nada según la fecha y la zona; la selección de lugares del encuadre; captura 390×844 de los tres estados en el iPhone del founder.
