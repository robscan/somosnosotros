-- somosnosotros · migración 20260925110000 · artistas ligados al correo de la cuenta, sin reclamar (OL-177)
-- Solo añade: la función que la sección Artistas usa para ofrecer "Reclamar ficha" cuando el correo de la cuenta
-- coincide con uno que el CAPO capturó para una ficha que la persona todavía no gestiona ni tiene pendiente de
-- revisión. Mismo criterio de coincidencia que reclamar_si_correo_coincide (migración 20260922140000, L53): lee
-- el correo de quien llama (nunca un parámetro), sin exponer contactos_importados.

create function public.artistas_con_mi_correo()
returns table (id uuid, nombre text, slug text)
language plpgsql security definer set search_path = '' as $$
declare
  v_correo text;
begin
  if auth.uid() is null then return; end if;
  -- "u.id" va calificado: el parámetro de salida de la función también se llama "id" (RETURNS TABLE) y sin
  -- calificar, Postgres no sabe si es la columna de auth.users o esa variable (columna ambigua).
  select u.email into v_correo from auth.users u where u.id = auth.uid();
  if v_correo is null then return; end if;
  return query
    select a.id, a.nombre, a.slug
    from public.artistas a
    where exists (
      select 1 from public.contactos_importados c
      where c.artista_id = a.id and lower(c.correo) = lower(v_correo)
    )
    -- Ya la gestiona: no se ofrece de nuevo (aparece en «Mis artistas»).
    and not exists (
      select 1 from public.artistas_cuentas ac where ac.artista_id = a.id and ac.perfil_id = auth.uid()
    )
    -- Ya tiene un reclamo suyo sin atender sobre esta ficha (es_mio o retirar): no se repite el letrero.
    and not exists (
      select 1 from public.reportes r
      where r.tipo = 'artista' and r.objeto_id = a.id and r.creado_por = auth.uid() and not r.atendido
    )
  ;
end $$;
revoke execute on function public.artistas_con_mi_correo() from public, anon;
grant execute on function public.artistas_con_mi_correo() to authenticated;
