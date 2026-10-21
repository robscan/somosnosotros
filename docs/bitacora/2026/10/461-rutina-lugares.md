# 461 · La rutina que corre con la API: motor de corridas en el servidor y «Buscar lugares» de punta a punta (OL-428)

**Fecha:** 2026-10-20. **Rama:** `rutina-lugares`, desde `admin-ciudades` (`0f510f4f`: OL-427 Ciudades y OL-426 Showcase unidas). **Operador:**
agente de la pieza (Claude) para el Gestor VII, sin otros agentes. **Migración:** ninguna (el estado vive en `rutinas_corridas.resumen` y
`propuestas.datos`, que ya son jsonb). **Variables de entorno:** ninguna nueva; usa `CRON_SECRET`, `ANTHROPIC_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` y el token de Mapbox de la app, que en el servidor se llama igual: `NEXT_PUBLIC_MAPBOX_TOKEN`. **Estado:** lista para
la revisión del gestor; la primera corrida real la hace el gestor después de unir.

## El pedido

El encargo del Gestor VII: que lo que OL-427 dejó en pantalla funcione de verdad. Cada botón «Correr» de Administración › Ciudades deja una
corrida pendiente; esta pieza hace el motor que la corre en el servidor (sin la Mac), por pasos cortos, con el gasto real y el tope, y la
primera rutina completa, «Buscar lugares», con sus tres fuentes en orden (doc 57 §4.B): el Sistema de Información Cultural, las páginas de
Cultura del estado y del municipio, y la búsqueda web. Ninguna pantalla nueva ni rediseñada: los estados que ya pinta Ciudades y Corridas
(Pendiente → En curso con barra y gasto → Terminada / Llegó al tope / Falló / Cancelada) salen ahora de datos reales.

## Qué cambió

**El motor (`src/lib/rutinas/motor.ts`) y su ruta (`/api/rutinas/correr`).**

- La ruta pide `CRON_SECRET` como los otros crons (`autorizadoPorSecreto`, 401 sin él), `maxDuration = 60`, `dynamic = "force-dynamic"`; acepta
  GET (el cron de Vercel llama con GET) y POST. Está en `vercel.json` cada 5 minutos (`*/5 * * * *`). Responde enseguida (202) y corre el paso
  **después de responder** con `after()`, así nadie espera los 45 s; con `?esperar=1` corre y devuelve el resultado del paso (para probar a mano).
- Cada llamada toma **una** corrida: la `pendiente` más vieja; si no hay, la `corriendo` más antigua que nadie esté trabajando. Dos llamadas a la
  vez no corren la misma, sin migración ni bloqueos: una pendiente se reclama con `update … set estado = 'corriendo' where id = … and estado =
  'pendiente' returning`; una que ya corre lleva en su resumen un número de turno (`turno`) y hasta cuándo está ocupada (`ocupada_hasta`, 70 s,
  más que el tiempo máximo de la función), y se reclama con `… where resumen->>'turno' = <el leído>` subiendo el turno. Guardar también va
  condicionado al estado y al turno.
- Un paso dura como mucho 45 s (40 s de trabajo y 5 de margen para guardar) y deja en `resumen`: `paso` («2 de 3 fuentes»), `avance` (0 a 1),
  `cursor` (lo que falta), `propuestos`, `duplicados`, `errores`, `descartados` por motivo, `por_fuente` (propuestos y USD de cada fuente),
  `busquedas_web` y, si los hay, `avisos` (frases sin datos privados) y `cortadas`. Nunca nombres en los contadores; el cursor lleva los
  candidatos que esperan a Mapbox y se borra al terminar.
- Termina `terminada` (con `fin`), `fallida` (con `resumen.error`, una frase fija, sin llaves ni datos privados) o `terminada` con
  `resumen.tope = true`. Un tropiezo (la base no respondió) suelta la corrida para reintentar; a la tercera seguida en el mismo paso, «Falló ·
  Se cortó tres veces seguidas en el mismo paso». El gasto de cada paso se suma a `gasto_usd` aunque el paso falle: el crédito de Corridas
  (`credito_api_usd` menos la suma de `gasto_usd`) baja solo.
- **Cancelada:** si al empezar un paso la corrida ya está `cancelada`, no se toma. Si la cancelan a medio paso, no se propone lo leído, se anota
  lo gastado y se queda cancelada. (Desde la pantalla, como en OL-427, solo se cancela una pendiente.)
