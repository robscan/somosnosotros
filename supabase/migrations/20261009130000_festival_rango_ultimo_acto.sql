-- OL-362 (bitácora 393): el rango de un festival cuyo último acto no tiene hora de fin.
-- Desde OL-358 (20261009100000) `eventos.termina` de un acto sin fin es su inicio + 3 h. `recalcular_festival` tomaba max(termina) como fin del
-- marco, así que un último acto sin fin que empieza después de las 21:00 llevaba el festival pasada la medianoche y «Del 12 al 14 de nov»
-- decía un día de más. Decisión del founder (2026-10-09): el último día del rango es el día de inicio de ese acto, en su zona.
-- Regla: un acto con fin cuenta hasta su fin (aunque cruce la medianoche); sin fin, hasta lo que pase antes: 3 h después de empezar o la
-- medianoche que cierra su día. La medianoche exacta se lee como el final del día anterior (`ultimoDiaDelPeriodo`, src/lib/claseEvento.ts).
-- La misma regla en la app: `finEnPrograma` (src/lib/claseEvento.ts); las dos deben decir lo mismo.
-- `publicar_programa` termina llamando a `recalcular_festival`, así que basta con cambiar esta. Solo añade y reemplaza.

create or replace function public.fin_en_programa(p_inicio timestamptz, p_fin timestamptz, p_zona text) returns timestamptz
language sql stable set search_path = '' as $$
  select coalesce(p_fin, least(p_inicio + interval '3 hours',
    (((p_inicio at time zone p_zona)::date + 1)::timestamp at time zone p_zona)));
$$;
comment on function public.fin_en_programa(timestamptz, timestamptz, text) is 'Hasta dónde cuenta un acto en el periodo de su festival (OL-362): su fin; sin él, 3 h después de empezar sin pasar de la medianoche de su día.';

create or replace function public.recalcular_festival(p_festival uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_inicio timestamptz;
  v_fin timestamptz;
begin
  select min(a.inicio), max(public.fin_en_programa(a.inicio, a.fin, a.zona)) into v_inicio, v_fin
    from public.eventos a where a.evento_padre_id = p_festival and a.visible;
  if v_inicio is null then
    return;
  end if;
  update public.eventos set inicio = v_inicio, fin = v_fin
    where id = p_festival and clase = 'festival' and (inicio is distinct from v_inicio or fin is distinct from v_fin);
end $$;
revoke all on function public.recalcular_festival(uuid) from public, anon;
grant execute on function public.recalcular_festival(uuid) to authenticated;

-- Los festivales ya guardados, con la regla nueva (solo cambia el marco cuyo fin era distinto).
select public.recalcular_festival(e.id) from public.eventos e where e.clase = 'festival';
