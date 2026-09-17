# Administración · lista de fricciones e indicadores propuestos (v1: para la corrección del founder)

**Fecha:** 2026-09-16 (noche) · **Pedido del founder:** "Quiero que me ayudes a trabajar la sección de administración de la app, actualmente tengo algunos listados con información, pero me falta ver usuarios por ejemplo, analiza y cuestiona ese panel, propón nuevos datos y KPI's para mostrar, por último crea un diseño que facilite lectura, sin comprometer en ningún momento las otras acciones, incluye una opción para volver admins a usuarios." · **Pantalla:** `/admin` (Ajustes › Somos Nosotros › Administración) · **Mirada:** el panel corriendo en la Mac (rama `panel-admin`) a 390×844, con una sesión de administrador inventada y datos inventados, sin conexión a producción; más los conteos de producción leídos una sola vez, solo lectura, sin nombres ni correos · **Base:** pruebas de cada fase en [PLAN](../PLAN.md), [DEFINICION](../DEFINICION.md), revisión del [2026-09-14](../ops/REVISION_2026-09-14.md) · **Decisiones:** [19-administracion-flujo-y-estados.md](19-administracion-flujo-y-estados.md) · **Prototipo:** [prototipos/administracion.html](prototipos/administracion.html) (publicado para el iPhone en https://claude.ai/artifact/PcgGzqamg82XpZ5yDFkTUn) · **Quién decide:** el founder corrige, tacha y firma.

## Diagnóstico

El panel es una lista de "lo último" con números que no dicen la verdad. "10+ lugares" es el largo de la lista, no lo que hay: hay 58 lugares, 85 eventos y 522 artistas. Los 12 "voy" que presume son todos de tu cuenta. No hay personas, no dice qué atender y deja 30 botones "Ocultar", sin confirmación, al paso del pulgar.

**La propuesta, en una línea:** un resumen que se lee en una pantalla (lo pendiente, cuatro indicadores ligados a las pruebas del plan, cuatro entradas para gestionar), listas con búsqueda y filtros, y la ficha de cada persona, donde se hace administrador a alguien (o se le quita) con una confirmación.

## Lo medido en producción (16 de septiembre, 19:30)

Conteos agregados, leídos con la llave de servicio y sin escribir nada. No se leyó ningún nombre ni correo.

| Qué | Hoy | Qué dice |
|---|---|---|
| Cuentas | 5, una de ellas administradora | Las 5 se crearon desde el 13 de septiembre. Una nunca entró: no confirmó su correo. |
| Entraron en los últimos 7 días | 4, contando la tuya | Sin contarte: 3 de 4. |
| Avisos | 2 personas en el teléfono (5 teléfonos) y 1 por correo | 0 bajas, 0 rebotes, 0 quejas. |
| Perfiles | 2 con foto, 2 con "sobre mí", 0 reservados | |
| Lugares | 59: 58 visibles, 1 oculto, 0 privados | 49 los diste de alta tú, 1 otra persona y 9 vienen del catálogo. 12 no tienen foto. 17 de 58 tienen alguna fecha próxima. Ninguno lo lleva su gente. |
| Eventos | 85 próximos, 0 ocultos | Los 85 los publicaste tú. 36 caen en los próximos 7 días. 70 no tienen imagen. |
| Artistas | 522 | 520 del catálogo. 1 lo lleva su gente. 211 sin foto. 15 invitaciones enviadas. |
| "Voy" | 12, y 1 "me interesa" | Los 12 son de tu cuenta. Ningún evento tiene 2 personas o más. |
| Seguimientos | 62, de 3 personas | 59 a lugares y 3 a artistas. |
| Reportes y reclamos | 0 | Nunca ha llegado uno. |

## Lo que ya funciona

- Solo entra el administrador. La página y cada acción lo comprueban en el servidor, y la base de datos lo exige otra vez.
- Pasar una ficha a quien la reclama es un toque y deja la ficha ligada a esa cuenta (bitácora [054](../bitacora/2026/09/054-reclamar-lugares.md)).
- Ocultar y mostrar desde el panel actualiza al momento el mapa, la agenda y la ficha.
- Los reclamos se leen según su ficha ("Dice que es su espacio y quiere llevar la ficha").

## Resumen por severidad

| # | Dónde | Fricción | Ley | Severidad | Propuesta en una línea |
|---|---|---|---|---|---|
| N1 | Cabecera | "10+ lugares · 10+ eventos · 10+ artistas" es el largo de la lista; hay 58, 85 y 522 | Evidencia | Alta | Totales reales, cada uno en su renglón de Gestionar |
| N2 | Cabecera | "12 voy · 62 seguimientos" suma tu actividad como si fuera de la comunidad: los 12 "voy" son tuyos | Evidencia | Alta | Los indicadores de la comunidad no cuentan a los administradores y lo dicen |
| P1 | Todo el panel | No hay personas: ni quién se registró, ni si volvió, ni cómo encontrar a alguien | Pedido · UX invisible | Alta | Personas: lista con búsqueda y filtros, y la ficha de cada una |
| P2 | Todo el panel | Hacer administrador a alguien solo se puede con SQL | Pedido · Prevención | Alta | Desde la ficha de la persona, con una hoja que dice qué podrá hacer |
| R1 | Reclamo | El título se corta: el enlace "ver" queda fuera de lo visible (medido) y el mensaje, en una línea | Evidencia | Alta | El nombre de la ficha como enlace propio y el mensaje completo |
| R3 | Reporte | Tres acciones con el mismo peso y "Ocultar" en medio, pegada a las otras dos | Fitts · Hick | Alta | Dos salidas separadas: dejarla como está y la acción |
| L1 | Listas | 30 "Ocultar" sin confirmación en el camino del pulgar: un roce oculta una ficha del mapa | Lo destructivo detrás de una capa | Alta | Las acciones en "···", el mismo menú de las fichas |
| D1 | Rol | ¿Quién puede hacer y quitar administradores? | Prevención | Por decidir | **Recomendada B:** solo las cuentas de origen (las tuyas) |
| D2 | Personas | ¿El panel muestra el correo de cada persona? | Privacidad · Evidencia | Por decidir | **Recomendada A:** oculto en la lista, completo al tocar "Ver" |
| D3 | Indicadores | ¿Guardamos el último día que alguien abrió la app? | Evidencia · Privacidad | Por decidir | **Recomendada A:** solo el día, solo para administración |
| N3 | Cabecera | Seis números en una línea corrida, sin periodo, sin comparación y sin decir si está bien | Miller · Hick | Media | Cuatro indicadores de los últimos 7 días, cada uno con qué cuenta y cómo va |
| N4 | Todo el panel | No dice qué atender: lista "lo último" en vez de lo que pide una acción | UX invisible | Media | Cada renglón dice lo que pide atención ("41 sin fecha próxima") |
| R2 | Reporte | No dice qué ficha: "No es cultural · lugar · ver", sin nombre; para decidir hay que salir y volver | Evidencia · Hick | Media | La ficha por su nombre y su tipo, y quién reportó como enlace |
| R4 | Reporte | "Ocultar" no cierra el reporte: son dos toques y nada confirma lo hecho | Peak-End · Evidencia | Media | "Ocultar la ficha" cierra el reporte y deja una línea con lo hecho y "Mostrar" |
| L2 | Listas | El estado se lee en el verbo: la fila oculta solo cambia "Ocultar" por "Mostrar" | Evidencia | Media | Etiqueta "Oculto" junto al nombre |
| L3 | Listas | Solo los 10 últimos de cada tipo: sin buscar, sin filtros, sin autor; los eventos enseñan su fecha y no cuándo se publicaron | Hick · UX invisible | Media | Una lista por tipo con búsqueda y filtros por lo que pide atención |
| L4 | Listas | 20 filas se salen 16 px del margen derecho (medido) | Maquetación | Media | Grid con áreas y nombre recortado dentro de su columna |
| A1 | Acciones | Tocar no da señal, un error no se dice y un éxito tampoco | Doherty · Evidencia | Media | En camino al tocar, error en línea con reintento, línea de lo hecho |
| R5 | Reclamo | Reclamo y reporte se leen igual: "Reportó" alguien que pide su ficha, y se ofrece "Ocultar" | Similitud · Hick | Baja | Verbo e icono propios: "Pide llevar la ficha" |
| A2 | Barra | Sin historia, "Atrás" lleva a la Agenda; la pantalla madre es Ajustes | Topografía de navegación | Baja | Atrás a Ajustes |
| A3 | Ajustes | El renglón "Administración" usa la estrella de Artistas | Jakob | Baja | Icono de tablero y el renglón dice lo pendiente |

## Qué medir: indicadores propuestos

**Criterio.** Un indicador entra solo si responde una pregunta que tú decides. Los cuatro primeros son las pruebas del [PLAN](../PLAN.md) convertidas en número:

- **Fase 3:** "el primer evento publicado por alguien que no es el founder".
- **Fase 4:** "dos personas coincidieron en un evento".

Reglas para todos:

- La comunidad se cuenta sin administradores. Si no, tu propia actividad infla todo (N2).
- Números absolutos con su base ("3 de 4"), no porcentajes. Con cuatro personas, un porcentaje exagera.
- Periodo explícito: los últimos 7 días, comparados con los 7 anteriores.
- Sin gráficas hasta tener 4 semanas de historia. Hoy habría una semana: la gráfica prometería una tendencia que no existe.

### En el resumen, a la vista (capa a)

| Indicador | Qué cuenta, exactamente | Hoy | Qué decisión mueve | Prueba |
|---|---|---|---|---|
| **Personas activas** | Cuentas no administradoras que en 7 días entraron o hicieron algo: Voy, Me interesa, Seguir, publicar, reportar, abrir Novedades (y abrir la app, si D3 = A) | 3 de 4 (primera semana) | ¿La gente vuelve? ¿Es momento de invitar a más? | Fase 1 |
| **Coincidencias** | Eventos de los próximos 7 días donde 2 o más personas no administradoras dijeron Voy | 0 de 36 | ¿Qué eventos conviene empujar para que la gente se conozca? | Fase 4 |
| **Agenda de la semana** | Eventos visibles en los próximos 7 días; debajo, lugares con alguna fecha próxima | 36 eventos · 17 de 58 lugares | ¿Qué agendas faltan por cargar? | Fase 3 |
| **Publica la comunidad** | Eventos próximos publicados por cuentas no administradoras | 0 de 85 | ¿A quién invitar a publicar? ¿Ya dejó de depender de ti? | Fase 3 |

Al tocar un indicador se abre en su sitio qué cuenta, el desglose y el enlace a la lista que lo explica (capa b → c).

### En cada renglón de Gestionar y en los filtros de su lista (capas b y c)

| Sección | Renglón (total · lo que pide atención) | Filtros de su lista, con conteo | Hoy |
|---|---|---|---|
| **Personas** | Total · nunca entraron · correos que rebotan o se quejaron | Todas · Nuevas (7 días) · Sin entrar · Administración | 5 · 1 nunca entró · 0 rebotes |
| **Lugares** | Visibles · sin fecha próxima · ocultos | Todos · Ocultos · Sin fecha próxima · Sin foto · Del catálogo | 58 · 41 sin fecha · 1 oculto |
| **Eventos** | Próximos · sin imagen | Próximos · Esta semana · Sin imagen · De la comunidad · Ocultos | 85 · 70 sin imagen |
| **Artistas** | Total · llevados por su gente · invitaciones | Todos · Por reclamar · Llevados por su gente · Sin foto · Ocultos | 522 · 1 llevado · 15 invitaciones |
| **Pendiente** | Reclamos y reportes, del más viejo al más nuevo | (en el resumen) | 0 |

En la ficha de cada persona, a la vista del administrador:

- **Cuenta:** alta, última vez, avisos por canal (con el motivo si el correo se apagó).
- **Actividad:** a qué va, qué sigue, qué publicó, qué fichas lleva, qué reportó.
- **Rol.**

### Fuera a propósito

- Visitas, páginas vistas o tiempo en la app: no hay rastreo y no se propone.
- Rankings de personas, lugares o artistas: "no es red social de likes ni ranking" ([DEFINICION](../DEFINICION.md)).
- Gráficas antes de 4 semanas.
- Exportar datos o mandar correos masivos desde el panel: las invitaciones siguen en `scripts/capo`.

## Detalle por fricción

### N1 · "10+" no es lo que hay
**Qué se ve.** "5 personas · 10+ lugares · 10+ eventos · 10+ artistas". El código cuenta las filas de las listas de "últimos", que traen 10 como máximo ([page.tsx](../../src/app/admin/page.tsx)). En producción hay 58 lugares visibles, 85 eventos próximos y 522 artistas.
**Por qué duele.** Es el número que el panel pone primero, y es falso. Con él no se puede saber si la ciudad está cubierta.
**Propuesta.** Los totales reales, cada uno en el renglón de su sección, junto a lo que pide atención (N4).
**Decisión:** ☐ de acuerdo

### N2 · Tu actividad cuenta como de la comunidad
**Qué se ve.** "12 'voy' · 62 seguimientos". Medido: los 12 "voy" son de tu cuenta, y los 62 seguimientos son de 3 personas. Todos los eventos y 49 de los 59 lugares los diste de alta tú.
**Por qué duele.** El panel parece decir "la gente ya usa la app" cuando la actividad es sobre todo tuya. Es el riesgo más serio para decidir cuándo invitar gente o cuándo abrir otra ciudad.
**Propuesta.** Los indicadores de personas (activas, coincidencias, publica la comunidad) no cuentan a los administradores, y cada uno lo dice en su detalle ("de 4 cuentas, sin administradores"). El contenido (agenda, lugares) cuenta todo, porque cargarlo es tu trabajo.
**Decisión:** ☐ de acuerdo

### P1 · No hay personas
**Qué se ve.** El panel no tiene una sola línea sobre las personas, salvo el total. Para saber quién se registró, si volvió o qué hace, hay que abrir la base de datos.
**Por qué duele.** Es lo que pediste ("me falta ver usuarios"). Además, sin personas no se puede atender un reporte con contexto (¿quién reporta?, ¿es la primera vez?) ni acompañar a quien reclama una ficha.
**Propuesta.**
- **Lista de Personas:** búsqueda por nombre o correo y filtros con conteo (Todas · Nuevas · Sin entrar · Administración).
- **Cada renglón:** foto, nombre, la última vez y lo más significativo que hace ("Abrió la app hoy · 3 voy · lleva Colectivo Barro").
- **Al tocar:** la ficha de administración de esa persona, con tres grupos (Cuenta, Actividad, Rol) y el enlace a su ficha pública.
- **Tu cuenta** aparece como "Tú".

**Decisión:** ☐ de acuerdo

### P2 · Hacer administrador a alguien solo se puede con SQL
**Qué se ve.** Hoy el rol se da de dos maneras, las dos fuera de la app:
- el correo en `admin_correos` antes de que la cuenta exista;
- un `update` a mano en la base.

**Lo que ya hay en la base.** El administrador puede cambiar el `rol` con su sesión: el trigger `proteger_rol` lo permite solo a administradores (migración [rol_solo_admin](../../supabase/migrations/20260914080000_rol_solo_admin.sql)). La línea `revoke update (rol)` de esa migración no restringe nada: según la documentación de Postgres, quitar un permiso de columna no quita el permiso de la tabla completa, que sigue concedido. Hay que confirmarlo en la base al construir. Además, `perfiles` se lee sin sesión (revisión del 2026-09-14): cualquier dato nuevo solo para administración tiene que vivir fuera de esa tabla.
**Por qué duele.** Es tu pedido. Sin él, sumar a alguien que te ayude a moderar exige tocar la base de producción.
**Propuesta.**
- **Dónde:** en la ficha de la persona, un renglón "Rol · Usuario · Hacer administrador" al final y solo.
- **Confirmar:** abre una hoja que dice qué podrá hacer y un solo botón; se cierra con la ✕.
- **Evidencia:** hecho, el renglón dice "Administrador · desde hoy, lo nombraste tú", con "Quitar".
- **Quitar:** la misma hoja, con lo que deja de ver.
- **Prevención:** nunca se quita al último administrador, y a quien no ha confirmado su correo no se le puede nombrar (el renglón dice por qué).
- **Registro:** queda quién y cuándo cambió el rol.

**Decisión:** ☐ de acuerdo

### D1 · ¿Quién puede hacer y quitar administradores?
**Qué pasa.** Un administrador puede ocultar y editar cualquier ficha y ver la actividad de todas las personas. Si también puede nombrar administradores, una cuenta ajena comprometida (alguien entra a su correo y recibe el código) podría nombrar a otros y quitarte a ti.
**Opciones.**
- **A · Cualquier administrador.** Más simple; el riesgo de arriba queda abierto.
- **B · Solo las cuentas de origen.** Son las que nacen administradoras por estar en `admin_correos`: hoy, las tuyas. Quien nombres modera, pero no nombra ni quita a nadie, y a una cuenta de origen no se le quita el rol desde la app. Si quien mira es un administrador que no es de origen, el renglón de Rol dice "Solo quien fundó Somos Nosotros cambia el rol". Para ti no cambia nada en pantalla.

**Recomendación:** B.
**Tu decisión:** ☐ A · ☐ B

### D2 · ¿El panel muestra el correo de cada persona?
**Qué pasa.** El correo vive aparte de la ficha (en la cuenta de acceso) y hoy nadie lo ve. El [aviso de privacidad](../../src/app/privacidad/page.tsx) dice que el administrador lo usa para "revisar reportes y contactarte si reclamas una ficha".
**Opciones.**
- **A · Oculto en la lista y completo al tocar "Ver"** en la ficha de la persona, con "Copiar". Sirve para buscar, distinguir a dos personas con el mismo nombre y escribirle a alguien por su cuenta. Pide añadir al aviso "y escribirte si hace falta por tu cuenta".
- **B · Solo en los reclamos,** que es lo que el aviso ya cubre.
- **C · Completo en la lista.** Expone correos de más en una pantalla que se mira en la calle.

**Recomendación:** A.
**Tu decisión:** ☐ A · ☐ B · ☐ C

### D3 · ¿Guardamos el último día que alguien abrió la app?
**Qué pasa.** La sesión dura semanas: quien abre la app instalada cada día casi nunca vuelve a "entrar". Sin otro dato, "activa" solo puede contar a quien entra o hace algo (Voy, Seguir, publicar). La mayoría solo mira la agenda y saldría como inactiva: el indicador mentiría a la baja.
**Opciones.**
- **A · Guardar solo el día** (no la hora ni qué miró), una vez al día por cuenta, en una tabla aparte que solo lee la administración. Lleva una línea en el aviso de privacidad.
- **B · No guardarlo.** "Activa" = entró o hizo algo, y el indicador lo dice.

**Recomendación:** A.
**Tu decisión:** ☐ A · ☐ B

### N3 · Seis números en una línea
**Qué se ve.** Una línea gris que se parte en dos renglones, con seis cifras separadas por puntos medios. No dice de cuándo son ni con qué compararlas.
**Por qué duele.** Para comparar hay que leer toda la frase. Un número sin periodo ni referencia no dice si algo va bien o mal.
**Propuesta.** "Últimos 7 días": cuatro indicadores en una cuadrícula de dos por dos. Cada uno lleva su nombre, el número grande, la base ("de 36 eventos") y cómo va frente a los 7 días anteriores ("▲ 3 más"). La primera semana dice "primera semana" en vez de inventar una comparación.
**Decisión:** ☐ de acuerdo

### N4 · No dice qué atender
**Qué se ve.** Tres listas de "últimos" (eventos, artistas, lugares) con 10 filas cada una. Nada dice qué necesita una acción.
**Por qué duele.** UX invisible: el sistema sabe que 41 lugares no tienen fechas próximas, que 70 eventos no tienen imagen y que una persona nunca confirmó su correo. Hoy te obliga a descubrirlo.
**Propuesta.** "Gestionar", con cuatro renglones (Personas, Lugares, Eventos, Artistas). Cada uno lleva su total y lo que pide atención ("58 · 41 sin fecha próxima · 1 oculto"). Tocar el renglón abre la lista; tocar el dato abre la lista ya filtrada.
**Decisión:** ☐ de acuerdo

### R1 · El reclamo se corta y pierde "ver"
**Qué se ve (medido).** El título del reclamo es la frase larga "Dice que es él o su grupo y quiere llevar la fi…", y detrás de ella van el tipo y el enlace "ver". El enlace empieza en 437 px y el título se recorta en 358 px: no se ve ni se puede tocar. El mensaje de la persona también se corta en una línea ("…quiero actualizar las fotos y…") y no hay forma de leerlo entero.
**Por qué duele.** Para decidir si le pasas la ficha necesitas saber cuál es y qué pide, y la tarjeta esconde las dos cosas.
**Propuesta.** La tarjeta en renglones, cada dato en el suyo:
- qué pide, con icono;
- la ficha por su nombre y su tipo, como enlace ("Colectivo Barro · Artista");
- el mensaje completo, entre comillas;
- quién lo pide, como enlace a su ficha de administración;
- las dos salidas.

**Decisión:** ☐ de acuerdo

### R3 · Tres acciones iguales y "Ocultar" en medio
**Qué se ve.** "Pasar la ficha a esta cuenta · Ocultar · Marcar atendido": tres enlaces subrayados del mismo color y peso, dos de ellos partidos en dos renglones. "Ocultar", la única que quita algo del mapa, está pegada a las otras dos.
**Por qué duele.** Sin jerarquía, cada toque exige leer las tres (Hick). Una acción que retira algo, pegada a su contraria, se toca por error (Fitts: separadas al menos 14 px).
**Propuesta.** Dos botones y una sola decisión por tarjeta. A la izquierda, "Dejarla como está", que cierra sin cambiar nada. A la derecha, la acción:
- "Pasarle la ficha" (principal), en un reclamo "es mío";
- "Ocultar la ficha" (en rojo, de borde), en un reporte o en "pide que se quite".

Van separados 16 px.
**Decisión:** ☐ de acuerdo

### L1 · 30 "Ocultar" sin capa
**Qué se ve (medido).** 30 botones "Ocultar" y 2 "Mostrar", uno por fila, en el lado derecho, donde pasa el pulgar al bajar. Un toque oculta la ficha del mapa sin preguntar y sin forma de deshacer desde ahí.
**Por qué duele.** "Lo destructivo, detrás de una capa." Bajar por la lista con el pulgar basta para retirar un lugar del mapa sin darse cuenta.
**Propuesta.** Cada fila lleva "···", que abre el mismo menú de las fichas: Ver la ficha, Editar y, separado al final, "Ocultar del mapa" o "Volver a mostrar". Al ocultar, la fila muestra la etiqueta "Oculto" y el menú ofrece "Volver a mostrar". Son dos toques en vez de uno, a propósito.
**Decisión:** ☐ de acuerdo

### R2 · El reporte no dice qué ficha
**Qué se ve.** "No es cultural · lugar · ver". El tipo aparece como código en minúsculas y el nombre del lugar no aparece.
**Por qué duele.** Para decidir hay que abrir la ficha, leerla y volver, y al volver el panel empieza desde arriba.
**Propuesta.** La ficha por su nombre y su tipo ("Foro Escénico La Lonja · Lugar"), como enlace. Si la ficha ya no existe, la tarjeta lo dice y solo ofrece cerrar.
**Decisión:** ☐ de acuerdo

### R4 · Ocultar no cierra el reporte
**Qué se ve (en el código).** "Ocultar" solo cambia la visibilidad; el reporte sigue pendiente hasta tocar "Marcar atendido". Ni una acción ni la otra confirman lo hecho: la tarjeta desaparece o se queda igual.
**Por qué duele.** Son dos toques para una sola decisión, y el final del flujo no se diseñó (Peak-End).
**Propuesta.** "Ocultar la ficha" oculta y cierra. La tarjeta se vuelve una línea: "✓ Foro Escénico La Lonja quedó oculto · Mostrar". "Pasarle la ficha" deja "✓ Colectivo Barro ahora lo lleva Luis Rangel"; "Dejarla como está" deja "✓ Reporte cerrado; la ficha sigue igual".
**Decisión:** ☐ de acuerdo

### L2 · El estado se lee en el verbo
**Qué se ve.** Una fila oculta es idéntica a una visible, salvo que su botón dice "Mostrar" en vez de "Ocultar".
**Por qué duele.** El estado se deduce de una acción. En una lista larga, lo oculto no se distingue.
**Propuesta.** La etiqueta "Oculto" junto al nombre, con el renglón en gris. Además, un filtro "Ocultos" con su conteo.
**Decisión:** ☐ de acuerdo

### L3 · Solo los 10 últimos
**Qué se ve.** Diez filas por tipo, sin búsqueda, sin filtros y sin autor. Los eventos enseñan la fecha del evento, aunque la lista está ordenada por cuándo se publicó.
**Por qué duele.** Con 522 artistas y 58 lugares, lo que no está entre los 10 últimos no se puede atender desde el panel.
**Propuesta.** Una lista por tipo (Lugares, Eventos, Artistas) con búsqueda y filtros con conteo (la tabla de arriba). El renglón lleva foto, nombre y lo que importa para gestionar: tipo, fechas próximas y quién la lleva; en eventos, lugar y quién lo publicó. La lista recuerda filtro, búsqueda y posición al volver de una ficha (memoria de pantalla).
**Decisión:** ☐ de acuerdo

### L4 · Filas fuera del margen
**Qué se ve (medido).** En "Últimos eventos" y "Últimos lugares", 20 filas terminan en 386 px de 390. El margen es de 20 px: se salen 16 px. Los nombres largos no se recortan porque la fila, dentro de la cuadrícula de la lista, crece con su contenido.
**Propuesta.** Filas como grid con áreas (foto | nombre / detalle | acción), con el nombre recortado dentro de su columna. Se mide en el DOM al construir.
**Decisión:** ☐ de acuerdo

### A1 · Acciones sin señal
**Qué se ve (en el código).** Las acciones del panel no revisan si la base respondió con error ([acciones.ts](../../src/app/admin/acciones.ts)), el botón no cambia al tocarlo y nada dice que salió bien.
**Por qué duele.** Si la red falla, el reporte sigue ahí sin explicación. Si tarda, se toca dos veces (Doherty: respuesta antes de 400 ms o progreso honesto).
**Propuesta.** El botón se pone "en camino" al tocarlo. Un error queda en línea, dentro de la tarjeta, con su causa y "Intentar de nuevo". El éxito es la línea de R4.
**Decisión:** ☐ de acuerdo

### R5 · Reclamo y reporte se leen igual
**Qué se ve.** La misma tarjeta, el mismo verbo "Reportó" y, en un reclamo "es mío", también se ofrece "Ocultar".
**Por qué duele.** Pedir llevar la ficha es una buena noticia; reportar es moderación. Leerlos igual obliga a descifrar cada tarjeta.
**Propuesta.** Icono y verbo propios: "Pide llevar la ficha" (persona) y "Reporte: no es cultural" (bandera). Cada tipo ofrece solo su acción.
**Decisión:** ☐ de acuerdo

### A2 · Atrás lleva a la Agenda
**Qué se ve (en el código).** Sin historia en la pestaña (la app recién abierta o un enlace), "Atrás" lleva a `/`.
**Propuesta.** Lleva a Ajustes, donde vive la entrada. Las pantallas nuevas (Personas, una persona, las listas) vuelven al resumen.
**Decisión:** ☐ de acuerdo

### A3 · La estrella de Artistas en Ajustes
**Qué se ve.** En Ajustes › Somos Nosotros, "Administración" usa la estrella, que en la barra de abajo significa Artistas. Su detalle dice siempre "Reportes, ocultar y mostrar fichas".
**Propuesta.** El icono convencional de un tablero de indicadores. El detalle dice el estado ("2 pendientes" o "Nada pendiente").
**Decisión:** ☐ de acuerdo

## Qué sigue

1. Corriges, tachas y decides D1, D2 y D3 (en este documento o sobre el prototipo).
2. Con la firma se construye en la rama `panel-admin`, en tres piezas que se prueban en tu iPhone una a una:
   - resumen y pendientes;
   - personas y rol, con su migración;
   - listas de fichas.