- **Lo que no tiene motor todavía** (`agendas`, `artistas`, `showcase`): cuando el motor la toma, `fallida` con `resumen.error = "Este botón
  todavía no tiene rutina"`; la hoja de esos botones sigue igual (OL-429 y OL-430 los harán). Una ciudad que ya no está o está `cerrada`
  tampoco corre (`fallida`, «La ciudad está cerrada»).
- **Sin esperar al cron:** al crear la corrida, la acción «Correr» (`crearCorrida`) pide el primer paso con `after()` llamando a la ruta con el
  secreto desde el servidor (`src/lib/rutinas/disparar.ts`). Sin `CRON_SECRET` no dispara y lo dice en el registro del servidor; nunca tumba la
  acción. Y cada paso que tomó una corrida pide el siguiente al terminar: la corrida avanza sin esperar al cron, que la retoma si la cadena se
  corta. El secreto solo viaja a un sitio propio: en producción, siempre `https://somosnosotros.org`; fuera de ella, el host de la petición si
  es uno de los de Vercel de ese despliegue o la Mac. Una cabecera de host manipulada no recibe nada.

**«Buscar lugares» (`src/lib/rutinas/lugares.ts`).** Las fuentes, en el orden de `parametros.fuentes`; un paso hace una sola cosa: leer una
tarea de una fuente (y proponer ya lo que trae su punto dentro de la ciudad) o ubicar con Mapbox un lote de 10 que no lo traen.

- **`sic` · Sistema de Información Cultural** (`src/lib/rutinas/sic.ts`). Lo averiguado: sus datos abiertos (sic.cultura.gob.mx/datos.php)
  son un CSV por tipo de espacio **y por estado**: `https://sic.cultura.gob.mx/opendata/d/<estado>_<tabla>_directorio.csv`, con la clave del
  INEGI sin ceros (24 = San Luis Potosí; `24_teatro` pesa 10 KB contra 325 KB del nacional), actualizados hoy, en Latin-1 (no UTF-8), con
  `nom_mun`, `nom_loc`, calle y número, colonia, CP, `gmaps_latitud`/`gmaps_longitud` y, según la tabla, sitio y redes. Se leen directo desde
  el servidor, **sin la API** (no cuestan nada), y se filtran por el municipio de la ciudad y sus `alias`. El estado sale de geocodificar al
  revés el centro de la ciudad (Mapbox da el código ISO, `SLP`). Uso: el SIC permite usar, copiar y adaptar sus datos «siempre que se otorguen
  los créditos correspondientes»; la propuesta guarda la fuente y el enlace a su ficha del SIC (`https://sic.cultura.gob.mx/ficha.php?…`,
  armado con la tabla y el id: el `http://sic.gob.mx` que trae el archivo ya no responde). No se guardan teléfonos ni correos. Tablas que se
  leen: museos, teatros (→ Foro), centros culturales (→ Casa de cultura), galerías, auditorios (→ Otro · Auditorio) y bibliotecas públicas de
  la Red Nacional (→ Biblioteca; las que no dicen «biblioteca» en su nombre lo llevan delante). Para San Luis y Soledad son 118 filas; sus
  coordenadas son puntuales (109 puntos distintos), así que se usan tal cual si caen en la ciudad. Si el SIC no responde al servidor, se lee con
  la herramienta de lectura web de la API, acotada a sic.cultura.gob.mx (probado solo con la API falsa).
- **`cultura` · Cultura del estado y del municipio:** dos llamadas a la API (el gobierno del estado; el Ayuntamiento), cada una con la búsqueda
  web acotada a los sitios de gobierno (`allowed_domains: ["gob.mx"]`, que cubre `cultura.slp.gob.mx`, `sanluis.gob.mx`…), dos búsquedas como
  mucho y una lectura de página de hasta 10 000 tokens.
- **`web` · Búsqueda web:** dos llamadas de dos búsquedas cada una («espacios culturales <ciudad>», «centro cultural <ciudad>»; «foro cultural
  <ciudad>», «galería de arte <ciudad>»): cuatro en toda la corrida.
