# 378 · Cabecera de «Editar evento»: lápices sin letreros

**Pieza:** OL-349. **Rama:** `editar-cabecera-iconos` (sobre `origin/main` `b8cac807`). **Fecha:** 2026-10-08. **Operador:** Claude (agente del gestor V).
**Estado:** hecho y probado con los componentes reales en Chrome (390 y 320) y con la app compilada contra el respaldo local (`npm run medir`); falta el iPhone. **Sin migración.**

## Qué pidió el founder

Con una captura de su iPhone de «Editar evento» (2026-10-08): «el título y la imagen tienen letreros para editar e imagen está desfasada para abajo; agrega icono de editar sobre imagen, en el centro de la imagen, y alinea la imagen a la parte superior izquierda como debe ser; para el título agrega igual un icono en el extremo superior derecho».

Antes: la miniatura del cartel quedaba «caída» (la cabeza alineaba todo a su base, `align-items: end`, y con un nombre de tres líneas más los dos enlaces el texto era más alto que la miniatura) y debajo del nombre iban «Cambiar nombre» y «Cambiar cartel» con su palabra (bitácora 348, decisión 1).

## Qué cambió

- **La cabeza de «Revisa» (`CabezaCartel`, `PasoCartel.tsx` y `.module.css`) se alinea arriba:** rejilla con `grid-template-areas` y `align-items: start`; la miniatura pegada arriba a la izquierda y, a su derecha desde la misma altura, el sello «Leído del cartel» (si lo hay) y el nombre. Una última fila `1fr` se lleva el alto que sobra cuando la miniatura es más alta que el texto, para que el sello y el nombre no se separen. Sin envoltorios nuevos. Vale también para el alta (la misma cabeza, sin lápices): el nombre ya no baja hasta la base de la miniatura.
- **Lápiz sobre la miniatura, al centro** («Cambiar cartel»): un botón transparente del tamaño de la miniatura (4:5, el mismo ancho de siempre, `--ancho-cartel-revisa`) con el círculo del canon dibujado dentro (`claseBotonIcono({ relieve: "elevado" })`: 44 px, fondo blanco, sombra, glifo violeta; `IconoLapiz`, el de «Editar»). Toda la miniatura es el toque; abre el paso del cartel como antes.
- **Lápiz junto al nombre, arriba a la derecha** («Cambiar nombre»): al editar (clase `.editable`), el nombre lleva al principio un hueco flotante a la derecha del tamaño del botón (`--control`) con su aire a la izquierda (`--espacio-2`), un `::before` con `float: right`; el texto rodea solo las primeras líneas y las de abajo usan todo el ancho. El botón de verdad va encima, fuera del `h2` (dentro, su nombre se sumaría al del título), cubre el nombre y deja su círculo justo sobre el hueco, a la altura de la primera línea (con sello, debajo del sello). Tocar el nombre también lo cambia; abre «¿Cómo se llama?» como antes.
- **Sin letreros:** fuera «Cambiar nombre» y «Cambiar cartel» como texto (y su CSS: `.titulo + .cambiarNombre` de «Revisa» y `.cabeza > .cambiarCartel`); quedan solo como nombre accesible de los botones.
- **Sin cartel, al editar:** la cabeza va igual, con la imagen del símbolo SN de siempre (`SIN_FOTO`, `/sin-foto.png`) y el mismo lápiz al centro, que pone uno. Por eso sale el renglón punteado «Cartel · Agregar» (su salida sigue: es el lápiz del símbolo).
- `Revisa.tsx`: la cabeza entra con cartel o al editar (`cabeza`); el nombre es solo el `h2`; `CabezaCartel` recibe `editar={{ onCartel, onNombre }}` en vez de `onCambiar`.

## Decisiones por confirmar

1. **El nombre rodea el lápiz** (segunda vuelta, corrección del gestor). La primera vuelta reservaba al lápiz una columna de la rejilla a toda la altura: con «Taller de cianotipia sobre papel: el símbolo como herramienta visual» el nombre quedaba en seis líneas a 390 y en ocho a 320, con «herramien / ta» partida (la columna medía 116 px y la palabra unos 122). El gestor retiró esa instrucción y pidió el hueco flotante: ahora son **cuatro líneas a 390 y seis a 320, sin ninguna palabra partida**. Los presupuestos de medir no cambian con esto (el `::before` no es un nodo).
2. **Sin cartel, la miniatura del símbolo SN aparece al editar** (antes, sin cartel, solo el nombre y el renglón «Cartel · Agregar»). El círculo tapa el centro del símbolo; se ven las manos y los pies alrededor.
3. **En el alta la cabeza también se alinea arriba** (antes el sello y el nombre iban pegados a la base de la miniatura, prototipo de la bitácora 323). Es la misma cabeza y el founder dijo «como debe ser».
4. **Con el sello «Leído del cartel»** el lápiz del nombre va a la altura del nombre, no del sello (captura 04).

