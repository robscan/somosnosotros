-- somosnosotros · OL-181 (doc docs/rediseno/44-novedades-artista.md §2/§3), fase 2 del doc acotada a Vimeo,
-- SoundCloud, Bandcamp y Mixcloud (founder, 2026-09-24: «los enlaces de artistas solo aceptan youtube, necesito
-- que funcione con bandcamp y soundcloud, además de vimeo»; Mixcloud entra porque el founder lo nombró en el
-- pedido original del doc 44 y es el mismo mecanismo que SoundCloud, por regex). Spotify, Deezer y el resto del
-- doc 44 quedan fuera de esta pieza. Solo cambia la lista blanca de `proveedor` y añade `embed_id` (solo lo usa
-- Bandcamp: su id numérico no está en la URL pública, se resuelve con su oEmbed al publicar, `lib/incrustado.ts`).

alter table public.novedades_artista drop constraint if exists novedades_artista_proveedor_check;
alter table public.novedades_artista add constraint novedades_artista_proveedor_check
  check (proveedor in ('youtube', 'vimeo', 'soundcloud', 'bandcamp', 'mixcloud'));
comment on column public.novedades_artista.proveedor is 'Lista blanca de esta fase (doc 44 §2, OL-181): youtube, vimeo, soundcloud, bandcamp, mixcloud. Spotify, Deezer y el resto del doc 44 quedan fuera.';

alter table public.novedades_artista add column embed_id text
  check (embed_id is null or embed_id ~ '^(album|track)=[0-9]+$');
comment on column public.novedades_artista.embed_id is 'Solo para Bandcamp: el id que devuelve su oEmbed al publicar ("album=123" o "track=123"), porque no está en la URL pública. Null en el resto de proveedores, que arman su src en cada visita a partir de la URL.';
