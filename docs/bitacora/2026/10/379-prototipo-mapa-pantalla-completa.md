# 379 · Prototipo: el mapa de la ficha a pantalla completa, una versión ligera de Lugares

**Pieza:** OL-350. **Rama:** `prototipos-mapa-y-cabecera`, base `origin/main` (`04fd92bc`). **Fecha:** 2026-10-08. **Operador:** Claude (agente del gestor V).
**Estado:** prototipo gris navegable, probado en Chrome de la Mac (390×844 y 320). **Sin código de la app y sin migración.** Falta que el founder lo mire y firme las preguntas de abajo.

## Qué pidió el founder (2026-10-08, textual)

«En el mapa que muestra se debe poder navegar; propongo que al dar tap se haga en pantalla completa solo con los pines y que permita selección de pin como en sección de lugares; al seleccionar el pin que muestre ficha y permita ir a la ficha; que el mapa muestre opción de salir de pantalla completa; en resumen es como una versión lite de sección lugares en pantalla completa».

Ya decidido con él (por el gestor): el **toque** (no el arrastre) sobre el mapa estático de la ficha abre la capa; mapbox-gl se carga solo entonces; es el mismo mapa de Lugares con los pines de las sedes; al tocar un pin sale `TarjetaSede` (OL-348: el ángulo SIEMPRE abre una ficha, nunca mapas) con «Cómo llegar»; ✕ arriba a la izquierda y el Atrás del sistema la cierran (es una capa, no apila pantallas); con una sola sede se abre igual.

## El prototipo

[`docs/rediseno/prototipos/mapa-pantalla-completa.html`](../../../rediseno/prototipos/mapa-pantalla-completa.html). Mismo armazón que `exposicion-festival-taller.html` y `publicar-por-pasos.html` (tokens de `globals.css`, Bricolage de Google Fonts, la tira oscura arriba para elegir el caso, que también dice a dónde llevaría cada toque). El mapa es el fondo de calles dibujado de `mapa-lugares.html` (con manzanas alrededor para poder moverlo); sin Mapbox. Se navega de verdad: tocar el mapa de «Dónde» abre la capa, el mapa se arrastra (y con la rueda se acerca en el escritorio), tocar un pin saca su tarjeta, tocar el mapa vacío o el mismo pin la suelta, ✕, Esc y el Atrás del navegador la cierran.

Casos de la tira: 1-3 evento con una sede del catálogo (el «Taller de cianotipia» de producción, hoy en Foro lunaria): la ficha, el mapa, el pin elegido; 4-7 festival con tres sedes, una fuera del catálogo (el «Festival de Cine de Invierno» del respaldo local, el mismo de las bitácoras 368 y 377): la ficha, el mapa, una sede del catálogo y la de fuera; 8 CINEMA: XV Festival de Cine México-Alemania con sus siete sedes reales (Alboa The Park, fuera del catálogo), para ver la densidad. Las posiciones en el mapa dibujado son inventadas.

## Decisiones del prototipo (por confirmar)

1. **La entrada.** Toda la imagen estática es el blanco del toque y lleva en su esquina un botón redondo de 36 con el icono de ampliar (la pista, sin letrero). **Cambia lo de OL-348 (decisión 5):** con una sede, el mapa de la ficha ya no abre Mapas: abre la capa; «Cómo llegar» sigue en las acciones de arriba y en la tarjeta del pin. Con varias sedes el mapa no era enlace; ahora abre la capa.
2. **Solo los pines de las sedes**, con la lengua de Lugares: punto de tinta si la sede no tiene actividad en los próximos siete días; disco violeta con el día de su próxima actividad («Hoy», «Sáb») si la tiene; el nombre debajo con halo blanco; si dos nombres chocan se esconde el de menos rango (gana el elegido, luego el que tiene día) y el punto nunca. El elegido: disco grande con aro blanco y sombra. Ningún otro lugar del directorio. Un sitio reservado no tiene pin (su punto no se publica); sin ninguna sede con punto no hay mapa, como hoy.
3. **El encuadre** deja todas las sedes a la vista sin tapar la ✕ ni el sitio de la tarjeta, con un tope de acercamiento para una sola sede. Si se elige un pin que queda bajo la tarjeta, el mapa se mueve lo justo para enseñarlo (250 ms; sin animar con movimiento reducido). Al mover el mapa aparece «Encuadrar» (el de Lugares) abajo a la derecha.
4. **La tarjeta del pin** es `TarjetaSede` tal cual (pin, nombre, la dirección con una sede o «N actividades» en un festival, ángulo a la ficha de lugar o de sitio) y debajo un botón secundario «Cómo llegar» con el icono de ruta, que abre Mapas con esa sede. Flota abajo, alineada con la columna. Sin texto nuevo.
5. **Los controles:** ✕ arriba a la izquierda, círculo blanco de 48 con sombra (como Atrás sobre la portada). La marca de Mapbox, que la licencia pide visible, pasa abajo a la izquierda (en Lugares va arriba a la izquierda, donde aquí está la ✕). Sin «Mi ubicación»: «Cómo llegar» ya resuelve ir; si se quiere, es el mismo botón de Lugares.
6. **El historial:** abrir deja una sola marca propia (`history.pushState` con un estado marcado); el Atrás del sistema la consume y cierra la capa; la ✕ también la consume (`history.back()`), así no queda nada apilado. Elegir pines no toca el historial. Probado en Chromium: Atrás cierra la capa y se queda en la ficha.
7. **Carga:** en la app, `mapbox-gl` con `import()` al primer toque (mientras carga, el fondo `--fondo-mapa` y el encuadre ya puesto) y `quitarMapa` al cerrar. Desde 792 la propuesta es la misma capa a toda la ventana; queda para la pieza de código.

