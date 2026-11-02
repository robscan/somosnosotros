# 533 · OL-500 · Entrega al Gestor de cambios VIII: pantalla en blanco en la app del App Store, council sobre la recarga y plan en tramos

**Fecha:** 2026-11-02. **Rama:** `council-recarga-app-instalada` (desde `origin/main` `252aaa8`, el PR 622), solo documentos.
**Quién:** chat de la tarde con el founder (Fable 5.1, sesión en la nube `session_01EjKVbpAnzCDvyS7PDoLnos`, sin acceso a producción, a Vercel ni a
la laptop; la red del contenedor bloquea todo salvo registros de paquetes). **Sin código, sin migraciones, sin variables.**
**Estado:** entrega. El founder pidió «entrega a gestor de cambios VIII». El push lo hará él desde la laptop.

> Palabras que se repiten (cada una en una línea):
> - **App del App Store**: la app de iPhone que Apple aprobó el 29 de octubre (OL-474). Es un envoltorio (Capacitor, `apps/ios`) que carga
>   somosnosotros.org dentro de una vista web; no es la web instalada desde Safari.
> - **Web instalada**: el icono que se añade al inicio del teléfono desde Safari (PWA, `display: standalone`).
> - **Service worker**: el pequeño programa que el navegador guarda para la web (`public/sw.js`); hoy solo recibe avisos push. En la app del
>   App Store no corre.
> - **Council**: cinco revisiones independientes, revisión cruzada a ciegas y un acta con veredicto (skill `council`). Recomienda; el founder decide.

## 1. Lo que dijo el founder hoy (textual)

- Sobre la sesión: «Yo tengo un plan mac 20x contratado y me preguntaba si podemos seguir avanzando aquí sin la laptop prendida». Sí: la sesión corre
  en la nube de Anthropic con su plan; la laptop puede estar apagada. Lo que esta sesión **no** puede hacer: leer sitios externos (la red del
  entorno los bloquea), tocar producción (sin llaves) ni hacer push (el permiso lo bloqueó).
- Sobre las agendas: pidió «comienza a buscar las agendas culturales de San Luis para subir los eventos». No se pudo desde aquí (red bloqueada:
  cultura.slp.gob.mx, su CloudFront, Plano Informativo, El Sol de San Luis). Decidió: «voy a hacerlo desde admin para probar» (Administración ›
  Ciudades › San Luis Potosí › «Buscar agendas y eventos», con el crédito de la API, que vence el **11 de noviembre**).
- El incidente: «al abrir la app noto que se queda la pantalla en blanco. Como un error en servicios. No me presenta ninguna opción de recarga ni
  nada. Tuve que volver a abrir la app (iOS) para que recargara».
- Aprobó el respaldo ante cargas fallidas («Si me gusta») y pidió, antes de empezar, analizar «un comportamiento de recarga con pull para abajo
  como es estándar en redes sociales y que al haber cargado antes la app y regresar no se pude recargar, que primero se muestre versión cargada y
  se recargue hasta que usuario hace pull para recargar nuevo contenido si es que existe. Vale la pena mencionar que nuestro contenido no es tan
  dinámico aunque si se pueden dar cambios o crear nuevos eventos según vayamos creciendo y los usuarios sean más activos. […] Investiga cómo
  resuelven otras apps y cuestiona fuertemente mis propuestas. Identifica áreas de oportunidad y propon ajustes. Luego elabora un plan de acción».
- Respuesta a la pregunta del council: «El blanco fue sobre la app de AppStore estaba conectado con datos celulares. Pudo ser un fallo en mi
  conexión. Esperaré a llegar a la laptop para el push.»

## 2. Qué se hizo

1. **Diagnóstico del blanco** (sin registros de Vercel): `error.tsx` y `global-error.tsx` están bien (Next 16.4.3 sí pasa `retry`, comprobado en
   el paquete) pero solo pintan si el servidor respondió; el service worker no tiene manejador `fetch` ni página de «sin conexión» («Sin caché: la
   app es web», `public/sw.js:1`); una carga sin respuesta en una app sin barra se queda blanca. Distinto de OL-455 (blanco momentáneo, ya atendido).
2. **Council** (acta: `docs/council/COUNCIL_recarga-app-instalada_2026-11-02.md`, brief al lado). Cinco sillas: Contrario, Empirista, Plataformista,
   Guardián del Usuario, Ejecutor. Las cinco: CONDICIONADO. Ranking del peer review: Contrario 1,4 · Guardián 1,6 · Plataformista 3,0 ·
   Ejecutor 4,2 · Empirista 4,8.
