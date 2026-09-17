# 090 · Cómo va la comunidad: prototipo para firma, funciones y pruebas (OL-060)

**Fecha:** 2026-09-17 (madrugada) · **Rama:** `panel-como-va`, desde `origin/main` cd98722 (con `panel-mas-datos` ya mezclado, [PR #89](https://github.com/robscan/somosnosotros/pull/89)) · **Pieza:** OL-060, opción A del documento [21](../../../rediseno/21-administracion-mas-datos.md), firmada por el founder («A») el 2026-09-17. Solo commit local, sin push. Migración por aplicar (la revisa y la aplica gestión de cambios).

## Qué pidió gestión de cambios

Con la firma del founder, dio rama, bitácora, mismo OL-060 y el nombre de la migración (`20260917150000_panel_como_va.sql`, solo funciones, sin tablas ni columnas nuevas). Orden de trabajo: primero un prototipo de la pantalla «Cómo va la comunidad» para la firma del founder (en `docs/rediseno/prototipos`, con `front-visual`, captura a 390×844); mientras se firma, escribir las funciones y sus pruebas; **el código de la pantalla espera la firma**. Condiciones: funciones `security definer` con `set search_path`, que comprueban `es_admin()`; `revoke all … from public, anon`; `grant execute … to authenticated`; los administradores no cuentan (N2); no tocar `/api/recordatorios` ni `guardar_indicadores()`; pruebas con PGlite, con control negativo (quien no es administrador no recibe nada; los administradores no suman).

## Qué se hizo

- **Prototipo** en [prototipos/panel-como-va.html](../../../rediseno/prototipos/panel-como-va.html), publicado para el iPhone en https://claude.ai/artifact/D7sKbWe65gVCE4PxoAwS5C, con la disciplina `front-visual` (RENDER → MIRAR el frame completo → describir → medir): la sección nueva se agrega a la Administración que ya existe, entre «Últimos 7 días» y «Gestionar» (marcada de color solo en el prototipo, para que se note dónde va), sin tocar el resto de la pantalla.
  - Un embudo de tres pasos (se registraron → hicieron algo en su primera semana → siguen volviendo después), con una barra de proporción por paso, mismo lenguaje visual que los indicadores existentes.
  - Dos estados: uno con algo de historia (números de ejemplo) y uno con la escala real de hoy, donde «siguen volviendo» sale atenuado con un guion — muy pocos días de vida para decir algo ahí todavía, y lo dice.
  - Una nota bajo el embudo explicando el límite de `cuentas_vistas` (recién empezó a guardarse).
  - Enlace «Ver las personas» hacia la lista que ya existe, en vez de repetirla.
  - Dos preguntas abiertas para el founder, al final: si "siguen volviendo" se entiende bien tal como está descrito, y si 30 días es la ventana correcta.
  - Verificado mirando el frame completo en el navegador integrado (dos estados, 390 px de ancho cada uno): sin recortes, sin filas rotas, la nota y el enlace caben, `Gestionar` sigue igual debajo.
- **Migración `20260917150000_panel_como_va.sql`:** una sola función, `panel_comunidad()`, de solo lectura sobre columnas que ya existen (`perfiles.creado_en`, `asistencias`, `seguimientos`, quién publicó un lugar/evento/artista, `cuentas_vistas`, `auth.users.last_sign_in_at`). Sin tabla ni columna nueva.
  - `registradas`: cuentas no administradoras creadas en los últimos 30 días.
  - `hicieron_algo`: de esas, cuántas tienen un Voy, Me interesa, seguimiento o publicación propia antes de que pasara su primera semana.
  - `vuelven_base` y `vuelven`: de las que ya llevan más de 7 días de vida, cuántas tienen una fila de `cuentas_vistas` o un inicio de sesión real posterior a esa primera semana — el proxy de retención que describe el documento 21, con su límite dicho tal cual (no es una curva de retención completa).
  - `security definer`, `set search_path = public`, comprueba `es_admin()`; `revoke all … from public, anon`; `grant execute … to authenticated`.
- **Pruebas** en `supabase/tests/panel_como_va.mjs` (mismo patrón que `panel_administracion.mjs`, PGlite con todas las migraciones del repo): 7 cuentas de edades y actividad distintas — una administradora activa (no debe sumar, N2), una recién nacida (cuenta en el embudo pero no en «vuelven», muy joven), tres con más de 7 días con cada combinación (hizo algo y volvió por sesión real; no hizo nada y volvió solo por `cuentas_vistas`; no hizo nada y no volvió; publicó un lugar propio como su "hizo algo"), y una fuera de la ventana de 30 días pese a estar muy activa. **7 comprobaciones en verde.**

## Verificación

- `PGLITE=… node supabase/tests/panel_como_va.mjs`: 33 migraciones, 7 comprobaciones en verde.
- `PGLITE=… node supabase/tests/panel_administracion.mjs`: sigue en 95 comprobaciones en verde con la migración nueva aplicada (no rompe nada existente).
- `npm run lint && npm run typecheck && npm test`: verdes (sin cambios en `src/` todavía; 319 pruebas, el mismo total que trae la rama desde `panel-mas-datos`).
- Prototipo mirado en el navegador integrado a 390 px, ambos estados, con `front-visual`.

## Firma

El founder contestó **«firmo, adelante en coordinación con el gestor»** en el chat (2026-09-17). Sin cambios pedidos a las dos preguntas abiertas del prototipo (el proxy de "siguen volviendo" y la ventana de 30 días quedan como están).

## Revisión de la migración por gestión de cambios

Aprobada la lógica (solo lectura, sin tablas ni columnas; `security definer` con `set search_path`; `es_admin()`; `revoke`/`grant`; administradores fuera de los conteos; `auth.users` solo para `last_sign_in_at`; las pruebas cubren anónimo, cuenta sin permiso y el embudo con cuentas de distintas edades). Dos ajustes menores, aplicados:
- `create function` → `create or replace function` (como el resto de las funciones del repo, para que reaplicar la migración no falle).
- Comentario nuevo junto a `volvio`: `cuentas_vistas.dia` guarda el día en la zona de la ciudad (`marcar_visto`), y aquí se compara convirtiéndola a la zona del servidor (UTC) — en el borde del día puede contar unas horas de más o de menos. No se cambió la lógica, solo se dijo el matiz; no vale la pena resolverlo para un proxy.

**Control negativo pedido por gestión de cambios** (a mano, sin comitear): se quitó el `if not public.es_admin() then raise exception …` de una copia de la función, se corrió `supabase/tests/panel_como_va.mjs` y falló donde debía — "una cuenta que no es administradora no ejecuta panel_comunidad", 1 de 7 comprobaciones, código de salida 1 —, confirmando que la prueba sí detecta la guarda ausente. Restaurada la versión buena desde un respaldo y confirmado idéntica (`diff` limpio); las dos pruebas PGlite vuelven a pasar completas (7/7 y 95/95).

También se corrigió una pérdida propia en `OPEN_LOOPS.md`: la resolución anterior había sustituido la entrada OL-060 completa de `origin/main` (1333 caracteres, con la tabla de 7 preguntas y las tres opciones) por un resumen más corto. Gestión de cambios lo notó por el tamaño. Rehecho partiendo del párrafo de `origin/main` tal cual (verificado byte a byte) y cambiando solo el sub-renglón final, que sí estaba desactualizado.

## Pendiente

- Escribir la pantalla en `src/app/admin/page.tsx` (o donde corresponda) llamando a `panel_comunidad()`: solo `/admin`, con `front-visual`, capturas a 390×844, sin tocar `/api/recordatorios` ni `guardar_indicadores()`.
- Mandar el hash final a gestión de cambios para que aplique la migración.
