# 123 · Pincel en la app: plan de Fase 0, sin código (OL-088)

**Fecha:** 2026-09-19 · **Rama:** `pincel-app`, desde `origin/main` `5d10368` · **Pieza:** OL-088, reservada por gestión de cambios en `docs/ops/ASIGNACIONES.md`. Autorizado por el founder («llevalas a prod», «que comience producción», 2026-09-19). Este documento es el único entregable de esta fase: no toca `src/`, `supabase/migrations/` ni ningún archivo de código.

## Qué pidió gestión de cambios

> Fase 0, ahora: plan corto, SIN código. […] Debe responder: 1) Datos. 2) Tiempo real. 3) Cercanía. 4) Rutas y pantallas. 5) Fases con su prueba, cada una publicable por separado. 6) Riesgos y qué NO entra.

## Punto de partida: qué firmó el founder en el prototipo

Prototipo local firmado (OL-084, bitácora [118](118-pincel-prototipo.md), rama local `codex/pincel-prototipo`, commit `6063e16`, no fusionada, sin remoto):

- El celular es **solo mando**: no dibuja nada; un botón central indica «pintando» al mantenerlo presionado; Trazo (curva/aire/spray/orgánico) y Tinta (5 colores) son tarjetas que muestran lo elegido.
- **Admin** entra por la ficha del evento («Activar Pincel») o por el panel (Administración → Obras colectivas); ambas puertas crean la obra y la proyectan; puede cerrarla y reabrirla.
- Un tercer camino: crear la obra **desde la ubicación actual, sin evento**, con nombre y hora de cierre sugeridos y editables, sin formulario largo.
- **Participante** entra solo por el QR de la proyección; antes de pintar hay una comprobación breve de cercanía.
- La proyección (pared pública) no lleva controles de administración; al cerrar la obra, deja de mostrar el QR pero la obra sigue visible.
- Todo simulado: sin sesión real, sin GPS real, sin sensores de movimiento reales, sin comunicación entre dispositivos, sin persistencia.

Esta fase 0 traduce ese recorrido ya firmado a datos y pantallas reales, usando lo que el repo ya tiene.

## Lo que el repo ya tiene y esta pieza reutiliza

- **RLS:** patrón `public.es_admin()` (`supabase/migrations/20260913120000_base.sql:103-106`) y el de lectura-pública/escritura-propia de `lugares`/`eventos` (mismas líneas 137-164). Toda tabla nueva sigue este patrón, no uno propio.
- **Cercanía:** `leerUbicacion()` en `src/lib/ubicacion.ts` (una sola lectura del GPS, nunca se guarda, ya documentado así en su propio comentario) y `distanciaKm()` en `src/lib/geo.ts` (haversine), ya en uso para "Cercanos" y "Cerca de mí". Pincel no necesita geolocalización nueva, solo un umbral de distancia.
- **Auth:** `usuarioActual()` en `src/lib/supabase/servidor.ts:43-56` y el patrón `if (!actual) redirect("/entrar?siguiente=…")` que ya usan `admin/page.tsx:35-36` y la ficha de evento. Sin contraseñas (Apple/Google/correo).
- **Admin:** panel de una sola pantalla en `src/app/admin/page.tsx` con `SECCIONES` (líneas 20-25) que enlazan a `/admin/<seccion>`; el mismo patrón sirve para sumar "Obras colectivas".
- **Ficha de evento:** `src/app/eventos/[id]/page.tsx`, ya calcula `esAdmin` (línea ~124) para mostrar acciones solo a administración — el lugar natural para "Activar Pincel".
- **Zona horaria:** `eventos`/`lugares` ya cargan `zona` (decisión "cualquier país", `supabase/migrations/20260917100000_zona_horaria.sql`); la hora de cierre de una obra debe seguir el mismo patrón, no un timestamp ingenuo.
- **Lo que NO existe hoy y esta pieza sí necesita:** Realtime (ningún `supabase.channel(` en `src/`), una tabla de Pincel, una librería de QR (`package.json` no tiene ninguna), y ningún manejo de sensores de movimiento (`DeviceOrientationEvent`) en el código.

## 1. Datos

Una sola tabla nueva, migración que solo añade (`create table`, nunca `alter`/`drop` sobre las 43 existentes):

**`obras_colectivas`**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `nombre` | text | sugerido o el título del evento |
| `evento_id` | uuid null → `eventos` | null si se creó por ubicación |
| `lugar_texto` | text | nombre del lugar a mostrar (el del evento, o algo simple si es por ubicación) |
| `lat`, `lng` | numeric null | del lugar del evento, o de `leerUbicacion()` al crear por ubicación; snapshot, no se actualiza después |
| `zona` | text | igual patrón que `eventos.zona`, para que "cierra a las" tenga sentido |
| `cierra_en` | timestamptz | sugerido, editable por el admin al crear |
| `estado` | text | `check in ('abierta','cerrada')` |
| `creado_por` | uuid → `perfiles` | quien la activó |
| `creado_en`, `cerrado_en` | timestamptz | `cerrado_en` null hasta terminar |
| `imagen_final` | text null | ruta en Storage del PNG final (ver §2) |

