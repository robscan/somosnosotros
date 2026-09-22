-- OL-127 (bitácora 162): «Crear pared aquí» con la ubicación actual (founder, 2026-09-22: «También debe permitir
-- crear pared en ubicación actual sin más»). Una obra puede no tener lugar del directorio y llevar sus propias
-- coordenadas: si al crearla hay un lugar a menos de 200 m se usa ese; si no, la obra guarda lat/lng propias. La
-- cercanía del mando (misma pieza) usa las coordenadas del lugar o las propias de la obra.
-- Solo añade (columnas, restricciones) y afloja `lugar_id`; las políticas que exigían un lugar visible se reponen con
-- el caso «sin lugar» (mismos nombres, misma lógica para las obras con lugar). Nada se borra.

alter table public.obras_colectivas alter column lugar_id drop not null;
alter table public.obras_colectivas add column if not exists lat double precision;
alter table public.obras_colectivas add column if not exists lng double precision;
comment on column public.obras_colectivas.lat is 'Latitud propia de la obra cuando no tiene lugar del directorio (OL-127); null si tiene lugar.';
comment on column public.obras_colectivas.lng is 'Longitud propia de la obra cuando no tiene lugar del directorio (OL-127); null si tiene lugar.';

-- Una obra está en un lugar del directorio o en unas coordenadas propias: nunca en ninguno de los dos.
alter table public.obras_colectivas add constraint obras_colectivas_donde
  check (lugar_id is not null or (lat is not null and lng is not null));
alter table public.obras_colectivas add constraint obras_colectivas_lat_lng
  check ((lat is null and lng is null) or (lat between -90 and 90 and lng between -180 and 180));

-- Lectura: una obra sin lugar es visible con sesión (sus coordenadas son de la obra, no de una persona; la pared y el
-- mando ya exigen sesión). Con lugar, sigue la visibilidad del lugar, como antes.
drop policy "obras_colectivas: lectura según lo que enlaza" on public.obras_colectivas;
create policy "obras_colectivas: lectura según lo que enlaza"
on public.obras_colectivas for select
using (
  public.es_admin()
  or (
    (lugar_id is null or exists (select 1 from public.lugares l where l.id = lugar_id and l.visible and not l.privado))
    and (evento_id is null or exists (select 1 from public.eventos e where e.id = evento_id and e.visible))
  )
);

-- Canal en vivo (migración 20260922130000): las cuatro políticas exigían un lugar visible; se reponen con «o sin lugar».
drop policy "obra: recibe el trazo si hay sesión y la obra está abierta y visible" on "realtime"."messages";
create policy "obra: recibe el trazo si hay sesión y la obra está abierta y visible"
on "realtime"."messages" for select to authenticated
using (
  extension = 'broadcast'
  and exists (
    select 1 from public.obras_colectivas o
    where 'obra:' || o.id::text = realtime.topic()
      and o.estado = 'abierta'
      and (o.lugar_id is null or exists (select 1 from public.lugares l where l.id = o.lugar_id and l.visible and not l.privado))
      and (o.evento_id is null or exists (select 1 from public.eventos e where e.id = o.evento_id and e.visible))
  )
);

drop policy "obra: manda el trazo si hay sesión y la obra está abierta y visible" on "realtime"."messages";
create policy "obra: manda el trazo si hay sesión y la obra está abierta y visible"
on "realtime"."messages" for insert to authenticated
with check (
  extension = 'broadcast'
  and exists (
    select 1 from public.obras_colectivas o
    where 'obra:' || o.id::text = realtime.topic()
      and o.estado = 'abierta'
      and (o.lugar_id is null or exists (select 1 from public.lugares l where l.id = o.lugar_id and l.visible and not l.privado))
      and (o.evento_id is null or exists (select 1 from public.eventos e where e.id = o.evento_id and e.visible))
  )
);

drop policy "obra: recibe presence si hay sesión y la obra está abierta y visible" on "realtime"."messages";
create policy "obra: recibe presence si hay sesión y la obra está abierta y visible"
on "realtime"."messages" for select to authenticated
using (
  extension = 'presence'
  and exists (
    select 1 from public.obras_colectivas o
    where 'obra:' || o.id::text = realtime.topic()
      and o.estado = 'abierta'
      and (o.lugar_id is null or exists (select 1 from public.lugares l where l.id = o.lugar_id and l.visible and not l.privado))
      and (o.evento_id is null or exists (select 1 from public.eventos e where e.id = o.evento_id and e.visible))
  )
);

drop policy "obra: manda presence si hay sesión y la obra está abierta y visible" on "realtime"."messages";
create policy "obra: manda presence si hay sesión y la obra está abierta y visible"
on "realtime"."messages" for insert to authenticated
with check (
  extension = 'presence'
  and exists (
    select 1 from public.obras_colectivas o
    where 'obra:' || o.id::text = realtime.topic()
      and o.estado = 'abierta'
      and (o.lugar_id is null or exists (select 1 from public.lugares l where l.id = o.lugar_id and l.visible and not l.privado))
      and (o.evento_id is null or exists (select 1 from public.eventos e where e.id = o.evento_id and e.visible))
  )
);
