> **HEREDADO** de `flowya-ios/docs/design-system/handoff-2026-07-15/navegacion.md` @ `b19c676` · **Modo: REFERENCIA** · Estado: **SIN RE-VALIDAR** — vale para somosnosotros hasta que el primer OL que lo invoque lo confirme o lo enmiende. Nota de herencia: solo el shell: mapa siempre visible + sheet inferior como home + cards⇄lista; el resto (MEMORIA/VISOR) no aplica. Los nombres "Flowya"/"FLOWYA" y las referencias a Passport/viajero/iOS-only se leen como legado; nada de este archivo es ley nueva por sí mismo (ver `docs/ESTRATEGIA_DE_HERENCIA.md`).

# Ficha — Navegación (cards · lista · MEMORIA · VISOR/inmersión)

> **EXIGENCIA DE ADHERENCIA.** Máquina de navegación aprobada + entrega del VISOR (§16, inmersión). El dev sigue esto tal cual; toda desviación se reporta en `registro.md` antes de implementarse.

**Superficie:** la máquina de navegación completa del pasaporte — HOME (cards ↔ lista) → MEMORIA de una city → VISOR a pantalla completa — más el drill espacial del mapa (pin → país).
**Verificado contra repo:** 2026-07-17 · rama main. Fuentes: `PassportTripSurfaceView.swift` (`SheetMode` L60 · `DrillLevel` L1863 · `drillOrigins` L1886 · `enterCountryDrill` L1913 · `exitCountryDrill` L1943 · `openTripMemory` L1969 · `closeTripMemory` L1990), `PassportSheetNavigationModelTests.swift`.
**Estado:** navegación cards/lista/MEMORIA = IMPLEMENTADA (§14 refactor, stack unificado) con Deltas de chrome ya fichados en `home.md`/`memoria.md`. **VISOR = // NUEVO completo** (no hay viewer en repo; el único `fullScreenCover` es el walks-reveal L3676).

---

## 1 · Mapa de navegación (la máquina)

```
ROOT — mapa/globo SIEMPRE visible (nunca se navega "fuera" del mundo)
│
├─ NIVEL 0 · HOME sheet
│   cards (sheetMode .home) ⇄ lista (.passport)
│   = MISMO nivel, dos formatos. TOGGLE (switch circular 44 flotante
│   top-trailing), NO drill: mismo header, mismo detent, cambia el body.
│   La query de búsqueda PERSISTE a través del toggle.
│
├─ drill espacial → NIVEL PAÍS = CITY-CARDS (Δref-D, decisión founder 07-17)
│   Entradas: tap card de país en "Where you've lived" (onExplore →
│   enterCountryDrill, Delta Code) O tap en PIN del mapa. Formato canónico
│   ÚNICO del nivel = grid de city-cards (la LISTA no drillea: su fila
│   sigue siendo acordeón, §14). Switch OCULTO al profundizar (regla
│   MEMORIA); FABs Buscar/＋ permanecen (＋ = Add a city contextual).
│   Delta Code: enterCountryDrill deja de forzar sheetMode .passport.
│   Idempotente: pin de otro país re-apunta el MISMO nivel (swap, no doble push).
│   Back (círculo 40 vidrio top-leading / zoom-out): exitCountryDrill().
│
├─ NIVEL 1 · MEMORIA de una city — openTripMemory(trip)
│   Entradas que CONVERGEN aquí (todas guardan DrillOrigin):
│   · card editorial del slider (cards)          · fila city del acordeón (lista)
│   · moment card del rail "Moments"             · resultado de búsqueda (F3)
│   · card de "Where you've lived"
│   Abre en .medium (cámara vuela al span de la city); jalar → extended.
│   ATRÁS = closeTripMemory(): restaura EXACTO el origen (cámara + detent
│   + sheetMode) → regresa a cards O lista según de dónde se llegó.
│   Chips de zona = filtro DENTRO del nivel (no navegan, no cuentan).
│
└─ NIVEL 2 · VISOR (inmersión) — // NUEVO
    tap en foto del grid MEMORIA → fullScreenCover sobre el ground.
    Nace de la celda (zoom-in); dentro: swipe = foto ± · pinch = zoom
    · tap = chrome on/off · pull-down (o chevron) = cerrar → MEMORIA
    exactamente donde estaba (scroll + chip filtrado persisten).
    El visor navega FOTOS del set filtrado actual, nunca cambia de city.
```

**Leyes:** un solo stack (`drillLevels` + `drillOrigins` en paralelo) — cada nivel guarda su frame de retorno como unidad restaurable; la salida es SIEMPRE simétrica a la entrada; nadie pierde contexto ni pan manual. El visor NO entra al stack del sheet: es presentación modal encima (cerrar no toca cámara/detent).

## 2 · Geometría (pt)

