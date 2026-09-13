# OPEN_LOOPS — somosnosotros

**Last updated:** 2026-09-13 — **Fase 1 cerrada**: el founder entró desde el iPhone con el enlace del correo y su cuenta es admin (bitácora [003](../bitacora/2026/09/003-fase-1-usuarios.md)). Sigue OL-003 Lugares. Ciudad inicial San Luis Potosí; español; publican admin + usuarios.

**Fuente única de estado: este archivo.** Definición: [`docs/DEFINICION.md`](../DEFINICION.md). Plan: [`docs/PLAN.md`](../PLAN.md).

## Ahora

- **OL-003 · Fase 2 (lugares)** — próxima. Alta de lugar desde el teléfono: nombre, tipo, dirección con autocompletado de Mapbox → pin ajustable con el dedo, descripción corta, redes/contacto, portada. Mapa con pins + lista; ficha del lugar; búsqueda por nombre; anti-duplicados (mismo nombre a <150 m avisa "¿es este?"). Aquí entra el panel inferior con sus estados (peek/medium/expanded) y se decide si conviene Tailwind + shadcn (Drawer). Prueba: 10 lugares reales cargados desde el teléfono, cada uno en menos de un minuto. La lista de lugares la gestiona el founder.
- Pendiente de la Fase 1 (no bloquea): que una segunda persona se registre (completa la prueba tal como la define el plan). **Google** opcional: credenciales OAuth en Google Cloud con redirect `https://<ref>.supabase.co/auth/v1/callback`; Client ID y Secret en Supabase → Authentication → Providers → Google.
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
