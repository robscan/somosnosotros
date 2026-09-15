-- somosnosotros · migración 0017 · aviso de cambio
-- Cuando el autor cambia la fecha o el lugar de un evento, se avisa a quienes dijeron "Voy" (hallazgos del founder, 2026-09-15).
alter table public.avisos_enviados drop constraint avisos_enviados_tipo_check;
alter table public.avisos_enviados add constraint avisos_enviados_tipo_check check (tipo in ('nuevo_evento', 'recordatorio', 'cambio'));
