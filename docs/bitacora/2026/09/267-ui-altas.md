# 267 · P9 Altas: una sola hoja Dónde, un solo mensaje y el botón que dice qué falta (OL-239)

**Fecha:** 2026-09-29 · **Rama:** `ui-altas`, desde `origin/ui-mapa` (`468f1b30`) · **OL:** OL-239 · **PR:** PR_POR_PONER (sin unir; va montado sobre #276, `ui-mapa`, que va sobre #275, #274, #273, #272, #271, #270, #269 y #268) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Cierra la pieza P9 del plan de OL-227 (doc 50, § 7; H-29 a H-32) con lo que el founder decidió el 2026-09-29.

## Pedido

Encargo del Gestor de cambios III, con el criterio de siempre («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código»). Una sola pantalla de alta con una tira de tipos abajo (Evento · Lugar · Artista) y el tipo por contexto; el canon de formulario en los tres; un solo mensaje por renglón y el botón que dice qué falta; una sola hoja «Dónde» para eventos y lugares; sin márgenes negativos ni `:has()` en los formularios; la tarea a 792+ con el título en la cabecera; y el vacío de Buscar que ofrece registrar. Sin migraciones.

## Lo que había

- Tres pantallas (`/eventos/nuevo`, `/lugares/nuevo`, `/artistas/nuevo`) con logotipo, título grande y sus propios mensajes: cuatro «falta» a la vista en el evento vacío (el campo, su línea, «Falta» y «Falta ubicación.»), tres en el lugar, uno en el artista; el botón lavado y mudo; y una frase de ayuda solo en el lugar y el artista («Con el nombre y dónde está basta…», «Con el nombre basta…»), no en el evento.
- Dos hojas «Dónde» casi iguales: `HojaDondeEs` (819 líneas) y `HojaDondeLugar` (330), con dos CSS (409 y 199) y dos módulos de lógica (93 y 68).
- `ui/Barra` y `.estado` con margen negativo, y `.pagina:has(> header:first-child)` para que el aire de la página aguantara.

## Lo que se hizo

### 1. Una pantalla, `/nuevo` (`app/nuevo/`, `lib/armazon.ts`)
`/nuevo?tipo=evento|lugar|artista` es la única alta; las tres rutas viejas redirigen (308, en `next.config.ts`) con su tipo y sus páginas se van. El tipo con el que abre lo pone el «+» (`enlaceDeAlta(alta, ciudad, nombre)`): evento desde Inicio, Agenda, Perfil y lo demás; lugar desde Lugares; artista desde Artistas. `?nombre=` trae escrito lo que buscó quien no encontró nada; `?ciudad=` sigue acercando la búsqueda de dirección. Abajo, la tira (pegada al pie, con su raya; el elegido en negrita con un punto). Cambiar de tipo cambia de formulario sin salir ni apilar historial y sube al inicio: los tres formularios siguen montados y solo se ve uno (`hidden`), así lo escrito en uno no se pierde al mirar otro. Una sola guardia de salida (`useSalirSinPublicar(pantalla, olvidar)`) mira los tres: Atrás y la ✕ preguntan si se escribió algo en cualquiera. Un evento que llega armado (`?desde=`, `?lugar=`, `?artista=`) abre solo, sin tira, con su título («Duplicar evento»). Sin sesión, `/entrar?siguiente=` lleva la ruta completa y el motivo del tipo.

### 2. La hoja «Dónde» única (`components/HojaDonde.tsx`, `lib/hojaDonde.ts`)
Una hoja con `para: "evento" | "lugar"` y una lógica pura para las dos (`puedeListo`, `borradorDeEvento/Lugar`, `decidirGuardado`, `direccionAGuardar`…). En el evento: elige un lugar dado de alta, pone un pin suelto con su nombre (público o reservado) o agrega «x» como lugar; en el lugar: los registrados avisan «ya existe» y no se eligen. «Estoy aquí» del renglón abre la hoja con el pin ya donde está la persona (`ubicarme`). TSX y CSS pasan de 1 757 a 1 259 líneas; la lógica, de 161 a 220 (las dos hojas comparten lo que antes copiaban). Una hoja vacía se ve pixel por pixel igual que antes (evento y lugar, 390 y 1 280).

### 3. El botón que dice qué falta (`ui/BotonPublicar`, `lib/formulario.ts`)
Mientras algo falte, «Publicar …» es un botón `aria-disabled` (`type="button"`, sin enviar) y bajo él va **una** nota con la frase de `queFalta`: «Falta el nombre y dónde es.», «Falta el nombre y dónde está.», «Falta el nombre.» (y «Ese artista ya está registrado.»; con el sitio leído de un cartel y sin pin, «Falta confirmar dónde es.»). La nota se actualiza al escribir y se va al completar, cuando el botón pasa a `submit`. La acción del formulario también corta si falta algo (Enter).

### 4. Un solo mensaje
Se fueron «Falta el nombre.» bajo el campo, «Falta ubicación.», «Falta dónde está.» y el placeholder «Falta el nombre» (vuelve a «Nombre del evento»); quedan el valor «Falta» del renglón (el estado) y la nota bajo el botón. Se fueron la frase del alta de lugar y la del artista (H-30). Un error del servidor (p. ej. un enlace) sale una vez, en su renglón, tras el primer intento de publicar.

### 5. Sin negativos ni `:has()`; la tarea con título
`ui/Barra` (`cerrar`) y `.estado` de `FormularioCanon` sin margen negativo: el aire se decide con `gap`. `.pagina` (`globals.css` y `ui/Ficha.module.css`) pasa a una rejilla de tres columnas con el aire lateral (`--gutter`) en las de los lados; la barra interior ocupa `1 / -1` y el colchón de la zona segura vive en `.pagina > :first-child:not(header)`; `.pagina:has(> header:first-child)` se va. Como en una rejilla los márgenes no se funden, se ajustaron en su sitio los de Ajustes, Novedades, Admin, Obras colectivas, el mando y `ui/Atras` para que ninguna pantalla se mueva. `Barra` (`cerrar`) recibe `titulo` y lo pone en el centro, como el prototipo firmado (`.barra-interior.tarea`): en el teléfono ya no lleva el logotipo (decisión 4); a 792+ queda la barra de la app con su logotipo, el carril, la cabecera de 56 con raya y el formulario a 600.

### 6. Buscar ofrece registrar (`buscar/`)
Con «Nada con «q»», y solo con sesión, un botón «Registrar a «q» como artista» (o «Registrar «q» como lugar» si se buscó desde Lugares) abre el alta con el nombre ya puesto. `nombre` entra a los parámetros privados de la analítica.

### 7. Notas y palancas (las de P3)
`FormularioNovedad` usa `canon.notaCampo` para la nota bajo «Enlace» (ya no toca «Título»; las de Lugar y Artista se fueron con el mensaje único). Las filas de palanca usan la piel `ajuste` + `sola` de `ui/Renglon` con icono: `ReservaPerfil` («Reservado», con el ojo tachado), `InterruptorPincel` (con el pincel) y «Es un lugar privado» de la hoja «Dónde» (con el candado). `FormularioCanon.salida` (la cámara) se queda donde está.

### 8. Retiros
`HojaDondeEs` y `HojaDondeLugar` (con sus CSS), `eventos/dondeEsPantalla` y `lugares/dondeEstaPantalla` (con sus pruebas: 62 pasan a las 67 de `lib/hojaDonde.test.ts`), las tres páginas `nuevo`, `recordarLugarNuevo`, `useSalirSinPublicar(activa)`, `.pagina:has(…)`, `.sinIcono` de `FormularioCanon`, `.interruptor` de `ReservaPerfil`, `.interruptorPincel` de obras, `.formulario` de `FormularioLugar`, los márgenes negativos y los comentarios que nombraban lo retirado. Comprobado que no queda **ninguna clase huérfana nueva** (las 30 que marca el buscador, iguales en la base, son de acceso dinámico) ni referencias a lo retirado. `hrefNuevo` de `ListaArtistas` **se queda**: lo usa el vacío de una ciudad sin artistas; su segundo uso (`?q=`) queda para P12.

## Decidí yo (para que el gestor confirme)

1. **La cabecera de la tarea lleva el título y no el logotipo, también en el teléfono.** P7 dejaba el logotipo en la cabecera de la tarea en el teléfono; el prototipo firmado pone el título al centro (`.barra-interior.tarea`) a cualquier ancho, y una sola pieza sin variantes por pantalla es más simple. Solo cambia la variante `cerrar` (las altas): Novedad nueva, Ajustes, etc. siguen con Atrás y logotipo. Actualicé la prueba de componente de P7 (`Armazon`, la 10).
2. **El nombre del evento lleva la lupa**, como el del lugar y como el prototipo firmado (`label.campo` con `#i-buscar`); su borde discontinuo vacío se queda (decisión del founder del 2026-09-21, OL-113). El del artista conserva su estrella.
3. **Sin tira cuando el evento llega armado** (duplicar, `?lugar=`, `?artista=`): es un evento, no una elección de tipo.
4. **Los tres formularios siguen montados**: cambiar de tipo no pierde nada, pero el nombre no viaja de un tipo a otro (el de un evento no es el de un lugar) y el DOM de la alta pasa de 62–73 a 195 nodos.
5. **La tira son botones `aria-pressed` en un grupo**, no `role="tablist"` como dibuja el prototipo: sin la gestión de flechas del patrón de pestañas, el de botones de alternar es el correcto y se maneja con Tab.
6. **`aria-disabled` y no `disabled`** en el botón: se puede enfocar y leer con su nota (`aria-describedby`), y `type="button"` evita que React 19 reinicie el formulario tras una acción que no hizo nada.
7. **`.pagina` como rejilla** es un cambio que toca todas las pantallas con `.pagina` (P7 lo evitó por eso): ajusté en su sitio los márgenes que dejaron de fundirse; 42 pantallas comparadas antes y después (ver Verificación).
8. **«Falta confirmar dónde es.»** cuando el cartel dio un sitio y falta el pin: la nota lo dice con esas palabras en vez de «Falta dónde es.».
9. **`?q=` de Artistas** ya no lo produce ninguna pantalla (Buscar único, P5); no lo retiré aquí (ver P12).

## Lo que cambia a la vista

- **Una sola pantalla de alta** con la tira Evento · Lugar · Artista abajo; el «+» de cada sección abre el tipo que toca.
- **La cabecera** dice «Publicar un evento», «Registrar un lugar» o «Registrar artista» al centro, con la ✕; ya no hay logotipo ni título grande debajo, ni frase de ayuda.
- **Un solo mensaje:** «Falta el nombre y dónde es.» bajo el botón, que cambia al escribir; los renglones pendientes siguen con su borde discontinuo y su «Falta».
- **Dónde** trae dos iconos: «Estoy aquí» (abre la hoja con el pin donde estás) y la lupa.
- **Buscar** ofrece registrar lo que no encontró.
- **Lo que no cambia:** las hojas «Dónde» (idénticas a los píxeles), Cuándo, Quién, Cuánto, Más, el cartel, el guardado de borradores y las demás pantallas (comparadas una a una).

## Verificación

- `npm run lint`: 0 errores (la advertencia que ya estaba, en `docs/diseno/logotipo/iconos-sn.mjs`). `npm run typecheck`: verde. `npm test`: 119 archivos, **1 588** pruebas (1 572 antes; +16: 6 de la nota del botón en `formulario.test.ts`, 4 de rutas y tipo inicial por contexto en `armazon.test.ts`, 5 de `puedeListo` en `hojaDonde.test.ts`, 1 de analítica). `next build` verde con el respaldo local y **sin variables de entorno**, como la CI.
- **Pruebas de componente en Chrome:** `Armazon` 16 de 16 (la 10 cambió, decisión 1); `Asistencia`, `HojaLugares`, `Destacados`, `FilaEventos`, `Seguir` y `BotonIcono`, 35 de 35. `cupo` (13), `guardado` (2) y `nuevos` (6) **fallan igual que en la base** con el mismo error de empaquetado (`next/dist/server` no se resuelve): **`cupo` no cambia**.
- **Comportamiento** (Chrome, respaldo local inventado, `ana@example.com`): sin sesión pide entrar con el tipo y la ruta completa; el tipo por `?tipo=` y el nombre por `?nombre=`; ✕ sin cambios sale sin preguntar, y con algo escrito en otro tipo pregunta, «Seguir editando» conserva todo y «Salir y borrar» sale; el botón apagado no envía y con su nota, y al completar envía; `?lugar=` y `?desde=` abren solo el evento; la hoja elige «Teatro de la Paz» y habilita el botón; en el lugar «Teatro de la Paz» avisa «ya existe» y un punto vacío del mapa lo ubica; «Agregar lugar» abre su panel.
- **Medidas** (`medir.js`, alta a 390 y a 1 280, antes → después):

  | | Antes | Después |
  |---|---|---|
  | Márgenes negativos: evento, lugar y artista | 1 cada una (la barra) | **0** |
  | Márgenes negativos: hojas «Dónde» | 2 (la barra y el logotipo de Mapbox) | **1** (el de Mapbox) |
  | Desbordes | 0 en las tres altas; 3 en las hojas | **0**; 3 en las hojas (los contenedores de Mapbox) |
  | Toques de menos de 44 | artista 1 (el `input` de foto de 1×1, oculto); hojas 3 | **igual** (`Listo` de 40×44, el campo de 296×24 y el logotipo de Mapbox, en las hojas) |
  | Mensajes de «falta» visibles con la alta vacía | evento 4 · lugar 3 · artista 1 | evento **2** · lugar **2** · artista **1** (el valor «Falta» y la nota) |
  | Dos iconos pegados (a 6 px) | lugar 1 | evento 1 · lugar 1 (los dos de «Dónde», del canon) |

- **Las demás pantallas** (`.pagina` como rejilla): 42 capturas de página entera, móvil y escritorio (Ayuda, Reglas, Privacidad, Entrar, Ajustes ×3, Novedades, editar evento, lugar y artista, Novedad nueva, Admin ×7, mando, 404), antes y después: 38 idénticas o con ruido de hasta 0,002 % (bloques de unos 10 px); **cuatro cambios buscados**, en móvil y en escritorio: la nota de Novedad nueva, con aire, y la fila del Pincel de Obras colectivas, 17 y 18 px más baja (la piel `ajuste`). Ojo con la prueba: una ficha que entra deslizándose se captura a medias en este Chrome sin cabeza (quedaba fuera de la ventana); se dejó en su estado final antes de comparar, y las pantallas de editar y de admin se capturaron con la cuenta de prueba como administradora. Esa pasada es anterior a la lupa del nombre del evento (decisión 2): «Editar evento» comparte el formulario y la lleva también, sin recapturar.
- **Safari real** (simulador iPhone SE, iOS 26.3; la web del iPhone del founder no se probó): la alta abre con su cabecera, el nombre, los renglones y la tira encima de la barra de Safari; con el teclado abierto el campo y Dónde quedan a la vista y el botón y la nota **quedan detrás del teclado** (como todo formulario largo de la app); con el teclado cerrado (✓ del teclado) el desplazamiento llega a botón, nota y tira **sin solaparse** (`21`); la hoja Dónde abre con la lupa y cierra con Atrás, y el teclado se va (`24` y `25`). **No pude** comprobar el desplazamiento con el teclado abierto: el simulador no deja arrastrar con el teclado puesto. En el simulador el mapa no carga (la llave no es la del dominio).
- **Lo que esta prueba no puede ver:** el iPhone (la sensación del teclado y de la tira), la tarjeta del cartel (la lectura está apagada en el respaldo) y los datos reales.

## Capturas

`docs/rediseno/capturas-267/` (38 PNG de paleta, 0,9 MB). «Antes» es la compilación de `origin/ui-mapa`, «después» esta rama; ambas con el respaldo local inventado y la sesión de `ana@example.com`. Teléfono a 390×844 a 2×, escritorio a 1 280×800, Safari a 375×667 a 2×. Cada una abierta y descrita.

1. **Evento vacío** (`01`): antes, el logotipo y la ✕, «Publicar un evento» grande, el campo con «Falta el nombre» y su línea «Falta el nombre.», «Dónde» con «Falta» y «Falta ubicación.» y el botón lavado y mudo. Después, la cabecera con el título y la ✕, el campo con lupa y borde discontinuo, «Dónde» con «Estoy aquí» y la lupa, y bajo el botón «Falta el nombre y dónde es.»; abajo, EVENTO (con punto), LUGAR y ARTISTA.
2. **Con el nombre puesto** (`02`): antes, el mismo campo con su ✕ y las líneas de «Dónde»; después, el campo lleno con borde oscuro y la nota que cambia a «Falta dónde es.».
3. **La hoja Dónde del evento** (`03` a `06`, solo después: son idénticas a las de antes): `03` vacía (mapa liso, botón de ubicación); `04` buscando «jardin»: «Jardín de San Francisco» con su dirección y «Agregar «jardin» como lugar»; `05` con un punto del mapa tocado: el pin violeta y la tarjeta «Nombre del lugar» con «Galeana 423, Centro…» y «Listo» apagado; `06` con el nombre «Patio de mi casa» y «Listo» encendido.
4. **Evento con «otro sitio»** (`07`): antes y después, «Dónde» con «Patio de mi casa · Galeana 423… · otro sitio» y «Publicar evento» violeta; después, bajo la cabecera con título, sin nota y con la tira.
5. **Primer intento de publicar** (`08`): con «Más» abierto y un enlace inválido, un solo mensaje rojo («Ese enlace no se ve bien. Revisa que empiece con https://») bajo su campo; antes con el título grande, después con la cabecera y la tira bajo el botón.
6. **«Estoy aquí»** (`09`, solo después): la hoja con el punto azul de la persona y su pin, la tarjeta con la dirección leída y «Listo» apagado hasta ponerle nombre; un pin violeta a un lado (un lugar registrado).
7. **Lugar vacío** (`10`): antes, la frase «Con el nombre y dónde está basta…», el campo con lupa, «Falta el nombre.», «Dónde» con «Falta dónde está.» (3 «falta»); después, sin frase, Dónde con sus dos iconos, «Tipo: Por el nombre», «Más» y bajo el botón «Falta el nombre y dónde está.» (2); la tira con LUGAR.
8. **Artista vacío** (`11`): antes, «Con el nombre basta…» y «Falta el nombre.» bajo el campo con estrella; después, sin frase, los mismos renglones (Qué hace, Es, Ciudad, Foto, Soy yo, Más) y «Falta el nombre.» bajo el botón; la tira con ARTISTA.
9. **La tira con otro tipo** (`12` y `13`, después): con el nombre de un evento ya escrito, «Lugar» y «Artista» cambian el formulario y el título de la cabecera y la tira marca el elegido; al volver a «Evento» el nombre sigue ahí.
10. **La hoja Dónde del lugar** (`14`, después): «¿Dónde está?» buscando «Foro del Carmen» (resultado con su dirección) y los lugares registrados como puntos violetas, los que avisan «ya existe».
11. **El vacío de Buscar** (`15` y `17`): antes, «Nada con «Zxqwv Trío».» y nada más; después, el botón «Registrar a «Zxqwv Trío» como artista» (`15`) y, desde Lugares, «Registrar «Zxqwv Foro» como lugar» (`17`). `16`: al tocarlo, el alta de artista con el nombre puesto, «Qué hace: Música» deducido y «Publicar artista» encendido.
12. **Escritorio** (`18` y `19`): antes, la cabecera con la ✕ a la derecha de la columna y el título grande debajo; después, «Publicar un evento» al centro de la columna de 600 con la ✕ en su borde, la barra de la app y el carril, la nota bajo el botón y la tira centrada bajo su raya (`18`); lo mismo con «Registrar artista» (`19`).
13. **Safari, iPhone SE** (`20` a `25`): `20` la alta de evento con la tira sobre la barra de Safari; `21` con «Jazz» escrito y el teclado cerrado, desplazada al final: botón lavado, «Falta dónde es.» y la tira sin solaparse; `22` la alta de lugar; `23` con el teclado abierto (el campo y «Dónde» a la vista; botón y nota detrás del teclado); `24` la hoja «¿Dónde está?» abierta con la lupa (el mapa no carga en el simulador); `25` de vuelta en la alta tras «Atrás», sin teclado.
14. **Las palancas** (`26` y `27`): antes, «Reservado» con su interruptor bajo una raya y el Pincel sin icono; después, «Reservado» con el ojo tachado y el Pincel con su pincel, ambos como las filas de Ajustes. `28`: la nota de «Enlace» de Novedad nueva, antes pegada a «Título (opcional)» y después con aire.

## Anotado para las piezas que siguen

- **P10 (chips).** Nada de la alta usa chips nuevos. La tira son botones de texto, no chips; el botón de Buscar es un `Boton` secundario.
- **P11 (protección).** Hay una sola guardia de salida para los tres formularios (`useSalirSinPublicar(pantalla, olvidar)` mira todos los `<form>` de la pantalla y `lib/guardiaSalida.ts` sigue siendo global). El borrador solo existe para el evento (`CLAVE_BORRADOR`, `olvidarBorrador`); lugar y artista no guardan borrador. Cambiar de tipo con la tira nunca pregunta: no sale.
- **P12 (retiros).** El parámetro `q` de Artistas (y su vacío «Nadie se llama «q»» con `hrefNuevo(filtro.q)`) ya no lo produce ninguna pantalla desde Buscar único; retirarlo entero (página, `ListaArtistas`, los chips que lo arrastran) es de esta pieza. Las 30 clases que marca el buscador de huérfanas son de acceso dinámico (`styles[variante]`); no hay ninguna nueva.
- **P13 (lenguaje incluyente).** Textos nuevos de esta pieza: las tres frases de la nota («Falta el nombre y dónde es.», «…dónde está.», «Falta el nombre.», «Ese artista ya está registrado.»), «Registrar a «q» como artista», «Registrar «q» como lugar», «Estoy aquí» y los títulos de la cabecera («Publicar un evento», «Registrar un lugar», «Registrar artista», «Duplicar evento»); «Soy yo / es mi grupo» y «Es: Solista» siguen como estaban.

## Archivos

Sin migraciones ni variables de entorno. En `src` y `next.config.ts`, código +2 104 y −2 342 líneas (neto −238) y pruebas +474 y −387; 76 archivos: 56 con cambios, 9 nuevos y 11 retirados.

**Nuevos:** `app/nuevo/{page.tsx, Alta.tsx, Alta.module.css}`, `components/HojaDonde.tsx` y `.module.css`, `components/ui/BotonPublicar.tsx`, `lib/hojaDonde.ts` y su prueba, `lib/formulario.test.ts`, esta bitácora y `docs/rediseno/capturas-267/`. **Retirados:** `HojaDondeEs`, `HojaDondeLugar` (con sus CSS), `dondeEsPantalla`, `dondeEstaPantalla` (con sus pruebas) y las tres páginas `nuevo`. **Con cambios:** `lib/armazon.ts`, `lib/formulario.ts`, `lib/eventos.ts`, `lib/entrar.ts`, `lib/limpiarUrlAnalitica.ts` (y sus pruebas), `next.config.ts`, `globals.css`, `ui/{Barra, Ficha, FormularioCanon, Renglon, Atras}`, `SalirSinPublicar`, `MapaDondeEs`, `ListaArtistas`, `FormularioEvento`, `FormularioLugar`, `FormularioArtista`, `FormularioNovedad`, `ReservaPerfil`, `InterruptorPincel`, `Buscar*`, las acciones de eventos, lugares y artistas, los enlaces de las fichas y de `borrado`, y los CSS de Ajustes, Novedades, Admin, Obras colectivas y el mando; documentos: `docs/ops/OPEN_LOOPS.md`. **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**`, `docs/ops/ASIGNACIONES.md` y el doc 50.
