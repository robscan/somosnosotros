# 216 · Novedades del artista: Vimeo, SoundCloud, Bandcamp y Mixcloud (OL-181)

**Fecha:** 2026-09-24 · **Rama:** `novedades-proveedores`, desde `origin/main`. Código de OL-171 (doc
[44](../../../rediseno/44-novedades-artista.md), propuesta y prototipo, bitácora
[206](../../206-novedades-artista.md)); sigue a la fase 1 (OL-175, bitácora
[210](../../210-novedades-artista-fase1.md)).

## Por qué

Pedido del founder (2026-09-24, palabras suyas): «los enlaces de artistas solo aceptan youtube, necesito que
funcione con bandcamp y soundcloud, además de vimeo». Esta pieza es la fase 2 del doc 44, **acotada** a Vimeo,
SoundCloud, Bandcamp y Mixcloud (Mixcloud entra porque el founder lo nombró en el pedido original del doc 44 y es
el mismo mecanismo que SoundCloud, por regex). Spotify, Deezer y el resto del doc 44 (Apple Music, Tidal,
Audiomack, Twitch, Instagram) **no entran** en esta pieza. Sin prototipo: no es pantalla nueva, es el reproductor
dentro de la sección «Novedades» que ya existe.

## 1. `src/lib/novedadesArtista.ts`: la lista blanca pasa a cinco proveedores

`PROVEEDORES_NOVEDAD_ARTISTA` pasa de `["youtube"]` a `["youtube", "vimeo", "soundcloud", "bandcamp", "mixcloud"]`,
con su etiqueta (`ETIQUETA_PROVEEDOR_NOVEDAD_ARTISTA`). `reconocerNovedadEnlace` sigue partiendo de `reconocerEnlace`
(`lib/enlaces.ts`, sin tocarlo: ya reconoce las cinco redes) y valida la forma de cada URL:

- **YouTube y Vimeo:** igual que hoy, con `videoEmbedDe` (`lib/video.ts`, OL-154, sin tocarlo).
- **SoundCloud:** `soundcloud.com/<usuario>/<pista>` o `/<usuario>/sets/<lista>`.
- **Mixcloud:** `mixcloud.com/<usuario>/<show>/`.
- **Bandcamp:** `<sub>.bandcamp.com/album/<slug>` o `/track/<slug>`, con un subdominio de verdad (ni
  `bandcamp.com` pelón ni `www.bandcamp.com`, que no son la página de un artista).

Las tres regex nuevas (SoundCloud, Mixcloud, Bandcamp) viven en `lib/incrustado.ts` (ver §2) y
`novedadesArtista.ts` las reusa (`rutaSoundcloud`, `rutaMixcloud`, `formaBandcampValida`) — la misma regla que
reconoce y la que arma el `src` es una sola, sin duplicarla. El mensaje de error del campo pasa a «Solo enlaces de
YouTube, Vimeo, SoundCloud, Bandcamp o Mixcloud.». `NovedadArtista` gana `embed_id: string | null`.

## 2. Nuevo `src/lib/incrustado.ts`: el reproductor, siguiendo el doc 44 §3 al pie de la letra

`incrustadoDeNovedad({ proveedor, url, embed_id })` devuelve `{ src, sandbox, allow, alto } | null`. El `src` se
arma **siempre** desde un identificador extraído y validado por regex, nunca desde la URL cruda:

- **YouTube/Vimeo:** reusa `videoEmbedDe`; `sandbox`/`allow` como hoy en `ui/VideoEmbed`; alto `"16:9"`.
- **SoundCloud:** valida la ruta y reconstruye `https://soundcloud.com<ruta>` (nunca el texto tal cual lo pegó la
  persona, ni su query string) antes de codificarla como parámetro:
  `https://w.soundcloud.com/player/?url=<URL codificada>&color=%236d34c8&auto_play=false&hide_related=true&show_comments=false&show_user=true&visual=false`,
  alto fijo **166**.
- **Mixcloud:** `https://www.mixcloud.com/widget/iframe/?feed=<ruta codificada>&hide_cover=1&light=1`, alto fijo
  **120**.
- **Bandcamp:** `https://bandcamp.com/EmbeddedPlayer/<embed_id>/size=large/bgcol=ffffff/linkcol=6d34c8/tracklist=false/artwork=small/transparent=true/`,
  alto fijo **120**; sin `embed_id` (o mal formado), devuelve `null` — no es un error, todavía no se conoce el id.

