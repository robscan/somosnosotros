# 158 · Redirección 308 real desde UUID y cierre de concurrencia en el slug de artistas (OL-123)

**Fecha:** 2026-09-22 · **Rama:** `redireccion-308-slugs`, desde `origin/main` (`307cb64`).

Hallazgo del gestor que originó la pieza (2026-09-22, medido con curl en producción): `GET /eventos/<uuid>` respondía **200** con `<meta http-equiv="refresh" content="0;url=/eventos/<slug>">` en vez de un 308 con `Location`; igual en `/lugares/<uuid>` y `/artistas/<uuid>`. Causa: las tres fichas llaman `permanentRedirect()` dentro del componente, después de consultar la base, y como la ruta tiene `loading.tsx` Next ya empezó a transmitir el armazón: solo puede emitir el meta refresh. Para la gente es instantáneo; para buscadores y `curl` no es una redirección. Segunda parte, dejada dicha por OL-119: el trigger `artistas_generar_slug` (OL-114) no llevaba el bloqueo consultivo que sí llevan lugares y eventos.

## Qué se hizo

### 1. 308 real en el proxy (opción preferida del encargo, sí se pudo)

- `src/lib/redireccionSlug.ts` (puro, sin dependencias): `esUuidExacto` (forma 8-4-4-4-12 en hexadecimal, más estricta que `esUuid` de `lib/formulario`, que solo mira largo y alfabeto, porque aquí decide una consulta extra por petición), `rutaConUuid` (`/artistas|lugares|eventos/<uuid>` con su tramo posterior `/editar` o `/calendario`, o `null`) y `destinoConSlug` (misma ruta con el slug, mismo tramo, misma query tal cual).
- `src/proxy.ts`: después de refrescar la sesión (`getClaims`, local), si la ruta trae UUID hace **una sola consulta** `select slug from <tabla> where id = …` con el cliente de Supabase del propio proxy (llave pública y la sesión de quien pide: una fila oculta la ve su autor o el administrador, igual que en la página) y responde `NextResponse.redirect(new URL(destino, request.nextUrl), 308)`. Las cookies refrescadas en esa misma petición viajan también con el 308. Si la fila no existe, no es visible o no tiene slug, deja pasar y la página decide (404 o su propio redirect, que sigue ahí como respaldo). Las direcciones con slug no pagan ninguna consulta.
- Hallazgo propio, corregido antes de entregar: la primera versión respondía con `Location` relativa a mano y `next start` daba 500 (`TypeError: Invalid URL`): Next parsea la `Location` de la respuesta del proxy con `new URL` y exige una absoluta. Con la absoluta sobre `request.nextUrl`, el servidor de Next la deja relativa en la respuesta final cuando es el mismo origen: sale exactamente `location: /eventos/<slug>?…`.
- Las tres páginas y las tres de edición quedan con su lógica actual (`permanentRedirect` tras consultar) como respaldo; no se tocaron.
- Costo: una consulta extra (una columna, por clave primaria) solo cuando la ruta trae UUID; nada para las direcciones nuevas ni para el resto de rutas.

### 2. Cierre de concurrencia en artistas

- Migración `supabase/migrations/20260922200000_artistas_slug_lock.sql`: solo `create or replace function public.artistas_generar_slug()` con la misma firma y el mismo `set search_path = ''` (sin security definer, como la vigente en `20260922140000`), añadiendo `perform pg_advisory_xact_lock(hashtext('artistas_slug:' || base));` antes de comprobar el candidato, calcado de `lugares_generar_slug` y `slug_de_evento`. `create or replace` conserva dueño y permisos (sin EXECUTE para anon/authenticated) y el disparador `artistas_slug` sigue apuntando a la misma función. Nada más en la migración. **No se aplicó a ninguna base: la aplica el gestor.**
- Banco `supabase/tests/pg/artistas-slug.test.mjs` ampliado con dos altas concurrentes del mismo nombre («Dueto Simultáneo», ciudades distintas para no chocar con `artista_sin_duplicado`) en dos conexiones reales con transacciones abiertas: A inserta sin comitear; B intenta insertar y queda esperando (comprobado en `pg_stat_activity`, `wait_event_type = 'Lock'`); A comitea; B termina. Con la migración, las dos terminan con `dueto-simultaneo` y `dueto-simultaneo-2`; sin ella (comprobado quitando el archivo una vez), B rompe el índice único con `23505`. Más una comprobación de contrato: la definición vigente de la función contiene el `pg_advisory_xact_lock` por nombre base.

### 3. Pruebas unitarias

