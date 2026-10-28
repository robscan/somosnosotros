import { randomUUID } from "node:crypto";

/**
 * OL-445 (bitácora 477, migración 20261022130000): lo aceptado del showcase llega al perfil como hito. Un visitante solo ve hitos de evidencias
 * aceptadas (nunca lo propuesto ni lo rechazado, nunca una de «redes»), de artistas que puede ver; nadie los escribe a mano; rechazar, deshacer
 * o borrar la evidencia lo retira; la evidencia sigue siendo solo de la administración. Las sugerencias descartadas de «Completar ficha» viven
 * en la fila del candidato, que sigue siendo solo de la administración.
 */
const ADMIN = randomUUID();
const OTRA = randomUUID();

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('hitos-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'hitos-admin@local.test'), ($2, 'hitos-otra@local.test')", [ADMIN, OTRA]);
  const artista = async (nombre, visible = true) => (await query("insert into public.artistas (nombre, disciplina, visible) values ($1, 'musica', $2) returning id", [nombre, visible])).rows[0].id;
  const A = await artista("Hitos Uno OL-445");
  const OCULTO = await artista("Hitos Oculto OL-445", false);
  const evidencia = (artistaId, cambios = {}) =>
    as("service_role", null, async () => {
      const e = { senal: "obra", tipo: "premio", titulo: "Premio Estatal de Composición", url: "https://cultura.example.org/premio", fuente: "cultura.example.org", fecha: "2026-03-14", leida_por: "rutina", ...cambios };
      return (await query("insert into public.showcase_evidencias (artista_id, senal, tipo, titulo, url, fuente, fecha, leida_por) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id", [artistaId, e.senal, e.tipo, e.titulo, e.url, e.fuente, e.fecha, e.leida_por])).rows[0].id;
    });
  const hitosDe = (rol, sub, artistaId) => as(rol, sub, async () => (await query("select evidencia_id, tipo, titulo, url, fuente, fecha::text as fecha from public.artistas_hitos where artista_id = $1 order by titulo", [artistaId])).rows);

  // --- Lo propuesto no se ve: la rutina deja propuestas y el perfil no cambia.
  const premio = await evidencia(A);
  const redes = await evidencia(A, { senal: "actividad", tipo: "redes", titulo: "Publica cada semana", url: "https://instagram.com/hitos" });
  const disco = await evidencia(A, { tipo: "obra", titulo: "Disco «Altiplano»", url: "https://hitos.bandcamp.com/album/altiplano", fecha: null });
  check((await hitosDe("anon", null, A)).length === 0, "lo propuesto por la rutina no llega al perfil");

  // --- Aceptar publica; la administración acepta como siempre (con su sesión).
  await as("authenticated", ADMIN, () => query("update public.showcase_evidencias set estado = 'aceptada' where id = any($1)", [[premio, redes, disco]]));
  const publicos = await hitosDe("anon", null, A);
  check(publicos.length === 2 && publicos.every((h) => h.evidencia_id !== redes), "un visitante ve lo aceptado, nunca una evidencia de redes", publicos);
  const p = publicos.find((h) => h.evidencia_id === premio);
  check(p && p.tipo === "premio" && p.fuente === "cultura.example.org" && p.fecha === "2026-03-14" && p.url === "https://cultura.example.org/premio", "el hito lleva tipo, título, enlace, fuente y fecha de la evidencia", p);
  const columnas = await as("anon", null, async () => (await query("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'artistas_hitos' order by 1")).rows.map((r) => r.column_name));
  check(!columnas.some((c) => ["senal", "estado", "leida_por", "decidida_por", "notas"].includes(c)), "el hito no dice ni la señal, ni el estado, ni quién lo leyó o decidió", columnas);
  check((await hitosDe("authenticated", OTRA, A)).length === 2, "una cuenta cualquiera también lo ve");
  await as("anon", null, () => expectError(() => query("select count(*) from public.showcase_evidencias"), "42501", "la evidencia sigue cerrada al visitante"));

  // --- Corregir la evidencia aceptada corrige el hito.
  await as("authenticated", ADMIN, () => query("update public.showcase_evidencias set titulo = 'Premio Estatal de Composición 2026' where id = $1", [premio]));
  check((await hitosDe("anon", null, A)).some((h) => h.titulo === "Premio Estatal de Composición 2026"), "corregir la evidencia aceptada corrige el hito");

  // --- Rechazar, deshacer y pasarla a redes lo retiran; volver a aceptar lo repone una sola vez.
  await as("authenticated", ADMIN, () => query("update public.showcase_evidencias set estado = 'rechazada' where id = $1", [disco]));
  check(!(await hitosDe("anon", null, A)).some((h) => h.evidencia_id === disco), "rechazar lo retira del perfil");
  await as("authenticated", ADMIN, () => query("update public.showcase_evidencias set estado = 'aceptada' where id = $1", [disco]));
  await as("authenticated", ADMIN, () => query("update public.showcase_evidencias set estado = 'aceptada', fuente = 'bandcamp.com' where id = $1", [disco]));
  check((await hitosDe("anon", null, A)).filter((h) => h.evidencia_id === disco).length === 1, "aceptar dos veces deja un solo hito");
  await as("authenticated", ADMIN, () => query("update public.showcase_evidencias set estado = 'propuesta' where id = $1", [disco]));
  check(!(await hitosDe("anon", null, A)).some((h) => h.evidencia_id === disco), "deshacer (volver a propuesta) lo retira");
  await as("authenticated", ADMIN, () => query("update public.showcase_evidencias set tipo = 'redes' where id = $1", [premio]));
  check((await hitosDe("anon", null, A)).length === 0, "una aceptada que pasa a redes se retira");
  await as("authenticated", ADMIN, () => query("update public.showcase_evidencias set tipo = 'premio' where id = $1", [premio]));

  // --- Añadida a mano: nace aceptada y se publica; borrada, se va.
  const mano = await as("authenticated", ADMIN, async () => (await query("insert into public.showcase_evidencias (artista_id, senal, tipo, titulo, url, leida_por, estado) values ($1, 'circulacion', 'presentacion', 'Concierto en el Festival de Morelia', 'https://festival.example.mx/2026', 'persona', 'aceptada') returning id", [A])).rows[0].id);
  check((await hitosDe("anon", null, A)).some((h) => h.evidencia_id === mano), "la evidencia añadida a mano (aceptada) se publica");
  await as("authenticated", ADMIN, () => query("delete from public.showcase_evidencias where id = $1", [mano]));
  check(!(await hitosDe("anon", null, A)).some((h) => h.evidencia_id === mano), "borrar la evidencia borra el hito");

  // --- Un artista oculto: sus hitos no se ven en público; la administración sí los ve.
  const delOculto = await evidencia(OCULTO, { titulo: "Beca de creación", tipo: "beca" });
  await as("authenticated", ADMIN, () => query("update public.showcase_evidencias set estado = 'aceptada' where id = $1", [delOculto]));
  check((await hitosDe("anon", null, OCULTO)).length === 0, "los hitos de un artista oculto no se ven en público");
  check((await hitosDe("authenticated", ADMIN, OCULTO)).length === 1, "la administración ve los hitos de un artista oculto");

  // --- Nadie escribe hitos a mano: ni un visitante, ni una cuenta, ni la administración; el disparador no se llama desde fuera.
  const fila = [A, premio, "premio", "Inventado", "https://example.org/x"];
  const insertar = "insert into public.artistas_hitos (artista_id, evidencia_id, tipo, titulo, url) values ($1, $2, $3, $4, $5)";
  await as("anon", null, () => expectError(() => query(insertar, fila), "42501", "un visitante no escribe hitos"));
  await as("authenticated", OTRA, () => expectError(() => query(insertar, fila), "42501", "una cuenta cualquiera no escribe hitos"));
  await as("authenticated", ADMIN, () => expectError(() => query(insertar, fila), "42501", "ni la administración escribe hitos a mano"));
  await as("authenticated", ADMIN, () => expectError(() => query("update public.artistas_hitos set titulo = 'Otro'"), "42501", "ni la administración los cambia a mano"));
  await as("authenticated", OTRA, () => expectError(() => query("delete from public.artistas_hitos"), "42501", "una cuenta cualquiera no los borra"));
  await as("authenticated", OTRA, () => expectError(() => query("select public.showcase_evidencias_hito()"), "42501", "el disparador no se llama desde fuera"));

  // --- «Completar ficha»: las descartadas, solo la administración.
  await as("authenticated", ADMIN, () => query("insert into public.showcase_candidatos (artista_id, completar_descartadas) values ($1, array['detalle:jazz']) on conflict (artista_id) do update set completar_descartadas = excluded.completar_descartadas", [A]));
  const descartadas = await as("authenticated", ADMIN, async () => (await query("select completar_descartadas from public.showcase_candidatos where artista_id = $1", [A])).rows[0].completar_descartadas);
  check(Array.isArray(descartadas) && descartadas[0] === "detalle:jazz", "la administración guarda una sugerencia descartada", descartadas);
  const ve = await as("authenticated", OTRA, async () => (await query("select count(*)::int as n from public.showcase_candidatos")).rows[0].n);
  check(ve === 0, "una cuenta cualquiera no ve las descartadas", ve);
  await as("authenticated", ADMIN, () => expectError(() => query("update public.showcase_candidatos set completar_descartadas = (select array_agg(g::text) from generate_series(1, 201) g) where artista_id = $1", [A]), "23514", "más de 200 descartadas no entran"));

  // --- Limpieza: el banco del showcase cuenta todas las filas de sus tablas. Borrar los artistas se lleva evidencias, candidatos e hitos.
  await query("delete from public.artistas where id = any($1)", [[A, OCULTO]]);
  const quedan = (await query("select count(*)::int as n from public.artistas_hitos where artista_id = any($1)", [[A, OCULTO]])).rows[0].n;
  check(quedan === 0, "borrar el artista se lleva sus hitos", quedan);
}
