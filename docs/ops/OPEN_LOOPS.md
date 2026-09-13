# OPEN_LOOPS — somosnosotros

**Last updated:** 2026-09-13 — Fase 0 construida, pendiente de prueba en el iPhone (bitácora [002](../bitacora/2026/09/002-fase-0-base.md)). `main` tiene los documentos; el código de la Fase 0 está en la rama `fase-0-base` (PR abierto). Dominio somosnosotros.org comprado; ciudad inicial San Luis Potosí; español; publican admin + usuarios.

**Fuente única de estado: este archivo.** Definición: [`docs/DEFINICION.md`](../DEFINICION.md). Plan: [`docs/PLAN.md`](../PLAN.md).

## Ahora

- **OL-001 · Fase 0 (base)** — código listo y verificado (lint, typecheck, 8 tests, build, captura 390×844) en la rama `fase-0-base`. Falta la prueba de la fase: **somosnosotros.org abre en Safari del iPhone con el mapa.** Pasos del founder, en orden:
  1. **Mapbox** (account.mapbox.com → Tokens): un token público nuevo llamado `somosnosotros` con restricción de URL `https://somosnosotros.org/*` y `https://*.vercel.app/*` (para los previews). Opcional: copiar la URL de tu estilo claro (`mapbox://styles/TU_USUARIO/ID`).
  2. **Supabase** (supabase.com → New project): organización propia, nombre `somosnosotros`, región **East US (North Virginia)**, contraseña de la base guardada en tu gestor de contraseñas. Al terminar, en Project Settings → API Keys: copiar la **Project URL** y la llave **publishable** (sirve también la `anon` legacy).
  3. **Vercel** (ya importaste el repo: proyecto `somosnosotros`; el framework lo fija `vercel.json`, no hay que tocar el preset): en Settings → Environment Variables poner `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_MAPBOX_STYLE` (opcional), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` para Production y Preview. Deploy.
  4. **Dominio** (proyecto en Vercel → Settings → Domains): agregar `somosnosotros.org` y `www.somosnosotros.org`; Vercel dice qué registros DNS poner en el registrador del dominio (A `76.76.21.21` para el raíz y CNAME `cname.vercel-dns.com` para `www`, o cambiar los nameservers a los de Vercel). Esperar a que Vercel marque "Valid Configuration".
  5. **Merge del PR** `fase-0-base` → `main`: Vercel publica en somosnosotros.org. En el iPhone abrir `https://somosnosotros.org` (el mapa) y `https://somosnosotros.org/api/estado` (debe decir `mapbox: configurado`, `supabase: ok`).
- Datos que solo el founder tiene: correo del admin para el primer usuario (Fase 1).

## Después (orden del plan)

OL-002 Usuarios → OL-003 Lugares → OL-004 Eventos → OL-005 Comunidad → OL-006 Alcance.

## Decidido

- Nombre/dominio: somosnosotros.org · repo `robscan/somosnosotros` (público → ningún secreto en git).
- Stack: Next.js 16 + Supabase + Mapbox GL JS 3 + Vercel. Web móvil instalable (PWA en Fase 5); sin app de tienda en V1.
- Fase 0: sin Tailwind (CSS modules), fuente del sistema, vitest 3 sin jsdom, variables solo `NEXT_PUBLIC_*` (ninguna secreta en el código). Panel inferior solo en estado "asomado" hasta que haya contenido.
- No se heredan capacidades nativas de iOS (fotos, Health) ni el concepto de pasaporte.
- Herencia de Flowya reducida a 10 documentos en `docs/heredado/` (se regeneran con `scripts/heredar.sh`).
