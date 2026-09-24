# 206 · Novedades del artista con reproductor incrustado: propuesta y prototipo (OL-171)

**Fecha:** 2026-09-24 · **Rama:** `novedades-artista`, desde `origin/main` (commit `0ce93d6`) · **OL:** OL-171 · **Modelo:** Sonnet 5. Sin council, workflows ni subagentes. **Solo propuesta y prototipo: no se tocó `src/**` ni se escribió ninguna migración.**

## De dónde sale

El founder, 2026-09-24: «Vamos a incluir de una vez la posibilidad de que los artistas peguen un link de YouTube, Vimeo, SoundCloud, Mixcloud, Bandcamp, (sugiere más) y que se vea un reproductor incrustado de forma automática. Para que en perfil de artistas se pueda escuchar/ver el trabajo de artistas. Mas adelante estas publicaciones deben incluirse en blog cuando desarrollemos y desde ahora pueden lanzar notificaciones push a seguidores.» Es el punto 5 del inventario del grafo cultural (doc [24](../../../rediseno/24-grafo-cultural.md)) y la fila E10 de la cola (`docs/ops/COLA_DE_PIEZAS.md`, «novedad de obra», ya prevista en OL-149 / doc [40](../../../rediseno/40-perfil-artista-enlace.md)d como «después»).

**Lo leído:** `CLAUDE.md`; `docs/DEFINICION.md`; `docs/rediseno/40-perfil-artista-enlace.md`; el prototipo existente `docs/rediseno/prototipos/novedades-perfil-alta.html`; la bitácora [189](189-perfil-artista-app.md) (cómo quedó el video de YouTube/Vimeo: `src/lib/video.ts`, `src/components/ui/VideoEmbed.tsx`, el patrón de `src` armado y validado, nunca la URL cruda, `sandbox` mínimo); `src/lib/enlaces.ts` (las redes reconocidas hoy: instagram, facebook, tiktok, youtube, vimeo, spotify, soundcloud, bandcamp, applemusic, whatsapp, x, threads, linktree — **sin tocar este archivo**, que OL-168 amplía en paralelo con mixcloud, deezer, tidal, twitch y audiomack); `docs/rediseno/28-avisos-y-boletin.md` (qué se manda por push y qué no, y el patrón «un push por ficha y por día» de L44); `docs/rediseno/24-grafo-cultural.md` (personas fuera del grafo, sin ranking); `docs/ops/COLA_DE_PIEZAS.md` (fila E10); `docs/rediseno/23-tope-de-lecturas.md` (patrón de tope como fusible, no como ahorro); las dos últimas notas de `docs/ops/MEMORIA_GESTOR.md` (maquetación sin sobreanidación, capturas reales obligatorias); `docs/diseno/LINEA_GRAFICA.md` (violeta `#6d34c8` como color de acción vigente); y, para el modelo de datos, `supabase/migrations/20260914050000_artistas.sql` (`gestiona_artista()`, reusable tal cual) y `20260922180000_pincel_freno.sql` (patrón de tope con `ajustes_sitio`/`security definer`), solo para describir con precisión sin escribir SQL.

## Qué se entregó

### 1. Propuesta: `docs/rediseno/44-novedades-artista.md`

- **Qué es una novedad** y su relación con el video único de la ficha (OL-154): se quedan **aparte**, con las tres razones (preguntas distintas, el push tiene que ser un gesto explícito, no hay nada que migrar) y una nota de orden en la ficha (Novedades antes que Redes/Video).
- **Tabla de proveedores** (YouTube, Vimeo, SoundCloud, Mixcloud, Bandcamp, Spotify, Deezer, Apple Music, Tidal, Audiomack, Twitch, TikTok, Instagram), cada uno con: ¿incrustable solo con la URL pública?, `src` que se arma, si pide llave o cuenta, Safari iOS en PWA, si cabe en el `sandbox` de `VideoEmbed`, límites conocidos. Lo no verificable queda marcado **a comprobar**, sin inventar (no se navegó a ningún servicio externo).
- **Lista de arranque:** YouTube, Vimeo, SoundCloud, Mixcloud, Spotify, Deezer y Bandcamp (este último con una salvedad: necesita una llamada del servidor al oEmbed público de Bandcamp para resolver el id, porque no está en la URL). **TikTok no entra**: su embebido oficial exige el script `embed.js`, que rompe la regla de «sin scripts de terceros, solo el iframe».
- **Seguridad:** URL cruda nunca en el iframe, lista blanca de dominios para el `src` final, `sandbox`/`allow` mínimos por proveedor (no uno solo para todos), qué pasa con un enlace roto (lo dice el propio proveedor, sin cron de comprobación) y la regla de cero scripts de terceros.
- **Modelo de datos** (descripción, sin SQL) de `novedades_artista`: los campos pedidos, con la salvedad de que el `src` casi nunca se guarda (se calcula igual que `videoEmbedDe` hoy) salvo para Bandcamp; RLS reusando `gestiona_artista()` tal cual existe; tope propuesto de **5 novedades por artista y por día** (fusible, no ahorro, mismo espíritu que el doc 23) y **3 novedades visibles antes de «Ver más»**. La migración reservada `20260925100000_novedades_artista.sql` se nombra pero no se escribe.
- **Aviso push:** sigue la regla ya firmada del doc 28 (solo push y dentro de la app, nunca correo por cada novedad), agrupado a un push por ficha y por día, con el texto propuesto — título «{artista} publicó una novedad», cuerpo el título de la novedad o «Nuevo en {proveedor}» si no hay título — que leído junto en la pantalla de bloqueo dice exactamente la frase que pidió el founder.
- **Blog después (E10):** qué guarda hoy la tabla que el blog podría reusar sin migrar nada (tipo, fecha, autor, título, texto) y qué no se construye ahora (URL propia, comentarios, categorías, editor enriquecido, RSS).
- **Tres fases** con su prueba cada una (modelo + alta con un proveedor; reproductor con la lista de arranque completa; push agrupado) y **seis decisiones cortas** para la firma del founder.

