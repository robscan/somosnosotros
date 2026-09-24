-- somosnosotros · OL-175 (código de OL-171, doc docs/rediseno/44-novedades-artista.md) · novedades del artista,
-- fase 1: modelo, migración y alta con YouTube. Solo añade: tabla nueva, sus políticas y un tope diario.
-- Nombre distinto y a propósito de la tabla `novedades` que ya existe (los avisos dentro de la app, doc 28): esta
-- es la bitácora de publicaciones del artista (doc 44 §1), sin relación con esa.

-- ---------- novedades_artista ----------
create table public.novedades_artista (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid not null references public.artistas (id) on delete cascade,
  url text not null,
  proveedor text not null check (proveedor in ('youtube')),
  titulo text check (char_length(titulo) <= 60),
  texto text check (char_length(texto) <= 280),
  creado_en timestamptz not null default now(),
  visible boolean not null default true,
  publicado_por uuid references auth.users (id) on delete set null
);
comment on table public.novedades_artista is 'Doc 44: bitácora de publicaciones cortas del artista (un enlace con reproductor incrustado, título y texto opcionales), no la tabla novedades de avisos dentro de la app.';
comment on column public.novedades_artista.url is 'El enlace ya reconocido por reconocerEnlace (lib/enlaces.ts) y normalizado; nunca el texto crudo tal cual lo pegó la persona.';
comment on column public.novedades_artista.proveedor is 'Lista blanca de la fase 1 (doc 44 §2): solo youtube. Se amplía en fases siguientes sin migrar filas.';
comment on column public.novedades_artista.visible is 'true por defecto; la administración la pone en false para ocultarla sin borrarla.';
comment on column public.novedades_artista.publicado_por is 'La cuenta que la publicó, puesta por el servidor con su sesión (mismo patrón que ajustes_sitio.cambiado_por), nunca un dato que mande el cliente.';

create index novedades_artista_artista_idx on public.novedades_artista (artista_id, creado_en desc);
-- Clave foránea sin índice propio (mismo motivo que 20260918170000_advisor_seguimiento.sql): evita el recorrido
-- completo de la tabla que señala el Advisor de rendimiento cuando se borra una cuenta (on delete set null).
create index novedades_artista_publicado_por_idx on public.novedades_artista (publicado_por);

-- Tope: 5 novedades por artista y por día, en la hora de la ciudad (fusible contra un accidente —pegar el mismo
-- enlace varias veces, un doble toque—, no un ahorro; doc 44 §4). Mismo estilo que el freno de Pincel
-- (20260922180000_pincel_freno.sql): errcode check_violation con un mensaje llano que el cliente muestra tal cual.
create function public.novedades_artista_tope() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (
    select count(*) from public.novedades_artista n
    where n.artista_id = new.artista_id
      and n.creado_en >= (date_trunc('day', now() at time zone 'America/Mexico_City') at time zone 'America/Mexico_City')
  ) >= 5 then
    raise exception using errcode = 'check_violation',
      message = 'Ya publicaste 5 novedades hoy. Mañana puedes seguir.';
  end if;
  return new;
end;
$$;
comment on function public.novedades_artista_tope() is 'Doc 44 §4: tope de 5 novedades por artista y por día; rechaza con check_violation y un mensaje llano.';
create trigger novedades_artista_tope before insert on public.novedades_artista
  for each row execute function public.novedades_artista_tope();
-- Un trigger instalado no necesita EXECUTE del cliente al dispararse (mismo patrón que obras_colectivas_freno).
revoke execute on function public.novedades_artista_tope() from public, anon, authenticated;
grant execute on function public.novedades_artista_tope() to service_role;

alter table public.novedades_artista enable row level security;

-- Ve lo visible cualquiera; quien gestiona la ficha (autor, cuenta ligada o admin, gestiona_artista ya existente)
-- también ve lo oculto, para saber qué se ocultó (doc 44 §4).
create policy "novedades_artista: lectura de lo visible o de quien gestiona" on public.novedades_artista for select
  using (visible or public.gestiona_artista(artista_id));

-- Publica quien gestiona la ficha, con su propia cuenta como publicado_por (nunca un dato del cliente).
create policy "novedades_artista: publica quien gestiona la ficha" on public.novedades_artista for insert to authenticated
  with check (public.gestiona_artista(artista_id) and publicado_por = auth.uid());

-- Ocultar (visible = false) es solo de la administración, igual que el resto de las fichas (doc 44 §4, mismo
-- patrón que "artistas: edita autor, ligado o admin" pero acotado a la administración).
create policy "novedades_artista: solo la administración cambia visible" on public.novedades_artista for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Borrar la propia novedad, no solo ocultarla: el doc 44 §4/§8 lo dejó pendiente de firma del founder. Decisión
-- por defecto de esta pieza (OL-175, bitácora 210): sí, con la regla general del proyecto (DEFINICION.md, "lo
-- publicado se corrige o se borra por su autor") — quien gestiona la ficha borra su propia novedad, o la
-- administración cualquiera. Si el founder prefiere que solo la administración borre, es un DROP POLICY de una
-- línea, sin tocar el resto.
create policy "novedades_artista: borra quien gestiona la ficha o admin" on public.novedades_artista for delete to authenticated
  using (public.gestiona_artista(artista_id) or public.es_admin());
