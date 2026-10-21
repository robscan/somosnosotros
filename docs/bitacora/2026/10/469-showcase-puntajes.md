# 469 · El Showcase propone solo circulación, actividad y vínculo; obra sale de lo aceptado (OL-437)

**Fecha:** 2026-10-21. **Rama:** `showcase-puntajes`, desde `origin/main` (`a893b7b5`). **Operador:** agente de la pieza (Claude Opus 5.5) para el
Gestor VII, sin otros agentes. **Migración:** ninguna (lo propuesto se calcula al leer; lo fijado a mano ya vive en `showcase_candidatos.puntaje_*`).
**Variables de entorno:** ninguna. **Estado:** lista para la revisión del gestor.

## El pedido

El founder vio en Administración › Showcase «693 candidatos con una serie de KPIs, pero en el caso de los que se nombran como circulación, obra,
actividad y vínculo, no tienen ninguna entrada, además de que la calificación asignada es 0 de 8 para todos los casos», y dijo «arranca 437» a la
propuesta del gestor: que la base proponga sola tres de las cuatro señales con la regla de la rúbrica y que la administración siempre pueda
corregir a mano. Es la pregunta 9 de la bitácora 459 («¿La base pone sola la circulación y el vínculo?»): sí.

## Qué cambió

**Lo que propone la base** (`src/lib/showcase.ts`, funciones puras con prueba). Cada propuesta es un puntaje y su porqué en una línea; nadie la
escribe, se calcula al leer la lista o la ficha con lo que hay en la base:

- **Circulación** (`propuestaCirculacion`, desde `circulacionDe`): 2 con 4 foros distintos o más en el año, o con un festival y fechas fuera de su
  ciudad; 1 con 2 o 3 foros, o un festival; 0 con un foro (o eventos solo en sitios sin ficha). «4 foros y un festival este año», «un foro y un
  festival este año; 2 fechas fuera de San Luis Potosí». **Sin eventos en la base, sin datos** (no un 0): la base solo tiene lo que llegó por las
  agendas, y no tener fechas ahí no dice que no circule.
- **Actividad** (`propuestaActividad`, desde las lecturas de redes): 2 si la última publicación (la más reciente de todas sus redes) fue hace 7
  días o menos, o si dos lecturas de la misma red con 7 días o más entre ellas dan una publicación o más por semana y publicó en el último mes;
  1 hasta 45 días; 0 desde 46. «Publicó hace 3 días en Instagram», «Publica unas 3 veces por semana en Instagram», «Sin publicar desde hace 60
  días en Facebook». Sin lecturas, o si no dicen cuándo publicó (y no hay ritmo), sin datos.
- **Vínculo** (`propuestaVinculo`, desde la ficha): 0 si nadie la lleva (sin cuenta ligada), 1 reclamada, 2 reclamada con novedades visibles o
  portada. Siempre hay datos: que nadie lleve la ficha es un hecho de la base.
- **Obra y reconocimiento** (`propuestaObra`): la base no la sabe; solo se propone con las evidencias **aceptadas** de la señal obra (lo que
  propone la rutina de OL-430 no cuenta hasta que alguien lo acepta). 2 si alguna es premio o beca, o su título dice residencia, seleccionado/a o
  selección oficial; 1 si hay obra de los últimos 24 meses (o sin fecha); 0 si todo lo aceptado es más viejo. «Premio: «Mención estatal de
  acordeón»», «Obra: «Sencillo en plataformas de música»». Sin evidencias aceptadas, sin datos.

**Qué vale** (`valorDe`, `valoresDe`, `sumaValores`): lo fijado a mano manda (también un 0 fijado); sin fijado vale lo propuesto; sin los dos, «sin
datos», que no suma. La suma «de 8», el orden «Puntaje», el CSV y la línea de cifras usan lo que vale. La línea dice ahora cuántos pasan:
«7 candidatos · 2 invitados · 1 confirmado · 2 pasan al consejo con 5 de 8» (`pasanAlConsejo`: suma de 5 o más, sin los descartados).

