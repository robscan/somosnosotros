// Banco de las funciones de la base (OL-497, bitácora 529): cuánto tarda cada lectura de la portada de Administración y de Administración ›
// Instagram con datos del tamaño de producción (×1: 80 personas, 250 lugares, 700 artistas, 1 500 eventos) o diez veces más (×10). Datos
// inventados; la base es un Postgres propio en la Mac (nunca producción ni la base de otro chat). Imita Supabase como `scripts/test-db.mjs`
// (copia su `fixtureSql` leyendo ese archivo), aplica todas las migraciones si la base está vacía, llena las tablas y cronometra cada función
// con el rol `authenticated` y la sesión de la administración (mediana de 9 vueltas; tres si es lenta).
//
//   initdb -D <carpeta> -U postgres --auth=trust && echo "port = 55497" >> <carpeta>/postgresql.conf
//   LC_ALL=C pg_ctl -D <carpeta> -l <carpeta>/pg.log start && createdb -h 127.0.0.1 -p 55497 -U postgres banco
//   node scripts/ops/auditoria-ui/banco-funciones.mjs postgres://postgres@127.0.0.1:55497/banco 1     (y luego 10)
//   LC_ALL=C pg_ctl -D <carpeta> stop
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const [url, f = "1"] = process.argv.slice(2);
if (!url || !["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)) throw new Error("solo una base local (127.0.0.1)");
const F = Number(f);
const c = new pg.Client({ connectionString: url });
await c.connect();

// ---------- la base, si está vacía: roles, lo de Supabase y las migraciones ----------
if (!(await c.query("select to_regclass('public.eventos') t")).rows[0].t) {
  const fixture = fs.readFileSync(path.join(RAIZ, "scripts/test-db.mjs"), "utf8").match(/function fixtureSql\(\) \{\n  return `([\s\S]*?)`;\n\}/)[1];
  for (const r of ["anon", "authenticated", "service_role"]) await c.query(`do $$ begin if not exists (select 1 from pg_roles where rolname='${r}') then create role ${r} nologin noinherit ${r === "service_role" ? "bypassrls" : ""}; end if; end $$;`);
  await c.query("grant anon, authenticated, service_role to current_user");
  await c.query(fixture);
  const dir = path.join(RAIZ, "supabase/migrations");
  for (const m of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) await c.query(fs.readFileSync(path.join(dir, m), "utf8"));
}
const ADMIN = "55555555-5555-4555-8555-555555555555";
const q = (s, v) => c.query(s, v);

// ---------- datos ----------
await q("set session_replication_role = replica"); // sin disparadores ni llaves foráneas al llenar: los datos se arman coherentes a mano
for (const t of ["redes_trabajos", "instagram_publicaciones", "propuestas", "rutinas_corridas", "indicadores_diarios", "cuentas_vistas", "seguimientos", "asistencias", "eventos_artistas", "eventos", "artistas", "lugares", "perfiles", "ciudades"]) await q(`delete from public.${t}`);
await q("delete from auth.users");
await q(`insert into public.ciudades (slug, nombre, zona, estado, lat, lng) values
  ('san-luis-potosi','San Luis Potosí','America/Mexico_City','abierta',22.15,-100.98),
  ('ciudad-de-mexico','Ciudad de México','America/Mexico_City','abierta',19.43,-99.13),
  ('oaxaca','Oaxaca','America/Mexico_City','investigando',17.06,-96.72),
  ('queretaro','Querétaro','America/Mexico_City','detectada',20.59,-100.39),
  ('guadalajara','Guadalajara','America/Mexico_City','detectada',20.67,-103.35),
  ('monterrey','Monterrey','America/Monterrey','detectada',25.67,-100.31)`);
const CIUDADES = "array['San Luis Potosí','San Luis Potosí','San Luis Potosí','San Luis Potosí','Ciudad de México','Oaxaca','Querétaro']";
// Personas: 80 × F, una de administración.
await q(`insert into auth.users (id, email, last_sign_in_at, created_at)
  select case when i = 1 then '${ADMIN}'::uuid else gen_random_uuid() end, 'p' || i || '@example.com', now() - (random() * 60 || ' days')::interval, now() - (random() * 200 || ' days')::interval
  from generate_series(1, ${80 * F}) i`);
await q(`insert into public.perfiles (id, nombre, rol, creado_en, novedades_vistas_en)
  select u.id, 'Persona ' || row_number() over (), case when u.id = '${ADMIN}' then 'admin' else 'usuario' end, u.created_at, now() - (random() * 20 || ' days')::interval from auth.users u`);
await q(`insert into public.cuentas_vistas (perfil_id, dia) select p.id, (now() - ((random() * 20)::int || ' days')::interval)::date from public.perfiles p`);
// Lugares: 250 × F (el 70 % en San Luis), la mitad sin portada.
await q(`insert into public.lugares (id, nombre, tipo, lat, lng, slug, ciudad, visible, privado, portada, descripcion, creado_en)
  select gen_random_uuid(), 'Lugar ' || i, (array['foro','museo','galeria','casa_de_cultura','cafe_bar'])[1 + i % 5], 22.15 + random() / 10, -100.98 + random() / 10, 'lugar-' || i,
    (${CIUDADES})[1 + i % 7], i % 20 <> 0, i % 50 = 0, case when i % 2 = 0 then 'https://x.supabase.co/storage/v1/object/public/fotos/l' || i || '.jpg' end, repeat('texto ', 10 + i % 30), now() - (random() * 300 || ' days')::interval
  from generate_series(1, ${250 * F}) i`);
// Artistas: 700 × F (el Catálogo CAPO: casi todos sin foto ni portada).
await q(`insert into public.artistas (id, nombre, slug, ciudad, visible, foto, portada, descripcion, disciplina, creado_en)
  select gen_random_uuid(), 'Artista ' || i, 'artista-' || i, (${CIUDADES})[1 + i % 7], true,
    case when i % 7 = 0 then 'https://x.supabase.co/storage/v1/object/public/fotos/a' || i || '.jpg' end,
    case when i % 9 = 0 then 'https://x.supabase.co/storage/v1/object/public/fotos/p' || i || '.jpg' end,
    case when i % 3 = 0 then repeat('obra ', 40) end, (array['musica','teatro','danza','artes_visuales','letras'])[1 + i % 5], now() - (random() * 300 || ' days')::interval
  from generate_series(1, ${700 * F}) i`);
// Eventos: 1 500 × F; dos tercios ya pasaron, el resto en los próximos 60 días. En el lugar de su ciudad.
await q(`with l as (select id, ciudad, row_number() over (order by id) n, count(*) over () t from public.lugares),
  e as (select i, now() + ((random() * 240 - 160) || ' days')::interval + ((i % 12) || ' hours')::interval as inicio from generate_series(1, ${1500 * F}) i)
  insert into public.eventos (id, titulo, inicio, fin, slug, lugar_id, ciudad, visible, borrador, cancelado, retirado_por_admin, clase, creado_por, creado_en, imagen)
  select gen_random_uuid(), 'Evento ' || e.i, e.inicio, e.inicio + interval '2 hours', 'evento-' || e.i, l.id, l.ciudad, e.i % 25 <> 0, false, false, false,
    (array['puntual','puntual','puntual','exposicion','taller'])[1 + e.i % 5],
    case when e.i % 4 = 0 then (select id from public.perfiles order by id offset (e.i % ${80 * F}) limit 1) end, e.inicio - interval '10 days',
    case when e.i % 3 <> 0 then 'https://x.supabase.co/storage/v1/object/public/fotos/e' || e.i || '.jpg' end
  from e join l on l.n = 1 + e.i % l.t`);
await q(`insert into public.eventos_artistas (evento_id, artista_id)
  select distinct on (e.id, a.id) e.id, a.id from (select id, row_number() over () n from public.eventos) e
  join (select id, row_number() over () n, count(*) over () t from public.artistas) a on a.n = 1 + (e.n * 7) % a.t
  where e.n % 5 <> 0`);
await q(`insert into public.asistencias (usuario_id, evento_id, estado, creado_en)
  select distinct on (p.id, e.id) p.id, e.id, case when random() < 0.6 then 'voy' else 'me_interesa' end, now() - (random() * 30 || ' days')::interval
  from public.perfiles p cross join lateral (select id from public.eventos where termina > now() - interval '30 days' order by random() limit 6) e`);
await q(`insert into public.seguimientos (usuario_id, lugar_id, creado_en) select p.id, l.id, now() - (random() * 30 || ' days')::interval from public.perfiles p cross join lateral (select id from public.lugares order by random() limit 3) l`);
await q(`insert into public.indicadores_diarios (dia, activas, cuentas, coincidencias, eventos_semana, lugares_con_fecha, lugares, comunidad, proximos)
  select (now() - (d || ' days')::interval)::date, 20, 80, 3, 40, 30, 250, 12, 500 from generate_series(1, 120) d`);
await q(`insert into public.rutinas_corridas (id, tipo, tope_usd, ciudad, estado, parametros, resumen, creado_en, gasto_usd)
  select gen_random_uuid(), (array['lugares','agendas','fichas'])[1 + i % 3], 5, (array['san-luis-potosi','oaxaca','queretaro'])[1 + i % 3], 'terminada',
    jsonb_build_object('consultas', 30, 'fuentes', jsonb_build_array('a','b','c')), jsonb_build_object('texto', repeat('resumen ', 120)), now() - (i || ' days')::interval, 0.4
  from generate_series(1, 60) i`);
await q(`insert into public.propuestas (corrida_id, tipo, fuente, estado, motivo_rechazo, resuelto_en) select r.id, 'lugar', 'web', x.e, case when x.e = 'rechazada' then 'otro' end, case when x.e <> 'propuesta' then now() end from public.rutinas_corridas r, generate_series(1, 15) g, lateral (select (array['propuesta','aceptada','rechazada'])[1 + (g % 3)] e) x`);
await q(`insert into public.instagram_publicaciones (evento_id, formato, estado, media_id, creado_en) select id, '4x5', 'publicada', (1000 + row_number() over ())::text, now() - (random() * 20 || ' days')::interval from public.eventos where termina > now() order by random() limit 40`);
await q("set session_replication_role = origin");
await q("analyze");
const cuenta = async (t) => (await q(`select count(*)::int n from ${t}`)).rows[0].n;
const tam = {};
for (const t of ["public.perfiles", "public.lugares", "public.artistas", "public.eventos", "public.eventos_artistas", "public.asistencias", "public.cuentas_vistas"]) tam[t.replace("public.", "")] = await cuenta(t);

// ---------- cronómetro ----------
const lunes = (await q(`select (date_trunc('week', now() at time zone 'America/Mexico_City'))::date d`)).rows[0].d.toISOString().slice(0, 10);
const LECTURAS = [
  ["mi_perfil (cada pantalla, dos veces)", "select public.mi_perfil()"],
  ["panel_resumen (portada: números)", "select public.panel_resumen()"],
  ["panel_pendientes (portada: Pendiente)", "select * from public.panel_pendientes()"],
  ["panel_aportes (portada: Voy y Me interesa)", "select public.panel_aportes()"],
  ["panel_ciudades (portada: Ciudades y Rutinas)", "select public.panel_ciudades()"],
  ["instagram_falta_material (portada: «N sin material»)", `select * from public.instagram_falta_material('san-luis-potosi', '${lunes}')`],
  ["instagram_sugerencias 7 días (Instagram: Eventos)", "select * from public.instagram_sugerencias('san-luis-potosi', 7)"],
  ["instagram_sugerencias 14 días (Instagram: Semana)", "select * from public.instagram_sugerencias('san-luis-potosi', 14)"],
  ["panel_comunidad (hoja «Todos los números»)", "select public.panel_comunidad()"],
  ["contar publicadas 7 días (portada: Instagram)", "select count(*) from public.instagram_publicaciones where estado = 'publicada' and creado_en >= now() - interval '7 days'"],
  ["Inicio: eventos por venir de la ciudad (referencia)", "select id, titulo, inicio, imagen from public.eventos where visible and termina >= now() and ciudad = 'San Luis Potosí' order by inicio limit 200"],
];
const resultado = { factor: F, tam, lecturas: [] };
await q(`select set_config('request.jwt.claim.sub', '${ADMIN}', false)`);
await q("set role authenticated");
for (const [nombre, sql] of LECTURAS) {
  const t = [];
  let error = null;
  for (let i = 0; i < 9; i++) {
    const t0 = performance.now();
    try {
      await q(sql);
    } catch (e) {
      error = e.message.slice(0, 120);
      break;
    }
    t.push(performance.now() - t0);
    if (t.reduce((a, b) => a + b, 0) > 10000) break; // lo lento: con tres vueltas basta
  }
  t.sort((a, b) => a - b);
  resultado.lecturas.push({ nombre, mediana: t.length ? +t[Math.floor(t.length / 2)].toFixed(1) : null, max: t.length ? +t.at(-1).toFixed(1) : null, error });
}
await q("reset role");
console.log(JSON.stringify(resultado, null, 1));
await c.end();
