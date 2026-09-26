# 246 · Inicio: «Tus planes», «Esta semana» y sin el aviso de crear cuenta, prototipo (OL-217)

**Fecha:** 2026-09-25 · **Rama:** `inicio-planes-semana`, desde `origin/main` · **OL:** OL-217 · **Modelo:** Sonnet 5. Sin council, workflows ni subagentes (regla del founder: costo de tokens).

## De dónde sale

Founder, 2026-09-25, palabras suyas (en la entrada OL-217 de `OPEN_LOOPS.md`): «Falta una fila de "eventos a los que voy" en inicio y eventos que me interesan. Aunque los tenemos en perfil, de momento no es relevante. Y dejemos de presentar el callout que invita a crear cuenta en inicio y en ese caso asegúrate de que se vean eventos de esta semana, no solo los nuevos o los destacados. Cuando no se tiene cuenta debemos ver eso con mayor jerarquía antes de artistas y lugares.» Y después: «Arranca prototipo para inicio y acepto tus recomendaciones». Pieza de **prototipo, sin código** de la app.

Leído antes: `docs/ops/OPEN_LOOPS.md` (entrada OL-217, con el orden ya aceptado por el founder), `docs/rediseno/41-inicio-personalizado.md` completo (segunda vuelta), los prototipos `docs/rediseno/prototipos/inicio.html` (v1, ya no representa la app de hoy) e `inicio-personalizado.html` (2ª vuelta, OL-150), y el código actual de Inicio: `src/components/Inicio.tsx`, `src/components/inicio/CarrilAgenda.tsx`, `CarrilCercanos.tsx`, `CarrilEntidad.tsx`, `CarrilEntidadCliente.tsx`, `CarrilEventosCliente.tsx`, `src/lib/inicio.ts`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/Destacados.tsx`/`.module.css`, `src/components/RenglonEvento.tsx`, `src/components/ui/BotonRenglon.tsx`/`.module.css`, `src/components/NavInferior.tsx`/`.module.css`, `src/components/Sesion.tsx`/`.module.css`, `src/components/ui/Iconos.tsx`, `src/lib/fechas.ts` (`diaCorto`, `formatearCuando`), `src/lib/destacados.ts` (`tarjetaEvento`), y cómo Perfil junta "Voy"/"Me interesa" (`src/components/ActividadPersona.tsx`, `src/lib/actividad.ts`, `src/app/personas/consultas.ts`).

## Un hallazgo antes de dibujar nada: el código ya no es el de la segunda vuelta

El doc 41 y su prototipo (`inicio-personalizado.html`, 2ª vuelta, 2026-09-23) describen **6** carriles con tarjetas de evento apaisadas 3:2 de ~230×153 px. El código que corre hoy en `src/app/page.tsx` tiene **7** carriles (Estelar, Cercanos, Lugares de la semana, Artistas destacados, Populares, Nuevos, Artistas de la semana — bitácoras 188 a 211 lo fueron ampliando después de esa vuelta) y tarjetas reales de tres tamaños fijos, medidos en `Destacados.module.css`: **grande** (165×248, cartel vertical 2:3, para lo curado por administración o por seguimiento — Estelar y Artistas destacados), **mediana** (220×132, apaisada, el tamaño de siempre de un evento suelto — Cercanos, Populares, Nuevos) y **chica/redonda** (104 px, círculo — Lugares y Artistas "con eventos esta semana", los dos, no solo Artistas como dibujaba el prototipo de la 2ª vuelta). Tampoco existe ningún `<h1>` de saludo en pantalla: `Inicio.tsx` va directo de la cabecera a los carriles.

Por instrucción del encargo ("el prototipo debe verse como la app de hoy, cambiando solo lo pedido"), este prototipo se construyó copiando esas medidas reales, no las del prototipo anterior. El doc 41 queda anotado con esta corrección en su nueva sección.

## Qué se hizo

**Documento** `docs/rediseno/41-inicio-personalizado.md`: sección nueva al final, «Tercera vuelta (OL-217)», que reemplaza el orden de carriles y la fila 5 de la tabla de la segunda vuelta (marcados explícitamente como reemplazados; el resto del documento — nombre "Inicio", posición en la barra, buscador con lupa — sigue firme). Cubre: quitar la invitación a crear cuenta, la fila nueva "Tus planes" (con sesión, une Voy + Me interesa por fecha, reutiliza `cargarPersona()`/`ActividadPersona` sin dato nuevo), la fila nueva "Esta semana" (todos los próximos 7 días por fecha, reutiliza la tarjeta de evento tal cual — decisión y justificación de por qué no agrupa por encabezados de día), el orden final con eventos siempre antes que lugares/artistas, cómo se extiende el `Set` de deduplicación que ya comparten Estelar/Populares/Nuevos (`sinRepetidos`, `src/lib/inicio.ts`) para incluir también Tus planes y Esta semana, la corrección de fidelidad frente a la 2ª vuelta (sin saludo, círculos también para Lugares de la semana), y tres preguntas abiertas para el founder (ver más abajo).

**Prototipo** `docs/rediseno/prototipos/inicio-planes-semana.html`: cuatro teléfonos a 390×844, estático (sin JavaScript de interacción — cada estado es su propio teléfono completo en HTML, se comprobó capturando con JavaScript desactivado, ver evidencia), con Bricolage Grotesque y los tokens reales de `globals.css` (`--primario` violeta `#6d34c8`, `--ok` verde `#1f6f43` para lo ya decidido):

