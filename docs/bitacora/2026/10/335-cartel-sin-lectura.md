# 335 · Cartel sin lectura obligatoria: se sube siempre, la lectura automática es una casilla con contador

**Pieza:** OL-307. **Rama:** `cartel-sin-lectura` (sobre `origin/main` `963b8a17` + la rama `prototipo-cartel-sin-lectura`, solo documentos). **Fecha:** 2026-10-06. **Operador:** Claude Sonnet 5.5.
**Estado:** hecho y probado en Chrome (headless) con los componentes reales y el servidor y Storage simulados, y la migración probada en un Postgres local; falta el iPhone real (lista al final). **Una migración** (`20261006100000_cartel_tope_seis.sql`): la aplica el gestor.

## Qué se encargó

Construir lo que firmó el founder en la bitácora [334](334-cartel-sin-lectura.md) (prototipo `docs/rediseno/prototipos/cartel-sin-lectura.html`, tres casos que abrí en Chrome y comparé a 390 px con lo construido): separar **subir** el cartel de **leerlo**. Hasta hoy, sin llave de IA el recuadro «Sube el cartel» ni aparecía, sin cupo se volvía «Se acabaron tus lecturas · Pedir más lecturas» y una lectura fallida devolvía al recuadro con «Probar con otra foto»: en los tres casos, quien sí tenía cartel solo podía tocar «No tengo cartel». Ahora el cartel se sube siempre y leerlo es un valor agregado que la persona decide con una casilla.

## Lo que hay

**Primera pantalla (igual en todos los casos).** Un marco punteado (borde de 2 px en el color de acción y el fondo suave de siempre) con dos filas: el recuadro «Sube el cartel · Será la portada del evento» (ya no dice «Leemos el nombre…» ni cambia de estado) y, pegada debajo y separada por una línea punteada interior, la casilla **«Lectura automática»** con «Quedan N este mes» debajo (nombre 17 px negrita, detalle 14 px, los dos a la izquierda), marcada de entrada. Con las seis usadas: casilla apagada (`disabled`, atenuada, sin marcar) con «Se renueva el 1 de noviembre». Sin servicio de lectura (`cartelActivo` falso): el marco solo lleva el recuadro. Fuera del marco y con más aire (36 px en vez de 20): **«No tengo cartel ›»**, una opción que avanza (texto a la izquierda, chevron a la derecha). Medido contra el prototipo: recuadro de 176 px (el mismo), la casilla pegada al recuadro, el espacio hasta «No tengo cartel» de 37 px (prototipo, 36).

**El cartel se sube siempre** (`useLeerCartel`, reescrito): sube con `subirFoto` y lee solo si la casilla está marcada, quedan lecturas y hay servicio (`seLee`, función pura en `estadoCartel.ts`). Si no se lee (casilla desmarcada, agotada, sin servicio), o la lectura **falla** (el modelo, un corte, o ya no había cupo en el servidor), el cartel queda guardado y se sigue directo a la primera pregunta («¿Cómo se llama?» o la primera que falte): nunca vuelve al recuadro. Arriba de esa primera pregunta, la fila chica: miniatura de 40 px y sello gris **«Cartel guardado»** (**«Cartel guardado · no pude leerlo»** si la lectura falló; si fue «ya no había cupo» solo dice «Cartel guardado»). Solo en la primera pregunta (`primeraPregunta`, pila de dos), no en las siguientes; vuelve si se regresa a ella con Atrás. La imagen viaja al publicar en el campo `imagen`, como antes.

**Seis lecturas al mes** por cuenta y **la fallida no se descuenta** (migración y `leerCartelAccion`, más abajo). Sin «Pedir más lecturas»: se quitó `pedirMasLecturas`, su botón en el alta por pasos y en la tarjeta del formulario de siempre (`TarjetaCartel`; sin cupo es ahora un recuadro quieto que dice cuándo vuelven), y el estado `pedida` (`EstadoCartel`, `alLlegar`, el tipo `Cupo`). Subir el tope de una cuenta sigue en la administración (`dar_mas_lecturas`, intacta).

**Contador en el perfil.** Renglón «Lectura automática de carteles · Quedan N este mes» (o «Se renueva el 1 de <mes>», o «Sin límite» para la administración) en **Ajustes**, en la tarjeta «Cuenta», como renglón de información (`ajustes/RenglonLecturas.tsx`). Solo con servicio de lectura. Ver la decisión 7: la pantalla «Mi perfil» es la ficha pública con sus listas y no tiene renglones de configuración; Ajustes es el sitio natural.

