# 191 · Inicio, segunda vuelta: raíz, carriles ponderados y Agenda simplificada (OL-156)

**Fecha:** 2026-09-23 · **Rama:** `inicio-segunda`, desde `origin/main` (`eddcaf0`, merge de PR #188) · **OL:** OL-156 · **Modelo:** Sonnet 5. Sin council, workflows ni subagentes (costo). Código, sin migraciones.

## De dónde sale

El founder decidió la segunda vuelta del Inicio (OPEN_LOOPS, 2026-09-23, «Decidido»): la app abre siempre en Inicio (raíz del dominio); Agenda pasa a `/agenda` con redirección permanente de los enlaces viejos; Agenda queda como lista directa con Todos y Siguiendo, sin la tira de destacados ni las pestañas Cercanos y Nuevos (esas dos viven en Inicio como carriles); el carril estelar «De tus favoritos» va ponderado y con tope, y sustituye al carril de destacados de la primera vuelta; siete carriles intercalados; espaciado mayor entre la barra de título y el carril, y entre carriles. A media tarde, con la pieza ya en marcha, el gestor sumó un segundo encargo: el founder probó Inicio en producción y pidió carga progresiva con esqueletos, en vez de esperar todas las consultas con el logo al centro (`app/loading.tsx`).

Leído: `CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-156 y la línea «Decidido» del 2026-09-23 en `docs/ops/OPEN_LOOPS.md`, `docs/rediseno/41-inicio-personalizado.md`, la bitácora [188](./188-inicio-app.md) (lo que ya existía de la primera vuelta), y el código de partida: `src/app/inicio/page.tsx`, `src/app/page.tsx`, `src/lib/inicio.ts`, `src/components/Inicio.tsx`, `src/components/AgendaInicio.tsx`, `src/components/Destacados.tsx`, `src/lib/cargarAgenda.ts`, `src/lib/cargarEventosSemana.ts`, `src/lib/destacados.ts`, `src/lib/artistas.ts`, `src/app/manifest.ts`, `src/proxy.ts`, `src/lib/sitemap.ts`, `next.config.ts`.

## Qué se construyó

### 1. Rutas

- `src/app/page.tsx` es ahora Inicio (antes era Agenda); `src/app/agenda/page.tsx` es la Agenda de siempre, movida (con su `agenda.module.css`, antes `src/app/inicio.module.css`). `src/app/inicio/` se borró entero.
- `next.config.ts`, `redirects()`: `/inicio` → `/` (308); `/` con `?filtro=` o `?q=` (los deep-links viejos de la Agenda cuando vivía en la raíz) → `/agenda`, con el resto de parámetros intactos (comportamiento de Next: lo que no se nombra en `destination` viaja solo). Sin esto, un enlace guardado a `/?filtro=siguiendo` habría caído en Inicio sin hacer nada con ese parámetro.
- `src/lib/sitemap.ts`, `RUTAS_ESTATICAS`: se añade `/agenda`; las dos son indexables con su propio título y descripción (`generateMetadata` de cada página). `src/lib/sitemap.test.ts` actualizado.
- `src/components/NavInferior.tsx`: Inicio → `/`, Agenda → `/agenda` (antes al revés). La lógica de "última URL de la sección" no tenía nada de la Agenda escrito a mano: solo comparaba contra `href`, así que no hubo que tocarla.
- Enlaces internos corregidos a `/agenda`: `src/app/error.tsx`, `src/app/not-found.tsx`, `src/components/ActividadPersona.tsx`, `src/components/AgendaInicio.tsx` (Entrar desde Siguiendo). El logotipo (`ui/Logotipo.tsx`) ya decía "ir al inicio" apuntando a `/`: con el cambio de ruta, el comentario pasó de ser una forma de hablar a ser literalmente cierto, sin tocar el componente.

### 2. Agenda simplificada

`src/components/AgendaInicio.tsx`: se quitó la tira de destacados de arriba, las pestañas Cercanos y Nuevos, sus estados (`cercanos`, `nuevos`, `corte`, `huboVisita`, `selloNuevos`, geolocalización, `cargarNuevos`/`cargarCercanos`) y sus vacíos por causa. `src/lib/agenda.ts`, `FILTROS`, queda con Todos y Siguiendo; el tipo `Filtro` conserva "cercanos" y "nuevos" como valores (los usan `filtrarAgenda` y los carriles de Inicio) pero ya no son pestañas — un `filtroInicial` con cualquier valor que no sea "siguiendo" cae a Todos, así que un enlace viejo a `?filtro=cercanos`/`?filtro=nuevos` no rompe nada aunque llegue. La memoria de pantalla (`useMemoriaPantalla("agenda", …)`) sigue igual, con menos campos que recordar.

No se tocaron `src/lib/cargarNuevos.ts`, `src/lib/nuevosVisto.ts` ni sus pruebas: quedan sin usar desde Agenda (la pestaña Nuevos ya no existe), pero borrarlos era ampliar el encargo; queda anotado en "Lo que falta". El arnés de pruebas de navegador `src/components/nuevos.componentes.test.mjs` (no forma parte de `npm test`, usa `node:test` con un bundle propio) ejercita esa pestaña ya retirada y quedará desactualizado hasta que alguien lo toque o lo borre.

### 3. Carril estelar ponderado (`src/lib/inicio.ts`)

- `carrilEstelar(favoritos, idsDestacados, vistos)`: ordena por destacado, luego por «Voy» (el campo `van`), luego por fecha (`compararEventos`); tope `TOPE_ESTELAR = 12`.
- `carrilDestacadosEstaSemana(destacadosEnOrden, vistos, ahora)`: el respaldo sin favoritos — la propia tira de destacados (ya ordenada por la administración), pero solo lo de esta semana, para que el nombre «Destacados esta semana» sea cierto.
- `tituloEstelar(hayFavoritos)`: "De tus favoritos" / "Destacados esta semana".
- `carrilNuevos(eventos, vistos, ahora)`: publicado en los últimos 7 días (`creado_en`), de más a menos reciente; simple a propósito, sin la memoria de última visita que tenía la pestaña Nuevos (esa pestaña se quita).
- `calcularCarrilesAgenda(agenda, ahora)`: los tres carriles que salen de una sola `cargarAgenda` (estelar, populares, nuevos), calculados juntos y puros, con un `Set` de vistos que se muta dentro de la misma función — nunca entre streams (ver más abajo, "Streaming").

### 4. Siete carriles, orden e intercalado

`src/app/page.tsx` arma las siete promesas (una por carril, sin `await` salvo la ciudad y la sesión) y las reparte a `src/components/Inicio.tsx` (el shell, cliente) en el orden firmado: estelar (grande) → cercanos (mediana) → lugares de la semana (chica) → artistas destacados (chica) → populares (mediana) → nuevos (mediana) → artistas de la semana (chica). Los cuatro carriles de eventos no se repiten un evento entre sí (`calcularCarrilesAgenda`); lugares y artistas no se cruzan con eventos (son otra tabla) y no se pidió deduplicarlos entre ellos dos.

«Ver todos»: los cuatro carriles de eventos abren `/agenda` (favoritos: `?filtro=siguiendo`; los otros tres, Todos); lugares y artistas destacados o de la semana abren su sección (`/lugares`, `/artistas`).

**Artistas destacados** (`src/lib/cargarArtistasDestacados.ts`, nuevo): primero la tira que elige la administración (`leerTira`, el mismo criterio que ya usa `/artistas`); sin ella, los artistas de la ciudad con más seguidores entre los que tienen un evento próximo. El founder no fijó ese criterio de respaldo con ese nivel de detalle — es la lectura de "algo razonable" del propio encargo, anotada aquí como pide la instrucción, no en OPEN_LOOPS (no es una decisión del founder). Sin migración: cuenta los `seguimientos` de los candidatos con una consulta acotada a esos ids (no hay una función agregada en la base para esto).

### 5. Espaciado (`src/components/Destacados.module.css`)

- Cabecera → carril: `--espacio-1` (4px) → `--espacio-4` (16px), los "unos 12px más" que pidió el founder.
- Entre carriles (el `padding-top` de cada bloque `.destacados`): 32px fijos — no hay un token de 32px en la escala de espaciado (llega a `--espacio-6`, 24px), así que va literal, con una nota en el CSS de dónde sale el número (el propio ejemplo del founder, "32px entre grupos frente a 12 dentro").

### 6. Carga progresiva (streaming del App Router)

Pedido del gestor a media tarde, tras la prueba del founder en producción: "Inicio no usa skeletons con carga progresiva; tarda un rato con el logo al centro antes de verse algo".

- `src/app/page.tsx` ya no espera ninguna de las siete consultas: solo la ciudad y la sesión (rápidas). Cada carril es un componente de servidor propio (`src/components/inicio/CarrilAgenda.tsx`, `CarrilEntidad.tsx`) que recibe su promesa sin resolver y la espera por su cuenta, dentro de su propio `<Suspense>` (declarado en `Inicio.tsx`).
- Los tres carriles que comparten una sola `cargarAgenda` (estelar, populares, nuevos) reciben la MISMA promesa y cada uno llama a `calcularCarrilesAgenda` completo, quedándose solo con su parte: así cada `<Suspense>` es independiente de verdad (no depende de en qué orden resuelvan los otros dos) sin repetir la consulta a la base ni compartir un `Set` mutable entre streams que dependería de la carrera de JavaScript. El coste es recalcular una función pura sobre, como mucho, 300 filas ya en memoria — tres veces en vez de una — no una consulta de más.
- Cercanos (`src/components/inicio/CarrilCercanos.tsx`) sigue siendo enteramente de cliente (pide una ubicación cacheada, nunca permiso desde Inicio); recibe la lista de ids que ya usaron los otros carriles como una promesa (`excluirDeCercanosPromise`) y la desenvuelve con `use()`, dentro de su propio `<Suspense>`.
- `src/components/CarrilEsqueleto.tsx`: el `fallback` de cada `<Suspense>`, con el mismo alto que el carril real, en sus tres tamaños (grande/mediana/chica); título y tarjetas son bloques grises que respiran (`prefers-reduced-motion` los deja quietos), nunca texto real (el título del carril estelar no se conoce hasta que llega el dato).
- Un carril vacío no deja hueco: `src/components/Destacados.tsx` ya no hace `return null`, pinta una sección `.vacio` que colapsa de su alto reservado a 0 con una transición corta (`Destacados.module.css`, `@starting-style` + `transition-behavior: allow-discrete` — soportado en Safari/iOS desde la 17.5, muy por debajo de lo que corre el founder). Sin JavaScript de animación de salida: el propio cambio de Suspense-fallback a contenido real ya es una "entrada" para ese nodo a ojos del navegador, y `@starting-style` es exactamente la herramienta pensada para eso.
- Sin `loading.tsx` de página completa para esta ruta: como `page.tsx` ya no espera nada antes de devolver JSX, Next nunca llega a mostrar el cargador de `app/loading.tsx` para `/` — no hizo falta ningún archivo nuevo ni excluir la ruta de nada, es consecuencia directa de que la página ya no se suspende a sí misma.

**Medición** (arnés temporal con retraso artificial en cada promesa, sin Supabase — ver "Verificación"): con `next start`, contra la MISMA carga simulada, la versión progresiva pinta el shell en ~130-160 ms (`time_starttransfer`) mientras el carril más lento tarda 2.2 s; la versión "antes" (un solo `Promise.all`, como estaba hasta hoy) no puede pintar nada hasta que termina, así que su primer byte útil llega junto con el total, ~2.2-2.3 s. `time_total` de las dos rondas de curl coincide (~2.2-2.3 s): la carga de trabajo simulada es la misma, la diferencia es cuándo se ve algo.

## Pruebas (`src/lib/inicio.test.ts`, `src/lib/cargarArtistasDestacados.test.ts`)

24 pruebas nuevas: orden y tope del carril estelar (destacado, «Voy», fecha; tope 12; no repite lo ya visto), el título según haya o no favoritos, la ventana de "nuevos" (7 días exactos, orden por publicación), y `calcularCarrilesAgenda` completo — con favoritos, un evento que calificaría para dos carriles solo sale en el primero, y el respaldo de "Destacados esta semana" sin favoritos. Aparte, el orden por seguidores del respaldo de artistas destacados (`ordenarPorSeguidores`), con su tope.

## Verificación

`npm run lint` (1 advertencia preexistente, sin relación, en `docs/diseno/logotipo/iconos-sn.mjs`), `npm run typecheck` y `npm test` (1099 pruebas, 86 archivos, las 24 nuevas incluidas) en verde; `npm run build` verde (`/` y `/agenda` en la tabla de rutas, sin `/inicio`).

**Redirecciones** (`next start`, puerto 4193, `curl -sI`):
```
GET /                          → 200
GET /inicio                    → 308, Location: /
GET /agenda                    → 200
GET /?filtro=cercanos          → 308, Location: /agenda?filtro=cercanos
GET /?filtro=siguiendo         → 308, Location: /agenda?filtro=siguiendo
GET /?filtro=nuevos            → 308, Location: /agenda?filtro=nuevos
GET /?q=jazz                   → 308, Location: /agenda?q=jazz
GET /agenda?filtro=cercanos    → 200 (la pestaña ya no existe; AgendaInicio cae a Todos)
```

**Capturas reales** (`docs/rediseno/capturas-191/`), `next build && next start`, Chrome real de la Mac vía `playwright-core` (instalado en el scratchpad, nunca en el repo; `package.json`/`package-lock.json` intactos, comprobado con `git status`), 390×844 a `deviceScaleFactor: 2`, `document.fonts.check('700 20px "Bricolage Grotesque"')` → `true` en las cinco que pintan texto. Arnés temporal `src/app/arnes191-temporal/` (datos inventados, sin Supabase — no hay uno configurado en este árbol de trabajo), borrado entero antes de comitear (comprobado con `git status`).

- **`01-inicio-con-sesion.png`:** Inicio con sesión y favoritos — carril "De tus favoritos" (grande): primero el evento destacado (32 van), luego por «Voy» descendente; debajo, "Lugares con eventos esta semana" (chica, redonda) con el botón Sigues en verde donde ya corresponde.
- **`02-inicio-sin-sesion.png`:** sin sesión, sin carril de favoritos; tarjeta de invitación "Sigue lugares y artistas" arriba, y el respaldo "Destacados esta semana" con el único evento destacado.
- **`03-inicio-completa-siete-carriles.png`:** página completa — los siete carriles en el orden firmado (Cercanos no se ve: sin ubicación cacheada en el arnés, colapsa como cualquier carril vacío), con populares (21 van) y nuevos (publicado hace 5 días, 2 van) mostrando la deduplicación real contra favoritos.
- **`04-agenda-todos.png`** y **`05-agenda-siguiendo.png`:** Agenda con solo Todos/Siguiendo, sin tira de destacados arriba.
- **`06-inicio-esqueletos-a-medio-cargar.png`:** a 600 ms de iniciada la carga (con el retraso artificial de 2.2 s en el carril más lento), la cabecera y la barra ya están, y dos carriles siguen en su esqueleto (uno grande, uno mediano).

Antes de entregar: `git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` sin correos reales (solo "analytics@2.0.1", del `package-lock.json`, que es una versión de paquete, no un correo).

## Lo que falta / no se inventó

- `src/lib/cargarNuevos.ts`, `src/lib/nuevosVisto.ts` y el arnés de navegador `src/components/nuevos.componentes.test.mjs` quedan huérfanos de la pestaña Nuevos que se retiró de Agenda; no se tocaron por no ampliar el encargo. Si el gestor quiere, se limpian en una pieza aparte.
- El criterio de respaldo de "Artistas destacados" (más seguidores con evento próximo) es una lectura razonable del encargo, no una decisión del founder; si prefiere otro, se ajusta sin tocar el resto.
- Cercanos no se vio poblado en las capturas de esta pieza (necesita una ubicación cacheada en el teléfono, y este arnés no la simula); ya se vio real en la bitácora 188.

## Archivos

Nuevos: `src/app/agenda/page.tsx`, `src/app/agenda/agenda.module.css`, `src/lib/cargarArtistasDestacados.ts`, `src/lib/cargarArtistasDestacados.test.ts`, `src/components/CarrilEsqueleto.tsx`, `src/components/CarrilEsqueleto.module.css`, `src/components/inicio/CarrilAgenda.tsx`, `src/components/inicio/CarrilEntidad.tsx`, `src/components/inicio/CarrilEntidadCliente.tsx`, `src/components/inicio/CarrilEventosCliente.tsx`, `src/components/inicio/CarrilCercanos.tsx`, `docs/rediseno/capturas-191/` (6 PNG), esta bitácora.
Tocados: `src/app/page.tsx` (ahora Inicio), `src/components/Inicio.tsx`, `src/components/AgendaInicio.tsx`, `src/components/Destacados.tsx`/`.module.css`, `src/components/NavInferior.tsx`, `src/lib/agenda.ts`, `src/lib/inicio.ts`/`.test.ts`, `src/lib/sitemap.ts`/`.test.ts`, `next.config.ts`, `src/app/error.tsx`, `src/app/not-found.tsx`, `src/components/ActividadPersona.tsx`, `docs/ops/OPEN_LOOPS.md`.
Borrados: `src/app/inicio/page.tsx`, `src/app/inicio.module.css`.

## Qué falta

Segunda prueba del founder en su iPhone (Safari). Commit local en `inicio-segunda`, sin push; a revisión del gestor.
