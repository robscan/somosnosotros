# 497 · Publicar en redes en segundo plano: cola, aviso al terminar y sin duplicados (OL-465)

**Fecha:** 2026-10-28. **Rama:** `redes-en-cola`, base `origin/main` (`bd2119b5`, con OL-464 unido). **Operador:** agente de la pieza (Gestor
VII), sin otros agentes. **Estado:** en código, espera la revisión del gestor y una prueba real en producción. **Migración
`20261028140000_redes_en_cola.sql`** (solo añade). Sin variables nuevas (usa `CRON_SECRET`, la llave de servicio, `INSTAGRAM_TOKEN`,
`FACEBOOK_PAGE_ID` y las llaves de push que ya están). Capturas: `docs/rediseno/capturas-497/`.

## El pedido

- Founder, 28 de octubre: «Se tarda bastante en publicar y creo que es porque me salí de la app. ¿Tenemos posibilidad de que la publicación en
  insta, el análisis de carteles y subida de imágenes se pueda realizar en segundo plano y que avise cuando se terminó?». Ese día publicó
  «Cultura Mística» dos veces seguidas (20:10 y 20:11) porque la hoja no respondía.
- Encargo del gestor: una cola (la acción guarda el trabajo y responde en menos de 1 s; la hoja se cierra y el renglón dice «Publicando…»); quien
  trabaja es el latido de Supabase con el reclamo sin carreras del motor; reintentos ante lo pasajero; el aviso al teléfono al terminar; sin
  duplicados (15 minutos); revisar si la lectura del cartel bloquea el alta; la carga desde la Mac (`aceptar-corrida`) igual.

## Por qué tardaba y salió dos veces

La acción de «Publicar» hacía todo mientras la hoja esperaba: dibujar el JPEG (y en un carrusel, uno por cartel), subirlo, crear cada contenedor
en Instagram, esperar a que Instagram diga FINISHED (hasta 30 s por imagen), publicar y luego espejar en Facebook. Un festival con 10 carteles
son decenas de segundos. Con la app en segundo plano, iOS congela la página: la respuesta no llega, la hoja sigue en «Publicando…» y un segundo
toque manda otra publicación completa. Nada en la base lo impedía.

## Qué se hizo

### Base (migración `20261028140000_redes_en_cola.sql`, solo añade; banco `supabase/tests/pg/redes-en-cola.test.mjs`)

- **`redes_trabajos`**: la cola. Evento, red (`instagram`, que puede llevar «También en Facebook», o `facebook`: espejar lo que ya está en
  Instagram), formato pedido (4x5 o 9x16; con varias imágenes sale carrusel), `pedido` (todo lo decidido en la hoja: recorte, diseño, texto,
  etiquetas quitadas, imágenes y su orden, Facebook), estado (`en_cola` → `publicando` → `publicado` | `fallido`), `avance` (las imágenes
  subidas y la publicación de Instagram ya hecha, para no repetir nada si se retoma), `resultado` (enlaces, cuántas imágenes, cómo quedó
  Facebook), `intentos`, `fallos`, el último `error`, `turno` y `ocupada_hasta` (el reclamo), `siguiente_en` (la espera entre reintentos),
  `avisado_en`, quién lo pidió y cuándo (los pone la base). Solo la administración la lee; nadie la escribe desde la app.
- **`redes_encolar(evento, red, formato, pedido, repetir)`**: la única entrada desde la app. Comprueba que es la administración, que el evento
  existe y que no está repetido; un candado por evento y red (`pg_advisory_xact_lock`) pone en fila dos toques a la vez, así el segundo ve el
  primero. Repetido y sin `repetir`: devuelve `{ duplicado }` sin guardar.
- **`redes_reciente(evento, red, formato)`**: en cola o publicándose (para Facebook, también un trabajo de Instagram con «También en
  Facebook») → `publicando`; publicado en los últimos 15 minutos (`instagram_publicaciones` o `facebook_publicaciones`; un carrusel cuenta
  como 4:5) → `publicado` con los minutos. Solo responde a la administración.
