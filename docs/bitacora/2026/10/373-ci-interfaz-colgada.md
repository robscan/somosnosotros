# 373 · El trabajo «interfaz» de la CI ya no se cuelga horas

**Pieza:** OL-344. **Rama:** `slug-oculto-y-ci`, desde `origin/main` (`0a6fd24e`), compartida con OL-343 (bitácora [372](372-slug-con-evento-oculto.md)), un commit por pieza. **Fecha:** 2026-10-07. **Operador:** Claude (agente del gestor). **Sin migraciones.**
**Manda:** el encargo del gestor. El trabajo `interfaz` se quedó horas «en Post Run actions/checkout@v4» tres veces el 2026-10-07 y hubo que cancelarlo y relanzarlo. La sospecha era un proceso hijo vivo tras `npm run medir` o `npm run test:componentes`.

## Qué pasó de verdad (registros de GitHub Actions)

La sospecha no se confirmó. En las tres corridas, `test:componentes` y `medir` **ni siquiera empezaron**. Lo que se colgó fue el paso anterior, `npx playwright-core install --with-deps --only-shell chromium`, dentro del `apt-get update` que lanza `--with-deps`. «Post Run actions/checkout@v4» era solo lo que la página enseñaba al final, cuando GitHub ya limpiaba tras la cancelación.

| Corrida (intento 1) | Rama | Paso colgado | Desde → hasta |
|---|---|---|---|
| 37671237402 | `docs-sensibles` | install de Chromium | 19:01:19 → 19:47:26 (46 min, cancelado a mano) |
| 37680810574 | `gestor-registro-35` | install de Chromium | 20:17:27 → 20:39:45 (22 min, cancelado a mano) |
| 37679383801 | `main` | install de Chromium | 20:05:50 → 02:06:26 del 8 (**6 h**, el máximo de GitHub) |

Cada registro (`gh api repos/robscan/somosnosotros/actions/jobs/<id>/logs`) termina igual:

- `Ign:` en todos los índices de `http://azure.archive.ubuntu.com`: el espejo de Azure no respondía.
- Pasa a `https://archive.ubuntu.com` y baja `noble-security InRelease`.
- **Silencio** hasta `##[error]The operation was canceled.`
- Al limpiar, el runner mata los procesos que quedaban: `Terminate orphan process: … (npm exec playwright-core install --with-deps --only-shell chromium)`, `sh`, `node`.

En las 52 corridas en verde más recientes ese paso tarda 20 s de mediana (mínimo 14 s, máximo 966 s, una vez con un apt lento que sí terminó). Las otras dos cancelaciones del día no son esto: 37701377577 la canceló la regla de concurrencia (un push nuevo al mismo PR) y 37702616006 falló en una prueba de componentes, no por un cuelgue.

Sin `timeout-minutes`, GitHub espera **6 horas** antes de cortar un trabajo. Por eso «se quedaba horas».

## El arreglo de la CI (`.github/workflows/ci.yml`)

- **Instalar Chromium con tope y reintento.** La instalación es la misma de siempre (`--with-deps --only-shell chromium`). Cambia lo de alrededor:
  - Cada intento va dentro de `timeout --kill-after=15s 4m`. Sin `--foreground`, `timeout` manda la señal a todo su grupo de procesos, y `sudo` la pasa a `apt-get`.
  - Hasta tres intentos. Entre uno y otro, `sudo pkill -x apt-get`, para que un apt que sobreviva no deje tomado el candado.
  - Un archivo `/etc/apt/apt.conf.d/99-tope-ci` con `Acquire::Retries "3"` y plazos de 30 s para http y https, así apt se rinde antes por su cuenta.
  - El paso tiene `timeout-minutes: 15`, por si todo lo anterior falla.
- **`timeout-minutes` en cada trabajo**, con margen sobre lo medido en esas 52 corridas:

