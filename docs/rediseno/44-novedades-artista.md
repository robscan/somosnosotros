# 44 · Novedades del artista con reproductor incrustado

**Estado:** propuesta y prototipo, **para firma del founder**. Sin código de la app, sin migración. **OL:** OL-171 · **Bitácora:** [206](../bitacora/2026/09/206-novedades-artista.md) · **Prototipo:** [`prototipos/novedades-perfil-alta.html`](prototipos/novedades-perfil-alta.html) (pantallas nuevas conmutables, sin tocar las firmadas) · **Cola:** fila E10 de [`ops/COLA_DE_PIEZAS.md`](../ops/COLA_DE_PIEZAS.md) («novedad de obra», OL-149) y punto 5 del inventario de [`24-grafo-cultural.md`](24-grafo-cultural.md).

## Lo que pidió el founder (2026-09-24)

> «Vamos a incluir de una vez la posibilidad de que los artistas peguen un link de YouTube, Vimeo, SoundCloud, Mixcloud, Bandcamp, (sugiere más) y que se vea un reproductor incrustado de forma automática. Para que en perfil de artistas se pueda escuchar/ver el trabajo de artistas. Mas adelante estas publicaciones deben incluirse en blog cuando desarrollemos y desde ahora pueden lanzar notificaciones push a seguidores.»

## 1. Qué es una «novedad»

Una **novedad** es una publicación corta del artista: un enlace público de un sitio que ya sabe hacer su propio reproductor (video o audio), que se ve o se escucha **dentro de la ficha**, sin salir del sitio — con, si quiere, un título corto (hasta 60 letras) y una línea de texto (hasta 280). No es una obra nueva del grafo cultural ni un evento: es una entrada de una bitácora del artista, fechada, ordenada de la más nueva a la más vieja.

**Cómo se relaciona con el video de la ficha que ya existe (OL-154, doc [40](40-perfil-artista-enlace.md)d).** Hoy, cualquier enlace de YouTube o Vimeo que el artista guarda entre sus **redes** (el campo de "dónde encontrarme", hasta 8 enlaces, `lib/enlaces.ts`) se ve incrustado en un bloque «Video» de la ficha, sin fecha ni texto propio — es parte de la tarjeta de presentación, no una publicación.

**Propuesta: se quedan aparte, no se fusionan.** Tres razones:

1. **Son dos preguntas distintas.** «Redes» contesta *dónde más me encuentras* (hasta 8 enlaces, sin orden temporal, incluye Instagram, WhatsApp, sitio propio…). «Novedades» contesta *qué publiqué* (una bitácora fechada, con su propio título y texto). Meter una dentro de la otra rompería el tope de 8 (pensado para contacto, no para contenido) y quitaría la posibilidad de decir «esto es lo nuevo» con una línea propia.
2. **El aviso a seguidores tiene que ser un gesto explícito.** Si el video de «redes» disparara push, reordenar o corregir un enlace de contacto avisaría a todo el que sigue al artista por accidente. Una novedad es un botón «Publicar» aparte: el artista sabe que al tocarlo avisa.
3. **No hay nada que migrar.** El video de redes ya está en producción (OL-154) y no tiene fecha ni texto que llevarse a la tabla nueva; tocarlo es una pieza aparte, no parte de esta.

**Lo que sí conviene cuidar (para la fase 2, sin tocar código ahora):** que la ficha no lea como si hubiera "dos secciones de video" sin explicación. Propuesta de orden: las **Novedades** van primero (después de la descripción, antes de «Redes»/«Video»), porque son lo más reciente y lo que el founder quiere que se vea primero; la sección vieja de «Video» (bonus de redes) sigue donde está, debajo. Si con el tiempo se ve confuso, cabe renombrar esa sección vieja a «Enlaces» — cambio de una etiqueta, no de datos.

## 2. Proveedores

Comprobado con lo que ya sé de cada plataforma (sin navegar a ningún servicio externo, como pide el encargo); lo que no puedo confirmar sin probarlo en vivo queda marcado **a comprobar**.

