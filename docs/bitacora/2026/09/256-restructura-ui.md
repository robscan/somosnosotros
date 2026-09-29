# 256 · Reestructura de la interfaz: auditoría y propuesta (OL-227)

**Fecha:** 2026-09-28 · **Rama:** `restructura-ui`, desde `origin/main` (`47a0fda4`) · **OL:** OL-227 · **Modelo:** Fable 5.1,
esfuerzo máximo (Gestor de cambios III, sesión `local_004a210b`). Sin subagentes, council ni workflows. Sin código de la app.

## Pedido

OPEN_LOOPS, OL-227, con las palabras del founder: «retoma proyecto de restructura de UI donde planeamos resolver una
interfaz para los distintos dispositivos. Que se adapte perfectamente y sea responsiva. Cuidado máximo de estética, en
este ejercicio aprovecha para cuestionar cómo se ha maquetado hasta ahora, encuentra áreas de oportunidad, observando
leyes heurísticas y de UX como región común, proximidad, consistencia y estándares, Fitts, Tesler, identifica y refuerza
modelos mentales, recuerda Aesthetic-Usability Effect, aborda desde jobs to be done, identifica intención y refuerza
flujos desde filosofía UX invisible. Identifica entonces áreas de oportunidad, propón plan de implementación definitivo y
organizado, usando variables y componentes canonizados para prevenir futuros mantenimientos, protege al sistema
identificando bugs silenciosos en maquetación o sobreanidaciones. Retoma el proyecto que ya había sido empezado pero
reevalúalo con Fable 5.1 en Max». Los docs 48 y 49 (rechazados) se leyeron como antecedente, no como base.

## Entregado en esta sesión (primer avance: hallazgos antes que propuesta)

[`docs/rediseno/50-restructura-ui.md`](../../../rediseno/50-restructura-ui.md): secciones 1 a 4 completas (cómo se
auditó, hallazgos H-01 a H-38 pantalla por pantalla con ley y propuesta, inventario del sistema, lectura transversal
por leyes), sección 5 (propuesta en primera versión: variables, componentes, plantillas, reglas responsivas y por
plataforma), sección 7 (plan en 12 piezas, primera versión), sección 8 (defectos silenciosos con archivo y línea),
sección 9 (cómo se protege el sistema), sección 10 (qué se retira) y sección 11 (cuatro decisiones que se le piden al
founder). El prototipo (sección 6) queda para después de su lectura, a propósito: no se dibuja dos veces.

## Cómo se hizo

1. **Arranque** (CLAUDE.md, OPEN_LOOPS, ASIGNACIONES «Relevo del gestor III», GESTION_DE_CAMBIOS, MEMORIA_GESTOR, la
   memoria persistente). `get_session "self"`: `claude-fable-5-1`, esfuerzo `max`. Id anotado en ASIGNACIONES (commit
   local en el árbol del gestor, a `main` con el «publica» del founder). `git pull --ff-only` en la carpeta principal;
   `siguiente-bitacora.sh` confirmó 256 / OL-227 reservados y OL-228 / 257 libres. Árbol propio
   `.claude/worktrees/restructura-ui` desde `origin/main`.
2. **Producción con el Chrome real de la Mac** (`playwright-core` instalado en el scratchpad, nunca en el repo): 10
   pantallas públicas × 3 contextos (390×844 a 2× con toque y sin hover, 820×1180, 1280×800 con ratón), 32 PNG, esperando
   `document.fonts.ready` y comprobando que Bricolage Grotesque estaba cargada en cada una.
3. **Medición del DOM** en cada carga (script `medir.js`): nodos y profundidad dentro de `main`, envoltorios sin
   función, hijos fuera de la caja del padre, elementos fuera de la ventana (ignorando los que viven en un carril
   desplazable), márgenes negativos, contextos de apilamiento, cajas con contenido más alto que ellas, objetivos de toque
   menores de 44 px, controles solapados o a menos de 8 px. 48 corridas (30 de producción, 18 con sesión).
4. **Medidas puntuales** de los defectos candidatos (`medidas.mjs`, `desborde-artistas.mjs`) con `getBoundingClientRect`
   a 390×844: flotante contra renglones y «+», carril de cinco enlaces, cabecera compacta, barra fija de la ficha, texto
   de Artistas bajo el botón.
5. **Inventario estático del CSS** (`inventario-css.mjs`, PostCSS del `node_modules`): 100 hojas, 1 246 reglas, tokens,
   691 medidas en duro, 68 colores literales, 137 alturas fijas, 44 `z-index`, 74 posiciones, 35 bloques duplicados.
6. **Pantallas con sesión**: respaldo local 100 % inventado (Node puro sobre `node:http`, sin dependencias: imita Auth
   —JWT HS256 sin firma válida, cookie `sb-127-auth-token`— y PostgREST con `select` anidado, filtros `eq/in/is/gte/lte/
   ilike/or/and`, `order`, `limit`, `Range`, `Prefer: count`, y RPC `van_por_evento`, `tira_destacados`, `cuenta_seguidores`,
   `disciplinas_con_artistas`, `artistas_con_nombre`, `lugares_con_nombre`); cuenta `ana@example.com` con dos «Voy» y un «Me
   interesa»; 13 eventos y 9 lugares verosímiles con los carteles públicos del sitio. `.env.local` temporal (solo la URL del
   respaldo y una llave inventada; borrado al terminar), `npm run build && next start -p 3100` en el árbol de la rama
   (`node_modules` clonado con `cp -Rc` de la carpeta principal), 9 pantallas × 2 tamaños. Nunca se leyó ni escribió
   producción ni un `.env` real (este árbol no tiene ninguno).
7. **App de iPhone**: simulador propio «OL-227 iPhone 17 Pro» (iOS 26.3) creado con `xcrun simctl create`; `npm ci` en
   `apps/ios`, `npx cap sync ios` (generó el `config.xml` que le faltaba al primer intento de compilar), `xcodebuild … CODE_SIGNING_ALLOWED=NO`,
   `simctl install` y `launch`; recorrido Inicio → Agenda → Lugares → Agenda → ficha → Atrás → Entrar → correo → teclado, con
   capturas `simctl io screenshot`. Los FLOWYA no se tocaron; el simulador se apagó y borró al terminar.
8. **Documento y capturas**: las 38 capturas se copiaron al repo como PNG de paleta (sharp del `node_modules`, mismo tamaño en
   píxeles, 3 a 5 veces menos bytes; las dos de tableta a 1,5×): 5,3 MB en total.
9. **Herramientas al repo**: `scripts/ops/auditoria-ui/` (los scripts de 3, 4, 5 y 8 con rutas relativas, la lista de
   pantallas y el respaldo local con su fixture) y su README, para que las piezas del plan repitan la medición y para
   convertirlas en pruebas (P11). No son código de la app.

## Cifras que sostienen el veredicto (detalle en el doc 50)

| Pantalla (390×844) | Nodos | Prof. | Envolt. | Desbordes | Neg. | Toques < 44 | Nota |
|---|---|---|---|---|---|---|---|
| Inicio | 300 | 8 | 25 (6 tipos) | 10 (chevron −10, botón de redondas −9) | 5 | 3 | flotante tapa 2 tarjetas |
| Agenda | 391 | 8 | 5 | 0 | 0 | 5 | chrome 156 arriba + 60 abajo; útil 628; flotante tapa 1 renglón |
| Lugares mapa | 83 | 9 | 9 | 3 (Mapbox) | 1 | 6 | tira de tipos 967 px en 390 |
| Lugares lista | 320 | 8 | 25 | 0 | 1 (tira −44) | 6 | 2 flotantes tapan 2 renglones y 2 «+» |
| Artistas | 999 | 7 | 102 | 16 (texto 4–43 px fuera; 2 bajo el «+») | 1 | 4 | |
| Ficha evento | 57 | 4 | 4 | 0 | 2 (barra, acciones) | 4 | acciones a 68 px; barra 73; mapa 170 |
| Ficha lugar (4 / 5 enlaces) | 83 / 73 | 7 | 6 / 7 | 0 | 2 | 4 | 5.º enlace al 52 % (31 px fuera) |
| Ficha artista | 45 | 5 | 3 | 2 | 2 | 3 | |
| Entrar | 18 | 3 | 0 | 0 | 1 | 3 | |
| Alta evento / lugar (sesión) | 73 / 62 | 8 | 3 / 2 | 0 | 0 | 3 / 4 | |
| Ajustes / Perfil / Editar / Novedades (sesión) | 98 / 63 / 44 / 41 | 7 / 7 / 5 / 5 | 8 / 0 / 0 / 0 | 0 | 0 | 1–3 | |

Escritorio (1280×800) y tableta (820×1180): mismos nodos y profundidad (no hay reglas responsivas); en las fichas los
márgenes negativos de la barra y las acciones valen −340 px por lado; en Inicio y Lugares lista las tarjetas del carril
siguen hasta el borde derecho de la ventana.

## Capturas reales (`docs/rediseno/capturas-256/`), abiertas y descritas

Producción, teléfono 390×844 (2×):
- **`256-01-inicio-movil.png`:** barra con SMSNSTRS y «Entrar»; cabecera con chip «San Luis Potosí» y lupa; «Destacados»
  con carteles verticales de 165×248 y, sobre cada uno, «+» arriba a la derecha y sellos «Recién agregado» y «2 van»
  abajo a la izquierda; «Esta semana» empieza y el flotante «Publicar evento» tapa la esquina inferior derecha de la
  primera tarjeta y la segunda; nav con Inicio activo.
- **`256-01-inicio-movil-completa.png`:** la página entera (2 088 px): Destacados, Esta semana, Nuevos eventos, «Lugares
  con eventos» (círculos de 104 con dos placeholders SN grises) y «Artistas destacados» (tarjetas grandes con un
  placeholder SN gris de 165×248 entera); el chevron «›» tras cada título.
- **`256-01-inicio-tableta.png`:** 820 px: la misma columna de 600 centrada; los carriles arrancan en la columna y siguen
  hasta el borde derecho (cuatro carteles y el borde del quinto); el flotante al centro-abajo de la columna sobre la
  tercera tarjeta de «Nuevos eventos»; nav de 4 destinos a lo ancho.
- **`256-01-inicio-escritorio.png`:** 1280 px: igual que la tableta con más aire; el flotante flota en mitad de la
  ventana sobre las tarjetas de «Esta semana»; la píldora activa de la nav en una celda de 320 px.
- **`256-02-agenda-movil.png`:** cabecera de 100 (chip de fecha, ciudad, lupa; pestañas «Todos · Siguiendo»); «Hoy · 2»
  pegajoso con raya en tinta; renglones con foto 64 (o SN), título en dos líneas, hora, lugar con dirección postal de tres
  líneas, «Gratis» y «+» a la derecha; el flotante tapa el pie del tercer renglón.
