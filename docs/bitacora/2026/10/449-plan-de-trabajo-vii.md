# 449 · Plan de trabajo del Gestor VII (19 de octubre de 2026)

**Fecha:** 2026-10-19. **Rama:** `gestor-registro-52`, solo documentación. **Operador:** Gestor VII (Fable 5.1), sesión `local_d8912ad1-2dff-4f1b-a792-ab5829b8eb1a`. **Pedido del founder:** al presentarle la revisión de la semana (bitácora 446) contestó «Adelante, tomo tus recomendaciones», cambió la convención de hora y sumó siete comentarios con la instrucción «hay cosas que ya había compartido antes, identifica y no dupliques» y «terminemos con un nuevo plan de trabajo».

## 1. Decisiones del founder de hoy (textuales)

- «Adelante, tomo tus recomendaciones»: **cancelar un evento antes de que pase** entra, con aviso a quienes dijeron «Voy», sin recordatorio, con prototipo primero; la palabra para lo de dentro de un festival es **«actividades»**; el **banner de compartir no se pinta en un Inicio vacío** y el vacío recibe «Publicar un evento» y la ciudad más cercana con eventos; el crédito de la API arranca por **Oaxaca y luego CDMX**.
- «para formato de hora ya me señaló un usuario que 19:00 hrs era confuso, es mejor usar 7:00 pm Ajusta por favor»: **toda la app en 12 horas**, siempre con minutos y «am»/«pm» en minúsculas («7:00 pm»; un rango «8:00 pm a 2:00 am»). Sustituye a la propuesta de la 446 de ir a 24 horas.
- «Haz que el botón de invitar a tus amistades (cambia texto a invitar a tus amigos) que actualmente está en ajustes, ahora se vea desde el perfil de un usuario, pídeselo a CODEX»: encargado (OL-416, abajo).

## 2. Qué ya estaba anotado y qué es nuevo (para no duplicar)

| Comentario de hoy | Dónde estaba | Qué cambia hoy |
|---|---|---|
| Seguir escuchando o viendo una novedad al navegar | Pedido del 4 de octubre (memoria «mini reproductor»; novedades en OL-171, OL-181 y OL-280) | Nada nuevo en el pedido; entra a la cola con prototipo (toca el armazón). Límites ya explicados: audio sí; video en miniatura en el iPhone no (Safari no hace PiP de reproductores de terceros); la pantalla de bloqueo la llena la plataforma; al recargar se corta. |
| Quitar «Por correo» de la ventana de avisos; correo encendido por omisión solo para boletín; retomar el boletín | **OL-138 y doc 28** (decidido el 23 de septiembre: la palanca «Por correo» pasa a significar boletín; jueves 9:00 cada dos semanas, de 3 a 8 eventos, sobresaliente = destacado o 3+ «Voy», actividad reciente = 45 días; nunca se encendió) | Es nuevo que esté **encendido por omisión** y que la ventana de «Voy» ya no ofrezca correo. Pide una decisión de consentimiento (sección 5). |
| Compartir un evento en Instagram, X, Threads y Facebook como publicación, reel o historia | **OL-291 / doc 52** (generador de flyers: publicación 4:5 firmada, historia 9:16 «para después»; esperaba al alta por pasos, que ya existe) | Es nuevo el pedido de **compartir desde la ficha del evento**. Límite técnico: desde la web no se publica directo en esas redes; lo que sí hay es la hoja de compartir del teléfono con la imagen y el texto, y dentro de Instagram la persona elige publicación o historia. **Reel no**: pide video. X, Threads y Facebook reciben texto, enlace e imagen por la misma hoja. |
| Hora a la que se emiten las notificaciones y criterio de push vs. app | Nuevo | Comprobado hoy con datos (sección 3). |
| «Invitar a tus amigos» desde el perfil | Nuevo | OL-416 a Codex, hoy. |
| Analítica para SEO y posicionamiento orgánico | **OL-277** (informe SEO y plan por etapas A–D; solo la A hecha), **OL-325** (medición propia en Vercel y Google Analytics, en producción), Search Console verificada el 4 de octubre | Nuevo: ya hay dos semanas de datos para leer. Pieza de lectura primero, etapas B–D después. |
| Becas abiertas para artistas; blog literario y de novedades | **Blog**: ya lo pidió en OL-171 («más adelante estas publicaciones deben incluirse en blog»), OL-191 y doc 40 (L52, L54). **Becas**: nuevo | Se juntan en una sola sección (sección 4, punto 16). |
| Revisar proyectos abiertos o pospuestos | — | Sección 6. |

## 3. Lo que comprobé hoy sobre las notificaciones (producción, solo lectura, últimos 21 días)

