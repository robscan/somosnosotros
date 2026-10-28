-- somosnosotros · OL-458 · migración 20261023140000 · publicar en Instagram desde Administración
-- Lo firmado por el founder el 23 de octubre (prototipo `docs/rediseno/prototipos/admin-instagram.html`, bitácora 490): la cuenta de la marca
-- (@smsnstrsapp) publica eventos desde Administración, uno a la vez; solo eventos por venir (y exposiciones, festivales y talleres en curso
-- mientras les queden días); la ubicación de la publicación se guarda a mano una vez por ciudad (y, si se quiere, por lugar).
--
-- SOLO AÑADE:
--   · `instagram_publicaciones`: cada intento de publicar (evento, formato, lo que salió en Instagram o el error, quién y cuándo). Solo la
--     administración lee y escribe; quién y cuándo los pone la base.
--   · `instagram_ubicaciones`: el id de la página de Facebook que Instagram usa como ubicación, por ciudad (su slug) o por lugar (su id).
--     Solo la administración.
--   · `instagram_sugerencias(p_ciudad, p_dias)`: los eventos que se pueden publicar en una ciudad (null: todas) en los próximos días, con sus
--     «Voy», «Me interesa», si está destacado, su lugar y su última publicación. Solo la administración (definer, que lo comprueba).

-- ---------- lo publicado ----------
create table public.instagram_publicaciones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  formato text not null check (formato in ('4x5', '9x16')),
  estado text not null check (estado in ('publicada', 'error')),
  error text check (error in ('cupo', 'imagen', 'permiso', 'empezo', 'otro')),
  media_id text check (media_id ~ '^[0-9]{1,40}$'),
  permalink text check (permalink ~ '^https://(www\.)?instagram\.com/'),
  imagen text check (char_length(imagen) <= 500),
  etiquetas text[] not null default '{}' check (cardinality(etiquetas) <= 20),
  ubicacion text check (ubicacion ~ '^[0-9]{1,40}$'),
  publicado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  constraint instagram_publicaciones_estado check (
    (estado = 'publicada' and error is null and media_id is not null) or (estado = 'error' and error is not null and media_id is null))
);
create index instagram_publicaciones_evento_idx on public.instagram_publicaciones (evento_id, creado_en desc);
create index instagram_publicaciones_creado_idx on public.instagram_publicaciones (creado_en desc);
comment on table public.instagram_publicaciones is 'Cada intento de publicar un evento en la cuenta de Instagram de la marca (OL-458). Solo administración.';

create function public.instagram_publicaciones_registro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.publicado_por := coalesce(auth.uid(), new.publicado_por);
  new.creado_en := now();
  return new;
end $$;
create trigger instagram_publicaciones_registro before insert on public.instagram_publicaciones
  for each row execute function public.instagram_publicaciones_registro();
revoke execute on function public.instagram_publicaciones_registro() from public, anon, authenticated;
grant execute on function public.instagram_publicaciones_registro() to service_role;

alter table public.instagram_publicaciones enable row level security;
revoke all on public.instagram_publicaciones from public, anon, authenticated;
grant select, insert on public.instagram_publicaciones to authenticated;
grant all on public.instagram_publicaciones to service_role;
create policy "instagram_publicaciones: la administración lee" on public.instagram_publicaciones for select to authenticated
  using (public.es_admin());
create policy "instagram_publicaciones: la administración anota" on public.instagram_publicaciones for insert to authenticated
  with check (public.es_admin());

-- ---------- la ubicación de Instagram, por ciudad o por lugar ----------
create table public.instagram_ubicaciones (
  tipo text not null check (tipo in ('ciudad', 'lugar')),
  clave text not null check (char_length(clave) between 1 and 80),
  pagina_id text not null check (pagina_id ~ '^[0-9]{5,40}$'),
  nombre text check (char_length(nombre) <= 120),
  enlace text check (char_length(enlace) <= 300),
  actualizado_por uuid references public.perfiles (id) on delete set null,
  actualizado_en timestamptz not null default now(),
  primary key (tipo, clave)
);
comment on table public.instagram_ubicaciones is 'El id de la página de Facebook que Instagram usa como ubicación (OL-458): de una ciudad (clave = su slug) o de un lugar (clave = su id). Se pega a mano una vez.';

