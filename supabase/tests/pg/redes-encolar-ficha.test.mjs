import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * OL-515 (bitácora 548, migración 20261112100000): «Publicar en Instagram» desde la ficha de un artista o de un lugar guarda el trabajo en la cola
 * por `redes_encolar_ficha`, no con la llave de servicio. Solo la administración; la ficha tiene que existir, verse (el lugar, no ser privado), no
 * estar fuera de Instagram y, el artista, tener su foto propia. Sin duplicados (también con dos toques a la vez), sin repetir lo que ya salió salvo
 * que se confirme, y el pedido limpio (nunca `casilla`: eso es de un día de la semana).
 */
const ADMIN = randomUUID();
const OTRA = randomUUID();
const FOTOS = "https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos/";
const CIUDAD = "Ciudad Encolar Ficha Prueba";

export async function run({ as, check, expectError, query, connection }) {
  // La migración se puede aplicar dos veces (idempotente).
  await query(readFileSync(new URL("../../migrations/20261112100000_redes_encolar_ficha.sql", import.meta.url), "utf8"));
  await query("insert into public.admin_correos (correo) values ('encolar-ficha-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'encolar-ficha-admin@local.test'), ($2, 'encolar-ficha-otra@local.test')", [ADMIN, OTRA]);
  const servicio = (sql, valores) => as("service_role", null, async () => (await query(sql, valores)).rows[0]);
  const artista = async (nombre, foto, visible = true) =>
    (await servicio("insert into public.artistas (nombre, disciplina, ciudad, foto, visible, redes) values ($1, 'musica', $2, $3, $4, $5) returning id", [nombre, CIUDAD, foto, visible, JSON.stringify([{ url: "https://www.instagram.com/encolarficha" }])])).id;
  const lugar = async (nombre, o = {}) =>
    (await servicio("insert into public.lugares (nombre, tipo, lat, lng, ciudad, visible, privado) values ($1, 'foro', 22.15, -100.97, $2, $3, $4) returning id", [nombre, CIUDAD, o.visible ?? true, o.privado ?? false])).id;

  const A = await artista("Artista Encolar Ficha", `${FOTOS}a.jpg`);
  const A_SIN_FOTO = await artista("Artista Sin Foto Encolar", null);
  const A_AJENA = await artista("Artista Foto Ajena Encolar", "https://otra-pagina.test/a.jpg");
  const A_OCULTO = await artista("Artista Oculto Encolar", `${FOTOS}o.jpg`, false);
  const A_FUERA = await artista("Artista Fuera Encolar", `${FOTOS}f.jpg`);
  const L = await lugar("Teatro Encolar Ficha");
  const L_OCULTO = await lugar("Foro Oculto Encolar", { visible: false });
  const L_PRIVADO = await lugar("Casa Privada Encolar", { privado: true });
  const L_SEMANA = await lugar("Foro De La Semana Encolar");
  await servicio("insert into public.instagram_fuera (artista_id) values ($1) returning id", [A_FUERA]);
  const todos = [A, A_SIN_FOTO, A_AJENA, A_OCULTO, A_FUERA, L, L_OCULTO, L_PRIVADO, L_SEMANA];

  const encolar = (sujeto, tipo, ficha, pedido = {}, repetir = false) =>
    as("authenticated", sujeto, async () => (await query("select public.redes_encolar_ficha($1, $2, $3, $4) as r", [tipo, ficha, JSON.stringify(pedido), repetir])).rows[0].r);
  const error = (sujeto, tipo, ficha, pedido, codigo, etiqueta) =>
    as(sujeto ? "authenticated" : "anon", sujeto, () => expectError(() => query("select public.redes_encolar_ficha($1, $2, $3, false)", [tipo, ficha, JSON.stringify(pedido ?? {})]), codigo, etiqueta));
  const trabajos = async (ficha) => (await query("select id, artista_id, lugar_id, evento_id, red, formato, estado, pedido, pedido_por from public.redes_trabajos where artista_id = $1 or lugar_id = $1 order by creado_en", [ficha])).rows;

  try {
    // --- Quién.
    await error(null, "lugar", L, {}, "42501", "sin sesión no guarda");
    await error(OTRA, "lugar", L, {}, "42501", "una cuenta cualquiera no guarda");
    check((await trabajos(L)).length === 0, "nada guardado por quien no es la administración");

    // --- La administración: el pedido limpio, a su nombre, sin evento ni día de la semana.
    const uno = await encolar(ADMIN, "lugar", L, { facebook: false, texto: "  Mi texto  ", quitadas: ["teatro", 3, "otra"], recorte: true, raro: "x" });
    check(typeof uno?.id === "string", "la administración guarda un trabajo de un lugar", uno);
    const [t] = await trabajos(L);
    check(t?.lugar_id === L && t.artista_id === null && t.evento_id === null && t.red === "instagram" && t.formato === "4x5" && t.estado === "en_cola" && t.pedido_por === ADMIN, "un trabajo de Instagram 4:5 del lugar, en cola, a nombre de quien lo pidió", t);
    check(JSON.stringify(t?.pedido) === JSON.stringify({ tipo: "lugar", texto: "Mi texto", facebook: false, quitadas: ["teatro", "otra"] }), "el pedido lleva solo tipo, facebook, texto y quitadas (sin lo que no es suyo)", t?.pedido);
    const deA = await encolar(ADMIN, "artista", A, {});
    const [ta] = await trabajos(A);
    check(typeof deA?.id === "string" && ta?.artista_id === A && JSON.stringify(ta.pedido) === JSON.stringify({ tipo: "artista", texto: null, facebook: true, quitadas: [] }), "un artista con su foto: sin pedido, Facebook sí y el texto del sistema", ta);

    // --- La ficha.
    await error(ADMIN, "lugar", randomUUID(), {}, "23503", "una ficha que no existe no entra");
    await error(ADMIN, "evento", L, {}, "22023", "solo artista o lugar");
    await error(ADMIN, "lugar", L_OCULTO, {}, "22023", "un lugar oculto no se publica");
    await error(ADMIN, "lugar", L_PRIVADO, {}, "22023", "un lugar privado no se publica");
    await error(ADMIN, "artista", A_OCULTO, {}, "22023", "un artista oculto no se publica");
    await error(ADMIN, "artista", A_FUERA, {}, "22023", "un artista que dijo que no (fuera de Instagram) no se publica");
    await error(ADMIN, "artista", A_SIN_FOTO, {}, "22023", "un artista sin foto no se publica");
    await error(ADMIN, "artista", A_AJENA, {}, "22023", "un artista con una foto de otra página tampoco");
    await error(ADMIN, "lugar", L_SEMANA, { casilla: randomUUID() }, "22023", "el pedido no acepta `casilla` (eso es de un día de la semana)");
    await error(ADMIN, "lugar", L_SEMANA, { eventos: [] }, "22023", "ni `eventos`");
    await as("authenticated", ADMIN, () => expectError(() => query("select public.redes_encolar_ficha('lugar', $1, '[]'::jsonb, false)", [L_SEMANA]), "22023", "el pedido es un objeto"));
    check((await trabajos(L_SEMANA)).length === 0, "nada guardado por lo que no se pudo");

    // --- Duplicado: en cola (o publicándose), el segundo toque no guarda otro, ni confirmando.
    const dos = await encolar(ADMIN, "lugar", L, {});
    check(dos?.duplicado === uno.id && !dos.id, "el segundo toque dice cuál va en camino y no guarda otro", dos);
    check((await encolar(ADMIN, "lugar", L, {}, true))?.duplicado === uno.id, "tampoco con «publicar otra vez»: ya va en camino");
    await query("update public.redes_trabajos set estado = 'publicando' where id = $1", [uno.id]);
    check((await encolar(ADMIN, "lugar", L, {}))?.duplicado === uno.id, "publicándose, también es duplicado");
    check((await trabajos(L)).length === 1, "sigue habiendo uno solo");

    // --- Repetido: ya salió en Instagram; sin confirmar no guarda y dice cuándo; confirmando, sí.
    await query("update public.redes_trabajos set estado = 'publicado', terminado_en = now() where id = $1", [uno.id]);
    await as("service_role", null, () => query("insert into public.instagram_publicaciones (lugar_id, formato, imagenes, estado, media_id) values ($1, '4x5', 1, 'publicada', '17900000000000515')", [L]));
    await query("update public.instagram_publicaciones set creado_en = now() - interval '9 days' where lugar_id = $1", [L]);
    const rep = await encolar(ADMIN, "lugar", L, {});
    check(typeof rep?.repetido === "string" && !rep.id && Date.now() - Date.parse(rep.repetido) > 8 * 86_400_000, "ya salió: dice cuándo y no guarda", rep);
    const otraVez = await encolar(ADMIN, "lugar", L, {}, true);
    check(typeof otraVez?.id === "string", "«Sí, publicar otra vez»: se guarda", otraVez);
    check((await trabajos(L)).length === 2, "dos trabajos del lugar (el publicado y el nuevo)");

    // --- Un día de la semana programado para más adelante no es duplicado (sale ese día); uno de hoy que ya toca, sí.
    const semana = await as("service_role", null, async () => (await query("insert into public.redes_trabajos (lugar_id, red, formato, pedido, siguiente_en) values ($1, 'instagram', '4x5', $2, now() + interval '3 days') returning id", [L_SEMANA, JSON.stringify({ tipo: "lugar", casilla: randomUUID(), facebook: true })])).rows[0].id);
    const conSemana = await encolar(ADMIN, "lugar", L_SEMANA, {});
    check(typeof conSemana?.id === "string", "con su día de la semana por venir, se puede publicar a mano ahora", conSemana);
    await query("delete from public.redes_trabajos where id = $1", [conSemana.id]);
    await query("update public.redes_trabajos set siguiente_en = now() where id = $1", [semana]);
    check((await encolar(ADMIN, "lugar", L_SEMANA, {}))?.duplicado === semana, "si su día ya toca (en cola ahora), va en camino: duplicado");
    await query("delete from public.redes_trabajos where id = $1", [semana]);

    // --- Dos toques a la vez (dos conexiones): solo uno se guarda.
    const aLaVez = () =>
      connection(async (c) => {
        await c.query("begin");
        await c.query("set local role authenticated");
        await c.query("select set_config('request.jwt.claim.sub', $1, true)", [ADMIN]);
        const r = (await c.query("select public.redes_encolar_ficha('lugar', $1, '{}'::jsonb, false) as r", [L_SEMANA])).rows[0].r;
        await c.query("select pg_sleep(0.3)");
        await c.query("commit");
        return r;
      });
    const [r1, r2] = await Promise.all([aLaVez(), aLaVez()]);
    const n = (await trabajos(L_SEMANA)).length;
    check([r1, r2].filter((r) => r.id).length === 1 && n === 1 && [r1, r2].some((r) => r.duplicado), "dos toques a la vez guardan un solo trabajo", { r1, r2, n });

    // --- Los permisos de la función.
    const p = (await query("select prosecdef, proconfig from pg_proc where oid = 'public.redes_encolar_ficha(text,uuid,jsonb,boolean)'::regprocedure")).rows[0];
    check(p?.prosecdef === true && p.proconfig?.includes('search_path=""'), "security definer con search_path vacío", p);
    const puede = async (rol) => (await query("select has_function_privilege($1, 'public.redes_encolar_ficha(text,uuid,jsonb,boolean)', 'execute') as ok", [rol])).rows[0].ok;
    check(!(await puede("anon")) && (await puede("authenticated")) && (await puede("service_role")), "solo authenticated y service_role la ejecutan");
  } finally {
    await query("delete from public.instagram_publicaciones where lugar_id = any($1::uuid[]) or artista_id = any($1::uuid[])", [todos]);
    await query("delete from public.redes_trabajos where lugar_id = any($1::uuid[]) or artista_id = any($1::uuid[])", [todos]);
    await query("delete from public.instagram_fuera where artista_id = any($1::uuid[])", [todos]);
  }
}
