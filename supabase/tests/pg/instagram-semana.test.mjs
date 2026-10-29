import { randomUUID } from "node:crypto";

/**
 * OL-479 (bitácora 511, migración 20261029200000): la semana de Instagram. Una publicación es de un evento, de un artista o de un lugar (exactamente
 * uno); la semana de una ciudad, un día por fila, la arma y la cambia solo la administración por sus funciones; cada día por delante espera en la
 * cola de OL-465 a su hora (el latido no lo toma antes); «Quitar», «Publicar ahora», el texto, el aviso y «Dijo que no»; quién puede salir
 * (`instagram_candidatos`); las vistas con origen a una ficha y lo que dio cada día; y la página de la bio (solo lo ya publicado).
 */
const ADMIN = randomUUID();
const OTRA = randomUUID();
const GESTORA = randomUUID();
const CIUDAD = "ciudad-semana-prueba";
const NOMBRE_CIUDAD = "Ciudad Semana Prueba";
const LARGA = "Una descripción bastante larga para la prueba de la semana de Instagram: la ficha tiene que decir algo de sí misma, al menos ciento veinte letras.";

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('semana-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'semana-admin@local.test'), ($2, 'semana-otra@local.test'), ($3, 'semana-gestora@local.test')", [ADMIN, OTRA, GESTORA]);
  await query("insert into public.ciudades (slug, nombre, zona, estado) values ($1, $2, 'America/Mexico_City', 'abierta') on conflict do nothing", [CIUDAD, NOMBRE_CIUDAD]);
  const ig = (u) => JSON.stringify([{ url: `https://www.instagram.com/${u}` }]);
  // Con la llave de servicio: las fotos de prueba no son de nuestro almacenamiento (OL-262 solo deja eso a la administración y al servidor).
  const servicio = (sql, valores) => as("service_role", null, () => query(sql, valores));
  const artista = async (nombre, o = {}) =>
    (await servicio("insert into public.artistas (nombre, disciplina, ciudad, foto, portada, descripcion, redes, creado_por) values ($1, 'musica', $2, $3, $4, $5, $6, $7) returning id",
      [nombre, o.ciudad ?? NOMBRE_CIUDAD, o.foto === undefined ? "https://x.test/f.jpg" : o.foto, "https://x.test/p.jpg", o.descripcion ?? LARGA, o.redes ?? ig(nombre.toLowerCase().replace(/[^a-z]/g, "")), o.autor ?? null])).rows[0].id;
  const A1 = await artista("Semana Uno");
  const A2 = await artista("Semana Dos");
  const A3 = await artista("Semana Tres", { ciudad: "Otra Ciudad" });
  const SIN_FOTO = await artista("Semana Sin Foto", { foto: null });
  const CORTA = await artista("Semana Corta", { descripcion: "Muy corta." });
  const SIN_IG = await artista("Semana Sin Instagram", { redes: "[]" });
  const GESTIONADA = await artista("Semana Gestionada", { autor: GESTORA });
  const L1 = (await servicio("insert into public.lugares (nombre, tipo, lat, lng, ciudad, portada, descripcion, redes) values ('Foro Semana', 'foro', 22.15, -100.97, $1, 'https://x.test/l.jpg', $2, '[]') returning id", [NOMBRE_CIUDAD, LARGA])).rows[0].id;
  const L2 = (await servicio("insert into public.lugares (nombre, tipo, lat, lng, ciudad, portada, descripcion) values ('Foro Semana Sin Portada', 'foro', 22.15, -100.97, $1, null, $2) returning id", [NOMBRE_CIUDAD, LARGA])).rows[0].id;
  // El lunes de la semana que viene (en la zona de la ciudad) y un evento de A2 ese viernes en L1.
  const lunes = (await query("select (date_trunc('week', (now() at time zone 'America/Mexico_City')::date + 7))::date::text as d")).rows[0].d;
  const viernes = (await query("select ($1::date + 4)::text as d", [lunes])).rows[0].d;
  const E1 = (await query("insert into public.eventos (lugar_id, titulo, inicio, ciudad, creado_por) values ($1, 'Concierto Semana', ($2::date + time '20:00') at time zone 'America/Mexico_City', $3, $4) returning id", [L1, viernes, NOMBRE_CIUDAD, OTRA])).rows[0].id;
  await query("insert into public.eventos_artistas (evento_id, artista_id) values ($1, $2)", [E1, A2]);
  const E2 = (await query("insert into public.eventos (lugar_id, titulo, inicio, ciudad, creado_por) values ($1, 'Taller Semana', ($2::date + time '11:00') at time zone 'America/Mexico_City', $3, $4) returning id", [L1, viernes, NOMBRE_CIUDAD, OTRA])).rows[0].id;

  const rpc = (sujeto, sql, valores) => as("authenticated", sujeto, async () => (await query(sql, valores)).rows);
  const guardar = (sujeto, casillas) => rpc(sujeto, "select public.instagram_semana_guardar($1, $2) as n", [CIUDAD, JSON.stringify(casillas)]);
  const casilla = async (fecha) => (await query("select * from public.instagram_semana where ciudad = $1 and fecha = $2", [CIUDAD, fecha])).rows[0];
  const trabajo = async (id) => (id ? (await query("select * from public.redes_trabajos where id = $1", [id])).rows[0] : null);
  const fecha = async (n) => (await query("select ($1::date + $2::int)::text as d", [lunes, n])).rows[0].d;

  try {
    // --- 1. Exactamente uno de los tres en la cola y en lo publicado; lo de antes (con su evento) sigue entrando.
    const malo = (sql, valores, etiqueta) => as("service_role", null, () => expectError(() => query(sql, valores), "23514", etiqueta));
    await malo("insert into public.redes_trabajos (red, formato) values ('instagram', '4x5')", [], "un trabajo sin evento, artista ni lugar no entra");
    await malo("insert into public.redes_trabajos (evento_id, artista_id, red, formato) values ($1, $2, 'instagram', '4x5')", [E1, A1], "un trabajo de un evento y un artista a la vez no entra");
    const deArtista = (await as("service_role", null, () => query("insert into public.redes_trabajos (artista_id, red, formato) values ($1, 'instagram', '4x5') returning id", [A1]))).rows[0].id;
    check(!!deArtista, "un trabajo de un artista entra");
    await query("delete from public.redes_trabajos where id = $1", [deArtista]);
    await malo("insert into public.instagram_publicaciones (formato, estado, media_id) values ('4x5', 'publicada', '1')", [], "una publicación sin de qué es no entra");
    const pubA = (await as("authenticated", ADMIN, () => query("insert into public.instagram_publicaciones (artista_id, formato, estado, media_id, coautores) values ($1, '4x5', 'publicada', '17900000000000479', '{semanauno}') returning id", [A3]))).rows[0].id;
    await as("authenticated", ADMIN, () => query("insert into public.facebook_publicaciones (instagram_id, formato, estado, post_id) values ($1, '4x5', 'publicada', '1_479')", [pubA]));
    const fb = (await query("select evento_id, artista_id, lugar_id from public.facebook_publicaciones where instagram_id = $1", [pubA])).rows[0];
    check(fb.artista_id === A3 && fb.evento_id === null && fb.lugar_id === null, "Facebook copia el artista de la publicación de Instagram que espeja", fb);
    await malo("insert into public.instagram_publicaciones (artista_id, formato, estado, media_id, coautores) values ($1, '4x5', 'publicada', '2', '{a,b,c,d}')", [A1], "hasta 3 coautores");

    // --- 2. Quién puede salir.
    const candidatos = (sujeto, tipo) => rpc(sujeto, "select * from public.instagram_candidatos($1, $2, $3::date)", [CIUDAD, tipo, lunes]);
    const cand = await candidatos(ADMIN, "artista");
    const ids = cand.map((c) => c.id);
    check(ids.includes(A1) && ids.includes(A2) && ids.includes(GESTIONADA), "entran los artistas con la ficha completa", cand.map((c) => c.nombre));
    check(![SIN_FOTO, CORTA, SIN_IG].some((x) => ids.includes(x)), "sin foto, con la descripción corta o sin Instagram, no entran");
    check(!ids.includes(A3), "quien salió en Instagram en los últimos 6 meses no entra");
    check(ids.indexOf(A2) < ids.indexOf(A1), "primero quien tiene fecha en los próximos 30 días", ids);
    const a2 = cand.find((c) => c.id === A2);
    check(a2.proxima_id === E1 && a2.proxima_lugar === "Foro Semana", "con su próxima fecha y su lugar", a2);
    check((await candidatos(OTRA, "artista")).length === 0, "a una cuenta cualquiera no le dice nada");
    await as("anon", null, () => expectError(() => query("select * from public.instagram_candidatos('x', 'artista', current_date)"), "42501", "un visitante no la llama"));
    const lugares = await candidatos(ADMIN, "lugar");
    const l1 = lugares.find((c) => c.id === L1);
    check(!!l1 && !lugares.some((c) => c.id === L2), "un lugar con portada y descripción entra aunque no tenga Instagram; sin portada, no", lugares.map((c) => c.nombre));
    check(l1?.eventos_semana === 2, "el lugar dice cuántos eventos tiene esa semana", l1);
    await query("update public.instagram_publicaciones set creado_en = now() - interval '7 months' where id = $1", [pubA]);
    check((await candidatos(ADMIN, "artista")).some((c) => c.id === A3), "salió hace más de 6 meses: vuelve a entrar");
    const a3 = (await candidatos(ADMIN, "artista")).find((c) => c.id === A3);
    check(a3.ciudad_slug === "otra-ciudad", "con el slug de su ciudad (la de otra ciudad va después)", a3);

    // --- 3. Armar la semana: solo la administración; cada día por delante espera en la cola a su hora.
    const semana = [
      { fecha: await fecha(0), tipo: "artista", hora: "19:00", artista_id: A1, motivo: "Artista sin fecha próxima." },
      { fecha: await fecha(1), tipo: "evento", hora: "09:00", evento_id: E2 },
      { fecha: await fecha(2), tipo: "lugar", hora: "19:00", lugar_id: L1 },
      { fecha: await fecha(3), tipo: "semana", hora: "09:00", eventos: [E1, E2] },
      { fecha: await fecha(4), tipo: "artista", hora: "19:00", artista_id: A2 },
      { fecha: await fecha(6), tipo: "descanso" },
    ];
    await as("authenticated", OTRA, () => expectError(() => query("select public.instagram_semana_guardar($1, '[]'::jsonb)", [CIUDAD]), "42501", "una cuenta cualquiera no arma la semana"));
    await as("anon", null, () => expectError(() => query("select public.instagram_semana_guardar($1, '[]'::jsonb)", [CIUDAD]), "42501", "un visitante tampoco"));
    check((await guardar(ADMIN, semana))[0].n === 6, "la administración guarda los seis días");
    check((await guardar(ADMIN, semana))[0].n === 0, "otra vez: los días que ya están no se tocan");
    const lun = await casilla(await fecha(0));
    const t1 = await trabajo(lun.trabajo_id);
    check(lun.estado === "programado" && lun.elegido_por === "sistema" && lun.motivo === "Artista sin fecha próxima.", "el lunes queda programado, elegido por el sistema y con su porqué", lun);
    const hora = (await query("select to_char($1::timestamptz at time zone 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') as h", [lun.programado_para])).rows[0].h;
    check(hora === `${await fecha(0)} 19:00`, "a las 7:00 pm en la hora de la ciudad", hora);
    check(t1 && t1.artista_id === A1 && t1.evento_id === null && t1.estado === "en_cola" && t1.pedido.casilla === lun.id && t1.pedido.tipo === "artista" && t1.pedido.facebook === true && t1.pedido_por === ADMIN, "su trabajo espera en la cola, del artista, con «también en Facebook»", t1);
    check(new Date(t1.siguiente_en).getTime() === new Date(lun.programado_para).getTime(), "y le toca a su hora (siguiente_en)", t1.siguiente_en);
    const jue = await casilla(await fecha(3));
    const tj = await trabajo(jue.trabajo_id);
    check(tj.evento_id === E1 && JSON.stringify(tj.pedido.eventos) === JSON.stringify([E1, E2]), "«Esta semana» va a nombre de su primer evento y lleva todos en el pedido", tj.pedido);
    const dom = await casilla(await fecha(6));
    check(dom.estado === "descanso" && !dom.trabajo_id && !dom.programado_para, "el domingo descansa: sin hora ni trabajo", dom);
    const vivos = (await query("select public.redes_vivos() as n")).rows[0].n;
    const nuestros = (await query("select count(*)::int as n from public.redes_trabajos t join public.instagram_semana s on s.trabajo_id = t.id where s.ciudad = $1 and t.siguiente_en <= now()", [CIUDAD])).rows[0].n;
    check(nuestros === 0, "ningún día de la semana que viene le toca todavía al latido", { vivos, nuestros });
    await as("service_role", null, () => expectError(() => query("insert into public.instagram_semana (ciudad, fecha, tipo, artista_id, lugar_id, hora, programado_para) values ($1, current_date - 30, 'artista', $2, $3, '19:00', now())", [CIUDAD, A1, L1]), "23514", "un día lleva solo la ficha de su tipo"));
    await as("service_role", null, () => expectError(() => query("insert into public.instagram_semana (ciudad, fecha, tipo, estado) values ($1, current_date - 31, 'descanso', 'programado')", [CIUDAD]), "23514", "un descanso no se programa"));

    // --- 4. Leer: solo la administración.
    const veAdmin = (await rpc(ADMIN, "select count(*)::int as n from public.instagram_semana where ciudad = $1", [CIUDAD]))[0].n;
    const veOtra = (await rpc(OTRA, "select count(*)::int as n from public.instagram_semana", []))[0].n;
    check(veAdmin === 6 && veOtra === 0, "la administración ve la semana; una cuenta cualquiera no", { veAdmin, veOtra });
    await as("anon", null, () => expectError(() => query("select count(*) from public.instagram_semana"), "42501", "un visitante no la lee"));
    const escribe = await as("authenticated", ADMIN, async () => {
      try {
        return (await query("update public.instagram_semana set estado = 'quitado' returning id")).rowCount;
      } catch (e) {
        return e.code;
      }
    });
    check(escribe === "42501", "ni la administración la escribe directo (solo por sus funciones)", escribe);

    // --- 5. El texto, Cambiar, Quitar y Publicar ahora.
    check((await rpc(ADMIN, "select public.instagram_semana_texto($1, 'Mi texto', '{semanauno}', false) as r", [lun.id]))[0].r === true, "lo cambiado en la hoja queda en su trabajo en espera");
    const conTexto = (await trabajo(lun.trabajo_id)).pedido;
    check(conTexto.texto === "Mi texto" && JSON.stringify(conTexto.quitadas) === '["semanauno"]' && conTexto.facebook === false && conTexto.casilla === lun.id, "con el texto, la cuenta quitada y sin Facebook en el pedido", conTexto);
    await as("authenticated", OTRA, () => expectError(() => query("select public.instagram_semana_texto($1, 'x')", [lun.id]), "42501", "una cuenta cualquiera no cambia el texto"));
    const cambiado = (await rpc(ADMIN, "select public.instagram_semana_cambiar($1, 'artista', $2, 'Cambiado a mano') as r", [lun.id, GESTIONADA]))[0].r;
    const lun2 = await casilla(await fecha(0));
    const t2 = await trabajo(cambiado);
    check(cambiado === lun.trabajo_id && lun2.artista_id === GESTIONADA && lun2.elegido_por === "persona", "«Cambiar» pone otra ficha y usa el mismo trabajo (nunca dos para el mismo día)", lun2);
    check(t2.artista_id === GESTIONADA && t2.pedido.texto === undefined && t2.pedido.casilla === lun.id, "el trabajo cambia de artista y pierde el texto del anterior", t2.pedido);
    await as("authenticated", ADMIN, () => expectError(() => query("select public.instagram_semana_cambiar($1, 'lugar', $2, 'x')", [lun.id, L1]), "22023", "un día de artista no se cambia por un lugar"));
    await as("authenticated", OTRA, () => expectError(() => query("select public.instagram_semana_cambiar($1, 'artista', $2, 'x')", [lun.id, A1]), "42501", "una cuenta cualquiera no cambia nada"));
    // El domingo que descansa puede llevar un lugar (a las 7:00 pm).
    const domLugar = (await rpc(ADMIN, "select public.instagram_semana_cambiar($1, 'lugar', $2, 'Un lugar más') as r", [dom.id, L1]))[0].r;
    const dom2 = await casilla(await fecha(6));
    check(dom2.tipo === "lugar" && dom2.estado === "programado" && !!domLugar && dom2.hora === "19:00:00", "«Poner un lugar este domingo»: el descanso pasa a lugar a las 7:00 pm", dom2);
    check((await rpc(ADMIN, "select public.instagram_semana_quitar($1) as r", [dom.id]))[0].r === true, "«Quitar de la semana»");
    const dom3 = await casilla(await fecha(6));
    check(dom3.estado === "quitado" && !dom3.trabajo_id && !(await trabajo(domLugar)), "quitado: su trabajo sale de la cola", dom3);
    const ahora = (await rpc(ADMIN, "select public.instagram_semana_ahora($1, '{\"texto\":\"Ya\",\"facebook\":false}') as r", [dom.id]))[0].r;
    const ta = await trabajo(ahora);
    check(ta && new Date(ta.siguiente_en) <= new Date() && ta.pedido.texto === "Ya" && ta.pedido.facebook === false && ta.pedido.casilla === dom.id, "«Publicar ahora» lo vuelve a la cola para ya, con lo de la hoja", ta?.pedido);
    check((await casilla(await fecha(6))).estado === "programado", "y el día vuelve a programado");
    // Ya publicándose: no se cambia, no se quita ni se vuelve a mandar.
    await query("update public.redes_trabajos set estado = 'publicando', turno = turno + 1 where id = $1", [ahora]);
    await as("authenticated", ADMIN, () => expectError(() => query("select public.instagram_semana_quitar($1)", [dom.id]), "55000", "lo que se está publicando no se quita"));
    await as("authenticated", ADMIN, () => expectError(() => query("select public.instagram_semana_ahora($1, '{}'::jsonb)", [dom.id]), "55000", "ni se manda otra vez"));
    await as("authenticated", ADMIN, () => expectError(() => query("select public.instagram_semana_cambiar($1, 'lugar', $2, 'x')", [dom.id, L1]), "55000", "ni se cambia"));

    // --- 6. El aviso y «Dijo que no».
    const vie = await casilla(await fecha(4));
    const cuando = (await rpc(ADMIN, "select public.instagram_semana_avisado($1) as r", [vie.id]))[0].r;
    check(!!cuando && !!(await casilla(await fecha(4))).aviso_en, "«Copiar y abrir su Instagram» anota cuándo se avisó");
    const nombre = (await rpc(ADMIN, "select public.instagram_semana_dijo_no($1) as r", [vie.id]))[0].r;
    const vie2 = await casilla(await fecha(4));
    check(nombre === "Semana Dos" && !!vie2.dijo_no_en && !vie2.trabajo_id && !(await trabajo(vie.trabajo_id)), "«Dijo que no»: dice quién, y el día suelta su trabajo", vie2);
    const fuera = (await rpc(ADMIN, "select artista_id from public.instagram_fuera where artista_id = $1", [A2]));
    check(fuera.length === 1, "la ficha queda fuera de Instagram");
    check(!(await candidatos(ADMIN, "artista")).some((c) => c.id === A2), "y ya no es candidata");
    await as("authenticated", ADMIN, () => expectError(() => query("select public.instagram_semana_cambiar($1, 'artista', $2, 'x')", [vie.id, A2]), "22023", "ni se puede poner a mano"));
    await rpc(ADMIN, "select public.instagram_semana_cambiar($1, 'artista', $2, 'Siguiente', 'Semana Dos') as r", [vie.id, A3]);
    const vie3 = await casilla(await fecha(4));
    check(vie3.artista_id === A3 && vie3.reemplaza === "Semana Dos" && !vie3.dijo_no_en && !vie3.aviso_en && !!vie3.trabajo_id, "el siguiente toma el día (con el nombre de quien dijo que no)", vie3);
    check((await rpc(OTRA, "select count(*)::int as n from public.instagram_fuera", []))[0].n === 0, "una cuenta cualquiera no ve quién está fuera");
    await as("anon", null, () => expectError(() => query("select count(*) from public.instagram_fuera"), "42501", "un visitante tampoco"));
    await as("authenticated", ADMIN, () => query("delete from public.instagram_fuera where artista_id = $1", [A2]));
    check((await candidatos(ADMIN, "artista")).some((c) => c.id === A2), "«Volver a poner»: vuelve a ser candidata");
    const ocupado = (await rpc(ADMIN, "select ocupado_en::text as d from public.instagram_candidatos($1, 'artista', $2::date) where id = $3", [CIUDAD, lunes, A3]))[0]?.d;
    check(ocupado === (await fecha(4)), "quien ya tiene un día lo dice (ocupado_en)", ocupado);

    // --- 7. Las vistas con origen a una ficha y lo que dio un día publicado.
    const contar = (tipo, id, visitante, usuario, origen = "instagram", medio = "bio") =>
      as("service_role", null, async () => (await query("select public.contar_vista_ficha($1, $2, $3, $4, $5, $6) as r", [tipo, id, visitante, usuario, origen, medio])).rows[0].r);
    check((await contar("artista", A1, "visitante-anonimo-0001", null)) === true, "una vista con origen cuenta");
    check((await contar("artista", A1, "visitante-anonimo-0001", null)) === false, "la segunda del mismo día, no");
    check((await contar("artista", A1, OTRA, OTRA)) === true, "con cuenta, también");
    check((await contar("artista", A1, ADMIN, ADMIN)) === false, "la administración no cuenta");
    check((await contar("artista", GESTIONADA, GESTORA, GESTORA)) === false, "quien gestiona la ficha no cuenta");
    check((await contar("artista", A1, "visitante-anonimo-0002", null, "tiktok")) === false, "sin un origen nuestro no cuenta");
    check((await contar("lugar", L1, "visitante-anonimo-0003", null, "facebook", "post")) === true, "la ficha de un lugar, igual");
    await as("authenticated", ADMIN, () => expectError(() => query("select public.contar_vista_ficha('artista', $1, 'visitante-anonimo-0009', null, 'instagram', 'bio')", [A1]), "42501", "nadie cuenta vistas desde la app"));
    await as("anon", null, () => expectError(() => query("select count(*) from public.vistas_ficha"), "42501", "nadie lee las vistas"));
    // El día del artista A1 (otro día ya pasado, publicado): 2 visitas; OTRA visitó y luego dio «Voy» a un evento suyo.
    const pasado = (await as("service_role", null, () => query("insert into public.instagram_semana (ciudad, fecha, tipo, artista_id, hora, programado_para, estado) values ($1, (now() at time zone 'America/Mexico_City')::date, 'artista', $2, '00:00', now() - interval '1 hour', 'publicado') returning id", [CIUDAD, A1]))).rows[0].id;
    const E3 = (await query("insert into public.eventos (lugar_id, titulo, inicio, ciudad, creado_por) values ($1, 'Fecha de Uno', now() + interval '3 days', $2, $3) returning id", [L1, NOMBRE_CIUDAD, GESTORA])).rows[0].id;
    await query("insert into public.eventos_artistas (evento_id, artista_id) values ($1, $2)", [E3, A1]);
    await as("authenticated", OTRA, () => query("insert into public.asistencias (usuario_id, evento_id, estado) values ($1, $2, 'voy')", [OTRA, E3]));
    await as("authenticated", GESTORA, () => query("insert into public.asistencias (usuario_id, evento_id, estado) values ($1, $2, 'voy')", [GESTORA, E3]));
    const res = await rpc(ADMIN, "select * from public.instagram_resultado($1::uuid[])", [[pasado, lun.id]]);
    check(res.length === 1 && res[0].casilla === pasado && res[0].visitas === 2 && res[0].van === 1, "lo que dio: 2 visitas desde Instagram y 1 que fue después de verla (quien no la visitó no cuenta)", res);
    check((await rpc(OTRA, "select * from public.instagram_resultado($1::uuid[])", [[pasado]])).length === 0, "a una cuenta cualquiera no le dice nada");

    // --- 8. La página de la bio: solo lo ya publicado de esa semana.
    const bio = await as("anon", null, async () => (await query("select * from public.instagram_semana_bio($1, (now() at time zone 'America/Mexico_City')::date)", [CIUDAD])).rows);
    check(bio.length === 1 && bio[0].nombre === "Semana Uno" && bio[0].tipo === "artista", "la página de la bio enseña lo publicado de la semana, a cualquiera", bio);
    const bioViene = await as("anon", null, async () => (await query("select * from public.instagram_semana_bio($1, $2::date)", [CIUDAD, lunes])).rows);
    check(bioViene.length === 0, "lo programado (todavía no sale) no se ve", bioViene);
    await query("update public.artistas set visible = false where id = $1", [A1]);
    check((await as("anon", null, async () => (await query("select * from public.instagram_semana_bio($1, (now() at time zone 'America/Mexico_City')::date)", [CIUDAD])).rows)).length === 0, "una ficha oculta no sale");

    // --- 9. Las funciones: definer, search_path vacío, sin visitantes (salvo la de la bio).
    const { rows: f } = await query(`select proname, prosecdef, proconfig, has_function_privilege('anon', oid, 'execute') as anon,
        has_function_privilege('authenticated', oid, 'execute') as auth from pg_proc
      where pronamespace = 'public'::regnamespace and proname in ('instagram_candidatos', 'instagram_semana_guardar', 'instagram_semana_cambiar', 'instagram_semana_quitar',
        'instagram_semana_ahora', 'instagram_semana_texto', 'instagram_semana_avisado', 'instagram_semana_dijo_no', 'instagram_resultado', 'instagram_semana_encolar',
        'instagram_semana_cerrada', 'contar_vista_ficha', 'instagram_semana_bio', 'instagram_fuera_registro')`);
    check(f.length === 14 && f.every((x) => x.prosecdef && x.proconfig?.includes('search_path=""')), "todas definer y con search_path vacío", f);
    check(f.filter((x) => x.anon).map((x) => x.proname).join() === "instagram_semana_bio", "solo la de la bio la puede llamar un visitante", f.filter((x) => x.anon));
    check(f.filter((x) => ["instagram_semana_encolar", "instagram_semana_cerrada", "contar_vista_ficha", "instagram_fuera_registro"].includes(x.proname)).every((x) => !x.auth), "las internas no las llama nadie desde la app");
  } finally {
    // Se limpia lo de esta prueba (los bancos comparten la base).
    await query("delete from public.instagram_semana where ciudad = $1", [CIUDAD]);
    await query("delete from public.instagram_fuera where artista_id in ($1, $2, $3, $4)", [A1, A2, A3, GESTIONADA]);
    await query("delete from public.eventos where lugar_id = $1", [L1]);
    await query("delete from public.artistas where id = any($1::uuid[])", [[A1, A2, A3, SIN_FOTO, CORTA, SIN_IG, GESTIONADA]]);
    await query("delete from public.lugares where id in ($1, $2)", [L1, L2]);
    await query("delete from public.ciudades where slug = $1", [CIUDAD]);
  }
}
