-- Cierra el hueco de la revisión de seguridad del 2026-09-14 (A1): la política "edito el mío" dejaba
-- cambiar la columna rol, así que cualquier cuenta podía hacerse admin con una petición a PostgREST.
-- El rol solo lo cambia el admin (desde el panel, con su sesión) y nadie más; las demás columnas siguen igual.
revoke update (rol) on public.perfiles from anon, authenticated;

-- Cinturón y tirantes: aunque alguien tenga el permiso, el cambio de rol exige ser admin.
create or replace function public.proteger_rol() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.rol is distinct from old.rol and not public.es_admin() then
    raise exception 'solo el admin cambia el rol';
  end if;
  return new;
end $$;
drop trigger if exists proteger_rol on public.perfiles;
create trigger proteger_rol before update on public.perfiles for each row execute function public.proteger_rol();

-- Nota: avisos_correo_motivo no se restringe: la propia persona lo pone a null al reactivar sus avisos
-- (src/app/avisos/acciones.ts, src/app/perfil/acciones.ts) con su sesión.
