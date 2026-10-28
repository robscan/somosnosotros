import { randomUUID } from "node:crypto";

// OL-453 · migración 20261022170000: `aceptar_propuesta_como(autor, propuesta, ficha)` deja que la llave de servicio (el guion de la Mac que
// acepta una corrida) acepte una propuesta como si fuera el admin `autor`, llamando `aceptar_propuesta` tal cual. Un autor admin acepta igual que
// la bandeja (la ficha y la marca a su nombre); uno que no es admin no; visitantes y cuentas no pueden llamarla; el sujeto no se queda puesto.
export async function run({ as, check, expectError, query }) {
  const admin = randomUUID();
  const persona = randomUUID();
  const correo = `aceptar-como-${admin}@local.test`;
  const uno = async (sql, params) => (await query(sql, params)).rows[0];
  await query("insert into public.admin_correos(correo) values ($1)", [correo]);
  await query("insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now()),($3,$4,now())", [admin, correo, persona, `aceptar-como-persona-${persona}@local.test`]);
  check((await uno("select rol from public.perfiles where id=$1", [admin]))?.rol === "admin", "el correo de admin_correos da el rol admin");

  const corrida = (await uno("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,gasto_usd,estado,creado_por,parametros) values ('agendas','san-luis-potosi',0.01,0,'terminada',$1,'{}') returning id", [admin])).id;
  const proponer = async (nombre) =>
    (await uno("insert into public.propuestas(corrida_id,tipo,fuente,datos) values ($1,'lugar','Cartelera de prueba OL-453',$2) returning id", [corrida, JSON.stringify({ nombre })])).id;
  const ficha = (nombre) => ({ nombre, tipo: "foro", lat: 22.1501, lng: -100.9801, ciudad: "San Luis Potosí", zona: "America/Mexico_City", redes: [] });

  // La bandeja: el admin con su sesión.
  const pBandeja = await proponer("Foro de la bandeja OL-453");
  const rBandeja = await as("authenticated", admin, async () => (await uno("select public.aceptar_propuesta($1,$2) as r", [pBandeja, ficha("Foro de la bandeja OL-453")])).r);
  // El guion: la llave de servicio, a nombre del admin.
  const pGuion = await proponer("Foro del guion OL-453");
  const rGuion = await as("service_role", null, async () => (await uno("select public.aceptar_propuesta_como($1,$2,$3) as r", [admin, pGuion, ficha("Foro del guion OL-453")])).r);
  check(rGuion?.estado === "aceptada" && rGuion.ficha_id && rGuion.slug, "la llave de servicio acepta a nombre del admin y devuelve lo de aceptar_propuesta", rGuion);
  check(Object.keys(rGuion).sort().join() === Object.keys(rBandeja).sort().join(), "devuelve lo mismo que la bandeja", { rGuion, rBandeja });
  const lugar = await uno("select creado_por, ciudad, tipo from public.lugares where id=$1", [rGuion.ficha_id]);
  check(lugar?.creado_por === admin && lugar.tipo === "foro", "la ficha queda a nombre del admin, como desde la bandeja", lugar);
  const marcas = (await query("select id, estado, resuelto_por, ficha_id is not null as con_ficha from public.propuestas where id in ($1,$2)", [pBandeja, pGuion])).rows;
  check(marcas.every((m) => m.estado === "aceptada" && m.resuelto_por === admin && m.con_ficha), "las dos propuestas quedan aceptadas por el admin, con su ficha", marcas);
  // Ya decidida: devuelve lo que ya quedó, como aceptar_propuesta.
  const r2 = await as("service_role", null, async () => (await uno("select public.aceptar_propuesta_como($1,$2,$3) as r", [admin, pGuion, ficha("Otra vez OL-453")])).r);
  check(r2?.estado === "aceptada" && r2.ficha_id === rGuion.ficha_id, "aceptar dos veces no crea otra ficha", r2);
  // El sujeto no se queda puesto después de la llamada.
  check((await as("service_role", null, async () => (await uno("select auth.uid() as u")).u)) === null, "después de la llamada no queda ningún sujeto");

  // Un autor que no es admin, uno que no existe y nadie: no.
  const pOtra = await proponer("Foro de nadie OL-453");
  await as("service_role", null, () => expectError(() => query("select public.aceptar_propuesta_como($1,$2,$3)", [persona, pOtra, ficha("Foro de nadie OL-453")]), "42501", "un autor que no es admin no acepta"));
  await as("service_role", null, () => expectError(() => query("select public.aceptar_propuesta_como($1,$2,$3)", [randomUUID(), pOtra, ficha("x")]), "42501", "un autor que no existe no acepta"));
  await as("service_role", null, () => expectError(() => query("select public.aceptar_propuesta_como(null,$1,$2)", [pOtra, ficha("x")]), "42501", "sin autor no acepta"));
  check((await uno("select estado from public.propuestas where id=$1", [pOtra]))?.estado === "propuesta", "y la propuesta sigue sin decidir");

  // Visitantes y cuentas (también un admin con su sesión) no pueden llamarla: es solo de la llave de servicio.
  await as("anon", null, () => expectError(() => query("select public.aceptar_propuesta_como($1,$2,$3)", [admin, pOtra, ficha("x")]), "42501", "un visitante no puede llamarla"));
  await as("authenticated", persona, () => expectError(() => query("select public.aceptar_propuesta_como($1,$2,$3)", [admin, pOtra, ficha("x")]), "42501", "una cuenta no puede llamarla a nombre de un admin"));
  await as("authenticated", admin, () => expectError(() => query("select public.aceptar_propuesta_como($1,$2,$3)", [admin, pOtra, ficha("x")]), "42501", "ni el admin con su sesión (para eso está aceptar_propuesta)"));
}
