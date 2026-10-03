-- OL-257 / H01: nunca eliminar eventos ajenos por cascada al borrar su lugar.
begin;

alter table public.eventos drop constraint eventos_lugar_id_fkey;
alter table public.eventos add constraint eventos_lugar_id_fkey
  foreign key (lugar_id) references public.lugares(id) on delete restrict;

-- Invoker: conserva RLS. FOR UPDATE serializa el borrado con las inserciones
-- de hijos (el chequeo FK toma KEY SHARE). RESTRICT también ve hijos ocultos
-- por RLS o sin autor; si quedan, el fallo revierte toda la operación.
create function public.borrar_lugar(p_lugar uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v_autor uuid;
begin
  if auth.uid() is null then return false; end if;
  select l.creado_por into v_autor from public.lugares l
    where l.id = p_lugar for update;
  if not found then return false; end if;
  if v_autor is distinct from auth.uid() and not public.es_admin() then
    return false;
  end if;

  delete from public.eventos where lugar_id = p_lugar and creado_por = auth.uid();
  delete from public.lugares where id = p_lugar;
  return found;
end;
$$;
revoke all on function public.borrar_lugar(uuid) from public, anon, authenticated, service_role;
grant execute on function public.borrar_lugar(uuid) to authenticated;
comment on function public.borrar_lugar(uuid) is
  'Borra un lugar autorizado y solo los eventos del solicitante, atómicamente. Rechaza eventos ajenos o sin autor, también para administración; no es el procedimiento de eliminación excepcional.';

commit;
