# 33 · Fricción en los tres formularios (OL-109, pieza D3)

**Fecha:** 2026-09-21 · **Rama:** `friccion-formularios`, solo documentos y capturas · **OL:** OL-109 · **Bitácora:** [144](../bitacora/2026/09/144-friccion-formularios.md)

Pieza D3 de la cola (`docs/ops/COLA_DE_PIEZAS.md`), sobre L18: recorrer el alta y la edición de evento, artista y lugar en varios tamaños de teléfono, con el teclado dentro y fuera, y listar las fricciones. Después de A7 (OL-100, ya en producción). Sin tocar código de la app: este documento es la entrega completa.

## Cómo se probó

- **App real corriendo**, no un prototipo: `next build && next start` de esta rama, en un puerto propio (3177), contra un **respaldo 100 % local inventado** (Node puro, sin dependencias) que imita Supabase — acepta `POST /auth/v1/token` (refresco de sesión) y `POST /rest/v1/rpc/*` (todas las RPC de solo lectura), y rechaza con 405 cualquier intento real de escritura. `.env.local` con `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4180` y una llave pública falsa; el `.env` real nunca entró a esta carpeta. Sesión de una cuenta admin inventada (para ver los campos de administrador que también usa un lugar publicado por su autor). Datos inventados: un lugar y un evento normales, y un lugar, un artista y un evento **al tope de longitud** (nombre de 120, descripción de 600–1000, dirección de 200, enlace largo) para forzar los desbordes, siguiendo el patrón que ya usaron OL-095 y OL-100 (bitácoras 130, 135, 139).
- **Capturas PNG reales** con Chrome headless por CDP (protocolo puro, WebSocket nativo de Node 22, sin instalar nada — mismo método que OL-100), con la tipografía y los tokens del proyecto, a 320×568, 375×667, 390×844 y 430×932. Con el teclado fuera, y con un **teclado simulado**: sobre la hoja "Dónde es" (que sí escucha `window.visualViewport`, como toda `ui/Hoja`) se sobrescribió su alto de verdad y se disparó `resize`, para ver cómo se acomoda la hoja de verdad, no un dibujo; sobre las pantallas sin hoja, una franja gris rotulada "teclado simulado" en el 42 % inferior (la hoja real de iOS no se puede fabricar en un Chrome de escritorio: la franja solo marca el área que un teclado real taparía, y se avisa así en cada captura donde aparece).
- **Medición de desbordes**, no "se ve bien": `getBoundingClientRect()` sobre cada elemento en cada tamaño, contando cuántos tienen el borde derecho más allá del viewport, más `scrollWidth` vs `clientWidth` de la página. Los 25 recorridos (9 pantallas × hasta 4 tamaños) dieron **0 elementos fuera y ningún scroll horizontal** en todos los casos — tabla completa en `medidas.json` del scratchpad de esta sesión.
- Interacción con eventos reales de CDP (clic con coordenadas, tecla por tecla), no con el DOM tocado a mano: con el DOM tocado a mano React 19 (el que trae Next 16) no se entera del cambio y no dispara nada, así que esa vía no prueba nada real.

**Ruta de las capturas completas** (25 archivos + `medidas.json`): en el scratchpad de esta sesión, `friccion-formularios/capturas/`. Al repo solo entraron las seis que cita este documento, en [`docs/rediseno/capturas-33/`](capturas-33/).

### Un hallazgo aparte, para el gestor y para quien retome este método

**Con `next dev` (Turbopack) la app en este entorno no hidrataba nunca**: cero de ~150 nodos del DOM con fibra de React, ningún manejador respondía a clic ni a tecla, aunque el campo aceptaba texto a nivel de navegador (por eso una primera ronda de capturas parecía "funcionar" y en realidad estaba muda). Con `next build && next start` hidrata normal. No se investigó la causa exacta (probablemente algo del cliente de HMR de Turbopack en este entorno); queda anotado por si otra pieza con pantalla tropieza con lo mismo. Aparte, el respaldo tuvo que dejar de usar el header `Accept: application/vnd.pgrst.object+json` para decidir si una consulta es "una fila": en este runtime (`@supabase/ssr` server-side sobre Next 16) esa consulta llega con `Accept: */*`, y el cliente arma el objeto único él mismo a partir de un arreglo. Un respaldo que dependa de ese header (como el de otras piezas, que copiaban ese patrón) puede estar devolviendo 404 sin que sea un error de la app.

