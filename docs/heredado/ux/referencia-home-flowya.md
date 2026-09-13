> **HEREDADO** de `flowya-ios/docs/design-system/handoff-2026-07-15/home.md` @ `b19c676` · **Modo: REFERENCIA** · Estado: **SIN RE-VALIDAR** — vale para somosnosotros hasta que el primer OL que lo invoque lo confirme o lo enmiende. Nota de herencia: sheet=home con secciones que no se dibujan si están vacías. Los nombres "Flowya"/"FLOWYA" y las referencias a Passport/viajero/iOS-only se leen como legado; nada de este archivo es ley nueva por sí mismo (ver `docs/ESTRATEGIA_DE_HERENCIA.md`).

# Ficha — Home (map-first, sheet = el home)

**Superficie:** home map-first — el mapa siempre visible en root; el sheet ES el home. Cards ↔ list son el MISMO nivel de navegación en dos formatos (toggle, no drill). El drill converge en MEMORIA.
**Verificado contra repo:** 2026-07-15 · rama main. Fuentes: `PassportHomeSheetContent.swift`, `PassportSheetVoiceHeader.swift`, `PassportHomeNowContext.swift`, `PassportVisualHomeStubView.swift` (SearchFilter/HomePhoto/HealthValueSheet/WalksReveal), `PassportTripSurfaceView.swift` (peek L298, mesh L3136, detents L3312), `PassportAppRootView.swift`.
**Estado:** IMPLEMENTADO (MF-1b + TOGGLE + voz v3 + G2a-fix6). G2b (rebuild contra audit 116) sigue GATED — esta ficha documenta lo ejecutado hoy.

---

## 1 · Geometría (pt)

**Sheet (modo home):** detents `peek 128` (`PassportTripSurfaceModel.peekHeight`) · `.medium` · `.large`. Grabber visible SOLO en home (regla 34). Fondo `sheetGlass(mesh)`; interacción con el mapa habilitada hasta `.medium`; `interactiveDismissDisabled`.
**Atmósfera por contenido** (nunca al revés): home cards `.aurora` · lista `.cityGlow` · MEMORIA abierta `.dawn` · todos los pasos de entrada `.aurora`.

| Elemento | Valor |
|---|---|
| **Chrome (handoff-2, reemplaza la barra base píldora)** | **Switch de vista** = icono-solo **circular 44** (▦ Cards / ☰ List, **muestra el destino**), **vidrio FAB** (`rgba(20,24,32,0.7)` + borde 16% + sombra `0 8 20 /0.4`), **flotante top-trailing del sheet, FUERA del flujo del título** (libera el ancho completo al hero; 44 < FABs 52 para distinguir toggle de acción). **Buscar + ＋** = dos FABs **flotando abajo-izquierda, SIN envolvente** (círculos 52, vidrio 70% + borde 16% + sombra `0 10 26 /0.5`), targets 44. **Aparecen desde medium**; en **peek** todo el chrome se oculta (solo título). Al profundizar se oculta el **switch** (regla ref-D: nivel país conserva Buscar/＋; MEMORIA oculta también los FABs y aparece la herramienta de sección). **Delta Code:** ex-segmento ▦\|☰ píldora + control-bar en el voice header → switch contextual circular flotante + FABs flotantes |
| Radio de controles/campo búsqueda | `Radius.md 14` continuous |
| Cards de lugar (jerarquía por tier) | **alto FIJO por línea; la prioridad L>M>S se codifica por ANCHO, nunca por alto** (canon §05 Passport 2: "mismo alto, ancho variable"). Corrige el spec viejo "cuadradas 120/104/88" (alto variable = PROHIBIDO). Alto común único + anchos por tier en `CardScale` (pase de valores exactos pendiente) — viven en lista/badges |
| Cards editoriales (vista cards, APROBADA T2) | slider de cards de foto que **sangra al borde derecho** (210/190 pt @393, h 150); nombre 13 w700 sobre scrim; reemplaza el rail de tiers |
| Cards de viaje (rectangulares, evidencia foto) | **140 × 84** (`CardScale.tripWidth/Height`) |
| Radio de cards | `Radius.chip 12` continuous |
| Badge | texto 9 semibold · padding h `xs 6` · v 2 · cápsula |
| Banner actividad · invitación | **tinte accent** (bg `accent·0.12` · borde `accent·0.38`) · 1 línea · padding `sm 10` · radio `Radius.md 14`. Review (post-connect): glass neutro |
| Spacing raíz del contenido | `Space.lg 22` entre bloques · secciones internas `xs 6` · rails horizontales gap `sm 10` (el rail **sangra al borde derecho**: sin inset trailing, última card recortada = carrusel) |
| Filas de resultados búsqueda | padding v `xs 6` · divisor `textSecondary·0.15` |
| Foto placeholder | fill `textSecondary·0.15` + SF `photo` |

