# 326 · El selector de fecha y hora se parte en dos: una hoja de días y otra de horas

**Pieza:** OL-298. **Rama:** `selector-dia-y-hora` (base `origin/main` `4495ad82`). **Fecha:** 2026-10-05. **Operador:** Sonnet 5.5.
**Estado:** hecho y medido en Chromium contra el respaldo local (app compilada) a 390×844 y a 320×640; falta mirarlo en un iPhone real (ver el final).

## Qué pidió el founder

2026-10-05, quinta vuelta del prototipo del alta por pasos (bitácora [323](323-publicar-por-pasos.md)): «sigue presentando fecha y hora por separado y ese componente que tienes donde se ve calendario y horas uno sobre otro hay que partirlo en dos, no sirve, es muy grande, adicional deja que el usuario pueda seleccionar inicio y fin en los dos casos». Es la pieza 1 del plan de construcción de esa bitácora. Alcance de esta pieza: **solo partir el componente** y usarlo en el alta y la edición de hoy; no es el flujo por pasos.

## Qué había

`ui/SelectorFecha` era una sola hoja con el calendario del mes, debajo una lista de horas cada 15 minutos con 6 filas a la vista, la «Duración» y «Listo». `eventos/SelectorCuando` la abría dos veces («Empieza» y «Termina»; en «Termina» pedía también un día y una hora).

## Qué hay ahora

- **`ui/SelectorDia`** (`SelectorDia.tsx` + `.module.css`): hoja «¿Qué día es?» solo con el calendario (`ui/Calendario`, sin cambios). Un texto de estado y un botón que dice qué falta.
  - Primer toque: inicio. Segundo toque en un día **posterior**: último día (banda de rango, la que ya sabía pintar `Calendario` con `desde`/`hasta`). Un día **anterior**, o cualquier toque con el rango ya cerrado, empieza de nuevo desde ese día; tocar otra vez el inicio recién marcado no cambia nada (la fecha es obligatoria).
  - Texto de estado: «Toca el día en que empieza.» · «Empieza el 14 de noviembre. Si dura varios días, toca el último.» · «Del 14 al 16 de noviembre.» (entre meses: «Del 30 de noviembre al 2 de diciembre.»; con otro año, el año). Con un solo día que ya traía el evento: «El 7 de octubre.»
  - Botón: «Falta el día» (deshabilitado), «Listo, un solo día» o «Listo».
- **`ui/SelectorHora`** (`SelectorHora.tsx` + `.module.css`): hoja «Empieza» o «Termina (empieza 8:00 p.m.)» solo con las horas, cada 15 minutos, en una rejilla de tres columnas de `ui/Chip`. «Termina» ofrece, el mismo día, solo las posteriores al inicio y arriba «Sin hora de fin». **Elegir una hora cierra la hoja** (sin «Listo»). Al abrir, la hora elegida o la sugerida queda en el centro de la lista (se mueve la lista misma, no la hoja). «Empieza» conserva la «Duración» informativa debajo.
- **`eventos/SelectorCuando`**: las fechas de «Empieza» y de «Termina» abren la hoja de días (los dos extremos en el mismo calendario); la hora de «Empieza» y la de «Termina» abren sus hojas de horas. Los mismos datos de salida de siempre: `inicio` y `fin` como «YYYY-MM-DDTHH:MM» en la hora del sitio, los mismos `<input type="hidden">`.
- **`lib/cuandoEvento.ts`** (nuevo, lógica pura y probada): qué quedan siendo `inicio` y `fin` después de cada toque (`conDias`, `conHoraInicio`, `conHoraFin`). **`lib/calendario.ts`**: `tocarDia`, `diasIniciales`, `ultimoDia`, `textoDias`, `botonDias`, `horasDeFin`, `etiquetaHora`, `FIN_DEL_DIA`.
- **`ui/SelectorFecha`** (la hoja combinada, su CSS) se **retiró**: ningún otro sitio la usaba. Con ella bajó una medida en duro del inventario (344 → 343, `inventario.aceptado.json`).

## Comportamiento que se conserva

- Hora sugerida (se marca en negrita mientras nadie elige otra) y la «Duración» en la hoja de «Empieza»: mover el inicio mueve el fin con la misma duración.
- Días pasados bloqueados, salvo el del evento al editar uno ya pasado (`pasadoPermitido`); el renglón «Esa hora ya pasó.».
- ✕ «Quitar la hora de fin», `Escape` y tocar fuera cierran sin cambiar nada; foco de vuelta al disparador.
- Un evento sin día no puede ponerse hora: tocar «Hora» abre primero el calendario; sin hora, el evento arranca a las 19:00.
- Hoja chica sin desplazarse (la combinada medía 773 de 844 y a 320×640 cortaba la lista de horas a una o dos filas).

