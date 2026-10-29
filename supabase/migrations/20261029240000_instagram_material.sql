-- somosnosotros · OL-488 · migración 20261029240000 · la semana de Instagram solo publica con material (bitácora 520)
-- El founder, el 29 de octubre, al usar la pestaña «Semana» (OL-479, bitácora 511): «En el caso de León Marinero, no trae portada y eso no se
-- debería de permitir. O le conseguimos una portada o no mostramos esa publicación. Primero confirmar que tenemos material visual; si no,
-- conseguirlo; si no, cambiar la publicación. Lo que vamos a promocionar es lo que está registrado… es una manera de promover que los artistas
-- entren y completen sus perfiles para que sean publicados. Lo mismo con los lugares». Y: «En la semana en curso, para los días de hoy y los
-- anteriores, dice sin publicación. Debería haber alguna publicación opcional para que la pueda detonar manualmente».
--
-- Por qué «no traía portada» aunque `instagram_candidatos` ya pedía foto y portada: la tarjeta solo puede dibujar imágenes que viven en el
-- Storage de la app (`cartelDescargable`, src/lib/cartelDescarga.ts); una portada pegada de otra página (la administración puede) se guardaba,
-- contaba como «tiene portada» y la tarjeta salía con la imagen de relleno. Ahora material es la imagen que la app sí puede usar: una URL del
-- bucket `fotos` (`instagram_material_propio`, que usa `imagen_origen_permitido` de OL-262; en la app, `cartelDescargable`).
--
-- LO QUE SE REEMPLAZA (misma firma; `create or replace` conserva sus permisos; ninguna fila cambia):
--   · `instagram_candidatos`: artista con foto Y portada propias; lugar con portada propia. Lo demás, igual.
--   · `instagram_semana_cambiar`: no deja poner una ficha (o un evento) sin material. Lo demás, igual.
--
-- LO DEMÁS SOLO AÑADE:
--   · `instagram_material_propio(url)`: ¿es una imagen del Storage de la app? Interna.
--   · `instagram_falta_material(ciudad, lunes)`: el renglón «Falta material»: artistas y lugares de la ciudad con fecha en los 30 días desde ese
--     lunes que se quedan fuera por falta de foto o portada (qué falta, su próxima fecha, quién lleva la ficha y si ya se le pidió esa semana).
--     Solo responde a la administración.
--   · `instagram_material_pedidos`: «Pedírselo»: a quién se le pidió completar su ficha, qué ficha, qué semana y qué faltaba. Una sola vez por
--     ficha y semana. Cada quien lee lo suyo (su aviso en Novedades); la administración, todo; se escribe por su función.
--   · `instagram_pedir_material(tipo, ficha, lunes)`: lo anota y devuelve a quién avisar (las cuentas que llevan la ficha y quien la creó, si no
--     es de la administración). Solo la administración.
--   · `instagram_semana_programar(ciudad, día, ahora)`: «Programar» (a su hora) o «Publicar ahora» (solo hoy) la sugerencia de un día que no tiene
--     publicación (no se armó porque su hora ya había pasado, o descansaba porque nadie tenía material). Comprueba el material y que el día sea de
--     hoy en adelante y no domingo. Solo la administración.
-- Sin cron nuevo. Todas con `search_path = ''`.
begin;

-- ---------- 1. ¿Es material que la app puede usar? ----------
create function public.instagram_material_propio(p_url text) returns boolean
language sql stable set search_path = '' as $$
  -- `imagen_origen_permitido` (OL-262) es la gramática de lib/imagenes.ts: con «externa» en falso, solo el bucket `fotos` del Storage de la app.
  -- Da por buena una URL vacía (una ficha sin imagen): aquí, vacía no es material.
  select coalesce(btrim(p_url), '') <> '' and public.imagen_origen_permitido(p_url, false, false);
$$;
revoke all on function public.instagram_material_propio(text) from public, anon, authenticated;
comment on function public.instagram_material_propio(text) is 'OL-488: ¿la imagen vive en el Storage de la app (bucket fotos, imagen_origen_permitido sin externa)? Solo esas las puede dibujar la tarjeta de Instagram (cartelDescargable en src/lib/cartelDescarga.ts). Interna.';

