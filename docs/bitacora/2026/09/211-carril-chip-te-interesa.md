# 211 · El chip «Te interesa» de la lista, también en las tarjetas de los carriles (OL-176)

**Fecha:** 2026-09-24 · **Rama:** `carril-chip-te-interesa`, desde `origin/main`.

Pedido del founder: «Usas un chip en listado de eventos para decir "Te interesa", por favor úsalo también
en los elementos de sliders. Se puede apilar en el extremo inferior izquierdo con chip de los que "van".»

## De dónde sale el estado

`Tarjeta` (`src/lib/destacados.ts`) no trae lo que la persona decidió — no es suyo: la decisión de «Me
interesa» se toma en la ficha del evento, no al armar la tarjeta del carril. `useAsistenciaEnLista`
(`src/components/useAsistenciaEnLista.tsx`) ya guarda las decisiones (`Decididas`) y **ya expone** una
función `estado(id): Asistencia` en su valor de retorno (línea 65: `id in elegidas ? elegidas[id].valor :
(decididas?.[id] ?? null)`), la misma que usan los renglones (`RenglonEvento` la recibe como prop `estado`)
y que refleja también lo que se acaba de tocar (optimista), no solo lo guardado. `EstadoBotonRenglon` (lo
que devuelve `boton(e)`) **no** trae el estado — solo `decidido: boolean` (voy/no voy) — así que no sirve
para esto.

No hizo falta tocar el hook: ya tenía lo necesario. Cambios:

- `Destacados` (`src/components/Destacados.tsx`) gana un prop opcional `estadoDe?: (id: string) =>
  Asistencia`. Sin él (lugares, artistas), no aparece ningún chip — el comportamiento de antes de esta
  pieza, intacto. Con él, cada tarjeta calcula `estadoDe?.(t.id) === "me_interesa"` y pinta el chip si
  aplica. `Tarjeta` no cambió; ningún llamador de `tarjetaEvento`/`tarjetaLugar`/`tarjetaArtista` se tocó.
- Los dos carriles de eventos que ya tenían `useAsistenciaEnLista` (los únicos con `boton={(t) =>
  asistencia.boton(t)}` de un hook de asistencia, no de seguir) pasan `estadoDe={asistencia.estado}`:
  `src/components/inicio/CarrilCercanos.tsx` y `src/components/inicio/CarrilEventosCliente.tsx`. Revisados
  con `grep '<Destacados'` los cinco usos del componente en todo `src/`: los otros tres
  (`ListaLugares.tsx` ×2, `CarrilEntidadCliente.tsx`) son de lugares o artistas (`seguir.boton`, nunca
  asistencia) y no llevan `estadoDe` — sin chip, como pide el encargo. No se tocó `AgendaInicio.tsx` (no
  usa `Destacados` directamente) ni ningún otro archivo prohibido.

## La tarjeta

`src/components/Destacados.tsx` y `Destacados.module.css`: un único `<span className={styles.chips}>`
(hijo directo del `<a class="tarjeta">`, con `grid-area: foto` — nunca dos elementos sueltos con esa área
que se pisen) envuelve, en columna (`display: grid; gap: 4px; justify-items: start`), «Te interesa»
(cuando aplica) arriba y «N van» (cuando `t.van > 0`) debajo — el orden que se midió más legible en las
capturas (ver abajo); con solo uno de los dos, sale solo ese, en la misma esquina inferior izquierda de la
foto (`align-self: end; justify-self: start`, el mismo `margin` que ya tenía `.van`). Va después del título
en el DOM (como ya iba «N van»).

El chip «Te interesa» reutiliza el icono (`IconoEstrella`, 14×14) y el texto («Te interesa») del renglón
(`RenglonEvento.tsx`/`Renglon.module.css`, clase `.estado`) y los **mismos tokens** de color y letra:
`background: var(--primario-suave); color: var(--primario); font-weight: 700; font-size: var(--letra-xs)`.
El chip del renglón **ya trae fondo propio** (`--primario-suave`, no transparente): no hizo falta darle el
vidrio de `.van` para que se lea sobre la foto, se lee igual de bien con su propio fondo — se documenta
aquí porque el encargo pedía decirlo si hacía falta.

`.van` perdió `grid-area`/`align-self`/`justify-self`/`margin` propios (se movieron al nuevo `.chips`, que
es ahora el único con esa área) y conservó su forma (fondo `--vidrio`, mismo padding/radio); con un solo
chip el resultado visual es idéntico a antes de esta pieza (mismo margen, misma esquina).

