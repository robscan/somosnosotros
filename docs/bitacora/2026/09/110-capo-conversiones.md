# 110 · Invitaciones CAPO y fichas vinculadas

**Fecha:** 2026-09-18 · **Rama:** `codex/capo-conversiones` · **OL-076**

## Pedido y coordinación
El founder autorizó avanzar con la relación entre invitaciones y fichas reclamadas, coordinando con la tarea de Codex «Analiza el proyecto y propone». Gestión reservó esta bitácora y OL-076, y autorizó el diagnóstico en un worktree aislado desde `origin/main` `8f30d918593ab3a5820ad1e5d865ba3ff28f6230`. Gestión aprobó después el contrato y reservó `20260918120000_capo_conversiones.sql`; implementación local autorizada, publicación pendiente. No se modificaron envíos, webhook, configuración ni producción en esta pieza.

## Evidencia disponible
- `invitaciones_enviadas`: artista y fecha de envío. Puede tener más de una fila por artista; agrupar por el primer envío. Un registro prueba envío, no entrega.
- `artistas.origen`: permite limitar la cohorte a CAPO. Incluir artistas ocultos que todavía existen, para no sesgar por visibilidad.
- `reportes`: `tipo=artista`, `motivo=es_mio`, fecha, ficha y solicitante. `retirar` no es una reclamación. `atendido=true` no demuestra que la ficha se haya asignado: también se cierra al dejarla u ocultarla.
- `artistas_cuentas`: vínculo actual entre artista y cuenta, con fecha. La acción de pasar una ficha crea el vínculo y cambia el autor, pero un vínculo por sí solo no prueba aprobación de una solicitud específica.

## Contrato aprobado e implementado localmente
Una función `panel_capo()` de solo lectura, sin parámetros, devuelve únicamente agregados JSON. `STABLE SECURITY DEFINER SET search_path=''`, nombres de tablas calificados, verificación interna de `public.es_admin()` y ejecución restringida a `authenticated` (sin acceso para usuarios no administradores). No abre políticas de lectura de contactos o invitaciones ni devuelve correo, resend_id o identificadores personales.

Cohorte: un artista CAPO conservado con al menos una invitación; `primer_envio = min(enviado_en)`. Los vínculos anteriores o iguales al primer envío se cuentan aparte. Los demás forman el denominador elegible. Usar `EXISTS` para no multiplicar artistas por solicitudes o cuentas.

Campos propuestos: `invitados`, `ya_vinculados_al_invitar`, `elegibles`, `solicitaron_despues`, `vinculados_despues`, `primer_envio`, `ultimo_envio`, `corte`. Solicitaron = existe solicitud `es_mio` posterior al primer envío; vinculados = existe vínculo actual posterior al primer envío. Ambos sobre elegibles y contados por artista distinto. Los dos resultados son independientes: no presentar un embudo que implique que todo vínculo pasó por una solicitud registrada. Porcentaje sin denominador: no disponible, nunca división entre cero.

## Límites que debe mostrar la pantalla
La secuencia temporal no prueba que el correo causó la reclamación. Las tandas recientes han tenido menos tiempo para responder. Esta es una foto de los registros conservados, no un histórico inmutable: borrar artistas elimina invitaciones y vínculos; borrar cuentas o desligarlas elimina vínculos; reportes no guarda la decisión ni su fecha. No reconstruir datos ausentes ni usar aperturas como conversiones.

Texto orientativo: «Solicitaron su ficha después de la invitación» y «Tienen una cuenta vinculada después de la invitación». Nota: «La fecha permite relacionar los pasos, pero no saber si el correo fue la causa. Se cuentan las fichas y vínculos que siguen registrados».

## Archivos previstos y validación
Componente nuevo `src/app/admin/CapoComoVa.tsx`; consulta aislada `src/app/admin/capo-consultas.ts`; tipos/cálculo en `src/lib/capo-metricas.ts` y sus pruebas; inserción pequeña en `src/app/admin/page.tsx`. Migración pendiente de nombre reservado por gestión y test en `supabase/tests`.

Probar invitaciones repetidas, varias cuentas o solicitudes por artista, retiro, artista no CAPO, solicitud anterior al envío, vínculo previo, vínculo sin solicitud, cero invitados y denegación a anónimo/usuario. No presentar errores de consulta como ceros. Antes de cerrar implementación: lint, tipos, pruebas, build y captura móvil. Este cierre es documental; todavía no hay implementación ni pruebas de funcionalidad.

## Implementación y evidencia de cierre
- Nueva RPC `panel_capo()`: exige `auth.uid()` y `es_admin()` antes de consultar; deniega con 42501; `STABLE SECURITY DEFINER`, search_path vacío, sin permisos PUBLIC/anon. La lectura directa de invitaciones permanece cerrada incluso para un admin autenticado. Incluye únicamente fechas y conteos; descarta fechas futuras respecto al corte de lectura.
- Bloque «Invitaciones CAPO» en `/admin`, después de comunidad. Mantiene solicitudes y vínculos como cifras independientes, muestra su denominador y ofrece «Cómo se cuenta» para los límites. Sin cambios a `ComunidadComoVa`, a la plantilla de invitaciones, al webhook ni a las acciones de reclamar/aprobar.
- Consulta con cliente de sesión, sin service_role, validación estricta del contrato y estado de error con «Intentar de nuevo». La ausencia de datos es distinta del fallo. Sin porcentaje cuando el denominador es cero.
- Base de verificación incorporada desde `codex/base-verificacion` (95e5ba2, merge 4123973). Se conservaron ambas historias de OPEN_LOOPS. Ninguna otra pieza incorporada.
- PostgreSQL 17 en clúster efímero propio, loopback 55479: **34 migraciones, 34 comprobaciones, 0 fallos**. La prueba CAPO aísla y limpia sus fixtures. Cubre anon/usuario/admin, authenticated sin uid, propietario sin uid, lectura directa cerrada, contactos no expuestos, duplicados, varios vínculos, retiro, solicitud anterior/igual/posterior, vínculo anterior/igual/posterior, artista oculto/no CAPO/sin invitación y fechas futuras.
- `npm run typecheck` y `npm run build`: correctos; la ruta QA no figura en el build final. Build ejecutado sin credenciales de producción.
- Vitest: **394 pruebas, 44 archivos, todos pasan**. Incluye validación, porcentajes, fechas y errores de la consulta. Lint: 0 errores y el warning preexistente de `docs/diseno/logotipo/iconos-sn.mjs:57`.
- Revisión visual con `front-visual`: capturas completas inspeccionadas en esta tarea mediante el navegador Codex, móvil 390×844 (normal, vacío, fallo, denominador cero) y escritorio 1280×900. Tarjeta alineada, cifras y notas completas, sin recortes horizontales; error y vacío distintos. Se renderizó el componente real con fixtures sintéticos (45/8/3: **no son resultados de producción**), en una ruta temporal exclusivamente local que fue retirada antes del build. No se probó una sesión admin completa contra producción.
- Se retiraron la ruta QA y el bloque que `next dev` añadió automáticamente a CLAUDE.md; no quedan cambios a decisiones. La caché de tipos que todavía referenciaba QA se regeneró para la validación final.

La migración no se aplicó remotamente. Se entrega al gestor para revisar/integrar **después de `20260918110000_evento_atomico.sql`**, aplicar con aprobación del founder y desplegar en ese orden. No se hizo push, merge en main ni despliegue.