## Alcance y límites de esta ronda

- **Sin token de Mapbox** (nunca se copia una llave real a esta carpeta): las sugerencias de dirección de Mapbox nunca aparecieron. Se ve como una nota honesta en las capturas ("Falta el token de Mapbox…"), no se inventó. Donde había otra fuente sin Mapbox (los lugares ya registrados, las RPC de "¿ya existe?"), sí se probó de verdad.
- Sesión de una cuenta **administradora** inventada: los tres formularios muestran también el campo que solo ve el admin (pegar una URL de imagen, marcar un lugar privado). El resto de la pantalla es igual para cualquier persona con sesión.
- No se probó con el dedo en un iPhone real (ni con VoiceOver): esta pieza es de escritorio con teclado y mouse simulados. El founder sigue siendo quien prueba con el dedo, como en el resto de piezas de esta cola.
- No es el barrido completo de 4 tamaños × 2 estados de teclado × datos normales/al tope × 6 pantallas (96 casos): con el tiempo de esta pieza se cubrió lo representativo — los 3 casos "al tope" en los 4 tamaños (el que más riesgo de desborde tiene), y el resto centrado en 390×844 (el tamaño de referencia de todas las piezas anteriores) con algún caso repetido a 320 o 375 para completar el barrido. La tabla de "Qué se recorrió" lo deja explícito.

## Qué se recorrió

| Pantalla | Tamaños | Teclado | Datos |
| --- | --- | --- | --- |
| Alta de evento, vacío | 390 | fuera | — |
| Alta de evento, "Dónde es" con lugares registrados | 390 | fuera | normal |
| Alta de evento, "Es en otro sitio" | 390 | fuera | al tope (nombre + dirección de 390: bitácora 135) |
| Alta de evento, "Dónde es" con lugares | 390, 320 | **simulado (visualViewport real)** | normal |
| Alta de evento, campo Nombre | 390 | **simulado (franja)** | — |
| Editar evento | 390, 375, 320, 430 | fuera | al tope |
| Alta de lugar, vacío | 390 | fuera | — |
| Alta de lugar, nombre con sugerencias/"ya existe" | 390, 375 | fuera | normal |
| Alta de lugar, Más (descripción) | 390 | **simulado (franja)** | normal |
| Editar lugar | 390, 375, 320, 430 | fuera | al tope |
| Alta de artista, vacío | 390 | fuera | — |
| Alta de artista, Qué hace con subcategorías | 390 | fuera | normal |
| Alta de artista, nombre repetido | 390 | fuera | al tope |
| Editar artista | 390, 375, 320, 430 | fuera | al tope |

## Fricciones encontradas

Cada una con pantalla, paso, qué pasa, por qué estorba (UX invisible: ¿el sistema hace el trabajo? ¿una cosa a la vez? ¿el gesto gana?), gravedad y arreglo con el canon.

### F1 · En el alta de lugar, la ayuda de qué falta sigue dentro del botón — Alta

**Pantalla:** alta de lugar, nombre escrito y Dónde sin resolver ([captura](capturas-33/lugar-alta-sugerencias--390x844.png)).
**Paso:** escribir un nombre y no tocar nada más; mirar el botón "Publicar lugar".
**Qué pasa:** el botón dice **"Publicar lugar falta dónde está"**, con la ayuda metida dentro del propio botón, en letra chica.
**Por qué estorba:** el founder amplió el canon el 2026-09-21, al firmar OL-100: *"Si en el campo, es ayuda para recuperarse del error en el contexto, aplica como canon para todos los formularios."* — la ayuda va **bajo el campo o el renglón que falta**, no dentro del botón (es más difícil de leer ahí, y mezcla la acción con la explicación: dos cosas en un solo control). El alta de evento ya lo hace así (OL-100); el alta de lugar y el alta de artista se quedaron con el patrón viejo (`canon.faltaBoton`, confirmado leyendo `FormularioLugar.tsx:422` y `FormularioArtista.tsx:385`).
**Gravedad:** media. No bloquea publicar, pero repite la fricción que el founder ya señaló una vez.
**Arreglo:** esto es exactamente lo que ya tiene reservada la pieza **B7** de la cola (`docs/ops/COLA_DE_PIEZAS.md`): aplicar el canon ampliado en `FormularioLugar.tsx`, `FormularioArtista.tsx` y `FormularioPerfil.tsx`. Esta pieza no la adelanta (no toca código); solo confirma con captura que sigue pendiente y por qué importa.

