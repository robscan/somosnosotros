# 388 · Prototipo: la barra «Ahora» de Inicio y la regla de las 3 horas (OL-357)

**Fecha:** 2026-10-09. **Rama:** `prototipo-barra-ahora`, base `origin/main` (`0c8fd99f`). **Operador:** Claude (chat «Barra marquee de eventos en directo»).
**Estado:** prototipo probado en Chrome de la Mac (390×844 y 320) y publicado como página privada para verlo en el iPhone: https://claude.ai/artifact/YKtiejd9wXBZCGtfKYcqvi. **Sin código de la app y sin migración.** Falta la firma del founder.

## Qué pidió el founder (textual)

«crea una barra con marquee tipo noticiero, que aparezca en la parte superior debajo de las barras, que diga: Sucediendo ahora, próximo para hoy y mañana. Destacados, etc (analiza y cuestiona lo que te digo, propón clasificación de ese contenido de manera eficiente. Ojo con presentar eventos que ya pasaron y terminaron, ya he visto que sigues poniendo eventos de hoy a las 10 am y son las 6 pm. Incluso podríamos pensar en una disposición tipo guía de canales de cable.» Después: «primero prototipo».

## Por qué salen eventos de las 10:00 a las 18:00

No es un fallo de filtro, es una regla. Un evento **sin hora de fin** se da por terminado a la medianoche de su día (`terminaDe`, `src/lib/fechas.ts:328`; la columna generada `termina` de `20260917100000_zona_horaria.sql:81`, que usa `filtroSinPasar`). Viene de una decisión del founder del 2026-09-16: «los eventos de hoy se quedan a la vista hasta que termine el día o termine el evento». Comprobado en producción el 2026-10-09 a las 16:15: «Inauguración: Dos siglos a través de la lente, hoy · 10:00» seguía primero en «Esta semana».

La medida que sostiene el cambio está en `src/app/nuevo/evento/pasos.ts:469`: de 36 eventos con hora de fin (2026-10-05), 20 duran 3 h o menos (9 de 2 h, 6 de 3 h y 5 de 1 h), 12 son jornadas de museo de 7 a 9 h que ya traen su fin y 2 terminan al día siguiente.

## Lo que se cuestionó y lo que eligió el founder

1. **El marquee (texto corriendo sin parar):** cuesta leerlo y tocarlo, pide pausa por accesibilidad (WCAG 2.2.2: lo que se mueve más de 5 s) y va contra «una sola cosa a la vez». **Eligió un aviso a la vez:** cambia cada 5 s, se pasa con el dedo, al tocarlo abre la ficha y se queda quieto con «Reducir movimiento».
2. **«Destacados» no va en la barra:** ya tiene carril. La barra solo lleva lo que caduca pronto, por hora; un destacado que pasa hoy sí sale, por su hora.
3. **Sin hora de fin: eligió «3 h en toda la app».** Cambia su regla del 2026-09-16: la barra, la Agenda y los carriles de Inicio dejan de mostrar el evento 3 h después de empezar.
4. **La guía tipo canales de cable: eligió «primero en festivales».** Va dentro del programa de un festival (sedes en filas, horas en columnas, línea de «ahora»), en una pieza aparte. En Inicio, con los pocos eventos diarios de hoy, la cuadrícula saldría casi vacía.

## El prototipo

[`docs/rediseno/prototipos/barra-ahora.html`](../../../rediseno/prototipos/barra-ahora.html). Mismo armazón que los anteriores: tokens de `globals.css`, Bricolage de Google Fonts, el logotipo real (`public/logotipo.svg`) y la tira oscura. La barra usa `--banda` (de OL-351): **ningún color nuevo**. Debajo, «Destacados» y «Esta semana» se calculan con la misma regla que la barra, para ver que lo terminado sale de todas partes.

**La tira:** el día (vie 9 oct con los datos reales, sáb 31 oct para los actos de un festival, dom 1 nov para el último día de una exposición), la regla sin hora de fin (3 h contra la medianoche de hoy), la hora (07:00 a 23:55, o «Hora real» de San Luis Potosí, que se recalcula cada minuto como lo haría la app instalada), si la barra se va o se queda al bajar, y el movimiento. «Cómo decide la barra» resume las reglas.

**La barra:** franja `--banda` debajo de las dos barras fijas (BarraApp de 56 y la de contexto de 52, medidas en somosnosotros.org). Cada aviso es como un titular de noticiero: arriba la etiqueta con la hora y el lugar; debajo el título a todo lo ancho, en una línea. La urgencia se lee en el relleno de la etiqueta: lleno violeta con punto que late para **Ahora**, con borde blanco para **En un rato** y para la exposición que inaugura o cierra, apagado para **Hoy** y **Mañana**. Debajo, un segmento por aviso (como las historias de Instagram) se llena en 5 s. A la derecha, el botón de lista abre una hoja con **todo** lo de hoy, sin tope y por grupos: ofrece lo mismo sin movimiento y no obliga a esperar 40 s.

**Las reglas** (el orden es el de la barra):
1. **Ahora:** ya empezó y no ha terminado. Con hora de fin dice «Hasta 20:00»; sin ella, «Desde 17:30» (no se inventa un «hasta»).
2. **En un rato:** empieza en menos de 2 h, con la cuenta atrás («En 30 min», «En 1 h 15 min»).
3. **Exposiciones:** solo el día que inaugura o el último, hasta las 18:00 si no tiene horario (supuesto por confirmar).
4. **Hoy:** lo que empieza más tarde hoy.
5. **Mañana:** solo si ya no queda nada hoy o desde las 20:00.
6. Tope de 8. Del festival salen sus actos, nunca el festival entero (OL-347). Si no hay nada, la barra no sale y la línea gris vuelve bajo las barras.

**Los gestos:** tocar abre la ficha (en el prototipo, un aviso dice cuál); deslizar a un lado pasa al siguiente o al anterior; mantener el dedo la detiene; con el foco del teclado también se detiene y las flechas pasan. Los arrastres terminan solo con `pointerup` y `pointercancel` (Safari táctil dispara `pointerleave` en el primer movimiento). No cambia sola con la lista abierta ni con la pantalla escondida.

Datos: lectura pública de somosnosotros.org el vie 9 de oct a las 16:15. Sin hora de fin salvo el laboratorio de Aurora Co-Lab (17:00 a 20:00, de su cartel). Los del 31 oct y el 1 nov son parciales: solo lo que salía en Inicio.

## Capturas

[`docs/rediseno/capturas-388/`](../../../rediseno/capturas-388/), Chrome de la Mac con playwright-core, 390×844 (y una a 320), a 2×. Abiertas una por una:

- `01-vie-1615-regla-nueva.png` — 16:15: «EN 1 H 15 MIN · 17:30 · Centro de las Artes…» y «Presentación de Caracolas para Luciana». La inauguración de las 10:00 ya no está (terminó a las 13:00).
- `02-vie-1800-regla-de-hoy.png` — **el caso del founder:** con la regla de hoy, a las 18:00 la barra dice «AHORA · Desde 10:00 · Museo Francisco Cossío», «Inauguración: Dos siglos a través de la lente».
- `03-vie-1800-regla-nueva.png` — la misma hora con 3 h: «AHORA · Desde 17:30» y Caracolas para Luciana.
- `04-vie-1800-lista-regla-de-hoy.png` — la hoja con la regla de hoy: en «Ahora», la de las 10:00 «en curso» junto a la de las 17:30.
- `05-vie-1800-lista-regla-nueva.png` — la hoja con 3 h: Ahora (17:30), En un rato (18:30 «en 30 min», 19:00 «en 1 h»), Más tarde hoy (20:00).
- `06-vie-2100-entra-manana.png` — 21:00: tras los cuatro de «Ahora» entra «MAÑANA · 9:00 · Jardín Botánico El Izotal» (quinto de ocho segmentos).
- `07-sab31-1300-actos-de-festival.png` — «EN 1 H · 14:00 · Helipuerto…» y «Efecto Tlacoyo en Electric Universe Festival»: sale el acto, no el festival.
- `08-dom1-1200-ultimo-dia-expo.png` — «ÚLTIMO DÍA» y «La memoria del agua, exposición de Alejandra Fersco», con borde.
- `09-dom1-2230-sin-barra.png` — nada hoy ni mañana: la barra no sale y la línea gris vuelve bajo las barras.
- `10-al-bajar-se-va.png` — tras bajar 520 px solo quedan las dos barras de siempre.
- `11-al-bajar-se-queda.png` — la barra fija debajo de las dos barras: 108 + 72 px arriba.
- `12-vie-1800-a-320.png` — a 320: «EN 30 MIN · 18:30 · Centro de las Artes de S…» y el título cortado con puntos; nada se sale.

## Lo que queda por decidir (founder)

- **Firma del prototipo.**
- **Al bajar, ¿se va o se queda?** Recomendación: **se va**. Fija suma 72 px a los 108 de las dos barras: con la barra de secciones (60) quedarían 240 de 844 px para marcos, el 28 % de la pantalla, mientras la persona ya está mirando carriles. Al volver arriba, la barra vuelve a estar.
- El supuesto de las exposiciones sin horario (hasta las 18:00).

## Lo que costaría el código (después de la firma)

- **La regla de 3 h (pieza propia, recomendado):** `terminaDe` y `eventoPaso` (`lib/fechas`), `ocurrenciaPaso` (`lib/ocurrencias`, que ya pasa por `terminaDe`) y la columna generada `termina`. Hace falta **una migración** que recalcule `termina` con `inicio + 3 h` cuando `fin` es nulo, pensada como cambio de expresión de una columna generada (no se puede alterar en sitio: quitarla y volver a crearla con sus índices, o una columna nueva y cambiar `filtroSinPasar`). Afecta a todo lo que lee «ya pasó»: Agenda, Inicio, Lugares («En curso»), avisos, mapa y panel. Pruebas de `fechas`, `ocurrencias`, `inicio` y del banco de migraciones.
- **La barra:** un componente cliente en Inicio con lógica pura en `lib/` (la clasificación del prototipo, con pruebas) sobre los datos que Inicio ya carga (no hace falta consulta nueva: hoy y mañana ya están en «Esta semana»). Se recalcula cada minuto en el teléfono. La hoja usa `ui/Hoja`. Medición con `npm run medir`.
- **El orden por cercanía** dentro de cada grupo (lo pidió el análisis) necesita la ubicación que Inicio ya usa para ordenar; el prototipo ordena solo por hora.

## Límites

- El prototipo no ordena por cercanía ni lee la ubicación.
- Accesibilidad: además de los gestos y de «Reducir movimiento», la norma pide una forma visible de pausar lo que cambia solo. La hoja ofrece todo sin movimiento, y el foco detiene la barra; un botón de pausa sería la versión estricta y no se puso para no llenar la franja.
- El aviso al gestor de cambios (Gestor V, sesión `local_51c2d1e4`) no se entregó: la sesión no arrancó. Se le reenvía con esta entrega.
