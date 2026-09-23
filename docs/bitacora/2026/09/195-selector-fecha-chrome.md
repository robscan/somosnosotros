# 195 · El selector de fecha y hora no aparece en la app instalada desde Chrome en la Mac (OL-160)

**Fecha:** 2026-09-23 · **Rama:** `selector-fecha-chrome`, desde `origin/main` · **OL:** OL-160 (bug del founder: «de pronto tengo problemas para abrir el selector de fecha y hora en la app instalada en escritorio desde Chrome en mi Mac. En iOS está todo ok. Selecciono y no aparece nada») · **Modelo:** Sonnet 5. Sin council, workflows ni subagentes.

## Resultado en una línea

**No logré reproducir el defecto ni encontrar una causa en el código.** Medí a fondo los tres sospechosos que trae la entrada OL-160 y los tres midieron bien, iguales en modo app y en pestaña normal. No apliqué ningún arreglo: no hay nada que el código esté haciendo mal que yo pueda medir. Lo dejo documentado con las mediciones para que el founder lo confirme (o no) en su Mac real, o para que otro chat retome con otra hipótesis.

## Qué leí

`CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-160 y la OL-157 en `docs/ops/OPEN_LOOPS.md`, `src/app/eventos/SelectorCuando.tsx` y su CSS, `src/components/ui/Chip.tsx`/`Chip.module.css` (`ChipNativo`, el `<input>` invisible encima del chip), `src/components/AgendaInicio.tsx` (el chip de fecha de la cabecera), `src/components/ui/Pestanas.tsx`/`.module.css` (`PanelPestana`), `src/app/template.tsx`/`template.module.css`, `src/components/ui/Hoja.tsx`, `src/components/ui/EntradaFicha.tsx` (el arreglo de OL-157, como patrón).

## Cómo reproduje (o lo intenté)

`npm install` (el worktree no traía `node_modules`), `next build && next start -p 3211` (build de producción, igual que pide la pieza). Sin variables de Supabase para el chip de Agenda (esa pantalla no pide sesión y con `clienteServidor()` devolviendo `null` pinta igual, agenda vacía). Para el alta de evento (pide sesión) monté un respaldo 100 % local sin red en el scratchpad (`ol160/respaldo.mjs`, Node puro): responde `/auth/v1/user`, `/auth/v1/token` y cualquier tabla de `/rest/v1/` con filas vacías salvo `perfiles` (una fila admin inventada), con `.env.local` apuntando a `http://127.0.0.1:8811` y una cookie `sb-127-auth-token` con un JWT sin firma válida (mismo patrón que la memoria del proyecto documenta para OL-088/076); `.env.local` se borró antes de terminar.

Chrome real (`/Applications/Google Chrome.app`) vía `playwright-core` (instalado solo en el scratchpad, `npm install` ahí, nunca en el repo). Dos modos:

- **"app"**: `chromium.launchPersistentContext` con `--app=http://localhost:3211/…` y `--window-size=1280,800` — esto abre una ventana de Chrome sin barra de direcciones, igual que "abrir la app instalada" en escritorio. Comprobé que sí quedó en modo app: `window.matchMedia("(display-mode: standalone)").matches` dio `true` en los dos casos medidos.
- **"normal"**: una pestaña común de Chrome, mismo tamaño de ventana, para comparar.

## Lo que medí

Para cada input nativo (`#agenda-fecha` en la cabecera de Agenda; los tres `input[type=date|time]` de `SelectorCuando` en el alta de evento, tras abrir el renglón "Cuándo" con el botón "Cambiar"), en los dos modos:

| Medición | Agenda (app) | Agenda (normal) | Alta evento (app) | Alta evento (normal) | Alta evento (móvil 390×844) |
|---|---|---|---|---|---|
| `input` visible (`width/height > 0`) | sí (131×38) | sí (131×38) | sí (los 3, ~80–113×42) | sí (igual) | sí (igual) |
| `elementFromPoint()` en el centro del `input` devuelve el mismo `input` | sí | sí | sí (los 3) | sí (los 3) | sí (los 3) |
| Algún ancestro con `transform` distinto de `none` (clase de bug de OL-157) | no encontrado | no encontrado | no encontrado (recorrido completo hasta la raíz) | no encontrado | no encontrado |
| `page.click()` sobre el `input` (gesto real vía CDP) | sin error, foco cae en el input | sin error | sin error, foco cae en el input | sin error | sin error |
| Errores de consola tras el click | ninguno propio de la app (solo el 404 esperado de `/_vercel/insights/script.js`, ajeno) | igual | igual | igual | — |

No hubo ninguna diferencia medible entre modo "app" y pestaña normal en ninguno de los dos sitios.

### Los tres sospechosos de la entrada OL-160, uno por uno