| Proveedor | ¿Incrustable solo con la URL pública? | `src` que se arma | ¿Llave o cuenta? | Safari iOS en PWA | Cabe en el `sandbox` de `VideoEmbed` | Límites o cambios de política |
|---|---|---|---|---|---|---|
| **YouTube** | Sí, por regex (ya en `lib/video.ts`) | `youtube-nocookie.com/embed/<id>` | No | Sí, ya probado (bitácora 189) | Sí, ya definido | Ninguno nuevo; el dueño puede desactivar el embebido por video (poco común) |
| **Vimeo** | Sí, por regex (ya en `lib/video.ts`) | `player.vimeo.com/video/<id>` | No | Sí, ya probado | Sí, ya definido | El dueño puede restringir dominios del embebido; si lo hace, el reproductor lo dice, no nosotros |
| **SoundCloud** | Sí, por regex: la URL completa se pasa como parámetro | `w.soundcloud.com/player/?url=<URL codificada>` | No (el *widget* público no pide llave; la API con OAuth es para otra cosa, leer datos privados) | A comprobar (patrón muy usado, sin motivo conocido para fallar) | Necesita `allow-scripts` (el reproductor corre su propio JS **dentro** de su origen, no toca la página) — mismo nivel que ya usa `VideoEmbed` | Ninguno conocido; una pista privada o borrada muestra su propio aviso |
| **Mixcloud** | Sí, por regex: la ruta pública se pasa como parámetro | `mixcloud.com/widget/iframe/?feed=<ruta codificada>` | No | A comprobar | `allow-scripts`, igual que SoundCloud | Ninguno conocido |
| **Bandcamp** | **Con un paso extra:** el identificador numérico del álbum o pista **no está en la URL pública** (`artista.bandcamp.com/album/nombre`); hay que resolverlo con el **oEmbed público de Bandcamp** (`bandcamp.com/oembed?url=…`, sin llave) y **guardar el resultado**, no recalcularlo en cada visita | `bandcamp.com/EmbeddedPlayer/album=<id>/size=large/…` (el que devuelve el oEmbed) | No pide llave, pero sí una llamada del servidor al publicar (no es un cálculo local como YouTube) | A comprobar | Sí, iframe simple | El formato del HTML que devuelve el oEmbed puede cambiar; guardar solo el dato (el id), no el HTML que manda Bandcamp |
| **Spotify** *(sugerido)* | Sí, por regex: `open.spotify.com/track/<id>` → `open.spotify.com/embed/track/<id>` (igual con `album`, `episode`, `show`) | `open.spotify.com/embed/<tipo>/<id>` | No para ver/escuchar la vista previa; sin cuenta Premium sí reproduce, con límites de Spotify, no nuestros | A comprobar | Sí, iframe simple | Ninguno propio conocido; ya reconocido como red en `enlaces.ts` |
| **Deezer** *(sugerido)* | Sí, por regex: el id ya va en la URL pública | `widget.deezer.com/widget/dark/track/<id>` (o `album`/`playlist`) | No | A comprobar | Sí, iframe simple | Ninguno propio conocido; ya reconocido como red en `enlaces.ts` |
| **Apple Music** | Probablemente sí, por regex (el id va en la URL, `?i=<id>`) | `embed.music.apple.com/<país>/album/…` | No para el embebido simple | A comprobar (el formato de país en la URL varía) | Sí, iframe simple | A comprobar |
| **Tidal** | Probablemente sí, por regex (el id va en la URL) | `embed.tidal.com/tracks/<id>` | No para embeber; reproducir completo pide cuenta Tidal (limitación de ellos) | A comprobar | Sí, iframe simple | A comprobar; llega como red reconocida con OL-168 |
| **Audiomack** | Probablemente sí, por regex (artista y canción van en la URL) | `audiomack.com/embed/song/<artista>/<canción>` | No | A comprobar | Sí, iframe simple | A comprobar; llega como red reconocida con OL-168 |
| **Twitch** | Sí, pero con un dato que no viene en la URL: exige un parámetro `parent` con **nuestro propio dominio** (`somosnosotros.org`), fijo, no algo que se derive del enlace pegado | `player.twitch.tv/?video=<id>&parent=somosnosotros.org` (canal, VOD y clip usan cada uno su propio parámetro) | No, pero el `parent` es obligatorio o Twitch rechaza el embebido | A comprobar | Sí, iframe simple | El `parent` tiene que coincidir exacto con el dominio que sirve la página, incluido `www` si lo hay; llega como red reconocida con OL-168 |
| **TikTok** | **No, con el patrón de `VideoEmbed`.** Su embebido oficial pide cargar el script `embed.js` de TikTok dentro de la página para convertir el enlace en reproductor — es justo lo que la regla de seguridad de abajo prohíbe («sin scripts de terceros en la página, solo el iframe») | — | Sí, requiere su script | — | No cumple el `sandbox` mínimo (necesitaría permisos más amplios para ese script) | Meta/TikTok cambian estas políticas seguido |
| **Instagram (reel o publicación)** | Como ya dijo el doc 40b: solo una publicación suelta, por su URL de embebido (`instagram.com/p/<id>/embed/`), sin feed completo (la API que sí lee el feed exige cuenta de negocio y permiso por artista) | `instagram.com/p/<id>/embed/` | No para una publicación suelta; sí para el feed completo | A comprobar, y frágil: Meta ha cambiado esto antes sin aviso | A comprobar | Cambia sin aviso (visto en el doc 40b) |

