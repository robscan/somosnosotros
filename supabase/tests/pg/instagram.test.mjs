import { randomUUID } from "node:crypto";

/**
 * OL-458 (bitácora 490, migración 20261023140000): publicar en Instagram desde Administración. Lo publicado y las ubicaciones solo los ve y
 * escribe la administración (quién y cuándo los pone la base); `instagram_sugerencias` da solo lo que se puede publicar: por venir dentro de
 * los días pedidos, y exposiciones y festivales en curso que terminan después de hoy, o talleres con una sesión por delante; nunca lo oculto,
 * lo cancelado, lo retirado ni un borrador; con sus «Voy», «Me interesa», si está destacado y su última publicación.
 */
const ADMIN = randomUUID();
const OTRA = randomUUID();
const hora = (h) => `now() + interval '${h} hours'`;

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('ig-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'ig-admin@local.test'), ($2, 'ig-otra@local.test')", [ADMIN, OTRA]);
  const L = (await query("insert into public.lugares (nombre, tipo, lat, lng, ciudad, redes) values ('Foro IG OL-458', 'foro', 22.15, -100.97, 'Ciudad IG Prueba', '[{\"red\":\"instagram\",\"url\":\"https://www.instagram.com/foro.ig\"}]') returning id")).rows[0].id;
  const evento = async (titulo, inicioSql, finSql, extra = {}) => {
    const cols = ["lugar_id", "titulo", "inicio", "fin", "ciudad", ...Object.keys(extra)];
    const r = await query(
      `insert into public.eventos (${cols.join(", ")}) values ($1, $2, ${inicioSql}, ${finSql ?? "null"}, $3${Object.keys(extra).map((_, i) => `, $${i + 4}`).join("")}) returning id`,
      [L, titulo, "Ciudad IG Prueba", ...Object.values(extra)],
    );
    return r.rows[0].id;
  };
  const manana = await evento("IG mañana", hora(24), hora(26));
  const lejos = await evento("IG en dos semanas", hora(24 * 14), hora(24 * 14 + 2));
  const empezo = await evento("IG ya empezó", hora(-1), hora(1));
  const oculto = await evento("IG oculto", hora(30), hora(32), { visible: false });
  const cancelado = await evento("IG cancelado", hora(30), hora(32), { cancelado: true });
  const expo = await evento("IG exposición abierta", hora(-24 * 5), hora(24 * 20), { clase: "exposicion" });
  const expoUltimo = await evento("IG exposición, último día", hora(-24 * 5), "date_trunc('day', now() at time zone 'America/Mexico_City') at time zone 'America/Mexico_City' + interval '23 hours'", { clase: "exposicion" });
  const taller = await evento("IG taller con sesión", hora(-24 * 3), hora(24 * 3), { clase: "taller" });
  // Un taller lleva de 2 a 31 sesiones, cada una en su día (en la zona del evento): la primera a su inicio (ya pasó) y la última en su día final
  // (viene). La última va una hora antes del fin, salvo cuando esa hora cae en el día anterior (el fin es `now() + 3 días`: entre las 00:00
  // y la 01:00 de México pasaba, y la base la rechazaba con `sesiones_invalidas`; corregido el 2026-11-01): entonces va justo al fin.
  await query(
    `insert into public.eventos_sesiones (evento_id, fecha, inicio)
     select e.id, timezone(e.zona, x)::date, x
     from public.eventos e,
       unnest(array[e.inicio, case when timezone(e.zona, e.fin - interval '1 hour')::date = timezone(e.zona, e.fin)::date then e.fin - interval '1 hour' else e.fin end]) x
     where e.id = $1`,
    [taller],
  );
  await query("insert into public.asistencias (usuario_id, evento_id, estado) values ($1, $3, 'voy'), ($2, $3, 'me_interesa')", [ADMIN, OTRA, manana]);
  await query("insert into public.destacados (evento_id) values ($1)", [manana]);

  // --- Las sugerencias: solo la administración; solo lo que se puede publicar.
  const sug = await as("authenticated", ADMIN, async () => (await query("select * from public.instagram_sugerencias('ciudad-ig-prueba', 7)")).rows);
  const ids = new Set(sug.map((s) => s.id));
  check(ids.has(manana), "lo de mañana se sugiere", [...ids]);
  check(!ids.has(lejos), "lo de dentro de dos semanas no entra en 7 días", [...ids]);
  check(!ids.has(empezo), "lo que ya empezó no se sugiere", [...ids]);
  check(!ids.has(oculto) && !ids.has(cancelado), "ni lo oculto ni lo cancelado", [...ids]);
  check(ids.has(expo), "una exposición abierta con días por delante sí", [...ids]);
  check(!ids.has(expoUltimo), "una exposición en su último día ya no", [...ids]);
  check(ids.has(taller), "un taller en curso con una sesión por delante sí", [...ids]);
  const m = sug.find((s) => s.id === manana);
  check(m.van === 1 && m.interesa === 1 && m.destacado === true && m.ciudad === "ciudad-ig-prueba" && m.lugar_nombre === "Foro IG OL-458" && m.lugar_redes[0].red === "instagram", "trae sus «Voy», «Me interesa», destacado, ciudad y lugar", m);
  const catorce = await as("authenticated", ADMIN, async () => (await query("select id from public.instagram_sugerencias('ciudad-ig-prueba', 15)")).rows.map((r) => r.id));
  check(catorce.includes(lejos), "con 15 días entra lo de dentro de dos semanas", catorce);
  const otraCiudad = await as("authenticated", ADMIN, async () => (await query("select count(*)::int as n from public.instagram_sugerencias('otra-ciudad-ig', 7)")).rows[0].n);
  check(otraCiudad === 0, "otra ciudad no trae estos", otraCiudad);
  const deOtra = await as("authenticated", OTRA, async () => (await query("select count(*)::int as n from public.instagram_sugerencias(null, 7)")).rows[0].n);
  check(deOtra === 0, "una cuenta que no es administración no ve sugerencias", deOtra);
  await as("anon", null, () => expectError(() => query("select * from public.instagram_sugerencias(null, 7)"), "42501", "un visitante no llama las sugerencias"));

  // --- Lo publicado: la administración anota; quién y cuándo los pone la base; la sugerencia dice la última.
  const p = await as("authenticated", ADMIN, async () => (await query("insert into public.instagram_publicaciones (evento_id, formato, estado, media_id, permalink, etiquetas, publicado_por, creado_en) values ($1, '4x5', 'publicada', '17900000000000001', 'https://www.instagram.com/p/ABC123/', '{foro.ig}', $2, '2000-01-01') returning publicado_por, creado_en", [manana, OTRA])).rows[0]);
  check(p.publicado_por === ADMIN && new Date(p.creado_en).getFullYear() > 2000, "la publicación queda a nombre de la sesión y con la hora de la base", p);
  const ya = await as("authenticated", ADMIN, async () => (await query("select publicado_formato, publicado_en from public.instagram_sugerencias('ciudad-ig-prueba', 7) where id = $1", [manana])).rows[0]);
  check(ya.publicado_formato === "4x5" && ya.publicado_en !== null, "la sugerencia dice que ya se publicó", ya);
  await as("authenticated", ADMIN, () => query("insert into public.instagram_publicaciones (evento_id, formato, estado, error) values ($1, '9x16', 'error', 'cupo')", [expo]));
  const malo = (sql, valores, etiqueta, codigo = "23514") => as("authenticated", ADMIN, () => expectError(() => query(sql, valores), codigo, etiqueta));
  await malo("insert into public.instagram_publicaciones (evento_id, formato, estado) values ($1, '4x5', 'publicada')", [expo], "publicada sin id de Instagram no entra");
  await malo("insert into public.instagram_publicaciones (evento_id, formato, estado, error, media_id) values ($1, '4x5', 'error', 'cupo', '1')", [expo], "un error no lleva id de Instagram");
  await malo("insert into public.instagram_publicaciones (evento_id, formato, estado, error) values ($1, '1x1', 'error', 'otro')", [expo], "un formato que no es 4:5 ni 9:16 no entra");
  await malo("insert into public.instagram_publicaciones (evento_id, formato, estado, media_id, permalink) values ($1, '4x5', 'publicada', '1', 'https://otro.example/p/1')", [expo], "un enlace que no es de Instagram no entra");
  const veOtra = await as("authenticated", OTRA, async () => (await query("select count(*)::int as n from public.instagram_publicaciones")).rows[0].n);
  check(veOtra === 0, "una cuenta cualquiera no ve lo publicado", veOtra);
  await as("authenticated", OTRA, () => expectError(() => query("insert into public.instagram_publicaciones (evento_id, formato, estado, error) values ($1, '4x5', 'error', 'otro')", [expo]), "42501", "una cuenta cualquiera no anota publicaciones"));
  const cambio = await as("authenticated", ADMIN, async () => {
    try {
      return (await query("update public.instagram_publicaciones set formato = '9x16' returning id")).rowCount;
    } catch (e) {
      return e.code;
    }
  });
  check(cambio === "42501", "lo publicado no se cambia", cambio);
  await as("anon", null, () => expectError(() => query("select count(*) from public.instagram_publicaciones"), "42501", "un visitante no lee lo publicado"));

  // --- Las ubicaciones: solo la administración; un id de página son números.
  const u = await as("authenticated", ADMIN, async () => (await query("insert into public.instagram_ubicaciones (tipo, clave, pagina_id, nombre, actualizado_por) values ('ciudad', 'ciudad-ig-prueba', '108000000000001', 'Ciudad IG', $1) returning actualizado_por", [OTRA])).rows[0]);
  check(u.actualizado_por === ADMIN, "la ubicación queda a nombre de la sesión", u);
  const cambiada = await as("authenticated", ADMIN, async () => (await query("update public.instagram_ubicaciones set pagina_id = '108000000000002' where tipo = 'ciudad' and clave = 'ciudad-ig-prueba' returning pagina_id")).rows[0]);
  check(cambiada.pagina_id === "108000000000002", "la administración la cambia", cambiada);
  await malo("insert into public.instagram_ubicaciones (tipo, clave, pagina_id) values ('ciudad', 'x', 'facebook.com/x')", [], "un id que no son números no entra");
  await malo("insert into public.instagram_ubicaciones (tipo, clave, pagina_id) values ('pais', 'x', '108000000000003')", [], "solo ciudad o lugar");
  const veUbic = await as("authenticated", OTRA, async () => (await query("select count(*)::int as n from public.instagram_ubicaciones")).rows[0].n);
  check(veUbic === 0, "una cuenta cualquiera no ve las ubicaciones", veUbic);
  await as("authenticated", OTRA, () => expectError(() => query("insert into public.instagram_ubicaciones (tipo, clave, pagina_id) values ('lugar', $1, '108000000000004')", [L]), "42501", "una cuenta cualquiera no guarda ubicaciones"));
  await as("authenticated", OTRA, () => expectError(() => query("select public.instagram_publicaciones_registro()"), "42501", "el disparador no se llama desde fuera"));

  // Se limpia lo de esta prueba (los bancos comparten la base): borrar el lugar se lleva sus eventos y lo publicado.
  await query("delete from public.instagram_ubicaciones where clave in ('ciudad-ig-prueba', $1)", [L]);
  await query("delete from public.eventos where lugar_id = $1", [L]);
  await query("delete from public.lugares where id = $1", [L]);
}
