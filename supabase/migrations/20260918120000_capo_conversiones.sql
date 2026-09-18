-- OL-076: asociación temporal de invitaciones CAPO y actividad posterior.
-- Solo agregados de registros conservados: no atribución causal ni historial de aprobaciones.
create function public.panel_capo() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.es_admin() then
    raise exception 'solo la administración' using errcode = '42501';
  end if;
  return (
    with invitadas as (
      select a.id, min(i.enviado_en) as primero, max(i.enviado_en) as ultimo
      from public.artistas a
      join public.invitaciones_enviadas i on i.artista_id = a.id
      where a.origen = 'capo' and i.enviado_en <= now()
      group by a.id
    ), estados as (
      select i.*,
        exists (select 1 from public.artistas_cuentas c
          where c.artista_id = i.id and c.creado_en <= i.primero) as previa,
        exists (select 1 from public.reportes r
          where r.tipo = 'artista' and r.objeto_id = i.id and r.motivo = 'es_mio'
          and r.creado_en > i.primero and r.creado_en <= now()) as solicitud,
        exists (select 1 from public.artistas_cuentas c
          where c.artista_id = i.id and c.creado_en > i.primero and c.creado_en <= now()) as vinculada
      from invitadas i
    )
    select jsonb_build_object(
      'invitados', count(*),
      'ya_vinculados_al_invitar', count(*) filter (where previa),
      'elegibles', count(*) filter (where not previa),
      'solicitaron_despues', count(*) filter (where not previa and solicitud),
      'vinculados_despues', count(*) filter (where not previa and vinculada),
      'primer_envio', min(primero),
      'ultimo_envio', max(ultimo),
      'corte', now()
    ) from estados
  );
end;
$$;
revoke all on function public.panel_capo() from public, anon;
grant execute on function public.panel_capo() to authenticated;
comment on function public.panel_capo() is 'OL-076: agregados CAPO solo para admin; solicitudes y vínculos posteriores al primer envío, sin atribución causal. No expone contactos.';
