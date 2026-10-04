# Investigaciones de producto

**Fecha:** 4 de octubre de 2026. **Pieza documental:** OL-271, bitácora 298.

Este repositorio reúne el resultado de la investigación y las propuestas solicitadas por el founder. Cada documento permite retomar un proyecto por separado: describe capacidades comprobadas, límites, experiencia propuesta, datos necesarios, etapas, pruebas de cierre y decisiones pendientes.

**Guardar estos documentos no aprueba construir las propuestas.** No se modificó código, no se hicieron prototipos ni se aplicaron migraciones. La pieza C5 / OL-151 continúa detenida para implementación. Las reservas de cada etapa futura corresponden al gestor.

## Proyectos

| Documento | Peticiones que aborda | Resultado buscado |
| --- | --- | --- |
| [Eventos](eventos.md) | Festivales y programas; exposiciones visitables después de inaugurarse; talleres de varias sesiones; convocatorias; captura con IA; filtros; preparación para mini tours | Registrar y encontrar actividades complejas con el menor esfuerzo de captura |
| [Artistas](artistas.md) | KPI «Lugares»; trayectoria; lugares y actividades compartidas; antecedentes; integrantes de grupos; reseña y presentación para bookers | Construir una trayectoria comprobable y reutilizable, bajo control del artista |
| [Lugares](lugares.md) | Qué sigue activo en museos y galerías; horarios; artistas que participaron; informes por periodo; alcance del registro automático | Explicar qué se puede visitar y documentar la actividad del espacio |

## Ruta de lectura para un agente nuevo

