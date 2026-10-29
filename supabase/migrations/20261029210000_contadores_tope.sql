-- somosnosotros · OL-485 · contadores sin sesión que no se puedan inflar (R2 del barrido de seguridad OL-482, bitácora 517)
--
-- El barrido del 2026-10-29 encontró que lo que se cuenta sin sesión se podía inflar desde un programa: seis peticiones sin cookie bastaban
-- para poner un evento en Destacados (cada petición sin cookie es «otra persona»), y lo mismo con «Avisos abiertos» y con la medición.
-- Decisión del founder: tope por evento y hora, sin guardar direcciones IP ni nada que identifique a nadie.
--
-- Solo añade:
--   1. `contadores_hora`: cuántas veces se contó algo en una hora (qué se cuenta, de qué, la hora en punto y el número). Sin cuenta, cookie,
--      IP, teléfono ni navegador: un número por cosa y por hora. Las filas de hace más de dos días se borran solas.
--   2. `contador_tomar(ámbito, clave, tope)`: suma uno si todavía no llega al tope de esa hora y dice si cupo. Solo la llave de servicio.
--   3. `contar_vista_evento` y `contar_vista_evento_origen` (create or replace, mismas firmas, mismos permisos, el resto igual que en
--      20261023150000_destacados_automaticos.sql y 20261027120000_espejo_facebook.sql): una vista SIN cuenta que sería nueva solo se guarda si
--      el evento lleva menos de 30 vistas sin cuenta en la hora en curso. Las vistas con cuenta no tienen tope (una por cuenta y día ya las
--      limita: inflarlas exige crear cuentas). La que pasa del tope no se guarda y la función dice false, como una repetida.
--   4. `avisos_contar_abierto` (create or replace, misma firma, el resto igual que en 20261029190000_avisos_forma.sql): por tipo y hora, hasta
--      30 o, si salieron más, hasta los avisos de ese tipo que llegaron a un teléfono en los dos últimos días (no se pueden abrir más de los
--      que salieron).
--   5. `medir_contar(nombre)`: el tope de `POST /api/medir` antes de mandar a Google, por nombre de la lista cerrada y hora: 300.
begin;

-- ---------- 1. Los contadores por hora ----------
create table public.contadores_hora (
  ambito text not null check (ambito in ('vista', 'aviso_abierto', 'medir')),
  clave text not null check (clave ~ '^[a-z0-9_-]{1,40}$'),
  hora timestamptz not null,
  n integer not null check (n >= 1),
  primary key (ambito, clave, hora)
);
comment on table public.contadores_hora is
  'OL-485: cuántas veces se contó algo sin sesión en una hora (vista de un evento sin cuenta, aviso abierto por tipo, medición por nombre), para no pasar del tope. Sin cuenta, cookie, IP ni navegador. Solo la escribe contador_tomar; se borra a los dos días.';
create index contadores_hora_hora_idx on public.contadores_hora (hora);
alter table public.contadores_hora enable row level security;
revoke all on public.contadores_hora from public, anon, authenticated;

-- ---------- 2. Tomar un lugar en el contador de la hora ----------
-- Suma uno al contador de (ámbito, clave) en la hora en curso si todavía no llega a p_tope, de una sola vez (dos llamadas a la vez no pasan
-- las dos del tope: la segunda espera a la fila de la primera). Devuelve true si cupo. La primera de cada hora borra lo de hace más de dos días.
create function public.contador_tomar(p_ambito text, p_clave text, p_tope integer)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_hora timestamptz := date_trunc('hour', now());
  v_n integer;
begin
  if p_ambito is null or p_clave is null or p_tope is null or p_tope < 1
    or p_ambito not in ('vista', 'aviso_abierto', 'medir') or p_clave !~ '^[a-z0-9_-]{1,40}$' then
    return false;
  end if;
  insert into public.contadores_hora as c (ambito, clave, hora, n)
  values (p_ambito, p_clave, v_hora, 1)
  on conflict (ambito, clave, hora) do update set n = c.n + 1 where c.n < p_tope
  returning c.n into v_n;
  if v_n is null then
    return false;
  end if;
  if v_n = 1 then
    delete from public.contadores_hora c where c.hora < v_hora - interval '2 days';
  end if;
  return true;
