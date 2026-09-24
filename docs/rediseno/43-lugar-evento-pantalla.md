# 43 · Lugar del evento a pantalla completa (OL-169)

**Estado:** prototipo para revisión del founder. **Prototipo:** [`prototipos/lugar-evento-pantalla.html`](prototipos/lugar-evento-pantalla.html) · **OL:** OL-169 · **Bitácora:** [204](../bitacora/2026/09/204-lugar-evento-pantalla.md) · **De dónde sale:** OL-137 (bitácora [172](../bitacora/2026/09/172-alta-evento-buscar-lugar.md)) y [26-alta-evento-lugar.md](26-alta-evento-lugar.md).

## Qué pidió el founder (2026-09-24), resumido

La hoja «Dónde es» de hoy (OL-137, en `src/app/eventos/HojaDondeEs.tsx`) tapaba el mapa con las sugerencias al
sacarse el teclado, y las dos salidas («Agregar» y «Buscar en el mapa sin agregar») quedaban debajo de él. El
founder pidió: pantalla completa (como `39-texto-largo.md`), **un solo campo** «Nombre o dirección» sobre un mapa
que muestra los lugares ya registrados y deja tocar el mapa o un punto de interés directamente, sugerencias en una
lista flotante que nunca tapa nada ni se deja tapar, «Estoy aquí» con nombre editable cuando el lugar no existe,
pin ajustable arrastrándolo, y **registro automático del lugar** salvo que la persona diga que es privado — igual
que ya pasa con artistas. Y probar dos maquetas de las dos salidas para elegir.

## Qué cambia respecto a OL-137

| | OL-137 (hoy, `HojaDondeEs.tsx`) | Esta pieza (propuesta) |
|---|---|---|
| Tamaño de la hoja | Pantalla completa con cabecera fija, pero el mapa vive en un carril propio abajo, del mismo tamaño siempre | Pantalla completa de verdad: el mapa es el fondo de toda la pantalla, edge-to-edge |
| Campos | «Nombre o dirección» (lugares) y, en «Es en otro sitio», un segundo campo de dirección aparte | Un solo campo para todo: nombre y/o dirección, siempre |
| Sugerencias | Lista en línea, empuja el mapa hacia abajo (se encoge, nunca desaparece) | Lista **flotante**, anclada justo debajo del campo, no empuja ni encoge nada |
| Elegir un lugar | Cierra la hoja sola a los 400 ms | Mueve el pin y muestra un resumen; hace falta tocar «Listo» (vuelta explícita, como en `39-texto-largo.md`) |
| Poner el pin a mano | Solo dentro de «Buscar en el mapa», un modo aparte | El mapa siempre es tocable: tocar cualquier punto pone el pin, sin cambiar de modo |
| Punto de interés (POI) | No existe | Un POI de Mapbox (ej. una plaza) se puede tocar igual que un lugar registrado |
| «Estoy aquí» | Pone el pin y propone nombre/dirección; si no hay nombre, pasa a «Es en otro sitio» para escribirlo | Pone el pin y muestra el nombre editable **en el mismo lugar**, sin cambiar de pantalla |
| Agregar lugar | Va a `/lugares/nuevo` (otra pantalla, con un alta completa) | Panel corto dentro de la misma hoja: nombre, dirección (ya resuelta por el pin) y el interruptor de privado; **registra automático** salvo que se marque privado |
| «Buscar en el mapa sin agregar» | Cambia a un modo de sugerencias de Mapbox aparte | El mapa ya está siempre ahí: la acción solo cierra la lista/aviso para dejar tocar el mapa libremente |

## El flujo, en pasos

1. Desde el alta de evento, tocar el renglón «Dónde» abre la hoja «¿Dónde es?» a pantalla completa (cabecera con
   «‹ Atrás» y «Listo», como `39-texto-largo.md`).
2. Al abrir: mapa con los lugares registrados (puntos violeta con su nombre) y algún POI (punto punteado), campo
   «Nombre o dirección» vacío arriba. Sin lista, sin aviso.
