> **HEREDADO** de `flowya-app/docs/contracts/CANONICAL_BOTTOM_SHEET.md` @ `db1e49d` · **Modo: ADOPTAR** · Estado: **SIN RE-VALIDAR** — vale para somosnosotros hasta que el primer OL que lo invoque lo confirme o lo enmiende. Nota de herencia: peek/medium/expanded, gestos y snap del sheet inferior sobre el mapa. Los nombres "Flowya"/"FLOWYA" y las referencias a Passport/viajero/iOS-only se leen como legado; nada de este archivo es ley nueva por sí mismo (ver `docs/ESTRATEGIA_DE_HERENCIA.md`).

# CANONICAL_BOTTOM_SHEET — Contrato canónico para sheets

**Última actualización:** 2026-03-01  
**Estado:** ACTIVE  
**Scope:** cualquier sheet inferior en Explore (Spot, Países, futuras variantes)

## 1. Objetivo

Definir una base única de comportamiento para evitar implementaciones ad-hoc, drift de UX y bugs silenciosos entre sheets.

## 2. Estados y semántica

- `peek`: awareness (header visible, contenido mínimo).
- `medium`: decisión (acciones y resumen visibles sin fricción).
- `expanded`: detalle (máxima lectura/interacción).

Regla: solo se permiten estos 3 estados.

## 3. Header canónico (obligatorio)

- Handle de arrastre.
- Título centrado y legible.
- Acción de compartir (izquierda) cuando aplique.
- Acción de cerrar (derecha).
- Tap en header cicla `peek -> medium -> expanded -> medium`.

## 4. Gestos y snap (obligatorio)

- Drag se captura en handle/header.
- Snap por `resolveNextSheetStateFromGesture` con threshold por posición (`25%`) y threshold por velocidad.
- Las transiciones son solo a estados adyacentes.
- Animación canónica `300ms`, easing `cubic-bezier(0.4, 0, 0.2, 1)`.

## 5. Layout y sizing

- Altura visible reportada al contenedor padre (`onSheetHeightChange`).
- `peek` basado en medición real del header/drag-area (sin hardcode ciego).
- `medium` y `expanded` calculados desde viewport y contenido.
- Sin doble scroll: el body scrollea solo cuando hay overflow.
- En `expanded` el sheet llega a base (`bottom: 0`); en `peek/medium` respeta safe-area inferior.

## 6. Integración con mapa y overlays

- Si usuario navega mapa (pan/zoom), sheet visible colapsa a `peek`.
- Controles de mapa se anclan arriba del borde del sheet.
- Si sheet está en `expanded`, controles pueden ocultarse por contrato de legibilidad.
- Toast/status se reubican con base en altura real del sheet.

## 7. Integración con Search

- Si Search abre mientras sheet está abierta, guardar snapshot (`wasOpen`, `state`) y cerrar sheet.
- Al cerrar Search, restaurar sheet si contexto sigue compatible.

## 8. API mínima requerida

- `visible`
- `state`
- `onStateChange(nextState)`
- `onClose()`
- `onShare()` (cuando aplique)
- `onSheetHeightChange(height)`
- `title`

## 9. Guardrails técnicos

- No duplicar lógica de gestos/snap inline en pantallas.
- La implementación debe vivir en componente dedicado reutilizable.
- Evitar estados derivados redundantes que puedan desfasarse (contador/lista usan misma fuente).
- Cualquier nueva sheet debe declarar explícitamente si extiende este contrato o si define excepción.

## 10. Guardrail de capas (z-index)

- El orden de profundidad de Explore debe centralizarse en `components/explorar/layer-z.ts`.
- `SpotSheet` y cualquier sheet hermana (ej. `CountriesSheet`) deben usar `EXPLORE_LAYER_Z.SHEET_BASE`.
- Acciones superiores visibles (`perfil`, `buscar`, filtros) no deben depender de números mágicos locales; deben usar los tokens canónicos de `EXPLORE_LAYER_Z`.
- Regla de regresión: un cambio de z-index en una pantalla no puede dejar elementos visibles sin interacción.
