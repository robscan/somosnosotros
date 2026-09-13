> **HEREDADO** de `flowya-app/docs/contracts/ANTI_DUPLICATE_SPOT_RULES.md` @ `db1e49d` · **Modo: ADAPTAR** · Estado: **SIN RE-VALIDAR** — vale para somosnosotros hasta que el primer OL que lo invoque lo confirme o lo enmiende. Nota de herencia: mismo nombre normalizado a <150 m = mismo lugar; aplica a lugares y a eventos (mismo lugar + misma hora). Los nombres "Flowya"/"FLOWYA" y las referencias a Passport/viajero/iOS-only se leen como legado; nada de este archivo es ley nueva por sí mismo (ver `docs/ESTRATEGIA_DE_HERENCIA.md`).

# ANTI_DUPLICATE_SPOT_RULES — Contrato

**Última actualización:** 2026-04-26
**Relación:** [bitácora 016](../bitacora/2026/01/016-scope-g-duplicate-prevention.md), `lib/spot-duplicate-check.ts`

> Reglas no negociables para prevenir spots duplicados en todos los paths de creación.

---

## Regla de duplicado

Un spot se considera duplicado si, estando a **distancia** ≤ radio (default **150 m**), se cumple **una** de:

- **Título normalizado** coincide de forma exacta (`normalizeSpotTitle`), o
- **Dirección normalizada** coincide (`normalizeAddressKey`) y ambas cadenas tienen longitud ≥ umbral interno (evita matches triviales), cuando el cliente pasa `address` en opciones y la fila en BD tiene `address`.

Implementación: `lib/spot-duplicate-check.ts` — `checkDuplicateSpot(title, lat, lng, radiusMeters?, options?)` con `options.address` opcional.

No se debe bloquear por coincidencias parciales de substring (`"Cafe Central"` vs `"Cafe Central Terraza"`). Los nombres cercanos parecidos pueden mostrarse como contexto visual, pero no cuentan como duplicado duro.

---

## Obligación

Todo path de creación de spot **debe** llamar a `checkDuplicateSpot` **antes** del INSERT.

- Creación manual/draft libre: si `duplicate: true`, **bloquear inserción** y mostrar alerta/modal.
- Selección explícita de POI externo (search/preview): la validación corre como señal informativa, pero **no bloquea inserción**.

Motivo: en selección POI de planificación el usuario no percibe creación manual; bloquear rompe expectativa de flujo.

---

## Entry points obligatorios

| Entry point | Archivo | Handler |
|-------------|---------|---------|
| Wizard Create Spot | `app/create-spot/index.web.tsx` | Antes de INSERT |
| Crear desde POI (Por visitar) | `components/explorar/MapScreenVNext.tsx` | `handleCreateSpotFromPoi` (no bloqueante) |
| Crear desde POI (Compartir) | `components/explorar/MapScreenVNext.tsx` | `handleCreateSpotFromPoiAndShare` (no bloqueante) |
| Crear desde draft inline | `components/explorar/MapScreenVNext.tsx` | `handleCreateSpotFromDraft` |

Cualquier nuevo path de creación debe añadirse a esta lista y cumplir el contrato.

---

## UX en duplicado

- Mostrar alerta (Alert.alert o equivalente).
- Título: "Spot muy parecido".
- Mensaje: citar el nombre existente; ofrecer opciones.
- Botones: **Cancelar** (no crear), **Cambiar nombre** (volver a editar), **Mover ubicación** (ajustar coords).
- No insertar el spot.

Excepción:

- En selección POI externa explícita no se muestra modal de bloqueo; el flujo continúa y crea spot.

---

## Fail-open

Si `checkDuplicateSpot` falla (red, Supabase, timeout): permitir la creación. No bloquear el flujo por un error de validación.

---

## Guardrails

- Al añadir un nuevo entry point de creación: verificar que llama a `checkDuplicateSpot` antes del INSERT.
- Al modificar `lib/spot-duplicate-check.ts`: mantener fail-open; nuevos parámetros opcionales no deben romper llamadas existentes.
