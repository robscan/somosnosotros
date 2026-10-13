# 431 · El orden de Lugares: «Con hora primero», el desplegable junto a «N lugares» y las dos líneas (OL-400)

**Fecha:** 2026-10-13. **Rama:** `lugares-orden`, base `origin/main` (`9f81f2b0`). **Operador:** agente del Gestor VI (Opus 5.5), en un árbol aislado. **Sin migración, sin tablas y sin consultas nuevas.**
**Estado:** lista para la revisión del gestor y el «publica» del founder. Vista previa: `https://somosnosotros-git-lugares-orden-robscans-projects.vercel.app/lugares`.

## El encargo

Pasar a código lo que el founder firmó el 13 de octubre a las 12:10 en `lugares-orden-propuestas.html` (OL-399, bitácora 430): «O Con hora primero · D Cabecera «N lugares» · E Cercanos primero / Próximos primero · R Las dos líneas». El pedido de origen: «Los eventos van antes que las expos cuando el usuario no tiene activa ubicación, y facilitar que usuario elija entre los mas cercanos primero y eventos próximos primero usando dropdown en la cabecera».

## Lo que se ve

- **Junto a «N lugares»**, a la derecha, un botón de texto violeta con su flecha: «Próximos primero ⌄» (sin ubicación) o «Cercanos primero ⌄» (con el permiso ya concedido). Abre un menú con tres opciones y la marca en la elegida: **«Cercanos primero» · «Próximos primero» · «Alfabético»**. El menú flota sobre todo; si la hoja está recogida, abre hacia arriba, nunca bajo la barra de abajo.
- **«Próximos primero»**: «Con eventos» en dos tandas. Primero los lugares con algo **con hora** (un evento, una sesión de taller, un acto, o una exposición por abrir), por su fecha; después los que **solo** tienen algo de varios días ya abierto (exposición, taller o festival), el que cierra antes primero. «Sin eventos próximos», por nombre.
- **«Cercanos primero»**: los dos grupos por distancia, con los km en cada renglón (lo de antes con ubicación).
- **«Alfabético»**: los dos grupos por nombre, sin mezclarlos.
- **Sin ubicación, elegir «Cercanos primero» pide el permiso** por el mismo camino que el botón «Mi ubicación» (con una ubicación fresca guardada no vuelve a preguntar). Si se da: por distancia, km y el punto azul en el mapa (la cámara no se mueve). Si se niega, si no responde o si ya estaba negado de antes (el navegador no vuelve a preguntar): se queda «Próximos primero» y bajo la cabecera sale **«Sin tu ubicación no hay cercanos: siguen los próximos primero.»**; se va al elegir otra opción.
- **El renglón dice las dos cosas**: «Próximo: dom 11 de oct · 19:00» y, debajo, «Exposición hasta el dom 8 de nov», cada una con su icono de calendario y el mismo estilo.
- Al elegir un orden la hoja enseña la lista (recogida sube a asoma, como al filtrar). La elección se recuerda con la memoria de pantalla de Lugares y vuelve a la opción inicial en un teléfono nuevo (o una pestaña nueva). Filtros y lupa, igual.
- **Efecto en el mapa (sin tocar su código):** el día del pin sale de lo próximo con hora, así que un lugar con exposición abierta y un concierto esta semana ahora enseña el día del concierto («Dom» en el MUNI del respaldo); antes, por la exposición, no enseñaba día.

## Cómo está hecho

- `src/lib/lugares.ts`: `estaEnCurso` (exposición, taller o festival con inicio pasado y fin futuro), `conProximo` guarda por lugar `proximo` (el primero por inicio que no esté en curso) y `enCurso` (el que cierra antes), con `ahora` como parámetro. `agruparLugares(lugares, punto, orden)` con `OrdenLugares` («cerca» | «pronto» | «abc»; «cerca» sin punto es «pronto»), `ordenEfectivo`, `ORDENES_LUGARES`, `SIN_CERCANOS` y `vidaDeLugar` (lo que dice quien solo puede decir una cosa). «Con eventos» = tiene `proximo` o `enCurso`. `textoProximo` no cambió de firma.
- `src/lib/destacados.ts`: `tarjetaLugar` dice lo próximo con hora y, si no hay, lo abierto.
- `src/components/RenglonLugar.tsx`: una línea por cada cosa. `src/app/personas/consultas.ts`: `LugarSeguido` gana `enCurso` (sale de `conProximos`, la misma consulta). `src/app/lugares/page.tsx` no cambia: su consulta ya traía `fin` y `clase` (OL-398).
- `src/components/ui/MenuOpciones.tsx` (nuevo; en `ui/` no había un menú desplegable: `MenuAcciones` abre una hoja con «···»): botón con `aria-haspopup="menu"`, opciones `menuitemradio` con `aria-checked`, flechas, Escape y tocar fuera cierran y el foco vuelve al botón; en un portal, fijo junto al botón, debajo si cabe antes de la barra de abajo (una sonda mide `--nav-abajo`) y si no encima. Opciones de 48 px; botón de 44.
- `src/app/lugares/VistaLugares.tsx`: el orden elegido (`null` = el de la ubicación), el pedido del permiso por `leerUbicacionCercana` y la línea; `HojaLugares` gana la ranura `orden` en su franja (después del asa, en la misma celda de la rejilla, sin envoltorios).
- `HojaLugares` medía «asoma» desde el elemento que sigue a la franja; con la línea delante de la lista, la hoja bajaba casi a recogida al negar el permiso. Ahora mide desde el borde de la franja hasta el primer renglón, así la línea también asoma y la hoja sube lo que ella mide.

## Verificación

