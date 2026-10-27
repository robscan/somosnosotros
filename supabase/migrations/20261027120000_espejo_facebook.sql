-- somosnosotros · OL-461 · migración 20261027120000 · espejo a Facebook y enlaces con marca de origen (bitácora 493)
-- Pedido del founder (2026-10-27): «cuando yo publique en Instagram ya se agregue también en Facebook y de esa manera espejear todas las
-- publicaciones»; «adelante con el espejo a Facebook».
--
-- SOLO AÑADE:
--   · `facebook_publicaciones`: cada intento de publicar en la página de Facebook de la marca lo que ya salió en Instagram (la publicación de
--     Instagram que espeja, el evento, el formato, lo que salió en Facebook o el error, quién y cuándo). Tabla hermana de
--     `instagram_publicaciones`, con sus mismas reglas: solo la administración lee y anota; nadie cambia ni borra lo anotado; quién y cuándo los
--     pone la base. Hermana y no columnas nuevas: lo anotado en Instagram no se cambia (no hay permiso de update) y un reintento es otra fila.
--   · `vistas_evento.origen` y `vistas_evento.medio`: de qué red llegó la vista (instagram | facebook) y desde qué (post | story), leído de la
--     marca de origen del enlace (`utm_source`, `utm_medium`). Sin datos personales: la fila sigue siendo una por visitante, evento y día.
--   · `contar_vista_evento_origen(p_evento, p_visitante, p_usuario, p_origen, p_medio)`: la de OL-459 con el origen (misma regla para contar).
--     Si ese día el visitante ya había entrado sin origen, se le pone; uno que ya tenía no se cambia. Solo `service_role`.
--   · `vistas_por_origen(p_dias)`: cuántas vistas llegaron de cada red en los últimos días (solo responde a la administración).
-- `contar_vista_evento` (OL-459) no cambia.
begin;

-- ---------- lo publicado en Facebook ----------
create table public.facebook_publicaciones (
  id uuid primary key default gen_random_uuid(),
  instagram_id uuid not null references public.instagram_publicaciones (id) on delete cascade,
  evento_id uuid not null references public.eventos (id) on delete cascade,
  formato text not null check (formato in ('4x5', '9x16')),
  estado text not null check (estado in ('publicada', 'error')),
  error text check (error in ('imagen', 'permiso', 'otro')),
  post_id text check (post_id ~ '^[0-9_]{1,80}$'),
  permalink text check (permalink ~ '^https://(www\.|m\.|web\.)?facebook\.com/' and char_length(permalink) <= 500),
  publicado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  constraint facebook_publicaciones_estado check (
    (estado = 'publicada' and error is null and post_id is not null) or (estado = 'error' and error is not null and post_id is null))
);
create index facebook_publicaciones_evento_idx on public.facebook_publicaciones (evento_id, creado_en desc);
create index facebook_publicaciones_instagram_idx on public.facebook_publicaciones (instagram_id);
create index facebook_publicaciones_creado_idx on public.facebook_publicaciones (creado_en desc);
comment on table public.facebook_publicaciones is 'Cada intento de espejar en la página de Facebook de la marca una publicación de Instagram (OL-461). Solo administración.';

create function public.facebook_publicaciones_registro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.publicado_por := coalesce(auth.uid(), new.publicado_por);
  new.creado_en := now();
  -- El evento y el formato son los de la publicación de Instagram que espeja, nunca otros.
  select ip.evento_id, ip.formato into new.evento_id, new.formato from public.instagram_publicaciones ip where ip.id = new.instagram_id;
  return new;
end $$;
create trigger facebook_publicaciones_registro before insert on public.facebook_publicaciones
  for each row execute function public.facebook_publicaciones_registro();
revoke execute on function public.facebook_publicaciones_registro() from public, anon, authenticated;
grant execute on function public.facebook_publicaciones_registro() to service_role;

alter table public.facebook_publicaciones enable row level security;
revoke all on public.facebook_publicaciones from public, anon, authenticated;
grant select, insert on public.facebook_publicaciones to authenticated;
grant all on public.facebook_publicaciones to service_role;
create policy "facebook_publicaciones: la administración lee" on public.facebook_publicaciones for select to authenticated
  using (public.es_admin());
