# 257 · Tokens y utilidades de la reestructura de la interfaz (OL-229, pieza P1)

**Fecha:** 2026-09-28 · **Rama:** `ui-tokens`, desde `origin/main` (`8b2ad8c3`) · **OL:** OL-229 · **PR:** #267 (sin unir) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Primera pieza del plan de OL-227 (doc 50, § 7): la base de las demás.

## Pedido

Encargo del Gestor de cambios III tras la firma del founder sobre el prototipo v3 («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código»). P1: dejar en `src/app/globals.css` los tokens canónicos con los valores del prototipo firmado, las utilidades `.columna` y `.a-lo-ancho`, fuera `100vw`, los `z-index` literales a los seis tokens de capas conservando el orden de apilado, y los literales de aire y radio que ya tienen token, al token. Nada de rediseñar componentes: solo pueden cambiar a la vista los radios (es lo firmado: «bájale al redondeado, es canon»).

## Lo que había

- 50 tokens en `globals.css`, todos en uso; radios `--radio` 12 y `--radio-grande` 16 (y `999px`, `10px` y `8px` escritos a mano); aire hasta `--espacio-6`.
- 44 declaraciones de `z-index` con 16 valores distintos (1, 2, 3, 4, 5, 9, 10, 11, 20, 21, 30, 40, 50, 55, 60, 70) y ninguna escala. (El encargo hablaba de 46 líneas: dos son comentarios de `HojaDondeEs`.)
- Cuatro líneas con `100vw`: `--al-centro` (globals), `.sonda` de la pared y `.accionesRepartidas .accionEtiqueta` con su comentario (`Ficha`).
- `Destacados` decía en un comentario que no había token de 32 px; `FormularioCanon`, que no había token para el fondo de error.

## Lo que se hizo

### 1. Tokens (`globals.css`)

`:root` queda en grupos con un comentario por token: color, aire, forma, controles, barras, zonas seguras, capas, anchos, letra, letra de listas, tarjetas y renglón, movimiento. Los valores son los del bloque «1. Tokens canónicos» de `scripts/ops/auditoria-ui/prototipo/generar.py` (rama `restructura-ui`); donde el doc 50 § 5.1 y el prototipo difieren, manda el prototipo.

- **Cambian de valor:** `--radio` 12 → 8 y `--radio-grande` 16 → 12. `--gutter` se escribe sin `--al-centro` (mismo valor).
- **Nuevos, con uso hoy:** `--radio-chico`, `--radio-hoja`, `--radio-pildora`, `--espacio-7`, `--piso`, `--nav-abajo`, `--letra-2xs`, `--error-suave`, `--sistema-azul` y los seis `--z-*`.
- **Nuevos, todavía sin uso** (los pidió el encargo como base; los estrenan las piezas que siguen; 27 en total): `--ok-suave`, `--velo-titulo`, `--espacio-8`, `--control`, `--boton-icono`, `--boton-icono-grande`, `--alto-filtros`, `--ancho-carril-nav`, `--columna-ancha`, `--panel`, los ocho de la letra de listas (`--fuente-lista`, `--ancho-lista-titulo`, `--ancho-lista-meta`, `--letra-lista-titulo`, `--letra-tarjeta-titulo`, `--letra-lista-meta`, `--peso-lista-titulo`, `--interlinea-lista`), los seis de tarjetas y renglón (`--tarjeta-*`, `--foto-renglon`) y los tres de movimiento (`--duracion`, `--duracion-ficha`, `--curva`). Quién los estrena, en «Anotado para las piezas que siguen».
- **Se quita:** `--al-centro` (ver el apartado de `100vw`).

### 2. `.columna` y `.a-lo-ancho`

Dos clases globales, junto a `.raiz` y `.pagina`:

- **`.columna`**, ancho de lectura centrado: `width: 100%; max-width: calc(var(--columna) + 2 * var(--espacio-5)); margin-inline: auto; padding-inline: var(--espacio-5)`. Da 350 px de contenido a 390 y 600 a 1280, lo mismo que el gutter de hoy, pero se centra sola y no mide la ventana.
- **`.a-lo-ancho`**, la caja que llega a los dos bordes (un carril, una barra, una portada): `width: 100%`.

Nadie las usa todavía: las estrenan las plantillas de P4 y P5, donde la página deja de llevar gutter y cada bloque escoge una. No se tocó ningún marcado. Medido en una página real (ver «Pruebas puntuales»): a 320, 390, 600, 640, 820, 1280 y 1920 px el contenido de `.columna` empieza y mide lo mismo que el de una caja con `padding: 0 var(--gutter)`, y `.a-lo-ancho` mide la ventana.

### 3. `100vw`: de cuatro a una

