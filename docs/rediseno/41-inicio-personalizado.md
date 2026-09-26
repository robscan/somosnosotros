# 41 · Inicio personalizado y buscador único (C2 + C4)

**Estado:** propuesta y prototipo, sin código; segunda vuelta con las decisiones del founder aplicadas (2026-09-23). **OL:** OL-150 · **Bitácora:** [185](../bitacora/2026/09/185-inicio-personalizado.md) · **Cola:** [COLA_DE_PIEZAS.md](../ops/COLA_DE_PIEZAS.md), filas C2 y C4, renglones L4 y L28 del anexo. **Prototipo:** [prototipos/inicio-personalizado.html](prototipos/inicio-personalizado.html).

## Decisiones del founder (2026-09-23, segunda vuelta, transmitidas por el gestor)

1. La sección se llama **«Inicio»** (no «Para ti») y va **primera** en la barra inferior.
2. El buscador se abre con la **lupa**, dentro de la cabecera del canon (`ui/Cabecera.tsx` + `ui/Barra.tsx`) tal como ya funciona en Agenda y Lugares: nada de una barra de búsqueda visible de más.
3. Los 6 carriles son **fijos** (no se reordenan ni se ocultan por ahora).
4. **Populares** puede quedar vacío al principio: si no hay eventos con el mínimo de asistentes, ese carril simplemente no se muestra (misma regla que los demás).
5. **«Esta semana»** = próximos 7 días desde hoy (igual que `cargarCercanos`), no semana de calendario.
6. Las tarjetas de evento eran demasiado altas: pasan a **apaisadas**, proporción 3:2, unos 150-170 px de alto, para que se vean 2-3 carriles por pantalla sin tanto scroll.

Esto resuelve las 5 preguntas de la primera vuelta (quedan más abajo, tachadas, para no perder el razonamiento).

## De dónde sale

Founder, 2026-09-23, literal: «la app debe tener una pantalla de inicio adicional a las que existen, con diferentes carruseles tipo Netflix que se organicen con varios criterios. Eventos destacados, eventos populares, eventos cercanos esta semana, eventos de tus lugares y artistas favoritos, artistas y lugares con eventos esta semana (son algunas ideas). Que cada carrusel ofrezca "Ver todos" y eso abra la sección que corresponda con los listados y filtros de búsqueda como están hoy. Esto refuerza la necesidad de "un solo buscador" para toda la página que organice los resultados según la sección en la que está el usuario.»

L4 (origen más antiguo, misma idea): inicio configurable por intereses elegidos al abrir la cuenta. L28: «el usuario debería sentir que usa el mismo buscador para encontrar todo», con resultados por tipo e intención; pueden seguir siendo 3 buscadores por dentro.

No contradice nada de lo firmado: sigue "el contexto ordena, no limita" (la cercanía ordena, nunca filtra por ciudad), "filtrar no es navegar" (memoria de pantalla), "sin ranking" (los criterios de destacar ya están firmados en doc 20 y en DEFINICION.md — esta pieza los reutiliza, no inventa uno nuevo) y el grafo cultural (doc 24: "inicio por intereses" ya estaba anotado ahí como canon que se toca).

## Dónde vive la pantalla — recomendación

**Es una sección más en la barra inferior, no sustituye a Agenda.** Tres motivos:
1. El founder pidió literalmente "una pantalla de inicio **adicional** a las que existen" — no dijo reemplazar la Agenda actual, que ya funciona como "qué hay hoy y esta semana" (su propio subtítulo en `generateMetadata`, `src/app/page.tsx`).
2. Reemplazar Agenda por un muro de carruseles rompe el caso de uso más común y más simple: alguien sin sesión que solo quiere ver qué hay hoy cerca. Un muro de carruseles es peor para eso (más scroll, menos densidad de eventos por pantalla) y peor para SEO (la lista plana de eventos es lo que indexa Google, OL-059).
3. `NavInferior` ya tiene el patrón de "cada sección vuelve a su última URL" (memoria de pantalla por sección) y el destino activo lleva píldora; añadir una sección más no rompe nada, solo hay que ver si 4 iconos siguen siendo cómodos con el pulgar (hoy son 3: Agenda, Lugares, Artistas).

**Decidido:** se llama **"Inicio"**, primera posición en la barra (antes de Agenda), con el icono de casa.

