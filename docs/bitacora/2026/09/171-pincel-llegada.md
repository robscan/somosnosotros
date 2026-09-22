# 171 · Pincel: la llegada de un mando nuevo — «Entrando…», el punto con su pulso y el letrero «Nombre entró» (OL-136)

**Fecha:** 2026-09-22 · **OL:** OL-136 · **Rama:** `pincel-llegada` desde `origin/main` (`1faaaf7`) · **Commit:** uno (local; el gestor sube y abre el PR). Sin migración. Sin council ni subagentes.

## Lo que dijo el founder (literal)

«Crea una animación de carga para el usuario nuevo, ya sea en el celular (Entrando) y luego el punto con una animación de tamaño, que se haga grande y regrese a su tamaño original para que se vea que entró nuevo. Podemos poner un letrero en la esquina inferior izquierda (Robscan entró) que aparezca por unos segundos.»

**Decisión del gestor (anotada en OPEN_LOOPS):** (1) mando en «Entrando…» desde que se abre hasta que el canal está suscrito y la presencia sincronizó su propia entrada, sin parpadeo si tarda menos de ~300 ms; (2) la presencia lleva `nombre`; (3) en la pared, una presencia nueva tras el primer sync aparece al centro con un pulso (≈3× y vuelve en ~600 ms, `transform`, sin animación con `prefers-reduced-motion`) y se mueve con su primera posición — también si va a la fila (entra y se anuncia, pero no pinta); (4) letrero «Nombre entró» abajo a la izquierda, ~3 s, con fundido, apilados hacia arriba, sin tapar la sonda, canon (fondo blanco, borde, Bricolage, legible desde lejos).

## Primero, el prototipo

`docs/rediseno/prototipos/pincel-llegada.html` (estático; `?vista=pared` y `?vista=mando`; botones «Simular llegada», «Sonda» y «Repetir entrada» que solo existen ahí). Capturado a 1280×800 (pared: pulso con un letrero; dos letreros apilados sobre la sonda) y 390×844 (mando en «Entrando…» y listo); las rutas se mandaron al gestor para enseñárselo al founder. El código sigue el prototipo tal cual.

## Cambio

- **Puro (`pincel.ts`).** `haEntrado(entradas, remitente, suscrito)`; `ENTRANDO_TRAS_MS = 300` y `mostrarEntrando(entrado, transcurridoMs)`; `remitentesNuevos(previos, entradas)` (con `previos = null` —el primer sync— no anuncia a nadie; un remitente con dos conexiones cuenta una vez); `nombreDeLlegada` («Alguien» si no viene nombre; nunca un correo ni un id); `LETRERO_LLEGADA_MS = 3000`, `PULSO_LLEGADA_MS = 600`; `entradasDesdePresencia` recoge `nombre` si es texto. 8 pruebas nuevas.
- **Mando (`Mando.tsx`, `page.tsx`, `mando.module.css`).** La página pasa `nombre={actual.perfil.nombre}` y el `track()` lo lleva. `suscrito` se enciende al confirmarse la suscripción; `entrado = haEntrado(…)`; un temporizador de 300 ms fija `esperaVencida`, y `entrando = mostrarEntrando(entrado, …)`. Mientras entra: `data-entrando="true"` en el mando, dos ondas azul petróleo que salen del botón apagado y se desvanecen (1,2 s en bucle, la segunda 400 ms después; solo `transform`/`opacity`), y en la línea de ayuda «Entrando…» en azul y negrita en vez de la ayuda; el contador de personas ya se ocultaba (estado «fuera» hasta el primer sync). Nada se mueve: botón y tarjetas en su sitio de siempre (centro del botón en y = 610,5, medido). Después, el flujo actual.
- **Pared (`Pared.tsx`, `pared.module.css`).** En cada sync: `remitentesNuevos` contra el sync anterior; por cada nuevo, un letrero (`setLetreros`, quitado a los 3 s) y su punto: si ya había dicho dónde está, ahí, con `llegada`; si no, al centro (`puntoCentral`), tinta negra, diámetro del trazo fino, tenue. Los puntos se conservan para todos los presentes (antes solo con cupo): quien va a la fila se anuncia y su punto se queda donde llegó (sus posiciones no lo mueven, como antes). El pulso: clase `.llegada` con `@keyframes pulso-llegada` (600 ms) que escala `--pulso` = el mayor entre 3 y 48 px ÷ diámetro, para que un punto chico también se vea desde lejos; la posición va en `--pos` (variable en línea) para que la animación de `transform` no la pierda. Esquina inferior izquierda: `div.esquina` con los letreros (`role="status"`, `aria-live="polite"`) y, debajo, la sonda si está — el letrero nunca la tapa; los nuevos empujan a los anteriores hacia arriba. Letrero: `p` con fondo blanco, borde, sombra, Bricolage 800 de 22–34 px, el nombre en verde; una sola animación de 3 s (entra con fundido y 6 px de subida, se va con fundido). `prefers-reduced-motion`: sin pulso y el letrero solo con fundido.

