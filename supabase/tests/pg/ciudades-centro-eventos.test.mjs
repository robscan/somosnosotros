import { randomUUID } from "node:crypto";

// OL-283: eventos vigentes y visibles SIN lugar con punto público aportan el centro de ciudades sin lugares.
export async function run({ as, query, check }) {
  const autora = randomUUID();
  const Z = "America/Mexico_City";
  await query("begin");
  try {
    await query("insert into auth.users(id,email,email_confirmed_at) values ($1,'ol283-autora@example.com',now())", [autora]);
    const { rows: [lugar] } = await query(`insert into public.lugares(nombre,tipo,lat,lng,ciudad,zona,creado_por,visible,privado)
      values ('OL283 lugar','otro',10,-50,'OL283 Con lugar',$2,$1,true,false) returning id`, [autora, Z]);
    const evento = (titulo, ciudad, { inicio = "now() - interval '1 hour'", fin = "now() + interval '1 day'", visible = true, lugarId = null, lat = null, lng = null, reservado = false } = {}) =>
      query(`insert into public.eventos(titulo,inicio,fin,ciudad,zona,creado_por,visible,lugar_id,sitio_texto,sitio_lat,sitio_lng,sitio_reservado)
        values ($1,${inicio},${fin},$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [titulo, ciudad, Z, autora, visible, lugarId, lugarId ? null : "Sitio sintético", lat, lng, reservado]);

    // Solo eventos, con punto público: suma (dos con punto; uno sin punto cuenta como evento pero no como punto).
    await evento("OL283 a", "OL283 Gira", { lat: 19, lng: -101 });
    await evento("OL283 b", "OL283 Gira", { lat: 21, lng: -99 });
    await evento("OL283 c", "OL283 Gira");
    // Pasado y oculto no suman nada (el pasado ni siquiera cuenta como evento).
    await evento("OL283 pasado", "OL283 Gira", { inicio: "now() - interval '2 day'", fin: "now() - interval '1 day'", lat: 80, lng: 80 });
    await evento("OL283 oculto", "OL283 Gira", { visible: false, lat: 80, lng: 80 });
    // Reservado: el check de la tabla ya impide coordenadas; se retira solo dentro de esta transacción
    // para comprobar que la función también filtra por sitio_reservado.
    await evento("OL283 reservado normal", "OL283 Reservada", { reservado: true });
    await query("alter table public.eventos drop constraint eventos_reservado_sin_punto_publico");
    await evento("OL283 reservado con punto", "OL283 Reservada", { reservado: true, lat: 80, lng: 80 });
    // Con lugar: aunque traiga sitio_lat/lng, no suma en los campos nuevos.
    await evento("OL283 con lugar", "OL283 Con lugar", { lugarId: lugar.id, lat: 80, lng: 80 });
    await evento("OL283 sin lugar en ciudad con lugar", "OL283 Con lugar", { lat: 12, lng: -52 });

    for (const [rol, sujeto] of [["anon", null], ["authenticated", autora], ["service_role", null]]) {
      await as(rol, sujeto, async () => {
        const g = (await query("select public.ciudades_agregadas() as datos")).rows[0].datos;
        const gira = g.find(c => c.ciudad === "OL283 Gira");
        check(gira?.eventos === 3 && gira?.eventos_con_punto === 2 && gira?.ev_lat_suma === 40 && gira?.ev_lng_suma === -200,
          `${rol}: vigente visible sin lugar con punto suma; sin punto, pasado y oculto no`, gira);
        check(gira?.lugares === 0 && gira?.lat_suma === 0 && gira?.lng_suma === 0, `${rol}: los campos de lugares no cambian de significado`, gira);
        const res = g.find(c => c.ciudad === "OL283 Reservada");
        check(res?.eventos === 2 && res?.eventos_con_punto === 0 && res?.ev_lat_suma === 0 && res?.ev_lng_suma === 0,
          `${rol}: un sitio reservado nunca aporta coordenadas`, res);
        const con = g.find(c => c.ciudad === "OL283 Con lugar");
        check(con?.lugares === 1 && con?.lat_suma === 10 && con?.lng_suma === -50 && con?.eventos === 2,
          `${rol}: lugares y eventos de la ciudad con lugar siguen igual`, con);
        check(con?.eventos_con_punto === 1 && con?.ev_lat_suma === 12 && con?.ev_lng_suma === -52,
          `${rol}: el evento con lugar no suma en los campos nuevos`, con);
      });
    }
    // Con un corte posterior, todos los eventos de la gira están vencidos y no suman.
    await as("anon", null, async () => {
      const g = (await query("select public.ciudades_agregadas(now() + interval '3 day') as datos")).rows[0].datos;
      check(!g.some(c => c.ciudad === "OL283 Gira"), "con corte posterior los eventos vencidos no suman");
    });
    // Contrato de permisos intacto.
    const { rows: [f] } = await query(`select prosecdef,provolatile,proconfig,
      not exists(select 1 from aclexplode(proacl) where grantee=0 and privilege_type='EXECUTE') as sin_public,
      has_function_privilege('anon',oid,'execute') as anon, has_function_privilege('authenticated',oid,'execute') as auth,
      has_function_privilege('service_role',oid,'execute') as svc
      from pg_proc where oid='public.ciudades_agregadas(timestamptz)'::regprocedure`);
    check(!f.prosecdef && f.provolatile === "s" && f.proconfig?.includes('search_path=""') && f.sin_public && f.anon && f.auth && f.svc,
      "ciudades_agregadas sigue invoker, estable, search_path vacío, sin execute PUBLIC y con grants a los tres roles", f);
  } finally { await query("rollback"); }
}
