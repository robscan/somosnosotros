# 370 · «Este festival ya está publicado. ¿Es tu participación?»

**Pieza:** OL-341. **Rama:** `festival-ya-existe`, base `origin/main` (`ce3e7f11`), con `origin/main` traído antes de subir. **Fecha:** 2026-10-07. **Operador:** Claude (agente del gestor IV).
**Manda:** el caso real del 2026-10-07 (dos artistas publicaron cada uno «Electric Universe Festival», mismo título, misma fecha, mismo sitio, como eventos sueltos, y el gestor tuvo que convertirlo a mano en un festival con dos actos; founder: hay que resolverlo al publicar), el modelo de festival y actos (doc 55, `evento_padre_id`) y el canon de las sugerencias al publicar de OL-323 (bitácora 352).
**Estado:** hecho y probado con los componentes reales (Chrome) y con la app compilada contra el respaldo local con **dos cuentas** (el caso Electric Universe reproducido de punta a punta: (b), la ficha del festival resultante y (a)). Falta el iPhone del founder. **Trae una migración que solo añade; la aplica el gestor** (`20261008100000_festival_parecido.sql`). Sin ella, la sugerencia sale pero «Sí» da «No se pudo unir al festival. Intenta de nuevo.» y nada cambia.

## Qué hace

Al publicar un evento puntual por pasos, «Publicado» ya pregunta al servidor si hay algo que sugerir (OL-323). Ahora, antes que lo demás, busca **un evento visible con un título muy parecido el mismo día** (el sitio puede ser otro). Si lo hay, sale **en la misma pieza punteada** de las sugerencias de OL-323 (una sola a la vez, «Compartir» pasa a secundario, llega sin mover el foco, sin pantalla nueva ni texto de ayuda):

- **(a) Es un festival** (de cualquier cuenta, también la propia): «**Este festival ya está publicado**» · el nombre del festival · sus días · su sitio · «Programa registrado: N actividades» · «**¿Es tu participación?**» · el acto tal como entrará (punto hueco, «recién publicado») · «**Sí, publicar como parte de él**» · «**No, es otro evento**». «Sí» liga el evento como acto (`evento_padre_id`) y el festival recalcula su periodo.
- **(b) Es un evento suelto de otra cuenta**: «**Ya hay un evento igual**» · su nombre · su día · su sitio · «Publicado por otra persona» · «**¿Es el mismo?**» · «**Sí, es mi participación en él**» · «**No, es otro evento**». «Sí», en **una sola operación**, vuelve el evento existente el **marco** de un festival (`clase = 'festival'`, su mismo título, sus fechas, su sitio, su cartel, su enlace y **su autor**: el festival es de quien lo publicó primero) y liga **los dos** como actos: el existente conserva su autor, su título y su visibilidad; el nuevo entra con su nombre.
- **El nombre de la participación:** el que escribió la persona. Si es **el mismo** que el del festival (el caso real), se propone «**<artista> en <festival>**» con el primer artista de Quién («0Backside0 en Electric Universe Festival»), en un campo «Tu participación» con su ✕; vacío, el botón dice «**Falta el nombre**» (canon de formularios). Sin artista, queda el suyo y se puede cambiar.
- **Aceptada:** en el mismo sitio, la tarjeta de lo creado con borde lleno: «✓ Ya es parte del festival» (a) o «✓ Ya son parte del festival» (b), «Festival · Programa registrado: N actividades», los actos unidos por la línea y «Ver el festival». La tarjeta del evento de arriba (lo que ve la gente) y el texto de «Compartir» pasan al nombre con que quedó.
- **«No, es otro evento»** hace lo de «Ahora no»: la quita y la anota (`sugerencias.parecido = descartada`); salir sin tocarla también la anota (ignorar no es confirmar). Aceptada, salir no la anota.
- **Error al aceptar:** se dice solo en la sugerencia («No se pudo unir al festival. Intenta de nuevo.»; si la base ya no los ve iguales, «Ese evento ya cambió y no coincide con el tuyo.») y el reintento usa la misma clave (no crea dos festivales).
- **Prioridad:** el evento igual va antes que la exposición (H1/H2) y que el festival por mención (H4/H5): si ya está publicado, lo primero es no tenerlo dos veces. Solo una sugerencia a la vez.

## La regla de detección (`src/lib/sugerenciasParecido.ts`, repetida en SQL)

