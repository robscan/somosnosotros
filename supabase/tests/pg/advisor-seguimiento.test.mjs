// Lo que queda del Security Advisor (OL-077, bitácora 121), migración 20260918170000: diez índices que faltaban
// en claves foráneas, sin cambiar ninguna consulta de resultado. (pg_net se investigó y se descartó como
// arreglable — ver la bitácora 121: es de supabase_admin, con ACL nula, y una migración que corre como postgres
// no puede revocar nada ahí; el esquema net tampoco lo expone la API. No hay nada de pg_net que probar aquí.)

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
}
