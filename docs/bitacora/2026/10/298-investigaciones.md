# 298 · Investigaciones de eventos, artistas y lugares

**Fecha:** 4 de octubre de 2026. **OL:** OL-271. **Rama:** `investigaciones`.
**Base asignada:** `0375c774`. **Operador:** Codex.
**Worktree:** `/Users/apple-1/somosnosotros/.claude/worktrees/investigaciones`.

## Encargo y coordinación

El founder pidió guardar la investigación realizada en un repositorio dentro de
`docs`, con un documento por proyecto: eventos, artistas y lugares. Cada uno
debía reunir hallazgos, propuestas y plan para implementar, sin empezar a
modificar el producto. Sus precisiones previas: aumentar capacidades del sistema
antes de añadir campos, UX invisible, progressive disclosure, confirmación de
sugerencias y posibilidad de registrar integrantes de grupos como artistas.

Se releyeron memoria, asignaciones, gestión de cambios, estado operativo,
definición, plan y bitácora de festivales. El Gestor de cambios III reservó
OL-271 / 298 y el worktree indicado; su registro va en PR #331. Asignó cuatro
archivos de investigación, esta bitácora y entrada propia de OPEN_LOOPS.
ASIGNACIONES y documentos de definición/rediseño quedan fuera de la edición.
Entrega en commit local, sin push, PR ni unión. OL-151 sigue detenida para código.
Se incorporó por avance directo `61444c86`, la unión de la reserva PR #331;
solo cambió ASIGNACIONES respecto a la base asignada, sin tocar producto.

## Entrega

- [Índice](../../../investigaciones/README.md): proyectos independientes,
  criterios comunes, dependencias, orden recomendado y forma de retomar.
- [Eventos](../../../investigaciones/eventos.md): rangos existentes, límites de
  lectura de cartel, antecedente detenido de festivales, periodos visitables,
  sesiones, programas, convocatorias, revisión conjunta, filtros y preparación
  de información para mini tours.
- [Artistas](../../../investigaciones/artistas.md): definición exacta del KPI
  «Lugares», historial y antecedentes, papeles y procedencia, membresías y
  formaciones por actividad, permisos y presentación profesional.
- [Lugares](../../../investigaciones/lugares.md): actividad vigente, ausencia de
  horarios estructurados, horario reutilizable con excepciones, artistas por
  actividad, informes por periodo y aviso sobre cobertura.

Cada etapa futura declara pantalla/datos/IA afectados, necesidad de migración,
prueba que la cierra y decisión del founder. No se asignan ramas, números ni
migraciones futuras. Se citan fuentes del repositorio mediante enlaces relativos.

## Evidencia y límites

Se reutilizó la investigación previa sobre `5e574c54`, la consulta al gestor y
se comprobaron los contratos relevantes en `0375c774`. Los hechos se distinguen
de recomendaciones y decisiones pendientes. La cabecera del doc 44 sigue
describiendo una propuesta, pero el código ya muestra novedades de artistas;
no se duplica esa implementación ni se corrige el documento ajeno.

El gestor había observado el 4 de octubre un evento conservado del 18 de
septiembre de 2026. Se registra únicamente como observación, nunca como fecha
demostrada del inicio de cobertura automática. No se publican conteos de
producción ni datos personales privados.

Verificación documental: enlaces relativos y destinos, revisión de contenido,
alcance de archivos y `git diff --check`. No hay cambios de código ni migraciones;
no corresponde build, suite de pruebas ni capturas de pantallas nuevas.

## Estado y siguiente acción

Investigación documentada para revisión del founder. No implica aprobación
del modelo ni reanudación de implementación. El gestor recibe la entrega local
con SHA. Cuando el founder decida abordar una etapa o publicar los documentos,
el gestor revisa la base vigente y reserva el alcance correspondiente.
