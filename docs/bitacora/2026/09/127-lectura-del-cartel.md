# 127 · Lectura del cartel: artistas, silencio en la segunda lectura y qué modelo de IA usar (OL-092)

**Fecha:** 2026-09-21 · **Rama:** `cartel-lectura` (worktree `distracted-shirley-0b3273`, base `main` en `94e0e15`) · **Encargo:** A1 de la cola de piezas (`docs/ops/COLA_DE_PIEZAS.md`, L16/L34/L37), Sonnet 5, esfuerzo medio.

## Los tres pendientes del founder (2026-09-21)

1. «al leer un cartel, los artistas no se agregan y al contrario me agrega a mi el que publica como artista».
2. «traté de subir dos flyers seguidos usando IA y para el segundo la lectura no se dió, tampoco se reportó error, no hubo ninguna respuesta de sistema».
3. «Revisa también que modelo de IA se usa y asegurarse de usar el modelo apropiado… para no gastar de mas».

## Bug 1 · El cartel no agrega artistas y deja a quien publica

**Causa medida:** no está en `src/lib/cartel.ts` ni en `leerCartelAccion` (`src/app/eventos/acciones.ts`): ambos ya sacan y resuelven bien los nombres del cartel (`cartelAFormulario`, `src/lib/eventos.ts:288`). Está en `FormularioEvento.tsx`: por la decisión 12, cuando quien publica tiene un solo artista propio ligado a su cuenta (`mios.length === 1`), el campo "Quién" **arranca prellenado con esa persona** (línea 247). Ese prellenado se contaba, al montar el componente, como si "quien" ya tuviera un dato real (`quien.length ? "quien" : null` al construir la lista inicial de `gestosFlyer`). Los gestos (`gestosFlyer.ts`) existen justo para que el cartel no pise un campo que la persona ya llenó a mano — pero aquí bloqueaban un campo que **nadie llenó**, solo lo puso el propio sistema. Resultado: `leerCartel` en `FormularioEvento.tsx` llama a `gestos.current.puedeCompletar("quien")` antes de aplicar `r.quien` (los artistas del cartel) y siempre da `false`, así que el cartel nunca sobrescribe y el evento se publica con quien lo sube como único "artista".

**Arreglo mínimo:** la lista inicial de campos ya-llenos ahora sale de una función pura nueva, `camposIniciales` (`src/app/eventos/gestosFlyer.ts`), y para "quien" mira `quienInicial` (lo que vino explícito: editar, duplicar, o venir de la ficha de un artista) y no el estado `quien` ya prellenado por la decisión 12. Con eso, si el cartel trae artistas, los aplica; si el cartel no nombra a nadie, el prellenado de "soy yo" se queda como estaba (decisión 12 intacta).

- `src/app/eventos/gestosFlyer.ts`: nueva función `camposIniciales(d: DatosAlAbrir): CampoFlyer[]`, documentada con la causa del bug.
- `src/app/eventos/FormularioEvento.tsx`: el `useRef(crearGestosFlyer(...))` ahora arma la lista con `camposIniciales({...})`, pasando `quienInicial` en vez de `quien`.
- **Prueba de regresión:** `src/app/eventos/gestosFlyer.test.ts`, cuatro casos nuevos: el prellenado automático no bloquea, un `quienInicial` explícito sí, uno vacío no, y los demás campos (`evento?.…`) se comportan igual que antes.

## Bug 2 · La segunda lectura seguida se queda en silencio

**Causa medida:** `leerCartel` (`FormularioEvento.tsx`) tenía esta guarda al entrar: `if (!archivo || operandoCartel.current || consultandoCupo || errorCupo || !cupoActual || alLlegar(cupoActual)) return;` — un `return` mudo, sin tocar `cartel` ni ningún estado visible. `consultandoCupo` se puede volver `true` sin que la persona lo vea: hay un efecto (`FormularioEvento.tsx`, el que escucha `focus`/`pageshow`/`visibilitychange`) que vuelve a consultar el cupo cada vez que la pestaña recupera el foco, justo el patrón que deja el selector nativo de fotos del teléfono al cerrarse. Si esa consulta en curso coincide con el instante en que llega el `onChange` del segundo cartel, la guarda corta la lectura **antes** de poner "Leyendo el cartel…" — de ahí el silencio total que describió el founder. `errorCupo` y `!cupoActual` tienen el mismo problema: cuando cualquiera de los dos es cierto la tarjeta ya no dibuja el `<input>` de archivo (pasa a botón), así que solo se puede llegar a esta rama por la misma carrera (el toque abrió el selector con el input aún habilitado, y el estado cambió de fondo mientras la persona elegía la foto).

