-- Nombres del CAPO envueltos en comillas ("Afinque Orquesta"): las comillas no son parte del nombre y
-- mandaban esas fichas al principio del directorio (revisión 2026-09-14, UX 3). Los apodos dentro del nombre se quedan.
update public.artistas set nombre = trim(both '"' from nombre)
  where origen = 'capo' and nombre ~ '^"[^"]+"$';
