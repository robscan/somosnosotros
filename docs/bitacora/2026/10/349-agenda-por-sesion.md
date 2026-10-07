# 349 · La agenda muestra cada día con sesión

**Pieza:** OL-320. **Rama:** `agenda-por-sesion` (sobre `origin/main` `20fd86d0`). **Fecha:** 2026-10-06. **Operador:** Claude Fable 5.1 (agente del gestor IV).
**Estado:** hecho y probado con los componentes reales (Chrome) y con la app compilada contra el respaldo local; falta el iPhone real (lista al final). **Sin migraciones** (ver «Por qué no es una vista de SQL»). La consulta de la agenda pide la tabla `eventos_sesiones`, que ya está en producción desde OL-311.

## Qué se encargó

Punto 3 del orden firmado: «la agenda muestra cada día con sesión». Desde OL-311 un evento de varios días puede tener su horario por día, pero la agenda lo colocaba **solo por su inicio**: un taller de tres sábados salía un día y desaparecía de los demás. Se pidió una fuente única de «ocurrencias» (cada evento, una vez por día en que pasa algo, con la hora de ese día) y usarla en Inicio, la agenda por día, el calendario de Cuándo y los números de la agenda, sin tocar la ficha ni el archivo de calendario.

## Por qué no es una vista de SQL

La consulta de la agenda ya no es lo que decide qué se ve: `cargarAgenda` trae hasta 300 eventos y **el teléfono** los filtra, los agrupa por día, los cuenta en los botones «Ver N eventos» de las hojas y pinta los puntos del calendario. Una vista `eventos_ocurrencias` obligaría a repetir la misma regla en TypeScript para esas tres cosas, y dos definiciones que se desentienden son justo la queja de OL-218 (un día marcado en el calendario que al tocarlo salía vacío). Por eso la fuente única es `src/lib/ocurrencias.ts`: lógica pura, probada sola, que corre igual en el servidor y en el teléfono. No hay migración que aplicar ni orden de migraciones que cuidar, y tampoco pruebas de `supabase/tests/pg/`.

## Qué hay

- **`src/lib/ocurrencias.ts` (nuevo).** `ocurrenciasDe(evento)` reparte un evento en sus días; cada uno es el evento con `inicio` y `fin` de ese día y un `ocurrencia: { clave, dia, parte }` (`clave` = `id:día`, la llave de las listas; `parte` = `{ n, de }`, «Día 2 de 3»). Lo que cuenta como un día en que pasa algo:
  1. **Con horario por día** (`sesiones`, las vigentes): un día por sesión, con su hora y su fin (sin fin, dura hasta que acaba su día).
  2. **De un solo día, o una noche que cruza la medianoche** (`esDeVariosDias`, la regla con la que ya se lee el evento): el propio evento, sin cambios y sin «Día n de N».
  3. **De varios días sin horario por día** («cada día», OL-309): un día entre el de inicio y el de fin, con la hora de inicio y, si lo tiene, la de fin del último día; sin hora de fin puesta (`FIN_DEL_DIA`), cada día queda sin hora de fin.
  4. **Se queda entero** (como hasta ahora) un evento de **más de 31 días** (una exposición de temporada; la pieza 4 del orden, exposición/festival/taller, decide cómo se agenda lo largo) y uno de varios días **cuyo fin cae antes que su hora de inicio** («viernes 18:00 a domingo 11:00»: es un evento corrido, no un horario de cada día).
  `ocurrenciasVigentes` quita los días que ya pasaron de un evento repartido (un día con hora de fin se queda hasta que termina; sin ella, hasta que acaba el día: la misma regla de `terminaDe`); `proximaOcurrencia` es el evento visto en su próximo día; `claveDe` y `textoParte` son lo que leen las vistas.
