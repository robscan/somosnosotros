-- somosnosotros · OL-486 · regla general del Security Advisor (R14 del barrido OL-482, bitácora 518)
-- La prueba supabase/tests/pg/security-advisor.test.mjs ya no revisa solo una lista fija: recorre todas las funciones
-- propias de `public`. Al pasarla salieron diez funciones que la incumplían. Esta migración solo corrige eso:
-- `alter function … set search_path = ''`, `revoke` y el `grant` explícito que conserva a quien hoy la necesita.
-- No cambia cuerpos, tablas ni políticas. Ningún disparador necesita EXECUTE del cliente para dispararse: PostgreSQL
-- solo comprueba ese permiso al crear el disparador (por eso el banco ya prueba que crear_perfil o poner_nombre_orden
-- siguen funcionando sin él).
begin;

-- 1. bloqueado_por_mi(uuid) — migración 20260925150000_bloqueos.sql.
--    Era SECURITY DEFINER con `search_path = public` (no vacío) y con EXECUTE para PUBLIC. Su cuerpo ya cualifica
--    todo (public.bloqueos, auth.uid()), así que el path vacío no cambia lo que devuelve.
alter function public.bloqueado_por_mi(uuid) set search_path = '';
--    La llaman las políticas de lectura de `eventos` y `novedades_artista`, que también evalúa anon: se quita PUBLIC y se
--    deja la ejecución explícita a anon, authenticated y service_role (sin sesión devuelve false sin tocar la tabla).
revoke all on function public.bloqueado_por_mi(uuid) from public;
grant execute on function public.bloqueado_por_mi(uuid) to anon, authenticated, service_role;

-- 2. Los cinco disparadores de avisos a la administración — migración 20260922150000_avisos_admin.sql.
--    SECURITY DEFINER con EXECUTE para PUBLIC, anon y authenticated: una cuenta podía ponerlos en una tabla temporal suya
--    y encolar avisos falsos a la administración (el mismo hueco que OL-077 cerró en crear_perfil). Se quitan a los
--    clientes; service_role conserva su ejecución, como en el resto de los disparadores internos.
revoke all on function public.avisos_admin_trigger_reportes() from public, anon, authenticated;
revoke all on function public.avisos_admin_trigger_eventos() from public, anon, authenticated;
revoke all on function public.avisos_admin_trigger_lugares() from public, anon, authenticated;
revoke all on function public.avisos_admin_trigger_artistas() from public, anon, authenticated;
revoke all on function public.avisos_admin_trigger_perfiles() from public, anon, authenticated;
grant execute on function public.avisos_admin_trigger_reportes(), public.avisos_admin_trigger_eventos(),
  public.avisos_admin_trigger_lugares(), public.avisos_admin_trigger_artistas(), public.avisos_admin_trigger_perfiles()
  to service_role;

-- 3. Tres disparadores SECURITY INVOKER con EXECUTE para PUBLIC:
--    eventos_clase_coherente() (20261006160000_eventos_clase.sql), eventos_colores_cartel_al_cambiar()
--    (20261009120000_colores_cartel.sql) y eventos_cartel_huella() (20261028130000_cartel_huella.sql).
--    Invoker no da privilegios, pero ningún cliente tiene por qué llamarlos: se quitan como los demás internos.
revoke all on function public.eventos_clase_coherente() from public, anon, authenticated;
revoke all on function public.eventos_colores_cartel_al_cambiar() from public, anon, authenticated;
revoke all on function public.eventos_cartel_huella() from public, anon, authenticated;
grant execute on function public.eventos_clase_coherente(), public.eventos_colores_cartel_al_cambiar(),
  public.eventos_cartel_huella() to service_role;

-- 4. fin_en_programa(timestamptz, timestamptz, text) — migración 20261009130000_festival_rango_ultimo_acto.sql.
--    Cálculo puro e invoker, con EXECUTE para PUBLIC. Solo lo usa recalcular_festival (invoker, solo authenticated):
--    se quita a PUBLIC y anon y se conserva a authenticated y service_role.
revoke all on function public.fin_en_programa(timestamptz, timestamptz, text) from public, anon;
grant execute on function public.fin_en_programa(timestamptz, timestamptz, text) to authenticated, service_role;

-- 5. pincel_activo() — migración 20260922180000_pincel_freno.sql.
--    Invoker, falla cerrado, con EXECUTE para PUBLIC. La pared y el mando la consultan desde el servidor, también sin
--    sesión (src/app/obra/consultas.ts): se quita PUBLIC y se deja explícita a anon, authenticated y service_role.
revoke all on function public.pincel_activo() from public;
grant execute on function public.pincel_activo() to anon, authenticated, service_role;

commit;
