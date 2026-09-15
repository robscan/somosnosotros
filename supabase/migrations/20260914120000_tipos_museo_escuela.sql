-- somosnosotros · tipos de lugar Museo y Escuela (decisión del founder, 2026-09-14; bitácora 032)
-- Hasta hoy los museos iban como Galería y las escuelas de arte como Otro. Aquí solo se amplía la lista cerrada:
-- ninguna fila cambia. Va ANTES de desplegar el código que ofrece los tipos nuevos (si no, dar de alta un museo falla);
-- pasar los lugares a Museo y Escuela va DESPUÉS del despliegue (scripts/instituciones/reclasificar-tipos.sql).

alter table public.lugares drop constraint lugares_tipo_check;
alter table public.lugares add constraint lugares_tipo_check
  check (tipo in ('casa_de_cultura', 'museo', 'foro', 'galeria', 'escuela', 'colectivo', 'biblioteca', 'otro'));
