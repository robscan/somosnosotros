# 503 · «Conectar Instagram» en Administración: la app consigue y guarda sola su token de Meta en Vault (OL-471)

**Fecha:** 2026-10-28. **Rama:** `instagram-conectar`, base `origin/main` (`12ab4582`, con OL-467 unido); al cerrar se trajo `main`
(`e0e65408`, con OL-468 y OL-469: choque solo en OPEN_LOOPS, resuelto conservando todo). **Operador:** agente de la pieza
(Gestor VII), sin otros agentes. **Estado:** en código, espera la revisión del gestor, la configuración de Meta y Vercel y una prueba real en
producción. **Migración `20261029180000_instagram_conexion.sql`** (solo añade; el nombre lo eligió el operador: el encargo no traía uno, y es el
siguiente a la última de `main`, `20261028150000`). **Variable nueva:** `META_APP_SECRET` (sensible, la pega el founder). Capturas:
`docs/rediseno/capturas-503/`.

## El pedido

- Decisión del founder (2026-10-28): «Opción 1», que la app consiga el token sola en vez de pegarlo a mano en Vercel.
- Antecedente: el token de página vive en Vercel como `INSTAGRAM_TOKEN` (sensible, pegado el 27 de octubre) y no trae
  `instagram_manage_insights`, que ya está añadido a la app de Meta «Somos Nosotrxs Publicador». Sin ese permiso no hay Business Discovery, la
  única forma oficial de leer las publicaciones de las cuentas profesionales de los lugares (`docs/investigaciones/vigilancia-instagram-lugares.md`
  §3 y §9, fase 0). El gestor comprobó en el Explorador de Meta que Business Discovery funciona con el token de página cuando lo trae.
- Encargo: salida al inicio de sesión de Meta, la vuelta, guardar el token en Vault con una función solo de la llave de servicio, leerlo desde
  Vault con `INSTAGRAM_TOKEN` de respaldo, y un bloque «Conexión» arriba de la lista de Administración › Instagram (sin pantallas nuevas).

## Lo que dice la documentación de Meta (consultada el 2026-10-28)

- Flujo manual del inicio de sesión: el diálogo `https://www.facebook.com/<versión>/dialog/oauth` con `client_id`, `redirect_uri`, `state`,
  `scope` y `response_type=code`; el código se cambia en `GET https://graph.facebook.com/<versión>/oauth/access_token` con `client_id`,
  `redirect_uri` (la misma del diálogo), `client_secret` y `code`. <https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow>
- Token de larga duración: `GET /oauth/access_token?grant_type=fb_exchange_token&client_id&client_secret&fb_exchange_token` (unos 60 días); el
  token de página que se pide con un token de usuario de larga duración **no tiene fecha de caducidad** (se invalida solo «bajo ciertas
  condiciones», que esa página no detalla). <https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived>
- La página y su cuenta de Instagram: `GET /me/accounts?fields=id,name,access_token,instagram_business_account`.
  <https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram>
- Los permisos concedidos: `GET /me/permissions` → `data[{ permission, status: granted | declined | expired }]`.
  <https://developers.facebook.com/docs/graph-api/reference/user/permissions/>
- Business Discovery: `GET /<nuestro ig-user-id>?fields=business_discovery.username(<cuenta>){…}`.
  <https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery>

**Una desviación del encargo:** el diálogo va con la versión de la Graph API que ya usa la app (`VERSION_GRAPH = v23.0`, `src/lib/instagram/api.ts`)
y no con `v21.0`. La v21.0 salió en octubre de 2024 y es la más próxima a quedar retirada; usar la misma versión en el diálogo y en las llamadas
evita que una pieza quede atrás. Si el gestor prefiere `v21.0`, es una línea (`urlDeConexion`).

## Qué se hizo

### Base (migración `20261029180000_instagram_conexion.sql`, solo añade; banco `supabase/tests/pg/instagram-conexion.test.mjs`)

- **`instagram_conexion`**: una sola fila (`id = 1`) con el estado **sin token**: página (id y nombre), cuenta de Instagram (id y usuario),
  `permisos` (los concedidos), `conectado_por` y `conectado_en`. RLS: la lee la administración (`es_admin()`); `anon` no tiene nada;
  `authenticated` y `service_role` solo `select` (nadie la escribe directo, ni la llave de servicio).
