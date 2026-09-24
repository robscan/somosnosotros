# 209 · Cabecera de Lugares con chip de fecha, en la app: código de OL-170 (OL-174)

**Fecha:** 2026-09-24 · **Rama:** `lugares-cabecera-fecha-app`, desde `origin/main`. Código de la propuesta de
OL-170 (bitácora [205](205-lugares-cabecera-fecha.md), documento
[`docs/rediseno/45-lugares-cabecera-fecha.md`](../../../rediseno/45-lugares-cabecera-fecha.md)), calcando el
prototipo firmado en las secciones «OL-170» de
[`docs/rediseno/prototipos/cabeceras.html`](../../../rediseno/prototipos/cabeceras.html) y
[`mapa-lugares.html`](../../../rediseno/prototipos/mapa-lugares.html).

## El encargo

1. Chip de fecha, un solo componente en Agenda y Lugares.
2. En Lugares: el chip va antes del de ciudad; con fecha elegida, el mapa solo pinta los pines con evento ese
   día, con su estado vacío; la Lista no filtra por fecha (pedido literal del founder).
3. «Ver en lista»/«Ver en mapa» sale del renglón 1 de la cabecera y flota, secundario, sobre «Registrar lugar».
4. El chip de ciudad se encoge y corta antes de tocar la lupa, que nunca cede.

## Qué se hizo

### 1. `src/lib/fechas.ts` — `fechaCortaChip()`

Función pura nueva, con prueba: «mié 30 sep» — día de la semana en tres letras con acento y en minúscula
(`Intl.DateTimeFormat("es-MX", { weekday: "short", ... })`), número sin cero a la izquierda, mes en tres
letras, sin «de» (se quita con un `replace`) y sin año. **No** toca `diaCorto`/`diaCortoDe`: esas dos siguen
igual (las usan los títulos «Hoy»/«Mañana» de las listas de Agenda, `RenglonEvento`, `panel.ts`, `avisos.ts` y
`destacados.ts` — tocarlas habría cambiado pantallas fuera del encargo de esta pieza). Decisión tomada:
**el chip nunca dice «Hoy»/«Mañana», siempre fecha corta** — la recomendación del doc 45, convertida en
decisión por defecto del gestor el 2026-09-24 porque el código de Agenda anterior a esta pieza sí mostraba
«Mañana» como caso especial en su chip (línea documentada como «pendiente de firma» en el doc 45); cambiado y
anotado aquí, no en el chat del founder.

### 2. `src/components/ui/ChipFecha.tsx` (+ `.module.css`) — el componente compartido

Antes, el bloque del chip de fecha vivía repetido dentro de `AgendaInicio.tsx` (icono/pill/hoja/input nativo,
~50 líneas). Se extrajo a `ui/ChipFecha.tsx`, con las mismas piezas de siempre (`SelectorFecha` para
escritorio con puntero fino, `usePunteroFinoAncho`, el `<input type="date">` nativo para táctil/móvil) y ahora
lo usan **los dos** — `AgendaInicio.tsx` y `VistaLugares.tsx` — como pedía el encargo («mismo componente»).
Sin fecha: `aria-label="Elegir fecha"` (el texto exacto que pidió el encargo), botón redondo de 40×40, sin la
palabra «Seleccionar», con un `::before { inset: -4px }` que sube el área de toque a 48px sin cambiar lo que
se ve. Con fecha: pastilla con el texto de `fechaCortaChip()` y su quitar (✕) — como hoy, quitar vuelve al
ícono solo, no reabre el selector. A diferencia del chip de ciudad, **nunca se encoge**: no lleva
`chip.deContexto` (esa clase sí encoge, con `flex: 0 1 auto`); el `.chip` base de `Chip.module.css` ya es
`flex: none`, así que basta con no aplicar `.deContexto` — nada que inventar. `AgendaInicio.module.css` perdió
las reglas `.marcado`/`.quitar` (movidas a `ChipFecha.module.css`).

### 3. `src/lib/lugares.ts` — filtro de pines por día

Dos funciones puras nuevas, con prueba:

- `diasConEvento(lugares, eventos)`: por lugar, el conjunto de días (YYYY-MM-DD, en la zona del propio evento)
  en que tiene un evento próximo — de los mismos eventos que `conProximo` ya usa para el «próximo evento» de
  cada pin, sin otra consulta.
- `lugaresConEventoElDia(lugares, fecha)`: filtra los lugares que tienen ese día en su `diasEvento`.

`LugarLista` gana un campo opcional `diasEvento?: string[]` (no rompe los usos existentes de `conProximo`, que
no lo rellenan). `src/app/lugares/page.tsx`: `cargar()` llama `diasConEvento` sobre los mismos `eventos` que ya
trae para `conProximo` — la consulta de eventos (`.or(filtroSinPasar())`, sin tope de días, solo de cuántos
eventos trae: 500) ya cubre cualquier fecha futura razonable que la persona elija, así que **no hizo falta una
consulta nueva ni una migración**: el pedido del encargo era «si la fecha cae fuera de lo que ya se carga,
carga lo que falte con la consulta más chica posible» y, en la práctica, con el tope de 500 eventos sin límite
de días, nunca cae fuera. Queda anotado como límite conocido si la ciudad llega a tener más de 500 eventos
próximos a la vez (no es el caso hoy: decenas).

