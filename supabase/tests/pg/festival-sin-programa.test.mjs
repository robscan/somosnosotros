import { randomUUID } from "node:crypto";

// OL-413 (bitácora 444): un festival sin programa se publica como un evento y queda con clase festival, en una sola transacción; un reintento no
// publica dos; editarlo sigue funcionando con `guardar_evento_con_clase`; sin sesión no se puede. Zona: America/Mexico_City (UTC−6).
const AUTORA = randomUUID();

// Cumbiachella: vie 30 de oct, 8 pm a 2 am del sábado.
const cumbiachella = {
  titulo: "Cumbiachella", inicio: "2030-10-31T02:00:00Z", fin: "2030-10-31T08:00:00Z",
  lugar_id: null, sitio_texto: "Foro de prueba", sitio_lat: 22.15, sitio_lng: -100.98,
  sitio_reservado: false, sitio_revelar_desde: null, ciudad: "San Luis Potosí",
  zona: "America/Mexico_City", descripcion: "Festival cumbiero potosino.", imagen: null, precio: null, enlace: null,
};

export async function run({ as, check, expectError, query }) {
  await query("insert into auth.users (id, email) values ($1, 'festival-sin-programa@local.test')", [AUTORA]);
  await query("update public.avisos_config set capturar = true, corte = clock_timestamp()");
  const json = (v) => (v === null ? null : JSON.stringify(v));
  const publicar = (quien, d, { sesiones = null, operacion = randomUUID(), artistas = [] } = {}) =>
    as("authenticated", quien, async () => (await query("select public.publicar_festival_sin_programa($1::jsonb, null, $2::jsonb, $3::jsonb, $4::uuid) as r", [json(d), json(artistas), json(sesiones), operacion])).rows[0].r);
  const fila = async (id) => (await query("select * from public.eventos where id = $1", [id])).rows[0];
  const cuantos = async () => Number((await query("select count(*) as n from public.eventos")).rows[0].n);

  // --- Un día, un lugar: una sola ficha de clase festival, con su día, su hora y su sitio, sin actos.
  const op = randomUUID();
  const hecho = await publicar(AUTORA, cumbiachella, { operacion: op, artistas: [{ nombre: "Sonido Satanás", tipo: "grupo" }, { nombre: "Vinyl Box", tipo: "grupo" }] });
  const f = await fila(hecho.id);
  check(f.clase === "festival" && f.visible && !f.borrador && f.evento_padre_id === null, "el festival sin programa queda publicado, visible y con clase festival", f && { clase: f.clase, visible: f.visible });
  check(new Date(f.inicio).toISOString() === "2030-10-31T02:00:00.000Z" && new Date(f.fin).toISOString() === "2030-10-31T08:00:00.000Z" && f.sitio_texto === "Foro de prueba", "conserva su día, su hora (8 pm a 2 am) y su sitio");
  check((await query("select 1 from public.eventos where evento_padre_id = $1", [hecho.id])).rowCount === 0, "no tiene actos");
  const artistas = (await query("select a.nombre from public.eventos_artistas ea join public.artistas a on a.id = ea.artista_id where ea.evento_id = $1 order by ea.orden", [hecho.id])).rows.map((r) => r.nombre);
  check(artistas.join() === "Sonido Satanás,Vinyl Box", "la alineación queda en «Quién»", artistas);
  check(hecho.padre === null && hecho.inauguracion === null, "devuelve lo mismo que el alta con clase (sin festival padre ni inauguración)");

  // --- Un reintento con la misma operación no publica otro.
  const antes = await cuantos();
  const otraVez = await publicar(AUTORA, cumbiachella, { operacion: op });
  check(otraVez.repetido === true && otraVez.id === hecho.id && (await cuantos()) === antes, "un reintento devuelve lo ya publicado");

  // --- Varios días con su horario por día: las sesiones se guardan y el festival sigue sin programa.
  const dias = [
    { inicio: "2030-11-07T02:00:00Z", fin: "2030-11-07T05:00:00Z" },
    { inicio: "2030-11-08T01:00:00Z", fin: "2030-11-08T05:00:00Z" },
  ];
  const varios = await publicar(AUTORA, { ...cumbiachella, titulo: "Noches de jazz", inicio: dias[0].inicio, fin: dias[1].fin }, { sesiones: dias });
  const sesiones = (await query("select fecha::text as fecha from public.eventos_sesiones where evento_id = $1 order by fecha", [varios.id])).rows.map((r) => r.fecha);
  check((await fila(varios.id)).clase === "festival" && sesiones.join() === "2030-11-06,2030-11-07", "un festival de dos noches guarda su horario por día", sesiones);

  // --- Editarlo como festival (ya lo es): `guardar_evento_con_clase` lo deja y su periodo no cambia sin actos.
  const revision = (await query("select actualizado_en::text as v from public.eventos where id = $1", [hecho.id])).rows[0].v;
  await as("authenticated", AUTORA, () =>
    query("select public.guardar_evento_con_clase($1::uuid, $2::jsonb, null, '[]'::jsonb, null, $3::jsonb, $4::timestamptz, $5::uuid)", [hecho.id, json({ ...cumbiachella, inicio: "2030-10-31T03:00:00Z" }), json({ clase: "festival" }), revision, randomUUID()]),
  );
  const editado = await fila(hecho.id);
  check(editado.clase === "festival" && new Date(editado.inicio).toISOString() === "2030-10-31T03:00:00.000Z", "editar el festival sin programa cambia su hora y sigue siendo festival");

  // --- Sin sesión, nada.
  await expectError(() => query("select public.publicar_festival_sin_programa($1::jsonb, null, '[]'::jsonb, null, $2::uuid)", [json(cumbiachella), randomUUID()]), "42501", "sin sesión no se publica un festival");
}
