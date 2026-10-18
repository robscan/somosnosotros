-- OL-413 (bitácora 444): un festival sin programa.
-- Definición aprobada por el founder el 2026-10-18 («Adelante con la definición»): un festival es un nombre que reúne varias presentaciones y
-- el programa (actos como fichas separadas) es OPCIONAL. Un festival de un día en un lugar (Cumbiachella: 30/10, 8 pm–2 am, Lunaria) es UNA
-- ficha de clase festival, con su día, su hora, su lugar y la alineación en «Quién», sin actos.
-- `guardar_evento_con_clase` (20261006160000) no deja nacer un festival sin actos (`festival_por_programa`) y `publicar_programa` exige al
-- menos un acto publicado (`programa_vacio`). Esta migración SOLO AÑADE una función nueva para el alta: el evento con sus avisos y, si lo trae,
-- su horario por día (`guardar_evento_con_sesiones`, igual que cualquier alta) y la clase festival, en una sola transacción. Editarlo después
-- ya funciona con `guardar_evento_con_clase` (un festival que ya era festival). Sin actos, `recalcular_festival` no toca su periodo.
-- Con los permisos de quien llama, como las demás altas. Un reintento con la misma operación devuelve lo ya publicado.

create function public.publicar_festival_sin_programa(p_datos jsonb, p_privado jsonb, p_quien jsonb, p_sesiones jsonb, p_operacion uuid)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  resultado jsonb;
begin
  if auth.uid() is null then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_operacion is null then
    raise exception 'operacion_requerida' using errcode = '22023';
  end if;
  resultado := public.guardar_evento_con_sesiones(null, p_datos, p_privado, p_quien, p_sesiones, null, p_operacion);
  if coalesce((resultado->>'repetido')::boolean, false) then
    return resultado;
  end if;
  update public.eventos set clase = 'festival', evento_padre_id = null, inaugura_id = null
    where id = (resultado->>'id')::uuid and clase is distinct from 'festival';
  return resultado || jsonb_build_object('padre', null, 'inauguracion', null);
end $$;
comment on function public.publicar_festival_sin_programa(jsonb, jsonb, jsonb, jsonb, uuid) is 'Alta de un festival sin programa (OL-413): un día (o varios, con su horario por día), una hora y un lugar, como un evento, y clase festival, en una sola transacción.';
revoke all on function public.publicar_festival_sin_programa(jsonb, jsonb, jsonb, jsonb, uuid) from public, anon;
grant execute on function public.publicar_festival_sin_programa(jsonb, jsonb, jsonb, jsonb, uuid) to authenticated;