## Verificación

- `npm run typecheck` ✓ · `npm run lint` 0 errores (1 aviso previo en `docs/diseno/logotipo/iconos-sn.mjs`) · `npm test` 80 archivos, 1038/1038 ✓ (8 nuevas) · `npm run build` ✓.
- Chrome real (playwright-core), respaldo local con presencia de verdad (el respaldo ahora acepta el `track` de los clientes, manda el `presence_state` al unirse y puede retrasar el `phx_join` para ver «Entrando…»). Flujo de punta a punta: la pared abierta a 1280×800 con `?sonda=1` (primer sync vacío: base fijada); un mando de verdad a 390×844 con el join retrasado 2,5 s:
  - Mando a 1,2 s: `data-entrando="true"`, dos ondas, «Entrando…», sin contador; botón en (195, 610,5) de 128 px y tarjeta Trazo en (70,5, 610,5): nada se movió.
  - Pared a 3,2 s (en cuanto llegó): letrero «Pintora de prueba entró» (el nombre del perfil de prueba) a 24 px del borde y 150 px del pie, encima de la sonda (a 88 px); el punto del mando al centro (640, 400) de 42,6 px en pleno pulso (`--pulso` 6 = 48 px ÷ 8).
  - Mando a 3,8 s: `data-entrando="false"`, sin ondas, «1 persona aquí» y «Enciende el control para comenzar».
  - Segunda llegada (manual, «Mariana», 700 ms después): dos letreros apilados —«Pintora de prueba entró» arriba (215 px del pie) y «Mariana entró» debajo (150 px)—, la sonda intacta a 88 px; dos puntos al centro (el nuevo en pulso, 27,5 px).
  - 3,5 s después: 0 letreros; los dos puntos siguen al centro, tenues. Tras la primera posición del mando, su punto se va a (960, 220); el de la fila manual se queda.
- Sin sensor en Chrome, el mando no llega a pintar: lo que se prueba aquí es la llegada, no el trazo (ya probado en OL-132).

### Capturas reales (`docs/rediseno/capturas-171/`), abiertas y descritas

- `01-mando-entrando-390x844.png`: el mando en «Entrando…»: botón apagado con las dos ondas azul petróleo alrededor, el texto «Entrando…» en azul bajo el botón, tarjetas Trazo y Negro en su sitio, sin contador arriba a la derecha; la sonda arriba a la izquierda dice `fila=fuera (0)`.
- `02-pared-llegada-pulso-1280x800.png`: la pared vacía con el punto negro tenue del mando recién llegado, agrandado por el pulso, en el centro del lienzo; abajo a la izquierda el letrero «Pintora de prueba entró» (nombre en verde) sobre la sonda.
- `03-mando-listo-390x844.png`: el mismo mando 2,5 s después: sin ondas, «1 persona aquí» arriba a la derecha y «Enciende el control para comenzar».
- `04-pared-dos-llegadas-1280x800.png`: dos letreros apilados —«Pintora de prueba entró» arriba y «Mariana entró» debajo— encima de la sonda; en el centro, el punto de Mariana en pulso sobre el del mando.

## Límites

- Prueba con el respaldo local y Chrome; en producción Phoenix manda el `presence_state` al unirse (vacío o no), que es lo que fija la base. Lo que solo puede confirmar el founder: la llegada vista desde el cañón con su iPhone, y si «Entrando…» se alcanza a ver (con buena red dura menos de 300 ms y no sale, a propósito).
- El punto de quien llega sin haber mandado posición arranca negro y fino (no se sabe su pincel hasta su primer mensaje); su primera posición lo corrige.
- El nombre del letrero es el del perfil tal cual («Pintora de prueba» en el respaldo); un perfil sin nombre sale como «Alguien».

## Archivos

`src/lib/pincel.ts`, `src/lib/pincel.test.ts`, `src/app/obra/[id]/mando/Mando.tsx`, `src/app/obra/[id]/mando/page.tsx`, `src/app/obra/[id]/mando/mando.module.css`, `src/app/obra/[id]/pared/Pared.tsx`, `src/app/obra/[id]/pared/pared.module.css`, `docs/rediseno/prototipos/pincel-llegada.html`, `docs/rediseno/capturas-171/` (4 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.
