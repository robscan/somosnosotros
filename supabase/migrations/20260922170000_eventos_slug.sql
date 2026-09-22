-- somosnosotros · migración 20260922170000 · dirección legible de eventos (OL-119)
-- Mismo patrón que artistas/lugares (20260922140000, 20260922160000): columna, relleno, trigger. Solo añade.
-- Regla propia de eventos, pedida por el founder para que la dirección siga siendo legible cuando el nombre se
-- repite (cosa común: "Concierto de Otoño" en dos fechas distintas): primero el nombre solo; si ya existe, el
-- nombre más la fecha de inicio en la zona del propio evento ("concierto-de-otono-2026-10-03"); si aun con la
-- fecha vuelve a chocar (dos funciones del mismo evento el mismo día), un sufijo numérico corto. El slug no
-- cambia si se edita el nombre o la fecha después de creado (mismo criterio de estabilidad que artistas).

alter table public.eventos add column slug text;
comment on column public.eventos.slug is 'La dirección legible (/eventos/<slug>); se pone sola al crear el evento y no cambia si cambia el nombre o la fecha (OL-119).';

-- Slug a partir del nombre y, si choca, más la fecha de inicio en la zona del propio evento (day, no la hora).
-- volatile (no "stable"): toma un bloqueo consultivo (pg_advisory_xact_lock), un efecto que "stable" prohíbe
-- declarar aunque no toque filas.
create function public.slug_de_evento(p_titulo text, p_inicio timestamptz, p_zona text, p_excluir_id uuid) returns text
language plpgsql set search_path = '' as $$
declare
  base text;
  candidato text;
  con_fecha text;
  sufijo int;
begin
  base := public.slug_de_nombre(p_titulo);
  -- Sin letras ni números en el título, respaldo con el id (mismo criterio que artistas/lugares); `p_excluir_id`
  -- es siempre el id real de la fila (propio en el disparador, el de la fila en curso en el relleno).
  if base = '' then base := 'evento-' || left(p_excluir_id::text, 8); end if;
  -- Bloqueo por hash del nombre base: dos altas concurrentes con el mismo título (aunque acaben en fechas
  -- distintas) no pueden calcular el mismo candidato a la vez, porque cada transacción solo ve sus propias filas
  -- sin comitear. Se libera al terminar la transacción; se probó con seis altas simultáneas del mismo título
  -- (mismo caso que ya cubre la cuota de avisos, supabase/tests/pg/avisos-fiables.test.mjs).
  perform pg_advisory_xact_lock(hashtext('eventos_slug:' || base));
  candidato := base;
  if not exists (select 1 from public.eventos where slug = candidato and id is distinct from p_excluir_id) then
    return candidato;
  end if;
  con_fecha := base || '-' || to_char(p_inicio at time zone coalesce(p_zona, 'UTC'), 'YYYY-MM-DD');
  candidato := con_fecha;
  sufijo := 2;
  while exists (select 1 from public.eventos where slug = candidato and id is distinct from p_excluir_id) loop
    candidato := con_fecha || '-' || sufijo;
    sufijo := sufijo + 1;
  end loop;
  return candidato;
end $$;
revoke execute on function public.slug_de_evento(text, timestamptz, text, uuid) from public, anon;
grant execute on function public.slug_de_evento(text, timestamptz, text, uuid) to authenticated, service_role;

-- Relleno en orden estable (creado_en, id): el sufijo de un choque siempre sale igual si se releyera esta migración.
-- Nombre vacío o solo símbolos cae a "evento-<8 del id>" antes de intentar la fecha, igual que artistas/lugares.
do $$
declare
  fila record;
  base text;
  candidato text;
  con_fecha text;
  sufijo int;
begin
  for fila in select id, titulo, inicio, zona from public.eventos order by creado_en, id loop
    base := public.slug_de_nombre(fila.titulo);
    if base = '' then base := 'evento-' || left(fila.id::text, 8); end if;
    candidato := base;
    if exists (select 1 from public.eventos where slug = candidato and id <> fila.id) then
      con_fecha := base || '-' || to_char(fila.inicio at time zone coalesce(fila.zona, 'UTC'), 'YYYY-MM-DD');
      candidato := con_fecha;
      sufijo := 2;
      while exists (select 1 from public.eventos where slug = candidato and id <> fila.id) loop
        candidato := con_fecha || '-' || sufijo;
        sufijo := sufijo + 1;
      end loop;
    end if;
    update public.eventos set slug = candidato where id = fila.id;
  end loop;
end $$;

alter table public.eventos alter column slug set not null;
create unique index eventos_slug_idx on public.eventos (slug);

-- Alta nueva: si no llega slug (hoy nunca llega; lo pone la base), se calcula aquí con el mismo criterio de
-- arriba. Nunca se toca en un update de título o fecha: el slug no cambia una vez creado.
create function public.eventos_generar_slug() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.slug is not null then return new; end if;
  new.slug := public.slug_de_evento(new.titulo, new.inicio, new.zona, new.id);
  return new;
end $$;
create trigger eventos_slug before insert on public.eventos
  for each row execute function public.eventos_generar_slug();
-- Un trigger instalado no necesita EXECUTE de quien inserta para dispararse (mismo criterio que artistas/lugares).
revoke execute on function public.eventos_generar_slug() from public, anon, authenticated;
grant execute on function public.eventos_generar_slug() to service_role;
