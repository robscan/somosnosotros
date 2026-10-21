import { randomUUID } from "node:crypto";

// OL-429 · ciudades.parametros (migración 20261021120000_ciudades_parametros.sql): alcaldías, guías y radio propios de cada ciudad para las
// rutinas. Solo añade: las ciudades que ya estaban quedan con '{}'; la escribe la administración (y la llave de servicio), la lee todo el
// mundo como el resto de la tabla. Todo dentro de una transacción que se deshace.
export async function run({ as, check, expectError, query }) {
  const admin = randomUUID(), persona = randomUUID();
  const adminCorreo = `ciudades-parametros-${admin}@local.test`;
  const uno = async (sql, params) => (await query(sql, params)).rows[0];
  const falla = async (accion, codigo, etiqueta) => {
    await query("savepoint antes_del_error");
    await expectError(accion, codigo, etiqueta);
    await query("rollback to savepoint antes_del_error");
  };
  // El ejemplo de Ciudad de México (founder, 2026-10-21): las alcaldías con más oferta, 12 km y siete guías culturales.
  const CDMX = {
    alcaldias: ["Cuauhtémoc", "Miguel Hidalgo", "Coyoacán", "Benito Juárez", "Álvaro Obregón"],
    radio_km: 12,
    guias: [
      { nombre: "Cartelera de la Secretaría de Cultura de la Ciudad de México", url: "https://cartelera.cdmx.gob.mx/" },
      { nombre: "Cultura UNAM", url: "https://www.cultura.unam.mx/" },
      { nombre: "Time Out México", url: "https://www.timeoutmexico.mx/ciudad-de-mexico" },
      { nombre: "Chilango", url: "https://www.chilango.com/" },
      { nombre: "Local.mx", url: "https://local.mx/" },
      { nombre: "Dónde Ir", url: "https://dondeir.com/" },
      { nombre: "Turismo de la Ciudad de México", url: "https://mexicocity.cdmx.gob.mx/" },
    ],
  };
  await query("begin");
  try {
    await query("insert into public.admin_correos(correo) values ($1)", [adminCorreo]);
    await query("insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now()),($3,$4,now())", [admin, adminCorreo, persona, `ciudades-parametros-persona-${persona}@local.test`]);

    const col = await uno(`select data_type, is_nullable, column_default from information_schema.columns
      where table_schema='public' and table_name='ciudades' and column_name='parametros'`);
    check(col?.data_type === "jsonb" && col.is_nullable === "NO" && /'\{\}'::jsonb/.test(col.column_default ?? ""), "parametros: jsonb, no nulo, '{}' por omisión", col);
    const sembradas = (await query("select slug, parametros from public.ciudades where slug in ('san-luis-potosi','san-miguel-de-allende') order by slug")).rows;
    check(sembradas.length === 2 && sembradas.every((c) => JSON.stringify(c.parametros) === "{}"), "las ciudades que ya estaban quedan sin parámetros (se comportan como antes)", sembradas);

    // La administración da de alta Ciudad de México y le pone sus parámetros.
    await as("authenticated", admin, async () => {
      await query("insert into public.ciudades(slug,nombre,estado,lat,lng,zoom) values ('ciudad-de-mexico','Ciudad de México','abierta',19.415,-99.16,13)");
      check((await query("update public.ciudades set parametros=$1 where slug='ciudad-de-mexico'", [JSON.stringify(CDMX)])).rowCount === 1, "la administración escribe los parámetros");
    });
    const cdmx = await uno("select parametros from public.ciudades where slug='ciudad-de-mexico'");
    check(cdmx.parametros.radio_km === 12 && cdmx.parametros.alcaldias.length === 5 && cdmx.parametros.guias.length === 7, "Ciudad de México: cinco alcaldías, 12 km, siete guías", cdmx);

    // Nadie más los cambia; leerlos sí, como el resto de la ciudad (no hay nada privado).
    for (const [rol, sujeto] of [["anon", null], ["authenticated", persona]]) {
      await as(rol, sujeto, async () => {
        check((await query("update public.ciudades set parametros='{\"radio_km\":99}' where slug='ciudad-de-mexico'")).rowCount === 0, `${rol}: no cambia los parámetros`);
        check((await uno("select parametros->>'radio_km' as r from public.ciudades where slug='ciudad-de-mexico'")).r === "12", `${rol}: los lee`);
      });
    }
    await as("service_role", null, async () => {
      check((await query("update public.ciudades set parametros = parametros || '{\"radio_km\":11}' where slug='ciudad-de-mexico'")).rowCount === 1, "la llave de servicio también los escribe");
    });

    // Solo un objeto, y no enorme.
    await falla(() => query("update public.ciudades set parametros='[]' where slug='ciudad-de-mexico'"), "23514", "parametros es un objeto, no una lista");
    await falla(() => query("update public.ciudades set parametros='\"texto\"' where slug='ciudad-de-mexico'"), "23514", "parametros no es un texto suelto");
    await falla(() => query("update public.ciudades set parametros=null where slug='ciudad-de-mexico'"), "23502", "parametros no es nulo");
    await falla(() => query("update public.ciudades set parametros=jsonb_build_object('alcaldias', to_jsonb(array_fill('x'::text, array[5000]))) where slug='ciudad-de-mexico'"), "23514", "parametros tiene techo de tamaño");
  } finally {
    await query("rollback");
  }
}
