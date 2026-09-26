# 233 · Selector de fecha nativo: aplica al cerrarse, no al abrirse (regresión de OL-188)

**Fecha:** 2026-09-25 · **Rama:** `fecha-nativa-al-cerrar`, desde `origin/main`. Operador nuevo (Sonnet), OL-204.

## El bug (founder, en su iPhone, Lugares)

«Recuerdas el problema que te reporté de selección de día en mapa de lugares? Ahora se selecciona
automáticamente el día actual y se cierra selector. Muy mal».

## Causa (confirmada)

En OL-188 (bitácora 222) `ui/ChipFecha.tsx` pasó el `<input type="date">` nativo (rama táctil/móvil) de
`value={hoy}` a `value=""`, para que elegir "hoy" sí disparara `change` (antes, con `value={hoy}`, el navegador
no dispara `change` al re-elegir el mismo valor que ya tenía el campo). Pero en Safari de iPhone, abrir el
selector con el campo vacío hace que el sistema **ponga hoy y dispare `change` de inmediato**, antes de que la
persona haya tocado nada. El código aplicaba ese `change` sin condición (`onChange={(e) => onCambiar(e.target.value)}`):
el filtro quedaba puesto por el solo hecho de abrir, el chip pasaba a la rama "con fecha" (`if (fecha) return
<span>…`) y esa rama no tiene el `<input>` — se desmonta, así que el selector nativo se cierra solo.

Confirmado contra el DOM real (Chrome vía Playwright, ver "Prueba"): forzar el valor del campo con foco y
disparar `change` a mano reproduce exactamente el síntoma con el código de OL-188 tal cual.

## Arreglo

`src/lib/fechaNativa.ts` (nuevo, lógica pura sin DOM): una máquina de estados de tres eventos (`focus`, `change`,
`blur`) que decide cuándo llamar a `onCambiar`:

- `change` **nunca** aplica de inmediato: solo guarda el valor como "pendiente".
- `blur` (el selector se cierra: "Listo" o tocar fuera) aplica lo pendiente, si hay algo. Cancelar sin elegir
  (`blur` sin `change` antes) no filtra — sigue igual que antes de abrir.
- `focus` reinicia el estado, pero **solo si la apertura anterior ya cerró** (`cerrado` o `aplicado`): un `focus`
  de más a mitad de la misma apertura no borra lo pendiente. Esto hizo falta porque, al construir la prueba de
  componente contra Chrome real, se encontró que fijar por código el valor de un `<input type="date">` con foco
  dispara un `focus` extra (aunque el foco nunca sale del campo) — sin este resguardo, ese `focus` de más borraba
  la fecha recién elegida antes del `blur` y el filtro dejaba de aplicarse. No se pudo confirmar si esto ocurre
  también en Safari/Chrome reales de teléfono (el `<input>` nativo en móvil abre un diálogo del sistema, no el
  editor de segmentos de escritorio que dispara esto), pero cubrirlo no cuesta nada y evita una regresión
  silenciosa si alguna vez pasa.
- También cubre el orden distinto de algunos navegadores (Chrome de Android, según el pedido): si el `blur` del
  diálogo llega **antes** que el `change` con la fecha elegida, se aplica en cuanto llega el `change` tardío. Una
  vez aplicado, el resto de eventos de esa apertura se ignora (no aplica dos veces).

`ui/ChipFecha.tsx`: el `<input type="date">` nativo pasa sus tres eventos (`onFocus`, `onChange`, `onBlur`) por
`siguienteEstadoFechaNativa`, guardando el estado en un `useRef` (no hace falta re-render entre eventos: el
selector es una superposición del sistema operativo, ajena al DOM). `value` sigue siendo siempre `""` (OL-188 no
se toca). Agenda (`AgendaInicio.tsx`) y Lugares (`VistaLugares.tsx`, con mapa) pasan `onCambiar` tal cual al
estado del filtro en ambos casos — no necesitaron cambios, todo el arreglo vive dentro de `ChipFecha`.

La hoja propia de escritorio (`SelectorFecha`, OL-162) no se toca: no usa el `<input>` nativo, no tiene este bug.

## Prueba

- **Unitaria (vitest, `npm test`):** `src/lib/fechaNativa.test.ts`, 7 pruebas sobre la máquina de estados pura:
  abrir con `change` de hoy sin `blur` no aplica; `blur` tras elegir sí aplica; cancelar sin elegir no aplica;
  elegir otro día antes de cerrar aplica ese; orden de Android (`blur` antes que `change`); no aplica dos veces
  con eventos de más tras aplicar; un `focus` de más a mitad de la apertura no borra lo pendiente; una apertura
  nueva (`focus` tras cerrar) sí olvida la anterior.
