# 236 · Navegación y shell que se adapten a web, iOS y Android (OL-207)

**Fecha:** 2026-09-25 · **Rama:** `navegacion-plataformas`, desde `origin/main` · **Pieza de documento y
prototipo, sin código de la app** (ni de `apps/ios`, ni de `src`). Sin subagentes, council ni workflows.

## Pedido

OPEN_LOOPS, OL-207. Palabras del founder: *"algo estamos haciendo mal si necesitamos pedirle que aprenda algo
nuevo no? Cuestiona la manera como funciona botón atrás, cuestiona la arquitectura/navegación… ¿se puede hacer de
otra manera de modo que llevarlo a iOS y Android no implique nuevos aprendizajes?… el botón de back dice "atrás"
y no creo que sea necesario, me gusta más el canon de iOS que usa botones de acción solo con un icono… los
tamaños de accionables del header son más pequeños que el canon de iOS… hay que revisar contra Android"*. El
gestor de cambios ya adelantó un diagnóstico y el founder lo aceptó ("bien, escríbelo y dale al proto"): esta
pieza lo desarrolla, lo contrasta con el código y prepara el rediseño fuerte que el founder ya decidió aplazar
(OL-202, PR #237).

## Qué se leyó antes de escribir

Código: `src/lib/historial.ts`, `src/components/ui/Atras.tsx` (`useVolver`, `useTerminar`),
`src/components/Navegacion.tsx`, `src/components/NavInferior.tsx`, `src/lib/memoriaPantalla.ts`,
`src/components/MemoriaPantalla.tsx`, `src/components/ui/Barra.tsx` (+ `.module.css`), `src/components/ui/
Atras.module.css`, `src/components/ui/Cerrar.tsx` (+ `.module.css`), `src/components/Sesion.module.css`,
`src/app/globals.css` (tokens `--alto-barra`, `--alto-nav`, `--toque-min`), `src/components/ui/Chip.tsx`
(`ChipEnlace`), `src/components/ui/Salto.tsx`, `src/lib/gestoAtras.ts`, `src/lib/guardiaSalida.ts`,
`src/app/template.tsx`, `src/components/Publicar.tsx` (+ `.module.css`), `src/components/ui/Iconos.tsx`,
`apps/ios/ios/App/App/GestoAtrasPlugin.swift`. Bitácoras: 077 (filtrar no es navegar, OL-050), 083 (Atrás
coherente, OL-055), 234 (App de iPhone: cuatro arreglos, OL-205). Auditoría no unida:
`git show origin/shell-ios:docs/rediseno/48-shell-ios.md` (doc 48, rama `shell-ios`). Inventario completo de
`src/app` (`grep -rl "<Barra" src/app`, 32 rutas) para clasificar cada pantalla.

Fuentes externas (con `WebSearch`/`WebFetch`; las páginas vivas de Apple y Material Design 3 son SPA que no se
pudieron renderizar directo, así que las cifras se corroboraron por más de una búsqueda antes de citarlas, y se
dice en el documento dónde no se pudo confirmar en una fuente primaria): Apple HIG (`foundations/layout`,
`buttons`) para el área mínima de toque (44×44 pt); Material Design 3 (`foundations/designing/structure`,
`components/app-bars/specs`) para 48×48 dp y 64 dp de barra superior; Android Developers (`guide/navigation/
principles`) y Material Design (`design/navigation/understanding-navigation.html`) para el back button y la
barra inferior.

## Qué se entregó

1. **`docs/rediseno/49-navegacion-plataformas.md`** — el documento. Contrasta el diagnóstico con el código
   (confirma que "filtrar no es navegar" ya es la regla nativa y que lo mal puesto es que `Atras.tsx` corrige el
   historial al tocar en vez de que se escriba bien desde el origen), propone los tres movimientos con su
   equivalente exacto en las tres plataformas, trae el inventario de las 32 rutas de `src/app` clasificadas (una
   sola no cumple hoy: la barra inferior, `NavInferior.tsx:60`), desarrolla pila armada al llegar, barra inferior
   que reemplaza, Atrás sin lógica, los seis riesgos/casos de borde pedidos, el shell con medidas citadas y el
   orden de ocho piezas con tamaño y prueba.
2. **`docs/rediseno/prototipos/navegacion-plataformas.html`** — prototipo estático, autocontenido, sin
   librerías externas (solo la fuente Bricolage Grotesque de Google Fonts). Tres teléfonos 390×844 (Web, iPhone,
   Android) con la misma lógica de navegación (una sola fuente de datos en JavaScript, sin frameworks) y el shell
   propuesto dibujado con las medidas y colores reales (`--primario: #6d34c8`, `--radio-grande: 16px`, etc.).
   Interactivo: tocar una tarjeta apila, un chip reemplaza, el "+" abre una tarea modal, cambiar de sección en la
   barra inferior se comporta según el conmutador **Hoy/Propuesto**, y cada teléfono tiene su propio control de
   "sistema" (flecha del navegador, gesto de borde simulado, botón de Android) además del botón "Atrás"/"Cerrar"
   propio de la app — para mostrar en vivo que hoy solo el segundo es confiable. Debajo de cada teléfono, su pila
   de historial dibujada en vivo. Un botón "Llegar por enlace compartido" arranca los tres teléfonos con una
   ficha sin nada detrás.
3. **Capturas** en `docs/rediseno/capturas-236/` (ver abajo, cada una abierta y descrita).
4. **Bitácora** (este archivo) con la salida de la verificación programática.

## Capturas (abiertas y descritas una por una)

Todas con Chrome real vía `playwright-core` (instalado solo en el scratchpad, `npm install playwright-core
--no-save`), viewport 1400×1400-1500, `waitUntil: "networkidle"` y `document.fonts.ready` antes de disparar.

- **`01-vista-general-hoy.png`** — vista general a 1400 de ancho, modo **Hoy** (estado inicial): los tres
  teléfonos muestran el mismo shell (barra de 56px con "SMSNSTRS" a la izquierda, campana y avatar a la derecha;
  botón flotante violeta "Publicar evento" sobre la nav inferior con píldora de color en el activo) — así se ve
  hoy la app dentro del `WKWebView` de iOS y como se vería en un hipotético Android: idéntica a la web, sin nada
  nativo, que es justo lo que señaló la auditoría del doc 48.
- **`02-vista-general-propuesto.png`** — mismo estado, modo **Propuesto**: el "+" se movió a la barra superior
  (violeta, junto a la campana) en los tres, el botón flotante desapareció, y la nav inferior de Android conserva
  su píldora de Material mientras Web/iOS quedan neutras (solo color) — confirmado también con
  `getBoundingClientRect` (ver verificación, punto "alturas").
- **`03-pila-filtro-ficha-propuesto.png`** — modo Propuesto, tras "Ir a Lugares" → "Tocar un filtro" (pasa a
  "Todos") → "Abrir una ficha": los tres muestran la ficha "Centro Cultural Universitario" con la barra interior
  ya diferenciada por plataforma (iOS: `‹` + `···`, alto 44; Android: `←` + `⋮`, alto 64, visiblemente más alta
  que iOS/Web en la captura) y el título de la sección en vez del logotipo centrado. La pila de cada teléfono
  muestra 2 entradas: `1 RAÍZ Lugares (Todos)` y `2 DETALLE Centro Cultural Universitario`, esta última marcada
  "◀ aquí" — confirma que el chip reemplazó (la raíz sigue siendo la entrada 1, con el filtro ya puesto) y que la
  ficha apiló (entrada 2 nueva).
- **`04-pila-tras-atras-propuesto.png`** — mismo estado, tras "Atrás (de la app)" a los tres: la pila vuelve a
  tener una sola entrada (`1 RAÍZ Lugares (Todos)`), la ficha desapareció del historial (no quedó un "adelante"
  colgado) y el contenido en pantalla es la lista de Lugares con "Todos" resaltado.
- **`05-enlace-compartido-hoy.png`** — modo Hoy, tras "Llegar por enlace compartido": los tres teléfonos abren
  directo en la ficha "Noche de jazz en el Centro" con la píldora "‹ Atrás" (40px, con texto) y **sin barra
  inferior** (es una pantalla de detalle). La pila de cada uno tiene **una sola entrada** (`1 DETALLE …`): nada
  detrás, como llegaría de verdad un enlace compartido.
- **`06-enlace-compartido-hoy-atras-sistema-bug.png`** — mismo estado, tras tocar el control de "sistema"
  (`Atrás del navegador` / `Simular gesto de borde` / `◁ Botón de Android`) en vez del botón propio de la app: los
  tres muestran el aviso negro **"SE ROMPE"**: *"No pasa nada (o sale del sitio): el gesto/botón nativo no conoce
  la marca propia del historial… por eso hoy hace falta interceptarlo a mano (GestoAtrasPlugin.swift) — y solo
  existe ese parche en la app de iPhone"*. La pila no cambió (sigue en 1 entrada): el control de sistema no supo
  volver a la pantalla madre.
- **`07-enlace-compartido-propuesto.png`** — modo Propuesto, mismo botón "Llegar por enlace compartido": ahora
  la pila de cada teléfono llega ya armada con **dos entradas** (`1 RAÍZ Agenda`, `2 DETALLE Noche de jazz…`,
  esta última "◀ aquí") — la pantalla madre quedó debajo desde el origen, antes de que se viera nada.
- **`08-enlace-compartido-propuesto-atras-sistema-ok.png`** — mismo estado, tocando el control de sistema: el
  aviso ahora es verde, **"SE COMPORTA COMO SE ESPERA"**: *"Pop simple del historial: coincide con lo que hace
  'Atrás'. No hizo falta ninguna marca propia"*. La pila baja a una entrada (`1 RAÍZ Agenda`) y el contenido
  vuelve a la lista de Agenda — el mismo control que fallaba en la captura 06 ahora resuelve solo, sin ningún
  parche.
- **`09-tarea-modal-hoy.png`** — modo Hoy, tras "Publicar (+)": pantalla completa con "SMSNSTRS" centrado y una
  ✕ redonda de 40px a la derecha — el patrón de hoy (`ui/Cerrar.tsx`): una página normal con una ✕, no una hoja.
- **`10-tarea-modal-propuesto.png`** — modo Propuesto, mismo botón: una hoja real que sube desde abajo (con asa,
  esquinas redondeadas arriba, fondo de la pantalla anterior asomando detrás) con el título "Publicar evento" y
  la ✕ — la tarea modal de verdad que recomienda el documento (sección 2, tercer movimiento).

## Verificación

`npm run lint` — sin tocar `src/` ni `apps/ios/` (esta pieza es documento y prototipo), se corrió para confirmar
que el árbol sigue verde antes de commitear:

```
$ npm run lint
```

Salida: 0 errores (el aviso ajeno de siempre en `docs/diseno/logotipo/iconos-sn.mjs`).

**Verificación programática del prototipo** (`window.pruebaNavegacion()`, ejecutada con Chrome real vía
`playwright-core` desde el scratchpad, script `probar.mjs`; también corre sola al abrir la página y queda
expuesta en `window.__pruebaNavegacion`):

```
PASA — Hoy: cambiar de sección apila (bug diagnosticado)
PASA — Propuesto: cambiar de sección nunca apila
PASA — Hoy: abrir una ficha apila
PASA — Propuesto: abrir una ficha apila (igual que Hoy)
PASA — Hoy: chip de filtro nunca apila
PASA — Propuesto: chip de filtro nunca apila
PASA — Hoy: enlace compartido llega SIN pantalla madre detrás
PASA — Hoy: el control de sistema NO sabe volver a la madre (bug)
PASA — Propuesto: enlace compartido arma la pila con la madre debajo
PASA — Propuesto: el control de sistema SÍ vuelve a la madre (pop simple)
PASA — Hoy: el botón "Atrás" de la app SÍ vuelve a la madre aunque el sistema no sepa
todoPasa: true
```

Las 11 comprobaciones pasan. También se midió con `getBoundingClientRect` (script `medir.mjs`) que, en modo
Propuesto, la barra superior mide 44px en Web e iOS y **64px en Android**, y que el botón flotante no aparece en
ninguna plataforma (el "+" vive en la barra) — confirma visualmente lo que muestran las capturas 02-04.

Sin datos privados: el prototipo no tiene datos reales (nombres, correos ni lugares inventados coinciden con
personas o instituciones de `docs/CAPO` o `docs/instituciones`); `git diff` no trae ninguna arroba.

## Cierre

`git status --short`: solo los archivos de esta pieza (`docs/rediseno/49-navegacion-plataformas.md`,
`docs/rediseno/prototipos/navegacion-plataformas.html`, `docs/rediseno/capturas-236/*.png`,
`docs/ops/OPEN_LOOPS.md` con la línea de OL-207 ampliada, esta bitácora). `git add` por nombre. Commit local en
`navegacion-plataformas`; push y PR contra `main`, sin unir — espera la firma del founder sobre la arquitectura
antes de que entre cualquier código (orden de piezas en la sección 5 del documento 49).
