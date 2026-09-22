# 147 · El letrero de activar avisos, adecuado al medio

**Fecha:** 2026-09-21 · **Rama:** `avisos-segun-el-medio`, desde `origin/main` (`1d2907a`, luego traído a `1e8f66b`) · **OL:** OL-112 · **Modelo:** Sonnet 5, esfuerzo medio

## De dónde sale

Reporte del founder (2026-09-21), tal cual: «me salió un letrero de activar notificaciones en este telefono mientras estaba viendo la app instalada en desktop desde chrome… además le di tap y no hizo nada. Por favor corrige que si llega notificacion de notificaciones que sea adecuado al medio.»

Arranqué avisando al chat de gestión de cambios («Gestor de cambios II») y esperé su visto bueno antes de tocar nada. Confirmó números (OL-112/bitácora 147), rama (`avisos-segun-el-medio` desde `origin/main`, creada de verdad con `git checkout -b`) y el orden: primero la causa medida, luego la propuesta de dos líneas sobre si el letrero sale en escritorio, y solo después el código.

## Causa medida

Dos fallas distintas, no una.

**(1) El texto siempre decía «este teléfono».** `components/ActivarAvisos.tsx` tenía sus cinco textos («Activa los avisos en este teléfono», «Listo: te avisamos en este teléfono», etc.) escritos a mano, sin usar `usePlataforma()` aunque ya lo importaba para otra cosa. `novedades/TelefonoAun.tsx` sí distinguía computadora (ya lo notó el gestor en OPEN_LOOPS). La tarjeta ya salía en cualquier app instalada — Chrome de escritorio incluido, porque `plataformaActual()` lee `window.matchMedia("(display-mode: standalone)").matches`, verdadero también para un PWA instalado en Chrome de escritorio — **antes de esta pieza**: no es una regla nueva que el letrero aparezca ahí, solo estaba mal etiquetado.

**(2) El toque no hacía nada visible, y a veces de verdad no hacía nada.** Dos causas se suman:

- `suscribirPush` (en `lib/pushCliente.ts`) llamaba `await Notification.requestPermission()` sin ningún tope. Documentado por Chromium (blog oficial, "Introducing quieter permission UI for notifications", Chrome 80, 2020; confirmado también por `developer.chrome.com/blog/permissions-chip` y reportes de terceros sobre la promesa sin resolver): Chrome puede volver **silencioso** el permiso de notificaciones — en vez de su aviso modal, dibuja un icono/chip junto a la dirección — para personas que él mismo clasifica como "suelen bloquear avisos", **sin que dependa de esta página en particular**. Mientras la persona no note ese icono y lo toque, la promesa de `requestPermission()` se queda pendiente; puede no resolverse nunca. Sin tope, `estado` se quedaba en `"trabajando"` para siempre.
- Aun en `"trabajando"`, la tarjeta no lo decía: el botón solo bajaba a opacidad 0.6 (`disabled`), con el mismo texto («Activa los avisos en este teléfono» / «Activar»). Un cambio tan sutil, con el permiso además silencioso y sin aviso del navegador, se lee exactamente como «le di tap y no hizo nada».

**Lo que se pudo medir y lo que no:** se leyó el código (`ActivarAvisos.tsx`, `pushCliente.ts`) y se confirmó por documentación oficial de Chromium el mecanismo del permiso silencioso y que la promesa puede quedar sin resolver. No se pudo **forzar** ese estado silencioso en un Chrome real de este entorno (depende del historial de bloqueos de la persona en Chrome, no es un flag que se active por código ni vale en el Chromium interno de Puppeteer, que siempre arranca "limpio"). Sí se reprodujo la ruta feliz completa (permiso concedido de un tirón, alta guardada) contra un respaldo local, y se simuló cada estado (bloqueado, permiso que nunca resuelve, registro que nunca llega) sustituyendo `Notification.requestPermission`/`navigator.serviceWorker` antes de que cargara React (`evaluateOnNewDocument`), para comprobar que el código de `ActivarAvisos.tsx` reacciona bien a cada uno — no es lo mismo que ver el chip real de Chrome, y se dice así con honestidad.

