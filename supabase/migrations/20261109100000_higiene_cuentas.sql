-- somosnosotros · OL-512 · migración 20261109100000 · higiene de cuentas y permisos (bitácora 545)
-- Pieza 1 de la revisión de la plataforma (OL-511, bitácora 544). Founder (2026-11-09): «Adelante con las piezas 1 y 2, acepto tus recomendaciones».
--
-- Se puede aplicar dos veces: `create or replace`, `drop policy if exists` + `create policy`, `revoke`/`grant`. No borra tablas, columnas ni datos.
--   1. Las cuentas nuevas nacen sin el nombre sacado del correo: el del proveedor (Apple, Google) si lo da; si no, vacío. La app pide el nombre
--      al entrar. Lo demás de `crear_perfil` sigue igual (foto filtrada, rol por `admin_correos`, correo encendido con su fecha).
--   2. Un perfil se lee si es el propio, si quien mira es la administración o si la cuenta ya confirmó su correo (`perfil_legible`). La revisión
--      de la administración no usa `es_admin()` aquí: `es_admin()` lee `perfiles` con los permisos de quien llama y la regla se llamaría a sí misma.
--   3. Sin sesión no se lee la columna `rol`. `es_admin()` deja de consultar la tabla cuando no hay sesión (sin sesión siempre fue «no»), para que
--      las reglas que la evalúan sin sesión no pidan esa columna. Con sesión sigue igual: la app la lee para la propia cuenta.
--   4. «Quién va» y «quién sigue» solo se leen si el evento, el lugar o el artista ligado se puede ver (lo propio y la administración, como antes).
--   5. `poner_cartel_a_evento` solo acepta una imagen de la carpeta propia de quien la pone (`fotos/lugares/<su cuenta>/`), como ya pedía la app.
begin;

-- ---------- 1. el alta de perfil, sin la parte del correo ----------
-- Igual que en 20261029190000_avisos_forma.sql salvo el nombre: sin `split_part(email, '@', 1)`.
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, foto, rol, avisos_correo, avisos_correo_desde)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), ''), 60),
    case when public.imagen_origen_permitido(new.raw_user_meta_data ->> 'avatar_url', false, true)
      then new.raw_user_meta_data ->> 'avatar_url' else null end,
    case when exists (select 1 from public.admin_correos where lower(correo) = lower(new.email)) then 'admin' else 'usuario' end,
    true,
    now()
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.crear_perfil() from public, anon, authenticated;
grant execute on function public.crear_perfil() to service_role;

-- ---------- 3. es_admin sin sesión no consulta la tabla ----------
-- Sigue siendo invoker con la ruta vacía (Security Advisor). Sin sesión no hay a quién buscar: «no», sin leer `rol`. Un rol que no puede leer
-- la columna (sin sesión, aunque traiga un identificador) tampoco es administración.
create or replace function public.es_admin() returns boolean
language plpgsql stable security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not pg_catalog.has_column_privilege('public.perfiles', 'rol', 'SELECT') then
    return false;
  end if;
  return exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
end $$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated, service_role;