create function public.instagram_ubicaciones_registro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.actualizado_por := coalesce(auth.uid(), new.actualizado_por);
  new.actualizado_en := now();
  return new;
end $$;
create trigger instagram_ubicaciones_registro before insert or update on public.instagram_ubicaciones
  for each row execute function public.instagram_ubicaciones_registro();
revoke execute on function public.instagram_ubicaciones_registro() from public, anon, authenticated;
grant execute on function public.instagram_ubicaciones_registro() to service_role;

alter table public.instagram_ubicaciones enable row level security;
revoke all on public.instagram_ubicaciones from public, anon, authenticated;
grant select, insert, update, delete on public.instagram_ubicaciones to authenticated;
grant all on public.instagram_ubicaciones to service_role;
create policy "instagram_ubicaciones: solo la administración" on public.instagram_ubicaciones for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ---------- lo que se puede publicar ----------
-- Por venir: empieza después de ahora y dentro de `p_dias`. En curso: una exposición o un festival que ya abrió y termina después de hoy (en su
-- zona), o un taller con una sesión por delante. Nunca lo oculto, lo cancelado, lo retirado ni un borrador.
create function public.instagram_sugerencias(p_ciudad text, p_dias integer)
returns table (
  id uuid, slug text, titulo text, inicio timestamptz, fin timestamptz, termina timestamptz, zona text, clase text, imagen text, precio text,
  ciudad text, ciudad_nombre text, lugar_id uuid, lugar_nombre text, lugar_redes jsonb, sitio_texto text,
  van integer, interesa integer, destacado boolean, publicado_en timestamptz, publicado_formato text
)
language sql stable security definer set search_path = '' as $$
  select e.id, e.slug, e.titulo, e.inicio, e.fin, e.termina, e.zona, e.clase, e.imagen, e.precio,
    public.ciudad_slug(e.ciudad), e.ciudad, e.lugar_id, l.nombre, coalesce(l.redes, '[]'::jsonb), e.sitio_texto,
    (select count(*) from public.asistencias a where a.evento_id = e.id and a.estado = 'voy')::int,
    (select count(*) from public.asistencias a where a.evento_id = e.id and a.estado = 'me_interesa')::int,
    exists (select 1 from public.destacados d where d.evento_id = e.id and not d.quitado),
    p.creado_en, p.formato
  from public.eventos e
  left join public.lugares l on l.id = e.lugar_id
  left join lateral (
    select ip.creado_en, ip.formato from public.instagram_publicaciones ip
    where ip.evento_id = e.id and ip.estado = 'publicada' order by ip.creado_en desc limit 1
  ) p on true
  where public.es_admin()
    and e.visible and not e.borrador and not e.retirado_por_admin and not e.cancelado
    and (p_ciudad is null or public.ciudad_slug(e.ciudad) = p_ciudad)
    and (
      (e.inicio > now() and e.inicio <= now() + make_interval(days => greatest(least(coalesce(p_dias, 7), 31), 1)))
      or (e.inicio <= now() and e.clase in ('exposicion', 'festival')
        and e.termina > ((date_trunc('day', now() at time zone e.zona) + interval '1 day') at time zone e.zona))
      or (e.inicio <= now() and e.clase = 'taller'
        and exists (select 1 from public.eventos_sesiones s where s.evento_id = e.id and s.inicio > now()))
    )
  order by e.inicio, e.id
  limit 300;
$$;
revoke all on function public.instagram_sugerencias(text, integer) from public, anon;
grant execute on function public.instagram_sugerencias(text, integer) to authenticated, service_role;