### 4. `src/app/lugares/VistaLugares.tsx` — la cabecera, el filtro y el conmutador

- `Cabecera` ya no recibe `acciones` (el botón redondo Mapa · Lista salió del renglón 1); `contexto` ahora es
  `<ChipFecha /><ChipCiudad />`, mismo orden que Agenda.
- Estado `fecha` nuevo (como `busqueda`), guardado en `useMemoriaPantalla` junto con `vista`/`busqueda` (igual
  que Agenda guarda su `fecha`).
- `CuerpoLugares` filtra `enMapa` con `lugaresConEventoElDia` solo para lo que pinta `<Mapa>` (`pinesDelDia`);
  la Lista (`ListaLugares`) sigue recibiendo `lugaresDelTipo` sin filtrar por fecha — el pedido literal del
  founder («la idea de traer chip de fecha a mapa es para filtrar por fecha precisamente»).
- Estado vacío `Ningún lugar tiene eventos ese día` (`.vacioFecha`, sobre el lienzo) cuando hay fecha elegida y
  `pinesDelDia.length === 0`.
- «Ver en lista»/«Ver en mapa» (`.verOtraVista`, `lugares.module.css`): `position: fixed`, misma fórmula que
  `Publicar.module.css` (`bottom: var(--alto-nav) + safe-area + espacio-4`) más el alto del propio «Registrar
  lugar» (`--toque`, 48px) y 12px de aire — 76px del borde total, como midió el doc 45 sobre el prototipo. Se
  retira cuando la hoja del pin está abierta, igual que «Registrar lugar» (mismo `{!elegido && ...}`).

### 5. Lo que ya existía y no se tocó

El chip de ciudad (`components/Ciudad.tsx`) ya usaba `chip.deContexto` (el mecanismo de encoger + `…`): no
hizo falta escribir nada nuevo para el punto 4 del encargo, solo comprobar con medidas reales que sigue
funcionando ahora que el renglón 1 tiene tres elementos en vez de dos.

## Pruebas

```
npm run lint && npm run typecheck && npm test && npm run build
```

