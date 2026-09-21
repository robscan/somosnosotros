-- somosnosotros · OL-088 · Pincel en la app, Fase 2 bloque 1: borrar una obra colectiva (bitácora 123). Solo añade.
-- Cambia lo firmado el 2026-09-19 ("nadie borra, cerrarla basta"): el founder pidió permitir el borrado
-- (2026-09-21, "Permite borrado de obras colectivas"), ya en OPEN_LOOPS "Decidido".

-- Solo administración, y solo una obra ya CERRADA: una obra abierta se termina primero (cerrarla es la salida
-- normal); borrar es un paso aparte y sin marcha atrás.
create policy "obras_colectivas: borra solo admin y cerrada"
on public.obras_colectivas for delete
to authenticated
using (public.es_admin() and estado = 'cerrada');

-- La imagen final de una obra (cuando exista, Fase 2) vive en fotos/obras/<obra_id>.png, en el mismo bucket
-- público "fotos" que ya usa el resto de la app. Las policies de "fotos" de hoy (migración 20260914050000) solo
-- cubren las carpetas perfiles/lugares/artistas, con la segunda carpeta igual al uid de quien escribe; una obra
-- no tiene dueño personal (la segunda carpeta sería el id de la obra, no un uid), así que hace falta una policy
-- propia para poder borrar ahí. Sin policy de insert/update: nada sube todavía a esa carpeta (llega con la pared
-- de la Fase 2); esta migración solo habilita borrar lo que ya se pueda subir después.
create policy "fotos: obras solo admin"
on storage.objects for delete
to authenticated
using (bucket_id = 'fotos' and (storage.foldername(name))[1] = 'obras' and public.es_admin());
