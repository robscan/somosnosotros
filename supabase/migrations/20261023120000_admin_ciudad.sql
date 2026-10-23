-- somosnosotros · migración 20261023120000 · el filtro por ciudad de Administración (OL-456, bitácora 488)
-- Founder, 23 de octubre: las listas de Personas, Lugares, Eventos y Artistas de Administración se filtran por ciudad con el chip y la hoja de
-- ciudad del front; la ciudad de una persona es «la que más se repite entre lo que administra, publica y marca "Voy"; si nada, "Sin ciudad";
-- cuenta en una sola».
--
-- Solo añade: dos ayudantes, una versión con `p_ciudad` de cada función del panel (las de hoy se quedan como están, con su misma firma, y la
-- app deja de llamarlas) y la lista de ciudades de cada sección. Las nuevas versiones no llevan valores por omisión, así que no chocan con las
-- de hoy al llamarlas por nombre. `p_ciudad` es el slug de la ciudad (el de `ciudades.slug`, el mismo de `?ciudad=` en la app); en Personas,
-- 'sin' es «Sin ciudad»; null, todas.
--   · ciudad_slug(texto)           el slug de la ciudad que una ficha dice en su texto, unificado con `ciudades` (nombre, alias y ciudad ampliada)
--   · ciudad_de_persona(uuid)      la ciudad que más se repite en lo que la persona lleva, publicó y marcó «Voy» (null si nada)
--   · panel_lugares / panel_eventos / panel_artistas / panel_personas (…, p_ciudad)   las listas, en una ciudad
--   · panel_fichas_conteos(p_tipo, p_ciudad) / panel_personas_conteos(p_ciudad)      las cuentas de los filtros, en una ciudad
--   · panel_en_ciudad(p_tipo, p_ciudad, p_ids)    de unas fichas, las que son de esa ciudad (los destacados de la sección)
--   · panel_ciudades_de(p_tipo)    la hoja: cada ciudad con cuántas tiene la sección, de la que más a la que menos

-- ---------- ayudantes ----------
-- El slug de la ciudad de una ficha. Primero la tabla de ciudades (por su slug, su nombre o un alias; un municipio conurbado da la ciudad a la
-- que pertenece); si no está, el slug de su texto. Vacío o Soledad caen en San Luis Potosí, como en la app (`ciudadCanonica`, `armarCiudades`).
create function public.ciudad_slug(p_ciudad text) returns text
language sql stable set search_path = '' as $$
  with s as (select public.slug_de_nombre(p_ciudad) as s)
  select coalesce(
    (select coalesce(c.ampliada_de, c.slug) from public.ciudades c, s
      where c.slug = s.s or public.slug_de_nombre(c.nombre) = s.s or exists (select 1 from unnest(c.alias) a where public.slug_de_nombre(a) = s.s)
      order by (c.slug = s.s) desc, c.slug limit 1),
    (select case when s.s in ('', 'soledad-de-graciano-sanchez') then 'san-luis-potosi' else s.s end from s));
$$;
revoke all on function public.ciudad_slug(text) from public, anon;
grant execute on function public.ciudad_slug(text) to authenticated, service_role;

-- La ciudad de una persona: entre las fichas que lleva, lo que publicó (lugares, eventos, artistas) y los eventos a los que dijo «Voy», la
-- ciudad que más se repite; si empatan, la de lo más reciente. Null si no tiene nada de eso («Sin ciudad»). Lee ligas y asistencias de otras
-- personas: solo la usan las funciones del panel (definer, que comprueban la administración); nadie más la llama.
create function public.ciudad_de_persona(p_perfil uuid) returns text
language sql stable security definer set search_path = '' as $$
  select x.c from (
    select public.ciudad_slug(l.ciudad) as c, lc.creado_en as f from public.lugares_cuentas lc join public.lugares l on l.id = lc.lugar_id where lc.perfil_id = p_perfil
    union all
    select public.ciudad_slug(a.ciudad), ac.creado_en from public.artistas_cuentas ac join public.artistas a on a.id = ac.artista_id where ac.perfil_id = p_perfil
    union all
    select public.ciudad_slug(l.ciudad), l.creado_en from public.lugares l where l.creado_por = p_perfil
    union all
    select public.ciudad_slug(e.ciudad), e.creado_en from public.eventos e where e.creado_por = p_perfil
    union all
    select public.ciudad_slug(a.ciudad), a.creado_en from public.artistas a where a.creado_por = p_perfil
    union all
    select public.ciudad_slug(e.ciudad), s.creado_en from public.asistencias s join public.eventos e on e.id = s.evento_id where s.usuario_id = p_perfil and s.estado = 'voy'
  ) x
  group by x.c
  order by count(*) desc, max(x.f) desc, x.c
  limit 1;
