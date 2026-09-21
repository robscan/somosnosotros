# 129 · Gestos que se disparan solos: canon de deslizar y de tocar en carriles (OL-094)

**Fecha:** 2026-09-21 · **Rama:** `gestos-deslizar`, desde `origin/main` (`3b7635f`) · **Pieza A3** de la cola de bugs (`COLA_DE_PIEZAS.md`), reservada por el gestor.

## Qué reportó el founder (2026-09-21)

- **L10:** «Swipe actions se activa y muestra desde que se hace selección de fila con intención de scroll down. Debemos esperar al hold y swipe. Revisa librerías o manuales para redefinir canon de ese comportamiento. USA componentes nativos si es necesario. Ahora se ve como un error en el sistema.»
- **L45:** «Bug: al navegar el slider de destacados, puede confundirse intención de TAP con intención de swipe y el usuario termina dentro de la ficha cuando deseaba recorrer el slider.»

**Es una web (PWA): no hay componentes nativos de iOS o Android que usar.** Lo que sí hay es el comportamiento de referencia que pidió el founder: las listas de iOS (Mail, Mensajes) solo abren las acciones cuando el arrastre es claramente horizontal, y una vez decidido el eje no cambian durante ese toque.

## Causa medida de cada bug

### L10 — `ui/Deslizable` (renglones de Agenda, Lugares, Artistas)

El componente ya tenía zona muerta y bloqueo de dirección (`lib/deslizar.ts`, `decidirGesto`), pero con dos huecos medidos leyendo el código y con pruebas:

1. **Umbral bajo (8 px)** y **sin exigencia de ángulo**: `Math.abs(dx) <= Math.abs(dy)` deja pasar como «deslizar» cualquier movimiento a 44° o menos de la horizontal. Una diagonal muy común al empezar a bajar por la lista con el pulgar (por ejemplo dx=12, dy=10, ~40°) se decidía «deslizar» y abría las acciones aunque la intención fuera desplazarse.
2. `touch-action: pan-y` ya estaba puesto en el renglón (`Deslizable.module.css`), así que la zona muerta y el bloqueo de dirección eran indispensables: sin ellos, cualquier arrastre con algo de componente horizontal al principio (normal en un dedo real, no en un ratón) disparaba las acciones.

No hay "hold" que esperar de verdad (el founder lo menciona por analogía con iOS): lo que hacen Mail/Mensajes es justo esto — zona muerta + bloqueo de dirección con ángulo exigente —, no un temporizador.

### L45 — `Destacados.tsx` (carril de destacados, y sus hermanos)

Medido primero qué tipo de carril es: **scroll nativo del navegador** (`<ul style="overflow-x:auto">` con `<Link>` normales dentro, `scroll-snap-type` para el ajuste), no un arrastre propio con JavaScript. Esto es distinto de `ui/Deslizable` y pide un arreglo distinto, como pedía el encargo.

En un carril así, el navegador decide el scroll; el problema es que un `click` puede llegar al enlace después de un arrastre que sí movió el carril (particularmente si el arrastre fue corto o rápido). No hay que decidir un eje: basta con anular la navegación cuando hubo arrastre real entre bajar el dedo y soltarlo, en cualquier dirección.

`Destacados.tsx` es el único componente: lo usan Agenda (`AgendaInicio`), Lugares (`ListaLugares`) y Artistas (`ListaArtistas`), tanto para «Destacados» como para «Con eventos esta semana» — arreglarlo aquí arregla los tres carriles hermanos sin tocarlos.

## El canon (queda para todas las listas y carriles)

1. **Zona muerta de 10 px** (`UMBRAL_DECISION`): por debajo de eso el gesto no ha dicho nada todavía.
2. **Bloqueo de dirección al cruzar la zona muerta**: el eje que domina en ese instante decide **todo el toque**, no se vuelve a preguntar después.
3. **Ángulo claramente horizontal para abrir** (`FACTOR_HORIZONTAL = 2`): `dx` tiene que doblar a `dy`. Una diagonal ambigua (45° y cercanos) cae del lado del scroll, no del renglón — es la parte que faltaba.
4. **`touch-action: pan-y`** en el renglón, para que el navegador nunca dispute el scroll vertical mientras se decide.
5. **En un carril de scroll nativo** (`Destacados` y hermanos): sin eje que decidir; se cancela el `click` del enlace si hubo arrastre (`huboArrastre`, distancia recta) mayor que la misma zona muerta, en cualquier dirección.

