# 386 · La cabecera oscura en todas las fichas de evento

**Pieza:** OL-355. **Rama:** `cabecera-oscura-todas`, base `origin/main` (`2f691aef`). **Fecha:** 2026-10-08. **Operador:** Claude (agente del gestor V).
**Sin migración.** Parte de la cabecera de OL-351 (bitácora [382](382-cabecera-clases.md)).

## Qué decidió el founder

«me enamoré de cabecera oscura, quiero que ese sea el diseño de todas las fichas "normales"». Y después: «detén tokens oscuros y modo oscuro, también ficha oscura completa; se quedan solo todas las cabeceras oscuras nada más». Solo la cabecera: nada de modo oscuro ni de ficha oscura completa; lugar y artista no cambian.

## Qué cambió

- **`eventos/[id]/page.tsx`**: ya no hay condición de clase. Los números van siempre en la banda del héroe (`Kpis piel="banda"`); el evento suelto lleva los suyos de siempre, **cuándo (la hora y el día) · Costo · Van** («Van» diferido, con su salto a «Quién va»), y el cuerpo ya no repite ningún número: empieza en las acciones, como en las clases.
  - **Chip:** solo exposición, taller y festival. El evento suelto no lleva («Evento» no dice nada: el carril de la agenda y Buscar tampoco etiquetan al evento suelto, `CLASES_NOMBRADAS`).
  - **Línea bajo el título:** el encargo pedía «la que ya tenía la ficha puntual (fecha y hora)», pero la ficha puntual nunca tuvo línea bajo el título: su fecha y hora son el primer número (`kpiCuando`). Ponerla repetiría ese número, lo mismo que OL-351 quitó en la exposición. Queda sin línea; si el founder la quiere, es una línea en `metaClase`.
  - **Acto de un festival:** igual que el suelto (es un evento suelto con padre); su renglón «Parte de Festival de Cine de Invierno» sigue en el cuerpo claro.
- **`ui/Heroe.tsx`** y **`ui/Ficha.module.css`**: solo los comentarios (la cabecera oscura es la de toda ficha de evento; el héroe claro, la de lugar y artista). El CSS del héroe claro no se borra: lo usan lugar, artista, sitio y la hoja de Lugares. No quedó código de evento sin uso.
- **Escritorio:** la misma tarjeta oscura a la derecha de la portada que en OL-351, sin cambios de CSS.
- **Avisos** («Este evento está oculto…», errores): siguen en su fila clara entre la banda y el cuerpo (capturas 03 y la 01 de la 382).

## Contraste (AA)

- `Heroe.test.ts`: la prueba de tokens de OL-351 vale tal cual (título, meta y números con los mismos tokens) y se anota que cubre al suelto. El título del suelto, sin chip ni línea, queda más abajo en el velo que el del festival: el mismo caso o uno mejor.
- Medido en la página compilada, en la línea de arriba del título, con un cartel casi blanco debajo (peor caso): **7,2:1** el concierto de dos líneas a 390 y a 320, **9,8:1** los títulos de una línea (le basta 3:1, letra grande). Los números, sobre su tarjeta en la banda, 15:1 y 8,4:1 (OL-351). A 1280 el título va sobre la tarjeta negra (18,4:1).

## Pruebas

- `page.test.ts`: «un evento suelto no cambia» pasa a lo contrario: el héroe trae la banda en piel `banda`, sin etiqueta ni meta, con cuándo · Costo · «Van» diferido dentro y ningún número en el cuerpo.
- `Heroe.test.ts`: el evento suelto con números lleva la piel oscura sin chip ni meta; sin números (lugar o artista) sigue el héroe claro.

## Verificación

`npm run lint` (sin errores; el aviso previo de `VisorImagen.componentes.test.mjs`, ajeno), `npm run typecheck`, `npm test` (187 archivos, 3 406 pruebas), `npm run inventario` (sin novedades) y `npm run medir` (sin novedades con los presupuestos de abajo). El `node_modules` del árbol se instaló con `npm ci` (el de la carpeta principal no trae `satori`).

**Presupuestos de `medir`:** `06-ficha-evento` 75 → 76 nodos (106 → 107 desde 820) y `s06-ficha-evento-voy` 70 → 71 (103 → 104): la fila de la banda (`numeros`) que envuelve los números, lo mismo que sumó OL-351 en la exposición. Profundidad igual. Se anotaron a mano solo esas ocho cifras.

## Capturas (`docs/rediseno/capturas-386/`, 2×)

App compilada contra el respaldo local de `medir` (`fixture.mjs` sin cambios), reloj fijo (mié 7 de oct), Chrome de la Mac; los carteles los contesta el navegador con uno de relleno casi blanco con texto (el peor caso). Cada una abierta y comparada con `capturas-382/01-festival.png`: misma jerarquía (portada a sangre, título blanco al pie del velo, banda con tres tarjetas, cuerpo claro desde las acciones), sin chip ni línea.

- `01-puntual-cartel.png` (390×844): el concierto de la Orquesta, título en dos renglones, «18:00 mié 7 oct · Costo Gratis · Van 0» en la banda; abajo «Compartir · A mi calendario · Cómo llegar» y «Dónde». El texto del cartel asoma tenue tras el velo; el título se lee.
- `02-puntual-sin-cartel.png` (390): «Macario, Xantolo camino al Mictlán» sin cartel ni portada de lugar: el símbolo SN claro sobre la banda (`sin-foto-oscura.png`).
- `03-acto-festival.png` (390, sesión de Ana): «Charla con la directora», «18:00 sáb 17 oct · Costo · Van», el aviso de oculto en claro, las acciones y «Parte de Festival de Cine de Invierno».
- `04-puntual-320.png` (320×844): sin desbordes; la portada termina en el mismo píxel que el título (240 y 240).
- `05-puntual-1280.png` (1280×800): la portada 4:3 a la izquierda y la tarjeta oscura con el título y los números a la derecha, como `capturas-382/10-festival-1280.png`.
- `06-lugar-sin-cambio.png` (390): «Teatro de la Paz» con el héroe claro 3:2 de siempre, su chip «FORO» y los números en el cuerpo: lugar no cambia.

## Por confirmar con el founder

1. **Línea bajo el título del evento suelto:** no tiene (su fecha y hora ya son el primer número). Si la quiere, cabe «mié 7 de oct · 18:00 · Lugar» como la del taller.
2. **Chip «Evento»:** no se pone; las clases sí llevan el suyo.
