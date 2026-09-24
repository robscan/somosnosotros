# 217 · Agregar lugar sin inventar ubicación (OL-182)

**Fecha:** 2026-09-24 · **Rama:** `donde-es-agregar-ubicacion`, desde `origin/main` · **OL:** OL-182 · **De dónde
sale:** dos defectos que el founder encontró en producción en su iPhone, 2026-09-24, sobre la hoja «¿Dónde es?» de
OL-173/OL-179 (bitácoras [208](208-lugar-evento-pantalla-app.md) y [214](214-lugares-privados.md)) y
[43-lugar-evento-pantalla.md](../../../rediseno/43-lugar-evento-pantalla.md) (sección «Agregar lugar, segunda
versión»).

## Qué reportó el founder, textual

> cuando se guarda un lugar, ejemplo "laboratorio de arte escenico" mira como el listado de sugerencias se
> sobrepone al cta de guardar nuevo lugar, luego, cuando selecciono la opcion de guardar nuevo lugar, no me deja
> especificar la ubicación, solo guarda el lugar con una ubicación que no sé de dónde sacó. Error grosso.

## Entrega en dos partes

**Parte 1** (prototipo): commits `6625cb9` y `0e9ecb0` en esta misma rama, ya revisados por el gestor.
`docs/rediseno/prototipos/lugar-evento-agregar.html` con los cuatro estados y sus capturas en
`docs/rediseno/capturas-217/proto-*.png`; el segundo commit corrigió, sobre la primera entrega, que la lista de
sugerencias de dirección abría encima del campo en uso (ver ese mismo doc, sección «Corrección del gestor…»).
**Parte 2** (esta bitácora): código, con capturas reales de la app.

## Archivo por archivo

### `src/components/ui/ListaFlotante.tsx` (+ `.test.ts`) — `reservaAbajo`

`calcularPosicion` gana un quinto parámetro, `reservaAbajo = 0` (px), que se resta del espacio de abajo antes de
decidir si abre hacia arriba y cuánto alto máximo le cabe -exactamente el primer defecto reportado: con tres
resultados largos, la lista llegaba hasta el teclado y la barra «Agregar» (pegada sobre él) quedaba tapada, porque
`calcularPosicion` no sabía que esa barra ocupaba el final del espacio «visible». El componente gana la prop
`reservaAbajo?: number` (0 por omisión, mismo comportamiento de siempre), leída dentro del bucle de posición con el
mismo patrón de `ref` que ya usaba `dentro` (un valor nuevo por render no debe reiniciar el
`requestAnimationFrame`). 4 pruebas nuevas: sin reserva se comporta igual que antes; con reserva se achica pero
sigue abriendo abajo si aún cabe; puede forzar la apertura hacia arriba cuando sin reserva habría abierto hacia
abajo; nunca se estira más allá de lo que deja la reserva.

### `src/app/eventos/dondeEsPantalla.ts` (+ `.test.ts`) — `puedeGuardarLugar`

Función pura nueva: `puedeGuardarLugar({ nombre, punto })` -verdadero solo con nombre (recortado) Y punto, nunca
con un punto `null`. Es la comprobación central del segundo defecto: antes, sin punto, `abrirAgregar()` inventaba
uno en el centro de contexto; ahora el botón «Guardar y usar este lugar» usa esta función para su `disabled`, y
`guardarAgregar()` la vuelve a comprobar antes de llamar al servidor (nunca confía solo en el botón). 4 pruebas.
`decidirGuardado` y `modoDePantalla` no cambiaron de contrato (encargo).

### `src/components/MapaDondeEs.tsx` — `paddingInferior`

Prop nueva, `paddingInferior?: number` (0 por omisión): se pasa como `padding: { top, bottom, left, right }` a
`flyTo`/`easeTo` cada vez que el mapa recentra -tanto al mover el pin (efecto ya existente, ahora también reacciona
a que cambie SOLO el padding, con un `ref` que recuerda el último aplicado, para recentrar si la hoja crece o se
achica con el mismo punto) como cuando NO hay selección todavía (efecto nuevo: el centro por omisión -la ciudad de
contexto- también debe quedar visible arriba de la hoja, no tapado por ella). Sin esto, con zoom 16 el pin queda
exactamente al centro del contenedor del mapa, que with la hoja «Agregar lugar» abierta puede caer bajo ella.
**No se pudo comprobar con Mapbox real en este entorno** (sin token, igual que 208): el mecanismo (`padding` de
Mapbox GL) está documentado y es el que la propia librería ofrece para esto; queda para que el founder lo confirme
en su iPhone.

