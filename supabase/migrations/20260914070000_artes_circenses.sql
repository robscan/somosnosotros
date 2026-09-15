-- Artes circenses como disciplina propia (decisión del founder, 2026-09-14): "Otro" se quedaba solo con ellas.
alter table public.artistas drop constraint if exists artistas_disciplina_check;
alter table public.artistas
  add constraint artistas_disciplina_check
  check (disciplina in ('musica', 'teatro', 'danza', 'artes_visuales', 'letras', 'cine', 'circo', 'otro', 'por_completar'));

-- Los importados del CAPO que estaban en "otro · artes circenses" pasan a la disciplina; el detalle ya no hace falta.
update public.artistas
  set disciplina = 'circo', detalle = null
  where disciplina = 'otro' and lower(coalesce(detalle, '')) = 'artes circenses';
