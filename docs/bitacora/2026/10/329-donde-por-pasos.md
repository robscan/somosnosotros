# 329 · «Dónde» por pasos: buscar, confirmar en el mapa y qué hacer con el sitio

**Pieza:** OL-301. **Rama:** `donde-por-pasos` (base `origin/main` `3bafbf85`, con el armazón de la bitácora 328 ya unido). **Fecha:** 2026-10-05. **Operador:** Claude Sonnet 5.5.
**Estado:** hecho y probado en Chrome (headless) con Mapbox simulado a 320 y 390; falta el iPhone real y el mapa real (lista al final: en las capturas el mapa es un doble, porque el de verdad pide WebGL y un token). Sin migraciones, sin cambios en acciones del servidor (solo se llama a `crearLugarDesdeEvento`, que ya existe), sin enlazar desde la app.

## Qué se encargó

Pieza 4 del plan de la bitácora [323](323-publicar-por-pasos.md) (acta del prototipo firmado, punto 2). El founder probó en su iPhone el paso «¿Dónde es?» del alta por pasos, que abría la hoja de siempre (`HojaDonde`) a pantalla completa, y lo rechazó: «sigue siendo confuso que aparezcan dos campos de nombre de lugar [el buscador de arriba y el nombre editable de la tarjeta del pin], el usuario no sabe qué se espera de él en cada caso, al dejar uno vacío ¿está cometiendo un error?». Ya estaba anotado desde el 29 de septiembre: «la dirección editable confunde; la dirección es una confirmación, no un campo». La hoja se sustituye por tres pasos propios del armazón `PorPasos`.

## Lo que hay

Archivos nuevos:

- `src/app/nuevo/evento/PasosDonde.tsx` — los tres pasos: `PasoDonde` («¿Dónde es?»), `PasoMapa` («¿Es aquí?») y `PasoUso` («No está en el directorio»).
- `src/app/nuevo/evento/useBusquedaSitio.ts` — la búsqueda del sitio en el mapa (rebote de 350 ms, sin buscar con menos de 3 letras, solo enseña lo que corresponde al texto de ahora), `elegir` (pide al mapa las coordenadas de un resultado) y `aqui` (el punto de «Estoy aquí» con su dirección).

Cambios:

- `pasos.ts` (la regla, sin DOM): dos pasos nuevos, `mapa` y `uso`; el candidato (`Candidato`: el sitio que se confirma en el mapa, todavía no la respuesta); tres acciones nuevas del reductor (`elegir`, `confirmar`, `usar`); `sitioDeLugar`, `sitioDeCandidato`, `usosDisponibles`, `puedeGuardarComoLugar`, `lugarAlLado` (50 m), `nombreDelSitio`, `tituloDe`. La línea de avance cuenta `mapa` y `uso` como «Dónde».
- `lib/buscarLugares.ts`: `esNegocio(nombre, categorias)`, la regla «los negocios no entran» sobre lo que dice el mapa (categorías de Mapbox como bar, café, restaurante, tienda, hotel; o palabras del nombre como «cantina» o «cafetería»); un nombre que se dice cultural (museo, galería, teatro…) no cuenta aunque el mapa lo ponga junto a un café, y «plaza, jardín o parque» no salva a «Café del Jardín».
- `AltaEvento.tsx`: ya no usa `HojaDonde` ni su lista de lugares creados en la hoja ni `volverA` (se quitó la propiedad y su uso en `page.tsx`); lo escrito en el campo vive aquí para sobrevivir a Atrás y «Buscar otro».
- `Revisa.tsx`: el renglón del sitio dice el nombre (no «nombre · dirección · otro sitio») y, si es reservado, «Sitio reservado» en letra suave debajo.
- `AltaEvento.module.css` y `globals.css`: el mapa, la tarjeta y los avisos (sección 5) y un token, `--alto-mapa-paso`.
- Sin cambios: `HojaDonde`, `SelectorCuando`, `FormularioEvento` (siguen en producción hasta la pieza 6). `HojaDonde` y el nuevo hook comparten las funciones de `lib/` (`buscarConContexto`, `sugerirLugares`, `descartarSinCalle`, `recuperarLugar`, `lugarDesdePunto`), no el efecto: el de la hoja lleva además la búsqueda automática de la dirección leída del cartel y el panel «Agregar lugar», y moverlo habría sido tocar la hoja de producción. El mapa y el pin son los de siempre (`MapaDondeEs`).

