-- somosnosotros · leer lo recién creado: lugares privados u ocultos y artistas ocultos
-- Fallo (2026-09-16): un administrador no podía crear un lugar privado desde la app ("new row violates row-level
-- security policy for table lugares"). La app crea con insert(...).select("id"), que en la base es INSERT … RETURNING,
-- y entonces Postgres exige que la fila nueva pase también la política de lectura. Desde la migración de reclamar
-- lugares (20260916120000_lugares_cuentas.sql) esa política es "(visible and not privado) or gestiona_lugar(id)", y
-- gestiona_lugar busca el lugar en la tabla: Postgres revisa la fila antes de escribirla, así que no la encuentra
-- (volverla volatile no cambia nada). Lo público pasaba; lo privado o lo oculto, no. La lectura de artistas (0010) tenía
-- la misma trampa con un artista oculto, aunque hoy la app no los crea ocultos.
-- Arreglo: la política mira primero la propia fila (su autor o el administrador), como antes de 0024, y gestiona_*
-- queda para las cuentas ligadas, que solo existen sobre fichas ya guardadas. Para lo ya guardado nada cambia:
-- gestiona_* ya incluía al autor y al administrador. Solo cambia la expresión de cada política.
-- Banco de pruebas: supabase/tests/lectura_al_crear.mjs.

alter policy "lugares: lectura" on public.lugares
  using ((visible and not privado) or creado_por = auth.uid() or public.es_admin() or public.gestiona_lugar(id));

alter policy "artistas: lectura" on public.artistas
  using (visible or creado_por = auth.uid() or public.es_admin() or public.gestiona_artista(id));
