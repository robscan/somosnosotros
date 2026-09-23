# 36 · Indexar el catálogo en Google y buscadores

**OL-142 · bitácora 177 · 2026-09-23.** Evaluación corta, solo documento, sin cambios de código. Pedido del founder: «Indexar a Google y buscadores el catálogo». (Ya existe `31-agendas-por-correo.md`; este archivo lleva el mismo número porque así se encargó.)

**Conclusión:** la base ya está bien armada (robots, mapa del sitio, títulos y Open Graph por ficha, `noindex` donde toca). Faltan tres cosas para que Google entienda el catálogo y no solo lo rastree: **datos estructurados** (no hay ninguno), **canonical en las fichas** y **`noindex` en las páginas de alta y edición**. Y falta lo que solo puede hacer el founder: dar de alta el dominio en Google Search Console y Bing.

## 1. Qué hay hoy

Comprobado en el código y en producción (solo lectura, 2026-09-23).

- **`robots.txt`** (`src/app/robots.ts`): permite todo, bloquea solo `/avisos` y `/auth`, y apunta al mapa. Producción devuelve exactamente eso. No bloquea `/admin`, `/ajustes` ni `/perfil` a propósito: un `disallow` impediría que Google lea su `noindex` (razón explicada en el propio archivo).
- **Mapa del sitio** (`src/app/sitemap.ts`, reglas en `src/lib/sitemap.ts`, se renueva cada hora): producción lista 5 páginas fijas (`/`, `/lugares`, `/artistas`, `/reglas`, `/privacidad`), 60 lugares, 70 eventos y 573 artistas, todos con dirección por slug y fecha de última modificación. Solo entran lugares visibles no privados, eventos visibles que no han terminado y artistas visibles (los 520 del CAPO sin reclamar entran por decisión del founder del 2026-09-17).
- **Metadatos por página:** `generateMetadata` en inicio, lugares, artistas y en las fichas de lugar, artista y evento, con título, descripción y Open Graph (`og:title`, `og:description`, `og:url`, `og:image`, `og:type`, `es_MX`). El evento y el inicio también llevan Twitter Card; la ficha de lugar y la de artista, no. El evento que ya pasó no anuncia fecha ni imagen al compartir.
- **`noindex`:** ya lo llevan `/admin` (todas), `/ajustes`, `/perfil`, `/entrar`, `/borrado`, `/personas/[id]`, y `/obra/[id]/pared` y `/mando`. Además, `next.config.ts` manda la cabecera `X-Robots-Tag: noindex` en `/admin`, `/ajustes`, `/perfil`, `/personas`, `/entrar` y `/borrado`.
- **Lo que falta hoy** (comprobado por búsqueda en `src/`): no hay ningún JSON-LD (schema.org); las fichas de lugar, artista y evento no declaran `canonical`; `/lugares/nuevo`, `/artistas/nuevo`, `/eventos/nuevo` y las tres pantallas `editar` no tienen `noindex`; `/novedades` tampoco.

## 2. Qué debe indexarse y qué no

| Sí | No |
|---|---|
| Inicio (agenda) y las listas `/lugares` y `/artistas` (con su canonical por ciudad, ya hecho) | Perfiles de personas `/personas/…` y toda la cuenta: `/perfil`, `/ajustes`, `/novedades`, `/entrar`, `/borrado` |
| Fichas por slug: `/lugares/…`, `/artistas/…`, `/eventos/…` | Administración `/admin/…` |
| `/reglas` y `/privacidad` | Pincel: `/obra/…/pared` y `/mando` |
| | Alta y edición: `/…/nuevo` y `/…/editar` (piden sesión, pero conviene decirlo explícito) |
| | Baja de correo y acceso: `/avisos`, `/auth` (ya bloqueados en `robots.txt`) |

Dos decisiones para el founder: **(a)** los eventos que ya pasaron salen del mapa pero su página sigue existiendo y se puede indexar; se propone dejarlos así (historial útil, sin fecha anunciada); **(b)** las fichas de artistas del CAPO sin reclamar siguen indexables, como ya se decidió; si alguna persona pide que su ficha no salga, se usa el interruptor por ficha que ya existe.

