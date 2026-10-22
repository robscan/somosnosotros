# 481 · Higiene de pruebas inestables: el teclado de la ficha del Showcase, «Ver el evento» y el Chromium de la CI (OL-449)

**Fecha:** 2026-10-22. **Rama:** `higiene-pruebas`, desde `origin/main` (`618380a5`). **Operador:** agente de la pieza (Claude) para el
Gestor VII, sin otros agentes. **Migración:** ninguna. **Variables de entorno:** ninguna. **Pantallas:** ninguna cambia de aspecto; un cambio
mínimo de tiempos en `ui/useAreaVisible` (ver el punto 4). **Estado:** lista para la revisión del gestor.

## El pedido

El founder: «Arregla con piezas de higiene». Tres pruebas fallaban a veces sin que el código estuviera mal y ya habían detenido tres
publicaciones (cada «publica» pide los cuatro trabajos de GitHub Actions en verde). Regla del encargo: arreglar la causa, sin `skip`, sin subir
tolerancias y sin reintentos que oculten un fallo real.

## 1. `npm run medir`: el teclado en la ficha del Showcase (s38, «notas»)

**Síntoma.** Una de cada varias corridas completas: `teclado · s38-admin-showcase-ficha · notas — (ventana) fuera del área visible de 508 px`.
Al repetir, pasaba (bitácora 467, y las publicaciones que se detuvieron).

**Reproducción.** Un arnés de una sola vez (copia del medidor que no se guardó en el repo) corría solo la comprobación del teclado de s38, 30 veces
en cada una de las dos maneras (`ventana` y `area`), con la app compilada una vez y la CPU de la Mac llena con 14 procesos `yes` (como un
ejecutor de la CI cargado). Cada corrida anotaba dónde quedó el campo y el `scrollY`.

**Causa.** La prueba, no la app. `asentar` daba la página por quieta tras 12 cuadros sin cambio de `scrollY`. El campo de notas está al final de
una ficha larga, así que `useCampoVisible` lo trae con un desplazamiento suave de unos 2 500 px. Con la máquina cargada pasaban dos cosas:
- el desplazamiento suave empezaba tarde: los 12 cuadros pasaban con `scrollY` en 0 y se medía con la página en 9 o 23 px;
- o se quedaba quieto varios cuadros a medio camino: se medía en 1 112, 1 449, 1 579 o 1 784.

En las dos, el campo seguía abajo (2 811 a 2 899 en un área de 508) o bajo otro renglón. Cuando se deja terminar, la página siempre acaba en
2 576 con el campo en 258–346, sin nada encima: la app hace lo correcto.

**Arreglo** (`scripts/ops/auditoria-ui/medir-pantallas.mjs`, `asentar`). La página está asentada solo cuando se cumplen las tres cosas:
1. pasó el rato en que `useCampoVisible` todavía vigila y corrige después del foco (`VIGILA_MS`, 1 200 ms; es copia del número del hook);
2. no hay ningún desplazamiento en curso: cada `scroll` de la página o de una hoja espera su `scrollend`;
3. ni la página ni el campo enfocado se movieron en 12 cuadros seguidos. Antes solo se miraba la página; ahora también el campo, que cubre una
   hoja que se desplaza sola.

A los 6 s se mide tal como esté la página: si el campo no quedó a la vista, la prueba falla igual. No se cambió ninguna tolerancia, excepción ni
presupuesto.

**Conteo** (s38, 30 × 2 maneras, CPU llena):

| | fallan |
|---|---|
| antes | **19 de 60** (ventana 13, area 6) |
| después | **0 de 60** (las 60 en 258–346, `scrollY` 2 576) |

Sin carga, antes y después: 0 de 60. Con el arreglo, las 12 pantallas con campos de texto, 3 veces cada una y de las dos maneras (72), sin
novedades. `npm run medir` completo pasa de 159 s a 169 s: 12 campos × 2 maneras esperan como mucho 1,2 s cada uno, repartidos en 4 hilos.

## 2. Componentes: «OL-365: «Ver el evento», tocado en su sitio…» (`AltaEvento`)

