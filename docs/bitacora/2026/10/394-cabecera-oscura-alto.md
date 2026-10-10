# 394 · La cabecera oscura deja ver el cartel (alto mínimo)

**Pieza:** OL-363. **Rama:** `cabecera-oscura-alto`, base `origin/main` (`b0bc54ab`). **Fecha:** 2026-10-09. **Operador:** Claude (agente del gestor V). **Sin migración.**

## El reporte

Founder, con la captura del taller «Laboratorio de exploración sonora» en su iPhone: «Debe haber un alto mínimo o que por lo menos asegure que se vea el contenido.» La cabecera oscura (OL-351, bitácora 382) medía lo que el texto: la portada 4:3 (292 px a 390) y, con un título de tres renglones, el velo del título la cubría casi entera; el cartel quedaba como una franja oscurecida y el chip «Taller» subía hasta el botón de Atrás.

## Qué cambió

- **`globals.css`**: token nuevo `--alto-cabecera-oscura: min(56svh, 640px)`; `--velo-banda` más denso bajo el texto (de la banda a `rgba(20,20,20,.8)` al 55 % y a transparente; antes .7 al 45 %).
- **`ui/Ficha.module.css` § 3b**: la portada oscura deja el 4:3 y toma `min-height: var(--alto-cabecera-oscura)`; la imagen va `position: absolute; inset: 0` para que un cartel 4:5 no empuje el alto, y se recorta con `object-position: center top` (lo de arriba del cartel queda limpio; el velo solo cubre el pie, donde van título, línea y números). Con título largo la celda crece; nunca recorta texto.
- **El chip de la clase**: se queda en la columna del texto, justo encima del título (lo que ya era), y el título oscuro gana `padding-top: max(96px, alto de la barra de la ficha + 8)`: aunque el título sea tan largo que llene la cabecera, el chip empieza debajo de Atrás. Se eligió así porque al lado de Atrás competía con el botón y con la portada; encima del título se lee como parte del título.
- **Sin cartel** (`sin-foto-oscura.png`): la regla es la misma figura, así que conserva el alto mínimo.
- **Desde 1048** (dos columnas) la portada vuelve a su tarjeta 4:3 sin alto mínimo (ahí nunca fue problema). Entre 792 y 1048 vale el mínimo: a 768×1024 el 56svh da 573 px, prácticamente el 4:3 de antes (576); el tope de 640 px evita un cartel absurdo en tabletas altas.

## Medidas (alto de la cabecera = portada + números; Chrome, reloj fijo de `medir`, sin franja de hora)

| caso | antes | después |
|---|---|---|
| taller, título de 3 renglones, cartel 4:5, 390×844 | 378 (portada 292) | 558 (portada 473) |
| festival, 390×844 | 378 | 558 |
| exposición, título corto, 390×844 | 378 | 558 |
| taller 320×568 | 373 | 403 |
| taller 768×1024 | 661 | 659 |
| taller 1280×800 | 251 | 251 (sin cambio) |

Chip contra Atrás (390): antes el chip arrancaba a 130 px y el título a 34 px de arriba (con la franja de la hora del iPhone, encima de Atrás); después, chip a 310 px. A 320, título desde 112 px.

**Contraste** (blanco del título sobre el velo compuesto sobre un cartel blanco, peor caso, en la línea de arriba del título, medido con `getComputedStyle` del degradado y luminancia WCAG): antes 5,3 (taller 390) y **4,26 a 320**; después 10,5 (taller 390), 12,7 (festival), 14,5 (exposición), 11,4 (768) y 9,4 (320). La prueba de tokens de `Heroe.test.ts` mide ahora la parada del 55 %.

## Pruebas

`Heroe.test.ts`: el token del alto mínimo, la portada con `min-height`, el recorte desde arriba, la imagen absoluta y el `padding-top` con el alto de la barra; el contraste con la parada nueva.

## Verificación

`npm run lint` (0 errores; el aviso previo de `VisorImagen.componentes.test.mjs`, ajeno), `npm run typecheck`, `npm test` (190 archivos, 3 443 pruebas), `npm run inventario` (sin novedades) y `npm run medir` (sin novedades; presupuestos sin cambio: `s24-ficha-exposicion` 86/119 y `s25-ficha-festival` 124/157 nodos, el cambio es solo CSS). Una primera corrida de `medir` con 4 hilos se cayó por tiempos de espera en las altas (`/nuevo/*`, ajenas); con `MEDIR_HILOS=2` pasó limpia.

## Capturas (`docs/rediseno/capturas-394/`, 2×)

App compilada contra una copia del respaldo local (el `fixture.mjs` del repo no cambia): el taller de linóleo renombrado con el título del reporte y un cartel vertical 4:5 de relleno con texto arriba («LABORATORIO / exploración sonora») y abajo; los demás carteles, uno blanco con texto (peor caso). Abiertas y miradas:

- `01-taller-antes.png` (390): el cartel cortado al centro, el texto de arriba fuera del cuadro; el título de tres renglones empieza a media portada y el chip «TALLER» queda a la altura del círculo; cabecera 378.
- `02-taller-despues.png` (390): «LABORATORIO / exploración sonora» se lee arriba entre Atrás y «···», el círculo del cartel entero; abajo «TALLER», el título en tres renglones, «Del 9 al 13 de oct · ACHE Galería» y Sesiones · Costo · Van sobre la banda.
- `03-festival.png` (390): el cartel blanco a sangre arriba, sin velo; el velo empieza bajo el círculo; «FESTIVAL», el título en un renglón, la línea y los números.
- `04-exposicion.png` (390): «Ecos de papel», título corto: la misma altura que el festival (el mínimo manda), chip y título al pie. (En este respaldo la exposición toma la portada de su lugar; sin ninguna imagen la figura es la misma y conserva el mismo mínimo.)
- `05-taller-768.png` (768×1024): portada de 573, el cartel arriba completo, el título en dos renglones; no se estira.
- `06-taller-1280.png` (1280×800): dos columnas como antes; la portada 4:3 ahora recortada desde arriba (se ve el nombre del cartel).
- `07-taller-320.png` (320×568): cabecera de 403, chip debajo de Atrás, sin desbordes.

## Por confirmar con el founder

1. El 56 % y el tope de 640 px: si en el iPhone quiere más cartel, se sube el token.
2. El recorte desde arriba también aplica en escritorio (antes centrado).
