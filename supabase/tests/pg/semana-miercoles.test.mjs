import { randomUUID } from "node:crypto";

/**
 * OL-487 (bitácora 519, migración 20261029230000): la semana de Instagram se arma sola los miércoles. Qué ciudades le tocan al latido en un
 * instante (`instagram_semana_por_armar`: miércoles de 9:00 a 9:59 en la hora de cada ciudad, abierta, con eventos la semana que viene y días por
 * armar); que `redes_vivos` las cuenta; que `instagram_semana_latido` llama las funciones de la pestaña tal cual a nombre de la administración (lo
 * mismo que contestan a la administración, lo que guarda queda «armada por el latido», solo la llave de servicio) y que la pestaña sigue
 * guardando «armada por la pestaña»; a nombre de quién (`instagram_semana_quien_arma`); y los permisos.
 */
const ADMIN = randomUUID();
const ADMIN2 = randomUUID();
const OTRA = randomUUID();
const SLP = "ciudad-miercoles-prueba";
const MADRID = "ciudad-miercoles-madrid";
const DETECTADA = "ciudad-miercoles-detectada";
const VACIA = "ciudad-miercoles-vacia";
const MX = "America/Mexico_City";
const LARGA = "Una descripción bastante larga para la prueba del miércoles de Instagram: la ficha tiene que decir algo de sí misma, al menos ciento veinte letras.";

