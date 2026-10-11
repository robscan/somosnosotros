# 404 · La letra sigue al tamaño del teléfono (OL-373)

**Fecha:** 2026-10-11. **Rama:** `letra-del-sistema`, desde `origin/main` (`622cd190`; `main` no se movió mientras tanto). **Operador:** Claude (agente del gestor V). **Sin migración.**
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder.

## El problema

Founder (2026-10-11): en pruebas, personas de más de 45 años pidieron el texto más grande, y al agrandarlo en los ajustes del iPhone la app no cambió. La causa: toda la letra de la app ya iba en `rem` (crece con la letra de la raíz), pero la raíz era `font-size: 100%`, y en Safari del iPhone `100%` mide siempre 16 px, elija lo que elija la persona (WebKit, error 260880). En Safari solo sigue el tamaño del teléfono la letra del sistema (`font: -apple-system-body`). En Android el navegador solo pasa la letra del teléfono a la raíz si la página lo pide (`<meta name="text-scale" content="scale">`, MDN). El founder: «arranca» y «17 px está bien».

## Lo que se lleva a la app

1. **iPhone y iPad: la raíz es la letra del sistema** (`globals.css`). `html { font: -apple-system-body }` dentro de `@supports (-webkit-touch-callout: none)`, una condición que solo cumple el WebKit de iOS y iPadOS: Safari, la web instalada en el inicio y la app de la tienda (la misma web). En Safari de la Mac, donde la letra del sistema mide 13 px y la app se encogería, en Chrome y en el WebKit de Playwright no se cumple (comprobado), y ahí la raíz sigue en `100%`. El atajo `font` devuelve a su valor de fábrica la familia, el interlineado, el peso, las variaciones, los numerales y lo demás de la letra: la regla vuelve a poner cada uno como en `html, body`, con el peso normal (la letra del sistema trae el suyo). En el simulador la raíz mide **17 px** con la letra de fábrica («Grande»), **23** con la mayor normal y **33** con «Accesibilidad grande» (capturas 01 a 03).
2. **17 px de fábrica en el iPhone, sin compensar:** en el iPhone todo sale un 6 % más grande que hoy; en Chrome, la Mac y Android sin letra grande, 16 como siempre.
3. **Android:** `<meta name="text-scale" content="scale">` (`layout.tsx`, `metadata.other`). Sale en el HTML y `npm run medir` ahora comprueba que esté. Con ella la raíz toma la letra que la persona eligió en su teléfono y el navegador apaga sus propios ajustes automáticos de texto (MDN). Safari la ignora.
4. **El tope: el doble, en un solo lugar.** Cada `--letra-*` es `min(<rem>, <sus px> × var(--letra-tope))`, con `--letra-tope: 2`: crece con el teléfono hasta el doble de hoy y ahí se queda. WCAG 1.4.4 pide que todo funcione con el texto al 200 %; más allá, cada pantalla tendría que rehacerse. `--letra-campo` sigue sin bajar de 16 px (si baja, Safari hace zoom al enfocar). Los tamaños sueltos en rem pasan a tokens con su tope: `--letra-base` (16: el valor de un KPI y su esqueleto), `--letra-proveedor` (20: los botones de Entrar), `--letra-historia` y `--letra-historia-larga` (44 y 36: el título tipográfico de una historia) y `--letra-cifra` (40: la cifra de un indicador de administración); el creador de cartel mide su vista y su miniatura en `--letra-base`. `npm run inventario` suma la regla «medida en rem fuera de los tokens» (hoy, cero), para que no vuelva a entrar un rem sin tope.
5. **Topes propios donde el doble no cabe:**
   - **La barra de abajo y la tira Evento · Lugar · Artista de las altas**, `--letra-tope-tira: 16px`. La barra mide 60 de alto y no crece; cada destino tiene 62 de ancho a 320 y «Artistas» mide 3,3 veces su letra: con más de 16 no cabe con aire ni bajo su píldora. En la tira, los tres tipos con su aire no caben en 280.
   - **El logotipo**, hasta un cuarto más (35 y 30 px): es un dibujo y no un texto que leer, la barra mide 56 y a 40 el founder ya lo vio «demasiado gigante» (2026-09-15).
