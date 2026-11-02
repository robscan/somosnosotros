# 536 · OL-503 · «No se pudo cargar» en la app del App Store (nativa, `apps/ios`)

- **Fecha:** 2026-11-02
- **Quién:** operador del Gestor de cambios VIII
- **Rama:** `respaldo-carga-nativa` (desde `origin/main` `8c974c2a`)
- **Sin migración.** No toca `src/`, `public/`, producción, Vercel ni App Store Connect.
- **Entra en la siguiente compilación para TestFlight (la 8; la 7 está en revisión).** Nada se subió.

## Qué pidió el founder

«al abrir la app noto que se queda la pantalla en blanco. Como un error en servicios. No me presenta ninguna opción de recarga
ni nada. Tuve que volver a abrir la app (iOS) para que recargara». Después: «El blanco fue sobre la app de AppStore estaba
conectado con datos celulares. Pudo ser un fallo en mi conexión». Aprobó el respaldo («Si me gusta»). Plan: bitácora 533,
Tramo 1 punto 7; acta del council, B1 y m2.

## Qué hacía ya Capacitor (`@capacitor/ios` 8.5.2, `package-lock.json`)

Leído en `node_modules/@capacitor/ios/Capacitor/Capacitor/WebViewDelegationHandler.swift` tras `npm ci`:

- `webViewWebContentProcessDidTerminate`: `bridge.reset()` + `webView.reload()`. **El proceso web muerto ya se recarga; esta
  pieza no lo duplica.** Si esa recarga falla, cae en los avisos de abajo como cualquier navegación.
- `didFailProvisionalNavigation` y `didFail`: solo cargan `server.errorPath` si existe (apagado a propósito) y escriben en el
  registro. Es decir: con la red rara, nada.
- No implementa `decidePolicyFor navigationResponse` (WebKit deja pasar cualquier 500).
- `CAPBridgeViewController.loadView()` es `final` y crea el `WebViewDelegationHandler` dentro: no se le puede dar una subclase.

## Qué añade esta pieza

1. **`ios/App/App/RespaldoCarga.swift` (nuevo).** Toma el puesto de `navigationDelegate` del WKWebView (solo ese; el
   `uiDelegate` y el de desplazamiento siguen siendo de Capacitor). Los métodos que toca llaman primero a Capacitor y luego
   añaden lo suyo; los que no toca (reto de autenticación, proceso muerto) se le reenvían con `forwardingTarget(for:)`. Los
   plugins siguen decidiendo en `shouldOverrideLoad` igual que antes. Sale «No se pudo cargar», solo para el documento
   principal de `somosnosotros.org`/`www.somosnosotros.org` (y el host de `server.url`, que es el mismo; en la prueba local fue
   `127.0.0.1`):
   - **error de red** en `didFailProvisionalNavigation` o `didFail` → motivo «red». **Nunca** con `NSURLErrorCancelled` (-999,
     una navegación sustituida o detenida) ni con el 102 de WebKit (*frame load interrupted by policy change*: es el que
     producen `EntrarSistemaPlugin` con `/auth/apple` y `/auth/google` y `GestoAtrasPlugin` con el gesto de volver; por esto se
     había descartado `server.errorPath`), ni con el 204 de WebKit (un video o audio que maneja su reproductor). Además, por
     escrito, nunca para `/auth/apple` ni `/auth/google`.
   - **500 o más** en el documento principal (`decidePolicyFor navigationResponse`) → se cancela (no se enseña la página de
     Vercel) y sale con «El servidor no respondió. Suele arreglarse al intentar de nuevo.». Motivo «servidor».
   - **12 s sin documento** (`topeSegundos = 12`, el mismo `TOPE_NAVEGACION_MS` de la web; un arranque en frío pinta en unos
     3 s, bitácora 487) → `stopLoading()` y motivo «red». El tope arranca en `didStartProvisionalNavigation` (cambiar el hash o
     `pushState` no pasan por ahí, así que no queda ningún tope abierto) y se cierra en `didCommit`, `didFinish` o el fallo, de
     la misma navegación.