- **`redes_latido()`** y `redes_vivos()`: como `rutinas_latido` (OL-444) pero para la cola: si hay trabajos listos (en cola y ya les toca, o
  publicándose con `ocupada_hasta` vencido) llama a `/api/redes/correr` con `pg_net` y el secreto de Vault (la dirección sale de `redes_url` o de
  `avisos_url` cambiando la ruta). `pg_cron` la corre cada minuto (**`redes-latido`**) si está instalada. Para pausarlo:
  `select cron.unschedule('redes-latido');`
- **`cartel_lecturas`**: lo que salió de leer un cartel (por persona e imagen). Cada quien ve las suyas; solo el servidor escribe.
- Banco (45 comprobaciones): guardar y quién; una cuenta cualquiera y un visitante no; red, formato y pedido inválidos; la administración no
  inserta ni cambia directo; duplicados (en cola, otro formato, otro evento, Facebook con el de Instagram, confirmar, carrusel de hace 0 y 7
  minutos, después de 15 minutos no; Facebook igual); **dos toques a la vez desde dos conexiones guardan uno solo**; los `check`; el reclamo
  por turno; el latido (sin trabajos, sin Vault, la dirección y el secreto, la espera del reintento, ocupado y caído, dirección ajena); las
  lecturas de cartel; definer, `search_path` vacío y sin visitantes.

### El trabajador (`src/lib/redes/`, `src/app/api/redes/correr`)

- **`/api/redes/correr`** (300 s, como la ruta del motor; la misma atención, `atenderCorrer`: 401 sin `CRON_SECRET`, 202 enseguida y el
  trabajo después de responder con `after()`). La piden el latido de Supabase cada minuto y **la acción de publicar, con `after()`, para
  empezar de inmediato** (`dispararPaso` con la ruta nueva; ya lo hacía la hoja «Correr» de las rutinas).
- **`cola.ts`**: `reclamarTrabajo` con el truco del motor (`update … where id and estado and turno = <leído> returning`: de dos llamadas solo una
  lo toma; uno «publicando» con `ocupada_hasta` vencido se retoma y cuenta como fallo), `guardarAvance`, `devolverACola`, `terminar` y
  `marcarAvisado` (una vez), siempre con su turno.
- **`trabajar.ts`** · `correrUnTrabajo`, por pasos y guardando el avance: **1 · imágenes** (lo de antes: el cartel encajado o el diseño de
  Crear cartel y, en un carrusel, el cartel de cada acto; JPEG públicos en Storage), **2 · Instagram** (una imagen, una historia o el carrusel;
  antes, el cupo del día; se anota en `instagram_publicaciones` a nombre de quien lo pidió), **3 · Facebook** si se pidió (la misma imagen o las
  mismas fotos; se anota en `facebook_publicaciones`). Antes de publicar vuelve a comprobar que el evento sigue por venir y que el texto cabe. Un
  paso que no cabe en lo que le queda a la función se deja para la siguiente llamada (sin contar como fallo).
- **Reintentos** (`reglas.ts`): lo pasajero («imagen»: Instagram procesando o rechazando la imagen; «otro»: sin respuesta, un 5xx, la red) se
  reintenta **hasta 3 veces, a los 1, 3 y 7 minutos**; el cupo, el permiso, «ya empezó» y el texto, no. **Si Instagram ya salió y falla
  Facebook, Instagram nunca se repite**: solo se reintenta Facebook y, si no se logra, el trabajo queda `publicado` con «Facebook: …» (y su
  fila de error, para «Reintentar en Facebook»). Un fallo de Instagram se anota en `instagram_publicaciones` solo al final (no en cada reintento).
- **El aviso** (`herramientas.ts` · `avisarAlTelefono`): al teléfono de quien tocó «Publicar», por Web Push y por la app de iPhone (APNs), con
  lo que ya existe (`enviarPush`). «Publicado · Se publicó en Instagram y Facebook · Cultura Mística», «Se publicó en Instagram · … Facebook:
  falta el permiso de la página de Facebook.», «Se publicó en Facebook · …» o «No se publicó · No se pudo publicar Cultura Mística: hoy ya van 100
  publicaciones en Instagram.». Abre `/admin/instagram?evento=<id>` (la hoja de ese evento con sus «Ver»). Sin suscripciones, sin llaves o con
  los avisos al teléfono apagados, no truena ni manda nada.
- `cargarParaCartel` acepta `como: { perfilId }` (el trabajador no tiene sesión y dibuja el diseño sin cartel de quien pidió publicar).

### Las acciones y las pantallas

