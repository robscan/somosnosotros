# 344 · «Guardar en Fotos» el cartel del evento

**Pieza:** OL-317. **Rama:** `guardar-en-fotos` (sobre `origin/main` `54bfb80f`). **Fecha:** 2026-10-06. **Operador:** Claude Sonnet 5.5 (agente del gestor IV).
**Estado:** hecho y probado: la app de iPhone se compiló sin firmar y se probó en un simulador (iOS 26.3) contra la web local; la web, con los componentes reales en Chrome. Falta el iPhone real (lista al final). Sin migraciones. **Pide una compilación nueva de TestFlight, la 1.0 (5):** el plugin es código nativo.

## Qué se encargó

Pedido del founder (2026-10-06): «Ya veo la opción de descargar cartel, por favor agrega la opción de guardar en Fotos del celular, porque sí muestra todos los elementos de compartir pero lo más práctico es eso.» Hasta ahora «Descargar el cartel» (OL-304, bitácora 332) abría en el iPhone la hoja de compartir con la imagen y había que buscar «Guardar imagen». Se quería un toque directo.

**Cambio del founder a mitad de la pieza** (mensaje del gestor, 2026-10-06): «en web que se descargue como promete». Sustituye el punto 2 del encargo: en la web el botón sigue llamándose «Descargar el cartel» y **descarga de verdad** el archivo, sin hoja de compartir. Lo que sigue ya lo refleja.

## Qué hay

Un solo botón, `BotonDescargarCartel`, con dos comportamientos según el entorno (el mismo en «Publicado» y en la ficha del evento; no se añade ningún botón y «Compartir» no cambia):

| Dónde | Dice | Qué hace |
|---|---|---|
| La app de la tienda con el plugin (compilación 1.0 (5) en adelante) | «Guardar en Fotos» → «Guardando…» → «Guardado en Fotos» | Manda la imagen al plugin nativo, que la agrega a Fotos |
| La web (Safari, la web instalada, cualquier navegador) | «Descargar el cartel» → «Preparando…» → «Cartel descargado» | Descarga el archivo (`<a download>` hacia el `blob:`, la función `guardar` de siempre) |
| La app de una compilación vieja (sin el plugin) | como la web | descarga, como la web |

Archivos nuevos:
- `apps/ios/ios/App/App/FotosPlugin.swift`: plugin nativo `Fotos`, método `guardarFoto({ datos, tipo })`.
- `src/lib/guardarCartel.ts` (+ `guardarCartel.test.ts`): detecta el plugin (`window.Capacitor.Plugins.Fotos`, el mismo patrón que `calendarioNativo.ts`), decide el destino (`fotos` o `descarga`) y los textos de cada momento.
- `docs/rediseno/capturas-344/` (9 capturas).

Archivos tocados:
- `apps/ios/ios/App/App/MainViewController.swift` (registra el plugin) y `App.xcodeproj/project.pbxproj` (el archivo nuevo en el proyecto).
- `apps/ios/ios/App/App/Info.plist`: `NSPhotoLibraryAddUsageDescription` = «Para guardar el cartel del evento en tus fotos».
- `src/components/BotonDescargarCartel.tsx`: ya no usa `navigator.share` ni `canShare`; pierde las propiedades `titulo` (era solo de la hoja de compartir), `textos` y `etiqueta` (los textos salen de `lib/guardarCartel`); gana `claseTexto`: el texto va ahora en su propio `<span>`, para que en la ficha se corte a dos líneas bajo su círculo.
- `src/app/nuevo/evento/Publicado.tsx` y `src/app/eventos/[id]/page.tsx`: quitan lo que ya no se pasa; la ficha le pone `ficha.accionEtiqueta` al letrero. Sin cambios de CSS.
- `src/components/BotonDescargarCartel.componentes.test.mjs` y `src/app/nuevo/evento/AltaEvento.componentes.test.mjs`: ver «Pruebas».

## Cómo funciona

**La app.** La página es la web de producción dentro del WKWebView de Capacitor; no trae código de pantallas. El plugin nativo vive en la app y la web lo llama como a `Calendario`: `window.Capacitor.Plugins.Fotos.guardarFoto`. Esa propiedad solo existe con la compilación que lo trae, así que la misma web sirve a la app nueva y a la vieja sin versiones. El botón trae el cartel de `/api/cartel/[id]` (como siempre), lo pasa a base64 con `FileReader` y se lo da al plugin. El plugin:
1. valida que la imagen se pueda leer (`UIImage`); si no, rechaza con código `imagen`;
2. pide el permiso de **solo agregar** (`PHPhotoLibrary.requestAuthorization(for: .addOnly)`): la app nunca lee la fototeca. La primera vez iOS pregunta; si dicen que no, rechaza con código `permiso`;
3. escribe con `PHAssetCreationRequest` + `addResource(with: .photo, data:)`. JPEG y PNG se guardan tal cual, byte por byte; cualquier otro formato que iOS lea (WebP, AVIF, GIF) se guarda como PNG para no depender de que Fotos lo acepte tal cual.

