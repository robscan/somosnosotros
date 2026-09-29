# 50 · Reestructura de la interfaz para web, iPhone y Android (OL-227)

**Fecha:** 2026-09-28 · **Estado:** auditoría con evidencia (secciones 1 a 4), propuesta (sección 5, ajustada con las
respuestas del founder del mismo día) y **prototipo interactivo de las pantallas reales** (sección 6,
[`prototipos/restructura-ui.html`](prototipos/restructura-ui.html)) para su firma; el plan por piezas (sección 7) se
cierra con esa firma. **Sin código de la app.**
· **Rama:** `restructura-ui` · **Bitácora:** [256](../bitacora/2026/09/256-restructura-ui.md) · **Capturas:**
[`capturas-256/`](capturas-256/) (38 PNG reales, abiertas y descritas una por una en la bitácora) · Gestor de
cambios III, Fable 5.1 en máximo. Sin council, workflows ni agentes.

Antecedentes que no se heredan: el doc 48 (rama `shell-ios`) y el doc 49 con su prototipo (rama
`navegacion-plataformas`), rechazados por el founder. Sigue vigente hasta que se firme lo nuevo: Atrás con marca
propia (`src/lib/historial.ts`), memoria de pantalla, «filtrar no es navegar», el canon de formularios (docs 14, 15 y
26) y la línea gráfica ([LINEA_GRAFICA](../diseno/LINEA_GRAFICA.md)).

## 0. Veredicto en tres líneas

1. **Por dentro la app está razonablemente limpia** (fichas de 45 a 83 nodos, profundidad 4 a 7, cero desbordes en
   9 de 10 pantallas públicas), **pero el sistema se repite:** once maneras de dibujar un botón redondo, cuatro
   rejillas distintas para el mismo renglón «icono | texto | acción», dos hojas «¿Dónde?» idénticas, 691 medidas en
   duro y 44 `z-index` en 17 valores sin escala. Cada pieza nueva paga ese peaje (y así nacieron los tres llamados de
   atención por maquetación de septiembre).
2. **Hay defectos silenciosos medidos, no de sensación:** el botón flotante tapa renglones y sus «+» en Agenda, Lugares e
   Inicio (también en la app de iPhone); en Artistas el texto de 16 renglones se mete hasta 31 px debajo del «+»; en la
   ficha de lugar con cinco enlaces el quinto queda cortado al 52 %; en el mapa el nombre de un lugar y el día de otro
   se enciman. Lista completa con archivo y línea en la sección 8.
3. **En tableta y escritorio la app es el teléfono estirado:** una columna de 600 px, barra inferior de cuatro destinos
   a 320 px entre sí, carriles que sangran solo hacia la derecha, flotantes al centro. La propuesta (sección 5) usa las
   mismas piezas y variables en los tres tamaños y cambia solo dónde viven: navegación abajo en teléfono y lateral en
   tableta y escritorio; mapa junto a la lista; ficha a dos columnas; y una plantilla por tipo de pantalla que hace
   imposibles los márgenes negativos y los flotantes sobre contenido.

## 1. Qué se auditó y cómo (evidencia)

| Qué | Cómo | Dónde está |
|---|---|---|
| Producción (`somosnosotros.org`), 10 pantallas públicas × 3 tamaños: teléfono 390×844 (2×, toque, sin hover), tableta 820×1180 y escritorio 1280×800 (ratón) | Chrome real de la Mac vía `playwright-core`, fuente Bricolage comprobada cargada en cada captura (`document.fonts`) | `capturas-256/256-01…10-*.png` |
| Pantallas con sesión (Inicio con «Tus planes», Agenda, alta de evento, Ajustes, Mi perfil, ficha con «Voy», alta de lugar, Editar perfil, Novedades) | `next build && next start` de esta rama contra un respaldo local 100 % inventado (Node puro, cuenta `ana@example.com`; imita Auth y PostgREST; nunca tocó producción ni un `.env`) | `256-20…27-*.png` |
| App de iPhone (Capacitor, `apps/ios`, compilada de esta rama) | Simulador propio «OL-227 iPhone 17 Pro» (iOS 26.3, creado y borrado con `simctl`), la app cargando producción | `256-11…15-ios-*.png` |
| **Medición del DOM** de cada pantalla: nodos y profundidad dentro de `main`, envoltorios sin función (`div`/`span` con un solo hijo y sin texto), hijos que se salen de la caja de su padre, elementos fuera de la ventana, márgenes negativos, contextos de apilamiento, cajas cuyo contenido es más alto que ellas, objetivos de toque menores de 44 px, controles que se solapan o quedan a menos de 8 px | Script propio evaluado en la página real (`getBoundingClientRect` + `getComputedStyle`), 48 corridas | JSON en el scratchpad; cifras en la sección 2 y en la bitácora |
| **Inventario estático del CSS**: los 99 `.module.css` más `globals.css` parseados con PostCSS: tokens definidos y usados, medidas y colores en duro, alturas fijas, `z-index`, posiciones, bloques de declaraciones repetidos | Script propio | Sección 3 |
| Medidas puntuales de los defectos candidatos (flotantes contra renglones, carril de enlaces, mapa, barra fija, texto de Artistas) | Script propio a 390×844 | Sección 8 |

Lo que no se pudo medir y se dice: el mapa de Mapbox no carga en local (sin token), así que el mapa se auditó solo
en producción; el desbordamiento horizontal en escritorios con barra de desplazamiento clásica (Windows) no se pudo
reproducir en el Chrome de la Mac (usa barras superpuestas) y queda como riesgo documentado (H-38); el simulador es un
iPhone 17 Pro (402×874 pt), no 390×844.

## 2. Hallazgos por pantalla

Cada pantalla: qué viene a hacer la persona (*job to be done*), lo medido, lo que se ve en las capturas, los
hallazgos numerados (H-nn) con la ley que los explica y qué se propone. Las cifras son del teléfono salvo que se diga
otra cosa.

### 2.1 Inicio (`/`)

**A qué viene la persona:** a ver rápido qué hay y decidir a qué ir; con cuenta, a repasar sus planes.

**Medido:** 300 nodos, profundidad 8, 25 envoltorios (6 tipos), altura del documento 2 088 px (2,5 pantallas). Barra
56 px que se desplaza + cabecera pegajosa 56 px. Flotante «Publicar evento» de 182×48 en (188–370, 720–768): tapa 2
tarjetas del carril que queda debajo; en la app de iPhone tapa además el «+» de la primera tarjeta de «Esta semana».
Capturas [256-01-inicio-movil](capturas-256/256-01-inicio-movil.png), [completa](capturas-256/256-01-inicio-movil-completa.png),
[tableta](capturas-256/256-01-inicio-tableta.png), [escritorio](capturas-256/256-01-inicio-escritorio.png),
[iPhone](capturas-256/256-11-ios-inicio.png), [con sesión](capturas-256/256-20-inicio-sesion-movil.png).

- **H-01 · El flotante tapa contenido y otro accionable.** `Publicar.module.css:2-5` (fijo, abajo a la derecha,
  z 21). En reposo cubre 2 tarjetas; al desplazar, cada «+» de tarjeta pasa detrás de él. Fitts (el objetivo tapado no
  existe), Hick (dos accionables en el mismo sitio para dos decisiones). Propuesta: publicar vive en la barra superior
  como «+» de 44 px (canon iOS que el founder prefiere: «botones de acción solo con un icono»), y en tableta y
  escritorio en la navegación lateral. El flotante se retira de las cuatro pantallas raíz.
- **H-02 · Tres capas sobre cada cartel** (sello «Recién agregado», sello «N van», botón «+», más el «✓» verde con
  sesión): el cartel, que es lo que vende el evento, queda debajo de tres objetos. Aesthetic-Usability y la regla del
  founder «reforzar la UI no es añadir cosas». Propuesta: un solo sello sobre la foto (el más útil para decidir: «N
  van» o «hoy»); «Recién agregado» pasa al texto como detalle; el «+» se queda (decisión firmada) pero sin sombra
  cuando no va sobre foto.
- **H-03 · Carriles enteros en gris.** «Lugares con eventos» y «Artistas destacados» pintan círculos y tarjetas de
  165×248 con el símbolo SN cuando no hay foto (captura completa): un carril casi todo gris. Aesthetic-Usability.
  Propuesta: la tarjeta sin foto es compacta (fondo suave, nombre grande, sin bloque de imagen) y «destacado» exige
  foto.
- **H-04 · Dos cabeceras con dos comportamientos.** La barra del logotipo (56) se desplaza; la cabecera de contexto
  (56 en Inicio, 100 en Agenda/Lugares/Artistas) es pegajosa y se compacta a 44; en las fichas la barra sí es
  pegajosa. Consistencia y estándares (iOS y Android fijan una sola barra). Propuesta: una sola cabecera pegajosa
  (logotipo + contexto + filtros) que se compacta a 44 px al bajar, igual en todas las raíces.
- **H-05 · Accionables de cabecera por debajo de 44 px:** «Entrar» 74×40 (`Sesion.module.css:4`), chip de ciudad y
  de fecha 40 (`Chip.module.css:82`, `ChipFecha.module.css:10`), lupa 40 (`Cabecera.module.css:56`), Atrás 40
  (`Atras.module.css:7`), ✕ 40 (`Cerrar.module.css:6`). Fitts, `--toque-min` de PRINCIPIOS_UX y la observación del
  founder en OL-207 («más pequeños que el canon de iOS»). Propuesta: todo control de barra mide 44; el token existe.
- **H-06 · Chevron con margen negativo y envoltorio.** `Destacados.module.css:76-84`: `span.chevron` (solo envuelve al
  svg) con `margin-right: -10px`; sobresale 10 px de su enlace en cada carril (5 veces por pantalla). Es el patrón
  «estado con margen negativo» que la regla de maquetación prohíbe. Propuesta: el svg como hijo directo del enlace con
  `padding-inline` en el propio enlace.
- **H-07 · Escritorio y tableta: teléfono estirado.** Columna de 600 px centrada; los carriles arrancan en la columna
  y sangran solo hacia la derecha hasta el borde de la ventana (asimetría visible en tableta y escritorio); tarjetas del
  mismo tamaño que en el teléfono; flotante al centro-abajo tapando tarjetas; barra inferior de 4 destinos a 320 px.
  Propuesta en la sección 5.4.

### 2.2 Agenda (`/agenda`)

**A qué viene:** a saber qué hay hoy y esta semana, y a decir «voy».

**Medido:** 391 nodos, profundidad 8, 5 envoltorios (2 tipos), 0 desbordes, 0 márgenes negativos, 23 renglones (4 467
px de alto: 5,3 pantallas). Cabecera 100 px + barra 56 = 156 px de chrome arriba (18,5 % de la pantalla) y 60 abajo;
útil 628 px; compacta, la cabecera deja 44 px. Flotante: 3 botones «+» a la vista; en reposo tapa 1 renglón (su
precio y su lugar). Capturas [256-02-agenda-movil](capturas-256/256-02-agenda-movil.png),
[escritorio](capturas-256/256-02-agenda-escritorio.png), [iPhone](capturas-256/256-12-ios-agenda.png),
[con sesión](capturas-256/256-21-agenda-sesion-movil.png).

- **H-08 · El flotante compite con la columna de «+».** Los dos viven a 20 px del borde derecho (el «+» de 48 en x 322–370,
  el flotante en 188–370): al desplazar, el botón de cada renglón cruza por detrás del flotante y el texto del
  renglón queda tapado. Fitts. Misma solución que H-01.
- **H-09 · Renglones de hasta 190 px.** Título en dos líneas + hora + lugar (con la dirección postal completa en tres
  líneas cuando el evento es «en otro sitio»: «Templo de San Francisco · Calle Jardín Guerrero 7, 78000 San Luis
  Potosí, San Luis Potosí, México») + precio. «Gratis» se repite en todos. Caben 3 o 4 eventos por pantalla. Tesler (el
  sistema resume: en la lista, el nombre del sitio; la dirección, en la ficha) y Hick. Propuesta: renglón de dos
  líneas de meta como máximo (hora · sitio; precio solo cuando no es gratis) y foto 56.
- **H-10 · Dos estilos para el mismo título de sección.** El título del día (`AgendaInicio.module.css:12-19`) lleva
  raya inferior en tinta y 14/6 px de aire; los títulos de carril (`Destacados h2`) no llevan raya y van con chevron.
  Consistencia. Propuesta: un solo título de sección (con o sin chevron) y la raya solo como separador de grupo pegajoso.
- **H-11 · Tiras que se cortan sin señal.** «Todos · Siguiendo» va repartida a mitades; en Lugares y Artistas la misma
  tira de tipos se corta a la derecha (Lugares: 967 px de contenido en 390) sin degradado ni flecha. Consistencia y
  Jakob (iOS: control segmentado cabe; si no cabe, chips desplazables con borde que asoma). Propuesta: la tira que no
  cabe se desliza y asoma media pestaña (nunca se corta en un límite exacto).

### 2.3 Lugares: mapa (`/lugares`)

**A qué viene:** a ver dónde hay algo cerca, hoy o esta semana, y llegar.

**Medido:** 83 nodos, profundidad 9 (capas de Mapbox). Controles sobre el mapa: ubicación (48), ⓘ y marca Mapbox,
«Ver en lista» (144×48), «Registrar lugar» (178×48), más nav y cabecera. Capturas
[256-03-lugares-mapa-movil](capturas-256/256-03-lugares-mapa-movil.png),
[tableta](capturas-256/256-03-lugares-mapa-tableta.png), [escritorio](capturas-256/256-03-lugares-mapa-escritorio.png),
[iPhone](capturas-256/256-13-ios-lugares-mapa.png).

- **H-12 · Etiquetas encimadas.** En el centro, el nombre en violeta de «Museo del Ferrocarril Jesús García Corona»
  y el pin «Vie» de un lugar vecino se pisan; «Casa Bauen» queda bajo el pin «Mar» de San Miguelito (tableta); «MUNI
  Museo Universitario UASLP» sale cortado por el borde izquierdo. Causa: el punto, el día y el nombre son símbolos de
  capas distintas y Mapbox resuelve colisiones capa por capa. Propuesta técnica: un solo símbolo por lugar
  (icono + texto), `symbol-sort-key` por prioridad (seguido › destacado › con evento › resto), `text-variable-anchor`
  para que el nombre busque sitio, `text-padding`, y ocultar el nombre (nunca el punto) cuando aun así choca.
- **H-13 · Cuatro flotantes sobre el mapa.** Con cabecera y nav, los controles ocupan cerca del 40 % de la altura útil
  a 390×844; «Ver en lista» y «Registrar lugar» apilados cubren 108 px de alto y 198 px de ancho (51 %). Región común:
  el conmutador Mapa · Lista es un cambio de vista, no una acción, y la gente lo espera arriba (Apple Maps, Google
  Maps: segmento en la cabecera). Propuesta (v1): «Mapa · Lista» como segmento en la cabecera. El founder no lo quiso
  ahí; **v2**: sin segmento, la lista en una hoja inferior con tres alturas (6.2); «Registrar lugar» al «+» de la
  barra; en el mapa quedan solo ubicación y la atribución.
- **H-14 · El alto del mapa depende de una variable viva.** `lugares.module.css:11-14`: `height: calc(100dvh − … −
  var(--alto-cabecera) − …)`, y `--alto-cabecera` la publica `ui/Cabecera` desde JavaScript al medirse. Acoplamiento
  frágil (si la cabecera cambia, el mapa salta o deja hueco). Propuesta: la plantilla raíz es `grid-template-rows:
  auto 1fr auto` y el mapa llena la fila central sin cálculo.

### 2.4 Lugares: lista (`/lugares?vista=lista`)

**Medido:** 320 nodos, profundidad 8. Dos flotantes apilados: tapan 2 renglones y 2 botones «+» en reposo. Carril
«Con eventos esta semana» arriba, contador «62 lugares», índice por letra pegajoso. Capturas
[256-04-lugares-lista-movil](capturas-256/256-04-lugares-lista-movil.png),
[escritorio](capturas-256/256-04-lugares-lista-escritorio.png).

- **H-15 · Dos flotantes tapan dos renglones** (medido). Misma raíz que H-01.
- **H-16 · Tres modelos en una pantalla:** carril semanal (repite el «Lugares con eventos» de Inicio), contador y
  directorio alfabético. Modelo mental: Lugares es el directorio; lo semanal ya vive en Inicio (la misma decisión que
  el founder tomó para Artistas el 2026-09-23). Propuesta: quitar el carril de la lista de Lugares, como en Artistas.