- `src/lib/redireccionSlug.test.ts` (9): UUID exacto contra slugs y cadenas del largo justo mal formadas; reconocimiento de las tres secciones con y sin tramo posterior; las direcciones con slug, `/obra/<uuid>`, `/personas/<uuid>` y las listas no entran; destino con query y tramo conservados, slug raro escapado.
- `src/proxy.test.ts` (8): con `@supabase/ssr` y `configPublica` fingidos, mide el contrato HTTP (308, `Location` sobre el mismo origen, query y tramo conservados, cookies refrescadas en el 308) y el costo (exactamente una consulta `select("slug").eq("id", …)` en la tabla de la sección cuando hay UUID; ninguna con slug ni en otras rutas; sin fila o sin slug, deja pasar con 200).

## Migraciones

- `supabase/migrations/20260922200000_artistas_slug_lock.sql` (solo redefine una función; no toca datos ni el disparador). Sin aplicar.

## Verificación

```
npm run lint && npm run typecheck && npm test
```
Verdes: 0 errores de lint (1 warning preexistente sin relación, `docs/diseno/logotipo/iconos-sn.mjs`), typecheck limpio, **910 unitarias** (0 rotas; 17 nuevas).

```
npm run build
```
Verde, 24 rutas y el proxy compilados; `CLAUDE.md`/`AGENTS.md` intactos tras el build.

```
TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db
```
**806 comprobaciones SQL, 0 fallaron** (55 migraciones aplicadas, incluida la propia), corrido dos veces. Sin la migración nueva (archivo apartado una vez a propósito): 3 fallaron, exactamente las tres de concurrencia (`{"ok":false,"code":"23505"}`). Como en OL-110, hubo que instalar `pg` con `npm install pg --no-save` (no queda en git).

**curl contra `next build && next start` (puerto 3123) con un respaldo local de datos inventados** (servidor Node sin dependencias en el scratchpad que imita la API REST de Supabase y registra cada consulta; `.env.local` temporal apuntando a él, borrado al terminar):

```
### 1) curl -sI /eventos/<uuid>?accion=voy&nuevo=1
HTTP/1.1 308 Permanent Redirect
location: /eventos/noche-de-jazz?accion=voy&nuevo=1
--- consultas del respaldo:
GET /rest/v1/eventos?select=slug&id=eq.3f2504e0-4f89-41d3-9a0c-0305e82c3301 → 200 (1 fila)

### 2) curl -sI /eventos/noche-de-jazz (dirección nueva)
HTTP/1.1 200 OK
--- consultas del respaldo: (las cuatro de la ficha de siempre; ninguna de select=slug)
GET /rest/v1/eventos?select=*,lugar:lugares(…),autor:perfiles!eventos_creado_por_fkey(id,nombre)&slug=eq.noche-de-jazz → 200 (1 fila)
GET /rest/v1/asistencias?…&evento_id=eq.3f2504e0-… → 200 (0 filas)
GET /rest/v1/eventos_artistas?…&evento_id=eq.3f2504e0-… → 200 (0 filas)
POST /rest/v1/rpc/van_por_evento → 200 (0 filas)

### 3) curl -sI /lugares/<uuid>
HTTP/1.1 308 Permanent Redirect
location: /lugares/casa-del-arte
GET /rest/v1/lugares?select=slug&id=eq.9b1deb4d-… → 200 (1 fila)

### 4) curl -sI /artistas/<uuid>/editar?error=x
HTTP/1.1 308 Permanent Redirect
location: /artistas/trio-xochitl/editar?error=x
GET /rest/v1/artistas?select=slug&id=eq.1b4e28ba-… → 200 (1 fila)

### 5) curl -sI /eventos/<uuid inexistente>
HTTP/1.1 200 OK   (el proxy deja pasar; la página hace sus dos consultas de siempre y decide el 404)
GET /rest/v1/eventos?select=slug&id=eq.00000000-… → 200 (0 filas)

### 6) curl -sL /eventos/<uuid>
final=200 url=http://127.0.0.1:3123/eventos/noche-de-jazz redirects=1
title: <title>Noche de Jazz · Somos Nosotros</title>
meta refresh en el HTML final: 0

### 7) /lugares/casa-del-arte y /artistas/trio-xochitl: 200, ninguna consulta select=slug
```

Esta pieza no cambia pantallas: sin capturas (regla del encargo).

## Fuera de la pieza, dejado dicho

- El proxy también atiende `/…/<uuid>/editar` y `/eventos/<uuid>/calendario` (mismo tramo conservado), porque esas rutas ya redirigían igual desde la página; no se amplió a `/obra/**` ni a `/personas/**`, que no tienen slug.
- `esUuid` de `lib/formulario` (largo y alfabeto) sigue igual; el proxy usa su propia comprobación exacta para no pagar consultas por cadenas que no son UUID.

## Cierre

`next start` y el respaldo apagados; `.env.local` borrado; commit local en `redireccion-308-slugs`, sin push (lo sube el gestor y abre el PR).
