import { randomUUID } from "node:crypto";

// OL-430 · «Buscar artistas» e «Investigar», sin migración: lo que el código da por hecho de las tablas que ya existen (20261020130000_showcase
// y 20261020140000_ciudades). La corrida de «Investigar» es de tipo showcase, sin ciudad, con su artista en `parametros`; las evidencias que trae
// la rutina las escribe la llave de servicio y nacen propuestas, sin autor; los catálogos de artistas se guardan en `configuracion`. Todo dentro
// de una transacción que se deshace.
export async function run({ as, check, expectError, query }) {
  const admin = randomUUID(), persona = randomUUID();
  const adminCorreo = `rutina-artistas-${admin}@local.test`;
  const uno = async (sql, params) => (await query(sql, params)).rows[0];
  const falla = async (accion, codigo, etiqueta) => {
    await query("savepoint antes_del_error");
    await expectError(accion, codigo, etiqueta);
    await query("rollback to savepoint antes_del_error");
  };
  await query("begin");
  try {
    await query("insert into public.admin_correos(correo) values ($1)", [adminCorreo]);
    await query("insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now()),($3,$4,now())", [admin, adminCorreo, persona, `rutina-artistas-persona-${persona}@local.test`]);
    const artista = (await uno("insert into public.artistas (nombre, disciplina, tipo, ciudad) values ('Grupo de prueba OL-430', 'musica', 'grupo', 'San Luis Potosí') returning id")).id;
    const parametros = JSON.stringify({ artista_id: artista });

    // «Investigar»: la administración deja la corrida sin ciudad, a su nombre; una cuenta cualquiera no.
    const corrida = await as("authenticated", admin, async () => (await uno("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,creado_por,parametros) values ('showcase',null,1,$1,$2) returning id, estado", [admin, parametros])));
    check(corrida?.estado === "pendiente", "la administración deja una corrida de showcase sin ciudad, pendiente", corrida);
    await as("authenticated", persona, () => falla(() => query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,creado_por,parametros) values ('showcase',null,1,$1,$2)", [persona, parametros]), "42501", "una cuenta sin administración no investiga"));
    await falla(() => query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,parametros) values ('artistas',null,1,'{}')"), "23514", "«Buscar artistas» sí pide su ciudad");
    // La ficha la encuentra por su artista (`parametros->>'artista_id'`, el filtro de PostgREST que usan la acción y la ficha).
    const porArtista = (await query("select id from public.rutinas_corridas where tipo='showcase' and parametros->>'artista_id' = $1 and estado in ('pendiente','corriendo')", [artista])).rows;
    check(porArtista.length === 1 && porArtista[0].id === corrida.id, "la corrida en curso se encuentra por su artista", porArtista);
    // La base no impide dos a la vez del mismo artista (el índice único es por ciudad): por eso la acción lo comprueba antes.
    await as("authenticated", admin, () => query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,creado_por,parametros) values ('showcase',null,1,$1,$2)", [admin, parametros]));
    check((await uno("select count(*)::int as n from public.rutinas_corridas where tipo='showcase' and parametros->>'artista_id' = $1", [artista])).n === 2, "dos corridas del mismo artista caben en la base: la acción es la que dice «ya hay una en curso»");

    // Lo que trae la rutina: la llave de servicio escribe la evidencia, propuesta y sin autor (no hay sesión).
    const ev = await as("service_role", null, async () =>
      uno(
        "insert into public.showcase_evidencias(artista_id,senal,tipo,titulo,url,fecha,fuente,leida_por,estado) values ($1,'obra','premio','Seleccionado en un estímulo estatal','https://www.cultura.slp.gob.mx/resultados/#lista','2025-11-03','Secretaría de Cultura','rutina','propuesta') returning id, creado_por, decidida_por, decidida_en, estado, leida_por",
        [artista],
      ),
    );
    check(ev && ev.creado_por === null && ev.decidida_por === null && ev.decidida_en === null && ev.estado === "propuesta" && ev.leida_por === "rutina", "la evidencia de la rutina nace propuesta, sin autor ni decisión", ev);
    await as("service_role", null, () => falla(() => query("insert into public.showcase_evidencias(artista_id,senal,tipo,titulo,url,leida_por) values ($1,'obra','premio','Sin enlace','sin-enlace','rutina')", [artista]), "23514", "sin enlace http(s) no hay evidencia, tampoco de la rutina"));
    // Nada de esto sale de Administración: una cuenta cualquiera no la ve; la administración la acepta y queda quién y cuándo.
    await as("authenticated", persona, async () => check((await query("select id from public.showcase_evidencias where artista_id=$1", [artista])).rowCount === 0, "una cuenta cualquiera no ve las evidencias"));
    const aceptada = await as("authenticated", admin, async () => uno("update public.showcase_evidencias set estado='aceptada' where id=$1 returning decidida_por, decidida_en", [ev.id]));
    check(aceptada?.decidida_por === admin && aceptada.decidida_en !== null, "al aceptarla, la base anota quién y cuándo", aceptada);

    // Los catálogos de artistas de cada ciudad, en `configuracion` (por eso la clave lleva guiones bajos).
    await as("service_role", null, () =>
      query("insert into public.configuracion(clave,valor) values ('catalogos_artistas_san_luis_potosi',$1) on conflict (clave) do update set valor=excluded.valor", [
        JSON.stringify({ buscado: null, catalogos: [{ nombre: "Catálogo de Artistas Potosinos (CAPO)", url: "https://www.catalogoartistaspotosino.com/", importado: true, leidas: [] }] }),
      ]),
    );
    check((await uno("select valor->'catalogos'->0->>'importado' as i from public.configuracion where clave='catalogos_artistas_san_luis_potosi'")).i === "true", "la llave de servicio guarda los catálogos de la ciudad");
    await as("service_role", null, () => falla(() => query("insert into public.configuracion(clave,valor) values ('catalogos_artistas:san-luis-potosi','{}')"), "23514", "una clave con «:» o «-» no cabe"));

    // Aceptar un artista que trajo la rutina: la ficha mínima (con su especialidad de hasta 40) y nada de `municipio` ni `obra`, que se quedan en la propuesta.
    const c2 = (await uno("insert into public.ciudades(slug,nombre,estado) values ('ciudad-ol-430','Ciudad OL-430','abierta') returning slug")).slug;
    const deArtistas = (await uno("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,parametros) values ('artistas',$1,2,'{\"fuentes\":[\"padrones\"]}') returning id", [c2])).id;
    const datos = { nombre: "Trío de prueba OL-430", disciplina: "musica", detalle: "Son huasteco", tipo: "grupo", ciudad: "Ciudad OL-430", redes: [], url: "https://sic.cultura.gob.mx/ficha.php?table=gpo_artistico&table_id=1", municipio: "Ciudad OL-430", obra: "Toca son huasteco en festivales del estado." };
    const p = await as("service_role", null, async () => (await uno("insert into public.propuestas(corrida_id,tipo,fuente,datos) values ($1,'artista','Sistema de Información Cultural',$2) returning id", [deArtistas, JSON.stringify(datos)])).id);
    const r = await as("authenticated", admin, async () => (await uno("select public.aceptar_propuesta($1,$2) as r", [p, { nombre: datos.nombre, disciplina: "musica", detalle: "Son huasteco", tipo: "grupo", ciudad: "Ciudad OL-430", redes: [] }])).r);
    const ficha = await uno("select nombre, disciplina, detalle, tipo, ciudad, descripcion from public.artistas where id=$1", [r.ficha_id]);
    check(ficha?.detalle === "Son huasteco" && ficha.tipo === "grupo" && ficha.ciudad === "Ciudad OL-430" && ficha.descripcion === null, "la ficha nace mínima; lo de nutrirla se queda en la propuesta", ficha);
    check((await uno("select datos->>'obra' as obra, ficha_id from public.propuestas where id=$1", [p])).obra === datos.obra, "la propuesta guarda lo que dijo la fuente de su obra, para después");
  } finally {
    await query("rollback");
  }
}
