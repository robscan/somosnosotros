-- somosnosotros · OL-391 · «Se canceló»: anunciado vs. realizado (pieza 2 de 5 del historial, bitácora 422)
-- Regla del founder (firmada con el prototipo OL-389, bitácora 420, y confirmada el 12 de oct con «sigue con piezas faltantes»): un evento que
-- ya pasó cuenta como realizado y entra al historial de su artista y de su lugar, salvo que quien gestiona el evento (o la administración) lo
-- marque «se canceló», de un toque, desde su ficha en pasado. Marcado, se queda en la lista pero se ve cancelado y no cuenta. Nadie tiene que
-- confirmar nada para que lo normal (que sí ocurrió) aparezca.
--
-- Solo añade una columna con su valor de siempre (false): ninguna fila cambia de sentido, todo lo pasado sigue contando como realizado.
-- Sin políticas nuevas: la cambian quienes ya pueden editar el evento («eventos: edita autor o admin», migración base); un visitante y otra
-- cuenta no. Que solo se marque lo que ya pasó, y no un borrador ni algo oculto, lo cuida la acción de la app (`marcarCancelado`): es una
-- etiqueta del propio evento, como su descripción, y quien puede editarlo puede escribirla. Ningún disparador mira la columna: no manda
-- avisos (solo los cambios de cuándo y dónde los mandan) ni toca `retirado_por_admin`, `visible` o `borrador`.
-- Ninguna función de la base lista lo pasado (el historial y el «Ya pasó» del festival leen la tabla), así que ninguna cambia.
-- La aplica el gestor antes de unir el código: la ficha del evento, su festival y el historial leen `cancelado`.

alter table public.eventos add column cancelado boolean not null default false;
comment on column public.eventos.cancelado is 'Se canceló (OL-391): un evento que ya pasó cuenta como realizado salvo que quien lo gestiona (o la administración) lo marque así desde su ficha en pasado. Marcado, se queda en el historial de su artista y de su lugar, tachado, y no cuenta.';