1. **`PanelPestana` deja un `transform` residual (clase de bug de OL-157).** Cierto que `.entraDerecha`/`.entraIzquierda` de `Pestanas.module.css` usan `animation: … both`, que sí deja `transform: translateX(0)` pegado al terminar (mismo mecanismo que el `transform: translateX(0)` de OL-157). **Pero ninguno de los dos selectores vive dentro de un `PanelPestana`:** en `AgendaInicio.tsx` el chip de fecha está en la cabecera (`<Cabecera contexto={…}>`), y el `<PanelPestana>` solo envuelve la lista de eventos más abajo (`{cuerpo}`, línea 347); el chip nunca es descendiente suyo. En el alta de evento, `SelectorCuando` va dentro de un `<li>` de `FormularioCanon` (`canon.resuelto`), que no usa `Pestanas` en absoluto. Confirmado además por el recorrido de ancestros en el navegador real: `transformAncestro: null` en los dos casos.
2. **El envoltorio de `template.tsx`.** Revisé `template.module.css`: el `.fundido` solo anima `opacity` (`@keyframes fundido { from { opacity: 0 } to { opacity: 1 } }`), nunca `transform`. No puede volverse "contenedor" de nada. Descartado por lectura de código, sin necesidad de medirlo en el navegador.
3. **El `input type="date"` invisible del chip de Agenda / la hoja "Cuándo" del alta.** Medido directamente (tabla de arriba): visible, del tamaño correcto, sin nada tapándolo, recibe el click y el foco. Nada aquí explica un "no aparece nada".

## Lo que NO pude medir (y por qué)

Lo único que de verdad respondería la pregunta del founder —si el calendario/reloj nativo de Chrome se pinta o no en la pantalla— no lo pude verificar con evidencia:

- `page.screenshot()` de Playwright (la API `Page.captureScreenshot` de Chrome) **no captura los popups nativos de formulario** (el mismo hueco conocido que con un `<select>`): tomé capturas tras el click en los dos modos y en ninguna aparece el calendario, pero tampoco aparece en el modo "normal" que sí funciona en la vida real — así que esta captura no distingue nada, solo confirma que el DOM está bien.
- Intenté un truco más: enumerar los "targets" de Chrome por CDP (`Target.getTargets`) antes y después del click, por si el popup nativo apareciera como una ventana/target aparte — no aparece ninguno nuevo, en ningún modo (el popup de fecha nativo no se expone así).
- Until aquí, sin arriesgar nada. El siguiente paso hubiera sido una captura de pantalla real (del sistema, no del navegador), pero **la primera vez que lo intenté capturé sin querer la pantalla completa de la Mac y salió una ventana de Figma ajena a esta tarea** (no mía, de otro trabajo abierto en esa misma Mac compartida) — la borré de inmediato sin guardarla ni describirla. No tengo permiso de automatización de Accesibilidad en esta sesión (`osascript` a System Events da "no tiene permitido el acceso de ayuda") para acotar una captura a solo la ventana de Chrome que yo abrí, así que decidí **no volver a intentar una captura de pantalla completa**: el riesgo de volver a capturar contenido ajeno en una Mac que comparten varios chats a la vez pesa más que la evidencia que conseguiría.

Por eso me detengo aquí en vez de inventar un arreglo: no tengo una causa medida en el código, y confirmar el síntoma tal cual lo describe el founder (visualmente, en su Mac) necesita algo que no pude hacer con seguridad desde este chat.

## Capturas (`docs/rediseno/capturas-195/`)

Las tres son del DOM real (Chrome real de la Mac, `next build && next start`, Bricolage cargada), no muestran ningún arreglo porque no hubo ninguno — son la evidencia de que el marcado y los chips se ven y miden bien en los dos sitios sospechosos:

- **`escritorio-agenda.png`** (1280×800, modo app, `display-mode: standalone` confirmado) — Agenda con el chip "Seleccionar" de fecha en la cabecera, igual que se vería la app instalada.
- **`escritorio-alta-evento.png`** (1280×800, modo app) — "Publicar un evento" con el renglón "Cuándo" abierto: los chips "23 sep 2026" y "7:00 p.m." (Empieza) y "Sin hora de fin" (Termina), los tres con su `input` nativo encima, medidos y sin nada tapándolos.
- **`movil-alta-evento.png`** (390×844) — mismo renglón "Cuándo" abierto en viewport de teléfono: sin cambios respecto al escritorio, confirma que nada de esto toca lo que ya funciona en iOS.

## Verificación

```
npm run lint        # sin tocar código de producción: no aplica un lint nuevo, se corrió igual, en verde
npm run typecheck   # en verde
npm test            # en verde (sin pruebas nuevas: no hubo lógica nueva que probar)
npm run build       # en verde (el mismo build usado para reproducir)
```

Correos: `git diff origin/main..HEAD -- . ':!docs/bitacora' ':!docs/rediseno' | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` sin resultados; el único correo que aparece en todo este trabajo es el `prueba@example.com` inventado del respaldo local del scratchpad, que nunca se comitea (vive fuera del repo).

## Alcance y límites

No se tocó ningún archivo de `src/`: no hay causa medida que arreglar. Lo único nuevo en el commit son este documento, las tres capturas y la línea de OPEN_LOOPS. `package.json` y el lock, intactos. `.env.local` y el respaldo local del scratchpad no forman parte del commit (viven fuera del repo / se borraron).

Sin push ni PR. Rama `selector-fecha-chrome`; a revisión del gestor. Sugerencia para el siguiente paso: que el founder describa en qué pantalla exacta le pasó (¿la cabecera de Agenda, o el alta de un evento?) y, si puede, si el problema sigue pasando tras cerrar y reabrir la app instalada (por si fue un estado de una sola sesión de Chrome, no del código).