| Dónde | Antes | Después |
|---|---|---|
| `pared.module.css` · `.sonda` | `min(720px, calc(100vw - 48px))` | `min(720px, 100%)`, y `.esquina` recibe `right: 24px`: con `left` y `right` la esquina mide la ventana menos 24 px por lado y la sonda se topa ahí |
| `Ficha.module.css` · `.accionEtiqueta` (y su comentario) | `min(80px, calc((100vw - 88px) / 4))` | `min(80px, calc((100cqw - 3 * var(--espacio-4)) / 4))`, con `container-type: inline-size` en `.accionesRepartidas`: la misma cuenta con el ancho de su propia caja (en el teléfono es `100vw − 40`, así que da lo mismo a cualquier ancho) |
| `NavInferior.module.css` (usaba `--al-centro`) | `max(8px, var(--al-centro))` | `max(8px, calc((100% - var(--columna)) / 2))`: la barra es fija y su 100 % es la ventana sin la barra de desplazamiento |
| `globals.css` · `--al-centro` y `--gutter` | `--al-centro: calc((100vw - var(--columna)) / 2)` y `--gutter: max(var(--espacio-5), var(--al-centro))` | `--al-centro` desaparece; `--gutter: max(var(--espacio-5), calc((100vw - var(--columna)) / 2))`. **Queda esta única medida de ventana en todo el CSS.** |

La navegación (y `.columna`) miden ahora sobre el ancho real de su caja: con una barra de desplazamiento clásica de 15 px (escritorio con ratón) la columna mide 600 y no 585, centrada en el ancho que queda (medido en «Pruebas puntuales»). Sin barra, que es el teléfono y un Mac con barra flotante, no cambia ni un píxel.

**Por qué el gutter conserva su `100vw`.** `--gutter` lo usan 77 declaraciones de 31 archivos como una longitud que vale lo mismo dentro de cualquier caja: relleno de página, `left` y `right` de los flotantes y los márgenes negativos que llegan al borde (`Barra.interior`, `Ficha.acciones`, dos de admin). Un porcentaje no sirve: se mide contra la caja contenedora (dentro de `.pagina`, que ya trae su relleno, o dentro de una celda de rejilla como `.contexto` de la cabecera). Lo único que da una longitud igual a la ventana en cualquier caja es una unidad de ventana. La salida exacta es un contenedor de medida en la raíz (`html { container-type: inline-size }` y `--gutter` con `100cqw`): lo probé en Chrome (`position: fixed` sigue anclado a la ventana y `100cqw` es el ancho sin la barra) y la spec actual (CSS Conditional 5) le pone al contenedor solo contención de estilo y de tamaño en línea, sin contención de layout. Medí la rama con solo ese cambio (dos líneas) contra la rama tal cual, en 30 combinaciones de pantalla y ancho: 0 diferencias de estructura, rectángulos, estilos y apilado (ver «Pruebas puntuales»). No lo hice aquí porque pide Safari 16+ y Firefox 110+ (un iPhone con iOS 15 se quedaría sin gutter) y no lo probé en Safari ni en Firefox: apostar toda la app a eso no cabe en una pieza que no debe cambiar nada a la vista. Propuesta: en P4, donde el armazón es el contenedor y se prueba en el iPhone del founder; `.columna` ya no depende de la ventana.

### 4. Capas: tabla de correspondencia

Los seis `--z-*` salen de la escala que la app ya usaba (10, 20, 30, 40, 50, 60): la mayoría de las capas conserva su número. El orden global era `5 < 9 < 10 < 20 < 21 < 30 < 40 < 50 < 55 < 60 < 70` y queda `9 < 10 < 20 < 21 < 30 < 40 < 50 < 51 < 60 < 61` (el 5 y el 9 se funden en 9: los títulos de día y la tira de letras nunca conviven en una pantalla). Regla de la pieza: dos cosas de la misma banda se separan con `+1` o `−1`, nunca con un número suelto.

**Capas globales** (comparten el apilado de la página):

