# 509 · La semana de Instagram: artistas y lugares destacados repartidos en la semana (prototipo, OL-477)

**Fecha:** 2026-10-29. **Rama:** `instagram-calendario`, base `origin/main` (`8515e298`; `main` unido al final). **Operador:** agente de la pieza
(Gestor VII), sin otros agentes. **Estado:** **prototipo, espera la firma del founder.** Sin código de la app ni migración. Prototipo:
`docs/rediseno/prototipos/instagram-calendario.html`. Capturas: `docs/rediseno/capturas-509/` (33 de pantalla, 12 tarjetas PNG reales y el
recorrido).

## El pedido

- Founder, 29 de octubre: «Me gustaría que dentro de lo que publiquemos en Instagram sean los artistas destacados de la semana. Esto para
  alimentar más el feed. Y considerar solo los artistas que tienen su ficha completa y su descripción… la fotografía, ya sea de portada o de
  perfil, o incluso las dos, como un carrusel… en el texto… la descripción o la bio del artista… su red social… la ciudad… y los hashtags… Esto
  debería replicarse eventualmente para los lugares también… lo que necesito es que se arme calendario de publicaciones, no todos los artistas o
  lugares el mismo día, sino que se distribuyan en la semana para tener contenido fresco».
- Aceptó las recomendaciones del gestor: tarjeta 4:5 con la línea gráfica (portada arriba, foto en círculo, nombre, disciplina, ciudad, símbolo
  SN) porque un carrusel exige la misma proporción; texto corto (frase gancho + «Lee su ficha en somosnosotrxs.org/artistas/<slug>» + mención +
  ciudad + hashtags); crédito «Foto: @cuenta» y aviso previo por mensaje directo con opción de decir no; prioridad a quien tiene evento próximo,
  luego la ciudad, sin repetir en 6 meses; medir visitas a fichas con origen Instagram.
- Datos del gestor: 68 artistas con ficha completa (foto + portada + descripción ≥ 120), 64 con Instagram, 49 de San Luis Potosí, 31 con evento en
  30 días; 50 lugares completos, 21 con Instagram.

## Sobre la pantalla real

- `maqueta-pantalla.mjs` guarda cinco pantallas más (`--solo=igc-`, con `RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`): la portada de
  Administración, **Administración › Instagram** de San Luis (la lista), su **hoja de vista previa** abierta (paso nuevo `igc-hoja`), el «···» de la
  ficha del Colectivo Nube de Papel con la cuenta de administración y **Agenda** (por `ui/Pestanas`). Con la marca nueva, los carteles públicos de
  siempre (`imagenes.json`) sí se piden, como en el prototipo de OL-458; las fotos y portadas de las fichas de demo son dibujos del respaldo.
- **Respaldo** (`RESPALDO_INSTAGRAM_SEMANA=1`, sobre el historial grande de OL-469; `npm run medir` no lo pone): seis artistas con la ficha
  completa (foto, portada, descripción de 120 o más e Instagram): Valeria Quiroz (música, fecha el vie 16 en el Teatro de la Paz), Íñigo
  Montalvo (música, fecha el sáb 10 en Aether), Renata Saldaña (pintura), el Colectivo Nube de Papel (ilustración, **sin nada por venir**), Ximena
  Urquidi y Teodoro Alcántara (para «Cambiar»); dos lugares completos (el museo Leonora Carrington, con dos eventos esta semana, y el Museo del
  Ferrocarril) y tres eventos con cartel dibujado (el martes 6, ya pasado; el taller del sábado 10 en el museo y la noche de Íñigo). Las portadas
  nuevas las dibuja `respaldo-local/fotos-instagram.mjs`. Todo inventado, con «(demo)» en el nombre.
- `prototipo/instagram-calendario.mjs` arma el prototipo con el armazón de propuestas (plantilla al lado): el CSS servido tal cual (siete hojas),
  las clases de producción con su hash (si una no existe, falla) y el cuerpo de cada estado armado con piezas que ya existen. 26 estados, 1,7 MB.
