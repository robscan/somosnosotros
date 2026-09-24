# 203 · Mixcloud reconocido y título editable de cada enlace (OL-168)

**Fecha:** 2026-09-24 · **Rama:** `enlaces-titulo-y-redes`, desde `origin/main`. Segunda entrega:
`git merge origin/ficha-boton-compartir-y-reparto` (OL-167, SHA `56db73e`, PR #202) para corregir el
hallazgo 1 sobre el `Ficha.module.css`/`lib/ficha.ts` ya al día.

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

## Correcciones del gestor (segunda entrega)

Devuelta con cinco hallazgos sobre la primera entrega (`e96e8d3`). Antes de corregir el 1: `git fetch origin
&& git merge origin/ficha-boton-compartir-y-reparto` (OL-167, SHA `56db73e`, PR #202 — «botón Compartir sin
envolvente y reparto de acciones a partir de 3», bitácora 202) — único choque, `docs/ops/OPEN_LOOPS.md`
(las dos entradas OL-168/OL-167 y los dos trozos de «Last updated» conservados, sin perder ninguna línea de
`main`); `Ficha.module.css`, `lib/ficha.ts` y los `page.tsx` de artistas/lugares llegaron con la versión de
OL-167 sin más choques.

**1) BLOQUEANTE — la etiqueta larga se salía de la pantalla en la ficha (36.7px medidos en la entrega
anterior).** `Ficha.module.css`: nueva clase `.accionEtiqueta` en el `<span>` que envuelve el texto de cada
`.accion` (antes texto suelto) — `display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
overflow:hidden; overflow-wrap:anywhere; white-space:normal`, envuelve a dos líneas y corta con puntos
suspensivos; el círculo y el `min-width:64px` de `.accion` no se tocaron. Se aplicó el `<span>` en
`src/app/artistas/[id]/page.tsx` y `src/app/lugares/[id]/page.tsx` (los dos usos de `etiquetaEnlace(r)`
dentro de `.acciones`); no se tocó `src/app/eventos/[id]/page.tsx` («Compartir», «A mi calendario», «Cómo
llegar»: etiquetas fijas y cortas, sin riesgo, fuera del alcance de esta pieza).

Ancho de la etiqueta: 80px es el máximo a 390px (la propia cuenta del gestor: 390 − 2×20px de `--gutter` −
3×16px de `gap`, entre 4 ≈ 75.5px). Medido a 320 y 375 ese mismo 80px fijo se salía (ver más abajo), así que
en `.accionesRepartidas` (3–4 círculos sin desplazarse) el ancho es `min(80px, calc((100vw - 88px) / 4))`:
la misma cuenta pero con el ancho real de la pantalla, nunca más de 80px. En `.accionesCarril` y con 1-2
(sin clase de reparto) se queda fijo en 80px: esos círculos se desplazan o sobra espacio, no necesitan
encoger.

Medido con `getBoundingClientRect()`/`scrollWidth` en la ficha de artista, `?n=2|3|4|6` enlaces (todos con
título de 28–30 caracteres) a 320, 375 y 390px — 12 combinaciones:

| n\\ancho | 320px | 375px | 390px |
|---|---|---|---|
| 2 | sin desborde (max 180) | sin desborde (max 180) | sin desborde (max 180) |
| 3 | sin desborde (max 300) | sin desborde (max 355) | sin desborde (max 370) |
| 4 (`accionesRepartidas`) | **4px** de un hijo (ver abajo) | sin desborde (max 355) | sin desborde (max 370) |
| 6 (`accionesCarril`) | hijos fuera del viewport, **por diseño** (ver abajo) | ídem | ídem |

- **n=6 (carril):** `.acciones` tiene `overflow-x:auto` en las dos variantes (`Ficha.module.css`, sin tocar);
  con más de 4 el carril se desplaza y el círculo siguiente asoma a propósito («el carril sigue asomando el
  siguiente círculo», pedido del gestor) — confirmado: sigue asomando en las tres anchuras, sin scroll de
  página (`scrollWidth === clientWidth` en los tres casos).
- **n=4 a 320px, 4px de un hijo:** con el título recortado a `min(80, (320-88)/4) = 58px` el 4.º círculo
  aún se sale 4px del viewport (324 vs 320). Medido que es **previo a esta pieza y ajeno al título**: con
  las mismas cuatro etiquetas reemplazadas por nombres de red cortos («Mixcloud», «Instagram», «Vimeo»,
  «Facebook», sin título propio) el desborde es idéntico (4 círculos de exactamente 64px — el propio
  `min-width` de `.accion`, no su contenido — + 3 gaps de 16px = 304px, contra 280px de hueco disponible a
  320px: 4×64 ya no cabe con el `min-width` actual, tenga o no título el enlace). No se tocó (el gestor pidió
  explícitamente no cambiar el `min-width` de `.accion`, que es de OL-167); es de `.acciones`, que ya
  desplaza internamente (`overflow-x:auto`) — `scrollWidth === clientWidth` en el documento (320) en los tres
  casos, así que **no hay scroll horizontal de página**, solo 4px del último círculo dentro del propio carril
  de `.acciones`. Queda anotado para quien decida el ajuste (bajar `min-width` unos px, o correr el umbral de
  `accionesCarril` a 4 en vez de 5 a partir de cierto ancho); no es un bloqueante de esta pieza porque no lo
  causa el título.