`sandbox`/`allow` mínimos por proveedor, no uno solo para todos: SoundCloud, Mixcloud y Bandcamp usan
`sandbox="allow-scripts allow-same-origin"` (su reproductor corre JS propio dentro de su origen, no toca esta
página), sin `allow-presentation` ni `picture-in-picture`. Lista blanca de dominios del `src` final:
`youtube-nocookie.com`, `player.vimeo.com`, `w.soundcloud.com`, `www.mixcloud.com`, `bandcamp.com` — cualquier
otro dominio, aunque el proveedor diga que es suyo, no se sirve (`dominioPermitido`, comprobado sobre el `src` ya
armado, no solo confiado a la regex de entrada).

**Pruebas de inyección** (`incrustado.test.ts`, mismo estilo que `video.test.ts`): una URL con `"`, `<script>`,
`javascript:`, un dominio ajeno con el nombre del proveedor solo en la ruta o como subdominio falso, o un
`embed_id` con basura — ninguna llega al `src`. 16 pruebas.

## 3. Bandcamp: el paso extra al publicar (doc 44 §2)

El id numérico de Bandcamp no está en la URL pública. `embedIdDesdeOembedBandcamp(json: unknown): string | null`
(`lib/incrustado.ts`, pura) lee solo el campo `html` del JSON del oEmbed y extrae por regex
`EmbeddedPlayer/(album|track)=(\d+)` — nunca se guarda ni se sirve el HTML que manda Bandcamp, solo
`"album=123"`/`"track=123"`. Probada contra el ejemplo fijo de una respuesta real que trae el encargo (con
`linkcol` distinto, título, autor… todo eso se ignora) más variantes sin `html`, con `html` sin
`EmbeddedPlayer`, y con un JSON que no es objeto.

`publicarNovedadArtista` (`src/app/artistas/[id]/novedades/acciones.ts`): cuando `datos.proveedor === "bandcamp"`,
antes de insertar, consulta `https://bandcamp.com/oembed?url=<URL ya reconocida por reconocerEnlace, codificada>&format=json`
con `fetch`, `AbortController` a 6 s y `redirect: "error"` — **solo** cuando el hostname de esa URL ya normalizada
termina en `.bandcamp.com` (nunca el texto crudo, nunca otro dominio: cierra el hueco de SSRF antes de la
llamada). Si el oEmbed falla, responde con error HTTP, o no trae un id reconocible: error llano bajo el campo
«No pude leer ese enlace de Bandcamp. Revisa que sea la página de un álbum o una pista.», y no se guarda nada.
Con éxito, se guarda `embed_id` junto con el resto de la fila.

**En este entorno la red a bandcamp.com está cerrada** (confirmado al intentarlo): esta pieza se construyó y se
probó contra el ejemplo fijo del oEmbed, no contra una llamada real. **La llamada real la prueba el founder en
producción.**

## 4. Migración `supabase/migrations/20260925130000_novedades_proveedores.sql` (sin aplicar)

Solo dos cambios, nombre reservado por el gestor:

1. `novedades_artista_proveedor_check` pasa de `in ('youtube')` a `in ('youtube', 'vimeo', 'soundcloud',
   'bandcamp', 'mixcloud')`.
2. Columna nueva `embed_id text` con `check (embed_id is null or embed_id ~ '^(album|track)=[0-9]+$')`.

Comentarios de columna actualizados. **No se aplica en esta pieza**: la aplica el founder con `supabase db push`.

**Prueba en banco real** (Postgres 16 local, mismo camino que usa la CI — `npm run test:db`, ver bitácora 210 y
214 para el arnés): `supabase/tests/pg/novedades-proveedores.test.mjs` (nuevo, se suma a
`novedades-artista.test.mjs` de la fase 1, sin tocarlo): los cinco proveedores nuevos de esta pieza entran; un
intento con `proveedor = 'spotify'` se rechaza con `23514` (fuera de la lista blanca de esta pieza); un
`embed_id` mal formado (`"no-es-un-id"`, `"album=abc"`) se rechaza con `23514`; `embed_id = "album=12"` (un id
corto pero con la forma correcta) se acepta; un proveedor que no es Bandcamp guarda `embed_id` `null`.

```
$ TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres npm run test:db
ok 63 migraciones aplicadas en sn_test_…
✓ datos sembrados
Outbox: contratos SQL, paginacion, cuota y leases probados sin proveedores
Security Advisor: matriz de 51 firmas y contratos negativos/positivos (1212 ms)
ok 911 pruebas: 0 fallaron
```

(911 = lo que ya traía el banco —incluida `novedades-artista.test.mjs` de la fase 1, sin tocar— más las 31 de
`novedades-proveedores.test.mjs`.)

