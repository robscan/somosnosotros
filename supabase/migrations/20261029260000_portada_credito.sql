-- somosnosotros · OL-491 · migración 20261029260000 · el crédito de la portada de lugares y artistas (bitácora 523)
-- La semana de Instagram solo publica fichas con material (OL-488) y para completar portadas se consiguieron fotos de Wikimedia Commons con
-- licencias CC BY y CC BY-SA, que piden decir autor y licencia donde se usa la foto: la ficha pública y la publicación. Hasta hoy ni `lugares`
-- ni `artistas` tenían dónde guardarlo.
--
-- Solo añade: una columna de texto corto y opcional en cada tabla («Pablo Pérez · CC BY-SA 4.0», con la dirección de la foto entre paréntesis
-- o al final si se quiere enlazar). Nula = sin crédito. De 1 a 160 letras, en una línea (sin saltos ni caracteres de control).
--
-- Quién la lee y quién la escribe: lo mismo que `portada`. Las políticas de `lugares` y `artistas` son por fila, no por columna, y ninguna de
-- las dos tablas tiene permisos por columna: quien ya lee la ficha lee su crédito (la ficha pública, la hoja de Lugares y el trabajador de
-- Instagram lo piden en su `select` directo a la tabla) y quien ya puede editarla (su autor, su cuenta ligada y la administración) lo escribe.
-- No hay vistas sobre estas tablas. Las funciones que devuelven `portada` son de Administración (`panel_lugares`, `admin_buscar_fichas`,
-- `instagram_candidatos`) o la de la página de la bio (`instagram_semana_bio`, la miniatura de cada ficha en /ig, que lleva a la ficha con su
-- crédito); ninguna pinta la portada grande, así que no se vuelve a crear ninguna y nada cambia de firma (las de Instagram las tocan otras piezas).

alter table public.lugares add column portada_credito text
  constraint lugares_portada_credito_forma check (portada_credito is null or (char_length(portada_credito) between 1 and 160 and portada_credito !~ '[[:cntrl:]]'));
comment on column public.lugares.portada_credito is 'Crédito de la portada (OL-491): autor y licencia, y si se quiere la dirección de la foto («Pablo Pérez · CC BY-SA 4.0 (https://…)»). Opcional; máximo 160, en una línea.';

alter table public.artistas add column portada_credito text
  constraint artistas_portada_credito_forma check (portada_credito is null or (char_length(portada_credito) between 1 and 160 and portada_credito !~ '[[:cntrl:]]'));
comment on column public.artistas.portada_credito is 'Crédito de la portada (OL-491): autor y licencia, y si se quiere la dirección de la foto («Pablo Pérez · CC BY-SA 4.0 (https://…)»). Opcional; máximo 160, en una línea.';
