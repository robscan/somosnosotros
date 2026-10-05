# 328 · Armazón del alta por pasos y el camino «No tengo cartel»

**Pieza:** OL-300. **Rama:** `armazon-por-pasos` (base `origin/main` `59d99204`; trae `origin/main` hasta `07af5e86`, que solo sumó documentos). **Fecha:** 2026-10-05. **Operador:** Claude Opus 5.5.
**Estado:** hecho, probado y medido en Chrome (headless) contra el respaldo local con la app compilada, a 320, 375, 390, 820 y 1280; falta el iPhone real (lista al final). Sin migraciones, sin cambios en acciones del servidor.

## Qué se encargó

Pieza 2 del plan de construcción aceptado en la bitácora [323](323-publicar-por-pasos.md) (aceptación final: primera fase sin creador de cartel): el armazón de pasos reutilizable (barra, avance, una pregunta, pie pegado, transición, guardia) y, montado en él, el camino sin cartel del alta de evento hasta publicar con la acción de siempre. Prototipo firmado: `docs/rediseno/prototipos/publicar-por-pasos.html`, caso «Sin cartel» sin «Con creador de cartel»; capturas de referencia en `docs/rediseno/capturas-323/`.

## La ruta

**`/nuevo/evento`** (`src/app/nuevo/evento/page.tsx`): dentro de `src/app/nuevo/`, la carpeta del alta, como una ruta hija del tipo. Convive con `/nuevo` y **ningún botón lleva aquí**; se abre por la dirección. `robots: noindex`, título «Publicar un evento · Somos Nosotros». Pide sesión como `/nuevo` (antes de ver nada, `/entrar?siguiente=/nuevo/evento`). Acepta `?ciudad=` como `/nuevo` (pista para buscar el sitio). Carga lo mismo que el alta de evento de `/nuevo`: los lugares visibles (con los privados propios), los artistas ligados a la cuenta y las ciudades. `vistaDeRuta` la trata como tarea, sin tocar `lib/armazon.ts`.

## Lo que hay

Archivos nuevos:

- `src/components/PorPasos.tsx` + `.module.css` — el armazón, para evento y después lugar y artista: `main` con sus hijos directos (barra, pregunta, controles del paso, pie), la transición, el foco al cambiar de paso, la guardia (`useSalirSinPublicar`). Exporta `PiePaso`, el pie pegado que sube sobre el teclado (`ui/useAreaVisible`).
- `src/components/ui/Opcion.tsx` + `.module.css` — la «opción grande» de una pregunta de un toque (icono | respuesta / detalle | chevron), rejilla con áreas, `<button>` con el reinicio del canon.
- `src/app/nuevo/evento/page.tsx` — la ruta (servidor).
- `src/app/nuevo/evento/AltaEvento.tsx` — el flujo: arma `PorPasos` con el paso a la vista, el formulario escondido que publica y la hoja «¿Dónde es?».
- `src/app/nuevo/evento/PasosEvento.tsx` — los pasos chicos: `PasoInicio`, `PasoNombre`, `PasoDia`, `PasoHora`, `PasoCuanto`, `PasoMas`.
- `src/app/nuevo/evento/Revisa.tsx` — «Revisa» y su renglón `Dato`.
- `src/app/nuevo/evento/pasos.ts` — la regla, sin DOM: respuestas, qué falta, adónde lleva cada gesto (reductor), avance, días y horas sugeridos, fines.
- `src/app/nuevo/evento/usePasosEvento.ts` — el hook del estado del flujo (`useReducer` sobre `pasos.ts`).
- `src/app/nuevo/evento/AltaEvento.module.css` — lo propio de estos pasos (recuadro del cartel, chips de respuesta, opciones, título de «Revisa», renglón tocable entero).
- `src/app/nuevo/evento/pasos.test.ts` (21 unitarias) y `AltaEvento.componentes.test.mjs` (8 de componentes).
- Extraído del alta de siempre para compartirlo, sin cambiar su comportamiento: `src/app/eventos/CamposSitio.tsx` (los 13 campos escondidos de «Dónde»), `src/app/eventos/useEstoyAqui.ts` («Estoy aquí» de la hoja, con la vigencia de gestos del cartel como opción) y `valorDelSitio` en `direccionEvento.ts` (lo que dice «Dónde» resuelto).

