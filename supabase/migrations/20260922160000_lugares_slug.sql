-- somosnosotros · migración 20260922160000 · dirección legible de lugares (OL-119)
-- Mismo patrón que artistas (20260922140000_artistas_slug.sql): columna, relleno, trigger. Solo añade.
-- Reusa la función genérica public.slug_de_nombre(text), ya creada para artistas y sin nada propio de esa tabla.

alter table public.lugares add column slug text;
comment on column public.lugares.slug is 'La dirección legible (/lugares/<slug>); se pone sola al crear el lugar y no cambia si cambia el nombre (mismo criterio que artistas, OL-114).';

-- Relleno en orden estable (creado_en, id): el sufijo de un choque siempre sale igual si se releyera esta migración.
do $$
declare
  fila record;
  base text;
  candidato text;
  sufijo int;
begin
  for fila in select id, nombre from public.lugares order by creado_en, id loop
    base := public.slug_de_nombre(fila.nombre);
    if base = '' then base := 'lugar-' || left(fila.id::text, 8); end if;
    candidato := base;
    sufijo := 2;
    while exists (select 1 from public.lugares where slug = candidato and id <> fila.id) loop
      candidato := base || '-' || sufijo;
      sufijo := sufijo + 1;
    end loop;
    update public.lugares set slug = candidato where id = fila.id;
  end loop;
end $$;

alter table public.lugares alter column slug set not null;
create unique index lugares_slug_idx on public.lugares (slug);

-- Alta nueva: si no llega slug (hoy nunca llega; lo pone la base), se calcula aquí con el mismo criterio de
-- sufijo. Nunca se toca en un update de nombre: el slug no cambia.
create function public.lugares_generar_slug() returns trigger
language plpgsql set search_path = '' as $$
declare
  base text;
  candidato text;
  sufijo int;
begin
  if new.slug is not null then return new; end if;
  base := public.slug_de_nombre(new.nombre);
  if base = '' then base := 'lugar-' || left(new.id::text, 8); end if;
  -- Bloqueo por hash del nombre base: dos altas concurrentes con el mismo nombre no pueden calcular el mismo
  -- slug a la vez (cada transacción solo ve sus propias filas sin comitear); se libera solo al terminar la
  -- transacción, así la siguiente ya ve la fila recién insertada y elige un candidato distinto.
  perform pg_advisory_xact_lock(hashtext('lugares_slug:' || base));
  candidato := base;
  sufijo := 2;
  while exists (select 1 from public.lugares where slug = candidato) loop
    candidato := base || '-' || sufijo;
    sufijo := sufijo + 1;
  end loop;
  new.slug := candidato;
  return new;
end $$;
create trigger lugares_slug before insert on public.lugares
  for each row execute function public.lugares_generar_slug();
-- Un trigger instalado no necesita EXECUTE de quien inserta para dispararse (mismo criterio que artistas_generar_slug).
revoke execute on function public.lugares_generar_slug() from public, anon, authenticated;
grant execute on function public.lugares_generar_slug() to service_role;
