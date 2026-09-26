# 245 · Calendario propio con los días sin eventos desactivados (prototipo, OL-216)

**Fecha:** 2026-09-25 · **Rama:** `calendario-dias-con-eventos`, desde `origin/main` (`f6cb4e8`) · **OL:** OL-216 · **Modelo:** Sonnet 5. Sin council, workflows ni subagentes. Solo prototipo, sin código de la app.

## Por qué

Founder: «Para filtro de fecha, podríamos hacer que el calendario muestre desactivadas las fechas que no tiene
eventos. De esa manera evitamos que seleccione algo que no tiene eventos». El selector nativo de iOS
(`<input type="date">`, la rama táctil de `ui/ChipFecha`) no permite desactivar días sueltos, y ya dio dos
regresiones reales:

- **OL-188 (bitácora 222):** usar `hoy` como valor sentinel de "nada elegido" hacía que tocar "hoy" en el selector
  nativo no filtrara nada (el navegador no dispara `change` si se re-elige el mismo valor que ya tenía el campo).
- **OL-204 (bitácora 233):** al arreglar lo anterior (`value=""` siempre), Safari de iPhone puso "hoy" y disparó
  `change` **con solo abrir** el selector, antes de que la persona tocara nada — el filtro quedaba puesto solo por
  abrir, y el selector se cerraba solo.

Las dos veces la causa de fondo es la misma: el `<input type="date">` nativo es una caja negra del sistema
operativo, sin manera de decirle "estos días no se pueden elegir". La hoja propia de escritorio (`ui/SelectorFecha`,
OL-162, bitácora 197) sí es nuestra — puede desactivar cualquier día — y ya se usa en Agenda y Lugares en
escritorio. Founder: «Si, arranca prototipo con calendario asegúrate de hacer estados de fecha: Estado "día
actual", Estado día seleccionado y desactivado (corrígele si necesitamos más)».

## Qué leí

`CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-216 completa en `docs/ops/OPEN_LOOPS.md`,
`src/components/ui/ChipFecha.tsx` (las dos ramas, nativa y de escritorio, y sus comentarios sobre OL-188/OL-204),
`src/components/ui/SelectorFecha.tsx` + `.module.css` (la hoja propia, OL-162), `src/components/ui/Hoja.tsx` +
`.module.css` (el canon de hojas), `src/lib/calendario.ts` (`semanasDelMes`, cómo se calculan `hoy`/`pasado`/
`delMes`), `src/app/globals.css` (todos los tokens), `src/components/ui/Iconos.tsx` (calendario, cerrar, caret),
`src/components/AgendaInicio.tsx` + `src/components/ui/Cabecera.tsx`/`.module.css` + `src/components/NavInferior.tsx`/
`.module.css` + `src/components/Renglon.module.css` (para el fondo de Agenda del prototipo) y las bitácoras
[197](./197-fecha-escritorio.md) (OL-162, por qué existe la hoja propia y sus dos correcciones del gestor),
[222](./222-fecha-hoy-filtra.md) (OL-188) y [233](./233-fecha-nativa-al-cerrar.md) (OL-204).

## Decisión de fondo (qué reemplaza a qué)

`ui/ChipFecha` deja de usar el `<input type="date">` nativo en táctil/móvil; las tres ramas (Agenda, Lugares y
escritorio) abren la misma `ui/SelectorFecha`, con una lista de "qué días tienen eventos" que hoy no existe (la
trae el prototipo inventada; en código real sería una consulta aparte, ligera — solo cuenta por día, no trae los
eventos completos). Esta pieza es **solo el prototipo**: no toca `ChipFecha.tsx` ni `SelectorFecha.tsx` reales.

## Estados del día

El founder pidió tres; el gestor propuso ocho más. Cada uno, con su justificación:

| # | Estado | Quién lo pidió | Justificación |
|---|--------|----------------|----------------|
| 1 | **Disponible (con eventos)** | Founder (el "normal") | El día se puede elegir; número en `--texto`, sin marca. Es el estado por defecto — todos los demás son excepciones sobre este. |
| 2 | **Día actual (hoy)** | Founder | Aro de 1px `--primario` (ya existe en `SelectorFecha.module.css`, `.hoy`): sin él, alguien que abre el calendario un día cualquiera no sabe "dónde está" sin leer el título del mes. |
| 3 | **Seleccionado** | Founder | Fondo `--primario` sólido, texto blanco — el mismo lenguaje que "Voy"/"Sigues" en el resto de la app (acción confirmada). |
| 4 | **Hoy + seleccionado** | Gestor | Si hoy tiene eventos y la persona lo elige, los dos estados coinciden en el mismo día. Ya existe la regla en el código real (`SelectorFecha.module.css`, `.elegido.hoy { box-shadow: none }`): el relleno gana y el aro desaparece — un aro *y* un relleno juntos se ven como un error de repintado, no como una combinación a propósito. Reutilizado tal cual, no inventé nada nuevo. |
| 5 | **Hoy sin eventos** | Gestor | El caso nuevo que el founder no cubrió: hoy no tiene nada agendado. Si se ve igual que "sin eventos" a secas, alguien que conoce la fecha de hoy podría pensar que el calendario está mal (¿por qué hoy no se puede tocar?). Se mantiene el aro (aunque atenuado, ver "Contraste" abajo) para que sí se reconozca como hoy, con el número apagado igual que cualquier desactivado. |
| 6 | **Desactivado · sin eventos** | Founder (el pedido original) | Día futuro sin nada agendado: no se puede elegir, número atenuado, sin mensaje de error (ver "Qué pasa al tocar" abajo). |
| 7 | **Desactivado · pasado** | Gestor (ya existía en el código real, `bloquearPasado`) | Un día que ya pasó tampoco se puede elegir — la Agenda no filtra hacia atrás. **Decisión: mismo estilo visual que "sin eventos", no uno aparte.** Antes de este pedido, "pasado" ya era la única razón para desactivar un día (código real, `SelectorFecha.module.css` `.pasado { opacity: .35 }`); "sin eventos" es una razón nueva pero el resultado que le importa a quien mira la pantalla es el mismo ("no puedo elegir este día"), así que no se gana nada dibujando una tercera opacidad o un patrón distinto — solo una regla más que recordar y mantener. Lo que sí distingue la razón es el nombre accesible (`aria-label`): "ya pasó" contra "sin eventos", útil para quien usa lector de pantalla aunque no cambie nada para quien ve la pantalla. |
| 8 | **Fuera del mes** | Gestor | Días de relleno del mes anterior/siguiente para completar la semana. **Decisión: vacíos (sin número), no tenues-pero-tocables.** Hoy el código real (`SelectorFecha.tsx`) sí los deja tocables (`.fuera` solo cambia opacidad, `elegirDia` no los descarta) — es un descuido, no una decisión: tocar un día de otro mes elegiría esa fecha sin que la rejilla cambiara de mes para mostrarlo bien, y no se sabe si ese día tiene eventos sin haber cargado ya el mes vecino (dato que, con "cargando" de por medio, podría no estar listo). Vacíos evita las dos cosas a la vez y es más simple. Es un cambio de comportamiento respecto al componente real actual — lo dejo anotado para que el gestor lo decida al pasar esto a código, no lo aplico yo aquí (esta pieza es solo prototipo). |
| 9 | **Presionado (al tocar)** | Gestor | `opacity: .6` al soltar — la regla global de toda la app (`globals.css`, `button:active:not(:disabled)`), no algo nuevo para este componente. Lo dibujo en la leyenda para que quede firmado junto con los demás, pero no hace falta inventar ni un color ni una transición aparte. |
| 10 | **Foco de teclado** | Gestor | Contorno 2px `--primario`, solo con teclado (`:focus-visible`, global y ya repetido en `SelectorFecha.module.css`). Sigue importando: esta hoja se sigue usando en escritorio (OL-162), donde el teclado es el modo normal de navegar. |
| 11 | **Cargando** | Gestor | Mientras no se sabe qué días tienen eventos (la consulta nueva que esto necesita). Rejilla del mismo tamaño (5 semanas × 7) con círculos que laten (`@keyframes latido`, ya usado en `Chip.module.css` y `Pestanas.module.css` para "en camino" — reutilizado, no inventado), nada tocable y las flechas de mes también desactivadas. Mismo tamaño exacto que la rejilla real: al llegar los datos no hay salto ni parpadeo, solo cambian los círculos por números. |

**¿Sobra alguno?** Uno: **"pasado" no necesita ser un estado visual aparte** de "sin eventos" — ver el punto 7. No
quito el estado (el founder pidió verlo, y hay una razón real detrás), pero si el gestor pregunta "¿cuántos
estilos hay que mantener en el CSS de verdad?", la respuesta es diez visuales, no once (pasado y sin-eventos
comparten uno). Los otros diez los dejo todos: "presionado" y "foco de teclado" no son estilos nuevos (ya existen
en la app), pero vale la pena firmarlos junto con los demás porque son parte de cómo se va a ver y sentir la hoja
completa.

## Qué pasa al tocar un día desactivado

**Nada — sin mensaje de error, sin pista.** Coherente con cómo ya se comportan los demás controles deshabilitados
de la app (`.chip:disabled`, `.listo:disabled`, el propio `.pasado` de `SelectorFecha` hoy): un botón sin
`opacity`/`cursor` de acción y sin manejador de toque no necesita explicarse aparte. Agregar un mensaje ("Este día
no tiene eventos") sería el patrón contrario al que ya eligió el founder en otras piezas (memoria: menos texto de
ayuda, el sistema hace el trabajo en vez de explicarlo) y un componente nuevo solo para este caso. Los botones
desactivados llevan `aria-disabled="true"` (no el atributo `disabled` nativo: se mantiene alcanzable con el
teclado, igual que hace hoy `SelectorFecha` con los días pasados) y el `onclick` los ignora explícitamente.

## Accesibilidad

- **Nombre accesible por día:** `"{día de la semana} {número} de {mes}[, hoy][, ya pasó | sin eventos | N evento(s)]"`.
  Ejemplos reales del prototipo: `"viernes 25 de septiembre, hoy, 3 eventos"`, `"sábado 26 de septiembre, sin
  eventos"`, `"miércoles 23 de septiembre, ya pasó"`, `"domingo 27 de septiembre, 2 eventos"`. Confirmado leyendo
  `getAttribute("aria-label")` contra el DOM real (no solo mirado): los tres primeros ejemplos de arriba son la
  salida real del script de captura.
