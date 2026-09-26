# 232 · Bloquear a una persona (guía 1.2 de App Store) — OL-203

**Fecha:** 2026-09-25 · **Rama:** `bloquear-persona`, desde `origin/main`. **Operador:** nuevo (Sonnet), sin
subagentes ni council. **Encargo:** guía 1.2 de App Store (contenido de usuarios): ya existe reportar (`reportes`);
falta bloquear a quien abusa. Mínimo suficiente: migración que solo añade, filtro central de lo que la persona
bloqueada publicó, «Bloquear» en el menú «···» de la ficha ajena con hoja de confirmación, y «Personas bloqueadas»
en Ajustes.

## 1. Migración `supabase/migrations/20260925150000_bloqueos.sql`

Solo añade.

- **Tabla `bloqueos`**: `quien`, `bloqueado` (ambos referencian `perfiles`, cascada), `creado_en`, `primary key
  (quien, bloqueado)`, `check (quien <> bloqueado)` (no te puedes bloquear a ti mismo). Índice por `bloqueado`
  (camino inverso, para cuando haga falta revisar un caso o borrar cuentas).
- **RLS**: cada cuenta ve, crea y borra solo sus propias filas (`quien = auth.uid()`); nadie ve quién la bloqueó
  a ella. Sin sesión, nada.
- **Función `bloqueado_por_mi(p_persona uuid) returns boolean`** (`security definer stable`, sin `revoke`/`grant`
  explícito a propósito): la usan las políticas de lectura de `eventos` y `novedades_artista`, que también lee
  `anon` (contenido visible sin sesión) — revocarle el `EXECUTE` a `anon` habría roto esa lectura pública. Sin
  sesión (`auth.uid()` nulo) devuelve `false` de una vez, sin tocar la tabla.
- **El filtro, en el mismo lugar de siempre** (`drop policy` + `create policy`, mismo patrón que
  `20260915110000_lugares_privados.sql` o `20260915130000_perfil_reservado.sql`, no una tabla nueva de reglas):
  - `eventos: lectura` gana `and (es_admin() or not bloqueado_por_mi(creado_por))`.
  - `novedades_artista: lectura de lo visible o de quien gestiona` gana la misma condición sobre `publicado_por`.
  - La administración nunca pierde nada por un bloqueo — ni el suyo propio ni el de quien reporta —: puede seguir
    moderando aunque haya bloqueado (o la hayan bloqueado) a quien escribió algo.

Este es el punto central que pedía el encargo: como todas las lecturas de la app pasan por el cliente de Supabase
con la sesión de quien mira (RLS activo), este único cambio de política cubre **Inicio** (`cargarAgenda`,
`cargarEventosSemana`, `cargarArtistasDestacados`), **Agenda**, la ficha de un **lugar** o un **artista** (sus
eventos y sus novedades), **buscar** y la ficha de la propia **persona** — sin tocar una sola consulta de la
aplicación. Comprobado leyendo cada `.from("eventos")`/`.from("novedades_artista")` del repo: todas usan
`clienteServidor()` (RLS respetada), ninguna usa la llave de servicio.

### Lo que queda sin filtrar (dicho, no arreglado — fuera del mínimo de esta pieza)

- **`tira_destacados()`** (RPC `security definer`, la tira «Destacados» de Agenda/Lugares/Artistas) recorre
  `eventos` con privilegio, sin pasar por `bloqueado_por_mi`. No es una fuga real: solo devuelve ids, y la
  pantalla pide los datos de esos ids con el cliente normal (RLS), que sí los filtra — el id de un evento
  bloqueado simplemente no aparece al pintar, se cae solo. El único efecto es que la tira puede traer, ese
  cálculo, un id de menos de los que cuenta.
- **`src/lib/avisosWorker.ts`** (avisos por correo/push, cron) usa la llave de servicio y RPCs `security definer`
  para sus recordatorios: si el evento de la persona bloqueada es en un lugar o de un artista que quien bloqueó
  sigue, ese aviso puede seguir llegando por correo o push aunque ya no se vea en la app. Bloquear no calla los
  avisos existentes; solo lo dice aquí porque el encargo pedía nombrar cualquier vía sin filtrar.

## 2. UI

- **`src/components/Bloquear.tsx`** + `.module.css`: el renglón «Bloquear» en el menú «···» (`MenuAcciones`) de la
  ficha ajena — mismo sitio donde vive `Reportar` en lugares/eventos/artistas (en `personas/[id]` no existía
  `Reportar` todavía, así que no se inventó: solo se puso `Bloquear`, ni junto a nada). Abre una hoja de
  confirmación (mismo esqueleto que `Borrar.tsx`: icono, texto centrado, dos botones) en texto llano: qué pasa,
  que a Beto/la persona no le llega ningún aviso, y que se deshace desde Ajustes. Botón de confirmar en morado
  (no en rojo: bloquear no es destructivo). Sin sesión, lleva a `/entrar` (mismo criterio que `Reportar`).
