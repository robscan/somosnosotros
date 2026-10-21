-- somosnosotros · OL-426 · Administración › Showcase: candidatos, rúbrica, evidencias y lecturas de redes (bitácora 459)
-- Lo firmado por el founder el 20 de octubre sobre el prototipo OL-425 (bitácora 458) y el modelo de la investigación del mismo día (§4.2).
-- Las tres reglas de gobierno (§4.3) viven aquí, no solo en la pantalla:
--   1. Solo administración: las cuatro tablas las lee y escribe únicamente quien tiene el rol de administración (`es_admin()`); ni un visitante
--      ni una cuenta cualquiera ven una fila, ni siquiera que existe. La llave de servicio (el servidor y la rutina de OL-428) lo puede todo.
--   2. Las notas del consejo y los puntajes son juicios sobre personas: nunca salen de Administración (ninguna vista pública, ninguna función
--      que los devuelva sin sesión; el CSV para el consejo lo descarga solo la administración) y se pueden borrar.
--   3. Nada de esto se publica sobre un artista sin su consentimiento: ninguna ficha pública lee estas tablas.
-- Además (vulnerabilidades del §4.4 que esta pieza cierra): toda evidencia lleva una dirección http(s) (sin enlace no hay evidencia), y cada
-- cambio de estado de un candidato queda con quién y cuándo (`showcase_cambios_estado`, que solo escribe el disparador).
-- Sin fila en `showcase_candidatos`, un artista visible es «candidato» implícito: no se insertan 686 filas.
-- Solo añade: cuatro tablas, sus índices, un disparador por tabla y sus políticas. No toca nada existente.

-- ---------- candidatos: el estado, los cuatro puntajes y las notas de cada artista ----------
create table public.showcase_candidatos (
  artista_id uuid primary key references public.artistas (id) on delete cascade,
  estado text not null default 'candidato' check (estado in ('candidato', 'revisado', 'invitado', 'confirmado', 'descartado')),
  -- La rúbrica (investigación del 20 de octubre, §3.2): cada señal de 0 a 2; null = todavía sin puntuar (no es un 0).
  puntaje_circulacion smallint check (puntaje_circulacion between 0 and 2),
  puntaje_obra smallint check (puntaje_obra between 0 and 2),
  puntaje_actividad smallint check (puntaje_actividad between 0 and 2),
  puntaje_vinculo smallint check (puntaje_vinculo between 0 and 2),
  notas text check (char_length(notas) <= 4000),
  -- Quién y cuándo lo cambió por última vez: lo pone el disparador con la cuenta de la sesión (no se puede escribir a nombre de otra).
  actualizado_por uuid references public.perfiles (id) on delete set null,
  actualizado_en timestamptz not null default now()
);
comment on table public.showcase_candidatos is 'Showcase (OL-426): estado, rúbrica y notas privadas del consejo por artista. Solo administración: son juicios sobre personas y nunca salen de Administración ni se publican sin el consentimiento del artista. Sin fila, el artista es candidato implícito.';
comment on column public.showcase_candidatos.notas is 'Notas privadas del consejo: solo administración, nunca en una ruta pública ni en el sitemap; se pueden borrar.';
comment on column public.showcase_candidatos.puntaje_circulacion is 'Circulación 0–2: 0 un foro o ninguno; 1 de 2 a 3 foros o un festival; 2 cuatro foros o más, o festival y fuera de San Luis. Null = sin puntuar.';
comment on column public.showcase_candidatos.puntaje_obra is 'Obra y reconocimiento 0–2: 0 nada verificable; 1 obra publicada o expuesta en 24 meses; 2 además beca, premio, residencia o selección oficial.';
comment on column public.showcase_candidatos.puntaje_actividad is 'Actividad 0–2: 0 más de 90 días sin publicar; 1 publica cada mes; 2 cada semana y anuncia fechas.';
comment on column public.showcase_candidatos.puntaje_vinculo is 'Vínculo con la app 0–2: 0 sin ficha propia; 1 ficha reclamada; 2 con novedades o portada.';
comment on column public.showcase_candidatos.actualizado_por is 'La cuenta que hizo el último cambio (la pone el disparador con la sesión).';
create index showcase_candidatos_estado_idx on public.showcase_candidatos (estado);
create index showcase_candidatos_actualizado_por_idx on public.showcase_candidatos (actualizado_por);

