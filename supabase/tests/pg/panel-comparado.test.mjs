import { randomUUID } from "node:crypto";

/**
 * OL-494 (bitácora 526, migración 20261029270000): `panel_resumen()` trae `comparado` para que «Personas nuevas» y «Eventos de la comunidad»
 * de la portada de Administración digan «▲ N más» frente a la semana anterior. Qué cuenta en cada semana (sin administradores, con el rol de
 * entonces; solo eventos visibles; un evento que ya pasó también cuenta, a diferencia de `comunidad_nuevos`), que lo de antes no se pierde
 * (`ahora`, `historia`, `gestionar`) y los permisos: solo la administración, SECURITY DEFINER con `search_path` vacío.
 * El banco es compartido: se mide la diferencia antes y después de sembrar.
 */
const ADMIN = randomUUID();
const NUEVA = randomUUID(); // se registró hace 3 días: esta semana
const ANTERIOR = randomUUID(); // hace 10 días: la semana anterior
const VIEJA = randomUUID(); // hace 20 días: fuera de las dos
const LUGAR = randomUUID();

export async function run({ as, check, expectError, query }) {
  const resumen = async () => (await as("authenticated", ADMIN, () => query("select public.panel_resumen() as r"))).rows[0].r;
  await query("insert into public.admin_correos (correo) values ('comparado-admin@local.test')");
  await query("insert into auth.users (id, email, email_confirmed_at) values ($1, 'comparado-admin@local.test', now())", [ADMIN]);
  await query("update public.perfiles set creado_en = now() - interval '60 days' where id = $1", [ADMIN]);
  const antes = await resumen();
  check(antes.comparado && typeof antes.comparado === "object", "panel_resumen trae «comparado»", antes.comparado);
  check(["personas_nuevas_antes", "comunidad", "comunidad_antes"].every((k) => Number.isInteger(antes.comparado?.[k])), "con sus tres números", antes.comparado);
  check(antes.ahora && Array.isArray(antes.historia) && Number.isInteger(antes.gestionar?.personas_nuevas), "lo de antes sigue: ahora, historia y gestionar", Object.keys(antes));

  await query("insert into auth.users (id, email) values ($1, 'comparado-nueva@local.test'), ($2, 'comparado-anterior@local.test'), ($3, 'comparado-vieja@local.test')", [NUEVA, ANTERIOR, VIEJA]);
  await query(
    `update public.perfiles set creado_en = case id when $1::uuid then now() - interval '3 days' when $2::uuid then now() - interval '10 days' else now() - interval '20 days' end
     where id in ($1, $2, $3)`,
    [NUEVA, ANTERIOR, VIEJA],
  );
  await query("insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, visible, creado_en) values ($1, 'Foro del comparado', 'foro', 22.15, -100.98, $2, true, now() - interval '60 days')", [LUGAR, ADMIN]);
  await query(
    `insert into public.eventos (lugar_id, titulo, inicio, creado_por, visible, creado_en) values
      ($1, 'Comunidad, por venir', now() + interval '3 days', $2, true, now() - interval '2 days'),
      ($1, 'Comunidad, ya pasó', now() - interval '1 day', $2, true, now() - interval '5 days'),
      ($1, 'Comunidad, oculto', now() + interval '3 days', $2, false, now() - interval '1 day'),
      ($1, 'Administración, esta semana', now() + interval '3 days', $4, true, now() - interval '2 days'),
      ($1, 'Comunidad, semana anterior', now() + interval '8 days', $3, true, now() - interval '10 days'),
      ($1, 'Comunidad, semana anterior, ya pasó', now() - interval '6 days', $3, true, now() - interval '12 days'),
      ($1, 'Administración, semana anterior', now() + interval '8 days', $4, true, now() - interval '9 days'),
      ($1, 'Comunidad, hace tres semanas', now() + interval '8 days', $3, true, now() - interval '20 days')`,
    [LUGAR, NUEVA, ANTERIOR, ADMIN],
  );
  const despues = await resumen();
  const d = (k) => despues.comparado[k] - antes.comparado[k];
  check(despues.gestionar.personas_nuevas - antes.gestionar.personas_nuevas === 1, "personas nuevas: solo la de hace 3 días", { antes: antes.gestionar.personas_nuevas, despues: despues.gestionar.personas_nuevas });
  check(d("personas_nuevas_antes") === 1, "la semana anterior: solo la de hace 10 días (ni la de hace 20 ni la administración)", { antes: antes.comparado, despues: despues.comparado });
  check(d("comunidad") === 2, "eventos de la comunidad esta semana: el que viene y el que ya pasó; ni el oculto ni el de la administración", { antes: antes.comparado, despues: despues.comparado });
  check(d("comunidad_antes") === 2, "la semana anterior: los dos de la comunidad de hace 10 y 12 días; ni el de la administración ni el de hace 20", { antes: antes.comparado, despues: despues.comparado });
  check(despues.ahora.comunidad_nuevos - antes.ahora.comunidad_nuevos === 1, "control: comunidad_nuevos (solo lo que viene) cuenta 1 de los 2 de esta semana", { antes: antes.ahora.comunidad_nuevos, despues: despues.ahora.comunidad_nuevos });

  // El rol de entonces: si la cuenta de la semana anterior se vuelve administradora hoy, lo que hizo antes sigue contando.
  await query("insert into public.cambios_de_rol (perfil_id, rol, creado_en) values ($1, 'admin', now() - interval '1 day')", [ANTERIOR]);
  const ascendida = await resumen();
  check(
    ascendida.comparado.personas_nuevas_antes === despues.comparado.personas_nuevas_antes && ascendida.comparado.comunidad_antes === despues.comparado.comunidad_antes,
    "ascender a alguien hoy no borra lo que hizo la semana anterior",
    { despues: despues.comparado, ascendida: ascendida.comparado },
  );

  // Permisos: anon no la ejecuta; una cuenta que no es de administración choca con el candado de dentro.
  await as("anon", null, () => expectError(() => query("select public.panel_resumen()"), "42501", "anon no lee el resumen"));
  await as("authenticated", NUEVA, () => expectError(() => query("select public.panel_resumen()"), "42501", "una cuenta sin administración no lee el resumen"));
  const f = (await query("select p.prosecdef, p.proconfig from pg_proc p where p.oid = 'public.panel_resumen()'::regprocedure")).rows[0];
  check(f.prosecdef === true && (f.proconfig ?? []).some((c) => c === 'search_path=""' || c === "search_path="), "SECURITY DEFINER con search_path vacío", f);
  const publico = (await query("select has_function_privilege('public', 'public.panel_resumen()', 'execute') as p")).rows[0].p;
  check(publico === false, "PUBLIC no la ejecuta", publico);
  console.log("Panel comparado (OL-494): personas nuevas y eventos de la comunidad frente a la semana anterior, con el rol de entonces y solo para la administración");
}
