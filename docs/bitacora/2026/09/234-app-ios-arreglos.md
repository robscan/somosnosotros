# 234 · App de iPhone: cuatro arreglos sin cambiar el aspecto (OL-205)

**Fecha:** 2026-09-25 · **Rama:** `app-ios-arreglos`, desde `origin/main`.

## Pedido

OPEN_LOOPS, OL-205: de la auditoría de OL-202 (`docs/rediseno/48-shell-ios.md`), cuatro cosas que hacen ver la
app rota, sin tocar el aspecto (el founder ya decidió que las barras nativas esperan al rediseño):

1. Hueco doble de zona segura arriba en «Entrar» y en las altas/ediciones.
2. Con el teclado abierto, la cabecera se encima con la hora/isla dinámica.
3. Deslizar desde el borde izquierdo para volver no hace nada.
4. Mantener pulsado un texto saca el menú «Copy · Look Up · Translate».

Más `ITSAppUsesNonExemptEncryption = NO` en `Info.plist`.

## 1 · Hueco doble de zona segura

**Causa (confirmada leyendo el código, como decía el doc 48 §2):** `globals.css` `.pagina` pone
`padding-top: calc(var(--espacio-5) + env(safe-area-inset-top))` y, dentro, `ui/Barra.module.css` `.interior`
(la barra pegajosa de «Entrar» y las 8 altas/ediciones) pone otra vez `padding-top: env(safe-area-inset-top)`
para cuando queda pegada al tope físico. Las dos sumadas dejan un hueco mayor que en una ficha, que nunca
duplica el colchón (`ui/Ficha.module.css` `.pagina` no pone nada arriba).

**Arreglo:** `globals.css`, un selector `:has()` (ya usado en el repo: `Renglon.module.css`,
`Chip.module.css`) que quita el `padding-top` de `.pagina` solo cuando trae una barra interior como primer
hijo — exactamente el patrón de las 9 pantallas (`Barra` con `volver` o `cerrar`, que renderiza `<header>`);
las pantallas sin barra (`error`, `404`) conservan su único colchón.

```css
.pagina:has(> header:first-child) {
  padding-top: 0;
}
```

Verificado que ninguna pantalla `.pagina` usa la variante `raiz` de `Barra` (esa va con la clase `.raiz`, no
`.pagina`), así que el selector no toca nada más.

## 2 · Cabecera encimada con el teclado

**Causa:** sin el plugin `@capacitor/keyboard`, iOS usa su comportamiento de fábrica (`resize: "native"`):
cuando el campo enfocado no cabe, `WKWebView` desplaza toda la página para revelarlo. Ese desplazamiento saca a
la barra pegajosa (`position: sticky; top: 0`) de la zona segura que el propio WKWebView le había calculado —
consistente con lo que documentó el doc 48.

