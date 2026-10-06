# 336 · Las acciones quedan sobre el teclado: el pie de los pasos va anclado justo encima de él

**Pieza:** OL-308. **Rama:** `acciones-sobre-el-teclado` (sobre `origin/main` `82ec432f`). **Fecha:** 2026-10-06. **Operador:** Claude Fable 5.1.
**Estado:** hecho y probado en el simulador de iPhone (iPhone 15 Pro, iOS 26.3, **Safari y app instalada**, con el teclado en pantalla), en Chromium (componentes y `npm run medir`) y con la suite. **Una cosa no pude reproducir** (el fallo exacto del founder; ver «Qué pasaba»): falta su iPhone (lista al final). Sin migraciones.

## Qué se encargó

El founder vio en producción (2026-10-06, app instalada en su iPhone): en «¿Cómo se llama?», con el teclado abierto, el pie con «Siguiente» queda **debajo del teclado** (asoma su sombra violeta bajo las teclas) y tiene que esconder el teclado para tocarlo. Regla nueva suya: **«cuando existan acciones (botones) en pantalla se mantienen sobre el teclado»**, a la vez que la de OL-305 (el campo enfocado nunca tapado). Pedido: el pie vuelve a estar pegado sobre el teclado con un solo mecanismo (también en la hoja «¿Dónde es?»), el campo sigue a la vista, la medición comprueba los botones de abajo, pruebas de componentes, prueba con teclado real en Safari y en la app instalada, y la regla en el canon.

## Qué pasaba

OL-305 puso el pie de la columna de los pasos en el flujo con el teclado abierto (`position: static`). Hipótesis del encargo: en Safari parecía funcionar porque Safari desplaza la página al enfocar, y en la app instalada no. **No se reproduce en el simulador**: con el código de `main`, «¿Cómo se llama?» tiene el pie entero y encima del teclado **tanto en Safari como en la app instalada** (capturas `antes-*`). En un paso corto el pie en el flujo cae justo en el borde del área visible. Lo que sí medí, y es lo que condiciona el arreglo:

- **El pie en el flujo solo está bien por casualidad.** Si el paso tiene recorrido (el campo queda abajo y iOS desplaza la página para verlo), el pie se va con el contenido y queda a media pantalla, con un hueco debajo; y cualquier causa que deje el borde de abajo del flujo más bajo que el teclado lo deja bajo él. No hay nada que lo ancle a lo que se ve.
- **Safari cambia `window.innerHeight` mientras desplaza** (695 → 463 al llevar «Enlace» a la vista, con `scrollY` en 232) y la ventana de Safari tiene su propia píldora «localhost» sobre el teclado: el área visible termina donde empieza la píldora. Por eso `--teclado` no es «336 px»: es lo que le falta al área visible para llegar a la ventana (310 con el teclado numérico, 337 con el de letras, 105 en el estado del campo de abajo). La prueba y el CSS solo usan esa resta, nunca un número fijo.

No supe explicar por qué el pie del founder queda bajo el teclado en su iPhone. El arreglo hace que no dependa de nada de eso: el pie se ancla al borde de abajo del área visible.

## Lo que hay

