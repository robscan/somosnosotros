# 239 · El filtro de fecha también filtra la lista de Lugares (OL-210)

**Fecha:** 2026-09-25 · **Rama:** `lugares-fecha-lista`, desde `origin/main` (rebasada sobre `a20595f`, OL-212, tras
fetch: sin choque, solo tocaba `OPEN_LOOPS.md`). Operador nuevo (Sonnet). Pieza chica, sin subagentes ni council.

## El bug (founder, 2026-09-25, palabras suyas)

«Filtro de fecha sin efectos en listado de lugares. Debería afectar la lista también.»

## Causa

El chip de fecha de Lugares (`ui/ChipFecha`, compartido con Agenda, OL-174) siempre vivió en `VistaLugares.tsx`
como estado de la pantalla, no de una sola vista. Pero cuando se construyó (bitácora
[209](209-lugares-cabecera-fecha-app.md)), el encargo decía explícitamente «con fecha elegida, el mapa solo pinta
los pines con evento ese día... la Lista no filtra por fecha (pedido literal del founder)». Esa bitácora dejaba
anotado en «Preguntas abiertas» exactamente esto: «Si la Lista de Lugares también debería filtrar por fecha (el
founder solo pidió el mapa; el código respeta eso literalmente)». El founder acaba de responder que sí.

En código: `CuerpoLugares` (dentro de `VistaLugares.tsx`) filtraba los pines del mapa con
`lugaresConEventoElDia(enMapa, fecha)` (la función pura de `lib/lugares.ts`, con su propia prueba desde OL-174),
pero le pasaba a `<ListaLugares lugares={lugaresDelTipo} .../>` los lugares **sin** ese filtro — de ahí que elegir
una fecha moviera los pines del mapa pero la lista de abajo (o al cambiar a la pestaña Lista) siguiera mostrando
todos los lugares de la ciudad, con o sin evento ese día.

## Arreglo

- **`src/lib/lugares.ts`:** sin cambio de comportamiento en `lugaresConEventoElDia` — solo se actualizó el
  comentario que decía «el filtro es solo del mapa»; ahora dice que la Lista usa la misma función (OL-210). Es
  literalmente la misma función pura para las dos vistas, no una copia: eso es lo que pide «filtrar no es
  navegar, la misma regla» en la práctica.
- **`src/app/lugares/VistaLugares.tsx`:** nueva variable `lugaresListaDelDia` (junto a `pinesDelDia`, que ya
  existía para el mapa) — `fecha ? lugaresConEventoElDia(lugaresDelTipo, fecha) : lugaresDelTipo`, calculada
  sobre `lugaresDelTipo` (antes de la búsqueda, que la propia `ListaLugares` aplica con `filtrarLugares`). Se le
  pasa a `<ListaLugares>` como `lugares`, junto con la prop nueva `fecha`.
- **`src/components/ListaLugares.tsx`:**
  - prop `fecha?: string` (solo para elegir el texto correcto del vacío: `lugares` ya llega filtrado por
    `VistaLugares`, este componente no vuelve a filtrar por fecha).
  - la tarjeta «Aún no hay lugares en {ciudad}. Registra el primero.» solo aparece sin tipo **y sin fecha**: con
    fecha elegida y cero resultados, el motivo no es que la ciudad esté vacía, es la fecha, y ese caso usa el
    texto de abajo.
  - el párrafo de conteo (`<p className={comun.conteo}>`) gana una rama: sin resultados, con búsqueda gana ese
    texto (como antes); si no hay búsqueda pero sí fecha, «Ningún lugar tiene eventos ese día.» — el mismo texto
    que ya usa el vacío del Mapa (`vacioFecha`); si no, el texto de tipo de siempre. Con o sin resultados, es
    exactamente el mismo texto que vería la persona en el Mapa con la misma fecha.
  - las dos tiras (Destacados de la ciudad, «Con eventos esta semana») se van con una fecha elegida, igual que ya
    se iban con un tipo o una búsqueda (`!tipo && !busqueda.trim() && !fecha`) — son curaduría de la ciudad
    entera, no del día elegido; dejarlas visibles habría repetido el bug de esta pieza a otra escala (la persona
    ve una fecha filtrando el resto de la lista y tarjetas de otros días arriba, como si el filtro no aplicara
    del todo).
- **Lo que no hizo falta tocar:** el chip de fecha (`ui/ChipFecha`) ya vivía en la cabecera compartida por Mapa y
  Lista, así que su ✕ («Quitar la fecha») ya es la salida para las dos vistas — no había que agregar nada. La
  memoria de pantalla (`useMemoriaPantalla` en `VistaLugares.tsx`) ya guardaba `fecha` junto con `vista` y
  `busqueda` desde la bitácora 209 (el chip vive en la pantalla, no en una vista) — comprobado que sigue
  funcionando (ver «Memoria de pantalla» en Evidencia).

## Decisión tomada en esta pieza

**Las tiras (Destacados, «Con eventos esta semana») se ocultan con una fecha elegida.** No estaba en el encargo
explícitamente, pero es la misma regla que ya usa el código para tipo y búsqueda (`!tipo && !busqueda.trim()`),
extendida a la fecha por consistencia — sin esto, quedaba una segunda instancia del mismo bug, más chica: la
lista de abajo diría «ningún lugar» y arriba seguirían dos tiras de tarjetas sin relación con el día elegido.

