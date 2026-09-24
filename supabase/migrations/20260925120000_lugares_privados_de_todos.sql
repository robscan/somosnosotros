-- somosnosotros · lugares privados de todos (OL-179, bitácora 214)
-- Decisión del founder (2026-09-24, palabras suyas): «De acuerdo en tu recomendación de agregar lugar en radio de
-- 150 m como el mismo. Con tu propuesta de modal "agregar lugar" y dentro de ese modal especificar si es lugar
-- privado podemos hacer que en el paso anterior solo mostremos un botón de agregar. Otra cosa es que si lo marca
-- como privado sí se guarda, pero como privado por si el usuario vuelve a organizar algo ahí, solo lo ve él.»
--
-- Sustituye la regla de `20260915110000_lugares_privados.sql` ("privado" solo lo marca la administración, mapeo
-- personal del admin): ahora cualquier cuenta con sesión puede marcar privado SU PROPIO lugar (creado_por =
-- auth.uid()), para reutilizarlo en otro evento sin ficha pública; la administración lo sigue pudiendo marcar en
-- cualquiera (como antes). Solo cambian las políticas de alta y edición -ambas ya exigían que el lugar fuera del
-- autor (o de una cuenta ligada, o de la administración, en la de edición); solo se quita la condición extra que
-- reservaba "privado" a `es_admin()`-. La de edición se llama hoy "lugares: edita autor, ligado o admin" (la
-- renombró `20260916120000_lugares_cuentas.sql` al sumar las cuentas ligadas, "¿Es tu espacio?"; conserva ese
-- alcance -`gestiona_lugar()`, que ya cubre autor, ligado y administración- para no tocar nada de esa pieza. La
-- política de lectura NO cambia: `(visible and not privado) or creado_por = auth.uid() or public.es_admin() or
-- public.gestiona_lugar(id)` (vigente desde `20260917093000_lectura_al_crear.sql`) ya daba a cada cuenta sus
-- propios lugares privados, sea quien sea.
drop policy "lugares: alta con sesión" on public.lugares;
create policy "lugares: alta con sesión" on public.lugares for insert to authenticated
  with check (creado_por = auth.uid());

drop policy "lugares: edita autor, ligado o admin" on public.lugares;
create policy "lugares: edita autor, ligado o admin" on public.lugares for update to authenticated
  using (public.gestiona_lugar(id))
  with check (public.gestiona_lugar(id));

-- ---------- auditoría de las funciones que leen public.lugares (bitácora 214) ----------
-- Encargo: revisar una por una las funciones `security definer`/vistas que leen `public.lugares` y anotar cuáles
-- filtran `privado` y cuáles no; corregir aquí las que sirven a algo público (mapa, listados, buscador, panel de
-- fichas, conteos, sitemap, "con eventos esta semana", destacados) y no lo hacen. Resultado (20 funciones que
-- referencian `public.lugares` en su definición vigente; la tabla completa, con el porqué de cada una, va en la
-- bitácora 214): TODAS ya filtran `privado` donde hace falta, o no hace falta (uso interno/de un solo id, o
-- admin-gated con `es_admin()`, donde mostrar el privado es intencional para la propia administración). Ninguna
-- necesitó `create or replace` en esta pieza:
--   Filtran `(visible and not privado)` o equivalente, para todos: avisos_evento_publico, cuenta_seguidores
--   (con excepción explícita para el propio dueño/gestor), indicadores_ahora, lugares_con_nombre,
--   lugares_parecidos, tira_destacados (pública, `grant ... to anon, authenticated`).
--   Uso interno de un solo lugar por id (trigger o permiso), sin exposición de listado, no aplica filtrar:
--   eventos_zona_del_lugar, gestiona_lugar, lugares_generar_slug, lugares_zona_a_sus_eventos,
--   obras_colectivas_zona_del_lugar.
--   Admin-gated con `public.es_admin()` (`grant ... to authenticated`, nunca a `anon`, y comprueban el rol dentro):
--   mostrar `privado` ahí es la administración viendo lo que gestiona, no una fuga a terceros -panel_comunidad,
--   panel_destacados, panel_eventos, panel_fichas_conteos, panel_lugares, panel_pendientes, panel_persona,
--   panel_personas, panel_resumen.
-- Sí se encontró y se corrigió (en código de aplicación, no en SQL) una fuga real: `src/app/lugares/page.tsx`
-- -el mapa y la lista PÚBLICOS de `/lugares`- confiaba solo en la política de lectura, que de propósito deja ver
-- a cada cuenta sus propios lugares privados: alguien con sesión que marcara un lugar privado se lo encontraba a
-- sí mismo en su propio mapa público. Corregido con `.eq("privado", false)` explícito, sin depender de la RLS
-- para eso (igual que ya hacían `lib/ciudades.ts`, `accionesBuscar.ts` y `lib/sitemap.ts`). Detalle y la prueba en
-- la bitácora 214 y `supabase/tests/pg/lugares-privados-de-todos.test.mjs`.
--
-- NO se aplica aquí: la aplica el founder o el gestor local antes de publicar (como toda migración de esta pieza).