Cambios en piezas compartidas:

- `ui/Barra`: tercera forma, `paso` (`{ salida, avance }` + `titulo`): la salida a la izquierda (la ✕ del primer paso o Atrás), el título al centro y la línea de avance dibujada con `::before` (riel) y `::after` (lo recorrido, `scaleX(var(--avance))`, 200 ms con `--curva`), sin nodos de más.
- `ui/Boton`: variante `quieto` (enlace subrayado en gris, del alto de un toque): «Dura varios días», «Agregar artistas, descripción o enlace».
- `ui/FormularioCanon`: el icono y la ✕ del campo se centran en el renglón del campo (`calc(var(--toque) / 2)`), no a la mitad de la etiqueta. **Defecto anterior**, visible en las tres altas de siempre: cerca del tope aparece el contador («120/120») bajo el campo, la etiqueta crece y la lupa y la ✕ bajaban. Lo encontré al medir el nombre al tope; entra en la pieza porque toca su entregable (regla del gestor del 2026-09-24).
- `globals.css`: dos tokens, `--alto-avance` (3 px) y `--alto-subir-cartel` (200 px), para no sumar medidas en duro.
- `FormularioEvento.tsx`: solo usa lo extraído (−45 líneas, mismo DOM).

## Cómo funciona

- **Pasos sin cartel:** inicio («Sube el cartel» + «No tengo cartel») → ¿Cómo se llama? → ¿Qué día es? → ¿A qué hora? → ¿Dónde es? → ¿Cuánto cuesta? → Revisa → Publicar.
- **Los pasos salen de lo que falta** (`faltan` en `pasos.ts`): «Siguiente» o una respuesta llevan a lo primero que falte, y sin nada pendiente, a «Revisa». Lo contestado no se vuelve a preguntar.
- **Atrás** quita el último paso de una pila que vive en el estado de la pantalla: vuelve con lo contestado intacto. **No hay entradas en el historial** (en Safari del iPhone el atrás del navegador sale al documento anterior; filtrar no es navegar). En la app de iPhone el gesto de deslizar hace lo mismo que el Atrás del paso (`registrarVolverVisible`); en el primer paso, lo de la ✕.
- **La ✕** es `ui/Cerrar` (useVolver): pasa por «¿Salir sin publicar?», que compara el formulario escondido con cómo se abrió (sin cambios, sale sin preguntar), y `beforeunload` avisa al recargar o cerrar con cambios.
- **Desde «Revisa»** un renglón abre solo su pregunta y, al contestarla, se vuelve a «Revisa» (por la izquierda); Atrás desde ahí también vuelve sin cambiar nada, y Atrás desde «Revisa» sigue el camino de ida («¿Cuánto cuesta?»). «Cuándo» abre el día y después la hora (contestar el día vuelve a pedir la hora, como en el prototipo); si solo falta la hora, abre la hora.
- **Publicar** usa `crearEvento` tal cual, con los mismos campos que el alta de siempre (`titulo`, `inicio`, `fin`, los 13 de «Dónde», `gratis`, `cooperacion`, `precio`, `quien`, `descripcion`, `enlace`, `imagen`) y la clave de operación (`operacionEvento`: un reintento con los mismos datos no publica dos veces). Aparta la guardia; si el servidor contesta con error, la repone y el error sale en «Revisa»: junto a su renglón (`renglon.nota` con `role="alert"`), bajo el enlace quieto los de descripción y enlace, y el general encima del botón. Si sale bien, la acción redirige a la ficha, como hoy. Mientras contesta, el botón dice «Publicando…» y se apaga.
- **Transición:** el contenido del paso (la pregunta y sus controles; la barra y el pie no) entra por la derecha al avanzar y por la izquierda al volver, 200 ms con `--curva`, sin retener toques. Dentro de `@media (prefers-reduced-motion: no-preference)`: con «reducir movimiento» no hay ninguna (comprobado). «Termina» aparece cayendo en su sitio con la misma regla.
- **Foco:** al cambiar de paso, el campo que trae `autoFocus` (nombre, precio) o, si no hay, la pregunta del paso (o el título de la barra en el inicio), también tras Atrás. El pie lleva `aria-live="polite"`: «Falta el nombre» → «Siguiente» se anuncia. Los renglones sin etiqueta conservan la clave para el lector («Cuándo», en `small` fuera de la vista) y su botón se llama «Cambiar cuándo». Los chips de día dicen la fecha al lector («Este viernes, viernes 9 de octubre»).
- **Teclado:** el pie es `position: sticky; bottom: 0` y, con el teclado abierto, `PiePaso` le pone `bottom` = lo que el teclado tapa de la ventana de maquetación (`useAreaVisible`, como `ui/Hoja` y `ui/CampoLargo`). Intro en el nombre y en el precio hace lo mismo que el botón (`enterKeyHint="next"`).
- **Fechas en la zona del evento:** «Este viernes» y «Este sábado» se cuentan desde hoy en la zona del lugar elegido (o la de la ciudad inicial, si todavía no hay lugar o es otro sitio). Los fines +1/+2/+3 h se suman con `sumarHoras` en esa zona (lo que pasa de medianoche cae al día siguiente); «Otra hora» y «Sin hora de fin» siguen `conHoraFin` de `lib/cuandoEvento.ts`. Las horas sugeridas son una constante con su medición citada (`HORAS_SUGERIDAS`, 274 eventos, 2026-10-05, bitácora 323).

