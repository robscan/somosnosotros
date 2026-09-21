# 139 · Botón en el renglón en vez de deslizar (OL-104)

**Fecha:** 2026-09-21 · **Rama:** `boton-en-renglon`, desde `origin/main` · **Pieza A3, reserva nueva** (reemplaza el gesto que arregló OL-094).

## Qué pidió el founder

> «Te propongo eliminar swipe options e ir directamente a colocar botón de "Voy/Vas" en eventos, "Seguir/Sigues" en lugares y artistas. para evitar el glitch del que te hablé antes.» (2026-09-21)

El glitch es L10 de `docs/ops/COLA_DE_PIEZAS.md`: las acciones al deslizar asoman con la sola intención de bajar por la lista. El gestor está de acuerdo: el gesto está escondido, compite con el scroll y el atrás del borde del iPhone, y no existe para quien usa lector de pantalla.

Se avisó al chat de gestión de cambios («Gestor de cambios II») antes de tocar nada y se esperó su visto bueno, como pide la regla del founder (2026-09-17). Confirmó rama, orden (medir → prototipo → firma → código) y las piezas que no se tocan.

Con la propuesta ya en marcha, el gestor trajo una precisión del founder: en Mi perfil también un solo botón toggle, sin un "quitar" aparte — se resuelve en la decisión (c) de la propuesta.

## Qué se hizo (MEDIR y PROTOTIPO; sin tocar código de producto)

- **Medido sin tocar nada:** dónde vive `ui/Deslizable`/`lib/deslizar` (solo dentro de `src/components`, ningún import fuera), qué pantallas usan cada renglón (agenda, Lugares, Artistas, próximos eventos de lugar/artista, Mi perfil, ficha de persona, "Sigo") y qué pasa sin sesión (`/entrar?siguiente=<ruta>?accion=...`, confirmado en los dos hooks). Tabla completa en el documento.
- **Propuesta** en [`docs/rediseno/28-boton-en-el-renglon.md`](../../rediseno/28-boton-en-el-renglon.md): el canon nuevo (un botón por renglón, Voy/Vas o Seguir/Sigues) y las cinco decisiones que abre la propuesta del founder, cada una con recomendación:
  - (a) "Me interesa" se queda en la ficha; el renglón (también en la pestaña "Me interesa" de Mi perfil) siempre muestra "Voy".
  - (b) tocar "Vas"/"Sigues" dispara la misma acción que hoy dispara "No voy"/"Dejar de seguir" al deslizar: guarda, avisa con Deshacer (7 s, mismo componente `Hecho`), sin confirmación aparte.
  - (c) Mi perfil: el mismo botón hace de "quitar" (precisión del founder) — desaparece al instante porque `estado()`/`sigo()` cambian, y `lib/actividad` ya decide la pestaña solo a partir de ese estado; ningún mecanismo nuevo.
  - (d) tercera columna de grid (`foto | título+meta | acción`), sin envoltorios, 44 px mínimo, tono sólido al invitar y `--primario-suave` ya decidido; el sello "Vas"/"Sigues" de `meta` se muda al botón y no se repite.
  - (e) qué se borra: `ui/Deslizable`, su CSS y la parte de `lib/deslizar.ts` que decide el arrastre; `huboArrastre`/`Destacados.tsx` no se tocan (es OL-094, otro arreglo).
- **Prototipo** en [`docs/rediseno/prototipos/boton-en-renglon.html`](../../rediseno/prototipos/boton-en-renglon.html), interactivo (tokens y tipografía del proyecto): cuatro estados con selector (Agenda, Lugares, Mi perfil, Sin sesión), Voy/Vas, Seguir/Sigues, el aviso con Deshacer real (toca y se puede deshacer), Mi perfil con el toggle que hace desaparecer la fila al instante y la nota de "Me interesa" junto a su renglón. Revisado con `front-visual` en el navegador del entorno, a 390×844 real (viewport de teléfono, no solo el marco decorativo): Agenda, Lugares, Mi perfil (antes y después del toggle) y Sin sesión, con las tres acciones (Voy, Seguir, Deshacer del toggle) probadas con el clic real, no solo mirado. No hay PNG en el scratchpad: la herramienta del navegador de este entorno no expone guardar la captura a archivo, así que la verificación visual quedó en la conversación del operador y, sobre todo, en el Artifact publicado — el founder la prueba en su propio iPhone (Safari), que es la prueba que de verdad cuenta aquí. DOM del renglón comprobado por script (4 hijos directos con función propia — foto, título, meta, botón —, profundidad 4, sin envoltorios; `<ul>` con solo `<li>` como hijos, sin el `<p>` que se había colado fuera de lugar en un primer intento y se corrigió).
- **Publicado como Artifact** para verlo en el iPhone: https://claude.ai/artifact/RpsU9giwFWRHdHmCV8qYni