- **`src/components/Desbloquear.tsx`** + `.module.css`: botón reusado en dos sitios — la ficha de la persona
  bloqueada y Ajustes → Personas bloqueadas —, se guarda al tocar, sin hoja (deshacer no pide confirmación).
- **`src/components/FichaPersona.tsx`**: nueva prop `bloqueado?: ReactNode`. Cuando la persona que mira bloqueó a
  esta ficha, en vez de `ActividadPersona` (o del aviso de «reservado») sale «Bloqueaste a esta persona: no ves lo
  que publica.» y el botón de Desbloquear que arma la página. El resto de la cabecera (foto, nombre, colonia, bio)
  se queda: es cómo se reconoce a la persona, igual que un perfil reservado.
- **`src/app/personas/[id]/page.tsx`**: calcula `estaBloqueada` (una sola fila propia de `bloqueos`, permitida por
  su propia política de lectura) y decide con eso si pinta el menú con «Bloquear» o el aviso de bloqueada.
- **`src/app/ajustes/page.tsx`**: fila «Personas bloqueadas» en el grupo Cuenta, con el icono nuevo `IconoBloquear`
  (círculo con diagonal, el símbolo de "prohibido" que ya se reconoce fuera de la app — `src/components/ui/Iconos.tsx`).
- **`src/app/ajustes/bloqueados/page.tsx`** + `consultas.ts` (`cargarBloqueados`): la lista, foto/inicial y nombre,
  con Desbloquear en cada fila; vacío con un texto llano en vez de una tabla en blanco.
- **`src/app/personas/acciones.ts`**: `bloquear`/`desbloquear`, server actions — exigen sesión, validan el id,
  nunca permiten bloquearse a uno mismo, `revalidatePath` de la ficha y de Ajustes → Personas bloqueadas.

## 3. Pruebas

**Banco real, PostgreSQL 16 local** (`TEST_DATABASE_URL=postgresql://apple-1@127.0.0.1:5432/sn_control npm run
test:db`): **65 migraciones aplicadas, 946 pruebas, 0 fallaron** (925 antes de esta pieza + 21 nuevas). Prueba
nueva `supabase/tests/pg/bloqueos.test.mjs`: no te puedes bloquear a ti mismo (`23514`); solo con sesión y solo tu
propia fila insertas o borras (`42501` para anónimo y para insertar a nombre de otra cuenta); cada cuenta lee solo
lo suyo (quien bloqueó no ve quién la bloqueó a ella); `bloqueado_por_mi` falso antes de bloquear y sin sesión,
verdadero después, no recíproco; el evento y la novedad de la persona bloqueada dejan de verse para quien bloqueó
y siguen viéndose para una cuenta sin relación, para la propia autora y para anónimo; la administración no pierde
nada aunque bloquee o la bloqueen; desbloquear repone la visibilidad.

**Unitarias** (`npm test`, vitest): `src/app/personas/acciones.test.ts` (10, `bloquear`/`desbloquear`: exige
sesión, rechaza id inválido, rechaza bloquearse a sí mismo, upsert con `ignoreDuplicates`, no confirma éxito si la
base falla) y `src/app/personas/consultas.test.ts` (4, `estaBloqueada`/`cargarBloqueados` con el cliente
simulado). **1269 pruebas, 0 fallaron** en total.

`npm run lint`: en verde (un warning preexistente en `docs/diseno/logotipo/iconos-sn.mjs`, sin relación).
`npm run typecheck`: en verde. `npm run build`: en verde (`next build`, Turbopack).

## 4. Capturas reales (`docs/rediseno/capturas-232/`), 390×844