### 2.5 Artistas (`/artistas`)

**Medido:** 999 nodos (la primera tanda de renglones y la tira de letras), profundidad 7, 102 envoltorios (5 tipos;
50 son el `span` sin estilo de cada meta). **16 renglones desbordan** su columna de texto entre 4 y 43 px; en dos, el
texto pasa 27 y 31 px por debajo del botón «+» («Tradicional, folclore y canto nuevo · Solista»). Capturas
[256-05-artistas-movil](capturas-256/256-05-artistas-movil.png), [escritorio](capturas-256/256-05-artistas-escritorio.png).

- **H-17 · Texto debajo del botón (bug silencioso).** `Renglon.module.css:101` pone `white-space: nowrap` a cada dato
  del meta; la columna ya tiene `min-width: 0`, pero el hijo se niega a partirse y se sale de la caja hasta debajo del
  «+». Propuesta: el dato se parte o se recorta con puntos suspensivos; `nowrap` solo en la hora.
- **H-18 · Tres tiras pegajosas apiladas** (cabecera 100 → tira de letras 44): a 390×844 quedan 584 px útiles. La
  tira de letras se mete bajo la cabecera con un margen negativo de 44 (`TiraLetras.module.css`). Propuesta: la tira
  de letras forma parte de la cabecera (una sola pieza pegajosa que se compacta) sin margen negativo.
- **H-19 · Veinte «+» por pantalla** en una lista de 582 artistas: el botón con sombra pesa lo mismo que la foto.
  Aesthetic-Usability. El botón a la vista está decidido (2026-09-21); la propuesta es solo de peso: sin sombra ni
  círculo blanco cuando va sobre el fondo hueso (icono de 44 px, círculo solo sobre fotos).

### 2.6 Ficha de evento (`/eventos/<slug>`)

**A qué viene:** a decidir si va y a resolver cómo (cuándo, dónde, cuánto, con quién) y avisar.

**Medido:** 57 nodos, profundidad 4 (la pantalla más limpia). Barra fija de 73 px; mapa de 170 px que en la primera
pantalla queda medio tapado por la barra; acciones «repartidas»: Compartir 20–84, A mi calendario 152–237, Cómo
llegar 305–370 (68 px entre círculos; en escritorio, 600 px de extremo a extremo). Capturas
[256-06-ficha-evento-movil](capturas-256/256-06-ficha-evento-movil.png), [completa](capturas-256/256-06-ficha-evento-movil-completa.png),
[escritorio](capturas-256/256-06-ficha-evento-escritorio.png), [iPhone sin foto](capturas-256/256-14-ios-ficha-evento.png),
[con «Voy»](capturas-256/256-25-ficha-evento-voy-movil.png).

- **H-20 · Acciones repartidas a los extremos.** `Ficha.module.css:157` (`justify-content: space-between`): con tres
  se pegan a los bordes y no se leen como una fila. Proximidad. Propuesta: fila alineada a la izquierda con aire fijo
  (16 px) y como máximo 4 círculos visibles; de 5 en adelante, «Más».
- **H-21 · Números donde iría una variable.** `.pagina` reserva `96px` abajo (`Ficha.module.css:12`) mientras la
  barra fija mide 73 y `Hecho` publica `--alto-barra-fija`; el mapa mide `170px` (`MapaFicha.module.css:5`); la foto
  `220px` (`Cartel.module.css:6`). Propuesta: tokens de la plantilla ficha (sección 5.1).
- **H-22 · Foto de 220 px fijos.** Recorta los carteles verticales (el «28» de la Sinfónica queda cortado en
  escritorio) y, sin foto, deja un bloque gris de 220 px con el símbolo (captura iPhone). Aesthetic-Usability.
  Propuesta: caja 5:3 con el cartel entero (`object-fit: contain`) sobre su color dominante; sin foto, sin caja.
- **H-23 · Dos pesos para dos decisiones del mismo nivel.** «Me interesa» en texto subrayado y «Voy» lleno; el
  founder dijo que «las dos son útiles» (2026-09-17). Consistencia. Propuesta: par secundario + primario del mismo
  alto (el botón secundario del canon).
- **H-24 · Escapar del gutter con márgenes negativos.** `Barra.module.css:32` (`margin: 0 calc(-1 * var(--gutter))`)
  y `Ficha.module.css:144-150` (`.acciones`): en escritorio son −340 px por lado. Cualquier caja que no compense
  exactamente el gutter rompe; así llegó rota a producción «Es en otro sitio» (2026-09-21). Propuesta: la página no
  lleva gutter; cada bloque pone el suyo con una sola clase `.columna` (sección 5.3).

### 2.7 Ficha de lugar (`/lugares/<slug>`)

**Medido:** 83 nodos (4 enlaces) y 73 (5 enlaces), profundidad 7. Con cinco enlaces el carril mide 441 px en 390: el
quinto («Instagram») queda al 52 % (31 px fuera), aire de 20 px, sin señal de que se desliza. Capturas
[256-07-ficha-lugar-4-movil](capturas-256/256-07-ficha-lugar-4-movil.png),
[256-08-ficha-lugar-5-movil](capturas-256/256-08-ficha-lugar-5-movil.png), [escritorio](capturas-256/256-08-ficha-lugar-5-escritorio.png).

- **H-25 · El quinto enlace cortado** (el «Instagram pegado al borde» que vio el founder). `lib/ficha.ts` manda a
  carril desde 5. Propuesta: cinco caben a 390 con círculos de 48 y 12 px de aire (5×48 + 4×12 = 288 < 350); seis o
  más, «Más» abre una hoja. Las acciones nunca van en carril.
- **H-26 · «ver» (34×44) y «más» (24×44)** en gris subrayado al extremo derecho (`Ficha.module.css:81-116`,
  `Desplegable`): objetivos estrechos y débiles. Fitts. Propuesta: el renglón entero toca (chevron de 44) y «más»
  como enlace de 44 de alto a lo ancho.

### 2.8 Ficha de artista (`/artistas/<slug>`)

**Medido:** 45 nodos, profundidad 5. Captura [256-09-ficha-artista-movil](capturas-256/256-09-ficha-artista-movil.png).

- **H-27 · Compartir en dos sitios y dos formas.** En el artista flota sobre el avatar (−4 px fuera de la foto,
  `Ficha.module.css:42-58`); en evento y lugar es un círculo de la fila. Consistencia. Propuesta: siempre en la fila.
- **H-28 · Sección «Enlaces» con un solo elemento** lleva título propio, y «Se presenta en» vacío pone texto más un
  botón que queda detrás de la barra fija. Progressive disclosure. Propuesta: sin título cuando hay un solo enlace; el
  vacío en una línea, sin botón repetido (el «+» de la barra ya publica).

### 2.9 Alta de evento (`/eventos/nuevo`) y alta de lugar (`/lugares/nuevo`)

**Medido:** 73 y 62 nodos, profundidad 8. Capturas [256-22-alta-evento-movil](capturas-256/256-22-alta-evento-movil.png),
[escritorio](capturas-256/256-22-alta-evento-escritorio.png), [256-26-alta-lugar-movil](capturas-256/256-26-alta-lugar-movil.png).
(En local no sale la tarjeta del cartel: la lectura de carteles está apagada sin llave; la pantalla real la lleva.)

- **H-29 · Mensaje doble.** El campo dice «Falta el nombre» (placeholder) y debajo, en gris, «Falta el nombre.»;
  Dónde dice «Falta» y debajo «Falta ubicación.». Evidencia sin ruido: el borde discontinuo ya marca lo pendiente.
  Propuesta: un solo mensaje por renglón, y solo tras el primer intento de publicar.
- **H-30 · Las dos altas se contradicen.** El alta de lugar dice «Con el nombre y dónde está basta. Lo demás se puede
  agregar después.»; el alta de evento no lo dice porque el founder lo prohibió el 2026-09-17 («no promovemos la
  creación de eventos incompletos»). Consistencia. Propuesta: quitar la frase del alta de lugar.
- **H-31 · Márgenes negativos para corregir el aire del padre.** `FormularioCanon.module.css:192-193` (`.estado`
  con `margin: calc(-1 * var(--espacio-2)) …`) y `ajustes.module.css:13` (`.ajustes > h2` con `margin-bottom:
  calc(-1 * var(--espacio-5) + var(--espacio-2))`). El aire se decide en la rejilla con `gap`, no restando.
- **H-32 · Botón deshabilitado mudo.** «Publicar evento» lavado (opacidad 0,55) no dice qué falta; en escritorio la
  pantalla termina a 660 px sin pie. El canon dice «la ayuda de qué falta va bajo el campo»: se cumple, pero el botón
  podría decirlo una vez (Zeigarnik: lo incompleto con los pasos exactos).

### 2.10 Ajustes (`/ajustes`), Mi perfil, Editar perfil, Novedades

**Medido:** 98, 63, 44 y 41 nodos. Capturas [256-23-ajustes-movil](capturas-256/256-23-ajustes-movil.png),
[completa](capturas-256/256-23-ajustes-movil-completa.png), [escritorio](capturas-256/256-23-ajustes-escritorio.png),
[256-24-perfil-movil](capturas-256/256-24-perfil-movil.png), [256-27-editar-perfil-movil](capturas-256/256-27-editar-perfil-movil.png).

- **Ajustes cumple región común y proximidad** (grupos con rótulo, tarjetas, aire): es la referencia de agrupación.
- **H-33 · Cuatro rejillas para el mismo renglón.** `ajustes.module.css:32` (`.fila`), `FormularioCanon.module.css:229`
  (`.resuelto`), `Ficha.module.css:81` (`.dato`) y `Renglon.module.css` (`.frente`) dibujan «icono | principal /
  secundario | acción» con columnas 24/22/64 px y aires 12/10/12 distintos; `.palanca` está dos veces
  (`ajustes.module.css:82`, `FormularioCanon.module.css:324`). Propuesta: un `Renglon` con cuatro pieles (sección 5.2).
- **Mi perfil:** avatar 160 px con dos círculos de 48 (ajustes, compartir) y una tarjeta violeta de «Completar»;
  pestañas «Voy a 2 · Sigo 2» con el número en grande. Bien agrupado; el «✓» verde de 48 con sombra repite H-19.

### 2.11 Entrar (`/entrar`)

18 nodos, profundidad 3: la pantalla más simple. Capturas [256-10-entrar-movil](capturas-256/256-10-entrar-movil.png),
[escritorio](capturas-256/256-10-entrar-escritorio.png), [iPhone con teclado](capturas-256/256-15-ios-entrar-teclado.png).
En la app de iPhone no aparece «Continuar con Google» (solo Apple y correo): lo decide `src/lib/entrarCon.ts` por
navegador; se anota para confirmar que es a propósito.

### 2.12 App de iPhone (shell)

Las cinco capturas del simulador (`256-11` a `256-15`) muestran las zonas seguras bien resueltas: la franja de la
hora, la barra bajo la isla dinámica, la nav sobre el indicador de inicio y, con el teclado abierto en Entrar, la barra
«Atrás · SMSNSTRS» en su sitio (el problema 1 del doc 48 quedó resuelto con OL-205). La app reproduce H-01, H-08 y
H-12 tal cual, porque es la misma web. No hay nada que adaptar «a nativo»: lo que hay que arreglar es la web.

### 2.13 Tableta y escritorio (transversal)

- **H-34 · Barra inferior estirada.** 60 px a todo lo ancho con 4 destinos a 320 px entre sí (1280) o 205 (820); la
  píldora activa de 60×32 flota en celdas enormes. Estándares: en tableta y escritorio el modelo es carril lateral
  (Material 3 *navigation rail*; iPadOS barra lateral). Propuesta: sección 5.4.
- **H-35 · Dos anchos incoherentes en la misma sección.** Lugares a 1280 px: la lista en 600 y el mapa a lo ancho; la
  ficha en 600 con la foto de 600×220. Propuesta: el ancho de contenido crece por plantilla (lista 600–680; mapa +
  lista lado a lado; ficha a dos columnas desde 1024).
- **H-36 · Flotantes al centro de la ventana.** «Publicar evento» y «Ver en lista» quedan flotando a mitad de un
  escritorio de 1280, dentro de la columna, tapando tarjetas. Se resuelve con H-01 y H-13.
- **H-37 · Cabecera de escritorio de teléfono.** Chip de ciudad y lupa de 40 px en una barra de 1280; la búsqueda
  podría ser un campo visible. Propuesta (v1): campo visible en escritorio. El founder: «buscar desplegado no suma
  nada»; **v2**: la lupa abre la pantalla de búsqueda y en escritorio vive en el carril.
- **H-38 · `--al-centro` sobre `100vw`** (`globals.css:50`). En navegadores con barra de desplazamiento clásica
  (Windows, Linux, Mac con «siempre»), `100vw` incluye la barra: el gutter calculado se pasa 7 u 8 px por lado y los
  márgenes negativos de H-24 pueden abrir desplazamiento horizontal. No se pudo reproducir en el Chrome de la Mac
  (barras superpuestas); queda como riesgo. Se resuelve quitando `100vw` (contenedor con `max-width` y `margin: auto`).

## 3. Inventario del sistema actual

### 3.1 Cifras

| Qué | Cuánto | Nota |
|---|---|---|
| Hojas de estilo | 100 (99 `.module.css` + `globals.css`), 8 648 líneas, 1 246 reglas | `admin.module.css` 793 líneas; `HojaDondeEs` 444; `mando` 441; `FormularioCanon` 427; `Ficha` 417 |
| Tokens en `globals.css` | 50, todos en uso | Faltan: escala de capas (z), radios chico y píldora, alto de control de barra, zonas seguras con nombre, puntos de quiebre, aire de 32 y 40 |
| Tokens locales (definidos fuera de `globals.css`) | 9 archivos | `--alto-mediana/grande/chica` (Destacados), `--alto-hoja` (Mapa y lugares, dos veces), `--cabecera-animacion` (3 archivos), `--fila1`, `--alto-barra-fija`, `--pos`, `--pulso` |
| Medidas en píxeles en duro (sin 0, 1 y 2) | 691 | `border-radius: 999px` ×35, `padding: 14px` ×29, `10px` ×23, `gap: 6px` ×17, `grid-template-columns: 24px` ×15, `font-size: 16px` ×12, `border-radius: 10px` ×10, `min-height: 40px` ×9, `width/height: 44px` ×14, `64px` ×14, `40px` ×14… |
| Colores literales | 68 usos, 42 distintos | Entre ellos el azul petróleo retirado en septiembre, aún en `mando.module.css:227,242,409` (`rgba(15,107,124,…)`); `#0a84ff` y `#1a73e8` (azules de sistema); `#666`, `#999` (letrero); `#fdf3f2` (fondo de error sin token) |
| Alturas fijas (`height`/`min-height`/`max-height` en px) | 137 | admin 17, Esqueleto 12, FormularioCanon 12, mando 8, ChipFecha 5, Ficha 4, Cabecera 4, ajustes 4… |
| `z-index` | 44 declaraciones, **17 valores distintos** (1, 2, 3, 4, 5, 9, 10, 11, 20, 21, 30, 40, 50, 55, 60, 70) | Sin escala: la hoja es 40, la capa de «Dónde» 55, la lista flotante 60, el texto largo 70, el visor del cartel 50, la sonda de Pincel 30 igual que la franja de la hora |
| `position` | 50 `absolute`, 17 `fixed`, 7 `sticky`, 30 `relative` | 5 elementos fijos pueden coincidir en una raíz (barra de hora, nav, flotante, conmutador, volver arriba) |
| Bloques de declaraciones repetidos (≥ 4 iguales en ≥ 2 reglas) | 35 | Ver 3.3 |
| Consultas de medios | 14 `prefers-reduced-motion`, 3 `print`, 2 `max-width` (340 y 350 px, parches), 1 `hover` | Ninguna regla responsiva de verdad: un solo diseño para 320 a 1920 px |
| Componentes | 36 en `ui/`, 51 en `components/` | `ui/Tarjeta.tsx` no lo usa nadie |

### 3.2 Lo que se repite entre pantallas (variantes que se pisan)

