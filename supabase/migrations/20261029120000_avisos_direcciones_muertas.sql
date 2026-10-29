-- somosnosotros · OL-476 · direcciones muertas (bitácora 508)
-- En producción (14 días al 2026-10-29) Safari tuvo 12 entregas fallidas y Chrome 10, todas `push_410`: suscripciones
-- que el proveedor ya dio por muertas y que cada aviso nuevo volvía a intentar. Nada se borra (bitácora 113): la
-- dirección se marca `muerta_en` y deja de recibir entregas. Lo mismo para APNs cuando Apple responde 410 o 400
-- BadDeviceToken (antes se borraba el token desde push.ts). Volver a registrar la dirección la revive (perfil/acciones.ts
-- manda `muerta_en: null` en el upsert).
--
-- Solo añade: dos columnas nulas y las mismas funciones de antes con una condición más (create or replace, mismas
-- firmas, mismos permisos, que se repiten al final). Funciones copiadas de su última versión:
--   avisos_expandir, avisos_autorizar            → 20260925160000_dispositivos_apns.sql
--   avisos_terminar                              → 20260918140000_avisos_fiables.sql
--   avisos_admin_expandir/_autorizar/_terminar   → 20260922150000_avisos_admin.sql
--   mi_push_activo                               → 20261003150000_perfiles_privados.sql
--   limitar_suscripciones_push                   → 20260918100000_push_validado.sql (+ search_path vacío de 20260918130000)
begin;

alter table public.suscripciones_push add column if not exists muerta_en timestamptz;
alter table public.dispositivos_apns add column if not exists muerta_en timestamptz;
comment on column public.suscripciones_push.muerta_en is
  'OL-476: cuando el proveedor respondió 404/410 a un aviso. Ya no recibe entregas; volver a darla de alta la revive (muerta_en = null).';
comment on column public.dispositivos_apns.muerta_en is
  'OL-476: cuando APNs respondió 410 o 400 BadDeviceToken. Ya no recibe entregas; si la app vuelve a registrar el token, revive.';

-- Las que ya respondieron 404/410 antes de esta migración (las 22 de Safari y Chrome) quedan marcadas desde su último
-- fallo, salvo que después de ese fallo hayan recibido un aviso con éxito. Solo llena la columna nueva.
update public.suscripciones_push s set muerta_en = x.cuando
  from (
    select f.usuario_id, f.endpoint, max(coalesce(f.terminado_en, f.disponible)) as cuando from (
      select usuario_id, endpoint, terminado_en, disponible from public.avisos_entregas
        where canal = 'push' and estado = 'fallida' and codigo in ('push_404', 'push_410')
      union all
      select usuario_id, endpoint, terminado_en, disponible from public.avisos_admin_entregas
        where estado = 'fallida' and codigo in ('push_404', 'push_410')
    ) f group by 1, 2
  ) x
  where s.usuario_id = x.usuario_id and s.endpoint = x.endpoint and s.muerta_en is null
    and not exists (select 1 from public.avisos_entregas ok where ok.usuario_id = s.usuario_id and ok.endpoint = s.endpoint
      and ok.estado = 'enviada' and ok.terminado_en > x.cuando)
    and not exists (select 1 from public.avisos_admin_entregas ok where ok.usuario_id = s.usuario_id and ok.endpoint = s.endpoint
      and ok.estado = 'enviada' and ok.terminado_en > x.cuando);

