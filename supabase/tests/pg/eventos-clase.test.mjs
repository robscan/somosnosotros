import { randomUUID } from "node:crypto";

// OL-321 (bitácora 350): la clase de un evento (exposición, taller, festival), su horario propio, la inauguración ligada, «Parte de un
// festival» y publicar un programa (H6) en una sola operación. Zona: America/Mexico_City (UTC−6).
const AUTORA = randomUUID();
const OTRA = randomUUID();
const ADMIN = randomUUID();

const base = {
  titulo: "Ecos de papel", inicio: "2030-11-06T06:00:00Z", fin: "2030-12-01T05:59:00Z",
  lugar_id: null, sitio_texto: "Museo de prueba", sitio_lat: 22.15, sitio_lng: -100.98,
  sitio_reservado: false, sitio_revelar_desde: null, ciudad: "San Luis Potosí",
  zona: "America/Mexico_City", descripcion: null, imagen: null, precio: null, enlace: null,
};
// Un acto puntual: vie 13 de nov, 18:00 a 20:00 (hora de San Luis).
const acto = (titulo, inicio, fin) => ({ ...base, titulo, inicio, fin });

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('clase-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'clase-autora@local.test'), ($2, 'clase-otra@local.test'), ($3, 'clase-admin@local.test')", [AUTORA, OTRA, ADMIN]);
  await query("update public.avisos_config set capturar = true, corte = clock_timestamp()");
  const json = (v) => (v === null ? null : JSON.stringify(v));
  const guardar = (quien, d, clase, { sesiones = null, evento = null, revision = null, operacion = randomUUID() } = {}) =>
    as("authenticated", quien, async () =>
      (await query("select public.guardar_evento_con_clase($1::uuid, $2::jsonb, null, '[]'::jsonb, $3::jsonb, $4::jsonb, $5::timestamptz, $6::uuid) as r", [evento, json(d), json(sesiones), json(clase), revision, operacion])).rows[0].r,
    );
  const fila = async (id) => (await query("select * from public.eventos where id = $1", [id])).rows[0];
  const revision = async (id) => (await query("select actualizado_en::text as v from public.eventos where id = $1", [id])).rows[0].v;
  const cuantos = async () => Number((await query("select count(*) as n from public.eventos")).rows[0].n);
  const horario = [{ dias: [2, 3, 4, 5, 6, 7], abre: "10:00", cierra: "18:00" }];

  // --- Exposición: la clase, su horario propio y la inauguración (un acto puntual ligado, con el mismo sitio), en una sola transacción.
  const opExpo = randomUUID();
  const inaug = { inicio: "2030-11-06T01:00:00Z", fin: null, operacion: randomUUID() };
  const expo = await guardar(AUTORA, base, { clase: "exposicion", horario, inauguracion: inaug }, { operacion: opExpo });
  const e1 = await fila(expo.id);
  check(e1.clase === "exposicion" && e1.inaugura_id === expo.inauguracion, "la exposición queda con su clase y su inauguración ligada");
  const franjas = (await query("select dias, abre::text as abre, cierra::text as cierra from public.eventos_horarios where evento_id = $1", [expo.id])).rows;
  check(franjas.length === 1 && franjas[0].abre === "10:00:00" && franjas[0].dias.length === 6, "el horario propio se guarda en franjas", franjas);
  const i1 = await fila(expo.inauguracion);
  check(i1.clase === "puntual" && i1.titulo === "Inauguración: Ecos de papel" && i1.sitio_texto === "Museo de prueba" && i1.visible, "la inauguración es un acto puntual visible con el mismo sitio", i1 && { clase: i1.clase, titulo: i1.titulo });
  check(new Date(i1.inicio).toISOString() === "2030-11-06T01:00:00.000Z" && i1.fin === null, "la inauguración no hereda el horario de visita");
  const antes = await cuantos();
  const otraVez = await guardar(AUTORA, base, { clase: "exposicion", horario, inauguracion: { ...inaug } }, { operacion: opExpo });
  check(otraVez.repetido === true && (await cuantos()) === antes, "un reintento de la misma operación no publica otra inauguración");

  // --- Editar la exposición: otra hora de inauguración la mueve; volverla «evento» quita su horario propio y la liga (la inauguración sigue).
  await guardar(AUTORA, base, { clase: "exposicion", horario: [], inauguracion: { inicio: "2030-11-06T02:00:00Z", fin: null, operacion: randomUUID() } }, { evento: expo.id, revision: await revision(expo.id) });
  check(new Date((await fila(expo.inauguracion)).inicio).toISOString() === "2030-11-06T02:00:00.000Z", "editar la inauguración cambia su hora, sin crear otra");
  check((await query("select 1 from public.eventos_horarios where evento_id = $1", [expo.id])).rowCount === 0, "sin franjas, la exposición usa el horario del lugar");
  await guardar(AUTORA, { ...base, inicio: "2030-11-07T01:00:00Z", fin: "2030-11-07T03:00:00Z" }, { clase: "puntual" }, { evento: expo.id, revision: await revision(expo.id) });
  const e2 = await fila(expo.id);
  check(e2.clase === "puntual" && e2.inaugura_id === null && !!(await fila(expo.inauguracion)), "volverla evento quita la liga; la inauguración sigue publicada");

  // --- Taller: sesiones en días sueltos (tres sábados), un solo taller.
  const sabados = [
    { inicio: "2030-11-09T16:00:00Z", fin: "2030-11-09T18:00:00Z" },
    { inicio: "2030-11-16T16:00:00Z", fin: "2030-11-16T18:00:00Z" },
    { inicio: "2030-11-23T16:00:00Z", fin: "2030-11-23T18:00:00Z" },
  ];
  const taller = await guardar(AUTORA, { ...base, titulo: "Taller de grabado", inicio: sabados[0].inicio, fin: sabados[2].fin }, { clase: "taller" }, { sesiones: sabados });
  const sesiones = (await query("select fecha::text as fecha from public.eventos_sesiones where evento_id = $1 order by fecha", [taller.id])).rows.map((r) => r.fecha);
  check((await fila(taller.id)).clase === "taller" && sesiones.join() === "2030-11-09,2030-11-16,2030-11-23", "el taller guarda sus tres sesiones en días sueltos", sesiones);

  // --- Parte de un festival: uno nuevo con solo el nombre toma el sitio y el periodo del acto; un segundo acto lo alarga.
  const opMarco = randomUUID();
  const a1 = await guardar(AUTORA, acto("Charla con la directora", "2030-11-14T00:00:00Z", "2030-11-14T02:00:00Z"), { clase: "puntual", padre_nuevo: { titulo: "Festival de Cine", operacion: opMarco } });
  const m1 = await fila(opMarco);
  check(m1.clase === "festival" && (await fila(a1.id)).evento_padre_id === opMarco && a1.padre === opMarco, "el festival nuevo nace con el acto dentro");
  check(new Date(m1.inicio).toISOString() === "2030-11-14T00:00:00.000Z" && new Date(m1.fin).toISOString() === "2030-11-14T02:00:00.000Z" && m1.sitio_texto === "Museo de prueba", "el marco toma el periodo y el sitio de su primer acto");
  await guardar(AUTORA, acto("Función de cortos", "2030-11-16T01:00:00Z", null), { clase: "puntual", padre: opMarco });
  const m2 = await fila(opMarco);
  check(new Date(m2.inicio).toISOString() === "2030-11-14T00:00:00.000Z" && new Date(m2.fin).toISOString() === "2030-11-16T06:00:00.000Z", "con otro acto el periodo va del primero al final del día del último", { inicio: m2.inicio, fin: m2.fin });

  // --- Lo que no se puede ligar.
  const ajeno = randomUUID();
  await guardar(OTRA, acto("Acto ajeno", "2030-11-20T01:00:00Z", null), { clase: "puntual", padre_nuevo: { titulo: "Festival de otra", operacion: ajeno } });
  const nAntes = await cuantos();
  await expectError(() => guardar(AUTORA, acto("Me cuelo", "2030-11-21T01:00:00Z", null), { clase: "puntual", padre: ajeno }), "42501", "un festival ajeno no se elige como padre (sería una propuesta pendiente)");
  check((await cuantos()) === nAntes, "el rechazo no deja el acto publicado a medias");
  await expectError(() => guardar(AUTORA, acto("Padre que no es festival", "2030-11-21T01:00:00Z", null), { clase: "puntual", padre: taller.id }), "23514", "el padre tiene que ser un festival");
  await expectError(() => guardar(AUTORA, acto("Festival suelto", "2030-11-21T01:00:00Z", null), { clase: "festival" }), "22023", "un festival nuevo se publica con su programa, no solo");
  await expectError(() => as("authenticated", AUTORA, () => query("update public.eventos set evento_padre_id = $1 where id = $2", [opMarco, opMarco])), "23514", "un festival no es parte de otro (sin anidar)");
  await expectError(() => as("authenticated", AUTORA, () => query("update public.eventos set clase = 'puntual' where id = $1", [opMarco])), "23514", "un festival con actos sigue siendo festival");
  await expectError(() => as("authenticated", AUTORA, () => query("update public.eventos set borrador = true where id = $1", [a1.id])), "42501", "nadie más que la administración vuelve borrador un evento");

  // --- Publicar un programa (H6): dos actos marcados y uno desmarcado, en una sola operación; el marco toma su periodo de lo publicado.
  const opPrograma = randomUUID();
  const actos = [
    { datos: acto("Inauguración: «La luz que queda»", "2030-11-13T01:00:00Z", null), quien: [], publicar: true, operacion: randomUUID() },
    { datos: acto("Charla", "2030-11-14T00:00:00Z", "2030-11-14T01:00:00Z"), quien: [], publicar: true, operacion: randomUUID() },
    { datos: acto("Función de clausura", "2030-11-17T01:00:00Z", null), quien: [], publicar: false, operacion: randomUUID() },
  ];
  const marcoDatos = { datos: { titulo: "Festival de Cine UASLP", imagen: null, precio: null, descripcion: null, enlace: null }, quien: [] };
  const publicar = (quien, marco, lista, op) => as("authenticated", quien, async () => (await query("select public.publicar_programa($1::jsonb, $2::jsonb, $3::uuid) as r", [json(marco), json(lista), op])).rows[0].r);
  const programa = await publicar(AUTORA, marcoDatos, actos, opPrograma);
  const marco = await fila(opPrograma);
  check(marco.clase === "festival" && marco.visible && programa.actos.length === 2 && programa.borradores.length === 1, "el programa publica el marco, dos actos y un borrador", programa);
  check(new Date(marco.inicio).toISOString() === "2030-11-13T01:00:00.000Z" && new Date(marco.fin).toISOString() === "2030-11-14T01:00:00.000Z", "el marco va del primer al último acto publicado", { inicio: marco.inicio, fin: marco.fin });
  const borrador = await fila(programa.borradores[0]);
  check(!borrador.visible && borrador.borrador && borrador.evento_padre_id === opPrograma, "el desmarcado queda oculto, como borrador del festival");
  check((await query("select count(*)::int as n from public.eventos where evento_padre_id = $1 and visible", [opPrograma])).rows[0].n === 2, "los marcados quedan visibles y ligados");
  const total = await cuantos();
  const repetido = await publicar(AUTORA, marcoDatos, actos, opPrograma);
  check(repetido.repetido === true && (await cuantos()) === total && repetido.actos.length === 2, "un reintento del programa no publica nada otra vez");

  // Atomicidad: un acto inválido (sin título) y nada queda: ni el marco ni los actos que iban antes.
  const roto = [{ ...actos[0], operacion: randomUUID() }, { datos: { ...acto("", "2030-11-14T00:00:00Z", null) }, quien: [], publicar: true, operacion: randomUUID() }];
  const nRoto = await cuantos();
  const opRoto = randomUUID();
  await expectError(() => publicar(AUTORA, marcoDatos, roto, opRoto), "23514", "un acto inválido rechaza todo el programa");
  check((await cuantos()) === nRoto && !(await fila(opRoto)), "el programa rechazado no deja ni el marco ni sus actos");
  await expectError(() => publicar(AUTORA, marcoDatos, [{ ...actos[2], operacion: randomUUID() }], randomUUID()), "22023", "un programa sin ningún acto marcado no se publica (un marco sin actos no promete nada)");
  await as("anon", null, () => expectError(() => query("select public.publicar_programa($1::jsonb, $2::jsonb, $3::uuid)", [json(marcoDatos), json(actos), randomUUID()]), "42501", "anon no publica programas"));

  // --- El borrador: solo su autora lo publica, y el festival alarga su periodo.
  await expectError(() => as("authenticated", OTRA, () => query("select public.publicar_borrador_de_programa($1::uuid)", [borrador.id])), "42501", "otra cuenta no publica el borrador");
  await as("authenticated", AUTORA, () => query("select public.publicar_borrador_de_programa($1::uuid)", [borrador.id]));
  const publicado = await fila(borrador.id);
  check(publicado.visible && !publicado.borrador && new Date((await fila(opPrograma)).fin).toISOString() === "2030-11-17T06:00:00.000Z", "publicado el borrador, el festival llega hasta su día");

  // Un evento que la administración ocultó no se vuelve borrador (ni se cuela de vuelta).
  await as("authenticated", ADMIN, () => query("update public.eventos set visible = false where id = $1", [a1.id]));
  await expectError(() => as("authenticated", AUTORA, () => query("select public.programa_ocultar_borrador($1::uuid)", [a1.id])), "42501", "un evento oculto por la administración no se vuelve borrador");
  await expectError(() => as("authenticated", AUTORA, () => query("select public.publicar_borrador_de_programa($1::uuid)", [a1.id])), "42501", "ni se vuelve a mostrar como borrador");
  check(!(await fila(a1.id)).visible, "sigue oculto");
  await expectError(() => as("authenticated", OTRA, () => query("select public.programa_ocultar_borrador($1::uuid)", [programa.actos[0]])), "42501", "otra cuenta no oculta un acto ajeno");

  // --- El horario propio: lo escribe quien gestiona el evento; anon no ejecuta las funciones.
  const expo2 = await guardar(AUTORA, { ...base, titulo: "Grabado potosino" }, { clase: "exposicion", horario });
  await as("authenticated", OTRA, () => expectError(() => query("insert into public.eventos_horarios (evento_id, dias, abre, cierra) values ($1, '{1}', '10:00', '12:00')", [expo2.id]), "42501", "otra cuenta no escribe el horario de una exposición ajena"));
  const visibles = await as("anon", null, async () => (await query("select count(*)::int as n from public.eventos_horarios where evento_id = $1", [expo2.id])).rows[0].n);
  check(visibles === 1, "el horario de una exposición visible se lee sin sesión");
  await expectError(() => guardar(AUTORA, { ...base, titulo: "Horario roto" }, { clase: "exposicion", horario: [{ dias: [1], abre: "10:00", cierra: "10:00" }] }), "23514", "un horario que abre y cierra a la misma hora se rechaza");
  await as("anon", null, () => expectError(() => query("select public.guardar_evento_con_clase(null, $1::jsonb, null, '[]'::jsonb, null, '{\"clase\":\"puntual\"}'::jsonb, null, $2::uuid)", [json(base), randomUUID()]), "42501", "anon no ejecuta guardar_evento_con_clase"));
  await as("anon", null, () => expectError(() => query("select public.publicar_borrador_de_programa($1::uuid)", [borrador.id]), "42501", "anon no publica borradores"));
}