- Las **tarjetas** son imágenes reales: `prototipo/instagram-calendario-tarjetas.tsx` (empaquetado y corrido por su `.mjs` con esbuild, los `@/` de la
  app y `server-only` vacío, como en vitest) dibuja con **satori y sharp, las cinco instancias de Bricolage, `ajustar`/`ajustarRenglon` de
  `medir.ts`, las paletas probadas de `paleta.ts` (elegidas por el tono de la portada, como «Crear cartel»), `FORMATOS`, `MARGEN` y `LETRA` de
  `tokens.ts` y el sello `pie()` (símbolo SN + somosnosotrxs.org) de `plantillas/piezas.tsx`**. Arma también los textos con `hashtag`,
  `revisarTexto` y la cuenta de `src/lib/instagram/texto.ts`, y saca los iconos de producción con `renderToStaticMarkup`.

## Las pantallas del prototipo

| | Pantalla | Qué lleva |
|---|---|---|
| 1 | **Hoy** | La lista y la hoja de producción, de referencia. |
| 2 | **La semana** | A·R ★: `ui/Pestanas` «Semana · Eventos» bajo la cabecera (las de Agenda); en la fila de contexto, el chip de ciudad y los chips «Esta semana · La que viene» (filtrar no es navegar); `Lista/conteo` «2 publicadas · 4 programadas · el domingo descansa»; `ui/Grupo` «Del 5 al 11 de octubre · 7 días» con un `ui/Renglon` por día: la tarjeta en pequeño (4:5), el nombre, «Lun 5 · 7:00 pm · Artista», cómo va (Publicado en verde, Programado, Sale hoy, Publicando…, Quitado, La cuenta descansa), el aviso pendiente en violeta y, si ya salió, «31 visitas · 3 van» y «Ver» a la derecha. Estados: esta semana, la que viene, pestaña Eventos (la lista de hoy tal cual), publicando, quitado. Variantes: **B** (sin pestañas, la semana arriba de «Para publicar») y **T** (la semana como el carril de Inicio, una tarjeta por día). |
| 3 | **Un día** | La hoja de un día es `HojaInstagram` con tres cambios: el título dice día, hora y qué toca; una línea dice por qué lo eligió el sistema, con «Cambiar»; el botón es **«Publicar ahora»** (si no se toca, sale solo a su hora) y abajo «Quitar de la semana». Lugar de hoy (4:5 y 9:16), artista sin fecha con «Aviso: falta mandarlo · Avisar», «Cambiar» (los candidatos en el orden de la regla, con por qué), artista con fecha, evento del día, «Esta semana» (carrusel) y descanso. |
| 4 | **El texto** | El texto completo de cada caso (artista con fecha, sin fecha y lugar), también en las notas. |
| 5 | **Aviso previo** | La hoja «Avisar a …» con el mensaje listo y «Copiar y abrir su Instagram»; avisado; «Dijo que no» con su confirmación («¿Te equivocaste? Mejor no»); después (Ximena toma el lunes); la marca en el «···» de la ficha: **«Fuera de Instagram · Dijo que no el mié 7 de oct · Volver a poner»**. |
| 6 | **Medición** | El día publicado: «Instagram: publicado · Ver», «Facebook: publicado · Ver», «31 visitas a su ficha desde Instagram», «3 dieron «Voy» a su próxima fecha después de verla» y cómo se cuenta. |

## La tarjeta (PNG reales en `capturas-509/tarjeta-*.png`, 1080 de ancho)

- **Artista, 4:5 (1080 × 1350):** la portada a lo ancho arriba (720 de alto, 3:2 como en las fichas); la foto redonda de 288 con un aro de 12 del
  color del fondo, montada sobre el borde de la portada; a su derecha la ceja en mayúsculas espaciadas («Música · Canción»), la ciudad y
  «@cuenta» en el acento; debajo el nombre en la condensada negra, hasta dos renglones parejos (de 112 a 64); si tiene fecha próxima, «Próxima
  fecha · Vie 16 de oct, 7:00 pm · Teatro de la Paz»; abajo el sello SN y somosnosotrxs.org. El fondo es la paleta de «Crear cartel» más
  parecida al tono de la portada (durazno, cielo, hueso…): cada semana se ve distinta sin inventar color.
