import { randomUUID } from "node:crypto";

/**
 * OL-464 (bitácora 496, migración 20261028120000): el carrusel. `instagram_publicaciones` guarda cuántas imágenes llevó y, publicado, sus
 * direcciones en orden; el formato `carrusel` lleva de 2 a 10 y lo demás una. `facebook_publicaciones` toma el formato y cuántas fotos de la
 * publicación de Instagram que espeja (los pone la base). Lo de antes sigue valiendo: una publicación o una historia, una imagen.
 */
const ADMIN = randomUUID();
const AUTOR = randomUUID();
const url = (n) => `https://x.supabase.co/storage/v1/object/public/fotos/lugares/a/instagram-${n}.jpg`;
const urls = (n) => `{${Array.from({ length: n }, (_, i) => `"${url(i + 1)}"`).join(",")}}`;

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('carrusel-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'carrusel-admin@local.test'), ($2, 'carrusel-autor@local.test')", [ADMIN, AUTOR]);
  const L = (await query("insert into public.lugares (nombre, tipo, lat, lng, ciudad) values ('Foro carrusel OL-464', 'foro', 22.15, -100.97, 'Ciudad Carrusel') returning id")).rows[0].id;
  const E = (await query("insert into public.eventos (lugar_id, titulo, inicio, fin, ciudad, creado_por, clase) values ($1, 'Festival carrusel', now() + interval '2 days', now() + interval '4 days', 'Ciudad Carrusel', $2, 'festival') returning id", [L, AUTOR])).rows[0].id;
  const anotar = (sql, valores = []) => as("authenticated", ADMIN, async () => (await query(sql, [E, ...valores])).rows[0]);

  // --- Lo de antes: una publicación sin decir cuántas es de una imagen.
  const una = await anotar("insert into public.instagram_publicaciones (evento_id, formato, estado, media_id) values ($1, '4x5', 'publicada', '17900000000000001') returning imagenes, carrusel");
  check(una.imagenes === 1 && una.carrusel === null, "una publicación de siempre lleva una imagen y sin carrusel", una);
  const historia = await anotar("insert into public.instagram_publicaciones (evento_id, formato, estado, media_id) values ($1, '9x16', 'publicada', '17900000000000002') returning imagenes");
  check(historia.imagenes === 1, "una historia, una imagen", historia);

  // --- Un carrusel publicado: cuántas y sus direcciones en orden.
  const carrusel = await anotar(`insert into public.instagram_publicaciones (evento_id, formato, estado, media_id, imagen, imagenes, carrusel, etiquetas) values ($1, 'carrusel', 'publicada', '17900000000000464', $2, 5, '${urls(5)}', '{aether,organiza}') returning id, imagenes, carrusel`, [url(1)]);
  check(carrusel.imagenes === 5 && carrusel.carrusel.length === 5 && carrusel.carrusel[0] === url(1) && carrusel.carrusel[4] === url(5), "el carrusel guarda cuántas imágenes y sus direcciones en orden", carrusel);
  const diez = await anotar(`insert into public.instagram_publicaciones (evento_id, formato, estado, media_id, imagenes, carrusel) values ($1, 'carrusel', 'publicada', '17900000000000465', 10, '${urls(10)}') returning imagenes`);
  check(diez.imagenes === 10, "un carrusel de 10 entra", diez);
  const error = await anotar("insert into public.instagram_publicaciones (evento_id, formato, estado, error, imagenes) values ($1, 'carrusel', 'error', 'imagen', 4) returning formato, imagenes, carrusel");
  check(error.formato === "carrusel" && error.imagenes === 4 && error.carrusel === null, "un carrusel que falló se anota con cuántas iba y sin direcciones", error);

  const malo = (sql, etiqueta, codigo = "23514") => as("authenticated", ADMIN, () => expectError(() => query(sql, [E]), codigo, etiqueta));
  await malo(`insert into public.instagram_publicaciones (evento_id, formato, estado, media_id, imagenes, carrusel) values ($1, 'carrusel', 'publicada', '1', 11, '${urls(10)}')`, "un carrusel de 11 no entra");
  await malo(`insert into public.instagram_publicaciones (evento_id, formato, estado, media_id, imagenes, carrusel) values ($1, 'carrusel', 'publicada', '1', 1, '{"${url(1)}"}')`, "un carrusel de una imagen no entra");
  await malo(`insert into public.instagram_publicaciones (evento_id, formato, estado, media_id, imagenes, carrusel) values ($1, 'carrusel', 'publicada', '1', 3, '${urls(4)}')`, "las direcciones son tantas como imágenes");
  await malo("insert into public.instagram_publicaciones (evento_id, formato, estado, media_id, imagenes) values ($1, 'carrusel', 'publicada', '1', 3)", "un carrusel publicado lleva sus direcciones");
  await malo(`insert into public.instagram_publicaciones (evento_id, formato, estado, media_id, imagenes, carrusel) values ($1, '4x5', 'publicada', '1', 3, '${urls(3)}')`, "una publicación de una foto no lleva tres");
  await malo(`insert into public.instagram_publicaciones (evento_id, formato, estado, media_id, carrusel) values ($1, '4x5', 'publicada', '1', '${urls(2)}')`, "una publicación de una foto no lleva direcciones de carrusel");
  await malo("insert into public.instagram_publicaciones (evento_id, formato, estado, media_id) values ($1, '1x1', 'publicada', '1')", "un formato desconocido no entra");

  // --- El espejo en Facebook: el formato y cuántas fotos, de la publicación de Instagram.
  const fb = await as("authenticated", ADMIN, async () =>
    (await query("insert into public.facebook_publicaciones (instagram_id, evento_id, formato, imagenes, estado, post_id) values ($1, $2, '4x5', 1, 'publicada', '1374817622385572_122100000000000464') returning formato, imagenes, evento_id", [carrusel.id, E])).rows[0]);
  check(fb.formato === "carrusel" && fb.imagenes === 5 && fb.evento_id === E, "el espejo de un carrusel es un carrusel con sus mismas fotos (lo pone la base)", fb);
  const igUna = await anotar("insert into public.instagram_publicaciones (evento_id, formato, estado, media_id) values ($1, '4x5', 'publicada', '17900000000000003') returning id");
  const fbUna = await as("authenticated", ADMIN, async () =>
    (await query("insert into public.facebook_publicaciones (instagram_id, evento_id, formato, imagenes, estado, post_id) values ($1, $2, 'carrusel', 7, 'publicada', '1_2') returning formato, imagenes", [igUna.id, E])).rows[0]);
  check(fbUna.formato === "4x5" && fbUna.imagenes === 1, "el espejo de una foto es una foto, diga lo que diga quien anota", fbUna);

  // --- Lo de OL-458 sigue: nadie cambia lo anotado y la portada lo cuenta.
  const cambio = await as("authenticated", ADMIN, async () => {
    try {
      return (await query("update public.instagram_publicaciones set imagenes = 2 returning id")).rowCount;
    } catch (e) {
      return e.code;
    }
  });
  check(cambio === "42501", "lo publicado no se cambia (tampoco cuántas imágenes)", cambio);
}