### F2 · Las sugerencias de "ya está registrado" en el alta de lugar no flotan: empujan Tipo y el botón hacia abajo — Alta

**Pantalla:** alta de lugar, nombre que coincide con uno ya registrado ([misma captura](capturas-33/lugar-alta-sugerencias--390x844.png)).
**Paso:** escribir "Foro" (coincide con "Foro Cultural de la Ciudad de las Ideas", ya registrado).
**Qué pasa:** aparece el aviso "Ya está registrado: …" **en el flujo normal de la página**: empuja el renglón Dónde, Tipo, Más y el botón hacia abajo. Con Mapbox activo pasaría lo mismo con la lista de sugerencias de dirección (`styles.flotante` en `FormularioLugar.module.css:15`): a pesar del nombre de la clase, no tiene `position: absolute` ni nada parecido — es un bloque normal con solo un margen negativo y una sombra.
**Por qué estorba:** el gestor dejó una regla dura el mismo día, tras el segundo aviso del founder sobre maquetación: *"las listas de sugerencias flotan siempre sobre el layout, no lo empujan"* (`docs/ops/MEMORIA_GESTOR.md`, 2026-09-21). El sistema no hace el trabajo por la persona: cada letra que escribe puede mover todo lo de abajo, y el dedo que iba a tocar "Cambiar" en Tipo ahora cae sobre otra cosa.
**Gravedad:** alta — es justo la regla que el founder pidió por escrito, en la única pantalla de las tres que todavía no la sigue (en el alta de evento, `HojaDondeEs` vive dentro de una hoja aparte, y ese caso ya está resuelto).
**Arreglo:** que la lista de "ya existe" y la de sugerencias de `FormularioLugar` usen `position: absolute` (o el mismo patrón que ya corrigió el gestor en `HojaDondeEs` para "Es en otro sitio": nunca reutilizar una clase del canon con `grid-area` fuera de su rejilla). Pieza chica, un solo archivo de CSS.

### F3 · La hoja "Dónde es" sí se acomoda al teclado — Alta (confirmación, no fricción)

**Pantalla:** alta de evento, "Dónde es" abierta, con un lugar de nombre largo en la lista ([captura](capturas-33/evento-donde-teclado-visualviewport--390x844.png), franja de teclado simulada de verdad con `visualViewport`, no solo un dibujo).
**Qué pasa:** medido con el DOM (no solo mirado): con el alto visible reducido al 58 % (teclado simulado al 42 %), la hoja recalcula su propio alto y termina exactamente en ese 58 % — `top: 0; height: 490px` sobre 844, la hoja midiendo 442px hasta el borde. No se sale por debajo del área visible ni dos recuadros compiten por el mismo espacio.
**Por qué se anota:** es justo el tipo de comprobación que pidió el founder en L18 ("teclado dentro y fuera") y el mecanismo (`ui/Hoja` escuchando `window.visualViewport`) ya se construyó pensando en esto (2026-09-15). Vale la pena dejarlo escrito como comprobación positiva, no solo reportar lo que falla.
**Gravedad:** n/a (sin fricción).

### F4 · El campo del nombre en el alta de evento no se tapa con el teclado — Alta (confirmación, no fricción)

