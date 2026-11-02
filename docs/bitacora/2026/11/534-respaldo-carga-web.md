# 534 · OL-501 · Respaldo ante cargas fallidas en la web instalada (service worker + «No se pudo cargar»)

**Fecha:** 2026-11-02. **Rama:** `respaldo-carga-web` (desde `origin/main` `2a9bd2c5`).
**Quién:** operador del Gestor de cambios VIII (agente en árbol aislado, sin subagentes, council ni workflows). **Sin migraciones ni variables de
entorno nuevas.** **Estado:** listo para revisar; falta la prueba del founder en su iPhone (abajo) y medir el arranque del SW en el teléfono.

> Palabras que se repiten (cada una en una línea):
> - **Service worker (SW)**: un guion que el navegador guarda aparte y que puede contestar las peticiones de la app; aquí ya recibía los avisos push.
> - **Navegación**: abrir o recargar una pantalla entera (no los datos que la pantalla pide después).
> - **Respaldo**: la página «No se pudo cargar» que el SW enseña cuando la pantalla no llega.

## El pedido

Founder, 2026-11-02: «al abrir la app noto que se queda la pantalla en blanco. Como un error en servicios. No me presenta ninguna opción de recarga
ni nada. Tuve que volver a abrir la app (iOS) para que recargara». Aprobó el respaldo («Si me gusta»). El council (`docs/council/COUNCIL_recarga-
app-instalada_2026-11-02.md`, B3, M4, M5, m2, m3, m4) dejó el pull para recargar fuera; esta pieza es solo el respaldo web (Tramo 1, punto 8 de la
bitácora 533). La app de la tienda lleva su respaldo nativo en otra pieza.

## Qué cambió

- **`public/sin-conexion.html`** (nuevo): página estática con el símbolo SN en línea, «No se pudo cargar», «Suele arreglarse al intentar de nuevo.»
  y el botón «Intentar de nuevo» de 48 px (violeta de la app, radio 8, letra 18 en negrita, como `Boton`). CSS en línea con los tokens de
  `globals.css` copiados (un archivo estático no los importa), letra del sistema (sin Bricolage: no hay red para traerla), `font:
  -apple-system-body` en iPhone para que crezca con el tamaño de texto del teléfono; rejilla de una columna centrada con las zonas seguras. Sin
  React, sin `/_next/static`. El botón recarga la misma dirección (`location.reload()`: conserva el enlace profundo); abierta a mano
  (`/sin-conexion.html`) lleva a Inicio. Vuelve sola al recuperar la red (`online`, un segundo después: ver «Hallazgo»). Si el servidor contestó
  con error, el texto dice «El servidor no respondió. Suele arreglarse al intentar de nuevo.». Deja la marca `sn_carga_fallida` (`{ cuando,
  motivo: "red"|"servidor", app: "pwa"|"tienda" }`) solo cuando la sirve el SW, no cuando se abre a mano.
- **`public/sw.js`**: la primera línea dice el alcance y los límites. Manejador `fetch` solo para `GET` + `mode: "navigate"` + mismo origen, fuera
  de `/api/`, `/auth/` y `/_next/` (en `/auth/*` no hay respaldo: el código PKCE es de un solo uso, pasa tal cual). La petición va tal cual
  (`fetch(event.request)`, con sus galletas). Tope `TOPE_NAVEGACION_MS = 12000` hasta que llegan las cabeceras (`Promise.race`; sin
  `AbortController` porque una petición `navigate` no se puede copiar con opciones: el tope solo deja de esperarla). Falla o tope → respaldo con
  motivo `red`; `status >= 500` → motivo `servidor`; una redirección (status 0, opaca) y un 404 pasan tal cual. El respaldo se sirve en la
  dirección pedida y el motivo va en `<html data-motivo>` (el SW cambia `red` por `servidor` en el texto). Nunca `cache.put` de una navegación:
  la única caché es `sn-respaldo-v1`, precargada en `install` con `cache: "reload"`; `activate` borra las `sn-respaldo-*` viejas y repone la
  página si faltara. Si no está en la caché, un respaldo mínimo escrito en el SW (nunca el blanco). Todo el manejador en `try/catch`; un error
  propio cae a `fetch(event.request)`. Los avisos push no cambian (sus dos pruebas siguen verdes).
- **`src/components/RegistroSW.tsx`**: no registra el SW con `SomosNosotrosApp` en el user agent (`esAppNativa`). Los avisos de la app de la
  tienda van por APNs (`pushCliente.ts` no usa el SW ahí), así que nada se rompe. El registro sigue en el layout, igual para la web.
