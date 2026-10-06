# 333 · Todo campo de texto queda a la vista con el teclado abierto

**Pieza:** OL-305. **Rama:** `campos-sobre-el-teclado` (sobre `origin/main`). **Fecha:** 2026-10-05. **Operador:** Claude Fable 5.1.
**Estado:** hecho y probado en el simulador de iPhone (iPhone 15 Pro, iOS 26.3, Safari, con el teclado en pantalla), en Chromium (componentes y `npm run medir`) y con la suite. Falta el iPhone real del founder (lista al final). Sin migraciones.

## Qué se encargó

El founder vio en su iPhone (producción, 2026-10-05): en «¿Es aquí?» eligió un sitio, confirmó, tocó «Ponle nombre» y la caja de texto apareció bajo la tarjeta y, al enfocarla, **quedó debajo del teclado**. Su regla desde ahora: «en cada input text asegúrate de que no sea cubierto por el teclado». Pedido: un mecanismo compartido (no un arreglo local), aplicado donde manda el canon (`PorPasos`, `ui/Hoja`, el formulario de siempre), una comprobación nueva en `npm run medir`, prueba con teclado real en el simulador, pruebas de componentes y la regla en el canon.

## Qué pasaba (medido en el simulador, antes del arreglo)

Reproducido tal cual en el simulador (captura `antes-ponle-nombre.png`): el campo «Nombre del lugar» queda **bajo el teclado**, y el pie «Sí, es aquí / Buscar otro» (que sube con el teclado) queda flotando a media pantalla, sobre el contenido. Dos causas juntas:

1. **No hay por dónde desplazar.** Con el teclado abierto la ventana de maquetación no se encoge (solo el área visible, `visualViewport`). La columna de `PorPasos` mide la ventana (`min-height: 100dvh`) y el campo cabía ahí, así que Safari no la desplazó (medido: `scrollY` se queda en 0 y la página mide casi lo mismo que la ventana).
2. **El pie pegado tapa.** Cuando sí se desplaza, el campo queda justo encima del pie pegado y este lo cubre (el pie es `sticky` y, con teclado, subía con `bottom`).

Hallazgos de iOS que condicionaron el diseño (todos medidos en el simulador, con un recuadro de depuración temporal que ya no está):

- Con el teclado, `visualViewport.offsetTop` **no coincide** con el marco de `getBoundingClientRect` cuando la página se desplaza (daba 265 con `scrollY` 282 y las cajas ya relativas al área visible). El marco bueno es `pageTop − scrollY` (0 en iOS; el `offsetTop` real donde la vista se amplió con los dedos).
- Si el aire de abajo se calcula con `offsetTop` (como hacía `PiePaso`), **cambia mientras Safari mueve la vista** (de 337 a 0) y la página se encoge y salta a 0 en mitad del foco. El aire correcto es el alto del teclado: `innerHeight − visualViewport.height`, que no cambia.
- El foco sale un instante del botón antes de entrar en el campo recién montado («Ponle nombre» → su caja): si se suelta el aire en ese instante, la página se encoge y se pierde el desplazamiento.
- Con «reducir movimiento», la transición de 0,01 ms de `globals.css` deja `padding-bottom` en su valor anterior durante el cuadro siguiente: un `scrollBy` en ese cuadro no tiene recorrido (lo vi en Chromium).

## Lo que hay

- **`src/components/ui/useCampoVisible.ts`** (nuevo), montado **una sola vez en `Armazon`** (`Armazon.tsx`: una línea y su comentario). Escucha `focusin`/`focusout` en el documento y los `resize`/`scroll` de `visualViewport`:
  1. Publica `--teclado` en `<html>` (el alto del teclado mientras haya un campo enfocado; 0 sin él) y `data-teclado`.
  2. Al enfocar (tras un cuadro) y cada vez que el área visible cambia (dos cuadros después, y uno solo para varios cambios seguidos: sin temporizador a ciegas), calcula la banda libre —el área visible, recortada por lo pegado `sticky`/`fixed` que comparte pantalla con el campo (la barra de arriba, el pie) y por la caja del ancestro que se desplaza (el cuerpo de una hoja)— y, si el campo no cabe entero, desplaza lo que se desplaza (la hoja o la página) lo justo para dejarlo en el centro de esa banda; si es más alto que la banda (un área de texto), su arranque arriba. Si ya se ve, no mueve nada. Suave al enfocar (respeta «reducir movimiento»), de golpe al corregir.
  3. Una capa fija sin desplazamiento propio (`ui/CampoLargo`, que ya sigue al área visible) no se toca.
  Al ser un solo oyente de documento, **ningún campo lleva nada de más** y una pantalla nueva no tiene que acordarse de él.