## Cómo funciona

1. **¿Dónde es?** Un solo campo con lupa y ✕ («Nombre del lugar o dirección», foco al llegar). Sin texto, debajo va la opción **«Estoy aquí · Usa la ubicación del teléfono»** (`useEstoyAqui`; si el teléfono no da la ubicación, el aviso sale en letra suave). Con 2 letras o más, una **lista flotante** (`ui/ListaFlotante`, bajo el campo, sin empujar nada): primero los lugares del directorio que coinciden (icono de pin | nombre en negrita / «Lugar del directorio · dirección»; los privados propios dicen «Privado») y debajo lo que trae el mapa («Del mapa · dirección»). Del mapa solo se pregunta con 3 letras o más, una sola vez al dejar de escribir. Sin resultados: «No encontré «x». Prueba con la calle y el número.»; si falla el servicio: «No pude buscar…». No hay pie: elegir avanza.
   - Un **lugar del directorio** contesta y avanza directo a «¿Cuánto cuesta?»: su punto ya está confirmado. Uno privado propio sale como sitio reservado, nunca por su id (como hacía la hoja).
   - Un **resultado del mapa** (se piden sus coordenadas) o **«Estoy aquí»** (se lee la ubicación y se pide su dirección) llevan al paso 2.
2. **¿Es aquí?** El mapa con el pin arrastrable llena lo que sobra entre la pregunta y el pie; debajo, la **tarjeta de confirmación** (ok | nombre en negrita / dirección en letra suave) y «Si el pin no está en su sitio, arrástralo.». Pie: **«Sí, es aquí»** y, debajo, el botón quieto **«Buscar otro»** (Atrás: vuelve al campo con lo escrito). **No hay ningún campo de texto salvo si se pide.**
   - Si el mapa solo dio una dirección (o «Estoy aquí»), la tarjeta pone la dirección como título y aparece el botón quieto **«Ponle nombre»**, que abre **una** caja de texto (con ✕) bajo la tarjeta; la tarjeta muestra el nombre que se escribe como título y la dirección debajo. Nunca hay dos campos.
   - Al arrastrar el pin (o tocar el mapa) se vuelve a pedir la dirección del punto (`lugarDesdePunto`); mientras llega, el botón dice «Ubicando…» y está apagado.
   - Sin nombre propio, si hay un **lugar del directorio a menos de 50 m** del pin, se ofrece como título («A 40 m de ti · lugar del directorio»; tras arrastrar, «del pin») y «Sí, es aquí» **usa ese lugar** (va directo a «¿Cuánto cuesta?»).
   - Sin nombre y sin dirección (el mapa no contestó), la caja de nombre se abre sola y el botón dice «Falta el nombre».
3. **No está en el directorio.** Tres `ui/Opcion` grandes; elegir avanza: **«Usarlo solo en este evento»** (sitio «otro» con su nombre, dirección y punto), **«Guardarlo como lugar»** (ver la sección siguiente) y **«Es un sitio reservado»** (sitio reservado: la dirección y el punto van a los campos privados y los públicos quedan vacíos). **«Guardarlo como lugar» no se ofrece** si el mapa dice que es un negocio o si el sitio no tiene nombre propio (una dirección no nombra un lugar). Un sitio reservado conserva «cuántas horas antes» (24) e indicaciones ("") como ya venían: la hoja de siempre tampoco los pregunta (solo existen al editar un evento que ya los traía), así que no hay nada que poner en «Revisa».

### Guardarlo como lugar