-- ---------- el registro de cada cambio de estado (quién y cuándo), para la hoja «Estado» de la ficha ----------
create table public.showcase_cambios_estado (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid not null references public.artistas (id) on delete cascade,
  estado text not null check (estado in ('candidato', 'revisado', 'invitado', 'confirmado', 'descartado')),
  por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);
comment on table public.showcase_cambios_estado is 'Showcase (OL-426): cada cambio de estado de un candidato, con quién y cuándo. Lo escribe solo el disparador de showcase_candidatos; la administración lo lee.';
create index showcase_cambios_estado_artista_idx on public.showcase_cambios_estado (artista_id, creado_en desc);
create index showcase_cambios_estado_por_idx on public.showcase_cambios_estado (por);

-- ---------- evidencias: lo que sostiene cada puntaje, siempre con su enlace ----------
create table public.showcase_evidencias (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid not null references public.artistas (id) on delete cascade,
  senal text not null check (senal in ('circulacion', 'obra', 'actividad', 'vinculo')),
  tipo text not null check (tipo in ('beca', 'premio', 'prensa', 'obra', 'presentacion', 'redes')),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  -- Sin enlace no hay evidencia (§4.4, vulnerabilidad 1): http o https, un dominio con punto, sin espacios ni usuario en la dirección.
  url text not null check (char_length(url) <= 2000 and url ~* '^https?://[^\s/?#@]+\.[^\s/?#@]+([/?#]\S*)?$'),
  fecha date,
  fuente text check (fuente is null or char_length(fuente) <= 120),
  -- Quién la leyó: la rutina de la API (OL-428) o una persona de la administración.
  leida_por text not null default 'persona' check (leida_por in ('rutina', 'persona')),
  -- Nace propuesta (lo que trae la rutina) hasta que alguien la acepta; la que añade una persona a mano nace aceptada (la leyó ella).
  estado text not null default 'propuesta' check (estado in ('propuesta', 'aceptada', 'rechazada')),
  -- Quién la aceptó o la rechazó y cuándo: lo pone el disparador con la sesión.
  decidida_por uuid references public.perfiles (id) on delete set null,
  decidida_en timestamptz,
  creado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);
comment on table public.showcase_evidencias is 'Showcase (OL-426): las evidencias de la rúbrica, siempre con su enlace http(s). Solo administración. Lo que trae la rutina nace propuesta; solo cuenta lo aceptado.';
comment on column public.showcase_evidencias.url is 'Obligatoria y http(s): sin enlace verificado no hay evidencia (investigación del 20 de octubre, §4.4).';
create index showcase_evidencias_artista_idx on public.showcase_evidencias (artista_id, creado_en desc);
create index showcase_evidencias_propuestas_idx on public.showcase_evidencias (estado) where estado = 'propuesta';
create index showcase_evidencias_decidida_por_idx on public.showcase_evidencias (decidida_por);
create index showcase_evidencias_creado_por_idx on public.showcase_evidencias (creado_por);

-- ---------- lecturas de redes: cifras leídas a mano o importadas en CSV (el servidor no puede leer Instagram) ----------
create table public.lecturas_redes (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid not null references public.artistas (id) on delete cascade,
  red text not null check (red in ('instagram', 'facebook', 'youtube', 'spotify', 'otra')),
  seguidores integer check (seguidores between 0 and 1000000000),
  publicaciones integer check (publicaciones between 0 and 10000000),
  ultima_publicacion date,
  leido_en timestamptz not null default now(),
  -- La cuenta que la registró o la importó (la pone el disparador con la sesión).
  leido_por uuid references public.perfiles (id) on delete set null,
  check (seguidores is not null or publicaciones is not null or ultima_publicacion is not null)
);
comment on table public.lecturas_redes is 'Showcase (OL-426): cifras de redes de un artista con la fecha de la lectura («leído hace N días»). Entran a mano o en CSV desde Administración; nunca desde el servidor. Solo administración.';
create index lecturas_redes_artista_idx on public.lecturas_redes (artista_id, red, leido_en desc);
create index lecturas_redes_leido_por_idx on public.lecturas_redes (leido_por);