**RLS**, mismo patrón que `lugares`/`eventos`:
- Lectura: **pública** (`using (true)`), como `lugares`/`eventos` la dan a quien no tiene sesión — la proyección se abre en una laptop conectada al cañón, sin login, y necesita leer nombre/estado/`imagen_final` sin cuenta. No hay dato personal en esta tabla (nombre de la obra, no de personas).
- Alta y baja de estado (crear, cerrar, reabrir): solo `public.es_admin()`, igual que hoy solo el admin crea desde ambas puertas del prototipo.
- Nadie borra una obra por ahora (sin `delete` policy) — cerrar es suficiente; borrar sería una pieza aparte si hace falta.

**Sin tabla de trazos.** La opción de guardar cada trazo (posición, color, pincel, marca de tiempo) crece sin límite claro con el uso y no la pide el prototipo, que ya trata el trazo como algo que se ve, no que se archiva. Propuesta: **solo la imagen final** — un PNG de la obra en el bucket `fotos` que ya existe (`supabase/migrations/20260913120000_base.sql:168-178`, con endurecimiento posterior en `20260918150000_storage_listado_minimo.sql`) bajo una carpeta propia (p. ej. `fotos/obras/<obra_id>.png`), generado por la proyección con `canvas.toBlob()` y subido al cerrar la obra (y, para no perderlo si la pestaña de la proyección se cae a medias, con un snapshot periódico cada 30–60 s mientras está abierta, sobrescribiendo el mismo archivo). Pregunta para el founder en el cierre de este documento.

## 2. Tiempo real

**Supabase Realtime Broadcast**, no Presence ni guardar cada trazo:

- Un canal por obra (`obra:<id>`), no uno por persona. Cada mando manda mensajes pequeños (pincel, color, y el delta de movimiento del sensor, no coordenadas absolutas) a una tasa fija baja (propuesta: 8–10 por segundo mientras el botón está presionado); la proyección los recibe y dibuja con la misma lógica de `drawMark` que ya existe en el prototipo (`experiments/pincel-prototipo/public/app.js`), portada a la app.
- El canal se abre con autorización (`private: true` en `supabase-js`, que usa RLS sobre `realtime.messages`, soportado por la versión instalada, `^2.116.0`) para que solo cuentas con sesión puedan mandar o recibir — cumple "solo cuentas registradas" sin depender de que el nombre del canal sea difícil de adivinar.
- El contador de "N personas aquí" (hoy fijo en "18" en el prototipo) puede resolverse con Realtime **Presence** en el mismo canal, sin tabla nueva — Fase 2, no bloqueante.
- **Costos y límites: no verificados todavía.** No hay ningún archivo en el repo que diga el plan de Supabase de este proyecto (Free/Pro) ni sus cupos de conexiones concurrentes o mensajes por segundo de Realtime — es dato del panel de Supabase, no del código. Con 18–50 personas pintando a la vez más la proyección, cada mando a ~10 Hz son ~180–500 mensajes/segundo agregados en los picos; hay que leer el cupo real del proyecto antes de fijar la tasa y, si hace falta, bajarla (p. ej. a 4–5 Hz) o agrupar varios movimientos en un mismo mensaje. Esto se verifica al empezar la Fase 2, no se supone.
- Si Realtime resultara insuficiente o caro, la alternativa de respaldo (sin rediseñar el resto) es un `broadcast` más agresivo del lado del cliente (menos mensajes, más distancia por mensaje) antes que agregar una tabla o *polling*.

## 3. Cercanía

Reusa lo que ya existe, sin nada nuevo:

- `leerUbicacion(false)` (aproximada, no exige GPS preciso) una sola vez al llegar a la pantalla de comprobación — igual que el prototipo simulaba, ahora real.
- `distanciaKm(ubicaciónPersona, {lat: obra.lat, lng: obra.lng})` contra un umbral (propuesta: 150 m, el mismo número que ya usa el proyecto para "¿es este lugar?" en el alta de `lugares`, así no se inventa una unidad nueva de cercanía).
- Nunca se guarda la ubicación de la persona — ni en `obras_colectivas` ni en ninguna tabla nueva; se usa en el momento y se descarta, tal como ya documenta `leerUbicacion()` en su propio comentario.
- Si `leerUbicacion()` rechaza (`"sin-soporte"`, `"negado"`, `"error"`), se avisa y no se deja pintar — sin bloquear el resto de la app, igual que hoy ningún otro uso de `leerUbicacion()` la exige para navegar.

## 4. Rutas y pantallas en `src/app`

Todo detrás de `usuarioActual()` salvo la proyección:

