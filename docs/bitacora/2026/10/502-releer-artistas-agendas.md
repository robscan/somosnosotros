# 502 · Relectura de artistas en los eventos de las agendas

**Pieza:** OL-470. **Rama:** `releer-artistas-agendas`, base `origin/main` (`12ab4582`). **Fecha:** 2026-10-28. **Operador:** Claude (agente del Gestor de cambios VII).
**Manda:** el founder, 2026-10-28: «En museo Leonora Carrington se dice 40 eventos con nueve artistas, pero aparecen exposiciones colectivas y eventos que pudieron tener artistas y no se detectaron. El riesgo de que eso pase es real y podríamos… hacer una relectura de los lugares para ver si podemos rescatar más información». Dato del gestor: de 898 eventos con `origen like 'agenda-secult-2026-%'`, 682 sin artista ligado; la lectura de los PDF solo anotó `artistas` en 271 filas y en el resto el nombre va en el título o la descripción.
**Estado:** hecho en su rama, **sin migración ni variables nuevas** (usa `ANTHROPIC_API_KEY`, que ya está en `.env` de la Mac). No se corrió contra producción: lo corre el gestor.

## Qué hace

Un paso de la Mac, `scripts/instituciones/releer-artistas.ts` (en `correr.mjs`):

1. **Qué lee.** De la base, los eventos de la ciudad con `origen` que empieza por `--origen` (por omisión `agenda-secult-2026-`), visibles y sin borrador, **sin ninguna liga en `eventos_artistas`** y que ninguna relectura anterior haya leído (los ids leídos quedan en `resumen.leidos` de su corrida; `--releer` los vuelve a leer). Por fecha; `--limite N` corta.
2. **Tandas.** De 25 en 25 (`--tanda`, hasta 60): cada evento una línea JSON numerada (título, descripción, lugar, día local, clase) dentro de `<eventos>…</eventos>`; los `<` y `>` del texto se quitan para que la agenda no pueda cerrar la etiqueta. Una llamada por tanda con `llamarConEntrega` (`src/lib/rutinas/claude.ts`, que ahora acepta `modelo`): **Haiku 5.5** por omisión, **Sonnet 5.5** con `--modelo sonnet`; esfuerzo bajo; la entrega es una herramienta estricta (`entregar_artistas`: por evento `n`, cada artista con `nombre`, `fragmento`, `papel` —expone, dirige, toca, canta, actua, baila, presenta, imparte, escribe, otro— y `detalle` o null), validada otra vez con zod. Las reglas dicen qué no es un artista (títulos de obras, exposiciones, libros, festivales; instituciones, escuelas, el alumnado, clubes; el lugar; genéricos como «exposición colectiva») y que lo de `<eventos>` son datos, no instrucciones.
3. **Nada inventado** (`comprobar`): un nombre sigue solo si su `fragmento` está en el título o la descripción de **ese** evento (palabras enteras y seguidas, sin acentos, mayúsculas ni signos), el nombre está entero dentro del fragmento, no es lo que `motivoNoArtista` de OL-440 descarta (alumnado, institución o asociación, varios grupos) y no es el nombre del lugar. El `detalle` solo queda si también está en el fragmento y cabe en la ficha (40). Lo que no pasa se lista con su motivo. (Lo que no es un artista vive en `motivoNoArtista` de `ligar-artistas.ts`; `nombresArtistas.ts` aporta las formas del nombre con que se cruza.)
4. **Cruce** con `cruzarNombre` (`src/lib/cruceArtistas.ts`), con un nivel menos que OL-440: **«integrante» no liga** (nombrar a una persona que aparece en el detalle de un grupo no es nombrar al grupo). Una ficha visible → liga en `eventos_artistas` con su orden; una oculta, dos parecidas o un integrante → no se liga ni se propone (al informe).
5. **Propuesta** de los que no tienen ficha, como OL-440: una corrida `artistas` **terminada** a nombre de `--autor` (un admin), con `fuente` **«Relectura de títulos de las agendas»**, `gasto_usd` real, `tope_usd` = `--tope-usd`, `parametros.guion = releer-artistas` y el modelo; cada propuesta con `datos` { nombre, disciplina (la del nombre, la de su papel —expone → artes visuales, toca/canta → música, actúa → teatro, baila → danza, escribe → letras— o la que más se repite en sus eventos; si nada, «por completar»), detalle (solo el oficio artístico que dice el texto: «Escultor», «Acuarelista», «Escritora»; si no, vacío y la ficha queda «por completar»), tipo (por el nombre: una persona es solista; grupo o colectivo solo si el nombre lo dice), ciudad, redes [], leida, **papel**, **fragmento**, url (el PDF del evento, `eventos.fuente_url`), variantes y **eventos** (los ids, que `aceptar_propuesta` liga al crear la ficha) }. Las variantes del mismo artista se juntan («Tere Palaú» y «Tere Palau»; «Pan y Sal» y «Colectivo Pan y Sal»). Lo ya propuesto sin decidir suma eventos; lo rechazado no vuelve.
6. **Gasto y tope.** Cada llamada pasa por `costoDeUso` con el precio de su modelo; antes de cada tanda, si lo gastado más la tanda más cara no cabe en `--tope-usd` (por omisión 5, hasta 50 como cualquier corrida), se para y el informe lo dice. Una tanda que falla no cuenta como leída (se vuelve a leer la próxima vez).
7. **Informe** `scripts/instituciones/salida/releer-artistas-[simulado-]<fecha>.md`: eventos por leer y leídos, nombres que entregó el modelo, los que pasaron el control, ligados (por ficha, con sus eventos), propuestos (con disciplina, tipo, papel, detalle y fragmento), propuestas que suman eventos, descartados por motivo y uno por uno, tandas fallidas y gasto. Sin `--simular`, también el JSON de ids de lo que entró (para deshacer).
8. **Dos veces no repite nada:** lo ligado ya tiene artista y lo demás ya está en `resumen.leidos`, así que la segunda corrida no llama al modelo ni crea corrida; con `--releer` vuelve a pagar la lectura, pero las ligas se saltan y lo propuesto solo suma eventos nuevos.