$$;
revoke all on function public.ciudad_de_persona(uuid) from public, anon, authenticated;

-- ---------- las listas, en una ciudad (las mismas de hoy, letra por letra, más la condición de la ciudad) ----------
create function public.panel_lugares(p_ciudad text, p_buscar text, p_filtro text, p_limite integer, p_desde integer)
returns table (id uuid, nombre text, foto text, tipo text, detalle text, visible boolean, privado boolean, origen text, proximas integer, lleva text, lleva_n integer, total bigint)
language sql stable security invoker set search_path = '' as $$
  select l.id, l.nombre, l.portada, l.tipo, l.detalle, l.visible, l.privado, l.origen,
    (select count(*) from public.eventos e where e.lugar_id = l.id and e.visible and e.termina >= now())::int,
    (select p.nombre from public.lugares_cuentas c join public.perfiles p on p.id = c.perfil_id where c.lugar_id = l.id order by c.creado_en limit 1),
    (select count(*) from public.lugares_cuentas c where c.lugar_id = l.id)::int,
    count(*) over ()
  from public.lugares l
  where public.es_admin()
    and (p_ciudad is null or public.ciudad_slug(l.ciudad) = p_ciudad)
    and (coalesce(trim(p_buscar), '') = '' or public.normalizar_nombre(p_buscar) <> '' and public.normalizar_nombre(l.nombre) like '%' || public.normalizar_nombre(p_buscar) || '%')
    and case coalesce(p_filtro, 'todos')
      when 'ocultos' then not l.visible
      when 'sin_fecha' then l.visible and not l.privado
        and not exists (select 1 from public.eventos e where e.lugar_id = l.id and e.visible and e.termina >= now())
      when 'sin_foto' then l.portada is null
      when 'catalogo' then l.origen = 'capo'
      else true
    end
  order by l.nombre_orden nulls last, l.nombre, l.id
  limit greatest(least(p_limite, 600), 1) offset greatest(p_desde, 0);
$$;

create function public.panel_eventos(p_ciudad text, p_buscar text, p_filtro text, p_limite integer, p_desde integer)
returns table (id uuid, titulo text, imagen text, inicio timestamptz, fin timestamptz, visible boolean, sitio text, autor text, autor_admin boolean, van integer, total bigint)
language sql stable security invoker set search_path = '' as $$
  select e.id, e.titulo, e.imagen, e.inicio, e.fin, e.visible, coalesce(l.nombre, e.sitio_texto), p.nombre, coalesce(p.rol = 'admin', false),
    (select count(*) from public.asistencias a where a.evento_id = e.id and a.estado = 'voy')::int,
    count(*) over ()
  from public.eventos e
  left join public.lugares l on l.id = e.lugar_id
  left join public.perfiles p on p.id = e.creado_por
  where public.es_admin()
    and e.termina >= now()
    and (p_ciudad is null or public.ciudad_slug(e.ciudad) = p_ciudad)
    and (coalesce(trim(p_buscar), '') = '' or public.normalizar_nombre(p_buscar) <> '' and public.normalizar_nombre(e.titulo) like '%' || public.normalizar_nombre(p_buscar) || '%')
    and case coalesce(p_filtro, 'proximos')
      when 'semana' then e.visible and e.inicio < now() + interval '7 days'
      when 'sin_imagen' then e.visible and e.imagen is null
      when 'comunidad' then e.visible and (p.id is null or public.rol_en_para_admin(p.id, e.creado_en) <> 'admin')
      when 'coincidencias' then e.visible and e.inicio < now() + interval '7 days'
        and (select count(*) from public.asistencias a where a.evento_id = e.id and a.estado = 'voy' and public.rol_en_para_admin(a.usuario_id, a.creado_en) <> 'admin') >= 2
      when 'ocultos' then not e.visible
      else e.visible
    end
  order by e.inicio, e.titulo, e.id
  limit greatest(least(p_limite, 600), 1) offset greatest(p_desde, 0);
