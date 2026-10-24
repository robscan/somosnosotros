# 490 · Publicar en Instagram desde Administración: prototipo, firma y código (OL-458)

**Fecha:** 2026-10-23. **Rama:** `admin-instagram`, base `origin/main` (`063b8643`). **Operador:** agente de la pieza (Gestor VII), sin otros
agentes. **Estado:** **firmado por el founder y en código**; espera la revisión del gestor y una publicación real de prueba en producción. Prototipo:
`docs/rediseno/prototipos/admin-instagram.html`. Capturas: `docs/rediseno/capturas-490/` (36 del prototipo y 18 `codigo-*`). **Migración
`20261023140000_instagram.sql`** (solo añade). Variables: `INSTAGRAM_TOKEN` e `INSTAGRAM_USER_ID` (ya están en Vercel, producción y preview; nunca en
git). La primera parte de esta bitácora es el prototipo; la del código está al final («Firmado y en código»).

## El pedido

- Founder, 21 de octubre: una cuenta de la marca, **@smsnstrsapp** («Somos Nosotrxs»), para «publicar los eventos seleccionados, populares o
  impulsados». Ya está conectada a la API oficial por su página de Facebook (secretos `INSTAGRAM_TOKEN` e `INSTAGRAM_USER_ID` en Vercel).
- Founder, 23 de octubre (reglas de la pieza): reutilizar lo firmado del front y de Administración (OL-456/457), nada de maquetas nuevas salvo lo
  indispensable, sin textos cortados, toques de 44, UX invisible, una sola cosa a la vez.
- Founder, a media pieza (por el gestor): «que en la publicación se etiquete el lugar y los artistas que tengamos agregados y además se señale la
  ciudad»; «en el texto invita a seguir la página y entrar a la app»; «cuida que se sugieran solo eventos futuros».

## Sobre la pantalla real

- `maqueta-pantalla.mjs` guarda dos pantallas más con la cuenta de administración del respaldo: la lista de Eventos con su hoja de ciudades
  (`admin-eventos-hoja-ciudad`) y la ficha de un evento con su «···» abierto (`admin-evento-menu`, paso nuevo `menu-acciones`). Crear cartel no se
  pudo guardar: con el respaldo su página responde «Esto ya no está» (lo dice el script).
- `prototipo/meter-maqueta.mjs` suma `--cuerpos=a,b`: el `<body>` entero de esas maquetas, por id, en la marca `/*@CUERPOS*/` (las imágenes de
  más de 60 KB recomprimidas a 720 de ancho, los `action` de React fuera). Así la ficha del evento y el panel de la ciudad son los de producción y
  no un dibujo. Uso: `--pantallas=admin,admin-personas,admin-eventos,admin-eventos-hoja-ciudad,admin-evento-menu,admin-ciudad
  --cuerpos=admin-evento-menu,admin-ciudad`. Los prototipos anteriores no cambian (sin `--cuerpos` no se toca nada).
- **Las imágenes son reales.** Los carteles del respaldo (`imagenes.json`) encajados a 4:5 y 9:16 con sharp (`fit: contain` sobre su color
  dominante; y `cover` para «Recortar»), y los diseños sin foto de **Crear cartel** dibujados con su propio código (`dibujarCartel` con las
  plantillas `tipo-franja` y `tipo-fecha`, por una prueba de vitest temporal que se borró). Van dentro del prototipo en `/*@FOTOS*/` (46, 760 KB).
  Prototipo: 1,9 MB.
- Con una hoja abierta, lo de detrás queda inerte, como en la app (`lib/bloqueoFondo`).

## Las pantallas

