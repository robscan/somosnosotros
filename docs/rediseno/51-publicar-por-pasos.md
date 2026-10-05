# 51 — Publicar por pasos: análisis para rehacer el canon de los formularios de publicación

**Fecha:** 2026-10-05 · **Pieza:** OL-286 (sesión de diseño de Eventos) · **Estado:** análisis y propuesta; sin prototipo ni código todavía.

## El señalamiento del founder (2026-10-05)

«La sobre carga cognitiva, sobre carga de opciones es demasiado alta en el canon de formularios de publicación. No estamos usando ux invisible, progressive disclosure y tampoco consideramos peak-end rule. Podemos paginar el formulario de publicación como lo hace instagram y focalizar atención. Además podemos usar animación para introducir nuevos elementos y transiciones.»

Orden que pidió: primero se termina la solución de Eventos como va (sugerencias, «Dónde», taller y festival); después se mejora con estos ajustes.

**Respuesta del founder (2026-10-05):** le gusta la propuesta. Precisa: «si el usuario ingresa cartel entonces se usa la información capturada para ahorrar pasos y solo se presenta para confirmación». Es decir: con cartel, el paso 2 es solo confirmar; no se pregunta lo que ya se leyó.

## Qué tiene hoy la pantalla de publicar un evento

Una sola pantalla con todo a la vista (`src/app/eventos/FormularioEvento.tsx`, 807 líneas y 31 estados; `HojaDonde.tsx`, 863 líneas y 23 estados):

| A la vista al llegar | Decisiones que pide |
| --- | --- |
| Tira de tipos: Evento · Lugar · Artista | 1 de 3 |
| Cartel (subir o tomar foto) | subir o saltar |
| Nombre | escribir |
| Cuándo | fecha, hora, y si termina |
| Dónde, con dos salidas (Estoy aquí, Buscar) | 1 de 2, y luego la hoja «¿Dónde es?» |
| Quién | buscar artistas o saltar |
| Cuánto: Gratis · Cooperación · Precio | 1 de 3 y a veces un número |
| Más: descripción y enlace | abrir o saltar |
| Publicar (dice qué falta) | — |

Son nueve bloques y unos doce controles en la primera vista. El canon actual (renglones resueltos, lo pesado en hojas, botón que dice qué falta) ordenó la pantalla, pero no quitó la carga: la persona sigue viendo todo el trabajo de una vez.

## Dónde falla, ley por ley

1. **UX invisible.** El sistema ya lee el cartel, pero lo trata como un renglón más. Si el cartel resuelve nombre, fecha, lugar y precio, lo honesto es que el cartel sea el primer paso y casi el único.
2. **Progressive disclosure.** Hoy se enseña todo y se pliega lo opcional. Paginar es lo contrario: se enseña una cosa, y lo demás no existe hasta que toca.
3. **Ley de Hick.** Doce controles compiten al llegar. En un paso hay una pregunta y una acción.
4. **Peak-End.** El momento alto debería ser «el cartel se leyó solo» y el final, ver el evento publicado como lo verá la gente. Hoy el final es una pantalla de confirmación plana, y ahí mismo queremos colgar las sugerencias.
5. **El gesto gana.** En el teléfono, avanzar con un botón fijo abajo (o deslizar) es más natural que subir y bajar por una lista de renglones buscando cuál falta.

## Propuesta: cuatro momentos, como Instagram

Instagram no pagina por campos: pagina por **intención** (elegir la foto → ajustarla → escribir y publicar). Lo mismo aquí:

1. **Empieza con lo que tienes.** Pantalla casi vacía: «Sube el cartel» grande, y debajo «No tengo cartel». Nada más. (El tipo Evento · Lugar · Artista se elige antes, al tocar «+», no dentro del formulario.)
2. **Revisa lo que leímos.** Una ficha del evento como se verá publicada: nombre, cuándo, dónde, cuánto, ya puestos. Lo que el sistema no pudo leer aparece como pregunta, **una a la vez**, en orden: ¿cuándo?, ¿dónde?, ¿cuánto? Cada pregunta ocupa la pantalla con su control ya abierto (calendario, buscador de sitio, tres chips). Lo ya resuelto no se pregunta: se toca en la ficha solo si está mal.
3. **¿Quieres agregar algo?** Un paso opcional y saltable: artistas, descripción, enlace. Un toque en «Publicar» lo salta.
4. **Publicado.** El evento como quedó, y **una** sugerencia en punteado (exposición, festival, taller con sesiones). Es el final: tiene que sentirse bien.

Con cartel legible: subir → revisar → publicar. Tres toques. Sin cartel: nombre → cuándo → dónde → cuánto → publicar, una pregunta por pantalla.

**Lo que se conserva del canon actual:** el renglón resuelto (para la ficha de revisión), las hojas para lo pesado, la ✕ en todo campo, el botón que dice qué falta, sugerencias bajo el campo en uso.

**Lo mismo vale para Lugar y Artista:** lugar = nombre → punto en el mapa → tipo (deducido) → publicar; artista = nombre → qué hace → foto → publicar.

## Animación: sí, con tres reglas

1. **La animación explica de dónde viene cada cosa.** El paso siguiente entra desde la derecha y el anterior sale a la izquierda (Atrás, al revés). Un dato leído del cartel «cae» en su renglón. Una sugerencia punteada se vuelve sólida al aceptarla. Si un movimiento no explica nada, no va.
2. **Corta y con el mismo ritmo en toda la app:** 200 ms, la misma curva que ya usa el cambio de sección (doc 38). Nada de rebotes.
3. **Respeta «reducir movimiento»** del teléfono (ya hay precedente en OL-279) y nunca retrasa un toque: la pantalla responde aunque la animación no haya terminado.

## Riesgos y cómo se cuidan

- **Más toques para quien ya sabe.** Paginar puede alargar el camino de quien publica diez eventos seguidos. Cuidado: los pasos resueltos se saltan solos; medir toques en el prototipo contra la pantalla de hoy.
- **Perder lo escrito al ir Atrás.** Cada paso guarda; Atrás vuelve al paso anterior, no sale del formulario; «Salir sin publicar» ya existe y se conserva.
- **Editar no es publicar.** Para editar un evento existente, la ficha de revisión (paso 2) es la pantalla de entrada: no se vuelve a pasar por las preguntas.
- **Teclado.** Una pregunta por pantalla con el botón pegado sobre el teclado quita de raíz los campos tapados (ver OL-288).
- **Costo.** Es rehacer los tres formularios de alta. Va por partes: primero Evento, con prototipo firmado; Lugar y Artista después.

## Siguiente paso propuesto

Cuando el founder firme la solución de Eventos (sugerencias, «Dónde», taller y festival), un prototipo del alta de evento por pasos con sus transiciones, medido en toques contra la pantalla actual para los tres casos: cartel legible, cartel a medias y sin cartel.
