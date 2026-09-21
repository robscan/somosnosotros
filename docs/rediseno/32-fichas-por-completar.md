# 32 · Fichas por completar (D2, OL-108)

**Pieza:** D2 de `docs/ops/COLA_DE_PIEZAS.md` (L48 del anexo). **Solo documento**, sin código de la app ni cambios de datos. Producción se leyó solo con `SELECT` dentro de `begin…rollback`.

## Qué pidió el founder (L48)

> «Crear tarea de investigación, para identificar cuáles artistas o lugares fueron creados y no tienen ficha y cuáles han estado activos recientemente. La investigación será para completar esa ficha buscando datos en internet. Presentar las propuestas de ficha y foto antes de publicar.»

## 1 · Qué es una «ficha completa»

Los mismos campos que ya usa el panel de administración para marcar "sin foto" y que pide el [canon de formularios](26-alta-evento-lugar.md) al dar de alta una ficha.

**Artista** — completa cuando tiene los cinco:
- **Foto** (`artistas.foto`; sin ella sale el símbolo SN, nunca se compone en vivo — [feedback-sin-foto-simbolo]).
- **Descripción** (`descripcion`, no vacía).
- **Disciplina** (`disciplina` distinta de `por_completar`; el alta desde un evento crea artistas con solo el nombre).
- **Ciudad** (`ciudad`, no vacía).
- **Contacto o enlace** (`redes`, al menos una red).

**Lugar** — completo cuando tiene los cinco anteriores (foto = `portada`; disciplina → **tipo**, que ya es obligatorio en la base) más:
- **Dirección con pin** (`direccion` no vacía; `lat`/`lng` siempre existen porque la columna lo exige, pero una dirección vacía es la señal de que el pin salió solo de una geocodificación aproximada, no de una calle confirmada).

## 2 · Qué es una ficha «activa»

Una ficha (artista o lugar) cuenta como activa cuando se cumple cualquiera de:
- Tiene un evento visible **próximo** (`eventos.termina >= now()`, la columna que ya usa la app desde la migración de zona horaria) o de los **últimos 90 días**.
- Alguien la **sigue** (`seguimientos`).
- Tiene una **cuenta que la gestiona** (`artistas_cuentas` / `lugares_cuentas`) — sin mirar quién, solo si existe.

Ventana de 90 días para "recientemente": suficiente para cubrir un evento pasado que la gente todavía busca (por ejemplo, para ver quién fue) sin arrastrar todo el histórico. Ajustable si el founder prefiere otra.

## 3 · Cuánto falta, medido en producción

Lectura del 2026-09-21, solo lectura dentro de `begin … set transaction read only … rollback`, con el sí del gestor de cambios (bitácora 143). Dos aclaraciones que hizo el gestor al revisar el SQL, y que valen para leer estos números:
- `artistas.ciudad` y `lugares.ciudad` tienen "San Luis Potosí" por omisión y son obligatorias: **ninguna ficha carece de ciudad**, así que ese campo no es un hueco real hoy (se midió cuántas tienen una ciudad *distinta* del valor por omisión, para el día en que el directorio crezca a otras ciudades — hoy: 0 de 538 artistas, 0 de 58 lugares).
- `lugares.lat`/`lugares.lng` son obligatorias: el pin **siempre existe**. Lo que puede faltar es la `direccion` escrita y confirmada por una persona (la señal real de que el pin es solo una aproximación).

Por eso «ficha completa» se mide con cuatro campos reales para artistas (foto, descripción, disciplina, contacto/enlace) y cinco para lugares (los mismos más dirección):

| | Artistas visibles (538) | Lugares visibles (58) |
| --- | --- | --- |
| Con foto | 315 (59 %) | 46 (79 %) |
| Con descripción | 527 (98 %) | 56 (97 %) |
| Con disciplina o tipo | 528 (98 %) | 58 (100 %) |
| Con contacto o enlace | 528 (98 %) | 57 (98 %) |
| Con dirección escrita | — | 58 (100 %) |

La foto es, con mucho, el hueco más grande y en ambos casos el único que de verdad falta en volumen: descripción, disciplina/tipo, contacto y dirección ya están casi completos en toda la base (la importación del CAPO y de instituciones — bitácoras [028](../bitacora/2026/09/028-importacion-capo.md) y [032](../bitacora/2026/09/032-instituciones-y-agendas.md) — llenó esos campos al dar de alta; lo que falta es la foto, que esas importaciones decidieron no traer por derechos de autor).

