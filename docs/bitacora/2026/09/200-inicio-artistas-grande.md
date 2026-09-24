# 200 · «Artistas destacados» en Inicio con el tamaño de la sección Artistas; Artistas va directo a la lista (OL-165)

**Fecha:** 2026-09-23 · **Rama:** `inicio-artistas-grande`, desde `origin/main`.

Pedido del founder: «Artistas destacados en inicio con el tamaño que tiene en la sección de artistas». En
`ListaArtistas.tsx` (línea 172) la tira de destacados ya usaba `Destacados` con `grande`; en Inicio, el
carril «Artistas destacados» (`CarrilEntidadCliente`, dentro de `CarrilEntidad`) usaba `redondas` (chica).
A mitad del encargo el gestor amplió el alcance con una segunda decisión del founder: la sección Artistas
va directo a la lista, como Agenda — sin carriles propios, porque ya viven en Inicio.

## Parte 1: el carril grande en Inicio

- `src/components/inicio/CarrilEntidadCliente.tsx`: nuevo prop `grande?: boolean` (por defecto `false`).
  Con él, `Destacados` recibe `grande={grande} redondas={!grande} detalleCompleto={!grande}` — la misma
  combinación (tarjeta grande, sin `detalleCompleto`) que usa `ListaArtistas.tsx` en su tira; el botón de
  Seguir (`boton={(t) => seguir.boton(t.id, t.titulo)}`) no cambió, ya era el mismo.
- `src/components/inicio/CarrilEntidad.tsx`: el mismo prop `grande?: boolean`, pasado tal cual al cliente.
- `src/app/page.tsx`: solo `slotArtistasDestacados` recibe `grande`; `slotLugaresSemana` y
  `slotArtistasSemana` siguen sin él (chica, `redondas`).
- `src/components/Inicio.tsx`: el `<Suspense fallback={<CarrilEsqueleto tamano="..." />}>` de
  `slotArtistasDestacados` pasó de `"chica"` a `"grande"` — sin esto, el esqueleto de carga tenía el alto
  chico y la página hubiera saltado al llegar la tarjeta real, más alta.

## Parte 2 (ampliación del gestor): Artistas sin carriles propios

- `src/components/ListaArtistas.tsx`: se quitaron la tira de destacados (`<Destacados ... grande .../>`,
  antigua línea 172) y el carril «Con eventos esta semana» (`<Destacados ... redondas ... />`, antigua
  línea 173). Con ellos se fueron los props `destacados`/`eventosSemana` de `Props`, el `useState`/import
  de `Destacados`, `tarjetaArtista` y `type Tarjeta` (ya sin uso en este archivo), y el comentario que
  documentaba esos carriles se reemplazó por uno que explica que ahora viven en Inicio.
- `src/app/artistas/page.tsx`: la función `cargar()` ya no pide `leerTira(supabase, "artistas", ciudad)`
  ni `cargarEventosSemana(supabase, "artistas", ciudad)` (con ellas se fue `sinFiltro`, que solo servía
  para condicionar esas dos consultas), ni la consulta aparte de los artistas de la tira (`tira.length ?
  supabase.from("artistas")... : ...`) ni el cálculo de `destacados` con `enOrden`. El tipo `Cargado` y el
  objeto `vacio` perdieron los campos `destacados`/`eventosSemana`. Los imports `cargarEventosSemana`,
  `enOrden`, `leerTira` y `type Tarjeta` se quitaron de este archivo (siguen usándose en
  `src/app/lugares/page.tsx`, que no se tocó: Lugares conserva sus dos carriles). La consulta de
  `eventos_artistas` que arma `fechas` (la próxima fecha de cada renglón, no de un carril) se conservó tal
  cual: no era parte de lo que se retira.
- No se tocó ningún archivo de Lugares ni de Inicio más allá de lo de la Parte 1.

### Antes y después (Inicio, mismo `que="artista"`)

- **Antes:** `<CarrilEntidadCliente ... />` → `<Destacados ... redondas detalleCompleto .../>` (tarjeta
  redonda, chica, igual en «Artistas destacados» y en «Artistas con eventos esta semana»).
- **Después, con `grande`:** `<Destacados ... grande redondas={false} detalleCompleto={false} .../>` —
  tarjeta rectangular grande, sin `detalleCompleto` (mismo canon que `ListaArtistas.tsx`).
- **Después, sin `grande` (los otros dos carriles):** sin cambios, siguen en `redondas`/`detalleCompleto`.

## Pruebas

```
npm run lint && npm run typecheck && npm test && npm run build
```

Verdes: lint 0 errores (1 warning preexistente sin relación, `docs/diseno/logotipo/iconos-sn.mjs`);
typecheck limpio (tras `npm ci`, que instaló `@vercel/analytics`/`qrcode` — faltaban en este árbol de
trabajo antes de tocar código; `package.json`/`package-lock.json` intactos, comprobado con
`git status`); **1137 pruebas, 91 archivos**, todas en verde (ningún archivo de prueba dependía de
`destacados`/`eventosSemana` en `ListaArtistas` ni en la página de Artistas); build completo, sin la ruta
del arnés (ver abajo) en el árbol de rutas final.

## Capturas reales (`docs/rediseno/capturas-200/`), 390×844

