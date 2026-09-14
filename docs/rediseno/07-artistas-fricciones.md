# Artistas · lista de fricciones (v1, aceptada por el founder el 2026-09-14)

**Fecha:** 2026-09-14 · **Pantallas:** `/artistas` (hoy, un texto de definición), la ficha de artista (no existe), el alta de evento (`/eventos/nuevo`, sin "quién") y la ficha de evento (`/eventos/[id]`, sin "quién") · **Mirada:** el código de las cuatro pantallas y los prototipos ya firmados; no hay capturas porque la sección no existe todavía · **Carta:** [PRINCIPIOS_UX.md](../PRINCIPIOS_UX.md) · **Base:** lo firmado en el inicio ([02](02-inicio-flujo-y-estados.md)), la ficha de evento ([04](04-ficha-evento-flujo-y-estados.md)) y Lugares ([06](06-lugares-flujo-y-estados.md)): renglones con icono, acciones como botones de icono, barra pegajosa con la acción primaria, menú "···", tinta como primario, la acción flotante de cada sección con su propio verbo · **Decisión previa del founder (2026-09-14):** directorio de artistas desde ya, no el campo de texto "quién se presenta" que recomendó el consejo ([acta](../council/COUNCIL_rediseno-ux-y-artistas_2026-09-14.md)) · **Quién decide:** el founder corrige, tacha y firma.

## Diagnóstico

Artistas es hoy una pestaña que explica lo que va a ser. Lo que falta no es solo la lista: un evento no dice quién se presenta, así que aunque existiera la ficha de un grupo no habría manera de llenarla con sus fechas. Propuesta de fondo: una sección con la misma forma que Lugares (lista con vida, ficha con Seguir pegado abajo, acción flotante propia), y un renglón "Quién" en el alta de evento que liga el evento con el artista sin teclear (sugiere mientras escribes, crea si no existe). Lo que el consejo dejó pendiente se resuelve aquí: quién puede crear y editar (cualquier persona con sesión crea; edita quien lo creó y el administrador), y la vía para que un artista real retire o reclame su nombre (desde el menú "···", sin escribir correos).

## Resumen por severidad

| # | Pantalla | Fricción | Ley | Severidad | Propuesta en una línea |
|---|---|---|---|---|---|
| F1 | Artistas | La pestaña es un texto que promete ("todavía lo estamos armando") | Evidencia, nunca promesa | Alta | Lista de artistas con la forma de Lugares: foto, nombre, qué hace, próxima fecha |
| F2 | Alta de evento | No hay dónde decir quién se presenta | Evidencia · UX invisible | Alta | Renglón "Quién" (opcional) que sugiere artistas mientras escribes y crea el que falte con solo el nombre |
| F3 | Ficha de evento | No dice quién se presenta | Evidencia | Alta | Renglón con icono de estrella: "Con Los Vecinos y Trío Xochitl", cada nombre lleva a su ficha |
| F4 | Ficha de artista | No existe | — | Alta | Portada, nombre, qué hace, cuántos lo siguen, próxima fecha; acciones de icono (Compartir, Instagram, YouTube…); "Se presenta en" con sus fechas; Seguir pegado abajo |
| F5 | Artistas | Sin orden con sentido ni manera de encontrar a alguien | Hick · Evidencia | Media | Con fechas próximas primero, luego alfabético; buscar por nombre a partir de 8 |
| F6 | Artistas | La acción flotante de la sección no existe | Hick · Similitud | Media | "Registrar artista" con icono de estrella con más, misma forma que "Registrar lugar" |
| F7 | Alta de artista | No existe; el riesgo es un formulario largo | UX invisible · Hick | Alta | Una cosa a la vez: nombre (con aviso si ya existe), qué hace (chips), foto; redes y descripción bajo "Más detalles" |
| F8 | Alta de artista | Dos personas pueden registrar al mismo grupo | Prevención antes que corrección | Media | Al escribir el nombre, "Ya está registrado: Los Vecinos. ¿Es este?" y se liga en vez de duplicar |
| F9 | Ficha de artista | Un artista real no tiene cómo reclamar ni retirar su nombre | Evidencia · Progressive disclosure | Alta | En el menú "···": "Es mi nombre" → "Quiero editarlo" o "Quiero que se quite"; llega al administrador, la persona ve qué pasa después |
| F10 | Ficha de artista | Seguir a un artista sin decir qué pasa después | Evidencia, nunca promesa | Media | Misma barra y misma hoja de avisos que en Lugares: "Sigues Los Vecinos · Te avisamos por correo de sus fechas" |
| F11 | Ficha de artista | Un grupo con fechas en varios lugares necesita decir dónde | Evidencia | Media | Los renglones de "Se presenta en" llevan el lugar (no se oculta como en la ficha de lugar) |
| F12 | Alta de evento | Si quien publica es el artista, teclea su propio nombre cada vez | UX invisible | Baja | Si su cuenta está ligada a un artista, "Quién" ya viene resuelto con ese nombre y "Cambiar" |

