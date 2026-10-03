# 287 · Preferencias de perfiles privadas (OL-260 / H03)

**Fecha:** 2026-10-03. **Estado:** A/B aplicados y unidos; catálogo remoto verificado. Verificación final por API bloqueada por cuota de Supabase.
Operador Codex, sin subagentes. Reserva de Gestor de cambios III:
`seguridad-perfiles-privados`, base `f2dd8be9`, worktree propio. OL260/bit287,
`20261003150000_perfiles_privados.sql` (A) y
`20261003150100_perfiles_columnas_publicas.sql` (B). Numeración comprobada.
Autorización del founder: publicar al final de cada entrega probada.

## Problema y secuencia acordada

La API de perfiles permitía leer consentimientos, preferencias de avisos y la
última apertura de Novedades de otras personas, incluso de perfiles reservados.
No se demostró exposición de correo de Auth. La identidad pública y la reserva
actual de asistencia/seguimientos se conservan.

El gestor autorizó dos PR bajo esta pieza para evitar romper `usuarioActual`
durante la publicación: A añade las RPC privadas y publica todos sus consumidores;
solo tras comprobar A en Production, B revoca SELECT general y concede únicamente
`id, nombre, foto, colonia, bio, rol, reservado`. A por sí solo NO cierra H03.
Sin cambios a proveedores de acceso, diseño, ubicación, PR294/295 o iOS; sin
envíos reales ni cambios a preferencias de personas en producción.

## Paso A implementado

- `mi_perfil()` deriva el titular de `auth.uid()` y devuelve una lista explícita
  de identidad y preferencias propias. No recibe identificador ajeno, tampoco
  para administración. `usuarioActual` conserva claims verificados y exige que
  el id devuelto coincida con la sesión; errores cierran el acceso.
- `mi_push_activo(endpoint, token)` consulta consentimiento y dispositivo propio
  en una instantánea. Dispositivo ajeno/desconocido o dos identificadores: false.
  `activar_mis_avisos_push()` confirma únicamente consentimiento propio cuando
  ya hay dispositivo registrado. Web y APNs usan estas RPC sin lectura privada
  mediante embeds ni UPDATE RETURNING de preferencias.
- Las tres funciones son SECURITY DEFINER, con search_path vacío y ejecución
  exclusiva de authenticated; no amplían servicio ni acceso anónimo.
- `cargarPersona` y `PerfilPublico` solo leen identidad pública. La tabla y FK,
  RLS y escrituras propias existentes se mantienen; no hay backfill de datos.
- Fixture local adaptado para `mi_perfil`, sin acceso a producción.

## Inventario previo al cierre B

- Revisados `src` y `scripts`: ningún consumidor de perfiles usa `select *` ni
  `perfiles(*)`. Los embeds de autor, asistentes, bloqueos y Novedades usan
  nombre/foto/id. Administración de sesión consulta rol.
- Funciones invoker vigentes que leen perfiles: `panel_eventos` y
  `panel_fichas_conteos`, solo identidad/rol; probadas con anon y cuentas según
  sus grants. RLS de asistencia y seguimientos usa id/reservado/es_admin.
- Triggers: `tocar_actualizado_en` asigna NEW sin consultar preferencias;
  `crear_perfil`, `proteger_rol` y avisos administrativos son definer.
- `panel_persona` conserva comprobación admin y acceso definer autorizado.
  Worker y baja/webhook conservan su cliente service_role. No se encontró
  suscripción Realtime sobre perfiles en src/scripts.
- Pruebas de catálogo aseguran que funciones invoker y políticas que consultan
  perfiles no dependan de preferencias privadas.

## Evidencia del candidato A

Reproducción previa: 71 migraciones, 1124 comprobaciones, tres fallos por las RPC
inexistentes. Tras implementación: **72 migraciones y 1220 comprobaciones PG,
0 fallos**. Incluye ensayo reversible de los grants finales: anónimo, otra cuenta,
titular, administrador y servicio; denegación de columnas, filtros, orden,
composición de fila y columnas futuras. Lecturas públicas, ajustes propios,
push web/APNs, reserva, Novedades, paneles, autores y conteos conservados.

**1736 unitarias / 131 archivos**, tipos, inventario y build correctos. Lint sin
errores, un warning preexistente en VisorImagen.componentes.test.mjs:169.
43 pruebas focalizadas de sesión, consulta pública y acciones push correctas.
Logs locales en `/tmp/sn-ol260-evidencia/`; no se incorporan secretos ni dumps.

QA sobre `next build` + `next start`, backend sintético local:

| Captura | Comprobación visual |
| --- | --- |
| 287-01, Perfil 390×844 | Identidad, actividad, ajustes y navegación visibles; sin desbordes nuevos. |
| 287-02, Ajustes 390×844 | Preferencia de correo, reserva y cuenta legibles. Push deshabilitado por falta intencional de VAPID en el fixture. |
| 287-03, reserva 390×844 | Hoja y palanca cambian a Reservado; explicación y cierre visibles. |
| 287-04, ancho normal | Ajustes conserva columna central y navegación lateral. |

