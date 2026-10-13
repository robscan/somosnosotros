import { randomUUID } from "node:crypto";

// OL-391 (bitácora 422): «Se canceló». La columna `eventos.cancelado` nace en false (todo lo pasado sigue contando como realizado) y la
// cambian quienes ya pueden editar el evento, con las políticas de siempre: su autora (marca y desmarca) y la administración; otra cuenta y un
// visitante no. Cambiarla no toca `visible`, `borrador` ni `retirado_por_admin`.
const AUTORA = randomUUID();
const OTRA = randomUUID();
const ADMIN = randomUUID();

export async function run({ as, check, query }) {
  await query("insert into public.admin_correos (correo) values ('ol391-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'ol391-autora@local.test'), ($2, 'ol391-otra@local.test'), ($3, 'ol391-admin@local.test')", [AUTORA, OTRA, ADMIN]);

  const fila = async (id) => (await query("select cancelado, visible, borrador, retirado_por_admin from public.eventos where id = $1", [id])).rows[0];
  // Un evento de la autora que ya pasó, como lo publica la app.
  const pasado = await as("authenticated", AUTORA, async () =>
    (await query(
      `insert into public.eventos (titulo, inicio, fin, sitio_texto, sitio_lat, sitio_lng, ciudad, zona, creado_por)
       values ('Concierto OL-391', now() - interval '3 days', now() - interval '3 days' + interval '2 hours', 'Sitio público', 22.15, -100.98, 'San Luis Potosí', 'America/Mexico_City', auth.uid()) returning id`,
    )).rows[0].id,
  );
  // Cambiar la marca como lo haría la app (o una petición directa a la API): cuántas filas cambió y qué quedó.
  const marcar = (rol, quien, valor) => as(rol, quien, () => query("update public.eventos set cancelado = $2 where id = $1", [pasado, valor]));
  const intento = async (rol, quien, valor) => {
    try {
      return { filas: (await marcar(rol, quien, valor)).rowCount, error: null };
    } catch (e) {
      return { filas: 0, error: e.code };
    }
  };

  // --- 1. Nace en false: lo pasado cuenta como realizado sin que nadie confirme nada.
  check((await fila(pasado)).cancelado === false, "un evento nace sin la marca «se canceló»");
  const columna = (await query("select is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'eventos' and column_name = 'cancelado'")).rows[0];
  check(columna?.is_nullable === "NO" && columna?.column_default === "false", "la columna no admite null y vale false por omisión", columna);

  // --- 2. La autora la pone y la quita.
  const puesta = await intento("authenticated", AUTORA, true);
  check(puesta.filas === 1 && (await fila(pasado)).cancelado === true, "la autora marca su evento «se canceló»", puesta);
  const quitada = await intento("authenticated", AUTORA, false);
  check(quitada.filas === 1 && (await fila(pasado)).cancelado === false, "y lo desmarca", quitada);

  // --- 3. Otra cuenta no: la política la deja sin filas que cambiar.
  const ajena = await intento("authenticated", OTRA, true);
  check(ajena.filas === 0 && (await fila(pasado)).cancelado === false, "otra cuenta no marca un evento ajeno", ajena);

  // --- 4. Un visitante sin sesión, tampoco.
  const visitante = await intento("anon", null, true);
  check(visitante.filas === 0 && (await fila(pasado)).cancelado === false, "un visitante no lo marca", visitante);

  // --- 5. La administración sí, y lo deshace; la marca no toca nada más del evento.
  const admin = await intento("authenticated", ADMIN, true);
  const marcado = await fila(pasado);
  check(admin.filas === 1 && marcado.cancelado === true, "la administración marca un evento ajeno", admin);
  check(marcado.visible === true && marcado.borrador === false && marcado.retirado_por_admin === false, "marcarlo no lo oculta, no lo vuelve borrador ni lo retira", marcado);
  const deshecho = await intento("authenticated", ADMIN, false);
  check(deshecho.filas === 1 && (await fila(pasado)).cancelado === false, "y lo deshace", deshecho);

  // --- 6. Un visitante sigue viendo el evento marcado: se queda en la lista, solo que cancelado.
  await marcar("authenticated", AUTORA, true);
  const visto = (await as("anon", null, () => query("select cancelado from public.eventos where id = $1", [pasado]))).rows[0];
  check(visto?.cancelado === true, "un visitante ve el evento marcado y su marca", visto);
}
