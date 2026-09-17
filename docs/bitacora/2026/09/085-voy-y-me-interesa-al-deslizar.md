# 085 · Voy y Me interesa al deslizar un evento en la agenda, las dos con Deshacer (OL-056)

**Fecha:** 2026-09-17 (madrugada) · **Rama:** `deslizar-voy-agenda`, desde `main` con Destacados (#86) ya mezclado (commit local, sin push) · **Pieza A** de dos; la B (los mismos componentes en todas las listas) va en la 086 cuando esta esté en `main`.

## Qué pidió el founder
La [074](074-deslizar-en-las-listas.md) dejó una acción por lista: "Me interesa" en la agenda, y "Voy" en la ficha. Al probarlo, el founder la cambió:

> "En el caso de los eventos, solo se ve 'Me interesa' y no se ve 'Voy'."

> "Por eso te decía que en el caso de eventos debemos poner voy y me interesa! Las dos son útiles."

> "Quiero las dos swipe actions en eventos, para decir que voy y para decir que me interesa, y que las dos se puedan deshacer."

Se avisó al chat de gestión de cambios y se esperaron sus instrucciones:
- **dos piezas**, con números y ramas reservados;
- **empezar cuando Destacados (#86) estuviera en `main`**, porque toca `AgendaInicio`;
- **cuidados:**
  - el Voy al deslizar y el de la ficha son el mismo estado, y la agenda no queda desfasada al volver de la ficha;
  - cada botón tiene su nombre y hay versión con teclado.

## Qué se hizo
- **`lib/deslizar.ts`:**
  - `accionesEvento(estado)` da las dos acciones, como la versión "tuya" del prototipo v1.1:
    - sin decisión, **Voy** y **Me interesa**;
    - con Voy, **No voy** y **Me interesa**;
    - con interés, **Voy** y **Ya no**.
  - `asistenciaTras` dice en qué queda el evento: Voy y Me interesa se reemplazan entre sí, como en la ficha.
  - Avisos nuevos: "Vas a «…»" y "Ya no vas a «…»".
  - Fuera el "Vas" gris sin acción.
- **`useAsistenciaEnLista`** (nuevo, como `useSeguirEnLista`), sacado de `AgendaInicio` para que la pieza B lo use en las demás listas:
  - guarda con la misma acción de la ficha (`cambiarAsistencia`);
  - muestra el aviso con Deshacer, que devuelve el estado anterior (de Me interesa a Voy, por ejemplo);
  - tras el primer Voy hace la misma pregunta de avisos que la ficha ("¿Te recordamos ese día?", con el calendario);
  - sin sesión, lleva a Entrar con `?accion=voy` o `?accion=me_interesa`. La ficha aplica la acción al volver, y tras Voy hace la pregunta una vez.
- **Un solo estado con la ficha:**
  - el hook toma lo que llega del servidor cada vez que cambia (al volver de la ficha o tras refrescar), y superpone lo elegido aquí solo mientras se guarda;
  - `cambiarAsistencia` ahora también invalida `/`, porque la agenda se reutiliza hasta un minuto en el teléfono.
- **`page.tsx`:** pasa los datos de la pregunta de avisos, como Lugares.
- **`ui/Deslizable`, con teclado:**
  - en el renglón, ← abre las acciones y lleva el foco a la primera (el renglón lo anuncia con `aria-keyshortcuts`);
  - Esc o → cierra y devuelve el foco al renglón, y salir con Tab también cierra;
  - al activar una acción con Enter o espacio, el foco vuelve al renglón;
  - cada botón se nombra por su texto. Para el gesto táctil no cambia nada.

Sin migración ni variables nuevas.

## Evidencia
- **lint** (el aviso viejo del script del logotipo, ajeno), **tipos**, **293 pruebas** y **build** en verde. La prueba de las dos acciones por estado y los avisos nuevos está en `deslizar.test.ts`.
- **Navegador a 390×844**, con el respaldo local de datos inventados y una sesión de administrador inventada, sin producción. El respaldo guarda las asistencias en memoria.
  - Deslizar "Son huasteco" abre **✓ Voy** y **☆ Me interesa**.
  - Voy → el renglón dice "✓ Vas" y sale la pregunta "Vas a Son huasteco de prueba · ¿Te recordamos ese día?". Se cerró con la ✕, sin contestar.
  - Al volver a deslizar sale **No voy** y **Me interesa**. Me interesa → "☆ Te interesa" y el aviso "Te interesa «Son huasteco de prueba» · Deshacer". Deshacer → otra vez "✓ Vas", sin repetir la pregunta.
  - **Ficha:** dice "✓ Voy · Ya estás en la lista" y "Va 1 persona". Al volver, la agenda sigue en "Vas". Cancelar en la ficha y volver: la agenda ya no dice "Vas".
- **Teclado, en escritorio:**
  - Tab llega al renglón (anuncia ←);
  - ← abre y enfoca "Voy", Tab pasa a "Me interesa" y Esc cierra y devuelve el foco al renglón;
  - activar "Me interesa" como con el teclado (`click()`, `detail` 0) muestra el aviso, pone el sello y devuelve el foco al renglón.

  La herramienta del navegador no activa botones con Enter (tampoco la pestaña "Cercanos"), por eso se usó `click()`.
- **Con el dedo en el simulador** (iPhone SE, iOS 26.3, Safari, sin sesión; se apagó al final):
  - deslizar abre **Voy** y **Me interesa** pegados al borde;
  - tocar Voy lleva a "Entra para decir que vas".
- **Sin probar:**
  - guardar de verdad (sería producción);
  - VoiceOver, que sigue teniendo las acciones en la ficha;
  - Android.

## Queda
- **Firma del founder en el iPhone:**
  - las dos acciones y sus estados;
  - Deshacer;
  - la pregunta tras el primer Voy.
- **Pieza B** (086, OL-057, rama `deslizar-en-todas-las-listas`), cuando esta esté en `main`:
  - los mismos renglones y acciones en las pestañas del perfil, en la ficha de persona, en "Sigo" y en los próximos eventos de las fichas de lugar y artista;
  - el gesto actúa sobre quien mira;
  - quitar desde Mi perfil desaparece al instante, con Deshacer que devuelve el renglón a su sitio.
