import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * OL-498 (bitácora 530, migración 20261029310000): `instagram_falta_material` reescrita para no recorrer todos los eventos por cada ficha. Devuelve
 * lo mismo que la de antes: aquí se crea una copia de la de antes (el cuerpo tal cual está en la migración 20261029240000, en un esquema de prueba)
 * y se comparan las dos fila por fila, con todas sus columnas, sobre los datos de las pruebas anteriores y sobre un juego propio que toca cada
 * caso: la ficha y su próxima fecha en ciudades distintas, la primera fecha en otra ciudad, eventos ocultos, cancelados, en borrador o retirados,
 * lo que ya pasó esta semana, los bordes de la ventana en zonas de −11 y +14 horas, lugares privados u ocultos, quien dijo que no, lo publicado
 * hace 1 y 7 meses, el pedido de la semana, quién la lleva y más de 100 (el tope). Todo dentro de una transacción que se deshace al final: no
 * deja datos ni el esquema de prueba para las pruebas que siguen.
 */
const ADMIN = randomUUID();
const GESTORA = randomUUID();
const C = { slug: "ciudad-rapida-prueba", nombre: "Ciudad Rapida Prueba" };
const OTRA = { slug: "otra-rapida-prueba", nombre: "Otra Rapida Prueba" };
const MX = "America/Mexico_City";
const KIRI = "Pacific/Kiritimati"; // +14
const PAGO = "Pacific/Pago_Pago"; // −11
const FOTOS = "https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos/";
const AJENA = "https://otra-pagina.test/portada.jpg";
const LARGA = "Una descripción bastante larga para la prueba de falta de material: la ficha tiene que decir algo de sí misma, al menos ciento veinte letras.";

const MIGRACION_ANTES = fileURLToPath(new URL("../../migrations/20261029240000_instagram_material.sql", import.meta.url));

