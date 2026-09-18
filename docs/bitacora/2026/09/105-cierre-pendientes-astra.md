# 105 - Cierre de pendientes y recorridos confiables

Fecha: 2026-09-18. OL-074. Rama: `codex/cierre-pendientes`.

## Objetivo aceptado

El founder precisa que la primera etapa termina con los ajustes en produccion
y probados en su dispositivo. Los commits locales no cierran el objetivo.
Primero cerrar pendientes y hacer confiables los recorridos existentes;
el rediseno general queda para una segunda etapa.

## Coordinacion

- Este chat actua como gestor Astra. Revision independiente Astra y conciliacion
  Terra, como maximo dos operadores al inicio.
- Main y worktrees de Claude se conservan. La modificacion encontrada en la
  bitacora 056 de main es ajena a esta tarea y no se toca.
- Se recuperan selectivamente los archivos de cuotas e indicadores, incluyendo
  los cambios sin commit de Claude. No se arrastran versiones viejas de login,
  navegacion o historial, ni el conflicto de OPEN_LOOPS.
- Esta rama parte de codex/push-seguro. Migraciones en orden: cuotas 17160000,
  indicadores 17170000 y push 18100000. Ninguna aplicada remotamente todavia.
- Reservado OL-074 y bitacora 105 tras comprobar el script del proyecto.

## Pendiente de verificar

- Revision independiente de OL-072/073.
- Cuotas e indicadores juntos en PostgreSQL, incluyendo concurrencia y RLS.
- Nuevos por publicacion y texto con icono de Entrar.
- Guardado atomico de evento y entrega fiable de avisos.
- Flyer, preservacion de ediciones, direccion, mapa y Como llegar.
- Publicacion aprobada por el founder, despliegue comprobado y prueba de iPhone.

No se declara esta etapa terminada ni en produccion.
