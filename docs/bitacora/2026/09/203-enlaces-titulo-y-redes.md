# 203 · Mixcloud reconocido y título editable de cada enlace (OL-168)

**Fecha:** 2026-09-24 · **Rama:** `enlaces-titulo-y-redes`, desde `origin/main`.

## Causa

Dos pedidos del founder sobre la misma zona (los enlaces que pegan artistas y lugares, `src/lib/enlaces.ts`
y `SelectorEnlaces`, docs/rediseno/09-enlaces-flujo-y-estados.md):

1. «Ahora me puso "sitio web" en un enlace que debería decir Mixcloud»: `REDES` no traía `mixcloud.com`, así
   que caía en la rama «sitio» con etiqueta «Sitio web».
2. «Permitir a los artistas cambiar el título de los enlaces que pegan en redes y contacto»: hoy la etiqueta
   la decide siempre `etiquetaEnlace(e)` (nombre de la red o «Sitio web»), sin que la persona la pueda tocar.

## Qué cambia, archivo por archivo

- **`src/lib/enlaces.ts`**
  - `REDES`: cinco entradas nuevas con el mismo criterio que las de antes (dominio → etiqueta): `mixcloud`
    (`mixcloud.com`), `deezer` (`deezer.com`), `tidal` (`tidal.com`), `twitch` (`twitch.tv`), `audiomack`
    (`audiomack.com`). Ninguna de las 13 que ya había se tocó ni se quitó.
  - `Enlace` gana un campo opcional `titulo?: string`: lo que la persona escribió en vez del nombre de la
    red; vacío o ausente usa la etiqueta automática.
  - `LIMITE_TITULO_ENLACE = 30` y `limpiarTituloEnlace(v)`: recorta a ese tope, colapsa espacios y saltos de
    línea (reutiliza `limpiar` de `lib/formulario.ts`, el mismo helper que ya limpia `nombre`/`detalle` en
    los formularios) y devuelve `undefined` si queda vacío — así un título vacío nunca se guarda como cadena
    vacía en la base, y `etiquetaEnlace` cae sola a la automática.
  - `etiquetaEnlace(e)`: primero `e.titulo` si lo hay; si no, lo de siempre (nombre de la red o «Sitio web»).
    Es el único punto de lectura de la etiqueta en toda la app (`SelectorEnlaces`, la ficha de artista y la
    de lugar lo llaman a través de aquí), así que ningún otro archivo necesitó tocarse para que el título
    aparezca también en la ficha.
  - `normalizarRedes`: en la rama de lista (el formato de hoy), además de reconocer la URL de nuevo en el
    servidor, lee `titulo` del objeto entrante, lo limpia con `limpiarTituloEnlace` y lo agrega al enlace
    reconocido si quedó algo. La rama de la forma vieja (`{instagram: "@x", ...}`) no lleva título: esas
    fichas nunca lo tuvieron.
  - `enlacesDesdeJson` (lo que llega del campo oculto del formulario) no cambió de firma: ya delega en
    `normalizarRedes`, que es donde se limpia el título.

- **`src/lib/enlaces.test.ts`**: un caso por red nueva (`reconocerEnlace` + `etiquetaEnlace`), incluido
  `https://www.mixcloud.com/usuario/` → `mixcloud`, etiqueta «Mixcloud»; y tres pruebas nuevas para el
  título (`etiquetaEnlace` usa el título si lo hay y cae a la automática si está vacío;
  `normalizarRedes` recorta a 30, quita saltos de línea y descarta un título que quede vacío;
  `enlacesDesdeJson` conserva el título de principio a fin). 13 pruebas en el archivo (eran 8).

- **`src/components/SelectorEnlaces.tsx`** (el selector de enlaces compartido por el formulario de artista y
  el de lugar): cada enlace pegado ahora muestra su título en un `ui/Campo` (con `ui/ContadorCaracteres`,
  `maxLength={LIMITE_TITULO_ENLACE}`, `mostrarContador`), prellenado con `e.titulo ?? etiquetaEnlace(e)` (la
  etiqueta reconocida cuando todavía no hay título propio) y editable; la URL, que antes iba en un `<small>`
  aparte, ahora es la `ayuda` del mismo `Campo` (mismo estilo visual, un elemento menos). `cambiarTitulo(url,
  titulo)` guarda lo que se escribió tal cual (sin saltos de línea, recortado a 30) en el estado del enlace
  — si la persona lo borra por completo, el enlace se queda con `titulo: ""`, que en el servidor
  (`limpiarTituloEnlace`) se convierte en «sin título» al enviar el formulario: «vacío = etiqueta
  automática» es una opción real, no un valor que se rellena solo mientras se escribe.
  El flujo de pegar (reconocer por dominio, `@usuario`, teléfono, el límite de 8, los avisos «no parece un
  enlace»/«ese ya está») no se tocó.

