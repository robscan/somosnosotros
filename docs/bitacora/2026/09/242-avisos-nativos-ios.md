# 242 · Avisos nativos en la app de iPhone (OL-213)

**Fecha:** 2026-09-25 · **Rama:** `avisos-nativos-ios` · **Quién:** operador nuevo (Sonnet 5)

## Pedido

Dentro de la app el navegador interno de iOS no tiene notificaciones web (`src/lib/pushCliente.ts` ya lo detecta: sin `PushManager`), así que los avisos («se publicó un evento en un lugar/artista que sigues», recordatorios) son el principal valor nativo frente a la guía 4.2 de App Store. Founder: «sí, arranca con esas recomendaciones».

## Qué se hizo

### 1. App (Capacitor)

- **Dependencia:** `@capacitor/push-notifications@8.1.2` en `apps/ios/package.json` (única nueva). La justifica: es el plugin oficial que expone `register()`/`requestPermissions()` y reenvía el token de APNs a JS; sin él no hay puente nativo para pedir permiso ni recibir el token. `npx cap sync ios` regeneró `Package.swift` (diff de una sola línea añadida, en su propio bloque).
- **`App.entitlements`:** `aps-environment = development`. Xcode lo cambia a `production` al firmar con el perfil de distribución al archivar/exportar (comprobado leyendo la documentación de Apple; no se pudo archivar de verdad en este entorno — lo dice la guía para el founder más abajo).
- **`AppDelegate.swift`:** los dos métodos de `UIApplicationDelegate` que exige Capacitor (boilerplate documentado): reenvían el token o el error del sistema al `NotificationCenter` que ya escucha `PushNotificationsPlugin` (leído directo de `node_modules/@capacitor/push-notifications/ios/Sources/.../PushNotificationsPlugin.swift`, no adivinado).
- **`EntornoApnsPlugin.swift`** (nuevo, sin paquete de npm — igual que `EntrarSistemaPlugin`/`GestoAtrasPlugin`): un método, `entorno()`, que responde `"sandbox"` o `"produccion"` según `#if DEBUG`. Es la única forma de que la web sepa qué entorno guardar junto al token (la propia app lo sabe por su certificado; la web no).
- **`MainViewController.swift`:** ahora conforma `NotificationHandlerProtocol` (API de Capacitor 8 para esto, `bridge.notificationRouter.pushNotificationHandler`, leída en `node_modules/@capacitor/ios/.../NotificationRouter.swift`) y se registra a sí misma **después** de `super.capacitorDidLoad()`, sustituyendo a propósito al handler que registra `PushNotificationsPlugin.load()`. `willPresent` muestra el aviso con la app abierta (banner + sonido); `didReceive` toma la URL del aviso (`content.userInfo["url"]`, el mismo campo que arma `payloadApns` en `push.ts`) y la carga en el WKWebView — el mismo camino que un enlace universal (`observarEnlaceUniversal` en `SceneDelegate.swift`).
- No se tocó `capacitor.config.ts`, `Package.swift` fuera de la línea propia, ni ningún archivo de OL-214/OL-215.

### 2. Web dentro de la app (sin paquete nuevo en la web)

`src/lib/appNativa.ts` ya distingue la app por el user-agent. Capacitor inyecta `window.Capacitor.Plugins.*` en cualquier página que cargue (bridge nativo, no depende de que la web importe el paquete), así que **no hace falta ningún nuevo `import` en `package.json` de la raíz**: `src/lib/pushCliente.ts` llama al puente por su nombre.

- `disponibilidadPush`, `estadoPush`, `suscribirPush` y `desuscribirPush` se desvían a un puente nativo cuando `esAppNativa(navigator.userAgent)`: piden permiso con `PushNotifications.requestPermissions()`, registran con `register()` y esperan el token por el evento `registration` (con el mismo tope de 8 s que ya usa el archivo para el permiso silencioso de Chrome), y piden el entorno a `EntornoApns.entorno()`.
- `src/lib/plataforma.ts`: `decidirEstadoPush` gana un campo opcional `nativo` — sin él, dentro de la app (que no es una PWA "instalada" en el sentido de `display-mode: standalone`) el código VIEJO mandaba a "instalar-primero" y exigía la llave VAPID, dos cosas que no aplican dentro de la app real. Cambio aditivo: los llamadores existentes (web) no pasan `nativo` y su comportamiento no cambia (25 pruebas de `plataforma.test.ts` sin tocar, más 2 nuevas).
- **Un solo punto de entrada para las tres pantallas que ya ofrecían avisos** (`ActivarAvisos.tsx`, `ConsentimientoAvisos.tsx`, `AvisosPerfil.tsx`): todas llaman `guardarSuscripcionPush(alta.sub)` sin saber si `alta.sub` es `{ endpoint, keys }` (navegador) o `{ apns: { token, entorno } }` (app) — la función en `src/app/perfil/acciones.ts` distingue y guarda en la tabla que corresponda. Solo `AvisosPerfil.tsx` necesitó un cambio real (2 líneas: `desuscribirPush()` ahora devuelve `{ tipo, endpoint|token } | null` en vez de `string | null`).
- `borrarSuscripcionPush` (acciones.ts) ahora cuenta AMBAS tablas (`suscripciones_push` + `dispositivos_apns`) antes de apagar `avisos_push` de la cuenta: sin esto, borrar el último navegador de alguien con la app instalada apagaría sus avisos nativos sin querer.

