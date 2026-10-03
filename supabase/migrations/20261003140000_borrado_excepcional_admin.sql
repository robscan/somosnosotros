-- OL-259: excepción administrativa explícita; conservar eventos al retirar el lugar.
-- No modifica borrar_lugar ni la FK RESTRICT. No ejecuta eliminaciones al migrar.
begin;

create table public.borrados_lugares_admin (
  id uuid primary key default gen_random_uuid(),
  actor uuid references public.perfiles(id) on delete set null,
  creado_en timestamptz not null default clock_timestamp(),
  lugar_id uuid not null, -- sin FK: deja constancia de una ficha que ya no existe
  motivo text not null check (char_length(btrim(motivo)) between 10 and 500),
  conteos jsonb not null,
  confirmacion text not null unique check (confirmacion ~ '^[a-f0-9]{64}$')
);
create index borrados_lugares_admin_actor_idx on public.borrados_lugares_admin(actor);
alter table public.borrados_lugares_admin enable row level security;
revoke all on public.borrados_lugares_admin from public, anon, authenticated, service_role;
grant select on public.borrados_lugares_admin to authenticated;
create policy "borrados lugares: consulta admin" on public.borrados_lugares_admin
  for select to authenticated using (public.es_admin());
comment on table public.borrados_lugares_admin is
  'Auditoría mínima de eliminación excepcional: administrador, fecha, motivo y cantidades. No guarda eventos, nombres, direcciones ni identidades de terceros. Inmutable desde la API.';

create function public.impacto_borrado_lugar_admin(p_lugar uuid) returns jsonb
language plpgsql stable security definer set search_path = '' set timezone = 'UTC' as $$
declare
  estado jsonb;
  resultado jsonb;