## 5. Reproductor en la ficha

Nuevo `src/components/ui/Incrustado.tsx` (+ `.module.css`): recibe el resultado de `incrustadoDeNovedad` y pinta
el `<iframe>` con `title` (`"Video de <artista> en <Proveedor>"` o `"Audio de…"`, según `alto === "16:9"`),
`loading="lazy"`, `referrerPolicy="strict-origin-when-cross-origin"`, y el `sandbox`/`allow`/alto que le dan. Los
de 16:9 comparten el mismo marco (`.marco16x9`) que `ui/VideoEmbed` (fondo oscuro solo visible mientras carga);
los de audio, un marco de alto fijo (`.marcoFijo`, fondo claro) — **`ui/VideoEmbed.tsx` no se toca** (OL-154, lo
sigue usando «Video» de «Redes»).

`src/app/artistas/[id]/SeccionNovedades.tsx`: `NovedadParaFicha` cambia `video: VideoEmbedType | null` por
`proveedor: ProveedorNovedadArtista` + `incrustado: IncrustadoType | null`; pinta `<Incrustado>` en vez de
`<VideoEmbed>`. `src/app/artistas/[id]/page.tsx`: `cargarNovedadesArtista` ahora también pide `embed_id` y arma
el reproductor con `incrustadoDeNovedad` en vez de `videoEmbedDe` (que sigue usándose, sin tocar, para la sección
«Video» de Redes, más abajo en el mismo archivo).

## 6. Formulario

`FormularioNovedad.tsx`: la ayuda bajo el campo (con el campo vacío) dice «Funciona con enlaces de YouTube, Vimeo,
SoundCloud, Bandcamp o Mixcloud.»; el aviso de "no reconocido" (con algo escrito que no calza) dice lo mismo; el
banner de confirmación usa la etiqueta real del proveedor reconocido («Reconocido: SoundCloud.», etc.), no un
texto fijo de "YouTube". La vista previa ahora usa `incrustadoDeNovedad` (mismo componente `Incrustado` que la
ficha): para YouTube, Vimeo, SoundCloud y Mixcloud se ve al momento (no necesitan resolver nada del lado del
servidor); **para Bandcamp no hay vista previa todavía** — su `embed_id` solo existe después de publicar, con el
oEmbed — el banner «Reconocido: Bandcamp.» ya confirma que el enlace tiene la forma correcta. Sin más cambios de
pantalla.

## Pruebas unitarias

- `src/lib/incrustado.test.ts` (nuevo): 16 pruebas — `incrustadoDeNovedad` por proveedor (`src`, `sandbox`,
  `allow`, alto exactos), casos irreconocibles, inyección, y `embedIdDesdeOembedBandcamp` contra el ejemplo fijo
  del encargo (álbum, pista, sin `html`, `html` sin `EmbeddedPlayer`, JSON que no es objeto).
- `src/lib/novedadesArtista.test.ts`: casos nuevos por proveedor (reconoce SoundCloud/Mixcloud/Bandcamp con sus
  formas válidas, rechaza las inválidas —solo perfil sin pista, solo usuario sin show, `www.bandcamp.com`,
  `bandcamp.com` pelón—, Spotify/Deezer siguen fuera), mensaje de error actualizado.
- `src/app/artistas/[id]/novedades/acciones.test.ts`: Vimeo/SoundCloud/Mixcloud insertan directo sin llamar a
  `fetch` (solo Bandcamp lo necesita); Bandcamp con `fetch` simulado (`vi.stubGlobal("fetch", …)`) devolviendo el
  ejemplo fijo del oEmbed — éxito con álbum y con pista, y los tres casos de fallo (sin id reconocible, error
  HTTP, `fetch` rechazada) dando el error bajo el campo sin insertar; se comprueba que la URL y las opciones que
  recibe `fetch` son las esperadas (`redirect: "error"`, `AbortSignal`) y que la fila insertada nunca contiene el
  HTML del oEmbed.

## Verificación

```
npm run lint && npm run typecheck && npm test && npm run build
```

Verdes: lint sin errores (1 warning preexistente y ajeno, `docs/diseno/logotipo/iconos-sn.mjs`); typecheck
limpio; **1203 pruebas, 97 archivos** (16 de `incrustado.test.ts` nuevas, más las ampliadas de
`novedadesArtista.test.ts` y `acciones.test.ts`, sobre la base de 1101 de la fase 1 más lo que sumaron otras
piezas ya en `main`); build completo, sin la ruta del arnés (ver abajo) en el árbol de rutas final. Banco
PostgreSQL local: **911 comprobaciones, 0 fallaron** (detalle en §4).

