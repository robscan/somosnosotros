# 144 · Fricción en los tres formularios (OL-109)

**Fecha:** 2026-09-21 · **Rama:** `friccion-formularios`, desde `origin/main` (`841d4ca`), solo documentos y capturas · **Pieza D3 de la cola.**

Se avisó al chat de gestión de cambios («Gestor de cambios II») antes de tocar nada y se esperó su visto bueno, como pide la regla del founder (2026-09-17). Confirmó rama, números (OL-109/bitácora 144) y el método (respaldo local con datos inventados, aceptando `POST /auth/v1/token` y `POST /rest/v1/rpc/*`).

## Qué se hizo

Documento completo en [`docs/rediseno/33-friccion-formularios.md`](../../../rediseno/33-friccion-formularios.md): recorrido de alta y edición de evento, artista y lugar, en 320×568, 375×667, 390×844 y 430×932, con teclado fuera y teclado simulado, con datos normales y al tope de longitud, y con las listas de sugerencias donde las hay. Diez hallazgos (dos fricciones reales que piden código, cinco comprobaciones limpias que se dejan como evidencia, tres notas de alcance/propuesta), lista ordenada de piezas chicas y la sección de cámara/micrófono/movimiento que pidió L18.

### El respaldo local, montado desde cero

No había un respaldo local con datos inventados listo para reusar (las piezas anteriores con este patrón — OL-095, OL-100 — dejaron el suyo en su propio scratchpad, no en el repo). Se montó uno nuevo, siguiendo la memoria del proyecto y `docs/ops/MEMORIA_GESTOR.md`:

- **`backend.mjs`** (Node puro, sin dependencias): imita `/auth/v1/token` (refresco de sesión), `/auth/v1/user` y las tablas/RPC que necesitan los tres formularios (`lugares`, `artistas`, `eventos`, `perfiles`, `lugares_cuentas`, `artistas_cuentas`, `lugares_con_nombre`, `artistas_con_nombre`, `subcategorias_de`); rechaza con 405 cualquier insert/update/delete real, nunca el refresco ni las RPC (lección de OL-088 ya en la memoria del proyecto). Datos inventados: un lugar y un evento normales, más un lugar, un artista y un evento al tope de longitud (nombre de 120/80, descripción de 600–1000, dirección de 200, enlace largo), una cuenta admin inventada.
- **`.env.local`** en el worktree (nunca el `.env` real): `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4180` y una llave pública falsa; sin token de Mapbox (nunca se copia uno real aquí).
- **Cookie de sesión** `sb-127-auth-token` = `base64-` + base64url del JSON de sesión con un JWT sin firma válida (memoria del proyecto, usado ya en la bitácora 070).

### Dos hallazgos técnicos, para quien retome este método

1. **`next dev` (Turbopack) no hidrataba nunca en este entorno.** Medido con `Object.getOwnPropertyNames(el)` sobre cada nodo del DOM buscando `__reactFiber$`/`__reactProps$`: con `next dev`, 0 de ~150 nodos tenían fibra de React (solo la propia barra de herramientas de Next, que monta su propio árbol aparte), y ningún clic ni tecla disparaba nada — aunque el campo sí aceptaba texto a nivel de navegador, lo que hacía parecer que "funcionaba" en una primera ronda de capturas que en realidad estaba completamente muda. Con `next build && next start`, hidrata normal (116 de 142 nodos con fibra en la misma pantalla). No se investigó la causa raíz (probablemente el cliente de HMR de Turbopack en este entorno, cuyo WebSocket sí fallaba repetidamente al navegar desde el navegador de la sesión — aunque un Chrome headless aparte, sin ese fallo de WebSocket, tampoco hidrataba, así que no es solo eso). Quedó anotado en el documento 33 para la próxima pieza con pantalla.
2. **El respaldo no puede depender del header `Accept: application/vnd.pgrst.object+json` para decidir si una consulta es "una fila".** En este runtime (`@supabase/ssr` del lado del servidor, sobre Next 16.3.5), `.maybeSingle()`/`.single()` llegan con `Accept: */*` — el cliente arma el objeto único él mismo a partir de un arreglo, no depende de la negociación del servidor. Un respaldo que sí dependa de ese header (como el primer intento de este mismo backend) devuelve un objeto cuando no debería, o dos filas con el mismo id chocan silenciosamente y una tapa a la otra: el editar lugar mostró "Esto ya no está" (`notFound()`) sin ningún error visible hasta que se corrigió. El respaldo final siempre devuelve un arreglo (filtrado por `id=eq.` si viene en la URL) y deja que el cliente decida.
3. **Escribir en un campo o hacer clic desde un script de CDP tiene que usar eventos reales** (`Input.dispatchMouseEvent`/`Input.dispatchKeyEvent`), no tocar `el.value` ni llamar a `el.click()` desde `Runtime.evaluate`: React 19 no tiene ya el `_valueTracker` de versiones viejas (el truco de las piezas anteriores para simular un input no funciona aquí), y sin el clic/tecla real el estado de React nunca se entera. Confirmado comparando ambos métodos sobre el mismo campo.

### Capturas

25 recorridos (PNG reales, 390×844 y varios anchos, con y sin teclado simulado) en el scratchpad de la sesión (`friccion-formularios/capturas/`), con `medidas.json` (la medición de desbordes de cada uno: **0 elementos fuera del viewport y ningún scroll horizontal en los 25**). Al repo solo entraron las seis que cita el documento 33, en [`docs/rediseno/capturas-33/`](../../../rediseno/capturas-33/).

## Hallazgos (resumen; completos en el documento 33)

