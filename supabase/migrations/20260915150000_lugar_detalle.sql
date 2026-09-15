-- somosnosotros · migración 0022 · qué es un lugar de tipo "Otro"
-- Con tipo "Otro" la persona puede decir qué es ("taller de cerámica", "librería"), sin obligación,
-- para ir formando tipos nuevos (docs/rediseno/13, decisión 12).
alter table public.lugares add column detalle text check (char_length(detalle) <= 60);
comment on column public.lugares.detalle is 'Qué es, cuando el tipo es Otro (opcional).';
