-- somosnosotros · OL-446 · migración 20261022140000 · Showcase v2: los grupos guardados y el motivo de un rechazo
-- Lo firmado por el founder en OL-443 (bitácora 475, con las siete respuestas del gestor): «Permite que seleccione o agrupe artistas para detonar
-- búsquedas»; un grupo es un filtro con nombre (respuesta 3: sin grupos a mano), así quien lo cumpla después entra solo; y rechazar una evidencia
-- pide su motivo (respuesta 5: duplicado · no es esta persona · no es relevante · otro), para que la rutina aprenda.
--
-- SOLO AÑADE:
--   · `showcase_grupos`: id, nombre (1 a 80 letras), filtros (un objeto jsonb: la pantalla lo valida al leerlo), quién lo creó y cuándo (los pone
--     la base). Solo la administración lo lee y lo escribe, como las demás tablas del showcase (migración 20261020130000); anon, nada.
--   · `showcase_evidencias.motivo_rechazo`: una lista cerrada, solo en una evidencia rechazada. Un disparador lo borra cuando la evidencia deja de
--     estar rechazada (Deshacer la devuelve a propuesta con la acción de siempre, que no sabe del motivo).

-- ---------- los grupos guardados ----------
create table public.showcase_grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  filtros jsonb not null default '{}'::jsonb check (jsonb_typeof(filtros) = 'object' and pg_column_size(filtros) <= 2000),
  creado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);
create index showcase_grupos_creado_por_idx on public.showcase_grupos (creado_por);
comment on table public.showcase_grupos is 'Filtros con nombre de la lista del Showcase (OL-446): quien cumple el filtro está en el grupo. Solo administración.';

-- Quién y cuándo lo pone la base: al crear, la sesión y la hora; al cambiar el nombre, no se tocan.
create function public.showcase_grupos_registro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.creado_por := coalesce(auth.uid(), new.creado_por);
    new.creado_en := now();
  else
    new.creado_por := old.creado_por;
    new.creado_en := old.creado_en;
  end if;
  return new;
end $$;
create trigger showcase_grupos_registro before insert or update on public.showcase_grupos
  for each row execute function public.showcase_grupos_registro();
revoke execute on function public.showcase_grupos_registro() from public, anon, authenticated;
grant execute on function public.showcase_grupos_registro() to service_role;

alter table public.showcase_grupos enable row level security;
revoke all on public.showcase_grupos from public, anon, authenticated;
grant select, insert, update, delete on public.showcase_grupos to authenticated;
grant all on public.showcase_grupos to service_role;
create policy "showcase_grupos: solo la administración" on public.showcase_grupos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ---------- el motivo de un rechazo ----------
alter table public.showcase_evidencias add column motivo_rechazo text
  check (motivo_rechazo in ('duplicado', 'no_es_esta_persona', 'no_relevante', 'otro'));
alter table public.showcase_evidencias add constraint showcase_evidencias_motivo_solo_rechazada
  check (motivo_rechazo is null or estado = 'rechazada');
comment on column public.showcase_evidencias.motivo_rechazo is 'Por qué se rechazó (OL-446): duplicado, no_es_esta_persona, no_relevante u otro. Solo en una rechazada.';

-- Una evidencia que deja de estar rechazada (Deshacer, o aceptarla después) pierde su motivo.
create function public.showcase_evidencias_motivo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.estado <> 'rechazada' then
    new.motivo_rechazo := null;
  end if;
  return new;
end $$;
create trigger showcase_evidencias_motivo before insert or update on public.showcase_evidencias
  for each row execute function public.showcase_evidencias_motivo();
revoke execute on function public.showcase_evidencias_motivo() from public, anon, authenticated;
grant execute on function public.showcase_evidencias_motivo() to service_role;
