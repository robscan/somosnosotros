import { randomUUID } from "node:crypto";

// OL-433 (bitácora 466, sin migración): lo que la rutina de agendas propone y lo que `src/lib/rutinas/publicarEvento.ts` inserta al aceptar,
// con la llave de servicio y la forma exacta de sus filas, cabe en las reglas reales de la base: el marco de un festival sin punto (sus sedes son
// las de sus actos), un acto colgado de él (y nunca un festival dentro de otro), el periodo del festival recalculado a mano (la llave de servicio
// no ejecuta `recalcular_festival`), un taller con sus sesiones en `eventos_sesiones`, un evento de varios días sin filas de sesiones, la
// inauguración con su exposición ligada por `inaugura_id`, y las propuestas con su id puesto por la rutina, su `datos` cambiado después y la
// búsqueda de los actos que esperan a su festival por `datos->>'marco_propuesto'`.
const ADMIN = randomUUID();
const ZONA = "America/Mexico_City";
const AGENDA = "https://d3dac9gdq8t83x.cloudfront.net/media/archivos/oct_2026.pdf";

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('ol433-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'ol433-admin@local.test')", [ADMIN]);
  const lugar = (await query("insert into public.lugares (nombre, tipo, lat, lng, creado_por) values ('Teatro OL-433', 'foro', 22.15, -100.98, $1) returning id", [ADMIN])).rows[0].id;
  const museo = (await query("insert into public.lugares (nombre, tipo, lat, lng, creado_por) values ('Museo OL-433', 'museo', 22.151, -100.977, $1) returning id", [ADMIN])).rows[0].id;
  const servicio = (sql, args) => as("service_role", null, () => query(sql, args));
  const fila = async (id) => (await query("select * from public.eventos where id = $1", [id])).rows[0];

  // Las columnas que manda `prepararEvento` (las del formulario, la ciudad, el autor, la procedencia y la clase), más las que se le añaden.
  const columnas = ["titulo", "inicio", "fin", "lugar_id", "sitio_texto", "sitio_direccion", "sitio_lat", "sitio_lng", "sitio_reservado", "sitio_revelar_desde", "descripcion", "imagen", "precio", "enlace", "ciudad", "zona", "creado_por", "origen", "fuente_url", "clase", "evento_padre_id", "inaugura_id", "sugerencias"];
  const insertar = async (valores) => {
    const v = {
      sitio_texto: null, sitio_direccion: null, sitio_lat: null, sitio_lng: null, sitio_reservado: false, sitio_revelar_desde: null, descripcion: null, imagen: null,
      precio: null, enlace: AGENDA, ciudad: "San Luis Potosí", zona: ZONA, creado_por: ADMIN, origen: "rutina-agendas", fuente_url: AGENDA, clase: "puntual",
      evento_padre_id: null, inaugura_id: null, sugerencias: {}, lugar_id: null, fin: null, ...valores,
    };
    const params = columnas.map((c) => (c === "sugerencias" ? JSON.stringify(v[c]) : v[c]));
    const marcas = columnas.map((c, i) => (c === "sugerencias" ? `$${i + 1}::jsonb` : `$${i + 1}`));
    return (await servicio(`insert into public.eventos (${columnas.join(", ")}) values (${marcas.join(", ")}) returning id`, params)).rows[0].id;
  };

  // --- 1. El marco de un festival propuesto (con actos): el sitio de su primer acto, escrito, sin punto ni dirección; clase festival; sin precio.
  const marco = await insertar({ titulo: "Otoño Sonoro OL-433", inicio: "2030-10-24T02:00:00Z", fin: "2030-10-31T05:00:00Z", sitio_texto: "Plaza de Armas", clase: "festival" });
  const m = await fila(marco);
  check(m.clase === "festival" && m.sitio_lat === null && m.precio === null && m.origen === "rutina-agendas", "el marco de un festival entra sin punto (sus sedes salen de sus actos)", m);
  // Un evento suelto en un sitio escrito sin punto, en cambio, no (todo sitio lleva el suyo, OL-348): por eso la rutina no lo propone.
  await expectError(() => insertar({ titulo: "Suelto sin punto OL-433", inicio: "2030-10-24T02:00:00Z", sitio_texto: "Plaza de Armas" }), "23514", "un evento suelto en un sitio sin punto no entra");

  // --- 2. Sus actos: colgados por `evento_padre_id`, cada uno con su sede; un festival no cuelga de otro, ni un acto de algo que no es festival.
  const cuerdas = await insertar({ titulo: "Noche de cuerdas OL-433", inicio: "2030-10-24T02:00:00Z", lugar_id: lugar, evento_padre_id: marco, precio: "Gratis" });
  const vientos = await insertar({ titulo: "Noche de vientos OL-433", inicio: "2030-10-31T02:00:00Z", lugar_id: lugar, evento_padre_id: marco });
  check((await fila(cuerdas)).evento_padre_id === marco && (await fila(vientos)).evento_padre_id === marco, "los actos cuelgan del festival con la llave de servicio (sin sesión: el disparador no pide que lo gestione)");
  await expectError(() => insertar({ titulo: "Festival dentro OL-433", inicio: "2030-10-25T02:00:00Z", lugar_id: lugar, evento_padre_id: marco, clase: "festival" }), "23514", "nunca festival dentro de festival");
  await expectError(() => insertar({ titulo: "Acto de un acto OL-433", inicio: "2030-10-25T02:00:00Z", lugar_id: lugar, evento_padre_id: cuerdas }), "23514", "el padre tiene que ser un festival");

  // --- 3. El periodo del festival con sus actos visibles: `recalcular_festival` con la llave de servicio (lo que hace `insertarEvento`).
  await servicio("update public.eventos set inicio = '2030-10-20T02:00:00Z', fin = '2030-11-05T05:00:00Z' where id = $1", [marco]);
  await servicio("select public.recalcular_festival($1)", [marco]);
  const esperado = (await query("select min(a.inicio) as i, max(public.fin_en_programa(a.inicio, a.fin, a.zona)) as f from public.eventos a where a.evento_padre_id = $1 and a.visible", [marco])).rows[0];
  const m2 = await fila(marco);
  check(m2.inicio.getTime() === esperado.i.getTime() && m2.fin.getTime() === esperado.f.getTime(), "la llave de servicio recalcula el periodo del festival con sus actos", { m2: [m2.inicio, m2.fin], esperado });
  // La regla de respaldo de publicarEvento (`periodoDePrograma`): del primer acto (24 oct 02:00Z) al último sin fin, 3 h después (31 oct 05:00Z).
  check(m2.inicio.toISOString() === "2030-10-24T02:00:00.000Z" && m2.fin.toISOString() === "2030-10-31T05:00:00.000Z", "y dice lo mismo que periodoDePrograma", [m2.inicio, m2.fin]);

  // --- 4. Un taller con sus sesiones (días sueltos): el evento de la primera a la última y una fila por sesión, TODAS en una sola inserción
  //     (la base valida al cerrar la transacción que haya de 2 a 31 y que la primera y la última cuadren con el evento).
  const taller = await insertar({ titulo: "Taller de grabado OL-433", inicio: "2030-10-22T23:00:00Z", fin: "2030-10-30T01:00:00Z", lugar_id: museo, clase: "taller", precio: "$300" });
  await expectError(() => servicio("insert into public.eventos_sesiones (evento_id, fecha, inicio, fin) values ($1, '2030-10-22', '2030-10-22T23:00:00Z', '2030-10-23T01:00:00Z')", [taller]), "22023", "una sesión suelta no basta (por eso insertarEvento las manda juntas)");
  await servicio(
    "insert into public.eventos_sesiones (evento_id, fecha, inicio, fin) values ($1, '2030-10-22', '2030-10-22T23:00:00Z', '2030-10-23T01:00:00Z'), ($1, '2030-10-23', '2030-10-23T23:00:00Z', '2030-10-24T01:00:00Z'), ($1, '2030-10-29', '2030-10-29T23:00:00Z', '2030-10-30T01:00:00Z')",
    [taller],
  );
  const sesiones = (await query("select fecha::text from public.eventos_sesiones where evento_id = $1 order by fecha", [taller])).rows.map((r) => r.fecha);
  check(JSON.stringify(sesiones) === JSON.stringify(["2030-10-22", "2030-10-23", "2030-10-29"]), "el taller guarda sus tres sesiones", sesiones);
  await expectError(() => servicio("insert into public.eventos_sesiones (evento_id, fecha, inicio, fin) values ($1, '2030-10-29', '2030-10-29T23:30:00Z', null)", [taller]), "23505", "una sesión por día");
  // Una sesión que acaba de madrugada no cabe en su día (por eso publicarEvento la deja sin hora de fin).
  const noche = await insertar({ titulo: "Noches de son OL-433", inicio: "2030-10-25T04:00:00Z", fin: "2030-10-27T05:00:00Z", lugar_id: lugar });
  await expectError(
    () => servicio("insert into public.eventos_sesiones (evento_id, fecha, inicio, fin) values ($1, '2030-10-24', '2030-10-25T04:00:00Z', '2030-10-25T08:00:00Z'), ($1, '2030-10-26', '2030-10-27T04:00:00Z', '2030-10-27T05:00:00Z')", [noche]),
    "22023",
    "una sesión que pasa de la medianoche se rechaza",
  );
  await servicio("insert into public.eventos_sesiones (evento_id, fecha, inicio, fin) values ($1, '2030-10-24', '2030-10-25T04:00:00Z', null), ($1, '2030-10-26', '2030-10-27T04:00:00Z', '2030-10-27T05:00:00Z')", [noche]);
  check((await query("select count(*)::int as n from public.eventos_sesiones where evento_id = $1", [noche])).rows[0].n === 2, "sin hora de fin, la misma sesión entra");

  // --- 5. Un evento de días seguidos con el mismo horario («Mismo horario todos los días», OL-310): del primer día al último, sin filas.
  const luz = await insertar({ titulo: "Fiesta de Luz OL-433", inicio: "2030-10-31T01:00:00Z", fin: "2030-11-02T04:00:00Z", sitio_texto: "Plaza de Armas", sitio_direccion: "Jardín Hidalgo s/n", sitio_lat: 22.1518, sitio_lng: -100.9755, evento_padre_id: marco, precio: "Gratis" });
  const l = await fila(luz);
  check(l.termina.getTime() === new Date("2030-11-02T04:00:00Z").getTime() && l.sitio_lat === 22.1518, "el evento de tres días acaba con su último día y lleva el punto que le dio el mapa", l);

  // --- 6. La inauguración con su periodo: la inauguración (evento) y la exposición ligada por `inaugura_id`, sin su hora ni su precio.
  const inauguracion = await insertar({ titulo: "Inauguración: Raíces OL-433", inicio: "2030-10-23T01:00:00Z", lugar_id: museo, sugerencias: { exposicion: { estado: "aceptada" } } });
  const expo = await insertar({ titulo: "Raíces OL-433", inicio: "2030-10-22T06:00:00Z", fin: "2030-12-01T05:59:00Z", lugar_id: museo, clase: "exposicion", inaugura_id: inauguracion, enlace: AGENDA });
  const x = await fila(expo);
  const i = await fila(inauguracion);
  check(x.clase === "exposicion" && x.inaugura_id === inauguracion && x.precio === null && i.sugerencias?.exposicion?.estado === "aceptada", "la exposición queda ligada a su inauguración, y la inauguración sin sugerir otra", { x, i: i.sugerencias });
  await expectError(() => insertar({ titulo: "Otra expo OL-433", inicio: "2030-10-22T06:00:00Z", fin: "2030-12-01T05:59:00Z", lugar_id: museo, clase: "exposicion", inaugura_id: taller }), "23514", "solo se inaugura con un evento puntual");
  // Y una exposición que ya estaba sin inauguración se liga después (lo que hace insertarEvento con `exposicionExistente`).
  const yaEstaba = await insertar({ titulo: "Ecos OL-433", inicio: "2030-10-22T06:00:00Z", fin: "2030-12-01T05:59:00Z", lugar_id: museo, clase: "exposicion" });
  const inaug2 = await insertar({ titulo: "Inauguración: Ecos OL-433", inicio: "2030-10-23T01:00:00Z", lugar_id: museo });
  await servicio("update public.eventos set inaugura_id = $2 where id = $1 and inaugura_id is null", [yaEstaba, inaug2]);
  check((await fila(yaEstaba)).inaugura_id === inaug2, "la exposición que ya estaba queda con su inauguración");

  // --- 7. Las propuestas: con el id que les pone la rutina (los actos apuntan a su festival antes de insertarse), su `datos` cambiado después
  //     (sesiones sumadas, un acto ligado a su festival) y los actos que esperan, encontrados por `datos->>'marco_propuesto'`.
  const corrida = (await servicio("insert into public.rutinas_corridas (tipo, ciudad, tope_usd, estado) values ('agendas', 'san-luis-potosi', 2, 'corriendo') returning id")).rows[0].id;
  const festivalP = randomUUID();
  const actoP = randomUUID();
  await servicio(
    "insert into public.propuestas (id, corrida_id, tipo, fuente, datos, estado) values ($1, $3, 'evento', 'Agendas de gobierno', $4::jsonb, 'propuesta'), ($2, $3, 'evento', 'Agendas de gobierno', $5::jsonb, 'propuesta')",
    [festivalP, actoP, corrida, JSON.stringify({ clase: "festival", titulo: "Otoño Sonoro", actos: 1 }), JSON.stringify({ titulo: "Noche de cuerdas", marco_propuesto: festivalP, espera: "Se publica cuando aceptes el festival «Otoño Sonoro»." })],
  );
  await servicio("update public.propuestas set datos = $2::jsonb where id = $1 and estado = 'propuesta'", [actoP, JSON.stringify({ titulo: "Noche de cuerdas", marco_propuesto: festivalP, sesiones: [{ inicio: "2030-10-24T02:00:00Z" }, { inicio: "2030-10-25T02:00:00Z" }] })]);
  const esperan = (await servicio("select id from public.propuestas where tipo = 'evento' and datos->>'marco_propuesto' = $1", [festivalP])).rows.map((r) => r.id);
  check(esperan.length === 1 && esperan[0] === actoP, "los actos de un festival propuesto se encuentran por datos->>'marco_propuesto'", esperan);
  check((await query("select jsonb_array_length(datos->'sesiones') as n from public.propuestas where id = $1", [actoP])).rows[0].n === 2, "la rutina puede cambiar `datos` de su propuesta (sesiones sumadas)");
}
