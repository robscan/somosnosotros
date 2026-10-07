-- somosnosotros · OL-319 · editar un evento por pasos: el evento y su horario por día se guardan en la misma transacción (bitácora 348)
-- Editar ya entra en «Revisa» con todo puesto y, en un evento de varios días, deja pasar de un horario común a uno por día y al revés
-- (la casilla «Mismo horario todos los días»). `guardar_evento_con_sesiones` (OL-311) ya escribe las sesiones al guardar, pero con
-- `p_sesiones` nulo no las toca: al volver a marcar la casilla quedarían las filas de antes, y la ficha seguiría leyendo un horario por
-- día que ya no existe (`sesionesVigentes` solo las ignora si dejan de coincidir con el inicio y el último día). Esta función es la de
-- editar: con sesiones, la de OL-311 tal cual; sin ellas, el evento como siempre y, en la misma transacción, sin filas de sesiones.
-- Solo añade: una función nueva que envuelve a las de siempre sin tocarlas. No borra ni cambia nada existente.
create function public.editar_evento_con_sesiones(p_evento uuid, p_datos jsonb, p_privado jsonb, p_quien jsonb, p_sesiones jsonb,
  p_revision timestamptz default null, p_operacion uuid default null) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  resultado jsonb;
begin
  -- Es para un evento que ya existe: publicar sigue con `guardar_evento_con_sesiones` o `guardar_evento_con_avisos`.
  if p_evento is null then
    raise exception 'evento_requerido' using errcode = '22023';
  end if;
  if p_sesiones is not null then
    return public.guardar_evento_con_sesiones(p_evento, p_datos, p_privado, p_quien, p_sesiones, p_revision, p_operacion);
  end if;
  resultado := public.guardar_evento_con_avisos(p_evento, p_datos, p_privado, p_quien, p_revision, p_operacion);
  -- Un reintento de la misma operación (`repetido`) no vuelve a tocar nada.
  if not coalesce((resultado->>'repetido')::boolean, false) then
    delete from public.eventos_sesiones where evento_id = (resultado->>'id')::uuid;
  end if;
  return resultado;
end $$;
comment on function public.editar_evento_con_sesiones(uuid, jsonb, jsonb, jsonb, jsonb, timestamptz, uuid) is 'Editar un evento (OL-319): con sesiones, como guardar_evento_con_sesiones; sin ellas (null), el evento como siempre y sin horario por día, en la misma transacción.';
revoke all on function public.editar_evento_con_sesiones(uuid, jsonb, jsonb, jsonb, jsonb, timestamptz, uuid) from public, anon;
grant execute on function public.editar_evento_con_sesiones(uuid, jsonb, jsonb, jsonb, jsonb, timestamptz, uuid) to authenticated;