- **A1 · Sin cuenta, con ubicación.** Sin la invitación a crear cuenta; el botón "Entrar" se queda. Orden: Destacados esta semana (grande) → Eventos cercanos esta semana (mediana, visible porque hay ubicación) → **Esta semana** (nuevo, mediana, con la marca "Nuevo" del propio prototipo para señalarlo) → Populares → Nuevos → Lugares de la semana (círculo) → Artistas destacados (grande) → Artistas de la semana (círculo). El Festival Independencia Cultural (45 "van") sale en Esta semana y **no** se repite en Populares, aunque calificaría — demuestra la deduplicación en un caso real.
- **A2 · Sin cuenta, sin ubicación.** Igual, pero "Eventos cercanos esta semana" no existe: nada la reemplaza como fila propia, y sus dos eventos (Cine club, Mercado de trueque) aparecen dentro de "Esta semana" en su lugar por fecha, porque nadie más los reclamó.
- **B1 · Con cuenta, con planes.** Arriba de todo, **Tus planes**: "Noche de jazz en Aurora Co-Lab" (mañana, ya decidido — botón verde con check) y "Cumbia Fantasma en vivo" (domingo, chip violeta "Te interesa") y "Concierto Sinfónica de la UASLP" (15 de octubre, fuera de la ventana de 7 días — demuestra que Tus planes no tiene tope de fecha, a diferencia de Esta semana). Como esos tres eventos ya salieron arriba, "De tus favoritos" y "Eventos populares" los excluyen (Populares queda con una sola tarjeta: la Sinfónica se la llevó Tus planes).
- **B2 · Con cuenta, sin planes.** La fila "Tus planes" no existe (mismo colapso sin hueco que cualquier carril vacío). "De tus favoritos" pasa a incluir los dos eventos que antes estaban en Tus planes (nadie los reclamó), ahora sin decidir (botón "+", sin chip); "Eventos populares" recupera también al Concierto Sinfónica, que ya no se lo lleva Tus planes.

Reutiliza tal cual el patrón visual ya existente para la marca Voy/Me interesa (el botón redondo verde-con-check / blanco-con-más de `BotonRenglon`, el chip violeta "Te interesa" de `Destacados.module.css`): no se inventó ninguna insignia nueva para "Tus planes".

## Capturas (`docs/rediseno/capturas-246/`)

Tomadas con el Chrome real de la Mac vía `playwright-core` (instalado con `npm i playwright-core --no-save` en el scratchpad de la sesión, sin tocar `package.json` ni el lock del repo — nunca el truco de DOM a SVG del panel del navegador, que no espera fuentes externas), `channel: "chrome"`, esperando `document.fonts.ready` antes de cada tanda:

- **`00-vista-general-1000px.png`** — los cuatro teléfonos lado a lado a 1000 px de ancho, para ver el conjunto y comparar A1/A2 y B1/B2 en una sola imagen.
- **`{a1,a2,b1,b2}-...-{arriba,medio,abajo}.png`** — cada teléfono a 390×844 real, por tramos (arriba: cabecera y primeras filas; medio: Esta semana/Populares/Nuevos; abajo: Lugares/Artistas de la semana y Artistas destacados) — 12 capturas.
- **`sin-js-b1-{arriba,medio}.png`** — B1 (el teléfono con más contenido nuevo: Tus planes + Esta semana) cargado con `javaScriptEnabled: false` en el contexto de Playwright. Comparadas a mano contra `b1-con-cuenta-con-planes-{arriba,medio}.png`: pixel por pixel el mismo contenido — confirma que la pantalla se pinta completa en el primer HTML, sin depender de ningún script (el pedido explícito del encargo, pensando en que el visor del founder a veces muestra una imagen fija).

Todas abiertas y revisadas antes de este cierre. Ningún correo real: el prototipo no tiene ningún campo de correo. Nombres de lugares (Museo Federico Silva, CEART, Teatro de la Paz, Aurora Co-Lab, Galería Gedovius, Casa del Poeta, Centro de las Artes, Templo del Carmen, Casa del Artesano, Centro Cultural Bicentenario) son instituciones reales o verosímiles de San Luis Potosí, no personas; eventos, artistas ("Disonauta", "La Lupita", "Camerata SLP", "Cumbia Fantasma", "Trío Jazz Aurora") y cifras de asistencia son inventados, como en los demás prototipos del directorio.

## Decisiones tomadas por el operador (recomendaciones aceptadas por el founder)

1. **"Esta semana" marca el día en cada tarjeta, no agrupa con encabezados de día.** Es un carril horizontal (Netflix), no una lista vertical: un encabezado de día no cabe en ese formato, y la tarjeta de evento que ya existe (`tarjetaEvento`) ya resuelve "Hoy · 20:00 · Lugar" en su `detalle` sin ninguna pieza nueva.
2. **Tamaño de tarjeta de "Tus planes" y "Esta semana": mediana** (220×132, la de Cercanos/Populares/Nuevos), no el cartel ni el círculo — son listas planas de eventos individuales, no una curaduría ni un avatar de entidad.
3. **Tope de "Esta semana": 20 tarjetas** (más alto que el tope de 12 del carril estelar, porque este carril presume ser "todos"). Es una propuesta del operador, no una cifra que haya dado el founder — pendiente de confirmar.
4. **"Ver todos" de Tus planes → `/perfil`** (no se inventa una vista nueva que junte "Voy a" y "Me interesa": ya son pestañas separadas ahí).
5. **La marca Voy/Me interesa reutiliza el botón y el chip que ya existen** (`BotonRenglon`, chip "Te interesa"): no se diseñó ninguna insignia nueva.

## Preguntas abiertas para el founder (de la primera vuelta; ver más abajo cuáles se resolvieron)

1. ~~Con "Esta semana" mostrando literalmente todos los eventos de 7 días, algunas semanas "Populares" o "Nuevos" pueden quedar más cortos o vacíos de lo que quedarían hoy.~~ **Resuelta en la segunda vuelta** (ver abajo): "Nuevos eventos" cambió de criterio y ya no compite por los mismos eventos.
2. "Cerca de ti" se resuelve en el teléfono (cliente); "Esta semana" se calcularía en el servidor. Hoy no hay forma de que el servidor sepa qué eligió Cercanos: en un caso raro, un evento podría salir en las dos filas. ¿"Esta semana" excluye lo que Cercanos podría mostrar (aceptando el riesgo raro) o conviene mover también "Esta semana" al cliente?
3. ¿El tope de 20 tarjetas en "Esta semana" es el número correcto, o el founder prefiere otro?

## Segunda vuelta del prototipo (mismo día, 2026-09-25)

El gestor trajo dos precisiones más del founder sobre esta misma pieza, transmitidas antes de que la viera terminada — mismo OL-217, misma bitácora, mismo PR #253, sin crear ninguno nuevo.

### 1. «Se lee muy redundante "Esta semana" por todos lados»