- `npm run lint`: 0 errores (1 aviso que ya estaba en `main`, en `VisorImagen.componentes.test.mjs`).
- `npm run typecheck`: limpio.
- `npm test`: **3 828 pruebas en 214 archivos, en verde** (17 nuevas: 13 en `lugares.test.ts` —`conProximo` con `proximo` y `enCurso`, el MUNI con las dos cosas y sus dos textos, dos abiertas, por abrir, `estaEnCurso` sin fin o sin clase; las dos tandas de «pronto», «cerca» sin ubicación, lo solo abierto en «Con eventos», «pronto» con km, «cerca», «abc» en los dos grupos, empates; las palabras y `ordenEfectivo`—, 1 en `destacados.test.ts` y 3 de `posicionMenu`). Una prueba vieja de `conProximo` dependía del día de hoy: ahora lleva su `ahora`.
- `npm run test:componentes`: **604 de 604** con el Chromium de Playwright (el de la CI); 4 nuevas en `VistaLugares.componentes.test.mjs`: abre, marca, flechas/Escape devuelven el foco, tocar fuera cierra, «Alfabético» se queda al volver; «Cercanos primero» negado deja «Próximos primero» con su línea y sin km; concedido pasa a «Cercanos primero» con km; con el permiso ya concedido arranca en «Cercanos primero». Con el Chrome de la Mac falla solo la de OL-365 «Ver el evento» (`waitForURL` ante el 404 del servidor de prueba), ya anotada en la bitácora 397; con el Chromium de la CI pasa.
- `npm run inventario`: sin novedades (342 medidas en duro, aceptado 342).
- `npm run medir`: **38 pantallas × 4 anchos en 120 s, sin novedades**, tras subir a mano tres presupuestos en `medidas.aceptadas.json` (nunca `--aceptar`): `03-lugares-mapa` y `04-lugares-lista` de 186/186/184/184 a **194/194/192/192**, `s12-lugares-hoja-llena` de 188/188/186/186 a **196/196/194/194**. Los +8 nodos: el desplegable (botón y su flecha, 2) y la segunda línea de dos lugares del respaldo (icono, texto y su caja, 3 cada una): el MUNI (concierto el domingo y «Un mundo para mí» abierta) y el Centro Cultural Universitario Bicentenario (un acto el jueves y su festival en curso). El respaldo ya tenía el MUNI con exposición abierta y evento con hora: no hizo falta tocar `fixture.mjs`. `npm run medir -- --solo=lugares --letra=2`: sin novedades.
- Todo sin `.env` en el árbol.

## Capturas (`docs/rediseno/capturas-431/`, 390×844 a 2×)

Contra el respaldo local como `medir` (respaldo + `next build` + `next start` con el reloj fijo del miércoles 7 de octubre a las 10:00), con el Chrome real de la Mac y `navigator.geolocation` reemplazado en el navegador de prueba. Cada una abierta y revisada.

- `01-sin-ubicacion-proximos.png`: Lugares como abre sin ubicación. «9 lugares» y, a la derecha, «Próximos primero ⌄» en violeta; «Con eventos · 7»: San Miguelito (mañana 19:30), ACHE (vie 9, 17:00), Teatro de la Paz (sáb 10, 18:00).
- `02-sin-ubicacion-llena.png`: la hoja llena; siguen el MUNI con sus dos líneas («Próximo: dom 11 de oct · 19:00» y «Exposición hasta el dom 8 de nov»), Aether (mar 13) y el Bicentenario.
- `03-muni-las-dos-lineas.png`: la lista desplazada: el MUNI y el Bicentenario («Próximo: jue 15 de oct · 12:00» y «Festival hasta el mar 24 de nov»), la Máscara (sáb 17) y el principio de «Sin eventos próximos · 2».
- `04-menu-abierto.png`: el menú bajo el botón, alineado a su derecha: «Cercanos primero», «Próximos primero» marcado (fondo violeta suave y la palomita), «Alfabético».
- `05-alfabetico.png`: «Alfabético ⌄» puesto, hoja llena: ACHE, Aether, Casa de Cultura… San Miguelito, Bicentenario, MUNI, Máscara; los dos grupos siguen separados.
- `06-menu-hoja-recogida.png`: la hoja recogida (solo «9 lugares» y el botón sobre la barra): el menú abre hacia arriba, sobre el mapa, sin tocar la barra de abajo.
- `07-cercanos-negado.png`: tras elegir «Cercanos primero» y negar el permiso: sigue «Próximos primero ⌄» y bajo la cabecera, «Sin tu ubicación no hay cercanos: siguen los próximos primero.»; la hoja sube lo que mide la línea y se siguen viendo dos renglones y medio.
- `08-cercanos-concedido.png`: lo mismo, permiso concedido: «Cercanos primero ⌄», el punto azul en el mapa, «Mi ubicación» activo y la lista por distancia con los km (Aether a 250 m, Teatro de la Paz a 500 m, Máscara a 600 m).
- `09-con-ubicacion-cercanos.png`: con el permiso ya concedido de antes: arranca en «Cercanos primero» sin que la persona toque nada.
- `10-con-ubicacion-menu.png`: su menú, con la marca en «Cercanos primero».
- `11-con-ubicacion-proximos.png`: «Próximos primero» con ubicación: el orden de las dos tandas y los km siguen en cada renglón (San Miguelito a 1.3 km, ACHE a 700 m, Teatro a 500 m).

## Lo que queda

- Probarlo en el iPhone del founder (Safari y la app instalada): el permiso de Safari al elegir «Cercanos primero», el menú sobre la barra con la hoja recogida y el texto grande del sistema.
- Desde 792 px (panel) el desplegable va igual junto a la cantidad; no se capturó.
- La línea «Sin tu ubicación…» no se recuerda al volver a la pantalla (sí el orden, «Próximos primero»): si el founder la quiere de nuevo al volver, es guardarla en la memoria de pantalla.
