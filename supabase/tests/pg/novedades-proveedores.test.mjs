// OL-181 (doc docs/rediseno/44-novedades-artista.md §2/§3), fase 2 acotada a Vimeo, SoundCloud, Bandcamp y
// Mixcloud (migración 20260925130000_novedades_proveedores.sql). Se suma a supabase/tests/pg/novedades-artista.
// test.mjs (que ya prueba RLS y el tope con 'youtube', sin tocar): aquí solo lo nuevo de esta pieza — la lista
// blanca de proveedores ampliada, spotify rechazado, y el check de `embed_id`.
const F = "00000000-0000-4000-8000-0000000fb001"; // fundador, administrador
const L = "00000000-0000-4000-8000-0000000fb002"; // Luis, autor del artista
const AR = "00000000-0000-4000-8000-0000000fb011"; // artista de Luis

const INSERTA = `insert into public.novedades_artista (artista_id, url, proveedor, embed_id, publicado_por)
  values ($1, $2, $3, $4, $5) returning id, proveedor, embed_id`;

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('novedades-proveedores-admin@local.test')");
  await query(
    `insert into auth.users (id, email, email_confirmed_at) values
      ($1, 'novedades-proveedores-admin@local.test', now()),
      ($2, 'novedades-proveedores-luis@local.test', now())`,
    [F, L],
  );
  await query("insert into public.artistas (id, nombre, creado_por) values ($1, 'Trío de Luis (novedades OL-181)', $2)", [AR, L]);

  // ---------- lista blanca ampliada: entran los cinco proveedores de esta pieza ----------
  const casos = [
    ["vimeo", "https://vimeo.com/123456789", null],
    ["soundcloud", "https://soundcloud.com/anareyes/set-de-otono", null],
    ["mixcloud", "https://www.mixcloud.com/anareyes/set-de-otono/", null],
    ["bandcamp", "https://anareyes.bandcamp.com/album/nuevo-disco", "album=1234567890"],
  ];
  for (const [proveedor, url, embedId] of casos) {
    const r = await as("authenticated", L, () => query(INSERTA, [AR, url, proveedor, embedId, L]));
    check(r.rowCount === 1 && r.rows[0].proveedor === proveedor, `${proveedor} entra en la lista blanca de esta pieza`);
  }
  // Limpia lo insertado arriba: el resto de esta prueba inserta más filas para el mismo artista, y el tope diario
  // (5 por artista y por día, migración de la fase 1) no es parte de lo que prueba esta pieza.
  await query("delete from public.novedades_artista where artista_id = $1", [AR]);

  // ---------- lo que no entró en esta pieza sigue fuera ----------
  await expectError(
    () => query(INSERTA, [AR, "https://open.spotify.com/track/abc123", "spotify", null, L]),
    "23514",
    "spotify no está en la lista blanca de esta pieza (doc 44 §2, solo lo firmado)",
  );
  await as("authenticated", L, () =>
    expectError(
      () => query(INSERTA, [AR, "https://open.spotify.com/track/abc123", "spotify", null, L]),
      "23514",
      "spotify se rechaza también con sesión de quien gestiona la ficha",
    ),
  );

  // ---------- embed_id: solo la forma "album=123" / "track=123", o null ----------
  await expectError(
    () => query(INSERTA, [AR, "https://anareyes.bandcamp.com/track/otra-cancion", "bandcamp", "no-es-un-id", L]),
    "23514",
    "un embed_id mal formado se rechaza",
  );
  await expectError(
    () => query(INSERTA, [AR, "https://anareyes.bandcamp.com/track/otra-cancion", "bandcamp", "album=abc", L]),
    "23514",
    "un embed_id con letras en vez de dígitos se rechaza",
  );
  const embedCorto = await as("authenticated", L, () => query(INSERTA, [AR, "https://anareyes.bandcamp.com/track/otra-cancion", "bandcamp", "album=12", L]));
  check(embedCorto.rowCount === 1 && embedCorto.rows[0].embed_id === "album=12", "embed_id = 'album=12' (un id corto, pero con la forma correcta) se acepta");

  const sinEmbed = await as("authenticated", L, () => query(INSERTA, [AR, "https://vimeo.com/987654321", "vimeo", null, L]));
  check(sinEmbed.rowCount === 1 && sinEmbed.rows[0].embed_id === null, "un proveedor que no es Bandcamp guarda embed_id null");

  // Deja limpio lo insertado en esta pieza, para no interferir con otros bancos que comparten esta base.
  await query("delete from public.novedades_artista where artista_id = $1", [AR]);
}
