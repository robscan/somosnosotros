# 154 · Direcciones legibles para lugares y eventos (OL-119)

**Fecha:** 2026-09-22 · **Rama:** `slugs-lugares-eventos`, desde `origin/main` (`354a4b6`).

Decisión del founder que originó la pieza (2026-09-22, literal): «Necesito que todas las url sean de slug humano, como hicimos con artistas, los eventos por ejemplo siguen apareciendo extraños.» Calca el patrón de OL-114 (identidad del artista, bitácora 149): slug único y estable por fila, dirección vieja (UUID) redirigida de forma permanente, enlaces internos por slug.

## Qué se hizo

### Lugares (mismo patrón que artistas)

- Columna `slug` en `lugares` (texto, único, `not null`); reusa la función genérica `public.slug_de_nombre` que ya trajo la migración de artistas (`20260922140000_artistas_slug.sql`), sin tocarla ni duplicarla.
- Trigger `lugares_generar_slug` antes de insertar; relleno de las filas existentes en la propia migración, en orden estable (`creado_en, id`).
- `/lugares/[id]` y `/lugares/[id]/editar` resuelven por slug y, si no aparece nada, por UUID (la dirección vieja); `permanentRedirect` a la de hoy conservando `nuevo`/`accion`/`error`. Nueva función `hrefLugar()` en `lib/lugares.ts`.
- Se corrigió un descuido propio al escribir la ficha: las consultas de `cuenta_seguidores`, `seguimientos` y `lugares_cuentas` en `/lugares/[id]` usaban el parámetro de ruta tal cual (que ya no es el UUID cuando se llega por slug); ahora usan `lugar.id`, el UUID real de la fila.

### Eventos (mismo patrón, con una regla propia)

- Columna `slug` en `eventos`. El slug es el nombre; si ya existe uno igual, nombre + fecha de inicio en la **zona propia del evento** (`concierto-de-otono-2026-10-03`); si aun con la fecha se repite (dos funciones el mismo día), un sufijo numérico corto. No cambia si se edita el nombre o la fecha después de creado. Función `slug_de_evento(titulo, inicio, zona, excluir_id)` y trigger `eventos_generar_slug`.
- `/eventos/[id]`, `/eventos/[id]/editar` y `/eventos/[id]/calendario` resuelven por slug y, si no aparece nada, por UUID, con el mismo redirect permanente que lugares y artistas. Nueva función `hrefEvento()` en `lib/eventos.ts`. Mismo descuido corregido: `cargarAsistencias`, `cargarQuien`, `cargarPrivado` y `van_por_evento` en la ficha usan `e.id` (UUID real), no el parámetro de ruta.
- **Hallazgo de concurrencia, corregido antes de entregar:** la primera versión del trigger (calcular el slug, comprobar que no existe, insertar) es segura para inserciones secuenciales pero no para varias transacciones concurrentes con el mismo nombre — cada una solo ve sus propias filas sin comitear, así que dos pueden calcular el mismo candidato a la vez. Lo hizo evidente el propio banco de pruebas: seis eventos titulados «Cuota» creados a la vez por `supabase/tests/pg/avisos-fiables.test.mjs` (prueba de la cuota de avisos, sin relación con esta pieza) rompían el índice único. Se corrigió con `pg_advisory_xact_lock(hashtext('eventos_slug:' || base))` (y su equivalente en lugares) al principio del cálculo: serializa solo a quienes comparten el mismo nombre base, se libera solo al terminar la transacción, y ya no rompe con seis altas simultáneas del mismo título (probado dos veces seguidas, 0 fallos). El mismo riesgo teórico existe en el trigger de artistas (`artistas_generar_slug`, OL-114, ya en producción); no se tocó esa migración —ya aplicada— por estar fuera de esta pieza; queda dicho para quien lo evalúe.

### Enlaces internos pasados por `hrefLugar`/`hrefEvento`/`hrefArtista`

