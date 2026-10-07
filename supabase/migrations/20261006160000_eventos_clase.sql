-- somosnosotros · OL-321 · exposición, taller y festival: cómo ocurre un evento (doc 55 §1, bitácora 350)
-- Una sola identidad por actividad y su forma de ocurrir aparte (modelo de OL-272): `eventos.clase` dice si es un evento que pasa un día a
-- una hora (`puntual`, todo lo de hoy), una exposición que se visita varios días en un horario, un taller o curso de varias sesiones (sus
-- días en `eventos_sesiones`, la tabla de OL-311) o un festival que agrupa varios eventos (cada acto apunta a su marco con
-- `evento_padre_id`; doc 42). La exposición puede tener un horario propio (`eventos_horarios`, igual que `lugares_horarios`; sin filas usa el
-- del lugar y, sin ninguno, «Horario por confirmar») y una inauguración, que es un acto puntual aparte (`inaugura_id`).
--
-- Cómo se guardan las fechas (lo demás no cambia: agenda, búsquedas, avisos y panel siguen leyendo `inicio`, `fin` y `termina`):
-- - Exposición: `inicio` = el primer día de visita (00:00 en su zona) y `fin` = el final del día de cierre (23:59, la regla de «acaba con su
--   último día» de la app); pasa al terminar ese día.
-- - Taller: `inicio`/`fin` de la primera y la última sesión; una fila por sesión en `eventos_sesiones` (días sueltos, no un rango).
-- - Festival: `inicio`/`fin` = del primer al último acto visible (`recalcular_festival` los pone cada vez que cambia su programa).
--
-- Solo añade: cuatro columnas con su valor de siempre, sus restricciones, una tabla, un disparador y funciones nuevas que envuelven a las de
-- siempre sin tocarlas. Ninguna fila cambia de significado (todas quedan `puntual`). Va ANTES de desplegar el código: el alta manda la clase.

-- ---------- 1. Las columnas ----------
alter table public.eventos add column clase text not null default 'puntual'
  constraint eventos_clase_valida check (clase in ('puntual', 'exposicion', 'taller', 'festival'));
alter table public.eventos add column evento_padre_id uuid references public.eventos (id) on delete set null;
alter table public.eventos add column inaugura_id uuid references public.eventos (id) on delete set null;
-- Un acto del programa que se registró sin publicar (desmarcado en «El cartel trae N eventos»): oculto y ligado a su festival, hasta que su
-- autor lo publica (`publicar_borrador_de_programa`). Distinto de un evento que la administración ocultó: ese nunca es borrador.
alter table public.eventos add column borrador boolean not null default false;

comment on column public.eventos.clase is 'Cómo ocurre (OL-321): puntual (un día a una hora), exposicion (periodo visitable), taller (sesiones en eventos_sesiones) o festival (marco con actos que apuntan a él).';
comment on column public.eventos.evento_padre_id is 'El festival del que este evento es un acto (doc 42, OL-321). Sin anidar: un festival no tiene padre.';
comment on column public.eventos.inaugura_id is 'El acto puntual que inaugura esta exposición (OL-321); opcional.';
comment on column public.eventos.borrador is 'Acto de un programa registrado sin publicar (OL-321): oculto hasta que su autor lo publica.';

-- Sin anidar festivales ni ligarse a sí mismo; solo una exposición tiene inauguración; un borrador siempre es de un festival.
alter table public.eventos add constraint eventos_padre_sin_anidar
  check (evento_padre_id is null or (clase <> 'festival' and evento_padre_id <> id));
alter table public.eventos add constraint eventos_inaugura_de_exposicion
  check (inaugura_id is null or (clase = 'exposicion' and inaugura_id <> id));
alter table public.eventos add constraint eventos_borrador_con_padre
  check (not borrador or evento_padre_id is not null);
-- El programa de un festival se pide por su marco.
create index eventos_padre_idx on public.eventos (evento_padre_id) where evento_padre_id is not null;

-- ---------- 2. Que lo ligado tenga sentido ----------
-- El padre es un festival que quien guarda gestiona (su autor o la administración): un marco ajeno sería una propuesta pendiente, que este
-- modelo todavía no tiene (por confirmar con el founder). La inauguración es un acto puntual que también gestiona. Un festival con actos no
-- deja de serlo. Solo la administración convierte en borrador un evento que ya existe (así un evento que ocultó no se vuelve a mostrar
-- como «borrador»). Con los permisos de quien llama.
create function public.eventos_clase_coherente() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  ligado public.eventos;
  cliente boolean := current_user in ('anon', 'authenticated');
