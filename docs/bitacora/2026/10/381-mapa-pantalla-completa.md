# 381 · El mapa de la ficha se abre a pantalla completa, con sus pines, la tarjeta de la sede y «Mi ubicación»

**Pieza:** OL-350 (código; el prototipo firmado es la bitácora [379](379-prototipo-mapa-pantalla-completa.md)). **Rama:** `mapa-pantalla-completa`, base `origin/main` (`c4475cbd`). **Fecha:** 2026-10-08. **Operador:** Claude (agente del gestor V).
**Migración:** ninguna.
**Estado:** hecho y probado con pruebas de componentes en Chrome (Mapbox GL de verdad sobre un estilo vacío) y con la app compilada contra una copia del respaldo local (Chrome de la Mac, 390×844 y 320); falta el iPhone del founder, sobre todo el Atrás de Safari y de la app instalada.

## Qué firmó el founder (2026-10-08, textual)

«Mapa pantalla completa con botón de ubicación actual. Vi que tienes el de encuadre y cerrar, eso muy bien. Acepto la propuesta, solo agrega el botón que te digo. El mapa recuerda el pin elegido mientras está en la ficha; al salir la olvida. En un festival puede decir n actividades y la próxima se descubre en el listado.»

Ya decidido con él (por el gestor): el toque (no el arrastre) abre la capa; mapbox-gl se carga solo entonces; es el mismo mapa de Lugares con los pines de las sedes; el ángulo de la tarjeta SIEMPRE abre una ficha, nunca mapas; «Cómo llegar» va en la tarjeta; ✕ cierra; con una sola sede se abre igual; nada de texto de ayuda.

## Qué cambió

- **`MapaFicha` (ahora de cliente)** es un botón «Ver el mapa» con la imagen estática de siempre y, en su esquina de abajo a la derecha, la pista de ampliar (el icono en un círculo blanco de 36, sin letrero; token `--pista-ampliar`). Recibe las sedes ya armadas (`SedeMapa`, `lib/mapaSedes.ts`): nombre, punto, lo que dice la tarjeta, la ficha del ángulo, «Cómo llegar» y su próxima actividad. Guarda la memoria del mapa mientras la ficha está en pantalla (pin elegido, cámara y si se movió) como estado del componente: se va con la ficha y no se guarda en el teléfono. Abre la capa con `next/dynamic` (`ssr: false`).
- **`CapaMapa` (nuevo)**: la capa a pantalla completa, pintada al final del body como las hojas y el visor del cartel (lo de detrás queda inerte y sin desplazarse; Escape la cierra; el foco va a la ✕ y vuelve al mapa de la ficha). Una sola rejilla plana: el mapa debajo de todo y, encima, cada pieza en su área: ✕ arriba a la izquierda (48, blanca, sombra flotante); «Mi ubicación» arriba a la derecha y «Encuadrar» bajo ella, como en Lugares; el aviso de la ubicación bajo los botones; la tarjeta del pin abajo, alineada con la columna. Usa el `Mapa` de Lugares tal cual (estilo, pines con su día, nombres que ceden, punto azul, pulso del elegido) con la marca de Mapbox abajo a la izquierda (sube sobre la tarjeta) y sin registrar lugares al sostener el dedo. Abre ya encuadrada (`vistaQueEncuadra`, `lib/mapa.ts`: la cuenta de `fitBounds` sin el mapa, para no volar desde el centro de la ciudad) en lo que dejan libre la ✕ y una reserva de 200 px para la tarjeta, con tope de acercamiento 15 (el de Lugares). Al cerrarse, `Mapa` quita el mapa con `quitarMapa` como siempre.
- **La tarjeta del pin**: `TarjetaSede` (pin, nombre, «N actividades» en un festival o la calle con una sede, y el ángulo a la ficha del lugar o del sitio) y debajo «Cómo llegar» (botón secundario con el icono de ruta, el mismo enlace a Google Maps que la acción redonda de la ficha, en otra pestaña). El ángulo abre la ficha **reemplazando** la entrada de la capa (`TarjetaSede` gana `reemplazar`): Atrás desde esa ficha vuelve a la ficha del mapa, ya cerrado. Tocar el mismo pin o el mapa vacío suelta la tarjeta. Si el pin elegido queda bajo la tarjeta, bajo los botones o pegado a un borde, el mapa se mueve lo justo para enseñarlo (250 ms, sin acercarse; nada con movimiento reducido).
- **«Mi ubicación»** es el de Lugares: pide la ubicación con un toque (`leerUbicacionCercana`, la memoria fresca del teléfono si la hay), encuadra a la persona con las cinco sedes más cercanas y deja su punto azul; con el permiso ya dado, el punto sale solo (`useUbicacionFresca`). Si se niega, el aviso que ya decía Lugares (ahora `avisoDeUbicacion` en `lib/ubicacion.ts`, el mismo para los dos).
- **«Encuadrar las sedes»** sale cuando la persona mueve el mapa (o tras «Mi ubicación») y vuelve a enseñarlas todas; se va al tocarlo.
- **`Mapa`** gana props opcionales, sin cambiar nada de Lugares: `vista` (dónde abre la cámara) y `alMover` (dónde quedó), `onVacio` (tocar fuera de los pines), `conAlta` (registrar al sostener el dedo; por omisión sí), `marcaAbajo` (logotipo y ⓘ abajo a la izquierda, con su clase propia para no tocar el de «¿Dónde es?»), `tapaArriba` (lo que tapan los botones de arriba; por omisión los 56 de siempre), `etiqueta` y `encuadre.aLaVista` (mover lo justo, sin acercar).
- **Las fichas**: evento y festival (`eventos/[id]/page.tsx`), lugar (`CuerpoLugar`, también dentro de la hoja de Lugares) y sitio (`sitios/[slug]`). Un festival pone cada sede de sus actos con su punto, «N actividades» y el día de su próximo acto (`proximoPorSede`, `lib/sedesFestival.ts`); un evento, su sitio con la calle y su día; la ficha de un lugar y la de un sitio, su propio punto **sin ángulo** (es la ficha en la que se está) y con «Cómo llegar»; el día del próximo evento del lugar llega con su propia consulta (la misma de «Próximos eventos», que se pide una sola vez) y se pone en el pin al llegar.
- **Medición** (`lib/medir.ts`, lista cerrada, sin ids): `mapa_abierto` (ficha: evento, festival, lugar o sitio), `mapa_pin`, `mapa_ubicacion`, `mapa_como_llegar`.

