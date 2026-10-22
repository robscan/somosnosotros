-- somosnosotros · OL-453 · migración 20261022170000 · aceptar una propuesta desde la Mac, a nombre de un admin
-- Founder (22 de octubre): «no me pongas a aprobar en front, aprueba tú por favor». El guion de la Mac (scripts/instituciones/aceptar-corrida.ts)
-- acepta las propuestas de una corrida por el mismo camino que la bandeja de Ciudades, pero no tiene sesión: entra con la llave de servicio, y
-- `aceptar_propuesta` exige una sesión de admin (`auth.uid()` y `es_admin()`). En vez de copiar su lógica (dos lógicas que se separan), esta
-- función la llama tal cual, como si la sesión fuera la del admin que se nombra.
--
-- SOLO AÑADE: `aceptar_propuesta_como(p_autor, p_id, p_ficha)`, que solo puede llamar la llave de servicio (ni visitantes ni cuentas):
--   · comprueba que `p_autor` es admin con la misma regla que `es_admin()` (su perfil con rol «admin», el que pone `admin_correos` al entrar);
--     si no, falla igual que `aceptar_propuesta` sin sesión de admin (42501);
--   · fija, solo para esta transacción, el sujeto de la sesión (`request.jwt.claims` con `sub` y `role`, y `request.jwt.claim.sub`), así
--     `auth.uid()` es el admin y lo que crea y marca queda a su nombre (`creado_por`, `resuelto_por`), como desde la bandeja;
--   · llama `aceptar_propuesta(p_id, p_ficha)` y devuelve lo que devuelve.

create function public.aceptar_propuesta_como(p_autor uuid, p_id uuid, p_ficha jsonb default '{}'::jsonb) returns json
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_autor is null or not exists (select 1 from public.perfiles where id = p_autor and rol = 'admin') then
    raise exception 'solo la administración' using errcode = '42501';
  end if;
  perform pg_catalog.set_config('request.jwt.claims', pg_catalog.json_build_object('sub', p_autor, 'role', 'authenticated')::text, true);
  perform pg_catalog.set_config('request.jwt.claim.sub', p_autor::text, true);
  return public.aceptar_propuesta(p_id, p_ficha);
end $$;
revoke all on function public.aceptar_propuesta_como(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.aceptar_propuesta_como(uuid, uuid, jsonb) to service_role;
comment on function public.aceptar_propuesta_como(uuid, uuid, jsonb) is
  'OL-453: aceptar_propuesta a nombre de un admin (p_autor), solo para la llave de servicio (el guion aceptar-corrida de la Mac).';
