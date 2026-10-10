import { randomUUID } from "node:crypto";

// OL-366 (bitácora 397): al agregar un sitio al directorio, sus eventos pasan al lugar con `religar_sitio_a_lugar`. Regla del gestor: se
// ligan solo los de quien llama (todos si es administración), sin lugar, sin sitio reservado, visibles, sin ser marco de festival y a 300 m
// o menos del lugar; además, en la zona horaria del lugar y a un lugar que se ve en el directorio. Lo demás se queda como estaba.
const AUTORA = randomUUID();
const OTRA = randomUUID();
const ADMIN = randomUUID();
const ZONA = "America/Mexico_City";
// El lugar nuevo y su sitio: el punto del sitio a unos 100 m al norte del lugar (1° de latitud ≈ 111 195 m con el radio de `distancia_m`).
const LUGAR = { lat: 22.15, lng: -100.98 };
const norte = (metros) => ({ sitio_lat: LUGAR.lat + metros / 111194.93, sitio_lng: LUGAR.lng });

export async function run({ as, check, expectError, query, connection }) {
  await query("insert into public.admin_correos (correo) values ('ol366-admin@example.com')");
  await query(
    "insert into auth.users (id, email) values ($1, 'ol366-autora@example.com'), ($2, 'ol366-otra@example.com'), ($3, 'ol366-admin@example.com')",
    [AUTORA, OTRA, ADMIN],
  );
  const lugar = async ({ visible = true, privado = false, zona = ZONA, ciudad = "San Luis Potosí" } = {}) =>
    (await query(
      "insert into public.lugares (nombre, tipo, lat, lng, ciudad, zona, visible, privado, creado_por) values ('Jardín de prueba OL-366', 'plaza', $1, $2, $3, $4, $5, $6, $7) returning id",
      [LUGAR.lat, LUGAR.lng, ciudad, zona, visible, privado, AUTORA],
    )).rows[0].id;
  const evento = async ({ autor = AUTORA, metros = 100, ...cambios } = {}) =>
    (await query(
      `insert into public.eventos (titulo, inicio, lugar_id, sitio_texto, sitio_direccion, sitio_lat, sitio_lng, sitio_reservado, ciudad, zona, visible, clase, creado_por)
       values ($1, now() + interval '2 days', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
      [
        cambios.titulo ?? "Evento OL-366", cambios.lugar_id ?? null, cambios.sitio_texto === undefined ? "Jardín de prueba" : cambios.sitio_texto,
        cambios.sitio_direccion === undefined ? "Calle de prueba 1" : cambios.sitio_direccion,
        ...(cambios.sitio_reservado || cambios.lugar_id ? [null, null] : Object.values(norte(metros))),
        !!cambios.sitio_reservado, cambios.ciudad ?? "Soledad de Graciano Sánchez", cambios.zona ?? ZONA, cambios.visible ?? true, cambios.clase ?? "puntual", autor,
      ],
    )).rows[0].id;
  const fila = async (id) => (await query("select *, actualizado_en::text as revision from public.eventos where id = $1", [id])).rows[0];
  const ligar = (quien, lugarId, ids) =>
    as("authenticated", quien, async () => (await query("select public.religar_sitio_a_lugar($1::uuid, $2::uuid[]) as n", [lugarId, ids])).rows[0].n);

  // --- La función: definer, sin search_path, solo para sesiones (ni anónimos ni el servicio), con su comentario.
  const { rows: [f] } = await query(
    `select prosecdef, proconfig, has_function_privilege('anon', oid, 'execute') as anon, has_function_privilege('authenticated', oid, 'execute') as sesion,
      has_function_privilege('service_role', oid, 'execute') as servicio, obj_description(oid, 'pg_proc') as nota
     from pg_proc where oid = to_regprocedure('public.religar_sitio_a_lugar(uuid, uuid[])')`,
  );
  check(!!f && f.prosecdef && f.proconfig?.includes('search_path=""') && !f.anon && f.sesion && !f.servicio && /OL-366/.test(f.nota ?? ""), "religar_sitio_a_lugar: definer, search_path vacío, solo con sesión y comentada", f);
  if (!f) return;

  const L = await lugar();
  const otroLugar = await lugar();
  const privado = await lugar({ privado: true });
  const oculto = await lugar({ visible: false });
  const e = {
    propio: await evento(),
    deOtra: await evento({ autor: OTRA }),
    lejos: await evento({ metros: 500 }),
    a299: await evento({ metros: 299 }),
    a301: await evento({ metros: 301 }),
    reservado: await evento({ sitio_reservado: true, sitio_direccion: null }),
    conLugar: await evento({ lugar_id: otroLugar, sitio_texto: null, sitio_direccion: null }),
    marco: await evento({ clase: "festival", sitio_direccion: null }),
    oculto: await evento({ visible: false }),
    otraZona: await evento({ zona: "America/Cancun" }),
  };
  // El sitio reservado tiene su punto privado justo encima del lugar: aun así no se liga.
  await query("insert into public.eventos_sitio_privado (evento_id, direccion, lat, lng, revelar_desde) values ($1, 'Casa de prueba', $2, $3, now())", [e.reservado, LUGAR.lat, LUGAR.lng]);
  const todos = Object.values(e);
  const antes = Object.fromEntries(await Promise.all(Object.entries(e).map(async ([k, id]) => [k, await fila(id)])));
  const cambios = async () => (await query("select count(*)::int as n from public.avisos_jobs where tipo = 'cambio' and evento_id = any($1::uuid[])", [todos])).rows[0].n;
  const cambiosAntes = await cambios();

  // --- Sin sesión no se llama; con el rol de sesión pero sin cuenta, tampoco.
  await as("anon", null, () => expectError(() => query("select public.religar_sitio_a_lugar($1::uuid, $2::uuid[])", [L, todos]), "42501", "anon no liga"));
  await as("authenticated", null, () => expectError(() => query("select public.religar_sitio_a_lugar($1::uuid, $2::uuid[])", [L, todos]), "42501", "sin cuenta no liga"));
  await as("service_role", null, () => expectError(() => query("select public.religar_sitio_a_lugar($1::uuid, $2::uuid[])", [L, todos]), "42501", "el servicio no la llama"));

  // --- A un lugar que no está en el directorio (privado u oculto) o que no existe, nada.
  check((await ligar(AUTORA, privado, todos)) === 0, "a un lugar privado no se liga nada");
  check((await ligar(AUTORA, oculto, todos)) === 0, "a un lugar oculto no se liga nada");
  check((await ligar(AUTORA, randomUUID(), todos)) === 0, "a un lugar que no existe no se liga nada");
  check((await ligar(AUTORA, L, [])) === 0 && (await ligar(AUTORA, L, null)) === 0, "sin eventos, cero");

  // --- La autora: solo los suyos que cumplen (el de al lado y el de 299 m).
  const deLaAutora = await ligar(AUTORA, L, todos);
  check(deLaAutora === 2, "la autora liga solo sus eventos que cumplen la regla", deLaAutora);
  const propio = await fila(e.propio);
  const { rows: [l] } = await query("select ciudad, zona from public.lugares where id = $1", [L]);
  check(
    propio.lugar_id === L && propio.sitio_texto === null && propio.sitio_direccion === null && propio.sitio_lat === null && propio.sitio_lng === null &&
      !propio.sitio_reservado && propio.sitio_revelar_desde === null && propio.ciudad === l.ciudad && propio.zona === l.zona && propio.visible,
    "ligado, queda como un evento con lugar: los campos del sitio vacíos y la ciudad del lugar",
    propio,
  );
  check(propio.revision !== antes.propio.revision, "ligar cambia su versión (quien lo editaba con la anterior tendrá que volver a abrirlo)");
  check((await fila(e.a299)).lugar_id === L, "a 299 m, se liga");
  for (const [clave, motivo] of [
    ["deOtra", "el de otra persona no se toca"],
    ["lejos", "a 500 m no se liga"],
    ["a301", "a 301 m no se liga"],
    ["reservado", "un sitio reservado no se liga"],
    ["conLugar", "un evento que ya tiene lugar no cambia de lugar"],
    ["marco", "el marco de un festival no se liga"],
    ["oculto", "un evento oculto no se liga"],
    ["otraZona", "con otra zona horaria no se liga (su hora a la vista cambiaría)"],
  ]) {
    const ahora = await fila(e[clave]);
    check(ahora.revision === antes[clave].revision && ahora.lugar_id === antes[clave].lugar_id && ahora.sitio_texto === antes[clave].sitio_texto, motivo, ahora);
  }
  const { rows: [privadoReservado] } = await query("select lat from public.eventos_sitio_privado where evento_id = $1", [e.reservado]);
  check(privadoReservado?.lat === LUGAR.lat, "la dirección privada del sitio reservado sigue como estaba");

  // --- Otra persona no liga los de la autora (ni los suyos a un lugar privado); la administración liga los de cualquiera, con la misma regla.
  check((await ligar(OTRA, L, [e.lejos, e.a301, e.otraZona])) === 0, "otra persona no liga los eventos de la autora");
  const deAdmin = await ligar(ADMIN, L, todos);
  check(deAdmin === 1 && (await fila(e.deOtra)).lugar_id === L, "la administración liga el de otra persona", deAdmin);
  for (const clave of ["lejos", "a301", "reservado", "conLugar", "marco", "oculto", "otraZona"]) {
    check((await fila(e[clave])).revision === antes[clave].revision, `la administración tampoco liga «${clave}»`);
  }
  check((await ligar(ADMIN, L, todos)) === 0, "otra vez, cero: ya están ligados");

  // --- No avisa a nadie (el sitio es el mismo) y deja el interruptor de avisos de la conexión como estaba.
  check((await cambios()) === cambiosAntes, "ligar no encola el aviso de «cambió el lugar»");
  await query("begin");
  try {
    await query("select set_config('request.jwt.claim.sub', $1, true)", [AUTORA]);
    await query("select set_config('app.avisos_outbox', 'on', true)");
    await query("set local role authenticated");
    const { rows: [r] } = await query("select public.religar_sitio_a_lugar($1::uuid, $2::uuid[]) as n, current_setting('app.avisos_outbox', true) as optin", [L, [e.lejos]]);
    check(r.n === 0 && r.optin === "on", "con el interruptor encendido, ligar lo apaga solo durante el cambio y lo devuelve", r);
  } finally {
    await query("rollback");
  }

  // --- Dos a la vez: si otra transacción le está poniendo lugar al evento, ligar espera a que termine y, con el lugar ya puesto, no lo pisa.
  const carrera = await evento();
  const enCarrera = await connection(async (a) => {
    await a.query("begin");
    await a.query("update public.eventos set lugar_id = $1, sitio_texto = null, sitio_direccion = null, sitio_lat = null, sitio_lng = null where id = $2", [otroLugar, carrera]);
    const segunda = connection(async (b) => {
      await b.query("begin");
      await b.query("select set_config('request.jwt.claim.sub', $1, true)", [AUTORA]);
      await b.query("set local role authenticated");
      const { rows: [r] } = await b.query("select public.religar_sitio_a_lugar($1::uuid, $2::uuid[]) as n", [L, [carrera]]);
      await b.query("commit");
      return r.n;
    });
    // La segunda se queda esperando el candado de la fila (se ve en pg_stat_activity) hasta que la primera confirma.
    let esperando = false;
    for (let i = 0; i < 50 && !esperando; i++) {
      await new Promise((r) => setTimeout(r, 40));
      esperando = (await a.query("select count(*)::int as n from pg_stat_activity where wait_event_type = 'Lock' and query like '%religar_sitio_a_lugar%'")).rows[0].n > 0;
    }
    await a.query("commit");
    return { esperando, n: await segunda };
  });
  check(enCarrera.esperando && enCarrera.n === 0 && (await fila(carrera)).lugar_id === otroLugar, "dos a la vez: la que llega después espera y no pisa el lugar que puso la otra", enCarrera);

  await query("delete from public.eventos_sitio_privado where evento_id = any($1::uuid[])", [todos]);
  await query("delete from public.eventos where creado_por = any($1::uuid[])", [[AUTORA, OTRA, ADMIN]]);
  await query("delete from public.lugares where creado_por = $1", [AUTORA]);
  await query("delete from auth.users where id = any($1::uuid[])", [[AUTORA, OTRA, ADMIN]]);
  await query("delete from public.admin_correos where correo = 'ol366-admin@example.com'");
}
