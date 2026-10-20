-- somosnosotros · OL-427 · migración 20261020140000 · Administración › Ciudades (doc 57 §4.B; prototipo firmado OL-425, bitácora 458)
-- Founder, 20 de octubre: «hablamos que cada ciudad abierta aparecería en un panel de admin, desde donde se podría detonar con un accionable
-- la investigación usando API»; «Firmo» sobre el prototipo. La rutina que de verdad corre con la API llega en otra pieza (OL-428): aquí un botón
-- solo deja una corrida «pendiente» con su tope.
--
-- SOLO AÑADE: seis tablas nuevas, sus reglas por fila, un disparador y cuatro funciones; nada existente cambia.
--   · ciudades          la tabla de ciudades (slug, nombre, ciudad ampliada, centro, zoom, zona, alias, estado). La lee todo el mundo; la
--                       escribe la administración. La lista de ciudades de la app se sigue armando con lo publicado (src/lib/ciudades.ts):
--                       esta tabla no la cambia.
--   · ciudades_vistas   consultas por ciudad y día, sin persona: solo el slug, el día y un número. Las suma registrar_ciudad_vista().
--   · rutinas_corridas  cada corrida de una rutina (lugares · agendas · artistas · showcase) con su tope y su gasto. Compartida con el showcase.
--   · propuestas        lo que una corrida propone (lugar · evento · artista), su fuente y lo que decidió la administración.
--   · configuracion     clave/valor de la administración: el crédito de la API y cuándo vence (el gasto real lo descuenta OL-428).
-- Solo administración (y la llave de servicio) lee y escribe las cuatro últimas.

-- ---------- ciudades ----------
create table public.ciudades (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  ampliada_de text references public.ciudades (slug) on update cascade on delete set null check (ampliada_de is distinct from slug),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  zoom smallint not null default 13 check (zoom between 1 and 20),
  zona text not null default 'America/Mexico_City' constraint ciudades_zona_valida check (public.zona_valida(zona)),
  alias text[] not null default '{}',
  estado text not null default 'detectada' check (estado in ('abierta', 'detectada', 'investigando', 'cerrada')),
  creado_en timestamptz not null default now(),
  constraint ciudades_centro_completo check ((lat is null) = (lng is null))
);
comment on table public.ciudades is 'Las ciudades de Administración › Ciudades (OL-427). La lista de la app sigue saliendo de lo publicado; esta tabla guarda su estado, centro, zona y alias.';
comment on column public.ciudades.ampliada_de is 'La ciudad ampliada a la que pertenece (un municipio conurbado): doc 57 §3.4.';
comment on column public.ciudades.alias is 'Otros nombres con los que llega la misma ciudad (lo que hoy hace MISMA_CIUDAD en src/lib/ciudad.ts).';
comment on column public.ciudades.estado is 'abierta: con su catálogo; detectada: la consultó alguien y nadie la investigó; investigando: tiene una corrida; cerrada: no se sigue.';

-- La inicial, con su conurbación, y San Miguel de Allende (lo que su gente ya publicó): las dos abiertas. El centro de San Luis es el de
-- CIUDAD_INICIAL (src/lib/ciudad.ts); el de San Miguel, el promedio de sus lugares públicos (si no hay, su jardín principal).
insert into public.ciudades (slug, nombre, lat, lng, zoom, zona, alias, estado)
values ('san-luis-potosi', 'San Luis Potosí', 22.1497, -100.9764, 13, 'America/Mexico_City', array['Soledad de Graciano Sánchez'], 'abierta');
insert into public.ciudades (slug, nombre, lat, lng, zoom, zona, estado)
select 'san-miguel-de-allende', 'San Miguel de Allende', coalesce(avg(l.lat), 20.9144), coalesce(avg(l.lng), -100.7452), 13,
  coalesce(mode() within group (order by l.zona), 'America/Mexico_City'), 'abierta'
from public.lugares l
where l.ciudad = 'San Miguel de Allende' and l.visible and not l.privado;

-- ---------- consultas por ciudad y día (sin persona) ----------
create table public.ciudades_vistas (
  ciudad text not null references public.ciudades (slug) on update cascade on delete cascade,
  dia date not null,
  consultas integer not null default 0 check (consultas between 0 and 1000000),
  primary key (ciudad, dia)
);
comment on table public.ciudades_vistas is 'Cuántas veces Inicio o Lugares mostraron cada ciudad cada día (en su zona). Sin persona: ni cuenta, ni IP, ni ubicación.';

