# 265 · Buscar único: la pantalla de búsqueda con los tres tipos, y ajustes de Lugares (OL-237)

**Fecha:** 2026-09-29 · **Rama:** `ui-buscar`, desde `origin/ui-responsivo` (`da92553d`) · **OL:** OL-237 · **PR:** #275 (sin unir; va montado sobre #274, `ui-responsivo`, que va sobre #273, #272, #271, #270, #269 y #268) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Continúa el plan de OL-227 (doc 50, § 7) con lo que el founder decidió el 2026-09-29 sobre el buscador y sobre Lugares tras ver P5b y P6.

## Pedido

Encargo del Gestor de cambios III, con el criterio de siempre («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código») y la regla de producto de esta pieza: interfaz limpia, el sistema absorbe la complejidad, la persona nunca elige dónde buscar. Tres partes: (1) **un solo buscador para toda la app**: la lupa de la barra abre la pantalla Buscar desde cualquier sección y en los tres tamaños, y se retiran los campos sueltos de Inicio, Agenda y Artistas y el filtro por nombre de Lugares; (2) **dos ajustes de Lugares**: «Seguir» junto al «···» mientras la portada se ve, y el logo de Mapbox pegado a la fila; (3) **la barra sin «Entrar»** cuando no hay sesión (decisión del founder, llegó con el encargo ya en marcha).

## Lo que había

- Tres buscadores: el de Inicio (`BuscadorUnificado`, bajo la cabecera), un campo propio en Agenda y Artistas, y en Lugares un filtro por nombre del mapa y de la lista. La lupa de la barra abría el de la pantalla y, desde una ficha o Perfil, llevaba a `/?buscar=1`. Buscaba solo en la ciudad que se veía, `ilike` sobre el título o el nombre (con acentos importaban) y «Ver todos» mandaba a la lista de la sección con `?q=`.
- La pastilla «Seguir» de la ficha en la hoja flotaba siempre abajo: a media altura tapaba la fila de acciones (y la media reservaba 80 px para ella) y, en el panel, «Publica un evento aquí».
- El logo de Mapbox y la ⓘ se apilaban arriba a la izquierda: el logo a 18 px de la línea de la fila y la ⓘ a 47.
- Sin sesión, la barra traía «Entrar».

## Lo que se hizo

### 1. La pantalla Buscar (`app/buscar/`, vista `tarea`)
- **Ruta propia** `/buscar?desde=&ciudad=`: una barra de tarea (pegajosa, con la franja de la hora) con la píldora «Buscar un evento, lugar o artista» y la ✕ (`Cerrar`, plana, vuelve como Atrás); debajo, en una rejilla plana de una columna, sin márgenes negativos (`buscar.module.css`). Desde 792 va bajo la barra de la app, con el carril, en la columna de 600.
- **Antes de escribir:** el chip de ciudad (`ChipCiudad`, la hoja «Dónde estás»: cambiar de ciudad reemplaza la entrada, no apila), «Recientes» y «Esta semana», como `ui/Grupo` con `ui/Renglon` y `Chip`. Recientes: lo último que se abrió desde Buscar en este aparato, hasta cinco, en `localStorage` (`lib/recientesBusqueda`), con el tipo en la meta («Evento · sáb 3 de oct · 19:00 · MUNI…», «Lugar · Museo», «Artista · Fotografía · Solista»). Esta semana: los tipos de lo que hay en los próximos siete días, hasta cinco por cantidad (`lib/tiposDeLaSemana`); tocar uno busca esa palabra.
- **Con texto** (desde dos letras, sin acentos, 250 ms tras la última): una sola lista en grupos por tipo con su rótulo, el de la sección de origen primero (`ordenBusqueda(desde)`: Inicio, Agenda, Perfil y lo demás cuentan como eventos); tres por grupo y «Ver N más» que despliega ahí mismo; los grupos vacíos no salen. **«Mejor resultado»**: si lo escrito es el nombre de algo o el principio de su nombre (sin acentos), ese resultado va arriba de todo en su renglón, del tipo que sea, y no se repite en su grupo (`mejorResultado`). **Chips** Todo · tipos solo cuando lo encontrado trae más de un tipo; tocar uno deja solo ese tipo, completo (`armarVista`, pura). Nunca hay pestañas antes de escribir.
- **Elegir un resultado** abre su ficha; desde Lugares, un lugar vuelve al mapa de su ciudad con la ficha abierta en la hoja y el mapa centrado (`hrefEnMapa` → `/lugares?lugar=`; `VistaLugares` la abre desde el primer cuadro con `fichaInicial` y la URL suelta el parámetro). **Atrás** repone Buscar con su texto, el chip, lo desplegado y lo encontrado (`useMemoriaPantalla`, ahora sin sección: una pantalla que no es sección no cambia «la última URL de la sección») y el desplazamiento (`MemoriaScroll`); no roba el foco. **Buscar no apila sobre Buscar:** estando en ella, la lupa de la barra enfoca el campo (`prestarALaBarra({ buscar })`, el mecanismo que ya existía).
- **La lupa** (`BarraApp`, `lib/armazon`): lleva siempre a `/buscar?desde=<tipo de la sección>&ciudad=`; al abrirla desde la barra se olvida la memoria de esa URL (una búsqueda nueva empieza vacía; solo al volver de una ficha se repone).
- **El teclado del iPhone:** al llegar a Buscar el campo se enfoca sin el dedo y iOS no abre el teclado (medido en el simulador: campo enfocado, sin teclado). El toque de la lupa enfoca un campo escondido (`layout.tsx`, `.cebo-de-teclado`) y el teclado se queda abierto mientras llega Buscar, que solo le quita el foco al pasarlo a su campo (`alzarTeclado`, 12 líneas); si Buscar no llega, suelta el foco a los 3 s. Medido con la misma prueba: campo enfocado **con** teclado (captura 18).

