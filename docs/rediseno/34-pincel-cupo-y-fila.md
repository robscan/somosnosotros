# 34 · Pincel: cupo de mandos por obra y fila de espera

**Estado:** propuesta, prototipo para firma del founder. · **OL:** OL-088 · **Bitácora:** [123](../bitacora/2026/09/123-pincel-app.md)

## De dónde sale

Al decidir seguir con lo medido en la corrida de cupo (sin correr una segunda), el founder propuso, en el chat del gestor (2026-09-21): «Continua pincel con la información de esta corrida, creo que podríamos incluso limitar usuarios por actividad, agregando un campo en admin, tener fila de espera hace que los usuarios se interesen y se enganchen. Pienso que podríamos hacer que los que no alcanzan cupo si se puedan conectar pero su control aparezca en espera para que alguien salga.» Y, al ver la primera versión de este plan (con un turno con tiempo máximo propuesto): «Ok no traigamos complegidad por ahora, sin limite de turnos, sin tiempo máximo, que venga despúes.»

## Lo medido (sin tocar nada nuevo)

- **La corrida de cupo** (bitácora 123, Fase 2 bloque 2): 10 mandos × 2 Hz (20 mensajes/s agregados) mandó 190 mensajes, la pared recibió 190 — **0 % de pérdida**, latencia mediana 65 ms, p95 279 ms. No se corrió más alto (el founder decidió no repetir la prueba); el resto de este documento asume ese número como el único con carga real medida.
- **El cupo del plan gratuito de Supabase Realtime, citado con fuente** (`https://supabase.com/docs/guides/realtime/limits`, leída el 2026-09-21): 200 conexiones simultáneas, **100 mensajes por segundo**, 256 KB por mensaje, 2 000 000 de mensajes al mes.
- **El envío agrupado ya decidido** (`src/lib/pincel.ts`, Fase 2 bloque 2): cada mando manda `MENSAJES_POR_SEGUNDO = 3` veces por segundo, no uno por muestra del sensor.
- **El latido de la conexión**, revisado en el código real de la dependencia que ya trae el proyecto (`@supabase/realtime-js`, no en su documentación, que no da el número): `HEARTBEAT_INTERVAL = 25000` (25 segundos). Si alguien pintando cierra su mando o se va con normalidad, Presence lo nota casi de inmediato; si se le cae la conexión de golpe (batería, señal), el servidor no tiene forma de saberlo hasta que le falten uno o dos latidos — en la práctica, **entre 25 y unos 50 segundos** antes de que su lugar se libere solo. No es un número exacto ni medido por esta pieza; es lo que dice la librería instalada.

## La propuesta

### 1. Cupo de mandos por obra

Un campo nuevo al crear o editar una obra colectiva, en Administración.

- **Por defecto: 10.** Es exactamente lo medido y limpio — no una extrapolación.
- **Tope duro: 20.** Con el envío agrupado, 20 mandos son 60 mensajes/s de trazos — el 60 % del cupo citado. El 40 % que sobra es colchón para la Presence de la fila de espera (que también manda mensajes, sin medir todavía con el simulador de Broadcast puro) y para lo que la corrida 1 no llegó a probar: cómo se comporta con carga real por encima de 20 mensajes/s. El techo teórico sin colchón sería ~33 (100 ÷ 3); no se propone como tope porque nunca se corrió una tanda que lo confirmara.
- El administrador puede bajar el cupo (mínimo 1) o subirlo hasta el tope, nunca más.

### 2. Fila de espera

**Quién pinta y quién espera:** Realtime **Presence** en el mismo canal de la obra (`abrirCanalObra`, ya común a cualquier obra). Cada mando hace `track()` al conectar, con su hora de llegada. El orden es por esa hora; si dos llegan en el mismo instante, se desempata con el `presence_ref` que Presence ya da a cada conexión (sin esto, quien mira la pared y quien mira su mando podrían ver un orden distinto). Los primeros `cupo` de esa lista pintan; el resto espera, con su posición = su lugar en la lista menos el cupo.

**El freno va también del lado de la pared, no solo del botón del mando.** Un mando en espera podría, con un cliente modificado, seguir mandando `trazo` igual — no basta con que el propio mando se autolimite. Cada mensaje de trazo dice quién lo manda (la clave de su propia Presence, no un nombre), y **la pared descarta cualquier trazo cuyo remitente no esté, en ese momento, entre los primeros `cupo` de su propia cuenta de Presence** — no le basta con recibir el mensaje, lo cruza contra quién pinta ahora mismo.

**Fila SIMPLE, sin turno con tiempo máximo** (recorte del founder, 2026-09-21): quien pinta sigue hasta que sale por su cuenta (cierra el mando, se va) o se le cae la conexión. Nadie pierde su lugar por quedarse quieto, aunque haya gente esperando. **Qué NO entra en esta pieza:** un turno con tiempo máximo o una salida por inactividad — queda en «Después», si con uso real hace falta.

**Qué pasa si se cae la conexión de quien pinta:** Presence lo resuelve solo — al perder el WebSocket, su `track()` desaparece de la lista de todos los demás sin que nadie tenga que detectarlo a mano, y el siguiente en la fila sube un lugar automáticamente. En la práctica, entre 25 y unos 50 segundos (§ arriba).

**Cupo de conexiones, no solo de mandos pintando:** quien espera sigue conectado (ve la pared, ve su lugar) aunque no mande trazos — cuenta para el tope de 200 conexiones simultáneas igual que quien pinta.

### 3. Sin nombres en la fila

Solo número de lugar («vas el 3») para quien espera, y un conteo total («4 esperando») visible para todos — la misma regla que ya sigue el resto de la app: las personas se cuentan, no se identifican (doc [24](24-grafo-cultural.md), grafo cultural).

## Qué NO entra en esta pieza

- Turno con tiempo máximo o salida por inactividad (recorte del founder; queda para «Después»).
- Medir el costo de Presence en mensajes/segundo con el simulador — el de la Fase 2 bloque 2 solo abrió canales de Broadcast puro, sin Presence.
- Un tope aparte al total de conexiones (pintando + esperando) más allá del que ya impone el plan de Supabase.

## Ver también

Prototipo estático: [`prototipos/pincel-cupo-y-fila.html`](prototipos/pincel-cupo-y-fila.html). Corrida de cupo y su lectura: bitácora [123](../bitacora/2026/09/123-pincel-app.md).
