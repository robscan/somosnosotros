# 150 - Avisos al administrador y acceso a Administración con punto (OL-115, B3)

Fecha: 2026-09-21/22. Rama: `avisos-al-admin`, base `9ebe8ac` (main del día). Reserva del gestor: OL-115 / bitácora
150 / migración `20260922150000_avisos_admin.sql`. Se avisó al chat de gestión de cambios («Gestor de cambios II»)
antes de tocar nada y se esperó su visto bueno (regla del founder, 2026-09-17), con el plan corto y luego el SQL
completo antes de escribirlo, como pidió.

## Pedido del founder, tal cual

- L39: «Quiero recibir una alerta push como admin cuando alguien solicite una ficha, haga un reclamo, suba un
  evento, lugar o artista o se registre en la página. (Revisa que se estén monitoreando estas acciones en
  específico y analiza la posibilidad de crear un panel en administrador)».
- L40: «Agrega en header acceso directo a administración para usuarios administradores puede ser un icono de
  acción entre notificaciones y foto de perfil, cuando haya actividad que revisar coloca un punto en ese entry
  point como lo haces cuando hay notificaciones».

## 1. Inventario honesto (antes de tocar código)

Las cinco acciones de L39 ya dejaban rastro consultable, sin necesitar ningún dato nuevo en la base:

| Acción | Rastro hoy |
| --- | --- |
| Pedir una ficha (reclamo `es_mio`) | `insert` en `reportes`, vía `src/app/reportes.ts` (`reportar()`) |
| Hacer un reclamo (`retirar`) | Mismo `insert` en `reportes`, otro motivo |
| Publicar un evento | `insert` en `eventos` (`creado_por`) |
| Publicar un lugar | `insert` en `lugares` (`creado_por`) |
| Publicar un artista | `insert` en `artistas` (`creado_por`) |
| Registrarse | Trigger existente `al_crear_usuario` → `insert` en `perfiles` |

Ninguna necesitó un campo nuevo: solo el hecho, quién (`creado_por`/`auth.uid()`) y cuándo (`creado_en` de cada
fila), ya presentes. Se encoló con **disparadores de base** (no se tocó `src/app/reportes.ts`, `eventos/acciones.ts`,
`lugares/acciones.ts`, `artistas/acciones.ts` ni el trigger `al_crear_usuario`): más simple y más seguro que
tejerlo dentro de cada acción de servidor, y evita duplicar lógica en varios sitios de escritura.

## 2. Diseño: dos tablas nuevas, mismo cron/endpoint/worker

`avisos_jobs` (el motor existente, bitácora 113/120) exige `evento_id not null` y su `unique(evento_id, clave)`
no sirve para agrupar si `evento_id` fuera `null` (Postgres no deduplica NULLs). Extenderla habría significado
tocar `avisos_expandir`/`avisos_autorizar`/`avisos_destinatarios`, funciones muy afinadas y ya en producción.
Se decidió con el gestor **no tocarlas**: dos tablas nuevas, pequeñas, propias del aviso al administrador:

- `avisos_admin_jobs`: un job por bucket de 10 minutos, con `motivos jsonb` (conteo por motivo, nunca ids ni
  nombres), `cierra` (fin normal del bucket) y `tope` (techo duro de 60 minutos: si el bucket sigue recibiendo
  motivos sin que el worker lo haya expandido, se extiende hasta el tope en vez de abrir otro job). Esto acota a
  **como mucho un push por hora** bajo actividad continua, y entrega en ≤10 minutos si la actividad es aislada.
- `avisos_admin_entregas`: una fila por admin/endpoint, con el mismo patrón de lease/reintento/backoff que
  `avisos_entregas` (SKIP LOCKED, token, `lease_hasta`, backoff exponencial hasta 8 intentos).

Mismo cron (`avisos-pendientes`, pg_cron), mismo endpoint (`/api/avisos-pendientes`) y mismo archivo de worker
(`src/lib/avisosWorker.ts`, una función más: `drenarAvisosAdmin`), corriendo en paralelo con `drenarAvisos` en
cada invocación — "el mismo motor", sin uno aparte.

