# 282 · La distancia al día sin tocar nada (OL-255)

**Fecha:** 2026-10-01 · **Rama:** `ubicacion-al-dia`, desde `origin/main` (`567b39bc`) · **OL:** OL-255 · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows.

Reporte del founder (app nativa): la distancia a un lugar solo aparecía tras un toque, y como la ubicación se guarda 15 minutos, si la persona camina la distancia queda vieja. Su decisión: con el permiso ya concedido, la app relee la ubicación aproximada sola al abrir Lugares o una ficha y al volver al frente, si el último punto tiene más de 1 minuto; sin permiso, todo igual (el aviso del sistema solo sale tras un toque); sin seguimiento continuo.

## Lo que devuelve el permiso en la app nativa (comprobado)

`apps/ios` no trae plugin de geolocalización: la web usa `navigator.geolocation` dentro del WKWebView, con `NSLocationWhenInUseUsageDescription` en el Info.plist. Se comprobó en el simulador «FLOWYA iPhone SE» (iOS 26.3) con una app mínima de prueba (un `WKWebView` simple con el mismo Info.plist de ubicación; no la app real, que carga somosnosotros.org y no tiene esta pieza todavía; la misma librería WebKit):

1. **`navigator.permissions.query({ name: "geolocation" })` lanza `NotSupportedError: Permissions::query does not support this API`.** En el WKWebView no sirve (en Safari y Chrome sí). Hay que tener un respaldo.
2. **iOS pregunta dos veces, en capas distintas:** (a) el aviso de la app («¿Permitir a la app usar tu ubicación?», con «Permitir una vez», «Al usar la app», «No permitir»), una sola vez en la vida de la instalación si la persona elige «Al usar la app»; y (b) el aviso del sitio de WebKit («"somosnosotros.org" quiere usar tu ubicación actual», «Permitir» / «No permitir»), **que vuelve en la primera lectura tras cada arranque en frío de la app**, aunque el permiso de la app ya esté dado. Dentro de la misma sesión (sin cerrar la app) no vuelve a preguntar.
3. Por eso la idea de «recordar en disco que ya lo concedió» **no sirve**: tras cerrar y abrir la app, una lectura automática dispara el aviso del sitio sin que nadie toque. Se comprobó: con una marca guardada en `localStorage`, al relanzar la app la lectura sin toque mostró el aviso. Eso es lo que no debe pasar.

Quitar el aviso (b) requiere código nativo (por ejemplo un plugin de geolocalización con CoreLocation; sin probar) y una versión nueva en TestFlight: **no se hizo; lo decide el founder.** Ver «Para el founder» abajo.

## Solución (frases llanas)

- La lectura sola solo ocurre si **sabemos con certeza que no habrá aviso**: o el navegador dice que el permiso está concedido (`permissions.query` → «granted»: Safari, Chrome), o, donde esa consulta no existe (la app de iPhone), **si en esta misma sesión una lectura ya salió bien** (la que hizo el toque de la persona). Esa memoria vive solo en memoria de la página, no en disco: al cerrar y abrir la app se olvida y la primera lectura vuelve a requerir un toque, que es cuando iOS puede preguntar.
- Si el permiso aparece denegado (o una lectura falla con «negado»), deja de releer y la ficha vuelve al guion. No insiste.
- Cuándo relee: al montarse una pantalla que muestra distancia (ficha de lugar, ficha de evento con distancia, Lugares) y cuando la app vuelve al frente (`visibilitychange`), solo si el último punto tiene más de 1 minuto (`RELECTURA_MS`) o no hay ninguno. Una sola lectura a la vez aunque la pidan varias pantallas. Aproximada (`enableHighAccuracy: false`) y, para que el navegador no devuelva una posición vieja suya, `maximumAge` de 1 minuto. Sin `watchPosition`.
- Mientras llega, se ve la distancia anterior; al llegar se actualiza sola (`avisarUbicacion`). Con una sola pieza de lógica: `releerUbicacionAlDia()` en `src/lib/ubicacion.ts`, llamada desde `useUbicacionFresca` (que ya usan el número «Distancia» de la ficha y el renglón del sitio de un evento). Nada duplicado en los componentes.
- Lugares: `VistaLugares` ahora también usa el hook; una vez que la persona tocó «Mi ubicación», el orden por cercanía y el punto azul siguen a la ubicación al día. Sin ese primer toque, Lugares no ordena por cercanía sola (igual que hoy); lo decide el founder si quiere que lo haga con el permiso concedido.
- La caché de 15 minutos (`FRESCURA_CERCANA_MS`) se queda, con otro papel: es hasta cuándo se **enseña** un punto viejo mientras llega el nuevo, y el respaldo cuando no hay permiso consultable (la persona que tocó hace 10 minutos sigue viendo la distancia al abrir la app sin que se relea). Con el permiso concedido el punto se renueva a partir de 1 minuto; pasados los 15 minutos el viejo se descarta y se ve el guion hasta que llega el nuevo.

