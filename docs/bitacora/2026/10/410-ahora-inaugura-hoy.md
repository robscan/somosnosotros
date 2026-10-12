# 410 · La fila «Ahora» dice «Inaugura hoy» solo si la inauguración es hoy (OL-379)

**Fecha:** 2026-10-12. **Rama:** `ahora-inaugura-hoy`, desde `origin/main` (`bef2fdc7`). **Operador:** Claude (agente del gestor VI). **Sin migración** (`inaugura_id` ya existe en `eventos`).
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder.

## El reporte

Founder, 2026-10-12, en sus pruebas de usuario: la exposición «DESIERTO: Observación y Espacio.» salió en la fila «Ahora» con «Inaugura hoy» el lunes 12 de octubre. Pero su inauguración fue el viernes 9: el acto «Inauguración: DESIERTO: Observación y Espacio.», ligado a la exposición por su `inaugura_id`, empezó el 9 a las 20:00 de San Luis. La regla que pidió, textual: «hoy se visita solamente».

## La causa

- `candidatosAhora` mete una exposición cuando su `inicio` o su `fin` caen en los próximos días.
- `etiquetaAhora`, para una exposición, decía «Último día» en su último día y, si no, «Inaugura hoy». No miraba si la exposición tiene acto de inauguración ni cuándo es.
- DESIERTO se visita desde el 12 a las 00:00 (`inicio` = `2026-10-12T06:00:00Z`). El 12 era su primer día, y la etiqueta lo tomaba por su inauguración.
- La agenda (`cargarAgenda`) no pedía `inaugura_id`, así que la fila no podía saberlo.

## Qué cambió

- **`src/lib/cargarAgenda.ts`:** la consulta de eventos pide también `inaugura_id`. Es la misma consulta, sin viaje de más.
- **`src/lib/agenda.ts`:** el tipo `EventoAgenda` gana `inaugura_id?: string | null`, opcional. No se tocó nada más del archivo.
- **`src/lib/ahora.ts`:**
  - `EventoAhora` gana `inaugura?: string`: el inicio ISO del acto de inauguración. Solo lo lleva una exposición cuyo acto está en la agenda.
  - `candidatosAhora` busca el acto por `inaugura_id` entre los eventos ya cargados. La agenda solo trae lo que no ha terminado (`filtroSinPasar`). Si el acto ya pasó, no está, y eso basta para saber que no es hoy.
  - `etiquetaAhora` para una exposición, en este orden:
    1. su último día: «Último día», como antes;
    2. su acto de inauguración es hoy, en la zona de la exposición: «Inaugura hoy»;
    3. si no, en su primer día: «Abre hoy».
  - El círculo (`rotuloCirculo`, `rotulosAhora`) y la historia (`Historias.tsx`) usan la misma etiqueta, así que dicen lo mismo sin tocarlos.
- **Qué no cambió:** qué exposiciones entran en la fila. Entran en su primer día o en el último, hasta su cierre de hoy o las 18:00. Una exposición cuyo primer día no es hoy ni es su último día no entra, aunque su inauguración sea hoy: el acto sale en la fila por su cuenta, como evento.

## Lo que decidí yo, y por qué

- **Se guarda el inicio del acto, no un «sí/no» calculado en el servidor.** El teléfono vuelve a clasificar la fila cada minuto con lo que le mandó el servidor. Con la hora del acto, a medianoche una inauguración de mañana pasa sola a «Inaugura hoy»; un sí/no calculado en el servidor se quedaría con el día de la carga.
- **«Hoy» se lee en la zona de la exposición**, como todo en `lib/ahora`. Las 20:00 de San Luis del 12 son el 13 en UTC y siguen siendo «hoy» el 12.
- **Una inauguración de esta mañana que ya terminó:** mientras la página sigue abierta, dice «Inaugura hoy». Si se recarga después de que el acto termina, la agenda ya no lo trae y pasa a «Abre hoy». Es un caso raro y las dos cosas son ciertas ese día; no merece una consulta aparte.

## Por confirmar con el founder

- **«Abre hoy»** en el primer día de visita de una exposición sin inauguración ese día. Es la propuesta del gestor a partir de «hoy se visita solamente», y lo que ya dice la ficha (`textoHoy`: «Abre hoy 10:00 a.m.–6:00 p.m.»). Si prefiere otra palabra, se cambia en un solo lugar (`etiquetaAhora`).
- La historia lo repite arriba (el chip «ABRE HOY») y en la línea de abajo («Abre hoy · Horario por confirmar»), igual que antes repetía «Inaugura hoy». No lo cambié: no es parte de este reporte.

## Pruebas

