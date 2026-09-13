> **HEREDADO** de `flowya-app/docs/definitions/UI/COMPONENT_LIBRARY_POLICY.md` @ `db1e49d` · **Modo: ADOPTAR** · Estado: **SIN RE-VALIDAR** — vale para somosnosotros hasta que el primer OL que lo invoque lo confirme o lo enmiende. Nota de herencia: todo componente reutilizable a librería, con sus estados. Los nombres "Flowya"/"FLOWYA" y las referencias a Passport/viajero/iOS-only se leen como legado; nada de este archivo es ley nueva por sí mismo (ver `docs/ESTRATEGIA_DE_HERENCIA.md`).

# Flowya — Component Library Policy (Canon)

## Regla 1 — Todo componente nuevo va a librería

- Si creas UI nueva reutilizable (cards, list items, inputs, icon buttons, chips, panels): **va a librería**.
- Prohibido “uno-off” en screens salvo layout específico.

## Regla 2 — Componentes interactivos deben incluir estados

Checklist mínimo (según aplique):

- default
- hover (web) / press (native)
- active/selected
- disabled
- loading
- error
- empty (si representa una lista/colección)

## Regla 3 — Templates para estructuras repetidas

Si aparece la misma estructura 2+ veces:

- crear un **Template** (componente base) y variantes por props.
  Ejemplos:
- ResultRow (place/spot/recent)
- SpotCard (preview/detail-lite)
- IconButton (sizes/variants)
- Input (search/base)

## Regla 4 — Deprecación controlada (cuestionar librería actual)

Cuando un componente actual:

- no cumple estados,
- tiene API inconsistente,
- genera hacks/patches repetidos,
  se marca como:
- `@deprecated` + nota
  y se reemplaza por un componente nuevo “canon”.

## Regla 5 — Naming y ownership

- Un componente = una responsabilidad.
- Props claras (no “config objects” infinitos).
- Variantes por `variant`/`size`, no por duplicar componentes.

## Regla 6 — Contract primero, implementación después

Para componentes clave se crea una spec corta en:
`docs/templates/COMPONENT_SPEC_TEMPLATE.md` (ver template)
Luego se implementa.

## Entregables mínimos por componente nuevo

- archivo del componente
- stories/demo (si aplica)
- estados completos
- nota en bitácora