`--simular` no escribe nada en la base (sí llama al modelo y su gasto solo queda en el informe: no se descuenta del crédito de Corridas). `--sin-modelo` usa una lectura falsa sin red ni gasto (las secuencias de palabras con mayúscula del texto), solo para probar el flujo: saca también títulos de obras y lugares, que el control y la bandeja dejan ver.

### Precios (`src/lib/rutinas/precios.ts`)

Revisados contra la tabla oficial (platform.claude.com/docs/en/about-claude/pricing, leída el 28 de octubre):
- **Sonnet 5.5, lectura de caché: 0,10 USD por millón** (nota 2 de la tabla: 0,05 veces la entrada, como Opus 5.5). Estaba en 0,20 desde OL-429, que lo había tomado de la guía de la API (la daba igual que la de Sonnet 5, que sí es 0,20). Corregido con su prueba. Las rutinas que leen caché con Sonnet 5.5 anotaban de más, nunca de menos.
- **Haiku 5.5 añadido con sus dos tarifas**: hasta 100 000 tokens de entrada (contando la caché leída y escrita) 0,10 · 0,125 · 0,20 · 0,01 · 0,50; con más, todo el pedido a 0,50 · 0,625 · 1 · 0,05 · 2,50. `Precio` admite ahora `largo`. Una tanda de 25 eventos queda muy por debajo del umbral.

## Cómo se corre (el gestor, desde la carpeta principal con `.env`)

```
# 1. Ensayo barato: 50 eventos, sin escribir nada (llama a Haiku: unos centavos)
node scripts/instituciones/correr.mjs releer-artistas --autor <id del admin> --limite 50 --simular
# 2. Toda la relectura, escribiendo (Haiku 5.5 por omisión; tope 5 USD)
node scripts/instituciones/correr.mjs releer-artistas --autor <id del admin>
#    o con Sonnet 5.5:  … --modelo sonnet --tope-usd 3
# 3. Aceptar los artistas propuestos por el camino de la bandeja (la consola imprime la corrida)
node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin> --solo artista --simular
node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin> --solo artista
```

Sin red para probar el flujo: `--sin-modelo --simular`.

## Costo estimado por los 682 eventos

Medido sobre los JSON privados de la lectura (1 113 filas; las 842 sin artistas tienen 114 caracteres de título más descripción de media): una tanda de 25 lleva unos 3 200 tokens de entrada (reglas ~550, herramienta ~450, su sobrecarga ~400, eventos ~1 750) y devuelve unos 1 500 a 3 000 (la entrega y el pensamiento a esfuerzo bajo). 682 eventos son **28 tandas**.
- **Haiku 5.5**: (≈4 000 de entrada, con su tokenizador ~30 % más, × 0,10 + ≈3 000 × 0,50) / 1 M ≈ 0,002 USD por tanda → **≈ 0,05 USD** (entre 0,03 y 0,10).
- **Sonnet 5.5**: (≈3 200 × 2 + ≈3 000 × 10) / 1 M ≈ 0,036 USD por tanda → **≈ 1 USD** (entre 0,6 y 1,5).
El tope por omisión (5 USD) cubre los dos con margen. Recomendación: primero Haiku sobre 50 en simulación y leer el informe; si se le escapan nombres que sí están, Sonnet sobre lo mismo con `--releer`.