- **`256-02-agenda-escritorio.png`:** la lista en la columna de 600; el flotante sobre el cuarto renglón; nav a lo ancho.
- **`256-03-lugares-mapa-movil.png`:** mapa entre cabecera (tira de tipos cortada en «Foro 1…») y nav; puntos y nombres;
  «Vie» sobre MUNI (nombre cortado por el borde izquierdo); en el centro el nombre violeta de «Museo del Ferrocarril» encima
  de un pin «Vie» y de un racimo de puntos; «Ver en lista», «Registrar lugar», ubicación y la marca de Mapbox encima del mapa.
- **`256-03-lugares-mapa-tableta.png`:** 820 px: el racimo del centro con «Archivo Histórico», «Foro lunaria», «Casa del
  Poeta» y el pin «Vie» de Ferrocarril encimados; «Casa Bauen» bajo el pin «Mar»; los mismos flotantes abajo a la derecha.
- **`256-03-lugares-mapa-escritorio.png`:** 1280 px: la tira de tipos completa cabe («Otro 4»); el mapa a lo ancho; los
  flotantes y la ubicación dentro de la columna central, lejos de los bordes.
- **`256-04-lugares-lista-movil.png`:** carril «Con eventos esta semana» (dos tarjetas), «62 lugares», «A» y renglones;
  «Ver en mapa» tapa el «+» de Aether y «Registrar lugar» tapa el título del Archivo Histórico.
- **`256-04-lugares-lista-escritorio.png`:** carril de cinco tarjetas más el borde de una sexta; lista en la columna;
  los dos flotantes sobre el segundo y tercer renglón.
- **`256-05-artistas-movil.png`:** cabecera de 100 (tipos «Todos 582 · Música 310 · Teatro 56 · Danza 28») + tira de
  letras; renglones con foto redonda o SN, nombre, «disciplina · tipo» y «+»; el flotante «Registrar artista» sobre el
  sexto renglón, cuyo texto «Música académica y clásica · Solista» pasa por debajo.
