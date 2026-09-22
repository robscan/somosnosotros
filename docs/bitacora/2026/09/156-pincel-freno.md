# 156 · Pincel: tope global e interruptor de apagado (OL-121)

**Fecha:** 2026-09-22
**Rama:** `pincel-freno` (base `origin/main`)
**Pieza:** OL-121, reservada por el gestor junto con la bitácora 156 (commit `7010f26`, «Decidido: frenos de Pincel; reserva OL-121 / 156»).

## Qué pedía

El founder, tras preguntar «me ha preocupado que la pagina pueda colapsar por correr uno o varios pinceles»,
aprobó dos frenos baratos para que Pincel nunca ponga en riesgo el sitio (2026-09-22, «Decidido» en
`docs/ops/OPEN_LOOPS.md`):

1. **Tope global, en la base:** como mucho 2 obras abiertas a la vez y 40 mandos en total entre todas.
2. **Interruptor «Pincel apagado»** en Administración: apagado, la pared y el mando no dejan pintar y el canal
   en vivo deja de responder, sin desplegar nada.

(El tercer freno, el del cortafuegos de Vercel para `/obra/*`, lo configura el gestor con el founder en Vercel;
no lleva código y no se toca en esta pieza.)

## Qué se hizo

### 1. Migración `supabase/migrations/20260922180000_pincel_freno.sql` (solo añade)

- **Disparador `obras_colectivas_freno`** (`after insert or update of estado, cupo_mandos`, security definer,
  con `pg_advisory_xact_lock` — mismo patrón que `apartar_lectura_de_cartel`, migración 20260917160000): rechaza
  con `check_violation` y un mensaje llano (`raise exception using errcode = 'check_violation', message = …`)
  abrir o reabrir una tercera obra, o subir el cupo de una obra abierta por encima de lo que queda del tope de
  40 mandos entre todas las abiertas. El cerrojo evita que dos administradores a la vez cuenten "1 abierta" al
  mismo tiempo y las dos pasen: el segundo espera a que el primero termine su transacción.
  **Hallazgo al construir, no en el pedido:** con el tope por obra ya fijo en 20 (migración 20260922130000, en
  producción, no se toca) y el tope de 2 obras, la suma máxima posible es siempre 20 + 20 = 40 — exactamente el
  tope global, nunca más. No hay un valor legal de `cupo_mandos` (1..20) que viole el freno de 40 mandos sin
  violar ya el tope por obra. El disparador queda codificado tal como decidió el founder (defensa en
  profundidad, por si algún día cambia el tope por obra o el número de obras abiertas); el banco de abajo prueba
  lo que sí es alcanzable hoy — el borde exacto (20+20) se acepta, no se rechaza — y esto se lo aviso al gestor
  explícitamente, no lo escondo.
- **Tabla `ajustes_sitio`** (`clave text primary key, valor jsonb, cambiado_por, cambiado_en`): no había en el
  repo un patrón previo para ajustes globales del sitio (se buscó antes de crearla). Una fila sembrada,
  `pincel_activo = true`. Un disparador (`ajustes_sitio_quien`) pone `cambiado_por`/`cambiado_en` solo desde la
  base, nunca desde lo que mande el cliente. RLS: cualquiera con sesión lee, solo admin escribe.
- **Función `pincel_activo()`** (`security invoker`, mismo patrón que `es_admin()` desde la revisión del
  Security Advisor): `true` si el ajuste está encendido; ante cualquier duda (sin sesión, error de lectura) lee
  como apagado — el freno falla cerrado, nunca abierto.
- **Política restrictiva** sobre `realtime.messages` (`as restrictive for all to authenticated using/with check
  (pincel_activo())`): se SUMA a las cuatro políticas permisivas de la migración 20260922130000 (ninguna se
  borra ni se toca) — con Pincel apagado, ninguna de esas cuatro basta por sí sola, nadie con sesión manda ni
  recibe trazos ni presence; encendido, todo vuelve a como estaba, sin desplegar nada.

### 2. Administración (`src/app/admin/obras-colectivas/**`)

- **`consultas.ts`**: `cargarEstadoGlobalPincel()` (cuántas obras abiertas y cuántos mandos suman) y
  `cargarAjustePincel()` (estado, quién lo cambió y cuándo, con `perfiles(nombre)`).
- **`acciones.ts`**: `esFrenoGlobal()` (código `23514`) para mostrar el mensaje que manda la base tal cual, no
  uno genérico, en `crearPorUbicacion()` y `cambiarCupo()`. `cambiarPincelActivo()`, nueva: solo admin.
- **`CrearObraAqui.tsx`**: con dos obras ya abiertas, el botón «Crear obra aquí» se deshabilita y aparece «Ya
  hay dos obras abiertas; termina una para abrir otra.» (prop `puedeCrear`, calculada en `page.tsx`; si la
  lectura del estado global falla, no bloquea aquí — la base lo exige igual).
- **`[id]/CampoCupo.tsx`**: el tope del contador ya no es un `20` fijo sino `Math.min(20, tope)` (prop nueva
  `tope`, calculada en `[id]/page.tsx` como lo que le queda a esa obra por el freno global); la nota cambia de
  «Hasta 20…» a «Quedan N mandos entre todas las obras abiertas.»