**«Revisa»**: ya enseñaba la miniatura siempre que hay cartel y el sello «Leído del cartel» solo con datos leídos (`CartelSubido.leido`); comprobado y sin cambios (hay prueba con cartel guardado sin lectura: miniatura y sin sello).

Textos: «lectura automática», «Quedan N este mes», «Se renueva el 1 de <mes>», «Cartel guardado», «no pude leerlo». Nunca «gratis» (hay una prueba que lo comprueba en el contador).

## La migración `20261006100000_cartel_tope_seis.sql`

Solo añade una columna con valor por omisión y una función, y cambia tres funciones sin tocar su forma. No borra datos ni cambia a las cuentas con tope propio (`topes_de_lectura`, por ejemplo las de «Dar más», 100).

- `tope_de_cartel_base()` pasa de 20 a **6**.
- `lecturas_cartel` gana `devuelta boolean not null default false`. `mi_cupo_de_cartel()` y `apartar_lectura_de_cartel()` (recreadas con `create or replace`, mismas firmas, mismos permisos, `search_path = ''` como las dejó la auditoría de seguridad) **no cuentan las devueltas**. `mi_cupo_de_cartel` sigue devolviendo la columna `pedida` (cambiar su forma pediría soltar la función; la app ya no la lee).
- `devolver_lectura_de_cartel(p_perfil uuid)` (nueva, `security definer`, **solo `service_role`**: se le quita el permiso a `public`, `anon` y `authenticated`): marca como devuelta la lectura más reciente que aún cuenta de esa cuenta, con el mismo cerrojo por cuenta que `apartar_lectura_de_cartel`. Devuelve `false` si no hay nada que devolver o si el fusible se agotó.

**Cómo queda honesto el cupo sin dejar un fallo repetido salir gratis en tokens.** Opté por apartar antes de leer (como siempre: es lo que protege de dos toques a la vez) y devolver después de un fallo, en vez de anotar solo al terminar bien: anotar al final dejaría pasar varias lecturas simultáneas por encima del tope. Dos salvaguardas:

1. **Solo el servidor devuelve.** `leerCartelAccion` llama a la función con el cliente de la llave de servicio (`clienteAdmin`, el mismo de los avisos). Si cualquier cuenta pudiera llamarla, devolvería también sus lecturas buenas y el tope de 6 sería de adorno. Sin esa llave en el servidor, o si la devolución falla, la lectura queda descontada: el cupo nunca se queda corto de más.
2. **Fusible: tantas devoluciones al mes como el tope de la cuenta (6).** La séptima lectura fallida del mes cuenta como cualquiera. Un cartel que el modelo no sabe leer, subido una y otra vez, cuesta como mucho el doble del tope —12 llamadas al modelo por cuenta al mes (2 a 3 centavos de dólar cada una)— y no sale gratis sin límite. Las devoluciones se cuentan por mes en la hora de la ciudad, igual que las lecturas.

`leerCartelAccion`: tras apartar y llamar al modelo, si `leerCartel` devuelve `null` (sin respuesta, rechazo del modelo, respuesta que no se pudo interpretar, error de la API) o lanza, devuelve la lectura y entonces responde el fallo de siempre (o relanza el error). El sin-cupo del servidor sigue siendo `{ ok: false, sinCupo: true }` y ahí no se lee ni se devuelve nada. Lo que **no** se puede devolver: una función que se agota por tiempo en Vercel antes de llegar a devolver (esa lectura queda descontada).

El panel de administración (`panel_pendientes`, «leyó N y publicó M» de las peticiones antiguas) sigue contando todas las filas de `lecturas_cartel`, devueltas incluidas: no lo recreé para no reabrir una función de la que hay dos versiones posteriores; es una cifra de contexto para decidir si dar más, y las peticiones nuevas ya no existen. Las peticiones `mas_lecturas` que ya estén sin atender siguen en «Pendiente».

Orden de aplicación: indiferente. Con el código nuevo y sin migración, el tope sigue en 20 y la devolución falla en silencio (cuenta); con la migración y el código viejo, el tope es 6 y las fallidas descuentan como antes. Pide `SUPABASE_SERVICE_ROLE_KEY` en el servidor (ya la usan los avisos).

