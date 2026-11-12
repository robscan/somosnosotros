-- somosnosotros · OL-515 · migración 20261112100000 · «Publicar en Instagram» desde la ficha de un artista o de un lugar (bitácora 548)
-- Founder (2026-11-12): «Y agrega otra pieza que permita publicar desde la ficha del lugar y el artista. Así como ya pasa con el evento.»
--
-- SOLO AÑADE (idempotente: `create or replace`, los permisos se vuelven a poner):
--   · `redes_encolar_ficha(tipo, ficha, pedido, repetir)`: guarda en la cola de redes (`redes_trabajos`, OL-465) la publicación de un artista o de un
--     lugar sin día de la semana, como `redes_encolar` lo hace con un evento. Solo la administración (`es_admin()`); la ficha tiene que existir,
--     verse (el lugar, además, no ser privado), no estar «fuera de Instagram» (`instagram_fuera`) y, el artista, tener su foto en el Storage de la
--     app (`instagram_material_propio`, la misma regla de la semana). Dos toques seguidos no guardan dos: el candado por ficha los pone en fila y,
--     si ya hay uno de esa ficha en cola o publicándose (que no espera a un día por venir de la semana), devuelve `{ "duplicado": <id> }` sin guardar.
--     Si ya salió en Instagram y no se pidió repetir, devuelve `{ "repetido": <cuándo> }` sin guardar. Si no, `{ "id": <trabajo> }`.
--     El pedido queda limpio: `tipo`, `facebook`, `texto` y `quitadas` (lo que el trabajador ya respeta con `propioDe` y `quitadasDe`); nunca
--     `casilla` (un trabajo con casilla es de la semana y el trabajador cerraría ese día): se rechaza.
--     La app ya no escribe la cola con la llave de servicio para esto (la primera versión de la nube lo hacía).
begin;

create or replace function public.redes_encolar_ficha(p_tipo text, p_ficha uuid, p_pedido jsonb, p_repetir boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ok boolean;
  v_trabajo uuid;
  v_salio timestamptz;
  v_texto text;
  v_quitadas jsonb;
  v_pedido jsonb;
  v_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo la administración publica en redes.' using errcode = '42501';
  end if;
  if p_tipo is null or p_tipo not in ('artista', 'lugar') or p_ficha is null or (p_pedido is not null and jsonb_typeof(p_pedido) <> 'object') then
    raise exception 'Pedido inválido.' using errcode = '22023';
  end if;
  if p_pedido ? 'casilla' or p_pedido ? 'eventos' then
    raise exception 'Pedido inválido: una publicación desde la ficha no es de un día de la semana.' using errcode = '22023';
  end if;

  -- La ficha: que exista, que se vea y que tenga lo que la tarjeta necesita.
  if p_tipo = 'artista' then
    select a.visible into v_ok from public.artistas a where a.id = p_ficha;
  else
    select l.visible and not l.privado into v_ok from public.lugares l where l.id = p_ficha;
  end if;
  if v_ok is null then
    raise exception 'No existe esa ficha.' using errcode = '23503';
  end if;
  if not v_ok then
    raise exception 'Esa ficha está oculta: no se publica.' using errcode = '22023';
  end if;
  if exists (select 1 from public.instagram_fuera f where (p_tipo = 'artista' and f.artista_id = p_ficha) or (p_tipo = 'lugar' and f.lugar_id = p_ficha)) then
    raise exception 'Esa ficha está fuera de Instagram.' using errcode = '22023';
  end if;
  if p_tipo = 'artista' and not exists (select 1 from public.artistas a where a.id = p_ficha and public.instagram_material_propio(a.foto)) then
    raise exception 'A esa ficha le falta material: su foto.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('redes_encolar_ficha:' || p_ficha::text, 515));

  -- Ya va en camino: en cola sin esperar a un día por venir de la semana, o publicándose.
  select t.id into v_trabajo from public.redes_trabajos t
  where ((p_tipo = 'artista' and t.artista_id = p_ficha) or (p_tipo = 'lugar' and t.lugar_id = p_ficha))
    and (t.estado = 'publicando' or (t.estado = 'en_cola' and (t.pedido ->> 'casilla' is null or t.siguiente_en <= now() + interval '1 minute')))
  order by t.creado_en desc
  limit 1;
  if v_trabajo is not null then
    return jsonb_build_object('duplicado', v_trabajo);
  end if;

  if not coalesce(p_repetir, false) then
    select max(ip.creado_en) into v_salio from public.instagram_publicaciones ip
    where ip.estado = 'publicada' and ((p_tipo = 'artista' and ip.artista_id = p_ficha) or (p_tipo = 'lugar' and ip.lugar_id = p_ficha));
    if v_salio is not null then
      return jsonb_build_object('repetido', v_salio);
    end if;
  end if;

  -- El pedido limpio: solo lo que decide la hoja.
  v_texto := case when jsonb_typeof(p_pedido -> 'texto') = 'string' then nullif(left(btrim(p_pedido ->> 'texto'), 5000), '') end;
  select coalesce(jsonb_agg(q.v), '[]'::jsonb) into v_quitadas
  from (
    select x.v from jsonb_array_elements(case when jsonb_typeof(p_pedido -> 'quitadas') = 'array' then p_pedido -> 'quitadas' else '[]'::jsonb end) with ordinality as x(v, n)
    where jsonb_typeof(x.v) = 'string' order by x.n limit 60
  ) q;
  v_pedido := jsonb_build_object(
    'tipo', p_tipo,
    'facebook', case when jsonb_typeof(p_pedido -> 'facebook') = 'boolean' then (p_pedido -> 'facebook')::boolean else true end,
    'texto', v_texto,
    'quitadas', v_quitadas
  );

  insert into public.redes_trabajos (artista_id, lugar_id, red, formato, pedido)
  values (case when p_tipo = 'artista' then p_ficha end, case when p_tipo = 'lugar' then p_ficha end, 'instagram', '4x5', v_pedido)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.redes_encolar_ficha(text, uuid, jsonb, boolean) from public, anon;
grant execute on function public.redes_encolar_ficha(text, uuid, jsonb, boolean) to authenticated, service_role;
comment on function public.redes_encolar_ficha(text, uuid, jsonb, boolean) is 'OL-515: «Publicar en Instagram» desde la ficha de un artista o de un lugar (sin día de la semana). Solo administración; sin duplicados (candado por ficha) y sin repetir lo que ya salió salvo p_repetir.';

commit;