### `src/app/eventos/HojaDondeEs.tsx` — la hoja «Agregar lugar», reescrita

- **`abrirAgregar()` ya NO inventa ningún punto.** Se quitó por completo el `if (!draft?.punto) void
  moverPin(contexto.centro, …)`. Si `draft` ya tenía un punto puesto A MANO (un POI, el mapa, «Estoy aquí»), se
  conserva tal cual -la hoja abre con «Guardar» ya encendido, como pide el encargo-; si `draft` era un lugar YA
  REGISTRADO (una selección completa de otro lugar existente), se limpia -no tiene sentido heredar SU pin para uno
  nuevo- y la hoja abre sin punto, con «Guardar» apagado.
- **La hoja, media pantalla pegada abajo.** Nuevo `<div className={styles.hojaAgregar}>` (no el panel flotante de
  antes): `position: absolute; left/right/bottom: 0`, con el mismo mecanismo de `visualViewport` que ya movía
  `.barraAcciones` (`bottom: bottomBarra`, el estado que da `altoTeclado`). El mapa queda SIEMPRE visible arriba
  -nunca tapado por la hoja-, con el pin recentrado por `paddingInferior` (medido con `ResizeObserver` sobre la
  propia hoja, `altoHoja`).
- **Tres maneras de fijar el punto, las tres a la vista:**
  1. El campo «Dirección», DENTRO de la hoja: mismas dos fuentes que el campo principal (lugares registrados +
     Mapbox, `combinarResultados` reutilizada tal cual, con su propia sesión de Mapbox y su propia
     `ListaFlotante`, ancla al campo, `reservaAbajo={0}`). Elegir un lugar registrado aquí no cambia de modo -sigue
     siendo «Agregar lugar»-, solo presta su punto y su dirección (`fijarPuntoDesdeDireccion`), igual que una
     dirección o un POI de Mapbox.
  2. Tocar o arrastrar el pin en el mapa: los mismos `onLugar`/`onPoi`/`onPunto`/`onArrastre` de siempre, sin
     tocar -ya llamaban a `moverPin`, que ahora también sincroniza el campo «Dirección» de la hoja
     (`qDireccionAgregar`) con lo que resuelva el reverse geocoding.
  3. «Estoy aquí»: dejó de cerrar la hoja (`estoyAquiClick` ya no llama `setPanelAgregar(false)`) -antes, si se
     tocaba con la hoja abierta, la cerraba de golpe; ahora se queda abierta, con el punto puesto, como cualquiera
     de las otras dos maneras.
- **«Guardar y usar este lugar» apagado sin punto**, con `puedeGuardarLugar` en el `disabled` y una segunda
  comprobación al inicio de `guardarAgregar()`. Debajo, en texto chico (canon de formularios, OL-100: «la ayuda de
  qué falta va debajo del campo o del renglón, nunca dentro del botón»): «Falta la ubicación: busca la dirección,
  toca el mapa o usa «Estoy aquí».» -solo cuando falta el punto (el nombre casi nunca falta, llega prellenado).
- **La lista de dirección nunca abre encima del campo en uso** (corrección que pidió el gestor sobre la primera
  entrega del prototipo de esta pieza, aplicada aquí igual en código): cuando esas sugerencias tienen que abrir y
  no hay sitio abajo (el campo queda bajo, pegado sobre el teclado), la propia hoja gana la clase `.expandida`
  (`top` sube, `overflow-y: auto`) y un efecto pone su `scrollTop` para que el campo «Dirección» quede lo más
  arriba posible dentro de ella -el mismo criterio que `scrollIntoView({ block: "start" })`. Con eso, el espacio
  libre hasta el teclado deja de estar acotado por el resto de la hoja (nombre, privado, botón) y la MISMA
  `ListaFlotante`/`calcularPosicion` de siempre -sin ningún caso especial para «nunca arriba»- elige «abajo» por
  sí sola, con margen de sobra.
- **«Estoy aquí» siempre encima de la hoja, nunca debajo** (`estoyAquiBottom` usa `altoHoja` en vez de la
  constante de la barra cuando `panelAgregar` es cierto; `z-index` 11 contra el 10 de la hoja, doc 43).
- El resto de OL-173/OL-179 se conserva sin tocar: un solo botón «Agregar» en la barra, lugar privado
  (`decidirGuardado`), reutilización a 150 m (`crearLugarDesdeEvento`, sin cambios), `dentro={[barraRef]}` en la
  lista principal, «Listo»/«Atrás».