**Once botones redondos** (el mismo gesto, once dibujos): lupa y acciones de cabecera 40 con borde
(`Cabecera.redondo`); ✕ 40 con borde (`Cerrar`); chip de fecha 40 con borde y 4 px invisibles (`ChipFecha.soloIcono`);
ubicación 48 borde + sombra flotante (`lugares.ubicacion`); volver arriba 48 borde + sombra flotante
(`Cabecera.volver`); acciones de ficha 56 con sombra (`Ficha.accionIcono`); compartir sobre avatar 48 con sombra
(`Ficha.compartirFoto`); «+» de renglón y tarjeta 48 con sombra (`BotonRenglon`); ··· de barra 44 plano
(`Ficha.iconoBarra`); campana y administración 44 planos (`Sesion`); «Estoy aquí» 48 con sombra sin borde
(`Mapa.ubicame`).

**Siete píldoras:** flotante 48 primario (`Publicar`); Entrar 40 primario (`Sesion.entrar`); Atrás 40 secundario;
«Ver en lista» 48 secundario con sombra (`verOtraVista`); chips 44 y 40 (`Chip`, `.deContexto`); «Probar con otra
foto» 36 (`rehacerCartel`); sellos 24 (`van`, `reciente`, `interesa`, `estado`).

**Seis rectangulares:** `Boton` 48 (radio 12, ancho completo); `Ficha.primaria` 48; `Ficha.secundario` 48;
`AgendaInicio.accion` 48 (borde en tinta); `publicadoBoton` 44 (radio 10, borde en tinta); `menuItem` 48 (sin borde).

**Cuatro renglones** (3.1, H-33) y **dos tarjetas de lista** (`ui/Tarjeta` sin uso y `Renglon`). **Radios:** 999, 50 %,
16, 12, 10, 8 y 4 px, con tokens solo para 12 y 16.

### 3.3 Duplicados exactos (mismas declaraciones, archivos distintos)

- `HojaDondeEs.module.css` ≡ `HojaDondeLugar.module.css`: once bloques iguales (`.resumen` 15 declaraciones, `.estoyAqui`
  14, `.campo` 13, `.avisoUbicacion` 12, `.atras/.listo` 11, `.marcaPrivado`≡`.marcaExiste` 10, `.cabecera` 8,
  `.cabecera h2` 7, `.capa`, `.cuerpo`, `.campo input` 6). Son la misma hoja, dos veces (444 y 207 líneas).
- `Mapa.module.css` ≡ `MapaDondeEs.module.css`: `.aviso` 12, `.yo` 7, `.yo::after` 7.
- `.palanca` y `.palanca::after`: `ajustes` y `FormularioCanon` (19 declaraciones).
- `.soloLector` ×3 (`SelectorEnlaces`, `ChipFecha`, `SelectorFecha`); `.icono` ×3 (`borrado`, `Bloquear`, `Borrar`);
  `.tarjeta` ×4 (`admin`, `ajustes`, `bloqueados`, `Sugerencia.lista`); `Desbloquear.boton` ≡ `Ficha.secundario`;
  `FormularioArtista.notaExiste/nombreRecortado` ≡ `FormularioLugar`; `Bloquear.confirmar/cancelar` ≡ `Borrar`.
- `Esqueleto.module.css` copia a mano las medidas de `Renglon` (64), `Destacados` (132, 248, 104, 220 px) y las fichas:
  dos fuentes de verdad que ya se separaron una vez (OL-226 cambió la tarjeta sola y el esqueleto no).

### 3.4 Reglas que deshacen otras

`ChipFecha .conFecha.conFecha` (clase repetida para pesar más que `Chip`), `AgendaInicio` con el mismo truco antes,
`Destacados .uno.redondas` (corregido en OL-226 con `:not()`), `.cartelSinCupo`/`.cartelPedida`/`.cartelLeido` que
devuelven a `.cartel` sus valores por defecto, `Cabecera .acciones:empty { padding: 0 }`, `FormularioCanon
.accionIcono` con un `grid-area` que «no aplica dentro de `.opciones`». Cada una es una variante que compite con la
base en vez de partir de ella.

## 4. Lectura transversal por leyes

- **Región común.** Bien en Ajustes, en las tarjetas del canon de formularios y en la barra de acciones de la ficha.
  Mal donde las acciones se reparten a los extremos (H-20) y donde un flotante invade la región de la lista (H-01,
  H-08, H-15).
- **Proximidad.** Los grupos de Inicio están claros (32 px entre carriles, 16 dentro); en la ficha, 68 px entre
  acciones hermanas las separa más que lo que las separa del mapa (H-20); en Agenda, cuatro líneas de meta a 2 px
  se leen como un bloque de texto, no como datos (H-09).
- **Consistencia y estándares.** Once círculos, siete píldoras, cuatro renglones, dos títulos de sección, dos cabeceras
  con dos comportamientos, Compartir en dos sitios (3.2, H-04, H-10, H-27). Frente a iOS y Android: la barra de
  pestañas abajo es correcta en teléfono; en tableta y escritorio ninguna de las dos plataformas la estira (H-34);
  la acción de crear vive en la barra (iOS) o en un botón flotante que **no** tapa acciones de fila (Android reserva
  el borde derecho para él y quita los accionables de esa columna).
- **Fitts.** 5 controles de cabecera a 40 px (H-05), «ver» de 34 px y «más» de 24 (H-26), enlaces legales de 18 px de
  alto; objetivos tapados por el flotante (H-01, H-08, H-15); acciones opuestas «Me interesa / Voy» con 18 px de aire
  (cumple los 14 mínimos).
- **Tesler.** El sistema ya absorbe mucho (fecha sugerida, tipo deducido, ciudad por contexto). Le carga a la persona
  la dirección postal en la lista (H-09), tres sellos por cartel (H-02), leer un carril de enlaces que se corta (H-25) y
  descubrir que la tira de tipos sigue a la derecha (H-11).
- **Modelos mentales.** Agenda = lista por día con acción rápida (cumple). Mapa = ver y tocar puntos, cambiar de vista
  arriba (H-13). Ficha = foto, título, datos, acciones, más (cumple; H-22 en la foto). Alta = un campo y renglones
  resueltos (cumple; H-29). Directorio = letras (cumple; H-16 lo mezcla con carril). Escritorio = barra lateral y dos
  columnas (H-34, H-35).
- **Aesthetic-Usability.** Lo que más resta: carriles grises (H-03), bloques grises de 220 px (H-22), tres capas sobre
  el cartel (H-02), veinte círculos con sombra por pantalla (H-19), controles de tamaños distintos en la misma barra.
- **Jobs to be done** por pantalla: en la sección 2. El que hoy peor se sirve es «llegar a un lugar y saber si hay algo
  ahora» en el mapa (etiquetas encimadas, controles encima) y «ver de un vistazo qué hay hoy» en Agenda (3 eventos por
  pantalla).
- **UX invisible.** El alta cumple (deduce, resume, abre selectores). Donde el sistema muestra dos cosas para una
  decisión: mensaje doble (H-29), dos accionables superpuestos (H-01), dos títulos para lo mismo (H-10).

## 5. Propuesta (primera versión, para discutir con el founder)

Principio: **las mismas piezas, las mismas variables y las mismas reglas en teléfono, tableta y escritorio, y en web,
iPhone y Android; solo cambia dónde vive cada pieza.** Nada de componentes «nativos» ni de versiones por plataforma
(decisión del founder del 2026-09-25). Estética como criterio máximo: menos objetos por pantalla, un solo peso para
cada tipo de control, aire por rejilla.

### 5.1 Variables canónicas (`globals.css`)

| Grupo | Tokens | Sustituye a |
|---|---|---|
| Aire | `--espacio-1…8` = 4, 8, 12, 16, 20, 24, **32, 40** | los `32px` literales (Destacados), `14px`, `10px`, `6px` (se normalizan a 16/12/8/4) |
| Radios | `--radio-chico 8`, `--radio 12`, `--radio-grande 16`, `--radio-pildora 999px`, `--radio-redondo 50%` | 35 `999px`, 10 `10px`, 7 `8px` literales |
| Controles | `--control 44` (todo lo que se toca en barras y cabeceras), `--toque 48` (botones y campos), `--boton-icono 48`, `--boton-icono-grande 56` (solo acciones de ficha), `--toque-min 44` (se queda) | los 40 px de H-05 y los once círculos |
| Barras | `--alto-barra 56` (raíz y ficha; 64 en escritorio), `--alto-cabecera-compacta 44`, `--alto-nav 60`, `--alto-barra-acciones 72`, `--ancho-carril-nav 88` (tableta y escritorio) | `96px` de `.pagina`, `72px`, `73px` |
| Zonas seguras | `--tope` (se queda), `--piso: env(safe-area-inset-bottom)`, `--lado-izq`, `--lado-der` | los 16 `env(safe-area-inset-bottom, 0px)` sueltos |
| Capas | `--z-pegajoso 10`, `--z-flotante 20`, `--z-barra 30`, `--z-hoja 40`, `--z-capa 50`, `--z-encima 60` | 44 `z-index` en 17 valores; ningún `z-index` fuera de un token |
| Color | los 17 de hoy + `--error-suave #fdf3f2`, `--ok-suave`, `--sistema-azul` (ubicación) | `#fdf3f2`, `#1a73e8`, `#0a84ff`, `rgba(15,107,124,…)` |
| Letra | la escala de hoy + `--letra-2xs 0.75rem` (nav, sellos) | `0.75rem`, `13px` ×6 |
| Anchos | `--columna 600` (lectura), `--columna-ancha 960` (escritorio), `--panel 400` (lista junto al mapa) | `--al-centro` sobre `100vw` (H-38) |
| Puntos de quiebre (en `@media`, con comentario al token) | teléfono < 600 · teléfono grande / apaisado 600–767 · tableta 768–1023 · escritorio ≥ 1024 | los parches de 340/350 px |
| Tarjetas y renglones | `--tarjeta-mediana 220/132`, `--tarjeta-grande 165/248`, `--tarjeta-chica 104`, `--foto-renglon 56`, `--foto-ficha 5/3` | los números copiados en `Esqueleto` |

### 5.2 Biblioteca de componentes canónicos (qué se unifica, qué se retira)

| Componente | Variantes | Estados | Sustituye / retira |
|---|---|---|---|
| `Boton` | `primario`, `secundario`, `texto`, `peligro`; forma `recta` o `pildora`; alto `control` (44) o `toque` (48); ancho `contenido` o `completo` | reposo, pulsado, foco, deshabilitado **con motivo**, en camino | `Ficha.primaria/.secundario`, `AgendaInicio.accion`, `publicadoBoton`, `Sesion.entrar`, `rehacerCartel`, `verOtraVista`, `Publicar` |
| `BotonIcono` | tamaño `control` 44 (barras), `accion` 48 (renglón, tarjeta, mapa), `grande` 56 (ficha); relieve `plano` (barras), `elevado` (acciones en listas, tarjetas, mapa y ficha), `contorno` (solo opciones secundarias en formularios) | los mismos + `decidido` (verde con glifo blanco, contraste medido) | los once círculos de 3.2, `Atras` (chevron + texto sigue siendo `Boton` secundario píldora), `Cerrar` |
| `Chip` | `filtro` (botón o enlace), `contexto` (ciudad, fecha), `estado` (Vas, Sigues, Te interesa), `sello` (sobre foto: vidrio) | reposo, activo, en camino, deshabilitado | `Destacados .van/.reciente/.interesa`, `Renglon .estado/.sello`, `ChipFecha` (queda como composición) |
| `Pestanas` | `repartidas`, `desplazables` (asoman) | activa, en camino | igual, con la regla de H-11 |
| `Barra` | `raiz` (logotipo, «+», sesión), `interior` (Atrás, logotipo, ···), `tarea` (logotipo, ✕) | pegajosa siempre; compacta en raíz | las tres de hoy; sin márgenes negativos |
| `Cabecera` | contexto + acciones + filtros (+ tira de letras) | compacta / completa; búsqueda abierta | igual, una sola pieza pegajosa (H-04, H-18) |
| `Navegacion` | `abajo` (teléfono: 4 destinos), `lateral` (tableta y escritorio: 4 destinos + «+» + sesión) | activo, con punto | `NavInferior`; el flotante se retira |
| `Renglon` | `lista` (foto 56, título, meta ≤ 2 líneas, acción), `dato` (icono, principal, secundario, acción), `ajuste` (icono, etiqueta, detalle, valor/palanca/chevron), `resuelto` (icono, clave/valor, acción, cuerpo) | reposo, pulsado, elegido, pendiente, abierto, apagado | `.frente`, `.dato`, `.fila`, `.resuelto`; `Esqueleto.renglon` se deriva de sus tokens |
| `Tarjeta` (de carril) | `grande`, `mediana`, `chica` (redonda), `sola` | con sello, con acción, decidida | `Destacados` (se queda como carril) + `CarrilEsqueleto` derivado; `ui/Tarjeta.tsx` (sin uso) se borra |
| `Palanca`, `SoloLector`, `IconoEnCirculo` | — | — | las copias de 3.3 |
| `HojaDonde` | `evento`, `lugar` | — | `HojaDondeEs` + `HojaDondeLugar`; `MapaDondeEs` entra en `Mapa` como modo `elegir` |
| `Ficha` (plantilla) | cabecera (foto 5:3 o avatar), título, `Renglon dato` ×n, acciones (≤ 4 + Más), cuerpo, pie, barra de acciones | — | `Ficha.module.css` reordenado; `Cartel` con caja 5:3 |
| Se conservan tal cual | `Hoja`, `Aviso`, `Campo`, `CampoLargo`, `Buscador`, `SelectorFecha`, `Esqueleto` (derivado), `Cargando`, `Logotipo`, `ListaFlotante`, `Sugerencia` | | |

### 5.3 Plantillas de pantalla (rejillas con áreas, sin envoltorios)

Regla común: **la página no lleva gutter; cada bloque pone el suyo** con una clase `.columna` (`padding-inline:
var(--gutter)`) o `.a-lo-ancho`. Desaparecen los márgenes negativos (H-24, H-31, H-06, H-18). Los únicos elementos
fijos son la navegación, la barra de acciones de la ficha y la hoja; ningún flotante sobre listas.

- **Raíz** (Inicio, Agenda, Lugares, Artistas): `main` con `grid-template-rows: auto 1fr auto` y áreas `cabecera`,
  `contenido`, `nav`. La cabecera es una sola pieza pegajosa (barra + contexto + filtros) que se compacta a 44. El mapa
  llena `contenido` (H-14). En tableta y escritorio el `nav` pasa a la columna izquierda: `grid-template-columns:
  var(--ancho-carril-nav) 1fr`.
- **Lista**: la raíz con `contenido` = títulos de grupo pegajosos bajo la cabecera + `Renglon lista`. Escritorio:
  columna de 680 px; tableta: 600 centrada en lo que queda.
- **Ficha**: `barra` (interior, pegajosa), `cabecera-ficha`, `datos`, `acciones`, `cuerpo`, `pie`, `barra-acciones`
  (fija abajo, alto `--alto-barra-acciones`, y `contenido` reserva exactamente ese alto). Desde 1024 px: dos columnas
  (foto y datos a la izquierda 5/12; acciones, mapa y quién va a la derecha 7/12) dentro de `--columna-ancha`.
- **Alta**: `barra tarea`, `titulo`, `campo`, `renglones resueltos`, `boton` (viaja sobre el teclado). Escritorio:
  600 centrada, con pie visible (H-32).
- **Hoja**: portal; teléfono desde abajo; tableta y escritorio centrada a 600 (como hoy).

### 5.4 Reglas responsivas y por plataforma

| Ancho | Navegación | Contenido | Carriles | Mapa | Ficha |
|---|---|---|---|---|---|
| Teléfono < 600 | abajo, 4 destinos; «+» en la barra | una columna, gutter 20 | a lo ancho, asoman | pantalla completa entre cabecera y nav | una columna, barra de acciones fija |
| Teléfono grande / apaisado 600–767 | abajo | columna 600 centrada | **simétricos** (sangran a los dos lados) | igual | igual |
| Tableta 768–1023 | **lateral** de 88 px con iconos y etiquetas | columna 600 centrada en lo que queda | dos tarjetas más por fila | mapa + panel de lista de 400 a la izquierda | una columna de 680 |
| Escritorio ≥ 1024 | lateral con «+» y sesión | hasta 960 | tarjetas de la misma medida, más por fila | mapa + panel 400 | dos columnas |