## 2 · Jerarquía

```
PassportTripSurfaceView (root: mapa/globo vivo)
└─ sheet .home → PassportHomeSheetContent  — VStack(leading, lg):
   ├─ PassportSheetVoiceHeader (COMPARTIDO verbatim con la lista)
   │  ├─ eyebrowRow: dot 6pt (pulsa si ongoing) + Label — "NOW · {PLACE}" / "HOME BASE"
   │  └─ hero SIEMPRE (ongoing y rest): "N countries, M cities" (récord) · lineLimit(1) · v4
   │     (MUEREN: narrativeRow, statsLine y el pull "Last trip" — no contamos fotos ni días)
   (＋/buscador NO viven en este patrón → componente propio pegado a base de pantalla, ficha pendiente)
   ├─ si buscando (≥2 chars): searchResultsSection (filas → MEMORIA)
   └─ si no (y no peek):
      ├─ ESTANTES (cada uno una consulta sobre el registro; vacío = no se dibuja)
      │  ├─ "Now"                → HERO full-width (0 o 1 card)
      │  ├─ "Moments"            → rail horizontal
      │  ├─ "Where you've lived" → rail horizontal (tier lived + home, y NADA más)
      │  ├─ "A season"           → rail horizontal (tier stay)
      │  └─ "Keep coming back"   → rail horizontal (≥2 episodios)
      └─ suggestionsBand: healthInvitationCard | activityReviewCard
```

**Peek = momento de voz puro, HUG del título** (F7): solo eyebrow/hero — **sin chrome** (switch/Buscar/＋ ocultos), sin cards, sin banda (`compact: true`). Alto: repo `peekHeight 128`; Sala compactó a **hug del título ≈ 88** — **PENDIENTE** cerrar valor con founder. Detents = `peek · medium · extended(.large)`.

## 3 · Estados

| Estado | Trigger | Qué cambia |
|---|---|---|
| Rest (reposo) | sin trip con endDate ≤ 7 días (`ongoingWindow`) | dot estático gris · eyebrow `HOME BASE` · hero = récord "N countries, M cities" (v4) |
| Ongoing (en viaje) | trip con endDate dentro de 7 días | dot accent pulsando · eyebrow `NOW · {PLACE}` · hero = récord "N countries, M cities" (v4, sin narrativa) |
| Buscando | query ≥ 2 chars | header sin hero/narrativa; body = resultados; host sube detent a `.large` |
| Search sin resultados | filtro vacío | "No matches" + hint |
| Peek | detent 128 | solo voz (compact) |
| Salud no conectada | `healthConnected == false` | healthInvitationCard en la banda |
| Salud conectada | `healthConnected == true` | activityReviewCard (mensaje COMPLETION, nunca "refresh") |
| Conectando/Reviewing | `isConnectingHealth` | CTA del banner deshabilitado, texto `Connecting…`/`Reviewing…` |
| Switch de vista cards↔list | **switch contextual** (icono del destino, **circular, flotante top-trailing FUERA del flujo del título**) | mismo nivel, mismo header; cambia el body. **Delta Code:** ex-segmento ▦\|☰ → icono contextual circular flotante |
| País — city-cards (Δref-D 07-17) | tap card de país ("Where you've lived") o pin del mapa | push `.country`: body = **grid city-cards** 2 col (172×150 r12, gap 12, pad 18), hero país 28 + `{N} cities` 13, back 40 vidrio; **switch oculto**, FABs quedan; formato canónico único (la lista NO drillea — acordeón §14). Back restaura origen exacto |
| Peek (sin chrome) | detent hug-título | switch + Buscar/＋ **ocultos**; solo el título |
| Medium/Extended | `.medium` / `.large` | chrome visible (switch + Buscar/＋); extended = full-screen, handler prominente |