3. Escribir en el campo: aparece la lista flotante justo debajo, con los lugares registrados primero y luego
   direcciones/POI que coincidan. Elegir un renglón llena nombre y dirección juntos y mueve el pin.
4. En vez de escribir, tocar directamente un pin registrado, un POI, o cualquier punto vacío del mapa: hace lo
   mismo (mueve el pin; si el punto no es un lugar conocido, el nombre queda vacío y editable).
5. El pin siempre se puede arrastrar; al soltarlo, la dirección se recalcula (reverse geocoding) y aparece el
   aviso «Moviste el pin. Revisa que la dirección corresponda.».
6. «Estoy aquí» (botón flotante sobre el mapa) pone el pin en la posición de la persona y propone la dirección;
   si no hay nombre (caso normal, es un lugar nuevo), el campo de nombre queda editable ahí mismo.
7. Si nada coincide con lo escrito: aviso «no está registrado» y dos acciones, «Agregar lugar» y «Buscar en el
   mapa sin agregar» — su colocación es la variante A/B (ver abajo).
8. «Agregar lugar» abre un panel corto (nombre, dirección ya resuelta por el pin, interruptor «Es un lugar
   privado, no registrarlo») y «Guardar y usar este lugar» lo deja listo.
9. «Listo» cierra la hoja y el renglón «Dónde» del evento muestra lo elegido; «Atrás» cierra sin decidir nada.

## Las dos variantes

- **A · dentro de la lista.** «Agregar lugar» y «Buscar en el mapa sin agregar» son los últimos renglones de la
  propia lista flotante (o del aviso «no está registrado»), del mismo peso visual que un resultado.
- **B · barra de acciones.** Las dos salen siempre en una barra fija de dos botones: pegada justo encima del
  teclado cuando está abierto, al pie de la pantalla cuando no.

### Toques medidos en el prototipo (desde la hoja ya abierta)

| Camino | Variante A | Variante B |
|---|---|---|
| Elegir un lugar **registrado** (2 coincidencias) | 3 toques: campo → renglón del lugar → Listo | 3 toques: igual, la variante no interviene aquí |
| Registrar un lugar **nuevo** («no está registrado») | 4 toques: campo → «Agregar «…» como lugar» → «Guardar y usar este lugar» → Listo | 4 toques: campo → «Agregar lugar» (barra) → «Guardar y usar este lugar» → Listo |
| **«Estoy aquí»** | 3 toques: «Estoy aquí» → escribir el nombre → Listo | 3 toques: igual, tampoco cambia con la variante |
| Desplazamientos de lista para **llegar** a «Agregar»/«Buscar en el mapa» con 5 coincidencias | 1 (hay que bajar la lista hasta el final) | 0 (la barra está siempre a la vista, no vive en la lista) |

El número de toques **no cambia entre A y B** para estos tres caminos: la variante no agrega ni quita pasos, solo
mueve dónde viven las dos salidas. Lo que sí cambia, y es lo que vale la pena probar en el iPhone, es **cuánto hay
que desplazar la lista para alcanzarlas** cuando hay varias coincidencias: en A crecen con la lista (con 5
lugares, tocan al final, hace falta un scroll); en B están siempre fijas, sin desplazar nada, pero ocupan una
franja de la pantalla de forma permanente mientras se busca (menos alto útil para ver el mapa y la lista).

## Qué datos se guardan

- **Nombre** del lugar (texto).
- **Dirección** (texto legible, la que devuelve Mapbox o el reverse geocoding del pin).
- **Latitud/longitud** del pin (`Punto`, igual que hoy).
- **Privado** (booleano), solo relevante al agregar un lugar nuevo: si está activo, no se crea ficha.

Es el mismo modelo de datos que ya usa `OtroSitio` en `HojaDondeEs.tsx` — esta pieza no propone campos nuevos,
solo cambia cuándo y cómo se llenan.