1. **Solo** para un evento **puntual** recién publicado, sin festival, sin la sugerencia anotada.
2. **Títulos parecidos:** normalizados (sin acentos, mayúsculas ni signos: `normalizarNombre`), **iguales o uno dentro del otro por palabras enteras** («Electric Universe Festival» está en «DJ Nova en Electric Universe Festival»; «Fest» no está en «Festival»).
3. **Falsos positivos:** el título más corto tiene que ser **distintivo**: **al menos tres palabras con contenido** (sin contar artículos, preposiciones ni conjunciones: de, del, la, las, los, el, y, e, en, con, a, al, para, por, un, una, o, u, the, of, and) **o** contener una de las **palabras de festival** (lista cerrada, palabra entera): **festival, fest, encuentro, muestra, ciclo, jornadas**. Así «Concierto», «Taller de cerámica» o «Noche de jazz» el mismo día no sugieren nada; «Rock Fest», «Ciclo Fellini» o «Electric Universe Festival», sí. Un título genérico ni siquiera consulta.
4. **El mismo día:** el día local del evento nuevo (en su zona); un festival vale si su periodo lo cubre (del día de su inicio al de su fin, contando el fin un segundo antes: «hasta las 00:00 del 13» terminó el 12); un evento suelto, si empieza ese mismo día.
5. **Candidatos:** lo que cualquiera ve en la agenda: visibles, sin borradores, puntuales o festivales, que no son ya acto de otro festival (si lo son, el candidato es ese festival). Un evento suelto **propio** no se ofrece (sería un duplicado propio, no una participación). Gana un festival sobre un evento suelto y el título idéntico sobre el que solo lo contiene.

Consulta: una sola lectura de `eventos` con lo que ya existe (`visible`, `borrador`, `clase`, `evento_padre_id`, `inicio < fin del día`, `termina ≥ inicio del día`, hasta 100), la de Quién solo si hay que proponer el nombre y la cuenta del programa solo para un festival. No hizo falta una función SQL de lectura.

## Migración `20261008100000_festival_parecido.sql` (solo añade)

Las dos acciones escriben en una fila ajena (el festival que gana un acto y recalcula su periodo; el evento de otra persona que pasa a ser acto), y el disparador de OL-321 solo deja ligar a un marco propio. Por eso son **SECURITY DEFINER acotadas**: vuelven a comprobar la misma regla, solo hacen esa transformación y no tocan `visible` de nadie ni el autor ajeno.

- `titulo_distintivo(text)` y `titulos_parecidos(text, text)`: la regla de arriba en SQL, internas (sin EXECUTE para `anon` ni `authenticated`).
- `anotar_sugerencia`: misma firma y permisos, acepta además el tipo `parecido`.
- `unir_a_festival_parecido(evento, festival, título)` → (a). El evento lo gestiona quien llama, es puntual, visible, sin borrador ni festival; el festival es visible, **no retirado por la administración** (OL-328), con título parecido al del evento (el que se publicó) y su periodo cubre el día. Entra con el nombre de la participación (vacío: el suyo) y el festival recalcula su periodo. Ligarlo otra vez no cambia nada.
- `festival_de_dos_parecidos(existente, nuevo, título, operación)` → (b). El existente es de **otra** cuenta, puntual, visible, no retirado, sin borrador ni festival; título parecido y el mismo día (cada uno en su zona). Nace el marco con id = la clave de la operación (reintentable), con lo del existente (la dirección no, si es un sitio reservado; el cartel solo si es de la app) y su `creado_por`; el existente solo cambia `evento_padre_id`; el nuevo entra con su nombre y la sugerencia aceptada; el festival recalcula su periodo. Una conversión a la vez por evento existente (bloqueo consultivo): si mientras tanto otra persona ya lo convirtió, el nuevo se une a ese festival (lo mismo que (a), con sus comprobaciones).
- Nada de lo oculto vuelve a verse: no se escribe `visible` en ninguna fila y lo retirado por la administración no es candidato ni destino. El camino directo (ligarse a un festival ajeno por la API) sigue cerrado.

## Medición (`src/lib/medir.ts`, lista cerrada)

`festival_parecido_visto`, `festival_parecido_si` y `festival_parecido_no`, cada una con un solo dato, `caso`: `festival` (a) o `evento` (b). Sin ids ni títulos. «No» se mide solo con el botón «No, es otro evento» (salir sin tocarla no es un «no»). El aviso de privacidad ya cubre «acciones sin nombre».

## Decisiones del operador (por confirmar)