- **Qué existe.** Tres avisos a personas: *nuevo evento* (a quien sigue al lugar o a un artista del evento), *recordatorio* (a quien dijo «Voy»; se crea cuando faltan menos de 24 horas) y *cambio de fecha o lugar* (a quien dijo «Voy»). Aparte, los avisos al administrador. Canales: push (navegador o app de iPhone) y correo. **No hay bandeja de notificaciones dentro de la app**: lo único «en la app» es el aviso de abajo (hecho / Deshacer) y la fila «Ahora» de Inicio.
- **Quién los recibe.** 80 cuentas: 14 con push encendido, 11 con correo.
- **A qué hora salen.** El único reloj del código es el cron de Vercel a las 9:00 (hora de México; sin cambios en el historial). Pero la cola se vació también a otras horas: hubo entregas a las 0, 2, 7, 10, 11 y de 16 a 20 h; de las 9 de la madrugada, todas fallaron menos un recordatorio. Como el recordatorio se crea en cuanto faltan menos de 24 horas, uno para un evento de las 8 pm puede salir a las 8 pm del día anterior («Mañana: …») o a medianoche («Hoy: …»). Eso explica lo que vio el founder. Quién llama a la cola fuera del cron lo confirmo en la pieza (no hay tarea programada ni otro cron en el repo).
- **Propuesta (punto 4 de la cola):** un solo recordatorio por evento, a las 9:00 am del día del evento en la zona del evento (y para lo que empieza antes de las 11 am, la víspera a las 7:00 pm); *nuevo evento* y *cambio* respetan un **horario de silencio de 9 pm a 9 am** (se guardan y salen a las 9); el texto dice «Hoy a las 7:00 pm · Lugar». Con un cuadro en la bitácora de qué dispara push, qué correo y qué nada, para que el founder lo apruebe.

## 4. El plan, en orden

**En marcha hoy**
1. **OL-415 · Higiene** (agente Opus, rama `higiene-revision-446`, bitácora 447): guarda de `.env` en los dos scripts de captura, personas inventadas en `grafo-3d.html`, `npm audit fix`, fuera «Preparar una reseña · Pronto», letreros sin «ficha» («Ver más información», «Ya está publicado · Verlo»).
2. **OL-416 · «Invitar a tus amigos» en Mi perfil** (Codex, rama `invitar-desde-perfil`, bitácora 448): el renglón sale de Ajustes y se ve en el perfil propio.

**Siguiente, directo a código (no necesita más decisiones)**
3. **Hora «7:00 pm» y «actividades»:** una sola función de hora en 12 horas para listas, Inicio, fichas, Revisa, alta y horario del lugar; una sola palabra para lo de dentro del festival y sin repetir número y frase en la cabecera; una noche se dice «sáb 17 oct · 8:00 pm a 2:00 am»; «Función n de N» cuenta todas. Chica-mediana.
4. **Hora de las notificaciones** (sección 3). Chica-mediana, con migración que solo añade.
5. **Gestos y capas** (auditoría privada de Codex del 14 de octubre): el enlace de las historias suelta la captura al navegar, una sola pila del bloqueo entre mapa y hoja, cancelar un arrastre no confirma, pausa mientras se pulsa. Mediana, con pruebas de componentes.
6. **Botones, ✕ y renglón con estados:** todo a `ui/Boton` y `ui/Cerrar`; estados «pasado | cancelado» dentro de `ui/Renglon`; chip gris para Oculto, Borrador y Privado; un token para los rótulos. Mediana.
7. **Memoria y salidas rotas:** lo plegado se recuerda al volver; editar a festival permitido sin programa o apagado con razón. Chica.
8. **Imágenes con tamaño y prueba ampliada:** `sizes` en las ocho fotos que bajan entera (también alivia la cuota de Supabase); Tu año, historial, hoja del PDF e historias en `medir`; `--letra=2` en la CI. Chica y mediana.
9. **Inicio vacío:** sin banner, con «Publicar un evento» y la ciudad más cercana con eventos; medir «cerrar». Chica. (Pensado para Oaxaca y CDMX.)

**Con prototipo primero (superficies nuevas)**
10. **Cancelar antes de que pase:** chip rojo, sin «Voy», sin recordatorio, aviso a quienes van.
11. **Correo y boletín:** la ventana de «Voy» sin «Por correo» (solo teléfono); la palanca del perfil dice «Boletín cada dos semanas»; boletín encendido por omisión según la decisión de la sección 5; el boletín de OL-138 se construye y se enciende.
12. **Compartir un evento en redes:** desde la ficha, «Compartir» con la imagen de publicación (4:5) y una segunda salida «Historia» (9:16), texto corto y enlace; usa el generador de flyers de OL-291 para los eventos sin cartel. Reel fuera.
13. **Mini reproductor** de novedades: barra fija sobre la navegación que vive en el armazón; audio; reproductores oficiales de SoundCloud, Mixcloud, YouTube y Vimeo (Bandcamp a medias).
14. **«¿Es este?» en hoja** sobre Revisa, y **la portada del sistema en la cabecera** cuando no hay cartel (junto con si baja la cabecera del 56 %).
15. **«Rutinas» en Administración y la carga de ciudades** con el crédito de la API (200 USD, vence el 11 de noviembre): Oaxaca primero con bandeja de propuestas; CDMX después; el selector de ciudad en el grafo.
16. **Blog, novedades y becas:** una sección pública con tres tipos de entrada (novedades de artistas, becas y convocatorias abiertas, textos literarios), curada desde Administración y alimentada por una rutina de IA que propone y el founder aprueba. Documento de definición y prototipo; se construye después de las ciudades.

