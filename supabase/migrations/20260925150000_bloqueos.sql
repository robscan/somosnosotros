-- somosnosotros · OL-203 (bitácora 232) · bloquear a una persona (guía 1.2 de App Store: contenido de usuarios
-- con mecanismo de reporte —ya existe `reportes`— y de bloqueo de quien abusa). Solo añade: la tabla `bloqueos`,
-- sus permisos, la función que la usa para filtrar, y el filtro mismo sobre lo que esa persona publicó.

-- ---------- bloqueos ----------
-- Quién bloqueó a quién. Una fila por par; `quien` es el dueño de la fila (RLS), `bloqueado` la persona que deja
-- de verse. `on delete cascade` en los dos lados: si cualquiera de las dos cuentas se borra, la fila no se queda huérfana.
create table public.bloqueos (
  quien uuid not null references public.perfiles (id) on delete cascade,
  bloqueado uuid not null references public.perfiles (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (quien, bloqueado),
  check (quien <> bloqueado)
);
comment on table public.bloqueos is 'Bloquear a una persona (OL-203): deja de ver en listados y carriles lo que publicó (eventos, novedades de artista). Sin aviso a quien se bloquea; se deshace borrando la fila.';
-- Para "¿a mí me bloqueó alguien con eventos por aquí?" no hace falta: el filtro siempre entra por `quien` (mi
-- sesión). Este índice es para el camino inverso, el único que se recorre entero: borrar cuentas y, más adelante,
-- que la administración pueda ver cuántas veces se bloqueó a alguien si hiciera falta revisar un caso.
create index bloqueos_bloqueado_idx on public.bloqueos (bloqueado);

alter table public.bloqueos enable row level security;
-- Cada cuenta ve, crea y borra solo sus propias filas: a quién bloqueó, nunca quién la bloqueó a ella.
create policy "bloqueos: veo las mías" on public.bloqueos for select to authenticated using (quien = auth.uid());
create policy "bloqueos: bloqueo con sesión" on public.bloqueos for insert to authenticated with check (quien = auth.uid());
create policy "bloqueos: desbloqueo las mías" on public.bloqueos for delete to authenticated using (quien = auth.uid());

-- ---------- ¿bloqueé yo a esta persona? (para las políticas de lectura de lo que publica) ----------
-- Sin revoke/grant explícito, a propósito: igual que `es_admin()` (migración 0001), esta función se llama desde
-- políticas de SELECT que también lee `anon` (eventos y novedades visibles, sin sesión); revocarle el EXECUTE a
-- `anon` rompería esa lectura pública. Sin sesión no hay bloqueos (auth.uid() es null): devuelve false de una vez,
-- sin tocar la tabla.
create function public.bloqueado_por_mi(p_persona uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_persona is not null and auth.uid() is not null and exists (
    select 1 from public.bloqueos where quien = auth.uid() and bloqueado = p_persona
  );
$$;
comment on function public.bloqueado_por_mi(uuid) is 'true si la cuenta con sesión bloqueó a p_persona. Se usa dentro de políticas de lectura para que lo que esa persona publicó deje de verse en listados y carriles (OL-203).';

-- ---------- el filtro: lo que publicó la persona bloqueada deja de verse ----------
-- El punto central (una función dentro de la política, no diez consultas tocadas): cualquier lectura de `eventos`
-- o `novedades_artista` —Inicio, Agenda, la ficha de un lugar o de un artista, buscar— pasa por aquí sin cambiar
-- una sola consulta de la aplicación. La administración no pierde nada por bloquear (o que alguien bloquee): sigue
-- viendo todo lo que ya veía, para poder atender un reporte aunque bloqueara a quien lo escribió.
drop policy "eventos: lectura" on public.eventos;
create policy "eventos: lectura" on public.eventos for select
  using ((visible or creado_por = auth.uid() or public.es_admin()) and (public.es_admin() or not public.bloqueado_por_mi(creado_por)));

drop policy "novedades_artista: lectura de lo visible o de quien gestiona" on public.novedades_artista;
create policy "novedades_artista: lectura de lo visible o de quien gestiona" on public.novedades_artista for select
  using ((visible or public.gestiona_artista(artista_id)) and (public.es_admin() or not public.bloqueado_por_mi(publicado_por)));
