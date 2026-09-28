# Auditoría de la interfaz (OL-227, bitácora 256)

Herramientas con las que se midió la app para el doc `docs/rediseno/50-restructura-ui.md`. Son de operación, no
código de la app; sirven para repetir la medición en cada pieza de la reestructura (plan P11: convertirlas en pruebas).

- `inventario-css.mjs`: parsea los `.module.css` y `globals.css` (PostCSS del propio `node_modules`) y escribe
  `inventario-css.json` con tokens, medidas y colores en duro, alturas fijas, `z-index`, posiciones y bloques duplicados.
  `node scripts/ops/auditoria-ui/inventario-css.mjs`
- `medir.js`: lo que se evalúa dentro de cada página (nodos, profundidad, envoltorios, desbordes, márgenes negativos,
  apilamiento, toques < 44, solapes). `auditar.mjs` lo corre con el Chrome real de la Mac vía `playwright-core`
  (instalado con `npm install playwright-core --no-save` en una carpeta fuera del repo, nunca en `package.json`):
  `node auditar.mjs <base> <pantallas.json> <dirPng> <dirJson> [cookies.json|-] [movil,tableta,escritorio]`.
  `resumir.mjs <dirJson> [filtro]` imprime el resumen; `medidas.mjs <base> [cookies.json]` mide los defectos concretos.
- `comprimir.mjs <destino> origen.png=nombre.png …`: copia capturas al repo como PNG de paleta (sharp del `node_modules`).
- `respaldo-local/`: Auth y PostgREST inventados (`node server.mjs 8823`) sobre `fixture.mjs` (personas `*@example.com`,
  lugares y eventos verosímiles, carteles públicos de `imagenes.json`). La app se apunta con un `.env.local` temporal
  (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8823`, llave anon inventada), `next build && next start -p 3100`, y la
  sesión es la cookie `sb-127-auth-token` que exporta `fixture.mjs` (`cookie`). Nunca toca producción ni un `.env`.
