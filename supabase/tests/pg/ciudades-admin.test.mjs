import { randomUUID } from "node:crypto";

// OL-427 · Administración › Ciudades: la tabla de ciudades (pública para leer), las consultas por ciudad y día sin persona
// (registrar_ciudad_vista desde anon), las corridas con su tope y la bandeja de propuestas (solo administración y la llave de servicio).
// Todo dentro de una transacción que se deshace: las demás pruebas ven la base como la dejó la migración.
export async function run({ as, check, expectError, query }) {
  const admin = randomUUID(), persona = randomUUID();
  const adminCorreo = `ciudades-admin-${admin}@local.test`;
  const uno = async (sql, params) => (await query(sql, params)).rows[0];
  // Dentro de la transacción, un error la dejaría inservible: cada error esperado va en su propio punto de guardado.
  const falla = async (accion, codigo, etiqueta) => {
    await query("savepoint antes_del_error");
    await expectError(accion, codigo, etiqueta);
    await query("rollback to savepoint antes_del_error");
  };
  await query("begin");
  try {
    await query("insert into public.admin_correos(correo) values ($1)", [adminCorreo]);
    await query("insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now()),($3,$4,now())", [admin, adminCorreo, persona, `ciudades-persona-${persona}@local.test`]);

    // ---------- la siembra ----------
    const sembradas = (await query("select slug,nombre,estado,alias,lat,lng,zona from public.ciudades order by slug")).rows;
    const slp = sembradas.find((c) => c.slug === "san-luis-potosi");
    const sma = sembradas.find((c) => c.slug === "san-miguel-de-allende");
    check(slp?.estado === "abierta" && slp.nombre === "San Luis Potosí" && slp.lat === 22.1497 && slp.lng === -100.9764 && slp.zona === "America/Mexico_City", "siembra: San Luis Potosí abierta con el centro de CIUDAD_INICIAL", slp);
    check(slp?.alias?.includes("Soledad de Graciano Sánchez"), "siembra: Soledad es alias de San Luis (MISMA_CIUDAD)", slp);
    check(sma?.estado === "abierta" && sma.nombre === "San Miguel de Allende" && sma.lat !== null && sma.lng !== null, "siembra: San Miguel de Allende abierta con centro", sma);
    const credito = (await query("select clave,valor from public.configuracion order by clave")).rows;
    check(JSON.stringify(credito) === JSON.stringify([{ clave: "credito_api_usd", valor: 200 }, { clave: "credito_api_vence", valor: "2026-11-11" }]), "configuración: crédito de 200 USD que vence el 11 de noviembre", credito);

    // ---------- ciudades: la lee todo el mundo, la escribe la administración ----------
    await as("anon", null, async () => {
      check((await query("select count(*)::int as n from public.ciudades")).rows[0].n >= 2, "anon lee las ciudades");
      await falla(() => query("insert into public.ciudades(slug,nombre) values ('queretaro','Querétaro')"), "42501", "anon no da de alta ciudades");
      check((await query("update public.ciudades set estado='cerrada' where slug='san-luis-potosi'")).rowCount === 0, "anon no cambia ciudades");
    });
    await as("authenticated", persona, async () => {
      await falla(() => query("insert into public.ciudades(slug,nombre) values ('queretaro','Querétaro')"), "42501", "una cuenta sin administración no da de alta ciudades");
      check((await query("delete from public.ciudades where slug='san-miguel-de-allende'")).rowCount === 0, "una cuenta sin administración no quita ciudades");
    });
    await as("authenticated", admin, () => query("insert into public.ciudades(slug,nombre,estado) values ('queretaro','Querétaro','detectada')"));
    await falla(() => query("insert into public.ciudades(slug,nombre) values ('Mal Slug','X')"), "23514", "el slug va en minúsculas y con guiones");
    await falla(() => query("insert into public.ciudades(slug,nombre,lat) values ('solo-lat','X',20)"), "23514", "el centro va completo o no va");
    await falla(() => query("insert into public.ciudades(slug,nombre,zona) values ('zona-mala','X','Marte/Olympus')"), "23514", "la zona tiene que existir");

    // ---------- registrar_ciudad_vista: suma una consulta sin persona ----------
    const vistas = (slug) => uno("select coalesce(sum(consultas),0)::int as n from public.ciudades_vistas where ciudad=$1", [slug]).then((r) => r.n);
    const antes = await vistas("queretaro");
    await as("anon", null, async () => {
      check((await uno("select public.registrar_ciudad_vista('queretaro') as r")).r === true, "anon: registra una consulta de una ciudad conocida");
      check((await uno("select public.registrar_ciudad_vista('queretaro') as r")).r === true, "anon: la segunda también");
      check((await uno("select public.registrar_ciudad_vista('ciudad-inventada') as r")).r === false, "anon: una ciudad que no está no se cuenta ni se crea");
      check((await uno("select public.registrar_ciudad_vista($1) as r", ["x".repeat(81)])).r === false, "anon: un slug de más de 80 no se cuenta");
      check((await uno("select public.registrar_ciudad_vista(null) as r")).r === false, "anon: sin slug no se cuenta");
      check((await query("select * from public.ciudades_vistas")).rowCount === 0, "anon no lee las consultas");
      await falla(() => query("insert into public.ciudades_vistas(ciudad,dia,consultas) values ('queretaro',current_date,1000)"), "42501", "anon no escribe consultas a mano");
    });
    await as("authenticated", persona, async () => {
      check((await uno("select public.registrar_ciudad_vista('queretaro') as r")).r === true, "una cuenta también suma (desde el servidor la app llama sin sesión)");
      check((await query("select * from public.ciudades_vistas")).rowCount === 0, "una cuenta sin administración no lee las consultas");
    });
    check(await vistas("queretaro") === antes + 3, "tres llamadas, tres consultas en el día", { antes, despues: await vistas("queretaro") });
    check(!(await query("select 1 from public.ciudades where slug='ciudad-inventada'")).rowCount, "registrar no siembra ciudades");
    const columnas = (await query("select column_name from information_schema.columns where table_schema='public' and table_name='ciudades_vistas' order by ordinal_position")).rows.map((r) => r.column_name);
    check(columnas.join() === "ciudad,dia,consultas", "ciudades_vistas no guarda a nadie: solo ciudad, día y consultas", columnas);
    await query("update public.ciudades_vistas set consultas=1000000 where ciudad='queretaro'");
    await as("anon", null, () => query("select public.registrar_ciudad_vista('queretaro')"));
    check((await uno("select max(consultas) as n from public.ciudades_vistas where ciudad='queretaro'")).n === 1000000, "el día tiene techo: no se desborda");
    const fn = await uno(`select prosecdef, provolatile, proconfig, prorettype::regtype::text as tipo,
      has_function_privilege('anon', oid, 'execute') as anon from pg_proc where oid='public.registrar_ciudad_vista(text)'::regprocedure`);
    check(fn.prosecdef && fn.provolatile === "v" && fn.proconfig?.includes('search_path=""') && fn.tipo === "boolean" && fn.anon, "registrar_ciudad_vista: definer, ruta vacía, solo devuelve sí o no, y anon la llama", fn);

    // ---------- lo de la administración: nadie más lo lee ni lo escribe ----------
    for (const [rol, sujeto] of [["anon", null], ["authenticated", persona]]) {
      await as(rol, sujeto, async () => {
        for (const tabla of ["rutinas_corridas", "propuestas", "configuracion"]) {
          check((await query(`select * from public.${tabla}`)).rowCount === 0, `${rol}: no lee ${tabla}`);
        }
        await falla(() => query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd) values ('lugares','queretaro',3)"), "42501", `${rol}: no crea corridas`);
        for (const llamada of ["panel_ciudades()", `panel_propuestas('${randomUUID()}')`, `aceptar_propuesta('${randomUUID()}')`]) {
          await falla(() => query(`select public.${llamada}`), "42501", `${rol}: no entra a ${llamada}`);
        }
      });
    }

    // ---------- corridas: «Correr» deja una pendiente con su tope ----------
    const corrida = await as("authenticated", admin, () =>
      uno("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,parametros) values ('lugares','queretaro',3,'{\"fuentes\":[\"sic\",\"cultura\",\"web\"]}') returning id,estado,creado_por,gasto_usd"));
    check(corrida.estado === "pendiente" && corrida.creado_por === admin && Number(corrida.gasto_usd) === 0, "la corrida nace pendiente, de quien la pidió y sin gasto", corrida);
    check((await uno("select estado from public.ciudades where slug='queretaro'")).estado === "investigando", "correr una búsqueda en una ciudad detectada la pone investigando");
    await as("authenticated", admin, async () => {
      await falla(() => query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd) values ('lugares','queretaro',3)"), "23505", "no hay dos corridas en curso del mismo botón y ciudad");
      await falla(() => query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd) values ('agendas','queretaro',0)"), "23514", "el tope es mayor que cero");
      await falla(() => query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd) values ('agendas','queretaro',51)"), "23514", "el tope no pasa de 50 USD");
      await falla(() => query("insert into public.rutinas_corridas(tipo,tope_usd) values ('lugares',3)"), "23514", "los botones de una ciudad llevan ciudad");
      await falla(() => query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,creado_por) values ('artistas','queretaro',2,$1)", [persona]), "42501", "nadie crea corridas a nombre de otra cuenta");
    });
    // San Luis está abierta: correr ahí no le cambia el estado.
    const enSlp = await as("authenticated", admin, () => uno("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,creado_en) values ('lugares','san-luis-potosi',2,now()-interval '20 days') returning id"));
    check((await uno("select estado from public.ciudades where slug='san-luis-potosi'")).estado === "abierta", "una ciudad abierta sigue abierta al correr");

    // ---------- propuestas: las deja la llave de servicio; la administración las ve y decide ----------
    await as("service_role", null, async () => {
      await query("update public.rutinas_corridas set estado='terminada', gasto_usd=0.8, inicio=creado_en, fin=creado_en+interval '5 minutes' where id=$1", [enSlp.id]);
      await query(`insert into public.propuestas(corrida_id,tipo,fuente,datos,estado,resuelto_en) values
        ($1,'lugar','Sistema de Información Cultural','{"nombre":"Uno"}','aceptada',now()-interval '19 days')`, [enSlp.id]);
      await query(`insert into public.propuestas(corrida_id,tipo,fuente,datos) values
        ($1,'lugar','Sistema de Información Cultural','{"nombre":"Foro de prueba OL-427","tipo":"foro","direccion":"Calle 1","lat":20.59,"lng":-100.39}'),
        ($1,'lugar','Sistema de Información Cultural','{"nombre":"Galería de prueba OL-427","tipo":"galeria","lat":20.6,"lng":-100.4}'),
        ($1,'lugar','Búsqueda web','{"nombre":"Café de prueba OL-427","tipo":"cafe_bar","lat":20.61,"lng":-100.41}'),
        ($1,'artista','Búsqueda web','{"nombre":"Artista de prueba OL-427","disciplina":"musica"}'),
        ($1,'evento','Búsqueda web','{"titulo":"Evento de prueba OL-427"}')`, [corrida.id]);
    });
    const panel = await as("authenticated", admin, async () => (await uno("select public.panel_ciudades() as r")).r);
    const qro = panel.ciudades.find((c) => c.slug === "queretaro");
    check(qro?.consultas === 1000000 && qro.estado === "investigando", "panel_ciudades: consultas de 30 días y estado", qro);
    const enPanel = panel.corridas.find((c) => c.id === corrida.id);
    check(enPanel?.propuestas === 5 && enPanel.por_revisar === 5 && enPanel.aceptadas === 0 && enPanel.estado === "pendiente" && Number(enPanel.tope_usd) === 3, "panel_ciudades: la corrida con lo que propuso", enPanel);
    check(Number(panel.credito.usd) === 200 && panel.credito.vence === "2026-11-11" && Number(panel.credito.gastado) >= 0.8, "panel_ciudades: el crédito y lo gastado", panel.credito);

    const bandeja = await as("authenticated", admin, async () => (await uno("select public.panel_propuestas($1) as r", [corrida.id])).r);
    check(bandeja.corrida.ciudad_nombre === "Querétaro" && bandeja.corrida.por_revisar === 5 && bandeja.propuestas.length === 5, "panel_propuestas: la corrida y sus propuestas por revisar", bandeja.corrida);
    check(JSON.stringify(bandeja.fuentes_con_tanda) === JSON.stringify(["Sistema de Información Cultural"]), "panel_propuestas: solo la fuente con una tanda aprobada antes ofrece aceptar todas", bandeja.fuentes_con_tanda);
    check(bandeja.propuestas.every((p) => Object.keys(p).sort().join() === "creado_en,datos,fuente,id,tipo"), "panel_propuestas: sin quién ni cuándo resolvió");
    check((await as("authenticated", admin, async () => (await uno("select public.panel_propuestas($1) as r", [randomUUID()])).r)) === null, "panel_propuestas: una corrida que no existe da null");

    // ---------- aceptar: crea la ficha y marca la propuesta, una sola vez ----------
    const id = (nombre) => uno("select id from public.propuestas where datos->>'nombre'=$1 or datos->>'titulo'=$1", [nombre]).then((r) => r.id);
    const pForo = await id("Foro de prueba OL-427");
    const ficha = { nombre: "Foro de prueba OL-427", tipo: "foro", direccion: "Calle 1", lat: 20.59, lng: -100.39, ciudad: "Querétaro", zona: "America/Mexico_City", redes: [{ url: "https://foro.example" }] };
    await as("authenticated", persona, () => falla(() => query("select public.aceptar_propuesta($1,$2)", [pForo, ficha]), "42501", "una cuenta sin administración no acepta"));
    const r1 = await as("authenticated", admin, async () => (await uno("select public.aceptar_propuesta($1,$2) as r", [pForo, ficha])).r);
    const lugar = await uno("select id,nombre,ciudad,creado_por,visible,privado,origen,slug from public.lugares where id=$1", [r1.ficha_id]);
    check(r1.estado === "aceptada" && lugar?.nombre === "Foro de prueba OL-427" && lugar.ciudad === "Querétaro" && lugar.creado_por === admin && lugar.visible && !lugar.privado && lugar.origen === null && r1.slug === lugar.slug, "aceptar un lugar lo crea a nombre de quien acepta, visible y sin origen CAPO", { r1, lugar });
    const marcada = await uno("select estado,ficha_id,resuelto_por,resuelto_en from public.propuestas where id=$1", [pForo]);
    check(marcada.estado === "aceptada" && marcada.ficha_id === r1.ficha_id && marcada.resuelto_por === admin && marcada.resuelto_en, "la propuesta guarda la ficha que creó (su procedencia)", marcada);
    const r2 = await as("authenticated", admin, async () => (await uno("select public.aceptar_propuesta($1,$2) as r", [pForo, ficha])).r);
    check(r2.ficha_id === r1.ficha_id && (await uno("select count(*)::int as n from public.lugares where nombre='Foro de prueba OL-427'")).n === 1, "aceptar dos veces no crea dos lugares", r2);

    const pArtista = await id("Artista de prueba OL-427");
    const rA = await as("authenticated", admin, async () => (await uno("select public.aceptar_propuesta($1,$2) as r", [pArtista, { nombre: "Artista de prueba OL-427", disciplina: "musica", ciudad: "Querétaro", redes: [] }])).r);
    const artista = await uno("select nombre,disciplina,ciudad,creado_por,origen from public.artistas where id=$1", [rA.ficha_id]);
    check(artista?.disciplina === "musica" && artista.ciudad === "Querétaro" && artista.creado_por === admin && artista.origen === null, "aceptar un artista crea su ficha mínima", artista);

    const pEvento = await id("Evento de prueba OL-427");
    const rE = await as("authenticated", admin, async () => (await uno("select public.aceptar_propuesta($1) as r", [pEvento])).r);
    check(rE.estado === "aceptada" && rE.ficha_id === null, "aceptar un evento lo deja aceptado sin ficha (lo publica la rutina de agendas)", rE);

    const pMal = await id("Galería de prueba OL-427");
    await as("authenticated", admin, () => falla(() => query("select public.aceptar_propuesta($1,$2)", [pMal, { nombre: "Galería", tipo: "no-existe", lat: 20.6, lng: -100.4, ciudad: "Querétaro" }]), "23514", "una ficha inválida no se crea"));
    check((await uno("select estado from public.propuestas where id=$1", [pMal])).estado === "propuesta", "y la propuesta sigue por revisar");

    // ---------- rechazar: siempre con motivo, y se puede deshacer ----------
    const pCafe = await id("Café de prueba OL-427");
    await as("authenticated", admin, async () => {
      await falla(() => query("update public.propuestas set estado='rechazada', resuelto_por=auth.uid(), resuelto_en=now() where id=$1", [pCafe]), "23514", "rechazar pide motivo");
      await falla(() => query("update public.propuestas set estado='rechazada', motivo_rechazo='me cae mal', resuelto_por=auth.uid(), resuelto_en=now() where id=$1", [pCafe]), "23514", "el motivo es uno de los cuatro");
      await falla(() => query("update public.propuestas set estado='rechazada', motivo_rechazo='duplicado', resuelto_por=$2, resuelto_en=now() where id=$1", [pCafe, persona]), "42501", "nadie rechaza a nombre de otra cuenta");
      check((await query("update public.propuestas set estado='rechazada', motivo_rechazo='duplicado', resuelto_por=auth.uid(), resuelto_en=now() where id=$1 and estado='propuesta'", [pCafe])).rowCount === 1, "rechazar con motivo");
      check((await query("update public.propuestas set estado='propuesta', motivo_rechazo=null, resuelto_por=null, resuelto_en=null where id=$1 and estado='rechazada'", [pCafe])).rowCount === 1, "deshacer un rechazo");
    });
    await as("authenticated", persona, async () => {
      check((await query("update public.propuestas set estado='rechazada', motivo_rechazo='otro', resuelto_en=now() where id=$1", [pCafe])).rowCount === 0, "una cuenta sin administración no decide");
    });
    const despues = await as("authenticated", admin, async () => (await uno("select public.panel_propuestas($1) as r", [corrida.id])).r);
    check(despues.corrida.aceptadas === 3 && despues.corrida.por_revisar === 2 && despues.propuestas.length === 2, "la bandeja ya no trae lo decidido", despues.corrida);

    // ---------- cancelar una corrida pendiente ----------
    check((await as("authenticated", admin, () => query("update public.rutinas_corridas set estado='cancelada', fin=now() where id=$1 and estado='pendiente'", [corrida.id]))).rowCount === 1, "la administración cancela una corrida pendiente");
    const otra = await as("authenticated", admin, () => uno("insert into public.rutinas_corridas(tipo,ciudad,tope_usd) values ('lugares','queretaro',3) returning estado"));
    check(otra.estado === "pendiente", "cancelada, el botón vuelve a poder correr");

    // ---------- las funciones de la administración: definer, ruta vacía, sin anon ----------
    for (const firma of ["panel_ciudades()", "panel_propuestas(uuid)", "aceptar_propuesta(uuid,jsonb)"]) {
      const f = await uno(`select prosecdef, proconfig, has_function_privilege('anon', oid, 'execute') as anon,
        has_function_privilege('authenticated', oid, 'execute') as auth, has_function_privilege('service_role', oid, 'execute') as servicio
        from pg_proc where oid=$1::regprocedure`, [`public.${firma}`]);
      check(f.prosecdef && f.proconfig?.includes('search_path=""') && !f.anon && f.auth && f.servicio, `${firma}: definer, ruta vacía, sin anon`, f);
    }
    const disparador = await uno(`select has_function_privilege('authenticated', oid, 'execute') as auth, has_function_privilege('anon', oid, 'execute') as anon
      from pg_proc where oid='public.ciudad_investigando_al_correr()'::regprocedure`);
    check(!disparador.auth && !disparador.anon, "el disparador no se llama desde fuera", disparador);
    const rls = (await query("select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname = any($1)", [["ciudades", "ciudades_vistas", "rutinas_corridas", "propuestas", "configuracion"]])).rows;
    check(rls.length === 5 && rls.every((t) => t.relrowsecurity), "las cinco tablas con reglas por fila", rls);
  } finally {
    await query("rollback");
  }
}
