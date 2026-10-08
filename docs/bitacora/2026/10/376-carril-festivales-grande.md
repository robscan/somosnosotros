# 376 · «Festivales y exposiciones» con la tarjeta de «Destacados»; los festivales solo salen en su carril

**Pieza:** OL-347. **Rama:** `carril-festivales-grande`, desde `origin/main` (`0199e71a`). **Fecha:** 2026-10-08. **Operador:** Claude (agente del gestor IV). **Sin migración.**
**Manda:** dos pedidos del founder del 2026-10-08, textuales: «a los festivales ponles tamaño de eventos estelares» y, como ampliación de la misma pieza, «Evita poner festivales en otros carriles». Antecedentes: bitácoras [371](371-carril-festivales.md) (OL-342, el carril) y [375](375-festivales-todos-y-portada.md) (OL-346, todos los festivales y su portada).
**Estado:** hecho y probado con lógica pura, componentes (Chrome) y la app compilada contra una copia del respaldo local (390×844 y 320); falta el iPhone del founder.

## Parte 1 · la tarjeta grande

- `components/inicio/CarrilAgenda.tsx`: la parte `festivales` pasa de `tamano: "mediana"` a `"grande"`, el cartel vertical de «Destacados» (165 × 248 de foto; a 1048 px, 190 × 285: los tokens `--tarjeta-grande*` de siempre).
- `components/Inicio.tsx`: el esqueleto de carga del carril (`CarrilEsqueleto`) pasa a `grande`, para no saltar cuando llega la respuesta (como se hizo con «Artistas destacadxs» en OL-165).
- El rótulo («Festival», «Exposición», «Hoy · Festival») no tiene posición propia de la mediana: va abajo a la izquierda de la fila de la foto (`.tarjeta > .rotulo`, `align-self: end`), así que en la grande queda igual, dentro del cartel y sobre el título. La línea de fecha y la del sitio no cambian. No hizo falta ninguna medida nueva ni tocar CSS.
- Orden, textos y chips sin cambios.

## Parte 2 · un festival solo sale en su carril (OL-347, ampliación)

Hasta hoy (OL-342 y OL-346) un festival podía salir dos veces en Inicio: en «Esta semana» como su marco («3 actividades esta semana», con sus actos plegados) o en «Destacados», «Nuevos eventos» y «Más adelante», y además en «Festivales y exposiciones». Eso se retira:

- `lib/inicio.ts` · **`sinFestivales`** (nuevo): quita los marcos (`clase = "festival"`). Lo usan `carrilEstelar` (destacados y lo que se sigue), `carrilDestacados`, `carrilNuevos` (en lugar de `plegarActos`), `carrilMasAdelante` (ídem) y `calcularCarrilesAgenda` (los favoritos, antes plegados).
- `carrilEstaSemana`: ya no pliega actos bajo su marco ni pinta el marco con «N actividades esta semana». Los marcos y las exposiciones no tienen ocurrencias (`sinOcurrencias`), así que queda en: las ocurrencias de la semana, por fecha, con el tope. Los actos salen sueltos, cada uno en su día.
- `carrilFestivales`: ya no marca como vistos los actos de los marcos que salieron (antes era para que no salieran sueltos en «Nuevos»; ahora deben salir). Sigue sin descontar `vistos` a los festivales (por «Tus planes», OL-346) y sí a las exposiciones; una exposición que es parte de un festival cargado sigue sin salir suelta aquí (no cambia).
- Código que quedó sin uso, quitado: `textoActividadesSemana` (`lib/agendaPorClase.ts`), la rama `programa.estaSemana` de `notaDeClase` y `sitioDeTarjeta` (`lib/destacados.ts`) y el campo `programa.estaSemana` de `EventoAgenda` (`lib/agenda.ts`). Comentarios de cabecera al día.
- **La pantalla Agenda no cambia:** ahí el festival sigue siendo un bloque con sus actos de ese día (`componerDia`), y la pestaña Nuevos de la agenda sigue plegando con `plegarActos` (que se queda solo para eso).
- **«Tus planes» no cambia:** es lo que la persona marcó; si marcó un festival, sale ahí (el encargo no lo nombra).

## Decisiones del operador (por confirmar con el founder)

