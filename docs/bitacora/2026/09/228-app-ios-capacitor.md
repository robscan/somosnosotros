# 228 · Envoltorio de iPhone con Capacitor (OL-194)

**2026-09-25.** Pieza 4 de `docs/rediseno/47-app-ios.md`. Operador nuevo, rama `app-ios-capacitor`, base `origin/main` del día. Sin subagentes, council ni workflows.

## Qué leí

- `docs/rediseno/47-app-ios.md` completo: secciones 3 (avisos), 4 (inicio de sesión), 5 (permisos), 9 (enlaces profundos) y 10 (guía 4.2.2 de Apple).
- `docs/ops/ASIGNACIONES.md`: el reparto exacto de archivos de esta pieza (`apps/ios/**`, `src/app/.well-known/apple-app-site-association/route.ts`, `src/app/auth/**` y `src/lib/entrarCon.ts` solo para la vuelta; nada en `apps/android/**` ni `assetlinks.json`, otro operador trabaja ahí).
- `src/lib/entrarCon.ts`, `src/app/auth/[proveedor]/route.ts` y `fin/route.ts`, `src/app/entrar/FormularioEntrar.tsx`: cómo entra hoy la web con Apple, Google y correo.
- `src/proxy.ts`, `next.config.ts`, `src/lib/redireccionSlug.ts`: para comprobar que nada redirige `/auth/app-vuelta` ni `/.well-known/apple-app-site-association`.
- `src/lib/video.ts`, `src/lib/incrustado.ts`: dominios exactos que usan los reproductores incrustados (YouTube, Vimeo, SoundCloud, Mixcloud, Bandcamp), para `allowNavigation`.
- Grep en `src/` de `getUserMedia`, `mediaDevices`, `type="file"`, `geolocation`, `DeviceOrientationEvent`: qué permisos pide la web hoy de verdad.
- Fuentes de `@capacitor/ios` en `node_modules` (`CAPBridgeViewController.swift`, `WebViewDelegationHandler.swift`, `CAPPlugin.h`, `CAPSceneDelegateProxy.swift`) para entender cómo intercepta Capacitor la navegación y los enlaces universales antes de escribir nada nativo.

## Qué hice

### 1. `apps/ios/`

`npm install` + `npx cap add ios` con `capacitor.config.ts` (`appId: org.somosnosotros.app`, `appName: Somos Nosotros`, `server.url: https://somosnosotros.org`, `appendUserAgent: "SomosNosotrosApp"`, `allowNavigation` con Supabase (`*.supabase.co`), Mapbox y los cinco proveedores de `incrustado.ts`/`video.ts`). `webDir: www` con una sola página (`www/index.html`), la de "Sin conexión", con el símbolo SN (`docs/diseno/logotipo/LogoFinal/SN - Symbol.svg`) inline. Proyecto Xcode comiteado tal como lo deja `cap add ios`, con su propio `.gitignore` (`Pods/`, `App/build`, `DerivedData`, y `App/App/public`, que es el `www/` copiado — se regenera con `cap sync`, no se comitea).

### 2. Permisos (Info.plist)

Grep de `getUserMedia`/`mediaDevices` en `src/`: nada, cero coincidencias. La web solo abre la cámara a través de `<input type="file" accept="image/*">` (lugares, artistas, eventos, perfil), que en iOS usa la hoja nativa de fotos, sin pasar por `WKUIDelegate.decideMediaCapturePermissionFor`. Por eso el Info.plist trae `NSCameraUsageDescription` (para esa hoja) y `NSLocationWhenInUseUsageDescription` (`src/lib/ubicacion.ts`), pero no `NSMicrophoneUsageDescription`: no hay ningún uso de micrófono hoy. Si aparece un uso real (video en vivo, `getUserMedia`), hace falta además el delegado `decideMediaCapturePermissionFor` en el `WKWebView`, que no existe todavía porque no hace falta.