- **`aria-disabled="true"`** en todo día desactivado (pasado o sin eventos); `aria-hidden="true"` y sin rol en los
  días fuera del mes (no son información, no deben anunciarse). `aria-selected` en cada celda con rol `gridcell`,
  `aria-current="date"` en hoy. Mientras carga, un texto vivo (`role="status" aria-live="polite"`, oculto
  visualmente) anuncia "Cargando los días con eventos…" una sola vez.
- **Contraste medido (WCAG, fórmula de luminancia relativa; ver cálculo exacto en el histórico de este chat):**
  - Disponible (`--texto` `#1a1a1a` sobre `--fondo` blanco): **17.40:1**.
  - Desactivado (`--texto-suave` `#5c5c5c` con `opacity: .35`, mismo patrón que ya usa hoy `.pasado` en el código
    real — no lo inventé): color efectivo ≈ `#c6c6c6` sobre blanco, **1.71:1**.
  - La diferencia (17.40 contra 1.71, ~10×) hace que los dos estados se distingan de inmediato a simple vista. El
    contraste absoluto del desactivado es bajo, pero WCAG 1.4.3 exime explícitamente a los componentes de interfaz
    inactivos del mínimo de contraste (no es texto para leer, es un botón apagado) — mismo criterio que ya aplica
    hoy el `.pasado` real, sin cambios.
  - El aro de "hoy" en el estado "hoy sin eventos" también se atenúa (mismo `opacity: .35` del botón completo, sin
    tratamiento aparte): queda un aro violeta muy claro (`#ccb8ec` aprox. sobre blanco) — se nota que "es hoy" sin
    competir con el desactivado. Decisión simple a propósito: darle una opacidad distinta solo al aro habría sido
    una regla más para un matiz que nadie pidió.

