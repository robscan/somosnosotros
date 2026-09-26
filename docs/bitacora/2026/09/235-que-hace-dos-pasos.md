# 235 · "Qué hace" en dos pasos, disciplina con ✕ y subcategoría aparte (OL-206)

**Fecha:** 2026-09-25 · **Rama:** `que-hace-dos-pasos`, desde `origin/main`.

## Pedido

OPEN_LOOPS, OL-206 (2026-09-25). Founder: «cuando se selecciona artes visuales en "Qué hace" de registrar
artista, aparecen otros chips, pero no se marca una división ni se explica que se requiere una nueva
selección. Debería seleccionarse el chip, luego borrar el resto, el chip seleccionado debería mostrar una "x"
como el de la fecha y entonces poner una línea horizontal para dividir y preguntar subcategoría con el resto
de chips.»

Precisiones aceptadas del gestor de cambios:

- La ✕ deshace los **dos pasos** a la vez: vuelven todas las disciplinas y se borra la subcategoría.
- La pregunta lleva el nombre propio de la disciplina: «¿Qué tipo de artes visuales?», «¿Qué tipo de
  música?», etc. — nunca una genérica.
- La subcategoría sigue **opcional**, con «Otra…» al final (texto libre, como hoy).
- Al elegir la subcategoría, el renglón se cierra solo y el valor muestra el resumen («Artes visuales ·
  Grabado»); igual en toda disciplina que tenga subcategorías.
- Al editar una ficha que ya tiene disciplina, el renglón abre directo en el paso 2, con su ✕.
- Disciplinas sin subcategorías conocidas todavía: se respeta lo que ya hacía el renglón (ir directo al
  campo de texto), sin forzar el paso 2 con una pregunta vacía.

## Lo medido antes de tocar nada

`src/app/artistas/FormularioArtista.tsx`, bloque «2. Qué hace»: el chip de cada disciplina (`DISCIPLINAS`,
`src/lib/artistas.ts`) ya se pintaba `activo` al elegirlo, pero **los ocho chips seguían ahí** — no había
ninguna señal de que "artes visuales" era una elección cerrada, ni de que lo que aparecía debajo (subcategorías
de OL-101, `docs/rediseno/27-subcategorias-de-disciplina.md`) dependía de esa elección. `ui/ChipFecha.tsx` ya
resolvía el mismo problema para la fecha: con fecha elegida, el chip se vuelve una pastilla con su ✕
(`.conFecha`/`.quitar`, `ChipFecha.module.css`) — la referencia visual que pidió el founder.

## Qué se hizo

**Lógica pura, sin React** (para poder probarla sola), en `src/lib/artistas.ts`:

- `preguntaSubcategoria(d)`: «¿Qué tipo de \<disciplina en minúsculas\>?».
- `pasoQueHace(disciplinaElegida)`: 1 sin elegir a mano (aunque el nombre deduzca algo), 2 con una elegida
  (a mano, o la que trae la ficha al editar).
- `alElegirDisciplina(d)`, `alQuitarDisciplina()`, `alElegirSubcategoria(detalle)`: el estado siguiente de
  cada acción, como objetos planos — sin tocar `useState` para poder probarlos sin montar el componente.

**`FormularioArtista.tsx`**, mismo bloque «Qué hace», sin cambiar lo que se guarda (mismas columnas
`disciplina` y `detalle`, mismo `<input type="hidden">` de respaldo):

- Paso 1 (`pasoQueHace(disciplinaElegida) === 1`): los ocho chips de disciplina, igual que antes.
- Paso 2: solo el chip elegido, con su ✕ — reutiliza `ui/Chip.module.css` (`chip.chip`) y una clase nueva,
  local a este formulario (`estilos.chipElegido`/`.quitarChip`), con el mismo dibujo que `ChipFecha` (pastilla
  de color, ✕ a la derecha) sin tocar `ui/ChipFecha.tsx` ni su CSS. Debajo, `<hr className={estilos.divisorPasos}>`
  y, si la disciplina ya tiene subcategorías usadas, la pregunta con su nombre propio y los chips (más «Otra…»
  al final, como ya hacía OL-101); sin ninguna conocida todavía, va directo al campo de texto, exactamente
  como antes.
- Elegir un chip de subcategoría (o «Usar esa» sobre una parecida) ahora también cierra el renglón
  (`setAbierta(null)`), además de fijar el detalle — antes solo cerraba desde el botón "Listo".
- La ✕ llama a `alQuitarDisciplina()`: `disciplinaElegida`, `detalle` y `otraAbierta` vuelven a su estado
  inicial de un tirón.