### `src/app/eventos/HojaDondeEs.module.css`

`.panelAgregar`/`.direccionFija` (el panel flotante viejo) sustituidos por `.hojaAgregar` (+ `.expandida`,
`.asaHoja`) y `.campoDireccion` (mismo trato visual que el campo principal `.campo`, sin su margen -va dentro de
`.campoPanel`, que ya separa). `.campoPanel` se reutiliza tal cual para los dos campos (Nombre y Dirección).
`.ayudaGuardar` nueva. `.estoyAqui` sube de `z-index: 6` a `11` (por encima de la hoja, 10). `.hojaAgregar > *` con
`flex-shrink: 0` -con la hoja expandida y desplazable, el contenido manda su alto de verdad, nunca se aplasta.

## Decisiones tomadas donde el encargo no llegaba

1. **La lista de dirección mezcla lugares registrados y Mapbox**, igual que el campo principal -no solo «Mapbox»
   como una primera lectura del encargo podía sugerir. Elegir un lugar registrado ahí solo presta su punto y su
   dirección (no cambia de modo, no toca el nombre): es coherente con «sugerencias de direcciones y POIs, como el
   campo de arriba», y además es lo que permitió capturar el estado (c) SIN token de Mapbox en este entorno (las
   coincidencias de lugares registrados son puramente del lado del cliente).
2. **`MapaDondeEs` recibe `paddingInferior` en vez de mover el `centrarEn`.** El encargo decía «decide tú en el
   código»: usar el propio mecanismo de `padding` de Mapbox GL (pensado exactamente para esto) es más simple y
   fiel que recalcular manualmente coordenadas o zoom.
3. **El botón «Estoy aquí» YA NO cierra la hoja «Agregar lugar».** Antes de esta pieza, `estoyAquiClick` siempre
   hacía `setPanelAgregar(false)` -tenía sentido cuando «Estoy aquí» solo servía para el resumen de la pantalla
   principal-; ahora que es una de las TRES maneras de fijar el punto con la hoja abierta, cerrarla de golpe sería
   quitarle una de las otras dos salidas (el encargo pide expresamente que las tres queden visibles a la vez).
4. **El aviso «Falta la ubicación» solo habla de la ubicación**, no de un genérico «falta algo»: el nombre llega
   prellenado con lo que ya se escribió arriba, así que casi nunca es lo que falta; el texto exacto que pidió el
   founder («busca la dirección, toca el mapa o usa «Estoy aquí»») ya lo dice.

## ¿Hace falta una migración?

No. Mismo modelo de datos que OL-173/OL-179 (`OtroSitio`, `lugares`); esta pieza solo cambia cuándo y cómo se
llena, nunca qué se guarda.

## Verificación

```
npm run lint && npm run typecheck && npm test && npm run build
```

