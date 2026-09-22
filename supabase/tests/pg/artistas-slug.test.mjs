import { randomUUID } from "node:crypto";

/**
 * Slug de artista (OL-114, migración 20260922140000): se pone solo al crear, no cambia al renombrar, resuelve
 * choques con un sufijo corto y determinista; y el reclamo con aprobación automática cuando el correo de la
 * cuenta coincide con el que el CAPO capturó para esa ficha (contactos_importados), sin exponer esa tabla.
 */
export async function run({ as, check, expectError, query }) {
  const user = randomUUID();
  const otro = randomUUID();
  const artists = [];
  async function artist(nombre, opts = {}) {
    const id = randomUUID();
    artists.push(id);
    // La ciudad no importa al slug (global), pero un mismo nombre en la misma ciudad choca con artista_sin_duplicado
    // antes de llegar al slug: cada ficha de prueba con nombre repetido va en su propia ciudad.
    await query("insert into public.artistas(id, nombre, ciudad, creado_por, origen) values ($1, $2, $3, $4, $5)", [id, nombre, opts.ciudad ?? `Ciudad de prueba ${id}`, opts.creadoPor ?? user, opts.origen ?? null]);
    return id;
  }
  try {
    await query("insert into auth.users(id, email) values ($1, 'artista-slug@local.test'), ($2, 'otra-cuenta@local.test')", [user, otro]);

    // El slug se pone solo, a partir del nombre, sin acentos ni mayúsculas.
    const a = await as("authenticated", user, () => artist("Trío Xóchitl"));
    let fila = (await query("select slug from public.artistas where id = $1", [a])).rows[0];
    check(fila.slug === "trio-xochitl", "slug: minúsculas, sin acentos, guiones", fila);

    // Un nombre repetido (aunque sea otra ciudad, el slug es global) se resuelve con un sufijo corto.
    const b = await as("authenticated", user, () => artist("Trío Xóchitl"));
    fila = (await query("select slug from public.artistas where id = $1", [b])).rows[0];
    check(fila.slug === "trio-xochitl-2", "slug: sufijo -2 en el primer choque", fila);
    const c = await as("authenticated", user, () => artist("Trío Xóchitl"));
    fila = (await query("select slug from public.artistas where id = $1", [c])).rows[0];
    check(fila.slug === "trio-xochitl-3", "slug: sufijo -3 en el segundo choque", fila);

    // El slug no cambia al renombrar la ficha (docs/rediseno/24-grafo-cultural.md).
    await as("authenticated", user, () => query("update public.artistas set nombre = 'Nuevo Nombre' where id = $1", [a]));
    fila = (await query("select slug from public.artistas where id = $1", [a])).rows[0];
    check(fila.slug === "trio-xochitl", "slug: no cambia al renombrar", fila);

    // Un nombre sin letras ni números cae a un slug de respaldo con el id, nunca vacío ni duplicado.
    const raro = await as("authenticated", user, () => artist("¡¡¡···!!!"));
    fila = (await query("select slug from public.artistas where id = $1", [raro])).rows[0];
    check(fila.slug === `artista-${raro.replaceAll("-", "").slice(0, 8)}`, "slug: respaldo con el id cuando el nombre no aporta letras", { slug: fila.slug, id: raro });

    // Reclamo con aprobación automática: el CAPO capturó un correo para esta ficha.
    const capo = await artist("Ficha Del Catálogo", { creadoPor: null, origen: "capo" });
    await query("insert into public.contactos_importados(artista_id, correo) values ($1, 'ARTISTA-SLUG@local.test')", [capo]);

    // Sin sesión: nunca se filtra ni se liga nada.
    const sinSesion = await as("authenticated", null, () => query("select public.reclamar_si_correo_coincide($1) as ok", [capo]));
    check(sinSesion.rows[0].ok === false, "reclamo automático: sin auth.uid() no coincide");

    // Con sesión y correo distinto: no coincide, no se liga.
    const otraCuenta = await as("authenticated", otro, () => query("select public.reclamar_si_correo_coincide($1) as ok", [capo]));
    check(otraCuenta.rows[0].ok === false, "reclamo automático: otro correo no coincide");
    let liga = await query("select 1 from public.artistas_cuentas where artista_id = $1 and perfil_id = $2", [capo, otro]);
    check(liga.rowCount === 0, "reclamo automático: sin coincidencia no liga la cuenta");

    // Con el correo que coincide (comparación sin distinguir mayúsculas): liga la cuenta y devuelve true.
    const coincide = await as("authenticated", user, () => query("select public.reclamar_si_correo_coincide($1) as ok", [capo]));
    check(coincide.rows[0].ok === true, "reclamo automático: mismo correo (sin distinguir mayúsculas) coincide");
    liga = await query("select 1 from public.artistas_cuentas where artista_id = $1 and perfil_id = $2", [capo, user]);
    check(liga.rowCount === 1, "reclamo automático: coincidencia liga la cuenta a la ficha");

    // Repetir la llamada no falla ni duplica la fila (on conflict do nothing).
    const otraVez = await as("authenticated", user, () => query("select public.reclamar_si_correo_coincide($1) as ok", [capo]));
    check(otraVez.rows[0].ok === true, "reclamo automático: repetir la llamada sigue devolviendo true");
    liga = await query("select count(*)::int as n from public.artistas_cuentas where artista_id = $1 and perfil_id = $2", [capo, user]);
    check(liga.rows[0].n === 1, "reclamo automático: no duplica el vínculo al repetir");

    // Una ficha sin correos capturados nunca aprueba sola: sigue el camino de hoy (reporte para el admin).
    const sinCorreo = await artist("Sin Correo Capturado", { creadoPor: null, origen: "capo" });
    const noHayCorreo = await as("authenticated", user, () => query("select public.reclamar_si_correo_coincide($1) as ok", [sinCorreo]));
    check(noHayCorreo.rows[0].ok === false, "reclamo automático: sin contactos_importados no aprueba sola");

    // La función no es un oráculo de correos: no expone la tabla y anon no puede ni llamarla.
    await as("anon", null, () => expectError(() => query("select public.reclamar_si_correo_coincide($1)", [capo]), "42501", "reclamo automático: anon sin EXECUTE"));
    for (const role of ["anon", "authenticated"]) {
      const raw = await as(role, role === "authenticated" ? user : null, () => query("select correo from public.contactos_importados where artista_id = $1", [capo]));
      check(raw.rowCount === 0, `contactos_importados: ${role} no recibe SELECT directo`);
    }

    // Contrato de permisos: no expuesta a anon/public; el disparador de slug no necesita EXECUTE de quien inserta.
    const perms = await query(
      `select p.proname,
              has_function_privilege('anon', p.oid, 'execute') as anon_ejecuta,
              has_function_privilege('authenticated', p.oid, 'execute') as authenticated_ejecuta
       from pg_proc p where p.oid = any($1::regprocedure[])`,
      [["public.slug_de_nombre(text)", "public.artistas_generar_slug()", "public.reclamar_si_correo_coincide(uuid)"]],
    );
    const porNombre = Object.fromEntries(perms.rows.map((r) => [r.proname, r]));
    check(!porNombre.slug_de_nombre.anon_ejecuta, "permisos: slug_de_nombre sin EXECUTE para anon");
    check(!porNombre.artistas_generar_slug.anon_ejecuta && !porNombre.artistas_generar_slug.authenticated_ejecuta, "permisos: el disparador de slug no da EXECUTE a nadie con sesión");
    check(!porNombre.reclamar_si_correo_coincide.anon_ejecuta && porNombre.reclamar_si_correo_coincide.authenticated_ejecuta, "permisos: reclamar_si_correo_coincide solo para authenticated");
  } finally {
    await query("delete from public.artistas_cuentas where artista_id = any($1::uuid[])", [artists]);
    await query("delete from public.contactos_importados where artista_id = any($1::uuid[])", [artists]);
    await query("delete from public.artistas where id = any($1::uuid[])", [artists]);
    await query("delete from auth.users where id = any($1::uuid[])", [[user, otro]]);
  }
}