2. **La vista: nativa (UIKit), no `www/index.html`.** Decidido así porque una vista encima del WKWebView no toca su historial
   ni el documento que hubiera debajo, no carga un archivo `file://` dentro del puente de Capacitor y su botón carga la URL
   remota en Swift. Copia de `public/sin-conexion.html` (OL-501): fondo blanco, tema claro forzado, símbolo SN del arte final
   (`docs/diseno/logotipo/LogoFinal/SN - Symbol.svg` → `Assets.xcassets/SimboloSN`, vectorial, tinta #1a1a1a), «No se pudo
   cargar» 26 pt negrita, «Suele arreglarse al intentar de nuevo.» 17 pt #5c5c5c, botón «Intentar de nuevo» violeta #6d34c8 de
   48 pt de alto y ancho de la columna, radio 8; columna a la izquierda centrada en vertical, 20 pt a los lados, 600 pt como
   máximo; la letra crece con el tamaño de texto del teléfono hasta el doble (como `--letra-tope: 2`) y la columna se desplaza
   si no cabe. VoiceOver: el título es encabezado y la vista es modal.
3. **«Intentar de nuevo»** carga otra vez **la dirección que falló** (conserva el enlace profundo), o `appStartServerURL` si no
   la hay; nunca el archivo local. En `/auth/…` lleva a `/entrar` (un enlace de un solo uso no se repite, como en la web).
   Mientras carga, el botón enseña el indicador y no se puede volver a tocar; la vista se va en el `didCommit` del documento
   propio.
4. **Vuelve sola**: `NWPathMonitor` (MainViewController) reintenta 1 s después de decir que hay ruta, si el respaldo está a la
   vista (el mismo segundo que la web, por la misma razón).
5. **Al volver al frente** (`SceneDelegate.sceneWillEnterForeground`): si la última carga falló o el respaldo está a la vista,
   reintenta; si el WKWebView no tiene documento (`url` nulo o `about:blank`) y no hay carga en camino, carga
   `appStartServerURL`. Lo ya cargado no se toca.
6. **Marca para medir**: al mostrar el respaldo, `UserDefaults["sn_carga_fallida"] = { cuando, motivo }`. En el siguiente
   `didCommit` del documento propio, `evaluateJavaScript` copia al `localStorage` de la web
   `sn_carga_fallida = { cuando, motivo, app: "tienda" }` (la misma clave y forma que `public/sin-conexion.html`) y, si salió
   bien, la borra de `UserDefaults`. Se hace en `didCommit` y no en `didFinish` para llegar antes de que la web se hidrate:
   `MedirCargaFallida` (rama `respaldo-carga-web`) la lee una vez al montar; si llegara tarde, la lee en la siguiente carga, y
   como la web la borra al leerla se cuenta una sola vez. **Sin tocar la web.** Hasta que OL-501 esté en producción, la marca
   espera en `localStorage` sin hacer nada.

### Cambio de conducta que hay que saber (decidido; por confirmar con el founder)

Antes, al perder la red, `NWPathMonitor` cargaba `www/index.html` («Sin conexión») **encima de lo que hubiera**, aunque la
pantalla estuviera bien, y su «Reintentar» hacía `location.reload()` del archivo local (volvía a caer en ella). Ahora perder la
red no cambia la pantalla: lo ya cargado se queda («primero lo cargado», bitácora 533) y, si una navegación falla sin red
(o la app arranca sin red), sale el respaldo. `www/index.html` sigue en el repo porque Capacitor exige un `webDir`; se le puso
el mismo texto y su botón va a `https://somosnosotros.org/`, aunque la app ya no lo enseña.

### Qué no cubre

- La caída **a mitad del streaming** de Inicio después de que el documento llegó y se pintó: queda en esqueletos, igual que en
  la web. Si WebKit lo reporta como `didFail`, sí sale el respaldo.
- Las peticiones que la web hace sin navegar (`fetch`, RSC de Next): esas las maneja la propia web.
- Una respuesta que llega lentísima pero llega antes de 12 s: no hay respaldo, solo espera.
- Tocar un aviso push con la red dormida: es una navegación del documento, así que debería caer en el respaldo; no se pudo
  probar en el simulador.

## Archivos

- `apps/ios/ios/App/App/RespaldoCarga.swift` (nuevo) y su registro en `App.xcodeproj/project.pbxproj`.
- `apps/ios/ios/App/App/Assets.xcassets/SimboloSN.imageset/` (nuevo, el SVG del arte final tal cual).
- `apps/ios/ios/App/App/MainViewController.swift` (engancha el respaldo; `NWPathMonitor` solo reintenta).
- `apps/ios/ios/App/App/SceneDelegate.swift` (`sceneWillEnterForeground`).
- `apps/ios/www/index.html` (texto y botón), `apps/ios/capacitor.config.ts` (solo el comentario: `server.url` sigue en
  producción), `apps/ios/README.md`.

## Verificación

**Compilación** (Xcode 27.2, `xcodebuild -scheme App -project App.xcodeproj -destination "generic/platform=iOS Simulator"
-configuration Debug CODE_SIGNING_ALLOWED=NO clean build`, tras `npm ci` y `npx cap sync ios`), cero errores y ningún aviso en
los archivos de `App/App/`:

```
SwiftCompile normal x86_64 Compiling\ RespaldoCarga.swift …/apps/ios/ios/App/App/RespaldoCarga.swift
PruneExplicitPrecompiledModules …/dd/Build/Intermediates.noindex/SwiftExplicitPrecompiledModules

** BUILD SUCCEEDED **
```

Nota del entorno: el `xcrun simctl` de esta Mac se queda colgado pidiendo `xcodebuild -runFirstLaunch` (CoreSimulator 1174.9.2
contra 1174.21 que espera Xcode 27.2; instalarlo pide permisos de administrador, no lo hice) y por eso `xcodebuild` no acepta un
simulador concreto como destino. Se compiló para «cualquier simulador» y se instaló con el `simctl` propio de CoreSimulator
(`/Library/Developer/PrivateFrameworks/CoreSimulator.framework/Versions/A/Resources/bin/simctl`), en un simulador nuevo y propio
(`ol503-respaldo`, iPhone 17, iOS 27.0) para no estorbar a otro chat; quedó apagado. Hay también otros dos `simctl` colgados de
otra sesión en la misma espera (no los toqué).

**Pruebas en el simulador**, con una **copia** de la app compilada en el scratchpad cuyo `capacitor.config.json` apuntaba a
`http://127.0.0.1:8536` (el repo y el `server.url` de producción no se tocaron) y un servidor chico de Python que contesta según
un archivo de modo (`ok`, `503`, `colgar`). Capturas del simulador (1206 × 2622, iPhone 17) en
[`docs/rediseno/capturas-536/`](../../../rediseno/capturas-536/), abiertas y miradas:

| Caso | Captura | Qué se ve |
|---|---|---|
| (a) Puerto cerrado (sin servidor) al abrir | `a-respaldo-red-puerto-cerrado.png` | SN, «No se pudo cargar», «Suele arreglarse al intentar de nuevo.», botón violeta a todo lo ancho. Igual que la web (capturas-534). |
| (b) Con el servidor ya arriba, mandar la app al fondo (abrir Ajustes) y volver | `b-recuperada-al-volver-al-frente.png` | La página de prueba en `/` (la dirección que había fallado) y su lectura de `localStorage`: `{"motivo":"red","app":"tienda","cuando":"2026-11-02T22:20:55Z"}`: la marca nativa llegó a la web. |
| (c) El servidor contesta 503 | `c-respaldo-servidor-503.png` | «El servidor no respondió. Suele arreglarse al intentar de nuevo.»; la página del 503 no se enseña. |
| (d) El servidor no contesta | `d1-colgada-6s-en-blanco.png`, `d2-colgada-tope-12s.png` | A los 6 s, blanco (lo que vio el founder); a los 15 s, el respaldo (motivo red). |
| Producción normal (`server.url` de verdad) | `e-produccion-carga-normal.png` | Inicio carga sin respaldo (no hay falso positivo en el arranque normal). |

**Lo que no pude probar y por qué:**

- **Tocar «Intentar de nuevo» con el dedo**: el simulador pide permiso al founder para que lo controle y no hubo respuesta;
  `simctl` no tiene toques. El botón llama a la misma función que la vuelta al frente del caso (b), que sí se probó.
- **La vuelta sola con `NWPathMonitor`**: en el simulador no se puede apagar y encender la red (la del simulador es la de la
  Mac); el código es el mismo `reintentar()`.
- **Que entrar con Apple o Google no saque el respaldo**: hace falta tocar el botón en Entrar. Se descarta por código (102 de
  WebKit y las dos rutas por nombre), que es exactamente el caso que rompía `server.errorPath`.
- `npm run lint && npm run typecheck`: no aplica, no se tocó nada fuera de `apps/ios`.

`Package.resolved`: al compilar, Xcode le añade `ion-ios-geolocation` 2.1.1 (que `@capacitor/geolocation` ya pide y el archivo
del repo no tenía). Lo devolví a como estaba para no mezclarlo con esta pieza; **por confirmar** con el gestor si se comitea
aparte.

## Qué debe probar el founder en su iPhone con la compilación 8

1. **Modo avión** y abrir la app desde cero: sale «No se pudo cargar» con el botón (antes, «Sin conexión» o blanco).
   Quitar el modo avión: en uno o dos segundos vuelve sola a Inicio, sin tocar nada.
2. Con la app abierta y una pantalla cargada, **modo avión**: la pantalla se queda como estaba (ya no salta a «Sin
   conexión»). Tocar algo que abra otra pantalla: sale el respaldo; «Intentar de nuevo» con la red de vuelta lleva a esa
   misma pantalla.
3. Abrir un **enlace de una ficha** (evento, lugar, artista) con modo avión, quitarlo y tocar «Intentar de nuevo»: debe abrir
   esa ficha, no Inicio.
4. **Entrar con Apple y con Google** (con red normal): no debe aparecer el respaldo en ningún momento.
5. **Deslizar desde el borde para volver** en una ficha: no debe aparecer el respaldo.
6. Con datos celulares flojos (por ejemplo en un elevador o sótano), abrir la app: a más tardar a los 12 s debe salir el
   respaldo en vez del blanco.
7. Mandar la app al fondo con el respaldo a la vista y volver con red: se recupera sola.

## Pendiente

- Revisión del gestor y compilación 8 para TestFlight cuando toque (no se subió nada).
- Confirmar con el founder el cambio de conducta de «Sin conexión» al perder la red (arriba).
- `Package.resolved` (arriba).
