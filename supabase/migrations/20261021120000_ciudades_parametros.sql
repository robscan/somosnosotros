-- OL-429 · Parámetros propios de cada ciudad para las rutinas de Administración › Ciudades. Solo añade: una columna con su valor por omisión
-- (las ciudades que ya están quedan con '{}' y se comportan como antes) y dos comprobaciones.
--
-- Decisión del founder (2026-10-21), para Ciudad de México: «enfoquemos en zonas más turísticas y partamos de guías culturales que ya
-- existen, no vamos por todas las delegaciones, si no por las que tienen más oferta». Lo leen «Buscar lugares» y «Buscar agendas y eventos»
-- (src/lib/ciudadParametros.ts); todos los campos son opcionales:
--   · alcaldias  lista de alcaldías (o municipios, colonias) que cuentan: el SIC se filtra por su municipio y lo demás por su dirección.
--   · guias      lista de { nombre, url } de guías culturales que ya existen: primera fuente de lugares y agendas conocidas de eventos.
--   · radio_km   el radio del área de la ciudad; manda sobre el que se deduce del zoom.
-- Ejemplo: {"alcaldias": ["Cuauhtémoc", "Miguel Hidalgo"], "radio_km": 12, "guias": [{"nombre": "Cultura UNAM", "url": "https://www.cultura.unam.mx/"}]}.
-- Los datos de cada ciudad no van en una migración: la administración los carga (el gestor, con psql, al aplicar esta migración).
-- Las reglas por fila de `ciudades` no cambian: la lee todo el mundo (no hay nada privado aquí) y la cambia la administración.

alter table public.ciudades add column parametros jsonb not null default '{}'::jsonb;

alter table public.ciudades add constraint ciudades_parametros_objeto check (jsonb_typeof(parametros) = 'object');
alter table public.ciudades add constraint ciudades_parametros_tamano check (octet_length(parametros::text) <= 20000);

comment on column public.ciudades.parametros is
  'OL-429: parámetros de las rutinas de esa ciudad (alcaldias, guias [{nombre,url}], radio_km); vacío, la ciudad se comporta como antes.';