**Lecturas (sin código)**
17. **SEO:** leer Search Console y Google Analytics (en el Chrome del founder), comparar con el informe de OL-277 y proponer las etapas B–D con cifras.

## 5. Decisiones que siguen siendo del founder

1. **Boletín por omisión:** ¿también para las 69 cuentas que hoy tienen el correo apagado? Recomiendo encenderlo para las cuentas **nuevas** (al registrarse, con la frase «Te mandaremos el boletín cada dos semanas; lo apagas cuando quieras») y a las existentes preguntarles **una vez dentro de la app**, no mandarles un correo que no pidieron: un correo no pedido acaba en quejas y rebotes, y eso baja la entrega de todos los demás.
2. **Hora del recordatorio:** ¿9:00 am del día del evento y silencio de 9 pm a 9 am para lo demás?
3. **Lenguaje:** el banner dice «amigxs» (texto suyo del 14 de octubre) y el botón nuevo «amigos» (texto suyo de hoy); la marca se escribe «Somos Nosotrxs» en 14 sitios y «Somos Nosotros» en 123. ¿Unificamos y hacia cuál?
4. **Aprobación de las propuestas de la rutina de ciudades:** recomiendo la primera tanda **una por una** (para calibrar) y después **por fuente**. ¿Estado de México conurbado cuenta como CDMX? ¿La zona dentro de la ciudad solo se muestra o también filtra? ¿Qué ve el grafo al abrir?
5. **Costo:** ¿«Por confirmar» también para el evento suelto? ¿Revisamos a mano los importados con precio vacío?
6. **Prototipo del grafo:** ¿reescribir el historial de git por los datos de las 13 personas? Recomiendo **no**: riesgo bajo, costo alto; hoy se sustituyen los datos.
7. **«¿Es este?»** también para expos, festivales y actividades?
8. **Compartir en redes:** ¿arrancamos con publicación 4:5 e historia 9:16, sin reel?

Si no contesta algo, queda como lo recomiendo.

## 6. Proyectos abiertos o pospuestos (revisados hoy)

- **Siguen vivos y entran al plan:** generador de flyers (OL-291, dentro del punto 12); mini reproductor (punto 13); boletín (OL-138, punto 11); blog (punto 16); SEO etapas B–D (punto 17); cabecera oscura al 56 % (punto 14); la reseña con IA de la hoja del PDF (hoy se quita el «Pronto»; la pieza queda para después del boletín).
- **Historial, pieza 5 de 5:** «lo anterior a la app e integrantes de grupos» (bitácoras 421 a 427). Sin empezar; propongo dejarla después del punto 11.
- **Artistas de fuera con evento aquí** (nota del founder del 3 de octubre, «tenemos un error»): sigue vivo. El carril «Artistas con eventos esta semana» todavía filtra por la ciudad del artista (`cargarEventosSemana.ts:60`), así que un artista de Guadalajara con evento en San Luis no sale. Chica; la sumo al punto 7 si el founder confirma que la ciudad del evento manda.
- **Resueltos desde entonces, se cierran:** «guardar el sitio nuevo al elegirlo» (el alta por pasos ya ofrece «Guardarlo como lugar»); «Dónde» siempre abre una ficha (OL-348); el reto expo/evento/festival (clases, OL-345 y siguientes).
- **Pospuestos por decisión del founder, sin cambio:** entrar sin salir del sitio (OL-071b, lo único que arregla el atrás de Safari tras entrar); «pedir ayuda al volver» (OL-033, hasta entrevistas); la app de iPhone en la tienda (TestFlight 1.0 (5) subida el 6 de octubre, la siguiente es la 6; la revisión de App Store espera los textos sin «sin fines de lucro»); Android (Play Console dada de alta el 6 de octubre; espera el celular de pruebas).
- **Pendientes chicos que se cobran en su pieza:** píldora gris «Sitios sin ficha» y el grafo en horizontal (233 px); la fecha de «Alta» repetida y el buscador de 220×24 en Administración; «Charlemos» leído como artista; «Sesión n de N» en la fila «Ahora»; Buscar sin «Taller» en la ceja; el filtro «Gratis» que cuenta el precio vacío; el «scroll infinito» con el teclado en un iPhone viejo (antecedente, sin modelo).
- **Infraestructura:** la cuota de tráfico de Supabase (402 el 3 de octubre) sigue siendo una decisión del founder (plan o tope); el punto 8 baja el tráfico de imágenes.

## 7. Números

OL-415 y bitácora 447 (higiene, agente); OL-416 y bitácora 448 (invitar, Codex); bitácora 449 (este plan). **Siguientes libres: OL-417 y bitácora 450.**