Se recorrieron los ~44 sitios con `/eventos/${…}` y ~41 con `/lugares/${…}` (grep de la propia instrucción) y se dejaron por slug donde la fila trae `slug` a mano: fichas de evento y de lugar (todos sus enlaces propios: editar, compartir, reportar, seguir, calendario, «Cómo llegar», quién se presenta, el lugar), sus páginas de edición, `FormularioLugar` (los tres «Ver»/«Ya está registrado»/«¿Es este?»), `VistaLugares`, `Mapa.tsx` (el toque en el pin), `RenglonEvento`/`RenglonLugar`/`RenglonArtista` (usados por todas las listas: agenda, Lugares, Artistas, Novedades, Seguidos, tira de destacados y tira de "esta semana"), `useAsistenciaEnLista` (el botón Voy de las listas), `Asistencia` (la ficha), `destacados.ts` (`tarjetaEvento`/`tarjetaLugar`/`tarjetaArtista`), `eventosSemana.ts`, `novedades` (consulta y página), `personas/consultas.ts` (lo que sigue y a lo que va una persona), `sitemap.ts`/`app/sitemap.ts`, `avisos.ts`/`comunidad.ts` (push y correo) y `calendario.ts` (el archivo `.ics`). Las consultas que alimentan esos enlaces se ampliaron para pedir `slug`.

Se corrigió también un descuido de OL-114 que quedó fuera de su alcance: `RenglonArtista` construía `/artistas/${a.id}` con el UUID aunque `ArtistaResumen.slug` ya era obligatorio desde esa pieza (las consultas ya traían el slug, solo el componente no lo usaba). Ahora usa `hrefArtista`.

**Dejado fuera, con su porqué:**
- **Obras colectivas** (`src/app/obra/**`, panel `admin/obras-colectivas/**`): fuera de esta pieza por instrucción explícita (su QR ya lleva la URL completa y son efímeras). Los dos `redirect(/eventos/${eventoId})` de `admin/obras-colectivas/acciones.ts` (caminos de error/fallback, no enlaces que alguien vea) se dejaron con el UUID; funcionan igual por el redirect de la ficha.
- **Panel de administración dirigido por RPC** (`Pendientes.tsx` vía `panel_pendientes`, `admin/personas/[id]` vía `panel_persona`): esas rutas construyen la URL a partir de un JSON que arma una función SQL sin el slug. Cambiar esas funciones es un cambio de forma en un JSON que ya usan otras pantallas — se dejó fuera para no ampliar el archivo compartido más de lo pedido; funcionan igual por el redirect.
- **Avisos push y correo enviados por la cola** (`avisosWorker.ts`, funciones `avisos_evento_publico`/`avisos_autorizar`): el cuerpo del aviso es un snapshot `jsonb` que la propia base compara byte a byte contra el job para invalidarlo si el evento cambió (`snap is distinct from j.contenido`). Añadir `slug` a ese snapshot habría invalidado de golpe **todos** los avisos ya encolados en producción el día que se aplicara (el snapshot nuevo ya no sería igual al guardado). Se dejó sin tocar: `contenidoPush`/`contenidoCorreo` ya aceptan un `slug` opcional y usan `hrefEvento`, listos para cuando se decida tocar esa función aparte; hoy caen al UUID, que sigue resolviendo por el redirect.
- Los redirects internos de `acciones.ts` (crear/editar/borrar/ocultar/seguir) mantienen el mismo criterio que ya usaba artistas: solo el alta (`crearLugar`/`crearEvento`) redirige directo al slug (se lee de vuelta tras el `insert`); los demás siguen usando el UUID que ya tenían a mano y la propia ficha los manda al slug con el redirect permanente — exactamente como quedó aceptado en OL-114.

## Migraciones

- `supabase/migrations/20260922160000_lugares_slug.sql`
- `supabase/migrations/20260922170000_eventos_slug.sql`

Ninguna se aplicó a ninguna base (regla del encargo: las aplica el gestor tras leerlas). Solo añaden.

## Verificación

```
npm run lint && npm run typecheck && npm test
```
Verdes: 0 errores de lint (1 warning preexistente sin relación, en `docs/diseno/logotipo/iconos-sn.mjs`), typecheck limpio, **868 unitarias** (0 rotas; se ajustaron fixtures que no traían `slug` — `accionesAgenda.test.ts`, `destacados.test.ts`, `sitemap.test.ts`, `eventosSemana.test.ts` — y el mock de `supabase.from()` que faltaba en `guardado.test.ts`/`direccion.acciones.test.ts` porque `crearEvento` ahora relee el slug tras el `insert`; se agregaron pruebas propias de `hrefLugar` y `hrefEvento`).

```
npm run build
```
Verde, 24 rutas generadas sin error.

