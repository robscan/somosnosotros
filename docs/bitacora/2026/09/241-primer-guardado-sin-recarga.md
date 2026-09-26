# 241 · El primer «Voy» o «Seguir» ya no recarga la página (OL-212)

**Fecha:** 2026-09-25 · **Rama:** `primer-guardado-sin-recarga`, desde `origin/main`. **Operador:** nuevo
(Sonnet), sin subagentes, council ni workflows.

## Pedido

OPEN_LOOPS, OL-212. Palabras del founder: «Al guardar primera vez algo recarga la página. No entiendo por
qué.» Y al precisar: «Al seguir o voy. Se recarga la primera vez que voy a un evento. Luego ya no; igual al
pasar a lugares, puse seguir "+" y se recargó con primer objeto guardado».

## 1. Reproducción antes de tocar código

**Entorno:** `npm ci` en este árbol de trabajo (no traía `node_modules`). `next build && next start -p 3100`
contra un respaldo local 100 % inventado (Node puro, sin dependencias, en el scratchpad de la sesión: imita
`/auth/v1/user`, `/auth/v1/token` (refresco, lección OL-088: siempre 200) y PostgREST genérico — filtros
`eq`/`in`/`is`, embeds por llave foránea, upsert/patch/delete — para `perfiles`, `lugares`, `eventos`,
`asistencias`, `seguimientos` y las RPC `van_por_evento`/`cuenta_seguidores`; nunca tocó producción ni el
`.env` real, que nunca entró a esta carpeta). Sesión de una cuenta inventada (`prueba@example.com`), cookie
`sb-127-auth-token` con un JWT `HS256` sin firma válida (mismo patrón de la memoria del proyecto). Chrome real
de la Mac vía `playwright-core` (`npm install` en el scratchpad, nunca en el repo), 390×844.

**Cómo se detectó una recarga de verdad:** antes de cada toque, `window.__marca = 1` (una variable JS suelta:
una recarga real del documento la borra, un refresco de React/Next no) y se escuchó `framenavigated`/`load`
del documento con Playwright. Para las pruebas de componente (sección 3) se usó además un contador en
`sessionStorage` (sobrevive a una recarga real, a diferencia de una variable JS) que se incrementa cada vez
que el script del bundle se ejecuta: si sube de 1, algo recargó el documento.

**Caminos probados**, por cada hipótesis del encargo, en un evento y en un lugar frescos (cuenta y `avisos_preguntado=false` reiniciados entre pruebas con `GET /__reset` del respaldo):

1. Tocar «Voy» / «Seguir» la primera vez (guarda con `cambiarAsistencia`/`cambiarSeguimiento`, con sus
   `revalidatePath` reales).
2. La hoja de avisos que se abre tras ese primer guardado, contestada con «No, gracias».
3. La hoja de avisos contestada con «En el teléfono» / «En esta computadora» (permiso de `Notification`
   denegado por defecto en Chrome headless → rama "no soportado").
4. Dejar que la hoja se autocierre sola (temporizador de 1.6 s de `ConsentimientoAvisos`).
5. Cerrar la hoja con la ✕, sin contestar nada.

**Resultado:** en ningún camino se perdió `window.__marca` ni se disparó una recarga real de documento
(`load`/`beforeunload` de navegación, no de recurso). Es decir: **no se pudo reproducir una recarga dura de
la página en un Chrome real** con `next build && next start`, sesión real y las mismas acciones de servidor
que usa producción (`docs/rediseno/capturas-241` y los guiones de repro quedaron en el scratchpad de la
sesión, no en el repo).

## 2. El defecto real que sí se encontró

Con el código de hoy, `router.refresh()` de Next (que sí volvía a pedir **todo** el árbol de componentes de
servidor de la página — el mismo mecanismo que un `<Link>` reutiliza para releer datos, sin ser una recarga de
documento) se llamaba **solo** al cerrar la hoja de avisos de `src/components/Seguir.tsx` (Seguir en un lugar
o artista) — contestada o no:

```tsx
function cerrarHoja() {
  setHoja(false);
  router.refresh();   // ← disparaba en TODO cierre de la hoja: X, fuera, Escape, autocierre o "No, gracias"
}
```

Esto coincide justo con la hipótesis del encargo («una hoja de "¿quieres avisos?"... que hace
`router.refresh()`») y con el patrón «pasa la primera vez»: la hoja solo se abre la primera vez que se
contesta la pregunta de avisos en la cuenta (`hayQuePreguntar`). `src/app/eventos/[id]/Asistencia.tsx` («Voy»)
**no tenía** ninguna llamada de este tipo — su `onCerrar` de la hoja solo hacía `setHoja(false)` — así que ya
cumplía lo que pide el encargo; no se tocó.

`router.refresh()` no reproducía como recarga *dura* en este entorno (sección 1), pero sí es un refetch
completo e innecesario: reabre todos los `<Suspense>` de la ficha (`MetaLugar`, `SeccionEventosLugar`) a su
esqueleto mientras llega la respuesta, con la posibilidad real de parpadeo/salto en una red o CPU más lentas
que las de este entorno de prueba — el efecto que un founder sin trasfondo técnico describiría como «se
recarga la página». Y era innecesario de verdad: lo único que ese refresh perseguía era refrescar la frase de
promesa de la barra («Te avisamos por correo…»), y ese dato (qué se contestó) ya lo tiene la propia hoja que se
acaba de cerrar — no hacía falta pedírselo de nuevo al servidor.

## 3. Arreglo

- **`src/components/ConsentimientoAvisos.tsx`:** nueva prop opcional `onDecidido?: (d: {correo: boolean; push:
  boolean}) => void`, llamada por un `useEffect` cada vez que `correoOk`/`telefono` pasan a tener un valor real
  (cualquier respuesta guardada, por cualquier camino: correo, teléfono, "No, gracias", o el "falta un paso"
  del iPhone). Quien la use se entera de lo decidido sin pedir nada al servidor.
- **`src/components/Seguir.tsx`:** se quita `useRouter`/`router.refresh()`. Estado local
  `correoElegido`/`preguntadoLocal` (arrancan del valor que trajo el servidor) que `alDecidirAvisos` actualiza
  con lo que llega de `onDecidido`; `cerrarHoja` ahora solo hace `setHoja(false)`. La frase de promesa de la
  barra (`Te avisamos… / Sin avisos; se cambia en Ajustes`) sale de este estado local, no de la prop del
  servidor. `useSeguirEnLista.tsx` (el botón de las listas) no mostraba esa frase y no se tocó.