Por plataforma, sin perder consistencia: **web** (ratón: hover en renglones y tarjetas; foco visible; campo de búsqueda
visible en escritorio); **iPhone** (Capacitor: zonas seguras por `--tope/--piso`, gesto de atrás nativo ya resuelto, sin
menú de copiar, sin hover); **Android** (TWA: el botón físico de atrás es el historial, que ya lleva la marca propia;
color de la barra de estado por `themeColor`; el «+» arriba evita el choque con el gesto de atrás del borde inferior).
Ninguna pieza cambia de dibujo entre plataformas: cambia de sitio (navegación) o de tamaño (columna).

### 5.5 Reparto de acciones y sellos (las reglas que cierran los defectos)

- Acciones de ficha: alineadas a la izquierda, aire 16, hasta 4 visibles a 48 px (5 caben a 390 con aire 12); desde
  6, «Más» abre una hoja. Nunca carril (H-20, H-25).
- Un sello sobre la foto como máximo; el «+» sin sombra sobre fondo hueso (H-02, H-19).
- Foto de ficha en caja 5:3 con el cartel entero; sin foto, sin caja (H-22).
- Renglón de lista: dos líneas de meta como máximo; el sitio por su nombre; el precio solo si no es gratis (H-09).
- Un solo mensaje por renglón pendiente, tras el primer intento (H-29); las dos altas con el mismo tono (H-30).

## 6. Prototipo interactivo (v1, v2 y v3 el 2026-09-28; la v3 recoge de la quinta a la duodécima vuelta del founder)

**Dónde:** [`prototipos/restructura-ui.html`](prototipos/restructura-ui.html), una sola página con la app entera
dentro de un aparato que cambia de tamaño (teléfono 390×844, tableta 820×1180, escritorio 1280×800) **sin cambiar el
marcado**: las reglas responsivas de 5.4 son consultas de contenedor sobre el mismo HTML. Se navega de verdad: las
cuatro pestañas, tocar una tarjeta o un renglón abre la ficha, el «+» abre la pantalla de publicar, la lupa abre la
búsqueda, la ciudad, Cuándo y Filtros abren su hoja (un valor en Cuándo pasa Inicio a la lista por día), la hoja de Lugares se arrastra, tocar un pin o un renglón de
Lugares abre la ficha dentro de la hoja, la portada abre el visor, Voy y Seguir cambian de estado con su aviso y
Deshacer, y al bajar en una lista la barra y la navegación se guardan (vuelven al subir). Un conmutador de la sala
alterna la letra de listas y tarjetas (la condensada que se queda y las dos descartadas). Capturas reales
con el Chrome de la Mac: v1 en
[`capturas-256/256-30…49-proto-*.png`](capturas-256/), v2 en [`capturas-256/256-50…74-v2-*.png`](capturas-256/) y v3
en [`capturas-256/256-75…128-v3-*.png`](capturas-256/), descritas en la bitácora 256 (segunda, tercera y cuarta
parte). La fuente del prototipo (un generador de Python con sus SVG) queda en `scripts/ops/auditoria-ui/prototipo/`.

### 6.1 Lo que la v1 respondió (primera vuelta del founder)

«Me gusta el "+" de publicar pero entonces qué icono usamos para Voy y Seguir», «cómo puedes mejorar fichas… crear
kpi's, optimizar lectura, mejorar la estructura», «cargadores y transiciones… incluir en esta pasada», «acepto tus
recomendaciones en general»:

- **Iconos.** El «+» queda para publicar. «Voy» es la palomita (modelo de Facebook: *Going* es ✓, *Interested* es ☆,
  que ya usamos); «Seguir», la persona con «+» (X, LinkedIn, Instagram). El estado decidido es el círculo verde con la
  palomita blanca en los tres casos: «ya quedó» se lee igual en toda la app.
- **Fichas con estructura y KPI.** Portada, título, tres KPI en tarjetas tocables, acciones alineadas, «Dónde» como
  tarjeta con mapa y dirección, bloques con el mismo renglón de dato, pie, barra fija con el par secundario + primario.
  En el lugar, su agenda dentro de la ficha («Próximos eventos») en vez de «Próximo: … ver».
- **Cargadores y transiciones** (doc 38 y OL-152): esqueleto de renglones al entrar a Agenda y Artistas (mismos tokens
  que el renglón real), fundido de 200 ms entre secciones, la ficha entra deslizando y el cartel tocado **se convierte
  en la portada** (View Transitions con respaldo en CSS y salto directo con «reducir movimiento»), el alta sube como
  tarea, la hoja sube con fondo oscuro. Ninguna animación toca la barra de navegación.

### 6.2 Lo que la v2 cambió (vueltas dos, tres y cuatro del founder, el mismo día)

- **Barra raíz tipo Instagram** («podría ir por una estructura tipo Instagram… con el perfil integrado en navbar»):
  «+» a la izquierda, logotipo al centro, lupa y campana a la derecha; **Perfil** entra a la barra inferior como
  quinto destino (con el avatar). En tableta y escritorio el carril lleva la marca, los cinco destinos, Publicar, Buscar
  y Novedades.
- **Buscar no se despliega** («no suma nada… se ve poco minimalista»): la lupa abre la pantalla de búsqueda con el
  campo, la ciudad, «Recientes» y atajos de la semana. Se cuestionó llevar Buscar a la barra inferior: con Perfil ya
  son cinco destinos, seis rompen los 44 px por destino a 390 px, y Instagram tampoco la mete en la barra en la web;
  por eso va arriba a la derecha (sección 11, para confirmar).
- **Filtros como accionable** («más como un accionable que despliega listado multi selección en bottom sheet»): la
  fila lleva «Filtros» con el conteo de activos, el chip de ciudad (la ciudad ordena, no limita) y cada filtro activo
  como chip que se quita con ✕. «Filtros» abre una **hoja inferior de selección múltiple** por bloques (Agenda: Cuándo,
  Cuánto, Siguiendo, Dónde; Lugares: Tipo con conteos, Cuándo, Siguiendo, Dónde; Artistas: Disciplina con conteos, Con
  fechas, Siguiendo, Dónde) con «Limpiar» y «Ver N eventos/lugares/artistas». Se retiran los chips rápidos sueltos.
- **Lugares sin segmento Mapa · Lista** («no me gusta dónde se colocó»; «Analiza, cuestiona, propón»): el mapa llena la
  pantalla y **la lista vive en una hoja inferior** con tres alturas (asoma: resumen y primer renglón; media; llena)
  que se arrastra o se toca en el asa; tocar un pin muestra su tarjeta en la hoja («Ver la ficha», «Volver a la
  lista»). Desde 792 px la hoja es el panel izquierdo (400 px) y el mapa el resto, como Apple Maps y Google Maps en
  escritorio. Cero flotantes además de ubicación y atribución.
- **Botones de acción elevados** («el contorno blanco no me gusta, por eso estaba a favor de elevación… estética
  solamente»): Voy y Seguir en listas, tarjetas y mapa llevan sombra (relieve `elevado`); una sola palomita (se quitó
  el círculo dentro del círculo, «de las propuestas que más me decepcionan»); el estado decidido es **verde con el
  glifo blanco**: el violeta sobre verde de la v1 daba 1,4:1 y no se veía («ese error de accesibilidad es básico»).
  Desde esta v2 la medición del DOM comprueba el contraste de cada icono de control (≥ 3:1, WCAG 1.4.11): 0 fallos en
  las once pantallas. El relieve `contorno` queda solo para opciones secundarias dentro de formularios (Estoy aquí,
  Buscar el lugar).
- **«+» abre publicar tipo Instagram** («se muestran tabs en la base con los tipos de publicación, tomando en cuenta el
  contexto»): la pantalla trae el formulario del tipo que toca por contexto (Inicio y Agenda → evento; Lugares →
  lugar; Artistas → artista) y una **tira inferior con los tres tipos** (EVENTO · LUGAR · ARTISTA, el actual en negro
  con un punto) para cambiar sin salir. Se retira la hoja intermedia «¿Qué publicas?» de la v1.
- **Inicio con menos aire** («el de título y slider se ve muy amplio»): cada sección a 16 px de la anterior y el título
  a 14 px de su carril (antes 24 y 44).
- **Fichas** («héroe ancho completo, imagen cover», «KPI del mismo alto», «ubicación solo distancia», «Dónde no se
  entiende», «Con debe decir Artistas», «angle del lado derecho», «la de artista debe mejorar»): portada a todo lo ancho
  con la imagen en **cover 4:3** (el cartel entero se abre con la lupa flotante); **tres KPI del mismo alto** (rejilla:
  cada tarjeta estira a la fila) con etiquetas que dicen qué son: evento *Fecha* (día y hora en dos líneas) · *Costo* ·
  *Van*; lugar *Distancia* («1,4 km», sin colonia) · *Eventos* · *Seguidores*; artista *Fechas* · *Seguidores* ·
  *Lugares*. «**Artistas**» en vez de «Con» (frase llana, como el resto de la app), y **chevron a la derecha** en todo
  renglón que lleva a otra ficha (Dónde, Artistas, Quién va, Se presenta en). **Ficha de artista**: cabecera con
  avatar redondo, nombre, disciplinas · tipo · ciudad y Compartir; KPI; enlaces (Instagram, Sitio web, YouTube);
  Próximas fechas con su Voy; Sobre; Se presenta en; barra fija «Seguir» que pasa a «Sigues». En escritorio la
  portada (o la cabecera del artista) ocupa la columna izquierda y todo lo demás corre por la derecha, como Instagram
  en escritorio, sin filas infladas por el reparto de la rejilla.

### 6.3 Defectos que la revisión de la v2 encontró y cerró antes de enseñarla

Regla de esta pieza: nada se declara verificado sin la captura. La primera tanda de capturas mostró la hoja de filtros
encima de doce pantallas: **la hoja no se cerraba** (el manejador de clics tomaba el contenedor de la hoja, que
también lleva `data-hoja`, como disparador y la volvía a abrir). Se corrigió el orden y el selector, y se probó que
abre y cierra con ✕, con el fondo y con «Ver N». La segunda tanda mostró **la barra de acciones a media pantalla** al
bajar en la ficha: estaba en `position: absolute` dentro del contenedor que desplaza, igual que la tira de modos del
alta. Las dos pasan a `position: sticky; bottom: 0` como último hijo, sin padding reservado (medidas a 0 px del pie con
el scroll en 0, en 600 y al final). También: la tarjeta del pin no cabía en la hoja «asoma» (altura del contenido
cuando hay pin); un `<span>` sin estilo alrededor del chevron y de opciones únicas (fuera); la pila de avatares y el
chip con ✕ usaban márgenes negativos (columnas que se solapan y padding); el botón de las tarjetas redondas se salía
de su caja (dentro); «Voy a» en Perfil frente a «Voy» en su KPI (una sola palabra).

### 6.4 Medición de la v2 (`medir.js` sobre las once pantallas, teléfono)

0 envoltorios sin estilo, 0 desbordes, 0 márgenes negativos, 0 iconos de control por debajo de 3:1, profundidad máxima
6 (229 nodos en Inicio, 33 en Buscar). Los únicos controles por debajo de 44 px: los chips (36 px visibles, 44 al tacto
con `::before`), la tira de letras (34×36, se arrastra), el asa de la hoja (28 px a todo lo ancho), los `input` dentro
de campos de 48, las palancas de 51×31 (todo el renglón conmuta) y el enlace «Reportar» dentro de un párrafo (WCAG
2.5.8 lo exceptúa).

**Lo que el prototipo demuestra sobre la maquetación (regla de esta pieza):** cero márgenes negativos; la página no
lleva gutter (cada bloque pone el suyo); la cabecera se compacta con `grid-template-rows: minmax(0, 1fr) → minmax(0,
0fr)`, sin `margin-top` negativo ni JavaScript de alturas; el mapa llena la fila central de la rejilla sin `calc` de
alturas; las barras al pie son `sticky` y no reservan padding; un solo `:root` con las variables de 5.1; renglón único
con cuatro pieles; once círculos → un `BotonIcono` con tres tamaños y tres relieves.

**Lo que todavía es dibujo, no medida:** el mapa es un fondo esquemático con los puntos colocados a mano para
mostrar el resultado que debe dar la capa de símbolos (H-12); los carteles se cargan de las URL públicas del sitio.

### 6.5 Lo que la v3 cambió (quinta vuelta del founder, el mismo día)

Tres mensajes seguidos sobre la v2. Lo que dijo, lo que se cuestionó y lo que quedó:

- **Orden de la fila y un solo estilo** («¿primero colocamos ubicación y luego filtros, fecha, chips de filtros?»,
  «usas diferentes estilos para selector de lugar en Inicio que en el resto de la app», «¿agregarías selector de fecha
  en Inicio? ¿La fecha (Cuándo) debería permanecer fuera de filtros?»). Una sola fila de contexto en todas las raíces,
  con el mismo chip: **[ciudad · Cuándo · Filtros] y después los activos con ✕**. Ciudad primero porque no filtra:
  dice desde dónde se mide («la ciudad ordena, no limita»). Cuándo segundo porque es la pregunta más frecuente de una
  agenda («¿qué hay hoy, el fin de semana?») y merece un toque, no dos: **sale de la hoja de filtros** y abre la suya
  (Próximos · Hoy · Mañana · Fin de semana · Esta semana · Elegir fecha); el chip muestra el valor elegido en violeta.
  Filtros al final porque refina lo que ya está acotado. El selector de ciudad sin borde de Inicio (y el de Buscar)
  desaparecen: es el mismo chip en todas partes y abre la hoja «Dónde estás» (Cerca de ti · San Luis Potosí · Otra
  ciudad). Cuestionado: con un valor en Cuándo la fila ya no cabe en 390 y se desplaza (como en Google Maps); se
  aceptó antes que abreviar.
- **Agenda fuera del menú** («¿agregarías selector de fecha en Inicio?… ¿Es necesario mantener en el menú la opción
  de agenda?»). No hace falta: **Inicio conserva su nombre, su icono y sus seis carriles y gana la fila de contexto**;
  cualquier valor en Cuándo (Hoy, Mañana, Fin de semana, Esta semana, una fecha o Todos los próximos) **muestra la
  lista por día dentro de Inicio** en lugar de los carriles, y «Limpiar» devuelve los carriles. Los títulos
  «Destacados», «Esta semana» y «Nuevos eventos» abren esa lista; «Tus planes» lleva a Perfil; «Lugares con eventos»
  y «Artistas destacados», a su pestaña. La barra inferior queda con **cuatro destinos** (Inicio · Lugares · Artistas ·
  Perfil). Una primera pasada había fundido las dos pantallas en una pestaña «Eventos» sin carriles; el founder la
  paró («¿Qué pasó con Inicio?») y se volvió a lo dicho: Inicio con selector de fecha.