Sin sesión, "Inicio" sigue existiendo (no es una pantalla que solo aparece al entrar): con menos carruseles (sin "de tus lugares y artistas favoritos", que no aplica) y con una tarjeta arriba invitando a crear cuenta o entrar, en el mismo tono que ya usa `ActivarAvisos` — nunca un muro que bloquea.

## Carruseles: orden y criterio medible

Reglas comunes a todos:
- Máximo 200 eventos/fichas por consulta (el mismo tope que `cargarCercanos`/`cargarNuevos`, doc de la regla en bitácora 130), sin traer más solo para armar un carril.
- Cada tarjeta reutiliza el patrón de `lib/destacados.ts` (`tarjetaEvento`, `tarjetaLugar`, `tarjetaArtista`) pero **apaisada** (decisión del founder, segunda vuelta): foto en proporción 3:2, unos 150-170 px de alto en vez de los 220×200 (casi cuadrados) de la tira de Destacados — para que quepan 2-3 carriles por pantalla sin tanto scroll. Foto obligatoria (símbolo SN si no hay portada, regla firmada — nunca compuesta en vivo), scroll horizontal con `scroll-snap` (patrón ya usado en `boton-en-carriles.html` y en la tira de Destacados).
- **Un carril vacío no se muestra** (ni título ni hueco, la misma regla que ya rige la tira de Destacados en doc 20): se calcula en el servidor y si no hay nada que mostrar, ese `<section>` no se pinta. Nunca "aún no hay nada aquí" dentro de un carril — eso reserva espacio para lo vacío, que la regla de Destacados ya prohíbe.
- Cada carril lleva su "Ver todos →" que navega a la sección real (Agenda, Lugares o Artistas) **con el filtro ya aplicado** en la URL (mismo patrón que hoy: `?ciudad=`, pestaña de Agenda, chip de tipo en Lugares) — nunca una lista aparte que duplique código de filtrado.

**Orden final (founder, segunda vuelta):** el carril 5 de la primera vuelta ("artistas y lugares con eventos esta semana") se partió en dos, y el de lugares se intercala justo después de Cercanos, no al final. Tabla numerada ya en ese orden:

| # | Carril | Con sesión / sin sesión | Con ubicación / sin ubicación | Criterio medible | "Ver todos" abre |
|---|---|---|---|---|---|
| 1 | **De tus lugares y artistas favoritos** | Solo con sesión y con al menos un seguido | No depende de ubicación | Próximos eventos donde `lugar_id` o el artista está en `seguimientos` de la persona, ciudad del chip, no pasados, no ocultos. Ya es la lista `eventosSeguidos` + eventos de lugares seguidos que hoy arma `src/app/page.tsx` (líneas 66-77) para la pestaña "Siguiendo" de Agenda — se reutiliza, no se recalcula. | Agenda, pestaña "Siguiendo" |
| 2 | **Eventos destacados** | Con o sin sesión | No depende | Los mismos que hoy arma `leerTira(supabase, "eventos", ciudad)` (doc 20: elegidos por el admin + los de más asistentes desde 3, sin contar administración). Un solo criterio, ya firmado; no se reinventa "destacado" para el inicio. | Agenda, con la tira visible arriba (Todos, sin fecha ni búsqueda) |
| 3 | **Eventos cercanos esta semana** | Con o sin sesión | Solo con ubicación concedida (si no, no se muestra el carril) | Reutiliza `cargarCercanos()` (`src/lib/cargarCercanos.ts`): próximos 7 días, ordenados por distancia real en el teléfono (coordenadas nunca viajan al servidor), todas las ciudades — la cercanía ordena, no filtra por ciudad (regla de bitácora 130). | Agenda, pestaña "Cercanos" |
| 4 | **Lugares con eventos esta semana** | Con o sin sesión | No depende | Lugares con al menos un evento visible en los próximos 7 días en la ciudad del chip. | Lugares, con chip "Esta semana" (nuevo) |
| 5 | **Eventos populares** | Con o sin sesión | No depende | Próximos eventos de la ciudad ordenados por `van_por_evento` (RPC que ya existe, cuenta "Voy") de mayor a menor, mínimo 3 asistentes sin contar administración — el mismo umbral que ya usa doc 20 para "más asistentes", para no inventar un segundo criterio de popularidad que compita con Destacados. Si Destacados y Populares comparten evento, no se repite dentro de Populares (se salta al siguiente). | Agenda, Todos, ordenado por popularidad (orden nuevo pequeño en el filtro; hoy Agenda ordena por fecha) |
| 6 | **Artistas con eventos esta semana** | Con o sin sesión | No depende | Artistas con al menos un evento visible en los próximos 7 días en la ciudad del chip. | Artistas, con chip "Esta semana" (nuevo) |

