# 467 · La bandeja de Ciudades muestra la forma de cada propuesta de evento (OL-434)

**Fecha:** 2026-10-21. **Rama:** `bandeja-formas`, desde `origin/main` (`eb999989`, con OL-432 #551 y OL-433 #552). **Operador:** agente de la
pieza (Claude) para el Gestor VII, sin otros agentes. **Migración:** ninguna. **Variables de entorno:** ninguna nueva. **Estado:** lista para la
revisión del gestor.

## El pedido

El founder, tras OL-433: «arranca 434». OL-433 enseñó a la rutina de agendas a reconocer festivales, talleres, series y exposiciones y dejó en
`propuestas.datos` cómo ocurre cada propuesta (`src/lib/rutinas/formaEvento.ts`), con `etiquetaDeForma` para decirlo; pero la bandeja de
Ciudades (OL-432) seguía enseñando cada propuesta como un evento suelto, y un acto aceptado antes que su festival decía una frase equivocada:
«no se pudo publicar ahora: se publica con la siguiente corrida de agendas».

## Qué cambió

**La línea de forma** (`src/lib/bandejaFormas.ts`, nuevo y puro; `Bandeja.tsx`; `ciudades.module.css`). Bajo el título de cada propuesta de
evento, la frase de `etiquetaDeForma` con su icono en la columna de los iconos (icono | texto, como un renglón) y, debajo, su detalle:

- **Festival:** «Festival · 4 actos» y su periodo, «Del 28 de oct al 2 de nov». La línea de abajo ya no repite la fecha ni el sitio de su
  primer acto (sus sedes son las de sus actos): solo la fuente y cuándo se leyó.
- **Acto de un festival que ya existe** (`datos.marco`): «Acto de «Festival de Cine de Invierno»», con el nombre como enlace a su ficha. Un acto
  de un festival propuesto que ya se aceptó y publicó enlaza a ese evento; uno cuyo festival se rechazó ya no dice «Acto de…» (se publicará
  suelto, OL-433).
- **Taller** (`sesiones`): «Taller · 4 sesiones» y «mar 3, jue 5, mar 10 y jue 12 de nov · 5:00–7:00 pm»; **días seguidos**: «Evento de 3 días»
  y «vie 23, sáb 24 y dom 25 de oct · 11:00 am». La línea de abajo dice el sitio sin la fecha de la primera sesión.
- **Serie** (`serie`): «Serie · 4 fechas, cada semana» y sus fechas, «mié 28 de oct y mié 4, mié 11 y mié 18 de nov · 7:00 pm»; la línea de
  abajo, la fecha de esa propuesta (la rutina propone una por fecha).
- **Exposición** (la inauguración con su periodo): «Exposición «Raíces» · hasta el lun 30 de nov»; la línea de abajo, la inauguración.
- **Variantes:** «También llegó como: «Noche de son huasteco»», discreta, bajo la fuente.
- Un evento como siempre no lleva línea. Iconos: los de la ficha de un evento, la etiqueta de «Parte de…» para festival y acto, y el calendario
  de «Sesiones», «Horarios» y «Hasta» para lo demás. «am», «pm» y «USD» no quedan solos al partir el renglón (`pegado`, como en OL-432).

En `formaEvento.ts`, el detalle de unas sesiones ya no empieza por «4 sesiones · » (lo dice la frase) y la serie trae sus fechas como detalle.

**El festival antes que sus actos** (`armarBandejas`, `agruparConActos` en `src/lib/propuestas.ts`). Cuando un festival propuesto está por
revisar en la ciudad, sus actos por revisar van justo debajo de él, con 24 de sangría (la columna de los iconos), como hermanos en la misma
lista, sin anidar; aunque un acto haya llegado por otra fuente o en otra búsqueda de la misma ciudad (una búsqueda que se queda sin tarjetas
propias no se pinta). Bajo su festival, la tarjeta de un acto dice «Acto · propuesto por la rutina» y no repite «Acto de «Xantolo 2026»»; solo
su forma propia si la tiene (un taller, unos días). En su fuente, las propuestas siguen en el orden en que llegaron.

**«Aceptar el festival y sus N actos aceptados».** La página lee aparte (`cargarContextoFormas` en `consultas.ts`, con la sesión de
administración) cuántos actos de cada festival propuesto ya se aceptaron y lo esperan (`datos->>marco_propuesto`, aceptadas sin evento) y el
estado de los festivales que nombran los actos y no están por revisar aquí. El «Aceptar» del festival lo cuenta («su acto aceptado» con uno) y
suma los que se aceptan en la misma pantalla. Si esa lectura falla, la bandeja se ve igual con «Aceptar» a secas.

**Lo que dice la línea de lo hecho** (`acciones.ts`, sin cambiar qué hace aceptar ni rechazar; `textoDecidida`, `notaDeFestival`,
`textoActoPublicado`):

- Un acto aceptado antes que su festival: «Aceptaste Danza de Huehues · se publica cuando aceptes el festival «Xantolo 2026»» (la frase de
  `datos.espera`), sin «Ver ficha». La acción ya no llama a `insertarEvento` para un acto que espera (que no lo inserta por diseño y por eso
  la bandeja decía «no se pudo publicar»).
- Al aceptar el festival: «Aceptaste Xantolo 2026 · se publicó con sus 3 actos» y «Ver ficha» al festival (la acción cuenta, tras
  `ligarFicha`, los actos que ya tienen su evento); si alguno no se pudo publicar en ese momento, «se publicó con 2 de sus 3 actos; el otro se
  publica con la siguiente corrida de agendas». Las líneas de los actos que esperaban pasan a «Aceptaste Danza de Huehues · se publicó con el
  festival».
- «Aceptar las N de esta fuente» acepta el festival antes que sus actos (después, cuelgan de él directamente).

**Rechazar y Aceptar en su renglón** (`.acciones`, solo en la bandeja). Los dos botones van en un renglón que se parte si no caben: lado a lado
(Rechazar a la izquierda, Aceptar a la derecha), el botón largo del festival parte su texto junto a Rechazar, y con la letra grande Aceptar baja
al renglón de abajo, a la derecha. Antes, a 320 con la letra al doble, Rechazar se montaba sobre Aceptar sin que el medidor lo viera; el primer
arreglo (columnas) lo hacía visible como desborde de la tarjeta; este lo resuelve. Un nodo más por tarjeta.

**El respaldo local** (`respaldo-local/fixture.mjs`, `server.mjs`). San Luis tiene ahora una búsqueda de agendas de hoy con una propuesta de
cada forma (inventadas; al final del arreglo para no mover ids): el festival «Xantolo 2026» con dos actos por revisar (uno por la búsqueda web,
con variante) y dos aceptados que lo esperan, un recital, un taller de cuatro sesiones, una feria de tres días, dos fechas de un cineclub semanal
(las otras dos aceptadas), la inauguración de «Raíces» y un acto del Festival de Cine de Invierno. `aceptar_propuesta` marca la propuesta en
memoria, como la base; el servidor guarda en memoria los cambios de `propuestas` y los eventos que publica la rutina, y entiende filtros por
ruta JSON (`datos->>marco_propuesto`). Así «Aceptar» se recorre de verdad, por las acciones del servidor. Por esos datos, San Luis sube al
primer lugar de la lista de Ciudades (tiene algo por decidir): `capturar-admin-ciudades.mjs` (OL-432) espera ahora ese orden.

## Decisiones por confirmar (founder o gestor)

1. **Iconos:** festival y acto con la etiqueta (la de «Parte de…» en la ficha de un evento); taller, días seguidos, serie y exposición con el
   calendario (el de «Sesiones», «Horarios» y «Hasta» de la ficha). No dibujé iconos nuevos: en esas tarjetas el calendario sale dos veces (el
   del tipo, arriba, y el de la forma).
2. **Bajo su festival, un acto no repite «Acto de «Xantolo 2026»»:** su tarjeta dice «Acto · propuesto por la rutina» y la sangría lo pone bajo
   él.
3. **El festival no dice fecha ni sitio en su línea de abajo;** un taller o unos días seguidos, el sitio sin la fecha de la primera sesión.
4. **En su fuente, el orden en que llegaron:** el festival va justo antes que sus actos, no al principio de la fuente.
5. **Un acto que llegó por otra fuente o en otra búsqueda va con su festival** y cuenta en la fuente del festival («Aceptar las N de esta
   fuente» lo incluye, después del festival).
6. **La serie dice todas sus fechas en cada tarjeta** (una por fecha, como la propone la rutina); juntarlas en una sola tarjeta pediría una
   acción nueva.
7. **Rechazar y Aceptar se parten en dos renglones cuando no caben** (con la letra grande, Aceptar baja al renglón de abajo, a la derecha); el
   «Aceptar» largo del festival parte su texto junto a Rechazar.
8. **Atribución de los commits:** el encargo pedía «Claude Fable 5.1»; la sesión corre en Claude Opus 5.5 y así van firmados, como en la 464.

## Evidencia (árbol sin `.env`; sin red en las pruebas)

- `npm run lint`: 0 errores (el aviso viejo de `VisorImagen.componentes.test.mjs`). `npm run typecheck` en verde.
- `npm test`: 264 archivos, 4 341 pruebas, todas bien. Nuevas: `src/lib/bandejaFormas.test.ts` 13 (cada forma con su icono; el acto con el
  enlace a su festival, sin él mientras se decide, con el de su evento si ya se aceptó y sin «Acto de» si se rechazó; bajo su festival, solo su
  forma propia; taller, serie y exposición; las variantes; la línea de abajo sin el cuándo o el dónde que ya dice la forma; los actos movidos a
  la búsqueda de su festival y la búsqueda vacía que no se pinta; qué se lee aparte), `src/app/admin/ciudades/acciones.aceptar.test.ts` 4 (el
  acto que espera: aceptado, sin insertar y con su frase; el festival: «Ver ficha» y cuántos actos se publicaron, con el filtro
  `datos->>marco_propuesto`; sin actos o sin poder leerlos, sin nota; un evento de siempre, como en OL-429) y en `propuestas.test.ts` 5 (la
  frase de espera como continuación; «Aceptar el festival y…»; lo que se publicó con el festival; el festival antes que sus actos, también de
  otra fuente, y que ninguno se pierda; la línea sin cuándo o sin dónde). En `formaEvento.test.ts`, el detalle sin «4 sesiones · » y el de la
  serie.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 103 migraciones, 2 225 pruebas, 0 fallaron (sin migración nueva).
- `npm run inventario`: sin novedades (el área de toque del enlace al festival con `--espacio-3` y `--espacio-1`, no con medidas en duro).
- `npm run medir -- --aceptar` y después `npm run medir` (52 pantallas × 4 anchos): **sin novedades**. Presupuestos nuevos o cambiados, todos de
  Ciudades: s34 bandeja de Oaxaca 61 → 66 nodos (el renglón de acciones), **s34a bandeja de San Luis con sus formas, nueva: 134**, y por los
  datos nuevos del respaldo s32 lista 113 → 114 y s33 su hoja 137 → 138 (el número violeta de San Luis) y s35 Corridas 82 → 89 (una búsqueda
  más); la profundidad no cambia. En una de cuatro pasadas completas salió un hallazgo de teclado en la ficha del Showcase (s38, el campo de
  notas): aislada pasa sin novedades, y la rama no toca Showcase, `src/components` ni `globals.css`; es intermitente.
- Con la letra al doble (`npm run medir -- --letra=2 --solo=s34`): sin novedades.
- `npm run test:componentes`: **681 pruebas, todas bien** (la de OL-365 del alta de eventos, que fallaba en la 464, ya pasa). Las **18 de Ciudades** en Chrome real con toques por coordenadas que fallan si algo tapa (13 de
  OL-432 y 5 nuevas, armadas con `armarBandejas` como la página): el festival antes que sus actos, con 24 de sangría, el que llegó por la
  búsqueda web con ellos, «Festival · 4 actos» y su periodo, «Aceptar el festival y sus 2 actos aceptados» a la derecha de Rechazar con 44 de
  alto y nada a lo ancho; el acto que espera («… · se publica cuando aceptes el festival «Xantolo 2026»», sin «Ver ficha», y el festival pasa a
  «sus 3 actos aceptados»); aceptar el festival («… · se publicó con sus 3 actos», «Ver ficha» a él y el acto que esperaba «se publicó con el
  festival»); taller, serie, exposición y acto de un festival registrado, cada icono en la columna de los iconos y a la altura de su línea, con
  el enlace al festival; y «Aceptar las 7 de esta fuente», el festival antes que sus actos.
- **Recorrido con el respaldo local** (`scripts/ops/auditoria-ui/capturar-bandeja-formas.mjs`, nuevo; app compilada contra el respaldo, reloj
  fijo el miércoles 21 de octubre a las 10:00): 2 toques reales por las acciones de verdad del servidor, ninguna página se desplaza a lo ancho,
  sin errores de consola, y comprobado en pantalla y en el respaldo: el orden (Xantolo 2026 · Danza de Huehues · Son huasteco en la plaza ·
  Recital · Taller · Feria · Cineclub ×2 · Raíces · Función de clausura); cada línea de forma; «Aceptar» del acto deja «… · se publica cuando
  aceptes el festival «Xantolo 2026»»; «Aceptar el festival y sus 3 actos aceptados» publica el festival (`clase = festival`) y **sus tres
  actos colgados de él** (`evento_padre_id`: Altar monumental, Concurso de calaveritas y Danza de Huehues) y la línea dice «se publicó con sus 3
  actos».

- **El recorrido de OL-432** (`capturar-admin-ciudades.mjs`, con el respaldo de esta pieza y sus capturas fuera del repo): 15 toques reales,
  todas sus comprobaciones bien, con San Luis primero en la lista; la bandeja de Oaxaca se ve como en capturas-464 (Rechazar y Aceptar, ahora en
  su renglón, bajan 3 px: una fila vacía de la rejilla queda antes de ellos y no después; la tarjeta mide lo mismo).

## Capturas (`docs/rediseno/capturas-467/`, Chrome real, 390×844 a 2×, comprimidas con `comprimir.mjs` y revisadas a tamaño completo)

- `01-festival-y-sus-actos.png`: «Propuestas de San Luis Potosí», «10 por revisar», «Buscar agendas y eventos · Hoy, 7:07 am · 14 propuestos ·
  4 aceptados», «Agendas de gobierno 6». El festival: «Evento · propuesto por la rutina», «Xantolo 2026», la etiqueta con «Festival · 4 actos» y
  «Del 28 de oct al 2 de nov», la fuente sin fecha ni sitio; Rechazar y «Aceptar el festival y sus 2 actos aceptados» (dos renglones, a la
  derecha). Debajo, con sangría, «Acto · propuesto por la rutina · Danza de Huehues» y «Son huasteco en la plaza» (llegó por la búsqueda web).
- `02-actos-bajo-su-festival.png`: los dos actos con sangría; «Son huasteco en la plaza» con «También llegó como: «Noche de son huasteco»»;
  después, sin sangría, el «Recital de guitarra clásica» (un evento como siempre, sin línea de forma) y el principio del taller.
- `03-taller-y-dias-seguidos.png`: «Taller de papel picado» con el calendario, «Taller · 4 sesiones», «mar 3, jue 5, mar 10 y jue 12 de nov ·
  5:00–7:00 pm» y, abajo, «Casa de Cultura del Barrio de San Miguelito · fuente…»; «Feria del libro infantil» con «Evento de 3 días» y «vie 23,
  sáb 24 y dom 25 de oct · 11:00 am», «Jardín de San Francisco…».
- `04-serie-y-exposicion.png`: «Universidades y museos 3»: dos «Cineclub de los miércoles» con «Serie · 4 fechas, cada semana», «mié 28 de oct y
  mié 4, mié 11 y mié 18 de nov · 7:00 pm» (la hora entera en el renglón de abajo) y su fecha propia («28 oct, 7:00 pm» y «4 nov, 7:00 pm · Casa
  del Poeta Ramón López Velarde»); «Inauguración: Raíces» con «Exposición «Raíces» · hasta el lun 30 de nov» y «23 oct, 7:00 pm · Museo Nacional
  de la Máscara».
- `05-acto-de-festival-registrado.png`: «Búsqueda web 1»: «Función de clausura: cortometrajes potosinos» con la etiqueta y «Acto de «Festival de
  Cine de Invierno»», el nombre subrayado como enlace a su ficha.
- `06-acto-en-espera.png`: tras tocar Aceptar en «Danza de Huehues»: su línea «Aceptaste Danza de Huehues · se publica cuando aceptes el festival
  «Xantolo 2026»» con la palomita y sin «Ver ficha», con sangría; el festival dice ahora «Aceptar el festival y sus 3 actos aceptados»; «9 por
  revisar · 5 aceptados».
- `07-festival-aceptado.png`: tras tocar el del festival: «Aceptaste Xantolo 2026 · se publicó con sus 3 actos» con «Ver ficha»; debajo
  «Aceptaste Danza de Huehues · se publicó con el festival» y «Son huasteco en la plaza» todavía por decidir; «8 por revisar · 6 aceptados».
  En la comprimida la palomita sale gris oscuro: en la original es verde (la paleta de 256 colores; la original se revisó a tamaño completo).

## Lo que quedó fuera y por qué

- **Juntar las fechas de una serie en una tarjeta:** la rutina propone una por fecha y la app no tiene una clase para series; aceptarlas juntas
  sería una acción nueva (el encargo pedía no cambiar las acciones).
- **Rechazar un festival con actos que esperan** sigue diciendo solo «Rechazaste Xantolo 2026 · duplicado»; esos actos se publican sueltos en la
  siguiente corrida de agendas (OL-433). Decirlo en la línea pediría leer sus actos al rechazar: otra pieza si el founder lo quiere.
- **«leída el 21 oct»** puede partirse entre «21» y «oct» (ya pasaba en OL-432): `pegado` es compartido y no lo amplié.
- **La ruta vieja** (`/admin/ciudades/propuestas/[id]`) solo enseña corridas sin ciudad (Showcase, sin eventos): no lleva formas.
- **Iconos propios** para taller, serie y exposición: pedirían dibujos nuevos en `Iconos.tsx`, que es compartido.
