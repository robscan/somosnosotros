// OL-175 (código de OL-171, doc docs/rediseno/44-novedades-artista.md) · novedades del artista, fase 1: modelo,
// migración y alta con YouTube (migración 20260925100000_novedades_artista.sql). Contrato mínimo: publica quien
// gestiona la ficha (autor, cuenta ligada o admin, gestiona_artista ya existente), siempre con su propia cuenta
// como publicado_por, nunca la de otra persona; ve lo visible cualquiera, lo oculto solo quien gestiona o admin;
// solo la administración cambia visible; borra quien gestiona la ficha o admin (decisión de esta pieza, doc 44
// §4/§8, bitácora 210); el tope de 5 por artista y por día rechaza la sexta, por artista (no global) y sin contar
// lo de ayer; la llave de servicio no la topa la RLS.
const F = "00000000-0000-4000-8000-0000000fa001"; // fundador, administrador
const L = "00000000-0000-4000-8000-0000000fa002"; // Luis, autor del artista
const C = "00000000-0000-4000-8000-0000000fa003"; // Carla, cuenta ligada (Soy yo / es mi grupo)
const A = "00000000-0000-4000-8000-0000000fa004"; // Ana, sin relación con nada
const AR_LUIS = "00000000-0000-4000-8000-0000000fa011"; // artista de Luis, ligado también a Carla
const AR_OTRO = "00000000-0000-4000-8000-0000000fa012"; // otro artista, del fundador, para el tope por artista

