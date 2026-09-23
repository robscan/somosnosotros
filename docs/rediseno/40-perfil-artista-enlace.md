# 40 · El perfil del artista como su enlace único (OL-149, C1)

Propuesta y prototipo, sin código. Pieza C1 de la cola (bitácora 184).

## a) El problema, en palabras del founder

L54 (2026-09-21): «necesito una solución en donde al artista le quede claro cómo entrar a su perfil de
artista y compartir rápido, también quiero que prefiera usar mi sitio que los que se usan para poner
todos los links con su arte […] en generar una experiencia que le ayude a solventar su necesidad».

Se apoya en tres renglones más de la lista:
- L9: «si un usuario reclama artista, que aparezca en su perfil personal un acceso directo […] manteniendo
  claridad de que su perfil de usuario es uno y el de artista otro […] un usuario puede controlar varios
  perfiles».
- L12: «mejorar ficha de artistas: agregar forma rápida para compartir (QR, NFC, tarjeta tipo Apple wallet)».
- L13: «cuestionar qué campos se necesitan para que artistas consideren compartir nuestra ficha sobre otras».

Dos necesidades del artista, no una sola pantalla: **entrar rápido** a su propia ficha (hoy no hay
acceso directo desde Mi perfil) y **compartir rápido** ese enlace (hoy solo existe "Compartir" del
sistema, sin QR ni enlace visible). Y una tercera, de contenido: que la ficha muestre lo que hoy solo
muestra un «link en bio» (vídeo, fotos, novedades), para que no tenga que mandar a la gente a otro sitio.

## b) Acceso desde Mi perfil, sin confundir los dos perfiles

**Lo que ya existe.** `artistas_cuentas` (perfil_id, artista_id) ya permite que una cuenta lleve más de
un artista — es la misma tabla que usa el reclamo (`EsMiNombre.tsx`, `reclamarArtista`). El dato ya está;
falta mostrarlo. Hoy `Mi perfil` (`src/app/perfil/page.tsx` → `FichaPersona`) solo lista `artistas` como
**los que sigues** (`ArtistaSeguido`), no los que llevas. No hay ningún renglón para "tu ficha de artista".

**Propuesta.** Un bloque nuevo en Mi perfil, antes de "Lo que sigues" (jerarquía: lo tuyo primero), con
un rótulo que nombra la diferencia sin explicarla de más — UX invisible, la palabra hace el trabajo:
- **Un artista:** una tarjeta con foto, nombre y un botón «Ver mi ficha de artista» → `/artistas/[slug]`.
  No dice "perfil de artista" a secas (se confunde con "Mi perfil"); dice **ficha**, como ya la llama el
  resto del sitio (Ficha.module.css, FichaPersona, etc.).
- **Varios artistas:** la misma tarjeta se repite, una por artista, sin acordeón ni selector — región
  común (Principios UX, ley confirmada): cada tarjeta es su propio grupo, no hay que elegir antes de ver.
- Cada tarjeta lleva ya el botón de compartir (ver c), para no obligar a entrar a la ficha solo para
  compartirla — ahorra un paso, coherente con "el gesto de la persona gana".

No se toca `ArtistaSeguido` ni la sección "Lo que sigues": son cosas distintas (seguir a otros vs. llevar
el propio). Nombrar distinto evita el error que L9 pide prevenir.

## c) Compartir rápido: enlace corto, QR — y qué no da la web del iPhone