- **`ui/useCampoVisible`** publica ahora, además de `--teclado`, **`--abajo-visible`**: a cuánto del borde de abajo de la ventana termina lo que se ve (`innerHeight − visualViewport.height − desfase`, con el mismo `desfase = pageTop − scrollY` que ya usaba el cálculo de la banda libre; la bitácora 333 anotó por qué no es `offsetTop`). Es el `bottom` de todo lo pegado sobre el teclado. `--teclado` sigue igual (no cambia aunque Safari mueva la vista, que es lo que necesita el relleno de abajo). Una función (`desfaseVisible`) sirve a las dos.
- **`PorPasos.module.css` / `PiePaso`**: el pie lleva `bottom: var(--abajo-visible, 0px)` siempre. **Con el teclado abierto, en la columna de los pasos, pasa a `position: fixed`** (sale del flujo y queda anclado sobre el teclado); la columna suma a su relleno de abajo `--teclado` + `--alto-pie` + 12 px de aire, así `useCampoVisible` puede subir el campo por encima del pie (el hook ya contaba lo `fixed` como parte de lo pegado). `PiePaso` publica su alto en `--alto-pie` (un `ResizeObserver`; fuente fraccionaria, `getBoundingClientRect`). Se quitó la regla `position: static` de OL-305.
- **La hoja «¿Dónde es?»** ya no recibe `abajo`: se quitó la prop de `PiePaso` y `HojaDonde.tsx` ya no la pasa. Su pie sigue `sticky` en su capa fija y toma el mismo `--abajo-visible`; su barra «Agregar» y su hoja siguen con su `bottomBarra` (no los toqué). Un solo mecanismo para el pie, sin duplicar.
- **Por qué `fixed` y no `sticky`** (lo primero que probé, solo con CSS): el pie `sticky` con `bottom: var(--abajo-visible)` pasó en «¿Cómo se llama?» y en «¿Cuánto cuesta?», pero **falló en el simulador en «¿Quieres agregar algo?»** (el campo «Enlace» al fondo): `sticky` solo sube un pie que está más abajo del borde; como Safari desplazó la página para ver el campo, el pie quedó a media pantalla con el campo asomando bajo él, y poco después con el pie fuera de la vista arriba (capturas `intento-sticky-*`). `fixed` + relleno lo resuelve en los dos entornos.
- **Canon** en `docs/diseno/LINEA_GRAFICA.md` («El armazón», junto a la regla del campo): «Cuando hay acciones en pantalla y el teclado está abierto, el pie con las acciones queda pegado justo encima del teclado; la medición lo comprueba» (founder, 2026-10-06), con el mecanismo y lo que exige a una pantalla nueva (usar `PiePaso`); y la regla del campo ahora cita `--abajo-visible`.

## Medición («teclado» ampliada en `npm run medir`)

Además de cada campo de texto (que queda entero dentro del área visible y sin nada pegado encima), **con el campo enfocado se comprueba cada botón de abajo**: los de un `footer` y los de lo pegado (`sticky`) o fijo (`fixed`) cuyo centro cae en la mitad de abajo del área visible. Cada uno debe quedar entero dentro del área visible de 508 px y sin nada encima en su centro; un botón fuera es un fallo con el nombre de la pantalla y el texto del botón. **De dos maneras:**

1. **`ventana`**: la ventana de Chromium a 390×508 (como en OL-305).
2. **`area`** (nueva): la ventana a **390×844 con un `visualViewport` simulado** (el mismo truco de `PorPasos.componentes.test.mjs`) que se encoge 336 px al enfocar. Con él **sí actúa el mecanismo** (`--teclado`, `--abajo-visible`, el pie `fixed`, el relleno); en la ventana reducida no actuaría, porque `innerHeight − visualViewport.height` vale 0. Por eso **no puse `--teclado` a mano en `<html>`**: simular el `visualViewport` es más fiel (corre el hook de verdad) y no suma el aire dos veces.

Resultado final: **27 pantallas × 4 anchos, 112 s, sin novedades.** Teclado: 7 campos en 7 pantallas (`10-entrar`, `s03-alta-evento`, `s07-alta-lugar`, `s10-buscar`, `s11-alta-artista`, `s16-alta-evento-nombre`, `s17-alta-evento-es-aqui`), ninguno tapado. Botones de abajo comprobados: «Falta el nombre» (`s16`), «Falta el nombre» y «Buscar otro» (`s17`) y la tira de tipos «Evento / Lugar / Artista» (`s03`, `s07`, `s11`); `10-entrar` y `s10-buscar` no tienen botones de abajo.

**Hallazgo real de otra pantalla (anotado, no arreglado):** la **tira de tipos de `/nuevo`** (`nuevo/Alta.module.css`, `.tira`: Evento · Lugar · Artista, `sticky` abajo) **queda bajo el teclado** en el modo `area` (va de 789 a 844 en un área de 508): nueve hallazgos al principio (los tres botones en `s03`, `s07`, `s11`). Es un selector de qué formulario se ve, no una acción, y el botón de publicar va dentro del formulario, así que la dejé como **excepción permanente con su porqué** en `medidas.aceptadas.json` (tres entradas, «botón «Evento»», «Lugar», «Artista»). **Decisión para el gestor/founder:** si la quiere sobre el teclado como el pie de los pasos, basta `bottom: var(--abajo-visible)` en `.tira` (una línea; reduce 64 px el área del formulario con el teclado).

