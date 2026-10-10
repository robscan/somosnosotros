-- OL-358 · La regla de las 3 horas (bitácora 389).
-- Decisión del founder (2026-10-09): un evento sin hora de fin deja de verse 3 horas después de empezar, en toda la app.
-- Sustituye su regla del 2026-09-16 (sin hora de fin, hasta la medianoche de su día en su zona), que a las 18:00 seguía
-- mostrando una inauguración de las 10:00. Medida que lo sostiene: de 36 eventos con hora de fin, 20 duran 3 h o menos.
--
-- Postgres no deja cambiar la expresión de una columna generada: se quita `eventos.termina` y se vuelve a crear con el
-- mismo nombre, así que las funciones que filtran con `e.termina >= now()` (destacados, tope_de_lecturas, indicadores,
-- coincidencias_lista, rol_de_entonces, festivales…) no cambian. No hay vistas que la usen. Sí la usa una política
-- (la del sitio privado, migración 20261003130000): se aparta un momento a una versión sin `termina` y se repone igual.
-- La regla en la app vive en `terminaDe` (src/lib/fechas.ts): las dos deben decir lo mismo.
begin;

-- 1. La política que depende de la columna, sin ella mientras tanto (solo autor y admin, dentro de esta transacción).
alter policy "sitio privado: autor, admin, o con sesión cuando toca"
  on public.eventos_sitio_privado
  using (public.gestiona_evento(evento_id));

-- 2. La columna con la regla nueva, ya sin depender de la zona (quitarla quita también sus dos índices).
alter table public.eventos drop column if exists termina;
alter table public.eventos add column termina timestamptz not null generated always as (
  -- `timestamptz + interval` no es inmutable para Postgres; en UTC (sin cambios de horario) es lo mismo: inicio + 3 h.
  coalesce(fin, pg_catalog.timezone('UTC', pg_catalog.timezone('UTC', inicio) + interval '3 hours'))
) stored;
comment on column public.eventos.termina is 'Cuándo deja de mostrarse: al terminar o, sin hora de fin, 3 horas después de empezar (founder, 2026-10-09).';
create index if not exists eventos_termina_idx on public.eventos (termina) where visible;
create index if not exists eventos_ciudad_termina_idx on public.eventos (ciudad, termina) where visible;

-- 3. La política, tal cual la dejó la migración 20261003130000.
alter policy "sitio privado: autor, admin, o con sesión cuando toca"
  on public.eventos_sitio_privado
  using (
    exists (
      select 1 from public.eventos e
      where e.id = evento_id
        and now() < e.termina + interval '168 hours'
        and (
          public.gestiona_evento(e.id)
          or (auth.uid() is not null and now() >= revelar_desde
            and e.visible and e.sitio_reservado
            and now() < e.termina + interval '2 hours')
        )
    )
  );

commit;
