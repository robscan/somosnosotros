# 167 · Pincel: sin desplazamiento, grosor en vivo, ping de latencia y saltos del cursor (OL-132)

**Fecha:** 2026-09-22 · **OL:** OL-132 · **Rama:** `pincel-grosor-en-vivo` desde `origin/main` (`32fd3f6`) · **Commit:** uno (local; el gestor sube y abre el PR). Sin migración. Sin council ni subagentes.

## Lo que dijo el founder (literal, desde su iPhone real, tras probar lo publicado)

«Sigue latencia horrible. Modificar grosor mientras se pinta es imposible, se traba… que cuando el usuario desplace arriba o abajo se haga más grueso o más delgado pero que se bloquee desplazamiento completamente y se cambia el grosor del cursor en pared.» Y aparte: «en ocasiones cambia drásticamente de posición el puntero/cursor».

Cuatro puntos, en el orden del encargo del gestor: (1) la página no se mueve nunca; (2) el grosor cambia en vivo mientras se pinta; (3) la latencia se mide por partes; (4) los saltos del cursor.

## Punto 1 · La página no se desplaza nunca

**Causa.** El mando era un bloque normal dentro de la página de la ficha (`min-height` + `position: relative`), con `touch-action: none` y `overscroll-behavior: contain` solo en su área. Lo que no cubría el mando (el gutter, la Barra, lo que quedaba abajo) seguía siendo página desplazable de Safari, y el `touchmove` del documento solo se frenaba mientras se pintaba.

**Cambio.** `.mando` pasa a `position: fixed` bajo la Barra (`top: var(--alto-barra)`, `left/right/bottom: 0`, `overflow: hidden`, `touch-action: none`, `overscroll-behavior: none`, `user-select: none`). Mientras está montado, `html` y `body` llevan `overflow: hidden`, `touch-action: none` y `overscroll-behavior: none`, y el documento tiene un `touchmove` no pasivo con `preventDefault` SIEMPRE, no solo pintando; todo se repone al salir. El gutter horizontal lo pone el mando (ya no lo hereda de la página) y el pie lleva 12 px menos que antes, que son los 12 px que la página ponía entre la Barra y el mando: el botón queda exactamente donde estaba.

**Medido (Chrome real).** 390×844: `.mando` `position: fixed`, `top: 56px`, `overflow: hidden`; `html`/`body` `overflow: hidden`, `touch-action: none`, `overscroll-behavior: none`; tras `scrollTo(0, 400)` y una rueda de 400 px, `scrollY = 0`; todos los rects dentro de la pantalla; botón de 128×128 con top 546.5 (centro y = 610.5, la geometría aceptada en OL-120/126). 320×568: todo dentro, botón top 341.5. Capturas `mando-ol132-390x844-fijo.png`, `mando-ol132-320x568-fijo.png`.

## Punto 2 · El grosor cambia en vivo mientras se pinta

**Causa de «se traba».** Existía un estado «ajustando sin pintar» (`estaAjustandoGrosor`, umbral de 8 px, pedido por el gestor el 2026-09-21): pasado el umbral, el mando dejaba de mandar trazo y tiraba las lecturas del sensor. Modificar el grosor mientras se pintaba era imposible por construcción, no por latencia.

**Cambio.** Ese estado desaparece (`UMBRAL_AJUSTE_PX`, `estaAjustandoGrosor` y `ajustandoRef` se quitan). El arrastre cambia el grosor en cada `pointermove`/`touchmove` (`grosorDesdeArrastre`, sin cambios: hasta 60 px arriba sube de 1 a 3.5, hasta 60 px abajo baja hasta 0.5) y el intervalo de pintado sigue mandando trazo con el grosor del momento. La pared ya usaba el grosor de cada mensaje para los puntos nuevos y para el cursor (OL-126), así que el cursor en pared crece o adelgaza solo. Al soltar, el botón vuelve a su sitio y el grosor se queda. El texto de ayuda dice «Pintando en la pared» mientras se pinta y solo se deja en blanco si el dedo baja más de 20 px (el botón taparía el texto).

**Medido (Chrome real, sensor sintético).** Durante un arrastre de 60 px sin soltar, con lecturas de orientación continuas: 11 mensajes de trazo, con grosor 1 → 1.21 → 1.52 → 1.94 → 2.35 → 2.77 → 3.08 → 3.5 …; huecos entre mensajes de 158–172 ms (el ritmo de 6/s, sin corte); botón top 482 durante y 546.5 al soltar; grosor 3.50 después. Captura `mando-ol132-390x844-grosor-en-vivo.png`.

**Simulador (Safari real, iPhone SE, iOS 26.3, toques).** `sim-ol132-1-abierto.png` (mando con sonda), `sim-ol132-2-tras-toque.png` (encender: ubicación concedida, diálogo del sensor → Allow, encendido), `sim-ol132-3-tras-arrastre-pagina.png` (un arrastre vertical sobre la zona vacía: la página no se mueve), `sim-ol132-4-grosor-durante.png` (arrastre de 60 pt hacia abajo sostenido sobre el botón: `pres=sí cap=sí desp=-60 grosor=3.00`, venía de 3.50; la página sigue en su sitio), `sim-ol132-5-grosor-despues.png` (al soltar: `pres=no cap=no desp=0 grosor=3.00`, botón de vuelta). El simulador no tiene sensor (`0 lecturas/s`), así que ahí no sale trazo: la prueba de que el trazo no se corta es la de Chrome.

