-- somosnosotros · migración 0005 · cuándo se revela un sitio reservado (público: todos pueden ver la hora, no la dirección)
alter table public.eventos add column sitio_revelar_desde timestamptz;
