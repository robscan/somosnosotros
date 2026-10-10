-- somosnosotros · migración 20261010100000 · al agregar un sitio al directorio, sus eventos pasan al lugar (OL-366, bitácora 397)
-- Solo añade una función y sus permisos. Ninguna fila cambia al aplicarla.
--
-- La ficha de un sitio fuera del directorio (OL-348, /sitios/<slug>) ofrece «Agregar al directorio»: el alta de lugar con su nombre y su
-- punto. Al crearse el lugar (o al elegir en el alta uno que ya existe, «¿Es este?»), la app pide ligar a él los eventos que nombraban ese
-- sitio; y la administración, desde la ficha del sitio, «Ligar sus eventos». Ligar un evento a un lugar cambia su «Dónde» y cualquiera con
-- sesión puede crear un lugar: por eso la regla vive aquí y no solo en la app (decisión del gestor, OL-366). Un evento se liga solo si:
--   · todavía no tiene lugar y su sitio no es reservado (la dirección de un sitio reservado no se publica);
--   · se ve (`visible`: ni oculto, ni retirado por la administración, ni borrador) y no es el marco de un festival (sus sedes salen de sus
--     actos, OL-339);
--   · es de quien llama, o quien llama es administración (`es_admin`);
--   · el punto de su sitio está a 300 m o menos del punto del lugar (`distancia_m`, la de `lugares_parecidos`), y
--   · tiene la zona horaria del lugar: ligado, el evento toma la de su lugar (`eventos_zona_del_lugar`) y con otra su hora a la vista
--     cambiaría (una frontera de husos a menos de 300 m, o un evento antiguo con la zona por omisión). La hora nunca se mueve en silencio.
-- El lugar tiene que estar en el directorio (visible y no privado): un evento público no se liga a un lugar que nadie más ve.
--
-- Ligado, el evento queda como lo deja la app cuando tiene lugar (`validarEvento` y `ciudadDe`): el lugar y su ciudad, y los campos del
-- sitio vacíos (`eventos_direccion_solo_publica` exige la dirección vacía; `eventos_sitio_con_punto` lo cumple el lugar). No avisa a nadie:
-- el sitio es el mismo, como al retirar un lugar por excepción (OL-259); los avisos pendientes de ese evento quedan obsoletos como en
-- cualquier corrección interna y los recordatorios se vuelven a crear. Los que no cumplen se quedan como estaban, sin error. Devuelve
-- cuántos ligó.

create function public.religar_sitio_a_lugar(p_lugar uuid, p_eventos uuid[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  lugar public.lugares;
  admin boolean;
  ligados integer;
  optin_anterior text := current_setting('app.avisos_outbox', true);
begin
  if auth.uid() is null then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_lugar is null or coalesce(cardinality(p_eventos), 0) = 0 then
    return 0;
  end if;
  -- Quieto hasta el final: nadie lo oculta, lo vuelve privado, lo mueve ni lo borra mientras se le ligan eventos.
  select * into lugar from public.lugares l where l.id = p_lugar for share;
  if not found or not lugar.visible or lugar.privado then
    return 0;
  end if;
  admin := public.es_admin();
  -- Como el guardado con avisos (y el retiro excepcional de un lugar): set_config, porque SET en la firma pide superusuario si la conexión
  -- todavía no conoce el parámetro. Apagado, ligar no encola avisos.
  perform set_config('app.avisos_outbox', 'off', true);
  update public.eventos e set
    lugar_id = lugar.id,
    sitio_texto = null,
    sitio_direccion = null,
    sitio_lat = null,
    sitio_lng = null,
    sitio_revelar_desde = null,
    ciudad = lugar.ciudad
  where e.id = any (p_eventos)
    and e.lugar_id is null
    and not e.sitio_reservado
    and e.visible
    and e.clase <> 'festival'
    and (e.creado_por = auth.uid() or admin)
    and e.sitio_lat is not null and e.sitio_lng is not null
    and public.distancia_m(e.sitio_lat, e.sitio_lng, lugar.lat, lugar.lng) <= 300
    and e.zona = lugar.zona;
  get diagnostics ligados = row_count;
  perform set_config('app.avisos_outbox', coalesce(optin_anterior, ''), true);
  return ligados;
exception when others then
  perform set_config('app.avisos_outbox', coalesce(optin_anterior, ''), true);
  raise;
end;
$$;
revoke all on function public.religar_sitio_a_lugar(uuid, uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.religar_sitio_a_lugar(uuid, uuid[]) to authenticated;
comment on function public.religar_sitio_a_lugar(uuid, uuid[]) is
  'OL-366: liga al lugar (visible y no privado) los eventos de la lista que nombraban su sitio: sin lugar, sin sitio reservado, visibles, sin ser marco de festival, de quien llama (o todos si es administración), a 300 m o menos y en la misma zona horaria. Deja los campos del sitio vacíos y la ciudad del lugar; no avisa. Devuelve cuántos ligó.';
