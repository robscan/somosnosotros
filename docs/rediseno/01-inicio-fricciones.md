# Inicio · lista de fricciones (v1, para corrección del founder)

**Fecha:** 2026-09-14 · **Pantalla:** `/` (mapa + panel con pestañas Agenda · Lugares) · **Mirada:** capturas 390×844 sin sesión, panel a media altura y expandido, pestaña Lugares; medidas tomadas del DOM · **Carta:** [PRINCIPIOS_UX.md](../PRINCIPIOS_UX.md) · **Quién decide:** el founder corrige, tacha y firma esta lista; el agente propone.

## Diagnóstico

El inicio no tiene jerarquía: seis piezas compiten en los primeros 450 px (marca, ciudad y conteo, Entrar, aviso de instalar, pestañas, botón de publicar) y el primer evento aparece a 444 px con el panel expandido y a unos 756 px a media altura, en una pantalla de 844. Nada de lo que da recurrencia, los eventos, vive en la zona de atención primaria; lo que sí vive ahí es información de sistema y acciones de la minoría. Propuesta de fondo: agenda como raíz, barra fija de identidad y navegación arriba, mapa como modo.

## Resumen por severidad

| # | Fricción | Ley que la nombra | Severidad | Propuesta en una línea |
|---|---|---|---|---|
| F1 | Mapa como raíz; la agenda vive en un panel | Atención selectiva · Evidencia, nunca promesa · Doherty | Alta | Agenda raíz; conmutador Lista · Mapa; mapa en fichas |
| F2 | Identidad y navegación dentro del panel arrastrable, mezcladas con el conteo | Región común · Fitts · Topografía | Alta | Barra superior fija: marca a la izquierda, perfil o entrar a la derecha |
| F3 | Tres cosas brillan en rojo: Entrar, Publicar, el "cuándo" | Von Restorff · Hick | Alta | Una sola cosa con acento por pantalla; el cuándo es información, no acción |
| F4 | Aviso de instalar antes del primer contenido | Atención selectiva · Peak-End | Alta | Después del primer "Voy" o "Seguir", o en Mi perfil |
| F5 | Pestañas Agenda · Lugares como conmutador de contenido | Hick · Modelo mental · Jakob | Alta | Agenda es el inicio; Lugares es un destino (capa c) con el mapa dentro |
| F6 | Botones de publicar y registrar a ancho completo, arriba, antes de la lista | Serial position · Fitts · Hick | Media | Una sola acción "Publicar", en zona del pulgar, con la sesión pedida después |
| F7 | Tres alturas del panel que la persona administra (peek, medium, expanded) | El gesto gana · Doherty | Media | Con agenda raíz, la mecánica del panel desaparece del inicio |
| F8 | Tarjeta de evento con jerarquía invertida y miniatura con inicial | Similitud · Evidencia, nunca promesa | Media | Cuándo en peso, no en color; sin miniatura inventada; precio solo si aporta |
| F9 | "Hoy" del grupo repetido dentro de la tarjeta ("Hoy · 19:30") | Chunking · Memoria de trabajo | Baja | Dentro del grupo Hoy, solo la hora |
| F10 | Búsqueda de lugares siempre visible con 2 lugares | Progressive disclosure | Baja | Aparece al superar un umbral, o como icono en la barra |
| F11 | "Cargando el mapa…" es el primer texto que se lee; conteo "2 eventos · 2 lugares" como saludo | Evidencia, nunca promesa · Doherty | Media | Sin mapa raíz no hay carga; el conteo se vuelve título de grupo o desaparece |
| F12 | Región común no distinguible: cabecera, aviso, pestañas y botón comparten fondo y aire iguales | Región común · Proximidad | Alta | Aire entre grupos, borde solo donde hay relación real; tipografía y peso en vez de cajas |

## Detalle por fricción

