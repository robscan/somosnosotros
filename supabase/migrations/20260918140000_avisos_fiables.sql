-- OL-079. Outbox local: ninguna llamada HTTP ni tarea cron se instala aqui.
begin;
-- La migracion NO activa envios. El gestor fija corte/captura/entrega por separado.
create table public.avisos_config (
  id boolean primary key default true check (id),
  capturar boolean not null default false,
  entregar boolean not null default false,
  corte timestamptz,
  recordatorios_desde timestamptz
);
insert into public.avisos_config(id) values(true);
alter table public.avisos_config enable row level security;
revoke all on public.avisos_config from public,anon,authenticated,service_role;
grant select on public.avisos_config to service_role;
create table public.avisos_origen (
  evento_id uuid primary key,
  autor uuid references public.perfiles on delete set null,
  nativo boolean not null,
  creado_en timestamptz not null default clock_timestamp()
);
create index avisos_origen_autor on public.avisos_origen(autor, creado_en);
-- Arranque conservador de la cuota; no crea jobs ni notifica datos historicos.
insert into public.avisos_origen(evento_id,autor,nativo,creado_en)
  select id,creado_por,false,creado_en from public.eventos where creado_en>clock_timestamp()-interval '24 hours';
create table public.avisos_jobs (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos on delete cascade,
  clave text not null,
  tipo text not null check (tipo in ('nuevo_evento','cambio','recordatorio')),
  actor uuid references public.perfiles on delete set null,
  cuando boolean not null default false,
  donde boolean not null default false,
  revision timestamptz not null,
  creado_en timestamptz not null default clock_timestamp(),
  vence timestamptz not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','activo','obsoleto','suprimido','caducado')),
  cursor_usuario uuid,
  expandido boolean not null default false,
  contenido jsonb,
  contenido_en timestamptz,
  recordatorio_inicio timestamptz,
  unique(evento_id, clave)
);
create index avisos_jobs_trabajo on public.avisos_jobs(creado_en) where not expandido;
create table public.avisos_entregas (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.avisos_jobs on delete cascade,
  usuario_id uuid not null references public.perfiles on delete cascade,
  canal text not null check (canal in ('correo','push')),
  endpoint text not null default '',
  estado text not null default 'pendiente' check (estado in ('pendiente','tomada','enviada','descartada','fallida','caducada')),
  intentos integer not null default 0,
  disponible timestamptz not null default clock_timestamp(),
  token uuid,
  lease_hasta timestamptz,
  cuerpo text,
  primer_intento timestamptz,
  codigo text,
  terminado_en timestamptz,
  unique(job_id, usuario_id, canal, endpoint),
  check ((canal='correo' and endpoint='') or (canal='push' and endpoint<>''))
);
create index avisos_entregas_pendientes on public.avisos_entregas(disponible) where estado in ('pendiente','tomada');
create table public.avisos_slots (
  numero smallint primary key check (numero between 1 and 4),
  token uuid,
  vence timestamptz not null default '-infinity'
);
insert into public.avisos_slots(numero) values(1),(2),(3),(4);
alter table public.novedades add column aviso_job_id uuid references public.avisos_jobs on delete set null;
create unique index novedades_job_usuario on public.novedades(usuario_id, aviso_job_id);

alter table public.avisos_origen enable row level security;
alter table public.avisos_jobs enable row level security;
alter table public.avisos_entregas enable row level security;
alter table public.avisos_slots enable row level security;
revoke all on public.avisos_origen, public.avisos_jobs, public.avisos_entregas, public.avisos_slots from public, anon, authenticated;
grant all on public.avisos_origen, public.avisos_jobs, public.avisos_entregas, public.avisos_slots to service_role;

-- Ejecutado despues de eventos_tocar: ni now() en una transaccion larga ni un
-- actualizado_en enviado por el cliente pueden reutilizar una revision anterior.
create function public.avisos_revision_evento() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  return new;
end $$;
create trigger zz_avisos_revision before update on public.eventos
  for each row execute function public.avisos_revision_evento();

create function public.avisos_encolar(p_evento uuid, p_nuevo boolean, p_cuando boolean, p_donde boolean) returns void
language plpgsql security definer set search_path='' as $$
declare
  e public.eventos;
  k text := 'tx:' || txid_current()::text;
  permitido boolean := true;
  optin boolean := coalesce(current_setting('app.avisos_outbox',true),'')='on';
  cfg public.avisos_config;