6. **Los tamaños en px fijos se quedan como están** (22 con `font-size` y 2 con el atajo `font`, revisados uno por uno): ninguno es texto de lectura de la app. El mando y la pared de una obra colectiva (15 y 2: un control calcado de su prototipo firmado y una pantalla para un cañón o una TV), el letrero para imprimir de un artista (1: la ayuda en pantalla; lo impreso va en pt), la administración de obras colectivas (3), la imitación de los botones de iOS en «Instala Somos Nosotros» (2: copia de la interfaz del sistema, a su escala) y la inicial del avatar en la barra de abajo (11 px dentro de un círculo de 22 que no crece).

## Lo que se rompía al doble y cómo quedó

Para verlo, `npm run medir` tiene ahora **`--letra=2`**: la letra de fábrica de Chromium al doble (32 px, como la preferencia de tamaño de texto de Chrome, sin tocar el CSS de la app) y las mismas comprobaciones en las 37 pantallas a 320, 390, 820 y 1280, el teclado incluido; solo no mira el presupuesto de nodos, que se mide con la letra de fábrica. Si la raíz no mide 32, la corrida falla («las medidas no valen»). Una excepción con `"letra": 2` vale solo en esa corrida, y `--aceptar` no se deja combinar con `--letra`. La primera corrida al doble dio **117 hallazgos**; ahora, **ninguno**.

| Qué se rompía | Hallazgos | Cómo quedó |
|---|---|---|
| Las etiquetas de la barra de abajo se salían por debajo de la barra | 77 | El tope de las tiras (16 px). |
| La barra de la app: el lado derecho se salía y el logotipo se encogía | 11 | La causa: lo que cada lado reserva junto al logotipo iba en rem (`--flanco`, 3,5rem) y crecía con la letra, aunque son botones de icono que no crecen. Ahora se mide en botones: 100 px con cualquier letra, lo mismo que hoy con la de fábrica. |
| La cabecera de los carriles de Inicio: «Ver…» encima del título y los carriles 44 px fuera | 6 | El título ocupa lo que deja el enlace y nunca menos que su palabra más larga; si no caben juntos, el enlace baja a su renglón, al principio. A la letra de fábrica no cambia nada. |
| El chip «Nuevo video» de la tarjeta mediana se salía de la tarjeta | 2 | Parte renglón dentro del cartel. |
| Atrás, en la barra de una pantalla interior, con menos de 44 de toque (Entrar, Ajustes, Editar perfil, Novedades) | 4 | Con la letra grande los lados de esa barra miden al menos lo suyo y lo del centro (el logotipo o el título con «…») se achica en lo que queda, aunque ya no quede al centro exacto. |
| El pie de los pasos y la tira de tipos se salían en las altas | 4 | El tope de las tiras. |
| El horario de un lugar y las horas de «Revisa» se salían | 3 | Cada rango pasa entero al renglón de abajo, como antes, y solo si ni en un renglón entero cabe se parte dentro. |
| «Completa tu perfil»: el botón se salía | 1 | El botón baja bajo su frase. |
| El buscador: el texto se salía de su píldora | 1 | La píldora mide un control como mínimo y, si hace falta, lo que pida su renglón. |
| Los botones flotantes de la ficha se salían por los lados | 2 | Si no caben juntos van uno sobre otro, cada uno entero. |
| La hoja de Lugares a 320×568: la ficha a media altura tapaba los chips de contexto y los mandos del mapa | 6 | La media altura nunca sube sobre la fila de contexto. Quedan cuatro, como excepción (abajo). |

Lo que Chromium no ve y sí Safari salió al barrer las mismas pantallas en el WebKit de Playwright con la raíz a 17, 23 y 33 px:

