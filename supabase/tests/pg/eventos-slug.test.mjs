import { randomUUID } from "node:crypto";

/**
 * Slug de evento (OL-119, migración 20260922170000): se pone solo al crear, no cambia al renombrar ni al mover
 * la fecha, y resuelve un nombre repetido con la fecha de inicio (en la zona del propio evento) antes de caer a
 * un sufijo numérico. Mismo patrón que artistas-slug.test.mjs y lugares-slug.test.mjs.
 */
export async function run({ check, query }) {
  const autor = randomUUID();
  const eventos = [];
  async function evento(titulo, inicio, opts = {}) {
    const { rows } = await query(
      "insert into public.eventos(titulo, inicio, sitio_texto, zona, creado_por) values ($1, $2, 'Sitio de prueba', $3, $4) returning id",
      [titulo, inicio, opts.zona ?? "America/Mexico_City", opts.creadoPor ?? autor],
    );
    eventos.push(rows[0].id);
    return rows[0].id;
  }
  try {
    await query("insert into auth.users(id, email) values ($1, 'evento-slug@local.test')", [autor]);

    // El slug se pone solo, a partir del título, sin acentos ni mayúsculas.
    const a = await evento("Concierto de Otoño", "2026-10-03T20:00:00-06:00");
    let fila = (await query("select slug from public.eventos where id = $1", [a])).rows[0];
    check(fila.slug === "concierto-de-otono", "slug: minúsculas, sin acentos, guiones", fila);

    // El mismo nombre en otra fecha se resuelve con la fecha de inicio (día, en la zona del evento), no con un
    // sufijo ciego: la dirección sigue diciendo de qué función se trata.
    const b = await evento("Concierto de Otoño", "2026-11-14T20:00:00-06:00");
    fila = (await query("select slug from public.eventos where id = $1", [b])).rows[0];
    check(fila.slug === "concierto-de-otono-2026-11-14", "slug: nombre repetido se resuelve con la fecha de inicio", fila);

    // Dos funciones del mismo evento el mismo día (nombre y fecha iguales) sí necesitan un sufijo numérico.
    const c = await evento("Concierto de Otoño", "2026-11-14T12:00:00-06:00");
    fila = (await query("select slug from public.eventos where id = $1", [c])).rows[0];
    check(fila.slug === "concierto-de-otono-2026-11-14-2", "slug: mismo nombre y misma fecha se resuelve con sufijo", fila);

    // La fecha del slug es la del día en la ZONA del evento, no la de UTC: una función que empieza tarde en la
    // noche de San Luis (UTC-6) sigue cayendo en el día de allá.
    const d = await evento("Concierto de Otoño", "2026-12-01T01:30:00Z", { zona: "America/Mexico_City" }); // 2026-11-30 19:30 en SLP
    fila = (await query("select slug from public.eventos where id = $1", [d])).rows[0];
    check(fila.slug === "concierto-de-otono-2026-11-30", "slug: la fecha del slug usa la zona del evento, no UTC", fila);

    // El slug no cambia al renombrar el evento ni al mover su fecha (estable, mismo criterio que artistas/lugares).
    await query("update public.eventos set titulo = 'Nuevo Nombre', inicio = '2027-01-01T20:00:00-06:00' where id = $1", [a]);
    fila = (await query("select slug from public.eventos where id = $1", [a])).rows[0];
    check(fila.slug === "concierto-de-otono", "slug: no cambia al renombrar ni al mover la fecha", fila);

    // Un título sin letras ni números cae a un slug de respaldo con el id, nunca vacío ni duplicado.
    const raro = await evento("¡¡¡···!!!", "2026-10-10T20:00:00-06:00");
    fila = (await query("select slug from public.eventos where id = $1", [raro])).rows[0];
    check(fila.slug === `evento-${raro.replaceAll("-", "").slice(0, 8)}`, "slug: respaldo con el id cuando el título no aporta letras", { slug: fila.slug, id: raro });

    // Contrato: columna not null, índice único, y las filas ya existentes no se quedan sin slug ni repetido.
    const nulos = await query("select count(*)::int as n from public.eventos where slug is null");
    check(nulos.rows[0].n === 0, "eventos: ninguna fila sin slug");
    const repetidos = await query("select slug, count(*)::int as n from public.eventos group by slug having count(*) > 1");
    check(repetidos.rowCount === 0, "eventos: ningún slug repetido", repetidos.rows);

    // El disparador de slug no necesita EXECUTE de quien inserta (mismo criterio que artistas/lugares).
    const perms = await query(
      `select has_function_privilege('authenticated', p.oid, 'execute') as authenticated_ejecuta,
              has_function_privilege('anon', p.oid, 'execute') as anon_ejecuta
       from pg_proc p where p.oid = 'public.eventos_generar_slug()'::regprocedure`,
    );
    check(!perms.rows[0].authenticated_ejecuta && !perms.rows[0].anon_ejecuta, "permisos: el disparador de slug de eventos no da EXECUTE a nadie con sesión", perms.rows[0]);
  } finally {
    await query("delete from public.eventos where id = any($1::uuid[])", [eventos]);
    await query("delete from auth.users where id = any($1::uuid[])", [[autor]]);
  }
}
