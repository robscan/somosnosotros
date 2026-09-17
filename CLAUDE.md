# somosnosotros — instrucciones del proyecto

Plataforma sin fines de lucro: directorio de centros culturales y agenda de eventos para que la gente local se conozca. Empieza en San Luis Potosí. Español. Web móvil (PWA), tema claro. Dominio somosnosotros.org. Repo `robscan/somosnosotros` (PÚBLICO: ningún secreto en git; tokens y llaves solo en Vercel y Supabase).

## Lee primero
1. `docs/ops/OPEN_LOOPS.md` — estado del proyecto (única fuente de verdad).
2. `docs/DEFINICION.md` — qué es, para quién, qué no es, reglas.
3. `docs/PLAN.md` — fases 0→5 con su prueba; modelo de datos de 5 tablas.

## Stack (decidido, no re-litigar)
Next.js (App Router, TypeScript) · Supabase (Postgres + Auth + Storage, proyecto nuevo) · Mapbox GL JS (estilo claro de la cuenta del founder, token restringido al dominio) · Vercel. Sin app de tienda: la app es la web instalada en el inicio del teléfono. El founder decidió la app de iPhone en la tienda y la detuvo la misma noche (2026-09-16): no suma valor todavía y, en fase de pruebas, cada actualización costaría el doble. Sin capacidades nativas de iOS, sin fotos del carrete, sin Apple Health, sin "pasaporte".

## Cómo se trabaja
- Una fase a la vez; la siguiente no empieza hasta que la anterior pase su prueba en el iPhone del founder (Safari).
- Mantenerlo simple: si una pieza no sirve a registrar usuarios, lugares o eventos, o a que la gente se conozca, no entra.
- Publican el admin y los usuarios registrados por su cuenta. El admin edita u oculta cualquier cosa.
- Frases llanas con el founder: nada de jerga (spike, doctrina, gate) sin explicarla en una línea. No pedirle datos que ya dijo que gestiona él (interés de los centros, lista de lugares).
- Git: reglas en `docs/ops/GESTION_DE_CAMBIOS.md` (obligatorias: hay varios chats a la vez). Antes de empezar cualquier pieza, informar al chat de gestión de cambios y esperar sus instrucciones (founder, 2026-09-17). Cada pieza en su rama, nunca código sobre `main`; `git add` por nombre, nunca `-A`; número de bitácora y de OL con `scripts/ops/siguiente-bitacora.sh`; commit local al cerrar el chat siempre; push y merge solo cuando el founder lo pida. Un PR por fase o pieza grande. Bitácora numerada en `docs/bitacora/AAAA/MM/NNN-*.md` por sesión y una línea propia en `OPEN_LOOPS.md` al cerrar.
- Nada se declara verificado sin evidencia: build verde + tests + una captura móvil (390×844) del estado.
- UI: skill `front-visual` (mirar la pantalla antes de razonar). Decisiones grandes de producto: skill `council`.
- `docs/heredado/` son 10 documentos traídos de Flowya con su procedencia; no editarlos a mano (se regeneran con `scripts/heredar.sh`). Un doc heredado vale cuando una fase lo use; si estorba, se borra.

## Verificación rápida
```
npm run lint && npm run typecheck && npm test
```
(los scripts se crean en la Fase 0).
