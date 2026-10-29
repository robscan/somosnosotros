import { randomUUID } from "node:crypto";

/**
 * OL-488 (bitácora 520, migración 20261029240000): la semana de Instagram solo publica con material. Material es la imagen que la app puede
 * dibujar en la tarjeta: la del bucket `fotos` de su Storage (`instagram_material_propio`). Quién entra (`instagram_candidatos`: un artista con
 * fecha y sin portada no sale; con foto y portada, sí), «Cambiar» sin material, «Falta material» (`instagram_falta_material`: qué falta, su
 * próxima fecha y quién lleva la ficha), «Pedírselo» (`instagram_pedir_material`: una vez por ficha y semana, cada quien lee lo suyo), «Programar»
 * y «Publicar ahora» un día sin publicación (`instagram_semana_programar`) y los permisos.
 */
const ADMIN = randomUUID();
const OTRA = randomUUID();
const GESTORA = randomUUID();
const CIUDAD = "ciudad-material-prueba";
const NOMBRE_CIUDAD = "Ciudad Material Prueba";
const MX = "America/Mexico_City";
const FOTOS = "https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos/";
const AJENA = "https://otra-pagina.test/portada.jpg";
const LARGA = "Una descripción bastante larga para la prueba del material de Instagram: la ficha tiene que decir algo de sí misma, al menos ciento veinte letras.";

