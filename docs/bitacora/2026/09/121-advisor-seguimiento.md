# 121 · Lo que queda del Security Advisor

**Fecha:** 2026-09-18 · **Rama:** `advisor-seguimiento`, desde `origin/main` 787e710 · **OL:** OL-077 (continúa, no abre otra) · **PR:** pendiente

## De dónde sale

Gestión de cambios (sesión que retoma tras Codex) asigna esta pieza: Codex ya cerró la mayor parte del Security Advisor (bitácora [111](111-security-advisor.md), [PR #104](https://github.com/robscan/somosnosotros/pull/104)) — los 49 warnings y 4 suggestions originales bajaron a 0 errores, 25 warnings y 9 info, verificado en el propio panel del Advisor tras el despliegue. Encargo: leer el estado actual de producción, solo lectura, clasificar cada hallazgo que quede (arreglable por migración, aceptado a propósito, o que exige acción del founder), arreglar lo arreglable sin cambiar comportamiento visible, y no aplicar la migración — la revisa y la aplica gestión de cambios.

## Lectura de producción (solo lectura)

Transacción `begin read only` contra `POSTGRES_URL_NON_POOLING` (de `.env`, nunca impresa), replicando las comprobaciones del Advisor: funciones sin `search_path` fijo, EXECUTE de `SECURITY DEFINER` para `anon`/`authenticated`, tablas con RLS sin políticas, vistas con semántica definer, extensiones en `public`, políticas permisivas duplicadas, índices faltantes en claves foráneas, y proveedores de `auth.identities`.

- **search_path:** las 67 funciones propias de `public` (sin contar las de extensiones) tienen `search_path=""` fijado. 0 sin fijar — confirma el endurecimiento de la bitácora 111, sin drift.
- **EXECUTE de SECURITY DEFINER:** 5 para `anon` + 19 para `authenticated` = 24, coincide exactamente con los "25 warnings" del rerun (24 + 1 de contraseñas). Todas sobre funciones ya documentadas una por una en la matriz de la bitácora 111 (RPC del cliente, triggers, operaciones administrativas). No se volvió a auditar cada una — sería repetir esa matriz sin necesidad — solo se confirmó que la cuenta agregada no cambió.
- **Tablas sin política:** 9 — `admin_correos`, `avisos_config`, `avisos_entregas`, `avisos_enviados`, `avisos_jobs`, `avisos_origen`, `avisos_slots`, `contactos_importados`, `invitaciones_enviadas`. Todas con RLS activo y cero políticas, cerradas a propósito (coincide con los "9 info"). 0 tablas con RLS deshabilitado del todo (peor que "sin políticas").
- **Vistas:** 0 en `public`. Nada que revisar en "security definer view".
- **Políticas permisivas duplicadas:** 0.
- **Storage:** el bucket `fotos` sigue público (`public = true`). Sus 4 políticas sobre `storage.objects` ya están bien acotadas — SELECT es "propio o administración", no el listado amplio que describía el hallazgo original. Lo que queda es inherente a un bucket público: cualquier objeto se sirve por su URL sin pasar por esas políticas. Cambiar eso rompería URLs ya conocidas (comportamiento visible) y necesita el inventario/migración de objetos que la bitácora 111 ya pidió como pieza aparte — no se toca aquí.
- **Extensiones en `public`:** `pg_net` (la que hace peticiones HTTP desde Postgres). Comprobado: `extrelocatable = false` — no se puede mover de schema con `ALTER EXTENSION ... SET SCHEMA`, intentarlo fallaría. Sus 12 funciones sí viven correctamente en su propio schema `net`, no en `public`; solo el registro de la extensión aparece en `public`. Sin arreglo posible de este lado.
- **Hallazgo nuevo, fuera de la lista de 25/9:** esas 12 funciones de `pg_net` tenían EXECUTE para `anon` **y** `authenticated` — el permiso por defecto que deja la instalación de la extensión en Supabase, no algo que las migraciones de este proyecto hayan concedido. Con eso, cualquier visita sin sesión podía pedirle al servidor que hiciera una petición HTTP (`net.http_get`/`http_post`/`http_delete`) a la URL que quisiera — un riesgo de *server-side request forgery*. No apareció en el inventario original de Codex (su consulta, como la primera versión de la mía, excluye por diseño las funciones que pertenecen a una extensión), pero sí es una de las comprobaciones que pidió repetir gestión de cambios ("extensiones en public... etc.").
- **Índices faltantes en claves foráneas:** 10 — `artistas.creado_por`, `avisos_entregas.usuario_id`, `avisos_enviados.evento_id`, `avisos_jobs.actor`, `cambios_de_rol.por`, `eventos.creado_por`, `lugares.creado_por`, `novedades.aviso_job_id`, `novedades.evento_id`, `topes_de_lectura.cambiado_por`.
- **auth.identities:** 6 `email`, 4 `google`, 1 `apple`. Los 6 `email` son cuentas reales con contraseña (coincide con lo que dice la bitácora 114) — la protección contra contraseñas filtradas no es un aviso teórico.

## Clasificación

| Hallazgo | Clasificación |
|---|---|
| 24 EXECUTE de SECURITY DEFINER (5 anon + 19 authenticated) | Aceptado a propósito — matriz de la bitácora 111, contratos ya revisados |
| 9 tablas sin política | Aceptado a propósito — cerradas al cliente por diseño; una política pública sería peor |
| Protección de contraseñas filtradas | Acción del founder — decisión de plan/Auth de Supabase, no arreglable por migración |
| Bucket `fotos` público | Pendiente, pieza aparte — cambiarlo rompe comportamiento visible (URLs conocidas); necesita inventario y pruebas reales de Storage |
| `pg_net` extensión en `public` | No arreglable — `extrelocatable = false`, comprobado |
| **`pg_net` EXECUTE para anon/authenticated** | **Arreglado en esta migración** |
| **10 índices faltantes en claves foráneas** | **Arreglado en esta migración** |

## Qué se hizo

- **`20260918170000_advisor_seguimiento.sql`** (fecha de hoy, no la que sugirió gestión de cambios para mañana — se escribió hoy, así que ordena correctamente después de la última migración del día; si prefieren otro nombre, se renombra):
  - Un bloque `do $$ ... $$` que recorre `pg_depend`/`pg_extension` para encontrar las funciones que pertenecen HOY a `pg_net` (por nombre, no una lista fija de firmas) y les revoca EXECUTE a `anon`/`authenticated`. `service_role` y el dueño de la base lo conservan. Si `pg_net` no está instalada (como en el banco local de pruebas), el bloque no encuentra filas y no hace nada — no falla.
  - Diez `create index if not exists`, uno por cada clave foránea sin índice.
  - Ningún dato nuevo, ninguna función existente tocada, sin cambios a Auth ni a Storage.
- **`supabase/tests/pg/advisor-seguimiento.test.mjs`** (banco nuevo, patrón de `security-advisor.test.mjs`): confirma que los diez índices existen y arrancan por la columna correcta; si `pg_net` está instalada, confirma que ninguno de sus roles cliente tiene EXECUTE y que `service_role` sí; si no está instalada (el caso local), lo dice y no falla; confirma que ninguna función propia con EXECUTE de cliente menciona `net.http` en su código fuente — la prueba de que revocar `pg_net` no cambia nada visible.
  - Nota técnica: la primera versión de esa última comprobación usaba `pg_get_functiondef(p.oid) ilike '%net.http%'` en el `WHERE`, y esa combinación específica (con `NOT EXISTS` y `ilike`) hacía que Postgres tirara `"array_agg" is an aggregate function" en el servidor local compartido — reproducido también con `psql` y con `pg` de Node, cada función por separado no falla, así que es de la forma de la consulta, no de ningún cuerpo de función. Cambiado a `p.prosrc ilike '%net.http%'` (la columna de código fuente, sin pasar por el regenerador de DDL) y desaparece.

## Verificación

- `TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55439/postgres PGPASSFILE=/dev/null npm run test:db`: 43 migraciones, **671 pruebas, 0 fallaron** (incluye las 13 nuevas de esta pieza y las que ya existían, sin ninguna rota).
- **Control negativo** (a mano, sin comitear): se quitó una de las diez líneas `create index` de la migración, se corrió el banco de nuevo y fallaron exactamente 2 comprobaciones (el índice específico y el conteo de "diez, ni uno más"); restaurada la migración desde respaldo, confirmada idéntica byte a byte, y el banco vuelve a sus 671 en verde.
- `npm run lint && npm run typecheck && npm test`: verdes, **679 pruebas de vitest** (sin cambios en `src/`, es solo SQL y su banco).
- La lectura de producción usó una transacción de solo lectura; no se imprimió ninguna llave ni URL en ningún resultado (verificado con `grep` sobre cada salida antes de leerla).

Sin captura móvil: esta pieza no cambia ninguna pantalla — no aplica `front-visual`.

## Pendiente

- Mandar el hash a gestión de cambios con esta clasificación; ellos revisan y aplican la migración.
- Cuando se aplique, volver a correr el Advisor en producción para confirmar que baja de 25 a ~24 warnings (se resta el de `pg_net`, si el panel lo contaba aparte) y que el aviso de rendimiento de los índices desaparece.
- Founder/gestión de cambios: decidir sobre la protección de contraseñas filtradas (plan de Supabase) y sobre el bucket `fotos` público (pieza aparte, con inventario y pruebas reales de Storage).
