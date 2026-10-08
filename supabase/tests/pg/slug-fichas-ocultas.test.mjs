import { randomUUID } from "node:crypto";

/**
 * OL-343 (bitácora 372, migración 20261008110000): el slug de una ficha nueva se calcula contra TODAS las filas,
 * no solo contra las que deja ver la RLS a quien publica. Antes, si la administración había ocultado un evento (o
 * un lugar era privado de otra cuenta, o un artista estaba oculto, o quien publica había bloqueado al autor), el
 * candidato le parecía libre, el índice único lo rechazaba y la publicación fallaba con 23505 (`eventos_slug_idx`).
 * Ahora recibe el siguiente candidato libre (fecha y sufijo), y sigue sin ver nada de lo oculto.
 */
const ANA = randomUUID();
const BETO = randomUUID();

const base = {
  titulo: "Noche de Slug Escondido", inicio: "2031-03-15T02:00:00Z", fin: null,
  lugar_id: null, sitio_texto: "Foro de prueba OL-343", sitio_lat: 22.15, sitio_lng: -100.98, sitio_direccion: null,
  sitio_reservado: false, sitio_revelar_desde: null, ciudad: "San Luis Potosí",
  zona: "America/Mexico_City", descripcion: null, imagen: null, precio: null, enlace: null,
};

