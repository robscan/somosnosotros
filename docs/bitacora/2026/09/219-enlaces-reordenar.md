# 219 · Reordenar enlaces con arrastre en el selector de enlaces (OL-184)

**Fecha:** 2026-09-24 · **Rama:** `enlaces-reordenar`, desde `origin/main`.

## Pedido

Founder, 2026-09-24: «Activa reorganización de enlaces en perfil de artista con drag and drop.»

## Dónde

`src/components/SelectorEnlaces.tsx` (+ `.module.css`): el mismo componente que usan `FormularioArtista.tsx`
y `FormularioLugar.tsx` para la lista de enlaces (redes) que edita la persona — el arrastre les sirve a los
dos sin distinguir pantalla, como pedía el encargo.

## Qué se construyó

1. **Lógica pura, aparte y probada — `src/lib/reordenar.ts`** (nuevo, sin DOM ni React):
   - `mover<T>(lista, de, a)`: copia la lista con el elemento movido de un puesto a otro; `de === a` o un
     índice fuera de rango devuelve una copia sin cambios (nunca lanza, nunca muta el original).
   - `indiceDestino(desplazamientoY, indice, altoRenglon, total)`: a qué puesto apunta un arrastre — redondea
     el desplazamiento (px) al renglón más cercano y recorta al primer/último puesto que existe. Un paso de
     teclado es el mismo cálculo con `desplazamientoY = ±altoRenglon`, así el arrastre y las flechas comparten
     una sola regla de "a dónde va".
   - `src/lib/reordenar.test.ts`: 14 pruebas — mover adelante/atrás, no muta el original, mismo puesto (copia
     sin cambios), primer→último y último→primer renglón, un solo elemento, índices fuera de rango, identidad
     de objetos conservada; `indiceDestino` con desplazamiento cero, redondeo hacia cada lado (35px/25px sobre
     un renglón de 60px), tope en el primer y en el último renglón con desplazamientos exagerados, lista de un
     solo elemento (siempre puesto 0), `altoRenglon` inválido (0, negativo) sin romper, y el caso "paso de
     teclado" exacto.

2. **`IconoAgarre` en `src/components/ui/Iconos.tsx`:** seis puntos en dos columnas (3×2), 24×24 de `viewBox`
   (se usa a 20×20 como los demás). Relleno, no trazo — mismo criterio que `IconoPuntos`, ya en el archivo: a
   este tamaño un trazo de 1.8 sobre un punto de ~3px se ve como un anillo, no como un punto; es la única
   manera de que "seis puntos" se lean como puntos con el grosor de trazo de la app.

3. **El agarre en `SelectorEnlaces.tsx`:** `<button type="button">` a la izquierda de cada renglón,
   `aria-label="Mover {etiqueta del enlace}"`, reset completo (`appearance:none; border:0; background:none;
   padding:0; margin:0; font:inherit`, regla dura del gestor tras tres mordidas del borde nativo del
   `<button>`), área de toque `var(--toque-min)` = 44px, `touch-action: none` **solo** en esta clase — medido
   con `getComputedStyle`: el agarre en `none`, el `<li>` y el campo de texto en `auto`/`manipulation`
   (confirmado que la página y el campo del título siguen aceptando gesto normal). Con un solo enlace no hay
   nada que reordenar: **el agarre no se muestra** (columna de la rejilla incluida; decisión de esta pieza,
   más simple que mostrarlo apagado — verificado en `arnes219-temporal/uno`, 0 botones de agarre en el DOM).

