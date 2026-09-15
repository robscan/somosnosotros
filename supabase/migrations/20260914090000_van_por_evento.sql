-- Cuántos van a cada evento, contado en la base (revisión 2026-09-14, A1): antes la agenda traía todas las
-- asistencias de la historia para contarlas en JS, y PostgREST corta en 1 000 filas sin avisar.
create or replace function public.van_por_evento(ids uuid[])
returns table (evento_id uuid, n bigint)
language sql stable security invoker set search_path = public as $$
  select evento_id, count(*) from public.asistencias
  where estado = 'voy' and evento_id = any(ids)
  group by evento_id;
$$;