Los cuatro en verde: lint sin errores (1 warning preexistente y sin relación,
`docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio; **1183 pruebas, 96 archivos** (8 nuevas de esta pieza -4
en `ListaFlotante.test.ts`, `reservaAbajo`; 4 en `dondeEsPantalla.test.ts`, `puedeGuardarLugar`- sobre la base ya
traída de `origin/main`, ninguna rota); build completo, sin la ruta del arnés (ver «Capturas» abajo) en el árbol
de rutas final.

### Capturas reales (`docs/rediseno/capturas-217/`), 390×844 (y 320×844 la 05)

`next build && next start` (puerto 4217, libre), Chromium real de `/opt/pw-browsers/chromium` vía `playwright-core`
(instalado en el scratchpad de la sesión, nunca en el repo). Sin `--ignore-certificate-errors` (todo corre por
`http://127.0.0.1`, no pasa por el proxy de la sesión). Arnés temporal `src/app/arnes217-temporal/donde-es/`
(monta el componente real `HojaDondeEs` directo, con cinco lugares inventados -tres con nombre y dirección al tope
de largo, el caso real del founder- y `onEstoyAqui` resuelto al instante con un punto fijo, sin backend) —
**se borró entero antes de comitear**, `git status --short` limpio (comprobado, ver «Cierre»).

Teclado simulado con un `visualViewport` de mentira (una clase `EventTarget` propia, instalada con
`context.addInitScript` ANTES de que cargara la app, para que tanto el efecto de `HojaDondeEs` como el bucle de
`ListaFlotante` -que lo lee en cada cuadro- vieran el mismo objeto desde el arranque) recortado a mano 300 px y con
su propio evento `resize` disparado -mismo espíritu que OL-179/bitácora 214. **Sin token de Mapbox en este
entorno** (`NEXT_PUBLIC_MAPBOX_TOKEN` no está configurado aquí): el mapa muestra «Falta el token de Mapbox»; las
sugerencias de dirección de las capturas usan coincidencias de LUGARES REGISTRADOS (cliente, sin red) por la
decisión 1 de arriba, así que sí se pudieron capturar de verdad, sin inventar nada fuera del propio componente.

En cada captura: `document.documentElement.scrollWidth` no mayor que su `clientWidth` y ningún elemento (fuera del
SVG del mapa, que se recorta con su propio `viewBox`) con el borde derecho más allá de él -medido con un script
propio antes de cada captura; las cinco salieron limpias. Hidratación comprobada con un toque real (escribir una
letra y ver aparecer el botón «Borrar lo escrito») antes de empezar, por la advertencia de OL-109 sobre capturas
que «parecen» buenas sin haber hidratado.

- **`01-lista-sobre-barra.png`:** «laboratorio» escrito, los tres resultados largos del caso real del founder, y
  la lista deteniéndose justo encima de «Agregar «laboratorio» como lugar», con el teclado simulado debajo.
- **`02-agregar-sin-punto.png`:** la hoja «Agregar lugar» recién abierta (sin ninguna coincidencia arriba, «El
  Teatrito de la esquina»), sin punto: mapa vacío (sin token) visible arriba con «Estoy aquí» ENCIMA de la hoja,
  «Nombre» prellenado, «Dirección» vacía, interruptor apagado, «Guardar y usar este lugar» apagado con el porqué
  debajo.
- **`03-sugerencias-direccion.png`:** el campo «Dirección» de la hoja con «Industrias» escrito y su sugerencia
  (un lugar registrado, «Laboratorio de Arte Escénico Universitario · Av. Industrias 101…») abierta DEBAJO del
  campo -nunca encima-, con el teclado simulado y la hoja ya estirada para dejarle sitio.
- **`04-punto-fijado.png`:** tras elegir esa sugerencia, «Dirección» con «Av. Industrias 101, Zona Industrial»,
  «Guardar y usar este lugar» encendido (violeta sólido), sin teclado.
- **`05-agregar-sin-punto-320.png`:** el estado 02 a 320 px, el peor caso de ancho: nada se sale, el texto de
  ayuda se ajusta a dos líneas.

## Qué debe probar el founder en su iPhone (con Mapbox real)

1. Que el pin (con `paddingInferior`) y el centro por omisión queden de verdad en la parte visible del mapa,
   arriba de la hoja «Agregar lugar» -es lo que no se pudo comprobar sin token (decisión 2 de arriba).
2. Con el teclado real del iPhone (aquí solo simulado): que la hoja se estire lo justo y las sugerencias de
   dirección abran siempre debajo del campo, incluso con una dirección larga (dos líneas) o el teclado con la
   barra de autocompletar (más alta que los 300 px simulados aquí).
3. Que «Estoy aquí» funcione con la hoja abierta (geolocalización real) y el punto se refleje en el campo
   «Dirección» sin cerrarla.
4. El caso real que reportó: escribir «laboratorio de arte escenico» (o similar), ver que la lista ya no tapa la
   barra, tocar «Agregar», y confirmar que la ubicación NUNCA se guarda sola -siempre hace falta elegir una
   dirección, tocar el mapa o usar «Estoy aquí».

## Correos en el diff

`git diff origin/main..HEAD -- src/components/ui/ListaFlotante.tsx src/components/ui/ListaFlotante.test.ts src/app/eventos/dondeEsPantalla.ts src/app/eventos/dondeEsPantalla.test.ts src/app/eventos/HojaDondeEs.tsx src/app/eventos/HojaDondeEs.module.css src/components/MapaDondeEs.tsx | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'`
no encontró ninguna dirección.

## Cierre

`git status --short` de `/home/user/somosnosotros` (la carpeta principal, NUNCA tocada por esta pieza) vacío,
comprobado. `git status --short` del árbol propio limpio de artefactos de build (`.next/` en `.gitignore`) y sin
el arnés (`src/app/arnes217-temporal/` borrado, no aparece en `npm run build` final). Commits locales en
`donde-es-agregar-ubicacion`, `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Sin nombres de modelos de
IA en ningún archivo del repo. Sin PR (lo da el gestor); `git push origin donde-es-agregar-ubicacion` al terminar.