**La lista** (`VistaCandidatos.tsx`, `Piezas.tsx`, `consultas.ts`). `cargarCandidatos` lee además, de 1 000 en 1 000, las fichas reclamadas
(`artistas_cuentas`, de lectura pública), las novedades visibles (`novedades_artista`), la portada del artista y las evidencias aceptadas de obra. En
la tarjeta y en la tabla, cada casilla de la rúbrica se dibuja por su origen: **fijado**, relleno de su color como siempre; **propuesto**, del color
de su puntaje, sin relleno y con contorno discontinuo; **sin datos**, «sin datos» en letra chica donde iría el número (en la tabla, una raya, para
que las trece columnas sigan cabiendo). Lo que se oye dice «2, propuesto», «1, fijado a mano» o «sin datos» (`ui/SoloLector`; en la tabla,
`PuntajeTabla` deja la casilla muda y la frase entera al lado). Toda casilla lleva un filete transparente de 1 px para que lo propuesto no cambie
de medida (un `outline-offset: -1px` sumaba una medida en duro al inventario). La caja deslizable de la tabla pasa a `position: relative`: sin eso,
lo que solo se oye de las columnas que quedan fuera de la caja estiraba la página a 453 px en un teléfono de 320, la vista se alejaba y `npm run
medir` vio el chip «Artes visuales» tocarse de 36 (lo encontré corriendo `medir.js` dentro de la página; prueba nueva con su control negativo).

**La ficha** (`[artista]/page.tsx`, `SenalFicha.tsx`). La rúbrica suma lo que vale y cada señal lleva a la derecha su casilla con el mismo dibujo.
La hoja de la señal empieza por **«Propuesto: 2 · 4 foros y un festival este año»** cuando la base propone algo (si no, el resumen de siempre, como
«Sin lecturas de redes»). Tocar 0, 1 o 2 lo fija a mano, también el que ya propone la base («fijarlo igual»); lo propuesto lleva el destello (el
icono del Showcase, en violeta) y lo fijado la paloma. Con algo fijado, la última opción es **«Volver al propuesto»** («Vale el 1 en vez del 2
fijado a mano», o «El mismo 2, sin fijar: cambia si cambian sus datos») o, si la base no propone nada, «Sin puntuar» como antes. Tocar lo que ya
está fijado solo cierra. La acción es la de siempre (`cambiarPuntaje`; null quita lo fijado). `opcionesPuntaje` (pura, en `src/lib/showcase.ts`)
arma esas opciones.

**Exportar para el consejo** (`csvConsejo`): `circulacion, obra, actividad, vinculo, total` son lo que vale (vacío si no hay datos) y van seguidas de
`circulacion_propuesto … vinculo_propuesto` y `circulacion_fijado … vinculo_fijado`; lo demás no cambia.

**Ayuda y manual** (`ayuda.ts`): la ⓘ dice «La base propone cada puntaje (contorno discontinuo) y lo que fijas a mano manda (relleno)» y cada
señal, de dónde sale su propuesta; el manual explica «sin datos» y «Volver al propuesto».

**Lo que no cambia:** la rúbrica, los estados, las evidencias, «Investigar» (OL-430), las acciones y la base (ninguna migración).

**Respaldo local** (`respaldo-local/fixture.mjs`): los puntajes fijados del showcase dejan sitio a lo propuesto. Feleal, circulación fijada en 2
(su fecha en Aguascalientes está aceptada como evidencia, pero no en la base, que propone 1) y lo demás propuesto; 0Backside0 y la Orquesta, todo
fijado; Pimpolina y Abril Merlot, nada fijado (como los 692 de producción hoy). Ninguna otra pantalla lee estas filas.

## Decisiones por confirmar (founder o gestor)

1. **Circulación sin eventos en la base = sin datos**, no 0: la base solo tiene las agendas. Con un foro sí es 0 (la rúbrica).
2. **Actividad de 31 a 45 días = 1, de 46 a 90 = 0**: la misma holgura que la píldora «Publica cada mes» de la tarjeta, así la píldora y la casilla
   no se contradicen. Lo que no sé leer: «y anuncia sus fechas» del 2 no se comprueba. Queda un desfase chico: la píldora dice «Publica cada
   semana» hasta 10 días y la propuesta da 2 solo hasta 7.
3. **Vínculo sin cuenta ligada = 0 propuesto** (es un hecho de la base, no falta de datos); la portada sin cuenta no suma.
4. **Obra 2** con premio o beca aceptados, o un título con residencia, seleccionado/a o selección oficial, **de cualquier fecha**; los 24 meses
   solo cuentan para el 1.
5. **Fechas fuera de la ciudad sin festival no suben** la circulación (la rúbrica literal: «un festival y fechas fuera»).
6. **Las evidencias aceptadas de circulación** (la fecha de Feleal en Aguascalientes) no entran a la propuesta: la propuesta es solo la base y,
   para corregirla, se fija a mano.
7. **Cómo se distingue**: propuesto en contorno discontinuo sin relleno; fijado relleno; «sin datos» en cursiva. **Sin leyenda en la lista**: lo
   explican la ⓘ de la ficha y el manual. Si el founder no lo lee a la primera, la salida es una línea bajo las cifras.