Capturas en `docs/rediseno/capturas-287/`. El fixture registra PATCH pero no
persiste preferencias: la recarga devuelve su semilla. La persistencia y
seguridad se verifican en PG real; no se atribuyen al simulador. Sin envíos push
ni pruebas de permisos del dispositivo. Safari físico pendiente del founder.

## Publicación y recuperación

1. Revisar A y CI, abrir ventana con gestor, aplicar solo 150000.
2. Publicar A y comprobar SHA de Production/dominio antes de B.
3. Preparar 150100, ejecutar suite PG con cierre real, revisar y aplicar B.
4. Verificar API pública permitida, preferencias denegadas y RPC privadas;
   registrar producción y cerrar OL con gestor.

No volver a una versión anterior a A tras aplicar B. Si B ocasiona una regresión,
corregir el consumidor o revertir B con revisión del gestor; reabrir SELECT general
reintroduciría H03 y no debe hacerse silenciosamente. A es aditiva y no modifica
ningún dato existente.

## Paso A publicado; paso B entregado

El gestor aceptó `3291bc6e` sin bloqueos y cedió ventana tras CI verde.
PR [300](https://github.com/robscan/somosnosotros/pull/300), CI37158316459 correcto.
Dry-run listó solo 150000; aplicada correctamente. Merge `d6f7f640` a las
22:29 UTC; Production6833898801 de ese SHA en success a las 22:30 UTC.
Dominio: Inicio, Entrar y estado HTTP200. Ajustes sin sesión redirige a Entrar
con retorno a Ajustes, comprobado en navegador. No había sesión real disponible:
el acceso autenticado se probó en build sintético y contratos PG, no se simuló una
firma del founder ni se inició un acceso nuevo. RPC anónima 401/42501. En A las
columnas privadas todavía respondían 200 con limit=0, como corresponde a la
transición: ninguna fila privada fue leída en esa comprobación.

Paso B añade exclusivamente `20261003150100_perfiles_columnas_publicas.sql`:
revoca SELECT de tabla y todos los grants previos por columna a PUBLIC/anon/
authenticated; permite solo las siete columnas públicas y recarga PostgREST.
No cambia filas, FK, políticas de escritura ni permisos de servicio.

Suite PG completa con **73 migraciones y 1226 comprobaciones, cero fallos**:
todos los consumidores se ejecutan ahora con el cierre real aplicado. Se añade
aserción inicial del conjunto exacto de columnas legibles y denegación de
preferencias antes del ensayo reversible. Evidencia JS/build/QA reutilizada de A
porque B no cambia aplicación. CI obligatorio de PR vuelve a ejecutar sus checks.
Pendiente: revisión del gestor, ventana de B, dry-run solo 150100, aplicación,
verificación remota y cierre. H03 aún no se declara cerrado en producción.

## Paso B aplicado; incidencia de proveedor

PR [301](https://github.com/robscan/somosnosotros/pull/301), candidato `aafb49f3`,
aceptado por el gestor; CI37158837447 verde (4m14s). Dry-run listó únicamente
150100 y su aplicación terminó correctamente. Inmediatamente después, la API
respondió **HTTP402** tanto a identidad pública con limit=0 como a consulta
privada e invocación anónima de RPC. Mensaje del proveedor:
`exceed_cached_egress_quota`. `/api/estado` devuelve HTTP200 con
`supabase:error` y detalle «Supabase respondió 402»; HTTP200 de la página no
acredita servicio saludable. No se atribuye este 402 a los grants SQL.

Gestor de cambios III comprobó de forma independiente por conexión directa:

- migraciones aplicadas hasta150100;
- sin SELECT general en perfiles para PUBLIC, anon ni authenticated;
- SELECT de columna exclusivamente bio, colonia, foto, id, nombre, reservado y rol;
- las tres RPC privadas ejecutables solo por authenticated.

El gestor ordenó unir B para conciliar el repo con la base, conservar el cierre
de privacidad y dejar pendiente la comprobación por API hasta levantar la
restricción. Merge `2fa4a95a` a las22:41 UTC. No se modificaron facturación, plan,
tope de gasto, datos personales ni preferencias reales. No se reabrieron permisos.

**Responsables y salida:** founder decide cómo resolver la cuota en Supabase;
el gestor coordina la incidencia. Operador, tras restablecerse el servicio,
comprueba identidad pública200, preferencias y filtros privados42501, RPC
anónima42501, Inicio/ficha de persona/Entrar y Ajustes, y concilia con gestor.
No se declara H03 cerrado de punta a punta; Safari físico sigue pendiente.
Por instrucción del gestor, no abrir otra pieza mientras dure la incidencia.
Servidores locales de QA y PostgreSQL temporal detenidos; worktree sin cambios
ajenos. No se instaló vigilancia ni se prometió seguimiento automático.

Production6834000749 del SHA2fa4a95a figura success a las22:41:43 UTC. Esto acredita
el despliegue, no la recuperación de Supabase; el bloqueo402 sigue separado.