| Archivo · regla | Antes | Después | Por qué |
|---|---|---|---|
| `globals.css` · `body::before` (franja de la hora) | 30 | `--z-barra` | igual; sigue debajo de las hojas |
| `NavInferior` · `.nav` | 20 | `--z-flotante` | igual |
| `ui/Ficha` · `.accionFija` (barra de acciones al pie) | 20 | `--z-flotante` | igual |
| `Publicar` · `.publicar` | 21 | `--z-flotante` + 1 | sigue encima de la navegación, en su misma banda |
| `ui/Cabecera` · `.volver` | 21 | `--z-flotante` + 1 | ídem |
| `lugares` · `.verOtraVista` | 21 | `--z-flotante` + 1 | ídem |
| `Hecho` · `.hecho` (aviso con Deshacer) | 30 | `--z-barra` | sigue sobre los flotantes y las barras |
| `mando` · `.sonda` | 30 | `--z-barra` | igual |
| `ui/Hoja` · `.fondo` | 40 | `--z-hoja` | igual |
| `Cartel` · `.visor` | 50 | `--z-capa` | igual |
| `HojaDondeEs` · `.capa` | 55 | `--z-capa` + 1 | sobre la hoja y el visor y bajo la lista flotante: es el orden que explicaba su comentario, reescrito con los nombres |
| `HojaDondeLugar` · `.capa` | 55 | `--z-capa` + 1 | ídem |
| `ui/ListaFlotante` · `.flotante` | 60 | `--z-encima` | igual |
| `ui/CampoLargo` · `.capa` | 70 | `--z-encima` + 1 | sigue por encima de la lista flotante |
| `ui/Cabecera` · `.cabecera` | 10 | `--z-pegajoso` | igual |
| `ui/Barra` · `.interior` | 10 | `--z-pegajoso` | igual |
| `artistas/[id]/letrero` · `.barra` | 10 | `--z-pegajoso` | igual |
| `TiraLetras` · `.tira` | 9 | `--z-pegajoso` − 1 | igual (9): bajo la cabecera |
| `AgendaInicio` · `.grupo h2` | 5 | `--z-pegajoso` − 1 | 5 → 9: sigue bajo la cabecera; no hay nada entre 5 y 9 en esa pantalla |
| `ui/FichaLista` · `.lista h2` | 5 | `--z-pegajoso` − 1 | ídem, bajo la barra interior |
| `lugares` · `.avisoMapa`, `.sobreMapa`, `.vacioFecha`, `.ubicacion` | 4, 2, 2, 5 | `--z-pegajoso` − 1 | los cuatro flotan sobre el mapa, bajo la cabecera y bajo la hoja del pin; entre sí se ordenan como están en el marcado, que es el orden de antes (`sobreMapa`, `avisoMapa`, `vacioFecha`, `ubicacion`), así que los que pueden solaparse conservan su relación |

**Capas locales** (dentro de su propio contexto de apilado: una capa fija o una hoja; solo importa el orden entre ellas):

| Archivo · regla | Antes | Después | Por qué |
|---|---|---|---|
| `HojaDondeEs` · `.campo` | 4 | `--z-pegajoso` | el campo, siempre arriba |
| `HojaDondeEs` · `.avisoUbicacion`, `.resumen` | 5 | `--z-flotante` | sobre el mapa, bajo la barra |
| `HojaDondeEs` · `.barraAcciones` | 9 | `--z-barra` | |
| `HojaDondeEs` · `.hojaAgregar` | 10 | `--z-hoja` | su comentario: bajo «Estoy aquí», sobre la barra de acciones (que nunca conviven) |
| `HojaDondeEs` · `.estoyAqui` | 11 | `--z-hoja` + 1 | su comentario: «queda encima de la hoja, no debajo» |
| `HojaDondeLugar` · `.campo`, `.avisoUbicacion`, `.resumen`, `.estoyAqui` | 4, 5, 5, 11 | `--z-pegajoso`, `--z-flotante`, `--z-flotante`, `--z-hoja` + 1 | los mismos bloques que en «¿Dónde es?», con los mismos valores (P9 los unifica) |
| `artistas/HojaCiudad` · `.pegajoso` | 1 | `--z-pegajoso` | dentro de la hoja, sobre lo que se recorre |
| `mando` · `.menu` | 3 | `--z-flotante` | |
| `mando` · `.bannerTurno` | 4 | `--z-flotante` + 1 | sobre el menú, como antes |
| `pared` · `.titulo`, `.qr`, `.puntoDeMando` | 1 | `--z-flotante` | sobre el lienzo |
| `pared` · `.esquina` | 2 | `--z-flotante` + 1 | sobre lo anterior, como antes |
| `SelectorEnlaces.tsx` · fila arrastrada (estilo en línea; no estaba en el inventario) | 2 | `calc(var(--z-pegajoso) - 1)` | sobre las otras filas y bajo la barra pegajosa; es el único `z-index` que había fuera del CSS |

**Quitados** (menos que un token):

| Archivo · regla | Antes | Por qué |
|---|---|---|
| `Mapa` · `.ubicame` (regla completa, 15 declaraciones) | 2 | ningún archivo la usa: OL-211 borró su último consumidor y las dos hojas «Dónde» tienen su propio `.estoyAqui` |
| `ui/ChipFecha` · `.quitar` | 1 | redundante: la ✕ ya es `position: relative` y va la última del chip, así que pinta sobre todo lo que no está posicionado; comprobado con el ratón (ver «Verificación») |
| `artistas/FormularioArtista` · `.quitarChip` | 1 | ídem |

Al final: 41 declaraciones de `z-index` en el CSS y una en el TSX, todas con `var(--z-…)` o `calc(var(--z-…) ± 1)`; fuera de token, 0.

### 5. Aire, radios y otros literales que ya tenían token