### 2. La acción de servidor (`accionesBuscar`, `lib/buscarUnificado`)
- **Sin filtro de ciudad; la ciudad ordena.** La acción recibe el texto y los nombres de las ciudades (la que se ve y las demás por cercanía a ella, `ciudadesPorCercania`) y devuelve cada tipo con su ciudad: primero la ciudad que se ve y después las otras, con la ciudad en su propia línea de la meta («Córdoba, España»); hasta 20 por tipo (antes 8).
- **Sin acentos y por todas las palabras**, sin migración: lugares y artistas por `nombre_orden` (el nombre ya normalizado en la base); los eventos por título, sitio o artista como buscaba la Agenda (`buscarEventos`, con sus artistas), sobre los 500 próximos (el corte de PostgREST está en 1 000; no hay título normalizado en la base). `cargarAgenda` ya no trae los artistas de cada evento (solo servían al buscador de la Agenda): Inicio y Agenda piden menos.

### 3. Retiros
`BuscadorUnificado` (con su CSS), `ResultadosBusqueda`; el campo de Inicio, Agenda y Artistas y el filtro por nombre de Lugares con lo que solo ellos usaban: `Cabecera` pierde `onBuscar` y `campo` (y su CSS), `CampoBuscar` pierde `onCerrar`, `Buscador` (el de la URL, que queda para administración) pierde `autoFocus` y `onCerrar`; `filtrarLugares`, `UMBRAL_BUSCAR_LUGARES` y `UMBRAL_BUSCAR_ARTISTAS`; `SeccionBuscador`, `limiteBusqueda` y `ordenBusqueda` de `lib/inicio` (el orden vive ahora en `buscarUnificado`); la búsqueda de `listarAgenda`, la prop `busqueda` de `FilaEventos` y `FilaLugares`, la memoria de búsqueda de Agenda y Lugares, `busquedaInicial`, `buscarAlAbrir` y los `?q=` de Agenda y Lugares y el `?buscar=1` de Inicio. `ui/Buscador` se queda para administración y «Otra ciudad» (`CampoBuscar` gana `inputRef` y `borrar`).

