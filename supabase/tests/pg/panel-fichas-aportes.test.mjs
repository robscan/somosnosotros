import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

// OL-326 · panel_fichas() y panel_aportes(): las fichas con una cuenta ligada por cualquier vía y los dos aportes nuevos.
// Se mide por diferencia contra lo que ya hubiera en la base (otras pruebas comparten la misma): cada caso suma lo suyo.
export async function run({ as, check, expectError, query }) {
  const admin = randomUUID();
  const adminCorreo = `fichas-admin-${admin}@local.test`;
  const u = Object.fromEntries(["u1", "u2", "u3", "u4", "u5", "u6", "asc"].map((n) => [n, randomUUID()]));
  const correo = (n) => `fichas-${n}-${u[n]}@local.test`;
  const artistas = [], lugares = [], eventos = [];
  const fichas = () => as("authenticated", admin, async () => (await query("select public.panel_fichas() as r")).rows[0].r);
  const aportes = () => as("authenticated", admin, async () => (await query("select public.panel_aportes() as r")).rows[0].r);
  const dias = (n) => `now() - interval '${n} days'`;
  try {
    await query("insert into public.admin_correos(correo) values ($1)", [adminCorreo]);
    await query("insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())", [admin, adminCorreo]);
    for (const n of Object.keys(u)) await query("insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())", [u[n], correo(n)]);

    // ---------- guardas ----------
    for (const llamada of ["panel_fichas()", "panel_aportes()"]) {
      await as("anon", null, () => expectError(() => query(`select public.${llamada}`), "42501", `${llamada}: anon sin acceso`));
      await as("authenticated", u.u1, () => expectError(() => query(`select public.${llamada}`), "42501", `${llamada}: una cuenta sin administración no entra`));
      await as("authenticated", null, () => expectError(() => query(`select public.${llamada}`), "42501", `${llamada}: authenticated sin identidad no entra`));
      const f = await query("select provolatile, prosecdef, proconfig from pg_proc where oid = $1::regprocedure", [`public.${llamada}`]);
      check(f.rows[0].provolatile === "s" && f.rows[0].prosecdef && f.rows[0].proconfig.includes('search_path=""'), `${llamada}: estable, definer y con la ruta vacía`, f.rows[0]);
    }

    const antesF = await fichas();
    const antesA = await aportes();

    // ---------- fichas ligadas: una por cada vía ----------
    const lugar = randomUUID(); lugares.push(lugar);
    await query("insert into public.lugares(id,nombre,tipo,lat,lng,creado_por) values ($1,$2,'foro',22.15,-100.98,$3)", [lugar, `Foro fichas ${lugar}`, admin]);
    async function artista({ creadoPor = admin, hace = 40, visible = true, foto = null, origen = "capo" } = {}) {
      const id = randomUUID(); artistas.push(id);
      await query(`insert into public.artistas(id,nombre,origen,visible,foto,creado_por,creado_en) values ($1,$2,$3,$4,$5,$6,${dias(hace)})`, [id, `Ficha ${id}`, origen, visible, foto, creadoPor]);
      return id;
    }
    const liga = (tabla, col, id, perfil, hace, extra = "") =>
      query(`insert into public.${tabla}(${col},perfil_id,creado_en) values ($1,$2,${dias(hace)}${extra})`, [id, perfil]);

    // Solicitud aprobada: pidió llevarla (reporte es_mio) y después la administración la ligó.
    const a1 = await artista();
    await query(`insert into public.reportes(tipo,objeto_id,motivo,creado_por,creado_en,atendido) values ('artista',$1,'es_mio',$2,${dias(30)},true)`, [a1, u.u1]);
    await liga("artistas_cuentas", "artista_id", a1, u.u1, 25);
    // Correo ligado: sin reporte; su correo es el que el CAPO capturó para esa ficha. Una segunda cuenta después no la cuenta otra vez.
    const a2 = await artista();
    await query("insert into public.contactos_importados(artista_id,correo) values ($1,$2)", [a2, correo("u2").toUpperCase()]);
    await liga("artistas_cuentas", "artista_id", a2, u.u2, 10);
    await liga("artistas_cuentas", "artista_id", a2, u.u5, 1);
    // «Soy yo» al darse de alta: la ficha la crea la cuenta y queda ligada en ese mismo momento.
    const a3 = await artista({ creadoPor: u.u6, hace: 40, origen: null });
    await query(`insert into public.artistas_cuentas(artista_id,perfil_id,creado_en) select id,$2,creado_en + interval '5 seconds' from public.artistas where id=$1`, [a3, u.u6]);
    // Otra vía: la ligó la administración; ni reporte, ni alta propia, ni correo conocido.
    const a4 = await artista();
    await liga("artistas_cuentas", "artista_id", a4, u.u4, 2);
    // Una ficha con una solicitud sin atender, otra sin nada y otra por reclamar: ninguna está vinculada.
    const a5 = await artista();
    await query("insert into public.reportes(tipo,objeto_id,motivo,creado_por) values ('artista',$1,'es_mio',$2)", [a5, u.u1]);
    await artista();
    // Lugares: solicitud aprobada y ligado por la administración.
    const l1 = randomUUID(); lugares.push(l1);
    await query("insert into public.lugares(id,nombre,tipo,lat,lng,creado_por) values ($1,$2,'foro',22.14,-100.97,$3)", [l1, `Lugar solicitud ${l1}`, admin]);
    await query(`insert into public.reportes(tipo,objeto_id,motivo,creado_por,creado_en,atendido) values ('lugar',$1,'es_mio',$2,${dias(15)},true)`, [l1, u.u1]);
    await liga("lugares_cuentas", "lugar_id", l1, u.u1, 12);
    const l2 = randomUUID(); lugares.push(l2);
    await query("insert into public.lugares(id,nombre,tipo,lat,lng,creado_por) values ($1,$2,'foro',22.13,-100.96,$3)", [l2, `Lugar directo ${l2}`, admin]);
    await liga("lugares_cuentas", "lugar_id", l2, u.u4, 1);
    // Fotos: visibles con foto, con la foto vacía, sin foto y una oculta con foto.
    const FOTO = "https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos/artistas/x/";
    await artista({ foto: `${FOTO}foto.jpg` });
    await artista({ foto: "" });
    await artista({ foto: `${FOTO}oculta.jpg`, visible: false });

    const f = await fichas();
    const d = (campo) => f[campo] - antesF[campo];
    check(d("artistas") === 4, "fichas: cuatro artistas con cuenta ligada (la segunda cuenta de una ficha no la cuenta otra vez)", { antes: antesF, ahora: f });
    check(d("lugares") === 2, "fichas: dos lugares con cuenta ligada", f);
    check(f.vias.solicitud - antesF.vias.solicitud === 2, "vía solicitud: el artista y el lugar con reporte es_mio previo", f.vias);
    check(f.vias.correo - antesF.vias.correo === 1, "vía correo: su correo coincide con el contacto de la ficha (sin importar mayúsculas)", f.vias);
    check(f.vias.alta - antesF.vias.alta === 1, "vía alta: la ficha que creó la cuenta, ligada al instante", f.vias);
    check(f.vias.otra - antesF.vias.otra === 2, "vía otra: la ligó la administración (artista y lugar)", f.vias);
    check(f.vias.solicitud + f.vias.correo + f.vias.alta + f.vias.otra === f.artistas + f.lugares, "las cuatro vías suman todas las fichas vinculadas", f);
    check(f.artistas_por_reclamar - antesF.artistas_por_reclamar === 5, "por reclamar: las cinco del CAPO sin cuenta ligada (la solicitud sin atender sigue por reclamar; las de foto también)", f);
    check(f.artistas_visibles - antesF.artistas_visibles === 8, "visibles: las ocho fichas nuevas menos la oculta", f);
    check(f.artistas_con_foto - antesF.artistas_con_foto === 1, "con foto: solo la visible con foto (ni la de texto vacío ni la oculta)", f);

    // Serie de 12 semanas, de la más vieja a hoy, reconstruida de las fechas de los vínculos.
    check(Array.isArray(f.serie) && f.serie.length === 12, "serie: doce semanas", f.serie);
    const s = (k) => f.serie[11 - k] - antesF.serie[11 - k];
    check(s(0) === 6 && s(1) === 4 && s(2) === 2 && s(3) === 2 && s(4) === 1 && s(6) === 0, "serie: 6 hoy, 4 hace una semana, 2 hace dos y tres, 1 hace cuatro, 0 hace seis", { serie: f.serie, antes: antesF.serie });
    check(f.serie[11] === f.artistas + f.lugares, "serie: el último punto es el total de hoy", f);

    // Solo agregados: ni ids ni correos.
    const crudo = JSON.stringify(f);
    check(!crudo.includes("@") && ![...Object.values(u), a1, a2, a3, a4].some((x) => crudo.includes(x)), "fichas: ningún id ni correo sale en la respuesta");

    // ---------- aportes ----------
    const ev = [];
    for (let i = 0; i < 6; i++) {
      const id = randomUUID(); eventos.push(id); ev.push(id);
      await query(`insert into public.eventos(id,lugar_id,titulo,inicio,creado_por,creado_en) values ($1,$2,$3,now() + interval '5 days',$4,${dias(60)})`, [id, lugar, `Evento aportes ${id}`, admin]);
    }
    // Una cuenta que asciende hace un día: lo que hizo antes cuenta; lo de después, no.
    const ascenso = await as("authenticated", admin, () => query("select public.cambiar_rol($1,'admin') as r", [u.asc]));
    check(ascenso.rows[0].r === "ok", "se asciende a una cuenta para probar el rol de entonces", ascenso.rows[0]);
    await query(`update public.cambios_de_rol set creado_en = ${dias(1)} where perfil_id = $1`, [u.asc]);
    const gesto = (evento, perfil, estado, cuando) => query(`insert into public.asistencias(usuario_id,evento_id,estado,creado_en) values ($2,$1,$3,${cuando})`, [evento, perfil, estado]);
    await gesto(ev[0], u.u1, "voy", dias(2));
    await gesto(ev[1], u.u1, "me_interesa", dias(3));
    await gesto(ev[2], u.u1, "voy", dias(9)); // la semana anterior
    await gesto(ev[0], u.u2, "voy", dias(1));
    await gesto(ev[3], u.asc, "voy", dias(4)); // antes de ascender: cuenta
    await gesto(ev[4], u.asc, "voy", "now() - interval '12 hours'"); // ya administradora: no cuenta
    await gesto(ev[0], admin, "voy", "now()"); // la administración no cuenta
    await gesto(ev[5], u.u3, "voy", dias(20)); // fuera de las dos semanas

    // Primera vez que publican: u1 esta semana, u2 desde hace tiempo (publica otra vez esta semana), u3 la semana anterior.
    const publica = async (perfil, hace) => {
      const id = randomUUID(); eventos.push(id);
      await query(`insert into public.eventos(id,lugar_id,titulo,inicio,creado_por,creado_en) values ($1,$2,$3,now() + interval '6 days',$4,${dias(hace)})`, [id, lugar, `Publicado ${id}`, perfil]);
    };
    await publica(u.u1, 3);
    await publica(u.u2, 20);
    await publica(u.u2, 2);
    await publica(u.u3, 10);
    await publica(admin, 1); // la administración no cuenta
    await publica(u.asc, 0.5); // ya administradora: no cuenta

    const a = await aportes();
    const da = (campo) => a[campo] - antesA[campo];
    check(da("gestos_ahora") === 4, "aportes: cuatro Voy / Me interesa en 7 días (u1 dos, u2 uno, la ascendida el de antes de serlo; ni la administración ni lo de después)", { antes: antesA, ahora: a });
    check(da("voy") === 3 && da("me_interesa") === 1, "aportes: tres Voy y un Me interesa", a);
    check(da("personas") === 3, "aportes: tres personas distintas", a);
    check(da("gestos_antes") === 1, "aportes: uno la semana anterior; lo de hace 20 días queda fuera", a);
    check(da("primeras_ahora") === 1, "primera vez: solo u1 publicó por primera vez esta semana", a);
    check(da("primeras_antes") === 1, "primera vez: u3, la semana anterior", a);
    check(da("han_publicado") === 4, "primera vez: u1, u2, u3 y quien dio de alta una ficha (u6) han publicado alguna vez (la administración y la ascendida, no)", a);
    check(!JSON.stringify(a).includes("@") && ![...Object.values(u), admin].some((x) => JSON.stringify(a).includes(x)), "aportes: ningún id ni correo sale en la respuesta");

    // La consulta de lectura que se le da al gestor (scripts/ops/panel-fichas-lectura.sql) da los mismos números que las dos funciones.
    const lectura = Object.fromEntries((await query(readFileSync(new URL("../../../scripts/ops/panel-fichas-lectura.sql", import.meta.url), "utf8"))).rows.map((r) => [r.dato, Number(r.valor)]));
    check(lectura["artistas con cuenta ligada"] === f.artistas && lectura["lugares con cuenta ligada"] === f.lugares, "consulta de lectura: mismas fichas vinculadas que panel_fichas()", { lectura, f });
    check(lectura["vía solicitud"] === f.vias.solicitud && lectura["vía correo ligado"] === f.vias.correo && lectura["vía alta (Soy yo)"] === f.vias.alta && lectura["vía otra"] === f.vias.otra, "consulta de lectura: mismas vías", lectura);
    check(lectura["artistas visibles"] === f.artistas_visibles && lectura["artistas visibles con foto"] === f.artistas_con_foto, "consulta de lectura: mismos artistas con foto", lectura);
    check(lectura["Voy y Me interesa, últimos 7 días"] === a.gestos_ahora && lectura["Voy y Me interesa, 7 días anteriores"] === a.gestos_antes, "consulta de lectura: mismos Voy / Me interesa", lectura);
    check(lectura["primera publicación, últimos 7 días"] === a.primeras_ahora && lectura["primera publicación, 7 días anteriores"] === a.primeras_antes && lectura["cuentas que han publicado alguna vez"] === a.han_publicado, "consulta de lectura: mismas primeras publicaciones", lectura);
  } finally {
    await query("delete from public.reportes where objeto_id = any($1::uuid[])", [[...artistas, ...lugares]]);
    await query("delete from public.contactos_importados where artista_id = any($1::uuid[])", [artistas]);
    await query("delete from public.eventos where id = any($1::uuid[])", [eventos]);
    await query("delete from public.artistas where id = any($1::uuid[])", [artistas]);
    await query("delete from public.lugares where id = any($1::uuid[])", [lugares]);
    await query("delete from auth.users where id = any($1::uuid[])", [[admin, ...Object.values(u)]]);
    await query("delete from public.admin_correos where correo = $1", [adminCorreo]);
  }
}
