import { randomUUID } from "node:crypto";

/**
 * OL-456 (bitácora 488, migración 20261023120000): el filtro por ciudad de Administración. Las versiones con `p_ciudad` de las listas y
 * sus cuentas dan lo mismo que las de hoy con null y solo lo de esa ciudad con un slug; la ciudad de una ficha se unifica con la tabla de
 * ciudades (Soledad y el texto vacío caen en San Luis); la de una persona es la que más se repite en lo que lleva, publicó y marcó «Voy», y
 * «Sin ciudad» si nada; solo la administración las lee.
 */
const ADMIN = randomUUID();
const ANA = randomUUID();
const BETO = randomUUID();
const NADIE = randomUUID();

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('ciudad-admin@local.test')");
  await query(
    "insert into auth.users (id, email) values ($1, 'ciudad-admin@local.test'), ($2, 'ciudad-ana@local.test'), ($3, 'ciudad-beto@local.test'), ($4, 'ciudad-nadie@local.test')",
    [ADMIN, ANA, BETO, NADIE],
  );
  await query("insert into public.ciudades (slug, nombre, alias, estado) values ('ciudad-de-mexico-ol456', 'Ciudad de México OL456', array['CDMX OL456'], 'abierta') on conflict (slug) do nothing");
  const lugar = async (nombre, ciudad, autor = ADMIN) => (await query("insert into public.lugares (nombre, tipo, lat, lng, ciudad, creado_por) values ($1, 'foro', 19.43, -99.13, $2, $3) returning id", [nombre, ciudad, autor])).rows[0].id;
  const L1 = await lugar("Foro Uno OL456", "Ciudad de México OL456", ANA);
  const L2 = await lugar("Foro Dos OL456", "CDMX OL456");
  const L3 = await lugar("Foro Tres OL456", "Soledad de Graciano Sánchez");
  const L4 = await lugar("Foro Cuatro OL456", "");
  await query("update public.lugares set visible = false where id = $1", [L2]);
  const A1 = (await query("insert into public.artistas (nombre, disciplina, ciudad) values ('Trío OL456', 'musica', 'Ciudad de México OL456') returning id")).rows[0].id;
  await query("insert into public.artistas_cuentas (artista_id, perfil_id) values ($1, $2)", [A1, BETO]);
  // Beto lleva un artista de la Ciudad de México, pero dijo «Voy» a dos eventos de San Luis: su ciudad es San Luis.
  const evento = async (titulo, lugarId, ciudad) => (await query("insert into public.eventos (titulo, inicio, fin, lugar_id, ciudad, zona, creado_por) values ($1, now() + interval '2 days', now() + interval '2 days 2 hours', $2, $3, 'America/Mexico_City', $4) returning id", [titulo, lugarId, ciudad, ADMIN])).rows[0].id;
  const E1 = await evento("Concierto Uno OL456", L3, "San Luis Potosí");
  const E2 = await evento("Concierto Dos OL456", L3, "San Luis Potosí");
  const E3 = await evento("Concierto Tres OL456", L1, "Ciudad de México OL456");
  await query("insert into public.asistencias (usuario_id, evento_id, estado) values ($1, $2, 'voy'), ($1, $3, 'voy'), ($1, $4, 'me_interesa')", [BETO, E1, E2, E3]);

  const filas = (fn, ciudad, buscar, filtro) => as("authenticated", ADMIN, async () => (await query(`select * from public.${fn}($1, $2, $3, 600, 0)`, [ciudad, buscar, filtro])).rows);
  const rpc = (quien, sql, args) => as("authenticated", quien, async () => (await query(sql, args)).rows[0]?.r);

  // --- La ciudad de una ficha.
  const slug = async (t) => rpc(ADMIN, "select public.ciudad_slug($1) as r", [t]);
  check((await slug("CDMX OL456")) === "ciudad-de-mexico-ol456", "un alias da el slug de su ciudad");
  check((await slug("ciudad de méxico ol456")) === "ciudad-de-mexico-ol456", "el nombre, sin acentos ni mayúsculas, da el slug de su ciudad");
  check((await slug("Soledad de Graciano Sánchez")) === "san-luis-potosi", "Soledad es San Luis Potosí");
  check((await slug("")) === "san-luis-potosi", "sin ciudad, San Luis Potosí (como la app)");
  check((await slug("Monterrey OL456")) === "monterrey-ol456", "una ciudad que no está en la tabla da el slug de su texto");

  // --- Las listas: null es todas (igual que las de hoy); con slug, solo esa ciudad.
  const nombres = (r) => r.map((x) => x.nombre ?? x.titulo).filter((n) => /OL456/.test(n)).sort();
  const hoy = await as("authenticated", ADMIN, async () => (await query("select * from public.panel_lugares($1, $2, 600, 0)", ["OL456", "todos"])).rows);
  const todas = await filas("panel_lugares", null, "OL456", "todos");
  check(JSON.stringify(nombres(todas)) === JSON.stringify(nombres(hoy)), "con null, la lista nueva da lo mismo que la de hoy", nombres(todas));
  const cdmx = await filas("panel_lugares", "ciudad-de-mexico-ol456", "OL456", "todos");
  check(JSON.stringify(nombres(cdmx)) === JSON.stringify(["Foro Dos OL456", "Foro Uno OL456"]), "en la Ciudad de México, su nombre y su alias (también el oculto)", nombres(cdmx));
  check(cdmx.every((x) => Number(x.total) === 2), "el total es el de la ciudad");
  const slp = await filas("panel_lugares", "san-luis-potosi", "OL456", "todos");
  check(JSON.stringify(nombres(slp)) === JSON.stringify(["Foro Cuatro OL456", "Foro Tres OL456"]), "en San Luis, Soledad y el que no dice ciudad", nombres(slp));
  check(nombres(await filas("panel_lugares", "ciudad-de-mexico-ol456", "OL456", "ocultos")).join() === "Foro Dos OL456", "el filtro se suma a la ciudad");
  check(nombres(await filas("panel_eventos", "ciudad-de-mexico-ol456", "OL456", "proximos")).join() === "Concierto Tres OL456", "los eventos, por su ciudad");
  check(nombres(await filas("panel_artistas", "ciudad-de-mexico-ol456", "OL456", "todos")).join() === "Trío OL456", "los artistas, por su ciudad");
  check((await filas("panel_artistas", "san-luis-potosi", "Trío OL456", "todos")).length === 0, "y no salen en otra");

  // --- Las cuentas de los filtros, en una ciudad.
  const conteos = await rpc(ADMIN, "select public.panel_fichas_conteos('lugares', 'ciudad-de-mexico-ol456') as r", []);
  check(conteos.todos >= 2 && conteos.ocultos >= 1, "las cuentas de Lugares en la Ciudad de México", conteos);
  const conteosHoy = await rpc(ADMIN, "select public.panel_fichas_conteos('eventos') as r", []);
  const conteosTodas = await rpc(ADMIN, "select public.panel_fichas_conteos('eventos', null) as r", []);
  check(JSON.stringify(conteosHoy) === JSON.stringify(conteosTodas), "con null, las cuentas nuevas son las de hoy", [conteosHoy, conteosTodas]);

  // --- La ciudad de una persona.
  const ciudadDe = (id) => query("select public.ciudad_de_persona($1) as r", [id]).then((r) => r.rows[0].r);
  check((await ciudadDe(BETO)) === "san-luis-potosi", "Beto: dos «Voy» en San Luis pesan más que un artista en la Ciudad de México (y «Me interesa» no cuenta)");
  check((await ciudadDe(ANA)) === "ciudad-de-mexico-ol456", "Ana: publicó un lugar en la Ciudad de México");
  check((await ciudadDe(NADIE)) === null, "quien no tiene nada no tiene ciudad");
  await as("authenticated", ANA, () => expectError(() => query("select public.ciudad_de_persona($1)", [BETO]), "42501", "una cuenta cualquiera no puede leer la ciudad de otra persona"));
  const personas = async (ciudad) => (await filas("panel_personas", ciudad, "ciudad-", "todas")).map((p) => p.id);
  check((await personas("sin")).includes(NADIE) && !(await personas("sin")).includes(BETO), "«Sin ciudad»: solo quien no tiene nada");
  check((await personas("ciudad-de-mexico-ol456")).includes(ANA) && !(await personas("ciudad-de-mexico-ol456")).includes(BETO), "en la Ciudad de México, Ana y no Beto (cuenta en una sola)");
  const sin = await rpc(ADMIN, "select public.panel_personas_conteos('sin') as r", []);
  check(sin.todas >= 1, "las cuentas de Personas sin ciudad", sin);

  // --- La hoja de ciudades.
  const hoja = await as("authenticated", ADMIN, async () => (await query("select * from public.panel_ciudades_de('lugares')")).rows);
  const fila = hoja.find((c) => c.slug === "ciudad-de-mexico-ol456");
  check(fila?.nombre === "Ciudad de México OL456" && Number(fila.n) === 2, "la hoja trae la ciudad con el nombre de la tabla y su cuenta", fila);
  check(hoja.every((c, i) => i === 0 || Number(hoja[i - 1].n) >= Number(c.n)), "de la que más tiene a la que menos");
  const hojaPersonas = await as("authenticated", ADMIN, async () => (await query("select * from public.panel_ciudades_de('personas')")).rows);
  check(hojaPersonas.at(-1)?.slug === "sin" && hojaPersonas.at(-1)?.nombre === "Sin ciudad", "en Personas, «Sin ciudad» va al final", hojaPersonas.at(-1));

  // --- Los destacados de una sección, en una ciudad.
  const enCiudad = await as("authenticated", ADMIN, async () => (await query("select * from public.panel_en_ciudad('lugares', 'ciudad-de-mexico-ol456', $1)", [[L1, L3, L4]])).rows.map((r) => Object.values(r)[0]));
  check(enCiudad.length === 1 && enCiudad[0] === L1, "de unos lugares, los de la ciudad", enCiudad);

  // --- Solo la administración.
  check((await as("authenticated", ANA, async () => (await query("select * from public.panel_lugares($1, null, 'todos', 600, 0)", ["ciudad-de-mexico-ol456"])).rows)).length === 0, "una cuenta cualquiera no lee la lista");
  check((await as("authenticated", ANA, async () => (await query("select * from public.panel_ciudades_de('personas')")).rows)).length === 0, "ni la hoja de ciudades");
  check((await rpc(ANA, "select public.panel_personas_conteos(null) as r", [])) === null, "ni las cuentas de Personas");
  await as("anon", null, () => expectError(() => query("select * from public.panel_ciudades_de('lugares')"), "42501", "un visitante no puede llamar a la hoja"));
}