| | Pantalla | Qué lleva |
|---|---|---|
| A | **Portada** | La de hoy con un grupo más después de Gestionar: **«Instagram»**, un renglón de Ajustes con la cuenta, «3 publicadas esta semana · 7 por publicar en San Luis Potosí» y su chevron. |
| B | **Lista** | Barra con título «Instagram» (Atrás a Administración); `ui/Cabecera` con el chip de ciudad y su hoja «Ciudades con eventos» (la de OL-456, con «Todas las ciudades»); la línea de cuenta «10 eventos en los próximos 7 días · 3 ya en Instagram»; `ui/Grupo` **«Para publicar · 7»** en orden de señal y **«Ya en Instagram · 3»** con su tipo y cuándo. Cada renglón es el de las listas (foto de 56): cuándo, dónde (parte renglón, nunca se corta) y por qué está arriba («Destacado · 31 van · 54 les interesa», «Sin cartel · …»). Variantes: todas las ciudades, Ciudad de México. |
| C | **Vista previa** (hoja) | `ui/Hoja` «Publicar en Instagram»: chips **Publicación 4:5 · Historia 9:16** (los de «Así queda» de Crear cartel); la imagen tal cual saldrá; la línea de lo que se hizo con el cartel con su opción como enlace («Va completo, con margen de su color. **Recortar**» o «Sin cartel: un diseño de Crear cartel. **Otro diseño**»); **las etiquetas** como chips con ✕; **la ubicación**; el texto en `ui/CampoLargo` con el contador; «Se publica en @smsnstrsapp.»; un solo botón **«Publicar en Instagram»**. En historia: «Las historias no llevan texto y duran 24 horas», sin campo de texto ni ubicación. |
| D | **Al publicar** | «Publicando…» (botón quieto, la hoja no se cierra); publicado (la imagen, `admin/hecho` «Publicado en @smsnstrsapp» con «Ver en Instagram» y «Listo»; el renglón baja a «Ya en Instagram»); tres errores en `.aviso-error`; y **«ya empezó»**: si el evento empieza mientras se prepara, aviso y el botón «Ya empezó», quieto. |
| E | **Ficha** | La de producción tal cual; en su «···», **«Publicar en Instagram · En @smsnstrsapp»** después de «Destacar». Abre la misma hoja con el cartel de la ficha. Un evento que ya pasó no trae ese renglón. |
| F | **Ubicación** | El panel de una ciudad (la maqueta de Oaxaca tal cual) con un renglón más, **«Ubicación en Instagram»** («Falta: sus publicaciones salen sin ubicación»), que abre una hoja con `ui/Campo` y su ✕ para pegar el enlace de la página de Facebook de la ciudad; «Falta el enlace» o «Guardar». |
| 1280 | **Escritorio** | La lista en la columna de Administración y la hoja centrada. |

## Qué pieza existente se reutiliza en cada cosa

- Portada: el grupo (`admin/grupo`) y el renglón de Ajustes (`ui/Renglon` `.ajuste`), como Grafo, Ciudades y Showcase.
- Lista: `ui/Barra` con título, `ui/Cabecera` con el chip de ciudad (`ui/Chip` contexto) y la hoja de ciudades (`Ciudad`), `Lista` `.conteo`,
  `ui/Grupo` y el renglón de lista (`.lista` / `.frente` / `.foto`, con `.envuelve` en las líneas largas). Sin buscador ni Filtros: son pocos y ya
  vienen ordenados.
- Hoja: `ui/Hoja` con título y pie; `ui/Chip` (formato; «quitar» con ✕ para las etiquetas, en una fila que envuelve); `ui/CampoLargo` con
  `ui/ContadorCaracteres`; `ui/Boton` (primario; «Listo», secundario); `admin/enlace` (Recortar, Otro diseño, Volver a etiquetar, Ponerla, Ver en
  Instagram); `admin/hecho`; `.aviso-error`.
- Ficha: la de producción con un `<li>` más en `ui/MenuAcciones`.
- Ubicación: el renglón de Ajustes en el panel de Ciudades y `ui/Hoja` con `ui/Campo` y `ui/Limpiar`.
- Imagen: el cartel que ya está en Storage; sin cartel, **Crear cartel** (`dibujarCartel`), que ya sale en JPEG a 1080 × 1350 y 1080 × 1920.

## Lo nuevo y por qué

- **`ps-vista`**: la caja de la vista previa, copiada de `.vista` de `CreadorCartel.module.css` con su prefijo (Administración no carga ese CSS),
  un poco más chica (`100dvh − 31 letras`) para que el texto se vea sin desplazar.