## Pruebas

- `npm run lint` (0 errores; el aviso de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (185 archivos, 3366 pruebas) e `npm run inventario` (sin novedades, 332 medidas en duro): en verde.
- `npm run medir`: 36 pantallas × 4 anchos, sin novedades tras subir dos presupuestos de nodos, **s21-editar-evento 43 → 47 (77 → 81 desde tableta) y s26-editar-exposicion 59 → 63 (93 → 97)**: los dos letreros (dos botones con texto) pasan a dos botones con su círculo y el lápiz dentro (`button > span > svg > 2 path`). Sin desbordes, toques de 44 y nada tapado; teclado sin fallos. Solo cambian esos dos números en `medidas.aceptadas.json`.
- Componentes (`EditarEvento.componentes.test.mjs`, Chrome de la Mac): **21 de 21** (3 nuevas). A 390 y a 320, con el nombre largo: ni «Cambiar nombre» ni «Cambiar cartel» se leen en la página; la miniatura arriba a la izquierda (misma altura que el nombre, al borde de la columna); el círculo del cartel mide 44 y está al centro de la miniatura, y su botón mide lo mismo que ella; el del nombre mide 44, a la derecha de la columna y a la altura del nombre; nada encimado (ninguna palabra a la altura del lápiz llega a él, medido palabra por palabra con `Range`); bajo el lápiz el ancho útil es el completo (el nombre llega al borde de la columna y algún renglón de abajo pasa por donde está el lápiz); ninguna palabra se parte; 4 renglones como mucho a 390 (6 a 320); tocar el nombre abre «¿Cómo se llama?» y tocar la esquina de la miniatura abre el paso del cartel. Sin cartel: el símbolo SN con el mismo lápiz al centro, que abre el paso sin «Quitar el cartel». La de quitar el cartel ahora espera el símbolo y ningún renglón «Cartel». `AltaEvento` (89), `ClasesEvento` y `Sugerencias`: en verde sin cambios.

## Capturas (`docs/rediseno/capturas-378/`)

Del harness de componentes (componentes y CSS reales, letra Bricolage de la compilación, reloj fijo del miércoles 7 de octubre de 2026), a 2×. Todas abiertas y revisadas.

- `01-cabecera-390.png`: «Editar evento» a 390 con cartel y «Taller de cianotipia sobre papel: el símbolo como herramienta visual»: la miniatura arriba a la izquierda con el lápiz blanco al centro; el nombre empieza a su altura, en cuatro líneas: «Taller de» y «cianotipia sobre» rodean el lápiz de arriba a la derecha y «papel: el símbolo como» y «herramienta visual» usan todo el ancho; los renglones de siempre y «Guardar cambios». Sin letreros.
- `02-cabecera-320.png`: lo mismo a 320: nada encimado; el nombre en seis líneas, «herramienta» entera.
- `03-sin-cartel-390.png`: el mismo evento sin cartel: el símbolo SN gris con el lápiz al centro y el nombre en cuatro líneas alrededor del lápiz.
- `04-cartel-leido-390.png`: tras subir un cartel nuevo con la lectura marcada: «Leído del cartel» arriba, «Ecos de papel: segunda función» y el lápiz del nombre a la altura del nombre (el pie dice «Guardando…» porque la prueba acaba de guardar).
- `05-alta-revisa-cartel-390.png`: el alta, «Revisa» con cartel leído: la miniatura arriba a la izquierda y, desde su borde de arriba, «Leído del cartel» e «Inauguración de Ecos de papel»; sin lápices.

## Qué probar en el iPhone

1. Ficha de un evento propio con cartel → ··· → Editar: la miniatura arriba a la izquierda con el lápiz al centro y el lápiz del nombre arriba a la derecha; sin «Cambiar nombre» ni «Cambiar cartel».
2. Tocar el lápiz de la miniatura (y la miniatura fuera del círculo): abre el paso del cartel. Tocar el lápiz del nombre (y el nombre): abre «¿Cómo se llama?».
3. Un evento sin cartel: el símbolo SN con su lápiz, que pone uno.