Todo lo mecánico lo hizo un script sobre el árbol de PostCSS (no expresiones regulares sobre el texto): solo trozos de valor de nivel superior, nunca dentro de `calc()`, `max()` o `env()`, y el resto del texto queda igual.

- **Aire:** 59 declaraciones de `padding`, `margin` y `gap` con 4, 8, 12, 20 o 32 px pasan a `--espacio-1`, `-2`, `-3`, `-5` y `-7`. Ningún 14 px ni 10 px de aire se normalizó: ninguno da lo mismo a la vista y el encargo dice que en ese caso se deja (quedan anotados abajo).
- **Radios:** cuadro siguiente.
- **Letra y color:** 4 `0.75rem` a `--letra-2xs`; `#fdf3f2` a `--error-suave` (y se quitó su comentario de «no hay token»); `#1a73e8` a `--sistema-azul` en `Mapa` y `MapaDondeEs`; en `Destacados`, `32px` a `--espacio-7` con el comentario puesto al día.
- **Zonas seguras:** los 16 `env(safe-area-inset-bottom, 0px)` sueltos, a `--piso`; las diez sumas `--alto-nav + --piso`, a `--nav-abajo`.

| Radio | Antes | Después | Dónde |
|---|---|---|---|
| Lo que ya usaba `--radio` | 12 | 8 | 96 declaraciones: botones, campos, tarjetas, sugerencias, avisos, carriles |
| Lo que ya usaba `--radio-grande` | 16 | 12 | el QR de la pared |
| La hoja (`ui/Hoja`) | 16 | 24 (`--radio-hoja`) | todas las hojas |
| `HojaDondeEs` · `.hojaAgregar` | 20 | 24 (`--radio-hoja`) | la hoja «Agregar lugar» |
| `10px` sobre fotos de renglón (6) | 10 | 4 (`--radio-chico`) | `Renglon.foto`, su esqueleto, la foto del pin en Lugares, la de admin, la de sugerencias y la de `ui/Tarjeta`; es lo firmado: «fotos de renglón 4» |
| `10px` sobre controles (3) | 10 | 8 (`--radio`) | el `select` de obras colectivas, el botón «Copiar» de compartir y el botón «Publicado» de la ficha |
| `16px` de la píldora de la navegación | 16 | 999 (`--radio-pildora`) | igual a la vista: la píldora mide 32 de alto |
| `999px`, `8px`, `4px` y `12px` escritos a mano (46) | igual | tokens | igual a la vista |
| `10px` del icono en `HojaInstalar` | 10 | 10 | se queda: es la forma del icono de la app, no un radio de la interfaz |
| `20px`, `18px` y `13px` del mando | igual | igual | pantalla propia del mando; se quedan |

## Verificación

Nada se da por hecho sin evidencia: lo que sigue sale de correr los comandos y las mediciones, no de leer el código. Los números son de la última corrida, con el código tal como queda en la rama.

### Comandos

- `npm run lint`: 0 errores; una advertencia que ya estaba (`docs/diseno/logotipo/iconos-sn.mjs`, `'k' is assigned a value but never used`).
- `npm run typecheck`: verde.
- `npm test`: 113 archivos, 1 474 pruebas, verde. Ninguna prueba mira CSS; la pieza no toca lógica (salvo el estilo en línea de una fila arrastrada).
- `npm run build`, sin variables de entorno como en la CI: verde (29 páginas estáticas).

### Inventario de CSS, antes y después

`scripts/ops/auditoria-ui/inventario-css.mjs` (el de la rama `restructura-ui`, que no está en `main`: se corrió una copia de fuera del repo apuntando al `src/` de cada lado). Resumen de su salida:

| Línea de la salida | Antes (`origin/main`) | Después (rama) |
|---|---|---|
| archivos y reglas | 100 y 1 246 | 100 y 1 246 |
| tokens definidos (sin uso) | 50 (0) | 91 (27) |
| literales en px, sin 0, 1 y 2 | 691 | 582 (543 fuera de `globals.css`; antes 670: los tokens nuevos llevan su px allí) |
| colores literales (distintos) | 68 (42) | 70 (45): los tokens nuevos de color llevan su literal en `globals.css` |
| alturas fijas | 137 | 137 |
| `z-index` | 44 | 41 |
| posiciones absolute, fixed y sticky | 74 | 73 |
| bloques duplicados | 35 | 36 |

Con `grep` sobre `src/` además: `z-index` con un valor que no sea `var(--z-…)` o `calc(var(--z-…) ± 1)`, **0** (en el CSS y en el TSX); `100vw`, **una** línea (`--gutter`, en `globals.css`).

### Comparación estática del CSS resuelto