## Atrás y la memoria

- La capa no apila pantallas: al abrirse deja **una** entrada propia en el historial (`history.pushState` con la marca `somosnosotrosMapa`; Next.js y la marca propia de navegación añaden lo suyo a esa misma entrada). El Atrás del sistema la consume y la cierra; la ✕ y Escape la consumen con `history.back()`; abrir una ficha desde la tarjeta la reemplaza. Nunca queda nada de más. Probado en Chromium: Atrás cierra y la dirección no cambia; Adelante la vuelve a abrir.
- **Cómo lo hacen las hojas de hoy**: ninguna toca el historial (`ui/Hoja`, `ui/CampoLargo` lo dice en su comentario, el visor del cartel, las hojas de Lugares): el Atrás del sistema sale de la pantalla. Esta capa se aparta de eso por la decisión 6 del prototipo firmado: es a pantalla completa y tapa la barra con su propio Atrás.
- **Safari del iPhone**: en la bitácora 102 se midió que el atrás del navegador salta las entradas añadidas con `pushState` **sin un toque de la persona**; esta se añade dentro del toque que abre el mapa, que es lo que Safari pide para no saltarla. No lo pude medir: queda para el iPhone. Si Safari la saltara, el atrás del navegador saldría de la ficha (el límite aceptado) y la ✕ seguiría a mano.
- **El gesto de la app de iPhone** (`GestoAtras`) no se registra con la capa: el registro de `ui/Atras` es de una sola plaza y, al darse de baja, la capa dejaría la ficha sin gesto. En la app, deslizar con la capa abierta sale de la ficha, como el atrás de Safari.
- **La memoria**: cerrar con la ✕ (o Atrás) y volver a abrir enseña la misma tarjeta y la misma cámara; salir de la ficha (Atrás, otra pestaña, abrir la ficha de una sede) la olvida, porque vive en el componente de la ficha. Comprobado en la prueba de componentes y en la app (captura 04 y la línea «al volver a abrir: Calzada de Guadalupe» del recorrido). La cámara se guarda con el centro de la caja entera (`unproject` del centro), no con `getCenter()`: tras mover el mapa para enseñar un pin, Mapbox se queda con el relleno de ese movimiento y su centro es el del hueco, así que al volver a abrir el pin salía 51 px más abajo. La prueba lo cubre (arrastra el mapa, elige un pin que queda bajo la tarjeta, cierra, abre y compara dónde cae el pin); con `getCenter()` falla.

