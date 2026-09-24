# 210 · Novedades del artista, fase 1: modelo, migración y alta con YouTube (OL-175)

**Fecha:** 2026-09-24 · **Rama:** `novedades-artista-fase1`, desde `origin/main`. **Código de:** OL-171 (doc [44](../../../rediseno/44-novedades-artista.md), propuesta y prototipo, bitácora [206](../../206-novedades-artista.md)).

Encargo: fase 1 del doc 44, ni más ni menos — modelo y migración de `novedades_artista`, la acción de servidor
que publica, la pantalla «Publicar novedad» con un solo proveedor (YouTube) y la sección «Novedades» en la
ficha del artista, con el acceso desde «Mis artistas».

## 1. Migración `supabase/migrations/20260925100000_novedades_artista.sql`

Solo añade. Tabla `novedades_artista`: `id`, `artista_id` (referencia a `artistas`, cascada), `url` (normalizada,
nunca el texto crudo), `proveedor` (`check` en la lista blanca de la fase, hoy solo `'youtube'`), `titulo` (≤ 60),
`texto` (≤ 280), `creado_en`, `visible` (`true` por defecto) y `publicado_por` (referencia a `auth.users`, la pone
el servidor). Índice por `(artista_id, creado_en desc)` y otro por `publicado_por` (mismo motivo que
`20260918170000_advisor_seguimiento.sql`: una clave foránea sin índice que el Advisor de rendimiento señala en un
`on delete set null`).

**RLS** (mismo patrón que `artistas`/`artistas_cuentas`, reusando `gestiona_artista` sin tocarla):

- **Lectura:** lo visible, para cualquiera; lo oculto también para quien gestiona la ficha o la administración.
- **Alta:** solo quien gestiona la ficha (`gestiona_artista(artista_id)`), y siempre con `publicado_por = auth.uid()`
  — nunca la cuenta de otra persona, aunque quien publica gestione la ficha.
