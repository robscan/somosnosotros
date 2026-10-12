import { randomUUID } from "node:crypto";

// OL-384 (bitácora 415): «¿Es este?» antes de publicar un evento que ya está, como el lugar. `eventos_parecidos` devuelve los eventos visibles,
// sin pasar, puntuales o talleres, el mismo día local y en el mismo sitio (el mismo lugar o el mismo nombre de sitio normalizado) con un título
// parecido: el mismo normalizado, uno dentro del otro con el corto distintivo (OL-341), o dos palabras con contenido en común. El banco completo
// (con PGlite) está en supabase/tests/eventos_parecidos.mjs; aquí, lo esencial con el Postgres de la CI.
const ANA = randomUUID();
const BETO = randomUUID();
const ZONA = "America/Mexico_City";

export async function run({ as, check, query }) {
  await query("insert into auth.users (id, email) values ($1, 'ol384-ana@example.com'), ($2, 'ol384-beto@example.com')", [ANA, BETO]);
  const lugar = async (nombre) =>
    (await query("insert into public.lugares (nombre, tipo, lat, lng, ciudad, zona, visible, creado_por) values ($1, 'museo', 22.15, -100.97, 'San Luis Potosí', $2, true, $3) returning id", [nombre, ZONA, ANA])).rows[0].id;
  const COSSIO = await lugar("Museo Francisco Cossío OL-384");
  const TEATRO = await lugar("Teatro de la Paz OL-384");
  // Dentro de cuatro días, a una hora local de San Luis (las 19:00 de allá son la 01:00 UTC del día siguiente: cuenta el día local).
  const a = (hora, dias = 0) => `(((now() at time zone '${ZONA}')::date + ${4 + dias})::timestamp + time '${hora}') at time zone '${ZONA}'`;
  const evento = async ({ titulo, hora = "19:00", dias = 0, lugarId = COSSIO, sitio = null, clase = "puntual", visible = true, fin = null }) =>
    (await query(
      `insert into public.eventos (titulo, inicio, fin, lugar_id, sitio_texto, sitio_lat, sitio_lng, ciudad, zona, visible, clase, creado_por)
       values ($1, ${a(hora, dias)}, ${fin ? a(fin.hora, fin.dias) : "null"}, $2, $3, $4, $5, 'San Luis Potosí', $6, $7, $8, $9) returning id`,
      [titulo, lugarId, sitio, sitio ? 22.15 : null, sitio ? -100.97 : null, ZONA, visible, clase, ANA],
    )).rows[0].id;
  const e = {
    pargazz: await evento({ titulo: "Gitanos mexicanos 2.ª edición: Pargazz" }),
    concierto: await evento({ titulo: "Concierto", hora: "12:00" }),
    otroDia: await evento({ titulo: "Lectura de poesía joven", hora: "18:00", dias: 1 }),
    otroSitio: await evento({ titulo: "Lectura de poesía joven", hora: "18:00", lugarId: TEATRO }),
    aMano: await evento({ titulo: "Noche de son jarocho", hora: "21:00", lugarId: null, sitio: "museo francisco cossio ol 384" }),
    oculto: await evento({ titulo: "Cine club Buñuel", hora: "16:00", visible: false }),
    expo: await evento({ titulo: "Gitanos mexicanos: fotografía", hora: "10:00", dias: -3, clase: "exposicion", fin: { hora: "18:00", dias: 20 } }),
  };
  const parecidos = (quien, { titulo, hora = "19:00", dias = 0, lugarId = COSSIO, sitio = null, excluir = null }) =>
    as(quien ? "authenticated" : "anon", quien, async () =>
      (await query(`select id from public.eventos_parecidos($1, ${a(hora, dias)}, $2, $3, $4, $5)`, [titulo, ZONA, lugarId, sitio, excluir])).rows.map((r) => r.id),
    );

  const { rows: [f] } = await query(
    `select prosecdef, provolatile, has_function_privilege('anon', oid, 'execute') as anon, has_function_privilege('authenticated', oid, 'execute') as sesion,
      has_function_privilege('service_role', oid, 'execute') as servicio, obj_description(oid, 'pg_proc') as nota
     from pg_proc where oid = to_regprocedure('public.eventos_parecidos(text, timestamptz, text, uuid, text, uuid)')`,
  );
  check(!!f && !f.prosecdef && f.provolatile === "s" && f.anon && f.sesion && f.servicio && /OL-384/.test(f.nota ?? ""), "eventos_parecidos: invoker, stable, para anon, sesión y servicio, comentada", f);
  if (!f) return;

  let r = await parecidos(BETO, { titulo: "Pargazz: Gitanos mexicanos, 2ª Edición" });
  check(r.includes(e.pargazz), "Pargazz: el mismo concierto con las palabras en otro orden, el mismo día y lugar", r);
  check(!r.includes(e.expo), "una exposición que cubre el día no cuenta", r);
  check(!(await parecidos(BETO, { titulo: "Pargazz: Gitanos mexicanos, 2ª Edición", excluir: e.pargazz })).includes(e.pargazz), "p_excluir lo deja fuera");
  check(!(await parecidos(BETO, { titulo: "Pargazz: Gitanos mexicanos, 2ª Edición", dias: 1 })).includes(e.pargazz), "otro día: no");
  check(!(await parecidos(BETO, { titulo: "Pargazz: Gitanos mexicanos, 2ª Edición", lugarId: TEATRO })).includes(e.pargazz), "otro lugar: no");
  check((await parecidos(BETO, { titulo: "Pargazz Gitanos mexicanos", hora: "23:30" })).includes(e.pargazz), "23:30 local (otro día en UTC) sigue siendo el mismo día");
  check((await parecidos(BETO, { titulo: "Concierto", hora: "20:00" })).includes(e.concierto), "«Concierto» y «Concierto» el mismo día y sitio: sí (el mismo título)");
  check(!(await parecidos(BETO, { titulo: "Concierto de jazz", hora: "20:00" })).includes(e.concierto), "«Concierto de jazz» y «Concierto»: no");
  r = await parecidos(BETO, { titulo: "Lectura de poesía joven", hora: "18:00" });
  check(!r.includes(e.otroDia) && !r.includes(e.otroSitio), "el mismo título otro día u otro lugar: no", r);
  check((await parecidos(BETO, { titulo: "Noche de son jarocho", hora: "20:00" })).includes(e.aMano), "en el lugar del directorio encuentra el escrito a mano con su nombre");
  check((await parecidos(BETO, { titulo: "Noche de son jarocho", hora: "20:00", lugarId: null, sitio: "Casa del Poeta" })).length === 0, "escrito a mano en otro sitio: no");
  check((await parecidos(BETO, { titulo: "Noche de son jarocho", hora: "20:00", lugarId: null, sitio: "Museo Francisco Cossío OL 384" })).includes(e.aMano), "el mismo sitio escrito a mano (normalizado): sí");
  check((await parecidos(ANA, { titulo: "Cine club Buñuel", hora: "16:00" })).length === 0, "un evento oculto no sale, ni a su autora");
  check((await parecidos(null, { titulo: "Pargazz: Gitanos mexicanos, 2ª Edición" })).includes(e.pargazz), "anon la puede llamar");
}