- **`instagram_guardar_conexion(token, página, nombre, ig, usuario, permisos, conectado_por)`**: `security definer`, `search_path` vacío, solo
  `service_role`. Valida el token (20–2000 caracteres, sin espacios) y que quien conectó sea de la administración; si falta Vault, no guarda
  nada (55000). Con un candado (`pg_advisory_xact_lock`) para dos vueltas a la vez, escribe el token en Vault bajo `instagram_token`
  (`vault.create_secret` la primera vez, `vault.update_secret` las siguientes, sin crear otro) y el estado en la tabla, en la misma
  transacción. Vault va con SQL dinámico, como `rutinas_latido` (OL-444): el banco local no tiene la extensión.
- **`instagram_token()`**: `security definer`, `search_path` vacío, solo `service_role`. Devuelve el token de `vault.decrypted_secrets` o null
  (sin Vault o sin token).

### El servidor

- **`src/lib/instagram/conexion.ts`**: `firmarEstado` / `leerEstado` (el `state`: `<id del admin>.<caduca>.<azar>.<firma>`, HMAC-SHA256 con una
  llave derivada de `CRON_SECRET` —`instagram-conectar:<secreto>`, para que la firma no sirva en otro sitio—, 10 minutos, comparación en tiempo
  constante); `uriDeVuelta` (solo https); `urlDeConexion` (el diálogo con los siete permisos); `atenderVuelta` (todo el recorrido, con
  `fetch` y `guardar` inyectados para las pruebas). La vuelta exige que el `state` de la dirección sea el de la galleta, que esté firmado, sin
  caducar y que sea de quien tiene la sesión; si Meta dice `error` (se canceló), «cancelado». Luego: código → token de usuario → larga duración →
  `/me/permissions` (sin `pages_show_list`, `pages_read_engagement`, `instagram_basic` o `instagram_content_publish` **no se guarda**: seguiría
  mandando el de respaldo) → `/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100` → la página
  `FACEBOOK_PAGE_ID` con su token y su cuenta de Instagram (si `INSTAGRAM_USER_ID` está, tiene que coincidir) → guardar. Sin
  `instagram_manage_insights` sí se guarda (publicar funciona) y el bloque pide reconectar. Nunca registra un token, el código ni el secreto: los
  errores son claves.
- **`src/lib/instagram/conexionEstado.ts`** (sin nada del servidor): los permisos, las frases de cada clave de la vuelta y `estadoConexion`, lo que
  dice el bloque.
- **`src/lib/instagram/token.ts`**: `tokenInstagram()` (Vault con la llave de servicio y, si no hay, `INSTAGRAM_TOKEN`), `tokenPorPeticion()` (lo
  lee una vez por petición; caché en memoria, nada más) y `guardarConexion()` (la función de la base; si falla, una línea con el código, sin el
  token).
- **`GET /api/instagram/conectar`**: solo la administración (si no, 403). El origen sale de `origenPropio` (en producción, somosnosotros.org;
  nunca el de una cabecera manipulada) y la vuelta es `https://<origen>/api/instagram/vuelta`; fuera de https vuelve con «solo funciona en
  somosnosotros.org». Si se llegó por otro host propio (www), primero pasa al bueno, para que la galleta quede donde vuelve Meta. Deja el `state`
  en la galleta `sn_ig_conectar` (httpOnly, Secure, SameSite=Lax, ruta `/api/instagram`, 10 min) y redirige (303) al diálogo.
- **`GET /api/instagram/vuelta`**: solo la administración (si no, 403); `atenderVuelta` y de vuelta a `/admin/instagram?conectado=1` o
  `?error=<clave>` (303, sobre el origen propio), borrando la galleta, con `Cache-Control: no-store` y `Referrer-Policy: no-referrer`. Ni el
  token ni el código quedan en la dirección, en una galleta ni en un registro.
- **Quién usa el token:** la cola de redes (`src/lib/redes/herramientas.ts`: `cupo`, `publicar`, `publicarCarrusel` y `publicarEnPagina` con el
  token de `tokenPorPeticion`) y la ubicación de una ciudad o un lugar (`guardarUbicacionInstagram` en `src/app/admin/instagram/acciones.ts`).
  `lib/instagram/api.ts` y `lib/facebook/api.ts` no cambian de forma: ya aceptaban `token` en sus opciones y siguen cayendo en `INSTAGRAM_TOKEN`
  si no llega. Cómo se publica (OL-458 a OL-465) no cambia.