- **La ficha de lugar dentro de la hoja** («al seleccionar un pin, mostrar directamente la ficha del lugar en drawer…
  evitar el paso adicional de ver la ficha y volver a lista… la ficha se muestra sobre el drawer de lista y al cerrar
  se regresa al estado anterior manteniendo scroll; lo mismo un elemento del listado»; y después: «las sheets deben
  tener botón de cerrar en sheet»; «cuando abres sheet la información de sheet debe estar dentro de esa sheet, estás
  usando la barra del sitio»; «los héroes de ancho completo y el título dentro de la imagen van en el sentido de
  integrar elementos»). Hecho: pin o renglón abren la ficha **como capa sobre la lista** (la lista no se desmonta y
  conserva su desplazamiento). **Todo lo de la hoja vive en la hoja:** el héroe a todo lo ancho arriba con la
  etiqueta y el título dentro de la imagen, y sobre la imagen el asa, Cerrar (izquierda) y el menú (derecha: Editar,
  Reportar, Compartir), elevados; al desplazar, esa misma cabecera se vuelve compacta y pegajosa dentro de la hoja
  (fondo blanco, título en una línea). Cerrar devuelve la hoja al estado y al desplazamiento que tenía. Desde 792 la
  ficha abre en el panel con la misma cabecera, y el mapa y la fila de contexto siguen a la vista. Una pasada
  intermedia había puesto Cerrar y el título en la barra del sitio; el founder la paró («que diablos sucede») y se
  corrigió.
  **Cómo se mueve la hoja** («el comportamiento es muy torpe y poco intuitivo: que aparezca en el alto suficiente para
  que se vea foto y KPI; al deslizar hacia arriba dentro del sheet primero se hace más grande hasta cubrir la
  pantalla, no es necesario que se vea header ni filtros; luego ya se activa el scroll interno, pero solo hasta que el
  sheet alcanza su alto máximo»): la hoja es **un solo contenedor que desplaza**, con dos espaciadores invisibles y
  después el cuerpo blanco que asoma desde abajo. Arrastrar (o la rueda) sobre el cuerpo lo sube: la hoja «crece»; en
  cuanto su borde llega arriba (cubre barra, filtros y mapa, y la navegación se guarda) el mismo gesto sigue
  desplazando el contenido, con una sola inercia nativa. Al soltar entre alturas se asienta en la más cercana (lista:
  asoma · media · llena; ficha: foto + KPI · llena). Con la ficha, abre a la altura exacta de foto + KPI (medida) y
  al bajar del todo vuelve a esa altura; Cerrar devuelve la lista. Probado con la rueda del Chrome: abre a foto + KPI,
  200 px de rueda la llenan, los siguientes desplazan el contenido, la rueda hacia arriba la devuelve a foto + KPI.
  Dos añadidos del founder desde el lienzo: **llena, la hoja es una página completa con Atrás** («¿podemos hacer que
  el sheet se convierta en una hoja completa que muestre este botón atrás?»): el mando de la izquierda pasa de Cerrar
  a Atrás y devuelve la hoja a foto + KPI; y **jalar hacia abajo recoge, nunca cierra** («¿si el usuario jala el
  sheet hasta abajo se cierre?» y luego «ojo, el listado de lugares nunca se va: si lo jalas se activa el estado peek,
  que muestre solo la cantidad de lugares», «también vale la pena hacer estado peek de ficha de lugar y que no se
  cierre hasta dar tap en la X»): la altura más baja de la hoja es «recogida», una altura real más (lista: solo el asa
  y «62 lugares», 64 px; ficha: solo su cabecera compacta con el nombre, sin la pastilla), a la que se llega jalando;
  desde ahí se vuelve a subir con el mismo gesto o con un toque en el asa. La ficha solo se cierra con la ✕, que
  devuelve la lista a la altura y al desplazamiento que tenía.
- **Cuatro ajustes más desde los comentarios del founder sobre el prototipo:** el **radio** baja a la mitad en todos
  los casos («bájale al redondeado, más sugerido, para todos los casos, es canon»: 4 · 8 · 12 en vez de 8 · 12 · 16;
  las fotos de renglón a 4; la hoja conserva sus 24); los **filtros van centrados** en tableta y escritorio («¿puedes
  centrar los filtros?»), salvo en Lugares, donde se alinean con el panel para no quedar sobre el mapa (a confirmar);
  el **carril empieza donde termina la fila de filtros** («la línea del lado derecho se ve cortada por la barra
  superior; el menú debería comenzar desde donde termina la barra de filtros»): el carril pinta su fondo entero y
  dibuja sus dos líneas desde esa altura (68 px; 104 con la tira de letras de Artistas; 56 bajo la barra de una ficha
  o tarea), así que la esquina queda blanca y la fila parece cruzarla; y la **ficha de artista toma el héroe** («¿podemos
  agregar héroe a artistas para estandarizar e igualar el canon definido para evento y lugar? Obvio con placeholder
  hasta que el usuario suba su foto de portada al editar. Cuestiona»): portada 3:2 con el símbolo SN mientras no hay
  portada, etiqueta de disciplina, nombre y meta dentro de la imagen, Atrás y menú flotando, Compartir entre las
  acciones y Seguir como pastilla flotante; el avatar redondo sale de la ficha (sigue en listas y carriles). Lo que
  se le cuestionó: la mayoría de los artistas abrirá con el placeholder (por eso el bloque lleva la marca y no un
  gris vacío), y artista y lugar quedan visualmente iguales salvo la etiqueta y los bloques de abajo. Y el **KPI con la
  etiqueta junto al icono** («¿qué opinas de juntar este texto con el icono de arriba? Como canon»): icono de 16 px y
  etiqueta en la fila de arriba, el valor solo en la de abajo; mejora la lectura (icono y etiqueta ya compartían color
  y peso, y la etiqueta quedaba huérfana bajo el valor) y el valor gana todo el ancho para «Gratis» o una fecha. Se retira la tarjeta intermedia del pin («Ver la ficha», «Volver a
  la lista»). Cuestionado: desde otras entradas (el «Dónde» de un evento, Buscar, Perfil) la ficha sigue abriendo a
  pantalla completa con Atrás, para no cambiar de pestaña a quien viene de un evento (sección 11).
- **Título sobre el héroe o en la barra** («héroe y en la base del héroe las letras, dentro del contenedor de imagen,
  sobre la imagen, con un pequeño degradado… el icono de lupa no es necesario, es intuitivo el tap para verla en
  grande… otra posición es la zona tool bar, pues ya no aplicaría poner logo, quiero ver las dos»). Las dos están en
  el prototipo con un conmutador en la sala («Título sobre la imagen» · «Título en la barra»): **A**, el título (y la
  etiqueta MUSEO) al pie de la portada sobre un velo (`--velo-titulo`, negro al 78 % que se desvanece hacia arriba), y
  **B**, el título en la barra interior (Atrás · título · más opciones), sin logotipo en las barras de ficha y de
  tarea. Propuesta: **A en reposo y B al desplazar**: cuando la portada sale de la vista el título aparece en la barra
  (modelo de iOS: título grande que se recoge). En escritorio el título vuelve a la columna derecha (una portada de
  5:3 a la izquierda no es un héroe) y en B va solo a la barra. La lupa se retira: la portada entera es el toque y
  abre un **visor** a pantalla completa. Cuestionado: el velo tapa el pie de algunos carteles (las fechas en el de LXS
  COLOCAOS); el visor lo resuelve y por eso se queda.
- **Icono para seguir un lugar** («el icono de seguir lugares es el de seguir personas, busca si hay otro más
  apropiado»). Se probaron tres en el mismo renglón ([`256-99`](capturas-256/256-99-v3-iconos-seguir-lugar.png)):
  campana con «+», marcador con «+» y pin con «+». Queda la **campana con «+»**: seguir un lugar es que te avisen de lo
  que publica (Ajustes → Avisos: «cambios en lo que sigues»); el marcador dice «guardar» (otra acción: Google Maps la
  separa de «seguir») y el pin con «+» ya significa «registrar un lugar» en la app de hoy (`Publicar.tsx`). Los
  artistas conservan la persona con «+» (convención de Instagram y X). El decidido sigue siendo la palomita blanca en
  verde. El KPI «Sigo» de Perfil y la palanca «Solo lo que sigo» usan la campana.
- **La barra inferior se esconde al bajar** («cuando hacemos scroll down se oculta navbar para liberar más espacio, se
  vuelve a mostrar al hacer scroll up, como el comportamiento en header»). Hecho con la misma regla que la barra de
  arriba (más de una barra hacia abajo la guarda; 6 px hacia arriba, el inicio o el final de la lista la devuelven).
  La barra de la app se recoge hasta la franja de estado y la fila de contexto queda pegada debajo. Cuestionado: iOS
  26 hace lo mismo de forma nativa pero *minimiza* la barra a una píldora en vez de esconderla; en la web se esconde
  entera (más espacio) y vuelve con cualquier gesto hacia arriba; en Lugares no se esconde porque el mapa no desplaza
  y la hoja se apoya en ella.
- **Barra superior a todo lo ancho y carril en dos grupos en tableta y escritorio** («top bar en ancho completo,
  logotipo en centro, publicar en el extremo superior izquierdo, buscar y novedades a la derecha; en sidebar dos
  grupos: el perfil en el extremo inferior izquierdo y el resto de las opciones arriba»). Hecho: **una sola barra**
  para los tres tamaños (a nivel de la app, no dentro de cada pantalla) y el carril lateral solo con Eventos · Lugares ·
  Artistas arriba y Perfil abajo (dos grupos = dos papeles: contenido e identidad). Cuestionado: el logotipo se centra
  en la ventana, no en la columna de contenido (queda 44 px a la izquierda del centro de la columna; es el mismo trazo
  que en el teléfono); y en las fichas de escritorio quedan dos barras apiladas (la de la app y la de la ficha con
  Atrás · más opciones); se pregunta si la segunda se queda o sus dos botones flotan en la columna (sección 11).

Sexta vuelta, antes de enseñar la v3 («presenta fecha del evento en chip para que al seleccionarlo se muestre listado
filtrado por esa fecha», «retoma cuestionamiento de estilo de letra para listados y cards… otra letra que facilite
lectura y que sea más pequeña… súper legibilidad y tamaño moderado», «la barra de bottom con las opciones de ficha,
"voy" "seguir" y sus estados necesita trabajo de diseño… considera colocar acciones flotando… "vas" tiene interlineado
muy grande, tampoco se justifica "Ya estás en la lista" dentro del botón»):

- **La fecha del día como chip: probada y retirada.** Se hizo (cada título de día era el mismo chip que la fila de
  contexto y tocarlo dejaba solo ese día) y el founder la retiró el mismo día («Elimina la idea de los chips de
  fecha»). Los títulos de día vuelven a ser texto («Hoy · 2», «Mañana», «mié 30 sep»); el día se elige solo en la hoja
  Cuándo.
- **Letra de listas y tarjetas: tres opciones con conmutador** («Inter (propuesta)» · «Bricolage ancha» · «Bricolage
  condensada (v2)»; capturas [256-110](capturas-256/256-110-v3-letra-bricolage-telefono.png),
  [256-111](capturas-256/256-111-v3-letra-bricolage-ancha-telefono.png) y
  [256-112](capturas-256/256-112-v3-letra-inter-telefono.png)). Se cuestionó lo que decidía la línea gráfica
  («Bricolage condensada para toda la app»): la condensada a 19 px en negrita lee bien como título pero en un renglón
  de dos líneas más dos metas aprieta las contraformas y obliga a subir el cuerpo. Propuesta: **Inter para el título y
  la meta de renglones, tarjetas y renglones de dato** (16 px semibold y 14 px, interlínea 1,3; tabular en cifras) y
  **Bricolage condensada donde habla la marca**: títulos de pantalla y de ficha, chips de fecha, KPI, botones y
  acciones. Inter es una letra hecha para pantalla (ojo alto, aperturas abiertas), pesa 60 KB en variable y no compite
  con la marca porque nunca ocupa un título. La alternativa sin segunda familia es Bricolage al ancho 100 al mismo
  cuerpo (256-111): legible, pero con las formas caprichosas de la familia en cuerpos chicos. **Decidido en el lienzo
  («esta se queda» sobre la condensada 19/15): la letra de listas no cambia y la línea gráfica tampoco.**
- **Acciones de la ficha: pastillas flotantes, no barra.** Se retira la barra al pie con el par de botones y el
  «decidido» de dos líneas. Las acciones flotan sobre el contenido (sticky a 16 px del pie, sombra, una línea): en
  evento «☆ Me interesa» (blanca) y «✓ Voy» (violeta); en lugar y artista «Seguir» (campana o persona con «+»). Los
  estados son la misma pastilla con otra palabra y color: **Vas** y **Sigues** en verde con la palomita, **Te
  interesa** en blanco con la estrella llena en violeta; tocar otra vez deshace (con aviso y Deshacer). Nada de
  «Ya estás en la lista» dentro del botón: el aviso ya lo dice. En escritorio flotan a la derecha de la columna; dentro
  de la hoja de Lugares flotan sobre la ficha y la portada pasa a 16:9 para que a media altura se vean título,
  etiqueta y el arranque de los KPI. Capturas [256-113](capturas-256/256-113-v3-ficha-evento-voy-telefono.png),
  [256-114](capturas-256/256-114-v3-ficha-evento-te-interesa-telefono.png) y
  [256-115](capturas-256/256-115-v3-lugares-ficha-sigues-telefono.png).
- **Sin línea gris entre la barra y la fila de contexto** («pusiste una línea en bottom de color gris debajo de
  header y antes de filtros»): la barra de la app llevaba su propio filete inferior además del de la fila; barra y
  fila son una sola región y el filete queda solo bajo la fila.

**Séptima vuelta (el mismo día, desde los hilos que el founder dejó sobre el prototipo):**

- **«Desarrolla flujo cuando usuario selecciona Elegir fecha».** «Elegir fecha…» ya no es un chip muerto: al tocarlo se
  despliega, dentro de la misma hoja Cuándo, un calendario de dos meses (el mes en curso arranca en la semana de hoy,
  sin filas de días pasados; hoy en violeta; un punto bajo cada día con eventos; los pasados apagados). Un toque
  elige un día; un segundo toque en un día posterior cierra un rango (extremos en círculo lleno, los de en medio en
  violeta suave); tocar el mismo día lo quita. El chip de la hoja muestra lo elegido («mié 30 sep», «30 sep – 3 oct»)
  y el botón dice cuántos eventos hay («Ver 4 eventos»; «Sin eventos», apagado, cuando no hay). Al confirmar, Inicio
  pasa a la lista por día con solo los días del rango y el chip Cuándo en violeta con la fecha; Limpiar devuelve los
  carriles. Los atajos son ahora rangos de verdad (Hoy, Mañana, Fin de semana = sáb 3 y dom 4, Esta semana = lun 28 a
  dom 4, Todos los próximos), así que la lista deja de mostrar todo con cualquier valor. Capturas
  [256-118](capturas-256/256-118-v3-cuando-calendario-telefono.png) a
  [256-122](capturas-256/256-122-v3-inicio-lista-rango-telefono.png).
- **«Desarrolla qué pasa cuando pongo otra ciudad».** «Otra ciudad» abre, bajo la lista de la hoja Dónde estás, un
  campo «Nombre de la ciudad» con sugerencias (ciudades con eventos y su cuenta; «Córdoba, España» con el país, porque
  el país distingue) que se filtran al escribir, sin acentos. Elegir una cierra la hoja, pone la ciudad en el chip de
  contexto, marca «Otra ciudad · Querétaro» como la actual y recarga la pantalla (Inicio y Artistas enseñan su
  esqueleto 600 ms; los datos del prototipo son los mismos, y el mapa dibujado no se mueve). «Cerca de ti» hace lo
  mismo con la ubicación del teléfono. Capturas [256-123](capturas-256/256-123-v3-ciudad-otra-telefono.png) a
  [256-126](capturas-256/256-126-v3-inicio-queretaro-telefono.png).
- **Icono de Artistas** («no me gusta tanto, se relaciona más a las estrellas de música y tenemos artistas de todo
  tipo; ¿podrías buscar un icono de figura humana con atributo de arte?»): figura humana (la cabeza y los hombros del
  icono de Perfil, corrida a la izquierda) con un pincel arriba a la derecha, dibujado con el mismo trazo de 1,8 que
  el resto. Se probaron pincel, pincel lleno, chispa, boina, paleta, máscara y marco a 26 px sobre la píldora: la
  paleta, la máscara y el marco se vuelven manchas; la boina parece casco; la chispa lee limpio pero es otra estrella;
  el pincel es el atributo de arte más universal y a 26 px se distingue el mango y la brocha. Se puso en la barra
  inferior, en el carril lateral y en «Mis artistas» de Ajustes, y **el founder lo rechazó al verlo** («tengo que ser
  sincero, el icono de artistas se ve horrible, regresa el que tenías»): **la estrella se queda**. El muestrario
  queda como registro de lo probado: [256-128](capturas-256/256-128-v3-iconos-artistas.png).
- **Ficha de artista** (tres hilos): «acordamos poner foto de portada pero mantener foto de avatar»: el avatar redondo
  vuelve, dentro del héroe, a la izquierda de la etiqueta, el nombre y la meta (64 px con aro blanco; en escritorio
  junto al nombre en la columna derecha). «¿Cuál es la diferencia entre Se presenta en y Próximas fechas? Es
  redundante»: cierto, repetía los lugares de las fechas; se quita, y el KPI «Lugares» es el que lleva a esos lugares
  (al mapa con los suyos). «Muestra cómo se vería con novedades publicadas»: la sección «Novedades» como la tiene la
  app (título, texto, medio incrustado y fecha relativa; `SeccionNovedades.tsx`) con tres publicaciones de muestra
  (con imagen, con foto, con video), después de las fechas y antes de «Sobre»; son lo que reciben en la campana
  quienes siguen al artista. La portada de muestra es un cartel real del respaldo; sin portada queda el símbolo SN,
  como antes. Capturas [256-94](capturas-256/256-94-v3-ficha-artista-telefono.png),
  [256-127](capturas-256/256-127-v3-ficha-artista-novedades-telefono.png) y
  [256-107](capturas-256/256-107-v3-ficha-artista-escritorio.png).