Con esto, cerrar la hoja de avisos (contestada o no) nunca vuelve a pedir la página entera: el botón pasa a su
estado guardado en el sitio, con el scroll y lo que hubiera abierto intactos, tal como pide el encargo.

## 4. Sobre la app de iPhone (Capacitor/WKWebView)

No se reprodujo la recarga en un navegador real (sección 1) tras agotar las hipótesis del encargo sobre el
código compartido (la hoja de avisos, `revalidatePath`/`redirect`, la sesión, el service worker — sin ningún
`location.reload()` ni `window.location.href = …` en todo `src/` ni `public/sw.js`, comprobado con
`grep -rn` completo). Se leyó (sin tocar, `apps/**` fuera de alcance de esta pieza) el código nativo de la app
de iPhone buscando una navegación que un plugin cancele o algo ligado al permiso de avisos: la única pieza que
recarga la página de verdad es `apps/ios/ios/App/App/MainViewController.swift` — `alCambiarRed()` hace
`webView.load(URLRequest(url: config.appStartServerURL))` (recarga la URL de arranque, la raíz del sitio) cada
vez que `NWPathMonitor` pasa de "sin red" a "con red". No se pudo confirmar ni descartar que esto se dispare
por algo del primer guardado (no hay simulador con red real disponible en esta pieza, y tocar Swift está fuera
de alcance): se deja dicho como pista concreta para quien lo persiga dentro de la app, no como causa
confirmada.

## 5. Pruebas

**Nueva, de componente** (`src/components/Seguir.componentes.test.mjs`; no corre con `npm test` — Chrome real
vía Playwright, se corre a mano):

```
PLAYWRIGHT_MODULE=<playwright-core>/index.mjs CHROME_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  node --test src/components/Seguir.componentes.test.mjs
```

Bundle real (esbuild) de `Seguir.tsx` + `ConsentimientoAvisos` + `ui/Hoja` de verdad (con sus CSS Modules
reales), con `next/navigation` y el permiso de avisos simulados para que la prueba sea determinista. 2 pruebas:
cerrar la hoja con «No, gracias» y cerrarla con la ✕ sin contestar — ambas comprueban que el contador de
`sessionStorage` se queda en 1 (nunca se re-ejecutó el script: no hubo recarga) y que `router.refresh` quedó
en 0 llamadas. **Con el código de antes de esta pieza, las dos fallaban** (`1 !== 0`, `router.refresh()` se
llamaba una vez en cada camino); con el arreglo, **las dos pasan**.

**Suite completa:** `npm run lint && npm run typecheck && npm test && npm run build`, todo en verde — 106
archivos, 1308 pruebas (el mismo aviso preexistente de `docs/diseno/logotipo/iconos-sn.mjs`, sin relación).

## 6. Capturas reales (`docs/rediseno/capturas-241/`), 390×844

Contra el mismo respaldo local y `next build && next start` de la sección 1, con el arreglo ya aplicado:

- **`241-1-evento-antes-de-voy.png`** / **`241-3-evento-despues-de-voy.png`:** ficha de "Evento de prueba"
  antes y después del primer «Voy» (con la hoja de avisos contestada "No, gracias" y cerrada con la ✕, ya que
  con `calendarioUrl` la hoja no se autocierra — decisión 14 de docs/rediseno/17). Mismo scroll (20px), misma
  posición del "Cartel"; la barra pasa de "Voy" a "✓ Voy · Ya estás en la lista".
- **`241-2-evento-hoja-avisos.png`:** la hoja «¿Te recordamos ese día?» abierta tras ese primer «Voy».
- **`241-4-lugar-antes-de-seguir.png`** / **`241-6-lugar-despues-de-seguir.png`:** ficha de "Lugar de prueba"
  antes y después del primer «Seguir». Mismo scroll exacto (40px antes y después). La barra pasa de "Seguir" a
  "✓ Sigues · Sin avisos; se cambia en Ajustes" — esa frase sale del estado local nuevo
  (`onDecidido`/`preguntadoLocal`), sin haber pedido nada al servidor.
- **`241-5-lugar-hoja-avisos.png`:** la hoja «¿Te avisamos de sus eventos?» abierta tras ese primer «Seguir».

Las seis a 390×844 de verdad (`file` lo confirma), con Bricolage Grotesque condensada pintada de verdad (se ve
en «SMSNSTRS» y en los títulos).

Al terminar: se detuvieron `next start` y el respaldo, se borró `.env.local` (no se comitea).

## 7. Informe final

- **Causa encontrada y arreglada:** `src/components/Seguir.tsx` (antes de esta pieza, línea ~95-98) llamaba
  `router.refresh()` en **todo** cierre de la hoja de avisos («Seguir» en lugares/artistas), un refetch
  completo e innecesario del árbol de servidor de la ficha — coincide con la hipótesis del encargo sobre la
  hoja de avisos. `src/app/eventos/[id]/Asistencia.tsx` («Voy») no tenía esa llamada.
- **No se pudo reproducir una recarga dura del documento** en Chrome real (`next build`/`next start`, sesión
  real, mismas acciones de servidor) en ninguno de los caminos probados, antes ni después del arreglo — sección
  1. Pista sin confirmar para la app de iPhone: `MainViewController.swift`, sección 4.
- **Arreglo:** `ConsentimientoAvisos` avisa lo decidido (`onDecidido`) a quien lo abrió; `Seguir.tsx` lo guarda
  en estado local y ya no llama a `router.refresh()` al cerrar la hoja.
- **Prueba:** `src/components/Seguir.componentes.test.mjs` (falla con el código de antes, pasa con el
  arreglo) + suite completa en verde (sección 5).