- **`publicarEnInstagram`** comprueba al momento lo barato (administración, que sigue por venir —sin bajar carteles— y el texto) y guarda el
  trabajo con `redes_encolar`; responde `{ ok, id }`, `{ duplicado }` o el error. **`publicarEnFacebook`** («Reintentar en Facebook» y
  «Publicar en Facebook» de la lista), igual, a la cola. **`estadoTrabajo(id)`** para que la hoja pregunte. `prepararInstagram` suma el último
  trabajo del evento (24 h) y si cada formato está en camino o recién salió.
- **La hoja** (`HojaInstagram`, las mismas piezas): «Publicar» → la hoja **se cierra** y la lista se refresca; la nota bajo la casilla suma «Te
  avisamos en el teléfono cuando termine.». Al abrirla otra vez: mientras va, «Instagram: publicando…» y «Facebook: después de Instagram» (`admin/hecho`
  con el icono en gris) y «Te avisamos en el teléfono cuando termine. Puedes cerrar la hoja o salir de la app.»; publicado, las dos líneas con sus
  «Ver» (como antes); Facebook fallido, su error llano y el enlace «Reintentar en Facebook»; no publicado, el aviso en rojo. Mientras va, pregunta
  cada 20 s (solo con la pantalla a la vista) y al volver a la app.
- **Sin duplicados**: si ese evento con ese formato está en camino o salió hace menos de 15 minutos, el botón dice **«Se está publicando»** o
  **«Ya se publicó hace 3 min»** («hace un momento»); el primer toque solo pregunta («Este evento ya se está publicando. ¿Publicarlo otra
  vez?» con «Mejor no») y el botón pasa a **«Sí, publicar otra vez»**. Lo mismo para Facebook (en la lista, la línea del renglón pregunta y el
  botón pasa a «Publicar otra vez en Facebook: …»). La base lo vuelve a comprobar al guardar.
- **La lista**: el renglón dice «Publicando…» (o «Facebook: publicando…», sin el botón) mientras está en la cola, y «No se publicó: Instagram no
  aceptó la imagen» si falló en las últimas 24 h y no salió después (`colaPorEvento.ts`). Se refresca sola cada 20 s mientras haya algo en camino
  y al volver a la app; sin nada en camino, no.
- **La ficha**: en el «···», «Publicar en Instagram · Publicando…» mientras va.

### La lectura del cartel al dar de alta (punto 5 del encargo)

**Sí bloquea**: el alta espera en «Leyendo el cartel…» hasta que la API responde, porque lo leído decide qué se pregunta (lo firmado: con todo
leído, directo a «Revisa»). Si el teléfono se va a otra app a media lectura, la respuesta se pierde y el alta seguía como «no pude leerlo»
aunque el servidor sí la terminara (y descontara la lectura). Para **no cambiar el flujo firmado**, la lectura no se manda a la cola: sigue en
la acción de siempre, pero ahora **termina aunque nadie espere** (`after()`) y **deja lo leído en `cartel_lecturas`**; si la respuesta se
pierde, la pantalla de espera pregunta cada 3 s (solo con la pantalla a la vista; al volver a la app, en seguida, hasta 90 s) con
`lecturaGuardada` y sigue como si hubiera esperado. Sin nada guardado, el corte es el de siempre. No hay aviso al teléfono para la lectura.

La **subida del cartel** desde el teléfono sigue siendo del teléfono (Safari no sube en segundo plano); es corta y su corte ya se dice («Se
cortó a la mitad»). Las imágenes de Instagram, que eran lo pesado, ahora las hace el servidor.

`aceptar-corrida` (la carga desde la Mac) no cambia.

### Respaldo local

`redes_trabajos` y `cartel_lecturas` en memoria, `redes_reciente` y `redes_encolar` con la regla de la base; el trabajador de verdad
contra la API de mentira; `/__lento?ms=` (Instagram tarda en `media_publish`) y `/__falla-instagram?clave=` sin reiniciar.
`scripts/ops/auditoria-ui/capturar-redes-en-cola.mjs` recorre todo con la app compilada y Chrome real.

## Comprobado

