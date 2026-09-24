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
