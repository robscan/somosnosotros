# 189 · Perfil del artista: Mis artistas, compartir y video (OL-154, código de OL-149)

**Fecha:** 2026-09-23 · **Rama:** `perfil-artista-app`, desde `origin/main` (commit `cfe851e`) · **OL:** OL-154 (código de la propuesta OL-149, decidida por el founder el 2026-09-23) · **Modelo:** Sonnet 5. Sin council, workflows ni subagentes (costo).

## De dónde sale

El founder decidió, sobre la propuesta y el prototipo firmado de la bitácora 184 (doc `docs/rediseno/40-perfil-artista-enlace.md`, prototipo `docs/rediseno/prototipos/perfil-artista-enlace.html`): «Mis artistas» en Mi perfil, compartir con enlace y QR, videos de YouTube o Vimeo embebidos sin revisión previa, sin Instagram, sin «novedad de obra» (línea «Decidido» del 2026-09-23 en `docs/ops/OPEN_LOOPS.md`). Esta pieza pasa esa decisión a código.

Lo leído: `CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-154 y la línea «Decidido» del 2026-09-23 sobre el perfil del artista en `docs/ops/OPEN_LOOPS.md`, `docs/rediseno/40-perfil-artista-enlace.md`, el prototipo firmado, `docs/PRINCIPIOS_UX.md`, y el código de partida: `src/app/perfil/`, `src/app/artistas/[id]/`, `artistas_cuentas` (migración `20260914050000_artistas.sql`), `src/components/ui/CodigoQr.tsx` y `src/lib/qr.ts` (ya usados en Pincel), `src/components/ui/Hoja.tsx`, `src/lib/enlaces.ts` (redes reconocidas) y `src/components/BotonCompartir.tsx` (cómo se comparte hoy un evento o una ficha, con `navigator.share`).

## Qué se hizo

### 1. «Mis artistas» en Mi perfil

- `src/app/artistas/consultas.ts` ya tenía `cargarMisArtistas(perfilId)` (los artistas ligados por `artistas_cuentas`, usada hoy en el alta de evento): se reusó tal cual, sin tocarla.
- `src/app/perfil/MisArtistas.tsx` (nuevo): una tarjeta por artista, todas iguales, sin «principal» (pregunta 5 del doc 40 queda sin decidir: se listan todos igual mientras tanto). Dice «Ver mi ficha de artista» con uno solo, «Ver ficha» con varios (`etiquetaVerMiFicha`, en `src/lib/artistas.ts`); cada tarjeta lleva ya su botón de compartir, sin tener que entrar primero. Componente síncrono: el QR de cada artista se calcula antes, en el servidor (`qrDeUrl`), para poder pasarlo como slot a `FichaPersona` sin pelear con componentes async como prop.
- `src/components/FichaPersona.tsx`: nueva prop opcional `misArtistas?: ReactNode`, pintada justo antes de la actividad («lo tuyo primero», doc 40b). Solo se usa en Mi perfil (`mia`); la ficha ajena (`src/app/personas/[id]/page.tsx`) no la pasa y no cambia.
- `src/app/perfil/page.tsx`: pide `cargarMisArtistas` junto con `cargarPersona`, arma el QR de cada uno y solo pasa el bloque si `conArtistasLigados` (nuevo en `src/lib/artistas.ts`) dice que hay al menos uno — sin artistas ligados, el renglón no aparece en absoluto.

### 2. Compartir en la ficha del artista

- `src/lib/qr.ts`: `qrDeUrl(url)` (nuevo), el mismo patrón que `qrDelMando` de Pincel (SVG en el servidor, `qrcode`, nunca en el cliente) pero para cualquier URL. `qrDelMando` ahora lo llama, sin cambiar su comportamiento.
- `src/components/ui/CompartirFicha.tsx` (nuevo): el botón que hoy dispara `navigator.share` directo ahora abre una `Hoja` (canon) con el enlace en un campo con «Copiar» (`enlaceVisible`, nuevo en `src/lib/enlaces.ts`, le quita el `https://`), el QR (`CodigoQr`, reusado) y el compartir nativo del teléfono cuando existe (reusa `BotonCompartir`, que ya cae a WhatsApp si no hay `navigator.share`). Visible para cualquiera que entre a la ficha, no solo para su dueño.
- `src/app/artistas/[id]/page.tsx`: el botón «Compartir» de la fila de acciones ahora es `CompartirFicha` en vez de `BotonCompartir` directo; el QR se calcula junto con `decididasDe` (`Promise.all`). El botón «Compartir» del cartel «Publicado» (justo después de crear la ficha) no se tocó: es un flujo distinto, fuera del alcance de esta pieza.