- **`src/lib/ahora.test.ts`**, 30 pruebas, 9 nuevas, con el caso real (DESIERTO del `2026-10-12T06:00:00Z` al `2026-11-16T05:59:00Z`, zona America/Mexico_City):
  - Inauguración el 9 (`2026-10-10T02:00:00Z`), el 12 a las 11:00: «Abre hoy», en la etiqueta y en el círculo.
  - La misma exposición con la inauguración el 12 a las 20:00: «Inaugura hoy».
  - Sin `inaugura_id`, el primer día: «Abre hoy».
  - Último día, con o sin inauguración: «Último día».
  - Un día cualquiera en medio no entra, aunque lleve su inauguración.
  - Una inauguración de mañana no es de hoy; a medianoche el teléfono la vuelve de hoy.
  - Las 20:00 de San Luis del 12 (el 13 en UTC) siguen siendo hoy.
  - `candidatosAhora` con el acto en la agenda manda su inicio y la etiqueta es «Inaugura hoy». Sin el acto (ya pasó), no manda nada y es «Abre hoy».
- **Pruebas que cambiaron:** seis esperaban «Inaugura hoy» en el primer día de una exposición sin acto de inauguración. Era justo el error. Ahora esperan «Abre hoy»; cada una tiene su comentario.
- **`src/lib/cargarAgenda.test.ts`:** la consulta de eventos pide `inaugura_id`.
- **`src/components/inicio/FilaAhora.componentes.test.mjs`:** 8/8 en Chrome. No cambió: su exposición es de «Último día».

## Verificación

- **lint:** 0 errores y el aviso que ya estaba (`VisorImagen.componentes.test.mjs`).
- **typecheck:** limpio.
- **`npm test`:** 197 archivos y 3588 pruebas, en verde.
  - El `node_modules` compartido de la carpeta principal no tiene `satori`, así que tres pruebas de carteles no cargaban. Nada que ver con esta pieza.
  - Para correrlas se clonó al árbol (`cp -Rc`) el `node_modules` de otro árbol, con el mismo `package.json`. No va en git.
- **inventario:** sin novedades.
- **`npm run medir -- --solo=inicio`:** sin novedades. Inicio queda en 363/363/365/365 nodos y profundidad 11. Solo cambia el texto del rótulo, no el DOM.

## Capturas (390×844 a 2×)

[`docs/rediseno/capturas-410/`](../../../rediseno/capturas-410/), con el Chrome de la Mac y playwright-core.

**Cómo se hicieron:**
- La app compilada (`next build` y `next start`) contra el respaldo local del repo (`scripts/ops/auditoria-ui/respaldo-local`), con la sesión inventada de Ana. Las variables iban en el comando; no hubo `.env` ni `.env.local`.
- Una envoltura del scratchpad añade dos exposiciones que abren hoy, el lunes 12 de octubre:
  - «DESIERTO: Observación y Espacio.», en Aether, con su acto de inauguración el viernes 9 a las 20:00 (ya pasó: la agenda no lo trae).
  - «Ríos de sal», inventada, en el Teatro de la Paz, con su acto hoy a las 20:00.
- La envoltura quita del fixture toda URL de Supabase: las historias salen tipográficas. El navegador cortaba cualquier petición fuera de 127.0.0.1: no hubo ninguna, ni errores de página.
- Hora real, sin reloj falso: 09:17 de San Luis.

**Las capturas**, abiertas una por una:
- `01-fila-ahora-abre-e-inaugura.png`: Inicio al abrir. En la fila: «Abre hoy» (DESIERTO) y «Inaugura hoy» (Ríos de sal), las dos con el anillo oscuro de las exposiciones; luego «18:00», «19:00» y asoma «20…» (el acto de Ríos de sal), con el anillo gris de «Hoy».
- `02-historia-desierto-abre-hoy.png`: la historia de DESIERTO. Arriba, el chip «ABRE HOY»; abajo, «Abre hoy · Horario por confirmar», el título y «Aether».
- `03-historia-rios-de-sal-inaugura-hoy.png`: la historia de Ríos de sal. Arriba, «INAUGURA HOY»; abajo, «Inaugura hoy · Horario por confirmar», el título y «Teatro de la Paz».

**Leído en la página:** los nombres de los círculos son «Abre hoy: DESIERTO: Observación y Espacio.», «Inaugura hoy: Ríos de sal», «18:00 · Hoy: Concierto de la Orquesta Sinfónica…», «19:00 · Hoy: Macario…» y «20:00 · Hoy: Inauguración: Ríos de sal».

## Otro sitio que diga «Inaugura»

`grep -rn "Inaugura" src`: solo `lib/ahora.ts` dice «Inaugura hoy». Lo demás es otra cosa:
- la ficha de la exposición: «Inauguración» y «Inaugura {título}»;
- el alta y sus sugerencias: «Inauguración», «Inauguración ligada»;
- títulos de prueba.

La historia y el círculo toman la etiqueta de `etiquetaAhora`.
