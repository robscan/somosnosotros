# 149 · Identidad del artista: dirección legible, ciudad y reclamo (OL-114)

**Fecha:** 2026-09-21 · **Rama:** `identidad-del-artista`, desde `origin/main` (`9ebe8ac`) · **Pieza B2 de la cola** (L22, L49, L53).

Se avisó al chat de gestión de cambios («Gestor de cambios II») antes de tocar nada y se esperó su visto bueno, como pide la regla del founder (2026-09-17). Confirmó rama, números (OL-114/bitácora 149) y la migración reservada (`20260922140000_artistas_slug.sql`). Se mandó el plan corto y el SQL completo antes de escribirlo; el gestor pidió tres correcciones (ver «Migración» abajo), todas aplicadas antes de escribir el archivo.

## Qué se hizo

### L49 · Dirección legible

- Columna `slug` en `artistas` (texto, único, `not null`): un trigger la genera del nombre (minúsculas, sin acentos, guiones; sufijo `-2`, `-3`… corto y determinista si choca) al crear la ficha, y nunca la toca en un `update` — no cambia si cambia el nombre (regla del doc [24](../../../rediseno/24-grafo-cultural.md)). La misma migración rellena las 538 fichas existentes, en orden estable (`creado_en, id`), para que el sufijo de un choque salga siempre igual si se releyera.
- `/artistas/[id]` y `/artistas/[id]/editar` resuelven primero por slug y, si no aparece nada, por UUID (la dirección vieja); si lo que llegó no es el slug, `permanentRedirect` manda a la dirección de hoy conservando los parámetros (`nuevo`, `accion`, `error`).
- `schema.org` (`openGraph.url`), la URL de «Compartir», los enlaces de Editar/Reportar/Seguir dentro de la ficha, el enlace «Ver» de un nombre repetido en el alta, y `src/lib/sitemap.ts` (mapa del sitio) usan ya el slug. Nueva función `hrefArtista()` en `lib/artistas.ts` (slug si lo hay, UUID como respaldo) para no repetir el criterio.
- **Nota honesta sobre el 308:** la ruta `/artistas/[id]` ya tenía `loading.tsx` heredado (`src/app/artistas/loading.tsx`), que activa el streaming de Next para todo el segmento. Con streaming ya empezado, `permanentRedirect()` no puede cambiar el código de estado del primer byte (sale 200): Next entrega el redirect por su propio protocolo (una `<meta http-equiv="refresh">` de 0 segundos más un reemplazo por JavaScript, con `308` marcado en el paquete de React Server Components para su propio enrutador). Probado con Chrome real por CDP: navegar a la dirección vieja termina, sin intervención, en la nueva. Es el mismo comportamiento que ya tenían los demás `redirect()` de esta misma ficha (por ejemplo el de `accion=seguir`) desde antes de esta pieza — no es una regresión, es como ya se comportaba el streaming de esta ruta. Se deja dicho para quien audite cabeceras HTTP puras (un rastreador que no ejecute HTML), que verá 200 en vez de 308 en la primera respuesta.
- Fuera de esta pieza, dejado dicho y no hecho (para no ampliar el archivo compartido más de lo pedido): varios enlaces que no viven en `artistas/**` siguen construyendo la URL con el UUID (tira de Destacados en `lib/destacados.ts`, «Quién» en la ficha de un evento, el panel de administración, «Seguidos» de una persona en `ListaSeguidos`/`personas/consultas.ts`) — funcionan igual gracias al redirect, solo pierden el salto directo. `lugares` podría llevar el mismo patrón de slug; no se tocó, como pidió el gestor.

### L22 · Ciudad

- Ya estaba resuelta: la ciudad se ve siempre en la ficha (`ficha.dato` con el icono de pin) y se elige en el alta y la edición con `HojaCiudad`, el mismo control que usan Lugares y Eventos (búsqueda por Mapbox, sin subdominios ni filtros nuevos). No hacía falta tocar nada ahí.
- Lo que faltaba: las listas que mezclan artistas de varias ciudades sin filtrar por ninguna (`artistas_con_nombre`, usada por el buscador «Quién se presenta» del alta de evento) mostraban solo el nombre — dos «Trío Xóchitl» de ciudades distintas se veían igual. Se agregó la ciudad al lado del nombre en `SelectorQuien.tsx` cuando no es la ciudad de contexto del evento (`ciudadContexto`, ya existía en `FormularioEvento`, solo faltaba pasarla). Sin filtros nuevos: el contexto ordena, no limita.

### L53 · Reclamo

- El enlace «Soy yo / es mi grupo» ya llevaba a entrar y volver con `?accion=mio`, que abre la hoja con el botón explícito de siempre («Sí, quiero llevar yo la ficha» / «Sí, y quiero que se quite») — nada se reclama sin ese toque, ya cumplía. Cambio: la URL de vuelta usa el slug (`EsMiNombre` recibe `slug` aparte de `artistaId`, que sigue siendo el UUID real para la acción del servidor).
- Aprobación automática: función `reclamar_si_correo_coincide(p_artista uuid)` (`SECURITY DEFINER`, `search_path` vacío). No recibe el correo como parámetro — lo pidió el gestor al leer la primera versión, porque un parámetro así convertía la función en un oráculo (cualquiera con sesión podría probar correos ajenos contra cualquier ficha): lee `auth.uid()` y el correo de `auth.users` ella misma, compara en minúsculas contra `contactos_importados` (la tabla del CAPO, sin ninguna política a propósito) y, si coincide, liga la cuenta con un `insert` en `artistas_cuentas` que ella misma hace (la política normal de esa tabla exige `gestiona_artista`, que una cuenta recién ligada aún no cumple) y devuelve `true`. `reclamarArtista` (server action) llama a esta función solo con motivo `es_mio`; si aprueba, liga y termina ahí — sin crear un reporte — y llama al gancho `avisarAdminReclamoAutomatico` (función vacía, para que OL-115 la conecte). Si no coincide, o no hay correo capturado para esa ficha, o el motivo es «retirar», sigue el camino de hoy: un reporte que el administrador atiende. `EsMiNombre` distingue el resultado (`aprobado`) y dice «Ya es tuya: puedes editarla y publicar sus fechas» en vez de «El administrador lo revisa…», con `router.refresh()` para que el menú de la ficha muestre Editar sin recargar a mano.