- **`PorPasos.module.css`**: `padding-bottom: var(--teclado, 0px)` en la columna (hay por dónde desplazar) y el pie pasa a `position: static` con `html[data-teclado]`: en el flujo, tras el campo, queda sobre el teclado al fondo del recorrido (y en un paso corto, `margin-top: auto` ya lo deja ahí). `PiePaso` ya no usa `useAreaVisible` ni calcula `bottom`.
- **`ui/Plantilla.module.css`**: `.pagina` y `.paginaContenido` suman `var(--teclado, 0px)` a su relleno de abajo: las altas y ediciones de siempre (`/nuevo`, Ajustes…) tienen por dónde subir el campo del fondo.
- **`ui/Hoja.tsx`**: solo un comentario. Sus campos los atiende el mismo hook (desplaza el cuerpo de la hoja, que es lo que se desplaza); la hoja sigue al área visible con `useAreaVisible` como antes.
- **`scripts/ops/auditoria-ui/medir-pantallas.mjs`**: la comprobación «teclado» (abajo) y dos pasos nuevos.
- **`pantallas-sesion.json`**: `s16-alta-evento-nombre` («¿Cómo se llama?») y `s17-alta-evento-es-aqui` («¿Es aquí?» con la caja de nombre abierta; sin Mapbox la dirección del punto no llega, así que el nombre se pide de entrada). **`medidas.aceptadas.json`**: sus presupuestos (14/48 y 42/76 nodos, profundidad 6 y 11) y cinco excepciones «Permanente» de la DOM de Mapbox para `s17` (marcadores, controles de abajo y logotipo con margen −4: el mapa llena un elemento flexible sin altura propia, igual que las excepciones que ya había de Lugares).
- **`src/components/PorPasos.componentes.test.mjs`** (nuevo): 7 pruebas.
- **Canon:** la regla en `docs/diseno/LINEA_GRAFICA.md`, sección «El armazón» (es donde vive el canon de las pantallas; no hay un documento propio de formularios en `docs/diseno/`): «Todo campo de texto queda dentro del área visible al enfocarse; el mecanismo es `useCampoVisible`; la medición lo comprueba», con lo que exige a las pantallas.

## Medición («teclado» en `npm run medir`)

Para cada pantalla de `pantallas-prod.json` y `pantallas-sesion.json`, con la ventana a **390×508** (844 − 336, el iPhone con teclado) y el dispositivo táctil: se listan los campos de texto visibles (`text`, `search`, `number`, `email`, `url`, `tel` y `textarea`; no cuentan el cebo del teclado de `layout.tsx`, ni deshabilitados, de solo lectura o `aria-hidden`), se suelta el foco, se enfoca cada uno **con `preventScroll`** (Chromium centra solo el campo, Safari con teclado no siempre: lo que se mide es lo que logra el hook), se espera a que la página se asiente y se comprueba que el campo queda entero dentro de la ventana y que `elementFromPoint` en su centro no da algo pegado encima. Un campo tapado es un fallo con el nombre de la pantalla y del campo; admite excepciones como las demás reglas (`regla: "teclado"`).

**Límite declarado:** Chromium no puede sacar el teclado de iOS ni imitar cómo Safari desplaza la vista, así que esta comprobación cubre «el campo no queda fuera de la ventana ni bajo lo pegado» con la ventana ya reducida; **no** cubre que la página tenga recorrido (el aire de `--teclado`) ni el desfase de `offsetTop`. Eso lo prueban `PorPasos.componentes.test.mjs` (con un `visualViewport` simulado) y el simulador.

Resultado: **sin novedades** (27 pantallas × 4 anchos, 91 s): 7 campos en 7 pantallas (`10-entrar`, `s03-alta-evento`, `s07-alta-lugar`, `s10-buscar`, `s11-alta-artista`, `s16-alta-evento-nombre`, `s17-alta-evento-es-aqui`), ninguno tapado. **Control negativo:** con el hook apagado (variable temporal, ya retirada) la comprobación falla en `s17`: «Nombre del lugar» va de 510 a 558 en una ventana de 508.