### 3. Entrar con Apple y Google dentro de la app, sin tocar `FormularioEntrar.tsx`

El botón de Apple/Google en la web es un `<a href="/auth/apple">` normal (`src/app/entrar/FormularioEntrar.tsx`); tocarlo estaba fuera del alcance de esta pieza. En vez de eso, la intercepción vive **a nivel nativo**, en la política de navegación del `WKWebView`:

- `apps/ios/ios/App/App/EntrarSistemaPlugin.swift` — un plugin de Capacitor sin métodos de JavaScript (`pluginMethods: []`, no hace falta ningún cambio en la web para que funcione), que usa el enganche `shouldOverrideLoad` (el mismo que Capacitor ofrece a cualquier plugin) para detectar una navegación principal hacia `appleid.apple.com` o `accounts.google.com`, cancelarla y abrir un `SFSafariViewController` sobre la propia app. No se pudo reutilizar la clase `Browser` de `@capacitor/browser` directamente (su `viewController` es `internal`, no público a otro módulo), así que se usa `SafariServices` a mano; `@capacitor/browser` queda instalado igual, documentado para JavaScript futuro.
- Este plugin no se registra solo (no tiene paquete de npm que Capacitor liste en `capacitor.config.json`): `apps/ios/ios/App/App/MainViewController.swift` lo registra a mano en `capacitorDidLoad()`, con `bridge?.registerPluginInstance(...)`, y pasa a ser el `rootViewController` en `SceneDelegate.swift`.
- La vuelta: `src/lib/entrarCon.ts` gana un campo `enApp` en `Intento` (de `nuevoIntento(p, siguiente, ahora, enApp)`) y una función pura `destinoTrasEntrar(siguiente, enApp)`. `src/app/auth/[proveedor]/route.ts` lee `?app=1` de la query y lo mete en el intento; `fin/route.ts`, tras poner la sesión con `signInWithIdToken`, manda a `destinoTrasEntrar(siguiente, intento.enApp)` en vez de directo a `siguiente`. Nueva ruta `src/app/auth/app-vuelta/route.ts` (dentro de `src/app/auth/**`): un 303 trivial a `siguiente`, cuya única razón de existir es estar bajo `/auth/*`, la única ruta que la app reclama como enlace universal.
- `SceneDelegate.swift` observa la notificación `capacitorOpenUniversalLink` (que Capacitor ya posta de serie desde su plantilla de `SceneDelegate`, sin tocar nada ahí) y, al llegar, cierra la hoja del navegador del sistema (si sigue abierta) y carga esa dirección en el `WKWebView` de la app, que para entonces ya tiene la sesión (mismo almacenamiento de `WKWebView` que Safari/`SFSafariViewController`).
- Nada de esto cambia el correo con código (`signInWithOtp`), que ya funcionaba dentro de cualquier contenedor por ser una llamada directa a Supabase sin salir de la página.

Pruebas nuevas: `src/lib/entrarCon.test.ts` (el campo `enApp` viaja igual que el resto del intento y por defecto es `false`; `destinoTrasEntrar` con y sin `enApp`), `src/app/auth/[proveedor]/fin/route.test.ts` (nuevo: con `enApp` vuelve por `/auth/app-vuelta`, sin él vuelve directo, y un fallo vuelve a `/entrar` en los dos casos) y `src/app/auth/app-vuelta/route.test.ts` (nuevo: redirige bien y con `rutaSegura`).

### 4. `apple-app-site-association`