`npm ci` en este árbol de trabajo (no traía `node_modules` propio; sin eso `next build` no encuentra `next` —
`vitest`/`eslint`/`tsc` sí lo resuelven subiendo al checkout principal, pero Turbopack no cruza esa frontera).
`next build && next start -p 3100`, con `.env.local` apuntando a un respaldo 100% local (`NEXT_PUBLIC_SUPABASE_URL=
http://127.0.0.1:8811`, sin red): un servidor Node propio (`scripts/test-db.mjs` no sirve aquí porque esto es la
app, no la base) que contesta exactamente lo que estas dos pantallas piden — `perfiles`, `seguimientos`,
`asistencias` (vacías) y `bloqueos` (con estado mutable de verdad: insertar/borrar desde la propia UI cambia lo
que la siguiente petición ve, igual que el respaldo de otras piezas guarda asistencias en memoria) — y
`/auth/v1/user` para la sesión (cookie `sb-127-auth-token`, JWT `HS256` sin firma válida pero bien formado: el
`getClaims()` del proyecto cae a `getUser()` con ese algoritmo, que este mismo servidor contesta). Sesión de
"Ana", ficha de "Beto" (dos cuentas inventadas, ids de prueba). Captura con Chrome real de la Mac vía
`playwright-core` (`npm install` en el scratchpad, nunca en el repo) — no el navegador del panel de este chat, que
solo se usó para probar el recorrido a mano antes de automatizarlo.

- **`232-1-perfil-con-la-accion.png`:** ficha de Beto vista por Ana, con el menú «···» abierto y «Bloquear» en la
  hoja.
- **`232-2-hoja-de-confirmacion.png`:** «¿Bloquear a Beto?», el icono de prohibido, el texto llano (deja de ver
  eventos y novedades, Beto no recibe aviso, se deshace desde Ajustes) y «Sí, bloquear» / «Cancelar».
- **`232-3-ficha-bloqueada.png`:** tras confirmar, la misma ficha ya sin el menú, con «Bloqueaste a esta persona:
  no ves lo que publica.» y «Desbloquear».
- **`232-4-ajustes-personas-bloqueadas.png`:** Ajustes → Personas bloqueadas, con Beto y su Desbloquear.

Las cuatro a 390×844 de verdad (`file` lo confirma), con Bricolage Grotesque condensada pintada (se ve en
«SMSNSTRS» y en los títulos, no una tipografía de repuesto). El recorrido completo se probó a mano en el panel del
chat antes de automatizarlo: bloquear hace desaparecer el menú y pintar el aviso; desbloquear (tocado de verdad,
no solo mirado) devuelve la ficha a como estaba, con «Va a 0 · Sigue 0» de nuevo.

Al terminar: se detuvieron los dos servidores (`next start`, el respaldo), se borró `.env.local` (no se comitea),
y se repuso `AGENTS.md` (`git checkout -- AGENTS.md`) — `next dev`, usado un momento para diagnosticar un error
que solo salía en `next start`, le escribe un bloque de reglas para agentes al arrancar.

## 5. Un tropiezo y su arreglo (sin dejarlo en el código)

Al construir con `.env.local` puesto la primera vez, `/ajustes/bloqueados` quedó marcada estática (`○`) en vez de
dinámica (`ƒ`) y `next start` reventaba con `DYNAMIC_SERVER_USAGE` al pedirla — parecía necesitar `export const
dynamic = "force-dynamic"`. Al repetir el build con las variables de Supabase ya puestas (como están siempre en
Vercel), Next la marcó `ƒ` sola, igual que el resto de la app: el primer build sin `.env.local` no era
representativo (sin `NEXT_PUBLIC_SUPABASE_URL`, `clienteServidor()` devuelve `null` antes de tocar `cookies()`, y
la página entera parece estática). Se probó el `force-dynamic`, se vio que sobraba, y se quitó — la página quedó
igual que `/ajustes/editar`, sin nada especial.

## 6. Informe final

- **Migración:** `supabase/migrations/20260925150000_bloqueos.sql` — tabla `bloqueos`, sus políticas, la función
  `bloqueado_por_mi`, y el filtro sobre `eventos`/`novedades_artista` (sección 1). **Sin aplicar a ninguna base
  remota** — la aplica el gestor.
- **Dónde filtra:** en las políticas de lectura de `eventos` y `novedades_artista` (todas las listas y carriles de
  la app pasan por ahí). **Qué queda sin filtrar:** `tira_destacados()` (sin efecto visible, se autocorrige al
  pedir los datos) y los avisos por correo/push de `avisosWorker.ts` (sección 1, con detalle).
- **UI:** Bloquear en el menú «···» de la ficha ajena (hoja de confirmación); ficha de la persona bloqueada con
  aviso y Desbloquear; Ajustes → Personas bloqueadas con la lista y Desbloquear (sección 2).
- **Comprobaciones:** `npm run lint && npm run typecheck && npm test` en verde (1269 pruebas); `npm run build` en
  verde; `npm run test:db` en verde (946 pruebas, banco Postgres local real) — sección 3.
- **Capturas:** `docs/rediseno/capturas-232/232-{1..4}-*.png`, 390×844, descritas en la sección 4.
- **PR:** número que sigue en el resumen de cierre / `gh pr create` (se añade aquí y en OPEN_LOOPS al terminar).
