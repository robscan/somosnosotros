-- somosnosotros · migración 0003 · aviso de duplicado mientras se escribe el nombre
-- Lugares visibles cuyo nombre normalizado contiene lo escrito (mínimo 4 letras). Sin distancia:
-- el aviso temprano es "ya existe uno que se llama así"; el de 150 m sigue al publicar.
create function public.lugares_con_nombre(p_nombre text)
returns setof public.lugares
language sql stable as $$
  select l.* from public.lugares l
  where l.visible
    and char_length(public.normalizar_nombre(p_nombre)) >= 4
    and public.normalizar_nombre(l.nombre) like '%' || public.normalizar_nombre(p_nombre) || '%'
  order by l.nombre
  limit 5;
$$;
