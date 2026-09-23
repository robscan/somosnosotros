# 188 · Inicio en la app, código (OL-153)

**Fecha:** 2026-09-23 · **Rama:** `inicio-app`, desde `origin/main` (43856a9) · **OL:** OL-153 · **Modelo:** Sonnet 5. Sin council ni subagentes (costo). Código, sin migraciones.

## De dónde sale

El founder pidió ir directo al código del inicio, «con la misma atención de siempre sobre el detalle» (OPEN_LOOPS, 2026-09-23), a partir de lo ya firmado en `docs/rediseno/41-inicio-personalizado.md` (prototipo, bitácora 185) y de la decisión posterior sobre los tres tamaños de tarjeta (grande, mediana, chica) anotada en la reserva de OL-153.

Lo leído: `CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-153 y el "Last updated" de `docs/ops/OPEN_LOOPS.md`, `docs/rediseno/41-inicio-personalizado.md`, el prototipo `docs/rediseno/prototipos/inicio-personalizado.html`, `docs/rediseno/20-destacados-flujo-y-estados.md`, `docs/PRINCIPIOS_UX.md`, la regla de memoria de pantalla y "filtrar no es navegar", y el código de partida: `AgendaInicio.tsx`, `Destacados.tsx`/su CSS, `ui/Cabecera.tsx`, `ui/Barra.tsx`, `VistaLugares.tsx`, `cargarCercanos`, `cargarEventosSemana`, `leerTira`, `seguimientos`, `van_por_evento`.

## Decisión propia: dónde vive Inicio

El encargo pedía "decidir y explicar" la ruta. Doc 41 ya argumenta, con el founder, que Inicio **no sustituye** a la Agenda: es una sección más (razón 2 del doc, la más importante — reemplazar la lista plana de `/` por un muro de carruseles es peor para alguien sin cuenta que solo quiere ver qué hay hoy, y peor para SEO, OL-059, donde `/` es la página más buscada del sitio). Por eso:

- **`/inicio`** es la pantalla nueva; **`/` sigue siendo la Agenda**, sin tocar su SEO (`generateMetadata`, canonical, `robots`/`sitemap` intactos; `/inicio` no entra a `RUTAS_ESTATICAS`, igual que `/perfil` o `/avisos`: es una vista personalizada, no una ficha que Google deba indexar).
- La barra inferior gana un cuarto icono, **Inicio primero** (`src/components/NavInferior.tsx`, `IconoCasa` ya existía): Inicio · Agenda · Lugares · Artistas.
- "La app abre en Inicio" se cumple en el sentido de la barra (primera posición, memoria de pantalla propia) y no como una redirección del dominio raíz, que habría deshecho la razón de SEO del propio doc 41. Si el founder quería literalmente que `/` cambiara de contenido, lo dejo anotado en OPEN_LOOPS para que el gestor lo confirme antes de tocar 64 archivos que referencian `"/"`.

## Qué se construyó

1. **`src/lib/cargarAgenda.ts`**: la consulta de la Agenda (eventos + seguidos + eventosSeguidos + asistencias + destacados) se sacó de `src/app/page.tsx` a una función compartida, para que Inicio la reutilice sin repetirla.
2. **`src/lib/inicio.ts`** (+ `inicio.test.ts`, 14 pruebas): lógica pura y probada — `eventosEstaSemana` (próximos 7 días, igual que `cargarCercanos`), `sinRepetidos`/`carrilPopulares` (mínimo 3 "Voy", igual que Destacados; sin repetir lo ya usado), `ordenBusqueda`/`limiteBusqueda` (el orden y el tope de grupos del buscador único según la sección).
3. **`src/app/inicio/page.tsx`** + **`src/components/Inicio.tsx`**: los seis carriles en el orden firmado (favoritos → destacados → cercanos → lugares de la semana → populares → artistas de la semana). Favoritos/destacados/populares se calculan en el servidor con `cargarAgenda` + `filtrarAgenda` (reutilizado, filtro "siguiendo") + `carrilPopulares`, deduplicando por id según se van calculando; lugares/artistas de la semana reutilizan `cargarEventosSemana` (ya existía, sin tocarlo). Cercanos vive en el cliente, igual que en `AgendaInicio`: solo si ya hay una ubicación fresca guardada (nunca pide permiso desde Inicio), filtrado a 7 días y sin repetir lo ya usado en los otros tres carriles de eventos.
4. **Un solo canon de tarjeta, tres tamaños** (`Destacados.tsx`, sin duplicar componente): `grande` (favoritos, destacados — ya existía), sin prop = mediana (cercanos, populares — el tamaño de siempre), `redondas` (lugares y artistas de la semana — la más pequeña que ya existía, hoy solo se usaba en Artistas; en Inicio también se aplica a Lugares por la decisión explícita del founder de dar jerarquía con tres tamaños). Se le agregó a `Destacados` un prop `verTodos` (enlace junto al título) — la única adición al componente; nada se dividió en dos.
5. **Buscador único**: `src/app/accionesBuscar.ts` (una acción de servidor con tres `ilike` en paralelo, tope 8 por tabla, mismo criterio de visibilidad que ya usan Agenda/Lugares/Artistas) + `src/lib/buscarUnificado.ts` (tipo y tope, en un archivo aparte porque un archivo `"use server"` solo puede exportar funciones async) + `src/components/ResultadosBusqueda.tsx` (el pintado, puro) + `src/components/BuscadorUnificado.tsx` (el que pide, con `debounce` de 250 ms). Vive dentro de `ui/Cabecera.tsx`, con la misma lupa: nada de una barra de búsqueda nueva. Se integró en Inicio y, además, en **Lugares** (`VistaLugares.tsx`, vista Lista): al escribir dos letras o más, `ResultadosBusqueda` reemplaza la lista de siempre con lugares primero; `ListaLugares` (la búsqueda en memoria de hoy) sigue intacta y vuelve al borrar el texto. No se tocaron los otros dos buscadores existentes (Agenda, Artistas por URL).
6. **Deep-links pequeños, para que "Ver todos" abra de verdad la pestaña correcta**: Agenda ahora acepta `?filtro=siguiendo`/`?filtro=cercanos` y `?q=`; Lugares acepta `?q=`. Artistas ya soportaba `?q=` (no se tocó).

## Lo que no se inventó (doc 41 lo marca como "Falta")

- El chip "Esta semana" en Lugares/Artistas no existe: "Ver todos" de esos dos carriles abre la sección tal cual (donde "Con eventos esta semana" ya se ve por defecto), no un chip nuevo.
- Un orden "por popularidad" en Agenda no existe: "Ver todos" de Populares abre Agenda en Todos, ordenado por fecha como siempre (documentado en el propio doc 41 como pendiente).
- El desempate exacto cuando un evento calificaría a la vez para Cercanos (carril 3, cliente, con ubicación) y Populares (carril 5, servidor): Populares se calcula primero y gana esa tarjeta; Cercanos no repite nada de Favoritos, Destacados o Populares. El founder no pidió ese nivel de detalle; lo dejo anotado por si prefiere el orden contrario.

## Pruebas

`src/lib/inicio.test.ts` (14 pruebas): ventana de "esta semana" (incluye el séptimo día, excluye el octavo, un evento en curso cuenta), que ningún carril repita lo de otro, el mínimo y el orden de Populares, y el orden/tope de grupos del buscador según la sección (Inicio/Agenda: eventos primero; Lugares: lugares primero; Artistas: artistas primero).

## Verificación

`npm run lint` (1 advertencia preexistente, sin relación, en `docs/diseno/logotipo/iconos-sn.mjs`), `npm run typecheck` y `npm test` (1070 pruebas, 83 archivos) en verde; `npm run build` verde (`/inicio` en la tabla de rutas). Antes de correr build/test hubo que sincronizar `node_modules` con `npm install` (dependencias del `package.json` que faltaban en el árbol, `@vercel/analytics` y `qrcode`; `package.json`/`package-lock.json` quedaron intactos, comprobado con `git status`).

**Capturas reales** (`docs/rediseno/capturas-188/`), `next build && next start` en el puerto 4188, Chrome real de la Mac vía `playwright-core` (instalado en el scratchpad, nunca en el repo), 390×844 a `deviceScaleFactor: 2`, `document.fonts.check('700 20px "Bricolage Grotesque"')` → `true` en las seis. Sin respaldo local de datos documentado para esta pieza (como en la bitácora 181), se armó un arnés temporal (`src/app/arnes188-temporal/`, con datos inventados, sin pasar por Supabase) que alimentó `Inicio`, `AgendaInicio` y `ResultadosBusqueda` directamente; se borró la carpeta entera antes de comitear.

- **`01-inicio-con-sesion.png`:** Inicio con sesión, cabecera con chip de ciudad y lupa (sin chip de fecha), carril "De tus lugares y artistas favoritos" (grande, apaisado) con su botón de asistencia flotando, y "Eventos destacados" debajo con "14 van"; sin foto, el símbolo SN.
- **`01b-inicio-tres-tamanos.png`:** captura de página completa, muestra los seis carriles y los tres tamaños uno debajo del otro — grande (favoritos, destacados), mediana (populares, con "32 van"/"21 van" y su botón "+") y chica/redonda (lugares y artistas de la semana, con el botón "Sigues" en verde donde ya corresponde).
- **`02-inicio-sin-sesion.png`:** sin sesión, sin el carril de favoritos, con la tarjeta de invitación ("Sigue lugares y artistas" / "Crear cuenta") arriba, en el mismo tono que `ActivarAvisos`; "Entrar" en la barra.
- **`03-ver-todos-siguiendo.png`:** "Ver todos" del carril de favoritos abre la Agenda ya en la pestaña "Siguiendo", con los mismos dos eventos agrupados por día ("Hoy"/"Mañana").
- **`04-buscador-desde-inicio.png`:** el buscador único, abierto desde Inicio, con "materia" escrito: grupos Eventos (2) → Lugares (1) → Artistas (1), cada fila con su miniatura (redonda para lugares/artistas) y su detalle.
- **`05-buscador-desde-lugares.png`:** el mismo buscador y los mismos resultados, abierto desde Lugares: el orden cambia a Lugares → Eventos → Artistas.

Antes de entregar: `git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` sin resultados (sin correos en el diff).

## Archivos

Nuevos: `src/lib/inicio.ts`, `src/lib/inicio.test.ts`, `src/lib/cargarAgenda.ts`, `src/lib/buscarUnificado.ts`, `src/app/accionesBuscar.ts`, `src/app/inicio/page.tsx`, `src/components/Inicio.tsx`, `src/components/Inicio.module.css`, `src/components/BuscadorUnificado.tsx`, `src/components/BuscadorUnificado.module.css`, `src/components/ResultadosBusqueda.tsx`, `docs/rediseno/capturas-188/` (6 PNG), esta bitácora. Tocados: `src/app/page.tsx` (usa `cargarAgenda`, deep-links `filtro`/`q`), `src/app/lugares/page.tsx` y `VistaLugares.tsx` (deep-link `q`, `BuscadorUnificado` en la vista Lista), `src/components/AgendaInicio.tsx` (props `filtroInicial`/`busquedaInicial`), `src/components/Destacados.tsx`/`.module.css` (prop `verTodos`), `src/components/NavInferior.tsx`/`.module.css` (cuarto destino, Inicio primero), `src/components/MemoriaPantalla.tsx` (tipo `Seccion` con `"inicio"`), `docs/ops/OPEN_LOOPS.md`.

## Qué falta

Segunda prueba del founder en su iPhone (Safari), como en toda pieza de esta fase. Commit local en `inicio-app`, sin push.
