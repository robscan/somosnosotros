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

- **Arte final del founder, 2026-09-16** (antes, el dibujo generado con código aprobado el 2026-09-15): el logotipo es el dibujo **SMSNSTRS con manos y pies** (`docs/diseno/logotipo/LogoFinal/SMNSTRS - logo.svg`, ver [logotipo/](logotipo/README.md)). Se sirve como un solo SVG en tinta, `public/logotipo.svg`, para los dos tamaños de la barra. Su altura va en rem, así crece si la persona agranda el texto del teléfono. Sustituye al logotipo en texto.
- Va **arriba a la izquierda** de la barra superior de las pantallas raíz (Agenda, Mapa), con el perfil a la derecha: es el estándar que la gente ya conoce (ley de Jakob; corrección del founder el 2026-09-14, antes decía "a la derecha"). En pantallas interiores, el regreso va a la izquierda y el logotipo al centro. El completo mide 28 px de alto en las pantallas raíz (`--alto-logo`); al centro de las interiores va la versión chica a 24 px (`--alto-logo-chico`). A 40 px el founder lo vio "demasiado gigante" (2026-09-15). Siempre en tinta, nunca en rojo. Es un enlace al inicio. No lleva icono ni palabra al lado.
- El nombre se escribe **Somos Nosotros** (dos palabras, mayúscula inicial) en cualquier texto que la gente lea: título de la pestaña, nombre de la app instalada, correos, avisos. El dominio (somosnosotros.org) y el repo siguen en minúsculas y pegados.
- Muestra grande del logotipo: SMSNSTRS a 56–84 px se usa en la pantalla de entrada y en cualquier pieza de presentación.
- **Favicon:** el símbolo SN del arte final (`LogoFinal/SN - Symbol.svg`) en tinta sobre blanco (`src/app/favicon.ico`, capas de 16, 32 y 48 px).
- **Icono de instalación** («Añadir a inicio»): el mismo símbolo SN en tinta **sobre blanco opaco** (`#ffffff`, sin esquinas transparentes: iOS pinta oscuro lo transparente, visto el 2026-09-16): `public/apple-touch-icon.png` (180 px, iPhone), `icono-192.png` e `icono-512.png` (manifiesto) e `icono-maskable-512.png` (Android, con el dibujo dentro del círculo seguro). La insignia de los avisos de Android (`icono-aviso.png`) es su silueta blanca. Se regeneran con `node docs/diseno/logotipo/iconos-sn.mjs`.

## El color de acción

**Azul petróleo `#0f6b7c`** (`--primario`) para acciones primarias (Publicar, Voy, Seguir, Entrar, Mandarme el código), el estado activo de la navegación inferior, la pestaña elegida (Todos · Cercanos…, Mapa · Lista) y los chips activos; `--primario-suave` `#e3f0f2` para el fondo del estado seleccionado ("✓ Voy", "✓ Sigues"). Sustituye a la tinta como color de acción (decisión del founder, 2026-09-14): con la tinta, el estado activo de la nav no se distinguía del resto. Por qué este: contrasta 6:1 sobre blanco (texto blanco encima legible), es complementario del fondo cálido de la app, no se confunde con el rojo de error ni con el verde de "Voy confirmado", y no es el morado que ya se descartó. El logotipo y el texto siguen en tinta; el rojo sigue solo para errores y borrar.

## La navegación inferior y los avisos

- **Navegación inferior**: blanca, con borde y sombra hacia arriba; 60 px más el área segura. El destino activo lleva una **píldora de 60×32 en el color de acción** detrás del icono (icono en blanco) y la etiqueta en ese color; los demás, en gris. La píldora ocupa su sitio siempre, así nada salta al cambiar. Ajuste del founder, 2026-09-14: "la nav tiene que notarse".
- **Avisos persistentes** (`ui/Aviso`): tinta sobre blanco, 15 px, con ✕; no desaparecen solos. Para errores con salida ("No pudimos leer tu ubicación. Actívala…") encima del mapa o bajo los chips. Nunca un texto gris sobre vidrio.

## Las tres franjas del shell