**Arreglo:** se agregó `@capacitor/keyboard` (única dependencia nueva, ver «Sobre la dependencia nueva» abajo)
y `plugins.Keyboard.resize: "body"` en `capacitor.config.ts`. Con `"body"` solo se encoge el alto del `<body>`
— el viewport y `env(safe-area-inset-top)` no cambian (documentación del plugin: *"Relative units are not
affected, because the viewport does not change"*) — y es el propio `<body>` el que hace scroll interno para
revelar el campo; la barra sigue pegada al tope de un viewport que nunca se movió. No se probó `"none"`
(obligaría a la web a reimplementar a mano el desplazamiento que `ui/Hoja.tsx` ya hace bien) ni dejar
`"native"` con un parche aparte (es justo el modo que causa el problema). El razonamiento completo está en el
comentario de `capacitor.config.ts`.

**Límite de esta verificación (dicho con claridad):** el campo de «Entrar» está lo bastante arriba en la
pantalla — en el iPhone 17 Pro y en el SE — que nunca necesita scroll para quedar visible sobre el teclado, ni
con `resize: "native"` ni con `"body"`: las capturas 03 y 04 del "antes" y "después" salen prácticamente
iguales, sin el encimado que describía el doc 48 (ese se vio en la auditoría con `formularios de alta/edición`,
que piden sesión — sin credenciales de Supabase en este árbol de trabajo no hay forma de llegar a ellos, y no
existe otra pantalla pública `.pagina` con un campo más abajo para forzar el scroll). El arreglo se sostiene en
que `"body"` es la recomendación documentada de Capacitor/Ionic exactamente para esta familia de errores
(barra o contenido pegado al tope que un desplazamiento de teclado saca de su zona segura) y en que no toca
nada que ya funcionara — no en haber reproducido el "antes" roto con mis propias manos. Falta que alguien con
sesión (el founder o el gestor) confirme en una alta real que el logotipo no se encima con el teclado abierto.

## 3 · Gesto de deslizar para volver

**Causa:** `@capacitor/ios` trae `allowsBackForwardNavigationGestures` apagado por omisión.

**Por qué no basta con encenderlo a secas:** ese gesto dispara el `WKBackForwardList` nativo (un
`goBack()`/`goForward()` de toda la vida), que no conoce la marca propia del historial
(`src/lib/historial.ts`, "filtrar no es navegar", memoria de pantalla) — el doc 48 (§3.3) ya lo señalaba y
recomendaba la opción de interceptar el gesto y pedirle a la web que ejecute su propio `useVolver`.

**Arreglo (opción "interceptar", como recomendaba el doc 48):**

- `MainViewController.swift`: `webView?.allowsBackForwardNavigationGestures = true` (enciende el gesto) y
  registra un plugin nuevo.
- **`GestoAtrasPlugin.swift`** (nuevo, mismo patrón que `EntrarSistemaPlugin.swift`): usa el mismo enganche
  `shouldOverrideLoad` que Capacitor ya ofrece a sus plugins. Cuando la navegación es de tipo `.backForward`
  (el tipo que producen tanto `goBack()`/`goForward()` como el propio gesto, documentado por Apple), la cancela
  y avisa a la web con `notifyListeners("atras", …)`, sin dejar que el `WKBackForwardList` decida nada.
- **`src/lib/gestoAtras.ts`** (nuevo, puro, sin DOM): `crearRegistroVolver()` — quien esté visible en pantalla
  (Atrás o Cerrar) se registra al montarse; el aviso del gesto llama a esa misma función, nunca a un
  `history.back()` a secas.
- **`src/components/Navegacion.tsx`**: una instancia de ese registro, expone `registrarVolverVisible`, y
  escucha `window.Capacitor?.Plugins?.GestoAtras?.addListener("atras", …)` (en el navegador normal `Capacitor`
  no existe, así que esto no hace nada ahí).
- **`src/components/ui/Atras.tsx`**: `useVolver` ahora separa la lógica de "a dónde ir" (`irse`, con
  `useCallback`) de la del clic (que sigue filtrando Cmd/Ctrl/clic central); un `useEffect` la registra
  mientras el componente está montado. `Cerrar.tsx` usa el mismo `useVolver`, así que también queda cubierto.

**Verificado:** el registro de "quién puede volver" tiene 6 pruebas unitarias (`gestoAtras.test.ts`): nadie
registrado no dispara nada, el segundo registro reemplaza al primero, darse de baja solo quita el propio
registro (no el de quien lo reemplazó), y dos instancias no se pisan. Confirmé además, con un `NSLog` temporal
(quitado antes de este commit) y `log stream` del simulador, que `shouldOverrideLoad` del plugin nuevo sí se
ejecuta en cada navegación real (tocar «reglas de uso» imprimió `tipo=0`, es decir `.linkActivated`) — el
enganche está bien puesto y registrado.

**Lo que no pude probar en vivo:** un gesto de deslizar real, con el dedo, desde el borde físico. En este
entorno (automatización con `computer-use` sobre el Simulador, sin panel interactivo por permiso pendiente del
usuario) un arrastre sintético desde `x≈2` — con uno o varios puntos intermedios — nunca llegó a
`shouldOverrideLoad` (cero líneas de log), así que el reconocedor de gestos de borde de iOS no lo tomó como un
gesto de retroceso; tampoco until Cmd+Flecha (ese combo lo intercepta el propio Simulator.app para rotar el
dispositivo, no llega a la app). No es indicio de que el arreglo esté mal — es que ni un mouse-down/mouse-up ni
un arrastre por trackpad simulan de forma fiable el gesto de borde de iOS a través de esta cadena de
automatización; el propio doc 48 ya decía de su hallazgo original: *"Probado en vivo, sin captura (no hay nada
que fotografiar: no pasa nada)"*, con el founder probando con el dedo. Queda pendiente que alguien deslice de
verdad en un dispositivo o simulador con panel interactivo.

## 4 · Menú «Copy · Look Up · Translate» al mantener pulsado

**Detección de la app:** `src/lib/appNativa.ts` (nuevo) — `esAppNativa(userAgent)` mira el sello
`"SomosNosotrosApp"` que `capacitor.config.ts` ya añadía (`appendUserAgent`, hasta ahora sin usar). Un guion
(`GUION_APP_NATIVA`, mismo patrón que `avisoInstalar.ts`) pone la clase `app-nativa` en `<html>` con un
`<Script strategy="beforeInteractive">` en `layout.tsx` — corre antes de que React pinte nada, así que no hay
un primer toque donde el menú nativo alcance a destellar. Se usó el guion de cliente en vez de leer el
user-agent en el servidor (que ya hace `entrar/page.tsx` para otra cosa) para no volver dinámica de golpe toda
la app: `/reglas`, `/privacidad` y `/ajustes/editar` siguen saliendo `○ (Static)` en el build — comprobado
comparando la tabla de rutas antes y después de este cambio.

