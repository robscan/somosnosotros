-- somosnosotros · OL-307 · seis lecturas de cartel al mes, y la lectura fallida no se descuenta (bitácora 334 y 335)
-- Decisión del founder, 2026-10-06: «lectura automática», 6 al mes por cuenta, sin «Pedir más lecturas» (el tope de una cuenta
-- sigue pudiendo subirlo la administración, `dar_mas_lecturas`), y una lectura que falla no cuenta.
--   · el tope base pasa de 20 a 6; las cuentas con tope propio en `topes_de_lectura` (100 tras «Dar más») no cambian;
--   · una lectura que falla por el modelo o por un corte se devuelve: la fila de `lecturas_cartel` se marca `devuelta` y deja
--     de contar para el cupo. No se borra: sin esa marca no se podría poner el fusible siguiente;
--   · fusible: quien acumula tantas lecturas devueltas en el mes como su tope (6) ya no recibe más devoluciones; desde ahí, una
--     lectura fallida cuenta como cualquier otra. Así un cartel que el modelo no sabe leer, subido una y otra vez, cuesta como
--     mucho el doble del tope (12 llamadas al mes por cuenta), nunca gratis sin límite;
--   · devolver solo lo puede hacer el servidor con su llave de servicio (`clienteAdmin`): si cualquier cuenta pudiera llamarla,
--     devolvería también las lecturas buenas y el tope de 6 sería de adorno.
-- Solo añade una columna (con valor por omisión) y una función, y cambia tres funciones sin tocar su forma. No borra datos.

alter table public.lecturas_cartel add column devuelta boolean not null default false;
comment on column public.lecturas_cartel.devuelta is 'La lectura falló y se devolvió: no cuenta para el cupo del mes (devolver_lectura_de_cartel, OL-307).';

-- ---------- el tope base: 6 ----------
create or replace function public.tope_de_cartel_base()
returns integer language sql immutable set search_path = '' as $$ select 6 $$;
comment on function public.tope_de_cartel_base() is 'Lecturas de cartel al mes por cuenta: 6 (OL-307; eran 20 en docs/rediseno/23). La administración no tiene tope.';

-- ---------- lo que le queda a quien pregunta: las devueltas no cuentan ----------
create or replace function public.mi_cupo_de_cartel()
returns table (usadas integer, tope integer, sin_tope boolean, pedida boolean)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::integer from public.lecturas_cartel l where l.perfil_id = auth.uid() and not l.devuelta and l.creado_en >= public.inicio_del_mes()),
    coalesce((select t.tope from public.topes_de_lectura t where t.perfil_id = auth.uid()), public.tope_de_cartel_base()),
    public.es_admin(),
    exists (select 1 from public.reportes r where r.creado_por = auth.uid() and r.motivo = 'mas_lecturas' and not r.atendido)
  where auth.uid() is not null;
$$;

-- ---------- apartar una lectura: las devueltas no cuentan ----------
create or replace function public.apartar_lectura_de_cartel()
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_usadas integer;
  v_tope integer;
begin
  if auth.uid() is null then
    return false;
  end if;
  if current_setting('transaction_isolation') not in ('read committed', 'read uncommitted') then
    raise exception 'La reserva requiere READ COMMITTED' using errcode = '25001';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if not public.es_admin() then
    select coalesce((select t.tope from public.topes_de_lectura t where t.perfil_id = auth.uid()), public.tope_de_cartel_base()) into v_tope;
    select count(*) into v_usadas from public.lecturas_cartel l where l.perfil_id = auth.uid() and not l.devuelta and l.creado_en >= public.inicio_del_mes();
    if v_usadas >= v_tope then
      return false;
    end if;
  end if;
  insert into public.lecturas_cartel (perfil_id) values (auth.uid());
  return true;
end
$$;

-- ---------- devolver una lectura que falló ----------
-- Marca la lectura más reciente de esa cuenta que aún cuenta. Devuelve false si el fusible ya se agotó (esa fallida cuenta) o si no hay
-- nada que devolver. Toma el mismo cerrojo por cuenta que `apartar_lectura_de_cartel`, así devolver y apartar no se pisan.
create function public.devolver_lectura_de_cartel(p_perfil uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_tope integer;
  v_devueltas integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_perfil::text, 0));
  select coalesce((select t.tope from public.topes_de_lectura t where t.perfil_id = p_perfil), public.tope_de_cartel_base()) into v_tope;
  select count(*) into v_devueltas from public.lecturas_cartel l where l.perfil_id = p_perfil and l.devuelta and l.creado_en >= public.inicio_del_mes();
  if v_devueltas >= v_tope then
    return false;
  end if;
  update public.lecturas_cartel set devuelta = true
  where id = (
    select l.id from public.lecturas_cartel l
    where l.perfil_id = p_perfil and not l.devuelta and l.creado_en >= public.inicio_del_mes()
    order by l.creado_en desc, l.id desc
    limit 1
  );
  return found;
end
$$;
comment on function public.devolver_lectura_de_cartel(uuid) is 'La lectura falló: no se descuenta, hasta tantas devoluciones al mes como el tope de esa cuenta. Solo con la llave de servicio (OL-307).';
revoke execute on function public.devolver_lectura_de_cartel(uuid) from public, anon, authenticated;
grant execute on function public.devolver_lectura_de_cartel(uuid) to service_role;