- **`fechas.ts`:** `esDeVariosDias(inicio, fin, zona)` es la regla de `cuandoVariosDias` sacada a una función (el texto no cambia).
- **`calendario.ts`:** `ocupaRango` y `diasActivosCalendario` aceptan `sesiones` y cuentan solo el día de cada una; un evento sin sesiones ocupa todo su rango como siempre. Con esto el filtro de Cuándo, los puntos del calendario y los números del botón no desentonan.
- **`cargarAgenda.ts`:** la misma consulta de los eventos pide `sesiones:eventos_sesiones(inicio, fin)` (como la ficha) y deja en el evento solo las vigentes (`sesionesVigentes`; si se editó el evento y ya no coinciden, se ignoran). Casi todos los eventos viajan sin la propiedad.
- **`agenda.ts`:** `listarAgenda` reparte en días la pestaña **Todos** (lo que ya pasó de un evento repartido no sale) y deja **Nuevos** por evento (una sola vez cada uno). `compararEventos` compara instantes y no letras: una hora de la base («…+00:00») y una calculada aquí («…Z») son la misma. El filtro de Cuándo en Nuevos mira los días de las sesiones.
- **`inicio.ts`:** «Esta semana» pone el evento en **cada día de la semana en que pasa algo**, con la hora de ese día (`eventosEstaSemana` y `carrilEstaSemana` cuentan días; `vistos` sigue siendo por evento, así que ningún otro carril lo repite). «Seleccionados para ti», «Destacados», «Nuevos eventos» y «Más adelante» hablan del evento y no de un día: lo presentan en su **próximo día**.
- **`destacados.ts` y `Destacados.tsx`:** `Tarjeta` gana `clave` (la llave de la tarjeta, para que el mismo evento salga dos veces en una tira) y `parte`; `tarjetaEvento` los llena; el sello dice «Día 2 de 3» (y «Hoy · Día 2 de 3» si es hoy).
- **`RenglonEvento.tsx`:** el renglón de un día dice la hora de ese día y, tras ella, cuál es: «17:00 · Día 1 de 3 · $300». El evento entero con horario por día (la pestaña Nuevos, donde sale una vez) dice «Del 8 al 12 de oct · horarios por día», como su ficha, y no «17:00–19:00» (que era la hora del primer día y el fin del último).
- **`AgendaInicio.tsx`:** la llave de cada renglón es la del día. **`FilaEventos.tsx` no cambió:** los puntos y los números salen de las dos funciones de arriba.
- **Respaldo local (`fixture.mjs`):** un «Taller de grabado en linóleo» con tres sesiones (jueves 8 a las 17:00, sábado 10 a las 18:00 y lunes 12 a las 17:00, relativas a hoy) y su tabla `eventos_sesiones`.

## Cómo funciona

- **Una sola definición, dos formas de usarla.** Para listas por día (Todos, «Esta semana») se reparte el evento en días y de ahí sale todo lo demás. Para los puntos del calendario y el filtro de Cuándo no hace falta repartir: basta saber qué días ocupa (`tramosDelEvento`); para un evento sin sesiones es el rango de siempre, que coincide con sus días.
- **Una ocurrencia es el evento con otra hora.** Conserva `id`, título, precio, lugar y `van`, así que el botón «Voy», «Te interesa» y las decisiones (`asistencia.estado(e.id)`) son del evento: tocar «Voy» en un día lo marca en los tres.
- **«Pasado» sigue según el fin del evento** (lo hace la base con `termina`), pero un día ya pasado de un evento repartido no sale en la agenda del día siguiente. Los eventos de un solo día no se filtran en el teléfono: ya lo hizo la base, y así las pruebas de siempre no dependen del reloj.
- **La zona es la del evento:** el día de una sesión, la hora de cada día de un evento «cada día» y el cambio de horario (probado con Madrid en octubre) salen de `evento.zona`.

## Decisiones del operador (por confirmar con el founder)