-- Solo se espeja lo que salió en Instagram.
create policy "facebook_publicaciones: la administración anota" on public.facebook_publicaciones for insert to authenticated
  with check (public.es_admin() and exists (select 1 from public.instagram_publicaciones ip where ip.id = instagram_id and ip.estado = 'publicada'));

-- ---------- de qué red llegó una vista ----------
alter table public.vistas_evento
  add column origen text check (origen in ('instagram', 'facebook')),
  add column medio text check (medio in ('post', 'story')),
  add constraint vistas_evento_medio_con_origen check (medio is null or origen is not null);
comment on column public.vistas_evento.origen is 'OL-461: la red del enlace de la marca por el que llegó (utm_source). Sin datos personales.';
comment on column public.vistas_evento.medio is 'OL-461: publicación o historia (utm_medium).';

-- La misma regla que contar_vista_evento (OL-459), con el origen. Devuelve true si contó la vista (la primera del día de ese visitante).
create function public.contar_vista_evento_origen(p_evento uuid, p_visitante text, p_usuario uuid, p_origen text, p_medio text)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_autor uuid;
  v_zona text;
  v_dia date;
  v_sal text;
  v_clave text;
  v_origen text := case when p_origen in ('instagram', 'facebook') then p_origen end;
  v_medio text;
begin
  v_medio := case when v_origen is not null and p_medio in ('post', 'story') then p_medio end;
  if p_evento is null or p_visitante is null or p_visitante !~ '^[A-Za-z0-9_-]{16,64}$' then
    return false;
  end if;
  select e.creado_por, e.zona into v_autor, v_zona
  from public.eventos e
  left join public.lugares l on l.id = e.lugar_id
  where e.id = p_evento and e.visible and e.termina >= now() and (e.lugar_id is null or (l.visible and not l.privado));
  if not found then
    return false;
  end if;
  if p_usuario is not null and (p_usuario = v_autor or public.rol_en(p_usuario, now()) = 'admin') then
    return false;
  end if;
  v_dia := (now() at time zone coalesce(v_zona, 'America/Mexico_City'))::date;
  select s.sal into v_sal from public.vistas_sal s;
  v_clave := encode(sha256(convert_to(v_sal || ':' || p_visitante || ':' || p_evento::text || ':' || v_dia::text, 'UTF8')), 'hex');
  insert into public.vistas_evento (evento_id, dia, clave, origen, medio)
  values (p_evento, v_dia, v_clave, v_origen, v_medio)
  on conflict do nothing;
  if found then
    return true;
  end if;
  -- Ya había entrado hoy: no cuenta otra vez; si entonces llegó sin origen y ahora con uno, se anota de dónde.
  if v_origen is not null then
    update public.vistas_evento v set origen = v_origen, medio = v_medio
    where v.evento_id = p_evento and v.dia = v_dia and v.clave = v_clave and v.origen is null;
  end if;
  return false;
end;
$$;
comment on function public.contar_vista_evento_origen(uuid, text, uuid, text, text) is
  'OL-461: contar_vista_evento (OL-459) con la red y el medio del enlace por el que llegó (utm_source, utm_medium). Solo service_role.';
revoke all on function public.contar_vista_evento_origen(uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.contar_vista_evento_origen(uuid, text, uuid, text, text) to service_role;

-- Cuántas vistas llegaron de cada red y medio en los últimos días (1 a 90). Solo responde a la administración.
create function public.vistas_por_origen(p_dias integer)
returns table (origen text, medio text, vistas integer)
language sql stable security definer set search_path = '' as $$
  select v.origen, v.medio, count(*)::int
  from public.vistas_evento v
  where public.es_admin() and v.origen is not null
    and v.dia >= (now() at time zone 'America/Mexico_City')::date - greatest(least(coalesce(p_dias, 30), 90), 1)
  group by v.origen, v.medio
  order by 3 desc, 1, 2;
$$;
revoke all on function public.vistas_por_origen(integer) from public, anon;
grant execute on function public.vistas_por_origen(integer) to authenticated, service_role;

commit;