- Las llamadas (`src/lib/rutinas/claude.ts`) siguen el estilo de `src/lib/cartel.ts` (SDK oficial, salida validada con zod), con
  `claude-opus-5-5`, esfuerzo bajo y las herramientas de servidor `web_search_20260209` / `web_fetch_20260209` (nombres de la guía de la API).
  La lista llega por una herramienta propia y estricta (`proponer_lugares`, con los tipos de la app como enum): la salida tipada de la API no se
  puede mezclar con las citas que traen los resultados de búsqueda. Lo que el modelo entrega se vuelve a validar y limpiar (topes de la ficha,
  tipo de la app o «Otro», enlaces solo http(s)); una página de fuente que no salió en lo que buscó o leyó se quita. Si la API deja la
  respuesta a medias (`pause_turn`) y queda tiempo, una sola continuación; si se niega (`refusal`) o se corta, el error queda en `avisos` y la
  corrida sigue con la siguiente fuente. Lo que se lee de las páginas se le dice al modelo que es dato, no instrucción.
- **De cada candidato:** `nombre`, `tipo` (de la app), `detalle` (una frase propia de hasta 60 caracteres: en un lugar «Otro» es lo que la
  ficha dice tras «Otro · »), `direccion`, `lat`/`lng` (la de la fuente si cae en la ciudad; si no, Mapbox por dirección y, como último
  recurso, por nombre), `ciudad`, `redes`, `url` y `leida`. `fuente` es el nombre de la fuente que ya agrupa la bandeja («Sistema de
  Información Cultural», «Cultura del estado y del municipio», «Búsqueda web»), y `datos.url` la página de donde salió.
- **Sin duplicados (`src/lib/rutinas/filtros.ts`):** se descarta lo que ya está en `lugares` (el mismo nombre normalizado en la ciudad, o un
  nombre parecido a menos de 150 m: lo de `lugares_parecidos` más «Teatro de la Paz» ≈ «Teatro de la Paz San Luis Potosí»; se leen los lugares
  por nombre de ciudad y por la caja del área, también los ocultos), lo ya propuesto en la ciudad en cualquier estado (y lo repetido dentro de
  la misma corrida) y, sobre todo, **lo rechazado antes en la ciudad** con cualquier motivo. La rutina aprende de los motivos: además, a cada
  llamada le dice qué se conoce (hasta 150 nombres), qué se rechazó «por no ser cultural» como ejemplo de lo que no hay que proponer y cuántos se
  rechazaron por estar fuera de la ciudad.
- **El área de la ciudad:** 15 km desde su centro con el zoom de ciudad (13 o más), el mismo tamaño que la caja del importador del CAPO para San
  Luis y Soledad (±15 km); cada nivel de zoom menos lo duplica, hasta 60 km. Fuera: lo que cae más lejos o dice otro municipio que no sea la
  ciudad o un alias. Una ciudad sin centro en la tabla lo toma de Mapbox por su nombre (sin escribirlo en `ciudades`).
- Se insertan con la llave de servicio, tipo `lugar`; como mucho 40 candidatos nuevos por tarea y corrida (lo demás se cuenta como `de_mas` y
  llega en la siguiente corrida, porque no quedó propuesto).

**El gasto (`src/lib/rutinas/precios.ts`).** La tabla de precios de la página oficial (leída hoy desde la guía de la API) y `costoDeUso(usage)`,
pura y probada: Opus 5.5 a 4 USD por millón de tokens de entrada, 5 la escritura de caché a 5 minutos, 8 a 1 hora, 0,20 la lectura de caché y 20
la salida; la búsqueda web, 10 USD cada 1 000 (una que falla no se cobra); la lectura web, nada aparte de sus tokens. Un nombre de modelo con
fecha se cobra como su modelo (la clave más larga con la que empieza: Sonnet 5.5 no es Sonnet 5) y uno que no esté en la tabla, al precio más
alto: el crédito nunca baja de menos. Todo lo que gasta una corrida pasa por ahí; si una llamada se corta por tiempo (la API no dice cuánto
gastó) se anotan 0,30 USD estimados y se cuenta en `cortadas`.

