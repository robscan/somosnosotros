// OL-121 (Pincel): tope global e interruptor de apagado (migración 20260922180000_pincel_freno.sql), decidido
// por el founder el 2026-09-22 («me ha preocupado que la pagina pueda colapsar»). Contrato mínimo (founder):
// como mucho 2 obras abiertas y 40 mandos en total, en la base; dos administradores a la vez no lo saltan;
// apagado bloquea el canal en vivo (realtime.messages) para authenticated y encendido lo reabre; solo admin
// escribe el ajuste. Corre sobre la imitación de `realtime` de scripts/test-db.mjs.

const ADMIN = "40000000-0000-4000-8000-000000000001";
const OTRA_ADMIN = "40000000-0000-4000-8000-000000000002";
const OTRA = "40000000-0000-4000-8000-000000000003";
const CHECK = "23514"; // check_violation

async function crearLugar(as, query, autor, nombre) {
  const r = await as("authenticated", autor, () =>
    query("insert into public.lugares (nombre, tipo, lat, lng, creado_por) values ($1, 'foro', 22.15, -100.98, auth.uid()) returning id", [nombre]),
  );
  return r.rows[0].id;
}

async function abrirObra(as, query, autor, lugarId, nombre, cupo) {
  return as("authenticated", autor, () =>
    query(
      "insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por, cupo_mandos) values ($1, $2, now() + interval '2 hours', auth.uid(), $3) returning id, cupo_mandos",
      [nombre, lugarId, cupo],
    ),
  );
}