-- ---------- avisos_expandir: sin entregas para direcciones muertas ----------
create or replace function public.avisos_expandir() returns boolean
language plpgsql security definer set search_path='' as $$
declare j public.avisos_jobs; ids uuid[]; u uuid; p public.perfiles; snap jsonb; entregable boolean;
begin
  update public.avisos_jobs set estado='caducado' where vence<=clock_timestamp() and estado in ('pendiente','activo');
  select * into j from public.avisos_jobs where not expandido and (estado in ('pendiente','activo') or tipo='cambio')
    order by creado_en,id for update skip locked limit 1;
  if not found then return false; end if;
  snap := public.avisos_evento_publico(j.evento_id);
  entregable := snap is not null and j.estado in ('pendiente','activo') and j.vence>clock_timestamp();
  if snap is null and j.estado in ('pendiente','activo') then
    update public.avisos_jobs set estado='obsoleto' where id=j.id;
  end if;
  if not entregable and j.tipo<>'cambio' then
    update public.avisos_jobs set expandido=true where id=j.id; return true;
  end if;
  if entregable and j.contenido is null then
    -- Una fecha relativa no debe sobrevivir a medianoche en la zona del evento.
    update public.avisos_jobs set contenido=snap,contenido_en=clock_timestamp(),estado='activo',vence=least(vence,
      (date_trunc('day',clock_timestamp() at time zone (snap->>'zona'))+interval '1 day') at time zone (snap->>'zona'))
      where id=j.id returning * into j;
  end if;
  select array_agg(id order by id) into ids from (
    select d as id from public.avisos_destinatarios(j.id) d
      where j.cursor_usuario is null or d>j.cursor_usuario order by d limit 100
  ) x;
  if ids is null then update public.avisos_jobs set expandido=true where id=j.id; return true; end if;
  foreach u in array ids loop
    select * into p from public.perfiles where id=u;
    if j.tipo='cambio' then
      insert into public.novedades(usuario_id,evento_id,tipo,detalle,aviso_job_id)
        values(u,j.evento_id,'cambio',case when j.cuando and j.donde then 'ambos' when j.cuando then 'cuando' else 'donde' end,j.id)
        on conflict(usuario_id,aviso_job_id) do nothing;
    end if;
    if not entregable then continue; end if;
    -- Registros previos a esta migracion: no repetir recordatorios ya entregados.
    if j.tipo='recordatorio' and exists(select 1 from public.avisos_enviados a
      where a.usuario_id=u and a.evento_id=j.evento_id and a.tipo='recordatorio') then continue; end if;
    if p.avisos_correo and not (j.tipo in ('recordatorio','nuevo_evento') and exists (
      select 1 from public.avisos_entregas anterior join public.avisos_jobs origen on origen.id=anterior.job_id
      where origen.evento_id=j.evento_id and origen.tipo=j.tipo
        and (j.tipo='nuevo_evento' or origen.recordatorio_inicio=j.recordatorio_inicio)
        and origen.id<>j.id and anterior.usuario_id=u and anterior.canal='correo'
        and (anterior.primer_intento is not null or anterior.estado='enviada'))) then
      insert into public.avisos_entregas(job_id,usuario_id,canal) values(j.id,u,'correo') on conflict do nothing;
    end if;
    if p.avisos_push then
      insert into public.avisos_entregas(job_id,usuario_id,canal,endpoint)
        select j.id,u,'push',destino.endpoint from (
          -- OL-476: solo las direcciones vivas.
          select s.endpoint from public.suscripciones_push s where s.usuario_id=u and s.muerta_en is null
          union all
          select 'apns:'||a.token from public.dispositivos_apns a where a.usuario_id=u and a.muerta_en is null
        ) destino
          where not (j.tipo in ('recordatorio','nuevo_evento') and exists (
            select 1 from public.avisos_entregas anterior join public.avisos_jobs origen on origen.id=anterior.job_id
            where origen.evento_id=j.evento_id and origen.tipo=j.tipo
              and (j.tipo='nuevo_evento' or origen.recordatorio_inicio=j.recordatorio_inicio)
              and origen.id<>j.id and anterior.usuario_id=u and anterior.canal='push' and anterior.endpoint=destino.endpoint
              and (anterior.primer_intento is not null or anterior.estado='enviada'))) on conflict do nothing;
    end if;
  end loop;
  update public.avisos_jobs set cursor_usuario=ids[array_length(ids,1)],expandido=array_length(ids,1)<100 where id=j.id;
  return true;
end $$;

