# Artistas: trayectoria, integrantes y presentación profesional

**Fecha:** 4 de octubre de 2026. **Estado:** investigación y propuesta; sin aprobación de implementación. [Índice y criterios comunes](README.md).

## 1. Petición y resultado buscado

Que la ficha construya una trayectoria útil: qué hizo el artista, dónde, cuándo, con quién y como integrante de qué proyecto. Permitir añadir antecedentes, preparar una reseña revisable o un texto para un booker y, más adelante, habilitar una presentación profesional descargable. Considerar a integrantes de grupos como artistas individuales con identidad reutilizable.

El historial desarrolla el [grafo cultural firmado](../DEFINICION.md): relaciones públicas con tipo y procedencia. No es un ranking, una lista de seguidores ni un seguimiento de personas que asistieron.

La complejidad debe vivir en el sistema: aprovechar eventos existentes, leer material y proponer vínculos antes de pedir campos. La ficha ofrece una entrada discreta a la trayectoria; los detalles y herramientas aparecen cuando se solicitan.

## 2. Capacidades comprobadas y límites

- Existen fichas de artistas individuales, grupos y colectivos, con ciudad y dirección legible. `eventos_artistas` vincula artista y evento; no expresa aún papel, procedencia, confirmación ni realización.
- La ficha muestra fechas próximas o en curso. Los eventos pasados pueden permanecer en la base, pero no se presentan como trayectoria; su página devuelve 404 al público salvo las excepciones actuales de permisos. Un archivo navegable necesita una decisión explícita.
- El calendario normal bloquea fechas pasadas, salvo conservar la original al editar. El servidor acepta fechas históricas válidas: eso no constituye un recorrido de antecedentes ya disponible.
- La lectura de cartel extrae nombres y propone fichas existentes o mínimas nuevas. Las nuevas se crean al publicar. Los gestos manuales están protegidos frente a respuestas tardías.
- El contrato actual admite seis artistas por evento. No extrae membresía, formación ni papel; cualquier ampliación debe evitar truncar participantes silenciosamente.
- `artistas_cuentas` conecta cuentas gestoras con fichas. No representa integrantes de un grupo. No existe hoy una relación artística de membresía entre fichas.

Fuentes: [ficha del artista](../../src/app/artistas/[id]/page.tsx), [acceso a evento pasado](../../src/app/eventos/[id]/page.tsx), [calendario](../../src/components/ui/Calendario.tsx), [modelo de artistas](../../src/lib/artistas.ts), [relaciones y gestión](../../supabase/migrations/20260914050000_artistas.sql), [lectura de cartel](../../src/lib/cartel.ts) y [protección de gestos](../../src/app/eventos/gestosFlyer.ts).

La [propuesta 44 de novedades](../rediseno/44-novedades-artista.md) es un antecedente distinto. Su cabecera aún dice propuesta, pero el código actual ya consulta y muestra `novedades_artista`. Esta investigación no la vuelve a encargar ni modifica el documento anterior; una publicación de audio o video no acredita por sí misma una participación histórica.

### Conexión con el primer avance de actividades

La [propuesta 42](../rediseno/42-festivales.md), entregada en [bitácora 186](../bitacora/2026/09/186-festivales.md), incluía varias salas y talleres/conciertos del EIMIM. Su aprendizaje útil para trayectoria es conservar identidad por acto. Estar vinculado al marco no acredita participación en todos sus actos, y las distintas salas necesitan papeles de exposición propios.