Los carriles 4 y 6 salen de partir en dos el carril mixto de la primera vuelta ("artistas y lugares con eventos esta semana"): cada uno con su propio destino de "Ver todos" (un carril mixto no puede abrir dos secciones distintas).

Orden de arriba hacia abajo en la pantalla: **1 (tus favoritos) → 2 (destacados) → 3 (cercanos) → 4 (lugares de la semana) → 5 (populares) → 6 (artistas de la semana)**. Sin sesión, la pantalla empieza directo en 2 (destacados) pero conserva los demás en el mismo orden (3, 4, 5, 6).

**Sin duplicar eventos:** un evento que ya salió en el carril 1 (favoritos) no se repite en 2 (destacados), 3 (cercanos) o 5 (populares) — se filtra por id ya visto, igual que "no se muestra un lugar seguido si ya salió antes" pide el encargo. Esto evita que la misma tarjeta se vea varias veces en una pantalla que ya es larga.

## El buscador único

**Decidido: se abre con la lupa, dentro del canon existente de la cabecera — nada de una barra de búsqueda visible de más.** `ui/Barra.tsx` (logotipo + sesión) no cambia. El campo vive en `ui/Cabecera.tsx`, exactamente como hoy en Lugares (`VistaLugares.tsx`): un botón redondo de 40×40 px (`BotonRedondo`, con `IconoBuscar`) al final del renglón 1; al tocarlo, ese renglón entero se reemplaza por el `campo` (`CampoBuscar`, con foco automático y la ✕ para cerrar) — la cabecera no cambia de alto ni empuja el contenido. Al escribir, los resultados salen **agrupados por tipo** (Eventos / Lugares / Artistas), cada grupo con sus primeras 3-5 coincidencias y su propio "Ver todos" hacia la sección con la búsqueda ya en la URL.

**Precisión del founder (segunda vuelta): el shell de Inicio es exactamente el de hoy, no una cabecera nueva.** El `contexto` del renglón 1 en `AgendaInicio.tsx` lleva hoy dos chips: el de fecha y el de ciudad (`ChipCiudad`, seleccionable, abre la misma hoja "Dónde" de siempre). En Inicio se usa **el mismo `ui/Cabecera.tsx` con el mismo `contexto`**, pero con el chip de fecha oculto (Inicio no filtra por día, no tiene sentido "hoy/mañana" ahí) y el chip de ciudad igual de seleccionable que en Agenda y Lugares — cambiar de ciudad en Inicio cambia la ciudad de todos los carriles, igual que cambia la de la Agenda. En el prototipo esto se ve tal cual: el chip de ciudad con su pin y su caret, sin chip de fecha al lado. Al implementarse en código, no se crea un componente de cabecera nuevo: es `<Cabecera contexto={<ChipCiudad …/>} onBuscar={…} campo={…} filtros={undefined} />`, con el chip de fecha simplemente fuera del `contexto` que le pasa `AgendaInicio`/la futura `Inicio.tsx`.

**Cómo se reparte con los tres buscadores actuales — no se tiran, se reordenan:**
- El campo de Agenda (`CampoBuscar` en memoria, filtra los eventos ya cargados en el teléfono) y el de Lugares (mismo componente, mismo patrón) siguen existiendo tal cual: siguen siendo lo más rápido cuando la persona ya está dentro de esa sección y solo quiere acotar lo que ve.
- El buscador de la URL (`components/ui/Buscador`, `?q=`) es el que ya sabe pedir al servidor y compartir enlace: es la base técnica del buscador único, extendida para consultar las tres tablas a la vez en vez de una.
- **El buscador único es una capa nueva encima, no un cuarto componente que compite:** mismo campo (`CampoBuscar`), pero el resultado depende de dónde está la persona:
  - **Desde Inicio o desde cualquier pantalla sin lista propia:** los tres tipos se muestran agrupados, en el orden Eventos → Lugares → Artistas (el orden de "qué pasa" antes que "dónde" y "quién", que es como ya piensa la Agenda).
  - **Desde dentro de una sección (Lugares, Artistas, Agenda):** esa sección sale primero y con más resultados (5 en vez de 3); las otras dos aparecen después, más chicas, como atajo ("¿buscabas este artista?"). Es la regla que pide L28 ("que organice los resultados según la sección en la que está el usuario") sin quitarle a cada sección su búsqueda rápida en memoria.
