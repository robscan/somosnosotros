import { randomUUID } from "node:crypto";

// OL-341 (bitácora 370): «Este festival ya está publicado. ¿Es tu participación?». El caso Electric Universe con dos cuentas: (b) el evento igual
// de otra cuenta se vuelve el marco de un festival con los dos como actos, y (a) un tercero se une al festival ya publicado. Las dos escriben en
// filas ajenas (SECURITY DEFINER): se prueba que solo hacen esa transformación, solo con títulos parecidos el mismo día, que no tocan el autor
// ni lo oculto, y que son todo o nada. Zona: America/Mexico_City (UTC−6).
const ANA = randomUUID();
const BETO = randomUUID();
const CATA = randomUUID();

const base = {
  titulo: "Electric Universe Festival", inicio: "2030-11-10T02:00:00Z", fin: "2030-11-10T08:00:00Z",
  lugar_id: null, sitio_texto: "Foro Aleph", sitio_lat: 22.15, sitio_lng: -100.98, sitio_direccion: "Calle Falsa 1",
  sitio_reservado: false, sitio_revelar_desde: null, ciudad: "San Luis Potosí",
  zona: "America/Mexico_City", descripcion: null, imagen: null, precio: "$200", enlace: "https://ejemplo.mx/electric",
};

export async function run({ as, check, expectError, query }) {
  await query("insert into auth.users (id, email) values ($1, 'parecido-ana@local.test'), ($2, 'parecido-beto@local.test'), ($3, 'parecido-cata@local.test')", [ANA, BETO, CATA]);
  await query("update public.avisos_config set capturar = true, corte = clock_timestamp()");
  const json = (v) => (v === null ? null : JSON.stringify(v));
  const alta = (quien, datos) =>
    as("authenticated", quien, async () => (await query("select public.guardar_evento_con_avisos(null, $1::jsonb, null, '[]'::jsonb, null, $2::uuid) as r", [json({ ...base, ...datos }), randomUUID()])).rows[0].r.id);
  const fila = async (id) => (await query("select * from public.eventos where id = $1", [id])).rows[0];
  const cuantos = async () => Number((await query("select count(*) as n from public.eventos")).rows[0].n);
  const llamar = (quien, sql, args) => as("authenticated", quien, async () => (await query(sql, args)).rows[0].r);
  const deDos = (quien, existente, nuevo, titulo, op) => llamar(quien, "select public.festival_de_dos_parecidos($1::uuid, $2::uuid, $3, $4::uuid) as r", [existente, nuevo, titulo, op]);
  const unir = (quien, evento, festival, titulo) => llamar(quien, "select public.unir_a_festival_parecido($1::uuid, $2::uuid, $3) as r", [evento, festival, titulo]);

  // --- La regla de los títulos, la misma de `lib/sugerenciasParecido.ts` (como dueña: las funciones son internas).
  const parecidos = async (a, b) => (await query("select public.titulos_parecidos($1, $2) as r", [a, b])).rows[0].r;
  check(await parecidos("Electric Universe Festival", "ELECTRIC UNIVERSE FESTIVAL!!"), "iguales normalizados (mayúsculas y signos)");
  check(await parecidos("Electric Universe Festival", "DJ Nova en Electric Universe Festival"), "uno dentro del otro");
  check(await parecidos("Festival del Desierto", "Festíval del desiérto"), "sin acentos");
  check(!(await parecidos("Concierto", "Concierto")), "«Concierto» es genérico aunque sea igual");
  check(!(await parecidos("Taller de cerámica", "Taller de cerámica")), "«Taller de cerámica» es genérico (dos palabras con contenido)");
  check(!(await parecidos("Fest", "Festival de Jazz")), "palabras enteras: «Fest» no está en «Festival»");
  check(await parecidos("Rock Fest", "Rock Fest"), "una palabra de festival basta");
  await as("authenticated", ANA, () => expectError(() => query("select public.titulos_parecidos('a b c', 'a b c')"), "42501", "la regla no se llama desde la API"));

  // --- (b) El caso real: Ana y Beto publicaron cada uno «Electric Universe Festival» el sábado 9 (8 p.m. y 9 p.m.; Beto en otro sitio).
  const deAna = await alta(ANA, {});
  const deBeto = await alta(BETO, { titulo: "electric universe festival", inicio: "2030-11-10T03:00:00Z", fin: null, sitio_texto: "Jardín de San Juan", precio: null });
  const op = randomUUID();
  const n0 = await cuantos();
  const r = await deDos(BETO, deAna, deBeto, "DJ Nova en Electric Universe Festival", op);
  const marco = await fila(op);
  check(r.id === op && r.actos === 2 && r.titulo === "Electric Universe Festival", "nace el festival con los dos actos", r);
  check(marco.clase === "festival" && marco.creado_por === ANA && marco.titulo === "Electric Universe Festival" && marco.visible, "el festival es de quien lo publicó primero, con su título", marco && { clase: marco.clase, creado_por: marco.creado_por });
  check(marco.sitio_texto === "Foro Aleph" && marco.sitio_direccion === "Calle Falsa 1" && marco.enlace === base.enlace && marco.ciudad === base.ciudad, "con el sitio y el enlace del existente");
  check(new Date(marco.inicio).toISOString() === "2030-11-10T02:00:00.000Z", "y su periodo empieza con el primer acto", marco.inicio);
  const a = await fila(deAna);
  check(a.evento_padre_id === op && a.creado_por === ANA && a.visible && a.titulo === "Electric Universe Festival" && a.precio === "$200", "el evento de Ana pasa a ser acto con su autor, su título y lo demás intactos");
  const b = await fila(deBeto);
  check(b.evento_padre_id === op && b.titulo === "DJ Nova en Electric Universe Festival" && b.sugerencias.parecido?.estado === "aceptada", "el de Beto entra con el nombre de su participación y la sugerencia aceptada");
  check((await cuantos()) === n0 + 1, "solo nace el marco");
  const otraVez = await deDos(BETO, deAna, deBeto, "DJ Nova en Electric Universe Festival", op);
  check(otraVez.repetido === true && otraVez.id === op && (await cuantos()) === n0 + 1, "un reintento con la misma clave no crea otro");
  await expectError(() => deDos(CATA, deAna, deBeto, "X", op), "42501", "la clave de otra persona no sirve para leer el festival");

  // --- (a) Cata publica lo mismo y se une al festival ya publicado (el sitio puede ser otro).
  const deCata = await alta(CATA, { inicio: "2030-11-10T04:00:00Z", fin: null, sitio_texto: "Otro foro" });
  const u = await unir(CATA, deCata, op, "Cata en Electric Universe Festival");
  const c = await fila(deCata);
  check(u.id === op && u.actos === 3 && c.evento_padre_id === op && c.titulo === "Cata en Electric Universe Festival" && c.sugerencias.parecido?.estado === "aceptada", "el acto entra al festival ajeno", u);
  check((await fila(op)).creado_por === ANA, "el festival sigue siendo de Ana");
  check((await unir(CATA, deCata, op, "Cata en Electric Universe Festival")).repetido === true, "unirse otra vez no cambia nada");
  const sinNombre = await alta(CATA, { inicio: "2030-11-10T05:00:00Z", fin: null });
  await unir(CATA, sinNombre, op, "  ");
  check((await fila(sinNombre)).titulo === "Electric Universe Festival", "sin nombre de participación queda el suyo");

  // --- Lo que no se une, sin dejar nada a medias.
  const otroDia = await alta(CATA, { inicio: "2030-11-12T02:00:00Z", fin: null });
  await expectError(() => unir(CATA, otroDia, op, null), "23514", "otro día no entra (el festival termina el 9)");
  check(!(await fila(otroDia)).evento_padre_id, "y queda suelto");
  const otroNombre = await alta(CATA, { titulo: "Noche de cumbia en el Foro Aleph", fin: null });
  await expectError(() => unir(CATA, otroNombre, op, null), "23514", "con otro título no entra");
  await expectError(() => unir(ANA, deCata, op, null), "42501", "nadie une un evento que no gestiona");
  await as("anon", null, () => expectError(() => query("select public.unir_a_festival_parecido($1::uuid, $2::uuid, null)", [otroDia, op]), "42501", "anon no une"));
  await expectError(() => unir(CATA, deCata, deAna, null), "23514", "solo a un festival (no a un evento suelto)");

  // Un festival que la administración ocultó no recibe actos ni se vuelve a ver.
  const otroFest = randomUUID();
  const e1 = await alta(ANA, { titulo: "Encuentro de Jaraneros", inicio: "2030-11-15T02:00:00Z", fin: null });
  const e2 = await alta(BETO, { titulo: "Encuentro de jaraneros", inicio: "2030-11-15T03:00:00Z", fin: null });
  await deDos(BETO, e1, e2, null, otroFest);
  // (El alta va antes de ocultar: con el mismo título y día que una ficha oculta, el slug choca; ver «Para el gestor» en la bitácora 370.)
  const e3 = await alta(CATA, { titulo: "Encuentro de Jaraneros", inicio: "2030-11-15T04:00:00Z", fin: null });
  await query("update public.eventos set visible = false, retirado_por_admin = true where id = $1", [otroFest]);
  await expectError(() => unir(CATA, e3, otroFest, null), "23514", "un festival retirado por la administración no recibe actos");
  check(!(await fila(otroFest)).visible && !(await fila(e3)).evento_padre_id, "y sigue oculto");

  // (b) que no aplica.
  const n1 = await cuantos();
  const g1 = await alta(ANA, { titulo: "Concierto", inicio: "2030-11-20T02:00:00Z", fin: null });
  const g2 = await alta(BETO, { titulo: "Concierto", inicio: "2030-11-20T03:00:00Z", fin: null });
  const opG = randomUUID();
  await expectError(() => deDos(BETO, g1, g2, null, opG), "23514", "dos «Concierto» el mismo día no se juntan");
  check(!(await fila(opG)) && !(await fila(g1)).evento_padre_id && !(await fila(g2)).evento_padre_id, "y no queda nada a medias");
  const d1 = await alta(ANA, { titulo: "Festival de las Luces", inicio: "2030-11-21T02:00:00Z", fin: null });
  const d2 = await alta(BETO, { titulo: "Festival de las Luces", inicio: "2030-11-22T02:00:00Z", fin: null });
  await expectError(() => deDos(BETO, d1, d2, null, randomUUID()), "23514", "otro día no se juntan");
  const p1 = await alta(BETO, { titulo: "Festival de las Luces", inicio: "2030-11-22T03:00:00Z", fin: null });
  await expectError(() => deDos(BETO, d2, p1, null, randomUUID()), "23514", "dos eventos propios no son participaciones (sería un duplicado)");
  await expectError(() => deDos(ANA, d1, d2, null, randomUUID()), "42501", "nadie usa un evento que no gestiona como el nuevo");
  await as("anon", null, () => expectError(() => query("select public.festival_de_dos_parecidos($1::uuid, $2::uuid, null, $3::uuid)", [d1, d2, randomUUID()]), "42501", "anon no junta"));
  const oculto = await alta(ANA, { titulo: "Festival de las Sombras", inicio: "2030-11-23T02:00:00Z", fin: null });
  const s2 = await alta(BETO, { titulo: "Festival de las Sombras", inicio: "2030-11-23T03:00:00Z", fin: null });
  await query("update public.eventos set visible = false, retirado_por_admin = true where id = $1", [oculto]);
  await expectError(() => deDos(BETO, oculto, s2, null, randomUUID()), "23514", "un evento que la administración ocultó no se vuelve festival");
  const o = await fila(oculto);
  check(!o.visible && o.retirado_por_admin && !o.evento_padre_id, "y sigue oculto y suelto");
  await expectError(() => deDos(BETO, d1, deBeto, null, randomUUID()), "23514", "un evento que ya es acto no entra a otro");
  check((await cuantos()) === n1 + 7, "los rechazos no dejan festivales (solo las siete altas)");

  // Mientras tanto otra persona ya lo convirtió: el nuevo se une a ese festival.
  const t1 = await alta(ANA, { titulo: "Ciclo Fellini", inicio: "2030-11-25T02:00:00Z", fin: null });
  const t2 = await alta(BETO, { titulo: "Ciclo Fellini", inicio: "2030-11-25T03:00:00Z", fin: null });
  const t3 = await alta(CATA, { titulo: "Ciclo Fellini", inicio: "2030-11-25T04:00:00Z", fin: null });
  const opT = randomUUID();
  await deDos(BETO, t1, t2, null, opT);
  const tarde = await deDos(CATA, t1, t3, null, randomUUID());
  check(tarde.id === opT && tarde.actos === 3 && (await fila(t3)).evento_padre_id === opT, "llegar tarde une al festival que ya nació", tarde);

  // El camino directo sigue cerrado: ligarse a un festival ajeno por la API no se puede (solo por estas funciones).
  const directo = await alta(CATA, { titulo: "Ciclo Fellini", inicio: "2030-11-25T05:00:00Z", fin: null });
  await as("authenticated", CATA, () => expectError(() => query("update public.eventos set evento_padre_id = $1 where id = $2", [opT, directo]), "42501", "el disparador de OL-321 sigue rechazando el marco ajeno"));

  // --- Lo anotado: «No, es otro evento».
  const no = await alta(CATA, { titulo: "Festival de las Luces", inicio: "2030-11-21T03:00:00Z", fin: null });
  await as("authenticated", CATA, () => query("select public.anotar_sugerencia($1::uuid, 'parecido', 'descartada')", [no]));
  check((await fila(no)).sugerencias.parecido?.estado === "descartada", "«No, es otro evento» queda anotado");
  await as("authenticated", CATA, () => expectError(() => query("select public.anotar_sugerencia($1::uuid, 'otra', 'descartada')", [no]), "22023", "los tipos siguen cerrados"));
}
