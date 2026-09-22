# 164 · Avisos en la computadora: por qué falla al activar

**Fecha:** 2026-09-22 · **Rama:** `avisos-escritorio-causa`, desde `origin/main` (`88c317e`) · **OL:** OL-129 · **Modelo:** Sonnet 5, esfuerzo medio

## De dónde sale

Reporte del founder (2026-09-22), literal: «al seleccionar dar de alta notificaciones en computadora, falla al activar notificaciones, investiga por qué no se activan». Usa Chrome en Mac (la app instalada desde Chrome, y también el sitio en Chrome). Ya había pedido antes: «si sale el letrero de avisos en escritorio, active notificaciones en escritorio; de otra forma no sirve que se vea» (OL-112, «Decidido» 2026-09-21).

## Causa medida

**No es la misma causa que OL-112/bitácora 147.** Esa pieza (en producción, PR #142) ya corrige el caso en que `Notification.requestPermission()` se queda sin resolver (Chrome «silencia» el diálogo). Esta pieza mide una **segunda falla, distinta y no cubierta**: con el permiso ya en `"granted"`, `pushManager.subscribe()` puede lanzar por sí solo, y el código actual la trataba como cualquier otro error, sin decir qué pasó.

### Reproducción

`next build && next start` contra un respaldo local 100 % inventado (Node puro, en el scratchpad de la sesión: imita `/auth/v1/token`, `/auth/v1/user` y PostgREST para `perfiles` y `suscripciones_push`, con el cupo de 10 dispositivos de la migración real; nunca toca producción ni `.env`, que nunca entró a esta carpeta). Chrome real (`playwright-core` con el binario de `/Applications/Google Chrome.app`, siguiendo el patrón ya documentado en la memoria del proyecto), la app «instalada» simulando `matchMedia("(display-mode: standalone)")`, sesión de una cuenta con `avisos_push: true` y el permiso de notificaciones concedido de antemano (`context.grantPermissions(["notifications"])`).

Con esas condiciones, tocar «Activar» seguía la cadena completa:

1. `Notification.requestPermission()` resuelve `"granted"` de inmediato (no es el caso silenciado).
2. Se registra el service worker sin problema (`navigator.serviceWorker.ready` resuelve con `/sw.js` activo).
3. `reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` con una llave VAPID real (par generado con `web-push` solo para la prueba, nunca commiteada) — **y aquí lanza**:

   ```
   AbortError: Registration failed - permission denied
   ```

   Medido en un contexto de Chrome **efímero** (`browser.newContext()` sin perfil persistente): Chrome lo trata igual que un perfil de incógnito/invitado para el Push API — su propia consola lo dice de forma explícita: *"Chrome currently does not support the Push API in incognito mode"* (https://crbug.com/41124656). El permiso del SITIO ya decía `"granted"`; el navegador igual se negó a registrar la suscripción.

   **Contraprueba:** con un perfil de Chrome **persistente** (`chromium.launchPersistentContext`, un directorio real de perfil en el scratchpad, no un contexto efímero), la misma llamada — mismo código, misma llave, mismo servicio Push real de Google — **sí completa** y devuelve un `endpoint` de `fcm.googleapis.com` válido. La diferencia no es la llave VAPID ni el service worker: es el tipo de perfil.

4. El código actual (`suscribirPush` en `src/lib/pushCliente.ts`) no distinguía este error de cualquier otro: caía en el mismo `catch` genérico y devolvía `{ ok: false, motivo: "fallo" }`, con el mismo texto para cualquier causa («No pudimos darte de alta… Vuelve a intentarlo») y **sin mostrar nunca el error real**, ni siquiera para depurar. Así se ve exactamente como «le di tap y no hizo nada útil»: el permiso ya estaba concedido, no hay bloqueo que abrir en ningún candado, y el mensaje no dice qué revisar.

### Por qué importa en Chrome de escritorio real (no solo en la prueba)

Un contexto efímero de Playwright no es exactamente la Mac del founder, pero el mismo `AbortError: "Registration failed - permission denied"` de `pushManager.subscribe()` con el permiso del sitio en `"granted"` está documentado también para otra causa habitual en macOS: **cuando Ajustes del sistema → Notificaciones → Google Chrome tiene los avisos apagados a nivel de sistema**, Chrome no puede registrar el push y falla con el mismo AbortError, independiente del permiso por sitio. No se pudo forzar ese segundo caso en este entorno sin tocar Ajustes del sistema de esta Mac compartida (la misma limitación que bitácora 147 con el permiso silencioso): lo que sí queda medido y reproducido es que el código actual mete **cualquier** rechazo de `pushManager.subscribe()` — sea por perfil efímero, por notificaciones del sistema apagadas, o por otra causa del navegador — en el mismo cajón mudo de "fallo".

## Corrección

**`src/lib/pushCliente.ts`:** `suscribirPush` distingue ahora el error de `pushManager.subscribe()`/`getSubscription()` con su propio motivo, `"rechazado"`, y guarda `` `${nombre}: ${mensaje}` `` del error real (`detalle`) en el resultado — igual que ya hace `"bloqueado"` (denied) y `"silenciado"` (OL-112). Cualquier otro fallo (`"fallo"`) también lleva ahora su `detalle` cuando el navegador lo da.

**`src/lib/plataforma.ts`:** `dondeSeRegistra(p)`, nueva función pura (con su prueba): «Revisa que las notificaciones de Chrome estén permitidas en el sistema, y que esta no sea una ventana de incógnito o invitado» (genérico, «tu navegador», fuera de Chrome).

**`src/components/ActivarAvisos.tsx`:** nuevo estado `"rechazado"`, con el mismo dibujo neutro (blanco, borde) que `"bloqueado"`/`"silenciado"` — sin tocar el diseño del letrero más allá del texto: título «Tu sistema no dejó registrar el aviso», el texto de `dondeSeRegistra`, y **debajo, en gris chico, el `name: message` real del error** (mismo patrón del mando de Pincel, OL-117: `<small className={styles.detalleTecnico}>`). El estado `"fallo"` genérico también muestra su detalle cuando lo hay.

**`src/app/perfil/AvisosPerfil.tsx`** (Ajustes): la nota bajo la palanca distingue `"rechazado"` con el mismo texto de `dondeSeRegistra`, más el detalle entre paréntesis cuando existe.

**`src/components/ConsentimientoAvisos.tsx`** (fuera de los archivos asignados, ajuste obligado por el tipo — mismo patrón que bitácora 147 con `"silenciado"`): `"rechazado"` se trata como cualquier alta que no terminó, con el mismo «Intentar de nuevo»; esa pantalla no tiene sitio para el detalle técnico.

## Verificación

`npm run lint && npm run typecheck && npm test`: verdes (992 pruebas, incluidas 4 nuevas: 2 en `pushCliente.test.ts` para el motivo `"rechazado"` con y sin mensaje, 1 en `plataforma.test.ts` para `dondeSeRegistra`). `npm run build`: verde.

### Capturas reales (`docs/rediseno/capturas-164/`)

`next build && next start` contra el mismo respaldo local. Chrome real por `playwright-core`, app instalada (standalone), sesión de una cuenta con `avisos_push: true`. `document.fonts.check('16px "Bricolage Grotesque"')` → `true` en las seis.

- `rechazado-00-invitacion--1280x800.png` / `--390x844.png`: el letrero de siempre, «Activa los avisos en esta computadora», antes de tocar (permiso de notificaciones ya concedido, para que el fallo sea el de `subscribe`, no el ya corregido de `requestPermission`).
- `rechazado-01-resultado--1280x800.png` / `--390x844.png`: **el caso exacto que reportó el founder**, reproducido con un perfil de Chrome efímero — «Tu sistema no dejó registrar el aviso / Revisa que las notificaciones de Chrome estén permitidas en el sistema, y que esta no sea una ventana de incógnito o invitado» y, en gris chico, «AbortError: Registration failed - permission denied».
- `listo--1280x800.png` / `--390x844.png`: el mismo botón, con un perfil de Chrome persistente — `pushManager.subscribe()` completa de verdad contra el servicio push real de Google, la acción del servidor guarda la suscripción en el respaldo, y el letrero dice «Listo: te avisamos en esta computadora».

## Qué falta

- Que el founder repita «Activar» en su Chrome real (app instalada de escritorio) y confirme si ahora dice un motivo, y cuál — con eso se sabe si su causa fue el AbortError de `subscribe` (esta pieza) o algo distinto que no se haya medido aquí.
- Si el founder puede comprobar y confirmar (o descartar) el estado de Ajustes del sistema → Notificaciones → Google Chrome en su Mac, se cierra la duda de cuál de las dos causas documentadas del mismo AbortError es la suya.
- No se tocó ningún envío real de avisos ni producción; `.env.local` del árbol se borra al cerrar.

Commit local en `avisos-escritorio-causa`, sin push. Aviso al gestor con el hash y esta bitácora.
