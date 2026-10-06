# 340 · El alta por pasos es la única alta de evento

**Pieza:** OL-312 (pieza 6 del plan de la bitácora 323). **Rama:** `nuevo-por-pasos` (sobre `origin/main` `e3b4a1c2`). **Fecha:** 2026-10-06. **Operador:** Claude Opus 5.5 (agente del gestor IV).
**Estado:** hecho y probado en Chrome (headless) con los componentes reales y con la app compilada contra el respaldo local; falta el iPhone real (lista al final). Sin migraciones.

## Qué se encargó

Que toda la gente publique eventos con el flujo por pasos (`/nuevo/evento`) y retirar el formulario viejo de alta: `/nuevo` redirige los eventos, `/nuevo/evento` acepta `lugar`, `artista`, `desde` y `ciudad`, todos los enlaces apuntan directo ahí, `FormularioEvento` se queda solo para editar y `Alta` solo con lugar y artista.

## Qué cambia para la gente

- **El «+» de Inicio y Agenda, «Publicar un evento aquí» (ficha de un lugar), «Publicar una fecha» (ficha de un artista) y «Duplicar con otra fecha» (ficha de un evento propio) abren el flujo por pasos.** Ya no existe la pantalla de un solo formulario para publicar un evento.
- **Desde la ficha de un lugar** el lugar ya está puesto: «¿Dónde es?» no se pregunta y «Revisa» lo enseña (con «Cambiar»). La ✕ del primer paso vuelve a la ficha del lugar.
- **Desde la ficha de un artista**, Quién empieza con él. La ✕ vuelve a su ficha.
- **Duplicar** entra directo en «¿Qué día es?» con el nombre, el lugar, el costo, quién, la descripción y el enlace del evento. Solo se contestan el día y la hora. Atrás lleva al primer paso, por si se quiere subir otro cartel. El cartel del evento original no se copia. La ✕ vuelve al evento.
- **En «Registrar un lugar» / «Registrar artista»** la tira de abajo sigue igual (Evento · Lugar · Artista), pero «Evento» ahora lleva al flujo por pasos en vez de cambiar de formulario. Si hay algo escrito, primero pregunta «¿Salir sin publicar?».
- **La ficha de un evento recién publicado ya no lleva el aviso «Publicado. Ya está en la agenda.»** (`?nuevo=1`): lo usaba solo el alta vieja, y el flujo por pasos termina en su propia pantalla «Evento publicado». Las fichas de lugar y de artista conservan su aviso.
- **Editar un evento no cambia** (mismo formulario, misma hoja «¿Dónde es?», mismo selector de fecha).

## Parámetros de `/nuevo/evento`

Todos opcionales; lo ilegible se ignora (un id que no es UUID o que no aparece). Sin sesión, `/entrar?siguiente=` con la misma dirección completa. La lógica pura vive en `src/app/nuevo/evento/arranque.ts` y la página solo lee y la llama.

- `lugar=<id>`: solo si el lugar está entre los del directorio que se pueden elegir (los visibles, más los privados de la cuenta por RLS). Contesta el sitio con `sitioDeLugar` (`{ modo: "lugar", lugarId }`; un lugar privado de la cuenta va como sitio reservado, como ya hacía «¿Dónde es?»). `faltan` ya no incluye «donde».
- `artista=<id>`: se lee `artistas (id, nombre)` como antes en `/nuevo`; Quién = `[artista]` (en lugar del artista propio de la cuenta, como antes con `quienInicial`).
- `desde=<id>`: se lee el evento con la sesión de quien entra (la misma consulta y los mismos permisos que tenía `cargarArmado` de `/nuevo`: lo que la política de lectura deja ver, sin otra comprobación; el menú «Duplicar» solo lo ven su autor y la administración) y sus artistas (`cargarQuien`). Las respuestas arrancan con nombre, sitio, costo (`$150` → precio 150; sin precio → gratis; «Cooperación solidaria» → cooperación), quién, descripción y enlace; el flujo entra en el primer paso que falte (el día), con el primer paso («Sube el cartel») detrás.
- `ciudad=<slug>` → `ciudadContexto`, como antes.
- Con `desde` y `lugar` a la vez manda el evento. `lugar` y `artista` juntos ponen las dos cosas.

