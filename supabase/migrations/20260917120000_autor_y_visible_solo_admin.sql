-- somosnosotros · el autor de una ficha y ocultarla los cambia solo la administración (lugares, artistas y eventos)
-- Hallazgo (2026-09-16, confirmado en PGlite con todas las migraciones de main): la política de edición de lugares
-- (20260916120000_lugares_cuentas.sql) y la de artistas (20260914050000_artistas.sql) revisan la fila nueva con
-- gestiona_lugar(id) y gestiona_artista(id). Esas funciones buscan la ficha en la tabla y Postgres revisa antes de escribir:
-- leen la fila guardada, nunca el autor nuevo. Con una petición directa a la API (la app nunca manda creado_por):
--   · el autor le pasaba su ficha a cualquier otra cuenta, o la dejaba sin autor;
--   · una cuenta ligada que no es la autora se ponía de autora y luego borraba la ficha ("borra autor o admin" solo mira
--     creado_por); al borrar un lugar se iban con él los eventos que otras personas publicaron ahí. La bitácora 054 dice que
--     la cuenta ligada edita, pero no oculta ni borra. Antes de 0024, la política de lugares miraba creado_por en la fila nueva.
-- Ocultar tenía otro hueco: la app solo le enseña el botón a la administración, pero la base dejaba ocultar y volver a
-- mostrar al autor (lugares, artistas y eventos) y a la cuenta ligada, también lo que la administración ocultó por un
-- reporte. Decisión del founder (2026-09-16, noche): ocultar y volver a mostrar es solo de la administración, en los tres
-- («Solo tú»). Quien publicó algo lo sigue pudiendo borrar.
--
-- Arreglo: un trigger antes de cada UPDATE compara la fila guardada con la nueva, como proteger_rol en perfiles.
-- `revoke update (creado_por)` no sirve: con el permiso de tabla de Supabase, authenticated conserva el UPDATE de la
-- columna (hallazgo P2, bitácora 072).
-- Solo vigila lo que piden las cuentas: anon y authenticated, los roles con los que la API atiende a cada persona y a los
-- que se aplican las políticas por fila. Lo que hace la propia base no pasa por aquí: al borrar una cuenta, la llave
-- foránea deja sus fichas sin autor con un UPDATE que corre como dueña de la tabla, pero con la sesión de quien se borra,
-- que no es administradora; si se vigilara, "Borrar mi cuenta" fallaría a quien publicó algo. Tampoco el servidor con la
-- llave de servicio, las migraciones ni el editor de Supabase. Por eso la función no es security definer: current_user
-- tiene que ser quien hace el cambio.
-- Los eventos ya tenían el autor protegido por su política (creado_por = auth.uid() en la fila nueva); aquí se repite.
-- Se puede aplicar antes de que llegue el código de su rama: la app de hoy solo cambia creado_por o visible con la sesión de
-- la administración (pasarle la ficha, ocultar y volver a mostrar); los formularios de alta y edición no los mandan.
-- Banco de pruebas: supabase/tests/autor_y_visible_solo_admin.mjs.

create function public.proteger_autor_y_visible() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') or public.es_admin() then
    return new;
  end if;
  if new.creado_por is distinct from old.creado_por then
    raise exception 'solo la administración cambia el autor de una ficha' using errcode = '42501';
  end if;
  if new.visible is distinct from old.visible then
    raise exception 'solo la administración oculta o vuelve a mostrar una ficha' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger proteger_autor_y_visible before update of creado_por, visible on public.lugares
  for each row execute function public.proteger_autor_y_visible();
create trigger proteger_autor_y_visible before update of creado_por, visible on public.artistas
  for each row execute function public.proteger_autor_y_visible();
create trigger proteger_autor_y_visible before update of creado_por, visible on public.eventos
  for each row execute function public.proteger_autor_y_visible();
