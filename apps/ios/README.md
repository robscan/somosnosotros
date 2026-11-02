# apps/ios — envoltorio de iPhone (Capacitor)

OL-194, pieza 4 de [`docs/rediseno/47-app-ios.md`](../../docs/rediseno/47-app-ios.md). Esto **no es la web**: la
web sigue en la raíz del repo (Next.js). Aquí solo vive el envoltorio nativo que la abre dentro de un `WKWebView`
apuntando siempre a `https://somosnosotros.org` (`capacitor.config.ts`, `server.url`) — nada de código de pantallas
se duplica aquí.

## Qué hay

- `capacitor.config.ts` — `appId: org.somosnosotros.app`, `server.url` a producción, `allowNavigation` con los
  dominios que la web usa hoy (Supabase, Mapbox, los reproductores incrustados) y `appendUserAgent:
  "SomosNosotrosApp"` (por si una pieza futura necesita distinguir el navegador de la app; hoy nadie lo lee).
- `www/index.html` — página local que Capacitor exige como `webDir`. Desde OL-503 (bitácora 536) la app ya no la
  enseña: el respaldo ante cargas fallidas es nativo (`ios/App/App/RespaldoCarga.swift`, abajo). Si algún día se viera,
  su botón va a `https://somosnosotros.org/` (antes hacía `location.reload()` del archivo local y volvía a caer en ella).
- `ios/` — el proyecto de Xcode generado por `npx cap add ios`, comiteado según la convención de Capacitor
  (`Pods/`, `build/` y `DerivedData/` quedan fuera por el `.gitignore` que trae el propio `cap add`). Dos archivos
  nativos propios, aparte del scaffold de Capacitor:
  - `ios/App/App/EntrarSistemaPlugin.swift` — abre Apple y Google en una `ASWebAuthenticationSession` (la ficha de
    inicio de sesión del sistema) en vez de dentro del `WKWebView` (Google lo bloquea ahí; Apple lo desaconseja) y
    recibe la vuelta directo por una URL https de nuestro propio dominio (`ASWebAuthenticationSession.Callback.https`,
    iOS 17.4+), con un enlace de un solo uso que deja la sesión en el WKWebView de la app. La primera versión abría
    un `SFSafariViewController` (compartía las cookies de Safari, no las de la app); la segunda usaba un esquema
    propio `somosnosotros://` (corrección de seguridad, OL-194: cualquier app puede registrar el mismo esquema y
    quedarse con la sesión de otra persona). Ver el comentario del archivo.
  - `ios/App/App/FotosPlugin.swift` — «Guardar en Fotos» el cartel del evento (OL-317, bitácora 344): `guardarFoto` agrega
    una imagen a Fotos con `PHPhotoLibrary` (permiso de solo agregar, `NSPhotoLibraryAddUsageDescription` en Info.plist).
    Nativo puro, sin paquete de npm, como `CalendarioPlugin`; la web lo detecta en `window.Capacitor.Plugins.Fotos`
    (`src/lib/guardarCartel.ts`) y sin él descarga el archivo. Se descartó `@capacitor-community/media` (SDWebImage y
    lectura de álbumes para una sola escritura). Desde OL-332 (bitácora 361, hallazgo F08) no se fía de la web: tope de la
    cadena antes de decodificar (8 MiB), permiso antes de tocar la imagen, formato por los bytes (JPEG, PNG o WebP),
    dimensiones por metadatos (8000 px por lado, 12 Mpx); JPEG y PNG van tal cual y WebP pasa a JPEG. Rechaza con
    `permiso`, `formato`, `tamano` o `error`.
  - `ios/App/App/MainViewController.swift` — registra los plugins propios, engancha `RespaldoCarga` y, con
    `NWPathMonitor`, reintenta solo cuando vuelve la red (1 s después) si el respaldo está a la vista.
  - `ios/App/App/RespaldoCarga.swift` — «No se pudo cargar» (OL-503, bitácora 536): toma el puesto de
    `navigationDelegate` del WKWebView y le pasa todo a Capacitor; añade el respaldo nativo cuando el documento de
    somosnosotros.org falla (error de red sin contar cancelaciones, 500 o más, 12 s sin llegar). «Intentar de nuevo»
    carga la dirección que falló; vuelve solo con la red y al volver al frente (`SceneDelegate.swift`). Deja la marca
    `sn_carga_fallida` (`app: "tienda"`) en el `localStorage` de la web en la siguiente carga buena.
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
- **`ASWebAuthenticationSession`, no `SFSafariViewController`.** La primera versión de esta pieza abría un
  `SFSafariViewController`. No sirvió: esa hoja comparte las cookies de Safari.app, no las del `WKWebView` de la
  app, así que la sesión que Supabase deja al terminar nunca llegaba a donde la app puede leerla; y una redirección
  de servidor al mismo dominio dentro de esa hoja tampoco dispara un enlace universal. `ASWebAuthenticationSession`
  entrega la vuelta directo a la app en cuanto `/auth/[proveedor]/fin` la manda ahí con un enlace de un solo uso
  (`urlAppTrasEntrar`, `src/lib/entrarCon.ts`); `EntrarSistemaPlugin.swift` carga entonces esa misma dirección en el
  `WKWebView`, que es donde de verdad hace falta la sesión. Con esto, entrar con Apple o Google ya no depende de
  ningún enlace universal — ver el cambio en `apple-app-site-association` más abajo.
