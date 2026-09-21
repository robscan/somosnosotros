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
