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

El founder pidió tres; el gestor propuso ocho más; en la revisión del 2026-09-25 el founder pidió un doceavo
("toca para quitar") y decidió el contraste del desactivado y el destino de "fuera del mes" (antes propuestas
abiertas, ahora cerradas — ver "Decisiones del founder" más abajo). Los doce, con su justificación:

| # | Estado | Quién lo pidió | Justificación |
|---|--------|----------------|----------------|
| 1 | **Disponible (con eventos)** | Founder (el "normal") | El día se puede elegir; número en `--texto`, sin marca. Es el estado por defecto — todos los demás son excepciones sobre este. |
| 2 | **Día actual (hoy)** | Founder | Aro de 1px `--primario` (ya existe en `SelectorFecha.module.css`, `.hoy`): sin él, alguien que abre el calendario un día cualquiera no sabe "dónde está" sin leer el título del mes. |
| 3 | **Seleccionado** | Founder | Fondo `--primario` sólido, texto blanco — el mismo lenguaje que "Voy"/"Sigues" en el resto de la app (acción confirmada). |
| 4 | **Seleccionado · toca para quitar** | Founder (revisión del 2026-09-25) | Reemplaza al enlace "Quitar fecha" que no le gustó al founder: tocar el día YA elegido lo quita, filtra vacío y cierra — el mismo gesto que elegirlo, en sentido contrario. Mismo aspecto que "Seleccionado" (sin marca nueva encima): solo cambia el nombre accesible, que agrega ", toca para quitar". Detalle completo, la palabra exacta del founder y por qué no lleva una pista visual aparte, en "Decisiones del founder" más abajo. |
| 5 | **Hoy + seleccionado** | Gestor | Si hoy tiene eventos y la persona lo elige, los dos estados coinciden en el mismo día. Ya existe la regla en el código real (`SelectorFecha.module.css`, `.elegido.hoy { box-shadow: none }`): el relleno gana y el aro desaparece — un aro *y* un relleno juntos se ven como un error de repintado, no como una combinación a propósito. Reutilizado tal cual, no inventé nada nuevo. También se quita al tocarlo otra vez (mismo mecanismo del punto 4). |
| 6 | **Hoy sin eventos** | Gestor | El caso nuevo que el founder no cubrió: hoy no tiene nada agendado. Si se ve igual que "sin eventos" a secas, alguien que conoce la fecha de hoy podría pensar que el calendario está mal (¿por qué hoy no se puede tocar?). Se mantiene el aro (aunque atenuado, ver "Contraste" abajo) para que sí se reconozca como hoy, con el número apagado igual que cualquier desactivado. |
| 7 | **Desactivado · sin eventos** | Founder (el pedido original) | Día futuro sin nada agendado: no se puede elegir, número atenuado, sin mensaje de error (ver "Qué pasa al tocar" abajo). Contraste decidido por el founder tras ver las dos variantes en la leyenda: **0.65 (~2.99:1 ≈ 3:1)**, no el 0.35 (~1.71:1) que se mostró primero. |
| 8 | **Desactivado · pasado** | Gestor (ya existía en el código real, `bloquearPasado`) | Un día que ya pasó tampoco se puede elegir — la Agenda no filtra hacia atrás. **Decisión: mismo estilo visual que "sin eventos", no uno aparte.** Antes de este pedido, "pasado" ya era la única razón para desactivar un día (código real, `SelectorFecha.module.css` `.pasado { opacity: .35 }`, hoy 0.65 en este prototipo); "sin eventos" es una razón nueva pero el resultado que le importa a quien mira la pantalla es el mismo ("no puedo elegir este día"), así que no se gana nada dibujando una tercera opacidad o un patrón distinto — solo una regla más que recordar y mantener. Lo que sí distingue la razón es el nombre accesible (`aria-label`): "ya pasó" contra "sin eventos", útil para quien usa lector de pantalla aunque no cambie nada para quien ve la pantalla. |
| 9 | **Fuera del mes** | Gestor, decidido por el founder | Días de relleno del mes anterior/siguiente para completar la semana. **Decidido: vacíos e intocables** (no tenues-pero-tocables como hoy el `SelectorFecha.tsx` real, donde `.fuera` solo cambia opacidad y `elegirDia` no los descarta — un descuido, no una decisión anterior: tocar un día de otro mes elegiría esa fecha sin que la rejilla cambiara de mes para mostrarlo bien, y no se sabe si ese día tiene eventos sin haber cargado ya el mes vecino). El founder confirmó esta propuesta en la revisión del 2026-09-25: queda cerrado, ya no es una propuesta a discutir cuando esto pase a código. |
| 10 | **Presionado (al tocar)** | Gestor | `opacity: .6` al soltar — la regla global de toda la app (`globals.css`, `button:active:not(:disabled)`), no algo nuevo para este componente. Lo dibujo en la leyenda para que quede firmado junto con los demás, pero no hace falta inventar ni un color ni una transición aparte. |
| 11 | **Foco de teclado** | Gestor | Contorno 2px `--primario`, solo con teclado (`:focus-visible`, global y ya repetido en `SelectorFecha.module.css`). Sigue importando: esta hoja se sigue usando en escritorio (OL-162), donde el teclado es el modo normal de navegar. |
| 12 | **Cargando** | Gestor | Mientras no se sabe qué días tienen eventos (la consulta nueva que esto necesita). Rejilla del mismo tamaño (5 semanas × 7) con círculos que laten (`@keyframes latido`, ya usado en `Chip.module.css` y `Pestanas.module.css` para "en camino" — reutilizado, no inventado), nada tocable y las flechas de mes también desactivadas. Mismo tamaño exacto que la rejilla real: al llegar los datos no hay salto ni parpadeo, solo cambian los círculos por números. |

