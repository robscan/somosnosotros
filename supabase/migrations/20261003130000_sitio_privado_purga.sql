-- OL-258: retención de la copia privada del evento durante 168 horas tras su fin.
-- Lugares (incluidos los ocultos de administración) no participan en esta regla.
begin;

alter policy "sitio privado: autor, admin, o con sesión cuando toca"
  on public.eventos_sitio_privado
  using (
    exists (
      select 1 from public.eventos e
      where e.id = evento_id
        and now() < e.termina + interval '168 hours'
        and (
          public.gestiona_evento(e.id)
          or (auth.uid() is not null and now() >= revelar_desde
            and e.visible and e.sitio_reservado
            and now() < e.termina + interval '2 hours')
        )
    )
  );
comment on policy "sitio privado: autor, admin, o con sesión cuando toca"
  on public.eventos_sitio_privado is
  'Terceros: desde revelación hasta fin + 2 h, con sesión y evento accesible. Autor/admin: hasta fin + 168 h. El cierre de lectura no depende de la ejecución del cron. No afecta lugares.';

-- También las escrituras directas pasan por el plazo; una pestaña vieja no puede
-- reponer una copia vencida. El cerrojo comparte el orden del guardado completo.
create function public.sitio_privado_validar_retencion()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  fin timestamptz;
begin
  select e.termina into fin from public.eventos e where e.id = new.evento_id for update;
  if fin + interval '168 hours' <= now() then
    raise exception 'direccion_reservada_vencida' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.sitio_privado_validar_retencion() from public, anon, authenticated, service_role;
create trigger sitio_privado_retencion before insert or update on public.eventos_sitio_privado
  for each row execute function public.sitio_privado_validar_retencion();

create function public.purgar_sitios_privados(p_limite integer default 500)
returns integer language plpgsql security definer set search_path = ''
set app.avisos_outbox = 'off' as $$
declare
  eliminadas integer;
begin
  if p_limite is null or p_limite < 1 or p_limite > 1000 then
    raise exception 'limite_invalido' using errcode = '22023';
  end if;
  -- Primero el evento: no borrar la dirección de una reprogramación concurrente.
  -- SKIP LOCKED permite reintentar filas ocupadas sin frenar todo el mantenimiento.
  with vencidos as materialized (
    select e.id from public.eventos e
    where e.termina <= now() - interval '168 hours'
      and exists (select 1 from public.eventos_sitio_privado p where p.evento_id = e.id)
    order by e.termina, e.id limit p_limite for update of e skip locked
  )
  delete from public.eventos_sitio_privado p using vencidos v where p.evento_id = v.id;
  get diagnostics eliminadas = row_count;
  -- avisos_privado ya incrementa actualizado_en: guardar con la revisión anterior
  -- falla de forma atómica. El opt-in apagado impide encolar avisos de esta purga.
  return eliminadas;
end;
$$;
revoke all on function public.purgar_sitios_privados(integer) from public, anon, authenticated;
grant execute on function public.purgar_sitios_privados(integer) to service_role;
comment on function public.purgar_sitios_privados(integer) is
  'Mantenimiento idempotente, exclusivo de service_role. Borra solo copias privadas a partir de fin + 168 h, por lotes; devuelve cantidad, nunca datos personales.';

commit;
