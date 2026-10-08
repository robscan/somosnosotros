# 382 · La cabecera oscura de exposición, taller y festival (variante A del prototipo firmado)

**Pieza:** OL-351. **Rama:** `cabecera-clases`, base `origin/main` (`c4475cbd`). **Fecha:** 2026-10-08. **Operador:** Claude (agente del gestor V).
**Sin migración.** Prototipo firmado: [`docs/rediseno/prototipos/cabecera-clases.html`](../../../rediseno/prototipos/cabecera-clases.html), variante A (bitácora [380](380-prototipo-cabecera-clases.md)).

## Qué firmó el founder

«La ficha de Exposición · Taller · Festival debe ser diferente, puede ser una versión Dark»; vio las dos variantes y dijo «acepto recomendaciones»: **A, la cabecera oscura**, con el cuerpo claro de hoy. En la exposición se quita la línea bajo el título que repetía sus números; **sin «Cupo»** (no existe en el modelo). Los eventos sueltos no cambian.

## Qué cambió

- **`ui/Heroe`** gana `banda`: los números de la clase. Con ellos, la portada y el título llevan la clase `oscura` y los números van en su propia fila (`numeros`) debajo. No es un componente nuevo: las mismas tres piezas de siempre más esa fila.
- **`ui/Ficha.module.css`**: la rejilla de la ficha gana la fila `numeros` entre el héroe y los avisos (vacía, mide 0 en todas las demás fichas). La piel oscura (§ 3b): la portada pasa a 4:3 y se estira a toda su celda aunque el título crezca (a 320 o con título largo nunca asoma el fondo claro bajo el velo); el velo `--velo-banda` baja hasta el color de la banda; el título a `--letra-2xl` en 800 con 96 px de velo arriba; la banda con los números y el aire del prototipo (4 arriba, 20 abajo). Las acciones abren el cuerpo sin su margen de arriba. Desde 1048 (la ficha de dos columnas que ya existía, sin medidas por pantalla nuevas) la portada queda a la izquierda como siempre y, a la derecha, el título y los números van en una tarjeta oscura con las esquinas de la portada (la pregunta 4 de la bitácora 380, con la propuesta que traía). Entre 792 y 1048 la banda ocupa el ancho de la columna, igual que el héroe de hoy.
- **`ui/Kpis`** gana `piel="banda"`: la misma tarjeta en blanco translúcido (`--sobre-banda`, su borde), el valor en blanco, lo que es y su icono en `--sobre-banda-suave` y el anillo del foco en blanco (el violeta no se ve sobre la banda).
- **`Cartel`** gana `oscura`: sin portada, `public/sin-foto-oscura.png`, el símbolo SN en `#6b6b66` sobre la banda, 1200×900, arriba del centro (34 %) para que el velo y el título no lo tapen. Ya generada, nunca compuesta en vivo: la escribe `docs/diseno/logotipo/sin-foto-sn.mjs` (las dos de siempre salen idénticas, sin cambios en git).
- **`eventos/[id]/page.tsx`**: con clase exposición, taller o festival, la etiqueta (`cortoDeClase`: «Exposición», «Taller», «Festival»), la línea y los números van al héroe; el cuerpo empieza en las acciones. Números: festival **Actos · Costo · Sedes** (como hoy); exposición **Hasta · Costo · Horario** (el orden del prototipo; antes Hasta · Hoy · Costo; el tercero dice «Hoy 10:00–18:00», «Horario Por confirmar» o «Abre …» como ya hacía `kpisDeExposicion`); taller **Sesiones · Costo · Van** («Van» diferido como en el evento suelto, con su salto a «Quién va»). Líneas: festival «Del … al … · Programa registrado: N actividades» (la de hoy, ahora bajo el título); exposición ninguna; taller `lineaDeTaller` (nueva en `claseEvento.ts`): un día, «jue 8 de oct · 17:00 · Lugar»; varios, «Del 9 al 13 de oct · Lugar» (el sitio sin dirección, como en las listas; la dirección está en «Dónde»). El evento suelto pinta exactamente lo de antes (héroe sin etiqueta ni línea, números en el cuerpo). La clase `.linea` de `ficha.module.css` se retira: ya no la usa nadie.
- **No se tocó** «Dónde», `MapaFicha` ni `CapaMapa` (OL-350).

## Tokens nuevos (`globals.css`)

`--banda: #141414` · `--velo-banda` (de la banda abajo a `rgba(20,20,20,.7)` al 45 % y a transparente arriba) · `--sobre-banda: rgba(255,255,255,.08)` · `--sobre-banda-borde: rgba(255,255,255,.18)` · `--sobre-banda-suave: rgba(255,255,255,.72)`. Los cuatro de la bitácora 380 más el velo, que el prototipo escribía a mano. El blanco del título y de los números es `--primario-texto`, como el título del héroe de hoy y la barra compacta.

## Contraste (AA)

- Prueba (`Heroe.test.ts`, lee los tokens de `globals.css`): los números, blanco sobre su tarjeta en la banda 15:1 y el blanco suave 8,4:1; el título y la meta, blanco sobre la parada del 45 % del velo con un **cartel blanco** debajo (el peor caso) 6,8:1, y sobre la banda 18,4:1.
- Medido en la página compilada, en la línea de arriba de cada texto y con cartel blanco debajo (el festival sin cartel a 390 y el festival y el taller a 320): el título entre 6,9:1 y 8,5:1 (letra grande, le basta 3:1) y la meta entre 11,4:1 y 14,4:1. El chip de la clase es el de siempre (violeta sobre el vidrio): 5,9:1 aun sobre negro.