**Destinatarios:** `perfiles` con `rol = 'admin'` y `avisos_push`, excluyendo al actor de la acción (un admin no
se avisa de su propia alta). Las importaciones del catálogo (CAPO, `creado_por is null`) y las de instituciones
(`creado_por` = una cuenta admin, `--autor <id del admin>` en `scripts/instituciones/`) quedan excluidas por el
mismo filtro, sin condición aparte.

**Disparadores que nunca rompen la acción original** (condición del gestor): cada trigger es
`security definer`, `set search_path = ''`, con `exception when others then raise warning ...; return new;`. Se
probó a propósito: con `avisos_admin_encolar` lanzando una excepción, publicar un lugar y un evento y reportar
siguieron funcionando (el `WARNING` sale, la fila se inserta igual). Sin `grant` a `anon`/`authenticated` sobre
las tablas nuevas ni sobre `avisos_admin_encolar`: RLS cerrado, sin políticas, solo `service_role` las usa — igual
patrón que `avisos_jobs`. Las funciones de worker (`avisos_admin_expandir/tomar/autorizar/preparar/terminar/estado`)
sí llevan `grant execute … to service_role`, como las del motor existente.

**Sin datos personales:** el cuerpo del push sale de `contenidoPushAdmin()` (`src/lib/avisos.ts`), que compone el
texto solo de los conteos por motivo — con un solo motivo dice cuál («Alguien reclamó una ficha», «Se publicó un
evento nuevo», «Alguien se registró»…), agrupado dice cuántos («5 cosas por revisar»), nunca un nombre ni un id.
Abre `/admin`.

## 3. Ajuste durante la revisión del gestor (SQL)

Dos retoques pedidos antes de escribir el archivo:

1. `on conflict (clave) do update` podía caer sobre un job **ya expandido** de esa misma clave (borde raro cuando
   el tope lo expulsa antes de que pase su ventana natural): se agregó una comprobación previa
   (`select … where clave = bucket for update`) y, si ya está expandido, se abre otra clave con sufijo de época
   para el conteo nuevo, en vez de sumarle a un aviso que ya salió.
2. Se quitó `begin;`/`commit;`: `db push` ya aplica cada archivo en su propia transacción.

## 4. El punto de la cabecera: sin función nueva

Se iba a añadir `panel_pendientes_conteo()`, pero se encontró que ya existe `contarPendientes()`
(`src/app/admin/consultas.ts`), usado hoy en Ajustes para el mismo renglón de Administración: hace
`select count(*) from reportes where not atendido`, protegido por la misma política RLS `reportes: el admin lee`
(`es_admin()`) que usa `panel_pendientes()`. Es exactamente el mismo dato. Se reutilizó directo en `Sesion.tsx`
en vez de sumar una función a la migración — menos superficie nueva, mismo comportamiento, código ya probado.

Esto también responde la condición del gestor de que el punto se apague al **atender** el reclamo/reporte, no al
mandarse el push: son dos cosas independientes (la cola de entrega vs. lo que cuenta como "por revisar"), y el
punto sigue exactamente el segundo.

## 5. Dónde va el icono (L40)

La asignación decía `ui/Cabecera*`, pero ese componente es la cabecera de filtros de Agenda/Lugares/Artistas
(el renglón que se esconde al bajar), no donde viven la campana y la foto. El sitio real es
`src/components/Sesion.tsx` (dentro de `ui/Barra`, en su slot `derecha`), usado en `src/app/page.tsx`,
`lugares/page.tsx`, `artistas/page.tsx` y `borrado/page.tsx` — nunca en `layout.tsx` (reservado a OL-111). Ahí se
agregó el icono `IconoTablero` (el mismo que ya usa el renglón "Administración" en Ajustes), visible solo si
`perfil.rol === 'admin'`, entre la campana y la foto, con el mismo punto visual que la campana
(`Sesion.module.css`, clase `.admin` calcada de `.campana`).

