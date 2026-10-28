import { randomUUID } from "node:crypto";

// OL-467 (bitácora 499): «Sí, es este: ponerle mi cartel». `poner_cartel_a_evento` deja a cualquiera con sesión poner su cartel a un evento visible
// sin cartel (completando solo lo que le falta), a quien lo publicó y a la administración cambiarlo, y a nadie más. Avisa a la administración con
// `cartel_puesto`. Zona: America/Mexico_City (UTC−6).
const MARCOS = randomUUID();
const ANA = randomUUID();
const BETO = randomUUID();
const JEFA = randomUUID();
const FOTOS = "https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos/lugares";
const cartel = (quien, n = 1) => `${FOTOS}/${quien}/evento-ol467-${n}.jpg`;
const PALETA = null;

const base = {
  titulo: "Noche de danzón con la Orquesta Típica", inicio: "2030-10-12T02:00:00Z", fin: null,
  lugar_id: null, sitio_texto: "Teatro de prueba OL-467", sitio_lat: 22.15, sitio_lng: -100.98,
  sitio_reservado: false, sitio_revelar_desde: null, ciudad: "San Luis Potosí",
  zona: "America/Mexico_City", descripcion: null, imagen: null, precio: null, enlace: null,
};

export async function run({ as, check, expectError, query, connection }) {
  // La administración nace de su correo (admin_correos), como en el resto del banco.
  await query("insert into public.admin_correos (correo) values ('ol467-jefa@local.test')");
  await query(
    "insert into auth.users (id, email) values ($1, 'ol467-marcos@local.test'), ($2, 'ol467-ana@local.test'), ($3, 'ol467-beto@local.test'), ($4, 'ol467-jefa@local.test')",
    [MARCOS, ANA, BETO, JEFA],
  );
  const json = (v) => (v === null ? null : JSON.stringify(v));
  const alta = (quien, datos, artistas = []) =>
    as("authenticated", quien, async () => (await query("select public.guardar_evento_con_avisos(null, $1::jsonb, null, $2::jsonb, null, $3::uuid) as r", [json(datos), json(artistas), randomUUID()])).rows[0].r.id);
  const fila = async (id) => (await query("select * from public.eventos where id = $1", [id])).rows[0];
  const artistasDe = async (id) => (await query("select a.nombre from public.eventos_artistas ea join public.artistas a on a.id = ea.artista_id where ea.evento_id = $1 order by ea.orden", [id])).rows.map((r) => r.nombre);
  const poner = (quien, evento, imagen, completar = null, reemplazar = false) =>
    as("authenticated", quien, async () => (await query("select public.poner_cartel_a_evento($1::uuid, $2, $3::jsonb, $4::jsonb, $5) as r", [evento, imagen, json(PALETA), json(completar), reemplazar])).rows[0].r);
  const cartelesPuestos = async () => Number((await query("select coalesce(sum((motivos ->> 'cartel_puesto')::int), 0) as n from public.avisos_admin_jobs")).rows[0].n);

  // --- Permisos: la función solo para quien tiene sesión.
  const { rows: [acl] } = await query(`select p.prosecdef, p.proconfig,
      has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
      exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') as todos
    from pg_proc p where p.oid = 'public.poner_cartel_a_evento(uuid,text,jsonb,jsonb,boolean)'::regprocedure`);
  check(acl.prosecdef && acl.proconfig?.includes('search_path=""') && !acl.anon && acl.authenticated && !acl.todos, "poner_cartel_a_evento: security definer, path fijo, solo authenticated", acl);

  // --- Ana pone su cartel al evento de Marcos sin cartel: se completa solo lo que falta.
  const danzon = await alta(MARCOS, base);
  const antesAvisos = await cartelesPuestos();
  const r = await poner(ANA, danzon, cartel(ANA), {
    descripcion: "Baile de salón con orquesta en vivo.", precio: "$150", fin: "2030-10-12T05:00:00Z",
    quien: [{ nombre: "Orquesta Típica OL-467", tipo: "grupo" }],
  });
  const d = await fila(danzon);
  check(r.id === danzon && r.dueno === MARCOS && r.reemplazado === false && r.repetido === false, "otra persona pone cartel a un evento sin cartel", r);
  check(JSON.stringify(r.completado) === JSON.stringify(["descripcion", "precio", "fin", "artistas"]), "dice qué se completó", r.completado);
  check(d.imagen === cartel(ANA) && d.precio === "$150" && d.descripcion === "Baile de salón con orquesta en vivo." && new Date(d.fin).toISOString() === "2030-10-12T05:00:00.000Z", "el cartel, el precio, la descripción y la hora de fin quedan", d);
  check(d.creado_por === MARCOS && d.titulo === base.titulo && d.visible, "el evento sigue siendo el de Marcos, con su nombre", d);
  check((await artistasDe(danzon)).join() === "Orquesta Típica OL-467", "quién se presenta, si no tenía a nadie", await artistasDe(danzon));
  check((await query("select creado_por from public.artistas where nombre = 'Orquesta Típica OL-467'")).rows[0]?.creado_por === ANA, "la ficha nueva del artista es de quien la nombró");
  check((await cartelesPuestos()) === antesAvisos + 1, "la administración recibe el motivo cartel_puesto");
  const otraVez = await poner(ANA, danzon, cartel(ANA));
  check(otraVez.repetido === true && otraVez.completado.length === 0, "un reintento con la misma imagen no cambia nada", otraVez);

  // --- Lo que ya tiene no se toca.
  const completo = await alta(MARCOS, { ...base, titulo: "Recital con todo", precio: "$80", descripcion: "Ya descrito.", fin: "2030-10-12T04:00:00Z" }, [{ nombre: "Trío OL-467 de antes", tipo: "grupo" }]);
  const r2 = await poner(ANA, completo, cartel(ANA, 2), { descripcion: "Otra cosa", precio: "$300", fin: "2030-10-12T06:00:00Z", quien: [{ nombre: "Nadie OL-467" }] });
  const c = await fila(completo);
  check(r2.completado.length === 0 && c.precio === "$80" && c.descripcion === "Ya descrito." && new Date(c.fin).toISOString() === "2030-10-12T04:00:00.000Z", "lo que el original ya tiene no se pisa", { r2, c });
  check((await artistasDe(completo)).join() === "Trío OL-467 de antes", "sus artistas no cambian", await artistasDe(completo));
  check(c.imagen === cartel(ANA, 2), "solo se le pone el cartel");
  const finRaro = await alta(MARCOS, { ...base, titulo: "Fin raro" });
  const r3 = await poner(ANA, finRaro, cartel(ANA, 3), { fin: "2030-10-11T20:00:00Z", precio: "x".repeat(61) });
  check(r3.completado.length === 0 && (await fila(finRaro)).fin === null && (await fila(finRaro)).precio === null, "un fin antes del inicio o un precio demasiado largo no se ponen", r3);

  // --- Con cartel: solo quien lo publicó o la administración lo cambian; sin pedirlo, nadie.
  await expectError(() => poner(BETO, danzon, cartel(BETO)), "23505", "con cartel y sin pedir cambiarlo: ya tiene cartel");
  await expectError(() => poner(BETO, danzon, cartel(BETO), null, true), "42501", "otra persona no cambia un cartel que ya está");
  check((await fila(danzon)).imagen === cartel(ANA), "el cartel de Ana sigue");
  const r4 = await poner(MARCOS, danzon, cartel(MARCOS), { precio: "$999" }, true);
  const d4 = await fila(danzon);
  check(r4.reemplazado === true && r4.completado.length === 0 && d4.imagen === cartel(MARCOS) && d4.precio === "$150", "quien lo publicó lo cambia y nada más cambia", { r4, precio: d4.precio });
  const r5 = await poner(JEFA, danzon, cartel(JEFA), null, true);
  check(r5.reemplazado === true && (await fila(danzon)).imagen === cartel(JEFA), "la administración lo cambia", r5);

  // --- Lo que no se puede.
  await as("anon", null, () => expectError(() => query("select public.poner_cartel_a_evento($1::uuid, $2)", [danzon, cartel(ANA, 9)]), "42501", "un visitante no pone carteles"));
  await expectError(() => as("authenticated", null, () => query("select public.poner_cartel_a_evento($1::uuid, $2)", [danzon, cartel(ANA, 9)])), "42501", "sin sesión no");
  const pasado = await alta(MARCOS, { ...base, titulo: "Ya pasó", inicio: "2020-01-01T02:00:00Z" });
  await expectError(() => poner(ANA, pasado, cartel(ANA, 4)), "22023", "a un evento que ya pasó no");
  const oculto = await alta(MARCOS, { ...base, titulo: "Oculto" });
  await query("update public.eventos set visible = false where id = $1", [oculto]);
  await expectError(() => poner(ANA, oculto, cartel(ANA, 5)), "P0002", "a uno oculto no");
  await expectError(() => poner(ANA, randomUUID(), cartel(ANA, 6)), "P0002", "a uno que no existe no");
  await expectError(() => poner(ANA, finRaro, "http://otro.sitio/cartel.jpg", null, true), "42501", "otra persona tampoco cambia uno de Marcos con otra imagen");
  const sinCartel = await alta(MARCOS, { ...base, titulo: "Sin cartel todavía" });
  await expectError(() => poner(ANA, sinCartel, "https://otro.sitio/cartel.jpg"), "23514", "una imagen que no es del almacenamiento de la app no entra");
  await expectError(() => poner(ANA, sinCartel, "  "), "22023", "sin imagen no");
  check((await fila(sinCartel)).imagen === null, "los rechazos no dejan nada");
  const bloqueado = await alta(BETO, { ...base, titulo: "De alguien bloqueado" });
  await query("insert into public.bloqueos (quien, bloqueado) values ($1, $2)", [ANA, BETO]);
  await expectError(() => poner(ANA, bloqueado, cartel(ANA, 7)), "P0002", "a uno de alguien que bloqueé no (no lo veo)");

  // --- Dos a la vez: la segunda espera a la primera y no pisa su cartel.
  const carrera = await alta(MARCOS, { ...base, titulo: "Carrera de carteles" });
  const comoUsuario = async (cliente, quien) => {
    await cliente.query("set role authenticated");
    await cliente.query("select set_config('request.jwt.claim.sub', $1, false)", [quien]);
    await cliente.query("begin");
  };
  const llamar = (cliente, quien, imagen) => cliente.query("select public.poner_cartel_a_evento($1::uuid, $2) as r", [carrera, cartel(quien, imagen)]);
  const resultado = await connection(async (a) => {
    await comoUsuario(a, ANA);
    await llamar(a, ANA, 8);
    const segunda = connection(async (b) => {
      await comoUsuario(b, BETO);
      try {
        await llamar(b, BETO, 8);
        await b.query("commit");
        return { ok: true };
      } catch (error) {
        await b.query("rollback");
        return { ok: false, code: error.code };
      }
    });
    await new Promise((listo) => setTimeout(listo, 300));
    const esperando = await query("select count(*)::int as n from pg_stat_activity where wait_event_type = 'Lock' and query like '%poner_cartel_a_evento%'");
    await a.query("commit");
    return { esperando: esperando.rows[0].n, b: await segunda };
  });
  check(resultado.esperando >= 1 && resultado.b.ok === false && resultado.b.code === "23505", "dos a la vez: la segunda espera y ve el cartel de la primera", resultado);
  check((await fila(carrera)).imagen === cartel(ANA, 8), "queda el cartel de la primera");
}