Cada lado se resuelve con SUS tokens (el `:root` de su `globals.css`) y se compara declaración por declaración: 5 268 antes, 5 258 después. Cambian de valor 141 y todas están explicadas: 109 radios, 26 `z-index` (los de la tabla) y seis que no son cambios de vista: las dos líneas de `100vw` ya contadas, el relleno de `NavInferior` (que dejó `--al-centro`) y tres `bottom` que son la misma cuenta escrita con `--nav-abajo` (dentro de un `max()` y en el respaldo de `Hecho`). Desaparecen 17 (`.ubicame`, 15, y las dos `z-index` de las ✕); aparecen 7 (`.columna`, `.a-lo-ancho`, el `right` de `.esquina` y el `container-type` de las acciones).

### Comparación en el navegador

Chrome real de la Mac con `playwright-core`, contra el respaldo local inventado (`scripts/ops/auditoria-ui/respaldo-local`, `ana@example.com`; el `.env.local` solo en carpetas de la sesión, nunca en el repo y nunca producción). Dos compilaciones completas y separadas, una con el código de `origin/main` (antes) y otra con el de esta rama (después), medidas una tras otra: el respaldo tiene eventos «de hoy» que terminan y salen de las listas, así que dos corridas a horas distintas no son comparables. **72 combinaciones de pantalla y tamaño**: Inicio (con y sin sesión), Agenda (con las hojas de ciudad y de fecha), evento (con sesión y sin ella, y con el visor del cartel), lugar, Lugares (lista, mapa y búsqueda en el mapa), Artistas, ficha de artista, Ajustes, perfil, Entrar y las altas de evento (con «¿Dónde es?», su lista flotante, «Agregar lugar» y la descripción), de lugar y de artista (con ciudad y disciplina); a 390×844 (teléfono), 1280×800 (escritorio), 820×1180 (tableta) y 320×568 (teléfono chico, una pantalla). De cada una se volcaron todos los elementos: rectángulo, 37 estilos calculados y, en una rejilla de puntos cada 30 px, la pila completa de elementos en ese punto.

- **Ruido de referencia:** la misma compilación medida dos veces (70 estados) da 0 en todo (elementos, rectángulos, apilado, estilos); solo bailan unos pocos píxeles de imagen.
- **Antes contra después:** 0 elementos que aparecen o desaparecen, **0 rectángulos distintos** (ni un píxel de diseño se movió), tamaños de página idénticos en todos, **0 diferencias de apilado sin explicar**: los 55 puntos con otra pila son esquinas de elementos cuyo radio cambió (el toque cae dentro o fuera de la curva).
- **Estilos calculados que cambian, y solo estos** (858 en total): `border-radius` (12 → 8 en 413 elementos, 10 → 4 en 164, 16 → 999 en la píldora de la navegación, 116, sin cambio a la vista: mide 32 de alto; 16 → 24 en las 8 hojas de `ui/Hoja` (ciudad y fecha de Agenda, ciudad del alta de artista y búsqueda del mapa de Lugares, a dos tamaños cada una); 20 → 24 en las 2 de «Agregar lugar») y `z-index` (155: 5 → 9, 55 → 51, 4 → 10, 11 → 41, 2 → 9, 1 → 10, 1 → auto, 10 → 40, 70 → 61, 9 → 30; la tabla de arriba).
- **Píxeles:** la diferencia por captura va de 0 a 0,7 % y, vista como imagen, son esquinas (ver las capturas de diferencias).

### Pruebas puntuales

