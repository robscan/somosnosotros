# 212 · «Mis artistas» arriba del listado de Artistas y reclamo por correo enlazado (OL-177)

**Fecha:** 2026-09-24 · **Rama:** `artistas-mis-fichas-y-reclamo`, desde `origin/main`. **Modelo:** Sonnet 5. Sin council, workflows ni subagentes.

## Pedido del founder (2026-09-24, palabras suyas)

«Pon las fichas de Mis artistas arriba de listado de artistas (solo lo ven artistas con fichas reclamadas), usa el mismo componente que pones en perfil de usuario del artista. Si la cuenta de usuario se hizo con un correo relacionado a un artista, muestra un letrero como el que usas en inicio para invitar a crear cuenta que le diga al usuario que su correo está enlazado a "nombre de artista" y que lo puede reclamar ahí mismo (agrega botón de reclamar ficha y que envíe solicitud directo al admin).»

## Qué leí

`CLAUDE.md`, `docs/DEFINICION.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, las tres últimas notas de `docs/ops/MEMORIA_GESTOR.md` (tercer aviso del founder por maquetación de botones, la regla de las sugerencias debajo del campo, y el procedimiento de capturas desde la nube con el certificado del proxy), `docs/diseno/LINEA_GRAFICA.md`; `src/app/perfil/page.tsx` y `src/app/perfil/MisArtistas.tsx` (cómo arma la lista de artistas ligados con su QR); `src/app/artistas/consultas.ts` (`cargarMisArtistas` ya vivía ahí, importable — no hizo falta sacarla de ningún sitio); `src/app/artistas/acciones.ts` (`reclamarArtista`, `reclamar_si_correo_coincide`); `src/app/artistas/[id]/EsMiNombre.tsx` (patrón de reclamo existente, solo lectura: OL-175 lo tiene reservado); `src/app/artistas/page.tsx` y `ListaArtistas.tsx`; `src/components/Inicio.tsx`/`Inicio.module.css` (la invitación a crear cuenta); `supabase/migrations/20260922140000_artistas_slug.sql` (L53, `reclamar_si_correo_coincide`); `supabase/tests/pg/artistas-slug.test.mjs` y `scripts/test-db.mjs` (el banco de pruebas SQL real); `src/app/eventos/guardado.componentes.test.mjs` y `src/app/eventos/FormularioEvento.tsx` (el patrón de acción inyectada como prop, `accion`, para poder probar un componente cliente sin sesión real).

## 1. Migración `20260925110000_artistas_con_mi_correo.sql`

Solo añade: `public.artistas_con_mi_correo()` (`security definer`, `set search_path = ''`), mismo criterio de coincidencia que `reclamar_si_correo_coincide` (L53, migración 20260922140000): lee el correo de `auth.uid()` ella misma, nunca un parámetro, sin exponer `contactos_importados`. Devuelve `(id, nombre, slug)` de los artistas cuyo correo capturado coincide (sin distinguir mayúsculas) y que la persona **no gestiona todavía** (no está en `artistas_cuentas` para ella) **ni tiene ya un reclamo suyo sin atender** sobre esa ficha (`reportes`, `tipo='artista'`, `not atendido`, sin filtrar por motivo: tanto «es_mio» como «retirar» pendientes bastan para no repetir el letrero). `revoke` de `public`/`anon`, `grant execute` solo a `authenticated`.

**Tropiezo y arreglo:** la primera versión fallaba con «column reference "id" is ambiguous» — el parámetro de salida de `returns table (id uuid, …)` se llama igual que `auth.users.id`, y `where id = auth.uid()` sin calificar no sabe a cuál se refiere (el mismo problema no existe en `reclamar_si_correo_coincide` porque esa función devuelve `boolean`, sin una salida llamada `id`). Se corrigió calificando `from auth.users u where u.id = auth.uid()`.

### Prueba en Postgres local (`supabase/tests/pg/artistas-con-mi-correo.test.mjs`)

Este árbol usa el banco de pruebas real (`scripts/test-db.mjs`, `pg` contra un Postgres local con roles `anon`/`authenticated`/`service_role` aislados), no PGlite en npm — es lo que hoy corren las demás migraciones (`supabase/tests/pg/*.test.mjs`). Postgres 16 ya estaba instalado y corriendo en este entorno (puerto 5432); se le puso una contraseña efímera al rol `postgres` y se creó la base de control `sn_control` (no existía) para poder correr `npm run test:db` — nada de esto se comitea ni es un secreto del proyecto, es infraestructura de este entorno.

```
TEST_DATABASE_URL=postgresql://postgres:<contraseña local>@127.0.0.1:5432/sn_control PGPASSFILE=/dev/null npm run test:db
```

**60 migraciones aplicadas, 862 pruebas, 0 fallaron** (853 antes de esta pieza + 9 nuevas). Casos probados: sin sesión → vacío; correo sin coincidencia → vacío; correo coincidente (sin distinguir mayúsculas) → trae el artista con su slug; ya ligada a la cuenta → vacío (no se repite, ya está en «Mis artistas»); con un reclamo pendiente sobre esa ficha → vacío; el mismo reclamo ya atendido → vuelve a aparecer; `anon` sin `EXECUTE` (42501); permisos: solo `authenticated`.

**No se aplica en esta pieza.** La aplica el founder o el gestor local antes de publicar — así lo dice el PR.

## 2. Acción de servidor

`artistasConMiCorreo()` en `src/app/artistas/acciones.ts` (solo se añadió): llama al RPC y devuelve sus filas tal cual, `[]` si `clienteServidor()` no tiene configuración o si el RPC no autoriza (sin sesión, PostgREST responde con error y `data: null`). Prueba unitaria en `src/app/artistas/acciones.test.ts` (mismo patrón de mocks que `direccion.acciones.test.ts`/`perfil/acciones.test.ts`): sin configuración no llama al RPC; llama a `artistas_con_mi_correo` y devuelve las filas; sin sesión (RPC rechazada) vacío sin lanzar; sin filas, vacío en vez de `null`. El archivo ya traía una prueba de `reclamarArtista` (una «prueba de concepto» sin aserciones reales, de otra sesión); se dejó como estaba, fuera del alcance de esta pieza.

## 3. Sección Artistas

`src/app/artistas/page.tsx` (`ArtistasContenido`, dentro del `<Suspense>` que ya envuelve el listado — no hizo falta uno propio): con sesión, `cargarMisArtistas` + el QR de cada uno (mismo cálculo que `perfil/page.tsx`, letra por letra: `qrDeUrl(`${ORIGEN}${hrefArtista(a)}`)`) y `artistasConMiCorreo()` se piden junto con `cargar()` en el mismo `Promise.all`, así no atrasan la carga progresiva de la lista. Arriba del listado: si `conArtistasLigados` dice que hay alguno, `MisArtistas` — el componente real de `perfil/MisArtistas.tsx`, importado sin tocarlo (OL-175 lo tiene reservado) — envuelto en un `<div>` con `padding: 0 var(--gutter)` nuevo (`src/app/artistas/page.module.css`): `.raiz` no pone gutter horizontal (cada sección lo pone el suyo, como `Lista.module.css`) y `MisArtistas.module.css` tampoco lo trae (en Mi perfil lo pone `ui/Ficha.module.css` `.pagina`, que no envuelve esta pantalla). Debajo, un `LetreroCorreoLigado` por cada artista que trae `artistasConMiCorreo()` (uno por ficha, apilados). Sin sesión, ninguno de los dos bloques se pinta — la sección Artistas queda igual que antes.

### `LetreroCorreoLigado` (`src/app/artistas/LetreroCorreoLigado.tsx` + `.module.css`)

Mismo dibujo que la invitación a crear cuenta de Inicio (`Inicio.module.css`, `.invitacion`/`.crearCuenta`: caja violeta clara, título en negrita, párrafo, botón violeta redondeado) — **copiado**, no importado: `Inicio.tsx`/`Inicio.module.css` no se tocaron (otro operador puede estar en ese árbol y esta pieza no los tiene reservados), y el pedido del founder es «un letrero *como* el de Inicio», no el mismo componente. El botón real es un `<button>` (dispara una acción, no navega) con el reset completo de apariencia que pide `docs/ops/MEMORIA_GESTOR.md` tras el tercer aviso del founder por el mismo motivo (`appearance: none; border: 0; padding: 0; font: inherit`).

La acción `reclamarArtista` se recibe como prop (`reclamar`), no importada dentro del componente — mismo patrón que `accion` en `FormularioEvento`/`guardado.componentes.test.mjs`: así el letrero se prueba y se captura sin sesión real ni Supabase. En `page.tsx` se le pasa la acción real. Estados: **inicial** (título + párrafo + «Reclamar ficha»), **enviando** (`useTransition`, botón deshabilitado, «Enviando…»), **aprobado** (correo coincidente, se ligó al instante: «Listo: ya gestionas la ficha de «Nombre»», con el icono de OK verde, y `router.refresh()` para que la tarjeta nueva aparezca en «Mis artistas»), **enviada** (reclamo pendiente para el administrador: «Solicitud enviada al administrador.», sin duplicar si se toca otra vez — lo hace `reclamarArtista`), **error** (mensaje de `reclamarArtista`, o uno genérico si no trae ninguno; el botón sigue ahí para reintentar).

La transición de estado (qué le corresponde al letrero según lo que devuelve `reclamarArtista`) es lógica pura, separada del componente: `src/app/artistas/letreroCorreoLigado.ts` (`siguienteEstadoLetrero`), con su propia prueba unitaria (`letreroCorreoLigado.test.ts`, 4 casos) — la alternativa que ofrecía el encargo al patrón `*.componentes.test.mjs` (que no existe hoy para este componente y necesita Playwright + Chromium reales, más pesado de mantener en CI que una función pura).

## Pruebas

```
npm run lint && npm run typecheck && npm test && npm run build
```

Verdes: lint 0 errores (1 advertencia preexistente sin relación, `docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio; **1083 pruebas, 90 archivos** (8 nuevas: 4 de `artistasConMiCorreo` en `acciones.test.ts`, que ya traía una prueba de `reclamarArtista` sin aserciones reales de otra sesión, sin tocar — y 4 de `siguienteEstadoLetrero` en el archivo nuevo `letreroCorreoLigado.test.ts`); build completo, sin la ruta del arnés en el árbol de rutas final. Banco de Postgres local: **60 migraciones, 862 pruebas, 0 fallaron** (detalle arriba).

## Capturas reales (`docs/rediseno/capturas-212/`), 390×844 (y 320 px)

`next build && next start -p 4212`, Chromium real (`/opt/pw-browsers/chromium` vía `playwright-core`, instalado con `npm i --no-save` en el scratchpad de la sesión — `package.json`/`package-lock.json` intactos). Sin Supabase configurado en este árbol de trabajo: arnés temporal `src/app/arnes212-temporal/` (`page.tsx` + `LetreroArnes.tsx`, un envoltorio cliente que le da a `LetreroCorreoLigado` una `reclamar` simulada por `?caso=`, ya que una función no viaja de un componente de servidor a uno de cliente) con datos inventados — tres artistas en el listado, uno con nombre al tope de longitud («Banda de los Vientos del Altiplano Potosino y Compañía Cultural Extendida»), dos fichas en «Mis artistas» (Los Vecinos, Colectivo Barro Vivo) — y los componentes reales de la pieza. **Borrado entero antes de comitear**, comprobado con `git status --short` (limpio de `arnes212-temporal`).

Sin `--ignore-certificate-errors`: la fuente Bricolage Grotesque se inyectó desde el woff2 real del build local (`.next/static/media/74effe3e2193102a-s.p.1jake7ccbq8_p.woff2`, el de rango Latin básico — confirmado por su `unicode-range` en el CSS generado, el único de los tres que cubre á/é/í/ó/ú/ñ/¿/«») con `page.addStyleTag` + `document.fonts.load` + comprobación de `[...document.fonts]` con `status === "loaded"`; se verificó a ojo en cada captura (condensada, «g» de una sola planta).

Medido antes de cada captura: `document.documentElement.scrollWidth === clientWidth` (sin desbordes) en los siete casos.

- **`01-mis-artistas.png`:** con sesión, «MIS ARTISTAS» (rótulo en mayúsculas, como en Mi perfil) con las dos tarjetas (Los Vecinos, Colectivo Barro Vivo, cada una con su círculo de compartir), arriba del listado de Artistas con su chip de ciudad y la tira de renglones debajo.
- **`02-letrero-inicial.png`:** el letrero «Tu correo está enlazado a «Banda de los Vientos del Altiplano Potosino y Compañía Cultural Extendida»» (el nombre al tope de longitud, envuelve en tres líneas sin desbordar), «Puedes reclamar su ficha aquí mismo y empezar a gestionarla.», botón violeta «Reclamar ficha».
- **`03-letrero-aprobado.png`:** tras tocar «Reclamar ficha» (con la `reclamar` simulada devolviendo `{ok:true, aprobado:true}`): «Listo: ya gestionas la ficha de «Banda de los Vientos…»» con el icono de OK verde, sin botón.
- **`04-letrero-enviada.png`:** con `{ok:true, aprobado:false}`: el título se conserva, el párrafo cambia a «Solicitud enviada al administrador.», sin botón.
- **`05-sin-sesion.png`:** sin sesión, la sección Artistas igual que siempre — sin «Mis artistas» ni letrero, directo el chip de ciudad y el listado.
- **`06-320px.png`:** el letrero con el nombre al tope de longitud a 320 px (el ancho mínimo del proyecto): envuelve en cinco líneas, el botón sigue completo y redondeado, sin desbordar (`scrollWidth === clientWidth === 320`).
- **`07-letrero-error.png`** (evidencia extra del quinto estado, no listada en el encargo pero parte de los estados probados): con `{ok:false, error:"No se pudo enviar. Intenta de nuevo."}`, el botón vuelve a «Reclamar ficha» (para reintentar) y el mensaje de error aparece debajo en rojo.

**Tropiezo en la captura 07:** la primera versión, esperando `page.getByRole("alert")`, tomó la foto a medio camino («Enviando…» todavía, sin el mensaje de error) — Next.js monta su propio anunciador de rutas (`#__next-route-announcer__`, oculto visualmente pero con `role="alert"` y área no nula) desde el primer render, y el locator genérico lo encontraba antes de que apareciera el alert real del letrero. Se corrigió esperando el texto exacto del error en vez del rol solo.

## Lo que no se tocó

`src/app/artistas/[id]/**`, `src/app/perfil/**`, `src/app/eventos/**`, `AgendaInicio.tsx`, `ui/Cabecera*`, `ui/Chip*`, `VistaLugares.tsx`, `Mapa.tsx`, `Destacados*`, `src/lib/enlaces.ts` (reservados por otras piezas en curso); `Inicio.tsx`/`Inicio.module.css` (se copió su dibujo, no se importó ni se editó); la tira de letras y los filtros de Artistas; el conteo «Enlaces (N)».

## Correos en el diff

`git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'`: solo direcciones de prueba dentro de `supabase/tests/pg/artistas-con-mi-correo.test.mjs` (`con-mi-correo@local.test`, `otra-cuenta@local.test`), ninguna real.

## Cierre

Commit local en `artistas-mis-fichas-y-reclamo`, `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. `git -C /home/user/somosnosotros status --short` vacío (comprobado: esta pieza trabajó entera en su árbol de trabajo aparte, nunca en la carpeta principal). `git push -u origin artistas-mis-fichas-y-reclamo` al terminar; sin PR (lo abre el gestor) — dirá que trae la migración `20260925110000_artistas_con_mi_correo.sql` sin aplicar.
