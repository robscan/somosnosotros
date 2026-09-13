> **HEREDADO** de `flowya-app/docs/contracts/KEYBOARD_AND_TEXT_INPUTS.md` @ `db1e49d` · **Modo: ADOPTAR** · Estado: **SIN RE-VALIDAR** — vale para somosnosotros hasta que el primer OL que lo invoque lo confirme o lo enmiende. Nota de herencia: formularios en móvil: el teclado nunca tapa el botón de guardar. Los nombres "Flowya"/"FLOWYA" y las referencias a Passport/viajero/iOS-only se leen como legado; nada de este archivo es ley nueva por sí mismo (ver `docs/ESTRATEGIA_DE_HERENCIA.md`).

# KEYBOARD_AND_TEXT_INPUTS — Contrato de teclado y campos de texto

**Objetivo:** Comportamiento unificado para teclados y CTAs en toda la app (web móvil + native).  
**Principios:** El usuario siempre puede escribir sin obstáculos; los CTAs nunca quedan ocultos detrás del teclado; el scroll cierra el teclado en listas/búsqueda para mejorar la consulta.

---

## 1. Campos de texto y teclado

### Regla obligatoria

Siempre que el usuario accede a un campo de texto (búsqueda, nombrar spot, editar descripción, auth, etc.):

1. El campo recibe foco (autoFocus donde aplique).
2. El teclado se muestra listo para escribir.
3. El contenido relevante no queda tapado por el teclado (keyboard-safe).

### Regla de ownership (obligatoria)

En una misma pantalla/contexto solo puede existir **un owner activo de teclado**:

1. Si abre una superficie con input prioritario (ej. Paso 0 Create Spot), debe cerrar/blurrear cualquier otra superficie con input (`Search`, quick edit, modales inline).
2. No permitir dos overlays con `autoFocus` simultáneo.
3. Al cambiar de owner (abrir/cerrar), ejecutar `blur` explícito del elemento activo antes de transferir foco.

Objetivo: eliminar teclados empalmados y foco ambiguo en mobile web/native.

### Implementación por plataforma

| Plataforma | Mecanismo |
|------------|-----------|
| **Native (iOS/Android)** | `KeyboardAvoidingView` con `behavior="padding"` (iOS); contenido con `flex: 1`, `minHeight: 0`. |
| **Web móvil** | Altura desde `visualViewport` (100dvh o `vv.height`); overlay anclado al viewport visible; NO usar 100vh. |

### Ámbitos aplicables

- Search (input de búsqueda).
- CreateSpotNameOverlay (nombre del spot).
- Quick edit de descripción desde Search (visitados).
- Create Spot wizard (título, descripción, etc.).
- Edit Spot (título, descripciones).
- Auth modal (email, contraseña).
- Cualquier pantalla con TextInput.

---

## 2. CTA siempre visible sobre el teclado

### Regla obligatoria

Cuando hay un CTA principal (Continuar, Siguiente, Crear, etc.) en una pantalla con input de texto:

1. **Con teclado abierto:** El CTA queda **sticky** justo encima del teclado.
2. **Nunca oculto** detrás del teclado.
3. **Posición:** Borde inferior de la pantalla visible (viewport) menos altura del teclado, más insets.bottom.

### Implementación

| Plataforma | Mecanismo |
|------------|-----------|
| **Web** | `keyboardHeightWeb = max(0, innerHeight - visualViewport.height)`; barra CTA con `position: absolute`, `bottom: keyboardHeightWeb`, `paddingBottom: insets.bottom + Spacing.base`. |
| **Native** | `KeyboardAvoidingView` envolviendo contenido + barra CTA; o barra con `bottom: keyboardHeight` (vía `Keyboard.addListener`) cuando se use layout absoluto. |

### Patrón de referencia

- `app/create-spot/index.web.tsx`: `wizardButtonBarFixed` con `bottom: keyboardHeightWeb`.
- Reutilizar este patrón en CreateSpotNameOverlay, Edit Spot, Auth modal, etc.

### Modo edición vs consulta

- **Modo edición (teclado abierto):** CTA sticky sobre el teclado, cerca de los dedos del usuario.
- **Modo consulta (teclado cerrado):** CTA en su posición asignada dentro de la composición.

---

## 3. Scroll/swipe cierra el teclado (listas y búsqueda)

### Regla obligatoria

En buscador y cualquier listado largo:

1. Si el usuario hace **scroll** o **swipe down** en la lista/panel, el teclado se oculta.
2. Esto mejora la consulta: el usuario puede explorar resultados sin que el teclado ocupe espacio.
3. Al cerrarse el teclado, el CTA (si aplica) regresa a su posición normal en la composición.

### Implementación

| Plataforma | Mecanismo |
|------------|-----------|
| **Native** | `ScrollView` con `keyboardDismissMode="on-drag"` (o `"interactive"` para iOS). |
| **Web** | Listener de `scroll` o `touchmove` en el contenedor; cuando el usuario desplaza, llamar `document.activeElement?.blur()`. |

### Ámbitos aplicables

- SearchFloatingNative (lista de resultados, no-results, sugerencias).
- SearchOverlayWeb (mismo contenido).
- Spot Edit (descripciones en ScrollView).
- Create Spot wizard (pasos con ScrollView).
- Cualquier pantalla con lista larga + input.

---

## 4. Resumen de reglas

| Regla | Descripción |
|-------|-------------|
| **T1** | Campo de texto enfocado → teclado visible, listo para escribir. |
| **T2** | Contenido keyboard-safe (no tapado por el teclado). |
| **T3** | Owner único de teclado por contexto (sin overlays con foco simultáneo). |
| **C1** | CTA sticky sobre el teclado cuando está abierto; nunca oculto. |
| **C2** | Con teclado cerrado, CTA en posición asignada en la composición. |
| **S1** | Scroll/swipe down en lista o búsqueda → teclado se cierra. |

---

## 5. Prohibiciones

- Prohibido usar `100vh` en web para pantallas con teclado (usar 100dvh o visualViewport).
- Prohibido CTA con `position: absolute; bottom: 0` sin compensar `keyboardHeight` cuando el input puede estar enfocado.
- Prohibido listas largas con input enfocado que no permitan cerrar el teclado al hacer scroll.
- Prohibido abrir una segunda superficie con `autoFocus` sin cerrar/blurrear explícitamente la superficie actual.

---

## 6. Referencias

- Bitácora 075: OL-052 SearchFloating keyboard-safe (web mobile).
- Bitácora 078: Search web overlay fix móvil (viewport + scroll-lock).
- Bitácora 091: Search estabilidad UX (keyboardShouldPersistTaps).
- `app/create-spot/index.web.tsx`: patrón CTA + keyboardHeightWeb.
- `docs/contracts/EXPLORE_SHEET.md`: keyboard-safe en modo search.
