# 269 · P10 Chips y sellos unificados, carril con subgrid y tarjeta sin foto (OL-241)

**Fecha:** 2026-09-30 · **Rama:** `ui-chips`, desde `origin/ui-hoja-filtros` (`02dc4c06`) · **OL:** OL-241 · **PR:** #PR (sin unir; va montado sobre #278, `ui-hoja-filtros`, que va sobre #277, #276, #275, #274, #273, #272, #271, #270, #269 y #268) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Pieza P10 del plan de OL-227 (doc 50, § 7; H-02, H-03 y H-19).

## Pedido

Encargo del Gestor de cambios III, con el criterio de siempre («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código») y las decisiones del founder: **1.** un solo sello por foto (el más útil para decidir: «Hoy» antes que «N van», y «Recién agregado» deja de ser sello); **2.** la tarjeta sin foto es compacta (sin bloque de imagen, fondo suave, nombre grande) y «destacado» exige foto; **3.** el «+» sin círculo sobre el fondo hueso (icono de 44, círculo solo sobre fotos); **4.** el carril con `subgrid` en sus tres tamaños sobre los tokens `--tarjeta-*`, con las grandes a 190×285 desde 1048; **5.** un solo `Chip` con variantes y estados, de 36 a la vista y 44 al tacto. Nada cambia de sitio ni de comportamiento en la fila de contexto ni en las hojas: solo la pieza que las pinta.

## Lo que había

- **Seis formas de chip** (`Chip`, `ChipEnlace`, `ChipNativo`, `ChipContexto`, `ChipQuitar` y `ChipCiudad`, que pintaba con las clases del módulo) y tres pantallas que usaban esas clases a mano (`SelectorCuando`, `FormularioArtista` con su chip elegido y su ✕ con un `margin: 0 -8px 0 2px`, y la ciudad). Todos de 44 de alto.
- **Tres rótulos apilados sobre el cartel** (`.van`, `.reciente`, `.interesa`): con el botón, hasta **3 capas** sobre una foto (medido). «Recién agregado» salía en todas las tarjetas de «Nuevos eventos», que ya se llama así.
- **Quince números de tamaño de tarjeta escritos a mano** fuera de `:root` (220, 132, 165, 248 y 104 en `Destacados.module.css` y en `ui/Esqueleto.module.css`, y las alturas `--alto-mediana/grande/chica` de 246, 360 y 230 para el colapso), más cuatro desplazamientos de `9px` y un `264px`. Las grandes seguían en 165×248 a 1 280.
- **El «+» de las redondas a −9 px de su caja**: 5 desbordes en Inicio. Los datos de una tarjeta, en una sola línea («mañana · 19:30 · Casa de Cultura del B…») y, con dirección postal, el lugar cortado.
- **Lugares y artistas sin foto en los carriles** (1 de 5 lugares y 1 de 3 artistas en el respaldo): un círculo y una tarjeta grises con el símbolo SN.
- **En la lista, el «+» en un círculo blanco de 48 con sombra** sobre el fondo hueso: el mismo peso que la foto.
- **Un error viejo:** «Te interesa» en el renglón llevaba semanas sin su píldora (se veía como texto gris con una estrella): `.frente > small > .estado` pide un hijo directo de `small` y desde P3 el chip vive dentro de un `span`.

## Lo que se hizo

