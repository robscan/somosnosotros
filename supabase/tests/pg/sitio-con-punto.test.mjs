import { randomUUID } from "node:crypto";

// OL-348 (bitácora 377): todo sitio lleva su punto. Un evento está en un lugar del directorio, en un sitio reservado (su punto es privado)
// o en un sitio fuera del directorio con su punto público; el marco de un festival queda fuera (sus sedes salen de sus actos). La regla es
// NOT VALID: los eventos antiguos sin punto no se revisaron al crearla, pero no se pueden guardar hasta tener el suyo.
const AUTORA = randomUUID();
const base = {
  titulo: "Sitio con punto", inicio: "2030-11-13T01:00:00Z", fin: null,
  lugar_id: null, sitio_texto: "Jardín de prueba", sitio_direccion: null, sitio_lat: 22.15, sitio_lng: -100.98,
  sitio_reservado: false, sitio_revelar_desde: null, ciudad: "San Luis Potosí",
  zona: "America/Mexico_City", descripcion: null, imagen: null, precio: null, enlace: null,
};
const reservado = { ...base, sitio_texto: "Casa reservada", sitio_reservado: true, sitio_lat: null, sitio_lng: null, sitio_revelar_desde: "2030-11-12T01:00:00Z" };
const privado = { direccion: "Dirección privada de prueba", lat: 22.14, lng: -100.97, indicaciones: null, revelar_desde: reservado.sitio_revelar_desde };
const REGLA_ESTRICTA = "check (lugar_id is not null or sitio_reservado or (sitio_lat is not null and sitio_lng is not null)) not valid";
const REGLA = "check (clase = 'festival' or lugar_id is not null or sitio_reservado or (sitio_lat is not null and sitio_lng is not null)) not valid";

