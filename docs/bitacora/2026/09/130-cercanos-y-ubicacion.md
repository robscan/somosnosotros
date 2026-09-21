# Cercanos y ubicación (OL-095)

Pieza A4 de la cola de piezas del founder (2026-09-21), tres hallazgos de la lista de 54 comentarios: L25, L36 y L50. Modelo Sonnet 5, esfuerzo medio. Avisado el Gestor de cambios II al arrancar (paso 0) y su visto bueno recibido con cuatro condiciones, todas aplicadas abajo.

## L25 · «Por qué eventos cercanos pide ubicación de nuevo?»

**Causa medida:** la posición vivía solo en el estado de React de cada pantalla (`punto`), nunca se guardaba en ningún lado. "Memoria de pantalla" repone pestaña, fecha, búsqueda y scroll al volver de una ficha, pero la posición no estaba en la lista de lo que recuerda. Cada pantalla (`AgendaInicio.tsx` y `VistaLugares.tsx`) además duplicaba su propia llamada a `navigator.geolocation.getCurrentPosition` en vez de usar el helper compartido `src/lib/ubicacion.ts`.

**Qué recuerda el navegador y qué no (medido, no adivinado):** el permiso de geolocalización de un sitio en Safari de iPhone y en una app instalada desde el icono del inicio no se comporta como una app nativa: no hay garantía de que se recuerde entre visitas o lanzamientos de la app instalada, y llamar de nuevo a `getCurrentPosition` puede volver a mostrar el aviso del sistema. En Chrome de Android sí se recuerda mejor. Nuestra propia app, antes de este cambio, no ayudaba nada: no guardaba la última posición en ningún lado, así que cada visita a Cercanos era una llamada nueva al navegador, con o sin aviso del sistema.

**Arreglo (dentro de la regla de DEFINICION — "ordenar por cercanía, nada más", nunca al servidor ni a la base):** `src/lib/ubicacion.ts` guarda la última posición aproximada en el propio teléfono (`localStorage`), redondeada a 3 decimales (~100 m, de sobra para ordenar) y con un sello de tiempo. Frescura: **15 minutos** (propuesta de esta pieza: de sobra para que la persona siga en la misma zona sin pedir más precisión de la que hace falta para ordenar). Si hay una posición fresca, no se llama al navegador en absoluto: ni se pide el permiso otra vez ni aparece el botón "Usar mi ubicación". La caché se borra sola al caducar y, por condición del gestor, también al cerrar sesión (`src/app/ajustes/BotonSalir.tsx`, nuevo componente cliente para ese botón). La primera vez sigue siendo siempre un toque explícito de la persona en el botón: la caché evita repetir la pregunta, no sustituye el primer permiso.

**Respuesta en llano para el founder:** Safari y la app instalada no siempre recuerdan el permiso de ubicación entre visitas, así que sin ayuda de nuestro lado cada vez que se abre Cercanos se le vuelve a pedir el permiso al sistema. Ahora la propia app guarda tu última posición aproximada en tu teléfono (nunca en nuestra base ni en el servidor) durante 15 minutos; si sigue fresca, Cercanos la usa directamente sin volver a preguntarte nada. Pasados los 15 minutos, o si cierras sesión, se te vuelve a pedir con el mismo botón de siempre.

## L36 · «Con el chip en Ciudad de México, Cercanos muestra lo cercano a esa ciudad, no a mí»

**Causa medida:** en `src/app/page.tsx`, `cargar(ciudad, …)` trae los eventos con `.eq("ciudad", ciudad.nombre)` antes de que exista ninguna ubicación. La lista que le llega a `AgendaInicio` (prop `eventos`) ya viene recortada a la ciudad del chip, así que Cercanos —aunque ordena por distancia dentro de esa lista— nunca puede mostrar un evento de otra ciudad, aunque esté físicamente más cerca. Contradice la regla del founder "el contexto ordena, no limita" (2026-09-16): la cercanía debe ordenar, la ciudad del chip no debe recortar.

**Arreglo (con el ok del gestor, condición dura: las coordenadas de la persona nunca viajan al servidor):** acción de servidor nueva, `cargarCercanos()` en `src/app/accionesAgenda.ts`, siguiendo el mismo patrón que `cargarNuevos` (que ya existía para la pestaña Nuevos): trae los próximos eventos visibles de **todas las ciudades** (mismo filtro de pasados/ocultos que la agenda principal, tope de **200**, sin ciudad en la consulta) y el teléfono los ordena por distancia como ya hacía. Tipos y esquema de validación propios en `src/lib/cargarCercanos.ts` (deliberadamente no comparte código con `cargarNuevos.ts`: límites y filtros distintos, y así esta pieza no choca con OL-093, que también trabaja en `accionesAgenda.ts`/`page.tsx` — el roce en esos dos archivos se limitó a una función nueva añadida al final, sin tocar `cargarNuevos` ni `cargar()`).

Con las dos ciudades que hay hoy (San Luis Potosí y las instituciones del catálogo) 200 eventos es de sobra y barato de traer entero. Si la plataforma crece a muchas ciudades con cientos de eventos simultáneos, esto habría que repensarlo: paginar por cercanía en el propio servidor (con las coordenadas, que hoy nunca viajan) en vez de traer una lista plana. Queda anotado como comentario en el propio archivo.