- **`.columna` y `.a-lo-ancho`** (sin uso todavía, así que no cambian ninguna pantalla), en una página real de la compilación de la rama: a 320, 390, 600, 640, 820, 1280 y 1920 px el contenido de `.columna` empieza y mide lo mismo que el de una caja con `padding: 0 var(--gutter)` (a 390: desde 20, 350 de ancho; a 1280: desde 340, 600 de ancho) y `.a-lo-ancho` mide la ventana entera. Con una barra de desplazamiento clásica de 15 px (escritorio con ratón; en el teléfono y en un Mac con barra flotante no existe): a 390 igual; a 1280 el gutter deja la columna en 585 de ancho y `.columna` en 600, centrada en el ancho real (desde 332,5). Esa es la razón de H-38 y la mejora que se busca.
- **Navegación inferior sin `100vw`**, con la barra clásica de 15 px a 1280: antes sus cuatro destinos ocupaban 340–925 (585 de ancho); ahora 332,5–932,5 (600, centrados en el ancho real de la ventana, 1265). Sin barra, y a 390, quedan **idénticos** al píxel (340–940 y 8–382). Con barra clásica el contenido, que sigue con `--gutter`, empieza en 340: la navegación asoma 7,5 px por lado hasta que P4 y P5 pasen las plantillas a `.columna`. No se ve en el iPhone ni en un Mac con barra flotante, que son los dispositivos de prueba.
- **Etiquetas de las acciones repartidas** (`Ficha`), con cuatro títulos largos, a 12 anchos de ventana (320, 340, 360, 375, 390, 414, 500, 600, 640, 700, 820 y 1280): mismas etiquetas (58, 63, 68, 71, 75, 75,5 y 80 px) y mismas cajas, antes y después; 0 desborde. En las fichas de prueba las etiquetas son cortas y no llegan al tope, por eso esta prueba usa títulos largos.
- **Sonda y letreros de la pared:** la ruta pide una obra y sockets, así que se armó su marcado con el CSS de cada lado y se midió a 320, 390, 700, 800, 1280 y 1920 px con un texto de sonda realista: sonda y letrero, mismos rectángulos.
- **✕ de los chips sin su `z-index`:** con el ratón, pulsando el centro de la ✕ (la prueba de acierto del propio navegador): en el chip de fecha (`.quitar`) y en el chip de disciplina (`.quitarChip`), a 390 y a 1280, el toque cae en la ✕ y quita el chip; antes y después.
- **Fila arrastrada de «Redes y contacto»:** con un arrastre real, la fila lleva `z-index: 2` antes y `calc(var(--z-pegajoso) - 1)` (9) después; en los dos casos queda encima de la fila vecina y la barra pegajosa (10) sigue encima de ella.
- **La alternativa del `--gutter` sin `100vw`** (la que se propone para P4): la rama con una sola diferencia, `html { container-type: inline-size }` y `100cqw` en `--gutter`, contra la rama tal cual, en 30 combinaciones (Inicio, Agenda, evento, alta de evento, Lugares, Ajustes, lugar y alta de lugar, a 320, 390, 820 y 1280 px, con y sin desplazamiento): **0** cambios de estructura, rectángulos, estilos y apilado, y `position: fixed` sigue anclado a la ventana. Es solo Chrome: Safari y Firefox no se probaron, por eso no entra aquí.

### Capturas

En `docs/rediseno/capturas-257/`, PNG de paleta (2,0 MB las 28). «Antes» es `origin/main`; «después», esta rama; «diferencias», cada píxel distinto en rojo sobre blanco. El teléfono es 390×844 (el PNG mide el doble, 780×1688) y el escritorio 1280×800. Cada una se abrió y se miró:

| Archivo `257-…` | Qué se ve | Qué cambió |
|---|---|---|
| `01-inicio-movil-antes` | Inicio con sesión: logotipo, campana y avatar «A», la ciudad y la búsqueda; carril «Tus planes» con dos tarjetas (la charla de la Cristiada y LXS COLOCAOS) con su palomita verde, «Recién agregado» y «1 va»/«2 van»; carril «Seleccionados para ti» con dos tarjetas altas; «Publicar evento» flotante y la navegación con Inicio activo | punto de partida |
| `02-inicio-movil-despues` | La misma pantalla con la rama | nada a simple vista: las fotos de las tarjetas tienen las esquinas más cerradas (12 → 8) |
| `03-inicio-movil-diferencias` | Solo lo que cambió | las cuatro esquinas de cada una de las cuatro fotos, unos puntos sueltos de ruido de imagen y un anillo tenue en el botón de búsqueda, que también sale al medir dos veces la misma versión. Nada más se movió |
| `04-inicio-escritorio-antes` | Inicio a 1280: la columna de 600 px centrada con los dos carriles; «Publicar evento» en el borde derecho de la columna; la navegación a todo el ancho con sus cuatro destinos dentro de la columna | punto de partida |
| `05-inicio-escritorio-despues` | Lo mismo con la rama | igual a la vista; solo las esquinas de las fotos |
| `06-lugares-lista-movil-antes` | Lugares, lista: filtros (fecha, ciudad, búsqueda) y pestañas «Todos 9 · Cercanos · Casa de cultura · Museo»; carril «Con eventos esta semana»; «9 lugares», letra A con ACHE Galería (foto, dirección, próximo evento y «+») y Aether (sin foto: el símbolo SN); «Ver en mapa» y «Registrar lugar» flotantes sobre la lista, con la navegación debajo | punto de partida |
| `07-lugares-lista-movil-despues` | Lo mismo con la rama | nada a simple vista: fotos del carril con 8 en vez de 12 y fotos de renglón con 4 en vez de 10 |
| `08-lugares-lista-movil-diferencias` | Solo lo que cambió | las esquinas de las dos fotos del carril y de las tres fotos de renglón visibles; los botones flotantes y la navegación, sin marcas |
| `09-lugares-lista-escritorio-antes` | Lugares a 1280: la misma lista en la columna de 600 px, los flotantes al borde derecho de la columna | punto de partida |
| `10-lugares-lista-escritorio-despues` | Lo mismo con la rama | igual a la vista; las fotos de renglón se ven con la esquina más cerrada |
| `11-lugares-mapa-movil-antes` | Lugares, vista de mapa: en este entorno el mapa no carga (no hay token de Mapbox), así que se ve su aviso sobre el fondo claro; lo que importa son las capas de encima: «Ver en lista», «Registrar lugar», el botón de ubicación abajo a la izquierda y la navegación | punto de partida |
| `12-lugares-mapa-movil-despues` | Lo mismo con la rama | igual: 21 píxeles distintos en toda la pantalla. Las capas conservan su orden |
| `13-evento-movil-antes` | Ficha de un evento: «Atrás», el logotipo y los tres puntos; el cartel con su lupa; título, fecha, lugar con su dirección, «Van 2 personas» con «ver» y «Gratis»; las tres acciones repartidas (Compartir, A mi calendario, Cómo llegar); la descripción; y la barra fija al pie con «Voy · Ya estás en la lista» y «Cancelar» | punto de partida |
| `14-evento-movil-despues` | Lo mismo con la rama | nada a simple vista: esquinas más cerradas en el cartel y en los dos botones de la barra |
| `15-evento-movil-diferencias` | Solo lo que cambió | las cuatro esquinas del cartel y las de «Voy» y «Cancelar»; el resto de la pantalla, en blanco: las tres etiquetas de las acciones no se movieron |
| `16-evento-escritorio-antes` | El mismo evento a 1280: el cartel recortado a la columna de 600 px, los datos, las tres acciones repartidas a lo ancho de la columna y la barra al pie a todo el ancho con sus botones dentro de la columna | punto de partida |
| `17-evento-escritorio-despues` | Lo mismo con la rama | igual a la vista; solo las esquinas |
| `18-ajustes-movil-antes` | Ajustes: «Tu ficha» (Editar, Perfil), «Avisos» (Por correo, activado; En el teléfono, apagado), «Cuenta» (Entras con un correo de ejemplo, Personas bloqueadas, Cerrar sesión) y el comienzo de «Somos nosotros» | punto de partida |
| `19-ajustes-movil-despues` | Lo mismo con la rama | nada a simple vista: los grupos tienen las esquinas más cerradas (12 → 8) |
| `20-ajustes-movil-diferencias` | Solo lo que cambió | las esquinas de los cuatro grupos (los tres primeros con las cuatro; el de «Somos nosotros», solo con las de arriba, porque el resto queda fuera de la pantalla); los interruptores y el texto, sin marcas |
| `21-ajustes-escritorio-antes` | Ajustes a 1280: los mismos grupos en la columna de 600 px; «En esta computadora» con el aviso de que falta la llave de avisos del respaldo | punto de partida |
| `22-ajustes-escritorio-despues` | Lo mismo con la rama | igual a la vista; solo las esquinas de los grupos |
| `23-hoja-de-fecha-movil-antes` | Agenda con la hoja «Selecciona una fecha» abierta: septiembre de 2026 con el 28 marcado, el 29 y el 30 activos y el resto atenuado, «Listo» al pie, y detrás, bajo el velo, la lista con «Mañana» y su primer evento | punto de partida |
| `24-hoja-de-fecha-movil-despues` | Lo mismo con la rama | las dos esquinas de arriba de la hoja son más redondas (16 → 24) y el botón «Listo» tiene la esquina más cerrada (12 → 8); la hoja sigue encima del velo, y el velo, encima de la lista |
| `25-donde-es-con-lista-movil-antes` | «¿Dónde es?» a pantalla completa, con «Teatro» escrito: la lista flotante encima del mapa con «Teatro de la Paz» y el aviso de que no pudo buscar (el respaldo no tiene buscador), el botón de ubicación y, al pie, «Agregar «Teatro» como lugar» | punto de partida |
| `26-donde-es-con-lista-movil-despues` | Lo mismo con la rama | el orden de capas es el de antes (la lista, sobre la pantalla completa); solo cambian las esquinas del campo, de la lista y del botón (12 → 8) |
| `27-agregar-lugar-movil-antes` | La hoja «Agregar lugar» sobre el mapa: «Nombre» con el foco, «Dirección», «Es un lugar privado» con su interruptor, el botón «Guardar y usar este lugar» apagado y la nota de qué falta; el botón de ubicación asoma sobre la hoja | punto de partida |
| `28-agregar-lugar-movil-despues` | Lo mismo con la rama | la hoja pasa de 20 a 24 en las esquinas de arriba; campos, caja de «privado» y botón, de 12 a 8; el botón de ubicación sigue encima de la hoja |

## Anotado para las piezas que siguen