## La propuesta de dos líneas (encargo, punto 4)

**¿Conviene que el letrero siga saliendo en escritorio?** Sí: ya salía ahí (es "app instalada", sin distinguir aparato, desde que existe), y con el texto correcto («esta computadora») deja de ser un error de rótulo para ser el mismo objeto que en el teléfono, aplicado igual. No hay motivo de producto para ocultarlo en escritorio — la decisión 4 de `docs/rediseno/17` no lo excluía, solo se escribió pensando en el iPhone. No cambio ninguna regla: mantengo el comportamiento actual (sale en cualquier aparato instalado sin permiso) y corrijo el texto.

## Código

### Una sola función pura para el aparato (`lib/plataforma.ts`)

- `esteAparato(p)`: "este teléfono" / "esta computadora", para el medio de una frase. Única función que sabe el ternario computadora/teléfono.
- `enEste(p)`: `en ${esteAparato(p)}` — ya existía, ahora se apoya en `esteAparato` en vez de repetir el ternario.
- `esteAparatoInicial(p)`: "Este teléfono" / "Esta computadora", con mayúscula, para empezar una frase — la usan los dos avisos de ubicación de los formularios.
- `dondeSeActivan(p)`: completada para Chrome de escritorio (nuevo campo `chrome: boolean` en `Plataforma`, detectado por user-agent sin contar Edge/Opera/Brave, que también dicen "Chrome/"): **"en Chrome: el candado junto a la dirección › Permisos del sitio › Notificaciones"**. iOS sigue mandando a Ajustes; cualquier otro navegador de escritorio, al genérico de antes.

Ningún tablet: `Plataforma` no distingue iPad de teléfono hoy (el iPad se detecta como `ios`), y el encargo pedía usar la distinción "si `usePlataforma` lo distingue" — no lo hace, así que no se agregó una categoría nueva (fuera del alcance mínimo).

### El toque siempre dice algo (`components/ActivarAvisos.tsx`)

- Los cinco textos usan `enEste(plataforma)` en vez de "este teléfono" fijo.
- Nuevo estado `"silenciado"`, distinto de `"bloqueado"`: mismo dibujo (tarjeta neutra, con ✕), título «Tu navegador no mostró el permiso» y la misma línea `dondeSeActivan(plataforma)`.
- Mientras `"trabajando"`, el título y el botón dicen **"Activando…"** y el subtítulo "Un momento" (antes: mismo texto que la invitación, solo el botón atenuado). Con un tiempo máximo: ver abajo.

### El tope en `lib/pushCliente.ts`

`pedirPermiso(ms = 8000)` corre `Notification.requestPermission()` contra un `Promise.race` con un temporizador de 8 s. Si gana el temporizador, `suscribirPush` devuelve `{ ok: false, motivo: "silenciado" }` en vez de quedarse esperando para siempre. `ResultadoAlta` gana ese tercer motivo.

### Los dos avisos de ubicación de los formularios

`FormularioLugar.tsx` y `FormularioEvento.tsx` («Este teléfono no da su ubicación…») ahora arman el mensaje con `` `${esteAparatoInicial(plataforma)} no da su ubicación...` ``. Solo se aplica al caso `"sin-soporte"` (el aparato no tiene `navigator.geolocation`): el otro caso ("No se pudo leer tu ubicación") no depende del aparato y se deja igual.

### `AvisosPerfil.tsx` (Ajustes)

El subtítulo de "Bloqueados" tenía su propio ternario (`p?.ios ? "…Ajustes del iPhone" : "…configuración del sitio"`), duplicando lo que ya sabía `dondeSeActivan`. Ahora reutiliza `dondeSeActivan(p)` (con el texto más largo y preciso, igual al de `ActivarAvisos`). El motivo `"silenciado"` de una nueva alta se traduce a una nota: «Tu navegador no mostró el permiso. Se activa {dondeSeActivan}.»