- `npm run lint` (0 errores; los 2 avisos son de archivos ajenos), `npm run typecheck`, `npm test` (**4 808** en 297 archivos; nuevas:
  `src/lib/redes/reglas.test.ts` —qué se reintenta y cuánto se espera, los textos del botón, de la pregunta y del aviso—,
  `src/lib/redes/trabajar.test.ts` —**el reclamo sin carreras con dos llamadas a la vez**, los tres pasos con su avance, **los reintentos a 1, 3 y
  7 minutos y el cuarto fallo**, el cupo y el permiso sin reintento, «ya empezó», **Facebook fallido después de Instagram sin repetir Instagram**,
  Facebook sin permiso, el paso que no cabe, el carrusel, «Publicar en Facebook» y el ya publicado, el trabajo que se cae una y otra vez, **el
  aviso una sola vez**—, la ruta hermana de `dispararPaso`, y la lectura que se anota y se recoge en `cupo.acciones.test.ts`).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 117 migraciones, **2 632 pruebas, 0 fallaron**.
- `npm run test:componentes`: **744 de 744**. Con toques reales: `EspejoFacebook.componentes.test.mjs` (9; la API falsa con su cola y un latido
  simulado): la casilla; **Publicar → la hoja se cierra → «Publicando…» → latido → «Ya en Instagram» con «Facebook: publicado»**; la hoja
  con lo que pasó y sus «Ver»; **«Ya se publicó hace 3 min» pide confirmar y «Sí, publicar otra vez» manda `repetir`**; «Se está publicando» y
  «Mejor no»; **con el reloj de Playwright, la hoja pregunta a los 20 s (no a los 19) y la lista se refresca a los 20 s y deja de hacerlo sin
  nada en camino**; Facebook fallido y «Reintentar en Facebook» a la cola; lo que no se pudo; «Publicar en Facebook» desde la lista; Facebook
  recién publicado pide confirmar. `HojaCarrusel` (5) y `HojaFestival` (3): publicar manda lo mismo y la hoja se cierra. `AltaEvento`: dos nuevas
  (la lectura cuya respuesta se pierde se recoge y sigue a «Revisa» con lo leído; sin nada guardado, «no pude leerlo»).
- `npm run inventario`: sin novedades. `npm run medir`: 60 pantallas × 4 anchos; s46 (la lista, 121 nodos) y s47 (la hoja, 154) sin cambio; un
  tiempo de espera de carga de Inicio a 1280 en la corrida entera que no se repite al medirla sola (`--solo=s01-inicio`: sin novedades).
  `npm run build` en verde.
- **Recorrido en la app** (`node scripts/ops/auditoria-ui/capturar-redes-en-cola.mjs . docs/rediseno/capturas-497`, Chrome real, la app compilada
  contra el respaldo, el trabajador de verdad y las APIs de mentira): **todo bien, sin errores de página ni de consola**. «Publicar» responde y
  **la hoja se cierra en 81 ms**; el renglón dice «Publicando…»; la hoja mientras va; confirmar repetir (48 de alto); al terminar, «Ya en
  Instagram» con «Facebook: publicado» y **una sola publicación en Instagram**; la hoja con sus «Ver» y «Ya se publicó hace un momento»; el «···»
  de la ficha con «Publicando…»; Facebook sin permiso y su reintento desde la cola; Instagram sin permiso: «No se publicó» en el renglón y en la
  hoja, y publicar otra vez sin preguntar; **a 320, 390 y 430 sin textos cortados ni desplazamiento a lo ancho**.

## Capturas (`docs/rediseno/capturas-497/`, 390 × 844, cada una abierta)

- `01-hoja-antes`: Delirium Pollum, abajo de la hoja: la etiqueta, la ubicación, el texto, «También en Facebook» marcada y «Se publica en
  @smsnstrsapp y en su página de Facebook. Te avisamos en el teléfono cuando termine.»; el botón «Publicar».
- `02-lista-publicando`: la lista con la hoja ya cerrada: el renglón de Delirium Pollum dice «Publicando…» donde iba su señal.
- `03-hoja-mientras-va`: la hoja otra vez: el diseño, «Instagram: publicando…» y «Facebook: después de Instagram» (iconos en gris), «Te avisamos
  en el teléfono cuando termine. Puedes cerrar la hoja o salir de la app.» y el botón «Se está publicando».
