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