- **`src/components/SelectorEnlaces.module.css`**: el renglón de cada enlace pasa a rejilla de columnas
  acotadas `24px minmax(0, 1fr) auto` (antes `24px 1fr auto`) con `min-width: 0` en el segundo hijo (el
  `Campo`, vía `.enlace > *:nth-child(2)`, porque `minmax(0, 1fr)` en la pista no basta si el hijo no lo
  declara también — regla de maquetación del founder, 2026-09-21) y `align-items: start` (antes `center`:
  con el campo de título el renglón ya no es de una sola línea). Se quitaron `.texto`, `.texto b` y `.texto
  small` (el `<span>` que envolvían ya no existe: la URL vive en la `ayuda` del `Campo`, sin envoltorio
  propio).

- **`src/components/ui/Campo.tsx`**: `omitir()` (lo que se quita de las props antes de esparcirlas sobre el
  `<input>`) no quitaba `mostrarContador`. Nunca se notó porque todo lo que ya usaba `mostrarContador` en el
  canon pasa por `multilinea` (que va a `CampoLargo`, con su propio destructuring correcto); esta pieza es
  la primera vez que un `Campo` de una sola línea lo usa, y sin el arreglo `mostrarContador={true}` se
  colaba como atributo desconocido en el DOM del `<input>` (warning de React, ninguna otra falla). Se agregó
  `mostrarContador` a lo que `omitir()` descarta. Arreglo del canon compartido, no del alcance ajeno de
  OL-167 (`Ficha.module.css`/`lib/ficha.ts`, ninguno de los dos tocado aquí).

## ¿Hace falta migración?

**No.** Medido antes de escribir nada:

```
$ grep -n "redes" supabase/migrations/*.sql
supabase/migrations/20260913120000_base.sql:27:  redes jsonb not null default '{}'::jsonb,
supabase/migrations/20260914050000_artistas.sql:14:  redes jsonb not null default '{}'::jsonb,
```

`redes` es `jsonb` sin ningún `check` que exija su forma (ni en esas dos migraciones ni en ninguna otra: es
el único resultado de `grep -rn "redes" supabase/`, aparte de los INSERT/UPDATE de
`supabase/tests/autor_y_visible_solo_admin.mjs`, que tampoco fijan forma). Ninguna función SQL lee dentro de
`redes` (no hay `redes->` ni `redes::` en ningún `.sql` del repo). El campo `titulo` nuevo es un atributo más
del JSON de cada enlace, leído y escrito enteramente en TypeScript (`lib/enlaces.ts`); la base solo guarda el
JSON que le llega, igual que ya hacía con la forma vieja y la de hoy (doc 09, decisión 6: «sin migración:
`redes` ya era JSON»).

## IconoRed: sin cambio

`src/components/ui/IconoRed.tsx` resuelve por `switch (red)`; las cinco redes nuevas no tienen `case`
propio, así que caen en el `default` que ya devuelve el icono genérico (`IconoEnlace`) — el mismo que usa
`red === "sitio"`. Es exactamente lo pedido («si no hay glifo propio, usa el genérico que ya exista para
"sitio"»): no hizo falta tocar el componente ni dibujar ningún glifo. Confirmado en las capturas 01/03/05
(Mixcloud y Deezer con el icono de cadena genérico).

## Pruebas

```
npm run lint && npm run typecheck && npm test && npm run build
```

Verdes: lint 0 errores (1 warning preexistente sin relación, `docs/diseno/logotipo/iconos-sn.mjs`);
typecheck limpio; **1072 pruebas, 89 archivos**, todas en verde (incluye las 13 de `enlaces.test.ts`, antes
8); build completo, sin la ruta del arnés (ver abajo) en el árbol de rutas final. `git diff
origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` no encontró ninguna dirección.

## Capturas reales (`docs/rediseno/capturas-203/`), 390×844

Sin Supabase en este árbol: arnés temporal `src/app/arnes203-temporal/` (datos inventados — el artista «Los
Vecinos» y el lugar «Casa 1100» — con los componentes reales `FormularioArtista`, `FormularioLugar` y el
bloque de «Enlaces» de la ficha de artista, con los mismos `Ficha.module.css`/`lib/ficha.ts` que usa la
página real, solo leídos, no tocados), servido con `next build && next start` en el puerto 4203 y capturado
con el Chromium de `/opt/pw-browsers` vía `playwright-core` (instalado con `npm i --no-save` en el
scratchpad de la sesión, nunca en el repo). **Se borró entero antes de comitear** (no aparece en `git
status`; el build final, corrido después de borrarlo, no lista ninguna ruta `/arnes203-temporal/…`).
`document.fonts.check('700 20px "Bricolage Grotesque"')` → `true`.