### 1. Un solo chip (`ui/Chip`)
- **`Chip` con cinco variantes:** `filtro` (una opción; activa = elegida, en el color de acción), `contexto` (ciudad, Cuándo con su valor, Filtros con su cuenta: abre su hoja; `icono`, `fin` para la flecha de la ciudad y `cuenta` en su círculo), `quitar` (siempre activo, con su ✕; el texto es lo que se quita y da su nombre accesible), `estado` (lo que la persona ya decidió: «Te interesa», «Solo tú lo ves») y `sello` (un dato sobre una foto, en vidrio). Con `href` es un enlace (reemplaza la entrada del historial y se pone en camino), con `onClick`, un botón; `estado` y `sello` son `span`. Sin `activo` no es un conmutador (sin `aria-pressed`). Estados: reposo, activo, en camino (`:has(> .enCamino)`, el de `Boton`) y deshabilitado.
- **36 a la vista y 44 al tacto** (`--alto-chip`, token nuevo): el `::before` sale de la caja hasta `--toque-min`, contando el borde de 1 px; la fila que los lleva (`.chips` de `ui/Chip`, `Cabecera`) les deja los 4 px. `Chips` (fila) y `Cuenta` se quedan; `Chips` pierde su `etiqueta` sin uso y `Chip` su `ariaLabel`.
- **Migrados:** `Ciudad`, `FilaEventos`, `FilaLugares`, `ListaArtistas`, `BuscarPantalla`, las dos listas del admin, `SelectorCuando`, `FormularioArtista` (su chip elegido es un `quitar`) y, con el chip de estado, `RenglonEvento` y `RenglonLugar`. Perfil no lleva chips: sus tres «pestañas» son `Kpi`. `ChipNativo` (admin) queda con la misma base.

### 2. La tarjeta del carril (`Destacados`)
- **`subgrid` en tres tamaños:** el carril es una rejilla de tres filas (foto, título, datos) sobre `--tarjeta-mediana/grande/chica` y sus fotos; cada tarjeta comparte las filas (`li` y `a` con `subgrid`), así los datos de todas quedan a la misma altura aunque un título ocupe dos líneas. Un solo `@media (min-width: 1048px)` en `:root` lleva `--tarjeta-grande` a 190 y `--tarjeta-grande-foto` a 285. Las tres banderas (`grande`, `redondas`, `detalleCompleto`) son una prop `tamano`; `sola` (una tarjeta a lo ancho, foto en 5:3) sale sola del número de tarjetas y su tope de 264 es el token `--tarjeta-sola-foto`.
- **Un sello por foto** (`selloDeTarjeta`, pura): «Te interesa» (lo de la persona) > «Hoy» > «N van» > nada. «Recién agregado» ya no existe (`reciente`, `esRecienAgregado` y `DIAS_RECIEN_AGREGADO` fuera). `Tarjeta` trae `hoy` y `sitio`; los rótulos van sin icono, como el prototipo.
- **Los datos en dos líneas** (punto 57): fecha y hora, y el lugar sin su dirección postal (`sitioEnLista`, H-09), cada una con su elipsis; en las redondas la fecha se parte en dos en vez de cortarse. El título, a `--letra-tarjeta-titulo`, dos líneas.
- **Sin foto, compacta** (H-03): sin `<img>`; el fondo suave de lo que no tiene foto (`--fondo-miniatura`, de un pseudoelemento) cubre el sitio de la foto y del título con el nombre a 19 px (tres líneas), el rótulo abajo a la izquierda y el botón arriba a la derecha; los datos, debajo. Nunca el símbolo SN. **«Destacado exige foto»** se aplica al armar los carriles: `tarjetasDeSemana` (lugares) y `cargarArtistasDestacados` (`.not("foto", "is", null)`).
- **El botón dentro de su caja en las redondas** (`top: 0; right: 0`, como el prototipo): 5 desbordes → 0; el `padding-top` de 13 px para el desborde, fuera.
- **El esqueleto es el carril:** `CarrilEsqueleto` usa el CSS de `Destacados` (rejilla, tokens, letra) con barras que respiran y líneas con un espacio duro, así mide lo que el carril; `EsqueletoTarjeta` y sus medidas se fueron de `ui/Esqueleto`. Un carril vacío se recoge con su esqueleto dentro (`grid-template-rows: 1fr → 0fr`, `@starting-style`) en vez de con tres alturas copiadas.

### 3. El botón de acción (H-19)
`BotonRenglon` recibe `sobreFoto`: en la tarjeta es el `BotonIcono` elevado de 48; en la lista, sobre el fondo hueso, es el `plano` de P2 a 44, en el color de acción (una regla de una línea en `Renglon.module.css`, porque el `plano` es negro, el de las barras); decidido, solo el círculo verde, sin sombra.