`next build && next start` (puerto 4200, sin tocar el 3000 de otro chat), Chrome real de la Mac vía
`playwright-core` (instalado en el scratchpad de la sesión, nunca en el repo). Sin Supabase configurado en
este árbol de trabajo: un arnés temporal (`src/app/arnes200-temporal/`, datos inventados — Trío Cantera,
Ana Reyes, Colectivo Nortesur, Los del Callejón, Ensamble Potosino, Marcela Ibarra, todas con `foto: null`
para no depender de red — con los componentes reales: `Barra`, `NavInferior`, `CarrilEntidadCliente`,
`ListaArtistas`) sirvió las dos páginas y **se borró entero antes de comitear** (no aparece en
`git status`). `document.fonts.check('700 20px "Bricolage Grotesque"')` → `true` en las dos.

- **`01-inicio-artistas-destacados-grande.png`:** «Artistas destacados» arriba, ya con la tarjeta grande
  rectangular (foto/placeholder SN grande, título y fecha debajo, botón Seguir flotando sobre la esquina),
  igual que la tira de la sección Artistas; debajo, «Artistas con eventos esta semana» con las mismas
  personas pero en tarjeta chica redonda, para comparar los dos tamaños en la misma pantalla.
- **`02-artistas-lista-directa.png`:** la sección Artistas con su barra (chip de ciudad «San Luis
  Potosí»), la tira de letras (A, C, E, L, M, T) y la lista de renglones directamente debajo — sin ningún
  carril de destacados ni de «esta semana» arriba, igual que Agenda.

### La barra inferior «flotando a media página» en la primera versión de la captura 02: artefacto, no un despegue

El gestor vio en la primera versión de `02-artistas-lista-directa.png` (una captura de **página
completa**, `page.screenshot({ fullPage: true })`) la barra inferior a media altura de la imagen en vez de
pegada abajo, y preguntó si era un artefacto de esa técnica de captura o el mismo despegue de OL-157 (un
`transform` residual en un envoltorio que convierte a `position: fixed` en relativo a ese envoltorio en vez
de a la ventana).

Es artefacto de la captura de página completa, confirmado por medición, no un despegue real:
`nav[aria-label="Secciones"]` sigue siendo `position: fixed` de verdad, pegada a la ventana, en las tres
pantallas y también con el árbol de componentes exacto de esta pieza. Medido con Chrome real
(`playwright-core`), viewport 390×844 **sin** `fullPage`, `getBoundingClientRect()` de la barra antes y
después de `window.scrollTo(0, 700)` (en Inicio, Artistas y Agenda reales, sin Supabase, se les agregó un
`<div style="height:2000px">` al final del `<body>` solo para tener algo que desplazar — no es parte del
commit; y por separado, sobre el arnés temporal con el árbol de componentes real de esta pieza, con
contenido propio suficiente para desplazar):

| Pantalla | `bottom` antes (`scrollY=0`) | `bottom` después de desplazar | `scrollY` después |
|---|---|---|---|
| Inicio (real + relleno) | 844 | 844 | 700 |
| Artistas (real + relleno) | 844 | 844 | 700 |
| Agenda (real + relleno) | 844 | 844 | 700 |
| Arnés Inicio (carril grande, contenido propio) | 844 | 844 | 35 (todo lo que hay que desplazar) |
| Arnés Artistas (lista directa, contenido propio) | 844 | 844 | 351 (todo lo que hay que desplazar) |

`innerHeight` es 844 en los cinco casos: `bottom = 844` significa pegada exactamente al borde inferior de
la ventana, sin moverse un píxel al desplazar. `layout.tsx` (raíz de toda la app) no tiene ningún
`transform` entre `<body>` y `NavInferior`, y esta pieza no agregó ninguno (los carriles y la lista viven
como hermanos de `<nav>` dentro de `<main class="raiz">`, no como sus ancestros) — no hay envoltorio que
pueda convertirse en contenedor de lo fijo, a diferencia de OL-157 (`EntradaFicha` sí envolvía la barra con
un `transform`).

La causa del artefacto: el `fullPage: true` de Playwright/Chromium agranda el viewport de captura al alto
completo del documento y vuelve a pintar la página en ese tamaño nuevo; un elemento `position: fixed` se
sigue anclando a los bordes de la ventana, pero ahora esa "ventana" mide todo el documento — la barra queda
pegada al fondo del documento entero, no al fondo de los 844 px que se ven en un teléfono real, y en la
imagen final aparece a la altura relativa de un viewport de 844 dentro de una imagen mucho más alta: a
media página. Con la captura reemplazada (viewport normal, sin `fullPage`, lista desplazada 300 px) la
barra sale donde tiene que salir: pegada abajo (medido en el momento de la captura: `bottom: 844`,
`scrollY: 300`).

## Lo que no se tocó

- Lugares conserva sus dos carriles en `/lugares` (tira de destacados y «Con eventos esta semana»): el
  founder solo pidió el cambio en Artistas.
- La consulta de `eventos_artistas` que arma la «próxima fecha» de cada renglón de la lista de Artistas
  siguió igual: no es de los carriles que se retiraron.

## Correos en el diff

`git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` no encontró ninguna dirección.

## Cierre

Sin push ni PR (los da el gestor). Commit local en `inicio-artistas-grande` con
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