**El tope.** Antes de cada llamada se reserva lo que cuesta una (0,35 USD); si no cabe en el tope, o lo gastado ya llegó, las tareas con API se
dejan y queda `resumen.tope = true`; lo ya leído y pagado se sigue ubicando y proponiendo (el SIC y Mapbox no gastan el crédito). Por eso el
gasto puede quedar un poco por debajo del tope: **Corridas pinta «Llegó al tope» también con `resumen.tope`** (`llegoAlTope` en
`src/lib/ciudadesAdmin.ts`: la misma píldora y el mismo texto del botón, una condición más; sin cambio de pantalla).

**La hoja «Correr»** (`src/app/admin/ciudades/acciones.ts`): solo añade el disparo del primer paso después de responder. Nada más de Ciudades,
la bandeja ni Corridas cambia.

## Costo estimado por corrida de «Buscar lugares» (para compararlo con el tope de 3,00 USD)

Supuestos (a confirmar con la primera corrida real: `resumen.por_fuente.<fuente>.usd`): las reglas, las herramientas y el encargo con la lista de
conocidos suman unos 3 600 tokens de entrada; cada búsqueda trae unos 6 000 tokens de resultados (la búsqueda con filtrado dinámico ya los
recorta) y la lectura de una página hasta 10 000; el modelo escribe unos 2 000 tokens (lo que piensa con esfuerzo bajo y la lista); la API
relee el contexto en cada vuelta de la búsqueda y lo guarda en caché sola.

| Llamada | Búsquedas | Sin caché | Con caché |
|---|---|---|---|
| Cultura del estado (2 búsquedas + 1 página) | 0,02 | 0,28 | 0,19 |
| Cultura del municipio (igual) | 0,02 | 0,28 | 0,19 |
| Búsqueda web A (2 búsquedas) | 0,02 | 0,18 | 0,14 |
| Búsqueda web B (2 búsquedas) | 0,02 | 0,18 | 0,14 |
| SIC (CSV directo) | — | 0 | 0 |
| **Corrida** | **0,08** | **≈ 0,92** | **≈ 0,66** |

Unos **0,70 a 0,95 USD por corrida**; en el peor caso, si las cuatro llamadas se cortaran por tiempo, 1,20 USD estimados. El tope de 3,00 deja
margen de sobra; la hoja dice «Se estima entre 1 y 3 USD» y sigue siendo cierto como techo. Con `claude-sonnet-5-5` costaría la mitad.

**Pasos para una ciudad típica (como San Luis):** 1 (lee el SIC y propone hasta 40 con su punto) + Cultura del estado (1) y su lote de Mapbox
(1–2) + Cultura del municipio (1) y su lote (1–2) + búsqueda web A (1) y su lote (1–2) + búsqueda web B (1) y su lote (1–2): de 9 a 13 pasos.
Encadenados, de 3 a 6 minutos (cada paso con la API tarda hasta unos 40 s); si la cadena se corta, el cron los retoma cada 5 minutos (hasta una
hora). En el ensayo con los CSV reales del SIC de San Luis: 40 propuestas en el primer paso y 74 que esperan a la siguiente corrida.

## Decisiones por confirmar (founder o gestor)

1. **El cron cada 5 minutos en Vercel** (lo pedido) choca con «Decidido» del 2026-09-21: «nada de tareas programadas más frecuentes que una al
   día» por si la cuenta vuelve al plan gratuito, donde un `*/5` impide desplegar. Hoy la cuenta es Pro (OL-190). Si se quiere la regla, el
   mismo llamado puede ir en `pg_cron` de Supabase como los avisos (ASIGNACIONES, OL-086) y el cron de Vercel quedarse diario.
2. **Encadenar pasos:** cada paso que tomó una corrida pide el siguiente (la corrida acaba en minutos, no en una hora); el cron es la red.
3. **Modelo `claude-opus-5-5` con esfuerzo bajo** (el que pide la guía de la API); `claude-sonnet-5-5` costaría la mitad y es más rápido si
   aparecen `cortadas`. Está en una constante (`MODELO_RUTINAS`) con su precio en la tabla.
4. **Sin el respaldo de la API ante un rechazo** (`fallbacks`): cartel.ts no lo usa, buscar espacios culturales no debería activarlo y
   complicaría la cuenta del gasto (otro modelo, otro precio). Un rechazo queda como aviso y la corrida sigue.
5. **`propuestas.datos.ciudad` lleva el nombre de la ciudad, no el slug** (el encargo decía slug): así lo leen `entradaDeLugar` al aceptar y
   `lugares.ciudad` al guardar; con el slug, la ficha aceptada saldría en una ciudad «san-luis-potosi».