-- ---------- avisos_autorizar: una entrega ya creada para una dirección que murió después se descarta ----------
create or replace function public.avisos_autorizar(p_id uuid,p_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.avisos_entregas; j public.avisos_jobs; p public.perfiles; sub jsonb; snap jsonb; muerta boolean := false;
begin
  if not exists(select 1 from public.avisos_config where id and entregar) then return null; end if;
  select * into d from public.avisos_entregas where id=p_id and token=p_token
    and estado='tomada' and lease_hasta>clock_timestamp()+interval '15 seconds' for update;
  if not found then return null; end if;
  select * into j from public.avisos_jobs where id=d.job_id;
  select * into p from public.perfiles where id=d.usuario_id;
  snap := public.avisos_evento_publico(j.evento_id);
  if j.estado not in ('pendiente','activo') or j.vence<=clock_timestamp() or snap is null
    or snap is distinct from j.contenido
    or not exists(select 1 from public.avisos_destinatarios(j.id) u where u=d.usuario_id)
    or (d.canal='correo' and not p.avisos_correo) or (d.canal='push' and not p.avisos_push)
    or d.primer_intento<clock_timestamp()-interval '23 hours' then
    update public.avisos_entregas set estado='descartada',codigo='ya_no_aplica',terminado_en=clock_timestamp() where id=d.id;
    update public.avisos_slots set token=null,vence='-infinity' where token=p_token;
    return null;
  end if;
  if d.canal='push' and d.endpoint like 'apns:%' then
    select jsonb_build_object('apns',jsonb_build_object('token',a.token,'entorno',a.entorno)), a.muerta_en is not null into sub, muerta
      from public.dispositivos_apns a where a.usuario_id=d.usuario_id and 'apns:'||a.token=d.endpoint;
  elsif d.canal='push' then
    select jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth)), s.muerta_en is not null into sub, muerta
      from public.suscripciones_push s where s.usuario_id=d.usuario_id and s.endpoint=d.endpoint;
  end if;
  if d.canal='push' and (sub is null or coalesce(muerta,false)) then
    update public.avisos_entregas set estado='descartada',codigo=case when sub is null then 'sin_endpoint' else 'direccion_muerta' end,
      terminado_en=clock_timestamp() where id=d.id;
    update public.avisos_slots set token=null,vence='-infinity' where token=p_token;
    return null;
  end if;
  return jsonb_build_object('id',d.id,'job_id',j.id,'usuario_id',d.usuario_id,'canal',d.canal,
    'cuerpo',d.cuerpo,'evento',j.contenido,'tipo',j.tipo,'cambio',case when j.cuando and j.donde then 'ambos' when j.cuando then 'cuando' else 'donde' end,
    'creado_en',j.contenido_en,'vence',j.vence,'suscripcion',sub);
end $$;

-- ---------- avisos_terminar: el 404/410 (web) o 410/BadDeviceToken (APNs) marca la dirección ----------
-- Misma regla que `esDireccionMuerta` en src/lib/push.ts.
create or replace function public.avisos_terminar(p_id uuid,p_token uuid,p_resultado text,p_codigo text) returns boolean
language plpgsql security definer set search_path='' as $$
declare d public.avisos_entregas;
begin
  if p_resultado not in ('enviada','reintentar','fallida','descartada') or p_codigo !~ '^[a-z0-9_]{1,60}$' then
    raise exception 'resultado invalido';
  end if;
  select * into d from public.avisos_entregas where id=p_id and token=p_token and estado='tomada'
    and lease_hasta>clock_timestamp() for update;
  if not found then return false; end if;
  update public.avisos_entregas set
    estado=case when p_resultado='reintentar' then case when intentos>=8 then 'fallida' else 'pendiente' end else p_resultado end,
    codigo=p_codigo,disponible=clock_timestamp()+make_interval(secs=>least(3600,30*power(2,d.intentos)::integer)),
    terminado_en=case when p_resultado<>'reintentar' or intentos>=8 then clock_timestamp() else null end,
    lease_hasta=null,token=null where id=d.id;
  update public.avisos_slots set token=null,vence='-infinity' where token=p_token;
  if p_resultado='fallida' and d.canal='push' and d.endpoint is not null then
    if d.endpoint like 'apns:%' and (p_codigo='apns_410' or p_codigo like 'apns\_410\_%' or p_codigo='apns_400_baddevicetoken') then
      -- Si la app volvió a registrar el token mientras Apple respondía, no se marca (actualizado_en es posterior al envío).
      update public.dispositivos_apns set muerta_en=clock_timestamp()
        where usuario_id=d.usuario_id and 'apns:'||token=d.endpoint and muerta_en is null
          and actualizado_en<=coalesce(d.primer_intento,clock_timestamp());
    elsif d.endpoint not like 'apns:%' and p_codigo in ('push_404','push_410') then
      update public.suscripciones_push set muerta_en=clock_timestamp()
        where usuario_id=d.usuario_id and endpoint=d.endpoint and muerta_en is null;
    end if;
  end if;
  return true;
