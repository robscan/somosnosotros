# 074 · Deslizar en las listas: Me interesa en la agenda, Seguir en Lugares y Artistas

**Fecha:** 2026-09-16 (noche) · **Rama:** `deslizar-acciones` (commit local, sin push) · **Pieza:** OL-047 (bitácora y OL reservados por el gestor de cambios).

## Qué pidió el founder
Tras el prototipo ([071](071-prototipo-deslizar.md)) y su v1.1 ([073](073-iconos-en-las-acciones.md)):

> "Perfecto, acepto tus propuestas, sigue observando reglas de desarrollo y respeta chats activos, implementa por favor."

Se toma como la versión "Mi propuesta" del prototipo:
- una acción por lista: Me interesa en la agenda; Seguir en Lugares y Artistas;
- el renglón muestra el estado;
- se confirma con un toque;
- Voy y Cómo llegar se quedan en la ficha.

La pieza de lugares y eventos de cualquier país (bitácora 067) no se empezó: lleva migración y espera su sí.

## Qué se hizo
- **`lib/deslizar.ts`** (lógica sin pantalla, con 6 pruebas):
  - **qué acción ofrece cada renglón:**
    - con Voy, un "Vas" gris que no hace nada, porque cancelar vive en la ficha;
    - con interés, "Ya no";
    - sin decisión, "Me interesa";
    - Seguir / Dejar de seguir;
  - **cuándo el gesto es nuestro:** horizontal y hacia la izquierda, o de vuelta si ya está abierto; lo demás es scroll;
  - **el desplazamiento con resistencia** más allá de las acciones;
  - **cuándo abre al soltar:** 40 % visible o un tirón;
  - **el texto del aviso.**
- **`ui/Deslizable`**: el renglón deslizable común.
  - Las acciones van detrás, pegadas a la derecha, y el renglón de siempre encima.
  - Uno abierto a la vez. Se cierra deslizando de vuelta, tocando el renglón (sin abrir la ficha), tocando fuera o con el scroll.
  - Un gesto que empieza en los primeros 24 px del borde izquierdo no se toma: es del navegador (atrás). `touch-action: pan-y` deja el scroll al teléfono.
  - El renglón sale del gutter lo mismo que su resaltado (20 px): en el teléfono las acciones llegan al borde, y el resaltado al pasar el ratón se dibuja igual que antes.
- **Estado en los renglones:** "✓ Vas" y "☆ Te interesa" en la agenda, "✓ Sigues" en Lugares y Artistas. Es un sello del color de acción con el icono de la acción, como la barra de las fichas.
- **Agenda** (`page.tsx` + `AgendaInicio`): con sesión carga qué decidió la persona en los eventos que se muestran.
  - Me interesa usa la misma acción de la ficha (`cambiarAsistencia`).
  - Sin sesión lleva a Entrar con `?accion=me_interesa`, que la ficha ya aplica al volver.
- **Lugares y Artistas** (`useSeguirEnLista`, las páginas cargan lo que sigue la persona):
  - Seguir usa las acciones de la ficha.
  - La primera vez abre la misma pregunta de avisos de la ficha ("¿Te avisamos de sus eventos / fechas?").
  - Sin sesión lleva a Entrar con `?accion=seguir` y guarda la intención, como la ficha.
- **`Hecho`**: el aviso "Te interesa «…»", "Sigues a …" con Deshacer. Tinta como `ui/Aviso`, sobre la barra inferior, 7 s. Con 5 s no dio tiempo a tocar Deshacer en la prueba.
- **Una raya que asomaba:** los renglones caen en medio píxel y el color de la acción se veía como una línea bajo algunos. Las acciones van un píxel adentro arriba y abajo.

Sin migración.

## Evidencia
- lint (el aviso viejo del script del logotipo, ajeno), typecheck, **218 pruebas** (6 nuevas) y build en verde.
- **Navegador a 390×844**, build servido en local con datos de producción, solo lectura.
  - **Sin sesión:** arrastrar "Cumbia Fantasma" a la izquierda muestra "+ Seguir", y tocarlo lleva a `/entrar?siguiente=/artistas/…?accion=seguir`.
  - **Con un usuario de prueba**, borrado al final sin nada suyo. Las llamadas a las acciones del servidor se bloquearon en el navegador, así que se vio la reacción en pantalla **sin escribir en producción**; el contador de llamadas bloqueadas prueba que se intentó guardar.
    - **Agenda:**
      - "Demostración folclórica…" → "☆ Me interesa" → el renglón muestra "☆ Te interesa" y el aviso "Te interesa «…» · Deshacer";
      - con "Lectura del Taller…", tocar Deshacer a tiempo quita el sello.
    - **Lugares:** "Teatro de la Paz" → "+ Seguir" → "✓ Sigues", la pregunta "Sigues Teatro de la Paz · ¿Te avisamos de sus eventos?" y el aviso detrás. Se cerró con la ✕, sin contestar.
    - **Artistas:** "0Backside0" → "Sigues a 0Backside0" y "¿Te avisamos de sus fechas?".
- **Con el dedo en el simulador** (iPhone SE, iOS 26.3, Safari, sin sesión). Estaba apagado y se apagó al final.
  - Deslizar "Disonauta" abre "+ Seguir" pegado al borde.
  - Un scroll vertical con algo de movimiento lateral desplaza la lista y no abre nada.
  - Tocar "A83" abierto lo cierra y se queda en la lista.
  - Un toque normal abre su ficha.
- **Sin probar:**
  - guardar de verdad (sería escribir en producción; son las acciones que ya usan las fichas);
  - el aviso y la pregunta con el dedo;
  - Android.

## Queda
- **Firma del founder en su iPhone:**
  - deslizar en la agenda, Lugares y Artistas;
  - Me interesa y Seguir de verdad;
  - Deshacer;
  - la pregunta de avisos del primer Seguir.
- **En el SE el botón "Registrar artista" tapa la mitad de abajo de la acción** en los renglones que quedan detrás de él. La acción se toca por arriba. Si molesta, el botón podría esconderse mientras un renglón está abierto.
- **Las listas dentro de las fichas** (eventos de un lugar o de un artista) no se deslizan: solo las tres secciones.
