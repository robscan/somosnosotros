# Eventos: vigencia, programas y captura con IA

**Fecha:** 4 de octubre de 2026. **Estado:** investigación y propuesta; sin aprobación de implementación. [Índice y criterios comunes](README.md).

**Continuación enfocada en Eventos:** [modelo concreto y recorridos propuestos](eventos-modelo.md), OL-272. Desarrolla unidades, reglas temporales, permisos, captura y consulta, con los contratos mínimos de horarios, integrantes e historial. Esta investigación conserva los antecedentes; el documento complementario permite revisar la etapa E1 sin volver a abrir los proyectos completos de Artistas y Lugares.

La [iteración de casos felices](eventos-modelo.md#10-casos-felices-y-variantes-para-revisar) desarrolla alta seguida de ampliación opcional, segundo acto de festival, material completo, sesiones y funciones; incluye crítica, costo de atención, ignorar/deshacer y falsos positivos.

## 1. Petición y resultado buscado

Registrar y distinguir festivales, exposiciones que continúan después de su inauguración, talleres de varias sesiones y convocatorias. Encontrarlos por fecha, lugar, artista o clase de actividad y conservar información útil para futuros mini tours.

La prioridad del founder es **aumentar la capacidad del sistema antes de añadir campos al formulario**. El registro es una barrera: la IA debe absorber clasificación, desglose, búsqueda de fichas y relaciones. La persona aporta material, revisa una síntesis y confirma; los detalles aparecen al necesitarlos.

## 2. Capacidades comprobadas y límites

| Hoy funciona | Límite para estas peticiones |
| --- | --- |
| Eventos con inicio, fin opcional y zona horaria | Un intervalo no expresa cierres semanales, excepciones ni sesiones separadas |
| La agenda encuentra actividades cuyo rango se cruza con la fecha elegida | Puede reconocer vigencia, pero no demostrar que una exposición sea visitable ese día |
| Lectura de una imagen de cartel, nombres de artistas y coincidencias con lugares/artistas existentes | Extrae un evento y una fecha; no un programa, fecha final de varios días, clases de actividad, papeles o integrantes |
| Formulario con revisión y publicación; respeta campos tocados manualmente | Escribir «festival» o «exposición» en el título no activa interpretación contextual |
| Fichas de evento, lugar y artista; relaciones evento–artista y evento–lugar | No hay agrupación de programa ni relación específica entre inauguración y exposición |
| Guardado de un evento mediante operación atómica e idempotente | No guarda aún un programa completo como conjunto revisado |

Fuentes: [lectura de cartel](../../src/lib/cartel.ts), [formulario](../../src/app/eventos/FormularioEvento.tsx), [protección de gestos](../../src/app/eventos/gestosFlyer.ts), [acciones de publicación](../../src/app/eventos/acciones.ts), [rangos de calendario](../../src/lib/calendario.ts), [agenda](../../src/lib/agenda.ts), [bitácora 247](../bitacora/2026/09/247-calendario-codigo.md) y [261](../bitacora/2026/09/261-ui-raices.md).

La conversión actual puede ofrecer 19:00 o gratis cuando falta información. Esos valores de ayuda no deben convertirse en hechos extraídos ni propagarse a todas las actividades de un programa. El esquema de participantes y su validación actual tienen un máximo de seis; un programa o formación mayor necesita revisar ese contrato, sin truncar silenciosamente.

## 3. Antecedentes de exposiciones, talleres y festivales

El gestor confirmó el primer esfuerzo en la rama `festivales-modelo`: OL-151, [bitácora 186](../bitacora/2026/09/186-festivales.md) y [propuesta 42](../rediseno/42-festivales.md), incorporada documentalmente por PR #183. El founder la detuvo el 23 de septiembre de 2026: «tengo dudas, detén ese proyecto hasta que piense al respecto».

### Primer avance: qué entregó y qué dejó abierto

La propuesta original y su bitácora ya están en esta rama y coinciden con `festivales-modelo` en `9f443633`. La creación fue `5cb9c74f`; la suspensión se registró en `43856a94`. No es necesario mezclar la rama antigua: la entrega consistía en documentos, sin código ni migraciones.

Los cinco casos fueron Fotovisión, inauguración de varias salas, EIMIM con talleres y conciertos, cine de varios días en una sede y cine con varias sedes. Las fechas y ejemplos corresponden a las fuentes de entonces; no se presentan como programación actual verificada.

| Alternativa del primer avance | Qué resolvía | Límite identificado entonces |
| --- | --- | --- |
| A. Evento padre y actos hijos | Ficha, sede, horario, «Voy» y compartir propios por actividad; recomendación original | Registro padre/actos, agrupación y reglas para ocultar o borrar el marco |
| B. Evento único con programa plano | Un solo registro en agenda | Sin identidad, asistencia o compartir propios por acto |
| C. Agrupación mediante festival y tabla puente | Actividades independientes vinculadas a un marco | Nuevo registro/ficha de festival y decisión de presentación en agenda |

El primer avance también propuso extraer `actos` y nombre del festival desde la fuente y confirmarlos con la persona. Su alta sugería un renglón opcional «¿Es parte de un festival?». Esa interacción no se hereda como decisión: la petición actual prioriza deducción y captura conjunta antes de añadir controles.

La inauguración de salas y los talleres del EIMIM estaban contemplados como actos; **no se desarrolló un modelo específico de exposición visitable tras la apertura, horarios semanales ni curso con sesiones separadas**. Esta investigación incorpora esas brechas. La búsqueda focalizada de documentación e historial no localizó otra entrega específica anterior que las resolviera.

Las tres preguntas originales siguen conectadas con el nuevo plan:

| Pregunta heredada | Propuesta actual para revisarla | Sigue pendiente |
| --- | --- | --- |
| ¿El marco de una inauguración necesita horario propio? | Registrar el acto de apertura con su horario y relacionarlo con exposiciones; distinguirlo de un marco agrupador | Modelo final y presentación de un acto que abre varias salas |
| ¿Un acto hereda sede del padre? | Reutilizarla como propuesta y conservar sede confirmada por acto | Regla cuando cambia la sede del marco o hay información contradictoria |
| ¿Quién registra actos dentro de un festival ajeno? | Capturar sin conceder edición del marco; confirmar la asociación según permisos | Autoridad de asociación y corrección |

La nueva investigación conserva la identidad y ficha de cada actividad y propone revisar además:

- Capturar un programa en conjunto, evitando registrar primero un padre y después repetir formularios por acto.
- Al filtrar, mostrar los actos que cumplen el criterio dentro del marco del festival; una sola fila del festival no debe ocultar coincidencias por día, artista o disciplina.
- Distinguir «forma parte de» de «inaugura»: una inauguración puede abrir varias exposiciones y una exposición puede pertenecer a un festival. Una sola columna padre no cubre por sí sola horarios, papeles y evidencia.

Estas diferencias y la reanudación para prototipo/código requieren decisión del founder. [Cola C5 y C6](../ops/COLA_DE_PIEZAS.md).

### Capacidad temporal que sí se implementó después

La [bitácora 247, OL-218](../bitacora/2026/09/247-calendario-codigo.md) documenta un fallo real: un evento del 6 al 8 no aparecía al elegir el 7. Se corrigió el filtro de Agenda y Lugares para considerar días intermedios. Es soporte general de intervalos, no la implementación de la propuesta 42 ni una solución de horarios de visita.

Después, la [bitácora 261, OL-233](../bitacora/2026/09/261-ui-raices.md) incorporó rangos de consulta y reemplazó `ocupaDia` por `ocupaRango`. El código actual en [calendario](../../src/lib/calendario.ts) y [agenda](../../src/lib/agenda.ts) es la referencia para filtrar y agrupar respecto a `desde`. La observación histórica de 247 sobre agrupación bajo el inicio debe leerse junto a esa evolución; no recuperar una función retirada.

**Qué se reutiliza:** intervalo, zona, filtro por solapamiento, fichas existentes y protección de gestos. **Qué se propone añadir:** disponibilidad real, sesiones, agrupación con identidad, papeles/procedencia y revisión conjunta. La separación evita encargar otra vez lo construido o declarar terminado lo que solo se propuso.

### Casos registrados para aprender y comprobar

La [carga institucional de octubre](../agendas/2026-10/carga-2026-10-01.md) contiene inauguraciones como Customart Toy, Xantolo y Amueblado del alma, además de clases magistrales de guitarra en fechas distintas. Sirven para revisar la brecha: una apertura no informa por sí misma hasta cuándo se visita; dos clases con título parecido no prueban que sean sesiones de una sola inscripción. Las [fuentes de agendas](../ops/AGENDAS_CULTURALES.md) ayudan a localizar material para aclararlo.

Para reutilizar estos casos en pruebas o prototipos, separar hechos del registro y datos hipotéticos del ejemplo. No añadir finales, horarios o relaciones a los registros reales solo para completar una demostración.

**Conexión entre proyectos:** [Lugares](lugares.md) reutiliza periodo y sesiones para actividad vigente y añade horarios; [Artistas](artistas.md) reutiliza cada actividad concreta para crédito y trayectoria. «Forma parte de», «inaugura», «expone» e «imparte» conservan sentidos diferentes. La [ruta de lectura](README.md#ruta-de-lectura-para-un-agente-nuevo) conecta el criterio firmado, el primer modelo, su entrega y el soporte posterior.

## 4. Capacidad propuesta antes de controles nuevos

### Interpretación y preparación

Ampliar el servicio de interpretación para aceptar, por etapas, cartel, texto, programa y material con varias páginas. Una URL solo aporta lo que pueda consultarse; fallar al leerla no autoriza a rellenar datos imaginados. El material es fuente de información, nunca instrucciones para ejecutar acciones.

El título aporta señales: «Exposición temporal de X» permite proponer una exposición; «Festival del vino» permite proponer un marco de actividades. No acredita fechas, sedes ni elegibilidad del contenido: siguen vigentes las reglas culturales del proyecto. Usar reglas ligeras y contexto antes de llamadas costosas, y evitar consultas de IA por cada tecla.

El sistema debe:

1. Extraer actividades, periodos, sesiones, lugares, participantes y relaciones como candidatos, con la parte de la fuente que los respalda.
2. Buscar fichas y actividades existentes; resolver coincidencias seguras y dejar homónimos o duplicados dudosos para revisión.
3. Reutilizar información confirmada, como lugar y horarios aplicables; señalar diferencias entre fuentes.
4. Preparar un borrador conjunto. Preguntar solo por datos indispensables aún sin resolver. Los opcionales desconocidos pueden permanecer desconocidos.
5. Aplicar correcciones por actividad sin perder el programa ni sobrescribir gestos manuales.
6. Publicar únicamente lo confirmado, guardando la procedencia y evitando duplicados o conjuntos incompletos tras un reintento.

### Una revisión comprensible

La pantalla inicial conserva el gesto actual de aportar material o escribir. No incorpora un selector obligatorio de «tipo de evento» ni preguntas de parentesco.

Si el material sustenta los datos, una síntesis puede decir: «Exposición en Museo X, visitable del 5 al 30. Inauguración el 5 a las 19:00». Al tocar una parte se corrige ese detalle. Si solo consta la inauguración, la síntesis propone conservarla y señala que el periodo de visita está pendiente; no inventa el cierre.

Para un festival: «Encontré 8 actividades en 3 sedes», con la primera actividad y acceso a «Revisar programa». Se revisa y publica el conjunto mediante una decisión principal. Una actividad irresuelta queda fuera del lote confirmado, con explicación y posibilidad de retomarla; no se publica un horario ficticio para completar el programa.

Toda inferencia debe aparecer en la revisión antes de publicarse. Confirmar en conjunto reduce esfuerzo; no equivale a esconder sugerencias tras el botón de publicación. Los errores conservan el borrador, explican qué falló y permiten reintentar sin duplicar registros.

## 5. Información que el sistema necesita conservar

Este es un contrato conceptual, no una lista de campos visibles ni una migración decidida.

| Caso | Representación propuesta | Regla de verdad |
| --- | --- | --- |
| Festival | Marco reconocible con periodo y actividades con identidad, sede, horario y participantes propios | El intervalo del marco no significa actividad continua en todas las sedes |
| Exposición | Una actividad con periodo de visita y disponibilidad; apertura puntual vinculada cuando exista | Inauguración y exposición no son el mismo momento; «expone» no acredita presencia física diaria |
| Taller | Actividad del curso y sesiones cuando la fuente las distinga | No rellenar los días intermedios como sesiones ni confundir una inscripción única con sesiones independientes |
| Convocatoria | Oportunidad con convocante, apertura/cierre cuando consten, requisitos, ámbito y enlace oficial | La fecha límite no es una función a la que se pueda decir «Voy» |

Además: zona horaria; estado anunciado/realizado/cancelado cuando haya evidencia; papeles de participantes; fuente, responsable y confirmación; incertidumbre explícita; relaciones tipadas; excepciones de horario. La vigencia se calcula a partir de fechas, sin confundirla con realización.

Las relaciones de programa necesitan prevenir ciclos y la inclusión de una actividad en sí misma. Sede común puede proponerse, pero cada acto conserva su sede confirmada. Quien publica un acto no obtiene permiso para editar el festival ajeno; asociarlo requiere un contrato de autorización y corrección. Ocultar o borrar el marco no debe borrar automáticamente actos independientes.

Para convocatorias se recomienda un registro propio vinculado a artistas, colectivos o lugares existentes, sin forzarlo a `eventos`. C6 aún requiere definir alcance; esta propuesta no introduce revista, comentarios ni un formulario editorial general.

## 6. Descubrimiento con revelación progresiva

| Primera capa | Al solicitar detalle |
| --- | --- |
| Exposición: «Hasta el 30 · Museo X» | Periodo, horarios confirmados, excepciones e inauguración |
| Taller: siguiente sesión y duración del curso | Sesiones, requisitos y forma de inscripción |
| Festival: periodo y siguiente actividad pertinente | Programa por día o sede; fichas de los actos |
| Convocatoria: «Cierra el 20» y convocante | Requisitos, ámbito, condiciones y enlace oficial |

La clasificación también sirve para buscar y filtrar, sin exigir captura manual. Las opciones «Exposiciones», «Talleres», «Festivales» y «Convocatorias» se evalúan dentro de la hoja de filtros existente; se muestran como contexto activo cuando se eligen, sin ocupar permanentemente cada pantalla.

La agenda responde a la fecha elegida. En un festival, el filtro selecciona actos y después los agrupa bajo su marco; no filtra únicamente las fechas del padre. «Voy» corresponde a una actividad concreta, nunca implica asistir a todo el programa. Si hay un acto de apertura, ese acto tiene su propia participación. Una convocatoria usa el enlace para postular, no los mecanismos de asistencia.

«Vigente» indica periodo activo. «Visitable hoy» requiere horario aplicable confirmado. Si falta horario: «Horario por confirmar», sin afirmar «Abierto ahora». El proyecto de [Lugares](lugares.md) desarrolla esta disponibilidad.

## 7. Preparación para mini tours

Conservar identidad y ciudad del lugar, coordenadas públicas existentes, periodo, franjas de visita, duración estimada cuando haya fuente, costo, reserva y estado de confirmación. La unidad útil es una actividad visitable en una franja concreta, no el intervalo global de un festival.

Esto permitirá seleccionar paradas y comprobar compatibilidad de horarios más adelante. Las convocatorias no son paradas salvo que tengan una actividad presencial relacionada. Sin horarios o ubicación suficientemente confirmados, una actividad puede ser sugerencia cultural, pero no parte de un recorrido prometido como realizable. No se guardan recorridos personales ni ubicación del visitante para formar el grafo.

## 8. Plan de implementación por piezas

Cada fila es un encargo futuro; no es autorización para ejecutarlo.

| Etapa | Qué toca y entregable | Migración | Prueba que la cierra | Decisión del founder |
| --- | --- | --- | --- | --- |
| E1. Contratos y ejemplos | Datos/IA: revisar el [modelo concreto](eventos-modelo.md), con identidad de actividad, sesiones, relaciones, permisos y procedencia | No; diseño documental | Un concierto, exposición con apertura, curso con huecos, festival multisede y convocatoria se representan sin inventar datos | Modelo, excepciones de fecha/hora y asistencia; reanudar C5; alcance de C6 |
| E2. Mejor interpretación | IA: ampliar salida estructurada y resolución de fichas; comparar calidad y costo con lectura actual | No para evaluar borradores; persistencia va en E3 | Fuentes con varias actividades, datos ausentes, homónimos y respuestas tardías; ningún valor sugerido se presenta como extraído | Fuentes y límites de costo; criterios de revisión |
| E3. Relaciones y disponibilidad | Datos: periodos/sesiones, relaciones tipadas, papeles y procedencia, coordinados con Artistas/Lugares | Sí, aditiva; nombres los reserva el gestor | Contratos PG/RLS, zonas y cierres, ciclos, permisos y visibilidad; eventos simples mantienen comportamiento | Modelo final; autorización de asociaciones y reglas de conservación |
| E4. Captura conjunta | Pantalla y servidor: prototipo de síntesis/corrección; después guardado idempotente del conjunto | Solo si el contrato/RPC requiere ampliación | Material único produce un programa revisable; reintento no duplica; no hay publicación parcial silenciosa; corrección manual gana | Firma del recorrido y tratamiento de actividades pendientes |
| E5. Consulta y filtros | Pantallas/consultas: vigencia, programa y coincidencias por acto; reutilizar disponibilidad de Lugares | Evaluar índices/consultas según medición | Una exposición sigue apareciendo tras la apertura; talleres respetan sesiones; filtros no ocultan actos; conteos evitan duplicados | Firma de presentación, filtros y semántica de asistencia |
| E6. Convocatorias | Datos/IA/pantalla: registro específico y revisión compacta, como pieza separada | Sí si se aprueba el registro propio | Fecha límite y zona correctas; no genera «Voy» ni falsos eventos; fuente oficial y cierre visibles | Alcance C6 y relación con búsqueda/agenda |
| E7. Preparación de recorridos | Datos: comprobar que la información anterior sea reutilizable | No por defecto; solo brechas comprobadas | Consultar paradas posibles para una fecha sin prometer horarios desconocidos | Cuándo abrir mini tours como proyecto propio |

Las pantallas futuras se verifican con estados de carga, vacío, error y éxito; teclado y foco; móvil de 320/375/390 px y captura real 390×844. La revisión de producto precede al código y la publicación conserva su autorización específica.

## 9. Riesgos y decisiones pendientes

Los principales riesgos son falsos programas deducidos solo del título, duplicados entre agendas y carteles, cierres desconocidos, horas/precios sugeridos tratados como hechos, avisos repetidos por cada acto y permisos de edición demasiado amplios. Se resuelven mediante evidencia, revisión conjunta y contratos explícitos, no con más preguntas permanentes en el formulario.

Quedan pendientes del founder el modelo definitivo de agrupación, el alcance de convocatorias, quién confirma actos de otros publicadores y la asistencia a talleres con varias sesiones. Cualquier ampliación a antecedentes de fecha parcial o actividades sin hora requiere conciliar la regla vigente «un evento tiene fecha y hora»; no se modifica aquí la [definición](../DEFINICION.md).

El [modelo concreto](eventos-modelo.md#9-decisiones-propuestas-para-continuar) recomienda cómo resolver estas decisiones: marco con actos independientes, exposición y apertura relacionadas, sesiones de inscripción común, horarios/formación opcionales y confirmación de asociaciones a marcos ajenos. Son recomendaciones para revisar, no acuerdos nuevos ya firmados.

## 10. Qué comprobar al retomar

Partir del [índice y estado de antecedentes](README.md#antecedentes-conectados), revalidar la reserva del gestor y leer la etapa elegida. Para captura, contrastar [cartel](../../src/lib/cartel.ts), [gestos](../../src/app/eventos/gestosFlyer.ts) y [formulario](../../src/app/eventos/FormularioEvento.tsx); para disponibilidad, [calendario](../../src/lib/calendario.ts), [agenda](../../src/lib/agenda.ts) y el contrato de [Lugares](lugares.md). Antes de créditos o conteos, leer las reglas de [Artistas](artistas.md). No asumir permiso de implementar por encontrar un SQL propuesto en el doc 42.