### `ConsentimientoAvisos.tsx` (fuera de los archivos asignados, ajuste obligado)

No estaba en la lista de archivos de la pieza, pero también llama a `suscribirPush` y su tipo `Problema` (`"bloqueado" | "fallo" | "no-soportado" | "otra-app"`) no incluía `"silenciado"`: el cambio de tipo en `ResultadoAlta` rompía su build. Arreglo mínimo, sin tocar su diseño: `"silenciado"` se trata igual que `"fallo"` ahí (mismo "Intentar de nuevo"), con un comentario que explica por qué.

## Verificación

`npm run lint && npm run typecheck && npm test`: verdes. 10 pruebas nuevas (`chrome` en `leerPlataforma`, `esteAparato`/`esteAparatoInicial`, `dondeSeActivan` completo con Chrome de escritorio, y el tope de 8 s de `suscribirPush` con temporizadores simulados) más las 783 que ya había. Los mismos 7 fallos ajenos y preexistentes (falta el paquete `pg` en este árbol, no relacionado con esta pieza — confirmado comparando contra el mismo árbol sin mis cambios, con `git stash`). `npm run build`: verde, 39 rutas.

### Capturas reales (`docs/rediseno/capturas-147/`)

`next build && next start` contra un respaldo local 100 % inventado (Node puro, sin dependencias, en el scratchpad de la sesión: imita `/auth/v1/token`, `/auth/v1/user` y PostgREST para `perfiles` y `suscripciones_push`; nunca toca producción ni el `.env` real, que nunca entró a esta carpeta). Sesión de un admin inventado con `avisos_push: true`, cookie `sb-127-auth-token` con un JWT sin firma válida (mismo patrón documentado en la memoria del proyecto). El navegador de las capturas es el Chromium propio de Puppeteer (instalado con `npm install puppeteer` en el scratchpad, nunca en el repo), no el Chrome del founder ni el navegador integrado de la sesión — necesario para inyectar la cookie y sustituir `Notification`/`navigator.serviceWorker` antes de que cargara React.

Nueve capturas, en 1280×800 (escritorio, el caso real del founder) y 390×844 (teléfono, para comprobar que no hay regresión):

- `activaravisos-invitar--1280x800.png` / `--390x844.png`: "Activa los avisos en esta computadora" / "…en este teléfono".
- `activaravisos-trabajando--1280x800.png`: "Activando…" en el título y el botón, en vez de la tarjeta muda de antes.
- `activaravisos-bloqueado--1280x800.png`: "Quedaron bloqueados / Se activan en Chrome: el candado junto a la dirección › Permisos del sitio › Notificaciones".
- `activaravisos-silenciado--1280x800.png`: "Tu navegador no mostró el permiso" con la misma salida — el caso exacto que reportó el founder.
- `activaravisos-fallo--1280x800.png`: "No pudimos darte de alta en esta computadora".
- `activaravisos-listo--1280x800.png` / `--390x844.png`: "Listo: te avisamos en esta computadora" / "…en este teléfono", con una suscripción de prueba que sí pasa la validación real (`lib/suscripcionPush.ts`: proveedor permitido, `p256dh` de 87 caracteres con el byte inicial correcto, `auth` de 22).
- `avisosperfil-bloqueado--1280x800.png`: en Ajustes, "En esta computadora / Bloqueados: se activan en Chrome…".

## Qué falta

- Ver los cinco estados en el iPhone real del founder (Safari y app instalada), como pide la regla del proyecto antes de dar la fase por buena — solo lo puede hacer él.
- No se pudo, en este entorno, forzar de verdad el permiso silencioso de un Chrome con historial de bloqueos: la causa está sostenida por código y documentación, no por una reproducción 1:1. Si el founder puede reproducirlo con su propio Chrome (bloqueando avisos en un par de sitios primero), sería la confirmación que falta.

Commit local en `avisos-segun-el-medio`, sin push. Entrego "listo" al gestor con el hash y esta bitácora.
