# 148 · Cartel sin título: el nombre como faltante

**Fecha:** 2026-09-21 · **Rama:** `nombre-faltante-tras-cartel`, desde `origin/main` (`1e8f66b`) · **OL:** OL-113 · **Modelo:** Sonnet 5, esfuerzo medio

## De dónde sale

Reporte del founder probando el alta de evento con un cartel real en su iPhone: «el cartel que pruebo no tiene titulo, todo bien pues no escribió titulo, pero por otro lado no se marca el campo como faltante».

Arranqué avisando al chat de gestión de cambios («Gestor de cambios II») y esperé su visto bueno antes de tocar nada. Confirmó números (OL-113/bitácora 148), rama (`nombre-faltante-tras-cartel` desde `origin/main`) y el método (respaldo/arnés local, aceptando causa medida antes que arreglo).

## Causa medida

Sin Playwright instalado en este árbol (hueco conocido, ver bitácora 135/144) y sin backend PGlite completo a mano, reproduje el caso con el mismo patrón que ya usa `flyer.componentes.test.mjs` — `FormularioEvento` real, con `leerCartelAccion` simulada (nunca la IA real ni producción) — pero servido con un servidor `http` llano y capturado con **Chrome headless por CDP puro** (WebSocket nativo de Node, sin instalar nada), como hizo OL-095. Disparé la lectura de un cartel con `titulo: ''` inyectando un `File` sintético en el `<input type="file">` vía `DataTransfer` (sin diálogo del sistema operativo) y resolviendo la promesa simulada de lectura.

**Medido en el DOM real, con capturas PNG reales a 390×844 (`docs/rediseno/capturas-113/evento-nombre-faltante-antes--390x844.png`):**

| | Antes |
| --- | --- |
| `placeholder` | `"Nombre del evento"` (genérico) |
| `aria-invalid` / `aria-describedby` | `"false"` / ninguno |
| Borde del campo | sólido, igual a un campo lleno |
| Texto bajo el campo | «Falta el nombre.», con `canon.cuerpoNota` (chico, gris, sin `id`) |

El texto de aviso **sí se pintaba** (primera sospecha del encargo confirmada a medias): no es que faltara la condición `faltaNombre`, sino que el único aviso era ese párrafo chico y gris, y el campo en sí quedaba idéntico a un campo recién abierto — mismo placeholder, mismo borde. En la misma pantalla, los renglones Dónde/Quién/Cuánto sin resolver sí llevan un borde discontinuo (`canon.pendiente`) que salta a la vista; Nombre es el único elemento "vacío" sin ninguna marca estructural, solo texto. Eso es lo que el founder no vio.

Sobre la segunda sospecha del encargo (una clase con `grid-area` fuera de su rejilla, el mismo error de "Es en otro sitio"): revisado el CSS, `canon.cuerpoNota` lleva `grid-area: cuerpo`, pero aquí el párrafo es hermano de `.campo` (un `<div>` con `display: grid` propio, de una sola celda) — **no** está dentro de un `.resuelto` que defina esa área, así que el `grid-area` no tiene ningún efecto (ni bueno ni malo): no rompe el layout, a diferencia de "Es en otro sitio", donde sí había una rejilla distinta debajo con columnas reales. Confirmado con `getComputedStyle` antes de tocar nada. Es la clase equivocada por higiene del canon (la regla del gestor: una clase solo se reutiliza dentro de la rejilla para la que fue escrita), no la causa de que el aviso pasara desapercibido.

**Nota para quien retome el hueco de Playwright:** `FormularioLugar.tsx` y `FormularioArtista.tsx` (bitácora 145) reutilizan el mismo `canon.cuerpoNota` para "Falta el nombre." bajo su propio campo, con el mismo razonamiento de entonces ("el `grid-area` no tiene efecto por no estar dentro de una rejilla"). Esta pieza solo tenía asignado `FormularioEvento.tsx`; si el founder quiere el mismo borde discontinuo/placeholder ahí, es una pieza aparte para la cola — señalado, no tocado.

## Arreglo

`FormularioCanon.module.css`:
- `.campoFalta` (nueva): mismo peso que `.pendiente` en los renglones — borde discontinuo del campo, sin rojo de error (ese color se reserva para un error real, tras intentar publicar).
- `.notaCampo` (nueva): mismo aspecto que `.cuerpoNota` (color, tamaño, separación) pero sin `grid-area`, para un campo suelto que no vive dentro de la rejilla de `.resuelto`.

