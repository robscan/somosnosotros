# OPEN_LOOPS — somosnosotros

**Last updated:** 2026-09-13 — **Fase 0 cerrada**: el founder confirmó en Safari del iPhone que somosnosotros.org abre con el mapa de San Luis Potosí (bitácora [002](../bitacora/2026/09/002-fase-0-base.md)). Sigue OL-002 Usuarios. Ciudad inicial San Luis Potosí; español; publican admin + usuarios.

**Fuente única de estado: este archivo.** Definición: [`docs/DEFINICION.md`](../DEFINICION.md). Plan: [`docs/PLAN.md`](../PLAN.md).

## Ahora

- **OL-002 · Fase 1 (usuarios)** — próxima. Registro e inicio de sesión con correo (enlace mágico) y Google; perfil (nombre, foto opcional, colonia opcional, una línea); borrar mi cuenta; roles `admin` y `usuario`. Se crea la primera migración con las 5 tablas del modelo (`docs/PLAN.md`) y sus permisos. Prueba: el founder y una persona más se registran desde el teléfono en menos de un minuto. Dato del founder: correo del administrador para el primer usuario.
- Pendientes menores de la Fase 0 (no bloquean): fuentes "Noto Sans Medium/Bold" ausentes en la cuenta de Mapbox (404, usa la de reserva; se arregla en Studio); variables de Mapbox solo en Production (agregar a Preview si se quiere mapa en previews).

## Después (orden del plan)

OL-003 Lugares → OL-004 Eventos → OL-005 Comunidad → OL-006 Alcance.

## Cerrado

- **OL-001 · Fase 0 (base)** — 2026-09-13. Prueba pasada: el mapa de San Luis Potosí abre en Safari del iPhone en somosnosotros.org. Bitácora [002](../bitacora/2026/09/002-fase-0-base.md).

## Decidido

- Nombre/dominio: somosnosotros.org · repo `robscan/somosnosotros` (público → ningún secreto en git).
- Supabase: proyecto **nuevo y limpio** (sin datos ni esquema de Flowya), región East US, conectado a Vercel por la integración oficial Supabase↔Vercel, que crea y gestiona sus variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, Postgres, service role). Si cambian llaves, se rotan desde esa integración, no a mano. El esquema (5 tablas + permisos) se crea en la Fase 1 con la primera migración.
- Stack: Next.js 16 + Supabase + Mapbox GL JS 3 + Vercel. Web móvil instalable (PWA en Fase 5); sin app de tienda en V1.
- Fase 0: sin Tailwind (CSS modules), fuente del sistema, vitest 3 sin jsdom, variables solo `NEXT_PUBLIC_*` (ninguna secreta en el código). Panel inferior solo en estado "asomado" hasta que haya contenido.
- No se heredan capacidades nativas de iOS (fotos, Health) ni el concepto de pasaporte.
- Herencia de Flowya reducida a 10 documentos en `docs/heredado/` (se regeneran con `scripts/heredar.sh`).
