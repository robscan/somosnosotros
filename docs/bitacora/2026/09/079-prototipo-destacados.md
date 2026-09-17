# 079 · Prototipo: destacados en Agenda, Lugares y Artistas

**Fecha:** 2026-09-16 (noche) · **Rama:** `prototipo-destacados` (árbol de trabajo en `.claude/worktrees/prototipo-destacados`; solo documentos, commit local, sin push) · **Pieza:** OL-052.

## Qué pidió el founder
> «Con el objetivo de facilitar la consulta de la información propongo una sección de destacados en la parte superior de cada sección de listado (Agenda, mapa y artistas) donde aparezcan los elementos mas visitados además de que podemos crear una opción para admin para que seleccione destacados y se coloquen también en esa sección, esta sección puede tener el formato de un slider con la foto de portada y la información relevante según el caso, que opinas?»

A mitad de la respuesta pidió consultar las reglas de operación y avisar al chat de gestión de cambios.

## La opinión y la decisión
- **Medido antes de opinar** (somosnosotros.org a 390×844, sin sesión):
  - hoy se ven 4 filas en la Agenda, 5 en la lista de Lugares y 4 o 5 en Artistas;
  - tienen foto 74 de 86 eventos, 47 de 58 lugares y 62 de los primeros 103 artistas;
  - no existe ningún conteo de visitas; solo el último día que se abrió la app, que lee la administración.
- **Opinión:**
  - sí a lo que elige el admin;
  - lo más visitado no, por ahora: no hay gente todavía, choca con «ni ranking», siempre ganarían los mismos y contar visitas es un dato nuevo;
  - una tira que se desliza con el dedo, solo en la vista general, y en el mapa sin tira.
- **Gestión de cambios**, avisado por `send_message` a la sesión "Gestión de cambios en producción". Respondió:
  - quién toca qué (`cualquier-pais`, `filtrar-no-es-navegar`, `crear-lugar-privado`);
  - primero el prototipo, solo documentos, en su rama y PR;
  - la migración, si la hay, se llamará `20260917120000_destacados.sql` y solo puede añadir;
  - contar visitas toca privacidad;
  - reservó esta bitácora y OL-052 (la 078 y OL-051 las tomó otro chat).
- **Decisión del founder:** «Son los destacados que elige adin + los que tienen mas asistentes, en el mapa color destacado (propón uno), Acepto tu propuesta de duración para destacados. Si no hay destacados la sección se oculta».

## Qué se hizo
- **[20-destacados-flujo-y-estados.md](../../../rediseno/20-destacados-flujo-y-estados.md):** qué entra en la tira, dónde y cuándo se ve, la tarjeta, el color, 13 estados, 12 decisiones con su ley, lo que queda por firmar (D1 a D3 y el color) y lo necesario para construir.
- **Prototipo** en [prototipos/destacados.html](../../../rediseno/prototipos/destacados.html), publicado en https://claude.ai/artifact/DojyjHo44BgwM3xj2e4zwc.
  - **La app como es:** tokens de `globals.css`, Bricolage Grotesque, el logotipo real, los renglones y los datos del 16 de septiembre. Quién está destacado y cuántos van son ejemplos, y las fotos, tonos de muestra.
  - **La tira en Agenda, Lugares › Lista y Artistas:** se desliza, asoma la siguiente y abre la ficha. Se va con otra pestaña, la fecha, la lupa o un filtro.
  - **El mapa** es un dibujo con los puntos y nombres de la vista real. Los destacados van en naranja, más grandes y encima, y su nombre gana el espacio; la tarjeta del lugar dice «Destacado».
  - **Admin** (interruptor en la tira oscura): Destacar o Quitar de destacados en los tres puntos de la ficha, con el motivo debajo, «Necesita foto» si no la hay y un aviso con Deshacer.
  - **Lista del panel** (Lugares, filtro Destacados) con la etiqueta de cada uno.
  - **Estados «Varios», «Uno solo» y «Ninguno»** en las notas.
- **Color propuesto: naranja cempasúchil** (`#d35400` en el punto, `#a94400` en el texto).
  - Se compararon 11 candidatos por contraste con el fondo y los parques del mapa, y por diferencia con el azul petróleo en visión normal, deuteranopia y protanopia.
  - El rosa mexicano quedó fuera: con protanopia casi no se distingue del azul (diferencia de 5).
- **[DEFINICION](../../../DEFINICION.md) y [PLAN](../../../PLAN.md):** la línea «ni ranking» dice ahora que los destacados sí entran, con la fecha (regla 7 de [GESTION_DE_CAMBIOS](../../../ops/GESTION_DE_CAMBIOS.md)).

## Evidencia
- **Mirado en el panel del navegador a 390×844:**
  - la Agenda con la tira: mide 251 px y la primera fila baja unos 266 px;
  - Artistas;
  - el mapa con cinco puntos naranjas y la tarjeta de un destacado;
  - el menú del admin con «Quitar de destacados», el aviso con Deshacer y el mapa ya sin ese punto naranja;
  - «Uno solo» y las notas en hoja.

  Consola sin errores. En la página se comprobó qué entra en cada tira, en el mapa y en el panel: Cumbia Fantasma y Disonauta tienen asistentes, pero no foto, y no entran.
- **Tras mirarlo, cinco arreglos:**
  - los eventos a la misma hora siguen el orden de la agenda;
  - el chip de ciudad lleva su flecha;
  - la tarjeta única dejaba 80 px de hueco (una fila flexible de la cuadrícula);
  - el aviso tapaba la tarjeta del mapa;
  - la trama de calles se aclaró.
- **Sin probar con el dedo:** el deslizar de la tira y cómo se siente en el iPhone son prueba del founder.
- Solo documentos y un prototipo HTML: no aplican lint, pruebas ni build.

## Queda
- **Firma del founder**, tras probarlo en el iPhone:
  - D1: en lugares y artistas cuentan quienes van a sus próximos eventos;
  - D2: desde 3 personas, sin contar a la administración;
  - D3: quitar también lo que entra por asistentes;
  - el color y las correcciones.
- **Con la firma:** construir en otra rama desde `main`, en una pieza, con la migración `20260917120000_destacados.sql`.
- **Sin push ni PR:** commit local y aviso al encargado de gestión de cambios, que la sube.
