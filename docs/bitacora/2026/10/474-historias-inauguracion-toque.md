# 474 · Historias de Inicio: una exposición que inaugura ese día sale una sola vez, y el último toque no abre la tarjeta de abajo (OL-442)

**Fecha:** 2026-10-22. **Rama:** `historias-inauguracion-toque`, desde `origin/main` (`bd6e6f7d`). **Operador:** agente de la pieza (Claude)
para el Gestor VII, sin otros agentes. **Migración:** ninguna. **Variables de entorno:** ninguna. **Estado:** lista para la revisión del gestor.

## El pedido

El founder, hoy:

1. «Una inauguración y una exposición se muestran dos veces en la sección de historias cuando suceden el mismo día. Si una expo inaugura solo
   se muestra la inauguración ese día. Abrir e inaugurar en términos prácticos es lo mismo.»
2. «Al terminar de ver las historias si se hace TAP en el lado derecho en la última historia para avanzar se muestra una ficha de evento del
   carrusel. Es decir el TAP lo toma la ficha de ese lado y abre.»

## 1 · La exposición y su inauguración, una sola vez

**Causa.** La fila «Ahora» (`src/lib/ahora.ts`) trataba la exposición y su acto como dos avisos: la exposición su primer día en el grupo de
exposiciones («Inaugura hoy», OL-379) y el acto, un evento más, por su hora. Además, solo reconocía la liga por `inaugura_id`: una inauguración
suelta («Inauguración: Raíces», sin liga) no contaba.

**Regla** (pura, en `src/lib/ahora.ts`):

- `actoDeInauguracion(expo, agenda)` (nueva, exportada): el acto ligado por `inaugura_id`; sin liga, una inauguración suelta de la agenda
  (no exposición, título que dice que inaugura: `esApertura`) **del mismo sitio** (`claveDeSitio`: el mismo lugar o el mismo sitio escrito
  a mano, normalizado), **el día en que la exposición abre** (en su zona) y que **nombra la misma muestra** (`nombreDeMuestra` de los dos
  títulos, comparados con `mismoActo`: «Inauguración de la exposición «Raíces»» = «Exposición Raíces» = «Raíces»). Reutiliza las funciones
  puras de `src/lib/sugerencias.ts` (OL-323); no hay otra forma de comparar títulos.
- `candidatosAhora` pone en la exposición el inicio de ese acto (`inaugura`), como ya hacía con la liga.
- `clasificarAhora`: **el día de su acto de inauguración la exposición no entra**; sale solo el acto, con su hora («Hoy · 7:00 pm», «Ahora»).
  Los días siguientes la exposición sale como siempre (su último día, «Último día»). Sin inauguración registrada, su primer día sale normal,
  «Abre hoy». Si la inauguración es otro día (la de DESIERTO fue el viernes 9 y abrió el lunes 12), cada una sale su día, sin cambios.
- La etiqueta «Inaugura hoy» de la exposición ya no puede salir y se quitó de `etiquetaAhora` (una exposición dice «Abre hoy» o «Último día»).

**Pruebas** (`src/lib/ahora.test.ts`, 37 en verde): ligadas por `inaugura_id` (aunque el acto se llame distinto); por título + lugar + día,
también con «Inauguración de la exposición «Raíces»» y con un sitio escrito a mano; mientras dura el acto y después de que termine, la
exposición no vuelve ese día; los días siguientes sale la exposición; sin inauguración, «Abre hoy»; no se confunde con otra muestra, otro lugar,
otro día, un evento del mismo nombre que no dice que inaugura ni otra exposición que se anuncia como inauguración. Las de OL-379 que esperaban
«Inaugura hoy» ahora esperan que la exposición no salga ese día.

## 2 · El último toque no abre la tarjeta de abajo

**Causa.** El toque a la derecha en la última historia cierra la capa en su `pointerup` (`soltar` → `pasar(1)` → `salir`): en ese momento
pierde `data-abierta` y con él `pointer-events` (y con «Reducir movimiento» se desmonta en el acto). En táctil el navegador manda el `click` del
toque **después** del `touchend`, al elemento que entonces está bajo el dedo, que ya es la tarjeta del carril de abajo: la abría. Con ratón no
pasa (la captura de puntero deja el clic en la capa); por eso solo se veía en el teléfono.

