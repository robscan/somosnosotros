-- somosnosotros · migración 20261008120000 · todo sitio lleva su punto en el mapa (OL-348, bitácora 377)
-- Solo añade una restricción con su comentario, y reemplaza dos funciones que ya existían para que la cumplan. Ninguna fila cambia.
--
-- Founder (2026-10-08): «no podemos permitir sitios sin coordenadas. Es mandatorio que las tenga.» Un evento está en un lugar del
-- directorio (que siempre tiene su punto), en un sitio reservado (su punto vive en eventos_sitio_privado) o en un sitio fuera del
-- directorio con su punto público (sitio_lat y sitio_lng). Así cada sitio tiene su ficha con mapa y «Cómo llegar» (/sitios/<slug>).
--
-- El marco de un festival queda fuera: no es un sitio, sus sedes salen de sus actos (OL-339) y cada acto sí cumple la regla. Tres de las
-- funciones que crean un marco (`guardar_evento_con_clase`, `relacionar_en_festival` y `festival_de_dos_parecidos`) lo insertan ya como
-- festival con el nombre de su primer acto y, si ese acto es un sitio reservado, sin punto; y `recalcular_festival` reescribe el periodo
-- del marco cada vez que cambia su programa: sin esta excepción, un festival que abre en un sitio reservado no se podría publicar (la
-- prueba supabase/tests/pg/sitio-con-punto.test.mjs lo comprueba). La cuarta, `publicar_programa`, crea el marco como evento y después
-- lo vuelve festival: para ella la excepción llega tarde y se reemplaza (punto 2).
--
-- NOT VALID: las filas que ya existen no se revisan al crearla (hay eventos antiguos sin punto, que el gestor corrige aparte); toda
-- fila nueva y toda actualización sí se revisan, también las de esos eventos antiguos, que no se podrán guardar hasta tener su punto.
-- Cuando estén corregidos:
--   alter table public.eventos validate constraint eventos_sitio_con_punto;

