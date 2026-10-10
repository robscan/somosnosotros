-- OL-360 · Los colores del cartel, guardados con el evento (bitácora 391).
-- La tarjeta «título + cartel» de Inicio (prototipo firmado `barra-ahora.html`, founder 2026-10-09: «tarjetas: título + cartel y degradado
-- vivo») pinta la franja del título con los colores de su cartel. Se calculan una vez, en el teléfono al subir el cartel (o en el servidor
-- al generarlo con el creador de cartel), y se guardan aquí: Inicio nunca pide la imagen para calcularlos.
--
-- Solo añade: una columna que puede quedar vacía (null = sin calcular; la tarjeta usa la paleta propia del evento hasta que el relleno
-- `scripts/ops/colores-cartel.mjs` la calcule) y su comprobación de forma. Las lecturas de Inicio son selects directos sobre `eventos`
-- (`src/lib/cargarAgenda.ts`, `src/app/personas/consultas.ts`): ninguna función SQL cambia.
begin;

alter table public.eventos add column if not exists colores_cartel jsonb;

comment on column public.eventos.colores_cartel is
  'Los colores de su cartel (OL-360): cuatro #rrggbb, el fondo y tres luces de la más viva a la menos (src/lib/coloresCartel.ts). Null = sin calcular.';

-- Cuatro colores #rrggbb o nada: una forma distinta no se guarda.
alter table public.eventos drop constraint if exists eventos_colores_cartel_forma;
alter table public.eventos add constraint eventos_colores_cartel_forma check (
  colores_cartel is null
  or (
    jsonb_typeof(colores_cartel) = 'array'
    and jsonb_array_length(colores_cartel) = 4
    and jsonb_typeof(colores_cartel -> 0) = 'string' and (colores_cartel ->> 0) ~ '^#[0-9a-f]{6}$'
    and jsonb_typeof(colores_cartel -> 1) = 'string' and (colores_cartel ->> 1) ~ '^#[0-9a-f]{6}$'
    and jsonb_typeof(colores_cartel -> 2) = 'string' and (colores_cartel ->> 2) ~ '^#[0-9a-f]{6}$'
    and jsonb_typeof(colores_cartel -> 3) = 'string' and (colores_cartel ->> 3) ~ '^#[0-9a-f]{6}$'
  )
);

-- Un cartel nuevo no hereda los colores del anterior: si cambia la imagen y no llegan sus colores en la misma escritura, quedan sin calcular
-- (la app los guarda justo después, en la misma acción; si no, el relleno).
create or replace function public.eventos_colores_cartel_al_cambiar() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.imagen is distinct from old.imagen and new.colores_cartel is not distinct from old.colores_cartel then
    new.colores_cartel := null;
  end if;
  return new;
end $$;

drop trigger if exists eventos_colores_cartel_al_cambiar on public.eventos;
create trigger eventos_colores_cartel_al_cambiar before update of imagen on public.eventos
  for each row execute function public.eventos_colores_cartel_al_cambiar();

commit;