8. **La línea de cifras cuenta quiénes pasan** («2 pasan al consejo con 5 de 8»), sin los descartados; antes solo decía el umbral.
9. **Tocar el número propuesto lo fija** y ya no se mueve con los datos; «Volver al propuesto» lo suelta.
10. **El CSV** lleva valor, propuesto y fijado por señal, sin el motivo en palabras.

## Lo que se espera con los datos reales (estimación, sin leer producción)

- **Respaldo local** (7 artistas): en el caso de producción, con nada fijado, **5 de 7 pasan de «0 de 8» a un puntaje** (Feleal 6, 0Backside0 3,
  Abril Merlot 3, Pimpolina 1, Rocío Lozano 1) y **1 llega a 5** (Feleal). La Orquesta y Aaron Cadena se quedan en 0, ahora con sus ceros
  propuestos y sus «sin datos» a la vista. Con el fixture de antes (casi todo fijado), de los dos que estaban en 0 de 8 sube uno (Rocío, 1).
- **Circulación:** los **188** artistas con eventos en 2026 tendrían propuesta; los otros 504, «sin datos». Con las lecturas de las agendas de
  enero a octubre (las que se cargaron; cifras agregadas, sin nombres): de 254 artistas nombrados en 1 113 eventos, **236 (93 %) salen en un solo
  foro (0)**, 17 en 2 o 3 foros o un festival (1) y 1 en 4 o más (2). Llevado a los 188: unos **175 con 0, 12 con 1 y 1 con 2**. Los festivales que la
  base ya tiene como marco (OL-433) pueden subir algunos a 1.
- **Vínculo:** los **692** tendrían propuesta: los **33 con cuenta ligada, 1 o 2** (según novedades o portada); los 659 restantes, 0.
- **Actividad:** como mucho los **24** con lecturas del 19 de octubre; los que publicaron en los últimos 45 días, 1 o 2.
- **Obra:** ninguno todavía (las 3 evidencias de Leo Traeger siguen propuestas, no aceptadas).
- En suma: **entre 33 y unos 70 de los 692 dejarían el «0 de 8»**, y **casi nadie pasaría al consejo** solo con la base (el máximo sin obra es 6 y
  pide 2 en circulación, actividad y vínculo a la vez). Lo que más movería la lista es aceptar evidencias de obra («Investigar») y que la base
  tenga más fechas por artista.

## Evidencia (árbol sin `.env`; nunca producción)

- `npm run lint`: 0 errores (el aviso viejo de `VisorImagen.componentes.test.mjs`). `npm run typecheck`: limpio.
- `npm test`: **265 archivos, 4 353 pruebas**, todas bien. `src/lib/showcase.test.ts` pasa de 24 a 32: circulación con 0, 1, 2, 3 y 4 foros, un
  festival, festival y fechas fuera, fuera sin festival y sin eventos; actividad con 3, 7, 8, 20, 45, 46 y 120 días, la red más reciente, el ritmo
  semanal (con y sin fecha, y lecturas a menos de 7 días), sin lecturas y sin fecha; vínculo sin cuenta, reclamada, con novedades y con portada;
  obra con propuestas, rechazadas y otras señales que no cuentan, obra de 24 meses, más vieja, premio, beca, residencia, seleccionada, «selección
  de canciones» que no es reconocimiento y el título largo; qué vale (fijado manda, también un 0 fijado; sin datos no suma); las opciones de la
  hoja; `armarCandidatos` con lo fijado mandando sobre lo propuesto, un artista sin nada fijado (2 · 2 · 1 · 2 = 7), el orden y quiénes pasan; la
  línea de cifras; el CSV con sus columnas nuevas. `route.test.ts` del CSV: la fila con lo que vale, lo propuesto y lo fijado.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **103 migraciones, 2 225 comprobaciones, 0 fallaron** (sin migración nueva).
- `npm run inventario`: sin novedades. `npm run medir`: **52 pantallas × 4 anchos sin novedades** tras anotar con `--aceptar` los cuatro
  presupuestos del Showcase (solo esos cambian en `medidas.aceptadas.json`; a 390): `s36-admin-showcase` 261 → **283** nodos, `s37-admin-showcase-tabla`
  204 → **232**, `s38-admin-showcase-ficha` 190 → **194**, `s39-admin-showcase-manual` 78 → **79** (el texto que solo se oye de cada casilla y el
  párrafo nuevo del manual); la profundidad no cambia. Con `--letra=2 --solo=showcase`: sin novedades.