-- ---------- 1. Retirar un lugar por excepción (OL-259) sin dejar sitios sin punto ----------
-- Igual que en 20261003140000 salvo el `update public.eventos`: antes dejaba el nombre del lugar sin dirección ni punto. Ahora el evento
-- de un lugar público conserva el punto del lugar (su sitio sigue en el mapa, con su ficha); el de un lugar oculto o privado, que ya
-- quedaba oculto y sin su nombre («Lugar retirado»), pasa a sitio reservado sin dirección: su punto nunca se publica.
create or replace function public.borrar_lugar_excepcional_admin(p_lugar uuid, p_confirmacion text, p_motivo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  lugar public.lugares;
  impacto jsonb;
  anterior public.borrados_lugares_admin;
  optin_anterior text := current_setting('app.avisos_outbox', true);
  publico boolean;
begin
  if auth.uid() is null or not public.es_admin() then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_motivo is null or char_length(btrim(p_motivo)) not between 10 and 500
    or p_confirmacion is null or p_confirmacion !~ '^[a-f0-9]{64}$' then
    raise exception 'confirmacion_invalida' using errcode = '22023';
  end if;
  -- Serializa también dos reintentos de la misma confirmación.
  perform pg_advisory_xact_lock(7305, hashtext(p_confirmacion));
  select * into anterior from public.borrados_lugares_admin where confirmacion = p_confirmacion;
  if found then
    if anterior.actor is distinct from auth.uid() or anterior.lugar_id is distinct from p_lugar
      or anterior.motivo is distinct from btrim(p_motivo) then
      raise exception 'confirmacion_invalida' using errcode = '22023';
    end if;
    return jsonb_build_object('ok', true, 'eventos', anterior.conteos->'eventos', 'repetido', true);
  end if;

  -- El padre bloquea altas de cualquier hijo por la FK; luego se bloquean las
  -- filas existentes. Tras los cerrojos se vuelve a calcular el impacto completo.
  select * into lugar from public.lugares where id = p_lugar for update;
  if not found then raise exception 'lugar_no_disponible' using errcode = 'P0002'; end if;
  perform e.id from public.eventos e where e.lugar_id = p_lugar order by e.id for update;
  perform s.usuario_id from public.seguimientos s where s.lugar_id = p_lugar order by s.usuario_id for update;
  perform c.perfil_id from public.lugares_cuentas c where c.lugar_id = p_lugar order by c.perfil_id for update;
  perform d.id from public.destacados d where d.lugar_id = p_lugar order by d.id for update;
  perform o.id from public.obras_colectivas o where o.lugar_id = p_lugar order by o.id for update;
  perform c.id from public.contactos_importados c where c.lugar_id = p_lugar order by c.id for update;
  perform i.id from public.agendas_invitaciones_enviadas i where i.lugar_id = p_lugar order by i.id for update;
  impacto := public.impacto_borrado_lugar_admin(p_lugar);
  if impacto->>'confirmacion' is distinct from p_confirmacion then
    raise exception 'impacto_cambio' using errcode = '40001';
  end if;
  if not (impacto->>'permitido')::boolean then
    raise exception 'dependencias_pendientes' using errcode = '23503';
  end if;

  perform set_config('app.avisos_outbox', 'off', true);
  publico := lugar.visible and not lugar.privado;
  update public.eventos set lugar_id = null,
    sitio_texto = case when publico then lugar.nombre else 'Lugar retirado' end,
    sitio_direccion = null,
    sitio_lat = case when publico then lugar.lat end,
    sitio_lng = case when publico then lugar.lng end,
    sitio_reservado = not publico,
    visible = visible and publico
    where lugar_id = p_lugar;
  -- Relaciones sin ficha propia, explicadas en el impacto. Obra e historial
  -- impiden llegar aquí: nunca se dejan caer por los CASCADE heredados.
  delete from public.seguimientos where lugar_id = p_lugar;
  delete from public.lugares_cuentas where lugar_id = p_lugar;
  delete from public.destacados where lugar_id = p_lugar;
  delete from public.lugares where id = p_lugar;
  insert into public.borrados_lugares_admin(actor,lugar_id,motivo,conteos,confirmacion)
    values (auth.uid(),p_lugar,btrim(p_motivo),
      impacto - 'nombre' - 'lugar_id' - 'confirmacion' - 'permitido',p_confirmacion);
  perform set_config('app.avisos_outbox', coalesce(optin_anterior, ''), true);
  return jsonb_build_object('ok', true, 'eventos', impacto->'eventos', 'repetido', false);
exception when others then
  perform set_config('app.avisos_outbox', coalesce(optin_anterior, ''), true);
  raise;
end;
$$;
-- `create or replace` conserva los permisos (solo administración, por su propia comprobación); se repiten por claridad.
revoke all on function public.borrar_lugar_excepcional_admin(uuid,text,text) from public, anon, authenticated, service_role;
grant execute on function public.borrar_lugar_excepcional_admin(uuid,text,text) to authenticated;
comment on function public.borrar_lugar_excepcional_admin(uuid,text,text) is
  'Solo admin con motivo y huella del impacto vigente. Conserva todos los eventos, privacidad y autoría; desvincula el lugar (un lugar público deja su nombre y su punto; uno oculto o privado, un sitio reservado sin dirección, OL-348) y registra conteos. Bloquea obra/contactos/historial, no genera avisos masivos.';

-- ---------- 2. Publicar un programa (H6, OL-321) con un primer acto en un sitio reservado ----------
-- Igual que en 20261006160000 salvo el sitio del marco. `guardar_evento_completo` lo inserta como un evento más (la clase `festival` se le
-- pone justo después), así que la excepción del festival todavía no lo cubre: antes, si el primer acto publicado era un sitio reservado, el
-- marco quedaba con su nombre sin punto ni reserva y ahora no se podría guardar. El marco sigue tomando el sitio del primer acto publicado,
-- ahora tal cual: si es reservado, reservado, con su misma dirección privada (la de ese acto, de la misma persona, que se revela igual).
create or replace function public.publicar_programa(p_marco jsonb, p_actos jsonb, p_operacion uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  marco public.eventos;
  primero public.eventos;
  privado public.eventos_sitio_privado;
  a jsonb;
  v_id uuid;
  publicados uuid[] := '{}';
  borradores uuid[] := '{}';
  v_inicio timestamptz;
  v_fin timestamptz;
begin
  if auth.uid() is null then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_operacion is null then
    raise exception 'operacion_requerida' using errcode = '22023';
  end if;
  if jsonb_typeof(p_marco) is distinct from 'object' or jsonb_typeof(p_marco->'datos') is distinct from 'object'
    or jsonb_typeof(p_actos) is distinct from 'array' or jsonb_array_length(p_actos) < 1 or jsonb_array_length(p_actos) > 40 then
    raise exception 'programa_invalido' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(7304, hashtext(p_operacion::text));
  select * into marco from public.eventos where id = p_operacion;
  if found then
    if marco.creado_por is distinct from auth.uid() then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
    return jsonb_build_object('id', marco.id, 'repetido', true,
      'actos', (select coalesce(jsonb_agg(x.id order by x.inicio), '[]') from public.eventos x where x.evento_padre_id = marco.id and not x.borrador),
      'borradores', (select coalesce(jsonb_agg(x.id order by x.inicio), '[]') from public.eventos x where x.evento_padre_id = marco.id and x.borrador));
  end if;

  -- Los actos que se publican, con sus avisos.
  for a in select * from jsonb_array_elements(p_actos) loop
    if jsonb_typeof(a) is distinct from 'object' or jsonb_typeof(a->'datos') is distinct from 'object' or nullif(a->>'operacion', '') is null then
      raise exception 'programa_invalido' using errcode = '22023';
    end if;
    if coalesce((a->>'publicar')::boolean, false) then
      v_id := (public.guardar_evento_con_avisos(null, a->'datos', a->'privado', coalesce(a->'quien', '[]'::jsonb), null, (a->>'operacion')::uuid)->>'id')::uuid;
      publicados := array_append(publicados, v_id);
    end if;
  end loop;
  if cardinality(publicados) = 0 then
    raise exception 'programa_vacio' using errcode = '22023';
  end if;

  -- El marco: el sitio del primer acto publicado (reservado si ese lo es, con su dirección privada) y el periodo del programa; sin avisos
  -- propios (los dan sus actos).
  select * into primero from public.eventos where id = publicados[1];
  if primero.sitio_reservado then
    select * into privado from public.eventos_sitio_privado where evento_id = primero.id;
  end if;
  select min(x.inicio), max(x.termina) into v_inicio, v_fin from public.eventos x where x.id = any(publicados);
  perform public.guardar_evento_completo(null,
    (p_marco->'datos') || jsonb_build_object('inicio', v_inicio, 'fin', v_fin, 'lugar_id', primero.lugar_id,
      'sitio_texto', case when primero.lugar_id is null then primero.sitio_texto end,
      'sitio_direccion', case when primero.sitio_reservado then null else primero.sitio_direccion end,
      'sitio_lat', case when primero.sitio_reservado then null else primero.sitio_lat end,
      'sitio_lng', case when primero.sitio_reservado then null else primero.sitio_lng end,
      'sitio_reservado', primero.sitio_reservado, 'sitio_revelar_desde', case when primero.sitio_reservado then primero.sitio_revelar_desde end,
      'ciudad', primero.ciudad, 'zona', primero.zona),
    case when primero.sitio_reservado then jsonb_build_object('direccion', privado.direccion, 'lat', privado.lat, 'lng', privado.lng,
      'indicaciones', privado.indicaciones, 'revelar_desde', privado.revelar_desde) end,
    coalesce(p_marco->'quien', '[]'::jsonb), null, p_operacion);
  update public.eventos set clase = 'festival' where id = p_operacion;
  update public.eventos set evento_padre_id = p_operacion where id = any(publicados);

  -- Los desmarcados: registrados en el programa, sin avisos y ocultos como borradores.
  for a in select * from jsonb_array_elements(p_actos) loop
    if not coalesce((a->>'publicar')::boolean, false) then
      v_id := (public.guardar_evento_completo(null, a->'datos', a->'privado', coalesce(a->'quien', '[]'::jsonb), null, (a->>'operacion')::uuid)->>'id')::uuid;
      update public.eventos set evento_padre_id = p_operacion where id = v_id;
      perform public.programa_ocultar_borrador(v_id);
      borradores := array_append(borradores, v_id);
    end if;
  end loop;
  perform public.recalcular_festival(p_operacion);
  return jsonb_build_object('id', p_operacion, 'actos', to_jsonb(publicados), 'borradores', to_jsonb(borradores));
end $$;
comment on function public.publicar_programa(jsonb, jsonb, uuid) is 'H6 (OL-321): el marco de un festival y sus actos en una sola operación atómica e idempotente; los desmarcados quedan como borradores. El marco toma el sitio del primer acto publicado, reservado si ese lo es (OL-348).';
revoke all on function public.publicar_programa(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.publicar_programa(jsonb, jsonb, uuid) to authenticated;

-- ---------- 3. La regla ----------
alter table public.eventos add constraint eventos_sitio_con_punto
  check (clase = 'festival' or lugar_id is not null or sitio_reservado or (sitio_lat is not null and sitio_lng is not null)) not valid;
comment on constraint eventos_sitio_con_punto on public.eventos is 'OL-348: un sitio fuera del directorio lleva su punto público; un lugar del directorio y un sitio reservado ya lo tienen. El marco de un festival queda fuera (sus sedes salen de sus actos). NOT VALID hasta corregir los eventos antiguos sin punto.';