## Migración

`supabase/migrations/20260922140000_artistas_slug.sql`. El SQL completo se mandó al gestor antes de escribirlo; pidió tres correcciones, las tres aplicadas:

1. `correo_capo_coincide(p_artista, p_correo)` recibía el correo como parámetro (oráculo). Sustituida por `reclamar_si_correo_coincide(p_artista)`, que lee `auth.uid()` y hace el alta ella misma (ver L53 arriba).
2. `slug_de_nombre` pasó de `immutable` a `stable` (depende del diccionario de `unaccent`, mismo criterio que `normalizar_nombre`); no se usa en ningún índice funcional.
3. Se probó en el banco local (`sn_control`, `npm run test:db`) si el trigger de slug necesita `EXECUTE` para el rol `authenticated`: con el `execute` revocado, un `insert` real como `authenticated` sigue disparando el trigger sin error (los triggers no necesitan permiso de quien inserta). Se dejó revocado de `public`/`anon`/`authenticated` y concedido solo a `service_role`, igual que los demás triggers de la base (`security_advisor`).

No se aplicó a ninguna base: queda para que el gestor la aplique tras leer el archivo final.

## Verificación

```
npm run lint && npm run typecheck && npm test
```
Verdes: 0 errores de lint (1 warning preexistente sin relación), typecheck limpio, **793 unitarias** (0 rotas; se ajustaron tres fixtures de prueba — `artistas.test.ts` ×2, `destacados.test.ts` ×1 — que no traían `slug`, campo ahora obligatorio del tipo `ArtistaResumen`).

```
npm run build
```
Verde, 24 rutas generadas sin error.

```
TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db
```
**724 comprobaciones SQL, 0 fallaron** (49 migraciones aplicadas, incluida la propia). 19 comprobaciones nuevas en `supabase/tests/pg/artistas-slug.test.mjs`: slug generado sin acentos/mayúsculas, sufijo `-2`/`-3` determinista en un choque, el slug no cambia al renombrar, respaldo `artista-<8 del id>` cuando el nombre no aporta letras, `reclamar_si_correo_coincide` (sin sesión no coincide, otro correo no coincide y no liga, el correo que coincide liga y no duplica al repetir, sin correo capturado nunca aprueba sola, `anon` no puede llamarla y no expone `contactos_importados` por `SELECT` directo a nadie), y el contrato de permisos (`has_function_privilege`) de las tres funciones nuevas.

**Capturas PNG reales 390×844** (`docs/rediseno/capturas-149/`), `next build && next start` contra un respaldo local 100 % sin red (Node puro, sin dependencias) con datos inventados, sesión inventada (cookie `sb-127-auth-token`, JWT sin firma válida, método de la memoria del proyecto) y Chrome headless por CDP (WebSocket nativo de Node, sin instalar nada):

- `ficha-direccion-ciudad--390x844.png`: ficha en `/artistas/trio-xochitl`, con la ciudad («Ciudad de México») junto al pin.
- `alta-ciudad--390x844.png`: alta de artista con el renglón Ciudad resuelto («San Luis Potosí»).
- `reclamo-confirmar--390x844.png`: `/artistas/coro-vuela-alto?accion=mio` tras «entrar», con la hoja abierta y el botón «Sí, quiero llevar yo la ficha».

## Verificación de la migración

No se aplicó a ninguna base (regla del encargo: la aplica el gestor tras leerla). Se probó completa contra el banco local `sn_control` (49 migraciones, 724 comprobaciones, ver arriba) y el permiso del disparador se comprobó a mano con un `insert` real bajo `set role authenticated` antes de fijar los `revoke`/`grant` finales.

## Pasos

- [x] Aviso de arranque al gestor y su visto bueno.
- [x] Rama `identidad-del-artista` desde `origin/main` (`9ebe8ac`).
- [x] Leer CLAUDE.md, GESTION_DE_CAMBIOS, MEMORIA_GESTOR, ASIGNACIONES, COLA_DE_PIEZAS, doc 24, DEFINICION y el código de `artistas/**`.
- [x] Plan corto y SQL completo al gestor; tres correcciones pedidas, aplicadas antes de escribir el archivo.
- [x] Migración escrita y probada en el banco local (`test:db`, 724/724).
- [x] Slug, redirect 308/permanente, ciudad en listas mezcladas y reclamo con aprobación automática implementados.
- [x] `npm run lint && npm run typecheck && npm test` y `npm run build` verdes.
- [x] Tres capturas PNG reales 390×844 en `docs/rediseno/capturas-149/`.
- [x] Entrada propia OL-114 completada en `docs/ops/OPEN_LOOPS.md` (con su trozo en «Last updated»).
- [x] Commit local; aviso "listo para revisión final" al gestor, sin push.
