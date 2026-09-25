# 222 · Selector de fecha: elegir «hoy» filtra (OL-188)

**Fecha:** 2026-09-25 · **Rama:** `fecha-hoy-filtra`, desde `origin/main`. Operador nuevo (Sonnet).

## El bug (founder, 2026-09-25, palabras suyas)

«Al abrir selector de fecha, aparece seleccionada la fecha de hoy y si el usuario la vuelve a seleccionar no pasa
nada, no se filtra por hoy, solo a partir del día posterior.»

## Causa

`ui/ChipFecha.tsx` es el único componente detrás de los tres usos del chip de fecha (Agenda —
`components/AgendaInicio.tsx` —, Lugares — `app/lugares/VistaLugares.tsx`, OL-174 — y la hoja propia de escritorio
que ambos comparten, OL-162). En su rama "sin fecha elegida" usaba `hoy` como valor sentinel para "nada elegido",
en dos lugares:

1. El `<input type="date">` nativo (móvil/táctil): `value={hoy}`. Como el navegador no dispara `change` si se
   vuelve a elegir el mismo valor que ya tenía el campo, tocar "hoy" en el selector nativo no hacía nada — el chip
   ya "traía" esa fecha puesta, aunque no hubiera ningún filtro.
2. La hoja propia de escritorio (`SelectorFecha`, OL-162): se abría con `fecha={hoy}` (no con la `fecha` real del
   estado), así que "hoy" aparecía ya marcado como elegido sin que hubiera filtro. Y el `onListo` traducía
   explícitamente `f === hoy ? "" : f` — es decir, si la persona sí lograba "elegir" hoy (tocando el día en la
   hoja, que no depende de `change` del navegador), el código lo convertía de vuelta a "sin filtro" en lugar de
   filtrar por hoy.

Las dos fallas comparten la misma raíz: se usaba `hoy` como sentinel de "sin elegir" en vez de la fecha real
(`""`), así que "elegí hoy" y "no he elegido nada" eran indistinguibles para el componente.

Afecta a los tres usos por igual, porque los tres pasan por `ChipFecha`: Agenda, Lugares (el chip del Mapa,
OL-174) y la hoja de escritorio (OL-162).

## Arreglo

- `ui/ChipFecha.tsx`: el `<input type="date">` nativo arranca en `value=""` (nunca `hoy`), así que elegir hoy sí
  es un cambio de valor y el navegador dispara `change`. La hoja propia se abre con `fecha={fecha}` (el estado
  real, `""` si no hay filtro) en vez de `fecha={hoy}`, así que al abrir no hay ningún día "elegido" marcado (hoy
  se ve solo con el anillo de "hoy", no como seleccionado).
- `lib/calendario.ts`: nueva función pura `filtroAlElegirFecha(elegido)`, que reemplaza la traducción
  `f === hoy ? "" : f` de los dos sitios (`onChange` del nativo y `onListo` de la hoja) — ahora simplemente
  devuelve `elegido` tal cual, sea hoy o cualquier otro día. Queda como una sola fuente de verdad para "qué
  guardar cuando se elige una fecha", documentada con la historia del bug para que no se repita.
- No se tocó `SelectorCuando.tsx` (fecha/hora de un evento, alta/edición): ese componente no usa `ChipFecha` ni el
  sentinel `hoy` — pasa la fecha real en todo momento, así que no tenía este bug.

## Prueba

`src/lib/calendario.test.ts`, nuevo bloque `filtroAlElegirFecha (bug OL-188: elegir hoy no filtraba)`: comprobado
a mano que con la lógica vieja (`elegido === hoy ? "" : elegido`) la prueba `elegir hoy filtra por hoy, no lo deja
en «sin filtro»` falla (`expected '' to be '2026-09-25'`); con el arreglo pasa.

## Evidencia