end;
$$;
comment on function public.contador_tomar(text, text, integer) is
  'OL-485: suma uno al contador de la hora si no llega al tope y dice si cupo. Sin datos de nadie. Solo service_role (y las funciones de la base).';
revoke all on function public.contador_tomar(text, text, integer) from public, anon, authenticated;
grant execute on function public.contador_tomar(text, text, integer) to service_role;

-- ---------- 3. Las vistas: tope de 30 por evento y hora para las que llegan sin cuenta ----------
-- Igual que en 20261023150000_destacados_automaticos.sql, más el tope: la vista sin cuenta se guarda primero (si es repetida, no hay nada que
-- topar) y, si es nueva y el evento ya llegó a 30 vistas sin cuenta en esta hora, se quita en la misma llamada y no cuenta.
create or replace function public.contar_vista_evento(p_evento uuid, p_visitante text, p_usuario uuid default null)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_autor uuid;
  v_zona text;
  v_dia date;
  v_sal text;
  v_clave text;
begin
  if p_evento is null or p_visitante is null or p_visitante !~ '^[A-Za-z0-9_-]{16,64}$' then
    return false;
  end if;
  select e.creado_por, e.zona into v_autor, v_zona
  from public.eventos e
  left join public.lugares l on l.id = e.lugar_id
  where e.id = p_evento and e.visible and e.termina >= now() and (e.lugar_id is null or (l.visible and not l.privado));
  if not found then
    return false;
  end if;
  if p_usuario is not null and (p_usuario = v_autor or public.rol_en(p_usuario, now()) = 'admin') then
    return false;
  end if;
  v_dia := (now() at time zone coalesce(v_zona, 'America/Mexico_City'))::date;
  select s.sal into v_sal from public.vistas_sal s;
  v_clave := encode(sha256(convert_to(v_sal || ':' || p_visitante || ':' || p_evento::text || ':' || v_dia::text, 'UTF8')), 'hex');
  insert into public.vistas_evento (evento_id, dia, clave)
  values (p_evento, v_dia, v_clave)
  on conflict do nothing;
  if not found then
    return false;
  end if;
  -- OL-485: sin cuenta, hasta 30 vistas nuevas por evento y hora.
  if p_usuario is null and not public.contador_tomar('vista', p_evento::text, 30) then
    delete from public.vistas_evento v where v.evento_id = p_evento and v.dia = v_dia and v.clave = v_clave;
    return false;
  end if;
  return true;
end;
$$;
comment on function public.contar_vista_evento(uuid, text, uuid) is
  'OL-459: una vista por visitante, evento y día; no cuenta a la administración ni a quien publicó el evento, ni eventos ocultos o que ya pasaron. OL-485: sin cuenta, hasta 30 vistas nuevas por evento y hora. Solo service_role.';