- **Los KPI** partían el valor a media palabra («Grati/s»): van tres en fila mientras cada uno tenga cinco veces la letra de ancho, y con la letra grande pasan a dos y a uno por fila. A la letra de fábrica caben tres desde 320, como hoy.
- **El título de una ficha** más alto que la portada empezaba bajo Atrás y el menú: un margen lo aparta (mientras quepa en la portada no mueve nada).
- **Los letreros de las acciones de la ficha** partían «Instagram»: su ancho máximo es el del círculo con aire o el de casi seis de sus letras (a la letra de fábrica, 80 px, lo mismo).
- **Las filas con una acción a la derecha** (el nombre en Perfil junto a sus botones, el valor de una fila de alta o edición junto a «Cambiar»), **el cuándo de las listas** («Próximo: hoy · 18:0», recortado al borde) y **el aviso del mapa** en «¿Es aquí?» (centrado desde la mitad, partía en muchos renglones y se salía del mapa): cuando la pantalla mide menos de 19¾ letras de ancho, la acción baja bajo el texto, la línea del cuándo parte renglón y el aviso usa el ancho del mapa. Es una consulta de contenedor (la pantalla es un contenedor): las que van en rem siguen la letra de la raíz, también la del sistema en el iPhone, y las de `@media` no. Con la raíz de 16 son 316 px y con la de fábrica del iPhone (17), 336: ningún teléfono de hoy (el más angosto mide 320; el iPhone más angosto, 375); con la mayor normal (23), 454: todos los iPhone. El número va igual en cada consulta y lo comprueba `src/app/letra.test.ts`.
- **Los renglones de la lista de Lugares**: con la letra grande el texto se montaba sobre el renglón siguiente cuando llegaba el botón «Seguir» (se lee después del primer pintado y Safari dejaba el renglón con el alto de antes). Mientras llega, su sitio queda guardado (`Renglon`, `accionEnEspera`).
- **Editar perfil se desplazaba de lado** en Safari: el botón propio del campo de foto se salía de su caja de 1 px. También pasa en `main`; queda arreglado.

### Excepciones nuevas

Cuatro, solo en «la ficha de un lugar dentro de la hoja de Lugares» (s13), solo a 320 de ancho y solo con la letra al doble (`"letra": 2` en `medidas.aceptadas.json`, cada una con su porqué): en un teléfono de 568 de alto, la portada y los números de la ficha ya no caben bajo los mandos del mapa, y la ficha a media altura sube hasta la fila de contexto y cubre el botón de ubicación, el logotipo de Mapbox y su botón de atribución, como la ficha llena; se ven al bajarla o cerrarla. El asa de la ficha mide lo ancho de su cabecera (224 px) y la pastilla «Seguir» cubre su centro, que es donde mide la prueba, pero se toca a su izquierda y la hoja se sigue arrastrando. Lo mismo sale en el WebKit de Playwright a 375×667 (el alto de un iPhone SE) con la mayor normal y con la de accesibilidad (ver § Verificación); `npm run medir` no mide ese alto.

## El teclado con la letra grande

- `npm run medir -- --letra=2` repasa el teclado en las siete pantallas con un campo (390×508, de las dos maneras): el campo enfocado a la vista y los botones de abajo enteros y sin nada encima. Pasa.
- En el simulador, «¿Cómo se llama?» y «¿Es aquí?» con los tres tamaños de letra (capturas 23 a 28): el campo a la vista y el pie con su botón encima del teclado.
- **Lo que sí se rompía: tocar «Estoy aquí» con el teclado abierto** (en «¿Dónde es?», con el buscador enfocado). El paso nuevo enfoca su campo al montarse y `ui/useCampoVisible` lo coloca, pero `PorPasos` subía la pantalla arriba al cambiar de paso, deshaciendo eso, y además el campo se colocaba antes de que el pie del paso nuevo publicara su alto. Con «Accesibilidad grande», donde «¿Es aquí?» no cabe sobre el teclado, el campo quedaba debajo del pie (captura 30). Ahora, si se cambia de paso con el teclado abierto y el campo del paso nuevo ya tiene el foco, `PorPasos` no sube la pantalla y le pide a `useCampoVisible` que lo vuelva a colocar dos cuadros después (`reasegurarCampo`; con «reducir movimiento», el aire de abajo que suma el pie tarda un cuadro en contar). Sin teclado, todo sigue como antes: arriba y el foco a la pregunta. Dos pruebas de componente nuevas en `PorPasos` (con el teclado abierto: no sube, el campo queda entre la barra y el pie, y el pie, abajo de lo que se ve; sin teclado: sube una vez); la primera falla si se quita el arreglo.
- Con la versión final, en el simulador: con «Accesibilidad grande», dos de dos veces el campo queda a la vista y el pie encima del teclado (captura 34). Con la letra de fábrica, ver el hallazgo de abajo.

