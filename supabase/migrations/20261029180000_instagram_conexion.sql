-- OL-471 (bitácora 503): «Conectar Instagram» en Administración. La app consigue sola el token de la página de Facebook ligada a @smsnstrsapp
-- (inicio de sesión de Meta → /api/instagram/vuelta) y lo guarda en Vault, en vez de pegarlo a mano en Vercel (`INSTAGRAM_TOKEN`, que queda de
-- respaldo). Solo añade:
--   · `instagram_conexion`: una sola fila con el estado de la conexión, SIN el token (página, cuenta de Instagram, permisos, cuándo y quién
--     conectó). La lee la administración (RLS); nadie la escribe desde la app: solo `instagram_guardar_conexion`.
--   · `instagram_guardar_conexion(…)`: solo la llave de servicio (la vuelta del inicio de sesión, en el servidor). Escribe el token en Vault bajo
--     el nombre `instagram_token` (`vault.create_secret` la primera vez, `vault.update_secret` las siguientes) y el estado en la tabla, en la
--     misma transacción. Sin Vault no guarda nada y lo dice (55000).
--   · `instagram_token()`: solo la llave de servicio. Devuelve el token de Vault (o null si no hay o no hay Vault); `src/lib/instagram/token.ts`
--     lo usa y, si es null, cae en `INSTAGRAM_TOKEN`.
-- Vault se llama con SQL dinámico (como `rutinas_latido`, OL-444): el banco local no tiene la extensión y la migración tiene que aplicarse igual.
begin;

create table public.instagram_conexion (
  id smallint primary key default 1 check (id = 1),
  pagina_id text not null check (pagina_id ~ '^[0-9]{1,40}$'),
  pagina_nombre text not null check (char_length(pagina_nombre) between 1 and 200),
  instagram_id text not null check (instagram_id ~ '^[0-9]{1,40}$'),
  instagram_usuario text check (instagram_usuario is null or instagram_usuario ~ '^[A-Za-z0-9._]{1,30}$'),
  -- Los permisos que la cuenta concedió al conectar (`/me/permissions`, estado `granted`).
  permisos text[] not null default '{}' check (cardinality(permisos) <= 60),
  conectado_por uuid references public.perfiles (id) on delete set null,
  conectado_en timestamptz not null default now()
);
comment on table public.instagram_conexion is 'OL-471: el estado de la conexión con Instagram (sin el token, que vive en Vault como instagram_token). Una fila; la lee la administración; la escribe instagram_guardar_conexion.';

alter table public.instagram_conexion enable row level security;
revoke all on public.instagram_conexion from public, anon, authenticated, service_role;
grant select on public.instagram_conexion to authenticated, service_role;
create policy "instagram_conexion: la administración lee" on public.instagram_conexion for select to authenticated
  using (public.es_admin());

-- ---------- guardar la conexión (token en Vault + estado) ----------
create function public.instagram_guardar_conexion(
  p_token text,
  p_pagina_id text,
  p_pagina_nombre text,
  p_instagram_id text,
  p_instagram_usuario text,
  p_permisos text[],
  p_conectado_por uuid
) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_token is null or char_length(p_token) not between 20 and 2000 or p_token ~ '\s' then
    raise exception 'Token inválido.' using errcode = '22023';
  end if;
  if p_conectado_por is null or not exists (select 1 from public.perfiles p where p.id = p_conectado_por and p.rol = 'admin') then
    raise exception 'Solo la administración conecta Instagram.' using errcode = '42501';
  end if;
  if to_regnamespace('vault') is null
     or to_regclass('vault.secrets') is null
     or not exists (select 1 from pg_catalog.pg_proc f where f.pronamespace = to_regnamespace('vault') and f.proname = 'create_secret')
     or not exists (select 1 from pg_catalog.pg_proc f where f.pronamespace = to_regnamespace('vault') and f.proname = 'update_secret') then
    raise exception 'Falta Vault: no se guarda la conexión.' using errcode = '55000';
  end if;
  -- Dos vueltas a la vez (dos pestañas) no crean dos secretos con el mismo nombre.
  perform pg_advisory_xact_lock(hashtextextended('instagram_guardar_conexion', 471));
  execute 'select s.id from vault.secrets s where s.name = $1 limit 1' into v_id using 'instagram_token';
  if v_id is null then
    execute 'select vault.create_secret($1, $2, $3)' using p_token, 'instagram_token', 'OL-471: token de la página de Facebook para Instagram (Conectar Instagram)';
  else
    execute 'select vault.update_secret($1, $2)' using v_id, p_token;
  end if;
  insert into public.instagram_conexion as c (id, pagina_id, pagina_nombre, instagram_id, instagram_usuario, permisos, conectado_por, conectado_en)
  values (1, p_pagina_id, p_pagina_nombre, p_instagram_id, nullif(p_instagram_usuario, ''), coalesce(p_permisos, '{}'), p_conectado_por, now())
  on conflict (id) do update set
    pagina_id = excluded.pagina_id,
    pagina_nombre = excluded.pagina_nombre,
    instagram_id = excluded.instagram_id,
    instagram_usuario = excluded.instagram_usuario,
    permisos = excluded.permisos,
    conectado_por = excluded.conectado_por,
    conectado_en = excluded.conectado_en;
end $$;
revoke all on function public.instagram_guardar_conexion(text, text, text, text, text, text[], uuid) from public, anon, authenticated;
grant execute on function public.instagram_guardar_conexion(text, text, text, text, text, text[], uuid) to service_role;
comment on function public.instagram_guardar_conexion(text, text, text, text, text, text[], uuid) is 'OL-471: guarda el token de Instagram en Vault (instagram_token) y el estado sin token en instagram_conexion. Solo la llave de servicio.';

-- ---------- leer el token ----------
create function public.instagram_token() returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_token text;
begin
  if to_regclass('vault.decrypted_secrets') is null then
    return null;
  end if;
  execute 'select s.decrypted_secret from vault.decrypted_secrets s where s.name = $1 limit 1' into v_token using 'instagram_token';
  return nullif(v_token, '');
end $$;
revoke all on function public.instagram_token() from public, anon, authenticated;
grant execute on function public.instagram_token() to service_role;
comment on function public.instagram_token() is 'OL-471: el token de Instagram guardado en Vault (null si no hay). Solo la llave de servicio.';

commit;