- `04-confirmar-repetir`: tras tocarlo: «Este evento ya se está publicando. ¿Publicarlo otra vez?», «Mejor no» y el botón «Sí, publicar otra vez».
- `05-lista-publicado`: al terminar, «Ya en Instagram · 2»: Delirium Pollum con «Publicación · Hoy, 10:00 am» y «Facebook: publicado» (sin botón).
- `06-hoja-publicado`: la hoja: «Instagram: publicado · Ver» y «Facebook: publicado · Ver» (verde) y el botón «Ya se publicó hace un momento».
- `07-confirmar-ya-publicado`: «Este evento se publicó hace un momento. ¿Publicarlo otra vez?», «Mejor no» y «Sí, publicar otra vez».
- `08-ficha-menu-publicando`: Macario, el «···» de la ficha: «Publicar en Instagram · Publicando…» después de «Destacar».
- `09-hoja-facebook-falta-permiso`: LXS COLOCAOS: «Instagram: publicado · Ver», «Facebook: falta permiso» (rojo), la frase llana y el enlace
  «Reintentar en Facebook».
- `10-lista-facebook-reintentado`: «Ya en Instagram · 4»: LXS COLOCAOS con «Facebook: publicado» tras el reintento; Macario (publicado sin la
  casilla) y Susurros con «Facebook: sin publicar» y su botón.
- `11-lista-no-se-publico`: «Para publicar · 8»: la Charla de la Cristiada con «No se publicó: hay que volver a conectar la cuenta de Instagram»
  en dos líneas, sin cortes.
- `12-hoja-no-se-publico`: su hoja con el aviso en rojo («Instagram ya no nos deja publicar en @smsnstrsapp: hay que volver a conectar la cuenta
  desde su página de Facebook. No se publicó nada.») y el botón «Publicar».

## Decisiones por confirmar (founder o gestor)

1. **Un latido propio** (`redes-latido`, cada minuto) en vez de cambiar `rutinas_latido`: la migración solo añade y se pausa por separado.
2. **El aviso abre la hoja del evento en la lista**, no la publicación en Instagram: abrir instagram.com dentro de la app instalada la saca de la
   app. La hoja lleva los «Ver».
3. **Reintentos**: 3, a los 1, 3 y 7 minutos. «imagen» cuenta como pasajero (Instagram a veces tarda en procesarla): una imagen que de verdad no
   sirve se da por perdida a los ~11 minutos, no al instante.
4. **«Se está publicando» deja repetir confirmando**, como pedía el encargo. Otra opción: no dejar repetir mientras va.
5. **El aviso va a quien tocó «Publicar»** (no a toda la administración) y respeta sus avisos al teléfono apagados.
6. **La lectura del cartel no va a la cola** (cambiaría el flujo firmado): termina sola y se recoge al volver, hasta 90 s con la pantalla a la
   vista. Sin aviso al teléfono para la lectura. `cartel_lecturas` no se limpia sola (una fila chica por cartel leído); proponer una purga si
   crece.
7. La hoja enseña el último trabajo del evento de las últimas 24 horas.

## Lo que el gestor debe probar en producción

1. Aplicar la migración `20261028140000_redes_en_cola.sql` antes de unir. Comprobar que quedó el trabajo de pg_cron:
   `select jobname, schedule from cron.job where jobname = 'redes-latido';` (si no, `select cron.schedule('redes-latido', '* * * * *', 'select public.redes_latido()');`).
   No hace falta nada en Vault: usa `avisos_url` y el mismo secreto que el latido de las rutinas.
2. Administración › Instagram, un evento con «También en Facebook»: «Publicar». La hoja debe cerrarse al momento y el renglón decir
   «Publicando…». **Salir de la app**. Al minuto (o antes) debe llegar el aviso «Se publicó en Instagram y Facebook · <título>»; tocarlo abre la
   hoja con los dos «Ver».
3. Tocar «Publicar» otra vez sobre el mismo evento: debe decir «Ya se publicó hace N min» y pedir confirmar (no repetir).
4. En Supabase: `select estado, intentos, fallos, error, resultado, avisado_en from redes_trabajos order by creado_en desc limit 5;`
   (sin el token: solo claves).
5. Dar de alta un evento con cartel y, mientras dice «Leyendo el cartel…», irse a otra app y volver: debe seguir con lo leído.
6. Si algo se atora: `select public.redes_vivos();` cuenta lo que espera; `select cron.unschedule('redes-latido');` lo pausa.
