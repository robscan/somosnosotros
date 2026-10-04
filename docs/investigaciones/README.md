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
