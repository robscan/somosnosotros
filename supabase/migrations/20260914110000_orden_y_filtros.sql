-- Filtros y orden en el servidor (revisión 2026-09-14, A2): la lista de artistas ya no viaja entera al navegador.
-- normalizar_nombre() es stable (usa unaccent), así que no sirve para una columna generada: se llena por trigger.

alter table public.artistas add column if not exists nombre_orden text;
alter table public.lugares add column if not exists nombre_orden text;

create or replace function public.poner_nombre_orden() returns trigger
language plpgsql as $$
begin
  new.nombre_orden := public.normalizar_nombre(new.nombre);
  return new;
end $$;

drop trigger if exists artistas_nombre_orden on public.artistas;
create trigger artistas_nombre_orden before insert or update of nombre on public.artistas
  for each row execute function public.poner_nombre_orden();
drop trigger if exists lugares_nombre_orden on public.lugares;
create trigger lugares_nombre_orden before insert or update of nombre on public.lugares
  for each row execute function public.poner_nombre_orden();

update public.artistas set nombre_orden = public.normalizar_nombre(nombre) where nombre_orden is null;
update public.lugares set nombre_orden = public.normalizar_nombre(nombre) where nombre_orden is null;

create index if not exists artistas_orden_idx on public.artistas (ciudad, nombre_orden) where visible;
create index if not exists lugares_orden_idx on public.lugares (ciudad, nombre_orden) where visible;

-- Chips de disciplina: cuántos artistas visibles hay de cada una (solo las que tienen alguien).
create or replace function public.disciplinas_con_artistas(p_ciudad text)
returns table (disciplina text, n bigint)
language sql stable security invoker set search_path = public as $$
  select disciplina, count(*) from public.artistas
  where visible and ciudad = p_ciudad
  group by disciplina;
$$;

-- Segundo nivel: los detalles (género, técnica) de una disciplina que comparten al menos p_minimo artistas.
create or replace function public.detalles_de_disciplina(p_ciudad text, p_disciplina text, p_minimo int default 3)
returns table (clave text, etiqueta text, n bigint)
language sql stable security invoker set search_path = public as $$
  select lower(detalle) as clave, min(detalle) as etiqueta, count(*) as n from public.artistas
  where visible and ciudad = p_ciudad and disciplina = p_disciplina and detalle is not null and detalle <> ''
  group by lower(detalle)
  having count(*) >= p_minimo
  order by count(*) desc, min(detalle);
$$;
