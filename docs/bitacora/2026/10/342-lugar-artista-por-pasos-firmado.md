# 342 · Prototipo firmado: alta de lugar y de artista por pasos

**Pieza:** OL-314 (solo prototipo y acta). **Rama:** `prototipo-lugar-artista-pasos` (sobre `origin/main`). **Fecha:** 2026-10-06. **Operador:** Gestor de cambios IV (Fable 5.1).
**Estado:** firmado por el founder («firmo») en la versión 6 del prototipo. Sin código ni migraciones: la construcción es OL-315 (lugar, bitácora 343) y OL-316 (artista).

## Qué se encargó

Tras completar la primera fase del alta de evento por pasos (piezas 1-6, bitácora 340), el founder fijó el orden: «1) lugar y artista por pasos (doc 54, ya aceptado)». El [doc 54](../../../rediseno/54-lugar-y-artista-por-pasos.md) dejaba cuatro cosas por decidir; este prototipo las resolvió con él en seis vueltas.

## Qué hay

`docs/rediseno/prototipos/lugar-artista-por-pasos.html` (misma base de CSS que los prototipos anteriores, tira de casos, notas por pantalla), publicado como artefacto para revisarlo en el iPhone. Casos: lugar con sugerencia del mapa, lugar sin sugerencia, lugar que ya tiene ficha, lugar que es un negocio; artista con pista en el nombre, sin pista, que ya tiene ficha.

## Decisiones del founder (en orden)

1. **Sin pantalla de elegir qué se publica.** Propuse una pantalla previa con tres opciones y la rechazó: «agrega un paso. Ya habíamos acordado que son tabs en la base y se seleccionan según de dónde abro el “+”». La tira Evento · Lugar · Artista va al pie del primer paso de cada alta (como OL-313), marcada según la sección desde la que se abre el «+».
2. **El lugar lleva horario.** «En lugar acordamos agregar horario para incluirlo en exposiciones.» Renglón opcional «Horario» en «Revisa» que abre una hoja con los días de la semana (chips) y las horas en que abre y cierra (chips; «Otra hora»). Una exposición en ese lugar tomará este horario de entrada; la ficha del lugar lo enseña.
3. **Varias franjas, sin dejarlo para después.** «No me gusta que dejes para después el ajuste de horarios… propongo un botón debajo del selector, de agregar otro horario y presentar los mismos selectores dos veces: lunes a viernes un horario y sábado y domingo otro.» Bajo los selectores va **«Agregar otro horario»** (+, una línea, sin explicar para qué). Se agregan los que hagan falta y la persona los administra (✕ en cada uno). La franja nueva llega con los días que aún no tienen horario ya marcados; si no queda ninguno, vacía. La franja puesta se encoge a un renglón (días arriba, horas debajo); tocarla la vuelve a abrir. «Listo» siempre a la vista; solo se desplaza el cuerpo de la hoja.
4. **Ley de Postel en el horario.** «El sistema debe tomar eso y entonces estructurar.» Se acepta cualquier combinación (medio día el sábado, cierre a comer, un día en dos franjas, franjas encimadas) y lo que se enseña lo arma el sistema: ordena por día, une las horas que se encimen, agrupa los días con las mismas horas y dice qué días cierra («Lu–Vi · 10:00 a.m.–2:00 p.m. y 4:00 p.m.–8:00 p.m.», «Sá · 4:00 p.m.–8:00 p.m.», «Cierra Do»).
5. **Subcategoría del artista tras la disciplina.** Pregunté «¿cómo vas a resolver las subcategorías?» y quedó: tras elegir la disciplina se pregunta «¿Qué tipo de teatro?» con las subcategorías ya usadas en el directorio (producción, 2026-10-06: 501 de 647 artistas tienen una), las más usadas primero, «Otra…» (texto libre) y «Seguir sin especificar». Con pista en el nombre no se pregunta nada.
6. **Icono de clasificación, no una nota musical.** La disciplina del artista lleva el icono de etiqueta, el mismo que el tipo del lugar: «no solo hablamos de música».
7. **Los negocios SÍ entran al directorio** (sustituye a la regla del 2026-09-14): «con la nueva filosofía de cobro ellos pueden ser los que nos paguen por membresías para crear flyers; además pienso que es elitista segregar a los negocios que se consideran foros artísticos». Un café, bar o foro comercial se registra como cualquier lugar, con su tipo («Café, bar o restaurante» se añade a la lista cerrada). Desaparece el aviso «No entra al directorio»; `esNegocio` dejará de vetar «Guardarlo como lugar» en el alta de evento. DEFINICION.md, CLAUDE.md y el Decidido de OPEN_LOOPS actualizados en esta rama.

## Lo demás que fija el prototipo (recomendaciones del doc 54 aceptadas al firmar)

- **Lugar:** ¿Cómo se llama? (campo con ✕, sugerencias del mapa debajo, «Ya tiene ficha» con «Ir a su ficha»: no se llega a publicar) → **confirmar en el mapa siempre** («¿Es aquí?» con sugerencia; «¿Dónde está?» sin ella: dirección, «Estoy aquí», mover el pin; «¿Es este?» si hay ficha a menos de 150 m) → ¿Qué tipo de lugar es? solo si el nombre no lo dijo (elegir avanza) → Revisa (dirección, tipo, Horario opcional, «Foto, descripción o redes» opcional; «Publicar lugar») → Publicado (sello, Compartir, sugerencia «Publicar un evento aquí»).
- **Artista:** ¿Cómo se llama? («Ya tiene ficha» mientras se escribe) → ¿Qué hace? solo sin pista → ¿Qué tipo de …? (decisión 5) → Revisa (disciplina · subcategoría, solista o grupo, ciudad de contexto, **casilla «Soy yo / Es mi grupo» a la vista** con su consecuencia «Podrás editar la ficha y publicar sus fechas», «Foto, portada, redes o descripción» opcional; «Publicar artista») → Publicado (sello, Compartir, sugerencia «Agrega una foto»).
- **Nada se publica sin leerse** (regla ya aceptada para la fecha del evento): ningún tipo ni disciplina sale por omisión.
- **Mismo armazón** que el alta de evento: barra, avance, una pregunta por pantalla, pie que dice qué falta y se queda sobre el teclado, ✕ en todo campo de texto, guardia de salida, transiciones.
- **Modelo:** el horario del lugar es una tabla de franjas (días, abre, cierra), no una columna; la ficha y las exposiciones leen la versión estructurada.

## Verificación del prototipo

Chrome a 390×844 y a 320×568: sin desbordes, «Listo» a la vista con dos franjas, renglón de horario en «Revisa» con días arriba y horas debajo, icono de etiqueta en «¿Qué hace?» y en «Revisa» del artista, caso 4 (café) con tipo deducido y sin aviso.

## Qué sigue

- **OL-315 (bitácora 343):** alta de lugar por pasos en `/nuevo/lugar`, con el horario por franjas en el modelo (migración que solo añade), el tipo nuevo, `esNegocio` sin veto, tira al pie y `FormularioLugar` solo para editar.
- **OL-316:** alta de artista por pasos (subcategoría tras la disciplina, «Soy yo»), `FormularioArtista` solo para editar; `/nuevo` desaparece cuando los dos existan.
