-- somosnosotros · OL-447 (bitácora 479) · asignar desde Administración una ficha de lugar o de artista a una persona
-- Hasta hoy una cuenta llegaba a llevar una ficha reclamándola («Soy yo / es mi grupo», «¿Es tu espacio?») y la administración aprobaba el
-- reclamo. El founder (2026-10-22): «si un usuario entró hoy, que yo le pueda asignar un lugar o un artista para que lo administre».
-- Asignar escribe la misma liga que un reclamo aprobado (`lugares_cuentas` / `artistas_cuentas`): desde ahí la persona edita la ficha por
-- `gestiona_lugar` / `gestiona_artista`, como siempre. El modelo admite varias cuentas por ficha (llave primaria compuesta), así que asignar
-- AGREGA: si otra persona ya la administra, la sigue administrando. No cambia la autoría (`creado_por`): eso sigue siendo cosa del reclamo.
-- Solo añade: una tabla de registro (quién asignó o quitó qué, a quién y cuándo) y tres funciones que exigen `es_admin()`.

-- ---------- el registro ----------
create table public.fichas_asignaciones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('lugar', 'artista')),
  -- Sin llave foránea: si la ficha se borra, el registro de quién la llevó se queda.
  ficha_id uuid not null,
  -- Con la cuenta se va su registro (borrar la cuenta borra lo suyo).
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  accion text not null check (accion in ('asignar', 'quitar')),
  hecho_por uuid references public.perfiles (id) on delete set null,
  hecho_en timestamptz not null default now()
);
create index fichas_asignaciones_perfil_idx on public.fichas_asignaciones (perfil_id, hecho_en desc);
create index fichas_asignaciones_ficha_idx on public.fichas_asignaciones (tipo, ficha_id, hecho_en desc);
create index fichas_asignaciones_hecho_por_idx on public.fichas_asignaciones (hecho_por);

alter table public.fichas_asignaciones enable row level security;
revoke all on public.fichas_asignaciones from anon, authenticated;
grant select on public.fichas_asignaciones to authenticated;
-- Lo lee la administración; nadie escribe directo: solo las funciones de abajo.
create policy "fichas_asignaciones: lee la administración" on public.fichas_asignaciones for select to authenticated
  using (public.es_admin());

-- ---------- buscar fichas para asignar ----------
-- Lugares y artistas a la vez, por nombre (sin acentos ni mayúsculas). De cada una: su ciudad, su tipo o disciplina, si esta persona ya la
-- administra y quién más la administra. Los lugares privados (el mapeo personal de la administración) no se asignan: no salen.
create function public.admin_buscar_fichas(p_buscar text, p_perfil uuid, p_limite integer default 20)
returns table (tipo text, id uuid, nombre text, foto text, ciudad text, clase text, detalle text, visible boolean, suya boolean, otros text, otros_n integer)
language sql stable security definer set search_path = '' as $$
  with q as (select public.normalizar_nombre(p_buscar) as n),
  fichas as (
    select 'lugar'::text as tipo, l.id, l.nombre, l.portada as foto, l.ciudad, l.tipo as clase, l.detalle, l.visible,
      exists (select 1 from public.lugares_cuentas c where c.lugar_id = l.id and c.perfil_id = p_perfil) as suya,
      (select p.nombre from public.lugares_cuentas c join public.perfiles p on p.id = c.perfil_id
        where c.lugar_id = l.id and c.perfil_id <> p_perfil order by c.creado_en, p.id limit 1) as otros,
      (select count(*) from public.lugares_cuentas c where c.lugar_id = l.id and c.perfil_id <> p_perfil)::int as otros_n,
      public.normalizar_nombre(l.nombre) as nn
    from public.lugares l
    where not l.privado
    union all
    select 'artista', a.id, a.nombre, a.foto, a.ciudad, a.disciplina, a.detalle, a.visible,
      exists (select 1 from public.artistas_cuentas c where c.artista_id = a.id and c.perfil_id = p_perfil),
      (select p.nombre from public.artistas_cuentas c join public.perfiles p on p.id = c.perfil_id
        where c.artista_id = a.id and c.perfil_id <> p_perfil order by c.creado_en, p.id limit 1),
      (select count(*) from public.artistas_cuentas c where c.artista_id = a.id and c.perfil_id <> p_perfil)::int,
      public.normalizar_nombre(a.nombre)
    from public.artistas a
  )
  select f.tipo, f.id, f.nombre, f.foto, f.ciudad, f.clase, f.detalle, f.visible, f.suya, f.otros, f.otros_n
  from fichas f, q
  where public.es_admin() and q.n <> '' and f.nn like '%' || q.n || '%'
  -- Primero lo que empieza como lo escrito; luego por nombre.
  order by (f.nn like q.n || '%') desc, f.nombre, f.id
  limit greatest(least(coalesce(p_limite, 20), 50), 1);