- Internamente pueden seguir siendo 3 consultas (una por tabla, con `ilike` sobre nombre/título, tope 5-8 cada una) hechas en paralelo — no hace falta una tabla de búsqueda combinada ni una extensión nueva de Postgres para esta escala (cientos de fichas por ciudad, mismo argumento de doc 24 sobre no cambiar de stack).

## Qué datos ya existen y cuáles faltan

**Ya existen (nada que migrar para el prototipo ni para una primera versión en código):**
- `seguimientos` (lugar_id, artista_id) → carril 1.
- `leerTira()` / tabla de destacados → carril 2.
- `cargarCercanos()` → carril 3.
- Eventos por lugar/artista con fecha (`eventos.lugar_id`, `eventos_artistas`) → carriles 4 y 6, y filtro "esta semana" en Lugares/Artistas (hoy no existe ese chip; es chico: `WHERE` por rango de fecha sobre eventos ya relacionados).
- RPC `van_por_evento` → carril 5.
- `CampoBuscar`, `Buscador` (URL) → base del buscador único.

**Falta:**
- Un chip o pestaña "Esta semana" en Lugares y en Artistas (hoy sus filtros son por tipo/disciplina y ciudad, no por fecha de sus eventos).
- Un orden "por popularidad" en Agenda para que "Ver todos" del carril 5 tenga a dónde apuntar (hoy Agenda solo ordena por fecha).
- Un endpoint o función de servidor que arme las 6 listas de golpe para no hacer 6+ consultas sueltas desde el cliente (equivalente a lo que hace `cargar()` en `src/app/page.tsx`, pero con los 6 criterios).
- Búsqueda combinada en servidor que consulte `eventos`, `lugares` y `artistas` en paralelo y devuelva agrupado — hoy cada sección busca solo en su propia tabla.
- Intereses/disciplinas elegidas por la persona (L4) para un futuro carril "de tu disciplina favorita": las disciplinas ya existen como dato de las fichas (doc 24 lo anota), pero no hay campo de "interés elegido" en el perfil. **No entra en esta pieza** (el encargo de hoy no lo pidió como carril fijo, solo lo cita como antecedente) — queda anotado para cuando el founder quiera esa capa.

## Preguntas de la primera vuelta (ya resueltas por el founder, se conservan tachadas por el razonamiento)

1. ~~¿"Para ti" va primera en la barra inferior (antes de Agenda) o al final (después de Artistas)?~~ → **Inicio, primera posición.**
2. ~~¿El buscador único vive siempre visible en la barra superior o se abre con una lupa como hoy en Agenda y Lugares?~~ → **Con la lupa, dentro del canon de `ui/Cabecera.tsx`.**
3. ~~¿Los carriles del encargo son fijos para todos o el founder quiere, más adelante, dejar que la persona reordene u oculte los que no le sirven?~~ → **Fijos.**
4. ~~El carril "eventos populares" y "eventos destacados" pueden solaparse mucho al principio. ¿Está bien que Populares quede corto o vacío?~~ → **Sí, puede quedar vacío y no se muestra (misma regla que todos).**
5. ~~"Esta semana" para los carriles 4 y 6 y los nuevos chips de Lugares/Artistas: ¿semana de calendario o "próximos 7 días"?~~ → **Próximos 7 días.**

## Sigue pendiente

- El nombre exacto del chip nuevo "Esta semana" en Lugares y Artistas (texto y posición entre los chips existentes).
- Si el carril "Eventos populares" necesita, además del mínimo de 3 asistentes, algún tope de antigüedad del "Voy" para no quedar dominado por un solo evento viejo con muchos asistentes acumulados — no lo pidió el founder, se anota por si aparece con datos reales.

