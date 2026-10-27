# 493 · Espejo a Facebook y enlaces con marca de origen (OL-461)

**Fecha:** 2026-10-27. **Rama:** `espejo-facebook`, base `origin/main` (`daf0ddd2`). **Operador:** agente de la pieza (Gestor VII), sin otros
agentes. **Estado:** en código, espera la revisión del gestor, el permiso nuevo de la página y una prueba real en producción. **Migración
`20261027120000_espejo_facebook.sql`** (solo añade). Variable nueva: **`FACEBOOK_PAGE_ID`** (la página «Somos Nosotrxs», `1374817622385572`); el
token sigue siendo `INSTAGRAM_TOKEN` (es el token de esa página) y necesita **`pages_manage_posts`**. Capturas: `docs/rediseno/capturas-493/`.

## El pedido

- Founder, 27 de octubre: «cuando yo publique en Instagram ya se agregue también en Facebook y de esa manera espejear todas las publicaciones».
  Luego: «adelante con el espejo a Facebook».
- Encargo del gestor: reutilizar lo de OL-458 (bitácora 490): las mismas pantallas y piezas; un solo «Publicar» que manda a las dos redes; la casilla
  «También en Facebook» marcada; el resultado en dos líneas; si Instagram falla, no se publica en Facebook; si Facebook falla, Instagram queda y se
  puede reintentar; publicar en Facebook lo que ya está en Instagram desde «Ya en Instagram»; todo enlace que salga en las redes con su marca de
  origen (`utm_source`, `utm_medium`, `utm_campaign`) y la vista de la ficha con la red de la que llegó, sin datos personales.

## Lo que dice la documentación de Meta (revisado hoy)

