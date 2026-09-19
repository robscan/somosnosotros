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
- **Proyección** (`/pincel/[obraId]/proyeccion` o similar, **sin** exigir sesión, solo lectura pública de `obras_colectivas`): la pared, el `<canvas>` que recibe el Broadcast, y el QR hacia el mando (ver más abajo). Pantalla completa, pensada para una laptop o TV conectada a un cañón, no para el teléfono de un admin logueado.
- **Mando** (`/pincel/[obraId]/mando`): exige `usuarioActual()` (si no hay sesión, `redirect("/entrar?siguiente=…")`, patrón ya usado); primero la comprobación de cercanía (§3), después el controlador ya firmado (botón, Trazo, Tinta), ahora leyendo sensores reales y mandando al canal en vez de simular.
- **QR:** apunta a la URL del mando con el id de la obra. **Hoy no hay ninguna librería de generación de QR instalada** (`package.json` revisado, ninguna). Se necesita sumar una dependencia chica (o un generador propio) — no lo decido en este plan, lo marco como pregunta para el founder/gestor antes de la Fase 2, ya que es una dependencia nueva y el repo las mantiene mínimas.

## 5. Fases, cada una publicable y con su prueba

**Fase 1 — Datos y admin (sin tiempo real ni sensores).**
Migración de `obras_colectivas` con su RLS; «Activar Pincel» en la ficha de evento; Admin → Obras colectivas con los tres caminos de creación (evento, panel, ubicación), Proyectar (pantalla estática con el nombre/estado, sin canvas en vivo todavía), Terminar y Reabrir.
*Prueba:* el founder, desde su iPhone en Safari, activa Pincel desde un evento real y por separado crea una obra desde su ubicación actual, ve ambas en el panel, cierra una y la reabre — sin que nada se dibuje todavía.

**Fase 2 — Proyección y mando en vivo.**
Realtime Broadcast entre mando y proyección (verificando antes los cupos reales del proyecto, §2), sensores de movimiento reales con su permiso de iOS Safari, Presence para el contador de personas, snapshot de la obra a Storage.
*Prueba:* dos teléfonos con cuentas distintas, en la misma obra abierta, pintan a la vez y ambos trazos aparecen en la proyección abierta en una laptop, con el founder viéndolo en vivo junto a otra persona.

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

## Verificación de este documento

Sin código: no aplica build/lint/tests. Se verificó que:
- `docs/ops/ASIGNACIONES.md:17` da la rama, OL y bitácora exactos usados aquí.
- Cada afirmación sobre lo que el repo ya tiene (§"Lo que el repo ya tiene") se comprobó leyendo el archivo citado en esta misma rama `pincel-app` (commit `5d10368`), no de memoria.
- `git status --short` en el worktree solo muestra este archivo nuevo.