**CSS (`globals.css`):**

```css
.app-nativa * {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
}
.app-nativa input, .app-nativa textarea, .app-nativa select, .app-nativa [contenteditable="true"] {
  -webkit-touch-callout: default;
  -webkit-user-select: text;
}
.app-nativa a {
  -webkit-touch-callout: default;
  -webkit-user-select: text;
  -webkit-tap-highlight-color: transparent;
}
```

**Excepciones, con su criterio:** campos de formulario (tienen que poder seleccionarse) y enlaces (aparte de
que un enlace no debería perder su función). Sumé dos más, con el mismo criterio de "texto que alguien puede
querer copiar o citar" que pedía el encargo: la descripción de un evento, lugar o artista
(`Desplegable.module.css`, con `:global(.app-nativa) .texto`) y el cuerpo de Reglas de uso/Aviso de privacidad
(`legal.module.css`, mismo patrón) — son justo los dos sitios de texto largo y libre de la app; el resto
(títulos, etiquetas, botones) no pierde nada porque nunca fue pensado para copiarse. También se resuelve, de
paso, el hallazgo del doc 48 sobre el resaltado gris que faltaba en enlaces sueltos (`reglas de uso`, `aviso de
privacidad`): `-webkit-tap-highlight-color: transparent` en `.app-nativa a`.

**Verificado con evidencia real (no solo leyendo el CSS):** con la clase `.app-nativa` puesta, tocar el campo
vacío «Tu correo» de Entrar sigue sacando el menú nativo «Paste · AutoFill» (captura 05) — confirma que la
excepción de los campos de formulario funciona de verdad dentro de `.app-nativa`, no que el menú esté apagado
en general. **Lo que no logré capturar:** el menú «Copy · Look Up · Translate» sobre un texto normal (para
comparar "antes" con el menú y "después" sin él): ni una espera con el botón del mouse abajo (hasta 2
segundos, con y sin una micro-sacudida) ni un doble clic dispararon ese menú en ninguno de los dos estados
(incluso con la regla desactivada a propósito para comprobar que sí podía salir), así que no es un resultado
negativo del arreglo — es que este camino de automatización no reproduce el gesto de mantener pulsado de iOS
sobre texto no editable. Sí puedo afirmar, por
lectura del código y por las 4 pruebas de `appNativa.test.ts`, que la detección y el guion son correctos, y por
la captura 05 que la excepción de campos funciona en vivo dentro del estado `.app-nativa`.

## `ITSAppUsesNonExemptEncryption`

`Info.plist`: `<key>ITSAppUsesNonExemptEncryption</key><false/>` — la app solo usa HTTPS (ninguna criptografía
propia), así que App Store Connect no debe preguntar en cada envío.

## Sobre la dependencia nueva (`@capacitor/keyboard`)

Es imprescindible para el arreglo 2: no hay forma soportada de cambiar el modo de "resize" del teclado en
WKWebView sin este plugin (sin él, iOS usa siempre `"native"`, el modo que causa el problema). Se fijó en
versión exacta `8.0.5` (como los demás plugins del proyecto: `8.1.1`, `8.0.4`, `8.5.2`, sin `^`), la última de
la rama 8.x, publicada por `@capacitor` (mismo autor que el resto). `npx cap sync ios` regeneró
`CapApp-SPM/Package.swift` solo (managed by Capacitor CLI, como dice su propio comentario) para incluirlo — no
se tocó a mano.

## Dónde

- `src/app/globals.css` — arreglo 1 (`.pagina:has(...)`) y arreglo 4 (`.app-nativa`).
- `src/lib/appNativa.ts` + `.test.ts` (nuevos) — detección del user-agent y el guion.
- `src/app/layout.tsx` — `<Script id="app-nativa">`.
- `src/components/Desplegable.module.css`, `src/app/privacidad/legal.module.css` — excepciones de selección.
- `src/lib/gestoAtras.ts` + `.test.ts` (nuevos) — registro de "quién puede volver".
- `src/components/Navegacion.tsx` — instancia del registro y el listener del plugin.
- `src/components/ui/Atras.tsx` — `useVolver` registra `irse` mientras está montado.
- `apps/ios/capacitor.config.ts` — `plugins.Keyboard.resize: "body"`.
- `apps/ios/package.json`/`package-lock.json` — `@capacitor/keyboard@8.0.5`.
- `apps/ios/ios/App/App/MainViewController.swift` — enciende el gesto y registra el plugin nuevo.
- `apps/ios/ios/App/App/GestoAtrasPlugin.swift` (nuevo) — intercepta `.backForward`.
- `apps/ios/ios/App/App/Info.plist` — `ITSAppUsesNonExemptEncryption`.
- `apps/ios/ios/App/App.xcodeproj/project.pbxproj`, `apps/ios/ios/App/CapApp-SPM/Package.swift` — registran el
  archivo Swift nuevo y la dependencia SPM (managed by Capacitor CLI / Xcode).