**Búsqueda (motor local `PassportHomeSearchFilter`):** meses (nombre/3 letras) · años 4 dígitos (1990–2035) · tokens de texto contra país/áreas (diacrítico-insensible) · dedup por trip id · resultado → MEMORIA de ese trip (F3), nunca la lista genérica.

**Badges (taxonomía cerrada §05, precedencia `now > home > lived > a season`):** now = cápsula blanca/texto negro · home = cápsula accent/texto blanco · lived = glass/textPrimary · a season = glass/seasonHint. UNA por card (`PassportBadge`).

**Orden de estantes = FIJO** (Now → Moments → Where you've lived → A season → Keep coming back): presencia → recencia → pertenencia → frecuencia. Un orden fijo se aprende; uno "por relevancia" obliga a re-buscar cada vez. **Estante vacío = estante invisible**, sin estado vacío propio. Un lugar puede pertenecer a varios estantes (lived + keep coming back): no es duplicación, son dos preguntas distintas y las dos son ciertas.

**Membresía y geometría por estante (Δ08-06):**

| Estante | Membresía | Orden interno | Card |
|---|---|---|---|
| Now | evidencia en curso (`isNow`) | — (0 o 1) | full-width × 180, r12 |
| Moments | lugares con momentos recientes | recencia | 220 × 184, r12 |
| Where you've lived | tier `lived` + home, y nada más | recencia de episodio | 156 × 140, r12 |
| A season | tier `stay` | recencia | 156 × 140, r12 |
| Keep coming back | ≥2 episodios | nº de episodios | 156 × 140, r12 |

**MUERE la jerarquía por ancho de card** (ex home 156 / lived 124 / season·rest 108): con la membresía homogénea por construcción, dentro de un estante todos los miembros son iguales y el ancho ya no codifica nada. **Ancho uniforme por estante**; el estante ES la jerarquía. La regla de alto fijo por línea (§05) se conserva.

**Fichados, NO shipeados** (consultas listas, añadir es una línea): This year · {País} on your map · Still locating · Walked, not photographed.

## 4 · Copy (EN exacto)

| Clave | String | Contexto |
|---|---|---|
| home.eyebrow.now | `NOW · {PLACE}` (uppercased) | ongoing |
| home.eyebrow.rest | `HOME BASE` | rest |
| home.hero.record | `{N} countries, {M} cities` | HERO SIEMPRE (ongoing y rest) — v4 · `cityCount` = dato NUEVO |
| ~~home.narrative.ongoing~~ | — | MUERE (v4): no contamos fotos ni días |
| ~~home.pull.lastTrip~~ | — | MUERE (v4): la 3ª línea desaparece; MEMORIA sigue por cards/búsqueda |
| home.shelf.now | `Now` | Estante HERO — solo con evidencia en curso |
| home.shelf.moments | `Moments` | Title (ex-`Trips`; editorial, no es count-noun → convive con cities) |
| home.shelf.lived | `Where you've lived` | Title (ex `Places you've lived`). **Ya no miente:** solo tier lived + home |
| home.shelf.season | `A season` | Title — tier stay |
| home.shelf.comingBack | `Keep coming back` | Title — ≥2 episodios |
| passport.eyebrow | `YOUR PASSPORT` | lista (reemplaza al voice header en modo lista) |
| passport.hero | `{N} countries` | hero de la lista |
| list.country.count | `{N} cities` | conteo por país (ex-`N trips`/`N places`) — cities distintas (`PassportCountryGroup.cityCount`), doctrina 07-16 |
| list.row.city | `{City} · {MMM yyyy}` (o `{yyyy}` si es viejo · relativo "this week") | hija del acordeón = CITY; **anatomía canónica §12: city a la izquierda, fecha al trailing** (el string es el contenido, no el layout); conteo del país **apilado** bajo el nombre (13/11) + badge estado al trailing; tap → MEMORIA de esa city |
| list.addCity | `Add a city` | fila accent al fondo del grupo expandido (ex-`Add a trip`/`Add a place`) |
| list.overflow (···) | `Rename city` · `Correct location` · `Hide city` | ··· por city = renombrar/corregir (reasigna país/área ambigua) |
| list.toast.hidden | `Hidden “{city}”` / `Undo` | swipe = OCULTAR (reversible, no destructivo — neutral, no rojo) |
| home.badge.* | `now` · `home` · `lived` · `a season` | cápsulas |
| home.search.placeholder | `Search your places` | TextField — **repo gana** (UX-012 resuelto 08-06: la promesa se arregló, no el motor). Ex `Where was I last February?` (conversacional, prometía lo que el motor local no hace) |
| list.row.unnameable | `Somewhere in {region}` + invite `Name this place` (accent, 2ª línea) + portada 34×34 r7 | **Δ08-06.** Solo cuando el título COLISIONA con otra fila del mismo país. Tap del invite → picker `Name this place`. Al nombrar, portada e invite desaparecen de la fila |
| home.search.empty.title | `No matches` | |
| home.search.empty.hint | `Try a country, area, month, or year.` | |
| home.health.invite.line | `Walks make your map surer.` | **Δ08-07 (D-2):** la redacción anterior (`Your walks find cities your photos missed.`) **prometía acuñar** — violaba la regla dura 1 y D1 rama (b), ley permanente. Voz PROPIA del banner, firmada por el founder: no repite la frase de la hoja `Walks`. | banner pre-connect · UNA línea ("places"→"cities" Δ2.1 — doctrina 07-16; atlas §12 ya lo decía; el VoBo 07-15 fue pre-doctrina) |
| ~~home.health.invite.sub~~ | — | ELIMINADO 07-15: banner a 1 línea |
| home.health.invite.cta | `Add my walks` / `Connecting…` | accent trailing / textSecondary disabled |
| home.health.review.title | `Complete your passport with your activity` | banner post-connect |
| home.health.review.sub | `We read your walks to strengthen the places you already have.` | **Δ08-07 (D-2):** ex `We review your walks and workouts for cities your photos missed.` — misma violación. La frase dice el verbo real (*strengthen*) sobre el objeto real (*places you already have*). |
| home.health.review.cta | `Review` / `Reviewing…` | voz: nunca "scanning" |
| a11y.add | `Add a city you visited` | |
| a11y.search | `Search your passport` / `Clear search` | |
| a11y.toggle | `Cards` / `List` | + trait isSelected |
| a11y.lastTrip | `Last trip, {detail}. Opens its memory.` | |

Value sheet de salud y reveal de walks (segundo nacimiento): ficha aparte cuando la pidas — copy ya verificado en `PassportHealthValueSheet` / `PassportWalksRevealView`.

## 5 · Color

| Token | Uso aquí |
|---|---|
| `accent` #4E9EFF | dot ongoing, CTA banners, ＋, segmento activo (+fondo `accent·0.16`), pull last trip, badge home |
| `textPrimary` #E8EDF6 | hero, titles, narrativa, badge lived |
| `textSecondary` #8C97AB | eyebrow, statsLine, dot rest, iconos inactivos, subs |
| `seasonHint` #FFC24B | SOLO texto badge "a season" |
| `surfaceGlassFill` white·8% | fondo controles, campo búsqueda, toggle, banners, badges glass |
| `surfaceGlassBorder` white·12% | borde 0.5 de esos mismos |
| `textSecondary.opacity(0.15)` | divisores, placeholder foto |
| `accent·0.12` / `accent·0.38` | fondo / borde del banner de invitación (tinte accent; contraste título ≈13:1 AAA · CTA ≈5.6:1 AA) |
| `bad` + scrim negro 0.32 | reveal Delete del swipe — blanco 5.5:1 AA; fila deslizada opaca `#12161c` |
| Scrim de card | negro 0.82 → 0.15 → 0 (bottom→top); labels blancos sobre foto (0.72 el meta) |
| `.white` / `.black` | badge now |

## 6 · Tipografía

| Elemento | Estilo | Valor |
|---|---|---|
| Eyebrow | `TextStyle.label` | 11 · w700 · +1.76 · CAPS · FIJA |
| Hero (récord o lugar) | `TextStyle.hero` | 28 · w800 · −0.56 · lineLimit(1) · fit-first vía ViewThatFits |
| Section titles | `TextStyle.title` | 17 · w700 · −0.17 |
| statsLine | `TextStyle.data` | 13 · tabular |
| Narrativa / pull | `.footnote` (+`.semibold` el pull) | semántico — ESCALA |
| Banner título / CTA | `.footnote.weight(.semibold)` | lineLimit(2) |
| Banner sub | `.caption` | lineLimit(2) |
| Card label / meta | `.caption.weight(.semibold)` / `.caption2` blanco·0.72 | lineLimit(1); título fit-first (candidatos) |
| Badge | `.system(size: 9, weight: .semibold)` | FIJA |
| Resultado búsqueda título/meta | `.subheadline.semibold` / `.caption` | |
| Campo búsqueda | `.subheadline` | autocorrect OFF, autocapitalization never |

## 7 · Motion

| Trigger | Curva | Duración |
|---|---|---|
| Dot del eyebrow (ongoing) | `.easeInOut.repeatForever(autoreverses)` opacidad 1→0.35 | 1.1 s · OFF con Reduce Motion |
| Expandir búsqueda | `.easeInOut` | 0.20 s |
| Contadores vivos | herencia de `.numericText()` en birth; aquí estáticos | — |
| Reduce Motion | dot estático; sin pulso | — |

## 8 · Hápticas

Home en sí NO vibra (scroll/navegación/sheets prohibidos). Los momentos cercanos: `savePassport()` al aterrizar el birth (L642) · `revealPresented()` `.impact(.soft)` al presentar el reveal de walks · `walkFinding(placeKey:)` `.impact(.light, 0.4)` por lugar nuevo (throttle por placeKey redondeado a 2 decimales).

## 9 · Esqueleto SwiftUI (símbolos verificados)

```swift
// Hosteado por PassportTripSurfaceView en sheet .home — NO es una pantalla propia
PassportHomeSheetContent(
    groups: model.groups,                          // BACKEND: snapshot de trips
    residencesByCountry: model.residencesByCountry, // BACKEND
    homeCountry: model.homeCountry,                 // BACKEND
    healthConnected: model.healthConnected,
    isConnectingHealth: model.isConnectingHealth,
    onConnectWalks: { model.connectHealth() },      // BACKEND: HealthKit
    onExplore: { country in model.selectCountry(country) },
    onOpenTripMemory: { trip in model.openMemory(trip) },
    compact: model.detent == PassportTripSurfaceModel.peek,  // F7
    sheetMode: model.sheetMode,                     // .home | .passport
    onToggleMode: { model.sheetMode = $0 },
    onAddPlace: { showAddPlaceSheet = true },
    isSearching: $isSearching,        // host sube a .large cuando true
    query: $query,                    // persiste a través del toggle (D)
    isSearchExpanded: $isSearchExpanded
)
// Header compartido: PassportSheetVoiceHeader (idéntico en cards y lista)
// Voz derivada puro-testeable: PassportHomeNowContext (phase/eyebrow/heroPlaceCandidates/narrativeDetail/lastTripPull)
// Búsqueda: PassportHomeSearchFilter.filter(groups:query:calendar:)
```

## 10 · Changelog

**2026-08-06 — paquete post-R4, pieza 10 (VoBo founder): el home de cards pasa a ESTANTES.** Cinco estantes firmados, cada uno una consulta declarada sobre el registro v3: **Now** (hero full-width) · **Moments** · **Where you've lived** · **A season** · **Keep coming back**. **Estante vacío = estante invisible** (regla dura). **La mentira de "Where you've lived" muere por construcción:** era el rail de TODOS los países con la jerarquía codificada por ancho de card (home 156 / lived 124 / season·rest 108, ficha B delta 2); ahora es tier `lived` + home y nada más. **Consecuencia:** muere la jerarquía por ancho — dentro de un estante la membresía es homogénea, así que **ancho uniforme por estante**; el estante ES la jerarquía (la regla de alto fijo de §05 se conserva). Orden FIJO. Fichados pero NO shipeados: This year · {País} on your map · Still locating · Walked, not photographed. **Δ pieza 2:** la fila innombrable gana portada 34×34 + invite `Name this place` **solo cuando el título colisiona** con otra fila del mismo país (el picker es el mismo del visor — ver `navegacion.md`). **Δ UX-012 (repo gana):** `home.search.placeholder` = `Search your places`; la ficha decía `Where was I last February?` — STALE desde el slice Tier 1+2. **Delta Code:** `PassportHomeSheetContent` pasa de 2 rails fijos a N estantes-consulta con ocultado por vacío + ancho uniforme.

**2026-07-17 (c) — Nivel país = CITY-CARDS (Paquete D, decisión founder).** Tap en card de país (cards) o pin → grid de city-cards (172×150 r12); formato canónico único del nivel; el acordeón de la lista queda intacto (§14). Switch oculto al profundizar; FABs permanecen. **Delta Code:** `enterCountryDrill` sin forzar `.passport`; `onExplore` → `enterCountryDrill`. Refs: `handoff/flowya-passport_ref-D-navegacion-visor_v2.1_2026-07-17/`.

**2026-08-07 — Banners de salud: voz propia y honesta (D-2, devolución de Code; VoBo founder).** `home.health.invite.line` y `home.health.review.sub` **prometían acuñar lugares** ("find cities your photos missed") — quedaron STALE contra D1 rama (b), ley permanente firmada el 08-06, y contra la regla dura 1 del barrido de voz. El repo ya renderizaba la corrección barata de ingeniería; el founder firma en su lugar una **voz propia del banner**, distinta de la hoja `Walks` para que la invitación no sea una cita: **`Walks make your map surer.`** y **`We read your walks to strengthen the places you already have.`** Ninguna promete lugares nuevos; ambas dicen qué gana el usuario. Persona 2ª, coherente con la pieza 5.

**2026-07-17 (b) — Barrido doctrina en banners salud (Δ2.1).** `home.health.invite.line` + `home.health.review.sub`: "places" → **"cities"** (doctrina 07-16; el atlas §12 ya lo decía — el VoBo de la banda fue 07-15, pre-doctrina). §4 anota la anatomía canónica de la lista (§12: fecha al trailing, conteo apilado, badge estado en el país). Refs B corregidas.

**2026-07-17 — Switch de vista: circular flotante (VoBo founder, Sala).** El switch pasa de rounded-square 44 r14 *alineado al título en el header* → **circular 44 flotante top-trailing del sheet, FUERA del flujo del título**: el hero se apretaba en récords largos, ahora usa el **ancho completo**. Vidrio FAB (70% + borde 16% + sombra `0 8 20 /0.4`); **44 < FABs 52** para distinguir toggle de acción; oculto en peek. Canonizado en **Passport 4 §12** y en refs `handoff/referencias-2.1/referencias-B.md`. **Delta Code:** el switch NO comparte fila con el título → migrar a control flotante circular.

**2026-07-16 (c) — Handoff-2: cities + chrome + detents + swipe/menú.** Vocabulario **cities** (doctrina 07-16, `doctrina-lugares.md`): lista conteo `{N} cities` (`cityCount`), hijas = cities (`{City} · {MMM yyyy}`), `Add a city`, ···=`Rename city`/`Correct location`/`Hide city`, swipe=`Hide`+Undo. Rail home-bases `Places you've lived` → **`Where you've lived`**; rail ex-Trips = `Moments`. **Chrome:** ex-segmento ▦\|☰ píldora + control-bar → **switch contextual icono-solo** (muestra destino, alineado al título top-trailing) + **Buscar/＋ FABs flotantes sin envolvente abajo-izq**; peek oculta todo el chrome (hug del título). **Detents** `peek · medium · extended(.large)`; extended full-screen con handler 72×5. **Delta Code:** migrar toggle segmentado→switch contextual, control-bar→FABs, `cityCount` en filas, peek hug. Símbolos verificados: `PassportTripSurfaceModel.detent .peek/.medium/.large`, `swipeActions`, `PassportSheetVoiceHeader.toggleSegment` (a reemplazar).

**2026-07-16 (b) — Regla de alto de cards reafirmada (reto founder).** Place cards = **alto fijo por línea; el ancho codifica prioridad L>M>S** (ya canon en §05 Passport 2, panel ✗"alturas distintas" / ✓"mismo alto, ancho variable"). Se corrige el spec de §1 que decía "cuadradas 120/104/88" (alto variable). **Delta Code:** el repo dibuja cuadradas tiered (120/104/88) → migrar a alto común + anchos por tier. `escala-dispositivos.md` alineada; Sala 2a repintada.

**2026-07-16 — Doctrina de LUGARES (enmienda Tanda 2, VoBo founder).** El pasaporte habla de lugares, no de viajes (`handoff/doctrina-lugares.md`). Lista: conteo de país `{N} places` (ex "N trips"); hijas = lugares con mes/año; tap → MEMORIA del lugar; **swipe = ocultar** (reversible, `Hidden “{place}”`/Undo, ex Delete); ··· = `Rename place`·`Correct location`·`Hide place`; alta `Add a place`. Rail `Trips`→`Moments` (pick founder pendiente; "Places" colisiona con "Places you've lived"). Voz/hero sin cambio. Encodings PROPUESTOS en Sala 2a; atlas §12/§05 pendiente "pásalo igual".

**2026-07-15 — creación.** Verificada contra main. Discrepancias atlas ↔ código (repo gana):
0. **Voice header v4 (aprobado 2026-07-15, NO en código aún):** 2 líneas — eyebrow + "N countries, M cities" SIEMPRE. Mueren narrativa/pull/statsLine; `cityCount` es dato NUEVO (ciudades = áreas nombradas únicas). Código actual dice hero "N countries · M trips" solo ongoing + lugar en rest — Code debe migrar. ＋/buscador salen del header a un componente base de pantalla (ficha pendiente).
1. **El atlas aún ilustra el home con placeholders rayados y grilla 2-col vertical**; el código real usa **rails horizontales** (ScrollView .horizontal) de cards cuadradas tiered (120/104/88) + trips 140×84 con foto real (`PassportHomePhoto`). El §03b ("grilla de países 2 columnas · gap 12") describe la dirección G2b propuesta, NO lo ejecutado — queda como propuesta gated.
2. **Búsqueda**: atlas la llama "conversacional"; lo ejecutado es motor local estructurado (meses/años/tokens). El placeholder sí es la pregunta conversacional.
3. **"Ask your passport…"** del atlas no existe en código; el placeholder real es `Where was I last February?`.
4. **DATA GAP reportado en código** (no inventar): `PassportResidence` solo trae `countryName` — las place cards y el hero en rest muestran PAÍS, no área ("Mexico", no "Playa del Carmen"), hasta que aterrice el plumbing de área de residencia.
5. Los banners de salud usan `.footnote`/`.caption` semánticos, no la escala fija del atlas.

**2026-07-15 (b) — Tanda 1 VoBo.** Aterrizaje post-nacimiento: reveal de pins + banner de actividad **una vez** dentro del sheet. Banner de invitación → **tinte accent**, **1 línea** (`Your walks find places your photos missed.`), CTA **`Add my walks`** (era `Add your walks` + sub). Rails de cards **sangran al borde derecho** (carrusel). El review card (post-connect) y su cadencia no cambian.

**2026-07-15 (c) — Tanda 2 APROBADA (sala 4a–4d).** Entrega estándar de la familia home: **cards · lista · peek · MEMORIA** juntas (declarado por founder). Cards = voz-héroe + slider editorial que sangra + banda quieta + barra §05 en base. Lista = eyebrow YOUR PASSPORT + acordeón (métricas del panel §12: país 13 w600 · conteo 11 apilado · fila 12 · meta 11 · indent 26), badge al trailing, ··· corrección, swipe Delete AA + Undo. Peek 128 = voz pura sin barra. MEMORIA = dawn + serif inkGold, mapa portada RT **full-bleed continuo detrás de todo** (el sheet de vidrio se encima; el blur a través del vidrio es del material, nunca una franja cortada), back de vidrio EN el sheet a la IZQUIERDA + columna de 3 líneas a la derecha (letrero serif 16 · título 24 · meta), centrados verticalmente = subir el drill. Meta del trip SIN conteo de días (regla "no contamos fotos ni días"): solo `{MMM yyyy}`. **Aterrizaje (T1·3e) actualizado a la estructura cards** conservando reveal + oferta única. NO en código: barra base como componente §05, slider editorial, lista acordeón con esas métricas — Code migra desde el rail actual.
