# 483 · Cartelera: una ficha, una propuesta (OL-451)

**Fecha:** 2026-10-22. **Rama:** `cartelera-una-por-ficha`, desde `origin/main` (`7c8763e4`, con #569 y #570). **Operador:** agente de la pieza
(Claude) para el Gestor VII, sin otros agentes. **Migración:** ninguna. **Variables:** ninguna. **Pantallas:** ninguna. **Estado:** lista para la
revisión del gestor.

## El pedido

El gestor corrió la simulación completa del guion (`cartelera-cdmx --simular`, informe `cartelera-cdmx-simulado-2026-10-22T21-44-58-614Z.md`):
910 fichas leídas sin errores en 29 min, pero no se podía cargar así: 1 339 eventos de 910 fichas, 290 recintos nuevos (la cartelera tiene
227 y la ciudad ya tiene 124 lugares), contadores que no cuadraban, horas de la muestra en UTC y 77 «sin hora» sin ejemplos.

## Por qué pasaba

1. **Una propuesta por fecha.** Las filas de una ficha pasaban por `proponer`, que junta como sesiones solo los talleres y los días seguidos;
   lo demás (una temporada de jueves a domingo, un recorrido diario que descansa los lunes) era una «serie»: una propuesta por fecha. Por eso
   Artes Escénicas pasaba de 128 leídos a 529 y ZooAventuras salía cada día.
2. **Recintos repetidos.** La simulación corría por pasos de 10 minutos y cada paso volvía a leer de la base las propuestas de lugar, donde
   lo «escrito» al simular no está: cada paso volvía a proponer los mismos recintos. Además no había un control por el id del recinto en la
   cartelera. Y el cruce por cercanía con el directorio usaba `nombresParecidos` de «Buscar lugares», que quita las palabras de la ciudad
   («ciudad», «méxico»): «Museo de la Ciudad de México» se quedaba sin palabras propias y no cruzaba con nada, y «Antiguo Colegio de San
   Ildefonso» o «Teatro de la Ciudad Esperanza Iris» no se reconocían como el mismo sitio que su versión corta.
3. **Contadores.** «308 operaciones» contaba llamadas a la base (un `insert` con muchas filas es una), no propuestas; los descartes se contaban
   por función, no por ficha.
4. **Horas.** La muestra imprimía el instante guardado (UTC) cortado: las 11:00 del Xantolo son las 17:00 UTC. Lo guardado estaba bien.

## Qué cambió

- **Una ficha = una propuesta** (`agendas.ts`, paso a′ de `proponer`): toda fila de una ficha de la cartelera (`cartelera_id`) que llega
  después de la primera se suma como sesión a la propuesta de esa ficha, sea cual sea su cadencia; nunca una serie. Hasta 31 funciones (el tope
  de sesiones de un evento); una exposición abierta sigue siendo una exposición.
- **Publicar** (`publicarEvento.ts`): un evento con funciones en días que no van seguidos se publica con sus sesiones en `eventos_sesiones`
  (como un taller); si no, la ficha diría que es todos los días. Los días seguidos con el mismo horario siguen sin filas (OL-310).
- **Cada ficha se propone sola** (antes, por lotes de 150 filas): así se sabe qué pasó con cada una. `resumen.cartelera.motivos` cuenta, por
  ficha leída y no propuesta, su motivo (pasado, sin hora, fuera de la ciudad, ya estaba, la misma función…, o `no_guardada`), y
  `ya_propuestos` los de la lista que no se pidieron por estar propuestos antes: **listados = ya propuestos + leídos + sin respuesta (+ por
  leer)** y **leídos = propuestos + motivos**.
- **Un recinto, una vez:** por su id en la cartelera dentro de la corrida (`cursor.cartelera.propuestos`, que sobrevive entre pasos) y entre
  corridas (`datos.cartelera_recinto` de las propuestas de lugar), además de por nombre (y rechazados) como antes.
- **Cruce con el directorio:** `cruzarRecinto` suma `mismoRecinto` (solo a menos de 150 m): las palabras propias del nombre corto (sin
  artículos, «antiguo» ni la clase de sitio) están todas en el largo; si los dos dicen su clase («museo», «teatro»…), es la misma; con una sola
  palabra propia, solo a menos de 60 m.
- **El guion** (`cartelera-cdmx.ts`): con `--simular` corre de un tirón (un solo paso de hasta 3 h: lo «escrito» se recuerda en memoria); sin
  `--simular`, por pasos de 10 min como antes. El informe ahora:
  - cuadra por ficha (si no, dice «NO CUADRA») y termina con «**se escribirían N propuestas de evento y M de lugar**» (filas, no llamadas);
  - pone las horas en la de la ciudad (America/Mexico_City), con cuántas funciones lleva cada propuesta;
  - lista 10 ejemplos sin hora con su título, su ficha y el principio de su descripción;
  - dice cuántos recintos cruzan y cuántos no, si cruzan Palacio de Bellas Artes, Teatro de la Ciudad Esperanza Iris, Museo de la Ciudad de
    México y Colegio de San Ildefonso (y con qué lugar), y los que no cruzan con el lugar del directorio más cercano a menos de 1 km.
  Eso sale de `ctx.anotarCartelera` (opcional, en el contexto y en las dependencias del motor), que el resumen de la corrida no guarda.

## Los recintos que debían cruzar

No leo la base de producción, así que no tengo los nombres exactos de los 124 lugares: la próxima simulación del gestor los dirá en la
sección «Recintos» del informe. Con nombres y puntos plausibles del directorio, la prueba nueva comprueba:

| Recinto de la cartelera | Lugar del directorio | ¿Cruza? |
| --- | --- | --- |
| Palacio de Bellas Artes | Museo del Palacio de Bellas Artes (a ~5 m) | sí (antes también, por `nombresParecidos`) |
| Teatro de la Ciudad Esperanza Iris | Teatro de la Ciudad (a ~5 m) | sí (antes no) |
| Museo de la Ciudad de México | Museo de la Ciudad (a ~1 m) | sí (antes no: sin palabras propias) |
| Colegio de San Ildefonso | Antiguo Colegio de San Ildefonso (a ~70 m) | sí (antes no) |
| Teatro de la Ciudad Esperanza Iris | Museo Nacional de Arte (a ~150 m) | no |

Si en la base el lugar se llama distinto o su punto está a más de 150 m, seguirá sin cruzar y el informe lo enseñará con su distancia.

## Decisiones por confirmar

1. **Hasta 31 funciones por propuesta** (el tope de `eventos_sesiones` en la base). Un recorrido diario de dos meses queda con sus primeras 31
   funciones (las de los próximos 60 días); las siguientes no llegan en la corrida siguiente porque la ficha ya está propuesta.
2. **Una temporada en días sueltos se publica como evento con sesiones** (como un taller, clase «evento»): la ficha enseña sus días. La bandeja
   lo dice «Evento de N días».
3. **Una función por día** (la primera hora): si una obra da dos funciones el mismo día, la segunda no queda.
4. Si una de las fechas de una ficha ya está en la agenda, esa fila cuenta como ya estaba y las demás se proponen juntas.

## Evidencia

- `npm run lint` (0 errores; el aviso de `VisorImagen.componentes.test.mjs` ya estaba), `npm run typecheck`, **`npm test`: 4 624 pruebas**,
  **`test:db`: 2 359, 0 fallaron**, `npm run inventario` y `npm run medir` sin novedades, **`npm run test:componentes`: 719 de 719**.
- Pruebas nuevas (`carteleraCdmx.test.ts`): una temporada de jueves a domingo (8 funciones), un recorrido diario salvo lunes y otra obra en el
  mismo teatro son **3 propuestas**, con sus funciones como sesiones (el recorrido, 31); el teatro que nombran tres fichas, **una sola propuesta
  de lugar** aunque cada ficha se lea en un paso distinto; las cuentas cuadran (4 leídas = 3 propuestas + 1 sin hora); la ficha sin hora llega al
  guion con su enlace; publicar la temporada escribe sus 8 sesiones. El cruce de los cuatro recintos. La hora: el Xantolo de las 11:00 se guarda
  como `2026-10-25T17:00:00.000Z`, es decir las 11:00 de la ciudad, y el informe la enseña como «2026-10-25 11:00». `cartelera-cdmx.test.ts`: el
  informe cuadra, las líneas de propuestas de evento y de lugar, la hora de la ciudad, los ejemplos sin hora, el cruce y «NO CUADRA».
- Ninguna petición real a la cartelera en esta pieza.

## Para el gestor

La siguiente simulación (`node scripts/instituciones/correr.mjs cartelera-cdmx --autor <id del admin> --simular`) debería dar, como mucho, una
propuesta de evento por ficha leída y, como mucho, un recinto nuevo por recinto de la cartelera; su informe trae ya los ejemplos sin hora y el
cruce de recintos para decidir antes de la carga.

## Segunda vuelta (misma rama, PR #571)

El gestor corrió la simulación real con lo de arriba (`cartelera-cdmx-simulado-2026-10-22T22-27-51-289Z.md`): las cuentas ya cuadran (911
leídas → 740 propuestas de evento + 187 de lugar), pero:

1. **Un cruce equivocado:** «Museo de la Ciudad de México» cruzaba con «Museo de la Policía de la Ciudad de México». Venía de `resolverLugar`
   (el nombre «contenido» en otro: `nombresCoinciden`), que la cartelera usaba antes que nada, y que además `proponer` y `publicarEvento`
   volvían a aplicar al nombre del sitio. Ahora el cruce es estricto (`comoCruzanNombres` / `cruceDeRecinto`), y ante la duda **no cruza**: el
   recinto se propone como lugar y la administración lo une. Solo cruza:
   - **por el mismo nombre** (exacto);
   - **por nombre parecido**: las mismas palabras quitando artículos y lo que sobra («Antiguo», «de México», «CDMX»), y no a más de 1 km;
   - **por cercanía**: a menos de 60 m, el nombre corto (de dos palabras o más) es el principio del largo («Teatro de la Ciudad» ≈ «Teatro de
     la Ciudad Esperanza Iris»).
   Nunca si uno tiene palabras propias que el otro no tiene: «Museo de la Policía…», «Museo del Estanquillo», «Museo de Arte Moderno» frente a
   «Museo de Arte Popular», y tampoco «Museo del Palacio de Bellas Artes» frente a «Palacio de Bellas Artes» ni «Museo Panteón de San Fernando»
   frente a «Panteón de San Fernando» (palabra de más al principio). Y una fila de la cartelera ya no se vuelve a resolver por parecido: al
   proponer y al publicar solo vale el lugar con ese **nombre exacto** (`lugarExacto`).
2. **El informe lista todos los que cruzan** (eran 38): recinto → lugar del directorio · distancia · por qué (el mismo nombre, nombre parecido
   o cercanía), para revisarlos uno por uno; siguen los cuatro pedidos y los que no cruzan con lo más cercano.
3. **«no_guardada 7».** Era una ficha que no se propuso sin que ningún motivo la descartara. La causa más probable: `proponer` sumó sus funciones
   a la propuesta de **otra ficha** con el mismo título en el mismo sitio (la misma actividad listada dos veces, un taller o días seguidos), y
   eso no se contaba como descarte. Ahora eso tiene su motivo, **`otra_ficha`**, y el informe lista esas fichas con su enlace y a cuál se sumaron
   («Sumadas a otra ficha»). Lo que quede como `no_guardada` es de verdad que no se guardó (la base falló, aviso «No se pudieron guardar algunas
   propuestas», o la corrida dejó de correr a medio paso); el informe lo explica y las lista con su enlace («No guardadas»). La próxima simulación
   dirá cuántas de las 7 eran de cada una.

Pruebas nuevas: el par real (Museo de la Ciudad de México / Museo de la Policía de la Ciudad de México) y los parecidos (Estanquillo, Arte
Moderno / Arte Popular, Museo / Teatro de la Ciudad, Museo del Palacio de Bellas Artes) **no cruzan**; Palacio de Bellas Artes (exacto), Teatro de
la Ciudad Esperanza Iris (cercanía a 5 m, no a 120 m) y Colegio de San Ildefonso (parecido) **sí**, con cómo y a qué distancia; un nombre
parecido a más de 1 km no; el mismo taller en dos fichas da una propuesta con dos sesiones y la segunda cuenta como `otra_ficha` con su enlace;
con la base fallando, las 5 fichas cuentan como `no_guardada` con su enlace; el informe lista los que cruzan, las sumadas y las no guardadas.
Verificación: lint (0 errores), typecheck, **test 4 626**, **test:db 2 359**, inventario y medir sin novedades, **componentes 719 de 719**. Ninguna
petición real a la cartelera.

**Por confirmar:** con la regla estricta cruzarán menos recintos que los 38 de la simulación (los que solo cruzaban por un nombre «contenido» en
otro); esos llegarán como propuestas de lugar para que la administración los una o los rechace como duplicado.

