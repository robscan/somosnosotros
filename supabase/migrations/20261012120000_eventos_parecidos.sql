-- somosnosotros · OL-384 · «¿Es este?» antes de publicar un evento que ya está (bitácora 415)
-- Pedido del founder (2026-10-12): «haga una manera de evitar que se publiquen eventos duplicados, así como ya hacemos con lugares». El caso
-- que lo motivó: dos fichas del mismo concierto, «Gitanos mexicanos 2.ª edición: Pargazz» (carga del PDF de la Secretaría) y «Pargazz: Gitanos
-- mexicanos, 2ª Edición» (con cartel), las dos el 16 de octubre a las 19:00 en el Museo Francisco Cossío. `titulos_parecidos` (OL-341) no las
-- toma por iguales: ninguna contiene a la otra como frase.
--
-- Como `lugares_parecidos` para el alta de lugar: la acción del alta de evento la consulta antes de guardar y, si hay alguno y la persona no
-- confirmó, no publica y pregunta «¿Es este?»; el importador de agendas la consulta antes de cargar cada evento.
--
-- Solo añade: una función de lectura. SECURITY INVOKER (lee con los permisos de quien llama: la política de `eventos` ya esconde lo bloqueado)
-- y, además, filtra a mano lo que cualquiera ve en la agenda, para que quien llama no se encuentre a sí mismo en un borrador u oculto propio.
-- No llama a `titulo_distintivo` ni a `titulos_parecidos` (internas, sin EXECUTE para las cuentas): repite su regla aquí.