## Maquetación

Plana, sin `:has()` ni medidas por pantalla. Todo es hijo directo de `main` (la columna de `PorPasos`) salvo el marco, que sí agrupa: `div.marco > label.subir (svg, b, small, input) + button.casilla (svg, b, small)`. El marco es una rejilla de una columna; `overflow: hidden` recorta las esquinas de los hijos, así que el aro de foco va hacia adentro (`outline-offset` negativo). La casilla (`ui/Casilla`, nuevo, canon) es una rejilla con áreas `cuadro | titulo / cuadro | detalle`; **el cuadro es su `::before`** y la palomita, si está marcada, el único `svg` hijo en la misma área: sin nodo de más (profundidad 6, como antes). `enMarco` la deja con solo la raya punteada de arriba. «No tengo cartel» es `ui/Opcion` sin icono ni detalle: `icono` y `detalle` pasan a opcionales y, sin icono, la rejilla es `titulo | flecha` del alto de un toque; el chevron lleva su propia clase (`.flecha`) para que la regla del icono no lo confunda con él. El «más aire» lo pide `className` con `--aire-antes`, una variable nueva de `PorPasos` que es todo el margen de arriba que esa columna permite (su regla pone el margen de las piezas en cero con más peso que cualquier clase de la pieza). La fila de «Cartel guardado» es una rejilla `miniatura | sello` y va en una ranura nueva de `PorPasos` (`encima`), antes de la pregunta.

Tokens: `--alto-subir-cartel` pasa de 200 a **176 px** (el del prototipo; solo lo usa este recuadro) y entra `--ancho-cartel-guardado` (40 px). Ningún color, `z-index`, margen negativo ni `100vw` fuera de los tokens.

## Decisiones del operador (no están en el encargo ni en el prototipo)

1. **Una espera también al guardar sin leer.** Subir tarda unos segundos aunque no se lea; el prototipo salta directo a la pregunta. Mostré la misma pantalla de espera con «Subiendo el cartel…» (y «Leyendo el cartel…» cuando se lee). Alternativa descartada: ir a la pregunta mientras sube en segundo plano (se podría publicar antes de que termine, o fallar la subida con la persona ya en otro paso).
2. **Si el cartel no se pudo subir** (el único caso en que no queda guardado), la pantalla se queda en el primer paso con el recuadro igual y una línea roja debajo del marco: «No pude subir el cartel. Puede ser tu conexión.» (o «La imagen pesa más de 5 MB.», o «Se cortó a la mitad. …»). El prototipo no dibuja este caso; son los textos de `estadoCartel.ts`. Se va al volver a intentar.
3. **Sin consulta de cupo antes de subir** (`cupoDeCartel` en `useLeerCartel`): ya no hace falta, porque el cartel se sube de todos modos; si el cupo se agotó en otra pantalla, `leerCartelAccion` lo dice y el cartel queda guardado. El cupo con el que abrió la pantalla se mantiene al día en el hook: cada lectura buena resta una (se ve al volver con Atrás) y un «ya no hay» del servidor apaga la casilla.
4. **«Queda 1 este mes»** (singular) cuando queda una; el encargo dice «Quedan N».
5. **«Se renueva el 1 de noviembre»** con el mes completo (`cuandoSeRenueva`, como mandó el encargo), no «nov» como el prototipo.
6. **Administración (sin tope):** la casilla dice «Sin límite» y nunca se apaga (con el tope base de 6 y 40 lecturas, la cuenta del founder habría quedado apagada). Sin saber el cupo (la consulta no contestó) la casilla va marcada y sin contador: el servidor decide al leer.
7. **El renglón del contador va en Ajustes, «Cuenta»**, no en «Mi perfil» (la ficha pública con Voy / Interesan / Sigo, sin renglones de configuración; el propio código dice «lo que se configura vive en /ajustes»). Es un componente aparte para probarlo con el CSS real.
8. **Borde del marco de 2 px**, el de hoy (el prototipo dibuja 1,5).
9. **«No tengo cartel» tras subir uno** (Atrás desde la primera pregunta y luego «No tengo cartel») conserva la imagen subida, como ya hacía el camino con fallo en la bitácora 330. No lo cambié.
10. **`TarjetaCartel` sin cupo** deja de ser botón: queda un recuadro quieto con «Se acabaron tus lecturas del mes» y «Se renuevan el 1 de …» (antes: botón «Pedir más»). Es lo único que hubo que decidir del formulario de siempre; no toqué nada más de él. Tres arneses viejos (`guardado`, `ciudadSitio`, `guardiaTrasError`) siguen simulando un `pedirMasLecturas` que ya nadie importa: inofensivo, no los toqué.
11. **El presupuesto de `npm run medir` para `s15-alta-evento-pasos` pasa de [14, 14, 48, 48] a [20, 20, 54, 54] nodos** (profundidad 6, sin cambio). Razón: el marco, la casilla (3 nodos) y «No tengo cartel» como opción (3) suman 6 nodos al estado de producción (con llave de lectura); el recuadro ya no depende de la llave. Sin llave, como en la CI, la ruta mide 17/17/51/51 y avisa «bajaron» sin fallar.