3. **Investigación fuera** (búsqueda web; fuentes de terceros): el patrón en PWA de iOS para el blanco es un respaldo de navegación en el service
   worker con tope de tiempo; en `standalone` no hay pull nativo y `overscroll-behavior` no es fiable en iOS (WebKit 275947 abierto); los feeds
   traen lo nuevo en segundo plano y ofrecen una píldora, nunca insertan mientras se lee; las quejas documentadas son por la recarga automática
   que salta arriba.

## 3. Veredicto del council: VOBO_CONDICIONADO

- **Solo el respaldo ante cargas fallidas toca el incidente.** En una pantalla en blanco no corre JavaScript: ningún gesto se oye.
- **Hay dos apps y CLAUDE.md solo cuenta una.** `CLAUDE.md:13` y `docs/DEFINICION.md:17` dicen «sin app de tienda»; OL-474 y OL-481 registran la
  app aprobada y al founder probando desde ella. En la app del App Store el service worker no corre (WKWebView sin `WKAppBoundDomains`;
  `server.errorPath` apagado a propósito por el flujo de Apple/Google; la única salida nativa «Sin conexión» sale solo cuando `NWPathMonitor`
  dice que no hay ruta, así que una radio que «aún no engancha», un 5xx o un tiempo agotado dejan blanco). **El founder confirmó: fue en la app del
  App Store, con datos celulares.** La pieza que atiende su caso es nativa (`apps/ios`); la web va igual porque la misma falla le pasa a quien
  instaló desde Safari, y porque lo nativo pasa por TestFlight y revisión de Apple.
- **«Primero lo cargado, luego lo nuevo» ya es la conducta actual.** Nada recarga el contenido al volver al frente (`Navegacion.tsx`, `useAlDia`,
  `useUbicacionFresca` son locales). Las recargas que ocurren las hace iOS (descarta la página por memoria) o Next (versión nueva). Evitarlas
  obligaría a guardar HTML con sesión y «Tus planes»: contenido personal servido viejo. Lo que molesta es `location.reload()`, que nadie propone;
  `router.refresh()` conserva scroll y estado. Se anota como **decisión**, no como pieza.
- **«Recargar solo con pull y solo si hay novedades» deja ver pantallas caducadas** (la tolerancia ya fijada es un minuto, `staleTimes.dynamic: 60`)
  y exige una consulta «¿cambió algo?» que no existe. La intuición «no es tan dinámico» es correcta y lleva a lo contrario del pull: un refresco
  silencioso poco frecuente.
- **El pull como gesto no entra ahora**: compite con cinco gestos de arrastre de Inicio (las historias se cierran arrastrando hacia abajo, hojas,
  mando de obra, teclado, `MemoriaScroll`), exige `touchmove { passive: false }` en la raíz y no pasa la regla de simplicidad. Lo que aporta (una
  salida visible sin cerrar la app) lo da un botón sobre `router.refresh()`.
- **El respaldo con solo `fetch().catch()` no cubre los casos probables**: petición colgada o 504 de Vercel. Hace falta tope de tiempo propio menor
  que el límite de función del plan, y `status >= 500` en navegaciones cuenta como fallo («el servidor no respondió»).
- **Medición**: `medirCliente` excluye al rol admin (`src/lib/medir.ts:231`): nada medido desde el iPhone del founder llega; los registros del plan
  gratuito de Vercel duran una hora; el PR 622 se unió el 1 de noviembre (recarga completa forzada si la app estaba abierta; en frío producción
  tarda 3 s en pintar, bitácora 487): hipótesis alternativa no descartada.
- Disensos registrados en el acta: 5xx dejar pasar o tratar como fallo (gana tratar como fallo); umbral N del refresco (5 min vs 20 min vs «con
  datos»: no se fija sin el conteo); píldora «Hay novedades» (solo si el refresco hace parpadear los carriles); `WKAppBoundDomains` descartado por
  escrito (limita a 10 dominios; `allowNavigation` ya lista 12).

## 4. Plan en tramos (para el Gestor VIII)

**Tramo 0 · Sin código.**
1. ✅ Hecho hoy: la pregunta al founder (app del App Store, datos celulares, «pudo ser un fallo en mi conexión»).
2. Pedirle dos pruebas de dos minutos en cada app (web instalada y App Store): modo avión → abrir desde cero → ¿qué se ve?; app abierta → modo
   avión → fondo un minuto → volver → ¿qué se ve? Captura de cada una, nombrando el icono.
3. Activar Speed Insights en Vercel (OL-499, cero código). Leer el límite de función de `/` en el plan (acota el tope del service worker).
4. Confirmar si la llave de Supabase ya es asimétrica (M1 del council del 31 de octubre); si no, rotarla primero (sin código).
5. Corregir `CLAUDE.md:13` y `docs/DEFINICION.md:17`: ya hay app en el App Store desde el 29 de octubre (OL-474); seguirán alimentando briefs y
   encargos equivocados mientras digan «sin app de tienda».