La guarda es redundante: dos líneas más abajo, dentro del `try`, el código **ya vuelve a confirmar el cupo con el servidor** (`await actualizarCupo()`) y, si de verdad no hay cupo, muestra una tarjeta de "fallo" clara con foto y mensaje. Ese camino es el único que hace falta: siempre deja un resultado visible.

**Arreglo mínimo:** la guarda de entrada queda solo con `!archivo || operandoCartel.current` (sin archivo nuevo, o una lectura ya en curso). `consultandoCupo`, `errorCupo` y `alLlegar(cupoActual)` se quitan de ahí: la reconfirmación del `try` ya cubre esos casos y siempre termina en un estado visible (leído, fallo, o sin cupo), como pide el founder («toda lectura debe terminar en un resultado visible o en un aviso claro»).

- **Sin prueba de regresión automatizada:** el proyecto no tiene arnés de pruebas de componente (React Testing Library ni similar) y añadir uno para esto solo sería una pieza aparte. Queda documentado aquí y en el propio código (comentario en `leerCartel`) el porqué del cambio; el camino que sí queda cubierto por pruebas (`estadoCartel.test.ts`) es el de los estados finales de la tarjeta.

## Bug 3 · Qué modelo de IA usar

`src/lib/cartel.ts` usa hoy `claude-opus-5` (`effort: "low"`). Se comparó contra `claude-sonnet-5` y `claude-haiku-4-5-20251001`, con el mismo código, el mismo `system` y el mismo esquema, sobre 7 carteles reales ya publicados en producción (leídos por su URL pública de Storage, sin escribir nada; imágenes descargadas y revisadas a mano para tener una referencia). Resultados completos y método: mensaje de entrega al gestor y `resultados.json` en el scratchpad de esta sesión.

| Modelo | Campos acertados (título, fecha, hora, lugar, dirección, gratis/precio) sobre 42 | Artistas | Costo promedio por lectura | Notas |
| --- | --- | --- | --- | --- |
| `claude-opus-5` (el de hoy) | 42/42 | Confundió al organizador de un cineclub con "artista" en 1 de 7 carteles (exactamente el patrón de bug que reportó el founder, aunque aquí no lo causó la IA sino la interfaz) | **$0.0258** | El más caro; sin ventaja de exactitud sobre Sonnet 5 en esta muestra. |
| `claude-sonnet-5` | 41/42 (un "gratis" en null que debía ser "con costo", en un cartel sin precio numérico) | Acertó los 7 casos, incluido el del cineclub (no lo puso como artista) | **$0.0107** (2.4× más barato) | Igualó o superó a Opus 5 en esta muestra, a menos de la mitad del costo. |
| `claude-haiku-4-5-20251001` | 36/42 | Acertó los 7 casos | **$0.0038** (6.8× más barato) | El más barato, pero **se equivocó en el título de un evento** (leyó "Los Signatarios" en vez de "Las Figuraciones") y omitió una dirección: un error así publicaría el evento con el nombre incorrecto. |

**Recomendación:** cambiar a `claude-sonnet-5`. En esta muestra iguala o mejora la exactitud de `claude-opus-5` (y evita el mismo tipo de confusión organizador/artista que preocupa al founder) a menos de la mitad del costo por lectura. `claude-haiku-4-5-20251001` es demasiado barato para el riesgo: un título mal leído no se nota hasta publicar. **No se cambió el modelo de producción**: lo decide el founder, según el encargo.

Nota aparte: `claude-haiku-4-5-20251001` no acepta el parámetro `effort` (es de la familia anterior a 4.6); la comparación se corrió sin ese campo para ese modelo únicamente.

## Verificación

- `npm run lint && npm run typecheck && npm test`: ver mensaje de entrega al gestor con el resultado exacto.
- Build: ver mensaje de entrega.
- Captura móvil 390×844: ver mensaje de entrega (o la nota de por qué no se incluyó, si el gestor no dio arnés local a tiempo).
- Producción: solo lectura. No se aplicó ninguna migración (no hizo falta: la causa de los dos bugs es de cliente, no de base de datos).

## Límites de esta pieza

No se tocó la maquetación ni los letreros del alta de evento (eso es A7, que empieza cuando esta pieza se entregue). No se cambió el modelo de producción en `src/lib/cartel.ts`: la tabla de arriba es la propuesta; el cambio lo aplica quien decida el gestor/founder.

## Corrección tras la prueba en producción (2026-09-21): "Quién" seguía trayendo a quien publica