- **Ficha de evento** (`src/app/eventos/[id]/page.tsx`): acción «Activar Pincel», visible solo si `esAdmin` (misma variable que ya calcula la página), que crea la obra con `evento_id`, `lat`/`lng`/`zona` del lugar del evento, y navega al detalle de la obra.
- **Admin → Obras colectivas** (`src/app/admin/obras-colectivas/`, sumada a `SECCIONES` en `src/app/admin/page.tsx:20-25` igual que Personas/Lugares/Eventos/Artistas): lista (hoy probablemente una sola obra a la vez, ver riesgos), «Crear obra aquí» con `leerUbicacion()` en vez de un evento, y el detalle de cada obra con Proyectar / Terminar / Reabrir — mismo ciclo que el prototipo, ahora escribiendo `estado`/`cerrado_en` de verdad.
- **Pared** (`/obra/[id]/pared`, dirección neutra — no `/pincel/...`, doc [25](../../rediseno/25-obras-colectivas-criterio.md) ajuste 2 —, **sin** exigir sesión, solo lectura pública de `obras_colectivas`): el `<canvas>` que recibe el Broadcast y dibuja (lo de Pincel), y el QR hacia el mando (ver más abajo; lo demás —pantalla completa, QR que se esconde al cerrar— es común a cualquier obra). Pensada para una laptop o TV conectada a un cañón, no para el teléfono de un admin logueado.
- **Mando** (`/obra/[id]/mando`, dirección neutra — no `/pincel/...`, mismo ajuste 2): exige `usuarioActual()` (si no hay sesión, `redirect("/entrar?siguiente=…")`, patrón ya usado); primero la comprobación de cercanía (§3, común), después el controlador propio de Pincel ya firmado (botón, Trazo, Tinta), ahora leyendo sensores reales y mandando al canal en vez de simular.
- **QR:** apunta a la URL del mando con el id de la obra. **Hoy no hay ninguna librería de generación de QR instalada** (`package.json` revisado, ninguna). Se necesita sumar una dependencia chica (o un generador propio) — no lo decido en este plan, lo marco como pregunta para el founder/gestor antes de la Fase 2, ya que es una dependencia nueva y el repo las mantiene mínimas.

## 5. Fases, cada una publicable y con su prueba

**Fase 1 — Datos y admin (sin tiempo real ni sensores).**
Migración de `obras_colectivas` con su RLS; «Activar Pincel» en la ficha de evento; Admin → Obras colectivas con los tres caminos de creación (evento, panel, ubicación), Proyectar (pantalla estática con el nombre/estado, sin canvas en vivo todavía), Terminar y Reabrir.
*Prueba:* el founder, desde su iPhone en Safari, activa Pincel desde un evento real y por separado crea una obra desde su ubicación actual, ve ambas en el panel, cierra una y la reabre — sin que nada se dibuje todavía.

**Fase 2 — Pared y mando en vivo.**
Realtime Broadcast entre mando y pared (verificando antes los cupos reales del proyecto, §2), sensores de movimiento reales con su permiso de iOS Safari, Presence para el contador de personas, snapshot de la obra a Storage. Suma también un simulador chico (doc [25](../../rediseno/25-obras-colectivas-criterio.md) ajuste 4): un script que finge 20, 50 o 100 mandos mandando al canal, para medir el cupo real de Realtime antes de fijar la tasa de mensajes (§2) — sirve para cualquier obra futura, no solo Pincel.
*Prueba:* dos teléfonos con cuentas distintas, en la misma obra abierta, pintan a la vez y ambos trazos aparecen en la pared abierta en una laptop, con el founder viéndolo en vivo junto a otra persona; además, el simulador corrido con 50 mandos fingidos no tira el canal.

**Fase 3 — Cercanía real.**
`leerUbicacion()` + `distanciaKm()` antes de dejar entrar al mando; manejo explícito de "sin soporte"/"negado".
*Prueba:* el founder prueba entrar estando lejos del lugar real de una obra (bloqueado, con aviso) y luego cerca (entra).

**Fase 4 (si hace falta) — QR real y cierre del recorrido.**
Generación de QR de verdad en la proyección (sujeta a elegir cómo, ver §4) y snapshot final a Storage al cerrar.
*Prueba:* alguien ajeno escanea el QR proyectado con la cámara de su iPhone y llega directo al mando de esa obra.

Cada fase se publica y se prueba por separado, como pide el gestor; ninguna migración de una fase depende de código de la siguiente.

## 6. Riesgos y qué NO entra

**Riesgos:**
- Cupos de Realtime del plan real de Supabase, no documentados en el repo — se verifican al empezar la Fase 2, antes de fijar la tasa de mensajes (§2).
- Permiso de sensores de movimiento en iOS Safari (`DeviceOrientationEvent.requestPermission()`) exige gesto explícito y HTTPS; si se niega, la actividad no debe bloquearse — hace falta un modo alternativo simple (a decidir en Fase 2, no rediseñar el mando ya firmado).
- Una obra no persiste cada trazo (§1): si la pestaña de la proyección se cae entre snapshots, se pierde lo dibujado desde el último — mitigado con snapshots periódicos, no eliminado del todo.
- Añadir una librería de QR es una dependencia nueva; no la sumo sin que el founder/gestor la vean primero.
- El prototipo asume una obra a la vez; la app real no lo impone todavía a nivel de base de datos (ver pregunta abajo).

**Qué NO entra en esta pieza:**
- Pintar con el dedo en el celular (ya descartado por el founder en el prototipo).
- Guardar cada trazo individual (posición/color/momento) en una tabla — solo la imagen final.
- Moderación de lo que se pinta antes de mostrarse en la pared.
- Segunda ciudad, notificaciones push del cierre de una obra, o compartir la obra terminada fuera de la app — nada de esto estaba en el prototipo firmado.

## Preguntas para el founder, antes de escribir código