- **Tokens sin uso hoy y quién los estrena** (según el plan del doc 50): `--control`, `--boton-icono` y `--boton-icono-grande` (P2: los once círculos y los controles de barra de 40 px: `Cabecera.redondo`, `Cerrar`, `ChipFecha.soloIcono`, `Chip.deContexto`, `Atras`, `Sesion.entrar`); `--fuente-lista`, `--ancho-lista-titulo`, `--ancho-lista-meta`, `--letra-lista-titulo`, `--letra-tarjeta-titulo`, `--letra-lista-meta`, `--peso-lista-titulo`, `--interlinea-lista` y `--foto-renglon` (P3: `Renglon.foto` y su esqueleto miden hoy 64, no 56); `--tarjeta-*` (P3 y P10: `Esqueleto.module.css` y `Destacados.module.css` repiten 220, 132, 165, 248 y 104); `--alto-filtros`, `--ancho-carril-nav`, `--duracion`, `--duracion-ficha` y `--curva` (P4 y P7); `--panel` y `--columna-ancha` (P5 y P7); `--velo-titulo` y `--ok-suave` (P6: héroe y pastillas de «decidido»); `--espacio-8`.
- **Aire que no se normalizó** (moverlo cambia la vista; lo hace la pieza que rehaga cada componente): 29 `padding: 14px`, 23 `padding: 10px`, 17 `gap: 6px`, 15 `padding: 6px`, 7 `column-gap: 10px` y 6 `margin-top: 6px`, según el inventario. Los tamaños de control (`44px`, `48px`, `40px` en anchos y altos) tampoco se tocaron: darles `--control` o `--toque` es decidir cuáles son controles, y eso es P2.
- **Colores fuera de token que se dejaron**: las sombras del mando con el azul petróleo retirado en septiembre (`rgba(15, 107, 124, …)`, `mando.module.css` líneas 227, 242 y 409) y el `#0a84ff` de `HojaInstalar`; cambiarlos cambia la vista (P12).
- **Esqueletos**: `Esqueleto` y `CarrilEsqueleto` dibujan sus líneas con `--radio`; el prototipo las dibuja con `--radio-chico` (P3, cuando el esqueleto se derive del renglón).
- **Bloques duplicados: 35 → 36.** `BuscadorUnificado .mini` y `FormularioCanon .miniaturaCartel` (dos miniaturas de 44 px) quedaron con el mismo radio y ahora son idénticas; las recoge P12.
- **Navegación y barra de desplazamiento clásica:** mientras las páginas sigan con `--gutter`, en un escritorio con barra clásica la navegación mide 600 y el contenido 585 (medido en «Pruebas puntuales»); desaparece cuando P4 y P5 pasen las plantillas a `.columna`. En el teléfono y en un Mac con barra flotante no existe.
- **Doc 50 (`docs/rediseno/50-restructura-ui.md`, rama `restructura-ui`):** no existe en `main`, así que esta rama no lo toca. El parche mínimo de § 5.1 es la fila de radios (hoy dice `--radio-chico 8`, `--radio 12`, `--radio-grande 16` y `--radio-redondo 50%`), que pasa a:

  ```
  | Radios | `--radio-chico 4`, `--radio 8`, `--radio-grande 12`, `--radio-hoja 24`, `--radio-pildora 999px` (el círculo sigue siendo `50%`, sin token) | 35 `999px`, 10 `10px` (fotos de renglón al chico; botones y campos al normal), 7 `8px` literales |
  ```

## Archivos

60 archivos: 58 hojas de estilo, un TSX y un documento de diseño; la lista completa con sus cifras, en `git diff --stat origin/main`.

- **A mano:** `src/app/globals.css`. Capas, zonas seguras y `100vw`: `NavInferior`, `Publicar`, `Hecho`, `Cartel`, `ui/Hoja`, `ui/Cabecera`, `ui/Barra`, `ui/CampoLargo`, `ui/ListaFlotante`, `ui/Ficha`, `ui/FichaLista`, `ui/ChipFecha`, `TiraLetras`, `AgendaInicio`, `Mapa` (sin `.ubicame`), `app/eventos/HojaDondeEs`, `app/lugares/HojaDondeLugar`, `app/lugares/lugares`, `app/artistas/HojaCiudad`, `app/artistas/FormularioArtista`, `app/artistas/[id]/letrero`, `app/obra/[id]/mando` y `app/obra/[id]/pared`. Radios de 10 px: `Renglon`, `ui/Esqueleto`, `ui/Sugerencia`, `ui/Tarjeta`, `ui/CompartirFicha`, `app/admin/admin` y `app/admin/obras-colectivas/obras`. Comentarios al día: `Destacados` y `ui/FormularioCanon`. TSX: `components/SelectorEnlaces.tsx` (una línea). Documento: `docs/diseno/LINEA_GRAFICA.md` (deja de nombrar `--al-centro` y presenta `.columna` y `.a-lo-ancho`).
- **Con el script** (solo aire, radios exactos, `0.75rem` y dos colores): los demás `.module.css` del cambio.
- **Nuevos:** esta bitácora y `docs/rediseno/capturas-257/`.
- **Al cerrar:** `docs/ops/OPEN_LOOPS.md` (la línea de OL-229 al principio de «Ahora» y el trozo de «Last updated»).
- **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**` y `docs/ops/ASIGNACIONES.md` (solo lo emite el gestor). Sin migraciones ni variables de entorno.
