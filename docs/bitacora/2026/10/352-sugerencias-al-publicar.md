# 352 · Sugerencias al publicar: la exposición tras la inauguración y el festival tras el segundo acto

**Pieza:** OL-323 (doc 55 §4, pieza 3). **Rama:** `sugerencias-al-publicar`, apilada sobre `origin/exposicion-taller-festival` (OL-321, PR #412, que a su vez va sobre #411): unir después de #412. **Fecha:** 2026-10-07. **Operador:** Claude (agente del gestor IV).
**Manda:** el prototipo aceptado por el founder el 2026-10-05, `docs/rediseno/prototipos/eventos-superficies.html` (casos h1, h2 y h4; bitácora 314: «la ficha en punteado sustituye a la tarjeta de sugerencia»); el modelo `docs/investigaciones/eventos-modelo.md` §10 (H1, H2, H4, H5, «costo de atención, ignorar y deshacer» y las variantes que protegen el flujo); doc 51 y doc 55 §4.
**Estado:** hecho y probado con los componentes reales (Chrome), con la app compilada contra el respaldo local (Chrome a 390 y 320) y en el simulador de iPhone 15 Pro (Safari, iOS 26.3); falta el iPhone real. **Trae una migración que solo añade; la aplica el gestor, después de la de OL-321** (`20261007100000_sugerencias_al_publicar.sql`). Sin ella, «Publicado» sale como hoy (la búsqueda de la sugerencia falla en silencio y no se enseña nada).

## Qué hace

Después de publicar un evento o un taller, «Publicado» pregunta al servidor si hay algo que sugerir (solo lecturas: la publicación no espera nada) y enseña **una sola** sugerencia bajo la tarjeta del evento, con la forma de lo que se crearía y **en punteado mientras no existe** (prototipo h1/h2/h4): etiqueta, nombre, datos con icono, su botón y «Ahora no». Nunca una ventana ni un aviso después. Mientras está a la vista, «Compartir» pasa a secundario (bitácora 323: «Compartir es la acción principal salvo que haya una sugerencia en punteado»). Si concurren, gana la del periodo visitable (modelo §10).

- **H1 · la apertura trae el periodo.** El cartel lee una exposición con su visita y la persona publica la inauguración como evento. Ficha «También puedes publicar · Ecos de papel · Del 6 al 30 de nov · exposición · Teatro de la Paz · Lucía Montaño · expone» con «Publicar exposición». Un toque la crea en la base en una sola operación (`publicar_exposicion_de_inauguracion`): `clase='exposicion'`, su periodo (del primer día a las 00:00 al final del de cierre, como la arma el alta), el mismo lugar o sitio, el mismo cartel y enlace, quién expone, **sin** la hora ni el precio de la ceremonia; horario: el del lugar (o el propio si se pone en H2); ligada por `inaugura_id`; con sus avisos como cualquier alta. La ficha punteada pasa a la tarjeta de lo creado: «✓ Exposición publicada · Ecos de papel · Del 6 al 30 de nov · Teatro de la Paz · Ver la exposición».
- **Ya publicada (H1/H2):** si existe una exposición propia con el mismo nombre, en el mismo lugar o sitio, sin inauguración y con días que se cruzan, se ofrece «Ya está publicada · Ligar la inauguración» (`ligar_inauguracion`) en vez de crear otra.
- **H2 · la apertura sin periodo.** El título o el cartel nombran una muestra («Inauguración de la exposición Pliegues») pero solo la apertura tiene fecha: «También puedes publicar · Pliegues · Exposición · ¿Hasta cuándo se puede visitar?» con «Agregar periodo de visita», que abre en la misma pantalla la pregunta «¿Cuándo se puede visitar?» de OL-321 (`PasoVisita`, con «Desde» puesto al día siguiente de la apertura y la casilla «Horario del lugar») y su pie dice «Publicar exposición». Atrás vuelve a «Publicado» sin crear nada.
- **H4 · dos actos del mismo festival, altas separadas.** El título o el cartel del evento recién publicado nombran un festival **con nombre y edición** y otro evento propio y reciente (60 días, visible, no borrador, evento o taller, sin festival) nombra el mismo, con otro título: «Estos dos eventos forman parte de · Festival Umbral 2026», los dos actos unidos por una línea (el recién publicado con el punto hueco) y «Relacionar los dos». Un toque crea el festival (`clase='festival'`, nombre = la mención, sitio y periodo de su programa registrado) y liga los dos (`relacionar_en_festival`): «✓ Ya son parte del festival · Festival · Programa registrado: 2 actividades · Ver el festival».
- **H5 · el festival propio ya existe.** Desde el primer acto: «Parte de · Festival Umbral 2026 · Festival · Programa registrado: N actividades» con «Relacionar» (o «Relacionar los dos» si además hay otro acto suelto que lo nombra).
- **Ignorar no es confirmar.** «Ahora no», o salir de «Publicado» con la sugerencia sin tocar («Publicar otro», la ✕, la tarjeta del evento, Atrás), la anota como descartada en el evento (`anotar_sugerencia`) y no vuelve a salir para él; la de un festival guarda su clave, así un tercer acto no vuelve a ofrecer la misma agrupación. Aceptada, salir no la anota. Sigue disponible desde editar («Parte de un festival», y en la exposición «Inauguración»).
- **El error de aceptar** se dice solo en la sugerencia («No se pudo publicar la exposición. Intenta de nuevo.») y el reintento usa la misma clave: nunca dos exposiciones ni dos festivales.
- **Deshacer.** «Parte de un festival · Quitar del festival» al editar el acto ya existía (OL-321) y suelta la liga conservando las dos fichas (comprobado en la base). «Quitar la inauguración» al editar la exposición **no soltaba la liga** (la función de OL-321 solo la cambia si llega una inauguración): ahora editar manda `quitar_inauguracion` cuando la exposición tenía una al abrir y se quitó, y la acción la suelta tras guardar; las dos fichas siguen.

## Lo que se detecta y lo que no (`lib/sugerencias.ts`)

- **Mención de festival:** «Festival de Cine UASLP 2026», «9º Festival Internacional de Danza», «XXIII Festival de las Artes», «Noveno Festival del Desierto», «Festival Umbral, 3a edición». La clave es el nombre normalizado y la edición. **No cuentan:** sin edición («Festival de Cine UASLP»), otra edición (2025 ≠ 2026), «Festival 2026» a secas, y lo que va tras «ganador(a/es) del», «premio», «patrocinio/patrocina», «con el apoyo del», «selección oficial», «finalista», «participó en», «rumbo al»… Solo título y lectura del cartel (la descripción del artista nunca entra).
- **Mismo acto:** títulos iguales sin acentos ni mayúsculas: un duplicado, una corrección o la segunda función de la misma obra (aunque sea otro día) no cuentan como segundo acto.
- **Apertura y muestra:** apertura = el título dice «inauguración/inaugura» o el cartel trae una exposición con fecha y hora antes de su visita; muestra = «exposición/expo/muestra» en singular (ni «muestra de cine» ni «cinco exposiciones») o el cartel dice exposición. «Inauguración de la Casa de Cultura» no ofrece nada. El nombre de la muestra sale del título («Inauguración de la exposición fotográfica colectiva «Cuerpo contra imagen»» → «Cuerpo contra imagen»); si no queda nombre, no se ofrece.
- **Lo anotado:** la columna nueva `eventos.sugerencias` (jsonb): la mención que leyó el cartel (`mencion_festival`, la guarda `crearEvento` con el campo `festival_leido`, porque el título no siempre la trae y el segundo acto la necesita) y el estado de cada sugerencia (`exposicion`, `festival` con su clave).

## Decisiones del operador (por confirmar)

1. **Dónde se guarda el descarte:** columna jsonb `eventos.sugerencias` (lo que pedía el encargo si cabía en lo que existe), no una tabla. Se lee como el resto del evento: la mención sale del cartel público y el estado solo dice si su autor aceptó una ayuda. Escribirla toca `actualizado_en` del evento (como cualquier cambio).
2. **Un título de inauguración publica la inauguración** (`claseSugerida` y la lectura del cartel): con OL-321, «Inauguración de la exposición X» proponía exposición y el cartel de una inauguración con su visita publicaba la exposición con su inauguración dentro (caso 1 del doc 55), así que H1 y H2 nunca habrían salido. Ahora, si el título dice inauguración, es un evento (como el caso h1 del prototipo aceptado: «Inauguración de Ecos de papel» se publica como evento y la exposición se sugiere después). El cartel de la exposición misma («Ecos de papel», sin «inauguración» en el título) sigue como en OL-321.
3. **Un acto que nombra su festival es un evento** (`claseSugerida`): «Master Class - 9° Festival de Cine UASLP» o «Concierto de clausura del Festival Umbral 2026» proponían festival en OL-321; ahora proponen evento (se relaciona en «Publicado», H4/H5). Si antes de «Festival» solo va su edición («9° Festival…», «XXIII…», «Gran…»), sigue proponiendo festival. Hallado al probar H4 en la app compilada.
4. **Textos:** la etiqueta de la exposición es «También puedes publicar» (el prototipo decía «El cartel también anuncia», que no vale cuando la pista sale del título); botones «Publicar exposición» (como «Revisa» de OL-321; el prototipo «Publicar la exposición»), «Agregar periodo de visita» y «Relacionar los dos» (encargo y modelo; el prototipo «Juntarlos en el festival»). Aceptada: «Exposición publicada», «Inauguración ligada», «Ya son parte del festival».
5. **La línea punteada es la gris** de la sugerencia que ya tenía «Publicado» (OL-315/316; el founder eligió el gris para lo que falta el 2026-10-05), no la violeta del prototipo.
6. **Sin «Deshacer» de unos segundos** tras aceptar (el prototipo lo tenía): el encargo pone el deshacer en editar («Quitar del festival», «Quitar la inauguración»).
7. **La exposición sugerida no hereda el precio** (prototipo: «no hereda su hora ni su precio»): sin precio, su ficha dirá «Gratis» hasta que se edite (falta un «costo por confirmar»). El festival de H4 nace también sin precio, por lo mismo.
8. **«Desde» en H2** es el día siguiente a la apertura (por confirmar, como pedía el encargo); si el cartel trae un «desde» posterior, ese.
9. **Solo lo propio:** la sugerencia sale solo a quien publicó el evento, y solo con sus exposiciones, sus eventos y sus festivales (también para la administración: no agrupa eventos ajenos). Un festival o una exposición ajenos no se ofrecen (OL-321, decisión 5).
10. **No se sugiere al terminar de editar:** editar vuelve a la ficha sin pantalla «Publicado» (OL-319), así que no hay sitio; la sugerencia descartada tampoco reaparece ahí. Lo mismo queda a mano desde «Revisa».
11. **Una exposición o un festival publicados** conservan su sugerencia de OL-321 («¿Tiene inauguración?», «¿Falta algo del programa?»); la de OL-323 sale a un evento o un taller.
12. **Descartar al salir** se anota al desmontarse la pantalla (con un turno de espera para no contar el desmontaje de prueba de React); si se cierra la pestaña o la app de golpe no se anota, pero tampoco se vuelve a ver «Publicado» de ese evento.
13. **Respaldo local:** publicar un evento (y aceptar o descartar una sugerencia) queda en memoria mientras corre el servidor, como las asistencias; el fixture no cambia y `medir` no lo usa.

## Migración `20261007100000_sugerencias_al_publicar.sql` (solo añade)

- `eventos.sugerencias jsonb not null default '{}'` con su comprobación de objeto.
- `anotar_sugerencia(evento, tipo, estado, clave)`: descartada o aceptada; solo quien gestiona el evento; una aceptada no se vuelve descartada.
- `publicar_exposicion_de_inauguracion(inauguración, título, inicio, fin, horario, operación)`: todo o nada y reintentable; rechaza una inauguración ajena, que no es un evento, en un sitio reservado, que ya abre otra exposición, o datos inválidos.
- `ligar_inauguracion(exposición, inauguración)`: las dos gestionadas; no pisa otra inauguración.
- `relacionar_en_festival(eventos, festival, título, operación)`: festival propio existente o uno nuevo; ningún acto ajeno, festival, borrador ni de otro festival; todo o nada; reintentable.

## Pruebas

- `npm run lint`: 0 errores (el aviso de siempre en `VisorImagen.componentes.test.mjs`). `npm run typecheck`: verde.
- `npm test`: **164 archivos, 2461 pruebas, en verde**. Nuevas: `lib/sugerencias.test.ts` (57: menciones válidas y las que no cuentan —premio, patrocinio, selección, sin edición, otra edición—, apertura, muestra, nombre de la muestra, mismo acto, pistas, H1, H2, ligar, ocho casos que no ofrecen exposición, H4, H5, seis casos que no ofrecen festival, prioridad), `app/eventos/sugerencias.acciones.test.ts` (12: la búsqueda solo de lo propio, aceptar con su clave y su periodo en la hora del sitio, errores, descartar, `crearEvento` anota la mención solo con edición), `app/nuevo/evento/sugerencia.test.ts` (5: inauguración y acto como evento, el cartel de la exposición sigue como en OL-321, el festival leído).
- `npm run test:db` (PostgreSQL 17 local): **1734 pruebas, 0 fallos**, 85 migraciones; `sugerencias-al-publicar.test.mjs` nueva (anotar y sus permisos, la exposición con lo que hereda y lo que no, reintento, una por inauguración, rechazos sin dejar nada, ligar, H4 con festival nuevo y reintento, H5, actos ajenos o de otro festival sin dejar nada a medias, festival ajeno, deshacer conservando las fichas).
- Componentes (Playwright, Chrome de la Mac): **`Sugerencias.componentes.test.mjs` nuevo, 8 pruebas** (H1 del cartel con sus pistas y «Compartir» secundario, H2 con Atrás y «Publicar exposición», H4, H5, ignorar con «Publicar otro» y con «Ahora no», error y reintento con la misma clave, sin sugerencia, 320 sin desbordes). Suite completa `npm run test:componentes`: **483 de 483**.
- `npm run inventario`: sin novedades (332 medidas en duro). `npm run medir`: 35 pantallas × 4 anchos, sin novedades.

## Capturas (`docs/rediseno/capturas-352/`)

De los componentes reales en Chrome (2×, con la letra de la app):

- `01-h1-sugerencia-390.png`: «Evento publicado» de «Inauguración de Ecos de papel» con su cartel; debajo la ficha punteada «También puedes publicar · Ecos de papel · Del 6 al 30 de nov · exposición · Teatro de la Paz · Lucía Montaño · expone», «Publicar exposición» y «Ahora no»; «Compartir» y «Descargar el cartel» en secundario.
- `02-h1-exposicion-publicada-390.png`: la tarjeta de lo creado con borde lleno: «✓ Exposición publicada · Ecos de papel · Del 6 al 30 de nov · Teatro de la Paz · Ver la exposición»; «Compartir» vuelve a ser principal.
- `03-h2-sugerencia-390.png`: «Inauguración de la exposición Ecos de papel» (sin cartel, el símbolo SN): «Exposición · ¿Hasta cuándo se puede visitar?» en gris y «Agregar periodo de visita».
- `04-h2-cuando-se-puede-visitar-390.png`: «¿Cuándo se puede visitar?» con «Desde · sáb 10 de oct» puesto, «Hasta · sáb 31 de oct» elegido, la banda, la casilla «Horario del lugar» y «Publicar exposición» en el pie.
- `05-h2-exposicion-publicada-390.png`: de vuelta en «Publicado»: «Exposición publicada · Del 10 al 31 de oct».
- `06-h4-sugerencia-390.png`: «Estos dos eventos forman parte de · Festival Umbral 2026», «Concierto de Trío Bruma · jue 8 de oct · Centro de las Artes» unido por la línea a «Lectura en voz alta · vie 9 de oct · Teatro de la Paz · recién publicado» (punto hueco), «Relacionar los dos».
- `07-h4-relacionados-390.png`: «✓ Ya son parte del festival · Festival · Programa registrado: 2 actividades», los dos actos y «Ver el festival».
- `08-h1-sugerencia-320.png`, `09-h4-sugerencia-320.png`, `10-h1-exposicion-publicada-320.png`: lo mismo a 320, sin desbordes (los títulos largos bajan de renglón).

De la app compilada contra el respaldo local (sesión inventada de Ana), en Chrome:

- `11-app-h2-sugerencia-390.png`, `16-app-h2-sugerencia-320.png`: «Inauguración de la exposición Pliegues / Ecos de papel» en el MUNI con su ficha punteada (H2).
- `12-app-h2-cuando-se-puede-visitar-390.png`, `17-app-h2-cuando-se-puede-visitar-320.png`: la pregunta de la visita con el horario del MUNI («Ma–Do · 10:00 a.m.–6:00 p.m. · Cierra Lu»).
- `13-app-h2-exposicion-publicada-390.png`, `18-app-h2-exposicion-publicada-320.png`: «Exposición publicada · Del 10 al 31 de oct · MUNI».
- `14-app-h4-sugerencia-390.png`, `19-app-h4-sugerencia-320.png`: el segundo acto publicado («Lectura de poesía · Festival Umbral 2026» / «… Festival del Tunal 2026») propone relacionarlo con el primero; el primer acto no propuso nada.
- `15-app-h4-relacionados-390.png`, `20-app-h4-relacionados-320.png`: el festival creado con sus dos actos.

Del simulador iPhone 15 Pro (iOS 26.3, Safari, la misma app; el «·» de un título salió «¬∑» por el portapapeles del simulador, no por la app):

- `21-sim-h2-sugerencia.png`: H2 en Safari: la ficha punteada con «Agregar periodo de visita» y «Ahora no» sobre el pie.
- `22-sim-h2-cuando-se-puede-visitar.png`: «¿Cuándo se puede visitar?» con «Desde · sáb 10 de oct», el 31 elegido y «Publicar exposición».
- `23-sim-h2-exposicion-publicada.png`: «Exposición publicada · Pliegues · Del 10 al 31 de oct».
- `24-sim-h5-parte-de.png`: un tercer acto con el festival ya creado: «Parte de · Festival Umbral 2026 · Festival · Programa registrado: 2 actividades», el acto recién publicado y «Relacionar» (H5).
- `25-sim-h5-relacionado.png`: «Ya son parte del festival · Programa registrado: 3 actividades».

## Qué probar en el iPhone

1. Subir el cartel de una inauguración que diga hasta cuándo se visita: se publica como evento y «Publicado» propone la exposición; «Publicar exposición» y abrir su ficha (horario del lugar, la inauguración ligada).
2. «Inauguración de la exposición …» sin cartel: «Agregar periodo de visita», elegir el cierre, publicar.
3. Dos eventos seguidos que digan «… · Festival X 2026» en el título (o en el cartel): el segundo propone relacionarlos; aceptar y abrir el festival.
4. «Ahora no» y «Publicar otro» sin tocar la sugerencia: no vuelve a salir para ese evento ni para un tercer acto del mismo festival.
5. Editar la exposición creada y «Quitar la inauguración»; editar un acto y «Quitar del festival»: las fichas siguen.

## Para el gestor

- **Migración `20261007100000_sugerencias_al_publicar.sql` (solo añade): aplicarla después de `20261006160000_eventos_clase.sql`**, antes de unir. Sin variables de entorno nuevas.
- **Apilada sobre #412 (y #411):** unir después de ellos.
- La lectura del cartel pide un dato más (`festival`): sin llave de la IA en el respaldo, H1 solo se probó con la lectura simulada (componentes).