-- ---------- corridas de las rutinas ----------
create table public.rutinas_corridas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('lugares', 'agendas', 'artistas', 'showcase')),
  ciudad text references public.ciudades (slug) on update cascade on delete restrict,
  parametros jsonb not null default '{}'::jsonb check (jsonb_typeof(parametros) = 'object'),
  tope_usd numeric(8, 2) not null check (tope_usd > 0 and tope_usd <= 50),
  gasto_usd numeric(10, 4) not null default 0 check (gasto_usd >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'corriendo', 'terminada', 'fallida', 'cancelada')),
  resumen jsonb not null default '{}'::jsonb check (jsonb_typeof(resumen) = 'object'),
  creado_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  inicio timestamptz,
  fin timestamptz,
  constraint rutinas_corridas_ciudad_de_los_botones check (tipo = 'showcase' or ciudad is not null),
  constraint rutinas_corridas_fin_despues check (fin is null or inicio is null or fin >= inicio)
);
comment on table public.rutinas_corridas is 'Cada corrida de una rutina con la API: tope y gasto en USD, estado y resumen. La crea un botón de Administración (pendiente) y la corre OL-428.';
comment on column public.rutinas_corridas.resumen is 'Lo que deja la rutina al correr (avance, fuentes leídas, motivo de un fallo). Lo escribe OL-428.';
-- Una sola en curso (pendiente o corriendo) por botón y ciudad: tocar «Correr» dos veces no la duplica.
create unique index rutinas_corridas_una_en_curso on public.rutinas_corridas (tipo, ciudad) where estado in ('pendiente', 'corriendo') and ciudad is not null;
create index rutinas_corridas_recientes_idx on public.rutinas_corridas (creado_en desc);

-- Correr una búsqueda sobre una ciudad detectada la pone «investigando» (el founder decide abrirla corriendo la investigación).
create function public.ciudad_investigando_al_correr() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.ciudades set estado = 'investigando' where slug = new.ciudad and estado = 'detectada';
  return new;
end $$;
revoke all on function public.ciudad_investigando_al_correr() from public, anon, authenticated;
create trigger rutinas_corridas_ciudad_investigando after insert on public.rutinas_corridas
for each row when (new.ciudad is not null) execute function public.ciudad_investigando_al_correr();

-- ---------- propuestas ----------
create table public.propuestas (
  id uuid primary key default gen_random_uuid(),
  corrida_id uuid not null references public.rutinas_corridas (id) on delete cascade,
  tipo text not null check (tipo in ('lugar', 'evento', 'artista')),
  fuente text not null check (char_length(btrim(fuente)) between 1 and 120),
  datos jsonb not null default '{}'::jsonb check (jsonb_typeof(datos) = 'object'),
  estado text not null default 'propuesta' check (estado in ('propuesta', 'aceptada', 'rechazada')),
  motivo_rechazo text check (motivo_rechazo in ('duplicado', 'no_cultural', 'fuera_de_la_ciudad', 'otro')),
  ficha_id uuid,
  resuelto_por uuid references public.perfiles (id) on delete set null,
  resuelto_en timestamptz,
  creado_en timestamptz not null default now(),
  constraint propuestas_motivo_al_rechazar check ((estado = 'rechazada') = (motivo_rechazo is not null)),
  constraint propuestas_resuelta_con_fecha check ((estado = 'propuesta') = (resuelto_en is null)),
  constraint propuestas_ficha_al_aceptar check (ficha_id is null or estado = 'aceptada')
);
comment on table public.propuestas is 'Lo que propone una corrida, una por fila, con su fuente; nada se publica hasta que la administración lo acepta.';
comment on column public.propuestas.datos is 'Lo leído: nombre, tipo, dirección, lat/lng, redes, url de la fuente, cuándo se leyó (src/lib/propuestas.ts).';
comment on column public.propuestas.ficha_id is 'La ficha que se creó al aceptar (un lugar o un artista): la procedencia queda aquí. Un evento aceptado queda sin ficha hasta que lo publique la rutina de agendas (OL-428).';
create index propuestas_corrida_idx on public.propuestas (corrida_id, estado);
create index propuestas_fuente_aceptada_idx on public.propuestas (tipo, fuente) where estado = 'aceptada';

-- ---------- configuración de la administración ----------
create table public.configuracion (
  clave text primary key check (clave ~ '^[a-z0-9_]+$'),
  valor jsonb not null,
  actualizado_en timestamptz not null default now()
);
comment on table public.configuracion is 'Valores de la administración, clave y valor (OL-427: el crédito de la API).';
insert into public.configuracion (clave, valor) values ('credito_api_usd', '200'::jsonb), ('credito_api_vence', '"2026-11-11"'::jsonb);