`src/app/.well-known/apple-app-site-association/route.ts`: JSON con `applinks` (Team ID `AT53235M7U` + `org.somosnosotros.app`, componentes `/eventos/*`, `/lugares/*`, `/artistas/*`, `/auth/*`) y `webcredentials`. Content-Type `application/json` a secas (sin `charset`, que es lo que Apple espera; `NextResponse.json()` manda `application/json; charset=utf-8`, por eso se arma la respuesta a mano). Comprobado en el código (no solo supuesto) que ni `src/proxy.ts` (su `rutaConUuid` solo mira `artistas|lugares|eventos`) ni `next.config.ts` (sin reglas para `/.well-known/*`) la tocan. Prueba nueva: `src/app/.well-known/apple-app-site-association/route.test.ts`. El entitlement `applinks:somosnosotros.org` y `webcredentials:somosnosotros.org` va en `apps/ios/ios/App/App/App.entitlements`, con `CODE_SIGN_ENTITLEMENTS` apuntando ahí en las dos configuraciones del target (editado a mano en `project.pbxproj`, sin Xcode gráfico).

### 5. Borrado de cuenta

Solo comprobado, sin cambios: `src/app/ajustes/page.tsx` ya tiene `<Borrar que="mi cuenta" ... accion={borrarMiCuenta} />` (de `src/app/perfil/acciones.ts`). `/ajustes` es la misma web dentro del envoltorio, sin nada que la excluya de `allowNavigation` (es el propio dominio) ni de la intercepción de `EntrarSistemaPlugin` (que solo mira `appleid.apple.com`/`accounts.google.com`), así que ya es alcanzable dentro de la app.

### 6. Compilar y correr en el simulador

Simulador propio (`xcrun simctl create "OL-194 iPhone" ... iPhone-17-Pro ... iOS-26-3`) para no estorbar a otro chat. `xcodebuild -scheme App -destination "id=<udid>" -configuration Debug CODE_SIGNING_ALLOWED=NO build` — build verde. Instalado con `simctl install`, lanzado con `simctl launch`, capturado con `xcrun simctl io <udid> screenshot` (nunca la pantalla del sistema).

**Capturas (`docs/rediseno/capturas-228/`):**

- `01-inicio.png` — Inicio de la app, cargando la web real de producción (San Luis Potosí, "Sigue lugares y artistas", el destacado del IPBA). Confirma que `server.url` funciona y que la barra de estado y la nav inferior de la web se ven bien dentro del `WKWebView`.
- `02-entrar.png` — la pantalla de Entrar dentro de la app: "Continuar con Apple" (negro) y "Continuar con tu correo". Google no aparece porque en este proyecto de Supabase solo Apple está encendido (comportamiento normal de `botonesProveedor`, no algo de esta pieza).
- `03-apple-navegador-sistema.png` — al tocar "Continuar con Apple": se abre `appleid.apple.com` en una hoja de `SFSafariViewController` (con su "X" y su barra de Safari) **encima** de la app, no dentro del `WKWebView`. Es la prueba directa de que `EntrarSistemaPlugin.swift` funciona.
- `04-vuelta-tras-cerrar-apple.png` — al cerrar esa hoja (tocando la "X"), la app vuelve a mostrar la pantalla de Entrar intacta, no un error. Esta captura existe porque el primer intento **sí falló** (ver "Qué encontré y corregí" abajo).

No se pudo cortar la red del Mac de verdad para una captura de "Sin conexión" con la red cortada: los simuladores de iOS no traen un interruptor de wifi propio (usan la red del Mac tal cual) y cortar la red del Mac real habría afectado a otros chats trabajando en la misma carpeta a la vez — no viable en este entorno, tal como permite el encargo ("si es viable"). Se verificó en cambio que `MainViewController.swift` carga exactamente `www/index.html` cuando `NWPathMonitor` reporta `unsatisfied`, y la página en sí ya se vio renderizada al crearla (símbolo SN, "Sin conexión", botón "Reintentar").

**Universal Link:** no se pudo probar de punta a punta. Apple valida `apple-app-site-association` bajando el archivo real de `https://somosnosotros.org/.well-known/apple-app-site-association` la primera vez que el sistema necesita resolver un enlace de ese dominio (y lo cachea firmado); con la rama sin publicar, el simulador no tiene forma de completar esa validación. El entitlement y el `route.ts` están listos; falta desplegar para que el sistema pueda de verdad interceptar `/auth/app-vuelta`.

