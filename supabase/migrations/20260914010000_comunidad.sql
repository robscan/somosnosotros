-- somosnosotros · migración 0006 · comunidad
-- Preferencia de avisos por correo y registro de avisos enviados (para no repetir).
alter table public.perfiles add column avisos boolean not null default true;
comment on column public.perfiles.avisos is 'Recibir avisos por correo: nuevo evento en un lugar que sigo y recordatorio el día del evento.';

create table public.avisos_enviados (
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  evento_id uuid not null references public.eventos (id) on delete cascade,
  tipo text not null check (tipo in ('nuevo_evento', 'recordatorio')),
  enviado_en timestamptz not null default now(),
  primary key (usuario_id, evento_id, tipo)
);
-- Solo el servidor (service role) escribe y lee; ningún cliente.
alter table public.avisos_enviados enable row level security;

-- Cuántas personas van (para mostrar sin traer la lista completa).
create index asistencias_evento_idx on public.asistencias (evento_id, estado);
create index seguimientos_lugar_idx on public.seguimientos (lugar_id);