**Control negativo de la comprobación:** con el pie `fixed` pero `bottom: 0` (temporal, ya retirado) el modo `area` falla en `s16`: «botón «Falta el nombre» … fuera del área visible de 508 px con «Nombre del evento» enfocado: va de 780 a 828»; el modo `ventana` no lo ve (límite declarado arriba). Con el CSS de OL-305 (pie estático) la medición **no** falla: coincide con el simulador, donde tampoco fallaba.

## Pruebas

- `npm run typecheck`: limpio. `npm run lint`: 0 errores y 1 aviso que ya estaba (`VisorImagen.componentes.test.mjs`). `npm test`: **2168 pruebas, 147 archivos, 0 fallos**. `npm run inventario`: sin novedades.
- Componentes (`PLAYWRIGHT_MODULE=… node --test "src/**/*.componentes.test.mjs"`): **421 pruebas, 0 fallos.**
- `PorPasos.componentes.test.mjs` (10 pruebas, `visualViewport` simulado de 508 de alto con `pageTop` y desvío propios): sin campo enfocado no hay `--teclado` ni `--abajo-visible` y el pie sigue `sticky`; con el teclado el pie es `fixed`, su borde de abajo queda **en el borde del área visible** (arriba, a medias y al fondo del recorrido), el campo queda sobre el pie y la columna suma teclado + alto del pie + 12; en un paso corto («¿Cómo se llama?») el pie queda sobre el teclado; **un paso con poco recorrido y el campo al fondo (como «¿Quieres agregar algo?»), con Safari moviendo la página por su cuenta, no deja el campo bajo el pie**; con la vista desplazada por iOS (`offsetTop` de 100) el pie sigue el borde de lo que se ve y no el de la ventana; al cerrar el teclado todo vuelve; teclado tardío; control negativo sin el hook; hoja con campo al fondo. **Control negativo del pie:** con la regla `static` de OL-305 fallan tres (el campo/pie en teclado, el pie en el borde, el pie con la vista desplazada).
- `HojaDonde.componentes.test.mjs`: **las mismas 8 pruebas, sin cambios de comportamiento** (incluida «con el teclado abierto el pie sube con él…»). Dos cambios de armazón de prueba: el montaje de la hoja ahora va dentro de un `Armazon` de prueba que corre `useCampoVisible` (como en la app, donde el hook vive en `Armazon`), y su `visualViewport` simulado gana `pageTop`.

## Simulador de iPhone (teclado real)

iPhone 15 Pro (E73372CB…), `http://localhost:3100` contra el respaldo local (`respaldo-local/server.mjs`, datos inventados) y la app compilada de la rama. Safari: `/auth/app-regreso?token_hash=prueba&siguiente=%2Fnuevo%2Fevento`. App instalada: «···» → Share → View More → Add to Home Screen (bitácora 083); como la web instalada tiene su propio almacén de cookies, entré **dentro de la app** con el correo `ana@example.com` del respaldo y un código de 8 dígitos cualquiera (el respaldo acepta cualquiera), y para abrirla en `/nuevo/evento` (no hay enlace en la interfaz todavía) puse esa URL en el `Info.plist` del acceso directo con el simulador apagado. Los toques fueron con la herramienta del simulador, escribiendo tocando teclas; para el recorrido de la app (cartel → «No tengo cartel» → nombre → día → hora → sitio del directorio → precio → «Revisa» → «Agregar artistas, descripción o enlace» → «Enlace») hacen falta esperas entre toques. Al terminar: servidores apagados, `simctl shutdown`, Simulator cerrado, y **quité el acceso directo de prueba** (`WebClips/49E227BB….webclip`; los otros cuatro eran de antes).

Capturas en `docs/rediseno/capturas-336/` (1179×2556, de `simctl io`, comprimidas; cada una la abrí y esto es lo que se ve):