## Qué encontré y corregí (durante la prueba, no antes)

Mi primer diseño usaba la opción `server.errorPath` de Capacitor (documentada, sin código nativo) para mostrar `www/index.html` cuando fallara la carga. Al probar el flujo de Apple en el simulador, **cerrar la hoja de `SFSafariViewController` dejaba la app entera mostrando "Sin conexión"**, con la red perfectamente encendida (captura descartada, reemplazada por la 04 de arriba tras el arreglo). La causa: `WebViewDelegationHandler.didFail`/`didFailProvisionalNavigation` de Capacitor carga `errorPath` en **cualquier** navegación fallida del `WKWebView`, sin mirar el código de error — y cancelar una navegación a propósito (`shouldOverrideLoad` devolviendo `true`) cuenta como una navegación fallida para ese webview. No hay manera de decirle a Capacitor "esta cancelación no es un error de red" desde un plugin (`CAPPlugin.h` no tiene un enganche para eso). Se quitó `server.errorPath` de `capacitor.config.ts` y en su lugar `MainViewController.swift` usa `NWPathMonitor` (Network framework): solo carga `www/index.html` cuando el teléfono de verdad pierde la red, y recarga `somosnosotros.org` cuando vuelve. Documentado como límite conocido en `apps/ios/README.md`: esto no cubre "somosnosotros.org caído con el teléfono con wifi" (ese caso necesitaría filtrar el código de error de una navegación fallida sin usar `errorPath`, que no se hizo aquí por tiempo).

## Verificación

```
npm run lint       # 0 errores (1 warning preexistente en docs/diseno/logotipo/iconos-sn.mjs, ajeno a esta pieza)
npm run typecheck  # falla SOLO por la colisión conocida de LetreroCorreoLigado (OL-199/226, la arregla su operador)
npm test           # 101 archivos, 1265 pruebas, todas verdes
npm run build      # falla en el mismo punto que typecheck, por la misma colisión conocida
```

`git status` sin `Pods/`, `build/`, `DerivedData/`, `node_modules/` ni llaves (confirmado con `git add -n apps/` antes de comitear). Correos en el diff: solo `a@a.com` en un fixture de prueba (`fin/route.test.ts`) y direcciones de mantenedores de paquetes de npm dentro de `apps/ios/node_modules` (ignorado por git, nunca se comitea).

## Qué queda

- Universal Link de punta a punta: solo se puede probar tras publicar (Apple necesita bajar `apple-app-site-association` de producción).
- "Sin conexión con somosnosotros.org caído mientras el teléfono tiene wifi": no cubierto (ver arriba); pediría filtrar el código de error de la navegación fallida.
- APNs (OL-196), Wallet (OL-155), icono y pantalla de arranque finales (OL-198), nada de esto es de esta pieza.
- Certificado de distribución y perfil de aprovisionamiento para probar en un iPhone real: del founder, en developer.apple.com — no se tocó nada de su cuenta.
- La colisión de `LetreroCorreoLigado` (OL-199) sigue bloqueando `typecheck`/`build` en macOS; ajena a esta pieza, la arregla su propio operador.

## Correcciones del gestor (2026-09-25, operador nuevo, misma rama)

El gestor de cambios revisó el PR #234 y encontró un build roto en Vercel y un fallo de diseño en la vuelta de
entrar con Apple/Google. Base: `origin/main` del día (trae OL-199, la colisión de mayúsculas del letrero, ya
resuelta) mergeado sobre esta rama sin perder nada de `OPEN_LOOPS.md`.

### 1. Build roto en Vercel: `apps/**` fuera del `tsconfig.json` y del lint de la raíz

