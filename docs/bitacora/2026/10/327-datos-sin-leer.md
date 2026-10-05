# 327 · Dos datos que se publicaban sin que nadie los leyera: la disciplina del artista y la ciudad del lugar

**Pieza:** OL-299. **Rama:** `datos-sin-leer` (base `origin/main` `b28034f3`, PR #372). **Fecha:** 2026-10-05. **Operador:** Sonnet 5.5.
**Estado:** hecho y medido en Chromium contra el respaldo local (app compilada) a 390×844 y a 320×640; sin migración; falta mirarlo en un iPhone real (ver el final).

## Qué pidió el founder

Tras el análisis del doc [54](../../../rediseno/54-lugar-y-artista-por-pasos.md) (aceptado el 2026-10-05, «me gusta tu análisis y te doy luz verde para todo»), los dos arreglos chicos que no esperan al rediseño por pasos: (a) el artista sin pista en el nombre no debe quedar como «Música» sin que alguien lo elija; (b) el lugar no debe quedar en San Luis Potosí cuando el mapa no dio ciudad. Exigencia para todo el código: «procede con extremo cuidado, como siempre maquetación impecable, sin sobre anidación, codigo limpio».

## Defecto A · artista sin pista: la disciplina se elige

**Qué había.** `deducirDisciplina` devolvía «Música» cuando el nombre no traía ninguna palabra de otra disciplina; el formulario la mandaba como si la persona la hubiera leído y se publicaba así. Un pintor que solo escribía su nombre salía como músico en el directorio y en sus filtros.

**Qué hay ahora.**

- `lib/artistas.ts` · `deducirDisciplina(nombre)` devuelve `null` sin pista. Para que «todo siga como hoy» cuando el nombre sí la da, se añadió una lista corta de palabras de música que hasta hoy solo acertaban por omisión: música, musical, orquesta, coro, mariachi, banda, trío, cuarteto, quinteto, sonora, ensamble, cantautor, cantante, rock, jazz. Va **al final**: «Teatro Musical» y «Coro de Danza» siguen siendo teatro y danza. «Los Vecinos», «Ana Ruiz» o un nombre vacío ya no deducen nada.
- `FormularioArtista.tsx` · en el **alta**, sin pista y sin chip elegido el renglón «Qué hace» pasa a `Renglon.pendiente` (la línea de `ui/LineaPorCompletar`), con el valor «Falta la disciplina» y la acción «Elegir» (la que ya existía). Al abrirlo se ven los ocho chips; al tocar uno el renglón se resuelve y el botón se enciende. **La subcategoría sigue siendo opcional**: el renglón se queda abierto en su segundo paso (como hoy) con «Listo», y publicar ya está habilitado sin tocarlo. Mientras el renglón está abierto lleva el borde de tinta de siempre, igual que «Cuándo» del evento.
- `lib/formulario.ts` · `faltaEnArtista({ nombre, conDisciplina, repetido })`: «Falta la disciplina.», o «Falta el nombre y la disciplina.» con el formulario vacío; el aviso de nombre repetido sigue donde estaba.
- Servidor · `validarArtista(..., { alta: true })` (lo pasa solo `crearArtista`) rechaza el alta sin disciplina, o con «por_completar» puesto a mano, con `errores.disciplina = "Falta la disciplina."`, el mismo texto de la nota del botón (una prueba los compara). Una disciplina fuera de la lista sigue diciendo «Elige qué hace.».
- **No cambia:** cómo se deduce «Solista/Grupo/Colectivo»; ninguna ficha ya guardada (un artista guardado como «Música» se queda como está).

**Decisión que conviene mirar: la edición.** `actualizarArtista` no pasa `alta`, así que una ficha «por completar» (creada desde un evento o importada) se puede seguir guardando sin disciplina. Lo único que cambia al editarla es que el formulario ya no la convierte en silencio en «Música»: sin pista queda «por completar» (el renglón dice «Disciplina» con «Elegir», no pendiente y sin bloquear el botón). Exigirla también al editar es una línea (`alta: true` en `actualizarArtista`) pero obliga a quien solo corrige una foto a elegir disciplina; lo dejo al founder.

### Quién dependía del «Música» por omisión

| Camino | ¿Depende? | Qué hice |
| --- | --- | --- |
| Alta de artista (`FormularioArtista` + `crearArtista`) | **Sí** (el único) | Arreglado arriba. |
| Edición de una ficha «por completar» (`FormularioArtista` con `artista`) | Sí, por la misma deducción | Ya no se vuelve «Música» sola; no bloquea (decisión arriba). |
| Artista nuevo desde un evento («Quién»: nombre y listo) | No: la función SQL `crear_evento` inserta `'por_completar'` explícito (`20260918110000_evento_atomico.sql:124`, y las tres versiones siguientes) | Nada. Esa ficha nace «por completar» y la ficha pública dice «Esta ficha se creó con solo el nombre»: la edición la completa. |
| Importador del CAPO (`scripts/capo/capo.ts:289`, `importar.ts`) | No: inserta `pagina.disciplina ?? "por_completar"`; no pasa por `validarArtista` | Nada. |
| Importador de instituciones, eventos (`scripts/instituciones/importar-eventos.ts`) | No toca la tabla de artistas (solo `eventos_artistas`) | Nada. |

Ningún importador usaba el «Música» por omisión: no hubo que pasarles nada explícito.

## Defecto B · lugar sin ciudad

### Por qué caminos llegaba el punto sin ciudad (base `b28034f3`)

La ciudad nace del contexto de Mapbox (`lib/geocodificar.ts:41`, `ciudadDelContexto`: la «place» o, si no, la «locality»; nada más). Si no está, `null`; y el servidor, sin ciudad, ponía San Luis Potosí en silencio (`lib/lugares.ts:325`).

1. **Sugerencia tocada en el campo del nombre** · `FormularioLugar.tsx:200-206` (`elegirSugerido`) con `recuperarLugar` (`buscarLugares.ts:92`, `ciudad: ciudadDelContexto(p.context)`): un resultado sin «place» ni «locality» llega sin ciudad y `if (r.ciudad) setCiudad(...)` (`:203`) no la tocaba: quedaba la de una sugerencia anterior o vacía.
2. **Pin movido, «Estoy aquí» y el punto con el que abre el alta** (`?lat=&lng=` o el dedo sostenido en el mapa) · `FormularioLugar.tsx:218-237` (`deducirDireccion`) con `lugarDesdePunto` (`geocodificar.ts:86-91`, solo `types: address,street`, `limit: 1`): un parque, un camino o un punto sin calle cercana vuelve vacío; Mapbox sin responder, también. `:223` solo ponía la ciudad si venía: la de un punto anterior **se quedaba pegada al nuevo punto**.
3. **La hoja «¿Dónde está?» del alta de lugar** · `HojaDonde.tsx:315` (`ciudad` del borrador en `null` al mover el pin) y `:329` (`r?.ciudad ?? a.ciudad`); elegir en la hoja la dirección de un lugar ya registrado fija la ciudad en `null` (`:430`, `LugarResumen` no trae ciudad). «Listo» devolvía `null` (`:544`) y `FormularioLugar.tsx:544` (`if (c) setCiudad(c)`) conservaba la anterior.
4. **«Agregar lugar» desde el alta de un evento** · `HojaDonde.tsx:483`: `ciudad: borrador.ciudad ?? contexto.ciudad.nombre`. Con un pin puesto (siempre, para guardar un lugar), `contextoDondeEsta` devuelve **San Luis Potosí fijo** (`lib/hojaDonde.ts:205`, `if (punto) return { ciudad: CIUDAD_INICIAL, ... }`), así que un pin de otra ciudad sin ciudad deducida se guardaba como San Luis Potosí sin importar la ciudad elegida. Es el mismo defecto en otra puerta, con otro texto.
5. **Servidor** · `lib/lugares.ts:325`: `|| CIUDAD_INICIAL.nombre`. Era la red de seguridad que lo escondía todo.
6. **El mismo camino en «otro sitio» de un evento** (comparte `HojaDonde` y `lugarDesdePunto`): la ciudad del **evento** (no la de un lugar) cae igual en `ciudadDe`, `eventos/acciones.ts:65` (`datos.ciudad || CIUDAD_INICIAL.nombre`). **No lo toqué:** es otro dato (la ciudad de un evento), en la acción del evento que se rehace por pasos; lo anoto para el gestor (ver «Dudas»).

No es un camino: el alta de artista (la ciudad es un renglón con valor siempre), ni los importadores (`scripts/instituciones/importar.ts` y `capo/importar.ts` ya escriben `ciudad: CIUDAD` a mano).

### Qué cambia (mínimo, sin tocar pantallas)

- **`lib/ciudad.ts` · `ciudadParaPunto(punto, deducida, contexto)`** (pura y probada): la ciudad que dio el mapa, canónica (`ciudadCanonica`); si no dio ninguna, la ciudad de contexto **solo si el punto cae a menos de 50 km de su centro** (el radio de OL-270, `RADIO_CIUDAD_KM`, con `distanciaKm`); si tampoco, `null`.
- **`FormularioLugar.tsx`:** la ciudad es **la del punto**. Se vacía al mover el pin (`alMoverPin`) y al llegar un resultado sin ciudad (sugerencia, `deducirDireccion`, «Listo» de la hoja): ya no se queda la de un punto anterior. El campo oculto `ciudad` lleva `ciudadParaPunto(...) ?? ""`. Si la acción vuelve con el aviso de ciudad, sale en la nota del renglón «Dónde» (la que ya mostraba `ubicacion`/`direccion`). Al tocar «Publicar» sin ciudad se vuelve a preguntar por el punto a Mapbox (`deducirDireccion(punto)`, solo las coordenadas del sitio), para que el siguiente intento la lleve.
- **`HojaDonde.tsx:483`:** `crearLugarDesdeEvento` recibe `ciudadParaPunto(punto, borrador.ciudad, ciudadContexto) ?? ""`; el aviso del servidor sale por el `error` que esa hoja ya muestra.
- **`lib/lugares.ts` · `validarLugar`:** sin ciudad, `errores.ciudad = "No pudimos saber en qué ciudad está. Intenta de nuevo."` y **no se publica**; ya no hay San Luis Potosí por omisión. Aplica a crear y a editar (al editar el formulario manda la ciudad guardada, salvo que se mueva el pin a un punto sin ciudad).
- **`scripts/instituciones/importar.ts`:** pasa `ciudad: CIUDAD` a `validarLugar` (antes dependía del valor por omisión); la fila que inserta sigue con su `ciudad: CIUDAD`. Es el único importador que usaba `validarLugar`.

### Qué decidí en el caso «Mapbox no respondió» (B.3)

Se hace lo pedido, en este orden: (1) la ciudad que dio el mapa; (2) la ciudad de contexto de la persona si el punto cae a menos de 50 km de su centro conocido; (3) nada: el alta no se publica y dice «No pudimos saber en qué ciudad está. Intenta de nuevo.» en el renglón «Dónde». Razones: (2) no inventa, solo usa lo que la persona ya tiene elegido y el punto lo respalda (un pin a 5 km del centro de San Luis Potosí con el mapa mudo es de San Luis Potosí); (3) es la única salida honesta cuando no se sabe, y «Intenta de nuevo» es verdad porque el formulario vuelve a preguntar por el punto al tocar «Publicar». **El contexto es `ciudadContexto` del formulario**: en `/nuevo` del lugar siempre hay uno (`?ciudad=` o San Luis Potosí, `nuevo/page.tsx`); en el alta de evento puede ser `null` (sin `?ciudad=`) y entonces, sin ciudad del mapa, «Agregar lugar» no publica.

**Lo que NO hice porque exigiría cambiar pantallas** (para el rediseño por pasos): pedirle la ciudad a la persona (un campo o una hoja «¿En qué ciudad está?») cuando no se pueda deducir ni de contexto; con las pantallas de hoy el único remedio es mover el pin a una calle o elegir una dirección. Otra opción, sin pantallas pero que no pude comprobar sin llave de Mapbox: un segundo intento de geocodificación inversa con `types=place,locality` cuando `address,street` no devuelva nada (parques, caminos); lo dejo como mejora posible. Tampoco corregí que, tras un pin movido sin dirección legible, la dirección del punto anterior se queda en el renglón (misma familia, otro dato).

### Cómo detectar lugares ya guardados con la ciudad que no es la de su punto (SOLO LECTURA, para que la corra el gestor)

No toqué ningún lugar guardado. La consulta (dos `select`, sin escribir) es esta. Probada contra una base local desechable (Postgres 17 en el scratchpad, **no** producción) con los 9 lugares del respaldo local (`fixture.mjs`) y 5 filas sembradas a mano:

```sql
-- OL-299 · Lugares cuya ciudad no coincide con su punto. SOLO LECTURA (dos select, nada se escribe).

-- A. El error que producía el defecto: lugares guardados como «San Luis Potosí» con el punto a más de 50 km de su centro
--    (el mismo radio de OL-270). Cada fila es un candidato a revisar a mano, no un veredicto.
select id, nombre, ciudad, lat, lng,
       round((2 * 6371 * asin(sqrt(
         power(sin(radians(lat - 22.1497) / 2), 2) +
         cos(radians(22.1497)) * cos(radians(lat)) * power(sin(radians(lng - (-100.9764)) / 2), 2)
       )))::numeric, 1) as km_al_centro
from public.lugares
where ciudad = 'San Luis Potosí'
  and 2 * 6371 * asin(sqrt(
        power(sin(radians(lat - 22.1497) / 2), 2) +
        cos(radians(22.1497)) * cos(radians(lat)) * power(sin(radians(lng - (-100.9764)) / 2), 2)
      )) > 50
order by km_al_centro desc;

-- B. Cualquier ciudad con tres lugares o más: el que queda a más de 50 km de la mediana de los demás de su ciudad
--    (la mediana no se arrastra por el propio error). Con menos de tres no hay con qué comparar.
with centros as (
  select ciudad, count(*) as n,
         percentile_cont(0.5) within group (order by lat) as lat,
         percentile_cont(0.5) within group (order by lng) as lng
  from public.lugares
  group by ciudad
  having count(*) >= 3
)
select l.id, l.nombre, l.ciudad, c.n as lugares_en_la_ciudad,
       round((2 * 6371 * asin(sqrt(
         power(sin(radians(l.lat - c.lat) / 2), 2) +
         cos(radians(c.lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - c.lng) / 2), 2)
       )))::numeric, 1) as km_a_la_mediana
from public.lugares l
join centros c using (ciudad)
where 2 * 6371 * asin(sqrt(
        power(sin(radians(l.lat - c.lat) / 2), 2) +
        cos(radians(c.lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - c.lng) / 2), 2)
      )) > 50
order by km_a_la_mediana desc;
```

Qué mira cada una:

- **A.** Los guardados como «San Luis Potosí» con el punto a más de 50 km de su centro (22.1497, −100.9764): es exactamente el error que producía el defecto.
- **B.** En cualquier ciudad con tres lugares o más, el que queda a más de 50 km de la mediana de su ciudad (la mediana no se arrastra por el propio error).

Resultado con el respaldo local solo (9 lugares, una ciudad): **A = 0 filas, B = 0 filas**. Con las 5 filas sembradas (un foro de Querétaro guardado como San Luis Potosí; tres de Querétaro; uno de San Luis guardado como Querétaro): A trae el primero (183.9 km); B trae el primero (184.0 km) y el último (183.2 km). Cada fila es un candidato a revisar a mano, no un veredicto (una ciudad grande o un lugar legítimamente lejano pueden pasar de 50 km).

## Pruebas

- **Unitarias (nuevas o ampliadas):** `artistas.test.ts` (deducción con pista, sin pista y nombre vacío, pista de otra disciplina que gana a una palabra de música; validación del alta sin disciplina, sin el campo, con «por_completar» a mano, con una de la lista y fuera de ella, y la edición que la deja como está); `formulario.test.ts` (la nota con y sin disciplina, sola o junto al nombre); `artistas/acciones.alta.test.ts` (el servidor rechaza el alta sin disciplina sin tocar la base, y con ella publica); `ciudad.test.ts` (`ciudadParaPunto`: la del mapa manda y se canoniza, contexto cercano, contexto lejano, sin contexto); `lugares.test.ts` (sin ciudad no se publica, vacía o de espacios, y la canónica se conserva); `lugares/acciones.desde-evento.test.ts` (sin ciudad no publica y no llama a la base; de otra ciudad, se guarda con esa).
- **De componentes (nuevas, Chromium real con los estilos reales, acción simulada, sin red):** `artistas/FormularioArtista.componentes.test.mjs` (390 y 320: vacío → «Falta el nombre y la disciplina.»; sin pista → renglón pendiente con «Falta la disciplina», botón apagado que no envía; elegir un chip → resuelto, botón encendido, el envío lleva la disciplina y ninguna subcategoría; con pista → la disciplina sale sola y publicar está listo; cambiar a un nombre sin pista vuelve a pendiente, y lo elegido a mano se queda; nada desborda) y `lugares/FormularioLugar.ciudad.componentes.test.mjs` (punto cerca del contexto sin ciudad del mapa → se envía la de contexto; lejos → se envía vacía y el aviso del servidor sale en «Dónde»; el mapa da la ciudad → se envía esa aunque esté lejos del contexto).
- **Resultados:** `npm run lint` 0 errores (1 aviso que ya estaba, `VisorImagen.componentes.test.mjs`); `npm run typecheck` verde; `npm test` 142 archivos, 2058 pruebas verdes; componentes de las altas y afines (las dos nuevas, `Renglon`, `guardado`, `cupo`, `SelectorCuando`, `guardiaTrasError`, `SalirSinPublicar`) 57 de 57; `npm run inventario` sin novedades (343 medidas en duro, sin cambios); `npm run medir -- --solo=alta` sin novedades (s03, s07 y s11 a 320, 390, 820 y 1280; nodos 60 del artista a 320 y 390, sin cambios).
- **PG:** no toqué SQL ni migraciones; no corrí `test:db`.

## Evidencia (`docs/rediseno/capturas-327/`, 780×1688 y 640×1280, 2×; app compilada contra el respaldo local en los puertos 8934 y 3934, reloj fijo, letra Bricolage cargada)

Cada PNG abierto y descrito:

- `1-sin-pista-falta-la-disciplina-390` y `-320`: el nombre «Ana Ruiz»; el renglón «Qué hace» con la línea punteada gris de 1 px del canon (guion 4, aire 5), nota musical, «**Falta la disciplina**» en tinta y «Elegir» en violeta; debajo Solista, San Luis Potosí y los opcionales con su punteado fino de siempre; «Publicar artista» en violeta claro (apagado) y, debajo, la nota «Falta la disciplina.» A 320 se ve el renglón y la nota completos, sin cortarse.
- `2-elegir-chips-390` y `-320`: el renglón abierto (borde de tinta), «Falta la disciplina» en gris y los ocho chips (Música, Teatro, Danza, Artes visuales, Letras, Cine, Artes circenses, Otro) en tres renglones, todos dentro de la tarjeta.
- `3-disciplina-elegida-abierta-390` y `-320`: tras tocar «Artes visuales»: el valor pasa a «Artes visuales», queda el chip con su ✕, la línea y el campo opcional «Ej. son huasteco, jazz (opcional)»; «Publicar artista» ya está encendido (violeta pleno) sin haber tocado la subcategoría.
- `4-disciplina-elegida-390` y `-320`: tras «Listo»: el renglón resuelto («Artes visuales» / «Cambiar»), sin línea punteada, el botón encendido y sin nota.
- `5-con-pista-390` y `-320`: «Ballet Folclórico Universitario» (página recargada, nada elegido a mano): «Danza» sale sola, «Grupo» por el nombre, ningún renglón pendiente, botón encendido, sin nota.

Medido en el DOM en cada estado, a 390 y a 320: la página no se desplaza de lado (`scrollWidth` igual al ancho), el renglón queda dentro de la ventana, el valor del renglón y la nota del botón caben en una línea, `Bricolage Grotesque` cargada y usada por el valor, y ningún error de página.

## Dudas y qué falta

1. **Edición de una ficha «por completar»:** hoy no exige disciplina (arriba). ¿Se exige también al editar?
2. **La ciudad de un evento en «otro sitio»** sigue cayendo en San Luis Potosí si el mapa no la dio (`eventos/acciones.ts:65`): mismo defecto, otro dato, en la acción que se rehace por pasos. Se arregla con `ciudadParaPunto` al construir el evento y un aviso como el del lugar; no lo hice por estar fuera de esta pieza.
3. **Pedir la ciudad a la persona** cuando no se pueda saber (pantalla nueva) y el segundo intento de Mapbox con `types=place,locality`: ver B.3.
4. **Lista de palabras de música:** la añadí yo para no perder aciertos de hoy (Orquesta, Coro, Mariachi…); si el founder prefiere que solo las otras seis disciplinas deduzcan, se borra la última línea de `deducirDisciplina` y esos nombres piden elegir.
5. **Solo en un iPhone real:** el toque de «Elegir» y de los chips con el pulgar, el teclado abierto con el renglón pendiente, y la geocodificación inversa de verdad (aquí el token de Mapbox es inventado: la ciudad del mapa se probó con un doble, no contra Mapbox).
