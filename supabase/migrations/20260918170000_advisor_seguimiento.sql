-- somosnosotros · migración 0038 · lo que queda del Security Advisor (OL-077, bitácora 121)
-- Codex ya cerró la mayor parte (bitácora 111, PR #104): los 49 warnings y 4 suggestions originales bajaron a
-- 0 errores, 25 warnings y 9 info en producción (rerun del panel del Advisor, verificado ahí mismo). Esta pieza
-- revisa qué queda, con una lectura de solo lectura (transacción `begin read only`) directa a producción hoy
-- (2026-09-18), y solo añade dos arreglos nuevos, ninguno de los dos cambia nada visible para la app:
--
--   1. Las funciones de `pg_net` (la extensión que hace peticiones HTTP desde Postgres, usada por las tareas de
--      avisos) tenían EXECUTE para `anon` y `authenticated` — el permiso por defecto que deja la instalación de la
--      extensión en Supabase, no algo que este proyecto haya concedido a propósito. Con eso, cualquier visita sin
--      sesión podía pedirle al servidor que hiciera una petición HTTP a la URL que quisiera (net.http_post/get/
--      delete), un riesgo de "server-side request forgery" que el Advisor no cubrió en su lista original pero que
--      sí es una de las comprobaciones que se le pidió repetir a esta pieza. Ninguna función propia del proyecto
--      llama a `net.*` desde una ruta de `anon`/`authenticated` (todas las tareas de avisos son `security definer`,
--      internas, sin EXECUTE para el cliente — ver la matriz de la bitácora 111): quitarles el permiso a `anon` y
--      `authenticated` no cambia nada de lo que la app hace hoy. `service_role` y el dueño de la base lo conservan.
--      La extensión en sí no se puede mover de schema (`pg_net` no es relocatable — comprobado en producción,
--      `extrelocatable = false`): el aviso "extensión en public" del Advisor, si aparece, no tiene arreglo posible
--      de este lado; sus funciones sí viven en su propio schema `net`, correctamente.
--   2. Diez claves foráneas sin un índice que empiece por su columna (`artistas.creado_por`,
--      `avisos_entregas.usuario_id`, `avisos_enviados.evento_id`, `avisos_jobs.actor`, `cambios_de_rol.por`,
--      `eventos.creado_por`, `lugares.creado_por`, `novedades.aviso_job_id`, `novedades.evento_id`,
--      `topes_de_lectura.cambiado_por`): el Advisor de rendimiento las señala porque un `on delete`/`on update`
--      o un filtro por esa columna hace un recorrido completo de la tabla. Solo añade índices; ninguna consulta
--      cambia de resultado.
--
-- Lo que queda del Advisor y NO se toca aquí, todo ya clasificado (bitácora 111, confirmado de nuevo hoy):
--   · Las 24 EXECUTE de SECURITY DEFINER restantes (5 `anon` + 19 `authenticated`, sobre funciones propias) son
--     contratos ya revisados uno por uno en la matriz de la bitácora 111: RPC del cliente, triggers y operaciones
--     administrativas que necesitan ese permiso para funcionar. No son 24 vulnerabilidades nuevas.
--   · Las 9 tablas sin política (`admin_correos`, `avisos_config`, `avisos_entregas`, `avisos_enviados`,
--     `avisos_jobs`, `avisos_origen`, `avisos_slots`, `contactos_importados`, `invitaciones_enviadas`) siguen
--     cerradas a propósito, con RLS activo y cero políticas: agregar una política pública para que el Advisor deje
--     de avisar sería peor, no mejor (abriría acceso que hoy no existe). No se toca.
--   · La protección contra contraseñas filtradas sigue apagada: hay 6 cuentas reales con contraseña en producción
--     (confirmado hoy en `auth.identities`, además de 4 con Google y 1 con Apple), así que no es un aviso
--     teórico. Es una decisión de founder/plan de Supabase, no algo que una migración pueda resolver.
--   · El bucket `fotos` sigue público. La política de lectura sobre `storage.objects` ya está bien acotada (propio
--     o administración; confirmado hoy, sin política amplia) — lo que queda es que un bucket público sirve
--     cualquier objeto por su URL sin pasar por esa política. Volverlo privado cambiaría comportamiento visible
--     (rompería URLs ya conocidas) y necesita el inventario y las pruebas reales de Storage que la bitácora 111 ya
--     pidió; queda pendiente de esa pieza aparte, no de esta.
--   · Cero vistas con `security_invoker` desactivado (no hay vistas en `public`) y cero políticas permisivas
--     duplicadas: nada que arreglar en esas dos categorías.
--
-- Sin datos nuevos, sin tocar Auth ni Storage, sin cambiar ninguna función existente. Banco nuevo en
-- supabase/tests/advisor_seguimiento.mjs.

-- ---------- pg_net: quitar el permiso por defecto de anon/authenticated ----------
-- Por nombre de función, no por lista fija de firmas: recorre lo que pg_depend diga que pertenece hoy a la
-- extensión pg_net (sus 12 funciones en producción al escribir esto) y no hace nada si la extensión no está
-- instalada — en el banco local de pruebas no lo está, y este bloque queda como no-operación ahí, sin error.
do $$
declare
  r record;
begin
  for r in
    select p.oid
    from pg_depend d
    join pg_proc p on p.oid = d.objid and d.classid = 'pg_proc'::regclass
    join pg_extension e on e.oid = d.refobjid
    where e.extname = 'pg_net' and d.deptype = 'e'
  loop
    execute format('revoke execute on function %s from anon, authenticated', r.oid::regprocedure);
  end loop;
end $$;

-- ---------- índices que faltan en claves foráneas ----------
create index if not exists artistas_creado_por_idx on public.artistas (creado_por);
create index if not exists avisos_entregas_usuario_id_idx on public.avisos_entregas (usuario_id);
create index if not exists avisos_enviados_evento_id_idx on public.avisos_enviados (evento_id);
create index if not exists avisos_jobs_actor_idx on public.avisos_jobs (actor);
create index if not exists cambios_de_rol_por_idx on public.cambios_de_rol (por);
create index if not exists eventos_creado_por_idx on public.eventos (creado_por);
create index if not exists lugares_creado_por_idx on public.lugares (creado_por);
create index if not exists novedades_aviso_job_id_idx on public.novedades (aviso_job_id);
create index if not exists novedades_evento_id_idx on public.novedades (evento_id);
create index if not exists topes_de_lectura_cambiado_por_idx on public.topes_de_lectura (cambiado_por);
