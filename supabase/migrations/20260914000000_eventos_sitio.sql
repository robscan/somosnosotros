-- somosnosotros · migración 0004 · eventos en "otro sitio" y "sitio reservado"
-- El evento se anuncia; el sitio se guarda. Un evento puede ser en un lugar registrado, en otro sitio
-- (texto público, pin opcional) o en un sitio reservado: texto público + dirección exacta en una tabla
-- aparte que solo se entrega a personas con sesión a partir de una hora, y siempre al autor y al admin.

alter table public.eventos alter column lugar_id drop not null;
alter table public.eventos add column sitio_texto text check (char_length(sitio_texto) <= 120);
alter table public.eventos add column sitio_lat double precision check (sitio_lat between -90 and 90);
alter table public.eventos add column sitio_lng double precision check (sitio_lng between -180 and 180);
alter table public.eventos add column sitio_reservado boolean not null default false;
alter table public.eventos add constraint eventos_donde check (lugar_id is not null or sitio_texto is not null);
comment on column public.eventos.sitio_texto is 'Cómo se anuncia el sitio cuando no es un lugar registrado ("Casa en Tequis", "Plaza de Armas").';
comment on column public.eventos.sitio_reservado is 'La dirección exacta vive en eventos_sitio_privado y se revela con condiciones.';

create table public.eventos_sitio_privado (
  evento_id uuid primary key references public.eventos (id) on delete cascade,
  direccion text not null check (char_length(direccion) <= 200),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  indicaciones text check (char_length(indicaciones) <= 300),
  revelar_desde timestamptz not null,
  actualizado_en timestamptz not null default now()
);
comment on table public.eventos_sitio_privado is 'Dirección exacta de un evento con sitio reservado. Nunca la lee un anónimo.';
create trigger eventos_sitio_privado_tocar before update on public.eventos_sitio_privado for each row execute function public.tocar_actualizado_en();

alter table public.eventos_sitio_privado enable row level security;

-- ¿Puedo gestionar este evento? (autor o admin)
create function public.gestiona_evento(p_evento uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.eventos e where e.id = p_evento and (e.creado_por = auth.uid() or public.es_admin()));
$$;

-- Lectura: autor/admin siempre; cualquier persona con sesión desde revelar_desde.
create policy "sitio privado: autor, admin, o con sesión cuando toca" on public.eventos_sitio_privado for select
  using (public.gestiona_evento(evento_id) or (auth.uid() is not null and now() >= revelar_desde));
create policy "sitio privado: escribe autor o admin" on public.eventos_sitio_privado for insert to authenticated
  with check (public.gestiona_evento(evento_id));
create policy "sitio privado: edita autor o admin" on public.eventos_sitio_privado for update to authenticated
  using (public.gestiona_evento(evento_id)) with check (public.gestiona_evento(evento_id));
create policy "sitio privado: borra autor o admin" on public.eventos_sitio_privado for delete to authenticated
  using (public.gestiona_evento(evento_id));