## Enlaces

| Dónde | Antes | Ahora |
|---|---|---|
| «+» de la barra en Inicio/Agenda/fichas de evento (`lib/armazon.ts` `enlaceDeAlta("evento")`) | `/nuevo?tipo=evento[&ciudad=]` | `/nuevo/evento[?ciudad=]` |
| «Publicar un evento aquí» (`lugares/[id]/CuerpoLugar.tsx`) | `/nuevo?lugar=` | `/nuevo/evento?lugar=` |
| «Publicar una fecha» (`artistas/[id]/page.tsx`) | `/nuevo?artista=` | `/nuevo/evento?artista=` |
| «Duplicar con otra fecha» (`eventos/[id]/page.tsx`) | `/nuevo?desde=` | `/nuevo/evento?desde=` |
| «Agregar un evento donde estás» (`lib/ciudad.ts`, hoja de ciudades) | `/nuevo?tipo=evento` | `/nuevo/evento` |
| «Publicar otro evento» tras borrar, `sesionOEntrar` de `crearEvento` (todos vía `enlaceDeAlta`) | `/nuevo?tipo=evento` | `/nuevo/evento` |
| «Evento» en la tira de `/nuevo` | botón | enlace a `/nuevo/evento[?ciudad=]` |

`enlaceAltaEvento({ lugar, artista, desde, ciudad })` (nuevo, `lib/armazon.ts`) arma todas esas direcciones en un orden fijo y sin lo vacío. **Redirección:** `/nuevo` sin tipo, con `tipo=evento` (o un tipo desconocido) o con `lugar`/`artista`/`desde` responde **308** a `/nuevo/evento` con `lugar`, `artista`, `desde` y `ciudad` (`redireccionDeNuevo`). Va en `src/proxy.ts`, como el 308 de las fichas con UUID: desde la página, con la transmisión ya empezada por el `loading.tsx` raíz, el código salía 200 con la redirección dentro del HTML (lo vi con `fetch` contra `next start`: `200` sin `Location`). La página repite la misma redirección (`permanentRedirect`) como respaldo. Con el proxy: `curl`/`fetch` de `/nuevo`, `/nuevo?tipo=evento&ciudad=…`, `/nuevo?lugar=…` y `/nuevo?desde=…` contestan `308` con su `Location`. **Vuelta tras entrar** (`lib/entrar.ts`): «Volver» de Entrar con `/nuevo/evento?lugar=` va a la ficha del lugar; con `?artista=`, a la del artista; si no, al inicio.

## Qué se borra y por qué

Enumerado antes de borrar (regla del encargo). Nada de esto lo usa editar ni el flujo por pasos:

- **`src/app/eventos/TarjetaCartel.tsx`**: la tarjeta «Sube el cartel» del alta vieja; solo la pintaba `FormularioEvento` en modo alta.
- **`src/app/eventos/borrador.ts`**: el borrador del alta en el teléfono (solo volvía al regresar de «Registrar un lugar nuevo»; `avisarQueVuelvo` ya no tenía quien lo llamara desde OL-173). Solo alta.
- **`src/app/eventos/cupo.componentes.test.mjs`** (13 pruebas): probaban la tarjeta del cartel y el cupo de lecturas dentro del alta vieja. El cupo del alta por pasos ya lo prueban las pruebas de la casilla «Lectura automática» de `AltaEvento.componentes.test.mjs` (casilla agotada, singular, sin tope, sin saber el cupo, resta tras leer, «ya no hay» del servidor) y `estadoCartel.test.ts`.
- **En `FormularioEvento.tsx`**: los modos `alta` y `duplicar` (y la prop `modo`), `lugarInicial`, `cartelActivo`, `cupo`, `oculta`, la lectura del cartel (`leerCartel`, cupo y su consulta al volver a la pestaña), el borrador, la hora sugerida que seguía a la zona (`sugerida`, `resugerir`), `ponerImagen`/`imagenActual` (solo los usaba la lectura) y los «gestos» de los campos que solo servían para que el cartel no pisara lo escrito. `evento` pasa a ser obligatoria. **Se conserva intacto** lo de editar: `HojaDonde`, `SelectorCuando`, la guardia (`apartarGuardia`/`reponerGuardia`), la revisión contra conflictos, la portada/imagen y `CampoImagenUrl`, el sitio reservado y su retención, Quién, `CamposSitio`, `useEstoyAqui` y la vigencia de gestos de «Dónde» y de la imagen (`crearGestosFlyer`). `volverA` por omisión pasa de `/nuevo` a `/nuevo/evento`.
- **`estadoCartel.ts`**: `falloAlLeer`, `leido`, `AVISAR_DESDE` y `alLlegar` (solo la tarjeta y el alta vieja) y sus pruebas. Se quedan `falloAlSubir`, `falloDeCorte`, `cuandoSeRenueva`, `mesDelCupo`, `lecturaAgotada`, `lecturasQueQuedan`, `detalleDeLecturas` y `seLee` (los usan `useLeerCartel` y el renglón de lecturas del perfil).
- **`gestosFlyer.ts`**: `camposIniciales` y `DatosAlAbrir` (los campos que el cartel no debía pisar en el alta vieja) y sus 4 pruebas. En el flujo por pasos esa regla la hace `sinPisar` (abajo). Se quedan `crearGestosFlyer` (editar) y `quienTrasLeerCartel` (el flujo por pasos).
- **`lib/fechas.ts`**: `sugerirInicio` y `resugerirCuando` (la hora «hoy o mañana a las 19:00» que el alta vieja ponía de entrada) y sus pruebas. Nadie más los usaba.
- **`ui/FormularioCanon.module.css`**: la sección «1 bis» (las clases de la tarjeta del cartel: `cartel`, `textoCartel`, `marcoCartel`, `miniaturaCartel`, `cartelLeido`, `cartelSinCupo`, `cartelQuieto`, `cartelFallo`, `rehacerCartel`, `barritaCartel` y su animación). Sin uso. Medidas en duro: 342 → 334 (`npm run inventario -- --aceptar`; solo bajaron).
- **`crearEvento`** (`eventos/acciones.ts`): la redirección a la ficha con `?nuevo=1` y el campo `quedarse`. Ahora siempre devuelve lo creado (`{ ok, id, slug, href, volver }`); el alta por pasos ya no manda `quedarse`.
- **Ficha del evento** (`eventos/[id]/page.tsx`): el parámetro `nuevo` y su aviso «Publicado.» (solo lo traía el alta vieja de eventos).
- **`/nuevo`** (`nuevo/page.tsx`, `Alta.tsx`): `FormularioEvento`, `cargarArmado`, el cupo, `mios`, el título «Duplicar evento» y `olvidarBorrador`.
- **Medición**: la pantalla `s03-alta-evento` (`/nuevo?tipo=evento`) se retira con su presupuesto: ahora es un 308 a `/nuevo/evento`, que ya miden `s15`, `s16` y `s17`. La excepción de teclado del «botón «Evento»» se retira (ya no es botón: es un enlace, y la regla del teclado mira botones); las de «Lugar» y «Artista» se quedan, con el porqué al día.

## Decisiones del operador (dentro de lo firmado, dichas explícitamente)