## Tercera vuelta (OL-217, 2026-09-25): «Tus planes», «Esta semana» y sin el aviso de crear cuenta

**Reemplaza** el orden de la sección anterior ("Orden final, arriba hacia abajo") y la fila 5 de la tabla de carriles (que ya no aplica: Populares ya no es el respaldo del carril estelar, ni comparte fila con "artistas y lugares"). El resto de la segunda vuelta (nombre "Inicio", posición en la barra, buscador con lupa, tarjetas apaisadas para eventos sueltos) sigue firme y no se toca.

Founder, 2026-09-25, palabras suyas: «Falta una fila de "eventos a los que voy" en inicio y eventos que me interesan. Aunque los tenemos en perfil, de momento no es relevante. Y dejemos de presentar el callout que invita a crear cuenta en inicio y en ese caso asegúrate de que se vean eventos de esta semana, no solo los nuevos o los destacados. Cuando no se tiene cuenta debemos ver eso con mayor jerarquía antes de artistas y lugares.» Y después: «Arranca prototipo para inicio y acepto tus recomendaciones» (las recomendaciones del operador, ya integradas abajo). Prototipo: [prototipos/inicio-planes-semana.html](prototipos/inicio-planes-semana.html) · Bitácora: [246](../bitacora/2026/09/246-inicio-planes-semana.md).

**Importante: esta vuelta se dibujó sobre el código de hoy (`src/components/Inicio.tsx`, `src/app/page.tsx`, `src/lib/inicio.ts`), no sobre el prototipo de la segunda vuelta.** El código ya evolucionó más allá de lo que ese prototipo mostraba (OL-156 en adelante, bitácoras 188-211): hoy son **siete** carriles, no seis, y el orden en producción es Estelar → Cercanos → Lugares de la semana → Artistas destacados → Populares → Nuevos → Artistas de la semana (Lugares y Artistas destacados intercalados justo después de Cercanos, no al final). Esta pieza reordena eso.

### 1. Se quita la invitación a crear cuenta

`Inicio.tsx` pintaba, sin sesión, una tarjeta lila "Sigue lugares y artistas / Con una cuenta, esta pantalla se llena con lo tuyo... / Crear cuenta". Se quita entera, con o sin ubicación concedida. El botón **Entrar** de la barra superior (violeta, `Sesion.tsx`) se queda: sigue siendo la única invitación a entrar, sin bloquear nada delante del contenido — la app nunca se queda sin una puerta a Entrar, solo sin el cartel de más.

### 2. «Tus planes» (nuevo, solo con sesión)

Una sola fila, arriba de todo, con los próximos eventos donde la persona ya dijo **Voy** o **Me interesa**, juntos y ordenados por fecha — exactamente lo que hoy junta `ActividadPersona.tsx` para "Mi perfil" (`enOrden([...eventos, ...interesan])`, ordenado por `inicio`) y lo que ya devuelve `cargarPersona()` en `src/app/personas/consultas.ts` (`eventos: porEstado("voy")`, `interesan: porEstado("me_interesa")`, ya filtrados a solo futuros por `filtroSinPasar()`). No es un dato nuevo: es la unión de dos listas que ya existen, ordenadas juntas.

- **Solo aparece si hay algo.** Sin sesión no existe; con sesión y sin ningún Voy/Me interesa futuro tampoco (mismo colapso sin hueco que cualquier carril vacío de `Destacados`) — el prototipo lo dibuja como **B2** ("con cuenta, sin planes"): la pantalla sigue directo a "De tus favoritos".
- **Tamaño de tarjeta: mediana** (220×132, la de siempre para un evento suelto — Cercanos/Populares/Nuevos), no el cartel ("grande", reservado a lo curado por administración o por seguimiento) ni el círculo (lugares/artistas). Es una lista plana de eventos individuales, no una curaduría.
- **La marca Voy/Me interesa no es una pieza nueva de UI:** cada tarjeta de evento en Inicio ya trae, hermano del enlace, el botón redondo de `BotonRenglon` (verde `--ok` con check si la persona ya decidió, blanco con `+` si no — `BotonRenglon.module.css`, corrección del founder 2026-09-21) y, si el estado es "me interesa", el chip violeta «Te interesa» (`estadoDe`, `Destacados.module.css .interesa`, ya usado en Cercanos/Populares/Nuevos, OL-176). Como todo lo que entra a Tus planes es, por definición, Voy o Me interesa, ese mismo botón y ese mismo chip ya distinguen cada tarjeta — Voy se ve en el check verde, Me interesa en el chip. No se inventa un color ni una insignia nueva.
- **"Ver todos"** → `/perfil` (ahí ya se ven "Voy a" y "Me interesa" como pestañas separadas de `ActividadPersona`; no se crea una tercera vista que las junte).
- **Tope:** igual que el carril estelar hoy (`TOPE_ESTELAR = 12`, `src/lib/inicio.ts`), para que una persona muy activa no convierta esto en una lista sin fin.