| Trabajo | Mediana | Máximo | Tope |
|---|---|---|---|
| `codigo` | 2.7 min | 3.5 min | 15 min |
| `contratos` | 3.5 min | 3.9 min | 15 min |
| `interfaz` | 7.3 min | 22.8 min (el apt lento) | 35 min (los topes de sus pasos suman 15 + 10 + 10) |
| `verificar` | 3 s | 5 s | 5 min |

- `medir` gana `timeout-minutes: 10` como paso (suele tardar 2-3.5 min), igual que ya tenía `test:componentes`.

Lo que no se pudo probar: la CI solo corre en un PR o en `main`, y el encargo no permite abrir el PR. El YAML se comprobó con `js-yaml`: los topes quedan donde deben. La primera corrida real será la del PR de esta rama.

## Lo que sí dejaba procesos vivos (en local, no en la CI)

Al buscar procesos hijos durante la investigación aparecieron **cuatro `node --test` vivos desde la noche anterior** (lanzados entre las 22:26 y las 22:46 del 6 de octubre, más de 23 h vivos), todos de otro árbol de trabajo (`agent-aae51d6b0d3eb33a3`). Eran del mismo archivo y con el mismo filtro:

```
node --test --test-name-pattern=con cartel: la tarjeta|«Publicado» ofrece src/app/nuevo/evento/AltaEvento.componentes.test.mjs
```

Cada uno con su Chrome headless (3 ayudantes) y su servidor escuchando en `127.0.0.1`. Hay dos más del 6 de octubre con otros filtros sobre el mismo archivo, de otros dos árboles: pid 29965 (`agent-a57c3c77bd9db154b`, desde las 20:16) y 80305 (`agent-a54c0f41aa6ee9793`, desde las 15:30). No los toqué: son de otra pieza. **El gestor puede cerrarlos.**

**Se reprodujo en este árbol.** La misma orden pasa las dos pruebas y se queda viva. El proceso de la prueba **ignora `SIGTERM`**: hubo que matarlo con `SIGKILL`. El vigilante (`ps` cada 0.5 s de todos los descendientes y `lsof` de los que siguen vivos 3 s después de terminar) dejó esto:

```
[patron] salida 1; descendientes vistos: 7 (node×1, esbuild×1, chrome-headless-shell×5)
[patron] VIVO pid=8577 ppid=1 pgid=8574 /opt/homebrew/Cellar/node@22/22.23.3/bin/node --test-name-pattern=con cartel: la tarjeta|«Publicado» ofrece src/app/nuevo/evento/AltaEvento.componentes.test.mjs
node    8577 apple-1   12u  IPv4 …  TCP 127.0.0.1:50412 (LISTEN)
```

Con el inspector de node (`kill -USR1`) se vio qué lo mantenía vivo: el servidor de la prueba (`Server 127.0.0.1:50412`) y el proceso de Chromium (`ChildProcess chrome-headless-shell`).

**La causa.** En medio del archivo había un `await` suelto, de nivel superior: `const MEDIR = await readFile(…medir.js)`. Las pruebas de detrás de esa línea se registran tarde. Cuando `--test-name-pattern` solo elige pruebas de esa parte, node:test da por terminada la raíz y corre el `after` raíz **antes** que el `before`. Los registros con marca de tiempo lo enseñan: `before: mkdtemp → after raíz`, a los 9 ms. Después el `before` abre el servidor y Chromium, y ya nadie los cierra.

Una búsqueda por número de línea del filtro lo confirmó:

- Cualquier prueba **antes** de esa línea (312, 862, 1296, 1308 y el bucle de 1343): `before … fin → after raíz`, el orden de siempre.
- Cualquier prueba **después** (1354 a 2038): `before: mkdtemp → after raíz`.

Sin filtro (la CI y `npm run test:componentes`) la primera prueba ya está esperando al `before` y el orden sale bien. Por eso en la CI nunca falló.