1. **El 308 va en el proxy, no solo en la página** (ver «Enlaces»): era la única forma de que el código llegara de verdad.
2. **«Evento» en la tira reemplaza la entrada** (`replace`, sin apilar), como cambiar de tipo no apilaba antes; y pasa por la guardia si hay algo escrito en el lugar o el artista.
3. **La ✕ de un duplicado vuelve a la ficha del evento duplicado** (antes iba al lugar de ese evento o al inicio).
4. **Duplicar un evento en sitio reservado deja «¿Dónde es?» por contestar**: su dirección exacta no se lee al duplicar (como en el alta vieja, que tampoco la leía y lo dejaba sin resolver). Un sitio «otro» con nombre, dirección y punto se copia tal cual; sin punto, se pregunta. Un lugar que ya no está en el directorio, se pregunta.
5. **Un precio sin número («taquilla», «$120 a $250» da 120)** usa `extraerNumero` como editar; si no sale número, «¿Cuánto cuesta?» se pregunta (el alta vieja lo dejaba como «Con costo» vacío).
6. **Lo que vino al abrir no lo pisa el cartel** (`sinPisar`): con lugar o artista de la ficha, o lo del evento duplicado, la lectura del cartel solo pone lo demás (día, hora…). Es la misma regla que tenía el alta vieja con `camposIniciales`. Lo que vino vacío (un duplicado sin artistas) sí lo contesta el cartel.
7. **«Publicar otro» empieza de cero, sin el lugar, el artista ni el evento con que se abrió**, como ya decía la pieza 5. La ✕ sigue saliendo a la ficha de entrada.
8. **`crearEvento` deja de redirigir** y el campo `quedarse` desaparece: ya no hay otra alta.
9. **«Volver» en Entrar** lleva a la ficha del lugar o del artista desde la que se quiso publicar.
10. **Retiré también lo que solo servía al alta en `lib/fechas.ts`, `estadoCartel.ts`, `gestosFlyer.ts` y el CSS del canon** (no estaba nombrado en el encargo, pero quedaba sin uso).
11. **`SelectorCuando` no se tocó**: su prop opcional `sugeridaActual` ya no la pasa nadie en la app (era del alta vieja); la dejo porque `SelectorCuando.componentes.test.mjs` la prueba y quitarla es tocar el selector de editar.
12. **`docs/PLAN.md` y `docs/DEFINICION.md` no cambian**: describen el alta de evento en general («Duplicar evento» para los recurrentes sigue siendo cierto), no la pantalla vieja.

## Pruebas

- `npm run typecheck`, `npm run lint` (0 errores; 1 aviso que ya estaba en `VisorImagen.componentes.test.mjs`), `npm run build` en verde.
- `npm test` (Vitest): **151 archivos, 2253 pruebas, todas en verde** (en una corrida con la máquina muy cargada, carga media 45, dos pruebas de fichas de lugar y artista pasaron de su tope de 5 s; solas y en la corrida siguiente, verdes). Nuevas: `arranque.test.ts` (12: el evento duplicado, el costo, el sitio, el reservado, el arranque y el primer paso, `sinPisar`), `nuevo/page.test.ts` (8: `/nuevo` redirige antes de pedir sesión; lugar y artista se quedan; `/nuevo/evento` con cada parámetro, lo ilegible ignorado y la ✕), `proxy.test.ts` (+2: el 308 de `/nuevo`), `armazon.test.ts` (+3: `enlaceAltaEvento` y `redireccionDeNuevo`), `entrar.test.ts` (+5 aserciones). Ajustadas: `guardado.test.ts` y `direccion.acciones.test.ts` (publicar ya no redirige), `ciudad.test.ts`, `fechas.test.ts`, `estadoCartel.test.ts`, `gestosFlyer.test.ts`.
- Componentes (Playwright con el Chrome de la Mac), la suite entera `src/**/*.componentes.test.mjs`: **433 pruebas, 428 en verde a la primera**. Una era mía (la prueba de «Publicado» comprobaba el campo `quedarse`, que ya no existe; ahora comprueba que no va) y las otras cuatro (`HojaLugares`, dos de `FilaEventos` y una de `Mapa`, de animaciones y gestos con tiempo, ninguna toca esta pieza) fallaron con la carga de la máquina; esos cuatro archivos más `AltaEvento` otra vez, uno tras otro: **116 de 116 en verde**. `AltaEvento.componentes.test.mjs` +5 (`?lugar=` salta «¿Dónde es?», «Revisa» con el lugar, publica por su id y se cambia; «Publicar otro» empieza sin el lugar; `?artista=` arranca con el artista y lo publica; el cartel no pisa el lugar ni el artista de las fichas; `?desde=` entra en «¿Qué día es?» con nombre, lugar, $150 y artista, Atrás al primer paso y publica todo lo copiado). `guardiaTrasError.componentes.test.mjs` pasa a editar («Guardar cambios»: la guardia sigue tras un error); `guardado` y `ciudadSitio` ya probaban editar (solo sin `modo`). `Entrar` y `Ciudad` con las direcciones nuevas.
- `npm run inventario`: sin novedades (334 medidas en duro, aceptado). `npm run medir`: 26 pantallas × 4 anchos sin novedades; teclado en 6 pantallas sin fallos. Avisa que `s15` bajó de nodos (20 → 17): ya bajaba antes de esta pieza (bitácora 333); no lo acepté, es del gestor.