1. **No es una vista de SQL** (ver arriba): lo que menos duplica.
2. **Datos para decidir los eventos de varios días sin horario por día.** En el repo hay 194 eventos cargados (`scripts/instituciones/*.json`) y ninguno trae `fin`; la bitácora 337 cuenta 274 visibles en producción, 239 sin hora de fin y «ningún evento de varios días con horas». Es decir, hoy no hay nada que repartir y todo lo que se publique de ahora en adelante con varios días lleva su hora por la pregunta «¿A qué hora, cada día?». Un evento de varios días **sin** hora real no se puede distinguir en los datos de uno con hora (el fin a las 23:59 es «sin hora de fin», no «sin horario»). **Decisión:** se reparte día por día, cada día con la hora de inicio, y todos dicen «Día n de N». No usé «continúa» (recomendación del encargo) porque la hora de cada día sí existe y porque «continúa» necesitaría saber que el evento es una muestra corrida, que hoy no se guarda. La pieza de exposiciones y festivales es la que debe darle a eso su propio rótulo.
3. **De más de 31 días y los «corridos» no se reparten.** Es lo conservador: lo largo sigue como hoy (una fila en su día de inicio y, en el calendario, todos sus días marcados) hasta que la pieza de exposiciones lo resuelva. Un evento de «viernes 18:00 a domingo 11:00» sigue siendo uno.
4. **La noche que cruza la medianoche sigue siendo una sola** (su fila en el día en que empieza), como lo lee ya `cuandoVariosDias`.
5. **El indicio es «Día 2 de 3», no «Sigue el sáb 11».** Es corto, vale lo mismo para los días seguidos que para los sábados salteados y no necesita saber cuál es el siguiente. Va en el renglón tras la hora («17:00 · Día 1 de 3 · $300») y en la tarjeta como el rótulo sobre la foto, ahí donde ya iban «Hoy» y «N van»: **Te interesa › Hoy · Día n de N › Día n de N › N van**, así que el «N van» cede ante él en un día que es parte de algo. No añadí ninguna pieza ni nada de CSS: el renglón y la tarjeta son los de siempre.
6. **«Esta semana» pone una tarjeta por día, también para el evento «cada día» sin sesiones** (hasta 7 en la semana; el tope de 20 tarjetas sigue). Es lo que pedía el encargo («sale tres veces, cada una con su hora»). Si un festival de dos semanas empieza a ocupar el carril, el ajuste es limitar las tarjetas de un mismo evento en `carrilEstaSemana`; no lo adelanté porque hoy no hay ninguno.
7. **«Ver N eventos» cuenta renglones (días), no eventos:** lo que dice el botón es lo que se ve al tocarlo; con el rango del 8 al 12 del respaldo, el taller cuenta tres. En Nuevos cuenta eventos.
8. **Nuevos sigue por evento** (una vez, con «Del 8 al 12 de oct · horarios por día»): es lo publicado, no lo que pasa.
9. **Los carriles que hablan del evento lo muestran en su próximo día** y no en el primero (un taller que empezó el sábado pasado no se presenta con esa fecha).
10. **`compararEventos` compara instantes** (`Date.parse`) y no cadenas: sin eso, una sesión calculada en «…Z» y un evento que llega de la base en «…+00:00» no empataban a la misma hora y se ordenaban por letras.
11. **La consulta de la agenda ahora depende de la tabla `eventos_sesiones`** como la ficha (consulta necesaria): ya está en producción (OL-311, aplicada antes de unir). Si una base no la tuviera, la agenda no cargaría; no la hice opcional para no pagar un viaje de más.
12. **Presupuestos de `medir` subidos, por el respaldo y no por el código:** el taller nuevo trae tres renglones a Agenda (15 nodos cada uno), tres tarjetas a «Esta semana» (10 cada una) y uno a Nuevos (14). `01-inicio` 295→325 (297→327 a 820 y 1280), `02-agenda` 260→305 (262→307), `s01-inicio-sesion` 304→334, `s02-agenda-sesion` 263→308 y `s14-agenda-nuevos` 180→194; la profundidad no cambió. Anotado con `npm run medir -- --aceptar` tras comprobar en el diff que solo esas cinco pantallas subieron.

## Maquetación

Ninguna regla nueva de CSS ni medida: el indicio es texto dentro del renglón (`ademas`) y del rótulo de la tarjeta, que ya cortan con puntos suspensivos. `inventario` sin novedades. A 320 el cuándo del renglón no se corta (comprobado: `scrollWidth` igual a `clientWidth` en las tres filas del taller); lo que cede, como siempre, es el precio o el sitio.

## Límites conocidos y siguientes pasos