## Qué se tocó

- **`src/lib/deslizar.ts`:**
  - `UMBRAL_DECISION` de 8 a 10 px.
  - `FACTOR_HORIZONTAL = 2` (nueva constante) y `decidirGesto` exige `Math.abs(dx) >= Math.abs(dy) * FACTOR_HORIZONTAL` para decidir «deslizar»; si no, «soltar» (scroll).
  - `huboArrastre(dx, dy, umbral = UMBRAL_DECISION)` (nueva función pura): distancia recta (`Math.hypot`) mayor que el umbral.
- **`src/components/Destacados.tsx`:** el `<ul>` del carril lleva `onPointerDown` (guarda dónde bajó el dedo) y `onClickCapture` (si `huboArrastre` desde esa bajada, `preventDefault()` y no navega). No cambia nada visible ni las acciones que ya había.
- **`src/lib/deslizar.test.ts`:** pruebas nuevas para el bloqueo de dirección con diagonal ambigua (abierto y cerrado) y para `huboArrastre` (con y sin umbral propio).

No se tocó `src/lib/destacados.ts` (zona de OL-093, en curso a la vez) ni las acciones, textos, colores o tamaños de nada.

## Cómo se probó

**Pruebas unitarias** (`npx vitest run src/lib/deslizar.test.ts`): 8 pruebas en verde, incluida la tabla completa del canon (zona muerta, diagonal que cae en scroll con el renglón cerrado y con el renglón abierto, horizontal claro que sí abre, `huboArrastre` con umbral por defecto y con uno propio).

**Con el dedo, en el simulador (FLOWYA iPhone SE, UDID `926414EF-8F1A-43F5-94A7-FCE1FE71A853`, iOS 26.3, Safari):** producción es solo lectura y el sistema de permisos bloquea arrancar la app contra datos de producción (incluso de solo lectura), así que no se usó `next dev` con el `.env` del proyecto — esta pieza es solo JavaScript de gestos, sin capa de datos, y no lo necesitaba. Se armó aparte, en el scratchpad de la sesión, un banco chico con Vite que monta **los componentes reales** (`ui/Deslizable`, `Destacados`, `lib/deslizar`) con filas y tarjetas inventadas en memoria, sin Supabase, sin `.env`, sin `next dev`. Queda descrito abajo para quien lo necesite después.

Cinco casos mínimos, con toques reales (no ratón):

1. **Bajar por la lista empezando el toque sobre un renglón:** el scroll baja la pantalla y ninguna acción asoma en ningún renglón.
2. **Deslizar en horizontal:** el renglón abre "✓ Voy" y "☆ Me interesa", pegadas al borde, y se queda abierto (comprobado también un segundo después, no se cierra solo); tocar "Voy" ejecuta la acción y cierra el renglón.
3. **Diagonal (ángulo ambiguo, dx y dy parecidos):** gana el scroll — la página se desplaza y ninguna acción abre, igual con el renglón cerrado.
4. **Recorrer el carril de destacados:** arrastrar sobre una tarjeta mueve el carril (de "Destacado 1" a "Destacado 3") sin navegar a ninguna ficha.
5. **Tocar una tarjeta del carril:** navega a su ficha (`→ NAVEGÓ a #ficha-2`).

Un hallazgo aparte, **no relacionado con este cambio y no tocado aquí**: al encadenar un scroll vertical y, sin esperar a que se asiente del todo la inercia, un gesto sobre un renglón recién abierto, el renglón se cierra solo — es el mecanismo ya existente y probado en las bitácoras [085](085-voy-y-me-interesa-al-deslizar.md)/[086](086-deslizar-en-todas-las-listas.md) («cualquier scroll cierra lo abierto»), reaccionando a la inercia residual del gesto anterior, no a este. No se tocó esa lógica (fuera de la zona de esta pieza); queda anotado por si a alguien le pasa algo parecido probando con el dedo.

