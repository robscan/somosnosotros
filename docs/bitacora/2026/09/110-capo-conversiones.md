# 110 · Invitaciones CAPO y fichas vinculadas

**Fecha:** 2026-09-18 · **Rama:** `codex/capo-conversiones` · **OL-076**

## Pedido y coordinación
El founder autorizó avanzar con la relación entre invitaciones y fichas reclamadas, coordinando con la tarea de Codex «Analiza el proyecto y propone». Gestión reservó esta bitácora y OL-076, y autorizó el diagnóstico en un worktree aislado desde `origin/main` `8f30d918593ab3a5820ad1e5d865ba3ff28f6230`. La migración, implementación y publicación quedan pendientes de la revisión del contrato. No se modificaron envíos, webhook, configuración ni producción en esta pieza.

## Evidencia disponible
- `invitaciones_enviadas`: artista y fecha de envío. Puede tener más de una fila por artista; agrupar por el primer envío. Un registro prueba envío, no entrega.
- `artistas.origen`: permite limitar la cohorte a CAPO. Incluir artistas ocultos que todavía existen, para no sesgar por visibilidad.
- `reportes`: `tipo=artista`, `motivo=es_mio`, fecha, ficha y solicitante. `retirar` no es una reclamación. `atendido=true` no demuestra que la ficha se haya asignado: también se cierra al dejarla u ocultarla.
- `artistas_cuentas`: vínculo actual entre artista y cuenta, con fecha. La acción de pasar una ficha crea el vínculo y cambia el autor, pero un vínculo por sí solo no prueba aprobación de una solicitud específica.

## Contrato propuesto, no implementado
Una función `panel_capo()` de solo lectura, sin parámetros, devuelve únicamente agregados JSON. `STABLE SECURITY DEFINER SET search_path=''`, nombres de tablas calificados, verificación interna de `public.es_admin()` y ejecución restringida a `authenticated` (sin acceso para usuarios no administradores). No abre políticas de lectura de contactos o invitaciones ni devuelve correo, resend_id o identificadores personales.

Cohorte: un artista CAPO conservado con al menos una invitación; `primer_envio = min(enviado_en)`. Los vínculos anteriores o iguales al primer envío se cuentan aparte. Los demás forman el denominador elegible. Usar `EXISTS` para no multiplicar artistas por solicitudes o cuentas.

Campos propuestos: `invitados`, `ya_vinculados_al_invitar`, `elegibles`, `solicitaron_despues`, `vinculados_despues`, `primer_envio`, `ultimo_envio`, `corte`. Solicitaron = existe solicitud `es_mio` posterior al primer envío; vinculados = existe vínculo actual posterior al primer envío. Ambos sobre elegibles y contados por artista distinto. Los dos resultados son independientes: no presentar un embudo que implique que todo vínculo pasó por una solicitud registrada. Porcentaje sin denominador: no disponible, nunca división entre cero.

## Límites que debe mostrar la pantalla
La secuencia temporal no prueba que el correo causó la reclamación. Las tandas recientes han tenido menos tiempo para responder. Esta es una foto de los registros conservados, no un histórico inmutable: borrar artistas elimina invitaciones y vínculos; borrar cuentas o desligarlas elimina vínculos; reportes no guarda la decisión ni su fecha. No reconstruir datos ausentes ni usar aperturas como conversiones.

Texto orientativo: «Solicitaron su ficha después de la invitación» y «Tienen una cuenta vinculada después de la invitación». Nota: «La fecha permite relacionar los pasos, pero no saber si el correo fue la causa. Se cuentan las fichas y vínculos que siguen registrados».

## Archivos previstos y validación
Componente nuevo `src/app/admin/CapoComoVa.tsx`; consulta aislada `src/app/admin/capo-consultas.ts`; tipos/cálculo en `src/lib/capo-metricas.ts` y sus pruebas; inserción pequeña en `src/app/admin/page.tsx`. Migración pendiente de nombre reservado por gestión y test en `supabase/tests`.

Probar invitaciones repetidas, varias cuentas o solicitudes por artista, retiro, artista no CAPO, solicitud anterior al envío, vínculo previo, vínculo sin solicitud, cero invitados y denegación a anónimo/usuario. No presentar errores de consulta como ceros. Antes de cerrar implementación: lint, tipos, pruebas, build y captura móvil. Este cierre es documental; todavía no hay implementación ni pruebas de funcionalidad.