6. Mirar en el iPhone Ajustes › Privacidad › Análisis (JetsamEvent / WebContent alrededor de la hora) y los registros de Supabase de esa ventana.

**Tramo 1 · El respaldo, primero donde ocurrió.**
7. **Nativa (`apps/ios`, su rama):** leer antes el `WebViewDelegationHandler.swift` de la versión de Capacitor fijada en `apps/ios/package-lock.json`
   (Capacitor 8 ya recarga al morir el proceso web; lo que falta es la navegación fallida). Manejar `didFailProvisionalNavigation` para el dominio
   propio excluyendo las cancelaciones de `EntrarSistemaPlugin` (`/auth/apple`, `/auth/google`); mostrar «No se pudo cargar · Reintentar» con el
   estilo de la app, cuyo botón cargue `appStartServerURL` (hoy `www/index.html:72` hace `location.reload()` sobre el archivo local); recuperación
   sola al volver la red (`NWPathMonitor` ya existe); en `sceneWillEnterForeground` comprobar que el WKWebView tiene documento. Prueba: Debug ›
   Simulate Memory Warning, matar WebContent, 504 simulado con red encendida. Pasa por build, TestFlight y revisión de Apple: entregar con la
   siguiente subida que de todos modos toque. `WKAppBoundDomains` descartado.
8. **Web (`public/sw.js` + `public/sin-conexion.html`):** manejador `fetch` solo para `GET` con `mode: 'navigate'` del mismo origen, fuera de `/api/`
   y `/auth/` (en `/auth/*` el respaldo lleva a `/entrar`); `event.request` tal cual (lleva las galletas); tope de tiempo menor que el límite leído
   en (3); `status >= 500` cuenta como fallo con texto distinto; nunca `cache.put` de navegaciones; respaldo estático con CSS en línea, caché con
   nombre versionado borrada en `activate`, `cache: 'reload'` en `install`, `Cache-Control: no-store`; todo en `try/catch` con caída a
   `fetch(event.request)`; recuperación sola con `online` (como `pushCliente.ts:186`) además del botón; **no registrar el service worker cuando el
   user agent lleva `SomosNosotrosApp`**. Maqueta previa con `maqueta-pantalla.mjs` (skill `front-visual`); copy y botón de 48 px como `error.tsx`.
   Prueba nueva en el arnés de `avisosSW.test.ts` (las dos existentes siguen verdes) y una de Playwright que aborta la navegación. Escribir los
   límites en la primera línea de `sw.js`.
9. **Medición del respaldo:** marca en `localStorage` desde la página de respaldo y envío a `/api/medir` en la siguiente carga buena; nombre nuevo
   en la lista cerrada de `medir.ts` (`carga_fallida`, dato fijo `pwa|tienda`) y renglón en el aviso de privacidad. `workerStart` de
   `PerformanceNavigationTiming` en el iPhone (Web Inspector), 5 corridas en caliente y 3 en frío, antes y después; presupuesto: «contenido» en
   caliente no empeora más de 100 ms sobre los 1 025 ms de la bitácora 487; Speed Insights p75 de `/` no empeora en 7 días.
10. **Puerta en el iPhone (web instalada):** modo avión → abrir → respaldo (captura 390×844); quitar modo avión → se recupera sola o con
    Reintentar; 504 / tiempo agotado simulado con red; tocar un aviso push con red dormida. Documentar que la caída a mitad del streaming (Inicio
    con un `<Suspense>` por carril) **no** está cubierta: la pantalla queda en esqueletos.
11. El «segundo tramo» de la propuesta original (forzar recarga al volver con pantalla vacía) **sale** hasta tener caso reproducible y definición
    comprobable de «vacía».

**Tramo 2 · Refresco silencioso al volver (sustituye al pull y a «primero lo cargado»).**
12. Antes: SQL de ritmo de cambio (altas y ediciones por día en eventos, lugares y artistas, 30 días) y conteo de consultas y bytes por render de
    Inicio con `banco-funciones.mjs` (≈27 consultas por render, bitácora 529). Con esos dos números se acuerda N con el founder (arranque: 5 min;
    una constante con una línea que diga por qué).
13. Pieza: al volver al frente (`visibilitychange` + `pageshow` + `resume` de `@capacitor/app` en la tienda) tras más de N min, `router.refresh()`
    dentro de `startTransition`, nunca `location.reload()`; solo Inicio y Agenda; solo con `scrollY` bajo; sin hoja ni historia abierta; sin
    duplicar donde ya hay `router.refresh()` (`useAlDia`, `Atras.tsx`). Medir si los carriles en `<Suspense>` vuelven a enseñar esqueleto: si
    parpadean, píldora «Hay novedades» en vez de silencio. Evento `recarga_vuelta` en la lista cerrada. Evaluar «Actualizado hace N min».