- **Callback https, no un esquema propio (corrección de seguridad, OL-194).** La segunda versión de esta pieza
  entregaba esa vuelta por un esquema propio (`somosnosotros://`, `CFBundleURLTypes` en Info.plist,
  `callbackURLScheme` en `ASWebAuthenticationSession`). Cualquier app en el teléfono puede registrar el mismo
  esquema: si alguien hacía abrir `/auth/google?app=1` a la víctima fuera de esta app, Safari podía entregar esa
  vuelta —con el `token_hash` de un enlace mágico de un solo uso— a una app impostora, que se quedaba con la sesión
  de la víctima. Con `ASWebAuthenticationSession.Callback.https(host: "somosnosotros.org", path: "/auth/app-regreso")`
  (iOS 17.4+, `EntrarSistemaPlugin.swift`; por eso el deployment target subió de 15.0 a 17.4) la vuelta es una URL
  https de nuestro propio dominio: el sistema solo se la entrega a la app cuyo Associated Domains verificó
  `webcredentials:somosnosotros.org` (`App.entitlements`) — ninguna otra app puede recibirla, y ya no hay ningún
  esquema propio que registrar (`CFBundleURLTypes` se quitó de Info.plist). Si esa misma URL se abre fuera de la
  app (navegador normal, o sin la app instalada), `/auth/app-regreso` hace exactamente lo mismo ahí: la sesión se
  queda en quien la abrió, nunca llega a otra app.
- **`server.errorPath` de Capacitor, descartado a propósito.** Esa opción muestra la página local en *cualquier*
  navegación fallida del `WKWebView`, incluida la que `EntrarSistemaPlugin` cancela a propósito para abrir la
  sesión del sistema — con ella activada, cancelar esa navegación dejaba la app entera en "Sin conexión" con la
  red perfectamente encendida (se vio en el simulador). Hasta OL-503 la única salida era `NWPathMonitor` (solo sin
  ruta: un 5xx, un tiempo agotado o una radio que no engancha dejaban la pantalla en blanco, lo que vio el founder el
  2026-11-02). Desde OL-503, `RespaldoCarga.swift` atiende las navegaciones fallidas del dominio propio y descarta las
  cancelaciones (-999 y el 102 de WebKit, que es el de los plugins); ver su comentario.
- **`apple-app-site-association` ya no reclama `/auth/*`.** Con la corrección del gestor, entrar con Apple o
  Google no pasa por ningún enlace universal (ver arriba): reclamarlo no hacía falta y, peor, competía con el
  enlace del correo cuando alguien lo abre fuera de la app. Sigue reclamando `/eventos/*`, `/lugares/*` y
  `/artistas/*` para las fichas compartidas.
- **Sin cámara ni micrófono en vivo.** `NSCameraUsageDescription` está en el Info.plist porque los formularios de
  la web (`<input type="file" accept="image/*">` en lugares, artistas, eventos y perfil) pueden abrir la cámara
  del teléfono para tomar la foto ahí mismo. No hay `NSMicrophoneUsageDescription`: no se encontró ningún uso de
  `getUserMedia` ni captura de video en `src/` (solo fotos). Si aparece un uso real, se añade entonces.
