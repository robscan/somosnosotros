# 470 · «Aceptar todas» en la bandeja de propuestas de Ciudades (OL-438)

**Fecha:** 2026-10-21. **Rama:** `bandeja-aceptar-todas`, desde `origin/main` (`cacfd6c5`, con OL-434 #554 y OL-437 #555). **Operador:**
agente de la pieza (Claude) para el Gestor VII, sin otros agentes. **Migración:** ninguna. **Variables de entorno:** ninguna nueva. **Estado:**
lista para la revisión del gestor.

## El pedido

El founder preguntó «por qué no hay un botón para aceptar todas las propuestas de una búsqueda de api» y luego dijo «sí, agregar aceptar
todas». La bandeja de OL-432 solo ofrecía «Aceptar las N de esta fuente» donde la fuente ya había tenido una tanda aceptada en una corrida
anterior (la regla de OL-427: «la primera tanda va una por una»). En San Luis no había ninguna tanda previa (17 lugares, 25 eventos y 33 artistas
por revisar en producción), así que el founder no veía el botón en ninguna bandeja.

## Qué cambió

**Se retira la regla de la primera tanda** (`ofrecerTodas` en `src/lib/propuestas.ts`). «Aceptar las N de esta fuente» sale siempre que
queden 2 o más por decidir en la fuente, haya tenido o no una tanda aceptada antes. La única excepción: si esa fuente es todo lo que queda en
su búsqueda, su botón repetiría el de la cabecera y no sale. `fuentes_con_tanda` (de `panel_propuestas`) ya no decide el botón; sigue
ordenando las fuentes (las que ya tuvieron una tanda aceptada, primero). La base no se toca.

**«Aceptar todas» por búsqueda** (`Bandeja.tsx`, `ciudades.module.css`). El nombre de cada búsqueda y lo que trajo («Buscar lugares · 19 oct ·
14 propuestos · 9 aceptados») los pinta ahora la bandeja (`cabecera`), no la página, y debajo va un botón de contorno «Aceptar las N» (lo que
mide su texto, a la izquierda) cuando quedan 2 o más en la búsqueda. Abre la hoja «Aceptar todas»:

> Vas a aceptar 11 propuestas de eventos de San Luis Potosí.
> Las que no se puedan publicar (un repetido, un sitio sin punto, un acto cuyo festival no se ha aceptado) se quedan por revisar con su razón.
> Cancelar · Aceptar las 11

Los ejemplos son los de lo que se acepta (`textoConfirmarTodas`): con lugares, «(un repetido, un sitio sin punto)»; con artistas, «(un
repetido)»; el del acto solo si hay actos de un festival propuesto en la misma bandeja. Al aceptar:

- Van **una por una, en el orden de la pantalla** (`enOrdenDeAceptar`, que es `agruparConActos`): el festival antes que sus actos, que después
  cuelgan de él directamente. Cada una pasa por la misma acción de siempre (`aceptarPropuesta`, sin cambios): `validarLugar` y «¿es este?»,
  `validarArtista` o `publicarEvento`.
- **El avance va en el mismo botón**: «Aceptando 3 de 11…», con el latido de un botón en camino (`aria-busy`; no se apaga). Mientras corre, los
  botones de cada fuente no salen.
- **Antes de cada una, la tanda mira lo que hay ahora** (`pasoDeTanda`, con un espejo de los estados en una `ref`): salta la que se decidió a
  mano mientras corría (un rechazo con su motivo, por ejemplo) y deja por revisar, sin mandarlo, un acto cuyo festival está en la misma bandeja
  y no se aceptó, con «Su festival «Xantolo 2026» no se aceptó: acéptalo antes que este acto.». Un acto cuyo festival se rechazó sí se acepta
  (se publica suelto, OL-433).
- **Al terminar, la cabecera dice cuántas**: «10 aceptadas · 1 por revisar» (`textoTandaHecha`; las aceptadas, de la tanda; las por revisar,
  en vivo: si después se decide la que quedó, la línea dice «10 aceptadas»). Cada tarjeta decidida tiene su línea de lo hecho; las que no se
  pudieron publicar se quedan con su razón y sus dos botones. Tras la tanda, ningún «Aceptar las N» vuelve en esa búsqueda: lo que quedó va
  una por una.

**Rechazar sigue una por una, con su motivo** (es lo que enseña a la rutina): no hay «Rechazar todas» ni en la cabecera ni en la hoja.

**La búsqueda que se queda sin nada por revisar sigue en pantalla** (`BandejasDeCiudad` en `Bandeja.tsx`; la página). Al probar con el
respaldo apareció un fallo que ya existía desde OL-432 y que «Aceptar todas» hacía muy visible: cada acción refresca la página y el servidor
solo trae las búsquedas con algo por revisar, así que al aceptar la última la búsqueda entera desaparecía, con sus líneas de lo hecho (con
«Aceptar todas» sin ninguna que falle, la cabecera nunca llegaba a decir «5 aceptadas»: el paso 6 del recorrido falló así antes del arreglo;
con una sola búsqueda, la página cae en su «Nada por revisar en …»). Ahora la lista de búsquedas se toma al entrar, como la de cada bandeja; lo que trajo cada una sí llega al día (`notas`, de todas las
búsquedas de la ciudad que da `panel_ciudades`).

**El respaldo local** (`respaldo-local/fixture.mjs`). La búsqueda de agendas de hoy en San Luis trae una propuesta más, al final del arreglo
(los ids de antes no se mueven): «Feleal: un viaje por el mundo en acordeón», el mismo título a la misma hora que el evento que ya está en el
Teatro de la Paz, para que «Aceptar todas» tenga una que no se puede publicar («Ya está … a esa hora: recházala como duplicado»). Por ella
San Luis pasa de 10 a 11 por revisar; `capturar-bandeja-formas.mjs` (OL-434) espera ahora ese título en su orden.

## Decisiones por confirmar (founder o gestor)

1. **«Aceptar las N de esta fuente» no sale si esa fuente es todo lo que queda en su búsqueda**: repetiría el «Aceptar las N» de la cabecera
   con el mismo número.
2. **Tras «Aceptar todas» no vuelve ningún botón de «todas» en esa búsqueda** (ni el de la cabecera ni los de cada fuente), y tras la tanda de
   una fuente no vuelve el suyo: lo que quedó no se pudo publicar y va una por una, cada una con su razón.
3. **Mientras corre una tanda, las tarjetas siguen activas** (se puede rechazar o aceptar a mano; la tanda no la vuelve a mandar). Los botones
   de cada fuente se esconden durante «Aceptar todas»; el de la cabecera se apaga durante la tanda de una fuente.
4. **Los ejemplos de la hoja dependen de lo que se acepta** (lugares, eventos o artistas) y el del acto solo sale si hay actos de un festival
   propuesto. El encargo daba «17 aceptadas · 2 por revisar» para 17; aquí suman N («15 aceptadas · 2 por revisar»).
5. **Un acto cuyo festival de la misma bandeja no se aceptó se queda por revisar en la tanda** (no se manda); a mano, «Aceptar» lo sigue
   aceptando y espera a su festival, como en OL-434.
6. **El botón de la cabecera mide lo que su texto, a la izquierda bajo lo que trajo**; los de cada fuente siguen a lo ancho, como estaban.
7. **«Aceptar las N de esta fuente» sigue sin hoja de confirmación**, como antes; solo «Aceptar las N» de la búsqueda la pide.
8. **La búsqueda que se queda sin nada por revisar sigue en pantalla hasta salir** (arreglo al fallo de OL-432 descrito arriba).
9. **Atribución de los commits:** el encargo pedía «Claude Fable 5.1»; la sesión corre en Claude Opus 5.5 y así van firmados, como en la 464 y
   la 467.

## Evidencia (árbol sin `.env`; sin red en las pruebas)

- `npm run lint`: 0 errores (el aviso viejo de `VisorImagen.componentes.test.mjs`). `npm run typecheck` en verde.
- `npm test`: 265 archivos, 4 357 pruebas, todas bien. En `src/lib/propuestas.test.ts`, la de `ofrecerTodas` reescrita (desde 2, sin tanda
  anterior; la fuente que es todo lo que queda no repite la cabecera) y 4 nuevas: el orden de la tanda (el festival antes que sus actos aunque
  un acto llegara antes o por otra fuente, ninguna dos veces), `pasoDeTanda` (salta lo decidido o en camino; deja con su razón el acto cuyo
  festival no se aceptó; acepta si el festival se aceptó o se rechazó, o si no está en la bandeja), la hoja por tipo (lugares, eventos con
  actos, artistas, mezcla y sin ciudad) y el botón, su avance y la cuenta final («15 aceptadas · 2 por revisar», «17 aceptadas», «1 aceptada ·
  1 por revisar», «Ninguna aceptada · 3 por revisar»).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 103 migraciones, 2 225 pruebas, 0 fallaron (sin migración nueva;
  la de `fuentes_con_tanda` sigue pasando: la base no cambió).
- `npm run inventario`: sin novedades (las dos clases nuevas, con `--espacio-1` y `--espacio-3`).
- `npm run medir`: 2 hallazgos, los dos de presupuesto y esperados: **s34 bandeja de Oaxaca 66 → 68 nodos** (el «Aceptar las 5» de la cabecera
  y el «Aceptar las 2 de esta fuente» que ahora sale en la búsqueda web) y **s34a bandeja de San Luis 134 → 146** (el de la cabecera, dos de
  fuente y la tarjeta de Feleal); la profundidad no cambia, y s32, s33 y s35 tampoco (lo de Feleal solo cambia un número). Con `--aceptar` y
  otra pasada entera: 52 pantallas × 4 anchos **sin novedades**. Con la letra al doble (`--letra=2 --solo=s34`): sin novedades.
- `npm run test:componentes`: **692 pruebas, 691 bien**. Las **24 de Ciudades** en Chrome real con toques por coordenadas que fallan si algo
  tapa: la de la bandeja reescrita (la búsqueda web, sin tanda anterior, ofrece «Aceptar las 2 de esta fuente» y las acepta en orden) y 6
  nuevas: la cabecera (nombre, lo que trajo, «Aceptar las 8» de contorno, a la izquierda, con 44 o más, no violeta; la fuente con 7 de 8
  conserva el suyo; sin «Rechazar todas»), la hoja con su texto exacto y «Cancelar» que no acepta nada; la tanda en el orden de la pantalla con
  «Aceptando 3 de 8…» (`aria-busy`, sin apagarse, sin los botones de fuente), el taller sin punto que se queda con su razón y sus dos botones y
  «7 aceptadas · 1 por revisar», que pasa a «7 aceptadas» al aceptarlo a mano; el festival que no se acepta y sus dos actos que se quedan sin
  mandarse («5 aceptadas · 3 por revisar»); lo rechazado a mano mientras corre que no se vuelve a mandar; la fuente que es todo lo que queda
  sin su botón; y la búsqueda que el servidor ya no trae, que se queda con sus 8 líneas, «8 aceptadas» y lo que trajo al día (y sin búsquedas
  al entrar, la frase de siempre). **La que falla es la de OL-365 del alta de eventos** («Ver el evento» → `page.waitForURL:
  net::ERR_HTTP_RESPONSE_CODE_FAILURE`), las tres veces que la corrí sola: ningún archivo que carga está en el diff de esta rama (es la misma
  de `origin/main`); es la que ya fallaba en la 464 y pasó en la 467, del entorno de Chrome y no de esta pieza.
- **Recorrido con el respaldo local** (`capturar-bandeja-aceptar-todas.mjs`, nuevo): 4 toques reales por las acciones de verdad del servidor,
  ninguna página se desplaza a lo ancho, sin errores de consola, y comprobado en pantalla y en el respaldo: la cabecera de Oaxaca con su botón
  y los dos de fuente; la hoja de San Luis con su texto; «Aceptando 3 de 11…» con el festival ya aceptado y sin los botones de fuente; «10
  aceptadas · 1 por revisar», diez líneas y Feleal con «Ya está … a esa hora: recházala como duplicado.» y sus dos botones; en el respaldo, 14
  aceptadas y la repetida por revisar, **el festival publicado con sus cuatro actos colgados de él** (los dos que lo esperaban y los dos que la
  tanda aceptó después); y Oaxaca con las 5 aceptadas, la búsqueda en pantalla con «5 aceptadas» y «14 propuestos · 14 aceptados». Ese último
  paso falló antes del arreglo de `BandejasDeCiudad` (la línea nunca aparecía) y pasa después.
- El recorrido, las capturas y `medir` corrieron antes del último cambio de `Bandeja.tsx` (la tanda toma su orden de `enOrdenDeAceptar` en vez
  de aplanar los grupos ella misma: el mismo orden, ahora con la función que prueban las unitarias); typecheck, lint, las 24 de Ciudades y la
  pasada completa de componentes corrieron después.

## Capturas (`docs/rediseno/capturas-470/`, Chrome real, 390×844 a 2×, comprimidas con `comprimir.mjs` y revisadas a tamaño completo)

Recorrido `scripts/ops/auditoria-ui/capturar-bandeja-aceptar-todas.mjs` (nuevo): app compilada contra el respaldo, reloj fijo el miércoles 21
de octubre a las 10:00, toques reales por las acciones de verdad del servidor; para ver el avance, cada acción se frena 1,5 s solo en ese paso.

- `01-cabecera-con-el-boton.png`: «Propuestas de Oaxaca», «Buscar lugares», «19 oct · 14 propuestos · 9 aceptados» y, debajo, «Aceptar las 5»
  de contorno, a la izquierda; luego «Sistema de Información Cultural 3» con «Aceptar las 3 de esta fuente» a lo ancho. (La búsqueda web, que
  nunca tuvo una tanda aceptada, ofrece abajo su «Aceptar las 2 de esta fuente»: comprobado en el recorrido.)
- `02-hoja-de-confirmacion.png`: San Luis, «Buscar agendas y eventos · Hoy, 7:07 am · 15 propuestos · 4 aceptados» con «Aceptar las 11» y
  «Agendas de gobierno 7» con «Aceptar las 7 de esta fuente», bajo el velo; la hoja «Aceptar todas» con «Vas a aceptar 11 propuestas de eventos
  de San Luis Potosí.», «Las que no se puedan publicar (un repetido, un sitio sin punto, un acto cuyo festival no se ha aceptado) se quedan por
  revisar con su razón.» y «Cancelar» · «Aceptar las 11» (violeta).
- `03-avance.png`: «Aceptando 3 de 11…» en el botón de la cabecera (sale pálido: la foto cayó a mitad del latido); sin el botón de la fuente;
  «Aceptaste Xantolo 2026 · se publicó con sus 2 actos» y «Aceptaste Danza de Huehues» con «Ver ficha», y «Son huasteco en la plaza» con
  «Aceptando…».
- `04-resultado.png`: «1 por revisar» arriba; la nota de la búsqueda al día («15 propuestos · 14 aceptados») y, debajo, «10 aceptadas · 1 por
  revisar»; las líneas de Xantolo, sus dos actos con sangría, el recital, el taller y la feria; y la tarjeta de Feleal todavía por decidir.
- `05-la-que-se-quedo.png`: Feleal con «Ya está «Feleal: un viaje por el mundo en acordeón» a esa hora: recházala como duplicado.» en rojo y
  sus botones Rechazar y Aceptar; luego «Universidades y museos» y «Búsqueda web» con sus líneas de lo hecho, sin número.
- `06-todas-aceptadas.png`: Oaxaca después de «Aceptar las 5», donde se pueden publicar todas: «Buscar lugares», «19 oct · 14 propuestos · 14
  aceptados», «5 aceptadas» y las cinco líneas con «Ver ficha», aunque el servidor ya no trae esa búsqueda.

## Lo que quedó fuera y por qué

- **La razón de un lugar sin punto** es la del alta de lugar («Falta la ubicación: busca la dirección o mueve el pin en el mapa.») y habla de
  un mapa que la bandeja no tiene. Cambiarla es tocar `aceptarPropuesta` para una frase: otra pieza chica si el founder la quiere.
- **La tanda corre en el navegador.** Si se cierra la pestaña a mitad, lo aceptado queda aceptado y lo demás sigue por revisar; no hay una tanda
  en el servidor. Van una por una a propósito (el festival antes que sus actos, y Mapbox una vez por evento sin punto).
- **La ruta vieja** (`/admin/ciudades/propuestas/[id]`, solo corridas sin ciudad) no lleva cabecera ni «Aceptar todas»: solo «Aceptar las N de
  esta fuente», ahora siempre.
- **«Rechazar todas»**, por diseño: rechazar enseña a la rutina y pide su motivo.
- **`fuentes_con_tanda`** sigue en `panel_propuestas` y ordena las fuentes; no se quitó de la base (las migraciones solo añaden).
