# 220 · Novedades del artista: editar y borrar (OL-185)

**Fecha:** 2026-09-24 · **Rama:** `novedades-editar`, desde `origin/main`. Código de OL-171 (doc
[44](../../../rediseno/44-novedades-artista.md), propuesta y prototipo, bitácora
[206](../../206-novedades-artista.md)); sigue a la fase 1 (OL-175, bitácora
[210](../../210-novedades-artista-fase1.md)) y a los proveedores nuevos (OL-181, bitácora
[216](../../216-novedades-proveedores.md)).

## Por qué

Pedido del founder (2026-09-24, palabras suyas): «crea opción de editar publicaciones de artista, para borrar o
corregir subidas.» El doc 44 §6 decía «sin edición después de publicar» (alcanzaba con publicar + ocultar); el
founder lo cambia hoy para las novedades del artista: quien gestiona la ficha corrige (enlace, título, texto) y
borra sus novedades. Ocultar (`visible`) sigue siendo solo de la administración — eso no cambió. Nota añadida al
doc 44 §6 con la cita y la fecha.

## 1. Migración `supabase/migrations/20260925140000_novedades_editar.sql` (sin aplicar)

Dos cambios, sobre la tabla `novedades_artista` que ya existe (migración 20260925100000, fase 1, OL-175):

1. **La política de update** ("solo la administración cambia visible") se sustituye por
   `"novedades_artista: edita quien gestiona la ficha o admin"` (`using`/`with check`:
   `gestiona_artista(artista_id) or es_admin()`). Decide **quién** puede intentar un update; **qué** se puede
   tocar lo decide el disparador de abajo, no esta política.
2. **Disparador `novedades_artista_editar_candado`** (`before update`, `security definer`, `set search_path = ''`,
   mismo estilo que `novedades_artista_tope` de la fase 1):
   - Si `new.visible is distinct from old.visible` y `not es_admin()`: rechaza con `check_violation` y
     «Solo la administración puede ocultar o mostrar una novedad.» — la regla que no cambió, ahora puesta en un
     disparador porque la política ya deja pasar a quien gestiona para el resto de la fila.
   - Si cambian `artista_id`, `publicado_por` o `creado_en` (los toque quien los toque, incluida la
     administración): rechaza siempre con `check_violation` y «Esa parte de la novedad no se puede cambiar.» — un
     `before` trigger corre antes de que la RLS evalúe `with check` sobre la fila final (así lo documenta
     PostgreSQL), así que esta regla se aplica siempre, antes de que la política de arriba decida el resto.

Grants: `revoke`/`grant` del disparador a `service_role` únicamente (mismo patrón que `novedades_artista_tope`).

### Prueba de la migración

Banco real: PostgreSQL 16 local (`scripts/test-db.mjs`, el mismo camino que corre la CI). Prueba nueva
`supabase/tests/pg/novedades-editar.test.mjs` (se suma a `novedades-artista.test.mjs` y
`novedades-proveedores.test.mjs`, sin reemplazarlas): con datos propios (prefijo de id `…fc0xx`), comprueba que el
autor edita título/texto/url/proveedor de su propia novedad; que la cuenta ligada también edita (aunque la haya
publicado el autor); que Ana, sin relación, no edita (0 filas, sin reventar, y nada cambia); que ni el autor ni la
cuenta ligada pueden cambiar `visible` (rechazo `23514`), pero la administración sí; que nadie cambia `artista_id`
(ni el autor ni la administración), ni `publicado_por`, ni `creado_en`; y que el autor y la cuenta ligada borran su
novedad, Ana no.

**Ajuste necesario en `novedades-artista.test.mjs` (fase 1, OL-175), documentado aquí porque no es un archivo
propio de esta pieza:** dos pasos de esa prueba dejaron de valer con el disparador nuevo.

- La preparación del fixture (`update … set visible = false` para dejar una novedad oculta antes de probar
  lectura) se hacía con una consulta directa, sin sesión — antes eso corría por fuera de la RLS (rol dueño de la
  conexión), pero el disparador nuevo se dispara para **cualquier** rol, incluido ese, y sin `auth.uid()` fijado
  `es_admin()` da `false`. Se cambió esa preparación para correr como la administración (`as("authenticated", F,
  …)`), que es a quien de verdad le toca ese cambio.
- Los dos casos que probaban «el autor/la cuenta ligada no ocultan su propia novedad» esperaban antes **0 filas,
  sin error** (la política vieja los paraba en el `using`, la fila ni se tocaba). Con la política nueva, el
  `using` sí los deja pasar (gestionan la ficha) y es el disparador el que rechaza el cambio de `visible` — el
  mismo contrato, pero ahora como un error explícito (`23514`), no un silencio. Se cambiaron esos dos casos a
  `expectError` con el mensaje del disparador, con una nota de por qué en el propio archivo.
