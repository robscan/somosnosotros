# Novedades, perfil y alta de lugar · lista de fricciones (v1.2, con dos correcciones del founder)

**Fecha:** 2026-09-15 · **Pantallas:** avisos que la persona se pierde (hoy no existe una sección), Mi perfil (`/perfil`), perfil ajeno (`/personas/[id]`), alta de lugar (`/lugares/nuevo`) · **Mirada:** capturas 390×844 en el servidor de desarrollo con un usuario desechable, más la prueba del founder en su iPhone · **Carta:** [PRINCIPIOS_UX.md](../PRINCIPIOS_UX.md) · **Base:** lo firmado en [11](11-restantes-flujo-y-estados.md) (ficha de persona, hojas, renglones resueltos) y lo que ya está en producción (bitácoras [034](../bitacora/2026/09/034-hallazgos-tras-pruebas.md) a [036](../bitacora/2026/09/036-perfil-reservado.md)) · **Prototipo:** [prototipos/novedades-perfil-alta.html](prototipos/novedades-perfil-alta.html) (publicado para el iPhone en https://claude.ai/artifact/5GDgjLVpsy3h26TgsnYEaN) · **Quién decide:** el founder corrige, tacha y firma. **Corrección del 2026-09-15 (tarde):** campana aceptada; Ajustes entra desde la cabecera (donde estaba Editar) y Editar vive dentro de Ajustes; engrane convencional; Ajustes con grupos separados; en el alta, menos texto de ayuda, dos salidas en "Dónde" (Estoy aquí · Buscar), y con tipo "Otro" se puede decir qué es; iconos en vez de letreros; leyes de región común, proximidad y conectividad uniforme. **Segunda corrección (misma tarde):** en los perfiles, un resumen con números (Va a · Sigue · Van a lo mismo) que hace de pestañas del contenido; Compartir arriba a la derecha junto al nombre; el alta de lugar queda como canon para cuestionar los demás formularios.

## Diagnóstico

Tres cosas. **Los avisos solo viven en el correo y el push**: si la persona no los activó, o el correo se fue a otra carpeta, no hay un sitio en la app donde ver qué pasó en lo que sigue. **Mi perfil mezcla lo que soy con cómo me configuro**: Avisos y Perfil reservado son ajustes, no actividad, y la ficha ahora se comparte, así que va a recibir gente que no es la dueña. **El alta de lugar** enseña el mapa y el campo de dirección desde el principio, cuando el nombre casi siempre trae los dos; y hasta hoy una dirección de Mapbox podía convertirse en el nombre del lugar (ya corregido).

## Resumen por severidad

| # | Pantalla | Fricción | Ley | Severidad | Propuesta en una línea |
|---|---|---|---|---|---|
| N1 | Avisos | Lo que pasa en lo que sigo solo llega por correo o push; sin ellos, no hay dónde verlo | Evidencia · Zeigarnik | Alta | Sección "Novedades" con lo mismo que se avisa: nuevo en lo que sigo, cambios en lo que voy, hoy vas; por día |
| N2 | Avisos | La campana no existe; el único indicio de algo nuevo es el filtro "Siguiendo" de la agenda | Evidencia | Media | Campana en la barra raíz junto al avatar, con un punto cuando hay algo no visto; se apaga al abrir |
| N3 | Avisos | Nadie dice que los avisos del teléfono están apagados cuando más importa | Evidencia · UX invisible | Media | Al pie de Novedades, "Esto también te llega por correo. En el teléfono aún no: actívalo" (solo si están apagados) |
| N4 | Avisos | No hay señal social: quién más va a lo que voy | Peak-End | Baja | Renglón "Van a lo mismo · Ana y Luis" (solo perfiles públicos). **Decidido por el founder: entra, con esa redacción** |
| P1 | Mi perfil | Ajustes (Avisos, Perfil reservado) entre la actividad; el menú ··· mezcla Editar con Cerrar sesión y Borrar | Hick · Progressive disclosure | Alta | Mi perfil = la ficha tal como la ven los demás. Bajo el nombre, dos iconos: Ajustes (engrane) y Compartir. Editar vive dentro de Ajustes (corrección del founder) |
| P2 | Mi perfil | "Así te ven los demás" es un enlace suelto que nadie necesita si la ficha ya es la misma | Evidencia | Baja | Se queda como pie discreto (comprueba en un toque que no hay diferencia) |
| P3 | Mi perfil | El correo con el que entro no aparece en ningún sitio salvo dentro de la hoja de edición | Evidencia | Baja | Renglón "Entras con ro…@" en Ajustes |
| P4 | Mi perfil | Invitar al sitio compite con la actividad al pie de la ficha | Hick | Baja | Se mueve a Ajustes ("Invita a tus amigos"), con Compartir la ficha como única acción social visible |
| R1 | Perfil ajeno | La ficha ajena no dice lo que importa a quien la mira: qué tenemos en común | Peak-End · UX invisible | Media | Sección "Van a lo mismo · N" arriba de "Va a" cuando hay coincidencias (lo calcula el sistema) |
| R2 | Perfil ajeno | Sin sesión, la ficha no invita a nada (para qué existe) | Evidencia | Baja | Ya cumple: Compartir y los renglones; no añadir |
| L1 | Alta de lugar | Al escribir "Workshop 850" salían direcciones como nombres y, al elegir, la dirección se volvía el título | Evidencia · Postel | Alta | Corregido el 2026-09-15: las direcciones se distinguen ("Usar la dirección …") y el nombre escrito se queda |
| L2 | Alta de lugar | Mapa de 280 px y campo de dirección a la vista desde el principio, aunque el nombre casi siempre los trae | Hick · UX invisible | Alta | "Dónde" como renglón resuelto con dos salidas por intención cuando falta: Estoy aquí (acabo de descubrirlo) y Buscar (sé dónde está); el mapa vive en una hoja a toda la pantalla |
| L3 | Alta de lugar | El desplegable nativo de tipo aparece antes de saber nada del lugar | Hick · Similitud | Media | "Tipo" como renglón resuelto (deducido del nombre o de Mapbox); chips al abrir; con "Otro", un campo opcional "¿Qué es?" para ir formando clases nuevas |
| L4 | Alta de lugar | "Publicar lugar" no dice qué falta cuando está deshabilitado | Evidencia | Media | El botón dice "falta el nombre" / "falta dónde está" |
| L6 | Alta de lugar | Textos de ayuda en Dónde y Tipo poco integrados por su cantidad (v1) | Hick · UX invisible | Media | Sin frases de ayuda: el valor del renglón dice el estado ("Falta", "Por el nombre") y los iconos llevan tooltip |
| L5 | Alta de lugar | Paginar el alta (idea del founder) | Gradiente de meta · Hick | — | No: con dos datos obligatorios, la paginación añade un "Siguiente" por pantalla y esconde lo ya resuelto; los renglones resueltos dan el mismo orden sin cambiar de pantalla (detalle abajo) |

## Detalle por fricción

### N1 · Novedades como sección
**Qué se ve.** Los avisos (nuevo evento en lo que sigo, recordatorio, cambio de fecha o lugar) salen por correo y push y no dejan rastro en la app. Quien no los activó no se entera; quien los activó y borró el correo tampoco.
**Propuesta.** Una pantalla "Novedades" (interior, regreso a Agenda) con los mismos tres tipos que ya se avisan más "Hoy vas", agrupados por día (Hoy · Ayer · Esta semana), cada uno un renglón con icono por causa, "Nuevo en Casa Ocho Ventanas" y el evento; tocar abre la ficha. Lo no visto lleva un punto; abrir la pantalla lo apaga (se guarda una sola fecha: cuándo la abrió). No hay "marcar como leído" ni ajustes ahí. Se calcula, no se guarda: nuevos de las últimas dos semanas en lo que sigue, cambios en lo que va, y lo de hoy. *Evidencia (lo que la app afirma, se puede ver), Zeigarnik (lo pendiente con su dato exacto), UX invisible (nada que administrar).*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### N2 · Campana con punto
**Propuesta.** En la barra raíz, entre el logotipo y el avatar, la campana; con sesión únicamente. Un punto del color de acción cuando hay novedades no vistas; ningún número (el número invita a "limpiar", no a ver). Sin sesión, no hay campana: Novedades sin sesión solo tiene sentido como invitación. *Evidencia, Hick.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### N3 · Recordar el teléfono donde duele
**Propuesta.** Al pie de la lista, solo si los avisos del teléfono están apagados: "Esto también te llega por correo. En el teléfono aún no: actívalo y te avisamos al momento" con el botón que abre la hoja de avisos (la de Ajustes). Una vez activados, desaparece. *UX invisible, Evidencia.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### N4 · "Van a lo mismo · Ana y Luis"
**Propuesta.** Renglón de Novedades cuando alguien con perfil público dice "Voy" a un evento al que ya voy. Es la señal social más barata de producir y la más cercana a la misión (conocerse). *Peak-End.*
**Tu decisión:** ☒ entra, con la redacción "Van a lo mismo" (2026-09-15)

### P1 · Mi perfil solo actividad; Ajustes aparte
**Qué se ve.** Hoy Mi perfil trae, entre la cabecera y "Voy a", dos renglones de configuración (Avisos, Perfil) y el menú ··· mezcla Editar con Cerrar sesión, Borrar y Administración.
**Propuesta (v1.1).** Mi perfil es exactamente la ficha que ven los demás, con dos iconos bajo el nombre, donde estaba Editar: Ajustes (engrane) y Compartir. Editar vive dentro de Ajustes. "Ajustes" son cuatro grupos en tarjetas con rótulo y aire entre ellos: **Tu ficha** (Editar · Perfil público/reservado), **Avisos** (Por correo · En el teléfono, con interruptor en la fila), **Cuenta** (Entras con ro…@ · Cerrar sesión), **Somos Nosotros** (Invita a tus amigos · Administración · Aviso de privacidad · Reglas de uso); "Borrar mi cuenta" suelto al final, en rojo. Región común (cada grupo en su tarjeta), proximidad (aire entre grupos, filas pegadas dentro), conectividad uniforme (todas las filas con el mismo dibujo: icono, etiqueta, detalle, acción). El menú ··· desaparece de Mi perfil. Cuestionado fuerte: ¿hace falta siquiera una pantalla "Mi perfil" distinta de `/personas/[yo]`? Sí, por dos razones: es la única con Editar y con el renglón "Completa tu perfil"; y es a donde lleva el avatar de la barra. Pero debe ser la misma ficha, no otra. *Hick (una decisión por pantalla), Progressive disclosure (configurar es capa c), Jakob (engrane = ajustes).*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### R1 · Van a lo mismo
**Propuesta.** En la ficha ajena, si la persona que mira tiene sesión y comparte eventos próximos con la persona de la ficha, una sección "Van a lo mismo · N" antes de "Va a". Lo calcula el sistema; no aparece si no hay coincidencias ni sin sesión. Es lo que la ficha ajena puede afirmar que a nadie más le sirve. *UX invisible, Peak-End.*
**Tu decisión:** ☒ entra (2026-09-15)

### L2 · Dónde como renglón resuelto y el mapa en su hoja
**Qué se ve.** Nombre; debajo "Ubicación" con "Estoy aquí", un mapa de 280 px y un campo de dirección; luego el tipo. Todo a la vez, antes de escribir.
**Propuesta.** Como el alta de evento (decisión 10 de [11](11-restantes-flujo-y-estados.md), firmada): Nombre con foco y teclado; debajo dos renglones, "Dónde" y "Tipo". Al elegir una sugerencia de Mapbox, "Dónde" queda resuelto con la dirección y "a 400 m de ti"; "Tipo" queda resuelto con lo deducido. Si el nombre no está en Mapbox, "Dónde" queda pendiente con dos salidas en el mismo renglón: "Estoy aquí" y tocar para abrir la hoja. La hoja "Dónde está" ocupa la pantalla: campo de dirección, "Estoy aquí", mapa grande con el punto azul de la persona y el pin, la dirección deducida del pin, y "Listo". El mapa nunca compite con el campo de nombre. *Hick, UX invisible, Similitud (mismo lenguaje que el alta de evento), Fitts (mapa grande cuando se usa).*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### L5 · Por qué no paginar
**Qué propone el founder.** Pasos: Nombre → Dónde → Tipo → Publicar.
**Cuestionamiento.** Paginar sirve cuando hay muchos datos, cuando cada paso depende del anterior o cuando el teléfono no da para ver el conjunto. Aquí hay dos datos obligatorios y uno deducido. Con pasos: (1) un toque "Siguiente" por pantalla que hoy no existe, (2) lo ya resuelto desaparece de la vista y hay que confiar en que quedó, (3) volver a corregir el nombre exige retroceder, (4) el alta de evento y el de artista ya usan renglones resueltos, y el alta de lugar sería la única distinta. Lo que sí toma de la idea: el orden (nombre primero, dónde después, tipo al final) y que el mapa no se vea hasta que toca; eso lo da la hoja a pantalla completa. Si el founder prefiere ver los pasos, se puede prototipar como variante; la recomendación es no. *Gradiente de meta (lo resuelto se muestra resuelto), Hick, Similitud.*
**Tu decisión:** ☐ renglones resueltos ☐ quiero ver la variante paginada