**El arreglo:** `MEDIR` se lee dentro del `before`, con un comentario que explica por qué. Ningún otro de los 48 archivos de componentes tiene un `await` suelto entre pruebas. Los dos que tienen uno arriba (`Imagen`, línea 16; `HojaLugares`, línea 27) lo tienen antes de la primera prueba y no les afecta.

**Lo que no sirve:** se probó `--test-force-exit`. «Pasa», pero en 156 ms: sale antes de correr la prueba, porque la raíz ya se había dado por terminada. Sería un verde falso. No se usa.

Después del arreglo, la misma orden (más la prueba que usa `MEDIR`): `# tests 3, # pass 3`, salida 0, `descendientes vistos: 25 (node×1, esbuild×1, chrome-headless-shell×23)`, **ningún descendiente vivo 3 s después**.

## `medir` y `test:componentes` completos, vigilados

Con el mismo vigilante, en este árbol y con las dos piezas.

**Antes**, `ps -axo pid,ppid,etime,command | grep -E "agent-a98276fc17162eaf5|chrome-headless-shell|next start|respaldo-local"`: vacío.

**`npm run medir`:**

```
medidas: 35 pantallas × 4 anchos en 464 s, sin novedades
[medir] salida 0; descendientes vistos: 737 (node×14, next-server×1, Google×583, …)
[medir] ningún descendiente sigue vivo 3 s después
```

Ese script ya cerraba bien: el respaldo local y `next start` son hijos directos con `spawn` sin `detached`. `next start` no abre nietos: se renombra a sí mismo `next-server`. El script los mata en `finally` y en `process.on("exit")`, y cierra el navegador en `finally` aunque falle una medición. No hacía falta tocarlo.

**`npm run test:componentes`:**

```
# tests 523 · # pass 522 · # fail 1
[componentes] salida 1; descendientes vistos: 878 (node×49, esbuild×48, chrome-headless-shell×580, …)
[componentes] ningún descendiente sigue vivo 3 s después
```

El fallo fue `Confirmacion.componentes.test.mjs`, «antes de irse se desliza…», por `waitForFunction` agotado a los 8 s. Esta rama no toca ese archivo. Corrido solo pasa 9 de 9. A la vez corrían en la Mac las pruebas de componentes de otro árbol (`agent-a6fe6af15bdf4e6d6`). Es una prueba de tiempos sensible a la carga, no un cambio de esta pieza.

**Después**, el mismo `ps`: ningún proceso de este árbol. Sí apareció un `chrome-headless-shell` de la corrida en curso de ese otro árbol.

## Pruebas

- `npm run lint`: 0 errores (1 aviso que ya estaba, `VisorImagen.componentes.test.mjs`).
- `npm run typecheck`: limpio.
- `npm test`: 185 archivos, 3348 pruebas, todas en verde.
- `npm run inventario`: sin novedades.
- `npm run medir`: 35 pantallas × 4 anchos, sin novedades.
- `npm run test:componentes`: 522 de 523. El fallo es el de `Confirmacion` descrito arriba, que pasa corrido solo.
- `npm run test:db` (de OL-343, en la misma rama): 91 migraciones, 1925 pruebas, 0 fallos.
- El arreglo de `AltaEvento`: la orden que dejaba el proceso vivo ahora sale sola (3 de 3) y sin descendientes vivos.

## Para el gestor

- Sin migraciones ni variables de entorno. La primera corrida del PR comprobará el paso nuevo. Si apt vuelve a colgarse, debe salir un `::warning::` por intento y un verde al reintentar, o un rojo en 15 min.
- Cerrar a mano los procesos viejos de los árboles `agent-aae51d6b0d3eb33a3`, `agent-a57c3c77bd9db154b` y `agent-a54c0f41aa6ee9793` (pid 82153/82155, 83032/83035, 91691/91693, 91949/91951, 29965, 80305, y sus Chrome). Ignoran `SIGTERM`: hace falta `kill -9`.
- Sin council, workflows ni agentes; nada en producción.
