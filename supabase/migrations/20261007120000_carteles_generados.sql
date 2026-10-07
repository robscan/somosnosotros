-- somosnosotros · OL-324 · creador de cartel por plantillas: los carteles generados (bitácora 353, doc 52)
-- Una fila por cartel que alguien descargó o usó como cartel de su evento. Sirve para dos cosas:
--   · la memoria del estilo del lugar: la plantilla que se usó la última vez en un lugar sale primero (doc 52 §3.4);
--   · contar cuántos hace cada persona al mes, el día que el founder decida un tope o un cobro (esta pieza no pone ninguno).
-- No se guarda la imagen descargada (ahorra cuota, doc 52 §3.6): `ruta` solo lleva el objeto de Storage cuando el cartel se usó como
-- imagen del evento. Lee y escribe su autor (y solo para un evento que gestiona); la administración, todo.
-- Solo añade: una tabla, dos índices y sus políticas. No toca nada existente.

create table public.carteles_generados (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  perfil_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  -- El id estable de la plantilla (`src/lib/carteles/plantillas`): letras, números y guiones.
  plantilla text not null check (plantilla ~ '^[a-z0-9-]{1,40}$'),
  formato text not null check (formato in ('4x5', '9x16')),
  -- El objeto en el bucket `fotos` cuando se usó como cartel del evento; null si solo se descargó.
  ruta text check (ruta is null or (length(ruta) between 1 and 300 and ruta !~ '(^|/)\.\.(/|$)')),
  creado_en timestamptz not null default now()
);
comment on table public.carteles_generados is 'Carteles hechos con el creador por plantillas (OL-324): memoria del estilo del lugar y conteo por persona y mes. Sin la imagen salvo «Usar como cartel».';

-- Cuántos hizo cada quien este mes (el tope que decida el founder) y la memoria del lugar por evento.
create index carteles_generados_perfil_idx on public.carteles_generados (perfil_id, creado_en desc);
create index carteles_generados_evento_idx on public.carteles_generados (evento_id, creado_en desc);

alter table public.carteles_generados enable row level security;
revoke all on public.carteles_generados from public, anon;
grant select, insert on public.carteles_generados to authenticated;
grant update, delete on public.carteles_generados to authenticated;

create policy "carteles_generados: lee su autor o la administración" on public.carteles_generados for select to authenticated
  using (perfil_id = auth.uid() or public.es_admin());
-- Escribe su autor, a su nombre y solo para un evento que gestiona (autor o administración, `gestiona_evento`).
create policy "carteles_generados: escribe su autor en su evento" on public.carteles_generados for insert to authenticated
  with check ((perfil_id = auth.uid() and public.gestiona_evento(evento_id)) or public.es_admin());
-- Corregir o borrar una fila: solo la administración (el conteo del mes no se toca desde la cuenta que lo genera).
create policy "carteles_generados: edita la administración" on public.carteles_generados for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "carteles_generados: borra la administración" on public.carteles_generados for delete to authenticated
  using (public.es_admin());