## Maquetación

`main` es una **columna flexible** con sus hijos directos y no la rejilla de `ui/Plantilla.pagina`: el pie tiene que ir al fondo de la pantalla aunque el paso sea corto (`margin-top: auto`), y una rejilla de filas automáticas no lo hace sin una fila de relleno o un contenedor de más. Lo del paso lleva `margin: 0 var(--gutter)` y `width: auto` (un `ui/Boton` de todo el ancho pide `width: 100%`, que en una columna flexible se sumaba al aire y se salía: lo vi en la primera captura y quedó corregido); el aire entre piezas es el `gap` de la columna, así que los márgenes de abajo que traen las piezas del canon para un formulario apilado (`renglon.renglones`, `canon.campo`) aquí se anulan. Lo que se abre encima (un diálogo fijo: el texto largo, «¿Dónde es?») queda fuera de esa regla. `overflow-x: clip` evita que lo que entra de lado abra un desplazamiento a lo ancho sin volver la columna un contenedor de desplazamiento (la barra y el pie siguen pegados). Rejillas con áreas donde hay rejilla (`ui/Opcion`, `ui/Renglon`); ningún `div` que solo envuelva; ningún color, z-index, margen negativo, `100vw` ni píxel nuevo fuera de los tokens.

### Niveles del DOM bajo `main`, por paso (medidos en la app compilada)

Hijos directos de `main` y el camino más hondo de contenido (sin contar el `path` de los iconos):

| Paso | Hijos de `main` | Lo más hondo |
| --- | --- | --- |
| Inicio | `header`, `a` (recuadro), `button`, `form` (oculto) | `a > span > svg` (3) |
| Nombre | `header`, `h2`, `label`, `footer`, `form` | `label > input` (2); `footer > button` (2) |
| Día | `header`, `h2`, `div[group]`, `button` (quieto), `form` | `div > button > span` (3: el texto para el lector) |
| Hora | `header`, `h2`, `div[group]`, `div[group]`, `form` | `div > button` (2) |
| Dónde | `header`, `div[dialog]` (la hoja de siempre), `form` | dentro de `HojaDonde`, como hoy (6 con su mapa) |
| Cuánto | `header`, `h2`, `div[group]`, `form` | `div > button > b` (3) |
| Precio | `header`, `h2`, `label`, `footer`, `form` | `label > input` (2) |
| Revisa | `header`, `h2`, `ul`, `button` (quieto), `footer`, `form` | `ul > li > button` (3) |
| Lo opcional | `header`, `h2`, `div` (Quién), `div` (Descripción), `div` (Enlace), `footer`, `form` | lo de `SelectorQuien` y `Campo`, sin cambios |

