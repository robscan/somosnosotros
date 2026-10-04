# 299 · Eventos: modelo concreto y recorridos

**Fecha:** 4 de octubre de 2026. **OL:** OL-272. **Rama:** `investigacion-eventos`.
**Base comprobada:** `fd11330b11b244b0c2861a07d19abaf0cbc502db`, unión de PR #332.
**Operador:** Codex. **Worktree:** `.claude/worktrees/investigacion-eventos`.

## Autorización y reserva

El founder autorizó publicar OL-271 y pidió retomar específicamente Eventos,
con horarios de lugares, integrantes individuales y el historial compartido
como contexto del grafo cultural. El Gestor de cambios III, mensaje 90, reservó
rama, base posterior a PR #332, OL-272, bitácora 299 y archivos documentales.
El script de numeración confirmó 299 / OL-272 antes de crearlos.

El gestor abrió y unió [PR #332](https://github.com/robscan/somosnosotros/pull/332)
el 4 de octubre, 20:11:36 UTC. Se comprobó mediante GitHub y `origin/main` la
unión `fd11330b`; los documentos de investigación y bitácora 298 no difieren
del candidato `869dcc90`. No se mezcló código de `festivales-modelo`: su primer
avance ya estaba conservado y conectado.

La CI del PR documental terminó con fallo en `npm run medir`: ficha de Lugar
en hoja a 390 px, 168 nodos con presupuesto 167 y marcador del mapa fuera de
su padre. Vercel preview informó éxito. El gestor lo clasificó como medición
intermitente tras comprobar el resultado posterior a la unión. Se verificó
también en GitHub: [CI de main, ejecución 37231157369](https://github.com/robscan/somosnosotros/actions/runs/37231157369),
completada con éxito sobre `fd11330b`. No se oculta el fallo del PR ni se
presenta la publicación documental como prueba de nuevas capacidades.

La nueva autorización es para análisis, modelo y propuesta de recorrido.
No incluye código, prototipo construido, migraciones ni publicación de esta
ampliación. C5 / OL-151 sigue detenida para código. ASIGNACIONES, definición,
cola y documentos 24/42/44 se conservan fuera de edición.

## Resultado

Se añade [modelo concreto y recorridos](../../../investigaciones/eventos-modelo.md)
como desarrollo de E1: el documento de investigación ya reúne antecedentes y
plan amplio; separar el modelo facilita revisar reglas concretas sin perderlos.
Se enlaza desde Eventos e índice. Artistas y Lugares reciben solo referencias
y contratos mínimos necesarios para Eventos, sin ampliar sus proyectos.

El modelo distingue acto puntual, exposición visitable, curso/sesiones, marco
de festival y convocatoria. Concreta fuente y confirmación, fechas/disponibilidad,
asociación a festivales ajenos, programa parcial, síntesis conjunta, reintentos,
consulta por unidad y decisiones de asistencia. No presenta el diseño lógico
como una migración ya aprobada.

Contratos comunes: horarios del lugar y formación individual opcionales;
participantes/sede respaldados por actividad; formación específica separada
de membresía; historial derivado sin duplicar registros ni equiparar anuncio
con realización. Los ejemplos son hipotéticos y no alteran registros reales.

Se revalidaron en esta base `inicio NOT NULL`, caducidad y acceso público
pasado, límites de participantes y los documentos publicados. Se explicita la
decisión pendiente de representar periodos sin hora ficticia, conservando el
comportamiento de eventos simples. Asistencia por sesión/visita, archivo
público y convocatorias conservan sus decisiones y límites propios.

La revisión focalizada de los contratos compartidos llevó a precisar que
agrupar un curso no extiende créditos entre sesiones y que aplicar un horario
existente a una exposición no concede edición de los horarios del lugar.

## Verificación y entrega

Verificación documental: destinos/anclas locales, lectura de reglas y ejemplos,
diff sin espacios erróneos, propiedad de archivos y conservación de las líneas
ajenas de OPEN_LOOPS. Se comprobaron 136 destinos locales y 17 anclas sin
errores; la cadena anterior de «Last updated» permanece íntegra.
No corresponde build, suites ni capturas de pantallas:
no cambió producto. Se entrega commit local al gestor con alcance y límites.

Siguiente resultado revisable: decisiones del founder sobre modelo y recorrido;
si lo pide, el gestor reserva aparte un prototipo de captura y consulta antes
del código. Esta propuesta no autoriza por sí misma reanudar C5 ni publicar.