export async function run({ as, check, query }) {
  await query("insert into auth.users (id, email) values ($1, 'slug-oculto-ana@local.test'), ($2, 'slug-oculto-beto@local.test')", [ANA, BETO]);
  // El camino real de publicar (la misma RPC que usa la app), con los permisos de quien publica.
  const publicar = (quien, datos) =>
    as("authenticated", quien, async () => (await query(
      "select public.guardar_evento_con_avisos(null, $1::jsonb, null, '[]'::jsonb, null, $2::uuid) as r",
      [JSON.stringify({ ...base, ...datos }), randomUUID()],
    )).rows[0].r.id);
  const slugDe = async (tabla, id) => (await query(`select slug from public.${tabla} where id = $1`, [id])).rows[0].slug;
  // Lo que la persona alcanza a ver con su sesión (la RLS): la prueba de que el arreglo no expone nada.
  const veBeto = (tabla, id) => as("authenticated", BETO, async () => (await query(`select count(*)::int as n from public.${tabla} where id = $1`, [id])).rows[0].n);
  async function intentar(label, accion) {
    try {
      return await accion();
    } catch (error) {
      check(false, label, { code: error.code, message: error.message });
      return null;
    }
  }

  // --- Eventos: la administración oculta los dos de Ana (el del nombre solo y el de nombre + fecha).
  const a1 = await publicar(ANA, {});
  const a2 = await publicar(ANA, { inicio: "2031-03-15T04:00:00Z" });
  check(await slugDe("eventos", a1) === "noche-de-slug-escondido" && await slugDe("eventos", a2) === "noche-de-slug-escondido-2031-03-14",
    "eventos: los dos de Ana con nombre solo y nombre + fecha", [await slugDe("eventos", a1), await slugDe("eventos", a2)]);
  await query("update public.eventos set visible = false, retirado_por_admin = true where id = any($1::uuid[])", [[a1, a2]]);
  check(await veBeto("eventos", a1) === 0 && await veBeto("eventos", a2) === 0, "eventos: Beto no ve los ocultos");

  // Beto publica el mismo título el mismo día: antes, 23505 por eventos_slug_idx; ahora, el siguiente sufijo libre.
  const b1 = await intentar("eventos: publicar el mismo título y día que uno oculto no falla por slug duplicado", () => publicar(BETO, { inicio: "2031-03-15T05:00:00Z" }));
  if (b1) {
    const slug = await slugDe("eventos", b1);
    check(slug === "noche-de-slug-escondido-2031-03-14-2", "eventos: recibe el slug con sufijo", slug);
  }
  check(await veBeto("eventos", a1) === 0 && await veBeto("eventos", a2) === 0, "eventos: y sigue sin ver los ocultos");

  // Edición (`p_excluir_id`): el slug no se recalcula al renombrar ni al mover la fecha, aunque ahora coincida con
  // uno oculto, y la propia fila nunca choca consigo misma.
  if (b1) {
    const antes = await slugDe("eventos", b1);
    await intentar("eventos: editar el título y la fecha no falla", () => as("authenticated", BETO, () =>
      query("update public.eventos set titulo = 'Noche de Slug Escondido', inicio = '2031-03-15T03:00:00Z' where id = $1", [b1])));
    check(await slugDe("eventos", b1) === antes, "eventos: el slug no cambia al editar");
    const propio = (await query("select public.slug_de_evento($1, $2, $3, $4) as s", ["Noche de Slug Escondido", "2031-03-15T03:00:00Z", "America/Mexico_City", a1])).rows[0].s;
    check(propio === "noche-de-slug-escondido", "slug_de_evento: la fila excluida (p_excluir_id) no choca consigo misma", propio);
  }

  // Bloqueo: Beto bloqueó a Ana, así que no ve su evento visible; publicar el mismo título tampoco choca.
  await query("insert into public.bloqueos (quien, bloqueado) values ($1, $2)", [BETO, ANA]);
  const a3 = await publicar(ANA, { titulo: "Tarde de Slug Bloqueado" });
  check(await veBeto("eventos", a3) === 0, "bloqueo: Beto no ve el evento de Ana");
  const b2 = await intentar("bloqueo: publicar el mismo título que alguien bloqueado no falla", () => publicar(BETO, { titulo: "Tarde de Slug Bloqueado" }));
  if (b2) check(await slugDe("eventos", b2) === "tarde-de-slug-bloqueado-2031-03-14", "bloqueo: recibe el slug con la fecha", await slugDe("eventos", b2));
  await query("delete from public.bloqueos where quien = $1", [BETO]);

  // --- Lugares: el privado de Ana no lo ve Beto; dar de alta otro con el mismo nombre no choca.
  const lugar = (quien, privado, lat) => as("authenticated", quien, async () => (await query(
    "insert into public.lugares (nombre, tipo, lat, lng, creado_por, privado) values ('Patio del Slug', 'foro', $1, -100.9, auth.uid(), $2) returning id",
    [lat, privado],
  )).rows[0].id);
  const l1 = await lugar(ANA, true, 21.5);
  check(await veBeto("lugares", l1) === 0, "lugares: Beto no ve el privado de Ana");
  const l2 = await intentar("lugares: el mismo nombre que un privado ajeno no falla por slug duplicado", () => lugar(BETO, false, 23.5));
  if (l2) check(await slugDe("lugares", l2) === "patio-del-slug-2", "lugares: recibe el slug con sufijo", await slugDe("lugares", l2));

  // --- Artistas: uno oculto por la administración en otra ciudad (el duplicado por ciudad es otra regla).
  const artista = (quien, ciudad) => as("authenticated", quien, async () => (await query(
    "insert into public.artistas (nombre, disciplina, ciudad, creado_por) values ('Dúo del Slug', 'musica', $1, auth.uid()) returning id",
    [ciudad],
  )).rows[0].id);
  const r1 = await artista(ANA, "Querétaro");
  await query("update public.artistas set visible = false where id = $1", [r1]);
  check(await veBeto("artistas", r1) === 0, "artistas: Beto no ve el oculto");
  const r2 = await intentar("artistas: el mismo nombre que uno oculto no falla por slug duplicado", () => artista(BETO, "San Luis Potosí"));
  if (r2) check(await slugDe("artistas", r2) === "duo-del-slug-2", "artistas: recibe el slug con sufijo", await slugDe("artistas", r2));

  // --- Contrato: los tres disparadores ven todas las filas (SECURITY DEFINER, path vacío) y nadie con sesión los
  // puede invocar aparte; el cálculo reusable (slug_de_evento) sigue con los permisos de quien llama.
  const { rows } = await query(`
    select p.proname, p.prosecdef, p.proconfig,
      has_function_privilege('anon', p.oid, 'execute') as anon,
      has_function_privilege('authenticated', p.oid, 'execute') as authenticated
    from pg_proc p
    where p.oid in ('public.eventos_generar_slug()'::regprocedure, 'public.lugares_generar_slug()'::regprocedure,
                    'public.artistas_generar_slug()'::regprocedure)`);
  for (const p of rows) {
    check(p.prosecdef && p.proconfig?.includes('search_path=""') && !p.anon && !p.authenticated,
      `${p.proname}: security definer, path vacío y sin EXECUTE para anon ni authenticated`, p);
  }
  const calculo = (await query("select prosecdef from pg_proc where oid = 'public.slug_de_evento(text,timestamptz,text,uuid)'::regprocedure")).rows[0];
  check(calculo.prosecdef === false, "slug_de_evento sigue con los permisos de quien llama (no expone lo oculto si se llama aparte)");

  await query("delete from public.eventos where creado_por = any($1::uuid[])", [[ANA, BETO]]);
  await query("delete from public.lugares where creado_por = any($1::uuid[])", [[ANA, BETO]]);
  await query("delete from public.artistas where creado_por = any($1::uuid[])", [[ANA, BETO]]);
}