## Cómo obtiene Mapbox el nombre y la dirección

- **Al elegir una sugerencia** (lugar registrado de nuestra base, o resultado de Mapbox): la propia respuesta de
  Search Box (`suggest` + `retrieve`, ya usado en `buscarLugares.ts`) trae nombre y dirección juntos en la misma
  llamada — no se piden por separado ni se arma a mano. Es justo el pedido del founder: «cuando usuario
  selecciona una opción de listado estos dos campos se obtienen y correlacionan, que mapbox los obtenga de ahí».
- **Al soltar el pin (arrastre o tap en el mapa) o en «Estoy aquí»**: un reverse geocoding con las coordenadas del
  punto (`geocodificar.ts` ya tiene el patrón) devuelve la dirección más cercana; el nombre se deja vacío y
  editable si no hay uno ya elegido.

## Registro automático, salvo «privado»

Igual que los artistas: **agregar un lugar desde el alta de evento lo registra automáticamente** en el
directorio (ficha pública, visible en Lugares) — la persona no tiene que ir a una pantalla aparte a completar un
alta larga. La única salida es el interruptor «Es un lugar privado, no registrarlo», que solo aparece en el panel
de «Agregar lugar»: con él activo, el lugar **no** se registra — nombre, dirección y coordenadas quedan guardados
únicamente en ese evento (como ya hace «Es en otro sitio → Reservado» hoy), sin ficha propia ni aparecer en el
directorio ni en el mapa de Lugares.

## Lo que sigue igual del canon

- Toque mínimo 44 px, tipografía Bricolage Grotesque, `--primario` violeta (`#6d34c8`, OL-146).
- La ayuda de qué falta va debajo del campo o del renglón, nunca dentro del botón (OL-100, canon de formularios).
- Un lugar es un lugar: mismo nombre a menos de 150 m no se duplica (`docs/DEFINICION.md`); esta pieza no cambia
  esa regla, solo dónde se resuelve.
- La ubicación de la persona se pide con un toque («Estoy aquí»), nunca automática al abrir (`docs/DEFINICION.md`).

## Decisiones que el founder tiene que firmar

1. **Variante A o B** — o si prefiere probar las dos en su iPhone antes de decidir.
2. **Texto exacto de las acciones**: ¿«Agregar lugar»/«Agregar «texto» como lugar» y «Buscar en el mapa sin
   agregar», tal como están en el prototipo, o los cambia?
3. **«Estoy aquí» pide la ubicación con un toque** (nunca automática al abrir la hoja), como manda
   `docs/DEFINICION.md` — ¿confirma que así debe quedar?
4. El texto y el criterio exacto del interruptor «Es un lugar privado, no registrarlo» (aparece solo al agregar,
   nunca al elegir un lugar ya registrado): ¿de acuerdo?

## Recomendación

**B** (barra de acciones sticky): con varias coincidencias no obliga a desplazar la lista para encontrar «Agregar»
o «Buscar en el mapa», que es justo el problema que el founder señaló en la hoja de hoy.

## Agregar lugar, segunda versión (OL-182)

**Estado:** prototipo para revisión del gestor. **Prototipo:**
[`prototipos/lugar-evento-agregar.html`](prototipos/lugar-evento-agregar.html) · **OL:** OL-182 · **Bitácora:**
[217](../bitacora/2026/09/217-donde-es-agregar-ubicacion.md) · **De dónde sale:** dos defectos que el founder
encontró en producción en su iPhone, 2026-09-24, sobre la hoja «¿Dónde es?» de OL-173/OL-179 (bitácoras
[208](../bitacora/2026/09/208-lugar-evento-pantalla-app.md) y
[214](../bitacora/2026/09/214-lugares-privados.md)).

### Lo que reportó el founder, textual

> cuando se guarda un lugar, ejemplo "laboratorio de arte escenico" mira como el listado de sugerencias se
> sobrepone al cta de guardar nuevo lugar, luego, cuando selecciono la opcion de guardar nuevo lugar, no me deja
> especificar la ubicación, solo guarda el lugar con una ubicación que no sé de dónde sacó. Error grosso.