4. **Arrastre con eventos de puntero** (`onPointerDown` + `setPointerCapture`, `onPointerMove`,
   `onPointerUp`/`onPointerCancel`) — el drag and drop nativo de HTML5 no dispara con el dedo en Safari iOS,
   por eso no se usó. El componente no reordena el array de React mientras se arrastra (evita el vaivén de
   reordenar-y-desreordenar en cada pixel): mide una sola vez, al bajar el dedo, la distancia real entre dos
   renglones consecutivos (`getBoundingClientRect().top`, incluye el alto del renglón y el `gap` de `.lista`,
   así vale igual si un renglón crece por un error debajo) y en cada `pointermove` calcula el `objetivo` con
   `indiceDestino`. El renglón levantado seguía al dedo con `transform: translateY(desplazamiento)`
   (`transition: none`, `zIndex: 2`, `boxShadow: var(--sombra-panel)`); los renglones que quedan entre el
   origen y el objetivo se apartan un `altoRenglon` con `transition: transform 120ms ease` para abrir el
   hueco, sin mover el array todavía. Al soltar (`onPointerUp`/`onPointerCancel`) recién entra `mover(enlaces,
   indice, objetivo)` al estado (y por tanto al `hidden`), y un `aria-live` anuncia el nuevo puesto.

5. **Sin arrastre, con el foco en el agarre:** flecha arriba/abajo llama al mismo `mover`, corrido un puesto;
   el foco se repone en el agarre del mismo enlace tras la repintada (el `<li>` cambia de posición en el DOM,
   así que sin esto el foco se perdía) con un `useEffect` que lee una referencia "foco pendiente" puesta por
   la propia tecla. Un `<p aria-live="polite">` (oculto visualmente, `clip: rect(0,0,0,0)`) anuncia «{etiqueta}
   ahora en el puesto N de M» — mismo mensaje para arrastre y teclado. Sin botones visibles de subir/bajar,
   como pedía el encargo (el founder pidió arrastre; las flechas son solo para teclado/VoiceOver).

## Ninguna capa reordena por su cuenta (comprobado, no supuesto)

Leídas y sin `.sort()` ni reordenamiento propio:

- **`src/lib/enlaces.ts`** — `normalizarRedes` recorre el JSON de entrada en el orden en que llega y empuja a
  `out` en ese mismo orden (dedup por `url`, tope `LIMITE_ENLACES`); ninguna otra operación reordena.
  `enlacesDesdeJson` delega en `normalizarRedes` sin tocar el orden.
- **`validarArtista`** (`src/lib/artistas.ts:316`) y **`validarLugar`** (`src/lib/lugares.ts:226`): las dos
  llaman `enlacesDesdeJson(entrada.enlaces)` una sola vez y guardan el resultado tal cual en `datos.redes`, sin
  ordenar nada más.
- **`src/app/artistas/[id]/page.tsx`** y **`src/app/lugares/[id]/page.tsx`**: `normalizarRedes(a.redes)` /
  `normalizarRedes(lugar.redes)` y después `.map()`/`.filter()` (artista: separa `videos` de
  `redesConEnlace`, ambos con `.filter()`, que conserva el orden) — cero `.sort()` en los dos archivos
  (`grep -n "\.sort("` sin resultados).

Es decir: el orden que entra por el campo oculto `enlaces` (JSON armado por `SelectorEnlaces`) es el mismo que
sale en la ficha, de punta a punta. No hizo falta corregir ninguna capa.

## Evidencia

Sin Supabase en este entorno: arnés temporal `src/app/arnes219-temporal/` (página con el mismo canon de
pantalla que usan las fichas — `Barra`, `.pagina`, el renglón "Más" del `FormularioCanon` abierto — montando
`SelectorEnlaces` real con cuatro enlaces fijos; una variante `/uno` con un solo enlace para el punto 4) y
`/uno`, calcado del patrón de las bitácoras 203 y 218. **Borrado entero antes de comitear** (no aparece en
`git status`; el build final, corrido después de borrarlo, no lista ninguna ruta `/arnes219-temporal…`).

`next build && next start` (puerto 4219), Chromium real de `/opt/pw-browsers/chromium` vía `playwright-core`
(scratchpad de la sesión, `pw/node_modules`). El arrastre se hizo con `page.mouse.move` en pasos con el botón
presionado (eventos de puntero reales y confiables, como pide el encargo), no `dispatchEvent`.