En el prototipo la barra, la línea de avance y el pie son hermanos de `main` dentro de `.app`, y el avance es `div > i` (dos nodos); aquí van dentro de `main` (la guardia mira un solo `main`) y el avance son dos pseudoelementos (cero nodos). Lo de dentro de cada paso tiene la misma profundidad que el prototipo (`div.campo > input` contra `label > input`; `div.fila-chips > button` contra `div > button`; `div.grupo > button.renglon > …` contra `ul > li > …`) o uno menos (`div.opciones > button.opcion > span > small` contra `div > button > small`). `npm run medir` en la ruta: **14 nodos y 6 de profundidad** a 320 y 390, **48 y 6** a 820 y 1280 (con la barra de la app y el carril).

## Decisiones del operador (no están en el acta ni en el prototipo; las más cercanas a él)

1. La ruta `/nuevo/evento`.
2. La salida de la barra va **a la izquierda en un botón plano** (✕ en el primer paso, chevron en los demás), como el prototipo; el alta de siempre la lleva a la derecha con contorno. Título «Publicar» en los pasos y «Revisa» en «Revisa», como el prototipo.
3. El inicio no lleva pregunta a la vista (el prototipo no la tiene): al volver a él, el foco va al título de la barra.
4. «Este viernes» y «Este sábado» son **el próximo, hoy incluido**: un viernes, «Este viernes» es hoy; un sábado, «Este viernes» es el de la semana que viene. El lector oye la fecha.
5. **Contestar el día vuelve a pedir la hora** (el prototipo lo hace; un fin de un día no vale para tres). Atrás no pierde nada; volver a contestar el día, sí la hora.
6. En un evento de varios días, el fin a +1/+2/+3 h es en el **último día**; «Otra hora» de fin ofrece solo horas posteriores al inicio si es un solo día (como `SelectorCuando`), y la hoja no repite «Sin hora de fin» (ya es un chip).
7. Una hora de inicio elegida en «Otra hora» sale como chip activo después de «Otra hora» (como el prototipo).
8. En «Revisa», **Cuándo dice lo que dice la app** (`formatearCuando`, 24 h: «vie 9 de oct · 19:00–21:00», con «→» y el día cuando acaba otro día), no «Este sábado · 19:00 a 21:00» del prototipo; los chips usan el formato de 12 h, como pidió el encargo. Si la hora ya pasó, la nota «Esa hora ya pasó.» (la de `SelectorCuando`), sin bloquear.
9. Precio en «Revisa» con su signo («$150», como lo guarda el servidor); «Cooperación» se ve como «Cooperación solidaria» (el valor que se publica).
10. «Agregar artistas, descripción o enlace» abre un paso propio, **«¿Quieres agregar algo?»** (el nombre es el del doc 51, § 3), con los controles de siempre sin reescribir (`SelectorQuien`, `Campo` de descripción con su texto largo, `Campo` de enlace) y «Listo». En «Revisa» aparece el renglón «Quién» solo si hay artistas (como el prototipo, que lo pinta cuando hay); descripción y enlace no tienen renglón.
11. Quién viene puesto con el artista ligado si la cuenta tiene exactamente uno (como el alta de siempre, decisión 12).
12. El botón apagado es el del canon (`aria-disabled`, violeta al 55 %, como `BotonPublicar`), no el gris del prototipo: se alcanza y el lector lo lee; tocarlo no hace nada.
13. Chips de respuesta de **44 de alto y letra de texto** (el prototipo), subiendo `--alto-chip` en su grupo para que el área de toque siga exacta; el peso de la letra es el del canon (normal; el prototipo los pone en 600).
14. El recuadro «Sube el cartel» con punteado de 2 px (el prototipo usa 1,5; el inventario solo admite 0, 1 y 2 sin token).
15. «Publicando…» mientras el servidor contesta (el alta de siempre dice «Guardando…»).
16. Sin renglón para el nombre en «Revisa» (el prototipo sin cartel no lo toca); un error de título del servidor saldría bajo el título (no se puede provocar: el campo tiene el tope del servidor y no deja seguir vacío).
17. La zona del evento para las fechas: la del lugar elegido; en otro sitio, la de la ciudad inicial (el servidor guarda en la del punto, como siempre).