### Las dos causas, confirmadas en el código antes de tocar nada

1. **La lista tapa la barra.** `ui/ListaFlotante` calcula su alto máximo con el espacio entre el campo y el
   teclado (`calcularPosicion`), sin saber que la barra «Agregar» (`.barraAcciones`, 56 px, pegada sobre el
   teclado) ocupa el final de ese mismo espacio: con tres resultados largos la lista llega hasta el teclado y la
   barra tapa el tercero.
2. **«Agregar» inventa un punto.** `abrirAgregar()` en `HojaDondeEs.tsx` tenía `if (!draft?.punto) void
   moverPin(contexto.centro, …)`: sin pin, movía el pin en silencio al centro de contexto (la ciudad del chip o la
   posición cacheada del teléfono) y pedía la dirección de ESE punto inventado; el panel se abría encima del mapa,
   sin ningún campo de dirección, con la frase «Ajusta el pin en el mapa» que no se podía cumplir porque el propio
   panel tapaba el mapa. «Guardar» registraba ese punto inventado (y `guardarAgregar` devolvía en silencio si no
   había punto: un botón que a veces no hacía nada).

### La solución, firmada por el founder («acepto tus recomendaciones», 2026-09-24)

- **`ListaFlotante` gana `reservaAbajo?: number`** (px): `calcularPosicion` lo resta del espacio de abajo antes de
  decidir el alto máximo y si abre hacia arriba. `HojaDondeEs` pasa `ALTO_BARRA_ACCIONES + 8` cuando la barra está
  visible. Con poco alto (teclado abierto) y la lista sin espacio ni con 120 px de margen, abre hacia arriba (ya lo
  hace la lógica existente); nunca queda encima de la barra. Prototipo: estado **(a)**, tres resultados largos
  («Laboratorio de Arte Escénico Universitario», «… de la UASLP», «Centro Laboratorio de Experimentación…», el
  caso real del founder) con teclado simulado: la lista se detiene justo encima de «Agregar «…» como lugar»,
  8 px de separación, nunca la toca.
- **Se quita el `moverPin(contexto.centro…)` silencioso.** El panel «Agregar lugar» pasa a ser una **hoja a media
  pantalla, pegada abajo** (sobre el teclado cuando lo hay, con el mismo mecanismo de `visualViewport` que ya usa
  la barra), que deja el **mapa visible arriba con el pin**. Contenido de la hoja, en este orden: título «Agregar
  lugar»; campo «Nombre» (prellenado con lo escrito); campo «Dirección», con las MISMAS sugerencias del campo
  principal (`sugerirLugares`/`buscarConContexto`, `ListaFlotante` anclada a este segundo campo — estado **(c)**
  del prototipo); el interruptor «Es un lugar privado» (sin cambios de texto); el botón «Guardar y usar este
  lugar», **apagado mientras no haya punto** — estado **(b)**, con el porqué en texto chico debajo, canon de
  formularios de OL-100: «Falta la ubicación: busca la dirección, toca el mapa o usa «Estoy aquí».».
- **Tres maneras de fijar el punto, las tres visibles a la vez con la hoja abierta:** elegir una dirección en el
  campo de la hoja; tocar o arrastrar el pin en el mapa (la hoja NO tapa el mapa: en el código, `MapaDondeEs`
  recibirá un `padding` inferior para que el pin y el centro queden siempre en la parte visible, arriba de la
  hoja); el botón flotante «Estoy aquí», que pasa a quedar **encima de la hoja, no debajo** (en el prototipo,
  `z-index` de `.ubicame` por encima de `.hoja-agregar`, con su `bottom` recalculado sobre el alto real de la
  hoja). Al fijar el punto por el mapa o por «Estoy aquí», la dirección se resuelve como hoy (`moverPin`,
  «Ubicando…») y aparece en el campo «Dirección», editable. Si la persona venía de un POI de Mapbox o de un pin ya
  puesto, la hoja abre con el punto y la dirección ya puestos y «Guardar» encendido — estado **(d)** del
  prototipo.
