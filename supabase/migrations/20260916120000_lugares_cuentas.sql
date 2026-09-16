-- somosnosotros · migración 0024 · reclamar lugares (OL-015, 1b)
-- Igual que los artistas (migración 0010): un lugar traído del catálogo o dado de alta por el administrador
-- no tiene dueño. Quien lo lleva de verdad ("¿Es tu espacio?") pide la ficha, el administrador la revisa y liga
-- su cuenta; desde entonces edita el lugar sin ser su autor.

-- ---------- cuentas ligadas a un lugar ----------
create table public.lugares_cuentas (
  lugar_id uuid not null references public.lugares (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (lugar_id, perfil_id)
);
create index lugares_cuentas_perfil_idx on public.lugares_cuentas (perfil_id);

-- ¿Puedo gestionar este lugar? Autor, cuenta ligada o admin.
create function public.gestiona_lugar(p_lugar uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lugares l
    where l.id = p_lugar
      and (l.creado_por = auth.uid() or public.es_admin()
        or exists (select 1 from public.lugares_cuentas c where c.lugar_id = p_lugar and c.perfil_id = auth.uid()))
  );
$$;

-- Lo visible y no privado lo ve todo el mundo; lo demás, quien lo gestiona (migración 0018: privado es el
-- mapeo personal del administrador y solo el administrador lo marca).
drop policy "lugares: lectura" on public.lugares;
create policy "lugares: lectura" on public.lugares for select
  using ((visible and not privado) or public.gestiona_lugar(id));

drop policy "lugares: edita autor o admin" on public.lugares;
create policy "lugares: edita autor, ligado o admin" on public.lugares for update to authenticated
  using (public.gestiona_lugar(id))
  with check (public.gestiona_lugar(id) and (not privado or public.es_admin()));

alter table public.lugares_cuentas enable row level security;
create policy "lugares_cuentas: lectura pública" on public.lugares_cuentas for select using (true);
create policy "lugares_cuentas: me ligo a lo mío o soy admin" on public.lugares_cuentas for insert to authenticated
  with check (public.es_admin() or (perfil_id = auth.uid() and public.gestiona_lugar(lugar_id)));
create policy "lugares_cuentas: me desligo o soy admin" on public.lugares_cuentas for delete to authenticated
  using (public.es_admin() or perfil_id = auth.uid());

-- Los reportes ya aceptan tipo 'lugar' y los motivos 'es_mio' y 'retirar' (migración 0010): "¿Es tu espacio?"
-- escribe el mismo reporte que "Soy yo / es mi grupo" y el administrador lo atiende en el mismo panel.
comment on column public.reportes.motivo is 'es_mio / retirar: un artista o el lugar real pide la ficha para editarla, o que se quite.';

-- Los eventos siguen siendo de quien los publica (autor o admin): ligar un lugar no da mando sobre lo que
-- otras personas publican ahí, igual que ligar un artista no da mando sobre sus fechas.