**Síntoma.** `page.waitForURL: net::ERR_HTTP_RESPONSE_CODE_FAILURE` (bitácoras 452, 464, 470, 478 y 479; en algunas «falla igual aislada»).

**Causa.** La prueba. El toque va a `/eventos/lectura-en-voz-alta-ab11` y el servidor de prueba contesta un 404 sin cuerpo. Chrome cambia ese 404
vacío por su página de error y `waitForURL` lo da como fallo de navegación. Con el Chrome de la Mac (`CHROME_EXECUTABLE`) pasa siempre. Con el
«headless shell» de la CI, solo según quién llegue antes, la espera o la página de error.

**Arreglo.** La prueba contesta la ficha de destino con una página mínima (`page.route("**/eventos/**")`, 200) antes del toque. Lo que se comprueba
no cambia: el toque real en el centro del botón lleva a la ficha del evento publicado.

**Conteo** (la prueba sola, 20 veces):

| | Chrome de la Mac | headless shell (CI) |
|---|---|---|
| antes | **20 de 20 fallan** | 0 de 30 (no se reprodujo en la Mac) |
| después | **0 de 20** | 0 de 20 |

## 3. CI: instalar Chromium (`.github/workflows/ci.yml`, trabajo «interfaz»)

**Síntoma.** El paso «Chromium y sus dependencias del sistema» se agota (3 intentos de 4 min). La corrida de `main` de hoy (`39841615977`) cayó
así.

**Causa** (en el registro de esa corrida). apt no estaba colgado: estaba lento. La imagen de GitHub ya trae todas las bibliotecas de Chromium.
Lo que `--with-deps` descarga en cada corrida son **9 paquetes de fuentes** (fonts-freefont-ttf, fonts-ipafont-gothic, fonts-tlwg-loma-otf,
fonts-unifont, fonts-wqy-zenhei, xfonts-cyrillic, xfonts-encodings, xfonts-scalable y xfonts-utils, unos 20 MB) y 8 actualizaciones que no hacen
falta. Ese día el espejo de Azure servía a ~50 kB/s, y 5,6 MB de `fonts-freefont-ttf` tardaron más de 4 minutos.

**Arreglo.** Caché de GitHub para el navegador y los `.deb`, y apt solo si falta algo:
- **Clave:** `chromium-<ImageOS>-pw<versión de playwright-core>-v1` (hoy `chromium-ubuntu24-pw1.63.0-v1`). Se calcula en un paso, porque
  `ImageOS` es una variable del ejecutor y `env.` no la ve.
- **Caché:** `actions/cache/restore@v5.0.5` y `actions/cache/save@v5.0.5`, versión exacta, sobre `~/.cache/ms-playwright` y
  `~/.cache/debs-chromium`. Se guarda en cuanto queda instalado y no al final del trabajo. El `post` de actions/cache solo guarda si todo el
  trabajo pasa, y una rama con una prueba roja no guardaría nunca.
- **`scripts/ops/ci-chromium.sh`** (nuevo):
  1. `playwright-core install --only-shell chromium`, sin apt. Con la caché llena ya está, no descarga nada.
  2. Pregunta a playwright-core qué le falta al sistema (`install-deps --dry-run chromium-headless-shell`, que no toca nada). De esa lista solo
     cuenta lo que no está instalado; lo que solo tiene una versión más nueva no hace falta.
  3. Lo que falta lo instala con `dpkg -i` desde los `.deb` de la caché, sin red, y solo los paquetes que no están instalados (nunca baja de
     versión lo que ya hay). Si algo no está en la caché (la primera vez, o si cambió la imagen o la versión), corre `apt-get update` e `install`
     solo de lo que falta, con el tope y los reintentos de antes (OL-344). Los `.deb` quedan en la carpeta de la caché.
  4. Al final vuelve a preguntar. Si falta algo, el paso falla.
  5. Si apt no sabe simular (por ejemplo, sin listas), hace la instalación completa de siempre.