## Pruebas

- `npm run lint`: 0 errores (2 avisos de antes, en archivos que no toqué). `npm run typecheck`: limpio.
- `npm test`: **4 865 unitarias** en 300 archivos, todas pasan (eran 4 835 al empezar). Nuevas:
  - `scripts/instituciones/releer-artistas.test.ts` (30; 23 en la primera entrega, 5 por la corrección y 2 por las decisiones del gestor, abajo): qué se lee (visibles, del origen, sin liga, no leídos; `--releer`, `--limite`); el armado de la tanda (25/25/10, numeradas, la línea JSON con lugar y día local, la etiqueta que el texto no puede cerrar, las reglas y la herramienta estricta); el control «el nombre está en el texto» (fragmento que no está, nombre fuera de su fragmento, media palabra, detalle fuera del fragmento, alumnado, institución, el lugar); el tope (se para antes de pasarse); el lector con un modelo falso (Haiku, la herramienta, `<eventos>`, el gasto con su precio; una entrega con otra forma); el plan (liga igual y con apellidos de más, no liga dos parecidas ni integrante ni ficha oculta, descarta lo inventado y un `n` que no existe, propone una vez juntando variantes con sus datos completos, lo propuesto suma eventos, lo rechazado no vuelve, una tanda fallida no se marca leída, la lectura falsa); la base falsa (ligas, corrida terminada con gasto, tope, lo leído y sus propuestas; **la segunda corrida no llama al modelo ni crea corrida**; con `--releer` nada se repite; si fallan las propuestas, la corrida lo dice); el informe; los argumentos.
  - `src/lib/rutinas/precios.test.ts` (+1 y una corregida): Haiku 5.5 en sus dos tarifas, justo en el umbral y uno más; Sonnet 5.5 a 0,10 y Sonnet 5 a 0,20.
  - `src/lib/rutinas/claude.test.ts` (+1): `llamarConEntrega` pide con el modelo que se le da y cobra con su precio.
  - `scripts/instituciones/ligar-artistas.test.ts` sigue igual (solo se exportó `todas`).
- El paquete de `correr.mjs` compila con esbuild y, sin argumentos, dice el uso.
- **Banco de la base:** no hizo falta: no hay migración ni función nueva; escribe en las mismas tablas y columnas que `ligar-artistas` (OL-440), con una corrida `terminada` (o `fallida` si no se leyó nada) que cumple sus reglas (`tope_usd` en (0, 50], `gasto_usd` ≥ 0).
- Sin captura: es un paso de la Mac, no cambia ninguna pantalla.

## Límites

- **Homónimos:** el cruce no distingue a dos personas con el mismo nombre; si hay una sola ficha con ese nombre en la ciudad, se liga a ella. Con dos fichas iguales, no se liga.
- **Nombres ambiguos y cortos:** un nombre de una palabra («Selene») se liga si hay una sola ficha que se llame así; si hay dos, no. Un nombre de pila sin apellido sin ficha se propone tal cual: la bandeja decide.
- **Integrantes:** una persona que solo aparece en el detalle de un grupo no se liga al grupo ni se propone; queda en el informe.
- **Obras colectivas:** «exposición colectiva» sin nombres no da nada (no se inventa); si el texto nombra a varios, cada uno va por separado. Lo que el texto no dice (los artistas de una colectiva que solo están en el PDF o en un cartel) no se rescata: haría falta releer el PDF o el cartel.
- **Títulos de obras:** el modelo tiene la regla de no darlos y el control no puede distinguir un título de un nombre si los dos están en el texto; pasan a la bandeja como propuesta y ahí se rechazan (y ya no vuelven).
- **Sin oficio, sin detalle:** si el texto no dice el oficio, la propuesta va sin detalle y se completa al nutrir la ficha.
- **Quien presenta o modera** la obra de otro se reconoce por lo que dice el fragmento delante del nombre («presentado por», «a cargo de», «modera», «comentarios de»); otra forma de decirlo depende de que el modelo lo marque como «otro».
- En simulación el gasto no queda en ninguna corrida.

## Lo que debe hacer el gestor

1. Revisar la rama; unirla cuando el founder diga «publica» (no trae migración).
2. Correr el ensayo simulado (`--limite 50 --simular`) y leer el informe: nombres hallados, descartados y el gasto real por tanda.
3. Correr la relectura real (Haiku; o Sonnet si el ensayo deja ver nombres perdidos). La consola imprime la corrida y el comando para aceptarla.
4. `aceptar-corrida <corrida> --solo artista` (primero con `--simular`): crea las fichas y `aceptar_propuesta` las liga a sus eventos. Lo que se rechace no vuelve en otra relectura.