`FormularioEvento.tsx`, solo el campo del nombre:
- El `<div className={canon.campo}>` gana `canon.campoFalta` cuando el nombre está vacío y no hay un error de servidor.
- `placeholder` pasa a «Falta el nombre» mientras está vacío (antes, siempre «Nombre del evento»).
- `aria-invalid` se deja atado solo a `errores.titulo` (un error real de validación), no a "vacío": un campo requerido y vacío antes de intentar publicar no es lo mismo que un error de servidor, y mezclar los dos habría vuelto el borde rojo desde que se abre un alta en blanco.
- `aria-describedby` apunta siempre a lo que esté visible bajo el campo (`error-nombre-evento` o `nota-nombre-evento`), nunca a un `id` que no exista.
- La nota «Falta el nombre.» cambia de `canon.cuerpoNota` a `canon.notaCampo`, con `id="nota-nombre-evento"`.

**Sin forzar el foco tras leer el cartel.** El encargo pedía decidir esto con criterio, pensando en L2 (OL-100): el founder aceptó quitar el `autoFocus` automático del campo del nombre porque el teclado salía solo y tapaba la tarjeta del cartel, y solo aceptó "cualquier reacomodo natural" **después** de que la persona misma elige el campo, no como reacción automática del sistema. Forzar el foco al terminar de leer un cartel repetiría exactamente ese patrón: el teclado saldría solo, justo cuando la tarjeta («Leí el cartel» · «Revisa el nombre y publica.») todavía está a la vista y es probablemente lo primero que la persona quiere leer. El aviso queda solo visual (borde, placeholder, nota), sin interrumpir con un teclado que nadie pidió.

**La tarjeta del cartel ya decía qué faltaba.** `estadoCartel.ts` (`leido()`) ya arma `"Revisa ${faltan.join(", ")} y publica."` con la lista que calcula `leerCartel` en `FormularioEvento.tsx` (línea ~500); con un cartel sin título esto ya daba «Revisa el nombre y publica.» sin tocar nada. Comprobado en las capturas: la tarjeta y la nota bajo el campo dicen lo mismo (nombre), no se contradicen.

## Verificación

- `npm run lint`: verde (1 warning preexistente y ajeno en `docs/diseno/logotipo/iconos-sn.mjs`, sin relación con esta pieza).
- `npm run typecheck`: verde.
- `npm test` (`vitest run`): **789 pruebas, 782 en verde, 7 en rojo** — las 7 son `scripts/test-db.test.ts`, preexistentes y ajenas: este árbol de trabajo no tiene el paquete `pg` instalado (mismo hueco documentado en bitácoras 135/145). Focalizado, `npx vitest run src/app/eventos`: **106 pruebas, 106 en verde** (8 archivos).
- `npm run build`: verde, `next build` compila y genera las 38 rutas sin error.
- **Prueba de componente nueva** en `flyer.componentes.test.mjs` (`node --test`, requiere Playwright): añadida (`'cartel sin titulo marca el campo del nombre como faltante, sin forzar el foco'`), con sintaxis comprobada (`node --check`). **No se pudo correr aquí** — este árbol tampoco tiene Playwright instalado (mismo hueco de siempre). Sus mismas aserciones (`placeholder`, `aria-describedby`, `borderStyle: dashed`, el foco sin forzar, el texto de la tarjeta) se comprobaron a mano, una por una, con el arnés CDP — ver la sección de causa medida y las capturas.
- **Capturas PNG reales 390×844**, `docs/rediseno/capturas-113/`:
  - `evento-nombre-faltante-antes--390x844.png`: el caso del founder, antes del arreglo — campo sin marca.
  - `evento-nombre-faltante-despues--390x844.png`: mismo caso, después — borde discontinuo, placeholder «Falta el nombre», nota bajo el campo, consistente con la tarjeta.
  - `evento-nombre-al-tope-despues--390x844.png`: con el nombre lleno (109/120 caracteres), sin marca de faltante — confirma que no queda ninguna regresión visual para el caso normal.

## Pasos

- [x] Aviso de arranque al gestor y su visto bueno.
- [x] Rama `nombre-faltante-tras-cartel` desde `origin/main`.
- [x] Leer CLAUDE.md, GESTION_DE_CAMBIOS, ASIGNACIONES (fila propia), docs/rediseno/26 y 22, y el código señalado.
- [x] Causa medida (arnés local sin Playwright, CDP puro, antes de tocar código).
- [x] Arreglo en `FormularioEvento.tsx` y `FormularioCanon.module.css`.
- [x] Prueba de componente nueva (no corrida aquí por falta de Playwright; aserciones comprobadas a mano).
- [x] `npm run lint && npm run typecheck && npm test && npm run build` en verde, números arriba.
- [x] Capturas PNG reales 390×844, antes/después y con título al tope.
- [x] Entrada OL-113 completada en `docs/ops/OPEN_LOOPS.md`.
- [x] Commit local, sin push.
