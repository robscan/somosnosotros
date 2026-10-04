# Eventos: modelo concreto y recorridos propuestos

**Fecha:** 4 de octubre de 2026. **Estado:** propuesta para revisar; OL-272 / [bitácora 299](../bitacora/2026/10/299-eventos-modelo.md). No autoriza implementación.

Leer primero [Eventos: investigación y antecedentes](eventos.md). Este documento desarrolla su etapa E1: unidades, relaciones, reglas temporales, captura y consulta. [Artistas](artistas.md) y [Lugares](lugares.md) aportan contratos mínimos; sus proyectos completos conservan alcance propio.

## 1. Recomendación

Conservar una identidad estable para cada actividad y distinguir su forma de ocurrir: momento puntual, periodo visitable o curso con sesiones. Un festival agrupa actividades; una convocatoria representa una oportunidad. La IA prepara estas estructuras desde material o título, y la persona confirma una representación comprensible. **La estructura aumenta en el sistema, sin añadir un cuestionario al registro.**

| Unidad | Identidad y tiempo | Qué se consulta o comparte |
| --- | --- | --- |
| Actividad puntual | Ficha propia; inicio y fin conocido, si existe | Concierto, función o inauguración con sede y participantes propios |
| Exposición visitable | Ficha propia; fechas de vigencia y disponibilidad de visita | La exposición, incluso después de la inauguración |
| Curso/taller | Ficha propia; sesiones identificables, con fechas y horas explícitas | El curso y su siguiente sesión; calendario completo al solicitarlo |
| Marco de festival | Ficha propia; periodo declarado y programa de actividades vinculadas | Festival y programa; cada actividad conserva dirección propia |
| Convocatoria | Identidad propia; plazo y condiciones de postulación | Oportunidad y enlace oficial; su cierre no es una función presencial |

«Concierto», «exposición» o «taller» describen la actividad; su estrategia temporal es otro dato. Un taller puede ser puntual o tener sesiones. «Festival» en el título propone una agrupación, pero no acredita un programa ni vuelve cultural un contenido que incumpla la [definición](../DEFINICION.md).

## 2. Identidad, relaciones y autoridad

Este es un modelo lógico para acordar comportamiento, **no un diseño SQL aprobado**. Se conserva Postgres/Supabase y las fichas existentes. No hace falta introducir un motor de grafos ni una entidad distinta para cada disciplina.

Cada actividad conserva identificador, dirección estable, autor, visibilidad, título, clasificación confirmada, tiempo y relaciones. Sus datos y conexiones indican fuente, fragmento que los respalda cuando exista, responsable de la confirmación y correcciones. Confirmar la extracción acredita el anuncio; no acredita por sí mismo que ocurrió.

| Relación | Alcance y regla |
| --- | --- |
| Actividad **forma parte de** festival | Programa; no convierte todos sus artistas o sedes en participantes de cada acto |
| Apertura **inaugura** exposición | Una apertura puede inaugurar varias exposiciones; la exposición puede existir sin apertura registrada |
| Actividad o sesión **ocurre en** lugar | Sede efectiva de esa unidad, no todas las sedes del festival |
| Artista/grupo **participa en**, con papel | Actúa, expone, imparte u organiza según fuente; no inferir presencia física diaria del expositor |
| Individuo **integra** grupo | Membresía con periodo y papel; pertenece al proyecto de Artistas |
| Individuo **participa en** actividad como parte de grupo | Formación de esa actividad; requiere evidencia específica y no sustituye la membresía |

Para la primera versión se recomienda un marco principal por actividad y sin festivales anidados. Las relaciones «inaugura» son independientes y pueden ser múltiples. Se impiden autoasociación, ciclos y enlaces a fichas ocultas o privadas no autorizadas. No se amplía a un editor general del grafo.

**Permisos recomendados:** quien crea un festival puede confirmar junto con sus actos nuevos. Vincular un acto propio a un festival ajeno propone una asociación: la confirma quien administra el marco o el administrador. Mientras esté pendiente, el acto puede publicarse por sí mismo y no aparece agrupado como asociación confirmada. La lectura de un programa no concede edición de actos ajenos. Asociar un registro existente conserva su autor y necesita el permiso correspondiente para cualquier cambio en ese registro.

Ocultar o retirar un marco elimina su presentación pública y la agrupación visible, sin borrar actos independientes. Retirar una relación no elimina sus fichas. Correcciones o retiros de participantes se reflejan también en las consultas de historial; el archivo no recupera información cuya exposición se retiró.