### 4. Lo que se retiró
`ChipContexto`, `ChipQuitar`, `ChipEnlace`; `Chips.etiqueta` y `.etiquetaChips`, `Chip.ariaLabel`, `.deContexto`, `.chipNativo`; en `Destacados`: `.van`, `.reciente`, `.interesa`, `.chips`, `.uno`, `.redondas`, `.detalleCompleto`, `--alto-*`; en `Renglon`: `.estado` y `.sello`; `EsqueletoTarjeta`; `ui/Tarjeta.tsx` y su CSS (sin uso); `chipElegido` y `quitarChip` de la alta de artista (con su margen negativo); `esRecienAgregado`, `DIAS_RECIEN_AGREGADO`, `Tarjeta.reciente`. Comprobado con `grep`: ninguna referencia queda en `src`; la línea de `docs/PRINCIPIOS_UX.md` que nombraba `EsqueletoTarjeta` se corrigió.

### 5. Errores que salieron al probar
- **El toque del chip salía de 42, no de 44:** el `::before` se mide desde el borde de dentro y el chip lleva 1 px de borde; lo mostró la prueba de toque real (`elementFromPoint` a 3 px de la caja). Ahora cuenta el borde.
- **Un relleno o un borde en la tarjeta sin foto separaba las dos líneas de datos de todas las demás** (el `subgrid` suma el relleno de la tarjeta a las filas del carril): el fondo pasó a un pseudoelemento, el aire al relleno del nombre y `small` a `align-content: start`.
- **El carril vacío no llegaba a 0:** el `padding-top` de 32 del esqueleto es un piso que `0fr` no baja; el esqueleto va dentro de un `div` sin relleno y con `overflow: hidden`.
- **El chip de ciudad de Buscar no tenía sus 4 px de abajo** (los cubría el título del grupo): `padding-bottom` de 4 en su contenedor.
- **Una captura del recorte de una tarjeta de un carril deslizado salía con la foto a medio pintar:** se espera a que esté decodificada.

## Decidí yo (para que el gestor confirme)

1. **«Te interesa» ocupa el sello de la foto y va primero** (antes que «Hoy» y «N van»): es lo que la persona ya decidió y en «Tus planes» distingue una tarjeta de «me interesa» de una sin marcar; así sigue habiendo un solo rótulo por foto. Vetable: sin él, esa tarjeta se ve igual que una sin marcar.
2. **`enlace` no es una variante aparte:** los atajos de Buscar son un `filtro` con `href` y sin `activo` (mismo aspecto, misma marca de camino); dos clases idénticas sobraban.
3. **El botón de la lista es el icono a secas en el color de acción (violeta)**, no negro: un glifo negro se leía como «ya está». Es una regla en `Renglon.module.css` sobre el `plano` de P2 (que sigue igual); decidido, el círculo verde de 44.
4. **La fila de contexto mide 52** (chips de 36 con los 4 px de arriba y 12 de abajo que ya tenía), no 60: el prototipo firmado lleva 48, pero recorta por arriba el toque de 44 de sus chips; con 4 px arriba cabe entero. `--alto-cabecera` de `:root` (valor de partida) pasa de 104 a 96. `--alto-filtros` (48) sigue sin uso: P12.
5. **Los rótulos no llevan icono** (como en el prototipo): salen la estrella, las dos personas y el calendario con «+».
6. **«Destacado exige foto» solo para lugares y artistas** (lectura literal de la decisión): un evento sin cartel ni portada de su lugar entra al carril y sale compacto, incluido el carril «Destacados» de eventos. Y no rellena: «Artistas destacados» puede quedar con menos de 12 o vacío (se colapsa).
7. **El sitio de la tarjeta va sin la dirección postal**, como en las listas (H-09); Buscar lo dice igual (`metaDe`): «hoy · 18:00 · Templo de San Francisco» en vez de «… · Calle Jardín Guerrero 7, 78000…». Es el único cambio a la vista en Buscar además de los chips.
8. **El chip elegido de la alta de artista es un `quitar`:** ahora quita todo el chip, no solo su ✕, y sale un margen negativo y dos clases; su nombre accesible pasa de «Quitar la disciplina elegida» a «Quitar Música».
9. **El carril vacío guarda su esqueleto dentro** (un `div` con tres tarjetas grises, `aria-hidden`, alto 0) en vez de quedar vacío; a cambio, las tres alturas copiadas se fueron. Vetable: quitar el colapso animado y devolver `null`.
10. **Tokens nuevos:** `--alto-chip` (36) y `--tarjeta-sola-foto` (264). `className` en `Chip` (para que la tarjeta lo coloque sobre la foto): la única prop añadida más allá de las variantes.
11. **La tarjeta compacta mide lo mismo que sus vecinas** (foto + título + datos): es «compacta» por no llevar imagen, no por ser más baja; una más baja rompería las filas compartidas del carril.