### 3. «Esta semana» (nuevo)

Todos los eventos de los próximos 7 días (misma ventana que ya usa `eventosEstaSemana()`, `src/lib/inicio.ts`), en orden de fecha, con o sin sesión.

- **Decisión: marca el día en cada tarjeta, no agrupa con encabezados de día.** Es un carril horizontal (el lenguaje "Netflix" que ya usa toda la pantalla), no una lista vertical como Agenda o Perfil — un encabezado de día partiendo el carril no cabe en ese formato, y obligaría a inventar una tarjeta o una estructura nueva. Además, **la tarjeta de evento que ya existe (`tarjetaEvento`, `src/lib/destacados.ts`) ya resuelve esto sola**: su `detalle` es `${formatearCuando(inicio)} · ${nombreSitio}`, y `formatearCuando`/`diaCorto` (`src/lib/fechas.ts`) ya devuelven "Hoy", "Mañana" o "sáb 27 sep" según toque. "Esta semana" reutiliza esa misma tarjeta tal cual, sin ninguna variante nueva.
- **Con menos de 3 eventos:** se pinta igual, sin mensaje ni relleno. A diferencia de Populares (que exige un mínimo de 3 "Voy" para existir), "Esta semana" no tiene piso: muestra lo que haya, aunque sea 1 o 2 tarjetas — el carril simplemente se ve corto, nunca vacío de mentira ni con un texto de "aún no hay nada" (esa frase está prohibida dentro de un carril desde el doc 20).
- **Con muchos eventos:** tope de **20 tarjetas** (más alto que el tope de 12 del carril estelar, porque "Esta semana" presume ser "todos" y por eso puede necesitar algo más de margen antes de cortar). Lo que sobra del tope sigue accesible en un toque: "Ver todos" abre Agenda, ya ordenada por fecha — nada desaparece, solo cambia dónde se ve.
- **"Ver todos"** → Agenda (pestaña "Todos", orden de fecha de siempre; no hace falta un filtro nuevo en la URL).

### 4. Orden final: eventos antes que lugares y artistas

Literal el pedido del founder ("con mayor jerarquía antes de artistas y lugares"): los carriles de **eventos** van todos antes que los de **lugares y artistas** — ya no intercalados, como corren hoy en producción.

**Con sesión:**

| # | Carril | Tamaño | Aparece si | "Ver todos" abre |
|---|---|---|---|---|
| 1 | **Tus planes** (nuevo) | mediana | Con sesión y con algo próximo en Voy/Me interesa | `/perfil` |
| 2 | **Seleccionados para ti** / Destacados (respaldo) | grande (cartel) | Siempre (con seguidos usa el primero; sin seguidos, el segundo) | Agenda, "Siguiendo" / tira de Destacados |
| 3 | **Cerca de ti** | mediana | Solo con ubicación fresca en el teléfono (Inicio nunca la pide) | Agenda, "Cercanos" |
| 4 | **Esta semana** (nuevo) | mediana | Siempre que haya al menos un evento en 7 días no mostrado ya arriba | Agenda, "Todos" |
| 5 | **Populares** | mediana | Si hay alguno con ≥3 "Voy" no mostrado ya arriba (indistinto entre semanas) | Agenda, orden por popularidad |
| 6 | **Nuevos eventos** | mediana | Si hay ≥3 publicados hace poco con fecha DESPUÉS de "Esta semana" | Agenda |
| 7 | **Lugares con eventos** | chica (círculo) | Si hay alguno | Lugares, chip "Esta semana" |
| 8 | **Artistas destacados** | grande (cartel) | Si hay alguno | Artistas |
| 9 | **Artistas con eventos** | chica (círculo) | Si hay alguno | Artistas, chip "Esta semana" |