Founder, literal: «Se lee muy redundante "Esta semana" por todos lados. Nuevos y esta semana pienso que se pueden fusionar, pero podríamos considerar chip (Recién agregado), puede ser: Destacados, Cercanos, Esta semana (con recién agregados), Populares (indistinto entre semanas) y Eventos nuevos esta semana (cambiar nombre a nuevos eventos). Lo anterior aplica para A1 y A2, para B1 y B2: Tus planes, De tus favoritos cambiar por: Seleccionados para ti, los demás aplican las mismas recomendaciones».

Aplicado en `docs/rediseno/prototipos/inicio-planes-semana.html` (script de Python, en el scratchpad de la sesión, para los 32 encabezados de carril a la vez — no a mano uno por uno) y en `docs/rediseno/41-inicio-personalizado.md` (secciones 5 nueva y tabla corregida):

- **Renombrados, quitando "esta semana" de todo salvo del carril que se llama así:** "Destacados esta semana" → **Destacados**; "Eventos cercanos esta semana" → **Cerca de ti**; "Eventos populares" → **Populares**; "Eventos nuevos esta semana" → **Nuevos eventos**; "Lugares/Artistas con eventos esta semana" → **Lugares con eventos** / **Artistas con eventos**; "De tus favoritos" → **Seleccionados para ti** (mismo respaldo a "Destacados" sin seguidos).
- **"Nuevos eventos" cambia de criterio, no solo de nombre:** antes competía con "Esta semana" por los mismos eventos recién publicados dentro de los 7 días — la pregunta 1 de arriba, ahora resuelta. Su nuevo criterio es publicado hace poco **y** con fecha **después** de esos 7 días: ya no se cruza con "Esta semana".
- **Propuesta del gestor, marcada como tal en el doc y en el prototipo (no una decisión firme):** insignia "Recién agregado" = publicado en los últimos 7 días, la misma insignia de fondo vidrio que "N van" (`Destacados.module.css .van`), con el icono que ya usa Novedades para "evento nuevo" (`IconoCalendarioMas`) — sin inventar una pieza visual. Puede salir en cualquier carril, no solo en "Esta semana": el prototipo la repite en "Esta semana" ("Rodada nocturna cultural") y en "Populares" ("Obra: Los de abajo", apilada con su "21 van"), para probar justo eso.
- **Otra propuesta del gestor, también marcada a validar:** "Nuevos eventos" no se pinta con menos de 3 candidatos (mismo umbral que "Populares"). Demostrado con datos reales del prototipo: A1, A2 y B1 tienen 3 (se agregó un tercer evento ficticio, "Mural colectivo en el Barrio de San Miguel", para que se viera); **B2 se dejó con solo 2 y el carril directamente no existe** — mismo colapso sin hueco que cualquier carril vacío de `Destacados`.

### 2. «Un angle icon ">" en lugar de botón de ver todos»

Founder, literal: «a un lado derecho del título agrega un angle icon ">" en lugar de botón de ver todos. Es más sutil y se parece al canon de Apple Music; lo que sucede cuando el usuario presiona ese elemento es que va a ver todos; cuida que el icono esté envuelto en un target invisible suficientemente grande para que la selección con tap no falle».

Se quitó el enlace "Ver todos →" de los 32 encabezados de carril (9 carriles × 4 pantallas menos el que falta en B2) y se reemplazó por `IconoChevronDerecha` (ya existía en `ui/Iconos.tsx`, no se dibujó ninguno nuevo), pegado al final del texto del título, color `--texto-suave`. Todo el título + chevron quedó como un solo `<a>` (nunca un botón aparte): `aria-label="Ver todos: <título>"` para que el nombre accesible diga a qué carril pertenece, no solo "Ver todos" genérico. El objetivo de toque del chevron (`.chevron-target`) mide **44×44 px**, el mínimo accionable del canon (`--toque-min`), aunque el glifo dibujado sea de 20 px — exactamente el cuidado que pidió el founder, para que un toque cerca del icono y no justo sobre él no falle. La insignia "Nuevo" del propio prototipo (marca de qué carril es nuevo en esta pieza, no de la app) se dejó fuera de ese enlace para no competirle su objetivo de toque.