## La carga perezosa (cómo se probó)

- **En la app compilada** (`next build && next start`, Chrome de la Mac): en `.next/static/chunks/` el único archivo con Mapbox GL es el que contiene `events.mapbox.com` (`2ttznb6athou9.js` en esa compilación). Al cargar la ficha del festival se pidieron 20 scripts y ninguno era ese ni el de la capa; al tocar «Ver el mapa» se pidieron justo dos: el de la capa y el de Mapbox GL.
- **En la prueba de componentes**: un espía marca cuándo se evalúa el módulo de Mapbox GL; con la ficha sola sigue sin cargarse, y se carga al tocar la imagen.
- La hoja de estilos de Mapbox viaja con el código de la capa (la importa `Mapa`), así que tampoco entra con la ficha.

## Decisiones del operador (por confirmar)

1. **«Mi ubicación» y «Encuadrar» arriba a la derecha**, uno bajo el otro, donde los pone Lugares (en el prototipo «Encuadrar» iba abajo a la derecha, sobre la tarjeta). Así ninguno choca con la tarjeta y son los mismos botones en el mismo sitio que en Lugares.
2. **«Mi ubicación» encuadra a la persona con las cinco sedes más cercanas**, lo mismo que hace Lugares con sus lugares (y no solo a la persona): así se ve a dónde va. En un evento de una sede, la persona y la sede.
3. **La ficha de un lugar y la de un sitio**: la tarjeta de su pin no lleva ángulo, porque llevaría a la misma ficha; lleva su calle y «Cómo llegar». La de un sitio reservado ya revelado tampoco lleva ángulo (no tiene ficha).
4. **En un festival la tarjeta dice «N actividades» también con una sola sede** (founder: «puede decir n actividades»); en un evento, la calle.
5. **«Encuadrar» sale al mover el mapa** (como el prototipo), no cuando las sedes quedan fuera de la vista como en Lugares.
6. **Cambia la decisión 5 de OL-348**: con una sede, el mapa estático ya no abre Mapas; abre la capa. «Cómo llegar» sigue en las acciones de la ficha y en la tarjeta del pin.
7. **La pista de ampliar puede tapar un pin** de la imagen estática cuando una sede cae en esa esquina (captura 01: el de Calzada de Guadalupe asoma por debajo). En la capa se ven todas. No moví el aire de la imagen (la API de Mapbox lo recibe; cambiarlo sin poder probar con la llave real arriesga una imagen rota).

## Verificación

- `npm run lint`: sin errores (el aviso previo de `VisorImagen.componentes.test.mjs`, ajeno). `npm run typecheck`: limpio. `npm test`: **186 archivos, 3383 pruebas, en verde**. Nuevas: `lib/mapa.test.ts` (+4, `vistaQueEncuadra`: sin puntos, uno al centro de la caja libre con el tope, varios tocando los bordes de la caja libre, cercanos con el tope), `lib/sedesFestival.test.ts` (+3, `proximoPorSede` y `lugaresDelMapa`), `lib/medir.test.ts` (+1, las cuatro acciones del mapa y sus rechazos).
- `npm run inventario`: sin novedades.
- `npm run medir`: **37 pantallas × 4 anchos**; ocho fichas ganan **un nodo** (el icono de ampliar, un solo `svg` que es su propio círculo): 06-ficha-evento, 07 y 08 (lugar), 11-ficha-sitio, s06, s13 (ficha en la hoja de Lugares), s24 y s25. Presupuestos subidos en uno, a mano, en `medidas.aceptadas.json` (lo que dio `--aceptar`, sin reformatear el archivo). Ningún toque menor de 44, nada fuera de su caja, ninguna excepción de más.
- **Pruebas de componentes** (`src/components/CapaMapa.componentes.test.mjs`, 7, Chrome con toques reales, `MapaFicha` y `CapaMapa` reales con Mapbox GL de verdad): Mapbox no se carga con la ficha; tocar abre la capa con una entrada más que la ✕ consume, con el foco en la ✕, lo de detrás inerte y el foco de vuelta al mapa al cerrar; Atrás y Escape cierran y Adelante reabre sin cambiar la dirección; tocar un pin saca su tarjeta (nombre, «1 actividad», ángulo a `/lugares/…` que reemplaza la entrada, «Cómo llegar» a Google Maps en otra pestaña), la sede fuera del directorio a `/sitios/…`, el mismo pin y el mapa vacío la sueltan, el pin elegido no queda bajo la tarjeta; la memoria al cerrar y abrir (misma tarjeta, «Encuadrar» a la vista y el pin en el mismo sitio de la pantalla, también después de que el mapa se moviera para enseñarlo) y el olvido al salir de la ficha; «Encuadrar» al arrastrar; «Mi ubicación» con permiso (punto azul) y sin él (el aviso de Lugares); lo que se mide; nada desborda a 390 ni a 320. Las de `Mapa`, `VistaLugares` y `HojaLugares` siguen en verde (30).