**Si Fotos falla** (permiso negado, sin espacio): el botón dice «No se pudo guardar» cuatro segundos, no abre nada ni sale de la pantalla, y el siguiente toque vuelve a intentarlo (iOS, con el permiso ya negado, contesta al instante; hay que activarlo en Ajustes). Ver decisión 2.

**La web.** El botón es un enlace de verdad (`<a href="/api/cartel/<id>" download>`, mejora progresiva): el script le añade el flujo, que ahora es solo «traer el cartel y descargarlo». En el iPhone, Safari lo deja en Descargas (Archivos) y enseña su aviso de descarga. Abrir en otra pestaña (Cmd, Ctrl, clic central) sigue siendo cosa del navegador.

**Sin parpadeo de hidratación.** El plugin se detecta con `useSyncExternalStore` (en el servidor, «no hay plugin»; en el cliente, lo que haya). En la ficha, que se pinta en el servidor, quien abre la app ve «Descargar el cartel» un instante antes de que React tome la página y diga «Guardar en Fotos». En «Publicado» (sin pintado en el servidor) no ocurre.

## Decisiones del operador (las que más conviene revisar)

1. **Plugin local en Swift, no `@capacitor-community/media` 9.1.0.** El paquete sí encaja (`npm view`: pide `@capacitor/core >=8`, trae `Package.swift` y usa el mismo permiso de solo agregar), pero arrastra SDWebImage y toda la superficie de lectura de álbumes (listar álbumes, leer miniaturas) para una sola operación de escritura. El proyecto ya registra a mano cuatro plugins nativos sin paquete de npm (`CalendarioPlugin`, `EntrarSistemaPlugin`, `GestoAtrasPlugin`, `EntornoApnsPlugin`); este es el quinto, con el mismo patrón, unas 50 líneas y sin dependencias nuevas. `npm install` y `npx cap sync ios` pasan sin cambios en `apps/ios` (`package.json` y `Package.swift` no se tocaron).
2. **Si Fotos falla en la app, no hay hoja de compartir de respaldo.** El encargo original decía «No se pudo guardar y la hoja de compartir como salida»; el cambio del founder («en web que se descargue como promete», «quita el camino de `navigator.share` con archivos del botón») lo quita del botón. Tampoco cae en la descarga: en el WKWebView de la app un `<a download>` hacia un `blob:` no tiene a dónde ir y podría sacar a la persona de la pantalla (el plugin de la app no implementa descargas). Con el permiso negado, la salida es «Compartir» (que no cambió) o activarlo en Ajustes. Si el founder quiere el respaldo, es una línea en `guardarCartel.ts` (`destinoDeRespaldo` se quitó, estaba en la primera versión).
3. **La app vieja descarga con un `<a download>` hacia un `blob:`, no con la hoja de compartir** (como pidió el gestor). Antes (OL-304) en la app se abría la hoja con `navigator.share`. Es una regresión posible solo para quien tenga una compilación anterior a la 1.0 (5) y toque el botón: **no probé qué hace el WKWebView con esa descarga** (no hay compilación vieja a mano). Ver la lista para el iPhone.
4. **Icono: el de descarga de siempre** (`IconoDescarga`, flecha a una bandeja). El set no tiene icono de foto y la flecha sirve para las dos cosas; no dibujé uno nuevo (suben `medidasEnDuro` del inventario).
5. **Los avisos de cada momento** (`guardarCartel.ts`): app, «Guardando…» / «Guardado en Fotos» / «No se pudo guardar»; web, «Preparando…» / «Cartel descargado» / «No se pudo descargar» (los de OL-304, sin cambio). En la ficha el letrero ahora es el mismo texto completo («Descargar el cartel» o «Guardar en Fotos»), a dos líneas bajo su círculo: antes era la palabra corta «Cartel» con su nombre completo aparte. Con cuatro acciones caben en una sola fila a 390 (capturas 01 y 06). El nombre accesible es el letrero visible (ya no hace falta `aria-label`).
6. **Siguen existiendo la propiedad `precargar`** (trae el cartel al montarse): la hoja de compartir ya no necesita el toque instantáneo, pero con el archivo ya en memoria la descarga o el guardado salen sin esperar la red; «Publicado» la sigue pidiendo, la ficha no (cada precarga es una salida de Storage).
7. **«Publicado» se probó en la app solo con el plugin simulado** (no hay sesión en el simulador): la prueba de componentes pone `window.Capacitor.Plugins.Fotos` y comprueba que el toque le entrega el PNG. El plugin real se probó en la ficha, que es la misma pieza (ver «Pruebas»).
8. **Mejora gratis (miniatura con «Añadir a Fotos»): ya está.** La miniatura de «Publicado» (`Renglon` → `ui/Imagen`) y la portada de la ficha (`Cartel` → `ui/Imagen`) son `<img>` de verdad (`next/image`, o `<img>` simple si no se optimiza), no fondos CSS. En Safari mantener presionado debería ofrecer «Añadir a Fotos». Dos matices: (a) la miniatura va dentro de un enlace (el menú también ofrece el enlace); (b) el visor a pantalla completa (`VisorImagen`, `-webkit-touch-callout: none` y `touch-action: none` por el pellizco y el arrastre) **bloquea** ese menú, a propósito. No lo toqué (componente firmado; el gesto largo choca con el pellizco). Dentro de la app, `.app-nativa *` quita el menú en todo (OL-205): ahí manda el botón.
9. **Bitácora 344 y OL-317** como los asignó el gestor (el script de siguiente número decía 343 y OL-317: la 343 la tiene otra pieza).