- Todo lo demás de OL-173/OL-179 se conserva sin cambios: un solo botón «Agregar» en la barra, lugar privado,
  reutilización a 150 m, `dentro={[barraRef]}` (el hallazgo del botón que no respondía al toque, bitácora 214),
  «Listo», «Atrás».

### Medidas del prototipo (`lugar-evento-agregar.html`)

- La hoja «Agregar lugar» es un `position: absolute; left/right: 0; bottom: 0` dentro de la propia pantalla
  «¿Dónde es?» (no un `ui/Hoja` aparte: comparte capa con el mapa, como pide «deja el mapa visible arriba»),
  esquinas superiores redondeadas (20 px), con una «asa» decorativa centrada arriba (afordance de hoja
  arrastrable, puramente visual en esta pieza).
- Su `bottom` se mueve con el mismo mecanismo que ya usa `.barraAcciones` (`altoTeclado`/`visualViewport`): pegada
  al pie sin teclado, pegada sobre el teclado con él.
- El campo «Dirección» reutiliza el estilo exacto del campo principal (`.campo-buscar`): mismo alto, mismo ícono,
  mismo borde — no el texto fijo `.direccionFija` de la versión anterior del panel.
- «Estoy aquí»: `bottom = altoTeclado + altoDeLaHoja(medido) + 16px` cuando la hoja está abierta (antes:
  `bottom = altoTeclado + ALTO_BARRA_ACCIONES + 16px` cuando la barra está visible) — mismo patrón, otro elemento
  de referencia.
- La lista de sugerencias de dirección (dentro de la hoja) usa el mismo cálculo arriba/abajo que la lista
  principal, con el teclado como piso: en el estado (c), con el campo «Dirección» ya bajo en la pantalla (la hoja
  pegada sobre el teclado), no cabe hacia abajo y abre hacia arriba — se comprobó en la propia captura, no se
  asumió.
- **Hallazgo de maquetación durante el armado del prototipo, corregido en el mismo archivo:** el campo «Dirección»
  reutilizaba `<span class="campo-buscar">` anidado dentro de `<label class="campo-hoja">`, y el selector genérico
  `.campo-hoja > span` (pensado solo para la etiqueta «NOMBRE»/«DIRECCIÓN») alcanzaba también a ese segundo `span`
  con la MISMA especificidad que su propio `display: flex`, apagándoselo (el último en la hoja de estilos ganaba):
  el ícono de lupa quedaba fuera de la caja del campo. Corregido acotando el selector a `.campo-hoja >
  span:first-child` y añadiendo `.campo-hoja .campo-buscar input[type="text"]` para que el `input` de dentro no
  dibuje una segunda caja anidada (`.campo-hoja input[type="text"]` es más específico que `.campo-buscar input` y,
  sin este ajuste, pisaba el reseteo de borde/relleno que ya da el envolvente). Recordatorio para el operador de la
  parte 2: si `HojaDondeEs.module.css` reutiliza una clase existente (`.campoPanel`, `.campo`) para el nuevo campo
  de dirección de la hoja, revisar la especificidad de cualquier selector `> span`/`> input` genérico antes de
  anidar un segundo campo dentro.

### Corrección del gestor a la primera entrega: la lista de dirección abría encima del campo

Revisión del gestor sobre la primera entrega del prototipo: en `proto-03-sugerencias-direccion.png` la lista abría
hacia ARRIBA y tapaba el propio campo «Dirección» que se estaba usando (se veía «Nombre», luego la lista, y el
campo quedaba debajo). Va contra una regla dura del founder, 2026-09-24 (`MEMORIA_GESTOR.md`): «si sugieres algo
sea debajo del campo que estoy usando» — una lista de sugerencias nunca tapa el campo con el foco.

