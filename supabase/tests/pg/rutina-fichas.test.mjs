import { randomUUID } from "node:crypto";

// OL-489 · «Completar fichas» (migración 20261029250000): la corrida `fichas`, la propuesta `ficha` con su `campo` (y solo ella lo lleva),
// aceptarla con `aceptar_propuesta` sin crear ninguna ficha nueva, y que la ficha que completan sus campos (como los pone el servidor con la
// llave de servicio, `src/lib/rutinas/aceptarFicha.ts`) entre a la semana de Instagram (`instagram_candidatos`). Todo en una transacción que se
// deshace.
const ADMIN = randomUUID();
const CIUDAD = "ciudad-fichas-prueba";
const NOMBRE = "Ciudad Fichas Prueba";
const FOTOS = "https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos";
const DESCRIPCION = "Colectivo de teatro físico de la Ciudad Fichas Prueba que crea piezas sobre el agua y la memoria, con funciones y talleres abiertos desde 2015.";

export async function run({ as, check, expectError, query }) {
  const falla = async (accion, codigo, etiqueta) => {
    await query("savepoint antes_del_error");
    await expectError(accion, codigo, etiqueta);
    await query("rollback to savepoint antes_del_error");
  };
  const servicio = (sql, valores) => as("service_role", null, () => query(sql, valores));
  await query("begin");
  try {
    await query("insert into public.admin_correos (correo) values ('fichas-admin@local.test')");
    await query("insert into auth.users (id, email) values ($1, 'fichas-admin@local.test')", [ADMIN]);
    await query("insert into public.ciudades (slug, nombre, zona, estado) values ($1, $2, 'America/Mexico_City', 'abierta')", [CIUDAD, NOMBRE]);

    // ---------- los tipos nuevos ----------
    const corrida = (await query("insert into public.rutinas_corridas (tipo, ciudad, tope_usd, parametros) values ('fichas', $1, 0.5, '{\"horizonte_dias\": 21, \"max_fichas\": 20, \"semanal\": true}') returning id", [CIUDAD])).rows[0].id;
    check(!!corrida, "una corrida «fichas» entra, con su ciudad y su tope");
    await falla(() => query("insert into public.rutinas_corridas (tipo, ciudad, tope_usd) values ('fichas', $1, 0.5)", [CIUDAD]), "23505", "una sola «fichas» en curso por ciudad: la semanal no se duplica");
    await falla(() => query("insert into public.rutinas_corridas (tipo, ciudad, tope_usd) values ('otra', $1, 0.5)", [CIUDAD]), "23514", "un tipo de corrida que no existe no entra");

    const artista = (await servicio("insert into public.artistas (nombre, disciplina, ciudad, redes) values ('Colectivo Fichas', 'teatro', $1, $2) returning id", [NOMBRE, JSON.stringify([{ red: "instagram", url: "https://www.instagram.com/colectivofichas/" }])])).rows[0].id;
    const propuesta = async (campo, datos, tipo = "ficha") =>
      (await query("insert into public.propuestas (corrida_id, tipo, campo, fuente, datos) values ($1, $2, $3, 'Instagram de la ficha', $4) returning id", [corrida, tipo, campo, JSON.stringify({ ficha_tipo: "artista", ficha_id: artista, nombre: "Colectivo Fichas", campo, ...datos })])).rows[0].id;
    await falla(() => propuesta(null, {}), "23514", "una propuesta de ficha sin campo no entra");
    await falla(() => propuesta("telefono", {}), "23514", "un campo que no es foto, portada, descripción ni instagram no entra");
    await falla(() => propuesta("foto", {}, "lugar"), "23514", "solo una propuesta de ficha lleva campo");
    const otraVieja = (await query("insert into public.propuestas (corrida_id, tipo, fuente, datos) values ($1, 'artista', 'Prueba', '{\"nombre\": \"Sin campo\"}') returning id", [corrida])).rows[0].id;
    check(!!otraVieja, "las demás propuestas siguen sin campo");

    const foto = await propuesta("foto", { imagen: `${FOTOS}/artistas/rutina-fichas/${corrida}/a-foto.jpg`, confianza: "alta" });
    const portada = await propuesta("portada", { imagen: `${FOTOS}/artistas/rutina-fichas/${corrida}/a-portada.jpg`, confianza: "alta" });
    const descripcion = await propuesta("descripcion", { valor: DESCRIPCION, confianza: "media" });
    const porCampo = (await query("select campo from public.propuestas where tipo = 'ficha' and datos ->> 'ficha_id' = $1 order by campo", [artista])).rows.map((r) => r.campo);
    check(JSON.stringify(porCampo) === JSON.stringify(["descripcion", "foto", "portada"]), "se encuentran por ficha y campo", porCampo);
    const indice = (await query("select indexdef from pg_indexes where schemaname = 'public' and indexname = 'propuestas_ficha_campo_idx'")).rows[0]?.indexdef ?? "";
    check(/datos ->> 'ficha_id'/.test(indice) && /WHERE \(tipo = 'ficha'::text\)/.test(indice), "índice parcial por ficha y campo", indice);

    // ---------- aceptar: se marca, no crea ficha; el servidor la completa y la liga ----------
    const artistasAntes = Number((await query("select count(*) from public.artistas")).rows[0].count);
    for (const id of [foto, portada, descripcion]) {
      const r = (await as("authenticated", ADMIN, () => query("select public.aceptar_propuesta($1, '{}'::jsonb) as r", [id]))).rows[0].r;
      check(r.estado === "aceptada" && r.ficha_id === null, "aceptar una propuesta de ficha la marca sin crear nada", r);
    }
    check(Number((await query("select count(*) from public.artistas")).rows[0].count) === artistasAntes, "no nace ninguna ficha nueva");
    // Lo que hace `ponerEnFicha` con la llave de servicio: solo si el campo está vacío.
    const puestos = await servicio(
      "update public.artistas set foto = $2, portada = $3, descripcion = $4 where id = $1 and foto is null and portada is null and descripcion is null returning id",
      [artista, `${FOTOS}/artistas/${ADMIN}/foto-1.jpg`, `${FOTOS}/artistas/${ADMIN}/portada-1.jpg`, DESCRIPCION],
    );
    check(puestos.rows.length === 1, "la ficha vacía se completa");
    await servicio("update public.propuestas set ficha_id = $2 where id = any($1::uuid[]) and estado = 'aceptada' and ficha_id is null", [[foto, portada, descripcion], artista]);
    const ligadas = (await query("select count(*) from public.propuestas where ficha_id = $1 and tipo = 'ficha' and estado = 'aceptada'", [artista])).rows[0].count;
    check(Number(ligadas) === 3, "las tres quedan aceptadas y ligadas a la ficha", ligadas);
    const otra = await servicio("update public.artistas set foto = 'https://x.test/otra.jpg' where id = $1 and foto is null returning id", [artista]);
    check(otra.rows.length === 0, "lo que ya tiene no se pisa");

    // ---------- y entra a la semana de Instagram ----------
    const lunes = (await query("select (date_trunc('week', (now() at time zone 'America/Mexico_City')::date + 7))::date::text as d")).rows[0].d;
    const candidatos = (await as("authenticated", ADMIN, () => query("select id, foto, portada from public.instagram_candidatos($1, 'artista', $2::date)", [CIUDAD, lunes]))).rows;
    check(candidatos.some((c) => c.id === artista), "la ficha completa entra a instagram_candidatos", candidatos.length);
  } finally {
    await query("rollback");
  }
}
