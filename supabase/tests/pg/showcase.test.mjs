import { randomUUID } from "node:crypto";

/**
 * OL-426 (bitácora 459, migración 20261020130000): las tablas del showcase. Solo la administración las lee y las escribe; una cuenta cualquiera
 * no ve ni escribe nada y un visitante ni siquiera tiene permiso sobre ellas; la llave de servicio lo puede todo. Los puntajes van de 0 a 2, los
 * estados y las señales son una lista cerrada, toda evidencia lleva una dirección http(s) y cada cambio de estado queda con quién y cuándo.
 */
const ADMIN = randomUUID();
const OTRA = randomUUID();
const OTRO_ADMIN = randomUUID();

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('showcase-admin@local.test'), ('showcase-admin2@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'showcase-admin@local.test'), ($2, 'showcase-otra@local.test'), ($3, 'showcase-admin2@local.test')", [ADMIN, OTRA, OTRO_ADMIN]);
  const artista = async (nombre) => (await query("insert into public.artistas (nombre, disciplina) values ($1, 'musica') returning id", [nombre])).rows[0].id;
  const A = await artista("Showcase Uno OL-426");
  const B = await artista("Showcase Dos OL-426");
  const TABLAS = ["showcase_candidatos", "showcase_cambios_estado", "showcase_evidencias", "lecturas_redes"];

  // --- Un visitante: sin permiso sobre ninguna de las cuatro tablas.
  for (const t of TABLAS) {
    await as("anon", null, () => expectError(() => query(`select count(*) from public.${t}`), "42501", `anon no lee ${t}`));
  }
  await as("anon", null, () => expectError(() => query("insert into public.showcase_candidatos (artista_id, estado) values ($1, 'invitado')", [A]), "42501", "anon no escribe candidatos"));

  // --- La administración: escribe y lee; el autor y la hora los pone la base aunque la fila traiga otros.
  const fila = await as("authenticated", ADMIN, async () => (await query("insert into public.showcase_candidatos (artista_id, estado, puntaje_circulacion, notas, actualizado_por, actualizado_en) values ($1, 'revisado', 2, 'Nota privada', $2, '2000-01-01') returning actualizado_por, actualizado_en", [A, OTRA])).rows[0]);
  check(fila.actualizado_por === ADMIN, "el autor del cambio es la sesión, no el que manda la fila", fila.actualizado_por);
  check(new Date(fila.actualizado_en).getFullYear() > 2000, "la hora del cambio la pone la base", fila.actualizado_en);
  const ev = await as("authenticated", ADMIN, async () => (await query("insert into public.showcase_evidencias (artista_id, senal, tipo, titulo, url, fuente, leida_por, estado, creado_por) values ($1, 'obra', 'premio', 'Mención en un concurso', 'https://cultura.example.org/premios?id=3', 'cultura.example.org', 'persona', 'aceptada', $2) returning id, creado_por, decidida_por, decidida_en", [A, OTRA])).rows[0]);
  check(ev.creado_por === ADMIN && ev.decidida_por === ADMIN && ev.decidida_en, "la evidencia añadida aceptada queda a nombre de la sesión y decidida por ella", ev);
  const propuesta = await as("service_role", null, async () => (await query("insert into public.showcase_evidencias (artista_id, senal, tipo, titulo, url, leida_por) values ($1, 'circulacion', 'presentacion', 'Fecha en otra ciudad', 'http://agenda.example.com/fecha', 'rutina') returning id, estado, decidida_por", [A])).rows[0]);
  check(propuesta.estado === "propuesta" && propuesta.decidida_por === null, "lo que trae la rutina (llave de servicio) nace propuesta y sin decidir", propuesta);
  const lectura = await as("authenticated", ADMIN, async () => (await query("insert into public.lecturas_redes (artista_id, red, seguidores, publicaciones, ultima_publicacion) values ($1, 'instagram', 3200, 412, '2026-10-18') returning leido_por, leido_en", [A])).rows[0]);
  check(lectura.leido_por === ADMIN && lectura.leido_en, "la lectura queda a nombre de quien la registra, con su fecha", lectura);
  const cuenta = (t) => as("authenticated", ADMIN, async () => (await query(`select count(*)::int as n from public.${t}`)).rows[0].n);
  check((await cuenta("showcase_candidatos")) === 1 && (await cuenta("showcase_evidencias")) === 2 && (await cuenta("lecturas_redes")) === 1, "la administración lee las tres tablas");

  // --- El registro de estados: nace con «revisado», crece con cada cambio de estado y no con las notas ni los puntajes.
  const registro = () => as("authenticated", ADMIN, async () => (await query("select estado, por from public.showcase_cambios_estado where artista_id = $1 order by creado_en, id", [A])).rows);
  check(JSON.stringify((await registro()).map((r) => r.estado)) === '["revisado"]', "nacer en «revisado» deja una fila en el registro", await registro());
  await as("authenticated", OTRO_ADMIN, () => query("update public.showcase_candidatos set estado = 'invitado' where artista_id = $1", [A]));
  await as("authenticated", ADMIN, () => query("update public.showcase_candidatos set notas = 'Otra nota', puntaje_obra = 1 where artista_id = $1", [A]));
  const tras = await registro();
  check(tras.length === 2 && tras[1].estado === "invitado" && tras[1].por === OTRO_ADMIN, "el cambio de estado queda con quién lo hizo; notas y puntajes no suman al registro", tras);
  const quien = await as("authenticated", ADMIN, async () => (await query("select actualizado_por from public.showcase_candidatos where artista_id = $1", [A])).rows[0].actualizado_por);
  check(quien === ADMIN, "el último cambio (las notas) queda a nombre de quien lo hizo", quien);
  await as("authenticated", ADMIN, () => query("insert into public.showcase_candidatos (artista_id, notas) values ($1, 'Solo una nota')", [B]));
  const deB = await as("authenticated", ADMIN, async () => (await query("select count(*)::int as n from public.showcase_cambios_estado where artista_id = $1", [B])).rows[0].n);
  check(deB === 0, "guardar solo una nota (candidato implícito) no inventa un cambio de estado", deB);
  await as("authenticated", ADMIN, () => expectError(() => query("insert into public.showcase_cambios_estado (artista_id, estado) values ($1, 'confirmado')", [A]), "42501", "nadie escribe el registro a mano, ni la administración"));

  // --- Aceptar y deshacer una propuesta: quién y cuándo, y deshacer lo borra.
  await as("authenticated", OTRO_ADMIN, () => query("update public.showcase_evidencias set estado = 'aceptada', creado_por = $2 where id = $1", [propuesta.id, OTRA]));
  const aceptada = await as("authenticated", ADMIN, async () => (await query("select estado, decidida_por, decidida_en, creado_por from public.showcase_evidencias where id = $1", [propuesta.id])).rows[0]);
  check(aceptada.estado === "aceptada" && aceptada.decidida_por === OTRO_ADMIN && aceptada.decidida_en && aceptada.creado_por === null, "aceptar queda con quién y cuándo; el autor de la evidencia no se cambia", aceptada);
  await as("authenticated", ADMIN, () => query("update public.showcase_evidencias set estado = 'propuesta' where id = $1", [propuesta.id]));
  const deshecha = await as("authenticated", ADMIN, async () => (await query("select decidida_por, decidida_en from public.showcase_evidencias where id = $1", [propuesta.id])).rows[0]);
  check(deshecha.decidida_por === null && deshecha.decidida_en === null, "deshacer vuelve a propuesta sin decisión", deshecha);

  // --- Una cuenta cualquiera: no ve nada, no escribe nada, no cambia ni borra lo que hay.
  for (const t of TABLAS) {
    const n = await as("authenticated", OTRA, async () => (await query(`select count(*)::int as n from public.${t}`)).rows[0].n);
    check(n === 0, `una cuenta que no es administración no ve ninguna fila de ${t}`, n);
  }
  await as("authenticated", OTRA, () => expectError(() => query("insert into public.showcase_candidatos (artista_id, estado) values ($1, 'confirmado')", [B]), "42501", "una cuenta cualquiera no se pone en el showcase"));
  await as("authenticated", OTRA, () => expectError(() => query("insert into public.showcase_evidencias (artista_id, senal, tipo, titulo, url) values ($1, 'obra', 'obra', 'Mi disco', 'https://disco.example.com')", [B]), "42501", "una cuenta cualquiera no añade evidencias"));
  await as("authenticated", OTRA, () => expectError(() => query("insert into public.lecturas_redes (artista_id, red, seguidores) values ($1, 'instagram', 99999)", [B]), "42501", "una cuenta cualquiera no añade lecturas"));
  const cambiadas = await as("authenticated", OTRA, async () => (await query("update public.showcase_candidatos set estado = 'confirmado', notas = null returning artista_id")).rowCount);
  const borradas = await as("authenticated", OTRA, async () => (await query("delete from public.showcase_evidencias returning id")).rowCount);
  check(cambiadas === 0 && borradas === 0, "una cuenta cualquiera no cambia ni borra nada", { cambiadas, borradas });
  await as("authenticated", OTRA, () => expectError(() => query("select public.showcase_candidatos_registro()"), "42501", "el disparador no se llama desde fuera"));

  // --- Los límites: puntajes de 0 a 2, listas cerradas y la dirección de la evidencia.
  const malo = (sql, valores, etiqueta, codigo = "23514") => as("authenticated", ADMIN, () => expectError(() => query(sql, valores), codigo, etiqueta));
  await malo("update public.showcase_candidatos set puntaje_circulacion = 3 where artista_id = $1", [A], "un puntaje de 3 no entra");
  await malo("update public.showcase_candidatos set puntaje_vinculo = -1 where artista_id = $1", [A], "un puntaje negativo no entra");
  await malo("update public.showcase_candidatos set estado = 'ganador' where artista_id = $1", [A], "un estado que no existe no entra");
  await malo("update public.showcase_candidatos set notas = repeat('x', 4001) where artista_id = $1", [A], "notas de más de 4 000 letras no entran");
  const evidencia = (cambios) => {
    const e = { senal: "obra", tipo: "obra", titulo: "Disco", url: "https://disco.example.com/a", leida_por: "persona", estado: "aceptada", ...cambios };
    return ["insert into public.showcase_evidencias (artista_id, senal, tipo, titulo, url, leida_por, estado) values ($1, $2, $3, $4, $5, $6, $7)", [A, e.senal, e.tipo, e.titulo, e.url, e.leida_por, e.estado]];
  };
  await malo(...evidencia({ url: null }), "una evidencia sin dirección no entra", "23502");
  for (const url of ["ftp://disco.example.com/a", "javascript:alert(1)", "https://localhost/x", "https://disco.example.com/a b", "https://alguien@disco.example.com/a", "disco.example.com/a", ""]) {
    await malo(...evidencia({ url }), `la dirección «${url}» no es una evidencia`);
  }
  await malo(...evidencia({ senal: "fama" }), "una señal que no existe no entra");
  await malo(...evidencia({ tipo: "rumor" }), "un tipo que no existe no entra");
  await malo(...evidencia({ leida_por: "alguien" }), "«leída por» es la rutina o una persona");
  await malo(...evidencia({ estado: "dudosa" }), "un estado de evidencia que no existe no entra");
  await malo(...evidencia({ titulo: "   " }), "una evidencia sin título no entra");
  await malo("insert into public.lecturas_redes (artista_id, red, seguidores) values ($1, 'instagram', -1)", [A], "seguidores negativos no entran");
  await malo("insert into public.lecturas_redes (artista_id, red, seguidores) values ($1, 'myspace', 10)", [A], "una red que no existe no entra");
  await malo("insert into public.lecturas_redes (artista_id, red) values ($1, 'instagram')", [A], "una lectura sin ninguna cifra no entra");
  const buena = await as("authenticated", ADMIN, async () => (await query("insert into public.showcase_evidencias (artista_id, senal, tipo, titulo, url) values ($1, 'vinculo', 'redes', 'Perfil', 'HTTPS://Sub.Ejemplo.mx:8080/ruta?x=1#a') returning estado", [A])).rows[0].estado);
  check(buena === "propuesta", "una dirección https con puerto, ruta y consulta entra; sin estado nace propuesta", buena);

  // --- La llave de servicio lee todo (la rutina de OL-428) y borrar el artista se lleva lo suyo.
  const servicio = await as("service_role", null, async () => (await query("select (select count(*) from public.showcase_candidatos)::int as c, (select count(*) from public.showcase_cambios_estado)::int as r")).rows[0]);
  check(servicio.c === 2 && servicio.r === 2, "la llave de servicio lee candidatos y registro", servicio);
  await query("delete from public.artistas where id = $1", [A]);
  const quedan = (await query("select (select count(*) from public.showcase_candidatos where artista_id = $1) + (select count(*) from public.showcase_evidencias where artista_id = $1) + (select count(*) from public.lecturas_redes where artista_id = $1) + (select count(*) from public.showcase_cambios_estado where artista_id = $1) as n", [A])).rows[0].n;
  check(Number(quedan) === 0, "borrar el artista borra su candidatura, sus evidencias, sus lecturas y su registro", quedan);
}