### 3. Video embebido

- `src/lib/video.ts` (nuevo): `videoEmbedDe(enlace)` — a partir de un enlace ya reconocido como red `youtube` o `vimeo` (nunca de la URL cruda que pegó la persona), extrae y valida el id por regex (`[A-Za-z0-9_-]{11}` para YouTube, `\d{6,12}` para Vimeo) y arma el `src` siempre hacia `youtube-nocookie.com` o `player.vimeo.com`, nunca hacia el dominio original. Reconoce `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/` (YouTube) y `vimeo.com/<id>`, `player.vimeo.com/video/<id>`, `vimeo.com/channels/.../<id>` (Vimeo). Lo que no calza (canal, perfil, id no numérico, esquema no `https:`) devuelve `null`.
- `src/components/ui/VideoEmbed.tsx` (nuevo) + `VideoEmbed.module.css`: el `<iframe>` con `sandbox="allow-scripts allow-same-origin allow-presentation"` y `allow="encrypted-media; picture-in-picture"` (los mínimos para que el reproductor funcione), `loading="lazy"` y `referrerPolicy="strict-origin-when-cross-origin"`.
- `src/app/artistas/[id]/page.tsx`: las redes se separan en `videos` (las que sí embeben) y `redesConEnlace` (el resto, incluido un enlace de YouTube/Vimeo con forma irreconocible, que se queda como botón de enlace, igual que hoy). Un bloque «Video» nuevo, con el mismo patrón de sección que «Se presenta en» (`FichaLista.module.css`), aparece después de la descripción cuando hay al menos un video reconocido.

### 4. Maquetación

Grid con `grid-template-areas` en `MisArtistas.module.css` (como ya usa `Ficha.module.css`), sin envoltorios sin función; CSS en módulos nuevos (`CompartirFicha.module.css`, `VideoEmbed.module.css`, `MisArtistas.module.css`), todas las medidas con las variables ya definidas en `globals.css` (`--espacio-*`, `--letra-*`, `--toque-min`, `--radio`, `--borde`, `--primario*`).

## Pruebas

- `src/lib/video.test.ts` (nuevo, **6 pruebas**): YouTube (watch/youtu.be/shorts/embed, con parámetros de sobra), Vimeo (`vimeo.com/<id>`, `player.vimeo.com/video/<id>`, con canal), redes que no son video (`null` sin mirar la URL), formas irreconocibles (canal, `/watch` sin `v=`, `@usuario`, id de Vimeo no numérico), **intentos de inyección** (dominio ajeno con «youtube.com» en la ruta o como subdominio falso, id con `<script>` o HTML codificado, esquema `javascript:`, path traversal, id de Vimeo con letras coladas, URL malformada) y que el `src` armado nunca contiene la URL original ni parámetros de sobra.
- `src/lib/artistas.test.ts`: **3 pruebas** nuevas para `conArtistasLigados` (cero → `null`, uno o varios → la misma lista) y `etiquetaVerMiFicha` (1 → «Ver mi ficha de artista»; 2 y 5 → «Ver ficha»).
- `src/lib/enlaces.test.ts`: **2 pruebas** nuevas para `enlaceVisible` (con `http://`, `https://`, mayúsculas, y sin esquema).
- Sin pruebas de render de componentes: el proyecto no tiene infraestructura de testing-library/jsdom (`vitest.config.mts` usa `environment: "node"`, todos los `.test.ts` prueban lógica pura); la lógica de decisión de cada componente nuevo (cuándo se ve el bloque, qué etiqueta lleva el botón, cómo se ve el enlace) se extrajo a funciones puras y se probó ahí. La verificación visual de los tres componentes (`MisArtistas`, `CompartirFicha`, `VideoEmbed`) va en las capturas reales de abajo.

## Verificación

El árbol no tenía `node_modules`: `npm ci` primero (`package.json` y el lock quedaron intactos, sin cambios en ninguno de los dos). `npm run lint` (1 warning preexistente y ajeno, `docs/diseno/logotipo/iconos-sn.mjs`), `npm run typecheck`, `npm test` (**1067 pruebas, todas verdes**, incluidas las 11 nuevas) y `npm run build`: verdes.

### Capturas reales (`docs/rediseno/capturas-189/`), 390×844, abiertas y descritas

