-- somosnosotros · OL-185 (bitácora 220) · doc docs/rediseno/44-novedades-artista.md §6, cambiado por el founder
-- el 2026-09-24: «crea opción de editar publicaciones de artista, para borrar o corregir subidas.» El doc decía
-- «sin edición después de publicar» (§6); el founder lo cambia hoy para las novedades del artista (novedades_
-- artista, OL-175/OL-181): quien gestiona la ficha corrige enlace, título y texto, y borra sus novedades. Ocultar
-- (`visible`) sigue siendo solo de la administración (doc 44 §4, sin cambios). El borrado ya lo tenía OL-175
-- (bitácora 210, política "borra quien gestiona la ficha o admin"); esta pieza solo toca el UPDATE.

-- La política de la fase 1 ("solo la administración cambia visible") se sustituye por una que también deja editar
-- a quien gestiona la ficha. Qué campo se puede tocar y cuál no lo decide el disparador de abajo, no esta
-- política: aquí solo se decide QUIÉN puede intentar un update.
drop policy "novedades_artista: solo la administración cambia visible" on public.novedades_artista;
create policy "novedades_artista: edita quien gestiona la ficha o admin" on public.novedades_artista for update to authenticated
  using (public.gestiona_artista(artista_id) or public.es_admin())
  with check (public.gestiona_artista(artista_id) or public.es_admin());

-- El candado fino, por valor, no por rol: mismo estilo que novedades_artista_tope (before, security definer,
-- search_path vacío), errcode check_violation con un mensaje llano que el servidor traduce tal cual.
--   (a) `visible` solo la cambia la administración, aunque quien gestiona la ficha ya pueda tocar el resto de la
--       fila (founder: «Ocultar (visible) sigue siendo solo de la administración»).
--   (b) `artista_id`, `publicado_por` y `creado_en` no cambian nunca, los toque quien los toque (ni siquiera la
--       administración): mover una novedad a otra ficha, cambiar quién la publicó o cuándo se publicó no es
--       "corregir una novedad", es otra cosa. Un BEFORE ROW trigger corre antes de que la RLS evalúe `with check`
--       sobre la fila final (documentado así por PostgreSQL), así que esta regla se aplica siempre, antes de que
--       la política de arriba decida si el resto del cambio vale.
create function public.novedades_artista_editar_candado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.visible is distinct from old.visible and not public.es_admin() then
    raise exception using errcode = 'check_violation',
      message = 'Solo la administración puede ocultar o mostrar una novedad.';
  end if;
  if new.artista_id is distinct from old.artista_id
    or new.publicado_por is distinct from old.publicado_por
    or new.creado_en is distinct from old.creado_en then
    raise exception using errcode = 'check_violation',
      message = 'Esa parte de la novedad no se puede cambiar.';
  end if;
  return new;
end;
$$;
comment on function public.novedades_artista_editar_candado() is 'OL-185: en un update, visible solo la cambia la administración; artista_id/publicado_por/creado_en nunca cambian, los toque quien los toque.';
create trigger novedades_artista_editar_candado before update on public.novedades_artista
  for each row execute function public.novedades_artista_editar_candado();
-- Un trigger instalado no necesita EXECUTE del cliente al dispararse (mismo patrón que novedades_artista_tope).
revoke execute on function public.novedades_artista_editar_candado() from public, anon, authenticated;
grant execute on function public.novedades_artista_editar_candado() to service_role;