1. **¿Solo la imagen final, o también quieres poder rehacer/repasar el video de cómo se hizo?** Este plan asume que no (§1); guardar cada trazo es la otra opción, con su costo de almacenamiento y de una tabla más.
2. **¿Puede haber más de una obra abierta a la vez en la ciudad** (dos centros culturales con su propio Pincel la misma noche), o es una a la vez como asume hoy el prototipo? Cambia si la migración debe impedir dos obras abiertas o no.
3. **Librería de QR:** ¿la elijo yo (una chica, sin red ni terceros) o prefieres verla antes de sumarla?

## Firma del founder (2026-09-19)

El founder respondió las tres preguntas abiertas:

1. **Solo la imagen final.** Repasar el proceso (guardar cada trazo o un video) queda fuera por ahora.
2. **Varias obras a la vez son posibles, pero una sola abierta por evento o por lugar**, y eso lo debe cumplir la base de datos con un índice único parcial sobre `estado = 'abierta'` — no basta con impedirlo solo en pantalla. Esto cambia el diseño de §1: `obras_colectivas` suma `lugar_id` (siempre presente: el del evento si viene de uno, o el elegido directamente si es "aquí"), y dos índices únicos parciales (`evento_id` y `lugar_id`, ambos `where estado = 'abierta'`).
3. **La librería de QR la elige gestión de cambios:** `qrcode` (npm, MIT, sin servicios externos), generando el SVG en el servidor. Se usa hasta la Fase 4, no en esta Fase 1.

Gestión de cambios autorizó empezar la Fase 1 (datos y admin, sin dibujar) en esta misma rama, con estas condiciones: migración que solo añade y no se aplica sola (la aplica el gestor), sin avisos nuevos del Security Advisor (search_path fijo, sin políticas permisivas de más), «obra colectiva» como nombre en todo el texto visible, maquetación plana con los componentes de `ui/`.

## Fase 1, en pausa por orden del founder (2026-09-19: "le quedan pocos créditos y Pincel va al final")

Hecho y comiteado, verificado, sin push:

- **Migración** `supabase/migrations/20260919030000_obras_colectivas.sql`: tabla `obras_colectivas` (con `lugar_id`
  siempre presente — se agregó respecto al plan original, ver la firma del founder arriba —, `evento_id` opcional,
  `zona` puesta sola por un disparador desde el lugar, igual que `eventos_zona_del_lugar`), sus tres índices de
  claves foráneas, y los dos índices únicos parciales (`estado = 'abierta'` por `lugar_id` y por `evento_id`). RLS:
  lectura pública, alta y cambios de estado solo `es_admin()`. Sin función nueva más que el disparador de zona
  (`search_path = ''`, mismo patrón que las funciones ya endurecidas) — nada que debería sumar avisos al Security
  Advisor.
- **Pruebas** `supabase/tests/pg/obras-colectivas.test.mjs`: índices de FK, RLS de alta (anon y no-admin rechazados,
  admin crea), los dos índices únicos parciales (dos obras en el mismo lugar chocan; en lugares distintos no; mismo
  evento_id con distinto lugar_id también choca), terminar/reabrir (no-admin no puede, admin sí, reabrir puede
  chocar con el índice si mientras tanto se abrió otra), lectura pública sin sesión. **Corrido contra un Postgres
  local real** (`npm run test:db` con `TEST_DATABASE_URL` a `127.0.0.1`, Postgres 17 de Homebrew levantado para
  esto): **687 pruebas, 0 fallaron** (las 686 que ya traía el repo más las nuevas de Pincel).
- **`src/lib/pincel.ts`** (+ `pincel.test.ts`, 4 pruebas en verde): `cierreSugeridoIso`, `cierreDesdeEvento`,
  `nombreSugerido` — lo puro de sugerir nombre y hora, sin base de datos.
- **`src/app/admin/obras-colectivas/`**: `consultas.ts` (listar obras, lugares para el formulario, cargar una),
  `acciones.ts` (`crearDesdeEvento`, `crearPorUbicacion`, `terminarObra`, `reabrirObra`, todas con su guarda de
  admin), `obras.module.css` (maquetación plana), `CrearObraAqui.tsx` (cliente: sugiere el lugar más cercano con
  `leerUbicacion()` + `distanciaKm()` — no `ordenarLugares()`, cuyo tipo exige campos de lugar que Pincel no
  necesita —, nombre y hora editables), `page.tsx` (lista + el formulario de arriba) y `[id]/page.tsx` +
  `AccionesObra.tsx` (detalle: lugar, cuándo cierra, estado, Terminar/Reabrir). **Sin Proyectar todavía** — la
  pantalla lo dice explícitamente ("La proyección y el mando en vivo llegan en la siguiente fase"), tal como pidió
  el gestor ("sin dibujar").
- Verificado hasta aquí: `npm run typecheck` en verde; `npx eslint` sobre los archivos nuevos, sin hallazgos;
  `npx vitest run src/lib/pincel.test.ts`, 4/4.

**Cierre de la Fase 1 (2026-09-21):**

1. **Hecho.** «Activar obra colectiva» en `src/app/eventos/[id]/page.tsx`: un renglón en el menú `···`, junto al de
   `esAdmin` que ya existía (mismo patrón que `cambiarVisibleEvento`), con un `form action={crearDesdeEvento.bind(null, e.id)}`.
   Texto «obra colectiva», no «Pincel» (condición del gestor al autorizar la Fase 1).
