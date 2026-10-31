-- somosnosotros · OL-489 · migración 20261029250000 · la rutina semanal «Completar fichas»
--
-- Founder (2026-10-29): «cada semana desde aquí podemos correr rutina para buscar completar info de artistas o lugares que falten». La semana
-- de Instagram (OL-479) solo publica fichas con material (foto, portada, descripción de 120 caracteres o más y, en un artista, su Instagram):
-- esta rutina busca lo que les falta a los artistas y lugares con fecha próxima en una ciudad y lo deja como PROPUESTA, una por campo, sobre la
-- ficha que ya existe. Aceptarla la completa (el servidor, `src/lib/rutinas/aceptarFicha.ts`); nada se pone sin aceptar.
--
-- SOLO AÑADE:
--   · `rutinas_corridas.tipo` admite `fichas` (una corrida por ciudad, como las demás; la deja el botón de su ciudad o, una vez por semana, el
--     motor si el interruptor de Administración › Rutinas está encendido: `configuracion.rutina_fichas_semanal`, sin trabajo de pg_cron nuevo);
--   · `propuestas.tipo` admite `ficha`, y la columna `propuestas.campo` (nula en los demás tipos) dice qué se propone completar: foto, portada,
--     descripcion o instagram. Las filas que ya están siguen valiendo (todas tienen `campo` nulo y otro tipo).
-- `aceptar_propuesta` no cambia: una `ficha`, como un cartel, no crea ficha ahí; la marca aceptada y el servidor la liga a su ficha (`ficha_id`).

begin;

alter table public.rutinas_corridas drop constraint rutinas_corridas_tipo_check;
alter table public.rutinas_corridas add constraint rutinas_corridas_tipo_check check (tipo in ('lugares', 'agendas', 'artistas', 'showcase', 'carteles', 'fichas'));

alter table public.propuestas drop constraint propuestas_tipo_check;
alter table public.propuestas add constraint propuestas_tipo_check check (tipo in ('lugar', 'evento', 'artista', 'cartel', 'ficha'));

alter table public.propuestas
  add column campo text check (campo in ('foto', 'portada', 'descripcion', 'instagram')),
  add constraint propuestas_campo_de_ficha check ((tipo = 'ficha') = (campo is not null));
comment on column public.propuestas.campo is 'OL-489: en una propuesta de tipo ficha, el campo que completa de una ficha que ya existe (foto, portada, descripcion o instagram); nulo en los demás tipos.';
comment on column public.propuestas.ficha_id is 'La ficha que se creó al aceptar (un lugar o un artista; el evento publicado de una propuesta de evento; el evento al que se le puso un cartel; el artista o el lugar que una propuesta de ficha completó): la procedencia queda aquí.';

create index propuestas_ficha_campo_idx on public.propuestas ((datos ->> 'ficha_id'), campo) where tipo = 'ficha';

commit;
