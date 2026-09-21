-- somosnosotros · OL-101 · subcategorías por disciplina
-- Al elegir disciplina en el alta o la edición de artista, sugerir qué subcategorías (`detalle`)
-- ya existen: para que "fotografía" no se escriba de tres formas distintas ("foto", "Fotografia",
-- "fotografía"). Solo lectura: no crea tabla ni columna, `detalle` sigue siendo texto libre.
-- No es por ciudad (docs/rediseno/27): una subcategoría es del vocabulario de la disciplina, no
-- de una ciudad. Reutiliza public.normalizar_nombre (mismo criterio que evita artistas duplicados).

create or replace function public.subcategorias_de(p_disciplina text)
returns table (detalle text, artistas integer)
language sql stable security invoker set search_path = '' as $$
  with por_grupo as (
    -- Agrupa por la forma normalizada (sin acentos, mayúsculas ni espacios de más) y, dentro de
    -- cada grupo, por la escritura exacta: así se puede contar cuál escritura es la más usada.
    select public.normalizar_nombre(a.detalle) as clave, a.detalle as etiqueta, count(*) as n
    from public.artistas a
    where a.visible
      and a.detalle is not null and trim(a.detalle) <> ''
      and a.disciplina = p_disciplina
      -- Disciplina rara o vacía: cero filas, no error (misma lista cerrada del cliente).
      and p_disciplina in ('musica', 'teatro', 'danza', 'artes_visuales', 'letras', 'cine', 'circo', 'otro')
    group by public.normalizar_nombre(a.detalle), a.detalle
  ),
  rankeado as (
    select clave, etiqueta, sum(n) over (partition by clave) as total,
           row_number() over (partition by clave order by n desc, etiqueta) as posicion
    from por_grupo
  )
  select etiqueta as detalle, total::integer as artistas
  from rankeado
  where posicion = 1
  order by total desc, etiqueta
  limit 40;
$$;

comment on function public.subcategorias_de(text) is 'OL-101: subcategorías (detalle) ya usadas en una disciplina, unidas por escritura normalizada, con la más usada primero. Para sugerir al escribir, no para los chips de filtro (esos siguen en detalles_de_disciplina, por ciudad y con umbral).';

revoke execute on function public.subcategorias_de(text) from public;
grant execute on function public.subcategorias_de(text) to anon, authenticated;