1. **Un carril, un tamaño:** la grande vale para todo el carril, también para las exposiciones, para que la tira no mezcle alturas.
2. **Los actos de un festival salen sueltos** en «Destacados» (si la administración destaca un acto), «Esta semana», «Nuevos eventos» y «Más adelante», como cualquier evento; su tarjeta no dice de qué festival son. Si prefiere que digan «Parte de …», es otra pieza.
3. **Un festival destacado por la administración no sale en «Destacados»** (sale en su carril). Si lo quiere en los dos, sería la única excepción a la regla nueva.

## Pruebas

- `npm run lint` (0 errores; el aviso de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (**185 archivos, 3366 pruebas**), `npm run inventario` (sin novedades) y `npm run medir` (**36 pantallas × 4 anchos, sin novedades**: en el respaldo del repo el festival y la exposición siguen ocultos, así que la altura de Inicio no cambia ahí; con ellos a la vista, la grande suma ~116 px de alto a la página, que se desplaza en vertical como siempre; no hay presupuesto que tocar).
- Componentes (Playwright, Chrome de la Mac): `Inicio` y `Destacados`, 28 de 28. `inicio/Inicio.componentes.test.mjs` pasa a los carriles el tamaño que les da `CarrilAgenda` (grande para «Destacados» y «Festivales y exposiciones») y comprueba que cada tarjeta del carril mide `--tarjeta-grande` y que el rótulo queda en la foto, sobre la fecha.
- Unitarias (`lib/agendaPorClase.test.ts`): ajustadas las de OL-342/OL-346 que esperaban el marco en «Esta semana», en «Destacados» o en «Nuevos» y los actos plegados o vistos; nuevas en «los festivales solo en su carril (OL-347)»: un festival destacado, nuevo y con actos en la semana no sale en «Destacados», «Esta semana», «Nuevos eventos» ni «Más adelante» y sí en su carril; sus actos sí salen (el destacado en «Destacados», los de la semana en «Esta semana», el lejano y nuevo en «Nuevos»); «Seleccionados para ti» sin el festival destacado ni el seguido, con sus actos.

## Capturas (`docs/rediseno/capturas-376/`, a 2×)

App compilada (`next build && next start`) contra una copia del respaldo local en el scratchpad con el reloj fijo (miércoles 7 de oct, 10:00): «Ecos de papel» a la vista y el «Festival de Cine de Invierno» del sábado 10 al lunes 12 con sus tres actos a la vista y **destacado el primero** de la tira. Chrome de la Mac, sin errores de página; `scrollWidth` igual al ancho. Cada una abierta y mirada:

- `01-destacados-390.png` (390×844): «Destacados» con LXS COLOCAOS, Master Class y Leonora: **el festival no está**, aunque es el primero de la tira de la administración.
- `02-festivales-390.png` (390×844): «Festivales y exposiciones» con la tarjeta grande: «Ecos de papel» con el rótulo **Exposición**, «Hasta el mar 27 de oct»; «Festival de Cine de Invierno» con **Festival**, «Del 10 al 12 de oct», «Varias sedes · 3 actividades». Los rótulos quedan dentro del cartel, abajo a la izquierda.
- `03-de-destacados-a-festivales-390.png` (390 de ancho, recorte de la página entera): de «Destacados» a «Festivales y exposiciones», con «Esta semana» en medio: las dos tiras con la misma tarjeta (165 px). A 844 de alto no caben las dos a la vez porque «Esta semana» va entre ellas; por eso este recorte además de las dos de 844.
- `04-destacados-320.png`, `05-festivales-320.png` y `06-de-destacados-a-festivales-320.png`: lo mismo a 320 (el título del carril y «Ver la agenda» parten en dos líneas, como «Lugares con eventos esta semana»; la tercera tarjeta no asoma, la segunda se corta en el borde).
- `07-esta-semana-actos-sueltos-390.png` (390×844): «Esta semana» deslizado: **«Inauguración: «La luz que queda»» (sáb 10) y «Charla con la directora» (dom 11), los actos del festival, sueltos**, con la tarjeta sin foto (no tienen cartel en el respaldo); debajo, «Festivales y exposiciones» con el festival, el único sitio donde sale.

## Qué falta

- Probarlo en el iPhone del founder (Safari) con la vista previa de la rama.
- Las tres decisiones de arriba, por confirmar.