## Límite ajeno encontrado de paso (no es de esta pieza, no se tocó)

Con un tipo elegido (p. ej. `?tipo=museo`) y **sin** fecha, el párrafo de conteo («13 lugares») queda tapado por
la tira de letras (`ui/TiraLetras`, pegajosa con margen negativo para que lo que sigue suba debajo de ella) en
cuanto no hay tiras de Destacados de por medio — comprobado en este mismo árbol **sin mis cambios**, solo con
`?tipo=museo`: el defecto es de `TiraLetras.module.css`/`Lista.module.css`, anterior a OL-210, y esta pieza no lo
introduce ni lo agranda (con una fecha elegida pasa lo mismo, por la misma razón: sin Destacados de por medio, el
conteo queda detrás de la tira). Queda anotado para otra pieza; no se tocó `TiraLetras` aquí (fuera de encargo).

## Pruebas

- **Unitaria (`src/lib/lugares.test.ts`):** el describe de `diasConEvento`/`lugaresConEventoElDia` ahora dice
  «OL-210: misma regla para el Mapa y la Lista»; se añadió un caso explícito que dice, con el mismo conjunto de
  lugares y la misma fecha, que el resultado para "el Mapa" y para "la Lista" es idéntico (`toEqual`) — no hay
  una regla por vista, es una sola función llamada dos veces desde `VistaLugares.tsx`. Las dos pruebas viejas de
  la función (juntar días sin repetir, filtrar por día) siguen intactas: no cambió su comportamiento.
- **Memoria de pantalla (a mano, con `playwright-core`):** elegida «vie 25 sep», entrar a una ficha de lugar y
  volver con el equivalente del gesto de Safari (`page.goBack()`): el chip sigue en «vie 25 sep» y el conteo en
  «9 lugares» — no se pierde la fecha ni el filtro al volver.

```
npm run lint        → 0 errores (1 aviso preexistente y ajeno, docs/diseno/logotipo/iconos-sn.mjs)
npm run typecheck   → limpio
npm test            → 106 archivos, 1309 pruebas, todas verdes
npm run build       → compila con Turbopack, sin rutas de arnés en el árbol final
```

`node_modules/` llegó vacío a este árbol de trabajo (0 paquetes): `npm ci` lo completó — mismo `package.json` y
`package-lock.json` antes/después, comprobado con `md5`.

## Capturas reales (`docs/rediseno/capturas-239/`), 390×844

**Datos: producción en solo lectura**, como ya hace la app pública (`/lugares` no pide sesión). `next build &&
next start -p 4239` en este árbol de trabajo, con un `.env.local` temporal (ignorado por git, **borrado al
terminar**) con solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` — las mismas llaves públicas que
ya viajan al navegador de cualquier persona que visita el sitio, leídas del `.env` del checkout principal sin
imprimirlas ni copiar el archivo. Chrome real de la Mac vía `playwright-core` (instalado con `npm install
--no-save` en el scratchpad de la sesión, fuera del repo). Confirmado `document.fonts.check('16px "Bricolage
Grotesque"')` → `true` antes de capturar. Ciudad San Luis Potosí (la inicial), vista Lista (`?vista=lista`), sin
tocar el mapa (no hacía falta: el arreglo es de la Lista).

- **`239-01-lista-sin-fecha.png`:** sin fecha elegida, como hoy — «61 lugares», con las dos tiras («Con eventos
  esta semana» y, más abajo, Destacados) y la tira de letras alfabética.
- **`239-02-lista-fecha-con-lugares.png`:** «vie 25 sep» (hoy real del entorno, 2026-09-25) elegido — «9
  lugares» (confirmado en el DOM; el número exacto en la captura queda tapado por la tira de letras pegajosa, ver
  «Límite ajeno» arriba, no de esta pieza), sin las dos tiras, agrupado por letra solo entre los 9 lugares con
  evento hoy (A, B, C, I, M, T).
- **`239-03-lista-fecha-sin-lugares.png`:** una fecha de 2027 sin ningún evento cargado — «Ningún lugar tiene
  eventos ese día.», sin tiras, sin lista; el chip sigue con su ✕ para quitar el filtro y «Registrar lugar»
  intacto abajo.

Las tres, con la ✕ del chip de fecha visible (la salida para quitar el filtro) salvo en la primera, donde no hay
fecha que quitar.

## Correos en el diff

```
git diff origin/main..HEAD -- src docs | grep -E '^[+-]' | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+' | sort -u
```

Un único acierto, `analytics@2.0.1` (versión de `@vercel/analytics` en texto histórico ya existente de
`OPEN_LOOPS.md`, ajeno a esta pieza — el mismo falso positivo que ya señaló la bitácora 209). Ninguna dirección de
correo real.

## Cierre

`.env.local` borrado, servidor de `next start -p 4239` detenido, `node_modules/` (creado por `npm ci`) queda
fuera de git por `.gitignore`. `git status --short` limpio salvo los archivos de esta pieza. Commit local en
`lugares-fecha-lista` con su atribución de rigor; push; PR contra `main` abierto por este operador, sin unir
(esperando `gh pr checks`).
