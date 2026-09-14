# OPEN_LOOPS — somosnosotros

**Last updated:** 2026-09-14 — **Avisos activos**: llaves de Resend, CRON_SECRET y VAPID en Vercel (founder); correo de prueba entregado (Resend 200) y recordatorio diario disparado en producción (1 evento, 1 enviado, registrado en `avisos_enviados`). Las 6 fases construidas; faltan las pruebas de las Fases 4 y 5 en el teléfono. Ciudad inicial San Luis Potosí; español; publican admin + usuarios.

**Fuente única de estado: este archivo.** Definición: [`docs/DEFINICION.md`](../DEFINICION.md). Plan: [`docs/PLAN.md`](../PLAN.md).

## Ahora

- **OL-006 · Fase 5 (alcance)** — código en PR #13, verificado (lint, typecheck, 52 tests, build) y probado en Android emulado con la base real: manifiesto, service worker, aviso de instalación, reportar → panel `/admin` → atendido. Push y diálogo de instalación **sin probar en dispositivo**. En producción (PR #13 mergeado). Pasos: (1) founder copia de `.env` a Vercel `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`; (2) en el iPhone: instalar (Compartir → Agregar a inicio), Mi perfil → "Activar avisos en este teléfono", "Voy" a un evento de mañana → recordatorio a las 9:00 (necesita `CRON_SECRET`). Segunda ciudad: agregar una línea en `src/lib/ciudad.ts` cuando el founder la nombre.
- **Borrar lugares y eventos** (PR #14 mergeado): autor o admin, dos pasos; un lugar con eventos de otras personas no lo borra su autor (se le pide ocultar). Bitácora [013](../bitacora/2026/09/013-borrar-lugares-y-eventos.md).
- **OL-005 · Fase 4 (comunidad)** — en producción. Falta la prueba: dos personas coincidieron en un evento gracias a la plataforma.
- **Correos y cron activos (2026-09-14)**: `RESEND_API_KEY`, `CORREO_REMITENTE`, `CRON_SECRET` en Vercel (Production); dominio verificado en Resend; correo de prueba y recordatorio recibidos por el founder ("funciona"); `/api/recordatorios` con el secreto → `{"ok":true,"eventos":1,"enviados":1}`. Si se quiere mapa/avisos en los previews de PR, replicar las variables en Preview.
- **Propuesta abierta: confirmaciones por WhatsApp.** Exige la API de WhatsApp Business (Meta): número dedicado, verificación del negocio, plantillas aprobadas, número y consentimiento de cada persona; centavos por mensaje. Recomendación: medir correo + push unas semanas antes.
- Pendiente de la Fase 1 (no bloquea): que una segunda persona se registre. **Google** opcional: credenciales OAuth en Google Cloud con redirect `https://<ref>.supabase.co/auth/v1/callback`; Client ID y Secret en Supabase → Authentication → Providers → Google.
- Pendientes menores (no bloquean): fuentes "Noto Sans Medium/Bold" ausentes en la cuenta de Mapbox (404, usa la de reserva); variables de Mapbox y Anthropic solo en Production.

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