## Hallazgo para otra pieza: el pie tras «Estoy aquí» en iOS 27

No es de esta pieza y pasa también en `main`. Con el teclado abierto y la ubicación ya guardada (la primera vez que se toca «Estoy aquí» la ubicación tarda, el teclado se cierra y todo queda bien), Safari de iOS 27 a veces mueve por su cuenta el área visible más allá de lo que la página se desplaza, y el pie, pegado al borde de abajo de lo que se ve (`--abajo-visible`), queda más arriba de donde toca:

- **`main`, letra de fábrica:** una vez el pie quedó arriba, encima del campo (captura 29); dos veces, bien (captura 37).
- **Esta rama, letra de fábrica:** una de tres veces el pie quedó arriba con el botón principal cortado por arriba (captura 35); las otras dos, bien (captura 36). El campo siempre a la vista.
- **Esta rama, «Accesibilidad grande»:** dos de dos, bien (captura 34). Antes del arreglo, el campo bajo el pie (captura 30).

Además, una vez, justo después de cambiar el tamaño de letra con Safari abierto, la barra del teclado de Safari (˄ ˅ ✓) quedó flotando sobre la página y cubrió la mitad de abajo del botón del pie (captura 38): Safari daba como visible también lo que tapaba esa barra. No se repitió en cinco intentos más (rama y `main`, letra de fábrica y de accesibilidad). En los casos medidos con el panel, el desfase que usa `useCampoVisible` (`pageTop - scrollY`, ver `desfaseVisible`) daba 0 en un caso con el pie alto y `offsetTop` de 267, pero también en uno bueno con `offsetTop` de 338: no basta con cambiar una medida por otra. Propuesta: una pieza aparte para medirlo en el iPhone del founder y decidir cómo pegar el pie en iOS 27.

## Lo que decidí yo

- **La condición del iPhone** es la que proponía el encargo, `@supports (-webkit-touch-callout: none)`, comprobada en los cuatro navegadores: sí en el Safari del simulador, no en Chrome, el Chromium de Playwright y el WebKit de Playwright (el de la Mac).
- **El tope del doble con una variable** (`--letra-tope`) y no con un número en cada token: cambiarlo es una línea, y `letra.test.ts` exige que cada token lo use.
- **16 px de tope para la barra de abajo y la tira de tipos** y no hacer crecer la barra: crecer la barra le quita alto a cada pantalla en el teléfono más bajo, y a 16 las cinco etiquetas caben con aire a 320 (la etiqueta pasa de 12 a 16 px: un tercio más).
- **El logotipo hasta un cuarto más** (35/30 px), por lo que dijo el founder del de 40.
- **El umbral de 19¾ letras** para pasar las acciones abajo: con la letra de fábrica no cae en ningún teléfono (nada cambia a 1×) y con la mayor normal cae en todos los iPhone. Un solo número, el mismo en todas las consultas.
- **Los KPI con columnas automáticas** de al menos cinco letras: a la letra de fábrica siguen tres en fila desde 320; con la letra grande, dos o una por fila antes que partir la palabra.
- **Las cuatro excepciones** de la hoja de Lugares a 320×568 al doble, en vez de achicar la ficha o el mapa solo para ese caso.
- **El pie tras «Estoy aquí»:** no subir la pantalla y volver a colocar el campo, en vez de seguir subiendo y colocarlo después: subir era justo lo que deshacía la colocación.
- **Cómo mide `--letra=2`:** con la preferencia de tamaño de letra del navegador (CDP `Page.setFontSizes`), no inyectando CSS: así se mide la app tal cual sale, y la propia prueba comprueba que la raíz mida 32.
- **Editar perfil de lado** (`overflow: hidden` en el campo de foto escondido) entra aunque también pase en `main`: el barrido de WebKit lo marcaba y es una línea.