**Activas e incompletas** (con al menos un hueco real, no solo "ciudad" o "pin"): **14 artistas** y **8 lugares**, sobre 538 y 58 respectivamente — es decir, casi toda la base activa ya está completa; lo pendiente es acotado.

De los 14 artistas activos e incompletos, 9 son fichas creadas "al vuelo" desde el alta de un evento (`disciplina = 'por_completar'`, sin foto, descripción ni contacto: la ficha entera está vacía salvo el nombre) — por disciplina, de las que se pudo saber: 2 artes visuales, 2 teatro, 1 cine, y 9 sin disciplina todavía. Los otros 5 (3 del CAPO, 2 comunidad) solo les falta la foto.

De los 8 lugares activos e incompletos, 6 solo les falta la foto (todo lo demás ya está); 2 (Laboratorio Centro Histórico y Workshop 850, ambos sin `origen`: dados de alta directo, no importados) les falta también la descripción. Por tipo: 2 colectivo, 2 escuela, 2 foro, 1 casa de cultura, 1 galería.

De los 14 artistas activos, 3 lo están **solo** porque alguien tiene una cuenta ligada a la ficha (no por evento próximo ni seguidores); a esos 3 solo les falta la foto. El detalle de quién gestiona cada ficha es dato de cuentas, no de la ficha pública: no va en este documento (queda en el scratchpad de la sesión, junto con los `uuid`).

## 4 · Dónde rinde más completar primero

Orden: primero las fichas activas e incompletas que aparecen en **eventos de las próximas tres semanas** (`inicio` entre ahora y +21 días) — son las que más gente va a ver esta quincena — luego, dentro de las que no, las que tienen más eventos recientes o próximos (una ventana de 90 días) y más seguidores. Los lugares no tuvieron ninguno con evento en las próximas tres semanas el día de la medición; se ordenaron por eventos recientes y seguidores.

**Artistas, en orden de prioridad** (nombre, qué falta):
1. Alan España — foto (en evento esta quincena)
2. Bulé Collective — foto, descripción, disciplina, contacto (ficha vacía; en evento esta quincena)
3. Eréndida Zapata — foto, descripción, disciplina, contacto (ficha vacía; en evento esta quincena)
4. Neto Medellín — foto (en evento esta quincena)
5. Acorde On — foto, descripción, disciplina, contacto (ficha vacía)
6. Canto Quetzal — foto, descripción, disciplina, contacto (ficha vacía)
7. Dais Qrohc — foto, descripción, disciplina, contacto (ficha vacía)
8. Fly Marina — foto, descripción, disciplina, contacto (ficha vacía)
9. Gordo Ang — foto, descripción, disciplina, contacto (ficha vacía)
10. Katana Lírica — foto, descripción, disciplina, contacto (ficha vacía)
11. La Lupita Fullband — foto, descripción, disciplina, contacto (ficha vacía; 2 seguidores)
12. Gerardo Canela — foto (sin evento próximo)
13. Sandra Ramírez Quiroz — foto (sin evento próximo)
14. Xavier Jael Leura Vázquez — foto (sin evento próximo)

**Lugares, en orden de prioridad** (nombre, qué falta):
1. Estudio Ojo Zarco — foto (1 seguidor, evento reciente)
2. CASA Taller de la Danza y el Ballet — foto (1 seguidor)
3. El Metlapil · Departamento Cultural — foto (1 seguidor)
4. La Carrilla — foto (1 seguidor)
5. La Guarida del Coyote — foto (1 seguidor)
6. Laboratorio Centro Histórico — foto, descripción (1 seguidor)
7. Taller de Gráfica Índigo — foto (1 seguidor)
8. Workshop 850 — foto, descripción (2 seguidores)

Los `uuid` de cada ficha quedan en el scratchpad de esta sesión (`resultado-fichas.json`), no en el repo (público): con el nombre alcanza para que el gestor o el founder la busquen en el panel de administración.

## 5 · Cómo se completan sin capturistas

Nadie va a escribir 22 fichas a mano; y mañana serán más. La idea es que el **sistema proponga** con lo que ya sabe o puede investigar, y una **persona confirme** antes de publicar — igual que hoy funciona la lectura del cartel (propone artistas y lugar; la persona confirma) o "Soy yo / es mi grupo" (reclamar y luego editar).

