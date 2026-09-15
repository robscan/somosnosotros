-- somosnosotros · migración 0021 · Novedades
-- Sección "Novedades" (docs/rediseno/13, decisiones 1 a 4): lo nuevo en lo que sigo, los cambios en lo que voy,
-- hoy vas y quién más va. Casi todo se calcula; lo único que se guarda es el cambio de fecha o lugar (para
-- quien no tiene avisos activados) y cuándo abrió la persona la sección (para el punto de la campana).
alter table public.perfiles add column novedades_vistas_en timestamptz;
comment on column public.perfiles.novedades_vistas_en is 'Cuándo abrió Novedades por última vez: lo posterior lleva punto.';

create table public.novedades (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  evento_id uuid not null references public.eventos (id) on delete cascade,
  tipo text not null check (tipo in ('cambio')),
  detalle text,
  creado_en timestamptz not null default now()
);
create index novedades_usuario_idx on public.novedades (usuario_id, creado_en desc);
alter table public.novedades enable row level security;
-- Cada quien lee las suyas; escribe solo el servidor (llave de servicio) cuando el autor cambia un evento.
create policy "novedades: las mías" on public.novedades for select using (usuario_id = auth.uid());
