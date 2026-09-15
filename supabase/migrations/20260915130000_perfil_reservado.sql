-- somosnosotros · migración 0020 · perfil reservado
-- La persona decide si su ficha es pública (default) o reservada: con reserva, a qué va y qué sigue solo lo ven ella
-- y el administrador; en "quién va" cuenta en el número pero sin nombre ni foto (decisión del founder, 2026-09-15).
alter table public.perfiles add column reservado boolean not null default false;
comment on column public.perfiles.reservado is 'Perfil reservado: sus asistencias y seguimientos solo los ve la propia persona (y el admin).';

drop policy "asistencias: lectura pública" on public.asistencias;
create policy "asistencias: lectura" on public.asistencias for select
  using (usuario_id = auth.uid() or public.es_admin() or not exists (select 1 from public.perfiles p where p.id = asistencias.usuario_id and p.reservado));

drop policy "seguimientos: lectura pública" on public.seguimientos;
create policy "seguimientos: lectura" on public.seguimientos for select
  using (usuario_id = auth.uid() or public.es_admin() or not exists (select 1 from public.perfiles p where p.id = seguimientos.usuario_id and p.reservado));

-- Los conteos siguen contando a todos (también a los reservados): funciones que leen sin la política.
create or replace function public.van_por_evento(ids uuid[])
returns table (evento_id uuid, n bigint)
language sql stable security definer set search_path = public as $$
  select evento_id, count(*) from public.asistencias
  where estado = 'voy' and evento_id = any(ids)
  group by evento_id;
$$;

create or replace function public.cuenta_seguidores(p_lugar uuid default null, p_artista uuid default null)
returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from public.seguimientos
  where (p_lugar is not null and lugar_id = p_lugar) or (p_artista is not null and artista_id = p_artista);
$$;
