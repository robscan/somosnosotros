# 177 · Indexar el catálogo en Google y buscadores

**Fecha:** 2026-09-23 · **Rama:** `indexar-catalogo`, desde `origin/main` · **OL:** OL-142 · **Modelo:** Sonnet 5, esfuerzo bajo · **Solo documento.**

Pedido del founder: «Indexar a Google y buscadores el catálogo». Entrega: [docs/rediseno/31-indexar-catalogo.md](../../../rediseno/31-indexar-catalogo.md).

Lo medido: `robots.txt` de producción permite todo y bloquea solo `/avisos` y `/auth`; el mapa del sitio de producción lista 5 páginas fijas, 60 lugares, 70 eventos y 573 artistas (solo lectura con `curl`). La base ya estaba bien armada; faltan datos estructurados (ninguno hoy), canonical en las tres fichas y `noindex` en las páginas de alta, edición y `/novedades`. Sin captura: no hay pantalla nueva. Sin código.

Nota: el número 31 ya lo usa `31-agendas-por-correo.md`; se dejó el nombre pedido. El documento lista nueve cambios para encargar y los pasos del founder para Google Search Console y Bing. Ningún correo en el diff. Commit local, sin push.