-- ---------- reglas por fila ----------
alter table public.ciudades enable row level security;
alter table public.ciudades_vistas enable row level security;
alter table public.rutinas_corridas enable row level security;
alter table public.propuestas enable row level security;
alter table public.configuracion enable row level security;

create policy "ciudades: la lee todo el mundo" on public.ciudades for select to anon, authenticated using (true);
create policy "ciudades: la da de alta la administración" on public.ciudades for insert to authenticated with check (public.es_admin());
create policy "ciudades: la cambia la administración" on public.ciudades for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "ciudades: la quita la administración" on public.ciudades for delete to authenticated using (public.es_admin());

create policy "ciudades_vistas: la lee la administración" on public.ciudades_vistas for select to authenticated using (public.es_admin());

create policy "rutinas_corridas: la lee la administración" on public.rutinas_corridas for select to authenticated using (public.es_admin());
create policy "rutinas_corridas: la crea la administración" on public.rutinas_corridas for insert to authenticated
  with check (public.es_admin() and creado_por is not distinct from auth.uid());
create policy "rutinas_corridas: la cambia la administración" on public.rutinas_corridas for update to authenticated using (public.es_admin()) with check (public.es_admin());

create policy "propuestas: la lee la administración" on public.propuestas for select to authenticated using (public.es_admin());
create policy "propuestas: la decide la administración" on public.propuestas for update to authenticated
  using (public.es_admin()) with check (public.es_admin() and (resuelto_por is null or resuelto_por = auth.uid()));

