# 207 · La prueba del canal de Pincel ya no depende del orden de los temporizadores (OL-172)

**Fecha:** 2026-09-24 · **Rama:** `pincel-prueba-canal-orden`, desde `origin/main` (`3e307f7`). **Quien lo hace:** el gestor en la nube (`session_01XrJvzKysk1Y39vzpLGT9HG`), como arreglo de CI.

## Qué pasó

La CI de main falló en el merge del PR #207 (solo documentos del gestor): `scripts/pincel/simulador-mandos.test.ts › conectarCanal › ignora también CHANNEL_ERROR/TIMED_OUT que llegan después de SUBSCRIBED` devolvió `{ ok: false, estado: "CHANNEL_ERROR" }` en vez de `{ ok: true, estado: "SUBSCRIBED" }`. La misma prueba había pasado un minuto antes en el merge del #206 con el mismo código de Pincel, y aquí pasó 15 veces en aislamiento y 3 veces con la suite completa bajo carga de CPU. Es una carrera de la propia prueba, no un fallo de `conectarCanal`.

## Causa

El canal falso de la prueba programaba todos los estados de golpe con retrasos crecientes (`setTimeout(cb, 5)`, `setTimeout(cb, 10)`, …). El orden de llegada dependía entonces de que el planificador respetara esos retrasos con precisión de milisegundos; en el runner de la CI (dos núcleos, 89 archivos de prueba en paralelo) el estado de los 10 ms se disparó antes que el de los 5 ms.

## Qué cambia

Solo `scripts/pincel/simulador-mandos.test.ts`, el ayudante `canalFalso`: cada estado programa el siguiente al dispararse (un temporizador a la vez), así la secuencia llega siempre en su orden pase lo que pase con el reloj. Las once pruebas son las mismas; ninguna afirmación cambió, y la de «solo resuelve una vez» sigue dejando 20 ms para los estados tardíos (2 × 5 ms). `simulador-mandos.mjs` no se toca.

## Pruebas

Once pruebas del archivo en verde; suite completa (1075 pruebas, 89 archivos) en verde bajo carga de CPU; lint 0 errores (1 warning preexistente ajeno); typecheck limpio. Sin build: no cambia nada de la app.