## Capturas (`docs/rediseno/capturas-340/`, 390×844, app compilada contra el respaldo local, sesión inventada)

- `01-nuevo-lugar-tira.png`: «Registrar un lugar» con la tira EVENTO · LUGAR · ARTISTA abajo; «Evento» (enlace a `/nuevo/evento`) se ve igual que los otros dos, alineado, Lugar marcado con su punto.
- `02-lugar-nombre.png`: `/nuevo/evento?lugar=<Teatro de la Paz>` tras «No tengo cartel»: «¿Cómo se llama?» con «Títeres en el patio», línea de avance corta y «Siguiente» abajo.
- `03-lugar-revisa.png`: su «Revisa» después de día, hora (sin pasar por «¿Dónde es?») y «Gratis»: vie 9 de oct · 19:00–21:00, **Teatro de la Paz**, Gratis, y «Publicar».
- `04-desde-dia.png`: `/nuevo/evento?desde=<Delirium Pollum…>`: entra directo en «¿Qué día es?» con Atrás (no la ✕) y la línea de avance en el día.
- `05-desde-revisa.png`: su «Revisa» tras elegir día y hora: el nombre del evento duplicado, Teatro de la Paz, $150 y Pimpolina.

En la misma corrida: las fichas enlazan «Publicar un evento aquí → /nuevo/evento?lugar=…», «Publicar una fecha → /nuevo/evento?artista=…» y el «+» → `/nuevo/evento`; sin errores de página.

## Qué probar en el iPhone

En Safari, en la web instalada y en la app de TestFlight (en la app, el «+» y «Publicar un evento aquí» deben abrir el flujo por pasos):

1. Agenda → «+»: abre «Sube el cartel / No tengo cartel». Publicar uno de punta a punta.
2. Ficha de un lugar → «Publicar un evento aquí»: no pregunta «¿Dónde es?» y «Revisa» trae el lugar; la ✕ del primer paso vuelve a la ficha.
3. Ficha de un artista → «Publicar una fecha»: «Revisa» trae al artista en Quién.
4. Ficha de un evento propio → ··· → «Duplicar con otra fecha»: entra en «¿Qué día es?»; Atrás va a «Sube el cartel».
5. Lugares → «+» (Registrar un lugar) → tocar «Evento» en la tira: va al flujo por pasos; con algo escrito, pregunta antes.
6. Un enlace viejo guardado (`/nuevo?lugar=…`) abre el flujo por pasos con el lugar.
7. Editar un evento: igual que siempre.

## Pendiente fuera de esta pieza

- Editar sesiones (horario por día) en el formulario de editar: sigue sin existir (bitácora 339 lo dejaba para la pieza 6; el encargo de esta pieza no lo incluye).
- Alta de lugar y de artista por pasos (doc 54).
