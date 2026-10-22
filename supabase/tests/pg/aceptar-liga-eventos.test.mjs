import { randomUUID } from "node:crypto";

// OL-440 · migración 20261021190000: al aceptar un artista propuesto por el guion de las agendas (scripts/instituciones/ligar-artistas.ts),
// `aceptar_propuesta` lo liga a los eventos de `datos.eventos` que existen (lo que no es un id o no es un evento se ignora), cada uno con su
// orden detrás de los que ya tenía; aceptar dos veces no liga dos veces, y sin `eventos` todo es como antes. Todo dentro de una transacción
// que se deshace.
export async function run({ as, check, expectError, query }) {
  const admin = randomUUID(), persona = randomUUID();
  const adminCorreo = `aceptar-liga-${admin}@local.test`;
  const uno = async (sql, params) => (await query(sql, params)).rows[0];
  const falla = async (accion, codigo, etiqueta) => {
    await query("savepoint antes_del_error");
    await expectError(accion, codigo, etiqueta);
    await query("rollback to savepoint antes_del_error");
  };
  await query("begin");
  try {
    await query("insert into public.admin_correos(correo) values ($1)", [adminCorreo]);
    await query("insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now()),($3,$4,now())", [admin, adminCorreo, persona, `aceptar-liga-persona-${persona}@local.test`]);
    const evento = async (titulo) =>
      (
        await uno(
          "insert into public.eventos (titulo, inicio, sitio_texto, sitio_lat, sitio_lng, ciudad, zona, creado_por, origen) values ($1, '2026-03-06T01:00:00Z', 'Teatro de prueba OL-440', 22.15, -100.98, 'San Luis Potosí', 'America/Mexico_City', $2, 'agenda-secult-2026-03') returning id",
          [titulo, admin],
        )
      ).id;
    const ev1 = await evento("Concierto de prueba OL-440");
    const ev2 = await evento("Serenata de prueba OL-440");
    // ev2 ya tiene a otro artista en el lugar 0: el nuevo va detrás.
    const otro = (await uno("insert into public.artistas (nombre, disciplina, tipo, ciudad) values ('Orquesta de prueba OL-440', 'musica', 'grupo', 'San Luis Potosí') returning id")).id;
    await query("insert into public.eventos_artistas (evento_id, artista_id, orden) values ($1, $2, 0)", [ev2, otro]);

    const corrida = (await uno("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,gasto_usd,estado,creado_por,parametros) values ('artistas','san-luis-potosi',0.01,0,'terminada',$1,'{\"guion\":\"ligar-artistas\"}') returning id, estado", [admin]));
    check(corrida?.estado === "terminada", "el guion deja su corrida de artistas ya terminada, sin gasto", corrida);
    const proponer = (datos) => as("service_role", null, async () => (await uno("insert into public.propuestas(corrida_id,tipo,fuente,datos) values ($1,'artista','Agenda de la Secretaría de Cultura',$2) returning id", [corrida.id, JSON.stringify(datos)])).id);
    const aceptar = (p, nombre) => as("authenticated", admin, async () => (await uno("select public.aceptar_propuesta($1,$2) as r", [p, { nombre, disciplina: "musica", tipo: "grupo", ciudad: "San Luis Potosí", redes: [] }])).r);

    // Con sus eventos: los que existen se ligan una vez cada uno; un id que no es evento, un texto y un número se ignoran.
    const datos = { nombre: "Banda de prueba OL-440", disciplina: "musica", tipo: "grupo", ciudad: "San Luis Potosí", redes: [], eventos: [ev1, ev2, ev1, randomUUID(), "no-es-un-id", 7] };
    const p = await proponer(datos);
    await as("authenticated", persona, () => falla(() => query("select public.aceptar_propuesta($1,$2)", [p, { nombre: datos.nombre, ciudad: "San Luis Potosí" }]), "42501", "una cuenta sin administración no acepta (ni liga)"));
    const r = await aceptar(p, datos.nombre);
    check(r?.estado === "aceptada" && r.ficha_id && r.slug && r.eventos_ligados === 2, "aceptar el artista crea la ficha y la liga a sus dos eventos", r);
    const ligas = (await query("select evento_id, orden from public.eventos_artistas where artista_id=$1 order by orden", [r.ficha_id])).rows;
    check(ligas.length === 2 && ligas.find((l) => l.evento_id === ev1)?.orden === 0 && ligas.find((l) => l.evento_id === ev2)?.orden === 1, "cada evento con su orden: el primero en el que no tenía a nadie, detrás del que ya estaba en el otro", ligas);
    check((await uno("select count(*)::int as n from public.eventos_artistas where evento_id=$1", [ev2])).n === 2, "el artista que ya estaba en el evento se queda");

    // Aceptar otra vez devuelve lo que ya quedó y no liga de nuevo.
    const r2 = await aceptar(p, datos.nombre);
    check(r2?.estado === "aceptada" && r2.ficha_id === r.ficha_id && (await uno("select count(*)::int as n from public.eventos_artistas where artista_id=$1", [r.ficha_id])).n === 2, "aceptar dos veces no liga dos veces", r2);

    // Sin `eventos`, o con algo que no es una lista, como antes: la ficha nace sola.
    const sinEventos = await aceptar(await proponer({ nombre: "Solista de prueba OL-440", ciudad: "San Luis Potosí", redes: [] }), "Solista de prueba OL-440");
    check(sinEventos?.estado === "aceptada" && sinEventos.eventos_ligados === 0 && (await uno("select count(*)::int as n from public.eventos_artistas where artista_id=$1", [sinEventos.ficha_id])).n === 0, "una propuesta sin eventos acepta como antes", sinEventos);
    const noLista = await aceptar(await proponer({ nombre: "Dúo de prueba OL-440", ciudad: "San Luis Potosí", redes: [], eventos: { id: ev1 } }), "Dúo de prueba OL-440");
    check(noLista?.eventos_ligados === 0 && (await uno("select count(*)::int as n from public.eventos_artistas where artista_id=$1", [noLista.ficha_id])).n === 0, "`eventos` que no es una lista se ignora", noLista);

    // Un evento borrado después de proponer ya no está: se ignora y lo demás se liga.
    const ev3 = await evento("Recital de prueba OL-440");
    const p3 = await proponer({ nombre: "Coro de prueba OL-440", ciudad: "San Luis Potosí", redes: [], eventos: [ev3, ev1] });
    await query("delete from public.eventos where id=$1", [ev3]);
    const r3 = await aceptar(p3, "Coro de prueba OL-440");
    check(r3?.eventos_ligados === 1 && (await uno("select evento_id from public.eventos_artistas where artista_id=$1", [r3.ficha_id])).evento_id === ev1, "un evento que ya no existe se ignora", r3);

    // Un rechazo no liga nada (la ficha no existe).
    const p4 = await proponer({ nombre: "Ensamble rechazado OL-440", ciudad: "San Luis Potosí", redes: [], eventos: [ev1] });
    await as("authenticated", admin, () => query("update public.propuestas set estado='rechazada', motivo_rechazo='no_cultural', resuelto_en=now() where id=$1", [p4]));
    const r4 = await aceptar(p4, "Ensamble rechazado OL-440");
    check(r4?.estado === "rechazada" && r4.ficha_id === null && (await uno("select count(*)::int as n from public.eventos_artistas where evento_id=$1", [ev1])).n === 2, "una propuesta rechazada no crea ficha ni liga", r4);
  } finally {
    await query("rollback");
  }
}
