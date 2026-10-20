-- somosnosotros · OL-424 · de dónde salió cada evento (bitácora 457)
-- Pedido del founder (2026-10-20): «un mapeo de la actividad cultural durante todo el año, localizando las agendas culturales del resto de los
-- meses desde enero para acá […] Si es viable, entonces lo usamos para nutrir el contenido de la aplicación aunque sean eventos pasados».
-- El gestor lee las agendas mensuales de la Secretaría de Cultura (PDF, enero a agosto de 2026) y las carga con el importador
-- (`scripts/instituciones/importar-eventos.ts --historico`). Hasta hoy la tabla no distinguía lo leído de una agenda de lo que publicó una
-- persona desde la app (doc de investigación «mapeo anual y showcase», §3.3).
--
-- Solo añade: dos columnas que nacen nulas en todas las filas, sus restricciones, un índice parcial y un disparador que las protege.
-- Ninguna fila cambia de significado y ninguna consulta de la app las lee todavía; se puede aplicar antes de desplegar el código.
--
-- Quién las escribe: el importador, con la llave de servicio, y la administración. Las acciones de la app no las mandan (sus INSERT y UPDATE
-- llevan la lista de columnas escrita: `guardar_evento_completo`, `guardar_evento_con_clase`, `publicar_festival_sin_programa`…), así que
-- editar un evento cargado de una agenda conserva su procedencia. Las políticas de `eventos` no cambian.
--
-- Avisos (comprobado en el banco `supabase/tests/pg/eventos-procedencia.test.mjs`): el importador inserta sin sesión (`auth.uid()` nulo),
-- así que `avisos_evento_trigger` registra el alta en `avisos_origen` con `nativo = false` y `avisos_encolar` sale antes de crear ningún job
-- (solo encola con sesión y con la marca `app.avisos_outbox`, que pone la acción del alta de la app). `avisos_recordatorios` solo mira lo
-- que empieza en las próximas 24 horas y tiene «voy»; lo pasado nunca entra. `avisos_admin_trigger_eventos` calla cuando el autor es la
-- administración, que es quien firma las cargas (el importador lo exige). Por eso esta migración no toca ninguna función de avisos.

-- ---------- 1. Las columnas ----------
alter table public.eventos add column origen text
  constraint eventos_origen_valido check (origen is null or (char_length(origen) <= 60 and origen ~ '^[a-z0-9]+(-[a-z0-9]+)*$'));
alter table public.eventos add column fuente_url text
  constraint eventos_fuente_url_valida check (fuente_url is null or (char_length(fuente_url) <= 500 and fuente_url ~* '^https?://[^[:space:]]+$'));

comment on column public.eventos.origen is
  'De dónde salió el evento (OL-424). Nulo = lo publicó una persona desde la app. Si no, la carga que lo trajo, en minúsculas y con guiones: '
  'agenda-secult-2026-03 (agenda mensual de la Secretaría de Cultura), agenda-institucion, redes, capo. Lo escriben el importador y la administración.';
comment on column public.eventos.fuente_url is
  'La dirección del documento o la publicación de donde se leyó el evento (el PDF de la agenda, el post de Instagram), si lo trajo una carga (OL-424).';

-- Para contar o deshacer una carga entera («todo lo de la agenda de marzo»). Parcial: lo publicado desde la app no ocupa sitio.
create index eventos_origen_idx on public.eventos (origen) where origen is not null;

-- ---------- 2. Que nadie más las escriba ----------
-- Como `proteger_autor_y_visible` (20260917095000): con el permiso de tabla de Supabase, `revoke insert/update (origen)` no basta, porque
-- `authenticated` conserva el de la columna. Un disparador antes de escribir mira quién pide: las cuentas (`anon` y `authenticated`, los roles
-- con que la API atiende a cada persona) no las ponen ni las cambian; la administración, sí. Lo demás (la llave de servicio, las migraciones,
-- el editor de Supabase y las funciones SECURITY DEFINER, que corren como su dueña) no pasa por aquí. No es SECURITY DEFINER: `current_user`
-- tiene que ser quien hace el cambio.
create function public.proteger_procedencia_evento() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('anon', 'authenticated') or public.es_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.origen is not null or new.fuente_url is not null then
      raise exception 'solo la administración dice de dónde salió un evento' using errcode = '42501';
    end if;
  elsif new.origen is distinct from old.origen or new.fuente_url is distinct from old.fuente_url then
    raise exception 'solo la administración dice de dónde salió un evento' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.proteger_procedencia_evento() from public, anon, authenticated;
comment on function public.proteger_procedencia_evento() is
  'OL-424: las cuentas no ponen ni cambian origen y fuente_url de un evento; la administración y las cargas con la llave de servicio, sí.';

create trigger proteger_procedencia before insert or update of origen, fuente_url on public.eventos
  for each row execute function public.proteger_procedencia_evento();