-- ---------- 2. Quién puede salir: con material ----------
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
    where p_tipo = 'artista' and a.visible and public.instagram_material_propio(a.foto) and public.instagram_material_propio(a.portada)
      and char_length(coalesce(a.descripcion, '')) >= 120 and a.redes::text ~* 'instagram\.com/[A-Za-z0-9._]'
      and not exists (select 1 from public.instagram_fuera f where f.artista_id = a.id)
    union all
    select l.id, l.slug, l.nombre, l.ciudad, l.tipo, l.detalle, null::text, l.portada, l.descripcion, l.redes, l.direccion
    from public.lugares l
    where p_tipo = 'lugar' and l.visible and not l.privado and public.instagram_material_propio(l.portada) and char_length(coalesce(l.descripcion, '')) >= 120
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
comment on function public.instagram_candidatos(text, text, date) is 'OL-479 + OL-488: las fichas que pueden ocupar un día de la semana de Instagram: artistas con foto y portada propias (del Storage de la app), descripción e Instagram; lugares con portada propia y descripción. Solo administración.';

-- ---------- 3. «Cambiar»: tampoco sin material ----------
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
  -- OL-488: sin material (foto y portada del artista, portada del lugar, cartel del evento, en el Storage de la app) no se pone.
  if (p_tipo = 'artista' and not exists (select 1 from public.artistas a where a.id = p_ficha and public.instagram_material_propio(a.foto) and public.instagram_material_propio(a.portada)))
     or (p_tipo = 'lugar' and not exists (select 1 from public.lugares l where l.id = p_ficha and public.instagram_material_propio(l.portada)))
     or (p_tipo = 'evento' and not exists (select 1 from public.eventos e where e.id = p_ficha and public.instagram_material_propio(e.imagen))) then
    raise exception 'A esa ficha le falta material: foto o portada.' using errcode = '22023';
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

-- ---------- 4. «Pedírselo»: a quién se le pidió completar su ficha ----------
create table public.instagram_material_pedidos (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid references public.artistas (id) on delete cascade,
  lugar_id uuid references public.lugares (id) on delete cascade,
  -- El lunes de la semana en que se pidió (una sola vez por ficha y semana).
  semana date not null,
  -- A quién le llega el aviso (en Novedades y al teléfono): una fila por persona; si borra su cuenta, se va con ella.
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  -- Qué le faltaba: foto, portada (o las dos), para el texto del aviso.
  falta text[] not null check (cardinality(falta) between 1 and 2 and falta <@ array['foto', 'portada']::text[]),
  pedido_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  constraint instagram_material_pedidos_ficha check ((artista_id is null) <> (lugar_id is null))
);
create unique index instagram_material_pedidos_una_idx on public.instagram_material_pedidos (coalesce(artista_id, lugar_id), semana, usuario_id);
create index instagram_material_pedidos_usuario_idx on public.instagram_material_pedidos (usuario_id, creado_en desc);
create index instagram_material_pedidos_artista_idx on public.instagram_material_pedidos (artista_id, semana) where artista_id is not null;
create index instagram_material_pedidos_lugar_idx on public.instagram_material_pedidos (lugar_id, semana) where lugar_id is not null;
comment on table public.instagram_material_pedidos is 'OL-488: «Pedírselo» en Administración › Instagram › Falta material: a quién se le pidió completar la foto o la portada de una ficha, y qué semana (una vez por ficha y semana). Cada quien lee lo suyo; se escribe por instagram_pedir_material.';

alter table public.instagram_material_pedidos enable row level security;
revoke all on public.instagram_material_pedidos from public, anon, authenticated;
grant select on public.instagram_material_pedidos to authenticated;
grant all on public.instagram_material_pedidos to service_role;
create policy "instagram_material_pedidos: lo mío y la administración" on public.instagram_material_pedidos for select to authenticated
  using (usuario_id = (select auth.uid()) or public.es_admin());

-- Quién lleva una ficha: las cuentas ligadas y quien la creó (si no es de la administración, que da de alta fichas de otros). Interna.
create function public.instagram_quien_lleva(p_tipo text, p_ficha uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(x.perfil_id order by x.desde, x.perfil_id), '{}'::uuid[])
  from (
    select c.perfil_id, min(c.creado_en) as desde
    from (
      select ac.perfil_id, ac.creado_en from public.artistas_cuentas ac where p_tipo = 'artista' and ac.artista_id = p_ficha
      union all
      select lc.perfil_id, lc.creado_en from public.lugares_cuentas lc where p_tipo = 'lugar' and lc.lugar_id = p_ficha
      union all
      select a.creado_por, a.creado_en from public.artistas a where p_tipo = 'artista' and a.id = p_ficha and a.creado_por is not null
      union all
      select l.creado_por, l.creado_en from public.lugares l where p_tipo = 'lugar' and l.id = p_ficha and l.creado_por is not null
    ) c
    join public.perfiles p on p.id = c.perfil_id and p.rol <> 'admin'
    group by c.perfil_id
  ) x;
