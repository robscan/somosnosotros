# 208 · Lugar del evento a pantalla completa, en código (OL-173)

**Fecha:** 2026-09-24 · **Rama:** `lugar-evento-pantalla-app`, desde `origin/main` · **OL:** OL-173 (código de
OL-169) · **De dónde sale:** [43-lugar-evento-pantalla.md](../../../rediseno/43-lugar-evento-pantalla.md) (LA
ESPECIFICACIÓN, variante B), [26-alta-evento-lugar.md](../../../rediseno/26-alta-evento-lugar.md) (OL-100, cascada de
contexto) y la bitácora [172](172-alta-evento-buscar-lugar.md) (OL-137, lo que falló de la hoja de hoy).

## Qué pidió el founder, resumido

La hoja «Dónde es» de hoy tapaba el mapa con las sugerencias y las dos salidas («Agregar» y «Buscar en el mapa sin
agregar») quedaban debajo del teclado. El doc 43 (firmado con la variante B: barra de acciones sticky) pide
reconstruirla a pantalla completa: mapa Mapbox de fondo con los lugares ya registrados como pines tocables, un solo
campo «Nombre o dirección», sugerencias en una lista flotante que nunca tapa nada, pin arrastrable, «Estoy aquí» con
nombre editable, y registro automático del lugar salvo que la persona diga que es privado.

## Archivo por archivo

### `src/app/eventos/HojaDondeEs.tsx` — reescrito entero

Mismo nombre de archivo y mismo contrato hacia fuera (`OtroSitio` sin cambios, mismos props salvo uno) para no tocar
nada que no hiciera falta: `FormularioEvento.tsx` la sigue montando igual. Por dentro es una pantalla nueva:

- **Capa fija a pantalla completa** (`position: fixed; inset: 0`), con cabecera «‹ Atrás» / «¿Dónde es?» / «Listo»
  (patrón de `39-texto-largo.md` y `CampoLargo.tsx`, con «Atrás» de más porque aquí sí hace falta deshacer: la
  ubicación de un evento no es un solo campo de texto). Todo el estado (el pin en construcción, el texto de
  búsqueda, el panel) vive **dentro** de la hoja; nada se avisa al padre (`onLugar`/`onOtro`) hasta tocar «Listo».
  «Atrás» solo cierra: como no se avisó nada, no hay nada que deshacer.
- **Un solo campo** «Nombre o dirección» sobre el mapa. Al escribir (3+ letras), una búsqueda en Mapbox Search Box
  (`sugerirLugares`, ya usada en OL-137) con la misma cascada de contexto y el mismo reintento automático de OL-100
  (`buscarConContexto`, `direccionContexto.ts`, sin tocar). Los lugares registrados se filtran en el propio
  teléfono (`lugaresPorTexto`, ya existía).
- **Lista flotante** (`ui/ListaFlotante`, reutilizada tal cual): lugares registrados primero, luego lo de Mapbox
  (`combinarResultados`, nuevo, puro). Nunca empuja nada ni queda bajo el teclado (es lo que ya resuelve
  `ListaFlotante` con su portal).
- **El pin**: tocar un lugar registrado, un punto de interés del mapa o cualquier punto vacío mueve el pin
  (`moverPin`, con reverse geocoding local vía `lugarDesdePunto`, ya existía). Arrastrarlo hace lo mismo y muestra
  «Moviste el pin. Revisa que la dirección corresponda.».
- **«Estoy aquí»** (botón flotante, pide la ubicación con el mismo mecanismo de siempre —
  `onEstoyAqui`/`leerUbicacion`, sin cambios): pone el pin y deja el nombre editable ahí mismo.
- **Sin coincidencias**: aviso «no está registrado» y la barra de acciones (variante B) con «Agregar lugar»/«Agregar
  «texto» como lugar» y «Buscar en el mapa sin agregar», pegada sobre el teclado o al pie (ver `dondeEsPantalla.ts`
  abajo).
- **Panel «Agregar lugar»**: nombre, dirección ya resuelta por el pin, e interruptor «Es un lugar privado, no
  registrarlo». Sin privado, llama a la acción de servidor nueva (`crearLugarDesdeEvento`, ver más abajo) y, si
  tiene éxito, la selección pasa a ser un lugar registrado de verdad (con su id). Con privado, se queda como sitio
  del propio evento (igual que «Es en otro sitio» hoy, sin la variante «reservado» — decisión, ver abajo).
- **«Listo»**: si la selección es un lugar registrado, `onLugar(id, lugarNuevo?)`; si es manual y se tocó algo,
  `onOtro(...)` con `reservado: false`; si no se tocó nada (se reabrió la hoja sin cambiar nada), no avisa nada —
  para no pisar un sitio reservado ya guardado (ver la decisión sobre "reservado" abajo).

