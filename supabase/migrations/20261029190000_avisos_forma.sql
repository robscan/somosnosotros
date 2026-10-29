-- somosnosotros · OL-480 · la forma de los avisos al teléfono y cuántos se abren (bitácora 512; prototipo firmado en OL-478, bitácora 510)
--
-- Solo añade:
--   1. `avisos_entregas.motivo` (nula): por qué le llega a cada persona un evento nuevo, guardado al expandir. `artista:<nombre>` si sigue a
--      alguien del cartel (va antes que el lugar) o `lugar` si sigue el lugar. Con él el aviso dice «De Luna Hermoso, a quien sigues» o
--      «Nuevo en Teatro de la Paz». Nula en los demás tipos y en las entregas de antes.
--   2. `avisos_expandir` y `avisos_autorizar`, copiadas de su última versión (20261029120000_avisos_direcciones_muertas.sql) con lo de arriba:
--      expandir llena `motivo`; autorizar lo devuelve, con la descripción del evento y la dirección del lugar (públicas: el evento visible y
--      el lugar visible y no privado, la misma regla de `avisos_evento_publico`). Mismas firmas y permisos, dichos otra vez al final. La foto
--      del evento (`avisos_evento_publico`) no cambia: las entregas que ya estaban en la cola siguen valiendo.
--   3. `avisos_abiertos`: cuántos avisos se abrieron por día y tipo. Sin cuenta, teléfono, IP ni evento. La llena `avisos_contar_abierto`, que
--      solo llama el servidor (`POST /api/avisos/abierto`) con la llave de servicio.
--   4. `panel_avisos()`: la fila «Avisos abiertos» de Administración › Últimos 7 días: cuántos salieron (entregas al teléfono enviadas) y
--      cuántos se abrieron, por tipo, contra los 7 días anteriores; sin contar a la administración. Solo la administración.
--   5. El correo se separa (founder, 2026-10-29: «separamos solicitud de aprobación por correo, la vamos a usar después para el boletín.
--      Pero actívala default para usuarios nuevos, aún sin enviar nada»): ninguna entrega de la cola sale por correo (expandir ya no las crea
--      y autorizar descarta con `correo_pausado` las que quedaran pendientes de antes), `avisos_correo` queda para el boletín (OL-138), y las
--      cuentas nuevas nacen con él encendido y su fecha (`crear_perfil`, copiado de 20261003160000_imagenes_origen_permitido.sql). Ninguna
--      fila de `perfiles` cambia. Los correos de cuenta (código de entrada, bienvenida, ficha recibida, administración) no pasan por aquí.
begin;

alter table public.avisos_entregas add column if not exists motivo text
  check (motivo is null or motivo = 'lugar' or (motivo like 'artista:%' and char_length(motivo) <= 200));
comment on column public.avisos_entregas.motivo is
  'OL-480: por qué le llega (solo evento nuevo): artista:<nombre> si sigue a alguien del cartel (antes que el lugar) o lugar. Nula en lo demás.';

