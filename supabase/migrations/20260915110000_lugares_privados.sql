-- somosnosotros · migración 0018 · lugares privados del administrador
-- Un lugar privado es un mapeo personal del administrador (p. ej. casas abandonadas del Centro para huertos):
-- no es un lugar oculto por castigo. Solo lo ve quien lo registró (y el administrador); no sale en el mapa,
-- la lista, la búsqueda ni en los avisos de duplicado para nadie más. Solo el administrador puede marcarlo.
alter table public.lugares add column privado boolean not null default false;
comment on column public.lugares.privado is 'Mapeo personal del administrador: solo lo ve su autor y el admin. No es un lugar oculto por castigo.';

drop policy "lugares: lectura" on public.lugares;
create policy "lugares: lectura" on public.lugares for select
  using ((visible and not privado) or creado_por = auth.uid() or public.es_admin());

drop policy "lugares: alta con sesión" on public.lugares;
create policy "lugares: alta con sesión" on public.lugares for insert to authenticated
  with check (creado_por = auth.uid() and (not privado or public.es_admin()));

drop policy "lugares: edita autor o admin" on public.lugares;
create policy "lugares: edita autor o admin" on public.lugares for update to authenticated
  using (creado_por = auth.uid() or public.es_admin())
  with check ((creado_por = auth.uid() or public.es_admin()) and (not privado or public.es_admin()));

-- Los avisos de duplicado ("¿es este?", "ya está registrado") no revelan lugares privados.
create or replace function public.lugares_parecidos(p_nombre text, p_lat double precision, p_lng double precision, p_excluir uuid default null)
returns setof public.lugares
language sql stable as $$
  select l.* from public.lugares l
  where l.visible and not l.privado
    and (p_excluir is null or l.id <> p_excluir)
    and public.normalizar_nombre(l.nombre) = public.normalizar_nombre(p_nombre)
    and public.distancia_m(l.lat, l.lng, p_lat, p_lng) < 150
  order by public.distancia_m(l.lat, l.lng, p_lat, p_lng);
$$;

create or replace function public.lugares_con_nombre(p_nombre text)
returns setof public.lugares
language sql stable as $$
  select l.* from public.lugares l
  where l.visible and not l.privado
    and char_length(public.normalizar_nombre(p_nombre)) >= 4
    and public.normalizar_nombre(l.nombre) like '%' || public.normalizar_nombre(p_nombre) || '%'
  order by l.nombre
  limit 5;
$$;
