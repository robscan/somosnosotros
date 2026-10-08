# 361 · El puente nativo de Fotos acota la entrada y la conversión; la app pasa a la 1.0 (6)

**Pieza:** OL-332. **Rama:** `fotos-nativo-acotado`, desde `origin/main` (`0199e71a`). **Fecha:** 2026-10-07. **Operador:** Claude (agente del gestor IV). **Sin migración.**
**Manda:** hallazgo F08 (P2) de la revisión de seguridad privada del 2026-10-07 (OL-327; el informe completo está en `somosnosotros-privado/seguridad/`, no aquí). Antecedente: bitácora [344](344-guardar-en-fotos.md) (OL-317, cómo nació `FotosPlugin.swift`).
**Estado:** hecho; la app compila para el simulador sin firmar y la lógica nueva se probó con los carteles reales de producción y con imágenes trampa en un arnés de macOS. **No se probó dentro de la app en un simulador** (ver «Cómo se probó»). Pide la compilación **1.0 (6)** de TestFlight: el arreglo es código nativo. La sube el gestor.

## Qué cambió

`apps/ios/ios/App/App/FotosPlugin.swift` (`guardarFoto`) ya no se fía de lo que manda la web. Antes decodificaba la cadena entera y abría la imagen antes de pedir permiso, sin topes, y elegía el formato por el `tipo` que declaraba JavaScript. Ahora, en este orden:

1. **Tope de la cadena antes de decodificar.** Si la cadena base64 pasa de 11 184 812 caracteres (8 MiB de imagen), rechaza con `tamano`. Se mide con `utf16.count`, que no recorre la cadena. Va antes del permiso a propósito: no toca la imagen y así una cadena enorme ni siquiera hace preguntar a la persona.
2. **El permiso de solo agregar (`addOnly`).** Denegado: rechaza con `permiso` sin decodificar nada.
3. **El formato real por los primeros bytes**: JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`) o WebP (`RIFF`…`WEBP`). Todo lo demás (GIF, AVIF, HEIC, basura) se rechaza con `formato`. El `tipo` que manda la web se ignora (se sigue aceptando para no romper la web de hoy). Además ImageIO tiene que leerlo **como ese mismo formato** (`CGImageSourceGetType`): un PNG falso con la firma correcta y basura detrás, o un `RIFF/WEBP` con otra cosa dentro, también es `formato`.
4. **Dimensiones por metadatos**, sin decodificar píxeles (`CGImageSourceCreateWithData` + `CGImageSourceCopyPropertiesAtIndex`, con `kCGImageSourceShouldCache: false`): más de 8000 px por lado o de 12 millones de píxeles es `tamano`; sin ancho y alto en los metadatos, `formato`.
5. **Conversión acotada.** JPEG y PNG se guardan tal cual, byte por byte, con `PHAssetCreationRequest.addResource(with: .photo, data:, options:)` (ahora con `uniformTypeIdentifier`, el tipo real). WebP se pasa a **JPEG** (calidad 0,9, fondo blanco para la transparencia) de fuente a destino con ImageIO, solo si pasó los topes, y la salida también tiene el tope de 8 MiB. Ya no hay `pngData()`: un PNG de un cartel de 1280×1600 pesa 2,8 MB; el mismo WebP pasado a JPEG, 685 KB.
6. **Códigos cortos y estables** (`error.code` en JavaScript): `permiso`, `formato`, `tamano`, `error` (Fotos o la conversión fallaron por otra causa). Antes eran `imagen`, `permiso` y `guardar`.

La web no cambia de comportamiento: `BotonDescargarCartel.tsx` ya atrapaba cualquier rechazo y lo dice con su aviso de siempre, «No se pudo guardar». Solo se documentan los códigos en `src/lib/guardarCartel.ts` y la prueba de componentes ahora recorre los cuatro (`permiso`, `formato`, `tamano`, `error`) en vez de `permiso` y `cae`. Sin lógica nueva del lado web, así que sin prueba unitaria nueva. Sin cambios visibles: sin capturas.

Segundo commit: `CURRENT_PROJECT_VERSION = 6` en las dos configuraciones (Debug y Release) de `App.xcodeproj/project.pbxproj` (era 5). `MARKETING_VERSION` no cambia (1.0).

## Topes elegidos y por qué

| Tope | Valor | Por qué |
|---|---|---|
| Bytes de la imagen (y de la conversión) | 8 MiB (cadena: 11 184 812 caracteres) | Lo más grande que puede llegar hoy son 5 MiB: el bucket `fotos` no acepta más (`file_size_limit = 5242880`) y la web reduce las fotos antes de subirlas (`src/lib/imagen.ts`: 1600 px, JPEG ~200 KB). Los cuatro carteles reales que bajé de producción pesan 314-658 KB; los del creador, 150-250 KB. 8 MiB deja margen si un día sube el tope del bucket sin abrirle la puerta a cientos de megas. El encargo hablaba de «hasta 6 MB tras la reducción»: no pasa, el bucket corta en 5. |
| Lado | 8000 px | Los carteles reales miden 1080-1290 × 1351-1600; el creador saca 1080 de ancho. 8000 deja pasar cualquier foto de teléfono. |
| Píxeles | 12 millones | Frena la imagen chica en bytes que se infla al decodificarla (un PNG de 4000×4000 de un color pesa 15 KB y abierto ocupa 64 MB). 12 Mpx es la cámara de un iPhone; un cartel real son 2 Mpx. |

## Cómo se probó

- **Compilación** (desde `apps/ios`): `npm ci`, `npm i --no-save typescript`, `npx cap sync ios` (los 5 plugins de siempre) y `xcodebuild -scheme App -project ios/App/App.xcodeproj -destination "generic/platform=iOS Simulator" -configuration Debug CODE_SIGNING_ALLOWED=NO build` → **BUILD SUCCEEDED**, sin avisos en `FotosPlugin.swift` (Xcode 26.2, compilado otra vez con el número 6). Xcode regeneró `Package.resolved`: se revirtió, no va en el commit.
- **Arnés en macOS** (en el scratchpad, fuera del repo): el mismo `FotosPlugin.swift` compilado con `swiftc` contra un Capacitor de mentira (sin `import Capacitor`/`UIKit`; ImageIO y UTType son los mismos que en iOS). Resultado:

| Entrada | Resultado |
|---|---|
| 4 carteles reales de producción (`/api/cartel/<slug>`, JPEG 314-658 KB) | aceptados, `public.jpeg`, byte por byte |
| uno de ellos como PNG (2,8 MB) | aceptado, `public.png`, byte por byte |
| el mismo como WebP (292 KB) | convertido a JPEG de 685 KB, 1280×1600 |
| WebP con transparencia | JPEG; el píxel transparente sale blanco (255,255,255), no negro |
| GIF | `formato` |
| PNG falso (firma de PNG + basura), JPEG falso, `RIFF/WEBP` con un PNG dentro | `formato` |
| base64 roto, cadena vacía, sin `datos` | `formato` |
| PNG de 9000×10 | `tamano` |
| PNG de 4000×4000 (15 KB) | `tamano` |
| PNG de 3464×3464 (11,99 Mpx) | aceptado |
| cadena de 11 184 816 caracteres, por `guardarFoto` completo | `tamano` en 0 ms, sin llegar a pedir el permiso |
| un carácter de más del tope | `tamano` |
| 8 MiB exactos de ceros | pasa los topes de tamaño, `formato` |

- **Web:** `npm run lint` (solo el aviso viejo de `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (3363 pruebas en 185 archivos) y la prueba de componentes del botón (`BotonDescargarCartel.componentes.test.mjs`, 15 de 15 en Chrome).
- **Simulador: no.** Había tres simuladores encendidos (el iPhone SE para pruebas propias, el FLOWYA 15 Pro y el Spike 17 Pro Max) y los tres tenían abierta la app de otro proyecto: instalar y abrir la nuestra le habría quitado la pantalla a otro chat, y el encargo pedía no arrancar uno nuevo sin más.