### `src/components/MapaDondeEs.tsx` + `.module.css` — nuevo

El mapa de fondo de esta pantalla. **No es `Mapa.tsx`**: esta pantalla necesita lugares tocables **y** un pin que se
mueve a cualquier punto **a la vez**, y ningún modo de `Mapa.tsx` da las dos cosas juntas (`modo="ver"` pinta
lugares pero no da las coordenadas de un toque vacío; `modo="elegir"` da cualquier punto pero no pinta lugares). Con
la instrucción del gestor de no tocar `Mapa.tsx` mientras OL-174 trabaja ahí en paralelo, se escribió un componente
aparte, con el mismo patrón (instancia única de Mapbox GL, capas por datos, tema claro forzado, `AttributionControl`,
`--primario` para los pines). **Queda señalado para unificar con `Mapa.tsx` más adelante**, cuando OL-174 esté en
`main` — hoy sería una tercera pieza compitiendo por el mismo archivo.

Toque de un punto de interés del propio estilo de Mapbox (paso 1 del encargo, «usa lo que Mapbox exponga»):
`poiTocado()` intenta `queryRenderedFeatures` en cualquier capa cuyo id o `source-layer` contenga «poi» (el
patrón de los estilos Streets/Standard de Mapbox) y, si encuentra un nombre, lo usa; si no encuentra nada (estilo
sin esa capa, o nada bajo el dedo), el toque cae en un punto vacío sin romperse. **No se pudo comprobar en este
entorno** (sin token de Mapbox, ver «Verificación» abajo) si el estilo de la cuenta del founder expone esa capa:
queda por confirmar en el iPhone real.

### `src/app/eventos/dondeEsPantalla.ts` (+ `.test.ts`) — nuevo, lógica pura

Tres piezas puras, sin red ni DOM, pedidas explícitamente para probar sin Mapbox:

- `combinarResultados(lugares, mapbox)`: concatena lugares registrados y resultados de Mapbox, cada lista en su
  propio orden (ninguna se reordena entre sí).
- `decidirGuardado(privado, nombre, direccion)`: registra o guarda privado, con el texto recortado.
- `altoTeclado(altoVentana, visualViewport)`: el alto del teclado según `visualViewport` (0 sin él o sin teclado
  abierto) — la barra de acciones se pega a ese alto por encima del pie.
- de propina, `modoDePantalla(texto, panelAgregar, hayResultados)`: qué se ve bajo el campo (inicial, resultados,
  no encontrado, o el panel).

14 pruebas.

### `src/app/lugares/acciones.ts` — una función nueva, `crearLugarDesdeEvento`

Reutiliza `crearLugar` entero (misma validación, misma regla de los 150 m: «un lugar es un lugar», `docs/DEFINICION.md`)
en vez de reinventar el alta. Dos decisiones que el doc 43 no cubría:

1. **El tipo del lugar**: el panel «Agregar lugar» es corto (nombre, dirección, privado) y no pide el tipo. Se
   deduce del nombre con `deducirTipo` (`@/lib/buscarLugares`, ya existía, es lo mismo que usa `FormularioLugar`
   cuando nadie lo elige a mano); sin ninguna pista, «Otro».
2. **Un lugar parecido a menos de 150 m**: `crearLugar` ya no duplica (devuelve `parecidos` en vez de insertar). La
   pantalla de agregar no tiene espacio para el «¿es este?» completo de `/lugares/nuevo`, así que en vez de fallar
   o preguntar de nuevo, **se usa el lugar que ya existe** (`reutilizado: true`) — coherente con «un lugar es un
   lugar», no una decisión nueva de privacidad ni de datos.

`siguiente` se manda con una ruta interna (`volverA`, la misma prop que antes llevaba a `/lugares/nuevo`) solo para
que `crearLugar` **nunca** redirija: aquí el resultado se usa en línea, sin navegar a ninguna parte. 5 pruebas
(`acciones.desde-evento.test.ts`, mismo banco de dobles que `direccion.acciones.test.ts`: `sesionOEntrar`, `rpc`,
`from` simulados, sin Supabase real).

### `src/app/eventos/FormularioEvento.tsx` — cambio chico

El lugar que «Agregar lugar» acaba de crear no está en `lugares` (esa lista la trajo el primer pintado del
servidor). Se agregó un estado propio, `listaLugares` (arranca igual a `lugares`), y `elegirLugar` gana un segundo
parámetro opcional (`nuevo?: LugarResumen`) que, si llega, se agrega a esa lista — así el renglón «Dónde» encuentra
el lugar recién creado sin recargar la página. Nada más cambió en este archivo.

## Decisiones tomadas donde el doc 43 no llegaba