begin
  if new.evento_padre_id is not null and (tg_op = 'INSERT' or new.evento_padre_id is distinct from old.evento_padre_id) then
    select * into ligado from public.eventos where id = new.evento_padre_id;
    if not found or ligado.clase <> 'festival' then
      raise exception 'padre_no_es_festival' using errcode = '23514';
    end if;
    if cliente and not public.gestiona_evento(ligado.id) then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
  end if;
  if new.inaugura_id is not null and (tg_op = 'INSERT' or new.inaugura_id is distinct from old.inaugura_id) then
    select * into ligado from public.eventos where id = new.inaugura_id;
    if not found or ligado.clase <> 'puntual' then
      raise exception 'inauguracion_no_es_puntual' using errcode = '23514';
    end if;
    if cliente and not public.gestiona_evento(ligado.id) then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'UPDATE' and old.clase = 'festival' and new.clase <> 'festival'
    and exists (select 1 from public.eventos a where a.evento_padre_id = new.id) then
    raise exception 'festival_con_actos' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.borrador and not old.borrador and cliente and not public.es_admin() then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger eventos_clase_coherente before insert or update of clase, evento_padre_id, inaugura_id, borrador on public.eventos
  for each row execute function public.eventos_clase_coherente();

-- ---------- 3. El horario propio de una exposición ----------
create table public.eventos_horarios (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  -- Los días de la franja, sin repetir: 1 = lunes … 7 = domingo (como `lugares_horarios`).
  dias smallint[] not null,
  abre time not null,
  cierra time not null,
  creado_en timestamptz not null default now(),
  constraint eventos_horarios_dias check (cardinality(dias) between 1 and 7 and dias <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  -- Abrir y cerrar a la misma hora no es un horario; cerrar antes de abrir es al día siguiente.
  constraint eventos_horarios_horas check (abre <> cierra)
);
create index eventos_horarios_evento_idx on public.eventos_horarios (evento_id);
comment on table public.eventos_horarios is 'El horario propio de una exposición, en franjas (OL-321), como lugares_horarios. Sin filas, la exposición usa el horario del lugar; sin ninguno, «Horario por confirmar».';

alter table public.eventos_horarios enable row level security;
create policy "eventos_horarios: lee quien ve el evento" on public.eventos_horarios for select
  using (exists (select 1 from public.eventos e where e.id = evento_id));
create policy "eventos_horarios: escribe quien gestiona el evento" on public.eventos_horarios for insert to authenticated
  with check (public.gestiona_evento(evento_id));
create policy "eventos_horarios: edita quien gestiona el evento" on public.eventos_horarios for update to authenticated
  using (public.gestiona_evento(evento_id)) with check (public.gestiona_evento(evento_id));
create policy "eventos_horarios: borra quien gestiona el evento" on public.eventos_horarios for delete to authenticated
  using (public.gestiona_evento(evento_id));

-- ---------- 4. El periodo de un festival ----------
-- Del primer al último acto visible (con hora de fin, su fin; sin ella, el final de su día: `termina`). Sin actos visibles no se toca. Con
-- los permisos de quien llama: solo cambia el marco que gestiona.
create function public.recalcular_festival(p_festival uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_inicio timestamptz;
  v_fin timestamptz;
begin
  select min(a.inicio), max(a.termina) into v_inicio, v_fin
    from public.eventos a where a.evento_padre_id = p_festival and a.visible;
  if v_inicio is null then
    return;
  end if;
  update public.eventos set inicio = v_inicio, fin = v_fin
    where id = p_festival and clase = 'festival' and (inicio is distinct from v_inicio or fin is distinct from v_fin);
end $$;
revoke all on function public.recalcular_festival(uuid) from public, anon;
grant execute on function public.recalcular_festival(uuid) to authenticated;

-- ---------- 5. Borradores del programa ----------
-- Ocultar como borrador un acto propio recién registrado (lo llama `publicar_programa`): solo uno visible, propio y ya ligado a su festival.
-- Uno que la administración ocultó no está visible y no se puede volver borrador (no se colaría de vuelta por `publicar_borrador_de_programa`).
create function public.programa_ocultar_borrador(p_evento uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.eventos set visible = false, borrador = true
    where id = p_evento and visible and creado_por = auth.uid() and evento_padre_id is not null;
  if not found then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
end $$;
revoke all on function public.programa_ocultar_borrador(uuid) from public, anon;
grant execute on function public.programa_ocultar_borrador(uuid) to authenticated;

-- Publicar un borrador del programa (desde la ficha del festival): lo vuelve visible y el festival recalcula su periodo. Solo su autor.
create function public.publicar_borrador_de_programa(p_evento uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_padre uuid;
begin
  update public.eventos set visible = true, borrador = false
    where id = p_evento and borrador and creado_por = auth.uid()
    returning evento_padre_id into v_padre;
  if not found then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  perform public.recalcular_festival(v_padre);
  return jsonb_build_object('id', p_evento, 'padre', v_padre);
end $$;
revoke all on function public.publicar_borrador_de_programa(uuid) from public, anon;
grant execute on function public.publicar_borrador_de_programa(uuid) to authenticated;

-- ---------- 6. Guardar un evento con su clase ----------
-- El alta y editar por pasos (OL-321): el evento, su horario por día o sus sesiones (la función de OL-311 o la de editar de OL-319, tal
-- cual) y, en la misma transacción, su clase, el festival del que es parte (uno existente que gestiona, o uno nuevo con solo el nombre: el
-- marco toma su periodo del programa registrado), el horario propio de la exposición y su inauguración (un acto puntual con el mismo sitio,
-- cartel, artistas y precio, sin el horario de visita). `p_clase`:
--   {"clase": "puntual|exposicion|taller|festival",
--    "padre": uuid | null, "padre_nuevo": {"titulo", "operacion"} | null,
--    "horario": [{"dias", "abre", "cierra"}] | null,
--    "inauguracion": {"inicio", "fin" | null, "operacion"} | null}
-- Un festival nuevo se publica con `publicar_programa` (con sus actos); aquí solo se edita uno que ya existe. Un reintento de la misma
-- operación (`repetido`) no vuelve a tocar nada: lo demás se guardó en la misma transacción que el evento.
create function public.guardar_evento_con_clase(p_evento uuid, p_datos jsonb, p_privado jsonb, p_quien jsonb, p_sesiones jsonb, p_clase jsonb,
  p_revision timestamptz default null, p_operacion uuid default null) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  resultado jsonb;
  e public.eventos;
  v_clase text;
  v_padre uuid;
  v_padre_antes uuid;
  v_clase_antes text;
  v_inaug uuid;
  v_op uuid;
  v_titulo text;
  v_dias smallint[];
  marco public.eventos;
  f jsonb;
  i jsonb;
begin
  if jsonb_typeof(p_clase) is distinct from 'object' then
    raise exception 'clase_invalida' using errcode = '22023';
  end if;
  v_clase := coalesce(nullif(p_clase->>'clase', ''), 'puntual');
  if v_clase not in ('puntual', 'exposicion', 'taller', 'festival') then
    raise exception 'clase_invalida' using errcode = '22023';
  end if;
  if p_evento is not null then
    select evento_padre_id, clase into v_padre_antes, v_clase_antes from public.eventos where id = p_evento;
  end if;
  if v_clase = 'festival' and v_clase_antes is distinct from 'festival' then
    raise exception 'festival_por_programa' using errcode = '22023';
  end if;

  if p_evento is null then
    resultado := public.guardar_evento_con_sesiones(null, p_datos, p_privado, p_quien, p_sesiones, null, p_operacion);
  else
    resultado := public.editar_evento_con_sesiones(p_evento, p_datos, p_privado, p_quien, p_sesiones, p_revision, p_operacion);
  end if;
  if coalesce((resultado->>'repetido')::boolean, false) then
    return resultado;
  end if;
  select * into e from public.eventos where id = (resultado->>'id')::uuid;

  -- El festival del que es parte: uno que ya existe o uno nuevo con solo el nombre (el mismo sitio y el periodo de este acto, para empezar).
  v_padre := case when v_clase = 'festival' then null else nullif(p_clase->>'padre', '')::uuid end;
  if v_clase <> 'festival' and jsonb_typeof(p_clase->'padre_nuevo') = 'object' then
    v_titulo := btrim(coalesce(p_clase->'padre_nuevo'->>'titulo', ''));
    v_op := nullif(p_clase->'padre_nuevo'->>'operacion', '')::uuid;
    if v_titulo = '' or char_length(v_titulo) > 120 or v_op is null then
      raise exception 'festival_invalido' using errcode = '22023';
    end if;
    select * into marco from public.eventos where id = v_op;
    if not found then
      insert into public.eventos (id, operacion_guardado, titulo, inicio, fin, lugar_id, sitio_texto, sitio_direccion, sitio_lat, sitio_lng,
        sitio_reservado, ciudad, zona, creado_por, clase)
      values (v_op, v_op, v_titulo, e.inicio, e.termina, e.lugar_id,
        case when e.lugar_id is null then e.sitio_texto end,
        case when e.sitio_reservado then null else e.sitio_direccion end,
        case when e.sitio_reservado then null else e.sitio_lat end,
        case when e.sitio_reservado then null else e.sitio_lng end,
        false, e.ciudad, e.zona, auth.uid(), 'festival');
    elsif marco.creado_por is distinct from auth.uid() or marco.clase <> 'festival' then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
    v_padre := v_op;
  end if;

  -- El horario propio de la exposición: se reemplaza entero (sin franjas, usa el del lugar).
  delete from public.eventos_horarios where evento_id = e.id;
  if v_clase = 'exposicion' and jsonb_typeof(p_clase->'horario') = 'array' then
    if jsonb_array_length(p_clase->'horario') > 50 then
      raise exception 'horario_invalido' using errcode = '22023';
    end if;
    for f in select * from jsonb_array_elements(p_clase->'horario') loop
      if jsonb_typeof(f) is distinct from 'object' or jsonb_typeof(f->'dias') is distinct from 'array' then
        raise exception 'horario_invalido' using errcode = '22023';
      end if;
      select array_agg(distinct d::smallint order by d::smallint) into v_dias from jsonb_array_elements_text(f->'dias') d;
      insert into public.eventos_horarios (evento_id, dias, abre, cierra)
      values (e.id, coalesce(v_dias, '{}'), (f->>'abre')::time, (f->>'cierra')::time);
    end loop;
  end if;

  -- La inauguración: un acto puntual ligado. Si ya tiene una, cambia su día y su hora; si no, se publica (con sus avisos, como cualquier alta).
  v_inaug := case when v_clase = 'exposicion' then e.inaugura_id end;
  if v_clase = 'exposicion' and jsonb_typeof(p_clase->'inauguracion') = 'object' then
    i := p_clase->'inauguracion';
    if e.sitio_reservado then
      raise exception 'inauguracion_en_sitio_reservado' using errcode = '23514';
    end if;
    if v_inaug is not null then
      update public.eventos set inicio = (i->>'inicio')::timestamptz, fin = nullif(i->>'fin', '')::timestamptz
        where id = v_inaug and (inicio is distinct from (i->>'inicio')::timestamptz or fin is distinct from nullif(i->>'fin', '')::timestamptz);
    else
      v_op := nullif(i->>'operacion', '')::uuid;
      if v_op is null or coalesce(i->>'inicio', '') = '' then
        raise exception 'inauguracion_invalida' using errcode = '22023';
      end if;
      v_inaug := (public.guardar_evento_con_avisos(null,
        p_datos || jsonb_build_object('titulo', left('Inauguración: ' || e.titulo, 120), 'inicio', i->>'inicio', 'fin', nullif(i->>'fin', '')),
        null, p_quien, null, v_op)->>'id')::uuid;
    end if;
  end if;

  if e.clase is distinct from v_clase or e.evento_padre_id is distinct from v_padre or e.inaugura_id is distinct from v_inaug then
    update public.eventos set clase = v_clase, evento_padre_id = v_padre, inaugura_id = v_inaug where id = e.id;
  end if;

  -- El periodo de los festivales que cambian de programa: al que entra (o al marco que se edita) y al que deja.
  if v_clase = 'festival' then
    perform public.recalcular_festival(e.id);
  end if;
  if v_padre is not null then
    perform public.recalcular_festival(v_padre);
  end if;
  if v_padre_antes is not null and v_padre_antes is distinct from v_padre then
    perform public.recalcular_festival(v_padre_antes);
  end if;
  return resultado || jsonb_build_object('padre', v_padre, 'inauguracion', v_inaug);
end $$;
comment on function public.guardar_evento_con_clase(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz, uuid) is 'Alta y editar por pasos con la clase (OL-321): el evento y sus sesiones como siempre y, en la misma transacción, clase, festival, horario propio e inauguración.';
revoke all on function public.guardar_evento_con_clase(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz, uuid) from public, anon;
grant execute on function public.guardar_evento_con_clase(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz, uuid) to authenticated;

-- ---------- 7. Publicar un programa (H6) ----------
-- El cartel trae varios eventos de un festival: se publican el marco y sus actos en una sola operación, o nada. `p_marco`:
-- {"datos": columnas del marco (titulo, imagen, precio, descripcion, enlace), "quien": [...]}; `p_actos`: lista de
-- {"datos": columnas de `eventos` como en el alta, "privado": sitio reservado o null, "quien": [...], "publicar": true|false, "operacion": uuid}.
-- Los marcados se publican con sus avisos (como cualquier alta); los desmarcados quedan como borradores del festival. El marco toma el sitio
-- del primer acto publicado (cada acto conserva su sede) y su periodo del programa. `p_operacion` es la clave del marco: un reintento devuelve
-- lo ya publicado sin repetir nada. Con los permisos de quien llama.
create function public.publicar_programa(p_marco jsonb, p_actos jsonb, p_operacion uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  marco public.eventos;
  primero public.eventos;
  a jsonb;
  v_id uuid;
  publicados uuid[] := '{}';
  borradores uuid[] := '{}';
  v_inicio timestamptz;
  v_fin timestamptz;
begin
  if auth.uid() is null then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_operacion is null then
    raise exception 'operacion_requerida' using errcode = '22023';
  end if;
  if jsonb_typeof(p_marco) is distinct from 'object' or jsonb_typeof(p_marco->'datos') is distinct from 'object'
    or jsonb_typeof(p_actos) is distinct from 'array' or jsonb_array_length(p_actos) < 1 or jsonb_array_length(p_actos) > 40 then
    raise exception 'programa_invalido' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(7304, hashtext(p_operacion::text));
  select * into marco from public.eventos where id = p_operacion;
  if found then
    if marco.creado_por is distinct from auth.uid() then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
    return jsonb_build_object('id', marco.id, 'repetido', true,
      'actos', (select coalesce(jsonb_agg(x.id order by x.inicio), '[]') from public.eventos x where x.evento_padre_id = marco.id and not x.borrador),
      'borradores', (select coalesce(jsonb_agg(x.id order by x.inicio), '[]') from public.eventos x where x.evento_padre_id = marco.id and x.borrador));
  end if;

  -- Los actos que se publican, con sus avisos.
  for a in select * from jsonb_array_elements(p_actos) loop
    if jsonb_typeof(a) is distinct from 'object' or jsonb_typeof(a->'datos') is distinct from 'object' or nullif(a->>'operacion', '') is null then
      raise exception 'programa_invalido' using errcode = '22023';
    end if;
    if coalesce((a->>'publicar')::boolean, false) then
      v_id := (public.guardar_evento_con_avisos(null, a->'datos', a->'privado', coalesce(a->'quien', '[]'::jsonb), null, (a->>'operacion')::uuid)->>'id')::uuid;
      publicados := array_append(publicados, v_id);
    end if;
  end loop;
  if cardinality(publicados) = 0 then
    raise exception 'programa_vacio' using errcode = '22023';
  end if;

  -- El marco: el sitio del primer acto publicado y el periodo del programa; sin avisos propios (los dan sus actos).
  select * into primero from public.eventos where id = publicados[1];
  select min(x.inicio), max(x.termina) into v_inicio, v_fin from public.eventos x where x.id = any(publicados);
  perform public.guardar_evento_completo(null,
    (p_marco->'datos') || jsonb_build_object('inicio', v_inicio, 'fin', v_fin, 'lugar_id', primero.lugar_id,
      'sitio_texto', case when primero.lugar_id is null then primero.sitio_texto end,
      'sitio_direccion', case when primero.sitio_reservado then null else primero.sitio_direccion end,
      'sitio_lat', case when primero.sitio_reservado then null else primero.sitio_lat end,
      'sitio_lng', case when primero.sitio_reservado then null else primero.sitio_lng end,
      'sitio_reservado', false, 'sitio_revelar_desde', null, 'ciudad', primero.ciudad, 'zona', primero.zona),
    null, coalesce(p_marco->'quien', '[]'::jsonb), null, p_operacion);
  update public.eventos set clase = 'festival' where id = p_operacion;
  update public.eventos set evento_padre_id = p_operacion where id = any(publicados);

  -- Los desmarcados: registrados en el programa, sin avisos y ocultos como borradores.
  for a in select * from jsonb_array_elements(p_actos) loop
    if not coalesce((a->>'publicar')::boolean, false) then
      v_id := (public.guardar_evento_completo(null, a->'datos', a->'privado', coalesce(a->'quien', '[]'::jsonb), null, (a->>'operacion')::uuid)->>'id')::uuid;
      update public.eventos set evento_padre_id = p_operacion where id = v_id;
      perform public.programa_ocultar_borrador(v_id);
      borradores := array_append(borradores, v_id);
    end if;
  end loop;
  perform public.recalcular_festival(p_operacion);
  return jsonb_build_object('id', p_operacion, 'actos', to_jsonb(publicados), 'borradores', to_jsonb(borradores));
end $$;
comment on function public.publicar_programa(jsonb, jsonb, uuid) is 'H6 (OL-321): el marco de un festival y sus actos en una sola operación atómica e idempotente; los desmarcados quedan como borradores.';
revoke all on function public.publicar_programa(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.publicar_programa(jsonb, jsonb, uuid) to authenticated;
