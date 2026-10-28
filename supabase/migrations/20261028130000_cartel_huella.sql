-- somosnosotros · OL-464 · migración 20261028130000 · la huella del cartel de un evento (bitácora 496)
-- Founder (2026-10-27), al revisar el carrusel de «Cultura Mística»: «Este festival tiene más eventos que carteles. Asegúrate de que no se repitan
-- las imágenes». Al aceptar cada acto, `ponerCartel` guarda su propia copia del cartel del día en Storage (otra dirección por acto): comparar
-- direcciones no basta. La huella dice si dos carteles son el mismo por su contenido (`src/lib/carteles/huella.ts`).
--
-- SOLO AÑADE:
--   · `eventos.cartel_huella`: `<forma>.<color>.<bytes>` en hexadecimal (el dHash de 256 bits, la media RGB de una rejilla de 4 × 4 y el
--     SHA-256 del archivo), o null (sin calcular: el carrusel la calcula al vuelo). La pone el servidor al guardar un cartel (`ponerCartel`).
--   · Un disparador: si cambia la imagen y no llega su huella en la misma escritura, queda sin calcular (como `colores_cartel`, OL-360); y solo el
--     servidor (o la base) la escribe: lo que mande una cuenta (authenticated o anon) se ignora.
-- Ninguna función ni política cambia; ninguna fila cambia.
begin;

alter table public.eventos add column cartel_huella text check (cartel_huella is null or cartel_huella ~ '^[0-9a-f]{64}\.[0-9a-f]{96}\.[0-9a-f]{64}$');
comment on column public.eventos.cartel_huella is
  'OL-464: la huella de su cartel (forma, color y bytes: src/lib/carteles/huella.ts) para no repetir carteles en un carrusel. Null = sin calcular.';

create function public.eventos_cartel_huella() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  -- Solo el servidor la escribe.
  if coalesce(current_setting('role', true), '') in ('authenticated', 'anon') then
    new.cartel_huella := case when tg_op = 'UPDATE' then old.cartel_huella else null end;
  end if;
  -- Un cartel nuevo no hereda la huella del anterior.
  if tg_op = 'UPDATE' and new.imagen is distinct from old.imagen and new.cartel_huella is not distinct from old.cartel_huella then
    new.cartel_huella := null;
  end if;
  return new;
end $$;

create trigger eventos_cartel_huella before insert or update on public.eventos
  for each row execute function public.eventos_cartel_huella();

commit;