- **F1, media.** En el alta de lugar y de artista, la ayuda de qué falta sigue dentro del botón (`canon.faltaBoton`), contra el canon ampliado por el founder el 2026-09-21 al firmar OL-100. Ya es el trabajo reservado de la pieza **B7**; esta pieza solo confirma con captura que sigue pendiente.
- **F2, alta.** En el alta de lugar, la lista de "ya está registrado" (y las sugerencias de Mapbox, cuando haya token) no flotan: empujan Tipo, Más y el botón hacia abajo (`styles.flotante` en `FormularioLugar.module.css` no tiene `position: absolute` pese al nombre). Contra la regla dura del gestor del mismo día: "las listas de sugerencias flotan siempre sobre el layout, no lo empujan". Pieza chica propuesta, un archivo de CSS.
- **F5, baja.** Los tres campos de foto (`<input type="file">`) no tienen `capture`, pero el selector del teléfono ya ofrece "Tomar foto" junto con el carrete: no falta la cámara, cuesta un toque más. **Corrección del gestor tras revisar la entrega:** `capture="environment"` no suma la cámara, la fuerza y quita la galería — romperia el caso más común (subir una foto ya guardada). No se propone como pieza lista; queda como pregunta abierta al founder (dos salidas por intención, si de verdad quiere ahorrar el toque).
- **F6, baja.** A 320 px "Atrás" se recorta a "Atr…" (recorte intencional del CSS, pero se ve en el ancho más chico de esta pieza) mientras sobra espacio libre a la derecha del logotipo (rejilla de tres columnas simétricas que no reparte lo que la tercera columna no usa). Es de `ui/Barra`, fuera del alcance; anotado para quien la tome.
- **F3, F4, F7, F8, F9, F10 — comprobaciones limpias**, sin fricción: la hoja "Dónde es" sí se acomoda a un teclado simulado de verdad (medido con `visualViewport`, no solo mirado); el campo del nombre del alta de evento no se tapa con el teclado (confirma que L2/OL-100 no tuvo regresión); 0 desbordes medidos en los 25 recorridos; las subcategorías de artista (OL-101) y el aviso "ya está registrado" (en artista) funcionan bien, como ejemplo del canon funcionando; "Es en otro sitio" con datos largos sigue sin la regresión que llegó a producción una vez (OL-100).

## Cámara, micrófono, movimiento (L18)

- **Cámara:** ya se llega a ella desde el selector de archivos (F5); no se propone `capture` porque rompería elegir del carrete. Pregunta abierta para el founder, no pieza lista.
- **Micrófono:** ya lo da el teclado del teléfono sin ningún código propio.
- **Acelerómetro/orientación:** no aplica a estos tres formularios (sí a C3, Cercanos sin mapa — fuera de esta pieza).
- **NFC y vibración:** confirmado que no están disponibles en la web del iPhone (doc 24, CLAUDE.md); nada propuesto que dependa de ellas.

## Revisión del gestor y corrección (2026-09-21)

El gestor leyó el documento entero y abrió las capturas antes de aceptar. Un hallazgo: F5 decía que `capture="environment"` "ofrece la cámara como salida directa conservando la galería" — **equivocado**: en iOS y Android `capture` abre la cámara y **quita** la opción de elegir del carrete; con eso se habría roto el caso más común del proyecto (subir una foto ya guardada). El selector de archivos de hoy, además, ya ofrece "Tomar foto" en su propio menú. Corregido F5 (gravedad baja, no pieza lista — pregunta abierta al founder) en el documento, la bitácora y la sección de capacidades; F5 sale de la lista de piezas chicas. Nota menor añadida también a F6: en la propia captura a 320 px sobra espacio libre a la derecha del logotipo (la rejilla de tres columnas simétricas no lo reparte), dicho sin proponer más. Commit modificado con `--amend` (no se había subido).

## Verificación

Sin código de la app: no aplican lint/typecheck/test. Documentación revisada contra el diff; capturas PNG reales abiertas y miradas antes de citarlas (disciplina front-visual). Medición de desbordes con `getBoundingClientRect()`, no a ojo, con los números en `medidas.json`.

## Pasos

- [x] Aviso de arranque al gestor y su visto bueno.
- [x] Rama `friccion-formularios` desde `origin/main`.
- [x] Leer CLAUDE.md, GESTION_DE_CAMBIOS, MEMORIA_GESTOR, ASIGNACIONES, COLA_DE_PIEZAS, doc 24 (nota de capacidades) y el canon de formularios.
- [x] Leer los tres formularios y sus hojas (`FormularioEvento`, `FormularioLugar`, `FormularioArtista`, `HojaDondeEs`, `HojaDonde`, `HojaCiudad`).
- [x] Montar el respaldo local (backend Node + `.env.local` + cookie de sesión), sin tocar `.env` real.
- [x] Levantar la app (`next build && next start`, tras descubrir que `next dev` no hidrataba) y verificar el respaldo acepta refresco y RPC.
- [x] Recorrer las 14 pantallas/estados de la tabla, en los 4 tamaños donde correspondía, con y sin teclado simulado.
- [x] Medir desbordes con `getBoundingClientRect()` en los 25 recorridos.
- [x] Documento `docs/rediseno/33-friccion-formularios.md` con los 10 hallazgos, la sección de capacidades y la lista de piezas chicas.
- [x] Seis capturas citadas copiadas a `docs/rediseno/capturas-33/`.
- [x] Entrada propia OL-109 en `docs/ops/OPEN_LOOPS.md`.
- [x] Commit local; aviso "listo" al gestor.
