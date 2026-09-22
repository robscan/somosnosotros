# 166 · Avisos en la computadora: el interruptor de Ajustes

**Fecha:** 2026-09-22 · **Rama:** `avisos-escritorio-ajustes`, desde `origin/main` (`19aef7b`, tras el PR #162 de OL-129) · **OL:** OL-131 · **Modelo:** Sonnet 5, esfuerzo medio

## De dónde sale

OL-129 (bitácora 164, PR #162) ya está en producción. El founder reporta que sigue sin funcionar: «ya activé notificaciones en sistema para Chrome, pero al ejecutar en app en esta computadora sigue sin funcionar» (app instalada desde Chrome en Mac). El gestor de cambios midió directamente en su Chrome (pestaña normal, cuenta de Gmail):

- `Notification.permission = "granted"`, service worker activo en `/`, `pushManager.getSubscription()` devuelve una suscripción.
- En Ajustes → Avisos, la fila dice **«En el teléfono»** (no «En esta computadora») y el interruptor está **`disabled`**, `aria-checked=false`; al tocarlo no pasa nada, sin peticiones ni errores.
- En la base: la cuenta de Gmail no tiene ninguna fila en `suscripciones_push` y `avisos_push=false`; la de me.com tiene una de Chrome (fcm) del 16 de septiembre.

## Causa medida: tres mecanismos distintos, no uno

### 1. El mislabel «En el teléfono»: `ipadComoMac` confunde una Mac de verdad con un iPad

`leerPlataforma` trataba **cualquier** `navigator.maxTouchPoints > 1` en un user-agent "Macintosh" como iPad (el truco real de iPadOS para pasar por escritorio). Medido con Chrome real (`playwright-core`, UA real de macOS Chrome, `navigator.maxTouchPoints` sobrescrito a 2 y 5): con **5** (el valor real que reporta un iPad, ya cubierto por la prueba existente de `IPAD_COMO_MAC`) la Mac se trata como iPad correctamente; con **2** (un valor plausible en una Mac real — Sidecar/Universal Control con un iPad, una pantalla táctil externa, o un trackpad Force Touch en ciertas combinaciones) el código **también** la trataba como iPad, aunque sea una Mac de verdad: `plataforma.computadora` sale `false`, la fila se etiqueta "En el teléfono", y `decidirEstadoPush` puede entrar por la rama de iOS. Corregido: el umbral pasa de `> 1` a `>= 5` (el valor exacto que da un iPad), sin tocar ningún caso ya cubierto por las pruebas existentes.

**No se pudo forzar en este entorno que la Mac real del founder reporte exactamente ese valor** (depende de su hardware/ajustes de sistema, como el permiso silencioso de OL-112 en su momento) — la medición aquí prueba que el código, tal como estaba, es frágil ante cualquier valor pequeño y distinto de cero, y que corregirlo no rompe ningún caso real conocido (iPhone, iPad, Android, Mac, todos con sus valores medidos).

### 2. El interruptor deshabilitado para siempre: sin tope en la confirmación del servidor

`estadoPush()` (en `lib/pushCliente.ts`) llama a `suscripcionPushActiva(endpoint)` (una acción del servidor) sin ningún límite de tiempo. Si esa llamada se cuelga — igual que Chrome puede colgar `requestPermission()` (OL-112) —, la promesa nunca resuelve ni rechaza: `estado` se queda en `null` para siempre, y el interruptor de Ajustes queda deshabilitado sin ningún aviso. **Medido con Chrome real** (`playwright-core`, un perfil de Chrome persistente con una suscripción de verdad ya activada, y el respaldo local retrasando 15 s la respuesta de `suscripciones_push`): la fila se queda en "En esta computadora" sin subtítulo y el interruptor deshabilitado durante el cuelgue; **tras 9 s** (más que el tope nuevo de 8 s) se recupera sola a "Apagados en esta computadora", tocable — sin recargar la página ni ninguna acción de la persona. Antes de la corrección se habría quedado así para siempre. Corregido con el mismo patrón que `pedirPermiso` (OL-112): un `Promise.race` con un temporizador de 8 s (`conTope`), y el `catch` que ya existía en `estadoPush` (comentario: "un fallo... no prueba el alta; queda disponible el reintento") ahora sí se activa cuando la promesa tarda de más.

### 3. Una suscripción de OTRA cuenta, reutilizada a ciegas

Hay **un solo `PushSubscription` por origen en todo el navegador**, sin importar la cuenta. `suscribirPush()` hacía `getSubscription() ?? subscribe(...)`: si la cuenta de me.com ya había activado avisos en esa Mac (como pasó el 16 de septiembre), y la cuenta de Gmail entra después en el mismo Chrome y toca "Activar", `getSubscription()` devuelve la MISMA suscripción de me.com. **Medido directamente contra el disparador real** (`limitar_suscripciones_push`, migración `push_validado.sql`, reproducido en el respaldo local): guardar ese endpoint con `usuario_id` de Gmail lo rechaza con `«La suscripcion no se transfiere a otra cuenta»` (código `42501`). Esto explica por qué la cuenta de Gmail no tiene ninguna fila en `suscripciones_push` pese a que el navegador sí tiene una suscripción activa: los intentos anteriores de "Activar" para Gmail probablemente fallaron en el guardado, en silencio.

Corregido: antes de reutilizar una suscripción existente, `suscribirPush()` pregunta al servidor si esa suscripción **ya es de la cuenta actual** (`suscripcionPushActiva`, la misma comprobación que ya usa `estadoPush`). Si no lo es (otra cuenta, o nunca se guardó), la da de baja (`unsubscribe()`) y pide una nueva, propia de esta cuenta. **Medido con Chrome real** (perfil persistente: me.com activa de verdad por la UI, guardando su suscripción; se cambia la cookie a Gmail en el mismo navegador y se toca "Activar"): Gmail termina con **«Activados en esta computadora»**, `aria-checked=true`, con un endpoint propio y distinto del de me.com.

### Punto 3 del encargo: el detalle técnico también en Ajustes

`no-soportado` (sin llave VAPID pública, o sin las tres APIs del navegador) son dos causas distintas — una nuestra, una del navegador de la persona — y antes se veían igual («Este navegador no los recibe»). `detalleNoSoportado()` (nueva, en `lib/pushCliente.ts`) distingue cuál falta; el subtítulo de Ajustes lo agrega entre paréntesis.

## Código

- `lib/plataforma.ts`: `ipadComoMac` con `puntosTactiles >= 5` (antes `> 1`). Prueba nueva con 1, 2 y 4 puntos en una Mac real.
- `lib/pushCliente.ts`:
  - `conTope()`, con el mismo motivo que `pedirPermiso`; envuelve la llamada a `suscripcionPushActiva` dentro de `estadoPush`.
  - `suscribirPush()` verifica la propiedad de una suscripción existente antes de reutilizarla; si no es de la cuenta actual, la da de baja y pide una nueva.
  - `detalleNoSoportado()`, nueva, para el subtítulo de Ajustes.
- `app/perfil/AvisosPerfil.tsx`: `subtitulo()` agrega el detalle de `no-soportado`.

## Verificación

`npm run lint && npm run typecheck && npm test`: verdes (1008 pruebas; 9 nuevas: 3 de `puntosTactiles` en `plataforma.test.ts`, 6 de `pushCliente.test.ts` — reutilizar/dar de baja una suscripción ajena, el tope de 8 s, y `detalleNoSoportado`). `npm run build`: verde.

Una prueba nueva (`si la confirmación del servidor se cuelga…`) dejaba, en su primera versión, una promesa que nunca se resolvía: eso contaminaba la suite completa (`scripts/pincel/simulador-mandos.test.ts` fallaba solo al correr junto con las demás, nunca en aislado). Encontrado por bisección con `git stash` (aislar cambio por cambio) y con `it.skip` (aislar prueba por prueba); corregido haciendo que la promesa se resuelva tarde, no nunca. Confirmado con dos corridas seguidas de la suite completa, en verde.

### Capturas reales (`docs/rediseno/capturas-166/`)

`next build && next start` contra un respaldo local con dos cuentas inventadas (Gmail, sin suscripción; me.com, con una del 16 de septiembre), igual que la medición real del gestor. Chrome real por `playwright-core`. `document.fonts.check('16px "Bricolage Grotesque"')` → `true` en las seis.

- `01-computadora-correcta--1280x800.png` / `--390x844.png`: Mac con 2 puntos táctiles (Sidecar/trackpad) — «En esta computadora», tocable, ya no se confunde con un iPad.
- `02-gmail-antes--1280x800.png`: Gmail antes de activar, en el mismo Chrome donde me.com ya activó.
- `02-gmail-activado--1280x800.png` / `--390x844.png`: Gmail tras tocar "Activar" — «Activados en esta computadora», con un endpoint propio (la suscripción vieja de me.com se dio de baja).
- `03-tope-revisando--1280x800.png`: el interruptor mientras el servidor está colgado (respaldo con una demora de 15 s a propósito) — sin subtítulo, deshabilitado.
- `03-tope-recuperado--1280x800.png` / `--390x844.png`: 9 s después (más que el tope de 8 s), solo — «Apagados en esta computadora», tocable, sin recargar ni tocar nada.

## Qué falta

- Que el founder repita "Activar" en su Chrome real (app instalada de escritorio) y diga qué ve ahora: si activa de verdad, si dice un motivo, o si sigue sin pasar nada — con eso se sabe si alguna de estas tres causas era la suya o si hay una cuarta no medida aquí.
- El umbral de `puntosTactiles >= 5` es una corrección defensiva medida contra el código, no una confirmación de que ESA era la causa del mislabel en su Mac concreta: no se pudo leer `navigator.maxTouchPoints` de su hardware real desde este entorno.

Commit local en `avisos-escritorio-ajustes`, sin push. Aviso al gestor con el hash y esta bitácora.
