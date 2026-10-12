# 406 · Portadas del sistema en Inicio (OL-375)

**Fecha:** 2026-10-11. **Rama:** `portadas-sistema`, desde `origin/main` (`45cfe4bc`, ya con el prototipo firmado, #482; `main` no se movió mientras tanto). **Operador:** Claude (agente del gestor V). **Sin migración:** `eventos.colores_cartel` ya existe (OL-360).
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder.

## Lo que se pidió

Lo que firmó el founder el 2026-10-11 en [`docs/rediseno/prototipos/portadas-sistema.html`](../../../rediseno/prototipos/portadas-sistema.html), preajuste **«Firmada»: P1 · P2 B · P3 cartel · P4 sobre · P5 todo · P7 · P8** (bitácora [405](405-prototipo-portadas-sistema.md): «Firma» y comentarios 1 a 3), con las dos cosas que la 405 dejaba «por decidir antes del código» ya decididas («Continúa. Vamos a prod»):

1. **El permiso del giroscopio en Ajustes:** un renglón «Mover las portadas con el teléfono». En el iPhone viene apagado y el toque que lo enciende pide el permiso; si se niega, vuelve a apagado y lo dice en una línea. En Android no hay permiso y viene encendido. Donde no hay giroscopio (una computadora), no sale. Nunca se mueve con «Reducir movimiento». Sin el arrastre con el dedo del prototipo.
2. **Vecinas distintas:** si en un carril una portada sale casi del mismo color que la anterior, la segunda cambia un escalón de tono, sin dejar de salir de su cartel y sin salirse de su banda de contraste. «Casi del mismo color», con una medida y con su prueba.

## Lo que se lleva a la app

1. **Festival, exposición y taller llevan la portada del sistema en todos los carriles de Inicio** que usan la tarjeta de evento (Tus planes, Destacados o «Seleccionados para ti», Esta semana, Festivales y expos, Nuevos eventos y Más adelante), grande y mediana. Es un color plano con el patrón de su clase (círculos el festival, cuadrados la exposición, triángulos el taller; Anidados, Retícula o Ritmo según su id). Abajo va la zona del título: el chip solo en su renglón, la ceja y el título (19 px 800 en la grande, 17 en la mediana, dos líneas como mucho y cortado en palabra entera con «…»), todo en la tinta de su banda. El sello de fecha va arriba a la derecha. Debajo de la tarjeta, el lugar y cuándo, como siempre. El cartel sigue en la ficha y en la historia. Un evento con cartel o foto no cambia.
2. **El color sale del cartel** (`colores_cartel[1]`, el que la app guarda al subirlo) llevado a un medio tono que conserva el tono: banda oscura con tinta crema `#f4efd6`, o banda clara con tinta `#1a1a1a` para amarillos, mostazas y olivos (de 40° a 80°). Con cartel gris (croma menor que 28), con la foto de su lugar o sin imagen, toma uno de nueve colores de respaldo, elegido por su id. **Un festival sin cartel propio** toma el color del cartel de su próximo acto, que es el que su tarjeta enseñaba (OL-346). Para eso, la consulta de los actos (`cargarSedes`, que usan la agenda y «Tus planes») ahora pide sus `colores_cartel`, `actoDePortada` (`lib/sedesFestival`) devuelve el acto entero y la tarjeta lleva esos colores (`coloresActo` → `Tarjeta.colores`).
3. **El evento común sin ninguna imagen (P7)** deja el degradado E10 y entra al mismo sistema: color plano de respaldo, el símbolo SN arriba a la izquierda en la tinta, el sello a la derecha y el título abajo, sin figura. Así, una figura dice siempre festival, expo o taller. E10 sale del código: su rama en `TarjetaEvento` y su CSS.
4. **Vecinas distintas** (`paletasDeCarril` y `paletaJuntoA` en `lib/portadasSistema`): dos bases son «casi del mismo color» si quedan a menos de 10 de CIEDE2000, la diferencia de color que mide cómo la ve el ojo. El umbral se calibró con los colores del prototipo. Los cafés del final de «Festivales y expos» quedaban a 0; 3,0; 6,1; 7,2 y 9,1 entre sí, y la mostaza de «Una vez más», a 6,9 del amarillo de respaldo. En cambio, Ciclo Fellini y Cinema, dos rojos que la 405 ya daba por distintos, quedan a 15,8. Cuando dos vecinas salen casi iguales, la segunda sube o baja la luz de punto en punto (HSL), con el mismo tono y la misma saturación y sin salir de su banda, hasta quedar a 10 o más. Si en su banda no llega, se queda con lo más lejos que cabe. Solo cuentan las vecinas de verdad: una tarjeta con cartel en medio las separa. La regla corre en cadena (la que cambió es la «anterior» de la siguiente), así que **un evento puede verse un poco distinto en otro carril**. Por ejemplo, «Reflejo atemporal» es `#dfbc49` y junto a la mostaza de «Un mundo para mí» pasa a `#e6ca70` (captura 02).
5. **El giro (P8)**, en `components/inicio/giroPortadas.ts`: uno solo para toda la página. Escucha `deviceorientation` solo si el giro está encendido en ese teléfono, Inicio está a la vista (`visibilitychange`) y hay alguna portada en pantalla (`IntersectionObserver`). Parte de la postura en que se activó; con 25° de inclinación llega al recorrido entero. Cada cuadro de `requestAnimationFrame` acerca las figuras un quinto y se detiene al llegar. La capa de adelante se corre hasta 4 unidades (6,6 px en la grande, 5,3 en la mediana) y la de atrás, la mitad. Solo cambia el `transform` de las dos capas de las portadas a la vista; el título, el chip, la ceja y el sello no se mueven. Con el giro encendido, el recorte baja 4 unidades dentro del relleno de arriba de la zona del título (comentario 3 del founder): al inclinar, la base de las figuras no se corta y nada llega al texto.
6. **Ajustes › Somos Nosotros: «Mover las portadas con el teléfono»** (`app/ajustes/GiroPortadasAjuste.tsx`), con el mismo dibujo que «Avisar al salir del sitio»: icono, etiqueta, detalle («Las de festivales, expos y talleres, en Inicio») y la palanca. La preferencia se guarda en el teléfono (`localStorage`, `sn-giro-portadas`, con `try`/`catch`). Icono nuevo: `IconoGiro`, un teléfono inclinado entre dos arcos.
   - **iPhone:** apagado de fábrica. El toque llama a `DeviceOrientationEvent.requestPermission()` dentro del mismo toque (Safari solo pregunta así). Con «Permitir» queda encendido. Con «Cancelar» vuelve a apagado y el detalle dice «El iPhone no dio el permiso: vuelve a preguntar si cierras y abres la app».
   - **Android:** encendido de fábrica, sin permiso; tocarlo lo apaga.
   - **Con «Reducir movimiento»:** apagado y sin acción, y lo dice («Tu teléfono pide reducir el movimiento»).
   - **Sin giroscopio** (una computadora): el renglón no sale.
7. **El esqueleto de «Festivales y expos»** ya no dibuja el título debajo de la portada (`CarrilEsqueleto`, `tituloDentro`): ahí todas las tarjetas lo llevan dentro.

## Lo que decidí yo

- **El dibujo se hace en el teléfono, no en el servidor.** Las figuras se apoyan en la línea de la zona del título, que depende de cuántos renglones ocupa el título y de la letra del teléfono (OL-373). Eso solo se sabe en la página, como en el prototipo (`dibujarPortada`). El servidor manda el color, la tinta, el texto y el sello. El `<svg>` (sin hijos de React) se llena antes de pintar (`useLayoutEffect`) y otra vez si cambia el tamaño de la portada, de las piezas de la zona o del sello. Así no hay desajuste de hidratación ni la página brinca: el `<svg>` mide siempre lo mismo y la figura aparece al hidratar, como una imagen que llega.
- **La zona del título es plana**, sin caja que la envuelva: el chip, la ceja y el título son filas de la rejilla de la portada, y sus márgenes son el relleno del prototipo (12 a los lados y abajo; arriba 12, u 8 en la mediana). Hay 4 px entre el chip y la ceja y 3 antes del título, también cuando no hay chip ni ceja: en el prototipo ese hueco es un renglón vacío con su espacio.
- **La portada crece en vez de cortar el título.** Mide 4:5 mientras la zona quepa (`min-height: var(--foto)`; la fila de la tarjeta es `minmax(var(--foto), auto)`). En la mediana con chip, una ceja de dos renglones («TALLER · SESIÓN 1 DE 3») y el título en dos líneas, o con la letra grande del teléfono, crece y el dibujo se queda arriba (`xMidYMin meet`) con su color debajo. Con la letra al doble, las grandes pasan de 206 a entre 241 y 284 px, la mediana a 197, y el título conserva siempre sus 12 px de aire abajo (captura 09).
- **La Retícula de la exposición.** Barrí las 9 composiciones del prototipo con 400 ids y 36 medidas: 43 200 dibujos. En 1249, todos Retícula de expo, el cuadro grande quedaba debajo de la línea del título (978) o encima del sello (271): el prototipo lo colocaba con un `>>` con signo y podía caer en la última fila. En la app sube una fila si cae en la última y se corre a la izquierda solo si quedaría bajo el sello. Con el arreglo, cambian exactamente esos 1249 y los otros 41 951 salen idénticos, letra por letra. Ningún dibujo de la biblioteca se sale de la L. Ninguna de las 27 portadas del modelo firmado cae en esos casos.
- **El umbral de 10** para «casi del mismo color», y la búsqueda de punto en punto de luz dentro de la banda (arriba).
- **Solo el iPhone pide permiso.** Chrome también trae `requestPermission`, pero nunca pregunta: devuelve el estado de su permiso de sensores. Chrome 154 de la Mac responde «granted»; el Chromium 153 de Playwright, el de la CI, responde «prompt». Pedirlo en Android dejaba el giro quieto en la CI. La corrida entera de las pruebas de componentes lo destapó y quedó arreglado, con prueba (ver Verificación).
- **Lo que hace el permiso en el iPhone, medido** en el Safari del simulador con una página de prueba (las líneas son lo que ella anotó):
  - Sin toque y sin permiso dado: rechaza («NotAllowedError · Requesting device orientation access requires a user gesture to prompt»).
  - Con toque: sale el aviso «“localhost” quiere acceder al movimiento y la orientación», con Cancelar y Permitir.
  - Dado: al recargar, la llamada sin toque responde «granted» sin preguntar.
  - Negado: cada toque responde «denied» sin volver a preguntar (captura 24), también al recargar.
  - Al cerrar Safari y abrirlo, se olvida lo dado y lo negado, y el toque vuelve a preguntar.

  Por eso el renglón, con el giro encendido de antes y sin el permiso en esta sesión, se ve **apagado** (que es lo que pasa en Inicio: no se mueve), y el toque lo vuelve a pedir. La frase del «no» dice cómo volver a intentarlo. Ver la pregunta 1 abajo.
- **El renglón va en «Somos Nosotros», después de «Avisar al salir del sitio»**, la otra preferencia que vive en el teléfono. Ver la pregunta 2.
- **P7 sin dibujo vacío:** el prototipo pinta una figura vacía con la base; en la app la base es el fondo de la portada. Se ve igual.

## Diferencias que quedan contra el prototipo firmado

Comparé las 27 portadas del modelo de «Firmada» con un arnés que pinta, con los componentes y el CSS reales de la app, las mismas tarjetas (mismos ids, títulos, colores del cartel, chips, cejas y sellos) en «Tus planes», «Esta semana» y «Festivales y expos». Las dos páginas corrieron en el mismo Chrome, a 390×844 y 2×, con el giro encendido en las dos. Medí color, tinta, línea de la zona, sello, chip, ceja, título, símbolo y dibujo: **23 de 27 salen iguales en todo** (el dibujo, figura por figura, con la misma forma, el mismo color y cada cifra a menos de 1 unidad). **Las otras 4 difieren solo por la regla de las vecinas**, que el prototipo no tenía:

| Portada | Prototipo | App | Junto a (ΔE00) | Contraste del título |
|---|---|---|---|---|
| Reflejo atemporal | `#dfbc49` | `#e6ca70` | Una vez más `#c1b022` (6,9 → 10,1) | 9,47 → 10,81 |
| Lxs colocaos | `#875a41` | `#764f39` | El rostro del paisaje `#835d2a` (9,1 → 10,4) | 5,09 → 6,16 |
| Hilaridad y melancolía | `#865c3c` | `#4d3522` | Lxs colocaos ya cambiado `#764f39` (5,9 → 11,0) | 5,03 → 9,83 |
| Privacidad y elegancia | `#865c3c` | `#63432c` | Líneas de fuga `#865c3c` (0 → 10,1) | 5,03 → 7,67 |

Lo demás que queda distinto:
- **El giro sin arrastre ni botón sobre la pantalla:** el permiso vive en Ajustes (decisión 1).
- **La Retícula de la expo** en los casos que se salían de la L (arriba).
- **La portada crece** con la letra grande o con una zona que no cabe; el prototipo no contempla ese caso.
- **La tarjeta grande mide 206,25 px de alto, contra 206 del prototipo:** viene de OL-370 y no es de esta pieza. Por eso la zona del título y el lugar de debajo bajan 0,25 px (medido: lugar a 214,25 contra 214).

## Presupuestos de `npm run medir`

Subieron cinco, y la profundidad de Inicio pasa de 10 a 11:

| Pantalla | Nodos (320 · 390 · 820 · 1280) | Profundidad |
|---|---|---|
| 01-inicio | 345 345 347 347 → **363 363 365 365** (+18) | 10 → **11** |
| s01-inicio-sesion | 347 347 349 349 → **364 364 366 366** (+17) | 10 → **11** |
| 02-agenda | 320 320 322 322 → **333 333 335 335** (+13) | 10 |
| s02-agenda-sesion | 326 326 328 328 → **339 339 341 341** (+13) | 10 |
| s04-ajustes | 93 93 125 119 → **98 98 130 119** (+5, no a 1280) | 9 |

De dónde sale cada número (medido con el código de la rama y los datos de `main`, y luego con los datos nuevos):
- **El código:** +1 nodo por cada festival, expo o taller que antes enseñaba su cartel o una foto. La portada del sistema es una caja con el dibujo, el sello, el chip, la ceja y el título donde antes iban la imagen y esas piezas sueltas. P7 suma 0: E10 ya era una caja. Con los datos de `main`, Inicio queda en 351 y 352 (+6 y +5), y Agenda no cambia (320 y 326).
- **La profundidad 11:** la flecha del sello de un rango que cruza de mes ahora vive dentro de la portada (`li > a > span.portada > span.fecha > b > svg`). La medí en «Un mundo para mí» («nov → 8»).
- **Los datos de prueba:** la exposición nueva «Reflejo atemporal» suma 12 nodos en Inicio (su tarjeta en «Festivales y expos») y 13 en Agenda (su renglón).
- **Ajustes:** el renglón nuevo son 5 nodos (renglón, icono, etiqueta, detalle y palanca), en el teléfono y en el iPad. A 1280 no sale: ahí no hay giroscopio.

`npm run inventario`: sin novedades (333 medidas en duro, como antes).

## Los datos de prueba (`respaldo-local/fixture.mjs`)

- Una exposición nueva sin cartel, «Reflejo atemporal: pintura y gráfica», en el MUNI: enseña la foto de su lugar y toma su respaldo, el amarillo «Xantolo». Cierra entre «Un mundo para mí» y KOWAIFEST, así que va justo después de la mostaza.
- Colores de cartel:
  - KOWAIFEST: rojo; festival con cartel.
  - «Un mundo para mí»: mostaza, banda clara.
  - El taller de grabado en linóleo: olivo de banda clara, ahora con cartel.
  - El Festival de Cine de Invierno: los grises de Fotovisión; cartel gris, así que toma su respaldo.
- El evento común sin imagen ya estaba: «Macario, Xantolo camino al Mictlán».

## Pruebas nuevas

- **`src/lib/portadasSistema.test.ts`** (27):
  - Color: bases y contrastes de la tabla de la 405; las bandas y la tinta; contraste de 5 o más en 8832 colores; el tono que se conserva; los escalones; `tieneTono`, el respaldo por id y FNV-1a.
  - Composición: figura y arreglo por clase; la L libre; `colocar`; un dibujo completo letra por letra; el recorte de 70 a 74 con el giro.
  - Vecinas: CIEDE2000 con los pares de Sharma; la calibración del 10; la regla con sus bandas; el carril A, A′, A.
  - P7, los colores del acto de un festival, y **paridad con el prototipo**: carga su módulo y compara color y dibujo, salvo la Retícula de la expo fuera de la L.
- **`src/lib/giroPortadas.test.ts`** (7):
  - leer y guardar la preferencia; sin almacén, o con uno que truena, vale lo de fábrica;
  - lo de fábrica: apagado en el iPhone y encendido en Android;
  - el recorrido de ±25° y su tope;
  - el suavizado de un quinto por cuadro;
  - las dos capas (`translate(3.98 1.99)`, como el prototipo).
- **`sedesFestival.test.ts`, `cargarAgenda.test.ts` y `destacados.test.ts`**: una cada una. El acto de la portada con sus colores, la consulta que los pide y los devuelve, y la tarjeta que los toma.
- **`Destacados.componentes.test.mjs`** (25 en total; las de la tarjeta, reescritas para la portada del sistema):
  - el chip, la ceja y la portada: colores, tintas, figuras, sello a 8 de las orillas, la zona a 12 (8 arriba en la mediana) y el contraste medido en píxeles;
  - la geometría de las figuras; 4:5 o crece; P7; las vecinas (carril A, A′, A y separadas por una con cartel);
  - el giro: quieto con «Reducir movimiento»; en Android sigue la inclinación sin pedir permiso aunque Chrome responda «prompt»; el texto quieto y el recorte 4 unidades abajo.
- **`GiroPortadasAjuste.componentes.test.mjs`** (6): Android encendido y guardado al tocar; sin renglón en una computadora; «Reducir movimiento»; iPhone con permiso dado (la llamada dentro del toque); negado, con su línea; y encendido de antes sin el permiso de esta sesión. El permiso del iPhone se imita con lo medido en Safari.

## Verificación

- `npm run lint` (0 errores; la advertencia de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (3579 en 197 archivos), `npm run inventario` y `npm run medir` (37 pantallas × 4 anchos, con los presupuestos de arriba): **sin novedades**. `npm run medir -- --letra=2`: **sin novedades**.
- **Pruebas de componentes:**
  - Las de esta pieza: 31 de 31, tanto con el Chromium 153 de Playwright (el de la CI) como con el Chrome 154 de la Mac.
  - La corrida entera (`npm run test:componentes`, Chromium 153): 583 de 584.
  - La que falla, de `CampoLargo` («el teclado ya estaba abierto al tocar el renglón»), no es de esta pieza: no toca nada de lo que cambié, falla igual con el código de `main` en esta Mac (tres de tres) y pasó en la primera corrida entera.
  - Esa primera corrida destapó lo del permiso en Android (arriba). La prueba del giro ahora imita el «prompt» de Chrome, y falla si se quita el arreglo (comprobado).
- **Contra el prototipo firmado:** la comparación de arriba (23 de 27 iguales, 4 por la regla de las vecinas) y las capturas lado a lado 10 a 14.
- **La app compilada contra el respaldo local** (Chrome de la Mac, 390×844 a 2×; capturas 01 a 09):
  - Contraste medido en los píxeles (se esconde el texto, se captura cada portada y se toma el peor píxel de cada renglón):
    - el taller de grabado, 5,84:1;
    - «Un mundo para mí», 7,87;
    - «Reflejo atemporal», 10,81;
    - KOWAIFEST, 8,63;
    - el Festival de Cine de Invierno (cartel gris, respaldo), 5,22;
    - «Macario» (P7), 9,47.

    La ceja, igual que su título. Sin errores en la consola.
  - El giro con eventos `deviceorientation` sintéticos en un Android (la postura, y luego 25° a la derecha y 12,5° al frente): atrás `translate(1.99 1.00)` y adelante `translate(3.98 1.99)`, lo mismo que medía el prototipo, con el texto quieto.
- **Toques reales** (Chrome de la Mac contra la app compilada; antes de cada toque, `elementFromPoint` confirma que en el punto está la pieza y que está dentro del enlace). Seis de seis abren la ficha de su evento:
  - la figura de una expo (Retícula) y su sello de fecha;
  - el título dentro de la expo de respaldo;
  - la figura de un festival (Ritmo);
  - la ceja del taller en la mediana;
  - el SN del evento sin imagen.
- **Safari del simulador** (iPhone 17, iOS 27.0, `8CB4EB13`; capturas 15 a 23), con la versión final y la sesión inventada de Ana:
  - el renglón apagado; el toque saca el aviso del iPhone;
  - «Cancelar» lo deja apagado con su línea;
  - se cierra Safari y el toque vuelve a preguntar;
  - «Permitir» lo enciende, y al volver a la página sigue encendido;
  - Inicio con las portadas pintadas por WebKit: el taller, «Festivales y expos» y P7.

  El simulador no tiene giroscopio: el movimiento se probó con eventos sintéticos (arriba). Al terminar apagué solo el iPhone 17; el iPhone 17e es de otro agente.
- **Fuera de alcance, lo que afecta este resultado:** los hallazgos de Codex sobre la herramienta de colores (el guion de relleno sin límites, la doble lectura al subir, el disparador que borra una paleta igual) no cambian el código de esta pieza. Pero el color de cada portada depende de `colores_cartel`: un evento al que le falten (sin calcular, o borrados por ese disparador) toma su color de respaldo por id, sin fallar. En cuanto los tenga, pasa al color de su cartel.

## Capturas

[`docs/rediseno/capturas-406/`](../../../rediseno/capturas-406/): las de Chrome a 390×844 y 2×; las del simulador, a 2× (804×1748); los lados a lado, de 1584 de ancho (el prototipo a la izquierda y la app a la derecha). Pasadas con `scripts/ops/auditoria-ui/comprimir.mjs` (2,7 MB). Abiertas una por una.

- `01-inicio-al-abrir.png` — Inicio con la sesión de Ana. En «Tus planes», «San Luis Potosí en la Cristiada» con su foto y «1 va», y a su lado el taller de grabado en linóleo: olivo, tres triángulos anidados con el centro negro, «oct 13» arriba a la derecha, «Te interesa» solo en su renglón, «TALLER», el título en dos líneas en negro y, debajo, «ACHE Galería» y «mar 13 de oct · 17:00». Asoman «Seleccionados para ti» y la barra de abajo.
- `02-festivales-y-expos.png` — «Un mundo para mí»: mostaza, la Retícula con el cuadro negro grande arriba a la izquierda, «nov → 8». «Reflejo atemporal»: el amarillo de respaldo un escalón más claro, la hilera de cuatro cuadros que crecen con el último negro, «nov → 15». Las dos con «EXPO», el título en negro, «MUNI Museo Universitario…» y «Hasta el dom…». Asoma el rojo de KOWAIFEST.
- `03-festivales-y-expos-2.png` — el mismo carril corrido: KOWAIFEST, rojo, la hilera de círculos que crecen con el último crema, «FESTIVAL» y el título en crema. El Festival de Cine de Invierno (cartel gris): magenta de respaldo, la diana anidada, «Te interesa», «FESTIVAL», el título en dos líneas y «oct 20-22».
- `04-esta-semana-taller-mediana.png` — «Esta semana», mediana, sin sesión: la sesión 1 de 3 del taller («TALLER · SESIÓN 1 DE 3» en dos renglones y «Taller de grabado en…»), «Delirium Pollum» con su foto y la sesión 2 de 3. Las dos sesiones no son vecinas: mismo olivo. Debajo, «Festivales y expos».
- `05-sin-imagen-p7.png` — al final de «Esta semana»: «Susurros del inconsciente» y «Feleal» con su cartel, y «Macario, Xantolo…» (P7): amarillo de respaldo, el SN arriba a la izquierda en negro, «oct 11», el título abajo, sin figura; debajo, «Teatro del Centro de Dif…» y «hoy · 19:00».
- `06-ajustes-android.png` — Ajustes en un Android: en «Somos Nosotros», «Avisar al salir del sitio» y debajo «Mover las portadas con el teléfono», con el teléfono inclinado entre dos arcos, «Las de festivales, expos y talleres, en Inicio» y la palanca encendida. No sale «Instalar la app».
- `07-ajustes-iphone.png` — lo mismo en un iPhone: «Instalar la app» arriba y la palanca del giro apagada (de fábrica).
- `08-giro-quieto-e-inclinado.png` — «Tus planes» en un Android: arriba, quieto; abajo, con la inclinación sintética. Los triángulos del taller se corren a la derecha y abajo; «Te interesa», «TALLER», el título y el sello no se mueven.
- `09-letra-al-doble.png` — Inicio con la letra al doble (32 px). La portada del taller creció (284 px de alto, contra 206 de la foto de al lado) para que quepan «Te interesa», «TALLER» y «Taller de grabado…» en dos líneas, con su aire abajo; la figura, más chica, arriba.
- `10-lado-a-lado-tus-planes.png` — «Tus planes» del prototipo (izquierda) y de la app (derecha). El laboratorio de exploración sonora (tira de triángulos, «2 van», «TALLER · SESIÓN 2 DE 4») y «Desierto» (cuadros anidados, «Te interesa», «EXPO»): iguales.
- `11-lado-a-lado-festivales.png` — Verbena (diana en café, «oct 10-11») y Cinema (hilera de círculos en rojo, «oct → 24»): iguales.
- `12-lado-a-lado-festivales-2.png` — Ciclo Fellini (diana magenta) y «La memoria del agua» (hilera de cuadros en azul): iguales.
- `13-lado-a-lado-vecinas-cafes.png` — la regla de las vecinas. En el prototipo, «Hilaridad y melancolía» y «Líneas de fuga» salen del mismo café. En la app, «Hilaridad…» bajó a `#4d3522` (su anterior, «Lxs colocaos», ya había cambiado), «Líneas de fuga» se queda con su café y asoma «Privacidad y elegancia», otro escalón más oscuro.
- `14-lado-a-lado-esta-semana-p7.png` — P7 en «Esta semana»: «Primer recital musical de…» (verde), «Lectura homenaje a la…» (violeta) y «Yo Marcos» (amarillo con tinta negra), iguales. Debajo, los cafés de la 13.
- `15-safari-ajustes-apagado.png` — Safari del simulador: el renglón con la palanca apagada.
- `16-safari-ajustes-aviso-del-iphone.png` — tras el toque, el aviso del sistema: «“localhost” quiere acceder al movimiento y la orientación», con Cancelar y Permitir.
- `17-safari-ajustes-negado.png` — tras «Cancelar»: apagado, y el detalle «El iPhone no dio el permiso: vuelve a preguntar si cierras y abres la app».
- `18-safari-ajustes-aviso-tras-reabrir.png` — después de cerrar Safari y abrirlo, el toque vuelve a preguntar.
- `19-safari-ajustes-encendido.png` — tras «Permitir»: la palanca encendida.
- `20-safari-ajustes-encendido-al-volver.png` — al volver a abrir Ajustes en la misma sesión de Safari: encendido sin preguntar.
- `21-safari-inicio.png` — Inicio en Safari: el taller en «Tus planes», igual que en Chrome.
- `22-safari-festivales-y-expos.png` — «Festivales y expos» en Safari: la mostaza, el amarillo un escalón más claro y asoma KOWAIFEST.
- `23-safari-sin-imagen-p7.png` — «Esta semana» en Safari, al final: «Macario, Xantolo…» con el SN y el sello.
- `24-sonda-permiso-negado-sin-preguntar.png` — la página de prueba del permiso, en Safari: «sin toque: rechaza NotAllowedError…» y, tras negarlo una vez, dos toques más que responden «denied» sin volver a preguntar.

## Límites

- **El giroscopio de verdad no se probó:** el simulador no tiene, así que el movimiento se probó con eventos sintéticos. Falta verlo en el iPhone del founder (Safari y la web instalada) y en un Android.
- **El permiso en la web instalada y en la app de la tienda** no se midió: lo de arriba es Safari. Es el mismo WebKit y probablemente se olvida igual al cerrarla.
- **Producción:** no la toqué. Cuántos eventos de hoy tienen `colores_cartel` no lo sé; los que no, salen con su respaldo.

## Preguntas para el gestor

1. **En el iPhone, el giro hay que volver a encenderlo cada vez que se abre Safari o la app.** Lo medí en el simulador: el iPhone olvida el permiso al cerrarse, y sin un toque no se puede volver a pedir. Hoy, si la persona lo había encendido, al volver Inicio no se mueve y el renglón se ve apagado; un toque lo vuelve a pedir. La otra salida es pedirlo con el primer toque en Inicio, pero el aviso del sistema saldría encima de lo que la persona quería tocar. Recomiendo dejarlo así y medirlo en el iPhone del founder con la app instalada.
2. **¿Dónde va el renglón?** Lo puse en «Somos Nosotros», después de «Avisar al salir del sitio», porque es la otra preferencia que vive en el teléfono. Si el founder lo quiere en otra sección, es mover una línea en `app/ajustes/page.tsx`.

## Pendiente

El PR (lo abre el gestor) y el «publica» del founder. Probarlo en su iPhone: la palanca con su aviso y el giro en Inicio, en Safari y en la app instalada.
