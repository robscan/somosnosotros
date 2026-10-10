# 402 · La fila «Ahora» sin repetir (OL-371)

**Pieza:** OL-371. **Rama:** `ahora-sin-repetir`, base `origin/main` (`ac84344d`, con #475). Se empezó sobre `c6591538`, con el prototipo firmado de OL-367. Antes de cerrar, el commit de código se pasó encima de lo nuevo de `main`, sin choques. **Fecha:** 2026-10-10. **Operador:** Claude (agente del gestor V). **Sin migración.**

## El pedido

Es el ejercicio **E7** del prototipo de tarjetas de Inicio, que el founder firmó el 2026-10-10. Sus palabras: «Listo, te acepto esta versión»; y la versión final: «Personalizada · E1 · E3 · E3B · E5 · E7 · E8 · E8C · E9 · E10». Está en la bitácora [398](398-prototipo-inicio-tarjetas.md) y en `docs/rediseno/prototipos/inicio-tarjetas.html`, función `rotulosAhora`.

La regla de E7: si varios empiezan a la misma hora, solo el primero dice la cuenta atrás y los demás dicen la hora («En 1 h 11 min», «13:00», «13:00»).

En producción hoy se lee «En 1 h 11 min» bajo tres círculos seguidos.

## Qué cambió

- **`src/lib/ahora.ts`:** función pura nueva, `rotulosAhora(avisos, ahora)`.
  - Recibe la lista ya clasificada (`clasificarAhora`) y devuelve el rótulo de cada círculo.
  - Un aviso «En un rato» dice la hora (`horaCorta`, en la zona del evento) si el aviso de justo antes también es «En un rato» y empieza en el mismo instante.
  - Si no, dice lo de siempre (`rotuloCirculo`).
- **`src/components/inicio/FilaAhora.tsx`:** pinta `rotulosAhora` bajo los círculos en lugar de `rotuloCirculo`.
  - El nombre accesible de cada círculo no cambia: sigue con la cuenta atrás completa (`etiquetaAhora`), también en los que ya solo dicen la hora. El prototipo hace lo mismo.
- **Lo que no cambia:** «Ahora», las exposiciones, «Hoy» y «Mañana» dicen lo de antes aunque se repitan (dos «Inaugura hoy» siguen siendo dos «Inaugura hoy»). La historia de cada círculo sigue diciendo la cuenta atrás arriba: se ve una a la vez, no se repite.

## Lo que decidí yo, y por qué

- **«La misma hora» es el mismo instante**, comparado como fecha y no como texto. Así, «…T19:00:00Z» y «…T19:00:00+00:00» son la misma hora. Dos inicios con minutos distintos («13:00» y «13:15») tienen cada uno su cuenta atrás.
- **Solo se mira el aviso de justo antes**, como la función del prototipo. `clasificarAhora` deja todos los «En un rato» juntos y por hora, así que en la fila real es lo mismo que «el primero de cada grupo a la misma hora».
- **Observación, sin cambio:** el nombre accesible no incluye la hora que se ve («15:30»). Ya pasa hoy con «Hoy» y «Mañana»: el círculo dice «18:00» y su nombre es «Hoy: …». El encargo pide conservar la cuenta atrás completa, y así quedó. Si se quiere que el control por voz encuentre el círculo por lo que se ve, es una línea: «En 1 h 11 min, 15:30: …».

## Pruebas

- **`src/lib/ahora.test.ts`:** seis pruebas nuevas; 21 en total, en verde con `TZ=UTC` y con `TZ=America/Mexico_City`. Cubren:
  - El caso del prototipo (sábado 10 a las 11:49): «Ahora», «En 11 min», «En 1 h 11 min», «13:00», «13:00», «En 1 h 41 min», «Inaugura hoy». El nombre accesible de los tres dice «En 1 h 11 min».
  - Dos a la misma hora separados por otro tipo: cada uno con su cuenta atrás. Y una exposición que inaugura a esa misma hora detrás de los «En un rato» sigue diciendo «Inaugura hoy».
  - Misma hora con distinto minuto (13:00, 13:15, 13:15, 13:16): «En 1 h 11 min», «En 1 h 26 min», «13:15», «En 1 h 27 min». También el mismo instante escrito de otra forma.
  - Los demás tipos repetidos no cambian: dos de «Ahora», dos exposiciones, dos de «Hoy» y dos de «Mañana».
  - La hora se lee en la zona del evento: dos en Madrid dan «20:00», sea cual sea la zona del proceso.
  - Sin avisos, sin rótulos.
- **`src/components/inicio/FilaAhora.componentes.test.mjs`:** una prueba nueva en Chrome real; 8 en total.
  - El reloj de la prueba marca las 18:00. Hay tres eventos a las 19:00, uno a las 19:30, uno de «Ahora» y uno de «Hoy» (21:00).
  - En el primer pintado, sin esperar ningún temporizador: «Ahora», «En 1 h», «19:00», «19:00», «En 1 h 30 min», «21:00». Los nombres accesibles son «En 1 h: Evento a/b/c».
  - Con el reloj de la prueba un minuto después: «En 59 min», «19:00», «19:00», «En 1 h 29 min». Los nombres de los tres pasan a «En 59 min».
  - No hay aserciones que dependan de la letra, así que nada va detrás de `FUENTE`.
  - 8/8 con el Chrome de la Mac y con el `chrome-headless-shell` de la CI (revisión 1243), las dos con `TZ=UTC` y con `TZ=America/Mexico_City`. La prueba nueva, cinco veces seguidas: 5/5.

## Verificación

`npm run lint && npm run typecheck && npm test && npm run inventario && npm run medir`, sobre la rama final (`ac84344d` + la pieza):
- **lint:** 0 errores y 1 aviso que ya estaba (`VisorImagen.componentes.test.mjs`).
- **typecheck:** limpio.
- **test:** 193 archivos y 3497 pruebas. Sobre `c6591538` eran 190 y 3472, también con `TZ=UTC`.
- **inventario:** sin novedades.
- **medir:** 37 pantallas × 4 anchos en 125 s, sin novedades. Inicio queda en 412/412/414/414 nodos y `s01-inicio-sesion` en 406/406/408/408, con profundidad 11, igual que sobre `c6591538`. Solo cambia el texto de los rótulos, no el DOM. El canon del teclado no aplica: no hay campos.
- **Componentes de la fila:** 8/8 también sobre la rama final, y `ahora.test.ts` 21/21 con las dos zonas.

## Captura (390×844)

[`docs/rediseno/capturas-402/`](../../../rediseno/capturas-402/), con el Chrome de la Mac y playwright-core, 390×844 a 2×. Con sesión (Ana, del respaldo) y sin el indicador de `next dev`.

**Cómo se hizo:**
- `npm run dev` en el árbol de la pieza, contra el respaldo local (`scripts/ops/auditoria-ui/respaldo-local`) servido por una envoltura del scratchpad. El fixture del repo no cambió, así que `medir` no se mueve.
- La envoltura añade seis eventos de hoy, como la fila del prototipo, alrededor de una hora común H = 15:30:
  - «Día Nacional de las Cactáceas…», que empezó a las 11:30.
  - «Inauguración: Privacidad y elegancia…», a las 14:30.
  - «Guitarra en el Otoño…», «Presentación de Kopk Poj…» y «Viajera…», los tres a las 15:30.
  - «Inauguración: Líneas de fuga…», a las 16:00.
- **Hora real, sin reloj falso:** la captura esperó al minuto 14:19 y se tomó a las 14:19:03.
- Los carteles son los del prototipo (`inicio-tarjetas/`), servidos en el navegador. Ninguna petición salió de 127.0.0.1 y no hubo errores de página. Al terminar se borró el `.env.local` y se repuso el `AGENTS.md` que `next dev` reescribe.
- La captura se tomó con el código sobre `c6591538`, antes de pasarlo encima de `ac84344d`. Lo que trajo #475 (sitios, alta de lugar y `armazon.ts`) no toca Inicio.

**Las capturas**, abiertas una por una:
- `01-fila-ahora-sin-repetir.png` — Inicio al abrir, con la fila bajo las dos barras:
  - «Ahora» en violeta, bajo las cactáceas con el anillo que gira.
  - «En 11 min», bajo el cartel de Pedro Friedeberg.
  - «En 1 h 11 min», bajo Guitarra en el Otoño.
  - «15:30», bajo Kopk Poj.
  - Asoma «15…», bajo Viajera.

  Es la misma composición que la captura 12 de la bitácora 398 («Ahora», «En 11 min», «En 1 h 11 min», «13:00», «13…»), ahora con el código de la app. Debajo siguen «Tus planes» y «Seleccionados para ti», que no cambian con esta pieza.
- `02-fila-ahora-corrida.png` — la misma fila corrida hasta el primero de los tres:
  - «En 1 h 11 min» (Guitarra).
  - «15:30» (Kopk Poj) y «15:30» (Viajera), los dos con el anillo oscuro de «En un rato».
  - «En 1 h 41 min» (Líneas de fuga): otra hora, su propia cuenta.
  - Asoma «18…», el concierto de «Hoy», con el anillo gris.

**Leído en la página a las 14:19:03:**
- **Rótulos:** «Ahora», «En 11 min», «En 1 h 11 min», «15:30», «15:30», «En 1 h 41 min», «18:00», «19:00».
- **Nombres accesibles de los tres:** «En 1 h 11 min: Guitarra en el Otoño…», «En 1 h 11 min: Presentación de Kopk Poj…» y «En 1 h 11 min: Viajera…».
