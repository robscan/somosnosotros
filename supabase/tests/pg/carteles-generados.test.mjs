import { randomUUID } from "node:crypto";

/**
 * OL-324 (bitácora 353, migración 20261007120000): la tabla `carteles_generados`. Escribe su autor, a su nombre y en un evento que gestiona;
 * lee lo suyo; la administración lee, corrige y borra todo; anon no ve nada; borrar el evento se lleva sus filas.
 */
const AUTORA = randomUUID();
const OTRA = randomUUID();
const ADMIN = randomUUID();

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('carteles-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'carteles-autora@local.test'), ($2, 'carteles-otra@local.test'), ($3, 'carteles-admin@local.test')", [AUTORA, OTRA, ADMIN]);
  const evento = async (autor, titulo) =>
    (
      await query(
        "insert into public.eventos (titulo, inicio, fin, sitio_texto, sitio_lat, sitio_lng, ciudad, zona, creado_por) values ($1, '2030-10-10T02:00:00Z', '2030-10-10T04:00:00Z', 'Plaza de prueba', 22.15, -100.98, 'San Luis Potosí', 'America/Mexico_City', $2) returning id",
        [titulo, autor],
      )
    ).rows[0].id;
  const suyo = await evento(AUTORA, "Cartel de la autora OL-324");
  const ajeno = await evento(OTRA, "Cartel de otra OL-324");
  const insertar = (quien, fila) => as("authenticated", quien, () => query("insert into public.carteles_generados (evento_id, perfil_id, plantilla, formato, ruta) values ($1, $2, $3, $4, $5) returning id", [fila.evento, fila.perfil ?? quien, fila.plantilla ?? "cine-sangre", fila.formato ?? "4x5", fila.ruta ?? null]));
  const contar = (quien) => as("authenticated", quien, async () => (await query("select count(*)::int as n from public.carteles_generados")).rows[0].n);

  // --- La autora registra los suyos (descarga y «Usar como cartel» con su ruta).
  await insertar(AUTORA, { evento: suyo });
  await insertar(AUTORA, { evento: suyo, plantilla: "deco-sol", formato: "9x16", ruta: `lugares/${AUTORA}/cartel-generado-1.jpg` });
  check((await contar(AUTORA)) === 2, "la autora ve sus dos carteles");
  const defecto = await as("authenticated", AUTORA, async () => (await query("insert into public.carteles_generados (evento_id, plantilla, formato) values ($1, 'zine-cinta', '4x5') returning perfil_id", [suyo])).rows[0].perfil_id);
  check(defecto === AUTORA, "sin perfil_id, la fila queda a nombre de quien la escribe", defecto);

  // --- Nadie escribe a nombre de otra ni en un evento que no gestiona.
  await expectError(() => insertar(OTRA, { evento: suyo }), "42501", "otra cuenta no registra carteles en un evento que no gestiona");
  await expectError(() => insertar(OTRA, { evento: ajeno, perfil: AUTORA }), "42501", "nadie escribe a nombre de otra cuenta");
  // --- Lo que no es una plantilla, un formato o una ruta se rechaza.
  await expectError(() => insertar(AUTORA, { evento: suyo, plantilla: "Cine Sangre!" }), "23514", "una plantilla con letras raras");
  await expectError(() => insertar(AUTORA, { evento: suyo, formato: "1x1" }), "23514", "un formato que no existe");
  await expectError(() => insertar(AUTORA, { evento: suyo, ruta: "lugares/../otra/x.jpg" }), "23514", "una ruta con «..»");

  // --- Lectura: cada quien lo suyo; la otra cuenta registra en su evento y solo ve eso.
  await insertar(OTRA, { evento: ajeno });
  check((await contar(OTRA)) === 1, "otra cuenta solo ve su cartel");
  check((await contar(AUTORA)) === 3, "la autora no ve el de otra cuenta");
  check((await contar(ADMIN)) === 4, "la administración ve todos");
  const anon = await as("anon", null, async () => {
    try {
      return (await query("select count(*)::int as n from public.carteles_generados")).rows[0].n;
    } catch (error) {
      return error.code;
    }
  });
  check(anon === "42501", "anon no lee la tabla", anon);

  // --- Corregir y borrar: la autora no (el conteo del mes no se toca); la administración sí.
  const cambiados = await as("authenticated", AUTORA, async () => (await query("update public.carteles_generados set plantilla = 'otra' returning id")).rowCount);
  check(cambiados === 0, "la autora no edita sus filas", cambiados);
  const borrados = await as("authenticated", AUTORA, async () => (await query("delete from public.carteles_generados returning id")).rowCount);
  check(borrados === 0, "la autora no borra sus filas", borrados);
  const porAdmin = await as("authenticated", ADMIN, async () => (await query("delete from public.carteles_generados where evento_id = $1 returning id", [ajeno])).rowCount);
  check(porAdmin === 1, "la administración borra", porAdmin);
  // La administración también registra (gestiona cualquier evento).
  await insertar(ADMIN, { evento: suyo });

  // --- Borrar el evento se lleva sus carteles.
  await query("delete from public.eventos where id = $1", [suyo]);
  const quedan = (await query("select count(*)::int as n from public.carteles_generados where evento_id = $1", [suyo])).rows[0].n;
  check(quedan === 0, "borrar el evento borra sus carteles", quedan);
}
