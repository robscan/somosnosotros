-- somosnosotros · OL-445 · migración 20261022130000 · lo que descubren las rutinas sobre un artista llega a su perfil (bitácora 477)
-- Founder, 22 de octubre: «que lo que descubramos de artistas vaya para sus perfiles personales porfas que se use esa info para completar su
-- información y curriculum. Además de su año». Gobierno decidido: todo lo que escribe la rutina nace propuesta y solo se publica cuando una
-- persona de la administración lo acepta.
--
-- 1. `artistas_hitos`: los hitos públicos de un artista (premios, becas, obra publicada, presentaciones y prensa), uno por evidencia ACEPTADA
--    del showcase. No es una vista sobre `showcase_evidencias` (esa tabla sigue siendo solo de la administración, con sus propuestas, sus
--    rechazos y quién decidió): es una copia de lo que se puede decir en público —tipo, título, enlace, fuente y fecha—, sin señal, sin estado,
--    sin quién la leyó ni quién la decidió. Las notas y los puntajes del consejo no salen de su tabla.
-- 2. Un disparador en `showcase_evidencias` la mantiene: aceptar (desde la ficha del Showcase, desde el panel «Por aprobar» que vendrá o
--    añadiéndola a mano, que nace aceptada) publica o corrige el hito; rechazar, deshacer (volver a propuesta) o cambiarla a «redes» lo retira;
--    borrar la evidencia lo borra (llave foránea en cascada). Nadie escribe los hitos a mano: ni la administración ni el artista (no hay permiso
--    de escritura más que para la llave de servicio).
-- 3. Lectura pública con la regla de la ficha: se ve el hito de un artista que quien mira puede ver (la política de `artistas` decide: un
--    artista oculto solo lo ven quien lo gestiona y la administración).
-- 4. Lo aceptado antes de hoy se publica también (relleno al final): lo pidió el founder para todo lo descubierto.
-- 5. `showcase_candidatos.completar_descartadas`: las sugerencias de «Completar ficha» que la administración descartó (su clave), para que
--    no vuelvan a salir. Solo administración, como el resto de la fila.
-- Solo añade: una tabla, sus índices, una función de disparador, un disparador, una columna con su límite, sus políticas y el relleno.

create table public.artistas_hitos (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid not null references public.artistas (id) on delete cascade,
  -- La evidencia del showcase de la que sale: una por evidencia; si se borra, se va el hito.
  evidencia_id uuid not null unique references public.showcase_evidencias (id) on delete cascade,
  tipo text not null check (tipo in ('premio', 'beca', 'obra', 'presentacion', 'prensa')),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  url text not null check (char_length(url) <= 2000 and url ~* '^https?://[^\s/?#@]+\.[^\s/?#@]+([/?#]\S*)?$'),
  fuente text check (fuente is null or char_length(fuente) <= 120),
  fecha date,
  publicado_en timestamptz not null default now()
);
comment on table public.artistas_hitos is 'OL-445: los hitos públicos de un artista (premios, becas, obra, presentaciones y prensa), uno por evidencia aceptada del showcase. Los mantiene solo el disparador de showcase_evidencias; nada propuesto ni rechazado, ninguna nota ni puntaje del consejo. Lectura pública con la regla de la ficha.';
comment on column public.artistas_hitos.evidencia_id is 'La evidencia aceptada de la que sale (showcase_evidencias). Al rechazarla, deshacerla o borrarla, el hito se va.';
comment on column public.artistas_hitos.url is 'La fuente enlazada (la de la evidencia): sin enlace no hay hito.';
create index artistas_hitos_artista_idx on public.artistas_hitos (artista_id, fecha desc nulls last);

-- ---------- el disparador: lo aceptado se publica; lo demás se retira ----------
create function public.showcase_evidencias_hito() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.estado = 'aceptada' and new.tipo <> 'redes' then
    insert into public.artistas_hitos (artista_id, evidencia_id, tipo, titulo, url, fuente, fecha)
    values (new.artista_id, new.id, new.tipo, new.titulo, new.url, new.fuente, new.fecha)
    on conflict (evidencia_id) do update
      set artista_id = excluded.artista_id, tipo = excluded.tipo, titulo = excluded.titulo, url = excluded.url,
          fuente = excluded.fuente, fecha = excluded.fecha;
  elsif tg_op = 'UPDATE' then
    delete from public.artistas_hitos where evidencia_id = new.id;
  end if;
  return null;
end $$;
comment on function public.showcase_evidencias_hito() is 'OL-445: publica como hito la evidencia aceptada (salvo redes) y lo retira si deja de estarlo.';
create trigger showcase_evidencias_hito after insert or update on public.showcase_evidencias
  for each row execute function public.showcase_evidencias_hito();
revoke execute on function public.showcase_evidencias_hito() from public, anon, authenticated;
grant execute on function public.showcase_evidencias_hito() to service_role;

-- ---------- permisos: se lee como la ficha; solo el disparador (o la llave de servicio) escribe ----------
alter table public.artistas_hitos enable row level security;
revoke all on public.artistas_hitos from public, anon, authenticated;
grant select on public.artistas_hitos to anon, authenticated;
grant all on public.artistas_hitos to service_role;
create policy "artistas_hitos: se ven con su ficha" on public.artistas_hitos for select to anon, authenticated
  using (exists (select 1 from public.artistas a where a.id = artista_id));

-- ---------- «Completar ficha»: las sugerencias descartadas ----------
alter table public.showcase_candidatos add column completar_descartadas text[] not null default '{}'
  check (cardinality(completar_descartadas) <= 200);
comment on column public.showcase_candidatos.completar_descartadas is 'OL-445: las claves de las sugerencias de «Completar ficha» que la administración descartó; no vuelven a salir. Solo administración.';

-- ---------- relleno: lo ya aceptado se publica ----------
insert into public.artistas_hitos (artista_id, evidencia_id, tipo, titulo, url, fuente, fecha, publicado_en)
select e.artista_id, e.id, e.tipo, e.titulo, e.url, e.fuente, e.fecha, coalesce(e.decidida_en, e.creado_en)
from public.showcase_evidencias e
where e.estado = 'aceptada' and e.tipo <> 'redes'
on conflict (evidencia_id) do nothing;