### F1 · Mapa como raíz
**Qué se ve.** La mitad superior es un mapa que pinta lugares, no eventos, con dos pins encimados (los dos lugares reales están a metros). El primer texto legible al abrir es "Cargando el mapa…". La agenda, que es la razón de volver, empieza en la mitad de abajo y su primera tarjeta queda a 756 px de 844.
**Por qué duele.** La pregunta de la persona recurrente es "qué hay hoy", no "dónde hay centros". El mapa promete cobertura que hoy no existe y cuesta el arranque más caro (Mapbox y los cuadros). Mapa primero es el patrón de Google Maps porque su tarea es la ubicación; las apps de eventos donde la gente ya vive son lista primero.
**Propuesta.** Agenda como raíz (Hoy · Esta semana · Próximos, pantalla completa, primer evento en el tercio superior). Conmutador "Lista · Mapa" al mismo nivel, cargando el mapa solo al tocarlo. Mapa pequeño con "cómo llegar" en la ficha de evento y de lugar. El mapa completo cobra sentido dentro de Lugares cuando la semilla real esté cargada.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F2 · Identidad y navegación dentro del panel
**Qué se ve.** "somosnosotros", "San Luis Potosí · 2 eventos · 2 lugares" y "Entrar" (o avatar y nombre) viven en la cabecera del panel arrastrable, a 56 px del borde. Al arrastrar el panel, la marca y la navegación se mueven con el contenido. El conteo es información de sistema pegada a la identidad.
**Por qué duele.** Región común: identidad, navegación y contenido son tres grupos con tres funciones y hoy comparten una sola caja. Fitts: el acceso al perfil debería tener una posición fija y predecible. Topografía: lo que navega vive en la barra, no en el contenido.
**Propuesta.** Barra superior fija que respeta el área segura del iPhone: marca a la izquierda (texto "somosnosotros", con "San Luis Potosí" como subtítulo discreto o sin él, ya que hay una sola ciudad), perfil o entrar a la derecha como avatar o icono, sin color de acción. El conteo desaparece de la cabecera: si sirve, es título de grupo ("Hoy · 1").
**Sobre el desfase negativo para sacar el logo de Mapbox del viewport.** Lo pido revisar antes de hacerlo: las condiciones de uso de Mapbox exigen que el logotipo y la atribución queden visibles cuando se muestra el mapa; recorrerlos fuera de la pantalla equivale a quitarlos. Con agenda como raíz el conflicto desaparece del inicio: el logo solo existe dentro del modo mapa, donde puede ir abajo a la izquierda sin competir con la barra. Si prefieres conservar el mapa en el inicio, la barra puede ir encima del mapa y el logo moverse abajo; lo que no haría es ocultarlo.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F3 · Tres cosas brillan
**Qué se ve.** "Entrar" en rojo lleno, "+ Publicar un evento" en rojo con borde, y "Hoy · 19:30–23:12" en rojo dentro de cada tarjeta. Tres elementos con el color de acción en la misma pantalla, y uno de ellos es información.
**Por qué duele.** Von Restorff: solo una cosa puede brillar por pantalla. Hick: dos accionables rojos son dos caminos para la misma decisión de "qué hago aquí". Y el rojo en el cuándo enseña que el rojo no siempre es acción, lo que devalúa el color donde sí lo es.
**Propuesta.** En el inicio la acción única es tocar un evento; por tanto ningún botón lleva el acento. Entrar se vuelve avatar o icono neutro en la barra. Publicar se vuelve un botón flotante o de barra, con el acento solo si decides que publicar es la acción de la pantalla (no lo creo: es la acción de la minoría). El cuándo va en negro con peso medio.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F4 · Aviso de instalar antes del contenido
**Qué se ve.** "Tenla en tu teléfono: en el menú del navegador, Agregar a pantalla de inicio" con una X, en la primera visita, en cualquier móvil, antes de ver un solo evento. Ocupa 55 px y solo se calla si se cierra o si la app ya está instalada.
**Por qué duele.** Atención selectiva: está fuera de la meta de quien llega ("qué hay hoy"). Peak-End: el primer momento es una petición, no un valor. UX invisible: pedimos instalar antes de dar motivo.
**Propuesta.** Mostrarlo después del primer "Voy" o "Seguir" (ahí el motivo existe: "para que te avisemos"), y siempre disponible en Mi perfil. Nunca en el inicio antes del contenido.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F5 · Pestañas Agenda · Lugares
**Qué se ve.** Un control segmentado con dos pestañas dentro del panel, cada una con su propio botón a ancho completo (publicar, registrar) y su propia lista.
**Por qué duele.** Modelo mental: un segmentado sugiere dos vistas del mismo contenido; aquí son dos objetos distintos (tiempo y espacio) con dos acciones distintas. Hick: el control obliga a decidir "agenda o lugares" antes de ver nada. Jakob: en móvil, dos destinos con identidad propia viven en una navegación inferior o como secciones, no como pestañas de contenido.
**Propuesta A (la que recomiendo).** Inicio = agenda. Lugares es un destino (capa c) al que se llega desde la barra (icono o texto "Lugares") o desde el final de la agenda ("Los lugares de la ciudad"). Dentro de Lugares vive la lista con búsqueda y el conmutador al mapa. Cada evento ya lleva su lugar, así que la agenda no pierde el "dónde".
**Propuesta B.** Navegación inferior con tres destinos: Agenda · Lugares · Yo. Convencional y estable, pero con dos objetos es poco para una barra y compite con el botón de publicar en la zona del pulgar.
**Tu decisión:** ☐ A ☐ B ☐ otra: ______

