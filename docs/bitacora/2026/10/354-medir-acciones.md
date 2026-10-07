# 354 · Medir acciones en Vercel Analytics y Google Analytics

**Pieza:** OL-325 (retoma OL-190, «programa de taggeo», bitácora 224 reservada y nunca escrita). **Rama:** `medir-acciones` (rehecha sobre `origin/main` `e7d115a0`; la rama local vieja de la reserva de OL-190 ya estaba contenida en `main`). **Fecha:** 2026-10-07. **Operador:** Claude Opus 5.5 (agente del gestor IV).
**Estado:** hecho y probado (unitarias, compilación local de producción con un identificador de Google inventado, red del navegador y cookies); sin migraciones. **El texto del aviso de privacidad es una propuesta: la firma el founder.** Falta: el secreto `GA_API_SECRET` en Vercel (el identificador ya está), apagar la «medición mejorada» de GA, y mirar los primeros datos.

## Qué se encargó

El founder (2026-10-07): «Reabre el proyecto de Tags pendiente, luego impleméntalo para que funcione en Vercel y Google Analytics». El proyecto es OL-190 (2026-09-25: «La cuenta vercel es pro. Firmo privacidad, deja fuera acciones de admins, sin analytics plus»), que nunca se entregó. Hoy entra también Google Analytics, que OL-060 (doc 21) había dejado fuera por el aviso de privacidad; lo cambia la decisión del founder, pero **sigue sin rastrear a nadie**: sin cookies, sin identificar personas, sin medir a la administración.

## Qué hay

- **`src/lib/medir.ts`, la lista cerrada.** Cada evento con sus datos y cada dato con sus opciones fijas, máximo 2, nombres snake_case de 40 o menos (valen igual en Vercel y en GA4). `validarMedicion` rechaza todo lo demás (nombre fuera de la lista, dato de más o de menos, opción que no existe, texto libre); nunca lanza.

  | Evento | Datos |
  | --- | --- |
  | `entrar` | `paso`: pedido / listo / fallo · `metodo`: correo / apple / google |
  | `evento_creado` | `cartel`: si / no · `clase`: puntual / exposicion / taller / festival (`eventos.clase` llegó a `main` con OL-321 mientras se hacía esta pieza; se lee del campo `clase` del alta y, si falta, «puntual», como el servidor) |
  | `cartel_leido` | `resultado`: ok / fallo |
  | `lugar_creado` | `desde`: alta / evento |
  | `artista_creado` | `soy`: si / no |
  | `asistencia` | `estado`: voy / me_interesa · `cambio`: puesto / quitado |
  | `seguir` | `que`: lugar / artista · `cambio`: puesto / quitado |
  | `busqueda` | `resultados`: si / no (nunca lo escrito) |
  | `compartir` | `que`: evento / lugar / artista · `medio`: hoja / whatsapp / copiado |
  | `aviso_activado` | `canal`: correo / telefono |
  | `reporte` | `que`: lugar / evento / perfil / artista |
  | `app_instalada` | — |
  | `error_pantalla` | — |

