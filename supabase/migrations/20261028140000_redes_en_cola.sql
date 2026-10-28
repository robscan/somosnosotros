-- somosnosotros · OL-465 · migración 20261028140000 · publicar en redes en segundo plano y lecturas de cartel que sobreviven al salir (bitácora 497)
-- Founder (2026-10-28): «Se tarda bastante en publicar y creo que es porque me salí de la app. ¿Tenemos posibilidad de que la publicación en
-- insta, el análisis de carteles y subida de imágenes se pueda realizar en segundo plano y que avise cuando se terminó?». Ese día publicó
-- «Cultura Mística» dos veces seguidas (20:10 y 20:11) porque la hoja no respondía.
--
-- SOLO AÑADE:
--   · `redes_trabajos`: la cola de publicaciones. «Publicar» (la hoja de Instagram, «Publicar en Facebook», «Reintentar en Facebook») guarda un
--     trabajo con todo lo decidido en la hoja (`pedido`) y responde enseguida; el trabajador (`/api/redes/correr`, con la llave de servicio) lo
--     reclama sin carreras (`turno` y `ocupada_hasta`, el truco del motor de rutinas), hace las imágenes, Instagram y Facebook guardando su avance
--     (`avance`), y lo deja `publicado` o `fallido` con lo que pasó (`resultado`), los intentos y el último error. Solo la administración lo lee; nadie
--     lo escribe desde la app salvo por `redes_encolar` (que comprueba que es la administración y que no está repetido).
--   · `redes_reciente(evento, red, formato)`: si ese evento con ese formato está en cola, publicándose o se publicó en los últimos 15 minutos (para
--     que el botón diga «Se está publicando» / «Ya se publicó hace N min» y pida confirmar). `redes_encolar(…)`: guarda el trabajo; si está repetido
--     y no se pidió repetir, no guarda y dice por qué. Las dos solo responden a la administración.
--   · `redes_latido()`: como `rutinas_latido` (OL-444), pero para la cola: si hay trabajos listos (en cola y ya les toca, o publicándose sin nadie
--     que los trabaje) llama a /api/redes/correr con `pg_net` y el mismo secreto de Vault. `pg_cron` la corre cada minuto (`redes-latido`) si la
--     extensión está instalada. Para pausarlo: select cron.unschedule('redes-latido');
--   · `cartel_lecturas`: lo que salió de leer un cartel con la API al dar de alta un evento, por persona e imagen. La lectura la sigue haciendo la
--     acción de siempre (el flujo firmado del alta no cambia), pero ahora termina aunque el teléfono se vaya a otra app y deja aquí lo leído: al
--     volver, la pantalla de espera lo recoge y sigue. Cada quien ve solo las suyas; solo el servidor escribe.
begin;

-- ---------- la cola ----------
create table public.redes_trabajos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  -- `instagram`: publicar en Instagram (y, si el pedido lo dice, espejar en Facebook). `facebook`: espejar en Facebook lo que ya está en Instagram.
  red text not null check (red in ('instagram', 'facebook')),
  -- El formato pedido: publicación (4:5; con varias imágenes sale como carrusel) o historia (9:16).
  formato text not null check (formato in ('4x5', '9x16')),
  -- Lo decidido en la hoja: recorte, diseño, texto, etiquetas quitadas, imágenes y su orden, «también en Facebook».
  pedido jsonb not null default '{}'::jsonb check (jsonb_typeof(pedido) = 'object' and pg_column_size(pedido) <= 20000),
  estado text not null default 'en_cola' check (estado in ('en_cola', 'publicando', 'publicado', 'fallido')),
  -- Lo ya hecho (las imágenes subidas, la publicación de Instagram), para no repetirlo si el trabajo se retoma.
  avance jsonb not null default '{}'::jsonb check (jsonb_typeof(avance) = 'object' and pg_column_size(avance) <= 20000),
  -- Lo que pasó, para la hoja, la lista y el aviso (enlaces, cuántas imágenes, Facebook).
  resultado jsonb check (resultado is null or (jsonb_typeof(resultado) = 'object' and pg_column_size(resultado) <= 20000)),
  intentos smallint not null default 0 check (intentos between 0 and 100),
  fallos smallint not null default 0 check (fallos between 0 and 100),
  error text check (error in ('cupo', 'imagen', 'permiso', 'empezo', 'texto', 'otro')),
  turno integer not null default 0 check (turno >= 0),
  ocupada_hasta timestamptz,
  siguiente_en timestamptz not null default now(),
  avisado_en timestamptz,
  pedido_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  terminado_en timestamptz,
  constraint redes_trabajos_terminado check ((estado in ('publicado', 'fallido')) = (terminado_en is not null)),
  constraint redes_trabajos_fallido check (estado <> 'fallido' or error is not null)
);
create index redes_trabajos_vivos_idx on public.redes_trabajos (siguiente_en) where estado in ('en_cola', 'publicando');
create index redes_trabajos_evento_idx on public.redes_trabajos (evento_id, creado_en desc);
comment on table public.redes_trabajos is 'OL-465: la cola de publicaciones en Instagram y Facebook. La guarda «Publicar» (redes_encolar) y la trabaja /api/redes/correr (llave de servicio). Solo administración.';

