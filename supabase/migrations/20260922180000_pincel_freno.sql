-- somosnosotros · OL-121 · Pincel: tope global e interruptor de apagado (founder, 2026-09-22, «Decidido» en
-- OPEN_LOOPS). Solo añade. Dos frenos para que Pincel nunca ponga en riesgo el sitio:
--   (1) Tope global en la base: como mucho DOS obras abiertas a la vez y CUARENTA mandos en total (la suma de
--       `cupo_mandos` de las obras abiertas). Cada mando manda 3 mensajes/s y el plan de Realtime admite 100/s.
--   (2) Interruptor «Pincel apagado»: la tabla `ajustes_sitio` guarda `pincel_activo`; apagado, el canal en vivo
--       (`realtime.messages`) deja de dejar pasar a cualquiera, sin desplegar nada. Encender lo reabre.

-- ---------------------------------------------------------------------------------------------------------
-- 1. Tope global: 2 obras abiertas, 40 mandos entre todas.
-- Disparador AFTER (no BEFORE) a propósito: así los índices únicos de la migración 20260922090000 («una sola
-- obra abierta por lugar / por evento») siguen respondiendo primero con su 23505, y este freno solo habla cuando
-- lo que sobra es el tope global. Un AFTER que lanza excepción anula la fila igual que un BEFORE.
-- Dos administradores a la vez: `pg_advisory_xact_lock` hace que el segundo espere a que el primero termine su
-- transacción y cuente entonces (en READ COMMITTED cada consulta del disparador ve lo ya confirmado).
create function public.obras_colectivas_freno() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  abiertas integer;
  mandos integer;
  quedan integer;
begin
  if new.estado <> 'abierta' then
    return null;
  end if;
  -- Solo cuenta cuando cambia algo que cuenta: abrir (alta o reabrir) o mover el cupo de una obra abierta.
  if tg_op = 'UPDATE' and old.estado = 'abierta' and old.cupo_mandos = new.cupo_mandos then
    return null;
  end if;
  perform pg_advisory_xact_lock(20260922, 121);
  select count(*), coalesce(sum(o.cupo_mandos), 0)
    into abiertas, mandos
    from public.obras_colectivas o
   where o.estado = 'abierta' and o.id <> new.id;
  if (tg_op = 'INSERT' or old.estado <> 'abierta') and abiertas >= 2 then
    raise exception using errcode = 'check_violation',
      message = 'Ya hay dos obras abiertas; termina una para abrir otra.';
  end if;
  quedan := 40 - mandos;
  if new.cupo_mandos > quedan then
    raise exception using errcode = 'check_violation',
      message = format('Quedan %s mandos entre todas las obras abiertas; el cupo de esta obra no puede pasar de ahí.', greatest(quedan, 0));
  end if;
  return null;
end;
$$;
comment on function public.obras_colectivas_freno() is 'OL-121: como mucho 2 obras abiertas y 40 mandos en total; rechaza con check_violation y un mensaje llano.';

create trigger obras_colectivas_freno after insert or update of estado, cupo_mandos on public.obras_colectivas
  for each row execute function public.obras_colectivas_freno();

-- Un trigger instalado no necesita EXECUTE del cliente al dispararse (mismo patrón que obras_colectivas_zona_del_lugar).
revoke execute on function public.obras_colectivas_freno() from public, anon, authenticated;
grant execute on function public.obras_colectivas_freno() to service_role;

-- ---------------------------------------------------------------------------------------------------------
-- 2. Ajustes del sitio: una fila por ajuste. Hoy solo `pincel_activo` (true por defecto). No había en el repo un
-- patrón para ajustes globales (buscado antes de crearla); las claves las crea una migración, no la app.
create table public.ajustes_sitio (
  clave text primary key check (char_length(clave) between 1 and 60),
  valor jsonb not null,
  -- Quién lo cambió por última vez y cuándo: los pone el disparador de abajo, no quien manda el cambio.
  cambiado_por uuid references public.perfiles (id) on delete set null,
  cambiado_en timestamptz not null default now()
);
comment on table public.ajustes_sitio is 'Ajustes globales del sitio (OL-121): una fila por clave. pincel_activo = true/false; apagado, Pincel no abre canales.';
create index ajustes_sitio_cambiado_por_idx on public.ajustes_sitio (cambiado_por);

insert into public.ajustes_sitio (clave, valor) values ('pincel_activo', 'true'::jsonb)
on conflict (clave) do nothing;

create function public.ajustes_sitio_quien() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.cambiado_por := auth.uid();
  new.cambiado_en := now();
  return new;
end;
$$;
create trigger ajustes_sitio_quien before update on public.ajustes_sitio
  for each row execute function public.ajustes_sitio_quien();
revoke execute on function public.ajustes_sitio_quien() from public, anon, authenticated;
grant execute on function public.ajustes_sitio_quien() to service_role;

alter table public.ajustes_sitio enable row level security;

-- Cualquiera con sesión lee (la pared y el mando necesitan saber si Pincel está apagado); solo administración
-- cambia. Sin política de insert ni de delete: nadie añade ni quita claves desde la app.
create policy "ajustes_sitio: lee cualquiera con sesión"
on public.ajustes_sitio for select
to authenticated
using (true);

create policy "ajustes_sitio: cambia solo admin"
on public.ajustes_sitio for update
to authenticated
using (public.es_admin())
with check (public.es_admin());

-- ¿Está Pincel encendido? Invoker a propósito (como es_admin() desde la migración 20260918130000): quien no puede
-- leer la fila obtiene false, es decir, «apagado» — el freno falla cerrado, nunca abierto.
create function public.pincel_activo() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.ajustes_sitio a where a.clave = 'pincel_activo' and a.valor = 'true'::jsonb
  )
$$;
comment on function public.pincel_activo() is 'OL-121: true si el ajuste pincel_activo está encendido; false si está apagado o no se puede leer.';

-- ---------------------------------------------------------------------------------------------------------
-- 3. Apagado, el canal en vivo no deja pasar. Las cuatro políticas de la migración 20260922130000 quedan tal
-- cual (son permisivas: se suman con OR). Esta es RESTRICTIVA: se cruza con AND sobre todas ellas, así que con
-- Pincel apagado nadie con sesión recibe ni manda trazos ni presence, y al encenderlo todo vuelve solo.
create policy "pincel apagado: el canal en vivo no deja pasar"
on "realtime"."messages"
as restrictive
for all
to authenticated
using (public.pincel_activo())
with check (public.pincel_activo());
