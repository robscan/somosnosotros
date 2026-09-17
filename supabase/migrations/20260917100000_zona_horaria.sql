-- somosnosotros · migración 0029 · lugares y eventos de cualquier país: la zona horaria de cada uno
-- Hasta hoy la app leía y mostraba todas las horas con el reloj de la Ciudad de México. El contexto ordena, no limita
-- (founder, 2026-09-16): cada lugar y cada evento guarda la zona horaria de donde está, con su nombre IANA
-- ("Europe/Madrid"). La pone la app al guardar, a partir del punto en el mapa (src/lib/zona.ts).
-- Lo que ya existe queda en la zona de la Ciudad de México, que es la de San Luis Potosí.

-- ---------- ¿es una zona? ----------
-- Área y ciudad, como la da el mapa de zonas ("America/Mexico_City", "America/Argentina/Cordoba"), y que la base la
-- reconozca. Sin abreviaturas ("CST") ni variantes que el teléfono no entiende ("posix/…"). La misma forma que
-- `zonaSegura` en src/lib/fechas.ts.
create function public.zona_valida(p_zona text) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if p_zona is null or p_zona !~ '^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc)/[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)?$' then
    return false;
  end if;
  perform pg_catalog.timezone(p_zona, timestamptz '2000-01-01 00:00+00');
  return true;
exception when others then
  return false;
end;
$$;

-- ---------- la zona de cada lugar y cada evento ----------
alter table public.lugares add column zona text not null default 'America/Mexico_City'
  constraint lugares_zona_valida check (public.zona_valida(zona));
comment on column public.lugares.zona is 'Zona horaria (IANA) de donde está el lugar. La pone la app al guardar, desde su punto.';

alter table public.eventos add column zona text not null default 'America/Mexico_City'
  constraint eventos_zona_valida check (public.zona_valida(zona));
comment on column public.eventos.zona is 'Zona horaria (IANA) del evento: la de su lugar o la del punto de su sitio. Las horas se leen y se muestran en ella.';

-- Un evento en un lugar tiene la zona del lugar, aunque quien lo guarda mande otra. Definer: el lugar puede no ser
-- visible para quien publica (privado u oculto) y aun así la zona tiene que ser la suya.
create function public.eventos_zona_del_lugar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.lugar_id is not null then
    new.zona := coalesce((select l.zona from public.lugares l where l.id = new.lugar_id), new.zona);
  end if;
  return new;
end;
$$;
create trigger eventos_zona_del_lugar before insert or update of lugar_id, zona on public.eventos
  for each row execute function public.eventos_zona_del_lugar();

-- Si el lugar cambia de zona (se corrigió su punto), sus eventos cambian con él, sean de quien sean.
create function public.lugares_zona_a_sus_eventos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.eventos set zona = new.zona where lugar_id = new.id and zona <> new.zona;
  return null;
end;
$$;
create trigger lugares_zona_a_sus_eventos after update of zona on public.lugares
  for each row when (old.zona is distinct from new.zona) execute function public.lugares_zona_a_sus_eventos();

-- ---------- cuándo deja de verse un evento ----------
-- Con hora de fin, al terminar; sin ella, al acabar su día en su zona (pedido del founder, 2026-09-16). Antes lo
-- calculaba la app con el día de la Ciudad de México; ahora cada evento con el suyo. Las listas filtran con
-- `termina >= ahora` (filtroSinPasar en src/lib/fechas.ts).
alter table public.eventos add column termina timestamptz not null generated always as (
  coalesce(fin, pg_catalog.timezone(zona, pg_catalog.date_trunc('day', pg_catalog.timezone(zona, inicio)) + interval '1 day'))
) stored;
comment on column public.eventos.termina is 'Cuándo deja de mostrarse: al terminar o, sin hora de fin, al acabar su día en la zona del evento.';
create index eventos_termina_idx on public.eventos (termina) where visible;
create index eventos_ciudad_termina_idx on public.eventos (ciudad, termina) where visible;
