# Lugares: actividad vigente, artistas e informes

**Fecha:** 4 de octubre de 2026. **Estado:** investigación y propuesta; sin aprobación de implementación. [Índice y criterios comunes](README.md).

## 1. Petición y resultado buscado

Mostrar qué continúa activo en museos, galerías y otros espacios después de una inauguración. Permitir consultar, cuando se solicite, los artistas que participaron allí y obtener información útil para informes periódicos. La ficha debe declarar el alcance del registro automático sin prometer una historia completa.

La propuesta aplica **UX invisible**: reutilizar actividades y extraer horarios de fuentes disponibles antes de preguntar. Aplica **progressive disclosure**: actividad actual visible; horarios, artistas y herramientas de informes aparecen al pedirlos. No convierte el alta de lugar en un cuestionario adicional.

## 2. Capacidades comprobadas y límites

| Capacidad actual | Consecuencia |
| --- | --- |
| Lugares con identidad, tipo, ciudad, coordenadas, dirección, descripción y enlaces | Una galería ya es un lugar; no hace falta volver a registrarla como clase nueva |
| Eventos vinculados mediante `lugar_id`; ficha del lugar con actividades próximas o en curso | La base permite saber qué actividades se relacionan con el espacio |
| Rangos de eventos usados para agenda y días con actividad en Lugares | Un rango continuo no demuestra apertura diaria ni sesiones reales |
| Relación evento–artista | Permite construir la consulta inversa de artistas por lugar |
| Ficha actual centrada en próximas fechas, con un lote de hasta 30 | Ese lote no es un historial completo ni una base suficiente para estadísticas |
| Sin estructura de horarios de apertura en modelo, formulario o migraciones examinados | No puede afirmarse «Abierto ahora» ni heredar un horario todavía desconocido |

Fuentes: [modelo de lugar](../../src/lib/lugares.ts), [formulario](../../src/app/lugares/FormularioLugar.tsx), [consulta del directorio](../../src/app/lugares/page.tsx), [cuerpo de ficha](../../src/app/lugares/[id]/CuerpoLugar.tsx) y [rangos de agenda](../../src/lib/agenda.ts).

No existe hoy una sección pública de artistas históricos ni un informe periódico con cobertura declarada. El proyecto de [Artistas](artistas.md) documenta también el límite del acceso público a eventos pasados.

### Conexión con el primer avance de exposiciones y talleres