```
TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db
```
**781 comprobaciones SQL, 0 fallaron** (53 migraciones aplicadas, incluidas las dos propias), corrido dos veces seguidas para descartar el problema de concurrencia descrito arriba. 19 comprobaciones nuevas en `supabase/tests/pg/lugares-slug.test.mjs` (slug sin acentos/mayúsculas, sufijo `-2`/`-3` determinista, no cambia al renombrar, respaldo con el id, sin filas nulas ni repetidas, permisos del disparador) y 20 en `supabase/tests/pg/eventos-slug.test.mjs` (lo mismo más la regla propia: nombre repetido se resuelve con la fecha de inicio en la zona del evento —no en UTC—, y un choque de nombre y fecha iguales cae a sufijo numérico).

**Nota honesta sobre "538 artistas intactos":** el banco de control local se crea desde cero en cada corrida (sin datos de producción, que la app tiene bloqueado leer); no hay manera de comprobar aquí que sean exactamente 538 filas. Lo que sí prueba `test:db` es que ninguna migración de esta pieza toca la tabla `artistas` ni sus datos (son archivos nuevos, `alter table` solo sobre `lugares` y `eventos`), y que el disparador y las funciones de artistas (`artistas_generar_slug`, `reclamar_si_correo_coincide`, etc., de `artistas-slug.test.mjs`) siguen pasando sus 19 comprobaciones sin cambio. La cuenta real de 538 la confirma el gestor al aplicar contra la base real.

**Capturas PNG reales 390×844** (`next build && next start` contra un respaldo local 100 % sin red, Node puro sin dependencias, con datos inventados; Chrome real de la Mac por `playwright-core` instalado en el scratchpad, nunca en el repo; `document.fonts.check('16px "Bricolage Grotesque"')` → `true` en las dos fichas), rutas absolutas mandadas al chat de gestión de cambios:
- `ficha-evento--390x844.png`: `/eventos/concierto-de-prueba-2026-10-10`, con la dirección impresa arriba (sin barra de navegador en una captura headless).
- `ficha-lugar--390x844.png`: `/lugares/casa-de-la-cultura-de-prueba`, con su evento próximo abajo.
- `redirect-evento-uuid-a-slug--390x844.png` y `redirect-lugar-uuid-a-slug--390x844.png`: se navegó a la dirección vieja (UUID) de cada uno; la dirección impresa arriba ya es la de hoy (el slug). Mismo comportamiento honesto que dejó dicho OL-114: como estas rutas ya tenían `loading.tsx` (streaming), el primer byte no lleva 308 en la cabecera HTTP pura; Next lo resuelve con su propio protocolo (meta-refresh + reemplazo por JS, marcado 308 en el paquete RSC) — no es una regresión de esta pieza.
- `agenda-enlace-al-slug--390x844.png`: la agenda (`/`) con la tarjeta del evento de prueba; el atributo `href` real del enlace (comprobado con `document.querySelector`, impreso en el log de la corrida) es `/eventos/concierto-de-prueba-2026-10-10`, no el UUID.

Cada PNG se abrió antes de entregarlo; lo que se ve coincide con lo que dice su nombre.

## Pasos

- [x] Rama `slugs-lugares-eventos` creada de verdad desde `origin/main` (`git checkout -b`, confirmada con `git branch --show-current`).
- [x] Migraciones de lugares y eventos, escritas y probadas en el banco local.
- [x] Corrección de concurrencia (bloqueo consultivo) antes de entregar, encontrada por el propio banco de pruebas.
- [x] `hrefLugar`/`hrefEvento`, rutas de ficha y edición con redirect permanente, ~44/~41 enlaces internos revisados.
- [x] Pruebas unitarias y SQL nuevas; `npm run lint && npm run typecheck && npm test` y `npm run build` verdes.
- [x] Cinco capturas PNG reales 390×844, cada una abierta y descrita antes de entregar.
- [x] `next start` y el respaldo local apagados; `.env.local` borrado; sin cambios en `CLAUDE.md`/`AGENTS.md`.
- [x] Entrada propia OL-119 en `docs/ops/OPEN_LOOPS.md`, con su trozo en «Last updated» (todo lo anterior conservado).
- [x] Commit local por nombre (nunca `-A`); aviso "listo para revisión final" al chat de gestión de cambios, sin push.
