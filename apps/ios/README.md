# apps/ios — envoltorio de iPhone (Capacitor)

OL-194, pieza 4 de [`docs/rediseno/47-app-ios.md`](../../docs/rediseno/47-app-ios.md). Esto **no es la web**: la
web sigue en la raíz del repo (Next.js). Aquí solo vive el envoltorio nativo que la abre dentro de un `WKWebView`
apuntando siempre a `https://somosnosotros.org` (`capacitor.config.ts`, `server.url`) — nada de código de pantallas
se duplica aquí.

## Qué hay

- `capacitor.config.ts` — `appId: org.somosnosotros.app`, `server.url` a producción, `allowNavigation` con los
  dominios que la web usa hoy (Supabase, Mapbox, los reproductores incrustados) y `appendUserAgent:
  "SomosNosotrosApp"` (así la web sabe que corre dentro de la app: `src/lib/entrarCon.ts`).
- `www/index.html` — la página de "Sin conexión" (símbolo SN). No es una pantalla de la web: el envoltorio nativo
  la muestra a mano (`ios/App/App/MainViewController.swift`, con `NWPathMonitor`) cuando el teléfono se queda sin
  red; en un arranque normal nunca se ve.
- `ios/` — el proyecto de Xcode generado por `npx cap add ios`, comiteado según la convención de Capacitor
  (`Pods/`, `build/` y `DerivedData/` quedan fuera por el `.gitignore` que trae el propio `cap add`). Dos archivos
  nativos propios, aparte del scaffold de Capacitor:
  - `ios/App/App/EntrarSistemaPlugin.swift` — abre Apple y Google en un `SFSafariViewController` en vez de dentro
    del `WKWebView` (Google lo bloquea ahí; Apple lo desaconseja). Ver el comentario del archivo.
  - `ios/App/App/MainViewController.swift` — registra ese plugin y muestra `www/index.html` cuando no hay red.
  - `ios/App/App/App.entitlements` — `applinks:somosnosotros.org` y `webcredentials:somosnosotros.org` (enlaces
    universales, OL-194 §4 y `src/app/.well-known/apple-app-site-association/route.ts`).

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
  política de navegación del `WKWebView` (`shouldOverrideLoad`, el enganche que Capacitor ofrece para esto). Abre
  un `SFSafariViewController` (la misma clase que usa `@capacitor/browser` en iOS por debajo) en vez de la clase
  `Browser` de ese paquete directamente, porque su `viewController` es `internal`, no público a otro módulo.
  `@capacitor/browser` queda instalado igual, disponible para JavaScript si una pieza futura lo necesita desde ahí.
- **`server.errorPath` de Capacitor, descartado a propósito.** Esa opción muestra la página local en *cualquier*
  navegación fallida del `WKWebView`, incluida la que `EntrarSistemaPlugin` cancela a propósito para abrir el
  navegador del sistema — con ella activada, cerrar la hoja de Apple/Google dejaba la app entera en "Sin conexión"
  con la red perfectamente encendida (se vio en el simulador, capturas 03/04). En su lugar,
  `MainViewController.swift` usa `NWPathMonitor` y solo muestra `www/index.html` cuando el teléfono de verdad
  pierde la red. Límite conocido: si `somosnosotros.org` cae pero el teléfono sigue con datos o wifi, esto no lo
  detecta (no hay pantalla de "sin conexión" para ese caso, solo para avión/sin señal); ampliarlo pediría
  interceptar también los códigos de error de una navegación fallida sin usar `errorPath`, que no se hizo aquí.
- **La vuelta de entrar con Apple/Google pasa por `/auth/app-vuelta`.** `destinoTrasEntrar` en
  `src/lib/entrarCon.ts` manda ahí (no directo a `siguiente`) porque es la única ruta de `/auth/*`, la que
  `apple-app-site-association` reclama como enlace universal; así el navegador del sistema le puede devolver el
  control a la app. En el simulador esto no se puede probar de punta a punta: los enlaces universales no validan
  hasta que el archivo esté publicado de verdad en `somosnosotros.org` (Apple lo descarga y lo firma la primera
  vez que instala la app).
- **Sin cámara ni micrófono en vivo.** `NSCameraUsageDescription` está en el Info.plist porque los formularios de
  la web (`<input type="file" accept="image/*">` en lugares, artistas, eventos y perfil) pueden abrir la cámara
  del teléfono para tomar la foto ahí mismo. No hay `NSMicrophoneUsageDescription`: no se encontró ningún uso de
  `getUserMedia` ni captura de video en `src/` (solo fotos). Si aparece un uso real, se añade entonces.
