# 30 · Botón en las tarjetas de los carriles (OL-106)

**Fecha:** 2026-09-21 · **Rama:** `boton-en-carriles` · **Bitácora:** [141](../bitacora/2026/09/141-boton-en-carriles.md) · Reservados por el gestor.

## Qué pidió el founder

> «Incluye botón voy y seguir en templates de destacados y con eventos en esta semana. (Agenda, lugares y artistas.» (2026-09-21)

Es la continuación natural de OL-104 (bitácora 139, botón en el renglón): las tarjetas de los carriles llevan el mismo botón a la vista, no solo los renglones de las listas.

## Qué se midió (sin tocar código)

### Los cinco carriles, todos hijos de `src/components/Destacados.tsx`

| Pantalla | Carril | Componente | Tamaño de tarjeta | Tipo de entidad |
| --- | --- | --- | --- | --- |
| Agenda (`AgendaInicio.tsx:340`) | Destacados | `grande` | 264 px de foto, ancho `min(440px, 100vw − gutters)` | evento |
| Lugares (`ListaLugares.tsx:75`) | Destacados | `grande` | igual | lugar |
| Lugares (`ListaLugares.tsx:76`) | Con eventos esta semana | normal, `detalleCompleto` | 220 px, foto 132 px | lugar |
| Artistas (`ListaArtistas.tsx:160`) | Destacados | `grande` | igual que Agenda/Lugares (rectangular: `tarjetaArtista` "usa el mismo rectángulo que eventos") | artista |
| Artistas (`ListaArtistas.tsx:161`) | Con eventos esta semana | `redondas`, `detalleCompleto` | **104 px, circular** | artista |

Con una sola tarjeta en el carril (`Destacados.module.css`, `.uno`), la foto se pone a la izquierda y el texto a la derecha (124 px o 93 px de foto), en vez de apilada — variante rara pero existente, hay que cuidarla.

### El tipo `Tarjeta` ya trae lo que hace falta

```ts
export type Tarjeta = { id: string; href: string; foto: string; titulo: string; detalle: string; van: number };
```

`id` y `titulo` son los de la propia entidad de la tarjeta:

- **Destacados de Agenda:** `tarjetaEvento(e)` → `id`/`titulo` del evento. Coincide exactamente con `EventoLista` (`{id, titulo}`), el tipo que ya consume `useAsistenciaEnLista().boton(e)`.
- **Destacados de Lugares/Artistas:** `tarjetaLugar(l)`/`tarjetaArtista(a)` → `id`/`titulo` del lugar o artista.
- **Con eventos esta semana** (`src/lib/eventosSemana.ts`, `tarjetasDeSemana`): **medido con cuidado, porque no es obvio.** La tarjeta no es del evento — es de la ficha (lugar o artista) con su próxima aparición: `id: ficha.id`, `href: /lugares/{id}` o `/artistas/{id}`, `titulo: ficha.nombre`, `detalle` es la fecha del evento. Confirma la recomendación del gestor: el botón de estas tarjetas es **"Seguir" a la entidad de la tarjeta** (el lugar o el artista), no una acción sobre el evento — es literalmente el mismo lugar/artista que ya aparece en la lista de abajo con su propio botón "Seguir".

**Conclusión medida: no hace falta ninguna consulta nueva.** Cada pantalla ya instancia sus hooks para los renglones (`asistenciaTodos` en `AgendaInicio`, `seguir` en `ListaLugares`/`ListaArtistas`) y, como `Tarjeta` ya trae `id`/`titulo`, la misma llamada que arma el botón de un renglón (`asistencia.boton(e)`, `seguir.boton(id, nombre)`) sirve para la tarjeta del carril, sin traer nada más del servidor.

### El botón no debe navegar si hubo arrastre (huboArrastre)

`Destacados.tsx` no usa `ui/Deslizable`: es un carril de **scroll nativo** con `<Link>` normales dentro. `alTocarCarril` (capturado en el `<ul>` con `onClickCapture`) mide `huboArrastre` entre bajar y soltar el dedo y, si lo hubo, hace `e.preventDefault()` para que el `<Link>` no navegue.

**Medido con cuidado — un botón nuevo, sibling del `<Link>`, no queda cubierto por ese `preventDefault()`:** `preventDefault()` solo cancela la acción por defecto del elemento (la navegación del enlace); no detiene la propagación del evento. Como el capturador está en fase de **captura** (antes de llegar al objetivo), sí puede impedir que el clic llegue al botón — pero para eso tiene que llamar también a `e.stopPropagation()`, que hoy no hace. **Sin ese cambio, arrastrar el carril empezando justo sobre el botón dispararía igual "Voy" o "Seguir".** Es el único cambio necesario en `Destacados.tsx` en esta pieza (aparte de pintar el botón): añadir `e.stopPropagation()` junto al `preventDefault()` ya existente, cuando hubo arrastre. `huboArrastre` y `UMBRAL_DECISION` (`lib/deslizar.ts`) no cambian de valor ni de lógica.

## La propuesta

Reutilizar `ui/BotonRenglon` (con una prop nueva, `compacto`, para las tarjetas — no un componente distinto) como hermano del `<Link className="tarjeta">`, nunca anidado dentro (mismo motivo que en los renglones: HTML válido, sin un control interactivo dentro de otro).

### a) Dónde va, sin tapar la foto ni romper la tarjeta redonda

**Recomendación:** siempre **debajo del texto** (`detalle`), nunca sobre la foto. En las tarjetas normales y grandes eso es una fila nueva del grid (`grid-template-areas` gana `"boton"` al final); en la variante `.uno` (una sola tarjeta, foto al lado) el botón ocupa una fila propia a lo ancho de toda la tarjeta, no solo la columna de texto, para no angostarlo. En la redonda (104 px), el botón es la única pieza que no puede seguir la geometría circular: se centra bajo la foto como las demás filas de texto (ya centradas ahí, `text-align: center`), con una versión más compacta (ver (d)).

### b) Tocar la tarjeta abre la ficha; tocar el botón, no

Mismo mecanismo que en los renglones: el botón es hermano del `<Link>`, con su propio `onClick` que hace `stopPropagation()` — nunca llega al `<Link>` ni a `alTocarCarril`. Tocar cualquier otra parte de la tarjeta (foto, título, detalle) sigue abriendo la ficha, sin cambios.

### c) Recorrer el carril desde el botón no debe activarlo

Ver la medición de arriba: `alTocarCarril` gana un `e.stopPropagation()` cuando `huboArrastre` es cierto, además del `preventDefault()` que ya tenía. Con eso, empezar el arrastre justo sobre el botón y soltar en otra tarjeta no dispara "Voy" ni "Seguir" — igual que hoy no navega.

### d) Versión compacta, para no romper la tarjeta

**Recomendación:** `BotonRenglon` gana una prop `compacto` (boolean): mismo comportamiento y mismos colores (invita en `--primario` sólido, decidido en `--primario-suave`), pero:

- en la tarjeta **redonda** (104 px): icono solo, sin la palabra — a 104 px de ancho, "Seguir" con icono no cabe cómodo y "Sigues" tampoco; el icono ya distingue el estado (✓ decidido, + invita) y el `aria-label` sigue diciendo el nombre completo para quien usa lector de pantalla. Sigue midiendo 44×44 px.
- en las tarjetas **normal y grande**: icono + palabra, como en los renglones, porque ahí sí cabe (220 px y 264/440 px de ancho) y la claridad no cuesta espacio.

Ancho de toque siempre 44 px como mínimo, centrado, sin robarle sitio a `detalle` (que sigue en su propia fila, sin recortarse por el botón).

## Siguiente paso

Prototipo en [`prototipos/boton-en-carriles.html`](prototipos/boton-en-carriles.html): tarjeta normal (220 px), grande (2×) y redonda de artista, cada una en sus dos estados del botón, más la variante de una sola tarjeta (`.uno`). Publicado como Artifact para el iPhone del founder, con la pregunta concreta de si el botón compacto (solo icono) en la tarjeta redonda se entiende sin la palabra, y si la fila debajo del texto se ve bien en los tres tamaños. Código solo tras su firma.
