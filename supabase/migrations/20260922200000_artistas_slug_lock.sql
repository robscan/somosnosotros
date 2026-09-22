-- somosnosotros · migración 20260922200000 · cierre de concurrencia en el slug de artistas (OL-123)
-- Solo redefine public.artistas_generar_slug() (misma firma, mismo `set search_path = ''`, sin security definer)
-- para añadir el mismo bloqueo consultivo que ya llevan lugares_generar_slug (20260922160000) y slug_de_evento
-- (20260922170000). `create or replace` conserva el dueño y los permisos que puso 20260922140000 (sin EXECUTE
-- para anon/authenticated) y el disparador artistas_slug sigue apuntando a la misma función. Nada más cambia.
create or replace function public.artistas_generar_slug() returns trigger
language plpgsql set search_path = '' as $$
declare
  base text;
  candidato text;
  sufijo int;
begin
  if new.slug is not null then return new; end if;
  base := public.slug_de_nombre(new.nombre);
  if base = '' then base := 'artista-' || left(new.id::text, 8); end if;
  -- Bloqueo por hash del nombre base: dos altas concurrentes con el mismo nombre no pueden calcular el mismo
  -- slug a la vez (cada transacción solo ve sus propias filas sin comitear); se libera solo al terminar la
  -- transacción, así la siguiente ya ve la fila recién insertada y elige un candidato distinto.
  perform pg_advisory_xact_lock(hashtext('artistas_slug:' || base));
  candidato := base;
  sufijo := 2;
  while exists (select 1 from public.artistas where slug = candidato) loop
    candidato := base || '-' || sufijo;
    sufijo := sufijo + 1;
  end loop;
  new.slug := candidato;
  return new;
end $$;