- **El contador siempre a la vista** en este campo (hoy `ContadorCaracteres` sale al 75 %): Instagram corta en 2 200 caracteres, 30 etiquetas y
  20 menciones. En código sería una prop (`siempre`) de `ui/ContadorCaracteres`, sin tocar los demás campos.
- Cuatro clases de colocación (`ps-tags`, `ps-nota-tags`, `ps-ubicacion`, `ps-ubic`) con tokens del sistema.

## El texto que arma el sistema (Feleal)

```
Feleal: un viaje por el mundo en acordeón
Domingo 4 de octubre · 5:00–7:00 pm
📍 Museo Nacional de la Máscara · San Luis Potosí
Gratis

Con @feleal

Sigue a @smsnstrsapp para enterarte de más planes. Este y otros eventos, en somosnosotrxs.org (enlace en la bio).

#SanLuisPotosi #AgendaCultural #Música #Acordeón #SomosNosotrxs
```

Título; fecha y hora como las dice la app (`formatearLargo`); «📍 lugar» con su @ si su ficha tiene Instagram, y la ciudad; precio o «Gratis»;
artistas con su @ si lo tienen (si no, su nombre); la invitación a seguir la cuenta y a la app; de 3 a 5 etiquetas (ciudad, agenda, dos de la
disciplina o la clase, y la marca). Quitar una etiqueta de la foto quita también su mención (queda el nombre). Si se editó el texto a mano, quitar
etiquetas ya no lo toca. Los enlaces del pie de Instagram no se pueden tocar: por eso «enlace en la bio», y la bio de @smsnstrsapp debe llevar el
enlace a la app.

## Lo que dice la documentación de la API (revisado hoy)

`POST /{ig-user-id}/media` ([referencia](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media)):

- **`user_tags`**: `[{ username, x, y }]`, solo cuentas **públicas**; `x`/`y` de 0 a 1, obligatorios en imagen y opcionales en historias (las
  historias aceptan etiquetas desde julio de 2025).