## Lo que cambia a la vista

- **Chips de 36 en vez de 44** en la fila, las hojas, Buscar, los formularios y el admin; la fila mide 52 y la hoja de Lugares llena se detiene 8 px más arriba (bajo la fila, medida en vivo: 116 → 108).
- **Cada cartel lleva un solo rótulo** («1 va», «Hoy», «Te interesa»), sin «Recién agregado» y sin iconos, más el botón; los datos, en dos líneas y con el lugar entero.
- **Las tarjetas sin foto** ya no son un bloque gris con el símbolo SN: un fondo suave con el nombre grande. **Lugares y artistas sin foto** ya no entran a sus carriles (23 tarjetas → 21 en Inicio).
- **Las redondas** llevan el botón en la esquina de su caja, sin salirse. **Las grandes** miden 190×285 desde 1048.
- **En las listas el «+» es el icono violeta a secas** y el «✓» decidido, un círculo verde de 44 sin sombra; sobre fotos, igual que antes.
- **«Te interesa» en el renglón** vuelve a ser una píldora violeta suave.
- **Los chips de los formularios** (Qué hace, Tipo, Cuánto cuesta) también son de 36 y con menos aire a los lados: los ocho de «Qué hace» pasan de tres renglones a dos.
- **Lo que no cambia:** Ajustes, las tres altas y la ficha de evento (0,000 % de píxeles distintos), y las fichas de lugar y de artista salvo el botón de sus renglones (0,7 % y 0,6 %).

## Verificación