## Corrección tras la simulación del gestor (28 oct, 50 eventos con Haiku, 0,0035 USD)

El informe (`scripts/instituciones/salida/releer-artistas-simulado-2026-10-28T22-39-02-794Z.md`, carpeta ignorada) dejó ver tres fallas, corregidas:

1. **Preposición pegada al nombre:** «De Tere Palaú» (del título «exposición de De Tere Palaú»). `sinPreposicion`: «De» y «Del» nunca empiezan un nombre (se quitan); «La», «El», «Los» y «Las» solo si en el fragmento van en minúscula delante del resto del nombre (eran de la frase: «con la Orquesta Típica» → «Orquesta Típica»); «La Lupita» o «El Muñiz» se quedan. Las reglas del modelo lo piden también.
2. **Tipo:** marcaba «colectivo» a quien «imparte» (Fabiola Amaro, Maru Urbina, Mario Alonso, Ma. Eugenia Martínez Juache, Augusto Alejandro Hernández López), porque el detalle «Imparte talleres o charlas» tenía «talleres». `tipoPorNombre` mira solo el nombre y sus variantes: «Colectivo…» es colectivo; grupo, ensamble, compañía, orquesta, coro, banda, dúo, trío, cuarteto, mariachi, rondalla, ballet… o un nombre en plural («Los Vagos»), grupo; lo demás, solista.
3. **Papeles que no son de artista:** con papel «imparte» u «otro» no se propone sin un oficio artístico escrito en el fragmento (`oficioArtistico`: pintor, escultora, fotógrafo, actriz, bailarín, músico, poeta, escritora, ilustradora, cineasta, acuarelista…, o «maestro/directora de» teatro, escena, danza, música…). Quedan fuera, con el motivo «papel sin oficio artístico»: «Conversación a cargo del Dr. Joserra Ortiz», «Josué David Martínez Mejía, cronista honorario», «Recorrido a pie… guiado por Augusto Alejandro Hernández López», «Charla de Ma. Eugenia Martínez Juache sobre portafolios fotográficos», «Charla del maestro Jesús Martínez Melgarejo» (sí entraría «del maestro de teatro…»). Entran «Exposición del escultor Ramón Vázquez» (detalle «Escultor»), «Presentación del libro de Alberto Leyva» (escribe, letras), «Inauguración de la exposición de Kambria Antón» (expone).
4. **Detalle:** ya no se usan frases de papel («Expone su obra», «Imparte talleres o charlas»). El detalle es el oficio artístico que da el texto: el que dio el modelo (si está en el fragmento), el de `detalleDeAgenda` de OL-440 o la palabra de oficio justo delante del nombre (`oficioDelante`: «la acuarelista Ana López» → «Acuarelista»); lo que no es un oficio («Dr.», «maestro», «Libro infantil», «Fotográfica, pictórica y escultórica», «acuarelas») no queda. Sin oficio, sin detalle.

La lectura falsa de `--sin-modelo` usa ahora el papel «presenta» (con «otro» el control lo descartaría todo). Pruebas nuevas con los ejemplos del gestor: las preposiciones, el tipo, el oficio, los que quedan fuera y los que entran. lint 0 errores, typecheck limpio, 4 863 unitarias.

## Dos decisiones del gestor para cerrar (28 oct)

1. **Con ficha, se liga siempre.** Quien ya tiene ficha en el catálogo se liga sin importar su papel en ese evento (aunque solo modere o presente). El filtro de papel solo decide qué se **propone** como ficha nueva: `comprobar` marca `sinOficio` (papel «imparte» u «otro» sin oficio artístico escrito) y `armarPlan` lo descarta con «papel sin oficio artístico» solo cuando no hay ficha. Gabriela Olvera («Con Gabriela Olvera, Laura Espinosa y…», papel «otro») queda ligada a «Gabriela Olvera Zavala»; Laura Espinosa, sin ficha, no se propone.
2. **«Presenta» es obra propia.** Las reglas del modelo lo dicen (su libro, su disco, su obra; quien presenta, modera o comenta lo de otro es «otro»; distingue autor/a de presentador/a), y el código lo asegura: si el fragmento dice delante del nombre «presentado/a por», «presentación a cargo de», «a cargo de», «moderado/a por», «modera», «comentarios de» o «comenta(n)» (`presentaObraAjena`, con el oficio que vaya en medio: «presentado por la poeta Ana Ruiz»), el papel pasa a «otro». Prueba: «Libro infantil de Luis Infante, presentado por Eva Ortega Jiménez» → se propone Luis Infante (escribe, letras), no Eva Ortega. Con oficio escrito («la poeta Ana Ruiz») sí entra.

lint 0 errores, typecheck limpio, 4 865 unitarias.

