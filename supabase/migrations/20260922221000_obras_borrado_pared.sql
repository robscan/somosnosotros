-- OL-126 (bitácora 161), «Borrar la pared» desde Administración: la hora del último borrado de la pared de una obra.
-- La escribe solo administración (acción de servidor `borrarPared`, que exige administración; la política de
-- actualización de obras_colectivas ya es solo admin). La pared, al recibir «borrar» por el canal, lee esta hora y
-- solo limpia el lienzo si hay un borrado reciente: así un mando no puede borrar la pared mandando el mensaje por su
-- cuenta (las políticas de realtime.messages se evalúan al unirse al canal, no por mensaje, así que el servidor no
-- puede distinguir un «borrar» de un trazo; esta columna es la comprobación barata del lado del servidor).
-- Solo añade. Va con 20260922220000_obras_instantanea.sql (mismo minuto: por eso el 221000).
alter table public.obras_colectivas add column if not exists borrado_pared_en timestamptz;
comment on column public.obras_colectivas.borrado_pared_en is 'Hora del último «Borrar la pared» desde Administración (OL-126); la pared la comprueba antes de limpiar.';