### Lista de arranque (sin llaves, con el patrón de `VideoEmbed`)

**YouTube, Vimeo, SoundCloud, Mixcloud, Spotify, Deezer** entran de una vez: el `src` se arma por regex, igual que hoy `videoEmbedDe`, sin llamada de red al publicar. **Bandcamp** entra también (el founder lo pidió por nombre) pero con una salvedad: necesita la llamada al oEmbed público al momento de publicar para resolver el id — un paso más que los demás, aunque sigue sin costar nada ni pedir cuenta.

**Quedan para después, con lo que falta comprobar:** Apple Music, Tidal y Audiomack (patrón de `src` probable pero no probado; Tidal y Audiomack aún no son redes reconocidas hasta que cierre OL-168), Twitch (necesita fijar el parámetro `parent` con nuestro dominio, un dato nuevo que hoy ningún componente arma) e Instagram (ya quedó "después" en el doc 40 y sigue igual de frágil). **TikTok no entra**: su embebido pide un script que la regla de seguridad de esta pieza prohíbe; si más adelante aparece una forma de embeberlo con solo un `<iframe>`, se revisa aparte.

## 3. Seguridad

- **Nunca la URL cruda en el iframe.** El `src` siempre se arma en el servidor a partir de un identificador extraído y validado por regex (o, solo para Bandcamp, del id que devuelve su oEmbed), nunca de una plantilla de texto con lo que pegó la persona — el mismo principio que ya prueban las 6 pruebas de inyección de `video.test.ts`.
- **Lista blanca de dominios** para el `src` final: `youtube-nocookie.com`, `player.vimeo.com`, `w.soundcloud.com`, `mixcloud.com`, `bandcamp.com` (subdominio `*.bandcamp.com` para el que devuelve el oEmbed), `open.spotify.com`, `widget.deezer.com` — cualquier otro dominio, aunque el proveedor diga que es suyo, no se sirve.
- **`sandbox` y `allow` mínimos por proveedor**, no uno solo para todos: YouTube y Vimeo ya tienen el suyo (`allow-scripts allow-same-origin allow-presentation`, `allow="encrypted-media; picture-in-picture"`); SoundCloud y Mixcloud necesitan `allow-scripts` (su reproductor corre JS propio dentro de su origen, no toca esta página) pero no necesitan `allow-presentation` ni `picture-in-picture`; Bandcamp y Spotify/Deezer, iframe simple sin JS propio visible, sandbox más corto todavía. Se define proveedor por proveedor al construir, no un permiso de sobra "por si acaso".
- **Un enlace que deja de existir** no se comprueba de forma activa (nada de un cron que visite cada novedad): el propio proveedor muestra su "ya no existe" o "video no disponible" dentro de su marco, como ya se vio en la bitácora 189. El artista o el administrador la puede ocultar a mano si la nota.
- **Sin scripts de terceros en la página.** Lo único que se carga del proveedor es el `<iframe>`; ninguna novedad puede depender de un script suyo corriendo en `somosnosotros.org` (por eso TikTok no entra tal como está hoy).

