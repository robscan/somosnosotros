# Ficha de evento · lista de fricciones (v1, para corrección del founder)

**Fecha:** 2026-09-14 · **Pantalla:** `/eventos/[id]` · **Mirada:** capturas 390×844 sin sesión, con y sin cartel; medidas del DOM · **Carta:** [PRINCIPIOS_UX.md](../PRINCIPIOS_UX.md) · **Por qué esta pantalla ahora:** es la entrada real de la app (el enlace que llega por WhatsApp) y donde viven "Voy", quién va y la pregunta de avisos · **Quién decide:** el founder corrige, tacha y firma; el agente propone.

## Diagnóstico

La ficha tiene siete elementos con el color de acción y ninguna jerarquía: el botón lleno es "Compartir por WhatsApp" cuando el propósito de la pantalla es decir "Voy" y ver quién va. Tres botones a ancho completo (compartir, calendario, cómo llegar) se interponen entre la información y la acción social, que queda a 692 px de 844. El cartel se recorta a 16:9 y pierde el texto que trae. Propuesta de fondo: información primero con los mismos iconos de la agenda, "Voy" como única acción primaria pegada abajo, quién va como prueba social compacta, y compartir, calendario, cómo llegar y menú de autor como capas secundarias.

## Resumen por severidad

| # | Fricción | Ley que la nombra | Severidad | Propuesta en una línea |
|---|---|---|---|---|
| F1 | Siete elementos rojos; el lleno es Compartir, no Voy | Von Restorff · Hick | Alta | Una sola acción primaria: Voy, pegada abajo; el resto sin acento |
| F2 | El cartel se recorta a 16:9 y pierde su texto | Evidencia, nunca promesa | Alta | Cartel a su proporción real, sin recorte, con toque para verlo entero |
| F3 | Tres botones a ancho completo antes de la acción social | Hick · Fitts · Serial position | Alta | Compartir arriba a la derecha; calendario y cómo llegar como acciones de icono en su renglón |
| F4 | Fecha, precio y lugar con formato distinto al de la agenda | Similitud · Jakob (dentro de la app) | Media | Mismos renglones con icono: reloj, pin, personas, boleto |
| F5 | "Voy" y "Me interesa" con el mismo peso dentro de una caja gris | Hick · Región común | Media | Barra inferior pegajosa: Voy lleno, Me interesa en texto |
| F6 | Quién va como lista de nombres a lo largo | Chunking · Progressive disclosure | Media | Avatares apilados + "Van 12: Ana, Luis y 10 más"; se despliega al tocar |
| F7 | Descripción sin lugar claro ni límite | Progressive disclosure | Media | Bajo la información, 4 líneas y "más" |
| F8 | Reportar, Editar y Duplicar como enlaces sueltos al pie | Progressive disclosure (capa c) | Media | Menú "···" arriba a la derecha con esas acciones |
| F9 | La pregunta de avisos tras el Voy queda dentro de la caja de asistencia | Región común | Media | Hoja emergente desde abajo, ligada al gesto de Voy |
| F10 | Sitio reservado como párrafo largo | Chunking · Evidencia | Baja | Renglón de lugar con candado y una línea: cuándo se revela |
| F11 | Fecha larga con coma ("domingo, 22 de agosto de 2027, 20:00") y sin fin | Chunking | Baja | "domingo 22 de agosto de 2027 · 20:00 a 23:12" |
| F12 | Aviso "Publicado. Compártelo" sin la acción al lado | Peak-End | Baja | El aviso trae el botón Compartir; es el momento |

## Detalle por fricción

