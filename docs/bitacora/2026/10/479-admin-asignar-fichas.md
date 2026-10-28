# 479 · Asignar desde Administración una ficha de lugar o de artista a una persona (OL-447)

**Fecha:** 2026-10-22. **Rama:** `admin-asignar-fichas`, desde `origin/main` (`bd6e6f7d`). **Operador:** agente de la pieza (Claude) para el
Gestor VII, sin otros agentes. **Migración:** `20261022150000_admin_asignar_fichas.sql` (solo añade). **Variables de entorno:** ninguna.
**Pantallas:** la ficha de una persona en Administración (`/admin/personas/[id]`). **Estado:** lista para la revisión del gestor.

## El pedido

El founder, hoy: «Por favor habilita la asignación de fichas de lugares y artistas desde admin. Es decir si un usuario entró hoy que yo le pueda
asignar un lugar o un artista para que lo administre.»

Hasta hoy una cuenta llegaba a llevar una ficha solo reclamándola («Soy yo / es mi grupo», «¿Es tu espacio?») y con la administración aprobando
el reclamo («Pasarle la ficha», `decidirPendiente` en `src/app/admin/acciones.ts`), que escribe la liga en `lugares_cuentas` / `artistas_cuentas`
y además le pasa la autoría (`creado_por`).

## Qué cambió

**La pantalla** (la ficha de la persona; partí de la real, capturas-445, y no hizo falta prototipo aparte):

- Bajo Actividad, un grupo nuevo, **«Fichas que administra»**: cada ficha con el renglón de lista de la app (foto, nombre y «Lugar · Foro · San Luis
  Potosí» o «Artista · Música · Acordeón · …»), que abre su ficha pública, y a su derecha **«Quitar»**. Al final, un solo renglón,
  **«Asignar una ficha»** («Un lugar o un artista para que lo administre»; con fichas, «Otro lugar o artista…»).
- Sustituye a los renglones «Lleva» de Actividad: sus salidas (el enlace a cada ficha) siguen, ahora en esta lista.
- **La hoja «Asignar una ficha»** (el canon de «Añadir ciudad»): un solo campo con su ✕, enfocado al abrir; con menos de dos letras dice
  «Escribe el nombre de un lugar o de un artista.»; al escribir busca lugares y artistas a la vez. Cada resultado dice qué es, de qué ciudad y
  **quién la administra** («La administra Marcos Ledesma», «Nadie la administra», «Ya la administra Lucía»).
- Al elegir una, la hoja enseña solo esa ficha y un botón que dice lo que va a pasar: **«Asignar Feleal a Lucía Barragán»**. Si otra cuenta ya la
  administra: «No se la quitamos a quien ya la administra: las dos cuentas podrán editarla.» Si ya es suya, el botón dice «Ya la administra Lucía» y
  no se toca. Escribir otra vez vuelve a la lista. Al asignar, la hoja se cierra y una línea lo confirma («Lucía Barragán ya administra Feleal»).
- **«Quitar»** abre una hoja con un solo botón: «¿Quitar Feleal a Lucía Barragán? Deja de poder editarla. La ficha y lo que publicó se quedan como
  están.» → «Quitar la ficha». Hecho: «Lucía Barragán ya no administra Feleal».

**La base** (`supabase/migrations/20261022150000_admin_asignar_fichas.sql`, solo añade):

- `fichas_asignaciones`: el registro de cada asignar y quitar (tipo, ficha, persona, acción, `hecho_por`, `hecho_en`). Solo la administración lo lee
  (RLS con `es_admin()`); nadie lo escribe directo (sin permisos de escritura para `authenticated`): solo las funciones. Con la cuenta se va su
  registro (`on delete cascade`); la ficha no tiene llave foránea, así que si se borra el registro se queda.
- `admin_buscar_fichas(p_buscar, p_perfil, p_limite)`: lugares y artistas por nombre normalizado (`normalizar_nombre`), primero lo que empieza como
  lo escrito, con ciudad, tipo o disciplina, si ya es suya y quién más la lleva. Sin texto no lista nada. **Los lugares privados no salen.**
- `admin_asignar_ficha(p_tipo, p_ficha, p_perfil)` → `ok` / `ya` / `no_admin` / `sin_persona` / `sin_ficha`, y `admin_quitar_ficha(...)` → `ok` /
  `no_estaba` / `no_admin` / `sin_ficha`. Las tres son `security definer`, comprueban `es_admin()` por dentro, no se pueden llamar sin sesión y
  escriben el registro con `auth.uid()`.