## 3. Tiempo: cuándo existe y cuándo se puede asistir

### Exposición y apertura

La vigencia usa fechas locales de inicio y cierre, con cierre inclusivo para el público. Las franjas de visita usan zona horaria y horarios aplicables. La apertura es una actividad puntual aparte. No se extiende una inauguración hasta el último día de la muestra, ni se convierte la vigencia en asistencia continua.

Una exposición puede publicarse con periodo y lugar confirmados aunque falten horarios: «Hasta el 30 · Horario por confirmar». Si únicamente hay evidencia de la inauguración, se publica la apertura; la posible exposición queda como borrador pendiente. No inventar fecha de cierre ni mantenerla activa indefinidamente porque el título diga «temporal».

### Taller con sesiones

Un curso con inscripción única conserva una ficha; sus sesiones tienen identidad interna, fecha, hora y sede aplicable. Las sesiones heredan datos comunes solo cuando la fuente permite proponerlos y la persona los confirma. Una excepción de sede o de docente se conserva en la sesión correspondiente.

No hay sesión en un día intermedio sin evidencia. Una frecuencia explícita, por ejemplo «los sábados de noviembre», permite preparar fechas concretas para revisión; no autoriza recurrencia infinita. Días cancelados o reprogramados se muestran en el calendario solicitado.

Si cada función/taller admite asistencia o inscripción independiente, se recomienda representarlos como actividades propias dentro del programa. Tener títulos similares o compartir docente no prueba que constituyan un curso.

### Festival y programa parcial

El periodo del marco procede de una fuente confirmada. El intervalo entre el primer y último acto conocido sirve para resumir **el programa registrado**, sin presentarlo como duración completa del festival. Un solo acto permite proponer un marco con identidad, sin inventar el resto del programa.

Se puede publicar un programa parcial y añadir actividades después. Debe decirlo: «Programa registrado: 3 actividades». Un marco sin actos confirmados no promete actividad para un día, sede o artista. El festival multisede conserva sede por acto; cambiar la descripción del marco no mueve automáticamente los actos.

Para la primera etapa se recomienda publicar el marco con al menos un acto confirmado, aunque el periodo completo del festival sea desconocido. Un nombre sin periodo ni actividades queda como borrador; no produce por sí solo una fila de agenda.

### Convocatoria

Conservar convocante, destinatarios, condiciones y enlace oficial cuando consten. La apertura puede ser desconocida. El cierre necesita fecha y, si se anuncia, hora y zona; sin hora no se inventa «23:59». Una oportunidad sin plazo claro puede conservarse como borrador, sin afirmar que sigue abierta. Su eventual exposición o ceremonia se vincula como actividad distinta.

## 4. Contratos mínimos con Lugares y Artistas

### Horarios del lugar: enriquecimiento reutilizable

Lugares aporta identidad, ciudad/zona, ubicación pública y, cuando exista, horario confirmado: días de semana, franjas, periodo de aplicación, cierres o excepciones, fuente y confirmación. Eventos lo consulta una vez y lo reutiliza; **registrar horarios no es requisito para publicar un evento**.

Para una exposición sin horario propio, se propone usar el horario del lugar dentro de su vigencia, previa confirmación de que aplica a esa muestra. Un horario particular de la actividad prevalece sobre el general. No se suman fuentes contradictorias para fabricar una ventana más amplia. Un concierto explícito a las 20:00 puede ocurrir después del horario general: se señala la diferencia para revisar, sin cancelar ni sustituir automáticamente su hora.

Confirmar que un horario existente aplica a la exposición modifica su disponibilidad; no concede edición del horario general del lugar. Proponer un horario nuevo para la ficha de Lugar requiere confirmación de quien tenga permiso sobre esa ficha. Mientras se resuelve, la actividad puede conservar horario particular respaldado o disponibilidad desconocida.

La disponibilidad conserva la versión o periodo del horario utilizado. Cambiar el horario actual no reescribe lo que se anunció en el pasado. Para futuras fechas afectadas, el sistema puede proponer una actualización y pedir confirmación cuando altere el horario publicado de la actividad.

| Afirmación pública | Evidencia necesaria |
| --- | --- |
| «Vigente» | Periodo confirmado que incluye la fecha |
| «Visitable hoy» | Vigencia y al menos una franja aplicable, sin cierre conocido que la contradiga |
| «Abierto ahora» | Franja vigente que incluye la hora, con información confirmada y sin excepción contradictoria |
| «Horario por confirmar» | Vigencia conocida, disponibilidad desconocida o irresuelta |

