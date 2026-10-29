# 508 · Los avisos a la app del iPhone no llegan: el error real de APNs, la llave bien leída y las direcciones muertas

**Pieza:** OL-476. **Rama:** `avisos-apns-error`, base `origin/main` (`a047afa9`). **Fecha:** 2026-10-29. **Operador:** agente del Gestor de cambios VII (Opus 5.5, árbol aislado).
**Manda:** el founder (2026-10-29): «Quiero que las notificaciones funcionen muy bien. Ese es nuestro gancho», y lo que el gestor midió en producción ese día (`avisos_entregas`, 14 días): **0 avisos a la app nativa**; 12 entregas APNs fallidas con `worker_dependencia` tras 8 intentos y 3 caducadas; Safari 9 enviadas y 12 fallidas `push_410`; Chrome 10 fallidas `push_410`. Investigación: `docs/investigaciones/avisos-con-la-app-nativa.md` (rama `investigacion-avisos-app`, §4.b).
**Estado:** hecho, con una migración (`20261029120000_avisos_direcciones_muertas.sql`) y una ruta nueva (`/api/avisos/prueba`); sin variables nuevas. Espera el «publica» del founder. No toqué producción, `.env` ni llaves.

Términos (una línea cada uno):
- **APNs:** el servicio de Apple que entrega los avisos a la app de la tienda.
- **JWT / llave `.p8`:** la firma con la que el servidor le demuestra a Apple que es de la cuenta del founder; se hace con la llave que Apple deja bajar una sola vez (`APNS_KEY_P8` en Vercel) y su id (`APNS_KEY_ID`).
- **HTTP/2:** la forma de conexión que Apple exige para mandar avisos.
- **Dirección muerta:** una suscripción de navegador o un token de la app que el proveedor ya no reconoce (404/410, o en Apple 410 y 400 «BadDeviceToken»).

## 1. La causa probable, y cómo se verá en `codigo`

En `src/lib/push.ts`, dentro de `enviarPushApns`, **lo único que estaba fuera del `try` era la firma del JWT** (`jwtApns` → `crypto.sign` con el texto de `APNS_KEY_P8` tal cual). Todo lo de HTTP/2 ya estaba dentro y, si fallaba, quedaba `apns_red` (que no es lo que se vio). Una excepción fuera del `try` subía a `procesarEntrega` (`avisosWorker.ts`), cuyo `catch` la guardaba como `worker_dependencia` y la reintentaba: 8 intentos y a `fallida`. Safari, que pasa por el mismo trabajador y las mismas llamadas a la base, sí salió 9 veces, así que la base y el trabajador funcionan: lo que lanza es lo propio de APNs, y eso es la firma.

`crypto.sign` lanza cuando el texto no se puede leer como llave. La forma más común de que pase: al pegar el `.p8` en Vercel quedó con `\n` escritos en vez de saltos de línea (o le faltan las líneas `-----BEGIN/END PRIVATE KEY-----`, o va entre comillas). **Causa probable: la llave en Vercel tiene un formato que Node no lee** (confirmarlo con la prueba de humo, §5). La segunda posibilidad (la sesión HTTP/2 desde Vercel) no daba `worker_dependencia`; aun así la cambié (§2.3).

Lo que dirá `codigo` desde esta pieza en vez de `worker_dependencia`:

| `codigo` | Qué quiere decir | Estado |
|---|---|---|
| `aceptado` | Apple lo aceptó | `enviada` |
| `apns_llave` | `APNS_KEY_P8` no se lee como llave EC P-256 ni tolerando los `\n`, las comillas o la falta de BEGIN/END | `fallida` **al primer intento** (no 8) |
| `apns_jwt` | la llave se leyó pero la firma falló | `fallida` al primer intento |
| `apns_config` | falta `APNS_KEY_ID` o `APNS_KEY_P8` | se reintenta (como antes) |
| `apns_403_invalidprovidertoken` / `apns_403_expiredprovidertoken` | Apple rechazó la firma: el id no es el de esa llave, la llave se revocó o no tiene APNs | `fallida` |
| `apns_410_unregistered`, `apns_410_sin_razon`, `apns_400_baddevicetoken` | el token ya no existe (o es de sandbox y se mandó a producción): **dirección muerta** | `fallida` y se marca `muerta_en` |
| `apns_400_<razón>` (p. ej. `devicetokennotfortopic`, `topicdisallowed`, `payloadtoolarge`) | otro rechazo permanente de Apple, con su razón | `fallida` |
| `apns_429_…`, `apns_5xx` | Apple saturado o caído | se reintenta |
| `apns_timeout`, `apns_abortado` | sin respuesta en el plazo, o se acabó el tiempo del trabajador | se reintenta |
| `apns_red_<errno>` (p. ej. `apns_red_enotfound`, `apns_red_econnreset`), `apns_tls_<código>`, `apns_http2_<código>` (p. ej. `apns_http2_stream_error`, `apns_http2_sesion_cerrada`) | la conexión HTTP/2 falló, con el código de Node | se reintenta |
| `push_<status>` / `push_red` | Web Push, como antes (404/410 ahora marcan la suscripción) | igual que antes |
| `avisos_base_<llamada>[_<código>]` (p. ej. `avisos_base_preparar_57014`), `avisos_auth`, `avisos_timeout`, `avisos_presupuesto` | falló la base, Auth o el plazo del trabajador | se reintenta |
| `excepcion_<clase>` (p. ej. `excepcion_typeerror`) | cualquier otra excepción | se reintenta |

La base exige `^[a-z0-9_]{1,60}$` en `codigo` (`avisos_terminar`); por eso los códigos van en minúsculas con guiones bajos (`excepcion_typeerror`, no `excepcion:TypeError`), y el trabajador normaliza cualquier código antes de guardarlo (`codigoSeguro`). No hizo falta ampliar la columna.

En el registro de Vercel queda una línea por fallo, sin el cuerpo del aviso, correos, direcciones ni tokens: `avisos: la entrega se aplaza (<código>) · <Clase>: <mensaje limpio>`, `avisos: APNs sin respuesta (<código>): …`, `avisos: APNS_KEY_P8 no se puede leer como llave EC P-256 (forma: pem_escapada|pem|pem_en_una_linea|sin_encabezado|otra)…` (una vez por instancia) y `avisos: APNs rechazó el JWT (InvalidProviderToken); revisar APNS_KEY_ID y APNS_KEY_P8 en Vercel`.

## 2. Qué cambió