Crea el lugar de verdad, con la misma acción de la hoja de siempre (`crearLugarDesdeEvento`, de `app/lugares/acciones`; en la primera entrega solo se anotaba y el gestor pidió que se hiciera aquí). Al tocar la opción se llama con el nombre, la dirección, el punto y la ciudad del candidato (`ciudadParaPunto`, como la hoja), público (`privado: false`) y el tipo lo deduce la propia acción del nombre. Mientras responde, la opción dice **«Guardando…»** y las tres se apagan (`ui/Opcion` gana `disabled` y `ocupada`: la ocupada no se atenúa). Si contesta con el lugar creado, o con «ya existe» y su id (`reutilizado`), `r.sitio` pasa a `{ modo: "lugar", lugarId }` (`sitioDeLugar`), el lugar se agrega a la lista `lugares` del alta (para que «Revisa» diga su nombre y «Cambiar» lo encuentre en la lista del campo) y sigue «¿Cuánto cuesta?». Si falla (la acción dice que no, o se cae la red), un aviso llano bajo las opciones, «No se pudo guardar el lugar. Puedes usarlo solo en este evento.», y las tres siguen tocables; el aviso se va al elegir otra. El campo `guardar` de `Sitio` ya no existe.
4. **Revisa.** El renglón del sitio dice el nombre y, si es reservado, «Sitio reservado» debajo. «Cambiar» vuelve al paso 1 **con el nombre del sitio puesto en el campo**; elegir otro lugar regresa a «Revisa» con el nuevo (y Atrás desde ahí, a «Revisa» sin cambiar nada).
5. **Ciudad (OL-299):** `CamposSitio` sigue calculándola con `ciudadParaPunto`; el candidato lleva la ciudad que dio el mapa (al buscar, al pedir la dirección del punto o tras arrastrar), y `r.sitio.otro.ciudad` y los puntos llegan al formulario escondido como hoy (comprobado en la prueba: `ciudad`, `sitio_lat`, `sitio_lng` o `privado_lat`/`privado_lng`).

## Maquetación

Todo cuelga directo de `main` (hijos medidos: `header, h2, label, button, form` en «¿Dónde es?»; `header, h2, div, div, small, footer, form` en «¿Es aquí?»; `header, h2, div, form` en «No está en el directorio»; lo más hondo, 3 niveles bajo `main`, y sin contar los `path` de los iconos 38, 42 y 46 nodos con el doble del mapa). Rejillas con áreas (la tarjeta, `ui/Opcion`), nada de `:has()` ni medidas por pantalla, ningún color ni `z-index` nuevos. El único contenedor sin contenido propio es el que da tamaño al mapa: `position: relative; flex: 1 0 var(--alto-mapa-paso)` (240 px mínimos; crece con la pantalla), con el radio y el recorte del canon. La lista flotante va en su portal (el canon de `ListaFlotante`). `npm run inventario`: sin novedades (343 medidas en duro, 2 bloques duplicados aceptados; la primera pasada marcó un bloque repetido de mi tarjeta con el detalle de `ui/Opcion` y lo cambié: `overflow-wrap` en vez de `min-width`).

## Decisiones del operador (no están en el acta ni en el encargo)

1. **«Guardarlo como lugar» no estaba en el encargo como lo quedó:** la primera entrega solo anotaba la elección porque la hoja de siempre crea el lugar con una acción aparte y no en el envío del evento; el gestor lo revisó y pidió crearlo aquí (sección «Guardarlo como lugar»). Se usa el mismo mensaje de error para cualquier fallo (el mensaje de la acción, que puede ser técnico, no se enseña).
2. **Tampoco se ofrece «Guardarlo como lugar» sin nombre propio** (una dirección sola), además del caso del negocio.
3. **Un sitio reservado sin nombre se llama «Sitio reservado»**, nunca con la dirección como nombre público (la dirección es justo lo que se reserva); y en «Revisa» no se repite el detalle cuando el nombre ya es ese.
4. **El renglón del mapa dice «Del mapa · dirección»** en vez de «Del mapa · no está en el directorio» del prototipo: con la dirección el renglón sirve para distinguir dos sitios del mismo nombre, y que no esté en el directorio ya lo dice quien lo ve debajo del directorio.
5. **El mapa de «¿Es aquí?» no pinta los pines de los lugares del directorio** (`lugares={[]}`): compiten con el pin y aquí no se eligen. Tocar un punto del mapa o un punto de interés del estilo **mueve el pin** (comportamiento del mapa de siempre) y pide la dirección; arrastrar hace lo mismo.
6. **«Estoy aquí» pide la dirección antes de pasar al mapa**, no después: la tarjeta llega con ella (la lectura de la ubicación ya tardaba) y el botón del campo dice «Buscando tu ubicación…» entretanto.
7. **El sitio ya contestado se pone en el campo** al cambiarlo desde «Revisa» (con su lista abierta, un toque para volver a elegirlo), en vez de abrir el campo vacío.
8. **Atrás desde «No está en el directorio» vuelve al mapa con el pin confirmado** y con el nombre ya puesto; el botón «Ponle nombre» no reaparece (el nombre ya está), así que ahí no se puede corregir ese nombre más que con «Buscar otro». Anotado para la prueba del iPhone.
9. **La búsqueda del sitio no estrena reglas:** el contexto es el de la hoja (`contextoDondeEsta`: texto, ciudad elegida, posición del teléfono; San Luis de respaldo) y sus reintentos acotan o no por ciudad como hoy.
10. Se quitó `volverA` de `AltaEvento` (solo lo usaba la hoja para registrar un lugar); la acción de crear el lugar lo pide solo para no redirigir, y aquí va una constante interna (`/nuevo/evento`).

