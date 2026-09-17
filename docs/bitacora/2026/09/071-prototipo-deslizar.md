# 071 · Prototipo: acciones al deslizar en los listados

**Fecha:** 2026-09-16 (noche) · **Rama:** `prototipo-deslizar` (solo documentos, commit local, sin push) · **Pieza:** OL-045.

## Qué pidió el founder
En la bitácora [067](067-artistas-con-ciudad.md) preguntó por acciones al deslizar en los listados:
- Evento: Voy, Me interesa y calendario.
- Lugares: Seguir y Cómo llegar.
- Artistas: Seguir.

Se le dio una opinión. Entre sus reparos: en Safari, deslizar desde el borde izquierdo es "atrás". Su respuesta:

> "Para evitar conflictos con deslizar desde el borde izquierdo en Safari, solo deslizamos desde el lado derecho y ponemos las acciones ahí. Haz el prototipo para verlo."

## Qué se hizo
**Prototipo** en [docs/rediseno/prototipos/deslizar.html](../../../rediseno/prototipos/deslizar.html), publicado en https://claude.ai/artifact/7jPHxXrKV3CMiDoXS5Jf2B.

- **La app como es.** Tokens de `globals.css`, Bricolage Grotesque, el logotipo real y los renglones de la agenda, Lugares y Artistas.
- **Datos reales del 16 de septiembre:** 14 eventos de mañana y el viernes, 12 lugares y 10 artistas. Las fotos son tonos de muestra.
- **El gesto, solo de derecha a izquierda.**
  - Las acciones salen a la derecha del renglón y se confirman con un toque. Deslizar hasta el fondo no dispara nada, para no marcar "Voy" sin querer.
  - Se cierra deslizando de vuelta, tocando el renglón o con el scroll. Solo un renglón abierto a la vez.
  - De izquierda a derecha no pasa nada, y un gesto que empieza en los 24 px del borde izquierdo se deja a Safari.
- **Dos versiones**, para comparar:
  - **Tu propuesta:** Evento: Voy, Me interesa, Calendario. Lugar: Seguir, Cómo llegar. Artista: Seguir.
  - **Mi propuesta:** una acción por lista. Evento: Me interesa. Lugar: Seguir. Artista: Seguir.
- **En las dos, el renglón muestra tu estado:** "Vas", "Te interesa" o "Sigues", y el conteo de quien va sube.
  - Cada acción da un aviso con Deshacer.
  - El primer "Voy" abre la pregunta real del recordatorio ("¿Te recordamos ese día?").
  - Calendario y Cómo llegar dicen qué se abriría.
- **"Asomar las acciones una vez"** (apagado): el primer renglón de cada sección se asoma y vuelve, para juzgar si hace falta una pista.
- **En el teléfono** la app ocupa la pantalla, con una tira oscura de prototipo arriba (versión y "?" con las notas). **En escritorio** va en un marco de teléfono con las notas al lado.

## Evidencia
- Mirado una vez en el navegador a 1100×900 (marco y notas) y a 390×844 (pantalla completa con la tira): la agenda se ve como la de producción. Consola sin errores.
- **El gesto no se probó con el dedo:** el navegador de escritorio no simula el deslizar táctil. La prueba es del founder, en su iPhone.

## Queda
- Prueba del founder en el iPhone y decisión entre las dos versiones, o una mezcla.
- Si se construye:
  - el estado en los renglones (vale solo);
  - el gesto en la agenda, Lugares y Artistas;
  - que sin sesión lleve a Entrar con la intención guardada;
  - las acciones siguen en la ficha para VoiceOver.
- **Ojo:** deslizar empezando pegado al borde derecho puede ser "adelante" en Safari si hay historial. Empezando sobre el renglón no pasa.