1. **El error real** (`src/lib/avisosWorker.ts`): los dos `catch` (avisos y aviso a la administración) guardan `codigoDeExcepcion(e)` y escriben `mensajeSeguro(e)` con `console.error` (quita lo que va entre comillas, correos, direcciones y cadenas hexadecimales largas, y corta a 200 caracteres). `rpc` dice qué llamada falló y su código de PostgREST/Postgres (`avisos_base_<llamada>_<código>`), nunca el mensaje.
2. **La llave** (`src/lib/push.ts`, `leerLlaveApns`): quita comillas, cambia `\n`/`\r` literales por saltos, quita BEGIN/END y espacios, y lee el base64 como DER (PKCS#8; si no, SEC1). Solo acepta EC P-256. El `APNS_KEY_ID` se recorta (un salto de línea al final, fácil al pegar, haría que Apple respondiera InvalidProviderToken). La llave leída se guarda en memoria y el JWT se reutiliza 55 minutos, como antes. `diagnosticoLlaveApns()` dice la forma y si se lee, sin revelar nada.
3. **HTTP/2** (`peticionApns`): una sesión por envío, cerrada al terminar (antes, una por servidor guardada entre llamadas: en una función de Vercel la instancia se congela entre invocaciones y una sesión guardada puede despertar muerta). El plazo cubre la conexión; el `signal` del trabajador corta (`apns_abortado`, sin conectar si ya venía cortado). Errores de la sesión, del flujo y un `session.request` que lanza se traducen a código; ningún `error` queda sin oyente (en HTTP/2 eso tumba el proceso). `apns-collapse-id` se conserva (hasta 64 bytes); no había `thread-id` y no lo añadí. Al rechazar Apple el JWT se descarta el guardado y se firma otra vez la próxima.
4. **Direcciones muertas** (migración, §3): nada se borra. `push.ts` ya no borra el token APNs ante 410/BadDeviceToken; lo marca `avisos_terminar`. Fuera de la cola (el aviso al terminar de publicar en redes, `src/lib/redes/herramientas.ts`, y la prueba de humo) `marcarDireccionMuerta` hace lo mismo, y el aviso de redes ya no lee las muertas. Volver a darlas de alta las revive: `src/app/perfil/acciones.ts` manda `muerta_en: null` en los dos `upsert`.
5. **Prueba de humo** (`src/app/api/avisos/prueba/route.ts`, §5).

No toqué `src/app/layout.tsx` ni `apps/ios` (OL-474, otro operador).

## 3. Migración `20261029120000_avisos_direcciones_muertas.sql` (solo añade)

- Columnas nulas `muerta_en timestamptz` en `suscripciones_push` y `dispositivos_apns`, con comentario.
- **Relleno:** las suscripciones cuyo último aviso falló con `push_404`/`push_410` (cola principal o de administración) quedan muertas desde ese fallo, salvo que después hayan recibido uno con éxito. En producción deberían ser las de las 22 entregas de Safari y Chrome. Solo llena la columna nueva.
- `avisos_terminar` (cola principal): con `fallida`, `push_404`/`push_410` marcan la suscripción; `apns_410`, `apns_410_*` y `apns_400_baddevicetoken` marcan el dispositivo, salvo que la app lo haya vuelto a registrar después de que salió el aviso (`actualizado_en` posterior a `primer_intento`). Misma regla que `esDireccionMuerta` en `push.ts`.
- `avisos_expandir`: no crea entregas para direcciones muertas. `avisos_autorizar`: una entrega ya creada para una dirección que murió después se descarta con `direccion_muerta`.
- Aviso a la administración: `avisos_admin_expandir`, `avisos_admin_autorizar` y `avisos_admin_terminar`, lo mismo (solo usa suscripciones de navegador).
- `mi_push_activo`: una dirección muerta no cuenta como «encendido»; así ese teléfono se ve apagado y, al encenderlo, `suscribirPush` da de baja la suscripción vieja del navegador y pide una nueva (ya lo hacía con una que no reconoce como suya).
- `limitar_suscripciones_push`: el cupo de diez teléfonos cuenta solo los vivos (si no, diez muertas impedirían dar de alta el teléfono nuevo).
- Todas `create or replace` de su última versión (dicha en la cabecera del archivo), `security definer`, `search_path` vacío, mismas firmas, y los permisos repetidos al final: las de la cola y la administración solo `service_role`; `mi_push_activo` solo `authenticated`.

## 4. Pruebas

- **Unitarias** (`npm test`): **302 archivos, 4 916 pruebas, 0 fallaron** (tras unir `origin/main` en `8515e298`). Nuevas o cambiadas:
  - `src/lib/pushApns.test.ts` (40): la llave en cinco formas (saltos reales, `\n` literales, sin BEGIN/END, entre comillas, en una línea con espacios) firma un JWT que se verifica con la llave pública de la prueba; SEC1 sí, RSA y P-384 no; tres llaves ilegibles dan `apns_llave` `fallida` sin conectar y un solo aviso en el registro sin el contenido; el id con salto de línea se recorta; `diagnosticoLlaveApns`; una sesión por envío que se cierra; `apns-collapse-id` a 64 bytes; 410, 410 sin cuerpo, BadDeviceToken, otro 400, 403 InvalidProviderToken, 500/503 con su código; `marcarDireccionMuerta`; DNS, flujo cortado, TLS, sesión cerrada, `request` que lanza, plazo y `signal`; el registro sin token ni cuerpo. Todas con llaves EC P-256 generadas en la prueba.
  - `src/lib/avisosWorker.test.ts` (27): `excepcion_<clase>` en vez de `worker_dependencia`, los errores propios tal cual, el código del proveedor normalizado, `apns_llave` como `fallida`, lo mismo en la cola de administración, y el registro sin cuerpo, correo, dirección ni token.
  - `src/app/api/avisos/prueba/route.test.ts` (4): sin secreto 401; sin id 400; un aviso por teléfono con el código y la huella, sin tokens; llave ilegible.
  - `src/app/perfil/acciones.test.ts`: los `upsert` mandan `muerta_en: null`.
- **Banco de la base** (`TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`): **119 migraciones, 2 706 pruebas, 0 fallaron**, con `supabase/tests/pg/push-direcciones-muertas.test.mjs` nuevo: un 400 no marca y un 410 sí (web y APNs, sin borrar), la carrera del token que la app volvió a registrar, un 403 no marca, el código sigue limitado; el siguiente aviso solo crea entregas para las vivas; una entrega ya creada para una que murió se descarta con `direccion_muerta`; `mi_push_activo` las ve apagadas; volver a darlas de alta las revive; el cupo de diez con diez muertas deja pasar la undécima (y con diez vivas no); el aviso a la administración igual; el relleno de la migración (corre el mismo `update` del archivo sobre filas sembradas); permisos y `search_path` vacío. **Control negativo:** sin el filtro `muerta_en is null` en `avisos_expandir`, el banco falla («el siguiente aviso solo crea entregas para las direcciones vivas»).
- **Una llamada real al servidor de pruebas de Apple** (`api.sandbox.push.apple.com`) desde esta Mac, con una llave inventada en la prueba y un token falso (archivo temporal, borrado, sin comitear): respondió `{"estado":"fallida","codigo":"apns_403_invalidprovidertoken"}` y la línea del registro. Confirma de punta a punta la sesión HTTP/2 por envío, el cierre (el proceso terminó solo) y la lectura de la razón de Apple.
- `npm run lint` (0 errores; 2 avisos ajenos), `npm run typecheck`, `npm run build` (verde; `/api/avisos/prueba` aparece como función), `npm run inventario` (sin novedades). Sin pantalla nueva: no hay captura móvil.

## 5. Guion del gestor para producción

**Después del «publica»** (la migración aplicada y el despliegue de Vercel en verde):

1. **El id de la persona** (el founder), sin imprimir correos ni tokens:
   ```sql
   select usuario_id, count(*) telefonos, max(actualizado_en) ultimo from public.dispositivos_apns group by 1;
   ```
2. **La prueba de humo**, desde el editor SQL de Supabase, con la dirección y el secreto que ya usa el latido (Vault: `avisos_url`, `avisos_cron_secret`); el secreto no se ve:
   ```sql
   select net.http_post(
     url := regexp_replace((select decrypted_secret from vault.decrypted_secrets where name = 'avisos_url'), '/api/avisos-pendientes/?$', '/api/avisos/prueba'),
     body := jsonb_build_object('usuario_id', '<id del founder>'),
     headers := jsonb_build_object('Content-Type', 'application/json',
       'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_cron_secret')),
     timeout_milliseconds := 25000) as peticion;
   -- unos segundos después, con el número que devolvió:
   select status_code, content::jsonb from net._http_response where id = <peticion>;
   ```
   O con `curl` si se tiene `CRON_SECRET` a mano: `curl -sS -X POST https://somosnosotros.org/api/avisos/prueba -H "Authorization: Bearer $CRON_SECRET" -H 'Content-Type: application/json' -d '{"usuario_id":"<id>"}'`.
   La respuesta: `apns` (`keyId`: ok/rara/falta; `llave`: la forma en que llegó; `legible`; `jwt`) y, por teléfono, `huella` (8 caracteres, no el token), `entorno`, `actualizado_en`, `muerta_antes`, `estado`, `codigo`, `marcada_muerta`. En el iPhone del founder debe aparecer «Prueba de avisos · <hora>».
3. **Leer `codigo`:**
   - `aceptado` y el aviso aparece: arreglado. Si `apns.llave` era `pem_escapada` o `sin_encabezado`, esa era la causa y ya se tolera; no hace falta tocar Vercel.
   - `apns_llave` (o `apns.legible: false`): **el founder cambia la llave en Vercel** → proyecto `somosnosotros` → Settings → Environment Variables → `APNS_KEY_P8` (Production) → editar → pegar **el contenido completo del archivo `.p8`** tal como se abre en un editor de texto (con sus líneas `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`). Si el texto ya era ese, el valor no es esa llave (cortado, otro archivo): bajar el `.p8` de nuevo no se puede, así que crear una llave nueva en developer.apple.com → Keys (con «Apple Push Notifications service»), y poner su `.p8` y su Key ID. **Después, «Redeploy»** del último despliegue (Vercel solo aplica variables a despliegues nuevos) y repetir el paso 2.
   - `apns_403_invalidprovidertoken`: la llave se lee pero Apple no la reconoce: `APNS_KEY_ID` no es el id de esa llave (o tiene un carácter de más; `apns.keyId: rara` lo delata), la llave se revocó o no tiene APNs. Corregir el Key ID en Vercel (o crear una llave nueva como arriba) y «Redeploy».
   - `apns_400_baddevicetoken` / `apns_410_unregistered`: la llave funciona y ese token ya no sirve (queda `marcada_muerta: true`). El founder abre la app (la de TestFlight o la tienda), va a Ajustes y apaga y enciende los avisos, y se repite el paso 2. Si vuelve a dar BadDeviceToken con `entorno: produccion`, la compilación es de depuración (sandbox) y su entorno se registró mal: avisar.
   - `apns_400_devicetokennotfortopic` / `apns_400_topicdisallowed`: el token o la llave no son de `org.somosnosotros.app` / del equipo `AT53235M7U`. Avisar antes de tocar nada.
   - `apns_red_*`, `apns_tls_*`, `apns_http2_*`, `apns_timeout`: la conexión desde Vercel; repetir una vez y, si sigue, traer el código.
4. **Vigilar la cola** al día siguiente:
   ```sql
   select case when endpoint like 'apns:%' then 'app' when endpoint like '%push.apple.com%' then 'safari' else 'otro' end medio,
     estado, codigo, count(*) from public.avisos_entregas
   where canal = 'push' and disponible > now() - interval '1 day' group by 1, 2, 3 order by 1, 2, 3;
   select count(*) filter (where muerta_en is not null) muertas, count(*) total from public.suscripciones_push;
   ```
   Ya no deben salir `worker_dependencia` nuevas ni `push_410` repetidos en la misma dirección. Las 12 viejas se quedan como están.

## 6. Dudas y lo que no cubre

- **El aviso a la administración no va a la app del iPhone:** `avisos_admin_expandir` solo usa suscripciones de navegador (desde OL-115, antes de la app). Si el founder solo tiene la app, no recibe «Administración». No lo cambié (fuera de esta pieza); es una línea más en esa función si se quiere.
- La causa queda «probable» hasta correr el paso 2: el código demuestra que lo que lanzaba era la firma, pero no si la llave estaba mal pegada o era otra.
- Un token APNs que Apple da por muerto revive si la app lo vuelve a registrar con el mismo valor (por ejemplo, al abrir Ajustes): es lo que se quiere tras arreglar un entorno, y si sigue muerto se vuelve a marcar al siguiente aviso.
- `quedanDispositivos` y `activar_mis_avisos_push` siguen contando las direcciones muertas: dar de baja un teléfono no apaga la cuenta mientras haya una muerta. Es lo de antes; no lo toqué.