El primer esfuerzo, [modelo 42](../rediseno/42-festivales.md) y [entrega 186](../bitacora/2026/09/186-festivales.md), trató la inauguración de varias salas y talleres dentro de un festival. No incorporó horarios del lugar ni el periodo visitable posterior. Su contenido original está conservado en esta rama; [Eventos](eventos.md#3-antecedentes-de-exposiciones-talleres-y-festivales) compila alternativas, preguntas y ampliaciones actuales.

La [bitácora 247 / OL-218](../bitacora/2026/09/247-calendario-codigo.md) sí corrigió el filtro de Lugares para un evento que ocupa varios días. La [261 / OL-233](../bitacora/2026/09/261-ui-raices.md) documenta la evolución de los rangos de Agenda. Ambas sirven como soporte reutilizable; ninguna prueba apertura real de un museo ni sesiones de un taller.

La [carga institucional de octubre](../agendas/2026-10/carga-2026-10-01.md) muestra aperturas puntuales registradas en Museo del Ferrocarril y casas de cultura. Son ejemplos para analizar por qué después de inaugurar puede faltar actividad visible, sin inventar una duración que la fuente no dio. Este proyecto completa el lado del espacio: disponibilidad y consulta. [Artistas](artistas.md) completa quién hizo qué y la acreditación histórica.

## 3. Saber qué sigue activo

La inauguración permanece como momento concreto. La exposición tiene su propio periodo de visita y una relación «inaugurada por» con ese momento. De ese modo, al pasar la apertura, el lugar puede seguir mostrando la exposición hasta el cierre confirmado. Un mismo acto puede inaugurar varias salas; no se duplica el acto para cada exposición.

Esta capacidad depende del contrato de [Eventos](eventos.md). La ficha del lugar puede presentar una síntesis como «2 exposiciones vigentes», con acceso a las actividades. Al elegir fecha, debe responder qué estará disponible en ella, respetando periodo, sesiones y horario aplicable. No se altera el tipo del lugar para describir su programación.

El sistema propone vínculos a partir del nombre del recinto, carteles o agenda. Antes de crear una sede nueva busca la existente. Si faltan datos, conserva lo conocido; si una fuente solo anuncia la inauguración no deduce automáticamente un mes de exposición.

## 4. Horarios como capacidad reutilizable

### Cómo incorporarlos sin aumentar la barrera

1. Buscar primero un horario en material aportado o en una fuente oficial accesible del lugar.
2. Preparar una propuesta una vez, con fuente y fecha de consulta, para quien tenga permiso de confirmarla.
3. Reutilizar ese horario en exposiciones posteriores, señalando en su revisión qué disponibilidad se está aplicando.
4. Permitir corregir una excepción al tocar el horario de la actividad, sin abrir toda la ficha del lugar.

No añadir por defecto siete campos de días y horas al alta. Si no se obtiene el dato, la actividad sigue indicando «Horario por confirmar». El sistema puede guardar una programación incompleta; no ofrece una visita garantizada cuando falta información esencial.

### Contrato conceptual

El horario base necesita días de semana, una o varias franjas, zona horaria, vigencia y fuente/confirmación. La actividad puede tener horario propio, reservas y excepciones. Cierres temporales y festivos se conservan como excepciones, no como cambios destructivos del horario habitual.

El horario específico confirmado de una actividad prevalece sobre el base aplicable; los cierres confirmados también se respetan. Un conflicto entre fuentes no se resuelve sumando ventanas: se solicita revisión. Conservar versiones o periodos de vigencia evita que editar el horario actual reescriba la disponibilidad histórica.

«Vigente» significa que el periodo no terminó. «Visitable hoy» requiere una franja válida para ese día. «Abierto ahora» requiere además información confirmada y vigente para esa hora. No convertir horarios viejos, ausencia de cierre o descripciones libres en certeza.

## 5. Artistas que participaron en el lugar

Añadir una entrada discreta **«Artistas que han participado aquí»**. Al abrirla, cargar una primera tanda; permitir consultar las actividades que sostienen cada conexión y, después, filtros por periodo o papel.

La consulta deriva de actividades concretas y sus participantes, no de seguidores, asistentes, cuentas gestoras ni afinidad de disciplinas. Los papeles explican lo ocurrido: interpretó, expuso, impartió, curó u organizó. Una exposición prolongada cuenta como participación artística; no como presencia física diaria.

Compartir lugar en fechas distintas no acredita que dos artistas colaboraron. Pertenecer a un festival no basta si cada acto ocurrió en otra sede. Los integrantes de un grupo se incluyen individualmente solo cuando la formación de esa actividad está acreditada; el grupo mantiene su ficha y crédito propios.

Las conexiones anunciadas y realizadas se distinguen. Pasar la fecha no demuestra que se realizó una actividad. Para información antigua sin verificación, usar «actividad registrada» o el estado declarado; no convertir todo el pasado en logros confirmados.

La lista y sus totales deben proceder del mismo conjunto autorizado, con agregación en SQL y paginación. Abrir la ficha no descarga todo el archivo. Un error se muestra con salida para reintentar, no como «ningún artista».

## 6. Informes periódicos y definición de cifras

La herramienta **«Preparar informe»** aparece en la gestión del lugar, bajo demanda. La persona elige un periodo; el sistema prepara una síntesis y permite revisar o descargar los registros que la sustentan. La consulta pública de artistas no necesita mostrar controles administrativos.

| Dato propuesto | Definición que debe quedar visible en el informe |
| --- | --- |
| Actividades registradas | Actividades distintas relacionadas con el lugar en el periodo, según el criterio temporal acordado |
| Actividades realizadas | Subconjunto con realización acreditada; se declara el método de confirmación |
| Artistas participantes | Fichas distintas con papel admitido y participación sustentada en esas actividades |
| Grupos e integrantes | Totales separados y relación explicada; evitar presentar el grupo más sus integrantes como una sola medida de personas |
| Sesiones o días de visita | Unidades diferentes de actividades; solo se cuentan si existen datos suficientes |

Un festival marco no se suma otra vez si el informe cuenta sus actos. Un curso puede ser una actividad con varias sesiones; una exposición de un mes no se convierte en treinta actividades. Para exposiciones que cruzan meses, puede informarse «vigentes durante el periodo» por solapamiento, pero no sumar luego esos meses como exposiciones distintas anuales. La fecha de la actividad y la fecha de incorporación son diferentes.

Primero se recomiendan registros y exportación tabular con fuente, periodo y definiciones; un PDF narrativo puede ser una etapa posterior. No se infiere asistencia a partir de «Voy» ni se presenta como impacto medido lo que es actividad publicada. No se crean rankings de artistas o espacios.

## 7. Cobertura y aviso pequeño

Texto propuesto cuando la fecha pueda demostrarse:

> Registro automático desde [fecha comprobada]. Puede estar incompleto e incluir antecedentes añadidos por sus responsables.

**La primera actividad conservada no demuestra el inicio del registro automático.** El gestor informó el 4 de octubre de 2026 que el evento más antiguo observado era del 18 de septiembre; es una observación del conjunto conservado, no una certificación de cobertura desde ese día. No usarla automáticamente en el aviso.

Si todavía no existe un inicio comprobado:

> Historial de actividades registradas en somosnosotros. Puede estar incompleto.

En el informe descargado se amplía con fecha de elaboración, rango consultado, reglas de conteo y distinción de fuentes automáticas y antecedentes manuales. No hace falta repetir una explicación larga en la ficha.

La cobertura automática puede necesitar un periodo y un ámbito —fuente, institución o lugar—, porque activar una fuente no acredita registrar todos los espacios. Registrar ese hito como metadato auditable, sin cambiar la fecha de las actividades.

## 8. Privacidad y conservación

El grafo es público; no contiene perfiles de asistentes. Historial, informes y exportaciones respetan lugares ocultos o privados, retiro de artistas y visibilidad de actividades. No recuperan direcciones reservadas ni datos eliminados mediante una copia paralela.

La purga vigente conserva la actividad mientras elimina copias privadas de dirección. El borrado excepcional de un lugar conserva eventos desvinculados y su contexto permitido; no permite reconstruir públicamente el lugar retirado. Si ya no existe una relación pública válida, el total y su lista deben ajustarse juntos. [Bitácora 285](../bitacora/2026/10/285-seguridad-purga-sitio.md), [286](../bitacora/2026/10/286-seguridad-borrado-excepcional.md).

## 9. Plan de implementación por piezas

| Etapa | Qué toca y entregable | Migración | Prueba que la cierra | Decisión del founder |
| --- | --- | --- | --- | --- |
| L1. Contratos y ejemplos | Datos: acordar vigencia, disponibilidad, artistas y unidades del informe; citar dependencias de Eventos/Artistas | No; diseño documental | Casos de exposición, curso, festival multisede y grupo cambiante producen relaciones y conteos correctos | Qué cifras necesita el lugar y qué se considera realizado |
| L2. Horarios reutilizables | IA/datos: extracción, propuesta con fuente, franjas y excepciones; prototipo de confirmación contextual | Sí, aditiva, después de aprobar contrato | Horario partido, día cerrado, excepción, cambio de zona y fuente incierta; editar presente no reescribe pasado | Quién confirma; vigencia y revisión de horarios |
| L3. Actividad vigente | Consultas/pantalla: mostrar lo activo en el lugar, usando periodos y sesiones de Eventos | No adicional si la dependencia cubre el contrato; evaluar índices | Exposición aparece tras inauguración; cierre o falta de horario no produce «abierto» falso | Firma del resumen y acceso a horarios |
| L4. Artistas e historial | Consultas/pantalla: primera tanda al abrir, detalle con actividades y papeles | Reutilizar relaciones de Artistas; índices/RPC si la medición lo requiere | Conteo completo con más de 30 actividades; grupos no conceden créditos individuales; ocultación y errores coherentes | Presentación pública y estados admitidos |
| L5. Cobertura e informes | Datos/pantalla: cobertura auditable, selección del periodo y exportación revisable | Sí si falta el registro de cobertura; agregados según contrato | Ningún doble conteo de marco/actos/sesiones; exportación y pantalla coinciden; no se filtran datos privados | Fecha demostrable de inicio, ámbito de cobertura y formato de informe |

Las consultas se filtran antes de paginar. Las listas completas no dependen del lote de próximos eventos de la ficha. Las pruebas de datos/permisos se hacen sobre PostgreSQL; las pantallas se validan con estados reales, foco y teclado, datos largos en móvil y aprobación del founder antes del código/publicación.

## 10. Dependencias y límites

[Eventos](eventos.md) aporta exposiciones, sesiones y programas. [Artistas](artistas.md) aporta papeles, procedencia, realización, archivo permitido y formación concreta. Lugares añade horarios reutilizables y cobertura/informes, sin duplicar esas relaciones.

Se preparan datos para mini tours; no se construye aquí planificación de rutas, seguimiento de visitantes ni evaluación del valor cultural de los lugares. Los puntos pendientes son el criterio de realización, la autoridad para confirmar horarios, el periodo de cobertura comprobable y las unidades de cada informe.

Para retomar: usar la [ruta de lectura](README.md#ruta-de-lectura-para-un-agente-nuevo) y el [mapa de antecedentes](README.md#antecedentes-conectados), verificar consultas y permisos en la base asignada y reservar una etapa. No convertir una fecha de inauguración importada en horario de visita ni importar la UI de un calendario histórico como solución nueva.
