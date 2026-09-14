# OPEN_LOOPS — somosnosotros

**Last updated:** 2026-09-13 — Otro sitio, sitio reservado y lectura del cartel en producción (PR #8); cartel probado con el modelo con la llave del founder (PR #9, ajuste de enlaces). Falta la prueba de la Fase 3. Ciudad inicial San Luis Potosí; español; publican admin + usuarios.

**Fuente única de estado: este archivo.** Definición: [`docs/DEFINICION.md`](../DEFINICION.md). Plan: [`docs/PLAN.md`](../PLAN.md).

## Ahora

- **OL-004 · Fase 3 (eventos)** — código en PR #5, verificado (lint, typecheck, 39 tests, build, capturas 390×844) y probado contra la base real. Publicar con dónde + qué + cuándo (dos acciones desde la ficha del lugar), agenda Hoy · Esta semana · Próximos en el panel, ficha con Compartir por WhatsApp (vista previa Open Graph) y Agregar a mi calendario (.ics), duplicar con otra fecha, ocultar por admin. En producción (PR #5 mergeado 2026-09-13). **Falta la prueba de la fase**: el primer evento publicado por alguien que no es el founder, y compartido por WhatsApp (revisar que la vista previa muestre título, fecha e imagen).
- **Toque instantáneo** (PR #6, bitácora [007](../bitacora/2026/09/007-toque-instantaneo.md)): el founder midió más de 400 ms sin respuesta al tocar. Pantallas de espera instantáneas, estado de pulsado, y sesión verificada localmente (sin ir a Supabase Auth en cada petición). Remedido en producción tras el merge (PR #6 mergeado): el tiempo del servidor sin sesión sigue en ~380–530 ms (es el costo base de la función en Vercel `iad1`, no de la app); lo que cambia es que el toque dibuja la pantalla de espera al instante y, con sesión, ya no hay dos viajes a Supabase Auth por página. El founder valida en el iPhone.
- **Cuándo con un toque** (PR #7 mergeado, bitácora [008](../bitacora/2026/09/008-fecha-con-ayuda.md)): chips de día y hora, fin como duración, frase de confirmación.
- **Otro sitio, sitio reservado y cartel** (PR #8 mergeado, bitácora [009](../bitacora/2026/09/009-otro-sitio-reservado-cartel.md)): regla "el evento se anuncia; el sitio se guarda". Dirección reservada en tabla aparte con RLS (autor/admin siempre; con sesión desde X horas antes; anónimo nunca). Lectura del cartel **probada con el modelo** (5 s, todos los campos correctos; PR #9 convierte "@usuario" en enlace de Instagram). Llave en Vercel solo en Production.
- Pendiente de la Fase 1 (no bloquea): que una segunda persona se registre. **Google** opcional: credenciales OAuth en Google Cloud con redirect `https://<ref>.supabase.co/auth/v1/callback`; Client ID y Secret en Supabase → Authentication → Providers → Google.
- Pendientes menores de la Fase 0 (no bloquean): fuentes "Noto Sans Medium/Bold" ausentes en la cuenta de Mapbox (404, usa la de reserva); variables de Mapbox solo en Production.

## Después (orden del plan)

OL-005 Comunidad → OL-006 Alcance.

## Cerrado

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
