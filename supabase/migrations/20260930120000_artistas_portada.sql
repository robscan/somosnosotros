-- somosnosotros · OL-247 (bitácora 275) · portada propia para la ficha de artista.
-- Solo añade una columna opcional (la imagen ancha del héroe, como la portada del lugar). Las políticas de
-- `artistas` son por fila, no por columna: quien ya podía editar la ficha puede escribir la portada.
alter table public.artistas add column portada text;
comment on column public.artistas.portada is 'Imagen ancha de la cabecera de la ficha (OL-247); la foto del artista sigue siendo el avatar. Opcional.';
