-- OL-077 / bitacora 111: solo las 51 firmas auditadas, sin cambiar tablas ni politicas.
-- Las tablas y ayudantes de estos cuerpos ya estan cualificados con public/auth/extensions.
-- El path vacio evita resolver funciones/operadores del caller o del esquema public.
-- No se alteran extensiones, defaults globales ni funciones de otras piezas posteriores.
begin;

alter function public.apartar_lectura_de_cartel() set search_path = '';
alter function public.artista_sin_duplicado() set search_path = '';
alter function public.artistas_con_nombre(text) set search_path = '';
alter function public.borrar_mi_cuenta() set search_path = '';
alter function public.cambiar_destacado(text, uuid, text, timestamptz, timestamptz) set search_path = '';
alter function public.cambiar_rol(uuid, text) set search_path = '';
alter function public.crear_perfil() set search_path = '';
alter function public.cuenta_seguidores(uuid, uuid) set search_path = '';
alter function public.dar_mas_lecturas(uuid) set search_path = '';
alter function public.detalles_de_disciplina(text, text, integer) set search_path = '';
alter function public.disciplinas_con_artistas(text) set search_path = '';
alter function public.distancia_m(double precision, double precision, double precision, double precision) set search_path = '';
alter function public.es_admin_de_origen() set search_path = '';
alter function public.es_admin() set search_path = '';
alter function public.eventos_zona_del_lugar() set search_path = '';
alter function public.gestiona_artista(uuid) set search_path = '';
alter function public.gestiona_evento(uuid) set search_path = '';
alter function public.gestiona_lugar(uuid) set search_path = '';
alter function public.guardar_indicadores() set search_path = '';
alter function public.indicadores_ahora() set search_path = '';
alter function public.inicio_del_mes() set search_path = '';
alter function public.limitar_suscripciones_push() set search_path = '';
alter function public.lugares_con_nombre(text) set search_path = '';
alter function public.lugares_parecidos(text, double precision, double precision, uuid) set search_path = '';
alter function public.lugares_zona_a_sus_eventos() set search_path = '';
alter function public.marcar_visto() set search_path = '';
alter function public.mi_cupo_de_cartel() set search_path = '';
alter function public.normalizar_nombre(text) set search_path = '';
alter function public.panel_artistas(text, text, integer, integer) set search_path = '';
alter function public.panel_comunidad() set search_path = '';
alter function public.panel_correo(uuid) set search_path = '';
alter function public.panel_destacados(text) set search_path = '';
alter function public.panel_eventos(text, text, integer, integer) set search_path = '';
alter function public.panel_fichas_conteos(text) set search_path = '';
alter function public.panel_lugares(text, text, integer, integer) set search_path = '';
alter function public.panel_pendientes() set search_path = '';
alter function public.panel_persona(uuid) set search_path = '';
alter function public.panel_personas_conteos() set search_path = '';
alter function public.panel_personas(text, text, integer, integer) set search_path = '';
alter function public.panel_resumen() set search_path = '';
alter function public.poner_nombre_orden() set search_path = '';
alter function public.proteger_autor_y_visible() set search_path = '';
alter function public.proteger_rol() set search_path = '';
alter function public.push_endpoint_permitido(text) set search_path = '';
alter function public.rol_en(uuid, timestamptz) set search_path = '';
alter function public.sin_pasar(timestamptz, timestamptz) set search_path = '';
alter function public.tira_destacados(text, text) set search_path = '';
alter function public.tocar_actualizado_en() set search_path = '';
alter function public.tope_de_cartel_base() set search_path = '';
alter function public.van_por_evento(uuid[]) set search_path = '';
alter function public.zona_valida(text) set search_path = '';

-- perfiles tiene SELECT publico; eventos SELECT no llama a gestiona_evento.
-- No hay ciclo. gestiona_lugar/artista SI se usan en el SELECT de su propia tabla:
-- siguen definer y ejecutables por ambos roles para no romper RLS ni hacerla recursiva.
alter function public.es_admin() security invoker;
alter function public.gestiona_evento(uuid) security invoker;

-- Estas seis consultas solo necesitan las lecturas que RLS ya permite al admin.
-- Se mantiene la guarda es_admin() para no devolver datos del panel al resto.
alter function public.panel_artistas(text, text, integer, integer) security invoker;
alter function public.panel_eventos(text, text, integer, integer) security invoker;
alter function public.panel_lugares(text, text, integer, integer) security invoker;
alter function public.panel_fichas_conteos(text) security invoker;
alter function public.panel_destacados(text) security invoker;
alter function public.panel_pendientes() security invoker;

-- Los agregados saltan la reserva del PERFIL para contar sin identificar personas,
-- no la visibilidad de la FICHA. Un UUID conocido no debe abrir un objeto oculto.
create or replace function public.van_por_evento(ids uuid[])
returns table (evento_id uuid, n bigint)
language sql stable security definer set search_path = '' as $$
  select a.evento_id, count(*)
  from public.asistencias a
  join public.eventos e on e.id = a.evento_id
  where a.estado = 'voy' and a.evento_id = any(ids)
    and (e.visible or e.creado_por = auth.uid() or public.es_admin())
  group by a.evento_id;
$$;

