import { randomUUID } from "node:crypto";

// OL-319 (bitácora 348): `editar_evento_con_sesiones`, la función con que se guarda un evento editado por pasos. Con sesiones, la de OL-311
// tal cual (las reemplaza); sin ellas, el evento como siempre y sin filas de sesiones, en la misma transacción. Zona: America/Mexico_City.
const AUTORA = randomUUID();
const OTRA = randomUUID();
const ADMIN = randomUUID();

const datos = {
  titulo: "Festival para editar", inicio: "2030-10-10T02:00:00Z", fin: "2030-10-12T03:00:00Z",
  lugar_id: null, sitio_texto: "Plaza de prueba", sitio_lat: 22.15, sitio_lng: -100.98,
  sitio_reservado: false, sitio_revelar_desde: null, ciudad: "San Luis Potosí",
  zona: "America/Mexico_City", descripcion: null, imagen: null, precio: null, enlace: null,
};
// vie 9 de 20:00 a 21:00 · sáb 10 de 18:00 a 21:00 · dom 11 de 20:00 a 21:00 (hora de San Luis).
const sesiones = [
  { inicio: "2030-10-10T02:00:00Z", fin: "2030-10-10T03:00:00Z" },
  { inicio: "2030-10-11T00:00:00Z", fin: "2030-10-11T03:00:00Z" },
  { inicio: "2030-10-12T02:00:00Z", fin: "2030-10-12T03:00:00Z" },
];

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('editar-sesiones-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'editar-sesiones-autora@local.test'), ($2, 'editar-sesiones-otra@local.test'), ($3, 'editar-sesiones-admin@local.test')", [AUTORA, OTRA, ADMIN]);
  await query("update public.avisos_config set capturar = true, corte = clock_timestamp()");
  const json = (v) => (v === null ? null : JSON.stringify(v));
  const crear = (d, lista) =>
    as("authenticated", AUTORA, async () => (await query("select public.guardar_evento_con_sesiones(null, $1::jsonb, null, '[]'::jsonb, $2::jsonb, null, $3::uuid) as r", [json(d), json(lista), randomUUID()])).rows[0].r);
  const revision = async (id) => (await query("select actualizado_en::text as v from public.eventos where id = $1", [id])).rows[0].v;
  // La versión que se edita es la de ahora (como la lee la pantalla al abrir), salvo que la prueba diga otra.
  const editar = async (quien, id, d, lista, operacion = randomUUID(), rev = undefined) => {
    const version = rev === undefined ? await revision(id) : rev;
    return as("authenticated", quien, async () => (await query("select public.editar_evento_con_sesiones($1::uuid, $2::jsonb, null, '[]'::jsonb, $3::jsonb, $4::timestamptz, $5::uuid) as r", [id, json(d), json(lista), version, operacion])).rows[0].r);
  };
  const filas = async (id) => (await query("select fecha::text as fecha, inicio::text as inicio from public.eventos_sesiones where evento_id = $1 order by fecha", [id])).rows;
  const titulo = async (id) => (await query("select titulo from public.eventos where id = $1", [id])).rows[0].titulo;

  // --- Con sesiones: se reemplazan (otro horario el sábado), en la misma transacción que el evento.
  const creado = await crear(datos, sesiones);
  check((await filas(creado.id)).length === 3, "el evento de partida tiene tres sesiones");
  const otroSabado = [sesiones[0], { inicio: "2030-10-11T01:00:00Z", fin: "2030-10-11T03:00:00Z" }, sesiones[2]];
  const editado = await editar(AUTORA, creado.id, { ...datos, titulo: "Festival editado" }, otroSabado);
  const tras = await filas(creado.id);
  check(editado.id === creado.id && tras.length === 3 && tras[1].inicio.startsWith("2030-10-11 01:00:00"), "editar con sesiones las reemplaza (el sábado empieza a las 19:00)");
  check((await titulo(creado.id)) === "Festival editado", "editar con sesiones guarda también el evento");

  // --- Sin sesiones (la casilla «Mismo horario todos los días» marcada otra vez): el evento sin filas.
  const comun = await editar(AUTORA, creado.id, { ...datos, titulo: "Festival con el mismo horario" }, null);
  check(comun.id === creado.id && (await filas(creado.id)).length === 0, "editar sin sesiones borra las de antes");
  check((await titulo(creado.id)) === "Festival con el mismo horario", "editar sin sesiones guarda el evento");

  // --- El reintento de la última operación (la respuesta se perdió y la pantalla manda otra vez la misma clave) no toca nada.
  const operacion = randomUUID();
  await editar(AUTORA, creado.id, datos, sesiones, operacion);
  const repetido = await editar(AUTORA, creado.id, datos, null, operacion);
  check(repetido.repetido === true && (await filas(creado.id)).length === 3, "un reintento de una operación ya guardada no borra sesiones");

  // --- Un evento que nunca tuvo sesiones se edita igual, sin filas.
  const sencillo = await crear({ ...datos, titulo: "Festival sin sesiones" }, null);
  await editar(AUTORA, sencillo.id, { ...datos, titulo: "Festival sin sesiones, editado" }, null);
  check((await filas(sencillo.id)).length === 0 && (await titulo(sencillo.id)) === "Festival sin sesiones, editado", "editar un evento sin sesiones no crea filas");

  // --- Lo inválido revierte todo: el evento no cambia y sus sesiones siguen.
  const antes = await titulo(creado.id);
  await expectError(() => editar(AUTORA, creado.id, { ...datos, titulo: "Festival rechazado" }, [sesiones[0], sesiones[1]]), "22023", "sesiones que no llegan al último día se rechazan");
  check((await titulo(creado.id)) === antes && (await filas(creado.id)).length === 3, "un rechazo no deja el evento a medias ni borra sus sesiones");
  await expectError(() => editar(AUTORA, creado.id, datos, null, randomUUID(), "2001-01-01T00:00:00Z"), "40001", "una versión vieja no se guarda (conflicto)");
  check((await filas(creado.id)).length === 3, "tras el conflicto las sesiones siguen ahí");

  // --- Permisos: solo un evento que existe, su autora o la administración; anon no ejecuta.
  await expectError(() => as("authenticated", AUTORA, () => query("select public.editar_evento_con_sesiones(null, $1::jsonb, null, '[]'::jsonb, null, null, $2::uuid)", [json(datos), randomUUID()])), "22023", "sin evento no es editar");
  await expectError(() => editar(OTRA, creado.id, datos, null), "42501", "otra cuenta no edita el evento");
  check((await filas(creado.id)).length === 3, "el intento de otra cuenta no tocó las sesiones");
  await editar(ADMIN, creado.id, { ...datos, titulo: "Festival de la administración" }, null);
  check((await filas(creado.id)).length === 0, "la administración edita y quita el horario por día");
  await as("anon", null, () => expectError(() => query("select public.editar_evento_con_sesiones($1::uuid, $2::jsonb, null, '[]'::jsonb, null, null, $3::uuid)", [creado.id, json(datos), randomUUID()]), "42501", "anon no ejecuta la función"));
}
