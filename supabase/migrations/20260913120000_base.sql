-- somosnosotros · migración 0001 · base
-- 5 tablas del modelo (docs/PLAN.md), permisos por fila (RLS), perfil automático al registrarse,
-- borrar mi cuenta, y el espacio de fotos. Se aplica con: npx supabase db push --db-url "$POSTGRES_URL_NON_POOLING"

-- ---------- tablas ----------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '' check (char_length(nombre) <= 60),
  foto text,
  colonia text check (char_length(colonia) <= 60),
  bio text check (char_length(bio) <= 140),
  rol text not null default 'usuario' check (rol in ('admin', 'usuario')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table public.perfiles is 'Una fila por usuario registrado. El correo vive solo en auth.users.';

create table public.lugares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 120),
  tipo text not null check (tipo in ('casa_de_cultura', 'foro', 'galeria', 'colectivo', 'biblioteca', 'otro')),
  descripcion text check (char_length(descripcion) <= 600),
  direccion text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  ciudad text not null default 'San Luis Potosí',
  redes jsonb not null default '{}'::jsonb,
  portada text,
  creado_por uuid references public.perfiles (id) on delete set null,
  visible boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index lugares_ciudad_idx on public.lugares (ciudad) where visible;

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  lugar_id uuid not null references public.lugares (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 120),
  inicio timestamptz not null,
  fin timestamptz check (fin is null or fin > inicio),
  descripcion text check (char_length(descripcion) <= 1000),
  imagen text,
  precio text check (precio is null or char_length(precio) <= 60),
  enlace text,
  creado_por uuid references public.perfiles (id) on delete set null,
  visible boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index eventos_inicio_idx on public.eventos (inicio) where visible;
create index eventos_lugar_idx on public.eventos (lugar_id);
comment on column public.eventos.precio is 'Vacío = gratis.';

create table public.seguimientos (
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  lugar_id uuid not null references public.lugares (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (usuario_id, lugar_id)
);

create table public.asistencias (
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  evento_id uuid not null references public.eventos (id) on delete cascade,
  estado text not null check (estado in ('voy', 'me_interesa')),
  creado_en timestamptz not null default now(),
  primary key (usuario_id, evento_id)
);

-- Correos que nacen como administrador. Sin políticas: ningún cliente la lee; solo el trigger.
create table public.admin_correos (
  correo text primary key
);

-- ---------- actualizado_en ----------
create function public.tocar_actualizado_en() returns trigger
language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end $$;
create trigger perfiles_tocar before update on public.perfiles for each row execute function public.tocar_actualizado_en();
create trigger lugares_tocar before update on public.lugares for each row execute function public.tocar_actualizado_en();
create trigger eventos_tocar before update on public.eventos for each row execute function public.tocar_actualizado_en();

-- ---------- perfil automático al registrarse ----------
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, foto, rol)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), ''), 60),
    new.raw_user_meta_data ->> 'avatar_url',
    case when exists (select 1 from public.admin_correos where lower(correo) = lower(new.email)) then 'admin' else 'usuario' end
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger al_crear_usuario after insert on auth.users for each row execute function public.crear_perfil();

-- ---------- ¿soy admin? (para las políticas) ----------
create function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

-- ---------- borrar mi cuenta ----------
-- Borra el usuario de auth; perfiles, seguimientos y asistencias caen en cascada;
-- lugares y eventos que creó se quedan sin autor (creado_por = null), no se pierden.
create function public.borrar_mi_cuenta() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'sin sesión';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.borrar_mi_cuenta() from public, anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;

-- ---------- permisos por fila ----------
alter table public.perfiles enable row level security;
alter table public.lugares enable row level security;
alter table public.eventos enable row level security;
alter table public.seguimientos enable row level security;
alter table public.asistencias enable row level security;
alter table public.admin_correos enable row level security;

-- perfiles: nombre y foto son públicos (aparecen en "quién va"); cada quien edita el suyo; el admin todos.
create policy "perfiles: lectura pública" on public.perfiles for select using (true);
create policy "perfiles: edito el mío o soy admin" on public.perfiles for update
  using (auth.uid() = id or public.es_admin()) with check (auth.uid() = id or public.es_admin());

-- lugares y eventos: lo visible lo ve todo el mundo; lo oculto solo su autor y el admin;
-- escribe quien tiene sesión; edita/borra su autor o el admin.
create policy "lugares: lectura" on public.lugares for select
  using (visible or creado_por = auth.uid() or public.es_admin());
create policy "lugares: alta con sesión" on public.lugares for insert to authenticated
  with check (creado_por = auth.uid());
create policy "lugares: edita autor o admin" on public.lugares for update to authenticated
  using (creado_por = auth.uid() or public.es_admin()) with check (creado_por = auth.uid() or public.es_admin());
create policy "lugares: borra autor o admin" on public.lugares for delete to authenticated
  using (creado_por = auth.uid() or public.es_admin());

create policy "eventos: lectura" on public.eventos for select
  using (visible or creado_por = auth.uid() or public.es_admin());
create policy "eventos: alta con sesión" on public.eventos for insert to authenticated
  with check (creado_por = auth.uid());
create policy "eventos: edita autor o admin" on public.eventos for update to authenticated
  using (creado_por = auth.uid() or public.es_admin()) with check (creado_por = auth.uid() or public.es_admin());
create policy "eventos: borra autor o admin" on public.eventos for delete to authenticated
  using (creado_por = auth.uid() or public.es_admin());

-- seguir lugares y decir "voy": se ve públicamente (es la forma de conocer gente); cada quien maneja lo suyo.
create policy "seguimientos: lectura pública" on public.seguimientos for select using (true);
create policy "seguimientos: los míos" on public.seguimientos for insert to authenticated with check (usuario_id = auth.uid());
create policy "seguimientos: borro los míos" on public.seguimientos for delete to authenticated using (usuario_id = auth.uid());

create policy "asistencias: lectura pública" on public.asistencias for select using (true);
create policy "asistencias: las mías" on public.asistencias for insert to authenticated with check (usuario_id = auth.uid());
create policy "asistencias: cambio las mías" on public.asistencias for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "asistencias: borro las mías" on public.asistencias for delete to authenticated using (usuario_id = auth.uid());

-- ---------- fotos (Storage) ----------
-- Un solo espacio público "fotos". Cada quien escribe solo en su carpeta: perfiles/<mi id>/…
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "fotos: lectura pública" on storage.objects for select using (bucket_id = 'fotos');
create policy "fotos: subo a mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = 'perfiles' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "fotos: cambio las de mi carpeta" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = 'perfiles' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "fotos: borro las de mi carpeta" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = 'perfiles' and (storage.foldername(name))[2] = auth.uid()::text);
