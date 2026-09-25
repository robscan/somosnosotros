# 229 · Símbolo SN nuevo en todos los usos (OL-200)

**2026-09-25 · Operador nuevo (Sonnet), rama `simbolo-sn-nuevo`.**

## El pedido

Founder: «necesito un ajuste en el símbolo, este es el nuevo (SN) y lo que requiero es que lo reemplaces en
todos los lugares donde se usa, desde favicon, app icono, placeholder etc.» Archivo nuevo:
`SN - Symbol1.svg` (viewBox 0 0 1035 795, dos `<path>` separados —S y N—, relleno negro). El anterior
`LogoFinal/SN - Symbol.svg` traía la S y la N como **subtrazos de un solo `<path>`** (varios `M...Z` dentro
del mismo `d`); el nuevo los trae como **dos `<path>` independientes**. Esa diferencia es la que rompía los
generadores (leían solo el primer `d="…"`, así que se habrían quedado con la N sola).

## Inventario: dónde vivía el símbolo viejo

Con `git show HEAD:"docs/diseno/logotipo/LogoFinal/SN - Symbol.svg"` saqué los primeros 30 caracteres del `d`
(`M654.972 664.298V377.338H657.972`) y busqué ese fragmento con `grep -rn` en `src`, `public`, `docs` y
`scripts`:

- `docs/diseno/logotipo/LogoFinal/SN - Symbol.svg` — el arte fuente.
- `docs/diseno/logotipo/iconos-sn.mjs` — genera `favicon.ico`, `apple-touch-icon.png`, `icono-192.png`,
  `icono-512.png`, `icono-maskable-512.png`, `icono-aviso.png` (insignia de avisos) a partir del `d` del SVG.
- `docs/diseno/logotipo/sin-foto-sn.mjs` — genera `public/sin-foto.png` y `public/sin-foto-ancha.png`.
- `src/components/ui/SimboloCargando.tsx` — el símbolo en línea (SVG inline) del cargador.
- `docs/rediseno/prototipos/transiciones.html` — prototipo **firmado** de la pieza del cargador (OL-144,
  bitácora 179): trae el símbolo viejo en línea, con su propio botón «Ver cargador» para aislarlo. **No lo
  toqué**: es la evidencia histórica de lo que se aprobó entonces, no una pantalla que sirva la app hoy (regla
  de memoria "Verificar contra lo firmado" — un prototipo firmado se compara, no se reescribe con el diseño
  nuevo). Si el founder quiere el símbolo nuevo también ahí, es pieza aparte.

Además busqué menciones de texto (sin el trazo) en `docs/diseno/logotipo/README.md` y `docs/diseno/LINEA_GRAFICA.md`:
solo describen en prosa qué genera cada script; no llevan el `d` embebido, así que no había nada que romper
ahí y no los toqué (no forman parte de lo pedido: son documentación, no un uso del símbolo).

`public/portada.png` (la imagen de vista previa al compartir el enlace) la revisé aparte: sale de
`docs/diseno/logotipo/portada.html`, que solo usa `logotipo.svg` (el logotipo SMSNSTRS con manos y pies) — sin
el símbolo SN. No la toqué.

Placeholders «sin foto» servidos desde Supabase o subidos por script: revisé `scripts/capo/**` y
`scripts/fotos/**` (los únicos que suben archivos a Storage) — ninguno sube ni referencia el símbolo SN o
`sin-foto*.png`; el placeholder solo vive como archivo estático en `public/`, sin copia en Supabase. Nada que
avisar aquí.

## Qué hice

1. **Copié el archivo nuevo tal cual** sobre `docs/diseno/logotipo/LogoFinal/SN - Symbol.svg` (git conserva el
   anterior en la historia).
2. **`iconos-sn.mjs` y `sin-foto-sn.mjs`:** cambié `simbolo.match(/ d="([^"]+)"/)[1]` (un solo `d`, se quedaba
   con el primer `<path>`) por `[...simbolo.matchAll(/<path[^>]* d="([^"]+)"/g)].map(m => m[1])`, que junta
   **todos** los `<path>` del arte fuente. Cada lienzo ahora dibuja un `<path>` por cada trazo encontrado
   (hoy dos: S y N), en vez de uno solo — sigue funcionando igual si el founder algún día entrega un solo
   trazo. No cambié las reglas ya existentes (fondo blanco opaco, zona segura del icono adaptable, insignia en
   silueta blanca sobre transparente).