## 6. Qué añadiría un panel de actividad (para analizar, sin construirlo)

Lo que pide L39 entre paréntesis. Si se hiciera, lo mínimo útil sería:

- Una lista de las mismas 6 acciones (no solo reportes/reclamos como hoy en "Pendiente"), con quién, qué y cuándo,
  filtrable por tipo y por rango de fecha — hoy `avisos_admin_jobs` guarda el conteo agrupado, no el detalle por
  fila; para un panel real conviene registrar cada evento por separado (una tabla `actividad_admin` append-only,
  con motivo/objeto/actor/creado_en, independiente de la cola de avisos, que ya descarta el detalle al agrupar).
- Un contador de "no leído" distinto del de "por revisar" de `reportes`: los reclamos/reportes ya tienen su cola
  con acción (ocultar, pasar la ficha, dar más lecturas); las altas de evento/lugar/artista y los registros no
  tienen "resolución" — un panel de actividad sería de lectura, no de cola pendiente, y necesitaría su propio
  criterio de "visto" (por ejemplo, cuándo el admin abrió por última vez esa pantalla, como `novedades_vistas_en`).
- Vale la pena separarlo de "Pendiente": mezclar cosas que se resuelven con cosas que solo se informan confunde
  el badge de la cabecera (que hoy, con razón, solo cuenta lo primero).

## Evidencia

- **PostgreSQL 17 real, local y desechable** (puerto 55439, `pg_ctl`/`initdb` de Homebrew, `LC_ALL=C` por el
  fallo "postmaster se volvió multi-hilo durante la partida" de macOS): `npm run test:db` con
  `TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55439/postgres` — **49 migraciones aplicadas, 733 pruebas
  de contrato, 0 fallaron** (705 preexistentes + 28 nuevas en `supabase/tests/pg/avisos-admin.test.mjs`).
- Pruebas manuales adicionales pedidas por el gestor, contra una base persistente aparte con las mismas
  migraciones: registro completo (`auth.users` → `crear_perfil()` → `perfiles` → el disparador nuevo) se
  completa sin error; un `insert` de evento como `authenticated` con `avisos_admin_encolar` fallando a propósito
  confirma que la acción original sigue (el `WARNING` sale, la fila se guarda).
- `npm run lint && npm run typecheck && npm test`: **lint sin errores** (solo el warning preexistente de
  `docs/diseno/logotipo/iconos-sn.mjs:57`); **typecheck limpio**; **803 pruebas unitarias, 0 fallaron** (11 nuevas:
  3 de `contenidoPushAdmin` en `avisos.test.ts`, 6 de `procesarEntregaAdmin`/`drenarAvisosAdmin` en
  `avisosWorker.test.ts`, 2 en `route.test.ts` para el mismo cron drenando ambas colas).
- `npm run build`: **verde**, sin credenciales de Supabase/Resend/VAPID/Mapbox y con telemetría desactivada.
- **Capturas PNG reales a 390×844** (`docs/rediseno/capturas-150/`), con `next build && next start` contra un
  respaldo 100 % local sin red (Node puro en el scratchpad de la sesión, sin dependencias nuevas: imita
  `/auth/v1/user`, `/auth/v1/token` y PostgREST para `perfiles`/`reportes`; nunca toca producción ni el `.env`
  real, que nunca entró a esta carpeta) y Chrome headless propio pilotado por CDP con WebSocket nativo de Node 22
  (sin instalar Puppeteer/Playwright), con una cookie de sesión `sb-127-auth-token` (JWT sin firma válida, mismo
  patrón de la memoria del proyecto) de un admin inventado:
  - `cabecera-admin-sin-punto--390x844.png`: icono de Administración entre la campana y la foto, sin punto
    (0 reportes sin atender).
  - `cabecera-admin-con-punto--390x844.png`: mismo icono, con punto (2 reportes sin atender).
  - `aviso-admin-preview--390x844.png`: vista previa del aviso agrupado tal como lo compone
    `contenidoPushAdmin({ registro: 3, reclamo_ficha: 2 })` → «Administración · 5 cosas por revisar» (el banco
    local no manda push real; esto muestra el texto exacto que recibiría el service worker, `public/sw.js`, sin
    tocarlo: no hizo falta ningún cambio ahí).