**Qué puede proponer el sistema, sin persona de por medio:**
- **Disciplina, a partir del contexto que ya tenemos.** Un artista `por_completar` casi siempre nació ligado a un evento (`eventos_artistas`); el título, la descripción o el cartel de ese evento suelen decir el género o la disciplina ("noche de rock", "obra de teatro"). Cuando el cartel se volvió a leer con IA (bitácora del alta de evento), ya se extraen artistas del flyer: se puede pedir también su disciplina probable en la misma lectura, para dejarla propuesta, no publicada.
- **Redes sociales por nombre**, con el mismo buscador que ya usa el alta de artista/lugar para evitar duplicados: buscar el nombre en Instagram/Facebook y, si hay una coincidencia clara (mismo nombre, misma ciudad, actividad reciente), proponerla como contacto.
- **Descripción corta**, redactada a partir de lo que ya hay (tipo de evento en el que sale, disciplina, ciudad) cuando no hay nada mejor — nunca inventando datos biográficos que no se puedan sostener.

**Qué confirma una persona antes de publicarse** (regla del grafo cultural: "lo que propone la IA se confirma antes de publicarse como hecho" — `DEFINICION.md`):
- Toda propuesta de disciplina, contacto o descripción generada por el sistema se guarda como **propuesta**, visible solo para quien gestiona la ficha y el administrador, hasta que alguien la acepte o la edite. No se auto-publica.
- Una foto **nunca** se sube ni se baja de un tercero sin permiso: sin foto se queda el símbolo SN (regla ya vigente en [`docs/diseno/LINEA_GRAFICA.md`](../diseno/LINEA_GRAFICA.md): `public/sin-foto.png` / `sin-foto-ancha.png`, generadas una vez, nunca compuestas en vivo).

**Qué se le pide a quien gestiona la ficha** (el artista o el lugar real, cuando ya reclamó o tiene cuenta ligada; si no, al administrador):
- Confirmar o corregir las propuestas (un toque, como ya pasa con "¿Eres tú?").
- Subir su propia foto, o autorizar explícitamente una que el sistema encontró con su fuente y licencia claras (ver abajo). Sin esa autorización, sigue el símbolo SN.
- Para las 9 fichas "vacías" (creadas al vuelo desde un evento): completar los cinco campos, porque ahí el sistema no tiene de dónde proponer casi nada salvo, quizá, la disciplina por el tipo de evento.

**Fotos — regla dura, ya escrita en la asignación de esta pieza:** solo propuestas con su fuente y su licencia (por ejemplo, una foto de perfil pública de Instagram del propio artista, citando la cuenta, para que él decida si la autoriza); **nunca** se baja ni se sube una foto de un tercero sin ese permiso explícito. Sin foto, manda el símbolo SN que ya existe — nunca una imagen compuesta en vivo ni un cuadro punteado.

## 6 · Muestra de 10 fichas con propuesta de texto

Fichas públicas (artistas y lugares); se pueden nombrar. Ninguna lleva correo ni dato de cuenta. Se buscó cada nombre en internet (cupo de esta sesión, no el de una campaña): la mayoría de los artistas activos e incompletos son actos locales pequeños sin presencia pública indexable — eso es en sí un hallazgo: para ellos el sistema no va a tener de dónde proponer casi nada, y hay que pedírselo directo a quien gestiona la ficha o al lugar donde tocaron.

### Artistas

