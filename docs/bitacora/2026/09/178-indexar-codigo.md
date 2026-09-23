# 178 · Indexación: los nueve cambios de código (OL-143)

**Fecha:** 2026-09-23 · **Rama:** `indexar-codigo`, desde `origin/main` (`122673c`) · **OL:** OL-143 (pieza E6) · **Modelo:** Sonnet 5

## De dónde sale

`docs/rediseno/36-indexar-catalogo.md` (OL-142, bitácora 177, ya en `main`) evaluó qué le falta al catálogo para que Google lo entienda y dejó una lista de nueve cambios de código («§5. Cambios de código para encargar después»). Esta pieza los aplica todos.

## Qué había ya

Al leer el código antes de tocar nada: la ficha de evento (`src/app/eventos/[id]/page.tsx`) ya llevaba JSON-LD `Event` (`jsonLdEvento`, `src/lib/eventos.ts`), hecho en una pieza anterior (OL-059, bitácora 088) — el documento 36 no lo detectó. No hizo falta ningún cambio ahí; se cuenta como uno de los nueve porque ya cumple lo pedido.

## Los nueve cambios

1. **Canonical por slug** en las tres fichas (`alternates.canonical`): `src/app/lugares/[id]/page.tsx`, `src/app/artistas/[id]/page.tsx`, `src/app/eventos/[id]/page.tsx`.
2. **JSON-LD `Event`**: ya existía (arriba). Sin cambios.
3. **JSON-LD `Place`** en la ficha de lugar: `jsonLdLugar` (nuevo `src/lib/estructurados.ts`), con nombre, dirección, ciudad, geo, imagen y url; solo si el lugar es visible y no privado (lo mismo que vería un visitante sin sesión).
4. **JSON-LD `Person`/`PerformingGroup`** en la ficha de artista: `jsonLdArtista` (mismo archivo), `Person` para "solista", `PerformingGroup` para "grupo" o "colectivo" (`tipo !== "solista"`); `sameAs` solo con las redes ya públicas y registradas en la ficha, nunca un dato de contacto. Se omite en una ficha oculta o del CAPO sin reclamar y sin indexar (mismo interruptor que ya usa `generateMetadata` con `CAPO_SIN_RECLAMAR_EN_SITEMAP`).
5. **`WebSite`** en `src/app/layout.tsx` (`jsonLdSitio`, una sola vez, para todo el sitio) y **`BreadcrumbList`** en las tres fichas (`jsonLdMigajas`; Inicio › Lugares/Artistas/Agenda › Nombre).
6. **Twitter Card e imagen por defecto** en las fichas de lugar y artista: `card: "summary_large_image"`; sin portada o foto, `/portada.png` (ya existía) para que el enlace compartido nunca salga sin imagen — así también en Open Graph, que antes mandaba `images: undefined` sin portada.
7. **`noindex`** (`robots: { index: false, follow: false }`) en `src/app/lugares/nuevo/page.tsx`, `src/app/artistas/nuevo/page.tsx`, `src/app/eventos/nuevo/page.tsx`, `src/app/lugares/[id]/editar/page.tsx`, `src/app/artistas/[id]/editar/page.tsx`, `src/app/eventos/[id]/editar/page.tsx` y `src/app/novedades/page.tsx`.
8. **Cabecera `X-Robots-Tag`** para esas mismas siete rutas en `next.config.ts` (respaldo, como ya estaba hecho con `/admin`, `/ajustes`, etc.).
9. IndexNow: **no aplica** (opcional en el propio documento 36, y depende de que el founder dé de alta Bing primero).

## Decisiones que ya venían tomadas (no se relitigan aquí)

Los eventos que ya pasaron siguen indexables; las fichas del CAPO sin reclamar siguen indexables; perfiles de usuario, ajustes, administración y Pincel no se indexan (ya estaba así, sin cambios en esta pieza). Sin datos personales en ningún JSON-LD: ninguna de las cuatro funciones nuevas recibe ni manda correo o teléfono — solo lo que la propia ficha ya enseña.

## Archivo de apoyo y pruebas

