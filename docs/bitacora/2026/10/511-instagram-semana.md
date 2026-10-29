# 511 · La semana de Instagram en Administración (código, OL-479)

**Pieza:** OL-479. **Rama:** `instagram-semana`, base `origin/main` (`4dd7a8d6`) más `instagram-calendario` (el prototipo de OL-477, PR #599); `main`
unido al final (`945be550`). **Fecha:** 2026-10-29. **Operador:** agente del Gestor de cambios VII (Opus 5.5, árbol aislado, sin otros agentes).
**Manda:** la firma del founder del 29 de octubre sobre el prototipo de OL-477 («Tomo todas tus recomendaciones», bitácora 509): **A · R** (pestaña
«Semana» antes de «Eventos», un renglón por día con la tarjeta en pequeño; la hoja del día con «Cambiar», «Quitar de la semana» y «Publicar
ahora»); **el domingo descansa**; horas fijas (**artista y lugar a las 7:00 pm; el evento del día y «Esta semana» a las 9:00 am**, en la hora de la
ciudad); **entran todos los lugares** (los que no tienen Instagram, sin etiqueta, sin crédito y sin aviso); **la página «Esta semana en Instagram»
para la bio** con las fichas de la semana y su marca de origen; **el artista invitado como coautor** además del aviso; **el aviso previo lo manda
el founder a mano** desde su teléfono, con el texto listo y «Copiar y abrir su Instagram».
**Estado:** hecho, con **una migración** (`20261029200000_instagram_semana.sql`) y **sin variables nuevas**. Espera revisión del gestor y el
«publica» del founder (aplicar la migración antes de desplegar). No toqué producción, `.env` ni `main`.

Términos (una línea cada uno):
- **Cola de redes:** `redes_trabajos` (OL-465): lo que se va a publicar; el latido `redes-latido` la mira cada minuto y la ruta `/api/redes/correr` publica.
- **Coautor:** el campo `collaborators` de Instagram: la publicación sale también en el perfil del artista si acepta la invitación.
- **Marca de origen:** los `utm_…` de un enlace, que dicen de qué red y de qué publicación llegó una visita (sin datos de la persona).

## 1. Qué hace

- **La semana se arma sola.** Al abrir la pestaña «Semana» de una ciudad (o «La que viene»), si a la semana le faltan días por delante, la app los
  arma con la regla firmada y los guarda; cada día queda en la cola a su hora (el latido no lo toma antes). Lunes artista, martes evento del día,
  miércoles lugar, jueves «Esta semana» (carrusel con los 3 del fin), viernes artista con fecha del viernes al domingo, sábado evento del día,
  domingo descanso. Un día cuya hora ya pasó no se arma y su renglón dice «No se programó»; un día sin nadie (sin artistas o lugares completos, o
  sin eventos) descansa y lo dice («No hay eventos ese día»).
- **Quién entra** (`instagram_candidatos`, en la base): artistas visibles con foto, portada, descripción de 120 letras o más e Instagram; lugares
  visibles y públicos con portada y descripción de 120 o más (con o sin Instagram). Nunca quien dijo que no ni quien salió en Instagram en los
  últimos 6 meses. Orden: con fecha en los próximos 30 días, luego los de la ciudad, luego quien lleva más tiempo sin salir, luego al azar estable.
  El lugar del miércoles: primero los que tienen eventos esa semana. El evento del día: el de más señal de ese día (destacado, «Voy», «Me
  interesa», con cartel) que no esté ya en Instagram; «Esta semana»: los 3 de más señal del viernes al domingo que no salen solos ese fin.
- **La pestaña** (A · R): `ui/Pestanas` «Semana · Eventos» bajo la cabecera, en la dirección (`?pestana=eventos`, reemplaza sin apilar historial);
  en la fila de contexto el chip de ciudad y «Esta semana · La que viene» (`?semana=viene`, tampoco apila); el resumen («2 publicadas · 4
  programadas · 2 por avisar · el domingo descansa»); `ui/Grupo` «Del 5 al 11 de octubre · 7 días» y un `ui/Renglon` por día con la tarjeta 4:5 en
  pequeño (prop nueva `cartel`), el nombre, «Lun 5 · 7:00 pm · Artista», cómo va («Publicado» en verde, «Sale hoy a las 7:00 pm», «Programado»,
  «Publicando…», «Quitado: este día no se publica», «La cuenta descansa»), el aviso («Falta avisarle» en violeta, «Avisado el lun 5 · sin
  respuesta», «· en lugar de …») y, ya publicado, «31 visitas · 3 van» y «Ver». Mientras algo se publica, se refresca cada 20 s y al volver a la app.
  «Eventos» es la lista de hoy sin cambios (con el bloque «Conexión» de OL-471, que va también en «Semana»).
- **La hoja del día** (`HojaDia`, la de hoy con tres cambios): el título dice el día, la hora y qué toca; la línea de por qué lo eligió el sistema,
  con «Cambiar» (los candidatos en el orden de la regla, con por qué, y quién no entra: «Valeria Quiroz ya va el vie 16»); «Publicar ahora» abajo
  (si no se toca, sale sola a su hora) y «Quitar de la semana» (luego «Volver a programar»). Publicación 4:5 · Historia 9:16, la tarjeta que
  dibuja el servidor, la etiqueta con ✕ («se invita a su cuenta como coautora» en el artista), la ubicación, el texto (`ui/CampoLargo`), «También en
  Facebook». Lo que se cambia (texto, etiqueta, Facebook) **se guarda al cerrar**: sale así a su hora. Ya publicada: Instagram, Facebook e historia
  con sus «Ver», «31 visitas a su ficha desde Instagram», «3 dieron «Voy» a una de sus fechas después de verla» y cómo se cuenta. Un descanso:
  «Poner un lugar este día» (el siguiente lugar de la rotación, a las 7:00 pm).
- **El aviso previo** (artistas y lugares con Instagram): «Aviso a @cuenta: falta mandarlo · Avisar» → la hoja «Avisar a …» con el mensaje completo
  y «Copiar y abrir su Instagram» (copia el texto y abre `ig.me/m/<cuenta>`; pegar y mandar es de la persona) → «avisado hoy, 10:00 am · sin
  respuesta» → «Si contesta que no, Dijo que no» → «¿Sacar a … de Instagram?» con «¿Te equivocaste? Mejor no» y «Sí, sacarlo de Instagram»: la ficha
  queda fuera y el día lo toma el siguiente de la rotación («en lugar de …»); si no hay nadie, el día se quita.
- **«Fuera de Instagram» en el «···» de la ficha** (artista y lugar, solo administración): «Dijo que no el mié 7 de oct · Volver a poner».
- **La tarjeta** (`src/lib/carteles/plantillas/destacado.tsx` + `dibujarDestacado` y `dibujarPortadaSemana` en `dibujar.ts`): lo del prototipo pasado a
  la app con las piezas de «Crear cartel» (satori y sharp, Bricolage, `ajustar`, la paleta por el tono de la portada, el sello `pie()`); sin portada o
  sin foto legibles, la imagen de relleno con el símbolo SN (`public/sin-foto.png`). Vista previa: `/api/instagram/semana/<día>?formato=&mini=1`.
- **El texto** (`src/lib/instagram/destacado.ts`): `gancho` (las primeras oraciones hasta 60 letras, sin pasar de 220, nunca a media oración),
  `textoArtista`, `textoLugar`, `textoSemana`, `avisoPrevio`, como en la bitácora 509 §«El texto»; lenguaje incluyente («lxs artistas destacadxs»).
- **Publicar** (el trabajador de OL-465, `trabajar.ts`): un artista o un lugar (`enFicha`) dibuja su tarjeta, publica con su cuenta etiquetada e
  invitada como coautora (solo el artista; si Instagram no acepta al coautor, sale sin él y se dice), **luego su historia 9:16** (una vez, sin
  reintentos: si no sale, la publicación queda y se dice) y el espejo en Facebook con el enlace tocable a su ficha (`utm_source=facebook`).
  «Esta semana» (`enSemana`): carrusel con la portada y el cartel de cada evento (su lugar etiquetado en su cartel). El evento del día va por el
  camino de siempre. Al terminar, el día queda publicado o «no se pudo» y el aviso al teléfono abre ese día (`?pestana=semana&dia=`).
- **Medir** (`vistas_ficha`, `contar_vista_ficha`, `ContarVistaFicha` en las fichas de artista y lugar, `/api/vista` con `artista`/`lugar`): solo
  visitas que llegan con la marca de Instagram o Facebook, una por visitante y día, la misma sal y regla que los eventos, sin datos de nadie;
  `instagram_resultado` cuenta las visitas de los 7 días desde que salió y «van»: cuentas que, tras una de esas visitas, dieron «Voy» a un evento
  suyo (se reconoce recalculando la misma clave con su id; no se guarda nada nuevo de nadie).
- **La página de la bio** (`/ig`, `?ciudad=`; por omisión San Luis Potosí): lo ya publicado de la semana, cada ficha con
  `utm_source=instagram&utm_medium=bio&utm_campaign=semana-<lunes>&utm_content=<ficha>`. Lo programado no se adelanta.
- **La portada de Administración** suma «· Semana: N de M programadas» al renglón de Instagram.

## 2. La migración (`20261029200000_instagram_semana.sql`)

- **Lo único que se afloja (permitido por el gestor; ninguna fila cambia):** `evento_id` deja de ser obligatorio en `redes_trabajos`,
  `instagram_publicaciones` y `facebook_publicaciones`, que ganan `artista_id` y `lugar_id` (on delete cascade, como el evento) con un `check` de que
  exactamente uno de los tres está puesto. `facebook_publicaciones_registro` copia también el artista y el lugar de la publicación que espeja.
- **Solo añade:** `instagram_publicaciones.coautores`; `instagram_semana` (ciudad, fecha, tipo, la ficha o los eventos, hora, `programado_para`,
  estado, por qué, a quién reemplaza, el trabajo, `aviso_en`, `dijo_no_en`; una por ciudad y día; solo la lee la administración, se escribe por
  sus funciones); `instagram_fuera` (solo administración); `vistas_ficha` (solo sus funciones); las funciones `instagram_candidatos`,
  `instagram_semana_guardar`, `_cambiar`, `_quitar`, `_ahora`, `_texto`, `_avisado`, `_dijo_no`, `instagram_resultado` (definer, solo responden a
  la administración), `contar_vista_ficha` (solo `service_role`) e `instagram_semana_bio` (pública: solo lo ya publicado de fichas que se ven);
  todas con `search_path = ''`. Sin cron nuevo: la cola ya espera con `siguiente_en`.
- `supabase/tests/pg/borrado-excepcional-admin.test.mjs`: su lista de lo que cuelga de un lugar suma las seis tablas nuevas (todas de la cuenta de
  la marca o sus vistas; no cambian el impacto que se confirma al borrar un lugar).

## 3. Comprobado

- `npm run lint`: 0 errores (los avisos que quedan son de archivos ajenos). `npm run typecheck`: limpio.
- `npm test`: **5 045 de 5 045** (312 archivos; nuevas: `carteles/destacado.test.ts` —5 casos × 2 formatos, nada fuera ni encimado ni cortado, la
  imagen de relleno, la paleta, la de 720 y la portada de «Esta semana»—, `instagram/destacado.test.ts`, `instagram/semana.test.ts`, 3 de coautor en
  `api.test.ts`, 3 de Facebook en `facebook/texto.test.ts`, 9 del trabajador en `trabajar.test.ts` y 2 de `/api/vista`).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **122 migraciones, 2 847 pruebas, 0 fallaron** (banco nuevo
  `instagram-semana.test.mjs`); con `FORZAR_FALLO=1` sale 1 (control negativo).
- `npm run test:componentes`: **774 de 774** (9 nuevas en `HojaDia.componentes.test.mjs` con toques reales y `elementFromPoint`).
- `npm run inventario`: sin novedades. `npm run medir` (62 pantallas × 4 anchos): todo igual salvo las de Instagram, con el presupuesto
  anotado a mano: s46 (la lista, ahora con `?pestana=eventos`) y s47 (su hoja) **+3 nodos** (las pestañas: 132 y 165 a 390); dos pantallas nuevas,
  **s48** (la semana, 81 nodos a 390, profundidad 9) y **s49** (la hoja del día de hoy, 91, profundidad 9), con su paso `admin-instagram-dia`.
  Después, `--solo=admin-instagram`: sin novedades.
- `npm run build` en verde (lo compilan `medir` y el recorrido).
- **Recorrido en la app** (`node scripts/ops/auditoria-ui/capturar-instagram-semana.mjs . <carpeta>`, la app compilada contra el respaldo con
  `RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`, el trabajador de verdad y las APIs de mentira; Chrome real a 2×, toques por coordenadas):
  **51 de 51 comprobaciones, sin errores de página ni de consola** (`capturas-511/recorrido.txt`, con lo que había bajo el dedo en cada toque):
  los siete días con la regla (el viernes, Íñigo Montalvo, que toca el sábado), el resumen, «Esta semana · La que viene» y las pestañas sin apilar
  historial, «Cambiar» (y quién no entra), la tarjeta y la miniatura del elegido (no las guardadas del anterior), el aviso y el portapapeles,
  «Dijo que no» y el siguiente, «Fuera de Instagram» y «Volver a poner» en la ficha, **«Publicar ahora» con el trabajador de verdad: la publicación
  (texto con su ficha, etiquetada, coautor), su historia y Facebook con el enlace y su marca**, lo que dio el lunes, «Quitar», el carrusel, el
  descanso, la bio con sus marcas de origen y la portada; **a 320, 390 y 430 sin textos cortados, sin desplazamiento a lo ancho y sin toques menores
  de 44 en lo nuevo**. Un tropiezo que salió así y se corrigió: tras «Cambiar», la tarjeta guardada en el teléfono seguía siendo la del anterior
  (misma dirección); ahora la dirección lleva de qué ficha es.
- **Encontrado al probar:** Next guarda durante una misma petición la respuesta de un GET igual; al volver a leer la semana recién armada devolvía
  la de antes de guardar (todos los días «No se programó»). La segunda lectura va con su propia señal (`abortSignal`) y queda fuera de esa memoria.

## 4. Capturas (`docs/rediseno/capturas-511/`, 390 × 844 salvo donde se dice; cada una abierta)

- `01-semana-esta`: «Semana» elegida (y el bloque «Conexión» de OL-471); «2 publicadas · 4 programadas · 2 por avisar · el domingo descansa»;
  Renata Saldaña (lun 5, Publicado, 31 visitas · 3 van, Ver), Los Ecos del Tangamanga (mar 6), el museo Leonora Carrington (Hoy · 7:00 pm · Lugar,
  «Sale hoy a las 7:00 pm», «Falta avisarle»), «Del viernes 9 al domingo 11» (carrusel de 4), Íñigo Montalvo (vie 9, artista con fecha el fin).
- `02-semana-viene`: del 12 al 18: el Colectivo Nube de Papel, el martes que descansa («No hay eventos ese día», el respaldo no tiene), el Museo
  del Ferrocarril, «Del viernes 16 al domingo 18», Valeria Quiroz y OCA; «Falta avisarle» en violeta.
- `03-pestana-eventos`: «Eventos»: la lista de hoy tal cual.
- `04-dia-lugar`, `04b-dia-lugar-abajo`: «Hoy · 7:00 pm · Lugar»: la tarjeta del museo, por qué con «Cambiar», «Aviso a @…: falta mandarlo ·
  Avisar», la etiqueta, la ubicación, el texto (676/2200), «También en Facebook», «Sale sola hoy a las 7:00 pm…», «Quitar de la semana» y
  «Publicar ahora» anclado.
- `05-dia-historia`: «Historia 9:16»: la tarjeta alta y «La historia sale con la publicación y dura 24 horas».
- `06-cambiar-lugar`: «Cambiar hoy»: nadie más (en el respaldo solo hay dos lugares completos) y «Museo del Ferrocarril … ya va el mié 14».
- `07-cambiar-artista`: «Cambiar el lunes 12»: Ximena Urquidi y Teodoro Alcántara con por qué, y «Valeria Quiroz ya va el vie 16; Íñigo
  Montalvo ya va el vie 9».
- `08-dia-artista-viene`: el lunes 12 ya con Ximena (su tarjeta), su aviso y «se invita a su cuenta como coautora».
- `09-avisar`: «Avisar a Ximena Urquidi (demo)»: por qué a mano, el mensaje completo y «Copiar y abrir su Instagram».
- `10-avisado`: «Aviso a @…: avisado hoy, 10:00 am · sin respuesta» y «Si contesta que no, Dijo que no».
- `11-dijo-no`: «¿Sacar a Ximena Urquidi (demo) de Instagram?», «¿Te equivocaste? Mejor no» y «Sí, sacarlo de Instagram».
- `12-tras-dijo-no`: el lunes 12 con el Colectivo Nube de Papel y «En lugar de Ximena Urquidi (demo), que dijo que no».
- `13-ficha-fuera`: la ficha de Ximena con su «···»: «Fuera de Instagram · Dijo que no el mié 7 de oct · Volver a poner».
- `14-publicando`, `15-publicado`: tras «Publicar ahora», Íñigo Montalvo «Publicando…» y luego «Publicado · 0 visitas · 0 van · Ver».
- `16-dia-publicado`: su hoja: Instagram, Facebook e historia con sus «Ver» y lo que dio (todavía nada).
- `17-dia-medicion`: el lunes de Renata: «31 visitas a su ficha desde Instagram» y «3 dieron «Voy» a una de sus fechas después de verla».
- `18-dia-quitado`, `19-semana-quitado`: el sábado quitado: «Quitado: este día no se publica. Volver a programar», y en la semana con el símbolo SN.
- `20-dia-esta-semana`: el jueves: la portada «Del viernes 9 al domingo 11 de octubre» con sus tres eventos y el texto «Este fin en San Luis Potosí».
- `21-dia-descanso`: «Dom 11 · Descanso», por qué y «Poner un lugar este día».
- `22-bio`: «Esta semana en Instagram»: Renata, Los Ecos e Íñigo, cada uno con su marca de origen.
- `23-portada-admin`: «@smsnstrsapp · 6 publicadas esta semana · 2 en Facebook · 14 por publicar · Semana: 5 de 6 programadas».
- `24-semana-320`, `24-semana-430`, `25-dia-artista-320`, `25-dia-artista-430`: la semana que viene y la hoja de Valeria Quiroz: a 320 los renglones
  parten sus líneas sin cortarse y «La que viene» asoma al final de la fila (se desliza); el bloque «Conexión» de OL-471 parte «Sin conexión
  propia» en tres renglones a 320 (es de esa pieza; aquí solo sale también en «Semana»).
- `tarjeta-*.jpg` (720 de ancho, las que dibuja el servidor): artista del lunes y del viernes (4:5 y 9:16), el lugar de hoy (4:5 y 9:16) y la portada
  de «Esta semana».

## 5. Decisiones del operador (para el gestor)

1. **Sin rutina del miércoles:** la semana se arma al abrir la pestaña (y «La que viene» al tocarla), no sola un día fijo: el encargo no deja cron
   nuevo. Si nadie abre la pestaña, la semana que viene no se programa. Propuesta: que el latido de las rutinas la arme los miércoles (pieza aparte).
2. **`redes_reciente` no se cambió:** cuenta como «en camino» lo que la semana programó para más tarde. En TypeScript se deja fuera (la lista de hoy,
   la hoja y «Publicar»); si se publica ahora un evento que la semana tenía para otro día, ese día ya no lo repite (lo ve publicado).
3. **«Esta semana» va a nombre de su primer evento** (un trabajo es de un evento, un artista o un lugar): ese evento sale en «Ya en Instagram» como
   carrusel; las visitas del carrusel se cuentan en ese evento.
4. **La historia acompaña a cada artista y lugar** (la tarjeta 9:16, después de la publicación) solo en Instagram; el espejo en Facebook es la publicación.
5. **Mañana dice su día** («Jue 8», como el prototipo firmado), no «Mañana».
6. Un día sin nadie **descansa** y lo dice; el resumen dice «N por avisar».

7. El bloque «Conexión» de OL-471 va también en la pestaña «Semana» (sin la cuenta conectada no sale nada de la semana).

## 6. Qué quedó fuera

- La rutina que arma la semana sola (decisión 1).
- El espejo de la historia en Facebook.
- Contar las visitas de los eventos 2 y 3 del carrusel «Esta semana».

## 7. Preguntas al founder (frases llanas)

1. ¿Te sirve que la semana se arme cuando abres la pestaña, o quieres que se arme sola los miércoles aunque no entres?
2. Cada artista y cada lugar sale también en historia, justo después de la publicación. ¿Así, o solo la publicación?
3. Si un día no hay eventos (o no hay nadie con la ficha completa), ese día descansa. ¿O prefieres que salga otro artista o lugar?
4. El aviso a los lugares con Instagram también se manda a mano, como a los artistas. ¿Te late, o a los lugares no les avisamos?
