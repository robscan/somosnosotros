-- somosnosotros · OL-467 · migración 20261028150000 · tu cartel a un evento que ya está (bitácoras 498 y 499)
-- Founder (2026-10-28): «cuando se sube un cartel de un evento, y después de analizarlo con IA, notamos que ya está registrado, pero el registro no
-- tiene cartel, esta va a ser una situación bastante común. Entonces, al decirle al usuario que el evento tal vez ya existe, también hay que
-- presentar la opción de mantener el evento original, pero usar el nuevo [cartel]». Firmó el prototipo de OL-466 con las recomendaciones del gestor.
--
-- SOLO AÑADE una función: `poner_cartel_a_evento`. «Sí, es este: ponerle mi cartel» del alta de evento.
--   · Cualquier persona con sesión pone su cartel a un evento visible (sin borrador, sin retirar por la administración, sin pasar y que pueda ver:
--     no de alguien a quien bloqueó) que NO tiene cartel. Se conserva el evento original: su ficha y su enlace, sus «Voy» y «Me interesa», sus
--     enlaces y quien lo publicó.
--   · Completa solo lo que al original le falta: descripción, precio (vacío hoy se ve «Gratis» o «Por confirmar»), hora de fin (sin horario por
--     día) y quién se presenta (solo si no tiene a nadie). Lo que ya tiene no se toca.
--   · Cambiar un cartel que ya está (`p_reemplazar`): solo quien lo publicó o la administración, y nada más cambia.
--   · Si el evento ya tiene cartel y quien llama no pidió reemplazarlo (otra persona se lo puso a la vez), no hace nada: «ya_tiene_cartel».
--   · Avisa a la administración con el motivo nuevo `cartel_puesto` (`avisos_admin_encolar`, agrupado como los demás; nunca rompe lo hecho).
-- La política «eventos: edita autor o admin» sigue igual: lo ajeno solo pasa por aquí. La huella del cartel (OL-464) la pone el servidor con su
-- llave en la misma acción (el disparador `eventos_cartel_huella` ignora lo que manda una cuenta, también por esta función).
begin;

create function public.poner_cartel_a_evento(
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
begin
  if yo is null then
    raise exception 'sin_sesion' using errcode = '42501';
  end if;
  if p_evento is null or coalesce(btrim(p_imagen), '') = '' or char_length(p_imagen) > 2048 then
    raise exception 'datos_invalidos' using errcode = '22023';
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
  'OL-467: «Sí, es este: ponerle mi cartel». Cualquiera con sesión pone cartel a un evento visible sin cartel y completa solo lo que le falta; cambiarlo, solo quien lo publicó o la administración.';
revoke all on function public.poner_cartel_a_evento(uuid, text, jsonb, jsonb, boolean) from public, anon;
grant execute on function public.poner_cartel_a_evento(uuid, text, jsonb, jsonb, boolean) to authenticated;

commit;