- **La cabecera compacta con la portada** («¿podrías dejar imagen de fondo aquí para que se entienda que es sheet de
  lugar?»): cuando la hoja está recogida o desplazada, su cabecera ya no es blanca: lleva la portada del lugar
  oscurecida al 60 % con el título, la ✕ (o Atrás) y el menú en blanco, un héroe en miniatura. Por el mismo canon, la
  barra compacta de las tres fichas a pantalla completa hace lo mismo con su cartel (en escritorio la barra sigue
  siendo una fila blanca). La imagen entra como variable CSS que el propio prototipo toma de la portada al arrancar,
  así que sirve igual con carteles remotos o incrustados. Capturas
  [256-116](capturas-256/256-116-v3-lugares-ficha-recogida-telefono.png),
  [256-86](capturas-256/256-86-v3-lugares-ficha-desplazada-telefono.png) y
  [256-91](capturas-256/256-91-v3-ficha-evento-desplazada-telefono.png).
- **«Acorta letrero: Interesadxs. Revisemos que en la plataforma se esté usando lenguaje incluyente».** El KPI de
  Perfil dice «Interesadxs». Medido antes: «Me interesa» ya salía cortado (67 px en 65 de sitio) e «Interesadxs»
  también (69); los KPI bajan su relleno lateral de 12 a 10 px y la etiqueta su tracking de .04 a .02 em, y ahora
  caben los tres. Dos cosas que se le señalan: «Interesadxs» nombra a personas y en su perfil el número cuenta eventos
  que le interesan («Interés» o «Interesan» cabrían sin tocar el KPI), y los chips de abajo siguen diciendo «Me
  interesa» porque son el estado del evento. Con la revisión del resto del prototipo cambian: «Seguidores» → «Siguen»
  (KPI de lugar y de artista, como «Van»), «Invita a tus amigos» → «Invita a tus amistades», «Así te ven los demás» →
  «Así te ve la gente», «Registrar un artista» / «Nombre del artista o grupo» → «Registrar artista» / «Nombre de
  artista o grupo», «Solo los que sigo» → «Solo lo que sigo» (lugares) y «Solo a quienes sigo» (artistas), «Ficha
  reclamada por el artista» → «Ficha a cargo de Aaron Cadena», «Artistas destacados» → «Artistas destacadxs». No
  cambian los que nombran cosas y no personas («Nuevos eventos», «Destacados», «Todos los próximos», «Más opciones»,
  que una respuesta anterior en el hilo listó por error). La regla que se propone para toda la app: primero
  reescribir en neutro (verbos, «gente», «personas», «quienes»); la «x» solo cuando no hay otra salida
  («Interesadxs», «destacadxs»). Lo que queda en la app en producción va en la pieza P13 (sección 7) con su lista en
  el punto 47 de la sección 11.

**Octava vuelta (el mismo día, tres hilos más sobre el armazón):**

- **«Error de maquetación, hay una línea flotando acá… esta maquetación de shell es de una complejidad innecesaria.
  Reconsidera cómo la estás planteando ahora que ya tienes la propuesta… ojo, todo esto comenzó con el objetivo
  estratégico de definir ese shell para que nos sirva en desktop, tablet, mobile y sea fácil exportar app».** Tenía
  razón en las dos cosas. La línea flotante era la raya de 1 px que el carril lateral pintaba con gradientes a la
  altura de `--nav-arriba` (68, 104 o 56 según la pantalla) para arrancar justo bajo la fila de filtros: cualquier
  desvío de un píxel la dejaba en el aire. Y ese truco, más las reglas `:has()` que apagaban la barra y la navegación
  según qué pantalla estuviera visible, más los tres espaciadores de la hoja, eran CSS del prototipo sin equivalente
  limpio en una app. **El armazón queda así:** un solo grid de tres áreas (barra · nav · pantalla) que no depende de
  lo que hay dentro; el JS pone en la app `data-vista` = raíz · ficha · tarea al cambiar de pantalla y el CSS solo lee
  ese atributo (en teléfono la ficha y la tarea esconden barra y navegación; desde 792 nada se esconde); el carril
  lateral arranca bajo la barra de la app, que lleva su línea de abajo a todo lo ancho, y tiene un borde derecho
  normal de arriba abajo (la fila de contexto ya no lleva línea propia en tableta y escritorio); la hoja de Lugares
  desplaza sobre un hueco `::before` (la hoja entera menos lo que asoma recogida) y no hay espaciadores en el
  marcado. Cero `:has()`, cero `--nav-arriba`, cero medidas por pantalla. En una app nativa es lo mismo: barra, tab
  bar o sidebar y un área de contenido que cambia de pantalla. Las pruebas de la hoja con la rueda dan los mismos
  estados y alturas que antes. Capturas [256-101](capturas-256/256-101-v3-inicio-escritorio.png) y
  [256-99](capturas-256/256-99-v3-inicio-tableta.png).
- **«En desktop esto no tiene sentido: si ves esta barra y la de arriba, hay muchísimo espacio en blanco… podríamos
  fusionar las barras, poniendo flecha atrás a un lado de agregar y "…" a un lado de campana».** Fusionadas: desde
  792 la barra de la app tiene siete columnas simétricas («+» · Atrás · hueco · logotipo · lupa · campana · menú) y
  Atrás y el menú aparecen solo con una ficha a la vista; la barra propia de la ficha desaparece desde 792 y la ficha
  empieza en la portada, a 20 px de la barra (en tableta el título sigue sobre la imagen; en escritorio en la
  columna derecha). Las otras dos salidas que propuso (la navegación sobre la columna de contenido; la columna
  centrada de tableta también en escritorio) se descartaron: la primera rehace todo el armazón de escritorio y la
  segunda tira la ficha a dos columnas, que es lo que mejor aprovecha 1280. Las tareas (publicar, buscar) y Ajustes
  conservan su barra interior porque lleva contenido (título y ✕, o el campo de búsqueda). Capturas
  [256-105](capturas-256/256-105-v3-ficha-evento-escritorio.png) y
  [256-107](capturas-256/256-107-v3-ficha-artista-escritorio.png).
- **«Centrada»** (los filtros de Lugares en tableta y escritorio): centrados como en las demás raíces; la fila cruza
  el panel y el mapa. Captura [256-102](capturas-256/256-102-v3-lugares-escritorio.png).

**Novena vuelta (el mismo día, en el chat):** «el lugar se corta en cards, ¿puedes poner a dos líneas esa información
(fecha, hora y lugar)? Y disminuye el tamaño de texto en títulos de esas mismas cards». En las tarjetas del carril la
meta va ahora en dos líneas: fecha y hora en la primera y el lugar en la segunda, cada una con su elipsis, y el
título baja de 19 a 17 px (token propio `--letra-tarjeta-titulo`; los renglones de lista siguen en 19/15, que es lo
que firmó). Como el carril reparte sus filas con `subgrid`, las dos líneas de meta quedan alineadas entre tarjetas.
Captura [256-75](capturas-256/256-75-v3-inicio-telefono.png).

**Décima vuelta (el mismo día, un hilo sobre la hoja de Lugares):** «¿podemos hacer que se vean 2,5 lugares aquí, para
que se entienda que hay más contenido debajo, además de poner barra de scroll del lado derecho?». La altura «asoma»
de la hoja ya no es un número fijo (176 px): es el asa, la cantidad y dos renglones y medio, medidos en el DOM (el
tercer renglón sale cortado a propósito). Llena, la hoja enseña su barra de desplazamiento fina a la derecha (cubre la
pantalla, así que la barra es la suya); en tableta y escritorio el panel la enseña siempre. En el iPhone la barra es
la del sistema, que aparece al desplazar. Con asoma a dos renglones y medio, la altura «media» de la lista (56 %) quedaba a 40 px
de asoma y sobraba: la lista tiene tres alturas (recogida · asoma · llena) y la ficha conserva su media (foto + KPI).
Capturas [256-82](capturas-256/256-82-v3-lugares-mapa-telefono.png) y
[256-83](capturas-256/256-83-v3-lugares-hoja-llena-telefono.png).

**Undécima vuelta (el mismo día; hallazgo del founder en el chat «Actividad de investigación de eventos», relayado por
ese chat):** en la app de hoy, tocar el título de un carril de Inicio («Destacados», «Esta semana», «Nuevos eventos»,
«Lugares con eventos», «Artistas destacados») lleva a la sección con filtros activos que la persona no puso, y no sabe
cómo quitarlos. El founder propone que el destino sea **una lista solo con ese conjunto, con el título del carril como
encabezado y cierre o Atrás a Inicio, sin chips de filtro**. El prototipo v3 hacía algo parecido (el título ponía el
chip Cuándo en violeta y Limpiar devolvía los carriles): era el mismo defecto con otra cara, un filtro que nadie
eligió. Queda así, y es lo que construye la pieza P5: **el título de cada carril abre su lista propia** (pantalla de
tarea: barra con Atrás y el título del carril, cuántos hay como evidencia, los mismos renglones, y un solo enlace al
final, «Ver toda la agenda», que vuelve a Inicio en la lista por día; para lugares y artistas, «Ver todos los
lugares» y «Ver artistas»); Atrás vuelve a Inicio donde estaba (memoria de pantalla); ninguna hoja nueva. El chip
Cuándo queda solo para la fecha que la persona elige. El mismo chat avisa que el founder no ve en la app el carril
«Artistas con eventos esta semana»: ese mismo chat lo comprobó en la base (solo lectura) y en producción: hay dato
(14 artistas ligados a 8 eventos de los próximos siete días) y el carril sí se pinta, el último de Inicio, abajo del
todo, sin chevron ni «Ver todos» visibles. No es dato ni error: es sitio y señal. El prototipo firmado trae un solo
carril de artistas («Artistas destacadxs», con su título que abre la lista); P5 decide con el founder si «con eventos
esta semana» sigue como segundo carril o se funde.
Capturas [256-129](capturas-256/256-129-v3-carril-destacados-telefono.png) y
[256-130](capturas-256/256-130-v3-carril-semana-escritorio.png).

**Duodécima vuelta (el mismo día, en el chat; deshace la undécima):** «no sirve la solución que te pedí: Destacados son 4,
al seleccionar esa opción manda a ver los mismos cuatro pero en lista… Regresamos a la opción de ver todo, es decir
que aparezca el título del lado izquierdo y del lado derecho "Ver todo >" y en caso de eventos vamos a la sección
agenda, esto implica revivir agenda. En caso de artistas manda a la sección de artistas, lo mismo con lugares». Queda
así: cada carril lleva su título a la izquierda y **«Ver todo ›»** a la derecha; en los carriles de eventos lleva a
**Agenda**, que vuelve como pantalla propia (barra con Atrás y «Agenda», fila de contexto ciudad · Cuándo · Filtros y
la lista por día de todos los próximos, sin ningún filtro puesto); en «Lugares con eventos», a Lugares; en «Artistas
destacadxs», a Artistas; en «Tus planes», a Perfil. Agenda no ocupa lugar en la barra inferior (su «temo que hay
demasiado ya» de la firma sigue en pie): se llega por «Ver todo» o eligiendo un valor en Cuándo desde Inicio, y Atrás
vuelve a Inicio con memoria. Inicio pierde su modo lista (era la agenda disfrazada) y se queda con sus carriles; el
calendario de Cuándo y los atajos filtran la Agenda, desde Inicio o desde ella. Las listas propias de la undécima
vuelta salen del prototipo. Capturas [256-75](capturas-256/256-75-v3-inicio-telefono.png),
[256-129](capturas-256/256-129-v3-agenda-telefono.png), [256-130](capturas-256/256-130-v3-agenda-escritorio.png) y
[256-81](capturas-256/256-81-v3-agenda-fin-de-semana-telefono.png).

### 6.6 Defectos que la revisión de la v3 encontró y cerró

El founder señaló que «elemento de lugar se desalinea en tableta y escritorio»: era cierto y silencioso. **El renglón
del pin llevaba 20 px más de sangría que la lista** en ≥ 792 porque `.pantalla[data-id="lugares"] .renglon.lista {
padding-inline: 20px }` pesa más que `.pin-tarjeta > .renglon.lista { padding-inline: 0 }` y le devolvía el relleno
dentro de una tarjeta que ya lo tenía (la misma clase de defecto que 3.4: reglas que se pisan por especificidad). Ese
renglón desaparece en la v3 y la regla queda acotada a `.lista.panel > .renglon`. Al mismo tiempo la **fila de filtros
de Lugares** flotaba con el gutter de la columna centrada mientras el panel iba pegado a la izquierda (capturas 256-67
y 256-70): en ≥ 792 la fila lleva el relleno del panel. Y en el carril **la línea de meta bailaba entre tarjetas**
según el título tuviera una o dos líneas: el carril define las tres filas y cada tarjeta las hereda con `subgrid`
(foto, título y meta alineados en todas las tarjetas, 256-101).

En las capturas de la v3, antes de enseñarla: la tarjeta del carril abría una segunda columna (foto y sello competían
por la fila 1 sin columna explícita: la foto medía 111 px en una tarjeta de 165); el esqueleto de carga salía encima
de la lista al arrancar (ahora oculto y mostrado 600 ms como en cualquier entrada); los títulos de día no se empujaban
entre sí (cada día es ahora una `section.tramo` y el título pegajoso vive en ella); un margen negativo en Buscar
(fuera). Al traer el canon del héroe a la ficha de evento, **la barra Atrás · ⋯ salió al pie en escritorio y las
pastillas arriba**: la barra llevaba la clase `sobre` («sobre el héroe»), que es también la del bloque «Sobre el
evento», y heredó su área de rejilla (`grid-area: sobre`); las pastillas, sin sitio, tomaron la fila libre de la
barra. La clase pasa a `heroe`. Es la tercera colisión de nombre de esta pieza (`pildora`, `sobre`): regla para el
código, un prefijo por componente y ningún nombre que sea también una sección. Y al rehacer la hoja, **entraba
«llena»** porque se disparaba un evento de desplazamiento antes de medir los espaciadores; el manejador ignora el
estado mientras no hay medidas. Con la sexta vuelta: la clase de las pastillas flotantes chocaba con la del icono de la navegación (los
cuatro destinos salieron con sombra y fondo blanco en una tanda: renombrada); el aviso tapaba las pastillas (sube por
encima cuando hay ficha a la vista); y dentro de la hoja a media altura la pastilla tapaba el título sobre la portada
4:3 (portada 16:9 en la hoja). Con la vuelta a Inicio: el carril con foto y sello en la misma celda y columna
explícita valía para un tamaño; los tres tamaños (mediana, grande, chica) definen sus filas en el carril y la tarjeta
las hereda. Señalado por el founder en el prototipo («hace falta padding arriba y abajo o disminuye tamaño de foto de
perfil»): el avatar de Perfil medía 26 px dentro de la píldora de 32 de la barra inferior, sin el aire que los iconos
de trazo tienen de sobra porque su dibujo no llega al borde; el avatar baja a 22 px. Y en la lista por día («aquí se
ve la parte de atrás de fecha, hay desfase de elementos»): el título de día pegajoso se anclaba 8 px por debajo de
la fila de contexto (la fila mide 48 con su relleno dentro y el ancla sumaba 8 de más), así que en esa franja
pasaban los renglones por detrás; y el título llevaba márgenes laterales en vez de relleno, con lo que no cubría el
ancho entero y las líneas de los renglones asomaban a los lados. Medido con el DOM antes de tocar: ancla a 48 y
título a todo lo ancho con su relleno.

