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

## Fase 2, bloque 2: cupo real citado, envío agrupado y plan de corrida ajustado (2026-09-21)

El gestor devolvió el bloque 2: mis valores por defecto (9 Hz por mando) ya rebasaban el cupo desde la primera tanda, así que no habrían medido nada útil. Tres correcciones, antes de pedir la corrida real otra vez.

**1. El cupo real, citado con su fuente** (no se daba por hecho): [Realtime Limits](https://supabase.com/docs/guides/realtime/limits) y [Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing), documentación oficial de Supabase, leída el 2026-09-21. **Plan gratuito** (el que usa este proyecto, sin verificarlo yo mismo en el panel — el gestor lo asumía y la cifra de conexiones coincide con lo que citó):

| Límite | Plan gratuito |
|---|---|
| Conexiones simultáneas | 200 |
| Mensajes por segundo | **100** (promedio móvil sobre el minuto anterior) |
| Tamaño máximo de un mensaje | 256 KB |
| Mensajes incluidos al mes | 2 000 000, sin cobro por pasarse |

Con esto, 20 mandos a 9 Hz (mi plan original) ya eran 180 mensajes/s — casi el doble del cupo, desde la primera tanda. Confirmado el cálculo del gestor.

**2. Envío agrupado, no un mensaje por muestra.** `MensajeTrazo` cambia de `{ trazo, color, dx, dy }` a `{ trazo, color, deltas: Delta[] }` (`src/lib/pincel.ts`): el teléfono sigue muestreando el sensor a su ritmo mientras el botón está presionado, pero solo *manda* `MENSAJES_POR_SEGUNDO = 3` veces por segundo, cada uno con los deltas juntados desde el mensaje anterior (tope `DELTAS_MAX_POR_MENSAJE = 20`, y es también lo que exige `esMensajeTrazoValido` contra un mensaje fabricado a mano con miles de deltas). La pared dibuja todos los deltas de un mismo mensaje seguidos: se ve igual de fluido, cuesta una fracción de los mensajes. 6 pruebas nuevas/ajustadas (12 en total en `pincel.test.ts`).

**Participantes que caben, con el cupo citado:** `100 mensajes/s ÷ 3 mensajes/s por mando ≈ 33 mandos` a la vez en el plan gratuito, antes de tocar el límite documentado — número teórico, a confirmar (o ajustar) con la corrida real, que es justo lo que mide.

**3. Plan de corrida escalonado y corto**, reescrito en `scripts/pincel/simulador-mandos.mjs` con los números exactos que dio el gestor: tandas de 10 s con pausa de 10 s entre cada una, **subiendo** hasta encontrar el límite en vez de empezar encima de él:

| Tanda | Mandos × Hz | Mensajes/s objetivo | Mensajes en 10 s |
|---|---|---|---|
| 1 | 10 × 2 | 20 | 200 |
| 2 | 20 × 2 | 40 | 400 |
| 3 | 40 × 2 | 80 | 800 |
| 4 | 60 × 2 | 120 (ya sobre el cupo de 100/s) | 1 200 |

**Tráfico total si las cuatro tandas corrieran completas: 2 600 mensajes de Broadcast** (200+400+800+1200), pico de 61 conexiones simultáneas (60 mandos + la pared), 3×10 s de pausas + 4×10 s de tandas ≈ 70 s de reloj — muy por debajo de los 200/100 del cupo citado, así que no debería llegar a esa cifra completa: se espera que se **detenga sola antes**, en la tanda 3 o 4, que es el punto de la prueba. El script comprueba, al final de cada tanda, errores de conexión, fallos al mandar (el `ack` de Broadcast no confirma) y el porcentaje de mensajes que la pared no recibió; si pasa el 5 % de pérdida o hay cualquier error, **no corre la siguiente tanda**.

**Llaves:** el script ya no pide `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` por variable de entorno — las lee directo de `/Users/apple-1/somosnosotros/.env` (la ruta del proyecto principal) dentro del propio proceso, con una función que solo copia esas dos líneas a variables locales (comprobado en aislado con un archivo de prueba: nunca toca `SUPABASE_SERVICE_ROLE_KEY` ni ninguna otra variable de ese archivo). Nunca se imprimen, nunca se guardan, nunca se piden por el chat.

**Canal:** `prueba-cupo-<fecha>-<sufijo>`, sin `private`. Comprobado con `grep -rn "\.channel(\|realtime\." src` (fuera de `canal-obra.ts` y sus pruebas): **la app en producción no usa Realtime en ningún otro sitio hoy** — ninguna suscripción a canales ni a cambios de tablas — así que una corrida que llegue al cupo no compite con nadie usando la app en ese momento.

**Verificado:** `npm run lint` (0 errores, 1 warning ajeno), `npm run typecheck`, `npm test` (745/745), todo en verde. Sigue **sin correr** contra el proyecto real — el plan ajustado y los números van al gestor, que se los lleva al founder (la corrida la autoriza el founder, no yo). Commit local, sin push.

## Fase 2, bloque 2: corrida de cupo contra producción (2026-09-21)

El founder autorizó la corrida («corre la prueba de pincel», al gestor). Corrida al pie de la letra: `node scripts/pincel/simulador-mandos.mjs`, canal `prueba-cupo-2026-09-21-zv4z`, sin `private`, llaves leídas de `/Users/apple-1/somosnosotros/.env` dentro del proceso (nunca impresas). Una sola vez.

**Lo que pasó:** la tanda 1 (10 mandos × 2 Hz, 20 mensajes/s objetivo) corrió limpia — 190 mandados, 190 recibidos por la pared, **0 % de pérdida**, latencia mediana 65 ms, p95 279 ms, 10/10 conexiones logradas. Pero el script se detuvo solo después de esa tanda, reportando "10 errores de conexión" que no eran reales.

**Causa medida del falso freno** (no a ojo): el candado de conexión de cada mando (`canal.subscribe((estado) => …)`) seguía escuchando después de resolver la promesa de "ya conectado". Al terminar la tanda, `unsubscribe()` dispara el estado `CLOSED` en cada canal — un cierre ordenado, no un fallo —, y como el candado no lo ignoraba, cada cierre normal se contaba otra vez como error de conexión. Con eso, la condición de frenado (`erroresDeConexion > 0`) se disparó sola aunque la tanda había sido perfecta. Corregido en `scripts/pincel/simulador-mandos.mjs`: un candado (`resuelto`) que ignora cualquier cambio de estado después del primero — así el cierre al final de una tanda ya no cuenta como error. **No volví a correr la prueba** (la instrucción fue "si algo se sale del plan… no la repitas: me reportas"): el arreglo queda listo para la siguiente corrida autorizada, que ahora sí debería subir hasta encontrar el límite real en vez de frenar en el primer escalón.

**Entrega al gestor** (mensajes enviados/recibidos, conexiones máximas, latencia mediana/p95, pérdidas, errores y mi lectura): ver el mensaje de esta sesión con esos números; la tabla completa y el resumen agregado quedaron en la salida de la terminal, no se guardó un archivo aparte.

**Mi lectura, con los datos de esta única tanda limpia:** a 20 mensajes/s (20 % del cupo citado de 100/s) la entrega fue perfecta y la latencia baja — hay holgura de sobra ahí. No alcanza para decir "cuántos mandos caben con holgura" de verdad: esa respuesta necesita ver dónde empieza a degradarse de verdad (tandas 2, 3 y 4, hasta 120 mensajes/s), que es justo lo que el bug cortó. El número teórico de ~33 mandos (§ del bloque 2 de arriba, con el envío agrupado a 3 mensajes/s) sigue sin confirmarse ni descartarse.

**Verificado:** `node --check` y `npx eslint` sobre el script corregido, limpio. No se corrió `npm test`/`typecheck`/`build` para este cambio puntual del script (no toca código de la app, solo el simulador) — se corre la batería completa al cerrar el bloque. Commit local del arreglo, sin push. Espero instrucción del gestor: ¿autoriza una segunda corrida corta con el arreglo, o esta primera tanda limpia basta por ahora?

## Fase 2, bloque 2: prueba del candado, segundo freno revisado, plan de la segunda corrida (2026-09-21)

El gestor pidió tres cosas antes de la segunda corrida, sin tocar producción.

**1. Prueba del arreglo del candado, en local, sin producción.** `conectarCanal()` (la conexión de un mando o de la pared) se sacó a su propia función exportada, con un canal simulado (`subscribe(cb)` que dispara una secuencia de estados a mano) en `scripts/pincel/simulador-mandos.test.ts`, nuevo banco. Confirmado: `SUBSCRIBED` seguido de `CLOSED` (el caso real del bug) resuelve `{ ok: true }` y el `CLOSED` tardío se ignora; un `CLOSED`/`CHANNEL_ERROR`/`TIMED_OUT` que llega ANTES de `SUBSCRIBED` sí cuenta como fallo real (nunca llegó a abrir); la promesa solo resuelve una vez aunque lleguen varios estados seguidos. 11 pruebas en verde.

**2. Otro freno revisado: mensajes en vuelo al cortar.** El gestor tenía razón en sospecharlo: la tanda esperaba solo 1 s extra después del último envío antes de medir la pérdida y desconectar — con una p95 medida de 279 ms en la tanda 1, ese segundo bastaba de sobra ahí, pero a tandas más cargadas (o con más latencia real) un mensaje mandado justo antes de cortar podía llegar después de medir, contando como "perdido" sin haberlo estado. Subido a 2 s (`MARGEN_TRAS_ULTIMO_ENVIO_MS`). Además, `conectarCanal()` suma una red de seguridad que no existía: un `timeoutMs` (8 s) para que la corrida no se cuelgue para siempre si algún canal nunca manda ningún estado — antes no había ningún tope y una conexión muda habría bloqueado la tanda sin fin.

**3. Plan exacto de la segunda corrida**, con `node scripts/pincel/simulador-mandos.mjs --tandas-desde 2` (opción nueva, para no repetir la tanda 1, ya limpia y medida): empieza en la tanda 2, sube hasta la 4 o hasta que se detenga sola.

| Tanda | Mandos × Hz | Mensajes/s objetivo | Mensajes en 10 s | Conexiones |
|---|---|---|---|---|
| 2 | 20 × 2 | 40 | 400 | 21 |
| 3 | 40 × 2 | 80 | 800 | 41 |
| 4 | 60 × 2 | 120 (sobre el cupo de 100/s) | 1 200 | 61 |

Si las tres corrieran completas: **2 400 mensajes**, pico de **61 conexiones**, duración ≈ 3×10 s de tandas + 3×2 s de margen + 2×10 s de pausas entre ellas ≈ 56 s. Sumado a los 190 mensajes de la tanda 1 (ya corrida): **2 590 mensajes en total entre las dos corridas**, dentro del tope de 2 600 que fijó el gestor. Se espera, otra vez, que se detenga sola antes de llegar a la tanda 4 (120 mensajes/s ya pasa el cupo citado de 100/s) — ese es el punto de la prueba.

**Verificado:** `npm run lint` (0 errores, 1 warning ajeno), `npm run typecheck`, `npm test` (756/756, con las 11 pruebas nuevas de `conectarCanal`/`percentil`), `npm run build`, todo en verde. Sin migración, sin correr contra producción — el plan va al gestor para su aprobación (y la segunda autorización del founder, que decide él, no yo). Commit local, sin push.

## Fase 2, bloque 2: cómo se lee el resultado, antes de la segunda corrida (2026-09-21)

El gestor aceptó el plan y el código; falta el sí del founder para la corrida. Mientras tanto, adelanto por escrito cómo se lee el resultado, para no improvisarlo en caliente cuando lleguen los números.

**Los tres umbrales que ya existen en el script, y por qué no bastan solos para decir "caben con holgura":**
- El freno automático (`UMBRAL_PERDIDA = 0.05`, cualquier error) es la línea de "esto ya se rompió, para la corrida" — no la línea de "esto va bien". Una tanda puede pasar ese freno (0 errores, 4 % de pérdida) y aun así no ser un número prudente para producción: 4 % de trazos perdidos sí se nota en una pared pintada por 30 personas.
- La latencia no tiene freno propio hoy (el script no para por latencia alta, solo la reporta). Hace falta un criterio aparte para leerla.

**Criterio propuesto para "caben N mandos con holgura"** (a confirmar o ajustar por el gestor/founder antes de leer los números reales):

| Lectura | Pérdida | Latencia p95 | Qué significa |
|---|---|---|---|
| **Con holgura** | ≤ 1 % | ≤ 800 ms | Recomendable como tope de producción; deja margen para una noche real (picos de red, teléfonos viejos) sin degradarse |
| **Al límite** | > 1 % y ≤ 5 % | > 800 ms y ≤ 2 000 ms | Funciona, pero sin margen — no es el número que se fija como tope, es la frontera |
| **Pasado el cupo** | > 5 % o cualquier error | > 2 000 ms | Ya no sirve para pintar junto; es donde el script ya se detiene solo (salvo el caso nuevo de solo latencia alta sin pérdida, que el script no frena todavía) |

**De dónde salen los números:** 800 ms de p95 es aproximadamente 3× la p95 real medida en la tanda 1 (279 ms, con muy poca carga) — un margen generoso antes de que el trazo se sienta "atrasado" en la pared, sin ser tan laxo como para aceptar un segundo entero de retraso. 2 000 ms es donde cualquier interacción deja de sentirse en vivo (referencia general de UX para "tiempo de respuesta", no un número propio de Supabase). 1 % de pérdida es más estricto que el 5 % del freno automático porque "sigue corriendo" y "es un buen número para producción" son preguntas distintas: el freno protege la prueba, este criterio protege la experiencia real de quien pinta.

**Cómo se aplica a la corrida 2:** la tanda más alta (de la 2, 3 o 4) que caiga en la fila **"Con holgura"** es el número que se propone para `MENSAJES_POR_SEGUNDO` y el límite de participantes de producción; si ninguna tanda pasada la 1 cae ahí, el número que ofrece la Fase 2 es el de la tanda 1 (20 mensajes/s agregados, con `MENSAJES_POR_SEGUNDO = 3` eso son ~6-7 mandos) hasta correr una prueba más fina entre esa y la siguiente. El número teórico de ~33 mandos (§ del bloque 2 de arriba) es una referencia, no la respuesta — la respuesta la da la corrida.

Sin código nuevo: esto es lectura del resultado, no cambia el script. Sigo sin correr contra producción.

## Decisión del founder: sin segunda corrida, cupo por obra y fila de espera (2026-09-21)

El founder decidió, con el gestor: **no hay segunda corrida** — se sigue con lo medido en la tanda 1 (190/190, 0 % de pérdida, p95 279 ms, 10 mandos × 2 Hz = 20 mensajes/s). Sus palabras: «Continua pincel con la información de esta corrida […] podríamos limitar usuarios por actividad, agregando un campo en admin, tener fila de espera hace que los usuarios se interesen y se enganchen […] que los que no alcanzan cupo si se puedan conectar pero su control aparezca en espera para que alguien salga.» Dos piezas nuevas para el bloque 3, con **prototipo antes que código** (lo firma el founder en el chat del gestor). Nada de esto es código todavía — es el plan corto que pidió el gestor antes de tocar nada.

### 1. Cupo de mandos por obra

Un campo en Administración (crear/editar obra), con valor por defecto prudente y un tope duro:

- **Por defecto: 10 mandos pintando a la vez.** Es exactamente lo medido y limpio (tanda 1: 190/190, 0 % de pérdida) — no una extrapolación.
- **Tope duro propuesto: 20 mandos.** Con el envío agrupado (`MENSAJES_POR_SEGUNDO = 3`), 20 mandos son 60 mensajes/s de trazos — el 60 % del cupo citado (100 mensajes/s, plan gratuito). El 40 % que sobra es colchón para Presence (la fila de espera también manda mensajes, ver abajo) y para lo que la corrida 1 no llegó a medir: cómo se comporta la red real a más carga. El techo teórico sin colchón sería ~33 mandos (100 ÷ 3); no lo propongo como tope porque nunca se corrió una tanda con carga real por encima de 20 mensajes/s — el founder decidió no correrla, así que el tope duro se queda del lado conservador en vez de apostar a un número sin medir.
- **Migración, solo añade:** una columna en `obras_colectivas` (nombre lo da el gestor), `integer not null default 10 check (cupo_mandos between 1 and 20)`. Se manda el SQL al gestor antes de escribir nada más.

### 2. Fila de espera

**Cómo se sabe quién pinta y quién espera:** Realtime **Presence** en el mismo canal de la obra (`abrirCanalObra`, ya común): cada mando hace `track()` al conectar con su hora de llegada. El orden es por esa hora, con una segunda clave para desempatar (Presence da un `presence_ref` único por conexión) si dos llegan en el mismo milisegundo — sin eso, el orden podría no ser estable entre quien mira la pared y quien mira su mando. Los primeros `cupo_mandos` de esa lista pintan; el resto espera, con su posición = su lugar en la lista menos el cupo.

**El freno va también del lado de la pared, no solo en el botón del mando** (el gestor lo pidió explícito): un mando en espera podría, con un cliente modificado, seguir mandando `trazo` igual. Para que eso no pinte nada, cada mensaje de trazo necesita decir quién lo manda (un campo `remitente` con la clave de su propia Presence — no un nombre, ver más abajo), y **la pared descarta cualquier trazo cuyo remitente no esté hoy entre los primeros `cupo_mandos` de la lista de Presence que ella misma calcula** — no le basta con recibir el mensaje, tiene que cruzarlo contra su propia cuenta de quién pinta ahora mismo. Esto es un ajuste a `MensajeTrazo` (`src/lib/pincel.ts`) para el bloque 3, no del bloque 2 ya entregado.

**Recorte del founder (2026-09-21): fila SIMPLE, sin turno con tiempo máximo.** «Ok no traigamos complegidad por ahora, sin limite de turnos, sin tiempo máximo, que venga despúes.» Quien pinta sigue hasta que sale por su cuenta (cierra el mando o se va) o se le cae la conexión — nada lo mueve al final de la fila por quedarse quieto, aunque haya gente esperando. No se pregunta en el prototipo. **En «Después»:** un turno con tiempo máximo o una salida por inactividad, si con uso real hace falta.

**Qué pasa si se cae la conexión de quien pinta** (lo único que sí hay que resolver ahora, pedido explícito del gestor): Presence lo resuelve solo — al perder el WebSocket, su `track()` desaparece de la lista de todos los demás sin que nadie tenga que detectarlo a mano, y el siguiente en la fila sube un lugar automáticamente. **Cuánto tarda en la práctica:** el intervalo de latido (`heartbeat`) del cliente que ya trae instalado el proyecto es de **25 segundos** (`HEARTBEAT_INTERVAL` en `node_modules/@supabase/realtime-js`, revisado en el código real de esta rama, no en la documentación — la documentación de Presence no da un número). Si alguien cierra el mando o pierde la app con normalidad, Presence lo nota casi de inmediato (el cierre manda su propio aviso). Si la conexión se corta de golpe (se le acaba la batería, pierde señal sin avisar), el servidor no tiene forma de saberlo hasta que le falten uno o dos latidos — en la práctica, entre 25 y unos 50 segundos antes de que el lugar se libere solo. Esto no se mide con el simulador de la Fase 2 bloque 2 (ahí no hay Presence, solo Broadcast); es un número de la librería, no una medición propia — dejarlo dicho así en el prototipo, sin prometer un tiempo exacto.

**Qué pasa si dos llegan a la vez:** cubierto arriba (hora de llegada + `presence_ref` como desempate estable).

**Cupo de conexiones, no solo de mandos pintando:** quien espera sigue conectado (ve la pared, ve su lugar en la fila) aunque no mande trazos — **cuenta para el tope de 200 conexiones simultáneas** igual que quien pinta. Presence también manda mensajes propios (al entrar, al salir, y sus sincronizaciones) — no medidos todavía con el simulador (el simulador de la Fase 2 bloque 2 no abrió canales con Presence, solo Broadcast puro); antes de fijar un número de producción definitivo habría que estimarlo o medirlo aparte, y lo anoto como pendiente, no lo invento aquí.

### 3. Privacidad en la fila

Sin nombres. Solo número de lugar («vas el 3») para quien espera, y un conteo total («4 esperando») visible para todos — la misma regla que ya sigue el resto de la app (personas solo se cuentan, doc rediseno/24, grafo cultural).

### 4. Antes de tocar código

Prototipo (documento + HTML, sin lógica real) de las tres pantallas del mando — **pintando**, **en espera con su lugar**, **te toca** — y del campo de cupo en Administración, a 390×844, maquetación medida (rejillas con `minmax(0, 1fr)` desde el principio, no como corrección después; estilos del canon `ui/` antes que propios). Lo firma el founder en el chat del gestor antes de escribir una sola línea de la fila de espera.

**Mientras se firma:** puedo seguir con lo del bloque 3 que no depende de la fila — la pared y el mando pintando de verdad entre dos teléfonos (la prueba que ya definió la Fase 0 para esta fase), sin el cupo ni la fila todavía. Eso no toca producción ni pide una migración nueva de inmediato.

Sin código en este documento: es la anotación de la decisión y el plan corto que pidió el gestor. Se le manda por separado.

## Fase 2, bloque 3 (en paralelo): la pared y el mando pintando de verdad (2026-09-21)

Autorizado por el gestor a avanzar en paralelo mientras se firma el prototipo del cupo/fila (doc 34): lo que no depende de ella. Rutas neutras `/obra/[id]/pared` y `/obra/[id]/mando` (doc rediseno/25 ajuste 2), sin cupo ni fila todavía — cualquier cuenta con sesión pinta en una obra abierta.

**Lo nuevo en `src/lib/pincel.ts` (propio, puro, sin `<canvas>` ni React):**
- `MensajeTrazo` suma `remitente` (el id de perfil de quien pinta). Hace falta ya, antes de la fila: sin saber de quién es cada delta, la pared no puede seguir el trazo de cada persona por separado y los mezclaría en un pincel fantasma. No es una prueba de identidad — el canal ya exige sesión (`private: true`); esto solo distingue un trazo de otro, aceptado así a propósito.
- `puntoInicial(remitente, ancho, alto)`: un punto de arranque estable por remitente (mismo remitente, mismo inicio), para que el segundo mensaje de una persona siga desde donde se quedó el primero.
- `siguientesSegmentos(desde, deltas, ancho, alto)`: convierte los deltas de un mensaje en los segmentos a trazar, rebotando en los bordes del lienzo en vez de perderse fuera de la vista. `ESCALA_DELTA_PX = 24` (a ojo; ajustable si en la prueba con el founder se ve muy corto o muy largo).
- `deltaDesdeOrientacion(anterior, actual, sensibilidad)`: dos lecturas de `DeviceOrientationEvent` (beta/gamma) convertidas en un delta normalizado -1..1, no en la lectura absoluta.
- 18 pruebas nuevas (27 en total en `pincel.test.ts`).

**Lo común (`src/app/obra/consultas.ts`, nuevo, aparte de `admin/obras-colectivas/consultas.ts`):** `cargarObraParaPintar(id)` — lo que la pared y el mando necesitan de una obra, sin ser del panel de administración.

**La pared** (`src/app/obra/[id]/pared/`): pantalla completa, sin sesión — la RLS pública ya decide qué puede ver. Se suscribe al canal de la obra, valida cada mensaje con `esMensajeTrazoValido` antes de dibujar (no confía en el payload sin mirarlo), y dibuja con un estilo distinto por pincel: `trazo` una línea, `aire` gruesa y translúcida, `spray` gotas dispersas, `orgánico` manchas ovaladas. Si la obra ya cerró, un aviso fijo en vez del lienzo (sin intentar conectar).

**El mando** (`src/app/obra/[id]/mando/`): exige sesión (mismo patrón `redirect("/entrar?siguiente=…")` de siempre). El botón central pide permiso del sensor al primer toque (`DeviceOrientationEvent.requestPermission()`, exigido por Safari de iOS; Android no lo pide) y, mientras está presionado, junta los deltas del sensor y manda `MENSAJES_POR_SEGUNDO` mensajes por segundo (no uno por muestra). Trazo y tinta se eligen con los mismos cuatro/cinco del prototipo firmado. Sin permiso o sin sensor, un aviso en vez de fallar en silencio. Si la obra ya cerró, no se ofrece pintar.

**Maquetación medida, un bug real encontrado y corregido:** al verificar con el respaldo local a 390×844, el mando tenía **desborde horizontal real** (390 → 410 px, medido con `scrollWidth`/`clientWidth`, no a ojo). Causa: usé el componente canon `Barra` fuera de su contenedor `ficha.pagina` (que da el `--gutter` y compensa la sangría negativa que usa `Barra` para sangrar hasta el borde) — sin ese contenedor, la sangría se sale del viewport en vez de compensarse. Corregido envolviendo la página en `<main className={ficha.pagina}>`, como hace el resto de la app, y quitando el `padding` horizontal duplicado de `mando.module.css` (`ficha.pagina` ya lo pone). Verificado de nuevo: sin desborde horizontal, cabe justo en 844 px sin scroll. Las otras pantallas (pared abierta, pared/mando cerrados) verificadas igual, limpias.

**Qué queda pendiente, fuera de esta pieza:** el dibujo real solo se puede probar de verdad contra el proyecto real (Realtime no corre en local); esta sesión verificó que las pantallas cargan, se ven bien y no truenan con el respaldo local (que no tiene WebSocket, así que el lienzo queda en blanco ahí — esperado). La prueba de verdad («dos teléfonos, dos cuentas, pintan a la vez, el founder lo ve en vivo») la define la Fase 0 y la corre el founder cuando lo autorice. Sin QR todavía (Fase 4). Sin cupo ni fila (doc 34, espera firma).

**Verificado:** `npm run lint` (0 errores, 1 warning ajeno), `npm run typecheck`, `npm test` (771/771), `npm run build`, todo en verde. Sin migración. Rama `pincel-fase-2-canal`, commit local, sin push.

## Verificación de este documento


Sin código: no aplica build/lint/tests. Se verificó que:
- `docs/ops/ASIGNACIONES.md:17` da la rama, OL y bitácora exactos usados aquí.
- Cada afirmación sobre lo que el repo ya tiene (§"Lo que el repo ya tiene") se comprobó leyendo el archivo citado en esta misma rama `pincel-app` (commit `5d10368`), no de memoria.
- `git status --short` en el worktree solo muestra este archivo nuevo.

## Fase 2, bloque 3: revisión del gestor — RLS del canal, la pared exige sesión, evidencia real (2026-09-21)

El gestor revisó el commit `8c50952` y encontró dos huecos de fondo antes de aceptarlo, más pidió evidencia con PNG reales (no capturas a ojo).

**1. El canal privado no tenía política en `realtime.messages`.** `abrirCanalObra` usa `private: true` (`src/lib/canal-obra.ts`), y sin política en esa tabla Supabase rechaza la suscripción a todos, con sesión o sin ella — la corrida de cupo (bloque 2) se hizo con `private: false`, así que el canal privado real nunca se había probado. Propuse el SQL (dos políticas, select e insert, a `authenticated`, restringidas a `extension = 'broadcast'` y a que `realtime.topic()` sea el canal de una obra `abierta` y visible — mismo criterio que ya usa la política de lectura de `obras_colectivas`) y se lo mandé al gestor para que él lo escriba en el archivo de migración con el nombre que decida; no lo agregué yo a `supabase/migrations/`.

Lo probé en un banco Postgres local aparte (no el de `scripts/test-db.mjs`, para no tocar la infraestructura compartida con otros chats): migraciones reales aplicadas + un stub mínimo de `realtime.messages`/`realtime.topic()` + las dos políticas propuestas. Seis pruebas, todas con el resultado esperado:
- sin sesión (`anon`), obra abierta: **rechazado**.
- con sesión, obra abierta y visible: **permitido** (insert entra, se puede leer).
- con sesión, obra **cerrada**: **rechazado**.
- con sesión, obra en un **lugar oculto**: **rechazado**.
- una fila colada por `service_role` directo en un canal cerrado: `authenticated` **no la ve** (el bloqueo es real, no solo del insert).
- SQL propuesto: `/private/tmp/.../scratchpad/propuesta-canal-rls.sql` (ruta de esta sesión; el gestor tiene el texto en el mensaje que le mandé).

**2. La pared sin sesión no podría entrar a un canal privado.** `/obra/[id]/pared` se abría sin sesión, pero con la política de arriba la pared no recibiría nada (el `select` es solo para `authenticated`). El gestor dio dos caminos — (a) la pared también exige sesión (la abre el admin en la laptop o el cañón, con su cuenta), o (b) una política de `select` para `anon` sobre canales de obras abiertas (cualquiera con el enlace ve pintar en vivo) — y recomendó (a) por hoy, dejando (b) como decisión del founder para el doc 34 ("después"). Seguí esa recomendación: `src/app/obra/[id]/pared/page.tsx` ahora exige sesión igual que el mando (`redirect("/entrar?siguiente=/obra/[id]/pared")` si no hay cuenta), documentado en el propio archivo.

**3. Evidencia real, no a ojo.** Monté un respaldo local (`/private/tmp/.../scratchpad/respaldo-ol088.mjs`, fuera del repo) que además de Auth/REST de mentira habla un Realtime mínimo de verdad: acepta el `WebSocket` real de `realtime-js` en `/realtime/v1/websocket`, contesta el protocolo Phoenix (v2, marcos JSON crudos, sin librería) y tiene un endpoint de control (`/__inyectar`) para mandar trazos de mentira por el mismo canal que usa la app — así se ejercitó el código real (`esMensajeTrazoValido`, `puntoInicial`, `siguientesSegmentos`, `trazarSegmento`), no un dibujo simulado por fuera. Al depurar por qué no dibujaba encontré que era el propio validador rechazando en silencio colores que no eran un hex exacto de `TINTAS` (funcionando como debía; el error era mío, de la prueba).

PNG reales guardados (el respaldo los escribe a disco desde un `dataUrl` que manda el navegador, para no depender de copiar texto largo a mano):
- `pared-1280x800.png` — cuatro remitentes pintando a la vez, cada uno con su pincel y color, sin mezclarse (prueba `puntoInicial` por remitente).
- `pared-1920x1080.png` — mismo caso a la otra resolución que pidió el gestor.
- `mando-390x844.png` — capturado con un truco de DOM a SVG (fuente de reserva del navegador en vez de Bricolage Grotesque, y en el estado "sin permiso del sensor" de una interacción anterior en la misma sesión de prueba — ninguno de los dos es un defecto de la app). Confirma otra vez, con archivo real, lo ya medido con `scrollWidth`/`clientWidth`: sin desborde horizontal a 390 px.

Las tres rutas quedan en el scratchpad de esta sesión (`/private/tmp/claude-501/.../scratchpad/evidencia-ol088/`); se las mandé al gestor para que las abra. **Esto corrige lo que dije en la sección anterior** ("el respaldo local... no tiene WebSocket, así que el lienzo queda en blanco ahí — esperado"): con este respaldo ampliado sí se pudo probar el canal de verdad, incluida la RLS privada.

**Limpieza:** los parches de depuración que puse en `node_modules/@supabase/phoenix` (para rastrear por qué no dibujaba) se revirtieron reinstalando el paquete; `.env.local` borrado; `AGENTS.md` restaurado; el `next dev`/respaldo de esta prueba, apagados. Verificación completa otra vez: `npm run lint` (0 errores), `npm run typecheck`, `npm test` (771/771), todo en verde. Cambio de código de esta sección: solo `src/app/obra/[id]/pared/page.tsx`. Sin migración (el SQL de `realtime.messages` lo aplica el gestor). Rama `pincel-fase-2-canal`, commit local, sin push.

## El founder firma el doc 34: cupo y fila (2026-09-21)

El gestor avisa: el founder firmó el prototipo de cupo y fila («firmo Pincel», en su chat) — doc [34](../rediseno/34-pincel-cupo-y-fila.md) actualizado a **Estado: firmado**. Dos ajustes del propio gestor al construir, que no tocan el prototipo firmado (anotados también en el doc 34): en «te toca» el aviso se va solo a los pocos segundos y el mando queda activo de inmediato, sin un toque extra para empezar; el texto bajo el campo de cupo en Administración va sin jerga («Hasta 20, para que la pared responda al instante», nada de "plan de Supabase" ni cifras de mensajes por segundo de cara a quien administra).

**Orden de trabajo del gestor:** primero cerrar lo del bloque 3 que devolvió (ya hecho arriba: RLS propuesta, pared con sesión, PNG reales) sumando en el mismo SQL la columna de cupo (`cupo_mandos`) y la política de `presence` para la fila — una sola migración que solo añade, SQL completo mandado al gestor antes de escribirlo, él le pone nombre y la aplica. Después: el código de la fila (Presence, orden por llegada con desempate por `presence_ref`, la pared descarta trazos de quien no está pintando) y el campo de cupo en Administración — eso todavía no arranca en esta sesión.

**SQL completo mandado al gestor**, extendiendo el ya propuesto: agrega `presence` (mismas condiciones de obra abierta/visible que `broadcast`, ya que quien espera también necesita ver la fila) más `alter table obras_colectivas add column cupo_mandos smallint not null default 10 check (cupo_mandos between 1 and 20)` (tal cual lo pidió el gestor). Probado en el mismo banco Postgres local aparte: la columna nueva con su default y su tope; las políticas de `presence` con los mismos seis casos que ya pasaron `broadcast` (sin sesión rechaza, sesión+obra abierta/visible permite, obra cerrada rechaza, lugar oculto rechaza). Detalle del SQL y de las pruebas en el mensaje al gestor, no se repite aquí completo para no duplicarlo con lo que él va a aplicar.

Sin código de la fila ni del campo de Administración todavía — es la siguiente pieza, después de que el gestor aplique esta migración.

## Cupo y fila: el código, sin esperar a que se aplique la migración (2026-09-21)

El SQL ya se probó a fondo en un banco aparte (arriba); el código que lo usa se puede escribir ya, aunque la migración esté pendiente de que el gestor la aplique — mismo patrón que otras piezas de esta bitácora.

**Lógica pura, nueva en `src/lib/pincel.ts`** (20 pruebas nuevas, 38 en total en `pincel.test.ts`):
- `entradasDesdePresencia(estado)`: saca `{remitente, llegada, presenceRef}` de lo que da `RealtimeChannel.presenceState()`, por duck-typing (sin depender del tipo exacto de `@supabase/realtime-js`), descartando cualquier entrada que no traiga la forma esperada.
- `ordenDeFila(entradas)`: por hora de llegada; empate, por `presenceRef` (el que ya da Presence a cada conexión) — así la pared y cada mando ven el mismo orden.
- `quienesPintan(entradas, cupo)`: los remitentes de los primeros `cupo` de la fila. La usa también la pared.
- `estadoDeFila(entradas, cupo, remitente)`: `"pintando"`, `"esperando"` (con `lugar` y `esperando` = cuántos en total) o `"fuera"` (antes del primer sync de Presence).

**El mando** (`Mando.tsx`): además de suscribirse al canal, ahora hace `track({remitente, llegada: Date.now()})` en cuanto se confirma la suscripción, y escucha `presence sync` para recalcular su estado. Si `esperando`: el botón central y los selectores de trazo/tinta se reemplazan por la pantalla de espera del prototipo firmado (icono, «vas el N», cuántos esperan en total) — los selectores no desaparecen, se apagan (`aria-disabled`, sin puntero) para quien mire de reojo el cupo mientras espera. Al pasar de esperando a pintando, un aviso «Te toca pintar» se muestra 4 segundos y se va solo — el mando queda listo para pintar de inmediato, sin pedir un toque extra (ajuste del gestor). Antes del primer sync (`"fuera"`), se muestra la pantalla de pintar por defecto — mismo comportamiento que tenía el mando antes de esta pieza, así que nadie ve una pantalla nueva mientras Presence no ha dicho nada todavía.

**La pared** (`Pared.tsx`): también se suscribe a Presence del mismo canal (sin trackear su propia presencia, solo para leer quién pinta) y descarta cualquier trazo cuyo remitente no esté en `quienesPintan(...)` en ese momento — el freno del lado de la pared que pide el doc 34, para que un cliente modificado en la fila no pueda seguir mandando trazo de todos modos.

**Administración** (`CampoCupo.tsx`, nuevo): el contador +/- del prototipo firmado, de 1 a 20, en la ficha de la obra (solo si está abierta) — guarda al tocar +/-, sin un botón de "Guardar" aparte (`cambiarCupo(id, cupo)`, nueva acción de servidor, valida el mismo rango que exige la base). El texto bajo el campo ya sin jerga, como pidió el gestor: «Hasta 20, para que la pared responda al instante.» La ficha de la obra también enlaza ahora a «Abrir la pared» y «Abrir el mando» (antes decía «la proyección y el mando en vivo llegan en la siguiente fase», ya no es cierto) — sin QR todavía (Fase 4).

**Verificado con el respaldo local** (extendido para aceptar el PATCH del cupo y devolver `cupo_mandos`, `lugar` y las fechas que pide la ficha): el campo de cupo a 390×844 se ve igual al prototipo firmado, sin desborde (`scrollWidth`/`clientWidth` 390/390), y el botón "+" guarda de verdad (11 tras un toque, releído del propio respaldo). El mando, sin cambios visibles de regresión, también 390/390. **Lo que no se pudo verificar en este entorno:** las pantallas de "esperando" y "te toca" del mando, y que la pared de verdad descarte un trazo de fuera de cupo — Presence es un sub-protocolo de Phoenix aparte del broadcast que ya se probó (estado con CRDT calculado por el servidor), y el respaldo mínimo de esta sesión no lo implementa. La lógica que decide todo eso (`estadoDeFila`, `quienesPintan`) tiene sus 20 pruebas y el marcado JSX es una copia fiel del prototipo ya firmado y verificado visualmente en su entrega — pero la prueba visual de esas dos pantallas en concreto, con Presence de verdad, queda para cuando esto corra contra el proyecto real.

`npm run lint` (0 errores), `npm run typecheck`, `npm test` (782/782, 20 más que antes), `npm run build`: todo en verde. Sin migración nueva de código (la que ya se mandó sigue pendiente de que el gestor la aplique). Rama `pincel-fase-2-canal`, commit local, sin push.

## Migración escrita, causa real de las capturas malas encontrada y evidencia definitiva (2026-09-21)

El gestor aceptó el SQL tal cual (cuatro políticas, sin fusionar por `extension in (...)`) pero rechazó dos veces las capturas: primero por una fuente de reserva del navegador en vez de Bricolage Grotesque, después porque el intento de arreglo (cargar las hojas de estilo reales) tampoco sirvió — logotipo vacío, selectores con la altura mal, todavía sin la fuente real.

**La migración**, escrita tal cual el SQL ya probado: `supabase/migrations/20260922130000_pincel_canal_y_cupo.sql`. Sigue sin aplicar — la lee y la aplica el gestor.

**La causa real de las capturas malas** (no era el CSS, era la fuente): el truco de "DOM a SVG" (clonar `<html>`, inyectar el CSS real como texto y rasterizarlo con `<img src="data:image/svg+xml,...">`) tiene un límite real de los navegadores que no se documenta bien: cargar una imagen SVG por `<img>` **no espera a que terminen de cargar sus propios recursos externos** (como los archivos de fuente que carga un `@font-face`), así que rasteriza con lo que ya estaba listo en ese instante — casi siempre, sin la fuente. Encima, el CSS real de Next.js declara sus `@font-face` con rutas **relativas** (`url(../media/xxxx.woff2)`), que dentro de un documento `data:` no tienen de dónde resolverse — intenté arreglar eso reescribiendo las rutas a absolutas y el resultado fue idéntico byte a byte al anterior, confirmando que el problema no era la ruta: es que la técnica entera no espera fuentes externas, tenga la URL que tenga.

**La solución: dejar de rasterizar a mano y usar un navegador de verdad.** `playwright-core` (instalado solo en el scratchpad de esta sesión, `npm install --no-save`, nunca en el repo) apuntando al Google Chrome real de la Mac (`executablePath`, sin descargar un Chromium aparte) — abre la página, espera `document.fonts.ready` y la red en reposo, y `page.screenshot({ path })` escribe el PNG a disco directo, con la fuente, el CSS y el layout reales: cero trucos. Con sesión (la misma cookie falsa de siempre) y contra el mismo respaldo local de este árbol.

**Con esta técnica se encontró un bug real**, no del navegador: la pared, tras la pieza de cupo y fila, correctamente **descarta cualquier trazo de un remitente que no esté en su cuenta de `quienesPintan(...)`**; mi respaldo nunca simulaba Presence, así que para la pared *nadie* estaba pintando y descartaba los cuatro remitentes de prueba en silencio — el lienzo salía en blanco no por un error, sino porque el freno de cupo estaba haciendo exactamente lo que debe hacer. Arreglado sumando un endpoint de control al respaldo, `/__presencia`, que manda un `presence_state` de mentira con el protocolo real de Phoenix Presence (`phx_ref` en cada `meta`; `realtime-js` lo traduce solo a `presence_ref` al exponerlo) — así se ejercita el código real de la pared (`quienesPintan`, no un atajo).

**Evidencia definitiva, las seis capturas que pidió el gestor**, todas con Chrome real, sesión real, fuente y CSS reales, en `/private/tmp/claude-501/.../scratchpad/evidencia-ol088/`:
- `pared-1280x800.png` y `pared-1920x1080.png`: cuatro remitentes pintando a la vez sin mezclarse (con presencia de mentira vía `/__presencia` para que la pared los reconozca como "pintando").
- `mando-390x844.png`: pintando (estado por defecto).
- `mando-390x844-esperando.png`: cupo bajado a 3 (PATCH al respaldo) y presencia con 7 entradas, la propia en el 6º lugar — "vas el 3", "4 esperando", exactamente como calcula `estadoDeFila`.
- `mando-390x844-te-toca.png`: la misma sesión, tras un segundo `presence_state` que deja la cuenta propia dentro del cupo — el aviso «Te toca pintar» capturado mientras está visible (se va solo a los 4 s).
- `admin-cupo-390x844.png`: el campo de cupo en la ficha de la obra, con Chrome real.

`npm run lint && npm run typecheck && npm test` (782/782) `&& npm run build`: verde (sin cambios de código en esta sección, solo la migración y las herramientas de prueba fuera del repo). Rama `pincel-fase-2-canal`, commit local, sin push.

**Respuestas a las dos preguntas del gestor:**
1. El encargo nuevo del founder (directo en el chat, no por el gestor): grosor del trazo por arrastre en el mando — mantener presionado el punto y arrastrar el dedo arriba/abajo engruesa/adelgaza, el punto vuelve a su lugar al soltar. Como pidió el gestor, quedó en un commit aparte, en la rama `pincel-grosor` (desde este mismo HEAD), sin tocar `pincel-fase-2-canal`.
2. `AGENTS.md` no es mío: Next.js lo reescribe solo cada vez que corre `next dev`/`next build` (bloque "Generated AGENTS.md for AI agents"), igual que ya pasaba con `CLAUDE.md` en sesiones anteriores (ver memoria del proyecto). Nunca lo comiteo — `git checkout -- AGENTS.md` después de cada prueba, antes de cualquier commit. Si apareció modificado sin comitear fue un descuido de limpieza a media prueba, ya corregido; no tiene contenido propio que conservar.

## El mando, rechazado por el founder y rehecho calcando el prototipo firmado (2026-09-21)

El founder vio `mando-390x844.png` y dijo, literal: «ya se había acordado que eran selectores drop up que además iban a mostrar las formas de la punta del pincel.. aquí se ve destruida la interfaz». Tiene razón, y el error es mío: escribí los selectores de Trazo y Tinta como dos grupos planos de botones (`flex-wrap`), con `min-height: var(--toque-min)` cada uno, dentro de una fila de la rejilla que se estira (`minmax(0, 1fr)`) — todas las opciones visibles a la vez, estiradas a lo alto (unas 280 px), en dos columnas que se pisaban, sin control central. Lo vi en cada captura de esta sesión y no lo reconocí como error: lo tomé por "el selector". Nunca comparé contra lo firmado.

**Lo firmado, y lo que se calcó** (OL-084, commit `de48c0c` en `codex/pincel-prototipo`, `experiments/pincel-prototipo/public/app.js` + `style.css` + `core.mjs`, bitácora 118, ajuste del 2026-09-18 por pedido del founder): Trazo y Tinta son dos tarjetas cerradas de 105×84 px, una a cada lado del botón. Cerradas muestran lo elegido: la punta del pincel dibujada (curva, curva ancha y suave, puntos, manchas — los mismos trazos SVG de `brushSample`) en el color de la tinta, y el círculo del color con su nombre. Al tocar una se abre hacia arriba, sin tocar el botón, con cada opción de 52 px y su muestra; la elegida lleva borde; nunca las dos abiertas; al elegir se cierra y el foco vuelve a la tarjeta (se anuncia «Trazo: Spray», «Tinta: Violeta»). Pintar cierra el menú abierto. El botón conserva su zona inferior-media con espacio abajo para afianzar el pulgar (nota del founder, bitácora 118).

**Maquetación** (MEMORIA_GESTOR): una sola rejilla con áreas — `minmax(0,1fr) 128px minmax(0,1fr)`, filas `presente / espera / trazo·orb·tinta / hold`, `min-width: 0` en los hijos, sin envoltorios (`.centro` y `.herramientas` desaparecieron). El menú flota (`position: absolute; bottom: calc(100% + 30px)` sobre su tarjeta, que es `position: relative`), no empuja la rejilla. En «esperando» el bloque de espera ocupa su propia área y las dos tarjetas quedan deshabilitadas y cerradas; el botón no se dibuja.

**Medido con Chrome real** (playwright-core, `capturar-mando-selectores.mjs` en el scratchpad, cinco estados a 390×844): tarjetas 105×84 exactas; botón 128×128 con centro en y = 611 (el firmado del prototipo, ~603: 8 px más abajo por la Barra de la app en vez del «Salir» del prototipo); al abrir Trazo o Tinta, **ni el botón ni las tarjetas ni el texto cambian de posición ni de alto** (rects comparados antes/durante); el menú termina arriba del borde del botón; el de Tinta queda dentro del viewport (alineado a la derecha); nunca hay más de un menú en el DOM; tras elegir Spray el menú se cierra, la tarjeta anuncia «Trazo: Spray» y tiene el foco; en esperando las dos tarjetas están `disabled`; `scrollWidth`/`clientWidth` 390/390 en los cinco estados.

**Las capturas** (Chrome real, sesión real, fuente y CSS reales), en `…/scratchpad/evidencia-ol088/`: `mando-390x844.png` (reposo, pintando), `mando-390x844-trazo-abierto.png`, `mando-390x844-tinta-abierto.png`, `mando-390x844-esperando.png` (cupo 3, «vas el 3», «4 esperando»), `mando-390x844-te-toca.png`. Las de la pared (1280×800, 1920×1080) y la de Administración con el cupo son las ya aceptadas.

**Una línea para quien venga después:** rasterizar el DOM a SVG (`<img src="data:image/svg+xml…">`) NO espera a que carguen las fuentes externas del CSS — la captura sale con una fuente de reserva aunque `document.fonts.ready` diga que sí; para un PNG real usar `playwright-core` con el Chrome de la Mac (detalle en la memoria del proyecto, `reference-captura-png-real`).

**El grosor** (rama `pincel-grosor`, commit `a6da93d`) se rehace encima de este mando cuando el gestor acepte el bloque 3, como pidió.

`npm run typecheck && npm run lint` (0 errores) `&& npm test` (782/782) `&& npm run build`: verde. Sin migración. Rama `pincel-fase-2-canal`, commit local, sin push.

## Grosor del trazo por arrastre, rehecho sobre el mando firmado (2026-09-21, rama `pincel-grosor`)

El bloque 3 quedó aceptado con `8e8cc20` (PR #145, lo sube el gestor). El grosor que había empezado en `a6da93d` sobre el mando viejo se rehizo encima del mando nuevo — rama `pincel-grosor` recreada desde `8e8cc20` (el commit viejo queda como `pincel-grosor-viejo` por si hace falta mirarlo), la lógica pura y sus pruebas se trajeron tal cual (no chocaban) y el mando se editó a mano.

**El pedido del founder**, literal en el chat: «que para controlar el grosor de línea, aprovechando que el usuario debe presionar el punto en celular, si hace drag para arriba se hace más grueso y si lo hace abajo es más delgado, el punto siempre regresa a donde estaba originalmente cuando lo suelta.» Y aviso suyo por el gestor: «está rompiendo la interfaz en sus pruebas».

**Las cuatro reglas del gestor y cómo quedó cada una:**
1. *Arrastre vertical sobre el botón, con tope arriba y abajo; al soltar vuelve a su sitio con `transform: translateY`, sin mover la rejilla.* El botón solo se traslada (`translateY(-desplazamiento)`, acotado a ±`ARRASTRE_GROSOR_MAX_PX` = 60 px); mientras está presionado no hay transición (sigue al dedo al instante) y al soltar la transición del CSS lo regresa al centro. El botón nunca cambia de tamaño.
2. *Mientras se ajusta no se manda ningún trazo.* Más allá de `UMBRAL_AJUSTE_PX` (8 px, el temblor normal del dedo no cuenta) `estaAjustandoGrosor` es verdadero: el intervalo que manda mensajes no manda y tira los deltas de ese rato (al volver a pintar no sale un salto acumulado). El texto de ayuda queda vacío en ese rato — no se está pintando, así que «Pintando en la pared» sería mentira, y además en el tope de abajo el botón lo taparía (visto en una captura).
3. *Escala visible mientras se arrastra, y el grosor persiste hasta que se cambie.* Lo que crece y encoge es el **punto blanco** dentro del botón (`escalaDelPunto`: 1 en el grosor base, 1.25 en el tope, 0.8 en el mínimo), no el botón. `grosorDesdeArrastre` es relativo al grosor con que se empezó a presionar — por eso "se queda": la siguiente pulsación pinta con él y, si se arrastra otra vez, ajusta desde ahí, acotado a `GROSOR_MIN`..`GROSOR_MAX` (0.4..2.2). `MensajeTrazo` lleva `grosor` (validado en `esMensajeTrazoValido`) y la pared escala cada pincel por él.
4. *El mando no cambia de posición ni de alto en ningún estado.* Medido, abajo.

**Dos errores míos que las capturas con Chrome real destaparon antes que el founder:** (a) en el primer intento escalé el botón entero — con el grosor en 2.2 medía 160 px y se montaba sobre las tarjetas de Trazo y Tinta; la regla decía «el punto blanco», no el botón. (b) En el tope de abajo el botón quedaba encima de «Pintando en la pared»; se resolvió vaciando el texto mientras se ajusta (ver regla 2), no moviendo nada.

**De paso (pedido del gestor):** en la tarjeta de Tinta, «Cempasúchil» quedaba pegado al caret. El nombre y el caret van ahora en un `inline-flex` con `gap: 7px` y `white-space: nowrap`; medido: un renglón de 19.6 px, `gap` 7 px, `margin-left` del caret 0.

**Medido con Chrome real** (playwright-core, puntero real por CDP, `capturar-mando-grosor.mjs` en el scratchpad), 390×844: reposo `translateY(0px)`, centro del botón en y = 610.9; arrastrando arriba al tope `scale(0.94) translateY(-60px)`, punto blanco `scale(1.25)`; tras soltar `translateY(0px)`, **centro igual al de reposo** (610.9) y el punto blanco **sigue en `scale(1.25)`** (el grosor se quedó); arrastrando abajo desde ahí `translateY(60px)` y, al soltar, punto en `scale(1.125)` (2.2 → 1.6, la regla relativa); en los cuatro estados las tarjetas, el texto de ayuda y el renglón de presentes **no cambian de posición ni de alto**; `scrollWidth`/`clientWidth` 390/390 en todos.

**Capturas** (`…/scratchpad/evidencia-ol088/`): `mando-grosor-390x844-reposo.png`, `mando-grosor-390x844-arriba.png` (grueso), `mando-grosor-390x844-abajo.png` (delgado), `mando-grosor-390x844-tras-soltar.png` (el punto de vuelta al centro, el punto blanco grande: el grosor se quedó), `mando-grosor-390x844-cempasuchil.png` (el caret ya separado).

**Pruebas puras** (`pincel.test.ts`, 12 del grosor, 794 en total): `grosorDesdeArrastre` base/arriba/abajo/acotado y relativo al grosor inicial (desde 1.6 bajar el arrastre completo deja 1.0; desde 2.0 subir se acota en 2.2); `estaAjustandoGrosor` bajo y sobre el umbral; `escalaDelPunto` en base, tope, mínimo y medio; `esMensajeTrazoValido` con y sin `grosor`, cero, negativo, descomunal y los dos extremos.

`npm run typecheck && npm run lint` (0 errores) `&& npm test` (794/794) `&& npm run build`: verde. Sin migración (no toca la base). Rama `pincel-grosor` sobre `8e8cc20`, commits locales `2322e71` (código) y el de esta bitácora, sin push.