Capturas **06** (4 enlaces con título al tope, 390) y **07** (lo mismo, 320) nuevas; **03** reemplazada por
una sin desborde.

**2) Sobreanidación en el formulario.** `SelectorEnlaces.module.css`: se quitaron `border`, `border-radius`
y el `padding` propios de `.enlace` — el renglón es la rejilla `24px minmax(0, 1fr) auto` a secas (icono,
`Campo`, ✕); la única caja visible es la del campo (`ui/Campo`, `.control`). Los renglones se separan con
`.lista { gap: var(--espacio-4) }` (antes `--espacio-1`, 4px, pensado para cuando cada uno ya traía su
propio borde) — el mismo criterio que `.renglones` del canon (`ui/FormularioCanon.module.css`): un `gap` en
el contenedor de la lista, sin borde propio en cada renglón repetido. El icono se realinea con
`margin-top: 20px` (antes offset por el `padding` del contenedor que ya no existe) para quedar a la altura
del campo, no de la etiqueta «Título». Confirmado con `Read` sobre la captura 01: una sola caja por enlace,
no dos anidadas.

**3) Dos cruces juntas.** `ui/Campo.tsx`: prop nueva `sinLimpiar?: boolean` (por defecto `false`: nadie más
pierde su ✕ de vaciar) — con ella, `Campo` no monta `ui/Limpiar` dentro de la caja del campo.
`SelectorEnlaces.tsx` la pasa en el `Campo` del título: la única ✕ del renglón es la de «quitar el enlace»,
fuera del campo. `omitir()` también deja fuera `sinLimpiar` antes de esparcir el resto sobre el `<input>`
(mismo arreglo que ya llevaba `mostrarContador`, mismo motivo: si no, se cuela como atributo DOM
desconocido). Vaciar el título a mano (Retroceso/seleccionar y borrar) sigue funcionando: nueva prueba
directa en `enlaces.test.ts`, `limpiarTituloEnlace("") → undefined` (y `"   "` y `undefined`), más las que ya
probaban el recorte a 30 y el colapso de saltos de línea — 15 pruebas en el archivo (eran 13).

**4) El título de 30 caracteres no cabía en su campo.** Al quitar el borde/padding de `.enlace` (hallazgo 2)
y la ✕ interior (hallazgo 3) el campo ganó ancho. Medido en el enlace real de la captura 01/02 («Recital en
vivo del 12 de sept», 30 caracteres, `vimeo`, tercer enlace):

| Ancho | `input.clientWidth` | `input.scrollWidth` | ¿Cabe entero? |
|---|---|---|---|
| 390px | 222px | 222px | **sí**, sin scroll interno |
| 320px | 152px | 216px | no, hace scroll interno del input (como cualquier campo) |

A 390px un título real de 30 caracteres se ve completo (antes, con la doble caja, se cortaba: «Fotos del
taller de cerá…»; ver captura 01 nueva). A 320px no cabe entero y el input se desplaza por dentro, tal como
pidió el gestor si no cabe («que el texto haga scroll dentro del input»), sin cortar palabras a la mitad
(scroll de texto nativo del `<input>`, no recorte de caracteres) y sin romper la rejilla.

También se midió el peor caso posible — 30 letras anchas repetidas («MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM», la
letra más ancha de la fuente, 30 veces seguidas): `clientWidth` 252px a 390px y 182px a 320px, contra
`scrollWidth` 400px en los dos — no cabe entero en ninguno de los dos anchos. Es una medida honesta, no un
hallazgo por corregir: ninguna palabra real tiene esa forma (ni el ejemplo de arriba, un título real de 30
caracteres con palabras normales, la necesita), y un campo que comparte renglón con un icono de 24px y un
botón ✕ de 48px no puede alojar 30 letras anchas a tamaño legible en una pantalla de 390px sin encoger la
letra o quitar el icono/botón — ninguna de las dos cosas se pidió. Con el peor caso el campo hace scroll
interno igual que a 320px con el título real, sin desbordar la rejilla ni la página (comprobado con la misma
medición de `scrollWidth`/`clientWidth` del documento).

**5) Capturas de página completa.** Las cinco capturas del formulario se rehicieron con viewport 390×844
(y una a 320×844) **sin** `fullPage`, desplazando la página con `scrollIntoView` hasta «Redes y contacto»
cuando hacía falta, una captura por estado (no una tira larga). `07-ficha-artista-cuatro-enlaces-320.png` es
la única fuera de 390: a 320px por pedido explícito del hallazgo 1.