## Prototipo

`docs/rediseno/prototipos/calendario-dias-con-eventos.html` — HTML autocontenido, un teléfono de 390×844 con
Agenda de fondo (aproximada: misma cabecera con chips y pestañas, lista de renglones, nav inferior — no es una
copia pixel a pixel de `AgendaInicio.tsx`, pero usa los mismos tokens de `globals.css`) y la hoja de fecha abierta
encima, con septiembre de 2026 (hoy: viernes 25) y octubre de 2026 con datos inventados de qué días tienen
eventos. Bricolage Grotesque de Google Fonts (misma URL que ya usan los demás prototipos del repo,
`docs/rediseno/prototipos/lugares.html` entre otros).

**El primer pintado no depende de JavaScript:** los dos meses están escritos en HTML plano (no generados por un
`render()` de JavaScript, a diferencia de otros prototipos más viejos del repo); JavaScript solo agrega
interacción (abrir/cerrar la hoja, cambiar de mes, elegir un día, Listo, Quitar fecha) sobre ese HTML ya completo.
Comprobado con una captura real con `javaScriptEnabled: false` (ver Evidencia): se ve exactamente igual que con
JavaScript activo.

**Navegación de mes:** "mes anterior" desactivado en septiembre (el mes actual — no se puede ir a agosto);
"mes siguiente" desactivado en octubre (el último mes con datos inventados — "hasta donde haya datos", como pide
el encargo; en código real dependería de hasta dónde llegara la consulta).

**Cierre de la hoja al elegir:** tocar un día disponible lo marca seleccionado y habilita "Listo"; tocar "Listo"
aplica la fecha (el chip de Agenda pasa de solo-ícono a la pastilla "dom 27 sep ✕") y cierra la hoja — igual que
hoy.

**"Quitar fecha":** el chip ya tenía su ✕ (fuera de la hoja, cuando ya hay fecha elegida) — pero para volver a
"sin filtro" había que primero cerrar la hoja (con "Listo" o la ✕) y luego tocar el ✕ del chip aparte. Se agregó
un enlace de texto "Quitar fecha" **dentro** de la hoja (bajo "Listo", solo visible cuando hay un día elegido) que
limpia la selección y cierra en un solo toque — mismo efecto que el ✕ del chip, alcanzable sin salir primero.

## Evidencia

Capturas reales con Chrome (`/Applications/Google Chrome.app`) vía `playwright-core` 1.63.0 (ya instalado en el
scratchpad de otra sesión de este mismo árbol de trabajo; copiado a una carpeta propia, `ol216/`, para no
interferir con esa sesión), 390×844 (el teléfono; `#telefono`, no el viewport completo). Todas en
`docs/rediseno/capturas-245/`, abiertas y miradas una por una:

1. **`245-01-hoja-sin-fecha.png`** — estado inicial (el primer pintado): hoja abierta, septiembre de 2026, sin
   ningún día elegido, "Listo" deshabilitado, "mes anterior" deshabilitado, 21-24 y 26/28/30 atenuados (pasado y
   sin eventos), 25 con el aro de hoy, 27 y 29 disponibles.
2. **`245-02-dia-elegido-en-hoja.png`** — domingo 27 tocado: círculo violeta, "Quitar fecha" visible, "Listo"
   habilitado.
   **`245-02b-chip-tras-elegir.png`** — tras tocar "Listo": la hoja se cerró, el chip de Agenda ahora dice
   "dom 27 sep ✕", Agenda vuelve a verse completa (sin el fondo oscurecido).
3. **`245-03-hoy-elegido.png`** — viernes 25 (hoy) elegido: relleno violeta sin el aro (`.elegido.hoy`, punto 4
   de la tabla de estados).
4. **`245-04-mes-siguiente.png`** — octubre de 2026: "mes anterior" ya habilitado, "mes siguiente" deshabilitado
   (último mes con datos); días 1, 4, 6, 9, 12, 15, 18, 20, 23, 26, 29 disponibles, el resto atenuado.