## Pruebas

- `npm run typecheck`: sin errores. `npm run lint`: 0 errores, 1 aviso que ya estaba (`VisorImagen.componentes.test.mjs`).
- `npm test`: 144 archivos, **2119 pruebas** en verde (12 nuevas en `pasos.test.ts` —ahora 34—: un lugar del directorio salta el mapa y el uso; un resultado del mapa pasa por `mapa` y `uso` sin resolver el sitio hasta el final; «Buscar otro» y Atrás; sitio «otro» y reservado; lugar creado con «Guardarlo como lugar» (el sitio pasa a ser ese lugar y sigue «¿Cuánto cuesta?»); dirección sin nombre; negocio sin «Guardarlo como lugar»; lugar privado; 50 m; avance; cambiar desde «Revisa»— y 4 de `esNegocio` en `buscarLugares.test.ts`).
- `test:componentes`: **361** en verde (18 nuevas en `AltaEvento.componentes.test.mjs`, ahora 30: Mapbox simulado con `page.route` —sugerencias, coordenadas y dirección de un punto— y el mapa como doble con un botón que arrastra el pin): un solo campo con ✕ y «Estoy aquí»; la lista con un lugar del directorio y un resultado del mapa en ese orden; una sola consulta al mapa al teclear de seguido y ninguna con menos de 3 letras; lugar del directorio → «¿Cuánto cuesta?» sin mapa; resultado del mapa → «¿Es aquí?» con nombre y dirección y **ningún `input` visible**; arrastrar pide la dirección; «Sí, es aquí» → tres opciones y lo que recibe `crearEvento`; «Ponle nombre» abre una sola caja con ✕; negocio sin «Guardarlo como lugar»; «Guardarlo como lugar» llama a la acción con nombre, dirección, punto y ciudad (la acción es un doble, como en `guardado.componentes.test.mjs`) y se publica por el id del lugar, «Revisa» lo nombra y «Cambiar» lo encuentra; con «ya existe» usa el lugar que ya había; mientras guarda dice «Guardando…» y apaga las otras; si falla (respuesta negativa o red caída) sale el aviso y todo sigue tocable, y «solo en este evento» sigue publicando; reservado (campos privados llenos, públicos vacíos); «Estoy aquí» a 44 m de un lugar y lejos de todo; «Cambiar» desde «Revisa»; **sin desbordes a 320 y 390** (ningún elemento fuera de la ventana ni desplazamiento a lo ancho en lista, mapa con un nombre de 80 letras, uso y «Revisa»); y los niveles del DOM.
- `npm run inventario`: sin novedades. `npm run medir`: sin novedades, **25 pantallas × 4 anchos**; `s15-alta-evento-pasos` (que mide el primer paso) no cambia: 14 nodos a 320 y 390, 48 a 820 y 1280, 6 de profundidad. Los pasos nuevos no están en esa medición (`medir` no recorre pasos intermedios): sus niveles salen de la prueba de componentes (arriba).

## Capturas

`docs/rediseno/capturas-329/` (390×844, y cuatro a 320×844), cada una abierta y mirada. Salen de la prueba de componentes con el **mapa como doble**: un recuadro del tono del mapa con un pin; el mapa real no está en ellas.

