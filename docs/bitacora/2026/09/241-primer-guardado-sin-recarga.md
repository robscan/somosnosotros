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