## Capturas (`docs/rediseno/capturas-381/`)

App compilada contra una copia del respaldo local en el scratchpad (el festival «Festival de Cine de Invierno» y sus actos visibles y esta semana, con un acto al aire libre en «Calzada de Guadalupe», sitio fuera del directorio), Chrome de la Mac, 390×844 a 2× salvo las de 320, sin sesión. **Sin llave de Mapbox** (no hay en local): la imagen estática la contesta el script con un fondo liso y un pin violeta por cada `pin-s` de la URL que arma la app, encuadrados como la API; el mapa interactivo usa el sustituto de `npm run medir` y de las pruebas de Lugares (estilo vacío, glifos vacíos): **sin calles y sin los nombres ni los días de los pines** (los discos sí). Cada una abierta y mirada:

- `01-festival-ficha.png`: «Dónde» del festival: la imagen con sus tres pines y la pista de ampliar abajo a la derecha (tapa casi entero el pin de Calzada de Guadalupe, decisión 7); debajo, las tres sedes con «2 actividades», «1 actividad» y sus ángulos.
- `02-festival-capa.png`: la capa: ✕ arriba a la izquierda, «Mi ubicación» arriba a la derecha, las tres sedes encuadradas en la parte de arriba (abajo queda la reserva de la tarjeta), la marca de Mapbox abajo a la izquierda.
- `03-festival-pin-lugar.png`: Teatro de la Paz elegido (disco grande con aro y sombra) y su tarjeta: «Teatro de la Paz · 1 actividad ›» y «Cómo llegar»; la marca de Mapbox subió sobre la tarjeta.
- `04-festival-pin-sitio.png`: Calzada de Guadalupe (fuera del directorio) elegida; su ángulo lleva a `/sitios/calzada-de-guadalupe-san-luis-potosi`.
- `05-evento-ficha.png`: un evento de una sede (Delirium Pollum, en el Teatro de la Paz): la imagen con su pin y la pista de ampliar; debajo, el lugar con su dirección.
- `06-evento-una-sede.png`: su capa con el pin elegido al centro de lo que deja libre la tarjeta: «Teatro de la Paz · Villerías 205 ›» y «Cómo llegar».
- `07-lugar-una-sede.png`: la capa desde la ficha del Teatro de la Paz: la misma tarjeta **sin ángulo** (es esa ficha).
- `08-festival-ubicacion.png`: tras «Mi ubicación» con permiso: el punto azul con las sedes, el icono de ubicación en violeta y «Encuadrar» bajo él.
- `09-festival-ficha-320.png`: la ficha del festival a 320: la imagen y la lista de sedes sin desbordes.
- `10-festival-pin-sitio-320.png`: la capa a 320 con la tarjeta de Calzada de Guadalupe, sin desbordes.

`scrollWidth` igual al ancho en las diez; sin errores de página ni de consola.

## Qué probar en el iPhone

1. Una ficha de festival con varias sedes (CINEMA), una de evento, una de lugar y una de sitio: tocar el mapa abre la capa; los pines llevan su día y su nombre (en local no salen).
2. Elegir un pin, cerrar con la ✕, volver a abrir: la misma tarjeta y el mismo encuadre. Salir de la ficha y volver: nada elegido.
3. **El atrás de Safari y el de la app instalada con la capa abierta**: ¿cierra la capa o sale de la ficha? (ver «Atrás y la memoria»). Y desde la ficha de una sede abierta con el ángulo, Atrás vuelve a la ficha del mapa.
4. «Mi ubicación» la primera vez (el permiso), con permiso y negado.
5. «Cómo llegar» en la tarjeta abre Mapas con la sede.
