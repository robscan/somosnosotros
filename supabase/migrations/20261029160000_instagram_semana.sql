-- somosnosotros · OL-479 · migración 20261029160000 · la semana de Instagram en Administración (bitácora 511)
-- Lo firmado por el founder el 29 de octubre sobre el prototipo de OL-477 («Tomo todas tus recomendaciones», bitácora 509): la pestaña «Semana»
-- en Administración › Instagram, un día por renglón; el domingo descansa; artista y lugar a las 7:00 pm, el evento del día y «Esta semana» a las
-- 9:00 am, en la hora de la ciudad; entran todos los lugares completos (los que no tienen Instagram, sin etiqueta, sin crédito y sin aviso); la
-- página «Esta semana en Instagram» para la bio, con marca de origen para medir visitas; el artista invitado como coautor; el aviso previo, a mano.
--
-- LO ÚNICO QUE SE AFLOJA (permitido por el gestor; ninguna fila existente cambia): `evento_id` deja de ser obligatorio en `redes_trabajos`,
-- `instagram_publicaciones` y `facebook_publicaciones`, que ganan `artista_id` y `lugar_id`, con un `check` de que exactamente uno de los tres está
-- puesto (todas las filas de hoy tienen su evento: lo cumplen). `facebook_publicaciones_registro` copia también el artista y el lugar de la
-- publicación de Instagram que espeja (mismo cuerpo más esas dos columnas).
--
-- LO DEMÁS SOLO AÑADE:
--   · `instagram_publicaciones.coautores`: a quién se invitó como coautor (el campo `collaborators` de la Graph API; vacío si no se pudo).
--   · `instagram_semana`: un día de la semana de una ciudad: qué sale (artista, evento, lugar, «Esta semana» o descanso), a qué hora, cómo va, por
--     qué lo eligió el sistema, el aviso previo (cuándo se mandó, «dijo que no») y su trabajo en la cola de OL-465 (`redes_trabajos`, que ya
--     espera a su hora con `siguiente_en`: el latido `redes-latido` no toma lo que no le toca). Solo la administración la lee; se escribe por
--     sus funciones.
--   · `instagram_fuera`: «Fuera de Instagram» (dijo que no): un artista o un lugar que ya no entra en la semana. Solo la administración; la ficha
--     pública no la lee.
--   · `vistas_ficha`: las vistas a la ficha de un artista o de un lugar que llegan con la marca de Instagram o de Facebook (una por visitante,
--     ficha y día; la misma regla y la misma sal que `vistas_evento`, sin datos personales). `contar_vista_ficha` (solo `service_role`).
--   · `instagram_candidatos`, `instagram_semana_guardar`, `instagram_semana_cambiar`, `instagram_semana_quitar`, `instagram_semana_ahora`,
--     `instagram_semana_texto`, `instagram_semana_avisado`, `instagram_semana_dijo_no` e `instagram_resultado`: solo responden a la administración
--     (definer, que lo comprueba). `instagram_semana_bio`: lo ya publicado de la semana de una ciudad, para la página de la bio (pública: solo lo
--     que ya salió en Instagram).
begin;

-- ---------- 1. Una publicación es de un evento, de un artista o de un lugar ----------
alter table public.redes_trabajos
  alter column evento_id drop not null,
  add column artista_id uuid references public.artistas (id) on delete cascade,
  add column lugar_id uuid references public.lugares (id) on delete cascade,
  add constraint redes_trabajos_de_que check (num_nonnulls(evento_id, artista_id, lugar_id) = 1);
create index redes_trabajos_artista_idx on public.redes_trabajos (artista_id, creado_en desc) where artista_id is not null;
create index redes_trabajos_lugar_idx on public.redes_trabajos (lugar_id, creado_en desc) where lugar_id is not null;
comment on column public.redes_trabajos.artista_id is 'OL-479: la publicación de un artista destacado de la semana (en vez de un evento).';
comment on column public.redes_trabajos.lugar_id is 'OL-479: la publicación de un lugar destacado de la semana (en vez de un evento).';

alter table public.instagram_publicaciones
  alter column evento_id drop not null,
  add column artista_id uuid references public.artistas (id) on delete cascade,
  add column lugar_id uuid references public.lugares (id) on delete cascade,
  add column coautores text[] not null default '{}' check (cardinality(coautores) <= 3 and char_length(array_to_string(coautores, ' ')) <= 100),
  add constraint instagram_publicaciones_de_que check (num_nonnulls(evento_id, artista_id, lugar_id) = 1);
create index instagram_publicaciones_artista_idx on public.instagram_publicaciones (artista_id, creado_en desc) where artista_id is not null;
create index instagram_publicaciones_lugar_idx on public.instagram_publicaciones (lugar_id, creado_en desc) where lugar_id is not null;
comment on column public.instagram_publicaciones.coautores is 'OL-479: las cuentas invitadas como coautoras (collaborators); vacío si no se invitó o Instagram no lo aceptó.';

alter table public.facebook_publicaciones
  alter column evento_id drop not null,
  add column artista_id uuid references public.artistas (id) on delete cascade,
  add column lugar_id uuid references public.lugares (id) on delete cascade,
  add constraint facebook_publicaciones_de_que check (num_nonnulls(evento_id, artista_id, lugar_id) = 1);