- **Medición**: `carga_fallida` en la lista cerrada de `src/lib/medir.ts` (`app: pwa|tienda`, `motivo: red|servidor`). `src/lib/cargaFallida.ts`
  lee la marca, la borra siempre y la descarta si está rota, fuera de la lista o tiene más de 7 días. `src/components/MedirCargaFallida.tsx` la
  manda con `medirCliente` en la siguiente carga buena; va dentro de `MarcaAdmin` junto a `MedirInstalacion` (rol ya sabido, nunca para la
  administración; `sinMedirEnPantalla` sin cambios). Aviso de privacidad: «Si la app no pudo cargar, la siguiente vez que se abre anota que pasó y
  si fue la red o el servidor, sin datos tuyos.»
- **`next.config.ts`**: `Cache-Control: no-store` para `/sw.js` y `/sin-conexion.html` (más `noindex` en la segunda). Comprobado con la app
  compilada: `/sw.js 200 no-store`, `/sin-conexion.html 200 no-store, noindex, nofollow`.

## Pruebas

- `src/lib/respaldoSW.test.ts` (9, mismo arnés que `avisosSW.test.ts`): precarga en `sn-respaldo-v1`; red caída → respaldo `red` con
  `no-store`; 503 → `servidor`; 200 y 404 pasan tal cual y nada entra a la caché; `GET /api/…`, `POST`, petición no `navigate`, `/auth/callback`,
  `/auth` y `/_next/` pasan sin tocarse (y `/autores` sí se cubre); otro origen pasa; petición colgada → respaldo a los 12 s y no a los 11,9 (con
  temporizadores falsos); sin la página en caché → respaldo mínimo; `activate` borra la versión vieja. Las dos de `avisosSW.test.ts`, verdes.
- `src/lib/cargaFallida.test.ts` (5): la lista cerrada acepta solo los dos datos fijos; la marca se lee una vez y se borra; rota, vieja o fuera
  de la lista se borra sin medir; sin memoria no lanza.
- `src/lib/respaldoSW.componentes.test.mjs` (Chrome, corre en la CI con `npm run test:componentes`): el `sw.js` y el respaldo reales servidos
  por un servidor chico; sin red → respaldo en `/eventos/noche-de-son` (misma dirección) y la marca `red`/`pwa`; 503 → «El servidor no
  respondió.»; «Intentar de nuevo» con la red de vuelta → la pantalla; y sola al volver la conexión. Un 503 de `/api/` llega tal cual. La red se
  rompe en el servidor y no con `page.route`: las peticiones que hace el SW no pasan por las rutas de la página.
- `npm run lint` (0 errores; los 2 avisos ya estaban), `npm run typecheck`, `npm test` (322 archivos, 5162 pruebas), `npm run build`,
  `npm run inventario` (sin novedades) y `npm run medir` (63 pantallas × 4 anchos, sin novedades) en verde. `medir` e `inventario` no recorren
  la página de respaldo (no es una ruta de Next): sus medidas se tomaron a mano (botón 48 px, sin desplazamiento lateral a 320, 390 y 1280).

## Tiempo con y sin el SW (Chrome de la Mac, app compilada contra el respaldo local, Inicio, 390×844, CPU ×4, 5 corridas en caliente)

| | primer byte | primer pintado | «contenido» (primer enlace a un evento en `main`) |
| --- | --- | --- | --- |
| sin SW (bloqueado) | 8 ms | 108 ms | 62 ms |
| con SW | 7 ms | 128 ms | 89 ms |

Medianas de la última de tres tandas (las otras: 59 → 88 y 61 → 84 ms de «contenido»). `workerStart` sale 0-1 ms: el SW ya estaba despierto. El
SW suma unos 25-30 ms en caliente aquí, dentro del presupuesto del council (100 ms). **No sustituye la medida en el iPhone** (Web Inspector, 5
corridas en caliente y 3 en frío, `workerStart` de `PerformanceNavigationTiming`): Chromium no mide el arranque del SW en iOS. Sin precarga de
navegación (`navigationPreload`) a propósito: con ella, lo que el SW deja pasar (`/auth/callback`) podría pedirse dos veces según el navegador.
Si el iPhone muestra un costo mayor, ese es el siguiente paso, con cuidado en `/auth/`.

## Hallazgo

