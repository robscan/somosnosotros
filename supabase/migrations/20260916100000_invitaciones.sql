-- somosnosotros · invitación por correo a los artistas importados del CAPO (OL-011)
-- Registra cada correo mandado con scripts/capo/invitar.ts para no invitar dos veces a la misma persona.
-- Sin políticas: como contactos_importados, ningún cliente la lee; solo el script con la llave de servicio.
-- NO aplicar a producción hasta que el founder apruebe el texto de la invitación.

create table public.invitaciones_enviadas (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid not null references public.artistas (id) on delete cascade,
  correo text not null,
  enviado_en timestamptz not null default now(),
  resend_id text
);
create index invitaciones_enviadas_artista_idx on public.invitaciones_enviadas (artista_id);
alter table public.invitaciones_enviadas enable row level security;