**Sin sesión:** igual, sin la fila 1 y con la fila 2 siempre en su forma de respaldo ("Destacados"). El prototipo lo dibuja como **A1** (con ubicación) y **A2** (sin ubicación: la fila 3 no existe, y nada la reemplaza — sus eventos simplemente aparecen en la fila 4, "Esta semana", si caen dentro de los 7 días).

**Nombres y criterio de las filas 2, 3, 5, 6, 7 y 9 corregidos en la segunda vuelta del prototipo (misma pieza, ver más abajo): ninguno lleva ya "esta semana" salvo la fila 4, y la fila 6 cambió de criterio, no solo de nombre.**

**Ningún evento se repite entre filas de eventos** (filas 1 a 6): se extiende el mismo `Set` compartido que hoy usan `calcularCarrilesAgenda`/`sinRepetidos` (`src/lib/inicio.ts`) para Estelar → Populares → Nuevos. Con esta pieza, la cadena crece a Tus planes → Estelar/Destacados → Cercanos → **Esta semana** → Populares → Nuevos, cada una añadiendo sus ids al mismo conjunto antes de que la siguiente calcule la suya. Las filas 7 a 9 (lugares y artistas) no compiten por ids de evento y no entran en ese `Set`.

### Corrección de fidelidad frente a la segunda vuelta

Al comparar el prototipo anterior contra el código real se encontraron dos detalles que el prototipo de la 2ª vuelta dibujaba distinto de como corre hoy en producción; el prototipo de esta pieza (OL-217) ya los corrige:

- **Sin saludo ni título "Inicio" en pantalla.** `Inicio.tsx` no pinta ningún `<h1>`; el prototipo de la 2ª vuelta sí dibujaba uno ("Inicio" / "Lo que ya sigues, primero") que nunca se implementó así.
- **"Lugares con eventos esta semana" en círculo, no en cuadro.** `CarrilEntidadCliente.tsx` pasa `redondas={!grande}` igual para lugares y para artistas: hoy ambas filas de "esta semana" (lugares y artistas) se ven en círculos de 104 px, no solo la de artistas como dibujaba el prototipo anterior.

### 5. «Recién agregado»: una insignia, no una fila (segunda vuelta del prototipo, mismo día)

Founder, sobre la primera entrega: «Se lee muy redundante "Esta semana" por todos lados. Nuevos y esta semana pienso que se pueden fusionar, pero podríamos considerar chip (Recién agregado), puede ser: Destacados, Cercanos, Esta semana (con recién agregados), Populares (indistinto entre semanas) y Eventos nuevos esta semana (cambiar nombre a nuevos eventos)». Resuelto:

- **Se quita "esta semana" de todos los títulos salvo el de la fila 4** (que se llama, literal, "Esta semana"): "Destacados esta semana" → **Destacados**; "Eventos cercanos esta semana" → **Cerca de ti**; "Eventos populares" → **Populares**; "Eventos nuevos esta semana" → **Nuevos eventos**; "Lugares/Artistas con eventos esta semana" → **Lugares con eventos** / **Artistas con eventos**; "De tus favoritos" → **Seleccionados para ti**.
- **"Nuevos eventos" cambia de criterio, no solo de nombre.** Antes competía con "Esta semana" por los mismos eventos recién publicados dentro de los 7 días (y el `Set` de deduplicación decidía quién se los quedaba, a veces dejando a Nuevos casi vacío — la pregunta 1 de la vuelta anterior). Ahora son **solo** los publicados hace poco cuya fecha cae **después** de la ventana de 7 días: ya no compite por el mismo evento con "Esta semana", así que esa pregunta queda resuelta de raíz.
- **"Populares" ya era indistinto entre semanas** (`carrilPopulares` no filtra por fecha, solo por "Voy" ≥ 3): el nombre nuevo, sin "esta semana", deja de prometer algo que el criterio no cumplía.
- **Propuesta del gestor, a validar por el founder:** "Recién agregado" = publicado en los últimos 7 días. Es una **insignia**, no una fila nueva: puede salir en cualquier carril donde aparezca ese evento (Destacados, Cercanos, Esta semana, Populares…), no solo en "Esta semana". Reutiliza la misma insignia de fondo vidrio que ya usa "N van" (`Destacados.module.css .van`), con el icono que ya usa Novedades para "evento nuevo" (`IconoCalendarioMas`) — no se inventa una pieza visual nueva. El prototipo la muestra dos veces para probar que viaja entre filas: en "Esta semana" ("Rodada nocturna cultural") y en "Populares" ("Obra: Los de abajo", apilada con su "21 van").
- **Otra propuesta del gestor, a validar:** "Nuevos eventos" no se pinta con menos de 3 candidatos (mismo umbral que "Populares"). El prototipo lo demuestra: A1/A2/B1 tienen 3 (se ve); **B2 tiene solo 2 y el carril no existe** (mismo colapso sin hueco que cualquier carril vacío).