Con `next build && next start` (puerto 4189) y Chrome real (`playwright-core` instalado solo en el scratchpad de la sesión, nunca en el repo; `package.json` y el lock nunca tocados), `document.fonts.check('700 20px "Bricolage Grotesque"')` = `true` en las cuatro. Sin Supabase: un arnés temporal (`src/app/arnes189-temporal/`, servido solo mientras corrían las capturas y borrado antes de comitear — no aparece en `git status`) alimentó `FichaPersona`+`MisArtistas` y una réplica mínima de la ficha de artista (mismas clases de `Ficha.module.css` y los componentes reales `CompartirFicha`/`VideoEmbed`) con datos inventados (Ana Reyes y Trío Cantera), sin tocar producción ni copiar `.env` de otra carpeta.

- **`01-mi-perfil-varios-artistas.png`:** Mi perfil de Ana Reyes, con el bloque «MIS ARTISTAS» antes de «Voy a / Sigo»: dos tarjetas iguales (Ana Reyes, Música · Solista; Trío Cantera, Música · Grupo), cada una con su botón «Ver ficha» (violeta, lleno) y su botón circular de compartir. Sin ninguna marcada como «principal».
- **`02-ficha-boton-compartir.png`:** la ficha de Ana Reyes con la fila de acciones «Compartir» (icono + texto) e «Instagram»; debajo, la sección «Video» con el reproductor embebido (logo de YouTube visible, dominio `youtube-nocookie.com`).
- **`03-hoja-compartir-qr.png`:** tras tocar «Compartir», la hoja emerge desde abajo con «Cualquiera con el enlace ve esta ficha.», el QR, el campo `somosnosotros.org/artistas/ana-reyes` con «Copiar» y el botón violeta «Compartir» — igual al estado E3 del prototipo firmado.
- **`04-ficha-video-embebido.png`:** la misma ficha con el botón «Compartir» con foco visible (se tomó justo tras cerrar la hoja con Escape) y el bloque «Video» completo a la vista.

Comprobado con `curl` sobre el arnés en marcha: el `<iframe>` real trae `src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"`, `sandbox="allow-scripts allow-same-origin allow-presentation"` y `allow="encrypted-media; picture-in-picture"` — exactamente lo que arma `videoEmbedDe`, nunca la URL que se pegó. El reproductor mostró «Este video no está disponible»: el entorno de pruebas no tiene salida a Internet hacia YouTube; el mecanismo de embebido (dominio, id, sandbox) se verificó igual, por el HTML servido y por las 6 pruebas de `video.test.ts`.

## Límites

- El arnés (`src/app/arnes189-temporal/`) fue solo para las capturas: no hay respaldo local de datos (PGlite/Supabase) documentado en el repo para esta pieza, así que en vez de montarlo se alimentaron `FichaPersona`, `MisArtistas`, `CompartirFicha` y `VideoEmbed` directamente con datos inventados, sin pasar por Supabase (mismo patrón que la bitácora 181). Quedó borrado antes de comitear.
- No se pudo reproducir un video real en las capturas (sin Internet en el entorno de pruebas); el `<iframe>` servido se comprobó por HTML y por las pruebas de extracción de id.
- Pregunta 5 del doc 40 sigue sin decidir (¿algún artista puede marcarse como principal?): por ahora se listan todos igual, como pide la línea «Decidido».
- Apple Wallet (posible desde la web del iPhone, doc 40c) y NFC (no en Safari) quedan fuera, como ya estaba decidido: Wallet es OL-155/190, aparte.
- No hay segunda prueba del founder en su iPhone (Safari) todavía: pendiente, como en toda pieza de esta fase.
- La rama se abrió desde `origin/main` en el commit `cfe851e`; `main` avanzó después (se vio al comprobar correos con `git diff origin/main..HEAD`, que ya no estaba vacío) — falta traer `main` a la rama antes de cualquier PR, como pide el punto 6 de `GESTION_DE_CAMBIOS.md`. Sin push ni PR en esta entrega.

## Archivos

`src/lib/video.ts` (nuevo), `src/lib/video.test.ts` (nuevo), `src/components/ui/VideoEmbed.tsx` (nuevo), `src/components/ui/VideoEmbed.module.css` (nuevo), `src/components/ui/CompartirFicha.tsx` (nuevo), `src/components/ui/CompartirFicha.module.css` (nuevo), `src/app/perfil/MisArtistas.tsx` (nuevo), `src/app/perfil/MisArtistas.module.css` (nuevo), `src/lib/qr.ts`, `src/lib/artistas.ts`, `src/lib/artistas.test.ts`, `src/lib/enlaces.ts`, `src/lib/enlaces.test.ts`, `src/components/FichaPersona.tsx`, `src/app/perfil/page.tsx`, `src/app/artistas/[id]/page.tsx`, `docs/rediseno/capturas-189/` (4 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.
