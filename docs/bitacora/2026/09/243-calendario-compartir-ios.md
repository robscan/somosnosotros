# 243 · «A mi calendario» y «Compartir» nativos en la app de iPhone (OL-214)

**Fecha:** 2026-09-25 · **Rama:** `calendario-compartir-ios`, desde `origin/main`.

## Pedido

OPEN_LOOPS, OL-214: dar valor nativo real dentro de la app (guía 4.2 de App Store) sin cambiar el diseño, en
dos piezas que hoy salen de la web:

1. «A mi calendario» (ficha de evento): hoy descarga un `.ics`. Dentro de la app, abrir la hoja nativa del
   sistema para agregar el evento.
2. «Compartir» (fichas de evento, lugar y artista): hoy usa `navigator.share` o copia el enlace. Dentro de la
   app, la hoja nativa del sistema.
3. Fuera de la app (Safari, Chrome, web instalada), todo sigue igual.

## 1 · «A mi calendario»

**Dónde vivía:** `src/app/eventos/[id]/page.tsx` pintaba un `<a href="{...}/calendario">` a secas (la ruta
`src/app/eventos/[id]/calendario/route.ts`, que arma un `.ics` con `lib/calendario.ts`).

**Arreglo — plugin nativo propio, sin paquete de npm** (mismo patrón que `EntrarSistemaPlugin.swift` y
`GestoAtrasPlugin.swift`, registrado a mano en `MainViewController.capacitorDidLoad()`):