1. **Un festival ajeno sí recibe actos sin que su autor lo confirme** (a). El doc 55 (§2) dejaba «un festival ajeno queda como propuesta pendiente hasta que lo confirme quien lo administra»; el encargo de esta pieza pide ligarlo, y el filtro es la regla de títulos y día (acotada en la base). Si el founder prefiere la propuesta pendiente, es otra pieza (falta ese estado en el modelo).
2. **(b) se hizo completa**, con la función SQL y sus pruebas, no solo diseñada.
3. **El festival que nace en (b) es del autor del evento existente** (el que lo publicó primero), con su cartel y su enlace; quien acepta solo aporta su acto. La administración puede pasarlo a otra cuenta como siempre.
4. **El acto existente conserva su título**, aunque sea igual al del festival (en el programa sale «Electric Universe Festival» como primer acto, captura 04): no se escribe un título ajeno. Su autor lo puede editar; proponerle «<su artista> en <festival>» sería otra sugerencia.
5. **Prioridad sobre H1/H2/H4/H5** (lo de arriba) y **festival antes que evento suelto**.
6. **Solo el título y el día** deciden; el sitio no se compara (el encargo: «el sitio puede diferir»). Un título con contenido («Lectura en voz alta», tres palabras) publicado por dos cuentas el mismo día sí sugiere (b): es la regla pedida; «No, es otro evento» lo resuelve en un toque.
7. **El nombre propuesto** usa el primer artista de Quién y solo cuando el título es idéntico; si la persona ya escribió otro («DJ Nova en Electric…»), no se le cambia ni se le enseña el campo.
8. **Un título que propone «Festival» como clase** (los que empiezan por «Festival …») se publica como festival con su programa y no pasa por esta sugerencia (el encargo es para el evento puntual). «Electric Universe Festival» propone evento (OL-323, decisión 3), así que el caso real sí pasa.
9. **No se sugiere al editar** (como OL-323: editar no tiene «Publicado»).

## Pruebas

- `npm run lint`: 0 errores (el aviso de siempre en `VisorImagen.componentes.test.mjs`). `npm run typecheck`: verde.
- `npm test`: **185 archivos, 3348 pruebas, en verde** (con `main` traído). Nuevas: `lib/sugerenciasParecido.test.ts` (palabras de festival y tres palabras con contenido; ocho títulos genéricos que no cuentan; parecidos por palabras enteras, con acentos y signos; siete que no; los días con el fin a las 00:00; el nombre propuesto; (a), (b), festival propio, otro sitio y doce casos que no sugieren: otro día, festival ya terminado, suelto propio, acto de un festival, exposición o taller, «Concierto», «Taller de cerámica», otro título, el mismo evento, uno ya en festival, un taller, ya anotada). En `app/eventos/sugerencias.acciones.test.ts`, cinco más: (b) con el artista y la consulta (visible, sin borrador, sin acto, el día en San Luis, cualquier cuenta), (a) con el programa y sin pedir Quién, un título genérico no consulta, «Sí» llama a la función que toca con el nombre, sin nombre no llega a la base y el error de la base se dice. En `lib/medir.test.ts`, las tres acciones y que no aceptan ids ni títulos.
- `npm run test:db` (PostgreSQL 17 local, las 90 migraciones en orden): **1909 pruebas, 0 fallos**. Nueva `festival-parecido.test.mjs`: la regla en SQL (y que no se llama desde la API); (b) con el caso Electric Universe (el marco de Ana con su título, sitio y enlace; el acto de Ana intacto; el de Beto con su nombre; solo nace el marco; reintento; la clave no sirve a otra cuenta); (a) con una tercera cuenta (entra al festival ajeno, el festival sigue siendo de Ana; otra vez no cambia nada; sin nombre queda el suyo); rechazos sin dejar nada: otro día, otro título, evento ajeno, `anon`, un evento suelto como festival, festival retirado por la administración (sigue oculto), dos «Concierto», otro día en (b), dos eventos propios, evento oculto por la administración (sigue oculto y suelto), un evento que ya es acto; llegar tarde se une al festival que ya nació; el camino directo por la API sigue cerrado; «No, es otro evento» anotado.
- Componentes (Playwright, Chrome de la Mac): **cuatro pruebas nuevas en `Sugerencias.componentes.test.mjs`** ((b) con el nombre propuesto, la ✕, «Falta el nombre», el nombre editado que llega a la acción y la tarjeta del evento que lo dice; (a) con el acto como entrará y sin campo; error y reintento con la misma clave, «No, es otro evento» anotado una vez; 320 sin desbordes). Suite completa `npm run test:componentes`: **523 de 523** (con `main` traído).
- `npm run inventario`: sin novedades (332 medidas en duro). `npm run medir`: 35 pantallas × 4 anchos, sin novedades (corrido otra vez después de tocar el respaldo).

## Capturas (`docs/rediseno/capturas-370/`), abiertas y descritas

De la app compilada contra el respaldo local, con dos cuentas inventadas (Marcos publica primero «Electric Universe Festival» el viernes 9 a las 7 p.m. en el Teatro de la Paz con Feleal; Ana publica lo mismo a las 8 p.m. con 0Backside0), en Chrome a 390×844 (2×):