## Lo que cambia de comportamiento (y lo que decidí por cercanía al prototipo)

1. **Una hoja de días y otra de horas, y el día de fin ya no se elige en «Termina».** Antes la hoja de «Termina» llevaba su propio calendario. Ahora el último día se marca en el calendario (cualquiera de las dos fechas lo abre) y «Termina» solo pide la hora. Es lo que pidió el founder y lo que muestra el prototipo.
2. **Cruzar la medianoche = elegir dos días.** 22:00 → 01:00 del día siguiente: se marcan los dos días y en «Termina» se elige 1:00 a.m. (con varios días, «Termina» ofrece las 96 horas, no solo las posteriores al inicio). Antes bastaba con elegir otro día en la hoja de «Termina».
3. **«Un solo día» en un evento que ya tenía varios días lo deja ese día, sin arrastrar el fin.** Antes, mover el día movía el fin con la misma duración. Para que el rango sea lo que la persona ve en la hoja, con «un solo día» el fin queda el mismo día, a su misma hora si sigue siendo posterior al inicio; si no (un 22:00 → 02:00), queda sin hora de fin. Mover el **inicio de hora** sigue moviendo el fin con la misma duración, como siempre.
4. **Una elección cerrada no se alarga con un toque.** Al abrir la hoja, el día (o el rango) que ya tiene el evento va como elección cerrada: el primer toque empieza de nuevo, igual que en el prototipo (que arranca vacío). Para alargar un día a un rango: tocar su día (o el inicio nuevo) y luego el último. Si abrir la hoja dejara el día «esperando el fin», tocar otro día para cambiar la fecha lo alargaría sin que nadie lo pidiera (lo vi en la primera versión).
5. **La rejilla de horas es de chips en tres columnas con letra de 12 horas, no una lista de renglones ni el 24 horas de 4 columnas del prototipo.** El prototipo usa «19:00»; la app dice «7:00 p.m.» en las píldoras y en toda la pantalla, y cuatro columnas de «10:30 p.m.» no caben a 320. Tres columnas sí, con 44 px de toque y media fila asomada que avisa que se desplaza.
6. **Títulos como los del prototipo:** «¿Qué día es?», «Empieza» y «Termina (empieza 8:00 p.m.)» en lugar de «Selecciona la fecha del evento» (la precisión del founder de OL-218 era para la hoja combinada).
7. **Un evento de varios días sin hora de fin** (el prototipo lo permite: rango + «Sin hora de fin»). `eventos.fin` guarda siempre un instante, así que no existe «día de fin sin hora» en el modelo y no lo cambié: acaba con su último día, `fin = último día 23:59` (`FIN_DEL_DIA`, la misma regla de `terminaDe`: sin fin, el evento dura hasta el final de su día). **Decisión del gestor (por delegación del founder, «haz tus recomendaciones»): ese «23:59» no se muestra** (ver «Ajuste antes de publicar» abajo). En el selector, «Termina» sigue leyéndose «Sin hora de fin».
8. **Arreglo de paso, a 320 px:** el renglón «Cuándo» abierto (rótulo + fecha + hora + ✕) no cabe en un renglón de 280 px: la hora y la ✕ salían de la tarjeta cuando hay fin (ya pasaba antes con un fin puesto; ahora es más fácil llegar ahí con rangos). `SelectorCuando.module.css`: `.fila` pasa a `flex-wrap` con `justify-content: flex-end` y el rótulo a `flex: 1 0 auto`; a 320 los chips bajan a un segundo renglón a la derecha. Medido: 0 elementos fuera de la tarjeta a 320 y 390.

## Alto de las hojas (Chromium, respaldo local, reloj fijo 2026-10-07 10:00)

| Hoja | 390×844 | 320×640 |
| --- | --- | --- |
| Antes: calendario + horas + duración + «Listo» (una sola) | 773 px (92 % de la pantalla) | 592 px (el tope; el contenido real era mayor y la lista de horas se quedaba en 1-2 filas cortadas) |
| Después: días (calendario + estado + «Listo») | 502 px | 502 px |
| Después: horas de «Empieza» (con «Duración») | 468 px | 468 px |
| Después: horas de «Termina», varios días (con «Sin hora de fin», 96 horas) | 420 px | 420 px |
| Después: horas de «Termina», mismo día (inicio 8:00 p.m.: 16 horas) | 386 px | 386 px |