5. **`245-05-cargando.png`** — rejilla de círculos latiendo, las dos flechas de mes deshabilitadas, "Listo"
   deshabilitado. Comprobado además contra el DOM (no solo mirado): tocar una celda del esqueleto durante la
   carga no cambia nada ("Listo" sigue deshabilitado antes y después del toque).
6. **`245-06-leyenda-estados.png`** — los once estados de la tabla de arriba, cada uno en su propia tarjeta con
   nombre y una línea de porqué.
7. **`245-07-sin-javascript.png`** — mismo estado que la 1, con `javaScriptEnabled: false`: idéntica a simple
   vista, confirma que el primer pintado no necesita JavaScript.

Bricolage Grotesque cargada: `document.fonts.check('16px "Bricolage Grotesque"')` (esperado antes de la primera
captura, con reintento silencioso si tardara).

### Un bug real, encontrado y corregido en el camino

La primera vuelta de capturas (`245-01`) salió con **los dos chips de fecha visibles a la vez** (el ícono solo y
la pastilla "vie 25 sep ✕"), en vez de solo el ícono. Causa: `#chipConFecha` llevaba el atributo `hidden` *y* la
clase `.chip` (que fija `display: flex`) — por especificidad, una regla del autor (`.chip { display: flex }`)
gana siempre sobre la regla del navegador para `[hidden]` (`display: none`), sin importar el orden ni la
especificidad exacta, porque el origen "autor, normal" pesa más que "user-agent, normal" en la cascada. Confirmado
contra el DOM (`getComputedStyle(...).display` daba `"flex"` con `.hidden === true`). Arreglado con una regla
`[hidden] { display: none !important; }` al principio de la hoja de estilos, y vuelto a capturar todo. Queda
anotado por si el mismo patrón (una clase con `display` sobre un elemento que también se oculta con `hidden`)
aparece en código real algún día.

## Correos

`git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` → solo `@keyframes`, `@media` (CSS, no
correos) y `wght@12..96` (la URL de Google Fonts, el mismo falso positivo ya anotado en la bitácora 197). Ningún
correo real en el prototipo ni en las capturas (son solo el calendario y datos de eventos inventados, sin nombres
de persona).

## Alcance y límites

- **Solo prototipo.** No se tocó `src/components/ui/ChipFecha.tsx`, `SelectorFecha.tsx` ni ningún archivo de
  `src/`. Pasar esto a código es trabajo aparte (y necesita, además, la consulta nueva de "qué días tienen
  eventos" que hoy no existe).
- El fondo de Agenda es una aproximación fiel a los tokens (mismos colores, tipografía, espaciados) pero no una
  copia exacta de `AgendaInicio.tsx` — los eventos, nombres y conteos son inventados.
- El estado "cargando" se alcanza en el prototipo con un botón de utilería fuera del teléfono (claramente
  marcado "no es parte del diseño"): en la app real duraría poco y no hace falta un control para verlo, pero el
  prototipo sí lo necesita para poder capturarlo.
- No se implementó la navegación de flechas del teclado entre días (`roving tabindex`) que sí tiene el
  `SelectorFecha` real de hoy — cada botón del prototipo es alcanzable con Tab de forma independiente. Es una
  diferencia de implementación, no de diseño: el estado visual "foco de teclado" que pide el encargo está en la
  leyenda y funciona igual (`:focus-visible`), y el comportamiento de navegación se define cuando esto pase a
  código.
- "Fuera del mes" pasa de tocable (como hoy en el `SelectorFecha` real) a vacío e intocable — un cambio de
  comportamiento respecto al componente real actual que dejo señalado (punto 8 de la tabla) para que el gestor lo
  decida, no lo resuelvo yo aquí.
- Sin `npm run lint`/`typecheck`/`test`/`build`: no hay código de la app en esta pieza, solo un archivo HTML
  autocontenido.

Rama `calendario-dias-con-eventos`; a revisión del gestor. Commit local al cerrar, push y PR abiertos (sin unir),
como pide el encargo.
