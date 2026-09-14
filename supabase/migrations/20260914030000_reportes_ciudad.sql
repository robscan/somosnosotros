-- somosnosotros · migración 0008 · reportar contenido y ciudad en eventos
create table public.reportes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('lugar', 'evento', 'perfil')),
  objeto_id uuid not null,
  motivo text not null check (motivo in ('falso', 'ofensivo', 'duplicado', 'no_cultural', 'otro')),
  detalle text check (char_length(detalle) <= 500),
  creado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  atendido boolean not null default false
);
create index reportes_pendientes_idx on public.reportes (atendido, creado_en desc);
alter table public.reportes enable row level security;
-- Cualquiera con sesión reporta; solo el admin lee y atiende.
create policy "reportes: reporto con sesión" on public.reportes for insert to authenticated with check (creado_por = auth.uid());
create policy "reportes: el admin lee" on public.reportes for select to authenticated using (public.es_admin());
create policy "reportes: el admin atiende" on public.reportes for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- La ciudad es un campo desde el día 1: los eventos también la llevan (del lugar, o la inicial si es otro sitio).
alter table public.eventos add column ciudad text not null default 'San Luis Potosí';
create index eventos_ciudad_inicio_idx on public.eventos (ciudad, inicio) where visible;
