# 085 · Voy y Me interesa al deslizar un evento en la agenda, las dos con Deshacer (OL-056)

**Fecha:** 2026-09-17 (madrugada) · **Rama:** `deslizar-voy-agenda`, desde `main` con Destacados (#86) ya mezclado ([PR #88](https://github.com/robscan/somosnosotros/pull/88); los arreglos de la revisión, commit local y sin push) · **Pieza A** de dos; la B (los mismos componentes en todas las listas) va en la 086 cuando esta esté en `main`.

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

## Revisión del PR #88, arreglada
Gestión de cambios revisó el PR y pidió estos arreglos para cerrar la pieza; el founder eligió hacerlos ahora (2026-09-17, madrugada).

- **La pregunta de avisos ya no se repite:**
  - la agenda, Lugares y Artistas leían "ya se preguntó" solo al abrir la pantalla; ahora lo toman de lo que llega del servidor en cada toque;
  - contestar (por correo, en el teléfono o "No, gracias") queda apuntado en el teléfono mientras la app esté abierta (`lib/avisosPreguntados`): Next reutiliza un rato las pantallas ya vistas, con el dato de cuando se cargaron;
  - la respuesta, también la del teléfono, invalida todas las pantallas (`revalidatePath("/", "layout")`);
  - la pregunta sale solo después de guardar el Voy o el Seguir, en las listas y en las fichas.
- **Si no se pudo guardar, la pantalla ya no se cae.** Antes, un fallo al guardar dejaba la agenda en "Algo falló":
  - `cambiarAsistencia`, `cambiarSeguimiento` y `cambiarSeguimientoArtista` ahora dicen si guardaron;
  - la lista deshace lo que mostró y avisa «No se pudo guardar «…» · Reintentar»;
  - lo mismo en Lugares y Artistas, que además toman lo que llega del servidor, como la agenda.
- **Con la hoja de avisos abierta, el aviso con Deshacer espera** y sale, con su tiempo completo, al cerrarla.
- **Foco visible con teclado en las acciones:** un anillo por dentro del botón, en el color de su texto, que se ve sobre el azul y sobre la tinta (por fuera lo recortaba el renglón). También en Seguir.
- **Flechas:**
  - → pasa de Voy a Me interesa y, desde la última, cierra y vuelve al renglón; ← regresa a la anterior;
  - Alt+← y Cmd+← son atrás del navegador y ya no abren el renglón.
- **Al cerrar por scroll o tocando fuera,** si el foco estaba en una acción, vuelve al renglón. Si un scroll cierra el renglón justo al abrirlo con ←, el foco se queda en el renglón y no en un botón oculto.
- **Limpieza:** fuera los restos del "Vas" gris (`deshabilitada`, `aria-disabled`, el tono gris y su CSS) y el `router.refresh()` repetido de la agenda (la acción ya refresca la pantalla).
- **Encontrado al probar:** Reintentar borraba en el mismo toque su aviso nuevo («Vas a…»), porque el botón cierra el aviso después de actuar. Ahora cada aviso cierra solo el suyo.

### Evidencia de la revisión
- **lint** (el aviso viejo del script del logotipo, ajeno), **tipos**, **307 pruebas** y **build** en verde, con `main` traído.
- **Navegador a 390×844**, con el respaldo local y una sesión inventada, sin producción. El respaldo guarda asistencias y seguimientos en memoria y puede rechazar las escrituras a propósito.
  - **Agenda con fallo:** la agenda sigue a la vista, el renglón vuelve a Voy · Me interesa y sale «No se pudo guardar «Son huasteco de prueba» · Reintentar», sin la pregunta.
  - **Reintentar, ya guardando:** "✓ Vas" y la pregunta de avisos, con el aviso de Deshacer en espera. "No, gracias" y cerrar: sale «Vas a «Son huasteco de prueba» · Deshacer». Otro Voy ya no pregunta.
  - **Pantalla vieja:** Lugares abierto antes de contestar, contestar en la agenda y volver atrás. Seguir con fallo y Reintentar: "✓ Sigues" y «Sigues Casa de Prueba del Centro · Deshacer», sin la pregunta. Deshacer quita "Sigues" y el respaldo queda sin ese seguimiento. La ficha del lugar deja de seguir con la acción nueva.
  - **Teclado:** el anillo blanco en Voy (azul), en Me interesa (tinta) y en Seguir; ← y → entre acciones; → en la última y Esc cierran y vuelven al renglón; Alt+← y Cmd+← no abren; un scroll o un toque fuera con el foco en una acción lo devuelve al renglón.
- **Sin repetir en el simulador:** el gesto no cambió.

## Segunda revisión del PR #88, arreglada
Gestión de cambios verificó los arreglos con tres revisores escépticos, cada uno con sus propias pruebas. Encontraron tres fallos importantes y no lo mezcló. El enfoque cierra la familia de casos, no uno por uno.

- **La marca de "ya contestó" va atada a la cuenta** (`hayQuePreguntar(cuenta, preguntado)` en `lib/avisosPreguntados`):
  - antes vivía en el módulo sin cuenta: si alguien contestaba, cerraba sesión y otra persona entraba con código en la misma pestaña, a la segunda no se le preguntaba (le pasa al founder con usuarios desechables);
  - las páginas pasan el id de quien mira a las listas, las fichas y la hoja de avisos;
  - la vuelta de Entrar con intención también la mira.
- **Un número de toque por renglón** (`lib/toques`, lógica pura con pruebas), en la agenda y en Lugares y Artistas:
  - cada toque (Voy, Me interesa, Seguir, Deshacer, Reintentar) lleva el número siguiente de su renglón;
  - lo que trae un guardado (confirmar, quitar lo mostrado, la pregunta de avisos, ofrecer Reintentar) solo cuenta si su toque sigue siendo el último; si no, se ignora en silencio;
  - Deshacer y Reintentar solo actúan si su toque sigue siendo el último.

  Así ya no pasa:
  - que la pregunta salga para un Voy o Seguir ya deshecho (y gaste la única pregunta);
  - que un Reintentar viejo vuelva a poner Voy encima de un Me interesa ya guardado;
  - que Voy · No voy · Voy borre el "Vas" un momento.
- **Menores:**
  - "No, gracias" y cerrar los pasos de instalar marcan "contestó" solo si se guardó, como Por correo y En el teléfono;
  - **las fichas avisan como las listas:** si `cambiarAsistencia` o seguir no guardan, o no hay red, la barra vuelve a como estaba y sale «No se pudo guardar · Reintentar» sobre la barra de la ficha (`Hecho` con `sobreBarra`), en vez de deshacer en silencio o caer a la pantalla de error;
  - fuera el `router.refresh()` de `useSeguirEnLista`: la respuesta de la acción ya trae la página al día;
  - **teclado:**
    - el foco a la primera acción no desplaza la página (el desplazamiento cerraba el renglón recién abierto);
    - Tab desde la última acción cierra y deja el foco en el renglón;
    - el tono azul ya no pinta la clase `undefined`;
  - `elegirAvisos` y `guardarSuscripcionPush` invalidan solo `/perfil` y `/`: con `layout` marcaban como vieja cada página del sitio, y la pregunta ya no depende de eso.

### Evidencia de la segunda revisión
- **lint** (el aviso viejo del script del logotipo, ajeno), **tipos**, **316 pruebas** y **build** en verde; `main` ya estaba traído.
- **Pruebas nuevas:**
  - `toques.test.ts`: Voy deshecho sin pregunta, fallo viejo sin Reintentar, Reintentar viejo que no pisa, Voy · No voy · Voy;
  - `avisosPreguntados.test.ts`: cambio de cuenta en la misma pestaña.
- **Navegador a 390×844** con el respaldo local, sin producción. El respaldo tiene dos cuentas inventadas, un retraso configurable al guardar y fallos a propósito.
  - **Voy y Deshacer antes de que llegue el Voy:** sin pregunta ni "Vas", y el respaldo guardó y borró.
  - **Voy · No voy · Voy rápido:** "Vas" a la vista en las 50 muestras de 5 s y una sola pregunta, al final.
  - **Voy que falla despacio y Me interesa encima:** nunca sale Reintentar, "Te interesa" todo el tiempo y el respaldo queda en me_interesa.
  - **Cambio de cuenta sin recargar:** la cuenta 1 contesta en la agenda; entra la cuenta 2 y Seguir en Lugares le pregunta.
  - **"No, gracias" que no se guarda:** a la cuenta 2 se le vuelve a preguntar en la ficha de un evento.
  - **Lugares sin `router.refresh()`:** "Sigues" sigue tras pasar por el Mapa.
  - **Ficha de evento:**
    - con fallo, «No se pudo guardar · Reintentar» sobre la barra y la barra como estaba; Reintentar guarda y pregunta;
    - sin red (la llamada a la acción falla en el navegador), el mismo aviso y ninguna pantalla de error.
  - **Ficha de lugar:** lo mismo con Seguir.
  - **Teclado:** ← abre, → a la última y Tab cierran el renglón con el foco en él; las clases sin `undefined`.

## Tercera revisión del PR #88, arreglada
Gestión de cambios dejó las listas por buenas: un modelo al azar con 20 renglones y 5000 pasos, con fallos y respuestas en desorden, dio 0 estados rotos. Quedaba una cosa importante en las fichas y tres menores.

- **Fichas: Reintentar atado al último toque.**
  - Antes el aviso de fallo seguía a la vista tras otro toque que sí se guardaba, y su Reintentar pisaba lo nuevo:
    - en un evento, Me interesa fallaba, Voy se guardaba y Reintentar volvía a Me interesa;
    - en un lugar, Seguir fallaba, Seguir se guardaba, Dejar de seguir se guardaba, y Reintentar volvía a seguir.
  - Ahora `Asistencia` y `Seguir` usan `lib/toques`:
    - cada toque nuevo cierra el aviso de un fallo anterior;
    - lo que trae un guardado viejo se ignora;
    - Reintentar solo actúa si su toque sigue siendo el último.
  - La prueba de esos dos casos está en `toques.test.ts`.
- **La hoja de avisos no da por hecho lo que no se guardó:**
  - "No, gracias", cerrar los pasos de instalar y "Por correo" guardan con la hoja ocupada (try/finally);
  - si no se pudo, o no hay red, dice «No se pudo guardar · Reintentar» y la hoja sigue como estaba: sin "Sin avisos", sin "Falta un paso", sin cerrarse sola y sin quedar bloqueada;
  - "En el teléfono" sin red cae en "No pudimos darte de alta", con Intentar de nuevo.
- **El aviso de la ficha va dentro de su barra fija**, justo encima de ella, mida lo que mida (antes eran 72 px fijos y tapaba "Dejar de seguir" con la promesa en dos líneas o con letra grande). `Seguir` pinta una sola barra para sus dos estados.

### Evidencia de la tercera revisión
- **lint** (el aviso viejo del logotipo), **tipos**, **319 pruebas** y **build** en verde; `main` sin cambios.
- **Navegador a 390×844** con el respaldo local, sin producción.
  - **Ficha de evento:**
    - Me interesa falla y sale el aviso dentro de la barra;
    - tocar Voy lo cierra al momento, Voy se guarda y sale la pregunta;
    - el Reintentar viejo ya no está en la página y el respaldo queda en voy.
  - **Hoja, "No, gracias" con fallo:** tras 2,8 s sigue abierta con la pregunta, los botones activos y «No se pudo guardar · Reintentar»; Reintentar guarda y dice "Sin avisos", con A mi calendario.
  - **Hoja, "Por correo" sin red:** el aviso con Reintentar y los botones activos; con red, "Te escribimos a…".
  - **Ficha de lugar** con la promesa en dos líneas (barra de 77 px) y "Dejar de seguir" con fallo: el aviso queda 12 px encima de la barra. Con letra al 150 % (barra de 172 px), igual, sin tapar "Dejar de seguir".

## Cuarta revisión del PR #88, arreglada
Las fichas quedaron limpias (8 casos con `Asistencia` y `Seguir` de verdad). En la hoja de avisos había un fallo importante: el aviso «No se pudo guardar · Reintentar» seguía a la vista tras otra respuesta, y su Reintentar guardaba justo lo que la persona había rechazado. Se reprodujo con el componente real en cuatro casos:
- "Sí" al correo falla y luego "No": Reintentar guardaba el correo;
- en iPhone, "Mientras, ¿por correo?" falla y luego "No": igual;
- con los avisos bloqueados, "Por correo" falla y luego "Ahora no": Reintentar guardaba el correo y la marca de contestada;
- cerrar los pasos de instalar falla y luego "No": Reintentar guardaba los avisos en el teléfono.

**Arreglo:**
- Toda respuesta de la hoja (cada botón y cerrar los pasos) pasa por un solo sitio, `responder`, que cierra el aviso anterior antes de actuar; es la misma regla que en las fichas. Sin cambios de aspecto ni de textos.
- **Menores:**
  - el CSS de la nota ya no le pone `display: flex` a "Se cambia en Ajustes.": la regla compartida quedó como estaba y el flex va en una regla propia de `.nota`;
  - en `toques.test.ts`, la secuencia que imitaba las fichas se llama por lo que prueba (toques de uno en uno con un aviso de fallo) y ya no promete probar los componentes.

**Evidencia:**
- lint (el aviso viejo del logotipo), tipos, 319 pruebas y build en verde;
- las pruebas del verificador de gestión de cambios, fuera del repo (38, con el componente real): pasan los cuatro casos que fallaban y siguen en verde las fichas.
- Sin captura nueva: no cambia nada a la vista.

## Queda
- **Firma del founder en el iPhone:**
  - las dos acciones y sus estados;
  - Deshacer;
  - la pregunta tras el primer Voy.
- **Para después:**
  - tras actuar con teclado, el foco vuelve al renglón: el aviso con Deshacer y la hoja de avisos no lo reciben;
  - cambiar los avisos en Ajustes no apunta la marca: una pantalla abierta antes podría preguntar una vez más (la base ya dice que se preguntó y se toma al recargar);
  - en las listas hay un solo aviso para todos los renglones: el fallo de uno tapa el Deshacer o el Reintentar de otro;
  - un Voy guardado seguido de otro toque que falla deja "voy" en el servidor sin la pregunta;
  - la misma cuenta en dos pestañas, o en Safari y en la app, puede preguntar una vez más.
- **Pieza B** (086, OL-057, rama `deslizar-en-todas-las-listas`), cuando esta esté en `main`:
  - los mismos renglones y acciones en las pestañas del perfil, en la ficha de persona, en "Sigo" y en los próximos eventos de las fichas de lugar y artista;
  - el gesto actúa sobre quien mira;
  - quitar desde Mi perfil desaparece al instante, con Deshacer que devuelve el renglón a su sitio.
