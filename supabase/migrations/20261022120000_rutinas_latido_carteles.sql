-- somosnosotros · OL-444 · migración 20261022120000 · el latido de las rutinas en Supabase y la rutina «Buscar carteles»
--
-- 1 · El latido. Los registros de Vercel del 22 de octubre: «rutinas: no se pudo pedir el paso (respondió 508)». Cada paso del motor pedía el
--     siguiente llamando a su propia ruta (/api/rutinas/correr) y Vercel corta con 508 («Loop Detected») a una función que se llama a sí misma
--     en cadena: las corridas se quedaban «corriendo» hasta que alguien abría Ciudades o llegaba el cron diario. Ahora el siguiente paso lo pide
--     Supabase: `rutinas_latido()` mira si hay corridas vivas (una pendiente, o una «corriendo» que nadie trabaja: `resumen.ocupada_hasta`
--     vencido o vacío) y, solo si las hay, llama a la ruta con `pg_net` (una llamada por corrida libre, tres como mucho), con el secreto que ya
--     guardan los avisos en Vault (OL-086: `avisos_cron_secret`, el mismo valor que CRON_SECRET en Vercel). La dirección sale de
--     `rutinas_url` en Vault o, si no está, de `avisos_url` cambiando /api/avisos-pendientes por /api/rutinas/correr. Sin corridas vivas, sin
--     Vault, sin pg_net o sin dirección, no llama a nada. `pg_cron` la corre cada minuto (`rutinas-latido`) si la extensión está instalada
--     (en producción lo está, por los avisos); en una base sin pg_cron (el banco de pruebas) solo queda la función. El cron de Vercel sigue
--     diario (decisión del founder del 21 de septiembre). Para pausarlo: select cron.unschedule('rutinas-latido');
--
-- 2 · «Buscar carteles» (founder, 22 oct: «Haz una rutina para eventos sin cartel. Que se detone con un botón y que vaya a buscar en las redes
--     del lugar si ya salió el cartel»): una corrida de tipo `carteles` por ciudad y propuestas de tipo `cartel` (datos: evento_id, imagen,
--     pagina, titulo, inicio, lugar). Aceptar una la marca como las demás (`aceptar_propuesta` no cambia: un cartel, como un evento, no crea
--     ficha ahí); el servidor baja la imagen, la sube a Storage, la pone en `eventos.imagen` y liga la propuesta a su evento (`ficha_id`).
--
-- SOLO AÑADE: los `check` de `rutinas_corridas.tipo` y `propuestas.tipo` admiten un valor más (las filas que ya están siguen valiendo); una
-- función nueva sin permisos para nadie más que su dueño; y, si existe pg_cron, un trabajo nuevo.

-- ---------- los tipos nuevos ----------
alter table public.rutinas_corridas drop constraint rutinas_corridas_tipo_check;
alter table public.rutinas_corridas add constraint rutinas_corridas_tipo_check check (tipo in ('lugares', 'agendas', 'artistas', 'showcase', 'carteles'));
alter table public.propuestas drop constraint propuestas_tipo_check;
alter table public.propuestas add constraint propuestas_tipo_check check (tipo in ('lugar', 'evento', 'artista', 'cartel'));
comment on column public.propuestas.ficha_id is 'La ficha que se creó al aceptar (un lugar o un artista; el evento publicado de una propuesta de evento; el evento al que se le puso un cartel): la procedencia queda aquí.';

-- ---------- el latido ----------
-- Un instante de `resumen` (texto ISO) o null si no se entiende: una fila con basura no tumba el latido.
create function public.rutinas_instante(p text) returns timestamptz
language plpgsql stable set search_path = '' as $$
begin
  return p::timestamptz;
exception when others then
  return null;
end $$;
revoke all on function public.rutinas_instante(text) from public, anon, authenticated, service_role;

-- Cuántas corridas esperan un paso y nadie las está trabajando.
create function public.rutinas_vivas() returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer
  from public.rutinas_corridas c
  where c.estado = 'pendiente'
     or (c.estado = 'corriendo' and coalesce(public.rutinas_instante(c.resumen ->> 'ocupada_hasta') <= now(), true));
$$;
revoke all on function public.rutinas_vivas() from public, anon, authenticated, service_role;

create function public.rutinas_latido() returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_vivas integer := public.rutinas_vivas();
  v_url text;
  v_secreto text;
  v_llamadas integer;
begin
  if v_vivas = 0 then
    return 0;
  end if;
  if to_regclass('vault.decrypted_secrets') is null
     or to_regprocedure('net.http_post(text, jsonb, jsonb, jsonb, integer)') is null then
    raise notice 'rutinas_latido: falta Vault o pg_net; no se llama';
    return 0;
  end if;
  execute $q$select (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'rutinas_url' limit 1)$q$ into v_url;
  if v_url is null then
    execute $q$select regexp_replace(s.decrypted_secret, '/api/avisos-pendientes/?$', '/api/rutinas/correr')
      from vault.decrypted_secrets s where s.name = 'avisos_url' and s.decrypted_secret ~ '/api/avisos-pendientes/?$' limit 1$q$ into v_url;
  end if;
  execute $q$select coalesce(
      (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'rutinas_cron_secret' limit 1),
      (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'avisos_cron_secret' limit 1))$q$ into v_secreto;
  if v_url is null or v_url !~ '^https://[^/@]+/api/rutinas/correr$' or coalesce(v_secreto, '') = '' then
    raise notice 'rutinas_latido: falta la dirección o el secreto en Vault; no se llama';
    return 0;
  end if;
  v_llamadas := least(v_vivas, 3);
  for i in 1 .. v_llamadas loop
    execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := $4)'
      using v_url, '{}'::jsonb, jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secreto), 10000;
  end loop;
  return v_llamadas;
end $$;
revoke all on function public.rutinas_latido() from public, anon, authenticated, service_role;
comment on function public.rutinas_latido() is 'OL-444: si hay corridas vivas, pide un paso a /api/rutinas/correr con pg_net (una llamada por corrida libre, tres como mucho). La corre pg_cron cada minuto (rutinas-latido).';

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('rutinas-latido', '* * * * *', 'select public.rutinas_latido()');
  end if;
end $$;