export async function run({ check, query }) {
  const uno = async (sql, valores) => (await query(sql, valores)).rows[0];
  // Las fichas las da de alta el servidor (service_role), como las importaciones: una portada de otra página solo entra así.
  const servicio = async (sql, valores) => {
    await query("set role service_role");
    try {
      return (await query(sql, valores)).rows[0];
    } finally {
      await query("reset role");
    }
  };
  await query("begin");
  try {
    // La de antes, tal cual, en un esquema de prueba.
    const antes = readFileSync(MIGRACION_ANTES, "utf8").match(/create function public\.instagram_falta_material\(p_ciudad text, p_desde date\)[\s\S]*?\$\$;/)[0];
    await query("create schema prueba_498");
    await query(antes.replace("create function public.instagram_falta_material(", "create function prueba_498.falta_antes("));

    await query("insert into public.admin_correos (correo) values ('rapida-admin@local.test')");
    await query("insert into auth.users (id, email) values ($1, 'rapida-admin@local.test'), ($2, 'rapida-gestora@local.test')", [ADMIN, GESTORA]);
    for (const c of [C, OTRA]) await query("insert into public.ciudades (slug, nombre, zona, estado) values ($1, $2, $3, 'abierta') on conflict do nothing", [c.slug, c.nombre, MX]);

    const ig = (u) => JSON.stringify([{ url: `https://www.instagram.com/${u}` }]);
    const artista = async (nombre, o = {}) =>
      (await servicio("insert into public.artistas (nombre, disciplina, ciudad, foto, portada, descripcion, redes, visible, creado_por) values ($1, 'musica', $2, $3, $4, $5, $6, $7, $8) returning id",
        [nombre, o.ciudad ?? C.nombre, o.foto === undefined ? `${FOTOS}f.jpg` : o.foto, o.portada === undefined ? null : o.portada, o.corta ? "corta" : LARGA, o.sinIg ? "[]" : ig(nombre.toLowerCase().replace(/[^a-z]/g, "")), o.visible ?? true, o.autor ?? null])).id;
    const lugar = async (nombre, o = {}) =>
      (await servicio("insert into public.lugares (nombre, tipo, lat, lng, ciudad, portada, descripcion, redes, zona, privado, visible) values ($1, 'foro', 22.15, -100.97, $2, $3, $4, '[]', $5, $6, $7) returning id",
        [nombre, o.ciudad ?? C.nombre, o.portada === undefined ? null : o.portada, o.corta ? "corta" : LARGA, o.zona ?? MX, o.privado ?? false, o.visible ?? true])).id;
    // Una hora de pared en la zona de un lugar: el instante.
    const en = async (fecha, hora, zona) => (await uno("select (($1::date + $2::time) at time zone $3)::text as t", [fecha, hora, zona])).t;
    const evento = async (titulo, lugarId, inicio, o = {}) =>
      (await uno("insert into public.eventos (lugar_id, titulo, inicio, ciudad, creado_por, visible, borrador, cancelado, retirado_por_admin, evento_padre_id) values ($1, $2, $3::timestamptz, $4, $5, $6, $7, $8, $9, $10) returning id",
        [lugarId, titulo, inicio, o.ciudad ?? C.nombre, GESTORA, o.visible ?? true, o.borrador ?? false, o.cancelado ?? false, o.retirado ?? false, o.padre ?? null])).id;
    const actua = (eventoId, artistaId) => query("insert into public.eventos_artistas (evento_id, artista_id) values ($1, $2)", [eventoId, artistaId]);

    const hoy = (await uno("select (now() at time zone $1)::date::text as d", [MX])).d;
    const dia = async (base, n) => (await uno("select ($1::date + $2::int)::text as d", [base, n])).d;
    const lunes = (await uno("select date_trunc('week', $1::date)::date::text as d", [hoy])).d;
    const siguiente = await dia(lunes, 7);
    const anterior = await dia(lunes, -7);

    // Lugares.
    const L_C = await lugar("Foro Rapida Completo", { portada: `${FOTOS}l.jpg` });
    const L_OTRA = await lugar("Foro Rapida Otra", { portada: `${FOTOS}l.jpg`, ciudad: OTRA.nombre });
    const L_SIN = await lugar("Foro Rapida Sin Portada");
    const L_AJENA = await lugar("Foro Rapida Portada Ajena", { portada: AJENA, corta: true });
    const L_PRIV = await lugar("Foro Rapida Privado", { privado: true });
    const L_OCULTO = await lugar("Foro Rapida Oculto", { visible: false });
    const L_KIRI = await lugar("Foro Rapida Kiritimati", { zona: KIRI });
    const L_PAGO = await lugar("Foro Rapida Pago Pago", { zona: PAGO });

    // Eventos en la ventana de la semana que viene (todo en el futuro: `now()` no recorta nada).
    const pronto = await dia(siguiente, 3);
    const E_C = await evento("Rapida En C", L_C, await en(pronto, "20:00", MX));
    const E_C2 = await evento("Rapida En C Despues", L_C, await en(await dia(siguiente, 10), "20:00", MX));
    const E_OTRA = await evento("Rapida En Otra", L_OTRA, await en(await dia(siguiente, 1), "20:00", MX), { ciudad: OTRA.nombre });
    const E_SIN = await evento("Rapida En El Foro Sin Portada", L_SIN, await en(await dia(siguiente, 2), "19:00", MX));
    await evento("Rapida En El Foro Ajeno", L_AJENA, await en(await dia(siguiente, 4), "19:00", MX));
    await evento("Rapida En El Privado", L_PRIV, await en(await dia(siguiente, 4), "19:00", MX));
    await evento("Rapida En El Oculto", L_OCULTO, await en(await dia(siguiente, 4), "19:00", MX));
    const E_OCULTO = await evento("Rapida Oculto", L_C, await en(await dia(siguiente, 2), "18:00", MX), { visible: false });
    const E_CANC = await evento("Rapida Cancelado", L_C, await en(await dia(siguiente, 2), "18:10", MX), { cancelado: true });
    // Un borrador es un acto de festival (eventos_borrador_con_padre): su festival, sin artistas, en el lugar completo.
    const inicioFest = await en(await dia(siguiente, 2), "10:00", MX);
    const FEST = (await uno("insert into public.eventos (lugar_id, titulo, inicio, fin, ciudad, creado_por, clase) values ($1, 'Rapida Festival', $2::timestamptz, $2::timestamptz + interval '3 days', $3, $4, 'festival') returning id", [L_C, inicioFest, C.nombre, GESTORA])).id;
    const E_BORR = await evento("Rapida Borrador", L_C, await en(await dia(siguiente, 2), "18:20", MX), { borrador: true, visible: false, padre: FEST });
    const E_RET = await evento("Rapida Retirado", L_C, await en(await dia(siguiente, 2), "18:30", MX), { retirado: true });
    // Los bordes de la ventana en su zona: el lunes a las 00:00 entra; el domingo antes a las 23:59, no; el día 30 a las 00:00, no; el 29 a las 23:59, sí.
    const borde = async (lugarId, zona, nombre) => ({
      dentroIni: await evento(`${nombre} lunes 00:00`, lugarId, await en(siguiente, "00:00", zona)),
      fueraIni: await evento(`${nombre} domingo 23:59`, lugarId, await en(await dia(siguiente, -1), "23:59", zona)),
      fueraFin: await evento(`${nombre} día 30 00:00`, lugarId, await en(await dia(siguiente, 30), "00:00", zona)),
      dentroFin: await evento(`${nombre} día 29 23:59`, lugarId, await en(await dia(siguiente, 29), "23:59", zona)),
    });
    const BK = await borde(L_KIRI, KIRI, "Rapida Kiritimati");
    const BP = await borde(L_PAGO, PAGO, "Rapida Pago Pago");
    // Lo que ya pasó esta semana (ayer, si la semana ya empezó) y lo de esta semana que viene.
    const E_AYER = await evento("Rapida Ayer", L_C, await en(await dia(hoy, -1), "20:00", MX));
    const E_HOY_LUEGO = await evento("Rapida Mas Tarde", L_C, await en(await dia(hoy, 1), "21:00", MX));

    // Artistas.
    const A_SIN = await artista("Rapida Sin Portada", { autor: GESTORA });
    const A_NADA = await artista("Rapida Sin Nada", { foto: null, ciudad: OTRA.nombre, corta: true, sinIg: true });
    const A_PRIMERO_OTRA = await artista("Rapida Primero En Otra");
    const A_DE_OTRA = await artista("Rapida De Otra", { ciudad: OTRA.nombre });
    const A_AJENA = await artista("Rapida Portada Ajena", { portada: AJENA, foto: AJENA });
    const A_COMPLETA = await artista("Rapida Completa", { portada: `${FOTOS}p.jpg` });
    const A_OCULTA = await artista("Rapida Oculta", { visible: false });
    const A_FUERA = await artista("Rapida Dijo Que No");
    const A_PUB_RECIENTE = await artista("Rapida Publicada Hace Un Mes");
    const A_PUB_VIEJA = await artista("Rapida Publicada Hace Siete Meses");
    const A_SOLO_MALOS = await artista("Rapida Solo Eventos Que No Cuentan");
    const A_AYER = await artista("Rapida Tocó Ayer");
    const A_KIRI = await artista("Rapida Kiritimati");
    const A_PAGO = await artista("Rapida Pago Pago");
    const A_PEDIDA = await artista("Rapida Pedida", { autor: GESTORA });
    await actua(E_C, A_SIN);
    await actua(E_C2, A_SIN);
    await actua(E_C, A_NADA);
    await actua(E_OTRA, A_PRIMERO_OTRA);
    await actua(E_C2, A_PRIMERO_OTRA);
    await actua(E_OTRA, A_DE_OTRA); // su primera fecha es en Otra y su ficha también: en C no sale aunque luego toque en C
    await actua(E_C2, A_DE_OTRA);
    for (const a of [A_AJENA, A_COMPLETA, A_OCULTA, A_FUERA, A_PUB_RECIENTE, A_PUB_VIEJA, A_PEDIDA]) await actua(E_SIN, a);
    for (const e of [E_OCULTO, E_CANC, E_BORR, E_RET]) await actua(e, A_SOLO_MALOS);
    await actua(E_AYER, A_AYER);
    await actua(E_HOY_LUEGO, A_AYER);
    for (const e of Object.values(BK)) await actua(e, A_KIRI);
    for (const e of Object.values(BP)) await actua(e, A_PAGO);
    await query("insert into public.artistas_cuentas (artista_id, perfil_id) values ($1, $2)", [A_PEDIDA, ADMIN]);
    await query("insert into public.instagram_fuera (artista_id) values ($1)", [A_FUERA]);
    const pub = async (artistaId, hace) => {
      const id = (await uno("insert into public.instagram_publicaciones (artista_id, formato, estado, media_id) values ($1, '4x5', 'publicada', '17900000000000498') returning id", [artistaId])).id;
      await query(`update public.instagram_publicaciones set creado_en = now() - interval '${hace}' where id = $1`, [id]);
    };
    await pub(A_PUB_RECIENTE, "1 month");
    await pub(A_PUB_VIEJA, "7 months");
    await query("insert into public.instagram_material_pedidos (artista_id, semana, usuario_id, falta) values ($1, $2::date, $3, '{portada}')", [A_PEDIDA, siguiente, GESTORA]);
    await query("insert into public.instagram_material_pedidos (lugar_id, semana, usuario_id, falta) values ($1, $2::date, $3, '{portada}')", [L_SIN, siguiente, GESTORA]);
    // Más de 100 en la misma fecha: el tope y el desempate por nombre.
    const E_MASA = await evento("Rapida Masa", L_C, await en(await dia(siguiente, 5), "20:00", MX));
    for (let i = 0; i < 105; i++) await actua(E_MASA, await artista(`Rapida Masa ${String(i).padStart(3, "0")}`));

    // ---- Las dos, fila por fila ----
    const columnas = "tipo, id, slug, nombre, foto, falta, otros, proxima_titulo, proxima_inicio, proxima_zona, lleva, lleva_nombre, pedido_en";
    const leer = async (fn, ciudad, desde, sujeto = ADMIN) => {
      await query("select set_config('request.jwt.claim.sub', $1, false)", [sujeto]);
      await query("set role authenticated");
      try {
        // La de antes vive en un esquema de prueba: la llama el dueño (como definer, corre igual) y con la misma sesión.
        if (fn === "antes") await query("reset role");
        return (await query(`select ${columnas} from ${fn === "antes" ? "prueba_498.falta_antes" : "public.instagram_falta_material"}($1, $2::date)`, [ciudad, desde])).rows;
      } finally {
        await query("reset role");
        await query("select set_config('request.jwt.claim.sub', '', false)");
      }
    };
    const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const slugs = (await query("select slug from public.ciudades order by slug")).rows.map((r) => r.slug);
    let comparadas = 0;
    let filas = 0;
    for (const desde of [anterior, lunes, siguiente]) {
      for (const ciudad of slugs) {
        const [a, n] = [await leer("antes", ciudad, desde), await leer("nueva", ciudad, desde)];
        comparadas += 1;
        filas += n.length;
        if (!iguales(a, n)) {
          const i = n.findIndex((x, k) => !iguales(x, a[k]));
          check(false, `misma respuesta que la de antes (${ciudad}, ${desde})`, { antes: a.length, nueva: n.length, primera: i, filaAntes: a[i], filaNueva: n[i] });
        }
      }
    }
    check(comparadas >= 6 && filas > 100, "se compararon todas las ciudades en tres semanas, con filas de verdad", { comparadas, filas });

    // ---- Y que el juego propio dice lo que tiene que decir (si las dos se equivocaran igual, aquí se ve) ----
    const n = await leer("nueva", C.slug, siguiente);
    const de = (id) => n.find((f) => f.id === id);
    check(n.length === 100, "el tope sigue en 100", n.length);
    check(de(A_SIN)?.proxima_titulo === "Rapida En C" && de(A_SIN).falta.join() === "portada", "la primera fecha y lo que falta", de(A_SIN));
    check(de(A_NADA)?.falta.join() === "foto,portada" && de(A_NADA).otros.join() === "descripcion,instagram", "de otra ciudad con fecha aquí: sale, con todo lo que le falta", de(A_NADA));
    check(de(A_PRIMERO_OTRA)?.proxima_titulo === "Rapida En Otra", "de aquí con su primera fecha en otra ciudad: sale, con esa fecha", de(A_PRIMERO_OTRA));
    check(!de(A_DE_OTRA), "de otra ciudad con su primera fecha en otra: no sale aunque luego toque aquí");
    check(de(A_AJENA)?.falta.join() === "foto_ajena,portada_ajena", "foto y portada de otra página", de(A_AJENA));
    check(!de(A_COMPLETA) && !de(A_OCULTA) && !de(A_FUERA) && !de(A_PUB_RECIENTE), "ni completa, ni oculta, ni la que dijo que no, ni la publicada hace un mes");
    check(!!de(A_PUB_VIEJA), "la publicada hace siete meses, sí");
    check(!de(A_SOLO_MALOS), "eventos ocultos, cancelados, en borrador o retirados no cuentan como fecha");
    check(de(L_SIN)?.tipo === "lugar" && de(L_SIN).pedido_en !== null, "el lugar sin portada, con su pedido de la semana", de(L_SIN));
    check(de(L_AJENA)?.falta.join() === "portada_ajena" && de(L_AJENA).otros.join() === "descripcion", "el lugar con la portada de otra página", de(L_AJENA));
    check(!de(L_PRIV) && !de(L_OCULTO), "ni el lugar privado ni el oculto");
    check(de(A_PEDIDA)?.pedido_en !== null && de(A_PEDIDA).lleva.join() === GESTORA && de(A_PEDIDA).lleva_nombre !== undefined, "pedida esta semana; la lleva su autora (la cuenta de la administración no cuenta)", de(A_PEDIDA));
    const kiri = (await uno("select inicio::text as t from public.eventos where id = $1", [BK.dentroIni])).t;
    const pago = (await uno("select inicio::text as t from public.eventos where id = $1", [BP.dentroIni])).t;
    check(de(A_KIRI)?.proxima_zona === KIRI && new Date(de(A_KIRI).proxima_inicio).getTime() === new Date(kiri).getTime(), "+14 h: el lunes a las 00:00 de su zona entra y el domingo 23:59 no", de(A_KIRI));
    check(de(A_PAGO)?.proxima_zona === PAGO && new Date(de(A_PAGO).proxima_inicio).getTime() === new Date(pago).getTime(), "−11 h: igual", de(A_PAGO));
    // El fin de la ventana: solo con el evento del día 29 23:59 y el del 30 00:00, sale con el del 29 (sin los 105 de la masa, que lo dejarían
    // fuera del tope de 100).
    await query("update public.eventos set visible = false where id = any($1::uuid[])", [[BK.dentroIni, BK.fueraIni, BP.dentroIni, BP.fueraIni, E_MASA]]);
    const fin = await leer("nueva", C.slug, siguiente);
    const finK = (await uno("select inicio::text as t from public.eventos where id = $1", [BK.dentroFin])).t;
    check(new Date(fin.find((f) => f.id === A_KIRI)?.proxima_inicio ?? 0).getTime() === new Date(finK).getTime(), "el día 29 a las 23:59 de su zona entra", fin.find((f) => f.id === A_KIRI));
    check(iguales(await leer("antes", C.slug, siguiente), fin), "y la de antes dice lo mismo con los bordes del final");
    await query("update public.eventos set visible = false where id = any($1::uuid[])", [[BK.dentroFin, BP.dentroFin]]);
    const sinFin = await leer("nueva", C.slug, siguiente);
    check(!sinFin.some((f) => f.id === A_KIRI || f.id === A_PAGO), "el día 30 a las 00:00 ya no", sinFin.filter((f) => f.id === A_KIRI || f.id === A_PAGO));
    check(iguales(await leer("antes", C.slug, siguiente), sinFin), "y la de antes tampoco");
    // Esta semana: lo de ayer ya pasó; cuenta lo que viene.
    const estaSemana = await leer("nueva", C.slug, lunes);
    const ayer = estaSemana.find((f) => f.id === A_AYER);
    check(ayer?.proxima_titulo === "Rapida Mas Tarde", "si la semana ya empezó, lo que ya pasó no es la próxima fecha", ayer);
    // Solo la administración, y con ciudad y lunes.
    check((await leer("nueva", C.slug, siguiente, GESTORA)).length === 0, "una cuenta cualquiera no ve nada");
    check((await leer("nueva", null, siguiente)).length === 0 && (await leer("nueva", C.slug, null)).length === 0, "sin ciudad o sin lunes, nada");

    // ---- Lo mismo que se pide: la firma, los permisos y el modo ----
    const f = await uno(`select p.prosecdef, p.proconfig, pg_get_function_result(p.oid) as r, pg_get_function_identity_arguments(p.oid) as a,
      has_function_privilege('authenticated', p.oid, 'execute') as auth, has_function_privilege('anon', p.oid, 'execute') as anon
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'instagram_falta_material'`);
    check(f.prosecdef && f.proconfig?.includes("search_path=\"\"") && f.auth && !f.anon, "security definer, search_path vacío, authenticated sí y anon no", f);
    check(f.a === "p_ciudad text, p_desde date" && /^TABLE\(tipo text, id uuid, slug text, nombre text, foto text, falta text\[\], otros text\[\], proxima_titulo text, proxima_inicio timestamp with time zone, proxima_zona text, lleva uuid\[\], lleva_nombre text, pedido_en timestamp with time zone\)$/.test(f.r), "la misma firma y las mismas columnas", f);
  } finally {
    await query("rollback");
    await query("reset role");
    await query("select set_config('request.jwt.claim.sub', '', false)");
  }
}