OL-092 se publicó con `claude-sonnet-5` en producción ([PR #113](https://github.com/robscan/somosnosotros/pull/113), `e737aa8`). Al probarlo en su iPhone, el founder reportó: «En quién pide confirmar también, me puso a mi y no se dice explicitamente en el cartel.»

**Causa medida:** el primer arreglo (arriba, Bug 1) solo resolvía la mitad del problema. `camposIniciales` dejó de contar el prellenado automático de la decisión 12 como un dato real, así que el cartel **sí podía sobrescribir** "Quién" — pero solo lo hacía cuando el cartel traía artistas reconocidos (`if (r.quien.length && gestos.current.puedeCompletar("quien")) setQuien(r.quien);`, en `leerCartel`, `FormularioEvento.tsx`). Cuando el cartel **no nombraba a nadie** (`r.quien` vacío), esa condición nunca se cumplía y el prellenado de "soy yo" se quedaba tal cual — exactamente lo que vio el founder: un cartel sin nombres de artistas, y "Quién" puesto con él mismo de todos modos.

**Arreglo mínimo:** nueva función pura `quienTrasLeerCartel(quienDelCartel, quienActual, puedeCompletarQuien)` en `gestosFlyer.ts`. La regla ya no depende de si el cartel trae artistas o no: si "Quién" se puede completar (nadie lo tocó a mano y no vino explícito), el cartel manda del todo — artistas si los nombra, **vacío si no nombra a nadie**. Si ya se tocó a mano o vino explícito (`quienInicial`), nunca se pisa, tenga o no tenga artistas el cartel. En `FormularioEvento.tsx`:

```ts
setQuien((actual) => quienTrasLeerCartel(r.quien, actual, gestos.current.puedeCompletar("quien")));
```

- **Pruebas de regresión** (`gestosFlyer.test.ts`, 4 casos nuevos, cubren exactamente lo que pidió el gestor): cartel con artistas reconocidos → los del cartel; cartel sin artistas + prellenado automático → vacío; cartel sin artistas + "Quién" ya tocado a mano → se respeta; `quienInicial` explícito → se respeta aunque el cartel traiga artistas distintos.
- **Límite respetado:** solo se tocó la parte de "Quién" en `leerCartel`; no se tocó `HojaDondeEs.tsx` ni el resto del formulario (otra pieza está corrigiendo ahí).

### Medición pedida: ¿qué pasa hoy con un artista que el cartel sí nombra pero que no está en el directorio?

**No se pierde.** `leerCartelAccion` (`src/app/eventos/acciones.ts`) ya busca cada nombre del cartel con `artistas_con_nombre`; si no hay coincidencia exacta, lo agrega a `quien` igual, como `{ nombre }` **sin `id`**. `SelectorQuien.tsx` ya pinta esas fichas con una etiqueta discreta "· nuevo" junto al nombre, visibles y con su ✕ para quitarlas antes de publicar (`{!item.id && <small> · nuevo</small>}`). El artista de verdad **se crea solo al publicar** (el comentario del propio componente lo dice: «El artista nuevo no se crea aquí: viaja con el nombre y se crea al publicar, sin huérfanos si se abandona»), nunca antes — así que ya cumple lo que pide DEFINICION («lo que propone la IA se confirma antes de publicarse como hecho»): la persona ve la ficha, puede quitarla, y solo se vuelve un dato real si publica con ella puesta.

**Propuesta de mejora (no construida, para cuando toque esa pieza):** hoy "· nuevo" es una etiqueta chica, fácil de pasar por alto si el cartel trajo varios nombres. Se podría destacar ese estado en la propia tarjeta del cartel — por ejemplo, que el resumen de "Leí el cartel" diga algo como "2 artistas nuevos por confirmar" cuando alguno de los de `quien` no tiene `id` — para que la persona sepa que debe mirarlos antes de publicar, en vez de depender de que note la etiqueta en cada ficha suelta.

**Verificación:** `npm run lint` (0 errores, mismo warning ajeno de siempre), `npm run typecheck` (limpio), `npm test` (767/774 en verde; los 7 rojos son de `scripts/test-db.test.ts` por falta del paquete `pg` en `node_modules` de este worktree, preexistente y ajeno a esta pieza), `npm run build` (verde, 39 rutas). Pruebas focalizadas de la zona (`gestosFlyer.test.ts`, `estadoCartel.test.ts`): 35/35. Rama `cartel-quien-solo-del-cartel`, base `origin/main` (`44e4e63`), commit local, sin push.