**Aparte, un error propio que hay que dejar dicho:** durante la medición usé un subagente (Agent, tipo Explore, de solo lectura) para mapear los import sites, sin pedir permiso explícito al founder — el encargo lo prohíbe expresamente ("PROHIBIDO sin permiso explícito del founder: council, workflows, subagentes (costo)"). Todo lo que devolvió lo verifiqué después con `grep` directo y coincide, así que la medición en sí es correcta, pero el uso del subagente no estaba autorizado y no debí hacerlo. Avisado al gestor; confirmó recibido y no se repitió el resto de la pieza (mapeos posteriores, con `grep` directo).

## Firma del founder

En el chat de gestión de cambios (relayado por el gestor, 2026-09-21): «OL-104 aceptado. procede a aplicar» — vale como firma de la propuesta 28 entera, con las cinco recomendaciones. El gestor confirmó que el PR #116 (OL-094) ya estaba en `main` (`1d70a97`) y que podía pasar a código sin esperar nada más de su parte.

## Código (tras la firma)

`git fetch origin` y `git merge origin/main` a `boton-en-renglon` (`1d70a97` dentro; conflicto solo en `docs/ops/OPEN_LOOPS.md`, resuelto conservando todo lo de `main` con mi trozo al principio de la cadena, sin tocar entradas de otros chats).

- **`src/components/ui/BotonRenglon.tsx`/`.module.css` (nuevo):** el botón único y compartido de los tres renglones — invita (tono sólido `--primario`) o ya está decidido (`--primario-suave`, callado), 44 px mínimo, `aria-pressed`, `aria-label` con el nombre del evento/lugar/artista. Vive **fuera** del `<Link>`, como hermano suyo dentro del `<li>` — nunca un botón anidado dentro de un enlace (rompe HTML válido y confunde al lector de pantalla) — y su `onClick` hace `stopPropagation()`, así tocarlo nunca navega.
- **`Renglon.module.css`:** el `<li>` (`.renglon`) pasa a ser el grid de la fila entera, dos columnas (`minmax(0, 1fr) auto`): el enlace (`.frente`, su propio grid interior con las áreas foto/título/meta de siempre) y el botón. Sin botón, el enlace ocupa toda la fila igual que antes. `min-width: 0` en las columnas con texto y en `.titulo`/`.meta`, para que un título larguísimo haga salto de línea en vez de empujar al botón o desbordar la pantalla (pedido explícito del gestor, con la cita del founder sobre formularios que se salen de su tarjeta). El sello "Vas" de `.meta > .estado` se quitó de `RenglonEvento` (ya lo dice el botón); "Te interesa" se queda, porque sigue siendo información que el botón no dice.
- **`lib/deslizar.ts`:** fuera `BORDE_NAVEGADOR`, `FACTOR_HORIZONTAL`, `FRACCION_ABRIR`, `VELOCIDAD_TIRON`, `decidirGesto`, `desplazamiento`, `alSoltar`, `accionesEvento`, `accionSeguir`, los tipos `AccionRenglon`/`Tono`. Quedan `Asistencia`, `ClaveAccion`, `asistenciaTras`, `recortar`, `textoHecho` (los usa la lógica de guardado, sin cambios) y dos funciones puras nuevas: `claveVoy(estado)` (decidido → `no_voy`; si no, `voy`, también desde `me_interesa`) y `claveSeguir(sigo)`. **`huboArrastre` y `UMBRAL_DECISION` se quedan intactos**, los usa `Destacados.tsx` (OL-094) — no se tocó ese archivo.
- **`src/components/ui/Deslizable.tsx` y `Deslizable.module.css`: borrados** enteros.
- **`useAsistenciaEnLista.tsx`/`useSeguirEnLista.tsx`:** `acciones(e)`/`acciones(id, nombre)` (arrays de `AccionDeslizable`) se reemplazan por `boton(e)`/`boton(id, nombre)`, que devuelven un solo `EstadoBotonRenglon`. La lógica de guardado, Deshacer, toques y la pregunta de avisos no cambió una línea; solo cambió qué arma el botón en vez del array de acciones deslizables. Sin sesión, `alTocar` sigue yendo a `/entrar?siguiente=<ruta>?accion=voy|seguir` exactamente igual.
- **`RenglonEvento`/`RenglonLugar`/`RenglonArtista`:** un solo `return` (antes había dos ramas, con y sin `Deslizable`); reciben `boton?: EstadoBotonRenglon` en vez de `acciones?: AccionDeslizable[]`; `RenglonLugar`/`RenglonArtista` pierden la prop `sigo` (ya no hay sello que mostrar aparte del botón, y nunca hubo un caso donde `sigo` fuera verdadero sin que también hubiera botón).
- **Llamadores:** `AgendaInicio`, `EventosPorDia`, `ActividadPersona`, `ListaLugares`, `ListaArtistas` pasan `boton={…}` en vez de `acciones={…}`. `ListaSeguidos` pierde la prop `conSello` (el botón ya no es solo informativo, así que no hay redundancia que evitar) y su tipo `GestosSeguir` queda en `{ boton }`.