- **Ocultar** (`visible = false`): solo la administración, igual que el resto de las fichas.
- **Borrar:** quien gestiona la ficha o la administración. **Decisión tomada en esta pieza** (el doc 44 §4/§8 lo
  dejaba pendiente de firma del founder): la regla general del proyecto (`DEFINICION.md`, "lo publicado se
  corrige o se borra por su autor") apunta a que sí. Si el founder prefiere que solo la administración borre, es
  un `drop policy` de una línea — está anotado en un comentario junto a la política, en la propia migración.

**Tope:** 5 novedades por artista y por día (en la hora de San Luis Potosí, `America/Mexico_City`), con un
disparador `before insert` que cuenta las del día y rechaza con `errcode = 'check_violation'` y un mensaje llano
(mismo estilo que el freno de Pincel, `20260922180000_pincel_freno.sql`) — el servidor lo traduce tal cual al
formulario, sin un código a secas.

**Grants:** ninguno explícito de tabla, igual que `artistas`/`artistas_cuentas` (los roles `anon`/`authenticated`
ya tienen el grant de base del proyecto; RLS es quien de verdad decide). El disparador del tope sí tiene su
`revoke`/`grant` a `service_role` únicamente, como `obras_colectivas_freno`.

### Prueba de la migración

Banco real: **PostgreSQL 16 local** (`scripts/test-db.mjs` + `supabase/tests/pg/*.test.mjs`, el arnés que de
verdad corre la CI con `npm run test:db`) — no PGlite: ese banco quedó de una tanda anterior
(`supabase/tests/*.mjs`, sin `pg/`) y ya no es el que usa esta CI (`.github/workflows/ci.yml` levanta un
servicio `postgres:17` y corre `npm run test:db`). Se usó el mismo camino real, con Postgres 16 arrancado en
este contenedor (`service postgresql start`, `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres`).

Prueba nueva `supabase/tests/pg/novedades-artista.test.mjs` (se suma a las que ya corre `test:db`, no las
reemplaza): aplica las 61 migraciones (con la nueva) y comprueba, con datos propios (prefijo de id `…fa0xx` y
artistas con nombre único para no chocar con otras pruebas que comparten la misma base):

- El autor, la cuenta ligada («Soy yo / es mi grupo») y la administración publican; la novedad nace visible.
- `publicado_por` siempre es quien manda la sesión — Luis (autor) no puede publicar a nombre de Carla (ligada),
  aunque gestione la ficha; el intento se rechaza con `42501` (RLS del `insert`).
- Ana, sin relación con el artista, y una visita sin sesión (`anon`), tampoco publican (`42501`).
- Un visitante anónimo y Ana no ven una novedad oculta; Luis (autor) y la administración sí.
- Ocultar: el autor y la cuenta ligada no pueden (0 filas, sin error); solo la administración.
- Borrar: Ana no puede; el autor de la ficha borra una novedad aunque la haya publicado la cuenta ligada; la
  administración también.
- Tope: las primeras 5 novedades del día entran; la sexta se rechaza con `23514` y el mensaje «Ya publicaste 5
  novedades hoy. Mañana puedes seguir.»; otro artista no se topa (el tope es por artista); moviendo lo de hoy a
  «ayer» (`creado_en - 1 day`), se puede publicar de nuevo.
- La llave de servicio (`service_role`) sigue insertando (importaciones), sin `publicado_por`.

Salida real del banco:

```
$ TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres npm run test:db
ok 61 migraciones aplicadas en sn_test_…
✓ datos sembrados
Outbox: contratos SQL, paginacion, cuota y leases probados sin proveedores
Security Advisor: matriz de 51 firmas y contratos negativos/positivos (988 ms)
ok 880 pruebas: 0 fallaron
```

## 2. Acción de servidor `publicarNovedadArtista`

`src/app/artistas/[id]/novedades/acciones.ts` — mismo patrón que `artistas/acciones.ts` (`sesionOEntrar`,
validación en `lib/`, sin acceso directo a `FormData` en el componente). Nueva `src/lib/novedadesArtista.ts`:

- `reconocerNovedadEnlace`: reusa `reconocerEnlace` (`lib/enlaces.ts`, sin tocarlo) y `videoEmbedDe`
  (`lib/video.ts`, OL-154, sin tocarlo) — solo `red === "youtube"` entra en esta fase; Vimeo, aunque
  `videoEmbedDe` sí lo reconoce para "Redes", no se guarda como novedad todavía.
- `validarNovedadArtista`: título ≤ 60, texto ≤ 280 (constantes `LIMITES_NOVEDAD_ARTISTA` en `lib/limites.ts`,
  mismo patrón que `LIMITES_ARTISTA`), mensajes de error legibles.
- `fechaRelativaNovedadArtista`: «Hoy», «Ayer» o «12 sep» (día y mes cortos, sin año ni día de la semana), en la
  zona de la ciudad.

`publicarNovedadArtista(artistaId, volver, previo, formData)`: `artistaId` y `volver` (la ficha, con slug) van
atados con `.bind` desde la pantalla, como `actualizarArtista`. `publicado_por` se pone con `user.id` de la
sesión del servidor — nunca de `formData`, aunque alguien lo mande a mano (probado). El rechazo del tope
(`error.code === "23514"`) se muestra tal cual (`error.message`); cualquier otro rechazo de la base (RLS, sin
sesión) da un aviso genérico, no el código a secas.

**Pruebas unitarias** `src/app/artistas/[id]/novedades/acciones.test.ts` (mock de Supabase, mismo patrón que
`eventos/cupo.acciones.test.ts`): id no UUID sin tocar la base; sin sesión no llega a insertar; enlace vacío,
no reconocido o título/texto fuera de tope no llegan a insertar; `publicado_por` siempre de la sesión, nunca del
formulario (aunque el formulario lo traiga); título/texto vacíos se guardan `null`, no `""`; el tope
(`check_violation`) se muestra tal cual; otro rechazo de la base da el aviso genérico; un corte de red llega al
llamador como fallo. **10 pruebas.** Más 16 de `lib/novedadesArtista.test.ts` (reconocimiento, validación,
fecha relativa, con casos de inyección heredados del estilo de `video.test.ts`).

## 3. Pantalla «Publicar novedad»

`src/app/artistas/[id]/novedades/nueva/page.tsx` (servidor: carga el artista por slug/UUID como la ficha y
Editar, exige sesión y que la cuenta gestione la ficha —autor, cuenta ligada o admin—, si no, de vuelta a la
ficha) + `FormularioNovedad.tsx` (cliente, `use client`): campo Enlace (`ui/Campo`) con reconocimiento en vivo
(`reconocerNovedadEnlace`, sin llamada al servidor mientras se escribe); «Reconocido: YouTube.» con el banner
`canon.existe` (mismo estilo que "Ya está registrado" de Artista) y vista previa con `VideoEmbed`; sin
reconocer, la ayuda de error va bajo el campo («No se reconoce este enlace. Por ahora solo funciona con
YouTube.»); Título y Texto con `ui/Campo`/`ui/ContadorCaracteres` (Texto usa el campo largo del canon, igual que
la descripción de artista); nota «Pronto avisaremos a quienes te siguen.» (sin push en esta fase, tal como pide
el encargo); botón «Publicar», deshabilitado hasta que el enlace se reconozca. Termina con `useTerminar()` (mismo
patrón que Editar artista y Editar perfil): vuelve a la ficha sin dejar el formulario en el historial.

## 4. Sección «Novedades» en la ficha

`src/app/artistas/[id]/SeccionNovedades.tsx` (cliente, para el «Ver más»). En `page.tsx`: nueva
`cargarNovedadesArtista` (junto a `cargarLigadas`/`cargarFechas`, en el mismo `Promise.all`), solo `visible =
true`, orden `creado_en desc`; el `src` del reproductor se arma con `videoEmbedDe` a partir de `proveedor`/`url`
ya guardados — nunca la fila cruda al cliente sin pasar por ahí. La sección va **después de la descripción y
antes de Video** (Enlaces ya vivía antes de la descripción en el código actual, así que no se tocó ese orden —
el doc 44 §1 solo pedía "después de la descripción, antes de Redes/Video"). Muestra las 3 más recientes con
`VideoEmbed`, título, texto y fecha relativa; «Ver más» (mismo botón de texto del canon, `canon.cambiar`)
destapa el resto, sin paginar. Sin novedades y sin poder publicar, la sección no aparece; con permiso, aparece
«Publicar» en la cabecera aunque no haya ninguna todavía.

## 5. «Mis artistas»

`src/app/perfil/MisArtistas.tsx`: la tarjeta pasó de dos a tres columnas (`grid-template-columns: minmax(0, 1fr)
auto auto`) — el enlace a la ficha, «Publicar» (texto, mismo criterio que el compartir: hermano, nunca anidado)
y el círculo de compartir. Como esta lista solo trae artistas que la cuenta ya gestiona, el enlace no repite la
comprobación de permiso (la pantalla de destino sí la hace).

## Decisiones tomadas en esta pieza (sin firma pendiente del founder, documentadas para su revisión)

1. **Borrar la propia novedad:** sí, quien gestiona la ficha (o la administración) — no solo ocultarla el admin.
   Ver migración, sección 1.
2. **Orden en la ficha:** Novedades después de la descripción; Enlaces se quedó donde ya estaba (antes de la
   descripción), sin reordenar ese bloque — no era parte del encargo y hubiera tocado una sección ajena a esta
   pieza sin necesidad.

## Verificación

```
npm run lint && npm run typecheck && npm test && npm run build
```

Verdes: lint 0 errores (1 warning preexistente ajeno, `docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio;
**1101 pruebas, 91 archivos** (26 nuevas: 16 + 10); build completo, sin la ruta del arnés (ver abajo) en el
árbol de rutas final. Banco PostgreSQL local (`npm run test:db`): **880 comprobaciones, 0 fallaron**, con la
migración nueva entre las 61 aplicadas.

## Capturas reales (`docs/rediseno/capturas-210/`), 390×844 (y 320×844 la 07)

`next build && next start` (puerto 4210, sin tocar otros puertos de otros chats en el mismo contenedor), Chromium
real (`/opt/pw-browsers/chromium`) vía `playwright-core` (`npm i --no-save` en el scratchpad de la sesión, nunca
en el repo). Sin `--ignore-certificate-errors`. Sin Supabase configurado en este árbol de trabajo: un arnés
temporal (`src/app/arnes210-temporal/`, tres rutas — `ficha`, `publicar`, `perfil` — con datos inventados, Ana
Reyes y Trío de Luis, `foto: null` para no depender de red, con los componentes reales: `Barra`, `Cartel`,
`Desplegable`, `SeccionNovedades`, `FormularioNovedad`, `MisArtistas`) sirvió las pantallas y **se borró entero
antes de comitear** (no aparece en `git status`). `document.fonts.check('700 20px "Bricolage Grotesque"')` →
`true`.

- **`01-ficha-tres-novedades.png`:** ficha con tres novedades (más nueva arriba); la primera con título y texto
  exactos al tope (60 y 280 caracteres).
- **`02-ficha-ver-mas.png`:** ficha con 5 novedades, después de tocar «Ver más»: las 5 destapadas, sin paginar.
- **`03-publicar-reconocido.png`:** «Publicar novedad» con un enlace de YouTube reconocido, «Reconocido:
  YouTube.» y la vista previa del reproductor.
- **`04-publicar-no-reconocido.png`:** un enlace que no es de YouTube, con la ayuda de error bajo el campo.
- **`05-publicar-al-tope.png`:** enlace reconocido, título y texto exactos al tope, con sus contadores (60/60 y
  280/280) y el botón «Publicar» habilitado.
- **`06-mis-artistas-publicar.png`:** «Mis artistas» con el acceso «Publicar» junto al compartir, en dos
  artistas.
- **`07-320px-peor-caso.png`:** el caso al tope (01) al ancho mínimo del proyecto (320 px): sin desbordes,
  medido con `document.documentElement.scrollWidth === 320` (igual a 390 px en las demás pantallas).

**El iframe de YouTube no cargó en ninguna captura** (sin red a YouTube desde este contenedor,
`ERR_TUNNEL_CONNECTION_FAILED`): el marco del reproductor sale vacío (gris con un icono de "archivo roto" cuando
el navegador ya lo intentó, o el fondo oscuro liso cuando el `loading="lazy"` del `<iframe>` todavía no lo
disparó por estar fuera del primer tramo visible) — es lo esperado y lo que dice el encargo, no un error de esta
pieza.

### Un tropiezo de la propia captura, no del código: chunks CSS mezclados entre reinicios del servidor

La primera tanda de capturas salió con el logotipo y el avatar sin estilo (un glifo enorme cubriendo la
pantalla): quedaron **tres** procesos `next-server` viejos escuchando a la vez en el puerto 4210 (de intentos
anteriores de arrancar el servidor sin matar el anterior), sirviendo manifiestos de builds distintos — algunas
peticiones de CSS caían en un proceso con un `chunk` que ya no existía (404 sirviendo `text/plain`, que el
navegador rechaza por MIME estricto). Confirmado con los eventos de red de Playwright
(`page.on("response")`/`requestfailed"`) antes de corregir: `Refused to apply style … MIME type ('text/plain')`.
Con un solo proceso (`rm -rf .next && npm run build && next start`, matando cualquier `next-server` viejo antes),
las capturas salieron consistentes en corridas repetidas. No es un bug de la pieza: es de cómo se probó, y queda
anotado para el próximo operador que reutilice este puerto.

## Lo que no se tocó

- `src/lib/enlaces.ts`, `src/lib/video.ts` y `src/components/ui/VideoEmbed.tsx`: se reusan tal cual, sin editar
  una línea (prohibido por el encargo y, de cualquier forma, no hacía falta).
- El bloque «Enlaces»/«Video» de la ficha (orden, columnas, componentes): sin cambios, solo se insertó
  «Novedades» junto a él.
- `docs/rediseno/44-novedades-artista.md`: el documento de la propuesta no se edita en piezas de código (regla
  del proyecto); las decisiones tomadas aquí quedan en esta bitácora y en los comentarios de la migración.
- `src/app/eventos/**`, `src/app/lugares/**`, `ui/Cabecera*`, `ui/Chip*`, `AgendaInicio.tsx`, `Mapa.tsx`: fuera
  del alcance de esta pieza (otros dos operadores a la vez).

## Correos en el diff

`git status --short | awk '{print $2}' | xargs grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` solo encontró los
ya existentes en `docs/ops/OPEN_LOOPS.md` (de piezas anteriores, sin tocar) y los de prueba de esta pieza, todos
en el dominio sintético `@local.test` (mismo patrón que `rls.test.mjs`, `pincel-freno.test.mjs`, etc.), nunca una
dirección real.

## Revisión del gestor (PR #211): título de «Novedades» igual al de «Enlaces»

Hallazgo: «Novedades» usaba el título de `FichaLista.module.css` (`.lista h2`: gris, pegajoso, con línea debajo);
«Enlaces», fijado en OL-163, usa `ficha.seccionEnlaces` (negro, `--letra-xl`, sin línea — el founder: la línea
«se ve horrible»). Corregido: la sección ahora usa `ficha.seccionEnlaces` (sin tocar `Ficha.module.css`), con
«Publicar» en la misma línea del título vía el propio `<h2>` (`styles.cabecera`, flex); capturas 01, 02 y 07
rehechas y confirmadas (título negro, sin línea, igual que «Enlaces», comparados en la misma pantalla en la 01).

## Cierre

Sin PR (lo da el gestor). Commit local en `novedades-artista-fase1` con
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; push a `origin/novedades-artista-fase1` al terminar.
