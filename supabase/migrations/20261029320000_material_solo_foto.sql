-- somosnosotros · OL-505 · migración 20261029320000 · la semana de Instagram pide menos material (bitácora 538)
-- El founder firmó «Repisa» (prototipo OL-490, tercera vuelta, bitácora 522) y la publicó el 2026-11-02 («Publica repisa. Te la firmo»). Sobre la
-- tercera vuelta había dicho: «Vamos a eliminar la imagen de portada en la composición y solo usaremos perfil; así el material necesario será
-- menor y evitamos dejar fuera a los que no tengan portada». Y aceptó para los lugares L2: el arco con su portada cuando la tenga; sin ella, L1
-- (el arco con el símbolo SN, sin imagen). Por eso:
--   · el artista necesita solo su foto propia (del Storage de la app); su portada ya no;
--   · el lugar no necesita material: con portada sale L2 y sin ella, L1.
--
-- LO QUE SE REEMPLAZA (misma firma; `create or replace` conserva sus permisos; los comentarios se rehacen; ninguna fila cambia, nada se borra):
--   · `instagram_candidatos` (de 20261029240000): el artista con foto propia, sin pedir su portada; el lugar sin pedir portada.
--   · `instagram_semana_cambiar` (de 20261029240000): lo mismo al cambiar un día.
--   · `instagram_falta_material` (de 20261029310000, la rápida de OL-498): en `falta` solo `foto` o `foto_ajena` del artista; los lugares ya no
--     entran por material; la portada que falte (en los dos tipos) pasa a `otros`, como opcional.
--   · `instagram_pedir_material` (de 20261029240000): solo se pide si falta la foto del artista; la portada que también falte se anota como
--     sugerencia. Un lugar ya no se pide («Esa ficha ya tiene su material»).
--   · `instagram_semana_programar` (de 20261029240000): lo mismo al programar o publicar ahora la sugerencia de un día.
-- `instagram_material_pedidos.falta` y su `check` no cambian (siguen admitiendo `portada`). Sin cron nuevo. Todas con `search_path = ''`.
begin;

-- ---------- 1. Quién puede salir ----------
create or replace function public.instagram_candidatos(p_ciudad text, p_tipo text, p_desde date)
returns table (
  id uuid, slug text, nombre text, ciudad text, ciudad_slug text, clase text, detalle text, foto text, portada text, descripcion text, redes jsonb,
  direccion text, proxima_id uuid, proxima_titulo text, proxima_inicio timestamptz, proxima_zona text, proxima_lugar text, proxima_lugar_redes jsonb,
  eventos_semana integer, ultima_vez timestamptz, ocupado_en date
)
language sql stable security definer set search_path = '' as $$
  with fichas as (
    select a.id, a.slug, a.nombre, a.ciudad, a.disciplina as clase, a.detalle, a.foto, a.portada, a.descripcion, a.redes, null::text as direccion
    from public.artistas a
    where p_tipo = 'artista' and a.visible and public.instagram_material_propio(a.foto)
      and char_length(coalesce(a.descripcion, '')) >= 120 and a.redes::text ~* 'instagram\.com/[A-Za-z0-9._]'
      and not exists (select 1 from public.instagram_fuera f where f.artista_id = a.id)
    union all
    select l.id, l.slug, l.nombre, l.ciudad, l.tipo, l.detalle, null::text, l.portada, l.descripcion, l.redes, l.direccion
    from public.lugares l
    where p_tipo = 'lugar' and l.visible and not l.privado and char_length(coalesce(l.descripcion, '')) >= 120
      and not exists (select 1 from public.instagram_fuera f where f.lugar_id = l.id)
  ),
  con as (
    select f.*, public.ciudad_slug(f.ciudad) as ciudad_slug,
      (select max(ip.creado_en) from public.instagram_publicaciones ip
        where ip.estado = 'publicada' and (ip.artista_id = f.id or ip.lugar_id = f.id)) as ultima_vez,
      (select min(s.fecha) from public.instagram_semana s
        where (s.artista_id = f.id or s.lugar_id = f.id) and s.estado <> 'quitado' and s.dijo_no_en is null and s.fecha >= p_desde - 182) as ocupado_en,
      prox.id as proxima_id, prox.titulo as proxima_titulo, prox.inicio as proxima_inicio, prox.zona as proxima_zona, prox.lugar as proxima_lugar,
      prox.lugar_redes as proxima_lugar_redes,
      (select count(*)::int from public.eventos e
        where p_tipo = 'lugar' and e.lugar_id = f.id and e.visible and not e.borrador and not e.cancelado and not e.retirado_por_admin
          and e.inicio >= (p_desde::timestamp at time zone e.zona) and e.inicio < ((p_desde + 7)::timestamp at time zone e.zona)) as eventos_semana
    from fichas f
    left join lateral (
      select e.id, e.titulo, e.inicio, e.zona, coalesce(l.nombre, e.sitio_texto) as lugar, coalesce(l.redes, '[]'::jsonb) as lugar_redes
      from public.eventos e
      left join public.lugares l on l.id = e.lugar_id
      where e.visible and not e.borrador and not e.cancelado and not e.retirado_por_admin
        and (case when p_tipo = 'artista' then exists (select 1 from public.eventos_artistas ea where ea.evento_id = e.id and ea.artista_id = f.id) else e.lugar_id = f.id end)
        and e.inicio >= (p_desde::timestamp at time zone e.zona) and e.inicio < ((p_desde + 30)::timestamp at time zone e.zona)
      order by e.inicio
      limit 1
    ) prox on true
  )
  select c.id, c.slug, c.nombre, c.ciudad, c.ciudad_slug, c.clase, c.detalle, c.foto, c.portada, c.descripcion, c.redes, c.direccion,
    c.proxima_id, c.proxima_titulo, c.proxima_inicio, c.proxima_zona, c.proxima_lugar, c.proxima_lugar_redes,
    c.eventos_semana, c.ultima_vez, c.ocupado_en
  from con c
  where public.es_admin() and p_tipo in ('artista', 'lugar') and p_desde is not null
    and (c.ultima_vez is null or c.ultima_vez < now() - interval '6 months')
  order by (c.proxima_id is not null) desc, (c.ciudad_slug = p_ciudad) desc, c.ultima_vez nulls first, md5(c.id::text || p_desde::text)
  limit 200;
