# 192 · La barra de seguir se despegó en las fichas de lugar y artista (OL-157)

**Fecha:** 2026-09-23 · **Rama:** `ficha-barra-pegada`, desde `origin/main` · **OL:** OL-157 (bug reportado por el founder en producción tras el PR #182) · **Modelo:** Sonnet 5, esfuerzo bajo. Sin council, workflows ni subagentes.

## De dónde sale

El founder reportó en producción, tras el PR #182: «la barra de seguir se despegó de lugares y artistas en la ficha». El gestor ya midió la causa y la dejó en la entrada OL-157 de `docs/ops/OPEN_LOOPS.md`: `src/components/ui/EntradaFicha.module.css` deja `transform: translateX(0)` en `.ficha.abierta` cuando termina la entrada de la ficha (deslizamiento desde la derecha, OL-144/148). Cualquier `transform` distinto de `none` convierte a ese envoltorio en el «contenedor» de los elementos `position: fixed`/`sticky` de dentro (regla del CSS, no un bug del navegador): la barra de acciones (`accionFija` en `Ficha.module.css`, usada por `Seguir.tsx`) deja de fijarse al borde de la ventana y en vez de eso se fija al borde del envoltorio, que mide lo alto que sea el contenido de la ficha.

Leído: `CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-157 en `docs/ops/OPEN_LOOPS.md`, `src/components/ui/EntradaFicha.tsx`, `src/components/ui/EntradaFicha.module.css`, `src/components/ui/Ficha.module.css` (clase `.accionFija`) y `src/components/Seguir.tsx` (quién la usa).

## Confirmación de la causa (antes del arreglo)

Con `next build && next start` sobre la versión de `origin/main` y Chrome real (Google Chrome de la Mac, vía `playwright-core` instalado con `npm install --no-save` — no toca `package.json` ni el lock), en un arnés temporal (`src/app/dev-ol157/`, borrado antes de comitear) que reutiliza el `EntradaFicha` y el `Ficha.module.css` reales con una barra `.accionFija` de prueba:

- Viewport 390×844. Nada más cargar (`scrollY = 0`), `getBoundingClientRect()` de la barra dio `top = 1928`, muy por debajo del alto de la ventana (1688 en las unidades con las que medía el navegador ahí) — la barra no se veía, estaba fuera de la pantalla.
- Al desplazar la página, la barra se movía con el contenido (`top` bajaba junto con el `scrollY`) en vez de quedarse fija: es exactamente «se despegó».

Captura de esa comprobación (no se guardó en el repo, solo sirvió para confirmar antes de arreglar).

## El arreglo

`src/components/ui/EntradaFicha.tsx` pasa de un booleano (`abierta`) a un estado de tres valores (`"cerrada" | "abierta" | "quieta"`, tipo `EstadoFicha` en el nuevo `src/components/ui/entradaFichaEstado.ts`):

- **`cerrada`** (fuera de pantalla a la derecha) al montar, salvo que el navegador ya pida `prefers-reduced-motion: reduce`, en cuyo caso nace directo en **`quieta`** y nunca lleva `transform` (ni siquiera `translateX(100%)` de entrada).
- Un fotograma después (`requestAnimationFrame`) pasa a **`abierta`** (`translateX(0)`, con transición de 220 ms, sin tocar la curva ni la duración de OL-144/148).
- Al terminar la transición (`onTransitionEnd`, solo si `propertyName === "transform"` y el evento es del propio nodo) pasa a **`quieta`**, cuya regla es `transform: none`. Sin `transform` en absoluto, el envoltorio deja de ser contenedor de nada y la barra vuelve a fijarse a la ventana.
- Tope de seguridad de 400 ms (220 ms de transición + margen): si `transitionend` no llega —por ejemplo con la pestaña oculta, ver la nota de memoria «Navegador oculto»— un `setTimeout` fuerza igual el paso a `quieta`.

`src/components/ui/EntradaFicha.module.css`: la regla de `.ficha` ya no trae `transform` (solo la `transition`); `.ficha.cerrada`, `.ficha.abierta` y `.ficha.quieta` ponen cada una su valor. `prefers-reduced-motion` sigue apagando la `transition` (regla ya existente).

La lógica de estados que tenía sentido probar sin DOM se sacó a `src/components/ui/entradaFichaEstado.ts` (`estadoInicial`, `debePasarAQuieta`), con 5 pruebas nuevas en `entradaFichaEstado.test.ts`.

No se tocó nada de la duración, la curva ni el resto de `docs/rediseno/38-transiciones-cargador.md`.

## Confirmación con el arreglo

Mismo arnés, mismo build de producción, mismo Chrome real, ahora con dos rutas (`/dev-ol157` etiquetada «lugar» y `/dev-ol157/artista`) para no medir solo un caso:

| | `scrollY` | `getBoundingClientRect().top` de la barra | `innerHeight` |
|---|---|---|---|
| Antes (bug) | 0 | 1928 (fuera de una ventana de 1688) | 1688 |
| Antes (bug) | 312 | 1616 | 1688 |
| Después (arreglo), ficha «lugar» | 700 | 772 | 844 |
| Después (arreglo), ficha «artista» | 700 | 772 | 844 |

`844 − 72 (alto de la barra) = 772`: la barra queda pegada al borde inferior de la ventana, igual con la página desplazada, en las dos fichas.

Dos capturas reales 390×844 (Chrome real de la Mac vía `playwright-core`, con Bricolage cargada) en `docs/rediseno/capturas-192/`:

- **`lugar.png`** — arnés etiquetado «ficha de lugar», página desplazada 700 px (el título y el párrafo de arriba ya fuera de vista); la barra «Seguir» pegada al borde inferior, con su línea divisoria.
- **`artista.png`** — mismo arnés, ruta «ficha de artista»; visualmente idéntica a `lugar.png` porque comparten el mismo `EntradaFicha`/`Ficha.module.css` reales y el mismo desplazamiento; confirma que el arreglo es del componente compartido, no de una ficha en particular.

**Nota honesta sobre las capturas:** este worktree no tiene Supabase configurado (`.env.local` vacío) y no hay forma de cargar aquí una ficha real de lugar o artista con datos — leer producción desde la app ya está bloqueado (nota de memoria del proyecto). Las dos capturas son de un arnés temporal (`src/app/dev-ol157/`, dos rutas, borrado antes de comitear) que monta el `EntradaFicha` y el `Ficha.module.css` **reales y sin modificar**, con una barra de prueba usando la misma clase `.accionFija` que usa `Seguir.tsx`. El mecanismo del bug y del arreglo es del componente compartido `EntradaFicha` (una sola pieza de código para las dos fichas), así que esta comprobación cubre igual los dos casos; lo que no se pudo ver aquí es el contenido real (nombre del lugar, del artista, botón «Seguir»/«✓ Sigues» de verdad). Falta que el gestor o el founder lo confirmen también en una ficha real (Safari, iPhone) antes de darlo por cerrado del todo.

## Verificación

```
npm run lint        # 0 errores (1 warning preexistente y ajeno en docs/diseno/logotipo/iconos-sn.mjs)
npm run typecheck   # 0 errores
npm test            # 85 archivos, 1086 pruebas, todas en verde (incluye las 5 nuevas de entradaFichaEstado.test.ts)
npm run build       # verde
```

Antes de estas corridas, `node_modules` de este worktree apareció vacío a medio trabajo (parece un `npm install` concurrente de otra sesión sobre la misma carpeta compartida) — se restauró con `npm ci` (no toca `package.json` ni el lock; `git status` de ambos, limpio). `playwright-core` para las capturas se instaló con `npm install --no-save` (tampoco toca `package.json`/lock) y usa el Chrome real de `/Applications/Google Chrome.app`, no un Chromium descargado aparte.

Correos: `git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` sin resultados en los archivos tocados.

## Alcance y límites

Solo se tocó lo pedido: `src/components/ui/EntradaFicha.tsx`, `src/components/ui/EntradaFicha.module.css` y el nuevo `src/components/ui/entradaFichaEstado.ts`/`.test.ts`. Nada de `package.json`, lock, ni otros componentes. El arnés de prueba (`src/app/dev-ol157/`) se borró antes de comitear y no forma parte del commit.

Sin push ni PR (instrucción de esta pieza). Rama `ficha-barra-pegada`; a revisión del gestor.
