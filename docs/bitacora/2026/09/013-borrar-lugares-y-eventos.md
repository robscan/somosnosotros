# 013 · Borrar lugares y eventos (2026-09-13)

Rama `borrar-lugares-eventos`. El founder: "¿Cuándo activaremos borrado de lugares y eventos?". Las políticas de la base lo permitían desde la Fase 1 (autor o admin); faltaba el botón y la regla para lugares con eventos ajenos.

## Reglas

- **Evento**: lo borra su autor o el administrador. Se van con él sus "Voy" y "Me interesa" (cascada). Vuelve a la ficha del lugar con "Evento borrado."
- **Lugar**: lo borra su autor solo si no tiene eventos publicados por otras personas; si los tiene, se niega con el aviso "tiene eventos publicados por otras personas; no se puede borrar. Si ya no existe, ocúltalo o avisa al administrador". El administrador puede siempre. Los eventos del lugar se van con él (cascada). Vuelve al mapa con "Lugar borrado."
- La regla del autor se comprueba en el servidor (`borrarLugar`); la de "solo autor o admin" la exige la base.

## Qué quedó

- `ui`: `Borrar.tsx`, dos pasos: enlace discreto "Borrar el evento/lugar" → caja con lo que se pierde ("Se borra el lugar y sus 2 eventos próximos (y los pasados). No se puede deshacer.") → "Sí, borrar…" / "Cancelar".
- Acciones `borrarEvento` y `borrarLugar`; avisos en la ficha del lugar y en el panel del inicio.

## Verificación (390×844, base real, usuario desechable borrado)

- Tere borra su evento en Casa 1100 → vuelve a Casa 1100 con "Evento borrado."; el evento ya no está.
- Tere intenta borrar su lugar con un evento del founder dentro → "tiene eventos publicados por otras personas"; el lugar sigue. Sin ese evento → "Lugar borrado." en el mapa; el lugar ya no está.
- Lint, typecheck, 52 pruebas, build.