-- ---------- avisos_expandir: el motivo por persona ----------
create or replace function public.avisos_expandir() returns boolean
language plpgsql security definer set search_path='' as $$
declare j public.avisos_jobs; ids uuid[]; u uuid; p public.perfiles; snap jsonb; entregable boolean; v_motivo text;
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
    -- OL-480: por qué le llega. Un artista del cartel que sigue (el primero del cartel) va antes que el lugar.
    v_motivo := null;
    if j.tipo='nuevo_evento' then
      select 'artista:'||left(ar.nombre,190) into v_motivo
        from public.eventos_artistas a
        join public.artistas ar on ar.id=a.artista_id and ar.visible
        join public.seguimientos s on s.artista_id=a.artista_id and s.usuario_id=u
        where a.evento_id=j.evento_id order by a.orden, ar.nombre limit 1;
      v_motivo := coalesce(v_motivo,'lugar');
    end if;
    -- OL-480: ya no se crean entregas por correo, de ningún tipo; `avisos_correo` es del boletín. El cambio ya quedó en Novedades (arriba),
    -- tenga o no teléfono dado de alta la persona.
    if p.avisos_push then
      insert into public.avisos_entregas(job_id,usuario_id,canal,endpoint,motivo)
        select j.id,u,'push',destino.endpoint,v_motivo from (
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

-- ---------- avisos_autorizar: el motivo, la descripción y la dirección del lugar ----------
create or replace function public.avisos_autorizar(p_id uuid,p_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.avisos_entregas; j public.avisos_jobs; p public.perfiles; sub jsonb; snap jsonb; muerta boolean := false;
  v_descripcion text; v_direccion text;
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
  -- OL-480: por correo no sale ningún aviso de la cola, tampoco uno que quedó pendiente de antes.
  if d.canal='correo' then
    update public.avisos_entregas set estado='descartada',codigo='correo_pausado',terminado_en=clock_timestamp() where id=d.id;
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
  -- OL-480: lo público que el cuerpo del aviso usa además de la foto del evento. `snap` no es nulo: el evento es visible y su lugar, si
  -- tiene, visible y no privado.
  select left(e.descripcion,300), case when e.sitio_reservado then null else left(l.direccion,200) end into v_descripcion, v_direccion
    from public.eventos e left join public.lugares l on l.id=e.lugar_id where e.id=j.evento_id;
  return jsonb_build_object('id',d.id,'job_id',j.id,'usuario_id',d.usuario_id,'canal',d.canal,
    'cuerpo',d.cuerpo,'evento',j.contenido,'tipo',j.tipo,'cambio',case when j.cuando and j.donde then 'ambos' when j.cuando then 'cuando' else 'donde' end,
    'creado_en',j.contenido_en,'vence',j.vence,'suscripcion',sub,
    'motivo',d.motivo,'descripcion',v_descripcion,'direccion',v_direccion);
end $$;

-- ---------- avisos_abiertos: cuántos se abrieron, por día y tipo, sin saber quién ----------
create table if not exists public.avisos_abiertos (
  dia date not null,
  tipo text not null check (tipo ~ '^[a-z_]{1,20}$'),
  n integer not null default 0 check (n >= 0),
  primary key (dia, tipo)
);
comment on table public.avisos_abiertos is
  'OL-480: avisos al teléfono abiertos por día (hora del centro de México) y tipo. Sin cuenta, teléfono, IP ni evento: solo el conteo.';
alter table public.avisos_abiertos enable row level security;
revoke all on public.avisos_abiertos from public, anon, authenticated;
grant select, insert, update on public.avisos_abiertos to service_role;

-- La lista cerrada de tipos es la de `src/lib/avisoAbierto.ts`; un tipo que no está no se cuenta (y no lanza: medir no rompe nada).
create or replace function public.avisos_contar_abierto(p_tipo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_tipo is null or p_tipo not in ('nuevo', 'cambio', 'recordatorio', 'cancelado') then return; end if;
  insert into public.avisos_abiertos(dia, tipo, n)
    values ((clock_timestamp() at time zone 'America/Mexico_City')::date, p_tipo, 1)
    on conflict (dia, tipo) do update set n = public.avisos_abiertos.n + 1;
end $$;
revoke all on function public.avisos_contar_abierto(text) from public, anon, authenticated;
grant execute on function public.avisos_contar_abierto(text) to service_role;

-- ---------- panel_avisos(): la fila de Administración ----------
create or replace function public.panel_avisos() returns json
language plpgsql stable security definer set search_path = '' as $$
declare hoy date := (clock_timestamp() at time zone 'America/Mexico_City')::date;
begin
  if auth.uid() is null or not public.es_admin() then
    raise exception 'solo la administración' using errcode = '42501';
  end if;
  return (
    with
    tipos(tipo) as (values ('nuevo'), ('cambio'), ('recordatorio'), ('cancelado')),
    -- Cada aviso que llegó a un teléfono o a un navegador (una persona con app y web cuenta dos), sin la administración de entonces.
    salieron as (
      select case j.tipo when 'nuevo_evento' then 'nuevo' else j.tipo end as tipo, e.terminado_en
      from public.avisos_entregas e join public.avisos_jobs j on j.id = e.job_id
      where e.canal = 'push' and e.estado = 'enviada' and e.terminado_en >= clock_timestamp() - interval '14 days'
        and public.rol_en(e.usuario_id, e.terminado_en) <> 'admin'
    ),
    abiertos as (select a.tipo, a.dia, a.n from public.avisos_abiertos a where a.dia > hoy - 14),
    por_tipo as (
      select t.tipo,
        (select count(*) from salieron s where s.tipo = t.tipo and s.terminado_en >= clock_timestamp() - interval '7 days') as mandados,
        (select coalesce(sum(a.n), 0) from abiertos a where a.tipo = t.tipo and a.dia > hoy - 7) as abiertos
      from tipos t
    )
    select json_build_object(
      'mandados', (select count(*) from salieron where terminado_en >= clock_timestamp() - interval '7 days'),
      'mandados_antes', (select count(*) from salieron where terminado_en < clock_timestamp() - interval '7 days'),
      'abiertos', (select coalesce(sum(n), 0) from abiertos where dia > hoy - 7),
      'abiertos_antes', (select coalesce(sum(n), 0) from abiertos where dia <= hoy - 7),
      'tipos', (select json_object_agg(tipo, json_build_object('mandados', mandados, 'abiertos', abiertos)) from por_tipo)
    )
  );
end $$;
revoke all on function public.panel_avisos() from public, anon;
grant execute on function public.panel_avisos() to authenticated;

-- ---------- el correo, encendido por omisión solo para las cuentas nuevas (sin mandar nada) ----------
alter table public.perfiles alter column avisos_correo set default true;
comment on column public.perfiles.avisos_correo is
  'Consentimiento para el boletín por correo (OL-138). Desde OL-480 (2026-10-29) ningún aviso de eventos sale por correo; las cuentas nuevas nacen con él encendido y su fecha en avisos_correo_desde. Se apaga en Ajustes o con la baja de cada correo.';

-- Igual que en 20261003160000_imagenes_origen_permitido.sql, más el correo encendido con su fecha (la evidencia de desde cuándo).
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, foto, rol, avisos_correo, avisos_correo_desde)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), ''), 60),
    case when public.imagen_origen_permitido(new.raw_user_meta_data ->> 'avatar_url', false, true)
      then new.raw_user_meta_data ->> 'avatar_url' else null end,
    case when exists (select 1 from public.admin_correos where lower(correo) = lower(new.email)) then 'admin' else 'usuario' end,
    true,
    now()
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ---------- permisos: los mismos de antes, dichos otra vez ----------
revoke all on function public.avisos_expandir(), public.avisos_autorizar(uuid, uuid) from public, anon, authenticated;
grant execute on function public.avisos_expandir(), public.avisos_autorizar(uuid, uuid) to service_role;

commit;