## Dónde vive

- **`src/app/globals.css`:** los tokens con su tope, `--letra-tope`, `--letra-tope-tira`, los tokens nuevos y la regla del iPhone. **`src/app/layout.tsx`:** `text-scale`.
- **CSS de los arreglos:** `BarraApp`, `ui/Barra`, `NavSecciones`, `nuevo/TiraTipos`, `Destacados`, `inicio/TarjetaEvento`, `ui/Ficha`, `ui/Kpi`, `ui/Esqueleto`, `FichaPersona`, `ui/Renglon`, `Mapa`, `buscar`, `lugares/Horario`, `nuevo/evento/AltaEvento`, `ui/FormularioCanon`; los rem sueltos a tokens en `inicio/Historias`, `entrar/FormularioEntrar`, `admin` y `eventos/[id]/cartel/CreadorCartel`.
- **Componentes:** `ui/Renglon.tsx` (`accionEnEspera`), `RenglonLugar.tsx` y `ListaLugares.tsx` (lo pasan), `lugares/HojaLugares.tsx` (la media altura), `PorPasos.tsx` y `ui/useCampoVisible.ts` (`reasegurarCampo`).
- **La prueba:** `scripts/ops/auditoria-ui/medir-pantallas.mjs` (`--letra`), `medidas.aceptadas.json` (las cuatro excepciones), `inventario-css.mjs` e `inventario.aceptado.json` (`remSuelto`), `README.md`.

## Presupuestos

Ninguno cambia. `npm run medir` a la letra de fábrica sale **sin novedades**, con los mismos presupuestos de nodos y profundidad; al doble no se miran (ver arriba). `npm run inventario`: 333 medidas en duro y 1 bloque repetido, como antes.

## Pruebas nuevas

- **`src/app/letra.test.ts`** (8): un solo `--letra-tope`; cada `--letra-*` es `min(Xrem, calc(Ypx * var(--letra-tope)))` con X × 16 = Y (o el alias de uno así); el campo nunca baja de 16; los topes de las tiras y del logotipo; la raíz en `100%`; la regla del iPhone con todo lo que repone y una sola `-apple-system-body`; todas las consultas de contenedor en rem del código usan el mismo número, que no cae en ningún teléfono a la letra de fábrica y sí en todos los iPhone con la mayor normal; y `text-scale` en `layout.tsx`.
- **`PorPasos.componentes.test.mjs`**: las dos del teclado al cambiar de paso (arriba).
- **`AltaEvento.componentes.test.mjs`**: las horas de «Revisa» siguen en una sola caja de línea; ahora la prueba mira que sean un bloque en línea y no `nowrap`.

## Verificación