$$;
comment on function public.instagram_candidatos(text, text, date) is 'OL-479 + OL-488 + OL-505: las fichas que pueden ocupar un día de la semana de Instagram: artistas con foto propia (del Storage de la app), descripción e Instagram; lugares con descripción (sin portada salen con el símbolo SN). Solo administración.';

-- ---------- 2. «Cambiar» ----------
create or replace function public.instagram_semana_cambiar(p_casilla uuid, p_tipo text, p_ficha uuid, p_motivo text, p_reemplaza text default null) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  c public.instagram_semana;
  v_zona text;
  v_hora time;
begin
  if not public.es_admin() then
    raise exception 'Solo la administración cambia la semana de Instagram.' using errcode = '42501';
  end if;
  select * into c from public.instagram_semana s where s.id = p_casilla for update;
  if not found then
    raise exception 'No existe ese día.' using errcode = '23503';
  end if;
  if p_tipo not in ('artista', 'lugar', 'evento') or p_ficha is null or (c.tipo <> 'descanso' and c.tipo <> p_tipo) then
    raise exception 'Cambio inválido.' using errcode = '22023';
  end if;
  if public.instagram_semana_cerrada(p_casilla) then
    raise exception 'Ese día ya salió en Instagram.' using errcode = '55000';
  end if;
  if (p_tipo = 'artista' and not exists (select 1 from public.artistas a where a.id = p_ficha))
     or (p_tipo = 'lugar' and not exists (select 1 from public.lugares l where l.id = p_ficha))
     or (p_tipo = 'evento' and not exists (select 1 from public.eventos e where e.id = p_ficha)) then
    raise exception 'No existe esa ficha.' using errcode = '23503';
  end if;
  -- OL-488 y OL-505: sin material (la foto del artista, el cartel del evento, en el Storage de la app) no se pone. El lugar no necesita: sin
  -- portada su tarjeta sale con el arco y el símbolo SN (L1).
  if (p_tipo = 'artista' and not exists (select 1 from public.artistas a where a.id = p_ficha and public.instagram_material_propio(a.foto)))
     or (p_tipo = 'evento' and not exists (select 1 from public.eventos e where e.id = p_ficha and public.instagram_material_propio(e.imagen))) then
    raise exception 'A esa ficha le falta material: su foto o su cartel.' using errcode = '22023';
  end if;
  if (p_tipo = 'artista' and exists (select 1 from public.instagram_fuera f where f.artista_id = p_ficha))
     or (p_tipo = 'lugar' and exists (select 1 from public.instagram_fuera f where f.lugar_id = p_ficha)) then
    raise exception 'Esa ficha está fuera de Instagram.' using errcode = '22023';
  end if;
  v_hora := coalesce(c.hora, '19:00'::time);
  select coalesce((select ci.zona from public.ciudades ci where ci.slug = c.ciudad), 'America/Mexico_City') into v_zona;
  update public.instagram_semana s
  set tipo = p_tipo,
      artista_id = case when p_tipo = 'artista' then p_ficha end,
      lugar_id = case when p_tipo = 'lugar' then p_ficha end,
      evento_id = case when p_tipo = 'evento' then p_ficha end,
      eventos = null,
      hora = v_hora,
      programado_para = (c.fecha + v_hora) at time zone v_zona,
      estado = 'programado',
      elegido_por = 'persona',
      motivo = left(p_motivo, 240),
      reemplaza = left(p_reemplaza, 120),
      aviso_en = null,
      dijo_no_en = null,
      actualizado_por = auth.uid(),
      actualizado_en = now()
  where s.id = c.id;
  if (c.fecha + v_hora) at time zone v_zona > now() then
    -- Lo que llevaba el día anterior (su texto) no vale para otra ficha.
    return public.instagram_semana_encolar(c.id, false, '{}'::jsonb);
  end if;
  return null;