**Pantalla:** alta de evento, recién abierta, con el foco puesto a mano en el campo del nombre y la franja de teclado encima ([captura](capturas-33/evento-alta-teclado-nombre--390x844.png)).
**Qué pasa:** con el teclado tapando el 42 % inferior, el nombre, "Falta el nombre.", Cuándo, Dónde (con la lupa) y Quién siguen visibles arriba de la franja.
**Por qué se anota:** confirma que el arreglo de L2 (quitar el `autoFocus` del nombre, OL-100, firmado 2026-09-21) sigue sin regresión: antes el teclado salía solo al abrir la pantalla y tapaba la tarjeta del cartel; ahora nadie ve el teclado hasta que toca el campo, y lo que sí importa sigue a la vista.
**Gravedad:** n/a (sin fricción).

### F5 · La cámara nunca es la salida directa al subir portada/foto — Alta y Edición, los tres formularios

**Pantalla:** "Más" de lugar y de artista (portada, foto), "Más" de evento (cartel o foto).
**Paso:** tocar "Poner una foto de portada" / "Elegir una foto" / "Poner el cartel o una foto".
**Qué pasa:** los tres son `<input type="file" accept="image/*">` sin el atributo `capture`. En el teléfono eso abre el selector general de iOS/Android, que **ya ofrece "Tomar foto" en su propio menú**, junto con elegir del carrete — no hay ausencia de cámara, hay un paso extra (abrir el selector, elegir "Tomar foto") para llegar a ella.
**Por qué estorba, y por qué no es tan simple como sumar `capture`:** L18 aprueba el uso de la cámara para completar tareas, y en el alta de lugar y de artista lo más común de verdad es tomar la foto ahí mismo (un cartel recién impreso, la fachada de un lugar). Pero **`capture="environment"` no "ofrece la cámara además de la galería": en iOS y Android abre la cámara directo y QUITA la opción de elegir del carrete** (corrección del gestor tras revisar esta entrega, 2026-09-21) — con eso, el caso más común del proyecto (subir un cartel que ya se tiene guardado en el teléfono, o una foto vieja de portada) se rompería.
**Gravedad:** baja. El selector de hoy ya llega a la cámara en un toque más; no es que falte del todo.
**Posible arreglo, no propuesto a firmar aquí:** dos salidas por intención en el mismo renglón ("Tomar foto" con `capture`, "Elegir" sin él), como ya hace la tarjeta del cartel del alta de evento con su propio patrón de icono-acción — pero eso es una pieza con pantalla (dos controles en vez de uno, con su propio diseño), no un cambio de una línea, y solo tiene sentido si el founder de verdad quiere ahorrar ese toque; se anota como pregunta abierta, no como pieza lista para tomar, y necesitaría probarse con el dedo en un iPhone real (el comportamiento exacto del selector varía entre iOS y Android y entre versiones).

### F6 · A 320 px, "Atrás" se recorta a "Atr…" — Alta y Edición, las tres pantallas

**Pantalla:** cabecera de cualquier alta o edición, a 320 px de ancho ([captura, esquina superior izquierda](capturas-33/lugar-editar-tope--320x568.png); ampliada en la bitácora).
**Paso:** mirar el botón de volver junto al logotipo SMSNSTRS.
**Qué pasa:** el texto visible del botón "Atrás" se recorta a "Atr…". Es intencional a nivel de código (`Atras.module.css:23`, comentario propio: *"el texto se recorta si la barra va apretada"*), pero a 320 px — el ancho más chico que pide esta pieza — se recorta tanto que el botón se queda solo con el icono y tres letras; el `aria-label` completo (`Atrás (…)`) sigue llegando bien a un lector de pantalla, así que no es un problema de accesibilidad, solo visual.
**Por qué estorba:** el gesto (el chevron) sigue comunicando "volver", pero al founder o a cualquiera que lea rápido "Atr…" no le dice nada por sí solo. Y no es que falte espacio de verdad: en la misma captura, a la derecha del logotipo **sobra una franja libre** casi tan ancha como lo que le faltó a "Atrás" — la barra es una rejilla de tres columnas simétricas (`1fr auto 1fr`) para mantener el logotipo centrado, y cuando la tercera columna no tiene nada (no hay menú ni ✕), ese espacio libre se queda ahí sin repartirse, en vez de dárselo a "Atrás".
**Gravedad:** baja. Solo se ve en el ancho más chico de los cuatro que pide esta pieza (320 px, iPhone SE de una generación vieja); en 375 px ya no pasa.
**Arreglo:** no es parte de esta pieza (es de la cabecera compartida `ui/Barra`, no de los tres formularios); se deja dicho, sin proponer el rediseño de la rejilla de tres columnas — eso pesa las tres pantallas de la app, no solo estos tres formularios.