Toda pantalla tiene cabecera blanca, contenido en `--fondo-contenido` (hueso) y una franja blanca abajo (la nav en las pantallas raíz; la barra de acciones en las fichas). Las fichas lo cumplen desde el 2026-09-14: la cabecera interior (`ui/Barra`, regreso · SMSNSTRS · ···) es una franja de borde a borde, pegajosa arriba, con borde inferior; lo que se lee va sobre el hueso; los botones y tarjetas van en blanco encima.

## Estados del renglón de lista

Con ratón, al pasar por encima el renglón se levanta en blanco con una marca de 3 px del color de acción a la izquierda y el título en ese color; pulsado, igual sin marca; el elegido (`aria-current="true"`) va en `--primario-suave`; el foco de teclado lleva el aro interior. El hueco sin foto muestra el icono de lo que es (disciplina, lugar, evento) sobre `--fondo-miniatura`: nunca un cuadro punteado. La línea de calendario solo aparece cuando hay fecha.

## Una columna en cualquier pantalla

La app se diseña para el teléfono y se ve en tablet y escritorio con **la misma maquetación**: una columna de 600 px centrada. Tres tokens en `globals.css`: `--columna` (600 px), `--al-centro` (lo que sobra a cada lado, calculado sobre el ancho de la ventana para que valga lo mismo dentro de cualquier caja; negativo en el teléfono) y `--gutter: max(20px, --al-centro)`. En el teléfono el gutter vale 20 px, como siempre; en pantallas anchas crece hasta centrar la columna.

- **Regla:** todo gutter horizontal de página se escribe `var(--gutter)`. Los rellenos de botones y las sangrías siguen con `--espacio-N`.
- **Las barras van a lo ancho; el contenido, en la columna.** Barra superior, nav inferior, barra pegajosa de las fichas, hojas y cabeceras pegajosas pintan su fondo de borde a borde y alinean sus hijos con la columna. El mapa llena la pantalla; sus controles y la tarjeta del lugar se alinean con la columna.
- Sin media queries de ancho, sin envoltorios, sin componentes por tamaño (maquetación plana). Con ratón (`@media (hover: hover)`), los renglones se resaltan al pasar por encima.
- **Las filas de chips corren a todo lo ancho**, nunca recortadas en el borde de la columna: su caja no pone gutter, la fila lleva `padding-inline: var(--gutter)` (el primer chip alineado con la columna) y sigue hasta el borde de la pantalla; los demás hijos de la caja ponen el gutter como margen.

## El mapa de Lugares

Plano (el estilo de la cuenta lleva `show3dObjects: false`). Cada lugar es un **punto** de 10 px relleno del color de acción con una línea blanca de 1.5 px; el elegido crece a 16 px. (El founder descartó el punto hueco para "sin eventos": el blanco se deja para la línea.) El **nombre va debajo** del punto, en el color de acción, negrita (DIN Pro Bold) a 14 px con halo blanco de 2 px, para distinguirse de las colonias y calles del estilo (gris, mayúsculas): si dos chocan, gana el lugar con eventos y el otro aparece al acercar. Son capas de Mapbox (no elementos encima), así el mapa resuelve las colisiones y el zoom. Decisión del founder, 2026-09-14 (sustituye a los pins y a la perspectiva de ese mismo día).

## El regreso

En pantallas interiores, el regreso es una **píldora secundaria** (borde `--borde`, fondo blanco, 40 px de alto) con un chevron corto `‹` y el texto del destino ("Volver", "Artistas"), alineada a la izquierda de la barra. Nunca una flecha larga suelta. Componente `ui/Atras`, también en las páginas de error. Ajuste del founder, 2026-09-14.

## Roles tipográficos

| Rol | Peso | Ancho | Tamaño | Notas |
|---|---|---|---|---|
| Logotipo SMSNSTRS (dibujo SVG) | — | — | 28 px de alto en raíz, 24 px en interiores | a la izquierda en pantallas raíz, al centro en interiores |
| Título de pantalla, nombre de lugar o evento | 700 | 75 | 26–30 px | `text-wrap: balance` |
| Título de sección, título de tarjeta | 700 | 75 | 19–20 px | |
| Botón principal | 700 | 80 | 18 px | |
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