**El chip mientras Cercanos está activo:** aprobado por el gestor como cambio mínimo (sin tocar el diseño de `ui/Cabecera` ni de `components/Ciudad.tsx`, solo el texto). Mientras la pestaña Cercanos está activa, el chip de ciudad dice **"Cerca de ti"** en vez del nombre de una ciudad, para no contradecir una lista que ya no está recortada a ninguna. Sigue siendo el mismo botón: al tocarlo se abre la misma hoja de siempre, que sigue marcando la ciudad realmente elegida (comprobado: con el chip en "Cerca de ti", la hoja abre con Ciudad de México marcada como elegida). Elegir otra ciudad ahí vuelve a Todos de esa ciudad, como ya pasaba antes de esta pieza.

**Prueba de regresión (pedida por el gestor), verificada con el respaldo local:** con el chip en Ciudad de México y la ubicación de la persona en San Luis Potosí, Cercanos muestra primero los dos eventos de San Luis Potosí (a 50 m y a 1.1 km) y al final el de Ciudad de México (a 356 km) — antes de este cambio habría mostrado solo el de Ciudad de México. Memoria de pantalla comprobada: al recargar la misma URL con Cercanos activo, la posición se repone sola (sin pedir el botón) y el orden cruzando ciudades se mantiene.

## L50 · Medición de cuántas veces se consulta la ubicación

Puntos de llamada a la ubicación en todo el código (`navigator.geolocation` o el helper propio), antes de esta pieza:

| Archivo | Cuándo se dispara | Precisión |
| --- | --- | --- |
| `src/lib/ubicacion.ts` (`leerUbicacion`) | Al tocar "Usar mi ubicación en el mapa" en el alta de lugar y de evento (sugerir dirección) | Precisa (GPS) |
| `src/components/AgendaInicio.tsx` | Al tocar "Usar mi ubicación" en la pestaña Cercanos de la Agenda (llamada duplicada, no usaba el helper) | Aproximada |
| `src/app/lugares/VistaLugares.tsx` | Al tocar la pestaña Cercanos en Lugares (llamada duplicada, no usaba el helper) | Aproximada |

**Recorrido normal medido (abrir Agenda → Cercanos → Lugares → Cercanos → volver a Agenda):** antes de esta pieza, **3 llamadas al navegador** por una sola ubicación real de la persona (una en Agenda al tocar el botón, otra en Lugares porque no compartía nada con Agenda, y una tercera al volver a Agenda porque la posición se perdía al cambiar de pantalla). Ninguna de las tres es necesaria si la persona no se movió: las tres piden la misma zona.

**Qué sobra (arreglado en esta pieza):** las tres llamadas duplicadas de arriba. Con la caché compartida de 15 minutos (L25), el mismo recorrido queda en **1 llamada real** al navegador; las otras dos veces la posición se toma de `localStorage` sin tocar `navigator.geolocation`. Verificado en el respaldo local: tras pedir la ubicación en la Agenda, tocar Cercanos en Lugares mostró la lista ordenada al instante, sin ningún permiso ni llamada nueva (la página de Lugares nunca tuvo `navigator.geolocation` sustituido en la prueba, así que si hubiera llamado de verdad se habría visto un error o un cuelgue).

**Lo que no se tocó (discutible, se reporta, no se decide aquí):** las dos llamadas de `leerUbicacion` con `precisa = true` (altas de lugar y evento) no comparten la caché de Cercanos a propósito — piden GPS exacto para poner un pin, no para ordenar, y son gestos explícitos y poco frecuentes (una vez por alta). No parece haber redundancia ahí, pero queda anotado por si el founder ve otra cosa al usarlo.

## Límites respetados

- Sin cambios al diseño de la pestaña Cercanos ni del mapa (piezas futuras: "Cercanos sin mapa" y "Mapa de lugares").
- Sin tocar `src/components/ui/Cabecera.*` ni `NavInferior` (OL-090 trabaja ahí).
- Sin migración. Producción no se tocó ni se leyó (solo lectura vía el respaldo 100% local, sin red).
- `src/app/accionesAgenda.ts` y `src/app/page.tsx` tocados al mínimo (función nueva `cargarCercanos`, cero cambios a `cargarNuevos` ni a `cargar()`) por el cruce con OL-093, que trabaja en la misma zona.

## Verificación

`npm run lint && npm run typecheck && npm test` en verde (705 pruebas; incluye 8 nuevas en `src/lib/ubicacion.test.ts` para la caché de frescura, el redondeo, el borrado y el modo privado sin storage). `npm run build` en verde. Verificado a ojo con `front-visual`, `next dev` de la rama contra un respaldo 100% local sin red y sin producción (dos ciudades y tres eventos inventados, ids UUID de mentira), con `navigator.geolocation.getCurrentPosition` sustituido en el navegador de prueba: capturas de 390×844 (chip "Cerca de ti" con San Luis primero pese al chip en Ciudad de México, la hoja de ciudad abierta desde ese estado, y Lugares reutilizando la posición sin pedirla otra vez) entregadas al gestor, fuera del repo.

## Archivos tocados

`src/lib/ubicacion.ts`, `src/lib/cargarCercanos.ts` (nuevo), `src/lib/ubicacion.test.ts` (nuevo), `src/app/accionesAgenda.ts`, `src/components/AgendaInicio.tsx`, `src/app/lugares/VistaLugares.tsx`, `src/app/ajustes/page.tsx`, `src/app/ajustes/BotonSalir.tsx` (nuevo).

Rama `cercanos-ubicacion`, base `origin/main` (94e0e15). Commit local; sin push, sin PR, sin merge — los publica el gestor.
