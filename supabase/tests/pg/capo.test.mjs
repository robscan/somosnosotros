import { randomUUID } from "node:crypto";

export async function run({ as, check, expectError, query }) {
  const admin = randomUUID(), user = randomUUID(), other = randomUUID();
  const adminEmail = `capo-${admin}@local.test`;
  const artists = [];
  const read = () => as("authenticated", admin, async () => (await query("select public.panel_capo() as metricas")).rows[0].metricas);
  try {
    await query("insert into public.admin_correos(correo) values ($1)", [adminEmail]);
    await query("insert into auth.users(id,email) values ($1,$2),($3,'capo-user@local.test'),($4,'capo-other@local.test')", [admin, adminEmail, user, other]);
    await as("anon", null, () => expectError(() => query("select public.panel_capo()"), "42501", "CAPO: anon sin acceso"));
    await as("authenticated", user, () => expectError(() => query("select public.panel_capo()"), "42501", "CAPO: usuario sin acceso"));
    await as("authenticated", null, () => expectError(() => query("select public.panel_capo()"), "42501", "CAPO: authenticated sin uid rechazado"));
    await as(null, null, () => expectError(() => query("select public.panel_capo()"), "42501", "CAPO: guardia rechaza incluso propietario sin uid"));
    const base = await read();
    check(base.invitados === 0 && base.elegibles === 0 && base.solicitaron_despues === 0 && base.vinculados_despues === 0 && base.primer_envio === null, "CAPO: cohorte vacía, sin fecha inventada", base);
    async function artist(origen = "capo", visible = true) {
      const id = randomUUID(); artists.push(id);
      await query("insert into public.artistas(id,nombre,origen,visible,creado_por) values($1::uuid,'Fixture ' || $1::uuid::text,$2,$3,$4)", [id, origen, visible, admin]);
      return id;
    }
    async function invite(id, days = 10) {
      await query("insert into public.invitaciones_enviadas(artista_id,correo,enviado_en) values($1,'privado@local.test',now()-$2*interval '1 day')", [id, days]);
    }
    async function link(id, days, perfil = user) {
      await query("insert into public.artistas_cuentas(artista_id,perfil_id,creado_en) values($1,$2,now()-$3*interval '1 day')", [id, perfil, days]);
    }
    async function claim(id, days, motivo = "es_mio", atendido = false) {
      await query("insert into public.reportes(tipo,objeto_id,motivo,creado_por,creado_en,atendido) values('artista',$1,$2,$3,now()-$4*interval '1 day',$5)", [id, motivo, user, days, atendido]);
    }
    const a = await artist(); await invite(a); await invite(a, 8); await claim(a, 9); await claim(a, 7); await link(a, 6); await link(a, 5, other);
    const b = await artist(); await invite(b); await link(b, 12); await claim(b, 7); await link(b, 6, other);
    const c = await artist(); await invite(c); await claim(c, 7, "retirar", true);
    const d = await artist(); await invite(d); await claim(d, 12);
    const e = await artist(); await invite(e); await link(e, 5); // vínculo sin reclamo no implica aprobación
    const f = await artist(); await invite(f); await claim(f, 7, "es_mio", true); // atendido no es aprobado
    const g = await artist(); await invite(g);
    // Copiar exactamente la fecha, sin desfase entre transacciones.
    await query("insert into public.artistas_cuentas(artista_id,perfil_id,creado_en) select artista_id,$2,enviado_en from public.invitaciones_enviadas where artista_id=$1", [g, user]);
    const h = await artist(); await invite(h);
    await query("insert into public.reportes(tipo,objeto_id,motivo,creado_por,creado_en) select 'artista',artista_id,'es_mio',$2,enviado_en from public.invitaciones_enviadas where artista_id=$1", [h, user]);
    const hidden = await artist("capo", false); await invite(hidden); await claim(hidden, 5);
    const nonCapo = await artist(null); await invite(nonCapo); await link(nonCapo, 5); await claim(nonCapo, 5);
    const notInvited = await artist(); await link(notInvited, 5); await claim(notInvited, 5);
    const future = await artist(); await invite(future, -2);
    await claim(d, -2); await link(d, -2); // actividad futura fuera del corte
    const m = await read();
    check(m.invitados === 9, "CAPO: artistas distintos, excluye no CAPO/sin envío/envío futuro", m);
    check(m.ya_vinculados_al_invitar === 2 && m.elegibles === 7, "CAPO: previos e iguales fuera del denominador", m);
    check(m.solicitaron_despues === 3, "CAPO: solicitudes posteriores distintas, incluye ocultos, excluye retiro/previos/iguales/futuros", m);
    check(m.vinculados_despues === 2, "CAPO: vínculos posteriores distintos, no confunde atendido con aprobado", m);
    check(Object.keys(m).sort().join() === ["invitados","ya_vinculados_al_invitar","elegibles","solicitaron_despues","vinculados_despues","primer_envio","ultimo_envio","corte"].sort().join(), "CAPO: contrato solo agrega conteos y fechas", m);
    check(!JSON.stringify(m).includes("privado@") && !JSON.stringify(m).includes(user), "CAPO: no expone contactos ni personas");
    check(new Date(m.primer_envio) <= new Date(m.ultimo_envio) && new Date(m.ultimo_envio) <= new Date(m.corte), "CAPO: fechas coherentes");
    for (const role of ["anon", "authenticated"]) {
      const raw = await as(role, role === "authenticated" ? admin : null, () => query("select artista_id from public.invitaciones_enviadas"));
      check(raw.rowCount === 0, `CAPO: ${role} no recibe SELECT directo de invitaciones`);
    }
    const flags = await query("select provolatile,prosecdef,proconfig from pg_proc where oid='public.panel_capo()'::regprocedure");
    check(flags.rows[0].provolatile === "s" && flags.rows[0].prosecdef && flags.rows[0].proconfig.includes('search_path=""'), "CAPO: STABLE, definer y search_path vacío", flags.rows[0]);
  } finally {
    await query("delete from public.reportes where objeto_id=any($1::uuid[])", [artists]);
    await query("delete from public.artistas where id=any($1::uuid[])", [artists]);
    await query("delete from auth.users where id=any($1::uuid[])", [[admin,user,other]]);
    await query("delete from public.admin_correos where correo=$1", [adminEmail]);
  }
}
