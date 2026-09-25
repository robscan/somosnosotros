# apps/ios — envoltorio de iPhone (Capacitor)

OL-194, pieza 4 de [`docs/rediseno/47-app-ios.md`](../../docs/rediseno/47-app-ios.md). Esto **no es la web**: la
web sigue en la raíz del repo (Next.js). Aquí solo vive el envoltorio nativo que la abre dentro de un `WKWebView`
apuntando siempre a `https://somosnosotros.org` (`capacitor.config.ts`, `server.url`) — nada de código de pantallas
se duplica aquí.

## Qué hay

- `capacitor.config.ts` — `appId: org.somosnosotros.app`, `server.url` a producción, `allowNavigation` con los
  dominios que la web usa hoy (Supabase, Mapbox, los reproductores incrustados) y `appendUserAgent:
  "SomosNosotrosApp"` (por si una pieza futura necesita distinguir el navegador de la app; hoy nadie lo lee).
- `www/index.html` — la página de "Sin conexión" (símbolo SN). No es una pantalla de la web: el envoltorio nativo
  la muestra a mano (`ios/App/App/MainViewController.swift`, con `NWPathMonitor`) cuando el teléfono se queda sin
  red; en un arranque normal nunca se ve.
- `ios/` — el proyecto de Xcode generado por `npx cap add ios`, comiteado según la convención de Capacitor
  (`Pods/`, `build/` y `DerivedData/` quedan fuera por el `.gitignore` que trae el propio `cap add`). Dos archivos
  nativos propios, aparte del scaffold de Capacitor:
  - `ios/App/App/EntrarSistemaPlugin.swift` — abre Apple y Google en una `ASWebAuthenticationSession` (la ficha de
    inicio de sesión del sistema) en vez de dentro del `WKWebView` (Google lo bloquea ahí; Apple lo desaconseja) y
    recibe la vuelta directo por el esquema propio `somosnosotros://`, con un enlace de un solo uso que deja la
    sesión en el WKWebView de la app. Corrección del gestor (bitácora 228): la primera versión abría un
    `SFSafariViewController`, que comparte las cookies de Safari, no las de la app. Ver el comentario del archivo.
  - `ios/App/App/MainViewController.swift` — registra ese plugin y muestra `www/index.html` cuando no hay red.
  - `ios/App/App/App.entitlements` — `applinks:somosnosotros.org` y `webcredentials:somosnosotros.org` (enlaces
    universales para las fichas — eventos, lugares, artistas — y el llavero de iOS; entrar con Apple/Google ya no
    depende de un enlace universal).

## Comandos

Desde `apps/ios/`:

```
npm install          # una vez
npx cap sync ios      # tras cambiar capacitor.config.ts, www/ o los plugins de package.json
npx cap open ios      # abre el proyecto en Xcode
npx cap run ios       # compila e instala en un simulador (o dispositivo) desde la terminal
```

Para compilar sin Xcode abierto (como en CI o en este mismo encargo, sin firmar para simulador):

```
cd ios/App
xcodebuild -scheme App -project App.xcodeproj -destination "id=<UDID del simulador>" -configuration Debug CODE_SIGNING_ALLOWED=NO build
```

Un simulador propio (para no estorbar a otro chat que ya use uno):

```
xcrun simctl create "mi-simulador" com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro com.apple.CoreSimulator.SimRuntime.iOS-26-3
```

## Decisiones de esta pieza (con su porqué)

- **Botones de Apple/Google, sin tocar `FormularioEntrar.tsx`.** En vez de llamar `Browser.open()` desde
  JavaScript (que habría exigido cambiar el botón en la web, fuera del alcance de esta pieza: solo
  `src/app/auth/**` y `src/lib/entrarCon.ts`), la intercepción vive en `EntrarSistemaPlugin.swift`, a nivel de
  política de navegación del `WKWebView` (`shouldOverrideLoad`, el enganche que Capacitor ofrece para esto):
  detecta la ida a `/auth/apple` o `/auth/google` y la abre en una `ASWebAuthenticationSession`.
- **`ASWebAuthenticationSession`, no `SFSafariViewController` (corrección del gestor, bitácora 228).** La primera
  versión de esta pieza abría un `SFSafariViewController`. No sirvió: esa hoja comparte las cookies de Safari.app,
  no las del `WKWebView` de la app, así que la sesión que Supabase deja al terminar nunca llegaba a donde la app
  puede leerla; y una redirección de servidor al mismo dominio dentro de esa hoja tampoco dispara un enlace
  universal. `ASWebAuthenticationSession` entrega la vuelta directo a la app por un esquema propio
  (`somosnosotros://`, registrado en Info.plist) en cuanto `/auth/[proveedor]/fin` la manda ahí con un enlace de un
  solo uso (`urlAppTrasEntrar`, `src/lib/entrarCon.ts`); `EntrarSistemaPlugin.swift` carga entonces
  `/auth/app-vuelta` con ese enlace directo en el `WKWebView`, que es donde de verdad hace falta la sesión. Con
  esto, entrar con Apple o Google ya no depende de ningún enlace universal — ver el cambio en
  `apple-app-site-association` más abajo.
- **`server.errorPath` de Capacitor, descartado a propósito.** Esa opción muestra la página local en *cualquier*
  navegación fallida del `WKWebView`, incluida la que `EntrarSistemaPlugin` cancela a propósito para abrir la
  sesión del sistema — con ella activada, cancelar esa navegación dejaba la app entera en "Sin conexión" con la
  red perfectamente encendida (se vio en el simulador). En su lugar, `MainViewController.swift` usa
  `NWPathMonitor` y solo muestra `www/index.html` cuando el teléfono de verdad pierde la red. Límite conocido: si
  `somosnosotros.org` cae pero el teléfono sigue con datos o wifi, esto no lo detecta (no hay pantalla de "sin
  conexión" para ese caso, solo para avión/sin señal); ampliarlo pediría interceptar también los códigos de error
  de una navegación fallida sin usar `errorPath`, que no se hizo aquí.
- **`apple-app-site-association` ya no reclama `/auth/*`.** Con la corrección del gestor, entrar con Apple o
  Google no pasa por ningún enlace universal (ver arriba): reclamarlo no hacía falta y, peor, competía con el
  enlace del correo cuando alguien lo abre fuera de la app. Sigue reclamando `/eventos/*`, `/lugares/*` y
  `/artistas/*` para las fichas compartidas.
- **Sin cámara ni micrófono en vivo.** `NSCameraUsageDescription` está en el Info.plist porque los formularios de
  la web (`<input type="file" accept="image/*">` en lugares, artistas, eventos y perfil) pueden abrir la cámara
  del teléfono para tomar la foto ahí mismo. No hay `NSMicrophoneUsageDescription`: no se encontró ningún uso de
  `getUserMedia` ni captura de video en `src/` (solo fotos). Si aparece un uso real, se añade entonces.