- **`InterruptorPincel.tsx`** (nuevo, `"use client"`): la palanca de `ui/Ajustes` (`ajustes.palanca`, import
  cruzado — mismo patrón que `ReservaPerfil.tsx`), con el estado, la explicación y «Último cambio: quién,
  cuándo». Se guarda al tocar.
- **`page.tsx`**: nuevo grupo «Pincel» arriba de «Crear obra aquí», con el interruptor.

### 3. La pared y el mando (`src/app/obra/**`)

- **`consultas.ts`**: `cargarPincelActivo()` (via `supabase.rpc("pincel_activo")`; falla cerrado ante cualquier
  error, igual que la función de la base).
- **`pared/page.tsx`** y **`mando/page.tsx`**: la comprobación va en el `page.tsx` de cada uno (no se tocó
  `Pared.tsx` ni `Mando.tsx` más allá de esto, para no chocar con OL-120), **antes** de leer la obra — con Pincel
  apagado, ninguno de los dos abre el canal ni pide el QR, solo muestran «Pincel está apagado por ahora.»
  reutilizando el mismo dibujo que ya usaba cada uno para «esta obra ya cerró» (`styles.cerrada`).

### 4. Banco viejo ajustado (`supabase/tests/pg/obras-colectivas.test.mjs`)

Con el tope de 2 obras abiertas ya exigido por la base, ese banco (Fase 1, anterior a esta pieza) abría hasta 3
obras a la vez en algunos tramos de su recorrido. Se ajustó a cerrar una obra que ya no hacía falta abierta
antes de abrir la siguiente, en cuatro puntos (zona de Madrid, evento oculto, lugar oculto, y al final del
archivo, para no dejarle a `realtime-canal-obra.test.mjs` una obra abierta de sobra) — **ninguna aserción propia
de ese archivo cambió**, solo el orden de apertura/cierre. Sin este ajuste, mi propia migración rompía un banco
que no era mío.

## Evidencia

- `npm run lint && npm run typecheck && npm test`: **878/878** pruebas, lint y typecheck en verde.
- `npm run build`: verde (Next 16, Turbopack). `/admin/obras-colectivas` y `/admin/obras-colectivas/[id]` ya
  salían dinámicas (`ƒ`) antes de esta pieza (dependen de la sesión); se comprobó que seguían así después.
- **Banco de contrato SQL** (`TEST_DATABASE_URL=postgresql://apple-1@127.0.0.1:5432/sn_control npm run
  test:db`, Postgres local): **785 pruebas, 0 fallaron** (52 migraciones aplicadas). `supabase/tests/pg/pincel-
  freno.test.mjs` prueba: tercera obra rechazada (alta y reapertura), el borde exacto del tope de mandos (20+20
  = 40) aceptado, dos administradores a la vez disputando el último lugar (solo uno de los dos pasa, nunca
  quedan 3 abiertas), apagado bloquea `realtime.messages` para `authenticated` (ni manda ni recibe, ni lo que
  cuela `service_role`) y encendido lo reabre, y que solo admin escribe `ajustes_sitio` (anon y una cuenta sin
  rol admin no cambian nada, 0 filas, sin error).
- **Capturas PNG reales** (`next build && next start -p 3182`, respaldo 100% local sin red en
  `/private/tmp/claude-501/-Users-apple-1-somosnosotros--claude-worktrees-frosty-bhaskara-4be07e/…/scratchpad/
  respaldo-pincel-freno/`, Chrome real por `playwright-core`, `document.fonts.check('16px "Bricolage
  Grotesque"')` en `true` en las cinco), a 390×844:
  - `admin-lista-2-abiertas-crear-deshabilitado-390x844.png`: dos obras abiertas, «Crear obra aquí» gris con
    «Ya hay dos obras abiertas; termina una para abrir otra.» arriba, interruptor «Pincel encendido».
  - `admin-ficha-cupo-quedan-390x844.png`: cupo en 15, nota «Quedan 5 mandos entre todas las obras abiertas.»
    (la otra obra abierta tiene cupo 20; tope efectivo 20, 20-15=5).
  - `admin-lista-pincel-apagado-390x844.png`: interruptor «Pincel apagado», palanca gris, «Último cambio: Admin
    de prueba, martes 22 de septiembre · 20:00».
  - `pared-pincel-apagado-390x844.png` y `mando-pincel-apagado-390x844.png`: «Pincel está apagado por ahora.»,
    sin controles.
- Al terminar: `next start` y el respaldo local apagados, `.env.local` borrado, `CLAUDE.md`/`AGENTS.md` sin
  tocar (comprobado con `git status` antes de limpiar).

## Qué no se tocó

`src/app/obra/[id]/mando/Mando.tsx` y `src/app/obra/[id]/pared/Pared.tsx` (OL-120 trabaja ahí) — la
comprobación de apagado vive en cada `page.tsx`, antes de montarlos. El freno del cortafuegos de Vercel para
`/obra/*` (lo configura el gestor con el founder en Vercel).

## Entrega

Rama `pincel-freno`, commits locales, sin push — lo sube el gestor y aplica la migración. Aviso enviado a
«Gestor de cambios II» con rama, commits, archivos, migración y los cuatro resultados de verificación.