`tsconfig.json` incluye `**/*.ts` desde la raíz sin excluir `apps/`, así que `tsc` (y el `next build` que lo usa)
intentaba compilar `apps/ios/capacitor.config.ts`, que importa `@capacitor/cli` — una dependencia que solo vive en
`apps/ios/node_modules`, nunca instalada en la raíz. Arreglado añadiendo `"apps"` al `exclude` de `tsconfig.json`
y `"apps/**"` a los `globalIgnores` de `eslint.config.mjs` (vitest ya solo mira `src/**` y `scripts/**`, no hacía
falta tocarlo). Comprobado con `npm install` en la raíz (el `node_modules` de este árbol de trabajo no existía) y
`npm run typecheck && npm run build`, los dos en verde.

### 2. La sesión no pasaba a la app: `SFSafariViewController` → `ASWebAuthenticationSession`

El diseño original interceptaba la navegación del `WKWebView` hacia `appleid.apple.com`/`accounts.google.com` y la
abría en un `SFSafariViewController` sobre la propia app. Dos problemas, los dos reales (no solo teóricos):

- `SFSafariViewController` comparte las cookies de Safari.app, no las del `WKWebView` de la app. La cookie del
  intento (`sn_entrar`) y la sesión que `signInWithIdToken` deja en `/auth/[proveedor]/fin` quedaban en ese
  almacenamiento compartido con Safari, nunca en el de la app — la vista web de la app volvía sin sesión, aunque
  entrar con Apple hubiera salido bien.
- Una redirección de servidor al mismo dominio dentro de esa hoja tampoco dispara un enlace universal, así que ni
  la vuelta por `/auth/app-vuelta` (el plan original, un enlace universal reclamado en `apple-app-site-association`)
  habría llegado a tiempo.

Rediseño:

- **Swift** (`apps/ios/ios/App/App/EntrarSistemaPlugin.swift`, reescrito): `shouldOverrideLoad` ahora intercepta la
  ida a `/auth/apple` o `/auth/google` (antes, un paso más tarde, la ida a los dominios de Apple/Google), le añade
  `?app=1` y la abre en una `ASWebAuthenticationSession` con `callbackURLScheme: "somosnosotros"` (registrado en
  `Info.plist`, `CFBundleURLTypes`). Guarda una referencia fuerte a la sesión (`private var sesion`) y pone
  `presentationContextProvider` (el propio plugin, conformando `ASWebAuthenticationPresentationContextProviding`).
  Al terminar, si la vuelta trae `token_hash` y `siguiente`, carga `https://somosnosotros.org/auth/app-vuelta` con
  esos parámetros directo en el `WKWebView` de la app; si trae `error`, o si la persona cancela la hoja (no hay
  `callback`), no navega a ningún lado — la pantalla se queda en Entrar, o va a `/entrar?error=enlace` si sí hubo
  un intento fallido de armar el enlace.
- **`SceneDelegate.swift`**: se quitó la parte que cerraba `EntrarSistemaPlugin.hojaAbierta` (ya no existe esa
  hoja); el observador de `capacitorOpenUniversalLink` queda solo para enlaces universales normales (una ficha
  compartida), no para la vuelta de entrar.
- **`apple-app-site-association`** (`src/app/.well-known/apple-app-site-association/route.ts`): se quitó
  `/auth/*` de `applinks.details[0].components`. Ya no hace falta (la vuelta no usa enlaces universales) y podía
  competir con el enlace del correo si alguien lo abre fuera de la app. Sigue reclamando `/eventos/*`, `/lugares/*`
  y `/artistas/*`. Prueba actualizada.
- **Web** (`src/lib/entrarCon.ts`): se quitó `destinoTrasEntrar` (mandaba a `/auth/app-vuelta?siguiente=…`, sin
  ninguna sesión que llevar). En su lugar, `urlAppTrasEntrar(siguiente, tokenHash)` arma
  `somosnosotros://auth?token_hash=…&siguiente=…`, y `URL_APP_ERROR` es la señal fija de fallo
  (`somosnosotros://auth?error=1`).