Capturas en `docs/rediseno/capturas-219/`, 390×844 salvo la indicada, sin `fullPage`:

- **`01-lista-con-agarres.png`:** los cuatro enlaces (Instagram, YouTube, Vimeo con título al tope 30/30,
  Bandcamp), cada uno con su agarre de seis puntos a la izquierda.
- **`02-en-pleno-arrastre.png`:** Instagram (el primero) arrastrado 2.5 renglones hacia abajo — el renglón
  levantado con su caja/sombra encima de Bandcamp, los otros tres ya recorridos hacia arriba mostrando el
  hueco.
- **`03-tras-soltar-orden-cambiado.png`:** al soltar, el orden nuevo — YouTube, Vimeo, Bandcamp, Instagram —
  ya en el estado (confirmado también leyendo `input[name="enlaces"]`, que trae el JSON en ese orden).
- **`04-a-320px.png`:** la misma lista con agarres a 320px, `document.documentElement.scrollWidth ===
  clientWidth === 320` (medido, sin scroll horizontal).
- (Verificación adicional, fuera de las cuatro pedidas) **`05-un-enlace-sin-agarre.png`:** un solo enlace, sin
  botón de agarre en el DOM (`0` con `page.locator('button[aria-label^="Mover"]').count()`).

Verificado además, sin depender solo de la captura:

- **Teclado:** foco en el agarre de Instagram (puesto 1 de 4), `ArrowDown` → orden pasa a
  `youtube, instagram, vimeo, bandcamp`, `aria-live` dice «Instagram ahora en el puesto 2 de 4», y el foco
  sigue en «Mover Instagram» tras la repintada (medido con `document.activeElement`). En el último renglón,
  `ArrowDown` no cambia el orden (el borde que ya cubre `reordenar.test.ts`, confirmado también en el
  componente montado).
- **`touch-action`:** `getComputedStyle` mide `none` en el agarre y `auto`/`manipulation` en el `<li>` y en el
  input del título — el resto del renglón sigue aceptando el gesto normal de la página.
- Icono `IconoAgarre` mirado de cerca (captura a `deviceScaleFactor: 4` de un solo botón): seis puntos claros
  en dos columnas, sin deformarse a 20×20.

## Pruebas

```
npm run lint && npm run typecheck && npm test && npm run build
```

Las cuatro en verde, corridas sobre el árbol ya sin el arnés: lint 0 errores (1 warning preexistente sin
relación, `docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio; **1189 pruebas, 97 archivos** (eran 1175/96
antes de esta pieza; +14 pruebas de `reordenar.test.ts`, +1 archivo), todas en verde; build completo, sin
ninguna ruta `/arnes219-temporal…` en el árbol de rutas final. `git diff origin/main -- <archivos de esta
pieza> | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` no encontró ninguna dirección.

## Lo que no se tocó

`src/lib/enlaces.ts` (ni sus pruebas), `src/app/artistas/FormularioArtista.tsx`,
`src/app/lugares/FormularioLugar.tsx` (el arrastre entra desde `SelectorEnlaces`, sin cambios en quien lo
monta), las fichas de artista/lugar más allá de leerlas para confirmar que no reordenan, `SeccionNovedades.tsx`
ni `novedades/**` (OL-181), `src/app/eventos/**` ni `ui/ListaFlotante` (OL-182). Sin dependencia nueva, sin
migración.

## Límites

`origin/main` puede haber avanzado mientras se trabajaba esta pieza (varios chats a la vez); la rama sigue
sobre la base con la que se abrió el árbol, sin traer `main`, como pide el encargo (sin PR: lo abre el
gestor, que puede traer `main` antes si hace falta).

## Cierre

`git -C /home/user/somosnosotros status --short` vacío (nunca se tocó la carpeta principal); árbol de esta
pieza limpio salvo lo propio. Commit local en `enlaces-reordenar`; `git push -u origin enlaces-reordenar` al
terminar, sin PR (lo abre el gestor).
