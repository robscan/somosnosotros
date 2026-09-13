# OPEN_LOOPS — somosnosotros

**Last updated:** 2026-09-13 — **Fase 2 (lugares) en producción** (PR #3 mergeado; bitácora [004](../bitacora/2026/09/004-fase-2-lugares.md)). Falta la prueba de la fase: 10 lugares reales desde el teléfono. Fases 0 y 1 cerradas. Ciudad inicial San Luis Potosí; español; publican admin + usuarios.

**Fuente única de estado: este archivo.** Definición: [`docs/DEFINICION.md`](../DEFINICION.md). Plan: [`docs/PLAN.md`](../PLAN.md).

## Ahora

- **OL-003 · Fase 2 (lugares)** — en producción (PR #3 mergeado 2026-09-13). Verificado contra la base real y en producción (`/lugares/nuevo` sin sesión → entrar; inicio con "Registrar un lugar"). **Falta la prueba de la fase** en el iPhone: 10 lugares reales cargados desde el teléfono, cada uno en menos de un minuto (la lista la gestiona el founder). En cada uno, revisar que la dirección sugerida sea la correcta y ajustar el pin con el dedo si hace falta.
- Decisión de UI tomada en esta fase: el panel inferior con gestos se escribió a mano (~100 líneas); no hizo falta Tailwind ni shadcn. Se revisa de nuevo si la Fase 3 (eventos) lo pide.
- Pendiente de la Fase 1 (no bloquea): que una segunda persona se registre. **Google** opcional: credenciales OAuth en Google Cloud con redirect `https://<ref>.supabase.co/auth/v1/callback`; Client ID y Secret en Supabase → Authentication → Providers → Google.
- Pendientes menores de la Fase 0 (no bloquean): fuentes "Noto Sans Medium/Bold" ausentes en la cuenta de Mapbox (404, usa la de reserva); variables de Mapbox solo en Production.

## Después (orden del plan)

OL-004 Eventos → OL-005 Comunidad → OL-006 Alcance.

## Cerrado

- **OL-002 · Fase 1 (usuarios)** — 2026-09-13. Enlace mágico, perfil, borrar cuenta, roles, migración base. El founder entró desde el iPhone; su cuenta es admin. Bitácora [003](../bitacora/2026/09/003-fase-1-usuarios.md).

- **OL-001 · Fase 0 (base)** — 2026-09-13. Prueba pasada: el mapa de San Luis Potosí abre en Safari del iPhone en somosnosotros.org. Bitácora [002](../bitacora/2026/09/002-fase-0-base.md).

## Decidido

- Nombre/dominio: somosnosotros.org · repo `robscan/somosnosotros` (público → ningún secreto en git).
- Supabase: proyecto **nuevo y limpio** (sin datos ni esquema de Flowya), región East US, conectado a Vercel por la integración oficial Supabase↔Vercel, que crea y gestiona sus variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, Postgres, service role). Si cambian llaves, se rotan desde esa integración, no a mano. El esquema (5 tablas + permisos) se crea en la Fase 1 con la primera migración.
- Stack: Next.js 16 + Supabase + Mapbox GL JS 3 + Vercel. Web móvil instalable (PWA en Fase 5); sin app de tienda en V1.
- Fase 0: sin Tailwind (CSS modules), fuente del sistema, vitest 3 sin jsdom, variables solo `NEXT_PUBLIC_*` (ninguna secreta en el código). Panel inferior solo en estado "asomado" hasta que haya contenido.
- No se heredan capacidades nativas de iOS (fotos, Health) ni el concepto de pasaporte.
- Herencia de Flowya reducida a 10 documentos en `docs/heredado/` (se regeneran con `scripts/heredar.sh`).
