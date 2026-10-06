export async function run({ query, check }) {
  const db = { query, exec: query };
  const ok = check;
  const filas = async (sql, params) => (await query(sql, params)).rows;
  const uno = async (sql, params) => (await filas(sql, params))[0];
  async function como(rol, sub) {
    await query("reset role");
    await query("select set_config('request.jwt.claim.sub', $1, false)", [sub ?? ""]);
    if (rol) await query(`set role ${rol}`);
  }
  async function falla(sql, params) {
    try { await query(sql, params); return null; } catch (e) { return e.message; }
  }
// ---------- datos ----------
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const F = uuid(1); // fundador, administrador
const [U1, U2, U3] = [uuid(11), uuid(12), uuid(13)];
const LUGAR = uuid(101);

await como(null);
// El perfil lo crea la base al nacer la cuenta; aquí solo se le pone nombre y, al fundador, el rol.
await db.exec(`
  insert into public.admin_correos (correo) values ('fundador@ejemplo.org');
  insert into auth.users (id, email) values
    ('${F}', 'fundador@ejemplo.org'), ('${U1}', 'uno@ejemplo.org'), ('${U2}', 'dos@ejemplo.org'), ('${U3}', 'tres@ejemplo.org');
  update public.perfiles set nombre = 'Fundador', rol = 'admin' where id = '${F}';
  update public.perfiles set nombre = 'Casa de la Cultura' where id = '${U1}';
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por)
    values ('${LUGAR}', 'Centro', 'foro', 22.15, -100.98, '${F}');
`);
ok((await uno(`select rol from public.perfiles where id = '${F}'`))?.rol === "admin", "el fundador es administración");

// ---------- el tope base y el cupo ----------
await como("authenticated", U1);
let cupo = await uno("select * from public.mi_cupo_de_cartel()");
ok(cupo?.tope === 6, "el tope base son 6 al mes", cupo);
ok(cupo?.usadas === 0 && cupo?.sin_tope === false, "una cuenta nueva empieza en 0 y con tope", cupo);

// Se gastan 5 y todavía se puede.
for (let i = 0; i < 5; i++) await uno("select public.apartar_lectura_de_cartel() as v");
cupo = await uno("select * from public.mi_cupo_de_cartel()");
ok(cupo?.usadas === 5, "las lecturas se cuentan", cupo);
ok((await uno("select public.apartar_lectura_de_cartel() as v"))?.v === true, "la número 6 todavía entra");
ok((await uno("select public.apartar_lectura_de_cartel() as v"))?.v === false, "la número 7 ya no");
cupo = await uno("select * from public.mi_cupo_de_cartel()");
ok(cupo?.usadas === 6, "la que se rechaza no se anota", cupo);

// ---------- se renueva el día 1 ----------
await como(null);
await db.query("update public.lecturas_cartel set creado_en = public.inicio_del_mes() - interval '1 day' where perfil_id = $1", [U1]);
await como("authenticated", U1);
cupo = await uno("select * from public.mi_cupo_de_cartel()");
ok(cupo?.usadas === 0, "lo del mes pasado no cuenta: el cupo se renueva el día 1", cupo);
ok((await uno("select public.apartar_lectura_de_cartel() as v"))?.v === true, "con el mes nuevo se puede otra vez");

// ---------- la administración no se topa ----------
await como(null);
await db.exec(`insert into public.lecturas_cartel (perfil_id) select '${F}' from generate_series(1, 50)`);
await como("authenticated", F);
cupo = await uno("select * from public.mi_cupo_de_cartel()");
ok(cupo?.sin_tope === true, "la administración va sin tope", cupo);
ok((await uno("select public.apartar_lectura_de_cartel() as v"))?.v === true, "la administración lee con 50 encima");

// ---------- una cuenta normal no toca nada de esto ----------
await como("authenticated", U2);
ok((await filas("select * from public.lecturas_cartel")).length === 0, "una cuenta normal no lee las lecturas de nadie");
ok((await filas("select * from public.topes_de_lectura")).length === 0, "ni los topes");
ok(await falla("insert into public.lecturas_cartel (perfil_id) values ($1)", [U2]), "ni inserta lecturas a mano");
ok(await falla("insert into public.topes_de_lectura (perfil_id, tope) values ($1, 999)", [U2]), "ni se sube el tope");
ok(await falla("select public.dar_mas_lecturas($1)", [U2]), "ni se da más a sí misma");
// Control negativo del control negativo: con la administración sí se puede.
await como("authenticated", F);
ok((await falla("select public.dar_mas_lecturas($1)", [U2])) === null, "la administración sí puede dar más");
await como("authenticated", U2);
cupo = await uno("select * from public.mi_cupo_de_cartel()");
ok(cupo?.tope === 100, "dar más sube esa cuenta a 100", cupo);

// ---------- pedir más capacidad ----------
await como("authenticated", U1);
const pedir = "insert into public.reportes (tipo, objeto_id, motivo, creado_por) values ('perfil', $1, 'mas_lecturas', $2)";
ok((await falla(pedir, [U1, U1])) === null, "se puede pedir más capacidad para uno mismo");
ok(await falla(pedir, [U1, U1]), "no se puede pedir dos veces sin que la atiendan");
ok(await falla(pedir, [U2, U1]), "no se puede pedir capacidad para el perfil de otra persona");
// Atendida la primera, se puede volver a pedir.
await como(null);
await db.query("update public.reportes set atendido = true where creado_por = $1", [U1]);
await como("authenticated", U1);
ok((await falla(pedir, [U1, U1])) === null, "cerrada la anterior, se puede volver a pedir");
ok((await uno("select * from public.mi_cupo_de_cartel()"))?.pedida === true, "el cupo dice que ya pidió, sin abrir reportes a lectura");
// El atajo de nacer atendida está cerrado: si no, el índice único no aplicaría.
ok(await falla("insert into public.reportes (tipo, objeto_id, motivo, creado_por, atendido) values ('perfil', $1, 'mas_lecturas', $1, true)", [U1]), "no se puede colar una petición ya atendida");

// ---------- lo que ve el panel ----------
await como(null);
await db.query("insert into public.eventos (titulo, inicio, lugar_id, creado_por) select 'Evento ' || g, now() + interval '5 days', $1, $2 from generate_series(1, 3) g", [LUGAR, U1]);
await como("authenticated", F);
const pendientes = await filas("select * from public.panel_pendientes()");
const peticion = pendientes.find((p) => p.motivo === "mas_lecturas" && p.creado_por === U1);
ok(!!peticion, "la petición sale en lo pendiente del panel");
ok(peticion?.lecturas === 1, "el panel ve cuántas leyó este mes", peticion?.lecturas);
ok(peticion?.publicados === 3, "y cuántas publicó, que es con lo que se decide", peticion?.publicados);
const otro = pendientes.find((p) => p.motivo !== "mas_lecturas");
ok(otro === undefined || otro.lecturas === null, "los demás pendientes no traen esos números");

// ---------- pedir cupo no es reportar a nadie ----------
await como("authenticated", F);
const ficha = await uno("select public.panel_persona($1) as j", [U1]);
ok(ficha?.j?.reportes === 0, "la petición no se cuenta como reporte en su ficha", ficha?.j?.reportes);
ok(ficha?.j?.pendientes === 0, "ni como pendiente suyo", ficha?.j?.pendientes);
// indicadores_ahora no se ejecuta desde fuera; se mira por el resumen, que es quien la usa.
const resumen = await uno("select public.panel_resumen() as j");
ok(typeof resumen?.j?.ahora?.activas === "number", "los indicadores siguen respondiendo con el motivo fuera", resumen?.j?.ahora);

// ---------- y una cuenta normal no ve el panel ----------
await como("authenticated", U3);
ok((await filas("select * from public.panel_pendientes()")).length === 0, "una cuenta normal no ve lo pendiente");

// ---------- una lectura que falla no se descuenta (OL-307) ----------
// Solo el servidor, con su llave de servicio, la devuelve: si cualquier cuenta pudiera, devolvería también las buenas y el tope sería de adorno.
const lecturaApartada = async (quien) => { await como("authenticated", quien); return (await uno("select public.apartar_lectura_de_cartel() as v"))?.v; };
const devuelta = async (quien) => { await como("service_role"); return (await uno("select public.devolver_lectura_de_cartel($1) as v", [quien]))?.v; };
const quedanDe = async (quien) => { await como("authenticated", quien); return (await uno("select * from public.mi_cupo_de_cartel()"))?.usadas; };
for (let i = 0; i < 3; i++) await lecturaApartada(U3);
ok((await quedanDe(U3)) === 3, "tres lecturas apartadas");
await como("authenticated", U3);
ok(await falla("select public.devolver_lectura_de_cartel($1)", [U3]), "una cuenta normal no puede devolverse una lectura");
await como("anon");
ok(await falla("select public.devolver_lectura_de_cartel($1)", [U3]), "ni sin sesión");
ok((await quedanDe(U3)) === 3, "sin devolución, el cupo sigue igual");
ok((await devuelta(U3)) === true, "el servidor devuelve la lectura que falló");
ok((await quedanDe(U3)) === 2, "la lectura devuelta ya no cuenta");
await como(null);
ok((await filas("select 1 from public.lecturas_cartel where perfil_id = $1 and devuelta", [U3])).length === 1 && (await filas("select 1 from public.lecturas_cartel where perfil_id = $1", [U3])).length === 3, "la fila no se borra: queda marcada como devuelta");
// El fusible: tantas devoluciones al mes como el tope (6). Seis fallidas salen gratis; la séptima cuenta como cualquier otra.
for (let i = 0; i < 5; i++) {
  ok((await lecturaApartada(U3)) === true, `la lectura ${i + 2} que falla se aparta`);
  ok((await devuelta(U3)) === true, `y se devuelve (${i + 2} de 6)`);
}
ok((await quedanDe(U3)) === 2, "seis devueltas: el cupo sigue en dos");
ok((await lecturaApartada(U3)) === true, "la séptima lectura que falla se aparta");
ok((await devuelta(U3)) === false, "y esa ya no se devuelve: el fusible está agotado");
ok((await quedanDe(U3)) === 3, "esa fallida cuenta como cualquier otra");
// Sin nada que devolver (otra cuenta sin lecturas), no pasa nada.
ok((await devuelta(U2)) === false, "una cuenta sin lecturas no tiene qué devolver");
// El mes que viene el fusible vuelve: las devoluciones de antes del día 1 no cuentan.
await como(null);
await db.query("update public.lecturas_cartel set creado_en = public.inicio_del_mes() - interval '1 day' where perfil_id = $1", [U3]);
ok((await quedanDe(U3)) === 0, "con el mes nuevo, ni lecturas ni devoluciones del mes pasado cuentan");
await lecturaApartada(U3);
ok((await devuelta(U3)) === true, "y se vuelve a poder devolver");


  await como(null, null);
}