6. **`detalle`, una frase propia de hasta 60 caracteres** que también es el «Otro · …» de la ficha (en los demás tipos la ficha no la usa).
7. **Tablas del SIC:** fuera librerías, cines comerciales, universidades, «otras bibliotecas» (escolares, jurídicas…) y casas de artesanías.
8. **40 candidatos nuevos por tarea y corrida;** el resto llega en la siguiente (San Luis: 74 del SIC).
9. **Área de 15 km** con el zoom de ciudad (doble por nivel menos, hasta 60).
10. **Cultura acotada a `*.gob.mx`.**
11. **Llamada cortada: 0,30 USD estimados** (la API no dice cuánto gastó).
12. **«Llegó al tope» también con `resumen.tope`.**
13. **Un «Falló» no dice su razón en pantalla** («Falló el 20 oct · 0,00 USD»): la razón está en `resumen.error` («Este botón todavía no tiene
    rutina», «La ciudad está cerrada»…). Mostrarla sería tocar la pantalla: otra pieza.
14. **Mapbox:** el token público de la app desde el servidor; si un día se restringe por dominio, el servidor deja de ubicar (los candidatos sin
    punto quedarían «sin ubicación»). Search Box (por nombre) solo como último recurso: cobra por sesión fuera de su cupo gratis.
15. **El crédito del SIC:** su uso pide dar el crédito; la propuesta lo guarda, pero la ficha aceptada no dice de dónde salió (OL-427, decisión
    5: ampliar `origen` es otra pieza).

## Evidencia (árbol sin `.env`; sin red en las pruebas)