-- ---------- 2. qué perfil se puede leer ----------
-- Definer para leer `auth.users` y el rol de quien mira sin pasar otra vez por la regla de `perfiles` (no es recursiva).
create or replace function public.perfil_legible(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_id is not null and (
    p_id = auth.uid()
    or exists (select 1 from auth.users u where u.id = p_id and u.email_confirmed_at is not null)
    or (auth.uid() is not null and exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin'))
  );
$$;
comment on function public.perfil_legible(uuid) is
  'OL-512: un perfil se lee si es el propio, si quien mira es la administración o si la cuenta confirmó su correo. Solo responde sí o no.';
revoke all on function public.perfil_legible(uuid) from public;
grant execute on function public.perfil_legible(uuid) to anon, authenticated, service_role;

drop policy if exists "perfiles: lectura pública" on public.perfiles;
drop policy if exists "perfiles: lectura" on public.perfiles;
create policy "perfiles: lectura" on public.perfiles for select
  using (id = auth.uid() or public.perfil_legible(id));

-- ---------- 3. la columna rol, fuera de la lectura sin sesión ----------
revoke select (rol) on public.perfiles from public, anon;

-- ---------- 4. asistencias y seguimientos, solo con lo ligado a la vista ----------
-- Lo propio y la administración, como antes. El resto: perfil no reservado y el evento, lugar o artista visible para quien mira (su RLS decide).
drop policy if exists "asistencias: lectura" on public.asistencias;
create policy "asistencias: lectura" on public.asistencias for select
  using (
    usuario_id = auth.uid() or public.es_admin()
    or (
      not exists (select 1 from public.perfiles p where p.id = asistencias.usuario_id and p.reservado)
      and exists (select 1 from public.eventos e where e.id = asistencias.evento_id)
    )
  );

drop policy if exists "seguimientos: lectura" on public.seguimientos;
create policy "seguimientos: lectura" on public.seguimientos for select
  using (
    usuario_id = auth.uid() or public.es_admin()
    or (
      not exists (select 1 from public.perfiles p where p.id = seguimientos.usuario_id and p.reservado)
      and (seguimientos.lugar_id is null or exists (select 1 from public.lugares l where l.id = seguimientos.lugar_id))
      and (seguimientos.artista_id is null or exists (select 1 from public.artistas a where a.id = seguimientos.artista_id))
    )
  );

-- ---------- 5. tu cartel a un evento, solo con una imagen de tu carpeta ----------
-- Igual que en 20261028150000_cartel_a_evento_existente.sql más la comprobación de la imagen (la misma regla que `esFotoPropia` en la app:
-- un archivo directo de `fotos/lugares/<quien la pone>/`, nombre simple, sin consulta, y que no sea un cartel hecho aquí).
create or replace function public.poner_cartel_a_evento(
  p_evento uuid, p_imagen text, p_colores jsonb default null, p_completar jsonb default null, p_reemplazar boolean default false
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  admin boolean;
  e public.eventos;
  completar jsonb := coalesce(p_completar, '{}'::jsonb);
  completado text[] := '{}';
  v_descripcion text;
  v_precio text;
  v_fin timestamptz;
  item jsonb;
  v_nombre text;
  artista uuid;
  artistas uuid[] := '{}';
  archivo text;
begin
  if yo is null then
    raise exception 'sin_sesion' using errcode = '42501';
  end if;
  if p_evento is null or coalesce(btrim(p_imagen), '') = '' or char_length(p_imagen) > 2048 then
    raise exception 'datos_invalidos' using errcode = '22023';
  end if;
  archivo := (regexp_match(p_imagen, '^https://[^/?#]+/storage/v1/object/public/fotos/lugares/' || yo::text || '/([A-Za-z0-9_-][A-Za-z0-9._-]*)$'))[1];
  if archivo is null or starts_with(archivo, 'cartel-generado-') then
    raise exception 'imagen_ajena' using errcode = '22023';
  end if;
  if jsonb_typeof(completar) is distinct from 'object'
    or (completar ? 'quien' and (jsonb_typeof(completar -> 'quien') is distinct from 'array' or jsonb_array_length(completar -> 'quien') > 6)) then
    raise exception 'datos_invalidos' using errcode = '22023';
  end if;
  admin := public.es_admin();

  -- La fila, con su cerrojo: dos personas a la vez no se pisan (la segunda ve el cartel de la primera).
  select * into e from public.eventos where id = p_evento for update;
  if not found or not e.visible or e.borrador or e.retirado_por_admin or (not admin and public.bloqueado_por_mi(e.creado_por)) then
    raise exception 'evento_no_disponible' using errcode = 'P0002';
  end if;
  if e.termina < pg_catalog.now() then
    raise exception 'evento_pasado' using errcode = '22023';
  end if;

  -- Un reintento con la misma imagen: ya está puesta.
  if e.imagen = p_imagen then
    return jsonb_build_object('id', e.id, 'slug', e.slug, 'lugar_id', e.lugar_id, 'dueno', e.creado_por, 'completado', '[]'::jsonb,
      'reemplazado', false, 'repetido', true, 'artistas', '[]'::jsonb);
  end if;

  if e.imagen is not null then
    if not coalesce(p_reemplazar, false) then
      raise exception 'ya_tiene_cartel' using errcode = '23505';
    end if;
    if not admin and e.creado_por is distinct from yo then
      raise exception 'solo_quien_lo_publico' using errcode = '42501';
    end if;
    -- Cambiar su cartel por el mío: todo lo demás sigue igual.
    update public.eventos set imagen = p_imagen, colores_cartel = p_colores where id = e.id;
  else
    -- Lo que le falta, de lo leído en el cartel; lo que tiene no se toca.
    v_descripcion := nullif(btrim(coalesce(completar ->> 'descripcion', '')), '');
    if coalesce(btrim(e.descripcion), '') = '' and v_descripcion is not null then
      completado := array_append(completado, 'descripcion');
    else
      v_descripcion := null;
    end if;
    v_precio := nullif(btrim(coalesce(completar ->> 'precio', '')), '');
    if coalesce(btrim(e.precio), '') = '' and v_precio is not null and char_length(v_precio) <= 60 then
      completado := array_append(completado, 'precio');
    else
      v_precio := null;
    end if;
    begin
      v_fin := nullif(completar ->> 'fin', '')::timestamptz;
    exception when others then
      v_fin := null;
    end;
    -- Sin horario por día (con él, el fin sale de sus sesiones) y dentro de las 24 horas siguientes al inicio.
    if e.fin is null and v_fin is not null and v_fin > e.inicio and v_fin <= e.inicio + interval '24 hours'
      and not exists (select 1 from public.eventos_sesiones s where s.evento_id = e.id) then
      completado := array_append(completado, 'fin');
    else
      v_fin := null;
    end if;
    update public.eventos set
      imagen = p_imagen,
      colores_cartel = p_colores,
      descripcion = coalesce(v_descripcion, descripcion),
      precio = coalesce(v_precio, precio),
      fin = coalesce(v_fin, fin)
      where id = e.id;

    -- Quién se presenta: solo si el original no tiene a nadie, con la misma regla del alta (`guardar_evento_completo`): por su id (visible), por
    -- su nombre entre los visibles (primero los de su ciudad) o una ficha nueva por completar.
    if completar ? 'quien' and jsonb_array_length(completar -> 'quien') > 0
      and not exists (select 1 from public.eventos_artistas ea where ea.evento_id = e.id) then
      for v_nombre in select distinct public.normalizar_nombre(x ->> 'nombre') from jsonb_array_elements(completar -> 'quien') x
        where coalesce(x ->> 'id', '') = '' order by 1
      loop
        perform pg_advisory_xact_lock(7303, hashtext(e.ciudad || ':' || v_nombre));
      end loop;
      for item in select * from jsonb_array_elements(completar -> 'quien') loop
        v_nombre := btrim(item ->> 'nombre');
        if coalesce(v_nombre, '') = '' or char_length(v_nombre) > 80 then
          raise exception 'artista_invalido' using errcode = '22023';
        end if;
        artista := null;
        if coalesce(item ->> 'id', '') <> '' then
          select a.id into artista from public.artistas a where a.id = (item ->> 'id')::uuid and (a.visible or a.creado_por = yo);
          if artista is null then raise exception 'artista_no_disponible' using errcode = '42501'; end if;
        else
          select a.id into artista from public.artistas a
            where a.visible and public.normalizar_nombre(a.nombre) = public.normalizar_nombre(v_nombre)
            order by (a.ciudad = e.ciudad) desc, a.nombre, a.id limit 1;
          if artista is null then
            insert into public.artistas (nombre, disciplina, tipo, ciudad, creado_por)
              values (v_nombre, 'por_completar', coalesce(item ->> 'tipo', 'solista'), e.ciudad, yo) returning id into artista;
          end if;
        end if;
        if not artista = any(artistas) then artistas := array_append(artistas, artista); end if;
      end loop;
      insert into public.eventos_artistas (evento_id, artista_id, orden)
        select e.id, id, (orden - 1)::smallint from unnest(artistas) with ordinality as a(id, orden);
      if cardinality(artistas) > 0 then completado := array_append(completado, 'artistas'); end if;
    end if;
  end if;

  -- A la administración, agrupado con lo demás; si no se puede, lo hecho se queda.
  begin
    perform public.avisos_admin_encolar('cartel_puesto', yo);
  exception when others then
    raise warning 'avisos_admin: no se pudo encolar (cartel_puesto): %', sqlerrm;
  end;

  return jsonb_build_object('id', e.id, 'slug', e.slug, 'lugar_id', e.lugar_id, 'dueno', e.creado_por, 'completado', to_jsonb(completado),
    'reemplazado', e.imagen is not null, 'repetido', false, 'artistas', to_jsonb(artistas));
end $$;

comment on function public.poner_cartel_a_evento(uuid, text, jsonb, jsonb, boolean) is
  'OL-467 y OL-512: «Sí, es este: ponerle mi cartel». Cualquiera con sesión pone cartel (de su carpeta) a un evento visible sin cartel y completa solo lo que le falta; cambiarlo, solo quien lo publicó o la administración.';
revoke all on function public.poner_cartel_a_evento(uuid, text, jsonb, jsonb, boolean) from public, anon;
grant execute on function public.poner_cartel_a_evento(uuid, text, jsonb, jsonb, boolean) to authenticated, service_role;

notify pgrst, 'reload schema';
commit;