## Capturas reales (`docs/rediseno/capturas-216/`), 390×844 (320×844 la 04)

`next build && next start` (puerto 4216, sin tocar otros puertos de otros chats en el mismo contenedor), Chromium
real (`/opt/pw-browsers/chromium`) vía `playwright-core`, fuente local inyectada (mismo patrón que
`scratchpad/fuentes/capturar-ejemplo.mjs`, sin `--ignore-certificate-errors`). Arnés temporal
`src/app/arnes216-temporal/` (dos rutas — `ficha`, `publicar` — con datos inventados, Ana Reyes y un accion "stub"
que devuelve el error real de `acciones.ts` sin llamar a Supabase ni a la red) sirvió las pantallas y **se borró
entero antes de comitear** (no aparece en `git status`). `document.fonts.check('700 20px "Bricolage Grotesque"')`
→ `true`.

- **`01-ficha-cinco-proveedores.png`:** ficha con una novedad de cada uno de los cinco proveedores (las tres
  primeras visibles: YouTube, Vimeo, SoundCloud); comprobado también con «Ver más» destapando Mixcloud y
  Bandcamp (`inspeccion216b.mjs`, script del scratchpad, no en el repo): los cinco `<iframe>` traen el `src`,
  `sandbox` y `allow` esperados, y el alto real medido en el DOM es exacto — 196.875 px los 16:9 (350×`aspect-ratio
  16/9`), 166 px SoundCloud, 120 px Mixcloud y Bandcamp.
- **`02-publicar-ayuda-nueva.png`:** «Publicar novedad» sin nada escrito, con la ayuda nueva bajo el campo.
- **`03-error-bandcamp.png`:** un enlace de Bandcamp reconocido, publicado a través del accion stub del arnés
  (que devuelve el mismo error que `acciones.ts` cuando el oEmbed falla): el error «No pude leer ese enlace de
  Bandcamp…» bajo el campo.
- **`04-320px-peor-caso.png`:** la ficha con las cinco novedades (caso de 01) al ancho mínimo del proyecto
  (320 px): sin desbordes, `document.documentElement.scrollWidth === 320`.

**Ningún iframe de proveedor cargó en las capturas** (sin red a YouTube, Vimeo, SoundCloud, Mixcloud ni Bandcamp
desde este contenedor): los tres primeros marcos (dentro del primer tramo visible) muestran el icono de "archivo
roto" una vez que el navegador ya intentó cargarlos; Mixcloud y Bandcamp, más abajo, se quedan con su fondo claro
liso porque `loading="lazy"` todavía no los disparó — es lo esperado (mismo fenómeno que documentó la bitácora
210 con YouTube) y lo que dice el encargo, no un error de esta pieza. Lo que sí se confirma con las capturas y la
inspección del DOM: los marcos salen con su alto correcto por proveedor, sin saltos, con título y fecha — el
sonido/video real lo prueba el founder en su iPhone.

## Lo que no se tocó

- `src/lib/enlaces.ts`, `src/lib/video.ts` y `src/components/ui/VideoEmbed.tsx`: se reusan tal cual (prohibido
  tocarlos por el encargo, y de cualquier forma no hacía falta).
- `supabase/tests/pg/novedades-artista.test.mjs` (fase 1): se suma un archivo nuevo, no se edita.
- `docs/rediseno/44-novedades-artista.md`: el documento de la propuesta no se edita en piezas de código (regla
  del proyecto); las decisiones de esta pieza quedan en esta bitácora.

## Qué queda

- **Spotify, Deezer y el resto del doc 44** (Apple Music, Tidal, Audiomack, Twitch, Instagram) quedan fuera de
  esta pieza, tal como acotó el encargo.
- **La llamada real al oEmbed de Bandcamp** no se probó contra bandcamp.com (red cerrada en este entorno): el
  founder la prueba en producción, con un enlace de Bandcamp real, antes de darla por buena del todo.
- **El push a seguidores** (doc 44 §5, fase 3) sigue sin construirse; la nota «Pronto avisaremos a quienes te
  siguen.» del formulario sigue igual.
- Migración `20260925130000_novedades_proveedores.sql` **sin aplicar**: hasta que el founder corra
  `supabase db push`, publicar una novedad con un proveedor nuevo (Vimeo, SoundCloud, Bandcamp, Mixcloud) sigue
  fallando en producción (la base solo acepta `'youtube'` hasta entonces).

## Cierre

Commit local en `novedades-proveedores` con
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; push a `origin/novedades-proveedores` al terminar.
Sin PR: lo abre el gestor.
