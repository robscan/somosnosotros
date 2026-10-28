-- somosnosotros · OL-464 · migración 20261028120000 · carrusel en Instagram y varias fotos en Facebook (bitácora 496)
-- Pregunta del founder (2026-10-27): «para el caso de festivales que además tengan más de un cartel en sus eventos, ¿se puede hacer un carrusel
-- para publicar?»; dijo «Sí» a la propuesta.
--
-- SOLO AÑADE (ninguna fila cambia; lo anotado sigue valiendo tal cual):
--   · `instagram_publicaciones.imagenes`: cuántas imágenes llevó (1 por omisión: todo lo de antes) y `instagram_publicaciones.carrusel`: las
--     direcciones públicas de cada imagen de un carrusel, en orden (para espejarlo en Facebook después, «Reintentar en Facebook»).
--   · El formato `carrusel` (de 2 a 10 imágenes, todas a 4:5) en `instagram_publicaciones` y en `facebook_publicaciones`: su `check` de formato
--     se cambia por uno que acepta un valor más ('4x5', '9x16' y 'carrusel'); lo que aceptaba lo sigue aceptando.
--   · `facebook_publicaciones.imagenes`: cuántas fotos llevó; como el evento y el formato, la pone la base desde la publicación de Instagram que
--     espeja (`facebook_publicaciones_registro`, mismo cuerpo más esa línea).
begin;

-- ---------- Instagram ----------
alter table public.instagram_publicaciones
  add column imagenes smallint not null default 1 check (imagenes between 1 and 10),
  add column carrusel text[] check (carrusel is null or (cardinality(carrusel) between 2 and 10 and char_length(array_to_string(carrusel, ' ')) <= 5100));
alter table public.instagram_publicaciones drop constraint instagram_publicaciones_formato_check;
alter table public.instagram_publicaciones
  add constraint instagram_publicaciones_formato_check check (formato in ('4x5', '9x16', 'carrusel')),
  -- Un carrusel lleva de 2 a 10 imágenes y una publicación o una historia, una; publicado, con sus direcciones (tantas como imágenes).
  add constraint instagram_publicaciones_carrusel check (
    (formato = 'carrusel') = (imagenes > 1)
    and (carrusel is null or (formato = 'carrusel' and cardinality(carrusel) = imagenes))
    and (formato <> 'carrusel' or estado = 'error' or carrusel is not null));
comment on column public.instagram_publicaciones.imagenes is 'OL-464: cuántas imágenes llevó (un carrusel, de 2 a 10).';
comment on column public.instagram_publicaciones.carrusel is 'OL-464: las direcciones públicas de cada imagen del carrusel, en orden (la primera es también `imagen`).';

-- ---------- Facebook ----------
alter table public.facebook_publicaciones
  add column imagenes smallint not null default 1 check (imagenes between 1 and 10);
alter table public.facebook_publicaciones drop constraint facebook_publicaciones_formato_check;
alter table public.facebook_publicaciones
  add constraint facebook_publicaciones_formato_check check (formato in ('4x5', '9x16', 'carrusel'));
comment on column public.facebook_publicaciones.imagenes is 'OL-464: cuántas fotos llevó (las del carrusel de Instagram que espeja). La pone la base.';

create or replace function public.facebook_publicaciones_registro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.publicado_por := coalesce(auth.uid(), new.publicado_por);
  new.creado_en := now();
  -- El evento, el formato y cuántas imágenes son los de la publicación de Instagram que espeja, nunca otros.
  select ip.evento_id, ip.formato, ip.imagenes into new.evento_id, new.formato, new.imagenes from public.instagram_publicaciones ip where ip.id = new.instagram_id;
  return new;
end $$;
revoke execute on function public.facebook_publicaciones_registro() from public, anon, authenticated;
grant execute on function public.facebook_publicaciones_registro() to service_role;

commit;