$$;

create function public.panel_artistas(p_ciudad text, p_buscar text, p_filtro text, p_limite integer, p_desde integer)
returns table (id uuid, nombre text, foto text, disciplina text, detalle text, visible boolean, origen text, proximas integer, lleva text, lleva_n integer, total bigint)
language sql stable security invoker set search_path = '' as $$
  select a.id, a.nombre, a.foto, a.disciplina, a.detalle, a.visible, a.origen,
    (select count(*) from public.eventos_artistas ea join public.eventos e on e.id = ea.evento_id
      where ea.artista_id = a.id and e.visible and e.termina >= now())::int,
    (select p.nombre from public.artistas_cuentas c join public.perfiles p on p.id = c.perfil_id where c.artista_id = a.id order by c.creado_en limit 1),
    (select count(*) from public.artistas_cuentas c where c.artista_id = a.id)::int,
    count(*) over ()
  from public.artistas a
  where public.es_admin()
    and (p_ciudad is null or public.ciudad_slug(a.ciudad) = p_ciudad)
    and (coalesce(trim(p_buscar), '') = '' or public.normalizar_nombre(p_buscar) <> '' and public.normalizar_nombre(a.nombre) like '%' || public.normalizar_nombre(p_buscar) || '%')
    and case coalesce(p_filtro, 'todos')
      when 'por_reclamar' then a.origen = 'capo' and not exists (select 1 from public.artistas_cuentas c where c.artista_id = a.id)
      when 'llevados' then exists (select 1 from public.artistas_cuentas c where c.artista_id = a.id)
      when 'sin_foto' then a.foto is null
      when 'ocultos' then not a.visible
      else true
    end
  order by a.nombre_orden nulls last, a.nombre, a.id
  limit greatest(least(p_limite, 600), 1) offset greatest(p_desde, 0);
$$;

