---
name: front-visual
description: Disciplina obligatoria para CUALQUIER trabajo de front-end/UI en Flowya — ajustes de fichas del design system, fixes visuales, QA de handoffs, verificación de copys en pantalla. Ver la pantalla SIEMPRE antes de razonar. Invocar al tocar SwiftUI/layouts/sheets/copys de UI o al verificar contra fichas.
---

> **ADAPTACIÓN somosnosotros (2026-09-13):** disciplina idéntica a Flowya; la mecánica cambia — donde diga `xcrun simctl io <sim> screenshot` / build de Xcode / device del founder, léase screenshot de Playwright en viewport móvil (390×844, 3x) sobre el preview de Vercel o `next dev`, y gate del founder en Safari del iPhone. Las fichas siguen siendo ley y `registro.md` sigue siendo el ledger.


# front-visual — ver antes de razonar

## La regla de oro

Nunca analices un estado de UI que no hayas VISTO. Un pixel-scan, un grep o un
razonamiento de layout SIN haber mirado el frame completo primero está
prohibido. El orden es inviolable:

**RENDER → MIRAR (frame completo, con Read del PNG) → DESCRIBIR lo que ves →
medir (crops/zoom/pixel-scan) → decidir.**

El frame completo es el dato primario. Los píxeles son para CUANTIFICAR lo que
el ojo ya vio — jamás para descubrir lo que no miraste.

## Protocolo por iteración (1 hipótesis = 1 cambio = 1 mirada)

1. **Un solo cambio por build.** Nada de acumular ediciones sin mirar el
   resultado de cada una.
2. Tras cada build+launch: screenshot full-frame
   (`xcrun simctl io <sim> screenshot`) y **leerlo entero** — no solo crops.
3. **Describir EN PALABRAS lo que se ve** antes de tocar nada más: qué
   elementos están, cuáles FALTAN, qué toca bordes, qué se ve recortado o
   fuera de sitio. Contra el checklist de la ficha, elemento por elemento.
4. Solo después: crops con zoom y pixel-scans para medir lo ya visto.
5. **Antes/después lado a lado** para cada fix: mismo estado, mismo sim,
   mismo Dynamic Type.
6. Si un elemento de la ficha **no se ve** en el frame: ese ES el hallazgo.
   Se reporta AUSENTE. No se asume "estará clippeado / detrás / es sutil"
   sin evidencia visual directa (p. ej. un render aislado del componente).
7. El screenshot vale solo si el binario es el que acabas de construir E
   instalar en ese sim (binario viejo = verificación falsa). En duda:
   `simctl uninstall` antes de instalar.

## Verificación de cierre (gate de slice/ficha)

- Matriz de la ficha: Pro Max (93C35138, gate primario) + 15 Pro (E73372CB)
  × {large, AX-medium}; SE (926414EF) captura, no bloquea. **Cada imagen
  MIRADA**, no solo generada.
- Checklist de ficha en tabla presente/correcto POR screenshot (barra/chrome,
  jerarquía, presupuesto vertical, paddings, copys exactos, nada tocando
  bordes, nada truncado).
- Copys: grep-gates + confirmación visual (el grep no ve truncados,
  recortes ni minScale aplicado).

## Herramientas del repo

- `scripts/seed-sim-snapshot.sh --birth|--birth2|--welcome|--denied|--empty|--memory|--passport|--peek [--large-detent] [SIM]`
  — build+install+seed+launch+screenshot headless; capturas en `.sim-proofs/`
  (gitignored).
- Hooks DEBUG por env var (`FLOWYA_DEBUG_*`) — catálogo en
  `PassportTripSurfaceView` (scan/trip progress, force phase/entry state,
  open memoria/passport/profile, large detent, constellation).
- Instrumentación numérica (prints de mediciones, frames globales,
  backgrounds de color): SOLO después de haber mirado; se retira antes del
  commit — jamás viaja en un PR.
- Artefactos: scratchpad de sesión o `.sim-proofs/` — jamás commiteados
  (proof durable elegido a mano → `docs/ops/assets/`).

## Prohibiciones

- GUI automation (cliclick / taps por coordenadas / AppleScript sobre la
  ventana) — verificación screenshot-only. Un ejecutor llegó a clickear una
  videollamada real del founder.
- Concluir "verificado" desde pixel-scans o logs sin haber mirado el frame.
- Presentar como "señal" un puñado de píxeles que el frame completo no
  muestra como elemento visible.
- Borrar datos/app del device físico del founder (los sims canónicos sí son
  operables; su iPhone lo toca él).
