-- somosnosotros · OL-213 · avisos nativos en la app de iPhone (bitácora 242)
-- Dentro de la app el navegador interno no tiene Web Push (src/lib/pushCliente.ts lo detecta: sin PushManager), así
-- que el permiso y el token salen del puente nativo (@capacitor/push-notifications, apps/ios/package.json) y se
-- guardan aquí para que el trabajador de avisos (src/lib/avisosWorker.ts, src/lib/push.ts) los alcance por APNs.
-- Sigue el estilo de 20260914020000_push.sql (migración 0007, suscripciones_push): tabla + RLS de "cada quien las suyas".
create table public.dispositivos_apns (
  token text primary key,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  -- Lo dice la propia app con #if DEBUG (EntornoApnsPlugin.swift): Xcode cambia aps-environment a "production" al
  -- exportar para TestFlight o la tienda; en el simulador o un build de depuración es "sandbox". APNs exige mandar
  -- cada token al servidor que corresponde a SU entorno (api.push.apple.com o api.sandbox.push.apple.com).
  entorno text not null check (entorno in ('sandbox', 'produccion')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (token ~ '^[0-9a-fA-F]{32,200}$')
);
create index dispositivos_apns_usuario_idx on public.dispositivos_apns (usuario_id);
alter table public.dispositivos_apns enable row level security;
-- Cada quien maneja los suyos; el servidor (service role, en el trabajador de avisos) los lee para mandar avisos.
create policy "apns: veo los míos" on public.dispositivos_apns for select to authenticated using (usuario_id = auth.uid());
create policy "apns: registro los míos" on public.dispositivos_apns for insert to authenticated with check (usuario_id = auth.uid());
create policy "apns: actualizo los míos" on public.dispositivos_apns for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "apns: borro los míos" on public.dispositivos_apns for delete to authenticated using (usuario_id = auth.uid());

-- El motor de avisos fiables (20260918140000_avisos_fiables.sql, bitácora 113) ya reparte el canal 'push' por
-- endpoint; para que quien SOLO tiene la app (sin ninguna suscripción de navegador) también reciba algo, se suma
-- dispositivos_apns como otro origen de "endpoint" (con el prefijo 'apns:', que nunca choca con una URL https),
-- reemplazando las dos funciones tal cual estaban más esa fuente. Nada se borra ni cambia de forma para quien ya
-- tenía solo push por navegador: es la misma función, con una fuente más.
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
          select s.endpoint from public.suscripciones_push s where s.usuario_id=u
          union all
          select 'apns:'||a.token from public.dispositivos_apns a where a.usuario_id=u
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

-- Misma función que antes; solo cambia cómo arma "suscripcion" cuando el endpoint es del prefijo 'apns:' (el
-- trabajador (avisosWorker.ts) lo pasa tal cual a push.ts, que ya sabe distinguir la forma de un endpoint web).
create or replace function public.avisos_autorizar(p_id uuid,p_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.avisos_entregas; j public.avisos_jobs; p public.perfiles; sub jsonb; snap jsonb;
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
    select jsonb_build_object('apns',jsonb_build_object('token',a.token,'entorno',a.entorno)) into sub
      from public.dispositivos_apns a where a.usuario_id=d.usuario_id and 'apns:'||a.token=d.endpoint;
    if sub is null then
      update public.avisos_entregas set estado='descartada',codigo='sin_endpoint',terminado_en=clock_timestamp() where id=d.id;
      update public.avisos_slots set token=null,vence='-infinity' where token=p_token;
      return null;
    end if;
  elsif d.canal='push' then
    select jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth)) into sub
      from public.suscripciones_push s where s.usuario_id=d.usuario_id and s.endpoint=d.endpoint;
    if sub is null then
      update public.avisos_entregas set estado='descartada',codigo='sin_endpoint',terminado_en=clock_timestamp() where id=d.id;
      update public.avisos_slots set token=null,vence='-infinity' where token=p_token;
      return null;
    end if;
  end if;
  return jsonb_build_object('id',d.id,'job_id',j.id,'usuario_id',d.usuario_id,'canal',d.canal,
    'cuerpo',d.cuerpo,'evento',j.contenido,'tipo',j.tipo,'cambio',case when j.cuando and j.donde then 'ambos' when j.cuando then 'cuando' else 'donde' end,
    'creado_en',j.contenido_en,'vence',j.vence,'suscripcion',sub);
end $$;