create or replace function public.cuenta_seguidores(p_lugar uuid default null, p_artista uuid default null)
returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from public.seguimientos s
  where (p_lugar is not null and s.lugar_id = p_lugar and exists (
    select 1 from public.lugares l where l.id = s.lugar_id
      and ((l.visible and not l.privado) or public.gestiona_lugar(l.id))
  )) or (p_artista is not null and s.artista_id = p_artista and exists (
    select 1 from public.artistas a where a.id = s.artista_id
      and (a.visible or public.gestiona_artista(a.id))
  ));
$$;

-- Un trigger instalado no necesita EXECUTE del cliente al dispararse.
-- Se impide invocarlo/reutilizarlo en otro trigger, sin alterar los ya instalados.
revoke execute on function
  public.artista_sin_duplicado(), public.crear_perfil(), public.eventos_zona_del_lugar(),
  public.limitar_suscripciones_push(), public.lugares_zona_a_sus_eventos(),
  public.poner_nombre_orden(), public.proteger_autor_y_visible(), public.proteger_rol(),
  public.tocar_actualizado_en()
from public, anon, authenticated;
grant execute on function
  public.artista_sin_duplicado(), public.crear_perfil(), public.eventos_zona_del_lugar(),
  public.limitar_suscripciones_push(), public.lugares_zona_a_sus_eventos(),
  public.poner_nombre_orden(), public.proteger_autor_y_visible(), public.proteger_rol(),
  public.tocar_actualizado_en()
to service_role;

-- Solo otros definers (o mantenimiento de servicio) usan estas firmas.
-- es_admin_de_origen se consume dentro de cambiar_rol/proteger_rol/panel_persona.
revoke execute on function
  public.es_admin_de_origen(), public.guardar_indicadores(), public.indicadores_ahora(),
  public.rol_en(uuid, timestamptz), public.tope_de_cartel_base(), public.sin_pasar(timestamptz, timestamptz)
from public, anon, authenticated;
grant execute on function
  public.es_admin_de_origen(), public.guardar_indicadores(), public.indicadores_ahora(),
  public.rol_en(uuid, timestamptz), public.tope_de_cartel_base(), public.sin_pasar(timestamptz, timestamptz)
to service_role;

-- API publica y ayudantes de RLS, CHECKs y triggers invoker: no retirar su EXECUTE.
-- Los conteos definer incluyen perfiles reservados sin entregar sus identidades.
revoke execute on function
  public.artistas_con_nombre(text), public.cuenta_seguidores(uuid, uuid),
  public.detalles_de_disciplina(text, text, integer), public.disciplinas_con_artistas(text),
  public.distancia_m(double precision, double precision, double precision, double precision),
  public.es_admin(), public.gestiona_artista(uuid), public.gestiona_evento(uuid), public.gestiona_lugar(uuid),
  public.lugares_con_nombre(text), public.lugares_parecidos(text, double precision, double precision, uuid),
  public.normalizar_nombre(text), public.push_endpoint_permitido(text),
  public.tira_destacados(text, text), public.van_por_evento(uuid[]), public.zona_valida(text)
from public;
grant execute on function
  public.artistas_con_nombre(text), public.cuenta_seguidores(uuid, uuid),
  public.detalles_de_disciplina(text, text, integer), public.disciplinas_con_artistas(text),
  public.distancia_m(double precision, double precision, double precision, double precision),
  public.es_admin(), public.gestiona_artista(uuid), public.gestiona_evento(uuid), public.gestiona_lugar(uuid),
  public.lugares_con_nombre(text), public.lugares_parecidos(text, double precision, double precision, uuid),
  public.normalizar_nombre(text), public.push_endpoint_permitido(text),
  public.tira_destacados(text, text), public.van_por_evento(uuid[]), public.zona_valida(text)
to anon, authenticated, service_role;

-- API con sesion: comprobacion de auth.uid()/es_admin()/origen dentro del cuerpo.
-- inicio_del_mes no lee datos y lo necesita panel_pendientes, ahora invoker.
revoke execute on function
  public.apartar_lectura_de_cartel(), public.borrar_mi_cuenta(),
  public.cambiar_destacado(text, uuid, text, timestamptz, timestamptz), public.cambiar_rol(uuid, text),
  public.dar_mas_lecturas(uuid), public.inicio_del_mes(), public.marcar_visto(), public.mi_cupo_de_cartel(),
  public.panel_artistas(text, text, integer, integer), public.panel_comunidad(), public.panel_correo(uuid),
  public.panel_destacados(text), public.panel_eventos(text, text, integer, integer), public.panel_fichas_conteos(text),
  public.panel_lugares(text, text, integer, integer), public.panel_pendientes(), public.panel_persona(uuid),
  public.panel_personas_conteos(), public.panel_personas(text, text, integer, integer), public.panel_resumen()
from public, anon;
grant execute on function
  public.apartar_lectura_de_cartel(), public.borrar_mi_cuenta(),
  public.cambiar_destacado(text, uuid, text, timestamptz, timestamptz), public.cambiar_rol(uuid, text),
  public.dar_mas_lecturas(uuid), public.inicio_del_mes(), public.marcar_visto(), public.mi_cupo_de_cartel(),
  public.panel_artistas(text, text, integer, integer), public.panel_comunidad(), public.panel_correo(uuid),
  public.panel_destacados(text), public.panel_eventos(text, text, integer, integer), public.panel_fichas_conteos(text),
  public.panel_lugares(text, text, integer, integer), public.panel_pendientes(), public.panel_persona(uuid),
  public.panel_personas_conteos(), public.panel_personas(text, text, integer, integer), public.panel_resumen()
to authenticated, service_role;

commit;