### 4. Los dos ajustes de Lugares
- **Seguir junto al ⋯** (`FichaHoja.module.css`, `lib/hoja`). Con la portada a la vista (la cabecera no es compacta) el contenedor de la pastilla ocupa la franja de la barra —la misma celda de la rejilla, pegajoso y del mismo alto (`--alto-barra-ficha`)— con el botón a la izquierda del «···» (a 8 px) y solo el botón recibe toques (el asa sigue tocable); al compactarse la cabecera (`data-compacta`, el mismo momento) vuelve a flotar abajo como siempre. Una sola pieza en el DOM, sin copias. La regla es una función pura, `cabeceraCompacta(y, compactaDesde, detente, enPanel)`, que ya manda a `data-compacta`. La página de la ficha (`/lugares/:id`) no cambia. **La altura media** ya no reserva 80 px: termina donde empieza lo que sigue a los tres números (fin de los números más su aire), sin constante.
- **Logo de Mapbox pegado a la fila** (`Mapa.module.css`): el contenedor de arriba a la izquierda pasa a una sola línea (`display: flex`, 8 px entre el logo y la ⓘ) a 8 px de la línea de la fila, y los controles pierden el margen que traen (10 y el −4 del logo): sin relleno ni margen negativo.

### 5. La barra sin «Entrar»
`Sesion` devuelve `null` sin sesión (con sesión, la campana como siempre); se va `.entrar` de `Sesion.module.css` y el comentario de `--flanco` habla de lo que reserva ahora. La rejilla de la barra no cambia: el logotipo sigue a −0,1 px del centro con y sin sesión, a 390 y a 1 280.

### 6. Un error que salió al medir
Al salir de Lugares, 1 de cada ~6 veces, la consola daba `Cannot read properties of null (reading 'getBoundingClientRect')`: el aviso de tamaño de `HojaLugares` (P5b) llegaba con la hoja ya quitada y antes de desconectarse. Pila leída con el protocolo de Chrome, arreglado con una guardia (`d.isConnected`); 14 salidas seguidas sin el error.

## Decidí yo (para que el gestor confirme)

1. **«Esta semana» son tipos de lugar, no de evento:** los eventos no tienen tipo propio en los datos; usé el del lugar donde ocurren (Museo, Foro, Galería, Casa de cultura…, «Otro» no cuenta), porque es la palabra con la que se busca y casi siempre está en el nombre. Si el founder los quiere por disciplina de los artistas (Música, Teatro, Cine), es cambiar la consulta de `tiposDeLaSemana`.
2. **«Mejor resultado» con varios que empiezan igual:** gana el nombre igual; si solo empiezan igual, el del tipo de la sección de origen y, a igualdad, el primero de la lista (la de su ciudad). Con «museo» sale el primer museo por nombre: es lo que dice la regla.
3. **La ciudad «por cercanía»** la leí como cercanía a la ciudad que se ve (regla del 2026-09-16), no a la persona: no se pide su ubicación. Dentro de una ciudad, los eventos por fecha y lugares y artistas por nombre.
4. **Los tipos sí salen en el orden de la sección** (el de origen primero), igual que los grupos; el chip «Todo» va siempre primero.
5. **El campo no lleva ✕ para borrar** (el prototipo firmado solo trae la ✕ de cerrar); borrar el texto es a mano. Vetable: `borrar` (ya existe) devuelve la del campo, con dos ✕ juntas.
6. **La fila de la ciudad solo antes de escribir** (como decía el encargo); con texto, la ciudad ordena sin mostrarse.
7. **El campo escondido para el teclado** (`cebo-de-teclado`) es un remedio a una limitación de iOS; probado en Safari del simulador, no en la app instalada.
8. **Recientes** se guardan al abrir un resultado (no al buscar) y viven en `localStorage`; una entrada es un enlace guardado: si el evento ya pasó, su ficha lo dice.
9. **`?lugar=`** abre la ficha en la hoja y se limpia de la URL; con un lugar que no existe o no se ve, no pasa nada.
10. **Sin oferta de registrar** en el vacío de Buscar («Nada con «q».»): «Registrar a «q»» de Artistas se quedó sin acceso (ningún control pone ya `?q=` ahí).
11. **`/buscar` va con `X-Robots-Tag: noindex`** además de su `robots`, como las demás pantallas de tarea privadas.
12. **La acción recibe las ciudades** (nombres) en vez de una: cambió su firma; no hay más llamadores.
13. **El error de `HojaLugares`** lo arreglé aquí porque toqué el mismo archivo; es de P5b.

