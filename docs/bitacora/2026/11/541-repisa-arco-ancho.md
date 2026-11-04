# 541 · OL-510 · Repisa: el arco del lugar más ancho (C) y el círculo arriba a la derecha

**Fecha:** 2026-11-04. **Rama:** `repisa-lugar-ancho` (desde `origin/main` `5beb5a69`). **Quién:** Gestor de cambios VIII (Fable 5.1). **Sin migración.**

## El pedido
Founder, 2026-11-04, al ver la tarjeta del lugar: «El contenedor de lugares es demasiado estrecho, por favor hazlo más ancho para que se vea más la imagen, lo demás se queda como está por ahora». Se le enseñaron cuatro anchos dibujados con el código real (`00-cuatro-anchos-A-B-C-D.jpg`: A hoy, 0,8 de ancho entre alto; B 1,0; C 1,25; D 1,5) y eligió: «Usa C para lugares y coloca el círculo que estaba a un lado del contenedor de imagen en la versión A en la parte superior derecha de la ficha».

## Qué cambió (`src/lib/carteles/plantillas/repisa.tsx`)
- `ARCO_PROPORCION = 1.25` (antes 0,8 en `colocar`): el arco es 1,25 veces más ancho que alto; con el alto que deja la zona del texto, en 4:5 ocupa casi todo el ancho útil.
- `ARCO_ORILLA = 0.12` (antes 0,18 y 0,09 para el segundo aro): la portada ocupa el 76 % del ancho del arco (antes el 64 %) y los dos aros se reparten la orilla.
- El sol (el círculo en la tinta) deja de apoyarse en la repisa junto al arco (ya no cabe) y va arriba a la derecha de la ficha, donde el artista lleva su sello de fecha: diámetro `min(0,22 × alto del arco, ANCHO_SELLO)`, pegado al margen y a `arriba` (en 9:16, debajo de lo que tapa Instagram).
- Nada más cambia: artista, «Esta semana», textos y pie iguales.

## Evidencia
- `scripts/ops/auditoria-ui/instagram-repisa.mjs` con el código de la app y las fichas reales: 12 tarjetas, 0 con falla (contraste 5,05–7,49:1). En `docs/rediseno/capturas-541/`: Bajo Ceiba (L2) y La Guarida del Coyote (L1) en 4:5 y 9:16, a 540; y la hoja de los cuatro anchos que vio el founder.
- `vitest` de `carteles/destacado.test.ts` e `instagram/destacado.test.ts`: 34 pruebas en verde; `typecheck` y `eslint` del archivo en verde.
