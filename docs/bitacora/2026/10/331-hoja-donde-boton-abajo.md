# 331 · La hoja «¿Dónde es?» confirma abajo, no arriba

**Pieza:** OL-303. **Rama:** `hoja-donde-boton-abajo` (base `origin/main` `83b28fac`, con `origin/main` unido después). **Fecha:** 2026-10-05. **Operador:** Claude Fable 5.1.
**Estado:** hecho y probado en Chrome (headless) a 320 y 390 con el mapa y el teclado simulados; falta el iPhone real (lista al final). Sin migraciones, sin tocar acciones del servidor ni el alta por pasos.

## Qué se encargó

El founder probó en su iPhone la superficie del mapa y dijo (2026-10-05, noche): «Para la superficie del mapa, ¿podrías mantener el canon de botón de confirmación abajo? Me parece que traemos un “Listo” en la parte superior de la página.» Se refiere a la hoja «¿Dónde es?» de siempre (`HojaDonde`), que sigue viva en el formulario de evento (alta y **editar evento**) y, con el título «¿Dónde está?», en el de lugar. Llevaba «Atrás · título · Listo» arriba y, abajo sobre el mapa, cuando hay texto buscado, una franja con «Agregar «X» como lugar».

## Lo que hay

- **Arriba solo «Atrás» y el título** (el título queda centrado de verdad: tres columnas `1fr auto 1fr`, la tercera vacía).
- **El pie de abajo** es el `PiePaso` de los pasos nuevos (`PorPasos.tsx`: fondo, línea arriba, zona segura, sube con el teclado por `useAreaVisible`), sin copiar su CSS: solo ganó una propiedad `ref` (React 19, sin `forwardRef`) para que la hoja lo mida. Lleva un `ui/Boton` primario de ancho completo.
- **El botón dice qué falta** (`textoListo`, en `lib/hojaDonde.ts`, sin DOM y con prueba): **«Falta el lugar»** en un evento sin pin, **«Falta la ubicación»** en el punto de un lugar sin pin, **«Falta el nombre del lugar»** en un evento con pin suelto pero sin nombre (el nombre se pone en la tarjeta del pin, como antes), y **«Listo»** cuando `puedeListo` deja confirmar. Apagado con `aria-disabled` (sin `onClick`); la zona de anuncio del pie (`aria-live`) lo dice al cambiar. Las reglas de cuándo se confirma son las de siempre (`puedeListo` no cambió): sitio reservado, lugar registrado privado, «no tocado» al reabrir con algo ya elegido, el lugar solo con el punto.
- **«Agregar «X» como lugar»** es ahora un botón secundario flotante (`ui/Boton`, `variante="secundario" forma="pildora" flotante`, ancho completo con el aire de los lados, el texto largo se corta con puntos suspensivos y el + no se aplasta) que flota sobre el mapa, **encima del pie**. Ya no es una franja con fondo y sombra que tapaba todo el ancho. Su contenedor deja pasar los toques al mapa.
- **Con «Agregar lugar» abierto no hay pie**: esa hoja a media pantalla trae su propio botón («Guardar y usar este lugar», con su ayuda debajo) y quedaban dos confirmaciones.

## Maquetación

Plana: el pie es un hijo directo de la capa (`.capa > cabecera, cuerpo, footer`); el cuerpo (campo + mapa) termina donde empieza el pie, así que **el mapa no pasa por debajo del pie**: «Estoy aquí» y la marca y la ⓘ de Mapbox (abajo a la izquierda y a la derecha del mapa) quedan siempre encima de él, sin una medida por pantalla ni un `padding` nuevo al mapa. Se quitó la franja `.accionAgregar` y el `.listo` de la cabecera; el contenedor de «Agregar» es solo aire (`padding`) y sin fondo. Ningún color ni `z-index` nuevo (el pie usa `--z-pegajoso`, la barra sigue en `--z-barra`). `npm run inventario` bajó de 343 a 342 medidas en duro (desapareció el `56` de `ALTO_BARRA_ACCIONES`) y se anotó.

La hoja ya no tiene la constante `ALTO_BARRA_ACCIONES = 56` (era el `min-height` de la franja vieja). Ahora se mide lo que de verdad hay con un `useAlto(ref, activo)` de once líneas (`ResizeObserver`, alto con relleno): el pie y la barra «Agregar» dan la `reservaAbajo` de la lista flotante (`altoPie + altoBarra`: con el teclado abierto la lista sigue bajo el campo y termina antes de «Agregar»), y la barra es la altura de «Estoy aquí» cuando se ve.

## Decisiones del operador (no están en el encargo)

1. **«Falta la ubicación» para la hoja del lugar y «Falta el nombre del lugar» para un pin suelto sin nombre.** El encargo solo dio «Falta el lugar»; los otros dos son el mismo canon (el botón dice qué falta) aplicado a los otros dos casos en que antes el «Listo» de arriba estaba apagado sin decir por qué.
2. **El pie se oculta con «Agregar lugar» abierto**, en vez de dejarlo debajo de la hoja: dos botones de confirmar a la vez eran justo lo que el founder quiere evitar.
3. **«Agregar «X» como lugar» sigue flotando sobre el mapa y no entró en el pie.** Dentro del pie habría sido una pieza menos que medir, pero el pie crecería y se encogería cada vez que la lista se abre y se cierra, y el mapa se movería bajo el dedo: con la lista abierta, tocar el mapa la cierra y la lista ya no está; si el pie cambia de alto en ese momento, el mapa crece y el punto tocado cae unos 28 px más abajo. Flotando, el mapa no se mueve nunca.
4. **El alto de la hoja «Agregar lugar» ahora se mide con su relleno** (antes sin él): al unificar la medición, «Estoy aquí» dejó de quedar 8 px metido bajo la hoja (la prueba nueva lo detectó: «queda encima, nunca debajo» era lo que decía el código desde OL-182). De paso, el mapa recibe el `paddingInferior` completo para no tapar el pin.
5. **`PiePaso` gana una propiedad `ref`**, lo único que se tocó de `PorPasos.tsx`; el alta por pasos no cambia (los pies de sus pasos no la usan).