begin
  if auth.uid() is null or not public.es_admin() then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  -- Una sola instantánea. Las filas completas solo participan en la huella;
  -- la respuesta contiene nombre del lugar, conteos y una confirmación opaca.
  select jsonb_build_object(
    'actor', auth.uid(), 'lugar', to_jsonb(l),
    'eventos', coalesce((select jsonb_agg(to_jsonb(e) order by e.id) from public.eventos e where e.lugar_id = l.id), '[]'::jsonb),
    'seguimientos', coalesce((select jsonb_agg(to_jsonb(s) order by s.usuario_id) from public.seguimientos s where s.lugar_id = l.id), '[]'::jsonb),
    'cuentas', coalesce((select jsonb_agg(to_jsonb(c) order by c.perfil_id) from public.lugares_cuentas c where c.lugar_id = l.id), '[]'::jsonb),
    'destacados', coalesce((select jsonb_agg(to_jsonb(d) order by d.id) from public.destacados d where d.lugar_id = l.id), '[]'::jsonb),
    'obras', coalesce((select jsonb_agg(o.id order by o.id) from public.obras_colectivas o where o.lugar_id = l.id), '[]'::jsonb),
    'contactos', coalesce((select jsonb_agg(c.id order by c.id) from public.contactos_importados c where c.lugar_id = l.id), '[]'::jsonb),
    'invitaciones', coalesce((select jsonb_agg(i.id order by i.id) from public.agendas_invitaciones_enviadas i where i.lugar_id = l.id), '[]'::jsonb)
  ) into estado from public.lugares l where l.id = p_lugar;
  if estado is null then raise exception 'lugar_no_disponible' using errcode = 'P0002'; end if;
  resultado := jsonb_build_object(
    'lugar_id', p_lugar, 'nombre', estado #>> '{lugar,nombre}',
    'eventos', jsonb_array_length(estado->'eventos'),
    'ajenos', (select count(*) from jsonb_array_elements(estado->'eventos') e where (e->>'creado_por')::uuid is distinct from auth.uid()),
    'por_ocultar', (select count(*) from jsonb_array_elements(estado->'eventos') e where (e->>'visible')::boolean and
      (not (estado #>> '{lugar,visible}')::boolean or (estado #>> '{lugar,privado}')::boolean)),
    'seguimientos', jsonb_array_length(estado->'seguimientos'),
    'cuentas', jsonb_array_length(estado->'cuentas'),
    'destacados', jsonb_array_length(estado->'destacados'),
    'obras', jsonb_array_length(estado->'obras'),
    'contactos', jsonb_array_length(estado->'contactos'),
    'invitaciones', jsonb_array_length(estado->'invitaciones'),
    'permitido', jsonb_array_length(estado->'obras') + jsonb_array_length(estado->'contactos') + jsonb_array_length(estado->'invitaciones') = 0,
    'confirmacion', encode(sha256(convert_to(estado::text, 'UTF8')), 'hex')
  );
  return resultado;
end;
$$;
revoke all on function public.impacto_borrado_lugar_admin(uuid) from public, anon, authenticated, service_role;
grant execute on function public.impacto_borrado_lugar_admin(uuid) to authenticated;

create function public.borrar_lugar_excepcional_admin(p_lugar uuid, p_confirmacion text, p_motivo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  lugar public.lugares;
  impacto jsonb;
  anterior public.borrados_lugares_admin;
  optin_anterior text := current_setting('app.avisos_outbox', true);
begin
  if auth.uid() is null or not public.es_admin() then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_motivo is null or char_length(btrim(p_motivo)) not between 10 and 500
    or p_confirmacion is null or p_confirmacion !~ '^[a-f0-9]{64}$' then
    raise exception 'confirmacion_invalida' using errcode = '22023';
  end if;
  -- Serializa también dos reintentos de la misma confirmación.
  perform pg_advisory_xact_lock(7305, hashtext(p_confirmacion));
  select * into anterior from public.borrados_lugares_admin where confirmacion = p_confirmacion;
  if found then
    if anterior.actor is distinct from auth.uid() or anterior.lugar_id is distinct from p_lugar
      or anterior.motivo is distinct from btrim(p_motivo) then
      raise exception 'confirmacion_invalida' using errcode = '22023';
    end if;
    return jsonb_build_object('ok', true, 'eventos', anterior.conteos->'eventos', 'repetido', true);
  end if;

  -- El padre bloquea altas de cualquier hijo por la FK; luego se bloquean las
  -- filas existentes. Tras los cerrojos se vuelve a calcular el impacto completo.
  select * into lugar from public.lugares where id = p_lugar for update;
  if not found then raise exception 'lugar_no_disponible' using errcode = 'P0002'; end if;
  perform e.id from public.eventos e where e.lugar_id = p_lugar order by e.id for update;
  perform s.usuario_id from public.seguimientos s where s.lugar_id = p_lugar order by s.usuario_id for update;
  perform c.perfil_id from public.lugares_cuentas c where c.lugar_id = p_lugar order by c.perfil_id for update;
  perform d.id from public.destacados d where d.lugar_id = p_lugar order by d.id for update;
  perform o.id from public.obras_colectivas o where o.lugar_id = p_lugar order by o.id for update;
  perform c.id from public.contactos_importados c where c.lugar_id = p_lugar order by c.id for update;
  perform i.id from public.agendas_invitaciones_enviadas i where i.lugar_id = p_lugar order by i.id for update;
  impacto := public.impacto_borrado_lugar_admin(p_lugar);
  if impacto->>'confirmacion' is distinct from p_confirmacion then
    raise exception 'impacto_cambio' using errcode = '40001';
  end if;
  if not (impacto->>'permitido')::boolean then
    raise exception 'dependencias_pendientes' using errcode = '23503';
  end if;

  perform set_config('app.avisos_outbox', 'off', true);
  update public.eventos set lugar_id = null,
    sitio_texto = case when lugar.visible and not lugar.privado then lugar.nombre else 'Lugar retirado' end,
    sitio_direccion = null, sitio_lat = null, sitio_lng = null,
    visible = visible and lugar.visible and not lugar.privado
    where lugar_id = p_lugar;
  -- Relaciones sin ficha propia, explicadas en el impacto. Obra e historial
  -- impiden llegar aquí: nunca se dejan caer por los CASCADE heredados.
  delete from public.seguimientos where lugar_id = p_lugar;
  delete from public.lugares_cuentas where lugar_id = p_lugar;
  delete from public.destacados where lugar_id = p_lugar;
  delete from public.lugares where id = p_lugar;
  insert into public.borrados_lugares_admin(actor,lugar_id,motivo,conteos,confirmacion)
    values (auth.uid(),p_lugar,btrim(p_motivo),
      impacto - 'nombre' - 'lugar_id' - 'confirmacion' - 'permitido',p_confirmacion);
  perform set_config('app.avisos_outbox', coalesce(optin_anterior, ''), true);
  return jsonb_build_object('ok', true, 'eventos', impacto->'eventos', 'repetido', false);
exception when others then
  perform set_config('app.avisos_outbox', coalesce(optin_anterior, ''), true);
  raise;
end;
$$;
revoke all on function public.borrar_lugar_excepcional_admin(uuid,text,text) from public, anon, authenticated, service_role;
grant execute on function public.borrar_lugar_excepcional_admin(uuid,text,text) to authenticated;
comment on function public.borrar_lugar_excepcional_admin(uuid,text,text) is
  'Solo admin con motivo y huella del impacto vigente. Conserva todos los eventos, privacidad y autoría; desvincula el lugar y registra conteos. Bloquea obra/contactos/historial, no genera avisos masivos.';

commit;