## Pruebas

- **Unitarias** (`estadoCartel.test.ts`, 5 nuevas: las que quedan de seis, no menos de cero, el contador en singular y plural, «Se renueva…», «Sin límite», que nunca diga «gratis», y la decisión «¿se lee?»: servicio × casilla × cupo, la administración, el cupo desconocido) y `cupo.acciones.test.ts` (14: la lectura fallida **se devuelve** con la llave de servicio, nunca con la sesión, y después de leer; el error del modelo se devuelve y se relanza; si la devolución falla, no hay llave o la base dice que no, el fallo se dice igual; una lectura buena no se devuelve; sin cupo ni se lee ni se devuelve; ya no existe `pedirMasLecturas`).
- **De base** (`npm run test:db`, Postgres 17 local con roles de Supabase imitados, **1572 comprobaciones, 0 fallos**): `lecturas.test.mjs` pasa a seis (la sexta entra, la séptima no, la rechazada no se anota, el tope base es 6, `mi_cupo` y `security-advisor` lo ven) y gana la sección «una lectura que falla no se descuenta»: una cuenta normal y `anon` no pueden devolver; el servidor sí y la devuelta ya no cuenta pero la fila no se borra; seis devoluciones salen y la séptima no (cuenta como cualquiera); sin lecturas no hay qué devolver; el mes nuevo reinicia lecturas y fusible. `lecturas-concurrencia.test.mjs`: ocho a la vez por el último sitio, ahora de seis. También se actualizó el banco viejo de PGlite (`supabase/tests/tope_de_lecturas.mjs`, sin script y sin PGlite aquí: solo los números).
- **De componentes** (`AltaEvento.componentes.test.mjs`, 62: las del camino con cartel se reescribieron; `cupo.componentes.test.mjs`, 13, ajustada sin «Pedir más»; `RenglonLecturas.componentes.test.mjs`, 4, nueva): primera pantalla (marco punteado, casilla pegada al recuadro con su raya, 17 y 14 px, a la izquierda, «No tengo cartel» fuera del marco con más aire y chevron a la derecha); casilla marcada → subir → «Leyendo» → «Revisa» (la imagen viaja al publicar); casilla desmarcada → «Subiendo» → «¿Cómo se llama?» con «Cartel guardado» (sin lectura pedida), solo en la primera pregunta, y «Revisa» con miniatura y sin sello; N = 0 → casilla apagada con «Se renueva el 1 de …», el recuadro igual, subir → preguntas; una sola que queda («Queda 1»), administración («Sin límite», no se apaga) y cupo desconocido; cada lectura buena resta una al volver; el servidor sin cupo → cartel guardado y casilla apagada; sin servicio → sin casilla; fallo al leer → «Cartel guardado · no pude leerlo» y la imagen viaja al publicar, sin sello; Atrás y otro cartel; no se pudo subir (aviso bajo el marco, no se lee, se reintenta) y corte (antes de subir y con el cartel ya subido); «No tengo cartel» sigue; **sin desbordes a 320 y 390 en nueve pantallas** y la regla de `npm run medir` (toques de 44, tapados, fuera de caja, márgenes negativos) en esas mismas: 0 en todo.
- `npm run typecheck` verde; `npm run lint` 0 errores (el único aviso ya estaba en `VisorImagen.componentes.test.mjs`); `npm test` **147 archivos, 2168 pruebas**; `npm run test:componentes` (Chrome de la Mac) **418 pruebas, 0 fallos**; `npm run inventario` **sin novedades** (342 medidas en duro, 2 bloques duplicados: iguales); `npm run medir` **27 pantallas × 4 anchos, sin novedades** (con una llave inventada, `s15` mide 20/20/54/54, el presupuesto; sin ella 17/17/51/51).