- **`medirCliente`** (en `medir.ts`): manda a Vercel (`track` de `@vercel/analytics`) y, si Google está preparado, a GA **solo por el servidor** (`POST /api/medir`, ver la segunda y la tercera vuelta) con el mismo nombre y los mismos datos. Solo con `NEXT_PUBLIC_VERCEL_ENV=production`; en vista previa y local no manda nada y, con `NEXT_PUBLIC_MEDIR_DEPURAR=1`, lo escribe en la consola (`[medir] evento_creado { cartel: 'si', clase: 'puntual' } (fuera de producción: no se manda)`). No manda nada si en la pantalla está la marca de admin. Nunca lanza ni espera.
- **`medirServidor`** (`src/lib/medirServidor.ts`, aparte porque el navegador no puede cargar `next/headers`): solo a Vercel (`@vercel/analytics/server`), solo con `VERCEL_ENV=production`, después de la respuesta (`after`), con una comprobación opcional de admin. A `track` se le pasan **solo** el navegador y la IP: por su cuenta mandaría también las cookies de la petición, que llevan la sesión.
- **La administración fuera** (ver también la cuarta vuelta), en los dos lados: en el servidor, `esAdminDeSesion` (el perfil); en el teléfono, `MarcaAdmin` (componente de servidor en el layout, dentro de `Suspense`, con la misma lectura de sesión que la barra, `usuarioDeLaBarra`): solo para un admin pinta `<i hidden data-medir-admin>`, que `medirCliente` y GA buscan antes de mandar. No dice quién es. Al entrar con el código la marca aún no llegó: `FormularioEntrar` pregunta el rol (`mi_perfil`) sin esperar y solo mide si no es admin.
- **Google Analytics 4** (`src/components/AnalyticsGoogle.tsx` y `src/lib/analyticsGoogle.ts`): solo con `NEXT_PUBLIC_GA_ID` (formato `G-…`, cualquier otra cosa no se carga) y `VERCEL_ENV=production`, leídos en el layout del servidor. Solo `gtag.js` (sin Tag Manager), con `next/script` `afterInteractive`. Al terminar de cargar la página (y no para un admin) se prepara la cola en este orden: `consent default` todo denegado (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization` y los tres de almacenamiento restantes), `ads_data_redaction`, la ubicación limpia, `js` y `config` con `send_page_view: false`, `allow_google_signals: false`, `allow_ad_personalization_signals: false`. Nunca se concede después; no hay banner. `anonymize_ip` no hace falta: GA4 no guarda la IP. Las vistas van a mano al cambiar de ruta (`vistaGoogle`) con la limpieza de Vercel (`limpiarUrlAnalitica`), sin el id de `/personas/<id>`; las rutas privadas (la limpieza da null) no mandan vista. El título de la pestaña no va (lleva nombres de fichas y personas): va la ruta. Sin referente.
- **`AnalyticsVercel`**: las acciones (`type: "event"`) pasan por la misma limpieza; en una ruta privada (Entrar, Perfil…) llevan solo su primer tramo (`/entrar`) en vez de no mandarse (`limpiarUrlEvento`). Las vistas de Vercel siguen igual que en OL-111.
- **`MedirInstalacion`**: escucha el aviso que el guion del layout ya recogía (`appinstalled`) y mide `app_instalada` una vez.
- **Aviso de privacidad** (`src/app/privacidad/page.tsx`), **propuesta para la firma del founder**: «Con quién se comparten» separa la medición en un párrafo propio: «Para saber cómo se usa la app medimos con Vercel Analytics y Google Analytics qué páginas se ven y acciones sin nombre, como que se publicó un evento o que alguien dijo «Voy». Sin cookies de medición y sin identificar a nadie: no se manda tu nombre, tu correo, lo que escribes al buscar ni tu ubicación. A la administración no se le mide.» «Cookies» termina en «Ninguna cookie de medición, de rastreo ni de publicidad.» (antes «Sin rastreo ni publicidad.»). Fecha: 7 de octubre de 2026.
- **`.env.example`**: `NEXT_PUBLIC_GA_ID` (vacío; el real solo en Vercel) y `NEXT_PUBLIC_MEDIR_DEPURAR`.

## Segunda vuelta: las acciones a Google también desde el servidor (Measurement Protocol)

Decisión del gestor con el founder (camino 1, 2026-10-07), por el riesgo de la decisión 4: con el consentimiento denegado, Google toma los envíos del navegador como datos para su modelado y, con el tráfico de hoy, los informes pueden salir vacíos; desde el servidor llegan completos.

- **`src/lib/medirGoogleServidor.ts`**: `enviarAGoogle(nombre, datos)` manda a `https://www.google-analytics.com/mp/collect?measurement_id=<NEXT_PUBLIC_GA_ID>&api_secret=<GA_API_SECRET>` el cuerpo `{ client_id, non_personalized_ads: true, events: [{ name, params }] }` con los mismos nombres y datos de la lista cerrada. `client_id` aleatorio **en cada envío** (dos números de `crypto.getRandomValues`; nunca se repite ni se guarda), sin `user_id`, sin cookies, y la petición sale del servidor (Google no ve la IP ni el navegador de la persona). Solo con `VERCEL_ENV=production`, un `NEXT_PUBLIC_GA_ID` válido y `GA_API_SECRET`; sin el secreto no manda nada y no se rompe nada. Espera como mucho 1,5 s (`AbortSignal.timeout`); nunca lanza.
- **`POST /api/medir`** (`src/app/api/medir/route.ts`): el relevo de `medirCliente`. Vuelve a comprobar contra la lista cerrada (lo demás, 400), solo acepta peticiones del propio sitio (`Sec-Fetch-Site`; otra página, 403), cuerpos de 512 bytes como mucho (413), responde 204 al momento y manda a Google con `after()`. No lee la sesión ni guarda nada.
- **`medirCliente`**: cuando Google está preparado (hay `gtag`, que solo existe con `NEXT_PUBLIC_GA_ID`, en producción y fuera de la administración), hace `fetch('/api/medir', { keepalive: true })` sin esperar. Sin Google preparado no llama al servidor. (En esta segunda vuelta también mandaba `gtag('event')`; la tercera lo quitó.)
- **`medirServidor`**: después de la respuesta manda a Vercel y a Google (Measurement Protocol) a la vez, cada uno por su lado: si uno falla, el otro sale igual. Así `entrar` listo / fallo con Apple o Google también llega a Google.
- **`page_view`** sigue solo por `gtag` (consentimiento denegado), como pidió el gestor.

**Tercera vuelta (decisión del gestor: sin doble conteo).** Las acciones van a Google **solo por el servidor** (`/api/medir` → Measurement Protocol); `medirCliente` ya no llama a `gtag('event', …)`. En el navegador, `gtag` queda únicamente para `page_view`, con el consentimiento denegado. Vercel sigue igual (navegador y servidor). Así cada acción llega a Google una sola vez. Comprobado de nuevo en la compilación local (captura `03-red-busqueda-390.png`): al buscar, el navegador manda a Google solo `page_view`; la búsqueda sale como `POST /api/medir` y, de ahí, el servidor la manda a `mp/collect` (204); seis segundos después, ningún `g/collect` más.
- **Variable nueva `GA_API_SECRET`** (secreto: solo en Vercel, Production; documentada en `.env.example`). La pone el gestor cuando exista.

Comprobado: en una compilación local de producción (identificador y secreto inventados, `fetch` del servidor espiado con un `--require` del scratchpad que tapa el secreto), `POST /api/medir` con `evento_creado` respondió 204 en 21 ms y después salió `mp/collect` con `{"client_id":"2024661567.2448337061","non_personalized_ads":true,"events":[{"name":"evento_creado","params":{"cartel":"si"}}]}` (Google: 204, 169 ms); un dato de más, 400; desde otra página, 403. Al buscar en `/buscar` desde el navegador salió `busqueda` con `resultados: no` y otro `client_id`. El cuerpo pasa el validador de Google (`/debug/mp/collect`: `validationMessages` vacío) y, como control, un nombre con guion da `NAME_INVALID`.

## Cuarta vuelta: hallazgos de la revisión de seguridad (OL-327, Codex)

- **F03 (P2) · posición y texto en la URL.** `limpiarUrlAnalitica` era una lista negra y dejaba pasar `lat` y `lng` (el punto elegido en el mapa) en `/nuevo/lugar?nombre=…&lat=22.151123&lng=-100.977456`, y con ellos llegaban a las vistas de Vercel y al contexto de Google. Ahora es **lista blanca**: de la consulta solo se quedan `tipo`, `que`, `filtro`, `cuanto`, `hace` y `disciplina` (filtros de opciones fijas); todo lo demás se quita, también lo que se añada mañana. `ciudad` sigue fuera, como en OL-111 (el gestor la citaba como inocua; la dejé fuera porque dice dónde está la persona). Pruebas con esa URL exacta (sale `/nuevo/lugar` sola), con `lugar`, `artista` y `desde` del alta de evento, con `q`, con las fechas de la agenda y con un parámetro desconocido (`utm_source`). Dos pruebas viejas cambian con razón: `estado=activo` (un parámetro que no existe en la app) ya no pasa, y la de Google usaba `cuando=hoy` (tampoco existe): ahora `filtro=hoy`.
- **F10 (P3) · la administración en las vistas de Vercel, y la primera vista antes de saber quién mira.** Las vistas de OL-111 contaban a los admins aunque el aviso nuevo dice que no se les mide; y, como `MarcaAdmin` resuelve la sesión dentro de `Suspense`, la primera vista podía salir antes de saber el rol. Ahora:
  - `MarcaAdmin` pinta siempre, al resolver, `<i hidden data-medir-rol="admin">` o `"otro"`, y **monta la analítica (`AnalyticsVercel`, `AnalyticsGoogle`, `MedirInstalacion`) como hijos solo si no es admin**. En el layout la analítica va dentro de `MarcaAdmin`: no existe hasta que el rol se sabe, así que la primera vista sale con el rol resuelto; para un admin no se monta nunca.
  - `sinMedirEnPantalla()` (antes `esAdminEnPantalla`): no se mide mientras no haya marca (rol desconocido) ni con «admin». La usan `medirCliente`, `vistaGoogle`, `AnalyticsGoogle` y el `beforeSend` de Vercel (`antesDeEnviarAVercel`, que devuelve null en esos casos). Si alguien entra como admin sin recargar, la pantalla se relee, la analítica se desmonta y el `beforeSend` corta lo que quedara.
  - Pruebas: `src/components/MarcaAdmin.test.ts` pinta en streaming el trozo del layout (`Suspense` → `MarcaAdmin` → Vercel y Google) con una sesión que responde tarde: con admin, nada de analítica ni antes ni después; con «usuario» o sin sesión, la analítica aparece solo tras la marca. Control negativo: montando los hijos también para admin, la prueba falla. `src/components/AnalyticsVercel.test.ts`: el `beforeSend` que recibe Vercel devuelve null con admin y sin rol, y limpia con «otro» (control negativo: sin la comprobación, falla).
- **F12 (P3) · el tope del cuerpo de `/api/medir` se miraba después de leerlo entero.** Ahora `leerCuerpoAcotado` (`src/lib/cuerpoAcotado.ts`): si `Content-Length` dice más de 512 (o no es un número), 413 sin tocar el cuerpo; si no viene (chunked), lee con un lector que corta y cancela en cuanto pasa de 512. Pruebas: un megabyte en trozos sin `Content-Length` se corta tras leer muy pocos trozos y el flujo queda cancelado; uno que declara 1 MB ni se lee (`bodyUsed` sigue en falso); justo 512, se acepta.
- Comprobado en la compilación local: el HTML de `/buscar` lleva `data-medir-rol="otro"` (sin sesión) y la búsqueda sigue saliendo igual (captura `03-red-busqueda-390.png` rehecha: `page_view` por `gtag`, `busqueda` por `/api/medir` y el servidor, ninguna cookie).

## Dónde se mide (sin cambiar lo que hace cada pantalla)

| Acción | Dónde | Notas |
| --- | --- | --- |
| Entrar con correo | `FormularioEntrar`: código pedido, código o envío fallido, código bueno | listo: solo si no es admin |
| Entrar con Apple o Google | pedido: al tocar el botón (`FormularioEntrar`); listo y fallo: `/auth/[proveedor]/fin` con `medirServidor` | listo y fallo solo llegan a Vercel; cancelar no cuenta |
| Publicar evento | `AltaEvento` al volver bien `crearEvento` | `cartel` según el campo `imagen`; `clase` según el campo `clase` |
| Leer el cartel | `useLeerCartel`: leído, no pudo, se cortó leyendo | sin cupo no se mide |
| Lugar creado | `AltaLugar`; «Guardarlo como lugar» del alta de evento (`useSitioPorPasos`, adonde lo llevó `main`); `HojaDonde` | uno que ya existía (`reutilizado`) no cuenta |
| Artista creado | `AltaArtista` | `soy` según la casilla |
| Voy / Me interesa | `Asistencia` (ficha) y `useAsistenciaEnLista` (listas) | solo si se guardó |
| Seguir | `Seguir` (ficha) y `useSeguirEnLista` | solo si se guardó |
| Búsqueda | `BuscarPantalla`, al llegar la respuesta | cada búsqueda tras la pausa de escritura |
| Compartir | `BotonCompartir` (hoja si se completó, WhatsApp sin hoja) y «Copiar» de `CompartirFicha` | la ficha sale de la dirección; la app y las personas no se miden |
| Avisos | `ConsentimientoAvisos`, `AvisosPerfil`, `ActivarAvisos` | solo al encender y guardar |
| Reporte | `Reportar` | |
| App instalada | `MedirInstalacion` | Chrome, Edge y Android |
| Pantalla con error | `app/error.tsx` | |

Fuera, sin forzar: el enlace mágico del correo (`/auth/callback`; ver decisión 3), novedades, letrero y lo demás de la segunda entrega de OL-190 que no está a mano.

## Cómo se comprobó que no hay cookies

Compilación local de producción en el árbol, sin `.env` (`NEXT_PUBLIC_VERCEL_ENV=production VERCEL_ENV=production NEXT_PUBLIC_GA_ID=G-PRUEBA1234 next build && next start -p 3154`; el identificador es inventado y Google sirve `gtag.js` igual). En el navegador integrado y en Chrome con Playwright (contexto limpio), `/buscar` y escribir «teatro rosa»:

- `window.dataLayer` empieza por `consent default` con todo en `denied`; `config` va después.
- Primera vuelta: dos envíos a `www.google-analytics.com/g/collect`, `en=page_view` y `en=busqueda` con `ep.resultados=no`, los dos con `gcs=G100` (análisis y anuncios denegados) y `npa=1`, `dl=http://localhost:3154/buscar` (sin `?q=`), `dt=/buscar`, `dr` vacío; «teatro» y «rosa» en ningún envío. Desde la tercera vuelta el navegador solo manda `page_view` a Google y la búsqueda va por `/api/medir` y el servidor.
- Cookies del sitio al terminar (`context.cookies()` de Playwright, que ve también las `httpOnly`): **ninguna**. `localStorage` vacío; `sessionStorage` solo con la memoria de pantalla de siempre. Ni `_ga`, ni `_gid`, ni `_gcl_*`.
- Con la marca de admin puesta a mano en la página, otra búsqueda no añadió nada a `dataLayer` ni a la red.
- GA pone un `cid` en cada envío: con el consentimiento denegado es temporal (no se guarda en ningún lado) y cambia en cada carga.

## Cómo verá el founder los eventos

- **Vercel:** proyecto → Analytics → **Events**: cada evento con sus datos (por ejemplo `asistencia` partido por `estado` y `cambio`). Los eventos propios son de Pro (lo es); sin «Analytics Plus».
- **Google Analytics:** Informes → **Tiempo real** (para ver que llegan) y Informes → Interacción → **Eventos**. Para que cada dato (`resultados`, `metodo`, `cartel`…) se vea en los informes hay que registrarlo una vez en Administrar → Definiciones personalizadas → Crear dimensión personalizada (ámbito «Evento», mismo nombre). Si quiere, Administrar → Eventos → marcar `evento_creado` como **evento clave**.
- Nada nuevo en el panel de la app.

## Pasos que quedan (gestor y founder)

1. El founder crea (o elige) la propiedad de GA4 y su flujo web para `somosnosotros.org` y da el identificador `G-…`.
2. **En ese flujo, apagar la «Medición mejorada»** (Administrar → Flujos de datos → el flujo → Medición mejorada). Encendida, GA manda por su cuenta vistas al cambiar el historial y búsquedas del sitio leyendo la dirección completa (con `?q=`): saltaría la limpieza.
3. El gestor pone `NEXT_PUBLIC_GA_ID` en Vercel (Production) y **despliega de nuevo**: la variable se lee en el layout y se fija al compilar. (Ya está, según el gestor.) Y, cuando exista, `GA_API_SECRET` (secreto: GA → Administrar → Flujos de datos → el flujo web → Secretos de la API del Measurement Protocol → Crear); se lee en cada envío, no hace falta compilar de nuevo para él.
4. Firma del aviso de privacidad y del texto de «Cookies».

## Decisiones del operador (por confirmar)

1. **Casi todo se mide en el teléfono, no en las acciones del servidor.** Cada acción se mide donde la pantalla recibe el «se guardó», y `medirServidor` queda para la vuelta de Apple o Google, que no pasa por ninguna pantalla. (Segunda y tercera vuelta: lo del teléfono llega a Google solo por el servidor, `/api/medir`, y `medirServidor` también manda a Google: `entrar` con Apple o Google ya llega a los dos.)
2. **`medirServidor` vive en su propio archivo** (`src/lib/medirServidor.ts`), no en `medir.ts`: el encargo pedía las dos funciones en el mismo, pero el navegador no puede cargar `next/headers`. La lista cerrada es una sola.
3. **El enlace mágico del correo no se mide.** Vercel anota la dirección de la petición junto al evento y la de `/auth/callback` lleva el código (`?code=`) y `?siguiente=`. El código de 8 cifras (lo normal) sí se mide.
4. **Riesgo de Google: puede que GA muestre poco o nada** (atendido en la segunda vuelta: el gestor y el founder eligieron la alternativa (b), el Measurement Protocol). Con el consentimiento denegado, GA4 recibe los envíos sin cookies pero, según su documentación, los usa para el modelado de comportamiento, que pide al menos mil eventos al día; con el tráfico de hoy es probable que los informes normales de GA se queden casi vacíos (Tiempo real puede o no enseñarlos). Vercel sí cuenta todo. Alternativas, para que decida el founder si pasa: (a) dejarlo así; (b) mandar a GA desde el servidor con el Measurement Protocol (sin cookies ni `gtag.js`, con un secreto en Vercel); (c) conceder `analytics_storage`, que pone cookies `_ga` y **rompe** lo que dice el aviso. Recomiendo mirar Tiempo real el día que se ponga el identificador.
5. **`compartir` tiene un medio más:** `whatsapp`, porque sin hoja del teléfono (escritorio) `BotonCompartir` abre WhatsApp directo.
6. **La ruta de una persona pierde su id** (`/personas/<id>` → `/personas`) en GA y en los eventos; las vistas de Vercel siguen como las dejó OL-111. Propongo igualarlas en otra pieza.
7. ~~Las vistas de Vercel de la administración se siguen contando~~ (corregido en la cuarta vuelta, F10: ya no se cuentan).
8. **Las vistas de GA cuentan cambios de ruta, no de filtro** (como «filtrar no es navegar»); Vercel cuenta también los cambios de consulta.
9. **«Pedido» con Apple o Google se mide al tocar**, justo antes de salir del sitio: el navegador puede cortar algún envío.
10. **`busqueda` cuenta cada búsqueda que llega**, no una por visita: quien escribe en dos tandas cuenta dos.
11. **El aviso dice que si cambia cómo se usan los datos «te lo diremos por correo».** Sumar a Google puede caer ahí: decide el founder si se avisa por correo.
12. **«Entras sin contraseña y sin rastreo ni publicidad»** (Entrar) no lo toqué: sigue siendo cierto (no se rastrea a personas), pero el founder puede preferir otra frase ahora que hay medición.
13. **Sin doble conteo** (decisión del gestor, tercera vuelta): las acciones van a Google solo por el servidor; `gtag` en el navegador solo manda `page_view`.
14. **`/api/medir` no comprueba en el servidor si quien manda es admin** (lo hace el teléfono con la marca): leer la sesión sería una consulta a Supabase por cada acción. Cualquiera desde el propio sitio podría mandar eventos de la lista a mano; solo inflarían cuentas, sin datos de nadie.
15. **Los envíos del servidor no llevan sesión de GA** (`session_id`) ni la página: GA los cuenta como eventos sueltos (sirven para «cuántas veces»), sin recorridos ni páginas.

## Pruebas

- **Fallo de la CI en «interfaz» (commit `21270e31`) y su causa.** Cayeron 16 pruebas de `src/app/entrar/Entrar.componentes.test.mjs`, todas «… con el código por correo: Atrás …» (Voy, Me interesa, Seguir lugar y artista, el «+», Novedades, Perfil): la persona nunca llegaba al destino tras escribir el código. Causa: `medirEntradaLista` (en `FormularioEntrar`) llamaba a `medicionActivaEnCliente()` fuera de cualquier `try`, y esa función leía `process.env.NEXT_PUBLIC_VERCEL_ENV`. Next sustituye la variable al compilar, pero la prueba arma la pantalla con esbuild y en el navegador no existe `process`: la lectura lanzaba `ReferenceError` y `entrarConCodigo` se cortaba antes de `terminar()`. Rompía la regla «medir nunca rompe la acción». Arreglo en la fuente, sin tocar las pruebas (estaban bien): `medicionActivaEnCliente` atrapa el error y devuelve `false`, y `medirEntradaLista` va entera dentro de un `try`. Reproducido en local antes (2 de 2 fallan) y después: `Entrar.componentes.test.mjs` 49/49 y `npm run test:componentes` 508/508. Prueba nueva en `medir.test.ts`: con un `process.env` que lanza, `medicionActivaEnCliente` da `false` y `medirCliente` no lanza ni manda nada. El recorrido con Apple o Google no fallaba porque no pasa por `medirEntradaLista`.
- Segunda vuelta: `src/lib/medirGoogleServidor.test.ts` (6: el cuerpo exacto y sin `user_id`; la dirección con identificador y secreto, `POST` y tiempo de espera; el `client_id` cambia en cada envío y 200 seguidos no se repiten; nada fuera de producción, sin secreto o con identificador raro; un fallo de red, un tiempo agotado o un 500 no lanzan), `src/app/api/medir/route.test.ts` (4: 204 y a Google después; lo de fuera de la lista, 400 y nada; otra página, 403; cuerpo enorme, 413) y, ampliadas, `medir.test.ts` (va a `/api/medir` con `keepalive`, solo nombre y datos; nada fuera de producción, para admin o sin Google; un `fetch` que falla o no existe no lanza) y `medirServidor.test.ts` (6: también a Google; si Vercel falla, Google sale igual; nada para admin).
- Nuevas: `src/lib/medir.test.ts` (19: la lista cerrada y sus rechazos —nombre fuera, opción fuera, de más, de menos, más de 2, no objeto—, producción / vista previa / depurar, admin, nunca lanza aunque `track` y `gtag` fallen, sin `q` ni texto en lo que va a Google, limpieza de las acciones y de las vistas de GA), `src/lib/analyticsGoogle.test.ts` (10: `AnalyticsGoogle` no se monta sin identificador, fuera de producción ni con un identificador raro; carga `gtag.js` sin Tag Manager; la cola con el consentimiento denegado antes de `config` y nunca `update`; vistas limpias, nada en rutas privadas ni para admin; nunca lanza), `src/lib/medirServidor.test.ts` (5: después de la respuesta, sin cookies ni referente, nada fuera de producción ni para admin, nada fuera de la lista, nunca lanza).
- `npm run lint` (0 errores; el aviso de `VisorImagen.componentes.test.mjs` ya estaba), `npm run typecheck`, `npm test` (3074 pruebas con la cuarta vuelta, tras unir `main` `f86f49da`), `npm run test:componentes` (508/508), `npm run inventario` (sin novedades) y `npm run medir` (35 pantallas × 4 anchos, sin novedades; una primera corrida tras reinstalar `node_modules` no pudo arrancar `next start` y la segunda pasó) en verde.

## Capturas (`docs/rediseno/capturas-354/`)

- `01-privacidad-medicion-390.png` y `01-privacidad-medicion-320.png`: «Con quién se comparten» con el párrafo nuevo de la medición (Vercel Analytics y Google Analytics, acciones sin nombre, sin cookies de medición ni identificación, sin medir a la administración) y el de Apple y Google debajo; se lee entero a los dos anchos, sin cortes.
- `02-privacidad-cookies-390.png` y `02-privacidad-cookies-320.png`: «Tus derechos», «Cookies» con «Ninguna cookie de medición, de rastreo ni de publicidad.» y «Cambios».
- `03-red-busqueda-390.png` (tercera vuelta): tabla de lo que pasó al buscar «teatro rosa» en la compilación local (identificador y secreto inventados). Del navegador: un solo `POST` a `google-analytics.com/g/collect` (gtag), `page_view` con `gcs = G100`, `npa = 1`, `dl = …/buscar` sin la búsqueda, `dt = /buscar`, `dr` vacío; y `POST /api/medir` con `{"nombre":"busqueda","datos":{"resultados":"no"}}`. Del servidor a Google: `mp/collect` con `client_id` tapado, `non_personalized_ads: true` y el evento `busqueda` → 204. Cookies del sitio, «ninguna»; `localStorage` vacío. Identificadores tapados.