- `npm run lint` (0 errores; el aviso viejo de `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test`: 244 archivos, 4 175
  pruebas, todas bien. Nuevas, 57 en `src/lib/rutinas/` y dos comprobaciones más en `ciudadesAdmin.test.ts` («Llegó al tope» con
  `resumen.tope`): `precios` 6 (el costo con caché y búsquedas, el nombre con fecha, el modelo desconocido al precio más alto), `filtros` 10 (área y radio, municipio, nombres parecidos, lo rechazado y lo conocido), `sic` 6 (CSV
  con comillas y Latin-1, filtro por municipio y alias, ficha en https, sin teléfonos ni correos, tablas que fallan), `claude` 6 (la llamada,
  `pause_turn`, `refusal`, corte por tiempo con lo estimado, error de la API sin cobrar ni mostrar la llave, sin tiempo no llama), `mapbox` 6,
  `disparar` 4 (a dónde puede viajar el secreto; sin secreto no dispara), `atender` 4 (la ruta: 401 sin secreto o con otro, 202 y un paso después
  de responder, encadena solo si tomó una corrida, `?esperar=1`) y `motor` 15 con una base en memoria (`baseFalsa.ts`), una API y un Mapbox
  falsos: el primer paso (reclamo, SIC gratis, propuesta con el contrato exacto de `datos`), la corrida entera hasta «Terminada» (orden de
  fuentes, lotes, gasto 4 × costo, contadores sin nombres), lo que se le pide al modelo (conocidos, rechazados no culturales, `gob.mx`, 2+2
  búsquedas web), **dos llamadas a la vez (una sola corre)**, la corrida ocupada y su turno, **el tope que corta** (antes de la primera llamada y
  a media corrida, con «Llegó al tope»), **la cancelación** entre pasos y a medio paso, los botones sin rutina, la ciudad cerrada, el tropiezo
  que a la tercera falla, sin llave de la API, el SIC caído leído con la API y las propuestas que no se pueden guardar.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 101 migraciones, 2 158 comprobaciones, 0 fallaron (sin migración
  nueva).
- **Ensayo contra PostgreSQL 17 + PostgREST 16 reales** (clúster propio en el scratchpad, puerto 55432, para no tocar la base compartida; las 101
  migraciones; la llave de servicio como JWT `service_role`; los CSV reales del SIC del estado 24; API y Mapbox falsos), 5 de 5: dos llamadas a la
  vez con una sola pendiente, una toma y otra «nada»; nueve pasos hasta «Terminada» con `gasto_usd` = 0,52 (4 llamadas), 44 propuestas (40 del
  SIC, 2 de Cultura, 2 de la búsqueda web) sin repetidos, sin el lugar que ya existía ni el rechazado; los filtros `resumen->>turno` y
  `resumen->turno is null` (una que «corría» sin turno) funcionan; agendas y artistas quedan «Falló · Este botón todavía no tiene rutina»; la
  cancelación a medio paso anota 0,13 y no propone nada; la suma de `gasto_usd` (lo que resta el crédito) da lo esperado.
- `npm run inventario`: **falla, pero no por esta pieza**: «bloquesDuplicados subió de 1 a 2» por `ciudades.module.css .motivo > small` igual a
  `showcase.module.css .opcion > small`, que llegó con la unión de Ciudades y Showcase (`0f510f4f`); entre esa base y esta rama no cambia
  ningún CSS. En `main` ya está arreglado (`0bf7c589`, la regla compartida `admin.menuConDetalle`): al traer `main` a esta rama queda en
  verde. Traer `main` solo choca en `OPEN_LOOPS.md` (comprobado con `git merge-tree`); nada de lo que toca esta rama cambió en `main`.
- `npm run medir`: 49 pantallas × 4 anchos, **sin novedades** (s32 a s35, Ciudades, su hoja, la bandeja y Corridas, con las mismas cifras de la
  bitácora 460: 149 · 175 · 59 · 61 nodos a 390); con el teclado, el tope de la hoja a la vista y «Cancelar» · «Correr» sobre él.
- `npm run test:componentes` completo: 669 de 669 (Chrome real; las de Ciudades sustituyen las acciones del servidor, así que el disparo del
  primer paso no corre ahí: lo prueban `disparar` y `atender`).
- **Sin capturas:** ninguna pantalla cambia (la píldora «Llegó al tope» y el texto del botón son los mismos; solo se suma una condición).

## Lo que no se hizo

- Las rutinas de agendas y eventos (OL-429) y de artistas y showcase (OL-430): hasta entonces, sus corridas quedan «Falló» al tomarlas el motor.
- Publicar los eventos aceptados sin ficha (lo que OL-427 dejó «para OL-428»): «Buscar lugares» no propone eventos; va con la rutina de
  agendas (OL-429).
- Ninguna llamada real a la API, a Mapbox ni a producción desde este árbol: la primera corrida real es del gestor.
- Unificar las búsquedas de Mapbox con las del importador (`scripts/instituciones`, OL-424, en la rama `eventos-procedencia` sin unir): se
  escribieron aparte para cualquier ciudad (la del importador está atada a San Luis); se pueden juntar cuando OL-424 entre.

## Para la primera corrida real (gestor)

1. Con `admin-ciudades` y esta rama unidas y la migración `20261020140000_ciudades.sql` aplicada: en Vercel › Settings › Cron Jobs debe
   aparecer `/api/rutinas/correr` cada 5 minutos, y en Production deben estar `CRON_SECRET`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y
   `NEXT_PUBLIC_MAPBOX_TOKEN` (ya existen).
2. **Ciudad: San Miguel de Allende** (abierta, Guanajuato, pocas fichas: la bandeja sale corta y se ve si los filtros dejan pasar lo bueno);
   después San Luis (muchas ya existen: prueba los duplicados). **Tope: 1,50 USD** para la primera (caben las cuatro llamadas si cuestan lo
   estimado; si no, se verá «Llegó al tope»).
3. Qué mirar: en Ciudades, el botón pasa a «Corriendo · 1 de 3 fuentes · 0,00 de 1,50 USD» con su barra en segundos; en Corridas, «En curso» y
   luego «Terminada» o «Llegó al tope»; la bandeja por fuente; el crédito baja. En la base: `select estado, gasto_usd, resumen from
   rutinas_corridas order by creado_en desc limit 1` (contadores, `avisos`, `por_fuente.*.usd` contra la tabla de arriba, `cortadas`). En los
   registros de Vercel, las líneas «rutinas:». Para un paso a mano: `POST /api/rutinas/correr?esperar=1` con `Authorization: Bearer
   $CRON_SECRET` devuelve lo que hizo.
4. Si aparecen `cortadas`, pasar a `claude-sonnet-5-5` o subir `maxDuration`; si el SIC da «no respondió al servidor», mirar si bloquea a
   Vercel.