- El truco de la prueba del tope diario («mover `creado_en` un día atrás para simular ayer») también choca con el
  disparador (`creado_en` no se puede tocar nunca, ni con la sesión de la administración): ese truco no es el
  recorrido de ningún rol real, así que se apaga el disparador (`alter table … disable trigger …`) solo para ese
  paso de preparación y se vuelve a encender de inmediato.

```
$ TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres npm run test:db
ok 64 migraciones aplicadas en sn_test_…
✓ datos sembrados
Outbox: contratos SQL, paginacion, cuota y leases probados sin proveedores
Security Advisor: matriz de 51 firmas y contratos negativos/positivos (~1.1 s)
ok 925 pruebas: 0 fallaron
```

(925 = 911 que ya traía el banco desde OL-181 + 14 de `novedades-editar.test.mjs`; las 63 migraciones de antes más
la nueva dan 64.)

## 2. Acciones de servidor (`src/app/artistas/[id]/novedades/acciones.ts`)

**`actualizarNovedadArtista(artistaId, novedadId, volver, _previo, formData)`:** misma validación que
`publicarNovedadArtista` (`validarNovedadArtista`). Antes de actualizar, lee la fila actual (`url`, `proveedor`,
`embed_id`) con el cliente de sesión — la RLS ya limita a lo que esta cuenta puede gestionar u ocultar. Para
Bandcamp, solo vuelve a consultar el oEmbed (`embedIdBandcamp`, el mismo helper de publicar) cuando la URL nueva
es distinta de la guardada; si el proveedor y la URL no cambiaron, reusa el `embed_id` ya guardado, sin llamar a
ningún servicio externo. Si el proveedor nuevo no es Bandcamp, `embed_id` queda en `null` (mismo criterio que
publicar). El `update` nunca manda `artista_id`, `publicado_por`, `creado_en` ni `visible`: el disparador de la
migración los protege, pero la acción tampoco los toca. `check_violation` (el disparador, o cualquier otro
`check`) se muestra tal cual; 0 filas sin error (RLS bloqueó el `update`, por ejemplo una cuenta que ya no gestiona
la ficha) da el mismo aviso genérico que publicar («No se pudo guardar. ¿Sigues con sesión y es tu ficha?»).

**`borrarNovedadArtista(artistaId, novedadId, volver)`:** `delete` con `eq("id", novedadId)` y
`eq("artista_id", artistaId)` — la política de borrado ya existe desde OL-175 (quien gestiona la ficha o admin),
el `eq` de más es una segunda capa: una novedad nunca se borra por accidente desde la ficha de otro artista.
`revalidatePath(volver)` y `redirect(volver)`, sin resultado que leer (usada como `accion: () => Promise<void>`
del componente `Borrar`, igual que `borrarArtista`/`borrarLugar`/`borrarEvento`).

**Pruebas** (`acciones.test.ts`, se suman 25 casos a los 14 que ya había): un `builder` nuevo imita la cadena de
Supabase (`.eq().eq().maybeSingle()`, o `await` directo tras `.eq()` — las consultas de `supabase-js` son
"thenables"). Cubren: id no UUID no llega a la base; corregir título/texto/enlace sin Bandcamp llama a `update`
con lo nuevo, sin tocar `fetch`; **editar sin cambiar la URL de Bandcamp no llama al oEmbed** (reusa el
`embed_id` guardado); **cambiar a otra URL de Bandcamp sí** vuelve a consultarlo; un proveedor nuevo que no es
Bandcamp deja `embed_id` en `null` aunque antes fuera Bandcamp; sin la fila (novedad ajena o ya borrada) da el
aviso genérico sin llamar a `update`; el `check_violation` del disparador se muestra tal cual; 0 filas sin error no
se confunde con éxito; y **borrar llama a `delete` con `eq("id")` y `eq("artista_id")`**, revalida la ficha y
redirige.

## 3. Pantalla «Editar novedad» (`src/app/artistas/[id]/novedades/[novedadId]/editar/page.tsx`)

Mismo criterio de permiso que «Publicar novedad» (`nueva/page.tsx`): sin sesión, a `/entrar`; artista por
slug/UUID; solo quien gestiona la ficha (autor, cuenta ligada o admin) puede entrar, si no, de vuelta a la ficha.
La novedad se carga después, con el cliente de sesión y filtrada por `artista_id` — si el id no existe, es de otro
artista, o se borró entre que se tocó «Editar» y que cargó la pantalla, `notFound()` (la RLS es una segunda capa,
no la única: la comprobación de permiso de arriba ya decide quién ve el formulario). Reusa `FormularioNovedad` con
`modo="editar"` e `inicial={{ url, titulo, texto }}`; debajo, el `Borrar` del canon (`src/components/Borrar.tsx`,
mismo componente que usan evento/lugar/artista/mi cuenta) con `que="la novedad"`, `icono="artista"` (no hay un
icono propio de "novedad" en el canon) y `aviso="Se quita de tu ficha."` — el propio componente añade
«No se puede deshacer.», dando exacto el texto del encargo. `borrarNovedadArtista` atado con `.bind`.

