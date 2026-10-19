# 57 · Ciudades nuevas, ubicación primero y boletín por región

**OL-417 · bitácora 450 · 2026-10-19.** Propuesta del Gestor VII, **solo documento, para firma del founder**. No autoriza código. Parte de lo que el founder dijo hoy, de lo que ya existe en el código y de los datos de producción (solo lectura).

## 1. Lo que el founder decidió hoy (textual)

- **Orden para abrir una ciudad:** «conviene primero identificar lugares en cada ciudad, luego darlos de alta, después identificar agendas culturales que compilen los eventos, como la de cultura que usamos cada inicio de mes, eso ahorrará trabajo, además busca un catalogo como el de CAPO por ciudad».
- **Administración:** «quiero que agregues al admin un listado de lugares abiertos, con un botón para buscar/registrar sus lugares, buscar eventos y buscar artistas, esos botones yo los detono para que se corran con api, así, cuando vea que se abre una nueva ciudad por los usuarios, yo decido si abrirla corriendo esta investigación». Lectura del gestor: «lugares abiertos» son **ciudades abiertas** (la frase sigue con «sus lugares»); si quiso decir otra cosa, lo corrige en la firma.
- **Lenguaje:** «amigxs y Somos Nosotrxs en toda la app».
- **Boletín:** «Boletín para todos, desde que quede creado y listo para enviar, con clara la opción de des suscribirse».
- **Contenido del boletín:** «usando criterios de inicio y distinguiendo por estado: Es decir tomar en cuanta la ubicación en la que están los usuarios (se deduce cuando consultan el catálogo y otorgan su ubicación».
- **Ciudad por omisión:** «ya no debe ser default que se presente San Luis Potosí como ciudad de inicio, se pregunta ubicación para mostrar contenido si no se tiene su ultima ubicación conocida».
- **Firma parcial, la misma tarde (textual):** «A favor de preguntar donde estás pero solo sin no hay ultima ubicación conocida. De acuerdo que hay que guardar la ciudad de la cuenta, pero considera que el usuario puede ir de vacaciones o quedarse a vivir en una nueva ciudad, entonces podemos hacer que esa ciudad cambie y el boletín cambie en consecuencia, si no hay info de la ciudad donde está entonces no hay boletín. Me retracto con boletín para todos, hagámoslo como dices, y si actualiza privacidad para que se considere de ahora en adelante.» Queda así: la pregunta «¿Dónde estás?» solo sin última ubicación conocida; la ciudad de la cuenta cambia con la persona (vacaciones, mudanza) y el boletín la sigue; **sin ciudad conocida no hay boletín**; boletín encendido para las cuentas nuevas y una pregunta dentro de la app a las existentes; el aviso de privacidad se actualiza y aplica de ahora en adelante.
- **«Acepto tus otras recomendaciones»** (bitácora 449): recordatorio a las 9:00 am del día del evento y silencio de 9 pm a 9 am para «nuevo evento» y «cambio»; propuestas de la rutina una por una en la primera tanda y por fuente después; «Por confirmar» también en el evento suelto y revisar los importados sin precio; no se reescribe el historial de git por el prototipo del grafo; «¿Es este?» también para expos, festivales y actividades; compartir en redes arranca con publicación 4:5 e historia 9:16, sin reel.

## 2. Cómo está hoy (comprobado)

- **Ciudad.** `CIUDAD_INICIAL` es San Luis Potosí (`src/lib/ciudad.ts:18`). La lista de ciudades se arma con los lugares y eventos publicados (hoy San Luis y San Miguel de Allende). Inicio, Lugares y Artistas leen `?ciudad=` y la elección guardada en el teléfono; la hoja de ciudades (OL-270) ordena por cercanía con la ubicación de un toque. `MISMA_CIUDAD` junta municipios conurbados bajo una ciudad.
- **Ubicación.** Vive solo en el teléfono (`localStorage`, punto redondeado, OL-095). El servidor no sabe dónde está nadie y `perfiles` no tiene ciudad. Nadie mide desde qué ciudad se consulta.
- **Boletín.** Diseñado el 23 de septiembre (doc 28: sobresaliente = destacado o 3+ «Voy»; actividad reciente = 45 días; jueves 9:00 cada dos semanas; de 3 a 8 eventos) y nunca construido. 80 cuentas: 11 con correo encendido, 14 con push.
- **Administración.** Secciones: Últimos 7 días, Cómo va la comunidad, Fichas, Invitaciones CAPO, Gestionar, Obras colectivas, Grafo cultural. Nada de ciudades.
- **Cargas.** Todo corre desde la Mac, no desde el servidor: `scripts/instituciones` (48 lugares institucionales, agendas y eventos de octubre), `scripts/capo` (catálogo municipal: 520 artistas, 13 lugares, invitaciones diarias), la guía de agendas (`docs/agendas/2026-10`), la rutina de redes (un chat) y la lectura de carteles con la API (la única pieza de la app que gasta crédito).
- **Marca.** «Somos Nosotros» 133 veces en `src` (título, manifest, Open Graph, correos, JSON-LD, Info.plist de la app de iPhone); «Somos Nosotrxs» 18.
- **Crédito.** 200 USD hasta el 11 de noviembre.

## 3. Áreas de oportunidad

1. **Pedir la ubicación en frío se rechaza mucho.** Un aviso del sistema en la primera pantalla, sin que la persona haya tocado nada, se niega con frecuencia y en iOS no se vuelve a preguntar. Hace falta una salida sin permiso (escribir la ciudad) y que el permiso se pida solo al tocar «Usar mi ubicación».
2. **Buscadores y enlaces compartidos no tienen ubicación.** Google y quien abre un enlace de WhatsApp deben ver contenido. Las fichas abren siempre; Inicio con `?ciudad=` respeta el enlace; sin ciudad, el robot ve la pregunta y la lista de ciudades con su URL canónica.
3. **El servidor no sabe la región de nadie.** Sin eso no hay boletín por región. Basta guardar la **ciudad** (nunca coordenadas) con su fecha en la cuenta, cuando la persona consulta con ubicación o elige ciudad.
4. **«Estado» como unidad queda grande o chico según la ciudad.** Recomendación: la unidad es la **ciudad ampliada** (lo que ya hace `MISMA_CIUDAD`: Oaxaca con Santa Lucía y Xoxocotlán; Ciudad de México con el Estado de México conurbado) y el **estado es el respaldo** cuando la ciudad no junta 3 eventos para el boletín.
5. **Nadie detecta una ciudad nueva «por los usuarios».** Contar consultas por ciudad y día, sin persona, basta para que Administración diga «Querétaro: 14 consultas esta semana, 0 lugares».
6. **La investigación de una ciudad es manual y vive en la Mac.** Para que un botón la detone hay que llevarla al servidor: tareas de minutos, por lotes encadenados, con registro de gasto y tope.
7. **Boletín para todos** habría significado escribir a 69 cuentas que no lo pidieron. El founder se retractó la misma tarde: encendido para las cuentas nuevas (con una frase clara al registrarse) y una pregunta dentro de la app, una sola vez, a las existentes. En todos los casos: baja de un clic, apagado automático al primer rebote o queja, ritmo quincenal y el aviso de privacidad actualizado.
8. **Cambiar la grafía de la marca** toca lo que Google ya indexa, el remitente de los correos y el nombre en las tiendas. Se mantiene «Somos Nosotros» como nombre alterno en el JSON-LD y el dominio no cambia.

## 4. Propuesta

### A. Ubicación primero: Inicio sin ciudad por omisión

- **Primera vez** (sin ciudad elegida ni última ubicación): Inicio abre con la tarjeta **«¿Dónde estás?»** bajo la cabecera: botón grande «Usar mi ubicación» (el permiso se pide al tocarlo) y un campo «Escribe tu ciudad» con ✕, que sugiere primero las ciudades con contenido y después cualquier ciudad vía Mapbox. Debajo, para que la primera pantalla no quede vacía: «Mientras tanto, lo más destacado en Somos Nosotrxs» con seis tarjetas de todas las ciudades. Sin agenda de ninguna ciudad hasta que conteste.
- **Con permiso:** la ciudad ampliada más cercana con contenido. Si la ciudad detectada no tiene nada, el Inicio vacío de esa ciudad (OL de la 446: sin banner, «Publicar un evento», la ciudad más cercana con eventos) y la ciudad queda **detectada** para Administración.
- **Permiso negado o error:** se queda el campo de ciudad, con la frase de siempre («No pudimos leer tu ubicación…»).
- **Última ubicación conocida:** como hoy en el teléfono, y además **con cuenta** la ciudad en el servidor (`perfiles.ciudad_actual`, `ciudad_actual_en`), que se actualiza cada vez que consulta con ubicación o elige ciudad: quien se va de vacaciones o se muda cambia de ciudad sin hacer nada, y el boletín la sigue (founder, firma parcial). Nunca coordenadas; una línea nueva en el aviso de privacidad, que aplica de ahora en adelante.
- **Enlaces y robots:** una ficha abre siempre; Inicio con `?ciudad=` gana a todo; sin ciudad, un robot ve la tarjeta y la lista de ciudades (cada una con su URL canónica, como hoy).
- **App de iPhone:** ya lee la ubicación nativa (OL-256); el flujo es el mismo.
- **Prototipo** sobre la pantalla real (`maqueta-pantalla.mjs`): primera vez, permiso negado, ciudad detectada sin contenido.

### B. Administración › Ciudades

- **Lista:** una fila por ciudad con **estado** (abierta · detectada · investigando), personas que consultaron en 30 días, lugares, eventos próximos, artistas y la fecha de la última investigación. Las detectadas salen de una tabla nueva `ciudades_vistas` (ciudad, día, consultas; sin persona).
- **Tres botones por ciudad, en el orden del founder:** «Buscar lugares» → «Buscar agendas y eventos» → «Buscar artistas». Cada uno abre una hoja que dice qué va a hacer, con qué fuentes, el tope de gasto en USD y «Correr». Corre **en el servidor** (tabla `investigaciones`: cola, lotes de 5 minutos encadenados, gasto acumulado y estado), no en la Mac. Mientras corre, la fila dice «Investigando lugares · 12 de 40 fuentes · 1,20 USD».
  - **Lugares:** fuentes por orden: el catálogo oficial de espacios culturales del Sistema de Información Cultural de México (por estado; hay que confirmar su cobertura y licencia), las páginas de la Secretaría de Cultura del estado y del municipio, y búsqueda web. Propone nombre, tipo, dirección geocodificada con Mapbox, redes y la fuente. Dar de alta = «Registrar» desde la bandeja, con procedencia.
  - **Agendas y eventos:** busca las agendas que compilan («agenda cultural <ciudad> <mes>», Cultura estatal y municipal, universidades, museos), las guarda como **fuentes** (como la guía de `docs/agendas`), y lee los eventos del mes con la lectura por pasos que ya existe; cruza el lugar con `lugares_con_nombre` y, si falta, propone «dar de alta el lugar». Cada mes el botón se vuelve a correr sobre las fuentes guardadas: eso es lo que ahorra trabajo.
  - **Artistas:** catálogos como el CAPO (padrones estatales de creadores, programas de estímulo, directorios de festivales) y propone fichas mínimas (nombre, disciplina, ciudad, enlace, fuente); la portada de su obra se busca después, como hoy.
- **Bandeja «Propuestas»:** una por una en la primera tanda; después aparece «Aprobar las N de esta fuente». Rechazar pide motivo (duplicado, no cultural, fuera de la ciudad, otro) y la rutina aprende a no proponerlo. Aprobar crea la ficha con `procedencia` y la fuente.
- **Costo:** se registra por corrida (tokens × precio). Estimación para empezar: entre 1 y 5 USD por botón y ciudad; el primer resultado real la ajusta. El tope por corrida lo pone el founder en la hoja; la consola de Anthropic tiene su propio tope.
- **Migraciones que solo añaden:** `ciudades_vistas`, `investigaciones`, `propuestas`, `fuentes`, `perfiles.ciudad_actual`.

### C. Boletín por región, para todos

- **A quién (firma parcial del founder):** las cuentas **nuevas** nacen con la palanca encendida y lo leen al registrarse («Te mandaremos el boletín cada dos semanas; lo apagas cuando quieras»); a las cuentas **existentes** se les pregunta **una sola vez dentro de la app**, no por correo. Cada correo trae **baja de un clic** (enlace y cabecera `List-Unsubscribe`) y en el perfil la palanca dice «Boletín cada dos semanas». Se apaga sola al primer rebote o queja. Quien ya se dio de baja antes (motivo `baja`) no se reactiva.
- **Región:** la ciudad actual de la cuenta, que cambia con la persona. Sin ciudad conocida **no se manda** (founder: «si no hay info de la ciudad donde está entonces no hay boletín»); la primera vez que la app sepa su ciudad, entra al siguiente envío.
- **Contenido con los criterios de Inicio** y los textos del doc 28: Tus planes (si hay), Destacados, Esta semana, Festivales y expos, lugares y artistas nuevos de la ciudad; de 3 a 8 eventos. Si la ciudad no junta 3, se completa con el estado y después con «cerca de ti».
- **Cuándo:** jueves 9:00 am en la hora de la ciudad, cada dos semanas, por lotes; indicadores en Administración (enviados, bajas, rebotes).
- **La ventana de «Voy»:** solo ofrece el teléfono; el correo deja de pedirse ahí.

### D. Marca «Somos Nosotrxs» y «amigxs»

- Cambiar las 133 apariciones visibles: título, manifest, Open Graph, correos (remitente incluido), JSON-LD con `name: "Somos Nosotrxs"` y `alternateName: "Somos Nosotros"`, Info.plist y las tiendas en la siguiente compilación. El dominio no cambia. Vigilar Search Console cuatro semanas.
- Excepciones por confirmar: el nombre del responsable en el aviso de privacidad si es un nombre legal.

### E. Orden de piezas

| # | Pieza | Tamaño | Cómo |
|---|---|---|---|
| 1 | Marca «Somos Nosotrxs» y «amigxs» en toda la app | chica-mediana | directo a código |
| 2 | Ubicación primero (A) | mediana | prototipo, luego código con migración |
| 3 | Ciudades vistas y Administración › Ciudades (B, lista y detección) | mediana | código con migración |
| 4 | «Buscar lugares» con bandeja de propuestas (B) | grande | código con migración; primera corrida: Oaxaca |
| 5 | «Buscar agendas y eventos» (B) | mediana | sobre la 4; segunda corrida: Oaxaca, noviembre |
| 6 | «Buscar artistas» (B) | mediana | sobre la 4 |
| 7 | Boletín por región (C) | mediana-grande | código con migración; primer envío cuando el founder diga |

Las piezas 1 y 3 pueden ir en paralelo con las de la bitácora 449 (hora «7:00 pm», notificaciones, gestos). Para gastar el crédito antes del 11 de noviembre: la pieza 4 debería correr Oaxaca hacia el 1 de noviembre, y CDMX antes del 11.

## 5. Para firma

1. ~~Primera pantalla sin ubicación~~ **Firmado:** se pregunta solo cuando no hay última ubicación conocida; debajo, lo más destacado de todas las ciudades (recomendación aceptada con «hagámoslo como dices»).
2. **Unidad del contenido:** ciudad ampliada con el estado como respaldo (recomendado), ¿o el estado desde el inicio?
3. ~~Boletín sin región conocida~~ **Firmado:** no se manda.
4. **Marca:** ¿también el remitente de los correos y el nombre en las tiendas en la siguiente compilación? (recomendado: sí)
5. **Fuente oficial del Sistema de Información Cultural** como primera fuente de lugares y artistas: ¿la usamos? (recomendado: sí, verificando cobertura y licencia en la primera corrida)

Si no contesta algo, queda como lo recomendado.