**El código:** `src/lib/asignarFichas.ts` (puro: textos de los renglones, de la hoja y de los códigos de la base), `src/app/admin/personas/[id]/`
`acciones.ts` (buscar, asignar, quitar: comprueban el rol y la base lo vuelve a exigir; revalidan la ficha de la persona, Personas y la ficha pública),
`fichas.ts` (lee lo que administra, con foto, tipo y ciudad), `FichasAdministradas.tsx`, `HojaAsignar.tsx`, `IconoFicha.tsx` y `asignar.module.css`.
No toqué `src/app/admin/acciones.ts` ni los archivos de OL-444, OL-446 o el PR #564.

## Decisiones por confirmar (founder o gestor)

1. **Asignar agrega, no reemplaza.** El modelo admite varias cuentas por ficha (llave primaria `(ficha, perfil)`), así que, como pide el encargo,
   si otra persona ya la administra la sigue administrando y la hoja lo dice. Para reemplazar: «Quitar» en la ficha de la otra persona.
2. **Asignar no cambia la autoría** (`creado_por`), a diferencia de aprobar un reclamo. La persona edita igual (`gestiona_lugar` /
   `gestiona_artista` miran la liga), pero no puede borrar la ficha (borrar es del autor o de la administración) y la ficha no cuenta en su
   «Publicó». Me pareció lo correcto para no quitarle la autoría a quien la dio de alta, sobre todo cuando la ficha ya la administra alguien.
3. **No hay aviso ni correo.** Aprobar un reclamo hoy no manda nada a la persona (solo hay avisos a la administración, `avisos_admin_*`), así que no
   había aviso que reutilizar. Si el founder quiere que la persona se entere («Ya puedes editar Feleal»), es una pieza aparte (un tipo de aviso nuevo).
4. **Los lugares privados no se asignan** (son el mapeo personal de la administración; asignarlos los haría visibles a esa cuenta).
5. **Presupuesto de nodos de `s31-admin-persona` de 178 a 182** (y de 212 a 216 en los anchos grandes), en un commit aparte para que el gestor lo
   pueda quitar: Ana, la persona que mide, no administra nada; donde estaba el renglón «Lleva: Ninguna ficha» ahora van el rótulo del grupo y el
   renglón «Asignar una ficha» (4 nodos más). El README dice que subir un presupuesto lo decide el gestor.

## Evidencia (árbol sin `.env`; sin red en las pruebas)

- `npm run lint`: 0 errores (1 aviso que ya estaba, en `VisorImagen.componentes.test.mjs`). `npm run typecheck`: limpio.
- `npm test`: **269 archivos, 4 520 pruebas, 0 fallaron**; nuevas, `src/lib/asignarFichas.test.ts` (7).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **105 migraciones, 2 283 pruebas, 0 fallaron**. Banco nuevo
  `supabase/tests/pg/admin-asignar-fichas.test.mjs`: solo la administración busca, asigna y quita (una cuenta cualquiera recibe `no_admin` y no queda
  ninguna liga; un visitante, 42501); antes de asignar la persona no edita ni el lugar ni el artista; después **edita los dos** y **quien ya llevaba
  el artista lo sigue editando**; **otra cuenta no edita**; asignar no cambia la autoría; repetir dice `ya`; privados, eventos, fichas o cuentas que
  no existen se rechazan; quitar deja de dejar editar sin borrar la ficha; el registro tiene los tres movimientos con quién y cuándo, solo lo lee la
  administración y ni ella lo escribe directo.
- `npm run inventario`: sin novedades. `npm run medir`: 52 pantallas × 4 anchos, sin novedades (con el presupuesto de la decisión 5).
- `npm run test:componentes`: **703 pruebas, 702 pasan**. La que falla es «OL-365: «Ver el evento», tocado en su sitio…» de
  `src/app/nuevo/evento/AltaEvento.componentes.test.mjs` con `net::ERR_HTTP_RESPONSE_CODE_FAILURE`; falla igual aislada y ya la anotaron las
  bitácoras 464 y 470: no carga nada de esta rama. Nuevas, `src/app/admin/personas/[id]/FichasAdministradas.componentes.test.mjs` (5, Chrome real,
  toques del ratón sobre el elemento): sin fichas solo el renglón y la hoja abre enfocada, sin ✕ y sin buscar con una letra; buscar trae lugar y
  artista con qué son y quién los lleva, la ✕ limpia; elegir una compartida lo dice una sola vez, el botón dice lo que pasa, mientras llega no se
  toca dos veces y al asignar la lista la trae con «Quitar»; una suya no se asigna otra vez, escribir vuelve a la lista y un fallo queda en la hoja;
  «Quitar» pide confirmación con un solo botón, va **a la derecha de la ficha en su misma fila** (medido) y al confirmar la ficha sale.