end $$;

-- ---------- 3. «Falta material»: solo la foto del artista ----------
create or replace function public.instagram_falta_material(p_ciudad text, p_desde date)
returns table (
  tipo text, id uuid, slug text, nombre text, foto text, falta text[], otros text[], proxima_titulo text, proxima_inicio timestamptz, proxima_zona text,
  lleva uuid[], lleva_nombre text, pedido_en timestamptz
)
language sql stable security definer set search_path = '' as $$
  with
  -- 1. Los eventos de la ventana. El margen de un día en UTC deja pasar los de cualquier zona y usa el índice `eventos_inicio_idx`.
  previos as (
    select e.id, e.titulo, e.inicio, e.zona, e.ciudad, e.lugar_id
    from public.eventos e
    where public.es_admin() and p_ciudad is not null and p_desde is not null
      and e.visible and not e.borrador and not e.cancelado and not e.retirado_por_admin
      and e.inicio >= greatest(p_desde::timestamp at time zone 'UTC' - interval '1 day', now())
      and e.inicio < (p_desde + 30)::timestamp at time zone 'UTC' + interval '1 day'
  ),
  -- Los límites exactos, una vez por zona: desde el lunes a medianoche en su zona (o desde ahora, si ya empezó) hasta 30 días después.
  limites as (
    select z.zona, greatest(p_desde::timestamp at time zone z.zona, now()) as desde, (p_desde + 30)::timestamp at time zone z.zona as hasta
    from (select distinct p.zona from previos p) z
  ),
  ventana as (
    select p.* from previos p join limites l on l.zona = p.zona
    where p.inicio >= l.desde and p.inicio < l.hasta
  ),
  -- 2. Las fichas con fecha y su primera fecha.
  fechas as (
    select 'artista'::text as tipo, ea.artista_id as ficha, v.id as evento, v.titulo, v.inicio, v.zona, v.ciudad
    from ventana v join public.eventos_artistas ea on ea.evento_id = v.id
    union all
    select 'lugar', v.lugar_id, v.id, v.titulo, v.inicio, v.zona, v.ciudad
    from ventana v where v.lugar_id is not null
  ),
  proxima as (
    select distinct on (f.tipo, f.ficha) f.tipo, f.ficha, f.titulo, f.inicio, f.zona, f.ciudad
    from fechas f
    order by f.tipo, f.ficha, f.inicio, f.evento
  ),
  -- 3. Solo esas fichas: visibles, que no dijeron que no, con lo que les falta.
  fichas as (
    select 'artista'::text as tipo, a.id, a.slug, a.nombre, a.ciudad, coalesce(nullif(btrim(a.foto), ''), nullif(btrim(a.portada), '')) as foto,
      -- OL-505: lo que falta es solo la foto (la tarjeta lleva la foto de perfil, sin portada).
      array_remove(array[
        case when coalesce(btrim(a.foto), '') = '' then 'foto' when not public.instagram_material_propio(a.foto) then 'foto_ajena' end
      ], null) as falta,
      -- La portada que falte pasa a lo demás, como opcional (para que «Pedírselo» pueda sugerirla).
      array_remove(array[
        case when char_length(coalesce(a.descripcion, '')) < 120 then 'descripcion' end,
        case when not (coalesce(a.redes, '[]'::jsonb)::text ~* 'instagram\.com/[A-Za-z0-9._]') then 'instagram' end,
        case when not public.instagram_material_propio(a.portada) then 'portada' end
      ], null) as otros,
      p.titulo as proxima_titulo, p.inicio as proxima_inicio, p.zona as proxima_zona, p.ciudad as proxima_ciudad
    from proxima p join public.artistas a on a.id = p.ficha
    where p.tipo = 'artista' and a.visible and not exists (select 1 from public.instagram_fuera f where f.artista_id = a.id)
    union all
    -- OL-505: el lugar ya no se queda fuera por material (sin portada sale L1): nada le falta, así que `sin` lo deja fuera. Su portada, si
    -- falta, va en lo demás como opcional.
    select 'lugar', l.id, l.slug, l.nombre, l.ciudad, nullif(btrim(l.portada), ''),
      '{}'::text[],
      array_remove(array[
        case when char_length(coalesce(l.descripcion, '')) < 120 then 'descripcion' end,
        case when not public.instagram_material_propio(l.portada) then 'portada' end
      ], null),
      p.titulo, p.inicio, p.zona, p.ciudad
    from proxima p join public.lugares l on l.id = p.ficha
    where p.tipo = 'lugar' and l.visible and not l.privado and not exists (select 1 from public.instagram_fuera f where f.lugar_id = l.id)
  ),
  sin as (select * from fichas f where cardinality(f.falta) > 0),
  -- El slug de cada texto de ciudad, una vez (la de la ficha o la de su próxima fecha).
  slugs as (
    select x.c, public.ciudad_slug(x.c) as s
    from (select s.ciudad as c from sin s union select s.proxima_ciudad from sin s) x
  ),
  elegidas as (
    select s.* from sin s
    left join slugs sf on sf.c is not distinct from s.ciudad
    left join slugs sp on sp.c is not distinct from s.proxima_ciudad
    where (sf.s = p_ciudad or sp.s = p_ciudad)
      and not exists (select 1 from public.instagram_publicaciones ip
        where ip.estado = 'publicada' and ip.artista_id = s.id and ip.creado_en >= now() - interval '6 months')
      and not exists (select 1 from public.instagram_publicaciones ip
        where ip.estado = 'publicada' and ip.lugar_id = s.id and ip.creado_en >= now() - interval '6 months')
    order by s.proxima_inicio, s.nombre, s.id
    limit 100
  )
  -- 4. Quién la lleva y si ya se le pidió, solo de las que salen.
  select c.tipo, c.id, c.slug, c.nombre, c.foto, c.falta, c.otros, c.proxima_titulo, c.proxima_inicio, c.proxima_zona,
    q.lleva, (select p.nombre from public.perfiles p where p.id = q.lleva[1]),
    least(
      (select min(m.creado_en) from public.instagram_material_pedidos m where m.artista_id = c.id and m.semana = p_desde),
      (select min(m.creado_en) from public.instagram_material_pedidos m where m.lugar_id = c.id and m.semana = p_desde))
  from elegidas c
  cross join lateral (select public.instagram_quien_lleva(c.tipo, c.id) as lleva) q
  order by c.proxima_inicio, c.nombre, c.id;