## Detalle por fricción

### F1 · Lista de artistas con la forma de Lugares
**Qué se ve.** Título "Artistas" y dos párrafos: qué va a ser y "todavía lo estamos armando".
**Propuesta.** Renglones como los de Lugares: foto redonda de 64 px a la izquierda (redonda porque es gente, cuadrada es un lugar; sin foto, círculo discreto), nombre (19 px, 700), y debajo con icono: nota musical o máscara según lo que hace ("Son huasteco · grupo"), calendario con "Próximo: hoy 19:30 · Casa Ocho Ventanas" o "Sin fechas próximas" en gris. Conteo arriba ("14 artistas"). Vacío con causa: "Aún no hay artistas registrados. ¿Eres artista o grupo, o conoces a alguien? Regístralo." *Evidencia (se dice si tiene fechas, no se promete), Similitud (misma forma que Lugares).*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F2 · "Quién" en el alta de evento, sin teclear de más
**Qué se ve.** El alta tiene Qué, Cuándo, Dónde, Cuánto y "Más detalles". No hay quién.
**Propuesta.** Un cuarto renglón resuelto, "Quién", debajo de Dónde, con resumen "Añadir quién se presenta" en gris (es opcional: no detiene la publicación). Al tocarlo, un campo "Nombre del artista o grupo" que sugiere mientras escribes (a partir de dos letras) los artistas ya registrados; se toca uno y queda como ficha ("Los Vecinos ✕"); se pueden añadir varios. Si no existe, la última sugerencia es "Crear a «Trío Xochitl»": lo crea con solo el nombre y lo liga; la ficha se completa después desde Artistas. La lectura del cartel también saca los nombres y los propone. *UX invisible (sugiere, crea, no obliga a salir del alta), Hick (un camino: escribir el nombre), Postel (acepta lo que escribas; guarda un artista normalizado).*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F3 · La ficha de evento dice quién
**Propuesta.** Un renglón con icono de estrella después de Dónde: "Con Los Vecinos y Trío Xochitl"; cada nombre es un enlace a su ficha. Sin artistas, el renglón no aparece. En el renglón de la agenda no se añade (ya lleva hora, lugar, asistentes y costo; el título suele decirlo). *Evidencia, Hick (la agenda no crece).*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F4 · Ficha de artista
**Propuesta.** Barra interior (← Artistas · SMSNSTRS · ···). Portada en banda de 220 px si la hay. Nombre (26 px) y debajo, en gris, qué hace y qué es ("Son huasteco · Grupo"). Renglones con icono: personas ("12 personas lo siguen"), calendario ("Próximo: hoy 19:30 · Casa Ocho Ventanas", con "ver"). Acciones de icono: Compartir · Instagram · Facebook · YouTube · Spotify · WhatsApp · Sitio (solo las que tenga; tres por fila, con más se desplaza). Descripción en cuatro líneas y "más". "Se presenta en · N" con los renglones de la agenda agrupados por día, con el lugar. Al final, botón secundario "Publicar una fecha de Los Vecinos" (alta con Quién ya resuelto). Sin fechas: "Aún no tiene fechas publicadas. ¿Sabes de una? Publícala." "Registrado por X" al pie. *Similitud con la ficha de lugar; Serial position.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F5 · Orden y búsqueda
**Propuesta.** Primero los que tienen fechas próximas (por fecha), luego el resto en alfabético. Búsqueda por nombre a partir de 8 artistas (mismo umbral que Lugares). Sin chips de disciplina mientras haya menos de 12; cuando los haya, chips "Todos · Música · Teatro · Danza · Artes visuales · Letras". *Hick, Evidencia (lo vivo primero).*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F6 · La acción flotante de Artistas es registrar un artista
**Propuesta.** Botón flotante "Registrar artista" con icono de estrella con más, misma forma y posición que "Registrar lugar" y "+ Publicar". Sin sesión lleva a entrar y vuelve al alta. *Hick (cada sección tiene su acción), Similitud (misma forma, distinto verbo e icono; decisión 14 de Lugares).*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F7 · Alta de artista una cosa a la vez
**Propuesta.** Pantalla "Registrar artista". Campo "Nombre" primero (con foco). Debajo, dos renglones resueltos: "Qué hace" (chips: Música · Teatro · Danza · Artes visuales · Letras · Cine · Otro; y un campo corto opcional "en una palabra": son huasteco, jazz, grabado) y "Es" (Solista · Grupo · Colectivo, deducido: si el nombre empieza con "Los", "Las", "Trío", "Colectivo" se propone Grupo o Colectivo). Foto: "Elegir una foto" (opcional). "Más detalles": redes (Instagram, Facebook, YouTube, Spotify, WhatsApp, Sitio) y descripción. Botón "Publicar artista". Al publicar: la ficha con "Publicado. Ya está en Artistas." y Completar o Compartir, como en Lugares. Si viene del alta de evento (F2), no pasa por esta pantalla: se crea con el nombre y se completa después. *UX invisible (deduce el tipo, no exige lo opcional), Hick, Gradiente de meta.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F8 · Un artista es un artista
**Propuesta.** Al escribir el nombre en el alta (o en el renglón Quién), si ya existe uno con el mismo nombre (sin acentos ni mayúsculas), aparece "Ya está registrado: Los Vecinos · Son huasteco. ¿Es este?" con "Sí, es este" (lo abre o lo liga) y "No, es otro" (sigue). *Prevención antes que corrección; misma regla que "un lugar es un lugar".*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F9 · Es mi nombre: reclamar o retirar
**Qué falta.** Alguien registra a "Los Vecinos"; el grupo real quiere corregir la ficha o que no esté.
**Propuesta.** En el menú "···" de la ficha, además de Reportar (y Editar, Borrar para el autor; Ocultar para el administrador): "Es mi nombre". Con sesión, abre una hoja: "¿Qué quieres hacer con Los Vecinos?" → "Quiero editarlo yo" o "Quiero que se quite". Cualquiera de las dos crea un reporte que el administrador ve en su panel, con la cuenta que lo pidió. La hoja termina con evidencia, no promesa: "Listo. El administrador lo revisa y te escribe a ro…@gmail.com." Sin sesión, lleva a entrar y vuelve a la hoja. En el panel del administrador, "Quiero editarlo" tiene el botón "Pasar la ficha a esta cuenta"; "que se quite", "Ocultar". *Progressive disclosure (detrás de una capa), Evidencia (se dice quién lo revisa y por dónde responde).*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F10 · Seguir a un artista dice qué pasa
**Propuesta.** Barra pegajosa "Seguir" lleno en tinta; con decisión, "✓ Sigues · Te avisamos por correo de sus fechas" y "Dejar de seguir". Reutiliza el consentimiento de avisos: si no se ha preguntado, la misma hoja ("Sigues Los Vecinos. ¿Te avisamos de sus fechas?" Por correo · En el teléfono · No, gracias). Los avisos de "evento nuevo" salen también a quienes siguen a un artista del evento. Sin sesión, Seguir lleva a entrar y se aplica al volver. *Von Restorff, Fitts, Evidencia; decisiones 9 y 10 de Lugares.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F11 · Las fechas del artista dicen dónde
**Propuesta.** En "Se presenta en", cada renglón lleva hora, lugar, asistentes y costo (el renglón completo de la agenda). En la ficha de lugar se ocultaba el sitio porque era obvio; aquí no lo es. *Evidencia.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F12 · Quien publica es el artista
**Propuesta.** En el alta de artista, un interruptor "Soy yo / es mi grupo" (apagado por defecto) liga la ficha a la cuenta. Cuando esa cuenta publica un evento, "Quién" ya viene resuelto ("Los Vecinos · tú") con "Cambiar". Una cuenta puede estar ligada a varios artistas (una persona toca en dos grupos): entonces "Quién" propone los suyos primero. *UX invisible (arranque dotado), Gradiente de meta.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