const INSERTA = `insert into public.novedades_artista (artista_id, url, proveedor, titulo, texto, publicado_por)
  values ($1, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', $2, $3, $4) returning id, visible`;

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('novedades-artista-admin@local.test')");
  await query(
    `insert into auth.users (id, email, email_confirmed_at) values
      ($1, 'novedades-artista-admin@local.test', now()),
      ($2, 'novedades-artista-luis@local.test', now()),
      ($3, 'novedades-artista-carla@local.test', now()),
      ($4, 'novedades-artista-ana@local.test', now())`,
    [F, L, C, A],
  );
  await query("insert into public.artistas (id, nombre, creado_por) values ($1, 'Trío de Luis (novedades OL-175)', $2), ($3, 'Otro artista de novedades OL-175', $4)", [AR_LUIS, L, AR_OTRO, F]);
  await query("insert into public.artistas_cuentas (artista_id, perfil_id) values ($1, $2)", [AR_LUIS, C]);

  // ---------- publica quien gestiona: autor, cuenta ligada, admin ----------
  const deLuis = await as("authenticated", L, () => query(INSERTA, [AR_LUIS, "Nuevo sencillo", "Grabado en vivo", L]));
  check(deLuis.rowCount === 1 && deLuis.rows[0].visible === true, "el autor publica una novedad, visible de entrada");

  const deCarla = await as("authenticated", C, () => query(INSERTA, [AR_LUIS, null, null, C]));
  check(deCarla.rowCount === 1, "la cuenta ligada (Soy yo / es mi grupo) también publica, sin título ni texto");
  const idDeCarla = deCarla.rows[0]?.id;

  const deAdmin = await as("authenticated", F, () => query(INSERTA, [AR_LUIS, null, null, F]));
  check(deAdmin.rowCount === 1, "la administración también publica");

  // ---------- publicado_por siempre es quien manda la sesión, nunca otra cuenta ----------
  await as("authenticated", L, () => expectError(
    () => query(INSERTA, [AR_LUIS, null, null, C]),
    "42501",
    "Luis no publica a nombre de Carla (publicado_por tiene que ser auth.uid())",
  ));

  // ---------- quien no gestiona la ficha no publica; tampoco sin sesión ----------
  await as("authenticated", A, () => expectError(() => query(INSERTA, [AR_LUIS, null, null, A]), "42501", "Ana, sin relación con el artista, no publica"));
  await as("anon", null, () => expectError(() => query(INSERTA, [AR_LUIS, null, null, null]), "42501", "sin sesión, tampoco se publica"));

  // ---------- lectura: visible para cualquiera, oculto solo para quien gestiona o admin ----------
  await query("update public.novedades_artista set visible = false where id = $1", [idDeCarla]);

  const veAnonimo = await as("anon", null, () => query("select id from public.novedades_artista where artista_id = $1", [AR_LUIS]));
  check(veAnonimo.rows.every((f) => f.id !== idDeCarla) && veAnonimo.rowCount >= 2, "un visitante anónimo no ve la novedad oculta, pero sí las visibles");

  const veAna = await as("authenticated", A, () => query("select id from public.novedades_artista where artista_id = $1", [AR_LUIS]));
  check(veAna.rows.every((f) => f.id !== idDeCarla), "Ana, sin relación, tampoco ve la oculta");

  const veLuis = await as("authenticated", L, () => query("select id from public.novedades_artista where id = $1", [idDeCarla]));
  check(veLuis.rowCount === 1, "Luis, autor de la ficha, sí ve la oculta (para saber qué se ocultó)");

  const veAdmin = await as("authenticated", F, () => query("select id from public.novedades_artista where id = $1", [idDeCarla]));
  check(veAdmin.rowCount === 1, "la administración también la ve");

  // ---------- ocultar (visible = false): solo la administración ----------
  const otraVisible = (await query("select id from public.novedades_artista where artista_id = $1 and visible order by creado_en limit 1", [AR_LUIS])).rows[0].id;

  const ocultaAutor = await as("authenticated", L, () => query("update public.novedades_artista set visible = false where id = $1 returning id", [otraVisible]));
  check(ocultaAutor.rowCount === 0, "el autor no oculta su propia novedad: solo la administración");
  const ocultaLigada = await as("authenticated", C, () => query("update public.novedades_artista set visible = false where id = $1 returning id", [otraVisible]));
  check(ocultaLigada.rowCount === 0, "ni la cuenta ligada");
  const ocultaAdmin = await as("authenticated", F, () => query("update public.novedades_artista set visible = false where id = $1 returning id", [otraVisible]));
  check(ocultaAdmin.rowCount === 1, "la administración sí oculta");
  const vuelveAdmin = await as("authenticated", F, () => query("update public.novedades_artista set visible = true where id = $1 returning id", [otraVisible]));
  check(vuelveAdmin.rowCount === 1, "y la vuelve a mostrar");

  // ---------- borrar: quien gestiona la ficha o admin (decisión de esta pieza, doc 44 §4/§8) ----------
  const borraAna = await as("authenticated", A, () => query("delete from public.novedades_artista where id = $1 returning id", [idDeCarla]));
  check(borraAna.rowCount === 0, "Ana, sin relación, no borra la novedad de Carla");
  const borraAutor = await as("authenticated", L, () => query("delete from public.novedades_artista where id = $1 returning id", [idDeCarla]));
  check(borraAutor.rowCount === 1, "el autor de la ficha borra una novedad (aunque la haya publicado la cuenta ligada)");
  const borraAdmin = await as("authenticated", F, () => query("delete from public.novedades_artista where id = $1 returning id", [otraVisible]));
  check(borraAdmin.rowCount === 1, "la administración también borra");

  // ---------- tope: 5 por artista y por día ----------
  await query("delete from public.novedades_artista where artista_id in ($1, $2)", [AR_LUIS, AR_OTRO]);
  for (let i = 0; i < 5; i++) {
    const r = await as("authenticated", F, () => query(INSERTA, [AR_LUIS, null, null, F]));
    check(r.rowCount === 1, `la novedad número ${i + 1} del día entra`);
  }
  const sexta = await as("authenticated", F, () => query(INSERTA, [AR_LUIS, null, null, F]).catch((e) => e));
  check(sexta instanceof Error && sexta.code === "23514", "la sexta del mismo artista y del mismo día se rechaza (check_violation)", sexta?.message);
  check(sexta instanceof Error && sexta.message.includes("Ya publicaste 5 novedades hoy"), "el rechazo trae un mensaje llano, no un código a secas", sexta?.message);

  const otroArtista = await as("authenticated", F, () => query(INSERTA, [AR_OTRO, null, null, F]));
  check(otroArtista.rowCount === 1, "otro artista no se topa: el tope es por artista, no global");

  // Lo de ayer no cuenta para el tope de hoy.
  await query("update public.novedades_artista set creado_en = creado_en - interval '1 day' where artista_id = $1", [AR_LUIS]);
  const conElDiaNuevo = await as("authenticated", F, () => query(INSERTA, [AR_LUIS, null, null, F]));
  check(conElDiaNuevo.rowCount === 1, "con el tope de ayer movido, hoy se puede publicar de nuevo");

  // ---------- la llave de servicio no es una cuenta: la RLS no la topa (el disparador del tope sigue aplicando) ----------
  const importa = await as("service_role", null, () => query(INSERTA, [AR_OTRO, "Importada", null, null]));
  check(importa.rowCount === 1, "la llave de servicio sigue insertando (importaciones), sin publicado_por");

  // Deja el tope de AR_LUIS sin agotar, para no interferir con otros bancos que comparten esta misma base.
  await query("delete from public.novedades_artista where artista_id in ($1, $2)", [AR_LUIS, AR_OTRO]);
}