- `npm run lint`: 0 errores (la advertencia de siempre, en `docs/diseno/logotipo/iconos-sn.mjs`). `npm run typecheck`: verde. `npm test`: 119 archivos, **1 602** pruebas (1 594 antes; +8: `selloDeTarjeta` 4, `esSinFoto`, `hoy` y `sitio`, la foto que exige el carril y la meta de Buscar; menos la de «reciente»). `next build` verde con las variables del respaldo local y **sin variables**, como la CI.
- **Pruebas de componente en Chrome:** `Chip` 11 (nueva), `Destacados` 16 (reescrita: un rótulo, dos capas, compacta, dos líneas, subgrid, tokens a 390 y 1 280, redondas dentro, sola, vacío), `Renglon` 9 (una nueva: el icono a secas), `FilaEventos` 7, `Armazon` 17, `HojaLugares` 9, `BotonIcono` 8, `Kpi` 4, `Hoja` 4, `Seguir` 4 y `cargador` 3 pasan. `cupo` (13), `guardado` (2) y `nuevos` (6) fallan igual que en la base (21).
- **Comprobado que las pruebas fallan** sin lo que cuidan (19 cambios, uno por vez, sobre la fuente): el orden de los sellos, lo tuyo primero, un segundo rótulo, la imagen en la sin foto, los datos sin elipsis, la tarjeta sin `subgrid`, el número copiado, el botón fuera de la caja, la sola sin ancho, el carril vacío sin recoger, el botón de tarjeta sin círculo, el de la lista con círculo o sin color, el chip de 44, sin `::before`, el estado como botón, el quitar sin ✕, el contexto sin hoja y el enlace sin marca de camino. Ninguno sobrevivió.
- **Medidas** (`medir.js` vía `auditar.mjs`, Inicio, Agenda, Artistas, Lugares y Buscar, 390×844 y 1 280×800, antes → después): desbordes del «+» en las redondas **5 → 0** por dispositivo (quedan los 2 de Mapbox de Lugares); márgenes negativos **0 → 0**; Inicio 257 → 238 nodos, profundidad 7 → 6, envoltorios sin estilo 6 → 0; Agenda 233 → 232 nodos y profundidad 8 → 7; el resto igual. **Toques de menos de 44:** `medir.js` mide la caja y cuenta los chips de 36 (0 → 3 en Inicio y Agenda, 1 en Artistas, 4 en Buscar y 2 en Lugares, más el logotipo de Mapbox de siempre); con la prueba de toque real (`elementFromPoint` a 3 px arriba y abajo de la caja) en 15 estados —Inicio, Agenda con y sin filtros (la fila deslizada al final), Artistas, Lugares, Buscar, las hojas Cuándo y Filtros de Agenda y la de Lugares, Perfil y las tres altas— **los 35 chips a la vista tienen 44**, y otros 19 en las tres altas con sus filas abiertas (3, 8 y 8): ninguno se queda sin ellos (fuera del logotipo de Mapbox y del campo de archivo escondido de 1×1 de la alta de artista, que ya estaban).
- **Capas sobre cada cartel** (botón + rótulos que tocan la foto, 23 → 21 tarjetas): máximo **3 → 2**; con «Te interesa» y «Hoy» y «3 van» a la vez, una.
- **Números de tamaño de tarjeta escritos a mano fuera de `:root`:** **15 → 0** (más los cuatro `9px` y el `264px`, que ya son tokens o se fueron).
- **Píxel a píxel** (390×844 a 2×, página entera, antes → después; el ruido del mismo código entre dos corridas es de 0,00 a 0,04 %): Ajustes **0,000 %**, alta de evento, de lugar y de artista **0,000 %**, ficha de evento **0,000 %** (con y sin «Voy»), ficha de lugar **0,706 %** (filas 1 096 a 1 465) y de artista **0,605 %** (1 079 a 1 219): solo el botón de sus renglones.
- **La hoja de Lugares llena** sigue deteniéndose bajo la fila, mida lo que mida: fila de 60 → 52, cuerpo en 116 → 108, `data-techo-hoja` en 116 → 108.
- **Safari real** (simulador iPhone SE, iOS 26.3, la app compilada, con sesión): `subgrid` alinea los datos, el sello es uno, el botón de las redondas queda en su caja, la tarjeta sin foto sale compacta y los renglones llevan el icono a secas (capturas 21 a 24). No probé una pantalla que no fuera Chrome o el simulador: el iPhone del founder y un servidor real más lento quedan sin ver.

## Capturas

`docs/rediseno/capturas-269/` (48 PNG de paleta, 4,6 MB; teléfono a 390×844 a 2× y recortes de tarjeta, escritorio a 1 280×800, Safari del simulador a 750×1 334). «Antes» es la compilación de `origin/ui-hoja-filtros`, «después» esta rama; ambas con el respaldo local inventado (`ana@example.com`; con fotos en tres artistas, `me_interesa` en el evento de Leonora y el evento de Macario sin cartel, para ver las tres cosas). Cada una abierta y descrita.