**Evidencia del área tocable, para revisión (pedido explícito):** se agregó un panel nuevo, "Revisión · área tocable del título" — no es un teléfono, no es parte del diseño final, vive fuera de `.telefono` con su propio fondo — con tres encabezados de ejemplo (`Destacados`, `Esta semana` con su insignia "Nuevo", y `Artistas con eventos` como título largo) con el `<a>` real sombreado en violeta y un borde punteado, para que se vea sin ambigüedad cuánto mide el objetivo de toque. Capturado aparte en `chevron-area-tocable.png`.

### Capturas repetidas

Las 15 capturas de la primera vuelta se repitieron completas (mismos nombres de archivo, contenido actualizado) más una nueva:

- **`chevron-area-tocable.png`** — el panel de revisión: "Destacados" con su recuadro violeta punteado (todo el título + chevron, un solo enlace), "Esta semana" con la insignia "Nuevo" fuera del recuadro, y "Artistas con eventos" (título largo) con el mismo objetivo de 44×44 px al final del texto.
- **`{a1,a2,b1,b2}-...-{arriba,medio,abajo}.png`** — mismos 12 archivos, revisados de nuevo: los 8-9 títulos de cada pantalla llevan ahora su chevron y sus nombres nuevos (`Destacados`, `Cerca de ti`, `Esta semana` con "Recién agregado" en "Rodada nocturna cultural", `Populares` con "Obra: Los de abajo" llevando las dos insignias apiladas, `Nuevos eventos` con 3 tarjetas en A1/A2/B1 y ausente en B2, `Lugares con eventos`, `Artistas con eventos`; en B1/B2, `Seleccionados para ti` en vez de "De tus favoritos").
- **`sin-js-b1-{arriba,medio}.png`** — repetidas con javaScriptEnabled:false; comparadas de nuevo contra las equivalentes con JavaScript: mismo contenido, confirma que el cambio de esta vuelta (chip, chevron, renombrados) sigue pintándose completo sin ningún script.

Las 16 abiertas y revisadas antes de este cierre.

## Preguntas abiertas para el founder (actualizado tras la segunda vuelta)

1. ~~Vaciado de Populares/Nuevos por "Esta semana".~~ **Resuelta** (ver arriba: nuevo criterio de "Nuevos eventos").
2. "Cerca de ti" (cliente) vs. "Esta semana" (servidor): el mismo riesgo raro de repetición que ya se anotó en la primera vuelta, sin cambios.
3. ¿El tope de 20 tarjetas en "Esta semana" es el número correcto?
4. **Nuevas, de esta vuelta:** ¿"Recién agregado" = 7 días es la ventana correcta? ¿El mínimo de 3 para que "Nuevos eventos" exista es el número correcto? (las dos son propuestas del gestor, marcadas como tal en el doc y el prototipo, no decisiones firmes).
5. El texto exacto de "Ver todos" de Tus planes: ¿siempre a `/perfil`, o una vista combinada que hoy no existe?

## Pruebas

Prototipo y documento, sin código de la app: no aplica `npm run lint && npm run typecheck && npm test` (regla de "ajuste de pruebas por costo", `docs/ops/GESTION_DE_CAMBIOS.md`). Verificación hecha: las 16 capturas (15 repetidas + `chevron-area-tocable.png`) abiertas y descritas arriba, comparadas a mano contra el HTML fuente y contra el código real de `Inicio.tsx`/`Destacados.module.css`/`Sesion.tsx`/`ui/Iconos.tsx` citado en cada sección; capturas con y sin JavaScript comparadas otra vez para confirmar el pintado completo sin script tras los cambios de esta vuelta; revisado a mano que no aparece ningún correo ni nombre de persona real en el documento, el prototipo, la bitácora ni las capturas.

## Estado y límites

PR [#253](https://github.com/robscan/somosnosotros/pull/253), sin unir a `main` (instrucción de esta pieza: solo PR, sin merge). Queda para el founder: las preguntas abiertas de arriba (la mayoría ya resueltas o son propuestas a validar, no bloqueos), antes de que cualquier chat empiece el código de OL-217.