- **El archivo de calendario (.ics)** no se tocó: con sesiones ya lleva un `VEVENT` por sesión (OL-311). Para un evento «cada día» **sin** sesiones sigue siendo un solo bloque desde la hora de inicio del primer día hasta la de fin del último: conviene un `VEVENT` por día. Es un cambio corto como siguiente paso (pasar `ocurrenciasDe(e)` a `archivoIcs` como si fueran sesiones en `calendario/route.ts`); la hoja nativa del iPhone seguiría con el primer día y los demás en las notas.
- **Siguen por el inicio del evento** (fuera del encargo; todos necesitan pedir las sesiones en sus consultas): las fichas de lugar y de artista (`EventosPorDia`, «Próximos eventos» por día), «Tus planes» y la actividad de Mi perfil (`ActividadPersona`), el mapa de Lugares (el pin con el día) y «Lugares y artistas con eventos esta semana» (`eventosSemana`, tarjetas por ficha). Cuando se hagan, `EventosPorDia` y `ActividadPersona` solo tienen que repartir con `ocurrenciasDeLista`.
- **El panel no cambia:** cuenta eventos (próximos, de la semana, de la comunidad), no días. Un evento con sesiones cuyo inicio cae después de la semana pero tiene una sesión dentro cuenta como «próximo» y no como «de la semana»; si el founder lo quiere por día, es una función de SQL aparte.
- **Sitemap y datos estructurados:** no enumeran fechas por día (el sitemap usa `termina`), no cambian.
- **Los días de «Esta semana» de un evento con muchos días** (ver decisión 6).
- **Un evento de dos días** con sesiones cuyo último día termina antes de la hora del primero ya se leía mal en las listas (OL-309, decisión 5); ahora, al repartirse, cada sesión sale con su hora y el problema desaparece donde hay sesiones.

## Pruebas

- `npm run lint`: 0 errores (el aviso de siempre en `VisorImagen.componentes.test.mjs`). `npm run typecheck`: verde.
- `npm test`: **158 archivos, 2374 pruebas, en verde**. Nuevas: `ocurrencias.test.ts` (22: un solo día con y sin fin, la noche que cruza la medianoche, el día de la zona; varios días con fin diario, sin hora de fin, corrido y de más de 31 días, con el cambio de horario de Madrid; con sesiones, en orden, sin sesión sin los días de en medio y con el día de la zona; vigentes: el día pasado, una sesión de hoy hasta que termina, sin fin hasta que acaba el día; `proximaOcurrencia`; `claveDe` y `textoParte`), `agenda.test.ts` (9 nuevas: tres sesiones tres veces con su hora y llave, agrupadas por su día, el día pasado fuera, Cuándo, el número de «Ver N eventos», Nuevos por evento, los puntos del calendario y el orden por instantes), `inicio.test.ts` (6: «Esta semana» por día, visto una sola vez, sin el día pasado, sin sesión esta semana, un día por día del festival, y «Seleccionados» y «Más adelante» en su próximo día), `calendario.test.ts` (ocupaRango y los puntos con sesiones y la zona), `fechas.test.ts` (`esDeVariosDias`), `destacados.test.ts` (la tarjeta de un día y el sello) y `cargarAgenda.test.ts` (la consulta pide las sesiones, casi todos sin ellas y las que ya no coinciden se ignoran).
- Componentes (Playwright, Chrome de la Mac): **`AgendaPorDia.componentes.test.mjs` nuevo, 3 pruebas** (la lista por día con «Día n de N» y sin llaves repetidas, el día que ya pasó, y Cuándo con sus puntos y el botón); `npm run test:componentes` completo: **476 pruebas, 0 fallos**.
- `npm run inventario`: sin novedades (334 medidas en duro y 2 bloques duplicados).
- `npm run medir`: **29 pantallas × 4 anchos, sin novedades** tras anotar los cinco presupuestos de nodos (decisión 12).
- App compilada (`next build && next start -p 3106`) contra el respaldo local (`respaldo-local/server.mjs 8847`), en Chrome a 390 y 320: Inicio y Agenda con el taller en sus tres días, sin errores de página (el 404 de `/_vercel/insights` es de siempre).

## Capturas (`docs/rediseno/capturas-349/`)

Del Chrome de la Mac (2×, 390×844 y una a 320×700, con la letra de la app), con la app compilada contra el respaldo local. Cada una abierta y mirada:

- `01-inicio-esta-semana-dia-1.png`: Inicio desplazado al carril «Esta semana»: la tarjeta «Taller de grabado en linóleo · jue 8 de oct · 17:00 · ACHE Galería» con el rótulo «Día 1 de 3» sobre la foto, y a su derecha «Delirium Pollum… vie 9 de oct · 18:00»; arriba, «Destacados» y debajo «Lugares con eventos esta semana».
- `02-inicio-esta-semana-dia-2.png`: el mismo carril desplazado: la tarjeta del taller «sáb 10 de oct · 18:00» con «Día 2 de 3» (otra hora que el día 1) y, a su lado, «Inauguración de Uno de Uno… dom 11 de oct · 18:00».
- `03-agenda-dia-1.png`: Agenda, pestaña Todos: «jue 8 de oct · 2» con «Cine de barrio… 10:00» y «Taller de grabado en linóleo · 17:00 · Día 1 de 3 · $300», y luego «vie 9 de oct» y «sáb 10 de oct · 2» (donde ya asoma el taller otra vez).
- `04-agenda-dia-2.png`: el «sáb 10 de oct · 2»: «Taller de grabado en linóleo · 18:00 · Día 2 de 3 · $300» y, después, «LXS COLOCAOS… 19:00 · 2 van»: el taller va antes por su hora de ese día.
- `05-agenda-dia-3.png`: «lun 12 de oct · 2» con «Taller… 17:00 · Día 3 de 3 · $300» y «Susurros del inconsciente 20:00», y «mar 13 de oct» debajo; en ningún renglón sale el rango «Del 8 al 12 de oct».
- `06-renglon-del-taller.png`: acercamiento del renglón del día 2: icono de reloj y «18:00» en violeta, «Día 2 de 3 · $300» en gris, «ACHE Galería»; los datos en una línea sin cortarse.
- `07-agenda-nuevos-una-vez.png`: pestaña Nuevos, grupo «Esta semana · 7»: el taller aparece **una sola vez** con «Del 8 al 12 de oct · horarios por día · $300» (el precio se corta con puntos suspensivos, lo único que cede).
- `08-agenda-320.png`: Agenda a 320: «sáb 10 de oct · 2» con el taller «18:00 · Día 2 de 3 · $300» y «LXS COLOCAOS… 19:00 · 2 van»; el título parte en dos líneas y nada se sale de la caja.
- `09-cuando-puntos-en-los-dias-con-sesion.png`: la hoja «Cuándo» con «Elegir fecha…» y octubre: puntos solo en el 7 (la charla), el 8, el 10 y el 12 (las sesiones del taller); los días de en medio (9, 11, 13…) sin punto; el botón dice «Ver 4 eventos». **Esta captura y las dos siguientes son de una copia del respaldo con solo la charla y el taller** (en el respaldo completo hay un evento todos los días y todo el calendario tiene punto); el respaldo del repo no cambió por eso.
- `10-cuando-dia-sin-sesion.png`: el vie 9 elegido (un día de en medio): el chip dice «vie 9 oct» y el botón, apagado, «Sin eventos».
- `11-agenda-un-dia-con-sesion.png`: tras elegir el sáb 10: el chip «sáb 10 oct» en el color de acción y un solo grupo «sáb 10 de oct» con «Taller… 18:00 · Día 2 de 3 · $300»: lo que dijo el botón («Ver 1 evento») es lo que se ve.

## Para probar en el iPhone

1. Con la migración de OL-311 en producción, publicar un evento de tres sábados con horario por día (casilla «Mismo horario todos los días» desmarcada y una hora distinta en uno). En **Agenda → Todos**: ¿aparece tres veces, cada una bajo su día y con su hora, con «Día 1 de 3»…? ¿La ficha sigue igual?
2. **Cuándo → Elegir fecha…**: ¿los puntos caen en los tres sábados y no en los días de en medio? Tocar un día de en medio: ¿el botón dice «Sin eventos»? Tocar un sábado: ¿«Ver 1 evento» (o los que sean) y la lista coincide?
3. **Inicio → Esta semana**: ¿el taller sale una vez por sábado de la semana, con «Día n de 3» sobre la foto? ¿«Seleccionados para ti» o «Destacados» lo presentan en su próximo día?
4. Pasado el primer sábado: ¿ya no sale ese día en Agenda ni en «Esta semana», pero los otros dos conservan «Día 2 de 3» y «Día 3 de 3»?
5. **Nuevos**: ¿el taller sale una sola vez, con «Del 8 al 12 de oct · horarios por día»?
6. Un evento de un solo día se ve como siempre, sin «Día n de N».
