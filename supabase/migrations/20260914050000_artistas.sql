-- somosnosotros · migración 0010 · artistas y grupos locales
-- Directorio de artistas (docs/rediseno/08-artistas-flujo-y-estados.md): ficha propia, ligados a los eventos
-- en los que se presentan, se pueden seguir, y un artista real puede reclamar o retirar su nombre.

-- ---------- artistas ----------
create table public.artistas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 80),
  disciplina text not null default 'por_completar' check (disciplina in ('musica', 'teatro', 'danza', 'artes_visuales', 'letras', 'cine', 'otro', 'por_completar')),
  detalle text check (char_length(detalle) <= 40),
  tipo text not null default 'solista' check (tipo in ('solista', 'grupo', 'colectivo')),
  descripcion text check (char_length(descripcion) <= 600),
  foto text,
  redes jsonb not null default '{}'::jsonb,
  ciudad text not null default 'San Luis Potosí',
  creado_por uuid references public.perfiles (id) on delete set null,
  visible boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on column public.artistas.disciplina is 'por_completar: se creó con solo el nombre desde el alta de un evento.';
comment on column public.artistas.detalle is 'Qué hace en una palabra: "son huasteco", "jazz", "grabado".';
create trigger artistas_tocar before update on public.artistas for each row execute function public.tocar_actualizado_en();
create index artistas_ciudad_idx on public.artistas (ciudad, nombre) where visible;

-- Un artista es un artista: mismo nombre normalizado en la misma ciudad no se repite (decisión 5).
create function public.artista_sin_duplicado() returns trigger
language plpgsql as $$
begin
  if exists (
    select 1 from public.artistas a
    where a.id <> new.id and a.ciudad = new.ciudad
      and public.normalizar_nombre(a.nombre) = public.normalizar_nombre(new.nombre)
  ) then
    raise exception 'artista_duplicado' using errcode = '23505';
  end if;
  return new;
end $$;
create trigger artistas_sin_duplicado before insert or update of nombre, ciudad on public.artistas
  for each row execute function public.artista_sin_duplicado();

-- Sugerencias mientras se escribe (alta de artista y renglón Quién): visibles cuyo nombre contiene lo escrito.
create function public.artistas_con_nombre(p_nombre text)
returns setof public.artistas
language sql stable as $$
  select a.* from public.artistas a
  where a.visible
    and char_length(public.normalizar_nombre(p_nombre)) >= 2
    and public.normalizar_nombre(a.nombre) like '%' || public.normalizar_nombre(p_nombre) || '%'
  order by a.nombre
  limit 6;
$$;

-- ---------- cuentas ligadas a un artista ("Soy yo / es mi grupo"; o el admin al atender "Quiero editarlo yo") ----------
create table public.artistas_cuentas (
  artista_id uuid not null references public.artistas (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (artista_id, perfil_id)
);
create index artistas_cuentas_perfil_idx on public.artistas_cuentas (perfil_id);

-- ¿Puedo gestionar este artista? Autor, cuenta ligada o admin.
create function public.gestiona_artista(p_artista uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.artistas a
    where a.id = p_artista
      and (a.creado_por = auth.uid() or public.es_admin()
        or exists (select 1 from public.artistas_cuentas c where c.artista_id = p_artista and c.perfil_id = auth.uid()))
  );
$$;

alter table public.artistas enable row level security;
create policy "artistas: lectura" on public.artistas for select
  using (visible or public.gestiona_artista(id));
create policy "artistas: alta con sesión" on public.artistas for insert to authenticated
  with check (creado_por = auth.uid());
create policy "artistas: edita autor, ligado o admin" on public.artistas for update to authenticated
  using (public.gestiona_artista(id)) with check (public.gestiona_artista(id));
create policy "artistas: borra autor o admin" on public.artistas for delete to authenticated
  using (creado_por = auth.uid() or public.es_admin());

alter table public.artistas_cuentas enable row level security;
create policy "artistas_cuentas: lectura pública" on public.artistas_cuentas for select using (true);
create policy "artistas_cuentas: me ligo a lo mío o soy admin" on public.artistas_cuentas for insert to authenticated
  with check (public.es_admin() or (perfil_id = auth.uid() and public.gestiona_artista(artista_id)));
create policy "artistas_cuentas: me desligo o soy admin" on public.artistas_cuentas for delete to authenticated
  using (public.es_admin() or perfil_id = auth.uid());

-- ---------- quién se presenta en cada evento ----------
create table public.eventos_artistas (
  evento_id uuid not null references public.eventos (id) on delete cascade,
  artista_id uuid not null references public.artistas (id) on delete cascade,
  orden smallint not null default 0,
  primary key (evento_id, artista_id)
);
create index eventos_artistas_artista_idx on public.eventos_artistas (artista_id);
alter table public.eventos_artistas enable row level security;
create policy "eventos_artistas: lectura pública" on public.eventos_artistas for select using (true);
create policy "eventos_artistas: escribe quien gestiona el evento" on public.eventos_artistas for insert to authenticated
  with check (public.gestiona_evento(evento_id));
create policy "eventos_artistas: borra quien gestiona el evento" on public.eventos_artistas for delete to authenticated
  using (public.gestiona_evento(evento_id));

-- ---------- seguir artistas ----------
-- Un seguimiento apunta a un lugar o a un artista (exactamente uno). La llave pasa a un id propio;
-- los pares (persona, lugar) y (persona, artista) siguen siendo únicos (los nulos no chocan).
alter table public.seguimientos drop constraint seguimientos_pkey;
alter table public.seguimientos add column id uuid not null default gen_random_uuid();
alter table public.seguimientos add primary key (id);
alter table public.seguimientos alter column lugar_id drop not null;
alter table public.seguimientos add column artista_id uuid references public.artistas (id) on delete cascade;
alter table public.seguimientos add constraint seguimientos_uno_solo
  check ((lugar_id is not null)::int + (artista_id is not null)::int = 1);
create unique index seguimientos_lugar_unico on public.seguimientos (usuario_id, lugar_id);
create unique index seguimientos_artista_unico on public.seguimientos (usuario_id, artista_id);
create index seguimientos_artista_idx on public.seguimientos (artista_id);

-- ---------- reportes: "Es mi nombre" ----------
alter table public.reportes drop constraint reportes_tipo_check;
alter table public.reportes add constraint reportes_tipo_check check (tipo in ('lugar', 'evento', 'perfil', 'artista'));
alter table public.reportes drop constraint reportes_motivo_check;
alter table public.reportes add constraint reportes_motivo_check
  check (motivo in ('falso', 'ofensivo', 'duplicado', 'no_cultural', 'otro', 'es_mio', 'retirar'));
comment on column public.reportes.motivo is 'es_mio / retirar: un artista real pide la ficha para editarla, o que se quite (decisión 11).';

-- ---------- fotos: cada quien escribe también en artistas/<mi id>/… ----------
drop policy "fotos: subo a mi carpeta" on storage.objects;
drop policy "fotos: cambio las de mi carpeta" on storage.objects;
drop policy "fotos: borro las de mi carpeta" on storage.objects;
create policy "fotos: subo a mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] in ('perfiles', 'lugares', 'artistas') and (storage.foldername(name))[2] = auth.uid()::text);
create policy "fotos: cambio las de mi carpeta" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] in ('perfiles', 'lugares', 'artistas') and (storage.foldername(name))[2] = auth.uid()::text);
create policy "fotos: borro las de mi carpeta" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] in ('perfiles', 'lugares', 'artistas') and (storage.foldername(name))[2] = auth.uid()::text);
