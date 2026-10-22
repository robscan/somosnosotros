-- somosnosotros · OL-440 · migración 20261021190000 · al aceptar un artista propuesto, se liga a los eventos donde se presentó
-- Founder, 21 de octubre: preguntó si el Showcase «ya está alimentado con los eventos que se acaban de subir desde enero» y «si ya nutre a los
-- artistas», y dijo «arranca» a esta propuesta. El guion de la Mac (scripts/instituciones/ligar-artistas.ts) propone a los artistas de las
-- agendas que no tienen ficha con `propuestas.datos.eventos` = los ids de los eventos donde se presentaron; al aceptarlos en la bandeja de la
-- ciudad, la ficha nace ligada a esos eventos (sin tocar la pantalla: la bandeja ya llama a esta función, también «Aceptar las N»).
--
-- SOLO AÑADE: `create or replace` de aceptar_propuesta (OL-427, migración 20261020140000) con la misma firma, el mismo permiso y lo mismo de
-- antes; lo nuevo es que, al crear un artista, inserta en `eventos_artistas` los ids de `datos.eventos` que existen (lo que no es un id o no es
-- un evento se ignora; lo ya ligado no se repite), cada uno con su orden detrás de los que ya tenía el evento, y devuelve cuántos ligó
-- (`eventos_ligados`). Un lugar, un evento, una propuesta sin `eventos` y una ya decidida, igual que antes. Sin avisos: `eventos_artistas` no
-- tiene disparadores.

create or replace function public.aceptar_propuesta(p_propuesta uuid, p_ficha jsonb default '{}'::jsonb) returns json
language plpgsql volatile security definer set search_path = '' as $$
declare
  v public.propuestas%rowtype;
  v_id uuid;
  v_slug text;
  v_ligados integer := 0;
begin
  if auth.uid() is null or not public.es_admin() then
    raise exception 'solo la administración' using errcode = '42501';
  end if;
  select * into v from public.propuestas where id = p_propuesta for update;
  if not found then
    raise exception 'no existe esa propuesta' using errcode = 'P0002';
  end if;
  if v.estado <> 'propuesta' then
    return json_build_object('estado', v.estado, 'ficha_id', v.ficha_id,
      'slug', case v.tipo when 'lugar' then (select l.slug from public.lugares l where l.id = v.ficha_id)
                          when 'artista' then (select a.slug from public.artistas a where a.id = v.ficha_id) end);
  end if;
  if v.tipo = 'lugar' then
    insert into public.lugares (nombre, tipo, detalle, direccion, lat, lng, ciudad, zona, redes, creado_por)
    values (p_ficha ->> 'nombre', p_ficha ->> 'tipo', nullif(p_ficha ->> 'detalle', ''), nullif(p_ficha ->> 'direccion', ''),
      (p_ficha ->> 'lat')::double precision, (p_ficha ->> 'lng')::double precision, p_ficha ->> 'ciudad',
      coalesce(nullif(p_ficha ->> 'zona', ''), 'America/Mexico_City'), coalesce(p_ficha -> 'redes', '[]'::jsonb), auth.uid())
    returning id, slug into v_id, v_slug;
  elsif v.tipo = 'artista' then
    insert into public.artistas (nombre, disciplina, detalle, tipo, ciudad, redes, creado_por)
    values (p_ficha ->> 'nombre', coalesce(nullif(p_ficha ->> 'disciplina', ''), 'por_completar'), nullif(p_ficha ->> 'detalle', ''),
      coalesce(nullif(p_ficha ->> 'tipo', ''), 'solista'), p_ficha ->> 'ciudad', coalesce(p_ficha -> 'redes', '[]'::jsonb), auth.uid())
    returning id, slug into v_id, v_slug;
    -- OL-440: los eventos donde se presentó (los que la propuesta trae y existen), cada uno con el siguiente orden de su evento.
    if jsonb_typeof(v.datos -> 'eventos') = 'array' then
      with pedidos as (
        select distinct x.valor::uuid as evento_id
        from jsonb_array_elements_text(v.datos -> 'eventos') as x(valor)
        where x.valor ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      ), ligados as (
        insert into public.eventos_artistas (evento_id, artista_id, orden)
        select e.id, v_id, coalesce((select max(ea.orden) + 1 from public.eventos_artistas ea where ea.evento_id = e.id), 0)
        from pedidos p
        join public.eventos e on e.id = p.evento_id
        on conflict (evento_id, artista_id) do nothing
        returning 1
      )
      select count(*) into v_ligados from ligados;
    end if;
  end if;
  update public.propuestas
  set estado = 'aceptada', ficha_id = v_id, motivo_rechazo = null, resuelto_por = auth.uid(), resuelto_en = now()
  where id = v.id;
  return json_build_object('estado', 'aceptada', 'ficha_id', v_id, 'slug', v_slug, 'eventos_ligados', v_ligados);
end $$;
revoke all on function public.aceptar_propuesta(uuid, jsonb) from public, anon;
grant execute on function public.aceptar_propuesta(uuid, jsonb) to authenticated, service_role;
comment on function public.aceptar_propuesta(uuid, jsonb) is 'Crea la ficha de una propuesta (lugar o artista) y la marca aceptada (OL-427); un artista nace ligado a los eventos de datos.eventos que existen (OL-440).';
