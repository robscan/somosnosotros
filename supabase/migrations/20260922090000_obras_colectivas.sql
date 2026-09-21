-- somosnosotros · OL-088 · Pincel en la app, Fase 1: datos y admin, sin dibujar (bitácora 123). Solo añade.
-- Admin activa una obra colectiva desde un evento o, sin evento, desde su ubicación actual (founder, 2026-09-19).
-- Una sola obra abierta por lugar, y una sola por evento: lo exigen dos índices únicos parciales, no solo la pantalla.
-- Sin tabla de trazos (firmado por el founder): solo se guarda la imagen final, en una fase posterior.
-- Columna "tipo" (doc rediseno/25, ajuste 1, firmado 2026-09-21): Pincel es la primera obra colectiva; el motor no
-- se construye todavía, pero la columna que distingue un tipo de obra de otro es gratis hoy y costaría otra
-- migración después. "obras_colectivas" ya es el nombre neutro; solo faltaba poder distinguir el tipo en la fila.
begin;

create table public.obras_colectivas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 120),
  tipo text not null default 'pincel' check (char_length(tipo) between 1 and 40),
  lugar_id uuid not null references public.lugares (id) on delete cascade,
  evento_id uuid references public.eventos (id) on delete cascade,
  -- La pone sola el disparador de abajo, a partir del lugar (mismo patrón que eventos_zona_del_lugar).
  zona text not null default 'America/Mexico_City' constraint obras_colectivas_zona_valida check (public.zona_valida(zona)),
  cierra_en timestamptz not null,
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  creado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default clock_timestamp(),
  cerrado_en timestamptz,
  -- Ruta en el bucket "fotos" de la imagen final, una vez cerrada (Fase 2). Null mientras esté abierta.
  imagen_final text
);
comment on table public.obras_colectivas is 'Obras colectivas (OL-088): activaciones ligadas a un lugar y, si vino de uno, a un evento. "tipo" distingue Pincel de una obra futura (doc rediseno/25); hoy solo existe "pincel".';

create index obras_colectivas_lugar_id_idx on public.obras_colectivas (lugar_id);
create index obras_colectivas_evento_id_idx on public.obras_colectivas (evento_id);
create index obras_colectivas_creado_por_idx on public.obras_colectivas (creado_por);

-- Una sola obra abierta por lugar, y una sola por evento (founder, 2026-09-19: "una sola abierta por evento o por
-- lugar... hazlo cumplir en la base de datos"). El de lugar es el que de verdad importa (todo evento tiene su
-- lugar_id, not null); el de evento es un cinturón extra si algún día una obra por evento y otra por ubicación
-- llegaran a compartir el mismo evento_id sin compartir lugar_id.
create unique index obras_colectivas_lugar_abierta on public.obras_colectivas (lugar_id) where estado = 'abierta';
create unique index obras_colectivas_evento_abierta on public.obras_colectivas (evento_id) where estado = 'abierta' and evento_id is not null;

-- La zona la hereda del lugar, igual que un evento (eventos_zona_del_lugar, migración 20260917100000): quien crea la
-- obra no puede mandar una zona distinta a la del lugar donde en verdad está.
create function public.obras_colectivas_zona_del_lugar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.zona := coalesce((select l.zona from public.lugares l where l.id = new.lugar_id), new.zona);
  return new;
end;
$$;
create trigger obras_colectivas_zona_del_lugar before insert or update of lugar_id on public.obras_colectivas
  for each row execute function public.obras_colectivas_zona_del_lugar();

alter table public.obras_colectivas enable row level security;

-- Lectura pública: la proyección (Fase 2) se abre sin sesión, en una laptop o TV conectada al cañón. Nada personal
-- en esta tabla (el nombre de la obra, no de personas).
create policy "obras_colectivas: lectura pública"
on public.obras_colectivas for select
using (true);

-- Alta y cambios de estado (crear, terminar, reabrir): solo administración, como las dos puertas del prototipo
-- firmado (OL-084, bitácora 118) ya asumían.
create policy "obras_colectivas: alta solo admin"
on public.obras_colectivas for insert
to authenticated
with check (public.es_admin() and creado_por = auth.uid());

create policy "obras_colectivas: edita solo admin"
on public.obras_colectivas for update
to authenticated
using (public.es_admin())
with check (public.es_admin());

-- Nadie borra una obra por ahora: cerrarla basta. Sin policy for delete.

commit;