- **`src/app/auth/[proveedor]/fin/route.ts`**: cuando `intento.enApp` es verdadero y `signInWithIdToken` salió
  bien, en vez de redirigir a `siguiente` genera un enlace mágico de un solo uso con el cliente de servicio
  (`clienteAdmin()`, `src/lib/supabase/admin.ts`; la llave nunca sale del servidor) —
  `admin.auth.admin.generateLink({ type: "magiclink", email })`, que no manda ningún correo — toma
  `data.properties.hashed_token` y redirige (303) a `urlAppTrasEntrar(siguiente, tokenHash)`. Si falla (sin correo,
  o Supabase da error), redirige a `URL_APP_ERROR`. Nunca viaja un `access_token` ni un `refresh_token`, solo el
  token de un enlace mágico de un solo uso.
- **`src/app/auth/app-vuelta/route.ts`**: antes era un 303 trivial a `siguiente` (sin comprobar nada). Ahora, con
  el cliente de servidor normal (el que escribe cookies), confirma el `token_hash` con `verifyOtp` — la misma
  llamada que ya usaba `/auth/callback` para el enlace del correo, extraída a `confirmarEnlaceMagico` en
  `src/lib/supabase/servidor.ts` para no duplicarla — y solo entonces redirige a `siguiente`; sin `token_hash` o si
  `verifyOtp` falla, redirige a `/entrar?error=enlace` (el mismo aviso que ya usa el enlace del correo cuando ya no
  sirve).
- **Pruebas**: `src/lib/entrarCon.test.ts` (se quitaron las de `destinoTrasEntrar`, se añadieron las de
  `urlAppTrasEntrar` y `URL_APP_ERROR`), `fin/route.test.ts` (rehecho: con `enApp` genera el enlace y redirige al
  esquema propio; si `generateLink` falla, redirige a `URL_APP_ERROR`; sin `enApp` la rama web normal queda
  intacta, comprobado que no toca `clienteAdmin`), `app-vuelta/route.test.ts` (rehecho: token válido confirma y
  sigue a `siguiente`; token inválido o ausente vuelve a `/entrar?error=enlace`; `siguiente` externo cae a
  `/perfil` con `rutaSegura`), `apple-app-site-association/route.test.ts` (ya no espera `/auth/*`).

**Seguridad — por qué un `token_hash` en un esquema propio es aceptable:** es el mismo mecanismo que un enlace
mágico de correo (un solo uso, caduca igual), solo que en vez de mandarlo por correo lo entrega el sistema
operativo directo a esta app. `ASWebAuthenticationSession` solo llama al bloque de cierre con la URL de vuelta
cuando la navegación coincide con el `callbackURLScheme` registrado a esta app (`somosnosotros`) — ninguna otra
app en el teléfono puede registrar el mismo esquema y recibirlo primero sin que iOS avise de un conflicto al
instalar, y nada de esto pasa por el navegador del sistema ni por una vista web ajena. Que viaje por `somosnosotros://`
en vez de `https://` no lo hace menos seguro: sigue siendo un token de un solo uso, con la misma vigencia que
Supabase le da a cualquier enlace mágico.

### 3. Fixture `a@a.com` → `persona@example.com`

En `src/app/auth/[proveedor]/fin/route.test.ts`. Sin más ocurrencias en código (queda una mención en la sección
"Qué hice" de arriba, de cuando existía; es historia de esta misma bitácora, no un dato real).

### 4. Compilado y probado en el simulador

Simulador propio, `OL-194 correcciones iPhone` (`xcrun simctl create ... iPhone-17-Pro ... iOS-26-3`), para no
tocar el `OL-194 iPhone` de la sesión original. `xcodebuild -scheme App -destination "id=<udid>" -configuration
Debug CODE_SIGNING_ALLOWED=NO build` — build verde (antes hubo que arreglar un error propio: un comentario Swift
con el texto `` `/auth/*` `` que Swift interpretó como el inicio de un comentario `/*` anidado sin cerrar —
"Unterminated '/* comment'" — se reescribió el comentario sin esa secuencia de caracteres).