- **Lugar, 4:5:** la misma portada; «Museo · San Luis Potosí», el nombre, «@cuenta» y la pastilla del acento «Esta semana: 2 eventos» si los hay.
- **Historia 9:16 (1080 × 1920):** la portada más alta (1000) y todo el texto fuera de lo que tapa Instagram arriba (250) y abajo (340).
- **«Esta semana» (portada del carrusel del jueves, la idea de OL-464 sin dibujo hasta hoy):** papel, «Esta semana en San Luis Potosí», «Del
  viernes 9 al domingo 11 de octubre» en grande y los tres eventos con su día y hora.
- **Comprobado** en las 12 (`revisarNodos`, con las cajas que da satori): ningún texto fuera del lienzo ni de su zona, ninguno encima de otro,
  ninguno cortado con «…».
- **Sin carrusel de fotos sueltas** (como pedía la idea inicial): una tarjeta reúne portada y foto en una sola imagen, que se lee en el feed sin
  deslizar; el carrusel queda para «Esta semana».

## El texto (armado solo; se edita como hoy)

```
Cantautora potosina. Escribe canciones sobre el desierto, la carretera y las abuelas, con guitarra y una loop station.

Música · Canción · San Luis Potosí
Próxima fecha: viernes 16 de octubre, 7:00 pm, en el Teatro de la Paz @teatrodelapazslp.

Lee su ficha en somosnosotrxs.org/artistas/valeria-quiroz-demo (enlace en la bio).
Más de su trabajo en @valeriaquiroz.demo
Foto: @valeriaquiroz.demo

Sigue a @smsnstrsapp para conocer a más artistas de tu ciudad.

#SanLuisPotosi #ArtistasLocales #Musica #SomosNosotrxs
```

- **La frase gancho** es lo único que Instagram enseña antes de «más»: las primeras oraciones de la descripción hasta tener 60 letras, sin pasar de
  220, cortada siempre en una oración. Sin IA: es cálculo.
