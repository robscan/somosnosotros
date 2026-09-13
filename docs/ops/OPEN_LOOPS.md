# OPEN_LOOPS — somosnosotros

**Last updated:** 2026-09-13 — **Fase 0 en producción**: somosnosotros.org abre con el mapa de San Luis Potosí (PR #1 mergeado; bitácora [002](../bitacora/2026/09/002-fase-0-base.md)). Falta la confirmación del founder en Safari del iPhone para cerrar OL-001. Ciudad inicial San Luis Potosí; español; publican admin + usuarios.

**Fuente única de estado: este archivo.** Definición: [`docs/DEFINICION.md`](../DEFINICION.md). Plan: [`docs/PLAN.md`](../PLAN.md).

## Ahora

- **OL-001 · Fase 0 (base)** — en producción. Verificado 2026-09-13 desde el navegador de escritorio a 390×844: `https://somosnosotros.org` responde 200 desde Vercel, el mapa claro (FLOWYA_Light, preset día) carga con el centro histórico y el panel inferior; `/api/estado` → `mapbox: configurado`, `supabase: ok`. El founder ya lo vio en producción. **Para cerrar:** confirmación en Safari del iPhone.
- Cosmético, no bloquea: el estilo pide las fuentes "Noto Sans Medium/Bold" que no existen en la cuenta de Mapbox (404) y usa la de reserva. Se arregla en Mapbox Studio eligiendo una fuente disponible en la cuenta o subiendo esas dos.
- Opcional: poner `NEXT_PUBLIC_MAPBOX_TOKEN` y `NEXT_PUBLIC_MAPBOX_STYLE` también en Preview para ver mapa en los previews de PR.
- Datos que solo el founder tiene: correo del admin para el primer usuario (Fase 1).

## Después (orden del plan)

OL-002 Usuarios → OL-003 Lugares → OL-004 Eventos → OL-005 Comunidad → OL-006 Alcance.

## Decidido

- Nombre/dominio: somosnosotros.org · repo `robscan/somosnosotros` (público → ningún secreto en git).
- Stack: Next.js 16 + Supabase + Mapbox GL JS 3 + Vercel. Web móvil instalable (PWA en Fase 5); sin app de tienda en V1.
- Fase 0: sin Tailwind (CSS modules), fuente del sistema, vitest 3 sin jsdom, variables solo `NEXT_PUBLIC_*` (ninguna secreta en el código). Panel inferior solo en estado "asomado" hasta que haya contenido.
- No se heredan capacidades nativas de iOS (fotos, Health) ni el concepto de pasaporte.
- Herencia de Flowya reducida a 10 documentos en `docs/heredado/` (se regeneran con `scripts/heredar.sh`).
