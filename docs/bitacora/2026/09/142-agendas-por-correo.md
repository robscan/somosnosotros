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

Aceptada por el gestor («OL-107 aceptada»); PR [#131](https://github.com/robscan/somosnosotros/pull/131) abierto y unido a `main` con el visto bueno del founder.

## Segunda pasada (2026-09-21, rama `agendas-por-correo-2` desde `origin/main` con el PR #131 ya unido)

Decisiones del founder tras revisar la primera entrega (relevadas por el gestor):

1. Los buzones compartidos se mandan como un correo por organismo (SECULT, UASLP, municipios), no uno por sede.
2. Segunda pasada de investigación, sede por sede, para las que en la primera quedaron con un buzón compartido asumido.
3. Texto aprobado con dos cambios: enlace a la ficha de la institución en la plataforma, y firma con persona — «Oscar Muñiz Blanco · Coordinación de agenda · Somos Nosotros · somosnosotros.org · {teléfono}» (el teléfono real no entra al repo).
4. Dos variantes de mensaje: institución (correo propio) y organismo (varias sedes, pide reenvío o contacto).
5. Ritmo: todo el mismo día, con 3 correos de comprobación técnica primero; revisar cómo mandó el CAPO y decir qué haría falta para reutilizarlo, sin construirlo.

**Segunda pasada de investigación:** de las 30 sedes que en la primera entrega quedaron con un correo de hub asumido (Secretaría de Cultura del Estado, UASLP, Ayuntamiento, Soledad), **25 tienen correo propio con fuente propia** (su ficha exacta en el Sistema de Información Cultural, su sitio o su Facebook) — el "buzón compartido" casi no existía, solo faltaba mirar la ficha de cada sede en vez de asumir el correo general de quien la administra. Quedaron **5 con un correo de una persona con nombre, no institucional** (Museo de Sitio UASLP, Casa de Cultura del Barrio de Tlaxcala, Teatro Carlos Amador — que parece administrado por el DIF Estatal, no por SECULT —, Auditorio Rafael Nieto y Centro Cultural Palacio Municipal): anotadas aparte, sin usar, con el buzón general del organismo que sí las cubre como alternativa (el de Difusión Cultural de la UASLP para las dos de la UASLP, el de contacto de la Secretaría de Cultura del Estado para Tlaxcala) — ambos correos viven solo en la lista fuera del repo.

Resultado final: **42 de 47 con correo propio verificado, 5 a decisión del founder.** Con eso, el correo "por organismo" de la decisión 1 aplica a un grupo chico (2–3 correos, no un lote grande): la estimación de "23–25 correos" que se hizo antes de esta pasada ya no aplica — son unos 44–45 (42 individuales + 2–3 por organismo).

**Enlace a la ficha:** revisado el código (`src/app/lugares/[id]/page.tsx`), la ruta es `https://somosnosotros.org/lugares/<id>` con un UUID, no un slug con nombre. Hace falta el `id` de producción de las 47 filas — pedido al gestor en el doc 31 (consulta de solo lectura, `begin…rollback`, solo `id` y `nombre` de lugares, sin datos de personas).

**Puesto de la firma:** el founder eligió «Coordinación de agenda», relevado por el gestor; ya está en el doc 31 y en los dos borradores de mensaje.

**Reutilizar el envío del CAPO:** revisado `scripts/capo/invitar.ts` — `cargarEnv()`, `mandarCorreo()` (Resend), `enmascarar()` y el patrón `--ensayo`/`--enviar` se pueden reutilizar tal cual. Falta (no construido en esta pieza): un archivo de datos con las 47 filas y sus 2–3 agrupaciones por organismo (en vez de una consulta a Supabase, porque la lista es fija y corta), una función que arme el cuerpo según la variante, y una tabla nueva tipo `invitaciones_enviadas` para no repetir un envío — con su migración, sin aplicar.

**Entregado:** `docs/rediseno/31-agendas-por-correo.md` actualizado con las 5 decisiones, la tabla de organismos, el enlace a la ficha (pendiente de los `id`), las dos variantes de mensaje con firma y enlace, el plan de envío de un solo día con prueba técnica, y la revisión de reutilizar el script del CAPO. Lista de correos actualizada en el scratchpad del operador (misma ruta que antes, contenido reemplazado con la segunda pasada).

Reglas seguidas: ningún correo enviado, ningún dato de producción leído directamente (el pedido de `id` de lugares queda para que el gestor lo resuelva), `git add` por nombre, sin subagentes.

## Firma (segunda pasada)

Recibida por el gestor: «buen hallazgo lo de las fichas SIC por sede», con tres pedidos.

## Tercera revisión (2026-09-21, mismo día)

1. **Ids de producción:** el gestor leyó producción (solo lectura) y entregó `id`, `nombre` y `visible` de las 47 instituciones del catálogo. Salieron **46**, todas visibles; **la Alianza Francesa de San Luis Potosí no tiene ficha en producción hoy** (ni con nombre parecido) — se saca del envío y se anota aparte para que el founder decida si se da de alta. Los `id` (UUID) no entran al repo: se añadieron como columna nueva en la lista del scratchpad, con el enlace `https://somosnosotros.org/lugares/{id}` ya armado por institución.
2. **Dos correos de instituciones que se habían colado en el commit 827f4ab** (uno de la UASLP, uno de la Secretaría de Cultura, en la tabla de organismos del doc 31): aunque son públicos, la regla de la pieza es que ninguno entra al repo. Corregido con `git commit --amend` (el commit no estaba subido) y la tabla ahora dice "el buzón general de Difusión Cultural" / "el buzón de contacto de la Secretaría", con el correo exacto solo en la lista fuera del repo.
3. **Lista fuera del repo:** cada uno de los 41 correos individuales queda con su URL exacta y su fecha de consulta (ya lo traía la segunda pasada); se agregó una tabla final de **orden de envío** — primero los 3 correos de comprobación técnica (elegidos entre instituciones donde un fallo no cuesta nada, no las que ya tenían agenda pendiente de capturar), luego el resto en el orden de la lista.

**Conteos corregidos** (46 fichas en producción, no 47): 41 correos individuales verificados, 5 a decisión del founder (sin cambio, ninguno era la Alianza Francesa), unos 43–44 correos en total con los de organismo. Doc 31 y esta bitácora actualizados; commit local con `--amend` sobre el mismo commit de la segunda pasada (sin duplicar historia, porque no estaba subido).

Reglas seguidas: ningún correo institucional en el repo (corregido), ningún dato de producción leído por este operador (lo leyó el gestor), sin subagentes.

## Firma (tercera revisión)

Pendiente del gestor y del founder.
