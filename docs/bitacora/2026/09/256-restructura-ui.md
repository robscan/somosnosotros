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