## Pruebas

- `npm run typecheck`: limpio. `npm run lint`: 0 errores y 1 aviso que ya estaba (`VisorImagen.componentes.test.mjs`, variable sin usar). `npm test`: **2135 pruebas, 145 archivos, 0 fallos**. `npm run inventario`: sin novedades.
- Componentes (`PLAYWRIGHT_MODULE=… node --test "src/**/*.componentes.test.mjs"`): **387 pruebas, 0 fallos** (las 7 nuevas incluidas).
- `PorPasos.componentes.test.mjs` (390×844, `visualViewport` propio con `height` 508, `pageTop` = `scrollY`, `resize` disparado a mano): sin campo enfocado no hay `--teclado` y el pie sigue pegado; con el teclado, `--teclado` = 336 px, `data-teclado`, la columna gana 336 de relleno, el pie pasa al flujo y el campo (al fondo, sobre el pie) queda entre la barra y el área visible y sobre el pie; el pie queda sobre el teclado al fondo del recorrido; al cerrar el teclado todo vuelve; si el teclado llega 300 ms después del foco, el `resize` lo corrige; **control negativo** sin el hook (el campo queda tapado); y una hoja con el campo al fondo de su cuerpo.
- `npm run medir`: ver arriba. `npm run build` verde (lo compila `medir`).

## Simulador de iPhone (teclado real)

iPhone 15 Pro (E73372CB…), Safari, `http://localhost:3100` contra el respaldo local (`respaldo-local/server.mjs`, datos inventados) y la app compilada de la rama. Entré con `/auth/app-regreso?token_hash=prueba&siguiente=%2Fnuevo%2Fevento`, la ubicación se fijó con `simctl location set 22.1533,-100.9811` y el teclado salió con Simulator.app abierto (la preferencia `ConnectHardwareKeyboard` ya estaba en 0; no la toqué). Los toques fueron con la herramienta del simulador; se escribió tocando teclas. Como sin red Mapbox no responde, **para tener una dirección sin nombre** (el caso del founder: «Ponle nombre» solo sale con dirección) apunté temporalmente la llamada inversa de `lugarDesdePunto` a un servidor mínimo en el scratchpad (puerto 8824) que devuelve una dirección inventada; el cambio (una línea de `src/lib/geocodificar.ts`) **se revirtió antes del commit** (`git checkout`). Todo se apagó al terminar (servidores, `simctl shutdown`, Simulator).

Capturas en `docs/rediseno/capturas-333/` (1179×2556, de `simctl io`, comprimidas con `comprimir.mjs`; cada una la abrí y esto es lo que se ve):

1. `antes-ponle-nombre.png` (**antes**, rama sin el arreglo): «¿Es aquí?» tras tocar «Ponle nombre». El teclado ocupa la parte baja; sobre él, a media pantalla, el pie flotando («Sí, es aquí» violeta y «Buscar otro»), con la tarjeta de la dirección y el mapa difuminados detrás. **No se ve el campo**: está bajo el teclado.
2. `despues-ponle-nombre.png` (**después**): la misma pantalla. Arriba la cola del mapa con el logotipo de Mapbox, la tarjeta «Calle Inventada 12, Centro, San Luis Potosí» con su palomita, «Si el pin no está en su sitio, arrástralo.», **el campo «Nombre del lugar» con el cursor, entero y sobre el teclado**, y justo debajo, en el flujo, «Sí, es aquí» y «Buscar otro». El campo queda hacia la mitad de lo que se ve, como pide el encargo.
3. `antes-como-se-llama.png` (**antes**, el campo del nombre): «¿Cómo se llama?» con el campo con su lupa y el cursor, y el pie «Falta el nombre» sobre el teclado. Ya se veía bien; es el punto de comparación.
4. `despues-como-se-llama.png` (**después**): idéntica a la anterior (el hook no mueve nada si el campo ya se ve; el pie en el flujo cae en el mismo sitio gracias al aire de abajo): no hay regresión en el paso corto.
5. `despues-cuanto-cuesta.png` (**después**): «¿Cuánto cuesta?» con el campo de precio («Ej. 150», icono de boleto, cursor) a la vista sobre el teclado numérico y «Falta el precio» encima de él. No capturé «antes» del precio (misma forma que el nombre; no tenía el fallo del mapa).