**Enlace.** Ya es corto y legible: `somosnosotros.org/artistas/<slug>` (columna `slug` en `artistas`,
ya usada por `cargarArtista` en `src/app/artistas/[id]/page.tsx`; "dirección propia, legible y que no
cambia" está firmado en `docs/DEFINICION.md` y en el grafo cultural). No hace falta acortador ni
subdominio para que el enlace sea corto — **entra ahora** con lo que ya hay.

**QR.** Ya existe el patrón en Pincel (`src/lib/qr.ts` + `src/components/ui/CodigoQr.tsx`): SVG generado
en el servidor con la librería `qrcode`, nunca en el cliente, servido como `data:` URL. Reusar tal cual
para `/artistas/<slug>` — **entra ahora**, es el mismo componente, solo cambia la URL que codifica.

**La hoja de compartir.** Un botón «Compartir» en la ficha (junto al que ya existe, `IconoCompartir`)
abre una hoja (`Hoja`, canon) con: el enlace en texto con botón «Copiar», el QR (`CodigoQr`) y, si el
navegador lo soporta, el botón nativo de compartir (`BotonCompartir`, ya existe). Tres formas, una hoja.

**NFC.** No se puede desde la web del iPhone: Safari no implementa la Web NFC API (`NDEFReader`); hoy
solo la trae Chrome en Android (fuente: MDN, *Web NFC API — Browser compatibility*,
developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API#browser_compatibility, consultado 2026-09-23: fila
`NDEFReader` en blanco para Safari/iOS). Coincide con lo ya escrito en CLAUDE.md: NFC espera a la app
nativa. **No entra** por ahora.

**Tarjeta de Apple Wallet.** Aquí hay un matiz que CLAUDE.md no distingue todavía: una "pass" de Wallet
(`.pkpass`) **sí se puede repartir desde una página web común**, sin app nativa — es una función de
Safari desde iOS 6, no de la web instalada (fuente: Apple Developer, *Wallet* / PassKit —
developer.apple.com/documentation/walletpasses — "users can add passes to Wallet... from a website").
Necesita generar el archivo `.pkpass` firmado en el servidor (certificado de Apple Developer, que ya
existe para la cuenta del founder — ver memoria "Apple Developer"). Es un dato nuevo (el `.pkpass` es un
paquete firmado, no un enlace ni un QR), así que **queda para después**: no bloquea esta pieza, pero
vale preguntarle al founder si lo quiere antes de la app nativa (pregunta 1 en (e), porque contradice la
frase de CLAUDE.md "lo que la web del iPhone no ofrece... espera a esa etapa" — el Wallet sí lo ofrece).

## d) Qué campos harían que el artista prefiera esta ficha a un «link en bio»

| Campo | Qué pide L | Riesgo / qué permite hoy | Veredicto |
|---|---|---|---|
| **Video de YouTube o Vimeo embebido** | L20 | El enlace ya se reconoce como red (`enlaces.ts`, `REDES` incluye `youtube`/`vimeo`) pero hoy solo abre en pestaña nueva. Embeber es un `<iframe>` con `src` armado a mano solo desde el id del video (nunca el HTML que pegue la persona) y solo hacia `youtube.com/embed/` o `player.vimeo.com/video/`: dominio fijo, sin `allow-same-origin` en el sandbox, sin script de terceros. El riesgo real no es XSS (el dominio es fijo) sino que un video ajeno se atribuya al artista sin que nadie lo revise. | **Entra ahora.** El dato ya se captura; falta el `<iframe>` en vez del enlace plano. Medible: URL válida de YouTube o Vimeo → aparece el reproductor en la ficha sin salir del sitio. |
| **Fotos de Instagram** | L21 | La API de Meta cambió: el Instagram Basic Display API que servía para leer el feed público de cualquier cuenta se retiró en 2024 (fuente: Meta for Developers, *Instagram Basic Display API deprecation notice*, developers.facebook.com/docs/instagram-basic-display-api). Hoy solo queda la Instagram Graph API, que exige cuenta de negocio del artista y que **cada artista** autorice la app con OAuth — no es un dato público que se pueda jalar solo. Lo único que sigue siendo público y sin login es el oEmbed de **una publicación** (`instagram.com/p/.../embed`, sin API key). | **Después** (una sola publicación destacada por oEmbed, si el artista pega el enlace) — **no** un feed automático mientras no haya cuenta de negocio y permiso por artista. Medible: pegar el enlace de una publicación pública de Instagram → se ve embebida; sin eso, no hay nada que mostrar. |
| **Novedad de obra publicada** (canción, pintura, libro) | L23, L54 | El grafo cultural (`docs/rediseno/24-grafo-cultural.md`, punto 4) ya señala que la tabla `novedades` de hoy solo guarda cambios de eventos para avisos — no sirve para esto sin un modelo nuevo (una ficha de tipo "obra", ligada al artista). No es solo UI. | **Después**, pieza propia: modelo de datos primero (encaja con "migraciones que solo añaden"), luego la ficha. Sin esto, es difícil evaluar cuánto ayuda a preferir el sitio. |
| **Blog** | L52, L54 | El founder ya lo describió como sección aparte, con varios tipos de contenido y curaduría editorial del admin — mucho más grande que esta pieza (roza "una fase a la vez" de CLAUDE.md). Solo tiene sentido si antes existe la "novedad de obra": el blog se alimentaría de esas novedades, no al revés. | **No** en esta pieza. Si el founder confirma la novedad de obra, el blog queda para más adelante, alimentado por ella. |

## e) Preguntas que solo el founder puede responder

1. La tarjeta de Apple Wallet sí es posible desde la web del iPhone (sin app nativa, ver c) — ¿la quiere antes de la app nativa, o prefiere esperar como con NFC?
2. Para el video embebido: ¿cualquier enlace de YouTube/Vimeo que pegue el artista se ve de inmediato, o pasa primero por el mismo tipo de revisión que otras publicaciones?
3. Para Instagram: ¿le sirve "pegar el enlace de una publicación destacada" (lo único posible sin cuenta de negocio), o prefiere esperar a que haya volumen de artistas con cuenta de negocio para el feed completo?
4. La "novedad de obra" — ¿nace como ficha nueva del grafo (obra: tipo, título, enlace, fecha) o basta un campo simple de texto/enlace por ahora, antes de decidir el blog?
5. El acceso "Mis artistas" en Mi perfil, cuando son varios: ¿alguno de ellos puede marcarse como el principal, o siempre se listan todos igual?