- **`META_APP_ID`** en `src/lib/marca.ts` (constante: no es secreto, va en la dirección del diálogo).

### La pantalla (Administración › Instagram)

Bajo la cabecera y arriba de la lista, el grupo **«Conexión»** (`ui/Grupo`, el mismo título que «Para publicar») con un renglón de ajuste suelto
(`Renglon.module.css` `ajuste sola`: icono de Instagram, qué cuenta, qué puede y desde cuándo, y la píldora de Administración como enlace):

- «Sin conexión propia» · «Usa el token de respaldo» · **Conectar Instagram** (si tampoco hay `INSTAGRAM_TOKEN`: «Sin conexión» · «Conecta
  Instagram para publicar», en rojo).
- «Conectada como Somos Nosotrxs (@smsnstrsapp)» · «Publica y lee cuentas · desde el 28 de octubre» · **Reconectar** (sin
  `pages_manage_posts`: «Publica solo en Instagram y lee cuentas…»).
- Sin `instagram_manage_insights`: «Falta el permiso para leer cuentas: reconecta», en rojo, y **Reconectar**.
- Al volver con `?conectado=1`, «Instagram quedó conectado» (la línea de hecho de Administración); con `?error=<clave>`, su frase llana en
  `ui/Aviso`, que se cierra con la ✕. La dirección pierde `?conectado` / `?error` en cuanto se pinta (recargar no lo repite). Una clave que no
  conocemos no pinta nada.

Las frases de error: «No se conectó: se canceló en Facebook.», «El enlace para conectar caducó. Vuelve a tocar «Conectar Instagram».»,
«Conectar Instagram solo funciona en somosnosotros.org.», «Falta configurar la conexión con Meta en el servidor.», «Facebook no respondió.
Vuelve a intentarlo en un momento.», «Faltaron permisos para publicar. Vuelve a conectar y acéptalos todos.», «La cuenta que entró no administra
la página Somos Nosotrxs.», «La página Somos Nosotrxs no tiene ligada la cuenta de Instagram de la app.», «No se pudo guardar la conexión.
Vuelve a intentarlo.»

### Respaldo local y medición

- `respaldo-local/fixture.mjs`: `instagram_conexion` vacía al arrancar; con `RESPALDO_INSTAGRAM_CONEXION=todo` o `=sin-lectura`, conectada.
- `medir-pantallas.mjs`: el paso de la hoja abría «el primer enlace de un renglón», que ahora es «Conectar Instagram»; abre el primer renglón de
  evento. Presupuestos de `s46-admin-instagram` y `s47-admin-instagram-hoja` +8 nodos (el bloque), anotados con `--aceptar` (solo esas dos
  cambiaron).
- `scripts/ops/auditoria-ui/capturar-instagram-conectar.mjs`: las capturas y sus comprobaciones (respaldo en el puerto 8893, para no chocar con
  las capturas de otras piezas en el 8889).

## Comprobado

- `npm run lint`: 0 errores (2 avisos que ya estaban, en `capturar-inicio-vacio.mjs` y `VisorImagen.componentes.test.mjs`).
- `npm run typecheck`: sin errores.
- `npm test`: **302 archivos, 4 865 pruebas, 0 fallaron**; las nuevas, 32: `conexion.test.ts` (19: el `state` firmado —se lee, caduca a los
  10 min, otro secreto, otro admin, firma tocada, caducidad alargada, basura, azar, el secreto de `CRON_SECRET`—; la dirección del diálogo con los
  siete permisos y sin secreto; la vuelta con `fetch` falso: código → token → larga duración → permisos → páginas y lo que se guarda; `state`
  inválido de siete maneras sin llamar a Meta; cancelado; falta configurar; página ausente; página sin su Instagram o con otro; falta un
  permiso de publicar —no guarda—; falta el de leer —guarda sin él—; Meta que falla en cada paso o sin red; no se pudo guardar; nada del token,
  el código ni el secreto en la consola), `conexionEstado.test.ts` (7) y `token.test.ts` (6: Vault manda, respaldo en cada caso, una lectura por
  petición, la llamada a la función y su error sin el token).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 119 migraciones, **2 690 pruebas, 0 fallaron** (las nuevas: la
  administración, una cuenta y un visitante no guardan ni leen el token —42501—; sin Vault el token es null y guardar dice 55000 sin dejar nada;
  token raro o con espacios, 22023; quien conecta tiene que ser de la administración; la tabla la lee la administración, nadie más, y nadie la
  escribe directo, ni la llave de servicio; con un Vault de mentira, el token queda como `instagram_token`, la llave de servicio lo lee,
  reconectar cambia el mismo secreto y deja una sola fila; la tabla no tiene columna para el token; las dos funciones definer, `search_path`
  vacío y solo `service_role`). En la primera corrida falló una vez «dos a la vez: la segunda espera y ve el cartel de la primera» del banco de
  OL-467 (`cartel-a-evento-existente.test.mjs`, una carrera de tiempos que no toca esta pieza); la segunda corrida, 0 fallos.
