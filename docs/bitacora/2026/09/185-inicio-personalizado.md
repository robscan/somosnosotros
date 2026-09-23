# 185 · Inicio personalizado y buscador único, prototipo (OL-150)

**Fecha:** 2026-09-23 · **Rama:** `inicio-personalizado`, desde `origin/main` · **OL:** OL-150 (C2 + C4 de la cola) · **Modelo:** Sonnet 5, esfuerzo bajo-medio. Sin council, workflows ni subagentes (regla del founder: costo de tokens).

## De dónde sale

El founder, 2026-09-23, en `docs/ops/COLA_DE_PIEZAS.md`: pide una pantalla de inicio adicional con carruseles tipo Netflix (destacados, populares, cercanos esta semana, de tus lugares/artistas, artistas/lugares con eventos esta semana), cada uno con "Ver todos" hacia la sección real con sus filtros de siempre; y liga eso al pedido más viejo (L28) de que la persona sienta que usa un solo buscador para toda la app, con resultados agrupados por tipo y ordenados según la sección donde está. Es prototipo y documento, sin código (así lo pidió el gestor para esta pieza).

Leído antes: `docs/ops/OPEN_LOOPS.md` (entrada OL-150), `docs/ops/COLA_DE_PIEZAS.md` (filas C2/C4, renglones L4 y L28), `docs/DEFINICION.md`, `docs/rediseno/24-grafo-cultural.md` (ya anotaba "inicio por intereses" y "buscador único" como cánones pendientes), `docs/PRINCIPIOS_UX.md`, la regla "el contexto ordena, no limita" (bitácora 130), `src/components/AgendaInicio.tsx`, `src/app/page.tsx` (de dónde salen hoy `seguidos`, `eventosSeguidos`, `destacados`, `van_por_evento`), los tres campos de búsqueda (`components/ui/Buscador.tsx`, `app/lugares/VistaLugares.tsx`), `NavInferior.tsx` y memoria de pantalla, y el patrón de carril ya construido en `docs/rediseno/prototipos/boton-en-carriles.html` y en `Destacados.tsx`/`destacados.ts`.

## Qué se hizo

**Documento** `docs/rediseno/41-inicio-personalizado.md`: los 5 carriles del encargo con su criterio medible (reutilizando lo que ya existe: `seguimientos`, `cargarCercanos()`, `leerTira()`, el RPC `van_por_evento`), el orden propuesto en pantalla (favoritos → destacados → cercanos → populares → artistas/lugares de la semana), qué pasa con un carril vacío (no se muestra, misma regla que la tira de Destacados), recomendación de que "Para ti" sea una sección más en la barra inferior (no sustituye a Agenda — el founder pidió "adicional", y reemplazar la Agenda de hoy sería peor para quien solo quiere ver qué hay ahora, y peor para SEO), cómo se reparte el buscador único con los tres campos que ya existen (mismo componente `CampoBuscar`, una capa agrupada por tipo encima, con la sección donde está la persona mandando primero y con más resultados), qué datos ya existen y cuáles faltan (chip "esta semana" en Lugares/Artistas, orden por popularidad en Agenda, función de servidor que arme las 5 listas de una vez, búsqueda combinada en servidor), y 5 preguntas para el founder (posición de "Para ti" en la barra, si el buscador va siempre visible o se abre con lupa, si los carriles se podrán reordenar, qué hacer si Populares queda vacío al principio, y la definición de "esta semana").

**Prototipo** `docs/rediseno/prototipos/inicio-personalizado.html`: cuatro teléfonos a 390×844 con Bricolage Grotesque y el violeta `#6d34c8` de la línea gráfica vigente (`--primario`, ver `src/app/globals.css`), reutilizando el patrón de carril de `boton-en-carriles.html` (`grid-auto-flow: column`, `scroll-snap`) y las tarjetas de `Destacados.tsx` (foto, título, detalle):
- **A** — "Para ti" con sesión y con lugares/artistas seguidos: los 5 carriles en el orden propuesto.
- **B** — "Para ti" sin sesión: sin el carril de favoritos, con una tarjeta de invitación a crear cuenta (nunca bloquea, mismo tono que `ActivarAvisos`).
- **C** — el buscador único abierto desde "Para ti": resultados agrupados Eventos → Lugares → Artistas.
- **D** — el mismo buscador abierto desde Lugares: Lugares sale primero y con más resultados (así se ve cómo cambia el orden según la sección, que es lo que pide L28).