## 3. Datos estructurados y Open Graph

Mínimo propuesto, en JSON-LD dentro de cada ficha, con los datos que la página ya muestra (nada nuevo, nada de personas particulares):

- **Evento → `Event`:** `name`, `startDate`, `endDate` (con zona), `eventStatus`, `eventAttendanceMode` (presencial), `location` (`Place` con nombre y dirección, o el sitio), `image`, `description`, `offers` (precio, o gratis con `price: 0`), `url`. Sin `organizer` a nombre de persona.
- **Lugar → `Place`** (o `LocalBusiness` no: son centros culturales): `name`, `address`, `geo` (lat/lng), `image`, `url`, `description`.
- **Artista → `Person` o `PerformingGroup`** según el tipo de ficha: `name`, `description`, `image`, `url`, `sameAs` con sus redes públicas registradas. Nunca datos de contacto que no sean ya públicos.
- **Inicio → `WebSite`** con `name` y `url`; **`BreadcrumbList`** en las fichas (Inicio › Lugares › Nombre).

Open Graph que falta: Twitter Card en las fichas de lugar y de artista (hoy solo evento e inicio); `og:image:alt`; imagen por defecto (`/portada.png`, ya existe) cuando la ficha no tiene foto, para que el enlace compartido nunca salga sin imagen; y `article:published_time` no hace falta.

## 4. Lo que hace el founder

**Google Search Console**
1. Entrar a search.google.com/search-console con la cuenta del proyecto y añadir la propiedad «Dominio» `somosnosotros.org`; Google da un registro TXT.
2. Ponerlo en el DNS del dominio y pulsar «Verificar» (si el DNS no se puede tocar, usar «Prefijo de URL» con `https://somosnosotros.org` y la verificación por archivo HTML).
3. En «Sitemaps» añadir `sitemap.xml`; después, en «Inspección de URL», pedir indexar el inicio y una ficha de cada tipo.

**Bing Webmaster Tools**
1. Entrar a bing.com/webmasters, elegir «Importar desde Google Search Console» (ahorra la verificación) o añadir el sitio a mano.
2. Enviar `https://somosnosotros.org/sitemap.xml` en «Sitemaps».
3. Activar IndexNow si lo ofrece (avisa a Bing de cada ficha nueva; queda para la lista de abajo).

Después de una semana, mirar en Search Console «Páginas» (cuántas están indexadas y cuáles no y por qué) y «Datos estructurados» cuando se instalen.

## 5. Cambios de código para encargar después

1. Canonical por slug en las tres fichas: `src/app/lugares/[id]/page.tsx`, `src/app/artistas/[id]/page.tsx`, `src/app/eventos/[id]/page.tsx` (`alternates.canonical`).
2. JSON-LD `Event` en `src/app/eventos/[id]/page.tsx`, con prueba pura del objeto (nuevo `src/lib/estructurados.ts`).
3. JSON-LD `Place` en `src/app/lugares/[id]/page.tsx` (mismo archivo de apoyo).
4. JSON-LD `Person`/`PerformingGroup` en `src/app/artistas/[id]/page.tsx`.
5. `WebSite` en `src/app/layout.tsx` y `BreadcrumbList` en las tres fichas.
6. Twitter Card y imagen por defecto en las fichas de lugar y artista (los mismos `generateMetadata`).
7. `noindex` en `src/app/lugares/nuevo/page.tsx`, `src/app/artistas/nuevo/page.tsx`, `src/app/eventos/nuevo/page.tsx`, las tres `…/editar/page.tsx` y `src/app/novedades/page.tsx`.
8. Cabecera `X-Robots-Tag` para esas mismas rutas en `next.config.ts` (respaldo, como ya se hizo con `/admin`).
9. Opcional: IndexNow al publicar o editar una ficha (llave en Vercel, llamada desde las acciones de guardado); no antes de que el founder dé de alta Bing.
