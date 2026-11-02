import { randomUUID } from "node:crypto";

/**
 * OL-505 (bitácora 538, migración 20261029320000): con «Repisa» la tarjeta del artista lleva solo su foto de perfil y la del lugar sale con su
 * portada (L2) o sin ella (L1, el arco con el símbolo SN). Así la semana de Instagram pide menos material:
 *   · un artista con fecha, su foto propia y sin portada es candidato y no sale en «Falta material»;
 *   · un lugar sin portada es candidato, y ningún lugar sale en «Falta material» por su portada (ni sin ella ni con una de otra página);
 *   · la portada que le falte a un artista sin foto va en `otros`, como opcional;
 *   · «Cambiar» un día a ese artista o a ese lugar se puede.
 */
const ADMIN = randomUUID();
const CIUDAD = "ciudad-solo-foto-prueba";
const NOMBRE_CIUDAD = "Ciudad Solo Foto Prueba";
const MX = "America/Mexico_City";
const FOTOS = "https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos/";
const AJENA = "https://otra-pagina.test/portada.jpg";
const LARGA = "Una descripción bastante larga para la prueba de Repisa: la ficha tiene que decir algo de sí misma, al menos ciento veinte letras, como siempre.";

export async function run({ as, check, query }) {
  const uno = async (sql, valores) => (await query(sql, valores)).rows[0];
  await query("insert into public.admin_correos (correo) values ('solo-foto-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'solo-foto-admin@local.test')", [ADMIN]);
  await query("insert into public.ciudades (slug, nombre, zona, estado) values ($1, $2, $3, 'abierta') on conflict do nothing", [CIUDAD, NOMBRE_CIUDAD, MX]);
  const servicio = (sql, valores) => as("service_role", null, () => query(sql, valores));
  const artista = async (nombre, foto, portada) =>
    (await servicio("insert into public.artistas (nombre, disciplina, ciudad, foto, portada, descripcion, redes) values ($1, 'musica', $2, $3, $4, $5, $6) returning id",
      [nombre, NOMBRE_CIUDAD, foto, portada, LARGA, JSON.stringify([{ url: `https://www.instagram.com/${nombre.toLowerCase().replace(/[^a-z]/g, "")}` }])])).rows[0].id;
  const lugar = async (nombre, portada) =>
    (await servicio("insert into public.lugares (nombre, tipo, lat, lng, ciudad, portada, descripcion, redes) values ($1, 'foro', 22.15, -100.97, $2, $3, $4, '[]') returning id", [nombre, NOMBRE_CIUDAD, portada, LARGA])).rows[0].id;

  const SOLO_FOTO = await artista("Solo Foto Repisa", `${FOTOS}f.jpg`, null);
  const SIN_FOTO = await artista("Sin Foto Repisa", null, null);
  const L_SIN = await lugar("Foro Repisa Sin Portada", null);
  const L_AJENA = await lugar("Foro Repisa Portada Ajena", AJENA);
  const L_CON = await lugar("Foro Repisa Con Portada", `${FOTOS}l.jpg`);

  const hoy = (await uno("select (now() at time zone $1)::date::text as d", [MX])).d;
  const lunes = (await uno("select date_trunc('week', $1::date)::date::text as d", [hoy])).d;
  const siguiente = (await uno("select ($1::date + 7)::text as d", [lunes])).d;
  const inicio = (await uno("select (($1::date + 2 + time '20:00') at time zone $2)::text as t", [siguiente, MX])).t;
  const eventos = [];
  for (const l of [L_SIN, L_AJENA, L_CON]) eventos.push((await uno("insert into public.eventos (lugar_id, titulo, inicio, ciudad, creado_por, imagen) values ($1, 'Concierto Repisa', $2::timestamptz, $3, $4, $5) returning id", [l, inicio, NOMBRE_CIUDAD, ADMIN, `${FOTOS}c.jpg`])).id);
  for (const a of [SOLO_FOTO, SIN_FOTO]) await query("insert into public.eventos_artistas (evento_id, artista_id) values ($1, $2)", [eventos[0], a]);

  const rpc = (sql, valores) => as("authenticated", ADMIN, async () => (await query(sql, valores)).rows);
  const candidatos = async (tipo) => (await rpc("select id from public.instagram_candidatos($1, $2, $3::date)", [CIUDAD, tipo, siguiente])).map((x) => x.id);
  try {
    const artistas = await candidatos("artista");
    check(artistas.includes(SOLO_FOTO), "un artista con su foto y sin portada es candidato", artistas);
    check(!artistas.includes(SIN_FOTO), "sin foto, no");
    const lugares = await candidatos("lugar");
    check(lugares.includes(L_SIN) && lugares.includes(L_AJENA) && lugares.includes(L_CON), "un lugar es candidato sin portada, con una de otra página o con la suya", lugares);

    const falta = await rpc("select tipo, id, falta, otros from public.instagram_falta_material($1, $2::date)", [CIUDAD, siguiente]);
    check(!falta.some((f) => f.tipo === "lugar"), "«Falta material» no lista lugares por su portada", falta);
    check(!falta.some((f) => f.id === SOLO_FOTO), "ni al artista que ya tiene su foto");
    const sinFoto = falta.find((f) => f.id === SIN_FOTO);
    check(sinFoto?.falta.join() === "foto" && sinFoto.otros.join() === "portada", "al que no tiene foto le falta la foto; la portada va como opcional", sinFoto);

    // «Cambiar» un día de artista a quien solo tiene su foto, y uno de lugar al que no tiene portada.
    const dia = (await uno("select ($1::date + 1)::text as d", [siguiente])).d;
    const otroDia = (await uno("select ($1::date + 1)::text as d", [dia])).d;
    await rpc("select public.instagram_semana_guardar($1, $2) as n", [CIUDAD, JSON.stringify([{ fecha: dia, tipo: "artista", hora: "19:00", artista_id: SIN_FOTO, motivo: "x" }, { fecha: otroDia, tipo: "lugar", hora: "19:00", lugar_id: L_CON, motivo: "x" }])]);
    const casilla = async (fecha) => (await uno("select id from public.instagram_semana where ciudad = $1 and fecha = $2", [CIUDAD, fecha])).id;
    await rpc("select public.instagram_semana_cambiar($1, 'artista', $2, 'x')", [await casilla(dia), SOLO_FOTO]);
    await rpc("select public.instagram_semana_cambiar($1, 'lugar', $2, 'x')", [await casilla(otroDia), L_SIN]);
    const puestos = (await query("select artista_id, lugar_id from public.instagram_semana where ciudad = $1 order by fecha", [CIUDAD])).rows;
    check(puestos[0]?.artista_id === SOLO_FOTO && puestos[1]?.lugar_id === L_SIN, "«Cambiar» pone al artista sin portada y al lugar sin portada", puestos);
  } finally {
    await query("delete from public.instagram_semana where ciudad = $1", [CIUDAD]);
    await query("delete from public.redes_trabajos where lugar_id = any($1::uuid[]) or artista_id = any($2::uuid[])", [[L_SIN, L_AJENA, L_CON], [SOLO_FOTO, SIN_FOTO]]);
  }
}