`src/lib/estructurados.ts` (nuevo): `jsonLdLugar`, `jsonLdArtista`, `jsonLdSitio`, `jsonLdMigajas`, funciones puras, sin tocar la base — mismo patrón que `jsonLdEvento`. `src/lib/estructurados.test.ts` (nuevo, 9 pruebas): una por tipo de página —
- `jsonLdLugar`: manda `Place` con geo y url absoluta; omite dirección/descripción/imagen si faltan; las manda si están.
- `jsonLdArtista`: `Person` para solista, `PerformingGroup` para grupo; omite `sameAs`/descripción/imagen si faltan; con redes las manda en `sameAs` y nunca un correo o teléfono (`mailto:`, `tel:` o algo con forma de correo).
- `jsonLdSitio`: el `WebSite` exacto.
- `jsonLdMigajas`: arma la lista en orden y no duplica el dominio si la url ya lo trae.

## Evidencia

`npm run lint` (1 aviso preexistente, ajeno: `docs/diseno/logotipo/iconos-sn.mjs`), `npm run typecheck`, `npm test` (**1049 pruebas**, antes 1040: las 9 nuevas de `estructurados.test.ts`) y `npm run build`: los cuatro en verde.

### `next start`, sin backend real

Este árbol no tiene Supabase local (sin `supabase` CLI, sin `docker`, sin dependencia PGlite en `package.json`): no hay forma barata de levantar un respaldo con datos reales sin gastar de más en infraestructura para una pieza que es de metadatos, sin lógica de datos nueva. Se corrió igual `npm run build && npm run start` (puerto 3000, sin `.env.local`, `clienteServidor()` devuelve `null` sin variables) para comprobar lo que sí se puede ver sin base de datos: el `WebSite` (en cada página, porque vive en el layout) y el `noindex` de las páginas privadas, con curl real.

**Página privada (`/lugares/nuevo`, sin sesión: se ve antes del redirect a `/entrar`, es la carga inicial que ya lleva la etiqueta):**
```
$ curl -sD - -o /dev/null http://localhost:3000/lugares/nuevo
HTTP/1.1 200 OK
X-Robots-Tag: noindex, nofollow
```
Y en el HTML servido:
```html
<meta name="robots" content="noindex, nofollow"/>
```
Igual en `/artistas/nuevo`, `/eventos/nuevo`, `/lugares/x/editar` y `/novedades` (los cinco probados, misma cabecera `X-Robots-Tag: noindex, nofollow`).

**`WebSite` (una sola vez, en el `<body>` del layout, se ve en cualquier página):**
```html
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Somos Nosotros","url":"https://somosnosotros.org"}</script>
```

**Una ficha de cada tipo (`/lugares/algo`, `/artistas/algo`, `/eventos/algo`):** sin datos que traer (no hay backend), la página cae a `notFound()` — `<title>Lugar · Somos Nosotros</title>`, `<meta name="robots" content="noindex"/>` (el 404 de Next, no relacionado con esta pieza). No hay curl real de `Place`, `Person` ni `BreadcrumbList` con datos: eso lo comprueban las 9 pruebas puras de `estructurados.test.ts` con exactamente los mismos datos que la página ya muestra, y se confirmó que el código de las tres fichas quedó en el artefacto de build: `grep -rl "PostalAddress\|PerformingGroup\|BreadcrumbList" .next/server/` encuentra los tres en los chunks de servidor compilados.

**Límite honesto:** falta la comprobación con datos reales (una ficha de verdad, con `Place`/`Person`/`BreadcrumbList` de verdad en el HTML servido) — pide un respaldo local con datos inventados como el de bitácoras anteriores (163, 174); no se montó aquí por costo. Si el gestor quiere esa captura antes de integrar, dar la URL de un respaldo local (o la señal para levantar uno) y se repite el curl con datos.

## Antes de entregar

`git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'`: sin resultados, ningún correo. `git status`: limpio tras el commit. `package.json` y el lock, intactos (`npm ci` para instalar lo que faltaba en `node_modules`, sin tocar ninguno de los dos archivos).

## Archivos

Nuevos: `src/lib/estructurados.ts`, `src/lib/estructurados.test.ts`, esta bitácora.
Modificados: `src/app/layout.tsx`, `src/app/lugares/[id]/page.tsx`, `src/app/artistas/[id]/page.tsx`, `src/app/eventos/[id]/page.tsx`, `src/app/lugares/nuevo/page.tsx`, `src/app/artistas/nuevo/page.tsx`, `src/app/eventos/nuevo/page.tsx`, `src/app/lugares/[id]/editar/page.tsx`, `src/app/artistas/[id]/editar/page.tsx`, `src/app/eventos/[id]/editar/page.tsx`, `src/app/novedades/page.tsx`, `next.config.ts`, `docs/ops/OPEN_LOOPS.md`.
