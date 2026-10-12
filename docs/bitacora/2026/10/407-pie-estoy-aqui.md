# 407 · El pie tras «Estoy aquí» en iOS 27 (OL-376)

**Fecha:** 2026-10-11. **Rama:** `pie-estoy-aqui`, desde `origin/main` (`45cfe4bc`; `main` no se movió mientras tanto). **Operador:** Claude (agente del gestor V). **Sin migración.**
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder y medirlo en su iPhone (pasos al final).

## El encargo

Founder (2026-10-11): «Atiende el fallo de teclado». Es el hallazgo de la bitácora [404](404-letra-del-sistema.md) (§ «Hallazgo para otra pieza»): en el alta de evento, en «¿Dónde es?», con el buscador enfocado y el teclado abierto, se toca «Estoy aquí» y, a veces, el pie del paso nuevo («¿Es aquí?») queda más arriba de donde toca: encima del campo o con el botón cortado por arriba (capturas 29 y 35 de la 404). Las reglas que rompe: todo campo de texto a la vista al enfocarlo (OL-305) y los botones del pie sobre el teclado (canon del 2026-10-06).

## Cómo se midió

En el simulador **iPhone 17e con iOS 27.0** (Safari, 390×844), con el teclado en pantalla, contra la app compilada y el respaldo local de datos inventados (la sesión inventada de Ana). Sin la llave de Mapbox de verdad, el mapa no da la dirección del punto, así que «¿Es aquí?» sale con el campo «Nombre del lugar», que toma el foco solo: es el caso del hallazgo.

- **Un proxy de medidas** entre Safari y la app (hecho con lo que dejaron el intento anterior y OL-373) que, sin tocar la app, inyecta: un registro cuadro a cuadro de `visualViewport` (alto, `offsetTop`, `pageTop`), `scrollY`, `innerHeight`, `clientHeight`, el largo de la página, las cajas del pie y del campo, `--teclado`, `--abajo-visible` y cada evento (`resize` y `scroll` del área visible y de la ventana, foco, toques, cada `scrollBy` y `scrollTo` de la página); tres **sondas** de alto 0 (una fija arriba, una fija abajo y una en el origen del documento) que dicen dónde pone Safari lo fijo y el documento en el marco de las cajas; un panel amarillo con esas medidas y, para las capturas, una barra magenta fija de arriba abajo y una regla con la Y del documento.
- **Los toques**, con el cliente HID del simulador (como la ventana del simulador), y el teclado en pantalla. Cada intento recorre el alta desde el principio: «No tengo cartel», «Eco», día, hora, «2 horas» y, ya en «¿Dónde es?» con el teclado abierto, «Estoy aquí».
- **El tiempo:** que el teclado siga abierto o no depende de cuánto tarda el paso nuevo en llegar después de tocar «Estoy aquí» (la ubicación y la dirección que se le pide al mapa). Además del tiempo natural, el proxy puede contestar la ubicación al instante y la dirección del mapa con un retraso fijo (de 0 a 400 ms), para barrer los casos.
- **Videos** del simulador para ver lo que ve la persona cuadro a cuadro.

## Lo que hace Safari de iOS 27 (la causa)

Cuatro cosas, todas medidas:

1. **Con el teclado abierto, `innerHeight` ya no es la ventana.** Mide lo que queda de la página desde lo que se ve: `min(ventana, largo − scrollY)` (699 sin teclado; con teclado 429, 457, 556, 600, 629… según dónde esté la página). `clientHeight` sí se queda en 699. El mecanismo medía el teclado como `innerHeight − alto del área visible` y lo sumaba al aire de abajo de la columna: cambiaba el largo de la página, eso cambiaba `innerHeight`, y vuelta a empezar. Medido en `main`: hasta **3,6 s de vaivén** (414 eventos) y, según dónde se quedara, el pie arriba con el campo debajo de él (captura 02) o, si `innerHeight` bajaba del alto del área visible, la app daba el teclado por cerrado: quitaba el aire, Safari recortaba el área visible al final de la página (271 en vez de 369) y el pie quedaba pegado a media pantalla con el teclado abierto (capturas 03 y 04).
2. **Lo fijo se queda atrás.** Justo después del cambio de paso, Safari desplaza la página para mostrar el campo (`scrollY` 335) pero el área visible no se entera: `pageTop` y `offsetTop` se quedan en 0 y no llega ningún evento del `visualViewport` que lo corrija; el único aviso es el `scroll` de la ventana, que el mecanismo no escuchaba. La sonda fija dice que el bloque de lo fijo empieza en −335, así que el pie (`position: fixed; bottom: 330px`) queda en −95…34: arriba, con el botón cortado. Es la captura 35 de la 404.
3. **El teclado fantasma.** Si el campo nuevo toma el foco mientras iOS todavía esconde el teclado (cuando el paso tarda entre unos 100 y 450 ms), iOS lo termina de esconder pero la página lo sigue creyendo abierto: el área visible sigue en 369 y nunca llega el aviso. El pie, anclado al teclado que no está, queda a media pantalla y debajo todo vacío (capturas 01 y 05). Es lo que más sale con el tiempo natural: 2 de 10 a la letra de fábrica. Un desplazamiento de verdad de un píxel (`scrollBy(0, −1)`) basta para que Safari le vuelva a mandar a la página lo que se ve: en dos cuadros llega el área entera y todo queda como sin teclado (medido a mano; desplazarla a donde ya está no sirve).
4. **Con «Accesibilidad grande», la vista pasada del final.** Cuando el teclado ya se cerró y el campo queda fuera de la vista, el mecanismo lo trae con un desplazamiento suave y, dos cuadros después de cada cambio del área visible (que el propio desplazamiento provoca), lo corrige de golpe. Safari deja que el suave siga de largo: `scrollY` 419 con el final de la página en 213, y el pie, que se pega al final de lo desplazable, a media pantalla (captura 06): 4 de 5 con el tiempo natural.

## El arreglo (en el mecanismo compartido)

Todo en `src/components/ui/useCampoVisible.ts`; ningún paso cambia.

1. **El teclado se mide contra la ventana de verdad**, `clientHeight − alto del área visible`, y no contra `innerHeight`. Ya no cambia al desplazar ni con el largo de la página: se acabó el vaivén y la app ya no pierde el teclado.
2. **El pie se ancla con una sonda**: un elemento fijo de alto 0 con `bottom: 0`, colgado de `<html>` (fuera de `<body>`, así no cuenta como algo pegado). `--abajo-visible` es dónde termina de verdad el bloque de lo fijo menos dónde termina lo que se ve, y puede ser negativo: si Safari dejó lo fijo arriba, el pie baja de su bloque hasta el borde de lo que se ve. En la app de la tienda (Capacitor) y en Android da lo mismo que antes.
3. **Se vuelve a anclar con cada desplazamiento de la página** y, durante 1,2 s después de enfocar un campo o de cambiar de paso, **en cada cuadro**, aunque no llegue ningún evento (la idea del encargo).
4. **Se destraba la vista** si en ese rato queda trabada 6 cuadros seguidos sin eventos del área visible: si `pageTop` no cuadra con `scrollY` (casos 2 y 3), un empujón de un píxel hacia arriba, hasta 6 veces (uno mientras iOS todavía esconde el teclado no basta); si sin teclado lo que se ve pasó del final de la página (caso 4), la página vuelve a su final.
5. **El campo se trae a la vista sin pelear con el desplazamiento suave**: mientras dura el que empezó al enfocar (medio segundo) no se corrige de golpe encima, y al terminar se vuelve a mirar; y la página nunca se desplaza más allá de su final para traer un campo.

`PorPasos.tsx` solo cambia su comentario: ya llamaba a `reasegurarCampo` al cambiar de paso con el teclado abierto, y eso ahora también arranca la vigilancia.

## Lo que decidí yo

