# 153 · QR de Pincel: en la pared y en Administración (OL-118)

**Fecha:** 2026-09-22
**Rama:** `pincel-qr` (base `origin/main`)
**Pieza:** Fase 4 del plan de Pincel (bitácora [123](123-pincel-app.md) §Fase 4), reservada por el gestor como OL-118 / bitácora 153.

## Qué pedía

La ficha de la obra en Administración (`src/app/admin/obras-colectivas/[id]/page.tsx`) decía «Sin QR todavía:
entra a la pared y al mando desde aquí». El founder decidió el 2026-09-22 sumar la dependencia `qrcode`
(JavaScript puro, sin dependencias, MIT) para generar el código de verdad, en el servidor.

## Qué se hizo

1. **`npm install qrcode` y `npm install -D @types/qrcode`.** Única vez que se toca `package.json` y
   `package-lock.json` en esta pieza. `npm ci` sigue limpio (comprobado con `npm run build` tras la instalación).
2. **`src/lib/qr.ts`** (nuevo): `urlDelMando(obraId)` arma `${ORIGEN}/obra/<id>/mando` usando la misma constante
   `ORIGEN` que ya usa `src/lib/sitemap.ts` (y de ahí el resto del proyecto: correo, calendario, comunidad,
   `layout.tsx`) — ninguna base nueva inventada. `qrDelMando(obraId)` llama a `QRCode.toString(url, { type: "svg",
   margin: 1, errorCorrectionLevel: "M" })` y devuelve `{ url, svg }`. Con `import "server-only"`: nunca se
   ejecuta en el cliente. Prueba propia en `src/lib/qr.test.ts`: la URL es la absoluta esperada, el SVG sale
   completo (`<svg`, `viewBox`, módulos dibujados), es determinista para la misma obra y distinto entre dos obras.
3. **`ui/CodigoQr`** (nuevo, `src/components/ui/CodigoQr.tsx` + `.module.css`): recibe el SVG ya dibujado y lo
   enseña como `<img src="data:image/svg+xml,...">` — sin `dangerouslySetInnerHTML`, escala nítido en pantalla y
   en papel. Un componente, dos usos (pared y Administración).
4. **Pared** (`src/app/obra/[id]/pared/page.tsx` y `Pared.tsx`): con la obra abierta, el servidor pide
   `qrDelMando(obra.id)` y pasa el SVG a `Pared` como prop `qr` (`null` si está cerrada). El QR se dibuja abajo a
   la derecha, dentro de una tarjeta sobre `--vidrio` (mismo tono que otros rótulos sobre el mapa), con
   «Escanea para pintar» debajo en la letra del proyecto. Mide `clamp(220px, 17.5vw, 340px)`: 220 px de lado a
   1280×800 (17.5 % de 1280 ≈ 224, tope del `clamp` en el mínimo pedido) y 336 px a 1920×1080 — cumple el mínimo
   de 220 px y crece proporcional. `pointer-events: none`: la pared no lleva controles, el QR no es tocable.
5. **Administración** (`src/app/admin/obras-colectivas/[id]/page.tsx`): con la obra abierta, sustituye el párrafo
   «Sin QR todavía…» por una tarjeta con el QR a `min(240px, 100%)`, el enlace escrito debajo (se parte donde
   haga falta con `overflow-wrap: anywhere`, no ensancha la ficha) y un botón «Imprimir»
   (`BotonImprimir.tsx`, nuevo, `"use client"` solo para el `onClick={() => window.print()}`). Hoja de impresión
   en `obras.module.css` (`@media print`): esconde todo menos el nombre de la obra y la tarjeta del QR, sin
   bordes ni fondo, el código a 120 mm.