3. Regeneré con los dos generadores: `node docs/diseno/logotipo/iconos-sn.mjs` y
   `node docs/diseno/logotipo/sin-foto-sn.mjs` (usan `sharp`, ya en el repo). Salieron: `src/app/favicon.ico`,
   `public/apple-touch-icon.png`, `public/icono-192.png`, `public/icono-512.png`,
   `public/icono-maskable-512.png`, `public/icono-aviso.png`, `docs/diseno/logotipo/iconos-revision.png`,
   `public/sin-foto.png`, `public/sin-foto-ancha.png`.
4. **`SimboloCargando.tsx`:** cambié el único `<path>` (con sus subtrazos S+N) por los dos `<path>` del arte
   nuevo, mismo `viewBox="0 0 1035 795"`, mismo `fill="currentColor"`. El pulso (`SimboloCargando.module.css`,
   `@keyframes pulso`) anima la clase del `<svg>` completo, no un trazo en particular, así que no había nada
   que adaptar ahí: mismo tiempo (1.1 s, `ease-in-out`), mismo efecto (opacidad 1↔0.42, escala 1↔0.94),
   mismo comportamiento con «reducir movimiento».
5. **Caché de iconos por URL:** `src/app/manifest.ts` (los tres `icons[].src`) y el
   `icons.apple` de `src/app/layout.tsx` usan nombres fijos que Next.js **no** versiona solo — les agregué
   `?v=2`. Comprobé aparte que **`favicon.ico` no necesitaba nada manual**: Next 16 ya le agrega un hash de
   contenido él solo al `<link rel="icon">` (`/favicon.ico?favicon.2vieaizrrbvg2.ico`, visto en el HTML
   servido por `next start`) — cambia solo si cambia el archivo. También versioné con `?v=2` el
   `<Image src="/apple-touch-icon.png">` de `src/components/HojaInstalar.tsx` (la vista previa del icono
   dentro de la hoja de instalar) y el `icon`/`badge` de `public/sw.js` (avisos push), mismo motivo: URL fija,
   contenido nuevo.
   - **Aviso para el founder:** en su iPhone, la app **ya instalada** puede seguir mostrando el icono viejo en
     el inicio hasta que la borre y la vuelva a instalar — iOS no refresca el icono de una app web ya en el
     dock/inicio, ni con `?v=2` (eso ayuda al navegador y a los avisos push, no al icono ya copiado al
     springboard). Es lo mismo que ya se sabía del símbolo anterior (ficha "Icono en iOS 26").

## Las cuatro comprobaciones

En la Mac, worktree `/Users/apple-1/somosnosotros/.claude/worktrees/agent-a8515e1a3610ea5d9`, rama
`simbolo-sn-nuevo`:

- `npm run lint`: verde (1 warning ajeno, `'k' is assigned a value but never used` en
  `docs/diseno/logotipo/iconos-sn.mjs` línea 59 — ya estaba antes de esta pieza, en una línea que no toqué).
- `npm run typecheck`: verde. Antes de `npm install --no-save` (sin tocar `package.json` ni
  `package-lock.json`) fallaba por dos módulos declarados pero no instalados en este worktree
  (`@vercel/analytics/next`, `qrcode`) — el mismo hueco de entorno que ya reportó la bitácora 226, ajeno a
  esta pieza.
- `npm test`: verde, 98 archivos / 1255 pruebas.
- `npm run build`: verde, `next build` completo, 25 rutas generadas.
- `git diff origin/main...HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'`: sin salida (sin correos en el diff).

## Evidencia (capturas reales, Chrome vía `playwright-core`)

Instalé `playwright-core` con `npm i --no-save playwright-core` (mismo patrón que
`scripts/capo/fotos-chrome/recorrer.mjs`: `chromium.launch({ channel: "chrome", headless: true })`, el Chrome
real de la Mac, no un Chromium descargado aparte) y serví la app con `next build && next start -p 3411`. Las
capturas viven en `docs/rediseno/capturas-229/`.