1. **`01` Tus planes:** antes, la fila de chips de 44 y las tarjetas con dos rótulos apilados («Recién agregado» y «1 va» o «2 van») y el botón verde, con los datos en una línea cortada; después, chips de 36 y un solo rótulo, con fecha y lugar en dos líneas.
2. **`02` Destacados (grande):** antes, «Recién agregado» + «1 va» sobre la primera y «Recién agregado» sobre el concierto; después, «1 va» y «Hoy», los títulos a dos líneas y los datos alineados entre tarjetas.
3. **`03` Lugares con eventos (chica):** antes, los círculos con el botón 9 px fuera de la caja; después, el botón en la esquina de su tarjeta, y la fecha en dos líneas.
4. **`04` Artistas destacados:** antes, tres tarjetas y la tercera (Feleal) gris con el símbolo SN; después, solo las dos con foto.
5. **`05` Tarjeta con «Hoy»:** antes, «Recién agregado» con su icono y el botón, datos cortados en una línea; después, «Hoy» en vidrio y el botón, datos en dos líneas.
6. **`06` Tarjeta con «N van»:** antes, «Recién agregado» y «2 van» apilados y el botón verde; después, solo «2 van».
7. **`07` Tarjeta con «Te interesa»:** antes, «Te interesa» (con estrella) y «Recién agregado» apilados; después, solo «Te interesa», violeta suave y sin icono.
8. **`08` Tarjeta sin foto:** antes, el bloque gris con el símbolo SN grande; después, el fondo suave con «Macario, Xantolo camino al Mictlán» en dos líneas arriba, «Hoy» abajo a la izquierda, el botón arriba a la derecha y los datos debajo.
9. **`09` Agenda:** antes, el botón de cada renglón en un círculo blanco de 48 con sombra; después, el «✓» violeta a secas y, en el decidido, el círculo verde de 44.
10. **`10` Renglón con «Te interesa»:** antes, «☆ Te interesa» en texto gris sin píldora; después, la píldora violeta suave y el botón a secas.
11. **`11` Fila con Cuándo con valor:** antes, «30 sep – 7 oct» violeta en chips de 44; después, lo mismo a 36 (la fila de 52).
12. **`12` Fila con filtros activos:** la fila deslizada al final, «Filtros 2», «Gratis ✕» y «Solo lo que sigo ✕»; antes a 44, después a 36 con la ✕ pegada al texto.
13. **`13` Hoja Filtros:** «Gratis» y «Cooperación» y «Solo lo que sigo»; antes chips de 44, después de 36.
14. **`14` Hoja de Lugares:** «Todos 9», «Casa de cultura 1», «Museo 4», «Foro 2», «Galería 2» en dos renglones, y «Esta semana» y «Hoy»; de 44 a 36 con 8 de hueco.
15. **`15` Buscar sin texto:** el chip de ciudad y los atajos «Hoy», «Fin de semana» y «Gratis» (enlaces); de 44 a 36.
16. **`16` Buscar con «ca»:** «Todo» (violeta), «Eventos» y «Artistas»; antes el evento decía «Templo de San Francisco · Calle Jar…», después «Templo de San Francisco».
17. **`17` Perfil, pestaña «Interesan»:** el evento con su botón, antes en círculo blanco, después el «✓» a secas; Perfil no lleva chips.
18. **`18` Inicio a 1 280:** antes, rótulos apilados y grandes de 165×248; después, un rótulo por tarjeta («1 va», «2 van», «Te interesa», «Hoy»).
19. **`19` Inicio a 1 280, grandes:** antes 165×248; después **190×285**, con la tarjeta sin foto al final de «Esta semana».
20. **`20` Lugares a 1 280:** el panel con sus renglones, antes con el botón en círculo blanco, después la campana con «+» a secas y el círculo verde del seguido.
21. **`21` a `24`, Safari del simulador (después):** Inicio (la fila y «Tus planes», un rótulo por foto), «Lugares con eventos» (el botón en la esquina de su caja, la fecha en dos líneas), la tarjeta sin foto (fondo suave, nombre, «Hoy», botón y datos) y la Agenda (el «✓» a secas y el círculo verde).
- **`25` Alta de artista, «Qué hace» abierta:** antes, ocho chips de 44 en tres renglones; después, de 36 y con menos aire a los lados, en dos.
- **`26` Alta de artista con «Música» elegida:** antes y después, el chip violeta con su ✕ (ahora un `quitar`), la raya y el campo del detalle; tocar el chip la quita y vuelven las disciplinas.

## Anotado para las piezas que siguen

