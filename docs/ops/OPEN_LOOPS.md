# OPEN_LOOPS — somosnosotros

**Last updated:** 2026-09-13 — **Fase 4 (comunidad) en producción** (PR #12 mergeado; bitácora [011](../bitacora/2026/09/011-fase-4-comunidad.md)). Faltan las llaves de correo (Resend, CRON_SECRET) y la prueba de la fase. Fases 0–3 cerradas. Ciudad inicial San Luis Potosí; español; publican admin + usuarios.

**Fuente única de estado: este archivo.** Definición: [`docs/DEFINICION.md`](../DEFINICION.md). Plan: [`docs/PLAN.md`](../PLAN.md).

## Ahora

- **OL-005 · Fase 4 (comunidad)** — código en PR #12, verificado (lint, typecheck, 49 tests, build) y probado contra la base real con dos usuarios desechables: "Voy" / "Me interesa" con lista de quiénes van (aplicado solo al volver de entrar), seguir lugares, perfil público, "Voy a" y "Sigo" en Mi perfil. Avisos por correo listos pero **sin llave**: (1) cuenta en resend.com, dominio somosnosotros.org verificado y llave de API; (2) en Vercel (sensibles): `RESEND_API_KEY`, `CORREO_REMITENTE`, `CRON_SECRET`; el cron de recordatorios corre a las 9:00 de la ciudad. En producción (PR #12 mergeado). Pasos: llaves → **prueba de la fase**: el founder confirma que dos personas coincidieron en un evento gracias a la plataforma.
- Pendiente de la Fase 1 (no bloquea): que una segunda persona se registre. **Google** opcional: credenciales OAuth en Google Cloud con redirect `https://<ref>.supabase.co/auth/v1/callback`; Client ID y Secret en Supabase → Authentication → Providers → Google.
- Pendientes menores de la Fase 0 (no bloquean): fuentes "Noto Sans Medium/Bold" ausentes en la cuenta de Mapbox (404, usa la de reserva); variables de Mapbox y Anthropic solo en Production.

## Después (orden del plan)

OL-006 Alcance (PWA instalable, push, reportar contenido, panel de administración, segunda ciudad).

## Cerrado

- **OL-004 · Fase 3 (eventos)** — 2026-09-13. Publicar en dos acciones, agenda, ficha compartible con vista previa, calendario, duplicar; luego fecha con un toque, toque instantáneo, otro sitio y sitio reservado, lectura del cartel, alta una cosa a la vez. Cerrada por el founder ("Cierra y avanza"). Bitácoras [006](../bitacora/2026/09/006-fase-3-eventos.md)–[010](../bitacora/2026/09/010-alta-de-evento-una-cosa-a-la-vez.md).

- **OL-003 · Fase 2 (lugares)** — 2026-09-13. Alta desde el teléfono con Mapbox encontrando el lugar, mapa con pins, panel con tres alturas, ficha, anti-duplicados. Cerrada por el founder tras rehacer el alta sin teclear (PR #4): "la experiencia ya funciona". Bitácoras [004](../bitacora/2026/09/004-fase-2-lugares.md) y [005](../bitacora/2026/09/005-alta-de-lugar-sin-teclear.md).

- **OL-002 · Fase 1 (usuarios)** — 2026-09-13. Enlace mágico, perfil, borrar cuenta, roles, migración base. El founder entró desde el iPhone; su cuenta es admin. Bitácora [003](../bitacora/2026/09/003-fase-1-usuarios.md).

- **OL-001 · Fase 0 (base)** — 2026-09-13. Prueba pasada: el mapa de San Luis Potosí abre en Safari del iPhone en somosnosotros.org. Bitácora [002](../bitacora/2026/09/002-fase-0-base.md).

## Decidido

- Nombre/dominio: somosnosotros.org · repo `robscan/somosnosotros` (público → ningún secreto en git).
- Supabase: proyecto **nuevo y limpio** (sin datos ni esquema de Flowya), región East US, conectado a Vercel por la integración oficial Supabase↔Vercel, que crea y gestiona sus variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, Postgres, service role). Si cambian llaves, se rotan desde esa integración, no a mano. El esquema (5 tablas + permisos) se crea en la Fase 1 con la primera migración.
- Stack: Next.js 16 + Supabase + Mapbox GL JS 3 + Vercel. Web móvil instalable (PWA en Fase 5); sin app de tienda en V1.
- Fase 0: sin Tailwind (CSS modules), fuente del sistema, vitest 3 sin jsdom, variables solo `NEXT_PUBLIC_*` (ninguna secreta en el código). Panel inferior solo en estado "asomado" hasta que haya contenido.
- No se heredan capacidades nativas de iOS (fotos, Health) ni el concepto de pasaporte.
- Herencia de Flowya reducida a 10 documentos en `docs/heredado/` (se regeneran con `scripts/heredar.sh`).