create or replace function public.facebook_publicaciones_registro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.publicado_por := coalesce(auth.uid(), new.publicado_por);
  new.creado_en := now();
  -- El evento (o el artista o el lugar), el formato y cuántas imágenes son los de la publicación de Instagram que espeja, nunca otros.
  select ip.evento_id, ip.artista_id, ip.lugar_id, ip.formato, ip.imagenes
    into new.evento_id, new.artista_id, new.lugar_id, new.formato, new.imagenes
  from public.instagram_publicaciones ip where ip.id = new.instagram_id;
  return new;
end $$;
revoke execute on function public.facebook_publicaciones_registro() from public, anon, authenticated;
grant execute on function public.facebook_publicaciones_registro() to service_role;

-- ---------- 2. Fuera de Instagram ----------
create table public.instagram_fuera (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid unique references public.artistas (id) on delete cascade,
  lugar_id uuid unique references public.lugares (id) on delete cascade,
  desde timestamptz not null default now(),
  marcado_por uuid references public.perfiles (id) on delete set null,
  constraint instagram_fuera_de_que check (num_nonnulls(artista_id, lugar_id) = 1)
);
comment on table public.instagram_fuera is 'OL-479: artistas y lugares que dijeron que no a salir en el Instagram de la marca. Solo administración; la ficha pública no la lee.';

create function public.instagram_fuera_registro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.marcado_por := coalesce(auth.uid(), new.marcado_por);
  new.desde := now();
  return new;
end $$;
create trigger instagram_fuera_registro before insert on public.instagram_fuera
  for each row execute function public.instagram_fuera_registro();
revoke execute on function public.instagram_fuera_registro() from public, anon, authenticated;
grant execute on function public.instagram_fuera_registro() to service_role;

alter table public.instagram_fuera enable row level security;
revoke all on public.instagram_fuera from public, anon, authenticated;
grant select, insert, delete on public.instagram_fuera to authenticated;
grant all on public.instagram_fuera to service_role;
create policy "instagram_fuera: solo la administración" on public.instagram_fuera for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ---------- 3. La semana ----------
create table public.instagram_semana (
  id uuid primary key default gen_random_uuid(),
  -- La ciudad (su slug) y el día, en la hora de la ciudad.
  ciudad text not null check (ciudad ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(ciudad) <= 80),
  fecha date not null,
  tipo text not null check (tipo in ('artista', 'evento', 'lugar', 'semana', 'descanso')),
  artista_id uuid references public.artistas (id) on delete cascade,
  lugar_id uuid references public.lugares (id) on delete cascade,
  evento_id uuid references public.eventos (id) on delete cascade,
  -- «Esta semana»: los eventos del carrusel, en orden.
  eventos uuid[] check (eventos is null or cardinality(eventos) between 1 and 9),
  -- La hora del día (la de la regla) y el momento en que sale (fecha + hora en la zona de la ciudad); null en un descanso.
  hora time,
  programado_para timestamptz,
  estado text not null default 'programado' check (estado in ('programado', 'quitado', 'publicado', 'fallido', 'descanso')),
  elegido_por text not null default 'sistema' check (elegido_por in ('sistema', 'persona')),
  -- Por qué lo eligió el sistema («Artista con fecha ese mismo viernes…») y, si tomó el lugar de quien dijo que no, su nombre.
  motivo text check (char_length(motivo) <= 240),
  reemplaza text check (char_length(reemplaza) <= 120),
  trabajo_id uuid references public.redes_trabajos (id) on delete set null,
  -- El aviso previo (a mano, desde el teléfono del founder): cuándo se tocó «Copiar y abrir su Instagram» y cuándo «Dijo que no».
  aviso_en timestamptz,
  dijo_no_en timestamptz,
  actualizado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (ciudad, fecha),
  constraint instagram_semana_que check (
    case tipo
      when 'artista' then artista_id is not null and lugar_id is null and evento_id is null and eventos is null
      when 'lugar' then lugar_id is not null and artista_id is null and evento_id is null and eventos is null
      when 'evento' then evento_id is not null and artista_id is null and lugar_id is null and eventos is null
      when 'semana' then eventos is not null and artista_id is null and lugar_id is null and evento_id is null
      else artista_id is null and lugar_id is null and evento_id is null and eventos is null
    end),
  constraint instagram_semana_descanso check ((tipo = 'descanso') = (estado = 'descanso') and (tipo = 'descanso') = (programado_para is null) and (hora is null) = (programado_para is null))
);
create index instagram_semana_artista_idx on public.instagram_semana (artista_id) where artista_id is not null;
create index instagram_semana_lugar_idx on public.instagram_semana (lugar_id) where lugar_id is not null;
create index instagram_semana_trabajo_idx on public.instagram_semana (trabajo_id) where trabajo_id is not null;
comment on table public.instagram_semana is 'OL-479: la semana de Instagram de cada ciudad, un día por fila (qué sale, a qué hora, cómo va, el aviso previo y su trabajo en la cola). Solo administración; se escribe por sus funciones.';