Ninguna se desplaza (`scrollHeight == clientHeight`), ninguna se sale por los lados (0 hijos fuera) y la página no se desplaza de lado (390 y 320). La lista de horas sí se desplaza por dentro, con media fila asomada. La hoja de días ahorra 271 px frente a la combinada a 390 y 90 a 320.

## Pruebas

- **Unitarias:** `calendario.test.ts` (+21: `tocarDia` con rango, fin anterior imposible, rango cerrado que reinicia, cruce de mes y año; `diasIniciales`; `textoDias`; `botonDias`; `horasDeFin`; etiqueta de 12 horas; `FIN_DEL_DIA` fuera de la lista) y `cuandoEvento.test.ts` (25: rango de días, un solo día con y sin fin, cruce de medianoche, «sin hora de fin» de varios días, edición de un evento pasado, mover el inicio, fin que no es posterior).
- **De componentes:** `src/app/eventos/SelectorCuando.componentes.test.mjs` (14, componente real con estilos reales, reloj fijo, topes de 5 s en cada espera): rango con banda y un solo «Listo» (390 y 320), horas de «Empieza» sin «Listo» y que cierran al elegir (390 y 320), «Termina» solo con horas posteriores (390 y 320), fin anterior imposible, días pasados bloqueados, `Escape` y ✕ sin cambios, cruce de la medianoche, «Sin hora de fin» de varios días, un solo día tras varios, sin día no hay hora, edición de un evento ya pasado, hora sugerida a la vista.
- **Resultados:** `npm run lint` 0 errores (1 aviso que ya estaba, `VisorImagen.componentes.test.mjs`); `npm run typecheck` verde; `npm test` 141 archivos, 2041 pruebas verdes; `npm run test:componentes` 312 de 312 (las de `guardado` y `cupo` mockean `SelectorCuando` y siguen verdes); `npm run inventario` sin novedades (343, bajó una); `npm run medir -- --solo=alta` sin novedades (s03, s07 y s11 a 320, 390, 820 y 1280).
- **Medida de las hojas abiertas** (`medir.js` sobre cada hoja a 390 y 320): 0 desbordes, 0 márgenes negativos, 0 tapados, ningún error de página. **Hallazgo que no es de esta pieza:** a 320, los días del calendario miden 39×44 de toque (columna de 38 px por el arreglo de OL-282, bitácora 310); ya era así en la hoja combinada y `medir` no mide hojas cerradas. Los botones de las hojas de horas miden 44×44.

## Evidencia (`docs/rediseno/capturas-326/`, 780×1688 y 640×1280, 2×; app compilada, letra Bricolage cargada)

Cada PNG abierto (en hojas de contacto y sueltos) y comparado con `docs/rediseno/capturas-323/sin-4-hoja-calendario.png`, `sin-5-hoja-calendario-rango.png` y `sin-8-hoja-termina.png`:

- `390-00-dia-vacio` y `320-00-dia-vacio`: hoja de días sin fecha (se llega con un borrador sin día, la vuelta de registrar un lugar): «Toca el día en que empieza.», ningún día marcado, solo el aro de hoy, «Falta el día» deshabilitado en violeta claro. Igual que `sin-4` del prototipo, con el calendario de octubre.
- `390-01-alta` y `320-01-alta`: el alta de evento con «Cuándo» cerrado («Hoy · 19:00»).
- `390-02-cuando-abierto` y `320-02-cuando-abierto`: «Cuándo» abierto, «Empieza» con fecha y hora y «Termina» con «Sin hora de fin».
- `390-03-dia-un-dia` y `320-03-dia-un-dia`: hoja de días con el día 7 y «Listo, un solo día»; el texto reserva dos renglones para que el calendario no suba al tocar.
- `390-04-dia-rango` y `320-04-dia-rango`: rango 9 al 11 con círculos en los extremos y banda en el 10, «Del 9 al 11 de octubre.», «Listo». Igual que `sin-5` del prototipo.
- `390-05-cuando-rango-sin-hora-de-fin` y `320-05-…` (rehechas tras el ajuste): renglón «Cuándo» resuelto con el rango y «Sin hora de fin» como «vie 9 de oct · 19:00 → dom 11 de oct», sin el «23:59»; abajo, «Termina» con «11 oct 2026» y el chip «Sin hora de fin». A 320 el valor parte el renglón en dos líneas («… → / dom 11 de oct») y los chips de «Termina» bajan, todo dentro de la tarjeta.
- `390-06-hora-empieza` y `320-06-hora-empieza`: hoja «Empieza», tres columnas, 7:00 p.m. en violeta al centro, media fila asomada abajo, «Duración · Sin hora de fin». Más compacta que `sin-8` del prototipo en columnas (3 contra 4) por la letra de 12 horas.
- `390-07-hora-termina-varios-dias` y `320-07-…`: hoja «Termina (empieza 8:00 p.m.)» con «Sin hora de fin» arriba en violeta y las 96 horas desde las 12:00 a.m.
- `390-08-cuando-rango-con-hora-de-fin` y `320-08-…`: renglón resuelto con rango y hora de fin («vie 9 de oct · 20:00 → dom 11 de oct · 01:00», el cruce de la medianoche con la ✕). A 320 la hora de fin y la ✕ bajan a un segundo renglón, dentro de la tarjeta.
- `390-09-hora-termina-mismo-dia` y `320-09-…`: «Termina» del mismo día: solo desde 8:15 p.m. hasta 11:45 p.m. y «Sin hora de fin», sin la misma hora ni anteriores. Igual que `sin-8` del prototipo.
- `390-10-cuando-un-dia-con-fin` y `320-10-…`: renglón resuelto de un día con fin («Hoy · 20:00–22:00»).
- `antes-390-hoja-combinada` y `antes-320-hoja-combinada`: la hoja combinada de antes, para comparar el alto.

## Ajuste antes de publicar: el «23:59» no se escribe (2026-10-05)

Decisión del gestor, por delegación del founder: donde se escribe la fecha de un evento, un fin que cae en **otro día que el inicio** y cuya hora local, en la zona del evento, es exactamente 23:59 se escribe solo con su día: «vie 9 de oct · 19:00 → dom 11 de oct». **El dato guardado no cambia** (sigue siendo las 23:59 del último día; la agenda lo necesita para saber hasta cuándo dura).

- **Dónde:** `src/lib/fechas.ts`, en `formatearCuando` («sáb 26 de sep · 19:00 → lun 28 de sep») y en `formatearLargo` (y con ella `fraseCuando`: «… · 19:00 hasta lunes 28 de septiembre»), con un ayudante común `acabaConSuUltimoDia`. Los llaman el renglón «Cuándo» del alta y la edición (`FormularioEvento`), el texto de compartir de la ficha (`eventos/[id]/page.tsx`), los avisos (`avisos.ts`), el panel (`panel.ts`) y Novedades (`novedades/consultas.ts`). La ficha, las tarjetas y las listas de la agenda no escriben la hora de fin (`kpiCuando` solo dice el día de fin y las tarjetas usan `formatearCuando` sin fin), así que no cambian.
- **Cuidados:** (a) un evento de un solo día que termina a las 23:59 conserva «19:00–23:59» / «a 23:59»; (b) la hora se mira en la zona del evento (las 23:59 de la ciudad vistas desde Madrid son las 07:59 del día siguiente y llevan su hora; las 23:59 de Madrid se esconden allá); (c) el JSON-LD (`endDate`) y el archivo `.ics` siguen con el instante real, no pasan por estas funciones; (d) otros formatos sin tocar (con otra hora, como «23:58», el fin se escribe con su hora).
- **Pruebas:** `fechas.test.ts` +4 (varios días con 23:59 sin hora; varios días con otra hora con hora; un día con 23:59 con hora; otra zona), 33 en el archivo.
- **Resultados:** `npm test` 141 archivos, 2041 pruebas verdes; `typecheck` verde; `lint` 0 errores (el mismo aviso de siempre); capturas del renglón rehechas (arriba).

## Qué solo se comprueba en un iPhone real

- El toque con el pulgar en la rejilla de 44 px y el desplazamiento de la lista de horas (arrastrar dentro de la hoja sin que la página de atrás se mueva; la hoja ya bloquea el fondo, pero se ve con el dedo).
- La hoja de días con el teclado del iPhone cerrado y el área segura de abajo (`--piso`) en Safari; `scrollTop` de la lista con `position: relative` (medido en Chromium).
- El calendario a 320 (iPhone SE de primera generación): días de 39×44 de toque, ver arriba.
- La letra Bricolage de las horas de 12 horas a 320 en un teléfono, no en el Chrome de la Mac.