**Arreglo** (`src/components/inicio/Historias.tsx`): cuando un toque cierra la capa (el de «siguiente» en la última historia, o fuera del marco
en tableta y escritorio), `tragarClicDelToque()` pone un escudo de un solo uso en `window` (fase de captura, antes que nadie): se traga ese clic
(`preventDefault` + `stopPropagation`) y se va. Si el clic no llega, el escudo se va al empezar otro toque (`pointerdown`) o pasados 300 ms
(`ESPERA_CLIC`), así que el primer toque de después siempre llega. Vive fuera del componente porque la capa puede desmontarse antes del clic.
Deslizar hacia abajo, la ✕, Escape y el fin de la barra no lo ponen (no traen clic que se cuele). Los gestos siguen terminando con
`pointerup`/`pointercancel`, nunca con `pointerleave` (Safari táctil).

**Prueba de componente** (`src/components/inicio/HistoriasToqueFinal.componentes.test.mjs`, Chrome real 390×844, táctil, toques de verdad con
`touchscreen.tap` y el punto comprobado con `elementFromPoint`): una tarjeta de Inicio debajo de toda la historia; el último toque a la derecha
cierra sin abrirla (también con «Reducir movimiento» y pasando de historia en historia hasta cerrar) y el primer toque de después la abre.
**Sin el arreglo las tres fallan** (la navegación apuntada era `["/eventos/tarjeta"]`); con él pasan.

## Capturas (`docs/rediseno/capturas-474/`, 390×844 a 2×)

Guion: `scripts/ops/auditoria-ui/capturar-historias-inauguracion.mjs <árbol> <salida>` (app compilada contra el respaldo local con el reloj de
`npm run medir`, las 10:00 del 7 de octubre; da de alta en memoria, por la puerta de la rutina del respaldo y sin tocar `fixture.mjs`, la
exposición «Raíces» que abre hoy con su «Inauguración: Raíces» de las 19:00 ligada por `inaugura_id`, y «Huellas», que abre hoy sin
inauguración, las dos en «Galería Toro»). Abiertas una por una:

- `01-fila-historias-390.png`: la fila de historias con cuatro círculos: «Abre hoy» (Huellas, anillo oscuro de exposición), «6:00 pm» (la
  Sinfónica, con su cartel), «7:00 pm» (Inauguración: Raíces) y «7:00 pm» (Macario). La exposición «Raíces» no sale. Nombres accesibles leídos:
  `Abre hoy: Huellas`, `6:00 pm · Hoy: Concierto de la Orquesta Sinfónica…`, `7:00 pm · Hoy: Inauguración: Raíces`, `7:00 pm · Hoy: Macario…`.
- `02-historia-inauguracion-390.png`: la historia de la inauguración (tipográfica, sin cartel): «HOY», «Hoy · 7:00 pm», «Inauguración:
  Raíces», «Galería Toro · Av. Carranza 500, San Luis Potosí», con «Ver más información», «Me interesa» y «Cómo llegar».
- `03-ultima-historia-390.png`: la última historia (Macario), las cuatro barras arriba con la última empezando. Debajo del punto del toque
  (330, 560) está la tarjeta de «DESIERTO» del carril «Seleccionados para ti» (`/eventos/desierto-observacion-y-espacio`).
- `04-inicio-tras-ultimo-toque-390.png`: tras el toque a la derecha, Inicio como estaba (la ruta sigue siendo `/`): la tarjeta de DESIERTO no
  se abrió.

## Verificación

- `npm run lint && npm run typecheck && npm test`: en verde, 268 archivos, 4520 pruebas.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 2242 pruebas, 0 fallaron (sin migración).
- `npm run inventario`: sin novedades. `npm run medir`: 52 pantallas × 4 anchos, sin novedades.
- `npm run test:componentes` completo: 701 de 701 (con las 3 nuevas).

## Por confirmar con el founder

- El día de la inauguración la exposición no sale **en todo el día**, también por la mañana antes del acto (si la galería ya abre a las 10:00,
  la historia lo dice a las 7:00 pm). Es lo que pidió («ese día solo la inauguración»).
- Si alguien abre Inicio **después** de que la inauguración terminó ese mismo día, la agenda ya no trae el acto y la exposición sale «Abre hoy»
  hasta su cierre (a las 18:00 sin horario). Con inauguraciones de noche casi nunca se ve; no se añadió una consulta para evitarlo.

## Lo que quedó fuera

- El resto de Inicio (carriles, agenda, fichas): la exposición y su inauguración siguen saliendo cada una en su sitio, como antes. El pedido
  era de las historias.
- `VisorImagen` cierra con el propio clic (no se cuela nada) y `Destacados` no cierra capas: sin cambios.