### 6. El chevron en vez de «Ver todos» (canon Apple Music)

Founder: «a un lado derecho del título agrega un angle icon ">" en lugar de botón de ver todos. Es más sutil y se parece al canon de Apple Music; lo que sucede cuando el usuario presiona ese elemento es que va a ver todos; cuida que el icono esté envuelto en un target invisible suficientemente grande para que la selección con tap no falle». Aplicado a los 9 carriles (32 encabezados entre las 4 pantallas):

- Se quita el enlace "Ver todos →" de la derecha. En su lugar, `IconoChevronDerecha` (ya existe en `ui/Iconos.tsx`) va pegado al final del título, del color `--texto-suave` — no un acento nuevo.
- **Todo el título + chevron es un solo enlace**, nunca un botón aparte: tocar el texto o el chevron hace lo mismo. Nombre accesible fijo: «Ver todos: &lt;título del carril&gt;».
- **El objetivo de toque del chevron mide 44×44 px**, aunque el glifo visible sea de 20 px — el pedido explícito del founder de que un toque cerca del icono, no solo sobre él, no falle. La insignia "Nuevo" del propio prototipo (no es de la app) queda fuera de ese enlace, para no competir con su objetivo.
- El prototipo agrega un panel "Revisión · área tocable del título" (no es un teléfono ni parte del diseño) con tres encabezados de ejemplo y el enlace sombreado en violeta, para que se vea exactamente cuánto mide ese objetivo — incluido que un título largo no lo reduce.
- Ningún carril de esta pieza se quedó sin destino, así que los 32 llevan chevron; si algún carril futuro no tuviera adónde ir, iría sin él (regla anotada, sin caso todavía).

### Preguntas abiertas para el founder

1. <s>Con "Esta semana" mostrando todo lo próximo de 7 días, "Populares"/"Nuevos" podían quedar muy cortos.</s> **Resuelta** con el nuevo criterio de "Nuevos eventos" (sección 5): ya no compite con "Esta semana" por los mismos eventos.
2. "Cerca de ti" se resuelve en el teléfono, después del primer pintado; "Esta semana" se calcularía en el servidor junto con Destacados/Populares/Nuevos. Hoy no hay forma de que ese cálculo del servidor sepa qué eligió Cercanos en el teléfono: un evento que es cercano y también cae esta semana podría, en un caso raro, salir en las dos filas. En este prototipo no ocurre (los datos de ejemplo se armaron para no chocar), pero al programarlo hay que decidir: ¿"Esta semana" excluye lo que Cercanos podría mostrar (aceptando el riesgo raro) o conviene mover también "Esta semana" al cliente para una deduplicación real?
3. El tope de 20 tarjetas en "Esta semana" es una propuesta del operador, no un número que haya pedido el founder — falta confirmarlo (o cambiarlo) antes de programarlo.
4. **Nuevo, de la segunda vuelta:** ¿"Recién agregado" = publicado en los últimos 7 días es la ventana correcta (o el founder prefiere otra, más corta)? ¿Y el mínimo de 3 para que "Nuevos eventos" exista es el número correcto?
5. El texto exacto de "Ver todos" de Tus planes: ¿siempre a `/perfil` (pestaña "Voy a" por defecto), o debería abrir directo en una pestaña que ya muestre los dos juntos (hoy no existe esa vista combinada en Perfil)?
