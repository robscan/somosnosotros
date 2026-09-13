> **HEREDADO** de `flowya-app/docs/patterns/optimistic-mutations.md` @ `db1e49d` · **Modo: ADOPTAR** · Estado: **SIN RE-VALIDAR** — vale para somosnosotros hasta que el primer OL que lo invoque lo confirme o lo enmiende. Nota de herencia: la UI responde al instante al guardar, sin carreras. Los nombres "Flowya"/"FLOWYA" y las referencias a Passport/viajero/iOS-only se leen como legado; nada de este archivo es ley nueva por sí mismo (ver `docs/ESTRATEGIA_DE_HERENCIA.md`).

## Patrones: Mutaciones optimistas y feedback agregado

Este documento describe cómo manejar mutaciones “rápidas” sin bloquear UI y sin introducir regresiones
al portar el comportamiento a iOS/Android.

### Objetivos

- **Rendimiento percibido**: la UI responde inmediato, aunque la red tarde.
- **Sin carreras**: evitar que una respuesta tardía “robe foco” o reabra sheets anteriores.
- **Feedback limpio**: evitar spam de toasts, preferir agregación de eventos.

### 1) Optimistic UI por ítem (no global)

**Regla:** no bloquear toda la pantalla con un boolean global si la operación aplica a un elemento.

- Usar un `Set<string>` de ids en progreso (ej. `deletingImageIds`).
- Deshabilitar solo el control del elemento en proceso.

### 2) Side-effects dependientes deben serializarse

Ejemplo: borrar una imagen y luego “sincronizar portada desde galería” + refrescar filas.

- Serializar esas tareas en una cola (ej. `createSerialQueue()`).
- La cola debe sobrevivir a errores (una falla no rompe la cadena).

### 3) Evitar “late arrivals” en navegación/selección

Si el usuario ejecuta varias acciones rápido, una respuesta lenta no debe:
- re-seleccionar el spot previo,
- reabrir un sheet que el usuario ya dejó atrás,
- disparar toasts de contexto viejo.

**Patrón recomendado:** token incremental por acción de usuario (`lastUserMutationTokenRef`).

### 4) Agregar feedback de toasts

Para eventos repetidos (ej. “imagen eliminada” x3):
- acumular dentro de una ventana corta (800–1200ms),
- mostrar un solo toast: “3 imágenes eliminadas”.

Utilidad sugerida: `createCountToastBatcher(...)`.

### 5) Canon: splash/entry solo en “cold load” de Explorar

**Problema:** al volver desde rutas como `/account` o `/spot/:id`, algunos overlays/animaciones de entrada
(p. ej. el letrero “Sigue lo que te mueve” y la animación de globo/entrada) no deben repetirse, porque el usuario
ya está en contexto. Sin embargo, en un **reload** del navegador (o arranque frío), sí deben comportarse como antes,
incluyendo cuando el usuario vuelve con el **mismo filtro persistido**.

**Canon (web):** suprimir el splash **solo en el próximo mount** de Explorar cuando la navegación proviene de Explorar.

- **Key**: `flowya_explore_suppress_splash_once` (en `sessionStorage`)
- **Al salir de Explorar** (ej. `handleProfilePress`, `handleSheetOpenDetail`):
  - setear `sessionStorage[key] = "1"`.
- **Al montar Explorar**:
  - leer `sessionStorage[key]`, si es `"1"`:
    - borrar la key,
    - **no** disparar el slogan/animación de entrada,
    - el resto del estado (filtros, selección) se preserva normal.

**Equivalente iOS/Android:**
- Usar un flag **one-shot** con alcance de sesión (por ejemplo, singleton en memoria o storage de sesión).
- Al navegar fuera de Explorar, marcar `suppressSplashOnce=true`.
- En el siguiente mount/entrada a Explorar, consumirlo (set a false) y suprimir splash.
- Importante: no persistirlo “para siempre” (evitar que sobreviva un cold start).

### Dónde se usa hoy (referencias)

- Edit Spot (web): `app/spot/edit/[id].web.tsx`
- Explore: `components/explorar/MapScreenVNext.tsx`
- UI listados: `components/design-system/search-list-card.tsx`
- Utilidades:
  - `lib/async/serial-queue.ts`
  - `lib/ui/toast-batcher.ts`