**¿Sobra alguno?** Uno: **"pasado" no necesita ser un estado visual aparte** de "sin eventos" — ver el punto 8, y
**"seleccionado · toca para quitar" no necesita un estado visual aparte** de "seleccionado" — ver el punto 4: los
dos casos comparten exactamente la misma regla CSS con otro caso más (`.dia.desactivado` cubre "sin eventos" y
"pasado"; `.dia.elegido` cubre "seleccionado" simple y el que se puede quitar). No quito ningún estado de la
leyenda (el founder pidió verlos todos, y cada uno tiene una razón real detrás para EXISTIR como concepto), pero
si el gestor pregunta "¿cuántos estilos hay que mantener en el CSS de verdad?", la respuesta es diez visuales, no
doce. "Presionado" y "foco de teclado" tampoco son estilos nuevos (ya existen en la app), pero vale la pena
firmarlos junto con los demás porque son parte de cómo se va a ver y sentir la hoja completa.

## Decisiones del founder (revisión, 2026-09-25)

El gestor trajo cuatro decisiones del founder tras ver el prototipo y su leyenda:

1. **Contraste del desactivado: 0.65 (~2.99:1 ≈ 3:1), no 0.35 (~1.71:1).** La leyenda mostraba las dos variantes
   ("tenue actual" y "más legible") lado a lado para que el founder eligiera; ganó la más legible. Aplicado a
   `.dia.desactivado` en el prototipo — ya no hay dos variantes en la leyenda, solo la elegida. Ver "Accesibilidad"
   para el número final.
2. **Tocar un día disponible lo elige, filtra y cierra la hoja — sin botón "Listo".** Se quitó el botón "Listo" y
   toda la fila de acciones al fondo de la hoja: el toque en un día ya es la confirmación, no hace falta un
   segundo toque aparte para "aceptar" lo que se acaba de tocar.
