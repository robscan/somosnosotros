import { randomUUID } from "node:crypto";

// OL-328 (bitácora 357): un borrador de programa nunca es visible y la administración manda sobre lo oculto. Parte de los casos de la
// revisión de Codex (OL-327, `moderacion_borrador` y `moderacion_borrador_visible_directo`): antes, una cuenta normal volvía a mostrar
// con `publicar_borrador_de_programa` (SECURITY DEFINER) un acto que la administración había ocultado.
const AUTORA = randomUUID();
const OTRA = randomUUID();
const ADMIN = randomUUID();

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('ol328-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'ol328-autora@local.test'), ($2, 'ol328-otra@local.test'), ($3, 'ol328-admin@local.test')", [AUTORA, OTRA, ADMIN]);

  const fila = async (id) => (await query("select visible, borrador, retirado_por_admin from public.eventos where id = $1", [id])).rows[0];
  const anonVe = async (id) => (await as("anon", null, () => query("select id from public.eventos where id = $1", [id]))).rowCount === 1;
  // Un evento propio insertado como lo haría una petición directa a la API (lo que hizo Codex), con las columnas que se le pidan.
  const insertar = (quien, { clase = "puntual", padre = null, visible = true, borrador = false, id = randomUUID() } = {}) =>
    as("authenticated", quien, async () => {
      await query(
        `insert into public.eventos (id, titulo, inicio, fin, sitio_texto, sitio_lat, sitio_lng, ciudad, zona, creado_por, clase, evento_padre_id, visible, borrador)
         values ($1, 'Acto OL-328', '2030-11-06T18:00Z', '2030-11-06T20:00Z', 'Sitio público', 22.15, -100.98, 'San Luis Potosí', 'America/Mexico_City', auth.uid(), $2, $3, $4, $5)`,
        [id, clase, padre, visible, borrador],
      );
      return id;
    });
  // Un borrador legítimo: un acto visible ligado al festival que `programa_ocultar_borrador` oculta como borrador (así lo hace publicar_programa).
  const borradorLegitimo = async (festival) => {
    const id = await insertar(AUTORA, { padre: festival });
    await as("authenticated", AUTORA, () => query("select public.programa_ocultar_borrador($1::uuid)", [id]));
    return id;
  };
  const publicarBorrador = (quien, id) => as("authenticated", quien, () => query("select public.publicar_borrador_de_programa($1::uuid) as r", [id]));
  const ocultar = (quien, id, visible = false) => as("authenticated", quien, () => query("update public.eventos set visible = $2 where id = $1", [id, visible]));
  // El error de la base con su código y su texto (la app distingue `no_publicable` de `sin_permiso`).
  const errorDe = async (accion) => {
    try {
      await accion();
      return null;
    } catch (e) {
      return { code: e.code, message: e.message };
    }
  };

  const festival = await insertar(AUTORA, { clase: "festival" });

  // --- 1. Un borrador nunca es visible: ni al insertarlo (el primer paso de Codex) ni al volver borrador algo visible.
  await expectError(() => insertar(AUTORA, { padre: festival, visible: true, borrador: true }), "23514", "insertar un acto visible y borrador a la vez se rechaza");
  const visibleNormal = await insertar(AUTORA, { padre: festival });
  await expectError(() => as("authenticated", ADMIN, () => query("update public.eventos set borrador = true where id = $1", [visibleNormal])), "23514", "ni la administración deja un borrador visible");
  const ocultoPorLaAutora = await insertar(AUTORA, { padre: festival, visible: false, borrador: true });
  check((await fila(ocultoPorLaAutora)).borrador && !(await fila(ocultoPorLaAutora)).visible, "un borrador insertado oculto sí se guarda (es lo mismo que el alta)");

  // --- 2. El caso de Codex con un borrador legítimo: la administración lo «oculta» (ya lo estaba) y la autora ya no lo publica.
  const legitimo = await borradorLegitimo(festival);
  await ocultar(ADMIN, legitimo);
  const retirado = await fila(legitimo);
  check(retirado.retirado_por_admin && !retirado.visible && retirado.borrador, "ocultar un borrador ya oculto lo marca como retirado por la administración", retirado);
  const rechazo = await errorDe(() => publicarBorrador(AUTORA, legitimo));
  check(rechazo?.code === "42501" && rechazo.message === "no_publicable", "la autora no publica un borrador que la administración retiró", rechazo);
  check(!(await fila(legitimo)).visible && !(await anonVe(legitimo)), "sigue oculto y anon no lo ve");

  // --- 3. El caso «visible directo» de Codex, ya sin la marca de borrador: un acto visible que la administración oculta no vuelve.
  const acto = await insertar(AUTORA, { padre: festival });
  await ocultar(ADMIN, acto);
  check((await fila(acto)).retirado_por_admin, "ocultar un acto visible lo marca como retirado");
  await expectError(() => as("authenticated", AUTORA, () => query("update public.eventos set borrador = true where id = $1", [acto])), "42501", "la autora no lo vuelve borrador");
  await expectError(() => as("authenticated", AUTORA, () => query("select public.programa_ocultar_borrador($1::uuid)", [acto])), "42501", "ni por la función que oculta borradores");
  const noBorrador = await errorDe(() => publicarBorrador(AUTORA, acto));
  check(noBorrador?.code === "42501" && noBorrador.message === "no_publicable", "ni lo publica como borrador", noBorrador);
  await expectError(() => ocultar(AUTORA, acto, true), "42501", "ni lo vuelve a mostrar con un UPDATE");
  check(!(await anonVe(acto)), "anon no vuelve a verlo");

  // --- 4. La marca es solo de la administración.
  await expectError(() => as("authenticated", AUTORA, () => query("update public.eventos set retirado_por_admin = false where id = $1", [legitimo])), "42501", "la autora no se quita la marca de retirado");
  await expectError(() => as("authenticated", AUTORA, () => query("update public.eventos set retirado_por_admin = true where id = $1", [ocultoPorLaAutora])), "42501", "ni se la pone a algo suyo");
  check((await fila(legitimo)).retirado_por_admin, "la marca sigue puesta");

  // --- 5. Un borrador normal (no retirado) sí se publica; otra cuenta y anon no.
  const normal = await borradorLegitimo(festival);
  const ajeno = await errorDe(() => publicarBorrador(OTRA, normal));
  check(ajeno?.code === "42501" && ajeno.message === "sin_permiso", "otra cuenta no publica un borrador ajeno (sin decir si existe)", ajeno);
  const inexistente = await errorDe(() => publicarBorrador(AUTORA, randomUUID()));
  check(inexistente?.code === "42501" && inexistente.message === "sin_permiso", "un id que no existe responde igual que uno ajeno", inexistente);
  await as("anon", null, () => expectError(() => query("select public.publicar_borrador_de_programa($1::uuid)", [normal]), "42501", "anon no publica borradores"));
  const hecho = (await publicarBorrador(AUTORA, normal)).rows[0].r;
  const publicado = await fila(normal);
  check(hecho.padre === festival && publicado.visible && !publicado.borrador && !publicado.retirado_por_admin, "un borrador no retirado se publica", publicado);
  check(await anonVe(normal), "y anon lo ve");
  const otraVez = await errorDe(() => publicarBorrador(AUTORA, normal));
  check(otraVez?.message === "no_publicable", "publicar otra vez lo ya publicado no hace nada", otraVez);

  // --- 6. La administración sí lo vuelve a mostrar: deja de ser borrador y de estar retirado.
  await ocultar(ADMIN, legitimo, true);
  const devuelto = await fila(legitimo);
  check(devuelto.visible && !devuelto.borrador && !devuelto.retirado_por_admin, "la administración vuelve a mostrar un borrador retirado (deja de ser borrador)", devuelto);
  check(await anonVe(legitimo), "y anon lo ve");
  await ocultar(ADMIN, acto, true);
  check(!(await fila(acto)).retirado_por_admin && (await anonVe(acto)), "y a un acto que había ocultado");
  // Si la administración fija la marca a mano, vale lo que puso.
  await as("authenticated", ADMIN, () => query("update public.eventos set retirado_por_admin = true where id = $1", [ocultoPorLaAutora]));
  check((await fila(ocultoPorLaAutora)).retirado_por_admin, "la administración pone la marca a mano");
  await as("authenticated", ADMIN, () => query("update public.eventos set retirado_por_admin = false where id = $1", [ocultoPorLaAutora]));
  check(!(await fila(ocultoPorLaAutora)).retirado_por_admin, "y la quita a mano");

  // --- 7. Lo que hace la propia base no pasa por la marca: publicar_programa sigue dejando sus desmarcados como borradores no retirados.
  const json = (v) => JSON.stringify(v);
  const datos = (titulo, inicio) => ({ titulo, inicio, fin: null, lugar_id: null, sitio_texto: "Sitio público", sitio_lat: 22.15, sitio_lng: -100.98, sitio_reservado: false, sitio_revelar_desde: null, ciudad: "San Luis Potosí", zona: "America/Mexico_City", descripcion: null, imagen: null, precio: null, enlace: null });
  const programa = (await as("authenticated", AUTORA, () =>
    query("select public.publicar_programa($1::jsonb, $2::jsonb, $3::uuid) as r", [
      json({ datos: { titulo: "Festival OL-328", imagen: null, precio: null, descripcion: null, enlace: null }, quien: [] }),
      json([
        { datos: datos("Marcado", "2030-12-01T01:00:00Z"), quien: [], publicar: true, operacion: randomUUID() },
        { datos: datos("Desmarcado", "2030-12-02T01:00:00Z"), quien: [], publicar: false, operacion: randomUUID() },
      ]),
      randomUUID(),
    ]))).rows[0].r;
  const marcado = await fila(programa.actos[0]);
  const desmarcado = await fila(programa.borradores[0]);
  check(marcado.visible && !marcado.borrador && !marcado.retirado_por_admin, "publicar_programa deja visible el marcado", marcado);
  check(!desmarcado.visible && desmarcado.borrador && !desmarcado.retirado_por_admin, "y oculto, como borrador sin retirar, el desmarcado", desmarcado);
  await publicarBorrador(AUTORA, programa.borradores[0]);
  check((await fila(programa.borradores[0])).visible, "su autora lo publica después");

  // --- 8. Ningún borrador visible en toda la base, después de todos los bancos anteriores.
  const malos = Number((await query("select count(*) as n from public.eventos where borrador and visible")).rows[0].n);
  check(malos === 0, "no queda ningún borrador visible", malos);
}
