import { randomUUID } from "node:crypto";

/**
 * Slug de lugar (OL-119, migración 20260922160000): se pone solo al crear, no cambia al renombrar, resuelve
 * choques con un sufijo corto y determinista. Mismo patrón que artistas-slug.test.mjs (OL-114).
 */
export async function run({ as, check, query }) {
  const user = randomUUID();
  const lugares = [];
  async function lugar(nombre, opts = {}) {
    const id = randomUUID();
    lugares.push(id);
    await query(
      "insert into public.lugares(id, nombre, tipo, lat, lng, creado_por) values ($1, $2, 'foro', 22.15, -100.97, $3)",
      [id, nombre, opts.creadoPor ?? user],
    );
    return id;
  }
  try {
    await query("insert into auth.users(id, email) values ($1, 'lugar-slug@local.test')", [user]);

    // El slug se pone solo, a partir del nombre, sin acentos ni mayúsculas.
    const a = await as("authenticated", user, () => lugar("Casa de la Cultura Álamos"));
    let fila = (await query("select slug from public.lugares where id = $1", [a])).rows[0];
    check(fila.slug === "casa-de-la-cultura-alamos", "slug: minúsculas, sin acentos, guiones", fila);

    // Un nombre repetido se resuelve con un sufijo corto y determinista.
    const b = await as("authenticated", user, () => lugar("Casa de la Cultura Álamos"));
    fila = (await query("select slug from public.lugares where id = $1", [b])).rows[0];
    check(fila.slug === "casa-de-la-cultura-alamos-2", "slug: sufijo -2 en el primer choque", fila);
    const c = await as("authenticated", user, () => lugar("Casa de la Cultura Álamos"));
    fila = (await query("select slug from public.lugares where id = $1", [c])).rows[0];
    check(fila.slug === "casa-de-la-cultura-alamos-3", "slug: sufijo -3 en el segundo choque", fila);

    // El slug no cambia al renombrar la ficha (mismo criterio que artistas).
    await as("authenticated", user, () => query("update public.lugares set nombre = 'Nuevo Nombre' where id = $1", [a]));
    fila = (await query("select slug from public.lugares where id = $1", [a])).rows[0];
    check(fila.slug === "casa-de-la-cultura-alamos", "slug: no cambia al renombrar", fila);

    // Un nombre sin letras ni números cae a un slug de respaldo con el id, nunca vacío ni duplicado.
    const raro = await as("authenticated", user, () => lugar("¡¡¡···!!!"));
    fila = (await query("select slug from public.lugares where id = $1", [raro])).rows[0];
    check(fila.slug === `lugar-${raro.replaceAll("-", "").slice(0, 8)}`, "slug: respaldo con el id cuando el nombre no aporta letras", { slug: fila.slug, id: raro });

    // Contrato: columna not null, índice único, y las filas ya existentes (de otras pruebas o migraciones) no
    // se quedan sin slug ni con uno repetido.
    const nulos = await query("select count(*)::int as n from public.lugares where slug is null");
    check(nulos.rows[0].n === 0, "lugares: ninguna fila sin slug");
    const repetidos = await query("select slug, count(*)::int as n from public.lugares group by slug having count(*) > 1");
    check(repetidos.rowCount === 0, "lugares: ningún slug repetido", repetidos.rows);

    // El disparador de slug no necesita EXECUTE de quien inserta (mismo criterio que artistas/eventos).
    const perms = await query(
      `select p.proname, has_function_privilege('authenticated', p.oid, 'execute') as authenticated_ejecuta,
              has_function_privilege('anon', p.oid, 'execute') as anon_ejecuta
       from pg_proc p where p.oid = 'public.lugares_generar_slug()'::regprocedure`,
    );
    check(!perms.rows[0].authenticated_ejecuta && !perms.rows[0].anon_ejecuta, "permisos: el disparador de slug de lugares no da EXECUTE a nadie con sesión", perms.rows[0]);
  } finally {
    await query("delete from public.lugares where id = any($1::uuid[])", [lugares]);
    await query("delete from auth.users where id = any($1::uuid[])", [[user]]);
  }
}
