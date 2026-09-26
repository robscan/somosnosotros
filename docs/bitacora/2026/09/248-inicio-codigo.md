# 248 · Inicio: «Tus planes», «Esta semana» y chevron en los títulos — código (OL-219)

**Fecha:** 2026-09-25/26 · **Rama:** `inicio-codigo`, desde `origin/main` (4399cd4) · **OL:** OL-219 (código de OL-217) · **Modelo:** Sonnet 5. Sin subagentes, council ni workflows (regla del founder: costo de tokens).

## De dónde sale

El founder firmó el prototipo de Inicio (OL-217, PR #253: «acepto prototipo de inicio»), con sus dos vueltas ya resueltas (bitácora [246](246-inicio-planes-semana.md)): quitar la invitación a crear cuenta, «Tus planes» arriba con sesión, «Esta semana» nuevo, orden final con eventos antes que lugares y artistas, renombrados sin «esta semana» salvo la fila que se llama así, chip «Recién agregado», y el chevron en vez de «Ver todos» (canon Apple Music). Esta pieza es el código: prototipo `docs/rediseno/prototipos/inicio-planes-semana.html`, doc `docs/rediseno/41-inicio-personalizado.md` (sección «Tercera vuelta»), bitácora 246 y la línea «Decidido» de `OPEN_LOOPS.md` citada en el encargo.

Leído antes: código actual completo de Inicio (`src/app/page.tsx`, `src/components/Inicio.tsx`, `src/components/inicio/*`, `src/lib/inicio.ts` + su prueba, `src/lib/destacados.ts`, `src/components/Destacados.tsx`/`.module.css`), cómo Perfil junta Voy/Me interesa (`src/app/personas/consultas.ts`, `cargarPersona`), y `ui/Iconos.tsx` (`IconoChevronDerecha`, `IconoCalendarioMas`, ya existían).

## Qué se hizo

### 1. Se quita la invitación a crear cuenta

`Inicio.tsx` ya no pinta el bloque «Sigue lugares y artistas / Con una cuenta... / Crear cuenta»; se borró junto con `.invitacion`/`.crearCuenta` de `Inicio.module.css` (nadie más los usaba: `LetreroCorreoLigado.module.css` tiene su propia copia independiente, sin tocar). El botón «Entrar» de la barra (`Sesion.tsx`) se queda igual.

### 2. `src/lib/inicio.ts`: los nueve carriles

- **`carrilTusPlanes(voy, interesan)`** (nuevo): junta las dos listas, ordena por fecha (`compararEventos`) y recorta al mismo tope que el estelar (`TOPE_ESTELAR = 12`). Pura, sin tocar `vistos` ella misma (no tiene delante ningún otro carril que excluir).
- **`carrilEstaSemana(eventos, vistos, ahora)`** (nuevo): `eventosEstaSemana` + orden de fecha + `sinRepetidos` + tope nuevo `TOPE_ESTA_SEMANA = 20`. Sin mínimo: una sola tarjeta no lo vacía (a diferencia de Populares/Nuevos).
- **`carrilDestacados(destacadosEnOrden, vistos)`** (antes `carrilDestacadosEstaSemana`): el founder quitó «esta semana» del nombre del respaldo (tercera vuelta, sección 5 del doc) y con el nombre se fue el recorte de fecha — ya no llama a `eventosEstaSemana`, así que puede traer curaduría de semanas siguientes. Sin `ahora` en la firma (ya no lo necesita).
- **`carrilNuevos(eventos, vistos, ahora)`** (criterio nuevo, no solo nombre): antes «publicado en los últimos 7 días» a secas, compitiendo con Esta semana por los mismos eventos. Ahora exige TAMBIÉN que `inicio >= ahora + 7 días` (después de la ventana de Esta semana): los dos carriles ya no comparten candidatos. Nuevo mínimo `MINIMO_NUEVOS = MINIMO_POPULARES` (3): con menos, no se pinta — y el descarte se decide **antes** de tocar `vistos`, para que un carril que de todos modos no se pinta no le robe, sin querer, un evento a Cercanos (que llega después, en el cliente).
- **`tituloEstelar`**: `"Seleccionados para ti"` / `"Destacados"` (antes «De tus favoritos» / «Destacados esta semana»).
- **`calcularCarrilesAgenda(agenda, ahora, vistosIniciales)`**: gana un tercer parámetro, los ids que ya se llevó «Tus planes» (de `cargarPersona`, otra consulta). Orden de la cadena de deduplicación: **Tus planes → Estelar/Destacados → Esta semana → Populares → Nuevos** (Cercanos, en el cliente, llega después — ver punto 8). `CarrilesDeAgenda` gana el campo `estaSemana`.
- **`idsUsadosEnAgenda(agenda, ahora, vistosIniciales)`**: mismo parámetro nuevo; lo que devuelve alimenta la exclusión de Cercanos.

**40 pruebas** en `inicio.test.ts` (antes 24): la ventana de Esta semana, el tope de Tus planes, «Destacados» sin recorte de fecha (con un caso que antes habría quedado fuera), el nuevo criterio de Nuevos eventos (dentro de Esta semana no cuenta, el mínimo de 3, que un candidato descartado por el mínimo no toque `vistos`), y la integración completa de `calcularCarrilesAgenda`/`idsUsadosEnAgenda` con `vistosIniciales`, incluido el caso real que demuestra el prototipo firmado («Festival Independencia Cultural», con muchos «Voy», se lo lleva Esta semana antes que Populares).

### 3. «Tus planes»: `CarrilTusPlanes.tsx` (nuevo) + `page.tsx`

Componente de servidor nuevo, mismo patrón que `CarrilAgenda`: espera `cargarPersona(usuarioId)` (la misma consulta de Mi perfil, sin dato nuevo), arma `carrilTusPlanes(persona.eventos, persona.interesan)` y las `asistencias` derivadas directo de esas dos listas (todo lo que entra es, por definición, Voy o Me interesa), y reutiliza `CarrilEventosCliente` tal cual — el botón verde con check y el chip violeta «Te interesa» ya existían, sin insignia nueva. `page.tsx`: `personaPromise` (solo si hay `actual`, sin filtrar por ciudad — un compromiso ya hecho no deja de ser tuyo por cambiar de ciudad en Inicio) y `tusPlanesIdsPromise` (sus ids, para los demás carriles). El elemento `<CarrilTusPlanes>` solo se construye `actual ? ... : null` — pasarlo siempre, aunque `Inicio.tsx` no lo monte sin sesión, lo habría hecho ejecutarse igual (RSC renderiza cualquier hijo de servidor que cruce a un componente de cliente) y habría mandado un `"Tus planes":[]` de más al streaming de quien no tiene cuenta (encontrado probando: apareció en el HTML de la página sin sesión antes de este ajuste).

### 4. `Destacados.tsx`/`.module.css`: chevron y «Recién agregado»

- **Chevron** (founder: «un angle icon ">" en lugar de botón de ver todos [...] se parece al canon de Apple Music»): con `verTodos`, el encabezado ya no es `<h2>` + enlace «Ver todos →» separados — es un solo `<Link>` (`.tituloCarril`) que envuelve el `<h2>` y un `IconoChevronDerecha` (`.chevron`), con `aria-label="Ver todos: <encabezado>"`. Sin `verTodos` (Lugares, que no la pasa), sigue siendo un `<h2>` simple: un carril sin destino no lleva chevron. Los dos, `.tituloCarril` y `.chevron`, miden `min-height: var(--toque-min)` (44px) — **medido de verdad** en el navegador (ver evidencia): los cinco encabezados con contenido midieron exactamente 44px de alto, aunque el glifo dibujado sea de 20px.
- **`t.reciente`** (`lib/destacados.ts`): `Tarjeta` gana el campo opcional `reciente?: boolean`; `tarjetaEvento` lo calcula con `esRecienAgregado(creado_en, ahora)` (nueva, `DIAS_RECIEN_AGREGADO = 7`, separada de `DIAS_ESTA_SEMANA` de `lib/inicio.ts` para no cerrar un ciclo de importación entre los dos archivos, aunque hoy valgan lo mismo). En `Destacados.tsx`, el chip nuevo (`.reciente`, icono `IconoCalendarioMas`, texto «Recién agregado») se apila con «Te interesa» y «N van» — **misma insignia de fondo vidrio que «N van»** (`.van, .reciente` comparten regla CSS): no es una pieza nueva. Solo tarjetas de evento la traen (lugares/artistas no tienen `creado_en` que mostrar así).

### 5. `page.tsx`, `Inicio.tsx`, `CarrilAgenda.tsx`, `CarrilCercanos.tsx`: orden y nombres

Orden final (con sesión): **Tus planes → Seleccionados para ti/Destacados → Cerca de ti → Esta semana → Populares → Nuevos eventos → Lugares con eventos → Artistas destacados → Artistas con eventos** (sin sesión, igual sin la primera fila). `CarrilAgenda` gana el tipo `"estaSemana"` y el prop `tusPlanesIdsPromise` (todas las partes lo reciben, para que la cadena de `vistos` arranque siempre con lo que ya se llevó Tus planes). Renombrados literales en `page.tsx`: «Lugares con eventos esta semana» → «Lugares con eventos», «Artistas con eventos esta semana» → «Artistas con eventos» (Artistas destacados no cambia). `CarrilCercanos.tsx`: encabezado «Eventos cercanos esta semana» → «Cerca de ti».

No se tocaron `ui/ChipFecha`, `ui/SelectorFecha`, Lugares ni el formulario de eventos (OL-218 en curso, instrucción del encargo).

### 6. Ningún evento repetido; Cercanos también excluye Esta semana

`excluirDeCercanosPromise` en `page.tsx` ahora es `Promise.all([agendaPromise, tusPlanesIdsPromise]).then(([a, ids]) => idsUsadosEnAgenda(a, ahora, ids))`: el conjunto que recibe `CarrilCercanos` (cliente) ya incluye Tus planes + Estelar/Destacados + **Esta semana** + Populares + Nuevos. Con esto, «Cerca de ti» no repite nada de lo de arriba — la única dirección que no se cierra (anotada también en el doc 41 y en la bitácora 246, pregunta 2, sin resolver ahí) es que Esta semana no sabe qué elegirá Cercanos, porque Cercanos resuelve después, en el cliente, con geolocalización — el mismo riesgo raro que ya existía entre Cercanos y Estelar/Populares/Nuevos antes de esta pieza, ahora extendido a Esta semana.

## Evidencia

`npm run lint && npm run typecheck && npm test && npm run build` en verde (**1403 pruebas**, 109 archivos). Sin `.env.local` para el build final (el mock de abajo era solo para las capturas; sin él, `next build` compila igual — `clienteServidor()` cae a `null` y todo se degrada a vacío, como ya hacía antes de esta pieza).

### El respaldo local (por qué no son datos de producción)

El encargo pedía «datos de producción en solo lectura» para el estado sin sesión. Este operador **no tiene `.env`** en este árbol de trabajo (diseño del proyecto: las llaves solo viven en Vercel/Supabase y en el `.env` de quien hace `db:push`, nunca en la carpeta de un operador) y, además, la memoria del proyecto («Proyecto somosnosotros») registra que desde 2026-09-16 el sistema de permisos bloquea arrancar contra datos de producción aunque sea con un intermediario de solo lectura. Con esas dos cosas, las tres capturas (sin sesión incluida) se hicieron contra el **mismo respaldo local** (100% inventado, sin red, `node:http` puro): imita Auth (JWT sin firma válida — `alg: HS256` fuerza a `getClaims()` a llamar a `/auth/v1/user`, que el respaldo contesta) y PostgREST (tablas y RPC que pide Inicio, con datos fijos). Dos cuentas desechables `*@example.com` (nunca contraseña real): `planes@example.com` (Voy en «Cumbia Fantasma en vivo», Me interesa en «Concierto Sinfónica de la UASLP», este último a 25 días — sin tope de fecha) y `sinplanes@example.com` (mismo perfil, ninguna asistencia). Las dos siguen el mismo lugar (Aurora Co-Lab), para que la única diferencia visible entre B1 y B2 sea «Tus planes» y su ripple. El script del respaldo y el de capturas quedaron en el scratchpad de la sesión (no en el repo, regla de gestión de cambios: infraestructura de prueba no entra al repo salvo que sea del propio proyecto).

Un bug real de este mismo respaldo, encontrado y corregido en el camino: mi primer generador de fechas mezclaba aritmética UTC con horas locales tardías (p. ej. «hoy 19:00 hora local» calculaba mal el día en UTC) y corría un día los eventos con hora ≥ 18 — lo notó "Lugares con eventos" saliendo vacío sin ningún error. Reescrito para anclar primero el día calendario LOCAL y escribir el ISO con el desplazamiento `-06:00` literal, sin conversión.

### Capturas (`docs/rediseno/capturas-248/`), reales 390×844, Chrome vía `playwright-core`, fuente Bricolage confirmada

- **`248-a-sin-sesion-{arriba,medio,abajo}.png`** — sin sesión. Arriba: sin invitación, botón «Entrar»; **«Destacados»** (respaldo, chevron) con «Festival Independencia Cultural» (45 van) y **«Obra: Los de abajo» (chip «Recién agregado» + «21 van» apilados)** — este último con fecha **4 de octubre, 9 días después de hoy**: antes (`carrilDestacadosEstaSemana`) habría quedado fuera del respaldo por el recorte de 7 días; ahora no. «Esta semana» empieza a asomar. Medio: «Populares» con una sola tarjeta (las otras dos que calificaban ya se las llevó «Destacados»), «Nuevos eventos» con sus 3 candidatos propios. Abajo: «Lugares con eventos» (círculos, con chevron).
- **`248-b1-con-planes-{arriba,medio,abajo}.png`** — con sesión, con planes. Arriba: campana + avatar; **«Tus planes»** con «Cumbia Fantasma en vivo» (botón verde con check, «Voy») y «Concierto Sinfónica de la UASLP» (chip violeta «Te interesa»); **«Seleccionados para ti»** (no el respaldo: el favorito por Aurora Co-Lab). Medio: «Esta semana», «Populares» (con «Obra: Los de abajo» completo — aquí SÍ, porque «Destacados» no lo reclamó al no ser el respaldo), «Nuevos eventos». Abajo: «Lugares con eventos» con Aurora Co-Lab ya con el check verde (seguido).
- **`248-b2-sin-planes-{arriba,medio,abajo}.png`** — con sesión, sin planes: mismo usuario, sin asistencias. «Tus planes» no existe (colapsa sin hueco, no se omite el componente: mismo criterio que cualquier carril vacío). «Seleccionados para ti» igual que en B1. Confirmado por HTML (no por captura, para no multiplicar imágenes): «Cumbia Fantasma en vivo» reaparece en «Esta semana» con el botón sin decidir (`aria-pressed="false"`) — nadie lo reclamó — igual que describe la bitácora 246 para B2 con «De tus favoritos».

Las nueve abiertas y descritas arriba antes de este cierre. Comparadas contra su par del prototipo (`inicio-planes-semana.html`, A1/B1/B2): mismo orden de carriles, mismos nombres, mismo patrón de chips y de chevron; difieren el contenido inventado (nombres de eventos/lugares) y que aquí no hay pantalla A2 (sin ubicación) dedicada — Cercanos no se ejercitó con geolocalización real en estas capturas (ninguna captura pidió permiso de ubicación), así que se ve igual que A2 del prototipo en las tres. Sin correos reales: los únicos que aparecen en cualquier parte (código, capturas, bitácora) son `planes@example.com` / `sinplanes@example.com` y las atribuciones `noreply@anthropic.com` de los commits.

### Medida del objetivo de toque (footer del chevron)

Con el mismo Chrome/playwright, `getBoundingClientRect()` de los cinco `<a aria-label^="Ver todos">` presentes (sin sesión): los cinco miden **44px de alto** exactos (`--toque-min`), el mínimo pedido por el founder, aunque el glifo dibujado sea de 20px.

## Decisiones y límites del operador

- **«Lugares con eventos»/«Artistas destacados»/«Artistas con eventos» no cambian de comportamiento en esta pieza** (solo dos de sus títulos se acortan, ver punto 5): en el respaldo local, «Artistas destacados»/«Artistas con eventos» quedaron sin datos (colapsados, estado válido y ya cubierto por las pruebas existentes de `Destacados`) para no tener que imitar también `eventos_artistas`/`artistas` — no había necesidad, esos dos carriles no cambian en OL-219.
- **`carrilDestacados`/tira de destacados sin cambios de criterio**: solo se le quitó el recorte de 7 días (pedido explícito del founder al renombrarlo); qué entra a la tira lo sigue decidiendo la administración, sin tocar esa parte.
- El riesgo de que Cercanos (cliente) repita algo de Esta semana (servidor) en un caso raro —ya anotado en el doc 41 y en la bitácora 246, pregunta 2— **sigue sin resolverse del todo**: se decidió que Esta semana gane siempre (Cercanos la excluye, nunca al revés), igual que ya pasaba con Estelar/Populares/Nuevos.
- Tope de Esta semana (20), ventana de «Recién agregado» (7 días) y mínimo de Nuevos eventos (3) ya venían decididos por el encargo — no quedan como preguntas abiertas para el founder en esta pieza.

## Estado

Sin unir a `main` (instrucción de esta pieza: solo PR, esperar `gh pr checks`). `docs/ops/OPEN_LOOPS.md`: se amplía la línea `- **OL-219 ·` existente (no se toca ninguna otra línea ni el resto de «Decidido», por la regla de conservar todo al unir).