## Pruebas

```
npm run lint && npm run typecheck && npm test && npm run build
```

Verdes: lint 0 errores (1 warning preexistente sin relación, `docs/diseno/logotipo/iconos-sn.mjs`);
typecheck limpio; **1075 pruebas, 89 archivos** (eran 1072/89 antes del merge con OL-167 y de las dos pruebas
nuevas de `limpiarTituloEnlace`), todas en verde; build completo, sin la ruta del arnés en el árbol de rutas
final. `git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` no encontró ninguna
dirección.

## Capturas reales (`docs/rediseno/capturas-203/`), viewport 390×844 (07: 320×844), sin `fullPage`

Sin Supabase en este árbol: arnés temporal `src/app/arnes203-temporal/` (datos inventados — el artista «Los
Vecinos» y el lugar «Casa 1100», más una ruta `?n=` para elegir 2/3/4/6 enlaces y una ruta aparte para el
título de letras anchas — con los componentes reales `FormularioArtista`, `FormularioLugar` y el bloque de
«Enlaces» de la ficha de artista, con el `Ficha.module.css`/`lib/ficha.ts` ya corregidos), servido con
`next build && next start` en el puerto 4203 y capturado con el Chromium de `/opt/pw-browsers` vía
`playwright-core` (instalado con `npm i --no-save` en el scratchpad de la sesión, nunca en el repo). **Se
borró entero antes de comitear** (no aparece en `git status`; el build final, corrido después de borrarlo,
no lista ninguna ruta `/arnes203-temporal/…`). `document.fonts.check('700 20px "Bricolage Grotesque"')` →
`true`.

- **`01-formulario-artista-tres-enlaces.png`** (viewport, desplazado a «Redes y contacto», sin nada con
  foco): los tres enlaces pedidos — Mixcloud reconocido sin título propio (icono genérico, etiqueta
  «Mixcloud»), uno con título editado («Fotos del taller de cerámica», 28/30, completo, sin cortar) y uno con
  el título al tope exacto («Recital en vivo del 12 de sept», 30/30, completo). Una sola caja por enlace (el
  campo), sin borde envolvente; una sola ✕ por renglón (quitar, a la derecha).
- **`02-formulario-artista-titulo-con-foco.png`**: mismo estado, con el campo Título del segundo enlace con
  foco — borde morado del canon, contador 28/30 visible.
- **`03-ficha-artista-enlaces.png`** (reemplaza la de la primera entrega, que se salía 36.7px): la ficha de
  «Los Vecinos» con los tres botones de «Enlaces» — Mixcloud, el de título editado y el del tope, los tres
  dentro de su círculo, sin cortarse por el borde de la pantalla.
- **`04-formulario-lugar-enlace-titulo.png`**: «Casa 1100» con un enlace (Vimeo) con título editado
  («Recorrido por la casa»), mismo `Campo` y misma rejilla plana que en artistas.
- **`05-formulario-artista-ocho-enlaces.png`**: ocho enlaces pegados, el campo «Otro enlace» ya no aparece
  (estado E4 de doc 09, `LIMITE_ENLACES = 8`), sin scroll horizontal ni cajas anidadas.
- **`06-ficha-artista-cuatro-enlaces-390.png`**: cuatro enlaces con título de 28–30 caracteres cada uno, los
  cuatro círculos repartidos, ninguna etiqueta fuera de su círculo.
- **`07-ficha-artista-cuatro-enlaces-320.png`**: lo mismo a 320px — sin scroll horizontal de página (el
  hallazgo de 4px del último círculo queda dentro del propio carril de `.acciones`, documentado arriba).

## Lo que no se tocó

- El círculo (`.accionIcono`) ni el `min-width: 64px` de `.accion` en `Ficha.module.css` (pedido explícito
  del gestor); el desborde de 4px a 320px con 4 enlaces que causa ese `min-width` (ajeno al título, medido
  arriba) queda anotado, no corregido.
- `src/app/eventos/[id]/page.tsx` («Compartir», «A mi calendario», «Cómo llegar»): etiquetas fijas y cortas,
  sin título editable, fuera del alcance de esta pieza; no comparten fila con enlaces de título largo.
- El flujo de reconocer lo pegado (`reconocerEnlace`, `@usuario`, teléfono, el límite de 8, los avisos en
  línea): sin cambios.
- Las 18 redes de `REDES` (13 de antes + 5 de esta pieza): ninguna se quitó ni cambió de dominio o etiqueta.
- No hizo falta migración (medido en la primera entrega) ni tocar `src/app/artistas/acciones.ts` ni
  `src/app/lugares/acciones.ts`.

## Cierre

Sin push ni PR (los da el gestor). Commit local en `enlaces-titulo-y-redes` con
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