### Cómo se levanta el banco de pruebas (para quien lo necesite después)

En el scratchpad de la sesión, carpeta aparte (no en el repo): `package.json` mínimo con `react`/`react-dom` (se reutiliza el `node_modules` del árbol de trabajo con un symlink, no se instala nada nuevo), `vite.config.ts` con alias `@/` → `src/` del árbol y `next/link` → un shim propio (un `<a>` normal que registra la navegación en vez de navegar), y `server.fs.allow` apuntando también a la carpeta `src/` del árbol (Vite por defecto no sirve archivos fuera de su propia carpeta). Un `index.html` + `src/main.tsx` monta `Deslizable` y `Destacados` reales con filas y tarjetas inventadas (imágenes con `data:image/svg+xml` en vez de red, para no depender de Internet). Se sirve con `vite --port 4173` y se abre con `preview_start {url}` o en el simulador con `open_url`. Nada de esto usa Supabase, `.env` ni `next dev`.

## Evidencia

- `npx vitest run src/lib/deslizar.test.ts`: 8 pruebas en verde.
- `npm run lint`: sin errores (el único warning es el de siempre, ajeno, en el script del logotipo).
- `npm run typecheck`: en verde.
- `npm test`: 692 pruebas en verde; los 7 casos que fallan (`scripts/test-db.test.ts`) son de antes de esta pieza — falta el paquete `pg` en `node_modules` de este entorno, algo del entorno, no del código; comprobado que fallan igual en `origin/main` sin tocar nada.
- `npm run build`: en verde, sin advertencias nuevas.
- Capturas del simulador (390×844 no aplica: el FLOWYA SE es 375×667 puntos; capturas reales del SE, con el dedo), en el scratchpad de la sesión:
  - `caso1-scroll-sobre-renglon-no-asoma.png`
  - `caso2-horizontal-abre.png` y `caso2-horizontal-persiste-1s.png`
  - `caso2-accion-voy-tocada.png`
  - `caso3-diagonal-gana-scroll.png`
  - `caso4-carril-destacados-arrastrado-sin-navegar.png`
  - `caso5-tap-tarjeta-navega.png`

## Revisión de gestión de cambios, arreglada (commit 6153f9a)

Un hallazgo chico, reproducido antes de tocar nada: en `Destacados.tsx`, `bajada` se guardaba en `pointerdown` y nunca se limpiaba. Un `click` sin puntero real (Enter con teclado, VoiceOver, `click()` por código) llega con `detail === 0` y sin relación con la última posición guardada; comparado contra la `bajada` de un toque anterior, `huboArrastre` podía dar `true` y cancelaba la navegación — tras tocar una vez el carril con el dedo, abrir una tarjeta con teclado o lector de pantalla dejaba de funcionar.

**Arreglo:** `alTocarCarril` solo cancela cuando `e.detail !== 0` (hubo un puntero real de por medio), y limpia `bajada.current` al final de cada click, para no arrastrarla a uno que no traiga la suya. No cabe en la función pura `huboArrastre` (depende de `event.detail`, no de coordenadas), así que quedó comentado en el propio `alTocarCarril`.

**Comprobado** con eventos sintéticos en el navegador: un `click` con `pointerdown` lejano y `detail: 1` (arrastre real) se cancela igual que antes; un `click` con `detail: 0` justo después, sin `pointerdown` propio, navega (`→ NAVEGÓ a #ficha-0`). Lint, typecheck, 692 pruebas y build en verde otra vez.

## Límites respetados

Solo se tocó `ui/Deslizable` (vía `lib/deslizar.ts`, sin tocar el propio `Deslizable.tsx`: la decisión del gesto ya vivía en la función pura) y `Destacados.tsx`. No se cambiaron acciones, textos, colores ni tamaños. No se tocó `src/lib/destacados.ts` (OL-093). Sin migración. Sin council, workflows ni subagentes.
