import { randomUUID } from "node:crypto";

/**
 * artistas_con_mi_correo (OL-177, migración 20260925110000): la sección Artistas ofrece "Reclamar ficha" cuando
 * el correo de la cuenta coincide con uno que el CAPO capturó (contactos_importados) para una ficha que la
 * persona todavía no gestiona (artistas_cuentas) ni tiene pendiente de revisión (reportes sin atender). Mismo
 * criterio de coincidencia que reclamar_si_correo_coincide (sin distinguir mayúsculas, lee el correo de auth.uid(),
 * nunca un parámetro).
 */
export async function run({ as, check, expectError, query }) {
  const user = randomUUID();
  const otro = randomUUID();
  const artists = [];
  async function artist(nombre, opts = {}) {
    const id = randomUUID();
    artists.push(id);
    await query("insert into public.artistas(id, nombre, ciudad, creado_por, origen) values ($1, $2, $3, $4, $5)", [id, nombre, opts.ciudad ?? `Ciudad de prueba ${id}`, opts.creadoPor ?? null, opts.origen ?? "capo"]);
    return id;
  }
  try {
    await query("insert into auth.users(id, email) values ($1, 'con-mi-correo@local.test'), ($2, 'otra-cuenta@local.test')", [user, otro]);

    // Sin sesión: vacío, nunca se filtra ni se expone nada.
    const capo = await artist("Ficha Del Catálogo");
    await query("insert into public.contactos_importados(artista_id, correo) values ($1, 'CON-MI-CORREO@local.test')", [capo]);
    let filas = await as("authenticated", null, () => query("select * from public.artistas_con_mi_correo()"));
    check(filas.rowCount === 0, "sin sesión: vacío");

    // Correo distinto: vacío.
    filas = await as("authenticated", otro, () => query("select * from public.artistas_con_mi_correo()"));
    check(filas.rowCount === 0, "correo sin coincidencia: vacío");

    // Correo coincidente (sin distinguir mayúsculas): trae el artista, con su slug.
    filas = await as("authenticated", user, () => query("select * from public.artistas_con_mi_correo()"));
    check(filas.rowCount === 1 && filas.rows[0].id === capo && filas.rows[0].nombre === "Ficha Del Catálogo" && !!filas.rows[0].slug, "correo coincidente (sin distinguir mayúsculas): trae el artista", filas.rows);

    // Ya ligada a la cuenta (la gestiona en Mis artistas): no se repite el letrero.
    await query("insert into public.artistas_cuentas(artista_id, perfil_id) values ($1, $2)", [capo, user]);
    filas = await as("authenticated", user, () => query("select * from public.artistas_con_mi_correo()"));
    check(filas.rowCount === 0, "ya ligada a la cuenta: vacío");

    // Otra ficha con correo coincidente, pero con un reclamo suyo ya pendiente: tampoco se repite.
    const pendiente = await artist("Ficha Con Reclamo Pendiente");
    await query("insert into public.contactos_importados(artista_id, correo) values ($1, 'con-mi-correo@local.test')", [pendiente]);
    filas = await as("authenticated", user, () => query("select * from public.artistas_con_mi_correo()"));
    check(filas.rowCount === 1 && filas.rows[0].id === pendiente, "una segunda ficha coincidente sí aparece", filas.rows);
    await query("insert into public.reportes(tipo, objeto_id, motivo, creado_por, atendido) values ('artista', $1, 'es_mio', $2, false)", [pendiente, user]);
    filas = await as("authenticated", user, () => query("select * from public.artistas_con_mi_correo()"));
    check(filas.rowCount === 0, "con un reclamo pendiente sobre esa ficha: vacío", filas.rows);

    // Un reclamo YA atendido no bloquea: si el CAPO volviera a capturar el mismo correo para otra ficha, se ofrece.
    await query("update public.reportes set atendido = true where objeto_id = $1 and creado_por = $2", [pendiente, user]);
    filas = await as("authenticated", user, () => query("select * from public.artistas_con_mi_correo()"));
    check(filas.rowCount === 1 && filas.rows[0].id === pendiente, "un reclamo ya atendido no bloquea la oferta", filas.rows);

    // Anon no puede ejecutar la función.
    await as("anon", null, () => expectError(() => query("select * from public.artistas_con_mi_correo()"), "42501", "anon sin EXECUTE"));

    // Contrato de permisos: no expuesta a anon/public.
    const perms = await query(
      `select has_function_privilege('anon', p.oid, 'execute') as anon_ejecuta,
              has_function_privilege('authenticated', p.oid, 'execute') as authenticated_ejecuta
       from pg_proc p where p.oid = 'public.artistas_con_mi_correo()'::regprocedure`,
    );
    check(!perms.rows[0].anon_ejecuta && perms.rows[0].authenticated_ejecuta, "permisos: solo authenticated tiene EXECUTE", perms.rows[0]);
  } finally {
    await query("delete from public.reportes where objeto_id = any($1::uuid[])", [artists]);
    await query("delete from public.artistas_cuentas where artista_id = any($1::uuid[])", [artists]);
    await query("delete from public.contactos_importados where artista_id = any($1::uuid[])", [artists]);
    await query("delete from public.artistas where id = any($1::uuid[])", [artists]);
    await query("delete from auth.users where id = any($1::uuid[])", [[user, otro]]);
  }
}