- `npm run lint` (0 errores; la advertencia de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (3542 en 195 archivos), `npm run inventario` y `npm run medir` (37 pantallas × 4 anchos): **sin novedades**. `npm run medir -- --letra=2`: **sin novedades**.
- **Componentes:** `npm run test:componentes`, **573 de 573** con el Chromium de Playwright, el de la CI.
- **A 1× nada cambia en Chromium:** las 26 pantallas de la medición (sin las de la hoja) a 320, 390, 820 y 1280, `main` contra la rama, con el mismo respaldo y el mismo reloj, píxel por píxel. Lo que sale distinto son imágenes que cargan o se decodifican en otro momento: comparando `main` contra sí mismo salen 15 casos así (hasta 3402 px), y el mayor de la rama (la portada del festival a 820, 16 412 px) sale idéntico en dos de tres repeticiones. En el texto y la maquetación, ninguna diferencia.
- **WebKit de Playwright** (lo que Chromium no ve de Safari), con la raíz forzada a 17, 23 y 33 px en las 37 pantallas, con la versión final: a 390×844, **nada**. A 375×667 (el alto de un iPhone SE) y a 320×568 solo queda lo de las excepciones de la hoja de Lugares (la ficha a media altura cubre el botón de ubicación, el logotipo de Mapbox y su atribución, y a 33 px «Seguir» tapa el centro del asa): a 375, desde la mayor normal (23 px; con 21, bien), repetido dos veces. Y a 320 con 23 px, el chip «Hoy» de Buscar mide 43 de alto, un píxel menos de los 44 de toque (en Chromium al doble, bien).
- **Simulador** (iPhone 17, iOS 27.0, `8CB4EB13`), con la app compilada contra el respaldo local y la sesión inventada de Ana: la raíz a 17, 23 y 33 px con `content_size` `large`, `extra-extra-extra-large` y `accessibility-large`; Inicio, la ficha de un evento, Agenda, Lugares, la ficha de un lugar y Perfil con los tres tamaños; las altas con el teclado en pantalla; el traspaso de «Estoy aquí». Al terminar, la letra quedó en `large` y el simulador apagado.
- **La web instalada en el inicio** (en el simulador, «Agregar a Inicio» con «Abrir como app web»): con «Accesibilidad grande» la app abre con la letra grande, y al pasar a la de fábrica en Ajustes cambia en vivo, sin recargar (capturas 39 y 40). Después la quité.
- **Android:** el emulador (Android 37) trae Chrome 145; según caniuse (consultada el 2026-10-11), `text-scale` llega a Chrome para Android en la 154 (a Chrome de escritorio y Edge en la 146), así que ahí no se puede ver el efecto; además, Chrome pedía aceptar sus condiciones y no lo hice. La etiqueta sí sale en el HTML. Falta probarlo en un teléfono con Chrome 154 o más (el de pruebas del founder).
- **La app de la tienda** (TestFlight) no la probé: es la misma web en el WebKit de iOS, así que la condición se cumple y debería seguir la letra del teléfono igual que Safari.

## Capturas

[`docs/rediseno/capturas-404/`](../../../rediseno/capturas-404/): las del simulador, a la mitad de su tamaño (603×1311); 32 y 33, de Chromium con la letra al doble. Abiertas una por una.

- `01-diagnostico-raiz-fabrica.png` — página de diagnóstico con el CSS de la app en el Safari del simulador, letra «Grande» (la de fábrica): `@supports` sí, raíz 17 px, interlineado 23,8, peso 400, «wdth» 80 y numerales tabulares (lo que repone la regla); `--letra-2xs` 12,75, `--letra-md` 18,06, `--letra-2xl` 27,6, el campo 18,06, la etiqueta de la barra 12,75, el logotipo 29,75; 19,75rem = 336 px: la consulta no se cumple.
- `02-diagnostico-raiz-mayor.png` — la mayor normal: raíz 23 px; `--letra-2xs` 17,25, `--letra-md` 24,44, `--letra-2xl` 37,4; la etiqueta de la barra en su tope (16) y el logotipo en el suyo (35); 454 px: la consulta se cumple.
- `03-diagnostico-raiz-accesibilidad.png` — «Accesibilidad grande»: raíz 33 px; los tokens en su tope del doble (`--letra-2xs` 24, `--letra-md` 34, `--letra-2xl` 52); barra 16, logotipo 35.
- `04-inicio-fabrica.png` — Inicio a 17 px: barra con el logotipo, chips «San Luis Potosí», «Cuándo» y «Filtros», la fila «Ahora», «Tus planes» con «Ver mi perfil ›», las tarjetas con su sello de fecha, «1 va» y «Te interesa», y la barra de abajo.
- `05-inicio-mayor.png` — a 23 px: todo más grande; la tira de chips se desliza («Filt…» asoma a la derecha), los títulos de las tarjetas en dos líneas y el lugar con «…», las etiquetas de la barra de abajo a 16.
- `06-inicio-accesibilidad.png` — a 33 px (tope del doble): «Tus planes» grande con «Ver mi perfil ›» todavía al lado, los sellos de fecha más grandes, la barra de abajo igual que a 23.
- `07-inicio-mayor-antes-despues.png` — la mayor normal, izquierda `main` y derecha la rama: en `main` todo sigue a 16 px, igual que con la letra de fábrica (lo que vio el founder); en la rama crece.
- `08-ficha-evento-fabrica.png` — la ficha de un evento a 17 px: portada con el título, los tres números en fila (18:00 dom 11 oct, Gratis, 0), Compartir, A mi calendario y Cómo llegar, «Dónde» y los flotantes «Me interesa» y «Voy».
- `09-ficha-evento-mayor.png` — a 23 px: el título en tres líneas, los números siguen tres en fila («dom / 11 oct» en dos líneas), las acciones y los flotantes más grandes.
- `10-ficha-evento-accesibilidad.png` — a 33 px: los números pasan a dos por fila; de las acciones, dos en la primera fila y «Cómo llegar» abajo; los flotantes pasan por encima de lo que se desliza, como siempre.
- `11-agenda-fabrica.png` — Agenda a 17 px: «Hoy · 2», renglones con foto, título, hora en violeta y lugar; «Para visitar hoy» con «Abre 10:00 a.m.–6:00 p.m. · hasta el dom 8 …».
- `12-agenda-mayor.png` — a 23 px: el título en dos líneas con «…» y el lugar parte renglón («Teatro del Centro de / Difusión Cultural del IPBA / Raúl Gamboa») en vez de recortarse.
- `13-agenda-accesibilidad.png` — a 33 px: títulos en dos líneas con «…», la hora y el lugar en su renglón («Templo de San / Francisco»), el ✓ de «Voy» a la derecha.
- `14-lugares-fabrica.png` — Lugares a 17 px: el mapa (sin estilo, la llave es inventada), la hoja con «9 lugares», «Con eventos · 7», renglones con qué es, calle, «Próximo: …» y la campana.
- `15-lugares-mayor.png` — a 23 px: la calle y «Próximo: lun 21 de sep · / 00:00» parten renglón; los renglones no se enciman.
- `16-lugares-accesibilidad.png` — a 33 px: el nombre en dos líneas con «…», la calle y el próximo en sus renglones, la campana a la derecha.
- `17-ficha-lugar-fabrica.png` — la ficha del Teatro de la Paz a 17 px: «FORO», el nombre, Distancia, Eventos y Siguen, cuatro acciones (Cómo llegar, Compartir, Sitio web, Instagram), «Próximos eventos · 2» y «Seguir» flotando.
- `18-ficha-lugar-mayor.png` — a 23 px: los números siguen tres en fila («2 / próximos»; la etiqueta «DISTANC…» se corta con «…»), las cuatro acciones en fila con «Instagram» entero.
- `19-ficha-lugar-accesibilidad.png` — a 33 px: los números dos por fila; tres acciones en la primera fila e Instagram abajo; «Seguir» flotando encima.
- `20-perfil-fabrica.png` — Perfil de Ana a 17 px: la foto, el nombre y la colonia con los botones de ajustes y compartir a la derecha; «Completar» a la derecha de su frase; Voy 2, Interesan 3, Sigo 2.
- `21-perfil-mayor.png` — a 23 px: la foto y los botones arriba y el nombre y la colonia debajo, con toda la fila; «Completar» bajo su frase; «INTERES…» se corta con «…».
- `22-perfil-accesibilidad.png` — a 33 px: lo mismo, más grande; «INTER…».
- `23-alta-nombre-teclado-fabrica.png` — «¿Cómo se llama?» a 17 px con «Eco» escrito: el campo, los tipos (Evento elegido), «Siguiente» y, debajo, la píldora de Safari, su barra ˄ ˅ ✓ y el teclado.
- `24-alta-nombre-teclado-mayor.png` — lo mismo a 23 px: «Siguiente» sobre la píldora y el teclado.
- `25-alta-nombre-teclado-accesibilidad.png` — a 33 px: la barra de arriba subió con la página, el campo con «Eco», los tipos y «Siguiente» sobre el teclado.
- `26-alta-es-aqui-teclado-fabrica.png` — «¿Es aquí?» a 17 px, tocando el campo: «Este punto del mapa», la ayuda, «Nombre del lugar» enfocado y el pie («Falta el nombre», «Buscar otro») sobre la píldora y el teclado.
- `27-alta-es-aqui-teclado-mayor.png` — lo mismo a 23 px.
- `28-alta-es-aqui-teclado-accesibilidad.png` — a 33 px: la ayuda en dos líneas, el campo y el pie sobre el teclado.
- `29-main-es-aqui-tras-estoy-aqui-pie-alto.png` — `main`, letra de fábrica, tras «Estoy aquí» con el teclado abierto: el pie quedó arriba, encima de la ayuda y del campo, con hueco hasta el teclado (hallazgo de arriba).
- `30-antes-del-arreglo-campo-bajo-el-pie.png` — la rama antes del arreglo de `PorPasos`, «Accesibilidad grande», tras «Estoy aquí»: el pie (fijo, de 261 a 410) tapa el campo (de 283 a 333); el panel amarillo es el de medidas.
- `31-editar-perfil-accesibilidad.png` — Editar perfil a 33 px: «‹ Atrás» entero junto al logotipo, Foto, Nombre y Colonia con «Cambiar» bajo su valor; la página no se desplaza de lado.
- `32-chromium-letra-x2-inicio-390.png` — Inicio entero en Chromium a 390 con la letra al doble: «Ver la agenda ›» baja bajo el título cuando no cabe al lado; «Nuevo audio» y «Nuevo video» parten renglón dentro del cartel; la barra de abajo con sus etiquetas a 16.
- `33-chromium-letra-x2-ficha-evento-320.png` — la ficha de un evento entera en Chromium a 320 al doble: el título en cuatro líneas, un número por fila, una acción por fila con su letrero, «Dónde», «Artistas», «Sobre el evento» y «Me interesa» y «Voy» uno sobre otro.
- `34-es-aqui-tras-estoy-aqui-accesibilidad.png` — la versión final, «Accesibilidad grande», tras «Estoy aquí» con el teclado abierto: el campo arriba, enfocado, y el pie justo debajo, sobre la píldora y el teclado.
- `35-es-aqui-tras-estoy-aqui-fabrica-pie-arriba.png` — la versión final, letra de fábrica, la vez de tres en que Safari movió el área visible: «Buscar otro» arriba del todo, «Falta el nombre» cortado por arriba y el campo a la vista.
- `36-es-aqui-tras-estoy-aqui-fabrica.png` — la versión final, letra de fábrica, otra de las tres: el campo y el pie justo encima de la píldora y el teclado.
- `37-main-es-aqui-tras-estoy-aqui-fabrica.png` — `main`, letra de fábrica, el mismo paso: bien, como la 36.
- `38-safari-barra-del-teclado-sobre-el-pie.png` — la rama con «Accesibilidad grande», justo después de cambiar el tamaño con Safari abierto: la barra ˄ ˅ ✓ del teclado flota sobre el pie y cubre la mitad de abajo de «Siguiente» (panel de medidas: área visible de 484 px hasta el teclado). No se repitió.
- `39-web-instalada-inicio-accesibilidad.png` — la web instalada, sin las barras de Safari, con «Accesibilidad grande»: la letra grande; «Ver la agenda ›» bajo «Destacados» (sin sesión: la app instalada no comparte las cookies de Safari).
- `40-web-instalada-inicio-fabrica-en-vivo.png` — la misma app abierta, después de pasar a la letra de fábrica en Ajustes: cambió sola, sin recargar; «Ver la agenda ›» vuelve al lado del título.

## Límites

- **El iPhone y el Android del founder:** todo se probó en el simulador y en navegadores de escritorio. En Android, `text-scale` no se pudo ver funcionar (Chrome 145).
- **La app de la tienda** y **el iPad** no se probaron (el iPad cumple la misma condición; sus anchos se midieron en Chromium al doble).
- **Las etiquetas en mayúsculas de los números** (la ficha de un lugar, las pestañas de Perfil) se cortan con «…» con la letra grande («DISTANC…», «INTER…»); el número sí se ve entero.
- **Los tamaños en px fijos** se quedaron como estaban (arriba).

## Pendiente

El PR (lo abre el gestor) y el «publica» del founder; probarlo en su iPhone (Ajustes › Pantalla y brillo › Tamaño del texto, y Accesibilidad › Pantalla y tamaño del texto › Texto más grande) y en un Android con Chrome 154 o más; y la pieza aparte del pie tras «Estoy aquí» en iOS 27.
