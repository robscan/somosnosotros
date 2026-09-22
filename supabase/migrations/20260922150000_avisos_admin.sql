-- OL-115. Avisos al administrador: dos tablas nuevas (avisos_admin_jobs/avisos_admin_entregas),
-- mismo cron/endpoint/worker que el outbox existente (20260918140000_avisos_fiables.sql).
-- No se toca avisos_jobs/avisos_entregas ni sus funciones. Ningun HTTP/cron se instala aqui.

create table public.avisos_admin_jobs (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  creado_en timestamptz not null default clock_timestamp(),
  cierra timestamptz not null,
  tope timestamptz not null,
  motivos jsonb not null default '{}'::jsonb,
  contenido jsonb,
  contenido_en timestamptz,
  expandido boolean not null default false
);
create index avisos_admin_jobs_trabajo on public.avisos_admin_jobs(creado_en) where not expandido;

create table public.avisos_admin_entregas (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.avisos_admin_jobs on delete cascade,
  usuario_id uuid not null references public.perfiles on delete cascade,
  endpoint text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','tomada','enviada','descartada','fallida','caducada')),
  intentos integer not null default 0,
  disponible timestamptz not null default clock_timestamp(),
  token uuid,
  lease_hasta timestamptz,
  cuerpo text,
  primer_intento timestamptz,
  codigo text,
  terminado_en timestamptz,
  unique(job_id, usuario_id, endpoint)
);
create index avisos_admin_entregas_pendientes on public.avisos_admin_entregas(disponible) where estado in ('pendiente','tomada');

alter table public.avisos_admin_jobs enable row level security;
alter table public.avisos_admin_entregas enable row level security;
revoke all on public.avisos_admin_jobs, public.avisos_admin_entregas from public, anon, authenticated;
grant all on public.avisos_admin_jobs, public.avisos_admin_entregas to service_role;
-- Sin politicas: RLS cerrado a anon/authenticated; solo service_role las usa (igual que avisos_jobs).

