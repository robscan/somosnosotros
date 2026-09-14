-- somosnosotros · migración 0009 · consentimiento de avisos por canal
-- Antes, el correo de aviso salía a quien decía "Voy" sin pedirlo (perfiles.avisos, default true).
-- Un correo no pedido se marca como spam y, con un dominio nuevo, eso bloquea la entrega a todos.
-- Ahora cada canal se pide una vez, tras el primer "Voy", y se guarda con fecha (evidencia).
alter table public.perfiles
  add column avisos_correo boolean not null default false,
  add column avisos_push boolean not null default false,
  add column avisos_correo_desde timestamptz,
  add column avisos_push_desde timestamptz,
  add column avisos_correo_motivo text check (avisos_correo_motivo in ('baja', 'rebote', 'queja')),
  add column avisos_preguntado boolean not null default false;
comment on column public.perfiles.avisos_correo is 'Consentimiento explícito para avisos por correo (recordatorio del día y eventos nuevos de lo que sigue).';
comment on column public.perfiles.avisos_push is 'Consentimiento para avisos en el teléfono (push a la app instalada).';
comment on column public.perfiles.avisos_correo_motivo is 'Por qué se apagó el correo: baja de un toque, rebote o queja (lo escribe el servidor).';
comment on column public.perfiles.avisos_preguntado is 'Ya se le preguntó tras un "Voy"; no se vuelve a preguntar.';
-- El interruptor viejo deja de usarse; se conserva un ciclo y se quita en la siguiente migración.
comment on column public.perfiles.avisos is 'OBSOLETO desde la migración 0009: usar avisos_correo y avisos_push.';
