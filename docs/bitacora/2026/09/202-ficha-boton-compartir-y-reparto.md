# 202 · Botón «Compartir» sin envolvente y reparto de acciones a partir de 3 (OL-167)

**Fecha:** 2026-09-24 · **Rama:** `ficha-boton-compartir-y-reparto`, desde `origin/main` (`a4d38d6`).

Dos arreglos en la misma zona (`src/components/ui/Ficha.module.css`, `src/lib/ficha.ts`), sin rediseño ni
migración.

## 1. El botón «Compartir» salía con una cápsula gris de bordes redondeados

Reporte del founder en producción (ficha de lugar). Tercer aviso del founder por maquetación el mismo día
(«Te llamo nuevamente la atención respecto a la atención al detalle en maquetación»): la corrección de
OL-163 sólo reseteó el `<span class="accionIcono">` de adentro (el círculo); nunca el `<button>` de
`BotonCompartir.tsx`, que sigue usando `<button type="button" className={ficha.accion}>`. `.accion` se
escribió para un `<a>` (Cómo llegar, redes) y nunca declaró `border`/`background`/`padding`/`appearance`,
así que un `<button>` con esa clase conserva la hoja de estilos nativa del navegador.

### Causa medida: computed style real del `<button>` "Compartir" (Chrome real, `playwright-core`, 390×844)

Medido en el arnés temporal (ficha de lugar, 2 acciones) con `getComputedStyle` sobre el `<button>` dentro
de `.acciones` — "antes" simulado anulando con `revert` las cinco propiedades que este arreglo agrega (el
mismo estado que tenía `.accion` sin ellas: la hoja nativa del navegador, no una suposición):

| Propiedad | Antes (nativo, sin reset) | Después (con el arreglo) |
|---|---|---|
| `border` | `2px outset rgb(0, 0, 0)` | `0px none rgb(26, 26, 26)` |
| `background-color` | `rgb(239, 239, 239)` (gris `ButtonFace`) | `rgba(0, 0, 0, 0)` (transparente) |
| `padding` | `1px 6px` | `0px` |
| `appearance` | `auto` | `none` |
| `font` | `13.3333px Arial` (tipografía del navegador, no la de la app) | hereda `Bricolage Grotesque` de `.accion` |
| Ancho del botón | `74.5px` (por el padding/borde extra) | `64px` (igual que el `<a>` de al lado, `min-width: 64px`) |

Ese borde `2px outset` + fondo gris + padding es exactamente el envolvente rectangular reportado; el ancho
extra (74.5 px contra 64 px del `<a>`) es lo que lo hacía verse "más grande" que "Cómo llegar".

### Arreglo

`Ficha.module.css`, `.accion`: se agregan `border: 0; margin: 0; padding: 0; background: none; font: inherit;
appearance: none` (con `font-size`/`font-weight` ya declarados después en la misma regla, así que siguen
mandando sobre el `font: inherit`). Un `<a>` y un `<span>` no traen borde, fondo, padding ni `appearance`
propios — comprobado con el mismo `getComputedStyle` en las capturas 01-07 (ver abajo): el círculo y el
letrero de `<a>` y `<button>` salen idénticos.

Se revisó todo uso de `.accion` en el repo (no solo el de OL-167): `<a>` (Cómo llegar, redes, «A mi
calendario»), `<span aria-disabled="true">` (Cómo llegar sin dirección) y `<BotonCompartir>` (`<button>`) en
las tres fichas — evento, lugar y artista. Ninguno queda sin cubrir.

## 2. El reparto de acciones empezaba en 2, no en 3

Founder: «Te había pedido que en los enlaces de artistas distribuyeras elementos en espacio disponible y
que lo hicieras a partir de 2, pero quiero que lo cambies a partir de 3, con dos se percibe como error.»

`src/lib/ficha.ts` tenía `cabenRepartidas(cantidad) => cantidad <= MAXIMO_ACCIONES_REPARTIDAS` (4): con 1 ya
quedaba a la izquierda por el flex por defecto, pero con 2 ya entraba a `.accionesRepartidas`
(`justify-content: space-between`), estirándose a los extremos — el caso que el founder ahora dice que "se
percibe como error".

### Arreglo

`repartoDeAcciones(cantidad): "izquierda" | "repartidas" | "carril"` sustituye a `cabenRepartidas` (booleano):

- `< 3` → `"izquierda"` (sin clase de reparto: el flex por defecto ya alinea a la izquierda con el `gap`
  normal de `.acciones`, sin estirarse).
- `3` a `MAXIMO_ACCIONES_REPARTIDAS` (4) → `"repartidas"` (`.accionesRepartidas`).
- más de 4 → `"carril"` (`.accionesCarril`).

Llamadas actualizadas:

- `src/app/lugares/[id]/page.tsx`: `repartoDeAcciones(2 + redes.length)` (Cómo llegar + Compartir + redes).
- `src/app/artistas/[id]/page.tsx`: `repartoDeAcciones(redesConEnlace.length)`.
- `src/app/eventos/[id]/page.tsx`: **sin cambios.** La ficha de evento siempre pinta exactamente 3 acciones
  (Compartir, «A mi calendario», Cómo llegar — o su aviso «sin dirección» cuando no hay), así que ya usaba
  `ficha.accionesRepartidas` fijo desde antes; con el nuevo canon (3 = repartidas) sigue siendo correcto sin
  tocar el archivo. No importaba `cabenRepartidas`, así que no había nada que cambiar ahí.

`src/lib/ficha.ts` y el comentario de reparto en `Ficha.module.css` (arriba de `.acciones`) se reescribieron
con la fecha y las palabras del founder. `src/lib/ficha.test.ts` se reescribió para `repartoDeAcciones`: 1 y
2 → `"izquierda"`; 3 y el máximo (4) → `"repartidas"`; 5 y 6 → `"carril"`.

## Pruebas

```
npm run lint && npm run typecheck && npm test && npm run build
```

- **Lint:** 0 errores, 1 warning preexistente sin relación (`docs/diseno/logotipo/iconos-sn.mjs`, ignorado
  según el encargo).
- **Typecheck:** limpio.
- **Tests:** **1069 pruebas, 89 archivos**, todas en verde (incluye las 3 de `src/lib/ficha.test.ts`
  reescritas).
- **Build:** completo, sin errores, sin la ruta del arnés en el árbol de rutas final (se borró antes de esta
  corrida final).

## Capturas reales (`docs/rediseno/capturas-202/`), 390×844

`next build && next start` (puerto 4202), Chrome real (`playwright-core`, instalado en el scratchpad de la
sesión, nunca en el repo) contra el Chromium preinstalado de `/opt/pw-browsers`. Sin Supabase en este árbol:
arnés temporal `src/app/arnes202-temporal/` (tres páginas, datos inventados, con los componentes reales
`BotonCompartir`, `EnlaceExterno`, `Ficha.module.css` e `lib/ficha`) — **se borró entero antes de comitear**
(no aparece en `git status`). `document.fonts.check('700 20px "Bricolage Grotesque"')` → `true` en las 7.
Ningún `scrollWidth` superó `clientWidth` (390) en ninguna captura — sin scroll horizontal.

- **`01-lugar-2-acciones.png`:** ficha de lugar, 2 acciones (Cómo llegar + Compartir, sin redes) — a la
  izquierda, círculos idénticos, **sin ningún rectángulo alrededor de Compartir**.
- **`02-lugar-3-acciones.png`:** 3 acciones (+ Instagram) — repartidas a todo el ancho.
- **`03-lugar-4-acciones.png`:** 4 acciones (+ Facebook) — repartidas a todo el ancho; nombre y dirección al
  tope de longitud («Centro Cultural Interdisciplinario de las Artes Vivas y la Memoria Comunitaria del
  Barrio de Tequisquiapan», dirección con interior), envuelve en varias líneas sin desbordar.
- **`04-lugar-6-acciones.png`:** 6 acciones (+ WhatsApp) — carril deslizable, asoma la siguiente (WhatsApp
  cortado en el borde derecho), sin scroll de página.
- **`05-artista-2-enlaces.png`:** ficha de artista, 2 enlaces (Instagram + Spotify) — a la izquierda.
- **`06-artista-3-enlaces.png`:** 3 enlaces (+ TikTok) — repartidos a todo el ancho; nombre de artista al
  tope de longitud («Ensamble Comunitario de Percusiones y Danza Contemporánea del Altiplano Potosino»).
- **`07-evento-compartir.png`:** ficha de evento, sus 3 acciones fijas (Compartir, A mi calendario, Cómo
  llegar) — repartidas, Compartir sin rectángulo, título largo sin desbordar.

Las siete se abrieron y revisaron una por una (herramienta `Read`): ningún rectángulo alrededor de
Compartir, círculos idénticos entre `<a>` y `<button>`, sin scroll horizontal, nada fuera de su contenedor.

## Lo que no se tocó

- `src/app/eventos/[id]/page.tsx`: ya cumplía el nuevo canon sin cambios (ver arriba).
- `.publicadoBoton` (el botón «Compartir» de la franja «Recién publicado») no es `.accion`: es un botón con
  borde/fondo propios y a propósito (`border: 1px solid var(--texto)`), no el bug reportado; no se tocó.
- Ningún otro archivo de `Ficha.module.css` fuera del bloque 3 (Acciones secundarias) y su comentario.
- Sin migración, sin cambios de datos, sin tocar `package.json`/`package-lock.json`.

## Correos en el diff

`git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` no encontró ninguna dirección.

## Cierre

Commit en `ficha-boton-compartir-y-reparto` y `git push -u origin ficha-boton-compartir-y-reparto` (autorizado
en este encargo). El PR lo abre el gestor.