Con la séptima vuelta, antes de enseñarla: el día elegido del calendario salía como **elipse** (radio del 50 % sobre
una celda más ancha que alta): el número va ahora en un círculo propio de 38 px dentro de la celda de 44; el mes en
curso enseñaba **cuatro filas de días pasados** apagados antes de llegar a hoy: arranca en la semana en curso. En
Perfil, **«Me interesa» ya salía cortado** con puntos suspensivos en el KPI (67 px de texto en 65 de sitio) desde la
vuelta anterior sin que nadie lo notara, e «Interesadxs» también cortaba (69): relleno y tracking del KPI ajustados y
medidos. La lista por día de Inicio **no tenía mar 6, jue 8 ni vie 9 de octubre** aunque sus eventos estaban en los
carriles, y «Ver 23 eventos» era una cifra inventada: los tres días entran y las hojas cuentan los eventos en el DOM
(14). Y el velo de la barra compacta al 52 % dejaba competir las letras grandes de los carteles con el título: 60 %.
Al revivir la Agenda, su barra (Atrás · Agenda) llevaba el filete de toda barra interior y la fila de contexto el suyo: dos
líneas a 48 px, la misma «línea rara» entre cabecera y filtros que el founder ya había señalado en la sexta vuelta y
volvió a señalar aquí. La barra de la Agenda no lleva filete: barra y fila son una sola región y la línea va solo bajo
la fila. El filtro «Solo lo que sigo» de la hoja de Filtros se queda tal cual («vi que filtras por lo que sigo, déjalo
así»).

### 6.7 Medición de la v3 (`medir.js` sobre las diez pantallas, teléfono)

0 envoltorios sin estilo, 0 desbordes, 0 márgenes negativos, 0 iconos de control por debajo de 3:1, profundidad máxima
8 (Lugares con la ficha dentro de la hoja; 402 nodos en Inicio con sus doce días, sus carriles y el esqueleto; 34 en
Buscar). Los controles por debajo de 44 px son los mismos de la v2 (chips de 36 con 44 al tacto, letras 34×36, asa,
`input` dentro de campos de 48, palancas, «Reportar»); los días del calendario miden 44 de alto con su círculo de 38.
Cero errores de página y cero respuestas 4xx/5xx en las 56 capturas (medición repetida en cada vuelta).

## 7. Plan de implementación (definitivo: prototipo firmado el 2026-09-28 por la noche)

Cada pieza la hace un operador nuevo (Sonnet) en su rama, con su número de `siguiente-bitacora.sh`, capturas reales a
390×844 y 1280×800 del respaldo local, medición del DOM (el script de esta auditoría se deja en `scripts/ops/`) y sin
council. Orden por dependencias:

| # | Pieza | Toca | Tamaño | Prueba que la cierra |
|---|---|---|---|---|
| P1 | Tokens y utilidades: 5.1 completo con los valores del prototipo firmado (radios 4 · 8 · 12 · 24, aire 4…40, letra con `--letra-2xs`, controles 44/48/56, barras, capas, anchos, tarjetas) más la letra de listas (familia, cuerpo y ancho como variables), `.columna`/`.a-lo-ancho`, quitar `100vw`; los `z-index` literales pasan a los seis tokens conservando el orden de apilado (tabla de correspondencia en la bitácora) | `globals.css` y los `.module.css` que usan literales | M | inventario: 0 `z-index` fuera de token, 0 `100vw`; build verde; nada cambia a la vista salvo los radios (capturas antes y después) |
| P2 | `BotonIcono` y `Boton` unificados; glifos de acción: palomita (Voy), persona con «+» (seguir artista), campana con «+» (seguir lugar); decidido verde con glifo blanco | `ui/Boton*`, `Atras`, `Cerrar`, `Cabecera`, `ChipFecha`, `Sesion`, `lugares.ubicacion`, `Ficha`, `BotonRenglon`, `Mapa` | L | 0 círculos fuera del componente; todos los controles de barra a 44 (medido) |
| P3 | `Renglon` con cuatro pieles + `Esqueleto` derivado + `Palanca`/`SoloLector` compartidos | `Renglon*`, `Ficha .dato`, `ajustes .fila`, `FormularioCanon .resuelto`, `Esqueleto` | L | H-17 y H-33 cerrados; el esqueleto mide lo que el renglón (medido) |
| P4 | Armazón único: un grid de tres áreas (barra · nav · pantalla) que no depende de lo que hay dentro, con `data-vista` (raíz · ficha · tarea) puesto por el layout; barra de la app única en los tres tamaños («+» · Atrás · logotipo · lupa · campana · menú; Atrás y menú solo desde 792 con ficha a la vista) que en teléfono se recoge al bajar y vuelve al subir; barra inferior de cuatro destinos que se esconde y vuelve con la misma regla; fila de contexto pegajosa; sin `:has()` ni medidas por pantalla; se retira el flotante y el conmutador Mapa · Lista (la lista pasa a la hoja inferior, P5) | `Barra`, `Cabecera`, `Publicar`, `lugares`, `VistaLugares`, `TiraLetras` | L | H-01, H-04, H-08, H-13, H-15, H-18: 0 accionables tapados (medido) |
| P5 | Plantillas raíz y lista (rejillas con áreas, sin márgenes negativos) para Inicio (solo carriles; `/agenda` sigue siendo la lista por día, sin lugar en la barra; cada carril con su título y «Ver todo ›» a la derecha; Agenda como pantalla propia con Atrás, fuera de la barra, con la fila de contexto y la lista por día: punto 60), Lugares, Artistas y Perfil; cada día o letra en su `section` con el título pegajoso; renglón de dos líneas; hoja inferior de Lugares (tres alturas) con la ficha del lugar como capa sobre la lista, Cerrar y menú dentro de la hoja y barra Cerrar · título · más opciones al desplazar; fila ciudad · Cuándo · Filtros · activos con sus tres hojas (Dónde estás, Cuándo, Filtros) | `globals .raiz`, páginas raíz, `AgendaInicio`, `ListaLugares`, `ListaArtistas` | L | H-09, H-10, H-11, H-14, H-16, H-24 (0 márgenes negativos, medido) |
| P6 | Plantilla ficha con el canon del héroe: portada 3:2 con la etiqueta, el título y la meta dentro de la imagen sobre el velo, Atrás y menú elevados sobre ella, barra compacta al desplazar con la portada oscurecida detrás del título, visor al tocar la imagen; tres KPI que abrazan su contenido (icono y etiqueta arriba, valor abajo; fecha sin etiqueta); acciones alineadas; pastillas flotantes Me interesa · Voy / Seguir con sus estados (Vas, Te interesa, Sigues); ficha de artista con avatar dentro del héroe y sección Novedades, sin «Se presenta en»; el mismo cuerpo de ficha de lugar sirve a pantalla completa y dentro de la hoja | `Ficha`, `Cartel`, `MapaFicha`, fichas de evento/lugar/artista, `SeccionNovedades` | L | H-20 a H-28 |
| P7 | Carril lateral en dos grupos (secciones arriba, Perfil abajo) bajo la barra de la app a todo lo ancho; reglas responsivas (tableta y escritorio), ficha a dos columnas, mapa + panel con la ficha dentro del panel | `Navegacion`, plantillas, `VistaLugares` | XL | capturas 820 y 1280; H-34 a H-37 |
| P8 | Mapa: un símbolo por lugar, prioridad y anclaje variable | `Mapa.tsx` (capas) | M | H-12: 0 etiquetas superpuestas en el centro a zoom por defecto (captura) |
| P9 | Altas: `HojaDonde` única, mensaje único, frase del alta de lugar, botón que dice qué falta | `HojaDondeEs`, `HojaDondeLugar`, `FormularioEvento`, `FormularioLugar`, `FormularioCanon` | M | H-29 a H-32 |
| P10 | Chips y sellos unificados (el chip de contexto abre su hoja y Cuándo muestra su valor); carril con `subgrid` en sus tres tamaños; tarjeta sin foto compacta; un sello por foto | `Chip`, `Destacados`, `Renglon` | M | H-02, H-03, H-19 |
| P11 | Protección: script de inventario y medición como pruebas (sección 9) | `scripts/ops/`, `package.json` (scripts), CI | M | la CI falla con un `z-index` literal, un margen negativo, un desborde o un toque < 44 |
| P12 | Retiros (sección 10) y limpieza de los duplicados que queden | varios | S | inventario: bloques duplicados 35 → 0 |
| P13 | Lenguaje incluyente en toda la app: la lista del punto 47 de la sección 11 (textos de la interfaz; no se tocan nombres propios ni títulos de eventos) con la regla «primero neutro, la x solo si no hay otra salida» | páginas y componentes con esos textos | S | `grep` de las frases marcadas = 0; capturas de Perfil, Ajustes, fichas y reglas |

## 8. Lista consolidada de defectos silenciosos (con archivo y línea)

| # | Defecto | Dónde | Medida |
|---|---|---|---|
| H-01/08/15 | El flotante tapa renglones y «+» | `Publicar.module.css:2-5`, `lugares.module.css:85` | Agenda: 1 renglón tapado en reposo; Lugares lista: 2 renglones y 2 botones; Inicio: 2 tarjetas (+ el «+» en iPhone) |
| H-17 | Texto bajo el botón «+» | `Renglon.module.css:101` (`white-space: nowrap`) | 16 renglones desbordan 4–43 px; 2 pasan 27–31 px bajo el botón |
| H-25 | Quinto enlace cortado | `lib/ficha.ts` (carril desde 5), `Ficha.module.css:170` | 52 % visible, 31 px fuera |
| H-12 | Etiquetas del mapa encimadas | `Mapa.tsx` (capas de nombre y día separadas) | captura 256-03 y 256-13 |
| H-06 | Chevron con margen negativo | `Destacados.module.css:83` | −10 px, 5 veces por pantalla |
| H-18 | Tira de letras con margen negativo | `TiraLetras.module.css` | −44 px |
| H-24 | Barra y acciones escapan del gutter | `Barra.module.css:32`, `Ficha.module.css:144-150` | −20 px en teléfono, −340 en escritorio |
| H-31 | Márgenes negativos para corregir `gap` | `FormularioCanon.module.css:193`, `ajustes.module.css:13` | −8 y −12 px |
| H-14 | Alto del mapa acoplado a una variable viva | `lugares.module.css:13` | `calc(100dvh − … − var(--alto-cabecera) …)` |
| H-21/22 | Números fijos donde va un token | `Ficha.module.css:12` (96), `MapaFicha.module.css:5` (170), `Cartel.module.css:6` (220) | |
| H-38 | `100vw` en el gutter | `globals.css:50` | riesgo con barra de desplazamiento clásica |
| 3.1 | Azul petróleo retirado, aún en Pincel | `mando.module.css:227,242,409` | 3 sombras |
| 3.3 | Hoja «¿Dónde?» duplicada | `HojaDondeEs.module.css` / `HojaDondeLugar.module.css` | 11 bloques iguales |
| 3.3 | Esqueleto con medidas copiadas | `Esqueleto.module.css:33,65,78,84,99` | ya se desalineó una vez (OL-226) |
| H-05 | Controles de barra a 40 px | `Sesion:4`, `Chip:82`, `ChipFecha:10`, `Cabecera:56`, `Atras:7`, `Cerrar:6` | 40 < 44 |
| 3.1 | 44 `z-index` en 17 valores | todos los módulos | sin escala |

## 9. Cómo se protege el sistema después

1. **Inventario como prueba** (`scripts/ops/inventario-css.mjs`, el de esta auditoría): falla la CI si aparece un
   `z-index` que no sea un token, un color literal fuera de la lista blanca (logos de Apple y Google, azul de sistema),
   `100vw`, un margen negativo fuera de una clase permitida, o si el número de bloques duplicados o de medidas en duro
   sube respecto al último aceptado (un archivo `inventario.aceptado.json` con las cifras).
2. **Medición del DOM como prueba** (`scripts/ops/medir-pantallas.mjs`, con el respaldo local y Chrome): por plantilla,
   un presupuesto de nodos y profundidad, 0 hijos fuera de la caja de su padre (salvo lo declarado: sellos sobre foto),
   0 desplazamiento horizontal, 0 accionables tapados por un elemento fijo en reposo, 0 controles menores de 44 px
   fuera de una lista de excepciones (enlaces en texto), a 320, 390, 820 y 1280 px.
3. **Reglas de revisión** que ya existen (MEMORIA_GESTOR, 2026-09-21 y 24) se vuelven mecánicas: la CI corre las dos
   pruebas en cada PR y el gestor solo abre las capturas.
4. **Una sola fuente de tamaños**: `Esqueleto` y `CarrilEsqueleto` leen los mismos tokens que la pieza real (P3, P10).

## 10. Qué se retira

`ui/Tarjeta.tsx` y su CSS (sin uso); el flotante `Publicar` y el conmutador `verOtraVista` (el founder aceptó el «+»
en la barra y retiró el segmento Mapa · Lista: la lista pasa a la hoja inferior); `HojaDondeLugar` y `MapaDondeEs` (absorbidos); `.palanca`, `.soloLector`,
`.icono`, `.tarjeta` duplicados; `AgendaInicio.accion`, `publicadoBoton`, `Sesion.entrar` como estilos propios (pasan a
`Boton`); `--al-centro`; los parches `@media (max-width: 340px/350px)`; los tokens locales `--alto-mediana/grande/
chica` y `--alto-hoja` duplicado; el carril semanal de la lista de Lugares; la frase del alta de lugar; las clases
globales `.raiz` y `.pagina` (pasan a plantillas con áreas). La v3 retira además la ruta `/agenda` como sección
(redirige a `/`: la lista por día vive dentro de Inicio), la tarjeta intermedia del pin, la lupa sobre la portada, el
logotipo en las barras de ficha y de tarea, la barra de acciones al pie de la ficha y el filete bajo la barra de la
app.

## 11. Lo que se le pidió al founder y lo que contestó (cuatro vueltas el 2026-09-28)

Las cuatro decisiones del primer avance y su respuesta:

1. **«+» de publicar en la barra superior** (y en el carril lateral en tableta y escritorio), retirando el botón
   flotante de las cuatro raíces. **Aceptado**; en la v2 va a la izquierda con el logotipo al centro (Instagram).
2. **Navegación lateral en tableta y escritorio**, con la barra inferior solo en teléfono. **Aceptado.**
3. **«Mapa · Lista» como segmento en la cabecera** de Lugares. **Rechazado donde quedó** («no me gusta dónde se colocó
   segmented mapa/lista»); la v2 lo retira: la lista vive en una hoja inferior (6.2).
4. **Botón «+» de renglón sin sombra** sobre fondo hueso. **Rechazado por estética**: elevación en todos los accionables
   de listado, tarjeta y mapa (6.2).

Lo que la v2 decide y el founder confirma o corrige al probarla:

5. **La lupa arriba a la derecha** abre la búsqueda (y no un sexto destino en la barra inferior): cinco destinos con
   Perfil ya llenan los 390 px a 44 por destino; Instagram tampoco mete Buscar en la barra en la web.
6. **La fila de filtros sin chips rápidos**: Filtros (con conteo) · ciudad · activos con ✕. Todo lo demás, en la hoja.
7. **Etiquetas de los KPI**: Fecha · Costo · Van; Distancia · Eventos · Seguidores; Fechas · Seguidores · Lugares.
8. **El alta con tira de tipos** y el tipo inicial por contexto (Inicio y Agenda → evento; Lugares → lugar; Artistas →
   artista).
9. **Ayuda de Claude Design**: el founder la ofreció dos veces. Las variantes de barra, botón de acción y KPI se
   trabajaron aquí con medición (contraste, toques, desbordes) y capturas reales; si el founder prefiere comparar
   variantes visuales en un lienzo antes de firmar, se abre uno con esas tres piezas.

Quinta vuelta (sobre la v2, tres mensajes el mismo día) y lo que la v3 decide (detalle en 6.5):

10. **Fila de contexto en el mismo orden y con el mismo chip en todas las raíces** (ciudad · Cuándo · Filtros ·
    activos), con Cuándo fuera de la hoja de filtros. **Hecho.**
11. **Agenda fuera del menú**: Inicio conserva sus carriles y gana la fila de contexto; un valor en Cuándo muestra la
    lista por día dentro de Inicio; barra inferior de cuatro destinos. **Hecho** (tras corregir la primera pasada que
    fundía las dos en «Eventos»).
12. **Ficha de lugar dentro de la hoja** al tocar un pin o un renglón; héroe con el título dentro, asa, Cerrar y menú
    sobre la imagen y cabecera compacta pegajosa dentro de la hoja al desplazar; cerrar devuelve el estado y el
    desplazamiento; la barra del sitio no cambia. **Hecho.** Y la hoja se mueve como pidió («abre a la altura de foto
    y KPI, crece hasta cubrir la pantalla y solo entonces desplaza el contenido»): un solo contenedor que desplaza,
    con espaciadores y el cuerpo asomando (6.5). **Hecho y probado con la rueda.**
