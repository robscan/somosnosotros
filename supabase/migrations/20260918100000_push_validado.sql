-- OL-073. Aplicar despues de las migraciones pendientes del 17 de septiembre.
-- No borra filas antiguas: el emisor tambien valida antes de contactar al proveedor.
create function public.push_endpoint_permitido(p_endpoint text) returns boolean
language sql immutable strict set search_path = public as $func$
  select length(p_endpoint) <= 4096
    and p_endpoint collate "C" ~ '^https://(fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com|[a-z0-9-]+[.]push[.]apple[.]com|[a-z0-9-]+[.]notify[.]windows[.]com)/[!-~]+$'
    and position(chr(92) in p_endpoint) = 0
    and position('#' in p_endpoint) = 0;
$func$;

alter table public.suscripciones_push
  add constraint push_endpoint_valido check (public.push_endpoint_permitido(endpoint)) not valid,
  add constraint push_llaves_validas check (
    p256dh ~ '^[A-Za-z0-9_-]{87}$' and auth ~ '^[A-Za-z0-9_-]{22}$'
    and get_byte(decode(translate(p256dh, '-_', '+/') || '=', 'base64'), 0) = 4
  ) not valid;

create function public.limitar_suscripciones_push() returns trigger
language plpgsql security definer set search_path = public as $$
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
    and (select count(*) from public.suscripciones_push where usuario_id = new.usuario_id) >= 10 then
    raise exception 'Ya hay diez telefonos registrados en esta cuenta' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.limitar_suscripciones_push() from public, anon, authenticated;
create trigger limitar_suscripciones_push before insert or update on public.suscripciones_push
  for each row execute function public.limitar_suscripciones_push();