begin
  select * into cfg from public.avisos_config where id;
  if optin and (not cfg.capturar or cfg.corte is null or cfg.corte>clock_timestamp()) then
    raise exception 'outbox no habilitado' using errcode='55000';
  end if;
  select * into e from public.eventos where id=p_evento;
  if not found then return; end if;
  -- Incluso una correccion interna invalida avisos viejos; nunca crea envios historicos.
  update public.avisos_jobs set estado='obsoleto'
    where evento_id=e.id and clave<>k and estado in ('pendiente','activo')
      -- Un alta aun sin materializar puede avisar la version final, no perder sus seguidores.
      and not (optin and tipo='nuevo_evento' and contenido is null);
  if auth.uid() is null or not optin then return; end if;
  if p_nuevo then
    if current_setting('transaction_isolation') not in ('read committed','read uncommitted') then
      raise exception 'avisos requieren READ COMMITTED' using errcode='25001';
    end if;
    perform pg_advisory_xact_lock(7305, hashtext(auth.uid()::text));
    select count(*) < 3 into permitido from public.avisos_origen
      where autor=auth.uid() and creado_en > clock_timestamp()-interval '24 hours';
  end if;
  insert into public.avisos_jobs(evento_id,clave,tipo,actor,cuando,donde,revision,vence,estado)
    values(e.id,k,case when p_nuevo then 'nuevo_evento' else 'cambio' end,auth.uid(),p_cuando,p_donde,
      e.actualizado_en,least(clock_timestamp()+interval '23 hours',e.inicio),case when permitido then 'pendiente' else 'suprimido' end)
    on conflict(evento_id,clave) do update set
      cuando=public.avisos_jobs.cuando or excluded.cuando,
      donde=public.avisos_jobs.donde or excluded.donde,
      revision=excluded.revision;
end $$;

create function public.avisos_evento_trigger() returns trigger
language plpgsql security definer set search_path='' as $$
declare c boolean; d boolean;
begin
  if tg_op='INSERT' then
    if auth.uid() is not null then
      perform pg_advisory_xact_lock(7305,hashtext(auth.uid()::text));
    end if;
    -- La cuota se cuenta antes de registrar esta alta y se conserva tras borrar el evento.
    perform public.avisos_encolar(new.id,true,false,false);
    insert into public.avisos_origen(evento_id,autor,nativo) values(new.id,auth.uid(),auth.uid() is not null);
  else
    c := row(old.inicio,old.fin,old.zona) is distinct from row(new.inicio,new.fin,new.zona);
    d := row(old.lugar_id,old.sitio_texto,old.sitio_lat,old.sitio_lng,old.sitio_reservado,to_jsonb(old)->>'sitio_direccion')
      is distinct from row(new.lugar_id,new.sitio_texto,new.sitio_lat,new.sitio_lng,new.sitio_reservado,to_jsonb(new)->>'sitio_direccion');
    if c or d then perform public.avisos_encolar(new.id,false,c,d); end if;
    update public.avisos_jobs set revision=new.actualizado_en
      where evento_id=new.id and clave='tx:'||txid_current()::text;
  end if;
  return null;
end $$;
create trigger avisos_evento after insert or update on public.eventos
  for each row execute function public.avisos_evento_trigger();

create function public.avisos_privado_trigger() returns trigger
language plpgsql security definer set search_path='' as $$
declare id_evento uuid; relevante boolean;
begin
  id_evento := case when tg_op='DELETE' then old.evento_id else new.evento_id end;
  relevante := tg_op<>'UPDATE';
  if tg_op='UPDATE' then
    if old.evento_id is distinct from new.evento_id then
      update public.eventos set actualizado_en=clock_timestamp() where id=old.evento_id;
      perform public.avisos_encolar(old.evento_id,false,false,true);
      relevante := true;
    end if;
    relevante := relevante or row(old.direccion,old.lat,old.lng,old.indicaciones,old.revelar_desde)
      is distinct from row(new.direccion,new.lat,new.lng,new.indicaciones,new.revelar_desde);
  end if;
  if relevante then
    -- Tambien los cambios SQL directos de la direccion invalidan formularios abiertos.
    update public.eventos set actualizado_en=clock_timestamp() where id=id_evento;
    perform public.avisos_encolar(id_evento,false,false,true);
  end if;
  return null;
end $$;
create trigger avisos_privado after insert or update or delete on public.eventos_sitio_privado
  for each row execute function public.avisos_privado_trigger();

