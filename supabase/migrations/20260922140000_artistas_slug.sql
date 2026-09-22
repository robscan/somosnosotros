-- somosnosotros · migración 20260922140000 · dirección legible de artistas (OL-114, B2)
-- Solo añade: columna, índice único, dos funciones de slug, relleno de las fichas existentes y una función
-- de reclamo con aprobación automática cuando el correo de la cuenta coincide con el que el CAPO capturó (L53).

-- Slug a partir del nombre: minúsculas, sin acentos, sin signos, guiones entre palabras. `unaccent` depende de
-- su diccionario, así que es `stable`, no `immutable` (mismo criterio que normalizar_nombre); no se usa en un
-- índice funcional, solo para calcular el valor que se guarda en la columna.
create function public.slug_de_nombre(p_nombre text) returns text
language sql stable set search_path = '' as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(p_nombre, ''))), '[^a-z0-9]+', '-', 'g'));
$$;
revoke execute on function public.slug_de_nombre(text) from public, anon;
grant execute on function public.slug_de_nombre(text) to authenticated, service_role;

alter table public.artistas add column slug text;
comment on column public.artistas.slug is 'La dirección legible (/artistas/<slug>); se pone sola al crear la ficha y no cambia si cambia el nombre (docs/rediseno/24-grafo-cultural.md).';

-- Relleno en orden estable (creado_en, id): el sufijo de un choque siempre sale igual si se releyera esta migración.
-- Nombre vacío o solo símbolos (no debería haber ninguno) cae a "artista-<8 del id>".
do $$
declare
  fila record;
  base text;
  candidato text;
  sufijo int;
begin
  for fila in select id, nombre from public.artistas order by creado_en, id loop
    base := public.slug_de_nombre(fila.nombre);
    if base = '' then base := 'artista-' || left(fila.id::text, 8); end if;
    candidato := base;
    sufijo := 2;
    while exists (select 1 from public.artistas where slug = candidato and id <> fila.id) loop
      candidato := base || '-' || sufijo;
      sufijo := sufijo + 1;
    end loop;
    update public.artistas set slug = candidato where id = fila.id;
  end loop;
end $$;

alter table public.artistas alter column slug set not null;
create unique index artistas_slug_idx on public.artistas (slug);

-- Alta nueva: si no llega slug (hoy nunca llega; lo pone la base), se calcula aquí con el mismo criterio de
-- sufijo. Nunca se toca en un update de nombre: el slug no cambia (docs/rediseno/24-grafo-cultural.md).
create function public.artistas_generar_slug() returns trigger
language plpgsql set search_path = '' as $$
declare
  base text;
  candidato text;
  sufijo int;
begin
  if new.slug is not null then return new; end if;
  base := public.slug_de_nombre(new.nombre);
  if base = '' then base := 'artista-' || left(new.id::text, 8); end if;
  candidato := base;
  sufijo := 2;
  while exists (select 1 from public.artistas where slug = candidato) loop
    candidato := base || '-' || sufijo;
    sufijo := sufijo + 1;
  end loop;
  new.slug := candidato;
  return new;
end $$;
create trigger artistas_slug before insert on public.artistas
  for each row execute function public.artistas_generar_slug();
-- Un trigger instalado no necesita EXECUTE de quien inserta para dispararse (mismo criterio que los demás
-- triggers de la base, security_advisor). Se impide invocarlo/reutilizarlo aparte, sin tocar el ya instalado.
revoke execute on function public.artistas_generar_slug() from public, anon, authenticated;
grant execute on function public.artistas_generar_slug() to service_role;

-- Reclamo con aprobación automática (L53): la propia función lee el correo de quien llama (nunca un parámetro:
-- así nadie puede probar correos ajenos contra una ficha). `contactos_importados` no tiene ninguna política a
-- propósito (Security Advisor, OL-095); esta función SECURITY DEFINER es la única puerta, y hace el alta ella
-- misma porque la política de `artistas_cuentas` exige `gestiona_artista`, que una cuenta sin ligar aún no cumple.
create function public.reclamar_si_correo_coincide(p_artista uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_correo text;
  v_coincide boolean;
begin
  if auth.uid() is null then return false; end if;
  select email into v_correo from auth.users where id = auth.uid();
  if v_correo is null then return false; end if;
  select exists (
    select 1 from public.contactos_importados c
    where c.artista_id = p_artista and lower(c.correo) = lower(v_correo)
  ) into v_coincide;
  if not v_coincide then return false; end if;
  insert into public.artistas_cuentas (artista_id, perfil_id) values (p_artista, auth.uid())
    on conflict do nothing;
  return true;
end $$;
revoke execute on function public.reclamar_si_correo_coincide(uuid) from public, anon;
grant execute on function public.reclamar_si_correo_coincide(uuid) to authenticated;