13. **Título sobre el héroe o en la barra**: las dos variantes con conmutador; la lupa fuera y el visor al tocar la
    imagen. **Hecho.**
14. **Icono de seguir lugar**: campana con «+», elegida sobre marcador y pin con el muestrario de tres. **Hecho.**
15. **La barra inferior se esconde al bajar y vuelve al subir**, como la de arriba. **Hecho.**
16. **Barra superior a todo lo ancho y carril en dos grupos** en tableta y escritorio. **Hecho.**
17. **«Elemento de lugar se desalinea en tableta y escritorio»**: encontrado, explicado y cerrado (6.6).

Sexta vuelta (antes de enseñar la v3):

25. **La fecha de cada día como chip que filtra la lista**: hecho y **retirado** por el founder el mismo día («Elimina
    la idea de los chips de fecha»); los títulos de día vuelven a ser texto.
26. **Otra letra, más chica y más legible, para listados y tarjetas**: tres opciones con conmutador; propuesta Inter
    16/14 con Bricolage condensada donde habla la marca. **Hecho; lo firma el founder (punto 29).**
27. **Acciones de la ficha rediseñadas como pastillas flotantes** de una línea con estados Vas · Te interesa · Sigues,
    sin nota dentro del botón. **Hecho.**

Lo que el founder confirma o corrige al probar la v3:

18. **Inicio con dos modos**: carriles en reposo y lista por día cuando Cuándo tiene valor (Limpiar vuelve a los
    carriles). **Decidido (2026-09-28, noche): «Agenda se queda fuera por ahora, temo que hay demasiado ya en barra
    de navegación».** Cuatro destinos. **Después (punto 60): Agenda vuelve como pantalla propia, fuera de la barra,
    a la que se llega por «Ver todo» de los carriles de eventos o por Cuándo; Inicio pierde el modo lista.**
19. **Título de la ficha**: decidido en el lienzo («aquí debemos replicar el canon de héroe de sheet»; después,
    «aceptada la propuesta de héroe» y «muy bien resuelto, aceptada esta propuesta» sobre el KPI de fecha): la ficha a
    pantalla completa toma el canon de la hoja (héroe 3:2 arriba, Atrás y menú elevados sobre la imagen, título de
    19 px dentro de la imagen, barra compacta al desplazar). La variante «en la barra» se descarta.
20. **Campana con «+»** para seguir lugares (o marcador con «+»); la persona con «+» sigue para artistas.
21. **Fichas en escritorio**: dos barras apiladas (la de la app y la de la ficha) o Atrás y más opciones flotando en la
    columna sin segunda barra.
32. **Ayuda de Claude Design**: aceptada; se abre un lienzo con las piezas cuestionadas (hoja con ficha, barras de la
    ficha, letra de listas, pastillas) para comparar variantes ahí.
31. **Sin línea bajo la barra de la app** y **toda la información de la hoja dentro de la hoja**: hechos a petición
    suya el mismo día. **Confirmado en el lienzo** («esta es la opción que me gusta, héroe con todo integrado»): la
    hoja con el héroe y el título dentro de la imagen es la definitiva. Queda por confirmar que la hoja con la lista
    (sin ficha) no necesita Cerrar: el asa la baja.
36. **La hoja con una sola inercia** (abre a foto + KPI, crece hasta llenar, luego desplaza): hecha con un contenedor
    que desplaza y tres espaciadores (recogida · asoma · media · llena); en el teléfono real es el mismo gesto con
    inercia nativa. Llena, es una página completa con Atrás (vuelve a foto + KPI); jalar hacia abajo recoge (la lista
    a la cantidad, la ficha a su cabecera) y nada se cierra solo: la ficha, con la ✕. Queda por confirmar en el
    iPhone del founder que bajar desde arriba del todo (contenido en su inicio) también la encoja, como con la
    rueda. **Founder: «sigue adelante, pruebo en prod».**
37. **Chips en el héroe de la ficha de evento**: si algún día entran, con el mismo estilo que la etiqueta de la hoja
    de lugar (MUSEO: violeta sobre blanco, encima del título). Anotado, sin construir.
38. **Radio más sugerido en todos los casos** (4 · 8 · 12; fotos de renglón 4; hoja 24). **Hecho** («es canon»).
39. **Filtros centrados en tableta y escritorio**, salvo Lugares (alineados con el panel). **Hecho**; después pidió «centrada» también en Lugares: hecho (punto 56).
40. **El carril empieza donde termina la fila de filtros** (tableta y escritorio). **Hecho** en la sexta vuelta; **deshecho en la octava** a petición suya (punto 54): el carril arranca bajo la barra de la app, sin rayas pintadas ni medidas por pantalla.
41. **Héroe en la ficha de artista** con placeholder hasta que suba su portada (6.5). **Hecho a falta de su
    confirmación**: el avatar redondo sale de la ficha, Seguir flota, artista y lugar quedan casi iguales.
44. **Título de día pegajoso** («se ve la parte de atrás de fecha, hay desfase de elementos»): anclado justo bajo la
    fila de contexto y a todo lo ancho (6.6). **Hecho.**
43. **El avatar de Perfil en la barra inferior** («hace falta padding arriba y abajo o disminuye tamaño de foto de
    perfil o agrandamos todos los altos de icono»): baja a 22 px dentro de la píldora de 32, con el mismo aire que los
    iconos de trazo (6.6). **Hecho.**
42. **KPI: la etiqueta junto al icono** («¿qué opinas de juntar este texto con el icono de arriba? Como canon, en
    todos los KPI»): icono de 16 px y etiqueta en la fila de arriba, como una sola unidad «qué es»; el valor solo en la
    de abajo con todo el ancho; la etiqueta con elipsis para que nunca rompa la fila. En las fichas, en Perfil y en
    el lienzo. **Hecho.**
35. **El KPI de fecha sin la palabra «Fecha»** («demasiado alto, no es necesario poner palabra fecha, es obvio»): el
    día en la primera línea y la hora en la segunda, a la altura de los otros dos.
34. **La hoja de lugar como la editó el founder en el lienzo** («observa que he modificado: redondeado de sheet, posición
    de accionables X y ⋯, posición de chips, tamaño y posición de título»): radio de 24 px en todas las hojas, héroe
    3:2 en la hoja, Cerrar arriba a la izquierda y el menú arriba a la derecha sobre la imagen, título de 19 px dentro
    de la imagen con la etiqueta (MUSEO, violeta sobre blanco) encima del título. Aplicado en el prototipo y, por el
    punto 19, también en la ficha a pantalla completa (héroe 3:2, título de 19 px).
33. **Los KPI abrazan su contenido** («no logro disminuir el alto, debe ser hug al contenido, deja mucho espacio
    abajo», en el lienzo): fuera el alto mínimo de 84 px; los tres siguen del mismo alto porque la rejilla estira cada
    tarjeta a la fila. Aplicado en el prototipo y en el lienzo.
22. **La ficha de lugar desde otras entradas** (el Dónde de un evento, Buscar, Perfil) sigue a pantalla completa con
    Atrás; dentro de la hoja solo cuando se viene de Lugares.
23. **Esconder la barra inferior entera** (web) frente a minimizarla a una píldora como hace iOS 26.
24. Siguen abiertos los puntos 5 a 9 que la v3 no cambió: la lupa arriba, las etiquetas de KPI, el tipo inicial del
    alta por contexto y el lienzo de Claude Design.
28. (Retirado: los chips de fecha.)
29. **Letra de listas y tarjetas**: decidido en el lienzo («esta se queda» sobre Bricolage condensada 19/15): se
    queda la de la v2; la línea gráfica no cambia. Inter y Bricolage ancha quedan descartadas (el conmutador de la
    sala las conserva marcadas como descartadas).
30. **Pastillas flotantes**: decidido en el lienzo («me gusta que flotan, muy moderno, bien hecho»; «me quedo con la
    idea de que floten, olvidemos la barra»): se quedan flotando y la variante en barra sale del lienzo; el par de
    evento va centrado en teléfono y a la derecha en escritorio.

45. **«Elegir fecha…» con calendario dentro de la hoja Cuándo** (hilo del prototipo, «desarrolla flujo cuando
    usuario selecciona Elegir fecha»): dos meses desde la semana en curso, un toque elige un día y dos un rango, el
    botón cuenta los eventos, Inicio filtra sus días y el chip muestra la fecha (6.5). **Hecho**; confirmar. Queda una
    decisión pequeña: si los meses siguientes se cargan al desplazar (como en el prototipo, que trae dos) o con
    flechas. **Confirmado** («confirmo todo, buen trabajo»).
46. **«Otra ciudad» con campo y sugerencias** (hilo, «desarrolla qué pasa cuando pongo otra ciudad»): campo bajo la
    lista, sugerencias con cuenta de eventos y país cuando distingue, recarga con esqueleto (6.5). **Hecho**;
    confirmar. En la app el mapa sí se centrará en la ciudad elegida. **Confirmado.**
47. **Lenguaje incluyente** (hilo, «acorta letrero: Interesadxs; revisemos que en la plataforma se esté usando
    lenguaje incluyente»): en el prototipo, lo listado en 6.5 (Interesadxs, Siguen, amistades, «Así te ve la gente»,
    «Registrar artista», «Solo a quienes sigo», «Ficha a cargo de…», «destacadxs»). **Hecho**; que confirme la regla
    («primero neutro, la x solo si no hay otra salida») y que decida sobre «Interesadxs» en su perfil (nombra
    personas y el número cuenta eventos; «Interés» o «Interesan» caben sin tocar el KPI). **Decidido: «Interesan»**
    (aplicado en el prototipo). Lo que queda en la app en
    producción, para la pieza P13: «Invita a tus amigos» (Ajustes), «Así te ven los demás» (Mi perfil y la ficha
    pública), «Nombre del artista o grupo» y «Otro artista o grupo» (alta de artista y selector Quién), «Registrar un
    artista» / «Buscar un artista» / «Ver los artistas» / «artistas registrados… Registra un artista» (Publicar, lista,
    borrado, ciudades), «Nadie lo sigue todavía · 1 persona lo sigue · N personas lo siguen» (fichas de artista y de
    lugar: «Nadie sigue esta ficha todavía · 1 persona la sigue · N personas la siguen», o con el nombre), «Entra para
    seguir a los tuyos» (Inicio, filtro Siguiendo), «un artista con nombre», «un lugar, un artista o una persona que
    no eres» y «a petición del artista o del lugar» (Reglas), «la ficha de un lugar o un artista» (Ayuda), «Artista
    borrado… Ver los artistas» (borrado), «Ya está registrado» / «no está registrado» (altas: «Ya tiene ficha» / «no
    tiene ficha»), «Artistas invitados» (admin CAPO: «Fichas invitadas»), «un @usuario» (enlaces: «un @perfil»). No
    tocan: «Todos» como filtro de eventos, «Listo», «Destacados», «Nuevos», los nombres de eventos.
48. **Icono de Artistas** (hilo, «este icono no me gusta tanto… figura humana con atributo de arte»): se probó la
    figura humana con pincel (y pincel lleno, chispa, boina, paleta, máscara y marco a 26 px) y el founder la rechazó
    al verla en la barra («se ve horrible, regresa el que tenías»). **Decidido: la estrella se queda.** El muestrario
    (256-128) queda como registro.
49. **Ficha de artista: el avatar vuelve, dentro del héroe** (hilo, «acordamos poner foto de portada pero mantener
    foto de avatar o perfil que ya estaba»). **Hecho.** Cierra también el punto 41.
50. **«Se presenta en» fuera de la ficha de artista** (hilo, «es redundante como la pintaste»): el KPI «Lugares» es
    el camino a sus lugares (al mapa con los suyos). **Hecho y confirmado.**
51. **Novedades publicadas en la ficha de artista** (hilo, «muestra cómo se vería con novedades publicadas»): tres
    publicaciones como las de la app, después de las fechas y antes de Sobre. **Hecho y confirmado** (fechas primero).
52. **La cabecera compacta con la portada** (hilo, «deja imagen de fondo aquí para que se entienda que es sheet de
    lugar»): en la hoja recogida y desplazada y, por el mismo canon, en la barra compacta de las tres fichas
    (6.5). **Hecho y confirmado** también en las fichas a pantalla completa.
53. **«Lugares» → «Mapa»** (hilo, «¿si en lugar de llamarse Lugares le ponemos Mapa? Pues también se mencionan
    eventos»): se le contestó que Lugares nombra qué hay (como Inicio, Artistas, Perfil) y Mapa nombraría cómo se ve,
    que en tableta y escritorio el mapa es solo la columna derecha y que los eventos ahí cuelgan siempre de un lugar;
    se le ofreció verlo con la etiqueta cambiada. **Decidido: «Lugares».**

54. **El armazón simplificado** (hilo, «esta maquetación de shell es de una complejidad innecesaria… el objetivo
    estratégico: definir ese shell para que nos sirva en desktop, tablet, mobile y sea fácil exportar app»): un solo
    grid de tres áreas con `data-vista`, sin `:has()`, sin `--nav-arriba`, sin espaciadores; el carril arranca bajo
    la barra de la app con un borde normal (6.5, octava vuelta). **Hecho**; confirmar. Consecuencia que se le señala:
    el carril ya no arranca bajo la fila de filtros como pidió en la sexta vuelta (punto 40), sino bajo la barra; a
    cambio la fila no lleva línea propia y no hay nada que medir. **Decidido: «acepto tu propuesta».**
55. **Barras fusionadas en escritorio y tableta** (hilo, «fusionar las barras, poniendo flecha atrás a un lado de
    agregar y "…" a un lado de campana»): **Hecho**; confirmar. Las tareas y Ajustes conservan su barra interior
    (título y ✕); si también la quiere fuera, el título pasaría al arranque del contenido. **Decidido: «acepto tu
    propuesta».**
56. **Filtros de Lugares centrados** («centrada»): **Hecho.** Cierra el punto 39.

57. **Tarjetas del carril: meta en dos líneas y título más chico** («el lugar se corta en cards…»): fecha y hora en la
    primera línea, el lugar en la segunda, título a 17 px (6.5, novena vuelta). **Hecho.**

58. **La hoja de Lugares asoma con dos renglones y medio y enseña su barra de desplazamiento** («¿podemos hacer que
    se vean 2,5 lugares aquí… además de poner barra de scroll del lado derecho?»): hecho (6.5, décima vuelta); la
    barra fina se ve llena y en el panel; en el iPhone será la del sistema al desplazar. La lista queda con tres alturas
    (recogida · asoma · llena); la ficha conserva su media. **Hecho.**

59. **El título de un carril abre su lista propia, no un filtro** (founder, desde el chat de investigación: «el
    destino sea una lista solo con ese conjunto, con el título del carril como encabezado y cierre/atrás a Inicio,
    sin chips de filtro»): pantalla de tarea con Atrás, el título, cuántos hay, los renglones y «Ver toda la agenda»
    al final (6.5, undécima vuelta). **Rechazado por el founder al verlo** («Destacados son 4, al seleccionar manda a
    ver los mismos cuatro pero en lista»): sustituido por el punto 60. Lo de «Artistas con eventos esta semana» (sí
    tiene datos y sí se pinta en producción, último carril y sin enlace visible) queda para P5 con el punto 60.
60. **Título a la izquierda y «Ver todo ›» a la derecha; Agenda revivida** (founder: «regresamos a la opción de ver
    todo… en caso de eventos vamos a la sección agenda, esto implica revivir agenda; artistas a Artistas, lugares a
    Lugares»): Agenda como pantalla propia con Atrás, fuera de la barra inferior; Inicio sin modo lista; Cuándo filtra
    la Agenda desde Inicio o desde ella (6.5, duodécima vuelta). **Hecho; entra en P5.**

**Firma (2026-09-28, noche, en el chat):** «Respondo tus preguntas: 1: Agenda se queda fuera por ahora, temo que hay
demasiado ya en barra de navegación. 2. Lugares. 3. Acepto tu propuesta. 4. Interesan. 5. Confirmo todo, buen
trabajo. 6. Sigue adelante, pruebo en prod. Cierra y dale a la maqueta, con ultra cuidado, atención a detalle, sin
código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código.» Los puntos 20
(campana), 21 (barras en escritorio: fusionadas), 22 (ficha desde otras entradas: a pantalla completa) y 23 (la
navegación se esconde al bajar) quedan como están en el prototipo. Con esto el plan por piezas de la sección 7 es el
definitivo y arrancan los operadores, uno por pieza.
