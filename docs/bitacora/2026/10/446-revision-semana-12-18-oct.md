# 446 · Revisión de los 46 PR del 12 al 18 de octubre: seguridad, maquetación y UX

**Fecha:** 2026-10-19. **Rama:** `gestor-registro-51`, solo documentación. **Operador:** Gestor VI (Fable 5.1) con tres agentes Opus de solo lectura (seguridad, maquetación y UI, UX) y la auditoría privada de gestos de Codex del 14 de octubre. **Pedido del founder:** «revisa main, limpies todo, revisa últimos PR para buscar vulnerabilidades de seguridad, áreas de oportunidad en maquetación y UI, áreas de oportunidad en UX, de las ramas lanzadas en los últimos 7 días. Luego comparte resultados del análisis con tus propuestas, después guarda contexto y abrimos nuevo Gestor de cambios VII».

## Alcance y método

- Rango `70a54b5f..main` (el padre del merge de #482 hasta #527): 46 PR, 1 144 archivos, 245 en `src`, 27 CSS, 73 TSX, 3 migraciones, 12 scripts. Piezas: Inicio firmado y portadas del sistema, historial (trayectoria, «Se canceló», «Tu año», PDF), banner de compartir, «¿Es este?», series en Nuevos, orden de Lugares, grafo cultural, ficha en escritorio, historias con zoom, festivales en fichas, costo «Por confirmar», festival en una sola ficha con lectura por dirección y «¿Qué es?», Administración › Personas.
- Cada agente leyó el código real y miró las capturas de las bitácoras 405 a 445; el gestor comprobó en el código los hallazgos que más pesan y las pruebas ligadas a seguridad (46 de 7 archivos, en verde). `npm run inventario` en verde: 334 medidas en duro (333 al empezar la semana).
- **Limpieza hecha antes de revisar:** un árbol de trabajo viejo del grafo y cuatro ramas locales ya unidas borrados; doce ramas remotas ya unidas borradas; el registro 50 (#524) unido; la carpeta temporal de Codex (448 MB de cachés y bancos de pruebas, fuera de git) vaciada. Quedan `main` y nada más.

## Seguridad

Nada crítico, alto ni medio. Dos hallazgos bajos y cuatro notas.

1. **Baja, de estos días · datos reales de 13 personas en un prototipo público.** `docs/rediseno/prototipos/grafo-3d.html` (PR #503) lleva dentro datos leídos de producción con la llave de servicio: 13 puntos de asistentes sin nombre ni id y con posición inventada, pero con líneas hacia artistas y lugares y el día de cada evento. Como «Quién fue» enseña nombres por evento, alguien que conozca la escena podría emparejar un punto con una persona. **Propuesta:** sustituir los datos por inventados (chico, pieza aparte); decidir si se reescribe el historial de git (grande) o se acepta el riesgo bajo.
2. **Baja, de estos días · dos scripts de captura sin la guarda de `.env`.** `scripts/ops/auditoria-ui/capturar-cartel-leido.mjs` y `capturar-persona-publicado.mjs` no se niegan a correr con un `.env` en la carpeta (como sí hace `maqueta-pantalla.mjs:26`); en el checkout principal cargarían llaves reales en un servidor local y pisarían `.next`. Nada llega a git ni a producción. **Propuesta:** copiar la guarda (chico).
3. Nota · «Se canceló» (`20261012190000_eventos_cancelado.sql`): la regla «solo lo que ya pasó» vive en la acción, no en la base; por la API el autor o el admin podrían marcarlo antes. Nadie toca eventos ajenos. Disparador opcional que solo añade.
4. Nota · umbral de anonimato 1 en el grafo (`src/lib/grafo.ts:127`, decidido por el founder el 13 de octubre): un punto con una sola línea hacia un evento con «Quién fue» deja de ser anónimo; hoy solo lo ve el admin. Revisar si hay más administradores.
5. Nota · `npm audit --omit=dev`: three.js 0.186.1 limpia; avisos preexistentes en `source-map-js` (solo al compilar) y `fflate` vía satori (solo abre ZIP, la app no). `npm audit fix` sin `--force`.
6. Nota · `eventos_parecidos` acepta títulos de cualquier largo y la llama cualquiera; solo devuelve lo público. Tope de largo opcional.

**Limpio:** sin secretos ni correos reales en el diff; migraciones que solo añaden, con `search_path` fijo y permisos justos; la lectura de carteles solo acepta imágenes del Storage propio; el grafo y «Lo que publicó» solo para admin, con la llave de servicio en el servidor; PDF y «Tu año» con 404 para quien no gestiona, topes de peso, tamaño y tiempo; «Quién fue» respeta perfiles reservados; JSON-LD escapado; sin enlaces nuevos a pestaña nueva; `siguiente=` de /entrar sin cambios.

## Maquetación y UI

Quince hallazgos; los agrupo como conviene arreglarlos.

- **Botones y ✕ (alta).** Cinco botones hechos a mano fuera de `ui/Boton` con alturas, letras y pesos distintos: Compartir del banner (44 px, 17, 700), «Tu año» y «Presentación» (48, 17, 800), Compartir y Guardar de Tu año (56, 18, 800); el de siempre es 48, 18, 700. La ✕ del banner es una tercera ✕ a mano, con un margen negativo disfrazado (`top/right: -6px`) y las únicas medidas en duro nuevas de la semana. En la hoja del PDF, «Periodo» tiene rótulo y «Carta / A4» no, y «Preparar una reseña · Pronto» promete algo que no existe. **Pieza:** todo a `ui/Boton` (con una variante suave para «Tu año») y `ui/Cerrar`; quitar «Pronto». Mediano.
- **Renglón con estados y rótulos (media).** «Ya pasó» y «Se canceló» se pintan desde fuera de `ui/Renglon` en tres sitios con `:has()` y un truco de prioridad que depende del orden de carga; el tachado está dos veces. «Oculto» es violeta en «Lo que publicó» (se lee como «Te interesa») y gris en las listas de Administración. Los rótulos en mayúsculas usan cuatro espaciados y dos pesos sin token. **Pieza:** estado `pasado | cancelado` y ceja en `ui/Renglon`, chip gris para Oculto/Borrador/Privado, token de espaciado. Mediano.
- **Fila deslizable (media).** La fila de avatares del historial corta con guion (el único `hyphens` de la app, letra 12, foto 60) y la de Inicio corta en palabra entera (15, 88). En escritorio ninguna fila deslizable tiene barra ni flechas; hay ocho copias del truco de esconder la barra. **Pieza:** una sola fila de avatares con el tamaño como variante y flechas en escritorio. Mediano.
- **Imágenes con tamaño (media, preexistente).** El avatar de la navegación (`PerfilEnNav.tsx:15`) baja la foto entera en todas las pantallas; también `QuienVa`, los artistas de la ficha de evento, las listas de Administración, `SelectorQuien`, `MisArtistas`, `FichaPersona` y Bloqueados. Va directo a la cuota de Supabase. **Pieza:** `ui/Imagen` con `sizes` en todas. Chico cada una.
- **Prueba ampliada (media).** 19 de 36 bitácoras no traen captura a 820 ni 1280; solo 3 prueban la letra al doble; la CI no corre `medir --letra=2`; Tu año, el historial abierto, la hoja del PDF y las historias no están en `medir`. A 1280 el banner se estira a 960 px. **Pieza:** sumar esas pantallas y `--letra=2` a la CI. Mediano.
- **Pulido del grafo y Ayuda (baja).** Interruptor redibujado en vez de `ui/Palanca`; medidas disfrazadas de proporción; vuelos de cámara que ignoran «Reducir movimiento»; «Asistente anónimo N» sin lenguaje incluyente; `ui/Ayuda` depende de variables del grafo y necesita nombres propios antes de usarse fuera. Chico cada uno.
- **Para decidir:** en «Tu año», Atrás y ✕ llevan al mismo sitio (el doc 50 da a las tareas solo la ✕); la marca se escribe «Somos Nosotrxs» en 14 sitios y «Somos Nosotros» en 123; la ficha de artista sin portada a 1280 muestra dos SN.

**Bien:** inventario verde; Administración bajó de 51 a 44 medidas en duro; `BloqueFestival` es la misma pieza en Agenda y en fichas; three.js solo carga en el grafo; marcado nuevo plano; las fotos nuevas piden su tamaño; «Reducir movimiento» apaga las transiciones; cuatro pantallas nuevas en `medir` sin excepciones.

## UX

Quince hallazgos; los cuatro que más pesan los comprobé en el código.

1. **Alta · solo se puede cancelar un evento que ya pasó** (`acciones.ts`, error `no_paso`). Si un concierto del viernes se cae el martes, quien organiza solo puede borrarlo (desaparece de «Tus planes» sin explicación) o dejarlo vivo, y a quien dijo «Voy» le llega el recordatorio. **Propuesta:** «Se canceló» también antes, con chip rojo, sin «Voy», sin recordatorio y con aviso a quienes van. **Pide prototipo.**
2. **Alta · «¿Es este?» puede perder el alta.** El renglón del parecido es un enlace con `replace` (`ui/Parecidos.tsx:45`): tocarlo para comprobar sustituye la pantalla, Atrás no vuelve y el alta no guarda borrador; el pie «Publicar» sigue activo pero solo repite la pregunta. **Propuesta:** el parecido en una hoja encima de Revisa; «No, es otro: publicar» en el pie; «Sí, es este» en la caja, y si esa ficha no tiene cartel, «Agregar mi cartel». **Pide prototipo.**
3. **Media · al editar, elegir «Festival» falla con un error que miente** («¿Sigues con sesión y es tu evento?»); la base rechaza convertir un evento en festival (`20261006160000_eventos_clase.sql:200`). Con la definición nueva es natural convertirlo. **Propuesta:** permitirlo sin programa (migración que solo añade) o apagar la opción y decir por qué. Directo a código.
4. **Media · lo plegado no se recuerda al volver** (`ui/Plegado.tsx`): abro la Trayectoria, toco una fecha, vuelvo y está cerrada. **Propuesta:** `useMemoriaPantalla`. Directo a código.
5. **Media · cinco palabras para lo de dentro de un festival:** «Actos 3» y «Programa registrado: 3 actividades» en la misma cabecera; «3 actos nuevos»; «5 funciones aquí / suyas»; «El cartel trae 3 eventos»; «presentaciones». **Propuesta:** una sola palabra y quitar la frase o el número de la cabecera. Directo a código cuando el founder decida la palabra.
6. **Media · una noche se dice de tres maneras y la hora de dos:** la ficha del festival de una noche dice «sáb 17 de oct · 20:00» y arriba «sáb 17 oct – dom 18 oct»; Revisa dice «20:00 → sáb 31 · 02:00». Las 12 horas siguen en el programa del alta, la ficha de la expo y el horario del lugar; listas e Inicio van en 24. **Propuesta:** «sáb 17 oct · 20:00–02:00» y una sola convención de hora. Directo a código.
7. **Media · el banner sale en una ciudad vacía y nadie mide los cierres:** en Oaxaca o CDMX sin datos lo primero es «¿Te gusta Somos Nosotrxs?» y debajo un vacío sin botón; con sesión, Destacados en grande más el banner dejan «Tus planes» fuera de la primera pantalla. **Propuesta:** no pintar el banner en un Inicio vacío, dar al vacío «Publicar un evento» y la ciudad más cercana con eventos, medir «cerrar». Directo a código; dónde va el banner lo decide el founder.
8. **Media · «Gratis» se sigue inventando en el evento suelto** (`textoCosto`, `eventos.ts:183`; el importador trata `null` como gratis). La rutina de redes escribió a mano «Costo por confirmar» y eso se clasifica como «con costo». **Pregunta al founder:** ¿«Por confirmar» también para el evento suelto? ¿Revisamos los importados con precio vacío?
9. **Media · la portada del sistema se pierde al entrar:** la tarjeta Bauhaus de Inicio lleva a una cabecera oscura con el SN gris (`eventos/[id]/page.tsx:494`). **Propuesta:** la misma portada sin título en la cabecera cuando no hay cartel. **Pide prototipo**, junto con la cabecera al 56 %.
10. **Baja · quedan letreros con «ficha»:** «Ver ficha» en `HojaDonde.tsx:690` y `Mando.tsx:740`; «Ir a su ficha» en `PasosLugar.tsx` y `PasosArtista.tsx`; «Abrir la ficha completa» en `FichaHoja.tsx:75`. Directo a código.
11. **Baja ·** «Pronto» apagado en la hoja de Presentación; iconos iguales en las cuatro opciones de «¿Qué es?» (propuesta: la figura de cada clase y un calendario para Evento); «Función 2 de 6» cuenta solo las que faltan y «Sesión 2 de 3» todas; en Lugares un taller en curso dice «Taller hasta el vie 23» y se lee como visitable cualquier día; quien administra ve «Tu año» en fichas ajenas.

**Pendientes conocidos que no se cuentan como nuevos:** «Charlemos» leído como artista; una obra en días no seguidos se vuelve festival; «Sesión n de N» en «Ahora»; Buscar sin «Taller» en la ceja; el filtro «Gratis» cuenta el precio vacío y ahora las expos «Por confirmar»; la cabecera oscura al 56 %; el «scroll infinito» con teclado en un iPhone viejo; «¿Es este?» no busca duplicados de expos, festivales ni actividades; la fecha de «Alta» repetida y el buscador de 220×24 en Administración.

**Bien resuelto, no tocar:** «Dejar por confirmar»; la ficha en pasado con «Quién fue»; «Se canceló» de un toque con Deshacer; el orden de Lugares con el permiso y su memoria; «¿Es en Laboratorio Centro Histórico?» por dirección; «¿Qué es?» solo cuando hace falta; historias que no bloquean el desplazamiento; el visor que cabe en la ventana; una sola regla «Hasta el… / Del… al…»; «Publicó» que baja a su lista sin apilar historial.

## Lo que aporta la auditoría de Codex (14 de octubre, privada)

Codex no demostró la causa del toque fallido en el iPhone del founder, pero reprodujo cuatro mecanismos de la misma familia: (1) con la navegación pendiente, la capa de historias sigue capturando toques tras #525 (propuesta chica: `onNavigate={salir}` en el enlace); (2) cerrar el mapa y luego una hoja puede dejar el contenido inerte (`CapaMapa.tsx:133`, `ui/Hoja.tsx:37`; propuesta: una sola pila del bloqueo con liberación por dueño); (3) cancelar un arrastre de enlaces confirma el nuevo orden (`SelectorEnlaces.tsx:122`); (4) el avance automático puede retirar «Ver más información» durante la pulsación. Dejó una sonda pasiva para el inspector de Safari. Informe en `privado/investigaciones/auditoria-gestos-2026-10-14.md`.

## Propuesta de cola para el Gestor VII (en orden)

1. **Higiene urgente, una pieza chica:** la guarda de `.env` en los dos scripts; datos inventados en `grafo-3d.html`; `npm audit fix`; «Pronto» fuera; letreros con «ficha».
2. **Gestos y capas (de Codex), una pieza mediana:** `onNavigate={salir}`, la pila única del bloqueo entre mapa y hoja, cancelar ≠ confirmar en el arrastre, pausa durante la pulsación. Con pruebas de componentes.
3. **Botones, ✕ y Renglón con estados, una pieza mediana:** todo a `ui/Boton` y `ui/Cerrar`; estados `pasado | cancelado` en `ui/Renglon`; chip gris de Oculto/Borrador; token de rótulo.
4. **Coherencia de festival y hora, chica, cuando el founder decida la palabra:** una palabra para lo de dentro del festival, «sáb 17 oct · 20:00–02:00», 24 horas en todo, «Función n de N» contando todas.
5. **Memoria y salidas rotas, chica:** plegados recordados; editar a festival permitido o apagado con razón.
6. **Imágenes con tamaño y prueba ampliada, chica y mediana.**
7. **Prototipos:** cancelar antes de que pase; «¿Es este?» en hoja; portada del sistema en la cabecera (con el 56 %); el banner y el vacío de Inicio pensando en Oaxaca y CDMX; la pantalla «Rutinas» de Administración.
8. **El crédito de la API (200 USD, vence el 11 de noviembre):** carga inicial de Oaxaca con propuestas, en cuanto el founder conteste el orden de ciudades y cómo aprueba.

## Decisiones que necesita el founder

- ¿Cancelar antes de que pase entra ahora, con aviso a quienes dijeron «Voy»?
- ¿Qué palabra para lo de dentro de un festival: «actividades», «funciones» o «actos»? ¿Todo en 24 horas?
- ¿«Por confirmar» también para el evento suelto? ¿Revisar los importados con precio vacío?
- ¿Se quita el banner en una ciudad vacía y se miden los cierres antes de decidir dónde va?
- ¿Se reescribe el historial de git por los datos del prototipo del grafo, o basta con sustituirlos?
- ¿«Somos Nosotrxs» o «Somos Nosotros» en toda la app?
- ¿«¿Es este?» también para expos, festivales y actividades?
- Las pendientes de ciudades: orden, aprobación por fuente o una por una, Estado de México, zona que filtra o solo se muestra, qué ve el grafo al abrir.
