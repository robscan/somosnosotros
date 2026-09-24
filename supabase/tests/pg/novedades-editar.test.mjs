// OL-185 (bitácora 220), doc docs/rediseno/44-novedades-artista.md §6 cambiado por el founder el 2026-09-24:
// «crea opción de editar publicaciones de artista, para borrar o corregir subidas.» (migración
// 20260925140000_novedades_editar.sql). Se suma a supabase/tests/pg/novedades-artista.test.mjs (RLS de alta,
// lectura, ocultar y borrar, sin tocar) y a novedades-proveedores.test.mjs (lista blanca y embed_id, sin tocar):
// aquí solo lo nuevo de esta pieza — quién puede corregir una novedad ya publicada y qué campos no se pueden
// tocar aunque quien edite gestione la ficha.
const F = "00000000-0000-4000-8000-0000000fc001"; // fundador, administrador
const L = "00000000-0000-4000-8000-0000000fc002"; // Luis, autor del artista
const C = "00000000-0000-4000-8000-0000000fc003"; // Carla, cuenta ligada (Soy yo / es mi grupo)
const A = "00000000-0000-4000-8000-0000000fc004"; // Ana, sin relación con nada
const AR = "00000000-0000-4000-8000-0000000fc011"; // artista de Luis, ligado también a Carla
const AR_OTRO = "00000000-0000-4000-8000-0000000fc012"; // otro artista, del fundador

const INSERTA = `insert into public.novedades_artista (artista_id, url, proveedor, titulo, texto, publicado_por)
  values ($1, $2, $3, $4, $5, $6) returning id`;
const ACTUALIZA = `update public.novedades_artista
  set titulo = $2, texto = $3, url = $4, proveedor = $5, embed_id = $6
  where id = $1
  returning id, titulo, texto, url, proveedor, embed_id`;

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('novedades-editar-admin@local.test')");
  await query(
    `insert into auth.users (id, email, email_confirmed_at) values
      ($1, 'novedades-editar-admin@local.test', now()),
      ($2, 'novedades-editar-luis@local.test', now()),
      ($3, 'novedades-editar-carla@local.test', now()),
      ($4, 'novedades-editar-ana@local.test', now())`,
    [F, L, C, A],
  );
  await query("insert into public.artistas (id, nombre, creado_por) values ($1, 'Trío de Luis (novedades OL-185)', $2), ($3, 'Otro artista de novedades OL-185', $4)", [AR, L, AR_OTRO, F]);
  await query("insert into public.artistas_cuentas (artista_id, perfil_id) values ($1, $2)", [AR, C]);

  const n1 = (await query(INSERTA, [AR, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "Original", "Texto original", L])).rows[0].id;
  const n2 = (await query(INSERTA, [AR, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "Otra", "Otro texto", C])).rows[0].id;

  // ---------- edita quien gestiona la ficha: el autor corrige enlace, título y texto ----------
  const editaAutor = await as("authenticated", L, () => query(ACTUALIZA, [n1, "Corregido", "Texto corregido", "https://vimeo.com/123456789", "vimeo", null]));
  check(
    editaAutor.rowCount === 1 &&
      editaAutor.rows[0].titulo === "Corregido" &&
      editaAutor.rows[0].texto === "Texto corregido" &&
      editaAutor.rows[0].url === "https://vimeo.com/123456789" &&
      editaAutor.rows[0].proveedor === "vimeo" &&
      editaAutor.rows[0].embed_id === null,
    "el autor de la ficha edita título, texto, url y proveedor de su propia novedad",
  );

  // ---------- la cuenta ligada también gestiona la ficha: edita aunque no la haya publicado ella ----------
  const editaLigada = await as("authenticated", C, () => query(ACTUALIZA, [n1, "De Carla", "Texto de Carla", "https://vimeo.com/123456789", "vimeo", null]));
  check(editaLigada.rowCount === 1 && editaLigada.rows[0].titulo === "De Carla", "la cuenta ligada edita una novedad aunque la haya publicado el autor");

  // ---------- quien no gestiona la ficha no edita: la fila no se le muestra para el update, sin error ----------
  const editaAna = await as("authenticated", A, () => query(ACTUALIZA, [n1, "De Ana", "Texto de Ana", "https://vimeo.com/123456789", "vimeo", null]));
  check(editaAna.rowCount === 0, "Ana, sin relación con el artista, no edita: 0 filas, sin reventar");
  const sigueDeCarla = await query("select titulo from public.novedades_artista where id = $1", [n1]);
  check(sigueDeCarla.rows[0].titulo === "De Carla", "el intento de Ana no cambió nada");

  // ---------- visible: solo la administración lo cambia, aunque quien gestiona ya pueda editar el resto ----------
  await as("authenticated", L, () =>
    expectError(
      () => query("update public.novedades_artista set visible = false where id = $1", [n1]),
      "23514",
      "el autor no puede ocultar su propia novedad con el nuevo permiso de editar",
    ),
  );
  await as("authenticated", C, () =>
    expectError(
      () => query("update public.novedades_artista set visible = false where id = $1", [n1]),
      "23514",
      "tampoco la cuenta ligada",
    ),
  );
  const ocultaAdmin = await as("authenticated", F, () => query("update public.novedades_artista set visible = false where id = $1 returning visible", [n1]));
  check(ocultaAdmin.rowCount === 1 && ocultaAdmin.rows[0].visible === false, "la administración sí cambia visible");
  await as("authenticated", F, () => query("update public.novedades_artista set visible = true where id = $1", [n1]));

  // ---------- artista_id, publicado_por y creado_en no cambian nunca, ni la administración ----------
  await as("authenticated", L, () =>
    expectError(
      () => query("update public.novedades_artista set artista_id = $2 where id = $1", [n1, AR_OTRO]),
      "23514",
      "el autor no puede mover su novedad a otro artista",
    ),
  );
  await as("authenticated", F, () =>
    expectError(
      () => query("update public.novedades_artista set artista_id = $2 where id = $1", [n1, AR_OTRO]),
      "23514",
      "ni la administración: artista_id no cambia nunca",
    ),
  );
  await as("authenticated", L, () =>
    expectError(() => query("update public.novedades_artista set publicado_por = $2 where id = $1", [n1, C]), "23514", "publicado_por tampoco cambia"),
  );
  await as("authenticated", F, () =>
    expectError(() => query("update public.novedades_artista set creado_en = now() where id = $1", [n1]), "23514", "ni creado_en, ni por la administración"),
  );

  // ---------- borrar: quien gestiona la ficha o admin (ya firmado en OL-175, se repite aquí por el encargo) ----------
  const borraAna = await as("authenticated", A, () => query("delete from public.novedades_artista where id = $1 returning id", [n2]));
  check(borraAna.rowCount === 0, "Ana, sin relación, no borra");
  const borraAutor = await as("authenticated", L, () => query("delete from public.novedades_artista where id = $1 returning id", [n1]));
  check(borraAutor.rowCount === 1, "el autor de la ficha borra su novedad");
  const borraLigada = await as("authenticated", C, () => query("delete from public.novedades_artista where id = $1 returning id", [n2]));
  check(borraLigada.rowCount === 1, "la cuenta ligada también borra");

  // Deja limpio lo insertado en esta pieza, para no interferir con otros bancos que comparten esta misma base.
  await query("delete from public.novedades_artista where artista_id in ($1, $2)", [AR, AR_OTRO]);
}