$$;
revoke all on function public.instagram_quien_lleva(text, uuid) from public, anon, authenticated, service_role;

-- ---------- 5. «Falta material»: quién se quedó fuera ----------
-- Artistas y lugares visibles de la ciudad (por su ficha o por la ciudad de su próxima fecha) con una fecha en los 30 días desde `p_desde` (el
-- lunes de la semana), que no dijeron que no ni salieron en los últimos 6 meses, y a los que les falta foto o portada que la app pueda usar.
-- `falta`: foto, portada, foto_ajena o portada_ajena (la tiene, pero de otra página: hay que subirla a la app). `otros`: lo demás que les faltaría
-- para entrar (descripción de 120 letras, Instagram del artista). `lleva`: las cuentas que la llevan (vacío si nadie); `pedido_en`: si ya se le
-- pidió esa semana.
create function public.instagram_falta_material(p_ciudad text, p_desde date)
returns table (
  tipo text, id uuid, slug text, nombre text, foto text, falta text[], otros text[], proxima_titulo text, proxima_inicio timestamptz, proxima_zona text,
  lleva uuid[], lleva_nombre text, pedido_en timestamptz
)
language sql stable security definer set search_path = '' as $$
  with fichas as (
    select 'artista'::text as tipo, a.id, a.slug, a.nombre, a.ciudad, coalesce(nullif(btrim(a.foto), ''), nullif(btrim(a.portada), '')) as foto,
      array_remove(array[
        case when coalesce(btrim(a.foto), '') = '' then 'foto' when not public.instagram_material_propio(a.foto) then 'foto_ajena' end,
        case when coalesce(btrim(a.portada), '') = '' then 'portada' when not public.instagram_material_propio(a.portada) then 'portada_ajena' end
      ], null) as falta,
      array_remove(array[
        case when char_length(coalesce(a.descripcion, '')) < 120 then 'descripcion' end,
        case when not (coalesce(a.redes, '[]'::jsonb)::text ~* 'instagram\.com/[A-Za-z0-9._]') then 'instagram' end
      ], null) as otros
    from public.artistas a
    where a.visible and not exists (select 1 from public.instagram_fuera f where f.artista_id = a.id)
    union all
    select 'lugar', l.id, l.slug, l.nombre, l.ciudad, nullif(btrim(l.portada), ''),
      array_remove(array[case when coalesce(btrim(l.portada), '') = '' then 'portada' when not public.instagram_material_propio(l.portada) then 'portada_ajena' end], null),
      array_remove(array[case when char_length(coalesce(l.descripcion, '')) < 120 then 'descripcion' end], null)
    from public.lugares l
    where l.visible and not l.privado and not exists (select 1 from public.instagram_fuera f where f.lugar_id = l.id)
  ),
  sin as (select * from fichas f where cardinality(f.falta) > 0),
  con as (
    select s.*, prox.titulo as proxima_titulo, prox.inicio as proxima_inicio, prox.zona as proxima_zona, prox.ciudad as proxima_ciudad
    from sin s
    join lateral (
      select e.titulo, e.inicio, e.zona, e.ciudad
      from public.eventos e
      where e.visible and not e.borrador and not e.cancelado and not e.retirado_por_admin
        and (case when s.tipo = 'artista' then exists (select 1 from public.eventos_artistas ea where ea.evento_id = e.id and ea.artista_id = s.id) else e.lugar_id = s.id end)
        -- Su próxima fecha: lo que viene (desde ahora si la semana ya empezó), en los 30 días desde ese lunes.
        and e.inicio >= greatest(p_desde::timestamp at time zone e.zona, now()) and e.inicio < ((p_desde + 30)::timestamp at time zone e.zona)
      order by e.inicio
      limit 1
    ) prox on true
    where public.ciudad_slug(s.ciudad) = p_ciudad or public.ciudad_slug(prox.ciudad) = p_ciudad
  )
  select c.tipo, c.id, c.slug, c.nombre, c.foto, c.falta, c.otros, c.proxima_titulo, c.proxima_inicio, c.proxima_zona,
    q.lleva, (select p.nombre from public.perfiles p where p.id = q.lleva[1]),
    (select min(m.creado_en) from public.instagram_material_pedidos m
      where (m.artista_id = c.id or m.lugar_id = c.id) and m.semana = p_desde)
  from con c
  cross join lateral (select public.instagram_quien_lleva(c.tipo, c.id) as lleva) q
  where public.es_admin() and p_ciudad is not null and p_desde is not null
    and not exists (select 1 from public.instagram_publicaciones ip
      where ip.estado = 'publicada' and (ip.artista_id = c.id or ip.lugar_id = c.id) and ip.creado_en >= now() - interval '6 months')
  order by c.proxima_inicio, c.nombre, c.id
  limit 100;