`nueva/page.tsx` solo cambió en una línea: pasa `modo="nueva"` a `FormularioNovedad` (antes no hacía falta, con un
solo modo).

## 4. `FormularioNovedad.tsx`: `modo` e `inicial`

Dos props nuevas: `modo: "nueva" | "editar"` (obligatoria, sin valor por omisión: cada pantalla dice quién es) e
`inicial?: { url, titulo, texto }` (solo en modo editar, precarga los tres campos). Lo único que cambia con
`modo` es la etiqueta del botón («Publicar»/«Publicando…» vs. «Guardar cambios»/«Guardando…»); el resto del
formulario —ayuda de proveedores, banner «Reconocido», vista previa, contadores, la nota «Pronto avisaremos a
quienes te siguen.»— es igual en los dos modos, tal como pedía el encargo («mismo aviso de proveedores»). El
título de la pantalla («Editar novedad») lo pone la propia página, como ya hacía «Publicar novedad» con su `<h1>`
— `FormularioNovedad` nunca puso su propio título.

## 5. Ficha: «Editar» y «Oculta» (`SeccionNovedades.tsx` + `artistas/[id]/page.tsx`)

`NovedadParaFicha` gana `visible: boolean` (`id` ya existía). Cada novedad lleva ahora un renglón (`.pie`, flex,
`justify-content: space-between`) con la fecha relativa a la izquierda y, para quien gestiona (`hrefPublicar` no
nulo, mismo criterio que «Publicar»), un enlace «Editar» a la derecha —
`aria-label="Editar novedad: {título o proveedor}"`—, a `<hrefFicha>/novedades/<id>/editar` (`hrefFicha`, prop
nueva, viene de `hrefArtista(a)` en la página). Una novedad oculta por la administración (`visible = false`) suma
«· Oculta» junto a la fecha, en rojo (`var(--error)`, el mismo tono que ya usan los avisos "oculto" de
evento/lugar), sin caja nueva — solo texto, como pide el encargo.

**La consulta de la ficha (`cargarNovedadesArtista`) perdió su `.eq("visible", true)` a propósito.** Antes filtraba
`visible = true` en el propio código, así que ni siquiera quien gestiona la ficha veía lo que la administración
había ocultado — justo lo que el encargo pedía corregir. Ahora la política de lectura de la migración
20260925100000 (fase 1, sin tocar en esta pieza) es la que decide: visible para cualquiera, también lo oculto
para quien gestiona la ficha o la administración. Comprobado con `supabase/tests/pg/novedades-artista.test.mjs`
(ya existente, sin tocar sus casos de lectura) que un visitante sin ese permiso nunca recibe una fila con
`visible = false` — así que la etiqueta «Oculta» del lado del cliente nunca puede aparecer para quien no debería
verla, sin necesitar una comprobación propia en `page.tsx`. Para el público, el resultado de la consulta es
idéntico a antes (la RLS ya filtraba lo oculto, el `.eq` explícito era una segunda capa redundante que además
rompía el permiso nuevo).

## 6. Maquetación

Renglón de fecha + «Editar»: flex de una fila, `min-width: 0` en el lado del texto (`.cuando`) y `flex: none` en
el enlace, sin envolverse ni desbordar. Medido a 320 px (captura 05, más abajo): `scrollWidth === 320`, sin
recorte del enlace «Editar» ni de «· Oculta» aunque compartan renglón con una fecha de dos palabras («Ayer»).
Ningún archivo compartido (`Ficha.module.css`) se tocó: todo el ajuste vive en `SeccionNovedades.module.css`,
propio de esta sección, reusando `canon.cambiar` (el mismo botón de texto que ya usan «Publicar» y «Ver más») y el
componente `Borrar` del canon tal cual, sin envolvente propio.

## Verificación

```
npm run lint && npm run typecheck && npm test && npm run build
```