3. **Se quita "Quitar fecha"; tocar el día ya elegido lo deselecciona.** Palabras del founder: «De acuerdo con tus
   recomendaciones de calendario, en el prototipo pones "Quitar fecha", no me gusta, activa que se vuelva a
   seleccionar el día y con eso se desactive». Implementado: tocar el mismo día que ya está marcado (`.elegido`)
   lo quita, quita el filtro y cierra la hoja — mismo mecanismo que elegir, en reversa. **Sin pista visual nueva**
   sobre el día seleccionado: decidí no dibujar un ícono ni un subrayado que diga "toca para quitar" porque la app
   ya tiene el mismo patrón sin ninguna pista (el chip "Cerca de mí" de Lugares, cualquier pestaña activa: tocar
   lo que ya está activo lo desactiva, y nadie le puso una marca aparte). Agregar una sí aquí habría sido
   inconsistente con esos otros controles y más texto/ícono del que pide "menos ayuda visible, que el sistema ya
   se explique solo" (memoria del founder sobre UX invisible). Lo que SÍ cambia es el nombre accesible (de
   `"domingo 27 de septiembre, 2 eventos"` a `"domingo 27 de septiembre, 2 eventos, toca para quitar"`): quien no
   ve la pantalla no tiene el aspecto violeta como pista, así que ahí sí hace falta decirlo con palabras.
   **La ✕ del chip de fecha (fuera de la hoja, cuando ya hay una fecha aplicada) se queda exactamente como
   estaba** — quita directo, sin abrir la hoja.
   - **Decisión propia, para que el gestor la confirme:** con "Listo" fuera, la única manera de volver a ver un
     día ya elegido DENTRO de la hoja (para poder tocarlo y quitarlo) es reabriéndola. La pastilla de fecha
     (fuera de la hoja) antes no hacía nada al tocarla — solo su ✕ actuaba. Hice que el resto de la pastilla (el
     ícono y el texto, no la ✕) reabra la hoja con ese día ya marcado, en su mes. Es una pieza que el pedido del
     founder necesita para tener sentido (si no, "tocar otra vez el día ya seleccionado" nunca sería alcanzable
     una vez cerrada la hoja), pero el founder no la pidió con esas palabras exactas — la infiero de lo que hace
     falta para que el punto 3 funcione. Señalado aquí para que el gestor la confirme o la ajuste, igual que hice
     con "fuera del mes" en la entrega anterior.
4. **Días de otros meses: vacíos e intocables.** Confirma la propuesta que ya traía el prototipo (punto 9 de la
   tabla de estados) — ya no queda abierta.

## Qué pasa al tocar un día desactivado

**Nada — sin mensaje de error, sin pista.** Coherente con cómo ya se comportan los demás controles deshabilitados
de la app (`.chip:disabled`, `.listo:disabled`, el propio `.pasado` de `SelectorFecha` hoy): un botón sin
`opacity`/`cursor` de acción y sin manejador de toque no necesita explicarse aparte. Agregar un mensaje ("Este día
no tiene eventos") sería el patrón contrario al que ya eligió el founder en otras piezas (memoria: menos texto de
ayuda, el sistema hace el trabajo en vez de explicarlo) y un componente nuevo solo para este caso. Los botones
desactivados llevan `aria-disabled="true"` (no el atributo `disabled` nativo: se mantiene alcanzable con el
teclado, igual que hace hoy `SelectorFecha` con los días pasados) y el `onclick` los ignora explícitamente.

## Accesibilidad

- **Nombre accesible por día:** `"{día de la semana} {número} de {mes}[, hoy][, ya pasó | sin eventos | N evento(s)][, toca para quitar]"`.
  Ejemplos reales del prototipo (confirmados leyendo `getAttribute("aria-label")` contra el DOM real, no solo
  mirado): `"viernes 25 de septiembre, hoy, 3 eventos"`, `"sábado 26 de septiembre, sin eventos"`, `"miércoles 23
  de septiembre, ya pasó"`, `"domingo 27 de septiembre, 2 eventos"` — y, ya elegido, ese mismo día pasa a
  `"domingo 27 de septiembre, 2 eventos, toca para quitar"`; al quitarlo, vuelve exacto al texto original (probado:
  no se acumula el sufijo, y no le falta nada).
- **`aria-disabled="true"`** en todo día desactivado (pasado o sin eventos); `aria-hidden="true"` y sin rol en los
  días fuera del mes (no son información, no deben anunciarse). `aria-selected` en cada celda con rol `gridcell`,
  `aria-current="date"` en hoy. Mientras carga, un texto vivo (`role="status" aria-live="polite"`, oculto
  visualmente) anuncia "Cargando los días con eventos…" una sola vez.
