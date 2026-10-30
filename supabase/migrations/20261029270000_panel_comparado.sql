-- somosnosotros · OL-494 · la portada de Administración compara con la semana anterior (bitácora 526)
-- El founder firmó el 2026-10-29 la variante C del prototipo OL-493 (bitácora 525) y pidió que «Personas nuevas» y «Eventos de la
-- comunidad» lleven «▲ N más» frente a la semana anterior, como los demás números de «Esta semana en números». La base no guardaba esas dos
-- cifras de hace una semana: esta migración reemplaza `panel_resumen()` (misma firma, mismo cuerpo) y solo le añade la llave `comparado`:
--   personas_nuevas_antes: cuentas creadas entre hace 14 y hace 7 días, sin administradores (con el rol de entonces, como `personas_nuevas`);
--   comunidad / comunidad_antes: eventos visibles que publicó una cuenta que no era de administración (o sin autor, como `comunidad` de
--     `indicadores_ahora()`) en los últimos 7 días y en los 7 anteriores. A diferencia de `ahora.comunidad_nuevos`, no se pide que el evento
--     siga por venir: comparar «los publicados esta semana que aún no pasan» con «los de la semana anterior que aún no pasan» castiga a la
--     semana anterior, cuyos eventos ya tuvieron siete días más para terminar. Así se cuenta lo mismo en las dos semanas.
-- «Eventos esta semana» ya se compara con la foto diaria de hace una semana (`historia`): no necesita nada nuevo.
-- Solo reemplaza: ninguna tabla, columna ni política cambia. SECURITY DEFINER con `search_path = ''` (regla general del Advisor, OL-486), el
-- mismo candado del rol por dentro y los mismos permisos (se repiten explícitos).
begin;

create or replace function public.panel_resumen() returns json
language plpgsql security definer set search_path = '' as $$
declare
  ahora json;
  hoy date := (now() at time zone 'America/Mexico_City')::date;
begin
  if not public.es_admin() then
    raise exception 'solo la administración' using errcode = '42501';
  end if;
  ahora := public.indicadores_ahora();
  -- Si la tarea de la mañana no dejó la foto de hoy, la deja el primer vistazo del día.
  insert into public.indicadores_diarios (dia, activas, cuentas, coincidencias, eventos_semana, lugares_con_fecha, lugares, comunidad, proximos)
  values (hoy, (ahora ->> 'activas')::int, (ahora ->> 'cuentas')::int, (ahora ->> 'coincidencias')::int, (ahora ->> 'eventos_semana')::int,
    (ahora ->> 'lugares_con_fecha')::int, (ahora ->> 'lugares')::int, (ahora ->> 'comunidad')::int, (ahora ->> 'proximos')::int)
  on conflict (dia) do nothing;
  return json_build_object(
    'ahora', ahora,
    'historia', (
      select coalesce(json_agg(json_build_object('dia', i.dia, 'activas', i.activas, 'coincidencias', i.coincidencias, 'eventos_semana', i.eventos_semana, 'comunidad', i.comunidad) order by i.dia), '[]'::json)
      from public.indicadores_diarios i
      where i.dia >= hoy - 90 and i.dia < hoy
    ),
    'gestionar', json_build_object(
      'personas', (select count(*) from public.perfiles),
      'personas_nuevas', (select count(*) from public.perfiles p where public.rol_en(p.id, p.creado_en) <> 'admin' and p.creado_en >= now() - interval '7 days'),
      'nunca_entraron', (select count(*) from public.perfiles p join auth.users u on u.id = p.id where u.last_sign_in_at is null),
      'correo_con_problema', (select count(*) from public.perfiles where avisos_correo_motivo in ('rebote', 'queja')),
      'lugares', (select count(*) from public.lugares where visible and not privado),
      'lugares_sin_fecha', (select count(*) from public.lugares l where l.visible and not l.privado
        and not exists (select 1 from public.eventos e where e.lugar_id = l.id and e.visible and e.termina >= now())),
      'lugares_ocultos', (select count(*) from public.lugares where not visible),
      'lugares_privados', (select count(*) from public.lugares where privado),
      'eventos', (select count(*) from public.eventos e where e.visible and e.termina >= now()),
      'eventos_sin_imagen', (select count(*) from public.eventos e where e.visible and e.termina >= now() and e.imagen is null),
      'artistas', (select count(*) from public.artistas where visible),
      'artistas_ocultos', (select count(*) from public.artistas where not visible),
      'artistas_llevados', (select count(distinct artista_id) from public.artistas_cuentas),
      'invitaciones', (select count(*) from public.invitaciones_enviadas)
    ),
    -- OL-494: lo de la semana anterior, para «▲ N más» en «Personas nuevas» y «Eventos de la comunidad».
    'comparado', json_build_object(
      'personas_nuevas_antes', (select count(*) from public.perfiles p where public.rol_en(p.id, p.creado_en) <> 'admin'
        and p.creado_en >= now() - interval '14 days' and p.creado_en < now() - interval '7 days'),
      'comunidad', (select count(*) from public.eventos e where e.visible
        and (e.creado_por is null or public.rol_en(e.creado_por, e.creado_en) <> 'admin')
        and e.creado_en >= now() - interval '7 days'),
      'comunidad_antes', (select count(*) from public.eventos e where e.visible
        and (e.creado_por is null or public.rol_en(e.creado_por, e.creado_en) <> 'admin')
        and e.creado_en >= now() - interval '14 days' and e.creado_en < now() - interval '7 days')
    )
  );
end $$;

revoke all on function public.panel_resumen() from public, anon;
grant execute on function public.panel_resumen() to authenticated, service_role;

commit;