-- ---------- disparadores: quién y cuándo lo pone la base, no la pantalla ----------
-- Candidatos: el autor y la hora del último cambio son los de la sesión; si el estado cambia (o nace en un estado distinto de «candidato»),
-- queda una fila en el registro. Con la llave de servicio (sin sesión) se respeta el autor que traiga la fila.
create function public.showcase_candidatos_registro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.actualizado_por := coalesce(auth.uid(), new.actualizado_por);
  new.actualizado_en := now();
  if (tg_op = 'INSERT' and new.estado <> 'candidato') or (tg_op = 'UPDATE' and new.estado is distinct from old.estado) then
    insert into public.showcase_cambios_estado (artista_id, estado, por) values (new.artista_id, new.estado, new.actualizado_por);
  end if;
  return new;
end $$;
create trigger showcase_candidatos_registro before insert or update on public.showcase_candidatos
  for each row execute function public.showcase_candidatos_registro();

-- Evidencias: quien la crea es la sesión; quien la acepta o la rechaza (o la deshace) y cuándo, también.
create function public.showcase_evidencias_registro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.creado_por := coalesce(auth.uid(), new.creado_por);
    new.creado_en := now();
    if new.estado <> 'propuesta' then
      new.decidida_por := coalesce(auth.uid(), new.decidida_por);
      new.decidida_en := now();
    else
      new.decidida_por := null;
      new.decidida_en := null;
    end if;
    return new;
  end if;
  -- Al corregir una evidencia, su autor y su alta no cambian.
  new.creado_por := old.creado_por;
  new.creado_en := old.creado_en;
  if new.estado is distinct from old.estado then
    new.decidida_por := case when new.estado = 'propuesta' then null else coalesce(auth.uid(), new.decidida_por) end;
    new.decidida_en := case when new.estado = 'propuesta' then null else now() end;
  else
    new.decidida_por := old.decidida_por;
    new.decidida_en := old.decidida_en;
  end if;
  return new;
end $$;
create trigger showcase_evidencias_registro before insert or update on public.showcase_evidencias
  for each row execute function public.showcase_evidencias_registro();

-- Lecturas: quien la registra es la sesión; al corregirla, sigue siendo de quien la registró.
create function public.lecturas_redes_registro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.leido_por := case when tg_op = 'INSERT' then coalesce(auth.uid(), new.leido_por) else old.leido_por end;
  return new;
end $$;
create trigger lecturas_redes_registro before insert or update on public.lecturas_redes
  for each row execute function public.lecturas_redes_registro();

-- Los disparadores no se llaman desde fuera.
revoke execute on function public.showcase_candidatos_registro() from public, anon, authenticated;
revoke execute on function public.showcase_evidencias_registro() from public, anon, authenticated;
revoke execute on function public.lecturas_redes_registro() from public, anon, authenticated;
grant execute on function public.showcase_candidatos_registro() to service_role;
grant execute on function public.showcase_evidencias_registro() to service_role;
grant execute on function public.lecturas_redes_registro() to service_role;

-- ---------- permisos: solo administración; anon nada; la llave de servicio todo ----------
alter table public.showcase_candidatos enable row level security;
alter table public.showcase_cambios_estado enable row level security;
alter table public.showcase_evidencias enable row level security;
alter table public.lecturas_redes enable row level security;

revoke all on public.showcase_candidatos, public.showcase_cambios_estado, public.showcase_evidencias, public.lecturas_redes from public, anon, authenticated;
grant select, insert, update, delete on public.showcase_candidatos, public.showcase_evidencias, public.lecturas_redes to authenticated;
-- El registro de estados solo se lee: lo escribe el disparador.
grant select on public.showcase_cambios_estado to authenticated;
grant all on public.showcase_candidatos, public.showcase_cambios_estado, public.showcase_evidencias, public.lecturas_redes to service_role;

create policy "showcase_candidatos: solo la administración" on public.showcase_candidatos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "showcase_cambios_estado: lee la administración" on public.showcase_cambios_estado for select to authenticated
  using (public.es_admin());
create policy "showcase_evidencias: solo la administración" on public.showcase_evidencias for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "lecturas_redes: solo la administración" on public.lecturas_redes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