- **La sonda y no otra medida del área visible.** `offsetTop`, `pageTop − scrollY` e `innerHeight` dan, según el caso, 0, el valor de antes o lo que queda de la página; la sonda dice dónde está lo fijo en el mismo marco en que se mide todo lo demás. Es lo que ya había visto la 404: cambiar una medida por otra no bastaba.
- **El empujón de un píxel** es lo único que encontré que haga a Safari volver a mandar lo que se ve sin que la persona toque nada (probé también desplazar a donde ya está, que no hace nada). Solo se da con la vista trabada y como mucho 6 veces en una vigilancia; en los intentos buenos no se da ninguno (lo comprueba una prueba).
- **6 cuadros sin eventos** para dar la vista por trabada: mientras Safari anima su propio desplazamiento la vista descuadra uno o dos cuadros, pero sus eventos llegan enseguida y reinician la cuenta.
- **1,2 s de vigilancia**: en el simulador todo se asienta entre 0,2 y 0,7 s después del foco.
- **No arreglo en «¿Es aquí?» ni en «Estoy aquí»** (por ejemplo, no dejar que el buscador suelte el foco): el problema es de cómo se mide el teclado en iOS 27 y aparece en cualquier campo que Safari desplace; el arreglo vive donde viven las medidas.
- **El desplazamiento suave al enfocar se queda**, pero sin correcciones de golpe encima; quitarlo era más simple pero cambiaba cómo se siente cada campo.

## Intentos, antes y después

Cada intento: el alta entera hasta «¿Dónde es?» con el teclado abierto y «Estoy aquí»; se mira cómo queda ya asentado (el registro y una captura a los 3 s). **Bien** quiere decir: o el teclado sigue abierto con el campo a la vista y el pie justo sobre él, o el teclado se cerró y el paso se ve entero con el pie abajo. **Mal**: cualquiera de los cuatro casos de arriba. «Antes» es `main` compilado; «después», la versión final de la rama.

| Letra | Tiempo | Antes (`main`) | Después |
|---|---|---|---|
| De fábrica | natural | **2 mal de 10** (teclado fantasma) | **0 de 10** |
| De fábrica | dirección del mapa a los 0, 100, 200, 300 y 400 ms (dos vueltas) | **8 mal de 10** (lo fijo atrás y teclado fantasma) | **0 de 10** |
| De fábrica | dirección a los 20, 40, 60 y 80 ms | **2 mal de 8** (la app pierde el teclado) | **0 de 4** |
| Accesibilidad grande | natural | **4 mal de 5** (vista pasada del final) | **0 de 6** |
| Accesibilidad grande | dirección a los 0 a 400 ms | **5 mal de 5** | **0 de 5** |

Después, a la letra de fábrica salieron **24 seguidos sin fallo** y con «Accesibilidad grande» **11 seguidos**. En 7 de ellos la vista se trabó y se destrabó sola con 1 o 2 empujones, y quedó asentada entre 0,53 y 0,63 s después del toque; en el video (captura 13) se ve: el pie ya está abajo mientras dura y luego el paso entero. Antes de la versión final: una versión que aún no devolvía la página a su final ni esperaba al desplazamiento suave dio 24 de 24 a la letra de fábrica y 9 de 10 con accesibilidad (la que faltó fue la vista pasada del final); la siguiente, que ya la devolvía, 10 de 10, pero en 3 tuvo que hacerlo después de verse mal casi medio segundo, y eso llevó al punto 5, con el que ya no hizo falta ninguna vez.

**«Ponle nombre», como en producción.** Con la llave de verdad «Estoy aquí» suele traer una calle y «¿Es aquí?» sale sin campo; el campo aparece al tocar «Ponle nombre», que abre el teclado. Con una calle inventada en el proxy: `main` 5 de 5 bien (con un teclado mal medido, de 66 a 82 px, que por suerte cae bien) y la rama 5 de 5 bien, siempre con las mismas medidas (330).

## La barra del teclado de Safari sobre el pie

El otro hallazgo de la 404 (captura 38): justo después de cambiar el tamaño de letra con Safari abierto, la barra ˄ ˅ ✓ tapaba medio botón. Cinco intentos con la rama, cambiando el tamaño con el teclado abierto en «¿Cómo se llama?»:

- **De «Accesibilidad grande» a la de fábrica (2 de 2):** el pie queda unos 30 px más abajo de lo que toca y la píldora «localhost» tapa la parte de abajo de «Siguiente» (captura 14).
- **De la de fábrica a «Accesibilidad grande» (3 de 3):** el pie queda unos 30 px más arriba, visible y con hueco.

La causa es otra: al cambiar el tamaño, Safari no le avisa a la página del nuevo alto del teclado; el área visible se queda con el de antes (339,7 en vez de 369) aunque se escriba, y la página no tiene de dónde sacar el nuevo. Se arregla solo al cerrar el teclado y volver a abrirlo (captura 15). No lo toco en esta pieza: solo pasa si se cambia la letra del teléfono a media escritura.

## Que no se rompe el resto

Con la versión final, en el simulador: la lista de «¿Dónde es?» bajo el buscador y sobre el teclado (16); el alta de lugar con el teclado en «¿Cómo se llama?» y en «¿Dónde está?» con su lista (17); el alta de artista (18); Buscar con resultados y el teclado abierto (19); la hoja de Lugares que sube y abre una ficha (20). En Chromium, `npm run medir` y `--letra=2` repasan además el teclado en las siete pantallas con campo.

## Pruebas nuevas

En `src/components/PorPasos.componentes.test.mjs`, imitando lo que iOS le dice a la página (lo que no se puede imitar —lo fijo que se queda atrás— lo midió el simulador):

- con `innerHeight` como en iOS 27 (600, 429, 557…), el teclado sigue en 336, el aire de abajo no cambia al desplazar y el pie queda en el borde de lo visible;
- la vista atascada tras el cambio de paso con el teclado ya cerrado: un empujón de un píxel y todo queda como sin teclado;
- la vista atascada con el teclado abierto: el empujón la pone al día y el pie sigue sobre el teclado;
- sin teclado y la vista pasada del final: la página vuelve a su final;
- y el control: sin atascarse, ningún empujón.

Las cuatro primeras fallan con el `useCampoVisible` de `main`; las 18 que ya había siguen pasando.

## Verificación