- **Capturas:** `docs/rediseno/capturas-241/241-{1..6}-*.png`, descritas en la sección 6.
- **PR:** [#247](https://github.com/robscan/somosnosotros/pull/247), sin migraciones ni variables de entorno nuevas. Sin unir; a la espera del founder.

## Segunda vuelta (2026-09-25, noche) — reproducción DENTRO de la app de iPhone

PR #247 ya se unió a `main` (limpieza del `router.refresh()` de `Seguir.tsx`). El founder sigue viendo la
recarga en TestFlight, con «Voy» y con «Seguir», la primera vez por tipo de objeto. Descartado por el gestor:
Skew Protection de Vercel (ya activo, 12 h, `?dpl=` en las páginas) — no es un desfase de versión entre
cliente y servidor. Encargo: reproducirlo de verdad dentro de la app de iPhone (Capacitor/WKWebView), en un
simulador propio, creado y borrado al final; no tocar `apps/ios` salvo que la causa esté ahí.

### 8. Cómo se armó la reproducción dentro de la app

- **Simulador propio** (nunca uno compartido con otro chat): `xcrun simctl create "OL212-repro" "iPhone 17
  Pro" com.apple.CoreSimulator.SimRuntime.iOS-26-3`, arrancado con `simctl boot`. Borrado al terminar con
  `simctl shutdown && simctl delete` (dos veces: una simulación se rehizo a medio camino, sección 10).
- **La web:** el mismo respaldo local y `next build && next start -p 3100` de la sección 1 (`.env.local` en
  este árbol, nunca comiteado — confirmado con `git status`/`git diff` al terminar), más dos endpoints nuevos
  en el respaldo (`/auth/v1/otp`, `/auth/v1/verify`) para poder entrar de verdad con el formulario de la app
  (código de 8 dígitos fijo) en vez de inyectar una cookie a mano — dentro de un WKWebView real no hay forma
  de poner una cookie sin pasar por el propio flujo de la app.
- **La app nativa, apuntando a esa web local (TEMPORAL, nunca comiteado):**
  - `apps/ios/capacitor.config.ts`: `server.url` de `https://somosnosotros.org` a `http://127.0.0.1:3100`, con
    `cleartext: true` y `127.0.0.1` añadido a `allowNavigation`.
  - `apps/ios/ios/App/App/Info.plist`: `NSAppTransportSecurity` → `NSAllowsArbitraryLoads` (si no, iOS bloquea
    la carga por http a un host que no sea `somosnosotros.org`).
  - `npx cap sync ios` para que el proyecto nativo recogiera el cambio; `xcodebuild` (herramienta `build` del
    simulador) contra el `App.xcodeproj` real, sin Pods (usa Swift Package Manager, `CapApp-SPM`).
  - Una insignia visible **temporal**, `src/components/DebugCargasOL212.tsx`, montada una sola vez en
    `src/app/layout.tsx`: sube un contador en `sessionStorage` al montarse. Un `router.refresh()` o una
    navegación blanda de Next NO remonta el layout raíz (React reconcilia el árbol), así que el contador solo
    sube si el **documento** se recarga de verdad — la misma idea que `window.__marca` de la sección 1, pero
    visible en una captura de pantalla del simulador, sin necesitar Safari Web Inspector.
  - Todo esto se revirtió por completo antes de cerrar (`git checkout -- apps/ios/capacitor.config.ts
    apps/ios/ios/App/App/Info.plist src/app/layout.tsx`, se borró `DebugCargasOL212.tsx` y `.env.local`);
    `git status`/`git diff` limpios, confirmado en la sección 10.
- **Sesión real dentro de la app:** `xcrun simctl install`/`launch`, y con `mcp__computer-use` (acceso
  concedido a Simulator.app, control en segundo plano sin robarle la pantalla al founder) se tocó "Entrar", se
  escribió `prueba@example.com` y el código de 8 dígitos por el teclado en pantalla (el mismo que usaría un
  dedo), tal como pide el encargo — nunca inyectando la sesión.
- **Detectar la recarga:** dos maneras a la vez, más fuertes que solo mirar la insignia:
  1. La insignia `OL212 cargas:N` en cada captura (`xcrun simctl io <id> screenshot`).
  2. `xcrun simctl spawn <id> log stream --predicate 'process == "App"'` en segundo plano, filtrado a las
     líneas de WebKit que distinguen una navegación de documento de verdad (`didCommitLoadForFrame`,
     `decidePolicyForNavigationAction`, `loadRequestWithNavigationShared`) de una del propio JS sin recargar
     nada (`didSameDocumentNavigationForFrameViaJS`, lo que hace el router de Next al cambiar de pantalla o al
     releer datos con `revalidatePath`). Esta es la prueba más dura: no depende de que la insignia se haya
     pintado a tiempo, lee directo el motor de WebKit.

### 9. Lo que se tocó y lo que se vio

Con sesión de verdad dentro de la app (`prueba@example.com`, código `12345678` fijo del respaldo), navegando
por la propia UI (Lugares → «Lugar de prueba» → su evento; nunca por deep link, que no aplica aquí) — capturas
390×844 reales del simulador en `docs/rediseno/capturas-241/241-{7,8}-*.png` (inicio sin sesión y, tras un
relanzamiento deliberado de la app para repetir la prueba con la cuenta en limpio, inicio con la sesión
repuesta sola: Capacitor conserva la cookie entre relanzamientos).

**Seguir (Lugar de prueba), primera vez, las cuatro salidas de su hoja de avisos, una tras otra:**
1. Tocar «Seguir» → guarda, «1 persona lo sigue», se abre «¿Te avisamos de sus eventos?».
2. «En el teléfono» → dentro del WKWebView de la app (no es un Safari instalado a mano) `disponibilidadPush`
   da "instalar-primero": sale la hoja «Instala Somos Nosotros» con los pasos, **sin pedir permiso de
   verdad** (el WKWebView de una app nativa no ofrece `Notification`/permiso del sistema como sí lo hace un
   Safari o una PWA instalada — una de las hipótesis del encargo, comprobada: no hay tal permiso que pedir
   aquí, así que no puede ser la causa de una recarga en este camino).
3. Cerrar esa hoja con la X → queda «Falta un paso», pregunta «Mientras, ¿por correo?».
4. «No» → sigue «Falta un paso» (no se autocierra: `telefono === "pendiente"`, por diseño).
5. Cerrar la hoja final con la X → la barra pasa sola a «Sigues · Sin avisos; se cambia en Ajustes» (el
   arreglo de la primera vuelta funcionando dentro de la app de verdad, sin pedirle nada al servidor).

**Voy (Evento de prueba), primera vez:** tocar «Voy» → guarda, «Va 1 persona», «✓ Voy · Ya estás en la lista».
No volvió a salir la hoja de avisos (ya se había contestado en la cuenta durante el paso de Seguir, en la
misma pestaña — el mismo comportamiento «una sola pregunta por sesión» ya visto y correcto en la sección 1;
no hizo falta forzar una cuenta nueva para confirmarlo).

**En ninguno de los dos guardados, ni en ninguna de las cuatro salidas de la hoja de avisos, la insignia
`cargas` subió de 1**, y el registro de WebKit (sección siguiente) confirma que en ningún momento de ese tramo
hubo `didCommitLoadForFrame` ni `decidePolicyForNavigationAction`: **no hubo una recarga de documento dentro
de la app, en ninguno de los caminos pedidos por el encargo.**

### 10. El registro de WebKit, la prueba más dura

`docs/rediseno/capturas-241/241-9-log-webkit-navegaciones.txt` (extracto anotado; el registro completo, 1415
líneas, quedó en el scratchpad de la sesión). De 22:17:05 a 22:18:30 — el guardado de Seguir, sus cuatro
salidas de hoja, y el guardado de Voy — cada toque aparece como `didSameDocumentNavigationForFrameViaJS`
(navegación de "mismo documento", hecha por el propio JS de Next: cambiar de pantalla o releer datos tras
`revalidatePath`, sin tocar el documento). **`didCommitLoadForFrame` y `decidePolicyForNavigationAction`
—las líneas que sí significan "WebKit cargó un documento nuevo"— no aparecen ni una vez en ese tramo.**
Aparecen una sola vez en todo el registro, a las 22:18:53, con un PID de proceso web nuevo: exactamente
cuando se relanzó la app a propósito (`simctl terminate` + `simctl launch`, sección 9) para repetir la prueba
con la cuenta en limpio — no un toque de Voy o Seguir. Esa es la única recarga de documento de toda la sesión,
y fue deliberada.

Un tropiezo sin consecuencia: a media reproducción el Mac se bloqueó solo (founder ausente) y
`mcp__computer-use` dejó de poder tocar la pantalla (`app_screenshot` seguía funcionando: es la política de
Accessibility de macOS bajo bloqueo, no algo de esta pieza). Se esperó, se recreó un segundo simulador
(`OL212-repro2`) para repetir la prueba de Voy con una cuenta fresca desde cero, pero el founder volvió a usar
su Mac durante esa segunda vuelta (los toques en segundo plano se rechazaron solos, "user interrupt": la
propia herramienta corta si detecta uso real del Mac) — se dejó ahí, sin insistir, porque la primera vuelta ya
había cubierto Voy y las cuatro salidas de la hoja de Seguir con evidencia completa (capturas + registro de
WebKit). No hizo falta repetir Voy con cuenta fresca: ya se había confirmado en la sección 1 (Chrome real) y
en el 9 (dentro de la app) que la pregunta de avisos es "una por sesión", no por tipo de objeto — así que
probarla de nuevo en Voy no iba a decir algo distinto de lo que ya dijo en Seguir con el mismo mecanismo.

### 11. Sospechosos del encargo, comprobados uno por uno

- **`MainViewController.swift` (`NWPathMonitor` recarga `config.appStartServerURL` al recuperar la red):**
  sigue sin poder confirmarse ni descartarse del todo (no se provocó una caída de red real durante la prueba),
  pero el registro de WebKit ya dice que **no fue lo que pasó en esta reproducción**: si hubiera disparado,
  habría un `didCommitLoadForFrame` en el tramo de 22:17 a 22:18, y no lo hay. Sigue como pista sin confirmar,
  ahora con menos peso.
- **`GestoAtrasPlugin`/`EntrarSistemaPlugin` (`shouldOverrideLoad`):** leídos de nuevo completos (sección 4 de
  la primera vuelta). Solo interceptan navegaciones de tipo `.backForward` (el gesto de deslizar o
  `goBack()`/`goForward()`) y las idas a `/auth/apple`/`/auth/google`. Ninguna de las dos categorías ocurre al
  tocar Voy o Seguir (son llamadas `fetch` de una acción de servidor, no navegaciones), y el registro de
  WebKit no muestra ningún `.backForward` en ese tramo. Descartados para este bug.
- **La hoja de avisos pidiendo `Notification` inexistente en WKWebView:** comprobado en el paso 2 de la
  sección 9 — "En el teléfono" no truena ni cuelga nada: `disponibilidadPush` reconoce que hace falta instalar
  primero y muestra la hoja de instalación, con la misma UI que un iPhone en Safari sin instalar. No hay
  ningún permiso de `Notification` que la app intente pedir y que WKWebView no tenga: el código ya lo prevé.
  Descartado.
- **`avisoInstalar.ts` (`beforeinstallprompt`):** ese evento es de Chrome/Android; WKWebView no lo dispara
  nunca, así que este guion no hace nada dentro de la app (ni bien ni mal). Descartado.

### 12. Informe final de la segunda vuelta

- **Se reprodujo de verdad dentro de la app de iPhone** (simulador propio, `next build`/`next start` local +
  respaldo local, sesión real por el formulario de Entrar, nunca inyectada): el guardado de «Seguir» con sus
  cuatro salidas de hoja de avisos, y el guardado de «Voy» — sección 9.
- **No hubo recarga del documento en ninguno de esos caminos**, ni por la insignia (`cargas` se quedó en 1)
  ni, más importante, por el registro de WebKit (`didCommitLoadForFrame`/`decidePolicyForNavigationAction`
  ausentes en todo ese tramo; solo aparecen, con un proceso nuevo, en el relanzamiento deliberado de la app) —
  secciones 9 y 10.
- **Sospechosos del encargo, uno por uno:** `GestoAtrasPlugin`/`EntrarSistemaPlugin` y el permiso de avisos en
  WKWebView, descartados con evidencia; `MainViewController.swift`/`NWPathMonitor` sigue sin confirmarse ni
  descartarse del todo (no se cayó la red durante la prueba) — sección 11.
- **No se tocó `apps/ios`:** todos los cambios para esta reproducción (URL del servidor, ATS, la insignia)
  fueron temporales y locales, revertidos antes de cerrar — `git status`/`git diff` limpios, sección 8.
- **Se dice con honestidad, tal como pidió el encargo:** con la evidencia de esta pieza, la recarga que ve el
  founder en TestFlight no se pudo reproducir — ni en Chrome real (primera vuelta) ni dentro de la app en el
  simulador (esta vuelta) — con los caminos previstos por el encargo. Queda una única pista sin cerrar
  (`NWPathMonitor`), que necesitaría probarse con una caída de red real en el propio TestFlight del founder
  para confirmarse o descartarse del todo.
- **Sin cambios de código en esta vuelta** (nada que arreglar: no se encontró una causa nueva que arreglar,
  distinta de la ya arreglada en el PR #247). Suite completa (`npm run lint && npm run typecheck && npm test
  && npm run build`) corrida de nuevo tras revertir los archivos temporales, en verde.
- **Capturas:** `docs/rediseno/capturas-241/241-{7,8}-*.png` (inicio de la app, sin sesión y con sesión tras
  relanzar) y `241-9-log-webkit-navegaciones.txt` (el registro de WebKit anotado, sección 10).
- **PR:** número que sigue en el resumen de cierre / `gh pr create` (se añade aquí y en OPEN_LOOPS al
  terminar). Contra `main` (que ya trae el PR #247 unido), sin unir, a la espera del founder.

## Tercera vuelta (2026-09-26) — el «+» de los carriles y de los listados, no el de las fichas

**Rama:** `inicio-sin-recarga`, desde `origin/main` (`4399cd4`). **Operador:** nuevo (Sonnet), sin subagentes,
council ni workflows.

### 13. Pista nueva del founder

TestFlight 1.0 (3): «volvió recarga en primer seguir, estaba en inicio». Antes: «Se recarga la primera vez que
voy a un evento… igual al pasar a lugares, puse seguir "+" y se recargó». Las dos vueltas anteriores probaron
`Seguir.tsx` y `Asistencia.tsx` — el botón de las **fichas** — sin poder reproducir nada. El encargo de esta
vuelta señala que el «+» de los carriles de Inicio y de los listados usa otro código:
`src/components/useSeguirEnLista.tsx` y `src/components/useAsistenciaEnLista.tsx`, y trae una hipótesis concreta
del gestor para comprobar, no para asumir: que las acciones de servidor que se llaman tras guardar (`elegirAvisos`,
`guardarSuscripcionPush`, `cambiarAsistencia`) revalidan `"/"` con `revalidatePath`, y que eso repinta Inicio
mientras se está viendo Inicio.

### 14. Qué dicen el código y la documentación de Next 16.3.5 (la versión instalada)

Antes de tocar nada, se leyeron los cinco archivos de acción implicados y la documentación que trae el propio
paquete instalado (`node_modules/next/dist/docs`, nunca la de internet, para no citar una versión que no es la
que corre aquí):

- `src/app/eventos/acciones.ts:181-193` (`cambiarAsistencia`, "Voy"): revalidaba `/eventos/{id}`, **`/`**,
  `/perfil` y `/personas/{id}` **en cada toque**, no solo el primero.
- `src/app/lugares/acciones.ts:134-144` (`cambiarSeguimiento`, "Seguir" en lugares) y
  `src/app/artistas/acciones.ts:99-109` (`cambiarSeguimientoArtista`): revalidaban su propia ficha, `/perfil` y
  `/personas/{id}` — **nunca `/`**.
- `src/app/avisos/acciones.ts:12-36` (`elegirAvisos`) y `src/app/perfil/acciones.ts:119-140,143-164`
  (`guardarSuscripcionPush`, sus dos ramas web/APNs): revalidaban `/perfil` **y `/`**, y solo se llaman al
  contestar la hoja «¿Te avisamos…?» que sale tras el **primer** Seguir o Voy guardado de la sesión de pantalla
  (`hayQuePreguntar`/`tomarPregunta`) — de ahí el "la primera vez" del founder para Seguir.

La pieza que faltaba, y que ninguna vuelta anterior necesitó mirar porque probaban desde una ficha (donde la ruta
afectada por `revalidatePath` es la propia ficha, no la que se está viendo desde otro lado): la documentación de
Next 16.3.5 dice, sin condición de que la ruta coincida con la que se revalida,

> "A single response carries data and UI. […] A re-render is included in the same response when the action does
> any of these: Calls `updateTag` or `revalidatePath` to immediately invalidate cached data. […] An action that
> does none of the above carries only its return value, and the current route is not re-rendered."
> — `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, línea 36-74 (instalado con `next@16.3.5`)

Es decir: **cualquier** `revalidatePath` dentro de una acción de servidor hace que Next rehaga y reenvíe, en la
misma respuesta, toda la ruta **desde la que se llamó** la acción — sin importar qué ruta se le haya pasado a
`revalidatePath`. Esto se confirmó también por captura de red real (sección 15): al tocar «Seguir» en la lista de
`/lugares` (control, sección 15.3), cuya acción no revalida `/lugares` en ningún caso, la respuesta de "No,
gracias" trajo de todos modos una `/lugares` entera repintada (32 561 bytes). En Inicio (`src/app/page.tsx`,
`src/components/Inicio.tsx:74-84`) la ruta actual son sus **seis** `<Suspense>` con streaming propio (un carril
por consulta, a propósito, para no esperar la más lenta) — repetirlos enteros por un "Voy" o un "Seguir" es
exactamente el trabajo de más que describe el encargo, y coincide con lo que la primera vuelta ya había
encontrado y arreglado para `Seguir.tsx` con `router.refresh()` — aquí no hay una llamada de más que quitar, es
el propio mecanismo de `revalidatePath` el que hace ese trabajo, sin que nadie lo pida explícitamente.

### 15. Reproducción

**Entorno:** el mismo patrón documentado en la memoria del proyecto (usuarios desechables, respaldo local, nunca
tocar `.env`/producción). Concretamente, en esta vuelta:

- **Respaldo local 100 % inventado**, un servidor Node sin dependencias en el scratchpad de la sesión (nunca en
  el repo): imita `/auth/v1/user`, `/auth/v1/token` (refresco, siempre 200, lección de OL-088) y PostgREST para
  `perfiles`, `lugares`, `artistas`, `eventos` (tres formas del `select`, una por consultor:
  `cargarAgenda`/`cargarEventosSemana`/la lista simple de `/lugares`), `eventos_artistas`, `seguimientos`,
  `asistencias` y la RPC `van_por_evento` (siempre devuelve 5, para que "Eventos populares" tenga con qué
  probarse sin depender de asistencias reales). Un lugar, un artista, un evento, todos de prueba. Un endpoint
  propio `/__lento?ms=N` para simular la latencia real de Supabase en producción **solo en las lecturas**, apagado
  salvo en el instante que se mide (sin él, el repintado de más es tan rápido en este entorno que nunca se vería
  ni con red real de por medio — lección para la próxima vez que alguien busque esto en local).
- **Sesión inventada** por cookie (`sb-127-auth-token`, JWT `HS256` sin firma válida, mismo patrón de la memoria
  del proyecto: `getClaims` con `HS256` llama a `/auth/v1/user`, que el respaldo contesta), nunca por login real:
  esto es Chrome, no un WKWebView, así que inyectar la cookie es válido (a diferencia de la segunda vuelta,
  dentro de la app).
- `next build && next start -p 3100` contra el respaldo (`.env.local` en este árbol, nunca comiteado — confirmado
  con `git status`/`git diff` al terminar). Chrome real de la Mac vía `playwright-core`
  (`npm install --no-save` en el scratchpad), 390×844.
- **Qué se midió** en cada camino: (1) `window.__marca` puesto justo antes de tocar y leído después (una recarga
  de documento lo borra); (2) los `load` del documento (Playwright `page.on("load")`); (3) la respuesta exacta de
  la petición `POST` que dispara la acción de servidor (con qué bytes y `content-type` vuelve: `text/x-component`
  chico = solo el valor de regreso, grande = una página entera repintada); (4) cuántas veces
  `section[class*="CarrilEsqueleto-module"]` (el esqueleto **real** de cada carril — no cualquier
  `[aria-hidden="true"]`: `Destacados` vacío también lo usa y da falsos positivos, tropiezo corregido a media
  prueba) aparece de más, muestreado cada 50 ms tras el toque; (5) `window.scrollY` antes y después, con el
  viewport encogido a propósito (390×420) para que hubiera scroll real que perder.

**Casos probados**, cada uno con una cuenta fresca (el respaldo no persiste entre cargas, así que
`avisos_preguntado` siempre da `false`: la hoja de avisos sale en cada prueba, como "la primera vez" real):

**15.1 — Primer «Voy» en el carril «Eventos populares» de Inicio** (`casoA`, capturas
`3-a1-inicio-antes-de-voy.png` / `3-a2-inicio-tras-voy.png`): con 700 ms de latencia fijada en el respaldo justo
antes del toque, la respuesta de la acción trajo **23 808 bytes** de `/` repintada entera (antes del arreglo,
sección 16) — pero en ningún cuadro muestreado (2 s, cada 50 ms) reapareció el esqueleto de ningún carril, ni
cambió el scroll (0 antes y después: no había nada que perder en este viewport), ni hubo un `load` de documento.
Es decir: **la reconstrucción sí sucede en el servidor** (los seis carriles se vuelven a pedir y a renderizar
desde cero — confirmado por el tamaño de la respuesta), **pero React no la pinta como una recarga en Chrome**:
el mecanismo de transición de React (`useTransition`, que ya usan estos dos hooks) mantiene el árbol viejo
interactivo hasta que el nuevo está listo del todo, y entonces lo sustituye de un golpe, sin pasar por el
esqueleto. Comprobado de forma más dura en un diagnóstico aparte (`diag2.mjs`, scratchpad): se marcó el nodo del
DOM del botón «Voy» con una propiedad JS propia antes del toque, y **sobrevivió intacta** tras el repintado
forzado (`mismoNodoBoton: true`) — React reutilizó el mismo nodo, no lo destruyó y creó uno nuevo.

**15.2 — Primer «Seguir» en el carril «Lugares con eventos esta semana» de Inicio, hoja de avisos, «No, gracias»**
(`casoB`, capturas `3-b1` a `3-b4`): el propio "Seguir" (`cambiarSeguimiento`) no toca `/`, así que no repintó
nada por sí solo — pero al contestar «No, gracias» en la hoja (`elegirAvisos`, que sí revalida `/`), la respuesta
trajo los mismos 23 808 bytes de Inicio entero. Mismo resultado que 15.1: sin esqueleto, sin cambio de scroll, sin
recarga de documento.

**15.3 — Control: primer «Seguir» en `/lugares` (no en Inicio)** (`casoC`, capturas `3-c1` a `3-c4`): aquí ni
`cambiarSeguimiento` ni `elegirAvisos` revalidan `/lugares` en ningún caso — y aun así, la respuesta de «No,
gracias» trajo **32 561 bytes** de `/lugares?vista=lista` entera repintada. Esta es la prueba de que el mecanismo
**no depende de que la ruta coincida** con la que se pasó a `revalidatePath`: basta con que la acción llame a
`revalidatePath` (con cualquier ruta) mientras se está viendo cualquier pantalla, para que ESA pantalla se
repinte entera.

**15.4 — Scroll real** (`casoD`, capturas `3-d1-inicio-scroll-160-antes-de-voy.png` /
`3-d2-inicio-scroll-tras-voy.png`, viewport 390×420 a propósito): con el scroll en 160 px (el encabezado
"Lugares con eventos esta semana" ya cortado arriba, prueba de que de verdad hay scroll), tocar «Voy» con 700 ms
de latencia deja el scroll exactamente en 160 px después — no salta a 0 ni a ningún otro valor.

**Honestidad, tal como pide el encargo:** con esta evidencia, **no se pudo ver** un "recarga" visible (esqueleto,
salto de scroll o parpadeo) en Chrome real, ni siquiera forzando 700 ms de latencia — coincide con lo que las dos
vueltas anteriores tampoco pudieron ver, aunque por otra causa (ellas no habían encontrado un repintado real que
mostrar; aquí sí lo hay, medido en bytes, pero React lo absorbe sin pintarlo). Queda como hipótesis razonable sin
confirmar que en el iPhone real del founder —con datos reales en los seis carriles (más pesados que los de esta
prueba), una red más lenta y variable que este respaldo local, y posiblemente un toque o scroll de la persona
justo mientras la respuesta tarda— ese mismo repintado sí llegue a notarse; no se inventa esa causa como
confirmada, se deja dicha como lo que es.

### 16. El arreglo: aplazar la revalidación con `after`, no quitarla

La UI de estos dos hooks ya es optimista (`elegidos`/`elegidas`, estado local que se pinta al toque y se
confirma o deshace al responder el servidor — `src/components/useSeguirEnLista.tsx:72-92`,
`useAsistenciaEnLista.tsx:73-93`): ninguna pantalla necesita el repintado inmediato para verse al día. Pero
quitar sin más el `revalidatePath` dejaría **Inicio y Perfil viejos** la próxima vez que se pidan dentro de los
60 s de `experimental.staleTimes.dynamic` de `next.config.ts` (el comentario del propio archivo lo dice: "al
cambiar de sección con la barra inferior la página vista hace menos de un minuto se reutiliza… publicar, Voy y
Seguir la invalidan") — comprobado que el riesgo es real: sin la invalidación, volver a Inicio por la barra
inferior antes de 60 s serviría la versión de antes del Voy/Seguir desde el caché de cliente, sin pedir nada al
servidor.

La alternativa de Next 16 que sí evita el repintado (`revalidateTag`/`updateTag` con perfil de fondo) no aplica
aquí: esta app no usa `'use cache'`/`cacheComponents` ni `fetch` con `next.tags` en ninguna de estas consultas
(son llamadas directas a Supabase, siempre dinámicas) — no hay nada que etiquetar. Lo que sí sirve, ya usado en
este mismo archivo (`src/app/eventos/acciones.ts`, `after(intentarDrenarAvisos)`) y documentado para exactamente
este uso:

> "`after` allows you to schedule work to be executed after a response … is finished."
> — `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`

Aplazar el `revalidatePath` con `after(() => { … })` hace que se ejecute **después** de que la respuesta ya
salió: nada que bundlear en esa respuesta (no repinta la pantalla desde la que se guardó), pero la marca de
caché sigue quedando puesta en el servidor en ese mismo instante, así que la **próxima** vez que se pida esa
ruta (blanda o dura) llega fresca igual que antes. Confirmado con red real (`diag3-frescura.mjs`, scratchpad):
tocar «Voy» en Inicio, cerrar la hoja, esperar 400 ms (lo que tarda el `after` diferido), ir a `/lugares` por la
barra y volver a Inicio por la barra (navegación blanda, dentro de los 60 s) — el respaldo recibió **15
peticiones nuevas** para esa vuelta (`/rest/v1/lugares`, dos formas de `/rest/v1/eventos`, `/rest/v1/perfiles`,
`/rest/v1/seguimientos`, `/rest/v1/asistencias`, `/rest/v1/novedades`, la RPC `tira_destacados`…): Next sí volvió
a pedir todo, no sirvió nada del caché de cliente. Inicio no se queda viejo.

**Por qué `diferir` es un parámetro y no un cambio incondicional:** `cambiarAsistencia`/`cambiarSeguimiento`/
`cambiarSeguimientoArtista` también las llama la propia ficha (`Asistencia.tsx`, `Seguir.tsx` — fuera de alcance
de esta pieza, ya probadas en la primera y segunda vuelta), y la ficha **sí** depende de su propia revalidación
inmediata: `src/app/lugares/[id]/page.tsx:89` y `src/app/artistas/[id]/page.tsx:151` pintan un "N personas lo
siguen" en vivo (`cuenta_seguidores`, en su propio `<Suspense>`) que hoy se actualiza en el mismo toque gracias a
ese `revalidatePath` de la propia ficha — aplazarlo también ahí dejaría ese contador viejo hasta la próxima
visita, una regresión real y visible que esta pieza no tiene por qué introducir. Por eso el tercer parámetro
`diferir` (por defecto `false`, el comportamiento de siempre) lo pasan en `true` **solo** los dos hooks de lista
(`useSeguirEnLista.tsx`, `useAsistenciaEnLista.tsx`); ninguna llamada de ficha se tocó. `elegirAvisos` y
`guardarSuscripcionPush` sí aplazan siempre, sin parámetro: ninguno de sus tres llamadores (`ConsentimientoAvisos`
con su `onDecidido`, `AvisosPerfil` con su propio `router.refresh()`, `ActivarAvisos` con su estado local) necesita
su revalidación inmediata — confirmado leyendo los tres antes de tocar nada.

**Archivos y líneas:**
- `src/app/eventos/acciones.ts` — `cambiarAsistencia(eventoId, estado, diferir = false)`.
- `src/app/lugares/acciones.ts` — `cambiarSeguimiento(lugarId, seguir, diferir = false)`.
- `src/app/artistas/acciones.ts` — `cambiarSeguimientoArtista(artistaId, seguir, diferir = false)`.
- `src/app/avisos/acciones.ts` — `elegirAvisos`: revalidación siempre aplazada.
- `src/app/perfil/acciones.ts` — `guardarSuscripcionPushWeb`/`guardarTokenApns` (las dos ramas de
  `guardarSuscripcionPush`): revalidación siempre aplazada.
- `src/components/useSeguirEnLista.tsx` / `src/components/useAsistenciaEnLista.tsx`: pasan `diferir: true`.
- **Sin tocar:** `src/components/Inicio.tsx`, `src/components/inicio/**`, `src/lib/inicio.ts` (OL-219 en curso),
  `ui/ChipFecha`, `ui/SelectorFecha`, el formulario de eventos (OL-218), `Seguir.tsx`, `Asistencia.tsx`,
  `ConsentimientoAvisos.tsx` (no necesitó cambios: ya avisaba lo decidido sin pedir nada al servidor desde la
  primera vuelta) ni `apps/**`.

**Resultado medido, antes/después del arreglo** (misma reproducción, sección 15, red real):

| Camino | Antes | Después |
| --- | --- | --- |
| Voy en Inicio (15.1) | `/` repintada, 23 808 bytes | solo el valor de regreso, 73 bytes |
| Seguir en Inicio + "No, gracias" (15.2) | `/` repintada, 23 808 bytes | 73 bytes |
| Seguir en `/lugares` + "No, gracias" (15.3, control) | `/lugares` repintada, 32 561 bytes | 85 bytes |
| Scroll a 160px + Voy (15.4) | `/` repintada, 23 808 bytes | 73 bytes |

### 17. Pruebas

Cinco archivos de prueba (Vitest, `npm test`), cada uno llama a la acción de verdad (no una copia) con
`sesionOEntrar`/`clienteServidor` y `next/cache`/`next/server` mockeados:

- `src/app/eventos/acciones.asistencia.test.ts` (nuevo) — `cambiarAsistencia`.
- `src/app/lugares/acciones.seguir.test.ts` (nuevo) — `cambiarSeguimiento`.
- `src/app/artistas/acciones.seguir.test.ts` (nuevo) — `cambiarSeguimientoArtista`.
- `src/app/avisos/acciones.test.ts` (nuevo) — `elegirAvisos`.
- `src/app/perfil/acciones.test.ts` (ampliado, dos casos nuevos) — `guardarSuscripcionPush` (web y APNs).

Cada uno comprueba, por lo menos: (a) sin `diferir` (o `elegirAvisos`/`guardarSuscripcionPush`, siempre) —
`revalidatePath` **no** se llama todavía justo después de guardar, y `after` se llamó una vez con una función;
(b) al invocar esa función a mano (como si la respuesta ya hubiera salido), `revalidatePath` se llama con las
rutas correctas; (c) para las tres acciones con `diferir`, que **sin** él (el valor por defecto, el camino de la
ficha) la revalidación sigue siendo inmediata, sin `after`, exactamente como antes de esta pieza.

**Falla antes, pasa después — comprobado de verdad, no solo argumentado:** se guardó el `diff` de los cinco
archivos de acción como parche, se revirtieron esos cinco archivos a `origin/main` con `git checkout --`
(dejando las pruebas nuevas/ampliadas intactas) y se corrieron esas pruebas: **7 de ellas fallaron** (las que
comprueban que `revalidatePath` no se llama de inmediato y que se llamó a `after`), las demás — incluidas las que
comprueban el camino de la ficha, que no cambia — siguieron en verde. Se reaplicó el parche
(`git apply`) y se corrió la suite completa de nuevo: **113 archivos, 1 403 pruebas, todas en verde**. Ningún
`git stash` de por medio (carpeta compartida entre chats): el parche vivió en el scratchpad de la sesión.

**Suite completa**, con el arreglo aplicado: `npm run lint` (mismo aviso preexistente de
`docs/diseno/logotipo/iconos-sn.mjs`, sin relación, ya visto en la primera vuelta) `&& npm run typecheck && npm
test && npm run build`, todo en verde.

### 18. Capturas (`docs/rediseno/capturas-241/`, prefijo `3-`), con el arreglo ya aplicado

Todas contra el mismo respaldo local y `next build && next start` de la sección 15, 390×844 reales (`file` lo
confirma) salvo las dos de scroll (390×420 a propósito, sección 15.4):

- **`3-a1-inicio-antes-de-voy.png`** / **`3-a2-inicio-tras-voy.png`:** Inicio antes y después del primer «Voy» en
  «Evento de Prueba» (carril «Eventos populares»). El botón pasa a ✓ verde, «5 van» sigue igual, la hoja «¿Te
  recordamos ese día?» se abre debajo — el resto de la pantalla, idéntico.
- **`3-b1-inicio-antes-de-seguir.png`** a **`3-b4-inicio-tras-no-gracias.png`:** Inicio antes del primer
  «Seguir» en «Lugar de Prueba» (carril «Lugares con eventos esta semana»), justo después (botón ya en ✓, hoja
  aún no pintada), con la hoja «¿Te avisamos de sus eventos?» abierta, y tras «No, gracias» — la barra inferior
  «Sigues Lugar de Prueba · Deshacer» aparece, todo lo demás en su lugar.
- **`3-c1-lugares-antes-de-seguir.png`** a **`3-c4-lugares-tras-no-gracias.png`:** lo mismo, pero en `/lugares`
  (control, sección 15.3), para comprobar que el arreglo también evita el repintado ahí aunque `cambiarSeguimiento`
  nunca haya revalidado esa ruta.
- **`3-d1-inicio-scroll-160-antes-de-voy.png`** / **`3-d2-inicio-scroll-tras-voy.png`:** Inicio con scroll real
  (160 px, encabezado "Lugares con eventos esta semana" cortado arriba en ambas) antes y después de «Voy» —
  mismo encuadre exacto, el scroll no salta.

Al terminar: se detuvieron `next start` y el respaldo, se borró `.env.local` (nunca comiteado, confirmado con
`git status`/`git diff`).

### 19. Informe final de la tercera vuelta

- **Confirmado con evidencia (código + documentación de Next 16.3.5 instalada + red real):** cualquier
  `revalidatePath` dentro de una acción de servidor —sin importar qué ruta se le pase— hace que Next rehaga y
  reenvíe entera, en la misma respuesta, la pantalla **desde la que se llamó** la acción. `cambiarAsistencia`
  revalidaba `/` en cada «Voy»; `elegirAvisos`/`guardarSuscripcionPush` revalidan `/perfil` y `/` al contestar la
  hoja de avisos que sale tras el primer Seguir/Voy guardado — de ahí el "la primera vez" de Seguir. Medido con
  bytes reales: la respuesta de la acción pasaba de traer solo su valor de regreso a traer Inicio (23 808 bytes)
  o `/lugares` (32 561 bytes) enteros repintados — sección 15, tabla de la sección 16.
- **No se pudo ver una "recarga" visible** (esqueleto, salto de scroll, parpadeo) en Chrome real, ni forzando 700
  ms de latencia: React (`useTransition`, ya usado por estos hooks) absorbe el repintado sin pasar por el
  esqueleto ni destruir el nodo del botón — sección 15, dicho con la misma honestidad que pide el encargo, sin
  inventar que sí se vio. Queda sin confirmar si en el iPhone real, con datos reales y red real, ese mismo
  repintado sí llega a notarse.
- **Arreglo:** las cinco acciones aplazan su `revalidatePath` con `after()` cuando se llaman desde una lista
  (`diferir: true` en `useSeguirEnLista.tsx`/`useAsistenciaEnLista.tsx`; siempre en `elegirAvisos`/
  `guardarSuscripcionPush`) — sin repintar la pantalla desde la que se guarda, y sin perder frescura: comprobado
  que Inicio sigue pidiéndose de nuevo al volver por la barra inferior dentro de los 60 s de
  `experimental.staleTimes`. La ficha (`Seguir.tsx`/`Asistencia.tsx`, sin tocar) conserva su revalidación
  inmediata — su propio contador «N personas lo siguen» sigue en vivo — sección 16.
- **Pruebas:** 5 archivos nuevos/ampliados (sección 17); falla antes (7 casos, comprobado revirtiendo el parche
  de verdad) y pasa después (113 archivos, 1 403 pruebas). Suite completa en verde.
- **Capturas:** `docs/rediseno/capturas-241/3-{a,b,c,d}*.png` (sección 18).
- **PR:** [número pendiente, se añade tras `gh pr create`], contra `main`. Sin unir; a la espera del founder.