$$;
comment on function public.instagram_falta_material(text, date) is 'OL-488 (OL-498: primero los eventos de la ventana; OL-505: solo la foto del artista es obligatoria): los artistas de una ciudad con fecha en los 30 días desde un lunes que se quedan fuera de la semana de Instagram por falta de foto (qué falta; en otros lo demás y la portada como opcional; su próxima fecha, quién la lleva y si ya se le pidió esa semana). Los lugares ya no se quedan fuera por material. Solo administración.';

-- ---------- 4. «Pedírselo» ----------
create or replace function public.instagram_pedir_material(p_tipo text, p_ficha uuid, p_desde date) returns uuid[]
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_para uuid[];
  v_falta text[];
begin
  if not public.es_admin() then
    raise exception 'Solo la administración pide material.' using errcode = '42501';
  end if;
  if p_tipo not in ('artista', 'lugar') or p_ficha is null or p_desde is null then
    raise exception 'Pedido inválido.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('instagram_material:' || p_ficha::text, 488));
  if exists (select 1 from public.instagram_material_pedidos m where (m.artista_id = p_ficha or m.lugar_id = p_ficha) and m.semana = p_desde) then
    raise exception 'Ya se lo pedimos esta semana.' using errcode = '23505';
  end if;
  -- OL-505: lo obligatorio es la foto del artista; el lugar no necesita material. Si falta la foto, la portada que también falte se anota
  -- como sugerencia (opcional): el aviso la menciona, pero sale de Novedades en cuanto llega la foto.
  if p_tipo = 'artista' then
    select case when public.instagram_material_propio(a.foto) then '{}'::text[]
      else array_remove(array['foto', case when not public.instagram_material_propio(a.portada) then 'portada' end], null) end
    into v_falta from public.artistas a where a.id = p_ficha;
  else
    select '{}'::text[] into v_falta from public.lugares l where l.id = p_ficha;
  end if;
  if v_falta is null then
    raise exception 'No existe esa ficha.' using errcode = '23503';
  end if;
  if cardinality(v_falta) = 0 then
    raise exception 'Esa ficha ya tiene su material.' using errcode = '22023';
  end if;
  v_para := public.instagram_quien_lleva(p_tipo, p_ficha);
  if cardinality(v_para) = 0 then
    raise exception 'Nadie lleva esa ficha.' using errcode = 'P0002';
  end if;
  insert into public.instagram_material_pedidos (artista_id, lugar_id, semana, usuario_id, falta, pedido_por)
  select case when p_tipo = 'artista' then p_ficha end, case when p_tipo = 'lugar' then p_ficha end, p_desde, u, v_falta, auth.uid()
  from unnest(v_para) u;
  return v_para;
