-- OL-326 · conteos de lectura para el gestor: los mismos números que panel_fichas() y panel_aportes(), sin sesión de administración.
-- Solo SELECT. Se corre con la conexión del gestor (propietario); no escribe nada ni devuelve ids ni correos.
with vinculos as (
  select 'artista'::text as tipo, c.artista_id as ficha, c.perfil_id, c.creado_en,
    case
      when exists (select 1 from public.reportes r where r.tipo = 'artista' and r.objeto_id = c.artista_id and r.creado_por = c.perfil_id and r.motivo = 'es_mio' and r.creado_en <= c.creado_en) then 'solicitud'
      when exists (select 1 from public.artistas a where a.id = c.artista_id and a.creado_por = c.perfil_id and c.creado_en <= a.creado_en + interval '2 minutes') then 'alta'
      when exists (select 1 from public.contactos_importados ci join auth.users u on lower(u.email) = lower(ci.correo) where ci.artista_id = c.artista_id and u.id = c.perfil_id) then 'correo'
      else 'otra'
    end as via
  from public.artistas_cuentas c
  union all
  select 'lugar'::text, c.lugar_id, c.perfil_id, c.creado_en,
    case when exists (select 1 from public.reportes r where r.tipo = 'lugar' and r.objeto_id = c.lugar_id and r.creado_por = c.perfil_id and r.motivo = 'es_mio' and r.creado_en <= c.creado_en) then 'solicitud' else 'otra' end
  from public.lugares_cuentas c
),
fichas as (
  select distinct on (v.tipo, v.ficha) v.tipo, v.ficha, v.creado_en as desde, v.via from vinculos v order by v.tipo, v.ficha, v.creado_en, v.perfil_id
),
gestos as (
  select a.usuario_id, a.estado, a.creado_en from public.asistencias a
  where a.creado_en >= now() - interval '14 days' and public.rol_en(a.usuario_id, a.creado_en) <> 'admin'
),
publicaciones as (
  select l.creado_por as perfil, l.creado_en from public.lugares l where l.creado_por is not null
  union all select e.creado_por, e.creado_en from public.eventos e where e.creado_por is not null
  union all select a.creado_por, a.creado_en from public.artistas a where a.creado_por is not null
),
primeras as (
  select p.perfil, min(p.creado_en) as primera from publicaciones p where public.rol_en(p.perfil, p.creado_en) <> 'admin' group by p.perfil
)
select dato, valor from (
  select 1 as o, 'artistas con cuenta ligada' as dato, count(*)::text as valor from fichas where tipo = 'artista'
  union all select 2, 'lugares con cuenta ligada', count(*)::text from fichas where tipo = 'lugar'
  union all select 3, 'vía solicitud', count(*)::text from fichas where via = 'solicitud'
  union all select 4, 'vía correo ligado', count(*)::text from fichas where via = 'correo'
  union all select 5, 'vía alta (Soy yo)', count(*)::text from fichas where via = 'alta'
  union all select 6, 'vía otra', count(*)::text from fichas where via = 'otra'
  union all select 7, 'fichas ligadas en los últimos 7 días', count(*)::text from fichas where desde >= now() - interval '7 days'
  union all select 8, 'solicitudes es_mio en total (artista o lugar)', count(*)::text from public.reportes where motivo = 'es_mio' and tipo in ('artista', 'lugar')
  union all select 9, 'solicitudes es_mio sin atender', count(*)::text from public.reportes where motivo = 'es_mio' and tipo in ('artista', 'lugar') and not atendido
  union all select 10, 'solicitudes es_mio en los últimos 30 días', count(*)::text from public.reportes where motivo = 'es_mio' and tipo in ('artista', 'lugar') and creado_en >= now() - interval '30 days'
  union all select 11, 'artistas visibles', count(*)::text from public.artistas where visible
  union all select 12, 'artistas visibles con foto', count(*)::text from public.artistas where visible and nullif(btrim(foto), '') is not null
  union all select 13, 'Voy y Me interesa, últimos 7 días', count(*)::text from gestos where creado_en >= now() - interval '7 days'
  union all select 14, 'Voy y Me interesa, 7 días anteriores', count(*)::text from gestos where creado_en < now() - interval '7 days'
  union all select 15, 'primera publicación, últimos 7 días', count(*)::text from primeras where primera >= now() - interval '7 days'
  union all select 16, 'primera publicación, 7 días anteriores', count(*)::text from primeras where primera >= now() - interval '14 days' and primera < now() - interval '7 days'
  union all select 17, 'cuentas que han publicado alguna vez', count(*)::text from primeras
) t order by o;