### F1 · Una sola acción primaria
**Qué se ve.** Rojo en: enlace al lugar, Compartir (lleno), Agregar a mi calendario, Cómo llegar, Voy (lleno), Me interesa, enlace al autor. Dos botones llenos en la misma pantalla.
**Por qué duele.** Von Restorff: solo una cosa puede brillar. Hick: compartir, guardar y llegar son caminos distintos con el mismo peso que decidir si vas.
**Propuesta.** "Voy" es la única acción con acento, en una barra pegajosa abajo (zona del pulgar, siempre visible mientras se lee). Compartir sube a la barra superior como icono, a la derecha (es el estándar de iOS; sería la única excepción a "nada a la derecha en pantallas interiores", y la propongo porque compartir es lo que hace que la ficha exista). Calendario y cómo llegar quedan como acciones de icono junto al dato al que pertenecen. Los enlaces (lugar, autor) van subrayados en color de texto.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F2 · El cartel entero
**Qué se ve.** La imagen se pinta a ancho completo con altura máxima 360 px y `object-fit: cover`: un cartel vertical pierde arriba y abajo, justo donde está el texto.
**Por qué duele.** Evidencia: el cartel es la fuente que la persona quiere leer (fecha, hora, dirección, "trae tu bebida"). Recortarlo es prometer y no entregar.
**Propuesta.** Mostrar el cartel a su proporción real, ancho completo, sin recorte, con esquinas redondeadas y toque para verlo a pantalla completa. Sin cartel, sin hueco: la información sube.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F3 · Acciones secundarias en su sitio
**Qué se ve.** Tres botones de 48 px a ancho completo (144 px más aires) entre la información y "Voy".
**Por qué duele.** Serial position y Fitts: ocupan la posición y el tamaño de lo importante. Hick: tres decisiones antes de la que cuenta.
**Propuesta.** Compartir: icono en la barra. Agregar a mi calendario: icono al final del renglón del cuándo. Cómo llegar: icono al final del renglón del dónde. Más información (enlace externo): renglón discreto al final de la descripción.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F4 · Los mismos renglones que la agenda
**Qué se ve.** "domingo, 22 de agosto de 2027, 20:00" en negrita; "Gratis" en gris; "Casa 1100" como enlace rojo. En la agenda esos mismos datos van con reloj, pin, personas y boleto.
**Propuesta.** Cuatro renglones con icono, en este orden: cuándo (con calendario al final), dónde (nombre del lugar y dirección; con cómo llegar al final), quiénes van (cantidad; toca y baja a la lista), cuánto (precio o Gratis). Misma letra y peso que la agenda: lo aprendido en una pantalla sirve en la otra.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F5 · Barra inferior pegajosa con Voy
**Qué se ve.** "Voy" y "Me interesa" dentro de una caja gris a media pantalla, uno lleno y otro con borde.
**Propuesta.** Barra pegajosa al pie (la ficha es interior: no hay navegación abajo, el espacio es libre): "Voy" lleno a lo ancho, con "Me interesa" en texto a la izquierda. Con Voy dicho: "✓ Voy" en verde y "Quitar" en texto. Sin sesión, el mismo botón lleva a entrar y el Voy se aplica al volver (ya funciona así; se conserva).
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F6 · Quién va, compacto
**Qué se ve.** Lista vertical con avatar y nombre por persona; con 30 personas, 30 renglones.
**Propuesta.** Un renglón: avatares apilados (hasta 4) + "Van 12: Ana, Luis y 10 más". Tocar despliega la lista completa en el sitio (capa b). "A 3 personas les interesa" en gris debajo. Sin nadie: "Nadie ha dicho que va todavía. Sé la primera persona".
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F7 · Descripción con límite
**Propuesta.** Bajo los renglones de información, 4 líneas y "más" que despliega en el sitio. Si el cartel ya lo dice todo y no hay descripción, no hay bloque.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F8 · Menú de autor
**Qué se ve.** "Publicado por robscan. Reportar" al pie, y para el autor "Editar" y "Duplicar con otra fecha" como enlaces.
**Propuesta.** "Publicado por robscan" se queda al pie como información. Reportar, Editar, Duplicar y Ocultar (admin) van en un menú "···" arriba a la derecha (capa c): existen, no compiten.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F9 · La pregunta de avisos como hoja
**Qué se ve.** Hoy la tarjeta "Vas a X. ¿Te recordamos ese día?" aparece dentro de la caja de asistencia.
**Propuesta.** Con Voy en la barra inferior, la pregunta emerge como hoja desde abajo, ligada al gesto, con el mismo contenido y las mismas fases (correo, teléfono, ambos, no). Se cierra sola al terminar.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F10 · Sitio reservado en un renglón
**Propuesta.** El renglón de dónde muestra el nombre público con un candado y una línea: "La dirección se revela aquí el sábado a las 16:00" o, sin sesión, "Entra para verla cuando toque". Cuando se revela, el renglón cambia a la dirección con cómo llegar.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F11 · Fecha larga limpia
**Propuesta.** "domingo 22 de agosto de 2027 · 20:00 a 23:12" (sin coma tras el día; con fin si lo hay; año solo si no es el actual, como ya hace la agenda).
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F12 · Publicado, con la acción al lado
**Propuesta.** Tras publicar: "Publicado. Ya está en la agenda." con el botón Compartir dentro del aviso. Es el pico del flujo de publicar; la acción va donde está la emoción.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

## Niveles de atención propuestos

| Nivel | Qué es | Qué va ahí |
|---|---|---|
| 1 · Lo que importa | Información | Cartel entero, título, cuándo, dónde, cuánto |
| 2 · Lo accionable | Acción | Voy (barra pegajosa abajo); Me interesa en texto |
| 3 · Prueba social | Información | Quién va, compacto y desplegable |
| 4 · Lo demás | Progressive disclosure | Compartir (barra), calendario y cómo llegar (icono en su renglón), descripción (4 líneas y más), menú ··· (reportar, editar, duplicar) |

## Qué sigue

1. Tú corriges la lista y decides F1 (compartir a la derecha en la barra interior) y F5 (barra pegajosa).
2. Flujo, estados (sin sesión, con Voy, sitio reservado, sin cartel, borrado, publicado) y decisiones numeradas.
3. Prototipo navegable a 390×844 en la misma familia que el del inicio.
4. PR con captura y tu firma en el iPhone.