- **`256-05-artistas-escritorio.png`:** la tira de letras completa (# a Z) en la columna; el flotante sobre el «+» del
  quinto renglón.
- **`256-06-ficha-evento-movil.png`:** barra «Atrás · SMSNSTRS · ···»; cartel 350×220 con lupa; título; hora, sitio con
  dirección, «Con Orquesta Sinfónica…», «Nadie ha dicho que va todavía», «Gratis»; tres círculos repartidos a los extremos
  (Compartir, A mi calendario, Cómo llegar); el mapa asoma y la barra fija «Me interesa · Voy» lo tapa.
- **`256-06-ficha-evento-movil-completa.png`:** la ficha entera: mapa de 170, descripción, «Más información en la página
  del evento →», «Quién va» (vacío con invitación), «Publicado por Robscan.»; la barra fija dibujada a mitad de la imagen
  (artefacto de la captura a página completa).
- **`256-06-ficha-evento-escritorio.png`:** columna de 600; el cartel recortado por arriba (el «28» cortado); las tres
  acciones a 600 px de extremo a extremo; barra fija a lo ancho con los botones en la columna.
- **`256-07-ficha-lugar-4-movil.png`:** Teatro de la Paz: portada, «Foro», dirección, «1 persona lo sigue», «Próximo: jue 1
  de oct · 20:00 … ver»; cuatro círculos repartidos (Cómo llegar, Compartir, Sitio web, Instagram); mapa; «+ Seguir» fijo.
- **`256-08-ficha-lugar-5-movil.png`:** Museo del Ferrocarril con cinco enlaces: carril de círculos a 20 px con
  «Instag…» cortado por el borde derecho (52 % visible), sin señal de que se desliza.
- **`256-08-ficha-lugar-5-escritorio.png`:** los cinco círculos caben en la columna, alineados a la izquierda; mapa y
  «Seguir».
- **`256-09-ficha-artista-movil.png`:** avatar redondo de 224 con el botón Compartir flotando sobre su esquina; nombre,
  «Artes visuales · Solista», ciudad, «1 persona lo sigue», «Sin fechas próximas»; «Enlaces» con un solo círculo «Sitio web»;
  bio con «más»; «Se presenta en» vacío; «+ Seguir» fijo.
- **`256-10-entrar-movil.png`:** «Atrás · SMSNSTRS»; «Entrar», subtítulo, tres botones (Apple negro, Google, correo) y la
  línea legal.
- **`256-10-entrar-escritorio.png`:** lo mismo en la columna de 600, con la barra a lo ancho; el resto de la ventana vacío.

App de iPhone (simulador iPhone 17 Pro, 1206×2622):
- **`256-11-ios-inicio.png`:** hora 10:46 e isla dinámica; barra bajo la isla; Destacados; el flotante «Publicar evento»
  tapa el «+» y la esquina de la primera tarjeta de «Esta semana»; nav sobre el indicador de inicio.
- **`256-12-ios-agenda.png`:** Agenda con «Hoy · 2» y «Mañana»; el flotante tapa el lugar y el «+» del tercer renglón.
- **`256-13-ios-lugares-mapa.png`:** el mapa con el racimo del centro: nombre violeta de Ferrocarril sobre el pin «Vie» y
  los puntos; «Vie» de MUNI cortado a la izquierda; cuatro flotantes.
- **`256-14-ios-ficha-evento.png`:** «Macario, Xantolo camino al Mictlán» sin cartel: bloque gris de 220 con el símbolo SN;
  «Cómo llegar · sin dirección» apagado; barra fija «Me interesa · Voy».
- **`256-15-ios-entrar-teclado.png`:** Entrar en la app (Apple y correo; sin Google); el campo «Tu correo» con foco y el
  teclado abierto; la barra «Atrás · SMSNSTRS» sigue en su sitio bajo la isla (el problema 1 del doc 48 ya no está).

Con sesión, respaldo local (390×844 salvo que se diga):
- **`256-20-inicio-sesion-movil.png`:** campana y avatar «A»; «Tus planes» con dos tarjetas (check verde, sellos «Recién
  agregado» y «1 va / 2 van»); «Seleccionados para ti»; el flotante sobre la segunda fila.
- **`256-21-agenda-sesion-movil.png`:** Agenda con sesión: el check verde del tercer renglón queda detrás del flotante.
- **`256-22-alta-evento-movil.png`:** «Publicar un evento» sin la tarjeta del cartel (lectura apagada en local); campo
  «Falta el nombre» + nota «Falta el nombre.»; renglones Cuándo (Hoy · 19:00 · Cambiar), Dónde (Falta · lupa + «Falta
  ubicación.»), Quién, Cuánto, Más; botón lavado «Publicar evento».
- **`256-22-alta-evento-escritorio.png`:** lo mismo en la columna, terminando a 660 px de una ventana de 800.
- **`256-23-ajustes-movil.png`:** «Ajustes» con Tu ficha (Editar, Perfil · Público), Avisos (palancas), Cuenta, Somos
  Nosotros; rótulos en mayúsculas chicas, tarjetas y aire entre grupos.
- **`256-23-ajustes-movil-completa.png`:** los cuatro grupos completos (Instalar la app, Invita, Avisar al salir, Ayuda,
  Privacidad, Reglas) y «Borrar mi cuenta» suelto al final.
- **`256-23-ajustes-escritorio.png`:** en la columna; «En esta computadora» con la nota de que falta la llave pública de
  avisos en este despliegue (es el respaldo local, no producción).
- **`256-24-perfil-movil.png`:** avatar «A» de 160, «Ana Rentería · Barrio de San Miguelito», engrane y compartir;
  tarjeta violeta «Falta una línea sobre ti… Completar»; pestañas «Voy a 2 · Sigo 2»; dos renglones con check verde.
- **`256-25-ficha-evento-voy-movil.png`:** LXS COLOCAOS con «Van 2 personas · ver» y la barra fija «✓ Voy · Ya estás en la
  lista | Cancelar».
- **`256-26-alta-lugar-movil.png`:** «Registrar un lugar» con la frase «Con el nombre y dónde está basta…», campo con
  lupa, Dónde (Estoy aquí y Buscar), Tipo «Por el nombre», Más; «Publicar lugar» lavado.
- **`256-27-editar-perfil-movil.png`:** renglones Foto (cámara), Nombre, Colonia, Sobre ti (Falta), Entras con; «Guardar»
  lavado.

## Límites y honestidad

- El mapa no carga en local (sin token de Mapbox): se auditó solo en producción.
- El desbordamiento horizontal con barra de desplazamiento clásica (H-38) no se pudo reproducir: el Chrome de la Mac usa
  barras superpuestas incluso forzando `::-webkit-scrollbar`; queda como riesgo documentado, no como medida.
- El simulador es un iPhone 17 Pro (402×874 pt); las cifras del doc son del Chrome a 390×844.
- En la app de iPhone no aparece «Continuar con Google»: lo decide `src/lib/entrarCon.ts`; se deja anotado para confirmar
  que es a propósito, no se corrige aquí.
- El alta de evento en local sale sin la tarjeta del cartel (la lectura por IA está apagada sin llave).
- Se leyó el código de los componentes y hojas citados (no todo `src/app/admin`, `obra/*` ni Pincel, que entran solo en el
  inventario estático).

## Cierre

Commit local en `restructura-ui` con el doc 50, esta bitácora, las 38 capturas, los scripts de `scripts/ops/auditoria-ui/`
y la línea de OPEN_LOOPS; PR contra `main` para lectura, sin unir. Apagados `next start` y el respaldo; `.env.local`
borrado; simulador «OL-227 iPhone 17 Pro» borrado; `CLAUDE.md` intacto. El `node_modules` y `.next` del árbol quedan
(ignorados por git). Siguiente paso: las cuatro decisiones del founder (doc 50, sección 11) → prototipo de pantallas
reales en `docs/rediseno/prototipos/restructura-ui*.html` → plan definitivo y piezas para operadores.

## Segunda parte (mismo día): el prototipo interactivo

**Lo que contestó el founder al primer avance:** «Me gusta el "+" de publicar pero entonces qué icono usamos para "Voy"
y "Seguir"? cómo puedes mejorar fichas? siento poca estructura y se aprovecha poco el espacio, estaba pensando en crear
kpi's, optimizar lectura, mejorar la estructura de diseño. Quiero ver primero prototipos por favor y dime si quieres
ayuda de claude design o tú tienes suficiente habilidad de diseño. Tenemos pendiente proyecto de cargadores y
transiciones, creo que lo podemos incluir en esta pasada, acepto tus recomendaciones en general. vamos viendo cómo se
siente». Respuesta: Voy = palomita en contorno (modelo de Facebook), Seguir = persona con «+» (X, LinkedIn,
Instagram), decidido = palomita verde llena en los tres; fichas con KPI y estructura; el prototipo en HTML con las
variables reales (Claude Design solo si al verlo quiere explorar variantes visuales); cargadores y transiciones dentro.

**Lo hecho.** `docs/rediseno/prototipos/restructura-ui.html` (148 KB, un archivo): la app entera dentro de un aparato
que cambia de tamaño (teléfono 390×844 con franja de hora e indicador, tableta 820×1180, escritorio 1280×800) con el
**mismo marcado**: las reglas responsivas son consultas de contenedor (`@container`) sobre el aparato, que en la app real
serán `@media` con los mismos números (624/792/1048 incluyen los 24 px del marco). Ocho pantallas reales con datos
verosímiles y los carteles públicos del sitio: Inicio (seis carriles), Agenda, Lugares (mapa y lista), Artistas, ficha
de evento, ficha de lugar, alta de evento, Ajustes; más la hoja de publicar, la hoja del pin del mapa y el aviso con
Deshacer. Se genera con un script de Python en el scratchpad a partir del sprite de iconos de la app
(`src/components/ui/Iconos.tsx`), el logotipo inline y el mapa base del prototipo firmado `mapa-lugares.html`.

**Cómo está maquetado (la regla de la pieza, cumplida en el prototipo):** un solo `:root` con las variables de la
sección 5.1 del doc 50; `.app` es una rejilla de dos áreas (`pantalla`, `nav`) que en tableta y escritorio pasa a dos
columnas (`nav pantalla`); cada pantalla es una rejilla de una columna con `grid-auto-rows: max-content` (lección de
esta sesión: un contenedor de desplazamiento con altura definida encoge las filas `auto` de los hijos con `overflow:
hidden`; `max-content` lo evita); la página no lleva gutter, cada bloque pone el suyo (`margin-inline: var(--gutter)`),
así no hay márgenes negativos en todo el archivo; la cabecera es una sola pieza pegajosa con filas `minmax(0, 1fr)
minmax(0, 1fr) auto auto` que pasan a `minmax(0, 0fr)` al bajar (con el relleno a cero), sin JavaScript de alturas ni
`margin-top` negativo; el mapa llena la fila central (`auto minmax(0, 1fr)`) sin `calc` de alturas; renglón único con
cuatro pieles (`lista`, `dato`, `ajuste`, `resuelto`); `BotonIcono` con tres tamaños (44, 48, 56) y tres relieves
(plano, contorno, elevado); `Boton` con primario, secundario, texto y decidido; chips, segmento, pestañas, palanca.
Transiciones: `document.startViewTransition` con `view-transition-name: cartel` (el cartel tocado se convierte en la
portada), fundido de 200 ms entre secciones, la tarea sube en 250 ms; respaldo con `@keyframes` donde no exista y
nada con `prefers-reduced-motion: reduce`; un temporizador de 700 ms salta la transición si el navegador la congela
(el panel integrado de la app frena las animaciones cuando está oculto). Esqueletos de renglón con los mismos tokens al
entrar por primera vez a Agenda y Artistas.

**Tropiezos que quedaron corregidos y sirven de aviso a las piezas de código:** (1) una caja no puede consultarse a
sí misma con `@container`: el contenedor es el aparato, no `.app`; (2) `<use>` de un símbolo con `viewBox` negativo
necesita `width`/`height` en el `<use>` y un `viewBox` positivo en el `<svg>` de destino; (3) `grid-template-rows:
0fr` no colapsa un hijo con altura fija ni con relleno: altura `auto`, `min-height: 0`, `overflow: hidden` y relleno a
cero al compactar; (4) el manejador del segmento «Mapa · Lista» buscaba `[data-vista]` y se tragaba todos los toques
de Lugares porque la sección también lleva ese atributo; (5) al compactar la cabecera el scroll se recoloca solo y
disparaba el estado contrario: 300 ms de reposo tras cada cambio, como ya hace `ui/Cabecera` en la app.

**Verificación:** navegador integrado de la app (Chromium) para cada pantalla y tamaño, con medidas de rejilla por
JavaScript (`getComputedStyle(...).gridTemplateRows`, `getBoundingClientRect`) cuando la captura no bastaba; capturas
finales con el Chrome real de la Mac vía `playwright-core` (`scripts/ops/auditoria-ui/capturar-prototipo.mjs`, 2× en
teléfono, 1,5× en tableta, 1× en escritorio), comprimidas a PNG de paleta.

### Capturas del prototipo (`docs/rediseno/capturas-256/256-30…49-proto-*.png`), abiertas y descritas

- **`256-30-proto-inicio-telefono`:** cabecera única (SMSNSTRS, «+» con contorno, campana con punto, avatar; chip de
  ciudad y campo Buscar), «Tus planes» con dos tarjetas (sello «1 va» / «2 van», palomita verde), «Destacados» con
  carteles verticales y la palomita en contorno sobre la foto; nav abajo con Inicio activo. Sin botón flotante.
- **`256-31-proto-agenda-telefono`:** cabecera con fecha, ciudad, Buscar y pestañas «Todos · Siguiendo»; «Hoy · 2»;
  renglones de dos líneas de meta («18:00 · Templo de San Francisco», «Gratis»), palomita en contorno a la derecha.
- **`256-32-proto-agenda-compacta-telefono`:** tras bajar, solo quedan las pestañas (44 px) bajo la franja de la hora;
  renglones con «Vas» como chip y el decidido en verde lleno.
- **`256-33-proto-lugares-mapa-telefono`:** segmento «Mapa · Lista» y chips de tipo en la misma fila; el mapa llena
  hasta la nav; puntos negros, días en violeta (Dom, Jue), destacado en naranja (Museo del Ferrocarril) y seguidos en
  verde (MUNI, San Miguelito) sin encimarse; ubicación abajo a la izquierda; atribución.
- **`256-34-proto-lugares-lista-telefono`:** la lista del directorio con foto 56, nombre, «Galería · Valentín Gama
  840, Centro · 1,6 km», «Próximo: …», persona con «+»; el seguido en verde.
- **`256-35-proto-artistas-telefono`:** chips de disciplina y tira de letras en la cabecera; renglones con foto redonda
  (símbolo SN cuando no hay), «Rock, metal y alternativo · Grupo» en una línea, persona con «+».
- **`256-36-proto-ficha-evento-telefono`:** barra interior (chevron con contorno, logotipo, ···); portada 5:3 con el
  cartel entero sobre su tono; título; tres KPI (Cuándo, Cuánto, Quiénes); tres acciones alineadas a la izquierda;
  tarjeta «Dónde» con minimapa; barra fija «☆ Me interesa | ✓ Vas · Ya estás en la lista».
- **`256-37-proto-ficha-evento-abajo-telefono`:** el resto de la ficha: dirección con chevron, «Con» (chip de artista),
  «Sobre el evento», «Quién va» (pila de avatares y nombres), pie.
- **`256-38-proto-ficha-lugar-telefono`:** portada, título con chip «Museo», KPI (Dónde y distancia, Eventos,
  Comunidad), **cinco acciones en una fila** (Cómo llegar, Compartir, Sitio web, Facebook, Instagram), «Próximos
  eventos», «+ Seguir» fijo.
- **`256-39-proto-hoja-publicar-telefono`:** la hoja del «+»: Un evento, Un lugar, Un artista, con el renglón de ajuste.
- **`256-40-proto-alta-evento-telefono`:** barra de tarea (logotipo, ✕); tarjeta del cartel; campo con lupa; renglones
  Cuándo, Dónde (Estoy aquí, Buscar), Quién, Cuánto, Más; «Publicar evento» apagado con una sola nota debajo.
- **`256-41-proto-ajustes-telefono`:** cabecera de perfil (avatar, nombre, colonia y correo, Editar); grupos Tu ficha,
  Avisos (palancas), Cuenta, Somos Nosotros con el mismo renglón de ajuste.
- **`256-42-proto-inicio-tableta`:** carril lateral (logotipo, cuatro destinos, «+» Publicar, Novedades, Ana); carriles a
  lo ancho con tres o cuatro tarjetas a la vista; cabecera con ciudad y Buscar.
- **`256-43-proto-lugares-tableta`:** panel de lista a la izquierda y mapa a la derecha; chips de tipo arriba.
- **`256-44-proto-inicio-escritorio`:** lo mismo a 1280: cuatro carteles de «Destacados» completos.
- **`256-45-proto-agenda-escritorio`:** lista en la columna con títulos de día; palomitas a la derecha; sin flotante.
- **`256-46-proto-lugares-escritorio`:** panel de 400 y mapa; el segmento no hace falta.
- **`256-47-proto-ficha-lugar-escritorio`:** dos columnas: foto y cinco acciones a la izquierda; título, chip, KPI,
  «Próximos eventos» y «Dónde» a la derecha; «Seguir» abajo a la izquierda.
- **`256-48-proto-ficha-evento-escritorio`:** dos columnas: cartel y acciones; título, KPI, «Dónde», «Con», «Sobre»;
  barra fija con el par de botones.
- **`256-49-proto-alta-evento-escritorio`:** el alta centrada en 600 px con el carril a la izquierda y la ✕ arriba a la
  derecha.

## Cierre (segunda parte)

Commit en `restructura-ui` con el prototipo, las 20 capturas, el doc 50 (sección 6 y estado) y esta bitácora; push al
PR #266. El servidor estático del scratchpad y el navegador integrado se usaron solo para revisar; nada queda corriendo
que toque producción. Siguiente paso: el founder lo prueba («vamos viendo cómo se siente»), corrige, y con su firma se
cierra el plan por piezas (doc 50, sección 7) y se abren los operadores.

## Tercera parte (mismo día): prototipo v2 tras tres vueltas más del founder

### Lo que pidió

Sobre la v1, en tres mensajes seguidos: el campo de búsqueda desplegado «no suma nada… se ve poco minimalista»; en los
iconos de ir «se redunda el envolvente circular… de las propuestas que más me decepcionan»; en los accionables de
listado «el contorno blanco no me gusta, por eso estaba a favor de elevación… estética solamente»; el estado siguiendo
«muestra un icono en azul en un contenedor verde, el icono no se ve… ese error de accesibilidad es básico»; el «+»
«pierde demasiado protagonismo, podría ir por una estructura tipo Instagram: izquierda "+", centro el logo, derecha
notificaciones, con el perfil integrado en navbar»; cuestionar si el buscador va a la barra inferior; filtros «en línea
de buscador pero más como un accionable que despliega listado multiselección en bottom sheet»; «no me gusta dónde se
colocó segmented mapa/lista»; «Analiza, cuestiona, propón». Luego: al presionar «+», «un componente similar al de
Instagram… tabs en la base con los tipos de publicación, tomando en cuenta el contexto para elegir qué tab mostrar».
Y sobre Inicio y fichas: «gaps de sección de inicio, especialmente el de título y slider se ve muy amplio»; «fichas
con héroe ancho completo y la imagen cover»; «cards de KPI del mismo alto, KPI de ubicación solo distancia sin
colonia, "Dónde" no se entiende»; «"Con" debe decir algo como Artistas… propón acorde al estilo de comunicación»;
«el listado debajo debería tener angle del lado derecho»; «la ficha de artista igual debe mejorar». Ofreció dos veces
la ayuda de Claude Design.

### Qué cambió en el prototipo (detalle en el doc 50, § 6.2)

Barra raíz tipo Instagram («+», logotipo, lupa, campana) y Perfil como quinto destino de la barra inferior; la lupa
abre la pantalla de búsqueda (sin campo desplegado); fila de filtros = Filtros con conteo · ciudad · activos con ✕, y
hoja inferior de selección múltiple por sección; Lugares sin segmento: mapa entero y la lista en una hoja de tres
alturas con tarjeta del pin (panel fijo desde 792 px); acciones Voy/Seguir elevadas, una sola palomita, decidido verde
con glifo blanco; «+» abre publicar con el formulario por contexto y la tira EVENTO · LUGAR · ARTISTA; Inicio con
secciones a 16 px y título a 14 px del carril; fichas con cover 4:3, tres KPI del mismo alto y etiquetas Fecha · Costo
· Van / Distancia · Eventos · Seguidores / Fechas · Seguidores · Lugares, «Artistas» con chevrones, ficha de artista
completa; en escritorio la portada a la izquierda y todo lo demás corre por la derecha.

### Cómo se revisó y qué se encontró

Tres tandas de 25 capturas con el Chrome real (teléfono a 2×, tableta a 1,5×, escritorio a 1×), abiertas una por una:

1. **Primera tanda:** doce capturas de teléfono salieron con la hoja de filtros encima. No era la captura: **la hoja no
   se cerraba**. El manejador de clics buscaba `[data-hoja]` antes que `[data-cerrar]`, y el contenedor de la hoja
   también lleva `data-hoja`, así que ✕, «Ver N» y el fondo la volvían a abrir. Se reordenó y se excluyó el contenedor;
   prueba automática: abre, y cierra con ✕, con el fondo y con «Ver 23 eventos».
2. **Segunda tanda:** la barra Me interesa · Vas apareció a media pantalla al bajar en la ficha. **Las barras al pie
   estaban en `position: absolute` dentro del contenedor que desplaza** (se mueven con el contenido); igual la tira de
   modos del alta. Pasan a `position: sticky; bottom: 0` como último hijo, sin padding reservado; el alta reparte sus
   filas `auto 1fr auto` para que la tira quede abajo también con un formulario corto. Medido: 0 px del pie con el
   scroll en 0, en 600 y al final, en ficha y en alta.
3. Con la medición del DOM sobre las once pantallas: la tarjeta del pin no cabía en la hoja «asoma»; un `<span>` sin
   estilo alrededor del chevron y de opciones únicas; la pila de avatares y el chip con ✕ con márgenes negativos; el
   botón de las tarjetas redondas fuera de su caja; el resumen del panel de escritorio con el gutter de la página. Todo
   cerrado; **tercera tanda limpia**, 0 errores de página.

Se añadió a `scripts/ops/auditoria-ui/medir.js` la comprobación de contraste de los iconos de control (color del
glifo contra el fondo real del botón, umbral 3:1): así el error del violeta sobre verde no vuelve a pasar sin aviso.

| Medida (v2, teléfono, once pantallas) | Resultado |
|---|---|
| Envoltorios sin estilo | 0 |
| Desbordes | 0 |
| Márgenes negativos | 0 |
| Iconos de control < 3:1 | 0 |
| Profundidad máxima | 6 (alta, Lugares) |
| Nodos | 33 (Buscar) a 229 (Inicio) |
| Controles < 44 px | chips 36 (44 al tacto), tira de letras 34×36, asa 28, `input` dentro de campos de 48, palancas 51×31, enlace «Reportar» en párrafo |

### Capturas del prototipo v2 (`docs/rediseno/capturas-256/256-50…74-v2-*.png`), abiertas y descritas

- **`256-50-v2-inicio-telefono`:** barra «+» · SMSNSTRS · lupa · campana con punto; chip de ciudad; «Tus planes» con
  tarjetas apaisadas (sello «1 va», palomita verde elevada arriba a la derecha); «Destacados» con carteles verticales
  (uno decidido, otro con palomita violeta sobre blanco); barra inferior de cinco: Inicio, Agenda, Lugares, Artistas,
  Perfil (avatar).
- **`256-51-v2-agenda-telefono`:** fila Filtros · San Luis Potosí; días «Hoy · 2», «Mañana», «mié 30 de sep»; renglones
  con foto, título de dos líneas, hora · lugar, costo · asistentes, sello «Vas»; botones elevados.
- **`256-52-v2-agenda-compacta-telefono`:** tras bajar, la barra raíz desaparece y la fila de filtros queda pegada
  arriba; la lista sigue.
- **`256-53-v2-filtros-telefono`:** la hoja «Filtros» sobre Agenda: Cuándo (Hoy, Mañana, Fin de semana, Elegir
  fecha), Cuánto (Gratis, Cooperación), Siguiendo (palanca «Solo lo que sigo»), Dónde (San Luis Potosí · La ciudad
  ordena, no limita · Cambiar); pie Limpiar · «Ver 23 eventos».
- **`256-54-v2-lugares-mapa-telefono`:** Filtros (1) · ciudad · chip activo «Museo ✕»; el mapa llena la pantalla con
  ubicación y atribución; la hoja asoma con «62 lugares · los más cercanos primero» y el primer renglón (decidido).
- **`256-55-v2-lugares-hoja-media-telefono`:** la hoja a media altura con el asa, el resumen y cuatro renglones con
  su botón Seguir elevado.
- **`256-56-v2-lugares-pin-telefono`:** tras tocar un pin, la hoja muestra la tarjeta del Museo del Ferrocarril
  (foto, tipo · dirección, próximo evento, Seguir), «Ver la ficha» y «Volver a la lista», completa.
- **`256-57-v2-artistas-telefono`:** Filtros (1) · ciudad · «Música ✕»; tira de letras «# A B C…» con la actual en
  violeta; grupos «#» y «A» con avatares redondos y Seguir elevado; uno decidido en verde.
- **`256-58-v2-perfil-telefono`:** Perfil como pestaña: avatar, nombre, colonia, Ajustes; tres KPI (Voy 2, Me
  interesa 1, Sigo 2) del mismo alto; chips Voy · Me interesa · Sigo; la lista de planes; «Así te ven los demás».
- **`256-59-v2-ficha-evento-telefono`:** barra Atrás · logotipo · más; portada a todo lo ancho en cover con la lupa
  flotante; título; KPI Fecha (vie 2 oct / 19:00) · Costo (Gratis) · Van (2) del mismo alto; Compartir, A mi
  calendario, Cómo llegar; «Dónde»; barra fija Me interesa · Vas.
- **`256-60-v2-ficha-evento-abajo-telefono`:** tras bajar: Dónde con minimapa y renglón con chevron; «Artistas» con el
  colectivo y chevron; Sobre el evento; Quién va (pila de avatares, chevron); pie con Reportar; la barra fija sigue
  abajo.
- **`256-61-v2-ficha-artista-telefono`:** avatar redondo, nombre, disciplinas · tipo · ciudad, Compartir; KPI Fechas ·
  Seguidores · Lugares; Instagram, Sitio web, YouTube; Próximas fechas con su Voy; barra fija «Seguir».
- **`256-62-v2-ficha-lugar-telefono`:** foto en cover; título de dos líneas y píldora MUSEO; KPI Distancia (1,4 km) ·
  Eventos (3 próximos) · Seguidores (48); cinco acciones; barra fija «Seguir».
- **`256-63-v2-alta-lugar-telefono`:** «Registrar un lugar» abierto desde Lugares: campo con lupa, Dónde (Estoy aquí,
  Buscar), Tipo, Más, «Publicar lugar» apagado con «Falta el nombre y dónde está»; tira EVENTO · LUGAR · ARTISTA con
  LUGAR marcado.
- **`256-64-v2-alta-evento-telefono`:** al tocar EVENTO en la tira: tarjeta del cartel, campo, Cuándo, Dónde, Quién,
  Cuánto, Más, «Publicar evento»; la tira abajo con EVENTO marcado.
- **`256-65-v2-buscar-telefono`:** campo «Buscar un evento, lugar o artista» con ✕; «En San Luis Potosí»; Recientes
  (evento, lugar, artista); Esta semana (Cine, Gratis, Fin de semana, Centro).
- **`256-66-v2-inicio-tableta`:** carril lateral (marca, cinco destinos, Publicar violeta, Buscar, Novedades) y el
  mismo Inicio con carriles más anchos.
- **`256-67-v2-lugares-tableta`:** panel izquierdo con el resumen y la lista, mapa a la derecha con ubicación.
- **`256-68-v2-inicio-escritorio`:** carril, chip de ciudad, «Tus planes» y «Destacados» con cuatro carteles.
- **`256-69-v2-agenda-escritorio`:** fila Filtros · ciudad y la agenda a una columna de 960.
- **`256-70-v2-lugares-escritorio`:** panel de 400 px con «62 lugares · los más cercanos primero» en un renglón, mapa
  con pins y etiquetas, ubicación.
- **`256-71-v2-ficha-lugar-escritorio`:** foto 5:3 a la izquierda; título, MUSEO, KPI, cinco acciones, Próximos eventos
  y Dónde por la derecha; «Seguir» fijo abajo.
- **`256-72-v2-ficha-evento-escritorio`:** cartel a la izquierda; título, KPI, acciones, Dónde, Artistas por la
  derecha, sin hueco entre título y KPI; Me interesa · Vas fijo.
- **`256-73-v2-ficha-artista-escritorio`:** cabecera y enlaces a la izquierda; KPI, Próximas fechas, Sobre, Se presenta
  en por la derecha; «Seguir».
- **`256-74-v2-alta-evento-escritorio`:** el formulario centrado en una columna de 600 con la tira de tipos abajo.

### Cierre (tercera parte)

Commit en `restructura-ui` con el prototipo v2, las 25 capturas, el doc 50 (§ 6 y § 11 reescritos; H-13, H-37, 5.2,
P4 a P6 y § 10 ajustados), la fuente del prototipo y los scripts de captura y medición en `scripts/ops/auditoria-ui/`,
esta bitácora y OPEN_LOOPS; push al PR #266; artefacto republicado con los carteles incrustados. Pendiente: que el
founder pruebe la v2 y confirme o corrija los cinco puntos del doc 50 § 11; con su firma, plan definitivo por piezas
y operadores nuevos.

## Cuarta parte (mismo día): prototipo v3 tras la quinta vuelta del founder

### Lo que pidió

Sobre la v2, tres mensajes seguidos. Primero: «¿primero colocamos ubicación y luego filtros, fecha, chips de filtros,
etc.? Usas diferentes estilos para selector de lugar en Inicio que en el resto de la app… ¿agregarías selector de
fecha en Inicio? ¿La fecha (Cuándo) debería permanecer fuera de filtros? ¿Es necesario mantener en el menú la opción
de agenda?»; en Lugares, «al seleccionar un pin podríamos mostrar directamente la ficha del lugar en drawer… el drawer
debería poderse cerrar y hay que colocar el menú de ediciones/reportes… la ficha se muestra sobre el drawer de lista y
al cerrar se regresa al estado anterior manteniendo scroll; lo mismo un elemento del listado abre ficha»; en la
ficha, «héroe y en la base del héroe las letras, dentro del contenedor de imagen, sobre la imagen, con un pequeño
degradado… el icono de lupa sobre imagen no es necesario, es intuitivo el tap para verla en grande… otra posición es
la zona tool bar, pues ya no aplicaría poner logo, quiero ver las dos»; «el icono de seguir lugares es el de seguir
personas, busca si hay otro más apropiado»; «Cuestiona lo que te digo, identifica áreas de oportunidad y propón
soluciones». Segundo: «cuando hacemos scroll down se oculta navbar para liberar más espacio, se vuelve a mostrar al
hacer scroll up, como el comportamiento en header. Te vuelvo a llamar atención por la maquetación, elemento de lugar
se desalinea en tableta y escritorio». Tercero: «para tablet y desktop probemos top bar en ancho completo, logotipo en
centro, publicar en el extremo superior izquierdo, buscar y novedades a la derecha; en sidebar dos grupos, el perfil
en el extremo inferior izquierdo y el resto de las opciones del menú arriba. Cuestiona lo que te digo». Y un cuarto,
antes de enseñar la v3: «presenta fecha del evento en chip para que al seleccionarlo se muestre listado filtrado por
esa fecha (hoy, mañana, mié 30 sep). Retoma cuestionamiento de estilo de letra para listados y cards, resuelve si se
puede usar otra letra que facilite lectura y que sea más pequeña; en esos textos queremos súper legibilidad y tamaño
moderado. La barra de bottom con las opciones de ficha, "voy" "seguir" y sus estados necesita trabajo de diseño,
rediséñalas, considera colocar acciones flotando; "vas" tiene interlineado muy grande, tampoco se justifica "Ya estás
en la lista" dentro del botón». Y cuatro correcciones más al ver la v3 en marcha: «Elimina la idea de los chips de
fecha»; «te vuelvo a llamar la atención en el maquetado: pusiste una línea en bottom de color gris debajo de header y
antes de filtros»; «¿Qué pasó con Inicio?»; «las sheets deben tener botón de cerrar en sheet»; «cuando abres sheet
la información de sheet debe estar dentro de esa sheet, estás usando la barra del sitio para poner información de
sheet»; «los héroes de ancho completo y el título dentro de la imagen van en el sentido de integrar elementos»; «lo
más alarmante es que no consideres la sección de Inicio que habíamos definido». También reprochó no haber contestado
sus ofrecimientos de ayuda de Claude Design: se acepta (doc 50 § 11, punto 32).

### Qué cambió en el prototipo (detalle en el doc 50, § 6.5)

- Una sola fila de contexto en todas las raíces con el mismo chip: ciudad · Cuándo · Filtros · activos. Cuándo sale de
  la hoja de filtros y abre la suya; la ciudad abre «Dónde estás». El selector sin borde de Inicio y el de Buscar se
  fueron.
- Inicio conserva sus seis carriles y gana la fila de contexto; un valor en Cuándo (o los títulos Destacados, Esta
  semana y Nuevos eventos) muestra la lista por día dentro de Inicio y Limpiar devuelve los carriles; Agenda sale del
  menú. Barra inferior de cuatro destinos (Inicio · Lugares · Artistas · Perfil). Una primera pasada había fundido las
  dos pantallas en «Eventos» sin carriles; el founder la paró y se corrigió.
- Ficha de lugar dentro de la hoja de Lugares al tocar un pin o un renglón: capa sobre la lista (la lista conserva su
  desplazamiento), hoja a media altura; todo dentro de la hoja: el héroe arriba con el título y la etiqueta dentro de
  la imagen, el asa, el menú y Cerrar elevados sobre la imagen, y una cabecera compacta pegajosa al desplazar; la
  barra del sitio no cambia; cerrar devuelve la hoja a su estado. En tableta y escritorio, dentro del panel. La
  tarjeta intermedia del pin se fue.
- Título de la ficha en dos variantes con conmutador: sobre la imagen (velo al pie del héroe, con el título en la barra
  al desplazar) o en la barra. Sin lupa: la portada abre un visor.
- Campana con «+» para seguir lugares (muestrario con marcador y pin); persona con «+» sigue para artistas.
- La barra inferior se esconde al bajar y vuelve al subir, con la misma regla que la barra de arriba (que se recoge
  hasta la franja de estado). En Lugares no se esconde.
- Barra superior única a todo lo ancho en los tres tamaños («+» · logotipo · lupa · campana) y carril lateral en dos
  grupos (secciones arriba, Perfil abajo). Las barras de ficha y de tarea llevan el título en vez del logotipo.
- Carril con `subgrid` (foto, título y meta alineados entre tarjetas); cada día o letra en su `section` con el título
  pegajoso que empuja al anterior.
- La fecha de cada día como chip que filtraba la lista se hizo y el founder la retiró el mismo día: los títulos de día
  vuelven a ser texto y el día se elige solo en la hoja Cuándo.
- Sin línea gris entre la barra de la app y la fila de contexto (la barra llevaba su propio filete además del de la
  fila).
- Letra de listas y tarjetas en tres opciones con conmutador: Inter 16/14 (propuesta, por defecto), Bricolage ancha
  16/14 y Bricolage condensada 19/15 (v2). La marca sigue en títulos, chips de fecha, KPI y botones.
- Acciones de la ficha como pastillas flotantes de una línea (Me interesa · Voy; Seguir) con estados Vas, Te interesa
  y Sigues, aviso con Deshacer; fuera la barra al pie y el botón de dos líneas. Dentro de la hoja de Lugares la
  portada pasa a 16:9.

### Cómo se revisó y qué se encontró

Primero se cazó lo que el founder señaló («elemento de lugar se desalinea en tableta y escritorio») con capturas
nuevas de la v2 en tableta y escritorio (Inicio desplazado hasta «Lugares con eventos», panel de Lugares con pin,
Perfil, ficha de artista): el renglón del pin llevaba 20 px más de sangría que la lista porque una regla de más peso
le devolvía el relleno; la fila de filtros de Lugares flotaba con el gutter de la columna centrada y no seguía al
panel; y en los carriles la línea de meta bailaba según el título tuviera una o dos líneas. Los tres se cierran en la
v3 (doc 50, § 6.6). Luego tres rondas de captura con el Chrome de la Mac (36 capturas por ronda, cada PNG abierto):
la primera mostró la tarjeta del carril con la foto a 111 px en una columna de 165 (foto y sello competían por la
fila 1 sin columna explícita) y el esqueleto de carga encima de la lista al arrancar; la segunda, los títulos de día
sin empuje entre sí (cada día pasa a su `section`); la tercera, limpia, con cero errores de página y cero respuestas
4xx/5xx. Con la sexta vuelta y las correcciones al verla, cinco tandas más (chips de fecha retirados, Inicio de
vuelta, sin línea bajo la barra, la hoja autónoma con su cabecera dentro, y la fila de la portada en la hoja pasada de
`auto` a `max-content` porque una fila `auto` no contaba la altura de una figura con `aspect-ratio` estirada y el
héroe se salía sobre los KPI); dos tandas más antes: la primera mostró los cuatro destinos de la navegación con sombra y fondo
blanco (la clase nueva de las pastillas chocaba con la del icono de la navegación), el aviso encima de las pastillas y
la pastilla tapando el título de la ficha en la hoja a media altura; la segunda, limpia. `medir.js` sobre las diez
pantallas: 0 envoltorios, 0 desbordes, 0 márgenes negativos (uno en Buscar, retirado), 0 iconos por debajo de 3:1;
los controles por debajo de 44 son los mismos de la v2.

### Capturas del prototipo v3 (`docs/rediseno/capturas-256/256-75…115-v3-*.png`), abiertas y descritas

- **`256-75-v3-inicio-telefono`:** barra «+» · logotipo · lupa · campana sin filete; fila San Luis Potosí ⌄ · Cuándo ·
  Filtros; los carriles Tus planes y Destacados (subgrid: títulos y metas alineados, en Inter); barra de cuatro
  destinos con Inicio.
- **`256-76-v3-inicio-guardada-telefono`:** tras bajar: la barra recogida hasta la franja de estado, la fila de
  contexto pegada, la navegación escondida; los carriles ocupan todo.
- **`256-77-v3-inicio-vuelve-telefono`:** tras subir 20 px: barra y navegación de vuelta.
- **`256-78-v3-cuando-telefono`:** hoja Cuándo con Hoy · Mañana · Fin de semana · Esta semana · Elegir fecha… · Todos
  los próximos, su ✕, Limpiar y «Ver 23 eventos».
- **`256-79-v3-ciudad-telefono`:** hoja «Dónde estás» con la nota «la ciudad ordena, no limita» y Cerca de ti · San
  Luis Potosí (✓) · Otra ciudad.
- **`256-80-v3-filtros-telefono`:** hoja Filtros de eventos solo con Cuánto y Siguiendo (Cuándo y Dónde ya viven fuera).
- **`256-81-v3-inicio-lista-fin-de-semana-telefono`:** Inicio en modo lista: el chip Cuándo en violeta con «Fin de
  semana» (la fila se desplaza) y la lista por día en lugar de los carriles.
- **`256-82-v3-lugares-mapa-telefono`:** mapa entero, fila ciudad · Filtros 1 · Museo ✕, la hoja asomando (radio 24)
  con el resumen y el primer renglón (campana con «+»), encima de la navegación.
- **`256-83-v3-lugares-hoja-llena-telefono`:** la lista de Lugares a pantalla completa tras subir la hoja: el asa
  arriba, «62 lugares · los más cercanos primero» y los renglones; la navegación se guarda.
- **`256-84-v3-lugares-pin-ficha-telefono`:** tras tocar el pin: la barra del sitio y la fila siguen arriba, el mapa
  en medio, la hoja a la altura justa de foto + KPI: héroe 3:2 con el asa, Cerrar (izquierda) y ⋯ (derecha)
  elevados sobre la imagen, MUSEO y el título dentro de la imagen sobre el velo, los tres KPI enteros y la pastilla
  «Seguir» flotando debajo.
- **`256-85-v3-lugares-ficha-llena-telefono`:** la hoja llena es una página completa: cubre barra, filtros y mapa, la
  navegación se guardó; Atrás (en vez de Cerrar) y ⋯ sobre el héroe bajo la franja de estado, KPI, cinco acciones,
  Próximos eventos; la pastilla al pie.
- **`256-86-v3-lugares-ficha-desplazada-telefono`:** desplazada dentro de la hoja llena: la cabecera compacta pegajosa
  (asa, ‹, Museo del Ferrocarril Jesús García…, ⋯) sobre Próximos eventos y Dónde.
- **`256-87-v3-lugares-cerrada-telefono`:** tras Cerrar: vuelve la barra de la app, la fila y la hoja «asoma».
- **`256-88-v3-artistas-telefono`:** fila ciudad · Filtros 1 · Música ✕, tira de letras, renglones con persona «+».
- **`256-89-v3-perfil-telefono`:** cabecera, KPI Voy · Me interesa · Sigo (campana), chips y la lista por día.
- **`256-90-v3-ficha-evento-telefono`:** el canon de la hoja: cartel 3:2 arriba a todo lo ancho con Atrás y menú
  elevados encima y «LXS COLOCAOS: La última fogueada» a 19 px sobre el velo; KPI (vie 2 oct · 19:00, Gratis, 2 van),
  acciones, Dónde; las pastillas «☆ Me interesa» y «✓ Vas» (verde) flotando.
- **`256-91-v3-ficha-evento-desplazada-telefono`:** el título en la barra al desplazar; Dónde, Artistas, Sobre.
- **`256-92-v3-ficha-evento-abajo-telefono`:** más abajo: Dónde, Artistas y Sobre el evento bajo la barra compacta;
  las pastillas siguen flotando.
- **`256-93-v3-visor-telefono`:** el cartel entero a pantalla completa sobre fondo oscuro con ✕.
- **`256-94-v3-ficha-artista-telefono`:** el héroe del artista con el símbolo SN como placeholder, ARTES VISUALES,
  «Aaron Cadena» y la meta dentro de la imagen, Atrás y menú flotando; KPI, Compartir y enlaces, Próximas fechas; la
  pastilla «Seguir» con persona «+» flotando.
- **`256-95-v3-ficha-lugar-completa-telefono`:** la ficha de lugar a pantalla completa (desde el Dónde de un evento):
  Atrás · ⋯, héroe 4:3 con título y MUSEO, KPI, acciones; la pastilla «Seguir» con campana flotando.
- **`256-96-v3-alta-lugar-telefono`:** barra con «Registrar un lugar» y ✕ (sin logotipo), campo, renglones, tira de
  tipos.
- **`256-97-v3-buscar-telefono`:** campo, el mismo chip de ciudad que en las raíces, Recientes y atajos.
- **`256-98-v3-iconos-seguir-lugar`:** el cuerpo de la hoja con el mismo renglón tres veces: campana con «+»
  (propuesta), marcador con «+», pin con «+».
- **`256-99-v3-inicio-tableta`:** barra a todo lo ancho, la fila de contexto centrada, y el carril (Inicio · Lugares ·
  Artistas arriba, Perfil abajo) que empieza donde termina esa fila; los carriles de Inicio con el radio sugerido.
- **`256-100-v3-lugares-ficha-tableta`:** la ficha dentro del panel (Cerrar y ⋯ sobre el héroe 3:2, MUSEO y título
  dentro, KPI, acciones, Próximos eventos, «Seguir» flotando) con el mapa y la fila de contexto a la vista.
- **`256-101-v3-inicio-escritorio`:** lo mismo a 1280; filtros centrados, carril bajo la fila, las tarjetas con foto,
  título y meta alineados.
- **`256-102-v3-lugares-escritorio`:** panel y mapa; la fila de contexto ahora va con el relleno del panel.
- **`256-103-v3-lugares-ficha-escritorio`:** la ficha en el panel con Cerrar y ⋯ sobre el héroe y el título dentro.
- **`256-104-v3-lugares-ficha-desplazada-escritorio`:** al desplazar, la cabecera compacta del panel con el título.
- **`256-105-v3-ficha-evento-escritorio`:** en escritorio: barra de la app, barra de ficha (Atrás · ⋯) arriba,
  cartel a la izquierda, el título en la columna derecha y las pastillas abajo a la derecha.
- **`256-106-v3-ficha-lugar-escritorio`:** la ficha de lugar completa en escritorio: barra, foto 5:3 a la
  izquierda; etiqueta, título, KPI, acciones y Próximos eventos por la derecha; «Seguir» flotando.
- **`256-107-v3-ficha-artista-escritorio`:** el placeholder 5:3 a la izquierda; etiqueta, nombre, meta, KPI,
  acciones y fechas por la derecha, como la de lugar; «Seguir» flotando.
- **`256-108-v3-alta-evento-escritorio`:** barra con «Publicar un evento» y ✕; formulario centrado; tira de tipos.
- **`256-109-v3-perfil-escritorio`:** Perfil con el carril lateral marcando el destino de abajo.
- **`256-110-v3-letra-bricolage-telefono`:** Inicio en modo lista (Todos los próximos) en Bricolage condensada
  19/15: la letra que se queda.
- **`256-111-v3-letra-bricolage-ancha-telefono`:** la misma lista en Bricolage al ancho 100, 16/14 (descartada).
- **`256-112-v3-letra-inter-telefono`:** la misma lista en Inter 16/14 (descartada).
- **`256-113-v3-ficha-evento-voy-telefono`:** tras tocar «Vas»: la pastilla vuelve a «✓ Voy» en violeta y el aviso
  «Ya no vas a…» con Deshacer, por encima de las pastillas.
- **`256-114-v3-ficha-evento-te-interesa-telefono`:** tras tocar «Me interesa»: «★ Te interesa» en violeta sobre
  blanco y el aviso.
- **`256-115-v3-lugares-ficha-sigues-telefono`:** en la hoja llena, tras tocar «Seguir»: «✓ Sigues» en verde y el
  aviso.
- **`256-116-v3-lugares-ficha-recogida-telefono`:** la ficha recogida tras jalarla hacia abajo: solo su cabecera
  (asa, ✕, Museo del Ferrocarril Jesús García…, ⋯) sobre la navegación; el mapa entero; no se cierra.
- **`256-117-v3-lugares-recogida-telefono`:** la lista recogida: solo el asa y «62 lugares · los más cercanos primero»
  sobre la navegación; el mapa entero.

### Desde el lienzo de Claude Design

El founder comentó en el lienzo (dos hilos enviados a Claude): «esta es la opción que me gusta, héroe con todo
integrado» sobre la hoja de lugar A (queda como decisión: doc 50 § 11, punto 31) y, sobre un KPI, «no logro
disminuir el alto aquí, debe ser hug al contenido, deja mucho espacio abajo»: los KPI pierden el alto mínimo de 84 px
en el lienzo y en el prototipo (la rejilla los sigue estirando a la fila, así que los tres quedan del mismo alto);
capturas regeneradas. Después editó él mismo la hoja de lugar en el lienzo («observa que he modificado: redondeado de
sheet, posición de accionables X y ⋯, posición de chips, tamaño y posición de título»): se leyó su versión frente a
la generada (radio 24, héroe 3:2, Cerrar a la izquierda y menú a la derecha sobre la imagen, título de 19 px con la
etiqueta encima en violeta) y se pasó al prototipo (doc 50 § 11, punto 34); en el lienzo se le quitó a un KPI el alto
fijo de 33 px que dejó su prueba. Cuatro hilos más en el lienzo, todos decisiones: «me gusta que flotan, muy moderno,
bien hecho» (pastillas flotantes, se quedan); «esta se queda» sobre Bricolage condensada 19/15 (la letra de listas no
cambia; Inter y la ancha, descartadas); «aquí debemos replicar el canon de héroe de sheet, te reto a traerlo acá»
(la ficha a pantalla completa toma el canon de la hoja: héroe 3:2 con Atrás y menú elevados sobre la imagen, título
de 19 px dentro, barra compacta al desplazar; fuera la variante «título en la barra»); «demasiado alto, no es
necesario poner palabra fecha, es obvio» (el KPI de fecha: día y hora en dos líneas, sin etiqueta). Prototipo y
lienzo actualizados; capturas regeneradas. Luego, en el chat: «el comportamiento de sheet es muy torpe y muy poco
intuitivo: que aparezca en el alto suficiente para que se vea foto y KPI; al deslizar hacia arriba dentro del sheet
primero se hace más grande hasta cubrir la pantalla, no es necesario que se vea header ni filtros; luego ya se activa
el scroll interno, pero solo hasta que el sheet alcanza su alto máximo». La hoja se rehízo como un solo contenedor
que desplaza (dos espaciadores invisibles y el cuerpo que asoma): el mismo gesto la sube, la llena y luego desplaza
el contenido, con inercia nativa; se asienta en la altura más cercana al soltar. Probado con la rueda del Chrome
(`probar-hoja.mjs`): abre a foto + KPI, 200 px la llenan, los siguientes desplazan, hacia arriba vuelve, Cerrar
devuelve la lista a su estado. Dos defectos en esa pasada: la barra de la ficha de evento salió al pie en escritorio
(la clase `sobre` chocaba con el bloque «Sobre el evento» y heredaba su área de rejilla: ahora `heroe`) y la hoja
entraba «llena» por un evento disparado antes de medir (doc 50 § 6.6). Capturas regeneradas y medición limpia.
Tres hilos más en el lienzo: «me quedo con la idea de que floten, olvidemos la barra» (la variante en barra sale del
tablero de acciones); «aceptada la propuesta de héroe… si llegáramos a incluir chips aquí sería como en sheet de
lugares… ¿podemos hacer que el sheet se convierta en una hoja completa que muestre este botón atrás?… ¿y que si el
usuario jala el sheet hasta abajo se cierre?» y, tras probarlo, «ojo, el listado de lugares nunca se va: si lo jalas
se activa el estado peek con solo la cantidad» y «también vale la pena hacer estado peek de ficha de lugar y que no
se cierre hasta dar tap en la X» (hecho: llena, la hoja muestra Atrás y vuelve a foto + KPI; «recogida» es una
altura real más para las dos, lista con la cantidad y ficha con su cabecera; nada se cierra solo y la ficha solo con
la ✕; probado con la rueda en `probar-hoja-atras.mjs` y `probar-hoja-recogida.mjs`); «muy bien resuelto, te felicito, aceptada esta propuesta» sobre el KPI de fecha. Captura
`256-116` con la lista recogida. Y seis hilos sobre el prototipo mismo: «bájale al redondeado, más sugerido, para
todos los casos, es canon» (radios a la mitad); «¿puedes centrar los filtros en tablet y desktop?» (centrados, salvo
Lugares); «la línea del lado derecho se ve cortada por la barra superior; el menú debería comenzar desde donde
termina la barra de filtros» (el carril arranca bajo la fila, con su fondo entero y sus líneas desde ahí; una primera
pasada con margen dejaba la esquina gris y se corrigió); «nombre de artista acá como canon… cuestióname… ¿podemos
agregar héroe a artistas para estandarizar…? Cuestiona» (héroe con placeholder en la ficha de artista, avatar fuera,
Seguir flotante); y dos que el canon del héroe ya había resuelto («¿podemos poner título acá?», «no hay gap visible
entre contenido y barra de atrás»). Después, «¿qué opinas de juntar este texto con el icono de arriba? Como canon, en
todos los KPI» (icono y etiqueta en la fila de arriba, el valor solo abajo; en prototipo y lienzo); «¿por qué se fue
la sección de Agenda?» (contestado: por su pregunta de la quinta vuelta; sigue abierto en el punto 18); y «hace falta
padding arriba y abajo o disminuye tamaño de foto de perfil» (el avatar de la barra inferior baja a 22 px dentro de la
píldora de 32); «pues no estoy seguro, me está gustando como luce ahora, mantén el respaldo de ese dominio en lo que
decido» (Agenda: la app en producción no se tocó y el prototipo v2 con la pantalla está en el commit 3b2ee3c6);
«aquí se ve la parte de atrás de fecha, hay desfase de elementos» (el título de día pegajoso se anclaba 8 px por
debajo de la fila de contexto y no cubría el ancho entero; medido y corregido). Doc 50 § 11, puntos 38 a 44.

### Séptima vuelta (mismo día): los hilos del founder sobre el prototipo

Doce hilos abiertos al volver a leer el artefacto. Ocho pedían trabajo y los ocho están hechos (detalle en el doc 50
§ 6.5, «séptima vuelta», y § 11 puntos 45 a 53): «desarrolla flujo cuando usuario selecciona Elegir fecha» (calendario
dentro de la hoja Cuándo: un día o un rango, el botón cuenta los eventos, Inicio filtra sus días); «desarrolla qué
pasa cuando pongo otra ciudad» (campo con sugerencias bajo la lista, recarga con esqueleto, el chip cambia); «este
icono no me gusta tanto… figura humana con atributo de arte» (se probó una figura con pincel, elegida entre siete
candidatos mirados a 26 px sobre la píldora, y el founder la rechazó en cuanto la vio en la barra: «se ve horrible,
regresa el que tenías»; la estrella se queda y el muestrario queda como registro); «acordamos poner foto
de portada pero mantener foto de avatar» (el avatar redondo vuelve dentro del héroe); «¿cuál es la diferencia entre
Se presenta en y Próximas fechas? Es redundante» (fuera; el KPI Lugares lleva a sus lugares); «muestra cómo se vería
con novedades publicadas» (sección Novedades como la de la app, con tres publicaciones de muestra); «¿podrías dejar
imagen de fondo aquí para que se entienda que es sheet de lugar?» (la cabecera compacta de la hoja lleva la portada
oscurecida; por el mismo canon, la barra compacta de las tres fichas); «acorta letrero: Interesadxs… revisemos que en
la plataforma se esté usando lenguaje incluyente» (KPI «Interesadxs», medido: no cabía ni «Me interesa»; el relleno y
el tracking del KPI ajustados; revisión del prototipo aplicada y lista de lo que queda en la app para la pieza P13).
Cuatro hilos siguen abiertos porque son decisiones suyas: Agenda («no estoy seguro, me está gustando como luce
ahora»), «Lugares» → «Mapa» (se le contestó con argumentos para dejar Lugares), los filtros de Lugares centrados o
no, y la confirmación del héroe de artista, que los tres hilos nuevos sobre esa ficha ya dan por bueno.

Cómo se revisó: cada flujo se probó en el Chrome real con un guion (`probar7.mjs`, en el scratchpad) que imprime el
estado tras cada toque (chip, modo lista, días visibles, texto del botón) y toma capturas; en la primera pasada
salieron la elipse del día elegido, las cuatro filas de días muertos, el velo flojo y el pincel que no se distinguía a
26 px (doc 50 § 6.6), y se corrigieron antes de la tanda definitiva. `medir-prototipo.mjs` sobre las diez pantallas:
0 envoltorios, 0 desbordes, 0 márgenes negativos, 0 iconos con contraste bajo; 0 errores de página en las 54
capturas. Las 54 se regeneraron: cambian a la vista `256-81` (Fin de semana ya enseña solo sáb 3 y dom 4), `256-86` y
`256-116` (la cabecera de la hoja con la portada), `256-88` (la barra, con la estrella de vuelta tras el rechazo del pincel), `256-89` (INTERESADXS), `256-91`
(la barra compacta del evento con su cartel), `256-94`, `256-104` y `256-107` (artista con avatar y novedades; el
panel de escritorio con la cabecera con imagen), `256-95` (SIGUEN).

Capturas nuevas (`docs/rediseno/capturas-256/256-118…128`), abiertas y descritas:

- **`256-118-v3-cuando-calendario-telefono`:** la hoja Cuándo con «Elegir fecha…» activo: el calendario bajo los
  atajos; septiembre arranca en la semana en curso (28 en violeta, 29, 30) y octubre entero, con un punto bajo cada
  día con eventos; «Ver 14 eventos».
- **`256-119-v3-cuando-un-dia-telefono`:** tras tocar el 30: el día en círculo violeta, el chip de la hoja dice
  «mié 30 sep» y el botón «Ver 1 evento».
- **`256-120-v3-inicio-lista-un-dia-telefono`:** Inicio en lista con solo mié 30 sep (Cine de barrio: ciclo Fellini)
  y el chip Cuándo en violeta con «mié 30 sep».
- **`256-121-v3-cuando-rango-telefono`:** segundo toque en el 3 de octubre: rango 30 sep – 3 oct con los extremos en
  círculo lleno y el 1 y el 2 en violeta suave; chip «30 sep – 3 oct»; «Ver 4 eventos».
- **`256-122-v3-inicio-lista-rango-telefono`:** la lista con los cuatro días del rango (Fellini, Pimpolina, LXS
  COLOCAOS, Art Toy) y el chip «30 sep – 3 oct»; la fila de contexto se desplaza porque ya no cabe.
- **`256-123-v3-ciudad-otra-telefono`:** «Dónde estás» tras tocar «Otra ciudad»: el campo «Nombre de la ciudad» y las
  seis sugerencias (Querétaro, Guadalajara, Ciudad de México, Monterrey, Zacatecas, Córdoba, España) con su cuenta de
  eventos.
- **`256-124-v3-ciudad-otra-escribiendo-telefono`:** con «Que» escrito queda solo Querétaro.
- **`256-125-v3-inicio-cargando-queretaro-telefono`:** al elegirla, el chip dice «Querétaro» e Inicio enseña su
  esqueleto mientras recarga.
- **`256-126-v3-inicio-queretaro-telefono`:** Inicio recargado con el chip «Querétaro» (los datos de muestra son los
  mismos).
- **`256-127-v3-ficha-artista-novedades-telefono`:** la ficha de artista desplazada: barra compacta con la portada
  oscurecida y «Aaron Cadena» en blanco; «Novedades» con tres publicaciones (con imagen, con foto, con video), su
  título, su texto en una línea y «hace 2 días»; «Sobre»; «Seguir» flotando.
- **`256-128-v3-iconos-artistas`:** la barra inferior con la estrella que se queda (activa, en la píldora violeta) y
  los tres candidatos rechazados: pincel, pincel lleno y chispa.

### Octava vuelta (mismo día): el armazón, a petición del founder

Tres hilos más, leídos después de la séptima vuelta (el founder preguntó en el chat «¿sigues optimizando shell? Te lo
pedí en un comentario directo en prototipo»): «error de maquetación, hay una línea flotando acá… esta maquetación de
shell es de una complejidad innecesaria. Reconsidera cómo la estás planteando… ojo, todo esto comenzó con el objetivo
estratégico de definir ese shell para que nos sirva en desktop, tablet, mobile y sea fácil exportar app»; «en desktop
esto no tiene sentido, si ves esta barra y la de arriba hay muchísimo espacio en blanco… podríamos fusionar las
barras, poniendo flecha atrás a un lado de agregar y "…" a un lado de campana»; y «centrada» (los filtros de Lugares).
Lo hecho (doc 50 § 6.5, octava vuelta, y § 11 puntos 54 a 56): el armazón es un solo grid de tres áreas (barra · nav ·
pantalla) que no depende de lo que hay dentro; el JS pone `data-vista` (raíz · ficha · tarea) y el CSS solo lee ese
atributo; fuera los `:has()`, fuera `--nav-arriba` y sus rayas pintadas (la línea flotante que vio), fuera los tres
espaciadores de la hoja (un hueco `::before`); el carril arranca bajo la barra de la app, que lleva su línea a todo lo
ancho, con un borde derecho normal; desde 792 la barra de la app lleva Atrás junto a «+» y el menú junto a la campana
con una ficha a la vista, y la barra de la ficha desaparece; filtros de Lugares centrados. Antes, en el chat, el founder
rechazó el pincel de Artistas («se ve horrible, regresa el que tenías»): la estrella volvió y el muestrario queda como
registro.

Cómo se revisó: las tres pruebas de la hoja con la rueda (`probar-hoja*.mjs`) dan los mismos estados y las mismas
alturas que con los espaciadores (asoma 112, media 341, llena 1241 en el aparato a 1,08×; recogida 64 y 76; Atrás y ✕
donde tocaba); el guion de flujos de la séptima vuelta sigue igual; `medir-prototipo.mjs`: 0 envoltorios, 0 desbordes,
0 márgenes negativos, 0 iconos con contraste bajo (202 nodos en Lugares, tres menos); 0 errores de página en las 54
capturas, regeneradas. Cambian a la vista las de tableta y escritorio: `256-99` y `256-101` (el carril bajo la barra,
con su borde de arriba abajo y sin línea flotante; la fila de contexto sin línea propia), `256-100`, `256-102`,
`256-103` y `256-104` (filtros de Lugares centrados; el panel con la ficha), `256-105`, `256-106` y `256-107` (las
fichas con la barra fusionada: Atrás junto a «+», menú junto a la campana, la portada a 20 px de la barra), `256-108`
(la tarea conserva su barra con título y ✕) y `256-109` (Perfil). En teléfono no cambia nada a la vista.

### Novena vuelta (mismo día): las tarjetas del carril

En el chat: «el lugar se corta en cards, ¿puedes poner a dos líneas esa información (fecha, hora y lugar)? Y
disminuye el tamaño de texto en títulos de esas mismas cards». Hecho en el generador: la meta de cada tarjeta de
evento va en dos líneas (fecha y hora · lugar, cada una con su elipsis) y el título baja a 17 px con un token propio
(`--letra-tarjeta-titulo`); los renglones de lista no cambian. El carril reparte sus filas con `subgrid`, así que las
dos líneas quedan alineadas entre tarjetas. Capturas regeneradas (cambian a la vista las que enseñan carriles: `256-75`
a `256-77`, `256-99`, `256-101`, `256-125` y `256-126`); medición sin cambios. Doc 50 § 6.5 (novena vuelta) y § 11,
punto 57.

### Décima vuelta (mismo día): la hoja de Lugares asoma más

Hilo del founder sobre el primer renglón de la lista de Lugares: «¿podemos hacer que se vean 2,5 lugares aquí, para
que se entienda que hay más contenido debajo, además de poner barra de scroll del lado derecho?». La altura «asoma»
pasa de 176 px fijos a asa + cantidad + dos renglones y medio medidos en el DOM (el tercero se corta a propósito), y la
hoja llena enseña una barra de desplazamiento fina a la derecha (en tableta y escritorio el panel la enseña siempre;
en el iPhone es la del sistema al desplazar). Probado con la rueda (`probar-hoja.mjs`, `probar-hoja-recogida.mjs`):
con asoma a dos renglones y medio la altura «media» de la lista quedaba a 40 px y sobraba, así que la lista tiene tres
alturas (recogida · asoma · llena) y la ficha conserva su media. Capturas regeneradas; cambian `256-82` (el mapa con la
hoja asomando dos renglones y medio) y `256-83`, que pasa de «hoja media» a «hoja llena» (la lista a pantalla completa,
sin navegación; la barra de desplazamiento no sale en el Chrome sin cabeza porque pinta barras superpuestas solo al
desplazar). Doc 50 § 6.5 (décima vuelta) y
§ 11, punto 58.

### Undécima vuelta (mismo día): el título de un carril abre su lista propia

El chat «Actividad de investigación de eventos» relayó dos hallazgos del founder. Uno cambia el canon: en la app de hoy
el título de un carril lleva a la sección con filtros que la persona no puso; él pide una lista solo con ese conjunto,
con el título como encabezado, Atrás a Inicio y sin chips. El prototipo hacía lo mismo con otra cara (ponía el chip
Cuándo): ahora cada título abre su pantalla de lista (Atrás · título, «4 eventos», los renglones, «Ver toda la agenda»
que vuelve a Inicio en la lista por día; «Ver todos los lugares» / «Ver artistas» en los de lugares y artistas), con
memoria de pantalla al volver. Entra en la pieza P5 (doc 50 § 6.5, undécima vuelta; § 11 punto 59; fila P5). Sobre el
carril «Artistas con eventos esta semana» que el founder no ve: el chat de investigación lo comprobó en la base y en
producción (hay 14 artistas ligados a 8 eventos de la semana y el carril se pinta, el último de Inicio, sin enlace
visible): es sitio y señal, no dato ni error; P5 lo resuelve con el carril único de artistas del prototipo. El otro hallazgo (una tarjeta con título de un renglón, un renglón vacío y el detalle en dos renglones, en
su iPhone) coincide con lo que ya es canon en el prototipo desde la novena vuelta: el carril reparte sus filas con
`subgrid`, así que la fila del título mide el título más largo del carril (los cortos dejan aire debajo) y la meta va
en dos líneas alineadas entre tarjetas; la captura del founder («vie 2 de oct») es de producción con el CSS de la
primera entrega de OL-226, una página vieja en memoria del teléfono, no del prototipo. Capturas nuevas, abiertas y descritas:

- **`256-129-v3-carril-destacados-telefono`:** la lista propia de «Destacados» en teléfono: barra con Atrás y el título,
  «4 eventos», los cuatro renglones (LXS COLOCAOS con «Vas», Master Class, Leonora con «Te interesa», DESIERTO) y el
  enlace «Ver toda la agenda»; sin barra de la app ni navegación.
- **`256-130-v3-carril-semana-escritorio`:** «Esta semana» en escritorio: la barra de la app arriba, el carril lateral,
  la barra de la lista con Atrás y el título, «8 eventos hasta el domingo» y los días Hoy a dom 4 oct con sus títulos
  pegajosos.

### Duodécima vuelta (mismo día): «Ver todo ›» y Agenda revivida

El founder vio las listas propias de carril y las rechazó: «no sirve la solución que te pedí: Destacados son 4, al
seleccionar esa opción manda a ver los mismos cuatro pero en lista… Regresamos a la opción de ver todo, es decir que
aparezca el título del lado izquierdo y del lado derecho "Ver todo >" y en caso de eventos vamos a la sección agenda,
esto implica revivir agenda. En caso de artistas manda a la sección de artistas, lo mismo con lugares». Hecho: cada
carril lleva su título y «Ver todo ›» a la derecha (eventos a Agenda; lugares a Lugares; artistas a Artistas; Tus
planes a Perfil). Agenda vuelve como pantalla propia (barra con Atrás y «Agenda», fila ciudad · Cuándo · Filtros y la
lista por día de todos los próximos, sin filtros puestos), fuera de la barra inferior; se llega por «Ver todo» o por
un valor en Cuándo desde Inicio, y Atrás vuelve a Inicio con memoria. Inicio pierde el modo lista; el calendario y los
atajos de Cuándo filtran la Agenda. Las cinco listas de la undécima vuelta salen del generador. Probado con el guion de
flujos (Cuándo desde Inicio lleva a Agenda con el día; el rango; Limpiar deja todos los próximos; Atrás vuelve) y
medido: Inicio 302 nodos, Agenda 169, 0 envoltorios, 0 desbordes, 0 márgenes negativos. Capturas regeneradas: cambian
de nombre `256-81` (Agenda con Fin de semana desde Inicio), `256-120` y `256-122` (Agenda con un día y con un rango),
`256-129` y `256-130` (Agenda en teléfono y en escritorio); las de letras (`256-110` a `256-112`) muestran ahora la
Agenda. Doc 50 § 6.5 (duodécima vuelta), § 11 puntos 18, 59 y 60, fila P5.
Al verla, el founder señaló «una línea rara… entre filtros y header, ya te la había señalado antes» (la barra de la Agenda
llevaba su filete además del de la fila): fuera el filete de la barra. Y sobre las pestañas Todo / Seguidos de la app
de hoy: «vi que filtras por lo que sigo, déjalo así y solo corrige la línea»: el filtro «Solo lo que sigo» de la hoja
de Filtros se queda y no hay pestañas.

- **`256-75-v3-inicio-telefono`:** Inicio con cada carril con su título a la izquierda y «Ver todo ›» a la derecha.
- **`256-81-v3-agenda-fin-de-semana-telefono`:** tras elegir Fin de semana en Cuándo desde Inicio: la Agenda con Atrás,
  el chip «Fin de semana» en violeta y solo sáb 3 y dom 4 de octubre.
- **`256-129-v3-agenda-telefono`:** «Ver todo» de Destacados: la Agenda entera (Atrás · Agenda, la fila de contexto sin
  nada puesto, Hoy · 2 y los días siguientes), sin barra de la app ni navegación.
- **`256-130-v3-agenda-escritorio`:** la misma Agenda en escritorio: barra de la app, carril lateral, la barra de la
  Agenda con Atrás, la fila centrada y la lista por día.

### Firma del founder (mismo día, noche)

Respondió en el chat a la lista de pendientes: «1: Agenda se queda fuera por ahora, temo que hay demasiado ya en barra
de navegación. 2. Lugares. 3. Acepto tu propuesta. 4. Interesan. 5. Confirmo todo, buen trabajo. 6. Sigue adelante,
pruebo en prod. Cierra y dale a la maqueta, con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar,
siempre simple, elimina todo lo innecesario, cuida mucho el código.» El KPI de Perfil pasa a «Interesan» (capturas
regeneradas). Con eso el prototipo v3 queda firmado: el plan por piezas del doc 50 § 7 es el definitivo y arranca la
primera pieza (P1, tokens; rama `ui-tokens`, OL-229, bitácora 257) con un operador nuevo; el PR #266 se une cuando
diga «publica».

### Cierre (cuarta parte)

Commits en `restructura-ui` con el prototipo v3 (los siguientes con las correcciones del founder al verla, la
séptima vuelta desde los hilos, la vuelta de la estrella, la octava vuelta del armazón, la novena de las tarjetas, la décima de la hoja, la undécima de las listas de carril y la duodécima que las sustituye por «Ver todo» y la Agenda revivida), las 56 capturas, el doc 50 (§ 6.5 a 6.7, filas P1, P2, P4 a P7, P10 y P13, § 10 y
§ 11 con la quinta a la séptima vuelta), el generador y el script de captura actualizados, esta bitácora y
OPEN_LOOPS; push al PR #266; artefacto republicado y los hilos contestados (los resueltos, resueltos; los de decisión,
abiertos). Pendiente: que el founder pruebe la v3 en su iPhone y conteste los puntos 18, 20 a 24, 36, 45 a 47 y
50 a 55 del doc 50 § 11 (Inicio con dos modos y Agenda, campana, dos barras en escritorio, ficha desde otras
entradas, esconder o minimizar la navegación, la hoja en el iPhone, calendario, otra ciudad,
lenguaje incluyente e «Interesadxs», KPI Lugares, orden de Novedades, cabecera con portada
también en las fichas, «Lugares» o «Mapa», el armazón simplificado y las barras fusionadas); con su firma, plan definitivo por piezas y operadores nuevos.
