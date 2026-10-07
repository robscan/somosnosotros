-- somosnosotros · OL-315 · alta de lugar por pasos: el tipo «Café, bar o restaurante» y el horario del lugar (bitácoras 342 y 343)
-- Prototipo firmado `docs/rediseno/prototipos/lugar-artista-por-pasos.html`. Dos cosas, las dos solo añaden (ninguna fila cambia ni se borra):
--
-- 1. La lista cerrada de `lugares.tipo` gana `cafe_bar` («Café, bar o restaurante»): los negocios entran al directorio con su tipo (decisión
--    del founder, 2026-10-06; antes no entraban). Como en `20261005120000_tipo_plaza_parque.sql`, la restricción se vuelve a escribir con la
--    lista vigente más el valor nuevo; esa es la última migración que tocó `lugares_tipo_check`.
-- 2. El horario de un lugar, en franjas (decisiones 2 a 4 del acta): una fila por franja, con sus días (1 = lunes … 7 = domingo) y la hora en que
--    abre y cierra. Si cierra a la misma hora o antes de abrir, cierra al día siguiente (un bar de 20:00 a 02:00). Se guarda como se capturó: lo
--    que se enseña lo estructura la app (`src/lib/horarioLugar.ts`: une lo que se encima y agrupa los días con las mismas horas). Un lugar sin
--    filas aquí no dijo su horario. Las exposiciones lo tomarán de entrada más adelante.
--    Lee quien ve el lugar (la consulta de dentro pasa por las políticas de `lugares`) y escribe quien lo gestiona (autor, cuenta ligada o
--    administración: `gestiona_lugar`), como `eventos_sesiones` con su evento. Dos funciones: `guardar_horario_lugar` reemplaza el horario de un
--    lugar en una transacción (la usa editar) y `crear_lugar_con_horario` da de alta el lugar con su horario en la misma transacción (si el
--    horario no se puede guardar, el lugar tampoco queda).
-- Va ANTES de desplegar el código: el alta ofrece el tipo nuevo y el horario, y la ficha lee la tabla.

-- ---------- 1. «Café, bar o restaurante» ----------
alter table public.lugares drop constraint lugares_tipo_check;
alter table public.lugares add constraint lugares_tipo_check
  check (tipo in ('casa_de_cultura', 'museo', 'foro', 'galeria', 'escuela', 'colectivo', 'biblioteca', 'cafe_bar', 'plaza', 'otro'));

-- ---------- 2. El horario ----------
create table public.lugares_horarios (
  id uuid primary key default gen_random_uuid(),
  lugar_id uuid not null references public.lugares (id) on delete cascade,
  -- Los días de la franja, sin repetir (lo asegura `guardar_horario_lugar`): 1 = lunes … 7 = domingo.
  dias smallint[] not null,
  abre time not null,
  cierra time not null,
  creado_en timestamptz not null default now(),
  constraint lugares_horarios_dias check (cardinality(dias) between 1 and 7 and dias <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  -- Abrir y cerrar a la misma hora no es un horario (cerrar antes de abrir sí: cierra al día siguiente).
  constraint lugares_horarios_horas check (abre <> cierra)
);
create index lugares_horarios_lugar_idx on public.lugares_horarios (lugar_id);
comment on table public.lugares_horarios is 'El horario de un lugar en franjas (OL-315): días (1 = lunes … 7 = domingo), abre y cierra; cierra <= abre es al día siguiente. Sin filas, el lugar no dijo su horario.';

alter table public.lugares_horarios enable row level security;
create policy "lugares_horarios: lee quien ve el lugar" on public.lugares_horarios for select
  using (exists (select 1 from public.lugares l where l.id = lugar_id));
create policy "lugares_horarios: escribe quien gestiona el lugar" on public.lugares_horarios for insert to authenticated
  with check (public.gestiona_lugar(lugar_id));
create policy "lugares_horarios: edita quien gestiona el lugar" on public.lugares_horarios for update to authenticated
  using (public.gestiona_lugar(lugar_id)) with check (public.gestiona_lugar(lugar_id));
create policy "lugares_horarios: borra quien gestiona el lugar" on public.lugares_horarios for delete to authenticated
  using (public.gestiona_lugar(lugar_id));

-- Reemplaza el horario de un lugar: borra sus franjas y escribe las nuevas, en la misma transacción. `p_franjas` es una lista de
-- {"dias": [1, 2, …], "abre": "HH:MM", "cierra": "HH:MM"}; la lista vacía deja el lugar sin horario. Los días repetidos se cuentan una vez;
-- una franja sin días, fuera de la semana o que abre y cierra a la misma hora rechaza todo. Con los permisos de quien llama (RLS).
create function public.guardar_horario_lugar(p_lugar uuid, p_franjas jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  f jsonb;
  v_dias smallint[];
begin
  if jsonb_typeof(p_franjas) is distinct from 'array' or jsonb_array_length(p_franjas) > 50 then
    raise exception 'horario_invalido' using errcode = '22023';
  end if;
  if not public.gestiona_lugar(p_lugar) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  delete from public.lugares_horarios where lugar_id = p_lugar;
  for f in select * from jsonb_array_elements(p_franjas) loop
    if jsonb_typeof(f) is distinct from 'object' or jsonb_typeof(f->'dias') is distinct from 'array' then
      raise exception 'horario_invalido' using errcode = '22023';
    end if;
    select array_agg(distinct d::smallint order by d::smallint) into v_dias from jsonb_array_elements_text(f->'dias') d;
    insert into public.lugares_horarios (lugar_id, dias, abre, cierra)
    values (p_lugar, coalesce(v_dias, '{}'), (f->>'abre')::time, (f->>'cierra')::time);
  end loop;
end $$;
revoke all on function public.guardar_horario_lugar(uuid, jsonb) from public, anon;
grant execute on function public.guardar_horario_lugar(uuid, jsonb) to authenticated;

-- Da de alta un lugar con su horario en una sola transacción y devuelve {"id", "slug"}. `p_datos` lleva las mismas columnas que el alta de
-- siempre (`crearLugar`); el autor es quien llama, nunca lo que diga `p_datos`. Con los permisos de quien llama (RLS de `lugares` y de esta tabla).
create function public.crear_lugar_con_horario(p_datos jsonb, p_franjas jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  d public.lugares;
  v_id uuid;
  v_slug text;
begin
  d := jsonb_populate_record(null::public.lugares, p_datos);
  insert into public.lugares (nombre, tipo, direccion, lat, lng, descripcion, redes, portada, privado, detalle, ciudad, zona, creado_por)
  values (d.nombre, d.tipo, d.direccion, d.lat, d.lng, d.descripcion, coalesce(d.redes, '[]'::jsonb), d.portada, coalesce(d.privado, false), d.detalle,
    d.ciudad, coalesce(d.zona, 'America/Mexico_City'), auth.uid())
  returning id, slug into v_id, v_slug;
  perform public.guardar_horario_lugar(v_id, p_franjas);
  return jsonb_build_object('id', v_id, 'slug', v_slug);
end $$;
revoke all on function public.crear_lugar_con_horario(jsonb, jsonb) from public, anon;
grant execute on function public.crear_lugar_con_horario(jsonb, jsonb) to authenticated;
