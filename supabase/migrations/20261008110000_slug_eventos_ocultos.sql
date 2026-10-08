-- somosnosotros · migración 20261008110000 · el slug se calcula contra todas las filas (OL-343, bitácora 372)
-- Solo cambia el modo de los tres disparadores de slug (eventos, lugares, artistas): pasan a SECURITY DEFINER.
--
-- El fallo (lo encontró OL-341, bitácora 370): el disparador corría con los permisos de quien publica, y su
-- `exists (select 1 from public.<tabla> where slug = candidato …)` pasaba por la RLS de lectura. Lo que esa cuenta
-- no ve —un evento oculto o retirado por la administración, el de alguien a quien bloqueó, un lugar privado de
-- otra cuenta, un artista oculto— le parecía libre, así que el candidato ya existía y el índice único
-- (eventos_slug_idx, lugares_slug_idx, artistas_slug_idx) rechazaba la publicación con 23505. Pasaba en los tres:
-- la prueba supabase/tests/pg/slug-fichas-ocultas.test.mjs lo reproduce en cada tabla.
--
-- Por qué en el disparador y no en una función nueva: el disparador ya es la única puerta (sin EXECUTE para anon
-- ni authenticated desde 20260922140000/160000/170000; un trigger no puede llamarse aparte) y no devuelve nada a
-- quien publica salvo el slug de su propia fila, que de todos modos iba a ver. Con SECURITY DEFINER las consultas
-- de dentro corren como la dueña de la tabla, que no pasa por la RLS, y eso incluye `slug_de_evento`, que el
-- disparador de eventos llama (una función normal llamada desde una definer hereda ese usuario). `slug_de_evento`
-- sigue con los permisos de quien llama: si alguien con sesión la invoca aparte, solo ve lo que ya podía ver, así
-- que no sirve para averiguar si existe una ficha oculta. Mismo modo que los otros disparadores internos que leen
-- filas ajenas (eventos_zona_del_lugar, lugares_zona_a_sus_eventos).
--
-- `alter function` conserva el cuerpo, el `set search_path = ''`, el dueño, los permisos y los disparadores
-- instalados; el bloqueo consultivo (pg_advisory_xact_lock) sigue igual. Las ediciones no cambian: los tres son
-- `before insert`, el slug nunca se recalcula al renombrar. Las funciones de festival de OL-341
-- (unir_a_festival_parecido, festival_de_dos_parecidos) ya eran SECURITY DEFINER, así que el marco que crean ya
-- veía todas las filas.
--
-- NO se aplica aquí: la aplica el gestor antes de publicar.

alter function public.eventos_generar_slug() security definer;
alter function public.lugares_generar_slug() security definer;
alter function public.artistas_generar_slug() security definer;

comment on function public.eventos_generar_slug() is 'Pone el slug al crear un evento. SECURITY DEFINER para comprobar la unicidad contra todas las filas, también las que quien publica no ve (OL-343).';
comment on function public.lugares_generar_slug() is 'Pone el slug al crear un lugar. SECURITY DEFINER para comprobar la unicidad contra todas las filas, también las privadas u ocultas (OL-343).';
comment on function public.artistas_generar_slug() is 'Pone el slug al crear un artista. SECURITY DEFINER para comprobar la unicidad contra todas las filas, también las ocultas (OL-343).';