2. **Hecho.** Bloque propio «Obras colectivas» en `src/app/admin/page.tsx`, después de «Gestionar» (no encaja en
   `SECCIONES`/`renglonesGestionar()`, que es moderación, no alta), con `IconoPincel` (ya existía en `ui/Iconos.tsx`).
3. **Hecho.** Entrada de OL-088 en `docs/ops/OPEN_LOOPS.md` («Ahora» y «Last updated»).
4. **Hecho.** `npm run lint && npm run typecheck && npm test` (716/716, el completo) y `npm run build` en verde.
   Capturas a 390×844 de las cuatro pantallas (lista, formulario «Crear obra aquí», detalle, y las dos piezas nuevas
   de este cierre: el renglón del evento y el bloque de `/admin`) verificadas con `front-visual` contra un respaldo
   100 % local sin red (servidor de datos inventados en el scratchpad de la sesión, sesión admin con cookie
   fabricada, sin `.env` ni producción — patrón de la memoria del proyecto, bitácoras 075/076): **las cuatro se ven
   bien.** El navegador integrado no escribe la captura a disco, solo la muestra en la conversación; el gestor
   decidió (2026-09-21) que basta como verificación del operador y que él saca las capturas para el founder cuando
   haya vista previa del PR — **sin sumar Playwright/Puppeteer ni otra dependencia nueva** para guardarlas como PNG.
5. **Migración revisada por el gestor (2026-09-21), tres hallazgos corregidos** (todavía sin aplicar):
   - La función del disparador (`obras_colectivas_zona_del_lugar()`, `security definer`) se quedaba con el `EXECUTE`
     por defecto abierto a `public`/`anon`/`authenticated`; ahora `revoke`/`grant a service_role`, mismo patrón que
     `eventos_zona_del_lugar()` (migración `20260918130000_security_advisor.sql`).
   - La lectura pública (`using (true)`) dejaba ver por la API cualquier obra, también la de un lugar oculto/privado
     o un evento oculto. Nueva política `obras_colectivas: lectura según lo que enlaza`: pública solo si el lugar es
     visible y no privado y, si hay evento, el evento también es visible; administración lo ve todo. Esta tabla no
     guarda ninguna dirección reservada (eso vive en `eventos_sitio_privado`, con su propia RLS) — la pared solo
     necesita el id de la obra, su nombre y su estado, así que no hizo falta un caso especial para "sitio reservado".
   - Banco `supabase/tests/pg/obras-colectivas.test.mjs` ampliado con 10 comprobaciones negativas que faltaban: anon
     no inserta ni actualiza; una cuenta normal no termina ni reabre una obra ajena; nadie borra, tampoco un admin
     (sin policy for delete); un admin no puede insertar con `creado_por` de otra persona; la zona la sobrescribe el
     disparador aunque se mande otra explícita; anon no ve la obra de un lugar oculto ni de un evento oculto, y la
     administración sí. **698 pruebas en verde** contra Postgres 17 local (antes 688).
   - Menor: se quitó el `begin;`/`commit;` propio de la migración (solo 3 de 46 lo llevaban; `supabase db push` ya
     envuelve cada archivo).
   Sigue **sin aplicarse** — la revisa a fondo el gestor y la aplica con el founder.

Nada de lo pendiente tocó lo ya comiteado antes de esta ronda: son piezas nuevas o correcciones puntuales a la
migración y su banco, pedidas por el gestor. Fase 1 cerrada; no se empieza la Fase 2 sin su respuesta.

## Reanudación (2026-09-21): criterio de obras colectivas, doc 25

El founder firmó el 2026-09-21 (docs/rediseno/[25](../../rediseno/25-obras-colectivas-criterio.md)-obras-colectivas-criterio.md): Pincel es la primera obra colectiva, el motor no se construye todavía, se saca con la segunda obra. Cinco ajustes al plan de esta bitácora, aplicados antes de seguir con la Fase 1:

1. Columna `tipo` (text, default `'pincel'`) en `obras_colectivas`, sumada a la migración antes de aplicarla (`supabase/migrations/20260922090000_obras_colectivas.sql`).
2. Direcciones neutras `/obra/[id]/pared` y `/obra/[id]/mando` en vez de `/pincel/...` (§4 arriba, ya corregido; todavía sin código — son Fase 2).
3. Separación de archivos entre lo común y lo de Pincel, aplicada ya a lo que existe: `src/lib/obras-colectivas.ts` (cierre sugerido, común a cualquier obra) y `src/lib/pincel.ts` (nombre sugerido, propio de Pincel). La misma separación aplica cuando la Fase 2 sume canal en vivo/presencia/cercanía/sensores/imagen (común) frente a mando/mensaje/dibujo (Pincel) — sin SDK ni configuración abstracta.
4. Simulador chico de 20/50/100 mandos, anotado en la Fase 2 (§5 arriba) para medir el cupo real de Realtime antes de fijar la tasa de mensajes.
5. Migración renombrada de `20260919030000_obras_colectivas.sql` a `20260922090000_obras_colectivas.sql` (nombre dado por el gestor, posterior a `20260921100000_rol_de_entonces_en_listas.sql`, la última reservada). Esta línea es el apunte pedido por el doc 25 hacia este documento.

Este es el primer paso de la reanudación, entregado solo antes de seguir con lo pendiente de la Fase 1 (ver arriba). La migración sigue sin aplicarse — la aplica el gestor.