La [síntesis y evolución de Eventos](eventos.md#3-antecedentes-de-exposiciones-talleres-y-festivales) distingue esa propuesta detenida del soporte temporal ya implementado. Este proyecto toma de Eventos la unidad concreta, de [Lugares](lugares.md) la sede y disponibilidad, y añade crédito, fuente y formación. Un intervalo de exposición o curso no genera un crédito por cada día. El [mapa de antecedentes](README.md#antecedentes-conectados) permite consultar las fuentes sin asumir que la firma del grafo aprobó el modelo de festivales.

## 3. Qué significa hoy el KPI «Lugares»

**Cuenta los `lugar_id` distintos de las primeras 30 fechas visibles del artista que todavía no han terminado según su fin efectivo.**

No es un contador histórico. Excluye actividades sin `lugar_id`, como sitios libres o reservados. El cálculo no comprueba además si el lugar es público: cuenta el ID presente en la fila de evento. El límite de 30 puede omitir lugares de fechas posteriores.

«Fechas» usa ese mismo lote próximo o vigente. «Siguen» cuenta seguimientos actuales de la ficha; no asistentes ni colegas. «Lugares» es informativo y no tiene navegación propia. Evidencia: [consulta y KPI](../../src/app/artistas/[id]/page.tsx), funciones `cargarFechas` y `KpisArtista`; [bitácora 263](../bitacora/2026/09/263-ui-ficha.md).

**Propuesta:** separar claramente próximos e históricos. Si se conserva el KPI actual, precisar su significado con lenguaje o detalle contextual. Los nuevos totales deben agregarse sobre todo el conjunto permitido, sin depender de la tanda cargada. Un fallo de consulta se expresa como dato no disponible; no como cero. La etiqueta definitiva y su utilidad quedan a decisión del founder.

## 4. Trayectoria con revelación progresiva

La primera capa conserva identidad y próximas actividades, con un renglón **«Trayectoria»**. Al abrirlo se carga una primera tanda y se permite explorar:

| Vista solicitada | Qué expresa | Evidencia al profundizar |
| --- | --- | --- |
| Actividades | Cronología y papel desempeñado | Actividad, fuente y estado |
| Lugares | Espacios relacionados con actividades concretas | Cuándo y qué hizo allí |
| Actividades compartidas | Coincidencia en un acto identificable | Acto y papeles de cada participante |
| Grupos y colectivos | Membresías actuales o históricas | Periodo y formación acreditada por actividad |

«Compartió actividad con» es más preciso que «colaboró con». Estar en el mismo festival, lugar o mes no demuestra una actuación compartida. «Colaboró» requiere una declaración específica y sustentada. No se infieren conexiones personales a partir de seguidores o asistentes.

El papel distingue interpretar, exponer, impartir, curar y organizar. Exponer durante semanas no supone presencia física diaria. Ser quien publica no convierte a esa cuenta ni a su artista gestionado en participante.

También se distingue **anunciado** de **realizado**: el paso del tiempo no prueba que ocurrió. Los registros antiguos sin confirmación pueden mostrarse como «actividad registrada», con estado declarado. Una cancelación no figura como logro realizado. Las afirmaciones de un currículo respetan esos estados.

## 5. Añadir antecedentes sin repetir captura

Quien gestiona la ficha solicita **«Añadir actividad anterior»** dentro de su trayectoria. El sistema busca primero coincidencias y prepara una propuesta a partir de texto, cartel o programa. Si el evento existe, se propone el vínculo o la corrección permitida, sin editar libremente una actividad de otra persona. Si no existe, se prepara un antecedente mínimo revisable.

La revisión debe admitir «2021» o «marzo de 2021» sin inventar día ni hora. La precisión de la fecha se conserva como dato. Un antecedente incompleto no se introduce como evento futuro con fecha ficticia ni dispara avisos de nueva programación.

Esta capacidad cambia el supuesto actual de evento con fecha y hora de la [definición](../DEFINICION.md). Se recomienda un contrato de antecedente con precisión temporal propia, que pueda enlazarse a un evento existente; el founder debe elegir su representación antes de migrar. No se modifica aquí la definición.

La fecha de la actividad es distinta de la incorporación al sistema. La captura del pasado no modifica la cobertura automática: un aviso pequeño declara incompletitud y antecedentes añadidos. La primera actividad conservada no demuestra desde cuándo existe registro automático completo.

## 6. Integrantes de grupos y atribución individual

### Una persona, una ficha reutilizable

Conectar la ficha individual con uno o varios grupos mediante una relación temporal. Debe poder conservar integrante o invitado, papel, periodo conocido, precisión de fechas, fuente y confirmación. «Exintegrante» no obliga a inventar fecha de salida; un periodo desconocido tampoco equivale a membresía actual.

Un texto como «Ana, voz; Luis, guitarra» permite proponer el conjunto y buscar fichas existentes. Los homónimos quedan como candidatos, no como enlaces automáticos. Tras revisar, se crean solo las fichas mínimas faltantes; no se exige una cuenta ni formulario completo por integrante. La etiqueta actual «Solista» merece revisión: tener ficha individual no afirma una carrera solista.

### Membresía general y formación por actividad

**La membresía no acredita haber participado en todos los eventos del grupo.** Registrar aparte la formación concreta cuando un cartel, programa o responsable la sustente. Un invitado a un concierto no se convierte por ello en integrante permanente.

La continuación de [Eventos define el contrato mínimo](eventos-modelo.md#4-contratos-mínimos-con-lugares-y-artistas): el grupo puede publicarse sin formación individual; añadir miembros prepara identidades, pero los créditos históricos requieren participación específica confirmada. Esta dependencia no exige completar el proyecto de trayectoria ni concede gestión de fichas personales.

- Ser integrante hoy no concede conciertos anteriores a su ingreso.
- Coincidir con un periodo de membresía no prueba automáticamente cada actuación.
- Cambiar integrantes actuales no reescribe las formaciones históricas.
- La trayectoria individual recibe créditos de actividades acreditadas; puede mostrar membresía como antecedente distinto.

Así se pueden redactar afirmaciones diferentes y precisas: «Integró X entre…» y «Actuó con X en…». Las formaciones compartidas evitan duplicar o descontextualizar relaciones para artistas y [Lugares](lugares.md).

## 7. Procedencia, permisos y conservación

La IA prepara propuestas. La revisión y confirmación registra fuente, responsable de la declaración, fecha y estado. Confirmar un conjunto es válido si la persona ve qué relaciones contiene; las ambigüedades requieren intervención específica.

Gestionar un grupo no concede gestión de las fichas individuales. Añadir integrantes no inserta cuentas en `artistas_cuentas` ni modifica reseña, fotografía o enlaces de un artista reclamado. Debe existir salida para corregir identidad, reclamar o retirar una atribución.

Hay un riesgo en reutilizar sin cambios la creación mínima actual: fija `creado_por` al publicador y el creador tiene permisos de gestión. La nueva captura de integrantes debe definir autoría, responsabilidad y transición al reclamar la ficha; no ampliar derechos sobre fichas ajenas. [Permisos de gestión](../../supabase/migrations/20260914050000_artistas.sql), [creación mínima actual](../../supabase/migrations/20261003130000_sitio_privado_purga.sql).

Historial y exportaciones respetan ocultación, retiro y borrado. No publican perfiles privados de asistentes, contactos privados ni direcciones reservadas. No mantienen un archivo paralelo para reconstruir datos retirados. La conservación de eventos y desvinculación de lugares se detalla en [bitácora 285](../bitacora/2026/10/285-seguridad-purga-sitio.md) y [286](../bitacora/2026/10/286-seguridad-borrado-excepcional.md).

## 8. Reseña y presentación profesional

Al solicitarlo, el artista selecciona antecedentes y el sistema prepara texto para compartir, enlace o PDF. Después puede ofrecer **«Preparar una reseña»** como borrador basado en esas actividades, papeles y fuentes.

El artista revisa tono, selección y exactitud; la reseña actual no se sobrescribe automáticamente. No se inventan prestigio, impacto, colaboraciones ni cifras. Cada afirmación debe poder rastrearse a los registros seleccionados y distinguir lo realizado de lo anunciado.

El booker accede a una presentación pública y descarga solo si el artista habilitó esa opción. La gestión de selección, borrador y exportación no ocupa la ficha pública por defecto. El documento indica fecha de elaboración y alcance; no aparenta ser una certificación exhaustiva.

## 9. Plan de implementación por piezas

| Etapa | Qué toca y entregable | Migración | Prueba que la cierra | Decisión del founder |
| --- | --- | --- | --- | --- |
| A1. Contratos y ejemplos | Datos: vocabulario de papeles, procedencia, estados, fechas parciales, membresía y formación | No; diseño documental | Concierto, exposición, taller, cancelación y cambio de integrantes no producen atribuciones falsas | Qué acredita realización; representación de antecedentes; sentido del KPI |
| A2. Relaciones verificables | Datos/IA: añadir papel, fuente y confirmación; mejorar identidad y conservar revisión | Sí, aditiva, coordinada una vez con Eventos | Contratos PG/RLS, homónimos, corrección de relaciones y persistencia de procedencia al editar | Quién confirma/corrige cada relación y autoridad de captura |
| A3. Trayectoria pública | Consultas/pantalla: prototipo de apertura progresiva; archivo público permitido; totales completos y paginados | Evaluar índices/RPC; reutilizar A2 | Más de 30 registros, pasado, cancelaciones y ocultaciones; lista y total coinciden; abrir ficha no descarga todo | Acceso a archivo de eventos; texto de estados y firma del recorrido |
| A4. Antecedentes | IA/datos/pantalla: buscar, vincular o preparar actividades anteriores; revisión compacta | Sí si se aprueba precisión parcial o registro propio | Año/mes sin fecha inventada; reintento sin duplicados; sin avisos históricos ni edición ajena | Excepción a fecha/hora, nivel de evidencia y visibilidad |
| A5. Grupos y formación | Datos/IA/pantalla: relaciones entre fichas y participantes acreditados por actividad; revisión en conjunto | Sí, aditiva; revisar límite de participantes | Cambio de miembros no reescribe pasado; invitación no crea membresía; no hay permisos cruzados ni truncamiento | Confirmación de miembros, etiqueta individual y transición al reclamar |
| A6. Presentación profesional | IA/pantalla/exportación: seleccionar registros, generar texto/PDF y reseña revisable; descarga opcional | Solo si se necesita persistir selección, versión o habilitación | Afirmaciones trazables; ningún dato privado; bio intacta hasta aceptación; descarga respeta elección | Formatos, disponibilidad para bookers y firma del flujo |

Cada pantalla futura pasa por prototipo y aprobación antes del código. Las pruebas se enfocan en los contratos afectados, permisos y atribuciones; la revisión visual incluye errores, vacíos, carga, teclado y datos largos en móvil. Aplicar migraciones o publicar mantiene su autorización específica.

## 10. Dependencias y límites

Los papeles y la procedencia son comunes a [Eventos](eventos.md) y [Lugares](lugares.md); se implementan una vez. La formación concreta alimenta créditos individuales y estadísticas del espacio. El archivo permitido debe compartir las mismas reglas de visibilidad en pantalla y exportaciones.

Prioridad sugerida: relaciones confiables y trayectoria consultable antes de redactar currículos con IA. Los riesgos principales son homónimos, fuentes contradictorias, convertir anuncios en hechos, atribuir toda la historia de un grupo a sus integrantes actuales y conceder permisos por capturar una ficha. Esta propuesta no introduce puntuaciones de carrera ni verificación de asistentes.

Para un agente que retome esta pieza: seguir la [ruta de lectura común](README.md#ruta-de-lectura-para-un-agente-nuevo), comprobar el significado vigente del KPI en el código y elegir una etapa. Las fuentes históricas explican el origen; las reglas públicas, permisos y estado de implementación se revalidan en la base asignada.