**`FormularioArtista.module.css`**: tres clases nuevas (`chipElegido`, `quitarChip`, `divisorPasos`,
`preguntaSubcategoria`), documentadas con el mismo comentario que ya usa el archivo para explicar de dónde
sale cada regla.

**Canon** (`docs/rediseno/15-formularios-canon-flujo-y-estados.md`): decisión 11 nueva, "Elegir en dos
niveles, cuando una opción abre sus propias opciones" — el patrón general (paso 1 todas las opciones, paso 2
la elegida con su ✕, línea, pregunta con nombre propio) para que la próxima vez que un chip abra sus propios
chips (no solo "Qué hace") no se repita el mismo hueco.

## Prototipo

`docs/rediseno/prototipos/que-hace-dos-pasos.html`, estático y autocontenido (Bricolage de Google Fonts,
390×844), cuatro estados: abierto sin elegir, disciplina elegida con ✕ y pregunta, subcategoría elegida con
el renglón cerrado, y «Otra…» abierta. Capturado con Chrome real vía `playwright-core` (fuente cargada,
`document.fonts.ready`) en `docs/rediseno/capturas-235/prototipo-0{1..4}-*.png`.

## Evidencia

```
npm run lint && npm run typecheck && npm test && npm run build
```

Las cuatro en verde: lint 0 errores (1 advertencia preexistente sin relación, en
`docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio; **1277 pruebas, 101 archivos** (`src/lib/artistas.test.ts`
con 8 pruebas nuevas: `preguntaSubcategoria` con las siete disciplinas, `pasoQueHace`, `alElegirDisciplina`,
`alQuitarDisciplina` y `alElegirSubcategoria`); build completo, sin rutas nuevas ni movidas. Este árbol de
trabajo no tenía `node_modules`: se corrió `npm ci` (usa el lockfile tal cual, no lo toca) antes de la primera
verificación.

**Capturas reales de la app** (390×844) en `docs/rediseno/capturas-235/`, con `next build && next start` y
Chrome real de la Mac vía `playwright-core` (Bricolage cargada). El alta de artista pide sesión y este árbol
de trabajo no tiene el respaldo local de datos armado (sin PGlite ni credenciales de prueba a mano); en su
lugar se montó un **arnés temporal**, `src/app/arnes235-temporal/page.tsx`, que renderizaba el mismo
`FormularioArtista` real con una ciudad y un `usuarioId` de prueba y una acción que nunca llegaba a
ejecutarse (no se tocó "Publicar"). Para que aparecieran subcategorías reales sin una base de verdad, ese
build se hizo con `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` de prueba (nunca reales, nunca en
git) y Playwright interceptó las dos llamadas RPC que hace el formulario (`subcategorias_de`,
`artistas_con_nombre`) con las mismas cinco subcategorías de artes visuales del conteo real de OL-101 (doc 27:
Fotografía, Pintura, Multidisciplina, Gráfica, Escultura). El arnés se borró (`rm -rf`) antes de este commit;
`git status` y el build final ya no lo traen.

- **`app-01-paso1-sin-elegir.png`:** el renglón abierto, sin elegir a mano — los ocho chips, con "Música"
  resaltado porque el nombre "Ana Ruiz" no dedujo nada más específico (deducción por nombre, sin tocar nada).
- **`app-02-paso2-disciplina-elegida.png`:** tras tocar "Artes visuales" — solo ese chip, con su ✕; debajo,
  la línea, "¿Qué tipo de artes visuales?" y sus chips (Fotografía, Pintura, Multidisciplina, Gráfica,
  Escultura, Otra…).
- **`app-03-subcategoria-elegida-cerrado.png`:** tras tocar "Fotografía" — el renglón se cerró solo; el valor
  dice "Artes visuales · Fotografía".
- **`app-04-otra-abierta.png`:** tras reabrir el renglón y tocar "Otra…", con "Grabado" escrito — el chip
  elegido y la línea se quedan, el campo de texto aparece bajo los chips de subcategoría.

`git diff origin/main -- src/app/artistas/FormularioArtista.tsx src/app/artistas/FormularioArtista.module.css
src/lib/artistas.ts src/lib/artistas.test.ts | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` no encontró nada.

## Lo que no se tocó

`apps/**`, el CSS del shell, `ui/ChipFecha.tsx` ni `ChipFecha.module.css` (solo se miraron como referencia),
`package.json`, `package-lock.json`. Sin migración: mismas columnas `disciplina` y `detalle` de siempre.

## Cierre

`git status --short` en la rama, limpio salvo lo de esta pieza (el arnés temporal ya no existe). Commit local
en `que-hace-dos-pasos`; push y PR contra `main`, sin unir (lo une el gestor de cambios).