## Corrección de maquetación de «Crear obra aquí» (2026-09-21)

Publicada la Fase 1 (PR #119, `06f9d14`), el founder la probó en su iPhone y encontró un fallo, en sus palabras: «Solo vi que elementos de dentro de ficha "Crear obra aquí" como dropdown, input text y botón rebasan el margen de contenedor revisa maquetación otra vez». Rama nueva `pincel-crear-obra-maquetacion` desde `origin/main` (la rama `pincel-app` ya está unida y congelada).

**Causa medida** (no a ojo): `.form` en `src/app/admin/obras-colectivas/obras.module.css` es `display: grid` de una sola columna sin `grid-template-columns`. Sin esa propiedad, el navegador dimensiona la pista implícita al contenido más ancho de sus hijos; un hijo de rejilla tiene `min-width: auto` por defecto (no `0`), así que no se encoge para caber. El `<select>` de "Lugar" no envuelve su texto (a diferencia de un párrafo, que sí rompe línea en los espacios), así que con un nombre de lugar largo su ancho mínimo es el de todo el texto en una sola línea — eso ensancha la pista, y como el input, el select y el botón usan `width: 100%` (de esa misma pista ensanchada), los tres se salen del contenedor por igual. `.hora` (flex) tenía el mismo riesgo en teoría, sin confirmarse con datos reales porque sus hijos ("Cierra a las" + el chip de hora) son cortos.

**Cómo se midió:** un repro HTML aparte (`repro.html`, scratchpad de la sesión, no entra al repo) con las clases reales de `obras.module.css`, `Campo.module.css`, `Limpiar.module.css`, `Chip.module.css` y `Boton.module.css` (mismas reglas, sin el hash de CSS Modules) dentro de contenedores de ancho fijo 320/375/390 px — más confiable que emular el viewport del navegador de la sesión (que no reflejaba el ancho pedido en `window.innerWidth` en este entorno). Datos al tope: nombre de lugar de 78 caracteres (el caso real que vio el founder) y nombre de obra a 120 (el `maxLength` real). Medido con `getBoundingClientRect()` de cada hijo contra el contenedor y `scrollWidth` del contenedor:

| | 320 px | 375 px | 390 px |
|---|---|---|---|
| **Antes** — `select`/`input`/`botón`, borde derecho | 635 px (rebasa 315) | 635 px (rebasa 260) | 635 px (rebasa 245) |
| **Antes** — ¿hay desborde horizontal? | Sí | Sí | Sí |
| **Después** — borde derecho de todos los hijos | 287–320 px (dentro) | 342–375 px (dentro) | 357–390 px (dentro) |
| **Después** — ¿hay desborde horizontal? | No | No | No |

El número "635" no cambia con el ancho de prueba porque la causa no depende del viewport: depende del contenido más ancho del formulario, que es constante.

**Arreglo** (`obras.module.css`, el único archivo que cambia): `grid-template-columns: minmax(0, 1fr)` y `min-width: 0` en `.form`; `min-width: 0` en `.campo`; `width: 100%; min-width: 0; text-overflow: ellipsis` en `.campo > select` (antes no tenía ancho propio, solo heredaba el de la pista); `flex-wrap: wrap; min-width: 0` en `.hora`, defensivo aunque no se midió un caso real que lo rompa. `Campo.module.css`, `Limpiar.module.css`, `Chip.module.css` y `Boton.module.css` no se tocaron: sus controles ya tenían `width: 100%`, y el problema estaba en la pista que los contenía, no en ellos. No se adoptó el canon de formulario (`ui/FormularioCanon.module.css`) para este campo: ese canon no tiene un patrón de `<select>` con lista larga (usa chips para listas cortas); adoptarlo aquí habría significado rediseñar el selector de lugar, fuera del alcance de una corrección de maquetación.

**Las otras tres pantallas de la Fase 1**, con el mismo criterio y datos al tope (lugar de 60 caracteres, el tope real de `lugares.nombre`; nombre de obra a 120): la lista (`admin.module.css` `.tarjeta`/`.fila`) y el detalle (`obras.module.css` `.datos`/`.dato`) **no rebasan a 320/375/390** — sus textos van en `<b>`/`<small>` normales, que sí envuelven en los espacios (a diferencia del `<select>`, que no envuelve su valor), así que el mismo defecto arquitectónico no les aplica. No se tocaron. El renglón «Activar obra colectiva» en la ficha de evento reutiliza `ficha.menuItem` (ya en producción en otros renglones del mismo menú) y el bloque «Obras colectivas» en `/admin` reutiliza `admin.module.css` `.fila` (la misma clase que Personas/Lugares/Eventos/Artistas): ningún elemento nuevo, ningún riesgo nuevo.

**Verificado:** `npm run lint` (0 errores, 1 warning preexistente y ajeno), `npm run typecheck`, `npm test` (732/732), `npm run build`, todo en verde. Sin migración. Commit local, sin push. Entregado al gestor con los números de arriba.

## Fase 2, bloque 1: borrar obras y varias obras por lugar (2026-09-21)

El founder aprobó la Fase 1 y pidió dos cosas más («si apruebo fase 1 de pincel y confirmo. Permite borrado de obras colectivas además considera que un lugar puede abrir nuevas obras colectivas por favor. Que pueden distinguirse por la fecha/hora», ya en OPEN_LOOPS «Decidido»). El gestor autorizó la Fase 2 en cuanto se aceptó la corrección de maquetación de arriba y encargó estas dos piezas chicas primero, en rama nueva `pincel-fase-2` (desde `pincel-crear-obra-maquetacion`, para no chocar con esa corrección todavía sin fusionar a `main`).

**1. Borrar una obra cerrada.** Cambia lo firmado el 2026-09-19 («nadie borra»). Migración `supabase/migrations/20260922120000_obras_colectivas_borrado.sql` (nombre reservado, sin aplicar):
- `obras_colectivas: borra solo admin y cerrada` — `for delete to authenticated using (public.es_admin() and estado = 'cerrada')`. Una obra abierta se termina primero.
- `fotos: obras solo admin` — nueva policy de `delete` en `storage.objects` para la carpeta `fotos/obras/…` (la imagen final, cuando exista): las policies de `fotos` de hoy solo cubren `perfiles`/`lugares`/`artistas` con la segunda carpeta igual al uid de quien escribe, y una obra no tiene dueño personal.
- `borrarObra(id)` en `acciones.ts`: lee `imagen_final` antes de borrar la fila; si la fila se borró y tenía imagen, intenta borrarla del bucket (mejor esfuerzo — hoy `imagen_final` siempre es null, nadie sube ahí todavía, así que esta rama no se ejercita hasta la pared de la Fase 2; queda lista para entonces). Mismo patrón de `borrarEvento` (redirect con `?error=borrar`, sin estado de error propio en `Borrar`).
- Pantalla: se reutiliza el componente canon `components/Borrar.tsx` (el mismo de eventos/lugares/artistas) en el detalle de una obra cerrada, sumando `obra: IconoPincel` a su mapa de iconos — sin escribir una hoja de confirmación propia. Aviso: «Se borra la obra y su imagen final, si la tiene. No se puede deshacer.»
- Banco `obras-colectivas.test.mjs`: anon y cuenta normal no borran (ni abierta ni cerrada); admin no borra una abierta; admin borra una cerrada y ya no está; misma matriz para el borrado en `storage.objects`. **705 pruebas en verde** contra Postgres 17 local (antes 698; suma las 7 de este bloque más las que trajo `main` entretanto).

**2. Varias obras por lugar, distinguidas por fecha y hora.** La base ya lo permitía (los índices únicos solo cubren `estado = 'abierta'`): cerrada una obra, el lugar abre otra sin tocar código. Comprobado con una prueba explícita en el mismo banco (cerrar → crear otra en el mismo lugar → éxito; dos abiertas a la vez → 23505, ya existía). Lo que sí faltaba:
- `cargarObras()`: ahora trae `creado_en`/`zona` y ordena `estado` (abierta primero) y luego `creado_en desc` — «lo activo arriba», igual que el resto del panel.
- Lista (`page.tsx`): la línea de cada obra suma la fecha con `formatearCuando(o.creadoEn, …)` («Centro de las Artes · Abierta · Hoy · 13:47»).
- Detalle (`[id]/page.tsx`): renglón «Creada» siempre, y «Cerrada» en vez de «Cierra» cuando ya cerró (con `formatearLargo`, mismo patrón que ya usaba «Cierra»).
- `nombreSugerido()` no fuerza nombres distintos (revisado, sin cambios): dos obras del mismo lugar pueden llamarse igual, la fecha ya las distingue.

**Comprobación medida de maquetación** (pedido explícito del gestor en toda pantalla nueva): repro HTML con las clases reales de `admin.module.css` (`.fila`) y `obras.module.css` (`.dato`), lugar de 60 caracteres y la línea de fecha añadida, a 320/375/390 px — **sin desborde en ninguno**: el texto de `<small>`/`<b>` envuelve en los espacios, y la nueva `Borrar` (hoja `display: grid` sin `grid-template-columns`, igual que el bug de arriba) no corre riesgo porque ninguno de sus hijos usa `width: 100%` de esa pista ni tiene contenido sin espacios que pueda ensancharla (icono fijo, título corto, párrafo con `max-width: 32ch`, botones de ancho propio) — ya en producción sin este bug para eventos/lugares/artistas.

**Hallazgo pedido por el gestor: por qué el respaldo local con sesión falsa dejó de funcionar.** Causa confirmada con el respaldo instrumentado (log de método+ruta): el respaldo rechazaba con 405 **cualquier** método que no fuera GET/HEAD, pero `POST /auth/v1/token?grant_type=refresh_token` (el refresco de sesión de `@supabase/ssr`) y `POST /rest/v1/rpc/*` (así llama PostgREST a cualquier RPC, también las de solo lectura) también van por POST. El 405 al refresco hace que el cliente trate la sesión como inválida y borre la cookie sola — no es un cambio de esta rama ni de main, es un defecto del propio respaldo (documentado en la memoria del proyecto, bitácoras 075/076, que no cubría este caso). Corregido en el respaldo de esta sesión: `POST /auth/v1/token` contesta una sesión renovada con el mismo id de administrador, `GET /auth/v1/settings` contesta algo mínimo, y solo se rechazan con 405 las escrituras de verdad (`insert`/`update`/`delete` sobre una tabla), no cualquier POST. Verificado de nuevo con el navegador integrado: la sesión ya se mantiene, y las cuatro pantallas de este bloque (lista con las dos obras, detalle con Creada/Cerrada, la hoja «¿Borrar la obra?», y el selector de lugar con elipsis) se ven bien a 390×844. El código del respaldo vive solo en el scratchpad de esta sesión (no en el repo, no es parte de la app); si otro operador vuelve a montar uno igual, debe permitir esos dos casos.

**Verificado:** `npm run lint` (0 errores, 1 warning preexistente y ajeno), `npm run typecheck`, `npm test` (732/732), `npm run build`, todo en verde; `npm run test:db` contra Postgres 17 local, 705/705. Migración `20260922120000_obras_colectivas_borrado.sql` **sin aplicar** — la aplica el gestor. Rama `pincel-fase-2`, commit local, sin push.

## Fase 2, bloque 2: el canal en vivo y su mensaje, más el simulador de mandos (2026-09-21, en curso)

Rama `pincel-fase-2-canal` (desde `pincel-fase-2`). El gestor pidió partir el bloque 2 así: primero medir el cupo real de Realtime antes de construir pared y mando, para no arriesgar retrabajo.

**Hecho — el canal y el mensaje, sin tocar producción:**
- `src/lib/canal-obra.ts` (**común**, doc [25](../../rediseno/25-obras-colectivas-criterio.md) ajuste 3): `nombreCanalObra(obraId)` → `"obra:<id>"`, y `abrirCanalObra(supabase, obraId)` que abre ese canal con `private: true` (RLS sobre `realtime.messages`, exige sesión — cumple "solo cuentas registradas" del doc de Fase 0 §2).
- `src/lib/pincel.ts` (**propio**): `MensajeTrazo` (`{ trazo, color, dx, dy }`, delta del sensor, no coordenada absoluta), los cuatro trazos y las cinco tintas **del prototipo firmado** (OL-084, bitácora 118, `experiments/pincel-prototipo/core.mjs` en la rama local `codex/pincel-prototipo`) — no se inventan de nuevo —, `EVENTO_TRAZO` (el nombre del evento de Broadcast) y `esMensajeTrazoValido()` (la pared no confía en el payload de otro cliente sin mirarlo: trazo y color de la lista cerrada, `dx`/`dy` numéricos y dentro de -1..1). 9 pruebas nuevas (`pincel.test.ts`, `canal-obra.test.ts`).

**Hecho — el simulador, listo pero sin correr:** `scripts/pincel/simulador-mandos.mjs` (doc [25](../../rediseno/25-obras-colectivas-criterio.md) ajuste 4). Abre N canales "mando" (conexiones independientes, una por `createClient()`) que mandan mensajes al azar a una tasa fija, y un canal "pared" que solo escucha y cuenta lo que llega, con su latencia. Tandas 20/50/100 por defecto, configurables. No escribe en ninguna tabla — Broadcast no toca la base — y el nombre del canal por defecto lleva "prueba" para que sea obvio en cualquier panel de Supabase que lo vea mientras corre.

**Por qué no corrió todavía contra el proyecto real.** El simulador necesita `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` del proyecto real (la llave anónima es pública por diseño de Supabase — va en el navegador de cualquier visitante —, no es un secreto como la de servicio). No los tengo en este árbol (regla del proyecto: el `.env` real nunca entra a la carpeta del operador) y no los pedí todavía: **el gestor debe decir cuánto tráfico va a generar la corrida y dar su visto bueno antes**, así que ese cálculo y la petición van en la entrega al gestor, no aquí. Con los valores por defecto del script (9 Hz, 20 s por tanda, pausa de 5 s entre tandas): ~30 600 mensajes de Broadcast en total, pico de 101 conexiones simultáneas (100 mandos + la pared) durante la tanda de 100, poco más de 1 minuto y medio de reloj en total. Ninguna tabla se toca.

**Aparte, por `private: true`:** el canal de verdad exige sesión, y no hay manera de fabricar aquí N sesiones reales de cuentas distintas sin la llave de servicio (que este árbol tampoco tiene). El simulador por defecto corre **sin** `private: true` (mide el cupo bruto del servicio — conexiones y mensajes por segundo —, que es el dato que decide la tasa y el límite de participantes) y admite `--privado --token <jwt>` para medir también el costo de RLS en `realtime.messages` con una sola sesión real repetida en las N conexiones, si el gestor prefiere esa medida también.

**Verificado (código, sin la corrida real):** `npm run lint` (0 errores, 1 warning preexistente ajeno), `npm run typecheck`, `npm test` (740/740), `npm run build`, todo en verde. Sin migración, sin tocar pantallas (este bloque no construye la pared ni el mando, llegan en el bloque 3). Commit local, sin push. **Bloqueado en la corrida real hasta la respuesta del gestor** con el visto bueno y cómo prefiere darme acceso a la URL/llave anónima del proyecto.

## Verificación de este documento


Sin código: no aplica build/lint/tests. Se verificó que:
- `docs/ops/ASIGNACIONES.md:17` da la rama, OL y bitácora exactos usados aquí.
- Cada afirmación sobre lo que el repo ya tiene (§"Lo que el repo ya tiene") se comprobó leyendo el archivo citado en esta misma rama `pincel-app` (commit `5d10368`), no de memoria.
- `git status --short` en el worktree solo muestra este archivo nuevo.
