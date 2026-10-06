-- somosnosotros · OL-311 · horario por día en un evento de varios días: la tabla de sesiones (bitácora 338 y 339)
-- Prototipo firmado `docs/rediseno/prototipos/horario-por-dia.html`: con la casilla «Mismo horario todos los días» desmarcada, cada día
-- del evento lleva su propia hora de inicio y de fin. Esas horas viven aquí, una fila por día. El evento no cambia: sigue con su `inicio`
-- (la hora del primer día) y su `fin` (la del último, o el fin de ese día) de siempre, así que la agenda, las búsquedas, los avisos y el
-- panel no se enteran. Un evento con el mismo horario cada día no tiene filas aquí.
-- Solo añade: una tabla (con su índice y sus políticas) y una función nueva que envuelve a `guardar_evento_con_avisos` sin tocarla. No
-- borra ni cambia nada existente. El modelo es el mismo del «taller con sesiones» de `docs/investigaciones/eventos-modelo.md`.

create table public.eventos_sesiones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  -- El día de la sesión en la zona del evento (la función lo calcula del inicio): único por evento.
  fecha date not null,
  inicio timestamptz not null,
  -- Sin hora de fin es null: la sesión dura hasta que acaba su día.
  fin timestamptz,
  constraint eventos_sesiones_fin_despues check (fin is null or fin > inicio),
  -- La llave única es también el índice por evento (`evento_id` va primero): la ficha pide las sesiones de un evento ordenadas por día.
  constraint eventos_sesiones_un_dia unique (evento_id, fecha)
);
comment on table public.eventos_sesiones is 'Una fila por día de un evento de varios días con horarios distintos (OL-311). Sin filas, el evento tiene el mismo horario cada día (su inicio y su fin).';

alter table public.eventos_sesiones enable row level security;
-- Lee quien ve el evento: la consulta de dentro pasa por las políticas de `eventos` (visible, autor, administración, bloqueos).
create policy "eventos_sesiones: lee quien ve el evento" on public.eventos_sesiones for select
  using (exists (select 1 from public.eventos e where e.id = evento_id));
create policy "eventos_sesiones: escribe quien gestiona el evento" on public.eventos_sesiones for insert to authenticated
  with check (public.gestiona_evento(evento_id));
create policy "eventos_sesiones: edita quien gestiona el evento" on public.eventos_sesiones for update to authenticated
  using (public.gestiona_evento(evento_id)) with check (public.gestiona_evento(evento_id));
create policy "eventos_sesiones: borra quien gestiona el evento" on public.eventos_sesiones for delete to authenticated
  using (public.gestiona_evento(evento_id));

-- Guarda el evento (la misma función de siempre: evento, sitio privado, artistas y avisos) y, en la misma transacción, sus sesiones. Si
-- algo falla (un día repetido, una hora fuera de su día), se revierte todo, el evento también. `p_sesiones` es una lista de
-- {"inicio": instante, "fin": instante o null}; null no toca las sesiones. Un reintento de la misma operación (`repetido`) no las vuelve a escribir.
-- Reglas: de 2 a 31 sesiones, cada una en un día distinto del evento (en su zona), el fin después del inicio y sin pasar del final de su
-- día, la primera empieza cuando empieza el evento y la última cae en el día en que termina.
create function public.guardar_evento_con_sesiones(p_evento uuid, p_datos jsonb, p_privado jsonb, p_quien jsonb, p_sesiones jsonb,
  p_revision timestamptz default null, p_operacion uuid default null) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  resultado jsonb;
  e public.eventos;
  s jsonb;
  v_inicio timestamptz;
  v_fin timestamptz;
  v_fecha date;
  dia_inicial date;
  dia_final date;
begin
  if p_sesiones is not null and (jsonb_typeof(p_sesiones) is distinct from 'array'
    or jsonb_array_length(p_sesiones) < 2 or jsonb_array_length(p_sesiones) > 31) then
    raise exception 'sesiones_invalidas' using errcode = '22023';
  end if;
  resultado := public.guardar_evento_con_avisos(p_evento, p_datos, p_privado, p_quien, p_revision, p_operacion);
  if p_sesiones is null or coalesce((resultado->>'repetido')::boolean, false) then
    return resultado;
  end if;
  select * into e from public.eventos where id = (resultado->>'id')::uuid;
  if not found or e.fin is null then
    raise exception 'sesiones_invalidas' using errcode = '22023';
  end if;
  dia_inicial := pg_catalog.timezone(e.zona, e.inicio)::date;
  dia_final := pg_catalog.timezone(e.zona, e.fin)::date;
  delete from public.eventos_sesiones where evento_id = e.id;
  for s in select * from jsonb_array_elements(p_sesiones) loop
    if jsonb_typeof(s) is distinct from 'object' or coalesce(s->>'inicio', '') = '' then
      raise exception 'sesiones_invalidas' using errcode = '22023';
    end if;
    v_inicio := (s->>'inicio')::timestamptz;
    v_fin := nullif(s->>'fin', '')::timestamptz;
    v_fecha := pg_catalog.timezone(e.zona, v_inicio)::date;
    if v_fecha < dia_inicial or v_fecha > dia_final
      or (v_fin is not null and v_fin > pg_catalog.timezone(e.zona, (v_fecha + 1)::timestamp)) then
      raise exception 'sesiones_invalidas' using errcode = '22023';
    end if;
    insert into public.eventos_sesiones (evento_id, fecha, inicio, fin) values (e.id, v_fecha, v_inicio, v_fin);
  end loop;
  -- Lo que se guarda en el evento sale de la primera y la última: si no coinciden, las sesiones y el evento se contradicen.
  if not exists (select 1 from public.eventos_sesiones where evento_id = e.id and inicio = e.inicio)
    or not exists (select 1 from public.eventos_sesiones where evento_id = e.id and fecha = dia_final) then
    raise exception 'sesiones_invalidas' using errcode = '22023';
  end if;
  return resultado;
end $$;
revoke all on function public.guardar_evento_con_sesiones(uuid, jsonb, jsonb, jsonb, jsonb, timestamptz, uuid) from public, anon;
grant execute on function public.guardar_evento_con_sesiones(uuid, jsonb, jsonb, jsonb, jsonb, timestamptz, uuid) to authenticated;
