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
