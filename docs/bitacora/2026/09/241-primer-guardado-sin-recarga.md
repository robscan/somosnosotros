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
- **PR:** se añade aquí y en OPEN_LOOPS al terminar.