create policy "configuracion: la lee la administración" on public.configuracion for select to authenticated using (public.es_admin());
create policy "configuracion: la escribe la administración" on public.configuracion for insert to authenticated with check (public.es_admin());
create policy "configuracion: la cambia la administración" on public.configuracion for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- ---------- registrar_ciudad_vista(slug): una consulta más, sin persona ----------
-- La llaman Inicio y Lugares desde el servidor, sin sesión, después de responder. Suma exactamente 1 por llamada (con un techo por día) y solo
-- a una ciudad que ya está en la tabla: nadie siembra ciudades inventadas por aquí. Devuelve si la contó; no lee ni guarda quién pregunta.
create function public.registrar_ciudad_vista(p_slug text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_zona text;
begin
  if p_slug is null or char_length(p_slug) > 80 then
    return false;
  end if;
  select c.zona into v_zona from public.ciudades c where c.slug = p_slug;
  if not found then
    return false;
  end if;
  insert into public.ciudades_vistas as v (ciudad, dia, consultas)
  values (p_slug, (now() at time zone v_zona)::date, 1)
  on conflict (ciudad, dia) do update set consultas = least(v.consultas + 1, 1000000);
  return true;
end $$;
revoke all on function public.registrar_ciudad_vista(text) from public;
grant execute on function public.registrar_ciudad_vista(text) to anon, authenticated, service_role;

-- ---------- panel_ciudades(): la pantalla de Ciudades, la de Corridas y el grupo de la portada ----------
-- Cada ciudad con sus consultas de los últimos 30 días (hoy incluido, en su zona); las últimas 300 corridas con lo que propusieron; el crédito.
create function public.panel_ciudades() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.es_admin() then
    raise exception 'solo la administración' using errcode = '42501';
  end if;
  return json_build_object(
    'ciudades', (
      select coalesce(json_agg(json_build_object(
        'slug', c.slug, 'nombre', c.nombre, 'estado', c.estado, 'lat', c.lat, 'lng', c.lng, 'zona', c.zona, 'creado_en', c.creado_en,
        'consultas', (select coalesce(sum(v.consultas), 0) from public.ciudades_vistas v
          where v.ciudad = c.slug and v.dia > (now() at time zone c.zona)::date - 30)
      ) order by c.nombre), '[]'::json)
      from public.ciudades c
    ),
    'corridas', (
      select coalesce(json_agg(x order by x.creado_en desc), '[]'::json)
      from (
        select r.id, r.tipo, r.ciudad, r.parametros, r.tope_usd, r.gasto_usd, r.estado, r.resumen, r.creado_en, r.inicio, r.fin,
          count(p.id)::int as propuestas,
          (count(p.id) filter (where p.estado = 'aceptada'))::int as aceptadas,
          (count(p.id) filter (where p.estado = 'rechazada'))::int as rechazadas,
          (count(p.id) filter (where p.estado = 'propuesta'))::int as por_revisar
        from public.rutinas_corridas r
        left join public.propuestas p on p.corrida_id = r.id
        group by r.id
        order by r.creado_en desc
        limit 300
      ) x
    ),
    'credito', json_build_object(
      'usd', (select k.valor from public.configuracion k where k.clave = 'credito_api_usd'),
      'vence', (select k.valor from public.configuracion k where k.clave = 'credito_api_vence'),
      'gastado', (select coalesce(sum(r.gasto_usd), 0) from public.rutinas_corridas r)
    )
  );
end $$;
revoke all on function public.panel_ciudades() from public, anon;
grant execute on function public.panel_ciudades() to authenticated, service_role;

-- ---------- panel_propuestas(corrida): la bandeja de una corrida ----------
-- Lo que queda por revisar, por fuente; y las fuentes que ya tuvieron una tanda aprobada en una corrida anterior del mismo tipo (solo en
-- ellas se ofrece «Aceptar las N de esta fuente»: la primera tanda va una por una, doc 57 §4.B).
create function public.panel_propuestas(p_corrida uuid) returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.rutinas_corridas%rowtype;
begin
  if auth.uid() is null or not public.es_admin() then
    raise exception 'solo la administración' using errcode = '42501';
  end if;
  select * into r from public.rutinas_corridas where id = p_corrida;
  if not found then
    return null;
  end if;
  return json_build_object(
    'corrida', (
      select json_build_object(
        'id', r.id, 'tipo', r.tipo, 'ciudad', r.ciudad, 'ciudad_nombre', c.nombre, 'estado', r.estado, 'creado_en', r.creado_en,
        'tope_usd', r.tope_usd, 'gasto_usd', r.gasto_usd,
        'propuestas', count(p.id)::int,
        'aceptadas', (count(p.id) filter (where p.estado = 'aceptada'))::int,
        'rechazadas', (count(p.id) filter (where p.estado = 'rechazada'))::int,
        'por_revisar', (count(p.id) filter (where p.estado = 'propuesta'))::int)
      from (select 1) uno
      left join public.ciudades c on c.slug = r.ciudad
      left join public.propuestas p on p.corrida_id = r.id
      group by c.nombre
    ),
    'propuestas', (
      select coalesce(json_agg(json_build_object(
        'id', p.id, 'tipo', p.tipo, 'fuente', p.fuente, 'datos', p.datos, 'creado_en', p.creado_en
      ) order by p.fuente, p.creado_en, p.id), '[]'::json)
      from (select * from public.propuestas where corrida_id = r.id and estado = 'propuesta' order by fuente, creado_en, id limit 500) p
    ),
    'fuentes_con_tanda', (
      select coalesce(json_agg(distinct p.fuente), '[]'::json)
      from public.propuestas p
      join public.rutinas_corridas o on o.id = p.corrida_id
      where p.estado = 'aceptada' and o.id <> r.id and o.creado_en < r.creado_en
        and p.fuente in (select q.fuente from public.propuestas q where q.corrida_id = r.id and q.estado = 'propuesta')
        and p.tipo in (select q.tipo from public.propuestas q where q.corrida_id = r.id)
    )
  );
end $$;
revoke all on function public.panel_propuestas(uuid) from public, anon;
grant execute on function public.panel_propuestas(uuid) to authenticated, service_role;

-- ---------- aceptar_propuesta(propuesta, ficha): crea la ficha y marca la propuesta, en una sola transacción ----------
-- `p_ficha` es la ficha ya validada por la app (validarLugar / validarArtista, con su zona): nombre, tipo, dirección, lat/lng, ciudad, redes…
-- Un lugar y un artista se crean con la cuenta que acepta como autora y sin `origen` (ese campo es del catálogo CAPO): la procedencia queda en
-- la propuesta (fuente, datos y ficha_id). Un evento queda aceptado sin ficha: lo publica la rutina de agendas por el camino del importador (OL-428).
-- Dos llamadas con la misma propuesta no crean dos fichas: la segunda devuelve lo que ya quedó.
create function public.aceptar_propuesta(p_propuesta uuid, p_ficha jsonb default '{}'::jsonb) returns json
language plpgsql volatile security definer set search_path = '' as $$
declare
  v public.propuestas%rowtype;
  v_id uuid;
  v_slug text;
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
  end if;
  update public.propuestas
  set estado = 'aceptada', ficha_id = v_id, motivo_rechazo = null, resuelto_por = auth.uid(), resuelto_en = now()
  where id = v.id;
  return json_build_object('estado', 'aceptada', 'ficha_id', v_id, 'slug', v_slug);
end $$;
revoke all on function public.aceptar_propuesta(uuid, jsonb) from public, anon;
grant execute on function public.aceptar_propuesta(uuid, jsonb) to authenticated, service_role;
