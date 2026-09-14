# OPEN_LOOPS — somosnosotros

**Last updated:** 2026-09-14 — **Cierre de la sesión larga** (bitácora [014](../bitacora/2026/09/014-correos-listos-y-cierre.md)). Las 6 fases del plan están en producción y todas las llaves están en Vercel (Mapbox, Supabase, Anthropic, VAPID, Resend, CRON_SECRET). Correos de entrar por Resend (SMTP en Supabase) y avisos por correo funcionando. Lo que sigue es en el teléfono: instalar la app, activar push, pruebas de las Fases 4 y 5. Ciudad inicial San Luis Potosí; español; publican admin + usuarios.

**Fuente única de estado: este archivo.** Definición: [`docs/DEFINICION.md`](../DEFINICION.md). Plan: [`docs/PLAN.md`](../PLAN.md).

## Ahora

- **Pruebas en el teléfono (founder)**: (1) instalar la app en el iPhone (Compartir → Agregar a inicio); (2) Mi perfil → "Activar avisos en este teléfono"; (3) decir "Voy" a un evento de mañana → recordatorio a las 9:00 por push y correo. Con eso se prueba la Fase 5. La Fase 4 se prueba cuando dos personas coincidan en un evento gracias a la plataforma.
- **Correo**: entregabilidad en Gmail mejora con uso; marcar "No es spam" en el primer correo. Si se quieren reportes DMARC, apuntar `rua` a un buzón real o activar Inbound en Resend.
- **Segunda ciudad**: una línea en `src/lib/ciudad.ts` cuando el founder la nombre.
- **Propuesta abierta: confirmaciones por WhatsApp.** Exige la API de WhatsApp Business (Meta): número dedicado, verificación del negocio, plantillas aprobadas, número y consentimiento de cada persona; centavos por mensaje. Recomendación: medir correo + push unas semanas antes.
- **Google** (entrar con Google) opcional: credenciales OAuth en Google Cloud con redirect `https://<ref>.supabase.co/auth/v1/callback`; Client ID y Secret en Supabase → Authentication → Providers → Google.
- Pendientes menores (no bloquean): fuentes "Noto Sans Medium/Bold" ausentes en la cuenta de Mapbox (404, usa la de reserva); variables de Mapbox y Anthropic solo en Production (los previews de PR no tienen mapa ni lectura de cartel).

## Después (orden del plan)

El plan de 6 fases está construido. Lo que sigue lo marca el uso real: pruebas de las Fases 4 y 5, y lo que la ciudad pida.

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