create function public.panel_personas(p_ciudad text, p_buscar text, p_filtro text, p_limite integer, p_desde integer)
returns table (
  id uuid, nombre text, foto text, rol text, reservado boolean, creado_en timestamptz, confirmado boolean,
  ultima_entrada timestamptz, visto date, correo_oculto text, va_a integer, sigue integer, publico integer,
  lleva text, lleva_n integer, total bigint
)
language sql stable security definer set search_path = '' as $$
  with base as (
    select p.id, p.nombre, p.foto, p.rol, p.reservado, p.creado_en,
      u.email_confirmed_at is not null as confirmado, u.last_sign_in_at as ultima_entrada, v.dia as visto, u.email
    from public.perfiles p
    join auth.users u on u.id = p.id
    left join public.cuentas_vistas v on v.perfil_id = p.id
    where public.es_admin()
      and (p_ciudad is null or coalesce(public.ciudad_de_persona(p.id), 'sin') = p_ciudad)
      and (coalesce(trim(p_buscar), '') = ''
        or (public.normalizar_nombre(p_buscar) <> '' and public.normalizar_nombre(p.nombre) like '%' || public.normalizar_nombre(p_buscar) || '%')
        or lower(u.email) like '%' || replace(replace(replace(lower(trim(p_buscar)), '\', '\\'), '%', '\%'), '_', '\_') || '%')
      and case coalesce(p_filtro, 'todas')
        when 'nuevas' then public.rol_en(p.id, p.creado_en) <> 'admin' and p.creado_en >= now() - interval '7 days'
        when 'sin_entrar' then u.last_sign_in_at is null
        when 'administracion' then p.rol = 'admin'
        else true
      end
  ),
  fichas as (
    select c.perfil_id, a.nombre, c.creado_en from public.artistas_cuentas c join public.artistas a on a.id = c.artista_id
    union all
    select c.perfil_id, l.nombre, c.creado_en from public.lugares_cuentas c join public.lugares l on l.id = c.lugar_id
  )
  select b.id, b.nombre, b.foto, b.rol, b.reservado, b.creado_en, b.confirmado, b.ultima_entrada, b.visto,
    case when b.email is null then null else left(split_part(b.email, '@', 1), 2) || '…@' || split_part(b.email, '@', 2) end,
    (select count(*) from public.asistencias a join public.eventos e on e.id = a.evento_id
      where a.usuario_id = b.id and a.estado = 'voy' and e.visible and e.termina >= now())::int,
    (select count(*) from public.seguimientos s where s.usuario_id = b.id)::int,
    ((select count(*) from public.lugares l where l.creado_por = b.id)
      + (select count(*) from public.eventos e where e.creado_por = b.id)
      + (select count(*) from public.artistas a where a.creado_por = b.id))::int,
    (select f.nombre from fichas f where f.perfil_id = b.id order by f.creado_en limit 1),
    (select count(*) from fichas f where f.perfil_id = b.id)::int,
    count(*) over ()
  from base b
  order by greatest(b.ultima_entrada, b.visto::timestamp at time zone 'America/Mexico_City', b.creado_en) desc nulls last, b.nombre, b.id
  limit greatest(least(p_limite, 600), 1) offset greatest(p_desde, 0);
$$;

-- ---------- las cuentas de los filtros, en una ciudad ----------
create function public.panel_fichas_conteos(p_tipo text, p_ciudad text) returns json
language sql stable security invoker set search_path = '' as $$
  with
    l as (select x.* from public.lugares x where p_ciudad is null or public.ciudad_slug(x.ciudad) = p_ciudad),
    e as (select x.* from public.eventos x where x.termina >= now() and (p_ciudad is null or public.ciudad_slug(x.ciudad) = p_ciudad)),
    a as (select x.* from public.artistas x where p_ciudad is null or public.ciudad_slug(x.ciudad) = p_ciudad)
  select case
    when not public.es_admin() then null
    when p_tipo = 'lugares' then json_build_object(
      'todos', (select count(*) from l),
      'ocultos', (select count(*) from l where not l.visible),
      'sin_fecha', (select count(*) from l where l.visible and not l.privado
        and not exists (select 1 from public.eventos ev where ev.lugar_id = l.id and ev.visible and ev.termina >= now())),
      'sin_foto', (select count(*) from l where l.portada is null),
      'catalogo', (select count(*) from l where l.origen = 'capo'))
    when p_tipo = 'eventos' then json_build_object(
      'proximos', (select count(*) from e where e.visible),
      'semana', (select count(*) from e where e.visible and e.inicio < now() + interval '7 days'),
      'sin_imagen', (select count(*) from e where e.visible and e.imagen is null),
      'comunidad', (select count(*) from e left join public.perfiles p on p.id = e.creado_por
        where e.visible and (p.id is null or public.rol_en_para_admin(p.id, e.creado_en) <> 'admin')),
      'coincidencias', (select count(*) from e where e.visible and e.inicio < now() + interval '7 days'
        and (select count(*) from public.asistencias s where s.evento_id = e.id and s.estado = 'voy' and public.rol_en_para_admin(s.usuario_id, s.creado_en) <> 'admin') >= 2),
      'ocultos', (select count(*) from e where not e.visible))
    when p_tipo = 'artistas' then json_build_object(
      'todos', (select count(*) from a),
      'por_reclamar', (select count(*) from a where a.origen = 'capo' and not exists (select 1 from public.artistas_cuentas c where c.artista_id = a.id)),
      'llevados', (select count(*) from a where exists (select 1 from public.artistas_cuentas c where c.artista_id = a.id)),
      'sin_foto', (select count(*) from a where a.foto is null),
      'ocultos', (select count(*) from a where not a.visible))
  end;
$$;

create function public.panel_personas_conteos(p_ciudad text) returns json
language sql stable security definer set search_path = '' as $$
  with p as (
    select p.id, p.rol, p.creado_en, u.last_sign_in_at
    from public.perfiles p join auth.users u on u.id = p.id
    where p_ciudad is null or coalesce(public.ciudad_de_persona(p.id), 'sin') = p_ciudad
  )
  select case when public.es_admin() then json_build_object(
    'todas', (select count(*) from p),
    'nuevas', (select count(*) from p where public.rol_en(p.id, p.creado_en) <> 'admin' and p.creado_en >= now() - interval '7 days'),
    'sin_entrar', (select count(*) from p where p.last_sign_in_at is null),
    'administracion', (select count(*) from p where p.rol = 'admin')
  ) end;
$$;

-- ---------- los destacados de una sección, en una ciudad ----------
create function public.panel_en_ciudad(p_tipo text, p_ciudad text, p_ids uuid[]) returns setof uuid
language sql stable security invoker set search_path = '' as $$
  select x.id from public.lugares x where public.es_admin() and p_tipo = 'lugares' and x.id = any(p_ids) and public.ciudad_slug(x.ciudad) = p_ciudad
  union all
  select x.id from public.eventos x where public.es_admin() and p_tipo = 'eventos' and x.id = any(p_ids) and public.ciudad_slug(x.ciudad) = p_ciudad
  union all
  select x.id from public.artistas x where public.es_admin() and p_tipo = 'artistas' and x.id = any(p_ids) and public.ciudad_slug(x.ciudad) = p_ciudad;
$$;

-- ---------- la hoja de ciudades de cada sección ----------
-- Cada ciudad que tiene algo en la sección, con cuántas: Lugares y Artistas, todas sus fichas (también las ocultas); Eventos, los próximos
-- visibles; Personas, por la ciudad de cada persona, y 'sin' («Sin ciudad») al final. El nombre: el de la tabla de ciudades o, si la ciudad no
-- está en ella, el texto que más se repite. De la que más tiene a la que menos.
create function public.panel_ciudades_de(p_tipo text) returns table (slug text, nombre text, n bigint)
language sql stable security definer set search_path = '' as $$
  with textos as (
    select public.ciudad_slug(x.ciudad) as s, x.ciudad as t from public.lugares x where p_tipo = 'lugares'
    union all
    select public.ciudad_slug(x.ciudad), x.ciudad from public.eventos x where p_tipo = 'eventos' and x.visible and x.termina >= now()
    union all
    select public.ciudad_slug(x.ciudad), x.ciudad from public.artistas x where p_tipo = 'artistas'
    union all
    select coalesce(public.ciudad_de_persona(x.id), 'sin'), null from public.perfiles x where p_tipo = 'personas'
  )
  select t.s,
    case when t.s = 'sin' then 'Sin ciudad'
      else coalesce((select c.nombre from public.ciudades c where c.slug = t.s), mode() within group (order by t.t), t.s) end,
    count(*)
  from textos t
  where public.es_admin()
  group by t.s
  order by (t.s = 'sin'), count(*) desc, 2;
$$;

revoke all on function public.panel_lugares(text, text, text, integer, integer), public.panel_eventos(text, text, text, integer, integer),
  public.panel_artistas(text, text, text, integer, integer), public.panel_personas(text, text, text, integer, integer),
  public.panel_fichas_conteos(text, text), public.panel_personas_conteos(text), public.panel_en_ciudad(text, text, uuid[]),
  public.panel_ciudades_de(text) from public, anon;
grant execute on function public.panel_lugares(text, text, text, integer, integer), public.panel_eventos(text, text, text, integer, integer),
  public.panel_artistas(text, text, text, integer, integer), public.panel_personas(text, text, text, integer, integer),
  public.panel_fichas_conteos(text, text), public.panel_personas_conteos(text), public.panel_en_ciudad(text, text, uuid[]),
  public.panel_ciudades_de(text) to authenticated, service_role;