revoke all on function public.contar_vista_evento(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.contar_vista_evento(uuid, text, uuid) to service_role;

-- Igual que en 20261027120000_espejo_facebook.sql, más el mismo tope (el mismo contador: una vista es una vista, llegue o no de una red).
create or replace function public.contar_vista_evento_origen(p_evento uuid, p_visitante text, p_usuario uuid, p_origen text, p_medio text)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_autor uuid;
  v_zona text;
  v_dia date;
  v_sal text;
  v_clave text;
  v_origen text := case when p_origen in ('instagram', 'facebook') then p_origen end;
  v_medio text;
begin
  v_medio := case when v_origen is not null and p_medio in ('post', 'story') then p_medio end;
  if p_evento is null or p_visitante is null or p_visitante !~ '^[A-Za-z0-9_-]{16,64}$' then
    return false;
  end if;
  select e.creado_por, e.zona into v_autor, v_zona
  from public.eventos e
  left join public.lugares l on l.id = e.lugar_id
  where e.id = p_evento and e.visible and e.termina >= now() and (e.lugar_id is null or (l.visible and not l.privado));
  if not found then
    return false;
  end if;
  if p_usuario is not null and (p_usuario = v_autor or public.rol_en(p_usuario, now()) = 'admin') then
    return false;
  end if;
  v_dia := (now() at time zone coalesce(v_zona, 'America/Mexico_City'))::date;
  select s.sal into v_sal from public.vistas_sal s;
  v_clave := encode(sha256(convert_to(v_sal || ':' || p_visitante || ':' || p_evento::text || ':' || v_dia::text, 'UTF8')), 'hex');
  insert into public.vistas_evento (evento_id, dia, clave, origen, medio)
  values (p_evento, v_dia, v_clave, v_origen, v_medio)
  on conflict do nothing;
  if found then
    -- OL-485: sin cuenta, hasta 30 vistas nuevas por evento y hora.
    if p_usuario is null and not public.contador_tomar('vista', p_evento::text, 30) then
      delete from public.vistas_evento v where v.evento_id = p_evento and v.dia = v_dia and v.clave = v_clave;
      return false;
    end if;
    return true;
  end if;
  -- Ya había entrado hoy: no cuenta otra vez; si entonces llegó sin origen y ahora con uno, se anota de dónde.
  if v_origen is not null then
    update public.vistas_evento v set origen = v_origen, medio = v_medio
    where v.evento_id = p_evento and v.dia = v_dia and v.clave = v_clave and v.origen is null;
  end if;
  return false;
end;
$$;
comment on function public.contar_vista_evento_origen(uuid, text, uuid, text, text) is
  'OL-461: contar_vista_evento (OL-459) con la red y el medio del enlace por el que llegó (utm_source, utm_medium). OL-485: sin cuenta, hasta 30 vistas nuevas por evento y hora. Solo service_role.';
revoke all on function public.contar_vista_evento_origen(uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.contar_vista_evento_origen(uuid, text, uuid, text, text) to service_role;

-- ---------- 4. Avisos abiertos: por tipo y hora, no más de los que salieron ----------
-- Igual que en 20261029190000_avisos_forma.sql, más el tope: 30 por tipo y hora sin mirar nada; pasado eso, solo si en los dos últimos días
-- llegaron a un teléfono más avisos de ese tipo que los abiertos en esta hora (los mismos «mandados» de panel_avisos, sin la administración).
create or replace function public.avisos_contar_abierto(p_tipo text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_mandados integer;
begin
  if p_tipo is null or p_tipo not in ('nuevo', 'cambio', 'recordatorio', 'cancelado') then return; end if;
  if not public.contador_tomar('aviso_abierto', p_tipo, 30) then
    select count(*)::int into v_mandados
    from public.avisos_entregas e join public.avisos_jobs j on j.id = e.job_id
    where e.canal = 'push' and e.estado = 'enviada' and e.terminado_en >= now() - interval '2 days'
      and (case j.tipo when 'nuevo_evento' then 'nuevo' else j.tipo end) = p_tipo
      and public.rol_en(e.usuario_id, e.terminado_en) <> 'admin';
    if not public.contador_tomar('aviso_abierto', p_tipo, v_mandados) then return; end if;
  end if;
  insert into public.avisos_abiertos(dia, tipo, n)
    values ((clock_timestamp() at time zone 'America/Mexico_City')::date, p_tipo, 1)
    on conflict (dia, tipo) do update set n = public.avisos_abiertos.n + 1;
end $$;
revoke all on function public.avisos_contar_abierto(text) from public, anon, authenticated;
grant execute on function public.avisos_contar_abierto(text) to service_role;

-- ---------- 5. La medición: hasta 300 por nombre y hora antes de mandar a Google ----------
-- La llama `POST /api/medir` con la llave de servicio, después de responder; si dice false, no se manda a Google. Solo el nombre del evento de
-- la lista cerrada (`src/lib/medir.ts`), nunca sus datos. Un nombre con otra forma no cuenta.
create function public.medir_contar(p_nombre text)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_nombre is null or p_nombre !~ '^[a-z][a-z0-9_]{0,39}$' then
    return false;
  end if;
  return public.contador_tomar('medir', p_nombre, 300);
end;
$$;
comment on function public.medir_contar(text) is
  'OL-485: tope de 300 por nombre de medición y hora antes de mandar a Google (POST /api/medir). Sin datos de nadie. Solo service_role.';
revoke all on function public.medir_contar(text) from public, anon, authenticated;
grant execute on function public.medir_contar(text) to service_role;

commit;