-- Solo esta ruta de la app nueva opta por outbox. Las escrituras de la app vieja
-- no encolan, incluso durante la convivencia de deployments; conservan su after.
-- Invoker conserva RLS. La migracion 181600 puede redefinir la RPC interior sin
-- copiar ni perder la marca. No hay parametro de cliente para elegir actor/cuota.
create function public.guardar_evento_con_avisos(p_evento uuid,p_datos jsonb,p_privado jsonb,p_quien jsonb,
  p_revision timestamptz default null,p_operacion uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare anterior text:=current_setting('app.avisos_outbox',true); resultado jsonb;
begin
  perform set_config('app.avisos_outbox','on',true);
  resultado := public.guardar_evento_completo(p_evento,p_datos,p_privado,p_quien,p_revision,p_operacion);
  perform set_config('app.avisos_outbox',coalesce(anterior,''),true);
  return resultado;
end $$;
revoke all on function public.guardar_evento_con_avisos(uuid,jsonb,jsonb,jsonb,timestamptz,uuid) from public,anon;
grant execute on function public.guardar_evento_con_avisos(uuid,jsonb,jsonb,jsonb,timestamptz,uuid) to authenticated;

-- Solo campos publicos; nunca direccion reservada, indicaciones ni coordenadas privadas.
create function public.avisos_evento_publico(p_evento uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',e.id,'titulo',e.titulo,'inicio',e.inicio,'fin',e.fin,'zona',e.zona,
    'sitio_texto',e.sitio_texto,'sitio_reservado',e.sitio_reservado,
    'sitio_direccion',case when e.sitio_reservado then null else to_jsonb(e)->>'sitio_direccion' end,
    'lugar',case when l.id is null then null else jsonb_build_object('nombre',l.nombre,'portada',null) end)
  from public.eventos e left join public.lugares l on l.id=e.lugar_id
  where e.id=p_evento and e.visible and e.inicio>clock_timestamp()
    and (l.id is null or (l.visible and not l.privado));
$$;

create function public.avisos_destinatarios(p_job uuid) returns setof uuid
language sql stable security definer set search_path='' as $$
  select p.id from public.perfiles p
  join public.avisos_jobs j on j.id=p_job join public.eventos e on e.id=j.evento_id
  where p.id is distinct from j.actor and p.id is distinct from e.creado_por
    and case when j.tipo='nuevo_evento' then exists (
      select 1 from public.seguimientos s where s.usuario_id=p.id and
        (s.lugar_id=e.lugar_id or exists (select 1 from public.eventos_artistas a
          join public.artistas ar on ar.id=a.artista_id and ar.visible
          where a.evento_id=e.id and a.artista_id=s.artista_id))
    ) else exists (select 1 from public.asistencias a where a.usuario_id=p.id and a.evento_id=e.id and a.estado='voy') end;
$$;

-- Una sentencia set-based, sin techo REST. Una correccion que invalido un job
-- permite otro para quienes aun no habian iniciado su entrega (ver expansion).
create function public.avisos_recordatorios() returns integer
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  if not exists(select 1 from public.avisos_config where id and entregar and recordatorios_desde<=clock_timestamp()) then return 0; end if;
  insert into public.avisos_jobs(evento_id,clave,tipo,revision,vence,recordatorio_inicio)
    select e.id,'rec:'||e.inicio::text||':'||e.actualizado_en::text,'recordatorio',e.actualizado_en,e.inicio,e.inicio
    from public.eventos e where e.visible and e.inicio>clock_timestamp()
      and e.inicio<=clock_timestamp()+interval '24 hours'
      -- Voy vigente autoriza recordatorios futuros incluso de eventos previos/importados.
      -- La procedencia solo limita anuncios de alta, no la intencion del asistente.
      and exists(select 1 from public.asistencias a where a.evento_id=e.id and a.estado='voy')
      and not exists(select 1 from public.avisos_jobs j where j.evento_id=e.id and j.tipo='recordatorio'
        and j.recordatorio_inicio=e.inicio and j.estado<>'obsoleto')
      and public.avisos_evento_publico(e.id) is not null
    on conflict(evento_id,clave) do nothing;
  get diagnostics n=row_count;
  return n;
end $$;

-- Expande un bloque de 100 personas por llamada; cursor persistente, filas finales
-- del guardado visibles porque este worker corre en OTRA transaccion tras el commit.
create function public.avisos_expandir() returns boolean
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
    if p.avisos_correo and not (j.tipo='recordatorio' and exists (
      select 1 from public.avisos_entregas anterior join public.avisos_jobs origen on origen.id=anterior.job_id
      where origen.evento_id=j.evento_id and origen.recordatorio_inicio=j.recordatorio_inicio
        and origen.id<>j.id and anterior.usuario_id=u and anterior.canal='correo'
        and (anterior.primer_intento is not null or anterior.estado='enviada'))) then
      insert into public.avisos_entregas(job_id,usuario_id,canal) values(j.id,u,'correo') on conflict do nothing;
    end if;
    if p.avisos_push then
      insert into public.avisos_entregas(job_id,usuario_id,canal,endpoint)
        select j.id,u,'push',s.endpoint from public.suscripciones_push s where s.usuario_id=u
          and not (j.tipo='recordatorio' and exists (
            select 1 from public.avisos_entregas anterior join public.avisos_jobs origen on origen.id=anterior.job_id
            where origen.evento_id=j.evento_id and origen.recordatorio_inicio=j.recordatorio_inicio
              and origen.id<>j.id and anterior.usuario_id=u and anterior.canal='push' and anterior.endpoint=s.endpoint
              and (anterior.primer_intento is not null or anterior.estado='enviada'))) on conflict do nothing;
    end if;
  end loop;
  update public.avisos_jobs set cursor_usuario=ids[array_length(ids,1)],expandido=array_length(ids,1)<100 where id=j.id;
  return true;
end $$;

-- Cuatro slots globales, no cuatro por instancia de Vercel. No se mantiene una
-- transaccion de base abierta durante HTTP; los tokens cercan las confirmaciones.
create function public.avisos_tomar() returns jsonb
language plpgsql security definer set search_path='' as $$
declare s smallint; d public.avisos_entregas; t uuid:=gen_random_uuid();
begin
  if not exists(select 1 from public.avisos_config where id and entregar) then return null; end if;
  update public.avisos_entregas pendiente set estado='caducada',codigo='caducidad',terminado_en=clock_timestamp()
    from public.avisos_jobs j where pendiente.job_id=j.id and pendiente.estado in ('pendiente','tomada')
      and (j.vence<=clock_timestamp() or j.estado not in ('pendiente','activo')
        or pendiente.primer_intento<clock_timestamp()-interval '23 hours' or pendiente.intentos>=8)
      and (pendiente.lease_hasta is null or pendiente.lease_hasta<=clock_timestamp());
  select numero into s from public.avisos_slots where vence<=clock_timestamp() order by numero for update skip locked limit 1;
  if not found then return null; end if;
  select d0.* into d from public.avisos_entregas d0 join public.avisos_jobs j on j.id=d0.job_id
    where d0.estado in ('pendiente','tomada') and d0.disponible<=clock_timestamp()
      and (d0.lease_hasta is null or d0.lease_hasta<=clock_timestamp())
      and j.estado in ('pendiente','activo') and j.vence>clock_timestamp() and d0.intentos<8
    order by d0.disponible,d0.id for update of d0 skip locked limit 1;
  if not found then return null; end if;
  update public.avisos_slots set token=t,vence=clock_timestamp()+interval '90 seconds' where numero=s;
  update public.avisos_entregas set token=t,lease_hasta=clock_timestamp()+interval '90 seconds',
    intentos=intentos+1,estado='tomada' where id=d.id returning * into d;
  return jsonb_build_object('id',d.id,'token',t,'lease_hasta',d.lease_hasta);
end $$;

create function public.avisos_autorizar(p_id uuid,p_token uuid) returns jsonb
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
  if d.canal='push' then
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

create function public.avisos_preparar(p_id uuid,p_token uuid,p_cuerpo text) returns text
language plpgsql security definer set search_path='' as $$
declare b text;
begin
  if p_cuerpo is null or octet_length(p_cuerpo)>65536 then raise exception 'cuerpo invalido'; end if;
  update public.avisos_entregas set cuerpo=coalesce(cuerpo,p_cuerpo),primer_intento=coalesce(primer_intento,clock_timestamp())
    where id=p_id and token=p_token and estado='tomada' and lease_hasta>clock_timestamp()+interval '15 seconds'
    returning cuerpo into b;
  return b;
end $$;

create function public.avisos_terminar(p_id uuid,p_token uuid,p_resultado text,p_codigo text) returns boolean
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
  return true;
end $$;

create function public.avisos_estado() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('pendientes',(select count(*) from public.avisos_entregas where estado in ('pendiente','tomada')),
    'fallidas',(select count(*) from public.avisos_entregas where estado='fallida'),
    'caducadas',(select count(*) from public.avisos_entregas where estado='caducada'),
    'jobs_sin_expandir',(select count(*) from public.avisos_jobs where not expandido and (estado in ('pendiente','activo') or tipo='cambio')));
$$;

revoke all on function public.avisos_revision_evento(),public.avisos_encolar(uuid,boolean,boolean,boolean),
  public.avisos_evento_trigger(),public.avisos_privado_trigger(),public.avisos_evento_publico(uuid),public.avisos_destinatarios(uuid),
  public.avisos_recordatorios(),public.avisos_expandir(),public.avisos_tomar(),public.avisos_autorizar(uuid,uuid),
  public.avisos_preparar(uuid,uuid,text),public.avisos_terminar(uuid,uuid,text,text),public.avisos_estado()
from public,anon,authenticated;
grant execute on function public.avisos_recordatorios(),public.avisos_expandir(),public.avisos_tomar(),
  public.avisos_autorizar(uuid,uuid),public.avisos_preparar(uuid,uuid,text),public.avisos_terminar(uuid,uuid,text,text),public.avisos_estado()
to service_role;
commit;