## 4. Modelo de datos (descripción, sin SQL)

Tabla **`novedades_artista`**. La migración que solo añade ya tiene nombre reservado: `supabase/migrations/20260925100000_novedades_artista.sql` — **no se escribe en esta pieza.**

| Campo | Qué guarda |
|---|---|
| `id` | Identificador de la fila |
| `artista_id` | A qué ficha pertenece (referencia a `artistas`, se borra si se borra el artista) |
| `url` | El enlace ya reconocido por `reconocerEnlace` (mismo `lib/enlaces.ts`, sin tocarlo) — normalizado, nunca el texto crudo tal cual lo pegó la persona |
| `proveedor` | Uno de la lista blanca de esta pieza (no cualquier red de `enlaces.ts`: Instagram, Facebook o WhatsApp no encajan aquí) |
| `src` armado o no guardado | Para YouTube, Vimeo, SoundCloud, Mixcloud, Spotify y Deezer, **no se guarda nada**: se calcula en cada visita con la misma regla que hoy `videoEmbedDe`. Solo para Bandcamp se guarda el id que devolvió el oEmbed al publicar, porque no se puede recalcular desde la URL sola |
| `titulo` | Texto corto, opcional, hasta 60 letras |
| `texto` | Una línea, opcional, hasta 280 letras |
| `creado_en` | Fecha y hora de la publicación (la pone el servidor, no quien publica) |
| `visible` | `true` por defecto; el administrador la pone en `false` para ocultarla sin borrarla |
| `publicado_por` | La cuenta que la publicó (la pone el servidor con la sesión de quien manda el formulario, no un dato que se reciba del cliente — mismo patrón que `cambiado_por` de `ajustes_sitio`) |

**RLS (mismo patrón que `artistas`/`artistas_cuentas`, reusando la función que ya existe `gestiona_artista(artista_id)`, sin tocarla ni duplicarla):**

- **Publica** quien gestiona la ficha: autor del artista, cuenta ligada (`artistas_cuentas`) o administración — igual que hoy edita la ficha.
- **Ve** todo el mundo lo que está `visible = true`; quien gestiona la ficha y la administración también ven lo oculto (para saber qué se ocultó y por qué, igual que otras fichas).
- **Oculta** solo la administración (cambia `visible` a `false`), igual que hoy oculta cualquier otra cosa.
- *Pendiente de decidir (ver §8):* si quien gestiona la ficha puede **borrar** su propia novedad (no solo el admin ocultarla) — la regla general del proyecto («todo lo publicado… se puede corregir o borrar por su autor», `DEFINICION.md`) apunta a que sí, pero el encargo solo pidió el verbo "oculta" para el admin.

**Tope, propuesto (mismo espíritu que el tope de lecturas de cartel, doc 23: un fusible, no un ahorro):**

- **5 novedades por artista y por día.** Nadie que publique de verdad llega ahí; frena un accidente (pegar el mismo enlace varias veces, un doble toque). No hace falta pedir "más capacidad" como en el tope de cartel: si alguna vez un artista lo topa de verdad, es una conversación con el admin, no un flujo dentro de la app.
- **Sin tope total** por ahora: la bitácora completa del artista queda, ordenada por fecha.

**Orden en la ficha:** más nueva arriba. Se muestran las **3 más recientes**; un botón «Ver más» destapa el resto (sin paginar más allá: con el volumen esperado, no hace falta).

## 5. Aviso push a seguidores

Sigue la regla ya firmada del doc [28](28-avisos-y-boletin.md) (L44): **solo push y dentro de la app, nunca correo por cada novedad** — el founder ya eliminó los avisos por evento al correo el 2026-09-23; una novedad de artista es el mismo tipo de aviso frecuente que ese correo estaba pensado para evitar.