## Lo que cambia a la vista

- **La lupa** abre Buscar desde cualquier sección y tamaño; ya no hay campos sueltos en Inicio, Agenda, Artistas ni Lugares.
- **Lugares:** la ficha a media altura ya no tapa las acciones (la hoja es 60 px más baja) y «Seguir» va arriba junto al «···»; en el panel, «Publica un evento aquí» queda libre; el logo de Mapbox y la ⓘ, en una línea a 8 px de la fila.
- **Barra:** sin sesión, sin «Entrar».
- **Lo que no cambia:** `/lugares/:id` a pantalla completa, el teléfono en Agenda, Artistas, Perfil y Ajustes (sin campo y sin «Entrar»).

## Verificación

- `npm run lint`: 0 errores (la advertencia que ya estaba, en `docs/diseno/logotipo/iconos-sn.mjs`). `npm run typecheck`: verde. `npm test`: 120 archivos, **1 558** pruebas (1 536 antes). `next build` verde con el respaldo local y **sin variables de entorno**, como la CI.
- **Pruebas nuevas** (vitest, puras): `buscarUnificado.test.ts` (18: el orden de los grupos según la sección; «mejor resultado» con acentos, igual contra empieza igual, prioridad de la sección y sin candidato; que no se repita; chips solo con más de un tipo, un tipo elegido y uno que ya no trae nada; la ciudad ordena; la meta; a dónde lleva un lugar desde Lugares), `recientesBusqueda.test.ts` (4: primero, sin repetir, cinco, almacén, lo ilegible o de fuera), `tiposDeLaSemana.test.ts` (3), `hoja.test.ts` (+3: la regla de la pastilla: en el héroe con portada, flotando sin ella, recogida y panel), `armazon.test.ts` (la lupa y el tipo de origen). En Chrome real (`HojaLugares.componentes.test.mjs`, 7): la pastilla junto al «···» (misma fila, a 8), flotando al pie compacta y llena, escondida recogida; y **que cambia de sitio justo cuando la cabecera se compacta**, en pasos de 60 px con la rueda; la altura media termina donde empieza lo siguiente; `Armazon.componentes.test.mjs`: la barra sin «Entrar» ni campana con el logotipo al centro, a 390 y a 320. **Comprobado que fallan** sin lo que cuidan (15 cambios): el orden de origen, «empieza igual», igual contra empieza, el repetido, los chips con un tipo, el tipo elegido, la ciudad, los cinco recientes, los enlaces de fuera, «Otro», los cinco atajos, la hoja recogida, la lupa a Inicio, la pastilla sin su regla de CSS y la media con los 80 px.
- 70 pruebas de componente en Chrome en verde (Asistencia, HojaLugares, Armazon, Destacados, FilaEventos, Seguir, BotonIcono, Hoja, Kpi, Renglon y cargador). `cupo`, `guardado` y `nuevos` (21) fallan igual en el código base.
- **Recorridos reales** (Chrome, respaldo inventado con una segunda ciudad, «Córdoba, España»): Inicio → lupa → «colocaos» → evento → Atrás (texto, resultados y desplazamiento repuestos: 900 → 900, 18 renglones con «Ver 8 más» abierto, sin foco); Lugares → lupa → «ferrocarril» → el lugar → mapa con su ficha en la hoja y la URL sin `?lugar=` → Atrás vuelve a Buscar con su texto; en escritorio, estando en Buscar, la lupa enfoca el campo sin apilar (misma URL y mismo historial); ✕ vuelve a Inicio; «museo» trae los museos de las dos ciudades, la otra al final con su ciudad.
- **Safari real** (simulador del iPhone 15 Pro, iOS 26.3, teclado en pantalla): la lupa deja Buscar con el teclado abierto (sin el campo escondido, no); «museo» escrito con las teclas; Atrás repone el texto y los resultados sin teclado; «Seguir» junto al «···» a media altura y con la barra pegada mientras la portada se ve; compacta, abajo; el logo y la ⓘ en una línea; Inicio sin sesión sin «Entrar».
- **Detentes** (390×844, Museo del Ferrocarril; lo que se ve de la hoja sobre la navegación): lista recogida **64** · asoma **302** · llena **844** (iguales antes y después); ficha recogida **76** · media **417 → 357** (desplazamiento 341 → 281) · llena **844**. La ficha sigue asentándose en sus detentes con la rueda de Chrome (`HojaLugares.componentes` y la app compilada: media 281 → llena 708 → recogida 0): de media, +3 000 la llena y la compacta, «Atrás» vuelve a la media, −3 000 la recoge a su cabecera sin cerrarla y la ✕ la cierra con la lista donde estaba.
- **Logo de Mapbox:** a la línea de la fila, **18 → 8 px** el logo y **47 → 8 px** la ⓘ (una sola línea: el logo a 8 y la ⓘ a 104, 8 después del logo). Con el mapa de escritorio, igual (8).
- **Medidas** (`medir.js`, 7 pantallas —8 con Buscar— en teléfono y escritorio, antes → después):

  | | Antes | Después |
  |---|---|---|
  | Márgenes negativos | 2 (el logo de Mapbox) | **0** (0 nuevos; Buscar, 0) |
  | Desbordes | 26 | **24** (0 nuevos; Buscar, 0) |
  | Toques de menos de 44 | 2 (logo de Mapbox, 88×23) | **4**: el logo y la ⓘ (24×24), los dos de Mapbox y a los dos anchos; **0 nuestros**, Buscar 0 (la ⓘ no salió en la corrida de antes: el estilo de prueba de esa vez no traía atribución; en las capturas de antes, con ella, mide igual) |
  | Botones de la barra sin sesión | +, logotipo, lupa, «Entrar» | **+, logotipo, lupa** |
  | Logotipo fuera del centro (con y sin sesión, 390 y 1 280) | 0,1 px | **0,1 px** |