## Pruebas

- `src/lib/ubicacion.test.ts` (vitest, +10): la decisión `debeReleer`; concedido y viejo → relee y guarda; concedido y fresco → no llama; sin permiso («prompt»), denegado o sin `permissions` → nunca llama a `getCurrentPosition`; permiso revocado entre la consulta y la lectura → no truena ni insiste; relectura aproximada con `maximumAge` 60 s; varias pantallas comparten una lectura; WKWebView (la consulta lanza): sin lectura previa no relee, tras una lectura buena en la sesión sí, tras negarse deja de releer.
- `src/components/useUbicacionFresca.componentes.test.mjs` (Chrome real con geolocalización simulada, 5 pruebas): con permiso y punto de hace 2 minutos se actualiza sola; con permiso y sin punto aparece sola; con el punto fresco (30 s) no llama, tampoco al volver al frente; al volver al frente con el punto viejo se pone al día; sin permiso nunca llama y conserva lo guardado.
- `npm run lint` (0 errores; 1 aviso que ya había en `VisorImagen.componentes.test.mjs`), `typecheck`, `test` (1696), `inventario` (sin novedades), `medir` (sin novedades), `test:componentes` (213 de 213).

## Evidencia

Build local contra el respaldo de datos inventados, Chrome 390×844, `docs/rediseno/capturas-282/` (cada PNG abierto y mirado):

- `distancia-sola-con-permiso.png`: ficha del Teatro de la Paz con el permiso concedido y sin tocar nada; el número «Distancia» dice «1,1 km».
- `distancia-tras-volver-al-frente.png`: la misma ficha, tras mover la ubicación simulada 8 km al este, esperar 62 s sin tocar nada y volver la app al frente: «7,9 km», actualizado solo.
- `sin-permiso-guion.png`: sin permiso concedido, «Distancia» dice «—» y se comprobó que la página hizo 0 lecturas al navegador (el aviso queda para el toque).

**App nativa:** probada solo la parte del WKWebView con la app mínima descrita arriba (consulta del permiso, avisos y relanzamiento); la app real no se compiló. El simulador «FLOWYA iPhone SE» estaba apagado y se apagó al terminar; no se tocó el iPhone 15 Pro.

## Para el founder (TestFlight)

Esta pieza no cambia código nativo. En la app de TestFlight, comprobar con el permiso ya dado («Al usar la app»): (1) abrir una ficha de lugar tras haber tocado antes «Mi ubicación» o «Calcular la distancia»: la distancia debe actualizarse sola al volver a la app pasado 1 minuto; (2) **cerrar la app del todo y abrirla**: la ficha debe mostrar el guion hasta un toque, y ese primer toque puede mostrar el aviso del sitio («somosnosotros.org quiere usar tu ubicación actual»); (3) con «Permitir una vez» la app se comporta igual que tras cerrar la app (sin lectura sola). **Opción nativa, si quiere quitar el aviso del sitio al abrir (sin probar):** un plugin de geolocalización nativo (CoreLocation) en lugar de la API del WebView, de modo que WebKit no pregunte. Implica versión nueva en TestFlight, así que se deja sin hacer.
