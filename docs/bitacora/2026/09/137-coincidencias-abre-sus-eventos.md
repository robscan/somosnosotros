# 137 · Coincidencias abre sus eventos

**Fecha:** 2026-09-21 · **Rama:** `coincidencias-lista`, desde `origin/main` · **OL:** OL-102

## De dónde sale

Decisión del founder (2026-09-21): «Coincidencias debe abrir eventos con coincidencias.» Cierra la pregunta que la bitácora [101](101-indicadores-rol-de-entonces.md) dejó abierta hace días: hoy, en Administración, la tarjeta «Coincidencias» muestra un número (de `indicadores_ahora()` vía `panel_resumen()`), pero su enlace va a `/admin/eventos?filtro=semana`, la lista genérica de la semana (hoy 39 eventos, paginada de 30 en 30). El founder toca el número y no encuentra lo que el número dice.

## El criterio, medido letra por letra

El número «Coincidencias» sale de `indicadores_ahora()`, en [`supabase/migrations/20260917170000_indicadores_rol_de_entonces.sql:66-84`](../../../../supabase/migrations/20260917170000_indicadores_rol_de_entonces.sql) (definición vigente hoy; nadie la volvió a tocar después):

- `proximos` (línea 66-70): eventos **visibles**, que **no han terminado** (`e.termina >= now()`).
- `semana` (línea 71): de esos, los que **empiezan dentro de los próximos 7 días** (`inicio < now() + interval '7 days'`) — la misma ventana que «Agenda de la semana».
- `van` (línea 72-77): por cada evento de `semana`, cuenta las filas de `asistencias` con `estado = 'voy'` **de personas que NO eran administradoras cuando lo dijeron** — `rol_en(usuario, la_fecha_de_esa_fila) <> 'admin'` (el rol de entonces, bitácora 101, no el de hoy).
- `coincidencias` (línea 84): `count(*) from van where n >= 2` — cuántos eventos de esos tienen **2 o más** de esas personas.

Ese criterio ya estaba bien (la bitácora 101 lo arregló). Lo que faltaba era que la lista y el badge usaran el mismo.

## Qué se hizo

**Migración `supabase/migrations/20260922100000_coincidencias_lista.sql`** (solo `create or replace function`, sin tablas, sin datos, sin drop; misma firma/`security`/`search_path` que la definición vigente de [`20260921100000_rol_de_entonces_en_listas.sql`](../../../../supabase/migrations/20260921100000_rol_de_entonces_en_listas.sql)):

- **`panel_eventos()`**, nuevo `case` `'coincidencias'`: `e.visible and e.inicio < now() + interval '7 days' and (select count(*) from asistencias a where a.evento_id = e.id and a.estado = 'voy' and rol_en_para_admin(a.usuario_id, a.creado_en) <> 'admin') >= 2`. Es `security invoker` (endurecimiento del Security Advisor), así que usa el ayudante `rol_en_para_admin()` que ya existe desde la bitácora 128, no `rol_en()` directo (sigue revocada para `authenticated` a propósito) — sin tocar ese ayudante ni añadir ningún grant nuevo.
- **`panel_fichas_conteos()`**, tipo `'eventos'`, nueva clave `'coincidencias'`: la misma expresión, letra por letra, contando eventos en vez de filtrarlos.

Las dos usan exactamente el mismo texto para decidir «coincidencia» (mismo `select count(*) from asistencias ... >= 2`), copiado y pegado a propósito para que no puedan volver a separarse — es la regla de la casa que pidió el gestor.

**`src/lib/panel.ts`:**

- `FILTROS.eventos`: nuevo filtro `{ valor: "coincidencias", etiqueta: "Coincidencias", vacio: "Aún no hay eventos donde coincidan dos personas." }`, junto a «Esta semana» (mismo patrón visual que «comunidad», sin rediseño: es una pestaña más de `ui/Chip`).
- `indicadores()`: el enlace de la tarjeta «Coincidencias» cambia de `hrefLista("eventos", { filtro: "semana" })` a `hrefLista("eventos", { filtro: "coincidencias" })`, con el texto «Ver esos eventos» (antes «Ver los eventos de la semana»). El texto de «qué cuenta» (`que`) ya decía «Eventos de los próximos 7 días donde 2 o más personas dijeron Voy, sin contar administradores» — no hacía falta tocarlo, ya describía el criterio real.

`src/app/admin/[seccion]/page.tsx` y `src/app/admin/consultas.ts` no se tocaron: leen `FILTROS[seccion]` y `conteos[f.valor]` de forma genérica, así que el filtro y el badge nuevos entran solos.