### F7 · Sin desbordes medidos con datos al tope, en los cuatro tamaños

**Pantallas:** editar evento, editar lugar y editar artista, con datos al tope de longitud (nombre de 120/80, descripción de 600–1000, dirección de 200, enlace largo), en 320, 375, 390 y 430 px ([ejemplo a 320](capturas-33/lugar-editar-tope--320x568.png)).
**Qué pasa:** `getBoundingClientRect()` sobre cada elemento: **0 elementos con el borde derecho fuera del viewport y `scrollWidth === clientWidth`** en los 12 recorridos (3 pantallas × 4 tamaños), más los 13 restantes de la tabla de arriba. Detalle completo en `medidas.json`.
**Por qué se anota:** es justo lo que pidió el gestor como comprobación dura tras el segundo aviso del founder sobre maquetación (`docs/ops/MEMORIA_GESTOR.md`, 2026-09-21): "ningún hijo con el borde derecho más allá de su contenedor, con los números en la entrega". Esta ronda no encontró ningún desborde en los tres formularios — quiere decir que el canon (`ui/FormularioCanon`, `ui/Campo`, `ui/Sugerencia`) sostiene bien nombres y descripciones largas donde ya se usa tal cual. La única lista que no sigue el canon de "flotar" es la de F2, y ese es un problema de comportamiento (empuja el layout), no de desborde horizontal.
**Gravedad:** n/a (comprobación limpia, se deja escrita como evidencia).

### F8 · Subcategorías de artista: funciona bien, un ejemplo de "el sistema hace el trabajo" — Alta

**Pantalla:** alta de artista, nombre que ya deduce la disciplina, renglón "Qué hace" abierto ([captura](capturas-33/artista-alta-subcategorias--390x844.png)).
**Qué pasa:** al escribir un nombre que ya sugiere una disciplina (aquí "música"), el renglón la deduce sola; al abrirlo, aparecen las subcategorías que ya usa esa disciplina como chips ("son huasteco", "jazz") más "Otra…" para escribir una nueva. Ni un campo de texto vacío por defecto, ni la persona tiene que adivinar cómo se escribió antes "son huasteco" en otras fichas.
**Por qué se anota:** es la pieza OL-101 (L47) ya construida y funcionando tal como la describe su documento (`27-subcategorias-de-disciplina.md`); se deja como ejemplo positivo del canon funcionando bien, y como el patrón a copiar si F1/F2 se corrigen.
**Gravedad:** n/a (sin fricción).

### F9 · "Ya está registrado" con enlace: funciona bien en artista, igual que en lugar — Alta

**Pantalla:** alta de artista, nombre que coincide con uno ya registrado ([captura](capturas-33/artista-alta-repetido--390x844.png)).
**Qué pasa:** al escribir el nombre completo de un artista ya registrado, aparece "Ya está registrado: [enlace] · Son huasteco y jarocho · Grupo. Ábrelo y, si es tuyo, dilo ahí." — el sistema evita el duplicado antes de que la persona tenga que enviarlo y toparse con un error.
**Por qué se anota:** mismo patrón que en lugar (RPC `artistas_con_nombre`/`lugares_con_nombre`), funcionando bien en los dos formularios; solo le falta a lugar que la lista no empuje el layout (F2). Se deja como evidencia de que la RPC en sí no es el problema.
**Gravedad:** n/a (sin fricción); en lugar, ver F2.

### F10 · "Es en otro sitio" con nombre y dirección largos, sin la regresión de producción