### 3. Datos (migración que solo añade)

`supabase/migrations/20260925160000_dispositivos_apns.sql`:
- Tabla `dispositivos_apns` (token, usuario_id, entorno `sandbox|produccion`, creado/actualizado). RLS: cada cuenta ve/crea/borra solo los suyos. `on delete cascade` desde `perfiles`.
- **Para que quien SOLO tiene la app (sin ninguna suscripción de navegador) también reciba avisos**, la misma migración reemplaza (`create or replace function`, sin tocar filas ni romper nada existente) las dos funciones del motor de avisos fiables que lo necesitan:
  - `avisos_expandir()`: el `insert` al canal `'push'` ahora sale de un `union all` entre `suscripciones_push` y `dispositivos_apns` (endpoint sintético `'apns:'||token`, que nunca choca con una URL `https://`). Alguien con navegador Y app recibe dos entregas push, una por dispositivo.
  - `avisos_autorizar()`: cuando el endpoint empieza con `'apns:'`, arma `{ apns: { token, entorno } }` en vez de `{ endpoint, keys }`; si el dispositivo ya no existe, descarta con `sin_endpoint` — igual que un endpoint de navegador retirado.
  - Sin esto, un usuario solo-app jamás habría tenido ninguna fila en `avisos_entregas` y la pieza no serviría para el caso que la motiva.
- Prueba en `supabase/tests/pg/dispositivos-apns.test.mjs`: RLS, restricciones de columna, cascada, y una integración real con `guardar_evento_con_avisos`/`avisos_expandir`/`avisos_autorizar` (un usuario solo con la app, uno con navegador y app, y el descarte al retirar el dispositivo). El claim se simula a mano sobre las filas propias en vez de usar `avisos_tomar()`: esa función reparte por los cuatro slots **globales** de toda la base efímera de la suite (compartida entre archivos, no una por archivo), y competiría con lo que deje pendiente `avisos-fiables.test.mjs`.

### 4. Envío (`src/lib/push.ts`, `src/lib/avisosWorker.ts`)

- `enviarPushApns`: JWT ES256 (RFC 7519) firmado con `node:crypto` (`sign("sha256", ..., { key: p8, dsaEncoding: "ieee-p1363" })` — sin ese `dsaEncoding` la firma sale en DER y APNs la rechaza), cacheado 55 minutos. Equipo `AT53235M7U` y tema `org.somosnosotros.app` como constantes. Petición HTTP/2 con `node:http2`, una sesión reutilizada por host (`api.push.apple.com` / `api.sandbox.push.apple.com`, según el `entorno` guardado con el token). `apns-collapse-id` con el mismo `tag` que ya usa Web Push, para agrupar reintentos.
- Tokens inválidos (410, o 400 con razón `BadDeviceToken`/`Unregistered`) se borran de una vez. **Precisión sobre el encargo:** dice "como ya se hace con las suscripciones web caducadas", pero la bitácora 113 (avisos fiables) registra lo contrario — un endpoint 404/410 queda fallido en esa entrega, sin borrarse, "para no eliminar una suscripción renovada concurrentemente"; la depuración quedó pendiente separada. Para APNs sí se implementó el borrado inmediato porque el riesgo que motivaba no borrar en web no aplica igual: un token de dispositivo vencido no se "renueva" con el mismo valor (la app pide uno nuevo la próxima vez que registre), así que no hay una carrera equivalente que perder.
- Sin `APNS_KEY_ID`/`APNS_KEY_P8`, el envío se salta con un `console.warn` (una sola vez) y responde `reintentar`, sin romper nada — el mismo patrón que ya usa `pushActivo()` para VAPID.
- `enviarPush` (nuevo, en `push.ts`) distingue la forma de `suscripcion` y manda por Web Push o por APNs; `avisosWorker.ts` solo cambió el nombre de la dependencia inyectada (`enviarPushEndpoint` → `enviarPush`), nada de su lógica de reintentos/lease/idempotencia.
- `.env.example`: `APNS_KEY_ID` y `APNS_KEY_P8` añadidas, sin valores.

## Guía para el founder (llano, paso a paso)