## Niveles de atención

| Nivel | Artistas (lista) | Ficha de artista | Alta de evento (Quién) |
|---|---|---|---|
| 1 · Lo que importa | Foto, nombre, qué hace, próxima fecha | Portada, nombre, qué hace, próxima fecha y dónde | El nombre ya resuelto o "Añadir quién se presenta" |
| 2 · Lo accionable | Tocar un renglón; Registrar artista (flotante) | Seguir (barra pegajosa) | Escribir y tocar una sugerencia |
| 3 · Prueba social | Los que tienen fechas van primero | Cuántas personas lo siguen; sus fechas | Los artistas que ya existen aparecen solos |
| 4 · Lo demás | Buscar (por umbral), chips (por umbral) | Acciones de icono, descripción plegada, menú ··· con "Es mi nombre" | "Crear a «…»" solo cuando no hay coincidencia |

## Qué sigue

1. Tú corriges la lista y firmas.
2. Flujo, estados y decisiones numeradas ([08](08-artistas-flujo-y-estados.md)); prototipo navegable con las cuatro pantallas (lista, ficha, alta de artista y el renglón Quién del alta de evento).
3. PR con la migración (`artistas`, `eventos_artistas`, seguir artistas, reportes "es mi nombre"), las pantallas y tu firma en el iPhone.
