import { randomUUID } from "node:crypto";

// OL-311 (bitácora 339): la tabla `eventos_sesiones` y `guardar_evento_con_sesiones`. Zona de las pruebas: America/Mexico_City (UTC−6 en 2030).
const AUTORA = randomUUID();
const OTRA = randomUUID();
const ADMIN = randomUUID();

const datos = {
  titulo: "Festival de tres días", inicio: "2030-10-10T02:00:00Z", fin: "2030-10-12T03:00:00Z",
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
  await query("insert into public.admin_correos (correo) values ('sesiones-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'sesiones-autora@local.test'), ($2, 'sesiones-otra@local.test'), ($3, 'sesiones-admin@local.test')", [AUTORA, OTRA, ADMIN]);
  // La función pasa por `guardar_evento_con_avisos`, que exige la captura de avisos encendida.
  await query("update public.avisos_config set capturar = true, corte = clock_timestamp()");
  const rpc = (quien, d = datos, lista = sesiones, operacion = randomUUID()) =>
    as("authenticated", quien, async () => (await query("select public.guardar_evento_con_sesiones(null, $1::jsonb, null, '[]'::jsonb, $2::jsonb, null, $3::uuid) as r", [JSON.stringify(d), lista === null ? null : JSON.stringify(lista), operacion])).rows[0].r);
  const filas = async (id) => (await query("select fecha::text as fecha, inicio::text as inicio, fin::text as fin from public.eventos_sesiones where evento_id = $1 order by fecha", [id])).rows;
  const eventos = async () => (await query("select count(*)::int as n from public.eventos where titulo like 'Festival%'")).rows[0].n;

  // --- Crear con sesiones: el evento y sus tres días, en la misma transacción.
  const operacion = randomUUID();
  const creado = await rpc(AUTORA, datos, sesiones, operacion);
  const tres = await filas(creado.id);
  check(tres.length === 3, "crear con sesiones guarda una fila por día");
  check(tres.map((f) => f.fecha).join() === "2030-10-09,2030-10-10,2030-10-11", "el día de cada sesión sale de su inicio en la zona del evento (la primera, a las 20:00 locales, cae en el 9 y no en el 10 de UTC)");
  check(tres[1].fin !== null && tres[1].inicio.startsWith("2030-10-11 00:00:00"), "cada día conserva su hora: el sábado empieza a las 18:00 locales");
  const evento = (await query("select inicio::text as inicio, fin::text as fin from public.eventos where id = $1", [creado.id])).rows[0];
  check(evento.inicio.startsWith("2030-10-10 02:00:00") && evento.fin.startsWith("2030-10-12 03:00:00"), "el evento sigue con su inicio y su fin de siempre");

  // --- Reintento de la misma operación: no repite las filas.
  const repetido = await rpc(AUTORA, datos, sesiones, operacion);
  check(repetido.repetido === true && (await filas(creado.id)).length === 3, "reintentar la misma operación no duplica las sesiones");

  // --- Sin sesiones (la casilla marcada): ninguna fila, como hoy.
  const sin = await rpc(AUTORA, { ...datos, titulo: "Festival sin sesiones" }, null);
  check((await filas(sin.id)).length === 0, "con p_sesiones nulo no se inserta ninguna fila");

  // --- Sin hora de fin en un día: fin nulo.
  const conVacio = await rpc(AUTORA, { ...datos, titulo: "Festival con un día sin fin" }, [sesiones[0], { inicio: sesiones[1].inicio, fin: null }, sesiones[2]]);
  check((await filas(conVacio.id))[1].fin === null, "un día sin hora de fin guarda el fin nulo");

  // --- Lo inválido revierte todo, el evento también.
  const antes = await eventos();
  const rechazo = (lista, etiqueta, codigo = "22023") => expectError(() => rpc(AUTORA, { ...datos, titulo: "Festival rechazado" }, lista), codigo, etiqueta);
  await rechazo([sesiones[0]], "una sola sesión no es un evento por días");
  await rechazo(Array.from({ length: 32 }, (_, i) => ({ inicio: `2030-11-${String((i % 28) + 1).padStart(2, "0")}T02:00:00Z`, fin: null })), "más de 31 sesiones se rechazan");
  await rechazo([sesiones[0], sesiones[0], sesiones[2]], "un día repetido se rechaza", "23505");
  await rechazo([sesiones[0], { inicio: sesiones[1].inicio, fin: sesiones[1].inicio }, sesiones[2]], "un fin que no es posterior al inicio se rechaza", "23514");
  await rechazo([sesiones[0], { inicio: sesiones[1].inicio, fin: "2030-10-11T07:00:00Z" }, sesiones[2]], "un fin que pasa del final de su día se rechaza");
  await rechazo([sesiones[0], { inicio: "2030-10-20T02:00:00Z", fin: null }, sesiones[2]], "una sesión fuera de los días del evento se rechaza");
  await rechazo([{ inicio: "2030-10-10T03:00:00Z", fin: null }, sesiones[1], sesiones[2]], "la primera sesión debe empezar cuando empieza el evento");
  await rechazo([sesiones[0], sesiones[1]], "la última sesión debe caer en el día en que termina el evento");
  await rechazo([sesiones[0], { fin: null }, sesiones[2]], "una sesión sin inicio se rechaza");
  check((await eventos()) === antes, "ningún rechazo deja un evento a medias");
  await expectError(() => rpc(AUTORA, { ...datos, titulo: "Festival rechazado", fin: null }, sesiones), "22023", "un evento sin fin no admite sesiones");

  // --- Permisos de la función.
  await as("anon", null, () => expectError(() => query("select public.guardar_evento_con_sesiones(null, $1::jsonb, null, '[]'::jsonb, null, null, $2::uuid)", [JSON.stringify(datos), randomUUID()]), "42501", "anon no guarda eventos con sesiones"));

  // --- Lectura: quien ve el evento ve sus sesiones; un evento oculto, solo su autor y la administración.
  const visibles = async (quien) => as(quien ? "authenticated" : "anon", quien, async () => (await query("select count(*)::int as n from public.eventos_sesiones where evento_id = $1", [creado.id])).rows[0].n);
  check((await visibles(null)) === 3 && (await visibles(OTRA)) === 3, "las sesiones de un evento visible las lee cualquiera, también sin sesión");
  await query("update public.eventos set visible = false where id = $1", [creado.id]);
  check((await visibles(null)) === 0 && (await visibles(OTRA)) === 0, "con el evento oculto, las sesiones no se leen");
  check((await visibles(AUTORA)) === 3 && (await visibles(ADMIN)) === 3, "con el evento oculto, su autora y la administración las siguen leyendo");
  await query("update public.eventos set visible = true where id = $1", [creado.id]);

  // --- Escritura directa: su autora y la administración; nadie más.
  const dia12 = { inicio: "2030-10-13T02:00:00Z" };
  await as("authenticated", OTRA, () => expectError(() => query("insert into public.eventos_sesiones (evento_id, fecha, inicio) values ($1, '2030-10-12', $2)", [creado.id, dia12.inicio]), "42501", "otra cuenta no agrega sesiones"));
  const ajenas = await as("authenticated", OTRA, async () => ({
    cambio: (await query("update public.eventos_sesiones set fin = null where evento_id = $1", [creado.id])).rowCount,
    borrado: (await query("delete from public.eventos_sesiones where evento_id = $1", [creado.id])).rowCount,
  }));
  check(ajenas.cambio === 0 && ajenas.borrado === 0 && (await filas(creado.id)).length === 3, "otra cuenta no edita ni borra sesiones ajenas");
  const propias = await as("authenticated", AUTORA, async () => (await query("update public.eventos_sesiones set fin = fin + interval '30 minutes' where evento_id = $1 and fecha = '2030-10-09'", [creado.id])).rowCount);
  check(propias === 1, "la autora edita las sesiones de su evento");
  const deAdmin = await as("authenticated", ADMIN, async () => (await query("update public.eventos_sesiones set fin = fin - interval '30 minutes' where evento_id = $1 and fecha = '2030-10-09'", [creado.id])).rowCount);
  check(deAdmin === 1, "la administración edita las sesiones de cualquier evento");
  await as("anon", null, () => expectError(() => query("insert into public.eventos_sesiones (evento_id, fecha, inicio) values ($1, '2030-10-12', $2)", [creado.id, dia12.inicio]), "42501", "anon no escribe sesiones"));

  // --- Borrar el evento se lleva sus sesiones.
  await as("authenticated", AUTORA, () => query("delete from public.eventos where id = $1", [creado.id]));
  check((await filas(creado.id)).length === 0, "borrar el evento borra sus sesiones");
}