6. **Maquetación** (regla de MEMORIA_GESTOR tras el llamado de atención del founder del 2026-09-21): las dos
   tarjetas nuevas son una rejilla de una columna con `grid-template-columns: minmax(0, 1fr)` y `min-width: 0` en
   sí mismas y en la figura; nada de envoltorios que solo envuelven. `styles.fichaObra` en la página de
   Administración solo añade `min-width: 0` al `<main>` que ya traía `ui/Ficha.module.css`.

No se tocó `Mando.tsx` ni `mando.module.css` (OL-117, otro operador trabaja ahí ahora mismo).

## Verificación

- `npm run lint && npm run typecheck && npm test`: **869/869**, 0 errores (1 *warning* preexistente y ajeno en
  `docs/diseno/logotipo/iconos-sn.mjs`, el mismo de siempre).
- `npm run build` (`next build`) en verde.
- Respaldo 100 % local sin red, sin tocar producción ni `.env` real: servidor de Node en el scratchpad de la
  sesión que imita `/auth/v1/user`, `POST /auth/v1/token?grant_type=refresh_token`, `obras_colectivas` con dos
  filas inventadas (una abierta, una cerrada) y un Realtime mínimo (protocolo Phoenix crudo sobre WebSocket, el
  mismo patrón que usó OL-088) para que la pared reciba trazos de mentira sin tronar; escrituras a 405.
  `.env.local` con `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4181` y una llave pública inventada — borrado al
  terminar la sesión. Sesión de administrador por cookie `sb-127-auth-token`.
- Capturas PNG reales con `next build && next start` (no `next dev`) y Chrome real por `playwright-core`
  (instalado solo en el scratchpad de la sesión, nunca en el repo):
  - `pared-1280x800.png` y `pared-1920x1080.png`: título arriba a la izquierda, dos trazos de prueba pintados y
    el QR abajo a la derecha con «Escanea para pintar», sin tapar nada. Abiertas y miradas antes de entregar.
  - `admin-obra-390x844.png`: ficha de la obra con los datos, el contador de cupo, los botones «Abrir la
    pared»/«Abrir el mando», «Terminar obra», y la nueva tarjeta con el QR, el enlace y «Imprimir» — sin
    desborde horizontal a 390 px. Abierta y mirada.
  - `admin-obra-impresion.png` (`page.emulateMedia({ media: "print" })`): solo queda el nombre de la obra, el
    QR y el enlace — cabecera, datos, cupo, botones y acciones desaparecen. Abierta y mirada.
  - `admin-obra-cerrada-390x844.png`: una obra cerrada no enseña el bloque de QR (ni el de cupo ni los enlaces a
    pared/mando), solo «Reabrir obra» y «Borrar la obra». Abierta y mirada.
  - `document.fonts.check('16px "Bricolage Grotesque"')` dio `true` en cada captura.
- **El QR se lee de verdad:** decodificado con `jsqr` sobre `pared-1280x800.png` — dio exactamente
  `https://somosnosotros.org/obra/44444444-4444-4444-4444-444444444444/mando`, la URL del mando de esa obra de
  prueba.

Rutas absolutas de las capturas (scratchpad de esta sesión, no forman parte del repo):
`/private/tmp/claude-501/-Users-apple-1-somosnosotros--claude-worktrees-practical-nash-aa3e0f/6c77aa29-cf7e-4c57-bb42-420eb034c760/scratchpad/evidencia-ol118/`
(`pared-1280x800.png`, `pared-1920x1080.png`, `admin-obra-390x844.png`, `admin-obra-impresion.png`,
`admin-obra-cerrada-390x844.png`).

## Cierre

`next start` y el respaldo local, apagados. `.env.local` borrado. `CLAUDE.md` no cambió durante el `build`
(comprobado); no hay `AGENTS.md` en el repo. Commit local en `pincel-qr`, sin push: lo sube y abre el PR el
gestor. Aviso enviado a la sesión «Gestor de cambios II» con rama, commit, archivos, resultados de
lint/typecheck/test/build, la URL decodificada del QR y las rutas de las capturas.