end $$;
comment on function public.instagram_pedir_material(text, uuid, date) is 'OL-488 + OL-505: «Pedírselo»: anota, una vez por ficha y semana, el pedido de completar la foto del artista (y la portada como sugerencia) a quien lleva la ficha, y devuelve a quién avisar. Solo administración.';

-- ---------- 5. «Programar» o «Publicar ahora» ----------
create or replace function public.instagram_semana_programar(p_ciudad text, p_casilla jsonb, p_ahora boolean default false) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  c public.instagram_semana;
  v_zona text;
  v_tipo text;
  v_fecha date;
  v_hora time;
  v_cuando timestamptz;
  v_artista uuid;
  v_lugar uuid;
  v_evento uuid;
  v_eventos uuid[];
  v_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo la administración programa la semana de Instagram.' using errcode = '42501';
  end if;
  if p_ciudad is null or p_casilla is null or jsonb_typeof(p_casilla) <> 'object' then
    raise exception 'Día inválido.' using errcode = '22023';
  end if;
  v_tipo := p_casilla ->> 'tipo';
  if v_tipo is null or v_tipo not in ('artista', 'lugar', 'evento', 'semana') then
    raise exception 'Ese día no lleva publicación.' using errcode = '22023';
  end if;
  v_fecha := (p_casilla ->> 'fecha')::date;
  v_hora := (p_casilla ->> 'hora')::time;
  select coalesce((select ci.zona from public.ciudades ci where ci.slug = p_ciudad), 'America/Mexico_City') into v_zona;
  if v_fecha is null or v_hora is null then
    raise exception 'Día inválido.' using errcode = '22023';
  end if;
  if extract(isodow from v_fecha) = 7 then
    raise exception 'Los domingos la cuenta descansa.' using errcode = '22023';
  end if;
  if v_fecha < (now() at time zone v_zona)::date then
    raise exception 'Ese día ya pasó.' using errcode = '22023';
  end if;
  v_cuando := (v_fecha + v_hora) at time zone v_zona;
  if coalesce(p_ahora, false) and v_fecha <> (now() at time zone v_zona)::date then
    raise exception 'Solo lo de hoy se publica ahora.' using errcode = '22023';
  end if;
  if not coalesce(p_ahora, false) and v_cuando <= now() then
    raise exception 'Esa hora ya pasó: publícalo ahora.' using errcode = '22023';
  end if;
  v_artista := case when v_tipo = 'artista' then nullif(p_casilla ->> 'artista_id', '')::uuid end;
  v_lugar := case when v_tipo = 'lugar' then nullif(p_casilla ->> 'lugar_id', '')::uuid end;
  v_evento := case when v_tipo = 'evento' then nullif(p_casilla ->> 'evento_id', '')::uuid end;
  v_eventos := case when v_tipo = 'semana' and jsonb_typeof(p_casilla -> 'eventos') = 'array' then array(select jsonb_array_elements_text(p_casilla -> 'eventos')::uuid) end;
  -- El material, comprobado aquí (no solo en la app): la foto del artista (OL-505: ya no su portada) y el cartel de cada evento. El lugar no
  -- necesita material (sin portada sale L1), pero sigue visible, público y no fuera de Instagram.
  if (v_tipo = 'artista' and not exists (select 1 from public.artistas a where a.id = v_artista and a.visible
        and public.instagram_material_propio(a.foto)
        and not exists (select 1 from public.instagram_fuera f where f.artista_id = a.id)))
     or (v_tipo = 'lugar' and not exists (select 1 from public.lugares l where l.id = v_lugar and l.visible and not l.privado
        and not exists (select 1 from public.instagram_fuera f where f.lugar_id = l.id)))
     or (v_tipo = 'evento' and not exists (select 1 from public.eventos e where e.id = v_evento and e.visible and not e.borrador and not e.cancelado
        and not e.retirado_por_admin and public.instagram_material_propio(e.imagen)))
     or (v_tipo = 'semana' and (coalesce(cardinality(v_eventos), 0) not between 1 and 9 or exists (
        select 1 from unnest(v_eventos) x(id)
        where not exists (select 1 from public.eventos e where e.id = x.id and e.visible and not e.borrador and not e.cancelado
          and not e.retirado_por_admin and public.instagram_material_propio(e.imagen))))) then
    raise exception 'Le falta material: foto o cartel.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('instagram_semana:' || p_ciudad, 479));
  select * into c from public.instagram_semana s where s.ciudad = p_ciudad and s.fecha = v_fecha for update;
  if found then
    if public.instagram_semana_cerrada(c.id) or not (c.tipo = 'descanso' or (c.estado = 'programado' and c.trabajo_id is null)) then
      raise exception 'Ese día ya tiene su publicación.' using errcode = '23505';
    end if;
    update public.instagram_semana s
    set tipo = v_tipo, artista_id = v_artista, lugar_id = v_lugar, evento_id = v_evento, eventos = v_eventos, hora = v_hora, programado_para = v_cuando,
        estado = 'programado', elegido_por = 'sistema', motivo = left(p_casilla ->> 'motivo', 240), reemplaza = null, aviso_en = null, dijo_no_en = null,
        actualizado_por = auth.uid(), actualizado_en = now()
    where s.id = c.id;
    v_id := c.id;
  else
    insert into public.instagram_semana (ciudad, fecha, tipo, artista_id, lugar_id, evento_id, eventos, hora, programado_para, estado, motivo, actualizado_por)
    values (p_ciudad, v_fecha, v_tipo, v_artista, v_lugar, v_evento, v_eventos, v_hora, v_cuando, 'programado', left(p_casilla ->> 'motivo', 240), auth.uid())
    returning id into v_id;
  end if;
  return public.instagram_semana_encolar(v_id, coalesce(p_ahora, false), null);
end $$;
comment on function public.instagram_semana_programar(text, jsonb, boolean) is 'OL-488 + OL-505: «Programar» (a su hora) o «Publicar ahora» (solo hoy) lo que sugiere la regla para un día sin publicación, de hoy en adelante y no domingo, con su material comprobado (la foto del artista, el cartel de cada evento). Solo administración.';

commit;