- **Lo que esta prueba no puede ver:** el iPhone real ni la web instalada (el teclado con el campo escondido está probado en Safari del simulador), lo que pasa con miles de eventos (la búsqueda de eventos filtra los 500 próximos en el servidor: con más, hará falta una columna normalizada y una migración), ni Buscar con datos reales de producción.

## Capturas

`docs/rediseno/capturas-265/` (34 PNG de paleta, 3,4 MB). «Antes» es la compilación de `origin/ui-responsivo` y «después» esta rama, ambas con la sesión de `ana@example.com` del respaldo local inventado, con una segunda ciudad inventada para ver «Córdoba, España»; teléfono a 390×844 a 2×, escritorio a 1 280×800, Safari del simulador a 750×1 626. El recuadro gris con un icono roto de las fichas es la imagen estática de Mapbox (sin token ni red); el mapa, un fondo liso con los pines de la app. Cada una abierta y descrita.

1. **Buscar vacío** (`01`, después): la píldora con «Buscar un evento, lugar o artista» y la ✕; el chip «San Luis Potosí»; Recientes con tres renglones (Aaron Cadena · Artista · Fotografía · Solista; Museo del Ferrocarril · Lugar · Museo; LXS COLOCAOS · Evento · sáb 3 de oct · 19:00 · MUNI…) abiertos de verdad desde Buscar; y «Esta semana» con Casa de cultura, Galería, Foro y Museo.
2. **Escribiendo «museo» desde Inicio** (`02`): antes, el campo suelto bajo la cabecera con «LUGARES · 3» (MUNI, Museo Nacional de la Máscara, Museo del Ferrocarril) y la barra de abajo. Después, la pantalla Buscar: chips Todo (violeta) · Eventos · Lugares; «Mejor resultado» Museo del Ferrocarril («Lugar · Museo»); Eventos (LXS COLOCAOS, OCA y Noche de museos en Córdoba, con «Córdoba, España» en su línea); y Lugares (MUNI, Museo Nacional de la Máscara y el Museo de Bellas Artes de Córdoba, «Museo» y «Córdoba, España»).
3. **Escribiendo desde Lugares** (`03`): antes, «muse» en el campo bajo la barra, «3 lugares» filtrados en la hoja y el logo con la ⓘ debajo. Después, el mismo «museo» con otro orden: chips Todo · Lugares · Eventos, el mismo mejor resultado, Lugares primero y Eventos después.
4. **Mejor resultado con chips** (`04`): «muni»: «MUNI Museo Universitario UASLP · Lugar · Museo» arriba y, debajo, Eventos con LXS COLOCAOS (en MUNI); chips Todo · Eventos · Lugares.
5. **Un solo tipo, sin chips** (`05`): «aaron»: «Mejor resultado» Aaron Cadena (Artista · Fotografía · Solista) y Artistas con Aarón de Córdoba (Guitarra flamenca · Solista, «Córdoba, España»); no hay chips.
6. **Un tipo elegido** (`06`): «museo» con el chip Lugares en violeta: el mejor resultado y solo los tres lugares, completos; no hay Eventos.
7. **«Ver N más»** (`07`): «de», con los cuatro tipos y sus chips; el mejor resultado es «Delirium Pollum, clown y pantomima con Pimpolina» (Evento · vie 2 de oct · 18:00 · Teatro de la Paz); Eventos trae tres renglones y «Ver 8 más» en violeta; abierto, los once eventos ahí mismo.
8. **Sin resultados** (`08`): «zzzz» con «Nada con «zzzz».».
9. **Atrás repone Buscar** (`09`): tras abrir un evento y volver, «colocaos» y su resultado (LXS COLOCAOS), el campo sin foco.
10. **Un lugar elegido desde Lugares** (`10`): el mapa con la ficha del Museo del Ferrocarril abierta en la hoja a media altura, «Seguir» junto al «···», el pin en el centro de lo que deja libre la hoja y el logo con la ⓘ en una línea.
11. **La hoja con la ficha a media altura** (`11`): antes, la hoja hasta pasar los tres números y la fila de acciones con «Seguir» encima; después, la hoja termina tras los números con su aire, «Seguir» arriba junto al «···» y el logo con la ⓘ en una línea.
12. **Ficha llena, arriba** (`12`): antes, Atrás y «···» y «Seguir» flotando abajo sobre «Dónde»; después, Atrás, «Seguir» y «···» en la misma fila del héroe y nada flotando.
13. **Ficha llena, desplazada** (`13`): antes y después, la cabecera compacta con «Museo del Ferrocarril Jesú…» y la pastilla «Seguir» al pie, sin cambio.
14. **Lugares y el logo** (`14`): antes, el logo de Mapbox arriba a la izquierda y la ⓘ debajo; después, los dos en una línea a 8 px de la fila (logo de 88 y ⓘ de 24, con 8 entre ellos).
15. **Escritorio, Buscar** (`15`): antes, el campo suelto centrado bajo la barra de Inicio con «LUGARES · 3»; después, la barra de la app y el carril, la barra de Buscar (píldora y ✕) a 600 bajo ella, chips, mejor resultado, Eventos y Lugares.
16. **Escritorio, el panel** (`16`): antes, «Seguir» flotando al pie del panel sobre «Publica un evento aquí» y el logo con la ⓘ debajo; después, «Seguir» arriba junto al «···», el botón libre y el logo con la ⓘ en una línea.
17. **Inicio sin sesión** (`17`): antes, «Entrar» en violeta junto a la lupa; después, solo la lupa, con el logotipo en su sitio.
18. **Safari, la lupa** (`18`): Buscar con el teclado abierto al llegar (el cursor azul en el campo, la tecla de búsqueda), Recientes con un renglón y «Esta semana».
19. **Safari, «museo»** (`19`): escrito con las teclas del iPhone, con los chips, «Mejor resultado» y Eventos sobre el teclado.
20. **Safari, Atrás** (`20`): Buscar repuesto tras abrir un lugar y volver: «museo», los resultados y «Córdoba, España» en su línea; el campo sin foco y sin teclado.
21. **Safari, Lugares** (`21`): la hoja «9 lugares» y, arriba a la izquierda del mapa, el logo y la ⓘ en una línea bajo la fila.
22. **Safari, la ficha a media altura** (`22`): ACHE Galería, «Seguir» junto al «···», los tres números y la hoja cortada tras ellos.
23. **Safari, barra pegada con la portada** (`23`): hoja llena y algo desplazada, la portada todavía bajo la barra: Atrás, «Seguir» y «···» en la misma fila, la barra sin compactar.
24. **Safari, compacta** (`24`): la barra oscura con «ACHE Galería» y «···», la pastilla «Seguir» flotando al pie.

