-- somosnosotros · migración 0019 · siglas en el nombre
-- La gente llama "MAC" al Museo de Arte Contemporáneo (y CEART, IPBA a los otros dos): la sigla va en el
-- nombre, entre paréntesis, para que la búsqueda los encuentre (decisión del founder, 2026-09-15: sin campo nuevo).
update public.lugares set nombre = 'Museo de Arte Contemporáneo (MAC)' where nombre = 'Museo de Arte Contemporáneo de San Luis Potosí';
update public.lugares set nombre = 'Centro de las Artes de San Luis Potosí Centenario (CEART)' where nombre = 'Centro de las Artes de San Luis Potosí Centenario';
update public.lugares set nombre = 'Instituto Potosino de Bellas Artes (IPBA)' where nombre = 'Instituto Potosino de Bellas Artes';