export async function run({ as, check, expectError, query }) {
  const uno = async (sql, valores) => (await query(sql, valores)).rows[0];
  await query("insert into public.admin_correos (correo) values ('miercoles-admin@local.test'), ('miercoles-admin2@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'miercoles-admin@local.test'), ($2, 'miercoles-admin2@local.test'), ($3, 'miercoles-otra@local.test')", [ADMIN, ADMIN2, OTRA]);
  await query(
    `insert into public.ciudades (slug, nombre, zona, estado) values
      ($1, 'Ciudad Miercoles Prueba', $5, 'abierta'), ($2, 'Ciudad Miercoles Madrid', 'Europe/Madrid', 'abierta'),
      ($3, 'Ciudad Miercoles Detectada', $5, 'detectada'), ($4, 'Ciudad Miercoles Vacia', $5, 'abierta')`,
    [SLP, MADRID, DETECTADA, VACIA, MX],
  );
  // El miércoles de la semana que viene (en la hora de San Luis) y el lunes de la siguiente: «la que viene» de ese miércoles.
  const mie = (await uno("select (date_trunc('week', now() at time zone $1)::date + 9)::text as d", [MX])).d;
  const lunes = (await uno("select ($1::date + 5)::text as d", [mie])).d;
  const dia = async (n) => (await uno("select ($1::date + $2::int)::text as d", [lunes, n])).d;
  const instante = async (fecha, hora, zona = MX) => (await uno("select (($1::date + $2::time) at time zone $3)::text as t", [fecha, hora, zona])).t;
  const servicio = (sql, valores) => as("service_role", null, () => query(sql, valores));
  const lugar = async (nombre, ciudad) =>
    (await servicio("insert into public.lugares (nombre, tipo, lat, lng, ciudad, portada, descripcion, redes) values ($1, 'foro', 22.15, -100.97, $2, 'https://x.test/l.jpg', $3, '[]') returning id", [nombre, ciudad, LARGA])).rows[0].id;
  const L1 = await lugar("Foro Miercoles", "Ciudad Miercoles Prueba");
  const L2 = await lugar("Foro Miercoles Madrid", "Ciudad Miercoles Madrid");
  const L3 = await lugar("Foro Miercoles Detectada", "Ciudad Miercoles Detectada");
  const evento = async (titulo, lugarId, ciudad, inicio) =>
    (await uno("insert into public.eventos (lugar_id, titulo, inicio, ciudad, creado_por) values ($1, $2, $3::timestamptz, $4, $5) returning id", [lugarId, titulo, inicio, ciudad, OTRA])).id;
  const E1 = await evento("Concierto Miercoles", L1, "Ciudad Miercoles Prueba", await instante(await dia(2), "20:00"));
  await evento("Concierto Miercoles Madrid", L2, "Ciudad Miercoles Madrid", await instante(await dia(3), "20:00", "Europe/Madrid"));
  await evento("Concierto Miercoles Detectada", L3, "Ciudad Miercoles Detectada", await instante(await dia(3), "20:00"));

  const nuestras = (filas) => filas.filter((f) => f.ciudad.startsWith("ciudad-miercoles-"));
  const porArmar = async (ahora) =>
    nuestras((await servicio("select ciudad, zona, lunes::text as lunes from public.instagram_semana_por_armar($1::timestamptz)", [ahora])).rows);
  const ciudadesEn = async (fecha, hora, zona = MX) => (await porArmar(await instante(fecha, hora, zona))).map((f) => f.ciudad);

  // --- 1. Qué ciudades le tocan al latido, en la hora de cada una.
  const en930 = await porArmar(await instante(mie, "09:30"));
  check(en930.length === 1 && en930[0].ciudad === SLP && en930[0].lunes === lunes && en930[0].zona === MX, "miércoles 9:30 en San Luis: le toca a San Luis, con el lunes de la que viene", en930);
  check((await ciudadesEn(mie, "09:00")).join() === SLP && (await ciudadesEn(mie, "09:59")).join() === SLP, "de 9:00 a 9:59");
  check((await ciudadesEn(mie, "08:59")).length === 0, "a las 8:59, todavía no");
  check((await ciudadesEn(mie, "10:00")).length === 0, "a las 10:00, ya no");
  check((await ciudadesEn(await dia(-4), "09:30")).length === 0, "el jueves a las 9:30, no");
  check((await ciudadesEn(await dia(-6), "09:30")).length === 0, "el martes a las 9:30, no");
  check((await ciudadesEn(mie, "09:30", "Europe/Madrid")).join() === MADRID, "el miércoles a las 9:30 de Madrid le toca a Madrid (y no a San Luis, donde es de madrugada)");
  check(!en930.some((f) => f.ciudad === DETECTADA), "una ciudad que no está abierta, no");
  check(!en930.some((f) => f.ciudad === VACIA), "una ciudad sin eventos la semana que viene, no");
  for (const [rol, sujeto] of [["anon", null], ["authenticated", OTRA], ["authenticated", ADMIN]]) {
    await as(rol, sujeto, () => expectError(() => query("select * from public.instagram_semana_por_armar()"), "42501", `${rol}${sujeto === ADMIN ? " (administración)" : ""}: no pregunta qué ciudades por armar`));
  }

  // --- 2. Lo que pide el latido, a nombre de la administración: lo mismo que contesta a la administración.
  for (const [rol, sujeto] of [["anon", null], ["authenticated", OTRA], ["authenticated", ADMIN]]) {
    await as(rol, sujeto, () => expectError(() => query("select public.instagram_semana_latido('instagram_candidatos', '{}'::jsonb)"), "42501", `${rol}${sujeto === ADMIN ? " (administración)" : ""}: no llama al latido de la semana`));
  }
  await as("service_role", null, () => expectError(() => query("select public.instagram_semana_latido('instagram_semana_quitar', '{}'::jsonb)"), "42501", "solo las tres funciones de armar la semana"));
  const directo = (sql, valores) => as("authenticated", ADMIN, async () => (await query(sql, valores)).rows);
  const latido = async (fn, args) => (await as("service_role", null, () => query("select public.instagram_semana_latido($1, $2::jsonb) as r", [fn, JSON.stringify(args)]))).rows[0].r;
  for (const tipo of ["artista", "lugar"]) {
    const a = (await directo("select id from public.instagram_candidatos($1, $2, $3::date)", [SLP, tipo, lunes])).map((x) => x.id);
    const b = (await latido("instagram_candidatos", { p_ciudad: SLP, p_tipo: tipo, p_desde: lunes })).map((x) => x.id);
    if (tipo === "lugar") check(a.includes(L1), "hay candidatos para comparar (el foro de la ciudad)", a);
    check(JSON.stringify(a) === JSON.stringify(b), `los candidatos de ${tipo}: los mismos y en el mismo orden que a la administración`, { a, b });
  }
  const sa = (await directo("select id from public.instagram_sugerencias($1, 14)", [SLP])).map((x) => x.id);
  const sb = (await latido("instagram_sugerencias", { p_ciudad: SLP, p_dias: 14 })).map((x) => x.id);
  check(JSON.stringify(sa) === JSON.stringify(sb), "los eventos: los mismos y en el mismo orden", { sa, sb });
  const lugarCand = (await latido("instagram_candidatos", { p_ciudad: SLP, p_tipo: "lugar", p_desde: lunes })).find((x) => x.id === L1);
  check(lugarCand?.nombre === "Foro Miercoles" && lugarCand.eventos_semana === 1 && !("ordinality" in lugarCand), "cada candidato con sus columnas, sin la del orden", lugarCand);

  // --- 3. Guardar desde el latido: queda «armada por el latido», a nombre de la administración, y la ciudad deja de contar.
  const quien = (await uno("select public.instagram_semana_quien_arma() as u")).u;
  check(!!quien && (await uno("select rol from public.perfiles where id = $1", [quien])).rol === "admin", "se arma a nombre de una cuenta de la administración", quien);
  const semana = [
    { fecha: await dia(0), tipo: "descanso" },
    { fecha: await dia(1), tipo: "descanso" },
    { fecha: await dia(2), tipo: "evento", hora: "09:00", evento_id: E1, motivo: "El evento de ese día con más señal." },
    { fecha: await dia(3), tipo: "descanso" },
    { fecha: await dia(4), tipo: "descanso" },
    { fecha: await dia(5), tipo: "descanso" },
    { fecha: await dia(6), tipo: "descanso" },
  ];
  check((await latido("instagram_semana_guardar", { p_ciudad: SLP, p_casillas: semana })) === 7, "el latido guarda los siete días");
  const filas = (await query("select fecha::text, armada_por, actualizado_por, trabajo_id from public.instagram_semana where ciudad = $1 order by fecha", [SLP])).rows;
  check(filas.length === 7 && filas.every((f) => f.armada_por === "latido" && f.actualizado_por === quien), "los siete, armados por el latido y a nombre de la administración", filas);
  const trabajo = await uno("select t.pedido_por, t.estado, t.siguiente_en from public.redes_trabajos t join public.instagram_semana s on s.trabajo_id = t.id where s.ciudad = $1 and s.tipo = 'evento'", [SLP]);
  check(trabajo?.pedido_por === quien && trabajo.estado === "en_cola", "el día del evento espera en la cola a nombre de esa cuenta (a ella le llega el aviso)", trabajo);
  check((await latido("instagram_semana_guardar", { p_ciudad: SLP, p_casillas: semana })) === 0, "otra vuelta del latido: nada que guardar");
  check((await porArmar(await instante(mie, "09:30"))).length === 0, "con la que viene completa, San Luis ya no cuenta");
  const despues = await uno("select current_setting('request.jwt.claim.sub', true) as s");
  check(!despues.s, "después de la llamada no queda ningún sujeto puesto", despues);
  const marca = (await uno("select coalesce(current_setting('somosnosotros.armada_por', true), '') as a")).a;
  check(marca === "", "ni la marca del latido", marca);

  // --- 4. La pestaña sigue igual: «armada por la pestaña», a nombre de quien la abrió.
  const otra = [{ fecha: await dia(7), tipo: "descanso" }];
  check((await directo("select public.instagram_semana_guardar($1, $2) as n", [SLP, JSON.stringify(otra)]))[0].n === 1, "la administración guarda desde la pestaña");
  const dePestana = await uno("select armada_por, actualizado_por from public.instagram_semana where ciudad = $1 and fecha = $2", [SLP, await dia(7)]);
  check(dePestana.armada_por === "pestana" && dePestana.actualizado_por === ADMIN, "armada por la pestaña, a nombre de quien la abrió", dePestana);
  await as("service_role", null, () => expectError(() => query("insert into public.instagram_semana (ciudad, fecha, tipo, estado, armada_por) values ($1, $2, 'descanso', 'descanso', 'otro')", [SLP, mie]), "23514", "armada_por solo pestana o latido"));

  // --- 5. A nombre de quién: quien conectó Instagram; si no, quien tocó la semana por última vez.
  await query("begin");
  try {
    await query("delete from public.instagram_conexion");
    check((await uno("select public.instagram_semana_quien_arma() as u")).u === ADMIN, "sin conexión: quien tocó la semana por última vez");
    await query("insert into public.instagram_conexion (pagina_id, pagina_nombre, instagram_id, conectado_por) values ('1487', 'Página de prueba', '17841400000000487', $1)", [ADMIN2]);
    check((await uno("select public.instagram_semana_quien_arma() as u")).u === ADMIN2, "con conexión: quien conectó Instagram");
  } finally {
    await query("rollback");
  }

  // --- 6. El latido cuenta las ciudades por armar (además de los trabajos listos).
  await query("begin");
  try {
    await query("update public.redes_trabajos set estado = 'publicado', terminado_en = now() where estado in ('en_cola', 'publicando')");
    const v = await uno("select public.redes_vivos() as vivos, (select count(*)::int from public.instagram_semana_por_armar(now())) as ciudades");
    check(v.vivos === v.ciudades, "sin trabajos listos, redes_vivos son las ciudades por armar", v);
    const cuerpo = (await uno("select pg_get_functiondef('public.redes_vivos()'::regprocedure) as d")).d;
    check(cuerpo.includes("instagram_semana_por_armar(now())"), "redes_vivos mira las ciudades por armar");
  } finally {
    await query("rollback");
  }

  // --- 7. Las funciones: definer, search_path vacío, sin visitantes ni cuentas; la llave de servicio, solo lo suyo.
  const { rows: f } = await query(`select proname, prosecdef, proconfig, has_function_privilege('anon', oid, 'execute') as anon,
      has_function_privilege('authenticated', oid, 'execute') as auth, has_function_privilege('service_role', oid, 'execute') as servicio
    from pg_proc where pronamespace = 'public'::regnamespace and proname in ('instagram_semana_por_armar', 'instagram_semana_latido', 'instagram_semana_quien_arma', 'redes_vivos')`);
  check(f.length === 4 && f.every((x) => x.prosecdef && x.proconfig?.includes('search_path=""') && !x.anon && !x.auth), "definer, search_path vacío y sin visitantes ni cuentas", f);
  const servicioPuede = Object.fromEntries(f.map((x) => [x.proname, x.servicio]));
  check(servicioPuede.instagram_semana_por_armar && servicioPuede.instagram_semana_latido && !servicioPuede.instagram_semana_quien_arma && !servicioPuede.redes_vivos, "la llave de servicio llama a por_armar y al latido; quien_arma y redes_vivos son internas", servicioPuede);
}