## Cómo probarlo en el simulador (para el gestor, o con la 1.0 (6))

1. Desde `apps/ios`, con la rama: `npm ci && npm i --no-save typescript && npx cap sync ios`, y compilar para un simulador libre: `xcodebuild -scheme App -project ios/App/App.xcodeproj -destination "id=<UDID>" -configuration Debug CODE_SIGNING_ALLOWED=NO -derivedDataPath /tmp/dd build`; instalar con `xcrun simctl install <UDID> /tmp/dd/Build/Products/Debug-iphonesimulator/App.app` y abrir con `xcrun simctl launch <UDID> org.somosnosotros.app` (abre producción). Revertir `Package.resolved` si Xcode lo cambia.
2. **Camino normal:** `xcrun simctl privacy <UDID> grant photos-add org.somosnosotros.app`; abrir la ficha de un evento con cartel (p. ej. `/eventos/desierto-observacion-y-espacio`) y tocar «En Fotos»: debe decir «Guardado» y el aviso «Cartel guardado en Fotos»; la foto aparece en `~/Library/Developer/CoreSimulator/Devices/<UDID>/data/Media/DCIM/100APPLE/` con el mismo `shasum` que `curl https://somosnosotros.org/api/cartel/<slug>` (JPEG byte por byte).
3. **Rechazos desde la consola:** Safari del Mac › Desarrollo › (simulador) › la página de la app (Capacitor deja inspeccionar el WKWebView en compilaciones Debug). El método se llama `guardarFoto` (no `guardar`). En la consola:
   ```js
   const F = Capacitor.Plugins.Fotos;
   const prueba = (d) => F.guardarFoto({ datos: d, tipo: "image/png" }).then((r) => r, (e) => e.code);
   await prueba("A".repeat(11184813));                       // "tamano" (cadena enorme; sin preguntar el permiso)
   await prueba(btoa("\x89PNG\r\n\x1a\n" + "x".repeat(4000))); // "formato" (PNG falso)
   await prueba(btoa("GIF89a" + "x".repeat(100)));            // "formato" (otro formato)
   await prueba("no es base64!!");                           // "formato"
   ```
   Y con el permiso revocado (`xcrun simctl privacy <UDID> revoke photos-add org.somosnosotros.app`), un cartel real da `"permiso"` y el botón dice «No se pudo guardar».

## Por confirmar

- **En el simulador o en el iPhone con la 1.0 (6):** los pasos de arriba. El permiso, la escritura en Fotos y el puente de Capacitor no los cubre el arnés.
- **HEIC, GIF y AVIF ya no se guardan** (antes se pasaban a PNG). Hoy no llegan: el bucket solo acepta JPEG, PNG, WebP y HEIC, la web convierte las fotos a JPEG antes de subirlas y `/api/cartel` no entrega HEIC (`extensionDeImagen`). Si algún día se sirven, habría que añadirlos aquí con su firma.
- **Fondo blanco al pasar WebP a JPEG.** Es lo que se ve bien en un cartel; un WebP con transparencia pierde el canal alfa (JPEG no lo tiene).
- El orden «tope de la cadena → permiso → decodificar» difiere un poco del encargo (que ponía el permiso primero): medir la longitud no toca la imagen y evita preguntar el permiso por una cadena que de todos modos se rechaza.
