-- somosnosotros · OL-088 · Pincel en la app, Fase 2 bloque 3 + cupo/fila (doc rediseno/34, firmado 2026-09-21).
-- Solo añade. Dos partes: (1) RLS del canal en vivo, sin la cual el canal privado (`private: true`,
-- src/lib/canal-obra.ts) rechaza a todos, con sesión o sin ella; (2) la columna de cupo por obra.

-- 1a. Recibir y mandar TRAZOS (broadcast): solo con sesión, y solo en el canal de una obra abierta y
-- visible — mismo criterio que ya usa la lectura de obras_colectivas (migración 20260922090000): quien no
-- vería la obra por la API tampoco escucha ni manda en su canal. La pared también exige sesión (revisión
-- del gestor, 2026-09-21): sin caso especial para "anon" hoy.
create policy "obra: recibe el trazo si hay sesión y la obra está abierta y visible"
on "realtime"."messages"
for select
to authenticated
using (
  extension = 'broadcast'
  and exists (
    select 1
    from public.obras_colectivas o
    where 'obra:' || o.id::text = realtime.topic()
      and o.estado = 'abierta'
      and exists (select 1 from public.lugares l where l.id = o.lugar_id and l.visible and not l.privado)
      and (o.evento_id is null or exists (select 1 from public.eventos e where e.id = o.evento_id and e.visible))
  )
);

create policy "obra: manda el trazo si hay sesión y la obra está abierta y visible"
on "realtime"."messages"
for insert
to authenticated
with check (
  extension = 'broadcast'
  and exists (
    select 1
    from public.obras_colectivas o
    where 'obra:' || o.id::text = realtime.topic()
      and o.estado = 'abierta'
      and exists (select 1 from public.lugares l where l.id = o.lugar_id and l.visible and not l.privado)
      and (o.evento_id is null or exists (select 1 from public.eventos e where e.id = o.evento_id and e.visible))
  )
);

-- 1b. PRESENCE (doc 34: quién pinta, quién espera): misma condición de obra abierta/visible que broadcast
-- — quien espera también necesita ver la fila, no solo quien pinta. Sin esto, `track()` en un canal
-- privado se rechaza igual que un broadcast sin política.
create policy "obra: recibe presence si hay sesión y la obra está abierta y visible"
on "realtime"."messages"
for select
to authenticated
using (
  extension = 'presence'
  and exists (
    select 1
    from public.obras_colectivas o
    where 'obra:' || o.id::text = realtime.topic()
      and o.estado = 'abierta'
      and exists (select 1 from public.lugares l where l.id = o.lugar_id and l.visible and not l.privado)
      and (o.evento_id is null or exists (select 1 from public.eventos e where e.id = o.evento_id and e.visible))
  )
);

create policy "obra: manda presence si hay sesión y la obra está abierta y visible"
on "realtime"."messages"
for insert
to authenticated
with check (
  extension = 'presence'
  and exists (
    select 1
    from public.obras_colectivas o
    where 'obra:' || o.id::text = realtime.topic()
      and o.estado = 'abierta'
      and exists (select 1 from public.lugares l where l.id = o.lugar_id and l.visible and not l.privado)
      and (o.evento_id is null or exists (select 1 from public.eventos e where e.id = o.evento_id and e.visible))
  )
);

-- 2. Cupo de mandos por obra (doc rediseno/34): por defecto 10 (lo medido en la corrida de cupo, bitácora
-- 123), tope duro 20 (con el envío agrupado a 3 mensajes/s por mando, 20 mandos son 60 mensajes/s de
-- trazos, 60% del cupo citado de Supabase Realtime — el resto es colchón para presence y lo no medido).
alter table public.obras_colectivas
  add column cupo_mandos smallint not null default 10 check (cupo_mandos between 1 and 20);
comment on column public.obras_colectivas.cupo_mandos is 'Cuántos mandos pintan a la vez en esta obra (doc rediseno/34); el resto espera su turno por Presence.';