Verdes: lint 0 errores (1 warning preexistente y ajeno, `docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio;
**1239 pruebas, 98 archivos** (25 nuevas en `acciones.test.ts`, sobre las 1101 + 138 de piezas ya en `main`); build
completo, con la ruta nueva `/artistas/[id]/novedades/[novedadId]/editar` en el árbol de rutas y sin la del arnés
(ver abajo, se borró antes de comitear). Banco PostgreSQL local (`npm run test:db`): **925 comprobaciones, 0
fallaron**, con la migración nueva entre las 64 aplicadas (detalle en la sección 1).

## Capturas reales (`docs/rediseno/capturas-220/`), 390×844 (320×844 la 05)

`next build && next start` (puerto 4220, sin tocar otros puertos de otros chats en el mismo contenedor), Chromium
real (`/opt/pw-browsers/chromium`) vía `playwright-core` (`/tmp/.../scratchpad/pw/node_modules`), fuente local
inyectada (mismo patrón que `scratchpad/fuentes/capturar-ejemplo.mjs`, sin `--ignore-certificate-errors`, sin
tocar `HTTPS_PROXY`). Arnés temporal `src/app/arnes220-temporal/` (dos rutas — `ficha`, `editar` — con datos
inventados, Ana Reyes, reutilizando los componentes reales: `Barra`, `Cartel`, `Desplegable`, `SeccionNovedades`,
`FormularioNovedad`, `Borrar`) sirvió las pantallas y **se borró entero antes de comitear** (no aparece en
`git status`). `document.fonts.check('700 20px "Bricolage Grotesque"')` → `true` en cada captura (confirmado con
`[...document.fonts]` listando la familia con `status: "loaded"`).

Nota sobre `waitUntil`: la primera corrida con `"networkidle"` se colgó 30 s — la red bloqueada hacia
`youtube-nocookie.com`/`vimeo.com`/`android.clients.google.com` (proxy del entorno, `connect_rejected`) nunca deja
que la página se quede "quieta". Se cambió a `"load"` + una espera explícita del texto relevante en cada paso; no
es un problema de la pieza, es de la red cerrada del entorno (ya documentado en bitácoras 210/216).

- **`01-ficha-editar.png`:** ficha con tres novedades; la primera y la tercera con «Editar» al final de su
  renglón de fecha; la segunda, además, con «· Oculta» en rojo junto a «Ayer».
- **`02-editar-novedad.png`:** «Editar novedad» con los tres campos precargados (enlace de YouTube reconocido,
  título y texto), el botón «Guardar cambios» y, debajo, «Borrar la novedad».
- **`03-borrar-confirmar.png`:** la hoja de confirmación abierta, con «¿Borrar la novedad?», «Se quita de tu
  ficha. No se puede deshacer.» y los dos botones («Sí, borrar la novedad» en rojo, «Cancelar»).
- **`04-enlace-no-reconocido.png`:** un enlace que no reconoce ningún proveedor, con la ayuda de error bajo el
  campo y «Guardar cambios» deshabilitado — calculado en el cliente, sin llamar al servidor.
- **`05-320px-peor-caso.png`:** el caso de 01 al ancho mínimo del proyecto (320 px), `scrollWidth === 320`, sin
  desbordes ni recortes en ningún renglón de fecha + «Editar».

**Ningún iframe de proveedor cargó** (sin red desde este contenedor, mismo fenómeno que las bitácoras 210/216): el
primero (dentro del primer tramo visible) muestra el icono de "archivo roto"; el resto, fondo oscuro liso porque
`loading="lazy"` no los disparó — esperado, no es un defecto de esta pieza. La reproducción real de cada
proveedor y el recorrido completo (tocar «Editar» desde la ficha real, guardar, borrar) los prueba el founder en
su iPhone.

## Lo que no se tocó

- `src/lib/enlaces.ts`, `src/lib/video.ts`, `src/lib/incrustado.ts`, `src/components/ui/VideoEmbed.tsx`,
  `src/components/ui/Incrustado.tsx`: se reusan tal cual.
- `supabase/tests/pg/novedades-proveedores.test.mjs`: sin cambios.
- `src/components/Borrar.tsx`: se usa tal cual (canon), sin tocar una línea.
- La migración de la fase 1 (`20260925100000_novedades_artista.sql`) y la de proveedores
  (`20260925130000_novedades_proveedores.sql`): sin editar — esta pieza suma una migración nueva, no reescribe
  las que ya existen.

## Pendiente para el founder

- Aplicar en Supabase, en orden: `20260925130000_novedades_proveedores.sql` (OL-181, ya pendiente antes de esta
  pieza) y luego `20260925140000_novedades_editar.sql` (esta pieza) con `supabase db push`.
- Probar en su iPhone (Safari): tocar «Editar» en una novedad propia desde la ficha real, cambiar el enlace a otro
  proveedor y guardar, borrar una novedad y confirmar que desaparece de la ficha, y (con una cuenta de
  administración) comprobar que ocultar/mostrar sigue siendo solo suyo.

## Cierre

Sin PR: lo abre el gestor. Commit local en `novedades-editar`, `git add` por nombre; push a
`origin/novedades-editar` al terminar.