## Pruebas

```
npm run lint && npm run typecheck && npm test && npm run build
```

Verdes: lint 0 errores (1 warning preexistente sin relación, `docs/diseno/logotipo/iconos-sn.mjs`);
typecheck limpio; **1075 pruebas, 89 archivos**, todas en verde (sin cambios de número: ningún test de
vitest tocaba `Destacados`); build completo, 25 rutas, sin el arnés temporal.

Nueva prueba `src/components/Destacados.componentes.test.mjs` (Chrome real vía Playwright, como las demás
`.componentes.test.mjs` del repo — no corre con `npm test`, que solo toma `.test.ts`; se corrió a mano:
`PLAYWRIGHT_MODULE=.../playwright-core/index.mjs CHROME_EXECUTABLE=/opt/pw-browsers/chromium node --test
src/components/Destacados.componentes.test.mjs`). Siete pruebas, todas en verde:

1. Con `estadoDe` devolviendo `"me_interesa"`, sale el chip «Te interesa».
2. Con `"voy"`, no sale «Te interesa» — el botón (aquí, icono, sin texto: `BotonRenglon` no dice «Vas», solo
   la etiqueta accesible fija «Voy — …» con `aria-pressed`, ver `useAsistenciaEnLista.tsx` línea 128) queda
   `aria-pressed="true"` (decidido).
3. Sin `estadoDe` (equivalente a sin sesión, donde `decididas === null` y `estado(id)` siempre da `null`),
   no sale «Te interesa» en ningún lado de esa sección.
4. Un carril sin `estadoDe` (lugares/artistas) no cambia: ni «Te interesa» ni «van» (que en esas tarjetas
   siempre es 0) — cero chips, maquetación intacta.
5. Con «van» y «Te interesa» los dos: aparecen apilados dentro de un único `<span>` contenedor con
   `grid-area: foto` (nunca dos sueltos), «Te interesa» antes que «N van» en el DOM.
6. Solo «N van», sin interesa: un solo chip.
7. Ni interesa ni van: sin chip.

## Capturas reales (`docs/rediseno/capturas-211/`), viewport 390×844 (04: 320×844), sin `fullPage`

Arnés temporal `src/app/arnes211-temporal/` (datos inventados: cuatro eventos con las cuatro combinaciones
de interesa/van, dos lugares) con el componente real `Destacados`, servido con `next build && next start`
en el puerto 4211 y capturado con el Chromium de `/opt/pw-browsers` vía `playwright-core` (`npm i --no-save`
en el scratchpad de la sesión, nunca en el repo). **Se borró entero antes de comitear** (no aparece en
`git status`; el build final, corrido después de borrarlo, no lista `/arnes211-temporal` entre las 25
rutas). `document.fonts.check('700 20px "Bricolage Grotesque"')` → `true` en las seis capturas; ningún
`desborde horizontal de pagina` (medido `scrollWidth > innerWidth`) en ninguna.

- **`01-carril-eventos-mediana.png`** / **`01b-…-van.png`** / **`01c-…-nada.png`**: carril de eventos,
  tarjeta mediana (tamaño de siempre) — una tarjeta con «Te interesa» + «3 van» apilados (interesa arriba),
  otra solo con «Te interesa», otra solo con «5 van», otra sin nada. El botón «+» de la esquina superior no
  se movió.
- **`02-…grande.png`** / **`02b-…-van.png`** / **`02c-…-nada.png`**: las mismas cuatro combinaciones en la
  tarjeta grande (`grande`).
- **`03-carril-lugares-sin-cambios.png`**: un carril de lugares (`grande`, sin `estadoDe`) — sin chip
  alguno, igual que antes de esta pieza.
- **`04-peor-caso-320.png`** / **`04b-…-van.png`**: 320 px de ancho (el mínimo del proyecto), con los
  títulos más largos de las tarjetas inventadas («Huapangueada sobre rieles con la Orquesta del
  Ferrocarril», «Exposición de fotografía urbana») — los chips caben dentro del ancho de la foto sin
  desbordar.
- **`05-carril-redondas-sin-cambios.png`** (extra, no pedida): un carril `redondas` (tamaño de artistas)
  tampoco cambia sin `estadoDe`.

## Correos en el diff

`git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` no encontró ninguna dirección.

## Cierre

Sin push ni PR con revisión (el encargo pidió `git push -u origin carril-chip-te-interesa` al terminar, sin
abrir PR). Commit local en `carril-chip-te-interesa`.