- `donde-1-vacio-estoy-aqui`: ✕ a la izquierda de «Publicar», «¿Dónde es?», un solo campo con lupa y el placeholder «Nombre del lugar o dirección», debajo la opción «Estoy aquí · Usa la ubicación del teléfono» con su chevron. Nada más; sin pie.
- `donde-2-lista-directorio-y-mapa`: con «teatro», la lista flotante pegada bajo el campo: «Teatro de la Paz · Lugar del directorio · Villerías 205» y, debajo, «Teatro Polivalente · Del mapa · Calle Reforma 5, …». La ✕ del campo a la derecha.
- `mapa-1-con-nombre`: «¿Es aquí?», el mapa llena el cuerpo con el pin violeta al centro, la tarjeta («Jardín de San Juan de Dios» en negrita, su dirección debajo, palomita verde), «Si el pin no está en su sitio, arrástralo.» y el pie: «Sí, es aquí» y «Buscar otro» subrayado. Ningún campo.
- `mapa-2-ponle-nombre`: una dirección sin nombre a la que se le puso «Casa Galeana»: el título de la tarjeta es el nombre, la dirección queda debajo y **una sola** caja («Casa Galeana», lápiz y ✕) bajo el aviso.
- `mapa-3-estoy-aqui-lugar-cercano`: «Teatro de la Paz» como título y «A 44 m de ti · lugar del directorio» debajo; ni «Ponle nombre» ni caja.
- `uso-1-tres-opciones`: «No está en el directorio» y las tres opciones con su icono violeta (pin, más, candado), título y detalle, chevron.
- `uso-2-dos-opciones-negocio`: con «La Cantina» (categoría bar), solo «Usarlo solo en este evento» y «Es un sitio reservado».
- `revisa-1-sitio-reservado`: «Lectura en voz alta»; tres renglones sin etiqueta: reloj «vie 9 de oct · 19:00–21:00», pin «Jardín de San Juan de Dios» con «Sitio reservado» en letra suave debajo, boleto «Gratis», cada uno con «Cambiar» en violeta; enlace quieto y «Publicar».
- `uso-3-guardando-el-lugar`: con la acción sin responder, «Guardando…» en el sitio de «Guardarlo como lugar», con su detalle y su icono en tinta, y las otras dos opciones atenuadas.
- `uso-4-no-se-pudo-guardar`: tras el fallo, las tres opciones normales y debajo, en letra suave, «No se pudo guardar el lugar. Puedes usarlo solo en este evento.»
- `320-1-lista`, `320-2-mapa-nombre-largo`, `320-3-uso`, `320-4-revisa-nombre-largo`: a 320 de ancho la lista, la tarjeta (con un nombre de 80 letras que baja a cinco líneas), las tres opciones (el título de la pregunta baja a dos líneas) y «Revisa» caben sin desbordar. **Hallazgo fuera de esta pieza** (canon `ui/FormularioCanon`): en `320-2` el texto largo de la caja pasa por debajo de la ✕ del campo (el campo del canon no reserva sitio a la derecha para ella; pasa igual en el nombre del evento): se anota para una pieza chica.

## Qué falta

- **La prueba con el mapa real** (token y WebGL): arrastrar el pin con el dedo, el centrado al llegar, y que el mapa cargue dentro de la tarjeta de la pantalla; las capturas de arriba usan un doble.
- La ✕ que pisa el texto largo del campo (canon), y que «Revisa» no ofrece corregir un nombre ya confirmado salvo repitiendo el sitio.
- El resto del plan: el camino con cartel, «Publicado» y el cambio de ruta con el retiro del formulario viejo (y de `HojaDonde` si ya nadie más la usa: el alta de lugar sí la usa).

## Qué probar en el iPhone (Safari, `/nuevo/evento`)

1. «¿Dónde es?»: el teclado sale solo y «Estoy aquí» queda por encima de él; escribir «teatro» enseña el directorio primero y debajo lo del mapa; la ✕ vacía el campo.
2. Elegir un lugar del directorio: va directo a «¿Cuánto cuesta?». Elegir uno del mapa: «¿Es aquí?» con el mapa real, el pin que se arrastra con el dedo y la dirección que cambia debajo.
3. «Estoy aquí» (con permiso y sin él), a menos de 50 m de un lugar del directorio y lejos de todos.
4. «Ponle nombre» con una dirección: una sola caja, el pie sobre el teclado, el botón que dice «Falta el nombre» solo cuando no hay ni nombre ni dirección.
5. «Guardarlo como lugar» con un sitio del mapa (crea de verdad un lugar: hay que borrarlo después desde Ajustes o el panel si fue de prueba) y comprobar que «Revisa» lo nombra. Un bar o café del mapa: solo dos opciones. Un sitio reservado: «Revisa» con «Sitio reservado».
6. Atrás en cada paso, «Buscar otro», y «Cambiar» el lugar desde «Revisa».