create function public.eventos_parecidos(
  p_titulo text, p_inicio timestamptz, p_zona text, p_lugar_id uuid, p_sitio_texto text, p_excluir uuid default null
) returns table (
  id uuid, slug text, titulo text, inicio timestamptz, zona text, imagen text, lugar_id uuid, lugar_nombre text, sitio_texto text
)
language sql stable security invoker set search_path = '' as $$
  with
  -- Palabras vacías: las mismas de `titulo_distintivo` (artículos, preposiciones y conjunciones).
  vacias as (
    select array['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'con', 'a', 'al', 'para', 'por', 'un', 'una', 'o', 'u', 'the', 'of', 'and'] as v
  ),
  -- Lo que se va a publicar: el título normalizado (sin acentos, mayúsculas ni signos) y el día local en su zona.
  nuevo as (
    select public.normalizar_nombre(p_titulo) as titulo_n,
      pg_catalog.timezone(coalesce(nullif(p_zona, ''), 'America/Mexico_City'), p_inicio)::date as dia,
      coalesce(nullif(p_zona, ''), 'America/Mexico_City') as zona
  ),
  -- «El mismo día»: de las 00:00 a las 24:00 de ese día en la zona del evento nuevo.
  limites as (
    select pg_catalog.timezone(n.zona, n.dia::timestamp) as desde, pg_catalog.timezone(n.zona, (n.dia + 1)::timestamp) as hasta from nuevo n
  ),
  -- «El mismo sitio»: el nombre del lugar elegido (si quien llama lo ve) o el del sitio escrito, normalizado. Sirve para reconocer el mismo
  -- sitio cuando uno está en el directorio y el otro se escribió a mano («Museo Francisco Cossío» con y sin ficha).
  sitio as (
    select public.normalizar_nombre(coalesce((select l.nombre from public.lugares l where l.id = p_lugar_id), p_sitio_texto)) as nombre_n
  ),
  -- Las palabras con contenido del título nuevo: sin las vacías ni los años (2026 no dice qué evento es); un ordinal se queda con su número
  -- («2ª» → «2a» → «2»; «2.ª» → «2 a» → «2» y la «a» es vacía), así «2ª edición» y «2.ª Edición» comparten «2» y «edicion».
  mias as (
    select distinct pg_catalog.regexp_replace(w, '^([0-9]+)(a|o|er|ra|da|do|ro|to|ta|vo|va|no|na|mo|ma)$', '\1') as w
    from nuevo n, vacias, pg_catalog.regexp_split_to_table(n.titulo_n, ' ') as w
    where w <> '' and not (w = any (vacias.v)) and w !~ '^(19|20)[0-9]{2}$'
  )
  select e.id, e.slug, e.titulo, e.inicio, e.zona, e.imagen, e.lugar_id, l.nombre, e.sitio_texto
  from public.eventos e
  left join public.lugares l on l.id = e.lugar_id
  cross join nuevo n
  cross join limites
  cross join sitio
  cross join vacias
  where
    -- Solo lo que cualquiera ve en la agenda: visible, sin borradores ni lo retirado por la administración, y sin pasar.
    e.visible and not e.borrador and not e.retirado_por_admin and e.termina >= pg_catalog.now()
    -- Lo puntual y los talleres (también un acto de festival, que es puntual). Una exposición o un festival ocupan un periodo: compararlos
    -- por «el mismo día» los tomaría por iguales a cualquier evento del sitio en esas semanas; se quedan fuera (bitácora 415, por confirmar).
    and e.clase in ('puntual', 'taller')
    and (p_excluir is null or e.id <> p_excluir)
    -- El mismo día local: empieza entre las 00:00 y las 24:00 del día del evento nuevo, en su zona.
    and e.inicio >= limites.desde and e.inicio < limites.hasta
    -- El mismo sitio: el mismo lugar del directorio, o el mismo nombre de sitio normalizado (de su lugar o escrito a mano).
    and (
      (p_lugar_id is not null and e.lugar_id = p_lugar_id)
      or (sitio.nombre_n <> '' and public.normalizar_nombre(coalesce(l.nombre, e.sitio_texto)) = sitio.nombre_n)
    )
    -- Un título que se parece (ya en el mismo día y el mismo sitio):
    and n.titulo_n <> ''
    and (
      -- (1) el mismo título normalizado, aunque sea genérico («Concierto» y «Concierto» el mismo día en el mismo sitio: preguntar cuesta un toque);
      public.normalizar_nombre(e.titulo) = n.titulo_n
      -- (2) uno dentro del otro por palabras enteras y el más corto distintivo (la regla de `titulos_parecidos`, OL-341: tres palabras con
      --     contenido o una palabra de festival), o
      or exists (
        select 1
        from (select case when length(n.titulo_n) <= length(t.n) then n.titulo_n else t.n end as corto,
                     case when length(n.titulo_n) <= length(t.n) then t.n else n.titulo_n end as largo
              from (select public.normalizar_nombre(e.titulo) as n) t) c
        where c.corto <> '' and position(' ' || c.corto || ' ' in ' ' || c.largo || ' ') > 0
          and (
            exists (select 1 from pg_catalog.regexp_split_to_table(c.corto, ' ') w where w in ('festival', 'fest', 'encuentro', 'muestra', 'ciclo', 'jornadas'))
            or (select count(*) from pg_catalog.regexp_split_to_table(c.corto, ' ') w where w <> '' and not (w = any (vacias.v))) >= 3
          )
      )
      -- (3) al menos dos palabras con contenido en común, en cualquier orden («Gitanos mexicanos 2.ª edición: Pargazz» y «Pargazz: Gitanos
      --     mexicanos, 2ª Edición» comparten cinco).
      or (
        select count(*) from (
          select distinct pg_catalog.regexp_replace(w, '^([0-9]+)(a|o|er|ra|da|do|ro|to|ta|vo|va|no|na|mo|ma)$', '\1') as w
          from pg_catalog.regexp_split_to_table(public.normalizar_nombre(e.titulo), ' ') as w
          where w <> '' and not (w = any (vacias.v)) and w !~ '^(19|20)[0-9]{2}$'
        ) suyas
        where suyas.w in (select mias.w from mias)
      ) >= 2
    )
  -- El más cercano en hora primero; hasta cinco.
  order by abs(extract(epoch from e.inicio - p_inicio)), e.id
  limit 5;
$$;
comment on function public.eventos_parecidos(text, timestamptz, text, uuid, text, uuid) is
  'OL-384: eventos visibles, sin pasar, el mismo día local y en el mismo sitio, con un título parecido. «¿Es este?» antes de publicar otro.';
-- Lee solo lo visible: la puede llamar cualquiera (el alta con sesión y el importador con la llave de servicio).
revoke all on function public.eventos_parecidos(text, timestamptz, text, uuid, text, uuid) from public;
grant execute on function public.eventos_parecidos(text, timestamptz, text, uuid, text, uuid) to anon, authenticated, service_role;