- `npm run test:componentes` completo: **686 de 686** (Chrome real). Nuevas: en la lista, las casillas fijadas (relleno, sin contorno), propuestas
  (sin relleno, contorno discontinuo verde o naranja), mezcladas y «sin datos» (ningún número), con lo que se oye; la tabla con lo propuesto y la
  raya que se oye «sin datos»; **a 320 en un teléfono la vista no se aleja** (sin el `position: relative` falla: `innerWidth` 495). En la ficha:
  la señal propuesta (la hoja dice «Propuesto: 2 · …», el destello en el 2, tocarlo lo fija igual y tocar otro lo cambia), la fijada distinta de lo
  propuesto (paloma en lo fijado, «Volver al propuesto» manda null, tocar lo fijado no llama a nada) y la sin datos (la hoja da el resumen, sin
  destello ni «Sin puntuar», y un 0 tocado sí se fija).

## Capturas (`docs/rediseno/capturas-469/`, Chrome real contra el respaldo, 390×844 a 2×; la 08, 1280×800; el 21 de octubre a las 10:00)

Herramienta: `scripts/ops/auditoria-ui/capturar-showcase-puntajes.mjs` (README de la auditoría al día). Sin errores de página ni de consola; nada se
sale del ancho.

- `01-lista-propuestos.png`: «7 candidatos · 2 invitados · 1 confirmado · 2 pasan al consejo con 5 de 8» y la tarjeta de Feleal: Circulación 2
  relleno verde (fijado), Obra 1 en contorno discontinuo naranja, Actividad 2 y Vínculo 2 en contorno discontinuo verde (propuestos), «7 de 8»;
  debajo empieza 0Backside0.
- `02-lista-sin-datos.png`: Pimpolina (Circulación 0 propuesto en contorno gris, Obra «sin datos», Actividad 1 propuesto, Vínculo 0, «1 de 8») y
  Aaron Cadena (Obra y Actividad «sin datos», Circulación y Vínculo 0 propuestos, «0 de 8»), y «Exportar para el consejo (CSV)».
- `03-ficha-rubrica.png`: Feleal, «Rúbrica 7 de 8»: Circulación 2 relleno con su evidencia de Aguascalientes, Obra 1 en contorno con el sencillo
  aceptado, Actividad 2 en contorno («Última publicación hace 2 días en Instagram») con la evidencia rechazada tachada, y Vínculo 2 en contorno.
- `04-hoja-senal-propuesta.png`: la hoja de Actividad: «**Propuesto: 2** · Publicó hace 2 días en Instagram», las opciones 0, 1 y 2 con su línea de
  la rúbrica y el destello violeta en el 2; nada fijado.
- `05-hoja-senal-fijada.png`: la hoja de Circulación: «**Propuesto: 1** · 3 foros y un festival este año», la paloma violeta en el 2 (fijado) y, al
  final, «Volver al propuesto · Vale el 1 en vez del 2 fijado a mano» con el destello.
- `06-ficha-sin-datos.png`: Aaron Cadena, «Rúbrica 0 de 8»: Circulación 0 en contorno («1 evento en 1 foro este año»), Obra «sin datos» («Sin
  evidencias aceptadas»), Actividad «sin datos» («Sin lecturas de redes») y Vínculo 0 en contorno («Nadie lleva su ficha…»).
- `07-hoja-senal-sin-datos.png`: la hoja de Obra de Aaron Cadena: «Sin evidencias aceptadas» y 0, 1 y 2 sin destello ni «Sin puntuar».
- `08-tabla-escritorio-1280.png`: la tabla con las trece columnas: lo propuesto en contorno discontinuo, lo fijado relleno, «–» donde no hay datos
  y el total de lo que vale; ordenada por puntaje (Feleal 7, 0Backside0 6, Abril Merlot 3, la Orquesta 3, Rocío 1, Pimpolina 1, Aaron Cadena 0).

El CSV del respaldo (lo imprime el script): la fila de Feleal dice `…,2,1,2,2,7,1,1,2,2,2,,,,…` (lo que vale, el total, lo propuesto y lo fijado).

## Lo que no se hizo

- Ninguna leyenda en la lista (decisión 7) ni el motivo de cada propuesta en el CSV (decisión 10).
- Que las evidencias aceptadas de circulación o actividad sumen a la propuesta (decisión 6).
- Igualar la píldora de actividad de la tarjeta (≤10 días «cada semana») con la propuesta (≤7 días para el 2): no estaba en el encargo.
- **Hallazgo de la herramienta, para el gestor:** la regla de desplazamiento horizontal de `npm run medir` compara el ancho del documento con
  `innerWidth`, que en la emulación de teléfono crece con lo que se sale (453 a 320); por eso esta vez lo vio solo de rebote, como un toque chico.
  Compararlo con el ancho pedido lo atraparía directo; no lo cambié (es de otra pieza).
