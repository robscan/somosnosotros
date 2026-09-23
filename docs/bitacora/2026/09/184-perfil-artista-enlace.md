# 184 · El perfil del artista como su enlace único (OL-149)

**Fecha:** 2026-09-23 · **Rama:** `perfil-artista-enlace`, desde `origin/main` · **OL:** OL-149 (C1, propuesta) · **Modelo:** Sonnet 5, esfuerzo bajo. Sin council ni subagentes (costo).

## De dónde sale

El founder pidió seguir con C1 (junto a C2, C5 y C4) en la última tanda («Last updated» de `docs/ops/OPEN_LOOPS.md`, 2026-09-23). C1 es el renglón L54 del anexo de `docs/ops/COLA_DE_PIEZAS.md`: que al artista le quede claro cómo entrar a su perfil de artista y compartir rápido, y que prefiera esta ficha a un «link en bio». Se apoya también en L9, L12, L13, L20, L21 y L23. Es una pieza de **propuesta y prototipo, sin código** (así la reservó el gestor).

Lo leído antes: `CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-149 en `docs/ops/OPEN_LOOPS.md`, el anexo completo de `docs/ops/COLA_DE_PIEZAS.md`, `docs/DEFINICION.md`, `docs/rediseno/24-grafo-cultural.md`, `docs/PRINCIPIOS_UX.md`, el código de hoy de la ficha de artista (`src/app/artistas/[id]/page.tsx`, `EsMiNombre.tsx`), el reclamo (`reclamarArtista`, tabla `artistas_cuentas`), Mi perfil (`src/app/perfil/page.tsx`, `FichaPersona`), el QR de Pincel (`src/lib/qr.ts`, `src/components/ui/CodigoQr.tsx`) y el reconocimiento de redes (`src/lib/enlaces.ts`, `IconoRed.tsx`).

## Qué se entrega

**`docs/rediseno/40-perfil-artista-enlace.md`**, con cinco partes:
- El problema en palabras del founder (L54, L9, L12, L13).
- Acceso desde Mi perfil: `artistas_cuentas` ya permite varios artistas por cuenta (es la misma tabla del reclamo); hoy Mi perfil solo muestra "artistas seguidos", no los que se llevan. Propuesta: bloque nuevo "Mis artistas" antes de "Lo que sigues", una tarjeta por artista, sin confundir "ficha" (de artista) con "perfil" (de usuario).
- Compartir rápido: el enlace ya es corto y estable (columna `slug`, ya usada); el QR reusa el patrón exacto de Pincel (SVG del servidor); NFC no lo da Safari (fuente MDN); una tarjeta de Apple Wallet (`.pkpass`) sí es posible desde la web sin app nativa (fuente Apple Developer/PassKit), lo que matiza una frase de CLAUDE.md y se deja como pregunta al founder.
- Los campos frente a un «link en bio», cada uno con veredicto medible: video de YouTube/Vimeo embebido (**entra ahora**, el dato ya se captura), foto de Instagram (**después**, solo una publicación por oEmbed; la API que leía el feed público se retiró en 2024), novedad de obra (**después**, pieza de modelo de datos, ya señalada como pendiente en el grafo cultural), blog (**no** en esta pieza, alimentado por la novedad de obra si el founder la aprueba).
- Cinco preguntas solo para el founder (Wallet antes de tiempo, revisión de videos, Instagram por enlace suelto, forma de la novedad de obra, artista principal si son varios).

**`docs/rediseno/prototipos/perfil-artista-enlace.html`**, teléfono 390×844, Bricolage Grotesque, mismo canon de tokens que `alta-evento-lugar.html`: cinco estados (Mi perfil con un artista, Mi perfil con varios, la ficha con el botón "Compartir", la hoja de compartir con QR y enlace, y la ficha vista por quien llega desde el enlace con una novedad y un video embebido).

## Verificación

Documento y prototipo: sin build ni pruebas (no hay código). `git status` limpio salvo lo entregado.

### Capturas reales (`docs/rediseno/capturas-184/`), 390×844, abiertas y descritas

Con Chrome real vía `playwright-core` (instalado solo en el scratchpad de la sesión, nunca en `package.json` ni en el `node_modules` del repo) sirviendo el prototipo por `http.server` local. `document.fonts.check('700 20px "Bricolage Grotesque"')` → `true` antes de capturar.

- **`01-mi-perfil-un-artista.png`** — Mi perfil de Ana Reyes: bloque "Mis artistas" con una tarjeta (foto, nombre, disciplina) y dos botones, "Ver mi ficha de artista" (lleno) y un círculo de compartir; abajo, "Lo que sigues" con el resumen de siempre.
- **`02-mi-perfil-varios-artistas.png`** — Mi perfil de Marco Villa con dos tarjetas seguidas (Marco Villa, artes visuales; Trío Cantera, música), cada una con su "Ver ficha" y su botón de compartir, sin selector previo.
- **`03-ficha-boton-compartir.png`** — la ficha de Ana Reyes en modo propio: foto, nombre, disciplina y ciudad, y una fila con "Editar" (secundario) y "Compartir" (primario, en tinta).
- **`04-hoja-compartir.png`** — la hoja "Compartir tu ficha" sobre la ficha atenuada: un QR (patrón visible, no un cuadro en blanco), el enlace `somosnosotros.org/artistas/ana-reyes` con botón "Copiar", el botón "Compartir" del sistema, y una nota discreta sobre NFC/Wallet.
- **`05-ficha-desde-enlace.png`** — la misma ficha vista por alguien que no la lleva: "Seguir" en vez de "Editar", un bloque "Novedad" («Río de septiembre» — sencillo nuevo) y un bloque "Video" con un reproductor de YouTube embebido (miniatura oscura con botón de reproducir), ambos ausentes en la ficha de hoy.

`git diff origin/main..HEAD -- docs/rediseno/40-perfil-artista-enlace.md docs/rediseno/prototipos/perfil-artista-enlace.html | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'`: sin resultados (los nombres del prototipo son inventados, como pide la regla).

## Qué falta

Las cinco preguntas de la sección (e) del documento, que solo responde el founder, y su firma sobre el prototipo en su iPhone (Safari) antes de pasar a código.

## Archivos

`docs/rediseno/40-perfil-artista-enlace.md`, `docs/rediseno/prototipos/perfil-artista-enlace.html`, `docs/rediseno/capturas-184/` (5 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.