## Pruebas

- `npm run typecheck`: sin errores. `npm run lint`: 0 errores, 1 aviso que ya estaba (`VisorImagen.componentes.test.mjs`).
- `npm test`: 144 archivos, **2122 pruebas** en verde antes de unir `main` y **2138** después, con lo de OL-302 (3 nuevas en `hojaDonde.test.ts`: `textoListo` sin pin en evento y en lugar, con pin sin nombre, y con lo necesario).
- `test:componentes`: **369** en verde antes de unir `main` y **388** después (8 nuevas en `src/components/HojaDonde.componentes.test.mjs`, con la hoja y el pie reales, Mapbox simulado con `page.route` y el mapa como doble): la barra de arriba solo trae «Atrás» y el título y ningún «Listo»; el pie dice «Falta el lugar», está apagado, llega al borde de abajo y es de borde a borde, y tocarlo no confirma ni cierra; un pin sin nombre dice «Falta el nombre del lugar» y con el nombre «Listo» y entrega el sitio con su punto; reabrir con un lugar registrado dice «Listo» y entrega su id; la hoja del lugar («¿Dónde está?») dice «Falta la ubicación» y luego «Listo»; con texto, «Agregar «teatro» como lugar» queda encima del pie, «Estoy aquí» encima de «Agregar» y la lista termina antes de «Agregar»; **con el teclado simulado (336 px) el pie queda justo encima de él, «Agregar» sigue sobre el pie y la lista abre bajo el campo sin tocarlo**, y al bajarlo todo vuelve al borde; «Agregar» abre su hoja, el pie se va y «Estoy aquí» queda encima de la hoja; y **sin desbordes a 320 y 390** (vacía, con pin y un nombre de 80 letras, con la lista y «Agregar» con texto largo —el + no se aplasta—, y con teclado).
- `npm run inventario`: sin novedades (**342** medidas en duro, aceptadas; 2 bloques duplicados aceptados). `npm run medir`: sin novedades, **25 pantallas × 4 anchos**; ninguna pantalla medida abre esta hoja (la medición no recorre la hoja del mapa), así que los conteos no cambian (p. ej. `s03-alta-evento` 48/48/82/82 y `s07-alta-lugar` 38/38/72/72, que traen el formulario con la hoja cerrada).

## Capturas

`docs/rediseno/capturas-331/` (390×844 y una a 320×844; el mapa es un recuadro del tono del mapa con un pin, no el de Mapbox), cada una abierta y mirada:

- `pie-1-falta-el-lugar`: arriba «‹ Atrás» a la izquierda y «¿Dónde es?» centrado, sin nada a la derecha; el campo «Nombre o dirección»; el mapa; «Estoy aquí» abajo a la izquierda; y pegado al borde de abajo, con su línea arriba, el botón violeta de ancho completo y apagado (más claro) que dice «Falta el lugar».
- `pie-2-listo`: con un pin y «Patio de mi casa» puesto en la tarjeta (dirección debajo), el mismo botón sube a violeta pleno y dice «Listo».
- `pie-3-agregar-sobre-el-pie`: con «teatro» escrito, la lista flotante bajo el campo con cuatro lugares y el quinto cortado, «Estoy aquí», y encima del pie la píldora blanca con sombra «+ Agregar «teatro» como lugar»; el pie sigue debajo con «Falta el lugar».
- `pie-4-con-teclado`: lo mismo con un teclado de 336 px simulado: el pie y «Agregar» suben juntos (el pie termina en y = 508, donde empezaría el teclado; debajo se ve el mapa porque el teclado no se dibuja), y la lista, de cuatro renglones, termina antes de «Agregar».
- `pie-5-agregar-lugar-sin-pie`: «Agregar lugar» abierta a media pantalla (Nombre «teatro», Dirección, «Es un lugar privado», «Guardar y usar este lugar» apagado con su ayuda); no hay pie debajo, y «Estoy aquí» queda encima de la hoja.
- `pie-6-320-texto-largo`: a 320 de ancho, con un nombre larguísimo: la lista dice «“teatro de un nombre … ” no tiene ficha», la píldora corta con «…» en una línea con su + completo, y el pie debajo con «Listo» (hay pin).

## Qué probar en el iPhone

1. En **editar evento** (o el alta de siempre, mientras exista), abrir «¿Dónde es?»: arriba solo «Atrás» y el título; abajo «Falta el lugar» apagado.
2. Tocar el mapa o elegir un resultado: el botón pasa a «Listo» (o a «Falta el nombre del lugar» si es un pin suelto, hasta ponerle nombre); tocarlo vuelve al formulario con el sitio.
3. Escribir en el campo: con el teclado abierto, el pie y «Agregar «X» como lugar» quedan justo encima del teclado y la lista abre bajo el campo, sin taparlos. **Aquí está el riesgo real:** el pie se pega con `sticky` dentro de una capa fija y sube con `visualViewport`; en Chrome simulado funciona, pero el teclado de Safari es lo único que no se pudo comprobar.
4. Tocar el mapa con la lista abierta: el mapa no debe moverse bajo el dedo.
5. «Agregar lugar»: el pie desaparece mientras la hoja está abierta y «Estoy aquí» queda sobre ella.
6. «¿Dónde está?» del alta o edición de un lugar: «Falta la ubicación» y luego «Listo».
