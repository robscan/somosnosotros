-- somosnosotros · migración 0011 · fichas tomadas del Catálogo de Artistas Potosinos (CAPO)
-- CAPO es el catálogo público de la Dirección de Cultura Municipal (catalogoartistaspotosino.com).
-- Sus fichas entran sin autor (creado_por nulo), sin foto y marcadas con su origen: la ficha dice de dónde
-- viene y queda "por confirmar" hasta que el artista la reclama con "Soy yo / es mi grupo".
-- Los correos de contacto del catálogo NO van en la ficha: viven en una tabla que ningún cliente lee.

alter table public.artistas add column origen text check (origen in ('capo'));
alter table public.lugares add column origen text check (origen in ('capo'));
comment on column public.artistas.origen is 'capo: ficha tomada del Catálogo de Artistas Potosinos, por confirmar por el artista.';
comment on column public.lugares.origen is 'capo: ficha tomada del Catálogo de Artistas Potosinos, por confirmar por el lugar.';

-- Correo de contacto que traía cada ficha importada, solo para invitar una vez (decisión del founder, 2026-09-14).
-- Sin políticas: como admin_correos, ningún cliente la lee; solo el script con la llave de servicio.
create table public.contactos_importados (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid references public.artistas (id) on delete cascade,
  lugar_id uuid references public.lugares (id) on delete cascade,
  correo text not null,
  fuente text not null default 'capo',
  url_fuente text,
  capturado_en timestamptz not null default now(),
  invitado_en timestamptz,
  check ((artista_id is not null)::int + (lugar_id is not null)::int = 1)
);
create index contactos_importados_artista_idx on public.contactos_importados (artista_id);
create index contactos_importados_lugar_idx on public.contactos_importados (lugar_id);
alter table public.contactos_importados enable row level security;
