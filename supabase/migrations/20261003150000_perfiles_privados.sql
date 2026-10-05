-- OL-260 / H03, paso 1: interfaz privada compatible con el despliegue anterior.
-- La revocación de SELECT genérico va DESPUÉS de publicar sus consumidores.
begin;

create function public.mi_perfil() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin_sesion' using errcode = '42501'; end if;
  -- Lista explícita: nuevas columnas no se exponen automáticamente por esta RPC.
  return (select jsonb_build_object(
    'id', p.id, 'nombre', p.nombre, 'foto', p.foto, 'colonia', p.colonia,
    'bio', p.bio, 'rol', p.rol, 'reservado', p.reservado,
    'avisos_correo', p.avisos_correo, 'avisos_push', p.avisos_push,
    'avisos_preguntado', p.avisos_preguntado,
    'avisos_correo_desde', p.avisos_correo_desde, 'avisos_push_desde', p.avisos_push_desde,
    'avisos_correo_motivo', p.avisos_correo_motivo, 'novedades_vistas_en', p.novedades_vistas_en
  ) from public.perfiles p where p.id = auth.uid());
end;
$$;

create function public.mi_push_activo(p_endpoint text default null, p_token text default null)
returns boolean language sql stable security definer set search_path = '' as $$
  -- Un único snapshot; no revela si un dispositivo pertenece a otra cuenta.
  select auth.uid() is not null and ((p_endpoint is null) <> (p_token is null))
    and exists (select 1 from public.perfiles p where p.id = auth.uid() and p.avisos_push)
    and (
      (p_endpoint is not null and exists (select 1 from public.suscripciones_push s
        where s.usuario_id = auth.uid() and s.endpoint = p_endpoint))
      or (p_token is not null and exists (select 1 from public.dispositivos_apns d
        where d.usuario_id = auth.uid() and d.token = p_token))
    );
$$;

create function public.activar_mis_avisos_push() returns boolean
language plpgsql security definer set search_path = '' as $$
declare activado boolean;
begin
  if auth.uid() is null then raise exception 'sin_sesion' using errcode = '42501'; end if;
  -- Se invoca tras registrar el dispositivo, sin recibir ni aceptar otro usuario.
  update public.perfiles p set avisos_push = true, avisos_push_desde = now(), avisos_preguntado = true
  where p.id = auth.uid() and (
    exists (select 1 from public.suscripciones_push s where s.usuario_id = auth.uid())
    or exists (select 1 from public.dispositivos_apns d where d.usuario_id = auth.uid())
  ) returning p.avisos_push into activado;
  return coalesce(activado, false);
end;
$$;

revoke all on function public.mi_perfil() from public, anon, authenticated, service_role;
revoke all on function public.mi_push_activo(text,text) from public, anon, authenticated, service_role;
revoke all on function public.activar_mis_avisos_push() from public, anon, authenticated, service_role;
grant execute on function public.mi_perfil() to authenticated;
grant execute on function public.mi_push_activo(text,text) to authenticated;
grant execute on function public.activar_mis_avisos_push() to authenticated;
comment on function public.mi_perfil() is 'Datos del titular exclusivamente, ligado a auth.uid(). No acepta identificador ajeno.';
comment on function public.mi_push_activo(text,text) is 'Consentimiento y dispositivo del titular en una sola instantánea; sin datos de otras cuentas.';
comment on function public.activar_mis_avisos_push() is 'Activa el consentimiento del titular tras registrar un dispositivo propio. No genera envíos.';
commit;