Estas etiquetas describen programación conocida, no una verificación presencial. Los futuros mini tours reutilizan ventanas confirmadas; no prometen una parada viable si falta disponibilidad suficiente.

### Grupo y personas: formación opcional

El identificador del grupo es suficiente para publicar su participación. El material que nombra miembros permite proponer fichas individuales reutilizables y su membresía, con el contrato de [Artistas](artistas.md#6-integrantes-de-grupos-y-atribución-individual). No pedir otra cuenta o ficha completa por persona ni conceder permisos sobre un artista personal al registrar la banda.

La lista general de miembros puede ayudar a preparar candidatos. **No acredita que todos tocaron en un evento.** Solo una fuente o declaración específica revisada vincula a una persona con ese acto. Una formación confirmada conserva grupo, individuo, papel y actividad/sesión; un invitado no se vuelve miembro permanente. Añadir integrantes después no asigna silenciosamente eventos antiguos a sus fichas.

### Historial: una evidencia, varias consultas

Cada actividad conserva lugar y participantes confirmados; ambas fichas consultan esas mismas relaciones. No se crean copias independientes de historial para cada proyecto. La información anunciada queda distinguida de realización confirmada, cancelación o estado desconocido. El paso del tiempo no cambia automáticamente «anunciado» a «realizado».

El papel y la unidad de participación importan: exponer una obra no implica estar físicamente cada día; impartir una sesión no acredita todas las sesiones. Un curso genera una actividad en el historial, con detalle de sesiones cuando proceda. Dos artistas en actos diferentes del mismo festival no «compartieron escenario». Incluso compartir un acto acredita coparticipación registrada, no cualquier colaboración profesional.

Mostrar o contar el curso como una actividad no extiende créditos entre sesiones: docente, formación y lugar se atribuyen a la sesión acreditada. Dos docentes de sesiones distintas no comparten una presentación por aparecer en la misma ficha del curso. Las consultas de coincidencia conservan esta unidad concreta antes de agrupar resultados.

Los informes cuentan unidades explícitas: actividades, sesiones, días visitables, grupos o individuos. El marco no suma otra presentación a sus actos; el grupo y sus miembros no se mezclan como una cifra de personas. «Voy» es intención, no prueba de asistencia ni de realización.

Hoy una ficha pasada no es accesible públicamente en el recorrido común, aunque su registro se conserve. El archivo permitido es una dependencia de Artistas/Lugares; este modelo prepara relaciones sin abrirlo ni eludir retiros, restricciones de sedes o purgas de direcciones privadas.

## 5. Captura: el sistema prepara, la persona decide

La entrada sigue siendo aportar cartel/programa o escribir. El título activa una ayuda contextual con reglas ligeras; la IA se usa cuando aporta información, con límites de material y costo. No se llama por cada tecla ni se coloca primero un selector de tipo, marco, sesiones, horarios o miembros.

1. **Preparar.** Interpretar material como datos, extraer candidatos y conservar qué parte respalda cada uno. Separar datos explícitos, propuestas y ausencias. Buscar fichas y actividades antes de crear; ante homónimos, no vincular por el nombre solo.
2. **Resumir.** Presentar título, actividad propuesta, periodo o sesiones, sede y participantes en lenguaje natural. Para un programa, mostrar cuántos actos se encontraron y un resumen legible por acto: título, fecha/hora, sede y participantes. El detalle de fuentes y edición se solicita al tocar una parte.
3. **Resolver lo imprescindible.** Preguntar por la ambigüedad concreta que impide publicar la unidad elegida; permitir continuar con las demás. Horarios del lugar, formación completa, precio desconocido y programa completo son enriquecimientos opcionales. Lo ausente se dice, sin «Gratis» ni 19:00 como hechos.
4. **Confirmar el conjunto revisado.** Una acción confirma la versión presentada y las conexiones propuestas que se pudieron revisar. «Encontré 8 actividades» por sí solo no confirma sus fechas o artistas ocultos: antes se presenta la síntesis de los actos incluidos. No exigir un clic por campo ni publicar relaciones no mostradas.
5. **Guardar y continuar.** Publicar el conjunto aprobado de forma atómica e idempotente. Las unidades pendientes quedan fuera del lote, con su estado visible y borrador recuperable. Un fallo conserva la revisión y permite reintentar; no deja media publicación ni duplica fichas. Las correcciones manuales ganan a respuestas tardías de IA.

Escribir solo «Festival del vino» permite ofrecer «Parece un festival; agrega el programa para preparar sus actividades». No crea conciertos ni sedes. Escribir «Exposición temporal de X» permite proponer la clase y buscar artista/lugar; se solicitan únicamente los datos temporales indispensables que no estén ya en el material.

En un programa grande, la revisión se organiza por día o sede, con el estado de revisión de cada bloque. Esto revela complejidad real cuando hace falta; no oculta un formulario largo con preguntas repetidas. Reutilizar y corregir datos comunes reduce trabajo, conservando diferencias por acto.

## 6. Consulta: síntesis primero, programa al pedirlo

| Caso | Primera capa | Detalle solicitado |
| --- | --- | --- |
| Exposición | Título, lugar y «Hasta…»; disponibilidad honesta | Horarios, excepciones, artista expositor e inauguración relacionada |
| Curso | Título, siguiente sesión aplicable y alcance del curso | Calendario, docentes por sesión, inscripción y requisitos |
| Festival | Marco y siguiente acto que coincide con la búsqueda | Programa por día/sede y direcciones de actividades |
| Convocatoria | Título, convocante y «Cierra…» con precisión conocida | Requisitos y enlace para postular |

El filtro de fecha se aplica a sesiones o ventanas, según la pregunta de la persona. Una exposición vigente con horario desconocido puede aparecer como actividad vigente; no cumple un filtro que prometa «visitable hoy». Un curso no aparece como sesión en días vacíos. El filtro por artista o lugar selecciona actos y después los agrupa bajo el festival. El periodo del marco no crea una coincidencia artificial en un día sin actos.

Una búsqueda expresa del nombre del festival sí puede llevar a su ficha aunque el programa esté pendiente. No añadir un segundo resultado del marco a la lista de actos para inflar cifras. Mostrar «3 actividades del programa coinciden» permite comprender el alcance del resultado.

Se recomiendan clases dentro de la hoja de filtros existente y solo a demanda. La ficha de Lugar consume exposiciones vigentes y sesiones aplicables sin duplicarlas. El historial de artistas/lugares se abre al solicitarlo; no se añade por defecto una larga lista a las fichas de evento.

**Asistencia recomendada para la primera etapa:** «Voy» conserva su significado en actos puntuales e independientes. No marcar todo un festival al elegir un acto. En un curso de inscripción única o exposición, ofrecer «Me interesa» y el enlace de inscripción/visita; no inventar una sesión o día de asistencia. La asistencia por sesión o visita necesita una decisión y contrato propios, pues hoy [asistencias](../../supabase/migrations/20260913120000_base.sql) se identifica por usuario y evento. La convocatoria lleva a postular, sin «Voy».

## 7. Ejemplos conectados

Estos casos son **hipotéticos**, no cambios ni afirmaciones sobre registros reales.

**Exposición.** Un cartel indica «Exposición temporal de Ana: 5–30 de noviembre; inauguración el 5 a las 19:00, Museo X». La IA propone exposición, artista que expone y apertura relacionada. La persona confirma la síntesis. El museo tiene horario confirmado martes–domingo 10:00–18:00; se propone aplicarlo a la visita. El lunes la muestra sigue vigente, pero no se dice «visitable hoy». Ana obtiene una relación «expone» durante el periodo; no 26 presentaciones. Si el museo no tiene horario, ambas actividades siguen siendo registrables y la visita indica la ausencia.

**Festival y banda.** Una fuente anuncia Festival X del 5 al 7 y un concierto de Grupo Lumbre el 6 a las 20:00 en Foro Y. Se prepara un marco y ese acto; el programa es parcial. La reseña del grupo menciona Ana, voz, y Luis, bajo: permite proponer membresías, no acreditarlos en el concierto. Si el programa identifica esa formación y la persona la confirma, el acto conecta a ambos con el grupo y Foro Y. El historial del lugar muestra ese concierto; no todas las actividades del festival. Al filtrar por Luis el acto solo coincide si su participación específica está confirmada.

**Curso.** Un material anuncia cuatro sesiones en fechas no consecutivas, con inscripción única. Se prepara una ficha y cuatro sesiones, sin actividades en los huecos. Si una sesión tiene otra docente o sede, ese detalle no se extiende a las demás. La ficha resume la próxima sesión y permite abrir el calendario.

## 8. Compatibilidad y orden de implementación

La base actual exige [`eventos.inicio NOT NULL`](../../supabase/migrations/20260913120000_base.sql). [Fechas](../../src/lib/fechas.ts) calcula fin efectivo y caducidad; [la ficha](../../src/app/eventos/[id]/page.tsx) restringe acceso pasado. Un periodo sin hora propia y un marco agrupador no encajan automáticamente en ese supuesto. **No guardar medianoche o 19:00 como hora pública ficticia para sortearlo.** Antes de migrar, acordar la representación física y adaptar las lecturas; cualquier límite interno de consulta debe mantenerse separado del horario que se comunica.

Se recomienda ampliar la regla de fecha y hora para estos casos: hora obligatoria en actos/sesiones; fechas locales de vigencia en exposiciones/marcos; plazo con su precisión real en convocatorias. Esta es una propuesta que el founder debe aceptar y registrar en la definición antes del código. Los eventos simples actuales conservan su comportamiento.

| Pieza futura | Entregable y dependencia | Migración | Evidencia de cierre |
| --- | --- | --- | --- |
| E1, este documento | Acordar unidades, horarios opcionales, formación específica, permisos y asistencia | Ninguna | Los ejemplos se representan sin horas ficticias, créditos automáticos ni preguntas permanentes |
| E2, interpretación | Salida estructurada, evidencia, clasificación contextual y coincidencias; casos reales anonimizados o sintéticos | No para evaluación de borradores | Datos ausentes, programas parciales, duplicados, más de seis participantes y gestos tardíos; calidad y costo comparados con lectura actual |
| E3, persistencia | Periodos/sesiones, relaciones y fuentes; compatibilidad temporal; consumir horarios/membresías cuando existan | Sí, aditiva, tras aprobar el contrato físico | PostgreSQL/RLS: permisos, atomicidad, reintentos, correcciones, visibilidad y fechas/zona; sin truncar participantes |
| E4, recorrido de captura | Prototipo reservado y firmado por separado; después síntesis y corrección del conjunto | Ampliar guardado solo si el contrato lo exige | Registro completo desde material, ausencia de formularios repetidos, errores recuperables, lote revisado sin publicación parcial |
| E5, descubrimiento | Disponibilidad y agrupación; consultar unidades correctas por fecha/artista/lugar | Índices/RPC si medición lo justifica | Exposición tras apertura, curso con huecos, festival parcial/multisede; sin dobles conteos; calendario y compartir sin fechas ficticias |
| E6, convocatorias | Oportunidad propia, separada del mecanismo de asistencia; alcance C6 | Sí si se acepta registro propio | Plazos precisos, fuente oficial y postulación; no genera funciones ni visitas falsas |

Los horarios y membresías se implementan una sola vez en sus proyectos, o como una dependencia acotada expresamente reservada por el gestor. Su ausencia no debe impedir avanzar con actos/programas. No es necesario construir informes, exportaciones profesionales o mini tours para completar captura y consulta de Eventos.

Antes de publicar código futuro: verificar calendario, orden de agenda, fin efectivo, fichas/URLs, vista previa compartida, exportación de calendario, avisos, topes de lectura y participantes, permisos y retiros. No exportar una vigencia como una cita continua. Los avisos deben evitar una ráfaga por cada acto del lote; su resumen y destino requieren firma de producto. Las pantallas se prueban en móvil con carga, vacío, error, teclado y corrección de programas, después de aprobar el prototipo.

## 9. Decisiones propuestas para continuar

Se recomienda aceptar el modelo lógico de la sección 1 y los enriquecimientos opcionales de la sección 4. Permanecen por decidir, antes de implementar:

- La excepción temporal a «un evento tiene fecha y hora» y su compatibilidad con eventos actuales.
- La asociación a festivales ajenos mediante confirmación del gestor del marco/admin, sin transferir propiedad.
- «Me interesa» para cursos/exposiciones en la primera etapa, dejando asistencia por sesión/visita para un contrato posterior.
- Convocatorias como oportunidad propia y su alcance dentro de búsqueda/agenda.
- Quién puede confirmar realización y cuándo se abre archivo público: dependencias de trayectoria/informes, sin inferirlo del paso del tiempo.

Aceptar este documento no publica código ni reanuda por sí solo C5. El siguiente resultado revisable es un prototipo de captura y consulta reservado aparte; el modelo físico se concreta con las pruebas de contratos antes de migrar. [Índice y continuidad](README.md), [plan general de Eventos](eventos.md#8-plan-de-implementación-por-piezas).