**Capturas (`docs/rediseno/capturas-228/`), abiertas y descritas una por una:**

- `03-apple-navegador-sistema.png` (sustituida) — al tocar "Continuar con Apple", ya no aparece la barra de Safari
  de un `SFSafariViewController`: se ve la página real de `appleid.apple.com` ("Usa tu cuenta de Apple para
  iniciar sesión en Somos Nosotros", con el campo "Correo o número telefónico" y el teclado abierto) dentro de la
  ficha de `ASWebAuthenticationSession`, con su barra propia (el botón "X", el dominio arriba, el ícono de
  "escritorio" a la derecha). Es la prueba de que `EntrarSistemaPlugin.swift` interceptó `/auth/apple`, le puso
  `?app=1` y la sesión del sistema llegó de verdad hasta Apple.
- `05-aviso-sistema.png` (nueva) — el instante justo antes de esa página: el aviso nativo de
  `ASWebAuthenticationSession`, `""App" quiere utilizar "somosnosotros.org" para iniciar sesión" / "Esto le permite
  a la app y al sitio compartir información acerca de ti."`, con "Cancelar" y "Continuar". Dice `"App"` en vez de
  `"Somos Nosotros"`: comprobado que `CFBundleDisplayName` en el `Info.plist` del `.app` compilado sí dice "Somos
  Nosotros" (`plutil -p .../App.app/Info.plist`) — es un efecto de instalar con `simctl install` a mano en vez de
  con Xcode o TestFlight (SpringBoard no registra el nombre igual), no un error de esta pieza. El founder lo verá
  con el nombre correcto al probar en TestFlight.
- `04-vuelta-tras-cerrar-apple.png` (sustituida) — al cerrar esa ficha con la "X" (sin escribir ninguna
  credencial), la app vuelve a la pantalla de Entrar intacta, igual que antes de tocar el botón: confirma que
  cancelar no rompe nada (la navegación original ya se había cancelado en el `WKWebView`, así que no hay adónde
  volver más que ahí).

No se tocó ninguna cuenta de Apple ni se escribió ninguna credencial real: el recorrido completo (entrar de
verdad, con una cuenta de Apple o Google real y confirmar que `/perfil` queda con sesión) lo prueba el founder en
TestFlight.

### Verificación

```
npm run lint       # 0 errores (mismo warning preexistente de docs/diseno/logotipo/iconos-sn.mjs, ajeno)
npm run typecheck  # verde
npm test           # 101 archivos, 1268 pruebas, todas verdes
npm run build      # verde
```

Correos en el diff (`git diff origin/main...HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'`): solo
`persona@example.com` (el fixture corregido), `@objc`/`@UIApplicationMain` (atributos de Swift),
`AppIcon-512@2x.png` (nombre de imagen) y `uuid@10`/`uuid@11`/`uuid@latest` (texto de un aviso de `npm install`
guardado en `apps/ios/package-lock.json` por el operador original, sin tocar en esta corrección). La mención de
`a@a.com` en la sección "Qué hice" de esta misma bitácora es historia, no código.

### Qué queda

- Lo mismo que dejó pendiente la pieza original (Universal Link de fichas ya probado en el simulador de forma
  indirecta, APNs, Wallet, ficha y envío) más: **el recorrido completo de entrar con Apple/Google de punta a
  punta**, con una cuenta real, solo se puede probar en TestFlight — este operador no escribió ninguna credencial.
- El aviso del sistema dice `"App"` en vez de `"Somos Nosotros"` en este build de simulador sin firmar
  (`simctl install`); confirmar que dice el nombre correcto cuando el founder lo instale desde TestFlight (el
  `Info.plist` ya trae bien el `CFBundleDisplayName`, así que debería resolverse solo).