## Pruebas

- `npm run lint` (solo el aviso anterior de `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (2260 pruebas en 152 archivos; +10 de esta pieza en `guardarCartel.test.ts`), `npm run inventario` sin novedades, `npm run medir` (26 pantallas × 4 anchos, sin novedades; la ficha del evento no enseña el botón en la prueba, como antes).
- `apps/ios`: `npm install` y `npx cap sync ios` correctos, sin plugins nuevos (5 de siempre). `xcodebuild` para el simulador, sin firmar: **BUILD SUCCEEDED**.
- Pruebas de componentes (`test:componentes`) de lo tocado: `BotonDescargarCartel` 8 pruebas, `AltaEvento` 83. Las de `BotonDescargarCartel` cubren: web que comparte archivos, el botón **descarga** con el nombre de la ruta, dice «Cartel descargado», vuelve a su texto a los 4 s y **nunca** llama a `navigator.share`; web sin `share`; la ruta que falla («No se pudo descargar», no sale de la pantalla, el siguiente toque vuelve a pedirlo); `precargar`; la ficha (el letrero en su `<span>` con la clase que se le da); **la app con plugin** («Guardar en Fotos», «Guardando…», el plugin recibe el PNG tal cual en base64 y su tipo, ni hoja ni descarga, «Guardado en Fotos», vuelve a los 4 s); **Fotos que falla** por permiso o por otra causa (no abre hoja ni descarga, no sale de la pantalla, el siguiente toque reintenta); **la app vieja** (Capacitor sin plugin: «Descargar el cartel» y descarga). `AltaEvento`: el test de «con cartel» ahora comprueba la descarga (antes la hoja) y que `navigator.share` no se llamó; uno nuevo prueba «Publicado» en la app con «Guardar en Fotos». Las pruebas anteriores cambiaron de texto (de «Descargar el cartel»/«Cartel descargado» con hoja a descarga), como pide el cambio; ninguna se borró.
- **Simulador (iPhone 17 Pro propio, iOS 26.3; el «FLOWYA iPhone 15 Pro» no arrancó la app: «system shell probably crashed»):** se compiló la app sin firmar con `server.url` temporal a la web local (`next build && next start -p 3101` contra el respaldo local con un «Storage» inventado, puertos 8843 y 3101 porque el 8842 lo usaba otro chat) y un guion temporal en `layout.tsx` que tocaba solo el botón (el panel de control del simulador no estaba concedido: no pude tocar a mano). **Todo lo temporal se revirtió antes del commit** (`server.url`, el guion, y `Package.resolved`, que Xcode había regenerado). Resultado:
  - Con el permiso concedido (`simctl privacy grant photos-add`): la ficha de la app dice «Guardar en Fotos»; al tocar, «Guardado en Fotos». En la fototeca del simulador aparece **`IMG_0007.PNG`, 1200×630, agregada en ese momento, con el mismo `shasum` que el archivo de origen** (`7da97cd1…`): la imagen llegó a Fotos byte por byte. (No pude abrir la app Fotos para fotografiarla: su pantalla de «Novedades» pide un toque y no tengo cómo dárselo; la evidencia es el archivo y la base `Photos.sqlite`.)
  - Con el permiso revocado (`revoke photos-add`): «No se pudo guardar», sin hoja, sin descarga y sin salir de la pantalla; la fototeca no cambió.
  - **No probé:** el diálogo del permiso la primera vez (pre-concedí/revoqué por línea de comandos), «Publicado» dentro de la app real (pide sesión), la app vieja sin plugin, ni nada en un iPhone de verdad.

## Capturas (`docs/rediseno/capturas-344/`; las de Chrome, 390×844 a 2×; las de la app, 402×874 del simulador a 3× y reducidas a 2×; todas abiertas y revisadas)

1. `344-01-ficha-web-descargar-el-cartel`: la ficha del evento en la web a 390: portada, los tres números y, en una sola fila, «Compartir», «A mi calendario», «Cómo llegar» y «Descargar el cartel» (con la flecha, el letrero a dos líneas).
   `344-01b-ficha-web-cartel-descargado`: lo mismo tras tocar: el botón dice «Cartel descargado»; la descarga entregó `cartel-concierto-de-la-orquesta-sinfonica-de-san-luis-potosi.png`.
2. `344-02-publicado-web-descargar-el-cartel` y `344-03-publicado-web-cartel-descargado`: «Publicado» con cartel en la web: sello verde, «Evento publicado», la tarjeta con su miniatura y, abajo, «Compartir» violeta, el secundario «Descargar el cartel» (y luego «Cartel descargado») y «Publicar otro» subrayado. Igual que `capturas-332/332-02` salvo la hoja de compartir que ya no se abre.
3. `344-04-publicado-app-guardar-en-fotos` y `344-05-publicado-app-guardado-en-fotos`: lo mismo con el plugin simulado (la app): el secundario dice «Guardar en Fotos» y luego «Guardado en Fotos».
4. `344-06-app-ficha-guardado-en-fotos` (simulador, la app real): la ficha con «Guardado en Fotos» bajo el círculo de descarga, cuatro acciones en una fila. Notar que la portada muestra el logotipo y no el cartel porque el respaldo local sirve la imagen desde otro puerto: es del respaldo, no de la pieza.
   `344-07-app-ficha-guardar-en-fotos`: la misma ficha en reposo, «Guardar en Fotos» a dos líneas.
   `344-08-app-ficha-no-se-pudo-guardar-recorte`: recorte de la fila de acciones con el permiso negado: «No se pudo guardar» a dos líneas.

## Para probar en el iPhone (el founder)

1. **Compilar la 1.0 (5) y subirla a TestFlight** (yo no abrí Xcode ni subí nada; el número de compilación sigue en 4). Es obligatorio: sin ella el botón de la app no cambia.
2. En la app, abrir un evento con cartel (la ficha) → «Guardar en Fotos». La primera vez iOS pregunta «“Somos Nosotros” quiere agregar fotos»: Permitir. ¿Dice «Guardado en Fotos» y el cartel está en Fotos, en Recientes? ¿Se ve bien (sin recorte ni calidad rara)?
3. Ajustes › Somos Nosotros › Fotos: poner «Nunca» y tocar de nuevo: ¿dice «No se pudo guardar» sin trabarse?
4. En «Publicado» (publicar un evento con cartel desde `/nuevo/evento`, en la app): el secundario dice «Guardar en Fotos» y guarda igual.
5. En Safari del iPhone (no la app): «Descargar el cartel» ¿descarga a Archivos › Descargas y Safari enseña su aviso? ¿No abre la hoja de compartir?
6. Si tienes la 1.0 (4) en otro teléfono: «Descargar el cartel» dentro de la app vieja ¿descarga o hace algo raro? (decisión 3).
7. Mantener presionado el cartel de la ficha o la miniatura de «Publicado» en Safari: ¿ofrece «Añadir a Fotos»?

## Lo que falta / para las piezas siguientes

- Si el permiso negado en la app pide una salida más amable, un aviso con «Abrir Ajustes» (hoy: «No se pudo guardar» sin explicar por qué; el plugin ya distingue el código `permiso`).
- Si el founder quiere que la app de una compilación vieja se porte como antes (hoja de compartir), es tocar la decisión 3.