end $$;

-- ---------- aviso a la administración: lo mismo para sus suscripciones de navegador ----------
create or replace function public.avisos_admin_expandir() returns boolean
language plpgsql security definer set search_path = '' as $$
declare j public.avisos_admin_jobs; u record;
begin
  select * into j from public.avisos_admin_jobs
    where not expandido and (cierra <= clock_timestamp() or tope <= clock_timestamp())
    order by creado_en for update skip locked limit 1;
  if not found then return false; end if;
  update public.avisos_admin_jobs set contenido = motivos, contenido_en = clock_timestamp() where id = j.id;
  for u in select p.id from public.perfiles p where p.rol = 'admin' and p.avisos_push loop
    insert into public.avisos_admin_entregas(job_id, usuario_id, endpoint)
      select j.id, u.id, s.endpoint from public.suscripciones_push s where s.usuario_id = u.id and s.muerta_en is null
      on conflict do nothing;
  end loop;
  update public.avisos_admin_jobs set expandido = true where id = j.id;
  return true;
end $$;

create or replace function public.avisos_admin_autorizar(p_id uuid, p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d public.avisos_admin_entregas; j public.avisos_admin_jobs; p public.perfiles; sub jsonb; muerta boolean := false;
begin
  select * into d from public.avisos_admin_entregas where id = p_id and token = p_token
    and estado = 'tomada' and lease_hasta > clock_timestamp() + interval '15 seconds' for update;
  if not found then return null; end if;
  select * into j from public.avisos_admin_jobs where id = d.job_id;
  select * into p from public.perfiles where id = d.usuario_id;
  if p.id is null or p.rol <> 'admin' or not p.avisos_push or j.contenido is null then
    update public.avisos_admin_entregas set estado = 'descartada', codigo = 'ya_no_aplica', terminado_en = clock_timestamp() where id = d.id;
    return null;
  end if;
  select jsonb_build_object('endpoint', s.endpoint, 'keys', jsonb_build_object('p256dh', s.p256dh, 'auth', s.auth)), s.muerta_en is not null
    into sub, muerta
    from public.suscripciones_push s where s.usuario_id = d.usuario_id and s.endpoint = d.endpoint;
  if sub is null or coalesce(muerta, false) then
    update public.avisos_admin_entregas set estado = 'descartada',
      codigo = case when sub is null then 'sin_endpoint' else 'direccion_muerta' end, terminado_en = clock_timestamp() where id = d.id;
    return null;
  end if;
  return jsonb_build_object('id', d.id, 'job_id', j.id, 'usuario_id', d.usuario_id, 'cuerpo', d.cuerpo,
    'motivos', j.contenido, 'creado_en', j.contenido_en, 'suscripcion', sub);
end $$;

create or replace function public.avisos_admin_terminar(p_id uuid, p_token uuid, p_resultado text, p_codigo text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare d public.avisos_admin_entregas;
begin
  if p_resultado not in ('enviada', 'reintentar', 'fallida', 'descartada') or p_codigo !~ '^[a-z0-9_]{1,60}$' then
    raise exception 'resultado invalido';
  end if;
  select * into d from public.avisos_admin_entregas where id = p_id and token = p_token and estado = 'tomada'
    and lease_hasta > clock_timestamp() for update;
  if not found then return false; end if;
  update public.avisos_admin_entregas set
    estado = case when p_resultado = 'reintentar' then case when intentos >= 8 then 'fallida' else 'pendiente' end else p_resultado end,
    codigo = p_codigo, disponible = clock_timestamp() + make_interval(secs => least(3600, 30 * power(2, d.intentos)::integer)),
    terminado_en = case when p_resultado <> 'reintentar' or intentos >= 8 then clock_timestamp() else null end,
    lease_hasta = null, token = null where id = d.id;
  if p_resultado = 'fallida' and p_codigo in ('push_404', 'push_410') and d.endpoint is not null then
    update public.suscripciones_push set muerta_en = clock_timestamp()
      where usuario_id = d.usuario_id and endpoint = d.endpoint and muerta_en is null;
  end if;
  return true;
end $$;

-- ---------- la pantalla de avisos: una dirección muerta no cuenta como «encendido» ----------
-- Así `pushCliente.estadoAvisos` dice «apagado» en ese teléfono y, al encenderlo, `suscribirPush` da de baja la
-- suscripción vieja del navegador y pide una nueva (ya lo hace con una que no reconoce como suya).
create or replace function public.mi_push_activo(p_endpoint text default null, p_token text default null)
returns boolean language sql stable security definer set search_path = '' as $$
  -- Un único snapshot; no revela si un dispositivo pertenece a otra cuenta.
  select auth.uid() is not null and ((p_endpoint is null) <> (p_token is null))
    and exists (select 1 from public.perfiles p where p.id = auth.uid() and p.avisos_push)
    and (
      (p_endpoint is not null and exists (select 1 from public.suscripciones_push s
        where s.usuario_id = auth.uid() and s.endpoint = p_endpoint and s.muerta_en is null))
      or (p_token is not null and exists (select 1 from public.dispositivos_apns d
        where d.usuario_id = auth.uid() and d.token = p_token and d.muerta_en is null))
    );
$$;

-- ---------- el cupo de diez teléfonos cuenta solo los vivos ----------
-- Sin esto, quien juntara diez direcciones muertas (nada se borra) ya no podría dar de alta su teléfono nuevo.
create or replace function public.limitar_suscripciones_push() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('role', true) in ('anon', 'authenticated') and new.usuario_id is distinct from auth.uid() then
    raise exception 'La suscripcion debe ser de la cuenta autenticada' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    -- Una renovacion conserva la identidad; moverla permite eludir el cupo
    -- mientras un INSERT concurrente todavia ve el endpoint anterior.
    if new.endpoint is distinct from old.endpoint then
      raise exception 'El endpoint no se cambia; da de baja y registra el dispositivo' using errcode = '42501';
    end if;
    if new.usuario_id <> old.usuario_id then
      raise exception 'La suscripcion no se transfiere a otra cuenta' using errcode = '42501';
    end if;
    return new;
  end if;
  -- El conteo debe ver las altas confirmadas tras esperar el bloqueo (PostgREST
  -- usa READ COMMITTED). Una transaccion con snapshot fijo no puede registrar.
  if current_setting('transaction_isolation') not in ('read committed', 'read uncommitted') then
    raise exception 'El alta de avisos requiere read committed' using errcode = '25000';
  end if;
  -- Serializa las altas de la cuenta antes de contar, incluido INSERT por la API.
  perform pg_advisory_xact_lock(7301, hashtext(new.usuario_id::text));
  if not exists (select 1 from public.suscripciones_push where endpoint = new.endpoint and usuario_id = new.usuario_id)
    and (select count(*) from public.suscripciones_push where usuario_id = new.usuario_id and muerta_en is null) >= 10 then
    raise exception 'Ya hay diez telefonos registrados en esta cuenta' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- ---------- permisos: los mismos de antes, dichos otra vez ----------
revoke all on function public.avisos_expandir(), public.avisos_autorizar(uuid, uuid), public.avisos_terminar(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.avisos_expandir(), public.avisos_autorizar(uuid, uuid), public.avisos_terminar(uuid, uuid, text, text)
  to service_role;
revoke all on function public.avisos_admin_expandir(), public.avisos_admin_autorizar(uuid, uuid), public.avisos_admin_terminar(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.avisos_admin_expandir(), public.avisos_admin_autorizar(uuid, uuid), public.avisos_admin_terminar(uuid, uuid, text, text)
  to service_role;
revoke all on function public.mi_push_activo(text, text) from public, anon, authenticated, service_role;
grant execute on function public.mi_push_activo(text, text) to authenticated;
revoke execute on function public.limitar_suscripciones_push() from public, anon, authenticated;
grant execute on function public.limitar_suscripciones_push() to service_role;

commit;