- **`apps/ios/ios/App/App/CalendarioPlugin.swift`** (nuevo): `EKEventEditViewController` de EventKitUI.
  Recibe `titulo`, `inicio`, `fin` (ISO 8601), `lugar`, `url` y `notas`, arma un `EKEvent` y presenta la hoja.
  Desde iOS 17 esta vía de *solo agregar* no pide acceso al calendario (Apple, WWDC23 "What's new in
  EventKit"): el permiso de "acceso completo" solo hace falta para leer o modificar eventos que ya existen. Por
  eso **no se agregó ninguna clave a Info.plist** — se comprobó en el simulador: la hoja aparece de una vez,
  sin ningún aviso de permiso de por medio (captura 02).
- **Zona horaria:** `inicio`/`fin` viajan como instantes absolutos ISO 8601, igual que ya hace el `.ics`
  (`aFechaIcs` en `lib/fechas.ts`: `new Date(iso).toISOString()`, sin reinterpretar por zona). EventKit y el
  Calendario del teléfono muestran cualquier `Date` en la hora local de quien mira — no hace falta tocar la
  zona horaria del evento (`e.zona`) para nada de esto. Verificado en la captura 02: un evento a las 19:00–21:00
  UTC se ve 1:00 p.m.–3:00 p.m. en el simulador (América/Ciudad de México, UTC−6).
- **`src/lib/calendario.ts`:** nueva `datosEventoNativo(e)`, con el mismo criterio de `fin` por defecto (2
  horas) y de URL que ya usaba `archivoIcs` (que ahora llama a la misma `finPorDefecto` interna, sin
  duplicar el cálculo).
- **`src/lib/calendarioNativo.ts`** (nuevo, puro): `calendarioDelSistema(ventana)` — el plugin nativo si
  `window.Capacitor.Plugins.Calendario` existe (dentro de la app), `null` si no (Safari, Chrome, la web
  instalada corriendo fuera de Capacitor). Mismo patrón que ya usa `Navegacion.tsx` con `GestoAtras`.
- **`src/components/BotonCalendario.tsx`** (nuevo, cliente): envuelve el mismo `<a href=".../calendario">` de
  siempre (mejora progresiva — sin JavaScript, o fuera de la app, sigue descargando el `.ics`); con el plugin
  presente, cancela esa navegación y llama `agregarEvento(datos)`.
- **`src/app/eventos/[id]/page.tsx`:** arma `lugarCalendario` (nombre + dirección del lugar, mismo criterio
  que `donde` en `calendario/route.ts`, para que la hoja tenga algo útil para llegar) y pasa
  `datosEventoNativo(...)` a `BotonCalendario`. Sin cambios de estilo: mismas clases (`ficha.accion`), mismo
  icono, mismo texto.

**Error encontrado y corregido en el simulador:** la primera versión creaba `EKEvent`/`EKEventEditViewController`
fuera del `DispatchQueue.main.async` (solo el `present(...)` final estaba ahí dentro). Capacitor llama los
métodos de un plugin en una cola de fondo (`Bridge.handleJSCall`), y construir un `UIViewController` fuera del
hilo principal tronó la app entera (`NSInternalInconsistencyException`, *"Modifications to the layout engine
must not be performed from a background thread"* — visto con `simctl spawn log show`, capturado como un salto
a la pantalla de inicio sin aviso). Se corrigió moviendo todo el bloque (`EKEventStore`, `EKEvent`, el propio
`EKEventEditViewController` y su presentación) dentro de `DispatchQueue.main.async`.

## 2 · «Compartir»

**Dónde vivía:** `src/components/BotonCompartir.tsx` — `navigator.share` si existe, si no WhatsApp directo.

**Decisión, con evidencia:** se probó en el simulador (captura 04) y `navigator.share` **ya abre la hoja nativa
del sistema** (`UIActivityViewController`, con el título y la URL correctos) dentro del WKWebView de la app tal
cual — WebKit trae el Web Share API desde iOS 15, y Capacitor no lo bloquea. **No se agregó `@capacitor/share`
ni ningún código nuevo**: es la vía más simple y ya funciona bien, dentro y fuera de la app, sin distinguir
ningún caso.

## 3 · Fuera de la app

Sin cambios: `BotonCalendario` es el mismo `<a>` con `href` de siempre cuando `calendarioDelSistema()` da
`null`, y `BotonCompartir` no se tocó.

## Evidencia

- `npm run lint && npm run typecheck && npm test && npm run build`: verde (107 archivos de prueba, 1315
  pruebas; build de producción completo).
- Pruebas nuevas: `src/lib/calendario.test.ts` (`datosEventoNativo`: fin por defecto, fin explícito, URL con y
  sin slug, lugar/notas sin escapar) y `src/lib/calendarioNativo.test.ts` (`calendarioDelSistema`: sin
  `Capacitor` en `window`, con `Capacitor` pero sin el plugin todavía, y con el plugin registrado).
- Simulador propio (`OL214-CalendarioCompartir`, iPhone 17 · iOS 26.3, creado y borrado al terminar): la app se
  compiló con `xcodebuild` apuntando `server.url` a un `next dev` local (`http://localhost:3177`, solo en este
  árbol, nunca comiteado — confirmado con `git diff`/`git status` antes del commit) sirviendo una página de
  prueba temporal (`src/app/prueba-ol214/page.tsx`, con datos inventados, sin Supabase de por medio; borrada
  antes del commit) que renderiza los mismos `BotonCalendario`/`BotonCompartir` que usa la ficha real.
  - `01-prueba-boton-calendario-compartir.png` — la página de prueba dentro de la app, con los dos botones.
  - `02-hoja-calendario-datos-llenos.png` — `EKEventEditViewController` con título ("Noche de son en el
    patio"), lugar ("Teatro de la Paz, Av. Venustiano Carr…"), 26 sep 2026 1:00 p.m.–3:00 p.m. (19:00–21:00 UTC
    convertidas a hora de México), la URL de la ficha y las notas — sin ningún aviso de permiso.
  - `03-hoja-calendario-descartar-sin-permiso.png` — el aviso "¿Quieres descartar este nuevo evento?" al
    cerrar sin guardar (comportamiento normal de EventKit; no se guardó nada).
  - `04-hoja-compartir-nativa.png` — `UIActivityViewController` con "Noche de son en el patio" / 
    "somosnosotros.org", confirmando que `navigator.share` ya funciona dentro de la app.
- Correos en el diff: ninguno (`git diff | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` no encontró nada fuera
  de este archivo).

## Archivos

- Nuevos: `apps/ios/ios/App/App/CalendarioPlugin.swift`, `src/lib/calendarioNativo.ts`,
  `src/lib/calendarioNativo.test.ts`, `src/components/BotonCalendario.tsx`.
- Tocados: `apps/ios/ios/App/App/MainViewController.swift` (registra el plugin, bloque propio junto a los
  otros dos), `apps/ios/ios/App/App.xcodeproj/project.pbxproj` (referencias del archivo nuevo),
  `src/lib/calendario.ts` (`datosEventoNativo`, `finPorDefecto` compartida con `archivoIcs`),
  `src/lib/calendario.test.ts`, `src/app/eventos/[id]/page.tsx`.
- Sin tocar (como pedía el encargo): `ui/Cabecera`, `globals.css`, Lugares, avisos/push, `apps/ios/package.json`
  (sin dependencia nueva), `Package.swift`.
