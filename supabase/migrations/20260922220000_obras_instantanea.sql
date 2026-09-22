-- OL-126 (bitácora 161), parte 4: la instantánea de la pared de Pincel. Decisión del founder (2026-09-22): «si pongo
-- regresar a admin y entro de nuevo a pared se borra lo que estaba hecho» → la pared conserva lo pintado mientras
-- la obra esté abierta, sin guardar trazos: sube un PNG del lienzo al Storage y, al abrirse, lo pinta de fondo.
-- Bucket privado «obras», solo legible y escribible por administración (la pared ya exige sesión de administración);
-- el PNG vive en obras/<id de obra>/pared.png. Solo añade; no toca «fotos» ni ninguna política existente.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('obras', 'obras', false, 2097152, array['image/png'])
on conflict (id) do nothing;

create policy "obras: administración lee" on storage.objects for select
  using (bucket_id = 'obras' and public.es_admin());
create policy "obras: administración sube" on storage.objects for insert
  with check (bucket_id = 'obras' and public.es_admin());
create policy "obras: administración reemplaza" on storage.objects for update
  using (bucket_id = 'obras' and public.es_admin()) with check (bucket_id = 'obras' and public.es_admin());
create policy "obras: administración borra" on storage.objects for delete
  using (bucket_id = 'obras' and public.es_admin());
