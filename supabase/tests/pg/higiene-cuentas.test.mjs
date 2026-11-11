import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

// OL-512 (bitácora 545), migración 20261109100000_higiene_cuentas.sql: el nombre al entrar ya no sale del correo; un perfil sin correo confirmado
// no se lee en público; sin sesión no se lee `rol`; «quién va» y «quién sigue» solo con lo ligado a la vista; el cartel a un evento ajeno, solo con
// una imagen de la carpeta propia.
const FOTOS = "https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos";

export async function run({ as, check, expectError, query }) {
  // Se puede aplicar dos veces (el gestor la aplica en producción antes de unir): aquí va la segunda, y todo lo de abajo corre después.
  await query(readFileSync(new URL("../../migrations/20261109100000_higiene_cuentas.sql", import.meta.url), "utf8"));
  const nueva = randomUUID(), conNombre = randomUUID(), conName = randomUUID(), enBlanco = randomUUID();
  const confirmada = randomUUID(), sinConfirmar = randomUUID(), jefa = randomUUID();
  await query("insert into public.admin_correos (correo) values ('ol512-jefa@local.test')");
  await query(
    `insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
      ($1, 'maria.lopez.ol512@local.test', '{}', now()),
      ($2, 'pedro.ol512@local.test', '{"full_name":"Pedro Páramo"}', now()),
      ($3, 'susana.ol512@local.test', '{"name":"Susana San Juan"}', now()),
      ($4, 'blanco.ol512@local.test', '{"full_name":"   "}', now()),
      ($5, 'confirmada.ol512@local.test', '{"full_name":"Confirmada"}', now()),
      ($6, 'sinconfirmar.ol512@local.test', '{"full_name":"Sin confirmar"}', null),
      ($7, 'ol512-jefa@local.test', '{}', now())`,
    [nueva, conNombre, conName, enBlanco, confirmada, sinConfirmar, jefa],
  );
  const nombreDe = async (id) => (await query("select nombre, rol, avisos_correo from public.perfiles where id = $1", [id])).rows[0];

  // ---------- 1. el alta sin la parte del correo ----------
  const n = await nombreDe(nueva);
  check(n.nombre === "", "1: sin nombre del proveedor, el perfil nace con el nombre vacío", n);
  check(!n.nombre.includes("maria.lopez"), "1: el nombre por defecto no contiene la parte local del correo", n);
  check(n.avisos_correo === true && n.rol === "usuario", "1: lo demás del alta sigue igual (correo encendido, rol usuario)", n);
  check((await nombreDe(conNombre)).nombre === "Pedro Páramo", "1: el nombre que da el proveedor (full_name) se conserva");
  check((await nombreDe(conName)).nombre === "Susana San Juan", "1: el nombre que da el proveedor (name) se conserva");
  check((await nombreDe(enBlanco)).nombre === "", "1: un nombre en blanco del proveedor no se vuelve el correo");
  check((await nombreDe(jefa)).rol === "admin", "1: el rol por admin_correos sigue");
  const cuerpo = (await query("select prosrc from pg_proc where oid = 'public.crear_perfil()'::regprocedure")).rows[0].prosrc;
  check(!/split_part\s*\(\s*new\.email/.test(cuerpo), "1: crear_perfil ya no parte el correo");

  // ---------- 2. un perfil sin correo confirmado no se lee en público ----------
  const f = (await query(`select prosecdef, proconfig, provolatile, has_function_privilege('anon', oid, 'execute') anon,
    has_function_privilege('authenticated', oid, 'execute') auth from pg_proc where oid = 'public.perfil_legible(uuid)'::regprocedure`)).rows[0];
  check(f.prosecdef && f.proconfig.includes('search_path=""') && f.provolatile === "s" && f.anon && f.auth,
    "2: perfil_legible es definer, stable, con la ruta vacía y la ejecutan anon y authenticated", f);
  const ve = async (rol, quien, id) => (await as(rol, quien, () => query("select id, nombre from public.perfiles where id = $1", [id]))).rowCount === 1;
  check(await ve("anon", null, confirmada), "2: sin sesión se lee un perfil confirmado");
  check(!(await ve("anon", null, sinConfirmar)), "2: sin sesión no se lee un perfil sin confirmar");
  check(!(await ve("authenticated", confirmada, sinConfirmar)), "2: otra cuenta no lee un perfil sin confirmar");
  check(await ve("authenticated", sinConfirmar, sinConfirmar), "2: la dueña siempre se ve a sí misma");
  check(await ve("authenticated", jefa, sinConfirmar), "2: la administración ve todo");
  await as("authenticated", sinConfirmar, async () => {
    check((await query("select public.mi_perfil() p")).rows[0].p?.id === sinConfirmar, "2: mi_perfil sigue para la cuenta sin confirmar");
    check((await query("update public.perfiles set nombre = 'Ya con nombre' where id = auth.uid() returning id")).rowCount === 1, "2: la cuenta sin confirmar edita su ficha");
  });
  // La regla no se llama a sí misma: la administración lee y su comprobación funciona con la regla nueva.
  await as("authenticated", jefa, async () => {
    check((await query("select public.es_admin() a")).rows[0].a === true, "2: es_admin de la administración sigue siendo sí");
    check(Number((await query("select count(*) n from public.perfiles")).rows[0].n) >= 7, "2: la administración cuenta todos los perfiles sin recursión");
  });
  await as("authenticated", confirmada, async () => check((await query("select public.es_admin() a")).rows[0].a === false, "2: es_admin de otra cuenta, no"));

  // ---------- 3. la columna rol, fuera de la lectura sin sesión ----------
  await as("anon", null, async () => {
    await expectError(() => query("select rol from public.perfiles where id = $1", [confirmada]), "42501", "3: sin sesión no se lee rol");
    await expectError(() => query("select id from public.perfiles where rol = 'admin'"), "42501", "3: sin sesión no se filtra por rol");
    check((await query("select id, nombre, foto, colonia, bio, reservado from public.perfiles where id = $1", [confirmada])).rowCount === 1, "3: sin sesión, lo público de la ficha sí");
    check((await query("select public.es_admin() a")).rows[0].a === false, "3: es_admin sin sesión es no, sin error");
  });
  await as("anon", jefa, async () => check((await query("select public.es_admin() a")).rows[0].a === false, "3: anon con un identificador tampoco es administración"));
  await as("authenticated", confirmada, async () => check((await query("select rol from public.perfiles where id = auth.uid()")).rows[0]?.rol === "usuario", "3: con sesión, el rol propio se lee"));

  // ---------- 4. asistencias y seguimientos con lo ligado a la vista ----------
  const lugar = randomUUID(), lugarOculto = randomUUID(), visible = randomUUID(), oculto = randomUUID(), artistaOculto = randomUUID(), artista = randomUUID();
  await query("insert into public.lugares (id, nombre, tipo, direccion, lat, lng, creado_por) values ($1, 'Foro OL-512', 'foro', 'Calle ficticia', 22.15, -100.98, $3), ($2, 'Foro oculto OL-512', 'foro', 'Calle ficticia', 22.15, -100.98, $3)", [lugar, lugarOculto, jefa]);
  await query("update public.lugares set visible = false where id = $1", [lugarOculto]);
  await query("insert into public.eventos (id, lugar_id, titulo, inicio, creado_por) values ($1, $3, 'Visible OL-512', now() + interval '2 days', $4), ($2, $3, 'Oculto OL-512', now() + interval '2 days', $4)", [visible, oculto, lugar, jefa]);
  await query("update public.eventos set visible = false where id = $1", [oculto]);
  await query("insert into public.artistas (id, nombre, disciplina, creado_por) values ($1, 'Artista OL-512', 'musica', $3), ($2, 'Artista oculto OL-512', 'musica', $3)", [artista, artistaOculto, jefa]);
  await query("update public.artistas set visible = false where id = $1", [artistaOculto]);
  await query("insert into public.asistencias (usuario_id, evento_id, estado) values ($1, $2, 'voy'), ($1, $3, 'voy')", [confirmada, visible, oculto]);
  await query("insert into public.seguimientos (usuario_id, lugar_id) values ($1, $2), ($1, $3)", [confirmada, lugar, lugarOculto]);
  await query("insert into public.seguimientos (usuario_id, artista_id) values ($1, $2), ($1, $3)", [confirmada, artista, artistaOculto]);
  const asistencias = async (rol, quien, ev) => (await as(rol, quien, () => query("select 1 from public.asistencias where usuario_id = $1 and evento_id = $2", [confirmada, ev]))).rowCount;
  const sigue = async (rol, quien, col, id) => (await as(rol, quien, () => query(`select 1 from public.seguimientos where usuario_id = $1 and ${col} = $2`, [confirmada, id]))).rowCount;
  check(await asistencias("anon", null, visible) === 1, "4: sin sesión, una asistencia a un evento visible se lee");
  check(await asistencias("anon", null, oculto) === 0, "4: sin sesión, una asistencia a un evento oculto no se lee");
  check(await asistencias("authenticated", sinConfirmar, oculto) === 0, "4: otra cuenta tampoco");
  check(await asistencias("authenticated", confirmada, oculto) === 1, "4: la dueña ve la suya aunque el evento esté oculto");
  check(await asistencias("authenticated", jefa, oculto) === 1, "4: la administración la ve");
  check(await sigue("anon", null, "lugar_id", lugar) === 1, "4: sin sesión, seguir un lugar visible se lee");
  check(await sigue("anon", null, "lugar_id", lugarOculto) === 0, "4: sin sesión, seguir un lugar oculto no se lee");
  check(await sigue("anon", null, "artista_id", artista) === 1, "4: sin sesión, seguir un artista visible se lee");
  check(await sigue("anon", null, "artista_id", artistaOculto) === 0, "4: sin sesión, seguir un artista oculto no se lee");
  check(await sigue("authenticated", confirmada, "artista_id", artistaOculto) === 1, "4: la dueña ve lo que sigue aunque esté oculto");
  check(await sigue("authenticated", jefa, "lugar_id", lugarOculto) === 1, "4: la administración lo ve");
  await query("update public.perfiles set reservado = true where id = $1", [confirmada]);
  check(await asistencias("anon", null, visible) === 0, "4: un perfil reservado sigue sin mostrar a qué va");
  await query("update public.perfiles set reservado = false where id = $1", [confirmada]);
  await as("anon", null, async () => check(Number((await query("select n from public.van_por_evento($1)", [[visible]])).rows[0]?.n) === 1, "4: el conteo de quién va sigue"));

  // ---------- 5. el cartel a un evento ajeno, solo con una imagen de la carpeta propia ----------
  const ponerA = (quien, evento, imagen) => as("authenticated", quien, () => query("select public.poner_cartel_a_evento($1::uuid, $2) r", [evento, imagen]));
  const sinCartel = randomUUID();
  await query("insert into public.eventos (id, lugar_id, titulo, inicio, creado_por) values ($1, $2, 'Sin cartel OL-512', now() + interval '3 days', $3)", [sinCartel, lugar, jefa]);
  await expectError(() => ponerA(confirmada, sinCartel, `${FOTOS}/lugares/${sinConfirmar}/cartel-foto-1.jpg`), "22023", "5: una imagen de la carpeta de otra cuenta se rechaza");
  await expectError(() => ponerA(confirmada, sinCartel, `${FOTOS}/perfiles/${confirmada}/foto-1.jpg`), "22023", "5: una imagen de otra carpeta propia (perfiles) se rechaza");
  await expectError(() => ponerA(confirmada, sinCartel, `${FOTOS}/lugares/${confirmada}/sub/cartel.jpg`), "22023", "5: una subcarpeta se rechaza");
  await expectError(() => ponerA(confirmada, sinCartel, `${FOTOS}/lugares/${confirmada}/cartel.jpg?v=1`), "22023", "5: con consulta se rechaza");
  await expectError(() => ponerA(confirmada, sinCartel, `${FOTOS}/lugares/${confirmada}/cartel-generado-1.jpg`), "22023", "5: un cartel hecho aquí no se usa como foto");
  check((await query("select imagen from public.eventos where id = $1", [sinCartel])).rows[0].imagen === null, "5: los rechazos no dejan nada");
  const propia = `${FOTOS}/lugares/${confirmada}/cartel-foto-ol512.jpg`;
  const r = (await ponerA(confirmada, sinCartel, propia)).rows[0].r;
  check(r?.id === sinCartel && (await query("select imagen from public.eventos where id = $1", [sinCartel])).rows[0].imagen === propia, "5: la imagen de la carpeta propia pasa", r);

  console.log("Higiene de cuentas (OL-512): nombre sin correo, perfiles sin confirmar fuera de lo público, rol sin sesión, lo ligado a la vista y el cartel de la carpeta propia");
}
