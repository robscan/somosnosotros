-- somosnosotros · tipo de lugar «Plaza, jardín o parque» (decisión del founder, 2026-10-05; OL-287, bitácora 315)
-- Sitios como el Jardín Botánico El Izotal solo cabían en «Otro». Aquí solo se amplía la lista cerrada con el valor
-- `plaza`: ninguna fila cambia. Va ANTES de desplegar el código que ofrece el tipo nuevo (si no, dar de alta un
-- parque falla). La lista parte de la vigente: la dejó 20260914120000_tipos_museo_escuela.sql y ninguna migración
-- posterior volvió a tocar `lugares_tipo_check`.

alter table public.lugares drop constraint lugares_tipo_check;
alter table public.lugares add constraint lugares_tipo_check
  check (tipo in ('casa_de_cultura', 'museo', 'foro', 'galeria', 'escuela', 'colectivo', 'biblioteca', 'plaza', 'otro'));
