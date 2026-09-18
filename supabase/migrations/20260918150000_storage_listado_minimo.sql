-- Las URL publicas siguen sirviendo imagenes; listar metadatos no es necesario
-- para mostrarlas. Conservar SELECT propio permite actualizar/borrar una foto.
drop policy "fotos: lectura pública" on storage.objects;

create policy "fotos: listado propio o administracion"
on storage.objects for select to authenticated
using (
  bucket_id = 'fotos'
  and (
    (
      (storage.foldername(name))[1] in ('perfiles', 'lugares', 'artistas')
      and (storage.foldername(name))[2] = (select auth.uid())::text
    )
    or (select public.es_admin())
  )
);
