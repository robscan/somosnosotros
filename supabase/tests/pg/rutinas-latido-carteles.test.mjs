import { randomUUID } from "node:crypto";

// OL-444 · migración 20261022120000_rutinas_latido_carteles.sql. El latido (`rutinas_latido`, lo corre pg_cron cada minuto en producción): sin
// corridas vivas no llama a nada; con ellas, una llamada por corrida libre (tres como mucho) a /api/rutinas/correr con el secreto de Vault; sin
// Vault, sin pg_net o sin dirección, nada. Aquí pg_net y Vault son de mentira (un esquema `net` que apunta lo que se le pide y una tabla
// `vault.decrypted_secrets`), creados dentro de la transacción. Y los tipos nuevos: corridas `carteles` y propuestas `cartel`.
// Todo dentro de una transacción que se deshace.
export async function run({ as, check, expectError, query }) {
  const admin = randomUUID(), persona = randomUUID();
  const adminCorreo = `latido-${admin}@local.test`;
  const uno = async (sql, params) => (await query(sql, params)).rows[0];
  const falla = async (accion, codigo, etiqueta) => {
    await query("savepoint antes_del_error");
    await expectError(accion, codigo, etiqueta);
    await query("rollback to savepoint antes_del_error");
  };
  const latido = async () => (await uno("select public.rutinas_latido() as n")).n;
  const llamadas = async () => (await query("select url, headers from net.llamadas order by n")).rows;
  await query("begin");
  try {
    await query("insert into public.admin_correos(correo) values ($1)", [adminCorreo]);
    await query("insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now()),($3,$4,now())", [admin, adminCorreo, persona, `latido-persona-${persona}@local.test`]);
    // El banco empieza sin corridas de otras pruebas (cada una deshace lo suyo); por si acaso, ninguna.
    await query("delete from public.rutinas_corridas");

    // ---------- nadie más que su dueño (pg_cron) la corre ----------
    for (const [rol, sujeto] of [["anon", null], ["authenticated", persona], ["authenticated", admin], ["service_role", null]]) {
      await as(rol, sujeto, async () => {
        await falla(() => query("select public.rutinas_latido()"), "42501", `${rol}${sujeto === admin ? " (administración)" : ""}: no corre el latido`);
        await falla(() => query("select public.rutinas_vivas()"), "42501", `${rol}: no cuenta las corridas vivas`);
      });
    }

    // ---------- sin corridas vivas, nada (ni siquiera mira Vault) ----------
    check((await latido()) === 0, "sin corridas, el latido no llama a nada");
    const corrida = async (tipo, estado, resumen = {}) =>
      (await uno("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,estado,resumen,inicio,creado_por) values ($1,'san-luis-potosi',2,$2,$3,case when $2 = 'pendiente' then null else now() end,$4) returning id", [tipo, estado, JSON.stringify(resumen), admin])).id;
    const P = await corrida("lugares", "pendiente");
    // Sin Vault ni pg_net (el banco no los tiene): no llama, aunque haya una viva.
    check((await latido()) === 0, "sin Vault ni pg_net no llama (y no falla)");

    // ---------- pg_net y Vault de mentira ----------
    await query(`create schema net;
      create table net.llamadas (n serial primary key, url text, body jsonb, headers jsonb, timeout_milliseconds integer);
      create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000)
        returns bigint language sql as $$ insert into net.llamadas(url, body, headers, timeout_milliseconds) values (url, body, headers, timeout_milliseconds) returning n::bigint $$;
      create schema vault;
      create table vault.decrypted_secrets (name text primary key, decrypted_secret text);`);
    check((await latido()) === 0, "con Vault vacío (sin dirección ni secreto) no llama");
    // Lo que ya guardan los avisos (OL-086): su dirección y el mismo CRON_SECRET.
    await query("insert into vault.decrypted_secrets values ('avisos_url','https://somosnosotros.org/api/avisos-pendientes'),('avisos_cron_secret','s3cr3t')");

    // Una pendiente: una llamada a la ruta del motor (la dirección sale de la de los avisos) con el secreto como Bearer.
    check((await latido()) === 1, "una pendiente: una llamada");
    let l = await llamadas();
    check(l.length === 1 && l[0].url === "https://somosnosotros.org/api/rutinas/correr" && l[0].headers.Authorization === "Bearer s3cr3t", "llama a /api/rutinas/correr con el secreto de los avisos", l);

    // ---------- qué cuenta como viva ----------
    await query("update public.rutinas_corridas set estado='corriendo', inicio=now(), resumen=jsonb_build_object('turno',1,'ocupada_hasta',(now() + interval '5 minutes')::text) where id=$1", [P]);
    check((await uno("select public.rutinas_vivas() as n")).n === 0, "una «corriendo» que alguien trabaja (ocupada_hasta futuro) no cuenta");
    await query("delete from net.llamadas");
    check((await latido()) === 0 && (await llamadas()).length === 0, "si todas están ocupadas, no llama a nada");
    await query("update public.rutinas_corridas set resumen=jsonb_build_object('turno',1,'ocupada_hasta',(now() - interval '1 minute')::text) where id=$1", [P]);
    check((await uno("select public.rutinas_vivas() as n")).n === 1, "una «corriendo» con ocupada_hasta vencido cuenta");
    await query("update public.rutinas_corridas set resumen=jsonb_build_object('turno',1,'ocupada_hasta',null) where id=$1", [P]);
    check((await uno("select public.rutinas_vivas() as n")).n === 1, "una «corriendo» sin ocupada_hasta cuenta (así quedó la de San Luis)");
    await query("update public.rutinas_corridas set resumen=jsonb_build_object('ocupada_hasta','basura') where id=$1", [P]);
    check((await uno("select public.rutinas_vivas() as n")).n === 1, "un ocupada_hasta ilegible no tumba el latido: cuenta como libre");
    await query("update public.rutinas_corridas set estado='terminada', fin=now() where id=$1", [P]);
    check((await uno("select public.rutinas_vivas() as n")).n === 0, "terminadas, fallidas y canceladas no cuentan");

    // Cinco vivas: tres llamadas como mucho (cada una toma una distinta en el motor).
    for (const t of ["lugares", "agendas", "artistas", "carteles"]) await corrida(t, "pendiente");
    await query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,estado,inicio,creado_por) values ('lugares','san-miguel-de-allende',2,'corriendo',now(),$1)", [admin]);
    await query("delete from net.llamadas");
    check((await latido()) === 3 && (await llamadas()).length === 3, "cinco vivas: tres llamadas en este latido");

    // `rutinas_url` en Vault manda; una dirección que no es https://…/api/rutinas/correr no recibe el secreto.
    await query("insert into vault.decrypted_secrets values ('rutinas_url','https://www.somosnosotros.org/api/rutinas/correr')");
    await query("delete from net.llamadas");
    await latido();
    check((await llamadas()).every((x) => x.url === "https://www.somosnosotros.org/api/rutinas/correr"), "rutinas_url, si está, manda sobre la de los avisos");
    await query("update vault.decrypted_secrets set decrypted_secret='http://atacante.example/api/rutinas/correr' where name='rutinas_url'");
    await query("delete from net.llamadas");
    check((await latido()) === 0 && (await llamadas()).length === 0, "una dirección que no es https de la ruta del motor no recibe nada");

    // ---------- los tipos nuevos ----------
    const C = await uno("select id from public.rutinas_corridas where tipo='carteles' and ciudad='san-luis-potosi'");
    check(!!C, "una corrida «carteles» por ciudad");
    await falla(() => query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd) values ('carteles','san-luis-potosi',2)"), "23505", "una sola «carteles» en curso por ciudad");
    await falla(() => query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd) values ('flyers','san-luis-potosi',2)"), "23514", "un tipo de corrida que no existe sigue sin entrar");
    await falla(() => query("insert into public.rutinas_corridas(tipo,tope_usd) values ('carteles',2)"), "23514", "«carteles» es de una ciudad");
    const lugar = await uno("insert into public.lugares(nombre,tipo,lat,lng,ciudad,creado_por) values ('Foro Latido','foro',22.15,-100.97,'San Luis Potosí',$1) returning id", [admin]);
    const evento = await uno("insert into public.eventos(lugar_id,titulo,inicio,ciudad,creado_por) values ($1,'Concierto sin cartel',now() + interval '3 days','San Luis Potosí',$2) returning id", [lugar.id, admin]);
    const datos = { evento_id: evento.id, imagen: "https://forolatido.mx/carteles/concierto.jpg", pagina: "https://forolatido.mx/agenda", titulo: "Concierto sin cartel" };
    const prop = await uno("insert into public.propuestas(corrida_id,tipo,fuente,datos) values ($1,'cartel','Sitio del lugar',$2) returning id", [C.id, JSON.stringify(datos)]);
    await falla(() => query("insert into public.propuestas(corrida_id,tipo,fuente) values ($1,'flyer','x')", [C.id]), "23514", "un tipo de propuesta que no existe sigue sin entrar");
    await as("authenticated", persona, async () => {
      await falla(() => query("select public.aceptar_propuesta($1)", [prop.id]), "42501", "una cuenta sin administración no acepta un cartel");
    });
    const aceptada = await as("authenticated", admin, async () => (await uno("select public.aceptar_propuesta($1) as r", [prop.id])).r);
    check(aceptada.estado === "aceptada" && aceptada.ficha_id === null, "la administración acepta un cartel (sin ficha en la función: la pone el servidor)", aceptada);
    // El servidor, con la llave de servicio, liga la propuesta al evento al que le puso el cartel.
    await as("service_role", null, async () => {
      check((await query("update public.propuestas set ficha_id=$2 where id=$1 and estado='aceptada' and ficha_id is null", [prop.id, evento.id])).rowCount === 1, "la llave de servicio liga el cartel a su evento");
    });
    const panel = await as("authenticated", admin, async () => (await uno("select public.panel_ciudades() as p")).p);
    const enPanel = panel.corridas.find((x) => x.id === C.id);
    check(enPanel?.tipo === "carteles" && enPanel.propuestas === 1 && enPanel.aceptadas === 1, "panel_ciudades cuenta las propuestas de la corrida de carteles", enPanel);
  } finally {
    await query("rollback");
  }
}