- `npm run test:componentes`: **758 pruebas, 0 fallaron**; las nuevas, 6 (`ConexionInstagram.componentes.test.mjs`, toques reales con
  `elementFromPoint` antes de cada clic): sin conexión y «Conectar Instagram» lleva a `/api/instagram/conectar`, 44 px y dentro del aire de la
  columna; conectada con «Reconectar»; sin el permiso de leer, en el color de error; la vuelta confirma y la dirección pierde `?conectado`; el
  error dice su frase, la ✕ lo cierra y la dirección pierde `?error`; una clave desconocida no pinta nada.
- `npm run inventario`: sin novedades. `npm run medir`: 60 pantallas × 4 anchos, sin novedades (tras anotar los +8 nodos). `npm run build`:
  verde, con `/api/instagram/conectar` y `/api/instagram/vuelta`.
- La app compilada contra el respaldo (`capturar-instagram-conectar.mjs`): todo bien, sin errores de página ni de consola; el bloque arriba de
  «Para publicar»; nada cortado a 320, 390 y 430; tocar «Conectar Instagram» en local (http) no sale a Meta y vuelve con su frase; la vuelta en
  local con una sesión de administración: 303 a `?error=origen`; sin sesión, `/api/instagram/conectar` da 403; con una cuenta que no es de la
  administración, `/api/instagram/vuelta` da 403.

**Después de traer `main`** (`e0e65408`): typecheck sin errores, `npm test` 4 865 de 4 865, `npm run medir` sin novedades y
`npm run test:componentes` 759 de 760: la que falla es «al soltar, la hoja va directo a su altura…» de `src/app/lugares/HojaLugares.componentes.test.mjs`,
una prueba de gestos con tiempos que ya está en cuarentena (`pruebaConCuarentena`, se salta en la CI); no toca nada de esta pieza y falla igual
con el `useCampoVisible` de antes de OL-468. Antes de traer `main` había pasado (758 de 758).

**No se probó contra Meta de verdad** (ni producción ni el `META_APP_SECRET`): eso es la prueba del gestor de abajo.

## Capturas (`docs/rediseno/capturas-503/`, 390 × 844 a 2×, cada una abierta)

- `01-sin-conexion.png`: bajo el chip de ciudad, el grupo «Conexión»: icono de Instagram, «Sin conexión propia» / «Usa el token de respaldo» y la
  píldora «Conectar Instagram» a la derecha; debajo, «12 eventos en los próximos 7 días · 1 ya en Instagram» y «Para publicar · 11».
- `02-error-solo-en-el-dominio.png`: después de tocar «Conectar Instagram» en local: el aviso negro «Conectar Instagram solo funciona en
  somosnosotros.org.» con su ✕, encima del grupo «Conexión».
- `03-error-pagina.png`: la vuelta con `?error=pagina`: «La cuenta que entró no administra la página Somos Nosotrxs.» con su ✕.
- `04-conectada-vuelta.png`: la vuelta con `?conectado=1`: la tarjeta blanca con la palomita verde «Instagram quedó conectado» y, debajo,
  «Conectada como Somos Nosotrxs (@smsnstrsapp)» (en dos renglones) / «Publica y lee cuentas · desde el 7 de octubre» (el reloj fijo del
  respaldo) y «Reconectar».
- `05-conectada.png`: lo mismo al recargar, sin la confirmación. `05b-conectada-320.png`: a 320, el título en tres renglones y el detalle en
  dos; «Reconectar» entero y nada cortado.