-- ---------- encolar: llamado solo desde disparadores, nunca por el cliente ----------
-- Agrupa en buckets de 10 min; si el ultimo job sin expandir sigue dentro de su tope de 60 min,
-- lo extiende en vez de abrir otro (evita que un bucle de registros dispare varios push por hora).
create function public.avisos_admin_encolar(p_motivo text, p_actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ventana constant interval := interval '10 minutes';
  techo constant interval := interval '60 minutes';
  ahora timestamptz := clock_timestamp();
  bucket text := 'admin:' || to_char(date_trunc('hour', ahora) + floor(extract(minute from ahora)::int / 10) * interval '10 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  j public.avisos_admin_jobs;
  existe public.avisos_admin_jobs;
begin
  -- No se avisa a la administracion de su propia accion.
  if p_actor is not null and exists (select 1 from public.perfiles where id = p_actor and rol = 'admin') then
    return;
  end if;
  select * into j from public.avisos_admin_jobs where not expandido order by creado_en desc limit 1 for update;
  if found and j.tope > ahora then
    update public.avisos_admin_jobs set
      motivos = jsonb_set(motivos, array[p_motivo], to_jsonb(coalesce((motivos ->> p_motivo)::int, 0) + 1)),
      cierra = greatest(cierra, least(j.tope, ahora + ventana))
      where id = j.id;
    return;
  end if;
  -- Ese mismo bucket puede existir ya expandido (borde raro cuando el tope lo expulsa temprano):
  -- no volver a sumarle a un aviso que ya salio, abrir otra clave para el conteo nuevo.
  select * into existe from public.avisos_admin_jobs where clave = bucket for update;
  if found and existe.expandido then
    bucket := bucket || ':' || extract(epoch from ahora)::bigint::text;
  end if;
  insert into public.avisos_admin_jobs(clave, cierra, tope, motivos)
    values (bucket, ahora + ventana, ahora + techo, jsonb_build_object(p_motivo, 1))
    on conflict (clave) do update set
      motivos = jsonb_set(public.avisos_admin_jobs.motivos, array[p_motivo], to_jsonb(coalesce((public.avisos_admin_jobs.motivos ->> p_motivo)::int, 0) + 1)),
      cierra = greatest(public.avisos_admin_jobs.cierra, least(public.avisos_admin_jobs.tope, ahora + ventana));
end $$;
revoke all on function public.avisos_admin_encolar(text, uuid) from public, anon, authenticated;

-- ---------- disparadores: nunca rompen la accion original ----------
create function public.avisos_admin_trigger_reportes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.avisos_admin_encolar(case when new.motivo in ('es_mio', 'retirar') then 'reclamo_ficha' else 'reporte' end, new.creado_por);
  return new;
exception when others then
  raise warning 'avisos_admin: no se pudo encolar (reportes): %', sqlerrm;
  return new;
end $$;
create trigger avisos_admin_reportes after insert on public.reportes
  for each row execute function public.avisos_admin_trigger_reportes();

create function public.avisos_admin_trigger_eventos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.creado_por is not null then perform public.avisos_admin_encolar('nuevo_evento', new.creado_por); end if;
  return new;
exception when others then
  raise warning 'avisos_admin: no se pudo encolar (eventos): %', sqlerrm;
  return new;
end $$;
create trigger avisos_admin_eventos after insert on public.eventos
  for each row execute function public.avisos_admin_trigger_eventos();

create function public.avisos_admin_trigger_lugares() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.creado_por is not null then perform public.avisos_admin_encolar('nuevo_lugar', new.creado_por); end if;
  return new;
exception when others then
  raise warning 'avisos_admin: no se pudo encolar (lugares): %', sqlerrm;
  return new;
end $$;
create trigger avisos_admin_lugares after insert on public.lugares
  for each row execute function public.avisos_admin_trigger_lugares();

create function public.avisos_admin_trigger_artistas() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.creado_por is not null then perform public.avisos_admin_encolar('nuevo_artista', new.creado_por); end if;
  return new;
exception when others then
  raise warning 'avisos_admin: no se pudo encolar (artistas): %', sqlerrm;
  return new;
end $$;
create trigger avisos_admin_artistas after insert on public.artistas
  for each row execute function public.avisos_admin_trigger_artistas();

create function public.avisos_admin_trigger_perfiles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.avisos_admin_encolar('registro', new.id);
  return new;
exception when others then
  raise warning 'avisos_admin: no se pudo encolar (perfiles): %', sqlerrm;
  return new;
end $$;
create trigger avisos_admin_perfiles after insert on public.perfiles
  for each row execute function public.avisos_admin_trigger_perfiles();

-- ---------- lo que llama el worker (service_role) ----------
create function public.avisos_admin_expandir() returns boolean
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
      select j.id, u.id, s.endpoint from public.suscripciones_push s where s.usuario_id = u.id
      on conflict do nothing;
  end loop;
  update public.avisos_admin_jobs set expandido = true where id = j.id;
  return true;
end $$;

create function public.avisos_admin_tomar() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d public.avisos_admin_entregas; t uuid := gen_random_uuid();
begin
  update public.avisos_admin_entregas pendiente set estado = 'caducada', codigo = 'caducidad', terminado_en = clock_timestamp()
    from public.avisos_admin_jobs j where pendiente.job_id = j.id and pendiente.estado in ('pendiente', 'tomada')
      and (j.tope < clock_timestamp() - interval '24 hours' or pendiente.intentos >= 8)
      and (pendiente.lease_hasta is null or pendiente.lease_hasta <= clock_timestamp());
  select d0.* into d from public.avisos_admin_entregas d0
    where d0.estado in ('pendiente', 'tomada') and d0.disponible <= clock_timestamp()
      and (d0.lease_hasta is null or d0.lease_hasta <= clock_timestamp()) and d0.intentos < 8
    order by d0.disponible, d0.id for update skip locked limit 1;
  if not found then return null; end if;
  update public.avisos_admin_entregas set token = t, lease_hasta = clock_timestamp() + interval '90 seconds',
    intentos = intentos + 1, estado = 'tomada' where id = d.id returning * into d;
  return jsonb_build_object('id', d.id, 'token', t, 'lease_hasta', d.lease_hasta);
end $$;

create function public.avisos_admin_autorizar(p_id uuid, p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d public.avisos_admin_entregas; j public.avisos_admin_jobs; p public.perfiles; sub jsonb;
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
  select jsonb_build_object('endpoint', s.endpoint, 'keys', jsonb_build_object('p256dh', s.p256dh, 'auth', s.auth)) into sub
    from public.suscripciones_push s where s.usuario_id = d.usuario_id and s.endpoint = d.endpoint;
  if sub is null then
    update public.avisos_admin_entregas set estado = 'descartada', codigo = 'sin_endpoint', terminado_en = clock_timestamp() where id = d.id;
    return null;
  end if;
  return jsonb_build_object('id', d.id, 'job_id', j.id, 'usuario_id', d.usuario_id, 'cuerpo', d.cuerpo,
    'motivos', j.contenido, 'creado_en', j.contenido_en, 'suscripcion', sub);
end $$;

create function public.avisos_admin_preparar(p_id uuid, p_token uuid, p_cuerpo text) returns text
language plpgsql security definer set search_path = '' as $$
declare b text;
begin
  if p_cuerpo is null or octet_length(p_cuerpo) > 4096 then raise exception 'cuerpo invalido'; end if;
  update public.avisos_admin_entregas set cuerpo = coalesce(cuerpo, p_cuerpo), primer_intento = coalesce(primer_intento, clock_timestamp())
    where id = p_id and token = p_token and estado = 'tomada' and lease_hasta > clock_timestamp() + interval '15 seconds'
    returning cuerpo into b;
  return b;
end $$;

create function public.avisos_admin_terminar(p_id uuid, p_token uuid, p_resultado text, p_codigo text) returns boolean
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
  return true;
end $$;

create function public.avisos_admin_estado() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('pendientes', (select count(*) from public.avisos_admin_entregas where estado in ('pendiente', 'tomada')),
    'fallidas', (select count(*) from public.avisos_admin_entregas where estado = 'fallida'));
$$;

revoke all on function public.avisos_admin_expandir(), public.avisos_admin_tomar(), public.avisos_admin_autorizar(uuid, uuid),
  public.avisos_admin_preparar(uuid, uuid, text), public.avisos_admin_terminar(uuid, uuid, text, text), public.avisos_admin_estado()
  from public, anon, authenticated;
grant execute on function public.avisos_admin_expandir(), public.avisos_admin_tomar(), public.avisos_admin_autorizar(uuid, uuid),
  public.avisos_admin_preparar(uuid, uuid, text), public.avisos_admin_terminar(uuid, uuid, text, text), public.avisos_admin_estado()
  to service_role;

-- El punto de la cabecera NO necesita funcion nueva: reutiliza contarPendientes() (src/app/admin/consultas.ts),
-- que ya cuenta select count(*) from reportes where not atendido, protegido por la misma politica RLS
-- "reportes: el admin lee" (es_admin()) que usa panel_pendientes(). Es el mismo dato que ya se ve en Ajustes.
