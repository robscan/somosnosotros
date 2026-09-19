-- somosnosotros · migración 0038 · lo que queda del Security Advisor (OL-077, bitácora 121)
-- Codex ya cerró la mayor parte (bitácora 111, PR #104): los 49 warnings y 4 suggestions originales bajaron a
-- 0 errores, 25 warnings y 9 info en producción (rerun del panel del Advisor, verificado ahí mismo). Esta pieza
-- revisa qué queda, con una lectura de solo lectura (transacción `begin read only`) directa a producción hoy
-- (2026-09-18). Solo añade un arreglo, que no cambia nada visible para la app:
--
--   Diez claves foráneas sin un índice que empiece por su columna (`artistas.creado_por`,
--   `avisos_entregas.usuario_id`, `avisos_enviados.evento_id`, `avisos_jobs.actor`, `cambios_de_rol.por`,
--   `eventos.creado_por`, `lugares.creado_por`, `novedades.aviso_job_id`, `novedades.evento_id`,
--   `topes_de_lectura.cambiado_por`): el Advisor de rendimiento las señala porque un `on delete`/`on update`
--   o un filtro por esa columna hace un recorrido completo de la tabla. Solo añade índices; ninguna consulta
--   cambia de resultado.
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
--   · `pg_net` (la extensión que hace peticiones HTTP desde Postgres) aparece en `public`, pero no es de este
--     proyecto ni tiene arreglo posible de este lado: sus 12 funciones son de `supabase_admin` (superusuario),
--     con ACL nula — es decir, EXECUTE por defecto a PUBLIC, no algo que este proyecto haya concedido; una
--     migración que corre como `postgres` (ni dueño ni superusuario ni con opción de conceder sobre esas firmas)
--     no puede revocarlo, ni a `anon`/`authenticated` ni a PUBLIC — se intentó y no hizo nada. Tampoco hay riesgo
--     real desde fuera: la API de PostgREST no expone el esquema `net` (comprobado en producción: un POST a
--     `rpc/http_post` con `Content-Profile: net` y la llave anónima responde 406), ninguna función propia de
--     `public` llama a `net.*` (0 filas) y las tareas de avisos corren como `postgres`. `pg_net` tampoco se puede
--     reubicar de schema (`extrelocatable = false`, comprobado). Aceptado con evidencia, no arreglado.
--
-- Sin datos nuevos, sin tocar Auth ni Storage, sin cambiar ninguna función existente. Banco nuevo en
-- supabase/tests/pg/advisor-seguimiento.test.mjs.

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