- `06-falta-permiso-leer.png`: «Falta el permiso para leer cuentas: reconecta», en rojo, con «Reconectar».

## Lo que hay que configurar (antes de la prueba)

1. **Supabase:** aplicar la migración `20261029180000_instagram_conexion.sql`. Vault ya está (lo usan los latidos de OL-444 y OL-465); si no,
   guardar responde «No se pudo guardar la conexión» y nada cambia.
2. **Vercel (el founder):** `META_APP_SECRET` = el secreto de la app «Somos Nosotrxs Publicador» (Meta › Configuración de la app › Básica),
   **sensible**, en Production (y en Preview solo si se quiere probar ahí; ver 3). Ya están y se usan: `CRON_SECRET` (firma el `state`),
   `FACEBOOK_PAGE_ID` = 1374817622385572, `INSTAGRAM_USER_ID` = 17841467252446250, `SUPABASE_SERVICE_ROLE_KEY` e `INSTAGRAM_TOKEN` (queda de
   respaldo: no borrarlo hasta que la conexión propia esté probada). Redesplegar después de añadir la variable.
3. **Meta (el gestor), app 1459504089615420:** en el producto «Inicio de sesión con Facebook» › Configuración, «URI de redireccionamiento de
   OAuth válidos» = `https://somosnosotros.org/api/instagram/vuelta` (exacta; con «Inicio de sesión de OAuth de cliente» y «de OAuth web»
   activados y «Forzar HTTPS»). Las vistas previas de Vercel tienen otro host: solo funcionarían si se añade su dirección exacta. Los permisos
   que pide el diálogo: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`,
   `instagram_manage_insights`, `business_management` (todos ya en la app; con acceso estándar bastan para quien tiene rol en la app).

## Lo que el gestor debe probar en producción

1. Con la cuenta del founder (administración) en somosnosotros.org: Administración › Instagram › «Conectar Instagram» → el diálogo de Meta pide
   la página Somos Nosotrxs y @smsnstrsapp y los siete permisos → aceptar → vuelve con «Instagram quedó conectado» y el renglón dice «Conectada
   como Somos Nosotrxs (@smsnstrsapp) · Publica y lee cuentas · desde el 28 de octubre». Si dice «Falta el permiso para leer cuentas», en el
   diálogo no se aceptó `instagram_manage_insights` (o la app no lo ofrece): «Reconectar».
2. En la base: `select pagina_id, instagram_usuario, permisos, conectado_en from public.instagram_conexion;` (sin token) y
   `select name from vault.secrets where name = 'instagram_token';` (una fila). **No** leer `vault.decrypted_secrets` en el editor: mostraría el
   token.
3. Publicar algo de prueba desde la lista (o reintentar en Facebook) para ver que la cola usa el token nuevo.
4. Business Discovery con el token guardado, sin imprimirlo: desde la Mac, un guion con la llave de servicio que llame a `rpc('instagram_token')`
   y luego a `GET https://graph.facebook.com/v23.0/17841467252446250?fields=business_discovery.username(<cuenta profesional de un lugar>){username,media_count,media.limit(3){caption,media_type,media_url,timestamp,permalink}}`
   pasando el token solo en la llamada e imprimiendo solo la respuesta (es la fase 0 de `vigilancia-instagram-lugares.md` §9). Si responde
   con `caption` y `media_url`, el permiso está; un error 10 o 200 es que falta.
5. Si algo sale mal, la vuelta lo dice con su frase y nada cambia: la app sigue con `INSTAGRAM_TOKEN`. Para volver atrás del todo: borrar el
   secreto `instagram_token` de Vault y la fila de `instagram_conexion` (la app vuelve sola al de respaldo).

## Dudas y decisiones por confirmar

- La versión del diálogo (`v23.0` en vez de `v21.0`, arriba).
- Sin `instagram_manage_insights` la conexión se guarda igual (publicar funciona) y el bloque pide reconectar; sin los de publicar no se guarda.
  ¿Es lo que quiere el gestor, o prefiere no guardar nada si falta el de leer?
- Una vez guardado, el token de Vault manda sobre `INSTAGRAM_TOKEN`. Si la conexión propia perdiera un permiso, el respaldo no entra solo:
  hay que reconectar (el bloque lo dice).
- El nombre de la migración no venía en el encargo: `20261029180000` (confirmar que ninguna otra pieza en curso tomó un número posterior que
  deba ir antes).