Causa: el campo «Dirección» de la hoja queda bastante abajo en la pantalla (la hoja ya está pegada sobre el
teclado) y el espacio libre hasta el teclado no llegaba a los 120 px que `calcularPosicion` (ver
`ListaFlotante.tsx`) pide para abrir hacia abajo; con menos, decide abrir hacia arriba — la misma lógica que ya
usa la lista principal (estado a), donde SÍ es correcta (ahí no hay ningún campo debajo que tapar).

**Corrección** (no cambia `calcularPosicion`, cambia el layout que le llega): al abrirse las sugerencias de
dirección, la hoja gana la clase `expandida` (`top: 8px`, casi hasta el campo principal, `overflow-y: auto`) y se
le pone el `scrollTop` necesario para que el campo «Dirección» quede lo más arriba posible dentro de esa hoja ya
más alta — el mismo criterio que `scrollIntoView({ block: "start" })`. Con eso, el espacio libre hasta el teclado
pasa a ser el de una hoja casi tan alta como el hueco disponible, muy por encima de los 120 px, y la MISMA
`colocarLista` (sin ningún caso especial para «nunca arriba») elige «abajo» por sí sola, con margen de sobra.
«Estoy aquí» se oculta mientras la hoja está así de estirada (no hay nada útil que tocar en el mapa, casi tapado,
mientras se escribe una dirección) y todo vuelve a su tamaño normal al cerrarse la lista.

Medido en el propio prototipo (390×844, teclado 300 px): la hoja expandida mide 364 px de alto visible y 383 px de
contenido — sí hace falta un poco de scroll (19 px, el máximo posible), pero no tanto como para sacar «Nombre» de
la vista del todo; con un contenido más alto (una dirección larga que ocupe dos líneas, o un teclado con la barra
de autocompletar de iOS, más alta que los 300 px simulados aquí) el mismo mecanismo desplazaría más, hasta sacar
también el título y «Nombre» -como describió el gestor-, siempre dejando sitio abajo. Es decir: el ajuste es
adaptable al espacio real, no un valor fijo.

### Capturas (`docs/rediseno/capturas-217/`), 390×844 (y 320×844 la (b))

Chromium real (`/opt/pw-browsers/chromium` vía `playwright-core`), Bricolage Grotesque inyectada desde el woff2
local del build (mismo patrón que `scratchpad/fuentes/capturar-ejemplo.mjs`, MEMORIA_GESTOR.md 2026-09-24). Sin
`--ignore-certificate-errors`. En cada captura: sin scroll horizontal dentro del «teléfono» simulado y ningún
elemento con el borde fuera de su ancho (comprobado por script antes de cada captura, las cinco salieron limpias).

- **`proto-01-lista-sobre-barra.png`:** «laboratorio de arte escenico» escrito, los tres resultados largos del
  caso real del founder, teclado simulado (300 px) y la lista deteniéndose justo encima de «Agregar «…» como
  lugar».
- **`proto-02-agregar-sin-punto.png`:** la hoja «Agregar lugar» recién abierta, sin punto: mapa visible arriba con
  «Estoy aquí» sobre la hoja, «Nombre» prellenado, «Dirección» vacía, interruptor apagado, «Guardar y usar este
  lugar» apagado con el porqué debajo.
- **`proto-03-sugerencias-direccion.png`:** el campo «Dirección» de la hoja con «Av. Indus» escrito y sus tres
  sugerencias abiertas DEBAJO del campo (nunca encima: corrección de esta misma parte, ver más arriba), con el
  teclado simulado debajo de la hoja.
- **`proto-04-punto-fijado.png`:** dirección elegida («Av. Industrias 101, Zona Industrial»), pin violeta en el
  mapa (arriba, visible, sin que la hoja lo tape), «Guardar y usar este lugar» encendido.
- **`proto-05-agregar-sin-punto-320.png`:** el estado (b) a 320 px — el peor caso de ancho, sin desbordes.