### 2. Prototipo: `docs/rediseno/prototipos/novedades-perfil-alta.html`

Se **añadieron pantallas conmutables nuevas** al prototipo ya firmado (v4), sin tocar ninguna de las seis pantallas existentes (Agenda, Novedades, Mi perfil, Persona ajena, Ajustes, Registrar lugar): mismo selector «Pantalla» de la utilería, con tres opciones nuevas al final (`OL-171 · Ficha del artista`, `OL-171 · Publicar novedad`, `OL-171 · Aviso push`) y dos controles de estado nuevos (`NA` para la ficha, `PN` para publicar). El violeta `#6d34c8` de la línea gráfica vigente (OL-146) se aplica **solo** a estas tres pantallas nuevas, con una variable CSS reescrita en un ámbito propio (`.pantalla.violeta`), sin cambiar el teal `#0f6b7c` que usan las pantallas ya firmadas.

- Un **marco de reproductor** dibujado (nunca carga nada externo): 16:9 con botón de play grande para video (YouTube, Vimeo), franja horizontal con onda y botón de play chico para audio (SoundCloud, Mixcloud, Bandcamp), siempre con el nombre del proveedor visible.
- La **ficha del artista** con las novedades incrustadas, más nueva arriba, con un enlace «Publicar» que lleva a la pantalla de publicar.
- La pantalla **Publicar novedad**: campo para pegar el enlace, línea de reconocido/no-reconocido con la lista de proveedores que sí funcionan, vista previa del reproductor, título y texto opcionales con contador (mismo umbral que `ui/ContadorCaracteres`: aparece solo al 75% o más del tope), el aviso de que se avisará a los seguidores y el botón Publicar (deshabilitado sin un enlace reconocido).
- El **aviso push** como pantalla de bloqueo dibujada (reloj grande, fecha, el banner de la notificación) — nunca una captura del sistema operativo real.

**Un defecto de fondo del prototipo, encontrado y corregido en el alcance de esta pieza:** `.nav` (la barra inferior) fija su `display: grid` sin condición; el atributo `hidden` que usa `render()` para ocultarla en las pantallas interiores no la oculta de verdad (una regla de autor con `display` explícito gana siempre a la regla `[hidden]{display:none}` del navegador, sin importar la especificidad). Es decir, la barra vive siempre ahí, vacía y blanca, invisible contra los fondos claros de las demás pantallas — por eso nadie lo había notado. Con el fondo oscuro del aviso push se veía como una franja blanca de 94 px al fondo del teléfono. Se corrigió **solo para la pantalla nueva** dándole a `.bloqueo` un `z-index` por encima de `.nav`, sin tocar `.nav` ni el mecanismo `hidden` que usan las demás pantallas (fuera del alcance de esta pieza; si se quiere arreglar de raíz, es una pieza aparte).

### 3. Capturas (`docs/rediseno/capturas-206/`), 390×844, abiertas y miradas antes de entregar

Con Chromium de `/opt/pw-browsers/chromium-1194` (`playwright-core` instalado con `npm i --no-save` en el scratchpad de la sesión, nunca en el repo). Captura del elemento `.telefono` (390×844 exactos, sin `fullPage`, evitando el artefacto ya descrito en la bitácora 200); comprobado sin scroll horizontal (`scrollWidth === clientWidth === 390`) en las seis pantallas y estados.