**Qué esperar en el PR** (no se puede probar fuera de GitHub: aquí no hay Linux ni contenedores; la sintaxis del script y del YAML sí se
comprobaron):
- **Caché vacía** (la primera corrida del PR, y la primera de `main` después de unirlo): como hoy, ~20–40 s con un espejo normal, más ~10 s
  para guardar la caché (unos 200 MB sin comprimir: el navegador y 20 MB de fuentes). Si ese día el espejo va lento, puede caer igual que antes, pero solo hasta que una corrida la llene.
- **Caché llena:** sin apt ni red de Ubuntu. Restaurar ~5–10 s, `dpkg -i` de 9 fuentes ~5–10 s, en total ~15–25 s y sin depender del espejo.
- Las cachés de un PR solo las ve ese PR. Las de `main` las ven todos los PR. Hasta que `main` corra con esto, cada PR llena la suya en su
  primera corrida.
- En el registro: «Instalando 9 paquetes guardados en la caché.» y «Chromium y sus dependencias listos.». Con caché vacía, las líneas de apt
  como antes.
- La clave cambia sola al subir playwright-core o cambiar de Ubuntu. Para forzar una caché nueva se sube el `-v1`.

## 4. Las otras intermitentes que pedía revisar

- **`ui/CampoLargo`, «el teclado ya estaba abierto al tocar el renglón»** (bitácora 451). **Causa en la app**, pequeña: `useAreaVisible` medía
  el área visible en `useEffect`. La capa de texto largo entraba al DOM con el CSS de siempre (`top` 0, arriba de la ventana y fuera de la vista
  con el teclado abierto) y se pintaba así al menos un cuadro antes de bajar al área visible. Se midió con una sonda temporal: al entrar al DOM y
  en el primer cuadro, `top` 0. La prueba solo pasaba si React la movía antes de que Playwright mirara.
  **Arreglo mínimo:** `useLayoutEffect` en lugar de `useEffect` (`src/components/ui/useAreaVisible.ts`, una línea). La capa nace en 43 y no se
  pinta en otro sitio. Lo usan `ui/CampoLargo` y `ui/Hoja`; las 719 pruebas de componentes y `medir` siguen sin novedades. La prueba ahora mira
  dónde nace la capa al entrar al DOM: falla siempre con `useEffect` (comprobado) y pasa con `useLayoutEffect` (20 de 20). Con React 19 no hay
  aviso de `useLayoutEffect` en el servidor.
- **«Seguir no se atenúa»** (`BotonesSinParpadeo`) y **«documento route timeout»** (`DocumentoPdf`): **no se reprodujeron**. La suite completa
  pasó 7 veces sin fallos: 3 normales, 2 con 14 procesos `yes`, 2 con 42, y 1 más con el Chrome de la Mac (719 de 719 cada vez). Sin un fallo
  que mirar no se tocaron. Lo único que depende del tiempo en «Seguir» es pedir más de 20 cuadros en 700 ms (`sinParpadeo`). Si vuelve a fallar,
  conviene guardar el mensaje exacto.

## Verificación

- `npm run lint`, `npm run typecheck`: sin errores. `npm test`: 279 archivos, **4 594 pruebas**, todas bien.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **2 359 pruebas, 0 fallaron**.
- `npm run inventario`: sin novedades. `npm run medir`: 53 pantallas × 4 anchos, **sin novedades** (169 s).
- `npm run test:componentes`: **719 de 719** con el headless shell, y 719 de 719 con el Chrome de la Mac. Antes, con ese Chrome, fallaba la de
  OL-365.
- Sin captura móvil: nada cambia de aspecto. La evidencia son los conteos de arriba.

## Archivos

- `scripts/ops/auditoria-ui/medir-pantallas.mjs`: `asentar` y `VIGILA_MS`.
- `src/app/nuevo/evento/AltaEvento.componentes.test.mjs`: la ficha de destino contestada en la prueba de OL-365.
- `src/components/ui/useAreaVisible.ts`: `useLayoutEffect`.
- `src/components/ui/CampoLargo.componentes.test.mjs`: dónde nace la capa.
- `.github/workflows/ci.yml` y `scripts/ops/ci-chromium.sh` (nuevo): la caché de Chromium.

Fuera de esta pieza: `src/lib/rutinas/*` y `scripts/instituciones/*` (OL-448) no se tocaron.