- **Publicación con foto en una página** ([Pages API, posts](https://developers.facebook.com/docs/pages-api/posts)): `POST /{page-id}/photos` con
  `url` (la imagen pública) y el texto; responde `id` (la foto) y `post_id` (la publicación). Permisos: `pages_manage_posts`,
  `pages_read_engagement` (y la tarea CREATE_CONTENT en la página).
- **Historia de una página** ([Page Stories API](https://developers.facebook.com/docs/page-stories-api)): primero `POST /{page-id}/photos` con
  `published=false`; luego `POST /{page-id}/photo_stories` con `photo_id`; responde `success` y `post_id`. Pide `pages_manage_posts`,
  `pages_read_engagement` y `pages_show_list`. JPEG hasta 10 MB; una foto ya usada en una publicación no sirve para una historia (cada vez se sube de
  nuevo, así que no pasa).
- **Mencionar una página** ([comentarios y menciones](https://developers.facebook.com/docs/pages-api/comments-mentions)): `@[page-id]` pide la
  función **«Page Mentioning»** y la guía solo la describe para responder publicaciones y comentarios, no para el texto de una publicación nueva. No
  se pudo confirmar que la API la acepte al publicar: **el lugar y los artistas van por su nombre, sin @** (lo pedía el encargo si no se confirmaba).

## Qué se hizo

### Base (migración `20261027120000_espejo_facebook.sql`, solo añade; banco `supabase/tests/pg/espejo-facebook.test.mjs`)

- **`facebook_publicaciones`**, tabla hermana de `instagram_publicaciones` (no columnas nuevas: lo anotado en Instagram no se cambia —no hay permiso de
  update— y un reintento es otra fila): la publicación de Instagram que espeja, el evento y el formato (los pone la base desde esa publicación), el
  estado (`publicada` con `post_id` y `permalink` de facebook.com, o `error` con `permiso | imagen | otro`), quién y cuándo (los pone la base). Solo la
  administración lee y anota, solo se espeja lo que salió en Instagram, nadie cambia ni borra.
- **`vistas_evento.origen`** (`instagram | facebook`) y **`vistas_evento.medio`** (`post | story`), sin medio si no hay red. La fila sigue siendo una
  por visitante, evento y día, sin cuenta, cookie ni IP.
- **`contar_vista_evento_origen(…, p_origen, p_medio)`**: la regla de OL-459 tal cual (no cuentan la administración ni quien publicó, ni lo oculto o
  pasado) con el origen; si ese día el visitante ya había entrado sin origen, se le pone; uno que ya tenía no se cambia. Solo `service_role`.
  `contar_vista_evento` no cambia: sin origen, la app sigue llamando a esa.
- **`vistas_por_origen(p_dias)`**: cuántas vistas llegaron de cada red y medio (1 a 90 días); solo responde a la administración. Sin pantalla: para
  leerla desde Supabase mientras no se pida una.
- Banco: 37 comprobaciones (anotar y quién/cuándo; evento y formato de la de Instagram; no espejar un error; los `check`; una cuenta cualquiera y un
  visitante; no cambiar ni borrar; las vistas con origen, sin origen, la misma persona dos veces, el origen que se pone si faltaba y no se cambia,
  redes y medios desconocidos, evento pasado, autor y administración, visitante inválido, solo el servidor cuenta; las vistas por red solo para la
  administración). La comprobación de OL-459 que fijaba las columnas de `vistas_evento` ahora dice `evento_id,dia,clave,origen,medio`.

### Servidor

- **`src/lib/facebook/api.ts`** (server-only): `publicarEnPagina({ imagen, texto, historia })` con las mismas opciones inyectables que el de Instagram
  (`traer`, `token`, `pagina`). Publicación: `/photos` con `url` y `message` → `post_id` → `permalink_url`. Historia: `/photos` con
  `published=false` → `/photo_stories` con `photo_id` → `post_id` → `permalink_url`. Si el enlace no se puede leer, queda publicada sin él. Errores en
  tres claves (`permiso`: 190, 102, 10, 3 y 200–299 —sin `pages_manage_posts` es el 200—; `imagen`: 324; lo demás, `otro`, incluidos los límites de
  uso). Token `INSTAGRAM_TOKEN` (el de la página) y página `FACEBOOK_PAGE_ID`; sin alguno, «permiso» sin llamar a Facebook. Usa `llamarGraph` y
  `baseGraph` del cliente de Instagram (ahora exportados; `INSTAGRAM_API_URL` sigue siendo solo para el respaldo local).
- **`src/lib/facebook/texto.ts`** (puro): `enlaceConOrigen(evento, red, medio)` →
  `https://somosnosotrxs.org/eventos/<slug>?utm_source=…&utm_medium=…&utm_campaign=<id del evento>` (el dominio con x de la línea de la marca;
  redirige a somosnosotros.org con un 308 que conserva ruta y consulta, comprobado con curl). `textoDeFacebook(textoDeInstagram, evento, enlace)`:
  el mismo pie que Instagram (el que armó el sistema o el que se escribió a mano) con el enlace a la ficha completo y tocable, la invitación de
  Facebook («Sigue la página para enterarte de más planes. Este y otros eventos: entra a somosnosotrxs.org.») en lugar de «… (enlace en la bio)», el
  lugar y los artistas por su nombre sin @ (solo los de la ficha; un @ que escribió la administración a mano se queda), y @smsnstrsapp suelto como
  «Somos Nosotrxs». Las etiquetas (#), iguales.
- **`app/admin/instagram/acciones.ts`**: `publicarEnInstagram` acepta `facebook`; si Instagram salió, anota su fila, publica en la página la misma
  imagen JPEG y anota en `facebook_publicaciones`; si Instagram falló, ni se intenta. La acción nueva **`publicarEnFacebook(eventoId, texto?)`** (la
  usan «Reintentar en Facebook» de la hoja y «Publicar en Facebook» de la lista): solo administración, solo lo que está por venir («empezo» si no),
  la última publicación de Instagram del evento con su imagen; si ya está en Facebook no publica otra vez.
- **Vistas**: `ContarVista` lee `utm_source` y `utm_medium` de la dirección (listas cerradas, `lib/vistas`) y los manda a `POST /api/vista`, que
  llama a `contar_vista_evento_origen` solo si hay origen. La ficha del evento conserva las tres `utm_*` al redirigir una dirección vieja (id o slug
  anterior) a la de hoy.
- Aviso de privacidad: una frase más en lo de la cookie de visita («Si llegas por un enlace nuestro en Instagram o Facebook, anotamos con esa visita
  de cuál red vino, nada más.») y la fecha.

### Pantallas (las de OL-458, con piezas de la app)

- **Hoja «Publicar en Instagram»**: `ui/Casilla` «También en Facebook» (detalle: «En la página Somos Nosotrxs, con el enlace a la ficha del evento.»;
  en historia, «En las historias de la página Somos Nosotrxs.»), marcada; la última elección se guarda en `sessionStorage` (`sn:instagram:facebook`,
  con try/catch: sin almacenamiento, marcada). Un solo botón **«Publicar»** («Publicar otra vez», «Publicando…», «Ya empezó» y «Se puede otra vez
  mañana» como antes). La nota dice «Se publica en @smsnstrsapp y en su página de Facebook.» o solo Instagram.
- **Resultado en dos líneas** (`admin/hecho`): «Instagram: publicado · Ver» y «Facebook: publicado · Ver» (en historia, «historia publicada»), o
  «Facebook: *falta permiso*» (en rojo, el icono también) con su frase llana debajo, que siempre dice que en Instagram sí quedó. Con Facebook fallido,
  el pie ofrece **«Reintentar en Facebook»** en vez de «Listo». Los «Ver» llevan `aria-label` «Ver en Instagram» / «Ver en Facebook».
- **Lista, «Ya en Instagram»**: cada renglón suma la línea «Facebook: publicado | sin publicar | falta permiso | no aceptó la imagen | no se
  publicó» y, si falta, el botón de icono de Facebook (`ui/BotonIcono`, 44 × 44, en el sitio de la acción del renglón, como el «Voy» de las listas;
  nombre accesible «Publicar en Facebook: <título>»): publica sin abrir la hoja, el renglón dice «Facebook: publicando…» y luego el resultado; si sale,
  el botón se va. El «cuándo» del renglón ahora se parte en dos líneas (`.envuelve`): a 320, con el botón al lado, se cortaba.
- **Portada**: «@smsnstrsapp · N publicadas esta semana · M en Facebook · K por publicar en <ciudad>».

### Respaldo local

- La API de mentira del respaldo hace también de página de Facebook (`/photos`, `/photo_stories`, el enlace), apunta lo que llega a la página en el
  registro y falla con `FACEBOOK_FALLA` o `/__falla-facebook?clave=` sin reiniciar; `facebook_publicaciones` en memoria (la Master Class ya está;
  Susurros no). `capturar-admin-instagram-codigo.mjs` (de la 490) al día con los letreros nuevos.

## Comprobado

- `npm run lint` (0 errores; los 2 avisos son de archivos ajenos), `npm run typecheck`, `npm test` (**4 715 pruebas** en 290 archivos; nuevas: el
  cliente de Facebook con `fetch` falso —foto, historia, sin texto, enlace que no se lee o no es de Facebook, cada error, sin permiso, sin token ni
  página, red caída, id raro, el token fuera de lo devuelto—, el texto de Facebook y las UTM, `origenDeVista`/`origenDeConsulta`, `POST /api/vista`
  con origen, `estadosFacebook`), `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db` (114 migraciones, **2 556 pruebas, 0
  fallaron**), `npm run inventario` (sin novedades), `npm run test:componentes` (**730 de 730**, con las 5 nuevas), `npm run medir` (60 pantallas × 4 anchos, sin desbordes, toques chicos ni textos cortados; con el teclado, sin novedades; **presupuestos
  anotados con `--aceptar`**: s46, la lista, 130 → 121 nodos y profundidad 10 → 9 —el «cuándo» del renglón pierde un `<span>`—, y s47, la hoja
  abierta, 159 → 154: la lista −9 y la casilla +4) y
  `npm run build`.
- **Componentes con toques reales** (`src/app/admin/instagram/EspejoFacebook.componentes.test.mjs`, 5 de 5): la casilla marcada, un toque la desmarca,
  la hoja la recuerda en la sesión y sin ella no se pide Facebook; publicar en las dos y las dos líneas con sus «Ver»; Facebook sin permiso,
  «Reintentar en Facebook» con el mismo texto de Instagram y luego «Listo»; «Publicar en Facebook» desde «Ya en Instagram» (44 × 44, no abre la hoja,
  se va al publicar); y el error en el renglón con el botón que se queda.
- **Recorrido en la app** (`node scripts/ops/auditoria-ui/capturar-espejo-facebook.mjs . docs/rediseno/capturas-493`, Chrome real, la app compilada
  contra el respaldo y las APIs de mentira): **25 de 25 bien, sin errores de página ni de consola**: la portada con «1 en Facebook»; «Ya en
  Instagram» con «Facebook: sin publicar» y su botón de 44 × 44 solo donde falta; la casilla marcada (84 de alto), desmarcar, la hoja que la
  recuerda, volver a marcar; publicar en las dos con las dos líneas y «Ver» a la publicación de la página; la página recibe la misma imagen JPEG y el
  texto con el enlace marcado, sin @ y con «entra a somosnosotrxs.org»; el renglón pasa a «Facebook: publicado»; «Publicar en Facebook» de una
  historia desde la lista (foto sin publicar → `photo_stories`, con la imagen que usó Instagram) y el botón se va; sin permiso, «Facebook: falta
  permiso» con su frase y «Reintentar en Facebook», que al reconectar la página publica y deja «Listo»; la lista con «Facebook: falta permiso» y el
  botón; sin la casilla, solo Instagram (la página ni se llama); **a 320, 390 y 430 sin textos cortados ni desplazamiento a lo ancho** (a 320, antes
  de partir el «cuándo» en dos líneas, se cortaba con el botón al lado).

Texto que recibió la página de mentira (Delirium Pollum, del respaldo):

```
Delirium Pollum, clown y pantomima con Pimpolina
Sábado 10 de octubre · 6:00–8:00 pm
📍 Teatro de la Paz · San Luis Potosí
$150

Con Pimpolina

Ficha del evento: https://somosnosotrxs.org/eventos/delirium-pollum-clown-y-pantomima-con-pimpolina?utm_source=facebook&utm_medium=post&utm_campaign=bbbb0001-0000-4000-8000-000000000005

Sigue la página para enterarte de más planes. Este y otros eventos: entra a somosnosotrxs.org.

#SanLuisPotosi #AgendaCultural #Teatro #SomosNosotrxs
```

## Capturas (`docs/rediseno/capturas-493/`, 390 × 844, cada una abierta)

- `01-portada`: el grupo «Instagram»: «@smsnstrsapp · 2 publicadas esta semana · 1 en Facebook · 11 por publicar», en dos líneas, sin cortes.
- `02-lista-ya-en-instagram`: todas las ciudades, abajo; «Ya en Instagram» con Susurros del inconsciente: «Historia · lun 5 de oct, 10:00 am» y
  «Facebook: sin publicar», con el icono de Facebook en violeta a la derecha (44 × 44, el sitio del «Voy» de las listas).
- `03-hoja-casilla`: Delirium Pollum, abajo de la hoja: la etiqueta, la ubicación, el texto (330/2200), **«También en Facebook»** marcada con su
  detalle, «Se publica en @smsnstrsapp y en su página de Facebook.» y un solo botón **«Publicar»**.
- `04-hoja-sin-facebook`: la misma con la casilla vacía y «Se publica en @smsnstrsapp.».
- `05-publicado-en-las-dos`: la imagen y dos renglones de `admin/hecho`: «Instagram: publicado · Ver» y «Facebook: publicado · Ver»; abajo «Listo».
- `06-lista-despues`: «Ya en Instagram · 2»: Delirium Pollum con «Publicación · Hoy, 10:00 am» y «Facebook: publicado» (sin botón); Susurros con
  «Facebook: sin publicar» y su botón.
- `07-lista-reintento-historia`: tras tocar el botón de Susurros, su renglón dice «Facebook: publicado» y el botón ya no está.
- `08-facebook-falta-permiso`: Macario: «Instagram: publicado · Ver», «Facebook: falta permiso» (en rojo, el icono también), la frase «Hay que
  volver a conectar la página de Facebook con el permiso para publicar. En Instagram sí quedó publicado.» y el botón **«Reintentar en Facebook»**.
- `09-reintento-en-la-hoja`: reconectada la página, las dos líneas en «publicado» y «Listo».
- `10-lista-falta-permiso`: «Ya en Instagram · 4»: LXS COLOCAOS con «Facebook: falta permiso» y su botón; Macario, Delirium y Susurros con
  «Facebook: publicado». El «cuándo» de LXS COLOCAOS ya no se corta junto al botón.
- `11-solo-instagram`: sin la casilla: solo «Instagram: publicado · Ver» y «Listo».

## Decisiones por confirmar (founder o gestor)

1. **Tabla hermana** en vez de columnas en `instagram_publicaciones` (el encargo dejaba elegir): lo de Instagram no se cambia y cada reintento queda.
2. **Menciones sin @**: el nombre del lugar y de los artistas. Etiquetar páginas pide la función «Page Mentioning» de Meta (con revisión) y no está
   documentado para publicar.
3. **El enlace va con x** (`somosnosotrxs.org`, la línea de la marca), un salto 308 a somosnosotros.org que conserva la marca de origen.
4. **Instagram no lleva enlace**: su pie no deja tocarlos y las historias por API no llevan el sticker de enlace. La marca `utm_source=instagram`
   ya se acepta; para contar lo que llega desde Instagram haría falta el enlace de la bio con su marca
   (`https://somosnosotrxs.org/?utm_source=instagram&utm_medium=bio`), que hoy no se cuenta (solo se cuentan fichas de evento y `medio` acepta
   `post | story`).
5. **Lo que ya empezó no se espeja** (como en Instagram): de las 14 publicaciones de la semana pasada, solo las de eventos que siguen por venir
   aparecen en «Ya en Instagram» con su botón.
6. **El aviso de privacidad** suma una frase; como en OL-459, decidir si un cambio así se avisa por correo.
7. La casilla viene marcada siempre que la sesión no diga otra cosa (no se recuerda entre días ni entre teléfonos).

## Lo que el gestor debe hacer y probar en producción

1. **Permiso**: con el founder, volver a generar el token de la página «Somos Nosotrxs» desde la app de Meta «Somos Nosotrxs Publicador» con
   **`pages_manage_posts`** además de los de hoy (`pages_show_list`, `pages_read_engagement`, `business_management`, `instagram_basic`,
   `instagram_content_publish`); extenderlo a token de página sin caducidad (como el 23 de octubre) y reemplazar `INSTAGRAM_TOKEN` en Vercel
   (producción y preview). Comprobar con el Access Token Debugger que el token es de tipo PAGE, de la página 1374817622385572, con
   `pages_manage_posts`.
2. **Variable**: `FACEBOOK_PAGE_ID=1374817622385572` en Vercel (producción y preview). Sin ella la hoja dice «Facebook: falta permiso» y publica
   solo en Instagram.
3. Aplicar la migración `20261027120000_espejo_facebook.sql` antes de unir.
4. Una publicación real: Administración › Instagram, un evento con cartel, «También en Facebook» marcada, «Publicar». Deben salir las dos líneas;
   «Ver» de Facebook abre la publicación en la página con el texto con enlace y sin @. Tocar el enlace desde el teléfono (sin sesión) y comprobar en
   Supabase: `select origen, medio, count(*) from vistas_evento where origen is not null group by 1, 2;` (o `vistas_por_origen(7)` con sesión de
   administración).
5. Una historia (9:16): debe salir en las historias de la página.
6. «Publicar en Facebook» desde «Ya en Instagram» en uno de la semana pasada que siga por venir.
7. Si algo falla: la hoja dice la frase y `facebook_publicaciones` anota la clave (`estado = 'error'`), sin el token. Borrar a mano lo de prueba.
