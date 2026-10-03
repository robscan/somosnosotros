-- OL-260 / H03, paso 2. Aplicar solo con los consumidores de 150000 publicados.
-- Conserva FK, RLS, escrituras propias y el acceso operativo de service_role.
begin;

revoke select on public.perfiles from public, anon, authenticated;
-- Revoca también grants de columna anteriores: el contrato es una lista cerrada.
do $$
declare columnas text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum) into columnas
  from pg_attribute
  where attrelid = 'public.perfiles'::regclass and attnum > 0 and not attisdropped;
  execute 'revoke select (' || columnas || ') on public.perfiles from public, anon, authenticated';
end;
$$;
grant select (id, nombre, foto, colonia, bio, rol, reservado)
  on public.perfiles to anon, authenticated;

notify pgrst, 'reload schema';
commit;