Verdes: lint 0 errores (1 warning preexistente ajeno, `docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio;
**1080 pruebas, 89 archivos** (`fechas.test.ts` pasó de 26 a 29 con `fechaCortaChip`; `lugares.test.ts` de 14 a
18 con `diasConEvento`/`lugaresConEventoElDia`); build completo, sin la ruta del arnés en el árbol de rutas
final.

## Capturas reales (`docs/rediseno/capturas-209/`), 390×844 (y una a 320)

`next build && next start` (puerto 4209), Chromium de `/opt/pw-browsers` vía `playwright-core` (instalado con
`npm i --no-save` en el scratchpad de la sesión; `package.json`/`package-lock.json` intactos, comprobado con
`git status`). Sin `--ignore-certificate-errors`: la letra Bricolage Grotesque la sirve `next/font/google`
autohospedada desde el propio build (se descarga una vez al compilar, no en cada visita), no un `<link>` a
Google Fonts en el navegador — a diferencia del prototipo HTML suelto de la bitácora 204/205, aquí no hace
falta tocar el proxy ni la CA. Confirmado con `document.fonts` (familia "Bricolage Grotesque", `status:
"loaded"`) antes de cada captura.

Arnés temporal `src/app/arnes209-temporal/` (dos rutas, `agenda/` y `lugares/`, con datos inventados —
ciudades y lugares de ejemplo, sin Supabase configurado en este árbol de trabajo — y los componentes reales:
`AgendaInicio`, `VistaLugares`, `Barra`, `Sesion`, `NavInferior`, `Publicar`), **borrado entero antes de
comitear** (`git status --short` limpio, comprobado al final). **Sin token de Mapbox en este entorno:** el
lienzo del mapa sale vacío («Falta el token de Mapbox (NEXT_PUBLIC_MAPBOX_TOKEN)»); el filtro de pines en sí no
se puede ver (Mapbox no llega a dibujar nada, con o sin fecha elegida) — lo que sí es real y se ve en las
capturas es el chip, el estado vacío «Ningún lugar tiene eventos ese día» (ese aviso lo decide React, no
Mapbox: se ve igual con o sin token) y la posición de los botones flotantes. No se dibujaron pines de prueba a
mano en el arnés (la alternativa que permitía el encargo): la lógica del filtro ya tiene su propia prueba
unitaria (`lugaresConEventoElDia`), y dibujar pines falsos habría sido decorado, no evidencia.

- **`01-agenda-chip-icono.png`:** Agenda, el chip de fecha en su estado inicial, solo el ícono, sin
  «Seleccionar»; mismo alto que el chip de ciudad y la lupa.
- **`02-agenda-mie-30-sep.png`:** Agenda, con «mié 30 sep» elegido (sin «de»), con su quitar (✕), borde violeta.
- **`03-lugares-mapa-chip-icono.png`:** Lugares (Mapa), chip de fecha solo ícono antes del de ciudad, y «Ver en
  lista» flotando sobre «Registrar lugar»; el botón de ubicación intacto abajo a la izquierda.
- **`04-lugares-mapa-filtrado.png`:** Lugares (Mapa) con «jue 24 sep» elegido (fecha con un lugar de ejemplo
  con evento ese día en los datos del arnés). Ver la nota de Mapbox arriba: el lienzo no cambia visualmente.
- **`05-lugares-mapa-vacio.png`:** Lugares (Mapa) con «lun 21 sep» elegido (ningún lugar del arnés tiene evento
  ese día): «Ningún lugar tiene eventos ese día», sin solaparse con «Ver en lista» ni «Registrar lugar».
- **`06-lugares-lista-ver-en-mapa.png`:** Lugares (Lista), «Ver en mapa» en el mismo sitio exacto que «Ver en
  lista» en el Mapa.
- **`07-cabecera-ciudad-larga-390.png`:** «Dolores Hidalgo Cuna de la Independencia Nacional» con «mié 30 sep»
  elegido, a 390px: la ciudad se corta con «…» antes de tocar la lupa, que queda intacta.
- **`08-cabecera-ciudad-larga-320.png`:** lo mismo a 320px (el ancho mínimo del proyecto): recorte más severo
  («D…»), sin overlap ni scroll horizontal de la página.

Medido con `getBoundingClientRect()` (script aparte, borrado con el arnés) en los seis estados: `scrollWidth >
innerWidth` falso en los seis; el borde derecho del chip de ciudad nunca cruza el borde izquierdo de la lupa;
«Ver en lista»/«Ver en mapa» y «Registrar lugar» nunca se solapan (12px de aire exactos entre los dos, como
predijo el doc 45).

## Decisiones tomadas en esta pieza (código, sin volver a preguntar lo ya dicho)

1. **El chip nunca dice «Hoy»/«Mañana», siempre fecha corta** (opción b del doc 45, su recomendación) —
   decisión por defecto del gestor, 2026-09-24; cambia el comportamiento de Agenda respecto al código anterior
   a esta pieza (antes sí mostraba «Mañana»).
2. **El chip de fecha nunca se encoge** (a diferencia del chip de ciudad): no estaba escrito en el doc 45 como
   regla explícita para el código, pero es lo que muestra el CSS del propio prototipo (`.chip170`/`.chipFecha`
   son `flex: none` por base; solo `.conRegla170` en el chip de ciudad activa el encogimiento) y es lo que
   pedían las medidas de la tabla del doc 45 (el chip de fecha midió 133px fijos en las doce filas).
3. **Sin consulta nueva para `diasEvento`**: la consulta de eventos que ya carga `src/app/lugares/page.tsx`
   (sin tope de días, solo de cantidad) alcanza para cualquier fecha razonable; no se implementó una consulta
   condicional aparte (ver «Límites» abajo).

## Preguntas abiertas del doc 45, sin resolver aquí (fuera del encargo de esta pieza)

- Si la Lista de Lugares también debería filtrar por fecha (el founder solo pidió el mapa; el código respeta
  eso literalmente).
- Cómo se combinan «Cercanos» y la fecha elegida, si se eligen los dos a la vez (no se tocó `verCercanos`).
- Un ancho mínimo para el chip de ciudad (el código usa el mecanismo existente, sin tope nuevo).

## Límites conocidos

- El filtro de pines por día depende de que la consulta de eventos (tope 500, sin tope de días) alcance a
  cubrir la fecha elegida; con una ciudad que llegue a tener más de 500 eventos próximos a la vez, una fecha
  lejana podría quedar fuera de lo cargado. No es el caso hoy (decenas de eventos); si crece, hace falta una
  consulta aparte para la fecha elegida (fuera de esta pieza).
- Sin token de Mapbox en este árbol de trabajo, no se pudo ver el filtro de pines pintado de verdad en las
  capturas (ver la nota en «Capturas» arriba); la lógica del filtro tiene su propia prueba unitaria.

## Correos en el diff

```
git diff origin/main..HEAD | grep -E '^[+-]' | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+' | sort -u
```

Un único acierto, `analytics@2.0.1`, que no es un correo: es la versión de un paquete (`@vercel/analytics`)
mencionada dentro del texto histórico ya existente de `OPEN_LOOPS.md` (línea «Last updated», de antes de esta
pieza), no algo que esta pieza haya escrito. Ninguna dirección de correo real en el diff.

## Cierre

Commit local en `lugares-cabecera-fecha-app` con `Co-Authored-By: Claude Fable 5.1
<noreply@anthropic.com>`; push a `origin/lugares-cabecera-fecha-app`. Sin PR (lo abre el gestor). `git status
--short` limpio, comprobado.
