import { randomUUID } from "node:crypto";

// OL-323 (bitácora 352): las sugerencias al publicar. Lo anotado para no insistir, publicar la exposición de una inauguración (H1, H2) o
// ligarla a una ya publicada, y relacionar dos actos con su festival (H4) o con uno propio que ya existe (H5): cada una en una sola operación
// (todo o nada) y reintentable. Zona: America/Mexico_City (UTC−6).
const AUTORA = randomUUID();
const OTRA = randomUUID();

const base = {
  titulo: "Inauguración de Ecos de papel", inicio: "2030-11-06T01:00:00Z", fin: null,
  lugar_id: null, sitio_texto: "Museo de sugerencias", sitio_lat: 22.15, sitio_lng: -100.98,
  sitio_reservado: false, sitio_revelar_desde: null, ciudad: "San Luis Potosí",
  zona: "America/Mexico_City", descripcion: "Inauguración el jueves a las 7", imagen: null, precio: "$50", enlace: "https://ejemplo.mx/ecos",
};

export async function run({ as, check, expectError, query }) {
  await query("insert into auth.users (id, email) values ($1, 'sugerencias-autora@local.test'), ($2, 'sugerencias-otra@local.test')", [AUTORA, OTRA]);
  await query("update public.avisos_config set capturar = true, corte = clock_timestamp()");
  const json = (v) => (v === null ? null : JSON.stringify(v));
  const alta = (quien, datos, artistas = []) =>
    as("authenticated", quien, async () => (await query("select public.guardar_evento_con_avisos(null, $1::jsonb, null, $2::jsonb, null, $3::uuid) as r", [json(datos), json(artistas), randomUUID()])).rows[0].r.id);
  const fila = async (id) => (await query("select * from public.eventos where id = $1", [id])).rows[0];
  const cuantos = async () => Number((await query("select count(*) as n from public.eventos")).rows[0].n);
  const llamar = (quien, sql, args) => as("authenticated", quien, async () => (await query(sql, args)).rows[0].r);
  const exponer = (quien, inaug, op, { titulo = "Ecos de papel", inicio = "2030-11-06T06:00:00Z", fin = "2030-12-01T05:59:00Z", horario = null } = {}) =>
    llamar(quien, "select public.publicar_exposicion_de_inauguracion($1::uuid, $2, $3::timestamptz, $4::timestamptz, $5::jsonb, $6::uuid) as r", [inaug, titulo, inicio, fin, json(horario), op]);
  const anotar = (quien, evento, tipo, estado, clave = null) => as("authenticated", quien, () => query("select public.anotar_sugerencia($1::uuid, $2, $3, $4)", [evento, tipo, estado, clave]));

  // --- Lo anotado: descartada se guarda; una aceptada no se vuelve descartada; solo quien gestiona el evento.
  const suelto = await alta(AUTORA, { ...base, titulo: "Concierto de Trío Bruma" });
  check(JSON.stringify((await fila(suelto)).sugerencias) === "{}", "un evento nace sin nada anotado");
  await anotar(AUTORA, suelto, "festival", "descartada", "festival umbral|2030");
  check((await fila(suelto)).sugerencias.festival?.estado === "descartada" && (await fila(suelto)).sugerencias.festival?.clave === "festival umbral|2030", "la sugerencia descartada queda anotada con su clave");
  await anotar(AUTORA, suelto, "exposicion", "aceptada");
  await anotar(AUTORA, suelto, "exposicion", "descartada");
  check((await fila(suelto)).sugerencias.exposicion?.estado === "aceptada", "salir tras aceptar no la vuelve descartada");
  await expectError(() => anotar(OTRA, suelto, "festival", "descartada"), "42501", "otra cuenta no anota en un evento ajeno");
  await expectError(() => anotar(AUTORA, suelto, "otra", "descartada"), "22023", "solo exposición o festival");
  await as("anon", null, () => expectError(() => query("select public.anotar_sugerencia($1::uuid, 'festival', 'descartada')", [suelto]), "42501", "anon no anota"));

  // --- H1: la exposición de una inauguración ya publicada, ligada, con el mismo sitio, cartel, enlace y quién; sin la hora ni el precio.
  const inaug = await alta(AUTORA, base, [{ nombre: "Lucía Montaño Sugerencias", tipo: "solista" }]);
  const op = randomUUID();
  const horario = [{ dias: [2, 3, 4, 5, 6], abre: "10:00", cierra: "18:00" }];
  const expo = await exponer(AUTORA, inaug, op, { horario });
  const x = await fila(expo.id);
  check(x.clase === "exposicion" && x.inaugura_id === inaug && x.visible && x.creado_por === AUTORA, "la exposición nace ligada a su inauguración", x && { clase: x.clase, inaugura_id: x.inaugura_id });
  check(x.titulo === "Ecos de papel" && x.sitio_texto === "Museo de sugerencias" && x.enlace === base.enlace && x.ciudad === base.ciudad, "con el mismo sitio y enlace, y su propio nombre");
  check(new Date(x.inicio).toISOString() === "2030-11-06T06:00:00.000Z" && new Date(x.fin).toISOString() === "2030-12-01T05:59:00.000Z", "con su periodo de visita, no la hora de la ceremonia");
  check(x.precio === null && x.descripcion === null, "no hereda el precio ni la descripción de la inauguración");
  const artistas = (await query("select a.nombre from public.eventos_artistas ea join public.artistas a on a.id = ea.artista_id where ea.evento_id = $1", [expo.id])).rows.map((r) => r.nombre);
  check(artistas.join() === "Lucía Montaño Sugerencias", "quién expone: los mismos de la inauguración", artistas);
  const franjas = (await query("select abre::text as abre from public.eventos_horarios where evento_id = $1", [expo.id])).rows;
  check(franjas.length === 1 && franjas[0].abre === "10:00:00", "el horario propio, si llega, en franjas");
  check((await fila(inaug)).sugerencias.exposicion?.estado === "aceptada", "la sugerencia queda aceptada en la inauguración");
  check((await query("select 1 from public.avisos_origen where evento_id = $1", [expo.id])).rowCount === 1, "se publica con sus avisos, como cualquier alta");

  const nAntes = await cuantos();
  const otraVez = await exponer(AUTORA, inaug, op);
  check(otraVez.repetido === true && otraVez.id === expo.id && (await cuantos()) === nAntes, "un reintento con la misma clave no publica otra");
  await expectError(() => exponer(AUTORA, inaug, randomUUID()), "23505", "una inauguración abre una sola exposición");

  // Lo que no se puede, y sin dejar nada a medias.
  const inaug2 = await alta(AUTORA, { ...base, titulo: "Inauguración de Pliegues" });
  const n2 = await cuantos();
  await expectError(() => exponer(OTRA, inaug2, randomUUID()), "42501", "otra cuenta no publica la exposición de una inauguración ajena");
  await expectError(() => exponer(AUTORA, inaug2, randomUUID(), { titulo: "  " }), "22023", "sin nombre no hay exposición");
  await expectError(() => exponer(AUTORA, inaug2, randomUUID(), { fin: "2030-11-01T00:00:00Z" }), "22023", "un periodo al revés no se publica");
  await expectError(() => exponer(AUTORA, inaug2, randomUUID(), { horario: [{ dias: "martes", abre: "10:00", cierra: "18:00" }] }), "22023", "un horario mal formado rechaza todo");
  check((await cuantos()) === n2 && !(await fila(inaug2)).sugerencias.exposicion, "los rechazos no dejan exposición ni anotación (todo o nada)");
  await expectError(() => exponer(AUTORA, expo.id, randomUUID()), "23514", "una exposición no inaugura otra");
  await as("anon", null, () => expectError(() => query("select public.publicar_exposicion_de_inauguracion($1::uuid, 'X', now(), now() + interval '1 day', null, $2::uuid)", [inaug2, randomUUID()]), "42501", "anon no publica"));

  // --- Ligar a una exposición ya publicada (H1/H2 con la exposición existente).
  const yaPublicada = (await llamar(AUTORA, "select public.guardar_evento_con_clase(null, $1::jsonb, null, '[]'::jsonb, null, $2::jsonb, null, $3::uuid) as r", [json({ ...base, titulo: "Pliegues", inicio: "2030-11-07T06:00:00Z", fin: "2030-11-30T05:59:00Z" }), json({ clase: "exposicion" }), randomUUID()])).id;
  const ligada = await llamar(AUTORA, "select public.ligar_inauguracion($1::uuid, $2::uuid) as r", [yaPublicada, inaug2]);
  check(ligada.id === yaPublicada && (await fila(yaPublicada)).inaugura_id === inaug2 && (await fila(inaug2)).sugerencias.exposicion?.estado === "aceptada", "ligar pone la inauguración y la anota aceptada");
  check((await llamar(AUTORA, "select public.ligar_inauguracion($1::uuid, $2::uuid) as r", [yaPublicada, inaug2])).repetido === true, "ligar otra vez no cambia nada");
  const inaug3 = await alta(AUTORA, { ...base, titulo: "Inauguración de otra cosa" });
  await expectError(() => llamar(AUTORA, "select public.ligar_inauguracion($1::uuid, $2::uuid) as r", [yaPublicada, inaug3]), "23505", "una exposición con su inauguración no se pisa");
  const ajena = (await llamar(OTRA, "select public.guardar_evento_con_clase(null, $1::jsonb, null, '[]'::jsonb, null, $2::jsonb, null, $3::uuid) as r", [json({ ...base, titulo: "Ajena", inicio: "2030-11-07T06:00:00Z", fin: "2030-11-30T05:59:00Z" }), json({ clase: "exposicion" }), randomUUID()])).id;
  await expectError(() => llamar(AUTORA, "select public.ligar_inauguracion($1::uuid, $2::uuid) as r", [ajena, inaug3]), "42501", "una exposición ajena no se liga");
  check(!(await fila(ajena)).inaugura_id, "y queda como estaba");

  // --- H4: dos actos distintos; un festival nuevo con el nombre de la mención y los dos dentro, en una sola operación.
  const a1 = await alta(AUTORA, { ...base, titulo: "Concierto de Trío Bruma", inicio: "2030-11-08T00:00:00Z", fin: "2030-11-08T02:00:00Z" });
  const a2 = await alta(AUTORA, { ...base, titulo: "Taller de gráfica en vivo", inicio: "2030-11-08T17:00:00Z", fin: null, sitio_texto: "Centro de prueba" });
  const opF = randomUUID();
  const relacionar = (quien, actos, marco, titulo, operacion) => llamar(quien, "select public.relacionar_en_festival($1::uuid[], $2::uuid, $3, $4::uuid) as r", [actos, marco, titulo, operacion]);
  const f = await relacionar(AUTORA, [a2, a1], null, "Festival Umbral 2030", opF);
  const marco = await fila(opF);
  check(f.id === opF && marco.clase === "festival" && marco.titulo === "Festival Umbral 2030" && marco.creado_por === AUTORA && f.actos === 2, "el festival nace con el nombre de la mención y sus dos actos", f);
  check((await fila(a1)).evento_padre_id === opF && (await fila(a2)).evento_padre_id === opF, "los dos actos quedan dentro");
  check(new Date(marco.inicio).toISOString() === "2030-11-08T00:00:00.000Z" && marco.sitio_texto === "Museo de sugerencias", "el festival toma el sitio y el inicio de su primer acto");
  check(new Date(marco.fin).toISOString() === "2030-11-09T06:00:00.000Z", "y llega al final del día del último", marco.fin);
  check((await fila(a1)).sugerencias.festival?.estado === "aceptada" && (await fila(a2)).sugerencias.festival?.estado === "aceptada", "la sugerencia queda aceptada en los dos");
  const nF = await cuantos();
  const f2 = await relacionar(AUTORA, [a2, a1], null, "Festival Umbral 2030", opF);
  check(f2.id === opF && (await cuantos()) === nF, "un reintento no crea otro festival");

  // --- H5: un tercer acto con el festival propio que ya existe.
  const a3 = await alta(AUTORA, { ...base, titulo: "Lectura de poesía", inicio: "2030-11-10T01:00:00Z", fin: null });
  const f3 = await relacionar(AUTORA, [a3], opF, null, null);
  check(f3.id === opF && f3.actos === 3 && new Date((await fila(opF)).fin).toISOString() === "2030-11-10T06:00:00.000Z", "el acto entra al festival existente y lo alarga", f3);

  // --- Lo que no se relaciona, sin dejar nada a medias.
  const deOtra = await alta(OTRA, { ...base, titulo: "Acto ajeno" });
  const a4 = await alta(AUTORA, { ...base, titulo: "Charla", inicio: "2030-11-11T01:00:00Z", fin: null });
  const nAntesF = await cuantos();
  const opRoto = randomUUID();
  await expectError(() => relacionar(AUTORA, [a4, deOtra], null, "Festival Roto 2030", opRoto), "42501", "un acto ajeno rechaza toda la relación");
  check((await cuantos()) === nAntesF && !(await fila(opRoto)) && !(await fila(a4)).evento_padre_id, "y no deja ni el festival ni el acto propio ligado (todo o nada)");
  await expectError(() => relacionar(AUTORA, [a4, opF], null, "Festival Roto 2030", randomUUID()), "23514", "un festival no es acto de otro");
  const otroMarco = randomUUID();
  await relacionar(AUTORA, [a4], null, "Festival Otro 2030", otroMarco);
  await expectError(() => relacionar(AUTORA, [a4], opF, null, null), "23514", "un acto de otro festival no se mueve aquí (eso es editar)");
  const marcoAjeno = randomUUID();
  await relacionar(OTRA, [deOtra], null, "Festival de otra 2030", marcoAjeno);
  const a5 = await alta(AUTORA, { ...base, titulo: "Cierre" });
  await expectError(() => relacionar(AUTORA, [a5], marcoAjeno, null, null), "42501", "un festival ajeno no se ofrece (sería una propuesta pendiente)");
  await expectError(() => relacionar(AUTORA, [a5], null, "", randomUUID()), "22023", "sin nombre no hay festival nuevo");
  await as("anon", null, () => expectError(() => query("select public.relacionar_en_festival($1::uuid[], null, 'X 2030', $2::uuid)", [[a5], randomUUID()]), "42501", "anon no relaciona"));

  // --- Deshacer: quitar la relación conserva las fichas.
  await as("authenticated", AUTORA, () => query("update public.eventos set evento_padre_id = null where id = $1", [a3]));
  await as("authenticated", AUTORA, () => query("select public.recalcular_festival($1::uuid)", [opF]));
  check(!!(await fila(a3)) && (await fila(a3)).evento_padre_id === null && !!(await fila(opF)), "quitar un acto del festival deja las dos fichas");
  await as("authenticated", AUTORA, () => query("update public.eventos set inaugura_id = null where id = $1", [expo.id]));
  check(!!(await fila(inaug)) && (await fila(expo.id)).inaugura_id === null, "quitar la inauguración de la exposición deja las dos fichas");
}