- `npm run lint` (0 errores; la advertencia de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (**3542** en 195 archivos) y `npm run inventario`: **sin novedades**.
- `npm run medir` (37 pantallas × 4 anchos, con el teclado en las siete pantallas con campo): **sin novedades**. `npm run medir -- --letra=2`: **sin novedades**.
- `npm run test:componentes`: **578 de 578** (5 nuevas).
- **Simulador** (iPhone 17e, iOS 27.0), los intentos de la tabla, «Ponle nombre», la barra de Safari y el resto, todo con capturas.

## Capturas

[`docs/rediseno/capturas-407/`](../../../rediseno/capturas-407/): del simulador, a la mitad de su tamaño (585×1266). En casi todas, el panel amarillo con las medidas (alto de la ventana, área visible, `offsetTop`, `pageTop`, `scrollY`, las sondas fijas, `--teclado`, `--abajo-visible`, las cajas del pie y del campo y los últimos eventos), la barra magenta de lo fijo y la regla del documento. Abiertas una por una.

**Antes (`main`):**

- `01-antes-fabrica-teclado-cerrado-pie-a-media-pantalla.png` — letra de fábrica, tiempo natural: el teclado fantasma. iOS ya escondió el teclado, la página está desplazada (la regla empieza en 400), «Este punto del mapa», la ayuda y el campo arriba, el pie («Falta el nombre», «Buscar otro») a media pantalla y debajo todo vacío hasta la barra de Safari. El panel no sale: se coloca con el `pageTop` atascado en 0.
- `02-antes-fabrica-con-teclado-pie-alto.png` — letra de fábrica, la dirección a los 0 ms: el teclado abierto y el pie arriba, bajo «Este punto del mapa», tapando el campo (que el panel pone en 98,8–146,8); entre «Buscar otro» y la píldora, hueco. El vaivén duró 3,6 s y quedó así.
- `03-antes-fabrica-con-teclado-la-app-no-lo-ve.png` — a los 20 ms: el teclado abierto pero la app lo da por cerrado (`--teclado 0px`, `data-t 0`): área visible e `innerHeight` recortados a 271, el pie pegado a media pantalla bajo el campo y un hueco blanco hasta la píldora.
- `04-antes-accesibilidad-con-teclado-la-app-no-lo-ve.png` — «Accesibilidad grande», a los 0 ms: lo mismo con la letra grande: el campo arriba del todo, el pie justo debajo (tapado por el panel), 231 de área visible y un hueco hasta el teclado.
- `05-antes-accesibilidad-teclado-cerrado-pie-a-media-pantalla.png` — accesibilidad, a los 100 ms: el teclado fantasma con la letra grande: sin teclado, el pie a media pantalla y vacío debajo.
- `06-antes-accesibilidad-sin-teclado-pasada-del-final.png` — accesibilidad, tiempo natural: el teclado se cerró antes de llegar al paso, pero la página quedó desplazada a 419 con el final en 213 (`offsetTop` 206): el campo a la vista y el pie a media pantalla, con vacío hasta la barra de Safari.

**Después (la rama):**

- `07-despues-fabrica-con-teclado.png` — letra de fábrica, a los 0 ms: el teclado abierto, el campo a la vista (detrás del borde de arriba del panel) y el pie justo sobre la píldora y el teclado; la sonda fija termina en 368,7 y lo visible en 369: `--abajo-visible` 0, `--teclado` 330.
- `08-despues-fabrica-destrabada.png` — a los 100 ms, 0,6 s después del toque: iOS cerró el teclado y la vista ya se destrabó: «¿Es aquí?» entero, el mapa, «Este punto del mapa», el campo y el pie abajo.
- `09-despues-fabrica-natural.png` — tiempo natural: igual, sin teclado y el paso entero.
- `10-despues-accesibilidad-con-teclado.png` — «Accesibilidad grande», a los 0 ms: el teclado abierto, el campo arriba y el pie justo sobre la píldora; `--teclado` 297.
- `11-despues-accesibilidad-destrabada.png` — accesibilidad, a los 100 ms: destrabada: sin teclado, la ayuda, el campo y el pie abajo, junto a la barra de Safari.
- `12-despues-accesibilidad-natural.png` — accesibilidad, tiempo natural: la página en su final (213), el campo y el pie abajo.
- `13-despues-cuadros-del-video.png` — seis cuadros del video, cada 0,2 s, a los 200 ms: «¿Dónde es?» con el teclado; el teclado se cierra; un cuadro con la vista atascada en el que el pie ya está abajo; y «¿Es aquí?» entero a los 0,8 s.

**La barra de Safari:**

- `14-barra-de-safari-tras-cambiar-la-letra.png` — «¿Cómo se llama?» con «Eco» y el teclado, justo después de pasar de «Accesibilidad grande» a la de fábrica: el área visible se quedó en 339,7 y la píldora «localhost» queda encima de la parte de abajo de «Siguiente».
- `15-barra-de-safari-al-reabrir-el-teclado.png` — lo mismo después de cerrar el teclado (✓) y volver a tocar el campo: área visible 369, `--teclado` 330 y «Siguiente» sobre la píldora.

**El resto:**

- `16-resto-donde-es-lista.png` — «¿Dónde es?» con «Te»: la lista (Teatro Universitario Bicentenario, Teatro de la Paz) bajo el buscador y sobre el teclado.
- `17-resto-alta-lugar-direccion.png` — alta de lugar, «¿Dónde está?» con «Cas»: el campo, la lista debajo y «Falta la ubicación» sobre el teclado.
- `18-resto-alta-artista.png` — alta de artista, «¿Cómo se llama?» con el teclado: el campo y «Siguiente» con la tira Evento · Lugar · Artista sobre el teclado.
- `19-resto-buscar.png` — Buscar con «tea» y el teclado: el buscador arriba y tres eventos.
- `20-resto-hoja-de-lugares.png` — Lugares: la hoja subida y la ficha de la Casa de Cultura del Barrio de San Miguelito abierta en ella, con la barra de abajo.

## Pasos para el founder (en su iPhone)

Para medirlo en tu teléfono cuando el gestor te lo pida, una vez publicado (o en la vista previa de la rama). Hazlo en **Safari** y después en la **app de TestFlight**.

1. Entra con tu cuenta, toca **+** (Publicar) y **No tengo cartel**.
2. Escribe un nombre cualquiera, **Siguiente**, elige un día, una hora y **2 horas**. Llegas a «¿Dónde es?» con el teclado abierto.
3. **Sin cerrar el teclado**, toca **Estoy aquí**. La primera vez el teléfono pide la ubicación y el teclado se cierra: eso está bien. Toca **Buscar otro** (si el teclado no se abre solo, toca el buscador) y vuelve a tocar **Estoy aquí**: ahora la ubicación llega al instante, que es cuando fallaba.
4. Mira «¿Es aquí?» con calma, un par de segundos. **Bien** es una de dos: el teclado abierto con el campo a la vista y los botones («Sí, es aquí» o «Falta el nombre», y «Buscar otro») pegados justo encima del teclado; o el teclado cerrado con el paso entero y los botones abajo. Puede verse un instante intermedio (menos de un segundo) antes de quedar bien. **Mal** es: los botones a media pantalla con vacío debajo, los botones encima del campo, o un botón cortado.
5. Si sale una calle en «¿Es aquí?», toca **Ponle nombre**: se abre el teclado y debe verse igual que en el punto 4.
6. Repítelo unas **10 veces** (desde «Buscar otro») y anota cuántas salen mal y una captura de la que salga mal.
7. Luego en **Ajustes › Accesibilidad › Pantalla y tamaño del texto › Texto más grande**, súbelo al máximo, vuelve a abrir el alta y repítelo **5 veces**. Al terminar, deja el texto como lo tenías.

No cambies el tamaño de letra con el teclado abierto a media prueba: ahí Safari no avisa del nuevo alto del teclado (ver arriba); si pasa, basta con cerrar el teclado y volver a abrirlo.

## Límites

- **El iPhone del founder:** todo se midió en el simulador (iPhone 17e, iOS 27.0). En el iPhone 17 de la 404 los tiempos eran otros (por eso allí salía «una de cada tres»); el arreglo no depende de los tiempos, pero falta verlo en un teléfono real.
- **La app de la tienda** (Capacitor) no la compilé: ahí el área visible no cambia con el teclado y la medida sale de los eventos del plugin, que no cambian; lo cubren las pruebas de componentes de siempre, que pasan. Falta verlo en TestFlight.
- **Con la llave de Mapbox de verdad** «¿Es aquí?» casi siempre trae una calle y no enfoca el campo solo, así que el caso exacto del hallazgo es raro en producción; lo que se arregló (cómo se mide el teclado en iOS 27) vale para cualquier campo que Safari desplace con el teclado abierto.
- **El cambio de tamaño de letra con el teclado abierto** queda como está (ver arriba).
- **El instante intermedio:** cuando iOS esconde el teclado mientras llega el paso nuevo, durante 0,2 a 0,4 s se ve la página desplazada con el pie ya abajo, antes de quedar entera.

## Dónde vive

- **`src/components/ui/useCampoVisible.ts`:** la medida contra `clientHeight`, la sonda (`crearSonda`), la vigilancia (`vigilar`), lo que destraba la vista (`destrabar`), la espera del desplazamiento suave y el tope de `desplazar`.
- **`src/components/PorPasos.tsx`:** el comentario del cambio de paso.
- **`src/components/PorPasos.componentes.test.mjs`:** las cinco pruebas nuevas y lo que imita de iOS 27 (`altoInterior`, `atascar`, `pasarDelFinal`).
- **Herramientas** (en el scratchpad, no van al repositorio): el proxy de medidas con sus sondas y su panel, el registro y su clasificador, los toques del simulador, los guiones de cada intento y de las series, los videos y sus cuadros.

## Pendiente

El PR (lo abre el gestor) y el «publica» del founder; medirlo en su iPhone con los pasos de arriba, en Safari y en TestFlight.
