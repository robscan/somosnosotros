# 283 · Ubicación nativa en la app de iPhone (OL-256)

**Fecha:** 2026-10-01 · **Rama:** `ubicacion-nativa`, desde `origin/ubicacion-al-dia` (OL-255, PR #294 sin unir) · **OL:** OL-256 · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows.

Decisión del founder tras OL-255 (bitácora 282): un plugin nativo de geolocalización para que la app sepa que el permiso ya está concedido y lea la ubicación sin el aviso del sitio de WebKit, también recién abierta.

## Qué hace la app ahora (frases llanas)

- Con la versión nueva de la app: al abrirla, la app le pregunta al sistema (no al navegador) si ya tiene el permiso de ubicación. Si lo tiene, la distancia se pone al día sola, sin ningún aviso, ni siquiera tras cerrar la app del todo y abrirla. Si no lo tiene, no lee nada hasta un toque; el toque hace salir el aviso del sistema («Somos Nosotros pide tu ubicación para ordenar lugares y eventos por cercanía. Nunca se guarda.») y nunca el del sitio.
- Con la versión vieja de la app (TestFlight 1.0 (1) a (3)) y en Safari o Chrome: igual que en OL-255, sin cambios. La web se puede desplegar antes de que la gente actualice la app.

## Qué cambió

- **App (`apps/ios`).** `@capacitor/geolocation` 8.2.2 (fijo, sin `^`, como los demás; pide `@capacitor/core >=8`, la app trae 8.5.2), `npx cap sync ios` (solo cambia `CapApp-SPM/Package.swift`). `Info.plist` ya trae `NSLocationWhenInUseUsageDescription` con un texto en español llano: se queda igual. `CURRENT_PROJECT_VERSION` 3 → 4 (las dos configuraciones, Debug y Release).
- **Web (`src/lib/ubicacion.ts`).** La web detecta el plugin como `calendarioNativo.ts` y los otros plugins propios: `window.Capacitor.Plugins.Geolocation` (Capacitor lo deja ahí para cada plugin nativo; en la web no se importa `@capacitor/core`, que el proyecto no usa). Sin él, `null` y todo sigue por `navigator.geolocation`.
  - `permisoConcedido()`: con plugin, `checkPermissions()` (`location === "granted"`; si falla, no concedido). Sin plugin, como en OL-255 (`permissions.query`, o la lectura buena de la sesión).
  - Una sola función de lectura, `leerPosicion`, que usan `leerUbicacion` y `leerUbicacionConPrecision` (antes eran dos copias del mismo bloque del navegador): con plugin llama a su `getCurrentPosition({ enableHighAccuracy, timeout, maximumAge })`; sin él, `navigator.geolocation` con las mismas opciones de siempre. Los números (8 s / 10 s / 12 s, 30 s, 0) no cambian.
  - Errores: el plugin de iOS rechaza con códigos `OS-PLUG-GLOC-0003` (permiso negado) y `-0008` (restringido) → «negado»; cualquier otro → «error».
  - **No se usa `requestPermissions()`.** El plugin, en su `getCurrentPosition`, pide solo el permiso del sistema si aún no se ha decidido (se leyó el código de `GeolocationPlugin.swift` y se comprobó en el simulador); una llamada más sería código sin función. Las lecturas sin toque nunca llegan a ese punto: `releerUbicacionAlDia` exige `permisoConcedido()` antes.
  - El resto de OL-255 (`releerUbicacionAlDia`, `debeReleer`, `useUbicacionFresca`, Lugares) no se toca.

## Pruebas

- `src/lib/ubicacion.test.ts` (+8, total 29), con el plugin simulado en `window.Capacitor.Plugins.Geolocation` y el WKWebView simulado (`permissions.query` lanza; `navigator.geolocation` espiado): concedido → relee solo recién abierta, por el plugin y con 0 llamadas al navegador; `prompt` y `denied` → no leen sin toque; `checkPermissions` que falla → no concedido; lectura de un toque con `prompt` → por el plugin; la precisa pide GPS y devuelve la precisión; códigos de rechazo (0003 y 0008 «negado», otros «error»); sin plugin (`window.Capacitor` sin `Geolocation`) → comportamiento de OL-255 (WKWebView recién abierto: ni una lectura).
- `npm run lint` (0 errores; 1 aviso que ya había en `VisorImagen.componentes.test.mjs`), `typecheck`, `test` (125 archivos, 1710 pruebas), `inventario` (sin novedades), `medir` (24 pantallas × 4 anchos, sin novedades), `test:componentes` con Chrome real (213 de 213).

## Simulador (app real compilada, «FLOWYA iPhone SE», iOS 26.3)

Lo que se compiló: la app real de `apps/ios` con el plugin, desde una copia en el scratchpad con una sola diferencia: `server.url` apunta a `http://localhost:3199` (no se commitea). Ese servidor sirve **una página de prueba**, no la web completa (no hay respaldo de datos a mano y la rama aún no está desplegada): una pantalla con «Distancia al Teatro de la Paz» que usa el módulo real `src/lib/ubicacion.ts` (empaquetado con esbuild) y muestra si el plugin está, el permiso, la distancia y cuántas lecturas pasaron por el navegador (WebKit). Ubicación simulada con `xcrun simctl location`. Permisos reiniciados antes (`simctl privacy reset`). Capturas en `docs/rediseno/capturas-283/`, cada PNG abierto y mirado:

1. `1-primer-arranque.png`: primer arranque. Plugin «sí», permiso concedido «false», distancia «—», lecturas por WebKit 0. Sin ningún aviso en pantalla.
2. `2-aviso-de-ios-tras-el-toque.png`: tras tocar «Calcular la distancia» sale **solo el aviso de iOS de la app** (con el texto en español del Info.plist, la pantalla del simulador está en inglés: «Allow "Somos Nosotros" to use your location?», «Allow Once / Allow While Using App / Don't Allow»). No sale el del sitio.
3. `3-tras-conceder.png`: tras «Allow While Using App»: permiso «true», distancia «1.1 km», lecturas por WebKit 0.
4. `4-reabierta-sola.png`: se cerró la app del todo (`simctl terminate`), se movió la ubicación simulada ~8 km y se reabrió pasado más de 1 minuto sin tocar nada: la distancia pasó sola de 1.1 km a «8.8 km», permiso «true», sin ningún aviso, **lecturas por WebKit 0** (lo que en OL-255 sin plugin hacía salir el aviso del sitio). El icono de ubicación en la barra de estado confirma que el sistema leyó.

No se probó de punta a punta la web completa dentro de la app (pantallas de Lugares y ficha): usan la misma `releerUbicacionAlDia` ya cubierta por las pruebas de componentes de OL-255, y la lectura nativa se probó aquí con el módulo real. Tampoco se probó la app vieja (sin plugin) contra la web nueva en el simulador: lo cubre la prueba unitaria; en la práctica es el caso de OL-255 ya comprobado. El simulador se apagó al terminar; no se tocó el iPhone 15 Pro.

## Para subir a TestFlight (no se subió; lo confirma el gestor con el founder)

Condiciones: la rama unida a `main` (primero #294, luego esta) y la web desplegada, o al menos la vieja funcionando (es compatible en ambos sentidos). Compilación 1.0 (4).

1. Copia limpia de `main` (ya con esta pieza) en el scratchpad: `git clone` o `git worktree add` desde `origin/main`.
2. `cd apps/ios && npm ci && npm i --no-save typescript` (sin TypeScript `cap sync` falla por `capacitor.config.ts`) y `npx cap sync ios`. Comprobar que `capacitor.config.ts` sigue con `server.url: "https://somosnosotros.org"` y que `Package.swift` lista `CapacitorGeolocation`.
3. `cd ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Release -destination "generic/platform=iOS" -archivePath <scratchpad>/App.xcarchive -allowProvisioningUpdates archive` (con la cuenta del founder abierta en Xcode → Settings → Accounts; desde Xcode local 26.2, no Xcode Cloud).
4. `ExportOptions.plist` con `method` = `app-store-connect`, `teamID` = `AT53235M7U` y `destination` = `export`. `xcodebuild -exportArchive -archivePath <…>/App.xcarchive -exportPath <scratchpad>/export -exportOptionsPlist ExportOptions.plist -allowProvisioningUpdates`.
5. Revisar la firma antes de subir: `codesign -dvv` y `codesign -d --entitlements -` sobre la `.app` dentro del `.ipa` (perfil «iOS Team Store», `get-task-allow` false, equipo AT53235M7U), `assetutil --info` del icono, y que `CFBundleVersion` sea 4.
6. Con el visto bueno del gestor, repetir el paso 4 con `destination` = `upload` (sube a App Store Connect). La compilación llega sola al grupo interno «Equipo».
7. Comprobar en el iPhone del founder (TestFlight): con el permiso ya dado, abrir una ficha de lugar y Lugares tras cerrar la app del todo: la distancia y el orden por cercanía salen solos, sin aviso del sitio. En una instalación nueva, el primer toque muestra solo el aviso de la app.

Nada se tocó en App Store Connect ni en developer.apple.com.
