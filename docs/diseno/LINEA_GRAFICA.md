# Línea gráfica — tipografía y logotipo

**Decidido por el founder el 2026-09-14.** Comparación que respalda la decisión: [comparador-tipografia.html](comparador-tipografia.html) (siete letras condensadas sobre una pantalla de la app; publicada también en https://claude.ai/artifact/EkQYL15pfLJPUwPLSRz2YR).

## La letra

**Bricolage Grotesque** (Mathieu Triay, 2022–2023, licencia OFL, en Google Fonts). Una sola familia para toda la app: logotipo, títulos, texto, botones y campos.

- Variable, con tres ejes: peso `wght` 200–800, ancho `wdth` 75–100, tamaño óptico `opsz` 12–96. Sin itálicas.
- Se usa **condensada**: ancho 75 en logotipo y títulos, ancho 80 en texto corrido y campos (un poco más abierta para leer a 16–17 px).
- El tamaño óptico se deja en automático (`font-optical-sizing: auto`): a lo grande enseña las trampas de tinta y las curvas irregulares; en texto chico desaparecen y queda una letra limpia.
- Sustituye a la "fuente del sistema" decidida en la Fase 0.

Por qué esta y no otra: condensada, con toques humanos y artísticos a tamaño grande, y limpia a tamaño de lectura. Las descartadas y sus razones están en el comparador (Afacad Flux, Anek Latin, Asap Condensed, Mohave, Yanone Kaffeesatz, Big Shoulders; y fuera de la comparación Oswald, Roboto Condensed, Bebas, Truculenta, Homenaje, Acme, Fjalla One, Encode Sans Condensed, Fira Sans Condensed).

## El logotipo

- **Aprobado por el founder el 2026-09-15:** el logotipo es el dibujo **SMSNSTRS con manos y pies** ([logotipo/](logotipo/README.md)), hecho sobre Bricolage Grotesque peso 800 y ancho 75. Se sirve como SVG en tinta: `public/logotipo.svg` (completo) y `public/logotipo-chico.svg` (dedos más gruesos y calzado sin cordones, para tamaños chicos). Su altura va en rem, así crece si la persona agranda el texto del teléfono. Sustituye al logotipo en texto. El arte final del founder (`logotipo/LogoFinal/SMNSTRS - logo.svg`, 2026-09-16) no va en la barra: reducido pierde las manos y los pies (visto el 2026-09-17); queda para piezas grandes.
- Va **arriba a la izquierda** de la barra superior de las pantallas raíz (Agenda, Mapa), con el perfil a la derecha: es el estándar que la gente ya conoce (ley de Jakob; corrección del founder el 2026-09-14, antes decía "a la derecha"). En pantallas interiores, el regreso va a la izquierda y el logotipo al centro. El completo mide 28 px de alto en las pantallas raíz (`--alto-logo`); al centro de las interiores va la versión chica a 24 px (`--alto-logo-chico`). A 40 px el founder lo vio "demasiado gigante" (2026-09-15). Siempre en tinta, nunca en rojo. Es un enlace al inicio. No lleva icono ni palabra al lado.
- El nombre se escribe **Somos Nosotros** (dos palabras, mayúscula inicial) en cualquier texto que la gente lea: título de la pestaña, nombre de la app instalada, correos, avisos. El dominio (somosnosotros.org) y el repo siguen en minúsculas y pegados.
- Muestra grande del logotipo: SMSNSTRS a 56–84 px se usa en la pantalla de entrada y en cualquier pieza de presentación.
- **Favicon:** el símbolo SN del arte final (`LogoFinal/SN - Symbol.svg`) en tinta sobre blanco (`src/app/favicon.ico`, capas de 16, 32 y 48 px).
- **Icono de instalación** («Añadir a inicio»): el mismo símbolo SN en tinta **sobre blanco opaco** (`#ffffff`, sin esquinas transparentes: iOS pinta oscuro lo transparente, visto el 2026-09-16): `public/apple-touch-icon.png` (180 px, iPhone), `icono-192.png` e `icono-512.png` (manifiesto) e `icono-maskable-512.png` (Android, con el dibujo dentro del círculo seguro). La insignia de los avisos de Android (`icono-aviso.png`) es su silueta blanca. Se regeneran con `node docs/diseno/logotipo/iconos-sn.mjs`.

## El color de acción

**Violeta `#6d34c8`** (`--primario`) para acciones primarias (Publicar, Voy, Seguir, Entrar, Mandarme el código), el estado activo de la navegación inferior, la pestaña elegida (Todos · Cercanos…, Mapa · Lista), los chips activos y el pin con evento del mapa; `--primario-suave` para el fondo del estado seleccionado ("✓ Voy", "✓ Sigues"), derivado con `color-mix(in srgb, var(--primario) 12%, white)` (ya no es un hex fijo). **Actualización del founder, 2026-09-23 (OL-146, código de OL-141/doc rediseno/37):** "Violeta". Sustituye al azul petróleo `#0f6b7c` decidido el 2026-09-14: el founder lo vio "aguado, parecido a eventos a donde voy" y, medido, se confundía con el verde de "Sigues" (misma luminosidad, 42° de matiz de distancia, contraste entre los dos 1,0:1). El violeta contrasta 7,1:1 con blanco y 6,5:1 con el fondo de contenido `#f6f5f1` (texto blanco encima legible, AAA), y queda a 117° o más del verde, del naranja y del rojo: no se confunde con ninguno. El logotipo y el texto siguen en tinta; el rojo sigue solo para errores y borrar; el verde y el naranja no cambiaron.

## La navegación inferior y los avisos

- **Navegación inferior**: cinco destinos (Inicio · Agenda · Lugares · Artistas · Perfil, con la foto de la persona), blanca, con borde y sombra hacia arriba; 60 px más el área segura; se recoge en el teléfono al bajar (ver «El armazón»). El destino activo lleva una **píldora de 60×32 en el color de acción** detrás del icono (icono en blanco) y la etiqueta en ese color; los demás, en gris. La píldora ocupa su sitio siempre, así nada salta al cambiar. Ajuste del founder, 2026-09-14: "la nav tiene que notarse".
- **Avisos persistentes** (`ui/Aviso`): tinta sobre blanco, 15 px, con ✕; no desaparecen solos. Para errores con salida ("No pudimos leer tu ubicación. Actívala…") encima del mapa o bajo los chips. Nunca un texto gris sobre vidrio.

## Las tres franjas del shell

Toda pantalla tiene cabecera blanca, contenido en `--fondo-contenido` (hueso) y una franja blanca abajo (la nav en las pantallas raíz; la barra de acciones en las fichas). Las fichas lo cumplen desde el 2026-09-14: la cabecera interior (`ui/Barra`, regreso · SMSNSTRS · ···) es una franja de borde a borde, pegajosa arriba, con borde inferior; lo que se lee va sobre el hueso; los botones y tarjetas van en blanco encima.

## Estados del renglón de lista

Con ratón, al pasar por encima el renglón se levanta en blanco con una marca de 3 px del color de acción a la izquierda y el título en ese color; pulsado, igual sin marca; el elegido (`aria-current="true"`) va en `--primario-suave`; el foco de teclado lleva el aro interior. Lo que no tiene portada (evento, lugar o artista) muestra una imagen con el símbolo SN al centro, `#b1b0a9` sobre `--fondo-miniatura` (founder, 2026-09-16): `public/sin-foto.png` en miniaturas y avatares, y `public/sin-foto-ancha.png` en la banda de las fichas. Se generan una vez con `docs/diseno/logotipo/sin-foto-sn.mjs`; nunca se componen en vivo ni son un cuadro punteado. Lo de artistas va siempre en contenedor redondo, como su avatar. La línea de calendario solo aparece cuando hay fecha.

## Una columna en cualquier pantalla

La app se diseña para el teléfono y se ve en tablet y escritorio con **la misma maquetación**: una columna de 600 px centrada. Dos tokens en `globals.css`: `--columna` (600 px) y `--gutter: max(20px, (ancho del armazón − --columna) / 2)` (`100cqw`: el armazón es un contenedor y no cuenta la barra de desplazamiento clásica; lo que se pinta fuera de él, por portal, mide la ventana). En el teléfono el gutter vale 20 px, como siempre; en pantallas anchas crece hasta centrar la columna. Las clases `.columna` (ancho de lectura, centrado, sin medir la ventana) y `.a-lo-ancho` (de borde a borde) son la forma nueva, para las plantillas que se rehacen sin gutter en la página.

- **Regla:** todo gutter horizontal de página se escribe `var(--gutter)`. Los rellenos de botones y las sangrías siguen con `--espacio-N`.
- **Las barras van a lo ancho; el contenido, en la columna.** Barra superior, nav inferior, barra pegajosa de las fichas, hojas y cabeceras pegajosas pintan su fondo de borde a borde y alinean sus hijos con la columna. El mapa llena la pantalla; sus controles y la tarjeta del lugar se alinean con la columna.
- Sin media queries de ancho (salvo la de 792 del armazón, ver «El armazón»), sin envoltorios, sin componentes por tamaño (maquetación plana). Con ratón (`@media (hover: hover)`), los renglones se resaltan al pasar por encima.
- **Las filas de chips corren a todo lo ancho**, nunca recortadas en el borde de la columna: su caja no pone gutter, la fila lleva `padding-inline: var(--gutter)` (el primer chip alineado con la columna) y sigue hasta el borde de la pantalla; los demás hijos de la caja ponen el gutter como margen.

## El mapa de Lugares

Plano (el estilo de la cuenta lleva `show3dObjects: false`). Cada lugar es un **punto**, sin doble círculo ("aro": el founder lo quitó el 2026-09-23 por "demasiado ruido visual", OL-146/doc rediseno/37). El **tamaño** dice si hay evento en los próximos siete días (12 px con el día encima, "Hoy" o el día en tres letras; 5 px sin él) y el **color** dice qué es el lugar:

| lugar | tamaño | color |
|---|---|---|
| sin evento esta semana, no seguido | 5 px | tinta `#1a1a1a` (nombre en tinta) |
| con evento esta semana | 12 px con el día | color de acción `--primario` |
| destacado que no se sigue | según tenga día | naranja `--destacado`; nombre en `--destacado-texto` |
| seguido | según tenga día | verde `--ok`; gana a destacado y a evento |

El **nombre va debajo** del punto, negrita (DIN Pro Bold) a 14 px con halo blanco de 2 px, para distinguirse de las colonias y calles del estilo (gris, mayúsculas): si dos chocan, gana el seguido, luego el destacado, luego el que tiene evento. Son capas de Mapbox (no elementos encima), así el mapa resuelve las colisiones y el zoom. Decisión del founder, 2026-09-14 (sustituye a los pins y a la perspectiva de ese mismo día); tamaño y color por lo que ES el lugar, sin aro, decisión del founder 2026-09-23.

Un **destacado** (docs/rediseno/20, founder, 2026-09-16) va en **naranja cempasúchil** `--destacado` `#d35400`, encima de los demás salvo que también sea seguido (gana el verde). El color nunca va solo: el tamaño también dice si tiene evento. Contrasta con el fondo del mapa y se distingue del violeta también con daltonismo.

## La tira de destacados

Arriba de la Agenda, de Lugares › Lista y de Artistas: el título «Destacados» y un carril que se desliza con el dedo, sin avance automático, con la siguiente tarjeta asomando. Tarjetas de 220 px con la foto de 132 px de alto, cuántos van encima de la foto, el título en dos renglones y el detalle en uno. En Artistas son redondas de 104 px, como su avatar. Con una sola, la tarjeta va a lo ancho con la foto a la izquierda. En el panel, la etiqueta «Destacado» va en `--destacado-suave` con letra `--destacado-texto`.

## El regreso

En pantallas interiores, el regreso es una **píldora secundaria** (`ui/Boton`: borde `--borde`, fondo blanco, 44 px de alto) con un chevron corto `‹` y el texto del destino ("Volver", "Artistas"), alineada a la izquierda de la barra. Nunca una flecha larga suelta. Componente `ui/Atras`, también en las páginas de error. Ajuste del founder, 2026-09-14; a 44 px con la reestructura (OL-230).

## Botones

Dos piezas para todos los botones de la app (OL-230, doc 50 § 5.2), sin más dibujos sueltos.

- **`ui/Boton`** (con texto): variantes `primario`, `secundario`, `texto` y `peligro`; forma `recta` (`--radio`) o `pildora`; alto `toque` (48, el del pulgar) o `control` (44, el mínimo: barras, cabeceras y renglones); ancho `completo` o `contenido`. Deshabilitado a 0,55; un enlace late mientras el servidor responde.
- **`ui/BotonIcono`** (solo icono, redondo): tamaño `control` 44 (barras y cabeceras), `accion` 48 (renglones, tarjetas y mapa) o `grande` 56 (acciones de una ficha); relieve `plano` (barras), `elevado` (blanco con sombra y glifo violeta: acciones sobre listas, tarjetas, mapa y ficha) o `contorno` (borde, solo opciones secundarias de un formulario). **Decidido** es verde (`--ok`) con el glifo en blanco.
- **Glifos de acción:** «Voy» es la palomita; «seguir» es que te avisen, la campana con «+» en un lugar y la persona con «+» en un artista. Ya decidido, la palomita blanca sobre verde en los tres casos.

## Renglones y palanca

Una sola rejilla con áreas para toda fila de la app (OL-231, doc 50 § 5.2): `ui/Renglon` y sus cuatro pieles. Lo visual va a la izquierda (icono o foto), el texto en el centro y la acción a la derecha; cada hijo va a su área por lo que es (el primero es lo visual, `b` el texto principal, `small` el secundario y todo lo demás la acción).

- **`lista`** (Agenda, Lugares, Artistas y las fichas): foto de 56 (`--foto-renglon`), título, datos con icono y el botón de acción a la derecha, hermano del enlace. Ningún dato pasa del borde de su columna: el que es una sola línea se corta con puntos suspensivos y la dirección se parte.
- **`dato`** (fichas): icono, principal, secundario y, si lo hay, el enlace que lleva más lejos; 44 de alto como mínimo.
- **`ajuste`** (Ajustes): icono en una columna de 24, etiqueta, detalle y chevron, valor o palanca; 52 de alto como mínimo.
- **`resuelto`** (altas y ediciones): icono, clave sobre valor y acción (`Boton` de texto, `BotonIcono` de contorno o `Palanca`); 60 de alto como mínimo, con el cuerpo debajo al abrir. Pendiente lleva el borde discontinuo; abierto, el de tinta.
- **`ui/Palanca`**: el interruptor único. Se ve en 51×31 y se toca en 51×45; la perilla mide 27 y recorre 20.
- **`ui/Esqueleto`** dibuja el renglón con barras grises y la misma rejilla: mide lo que el renglón, sin medidas propias.

## El armazón

Una sola rejilla para toda la app (OL-232, doc 50 § 5.3 y § 5.4): la barra de la app, la pantalla y, fija al pie, la navegación. No depende de lo que hay dentro: el layout pone `data-vista` según la ruta (`lib/armazon.ts`) y el CSS solo lee ese atributo.

- **Vistas:** `raiz` (Inicio, Agenda, Lugares, Artistas, Perfil y la confirmación de un borrado: barra de la app y navegación), `ficha` (evento, lugar, artista, persona), `tarea` (altas, ediciones, ajustes, entrar, novedades, administración, textos legales) y `completa` (la pared y el mando de una obra colectiva y el letrero para imprimir: sin barra ni navegación). En el teléfono lo que no es raíz lleva su propia cabecera (`ui/Barra`) y la barra de la app no se ve.
- **La barra de la app** (`BarraApp`): «+» · Atrás · logotipo · lupa · sesión (campana o «Entrar») · menú «···», todo a 44. Atrás y el menú solo desde 792 y con una ficha a la vista: la ficha los presta (`prestamoBarra`, `EnBarra`) y su cabecera propia deja de verse (nunca dos barras). El «+» lleva al alta de la sección (evento, lugar o artista) con la ciudad que se ve; la lupa abre la búsqueda de la pantalla y, si no tiene, la de Inicio. Administración, para quien lo es, va junto al «+». Son tres celdas de una rejilla (un lado, el logotipo y el otro lado) y los dos lados valen lo mismo (`--flanco`: la lupa y «Entrar», lo más ancho que llega a haber junto al logotipo), así el logotipo queda en el centro exacto con o sin sesión, con o sin la llave de administración y con o sin Atrás y menú; en una ventana muy angosta (320) se achica antes que correrse. Desde 792 los lugares de Atrás y del menú se reservan aunque no haya ficha: nada se mueve al pasar de una pantalla a otra.
- **Barra y fila de contexto son una región:** las dos blancas, sin raya entre ellas; la única raya va bajo la fila (`ui/Cabecera`), que se pega justo bajo la barra y, cuando la barra se recoge, arriba del todo (`--barra-vista`). Al jalar hacia abajo, un relleno blanco de 300 px sobre la fila evita que asome el fondo del listado.
- **Se recoge en el teléfono** (raíces): al bajar (más de 120 px, con el dedo bajando) la barra sube y la navegación baja (`data-recogida`); vuelven al subir un poco, cerca del inicio, al llegar al final y en cada pantalla nueva. Un salto a una letra la recoge al momento y sin animar, para medir ya el alto final.
- **Un solo corte de ancho: 792.** Desde ahí la barra ocupa todo el ancho, no se recoge, está en fichas y tareas, y trae Atrás y el menú con una ficha a la vista. La cabecera propia de una tarea (alta, ajustes, entrar) se queda, pero sin repetir el logotipo: el de la barra de la app es el único.

## Roles tipográficos

| Rol | Peso | Ancho | Tamaño | Notas |
|---|---|---|---|---|
| Logotipo SMSNSTRS (dibujo SVG) | — | — | 28 px de alto en raíz, 24 px en interiores | al centro: en la barra de la app y, en el teléfono, en la cabecera interior |
| Título de pantalla, nombre de lugar o evento | 700 | 75 | 26–30 px | `text-wrap: balance` |
| Título de sección, título de tarjeta | 700 | 75 | 19–20 px | |
| Botón principal | 700 | 80 | 18 px | `ui/Boton` de 48 |
| Botón compacto | 700 | 80 | 15 px | `ui/Boton` de 44 (barras y acciones pequeñas) |
| Texto y campos | 400 | 80 | 17 px (mínimo 16 px: Safari no hace zoom) | |
| Detalle, ayuda, error | 400 | 80 | 15 px | |
| Etiqueta en mayúsculas (cuándo, "sobre el lugar") | 500 | 80 | 14 px | interletrado 0.04em |
| Números en listas y fechas | según rol | según rol | | `font-variant-numeric: tabular-nums` |

Una condensada se percibe más chica que la letra del sistema: la escala de `globals.css` sube un punto en cada paso (13→14, 14→15, 16→17, 17→18, 18→19, 24→26, 28→30). Los tamaños son propuesta; el founder firma en su iPhone.

## Cómo se integra (orden)

1. **Cargar la letra con `next/font/google`** en `src/app/layout.tsx`: `Bricolage_Grotesque` con `axes: ["opsz", "wdth"]`, `subsets: ["latin", "latin-ext"]`, `display: "swap"`, `variable: "--fuente-bricolage"`. Con esto el archivo se sirve desde somosnosotros.org, sin llamada a Google en cada visita y sin salto de diseño al cargar.
2. **Un solo punto de verdad en `globals.css`:** `--fuente: var(--fuente-bricolage), -apple-system, …`; tokens nuevos `--ancho-titulo: "wdth" 75` y `--ancho-texto: "wdth" 80` aplicados con `font-variation-settings`; `font-optical-sizing: auto`; nueva escala de letra.
3. **Componente `Logotipo`** (texto SMSNSTRS, enlace a `/`), colocado arriba a la izquierda de la barra en las pantallas raíz y al centro en las interiores (v1 lo puso a la derecha; se corrige con el PR del inicio). Revisar cada pantalla que hoy tenga barra: inicio, agenda, lugares, ficha de lugar, ficha de evento, perfil, admin.
4. **Nombre visible:** `title`, `applicationName` y `appleWebApp.title` pasan a "Somos Nosotros"; también `manifest.ts` y los correos o avisos que muestren el nombre.
5. **Revisar pesos:** donde hoy se usa `font-weight: 600` para títulos, pasar a 700 (la condensada a 600 se ve floja).
6. **Verificar:** `npm run lint && npm run typecheck && npm test`; build verde; capturas 390×844 de inicio, agenda, ficha de evento, formulario de evento y perfil; comprobar que ningún campo baja de 16 px; mirar el peso del archivo de fuente que genera `next/font` (debe quedar en un solo archivo variable con subconjunto latino).
7. **Cerrar:** bitácora de la sesión y `OPEN_LOOPS.md`. Un PR; el founder firma en su iPhone (Safari).

Fuera de este trabajo, para decidir después con el founder: pantalla de entrada con el logotipo grande, tipografía del mapa de Mapbox (usa la suya). Los iconos de la app ya están hechos (2026-09-15).