alter table public.instagram_semana enable row level security;
revoke all on public.instagram_semana from public, anon, authenticated;
grant select on public.instagram_semana to authenticated;
grant all on public.instagram_semana to service_role;
create policy "instagram_semana: la administración lee" on public.instagram_semana for select to authenticated
  using (public.es_admin());

-- El pedido de un día: lo que el trabajador necesita además del artista, el lugar o el evento (`tipo`, la casilla, «también en Facebook»).
create function public.instagram_semana_pedido(p_casilla uuid, p_tipo text, p_eventos uuid[], p_extra jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('facebook', true, 'casilla', p_casilla, 'tipo', p_tipo)
    || case when p_tipo = 'semana' then jsonb_build_object('eventos', to_jsonb(p_eventos)) else '{}'::jsonb end
    || coalesce(p_extra - 'casilla' - 'tipo' - 'eventos', '{}'::jsonb);
$$;
revoke all on function public.instagram_semana_pedido(uuid, text, uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.instagram_semana_pedido(uuid, text, uuid[], jsonb) to service_role;

-- Pone (o vuelve a poner) el trabajo de un día en la cola, a su hora (`siguiente_en = programado_para`, o ahora si ya pasó). El que estaba
-- esperando se cambia (nunca dos para el mismo día); uno que ya salió o se está publicando no se toca.
create function public.instagram_semana_encolar(p_casilla uuid, p_ahora boolean, p_extra jsonb) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  c public.instagram_semana;
  v_trabajo uuid;
  v_cuando timestamptz;
  v_evento uuid;
begin
  select * into c from public.instagram_semana s where s.id = p_casilla for update;
  if not found or c.tipo = 'descanso' then
    return null;
  end if;
  v_cuando := case when p_ahora or c.programado_para <= now() then now() else c.programado_para end;
  -- «Esta semana» va a nombre de su primer evento (un trabajo es de un evento, un artista o un lugar); el pedido lleva todos.
  v_evento := coalesce(c.evento_id, case when c.tipo = 'semana' then c.eventos[1] end);
  select t.id into v_trabajo from public.redes_trabajos t where t.id = c.trabajo_id and t.estado = 'en_cola' for update;
  if v_trabajo is not null then
    update public.redes_trabajos t
    set evento_id = v_evento, artista_id = c.artista_id, lugar_id = c.lugar_id, formato = '4x5',
        pedido = public.instagram_semana_pedido(c.id, c.tipo, c.eventos, coalesce(p_extra, t.pedido)),
        siguiente_en = v_cuando, actualizado_en = now()
    where t.id = v_trabajo;
  else
    insert into public.redes_trabajos (evento_id, artista_id, lugar_id, red, formato, pedido, siguiente_en, pedido_por)
    values (v_evento, c.artista_id, c.lugar_id, 'instagram', '4x5', public.instagram_semana_pedido(c.id, c.tipo, c.eventos, p_extra), v_cuando, auth.uid())
    returning id into v_trabajo;
  end if;
  update public.instagram_semana s set trabajo_id = v_trabajo, estado = 'programado', actualizado_en = now(), actualizado_por = coalesce(auth.uid(), s.actualizado_por)
  where s.id = c.id;
  return v_trabajo;
end $$;
revoke all on function public.instagram_semana_encolar(uuid, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.instagram_semana_encolar(uuid, boolean, jsonb) to service_role;

-- ¿Ya salió o se está publicando este día? (entonces no se cambia ni se quita).
create function public.instagram_semana_cerrada(p_casilla uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.instagram_semana s join public.redes_trabajos t on t.id = s.trabajo_id
    where s.id = p_casilla and t.estado in ('publicando', 'publicado')
  ) or exists (select 1 from public.instagram_semana s where s.id = p_casilla and s.estado = 'publicado');
$$;
revoke all on function public.instagram_semana_cerrada(uuid) from public, anon, authenticated;
grant execute on function public.instagram_semana_cerrada(uuid) to service_role;

-- Guarda la semana que armó la app (la regla del día con los candidatos de `instagram_candidatos`): un día que ya tiene su fila no se toca. Cada
-- día por delante queda en la cola, a su hora. `p_casillas`: [{ fecha, tipo, hora, artista_id | lugar_id | evento_id | eventos, motivo }].
-- Devuelve cuántos días guardó.
create function public.instagram_semana_guardar(p_ciudad text, p_casillas jsonb) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_zona text;
  v_fila jsonb;
  v_id uuid;
  v_hora time;
  v_n integer := 0;
begin
  if not public.es_admin() then
    raise exception 'Solo la administración arma la semana de Instagram.' using errcode = '42501';
  end if;
  if p_ciudad is null or p_casillas is null or jsonb_typeof(p_casillas) <> 'array' or jsonb_array_length(p_casillas) > 14 then
    raise exception 'Semana inválida.' using errcode = '22023';
  end if;
  select coalesce((select c.zona from public.ciudades c where c.slug = p_ciudad), 'America/Mexico_City') into v_zona;
  perform pg_advisory_xact_lock(hashtextextended('instagram_semana:' || p_ciudad, 479));
  for v_fila in select * from jsonb_array_elements(p_casillas) loop
    v_hora := case when v_fila ->> 'tipo' = 'descanso' then null else (v_fila ->> 'hora')::time end;
    insert into public.instagram_semana (ciudad, fecha, tipo, artista_id, lugar_id, evento_id, eventos, hora, programado_para, estado, motivo, actualizado_por)
    values (
      p_ciudad, (v_fila ->> 'fecha')::date, v_fila ->> 'tipo',
      nullif(v_fila ->> 'artista_id', '')::uuid, nullif(v_fila ->> 'lugar_id', '')::uuid, nullif(v_fila ->> 'evento_id', '')::uuid,
      case when jsonb_typeof(v_fila -> 'eventos') = 'array' then array(select jsonb_array_elements_text(v_fila -> 'eventos')::uuid) end,
      v_hora, case when v_hora is null then null else ((v_fila ->> 'fecha')::date + v_hora) at time zone v_zona end,
      case when v_fila ->> 'tipo' = 'descanso' then 'descanso' else 'programado' end,
      left(v_fila ->> 'motivo', 240), auth.uid()
    )
    on conflict (ciudad, fecha) do nothing
    returning id into v_id;
    if v_id is not null then
      v_n := v_n + 1;
      -- Solo lo que está por delante va a la cola; un día que ya pasó se queda dicho, sin publicarse.
      if v_fila ->> 'tipo' <> 'descanso' and ((v_fila ->> 'fecha')::date + v_hora) at time zone v_zona > now() then
        perform public.instagram_semana_encolar(v_id, false, null);
      end if;
    end if;
    v_id := null;
  end loop;
  return v_n;
end $$;
revoke all on function public.instagram_semana_guardar(text, jsonb) from public, anon;
grant execute on function public.instagram_semana_guardar(text, jsonb) to authenticated, service_role;

-- «Cambiar» (o «Poner un lugar este domingo», o el siguiente tras «Dijo que no»): otra ficha para ese día. `p_tipo`: artista, lugar o evento
-- (un domingo que descansa pasa a lugar a las 7:00 pm); `p_reemplaza`: el nombre de quien dijo que no. Vuelve a la cola con su hora.
create function public.instagram_semana_cambiar(p_casilla uuid, p_tipo text, p_ficha uuid, p_motivo text, p_reemplaza text default null) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  c public.instagram_semana;
  v_zona text;
  v_hora time;
begin
  if not public.es_admin() then
    raise exception 'Solo la administración cambia la semana de Instagram.' using errcode = '42501';
  end if;
  select * into c from public.instagram_semana s where s.id = p_casilla for update;
  if not found then
    raise exception 'No existe ese día.' using errcode = '23503';
  end if;
  if p_tipo not in ('artista', 'lugar', 'evento') or p_ficha is null or (c.tipo <> 'descanso' and c.tipo <> p_tipo) then
    raise exception 'Cambio inválido.' using errcode = '22023';
  end if;
  if public.instagram_semana_cerrada(p_casilla) then
    raise exception 'Ese día ya salió en Instagram.' using errcode = '55000';
  end if;
  if (p_tipo = 'artista' and not exists (select 1 from public.artistas a where a.id = p_ficha))
     or (p_tipo = 'lugar' and not exists (select 1 from public.lugares l where l.id = p_ficha))
     or (p_tipo = 'evento' and not exists (select 1 from public.eventos e where e.id = p_ficha)) then
    raise exception 'No existe esa ficha.' using errcode = '23503';
  end if;
  if (p_tipo = 'artista' and exists (select 1 from public.instagram_fuera f where f.artista_id = p_ficha))
     or (p_tipo = 'lugar' and exists (select 1 from public.instagram_fuera f where f.lugar_id = p_ficha)) then
    raise exception 'Esa ficha está fuera de Instagram.' using errcode = '22023';
  end if;
  v_hora := coalesce(c.hora, '19:00'::time);
  select coalesce((select ci.zona from public.ciudades ci where ci.slug = c.ciudad), 'America/Mexico_City') into v_zona;
  update public.instagram_semana s
  set tipo = p_tipo,
      artista_id = case when p_tipo = 'artista' then p_ficha end,
      lugar_id = case when p_tipo = 'lugar' then p_ficha end,
      evento_id = case when p_tipo = 'evento' then p_ficha end,
      eventos = null,
      hora = v_hora,
      programado_para = (c.fecha + v_hora) at time zone v_zona,
      estado = 'programado',
      elegido_por = 'persona',
      motivo = left(p_motivo, 240),
      reemplaza = left(p_reemplaza, 120),
      aviso_en = null,
      dijo_no_en = null,
      actualizado_por = auth.uid(),
      actualizado_en = now()
  where s.id = c.id;
  if (c.fecha + v_hora) at time zone v_zona > now() then
    -- Lo que llevaba el día anterior (su texto) no vale para otra ficha.
    return public.instagram_semana_encolar(c.id, false, '{}'::jsonb);
  end if;
  return null;
end $$;
revoke all on function public.instagram_semana_cambiar(uuid, text, uuid, text, text) from public, anon;
grant execute on function public.instagram_semana_cambiar(uuid, text, uuid, text, text) to authenticated, service_role;

-- «Quitar de la semana»: el día no se publica (su trabajo en espera sale de la cola). Lo ya publicado no se quita.
create function public.instagram_semana_quitar(p_casilla uuid) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  c public.instagram_semana;
begin
  if not public.es_admin() then
    raise exception 'Solo la administración cambia la semana de Instagram.' using errcode = '42501';
  end if;
  select * into c from public.instagram_semana s where s.id = p_casilla for update;
  if not found or c.tipo = 'descanso' then
    return false;
  end if;
  if public.instagram_semana_cerrada(p_casilla) then
    raise exception 'Ese día ya salió en Instagram.' using errcode = '55000';
  end if;
  delete from public.redes_trabajos t where t.id = c.trabajo_id and t.estado = 'en_cola';
  update public.instagram_semana s set estado = 'quitado', trabajo_id = null, actualizado_por = auth.uid(), actualizado_en = now() where s.id = c.id;
  return true;
end $$;
revoke all on function public.instagram_semana_quitar(uuid) from public, anon;
grant execute on function public.instagram_semana_quitar(uuid) to authenticated, service_role;

-- «Publicar ahora»: el trabajo del día sale ya (si estaba quitado o no se pudo, vuelve). `p_pedido`: lo de la hoja (el texto, las etiquetas
-- quitadas, «también en Facebook»). Devuelve el trabajo.
create function public.instagram_semana_ahora(p_casilla uuid, p_pedido jsonb) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  c public.instagram_semana;
begin
  if not public.es_admin() then
    raise exception 'Solo la administración publica en redes.' using errcode = '42501';
  end if;
  if p_pedido is not null and jsonb_typeof(p_pedido) <> 'object' then
    raise exception 'Pedido inválido.' using errcode = '22023';
  end if;
  select * into c from public.instagram_semana s where s.id = p_casilla;
  if not found or c.tipo = 'descanso' then
    raise exception 'No existe ese día.' using errcode = '23503';
  end if;
  if public.instagram_semana_cerrada(p_casilla) then
    raise exception 'Ese día ya salió en Instagram.' using errcode = '55000';
  end if;
  return public.instagram_semana_encolar(c.id, true, p_pedido);
end $$;
revoke all on function public.instagram_semana_ahora(uuid, jsonb) from public, anon;
grant execute on function public.instagram_semana_ahora(uuid, jsonb) to authenticated, service_role;

-- Lo que se cambió en la hoja de un día que sale solo a su hora (el texto, las cuentas que no se etiquetan, «También en Facebook»): queda en su
-- trabajo en espera. Texto null: el que arma el sistema.
create function public.instagram_semana_texto(p_casilla uuid, p_texto text, p_quitadas text[] default '{}', p_facebook boolean default true) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_n integer;
begin
  if not public.es_admin() then
    raise exception 'Solo la administración cambia la semana de Instagram.' using errcode = '42501';
  end if;
  if char_length(p_texto) > 5000 or cardinality(p_quitadas) > 60 then
    raise exception 'Pedido demasiado largo.' using errcode = '22023';
  end if;
  update public.redes_trabajos t
  set pedido = t.pedido || jsonb_build_object('texto', nullif(btrim(p_texto), ''), 'quitadas', to_jsonb(coalesce(p_quitadas, '{}'::text[])), 'facebook', coalesce(p_facebook, true)),
      actualizado_en = now()
  from public.instagram_semana s
  where s.id = p_casilla and t.id = s.trabajo_id and t.estado = 'en_cola';
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;
revoke all on function public.instagram_semana_texto(uuid, text, text[], boolean) from public, anon;
grant execute on function public.instagram_semana_texto(uuid, text, text[], boolean) to authenticated, service_role;

-- «Copiar y abrir su Instagram»: queda anotado cuándo se avisó (se manda a mano: la API no deja escribir primero).
create function public.instagram_semana_avisado(p_casilla uuid) returns timestamptz
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_cuando timestamptz;
begin
  if not public.es_admin() then
    raise exception 'Solo la administración cambia la semana de Instagram.' using errcode = '42501';
  end if;
  update public.instagram_semana s set aviso_en = coalesce(s.aviso_en, now()), actualizado_por = auth.uid(), actualizado_en = now()
  where s.id = p_casilla and s.tipo in ('artista', 'lugar')
  returning s.aviso_en into v_cuando;
  return v_cuando;
end $$;
revoke all on function public.instagram_semana_avisado(uuid) from public, anon;
grant execute on function public.instagram_semana_avisado(uuid) to authenticated, service_role;

-- «Dijo que no»: la ficha queda fuera de Instagram y el día se queda esperando a la siguiente (la elige la app con `instagram_candidatos` y
-- `instagram_semana_cambiar`); su trabajo en espera sale de la cola. Devuelve el nombre de la ficha.
create function public.instagram_semana_dijo_no(p_casilla uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  c public.instagram_semana;
  v_nombre text;
begin
  if not public.es_admin() then
    raise exception 'Solo la administración cambia la semana de Instagram.' using errcode = '42501';
  end if;
  select * into c from public.instagram_semana s where s.id = p_casilla for update;
  if not found or c.tipo not in ('artista', 'lugar') then
    raise exception 'No existe ese día.' using errcode = '23503';
  end if;
  if public.instagram_semana_cerrada(p_casilla) then
    raise exception 'Ese día ya salió en Instagram.' using errcode = '55000';
  end if;
  insert into public.instagram_fuera (artista_id, lugar_id) values (c.artista_id, c.lugar_id) on conflict do nothing;
  delete from public.redes_trabajos t where t.id = c.trabajo_id and t.estado = 'en_cola';
  update public.instagram_semana s set dijo_no_en = now(), trabajo_id = null, actualizado_por = auth.uid(), actualizado_en = now() where s.id = c.id;
  select coalesce((select a.nombre from public.artistas a where a.id = c.artista_id), (select l.nombre from public.lugares l where l.id = c.lugar_id)) into v_nombre;
  return v_nombre;
end $$;
revoke all on function public.instagram_semana_dijo_no(uuid) from public, anon;
grant execute on function public.instagram_semana_dijo_no(uuid) to authenticated, service_role;

-- ---------- 4. Quién puede salir ----------
-- Las fichas que pueden ocupar un día, con lo que la app necesita para ordenarlas y decir por qué: artistas visibles con foto, portada,
-- descripción de 120 letras o más e Instagram; lugares visibles y públicos con portada y descripción de 120 o más (con o sin Instagram). Nunca
-- quien dijo que no ni quien salió en Instagram en los últimos 6 meses. `proxima_*`: su próxima fecha en los 30 días desde `p_desde` (el lunes
-- de la semana); `eventos_semana`: cuántos eventos tiene esa semana (el lugar); `ocupado_en`: el día que ya tiene en una semana (para no
-- repetirlo). En el orden de la regla: con fecha primero, luego los de la ciudad, luego quien lleva más tiempo sin salir y luego al azar estable.
create function public.instagram_candidatos(p_ciudad text, p_tipo text, p_desde date)
returns table (
  id uuid, slug text, nombre text, ciudad text, ciudad_slug text, clase text, detalle text, foto text, portada text, descripcion text, redes jsonb,
  direccion text, proxima_id uuid, proxima_titulo text, proxima_inicio timestamptz, proxima_zona text, proxima_lugar text, proxima_lugar_redes jsonb,
  eventos_semana integer, ultima_vez timestamptz, ocupado_en date
)
language sql stable security definer set search_path = '' as $$
  with fichas as (
    select a.id, a.slug, a.nombre, a.ciudad, a.disciplina as clase, a.detalle, a.foto, a.portada, a.descripcion, a.redes, null::text as direccion
    from public.artistas a
    where p_tipo = 'artista' and a.visible and coalesce(a.foto, '') <> '' and coalesce(a.portada, '') <> ''
      and char_length(coalesce(a.descripcion, '')) >= 120 and a.redes::text ~* 'instagram\.com/[A-Za-z0-9._]'
      and not exists (select 1 from public.instagram_fuera f where f.artista_id = a.id)
    union all
    select l.id, l.slug, l.nombre, l.ciudad, l.tipo, l.detalle, null::text, l.portada, l.descripcion, l.redes, l.direccion
    from public.lugares l
    where p_tipo = 'lugar' and l.visible and not l.privado and coalesce(l.portada, '') <> '' and char_length(coalesce(l.descripcion, '')) >= 120
      and not exists (select 1 from public.instagram_fuera f where f.lugar_id = l.id)
  ),
  con as (
    select f.*, public.ciudad_slug(f.ciudad) as ciudad_slug,
      (select max(ip.creado_en) from public.instagram_publicaciones ip
        where ip.estado = 'publicada' and (ip.artista_id = f.id or ip.lugar_id = f.id)) as ultima_vez,
      (select min(s.fecha) from public.instagram_semana s
        where (s.artista_id = f.id or s.lugar_id = f.id) and s.estado <> 'quitado' and s.dijo_no_en is null and s.fecha >= p_desde - 182) as ocupado_en,
      prox.id as proxima_id, prox.titulo as proxima_titulo, prox.inicio as proxima_inicio, prox.zona as proxima_zona, prox.lugar as proxima_lugar,
      prox.lugar_redes as proxima_lugar_redes,
      (select count(*)::int from public.eventos e
        where p_tipo = 'lugar' and e.lugar_id = f.id and e.visible and not e.borrador and not e.cancelado and not e.retirado_por_admin
          and e.inicio >= (p_desde::timestamp at time zone e.zona) and e.inicio < ((p_desde + 7)::timestamp at time zone e.zona)) as eventos_semana
    from fichas f
    left join lateral (
      select e.id, e.titulo, e.inicio, e.zona, coalesce(l.nombre, e.sitio_texto) as lugar, coalesce(l.redes, '[]'::jsonb) as lugar_redes
      from public.eventos e
      left join public.lugares l on l.id = e.lugar_id
      where e.visible and not e.borrador and not e.cancelado and not e.retirado_por_admin
        and (case when p_tipo = 'artista' then exists (select 1 from public.eventos_artistas ea where ea.evento_id = e.id and ea.artista_id = f.id) else e.lugar_id = f.id end)
        and e.inicio >= (p_desde::timestamp at time zone e.zona) and e.inicio < ((p_desde + 30)::timestamp at time zone e.zona)
      order by e.inicio
      limit 1
    ) prox on true
  )
  select c.id, c.slug, c.nombre, c.ciudad, c.ciudad_slug, c.clase, c.detalle, c.foto, c.portada, c.descripcion, c.redes, c.direccion,
    c.proxima_id, c.proxima_titulo, c.proxima_inicio, c.proxima_zona, c.proxima_lugar, c.proxima_lugar_redes,
    c.eventos_semana, c.ultima_vez, c.ocupado_en
  from con c
  where public.es_admin() and p_tipo in ('artista', 'lugar') and p_desde is not null
    and (c.ultima_vez is null or c.ultima_vez < now() - interval '6 months')
  order by (c.proxima_id is not null) desc, (c.ciudad_slug = p_ciudad) desc, c.ultima_vez nulls first, md5(c.id::text || p_desde::text)
  limit 200;
$$;
revoke all on function public.instagram_candidatos(text, text, date) from public, anon;
grant execute on function public.instagram_candidatos(text, text, date) to authenticated, service_role;

-- ---------- 5. Lo que dio cada publicación ----------
create table public.vistas_ficha (
  artista_id uuid references public.artistas (id) on delete cascade,
  lugar_id uuid references public.lugares (id) on delete cascade,
  dia date not null,
  clave text not null check (clave ~ '^[0-9a-f]{64}$'),
  origen text not null check (origen in ('instagram', 'facebook')),
  medio text check (medio in ('post', 'story', 'bio')),
  constraint vistas_ficha_de_que check (num_nonnulls(artista_id, lugar_id) = 1)
);
create unique index vistas_ficha_una_idx on public.vistas_ficha (coalesce(artista_id, lugar_id), dia, clave);
create index vistas_ficha_artista_idx on public.vistas_ficha (artista_id, dia) where artista_id is not null;
create index vistas_ficha_lugar_idx on public.vistas_ficha (lugar_id, dia) where lugar_id is not null;
comment on table public.vistas_ficha is 'OL-479: una vista por visitante, ficha (artista o lugar) y día que llega con la marca de Instagram o Facebook. La clave es sha256(sal, visitante, ficha, día), como vistas_evento: sin cuenta, cookie ni IP. Solo la escribe contar_vista_ficha.';
alter table public.vistas_ficha enable row level security;
revoke all on public.vistas_ficha from public, anon, authenticated;
grant all on public.vistas_ficha to service_role;

-- La regla de `contar_vista_evento` (OL-459), para la ficha de un artista o de un lugar y solo con origen: una por visitante y día; nunca a la
-- administración ni a quien gestiona la ficha; nunca en una ficha oculta. Devuelve true si contó.
create function public.contar_vista_ficha(p_tipo text, p_ficha uuid, p_visitante text, p_usuario uuid, p_origen text, p_medio text)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_dia date := (now() at time zone 'America/Mexico_City')::date;
  v_sal text;
  v_medio text := case when p_medio in ('post', 'story', 'bio') then p_medio end;
begin
  if p_tipo not in ('artista', 'lugar') or p_ficha is null or p_origen not in ('instagram', 'facebook')
     or p_visitante is null or p_visitante !~ '^[A-Za-z0-9_-]{16,64}$' then
    return false;
  end if;
  if p_tipo = 'artista' and not exists (select 1 from public.artistas a where a.id = p_ficha and a.visible) then
    return false;
  end if;
  if p_tipo = 'lugar' and not exists (select 1 from public.lugares l where l.id = p_ficha and l.visible and not l.privado) then
    return false;
  end if;
  if p_usuario is not null and (
    public.rol_en(p_usuario, now()) = 'admin'
    or (p_tipo = 'artista' and (exists (select 1 from public.artistas a where a.id = p_ficha and a.creado_por = p_usuario)
      or exists (select 1 from public.artistas_cuentas x where x.artista_id = p_ficha and x.perfil_id = p_usuario)))
    or (p_tipo = 'lugar' and (exists (select 1 from public.lugares l where l.id = p_ficha and l.creado_por = p_usuario)
      or exists (select 1 from public.lugares_cuentas x where x.lugar_id = p_ficha and x.perfil_id = p_usuario)))
  ) then
    return false;
  end if;
  select s.sal into v_sal from public.vistas_sal s;
  insert into public.vistas_ficha (artista_id, lugar_id, dia, clave, origen, medio)
  values (
    case when p_tipo = 'artista' then p_ficha end, case when p_tipo = 'lugar' then p_ficha end, v_dia,
    encode(sha256(convert_to(v_sal || ':' || p_visitante || ':' || p_ficha::text || ':' || v_dia::text, 'UTF8')), 'hex'), p_origen, v_medio
  )
  on conflict do nothing;
  return found;
end $$;
comment on function public.contar_vista_ficha(text, uuid, text, uuid, text, text) is
  'OL-479: una vista con origen (Instagram o Facebook) a la ficha de un artista o de un lugar, por visitante y día; no cuenta a la administración ni a quien la gestiona. Solo service_role.';
revoke all on function public.contar_vista_ficha(text, uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.contar_vista_ficha(text, uuid, text, uuid, text, text) to service_role;

-- Lo que dio un día publicado: las visitas a su ficha (o a la del evento) con origen Instagram en los 7 días desde que salió, y «van»: cuentas
-- que, tras una de esas visitas, dieron «Voy» a un evento de ese artista o lugar (o a ese evento) en esos días. Se reconoce a quien visitó con su
-- cuenta recalculando la misma clave (sal, su id, la ficha, el día): no se guarda nada de nadie. Null si no salió o si no es la administración.
create function public.instagram_resultado(p_casillas uuid[])
returns table (casilla uuid, visitas integer, van integer)
language sql stable security definer set search_path = '' as $$
  with dias as (
    select s.id, s.tipo, s.artista_id, s.lugar_id, coalesce(s.evento_id, s.eventos[1]) as evento_id,
      coalesce(ip.creado_en, s.programado_para) as desde
    from public.instagram_semana s
    left join lateral (
      select min(p.creado_en) as creado_en from public.instagram_publicaciones p
      where p.estado = 'publicada' and p.creado_en >= s.programado_para - interval '2 days'
        and (p.artista_id = s.artista_id or p.lugar_id = s.lugar_id or p.evento_id = coalesce(s.evento_id, s.eventos[1]))
    ) ip on true
    where public.es_admin() and s.id = any(p_casillas) and s.estado = 'publicado'
  )
  select d.id,
    case
      when d.artista_id is not null then (select count(*)::int from public.vistas_ficha v where v.artista_id = d.artista_id and v.origen = 'instagram'
        and v.dia between (d.desde at time zone 'America/Mexico_City')::date and (d.desde at time zone 'America/Mexico_City')::date + 7)
      when d.lugar_id is not null then (select count(*)::int from public.vistas_ficha v where v.lugar_id = d.lugar_id and v.origen = 'instagram'
        and v.dia between (d.desde at time zone 'America/Mexico_City')::date and (d.desde at time zone 'America/Mexico_City')::date + 7)
      else (select count(*)::int from public.vistas_evento v where v.evento_id = d.evento_id and v.origen = 'instagram'
        and v.dia between (d.desde at time zone 'America/Mexico_City')::date and (d.desde at time zone 'America/Mexico_City')::date + 7)
    end,
    (select count(distinct a.usuario_id)::int
      from public.asistencias a
      join public.eventos e on e.id = a.evento_id
      cross join public.vistas_sal sal
      where a.estado = 'voy' and a.creado_en >= d.desde and a.creado_en < d.desde + interval '7 days'
        and (case
          when d.artista_id is not null then exists (select 1 from public.eventos_artistas ea where ea.evento_id = e.id and ea.artista_id = d.artista_id)
          when d.lugar_id is not null then e.lugar_id = d.lugar_id
          else e.id = d.evento_id end)
        and exists (
          select 1 from generate_series((d.desde at time zone 'America/Mexico_City')::date, (a.creado_en at time zone 'America/Mexico_City')::date, interval '1 day') g(dia)
          where encode(sha256(convert_to(sal.sal || ':' || a.usuario_id::text || ':' || coalesce(d.artista_id, d.lugar_id, d.evento_id)::text || ':' || g.dia::date::text, 'UTF8')), 'hex')
            in (select v.clave from public.vistas_ficha v where (v.artista_id = d.artista_id or v.lugar_id = d.lugar_id) and v.dia = g.dia::date and v.origen = 'instagram'
                union all
                select v.clave from public.vistas_evento v where v.evento_id = d.evento_id and d.artista_id is null and d.lugar_id is null and v.dia = g.dia::date and v.origen = 'instagram')
        ))
  from dias d;
$$;
revoke all on function public.instagram_resultado(uuid[]) from public, anon;
grant execute on function public.instagram_resultado(uuid[]) to authenticated, service_role;

-- ---------- 6. La página de la bio ----------
-- Lo ya publicado en Instagram de la semana (lunes a domingo, en la hora de la ciudad) que contiene `p_dia`: el día, qué es y su ficha (artista,
-- lugar o evento). Pública: solo lo que ya salió en la cuenta de la marca y de fichas que se ven.
create function public.instagram_semana_bio(p_ciudad text, p_dia date)
returns table (fecha date, tipo text, slug text, nombre text, imagen text, eventos uuid[])
language sql stable security definer set search_path = '' as $$
  select s.fecha, s.tipo,
    coalesce(a.slug, l.slug, e.slug, e.id::text),
    coalesce(a.nombre, l.nombre, e.titulo),
    coalesce(a.foto, l.portada, e.imagen),
    s.eventos
  from public.instagram_semana s
  left join public.artistas a on a.id = s.artista_id and a.visible
  left join public.lugares l on l.id = s.lugar_id and l.visible and not l.privado
  left join public.eventos e on e.id = s.evento_id and e.visible and not e.borrador and not e.retirado_por_admin
  where s.ciudad = p_ciudad and s.estado = 'publicado'
    and s.fecha >= p_dia - ((extract(isodow from p_dia)::int - 1)) and s.fecha < p_dia - ((extract(isodow from p_dia)::int - 1)) + 7
    and (s.tipo = 'semana' or a.id is not null or l.id is not null or e.id is not null)
  order by s.fecha;
$$;
revoke all on function public.instagram_semana_bio(text, date) from public;
grant execute on function public.instagram_semana_bio(text, date) to anon, authenticated, service_role;

commit;