Este árbol de trabajo no tiene `.env.local` ni Supabase configurado (no copié `.env`, como pide el repo
público) y no hay datos sembrados: `/artistas` responde vacío (`"artistas":[]`, sin error, el cliente de
Supabase devuelve `null` sin variables — confirmado en `src/lib/supabase/servidor.ts`). Sin una ficha real ni
una consulta lenta que sostenga el `loading.tsx` el tiempo de una foto, reconstruí esas dos pantallas **con
las clases CSS reales que la misma página ya trae cargadas** (confirmé cada clase con `grep` sobre los chunks
compilados en `.next/static/chunks/*.css` y sobre el payload RSC real de `/artistas`: `Barra-module__NzpEQG__`,
`Atras-module__bN9HcW__`, `Logotipo-module__N9HBRq__`, `Ficha-module__nGeGMW__`, `Cartel-module__WKY6Za__`,
`Cargando-module__uplPDW__`, `SimboloCargando-module__MkwuOG__`), inyectando el marcado por
`page.evaluate()` en vez de inventar estilos aparte — la misma idea que ya usa el prototipo firmado de la
pieza 179 con su botón «Ver cargador» para aislar el estado sin esperar a la red.

- **`lamina-iconos--1280x800.png`** — los seis iconos generados (favicon, apple-touch-icon, icono-192,
  icono-512, icono-maskable-512, icono-aviso) lado a lado, dos veces: fila de arriba sobre blanco, fila de
  abajo sobre negro, con un fondo de cuadros para revelar transparencia. Se ve que los cinco primeros llevan
  fondo blanco opaco de verdad (cuadrado sólido, no cuadros) tanto en la fila clara como en la oscura —
  correcto, es lo que evita que iOS los pinte oscuros—; solo `icono-aviso.png` es transparente con la silueta
  blanca del símbolo (se ve el cuadriculado alrededor y la S/N blanca sobre el gris de prueba). El símbolo
  nuevo (más ancho que alto, 1035×795) queda bien centrado y con margen parejo en los cuadrados, sin recortarse
  ni pegarse a los bordes, y dentro del círculo seguro en el icono adaptable.
- **`cargador-simbolo-sn--390x844.png`** — la barra superior real (logotipo SMSNSTRS, botón «Entrar») fija
  arriba y la navegación real fija abajo (Inicio/Agenda/Lugares/Artistas, con Artistas resaltado), como hace
  `CargandoRaiz`; en medio, el símbolo SN nuevo centrado, tomado del mismo `<path>` que ahora sirve
  `SimboloCargando.tsx` (capturado a mitad del pulso, ligeramente más chico y tenue que su tamaño completo —
  se nota el latido).
- **`ficha-artista-sin-foto--390x844.png`** — cabecera interior real (flecha «Atrás» + logotipo chico
  SMSNSTRS centrado), debajo el avatar circular de 112 px con el símbolo SN nuevo en gris sobre el fondo de
  miniatura (exactamente lo que sirve `Cartel.tsx` cuando `src` es `null`, con `public/sin-foto.png`), nombre
  de ejemplo, etiqueta y dos renglones de datos (ciudad, "Sin fechas próximas") para dar contexto de ficha.

## Qué falta / qué no pude hacer

- No pude capturar una ficha real con datos reales (no hay Supabase configurado en este árbol ni datos
  sembrados); la captura (c) es una reconstrucción fiel con las clases y el PNG reales, no una ficha con un
  artista de verdad. Si el gestor quiere la captura contra datos reales, hace falta un respaldo local
  (memoria del proyecto menciona una API local sobre PGlite) que no está montado en este worktree.
- El prototipo firmado `docs/rediseno/prototipos/transiciones.html` (bitácora 179) se quedó con el símbolo
  viejo a propósito, por ser evidencia histórica; si se quiere actualizado, es pieza aparte con permiso del
  founder.
- Falta que el gestor de cambios revise el PR y decida cuándo unirlo a `main`.