## Capturas (`docs/rediseno/capturas-335/`)

390×844 a 2×, con el harness de componentes (los componentes y el CSS reales, la letra Bricolage de la compilación, servidor y Storage simulados, reloj fijo del miércoles 7 de octubre de 2026). Todas abiertas y revisadas; la primera comparada con el prototipo abierto en Chrome a 390 px.

1. `390-01-inicio-casilla-marcada`: ✕ y «Publicar»; el marco punteado violeta con la cámara en su círculo, «Sube el cartel» en violeta y «Será la portada del evento» en gris; pegada debajo, tras una raya punteada, la casilla marcada (cuadro violeta con palomita) con «Lectura automática» en negrita y «Quedan 5 este mes» debajo, a la izquierda; con más aire, «No tengo cartel» con el chevron a la derecha. Igual que el prototipo (lo único que difiere: borde de 2 px y mes completo).
2. `390-02-casilla-apagada`: lo mismo con la casilla atenuada y sin marcar y «Se renueva el 1 de noviembre»; el recuadro no cambia.
3. `390-03-sin-servicio`: el marco solo con el recuadro y «No tengo cartel» debajo, sin casilla.
4. `390-04-cartel-guardado`: «¿Cómo se llama?» con la fila chica arriba (miniatura de 40 px y sello gris «✓ Cartel guardado»), el campo con su borde discontinuo y el botón «Falta el nombre» pegado abajo.
5. `390-05-no-pude-leerlo`: igual con el sello «✓ Cartel guardado · no pude leerlo».
6. `390-06-leyendo`: el cartel chico y al centro con «Leyendo el cartel…» (sin cambios de la pieza 330; solo con la casilla marcada).
7. `390-07-revisa-leido`: «Revisa» con la miniatura, «✓ Leído del cartel» en verde, el nombre y los cuatro renglones (sin cambios).
8. `390-08-no-se-pudo-subir`: la primera pantalla igual, con «No pude subir el cartel. Puede ser tu conexión.» en rojo bajo el marco.
9. `390-09-ajustes-lectura-automatica`: la tarjeta «Cuenta» de Ajustes con «Entras con…», el renglón nuevo «Lectura automática de carteles · Quedan 4 este mes» con su cámara gris y «Personas bloqueadas» (el renglón es el componente real; sus vecinos son copia del marcado de la página, que es de servidor y no corre aquí).

## Para probar en el iPhone

1. Abrir `/nuevo/evento` con sesión: ¿el marco y «No tengo cartel» se ven como en la firma? ¿Con la casilla marcada y un cartel real, «Leyendo» y luego «Revisa»? (La llave de IA solo está en Production: en una vista previa de Vercel no hay lectura, lo que prueba el caso «sin servicio»: sin casilla y «Cartel guardado».)
2. Desmarcar la casilla y subir un cartel: ¿va a «¿Cómo se llama?» con «Cartel guardado» y la miniatura? Seguir hasta «Revisa» y publicar: ¿la ficha lleva el cartel como portada?
3. Un cartel que la IA no pueda leer (una foto cualquiera): ¿dice «no pude leerlo» y sigue sin volver al recuadro? Tras la migración, ¿el contador no baja con esa fila?
4. Usar las seis del mes: ¿la casilla se apaga con «Se renueva el 1 de …» y subir sigue funcionando?
5. Ajustes → «Cuenta»: ¿el renglón dice cuántas quedan?
6. Modo avión justo tras elegir la foto: ¿sale la línea roja bajo el marco y el recuadro sigue tocable?
7. Con el teclado: «¿Cómo se llama?» con la fila de arriba, ¿el campo queda a la vista?

## Qué falta

- Aplicar la migración (gestor) y comprobar que `SUPABASE_SERVICE_ROLE_KEY` esté en el servidor de Production.
- El resto de la serie del alta por pasos (llevar `/nuevo` a este flujo cuando termine) no cambia con esta pieza.