- `01-app-b-ya-hay-un-evento-igual-390.png`: «Publicado» de Ana: la tarjeta «Electric Universe Festival · vie 9 de oct · 20:00 · Teatro de la Paz» y debajo la ficha punteada «Ya hay un evento igual · Electric Universe Festival · vie 9 de oct · Teatro de la Paz · Publicado por otra persona · ¿Es el mismo?», el campo «Tu participación» con «0Backside0 en Electric Universe Festival» y su ✕, «Sí, es mi participación en él» y «No, es otro evento»; «Crear su cartel» en línea quieta y «Compartir» en secundario.
- `02-app-b-ya-son-parte-del-festival-390.png`: tras «Sí»: la tarjeta del evento ya dice «0Backside0 en Electric Universe Festival»; la ficha con borde lleno «✓ Ya son parte del festival · Electric Universe Festival · Festival · Programa registrado: 2 actividades», los dos actos unidos por la línea («Electric Universe Festival» y «0Backside0 en Electric Universe Festival», vie 9 de oct · Teatro de la Paz) y «Ver el festival»; «Compartir» vuelve a principal.
- `03-app-ficha-del-festival-390.png`: la ficha del festival resultante: portada del cartel, «Electric Universe Festival», «Actos 2 · Costo Gratis · Sedes 1», «vie 9 de oct · Programa registrado: 2 actividades», Compartir, A mi calendario, Cómo llegar, y el «Programa» con los dos actos (19:00 y 20:00).
- `04-app-ficha-del-festival-programa-390.png`: la misma ficha más abajo: «Programa · vie 9 de oct» con los dos actos, «Programa registrado: 2 actividades», «Dónde · Teatro de la Paz» (el mapa estático no carga: el navegador de prueba no sale a internet) y «**Publicado por Marcos Ledesma**»: el festival es de quien publicó primero.
- `05-app-a-este-festival-ya-esta-publicado-390.png`: (a) Marcos publica «Cierre cósmico · Electric Universe Festival» el mismo día a las 5 p.m.: «Este festival ya está publicado · Electric Universe Festival · vie 9 de oct · festival · Teatro de la Paz · Programa registrado: 2 actividades · ¿Es tu participación?», el acto con el punto hueco «Cierre cósmico · Electric Universe Festival · vie 9 de oct · Teatro de la Paz · recién publicado» (otro título: sin campo), «Sí, publicar como parte de él» y «No, es otro evento».
- `06-app-a-ya-es-parte-del-festival-390.png`: tras «Sí»: «✓ Ya es parte del festival · Festival · Programa registrado: 3 actividades», el acto y «Ver el festival».

De los componentes reales en Chrome (1×, con la letra de la app):

- `07-b-ya-hay-un-evento-igual-320.png`: (b) a 320: la ficha punteada con el campo «Tu participación» («DJ Nova en Electric Universe…», recortado dentro del campo, con su ✕) y los dos botones, sin desbordes.

## Qué probar en el iPhone

1. Con dos cuentas, publicar el mismo título el mismo día (con un artista en Quién en la segunda): «Ya hay un evento igual», cambiar el nombre, «Sí», abrir el festival (dos actos, de la primera cuenta).
2. Con una tercera cuenta (o la primera), publicar algo con el nombre del festival dentro ese día: «Este festival ya está publicado», «Sí».
3. «No, es otro evento» y «Publicar otro» sin tocarla: no vuelve a salir para ese evento.
4. Dos «Concierto» el mismo día: nada.
5. Con el teclado abierto en «Tu participación», el campo y los botones quedan a la vista (mecanismo de OL-305; el pie de «Publicado» no lleva el botón de la sugerencia).

## Para el gestor

- **Migración `20261008100000_festival_parecido.sql` (solo añade): aplicarla después de `20261007140000_integridad_eventos.sql`** (lee `retirado_por_admin` de OL-328), antes de unir. Sin variables de entorno nuevas.
- **Hallazgo fuera de la pieza (no lo arreglé):** `slug_de_evento` corre con los permisos de quien publica y no ve las fichas ocultas, así que si la administración ocultó un evento y otra cuenta publica uno con **el mismo título y el mismo día**, el slug que calcula ya existe y la publicación falla con `eventos_slug_idx` (duplicado). Lo encontró la prueba de base de esta pieza (se ordenaron las altas para esquivarlo). Probable arreglo: que el cálculo del slug no dependa de lo que ve quien publica (SECURITY DEFINER acotado, o comprobar con la tabla entera).
- **Respaldo local:** ahora atiende **dos cuentas** (Ana por omisión; `cookieDe(MARCOS)` para la otra): la cuenta sale del token de cada petición, lo publicado queda con su autor, Quién se guarda en memoria (los artistas que existen por su id; uno nuevo por su nombre) y contesta `unir_a_festival_parecido` y `festival_de_dos_parecidos`. `npm run medir` sigue igual (solo usa la cookie de Ana).
- Sin council, workflows ni agentes; ninguna migración aplicada; nada en producción.