## Decisiones y desviaciones del operador

1. **El hook se monta en `Armazon`, no en cada contenedor.** El encargo proponía dárselo a `PorPasos`, a `ui/Hoja` y al formulario de siempre. Un solo oyente de documento en el armazón cubre los tres (y cualquier campo futuro) sin tocar los archivos de los otros operadores ni cada campo; `Hoja` solo ganó un comentario. Coste: los componentes que dependen de él (`PorPasos`, `plantilla.pagina`) lo suponen montado; la prueba de componentes lo monta como el armazón.
2. **El pie de `PorPasos` deja de ser pegado mientras hay teclado** (en lugar de seguir pegado a `bottom: --teclado`). Es la única forma estable que encontré en Safari: pegado a `bottom` seguía tapando el campo y bailaba con `offsetTop` (ver arriba). Costo de producto: con el teclado abierto y un paso largo (solo «¿Es aquí?» con «Ponle nombre») el botón «Sí, es aquí» ya no está fijo a la vista, sino debajo del campo (se ve en la captura 2: está justo debajo); en pasos cortos queda exactamente donde estaba.
3. **`--teclado` = `innerHeight − visualViewport.height`**, no la fórmula de `useAreaVisible` (que resta `offsetTop`): ver «Qué pasaba».
4. **Marco de las cajas = `pageTop − scrollY`**, nunca negativo (mientras iOS reacomoda, `pageTop` llega un cuadro tarde).
5. **`scrollBy` a la ventana/ancestro, no `scrollIntoView`**: `scrollIntoView(center)` centra respecto a la ventana de maquetación, que en iOS con teclado queda fuera del área visible.
6. **El cebo del teclado** (`#cebo-de-teclado`, `layout.tsx`) se excluye de la medición: no es un campo que nadie toque. Dos pantallas nuevas en la medición (`s16`, `s17`) con sus presupuestos y excepciones de Mapbox; `s15` no se tocó (el 14/48 sigue; hoy mide 9/43 y `medir` avisa que bajó: lo anota el gestor con `--aceptar` si quiere, no es de esta pieza).
7. Para la prueba de componentes se usa `reducedMotion: "reduce"` (desplazamiento inmediato).

## Para el gestor (archivos de otros operadores; no los toqué)

- **`HojaDonde.tsx` (OL-303):** su `<Hoja>` hereda el hook sin cambios (desplaza el cuerpo de la hoja). Si su mapa/lista usa una capa propia con `position: fixed` y su propio desplazamiento, el hook la trata como cualquier ancestro que se desplaza. Probar en el iPhone el campo de búsqueda con el teclado y la hoja llena.
- **`AltaEvento.tsx`, `pasos.ts`, `Revisa.tsx`, `acciones.ts` (OL-304):** no necesitan nada propio mientras sus campos vivan dentro de `PorPasos` (nombre, precio, descripción y enlace de «Lo opcional» ya los cubre). Si «Revisa» o un paso nuevo añade un campo fuera de `PorPasos`, basta con que su pantalla use `plantilla.pagina` o sume `var(--teclado, 0px)` a su relleno de abajo.
- Si al unir cambia el orden de `PorPasos` (pie antes que el último campo), conviene repetir `PorPasos.componentes.test.mjs`.

## Para probar en el iPhone

1. `/nuevo/evento` → «No tengo cartel» → hasta «¿Dónde es?» → elegir un sitio del mapa (que no sea del directorio) → «Sí, es aquí»… o «Estoy aquí» → **«Ponle nombre»**: ¿la caja queda entera sobre el teclado, con «Sí, es aquí» justo debajo? ¿Se puede escribir y tocar «Sí, es aquí» (hay que bajar un poco si el teléfono es chico)?
2. «¿Cómo se llama?» y «¿Cuánto cuesta?» → «Tiene precio»: los campos siguen a la vista, el pie sobre el teclado.
3. «Lo opcional» (descripción larga y enlace) y las altas de siempre (`/nuevo`, lugar, artista), el campo del final del formulario: ¿sube sobre el teclado?
4. La hoja «Ciudad» o la de «¿Dónde es?» (la de siempre) con el teclado: sin cambios.
5. En la app instalada (pantalla de inicio) el comportamiento puede diferir del de Safari; probar ahí también el caso 1.