**Pantalla:** alta de evento, "Es en otro sitio", con el nombre de 90 caracteres y la dirección de 149.
**Qué pasa:** una sola columna, todo apilado, sin desborde horizontal a 390 px — el arreglo que hizo esta misma pieza el 2026-09-21 (`alta-evento-lugar-correccion`, PR #130) para la rejilla rota (`canon.cuerpoNota` con `grid-area` fuera de su rejilla) sigue sostenido.
**Por qué se anota:** es una regresión conocida (llegó rota a producción una vez); vale la pena que quede una comprobación explícita de esta ronda además de la que hizo esa pieza.
**Gravedad:** n/a (comprobación limpia).

## Cámara, micrófono y movimiento: dónde ahorrarían trabajo de verdad y dónde no

L18 aprueba el uso de "cámara, nfc, micrófono, acelerómetro, haptics" para ayudar a completar las tareas de estos formularios. En el estado de hoy:

- **Cámara — ya se llega a ella, en un toque más** (F5): el selector de archivos del teléfono ya ofrece "Tomar foto" junto con el carrete; no hay ausencia real. Forzar la cámara con `capture` (en vez de sumarla como una segunda salida) rompería el caso más común (subir una foto que ya se tiene guardada), así que no se propone como pieza lista — queda como pregunta abierta para el founder, con dos salidas por intención si de verdad quiere ahorrar ese toque.
- **Micrófono — ya lo da el teléfono sin código**: los campos de texto largo (Descripción) son `<input>`/`<textarea>` normales; en iOS y Android el propio teclado trae el botón de dictado. No hay nada que la app tenga que construir para eso.
- **Movimiento y orientación (acelerómetro) — no aplica a estos tres formularios**: donde tendría sentido (una brújula al buscar "Cercanos", por ejemplo) es la pieza C3 de la cola, no el alta/edición de evento, artista o lugar. Aquí no se identificó un renglón que se beneficiara de la orientación del teléfono.
- **NFC y vibración (haptics) — no están disponibles**: confirmado en `docs/rediseno/24-grafo-cultural.md` (nota de capacidades) y en CLAUDE.md: en la web del iPhone, Safari no ofrece NFC ni vibración; solo llegarían con la app nativa de tienda, hoy detenida. No se propone nada aquí que dependa de ellas.

## Lo que vio y no toca esta pieza: `sugerencias-flotantes`

Mientras se probaba el alta de evento, se abrió la hoja "Es en otro sitio" (donde otro operador trabaja en paralelo, rama `sugerencias-flotantes`, sobre la lista flotante de sugerencias y mejores resultados de búsqueda de esa misma hoja). Lo que se vio ahí (además de lo ya cubierto en F10): con Mapbox apagado, esa hoja no muestra ninguna sugerencia — comportamiento esperado, no una fricción nueva; nada que reportar que esa pieza no vaya a ver ya con Mapbox encendido. No se propone rehacer nada de esa hoja aquí, como pidió el gestor.

## Piezas chicas propuestas, en orden

1. **F2 — que las listas de "ya existe" y de sugerencias en `FormularioLugar` floten de verdad** (CSS, un archivo: `FormularioLugar.module.css`). La más urgente: es la regla que el founder ya pidió por escrito y la única de las tres pantallas que no la sigue.
2. **F1 — adelantar a `FormularioLugar` y `FormularioArtista` lo que ya tiene reservado B7** (ayuda bajo el campo, no dentro del botón). Si B7 ya está encargada, esta captura sirve de evidencia de que sigue pendiente; si no, se propone encargarla pronto — es la misma regla que F2, así que conviene resolverlas juntas.
3. **F6 — repartir el espacio de la cabecera a 320 px** (`ui/Barra`/`ui/Atras`, fuera del alcance de esta pieza pero anotado para quien la tome). Baja prioridad: solo se ve en el ancho más chico soportado.

Aparte, no como pieza lista sino como **pregunta para el founder**: **F5**, si vale la pena sumar "Tomar foto" como una segunda salida junto a "Elegir" en los tres campos de foto (el selector de hoy ya llega a la cámara en un toque más; forzarla con `capture` sola rompería subir una foto ya guardada). Solo se convierte en pieza si el founder dice que sí quiere ahorrar ese toque.

## Estado

Documento y capturas completos, sin tocar código de la app. `.env.local` y la carpeta `docs/rediseno/capturas-33/` son lo único nuevo del árbol de trabajo (además de este documento y la bitácora); el respaldo local y el script de capturas quedan en el scratchpad de la sesión, no en el repo. Entrega al gestor con "listo".