- **Límite:** el de Instagram (2 200 letras, 30 #, 20 @, `revisarTexto`); los casos miden de 447 a 643 letras, 4 #, de 3 a 4 @.
- **El lugar:** su gancho, «Museo · San Luis Potosí», «📍 dirección», «Esta semana: Taller de máscaras para familias (sáb 10, 11:00 am) y Visita
  guiada: Leonora y el teatro (dom 11, 7:00 pm).», la ficha, su cuenta, el crédito, «Sigue a @smsnstrsapp para conocer más lugares de tu ciudad.» y
  `#SanLuisPotosi #EspaciosCulturales #Museo #SomosNosotrxs`.
- El enlace de la ficha en el texto **no se puede tocar** en Instagram (por eso «enlace en la bio»): ver la pregunta 5.

## El aviso previo

- **La API de Instagram no deja mandar el primer mensaje**: con la API de mensajería una cuenta solo contesta, dentro de 24 horas, a quien le
  escribió. Por eso el aviso se manda **a mano desde @smsnstrsapp** (el teléfono o el Chrome del founder): «Copiar y abrir su Instagram» copia el
  texto y abre su conversación (`ig.me/m/<cuenta>`); pegar y mandar es de la persona. Al tocarlo queda anotado «avisado» con la fecha.
- Se avisa **la semana anterior** (el día de la casilla de la semana que viene dice «Falta avisarle» en violeta). Texto:

```
¡Hola, Valeria! Te escribimos de Somos Nosotrxs (@smsnstrsapp), la agenda cultural de la ciudad.

El viernes 16 de octubre queremos presentarte en nuestro Instagram entre lxs artistas destacadxs de la semana: tu foto, tu portada y lo que dice
tu ficha (somosnosotrxs.org/artistas/valeria-quiroz-demo), con el crédito de la foto a tu cuenta.

Si prefieres que no, contéstanos «no» y no se publica. Si quieres cambiar algo de tu ficha antes, lo puedes hacer desde la app o decirnos por aquí.
```

- **«Dijo que no»** (en la hoja del día, tras avisar): pide confirmar en una línea; su ficha queda **«Fuera de Instagram»** (renglón nuevo en el «···»
  de la ficha, solo administración, con «Volver a poner») y el día lo toma el siguiente de la rotación.

## La medición

- **Qué se cuenta:** (1) visitas a la ficha del artista o del lugar que llegan con la marca de Instagram (`utm_source=instagram`, como las de
  eventos desde OL-461), una por visitante y día, sin datos personales; (2) «van»: cuentas que, después de esa visita, dan «Voy» a un evento de
  ese artista o lugar en los 7 días siguientes. Quien no tiene cuenta cuenta en las visitas, no en «van».
- **Dónde se ve:** una línea en el renglón del día publicado («31 visitas · 3 van») y dos en su hoja.
- **De dónde llegan:** como el enlace del texto no se toca, las visitas llegan por la bio y por la historia. Propuesta (pregunta 5): la bio lleva a
  una página «Esta semana en Instagram» (`/ig`) con las fichas de la semana, cada una con su marca (`utm_campaign=semana-AAAA-MM-DD`,
  `utm_content=<slug>`); así cada visita se atribuye a su publicación.

## Qué se reutiliza y qué es nuevo

- **Reutiliza:** la página `/admin/instagram` y su barra; `ui/Cabecera` con el chip de ciudad; `ui/Pestanas` (Agenda); `ui/Chip` en la fila de
  contexto; `Lista/conteo`; `ui/Grupo`; `ui/Renglon` (lista, ajuste, redonda); `ui/Hoja` con su ✕; `HojaInstagram` entera (formato, vista,
  líneas, etiquetas con ✕, ubicación, `ui/CampoLargo` con contador, «También en Facebook» y su nota); `admin/hecho`, `admin/enlace`, `ui/Boton`;
  la cola `redes_trabajos` con su latido, reintentos y aviso al teléfono (OL-465); «Crear cartel» para dibujar; `texto.ts`; las vistas con origen.
- **Nuevo (CSS, prefijo `ic-`):** la miniatura 4:5 en el renglón (`.ic-cartel`: el alto del renglón y cuatro quintos de ancho); el verde de
  «Publicado» y el violeta de «Falta avisarle» en la línea del renglón; el texto completo en la hoja (`pre.ic-texto`); la tira de la variante T. Y
  una regla de higiene: el «Ver» suelto (en el renglón y en `admin/hecho`) mide 44 de ancho (hoy en la hoja de Instagram mide lo que sus letras).
- **Nuevo (lógica):** la plantilla de la tarjeta (artista, lugar, «Esta semana») y la regla que llena la semana.

## Plan de código (tras la firma)

1. **Tarjeta** (`src/lib/carteles/plantillas/destacado.tsx` + `dibujarDestacado` en `dibujar.ts`): lo del prototipo (`instagram-calendario-tarjetas.tsx`)
   pasado a la app, con sus pruebas de nodos como las de las plantillas (nada fuera, nada encimado, en las 3 × 2 formas y con nombres largos).
   La portada de «Esta semana» igual. `/api/instagram/...` sirve su vista previa a 720 (solo administración).
2. **Texto** (`src/lib/instagram/texto.ts`): `gancho`, `textoArtista`, `textoLugar`, `textoSemana` (puros, con pruebas: corte en oración, 60–220,
   sin fecha, lugar sin Instagram, límites).
3. **Selección** (función de base `instagram_candidatos(p_ciudad, p_tipo, p_desde)`, definer, solo administración): fichas visibles con foto (el
   artista), portada, descripción ≥ 120 e Instagram (el artista; el lugar según la pregunta 4); sin «Fuera de Instagram»; sin publicación en
   los últimos 6 meses ni casilla en la semana; orden: fecha en los próximos 30 días (el viernes, solo con fecha del viernes al domingo), luego
   la ciudad, luego lo que lleva más tiempo sin salir, luego al azar estable (por id y semana).
4. **Calendario** (migración que añade): tabla `instagram_semana` (id, `fecha`, `ciudad`, `tipo` artista | evento | lugar | semana | descanso,
   `artista_id` / `lugar_id` / `evento_id` (uno según el tipo), `hora`, `estado` propuesto | programado | quitado | publicado, `elegido_por`
   sistema | persona, `trabajo_id`, `aviso_en`, `aviso_respuesta` sin_respuesta | no, quién y cuándo). La llena una rutina el **miércoles** para la
   semana siguiente (con la regla del día) y al abrir la pestaña si falta; «Cambiar» y «Quitar» la editan; Atrás no apila nada.
5. **Programación en la cola de OL-465:** `redes_trabajos` gana `programado_para timestamptz` (null = ahora), `casilla_id`, `artista_id` y
   `lugar_id`; al programar, `siguiente_en = programado_para` (el latido ya no toma lo que no le toca). «Publicar ahora» encola con ahora. El
   trabajador (`trabajar.ts`) dibuja la tarjeta en el paso de imágenes y anota en `instagram_publicaciones` / `facebook_publicaciones`, que ganan
   `artista_id` y `lugar_id`. **Una regla que se afloja**: hoy `evento_id` es `not null` en las tres tablas; un artista o un lugar no tiene evento.
   Propuesta: `drop not null` con un `check` de «exactamente uno de los tres» (ninguna fila cambia). Si el gestor prefiere solo añadir, va una
   tabla hermana `redes_trabajos_fichas` con el mismo trabajador, más larga de mantener.
6. **Aviso previo:** la casilla guarda `aviso_en` al tocar «Copiar y abrir su Instagram» (el portapapeles con el gesto y `ig.me/m/<cuenta>`);
   «Dijo que no» escribe en una tabla nueva `instagram_fuera` (tipo artista | lugar, id, desde, quién; solo administración, la ficha pública no la
   lee) y rehace la casilla con el siguiente candidato. El «···» de la ficha (administración) lee y quita la marca.
7. **Medición:** `vistas_ficha` (artista o lugar, visitante, día, origen, medio; la misma regla de `vistas_evento` y de `ContarVista`, sin datos
   personales) y `instagram_resultado(p_casilla)` (visitas con origen Instagram desde la publicación; «van»: `asistencias` de esas cuentas a eventos
   del artista o del lugar en los 7 días siguientes). La página de la bio `/ig` si se firma la pregunta 5.
8. **Pantalla:** `/admin/instagram` con `ui/Pestanas` («Semana» primero; «Eventos», la lista de hoy sin cambios) y `?semana=esta|viene`;
   `HojaSemana` (un `HojaInstagram` con el título, la línea de por qué, «Cambiar», el aviso y «Publicar ahora»); el renglón de la portada de
   Administración suma «Semana: 4 de 6 programadas». Pruebas de componentes con toques reales y `npm run medir` con la pestaña nueva.

## Comprobado (prototipo)

- `node scripts/ops/auditoria-ui/capturar-instagram-calendario.mjs <carpeta>` con el Chrome de la Mac:
  - **Medición de los 26 estados a 320, 390 y 430** (el medidor del prototipo, como `medir.js`): **0 textos cortados, 0 desbordes, 0 toques fuera de la
    pantalla y 0 toques menores de 44 en lo nuevo**. A 390: la semana 75–78 nodos (profundidad 9; lo nuevo 61–64, profundidad 6), la variante B
    205, la T 56, las hojas 85–115, el «···» de la ficha 173 (profundidad 12, la de producción). Cortes a propósito: el resumen de dos líneas de
    `ui/CampoLargo` (OL-147). «Sin clase» 1–3: los `span` de `admin/hecho`, de la ubicación y de `Grupo/titulo`, como en producción. A 320 los chips
    de semana quedan al final de la fila de contexto, que se desliza (H-11): «La que viene» se ve a medias hasta deslizar.
  - **Recorrido con toques reales: 33 de 33**, sin errores de página ni de consola (`capturas-509/recorrido.txt`): los chips de semana, las dos
    pestañas, abrir el día de hoy, Historia y Publicación, abrir el texto y «Listo», «Publicar ahora» → «Publicando…», «Quitar de la semana» →
    «Quitado», el día publicado y su ✕, «Cambiar» y elegir a Ximena, «Avisar» → «Copiar y abrir su Instagram» → avisado, «Dijo que no» → «Mejor no»
    → «Dijo que no» → «Sí, sacarlo de Instagram» → Ximena en el lunes, el velo y la ✕, «Esta semana», el descanso; sin desplazamiento a lo ancho a
    390 (390/390).
- Las 12 tarjetas: sin textos fuera, encimados ni cortados (arriba). Los textos: dentro de los límites de Instagram.
- `npm run typecheck` en verde y `eslint` sin avisos en los archivos nuevos; `fixture-ciudades.test.ts` pasa (la marca nueva no cambia el respaldo
  de siempre).

## Capturas (`docs/rediseno/capturas-509/`, 390 × 844 salvo donde se dice; cada una abierta)

- `00-armazon`: el prototipo a 1440: los selectores, el teléfono con la semana y las notas (la recomendación, la regla y las preguntas).
- `01-hoy-lista`, `02-hoy-hoja`: producción: «15 eventos en los próximos 7 días · 1 ya en Instagram», «Para publicar · 14»; la hoja de Delirium Pollum
  con el diseño de Crear cartel y «Publicar».
- `03-semana-esta`: «Semana» elegida, «Esta semana» en violeta; Renata Saldaña («Publicado», «31 visitas · 3 van», «Ver»), Los Ecos del Tangamanga
  («12 visitas · 2 van»), el museo («Hoy · 7:00 pm · Lugar · Sale hoy a las 7:00 pm»), «Del viernes 9 al domingo 11» (carrusel de 3), Íñigo Montalvo
  («Avisado el lun 5 · sin respuesta»), Delirium Pollum.
- `04-semana-viene`: del 12 al 18: el Colectivo Nube de Papel y Valeria Quiroz con «Falta avisarle» en violeta; Susurros, el Museo del Ferrocarril,
  «Del viernes 16 al domingo 18», OCA.
- `05-pestana-eventos`: «Eventos» elegida: la lista de hoy tal cual, sin los chips de semana.
- `06-publicando`, `07-quitado`: el museo con «Publicando…»; y con el símbolo SN y «Quitado: este día no se publica».
- `08-variante-b`: sin pestañas, la semana arriba y «Para publicar» debajo. `09-variante-t`: la tira de tarjetas (tres días y medio a la vista).
- `10-dia-lugar`, `10b-dia-lugar-abajo`: «Hoy · 7:00 pm · Lugar»: la tarjeta del museo, «Lugar con 2 eventos esta semana, de San Luis Potosí, nunca en
  Instagram. Cambiar», @museoleonoracarrington.demo con su ✕, la ubicación, el texto 643/2200; abajo «También en Facebook», «Sale sola hoy a las
  7:00 pm…» y «Quitar de la semana»; «Publicar ahora» anclado.
- `11-dia-lugar-historia`: «Historia 9:16» elegida, la tarjeta alta y «Las historias no llevan texto y duran 24 horas».
- `12-dia-artista-sin-fecha`: el Colectivo Nube de Papel: la tarjeta (portada de fanzine, foto redonda NP, «Artes visuales · Ilustración»), «Aviso a
  @nubedepapel.demo: falta mandarlo · Avisar».
- `13-cambiar`: «Cambiar el lunes 12»: la regla en una nota, Ximena Urquidi y Teodoro Alcántara con «Sin fecha próxima · nunca en Instagram», y quién
  no entra.
- `14-dia-artista-con-fecha`, `14b-…-abajo`: Valeria Quiroz con «Próxima fecha · Vie 16 de oct, 7:00 pm · Teatro de la Paz» en la tarjeta y el aviso.
- `15-dia-evento`: Susurros del inconsciente con su cartel, «El evento de ese día con más señal», @aether.slp.
- `16-dia-esta-semana`: la portada «Del viernes 16 al domingo 18 de octubre» y «Carrusel de 4 imágenes…».
- `17-dia-descanso`: «Dom 18 · Descanso» con «Poner un lugar este domingo».
- `18`/`19`/`20-texto-…`: el texto completo de Valeria (514 letras), del Colectivo (521) y del museo (643), con «Listo».
- `21-avisar`: «Avisar a Colectivo Nube de Papel (demo)», por qué a mano, el mensaje completo y «Copiar y abrir su Instagram».
- `22-avisado`: «Aviso a @nubedepapel.demo: avisado hoy, 10:05 am · sin respuesta» y «Si contesta que no, Dijo que no».
- `23-dijo-no`: «¿Sacar a Colectivo Nube de Papel (demo) de Instagram?», «¿Te equivocaste? Mejor no» y «Sí, sacarlo de Instagram».
- `24-cambiado`: el lunes 12 con Ximena Urquidi y «Falta avisarle · en lugar del Colectivo Nube de Papel».
- `25-ficha-fuera`: la ficha real del Colectivo con su «···»: Editar, Destacar, Ocultar de Artistas, Reportar, Borrar la ficha y **«Fuera de
  Instagram · Dijo que no el mié 7 de oct · Volver a poner»**.
- `26-publicado-medicion`: el lunes 5: la tarjeta de Renata, Instagram y Facebook publicados con «Ver», «31 visitas a su ficha desde Instagram», «3
  dieron «Voy» a su próxima fecha después de verla» y cómo se cuenta.
- `27-semana-320`, `28-semana-430`, `29-dia-artista-320`: a 320 los renglones parten sus líneas sin cortarse y «La que viene» asoma al final de la
  fila (se desliza); a 430, holgado; la hoja del artista a 320 con todo entero.
- `30-semana-1280`: escritorio: la barra con SMSNSTRS, el carril de secciones a la izquierda y la semana en la columna de Administración, con
  los chips y las pestañas al centro.
- **Tarjetas** (1080 de ancho, sin pérdida): `tarjeta-valeria-4x5` / `-9x16` (durazno, portada de círculos), `tarjeta-nube-4x5` / `-9x16` (hueso,
  fanzine), `tarjeta-inigo-4x5` (guitarra), `tarjeta-renata-4x5` (atardecer del altiplano), `tarjeta-ximena-4x5`, `tarjeta-leonora-4x5` / `-9x16`
  (cielo, con «Esta semana: 2 eventos»), `tarjeta-ferro-4x5` (sin eventos: sin pastilla), `tarjeta-semana-8-4x5` y `tarjeta-semana-15-4x5`.

## Recomendación

1. **A · R:** «Semana» como primera pestaña de Administración › Instagram, un renglón por día con la tarjeta en pequeño; la hoja del día es la de hoy
   con «Cambiar», «Quitar de la semana» y «Publicar ahora». El sistema llena y programa; la administración solo corrige.
2. **La regla de la semana** del gestor, con horas fijas (artista y lugar 7:00 pm; eventos y «Esta semana» 9:00 am) y **el domingo descansa**: seis
   publicaciones, ninguna encima de otra.
3. **Una tarjeta 4:5 con portada y foto** (y su historia 9:16 junto), dibujada con «Crear cartel» y la paleta de su portada; texto corto con gancho,
   ficha, cuenta y crédito.
4. **Aviso a mano la semana anterior** (la API no deja escribir primero), con el texto listo y «Dijo que no» como marca en la ficha; medir visitas y
   «van» con la página de la bio.

## Preguntas al founder (frases llanas)

1. ¿Firmas A · R (pestañas «Semana · Eventos» y un renglón por día)? ¿O B (la semana arriba de la lista de siempre) o T (una tira de tarjetas)?
2. ¿El domingo descansa la cuenta, o sale un lugar más?
3. ¿Te sirven las horas: artista y lugar a las 7 de la noche; el evento del día y «Esta semana» a las 9 de la mañana?
4. De 50 lugares completos solo 21 tienen Instagram. ¿Entran también los que no tienen (sin etiqueta, sin crédito y sin aviso), o solo esos 21?
5. El enlace que va en el texto no se puede tocar en Instagram. ¿Ponemos en la bio una página «Esta semana en Instagram» con las fichas de la
   semana? Así sabemos de qué publicación llegó cada visita.
6. ¿Invitamos al artista como coautor de su publicación (si acepta, sale también en su perfil), además del mensaje?
7. El aviso sale de @smsnstrsapp a mano, la semana anterior. ¿Lo mandas tú, o quieres que lo haga yo desde tu Chrome (con tu permiso cada vez)?