- **Componente (Chrome real vía Playwright, `ChipFecha.componentes.test.mjs`, no corre con `npm test`; se corrió
  a mano):
  ```
  PLAYWRIGHT_MODULE=<playwright-core>/index.mjs CHROME_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    node --test src/components/ui/ChipFecha.componentes.test.mjs
  ```
  6 pruebas, todas verdes: el input arranca vacío (OL-188); `change` con hoy sin `blur` no filtra todavía y el
  input sigue montado (antes del arreglo, aquí ya se cerraba); `blur` tras elegir hoy sí filtra (OL-188 sigue
  arreglado); cancelar sin elegir no filtra; otro día también llega tal cual al cerrar; orden de Android (`blur`
  antes que `change`) se aplica una sola vez. Como Chrome no pinta el selector nativo de iOS, los eventos
  `change`/`blur` se simulan a mano sobre el `<input>` real (con el setter nativo del prototipo, no la asignación
  directa, que React no detecta como cambio) y un clic lejos del chip para el `blur` real (no `el.blur()`: en
  este Chrome, sin foco de ventana real, a veces no llega a disparar el `focusout` que React delega). Comprobado
  contra el código de OL-188 sin el arreglo: la prueba de "sin blur no filtra" falla como se espera (`fecha` ya
  quedaba en "hoy").
  Se depuró un descuido propio en el camino: la primera versión de `ChipFecha.tsx` seguía poniendo
  `estadoNativo.current = ESTADO_INICIAL_FECHA_NATIVA` a mano dentro de `onFocus`, sin pasar por
  `siguienteEstadoFechaNativa` — la función pura ya tenía el resguardo del `focus` de más, pero el componente no
  la usaba para ese evento. Encontrado gracias a la prueba de componente contra Chrome real (que sí dispara ese
  `focus` extra); sin ella se habría entregado con la fecha elegida borrándose antes de aplicar.

## Simulador de iPhone (evidencia visual)

Se pudo usar el simulador de iOS (26.3), FLOWYA iPhone SE (`926414EF`, libre en ese momento — el FLOWYA iPhone 15
Pro suele estar en uso por otro chat). `next dev -p 3010` en este árbol (sin `.env`, así que Mapbox no carga —
ajeno a este cambio) y Safari del simulador abriendo `http://localhost:3010` (tras el primer `simctl openurl`,
que se agota hasta que Safari abrió una vez). Capturas en `docs/rediseno/capturas-233/`:

- **`233-01-selector-abierto-hoy-marcado.png`** (Lugares): el selector nativo recién abierto, con el 25 (hoy) ya
  marcado en azul — la precondición exacta del bug. Se comprobó (sin capturar, con una espera de 3 s entre dos
  capturas idénticas) que el selector **no** se cierra solo ni aplica nada mientras sigue abierto.
- **`233-02-tras-listo-filtro-hoy.png`** (Lugares): tras tocar el visto ("Listo"), el chip pasa a "vie 25 sep" y
  la lista filtra ("Ningún lugar tiene eventos ese día" — sin datos de prueba cargados, banco vacío del árbol).
- **`233-03-agenda-selector-abierto.png`** y **`233-04-agenda-tras-listo-filtro-hoy.png`**: la misma secuencia en
  Agenda (mismo componente, otro uso) — abre con hoy marcado sin cerrarse, cierra y filtra al tocar "Listo"
  ("viernes 25 de septiembre — Ese día no hay nada todavía").

No se probó a mano el caso "cancelar sin elegir" en el simulador (tocar Reset/afuera antes de "Listo"): un
primer intento de tocar "Reset" no pareció registrarse y, para no gastar más tiempo de simulador, se dejó cubierto
solo por las pruebas automáticas (unitaria y de componente), donde sí está probado y pasa. `AGENTS.md`, que
reescribe `next dev` al arrancar, se restauró con `git checkout -- AGENTS.md` antes de comitear (confirmado sin
diferencias con `git status`).

## Evidencia

```
npm run lint        → 0 errores (1 warning preexistente y ajeno, docs/diseno/logotipo/iconos-sn.mjs)
npm run typecheck   → sin errores
npm test             → 99 archivos, 1262 pruebas, todas verdes (incluye las 7 nuevas de fechaNativa.test.ts)
npm run build        → compila con Turbopack, sin errores
```

**Nota de entorno:** este árbol de trabajo se creó con `node_modules/` vacío; se corrió `npm ci` (no toca
`package.json` ni `package-lock.json`, confirmado con `git status` antes/después) para poder correr las pruebas y
el build.

## Pendiente

Falta la prueba del founder en su iPhone real (Safari), como marca `CLAUDE.md` antes de dar la fase por cerrada.