- **`01-formulario-artista-tres-enlaces.png`** (página completa, sin nada con foco): los tres enlaces
  pedidos — Mixcloud reconocido sin título propio (icono genérico, etiqueta «Mixcloud», campo Título vacío
  mostrando el prellenado), uno con título editado («Fotos del taller de cerámica», 28/30) y uno con el
  título al tope exacto («Recital en vivo del 12 de sept», 30/30, contador visible). Debajo, «Otro enlace»
  (con 3 de 8 enlaces, el campo sigue ahí) y la descripción.
- **`02-formulario-artista-titulo-con-foco.png`**: mismo estado, con el campo Título del segundo enlace (el
  editado) con foco — borde morado del canon, contador 28/30 visible.
- **`03-ficha-artista-enlaces.png`**: la ficha de «Los Vecinos» con los tres botones de «Enlaces»: Mixcloud
  (icono genérico, etiqueta automática «Mixcloud»), el de título editado («Fotos del taller de cerámica») y
  el del tope («Recital en vivo del 12 d…», ver límite abajo).
- **`04-formulario-lugar-enlace-titulo.png`**: «Casa 1100» con un enlace (Vimeo) con título editado
  («Recorrido por la casa»), mismo `Campo` y misma rejilla que en artistas (el componente es compartido).
- **`05-formulario-artista-ocho-enlaces.png`** (extra, para la medición al tope de longitud que pide el
  encargo: título de 30 caracteres y 8 enlaces en una misma captura — 01/02 ya cubren el título al tope, esta
  cubre los 8 enlaces): ocho enlaces pegados (los tres de antes más Facebook, YouTube, Spotify, Deezer y
  WhatsApp), el campo «Otro enlace» ya no aparece (estado E4 de doc 09, `LIMITE_ENLACES = 8`), sin scroll
  horizontal ni ningún renglón fuera de su tarjeta.

Medido con `getBoundingClientRect()` en las cinco pantallas: `document.documentElement.scrollWidth` igual a
`clientWidth` (390) en todas — sin scroll horizontal de página en ningún caso.

### Límite encontrado: el título largo puede salirse de su círculo en la ficha (no corregido aquí)

En `03-ficha-artista-enlaces.png`, con tres enlaces y al menos uno de título largo, el tercero («Recital en
vivo del 12 de sept», 30 caracteres) se ve cortado por el borde derecho de la pantalla. Medido:

```
scrollWidth/clientWidth de <html> y <body>: 390 (igual) — sin scroll horizontal de página.
Tercer botón de acción ("Recital en vivo del 12 de sept"):
  left: 267.8, right: 426.7 (viewport: 390) → el propio botón se sale 36.7px de la ventana.
```

La página no se desplaza (el `scrollWidth` no crece), pero la etiqueta de ese botón sí queda fuera de lo
visible: `Ficha.module.css` reparte los círculos de `.accionesRepartidas` a ancho igual y su etiqueta
(`.accion`) no envuelve ni recorta el texto — funcionaba porque ningún nombre de red pasaba de 11 caracteres
(«Apple Music»); un título de hasta 30 no cabe ahí con 2 a 4 enlaces por fila. `Ficha.module.css` y
`lib/ficha.ts` son de OL-167 (que los está tocando en paralelo) y esta pieza no los tocó, así que no se
corrigió aquí: **para el gestor**, la corrección (recortar con elipsis la etiqueta de `.accion` a partir de
cierto ancho, o angostar la fuente del contador) va en ese archivo y conviene coordinarla con OL-167 antes
de integrar. Mientras tanto, el título completo (hasta 30 caracteres) se guarda y se puede leer siempre
entrando al enlace; el problema es solo visual, en la ficha, con 2 a 4 enlaces y al menos uno largo.

## Lo que no se tocó

- `src/components/ui/Ficha.module.css` y `src/lib/ficha.ts` (alcance de OL-167, que los está tocando en
  paralelo) — el hallazgo de arriba queda documentado, no corregido.
- El flujo de reconocer lo pegado (`reconocerEnlace`, `@usuario`, teléfono, el límite de 8, los avisos en
  línea): sin cambios.
- Las 13 redes que ya había en `REDES`: ninguna se quitó ni cambió de dominio o etiqueta.
- No hizo falta migración (medido arriba) ni tocar `src/app/artistas/acciones.ts` ni
  `src/app/lugares/acciones.ts`: ambos ya delegaban toda la validación de `enlaces` en
  `enlacesDesdeJson`/`normalizarRedes`, que es donde vive el cambio.
- `src/app/artistas/[id]/page.tsx` y `src/app/lugares/[id]/page.tsx`: siguen llamando a `etiquetaEnlace(r)`
  tal cual; como esa función ya resuelve el título ahí adentro, la ficha real muestra el título editado sin
  que estos archivos se tocaran.

## Cierre

Sin push ni PR (los da el gestor). Commit local en `enlaces-titulo-y-redes` con
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