- **Recorrido con la app compilada contra el respaldo local** (`scripts/ops/auditoria-ui/capturar-asignar-fichas.mjs`, reloj fijo el jueves 22 de
  octubre a las 10:00): ocho pasos con toques reales, **ningún error de página ni de consola**, sin desplazamiento a lo ancho (390 de 390).
  El respaldo contesta las tres funciones nuevas y asignar y quitar cambian sus ligas en memoria.

**Un defecto que salió en la primera vuelta de capturas y se corrigió:** «Quitar» caía a una segunda fila bajo la ficha (renglones de 125 px): la
píldora del panel (`admin.module.css .pildora`) lleva `grid-area: accion` y, como esa hoja de estilo carga después, ganaba a mi `grid-area: auto`.
Con `li > .quitar` el renglón vuelve a 81 px y la píldora queda a la derecha. La prueba de componentes ahora lo mide.

## Capturas (`docs/rediseno/capturas-479/`, Chrome real, 390×844 a 2×, sin comprimir: ~1 MB entre las ocho)

- `01-ficha-sin-fichas.png`: la ficha de Lucía (alta hace 2 días) bajada hasta Actividad; debajo, «FICHAS QUE ADMINISTRA» con solo el renglón «＋
  Asignar una ficha · Un lugar o un artista para que lo administre ›», y luego Rol y «Ver su ficha pública». Actividad ya no tiene «Lleva».
- `02-hoja-vacia.png`: la hoja a todo lo alto con el título «Asignar una ficha», la ✕ de cerrar, el campo «Nombre del lugar o del artista» enfocado
  (borde oscuro, sin ✕ de borrar) y «Escribe el nombre de un lugar o de un artista.»
- `03-hoja-resultados.png`: con «fe» y la ✕ de borrar: Feleal (foto redonda, «♫ Artista · Música · Acordeón · San Luis Potosí», «La administra Marcos
  Ledesma» en el color del texto) y el Museo del Ferrocarril (foto cuadrada, «Lugar · Museo · San Luis Potosí», «Nadie la administra» en gris).
- `04-al-asignar.png`: la hoja baja (371 px): el campo con «fe», Feleal en una tarjeta, «No se la quitamos a quien ya la administra: las dos cuentas
  podrán editarla.» y, en el pie, el botón violeta «Asignar Feleal a Lucía Barragán».
- `05-lista-con-quitar.png`: tras asignar: «✓ Lucía Barragán ya administra Feleal», el renglón de Feleal con «Quitar» a su derecha y debajo «Asignar
  una ficha · Otro lugar o artista para que lo administre».
- `06-lista-dos-fichas.png`: tras asignar también el Teatro de la Paz: la línea de lo hecho (en dos renglones) y Feleal y Teatro de la Paz («Lugar ·
  Foro · San Luis Potosí»), cada uno con su «Quitar» en su fila.
- `07-quitar-confirmar.png`: la hoja «¿Quitar Feleal a Lucía Barragán?», «Deja de poder editarla. La ficha y lo que publicó se quedan como están.» y
  un solo botón, «Quitar la ficha», en rojo.
- `08-tras-quitar.png`: «✓ Lucía Barragán ya no administra Feleal» y solo el Teatro de la Paz en la lista.

## Lo que quedó fuera y por qué

- **El camino inverso** («Asignar a una persona» desde la ficha del lugar o del artista en Administración): Administración no tiene ficha propia de un
  lugar o un artista (sus listas abren la ficha pública, `src/app/artistas/[id]/page.tsx` está en el PR #564) y el menú de cada ficha
  (`src/app/admin/[seccion]/MenuFicha.tsx`) necesitaría un buscador de personas. Lo dejo para una pieza aparte.
- **Un aviso a la persona** al asignarle una ficha (decisión 3).
- **Ver el registro** (`fichas_asignaciones`) en pantalla: queda guardado y lo lee la administración por la base; ninguna pantalla lo enseña aún.
