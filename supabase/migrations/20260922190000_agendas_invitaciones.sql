-- somosnosotros · migración 20260922190000 · correo a las instituciones pidiendo su agenda (OL-122)
-- Registra cada correo mandado con scripts/instituciones/invitar-agendas.ts para no repetir un envío del mismo
-- tipo al mismo buzón. El correo NO se guarda en claro: solo un hash SHA-256 con sal (AGENDAS_SAL, fuera del
-- repo). Solo añade. Sin políticas: ningún cliente la lee; solo el guion con la llave de servicio.
-- NO aplicar a producción hasta que el founder ordene el envío.

create table public.agendas_invitaciones_enviadas (
  id uuid primary key default gen_random_uuid(),
  lugar_id uuid null references public.lugares (id) on delete cascade,
  organismo text null,
  correo_hash text not null,
  tipo text not null,
  enviado_en timestamptz not null default now(),
  resend_id text,
  constraint agendas_invitaciones_tipo check (tipo in ('comprobacion', 'tanda', 'recordatorio')),
  constraint agendas_invitaciones_destino check (lugar_id is not null or organismo is not null),
  -- 64 hex: un SHA-256; así nunca cabe un correo en claro.
  constraint agendas_invitaciones_hash check (correo_hash ~ '^[0-9a-f]{64}$'),
  constraint agendas_invitaciones_unico unique (correo_hash, tipo)
);
comment on table public.agendas_invitaciones_enviadas is 'OL-122: correos mandados a las instituciones pidiendo su agenda (comprobación, tanda, recordatorio). Solo el hash con sal del correo, nunca el correo.';
create index agendas_invitaciones_lugar_idx on public.agendas_invitaciones_enviadas (lugar_id);

alter table public.agendas_invitaciones_enviadas enable row level security;
-- Sin políticas y sin permisos: ni anon ni authenticated leen ni escriben; service_role (salta RLS) sí.
revoke all on table public.agendas_invitaciones_enviadas from public, anon, authenticated;
grant all on table public.agendas_invitaciones_enviadas to service_role;