export async function run({ as, check, expectError, query }) {
  await query("insert into auth.users (id, email) values ($1, 'sitio-punto-autora@local.test')", [AUTORA]);
  const json = (v) => (v === null ? null : JSON.stringify(v));
  const guardar = (d, p = null, evento = null, revision = null) =>
    as("authenticated", AUTORA, async () =>
      (await query("select public.guardar_evento_completo($1::uuid, $2::jsonb, $3::jsonb, '[]'::jsonb, $4::timestamptz, $5::uuid) as r", [evento, json(d), json(p), revision, randomUUID()])).rows[0].r,
    );
  const fila = async (id) => (await query("select *, actualizado_en::text as revision from public.eventos where id = $1", [id])).rows[0];
  // Dentro de una transacción, `as` no sirve para lo que debe fallar (su `reset role` final cae en la transacción abortada y tapa el error):
  // ahí se actúa como la autora con `set local`, y cada intento que debe fallar va entre un punto de guardado y su vuelta atrás.
  const comoAutora = async () => {
    await query("select set_config('request.jwt.claim.sub', $1, true)", [AUTORA]);
    await query("set local role authenticated");
  };
  const debeFallar = async (sql, valores, etiqueta) => {
    await query("savepoint intento");
    await expectError(() => query(sql, valores), "23514", etiqueta);
    await query("rollback to savepoint intento");
  };

  // --- La regla existe, sin validar todavía, con su comentario.
  const { rows: [regla] } = await query(
    "select convalidated, pg_get_constraintdef(oid) as def, obj_description(oid, 'pg_constraint') as nota from pg_constraint where conname = 'eventos_sitio_con_punto' and conrelid = 'public.eventos'::regclass",
  );
  check(regla && !regla.convalidated && /clase = 'festival'/.test(regla.def) && /sitio_lat IS NOT NULL/.test(regla.def) && /OL-348/.test(regla.nota ?? ""), "la regla existe, NOT VALID y comentada", regla);

  // --- Altas: un sitio con su punto, un sitio reservado con su punto privado y un lugar del directorio entran; un sitio sin punto no.
  const conPunto = await guardar(base);
  check(!!conPunto?.id, "un sitio con su punto se publica");
  const conReserva = await guardar(reservado, privado);
  check(!!conReserva?.id && (await fila(conReserva.id)).sitio_lat === null, "un sitio reservado no pide punto público (el suyo es privado)");
  const { rows: [lugar] } = await query("insert into public.lugares (nombre, tipo, lat, lng, creado_por) values ('Lugar con punto OL-348', 'otro', 22.1, -100.9, $1) returning id", [AUTORA]);
  const enLugar = await guardar({ ...base, lugar_id: lugar.id, sitio_texto: null, sitio_lat: null, sitio_lng: null });
  check(!!enLugar?.id, "un evento en un lugar del directorio no pide punto propio");
  for (const punto of [{ sitio_lat: null, sitio_lng: null }, { sitio_lat: 22.15, sitio_lng: null }, { sitio_lat: null, sitio_lng: -100.98 }]) {
    await expectError(() => guardar({ ...base, ...punto }), "23514", `un sitio sin punto completo no se publica: ${JSON.stringify(punto)}`);
  }
  await expectError(
    () => as("authenticated", AUTORA, () => query("insert into public.eventos (titulo, inicio, sitio_texto, creado_por) values ('Directo', now() + interval '1 day', 'Sitio sin punto', auth.uid())")),
    "23514",
    "tampoco por escritura directa",
  );

  // --- Editar: quitar el punto, o pasar de un lugar a un sitio sin punto, se rechaza; el evento queda como estaba.
  const antes = await fila(conPunto.id);
  await expectError(() => guardar({ ...base, sitio_lat: null, sitio_lng: null }, null, conPunto.id, antes.revision), "23514", "editar no quita el punto");
  await expectError(() => as("authenticated", AUTORA, () => query("update public.eventos set sitio_lat = null, sitio_lng = null where id = $1", [conPunto.id])), "23514", "ni por escritura directa");
  const deLugar = await fila(enLugar.id);
  await expectError(() => guardar({ ...base, sitio_lat: null, sitio_lng: null }, null, enLugar.id, deLugar.revision), "23514", "un evento de un lugar no pasa a un sitio sin punto");
  check((await fila(conPunto.id)).revision === antes.revision && (await fila(enLugar.id)).lugar_id === lugar.id, "los rechazos no cambian nada");

  // --- Los eventos antiguos sin punto (NOT VALID): la regla no los tocó al crearse, pero ya no se guardan sin su punto; con él, sí. Y la
  //     regla solo se puede validar cuando ya no queda ninguno. Todo dentro de una transacción que se deshace.
  await query("begin");
  try {
    await query("alter table public.eventos drop constraint eventos_sitio_con_punto");
    const { rows: [viejo] } = await query("insert into public.eventos (titulo, inicio, sitio_texto, creado_por) values ('Antiguo sin punto', now() + interval '2 days', 'Plaza antigua', $1) returning id", [AUTORA]);
    await query(`alter table public.eventos add constraint eventos_sitio_con_punto ${REGLA}`);
    check((await fila(viejo.id))?.sitio_lat === null, "un evento antiguo sin punto sigue ahí al crear la regla");
    await debeFallar("alter table public.eventos validate constraint eventos_sitio_con_punto", [], "la regla no se valida mientras quede uno sin punto");
    await comoAutora();
    await debeFallar("update public.eventos set titulo = 'Otro título' where id = $1", [viejo.id], "un evento antiguo sin punto no se guarda sin su punto");
    await query("update public.eventos set titulo = 'Con su punto', sitio_lat = 22.16, sitio_lng = -100.99 where id = $1", [viejo.id]);
    check((await fila(viejo.id)).titulo === "Con su punto", "con su punto, el evento antiguo se guarda");
    await query("reset role");
    await query("alter table public.eventos validate constraint eventos_sitio_con_punto");
    const { rows: [validada] } = await query("select convalidated from pg_constraint where conname = 'eventos_sitio_con_punto' and conrelid = 'public.eventos'::regclass");
    check(validada.convalidated, "sin eventos antiguos sin punto, la regla se valida");
  } finally {
    await query("rollback");
  }

  // --- El marco de un festival queda fuera: tres de las funciones que crean un marco lo insertan ya como festival con el nombre de su primer
  //     acto, sin punto si ese acto es un sitio reservado, y `recalcular_festival` lo reescribe después. Aquí se imita esa fila.
  const { rows: [marcoSinPunto] } = await query(
    "insert into public.eventos (titulo, inicio, sitio_texto, creado_por, clase) values ('Festival en casa', now() + interval '3 days', 'Casa reservada', $1, 'festival') returning id",
    [AUTORA],
  );
  await as("authenticated", AUTORA, () => query("update public.eventos set inicio = now() + interval '4 days' where id = $1", [marcoSinPunto.id]));
  check(!!marcoSinPunto?.id, "el marco de un festival con el nombre de un sitio reservado se guarda y se reprograma sin punto");
  await query("begin");
  try {
    await query("alter table public.eventos drop constraint eventos_sitio_con_punto");
    await query(`alter table public.eventos add constraint eventos_sitio_con_punto ${REGLA_ESTRICTA}`);
    await comoAutora();
    await debeFallar("update public.eventos set inicio = now() + interval '5 days' where id = $1", [marcoSinPunto.id], "sin la excepción, ese marco ya no se podría reprogramar");
    await debeFallar(
      "insert into public.eventos (titulo, inicio, sitio_texto, creado_por, clase) values ('Otro festival', now() + interval '3 days', 'Casa reservada', auth.uid(), 'festival')",
      [],
      "ni crear",
    );
  } finally {
    await query("rollback");
  }

  // --- `publicar_programa` crea el marco como evento y después lo vuelve festival: con un primer acto en un sitio reservado, el marco es
  //     reservado como él, con su misma dirección privada; nunca un sitio sin punto ni un punto privado a la vista.
  const actos = [
    { datos: { ...reservado, titulo: "Apertura en casa", inicio: "2030-11-13T01:00:00Z" }, privado, quien: [], publicar: true, operacion: randomUUID() },
    { datos: { ...base, titulo: "Cierre en el jardín", inicio: "2030-11-14T01:00:00Z" }, quien: [], publicar: true, operacion: randomUUID() },
  ];
  const marco = { datos: { titulo: "Festival con sede reservada", imagen: null, precio: null, descripcion: null, enlace: null }, quien: [] };
  const publicar = (lista, op) => as("authenticated", AUTORA, async () => (await query("select public.publicar_programa($1::jsonb, $2::jsonb, $3::uuid) as r", [json(marco), json(lista), op])).rows[0].r);
  const op = randomUUID();
  const programa = await publicar(actos, op);
  const festival = await fila(op);
  const privadoMarco = (await query("select direccion, lat, lng from public.eventos_sitio_privado where evento_id = $1", [op])).rows[0];
  check(
    programa.actos.length === 2 && festival.clase === "festival" && festival.sitio_reservado && festival.sitio_texto === "Casa reservada" && festival.sitio_lat === null,
    "el programa se publica y su marco es reservado como su primer acto",
    festival,
  );
  check(privadoMarco?.direccion === privado.direccion && privadoMarco.lat === privado.lat, "con la misma dirección privada de ese acto", privadoMarco);
  const op2 = randomUUID();
  await publicar([{ ...actos[1], operacion: randomUUID() }, { ...actos[0], operacion: randomUUID() }], op2);
  const festival2 = await fila(op2);
  check(!festival2.sitio_reservado && festival2.sitio_lat === base.sitio_lat && festival2.sitio_texto === base.sitio_texto, "con un primer acto público, el marco toma su sitio y su punto, como siempre", festival2);

  await query("delete from public.eventos where creado_por = $1", [AUTORA]);
  await query("delete from public.lugares where creado_por = $1", [AUTORA]);
  await query("delete from auth.users where id = $1", [AUTORA]);
}