- **`caption`**: hasta 2 200 caracteres, 30 hashtags y 20 menciones.
- **`location_id`**: el id de una **página de Facebook con datos de ubicación**; con una página sin ubicación, el contenedor falla. Encontrarla
  por API es con la búsqueda de páginas, que pide la función *Page Public Metadata Access* (o *Content Access*), **con revisión de Meta y
  verificación del negocio** ([búsqueda de páginas](https://developers.facebook.com/documentation/pages-api/search-pages),
  [función](https://developers.facebook.com/docs/features-reference/page-public-metadata-access)). Por eso la propuesta de guardarla a mano.
- **Historias** (`media_type=STORIES`): sin pie; los stickers (enlace, encuesta, ubicación) no se publican por API.
- **`collaborators`**: hasta 3 cuentas invitadas como coautoras; en publicaciones, reels y carruseles, no en historias.

## Del lado del sistema (para el código, tras la firma)

1. **Copia JPEG pública.** Instagram pide `image_url` pública en JPEG. Hoy los carteles se guardan en WebP o PNG. Al publicar, el servidor arma el
   JPEG (1080 × 1350 o 1080 × 1920; cartel encajado con margen de su color, recortado si se pidió, o el diseño de Crear cartel) y lo sube a una
   ruta pública de Storage con nombre que no se adivina (`instagram/<evento>-<n>.jpg`); se puede borrar a las 24 h de publicado.
2. **Publicar** en una acción de servidor solo de administración (el token nunca llega al teléfono): crear el contenedor con `image_url`,
   `caption`, `user_tags` (con las coordenadas repartidas abajo de la foto) y `location_id`; esperar `status_code=FINISHED`; `media_publish`; leer
   `permalink`. Si Instagram rechaza una etiqueta (cuenta privada o que no existe), se reintenta sin ella y la hoja lo dice; nunca queda a medias.
3. **Registro** (tabla nueva, migración que solo añade): `instagram_publicaciones` (id, `evento_id`, `tipo` publicación | historia, `formato`,
   `ig_media_id`, `permalink`, `texto`, `etiquetas`, `ubicacion_id`, `publicado_por`, `publicado_en`). De ahí salen «Ya en Instagram», el renglón de
   la portada y «Ya se publicó …».
4. **Cupo**: `GET /{ig-user-id}/content_publishing_limit` antes de publicar (100 en 24 h); con 100, el botón dice «Se puede otra vez mañana».
5. **Ubicación**: columna nueva `instagram_ubicacion` (id de la página) en `ciudades` y, opcional, en `lugares`. Se pega el enlace de la página de
   Facebook y el servidor saca su id (`GET /{pagina}?fields=id,location` con el token de la página, que no pide la función de búsqueda). Al publicar:
   la del lugar si existe, si no la de la ciudad, si no ninguna.
6. **@ de lugar y artistas**: salen de sus enlaces de redes (`enlaces` con `red: "instagram"`, el usuario es la ruta de la URL).
7. **Solo eventos futuros**: la lista y el «···» filtran con `inicio > ahora`; exposiciones, festivales y talleres en curso, mientras les quede un
   día o una sesión por delante. Al publicar, el servidor vuelve a comprobarlo y responde «ya empezó».

## Comprobado (prototipo)

- `node scripts/ops/auditoria-ui/capturar-admin-instagram.mjs <carpeta>` con el Chrome de la Mac: 35 estados a 390 × 844 (2×), dos a 1280 y la
  página entera; `medir.js` en cada uno (nodos 37–211, profundidad ≤ 10, 0 desbordes, 0 márgenes negativos).
- **Textos cortados, toques de menos de 44, desbordes y desplazamiento a lo ancho a 320, 390 y 430 en los 33 estados: 0.** Se cuentan aparte, porque
  son del diseño firmado y no de esta pieza: el resumen a dos líneas de `ui/CampoLargo` (OL-147, se abre a pantalla completa), el título de la
  barra de la ficha de la maqueta (`ui/BarraFicha`, igual en producción) y los chips de formato bajo la capa de texto abierta. En las capturas con la
  hoja desplazada hasta abajo (09, 17, 18, 28, 30) los chips de formato quedan a medias bajo el borde de la hoja y `medir` los marca chicos; sin
  desplazar miden bien.
- **Recorrido con toques reales: 42 de 42**, sin errores de página. Entre ellos: el orden por señal; el chip de ciudad; recortar y volver; historia
  sin texto; editar el texto y «Listo»; un solo violeta; publicar → «Publicando…» → publicado → «Ya en Instagram · 4»; sin cartel y «Otro diseño»;
  Escape; Atrás; el «···» con «Publicar en Instagram» después de «Destacar»; **etiquetas** (@teatrodelapazslp y @pimpolina.clown, quitar una la saca
  de la foto y del texto, «Volver a etiquetar»); **ubicación** del lugar y «Sin ubicación … Ponerla» en Ciudad de México hasta guardar el enlace;
  la invitación en el texto; el contador a la vista; **solo futuros**: el mercado de libros (empezó a las 9:00) no sale y la exposición abierta sí;
  «Ya empezó» bloquea; el «···» de un evento pasado no ofrece publicar; a 390 sin desplazamiento horizontal.

## Capturas (`docs/rediseno/capturas-490/`, cada una abierta)

- `00-pagina-entera`: el prototipo a 1440, el teléfono con la vista previa de Feleal y las notas al lado.
- `01-A-portada`, `02-A-portada-instagram`: la portada de producción; abajo, el grupo «Instagram» con «@smsnstrsapp» entre Gestionar y Obras.
- `03-B-lista`, `04-B-lista-abajo`: «Para publicar · 7» (Feleal, Café Chairel, DESIERTO, Leonora, Macario…) y «Ya en Instagram · 3» (Master Class,
  Susurros, LXS COLOCAOS) con su tipo y cuándo; ninguna línea cortada.
- `05-B-hoja-ciudades`: «Ciudades con eventos» con Todas (12), San Luis (10, elegida) y Ciudad de México (2).
- `06-B-todas-las-ciudades`, `07-B-ciudad-de-mexico`: la ciudad en la segunda línea; en CDMX, dos sin cartel.
- `08-C-publicacion`, `09-C-publicacion-abajo`: Feleal a 4:5 con margen, «Recortar», @feleal, la ubicación, el texto con 327/2200 y el botón.
- `10-C-recortado`, `11-C-historia`: recortado a 4:5; la historia a 9:16, sin texto.
- `12-C-texto-abierto`, `13-C-texto-largo`: el texto a pantalla completa con «Listo» y el contador (en el largo, cerca del tope de 2 200).
- `14`/`15-C-sin-cartel…`: Macario con los dos diseños tipográficos de Crear cartel. `16-C-comparar-portada`: la portada del sistema, para comparar.
- `17-C-ya-publicado`: «Ya se publicó: publicación, ayer, 7:40 pm» y «Publicar otra vez».
- `18-D-publicando`, `19-D-publicado`, `20-D-lista-despues`: el botón quieto; la imagen con «Publicado» y «Ver en Instagram»; Feleal ya abajo.
- `21`/`22`/`23-D-error-…`: cupo («Se puede otra vez mañana»), imagen, permiso vencido, en rojo y en frases llanas.
- `24-E-ficha-menu`, `25-E-hoja-desde-la-ficha`: el «···» real con «Publicar en Instagram»; la hoja con el cartel de la Orquesta.
- `26-B-lista-1280`, `27-C-publicacion-1280`: escritorio.
- `28-C-etiquetas`, `29-C-etiqueta-quitada`: @teatrodelapazslp y @pimpolina.clown con su ✕; quitada una, «Volver a etiquetar».
- `30-C-sin-ubicacion`: Danzón (CDMX): sin etiquetas y «Sin ubicación: falta la de Ciudad de México en Ciudades. Ponerla».
- `31-D-ya-empezo`: Susurros con el aviso y «Ya empezó» quieto.
- `32-E-menu-evento-pasado`: el «···» sin «Publicar en Instagram» (la misma ficha, tratada como pasada: solo cambia ese renglón).
- `33`/`34`/`35-F-…`: el panel de Oaxaca con «Ubicación en Instagram» (falta), su hoja con el enlace y la ✕, y guardada.

## Recomendación

1. Lista en Administración + renglón en el «···» de la ficha, las dos a la misma hoja de vista previa; una publicación a la vez.
2. Con cartel, el cartel completo con margen de su color (nunca cortar texto); sin cartel, el diseño tipográfico de Crear cartel (ya sale a 4:5 y
   9:16 con fecha, lugar y precio); la portada del sistema no, porque solo lleva color y título.
3. Etiquetas del lugar y de los artistas en la foto y en el texto, quitables; ubicación del lugar o de la ciudad, guardada a mano una vez.
4. Varias a la vez (carrusel o en serie) queda como idea; **colaboradores** (`collaborators`, coautoría con hasta 3 cuentas: el lugar o el
   artista aceptan y la publicación sale también en su perfil) también como idea, para después de ver cómo responden las etiquetas.

## Preguntas al founder (frases llanas)

1. ¿El renglón de la portada va en su propio grupo «Instagram» (como Grafo, Ciudades y Showcase) o dentro de «Pendiente» solo cuando hay
   destacados sin publicar?
2. La ubicación de Instagram no se puede buscar sola sin pedirle a Meta un permiso con revisión. ¿Te late pegar una vez el enlace de la página de
   Facebook de cada ciudad (y, si quieres, de cada lugar)?
3. ¿Cambias la bio de @smsnstrsapp para que lleve el enlace a somosnosotrxs.org? El texto de cada publicación dice «enlace en la bio».
4. ¿Las etiquetas van sin acento (#SanLuisPotosi), como las usa la gente?
5. Exposiciones, festivales y talleres que ya empezaron: los propongo mientras les queden días. ¿O solo antes de que abran?
6. ¿Solo administración publica, o más adelante también quien lleva un lugar (con la membresía)?

## Firmado y en código

**La firma** (founder, por el gestor, 23 de octubre): «firmado», sin contestar las preguntas, así que van las recomendaciones: (1) grupo propio
«Instagram» en la portada; (2) la ubicación se pega a mano una vez (el enlace de la página de Facebook de la ciudad y, si se quiere, del lugar; se
guarda el id); (3) etiquetas sin acento (#SanLuisPotosi); (4) exposiciones, festivales y talleres en curso se proponen mientras les queden días;
(5) solo la administración publica; una publicación a la vez; carrusel y colaboradores fuera.

### Base (migración `20261023140000_instagram.sql`, solo añade; banco `supabase/tests/pg/instagram.test.mjs`)

- `instagram_publicaciones`: cada intento (evento, formato 4x5/9x16, `publicada` con su id y enlace de Instagram, o `error` con su clave: cupo,
  imagen, permiso, empezo, otro), la imagen, las etiquetas, la ubicación, quién y cuándo (los pone la base). La administración lee y anota; nadie
  cambia ni borra lo anotado; una cuenta cualquiera no ve nada; un visitante, sin permiso.
- `instagram_ubicaciones` (tipo `ciudad` con su slug o `lugar` con su id → `pagina_id`, solo números, y su nombre). Solo la administración.
- `instagram_sugerencias(p_ciudad, p_dias)` (definer, solo responde a la administración): lo que se puede publicar, con «Voy», «Me interesa», si está
  destacado, su lugar con sus redes y su última publicación. Regla: por venir dentro de los días; exposición o festival en curso que termina después
  de hoy (en su zona); taller en curso con una sesión por delante; nunca oculto, cancelado, retirado ni borrador.
- Banco: 29 comprobaciones (mañana sí; en dos semanas no con 7 días y sí con 15; lo que ya empezó no; oculto y cancelado no; exposición abierta sí y
  en su último día no; taller con sesión por delante sí; la cuenta cualquiera y el visitante; quién y cuándo; los `check`; las ubicaciones).

### Servidor (`src/lib/instagram/`, solo administración)

- `api.ts` (server-only): el cliente de la Graph API con `INSTAGRAM_TOKEN` e `INSTAGRAM_USER_ID` del entorno. Contenedor (`image_url`, `caption`,
  `user_tags` con x/y repartidas abajo, `location_id`; historia con `media_type=STORIES`, sin texto ni ubicación) → espera `status_code=FINISHED` →
  `media_publish` → `permalink`. Los errores se vuelven claves (190/102/10/2xx → permiso; 4/9/17/32/613 o subcódigo 2207042 → cupo; los de la imagen
  → imagen; lo demás → otro); si Instagram rechaza el contenedor por otra cosa y llevaba etiquetas o ubicación, se intenta una vez sin ellas y se
  dice. El cupo con `content_publishing_limit`. El token nunca va a un registro ni a un mensaje. `paginaDeEnlace` y `leerPagina` (id, nombre y que
  tenga ubicación) para guardar la ubicación. `INSTAGRAM_API_URL` solo para el respaldo local (solo 127.0.0.1).
- `texto.ts` (puro): el texto firmado (título; cuándo como la app; «📍 lugar @lugar · ciudad»; precio o «Gratis»; «Con @artista y Nombre»; la
  invitación «Sigue a @smsnstrsapp para enterarte de más planes. Este y otros eventos, en somosnosotrxs.org (enlace en la bio).»; de 3 a 5 etiquetas sin
  acento); el usuario de Instagram de una ficha (su enlace de redes); las etiquetas de la foto; los límites (2 200, 30 #, 20 @) en frases llanas.
- `elegir.ts` (puro): `sePuedePublicar` (la misma regla que la base) y el orden por señal.
- `imagen.ts` (server-only): el JPEG de 1080 a 4:5 o 9:16: el cartel completo sobre su color dominante, o recortado (`fit: cover`, «attention»);
  sin cartel, los diseños tipográficos de Crear cartel (`generarCartel`, `tipo-franja` y `tipo-fecha`). «Recortar» solo se ofrece si el cartel no mide
  ya 4:5 (tolerancia 3 %).
- `app/admin/instagram/acciones.ts`: `prepararInstagram`, `publicarEnInstagram` (vuelve a comprobar que está por venir —si no, «empezo»—, el texto,
  el cupo; arma el JPEG, lo sube a `fotos/lugares/<admin>/instagram-<uuid>.jpg` —público, como Crear cartel—, publica solo a quien la ficha dice
  y anota) y `guardarUbicacionInstagram`. `app/api/instagram/[id]`: la vista previa a 720 (solo administración; 404 a los demás).

### Pantallas (las del prototipo firmado, con piezas de la app)

- Portada: el grupo «Instagram» con el renglón de Ajustes «@smsnstrsapp · N publicadas esta semana · M por publicar en <ciudad de la sesión>».
- `/admin/instagram`: `ui/Barra`, `ui/Cabecera` con el chip de ciudad y la hoja de ciudades de las listas (`HojaCiudades`, exportada de
  `CabeceraLista` con sus palabras), la línea de cuenta, `ui/Grupo` «Para publicar» y «Ya en Instagram», `ui/Renglon` (sin JavaScript lleva a la
  ficha; con él, abre la hoja). `?evento=` llega con la hoja abierta.
- `components/instagram/HojaInstagram`: la hoja C/D del prototipo. Contador siempre a la vista: prop nueva `contadorSiempre` de `ui/CampoLargo`
  (y `siempre` de `ui/ContadorCaracteres`; lo demás no cambia; prueba de componentes nueva).
- Ficha: «Publicar en Instagram» después de «Destacar» (solo administración y solo si `sePuedePublicar`); la hoja vive fuera del menú
  (`PublicarDesdeFicha`). Un evento que ya pasó no lo ofrece.
- Panel de ciudad: el renglón «Ubicación en Instagram» con su hoja (`ui/Campo` con su ✕, «Falta el enlace» / «Guardar»). La del lugar se puede
  guardar en la misma tabla (`tipo = 'lugar'`); su pantalla queda para cuando el founder la pida.

### Comprobado

- `npm run lint` (0 errores), `npm run typecheck`, `npm test` (285 archivos, **4 674 pruebas**, con 38 nuevas: texto, elección y el cliente con un
  `fetch` falso —éxito, espera, historia, reintento sin etiquetas, cada error, sin token, red caída, el token fuera de lo devuelto, cupo, páginas—),
  `npm run test:componentes` (724 y la nueva de `contadorSiempre`), `TEST_DATABASE_URL=… npm run test:db` (111 migraciones, **2 432 pruebas, 0
  fallaron**), `npm run inventario` (sin novedades), `npm run build` y **`npm run medir`: sin novedades**.
- **Presupuestos de `medir` subidos** (`--aceptar`): la portada 202 → 211 nodos (el grupo Instagram), el panel de ciudad 66 → 74 y su hoja 90 → 98 (el
  renglón de la ubicación); nuevas s46 (la lista, 130) y s47 (la hoja abierta, 159). Ningún desborde, toque chico ni texto cortado.
- `node scripts/ops/auditoria-ui/capturar-admin-instagram-codigo.mjs . <carpeta>` (Chrome real, toques reales, la app contra el respaldo y la API de
  Instagram DE MENTIRA del respaldo): **todo bien, sin errores de página**: el renglón de la portada; «Para publicar» y «Ya en Instagram»; nada que ya
  empezó; la etiqueta del lugar (@teatrodelapazslp, de su ficha) y la ubicación de la ciudad; quitar y «Volver a etiquetar»; el texto armado
  (abajo); la historia sin texto; **publicar** (cupo → contenedor → FINISHED → `media_publish` → enlace) con «Ver en Instagram» y el renglón en «Ya en
  Instagram»; el «···» con «Publicar en Instagram» después de «Destacar»; sin cartel, el diseño de Crear cartel; un evento pasado sin la opción;
  la ubicación de Oaxaca guardada; **a 320, 390 y 430 sin textos cortados ni desplazamiento a lo ancho**.

Texto armado por el código (Delirium Pollum, del respaldo):

```
Delirium Pollum, clown y pantomima con Pimpolina
Sábado 10 de octubre · 6:00–8:00 pm
📍 Teatro de la Paz @teatrodelapazslp · San Luis Potosí
$150

Con Pimpolina

Sigue a @smsnstrsapp para enterarte de más planes. Este y otros eventos, en somosnosotrxs.org (enlace en la bio).

#SanLuisPotosi #AgendaCultural #Teatro #SomosNosotrxs
```

### Capturas del código (`codigo-*`, 390 × 844 salvo la 18; cada una abierta)

- `codigo-01-portada`: el grupo «Instagram» entre Gestionar y Obras: «@smsnstrsapp · 2 publicadas esta semana · 11 por publicar».
- `codigo-02-lista`, `codigo-03-lista-abajo`: «Todas las ciudades», «12 eventos en los próximos 7 días · 1 ya en Instagram», «Para publicar · 11»
  (LXS COLOCAOS destacado arriba; exposiciones y festivales con «Hasta el …»; la ciudad en la segunda línea), y abajo «Ya en Instagram».
- `codigo-04-hoja-ciudades`: «Ciudades con eventos», la de las listas de Administración.
- `codigo-05-hoja-publicacion`, `codigo-06-hoja-abajo`: Delirium Pollum a 4:5 con el diseño de Crear cartel y «Otro diseño», @teatrodelapazslp con
  su ✕, «Ubicación: San Luis Potosí», el texto con 330/2200 y un solo botón.
- `codigo-07-etiqueta-quitada`: sin etiquetas y «Volver a etiquetar».
- `codigo-08-texto`: el texto a pantalla completa con «Listo» y el contador.
- `codigo-09-historia`: 9:16, «Las historias no llevan texto y duran 24 horas», «Se etiqueta en la historia».
- `codigo-10-publicado`: la imagen, «Publicado en @smsnstrsapp» con «Ver en Instagram» y «Listo».
- `codigo-11-lista-despues`: Delirium Pollum en «Ya en Instagram» («Publicación · Hoy, …»).
- `codigo-12-ficha-menu`, `codigo-13-hoja-desde-la-ficha`: Macario: el «···» con «Publicar en Instagram · En @smsnstrsapp» después de «Destacar»; la
  hoja con el diseño de Crear cartel y «Ni el lugar ni sus artistas tienen Instagram en su ficha: sin etiquetas».
- `codigo-14-menu-evento-pasado`: «Noche de acordeón y guitarra» (ya pasó): el «···» sin la opción.
- `codigo-15-ciudad-ubicacion`, `codigo-16-hoja-ubicacion`, `codigo-17-ubicacion-guardada`: Oaxaca: «Falta: sus publicaciones salen sin
  ubicación»; la hoja con el enlace, su ✕ y «Guardar»; guardada, «Oaxaca, Oaxaca · la usan sus publicaciones sin ubicación propia».
- `codigo-18-lista-1280`: la lista en la columna de Administración.

### Lo que el gestor debe probar en producción (una publicación real de prueba)

1. Unir y aplicar la migración `20261023140000_instagram.sql`. Comprobar en Vercel que `INSTAGRAM_TOKEN` e `INSTAGRAM_USER_ID` existen en
   producción (y preview).
2. En Administración › Ciudades › San Luis Potosí, «Ubicación en Instagram»: pegar el enlace de una página de Facebook con ubicación (la de la
   ciudad). Debe decir su nombre. Si dice «No pudimos leer esa página», el token no lee páginas públicas con ese nombre: probar con el número de la
   página.
3. Administración › Instagram: abrir un evento con cartel, revisar imagen, etiquetas y texto, y **Publicar en Instagram** una sola vez. Debe salir
   «Publicado en @smsnstrsapp» y «Ver en Instagram» abrir la publicación con su ubicación y sus etiquetas (si una cuenta es privada, sale sin ella y
   lo dice).
4. Probar una historia (9:16) de un evento sin cartel.
5. Si algo falla, la hoja dice la frase y la base anota la clave en `instagram_publicaciones` (`estado = 'error'`), sin el token.
6. Borrar a mano la publicación de prueba en Instagram si no se queda.

### Ideas que quedan fuera (firma)

- Varias a la vez (carrusel o en serie) y **colaboradores** (`collaborators`, hasta 3 cuentas como coautoras; no en historias).
- La ubicación por lugar en su ficha de Administración (la base ya la acepta).
- Publicar desde la cuenta de quien lleva un lugar (con la membresía).