14. Puerta: en el iPhone, las dos apps, 390×844: app abierta a media lista, fondo N+1 min con red, un evento publicado desde otro teléfono →
    aparece sin salto ni parpadeo (screencast); lo mismo con sesión vencida (más de 1 h en el fondo, token de 1 h, rotación activada) sin cerrar
    sesión; `TituloInstalada` sigue corrigiendo el título; número de consultas por refresco en la bitácora.
15. Anotar en OPEN_LOOPS la decisión: «al volver no se recarga la página completa; lo cargado se queda; lo nuevo llega en silencio pasado el
    umbral».

**Pull para recargar: fuera de este plan.** Entra solo si, con el Tramo 2 publicado y medido, `carga_fallida` / `recarga_vuelta` o el founder
muestran contenido viejo que el umbral no cubre. Entonces primero botón o «tocar la pestaña activa lleva arriba y recarga»; el arrastre solo con la
vía sin `preventDefault` (leer el rebote nativo con oyentes pasivos, `scrollY` negativo), precedida del experimento de 10 minutos, solo en Inicio,
apagado con `data-historia` / `data-capas` / Mando, en dos versiones de iOS, y nunca en el mismo PR que el service worker.

**Reglas:** un PR por tramo, cada uno en su rama con `main` traído antes; lint + typecheck + tests + build en verde; captura 390×844 nombrando el
icono; bitácora y línea en OPEN_LOOPS; `publica` solo del founder. Las pruebas del founder de los Tramos 1 y 2 se agrupan en una sola sesión: su
cola ya tiene OL-499 y OL-359/358/360/361/364/367 esperando «publica», y el crédito de la API vence el 11 de noviembre. El gestor dice qué
pendiente se desplaza para hacer sitio.

## 5. Lo que el Gestor VIII hace primero

1. `git fetch` y traer la rama `council-recarga-app-instalada` cuando el founder la haya subido (commit `8b872f4` + este cierre). Si no está en
   `origin`, el founder la sube desde la laptop; esta sesión no pudo.
2. Leer el acta (`docs/council/COUNCIL_recarga-app-instalada_2026-11-02.md`): «Condiciones / próximos pasos» es el plan de arriba con más detalle.
3. Reservar OL y bitácoras para el Tramo 1 nativo y el Tramo 1 web (dos ramas, dos operadores que no se tocan: `apps/ios` y `public/`+`src/lib`),
   y para el Tramo 0 documental (CLAUDE.md y DEFINICION.md).
4. Preguntar al founder, agrupado: resultado de la rutina «Buscar agendas y eventos» de San Luis que probó hoy desde Administración; las dos
   pruebas de modo avión; cuándo es la siguiente subida de la app a Apple (para colgar ahí la pieza nativa).
5. Con la vuelta de la rutina de agendas: la carga de Oaxaca y Ciudad de México antes del 11 de noviembre (bitácoras 446 y 449).

## 6. Prompt para abrir el chat «Gestor de cambios VIII»

> Eres el Gestor de cambios VIII de somosnosotros. Lee `CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la skill `gestor-con-agentes`,
> `docs/ops/OPEN_LOOPS.md` (empieza por «Ahora»: OL-500) y la bitácora `docs/bitacora/2026/11/533-entrega-gestor-viii-recarga.md`, que es tu
> entrega. Decisiones de hoy: el blanco al abrir fue en la app del App Store con datos celulares; el pull para recargar queda fuera; «primero lo
> cargado» se anota como decisión; entra el respaldo ante cargas fallidas (nativo primero, web igual) y después el refresco silencioso al volver
> con umbral medido. Empieza por la sección 5 de la bitácora. Frases llanas; una recomendación, no un menú; `publica` solo del founder.

## 7. Evidencia

- Sin build ni pruebas: solo documentos (acta, brief, esta bitácora, OPEN_LOOPS). `node_modules` no está instalado en esta sesión.
- Comprobado en el paquete `next@16.4.3` (descargado con `npm pack`): `error-boundary.d.ts` declara `retry: () => void`.
- Red del entorno: `CONNECT cultura.slp.gob.mx:443 → 403` desde el proxy; igual para su CloudFront, planoinformativo.com y oem.com.mx. La
  búsqueda web sí funciona (corre fuera del contenedor).
- Council: 11 agentes (5 opiniones, 5 revisiones, 1 chairman), 1,3 M tokens, 26 minutos.