$$;

-- ---------- asignar ----------
-- Devuelve: 'ok', 'ya' (ya la administraba), 'no_admin', 'sin_persona', 'sin_ficha'.
create function public.admin_asignar_ficha(p_tipo text, p_ficha uuid, p_perfil uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  hecho boolean;
begin
  if not public.es_admin() then return 'no_admin'; end if;
  if not exists (select 1 from public.perfiles where id = p_perfil) then return 'sin_persona'; end if;
  if p_tipo = 'lugar' then
    if not exists (select 1 from public.lugares where id = p_ficha and not privado) then return 'sin_ficha'; end if;
    insert into public.lugares_cuentas (lugar_id, perfil_id) values (p_ficha, p_perfil) on conflict do nothing;
    hecho := found;
  elsif p_tipo = 'artista' then
    if not exists (select 1 from public.artistas where id = p_ficha) then return 'sin_ficha'; end if;
    insert into public.artistas_cuentas (artista_id, perfil_id) values (p_ficha, p_perfil) on conflict do nothing;
    hecho := found;
  else
    return 'sin_ficha';
  end if;
  if not hecho then return 'ya'; end if;
  insert into public.fichas_asignaciones (tipo, ficha_id, perfil_id, accion, hecho_por) values (p_tipo, p_ficha, p_perfil, 'asignar', auth.uid());
  return 'ok';
end $$;

-- ---------- quitar ----------
-- Devuelve: 'ok', 'no_estaba', 'no_admin', 'sin_ficha'. Quitar solo deshace la liga: la ficha y lo que la persona publicó se quedan.
create function public.admin_quitar_ficha(p_tipo text, p_ficha uuid, p_perfil uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  hecho boolean;
begin
  if not public.es_admin() then return 'no_admin'; end if;
  if p_tipo = 'lugar' then
    delete from public.lugares_cuentas where lugar_id = p_ficha and perfil_id = p_perfil;
    hecho := found;
  elsif p_tipo = 'artista' then
    delete from public.artistas_cuentas where artista_id = p_ficha and perfil_id = p_perfil;
    hecho := found;
  else
    return 'sin_ficha';
  end if;
  if not hecho then return 'no_estaba'; end if;
  insert into public.fichas_asignaciones (tipo, ficha_id, perfil_id, accion, hecho_por) values (p_tipo, p_ficha, p_perfil, 'quitar', auth.uid());
  return 'ok';
end $$;

revoke all on function public.admin_buscar_fichas(text, uuid, integer) from public, anon;
revoke all on function public.admin_asignar_ficha(text, uuid, uuid) from public, anon;
revoke all on function public.admin_quitar_ficha(text, uuid, uuid) from public, anon;
grant execute on function public.admin_buscar_fichas(text, uuid, integer) to authenticated;
grant execute on function public.admin_asignar_ficha(text, uuid, uuid) to authenticated;
grant execute on function public.admin_quitar_ficha(text, uuid, uuid) to authenticated;