**Las primeras seis capturas de esta bitácora salieron con Arial, no con Bricolage Grotesque, aunque `document.fonts.ready` y `document.fonts.check(...)` daban `true` en los dos pesos.** El gestor lo midió y avisó: el proxy de este entorno rechaza el certificado al pedir el CSS de Google Fonts (`net::ERR_CERT_AUTHORITY_INVALID`), así que ningún `@font-face` de Bricolage Grotesque llega a registrarse — y `fonts.check()` da `true` sencillamente porque no hay nada pendiente que cargar, no porque la letra esté ahí. Se corrigió con la vía limpia que dejó preparada el gestor (sin `--ignore-certificate-errors` ni tocar el proxy): `page.addStyleTag` con una hoja que declara `@font-face` apuntando a un `.woff2` local de Bricolage Grotesque (variable, tomado del build de la app), `document.fonts.load(...)` y `page.waitForFunction` esperando a que `[...document.fonts]` tenga la familia con `status === "loaded"` — la fuente local, nunca la del `<link>` fallido. Las seis se repitieron así, y esta vez `[...document.fonts]` solo trae una entrada (`Bricolage Grotesque:200 800:loaded`, la local; el `@font-face` de Google Fonts nunca llegó a registrarse). Las seis se abrieron con `Read` y se miraron de cerca (la «g» de una sola planta en "Grabamos"/"página"/"hoy", las formas condensadas del reloj «9:41» y de "SMSNSTRS") para confirmar a ojo que es Bricolage, no Arial. El prototipo del repo sigue con su `<link>` de Google Fonts tal cual (nada del HTML cambió); la hoja con la fuente local vive solo en el scratchpad de la sesión, nunca en el repo.

- **`01-ficha-con-novedades.png`:** la ficha de Ana Reyes con tres novedades: un video de YouTube sin título («Hoy»), un audio de SoundCloud con título y texto («Nuevo sencillo: Luces de octubre», hace 3 días) y, más abajo (fuera del recorte sin desplazar, como cualquier ficha real), un audio de Bandcamp.
- **`02-ficha-novedad-al-tope.png`:** la misma ficha con una novedad de Bandcamp con el título en su tope exacto de 60 letras («Nuestro nuevo EP: lo grabamos en vivo, aquí, en el patio hoy») y el texto en su tope exacto de 280 (contados con Python antes de escribirlos, no a ojo).
- **`03-publicar-enlace-reconocido.png`:** la pantalla Publicar con un enlace de Mixcloud pegado, la línea verde «Reconocido: Mixcloud» y la vista previa del reproductor debajo.
- **`04-publicar-enlace-no-reconocido.png`:** el mismo formulario con un enlace de un sitio cualquiera, la línea roja «No se reconoce este enlace» y la lista de los proveedores que sí funcionan; el botón Publicar queda deshabilitado.
- **`05-publicar-vista-previa-lista.png`:** el mismo enlace reconocido, con título y texto llenos hasta su tope (60/280, contador visible en ambos) y el botón Publicar habilitado.
- **`06-aviso-push.png`:** la pantalla de bloqueo dibujada con el banner de la notificación: «Somos Nosotros · ahora», «Ana Reyes publicó una novedad» y el título de la novedad debajo — leído junto, dice exactamente la frase que pidió el founder.

## Decisiones que el founder debe firmar

Las seis están detalladas, con su razón, en la §8 del documento 44:

1. El video de la ficha (OL-154) y las novedades se quedan aparte.
2. La lista de arranque de proveedores: YouTube, Vimeo, SoundCloud, Mixcloud, Spotify, Deezer y Bandcamp.
3. Los números del tope: 5 novedades por artista y por día, 3 visibles antes de «Ver más».
4. Quién puede borrar una novedad propia (no solo ocultarla el admin).
5. El texto del push (título y cuerpo, con y sin título).
6. Si Bandcamp entra en la fase 2 con el resto o se deja aparte por necesitar la llamada al oEmbed.

## Verificación

No aplica `npm run lint && npm run typecheck && npm test`: no se tocó ningún archivo de `src/**` ni de `supabase/migrations/**`, como pide el encargo (solo propuesta y prototipo). La comprobación de esta pieza fue: las seis capturas reales miradas con `Read` antes de entregar (nada fuera de pantalla, sin scroll horizontal, fuente cargada) y la sintaxis del script del prototipo verificada con `node -e "new Function(...)"` sobre el `<script>` extraído.

## Correos en el diff

`origin/main` avanzó mientras se trabajaba esta pieza (otra sesión mergeó OL-167), así que `git diff origin/main` mezcla cambios ajenos; el rastreo se hizo sobre lo propio: `git diff --cached` (los cuatro archivos/carpeta nuevos) y `git diff` de los dos archivos modificados (`OPEN_LOOPS.md`, el prototipo), con `grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'`. Ninguna dirección real: solo `noreply@anthropic.com` (la firma exigida de este commit) y un falso positivo ya conocido en el repo, `analytics@2.0.1` (versión de un paquete de npm, no un correo — mismo caso que documentan las bitácoras 191 y 196).

## Límites

`origin/main` avanzó después de crear esta rama (al menos OL-167 se mergeó mientras se trabajaba, visto al comprobar correos): la rama sigue basada en el commit `0ce93d6`, sin traer `main`, porque el encargo pide solo `git push -u origin novedades-artista`, sin PR (lo abre el gestor, que puede traer `main` antes si hace falta).

## Archivos

`docs/rediseno/44-novedades-artista.md` (nuevo), `docs/rediseno/prototipos/novedades-perfil-alta.html`, `docs/rediseno/capturas-206/` (6 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.

## Cierre

Commit local en `novedades-artista` con `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; `git push -u origin novedades-artista` al terminar, sin PR (lo abre el gestor).