export async function run({ as, check, expectError, query, connection }) {
  await query("insert into public.admin_correos (correo) values ('pincel-freno-admin@local.test'), ('pincel-freno-otra-admin@local.test')");
  await query(
    `insert into auth.users (id, email, email_confirmed_at) values
       ($1, 'pincel-freno-admin@local.test', now()),
       ($2, 'pincel-freno-otra-admin@local.test', now()),
       ($3, 'pincel-freno-otra@local.test', now())`,
    [ADMIN, OTRA_ADMIN, OTRA],
  );

  const lugarUno = await crearLugar(as, query, OTRA, "Lugar del freno uno");
  const lugarDos = await crearLugar(as, query, OTRA, "Lugar del freno dos");
  const lugarTres = await crearLugar(as, query, OTRA, "Lugar del freno tres");
  const lugarCuatro = await crearLugar(as, query, OTRA, "Lugar del freno cuatro");

  // ---------- (1) tope global: como mucho 2 obras abiertas ----------
  const obraUno = await abrirObra(as, query, ADMIN, lugarUno, "Freno: obra uno", 10);
  const obraUnoId = obraUno.rows[0].id;
  check(Boolean(obraUnoId), "primera obra abierta: se acepta");

  const obraDos = await abrirObra(as, query, ADMIN, lugarDos, "Freno: obra dos", 10);
  const obraDosId = obraDos.rows[0].id;
  check(Boolean(obraDosId), "segunda obra abierta: se acepta (2 de 2)");

  await as("authenticated", ADMIN, () =>
    expectError(
      () => query("insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por) values ('Freno: obra tres', $1, now() + interval '2 hours', auth.uid())", [lugarTres]),
      CHECK,
      "una tercera obra abierta se rechaza (ya hay dos)",
    ),
  );

  // Reabrir cuenta igual que abrir: con 2 ya abiertas, reabrir una tercera cerrada también se rechaza.
  const obraTresCerrada = await as("authenticated", ADMIN, () =>
    query("insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por, estado, cerrado_en) values ('Freno: obra tres cerrada', $1, now() + interval '2 hours', auth.uid(), 'cerrada', now()) returning id", [
      lugarTres,
    ]),
  );
  const obraTresCerradaId = obraTresCerrada.rows[0].id;
  await as("authenticated", ADMIN, () =>
    expectError(
      () => query("update public.obras_colectivas set estado = 'abierta', cerrado_en = null where id = $1", [obraTresCerradaId]),
      CHECK,
      "reabrir una tercera obra también se rechaza (ya hay dos abiertas)",
    ),
  );

  // ---------- (1) tope global: como mucho 40 mandos entre las obras abiertas ----------
  // Con el tope de 2 obras abiertas y el tope POR obra de 20 (migración 20260922130000, ya en producción, no se
  // toca aquí), la suma máxima posible es siempre 20 + 20 = 40: exactamente el tope global, nunca más. Por eso
  // no hay un valor de cupo_mandos (1..20) que viole el freno de 40 sin violar YA el tope por obra — el freno
  // queda codificado tal como decidió el founder (defensa en profundidad, por si algún día cambia el tope por
  // obra o el número de obras abiertas), y aquí se prueba lo que sí es alcanzable hoy: el borde exacto se acepta.
  const obraDosAlTope = await as("authenticated", ADMIN, () => query("update public.obras_colectivas set cupo_mandos = 20 where id = $1 returning cupo_mandos", [obraDosId]));
  check(obraDosAlTope.rows[0]?.cupo_mandos === 20, "subir el cupo de la segunda obra a su tope por obra (20) se acepta", obraDosAlTope.rows[0]);
  const obraUnoAlTope = await as("authenticated", ADMIN, () =>
    query("update public.obras_colectivas set cupo_mandos = 20 where id = $1 returning cupo_mandos", [obraUnoId]),
  );
  check(obraUnoAlTope.rows[0]?.cupo_mandos === 20, "con las dos obras a 20 (suma 40, el tope exacto) el freno lo acepta, no lo rechaza", obraUnoAlTope.rows[0]);
  const sumaEnElTope = await query("select coalesce(sum(cupo_mandos), 0)::int as n from public.obras_colectivas where estado = 'abierta'");
  check(sumaEnElTope.rows[0].n === 40, "la suma de mandos de las obras abiertas queda exactamente en el tope (40), nunca por encima", sumaEnElTope.rows[0]);
  // Un cambio que no toca estado ni cupo (p. ej. el nombre) no dispara el freno.
  await as("authenticated", ADMIN, () => query("update public.obras_colectivas set nombre = 'Freno: obra dos (renombrada)' where id = $1", [obraDosId]));

  // Deja las cosas en 1 abierta (obraUno) para la prueba de concurrencia: se cierra obraDos.
  await as("authenticated", ADMIN, () => query("update public.obras_colectivas set estado = 'cerrada', cerrado_en = now() where id = $1", [obraDosId]));

  // ---------- dos administradores a la vez no lo saltan ----------
  // Con obraUno abierta (1 de 2), dos administradores intentan abrir, al mismo tiempo, la segunda que falta —
  // en lugares distintos, cada uno el suyo. Sin el cerrojo (pg_advisory_xact_lock), las dos transacciones
  // contarían "1 abierta" a la vez y las dos pasarían, dejando 3 abiertas. Con el cerrojo, la segunda espera a
  // que la primera termine y ve "2 abiertas" — solo una de las dos se acepta.
  const intento = (autor, lugarId, nombre) =>
    connection(async (cliente) => {
      await cliente.query("set role authenticated");
      await cliente.query("select set_config('request.jwt.claim.sub', $1, false)", [autor]);
      try {
        await cliente.query("insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por) values ($1, $2, now() + interval '2 hours', $3)", [nombre, lugarId, autor]);
        return { ok: true };
      } catch (error) {
        return { ok: false, code: error.code };
      }
    });
  const [resultadoA, resultadoB] = await Promise.all([
    intento(ADMIN, lugarTres, "Freno: concurrente A"),
    intento(OTRA_ADMIN, lugarCuatro, "Freno: concurrente B"),
  ]);
  check(
    (resultadoA.ok && !resultadoB.ok && resultadoB.code === CHECK) || (!resultadoA.ok && resultadoA.code === CHECK && resultadoB.ok),
    "dos administradores a la vez: solo una de las dos aperturas concurrentes se acepta, la otra se rechaza con check_violation",
    { resultadoA, resultadoB },
  );
  const abiertasTrasConcurrencia = await query("select count(*)::int as n from public.obras_colectivas where estado = 'abierta'");
  check(abiertasTrasConcurrencia.rows[0].n === 2, "tras la carrera, siguen abiertas exactamente 2 (nunca 3)", abiertasTrasConcurrencia.rows[0]);

  // Deja todo cerrado para no interferir con otros bancos que comparten esta misma base (test-db.mjs).
  await query("update public.obras_colectivas set estado = 'cerrada', cerrado_en = now() where estado = 'abierta'");

  // ---------- (2) ajustes_sitio: solo admin escribe, cualquiera con sesión lee ----------
  const lectura = await query("select valor from public.ajustes_sitio where clave = 'pincel_activo'");
  check(lectura.rows[0]?.valor === true, "pincel_activo empieza encendido (true) por la propia migración", lectura.rows[0]);

  const anonLee = await as("anon", null, () => query("select clave from public.ajustes_sitio where clave = 'pincel_activo'"));
  check(anonLee.rowCount === 0, "anon (sin sesión) no lee ajustes_sitio");
  const conSesionLee = await as("authenticated", OTRA, () => query("select clave from public.ajustes_sitio where clave = 'pincel_activo'"));
  check(conSesionLee.rowCount === 1, "cualquiera con sesión (no admin) lee ajustes_sitio");

  const otraEscribe = await as("authenticated", OTRA, () => query("update public.ajustes_sitio set valor = 'false'::jsonb where clave = 'pincel_activo' returning valor"));
  check(otraEscribe.rowCount === 0, "una cuenta que no es admin no cambia el ajuste (0 filas, sin error)");
  const anonEscribe = await as("anon", null, () => query("update public.ajustes_sitio set valor = 'false'::jsonb where clave = 'pincel_activo' returning valor"));
  check(anonEscribe.rowCount === 0, "anon no cambia el ajuste");

  const antesDeApagar = await query("select cambiado_por, cambiado_en from public.ajustes_sitio where clave = 'pincel_activo'");
  check(antesDeApagar.rows[0]?.cambiado_por === null, "sin cambios de admin todavía, cambiado_por sigue null (lo puso la migración, no una cuenta)");

  const apagaAdmin = await as("authenticated", ADMIN, () => query("update public.ajustes_sitio set valor = 'false'::jsonb where clave = 'pincel_activo' returning valor, cambiado_por"));
  check(apagaAdmin.rowCount === 1 && apagaAdmin.rows[0].valor === false, "administración apaga Pincel", apagaAdmin.rows[0]);
  check(apagaAdmin.rows[0].cambiado_por === ADMIN, "el disparador anota quién lo cambió, no lo que mandó el cliente", apagaAdmin.rows[0]);

  // ---------- (2) apagado bloquea realtime.messages para authenticated; encendido lo reabre ----------
  // Reabre la obra de prueba (lugarTres ya no tiene ninguna otra abierta: se cerraron todas arriba) en vez de
  // insertar una fila nueva, para no chocar con su propio id.
  await query("update public.obras_colectivas set estado = 'abierta', cerrado_en = null where id = $1", [obraTresCerradaId]);
  const topic = `obra:${obraTresCerradaId}`;
  const RLS = "42501";
  async function enCanal(role, subject, action) {
    return as(role, subject, async () => {
      await query("select set_config('realtime.topic', $1, false)", [topic]);
      try {
        return await action();
      } finally {
        await query("select set_config('realtime.topic', '', false)");
      }
    });
  }
  const manda = () => query("insert into realtime.messages (topic, extension, payload) values ($1, 'broadcast', '{}'::jsonb)", [topic]);
  const recibe = async () => {
    const { rows } = await query("select count(*)::int as n from realtime.messages where topic = $1", [topic]);
    return rows[0].n;
  };

  await expectError(() => enCanal("authenticated", OTRA, manda), RLS, "Pincel apagado: con sesión ya no manda trazo, aunque la obra esté abierta y visible");
  await as("service_role", null, manda); // cuela una fila directo, para probar que tampoco se lee apagado
  check((await enCanal("authenticated", OTRA, recibe)) === 0, "Pincel apagado: con sesión no recibe nada del canal, ni lo colado por service_role");

  const enciendeAdmin = await as("authenticated", ADMIN, () => query("update public.ajustes_sitio set valor = 'true'::jsonb where clave = 'pincel_activo' returning valor"));
  check(enciendeAdmin.rows[0]?.valor === true, "administración enciende Pincel de nuevo");

  await enCanal("authenticated", OTRA, manda);
  check((await enCanal("authenticated", OTRA, recibe)) === 2, "encendido de nuevo: manda y recibe como antes (la fila colada de antes sigue ahí, más esta)");

  // Se deja todo limpio para no estorbar a otros bancos que comparten esta base.
  await query("update public.obras_colectivas set estado = 'cerrada', cerrado_en = now() where estado = 'abierta'");
}
