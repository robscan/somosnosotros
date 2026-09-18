import { randomUUID } from "node:crypto";

const AUTORA = "00000000-0000-4000-8000-0000000000d1";
const OTRA = "00000000-0000-4000-8000-0000000000d2";
const ADMIN = "00000000-0000-4000-8000-0000000000d3";
const AUSENTE = "00000000-0000-4000-8000-0000000000df";
const datos = {
  titulo: "Evento atomico", inicio: "2030-10-01T20:00:00Z", fin: null,
  lugar_id: null, sitio_texto: "Sede publica", sitio_lat: 22.15, sitio_lng: -100.98,
  sitio_reservado: false, sitio_revelar_desde: null, ciudad: "San Luis Potosí",
  zona: "America/Mexico_City", descripcion: null, imagen: null, precio: null, enlace: null,
};
const reservado = { ...datos, sitio_texto: "Casa reservada", sitio_reservado: true, sitio_lat: null, sitio_lng: null, sitio_revelar_desde: "2030-09-30T20:00:00Z" };
const privado = { direccion: "Direccion de prueba", lat: 22.14, lng: -100.97, indicaciones: null, revelar_desde: reservado.sitio_revelar_desde };

export async function run({ as, check, expectError, query, connection }) {
  await query("insert into public.admin_correos (correo) values ('atomico-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'atomico-autora@local.test'), ($2, 'atomico-otra@local.test'), ($3, 'atomico-admin@local.test')", [AUTORA, OTRA, ADMIN]);
  const revision = async (id) => (await query("select actualizado_en::text as revision from public.eventos where id = $1", [id])).rows[0]?.revision ?? null;
  const guardar = async (id, d = datos, p = null, quien = [], esperada = undefined, operacion = randomUUID()) => (await query(
    "select public.guardar_evento_completo($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::timestamptz, $6::uuid) as r", [id, JSON.stringify(d), p === null ? null : JSON.stringify(p), JSON.stringify(quien), esperada === undefined ? await revision(id) : esperada, operacion],
  )).rows[0].r;
  await as("anon", null, () => expectError(() => guardar(null), "42501", "anon no guarda eventos por RPC"));
  await as("authenticated", null, () => expectError(() => guardar(null), "42501", "RPC exige identidad"));

  const creado = await as("authenticated", AUTORA, () => guardar(null, reservado, privado, [{ nombre: "Artista del guardado", tipo: "grupo" }]));
  check(Boolean(creado.id) && creado.artistas.length === 1, "crear guarda evento, sitio privado y artista nuevo");
  const reintento = await as("authenticated", AUTORA, () => guardar(null, reservado, privado, [{ nombre: "Artista del guardado", tipo: "grupo" }], null, creado.id));
  check(reintento.id === creado.id && reintento.repetido, "reintentar el alta recupera el evento confirmado, no crea otro");
  await as("authenticated", OTRA, () => expectError(
    () => guardar(null, reservado, privado, [], null, creado.id), "42501", "la clave de alta no permite apropiarse del evento ajeno",
  ));
  const estado = async () => (await query(`select e.titulo, e.creado_por, e.visible, e.sitio_lat, e.sitio_lng,
    p.direccion, (select count(*)::int from public.eventos_artistas where evento_id = e.id) as artistas
    from public.eventos e left join public.eventos_sitio_privado p on p.evento_id = e.id where e.id = $1`, [creado.id])).rows[0];
  let fila = await estado();
  check(fila.direccion === privado.direccion && fila.artistas === 1, "las relaciones y direccion quedan completas");
  check(fila.sitio_lat === null && fila.sitio_lng === null, "las coordenadas reservadas no van en la fila publica");
  const privadaAjena = await as("authenticated", OTRA, () => query("select * from public.eventos_sitio_privado where evento_id = $1", [creado.id]));
  check(privadaAjena.rowCount === 0, "el nuevo RPC no expone el sitio privado a otra cuenta antes de su hora");
  const nombre = (await query("select tipo from public.artistas where id = $1", [creado.artistas[0]])).rows[0];
  check(nombre.tipo === "grupo", "conserva el tipo de artista deducido por el servidor");

  await as("authenticated", OTRA, () => expectError(() => guardar(creado.id, { ...datos, titulo: "Intrusion" }), "42501", "otra cuenta no edita el evento"));
  check((await estado()).titulo === datos.titulo, "el intento ajeno no cambia datos");
  await as("authenticated", AUTORA, () => expectError(() => guardar(AUSENTE), "42501", "editar un id ausente no devuelve exito"));
  await as("authenticated", AUTORA, () => expectError(
    () => guardar(null, reservado, { ...privado, direccion: "x".repeat(201) }), "23514", "una direccion invalida aborta la creacion completa",
  ));
  check((await query("select count(*)::int as n from public.eventos where creado_por = $1", [AUTORA])).rows[0].n === 1, "el fallo de direccion no deja un evento huerfano");
  await as("authenticated", AUTORA, () => expectError(
    () => guardar(creado.id, { ...reservado, titulo: "Cambio incompleto" }, { ...privado, direccion: "Direccion cambiada" }, [{ nombre: "Artista transitorio" }, { id: AUSENTE, nombre: "Ausente" }]),
    "42501", "un artista ausente aborta todos los cambios anteriores",
  ));
  fila = await estado();
  check(fila.titulo === datos.titulo && fila.direccion === privado.direccion && fila.artistas === 1, "rollback conserva evento, direccion y artistas previos");
  check((await query("select count(*)::int as n from public.artistas where nombre = 'Artista transitorio'")).rows[0].n === 0, "rollback elimina el artista creado durante el intento fallido");

  // Fallo en el ultimo paso, despues de borrar las relaciones anteriores.
  await query(`create function public.prueba_rechazar_liga() returns trigger language plpgsql as $$
    begin if new.evento_id = '${creado.id}'::uuid then raise exception 'fallo de prueba' using errcode = '23514'; end if; return new; end $$;
    create trigger prueba_rechazar_liga before insert on public.eventos_artistas for each row execute function public.prueba_rechazar_liga()`);
  try {
    await as("authenticated", AUTORA, () => expectError(
      () => guardar(creado.id, { ...datos, titulo: "No debe guardarse" }, null, [{ nombre: "Nuevo tambien reversible" }]),
      "23514", "fallar al insertar las relaciones revierte la operacion entera",
    ));
    fila = await estado();
    check(fila.titulo === datos.titulo && fila.direccion === privado.direccion && fila.artistas === 1, "rollback repone relaciones borradas y direccion privada eliminada");
    check((await query("select count(*)::int as n from public.artistas where nombre = 'Nuevo tambien reversible'")).rows[0].n === 0, "no queda el artista de la ultima operacion fallida");
  } finally {
    await query("drop trigger prueba_rechazar_liga on public.eventos_artistas; drop function public.prueba_rechazar_liga()");
  }

  const cambioPrivado = await as("authenticated", AUTORA, () => guardar(creado.id, reservado, { ...privado, lat: 22.16 }, [{ id: creado.artistas[0], nombre: "Artista del guardado" }]));
  check(cambioPrivado.cambio === "donde", "mover solo el pin reservado tambien se reconoce como cambio de lugar");
  await query("delete from public.eventos_sitio_privado where evento_id = $1", [creado.id]);
  const reparado = await as("authenticated", AUTORA, () => guardar(creado.id, reservado, privado, [{ id: creado.artistas[0], nombre: "Artista del guardado" }]));
  check(reparado.cambio === "donde", "reparar la direccion privada ausente heredada se reconoce como cambio");
  const desactualizada = await revision(creado.id);
  const operacionEdicion = randomUUID();
  await as("authenticated", AUTORA, () => guardar(creado.id, { ...reservado, titulo: "Version reciente" }, privado, [{ id: creado.artistas[0], nombre: "Artista del guardado" }], desactualizada, operacionEdicion));
  const edicionRepetida = await as("authenticated", AUTORA, () => guardar(creado.id, { ...reservado, titulo: "Version reciente" }, privado, [{ id: creado.artistas[0], nombre: "Artista del guardado" }], desactualizada, operacionEdicion));
  check(edicionRepetida.repetido && edicionRepetida.cambio === null, "reintentar la ultima edicion no vuelve a escribir ni duplica el cambio");
  await as("authenticated", AUTORA, () => expectError(
    () => guardar(creado.id, { ...datos, titulo: "Version vieja" }, null, [], desactualizada), "40001", "una version vieja no pisa una edicion posterior",
  ));
  fila = await estado();
  check(fila.titulo === "Version reciente" && fila.direccion === privado.direccion && fila.artistas === 1, "el conflicto preserva datos y relaciones de la version mas reciente");
  await as("authenticated", AUTORA, () => expectError(
    () => guardar(creado.id, datos, null, [], null), "40001", "la RPC no permite eludir revision omitiendola",
  ));
  const publico = await as("authenticated", AUTORA, () => guardar(creado.id, { ...datos, creado_por: OTRA, visible: false }));
  check(publico.cambio === "donde" && publico.artistas_anteriores.length === 1, "devuelve el cambio y artistas previos para invalidar las fichas");
  fila = await estado();
  check(fila.direccion === null && fila.artistas === 0, "pasar a publico quita direccion privada y artistas retirados");
  check(fila.creado_por === AUTORA && fila.visible === true, "JSON no permite cambiar autor ni visibilidad");
  await as("authenticated", ADMIN, () => guardar(creado.id, { ...datos, titulo: "Moderado" }));
  check((await estado()).titulo === "Moderado", "administracion conserva permiso de editar");
  await as("authenticated", AUTORA, () => expectError(() => guardar(null, reservado, null), "23514", "no publica un sitio reservado sin direccion"));
  await as("authenticated", AUTORA, () => expectError(() => guardar(null, datos, privado), "23514", "no confunde direccion privada con sitio publico"));
  const claveConcurrente = randomUUID();
  const simultaneos = await Promise.all(Array.from({ length: 2 }, () => connection(async (client) => {
    await client.query("set role authenticated");
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [AUTORA]);
    return (await client.query("select public.guardar_evento_completo(null, $1::jsonb, null, '[]', null, $2) as r", [JSON.stringify(datos), claveConcurrente])).rows[0].r;
  })));
  check(simultaneos.every((r) => r.id === claveConcurrente) && simultaneos.filter((r) => r.repetido).length === 1, "dos altas simultaneas con la misma clave crean un solo evento y ambas recuperan su id");
  await query("delete from public.eventos where id = $1", [claveConcurrente]);
  await query("delete from public.eventos where id = $1", [creado.id]);
  await query("delete from public.artistas where creado_por = $1", [AUTORA]);
  await query("delete from auth.users where id = any($1::uuid[])", [[AUTORA, OTRA, ADMIN]]);
}