1. **Ubicarse antes de actuar:** leer las instrucciones del proyecto, [memoria del gestor](../ops/MEMORIA_GESTOR.md), [asignaciones](../ops/ASIGNACIONES.md), [gestión de cambios](../ops/GESTION_DE_CAMBIOS.md) y [estado operativo](../ops/OPEN_LOOPS.md). Comprobar Git y la reserva actual; esta investigación no asigna trabajo de implementación.
2. **Entender el criterio:** [definición](../DEFINICION.md), [principios UX](../PRINCIPIOS_UX.md) y [grafo cultural firmado](../rediseno/24-grafo-cultural.md). La firma de un criterio no prueba que todas sus capacidades estén construidas.
3. **Elegir el proyecto:** leer Eventos, Artistas o Lugares, desde la petición hasta su plan. Las capacidades actuales, propuestas y decisiones pendientes están separadas dentro de cada documento.
4. **Aprender del primer avance:** consultar la [síntesis de antecedentes de Eventos](eventos.md#3-antecedentes-de-exposiciones-talleres-y-festivales) y abrir la fuente original solo cuando haga falta profundizar. No es necesario recorrer una rama antigua para entenderlo.
5. **Comprobar qué sigue vigente:** contrastar las bitácoras con el código de la base asignada. Por ejemplo, `ocupaDia` del calendario antiguo fue reemplazado por `ocupaRango`; no recuperar código ni pantallas retiradas por copiar una bitácora histórica.
6. **Retomar una pieza concreta:** usar el plan del proyecto y sus dependencias; entregar al gestor objetivo, límites y prueba de cierre. El founder decide los puntos pendientes antes de implementar.

## Antecedentes conectados

El primer avance de inauguraciones, talleres dentro de festivales y programas está **conservado en esta rama**: [propuesta 42](../rediseno/42-festivales.md) y [bitácora 186](../bitacora/2026/09/186-festivales.md). Ambos archivos coinciden con los de `festivales-modelo` en `9f443633`; la propuesta se creó en `5cb9c74f` y se integró documentalmente por PR #183. No hay código ni migración de esa pieza que incorporar. Se conserva una fuente original y se compila su aprendizaje en los documentos actuales.

| Antecedente | Estado y aprendizaje | Dónde se conecta ahora |
| --- | --- | --- |
| [Grafo cultural, doc 24](../rediseno/24-grafo-cultural.md) | Criterio firmado: relaciones tipadas y con procedencia; implementación por etapas | Los tres proyectos y sus dependencias comunes |
| [Pedido L51 y cola C5/C6](../ops/COLA_DE_PIEZAS.md) | Origen: festivales, varias salas y EIMIM; C5 detenida, C6 por definir | Alcance y decisiones de Eventos |
| [Modelo 42](../rediseno/42-festivales.md) y [entrega 186](../bitacora/2026/09/186-festivales.md) | Propuesta detenida: cinco casos, tres modelos, lectura de programa con IA y tres preguntas | [Herencia y ampliaciones](eventos.md#3-antecedentes-de-exposiciones-talleres-y-festivales); actividad vigente de Lugares; unidades de trayectoria de Artistas |
| [Prototipo de calendario 245](../bitacora/2026/09/245-calendario-dias-con-eventos.md) | Antecedente de interacción y estados; no es por sí mismo implementación | Evolución hacia calendario y filtros, sin reintroducir su UI antigua |
| [Calendario 247 / OL-218](../bitacora/2026/09/247-calendario-codigo.md) | Capacidad implementada: encontrar un evento de varios días al consultar un día intermedio | Vigencia de Eventos y actividad por fecha de Lugares |
| [Raíces y rangos 261 / OL-233](../bitacora/2026/09/261-ui-raices.md) | Evolución implementada: filtro por rango y agrupación contextual; reemplaza partes de la interacción anterior | Base que debe reutilizar el proyecto de Eventos |
| [Carga institucional de octubre](../agendas/2026-10/carga-2026-10-01.md) y [fuentes de agendas](../ops/AGENDAS_CULTURALES.md) | Casos registrados y fuentes; no demuestran duración de visita ni realización | Ejemplos de exposición, taller y programa para verificar propuestas |

**Cómo interpretar los estados:** «firmado» describe una decisión; «propuesta detenida» conserva una alternativa sin autorizarla; «implementado» requiere código y evidencia de cierre; «registro importado» solo describe datos incorporados. Las cifras y fechas de fuentes antiguas no se actualizan por inferencia.

## Consulta por pregunta

| Si el encargo pregunta… | Leer primero | Relación necesaria |
| --- | --- | --- |
| ¿Qué hubo en el primer esfuerzo? | [Antecedentes de Eventos](eventos.md#3-antecedentes-de-exposiciones-talleres-y-festivales) | Doc 42/186 y diferencia entre propuesta y soporte temporal implementado |
| ¿Cómo mantener visible una exposición tras la inauguración? | [Eventos](eventos.md), información y descubrimiento | [Lugares](lugares.md), vigencia y horarios |
| ¿Cómo registrar un festival o un taller sin repetir formularios? | [Eventos](eventos.md), interpretación y revisión conjunta | [Artistas](artistas.md), identidad y papel; Lugares, disponibilidad |
| ¿Cómo acreditar lo que hizo un artista? | [Artistas](artistas.md), trayectoria y antecedentes | Evento concreto, formación y fuente; evitar crédito por todo el festival |
| ¿Cómo informar actividad de un espacio? | [Lugares](lugares.md), artistas e informes | Unidades de Eventos, papeles de Artistas y cobertura comprobada |
| ¿Qué falta para mini tours? | [Eventos](eventos.md), preparación para recorridos | Horarios y excepciones de Lugares; no prometer una ruta con datos desconocidos |

## Criterios comunes

1. **Aumentar capacidades antes de añadir campos.** Leer mejor carteles y programas, aprovechar fichas existentes, resolver identidades, deducir relaciones y reutilizar datos confirmados. Un dato nuevo en el sistema no exige un control nuevo en pantalla.
2. **UX invisible.** La entrada sigue siendo un gesto conocido: subir material o escribir. El sistema prepara un borrador comprensible. Busca información disponible antes de preguntar; pregunta únicamente lo imprescindible que no pueda resolver.
3. **Progressive disclosure.** Primero la síntesis para decidir; después detalles y correcciones al tocarlos; finalmente herramientas especializadas al solicitarlas. Ocultar un formulario largo detrás de un botón no resuelve la carga de captura.
4. **Confirmación humana.** Toda relación o dato propuesto por IA se revisa antes de publicarse como hecho. La revisión puede ser conjunta, sin exigir un clic por cada dato; las ambigüedades se señalan. Las correcciones manuales prevalecen sobre respuestas posteriores.
5. **Grafo cultural público.** Las relaciones dicen qué ocurrió, quién participó, dónde, con quién y de dónde salió la información. No se puntúan conexiones ni se incorporan perfiles de asistentes al grafo.
6. **Datos honestos.** Anunciado no equivale a realizado; vigente no equivale a abierto ahora; compartir festival no equivale a colaborar; ser integrante actual no acredita conciertos antiguos. Una fecha desconocida conserva su incertidumbre.

Estos criterios desarrollan la [definición firmada](../DEFINICION.md), el [grafo cultural](../rediseno/24-grafo-cultural.md) y los [principios de UX](../PRINCIPIOS_UX.md).

## Dependencias y orden sugerido

| Capacidad compartida | Proyecto que la desarrolla | Proyectos que la reutilizan |
| --- | --- | --- |
| Papeles, procedencia, confirmación e identidad de participantes | Primera etapa de datos de Artistas, coordinada con la captura de Eventos | Los tres |
| Vigencia, sesiones, programa y relaciones entre actividades | Eventos | Lugares; créditos y conteos de Artistas |
| Horarios del espacio y excepciones por actividad | Lugares | Eventos; mini tours futuros |
| Archivo público permitido y consultas históricas completas | Artistas, con contrato compartido con Lugares | Artistas y Lugares |
| Membresía de grupos y formación concreta por actividad | Artistas | Créditos de Eventos y estadísticas de Lugares |

Cada proyecto puede empezar por sus contratos, ejemplos y propuesta de interacción. La implementación de una dependencia se encarga una sola vez y se cita desde los demás proyectos; no se mantienen copias del historial ni bases paralelas. Se conserva Postgres/Supabase y el stack vigente.

Orden recomendado: capacidades de interpretación y relaciones verificables; actividades vigentes y programas; horarios cuando haya fuente; trayectorias y antecedentes; integrantes y formación; informes y presentación profesional. Los mini tours se preparan mediante datos reutilizables, sin construir todavía su generador.

## Cómo retomar

El gestor asigna una pieza acotada del plan correspondiente y revalida base, reservas y estado del producto. El founder decide los puntos señalados; las pantallas requieren prototipo y revisión antes del código. Las migraciones futuras serán aditivas y tendrán pruebas de contratos y permisos; aplicarlas o publicar exige la autorización correspondiente.

**Evidencia de esta entrega:** investigación previa sobre `5e574c54`, comprobación de los contratos citados en la base documental `0375c774` y consulta al Gestor de cambios III el 4 de octubre de 2026. Es una lectura del repositorio, no una auditoría de producción ni una prueba de pantallas nuevas. [Bitácora 298](../bitacora/2026/10/298-investigaciones.md).

**Continuidad documental, 4 de octubre:** por petición del founder se compilaron el primer avance y la evolución posterior, con comparación de fuentes en Git, ruta de lectura, estados y conexiones entre proyectos. No se duplicaron ni modificaron documentos históricos; este índice es la entrada de consulta para esta investigación.
