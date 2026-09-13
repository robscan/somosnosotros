# 002 · Fase 0, base del proyecto (2026-09-13)

Primer commit de documentos en `main` y, en la rama `fase-0-base`, el proyecto Next.js con el layout mapa + panel inferior, la conexión a Supabase por variables de entorno, verificación (lint, typecheck, tests) y CI.

## Qué quedó

- **Commit inicial** `05ca6fe` en `main`: definición, plan, estado, bitácora 001, acta del council, 10 documentos heredados, `scripts/heredar.sh` y los skills `council` y `front-visual`.
- **Proyecto Next.js 16** (App Router, TypeScript, sin Tailwind, `src/`). Fuente del sistema, `lang="es"`, tema claro fijo (`color-scheme: light`), viewport con `viewport-fit=cover` para el notch del iPhone.
- **Mapa** (`src/components/Mapa.tsx`): Mapbox GL JS 3.30, único renderer de mapa. Centro en la Plaza de Armas de San Luis Potosí (`src/lib/ciudad.ts`), zoom 13, etiquetas en español, estilo claro (`NEXT_PUBLIC_MAPBOX_STYLE` o `mapbox/light-v11` si va vacío). Se importa solo en el navegador. Tres estados dichos en pantalla: cargando, falta token, no se pudo cargar. Atribución de Mapbox arriba a la derecha (compacta) y logo arriba a la izquierda para que el panel no los tape.
- **Panel inferior** (`src/components/Panel.tsx`): solo el estado "asomado" (peek): asa, título, ciudad y "Aún no hay lugares ni eventos." Los estados medium/expanded y los gestos del contrato heredado (`docs/heredado/front/BOTTOM_SHEET.md`) entran cuando haya contenido (Fases 2 y 3).
- **Variables de entorno** (`.env.example`, todas públicas `NEXT_PUBLIC_*`): token y estilo de Mapbox, URL y llave pública de Supabase. `src/lib/config.ts` las lee; `src/lib/supabase.ts` crea el cliente o devuelve `null` si faltan (la app abre igual).
- **`/api/estado`**: dice si Mapbox está configurado y si Supabase responde (`GET {url}/auth/v1/health` con la llave). Nunca muestra valores. Sirve para comprobar desde el teléfono que las variables llegaron a Vercel.
- **Verificación**: `npm run lint` (eslint 9 + config de Next), `npm run typecheck` (`next typegen && tsc --noEmit`), `npm test` (vitest 3, 8 pruebas: lectura de variables, cálculo de estado, ciudad inicial), `npm run build`. Todo en verde.
- **CI** (`.github/workflows/ci.yml`): lint + typecheck + tests + build en cada PR y en `main`.
- **Preview local**: `.claude/launch.json` (`npm run dev` en el puerto 3000).

## Evidencia (front-visual, 390×844 en el navegador del escritorio)

- Sin token: mapa en tono claro a pantalla completa, aviso centrado "Falta el token de Mapbox (NEXT_PUBLIC_MAPBOX_TOKEN).", panel inferior con asa, "somosnosotros", "San Luis Potosí", "Aún no hay lugares ni eventos." Nada recortado ni tocando bordes. Sin errores de consola.
- Con token inválido (en `.env.local`, borrado después): mapbox-gl se descarga, aparece el logo de Mapbox, el estilo se pide con el token, Mapbox responde 401 y la pantalla dice "No se pudo cargar el mapa. Revisa el token de Mapbox." `/api/estado` devolvió `{"mapbox":"configurado","supabase":"error","detalle":"fetch failed"}` con una URL de Supabase inexistente.
- **Con las llaves reales del founder (`.env` local, ignorado por git):** `/api/estado` → `{"mapbox":"configurado","supabase":"ok"}` (Supabase creado y respondiendo). El mapa de San Luis Potosí carga en 390×844: centro histórico (Teatro de la Paz), estilo claro, etiquetas en español, atribución arriba a la derecha, panel abajo. Tropiezo encontrado: `NEXT_PUBLIC_MAPBOX_STYLE` traía un segundo token (`pk.…`) en vez de una URL `mapbox://styles/…`, y Mapbox respondía 404 al pedir el "estilo"; se dejó vacía (estilo claro estándar). Mismo cuidado al cargar variables en Vercel.
- **Pendiente:** la prueba de la fase en el iPhone. La prueba de la fase (somosnosotros.org abre en Safari del iPhone con el mapa) la hace el founder tras configurar Vercel y Supabase.

## Vercel ya estaba conectado

El founder importó el repo en Vercel antes de que existiera `package.json`, así que el proyecto quedó con preset "Other" y el primer deploy del PR falló con `No Output Directory named "public"` aunque `next build` terminó bien. Arreglo en el repo: `vercel.json` con `"framework": "nextjs"` (manda sobre el preset del panel) y `engines.node = "22.x"`.

## Decisiones pequeñas

- vitest 3 (no 5) y sin jsdom: el Node local es 22.6 y vitest 5 pide 22.12; las pruebas de esta fase son de lógica pura.
- Sin Tailwind ni fuentes de Google: CSS modules y fuente del sistema. Menos piezas, build sin red.
- Sin manifest PWA todavía: la app instalable es Fase 5.
- El cliente de Supabase es el básico (`@supabase/supabase-js`). En la Fase 1 (usuarios) se cambia a sesiones por cookie (`@supabase/ssr`); el esquema de las 5 tablas se crea ahí con su primera migración.

## Qué sigue

Lo que el founder configura en Vercel y Supabase está en `docs/ops/OPEN_LOOPS.md` (OL-001). Cuando el mapa abra en el iPhone, la Fase 0 cierra y empieza OL-002 (usuarios).