## Anotado para las piezas que siguen

- **P8 (mapa).** `Mapa` solo cambió su CSS de la esquina de arriba a la izquierda (logo y ⓘ en una línea, sin márgenes: sigue siendo `top-left`); abrir un lugar desde fuera es `VistaLugares` (`fichaInicial`, `irAlLugar`) y no necesita nada del mapa. Si P8 cambia la atribución de sitio, esa línea es `Mapa.module.css` al final. Sin glifos en las pruebas, las etiquetas del mapa no salen.
- **P9 (altas).** El vacío de Buscar no ofrece registrar; si se quiere, va ahí (`«Nada con «q».»`, con el tipo de la sección de origen como sugerencia). `hrefNuevo(nombre)` de `ListaArtistas` ya no lo alcanza ningún control.
- **P10 (tarjetas y chips).** Buscar usa `Chip` y `Chips` (los tipos y «Esta semana»), `ChipCiudad` y `ui/Grupo` con `ui/Renglon`; no hay `ChipContexto` ni `ChipQuitar` (no abren hoja ni quitan nada). «Esta semana» es un `Chips envuelve` dentro de un `<li>` de `Grupo`.
- **P12 (retiros).** Quedan sin control que los ponga: el filtro `?q=` de Artistas (`filtro.q`, `hrefArtistas({ q })`, `filtroDesdeUrl`, la tira de letras que se esconde con `q`, «Nadie se llama…» y `hrefNuevo(nombre)`), `CampoBuscar.onFocus` y `.className`, `Buscador.clave`, y `EventoAgenda.artistas` (ahora solo lo llena `accionesBuscar`). Los enlaces viejos `/agenda?q=` y `/lugares?q=` ya no filtran.
- **Escala.** La búsqueda de eventos trae los 500 próximos y filtra en el servidor; con un título normalizado en la base (columna y trigger, como `nombre_orden`) pasaría a una consulta: es una migración y va aparte.