### F6 · Publicar y registrar arriba, a ancho completo
**Qué se ve.** "+ Publicar un evento" (agenda) y "+ Registrar un lugar" (lugares) antes de la lista, a 44 px de alto y ancho completo. Sin sesión llevan a Entrar.
**Por qué duele.** Serial position: ocupan la primera posición, la más recordada, con la acción de la minoría (gestores). Fitts: la zona barata del pulgar está abajo, no arriba. Hick: dos verbos distintos (publicar, registrar) para una misma intención ("quiero poner algo").
**Propuesta.** Un solo "Publicar" en zona del pulgar (flotante abajo a la derecha o en la barra), que al tocarlo pregunta "un evento o un lugar" solo si hace falta (si no hay lugares, va directo a registrar el lugar). Sin sesión, el mismo botón: la sesión se pide después, con el valor por delante.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F7 · Tres alturas del panel
**Qué se ve.** El panel tiene asa; tocarla cicla peek → medio → expandido → medio; se arrastra con umbral y velocidad. Para leer la agenda completa hay que expandirlo.
**Por qué duele.** El gesto gana, pero aquí el gesto es obligatorio: la persona administra la mecánica del contenedor para llegar al contenido. Doherty: cada cambio de altura es una espera de 300 ms antes de leer.
**Propuesta.** Con agenda raíz, el inicio es una página normal con scroll; el panel se conserva solo como pieza del modo mapa (si lo mantienes) o desaparece.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F8 · Tarjeta de evento
**Qué se ve.** Miniatura de 56 px con una "C" gris cuando no hay foto; "Hoy · 19:30–23:12" en rojo arriba; título en negrita; "Casa 1100 · Gratis" en gris. 72 px de alto.
**Por qué duele.** Evidencia, nunca promesa: la inicial gris es un relleno que no informa. Similitud: el rojo del cuándo se parece a un enlace. El precio "Gratis" ocupa espacio en todas las tarjetas aunque no cambie la decisión.
**Propuesta.** Sin foto, sin miniatura (la tarjeta se hace más ligera) o la foto del lugar si existe. Orden: título, cuándo (peso medio, negro), lugar; precio solo si hay precio. Las tarjetas de un mismo lugar en el mismo día pueden agruparse bajo el lugar.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F9 · "Hoy" repetido
**Qué se ve.** Grupo "Hoy" y, dentro, "Hoy · 19:30".
**Propuesta.** Dentro de Hoy, solo la hora; dentro de Esta semana, día y hora; dentro de Próximos, fecha y hora (con año si no es el actual, ya resuelto).
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F10 · Búsqueda siempre visible
**Qué se ve.** Campo "Buscar un lugar por nombre" con dos lugares en la lista.
**Propuesta.** Aparece cuando la lista supera un umbral (por ejemplo 8) o vive como icono en la barra de Lugares.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F11 · Textos de sistema al abrir
**Qué se ve.** "Cargando el mapa…" al centro y "San Luis Potosí · 2 eventos · 2 lugares" como saludo.
**Propuesta.** Sin mapa raíz no hay carga. El conteo se convierte en título de grupo o se quita. Los vacíos se dicen por causa: "Hoy no hay nada; esta semana sí" con el primer evento de la semana a la vista.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F12 · Región común no distinguible
**Qué se ve.** Cabecera, aviso de instalar, pestañas, botón de publicar y tarjetas comparten el mismo gris de fondo, el mismo radio y aires parecidos (8 a 12 px). No se sabe qué pertenece a qué.
**Por qué duele.** Región común y proximidad: los contenedores deben decir la verdad sobre la relación. Hoy todo parece del mismo grupo.
**Propuesta.** Tres grupos con tres tratamientos: barra (fija, sin caja), acciones (una, en zona del pulgar), contenido (grupos por tiempo con título y aire generoso entre grupos; tarjetas sin fondo o con fondo solo al tocar). El fondo gris se reserva para lo que agrupa de verdad.
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

## Niveles de atención propuestos (para que los corrijas)

| Nivel | Qué es | Qué va ahí |
|---|---|---|
| 1 · Lo que importa | Información | Los eventos de hoy y de la semana, con título, hora y lugar |
| 2 · Lo accionable | Acción | Tocar un evento (toda la tarjeta); un solo Publicar en zona del pulgar |
| 3 · Orientación | Información fija | Barra: marca, perfil o entrar, acceso a Lugares |
| 4 · Lo demás | Progressive disclosure | Lugares y mapa (destino aparte); buscar (por umbral); instalar (tras un Voy); ciudad (una sola, no se pregunta) |

## Qué sigue

1. Tú corriges esta lista (tachas, cambias severidades, decides F5 A/B y la barra de F2).
2. Con la lista firmada: flujo del inicio y estados (vacío por causa, carga, error, éxito) en una página.
3. Prototipo navegable del inicio en el navegador, a 390×844, para sentirlo antes de tocar el código.
4. Auditoría contra la carta → PR → captura → tu firma en el iPhone.
