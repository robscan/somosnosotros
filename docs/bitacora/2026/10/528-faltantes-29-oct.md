# 528 · OL-496 · Faltantes del 29 de octubre: la hoja de números sin repetidos, dos pruebas robustas en la CI y reintentar lo que no salió al reconectar Instagram

**Fecha:** 2026-10-29. **Rama:** `faltantes-29-oct` (desde `origin/main` `ba4589dd`, con #615 y #616 unidos). **Quién:** operador del Gestor de
cambios VII (agente en árbol aislado, sin subagentes, council ni workflows). **Sin migración** (el reintento usa `redes_encolar` e
`instagram_semana_ahora`, que ya existen y ya son de la administración). **Sin variables de entorno nuevas.** **Estado:** listo para revisar.

## El pedido

El founder dijo «adelante con faltantes» (2026-10-29) a tres recomendaciones del gestor: (1) que la hoja «Todos los números» no repita lo que
ya está en la portada (pregunta 3 de la bitácora 526); (2) que dos pruebas que fallan por tiempos en la CI de GitHub (Linux, Chromium) y nunca
en la Mac dejen de depender de tiempos, como OL-473 con la prueba del carril (bitácora 505); (3) que al reconectar Instagram se ofrezca volver a
publicar lo que no salió por la conexión caducada (pregunta 3 de la bitácora 527). Un commit por faltante.

## 1 · La hoja «Todos los números» sin repetidos (commit `c49c38f5`)

- `indicadoresHoja` (`src/lib/panel.ts`): los siete de «Últimos 7 días» menos los que ya están en «Esta semana en números» de la portada. No es
  una lista fija: los saca de `indicadoresPortada`, así que si la portada cambia, la hoja deja de repetir sola. Hoy quedan cinco: Personas
  activas, Coincidencias, Publica la comunidad, Primera publicación y Avisos abiertos. Salen Voy y Me interesa y la agenda (arriba se llama
  «Eventos esta semana»). Sin aportes o sin avisos, los que se pudieron leer; la agenda no vuelve a la hoja aunque falten los aportes.
  `numerosEnHoja.tsx` la usa; el aviso de los aportes que no se leyeron ya no menciona Voy y Me interesa.
- **La rejilla** (`Indicadores.tsx`, `admin.module.css` `.ancho`): con un número impar de cuadros el último va a todo lo ancho, así no queda un
  cuadro solo a la mitad de su fila. Con el desglose abierto sigue igual (el desglose va tras la segunda columna de la fila tocada; el quinto,
  entero debajo). En la portada a 768 (cuatro columnas) la regla no aplica: si faltaran los aportes, los tres quedan en su fila.
- **Una nota:** el prototipo de la bitácora 525 dejaba «Agenda de la semana» en la hoja (con su línea de tendencia de doce semanas); el
  encargo pidió quitar las dos. Arriba, «Eventos esta semana» es el mismo número con su comparación, pero sin la línea. Pregunta 1.
- Pruebas: `panel.test.ts` (la hoja no repite nada de arriba, los cinco en su orden, el cuadro igual al de siempre, sin aportes ni avisos);
  `TodosLosNumeros.componentes.test.mjs` +2 (cinco a 390 y 768: dos por fila y el quinto a todo lo ancho, también con el desglose del cuarto y
  del quinto abiertos; la portada con tres: el tercero a lo ancho en el teléfono y los tres en una fila a 768). `medidas.aceptadas.json`, solo
  la línea de `s45a-admin-numeros`: de 255/291 a **242/278** nodos (dos cuadros y una línea de tendencia menos).

## 2 · Dos pruebas sin depender de tiempos (commit `11bc3e96`)

**(a) `HistoriasZoom.componentes.test.mjs`, «acercado, un toque no pasa de historia…»** (corrida 40988580569, intento 1: leyó escala 1.00233).
La vuelta a 1× con un toque se anima (`data-suave`, `--duracion` = 200 ms) y la prueba esperaba 400 ms fijos; en el Chromium sin pantalla de
Linux la transición empieza más tarde y la lectura cayó a media transición. Ahora se espera **al estado, no al reloj**: `a1x()` espera a que el
cartel no tenga ninguna transición corriendo y su escala sea 1 (tope de 5 s), y `enHistoria()` espera el título de la historia siguiente en vez
de 100 ms fijos. Lo mismo en la prueba de escritorio (la rueda y el clic). El pellizco sigue siendo con toques por CDP: es lo que se prueba, y
en la CI siempre llegó a su escala (la aserción `> 1.9` pasó); lo que fallaba era solo la espera.
Comprobación de que el cambio es el que arregla: con la transición alargada a 900 ms (copia temporal de la prueba, ya borrada), la versión de
antes falla igual que en la CI (lee 1.18415, dos de dos) y la nueva pasa (dos de dos). Con la CPU frenada ×8 y ×30 la de antes no fallaba en la
Mac (la transición corre en el compositor): por eso no se veía aquí.

**(b) `npm run medir`, «fuera-de-la-caja · s13-lugares-ficha-en-hoja · … span.Mapa/pulso.mapboxgl-marker»** (mismo run, intento 2, con 168
nodos a 320 contra un presupuesto de 167). La causa no era el tiempo de carga del mapa: `aquietar` ya espera a que el mapa cargue («Cargando el
mapa») y, desde OL-292, a que el anillo del pulso se vaya, buscándolo por su clase `[class*="__pulso"]`. **Desde Next 16.4 (OL-483) la clase
compilada es `<hash>_pulso`** (`elhv4G_pulso`, con un solo guion bajo): esa búsqueda no encontraba nada y la espera de OL-292 dejó de existir sin
que nadie lo notara; quedaba solo la de las animaciones, que con la máquina cargada da el anillo por terminado un cuadro antes de que se quite
(lo que OL-292 ya había visto). Lo comprobé con una traza temporal en la página (ya quitada): en las cuatro medidas de s13 el anillo aparece
~5 ms después de que el mapa carga, con la clase `elhv4G_pulso mapboxgl-marker mapboxgl-marker-anchor-center`, y se va ~700 ms después.
Ahora el anillo se reconoce **sin depender del nombre**: un marcador de Mapbox con una animación con fin dentro (el `::after` del anillo, que
con `forwards` sigue en `getAnimations` hasta que se quita el marcador). Ningún otro marcador anima con fin (el punto de «tú», la marca de la
pulsación larga y el pin de «Dónde es» no animan; el anillo de la pulsación larga no es un marcador). No excluí el marcador de «fuera de la
caja»: también sumaba un nodo al presupuesto, y la medición debe ver la pantalla quieta, no esconder lo que se mueve.

**Las 5 corridas seguidas, en local (Mac):**
- `HistoriasZoom.componentes.test.mjs` entero: **5 de 5 corridas en verde** (5 de 5 pruebas cada una).
- `npm run medir -- --solo=s13`: **5 de 5 en verde**, 167/167/165/165 nodos, sin hallazgos.
- `npm run medir` entero (63 pantallas × 4 anchos, ~190 s cada una): **5 de 5 sin novedades**; s13 siempre 167/167/165/165 y s45a 242/242/278/278.

## 3 · Volver a publicar lo que no salió al reconectar Instagram (commit `87120fe7`)

**Qué se ofrece** (`src/lib/redes/sinSalir.ts`, pura, y `src/app/admin/instagram/sinSalir.ts`, la lectura): los trabajos de `redes_trabajos`
`fallido` con `error = 'permiso'` (la clave de la cola para el token vencido o revocado; la cola no los reintenta sola) que terminaron **desde
el lunes de esta semana** a las 00:00 (hora de México). Uno por publicación (lo que falló dos veces sale una vez, el más reciente). **No** se
ofrece lo que ya volvió a salir o va en camino (otro trabajo del mismo evento, red y formato, creado después del fallo, en cola, publicándose o
publicado), un evento que ya empezó (`sePuedePublicar`, la misma regla que el trabajador) ni un día de la semana de Instagram (`pedido.casilla`)
que ya tiene otro trabajo, se quitó o salió. Lo que no se pudo leer no se ofrece.

**Dónde:** al volver de Meta con la conexión hecha (`/api/instagram/vuelta` → `?conectado=1`), la página lee la lista y, si hay algo, **la hoja
de la conexión se abre sola** con «Se quedó sin salir», una nota llana («Esta semana no salieron porque la conexión caducó. Vuelven a la cola
como se decidieron, sin repetir lo que ya salió.»), la lista corta (título y «Instagram y Facebook · publicación · no salió el mié 7 de oct»,
con el icono de Instagram o de Facebook) y, en el pie, **«Volver a publicar (3)»** (principal) y «Reconectar» debajo (no se quita lo que
existe). Si se cierra sin tocarlo, la línea verde «Instagram quedó conectado» lleva «3 no salieron ›» en su lugar de acción (como «Deshacer»)
y vuelve a abrir la hoja. Sin nada pendiente, la línea verde va sola y la hoja no se abre. El encargo decía «Volver a publicar lo que se quedó
sin salir (N)»: a 390 ese texto se partía en dos renglones dentro del botón (captura descartada); la frase larga quedó como el rótulo de la
sección, justo encima. Pregunta 2.

**Al tocarlo** (`volverAPublicar`, en `acciones.ts`): el servidor **recalcula** la lista con la sesión de la administración y solo toma los ids
que siguen en ella (nunca se fía del teléfono). Cada uno vuelve como entró: un día de la semana de Instagram con `instagram_semana_ahora` (sale
ya, con su texto, etiquetas y «También en Facebook»; si ese día ya salió, la base responde 55000 y cuenta como «ya iba»), y lo demás con
`redes_encolar` con su mismo pedido y **`p_repetir := false`**: el encargo proponía `true`; con `false` la base sigue protegiendo contra el
doble toque y contra lo que entre tanto ya se puso en camino o salió hace menos de 15 minutos (`redes_reciente` responde «duplicado» y no se
guarda otro). Un fallo de permiso no es «reciente», así que se guarda normal. Después pide el primer intento al trabajador (`after()` +
`dispararPaso`, como «Publicar») y la pantalla se refresca para decir «Publicando…». La hoja dice «3 van en camino. Te avisamos en el teléfono
cuando salgan.» (y, si toca, «1 ya iba en camino o ya había salido.» / «1 no se pudo poner en la cola: inténtalo otra vez.» con el botón solo
para ese). La lista y la respuesta se guardan en la pantalla: cerrar y abrir la hoja no lo vuelve a ofrecer.

**Respaldo local:** `RESPALDO_INSTAGRAM_CONEXION=reconectada`: conectada hace un minuto, y en la cola la Master Class fallida por permiso dos
veces (hoy y ayer), Leonora (historia, ayer), Feleal (Facebook, el lunes); y, para que no salgan, Delirium Pollum (falló por la imagen), Uno de
Uno (la semana pasada) y OCA (falló el lunes y volvió a salir después).

**Pruebas:** `src/lib/redes/sinSalir.test.ts` (7: esta semana y por permiso, lo que no entra, uno por publicación, sin duplicar lo que salió o va
en camino después del fallo —y uno publicado antes no lo tapa—, el evento que ya empezó o no se leyó, el día de la semana solo si sigue esperando
ese trabajo, los textos). `src/app/admin/instagram/SinSalir.componentes.test.mjs` (5, la pantalla de verdad con dobles solo para la lista, la
semana, el enrutador y la acción; toques reales con `elementFromPoint`): la hoja se abre sola con los tres y «Volver a publicar (3)», tocarlo
manda los tres **una sola vez**, refresca y no lo vuelve a ofrecer (tampoco al cerrar y abrir); cerrada, «3 no salieron ›» la vuelve a abrir sin
mandar nada; si uno falla, lo dice y ofrece solo ese; sin pendientes o sin `?conectado`, nada; a 320 cabe sin desplazar a lo ancho. Sin prueba de
base: no toqué funciones.

## Recorrido en la app real (`capturas-528/recorrido.txt`, `capturar-faltantes-29-oct.mjs`): 35 de 35, sin errores de página ni de consola

La app compilada contra el respaldo (reloj fijo del mié 7 de oct, cuenta de administración, sin `.env`, sin `INSTAGRAM_TOKEN` ni
`CRON_SECRET`), Chrome real de la Mac, toques reales. La portada con sus cuatro; la hoja con los cinco a 390 y 768, dos por fila y el quinto a
todo lo ancho (350 de 350; 560 de 560), tres filas, Fichas con sus dos; el desglose de «Primera publicación» bajo su fila. Con `reconectada`:
`/admin/instagram?conectado=1` abre la hoja sola con los tres (la Master Class una vez), sin los otros tres; el botón en un renglón y de 44 o más;
la ✕, «3 no salieron ›», tocar «Volver a publicar (3)» → «3 van en camino…»; **en la cola del respaldo, tres trabajos nuevos en cola, uno por
publicación (instagram 4x5, instagram 9x16, facebook 4x5)**; y al volver otra vez de Meta ya no se ofrecen (van en camino: sin duplicar).

## Capturas (`docs/rediseno/capturas-528/`, 390 × 844 a 2× salvo donde se dice; cada una abierta)

- `01-hoja-numeros`: «Todos los números»: Últimos 7 días con Personas activas y Coincidencias, Publica la comunidad y Primera publicación, y
  Avisos abiertos a todo lo ancho; debajo «Cómo va la comunidad». Sin Voy y Me interesa ni la agenda.
- `01b-hoja-numeros-desglose`: «Primera publicación» abierto (borde violeta), su desglose a lo ancho y «Avisos abiertos» entero debajo.
- `02-hoja-numeros-768` (768 × 1024): la hoja centrada, los cinco dos por fila y el quinto a lo ancho, «Cómo va la comunidad» y Fichas.
- `03-hoja-sin-salir`: «Conexión con Instagram» abierta sola: @smsnstrsapp conectada desde el 7 de octubre, «Se quedó sin salir» con su nota, la
  Master Class (Instagram y Facebook · publicación · no salió el mié 7 de oct), Leonora (Instagram · historia · mar 6) y Feleal (icono de
  Facebook · lun 5), «Puede», y abajo «Volver a publicar (3)» violeta y «Reconectar» blanco. La ✕ lleva el anillo del foco: la hoja se abrió
  sola y el foco entra en ella (lo de siempre de `ui/Hoja`).
- `03b-hoja-sin-salir-320` (320 × 700): lo mismo; la lista se desplaza y el pie con los dos botones queda a la vista, cada uno en un renglón.
- `04-linea-verde`: la hoja cerrada: «Instagram quedó conectado» con «3 no salieron ›» a la derecha, en un renglón; el botón de la conexión con
  el punto verde.
- `05-vueltos`: la hoja otra vez tras tocar el botón: «Se quedó sin salir» con «3 van en camino. Te avisamos en el teléfono cuando salgan.» con
  la palomita verde; sin lista ni botón; «Reconectar» abajo.

## Comprobaciones

- `npm run lint`: 0 errores (2 avisos que ya estaban, en archivos de otras piezas). `npm run typecheck`: limpio.
- `npm test`: **318 archivos, 5123 pruebas**, todas pasan.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **3011 pruebas, 0 fallaron** (sin migración nueva).
- `npm run test:componentes`: **802 de 802**.
- `npm run inventario`: sin novedades.
- `npm run medir`: 63 pantallas × 4 anchos, sin novedades (5 corridas seguidas, todas sin novedades).

## Lo que no toqué

Las fichas públicas de lugar y artista, la edición de ficha y `src/lib/instagram/texto.ts` (OL-491, otro operador). `Mapa.tsx` tampoco: la
medición se arregló en la medición. Ninguna migración.

## Preguntas al founder (frases llanas)

1. En «Todos los números» quité «Voy y Me interesa» y «Agenda de la semana» porque ya están arriba. La agenda llevaba en la hoja su línea de
   cómo ha ido en las últimas doce semanas, y arriba no la lleva. ¿Está bien perder esa línea, o la regresamos a la hoja?
2. El botón dice «Volver a publicar (3)» y arriba de la lista va el título «Se quedó sin salir»: la frase entera no cabía en un renglón del
   botón. ¿Te late así?
3. Cuenta «esta semana» desde el lunes a las 00:00. Si la conexión caduca un domingo y reconectas el lunes, lo del domingo ya no se ofrece. ¿Lo
   dejamos así o preferimos «los últimos 7 días»?