## Archivos

Sin migraciones ni variables de entorno.

**Nuevos:** `app/buscar/` (`page.tsx`, `BuscarPantalla.tsx`, `buscar.module.css`), `lib/recientesBusqueda.ts`, `lib/tiposDeLaSemana.ts`, `lib/buscarUnificado.test.ts`, `lib/recientesBusqueda.test.ts`, `lib/tiposDeLaSemana.test.ts`, esta bitácora y `docs/rediseno/capturas-265/`. **Borrados:** `components/BuscadorUnificado.tsx` y su CSS, `components/ResultadosBusqueda.tsx`. **Con cambios:** `app/accionesBuscar.ts`, `lib/buscarUnificado.ts`, `lib/armazon.ts`, `lib/ciudad.ts`, `lib/hoja.ts`, `lib/memoriaPantalla.ts`, `lib/agenda.ts`, `lib/cargarAgenda.ts`, `lib/inicio.ts`, `lib/lugares.ts`, `lib/artistas.ts`, `components/BarraApp.tsx` (y su CSS), `Sesion.tsx` (y su CSS), `MemoriaPantalla.tsx`, `prestamoBarra.ts`, `Inicio.tsx`, `AgendaInicio.tsx`, `FilaEventos.tsx`, `ListaArtistas.tsx`, `Mapa.module.css`, `ui/Buscador.tsx`, `ui/Cabecera.tsx` (y su CSS), `ui/Cerrar.tsx`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/agenda/page.tsx`, `app/lugares/page.tsx`, `VistaLugares.tsx`, `FilaLugares.tsx`, `HojaLugares.tsx`, `FichaHoja.module.css`, `next.config.ts` y las pruebas `agenda`, `armazon`, `hoja`, `inicio`, `lugares`, `HojaLugares.componentes` y `Armazon.componentes`; documentos: `docs/diseno/LINEA_GRAFICA.md` y `docs/ops/OPEN_LOOPS.md`. **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**`, `docs/ops/ASIGNACIONES.md` y el doc 50.
