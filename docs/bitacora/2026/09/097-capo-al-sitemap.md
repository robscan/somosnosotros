# 097 · Los artistas del CAPO sin reclamar, al mapa del sitio y a Google

**Fecha:** 2026-09-17 · **Rama:** `capo-al-sitemap`, desde `origin/main` f8e4b57 · **OL:** OL-066 (cierra la pregunta pendiente de OL-018 y OL-059) · **PR:** pendiente

## De dónde sale

Al ver en producción la pantalla "Cómo va la comunidad" (bitácora [090](090-panel-como-va.md), desplegada con el [PR #94](https://github.com/robscan/somosnosotros/pull/94)), el founder contestó en el chat:

> «firmo, y si entran todos los contenidos del sitio.»

Dos cosas en una frase: firma la pantalla tal cual está desplegada, y contesta la pregunta que había quedado abierta desde el mapa del sitio (OL-059, bitácora 088, y antes OL-018): si los 520 artistas traídos del Catálogo de Artistas Potosinos (CAPO) que todavía no han reclamado su ficha deben entrar al `sitemap.xml` y, con ello, al índice de Google. La respuesta es sí — «todos los contenidos del sitio».

## Instrucciones de gestión de cambios

Números para esta pieza: rama `capo-al-sitemap` desde el `origin/main` del momento (f8e4b57), bitácora **097**, **OL-066**. OL-059 no se reabre: se le añade una línea diciendo que la pregunta pendiente quedó resuelta y apunta a OL-066. El cambio de código se acota al interruptor en `src/lib/sitemap.ts` y sus pruebas — **no tocar el resto de la pieza de SEO** (`robots.ts`, las cabeceras `X-Robots-Tag`, el JSON-LD de eventos, `TituloInstalada`, etc., ya en producción y fuera de esta pieza). En la bitácora, dejar la cuenta esperada del sitemap (156 → unas 676 URL) y anotar que el founder firmó "Cómo va la comunidad" tal cual.

## Qué se hizo

Un solo interruptor, ya existente, cambiado de valor — nada de lógica nueva:

- **`src/lib/sitemap.ts`:** `CAPO_SIN_RECLAMAR_EN_SITEMAP` pasa de `false` a `true`, con el comentario actualizado citando la decisión del founder, su fecha y sus palabras textuales. La función `artistasParaSitemap()` no cambió — ya leía este interruptor (`a.origen !== "capo" || a.reclamado || CAPO_SIN_RECLAMAR_EN_SITEMAP`); solo cambia lo que decide.
- **`src/lib/sitemap.test.ts`:** la prueba que antes esperaba que un artista del CAPO sin reclamar quedara *fuera* del mapa ahora espera que quede *dentro* (dos artistas, uno reclamado y otro no, los dos deben salir). Se añadió una prueba nueva que fija el valor del interruptor (`true`) junto con el comportamiento del mapa, con un comentario que explica la otra cara del mismo interruptor: `src/app/artistas/[id]/page.tsx` calcula su `noindex` con `!CAPO_SIN_RECLAMAR_EN_SITEMAP` — en `true`, esa ficha ya nunca lleva `noindex` por esa causa, sin tocar ese archivo (ya lee la misma constante compartida). Esta prueba avisará sola si algún día alguien apaga el interruptor sin querer, en vez de que las dos caras se desincronicen en silencio. 10 pruebas en el archivo (antes 9).

No se tocó `robots.ts`, las cabeceras `X-Robots-Tag`, `artistas/[id]/page.tsx`, ni ningún otro archivo de la pieza de SEO ya desplegada — igual que pidió gestión de cambios.

## La cuenta esperada

El `sitemap.xml` de producción trae hoy unas **156 URL** (rutas fijas + lugares + eventos + los artistas propios y los del CAPO ya reclamados). Con el interruptor en `true` entran también los **520 artistas del CAPO sin reclamar**, así que el total esperado en producción, tras el despliegue, es de unas **676 URL**. Este árbol de trabajo no tiene base de datos propia (no hay Supabase local en esta rama), así que la cuenta exacta la confirma gestión de cambios en producción después del merge.

## Verificado

- `npx vitest run src/lib/sitemap.test.ts`: 10/10 en verde.
- `npm run lint && npm run typecheck && npm test`: verdes, **344 pruebas** en total, sin roturas en otros archivos.
- `npm run build`: verde.

Sin captura móvil: esta pieza no cambia ninguna pantalla (es un interruptor en un archivo de datos, `sitemap.xml`/robots no son algo que se vea en el navegador del founder), así que no aplica `front-visual`.

## Firma

El founder firmó **"Cómo va la comunidad"** tal cual quedó desplegada en producción, sin pedir cambios — esa firma cierra OL-060 (bitácora [090](090-panel-como-va.md)). En el mismo mensaje contestó la pregunta pendiente de esta pieza.

## Pendiente

- Mandar el hash a gestión de cambios para que suba la rama.
- Gestión de cambios confirma en producción que el `sitemap.xml` pasa de 156 a unas 676 URL tras el merge.
- Aviso informativo de gestión de cambios (no bloquea esta pieza): las fichas de artistas del CAPO sin reclamar ya pueden salir en resultados de Google por su nombre, aunque nadie las haya reclamado — es información ya pública del catálogo municipal, y el aviso de privacidad lo explica. Si el founder quiere, la tanda diaria de invitación por correo del CAPO podría avisarle a cada artista que su ficha ya es buscable y cómo pedir que se quite; eso sería una pieza aparte, a su criterio.