En Chrome con «sin red» emulado el aviso `online` puede llegar antes de que la red le sirva al SW: la recarga en ese instante volvía a caer en el
respaldo y ahí se quedaba (ya no llega otro `online`). La página espera un segundo antes de recargar sola. En una corrida el aviso no llegó porque
el arnés tenía otra sesión de depuración abierta (artefacto de la prueba, no de la app); sin ella llega y la pantalla vuelve sola.

## Límites (también en la primera línea de `sw.js`)

- **La caída a mitad del streaming no está cubierta.** Inicio llega por trozos (un `<Suspense>` por carril): si la red cae después de las
  cabeceras, el SW ya respondió y la pantalla queda en esqueletos. Tampoco el tope: cuenta hasta las cabeceras, no hasta el final.
- **La app de la tienda no usa este respaldo.** No registra el SW (y su WKWebView no lo corre); su respaldo es la pieza nativa de `apps/ios`.
- **Tocar un aviso push con la red dormida** abre la dirección por el SW (`notificationclick` → `navigate`/`openWindow`), así que debería caer en
  el mismo respaldo. **Por probar en el iPhone.**
- La primera vez tras publicar, el SW nuevo se instala en segundo plano: el respaldo cubre desde la segunda apertura con red.

## Decisiones por confirmar

- **Texto:** «No se pudo cargar» en los dos casos; con el servidor, delante «El servidor no respondió.». Sin red no se dice «sin conexión» porque
  el tope de 12 s también cae ahí y puede haber red.
- **`?motivo=`:** el SW no redirige a `/sin-conexion.html?motivo=…` (perdería la dirección y «Intentar de nuevo» recargaría el respaldo); sirve la
  página en la dirección pedida con `data-motivo`. `?motivo=servidor` solo vale al abrirla a mano (capturas).
- **`pwa`** cuenta también una pestaña normal de Safari o Chrome (el SW se registra en cualquier navegador): la lista solo tiene `pwa|tienda`.
- **Tope de 12 s**, como pidió el gestor. El límite de función de Vercel no se leyó del proyecto (está fuera de esta pieza).
- **Vigencia de la marca: 7 días.** Una más vieja se borra sin medir.

## Capturas (`docs/rediseno/capturas-534/`, Chrome de la Mac, 390×844 salvo donde se dice; cada una abierta y mirada)

- `a-respaldo-red-390.png`: el respaldo sin red: símbolo SN, «No se pudo cargar», «Suele arreglarse al intentar de nuevo.» y el botón violeta de
  48 px a todo lo ancho, al centro de la pantalla.
- `b-respaldo-servidor-390.png`: el mismo con el servidor caído: «El servidor no respondió. Suele arreglarse al intentar de nuevo.» en dos
  renglones.
- `c-respaldo-letra2-390.png`: con la letra ×2 (32 px, `Page.setFontSizes`): el título en dos renglones (52 px), el texto en cuatro y el botón
  crece a 66 px; nada se corta ni se sale.
- `d-respaldo-red-1280.png`: a 1280, la columna de 600 al centro.
- `h-respaldo-servidor-320.png`: a 320×568, con el texto del servidor: cabe sin desplazamiento lateral.
- `e1-inicio-sin-sw-390.png` y `e2-inicio-con-sw-390.png`: Inicio en la app compilada sin y con el SW controlando la página. Son el mismo archivo
  byte a byte: el SW no cambia nada de lo que se ve.
- `f-app-compilada-agenda-sin-red-390.png`: la app compilada con el SW, sin red, al ir a la Agenda: el respaldo, con la dirección `/agenda` y la
  marca `{"motivo":"red","app":"pwa"}`.
- `g-app-compilada-agenda-recuperada-390.png`: la misma pestaña al volver la red, sin tocar nada: la Agenda cargada; la marca ya se leyó y borró
  (`MedirCargaFallida`; fuera de producción no se manda).
- La app de la tienda (user agent con `SomosNosotrosApp`) en la app compilada: 0 registros del SW.

## Qué debe probar el founder en su iPhone (icono instalado desde Safari)

1. Abrir la web instalada con red una vez (instala el SW nuevo) y cerrarla.
2. Modo avión → abrir la web instalada → debe salir «No se pudo cargar» con el botón (captura 390×844).
3. Quitar el modo avión sin tocar nada → vuelve sola a la pantalla en uno o dos segundos; si no, «Intentar de nuevo».
4. Con un aviso push en el teléfono, modo avión y tocarlo → el mismo respaldo (por probar).
5. Si se puede, Web Inspector: `performance.getEntriesByType("navigation")[0].workerStart` y el tiempo a contenido, antes y después.
