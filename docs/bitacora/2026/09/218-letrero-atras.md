# 218 · Barra «Atrás» en el letrero para imprimir (OL-183)

**Fecha:** 2026-09-24 · **Rama:** `letrero-atras`, desde `origin/main`.

## Defecto

Founder, en su iPhone con la app instalada, 2026-09-24: «Al descargar letrero en app abre el documento en app
pero no hay botón para cerrar o salir de ese visor de pdf». Se refiere al letrero con el QR del artista
(`src/app/artistas/[id]/letrero/page.tsx`, abierto desde «Descargar letrero» en `CompartirFicha.tsx` con
`target="_blank"`).

## Causa

La página se pensó para escritorio (OL-159, doc 40e): sin cabecera ni barra de la app, `ImprimirAlAbrir`
llama `window.print()` sola al cargar y el texto de ayuda hablaba de ⌘/Ctrl P. En la app instalada
(`display: standalone`) no hay barra del navegador: al cerrar el cuadro de impresión del visor de PDF, la
persona se quedaba en una página sin «Atrás» ni salida.

## Arreglo

1. **`BarraLetrero.tsx`** (cliente, nuevo) + estilos en `letrero.module.css`: barra sticky arriba, con el
   canon de cabecera de las fichas (chevron de `ui/Iconos`, violeta `--primario`). A la izquierda, un enlace
   normal (`next/link`) a la ficha (`hrefArtista(a)`) — **no** `history.back()`/`ui/Atras`: la página puede
   abrirse en pestaña nueva sin historial propio. A la derecha, un botón que repite `window.print()`, para
   quien cerró el cuadro de impresión sin guardar. `.barra` lleva `@media print { display: none }`; no sale
   en el papel ni en el PDF, y `main` no cambia de tamaño A4 al imprimir.
2. Texto de ayuda reescrito para teléfono y escritorio a la vez, sin ⌘/Ctrl: «Se imprime sola al abrir. Si
   no, toca "Imprimir o guardar PDF". En el iPhone, en el cuadro de impresión, elige Compartir y luego
   Guardar en Archivos. En las opciones, quita encabezados y pies de página.» Ya tenía `@media print { .ayuda
   { display: none } }` (OL-159); no se tocó esa regla, solo el texto.
3. `ImprimirAlAbrir.tsx` se conserva tal cual, sin cambios.
4. Sin tocar `CompartirFicha.tsx` ni `lib/artistas.ts`, como pedía el encargo.

El botón nuevo lleva el reset completo de apariencia nativa (`appearance: none; border: …; background: none;
padding: 0; font: inherit`) en su propia clase — la regla dura del gestor tras morder el borde nativo del
`<button>` tres veces (OL-159, OL-163, OL-167).

## Evidencia

Sin Supabase en este entorno (sin `.env.local`): arnés temporal `src/app/arnes218-temporal/letrero/` con el
mismo `main` y los mismos componentes de la página real (`BarraLetrero`, `ImprimirAlAbrir`, `CodigoQr`) y un
artista fijo — **borrado entero antes de comitear**, confirmado en «Cierre».

`next build && next start` (puerto 4218), Chromium real de `/opt/pw-browsers/chromium` vía `playwright-core`
(scratchpad de la sesión, `pw/node_modules`). Antes de cada captura, `window.print` anulado con
`addInitScript`. `document.documentElement.scrollWidth === clientWidth` medido en las tres, sin desborde.

Capturas en `docs/rediseno/capturas-218/`:

- **`01-letrero-pantalla.png`** (390×844): el letrero con la barra «‹ Atrás / Imprimir o guardar PDF» arriba.
- **`02-letrero-impresion.png`** (390×844, `page.emulateMedia({ media: "print" })`): la barra y el párrafo de
  ayuda no salen (comprobado también con `getComputedStyle(...).display !== "none"` sobre `<header>` y
  `p.ayuda`: `{ barra: false, ayuda: false }`).
- **`03-letrero-320px.png`** (320×844): la barra completa, sin recorte ni desborde.

`npm run lint && npm run typecheck && npm test && npm run build`, los cuatro en verde: lint sin errores (1
warning preexistente sin relación, `docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio; **1175 pruebas,
96 archivos**, ninguna rota (sin prueba unitaria propia: el href se arma con `hrefArtista`, ya probado en
`artistas.test.ts`, y el texto de ayuda es JSX estático sin lógica que probar); build completo, sin la ruta
del arnés en el árbol de rutas final.

## Cierre

`git status --short` limpio de la carpeta del arnés y de artefactos de build. Commit local en
`letrero-atras`. Sin push ni PR (los da el gestor); sí `git push -u origin letrero-atras` al terminar, como
pide el encargo.