```
npm run lint        → 0 errores (1 warning preexistente y ajeno, docs/diseno/logotipo/iconos-sn.mjs)
npm run typecheck   → 1 error preexistente y ajeno: colisión de mayúsculas LetreroCorreoLigado.tsx/letreroCorreoLigado.ts
                       (conocida en macOS, anotada en el encargo; CI en Linux la pasa)
npm test            → 98 archivos, 1243 pruebas, todas verdes (con node_modules completo — ver nota abajo)
npm run build       → compila con Turbopack; el "Failed to type check" es la misma colisión de mayúsculas de arriba,
                       no relacionado con este cambio
```

**Nota de entorno:** este árbol de trabajo se creó con `node_modules/` casi vacío (sin `next`, `pg`, `qrcode`,
`@vercel/analytics`, aunque estaban declarados en `package.json`). El `package-lock.json` es idéntico al del repo
principal, así que se corrió `npm ci` (no cambia `package.json` ni `package-lock.json`, confirmado con `git status`
y `md5` antes/después) para completarlo. Sin eso, ni `npm test` ni `npm run build` corrían.

**`next build && next start` no fue posible:** el build se detiene en el paso de TypeScript por la colisión de
mayúsculas de macOS ya conocida (no genera `.next` para poder arrancar `next start`). Para las capturas se usó
`next dev --webpack` (no Turbopack: en este entorno Turbopack no resolvía `@vercel/analytics/next` ni
`@photostructure/tz-lookup` aunque `node` sí los resuelve — parece un problema de Turbopack con este árbol de
trabajo, ajeno al cambio; con `--webpack` la app arranca normal). Se dejó fuera del commit: `.claude/launch.json`
se tocó y se restauró a su versión original (confirmado sin diferencias con `git diff`).

**Capturas con datos reales de Agenda/Lugares:** no se armó el respaldo local (PGlite) para esta pieza — no hay
un script en el repo para levantarlo (ver `docs/bitacora/2026/09/072-*.md`, se arma cada vez a mano) y el bug vive
enteramente dentro de `ChipFecha`/`SelectorFecha`/`calendario.ts`, sin depender de datos de Supabase. En su lugar,
capturas de un arnés temporal (`src/app/arnes-ol188/page.tsx`, **borrado antes de comitear**) que monta `ChipFecha`
solo, con la fecha de "hoy" real del navegador y el mismo `zona`/`hoy` que usan Agenda y Lugares — muestra el
componente exacto que tiene el bug, en el árbol real (fuente Bricolage cargada, `next/font`). Capturas con
`playwright-core` (instalado en el scratchpad, fuera del repo) contra Chrome real de la Mac (`channel: "chrome"`),
en `docs/rediseno/capturas-222/`:

- **`222-01-movil-sin-filtro.png`** (390×844): sin elegir nada, el chip solo muestra el ícono y "Filtro actual:
  (sin filtro)" — nada marcado como "hoy elegido".
- **`222-02-movil-filtro-hoy.png`** (390×844): tras elegir "2026-09-25" (hoy) en el `<input type="date">` nativo,
  "Filtro actual: 2026-09-25" y el chip pasa a "vie 25 sep" con su quitar — antes del arreglo esto se quedaba en
  "(sin filtro)".
- **`222-03-escritorio-hoja-sin-elegir.png`** (1280×800): la hoja propia de escritorio (OL-162) recién abierta,
  sin fecha elegida — el 25 (hoy) se ve solo con el anillo de "hoy", ningún día con el fondo de "elegido", y
  "Listo" deshabilitado.
- **`222-04-escritorio-filtro-hoy.png`** (1280×800): tras tocar el 25 en la hoja y "Listo", "Filtro actual:
  2026-09-25" y el mismo chip "vie 25 sep" — antes del arreglo, `onListo` convertía esa elección de vuelta a "sin
  filtro".

## Pendiente

Falta la prueba del founder en su iPhone (Safari), como marca `CLAUDE.md` antes de dar la fase por cerrada.