create function public.redes_trabajos_registro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.pedido_por := coalesce(auth.uid(), new.pedido_por);
  new.creado_en := now();
  new.actualizado_en := now();
  return new;
end $$;
create trigger redes_trabajos_registro before insert on public.redes_trabajos
  for each row execute function public.redes_trabajos_registro();
revoke execute on function public.redes_trabajos_registro() from public, anon, authenticated;
grant execute on function public.redes_trabajos_registro() to service_role;

alter table public.redes_trabajos enable row level security;
revoke all on public.redes_trabajos from public, anon, authenticated;
grant select on public.redes_trabajos to authenticated;
grant all on public.redes_trabajos to service_role;
create policy "redes_trabajos: la administración lee" on public.redes_trabajos for select to authenticated
  using (public.es_admin());

-- ---------- ¿ya está en camino o se acaba de publicar? ----------
-- `{ "estado": "publicando" }` si ese evento con ese formato está en cola o publicándose (para Facebook, también un trabajo de Instagram que lo
-- espeja); `{ "estado": "publicado", "minutos": N }` si salió en los últimos 15 minutos; null si no (o si quien pregunta no es la administración).
-- Un carrusel cuenta como publicación (4:5).
create function public.redes_reciente(p_evento uuid, p_red text, p_formato text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_cuando timestamptz;
begin
  if not public.es_admin() then
    return null;
  end if;
  if exists (
    select 1 from public.redes_trabajos t
    where t.evento_id = p_evento and t.estado in ('en_cola', 'publicando') and t.formato = p_formato
      and (t.red = p_red or (p_red = 'facebook' and t.red = 'instagram' and coalesce((t.pedido ->> 'facebook')::boolean, false)))
  ) then
    return jsonb_build_object('estado', 'publicando');
  end if;
  if p_red = 'instagram' then
    select max(ip.creado_en) into v_cuando from public.instagram_publicaciones ip
    where ip.evento_id = p_evento and ip.estado = 'publicada' and ip.creado_en > now() - interval '15 minutes'
      and (case when ip.formato = 'carrusel' then '4x5' else ip.formato end) = p_formato;
  else
    select max(fp.creado_en) into v_cuando from public.facebook_publicaciones fp
    where fp.evento_id = p_evento and fp.estado = 'publicada' and fp.creado_en > now() - interval '15 minutes'
      and (case when fp.formato = 'carrusel' then '4x5' else fp.formato end) = p_formato;
  end if;
  if v_cuando is not null then
    return jsonb_build_object('estado', 'publicado', 'minutos', greatest(0, floor(extract(epoch from now() - v_cuando) / 60))::integer);
  end if;
  return null;
end $$;
revoke all on function public.redes_reciente(uuid, text, text) from public, anon;
grant execute on function public.redes_reciente(uuid, text, text) to authenticated, service_role;

-- ---------- guardar un trabajo ----------
-- Solo la administración. Dos toques seguidos (o dos teléfonos) no guardan dos: el candado por evento y red los pone en fila y el segundo ve el
-- primero (`redes_reciente`). Si está repetido y no se pidió repetir, devuelve `{ "duplicado": … }` sin guardar; si no, `{ "id": … }`.
create function public.redes_encolar(p_evento uuid, p_red text, p_formato text, p_pedido jsonb, p_repetir boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_reciente jsonb;
  v_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo la administración publica en redes.' using errcode = '42501';
  end if;
  if p_red not in ('instagram', 'facebook') or p_formato not in ('4x5', '9x16') or p_pedido is null or jsonb_typeof(p_pedido) <> 'object' then
    raise exception 'Pedido inválido.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.eventos e where e.id = p_evento) then
    raise exception 'No existe ese evento.' using errcode = '23503';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('redes_encolar:' || p_evento::text || ':' || p_red, 465));
  v_reciente := public.redes_reciente(p_evento, p_red, p_formato);
  if v_reciente is not null and not coalesce(p_repetir, false) then
    return jsonb_build_object('duplicado', v_reciente);
  end if;
  insert into public.redes_trabajos (evento_id, red, formato, pedido) values (p_evento, p_red, p_formato, p_pedido) returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.redes_encolar(uuid, text, text, jsonb, boolean) from public, anon;
grant execute on function public.redes_encolar(uuid, text, text, jsonb, boolean) to authenticated, service_role;

-- ---------- el latido de la cola ----------
-- Cuántos trabajos esperan y nadie trabaja: en cola y ya les toca (`siguiente_en`, la espera entre reintentos), o publicándose con
-- `ocupada_hasta` vencido (la función que lo tenía se cayó).
create function public.redes_vivos() returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer
  from public.redes_trabajos t
  where (t.estado = 'en_cola' and t.siguiente_en <= now())
     or (t.estado = 'publicando' and coalesce(t.ocupada_hasta <= now(), true));
$$;
revoke all on function public.redes_vivos() from public, anon, authenticated, service_role;

create function public.redes_latido() returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_vivos integer := public.redes_vivos();
  v_url text;
  v_secreto text;
  v_llamadas integer;
begin
  if v_vivos = 0 then
    return 0;
  end if;
  if to_regclass('vault.decrypted_secrets') is null
     or to_regprocedure('net.http_post(text, jsonb, jsonb, jsonb, integer)') is null then
    raise notice 'redes_latido: falta Vault o pg_net; no se llama';
    return 0;
  end if;
  execute $q$select (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'redes_url' limit 1)$q$ into v_url;
  if v_url is null then
    execute $q$select regexp_replace(s.decrypted_secret, '/api/avisos-pendientes/?$', '/api/redes/correr')
      from vault.decrypted_secrets s where s.name = 'avisos_url' and s.decrypted_secret ~ '/api/avisos-pendientes/?$' limit 1$q$ into v_url;
  end if;
  execute $q$select coalesce(
      (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'rutinas_cron_secret' limit 1),
      (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'avisos_cron_secret' limit 1))$q$ into v_secreto;
  if v_url is null or v_url !~ '^https://[^/@]+/api/redes/correr$' or coalesce(v_secreto, '') = '' then
    raise notice 'redes_latido: falta la dirección o el secreto en Vault; no se llama';
    return 0;
  end if;
  v_llamadas := least(v_vivos, 3);
  for i in 1 .. v_llamadas loop
    execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := $4)'
      using v_url, '{}'::jsonb, jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secreto), 10000;
  end loop;
  return v_llamadas;