- **Contraste medido (WCAG, fórmula de luminancia relativa; ver cálculo exacto en el histórico de este chat) —
  valor final, tras la decisión del founder en la revisión:**
  - Disponible (`--texto` `#1a1a1a` sobre `--fondo` blanco): **17.40:1**.
  - Desactivado (`--texto-suave` `#5c5c5c` con `opacity: .65`): color efectivo ≈ `#959595` sobre blanco,
    **2.99:1 (≈ 3:1)**. La leyenda mostró esta variante junto a la de `opacity: .35` (≈1.71:1, la que ya usaba
    `.pasado` en el código real) para que el founder eligiera; ganó la de 0.65 — ya no queda ninguna variante de
    1.71:1 en el prototipo.
  - La diferencia (17.40 contra 2.99, ~5.8×) hace que los dos estados se distingan de inmediato a simple vista, y
    con mejor lectura del número que antes. WCAG 1.4.3 de cualquier forma exime a los componentes de interfaz
    inactivos del mínimo de contraste (no es texto para leer, es un botón apagado) — el valor más alto no era
    obligatorio, pero el founder lo prefirió y queda mejor.
  - El aro de "hoy" en el estado "hoy sin eventos" también se atenúa (mismo `opacity: .65` del botón completo, sin
    tratamiento aparte): queda un aro violeta claro pero reconocible sobre blanco — se nota que "es hoy" sin
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
interacción (abrir/cerrar la hoja, cambiar de mes, tocar un día para elegirlo/quitarlo, reabrir con la fecha ya
elegida) sobre ese HTML ya completo. Comprobado con una captura real con `javaScriptEnabled: false` (ver
Evidencia): se ve exactamente igual que con JavaScript activo, incluida la leyenda ya corregida.

**Navegación de mes:** "mes anterior" desactivado en septiembre (el mes actual — no se puede ir a agosto);
"mes siguiente" desactivado en octubre (el último mes con datos inventados — "hasta donde haya datos", como pide
el encargo; en código real dependería de hasta dónde llegara la consulta).

**Elegir y quitar, sin "Listo" ni "Quitar fecha" (decisión del founder en la revisión, ver "Decisiones del
founder"):** tocar un día disponible lo marca, aplica el filtro (el chip de Agenda pasa de solo-ícono a la
pastilla "dom 27 sep ✕") y cierra la hoja — todo en un solo toque. Tocar el MISMO día ya elegido lo quita, quita
el filtro y cierra igual. En los dos casos hay una pausa breve (180 ms) entre marcar/desmarcar el círculo y
cerrarse: sin ella la hoja desaparecería tan rápido que no se alcanza a ver qué pasó con el toque; con ella se ve
el círculo pintarse o despintarse un instante antes de que la hoja se vaya (evidencia: capturas 245-02 y 245-04,
tomadas a propósito dentro de esa pausa).

**Reabrir con la fecha ya elegida:** con "Listo" fuera, tocar la pastilla de fecha (el ícono y el texto, no la ✕)
reabre la hoja con ese día ya marcado, en su mes — así se puede tocar otra vez para quitarlo. Es una pieza que
tuve que agregar para que el punto 3 de "Decisiones del founder" tuviera dónde pasar (ver ahí el porqué y la
advertencia de que es una inferencia mía, no una palabra textual del founder). **La ✕ del chip se queda igual que
siempre:** quita directo, sin abrir la hoja.

## Evidencia

Capturas reales con Chrome (`/Applications/Google Chrome.app`) vía `playwright-core` 1.63.0 (ya instalado en el
scratchpad de otra sesión de este mismo árbol de trabajo; copiado a una carpeta propia, `ol216/`, para no
interferir con esa sesión), 390×844 (el teléfono; `#telefono`, no el viewport completo). Todas en
`docs/rediseno/capturas-245/`, abiertas y miradas una por una:

1. **`245-01-hoja-sin-fecha.png`** — estado inicial (el primer pintado): hoja abierta, septiembre de 2026, sin
   ningún día elegido, sin ningún botón "Listo" al fondo (ya no existe), "mes anterior" deshabilitado, 1-24 y
   26/28/30 atenuados a ~3:1 (pasado y sin eventos, contraste ya decidido), 25 con el aro de hoy, 27 y 29
   disponibles.