- **P11 protección.** `Chip.componentes.test.mjs` y `Destacados.componentes.test.mjs` traen la prueba de toque real (`elementFromPoint` a 3 px de la caja) y la del `subgrid`: sirven de base. `medir.js` cuenta los chips por su caja (36) y no ve el `::before`: la prueba de toques debe descontarlo (mi `toques.mjs` vive en el scratchpad, no en el repo). El respaldo local pide `estado: "me_interesa"` (el fixture dice `interesa`, que la app ignora) y fotos de artistas para ver «Artistas destacados»; sus fotos de eventos y lugares son las públicas del sitio.
- **P12 retiros.** `--alto-filtros` (48) sin uso (la fila mide 52). `Tarjeta.foto` sigue siendo la imagen de relleno y `esSinFoto` la reconoce: lo limpio sería `foto: string | null` con Buscar poniendo su relleno (toca `Encontrado` y los recientes guardados). `nombreSitio` ya no lo usa `destacados.ts`. `docs/rediseno/30-boton-en-carriles.md` y su prototipo hablan del botón elevado de las listas. `.chips` de los formularios (`FormularioCanon.module.css`) es otra fila de chips sin el aire de 4 px de la de `ui/Chip`. El campo de archivo escondido de 1×1 de la alta de artista sigue contando como toque de menos de 44.
- **P13 lenguaje incluyente.** Rótulos que ahora salen de un solo sitio (`selloDeTarjeta`): «Te interesa», «Hoy», «1 va», «N van». Nombres accesibles que arma `Chip quitar`: «Quitar {texto}». «Solo tú lo ves» es ahora una píldora. El título del carril «Artistas destacados» (el prototipo dice «Artistas destacadxs»).

## Para el doc 50 (no lo toqué)

- § 5.2, `Chip`: variantes `filtro` (botón o enlace: los atajos de Buscar son un `filtro` con `href`), `contexto`, `quitar`, `estado` y `sello`; 36 a la vista y 44 al tacto (`--alto-chip`); `Tarjeta`: tamaños `grande`, `mediana`, `chica` y `sola`, con `subgrid`; H-02, H-03 y H-19 resueltos; el punto 57 hecho también en la app; `--tarjeta-grande` 190 y `--tarjeta-grande-foto` 285 desde 1048 y tokens nuevos `--alto-chip` y `--tarjeta-sola-foto`.
- Punto nuevo (decisión del gestor a confirmar): «Te interesa» ocupa el sello de la foto y va antes que «Hoy» y «N van»; el botón de la lista es el icono violeta a secas.

## Archivos

Sin migraciones ni variables de entorno. En `src`, sin las pruebas, la pieza suma +502 y −657 líneas (neto −155; el CSS +219 −359, neto −140); las pruebas, +225 y −82 (más `Chip.componentes.test.mjs`, nueva).

**Nuevos:** esta bitácora, `docs/rediseno/capturas-269/` y `src/components/ui/Chip.componentes.test.mjs`. **Con cambios:** `ui/Chip` (con su CSS), `Destacados` (con su CSS y su prueba de componente), `CarrilEsqueleto` (con su CSS), `ui/Esqueleto` (con su CSS), `ui/BotonRenglon`, `ui/Renglon.module.css` (y su prueba de componente), `RenglonEvento`, `RenglonLugar`, `Ciudad`, `FilaEventos`, `ListaArtistas`, `app/lugares/FilaLugares`, `app/buscar/BuscarPantalla` y `buscar.module.css`, `app/eventos/SelectorCuando`, `app/artistas/FormularioArtista` (con su CSS), las dos listas de `app/admin`, `inicio/CarrilEventosCliente` y `CarrilEntidadCliente`, `useAsistenciaEnLista`, `app/globals.css`, `lib/destacados.ts`, `lib/eventosSemana.ts`, `lib/cargarArtistasDestacados.ts`, `lib/buscarUnificado.ts`, `lib/imagen.ts` y las pruebas de `lib` que tocan esas funciones; documentos: `docs/ops/OPEN_LOOPS.md` y `docs/PRINCIPIOS_UX.md`. **Borrados:** `ui/Tarjeta.tsx` y `ui/Tarjeta.module.css`. **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**`, `docs/ops/ASIGNACIONES.md` y el doc 50.