Es estático (sin JS de interacción): cada estado es un teléfono aparte, pensado para capturarse tal cual, como ya hacen otros prototipos de este mismo directorio (`administracion.html`, `boton-en-carriles.html`).

**Un bug encontrado y corregido durante la primera tanda de capturas:** en los renglones "32 van" y "21 van" del carril de Eventos populares, el `<span class="van-chip">` había quedado como hermano de `.foto` en vez de dentro (copiar-pegar de otra tarjeta). Como `.van-chip` es `position: absolute` y su contenedor no estaba posicionado, el navegador lo colocaba respecto al documento entero: la píldora aparecía en la esquina superior izquierda de toda la pantalla, tapando la hora. Se movió el `<span>` dentro de `.foto` en las dos pantallas donde se repetía (A y B) y se repitió la captura para confirmarlo.

## Capturas (`docs/rediseno/capturas-185/`)

Tomadas con Chrome real de la Mac vía `playwright-core` (instalado sin tocar `package.json` ni el lock, en el scratchpad de la sesión, con `npm install --no-save`), no con el truco de DOM a SVG del panel del navegador (ese renderiza el archivo como `data:` URL y no carga Bricolage de Google Fonts). Se comprobó `document.fonts.check('700 20px "Bricolage Grotesque"')` → `true` antes de capturar.

- **`185-a-con-sesion.png`** — "Para ti" con sesión: barra con el avatar violeta, campo de búsqueda "Buscar eventos, lugares, artistas", saludo "Para ti · San Luis Potosí · lo que ya sigues, primero", carril "De tus lugares y artistas favoritos" (Noche de jazz en Aurora Co-Lab, Cumbia Fantasma en vivo) y el arranque de "Eventos destacados" con el chip "14 van" bien colocado sobre su foto. Nav inferior con "Para ti" activo en violeta.
- **`185-b-sin-sesion.png`** — "Para ti" sin sesión: botón "Entrar" violeta en la barra, sin carril de favoritos, tarjeta lila "Sigue lugares y artistas" con botón "Crear cuenta", seguida de "Eventos destacados" y el arranque de "Eventos cercanos esta semana".
- **`185-c-buscador-inicio.png`** — buscador abierto desde "Para ti" con "materia" escrito: tres grupos en orden Eventos (2) → Lugares (1) → Artistas (1), cada uno con su "Ver todos".
- **`185-d-buscador-lugares.png`** — el mismo buscador, mismo texto, abierto desde Lugares (nav inferior con Lugares activo): el grupo Lugares sale primero, resaltado en el fondo lila, con 3 resultados en vez de 1; Eventos y Artistas quedan después. Muestra en una sola pantalla la diferencia que pide L28.

## Pruebas

Documentación y prototipo sin código: no aplica build ni unitarias (regla de "ajuste de pruebas por costo", `docs/ops/GESTION_DE_CAMBIOS.md`). Verificación hecha: las 4 capturas abiertas y descritas arriba, comparadas contra el HTML fuente; `document.fonts.check` en `true`; revisado a mano que ningún nombre real de persona ni correo aparece en el documento, el prototipo ni las capturas (los lugares nombrados —Aurora Co-Lab, Museo Federico Silva, CEART, Galería Gedovius, Teatro de la Paz, Casa del Poeta— son instituciones reales ya dadas de alta en la plataforma, no personas; los eventos y artistas de ejemplo son inventados, como en los demás prototipos del directorio).

## Estado y límites

Sin push ni PR (instrucción de esta pieza). `git status` limpio salvo lo que se comitea en esta rama. Queda para el gestor: decidir con el founder las 5 preguntas del doc 41 antes de que cualquier chat empiece el código de C2/C4.