1. **«Privado» no reutiliza «reservado».** El encargo mencionaba de pasada «como hoy Es en otro sitio → reservado»,
   pero «reservado» es otra cosa: la dirección exacta de un sitio público que se revela recién unas horas antes del
   evento (`revelarHoras`, `indicaciones`). El doc 43 (la especificación) nunca menciona esos campos en el panel
   corto de «Agregar lugar» (solo nombre, dirección, privado). Se implementó lo simple y consistente con el doc:
   «privado» = el sitio se guarda en el propio evento sin ficha pública, con la dirección visible siempre (el modo
   «otro» de hoy, no el «reservado»).
2. **Editar un evento ya reservado.** Si se reabre «Dónde» de un evento que hoy usa `sitio_reservado`, la hoja
   muestra su dirección (editable) pero **no** tiene ninguna manera de volver a marcarlo reservado (esa UI no
   existe en esta pantalla, doc 43 no la pide). Si la persona toca «Listo» sin tocar nada, no se avisa ningún
   cambio al padre (queda tal cual, reservado). Si toca o mueve el pin, sí se guarda — como sitio normal, ya no
   reservado. **Esto es una regresión real de una función existente y el founder debe confirmarla**: hoy no hay
   forma de crear ni volver a poner un evento en modo reservado desde esta hoja.
3. **Sin el botón «Usar mi ubicación para buscar cerca» de OL-100.** La cascada de contexto sigue completa (texto →
   pin ya puesto → chip de la Agenda → posición cacheada del teléfono → San Luis Potosí), pero el botón explícito
   para *pedir* la ubicación solo para acercar la búsqueda (sin mover el pin) se quitó: el doc 43 ya tiene su propio
   botón de ubicación, «Estoy aquí», que sí mueve el pin. Dos botones de ubicación en la misma pantalla parecía
   sumar, no simplificar.
4. **El error de red no se repite cuando ya se dijo «no está registrado».** Con Mapbox real, un error de conexión y
   «no hay coincidencias» rara vez coinciden; en las capturas (sin token) coincidían siempre y la lista podía
   crecer hasta tapar la barra de acciones. Se decidió mostrar el aviso de red solo cuando SÍ hay resultados
   parciales (lugares registrados) pero Mapbox falló — con «no está registrado» ya sobra la explicación.
5. **Reservar el z-index.** `HojaDondeEs`, a pantalla completa, competía con `ui/ListaFlotante` (portal a
   `document.body`, z-index 60): con `.capa` en 70 (como `CampoLargo`), la propia lista quedaba tapada por la
   pantalla. Se bajó a 55 — por encima de `ui/Hoja` (40) y de `Cartel` (50), por debajo de `ListaFlotante` (60).

## Qué no se tocó

- `Mapa.tsx` (OL-174), `ui/Cabecera*`, `AgendaInicio.tsx`, `VistaLugares.tsx`, `ui/Chip*`, `ui/SelectorFecha*`
  (instrucción del gestor).
- `src/app/artistas/**`, `src/app/perfil/**`, migraciones (OL-175).
- `src/lib/geocodificar.ts`, `src/lib/buscarLugares.ts`, `src/app/eventos/direccionContexto.ts`,
  `src/app/eventos/direccionEvento.ts`: se reutilizan tal cual, sin ningún cambio.
- El alta y edición de lugar (`FormularioLugar.tsx`, `/lugares/nuevo`) sigue existiendo igual, para quien entra
  directo a registrar un lugar sin pasar por un evento.

## ¿Hace falta una migración?

**No.** El modelo de datos es el mismo `OtroSitio` de siempre (`sitio_texto`, `sitio_direccion`, `sitio_lat/lng`,
`lugar_id`); «Agregar lugar» usa la tabla `lugares` tal cual existe. Sin columnas nuevas.

## Verificación

```
npm run lint && npm run typecheck && npm test && npm run build
```

Los cuatro en verde: lint sin errores (1 warning preexistente y sin relación, `docs/diseno/logotipo/iconos-sn.mjs`);
typecheck limpio; **1094 pruebas, 91 archivos** (las 19 nuevas de esta pieza — `dondeEsPantalla.test.ts`,
`acciones.desde-evento.test.ts` — más las 1075 que ya había, ninguna rota: `HojaDondeEs.tsx` no tenía un archivo de
pruebas propio, solo se referenciaba su tipo `OtroSitio` desde `gestosFlyer.test.ts` y `direccionContexto.test.ts`,
sin cambios); build completo, sin la ruta del arnés (ver abajo) en el árbol de rutas final.

El eslint del proyecto trae activo el compilador de React (`react-hooks/set-state-in-effect`,
`react-hooks/refs`, `react-hooks/preserve-manual-memoization`): tres ajustes para cumplirlo sin cambiar el
comportamiento — la ciudad de contexto se calcula directo en cada render (sin `useMemo`, es barata) y la lista
flotante se cierra guardando **para qué texto** se cerró (`cerradaParaTexto === q`) en vez de un booleano que un
efecto tendría que resetear con una `ref`.