## Pruebas

- **Unitarias** (`pasos.test.ts`, 21): qué falta y en qué orden; el camino corto pasa por cada pregunta una vez y la línea crece de 0 a 6/7; «Siguiente» salta lo contestado; la hora de inicio no avanza y «Sin hora de fin» contesta; «Tiene precio» sin número sigue faltando; el texto del botón («Falta el día y la hora», sin punto); Atrás sin perder nada; un Atrás tardío de la hoja no hace nada; abrir una pregunta desde «Revisa» y volver (con la pila intacta, aunque la pregunta ya estuviera en el camino de ida: **la primera versión recortaba el camino y Atrás iba a «¿A qué hora?»; la prueba lo encontró**); cambiar «Cuándo» (día y después hora); lo opcional; días sugeridos un lunes, un viernes, un sábado, un domingo y en el cambio de año; fines a +1/+2/+3, cruce de medianoche, varios días, cambio de horario en Madrid; «Otra hora» y «Sin hora de fin» con `conHoraFin`.
- **De componentes** (`AltaEvento.componentes.test.mjs`, 8, ~10 s, con topes de 8 s por espera y 30 s por prueba): recorrido completo hasta que la acción recibe los campos correctos (y un reintento conserva la clave); error general en «Revisa» con la guardia repuesta (hoja y `beforeunload`); error de un dato junto a él y «Publicando…» con la guardia apartada; Atrás conserva lo contestado y en el primer paso no hay Atrás; botón apagado con lo que falta, ✕ del campo, Intro y foco a la pregunta (**la primera versión enfocaba el título de la barra; la prueba lo encontró**); «Tiene precio» solo con dígitos; editar desde «Revisa» (cuánto, cuándo, la hoja de dónde); la ✕ sin cambios sale sin preguntar y con cambios pregunta; transición con y sin «reducir movimiento».
- `npm run lint` (0 errores; 1 aviso que ya estaba en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (**142 archivos, 2062 pruebas**), `npm run test:componentes` (**320 pruebas, 0 fallos, 162 s**, con el Chrome de la Mac), `npm run inventario` (**sin novedades: 343 medidas en duro y 2 bloques duplicados, como lo aceptado**).
- `npm run medir`: la ruta nueva entra en `pantallas-sesion.json` como `s15-alta-evento-pasos` (plantilla «tarea»); su presupuesto, el único que se anotó a mano en `medidas.aceptadas.json`: nodos **[14, 14, 48, 48]**, profundidad **[6, 6, 6, 6]**. Las otras 24 pantallas, sin novedades (incluida `s03-alta-evento`, el alta de siempre, con lo extraído: 48/48/82/82 nodos, igual que antes).

## Capturas (`docs/rediseno/capturas-328/`)

App compilada (`next build && next start`, puerto 3173) contra el respaldo local (8873, con un lugar extra de nombre de 120 caracteres que se inyecta al arrancar, sin tocar el repo), reloj fijo del miércoles 7 de octubre de 2026 a las 10:00 de Ciudad de México, sesión con la cookie del fixture, Chrome de la Mac sin ventana, «reducir movimiento» para que la foto sea del estado quieto, 2× en el teléfono. Bricolage cargada en las 31 (se comprueba en cada una antes de tomarla). Todas abiertas y revisadas.

**390×844** (`390-01` a `390-12`) y **320×640** (`320-01` a `320-12`), comparadas con las del prototipo:

1. `01-inicio` ↔ `legible-1-inicio`: igual: ✕ a la izquierda, «Publicar», el riel gris de la línea de avance en 0, el recuadro punteado violeta de 200 con la cámara en el círculo, «Sube el cartel», la frase, y «No tengo cartel» secundario del mismo ancho. Difiere: punteado de 2 px (decisión 14); sin «Notas de diseño» (son del prototipo). A 320 la frase pasa a dos renglones.
2. `02-nombre-vacio` ↔ `sin-1-fase1-nombre`: igual: Atrás, la línea en 1/7, «¿Cómo se llama?», el campo con lupa enfocado, el pie con la raya y «Falta el nombre». Difiere: el botón apagado es el del canon, violeta tenue (decisión 12), no gris.
3. `03-nombre`: el nombre escrito con su ✕ y «Siguiente» encendido (el prototipo no la trae aparte).
4. `04-dia` ↔ `sin-3-dia`: igual: «Este viernes», «Este sábado», «Otro día» y «Dura varios días» quieto. Difiere: letra de los chips del canon (decisión 13). A 320, «Otro día» baja de renglón.
5. `05-hoja-dias-rango` ↔ `sin-4-hoja-calendario`: la hoja de días de la app (OL-298, ya aceptada en la bitácora 326, distinta de la del prototipo: ✕, flechas de mes, texto de estado) con un rango del 30 de octubre al 2 de noviembre, la banda y «Listo».
6. `06-hora-termina` ↔ `sin-7-hora-termina`: igual: «Empieza» con 7:00 p.m. marcada y, debajo, «Termina» con +1, +2, +3, «Otra hora» y «Sin hora de fin». Difiere: 12 h (encargo).
7. `07-donde` ↔ `sin-9-donde`: aquí va la hoja «¿Dónde es?» de siempre (encargo), con un lugar del directorio en la lista bajo el campo. En local no hay mapa (sin token de Mapbox: «No se pudo cargar el mapa»); el prototipo pinta su propio paso con «Estoy aquí». La confirmación en el mapa es otra pieza.
8. `08-cuanto` ↔ `medias-4-cuanto`: igual: tres opciones grandes con el boleto violeta, título y detalle, y el chevron.
9. `09-precio`: «Tiene precio» abre el campo con el boleto, «150», su ✕ y «Siguiente» (el prototipo no tiene captura de este estado).
10. `10-revisa` ↔ `sin-2-fase1-revisar`: igual: el nombre como título, tres renglones sin etiqueta con icono gris, valor y «Cambiar» violeta, el enlace quieto y «Publicar». Difiere: Cuándo con el texto de la app (decisión 8; en la captura, un rango de cuatro días que pasa a dos renglones), precio con signo.
11. `11-mas`: «¿Quieres agregar algo?» con Quién, Descripción (renglón del texto largo) y Enlace; el prototipo no lo tiene.
12. `12-revisa-error`: un enlace que el servidor rechaza de verdad («Ese enlace no se ve bien. Revisa que empiece con https://»), en rojo bajo el enlace quieto; lo escrito sigue y la guardia vuelve.

**820 y 1280** (`armazon-820-nombre`, `armazon-1280-nombre`): la barra de la app y el carril; la barra del paso bajo la de la app, con la línea de avance de lado a lado de la pantalla; la pregunta, el campo y el botón en la columna de 600 centrada; el pie al fondo con su raya.

**Datos que rompen** (`largo-320-3-nombre`, `largo-320-6-hora-termina`, `largo-320-10-revisa`, `largo-390-10-revisa`, `largo-390-7-donde`): nombre de 120 caracteres (el tope; el contador «120/120» y, ya corregidos, la lupa y la ✕ en su sitio), del 30 de octubre al 2 de noviembre de 11:45 p.m. a 2:45 a.m. (el fin cruza la medianoche: «vie 30 de oct · 23:45 → mar 3 de nov · 02:45», tres renglones a 320), y el lugar de 120 caracteres (siete renglones a 320, cuatro a 390).

**Medido** con `medir.js` (la regla de `npm run medir`) en cada paso, a 320, 375 y 390 con los datos que rompen y a 320 y 390 con los normales: **0 desbordes, 0 desplazamiento horizontal, 0 toques menores de 44 y 0 accionables tapados en todos los pasos propios**; en «Revisa», los tres renglones con el borde derecho a **0 px** del de su lista y ningún valor desbordado (`scrollWidth` ≤ `clientWidth`). Dos hallazgos que **no son de esta pieza** y quedan anotados: (a) la hoja de días (`ui/Calendario`, OL-298) a 320 deja cada día en 38 px de ancho (30 toques menores de 44 en esa medida; a 375 y 390, ninguno); (b) la hoja «¿Dónde es?» sin mapa (en local) da 3 desbordes del lienzo de Mapbox, 3 toques chicos y 1 tapado, todo dentro de los controles de Mapbox.

## Lo que falta para las piezas siguientes

- **Con cartel** (pieza 3): el recuadro de inicio lleva hoy al alta de siempre (`/nuevo?tipo=evento`) — **enlace temporal**; leer → «Revisa» con «Leído del cartel», preguntando solo lo que falte. `faltan` ya decide por lo que haya.
- **«Dónde»** (pieza 4): confirmar en el mapa (sitio fuera del directorio y «Estoy aquí») y las tres opciones del sitio. Hoy el paso es la hoja de siempre.
- **«Publicado»** (pieza 5): hoy la acción redirige a la ficha, como siempre.
- Llevar `/nuevo` a este flujo (el «+») cuando la serie termine; editar entrando por «Revisa».
- Lugar y artista por pasos sobre `PorPasos` (doc 54).
- Pendiente del canon que no se tocó: la lista de `SelectorQuien` va en línea y empuja lo de abajo (es la del alta de siempre, reutilizada sin reescribir); la regla del founder pide que flote bajo su campo.

## Para probar en el iPhone (lo hace el gestor en el simulador y el founder en su teléfono)

1. Abrir `/nuevo/evento` con sesión; sin sesión, pide entrar y vuelve aquí.
2. «No tengo cartel» → ¿sale el teclado solo en «¿Cómo se llama?»? El pie «Siguiente» / «Falta el nombre» queda **justo encima del teclado**, sin hueco ni tapado; al escribir y al borrar con la ✕ no salta.
3. La tecla «siguiente» del teclado avanza igual que el botón.
4. «Tiene precio»: teclado numérico, el pie encima de él; solo entran dígitos.
5. Al cerrar el teclado (bajarlo o tocar fuera), el pie vuelve al fondo; girar el teléfono con el teclado abierto.
6. «Otro día» / «Dura varios días» y «Otra hora»: las hojas sobre la pantalla por pasos; Atrás de Safari con una hoja abierta.
7. «¿Dónde es?» con el mapa real: elegir un lugar de la lista, un sitio por dirección, «Estoy aquí» y «Agregar lugar»; «Listo» avanza a «¿Cuánto cuesta?»; su Atrás vuelve a «¿A qué hora?».
8. Atrás del paso en cada pantalla (lo contestado sigue ahí); en la app de la tienda, el gesto de deslizar desde el borde hace lo mismo; en el primer paso, la ✕.
9. La ✕ con algo escrito pregunta «¿Salir sin publicar?»; el atrás de Safari sale de la pantalla sin preguntar (no hay entradas falsas en el historial; Safari no muestra el aviso de `beforeunload`).
10. La transición de 200 ms al avanzar y al volver; con «Reducir movimiento» encendido, nada se mueve.
11. En «Revisa», tocar en cualquier parte de un renglón abre su pregunta; con VoiceOver, se oye «Cuándo», «Cambiar cuándo» y la pregunta de cada paso al llegar.
12. «¿Quieres agregar algo?»: Quién con sus sugerencias, la descripción a pantalla completa con el teclado, el enlace.
13. Publicar de verdad en la vista previa: lleva a la ficha nueva con «Publicado.»; con un enlace mal escrito, el error sale en «Revisa» y la ✕ vuelve a preguntar.