2. **`245-02-dia-elegido-en-hoja.png`** — domingo 27 tocado, captura tomada a los 60 ms (dentro de la pausa de
   180 ms): círculo ya violeta, hoja todavía abierta, sin ningún botón que confirmar.
   **`245-02b-chip-tras-elegir.png`** — pasados los 180 ms: la hoja se cerró sola, el chip de Agenda ahora dice
   "dom 27 sep ✕", Agenda vuelve a verse completa.
3. **`245-03-reabrir-con-fecha-elegida.png`** — tocada la pastilla "dom 27 sep" (no la ✕): la hoja reabre con el
   27 ya marcado violeta, en septiembre — la fecha aplicada sigue viéndose en el chip detrás del fondo oscurecido.
4. **`245-04-toca-para-quitar-en-vuelo.png`** — tocado otra vez el 27 ya elegido, a los 60 ms: el círculo ya
   perdió el relleno (sin marca de "va a quitarse", como se decidió).
   **`245-04b-quitado-chip-vacio.png`** — pasados los 180 ms: la hoja se cerró, el chip volvió a ser solo el
   ícono (sin fecha). Comprobado contra el DOM, no solo mirado: `#chipVacio` deja de estar oculto y el
   `aria-label` del 27 vuelve exacto a `"domingo 27 de septiembre, 2 eventos"` (sin el sufijo ", toca para
   quitar" colgando).
5. **`245-05-hoy-elegido.png`** — viernes 25 (hoy) elegido, a los 60 ms: relleno violeta sin el aro
   (`.elegido.hoy`).
6. **`245-06-mes-siguiente.png`** — octubre de 2026: "mes anterior" ya habilitado, "mes siguiente" deshabilitado
   (último mes con datos); días 1, 4, 6, 9, 12, 15, 18, 20, 23, 26, 29 disponibles, el resto atenuado a ~3:1; la
   semana de fin de septiembre (28, 29, 30) y el 1 de noviembre, vacíos.
7. **`245-07-cargando.png`** — rejilla de círculos latiendo, las dos flechas de mes deshabilitadas. Comprobado
   contra el DOM, no solo mirado: tocar una celda del esqueleto durante la carga no elige nada (`#chipVacio` sigue
   sin estar oculto después del toque).
8. **`245-08-leyenda-estados.png`** — los doce estados de la tabla de arriba, cada uno en su propia tarjeta con
   nombre y una línea de porqué; ya sin la tarjeta "tenue actual" (descartada) y con la nueva "Seleccionado ·
   toca para quitar".
9. **`245-09-sin-javascript.png`** — mismo estado que la 1, con `javaScriptEnabled: false`: idéntica a simple
   vista, confirma que el primer pintado no necesita JavaScript.
10. **`245-10-leyenda-sin-javascript.png`** — la leyenda (punto 8), también con `javaScriptEnabled: false`:
    idéntica a la 8. La corrección de la leyenda y la variante de contraste decidida son CSS/HTML puro (sin
    ningún script que arme o corrija clases), así que tenían que verse igual con JavaScript desactivado —
    comprobado, no solo asumido.

Bricolage Grotesque cargada: `document.fonts.check('16px "Bricolage Grotesque"')` (esperado antes de la primera
captura, con reintento silencioso si tardara).

### Confirmación celda por celda de la leyenda (lo que pidió el gestor)

Tras el arreglo, se leyó `getComputedStyle()` de la muestra de cada una de las doce tarjetas (script de captura,
no solo mirado) — resultado exacto:

| Tarjeta | Clases reales | Lo que se ve |
|---|---|---|
| Disponible | `dia` | fondo transparente, texto `rgb(26,26,26)`, opacity 1 — correcto |
| Día actual (hoy) | `dia hoy` | aro `rgb(109,52,200)` (box-shadow inset), texto normal — correcto |
| Seleccionado | `dia elegido` | **fondo `rgb(109,52,200)`, texto blanco** — correcto (antes salía sin relleno) |
| Seleccionado · toca para quitar | `dia elegido` | igual que "Seleccionado" (mismo aspecto, a propósito) — correcto |
| Hoy + seleccionado | `dia hoy elegido` | fondo violeta, texto blanco, sin box-shadow (el aro lo pierde) — correcto (antes salía sin relleno) |
| Hoy sin eventos | `dia hoy desactivado` | aro violeta + opacity 0.65 — correcto |
| Desactivado · sin eventos | `dia desactivado` | opacity 0.65 — correcto (ya la variante decidida, no 0.35) |
| Desactivado · pasado | `dia desactivado` | opacity 0.65, igual que "sin eventos" — correcto |
| Fuera del mes | `dia fuera` | `visibility: hidden` — correcto (vacío) |
| Presionado | `dia demo-presionado` | fondo `rgb(244,244,242)` (--fondo-suave), opacity 0.6 — correcto |
| Foco de teclado | `dia demo-foco` | `outline-width: 2px` (las demás tarjetas dan el "medium" por defecto del navegador, invisible sin `outline-style`) — correcto |
| Cargando | `skeleton leyenda-carga` | reutiliza `.skeleton .celda` real — correcto |

### Dos bugs reales, encontrados y corregidos en el camino

**1. En la entrega original: los dos chips de fecha visibles a la vez.** La primera vuelta de capturas
(`245-01`) salió con el ícono solo y la pastilla "vie 25 sep ✕" a la vez, en vez de solo el ícono. Causa:
`#chipConFecha` llevaba el atributo `hidden` *y* la clase `.chip` (que fija `display: flex`) — por especificidad,
una regla del autor (`.chip { display: flex }`) gana siempre sobre la regla del navegador para `[hidden]`
(`display: none`), sin importar el orden ni la especificidad exacta, porque el origen "autor, normal" pesa más
que "user-agent, normal" en la cascada. Confirmado contra el DOM (`getComputedStyle(...).display` daba `"flex"`
con `.hidden === true`). Arreglado con una regla `[hidden] { display: none !important; }` al principio de la
hoja de estilos.

**2. Reportado por el gestor en esta revisión: la leyenda no pintaba "Seleccionado" ni "Hoy + seleccionado".**
Esas dos tarjetas salían sin relleno y con texto negro — la leyenda no mostraba el estado que decía. Causa: la
primera versión de la leyenda pintaba una réplica aparte de cada estado (clases propias, `.m-elegido`, `.m-hoy`…)
en vez de las clases reales del calendario (`.dia`, `.hoy`, `.elegido`, `.desactivado`, `.fuera`); esa réplica
perdía contra `.estado-leyenda .muestra { color; background: none }`, un selector de MÁS especificidad (dos
clases contra una) que ganaba sin importar en qué orden estuvieran escritas las reglas en la hoja de estilos.
Mismo mecanismo de fondo que el bug 1 (una regla de mayor peso pisando silenciosamente a otra), pero por
especificidad en vez de por origen. **Arreglo de fondo, no un parche de especificidad:** la leyenda ahora pinta
con las mismas clases que usa la hoja real (`class="dia hoy elegido"`, etc.) — así no puede existir una segunda
copia que se desalinee de la primera. Confirmado celda por celda contra `getComputedStyle()` (tabla arriba) y con
dos capturas nuevas (`245-08` y `245-10`, con y sin JavaScript).

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
  comportamiento respecto al componente real actual. **Ya no es una propuesta abierta:** el founder la confirmó
  en la revisión de esta pieza (punto 4 de "Decisiones del founder").
- **Reabrir la hoja tocando la pastilla de fecha (no la ✕) es una pieza que agregué yo, no un pedido textual del
  founder** — la necesitaba para que "tocar otra vez el día ya elegido" (punto 3 de "Decisiones del founder")
  tuviera un camino real para alcanzarse una vez cerrada la hoja. Señalado para que el gestor la confirme o la
  ajuste antes de pasar esto a código.
- La pausa de 180 ms entre marcar/desmarcar un día y cerrar la hoja es una elección de implementación mía (para
  que el toque se alcance a ver antes de que la hoja desaparezca), no algo que pidiera el founder con un número
  exacto; el gestor puede ajustarla o quitarla.
- Sin `npm run lint`/`typecheck`/`test`/`build`: no hay código de la app en esta pieza, solo un archivo HTML
  autocontenido.

Rama `calendario-dias-con-eventos`; a revisión del gestor. Commit local al cerrar, push y PR abiertos (sin unir),
como pide el encargo.
