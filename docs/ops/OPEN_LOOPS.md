# OPEN_LOOPS — somosnosotros

**Last updated:** 2026-09-13 — fundación documental (bitácora [001](../bitacora/2026/09/001-fundacion-documental.md)). Repo `robscan/somosnosotros` creado por el founder (público, vacío); dominio somosnosotros.org comprado; ciudad inicial San Luis Potosí; español; publican admin + usuarios. **Cero código todavía.**

**Fuente única de estado: este archivo.** Definición: [`docs/DEFINICION.md`](../DEFINICION.md). Plan: [`docs/PLAN.md`](../PLAN.md).

## Ahora

- **OL-001 · Fase 0 (base)** — se ejecuta en un chat nuevo abierto en esta carpeta, con el prompt de [`PROMPT_INICIO.md`](PROMPT_INICIO.md) y `CLAUDE.md` como contexto. Primer paso allá: commit inicial + push a `main`, proyecto Next.js, layout mapa + panel, variables de entorno; el founder configura Vercel (dominio, variables) y Supabase (proyecto nuevo).
- Datos que solo el founder tiene (no bloquean la Fase 0): cuenta Mapbox a usar y su token; correo del admin para el primer usuario.

## Después (orden del plan)

OL-002 Usuarios → OL-003 Lugares → OL-004 Eventos → OL-005 Comunidad → OL-006 Alcance.

## Decidido

- Nombre/dominio: somosnosotros.org · repo `robscan/somosnosotros` (público → ningún secreto en git).
- Stack: Next.js + Supabase + Mapbox GL JS + Vercel. Web móvil instalable; sin app de tienda en V1.
- No se heredan capacidades nativas de iOS (fotos, Health) ni el concepto de pasaporte.
- Herencia de Flowya reducida a 10 documentos en `docs/heredado/` (se regeneran con `scripts/heredar.sh`).