1. **developer.apple.com** → **Certificates, Identifiers & Profiles** → **Keys** → **"+"**.
2. Nombre: «Somos Nosotros APNs». Marca **Apple Push Notifications service (APNs)**. **Configure** → entorno **«Sandbox & Production»** (el identificador `org.somosnosotros.app` ya tiene Push Notifications activado desde que se creó, 2026-09-16) → **Register**.
3. **Descarga el .p8** (Apple solo deja bajarlo una vez; guárdalo bien) y anota el **Key ID** que aparece junto a la llave.
4. En **Vercel** → proyecto `somosnosotros` → **Settings** → **Environment Variables**, en **Production**: `APNS_KEY_ID` (el Key ID) y `APNS_KEY_P8` (el contenido completo del archivo .p8, con las líneas `-----BEGIN/END PRIVATE KEY-----`).
5. Nada más que hacer en Apple Developer: el identificador ya tenía Push Notifications.

## Evidencia

- `npm run lint && npm run typecheck && npm test` → 107 archivos, **1353 pruebas**, verde. `npm run build` (Next/Turbopack) verde. `npm run test:db` (contra `sn_control` local) → **964 pruebas**, verde (incluye las 18 nuevas de `dispositivos-apns.test.mjs`, y confirma que las funciones reemplazadas del motor de avisos fiables no rompieron ninguna de las existentes).
- Pruebas unitarias nuevas: `src/lib/pushApns.test.ts` (17, incluida la verificación real de la firma ES256 contra una llave de prueba generada en la propia prueba, con `crypto.verify`), `src/lib/plataforma.test.ts` (+2, el caso `nativo`), `src/lib/pushCliente.test.ts` (+13, todo el flujo nativo con un puente simulado), `src/app/perfil/acciones.test.ts` (+14, `guardarSuscripcionPush`/`tokenApnsActivo`/`borrarSuscripcionPush`).
- **Compilación para simulador:** `xcodebuild -scheme App -sdk iphonesimulator` en verde, sin advertencias nuevas.
- **Simulador propio** (`OL-213 iPhone 17`, iOS 26.3; creado y borrado al terminar, junto con `DerivedData`): para probar el permiso/token/entrega sin una cuenta desechable con correo real (bloqueado en este entorno: sin `.env.local`, sin copiar el `.env` del founder), `server.url` de `capacitor.config.ts` se apuntó **solo en el árbol de trabajo, nunca comiteado** (confirmado con `git diff` antes y después) a `www/index.html`, temporalmente reemplazado por un arnés de una página que llama al puente directo. Revertido a la producción real antes de terminar (`git checkout`, `git status` limpio, recompilado de nuevo en verde apuntando a `https://somosnosotros.org`).
  - `docs/rediseno/capturas-242/00-arnes-cargado.png`: `Capacitor: true`, `PushNotifications: true`, `EntornoApns: true` — el puente nativo está.
  - `docs/rediseno/capturas-242/01-pide-permiso.png`: el diálogo real del sistema, «Somos Nosotros quiere enviarte notificaciones».
  - `docs/rediseno/capturas-242/02-token-y-entorno.png`: tras «Permitir», el registro completo — `permiso: {"receive":"granted"}`, `register() llamado`, `entorno: {"entorno":"sandbox"}` (correcto: build de Debug/simulador) y un **token real de APNs sandbox** de 64 caracteres hexadecimales, entregado por `AppDelegate.swift` → `NotificationCenter` → `PushNotificationsPlugin` → evento `registration`.
  - `docs/rediseno/capturas-242/03-toque-abre-ficha.png`: con `xcrun simctl push` (payload con `aps.alert` y una `url` de un evento real) se vio el banner en el inicio del teléfono y, al tocarlo, la app abrió exactamente esa ficha (`LXS COLOCAOS: La última fogueada`) — confirma `MainViewController.didReceive` cargando la URL del aviso, el mismo camino que un enlace universal.
- **Lo que NO quedó verificado en vivo:** el registro de un token dentro del recorrido real de la app (`ActivarAvisos`/`ConsentimientoAvisos`/`AvisosPerfil`, que exigen sesión) — se verificó el mecanismo nativo completo (permiso, token, entorno, entrega) con el arnés temporal descrito arriba, y la lógica de `pushCliente.ts` con pruebas unitarias del puente simulado, pero no con un usuario de verdad tocando "Activar avisos" en la agenda. Tampoco se probó `enviarPushApns` contra el servidor real de Apple (`api.sandbox.push.apple.com`): sin `APNS_KEY_ID`/`APNS_KEY_P8` (los pone el founder en Vercel) no hay manera de intentarlo desde aquí; la prueba unitaria cubre el armado del JWT, la petición HTTP/2 y el manejo de 410/BadDeviceToken con un servidor HTTP/2 simulado.
- Correos en el diff: ninguno propio; los de las pruebas son `@local.test`/`@example.invalid`, como ya usa el resto de `supabase/tests/pg/`.

## Pendiente

- El founder crea la llave .p8 y la pone en Vercel (guía arriba).
- Migración `20260925160000_dispositivos_apns.sql` sin aplicar a ninguna base remota (la aplica el gestor).
- Falta comprobar en TestFlight/un dispositivo real que `aps-environment` queda en `production` al exportar (no se pudo archivar en este entorno) y que un aviso de producción de verdad llega y abre la ficha correcta.
