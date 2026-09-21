# 142 · Agendas de las instituciones por correo

**Fecha:** 2026-09-21 · **Rama:** `agendas-por-correo` (base `origin/main`, `841d4ca`) · **Pieza:** OL-107 (D1)

## Qué pidió

Tanda D, encargada por el founder («Adelante Tanda D… Para que corra paralelo a desarrollo. Ya estamos listos para convocar»), pieza L38 de su lista: investigar los correos de las instituciones del catálogo, redactar el mensaje pidiendo su agenda mensual (los flyers bastan) y un plan de envío por tandas, como se hizo con el CAPO. Solo documentos: nada se envía, nada de código de la app.

## Cómo se trabajó

Avisado al «Gestor de cambios II» al arrancar; visto bueno recibido con los números (OL-107 / bitácora 142, rama `agendas-por-correo`), modelo Sonnet 5 y esfuerzo medio. Leídos primero `CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, `docs/ops/ASIGNACIONES.md` (fila de esta pieza), `docs/ops/COLA_DE_PIEZAS.md` (D1 y L38 del anexo), `docs/rediseno/24-grafo-cultural.md` (captura de agendas con sus dos candados: lo que propone la IA se confirma antes de publicarse, y el gasto tiene tope), y cómo se hizo la invitación del CAPO (`scripts/capo/invitar.ts`, bitácora [056](056-invitacion-capo.md)) y el alta de instituciones (`scripts/instituciones/`, bitácora [032](032-instituciones-y-agendas.md)).

## Qué se entregó

1. **[`docs/rediseno/31-agendas-por-correo.md`](../../../rediseno/31-agendas-por-correo.md):** a quién se escribe (las 47 instituciones ya dadas de alta, de `scripts/instituciones/lugares.json`), qué se les pide (agenda del mes, en el formato que ya tengan), a qué buzón contestan (el remitente que ya usa Resend, no uno nuevo), cómo entra lo que manden a la app (una persona sube el cartel a "Registrar evento", la IA propone y una persona confirma — sin automatizar la lectura del buzón, eso sería otra pieza), plan de tandas (prueba de 5, luego 10–12 por semana, un recordatorio único a los 12 días) y qué se mide.
2. **Borrador del mensaje:** dos variantes de asunto, cuerpo corto y llano (qué es Somos Nosotros, de dónde salió su ficha, qué se pide, cómo decir "no me escriban más"), y un recordatorio único que no insiste dos veces.
3. **La lista de las 47 instituciones con su correo público oficial y su fuente**, investigada con búsquedas priorizando directorios que dan varios correos de una vez (el Sistema de Información Cultural federal sic.cultura.gob.mx, la página de contacto de la Secretaría de Cultura del Estado, el directorio de la UASLP, las fichas municipales) en vez de buscar institución por institución cuando compartían organismo. **No se comitea:** queda en el scratchpad del operador, ruta avisada al gestor por SendMessage.

## Cómo quedó la lista (sin correos, solo conteo)

47 de 47 con correo propuesto. 19 con correo propio verificado en su sitio o ficha; 27 comparten el correo de quien las administra (17 Secretaría de Cultura del Estado, 7 UASLP, 2 municipio de Soledad, 1 Ayuntamiento de San Luis Potosí); 1 marcado a verificar antes de usarse (el del Ayuntamiento tiene forma de alias personal, no institucional, y se anotó pedir uno mejor o que el founder lo confirme). Ningún correo personal se usó a propósito. Quedó anotada una advertencia: mandar 17 o 7 copias casi iguales al mismo buzón puede leerse como spam; el founder y el gestor deciden si se manda una invitación por hub (pidiendo que la reenvíen) o una por institución, como se hizo con el CAPO.

## Reglas seguidas

Ningún correo enviado ni formulario llenado. Producción no se tocó: la lista de 47 instituciones salió de `scripts/instituciones/lugares.json` y de la bitácora 032, no de una consulta a la base — no hizo falta pedirle nada al gestor sobre `begin…rollback`. Ningún secreto impreso ni copiado; el `.env` real no entró a esta carpeta. `git add` por nombre. Sin subagentes, sin council ni workflows (costo, regla del founder).

## Evidencia

Solo documentos: no aplica build ni pruebas. Revisar el diff (regla del founder, 2026-09-18: documentación sola no exige build ni unitarias).

## Queda

- Que el founder firme el texto (variante de asunto) y decida cómo tratar los correos de hub antes de mandar nada.
- Confirmar o reemplazar el correo del Ayuntamiento de San Luis Potosí (fila 34 de la lista).
- Cuando haya firma: aplicar el mismo patrón que `scripts/capo/invitar.ts` (plantilla, script con `--ensayo`/`--enviar`, tabla de invitaciones enviadas) — no se construyó en esta pieza porque era solo investigación y documentos.

## Firma

Pendiente del gestor y del founder.
