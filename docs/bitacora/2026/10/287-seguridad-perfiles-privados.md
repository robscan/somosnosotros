# 287 · Preferencias de perfiles privadas (OL-260 / H03)

**Fecha:** 2026-10-03. **Estado:** paso A listo para revisión; cierre de permisos pendiente del paso B.
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