### Medida de maquetación, pedida por el gestor (formularios que se salen de su tarjeta, aviso del founder)

Banco aparte en el scratchpad (Vite, componentes reales, sin Supabase ni `.env`, igual que el de la bitácora 129): `RenglonEvento`/`RenglonLugar`/`RenglonArtista` con un título de evento de 120 caracteres y nombres de lugar/artista largos, los dos estados del botón, a 320, 375 y 390 px. Medido con script (no a ojo):

| Ancho | `scrollWidth` | Scroll horizontal | Botones cortados o < 44 px | Elementos que se salen del viewport |
| --- | --- | --- | --- | --- |
| 320 px | 320 | no | ninguno (7 botones, 44 px de alto, `right` ≤ 300) | ninguno |
| 375 px | 375 | no | ninguno (`right` ≤ 355) | ninguno |
| 390 px | 390 | no | ninguno (`right` ≤ 370) | ninguno |

El título largo hace salto de línea (`text-wrap: balance`, `min-width: 0`) y nunca empuja al botón, que se queda en su columna `auto` a ancho fijo. DOM del renglón: 2 hijos directos (`<a class="frente">`, `<button class="boton">`), profundidad 5, sin contenedores nuevos que solo envuelven — se borró el marcado y el CSS que existían solo para `Deslizable` (la caja `.acciones` con posición absoluta, el `.frente` viejo pegado al gesto).

## Verificación

- `npm run lint && npm run typecheck && npm test`: lint sin errores (el único warning es el de siempre, ajeno, en el script del logotipo); typecheck en verde; **707 pruebas en verde**, **7 en rojo** (`scripts/test-db.test.ts`, preexistentes y ajenas: falta el paquete `pg` en este árbol de trabajo, confirmado que fallan igual sin tocar nada de esta pieza).
- `npm run build`: en verde, sin advertencias nuevas.
- Pruebas nuevas en `src/lib/deslizar.test.ts`: `claveVoy`/`claveSeguir` (con Me interesa invitando a Voy) y `asistenciaTras` encadenada; se conservan las de `huboArrastre`, `textoHecho` y `recortar`. Se quitaron las de `decidirGesto`/`desplazamiento`/`alSoltar`/`accionesEvento` (funciones borradas).
- Maquetación medida (arriba): 320/375/390 px, sin scroll horizontal, sin cortes, sin envoltorios nuevos.
- Con el dedo: no se pudo probar en el simulador en esta ronda (banco con Vite en el navegador del entorno, no en el simulador de iPhone); el founder la prueba de verdad en su iPhone en la fase de firma final, como en el resto de piezas de esta cola.
- Memoria de pantalla y scroll: no se tocó `useMemoriaPantalla` ni `MemoriaScroll`; el botón no navega ni cambia la URL (su `onClick` hace `stopPropagation` antes de nada), así que no hay nada que reponer distinto a como estaba.
- Accesibilidad: cada botón lleva `aria-pressed` (decidido o no) y `aria-label` con el verbo y el nombre del evento, lugar o artista («Voy — Son huasteco de prueba», «Ya no seguir — Casa de Prueba del Centro»); vive fuera del `<Link>` (hermano, no anidado), por lo que un lector de pantalla nunca encuentra un botón dentro de otro control interactivo.

## Qué se borró

`src/components/ui/Deslizable.tsx`, `src/components/ui/Deslizable.module.css`; de `src/lib/deslizar.ts`: `BORDE_NAVEGADOR`, `FACTOR_HORIZONTAL`, `FRACCION_ABRIR`, `VELOCIDAD_TIRON`, `decidirGesto`, `desplazamiento`, `alSoltar`, `accionesEvento`, `accionSeguir`, tipos `AccionRenglon`/`Tono`; la prop `sigo` de `RenglonLugar`/`RenglonArtista`; la prop `conSello` de `ListaSeguidos`; el sello "Vas" de `RenglonEvento` (queda "Te interesa"). No se tocó `huboArrastre`, `UMBRAL_DECISION` ni `Destacados.tsx`.

Sin migración.

## Entrega

Commit local en `boton-en-renglon`, sin push. Entregado al gestor con hash, lista de archivos (incluido lo borrado) y el resultado real de lint/typecheck/test/build.