- **A quién llega:** seguidores del artista (tabla de seguidos que ya existe) que tienen avisos activos en su teléfono (la palanca "En el teléfono" de Ajustes). Quien solo tiene avisos por correo no lo recibe por correo; lo ve al abrir Novedades dentro de la app, como cualquier otro aviso de L44.
- **Agrupado:** si el artista publica varias novedades el mismo día, **un solo push por ficha y por día** (misma regla que ya usa L44 para "lo siguen"), con la más reciente.
- **Texto propuesto, para firma:**
  - **Título:** `{artista} publicó una novedad`
  - **Cuerpo:** `{título}` si el artista puso título; si no, `Nuevo en {proveedor}` (p. ej. "Nuevo en SoundCloud")
  - Leído junto en la pantalla de bloqueo (título arriba, cuerpo abajo), dice exactamente lo que pidió el founder: **«{artista} publicó una novedad: {título}»**.
  - Abre la ficha del artista, con la novedad a la vista.
- **Ningún envío real** en esta pieza ni en las pruebas: solo el texto, para firma, y el mecanismo (fase 3, §7).

## 6. Blog después (E10)

Lo que ya guarda la novedad **sin migrar nada** el día que se construya el blog: el tipo de contenido (una fila de `novedades_artista` **es** un contenido de tipo "novedad", no hace falta una columna nueva para decirlo), la fecha (`creado_en`), el autor (el artista, vía `artista_id`, y quién la publicó, vía `publicado_por`), el título y el texto. El blog leería estas filas visibles, ordenadas por fecha, como su primer tipo de contenido.

**Lo que NO se construye ahora:** ninguna URL propia por novedad (hoy vive solo dentro de la ficha del artista, sin dirección propia), sin comentarios, sin categorías ni etiquetas, sin editor de texto enriquecido (solo el título y el texto plano de hoy), sin RSS, sin portada ni imagen propia más allá del reproductor incrustado, sin edición después de publicar (alcanza con publicar + ocultar).

## 7. Fases de construcción

Una por una, cada una con su prueba en el iPhone del founder (Safari), como manda `CLAUDE.md`.

1. **Modelo y migración + alta desde el perfil del artista, con un proveedor.** La migración `20260925100000_novedades_artista.sql` (tabla, RLS, tope); el formulario "Publicar novedad" desde Mi perfil → Mis artistas, con un solo proveedor para probar el camino completo (propuesta: YouTube, ya conocido). **Prueba:** el artista pega un enlace de YouTube reconocido, lo publica con título y texto, y la fila queda guardada, visible, con el `proveedor` y la fecha correctos; el tope de 5 al día rechaza la sexta.
2. **Reproductor en la ficha, con la lista de arranque completa.** YouTube, Vimeo, SoundCloud, Mixcloud, Spotify, Deezer y Bandcamp incrustados de verdad, en orden de más nueva a más vieja, con "Ver más" a partir de la cuarta. **Prueba:** una novedad de cada proveedor de la lista de arranque se ve o se escucha dentro de la ficha, sin salir del sitio, en Safari del iPhone del founder; capturas 390×844.
3. **Push a seguidores.** El envío agrupado (un push por ficha y por día) con el texto de §5. **Prueba:** publicar dos novedades el mismo día genera un solo push, con cuentas de prueba del equipo, sin llegar a seguidores reales; capturas de cómo se ve el aviso.

## 8. Decisiones que el founder debe firmar

1. **El video de la ficha (OL-154) y las novedades se quedan aparte** (§1) — o prefiere fusionarlos de otra forma.
2. **La lista de arranque de proveedores:** YouTube, Vimeo, SoundCloud, Mixcloud, Spotify, Deezer y Bandcamp; el resto espera a comprobarse (§2).
3. **Los números del tope:** 5 novedades por artista y por día, 3 visibles en la ficha antes de «Ver más» (§4).
4. **Quién puede borrar** una novedad propia, no solo ocultarla el admin: ¿el que gestiona la ficha, como con el resto de lo publicado, o solo el admin oculta y nadie borra? (§4).
5. **El texto del push** de §5: título, cuerpo y su versión sin título.
6. **Bandcamp entra en la fase 2 con el resto** aunque necesite un paso de más (llamada al oEmbed al publicar), o se deja para una fase aparte por ese motivo (§2).