$$;
revoke all on function public.instagram_falta_material(text, date) from public, anon;
grant execute on function public.instagram_falta_material(text, date) to authenticated, service_role;
comment on function public.instagram_falta_material(text, date) is 'OL-488: los artistas y lugares de una ciudad con fecha en los 30 días desde un lunes que se quedan fuera de la semana de Instagram por falta de foto o portada (qué falta, su próxima fecha, quién la lleva y si ya se le pidió esa semana). Solo administración.';

-- ---------- 6. «Pedírselo» ----------
-- Anota el pedido (una vez por ficha y semana) para cada cuenta que lleva la ficha y devuelve a quién avisar al teléfono (la app manda el aviso).
create function public.instagram_pedir_material(p_tipo text, p_ficha uuid, p_desde date) returns uuid[]
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
  if p_tipo = 'artista' then
    select array_remove(array[case when not public.instagram_material_propio(a.foto) then 'foto' end, case when not public.instagram_material_propio(a.portada) then 'portada' end], null)
    into v_falta from public.artistas a where a.id = p_ficha;
  else
    select array_remove(array[case when not public.instagram_material_propio(l.portada) then 'portada' end], null)
    into v_falta from public.lugares l where l.id = p_ficha;
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
revoke all on function public.instagram_pedir_material(text, uuid, date) from public, anon;
grant execute on function public.instagram_pedir_material(text, uuid, date) to authenticated, service_role;
comment on function public.instagram_pedir_material(text, uuid, date) is 'OL-488: «Pedírselo»: anota, una vez por ficha y semana, el pedido de completar foto o portada a quien lleva la ficha, y devuelve a quién avisar. Solo administración.';

-- ---------- 7. «Programar» o «Publicar ahora» la sugerencia de un día ----------
-- `p_casilla`: { fecha, tipo (artista, lugar, evento o semana), hora, artista_id | lugar_id | evento_id | eventos, motivo }, lo que sugiere la
-- regla (la arma la app, como `instagram_semana_guardar`). Solo un día de hoy en adelante, no domingo; «ahora», solo hoy; sin «ahora», solo si su
-- hora no ha pasado. Si el día ya tiene fila, solo se toma si descansaba (nadie tenía material) o quedó programado sin trabajo; lo que ya sale,
-- se publicó o se quitó, no. Devuelve el trabajo en la cola.
create function public.instagram_semana_programar(p_ciudad text, p_casilla jsonb, p_ahora boolean default false) returns uuid
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
  -- El material, comprobado aquí (no solo en la app): foto y portada del artista, portada del lugar, cartel de cada evento.
  if (v_tipo = 'artista' and not exists (select 1 from public.artistas a where a.id = v_artista and a.visible
        and public.instagram_material_propio(a.foto) and public.instagram_material_propio(a.portada)
        and not exists (select 1 from public.instagram_fuera f where f.artista_id = a.id)))
     or (v_tipo = 'lugar' and not exists (select 1 from public.lugares l where l.id = v_lugar and l.visible and not l.privado
        and public.instagram_material_propio(l.portada) and not exists (select 1 from public.instagram_fuera f where f.lugar_id = l.id)))
     or (v_tipo = 'evento' and not exists (select 1 from public.eventos e where e.id = v_evento and e.visible and not e.borrador and not e.cancelado
        and not e.retirado_por_admin and public.instagram_material_propio(e.imagen)))
     or (v_tipo = 'semana' and (coalesce(cardinality(v_eventos), 0) not between 1 and 9 or exists (
        select 1 from unnest(v_eventos) x(id)
        where not exists (select 1 from public.eventos e where e.id = x.id and e.visible and not e.borrador and not e.cancelado
          and not e.retirado_por_admin and public.instagram_material_propio(e.imagen))))) then
    raise exception 'Le falta material: foto, portada o cartel.' using errcode = '22023';
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
revoke all on function public.instagram_semana_programar(text, jsonb, boolean) from public, anon;
grant execute on function public.instagram_semana_programar(text, jsonb, boolean) to authenticated, service_role;
comment on function public.instagram_semana_programar(text, jsonb, boolean) is 'OL-488: «Programar» (a su hora) o «Publicar ahora» (solo hoy) lo que sugiere la regla para un día sin publicación, de hoy en adelante y no domingo, con su material comprobado. Solo administración.';

commit;
