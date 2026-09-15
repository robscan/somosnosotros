-- somosnosotros · migración 0023 · fuera la columna vieja perfiles.avisos
-- Desde la migración 0009 el consentimiento va por canal (avisos_correo, avisos_push); la columna vieja ya no
-- la lee ni la escribe nadie (OL-008, pendiente 3).
alter table public.perfiles drop column avisos;
