# OPEN_LOOPS — somosnosotros

**Last updated:** 2026-09-13 — Fase 2 (lugares) construida en PR #3 (`fase-2-lugares`, bitácora [004](../bitacora/2026/09/004-fase-2-lugares.md)); migración 0002 aplicada; flujo probado contra la base real. Falta merge y la prueba de la fase (10 lugares desde el teléfono). Fases 0 y 1 cerradas. Ciudad inicial San Luis Potosí; español; publican admin + usuarios.

**Fuente única de estado: este archivo.** Definición: [`docs/DEFINICION.md`](../DEFINICION.md). Plan: [`docs/PLAN.md`](../PLAN.md).

## Ahora

- **OL-003 · Fase 2 (lugares)** — código en PR #3, verificado (lint, typecheck, 23 tests, build, capturas 390×844). Migración 0002 aplicada (duplicados a <150 m, portadas). Probado contra la base real: alta con autocompletado y pin, ficha, lista con búsqueda, panel con tres alturas, "¿Es este?", ocultar/mostrar por admin, RLS para anónimos. Pasos que quedan:
  1. **Merge del PR #3** → producción.
  2. **Prueba de la fase** en el iPhone: 10 lugares reales cargados desde el teléfono, cada uno en menos de un minuto (la lista la gestiona el founder). Revisar en cada uno que la dirección sugerida sea la correcta y ajustar el pin si hace falta.
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