## Punto 3 · Latencia: medirla por partes

**Ping en la sonda.** Con `?sonda=1`, el canal se abre con `broadcast.ack: true` (`abrirCanalObra(supabase, obraId, { ack: true })`) y cada 5 s el mando manda un `ping` a sí mismo; `send` resuelve cuando el servidor de Realtime lo confirma, y ese tiempo sale en la sonda como «ida y vuelta al servidor: N ms (ping cada 5 s)». Es la red hasta Supabase, sin la pared ni el dibujo: si en el iPhone del founder da alto (más de ~150 ms), el problema es la distancia al servidor; si da bajo, hay que mirar el dibujo. En local: 3–9 ms en Chrome, 2–26 ms en el simulador.

**Revisión de `ack`/`self`.** Sin sonda el canal sigue como siempre (`{ private: true }`, o sea `ack: false, self: false` por defecto en realtime-js 2.116): no hay ningún viaje extra por mensaje. Con sonda, `ack` solo hace que cada `send` espere su confirmación para resolver; los envíos de trazo y posición no se esperan (no llevan `await`), así que el ritmo no cambia. La pared no escucha el `ping`.

**WebRTC teléfono↔pared (solo anotado, no se hace).** Un canal de datos directo entre el teléfono y la pared quitaría el salto por el servidor de Realtime (el ping dirá cuánto vale ese salto); haría falta una señalización (el propio canal de Realtime sirve) y STUN/TURN para redes con NAT. Es una opción para después, si el ping del founder lo justifica.

## Punto 4 · Los saltos del cursor

**Causa.** La horizontal salía de `gamma`, que cambia de signo al pasar por la vertical (±90°) y se vuelve inestable con el teléfono casi de pie (bloqueo de cardán): una lectura de +89 y la siguiente de −89 mandaban el cursor al otro lado de la pared. Además, las diferencias con el cero no se desenrollaban: `alpha` da la vuelta en 0↔360 y `beta` en ±180.

**Cambio.** La horizontal va por `alpha` (girar el teléfono a la derecha o a la izquierda, como un apuntador; `gamma` solo si el aparato no da `alpha`); todas las diferencias con el cero pasan por `diferenciaAngular`, el giro más corto normalizado a (−180, 180]; y hay un filtro de saltos (`esSalto`): si entre dos lecturas seguidas la posición cambia más de la mitad del recorrido (`SALTO_UMBRAL = 0.5`) en menos de 100 ms (`SALTO_VENTANA_MS`), la lectura se ignora y la sonda anota «salto ignorado: α … β … γ … → (x, y) desde (x, y)». Si el salto era real, a los 100 ms la lectura pasa (la ventana se mide contra la última lectura aceptada). Centrar reinicia el filtro.

**Pruebas puras** (`pincel.test.ts`): `diferenciaAngular` (cruces por 0/360 y ±180, sin −0), `posicionDesdeOrientacion` con `alpha` (a la derecha 30° → x = 1; cero 10 y actual 350 → x = 20/30; `gamma` ±89 sin efecto; respaldo por `gamma` sin `alpha`) y `esSalto` (umbral, ventana, primera lectura). **Secuencia sintética (Chrome real):** alpha 2 → 359 → 356 → 353 (cruza 0/360), gamma 89 → −89 → 89 (cardán) y beta 45 → 100 en 40 ms: las posiciones mandadas salen continuas y la sonda anota «salto ignorado: α 353 β 100 γ 89 → (0.40, -1.00) desde (0.40, 0.00)». Captura `mando-ol132-390x844-saltos.png`.

## Verificación

- `npm run typecheck` ✓ · `npm run lint` 0 errores (1 aviso previo en `docs/diseno/logotipo/iconos-sn.mjs`) · `npm test` 80 archivos, 1005/1005 ✓ · `npm run build` ✓. Sin migración, sin `test:db`.
- Chrome real (playwright-core con el Chrome de la Mac) y simulador de iPhone SE con toques, como arriba. Evidencia en el scratchpad de la sesión, carpeta `evidencia-ol126/` (nombres `mando-ol132-*.png` y `sim-ol132-*.png`).
- Lo que falta y solo puede dar el founder: las lecturas de la sonda en su iPhone real (el ping, y si aparecen «salto ignorado» al pintar de verdad). Nada se declara resuelto en el aparato hasta eso.

## Archivos

`src/lib/pincel.ts`, `src/lib/pincel.test.ts`, `src/lib/canal-obra.ts`, `src/lib/canal-obra.test.ts`, `src/app/obra/[id]/mando/Mando.tsx`, `src/app/obra/[id]/mando/mando.module.css`, esta bitácora y `docs/ops/OPEN_LOOPS.md`.