**Navegación (sin cambios):** detents del host `PassportTripSurfaceModel` — HOME peek hug 116 · .medium · extended(.large); MEMORIA peek 250 / hero 200 / 230. Switch circular 44 · FABs 52 (fichados en `home.md` §1).

**VISOR (// NUEVO):**

| Elemento | Valor |
|---|---|
| Lienzo | full-bleed edge-to-edge; foto SIN recorte (aspect fit); fondo `#05070C`; respeta safe areas + home indicator para el chrome |
| Chrome superior | cerrar (chevron-down) top-leading · **`mappin.circle` + ···** top-trailing (gap 10); círculos de vidrio `rgba(5,7,12,0.5)` + blur 10 + borde blanco 16%; **Ø 40, target 44 (RESUELTO ref-D)** — mismo Ø que el back de MEMORIA. **Δ08-06: el candado murió** (affordance muerto — nada lo leía y todo el pasaporte es local); su slot lo ocupa `mappin.circle` = *Name this place* |
| Scrim inferior (metadata) | gradiente `transparent → rgba(5,7,12,0.72) 40% → rgba(5,7,12,0.92)`; texto anclado a base, padding 20/16/18 |
| Thumbnail strip | cuadros 30×30 · radio 6 · gap 5 · activo borde 1.5 `#E8EDF6`; leading del bloque inferior |
| Counter | `{n} of {m}` tabular, trailing del strip; en modo inmersivo = píldora suelta centrada base (`rgba(5,7,12,0.4)` blur 8, padding 4/10, r999) |

## 3 · Estados (máquina real)

| Estado | Trigger | Qué cambia |
|---|---|---|
| **Navegación** | | |
| home-cards | default / toggle | body cards · atmósfera `.aurora` |
| home-lista | toggle (switch muestra destino) | body acordeón · `.cityGlow` · mismo header/detent |
| país (drill) | tap pin del mapa O card de país en cards (Δref-D) | cámara a país (1.4M m) · body → **CITY-CARDS** (grid 2 col 172×150 r12, hero país + `{N} cities`) · **switch oculto**, FABs quedan · detent → .medium si venía de peek/large |
| MEMORIA | tap card/fila/moment/resultado | push .trip · cámara al span · .medium · `.dawn` |
| back MEMORIA | back de vidrio / swipe-down | pop → restaura origen exacto (cards o lista) |
| **VISOR (// NUEVO)** | | |
| default | tap foto en grid | chrome visible (cerrar · `mappin.circle` · ··· · metadata · strip · counter) |
| inmersivo | tap en la foto | chrome fuera; queda SOLO la píldora de posición; segundo tap lo regresa |
| paging | swipe horizontal | foto ±1 dentro del set filtrado; strip y counter sincronizan |
| zoomed | pinch | pan con drag; el paging se suspende hasta volver a fit |
| menú ··· | tap ··· | acciones de foto (§4); mismo vocabulario que long-press §15 |
| nombrar lugar (Δ08-06) | tap `mappin.circle` | sheet **Name this place**: campo de búsqueda + sugerencias POI/landmark de MapKit ordenadas por distancia, **sin filtrar** + escapatoria `Type a name instead`. Elegir **renombra el LUGAR** (todas sus fotos), no re-ancla la foto — mover la foto sigue en el ··· (`Correct location`). Toast + Undo |
| cerrar | pull-down o chevron | reverso del zoom-in → MEMORIA intacta (scroll/chip/detent) |

## 4 · Copy (EN exacto)

| Clave | String | Contexto |
|---|---|---|
| viewer.eyebrow | `{MMM yyyy}` (CAPS) | solo fecha — la zona vive en el título (ref-D; muere `{ZONE} · {MMM yyyy}`) |
| viewer.title | `{Zone}` · fallback `{City}` sin zona | **RESUELTO ref-D (F-VIS1)** — POI muere (D4-2 gated, doctrina cities) |
| viewer.sub | `{City}, {Country}` · sin city `{Country}` | ej. `Barcelona, Spain`. **Δ08-06: el daypart murió** (±1-2 h de error declarado por el propio motor — cerca de un límite basta para equivocarse). Si no hay ninguno, la línea no se renderiza. "When and where, never what" |
| viewer.namePlace.title | `Name this place` | título del picker · también a11y del `mappin.circle` |
| viewer.namePlace.sub | `This renames the place, not just this photo.` | declara el contrato antes de elegir |
| viewer.namePlace.search | `Search nearby` | placeholder del campo |
| viewer.namePlace.section | `NEARBY` | cabecera de la lista de sugerencias |
| viewer.namePlace.row | `{POI name}` + `{Category} · {distance}` | fila cruda de MapKit — la app **jamás** la usa para auto-nombrar |
| viewer.namePlace.manual | `Type a name instead` | accent, siempre visible (no al fondo) |
| viewer.toast.named | `Named “{name}”` / `Undo` | reversible: renombrar no destruye evidencia |
| viewer.counter | `{n} of {m}` | POSICIÓN (wayfinding), no es conteo-claim — permitido por la regla "no contamos fotos" |
| viewer.menu | `Set as cover` · `Correct location` · `Remove from this city` | ··· = mismo vocabulario que long-press §15 (armoniza el "ocultar/fix location/cover" conceptual de §16) |
| viewer.toast.removed | `Removed 1 photo` / `Undo` | reusa el patrón MEMORIA; al quitar, el visor avanza a la siguiente (o cierra si era la última) |
| ~~viewer.chip.private~~ | — | **ELIMINADO Δ08-06** con el candado (UX-007) |
| ~~viewer.toast.private~~ | — | **ELIMINADO Δ08-06** |
| ~~viewer.toast.visible~~ | — | **ELIMINADO Δ08-06** |
| a11y.viewer.close | `Close` | chevron-down |
| a11y.viewer.namePlace | `Name this place` | `mappin.circle` |
| a11y.viewer.photo | `Photo {n} of {m}, {city}` | página |
| a11y.viewer.strip | `Jump to photo {n}` | thumbnails |

## 5 · Color (token repo + hex)

| Token | Uso |
|---|---|
| fondo visor | `#05070C` pleno (el ground desaparece tras el cover) |
| `textPrimary` #E8EDF6 / #fff | título, borde thumbnail activo; textos sobre foto usan #fff |
| blanco·0.7–0.75 | eyebrow, sub, counter |
| vidrio chrome | `rgba(5,7,12,0.5)` + blur + borde blanco 16% (círculos); píldora inmersiva `rgba(5,7,12,0.4)` blur 8 |
| scrim | `transparent → rgba(5,7,12,0.92)` (thick, solo base) |
| `accent` #4E9EFF | `Undo` del toast; foco |
| thumbnails | `white·0.08` (rest) / `white·0.12` + borde `#E8EDF6` 1.5 (activo) |

## 6 · Tipografía

| Elemento | Valor (RESUELTO ref-D) | Mapeo a `TextStyle` |
|---|---|---|
| Eyebrow | 11 w700 +1.76 CAPS blanco·0.7 | `TextStyle.label` (muere el 10 de §16; sin token nuevo) |
| Título | **24 w800 −0.48** · lineLimit(1) minScale 0.85 | hero-compacto (reusa el 24 canonizado en tipografia.md §1/§8; muere el 21) |
| Sub | 12 w500 blanco·0.75 | `.caption` semántico |
| Counter / píldora | 11 w600 tabular | FIJA (chrome de sistema, como badges) |

## 7 · Motion

| Trigger | Espec |
|---|---|
| Abrir visor | nace de la CELDA: zoom-in matched-geometry desde el grid; foto viaja de celda a full-bleed |
| Cerrar (pull-down) | reverso interactivo hacia su celda; soltar antes del umbral = rebota |
| Paging | scroll paginado nativo; strip sincroniza con crossfade 0.15 s |
| Chrome on/off | fade + slide sutil (top ↑, base ↓) `.easeInOut` 0.20 s |
| Reduce Motion | fade sin parallax ni matched-geometry; paging = corte |
| Navegación sheet (sin cambios) | vuelos de cámara `.easeInOut` 0.5 s (país: solo si `animatesCountryLevelCamera()`); MEMORIA fly-to/fly-back incondicional |

## 8 · Hápticas

Navegación NO vibra (ley del home). **RESUELTO ref-D contra el vocabulario CERRADO `FlowyaPassportHaptics` (contrato A4, verificado en repo — no se agregan casos):** abrir/cerrar/paging/menú/`Set as cover`/candado = **SIN háptica** · `Remove from this city` = **`swipeRemove()`** (rigid, mismo símbolo que el repo ya usa — F-C4) · Undo = **`undo()`** (soft). Mueren los `.impact(...)` propuestos aquí y en memoria.md §8.

## 9 · Esqueleto SwiftUI (símbolos verificados con grep · // NUEVO donde no existe)

```swift
// ——— MÁQUINA EXISTENTE (VERIFICADA, no tocar el contrato) ———
PassportTripSurfaceModel.sheetMode          // .home (cards) ⇄ .passport (lista) — toggle, L60/L92
model.drillLevels: [DrillLevel]             // .country(group) | .trip(trip) — L1863
model.drillOrigins: [DrillOrigin]           // camera + detent + sheetMode por nivel — L1872
model.enterCountryDrill(group)              // SOLO pin del mapa; lista = acordeón — L1913
model.exitCountryDrill() -> Bool            // pop país; NUNCA bajo MEMORIA abierta — L1943
model.openTripMemory(trip)                  // push .trip + fly-to + .medium — L1969
model.closeTripMemory()                     // pop + restaura origen EXACTO — L1990
// Tests existentes: PassportSheetNavigationModelTests (extender con visor)

// ——— VISOR (// NUEVO íntegro) ———
.fullScreenCover(item: $model.viewerContext) { ctx in   // patrón ya usado (walks L3676)
    PassportPhotoViewerView(                             // // NUEVO
        photos: ctx.photos,            // set FILTRADO actual (chip activo) de la city
        startIndex: ctx.index,
        city: ctx.trip,
        onSetCover: { id in model.setCover(ctx.trip, id) },        // comparte con §15
        onCorrectLocation: { id in /* reasigna la FOTO */ },       // // NUEVO
        onRemovePhoto: { id in model.removePhoto(ctx.trip, id) },  // → PendingRemoval/undoToast
        onNamePlace: { showNamePlacePicker = true }                // // NUEVO ·08-06 · renombra el LUGAR
    )
}
model.openViewer(photo: id, in: trip)       // // NUEVO — guarda scroll/chip de MEMORIA
// Cerrar el visor NO toca drillLevels/drillOrigins: MEMORIA queda intacta debajo.
```

## 10 · Changelog

**2026-08-06 — paquete post-R4, piezas 1+2 (VoBo founder).** **El candado murió** (UX-007: se escribía y persistía pero ninguna superficie downstream lo leía; el pasaporte es local, la etiqueta prometía protección contra nada). Mueren `viewer.chip.private`, `viewer.toast.private`, `viewer.toast.visible`, `a11y.viewer.private`, `onTogglePrivate` y **F-VIS3 queda cerrado por eliminación** — ya no hay alcance que decidir. Su slot lo ocupa **`mappin.circle` = Name this place**. **El daypart murió** (UX-009): `viewer.sub` = `{City}, {Country}` a secas. **Contrato del picker (firmado):** elegir una sugerencia **nombra el LUGAR**, nunca re-ancla la foto — mover la foto sigue en el `···` (`Correct location`); son dos trabajos y dos puertas. La lista de POIs va **cruda y ordenada por distancia**, sin filtrar negocios: la app jamás nombra sola desde POIs, el usuario sí puede. Mismo picker desde la fila innombrable de la lista (ver `home.md` §4 `list.row.unnameable`).

**2026-07-17 (b) — Paquete D respondido (`handoff/flowya-passport_ref-D-navegacion-visor_v2.1_2026-07-17/`).** **D1 RESUELTO (Opción A, founder):** nivel país = **city-cards**, formato canónico único — entradas: card de país (cards) + pin; la lista mantiene acordeón; switch oculto al profundizar; Delta Code: `enterCountryDrill` sin forzar `.passport`, `onExplore` → `enterCountryDrill`. **F-VIS1 RESUELTO:** título `{Zone}`/`{City}`, eyebrow solo fecha. **F-VIS2 RESUELTO:** círculos Ø40/target 44; tipo → label 11 · hero-compacto 24 · counter 11 FIJA. **Hápticas RESUELTAS** al vocabulario cerrado A4 (`swipeRemove()`/`undo()`; resto sin háptica). **Privado-hasta-keep:** estado + copy entregados (chip PRIVATE · `Kept private`/Undo · `Visible again`); alcance = **F-VIS3 PENDIENTE**. Geometría completa medida en `referencias-D.md` + 12 PNG @3x.

**2026-07-17 — creación + entrega del VISOR (req founder: "handoff de la navegación para cards y listas; entrega de una vez inmersión").**
- **Navegación consolidada en UNA ficha:** cards ⇄ lista = toggle (nunca drill) · pin → país (espacial, solo mapa) · todo converge en MEMORIA · back simétrico vía `DrillOrigin`. Verificada contra el §14-refactor real del repo (stack unificado + tests) — la máquina YA está implementada; los Deltas de chrome viven en `home.md`.
- **VISOR (§16) entregado como // NUEVO completo:** no existe viewer en repo. Gestos (swipe/pinch/tap/pull-down), 2 modos de chrome, strip + counter, menú ··· armonizado al vocabulario §15 (`Set as cover` · `Correct location` · `Remove from this city`), toast Undo compartido, privado-hasta-keep.
- **Discrepancias reportadas (no resueltas en silencio):** **F-VIS1** título del visor — §16 muestra POI, doctrina cities lo prohíbe (POI = D4-2 gated) → propuesta `{Zone}`/`{City}`, decide founder · **F-VIS2** Ø exacto de los círculos del chrome + mapeo tipográfico (eyebrow 10 / título 21 fuera de la escala `TextStyle`) → cerrar con artboard device-true (referencias 2.1-D) · flujo **keep** de privacidad sin ficha · símbolo háptico exacto (flag compartido con memoria.md).