## Preguntas para que firme el founder

1. **¿El mapa grande recuerda el pin elegido?** Propuesta: sí mientras sigas en esa ficha (si abres la ficha de la sede y vuelves, la capa vuelve abierta con su pin, como la memoria de pantalla de las listas); al cerrar con ✕ y volver a abrir, encuadra todo sin pin.
2. **En un festival, ¿la tarjeta dice «2 actividades»** (lo mismo que la lista de sedes, sin texto nuevo, así está en el prototipo) **o la próxima** («Próxima: sáb 10 · 7:00 p.m.»)?
3. **El Atrás del iPhone.** En Safari el atrás del navegador vuelve al documento anterior y no se detiene en una marca añadida con `pushState` (lo vimos con la memoria de pantalla): en el iPhone ese gesto saldría de la ficha entera, no solo de la capa; en Android y en Chrome sí cierra la capa. ¿Lo aceptamos así (la ✕ siempre a mano) o se mide primero en tu iPhone, en Safari y en la app instalada?
4. **¿El mapa estático deja de abrir Mapas?** (decisión 1: cambia lo que quedó en OL-348). La alternativa es abrir la capa solo con varias sedes, pero entonces la conducta no sería la misma en toda la app.

## Qué costaría en código (para la pieza siguiente)

`MapaFicha` gana el toque (sin `href`, con el botón de ampliar) y una capa nueva (`MapaSedes`, cliente, cargada con `next/dynamic` al primer toque) que reutiliza las capas de pines de `Mapa.tsx` (hoy recibe `LugarLista`: habría que pasarle las sedes con la misma forma o sacar `agregarCapas` a un módulo común), `TarjetaSede` y `BotonIcono`. Las sedes ya llegan con su punto (`sedesDeFestival`, OL-339) y su `href` (OL-348). Medición: la capa no está en el HTML inicial, así que `npm run medir` no cambia de presupuesto.

## Verificación

- Playwright con el Chrome de la Mac (`playwright-core` en el scratchpad, servido con `python3 -m http.server`): sin errores de página ni de consola, sin respuestas ≥ 400; Bricolage cargada (`document.fonts`).
- Recorrido comprobado: tocar el mapa abre la capa (una entrada más en el historial); Atrás la cierra y la URL sigue en la ficha; ✕ la cierra; arrastrar enseña «Encuadrar»; el ángulo de Teatro de la Paz apunta a `/lugares/teatro-de-la-paz` y el del Jardín a `/sitios/jardin-de-san-juan-de-dios-san-luis-potosi`; tocar el mapa vacío suelta la tarjeta; elegir el Jardín, que quedaba bajo la tarjeta de Teatro de la Paz, mueve el mapa para enseñarlo (la primera pasada lo dejaba tapado: así salió esa regla).
- Sin desbordes a 390 ni a 320 en los ocho casos (ningún elemento fuera del ancho fuera del lienzo del mapa; `scrollWidth` igual al ancho).

## Capturas (`docs/rediseno/capturas-379/`, 390×844 a 2× salvo las de 320)

Cada una abierta y mirada:

- `01-evento-ficha.png`: la ficha del taller con «Dónde»: el mapa estático con su pin y el botón de ampliar en la esquina; debajo «Foro lunaria · Calle Hermenegildo Galeana 423, Centro ›».
- `02-evento-mapa.png`: la capa: ✕ arriba a la izquierda, el pin «Hoy» con «Foro lunaria», la marca de Mapbox abajo a la izquierda.
- `03-evento-pin-tarjeta.png`: el pin elegido (disco grande con aro) y la tarjeta «Foro lunaria / dirección ›» con «Cómo llegar».
- `04-festival-ficha.png`: el festival: el mapa estático con tres pines y la lista de sedes (las tres con ángulo).
- `05-festival-mapa.png`: las tres sedes con «Sáb», «Lun» y «Dom» y sus nombres.
- `06-festival-mapa-movido.png`: tras arrastrar: «Encuadrar» abajo a la derecha; una sede queda bajo la ✕ (por eso existe «Encuadrar»).
- `07-festival-pin-lugar.png`: Teatro de la Paz elegido, «1 actividad ›» y «Cómo llegar».
- `08-festival-pin-sitio.png`: el Jardín de San Juan de Dios (fuera del catálogo) elegido, con su ángulo a la ficha de sitio; arriba, la tira dice a dónde llevó el ángulo anterior.
- `09-cinema-mapa.png`: CINEMA: siete sedes; solo el CEART lleva día («Mié», el 14); las demás, punto de tinta; el nombre del Museo Leonora Carrington se esconde porque choca con el del CEART (están en el mismo conjunto), su punto se ve.
- `10-cinema-pin-sitio.png`: Alboa The Park elegido (disco de tinta grande) con «2 actividades ›».
- `11-festival-pin-sitio-320.png`: el Jardín elegido a 320: la tarjeta parte el nombre en dos líneas; el nombre de Teatro de la Paz se esconde por chocar con el del elegido.
- `12-festival-ficha-320.png`: la ficha del festival a 320: el mapa estático y la lista sin desbordes.
