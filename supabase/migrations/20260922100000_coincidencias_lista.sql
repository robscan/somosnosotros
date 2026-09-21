-- somosnosotros · migración 0045 · Coincidencias abre sus eventos (OL-102, bitácora 137)
-- Decisión del founder (2026-09-21): «Coincidencias debe abrir eventos con coincidencias.» Hoy la tarjeta
-- «Coincidencias» de Administración muestra un número que sale de indicadores_ahora() (criterio, medido letra por
-- letra en supabase/migrations/20260917170000_indicadores_rol_de_entonces.sql, líneas 66-84: eventos visibles,
-- e.termina >= now(), que empiezan dentro de los próximos 7 días — la misma CTE `semana` que usa «Agenda de la
-- semana» —, con 2 o más «voy» de personas que NO eran administradoras cuando lo dijeron, rol_en(usuario, la fecha
-- de ese «voy»), no el rol de hoy), pero su enlace va a /admin/eventos?filtro=semana: la lista genérica de la
-- semana (hoy 39 eventos, paginada de 30 en 30), no los eventos que cuenta el número. El founder toca el número y
-- no encuentra lo que el número dice.
--
-- Regla de la casa desde hoy (pedida por el gestor): el número y la lista salen del MISMO criterio, letra por
-- letra, rol de entonces incluido; si el número dice 2, al tocar se ven esos 2. panel_eventos() y
-- panel_fichas_conteos() son security invoker desde el endurecimiento del Security Advisor (20260918130000): igual
-- que ya hace el filtro 'comunidad' en ambas (migración 20260921100000), no pueden llamar a rol_en() directamente
-- (revocada para authenticated a propósito) y usan el ayudante rol_en_para_admin() que ya existe — sin tocarlo ni
-- añadir ningún grant nuevo. La expresión que decide «coincidencia» (el count(*) de asistencias con estado='voy' y
-- rol_en_para_admin(...) <> 'admin', comparado con >= 2) es idéntica, letra por letra, en las dos funciones de
-- abajo, para que no puedan volver a separarse. Solo estos dos create or replace, misma firma que la definición
-- vigente (20260921100000_rol_de_entonces_en_listas.sql); sin tablas, sin datos, sin drop.
create or replace function public.panel_eventos(p_buscar text default null, p_filtro text default 'proximos', p_limite integer default 30, p_desde integer default 0)
returns table (id uuid, titulo text, imagen text, inicio timestamptz, fin timestamptz, visible boolean, sitio text, autor text, autor_admin boolean, van integer, total bigint)
language sql stable security invoker set search_path = '' as $$
  select e.id, e.titulo, e.imagen, e.inicio, e.fin, e.visible, coalesce(l.nombre, e.sitio_texto), p.nombre, coalesce(p.rol = 'admin', false),
    (select count(*) from public.asistencias a where a.evento_id = e.id and a.estado = 'voy')::int,
    count(*) over ()
  from public.eventos e
  left join public.lugares l on l.id = e.lugar_id
  left join public.perfiles p on p.id = e.creado_por
  where public.es_admin()
    and e.termina >= now()
    and (coalesce(trim(p_buscar), '') = '' or public.normalizar_nombre(p_buscar) <> '' and public.normalizar_nombre(e.titulo) like '%' || public.normalizar_nombre(p_buscar) || '%')
    and case coalesce(p_filtro, 'proximos')
      when 'semana' then e.visible and e.inicio < now() + interval '7 days'
      when 'sin_imagen' then e.visible and e.imagen is null
      when 'comunidad' then e.visible and (p.id is null or public.rol_en_para_admin(p.id, e.creado_en) <> 'admin')
      when 'coincidencias' then e.visible and e.inicio < now() + interval '7 days'
        and (select count(*) from public.asistencias a where a.evento_id = e.id and a.estado = 'voy' and public.rol_en_para_admin(a.usuario_id, a.creado_en) <> 'admin') >= 2
      when 'ocultos' then not e.visible
      else e.visible
    end
  order by e.inicio, e.titulo, e.id
  limit greatest(least(p_limite, 600), 1) offset greatest(p_desde, 0);
$$;

create or replace function public.panel_fichas_conteos(p_tipo text) returns json
language sql stable security invoker set search_path = '' as $$
  select case
    when not public.es_admin() then null
    when p_tipo = 'lugares' then json_build_object(
      'todos', (select count(*) from public.lugares),
      'ocultos', (select count(*) from public.lugares where not visible),
      'sin_fecha', (select count(*) from public.lugares l where l.visible and not l.privado
        and not exists (select 1 from public.eventos e where e.lugar_id = l.id and e.visible and e.termina >= now())),
      'sin_foto', (select count(*) from public.lugares where portada is null),
      'catalogo', (select count(*) from public.lugares where origen = 'capo'))
    when p_tipo = 'eventos' then json_build_object(
      'proximos', (select count(*) from public.eventos e where e.visible and e.termina >= now()),
      'semana', (select count(*) from public.eventos e where e.visible and e.termina >= now() and e.inicio < now() + interval '7 days'),
      'sin_imagen', (select count(*) from public.eventos e where e.visible and e.termina >= now() and e.imagen is null),
      'comunidad', (select count(*) from public.eventos e left join public.perfiles p on p.id = e.creado_por
        where e.visible and e.termina >= now() and (p.id is null or public.rol_en_para_admin(p.id, e.creado_en) <> 'admin')),
      'coincidencias', (select count(*) from public.eventos e where e.visible and e.termina >= now() and e.inicio < now() + interval '7 days'
        and (select count(*) from public.asistencias a where a.evento_id = e.id and a.estado = 'voy' and public.rol_en_para_admin(a.usuario_id, a.creado_en) <> 'admin') >= 2),
      'ocultos', (select count(*) from public.eventos e where not e.visible and e.termina >= now()))
    when p_tipo = 'artistas' then json_build_object(
      'todos', (select count(*) from public.artistas),
      'por_reclamar', (select count(*) from public.artistas a where a.origen = 'capo'
        and not exists (select 1 from public.artistas_cuentas c where c.artista_id = a.id)),
      'llevados', (select count(distinct artista_id) from public.artistas_cuentas),
      'sin_foto', (select count(*) from public.artistas where foto is null),
      'ocultos', (select count(*) from public.artistas where not visible))
  end;
$$;