### Capturas reales (`docs/rediseno/capturas-208/`), 390×844 (y 320×844 la 08)

`next build && next start` (puerto 4208, libre), Chromium real de `/opt/pw-browsers/chromium` vía `playwright-core`
(instalado en el scratchpad de la sesión con `npm i --no-save`, nunca en el repo). Sin `--ignore-certificate-errors`.
Arnés temporal `src/app/arnes208-temporal/` (cuatro lugares inventados de San Luis Potosí, uno con nombre al tope de
largo, y los componentes reales: `FormularioEvento`, `HojaDondeEs`, `MapaDondeEs`) — **se borró entero antes de
comitear**, `git status` limpio (comprobado, ver «Cierre»).

**Sin token de Mapbox en este entorno** (`NEXT_PUBLIC_MAPBOX_TOKEN` no está configurado aquí): el contenedor del
mapa sale vacío, con el aviso «Falta el token de Mapbox». Se comprobó el resto (campo, lista, barra, panel, el pin
dibujado por el propio `MapaDondeEs` cuando hay selección) — el mapa de verdad, con estilo, pines de lugares y el
toque de un POI de la cuenta del founder, **lo tiene que probar él en su iPhone**.

En cada captura: `document.documentElement.scrollWidth === ancho` de la ventana y ningún elemento con `right` mayor
que ese ancho (medido con un script propio antes de cada `screenshot`; las ocho salieron limpias). Letra Bricolage
(la sirve el propio build, sin comprobación aparte esta vez).

- **`01-al-abrir.png`:** cabecera «‹ Atrás / ¿Dónde es? / Listo» (Listo deshabilitado), campo vacío, mapa (vacío,
  sin token) y el botón «Estoy aquí».
- **`02-escribiendo-sugerencias.png`:** «Museo» escrito, un lugar registrado en la lista flotante justo debajo del
  campo, con teclado simulado de 300 px (`visualViewport` recortado a mano vía CDP, con un rectángulo gris de
  referencia) y la barra de acciones ya pegada encima de él.
- **`03-no-encontrado-con-teclado.png`:** «El Teatrito» (sin coincidencias), aviso «no está registrado» y la barra
  de acciones sobre el teclado simulado.
- **`04-no-encontrado-sin-teclado.png`:** mismo texto, sin teclado: la barra baja al pie de la pantalla.
- **`05-estoy-aqui.png`:** tras «Estoy aquí» (geolocalización real de Playwright, con permiso concedido), el
  resumen del pin con «Nombre del lugar» editable.
- **`06-panel-agregar-lugar.png`:** el panel «Agregar lugar» con el nombre («El Teatrito»), la dirección resuelta y
  el interruptor «Es un lugar privado, no registrarlo» apagado.
- **`07-dondes-elegido.png`:** de vuelta en el formulario (tras elegir un lugar registrado y tocar Listo), el
  renglón «Dónde» ya con «Centro de las Artes de San Luis Potosí» y «Cambiar».
- **`08-320px-nombres-al-tope.png`:** el peor caso, a 320 px: la lista flotante con el lugar de nombre más largo
  (dos líneas) y la barra de acciones con el texto recortado con «…» — nada se sale del ancho.

## Qué debe probar el founder en su iPhone (con Mapbox real)

1. Que el mapa de fondo carga con el estilo claro de la cuenta y los lugares se ven como pines violeta con su
   nombre.
2. **Si tocar un punto de interés del mapa (una plaza, un parque) mueve el pin con su nombre** — es lo que no se
   pudo comprobar sin token (`poiTocado()` en `MapaDondeEs.tsx`); si el estilo de la cuenta no expone esa capa, el
   toque cae en un punto vacío, que sigue funcionando pero sin el nombre.
3. Que arrastrar el pin de verdad hace reverse geocoding y el aviso de «revisa la dirección» se ve bien encima del
   mapa.
4. La barra de acciones sobre el teclado real del iPhone (aquí solo se simuló con `visualViewport` recortado a
   mano).
5. La decisión 2 de arriba (reservado): si el founder usa eventos reservados, confirmar si esta pieza necesita una
   manera de volver a marcarlos así desde «Dónde es», o si eso queda para otra pieza.

## Correos en el diff

`git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` no encontró ninguna dirección.

## Cierre

`git status --short` limpio de la carpeta del arnés y de artefactos de build (`.next/` está en `.gitignore`).
Commit local en `lugar-evento-pantalla-app`, con `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Sin
push ni PR (los da el gestor); sí `git push -u origin lugar-evento-pantalla-app` al terminar, como pide el encargo.