1. `antes-safari-nombre.png` (**antes**, `main`): Safari, «¿Cómo se llama?»; el campo «Nombre del evento» con la lupa y el cursor, y debajo, entero, el pie con la raya y «Falta el nombre» (violeta claro); luego la píldora «localhost» de Safari, la barra de flechas y el teclado.
2. `antes-instalada-nombre.png` (**antes**, `main`): lo mismo en la app instalada (sin barra de Safari): el pie «Falta el nombre» entero, un vacío blanco bajo él y la barra de flechas de iOS. **No reproduce el fallo del founder.**
3. `despues-safari-nombre.png` (**después**): idéntica a la 1 con el campo sin cursor en el instante de la captura; el pie entero sobre la píldora.
4. `despues-instalada-nombre.png` (**después**): idéntica a la 2.
5. `despues-safari-precio.png`: «¿Cuánto cuesta?» con el campo del boleto y «15», el pie «Siguiente» entero sobre la píldora y el teclado numérico.
6. `despues-instalada-precio.png`: lo mismo en la app instalada, sin la píldora.
7. `despues-safari-opcional.png`: «¿Quieres agregar algo?» con la página desplazada: el aviso del artista, «Descripción», «Enlace» y **su campo enfocado entero** («Boletos, más información…», con cursor), debajo la raya y **«Listo» entero sobre la píldora y el teclado**. Es el caso que rompía con `sticky`.
8. `despues-instalada-opcional.png`: lo mismo en la app instalada: el campo «Enlace» enfocado entero, «Listo» entero debajo y la barra de flechas.
9. `hoja-donde-teclado-texto.png`: la hoja «¿Dónde es?» con «San» escrito: la lista flotante («ACHE Galería · Valentín Gama 840…»), «+ Agregar «San» como lugar» sobre el pie y «Falta el lugar» entero sobre la píldora (igual que en la bitácora 333; el mapa de fondo trae el aviso del token inventado).
10. `intento-sticky-campo-bajo-el-pie.png` (intento descartado, `sticky`): «¿Quieres agregar algo?» con «Listo» a media pantalla y el campo «Enlace» asomando cortado por debajo de él.
11. `intento-sticky-pie-arriba.png` (intento descartado): la página ya desplazada del todo: «Listo» cortado arriba, bajo la barra de estado, «Enlace» debajo y un hueco hasta el teclado.

## Decisiones y desviaciones del operador

1. **No reproduje el fallo del founder** ni en Safari ni en la app instalada del simulador con el código de `main`; arreglé la causa estructural (nada ancla el pie al área visible). **Hace falta su iPhone** para confirmarlo (abajo).
2. **`fixed` con relleno medido, no `sticky`** (ver «Lo que hay»): el encargo hablaba de «anclar con `bottom`»; `sticky` no basta.
3. **Una variable nueva, `--abajo-visible`**, además de `--teclado` (el encargo decía «una sola fuente»: las dos miden lo mismo con y sin desfase; el relleno necesita la que no cambia y lo pegado la que sigue al área visible). Ambas las publica el mismo hook y están documentadas en él.
4. **El pie sale del flujo con el teclado** (la columna conserva su altura con el relleno `--teclado + --alto-pie + 12 px`, así no salta).
5. **La medición corre de dos maneras** (ventana reducida y `visualViewport` simulado) y no pone `--teclado` a mano. `medir` pasa de ~91 a 112 s.
6. **La tira de tipos de `/nuevo` queda bajo el teclado**: excepción permanente documentada; decide el founder si sube.
7. `HojaDonde.componentes.test.mjs`: el montaje de prueba corre `useCampoVisible` y el `visualViewport` simulado trae `pageTop`; las 8 pruebas no cambian de comportamiento.
8. La línea de OL-305 en `OPEN_LOOPS.md` dice que el pie queda en el flujo y que la hoja usa `abajo`; no la toqué (regla del encargo): queda reemplazado por esta pieza.

## Para probar en el iPhone

1. App instalada: `/nuevo/evento` → «No tengo cartel» → «¿Cómo se llama?»: ¿el pie con «Siguiente» queda **entero justo encima del teclado**, sin esconder el teclado? Repetir en «¿Cuánto cuesta?» → «Tiene precio» y en «Revisa» → «Agregar artistas, descripción o enlace» (tocar «Enlace»: el campo y «Listo» a la vez sobre el teclado).
2. Lo mismo en Safari.
3. «¿Es aquí?» → «Ponle nombre»: la caja y «Sí, es aquí» sobre el teclado.
4. La hoja «¿Dónde es?» con el teclado: sin cambios.
5. `/nuevo` (el formulario de siempre): la tira Evento · Lugar · Artista queda bajo el teclado; decir si la quiere sobre él.