end $$;
revoke all on function public.redes_latido() from public, anon, authenticated, service_role;
comment on function public.redes_latido() is 'OL-465: si hay trabajos de redes listos, pide uno a /api/redes/correr con pg_net (una llamada por trabajo, tres como mucho). La corre pg_cron cada minuto (redes-latido).';

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('redes-latido', '* * * * *', 'select public.redes_latido()');
  end if;
end $$;

-- ---------- lo leído de un cartel ----------
create table public.cartel_lecturas (
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  imagen text not null check (char_length(imagen) between 1 and 500),
  estado text not null default 'leyendo' check (estado in ('leyendo', 'leida', 'fallida', 'sin_cupo')),
  resultado jsonb check (resultado is null or (jsonb_typeof(resultado) = 'object' and pg_column_size(resultado) <= 60000)),
  creado_en timestamptz not null default now(),
  terminado_en timestamptz,
  primary key (usuario_id, imagen),
  constraint cartel_lecturas_terminada check ((estado = 'leyendo') = (terminado_en is null))
);
create index cartel_lecturas_creado_idx on public.cartel_lecturas (creado_en);
comment on table public.cartel_lecturas is 'OL-465: lo que salió de leer un cartel al dar de alta un evento, para recogerlo al volver si el teléfono se fue a otra app mientras se leía. Cada quien las suyas; solo el servidor escribe.';

alter table public.cartel_lecturas enable row level security;
revoke all on public.cartel_lecturas from public, anon, authenticated;
grant select on public.cartel_lecturas to authenticated;
grant all on public.cartel_lecturas to service_role;
create policy "cartel_lecturas: cada quien las suyas" on public.cartel_lecturas for select to authenticated
  using (usuario_id = auth.uid());

commit;