## Límites y lo que falta

- Ningún envío real en pruebas: `entregar`/cron y capacidad del canal push son responsabilidad del gestor al
  revisar, igual que con el motor principal.
- El correo al administrador (si se quisiera además del push) queda fuera de esta pieza; L39 solo pide "alerta
  push". B4 (avisos y correos a artistas/nuevos usuarios) es la siguiente pieza de la cola.
- Migración `20260922150000_avisos_admin.sql` **solo añade**: dos tablas nuevas, cinco disparadores nuevos, ocho
  funciones nuevas. No modifica ninguna tabla, función ni trigger existente. La aplica el gestor, después de
  `20260922130000` (Pincel) y `20260922140000` (OL-114, identidad del artista), que van antes en el orden.
- Commit local en `avisos-al-admin`: `451258c` (migración + prueba SQL) y el commit de este cierre (código
  TypeScript + bitácora + capturas). Sin push; el gestor sube cuando corresponda.

## Corrección tras la revisión del gestor (2026-09-22): el icono nuevo rompía la fila

El gestor devolvió la pieza por una cosa: al agregar el icono de Administración, la foto de perfil saltaba a un
segundo renglón, debajo del logotipo (visible en `cabecera-admin-con-punto--390x844.png` de la entrega anterior).

**Causa medida.** `ui/Barra.module.css`, clase `.raiz`: `grid-template-columns: 1fr auto auto` (3 columnas
explícitas) para una fila que ahora recibe **4** hijos directos sin envoltorio (`Sesion.tsx` es un fragmento:
logotipo + campana + Administración + foto; `VistoHoy` no cuenta, devuelve `null`). Con más hijos que columnas
explícitas y sin `grid-auto-flow` propio, CSS Grid manda el sobrante (la foto) a un renglón implícito nuevo. Antes
de esta pieza siempre habían sido 3 hijos (logotipo + campana + foto), que sí cabían justo en las 3 columnas.

**Arreglo.** Una sola columna explícita (`1fr`, el logotipo, que crece y empuja el resto) más
`grid-auto-flow: column; grid-auto-columns: auto;`, para que cualquier número de controles a la derecha fluya en
columnas implícitas dentro de la MISMA fila, sin depender de contar hijos a mano y sin envoltorio nuevo (regla de
maquetación plana). Sin `position: absolute`.

**Medido con `getBoundingClientRect()` en el navegador real** (mismo respaldo local, Chrome headless por CDP),
reproduciendo la regla vieja con estilo en línea sobre el mismo DOM/contenido para tener un "antes" exacto, a
390×844 y 320×568:

| | Antes (regla vieja) | Después (corregido) |
| --- | --- | --- |
| Alto de la cabecera | **96px**, dos renglones (`dosRenglones: true`, el 4º hijo con `top` distinto a los otros tres) | **56px**, un renglón (`dosRenglones: false`, los 4 hijos con el mismo `top`) |
| A 390px | Igual que arriba | Igual que arriba |
| A 320px | Igual que arriba (el bug no depende del ancho) | Igual que arriba; sin desbordar el viewport |

El alto de después (56px) es el mismo que ya tenía la cabecera en producción sin el icono nuevo (una fila,
`min-height: var(--alto-barra)`): la corrección no cambia el alto habitual, solo evita que un caso con más
controles caiga en un renglón extra.

**Capturas repetidas** (`docs/rediseno/capturas-150/`): `cabecera-admin-sin-punto--390x844.png` y
`cabecera-admin-con-punto--390x844.png` (reemplazadas) más `cabecera-admin-con-punto--320x568.png` (nueva),
las tres con logotipo · campana · Administración · foto en una sola fila.

Verde otra vez: lint, typecheck, 803 unitarias, build.
