import { randomUUID } from "node:crypto";

// OL-424 (bitácora 457, migración 20261020120000_eventos_procedencia.sql): de dónde salió cada evento, y la garantía de que una carga
// histórica no avisa a nadie. El importador (`scripts/instituciones/importar-eventos.ts --historico`) inserta con la llave de servicio, sin
// sesión, a nombre de la administración; aquí se inserta igual, con todos los avisos encendidos (captura, entrega y recordatorios), una
// seguidora del lugar y del artista, y alguien que dijo «voy». Contraste: un alta desde la app en el mismo lugar sí crea su aviso, y una
// carga a nombre de una cuenta que no es la administración avisa a la administración (por eso el importador exige un autor admin).
const ADMIN = randomUUID();
const AUTORA = randomUUID();
const SEGUIDORA = randomUUID();
const ENERO = "https://cultura.slp.gob.mx/wp-content/uploads/2026/01/enero.pdf";

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('ol424-admin@local.test')");
  await query(
    "insert into auth.users (id, email) values ($1, 'ol424-admin@local.test'), ($2, 'ol424-autora@local.test'), ($3, 'ol424-seguidora@local.test')",
    [ADMIN, AUTORA, SEGUIDORA],
  );
  await query("update public.perfiles set avisos_correo = true where id = $1", [SEGUIDORA]);
  const lugar = (await query("insert into public.lugares (nombre, tipo, lat, lng, creado_por) values ('Museo OL-424', 'museo', 22.15, -100.98, $1) returning id", [ADMIN])).rows[0].id;
  const artista = (await query("insert into public.artistas (nombre, disciplina, creado_por) values ('Cuarteto OL-424', 'musica', $1) returning id", [ADMIN])).rows[0].id;
  await query("insert into public.seguimientos (usuario_id, lugar_id) values ($1, $2)", [SEGUIDORA, lugar]);
  await query("insert into public.seguimientos (usuario_id, artista_id) values ($1, $2)", [SEGUIDORA, artista]);

  // Todos los avisos encendidos, como en producción (se restaura al final para los bancos que siguen).
  const config = (await query("select capturar, entregar, corte, recordatorios_desde from public.avisos_config")).rows[0];
  await query("update public.avisos_config set capturar = true, entregar = true, corte = clock_timestamp(), recordatorios_desde = clock_timestamp()");

  const jobs = async (id) => (await query("select tipo, estado from public.avisos_jobs where evento_id = $1", [id])).rows;
  const avisosAdmin = async () => JSON.stringify((await query("select clave, motivos from public.avisos_admin_jobs order by clave")).rows);
  const fila = async (id) => (await query("select origen, fuente_url, visible, creado_por from public.eventos where id = $1", [id])).rows[0];
  const servicio = (sql, args) => as("service_role", null, () => query(sql, args));
  const expandirTodo = async () => {
    for (let n = 0; n < 200; n++) if (!(await servicio("select public.avisos_expandir() as r")).rows[0].r) return;
    throw new Error("la expansión de avisos no termina");
  };
  // Lo que inserta el importador: la fila del formulario, la ciudad, el autor y, ahora, de dónde salió.
  const cargar = (titulo, inicio, autor, origen = "agenda-secult-2026-01", fuente = ENERO) =>
    servicio(
      `insert into public.eventos (titulo, inicio, fin, lugar_id, descripcion, precio, ciudad, zona, creado_por, origen, fuente_url)
       values ($1, $2::timestamptz, $2::timestamptz + interval '2 hours', $3, 'Leído de la agenda de enero.', null, 'San Luis Potosí', 'America/Mexico_City', $4, $5, $6)
       returning id`,
      [titulo, inicio, lugar, autor, origen, fuente],
    );

  // --- 1. Las columnas nacen nulas: lo publicado desde la app no dice nada de procedencia.
  const columnas = (await query("select column_name, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'eventos' and column_name in ('origen', 'fuente_url') order by 1")).rows;
  check(columnas.length === 2 && columnas.every((c) => c.is_nullable === "YES" && c.column_default === null), "origen y fuente_url existen, admiten null y no tienen valor por omisión", columnas);
  const propio = (await as("authenticated", AUTORA, () =>
    query(`insert into public.eventos (titulo, inicio, lugar_id, ciudad, zona, creado_por) values ('Ensayo abierto OL-424', now() + interval '5 days', $1, 'San Luis Potosí', 'America/Mexico_City', auth.uid()) returning id`, [lugar]),
  )).rows[0].id;
  const f0 = await fila(propio);
  check(f0.origen === null && f0.fuente_url === null, "un evento publicado por una persona queda sin origen ni fuente", f0);

  // --- 2. La carga histórica: 15 de enero de 2026, ya pasó. Con los avisos encendidos, no crea ningún job ni avisa a la administración.
  const antesAdmin = await avisosAdmin();
  const historico = (await cargar("Concierto de año nuevo OL-424", "2026-01-16T01:00:00Z", ADMIN)).rows[0].id;
  await servicio("insert into public.eventos_artistas (evento_id, artista_id, orden) values ($1, $2, 0)", [historico, artista]);
  const f1 = await fila(historico);
  check(f1.origen === "agenda-secult-2026-01" && f1.fuente_url === ENERO && f1.visible === true, "la fila cargada lleva su origen y su fuente, visible", f1);
  const origen = (await query("select autor, nativo from public.avisos_origen where evento_id = $1", [historico])).rows[0];
  check(origen && origen.nativo === false && origen.autor === null, "avisos_origen la registra como no nativa (sin sesión)", origen);
  check((await jobs(historico)).length === 0, "la carga histórica no crea ningún job de aviso («nuevo evento» ni otro)", await jobs(historico));
  check((await avisosAdmin()) === antesAdmin, "ni un aviso a la administración: el autor es la administración");

  // Alguien con «voy» en el evento pasado (el peor caso): los recordatorios solo miran las próximas 24 horas.
  await query("insert into public.asistencias (usuario_id, evento_id, estado) values ($1, $2, 'voy')", [SEGUIDORA, historico]);
  await servicio("select public.avisos_recordatorios()");
  await expandirTodo();
  check((await jobs(historico)).length === 0, "los recordatorios no crean nada para un evento que ya pasó", await jobs(historico));
  const entregas = (await query("select count(*)::int as n from public.avisos_entregas d join public.avisos_jobs j on j.id = d.job_id where j.evento_id = $1", [historico])).rows[0].n;
  const novedades = (await query("select count(*)::int as n from public.novedades where evento_id = $1", [historico])).rows[0].n;
  check(entregas === 0 && novedades === 0, "no hay entregas (correo o push) ni novedades para nadie", { entregas, novedades });

  // Aun con la marca del alta de la app puesta a mano, sin sesión no se encola (avisos_encolar sale antes de insertar).
  const conMarca = await as("service_role", null, async () => {
    await query("begin");
    try {
      await query("select set_config('app.avisos_outbox', 'on', true)");
      const id = (await query(
        `insert into public.eventos (titulo, inicio, lugar_id, ciudad, zona, creado_por, origen, fuente_url)
         values ('Lectura de enero OL-424', '2026-01-20T01:00:00Z', $1, 'San Luis Potosí', 'America/Mexico_City', $2, 'agenda-secult-2026-01', $3) returning id`,
        [lugar, ADMIN, ENERO],
      )).rows[0].id;
      await query("commit");
      return id;
    } catch (e) {
      await query("rollback");
      throw e;
    }
  });
  check((await jobs(conMarca)).length === 0, "ni con la marca del outbox: sin sesión no hay job", await jobs(conMarca));

  // --- 3. Contrastes: el banco sí ve un aviso cuando lo hay.
  const datosApp = {
    titulo: "Concierto desde la app OL-424", inicio: new Date(Date.now() + 4 * 86400000).toISOString(), fin: null, lugar_id: lugar,
    sitio_texto: null, sitio_lat: null, sitio_lng: null, sitio_reservado: false, sitio_revelar_desde: null, ciudad: "San Luis Potosí",
    zona: "America/Mexico_City", descripcion: null, imagen: null, precio: null, enlace: null,
  };
  const nativo = (await as("authenticated", AUTORA, () =>
    query("select public.guardar_evento_con_avisos(null, $1::jsonb, null, '[]'::jsonb, null, $2) as r", [JSON.stringify(datosApp), randomUUID()]),
  )).rows[0].r.id;
  const jobsNativo = await jobs(nativo);
  check(jobsNativo.length === 1 && jobsNativo[0].tipo === "nuevo_evento", "contraste: un alta desde la app en el mismo lugar sí crea su «nuevo evento»", jobsNativo);
  const antesAjeno = await avisosAdmin();
  const ajeno = (await cargar("Recital de enero OL-424", "2026-01-23T01:00:00Z", AUTORA)).rows[0].id;
  check((await jobs(ajeno)).length === 0 && (await avisosAdmin()) !== antesAjeno,
    "contraste: una carga a nombre de otra cuenta no avisa a seguidores, pero sí suma un aviso a la administración (el importador exige autor admin)");

  // --- 4. `eventos_parecidos` no ve lo pasado: el importador compara las cargas históricas por su cuenta.
  const parecidos = (await query("select count(*)::int as n from public.eventos_parecidos('Concierto de año nuevo OL-424', '2026-01-16T01:00:00Z', 'America/Mexico_City', $1, null)", [lugar])).rows[0].n;
  check(parecidos === 0, "eventos_parecidos no devuelve un evento que ya pasó (por eso el importador compara lo pasado aparte)", parecidos);

  // --- 5. Las cuentas no escriben la procedencia; la administración y la llave de servicio, sí; editar desde la app la conserva.
  await as("authenticated", AUTORA, () =>
    expectError(
      () => query(`insert into public.eventos (titulo, inicio, lugar_id, ciudad, zona, creado_por, origen) values ('Falso OL-424', now() + interval '3 days', $1, 'San Luis Potosí', 'America/Mexico_City', auth.uid(), 'agenda-secult-2026-01')`, [lugar]),
      "42501",
      "una cuenta no publica un evento con origen",
    ),
  );
  await as("authenticated", AUTORA, () =>
    expectError(() => query("update public.eventos set origen = 'redes' where id = $1", [propio]), "42501", "una cuenta no le pone origen a su evento"),
  );
  await as("authenticated", AUTORA, () =>
    expectError(() => query("update public.eventos set fuente_url = 'https://ejemplo.org/post' where id = $1", [propio]), "42501", "ni fuente"),
  );
  await as("anon", null, () =>
    expectError(
      () => query(`insert into public.eventos (titulo, inicio, lugar_id, ciudad, zona, origen) values ('Anónimo OL-424', now() + interval '3 days', $1, 'San Luis Potosí', 'America/Mexico_City', 'redes')`, [lugar]),
      "42501",
      "un visitante no escribe eventos (ni su origen)",
    ),
  );
  const editaSuyo = await as("authenticated", AUTORA, () => query("update public.eventos set titulo = 'Ensayo abierto OL-424 (cambiado)' where id = $1", [propio]));
  check(editaSuyo.rowCount === 1, "la autora sigue editando su evento como siempre");
  const ajenoUpdate = await as("authenticated", AUTORA, () => query("update public.eventos set titulo = 'No es mío' where id = $1", [historico]));
  check(ajenoUpdate.rowCount === 0 && (await fila(historico)).origen === "agenda-secult-2026-01", "una cuenta no toca un evento cargado de la agenda");

  // La administración edita el evento cargado con la acción de la app (`guardar_evento_con_clase`): título nuevo, procedencia intacta.
  const revision = (await query("select actualizado_en::text as v from public.eventos where id = $1", [historico])).rows[0].v;
  await as("authenticated", ADMIN, () =>
    query("select public.guardar_evento_con_clase($1::uuid, $2::jsonb, null, '[]'::jsonb, null, '{\"clase\":\"puntual\"}'::jsonb, $3::timestamptz, $4::uuid)", [
      historico,
      JSON.stringify({ ...datosApp, titulo: "Concierto de año nuevo OL-424 (corregido)", inicio: "2026-01-16T01:00:00Z", fin: "2026-01-16T03:00:00Z" }),
      revision,
      randomUUID(),
    ]),
  );
  const f2 = await fila(historico);
  const titulo = (await query("select titulo from public.eventos where id = $1", [historico])).rows[0].titulo;
  check(titulo.endsWith("(corregido)") && f2.origen === "agenda-secult-2026-01" && f2.fuente_url === ENERO, "editar desde la app no pisa origen ni fuente", { titulo, ...f2 });
  check((await jobs(historico)).length === 0, "corregir el título de un evento pasado tampoco avisa", await jobs(historico));

  const admin = await as("authenticated", ADMIN, () => query("update public.eventos set origen = 'agenda-institucion' where id = $1", [historico]));
  check(admin.rowCount === 1 && (await fila(historico)).origen === "agenda-institucion", "la administración sí corrige el origen");

  // --- 6. Los valores tienen forma: origen en minúsculas con guiones; la fuente, una dirección http(s).
  await expectError(() => cargar("Mal origen OL-424", "2026-01-25T01:00:00Z", ADMIN, "Agenda SECULT"), "23514", "origen con mayúsculas o espacios no entra");
  await expectError(() => cargar("Mala fuente OL-424", "2026-01-25T01:00:00Z", ADMIN, "agenda-secult-2026-01", "ftp://cultura/enero.pdf"), "23514", "una fuente que no es http(s) no entra");

  await query("update public.avisos_config set capturar = $1, entregar = $2, corte = $3, recordatorios_desde = $4", [config.capturar, config.entregar, config.corte, config.recordatorios_desde]);
}
