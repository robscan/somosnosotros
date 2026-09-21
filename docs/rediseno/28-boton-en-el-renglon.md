# 28 · Botón en el renglón en vez de deslizar (OL-104)

**Fecha:** 2026-09-21 · **Rama:** `boton-en-renglon` · **Bitácora:** [139](../bitacora/2026/09/139-boton-en-el-renglon.md) · Reservados por el gestor.

## Qué pidió el founder

> «Te propongo eliminar swipe options e ir directamente a colocar botón de "Voy/Vas" en eventos, "Seguir/Sigues" en lugares y artistas. para evitar el glitch del que te hablé antes.» (2026-09-21)

El «glitch» es **L10** de `docs/ops/COLA_DE_PIEZAS.md`: «Swipe actions se activa y muestra desde que se hace selección de fila con intención de scroll down. Debemos esperar al hold y swipe. […] Ahora se ve como un error en el sistema.» El gestor está de acuerdo: el gesto de deslizar está escondido (nadie sabe que existe hasta encontrarlo por accidente), compite con el scroll vertical y con el atrás del borde del iPhone, y no existe para quien usa lector de pantalla (ahí las mismas acciones ya viven en la ficha, aparte).

**Nota del founder, ya con esta propuesta en marcha (2026-09-21), sobre Mi perfil:** «Mi perfil absorve este comportamiento de un solo botón toggle como lo propones.» — un solo botón que alterna, sin un "quitar" aparte también ahí. Queda resuelto en la decisión (c).

## Qué se midió (sin tocar código)

### Dónde vive el gesto hoy

- **`src/components/ui/Deslizable.tsx`** (con `src/lib/deslizar.ts`): el renglón que se arrastra y revela las acciones detrás. Solo lo importan, dentro de `src/components/`: `RenglonEvento`, `RenglonLugar`, `RenglonArtista`, `useAsistenciaEnLista` y `useSeguirEnLista` (el tipo `AccionDeslizable`, también `ListaSeguidos`). Ningún archivo fuera de `src/components`/`src/app` lo usa.
- **`useAsistenciaEnLista`** (evento: Voy/No voy, Me interesa/Ya no) y **`useSeguirEnLista`** (lugar o artista: Seguir/Dejar de seguir) son los únicos que arman las `acciones` que recibe `Deslizable`. Guardan con la misma acción de la ficha, muestran el aviso con Deshacer (`Hecho`, con su Deshacer y 7 s antes de irse) y, tras el primer Voy o Seguir guardado, abren la misma pregunta de avisos que la ficha.

### Dónde aparece cada renglón (import sites resueltos hasta la pantalla)

| Pantalla / URL | Renglón | Hook | ¿Con acciones hoy? |
| --- | --- | --- | --- |
| `/` agenda (Todos, Nuevos, Cercanos, Siguiendo) | `RenglonEvento` | `useAsistenciaEnLista` | Sí |
| `/lugares` (vista Lista; la vista Mapa usa tarjetas propias, sin `Deslizable`) | `RenglonLugar` | `useSeguirEnLista("lugar")` | Sí |
| `/artistas` | `RenglonArtista` | `useSeguirEnLista("artista")` | Sí |
| `/lugares/[id]` (próximos eventos del lugar) | `RenglonEvento` (`sinSitio`) | `useAsistenciaEnLista` | Sí |
| `/artistas/[id]` (próximas fechas) | `RenglonEvento` | `useAsistenciaEnLista` | Sí |
| `/perfil` (Mi perfil), pestañas Voy a / Me interesa | `RenglonEvento` | `useAsistenciaEnLista` | Sí |
| `/perfil`, pestaña Sigo | `RenglonLugar` + `RenglonArtista` vía `ListaSeguidos` | `useSeguirEnLista` × 2 | Sí |
| `/personas/[id]` ficha ajena, visitante con sesión | igual que `/perfil` pero para el visitante | igual | Sí |
| `/personas/[id]` visitante **sin sesión**, o mirando **la propia ficha como la ven los demás** | mismos renglones | — | No: `acciones={undefined}`, cae al `<Link>` simple |

### Qué acciones ofrece hoy cada renglón

