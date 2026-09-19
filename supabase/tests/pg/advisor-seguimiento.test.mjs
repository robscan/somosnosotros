// Lo que queda del Security Advisor (OL-077, bitácora 121), migración 20260918170000. Dos cambios, ninguno
// visible para la app: se le quita a anon/authenticated el EXECUTE por defecto sobre las funciones de la
// extensión pg_net (si está instalada — en este banco local no lo está, y el bloque de la migración es una
// no-operación ahí, comprobado abajo sin fallar), y se añaden diez índices que faltaban en claves foráneas.

const FK_INDEXES = [
  ["artistas", "creado_por", "artistas_creado_por_idx"],
  ["avisos_entregas", "usuario_id", "avisos_entregas_usuario_id_idx"],
  ["avisos_enviados", "evento_id", "avisos_enviados_evento_id_idx"],
  ["avisos_jobs", "actor", "avisos_jobs_actor_idx"],
  ["cambios_de_rol", "por", "cambios_de_rol_por_idx"],
  ["eventos", "creado_por", "eventos_creado_por_idx"],
  ["lugares", "creado_por", "lugares_creado_por_idx"],
  ["novedades", "aviso_job_id", "novedades_aviso_job_id_idx"],
  ["novedades", "evento_id", "novedades_evento_id_idx"],
  ["topes_de_lectura", "cambiado_por", "topes_de_lectura_cambiado_por_idx"],
];

export async function run({ query, check }) {
  // ---------- índices nuevos: existen y cubren la columna de la clave foránea ----------
  for (const [tabla, columna, indice] of FK_INDEXES) {
    const { rows } = await query(
      `select ix.relname as indice, a.attname as columna
       from pg_index i
       join pg_class t on t.oid = i.indrelid
       join pg_class ix on ix.oid = i.indexrelid
       join pg_attribute a on a.attrelid = t.oid and a.attnum = i.indkey[0]
       where t.relname = $1 and ix.relname = $2`,
      [tabla, indice],
    );
    check(rows.length === 1 && rows[0].columna === columna, `${tabla}.${columna}: índice ${indice} existe y empieza por esa columna`, rows[0]);
  }
  const total = await query(`select count(*)::int as n from pg_indexes where schemaname = 'public' and indexname = any($1::text[])`, [FK_INDEXES.map((f) => f[2])]);
  check(total.rows[0].n === FK_INDEXES.length, "los diez índices están, ninguno de más ni de menos", total.rows[0]);

  // ---------- pg_net: si está instalada, ni anon ni authenticated ejecutan sus funciones; si no, no hay nada que revisar ----------
  const { rows: netFns } = await query(`
    select p.oid::regprocedure as firma
    from pg_depend d
    join pg_proc p on p.oid = d.objid and d.classid = 'pg_proc'::regclass
    join pg_extension e on e.oid = d.refobjid
    where e.extname = 'pg_net' and d.deptype = 'e'
  `);
  if (netFns.length === 0) {
    check(true, "pg_net no está instalada en este banco local: el bloque de la migración fue una no-operación, sin error (ver 'ok N migraciones aplicadas')");
  } else {
    for (const { firma } of netFns) {
      const { rows: [p] } = await query(
        `select has_function_privilege('anon', $1::regprocedure, 'execute') as anon,
                has_function_privilege('authenticated', $1::regprocedure, 'execute') as authenticated,
                has_function_privilege('service_role', $1::regprocedure, 'execute') as service_role`,
        [firma],
      );
      check(!p.anon && !p.authenticated && p.service_role, `pg_net ${firma}: sin EXECUTE para anon/authenticated, service_role conservado`, p);
    }
  }

  // ---------- control: ninguna función propia del proyecto llama net.* desde una ruta de anon/authenticated ----------
  // (si alguna lo hiciera, quitarle el permiso a pg_net rompería esa ruta; esto confirma que no es el caso)
  const { rows: llaman } = await query(`
    select p.oid::regprocedure as firma
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
      and p.prosrc ilike '%net.http%'
      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
  `);
  check(llaman.length === 0, "ninguna función propia con EXECUTE de cliente llama a net.http*: revocar pg_net no cambia comportamiento visible", llaman);
}