## Evidencia

```
npm run lint && npm run typecheck && npm test && npm run build
```

Las cuatro en verde: lint 0 errores (1 warning preexistente sin relación,
`docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio; **1308 pruebas, 106 archivos**, todas en verde
(incluidas las 6 de `gestoAtras.test.ts` y las 4 de `appNativa.test.ts`); build completo — `/reglas`,
`/privacidad` y `/ajustes/editar` siguen estáticas.

Compilé la app dos veces con `xcodebuild -scheme App -destination "id=<UDID>" -configuration Debug
CODE_SIGNING_ALLOWED=NO build` (sin firmar, como documenta `apps/ios/README.md`) en dos simuladores propios
(`OL-205 iPhone 17 Pro`, `OL-205 iPhone SE`, iOS 26.3, creados con `xcrun simctl create` para no estorbar a
otro chat) y un tercero temporal (`OL-205 iPhone SE temp`, solo para la comparación del punto 2). Mientras
probaba mis cambios, `apps/ios/capacitor.config.ts` apuntó `server.url` a `http://localhost:3100` (mi propio
`next dev` en este árbol) — revertido a `https://somosnosotros.org` antes de este commit; comprobado con `git
diff` (no queda ninguna línea con `localhost`). Los tres simuladores y el `DerivedData` de la app se borraron
al terminar.

Capturas reales con `xcrun simctl io <UDID> screenshot` (nunca la pantalla de la Mac) en
[`docs/rediseno/capturas-234/`](../../../rediseno/capturas-234/):

- **`01-entrar-arriba-antes.png`:** «Entrar» sin teclado, con el arreglo 1 desactivado a propósito (el
  `.pagina:has(...)` comentado, restaurado enseguida): el hueco entre la hora y la barra «Atrás · SMSNSTRS» es
  claramente más grande que en una ficha.
- **`02-entrar-arriba-despues.png`:** la misma pantalla con el arreglo puesto: la barra queda pegada justo bajo
  la hora, con el mismo colchón que trae una ficha — sin el hueco de más.
- **`03-teclado-native-se.png`:** «Entrar» en el iPhone SE con `resize: "native"` (arreglo 2 desactivado a
  propósito) y el teclado abierto: la cabecera sigue intacta (ver la limitación explicada arriba: este campo no
  llega a necesitar scroll).
- **`04-teclado-body-se.png`:** la misma pantalla y dispositivo con `resize: "body"` puesto: igual de bien,
  sin regresión.
- **`05-campo-vacio-paste-autofill.png`:** con `.app-nativa` activo, el campo vacío «Tu correo» sigue sacando
  el menú nativo «Paste · AutoFill» — confirma en vivo que la excepción de los campos de formulario funciona.

## Lo que no se tocó

`src/app/artistas/FormularioArtista*` y `src/components/ui/ChipFecha*` (otras piezas en curso — llegaron sin
tocar por mí en el merge de `origin/main`, ver abajo). Ningún archivo de `apps/ios` fuera de los listados en
«Dónde». Sin migración. `package.json` de la raíz, intacto.

## Un `origin/main` que avanzó a medio camino

La sesión se cortó a medio trabajo y, para cuando retomé, ya se habían unido los PR #238, #239 y #240
(bloquear a una persona, fecha nativa al cerrar el selector, y «Qué hace» en dos pasos — OL-203, OL-204 y
OL-206). `git fetch origin && git merge origin/main` se aplicó limpio, sin conflictos (esos tres tocan
`src/app/artistas/FormularioArtista*`, `src/components/ui/ChipFecha*`, `ajustes/bloqueados`, etc., nada que
esta pieza tocara). Repetí `lint`, `typecheck`, `test` y `build` después del merge — las cuatro siguen en
verde (1308 pruebas, subieron de 1281 por las piezas nuevas).

## Cierre

`git status --short` en la rama, limpio salvo lo de esta pieza. Commit local en `app-ios-arreglos`; push y PR
[#241](https://github.com/robscan/somosnosotros/pull/241) contra `main`, sin unir (lo une el gestor).
