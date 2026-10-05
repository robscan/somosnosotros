-- OL-262 / H05. Validar escrituras nuevas; no recorrer ni reescribir imágenes históricas.
-- Origen público propio fijado al desplegar: nunca tomarlo de headers, metadatos o GUC del cliente.
create function public.imagen_origen_permitido(_url text, _externa boolean, _perfil boolean)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare
  partes text[];
  autoridad text[];
  host text;
  puerto integer;
  ruta text;
  fotos constant text := '/storage/v1/object/public/fotos/';
begin
  if _url is null or _url = '' then return true; end if;
  -- Gramática idéntica a lib/imagenes.ts. Unicode se admite codificado en la ruta.
  if _url !~ '^[!-~]+$' or position(chr(92) in _url) > 0 then return false; end if;
  partes := regexp_match(_url, '^https://([^/?#]+)([^?#]*)(?:[?#].*)?$');
  if partes is null then return false; end if;
  autoridad := regexp_match(partes[1], '^([^:]+)(?::([0-9]{1,5}))?$');
  if autoridad is null or autoridad[1] !~* '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$' then return false; end if;
  host := lower(autoridad[1]);
  puerto := coalesce(autoridad[2]::integer, 443);
  ruta := partes[2];
  if puerto < 1 or puerto > 65535 then return false; end if;
  if coalesce(_externa, false) then return true; end if;
  if puerto <> 443 or ruta ~* '(^|/)(?:\.|%2e){1,2}(/|$)|%(?:2f|5c|25)' then return false; end if;
  if host = 'viesoxgrfvftkgpjbnml.supabase.co' and starts_with(ruta, fotos) and length(ruta) > length(fotos) then return true; end if;
  return coalesce(_perfil, false) and host = 'lh3.googleusercontent.com' and length(ruta) > 1;
end;
$$;
revoke all on function public.imagen_origen_permitido(text,boolean,boolean) from public, anon;
grant execute on function public.imagen_origen_permitido(text,boolean,boolean) to authenticated, service_role;

create function public.proteger_imagen_origen() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  campo text;
  valor text;
  externa boolean;
begin
  foreach campo in array tg_argv loop
    valor := to_jsonb(new) ->> campo;
    if tg_op = 'UPDATE' and valor is not distinct from (to_jsonb(old) ->> campo) then continue; end if;
    -- current_user puede ser el dueño dentro de una RPC SECURITY DEFINER.
    -- El rol efectivo de PostgREST se conserva en role; claims o campos de la fila no lo sustituyen.
    externa := current_setting('role', true) = 'service_role'
      or (auth.uid() is not null and public.es_admin());
    if not public.imagen_origen_permitido(valor, externa, tg_table_name = 'perfiles') then
      raise exception 'La imagen debe subirse al almacenamiento de la app.' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.proteger_imagen_origen() from public, anon, authenticated, service_role;

create trigger artistas_imagen_origen before insert or update of foto, portada on public.artistas
for each row execute function public.proteger_imagen_origen('foto', 'portada');
create trigger eventos_imagen_origen before insert or update of imagen on public.eventos
for each row execute function public.proteger_imagen_origen('imagen');
create trigger lugares_imagen_origen before insert or update of portada on public.lugares
for each row execute function public.proteger_imagen_origen('portada');
create trigger perfiles_imagen_origen before insert or update of foto on public.perfiles
for each row execute function public.proteger_imagen_origen('foto');

-- Único cambio en el cuerpo de crear_perfil: filtrar avatar_url. El alta no falla por una foto ajena.
-- Conserva nombre, selección del rol y ON CONFLICT; el search_path vacío ya estaba vigente.
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, foto, rol)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), ''), 60),
    case when public.imagen_origen_permitido(new.raw_user_meta_data ->> 'avatar_url', false, true)
      then new.raw_user_meta_data ->> 'avatar_url' else null end,
    case when exists (select 1 from public.admin_correos where lower(correo) = lower(new.email)) then 'admin' else 'usuario' end
  )
  on conflict (id) do nothing;
  return new;
end $$;