**`src/lib/panel.test.ts`:** el test que verificaba el enlace viejo (`/admin/eventos?filtro=semana`) se actualizó a `?filtro=coincidencias`.

## Verificación

**Banco PGlite nuevo**, `supabase/tests/coincidencias_lista.mjs` (45 migraciones aplicadas, con `20260922100000_coincidencias_lista.sql`): **21 comprobaciones en verde**.

- **0, 1 y 3 eventos con coincidencias:** número (`indicadores_ahora().coincidencias`), lista (`panel_eventos(filtro='coincidencias')`) y badge (`panel_fichas_conteos('eventos').coincidencias`) coinciden en los tres momentos — vacío al principio, con 1 evento tras el primer par de «voy», con 3 tras sumar dos eventos más.
- **Rol de entonces:** una persona que dijo «voy» en un evento y **después** asciende a administradora sigue contando (el evento no sale de la lista ni baja el número).
- **Admin de origen:** un «voy» del fundador (administrador desde siempre) no suma — un evento con su «voy» + 1 «voy» real (solo 1, no 2) no es coincidencia y no aparece en la lista.
- **Permisos:** una cuenta normal con sesión no ve ninguna fila de `panel_eventos` ni el badge de `panel_fichas_conteos` (`es_admin()` los filtra por dentro, sin excepción); `anon` sin sesión recibe `permission denied` en las dos (el `EXECUTE` sigue solo para `authenticated`); `panel_resumen()` da la excepción «solo la administración» a una cuenta normal.

**Bancos existentes, sin romper nada:** `agenda_numeros.mjs` (18/18), `indicadores_rol_de_entonces.mjs` (27/27), `destacados.mjs` (53/53), `panel_como_va.mjs` (7/7), `autor_y_visible_solo_admin.mjs` (68/68), `tope_de_lecturas.mjs` (34/34). `panel_administracion.mjs` sigue fallando por un error de entorno en este árbol de trabajo, ya documentado en la bitácora 128 y ajeno a esta pieza (confirmado: falla igual con y sin esta migración).

**`npm run lint && npm run typecheck && npm test`:** lint verde (1 aviso preexistente y ajeno, `docs/diseno/logotipo/iconos-sn.mjs`); typecheck verde; **705 pruebas en verde, 7 en rojo** — los mismos 7 preexistentes de `scripts/test-db.test.ts` por faltar el paquete `pg` en este árbol (documentado también en la bitácora 128). `npm run build`: verde.

**Captura móvil (390×844):** con el respaldo 100% local (bitácoras 070/076: PGlite + un HTTP mínimo que imita RPC/Auth de Supabase, `.env.local` temporal apuntando a `http://127.0.0.1:4590`, sin ningún `.env` real en la carpeta, borrado al terminar) y un escenario inventado (Son huasteco y Jam de jazz con 2 «voy» cada uno, Feria de trueque sin coincidencia), verificado en el navegador integrado a 390×844:

1. `/admin`, tarjeta «Coincidencias» abierta: número **2**, desglose «2 con 2 personas · La más grande: Jam de jazz, 2 van», enlace **«Ver esos eventos ›»**.
2. Tocar el enlace lleva a `/admin/eventos?filtro=coincidencias` con la pestaña «Coincidencias» activa y **exactamente esos 2 eventos** (Son huasteco, Jam de jazz) — ni la lista genérica de la semana (3 eventos) ni vacío.

Las capturas se tomaron y se revisaron en esta sesión (front-visual: se miró la pantalla antes de dar la pieza por buena), pero el archivo de imagen no viaja por el aviso de texto al gestor (`SendMessage` entre sesiones no lleva adjuntos); si hace falta el PNG, se puede repetir la captura en un minuto con el mismo respaldo. El entorno de prueba (servidor Node en el scratchpad, `next dev` en el puerto 3177, `.env.local`) se apagó y se borró al terminar; `AGENTS.md` (que `next dev` reescribe al arrancar) se restauró con `git checkout`.

## Límites respetados

- No se tocó `indicadores_ahora()`: el criterio ya estaba bien, solo faltaba que la lista y el badge lo compartieran.
- No se aplicó la migración: queda para que la aplique el gestor con permiso del founder.
- Ningún `.env` real entró a la carpeta del operador; toda la prueba de extremo a extremo fue con datos inventados en un respaldo local sin red.

## Pendiente

- Que el gestor revise y aplique la migración `20260922100000_coincidencias_lista.sql`.
- Que el founder pruebe en su iPhone: tocar «Coincidencias» en Administración y confirmar que la lista que abre coincide con lo que dice el número.
