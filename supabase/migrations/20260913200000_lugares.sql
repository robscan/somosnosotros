-- somosnosotros · migración 0002 · lugares
-- Duplicados (mismo nombre normalizado a menos de 150 m) y portadas de lugares en el espacio de fotos.

create extension if not exists unaccent with schema extensions;

-- "Casa de Cultura  #3" → "casa de cultura 3"
create function public.normalizar_nombre(t text) returns text
language sql stable as $$
  select trim(regexp_replace(lower(extensions.unaccent(coalesce(t, ''))), '[^a-z0-9]+', ' ', 'g'));
$$;

-- Distancia en metros entre dos puntos (haversine). Suficiente para "a menos de 150 m".
create function public.distancia_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision) returns double precision
language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Lugares visibles con el mismo nombre a menos de 150 m. Se llama antes de publicar: "¿es este?".
create function public.lugares_parecidos(p_nombre text, p_lat double precision, p_lng double precision, p_excluir uuid default null)
returns setof public.lugares
language sql stable as $$
  select l.* from public.lugares l
  where l.visible
    and (p_excluir is null or l.id <> p_excluir)
    and public.normalizar_nombre(l.nombre) = public.normalizar_nombre(p_nombre)
    and public.distancia_m(l.lat, l.lng, p_lat, p_lng) < 150
  order by public.distancia_m(l.lat, l.lng, p_lat, p_lng);
$$;

-- Portadas: cada quien escribe también en lugares/<mi id>/…
drop policy "fotos: subo a mi carpeta" on storage.objects;
drop policy "fotos: cambio las de mi carpeta" on storage.objects;
drop policy "fotos: borro las de mi carpeta" on storage.objects;
create policy "fotos: subo a mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] in ('perfiles', 'lugares') and (storage.foldername(name))[2] = auth.uid()::text);
create policy "fotos: cambio las de mi carpeta" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] in ('perfiles', 'lugares') and (storage.foldername(name))[2] = auth.uid()::text);
create policy "fotos: borro las de mi carpeta" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] in ('perfiles', 'lugares') and (storage.foldername(name))[2] = auth.uid()::text);