## Pruebas

- `page.test.ts`: la banda solo en las tres clases; los números de cada una dentro del héroe y ninguno repetido en el cuerpo; festival con su línea, exposición sin línea, taller con cuándo y dónde y sin «Cupo»; el evento suelto sin banda, etiqueta ni línea y con sus números en el cuerpo. La exposición de OL-321 pasa a «Hasta · Costo · Abre».
- `Heroe.test.ts`: la piel oscura solo con `banda`; la fila de números en la piel `sobreBanda`; sin portada, `sin-foto-oscura.png`; sin `banda`, el héroe de siempre; el contraste de arriba.
- `claseEvento.test.ts`: `cortoDeClase` y `lineaDeTaller`.

## Verificación

`npm run lint` (sin errores; un aviso previo en `VisorImagen.componentes.test.mjs`, ajeno), `npm run typecheck`, `npm test` (3 386 pruebas), `npm run inventario` (sin novedades: ningún color a mano en módulos, ninguna medida en duro nueva) y `npm run medir` (sin novedades, con los presupuestos de abajo).

**Presupuestos de `medir` (decisión del gestor):** `s24-ficha-exposicion` 84 → 85 nodos (117 → 118 desde 820) y `s25-ficha-festival` 121 → 123 (154 → 156): la fila de la banda y el chip de la clase, más la línea del festival que sube al héroe y la de la exposición que se va. Lo que la bitácora 380 anticipó. Profundidad igual. Se anotaron solo esas ocho cifras (el `--aceptar` reescribía el formato de todo el archivo).

## Capturas (`docs/rediseno/capturas-382/`, 2×)

La app compilada contra el respaldo local (una copia en el scratchpad con un festival sin cartel; el `fixture.mjs` del repo no cambia), reloj fijo de `medir` (mié 7 de oct), Chrome de la Mac, sesión de Ana. Los carteles son de relleno **con texto** y los contesta el navegador (también los de `/_next/image`: nada sale a la red); la exposición lleva uno casi blanco, el peor caso. Cada una abierta y mirada:

- `01-festival.png` (390×844): «Festival de Cine de Invierno»: el cartel a sangre, «FESTIVAL», el título en blanco, «Del 16 al 18 de oct · Programa registrado: 3 actividades» y «Actos 3 · Costo Gratis · Sedes 1» en la banda; debajo, claro, el aviso de oculto, las acciones y «Programa». La misma jerarquía y medidas que `capturas-380/01-a-festival.png`.
- `02-exposicion.png` (390): «Ecos de papel» con el cartel claro: «EXPOSICIÓN», el título sin línea debajo y «Hasta mar 27 oct · Costo Gratis · Hoy 10:00–18:00»; abajo «Horario» e «Inauguración». El texto del cartel asoma tenue tras el velo, el título se lee.
- `03-taller.png` (390): «Taller de grabado en linóleo» con la portada de su lugar: «TALLER», «Del 9 al 13 de oct · ACHE Galería» y «Sesiones 3 · Costo $300 · Van 0»; abajo «Sesiones» y las pastillas «Me interesa» y «Voy».
- `04-festival-sin-cartel.png` (390): un festival sin cartel ni actos: el símbolo SN claro sobre la banda, arriba del chip, y «Del 10 al 11 de oct · Programa por confirmar».
- `05-evento-puntual.png` (390): el concierto de la Orquesta: el héroe 3:2 de siempre, sin chip ni banda, y «18:00 mié 7 oct · Costo · Van» en el cuerpo. Igual que antes.
- `06-festival-320.png` y `07-taller-320.png` (320×844): sin desbordes; la línea del festival en dos renglones; la portada termina en el mismo píxel que el título (medido: 240 y 240). En el taller, «SESIONES» se corta en «SESION…» en su tarjeta de un tercio: la regla de siempre de las etiquetas de `ui/Kpi`.
- `08-festival-cuerpo.png` (390, desplazada): la barra compacta oscura con el título (la de hoy) y el programa en claro.
- `09-festival-820.png` (820×1180): la banda al ancho de la columna, como el héroe de hoy en tableta; el cartel grande y el velo de 96 px arriba del chip.
- `10-festival-1280.png` y `11-exposicion-1280.png` (1280×800): la portada 4:3 a la izquierda con sus esquinas y la tarjeta oscura con el chip, el título, la línea y los números a la derecha; el cuerpo claro debajo.

## Por confirmar con el founder

1. **El tercer número del taller:** «Van» (lo que la bitácora 380 ofrecía sin «Cupo»; ya existía y baja a «Quién va»). La reserva del gestor sugería «Lugar», pero el lugar ya va en la línea bajo el título y en «Dónde».
2. **El taller sin sesiones guardadas** dice «Sesiones 1» aunque dure varios días de corrido (no se inventan sesiones).
3. **En tableta (820)** el cartel 4:3 a todo lo ancho es alto y su texto asoma tenue detrás del título: el velo es el mismo que en el teléfono. Se lee (el contraste de arriba vale para cualquier ancho), pero si estorba se puede alargar el velo en la piel oscura.
4. **Escritorio:** la tarjeta oscura a la derecha de la portada (la propuesta de la 380); falta su visto bueno.
