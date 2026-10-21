# 457 · De dónde salió cada evento, y cargas del pasado sin avisos (OL-424)

**Fecha:** 2026-10-20. **Rama:** `eventos-procedencia`, desde `origin/main` (`2b63acce`, #538). **Operador:** agente de la pieza (Claude) para
el Gestor VII, sin otros agentes. **Migración:** `supabase/migrations/20261020120000_eventos_procedencia.sql` (solo añade; la aplica el
gestor). Sin variables de entorno nuevas en la app. **Estado:** lista para la revisión del gestor; nada aplicado en ninguna base remota.

## El pedido

Founder, 20 de octubre: «un mapeo de la actividad cultural durante todo el año, localizando las agendas culturales del resto de los meses
desde enero para acá […] Si es viable, entonces lo usamos para nutrir el contenido de la aplicación aunque sean eventos pasados». El gestor
lee las agendas mensuales de la Secretaría de Cultura (PDF, enero a agosto) con la API y las carga con el importador; esta pieza prepara el
terreno (doc «mapeo anual y showcase», §3.4, paso 1). A media pieza el gestor sumó, con el dato de la prueba real de enero (30 eventos, todos
«ya pasó» y uno «Confirma la ubicación…» por un sitio sin punto): geocodificar los sitios sin punto en las cargas históricas y una sección
«Ya existen parecidos» en el informe.

## Qué cambió

**Migración `20261020120000_eventos_procedencia.sql`** (solo añade):

- `eventos.origen text`: nulo = lo publicó una persona desde la app; si no, la carga (`agenda-secult-2026-03`, `agenda-institucion`, `redes`,
  `capo`). Restricción `eventos_origen_valido`: minúsculas, números y guiones, hasta 60.
- `eventos.fuente_url text`: la dirección del PDF o de la publicación. Restricción `eventos_fuente_url_valida`: `http(s)://…`, hasta 500.
- Comentarios de columna e índice parcial `eventos_origen_idx` (`where origen is not null`) para contar o deshacer una carga entera.
- Disparador `proteger_procedencia` (`proteger_procedencia_evento()`, antes de insertar o de cambiar esas dos columnas), como
  `proteger_autor_y_visible`: las cuentas (`anon`, `authenticated`) no las ponen ni las cambian; la administración, sí; la llave de servicio, las
  migraciones y las funciones SECURITY DEFINER no pasan por ahí. Hace falta porque con el permiso de tabla de Supabase un `revoke` por columna
  no basta (bitácora 072). Las **políticas de `eventos` no cambian**.
- No toca ninguna función de avisos (ver abajo por qué no hace falta).

**Importador (`scripts/instituciones/importar-eventos.ts`):**

- `--origen <texto>` y `--fuente <url>` (opcionales; obligatorios con `--historico`), validados con la misma forma que la base
  (`opcionesDeCarga` en `instituciones.ts`). Cada fila cargada lleva `origen` y `fuente_url`; el informe los dice arriba («Origen: … · Fuente:
  … · carga histórica…»).
- **Hoy rechazaba lo pasado:** sí, `if (new Date(datos.inicio) < ahora)` lo mandaba a «Fallaron o ya pasaron». **Sin `--historico` sigue
  igual** (el mensaje ahora añade «con --historico entra»). Con `--historico`, lo pasado entra, visible (el valor por omisión de la columna).
- **Duplicados:** lo de siempre (mismo título normalizado a la misma hora → «Ya estaban»; `eventos_parecidos` → «Ya existen parecidos»). Como
  `eventos_parecidos` solo mira lo que **no ha pasado** (`termina >= now()`; lo demuestra el banco), para lo pasado el importador compara además
  contra todo lo guardado ese día local en ese sitio con la misma regla de títulos, portada a TypeScript (`titulosDelMismoEvento` y
  `parecidoGuardado`): el mismo título, uno dentro del otro con el corto distintivo, o dos palabras con contenido en común. Cuenta también lo
  oculto (no vuelve a meter lo que la administración ocultó; el informe dice «oculto») y lo cargado en la misma vuelta. Así septiembre, que ya
  está en parte, no se duplica.
- **Sitio sin punto:** con `--historico`, un `sitio` que llega sin coordenadas se busca en Mapbox por su nombre (Search Box, POI) y, si la
  agenda trae `sitio_direccion`, también por dirección (Geocoding v6), contrastados con `elegirPunto` y **dentro de la caja de la ciudad**, como
  el alta de instituciones. Si aparece, entra con su punto (y la dirección de Mapbox si no traía una) y el informe dice dónde y cómo se ubicó.
  Si no, el evento **no se carga** y va a la sección nueva **«Sitio sin punto»** para resolverlo a mano. Cada sitio se busca una sola vez.
  `EventoPropuesto` admite `sitio_direccion`, `sitio_lat` y `sitio_lng` (si la lectura ya los trae, no se busca nada).
- `--autor` tiene que ser una cuenta de la administración (lo comprueba al empezar): una carga a nombre de otra cuenta le sumaría a la
  administración un aviso «evento nuevo» por fila (`avisos_admin_trigger_eventos`).
- La lectura paginada de lugares, eventos y artistas va ordenada por `id` (sin orden, PostgREST puede repetir o saltar filas entre páginas).

**`scripts/instituciones/mapbox.ts` (nuevo):** `porNombre` y `porDireccion` salen de `importar.ts` (que ahora los importa, sin cambio de
comportamiento) con el `fetch` y la dirección de la API como parámetros (`MAPBOX_API_URL` solo para ensayar contra una respuesta simulada), y
`ubicarSitio` para los sitios de eventos.

**Dos líneas que rompían con la carga del año** (punto 4 del encargo; ver abajo): `src/app/sitemap.ts` pide los eventos ya sin lo pasado y
`src/app/novedades/consultas.ts` también (por lugar y por artista). Ajusté el doble de la prueba del sitemap para que admita `.gte` y compruebe
el filtro.

## Qué hace el disparador de avisos con lo no nativo (comprobado)

`avisos_evento_trigger` en cada alta llama a `avisos_encolar(id, true, …)` y registra el alta en `avisos_origen` con `nativo = auth.uid() is not
null`. El importador usa la llave de servicio, sin sesión: `auth.uid()` es nulo, así que el evento queda **`nativo = false`** y `avisos_encolar`
**sale antes de crear ningún job** (`if auth.uid() is null or not optin then return`; además solo encola con la marca `app.avisos_outbox`, que
pone la acción del alta de la app). Los recordatorios (`avisos_recordatorios`) solo crean jobs para eventos que empiezan en las próximas 24 h y
tienen «voy»: lo pasado nunca entra. `avisos_admin_trigger_eventos` calla cuando el autor es la administración. **No hizo falta arreglar nada
en la migración.**

La prueba, en el banco de la base (`supabase/tests/pg/eventos-procedencia.test.mjs`, 23 comprobaciones; corre con `npm run test:db`), con todos
los avisos encendidos (captura, entrega, recordatorios), una seguidora del lugar y del artista ligado y un «voy» puesto a mano en el evento
pasado:

- la carga del 15 de enero con origen y fuente: `avisos_origen` la registra `nativo = false`, autor nulo; **0 jobs**; ni un aviso a la
  administración; tras `avisos_recordatorios()` y `avisos_expandir()` hasta vaciar, **0 jobs, 0 entregas, 0 novedades**;
- ni con la marca del outbox puesta a mano: sin sesión, 0 jobs;
- contrastes (que el banco sí ve un aviso cuando lo hay): un alta desde la app (`guardar_evento_con_avisos`) en el mismo lugar crea su
  «nuevo_evento»; una carga a nombre de una cuenta que no es admin no avisa a seguidores pero sí suma un aviso a la administración;
- `eventos_parecidos` no devuelve el evento pasado (por eso el importador compara lo pasado por su cuenta);
- una cuenta no publica con origen ni pone origen o fuente a su evento (42501); un visitante no escribe eventos; la autora sigue editando su
  evento; la administración edita el evento cargado con `guardar_evento_con_clase` (la acción de la app) y **origen y fuente se conservan**;
  corregir ese título no avisa; la administración sí cambia el origen; las restricciones rechazan «Agenda SECULT» y `ftp://…` (23514).

## Ensayo del importador real (sin producción)

En el scratchpad: Postgres 17 local con las 100 migraciones, **PostgREST local** detrás de un intermediario `/rest/v1` y una respuesta
simulada de Mapbox (El Meteorito sí aparece; «Jardín Inexistente», no); el importador compilado tal cual con `correr.mjs`, con una llave de
servicio local y sin `.env`. Datos: el Museo Francisco Cossío, Leo Traeger, una seguidora de los dos con correo, avisos encendidos y, ya
guardado, «Pargazz: Gitanos mexicanos, 2ª Edición» el 16 de enero a las 19:00. Archivo con cuatro eventos de enero:

| Corrida | Resultado |
|---|---|
| sin `--historico` | 0 cargados; los dos del Cossío «ya pasó (…); con --historico entra», los dos sitios «Confirma la ubicación…» (como hoy) |
| `--historico --origen …` sin `--fuente` | sale con 1: «Con --historico van --origen <texto> y --fuente <url>…» |
| `--autor` de una cuenta que no es admin | sale con 1: «no es una cuenta de la administración…» |
| `--historico --origen agenda-secult-2026-01 --fuente https://…/enero.pdf --simular` | entrarían 2 · ya existen parecidos 1 (Pargazz) · sitio sin punto 1; **la base no cambió** |
| la misma, de verdad | cargados 2: el concierto con Leo Traeger ligado y «Noche de estrellas» en El Meteorito (22.13120, -100.99210, dirección de Mapbox); los dos con `origen = agenda-secult-2026-01`, `fuente_url` = la del PDF, visibles, `nativo = false`, 0 jobs |
| otra vez | cargados 0 · ya estaban 2 · parecidos 1 · sin punto 1 |

Tras la carga, `avisos_recordatorios()` = 0, `avisos_expandir()` = falso, `avisos_tomar()` = nulo: 0 jobs, 0 entregas, 0 novedades en toda la
base, y la cola de avisos a la administración igual que antes. Mapbox solo recibió las dos búsquedas de sitio, con la caja de la ciudad.

## Las pantallas con eventos de enero (punto 4)

Revisión de lectura del código, sin cambiar pantallas:

- **Agenda, Inicio, «esta semana», buscar, sitios fuera del directorio, próximas fechas de las fichas:** todas filtran `termina >= ahora`
  (`filtroSinPasar`); lo de enero no aparece. Nada asume septiembre (no hay fechas fijas en `src/`).
- **Ficha del evento en pasado y «Quién fue»:** funcionan con cualquier fecha; sin cartel, el símbolo SN (`fotoDeEvento`); «Quién fue» solo
  sale si alguien dijo «Voy» (en lo cargado, nadie).
- **Historial de lugar y trayectoria de artista:** toleran `imagen` nula. **Anotado:** leen como mucho `TOPE_HISTORIAL = 200` eventos por ficha
  (lo más reciente primero; el comentario dice «171 en toda la base el 12 de oct»). Con el año cargado, el CEART y otros pueden pasar de 200: la
  ficha diría «200+ fechas» y los meses más viejos no saldrían. **«Tu año» de lugar y de artista** usa esa misma lectura: contaría de menos y el
  «del … al …» empezaría donde corta. No lo cambié (subir el tope es una línea, pero pesa en todas las fichas): decisión del gestor.
- **«Otras funciones» de la ficha del evento** lee 100 pasadas por lugar: con un año, una serie larga en el mismo sitio puede contar de menos.
  Menor; anotado.
- Los eventos con `sitio_texto` (sin lugar) no entran al historial de ningún lugar (como hoy).
- **Grafo:** lee todo paginado; solo crece. **Indicadores de Administración:** ya apartan lo que publica la administración.
- **Rompían (una línea cada uno, cambiados):** el **sitemap** pedía todos los eventos visibles con `.limit(5000)` y filtraba lo pasado después;
  PostgREST corta en 1 000 filas sin avisar, y con el año cargado los visibles pasan de 1 000: el sitemap habría perdido eventos próximos al
  azar. **Novedades** («Nuevo en …» y «Nueva fecha de …») pedía lo creado en 14 días con tope 500 y filtraba lo pasado después: una carga
  histórica habría llenado el tope y dejado fuera lo nuevo de verdad durante dos semanas. Los dos piden ahora `termina >= ahora` en la base.

## Verificación

- `npm run lint`: 0 errores (1 aviso que ya estaba en `VisorImagen.componentes.test.mjs`).
- `npm run typecheck`: verde.
- `npm test`: 231 archivos, **4 055 pruebas** en verde (nuevas: 5 de cargas históricas en `instituciones.test.ts`, 4 de `mapbox.test.ts` con
  Mapbox simulado, y la del filtro del sitemap).
- `npm run test:db` contra un Postgres 17 local en el scratchpad: **100 migraciones aplicadas, 2 054 comprobaciones, 0 fallaron** (antes de la
  pieza, 99 y 2 031: las 23 nuevas son de `eventos-procedencia.test.mjs`).
- `npm run inventario`: sin novedades. `medir` no: no cambió ninguna pantalla.
- `CLAUDE.md` sin cambios.

## Por confirmar

1. **Lectura pública de `origen` y `fuente_url`:** con el permiso de tabla de Supabase cualquiera puede leer las dos columnas de un evento
   visible (`select *`). Son una etiqueta y la dirección de un PDF o post públicos; ocultarlas exigiría cambiar permisos de toda la tabla. Lo
   dejé así.
2. **Sin relleno hacia atrás:** los 383 eventos de hoy quedan con `origen` nulo; la carga de octubre (100, ids en su informe) podría marcarse
   `agenda-secult-2026-10` a mano si el gestor quiere contarla igual.
3. **Geocodificar solo con `--historico`,** como pidió el gestor. Una carga normal con un sitio sin punto sigue fallando con «Confirma la
   ubicación…»; extenderlo a todas es quitar una condición.
4. **Lo oculto cuenta como parecido** en lo pasado (para no volver a meter lo que la administración ocultó); `eventos_parecidos` no lo cuenta.
5. **`TOPE_HISTORIAL` (200 por ficha)** y «Tu año» de lugares grandes, arriba.
6. **El texto del sitio se guarda como viene** («El Meteorito. Museo Interactivo de…» con sus puntos suspensivos si la lectura los deja): la
   búsqueda los quita, el nombre no.
7. Toqué `src/app/sitemap.ts`, `src/app/novedades/consultas.ts` y `src/lib/sitemap.test.ts`, que el encargo no nombraba: si otra pieza los
   lleva, el gestor decide el orden.

## Para el gestor

- Aplicar la migración `20261020120000_eventos_procedencia.sql` **antes** de la primera carga con `--origen`: sin las columnas, cada fila falla
  sola y queda en «Fallaron». Una carga sin `--origen` no manda esas columnas y funciona con o sin la migración.
- Uso: `node scripts/instituciones/correr.mjs importar-eventos enero.json --autor <id admin> --historico --origen agenda-secult-2026-01
  --fuente https://cultura.slp.gob.mx/…/enero.pdf --simular` (y sin `--simular` tras el visto bueno).
- Deshacer una carga: `delete from public.eventos where origen = 'agenda-secult-2026-01'` (o el archivo de ids de su informe).