export async function run({ as, check, expectError, query }) {
  const uno = async (sql, valores) => (await query(sql, valores)).rows[0];
  await query("insert into public.admin_correos (correo) values ('material-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'material-admin@local.test'), ($2, 'material-otra@local.test'), ($3, 'material-gestora@local.test')", [ADMIN, OTRA, GESTORA]);
  await query("insert into public.ciudades (slug, nombre, zona, estado) values ($1, $2, $3, 'abierta') on conflict do nothing", [CIUDAD, NOMBRE_CIUDAD, MX]);
  const servicio = (sql, valores) => as("service_role", null, () => query(sql, valores));
  const ig = (u) => JSON.stringify([{ url: `https://www.instagram.com/${u}` }]);
  const artista = async (nombre, o = {}) =>
    (await servicio("insert into public.artistas (nombre, disciplina, ciudad, foto, portada, descripcion, redes, creado_por) values ($1, 'musica', $2, $3, $4, $5, $6, $7) returning id",
      [nombre, NOMBRE_CIUDAD, o.foto === undefined ? `${FOTOS}f.jpg` : o.foto, o.portada === undefined ? `${FOTOS}p.jpg` : o.portada, LARGA, ig(nombre.toLowerCase().replace(/[^a-z]/g, "")), o.autor ?? null])).rows[0].id;
  const lugar = async (nombre, portada) =>
    (await servicio("insert into public.lugares (nombre, tipo, lat, lng, ciudad, portada, descripcion, redes) values ($1, 'foro', 22.15, -100.97, $2, $3, $4, '[]') returning id", [nombre, NOMBRE_CIUDAD, portada, LARGA])).rows[0].id;
  const COMPLETA = await artista("Material Completa");
  const SIN_PORTADA = await artista("Material Sin Portada", { portada: null, autor: GESTORA });
  const AJENO = await artista("Material Portada Ajena", { portada: AJENA });
  const SIN_FECHA = await artista("Material Sin Fecha", { portada: null });
  const DE_NADIE = await artista("Material De Nadie", { foto: null, portada: null });
  const L_OK = await lugar("Foro Material Completo", `${FOTOS}l.jpg`);
  const L_SIN = await lugar("Foro Material Sin Portada", null);
  // La cuenta que lleva el artista sin portada (cuenta ligada además de la autora).
  await query("insert into public.artistas_cuentas (artista_id, perfil_id) values ($1, $2)", [SIN_PORTADA, OTRA]);

  const hoy = (await uno("select (now() at time zone $1)::date::text as d", [MX])).d;
  const lunes = (await uno("select date_trunc('week', $1::date)::date::text as d", [hoy])).d;
  const dia = async (n) => (await uno("select ($1::date + $2::int)::text as d", [hoy, n])).d;
  const isodow = async (d) => Number((await uno("select extract(isodow from $1::date)::int as n", [d])).n);
  const enMx = async (fecha, hora) => (await uno("select (($1::date + $2::time) at time zone $3)::text as t", [fecha, hora, MX])).t;
  // Un evento en tres días con todos los de prueba (para que tengan «fecha»), en el foro completo, y otro en el foro sin portada.
  const pronto = await dia(3);
  const evento = async (titulo, lugarId, imagen, fecha = pronto) =>
    (await uno("insert into public.eventos (lugar_id, titulo, inicio, ciudad, creado_por, imagen) values ($1, $2, $3::timestamptz, $4, $5, $6) returning id", [lugarId, titulo, await enMx(fecha, "20:00"), NOMBRE_CIUDAD, OTRA, imagen])).id;
  const E1 = await evento("Concierto Material", L_OK, `${FOTOS}c1.jpg`);
  const E2 = await evento("Concierto Material Sin Cartel", L_SIN, null);
  for (const a of [COMPLETA, SIN_PORTADA, AJENO, DE_NADIE]) await query("insert into public.eventos_artistas (evento_id, artista_id) values ($1, $2)", [E1, a]);

  const rpc = (sujeto, sql, valores) => as("authenticated", sujeto, async () => (await query(sql, valores)).rows);
  const ids = async (tipo) => (await rpc(ADMIN, "select id from public.instagram_candidatos($1, $2, $3::date)", [CIUDAD, tipo, lunes])).map((x) => x.id);

  try {
    // --- 1. ¿Es material? Solo lo del bucket `fotos` de la app.
    const propio = async (url) => (await uno("select public.instagram_material_propio($1) as r", [url])).r;
    check((await propio(`${FOTOS}a/b.jpg`)) === true, "una imagen del Storage de la app es material");
    check((await propio(AJENA)) === false, "una imagen de otra página no");
    check((await propio(null)) === false && (await propio("")) === false && (await propio("   ")) === false, "vacío no es material");
    check((await propio(`${FOTOS}../x.jpg`)) === false, "una ruta que se sale del bucket, no");

    // --- 2. Quién entra: un artista con fecha y sin portada no sale; con foto y portada, sí.
    const artistas = await ids("artista");
    check(artistas.includes(COMPLETA), "el artista con fecha, foto y portada entra", artistas);
    check(!artistas.includes(SIN_PORTADA), "el artista con fecha y sin portada no sale");
    check(!artistas.includes(AJENO), "con la portada de otra página (la tarjeta saldría con el relleno), tampoco");
    check(!artistas.includes(DE_NADIE), "sin foto ni portada, tampoco");
    const lugares = await ids("lugar");
    check(lugares.includes(L_OK) && !lugares.includes(L_SIN), "el lugar con portada entra; sin portada, no", lugares);

    // --- 3. «Falta material»: los que tienen fecha y se quedan fuera, con qué falta y quién lleva la ficha.
    const falta = await rpc(ADMIN, "select tipo, id, nombre, falta, otros, proxima_titulo, lleva, lleva_nombre, pedido_en from public.instagram_falta_material($1, $2::date)", [CIUDAD, lunes]);
    const de = (id) => falta.find((f) => f.id === id);
    check(de(SIN_PORTADA)?.falta.join() === "portada" && de(SIN_PORTADA).proxima_titulo === "Concierto Material", "el artista sin portada, con lo que le falta y su próxima fecha", de(SIN_PORTADA));
    check(de(AJENO)?.falta.join() === "portada_ajena", "la portada de otra página se dice aparte (hay que subirla a la app)", de(AJENO));
    check(de(DE_NADIE)?.falta.join() === "foto,portada" && de(DE_NADIE).lleva.length === 0, "sin foto ni portada y sin nadie que lo lleve", de(DE_NADIE));
    check(de(L_SIN)?.tipo === "lugar" && de(L_SIN).falta.join() === "portada", "el lugar sin portada con fecha", de(L_SIN));
    check(!de(COMPLETA) && !de(L_OK), "los completos no salen en «Falta material»");
    check(!de(SIN_FECHA), "sin fecha en los próximos 30 días, tampoco (lo que se promociona es lo que viene)");
    const lleva = de(SIN_PORTADA)?.lleva ?? [];
    check(lleva.length === 2 && lleva.includes(OTRA) && lleva.includes(GESTORA), "lo llevan la cuenta ligada y su autora", lleva);
    check((await rpc(OTRA, "select * from public.instagram_falta_material($1, $2::date)", [CIUDAD, lunes])).length === 0, "una cuenta cualquiera no ve «Falta material»");
    const adminAutor = await artista("Material Del Admin", { portada: null, autor: ADMIN });
    await query("insert into public.eventos_artistas (evento_id, artista_id) values ($1, $2)", [E1, adminAutor]);
    const delAdmin = (await rpc(ADMIN, "select lleva from public.instagram_falta_material($1, $2::date) where id = $3", [CIUDAD, lunes, adminAutor]))[0];
    check(delAdmin?.lleva.length === 0, "lo que dio de alta la administración no cuenta como «lo lleva alguien»", delAdmin);

    // --- 4. «Pedírselo»: una vez por ficha y semana; cada quien lee lo suyo.
    const para = (await rpc(ADMIN, "select public.instagram_pedir_material('artista', $1, $2::date) as p", [SIN_PORTADA, lunes]))[0].p;
    check(para.length === 2 && para.includes(OTRA) && para.includes(GESTORA), "devuelve a quién avisar", para);
    await as("authenticated", ADMIN, () => expectError(() => query("select public.instagram_pedir_material('artista', $1, $2::date)", [SIN_PORTADA, lunes]), "23505", "la misma semana no se pide dos veces"));
    await as("authenticated", ADMIN, () => expectError(() => query("select public.instagram_pedir_material('artista', $1, $2::date)", [DE_NADIE, lunes]), "P0002", "si nadie lleva la ficha no hay a quién pedírselo"));
    await as("authenticated", ADMIN, () => expectError(() => query("select public.instagram_pedir_material('artista', $1, $2::date)", [COMPLETA, lunes]), "22023", "a quien ya tiene su material no se le pide"));
    await as("authenticated", OTRA, () => expectError(() => query("select public.instagram_pedir_material('artista', $1, $2::date)", [AJENO, lunes]), "42501", "una cuenta cualquiera no pide material"));
    const suyos = await rpc(OTRA, "select artista_id, falta, semana::text from public.instagram_material_pedidos");
    check(suyos.length === 1 && suyos[0].artista_id === SIN_PORTADA && suyos[0].falta.join() === "portada" && suyos[0].semana === lunes, "quien lleva la ficha ve su pedido (su aviso en Novedades)", suyos);
    const tercera = randomUUID();
    await query("insert into auth.users (id, email) values ($1, 'material-tercera@local.test')", [tercera]);
    check((await rpc(tercera, "select 1 from public.instagram_material_pedidos")).length === 0, "nadie más lo ve");
    check((await rpc(ADMIN, "select 1 from public.instagram_material_pedidos")).length === 2, "la administración ve los dos (uno por persona)");
    await as("authenticated", OTRA, () => expectError(() => query("insert into public.instagram_material_pedidos (artista_id, semana, usuario_id, falta) values ($1, $2::date, $3, '{portada}')", [AJENO, lunes, OTRA]), "42501", "nadie lo escribe a mano"));
    const yaPedido = (await rpc(ADMIN, "select pedido_en from public.instagram_falta_material($1, $2::date) where id = $3", [CIUDAD, lunes, SIN_PORTADA]))[0];
    check(!!yaPedido?.pedido_en, "«Falta material» dice que ya se le pidió esta semana", yaPedido);
    const siguiente = (await uno("select ($1::date + 7)::text as d", [lunes])).d;
    check((await rpc(ADMIN, "select public.instagram_pedir_material('artista', $1, $2::date) as p", [SIN_PORTADA, siguiente]))[0].p.length === 2, "la semana siguiente se puede volver a pedir");

    // --- 5. Con su portada (la sube quien la lleva o la administración) entra y sale de «Falta material».
    await servicio("update public.artistas set portada = $2 where id = $1", [SIN_PORTADA, `${FOTOS}nueva.jpg`]);
    check((await ids("artista")).includes(SIN_PORTADA), "con portada y foto, ya entra");
    check(!(await rpc(ADMIN, "select id from public.instagram_falta_material($1, $2::date)", [CIUDAD, lunes])).some((f) => f.id === SIN_PORTADA), "y ya no falta");

    // --- 6. «Cambiar» no pone a quien no tiene material.
    const libre = await dia((await isodow(await dia(1))) === 7 ? 2 : 1);
    await rpc(ADMIN, "select public.instagram_semana_guardar($1, $2) as n", [CIUDAD, JSON.stringify([{ fecha: libre, tipo: "artista", hora: "19:00", artista_id: COMPLETA, motivo: "x" }])]);
    const casillaLibre = await uno("select id from public.instagram_semana where ciudad = $1 and fecha = $2", [CIUDAD, libre]);
    await as("authenticated", ADMIN, () => expectError(() => query("select public.instagram_semana_cambiar($1, 'artista', $2, 'x')", [casillaLibre.id, AJENO]), "22023", "«Cambiar» por una ficha sin material, no"));

    // --- 7. «Programar» y «Publicar ahora» un día sin publicación.
    const programar = (sujeto, casilla, ahora) => rpc(sujeto, "select public.instagram_semana_programar($1, $2::jsonb, $3) as t", [CIUDAD, JSON.stringify(casilla), ahora]);
    const falla = (casilla, ahora, codigo, etiqueta, sujeto = ADMIN) => as("authenticated", sujeto, () => expectError(() => query("select public.instagram_semana_programar($1, $2::jsonb, $3)", [CIUDAD, JSON.stringify(casilla), ahora]), codigo, etiqueta));
    const hoyEsDomingo = (await isodow(hoy)) === 7;
    // Un día futuro que no es domingo ni el de la casilla de arriba.
    let futuro = await dia(2);
    while ((await isodow(futuro)) === 7 || futuro === libre) futuro = (await uno("select ($1::date + 1)::text as d", [futuro])).d;
    const domingo = (await uno("select ($1::date + 6)::text as d", [lunes])).d;
    await falla({ fecha: domingo, tipo: "lugar", hora: "19:00", lugar_id: L_OK }, false, "22023", "el domingo sigue descansando");
    await falla({ fecha: await dia(-1), tipo: "lugar", hora: "19:00", lugar_id: L_OK }, true, "22023", "un día que ya pasó no se publica");
    await falla({ fecha: futuro, tipo: "lugar", hora: "19:00", lugar_id: L_OK }, true, "22023", "«Publicar ahora» solo lo de hoy");
    await falla({ fecha: futuro, tipo: "lugar", hora: "19:00", lugar_id: L_SIN }, false, "22023", "un lugar sin portada no se programa");
    await falla({ fecha: futuro, tipo: "artista", hora: "19:00", artista_id: AJENO }, false, "22023", "un artista con la portada de otra página, tampoco");
    await falla({ fecha: futuro, tipo: "evento", hora: "09:00", evento_id: E2 }, false, "22023", "un evento sin cartel, tampoco");
    await falla({ fecha: futuro, tipo: "semana", hora: "09:00", eventos: [E1, E2] }, false, "22023", "«Esta semana» con un evento sin cartel, tampoco");
    await falla({ fecha: futuro, tipo: "lugar", hora: "19:00", lugar_id: L_OK }, false, "42501", "una cuenta cualquiera no programa", OTRA);
    const t1 = (await programar(ADMIN, { fecha: futuro, tipo: "lugar", hora: "19:00", lugar_id: L_OK, motivo: "Lugar con 1 evento esta semana." }, false))[0].t;
    const tr1 = await uno("select estado, siguiente_en, lugar_id, pedido_por from public.redes_trabajos where id = $1", [t1]);
    const sale = await enMx(futuro, "19:00");
    check(tr1?.estado === "en_cola" && new Date(tr1.siguiente_en).getTime() === new Date(sale).getTime() && tr1.lugar_id === L_OK && tr1.pedido_por === ADMIN, "«Programar»: el día queda en la cola a su hora, a nombre de quien lo programó", tr1);
    const c1 = await uno("select tipo, estado, trabajo_id, motivo from public.instagram_semana where ciudad = $1 and fecha = $2", [CIUDAD, futuro]);
    check(c1.tipo === "lugar" && c1.estado === "programado" && c1.trabajo_id === t1 && c1.motivo === "Lugar con 1 evento esta semana.", "y el día queda guardado como programado", c1);
    await falla({ fecha: futuro, tipo: "lugar", hora: "19:00", lugar_id: L_OK }, false, "23505", "un día que ya tiene su publicación no se pisa");
    // Un día que descansaba porque nadie tenía material: se toma.
    let otro = (await uno("select ($1::date + 1)::text as d", [futuro])).d;
    while ((await isodow(otro)) === 7 || otro === libre) otro = (await uno("select ($1::date + 1)::text as d", [otro])).d;
    await rpc(ADMIN, "select public.instagram_semana_guardar($1, $2) as n", [CIUDAD, JSON.stringify([{ fecha: otro, tipo: "descanso", motivo: "No hay lugares con la ficha completa por salir." }])]);
    const t2 = (await programar(ADMIN, { fecha: otro, tipo: "artista", hora: "19:00", artista_id: SIN_PORTADA, motivo: "Artista con fecha." }, false))[0].t;
    const c2 = await uno("select tipo, estado, artista_id, hora::text, trabajo_id from public.instagram_semana where ciudad = $1 and fecha = $2", [CIUDAD, otro]);
    check(c2.tipo === "artista" && c2.estado === "programado" && c2.artista_id === SIN_PORTADA && c2.hora === "19:00:00" && c2.trabajo_id === t2, "el día que descansaba sin material pasa a la sugerencia (el artista que ya subió su portada)", c2);
    if (hoyEsDomingo) {
      await falla({ fecha: hoy, tipo: "lugar", hora: "00:00", lugar_id: L_OK }, true, "22023", "hoy es domingo: descansa (también con «Publicar ahora»)");
    } else {
      await falla({ fecha: hoy, tipo: "evento", hora: "00:00", evento_id: E1 }, false, "22023", "hoy, con su hora ya pasada, no se programa: se publica ahora");
      const t3 = (await programar(ADMIN, { fecha: hoy, tipo: "semana", hora: "00:00", eventos: [E1], motivo: "Carrusel." }, true))[0].t;
      const tr3 = await uno("select estado, siguiente_en <= now() as ya, evento_id, pedido from public.redes_trabajos where id = $1", [t3]);
      check(tr3?.estado === "en_cola" && tr3.ya && tr3.evento_id === E1 && tr3.pedido.tipo === "semana", "«Publicar ahora» hoy: el trabajo sale ya", tr3);
    }
  } finally {
    await query("delete from public.instagram_semana where ciudad = $1", [CIUDAD]);
    await query("delete from public.redes_trabajos where lugar_id = $1 or artista_id = any($2::uuid[]) or evento_id = $3", [L_OK, [COMPLETA, SIN_PORTADA], E1]);
  }

  // --- 8. Las funciones: definer, search_path vacío, sin visitantes; las internas, sin cuentas.
  const { rows: f } = await query(`select proname, prosecdef, proconfig, has_function_privilege('anon', oid, 'execute') as anon,
      has_function_privilege('authenticated', oid, 'execute') as auth
    from pg_proc where pronamespace = 'public'::regnamespace and proname in ('instagram_falta_material', 'instagram_pedir_material', 'instagram_semana_programar', 'instagram_quien_lleva', 'instagram_material_propio')`);
  const por = Object.fromEntries(f.map((x) => [x.proname, x]));
  check(f.length === 5 && f.every((x) => x.proconfig?.includes('search_path=""') && !x.anon), "search_path vacío y sin visitantes", f);
  check(["instagram_falta_material", "instagram_pedir_material", "instagram_semana_programar", "instagram_quien_lleva"].every((n) => por[n].prosecdef), "definer las que leen o escriben por la administración");
  check(por.instagram_falta_material.auth && por.instagram_pedir_material.auth && por.instagram_semana_programar.auth && !por.instagram_quien_lleva.auth && !por.instagram_material_propio.auth, "la administración las llama con su sesión; las internas, nadie", por);
  const rls = await uno("select relrowsecurity from pg_class where oid = 'public.instagram_material_pedidos'::regclass");
  check(rls.relrowsecurity, "instagram_material_pedidos con RLS");
}