1. **Alan España** (teatro) — sin fuente pública encontrada. Propuesta de descripción (plantilla, a confirmar por quien gestiona la ficha): *"Actor de teatro en San Luis Potosí."* — texto mínimo, sin inventar trayectoria; el resto lo completa la persona.
2. **Bulé Collective** (`por_completar`, ficha vacía, toca esta quincena) — sin fuente pública encontrada. Al no haber de dónde proponer nada, la propuesta es un aviso al organizador del evento donde se presentan: *"Bulé Collective se presenta el [fecha] en [lugar] y su ficha está vacía. ¿Nos ayudas a completarla o le avisamos a la agrupación?"*
3. **Eréndida Zapata** (`por_completar`, ficha vacía, toca esta quincena) — mismo caso que el anterior: sin fuente pública encontrada, mismo aviso al organizador.
4. **Neto Medellín** (artes visuales) — sí hay fuente pública: autor de intervenciones murales en San Luis Potosí (cortinas del Pasaje Zaragoza y el puente del Bulevar Salvador Nava, *"Un solo sueño"*; participó en *"Identidad"* del programa Arte al Aire Libre). Propuesta de descripción (a confirmar): *"Artista visual potosino. Autor de intervenciones murales en la ciudad, entre ellas 'Un solo sueño' en el Bulevar Salvador Nava, sobre identidad y memoria de los barrios tradicionales."* Fuente: [Un solo sueño: el arte del Mundial en las calles de San Luis](https://laorquesta.mx/un-solo-sueno-el-arte-del-mundial-en-las-calles-de-san-luis-articulo-de-sayd-sauceda/) (el nombre civil que aparece en la nota se deja fuera de la ficha; si el artista lo quiere en su ficha, lo agrega él).
5. **La Lupita Fullband** — la búsqueda solo encontró a "La Lupita", una banda de ska/son jarocho con proyección nacional; **no hay forma confiable de confirmar que sea el mismo acto** local que tocó aquí (nombre parecido, "Fullband" no aparece). No se propone texto con esa fuente para no atribuir una identidad equivocada: se deja como aviso al organizador, igual que Bulé Collective y Eréndida Zapata.

### Lugares

1. **La Carrilla** (foro, solo falta foto) — fuente pública clara: Foro Teatral La Carrilla, diseñado por la arquitecta Angustias Lucio Blanco, construido en 1991 dentro de la Unidad Deportiva Adolfo López Mateos; programa teatro, música, danza y festivales de martes a domingo. Fuente: [Foro Teatral La Carrilla, Sistema de Información Cultural](https://sic.cultura.gob.mx/ficha.php?table=teatro&table_id=345), [mexicoescultura.com](https://mexicoescultura.com/recinto/51606/foro-teatral-la-carrilla.html). Como solo falta la foto, no hace falta tocar la descripción; la propuesta es de foto (ver regla de fuente/licencia): su [página de Facebook](https://www.facebook.com/forolacarrilla/) o [X](https://x.com/lacarrilla) pueden tener una foto de fachada que el administrador del foro autorice.
2. **La Guarida del Coyote** (foro, solo falta foto) — fuente pública: espacio escénico independiente inaugurado en 2012 en Ignacio Comonfort 1005, Col. Alamitos, heredero del Proyecto Coyote (1998) del bailarín Arturo Garrido Puga; ofrece funciones de danza, talleres de artes escénicas y cafetería. Fuente: [La Guarida del Coyote, un espacio independiente para el arte en SLP](https://sanluis.eluniversal.com.mx/estado/la-guarida-del-coyote-un-espacio-independiente-para-el-arte-en-slp-legado-de-arturo-garrido/), [Instagram @guaridacoyote](https://www.instagram.com/guaridacoyote/). Propuesta de foto: su Instagram, con autorización de quien lo administre.
3. **CASA Taller de la Danza y el Ballet** (escuela, solo falta foto) — fuente pública: escuela y compañía de danza y ballet, con presencia activa en Facebook e Instagram. Fuente: [Facebook CASA Taller de la Danza y el Ballet](https://www.facebook.com/people/CASA-Taller-de-la-Danza-y-el-Ballet/100063736527117/). Propuesta de foto: su Facebook o Instagram, con autorización.
4. **Taller de Gráfica Índigo** (escuela, solo falta foto) — fuente pública: taller de grabado en el Centro Histórico, cuyo objetivo es visibilizar la producción gráfica y fomentar su consumo y venta en el estado. Fuente: página de Facebook "Arte Índigo". Propuesta de descripción, solo si quien lo gestiona confirma que es la misma organización (el nombre público difiere ligeramente — "Arte Índigo" vs. "Taller de Gráfica Índigo"): *"Taller de grabado en el Centro Histórico, dedicado a la producción y difusión de la gráfica potosina."*
5. **Workshop 850** (galería, falta foto y descripción) — sin fuente pública encontrada con ese nombre exacto. Propuesta: aviso a quien lo dio de alta (sin `origen`, es decir alta directa, no importado) pidiendo foto y una línea de descripción; el sistema no tiene de dónde proponer nada confiable.

## Evidencia

SQL corrido el 2026-09-21 en un `.mjs` de scratchpad (módulo `pg`, ejecutado desde el worktree `dreamy-pascal-3c3407` que ya lo tiene instalado, borrado de ahí al terminar — ese worktree queda limpio), con el sí del gestor de cambios y sus dos ajustes (`eventos.termina` en vez de `sin_pasar()`; ciudad y lat/lng no cuentan como hueco). Una sola transacción `begin … set transaction read only … rollback`, cinco `SELECT`/`COUNT` sobre `artistas`, `lugares`, `eventos`, `eventos_artistas`, `seguimientos`, `artistas_cuentas` y `lugares_cuentas` (solo si existe fila, nunca quién). La cadena de conexión se leyó de `.env` dentro del proceso y nunca se imprimió; el `.env` real no entró a esta carpeta. Los `uuid` de las fichas quedan en el scratchpad de la sesión, fuera del repo. Nada se publicó ni se editó: es lectura y propuesta de texto, a la espera del visto bueno del founder.