- **Evento** (`accionesEvento`, `src/lib/deslizar.ts`): sin decisión, **Voy** y **Me interesa**; con Voy, **No voy** y **Me interesa**; con interés, **Voy** y **Ya no**. Siempre dos acciones.
- **Lugar y artista** (`accionSeguir`): una sola acción, **Seguir** o **Dejar de seguir** según el estado.
- Sin acciones (`acciones` vacío o `undefined`), el renglón es un `<Link>` normal, sin `Deslizable` — es el camino que ya toma hoy la ficha ajena sin gestos y que esta pieza generaliza a todos los renglones.

### Sin sesión

Los dos hooks, si `decididas`/`iniciales` es `null` (sin sesión), no guardan: anotan la intención (`anotarIntencion`, salvo Me interesa/No voy que no la anotan) y navegan a `/entrar?siguiente=<ruta-codificada>?accion=voy|me_interesa|seguir`. `/entrar` vuelve a esa ruta y la ficha aplica la acción al llegar. Esto **no cambia** con el botón: el botón dispara la misma función `alTocar` que hoy dispara la acción al deslizar.

### Un solo estado con la ficha, ya resuelto y no se toca

`useAsistenciaEnLista`/`useSeguirEnLista` ya leen lo que llega del servidor en cada render y superponen lo elegido solo mientras se guarda (revisión de OL-056/OL-057). El botón consume exactamente la misma `acciones()`/`sigo()`/`estado()` que hoy arma `AccionDeslizable[]`; cambia **cómo se pinta y se toca**, no el guardado.

## El canon nuevo

**Un botón por renglón, siempre visible, sin gesto que descubrir:**

- **Evento:** un botón **Voy** (sin decidir o con Me interesa) que pasa a **Vas** (con Voy). Un solo verbo en el renglón; "Me interesa" deja de tener botón propio en la lista y se queda en la ficha del evento (decisión a).
- **Lugar y artista:** un botón **Seguir** que pasa a **Sigues**.
- El botón **no abre la ficha**; solo el resto del renglón lo hace (como hoy: tocar el renglón abierto lo cierra, en vez de navegar).
- Área de toque de 44 px, con el mismo Deshacer y la misma pregunta de avisos que existen hoy — nada de eso cambia, solo el disparador.

## Las cinco decisiones, resueltas con recomendación

### a) "Me interesa": ¿dónde queda?

**Recomendación (la del gestor, adoptada): el renglón lleva un solo botón, "Voy"; "Me interesa" se queda en la ficha del evento.** Un botón por renglón, una cosa a la vez — es la misma regla de UX invisible que ya rige el resto de la app (mostrar una sola cosa, no todas las opciones a la vez).

Consecuencia medida y aceptada: en la pestaña **"Me interesa"** de Mi perfil (y "Van a lo mismo" en la ficha ajena, que no depende de Me interesa), las filas muestran también el botón **Voy** — no un botón de interés. Tocar Voy en una fila de "Me interesa" la pasa a "Voy a" (el mismo movimiento de pestaña que ya hace `lib/actividad` hoy, sin cambio). Quitar el interés de un evento (sin decir Voy) solo se hace desde la ficha, como pasa hoy con cualquier evento sin sesión de deslizar. El prototipo lo muestra explícitamente para que el founder lo vea antes de firmar.

### b) Deshacer: tocar "Vas" lo quita, con cuidado de que no sea caro

**Recomendación:** tocar "Vas" dispara la misma acción que hoy dispara "No voy" al deslizar (y "Sigues" → "Dejar de seguir"): guarda al instante, muestra el aviso «Ya no vas a «…» · Deshacer» (7 s, mismo componente `Hecho`) y Deshacer regresa exactamente a como estaba. Es el mismo mecanismo de siempre (`hacer`/`deshacer` en los hooks), solo cambia el gesto que lo dispara — de deslizar-y-tocar a un solo toque.

Sobre que "un toque accidental no sea caro": el botón mide 44×44, está separado del área que abre la ficha (no hay superposición de zonas de toque) y cualquier error se revierte con un toque en el mismo Deshacer que ya existe. No se propone una confirmación aparte (un paso más contradice UX invisible) porque el costo de un error es un toque de Deshacer, igual que hoy.

### c) Mi perfil: un solo botón toggle (precisión del founder, 2026-09-21)

El founder confirmó que Mi perfil también usa el botón toggle, sin un "quitar" aparte. **Recomendación:** el toggle en cada fila de Mi perfil hace exactamente lo mismo que hacía "No voy"/"Dejar de seguir" al deslizar — `estado(id)` dejó de ser "voy" o `sigo(id)` pasó a `false` — y `lib/actividad`/`pestanasDePersona` ya deciden la pestaña de cada fila puramente a partir de ese estado, sin saber cómo se disparó. Por eso:

- **Desaparece al instante** (la fila deja de estar en la pestaña porque `estado()` ya no es "voy"), con el mismo Deshacer que ya existe (`masVistas`/`recordar` ya sostienen la fila visible mientras se guarda y la devuelven si falla).
- **Pasar de pestaña** (Voy desde "Me interesa" a "Voy a") no cambia: sigue siendo tocar el botón Voy en una fila de "Me interesa", igual que en (a).
- No hace falta ningún mecanismo nuevo: el canon firmado de OL-057 ya era "lo que decide `estado()`/`sigo()`", y el botón solo cambia cómo se llega a ese cambio de estado.

Esto queda propuesto en el prototipo para que el founder lo confirme al firmar, como pidió el gestor.

### d) El botón no le roba sitio al título ni hace pared de botones

**Recomendación:** el renglón gana una tercera columna de grid (`foto | título+meta | acción`), vertical y horizontalmente centrada, sin envolver nada (sigue siendo `grid-template-areas` con hijos directos, regla de maquetación plana). El botón:

- mide 44 px de alto como mínimo, con icono y la palabra siempre juntos ("Voy"/"Vas", "Seguir"/"Sigues") — el mismo texto que ya existe hoy, ahora tocable, para no perder claridad a cambio de compacidad;
- **invita** con el tono primario sólido (como hoy el botón "Voy" al deslizar) cuando no hay decisión;
- **se calla** cuando ya hay decisión: fondo `--primario-suave`, texto `--primario` — es la misma pastilla que hoy ya existe como sello "Vas"/"Sigues" en `.meta > .estado` (`Renglon.module.css`), ahora convertida en botón en vez de solo texto. No se duplica: al mostrarse en la columna de acción, el sello ya no se repite en `meta`.
- Con eso, ninguna lista gana una "pared de botones": lo que hoy es texto pasivo ("✓ Vas") pasa a ser el mismo texto, pero tocable.

### e) Qué se borra

- `src/components/ui/Deslizable.tsx` y `Deslizable.module.css` completos.
- De `src/lib/deslizar.ts`: `BORDE_NAVEGADOR`, `UMBRAL_DECISION`, `FRACCION_ABRIR`, `VELOCIDAD_TIRON`, `decidirGesto`, `desplazamiento`, `alSoltar` (todo lo que decide el gesto de arrastre). Se quedan `accionesEvento` → una función nueva que da un solo botón (o se simplifica a una función que solo dice si el botón dice "Voy" o "Vas"), `asistenciaTras`, `accionSeguir`, `recortar`, `textoHecho` y los tipos `Asistencia`/`ClaveAccion`/`Tono` (se siguen usando).
- **`huboArrastre` y su uso en `Destacados.tsx` no se tocan**: es el arreglo de OL-094 (PR #116, carriles de scroll nativo) y es un problema distinto — el carril de Destacados no usa `Deslizable` ni `lib/deslizar`, usa su propio `onPointerDown`/`onClickCapture`. Confirmado en la medición: `huboArrastre` vive en `src/lib/deslizar.ts` pero es una función aparte, sin relación con `decidirGesto`/`Deslizable`; se queda donde está.

## Qué no cambia

- El guardado, el Deshacer, la pregunta de avisos, el "sin sesión → Entrar con intención" y "un solo estado con la ficha": todo eso vive en los hooks y no en `Deslizable`, así que sigue igual.
- Memoria de pantalla y scroll: el botón no navega ni cambia la URL al tocarlo (como hoy "Voy" al deslizar no navega), así que no hay nada que reponer distinto.
- VoiceOver: las acciones ya viven también en la ficha (comprobado en la medición); con el botón visible en el renglón, además quedan accesibles ahí mismo (con `aria-pressed`), mejorando lo que había antes (el gesto no existía para lectores de pantalla).

## Siguiente paso

Prototipo HTML en [`prototipos/boton-en-renglon.html`](prototipos/boton-en-renglon.html), a 390×844, con los estados: evento sin decidir/decidido, lugar y artista sin seguir/siguiendo, sin sesión, y Mi perfil (incluida la pestaña "Me interesa" con botón Voy, y el toggle que desaparece con Deshacer). Se enseña al founder en el chat para su firma antes de escribir código, y solo se escribe código cuando el gestor confirme que el PR #116 (OL-094) ya está en `main`.
