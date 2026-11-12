# 548 · OL-515 · «Publicar en Instagram» desde la ficha del lugar y del artista

**Fecha:** 2026-11-12. **Rama:** `claude/republish-rinoceronte-theater-xfhjza` (la misma de OL-514, encima de su commit). **Quién:** el mismo chat en la nube que abrió el founder desde su teléfono. **Migración:** ninguna.

## Qué pidió el founder

«Y agrega otra pieza que permita publicar desde la ficha del lugar y el artista. Así como ya pasa con el evento.»

## Qué cambió

1. **Renglón «Publicar en Instagram» en el «···»** de la ficha de un artista y de un lugar (también en la ficha que se abre dentro de la hoja de Lugares). Solo la administración, y solo si la ficha se ve y no dijo que no (si dijo que no, sigue saliendo «Fuera de Instagram», como antes). El renglón dice cómo va: «En @smsnstrsapp», «Salió en Instagram hace 9 días» o «Publicando…».
2. **Hoja de vista previa:** la tarjeta 4:5 y el texto como saldrían ahora (los mismos de la semana de Instagram), a quién etiqueta (o que sale sin etiqueta si la ficha no tiene Instagram), la ubicación y «Publicar ahora». Con la publicación van su historia y Facebook, como en la semana.
3. **Si ya salió antes**, la hoja lo dice, el botón es «Publicar otra vez» y pide confirmar («Sí, publicar otra vez» / «Mejor no»). El servidor lo exige también.
4. **Si la semana ya la tiene programada** para más adelante, la hoja lo avisa (saldría las dos veces; se cambia en la pestaña Semana). **Si ya va en camino**, lo dice y no ofrece botón.
5. **Al publicar** se guarda un trabajo en la cola de redes sin día de la semana; lo publica el mismo trabajador de siempre (`enFicha`), y al terminar llega el aviso al teléfono, que ahora abre la ficha (antes un trabajo así habría abierto una dirección rota).
6. **«Volver a publicar lo que se quedó sin salir»** (al reconectar Instagram) sabe volver a mandar también estos trabajos.

Archivos nuevos: `src/app/admin/instagram/accionesFicha.ts` (`prepararFicha`, `publicarFicha`), `src/components/instagram/HojaFicha.tsx` y su prueba, `src/app/api/instagram/ficha/[id]/route.ts` (la vista previa; solo administración, 404 para los demás). Tocados: `PublicarDesdeFicha.tsx` (renglón y hoja de ficha), `admin/instagram/semana.ts` (`enInstagramDeFicha`), `artistas/[id]/page.tsx`, `lugares/[id]/CuerpoLugar.tsx`, `lib/redes/reglas.ts` y `trabajar.ts` (a dónde lleva el aviso), `admin/instagram/acciones.ts` (reintento).

## Decisiones por confirmar (gestor y founder)

- **El trabajo se guarda con la llave de servicio**, después de comprobar en el servidor que quien lo pide es de la administración. La cola solo deja escribir por funciones de la base y `redes_encolar` solo sabe de eventos; la alternativa es una migración con una función `redes_encolar_ficha`. Se eligió no traer migración. Consecuencia: no hay candado en la base contra dos toques simultáneos (la acción comprueba antes que no vaya ya en camino).
- **La tarjeta sigue diciendo «Lugar de la semana» / «Artista de la semana»** aunque se publique a mano desde la ficha: es la misma tarjeta. Si el founder quiere otro rótulo, es otra pieza.
- **El texto no se edita en esta hoja** (en la del evento sí): sale el que arma el sistema. Tampoco se puede quitar la etiqueta ni apagar Facebook aquí.
- **La hoja es nueva y no pasó por prototipo firmado:** está armada con las piezas de la hoja del día. Las capturas son para el VoBo del founder.
- Publicar desde la ficha no toca la rotación de la semana, salvo que cuenta como «salió»: la ficha no vuelve a entrar sola en 6 meses.

## Evidencia

- `npm run typecheck`: verde. `npm run lint`: 0 errores (2 avisos que ya estaban, en archivos no tocados).
- `npm test`: 329 archivos, 5216 pruebas en verde (una nueva en `reglas.test.ts`; a los dobles de la base de `lugares/[id]/page.test.ts` y `artistas/[id]/page.test.ts` se les añadieron `is` y `gt`, que la consulta nueva usa).
- `next build`: verde (con variables de ejemplo).
- En Chromium a 390×844: `HojaFicha.componentes.test.mjs` 4 en verde y `HojaDia.componentes.test.mjs` 12 en verde.
- Capturas 390×844 (datos de ejemplo; la tarjeta sale en blanco porque en la prueba la imagen es un doble): [la hoja](548-capturas/515-publicar-desde-ficha.png) y [la confirmación](548-capturas/515-publicar-otra-vez-desde-ficha.png).

## Lo que NO se comprobó

- **Nada contra producción ni contra una base real:** ni la lectura de `enInstagramDeFicha`, ni que el trabajo sin día se guarde y se publique de punta a punta, ni la vista previa real de la tarjeta. El trabajador ya publica fichas (OL-479), pero nunca ha recibido una sin día de la semana: hay que probarlo en la vista previa de Vercel antes de publicar, con una ficha de prueba o con el propio teatro.
- No se probó el renglón dentro del «···» en la página real (solo la hoja, aislada).
- No se corrieron `npm run inventario`, `npm run medir` ni el banco de la base.

## Reglas del proyecto: lo que quedó fuera de norma

Lo mismo que en la 547: sin aviso previo al gestor (no hay chat gestor alcanzable desde la nube), números del script sin reserva (OL-515, bitácora 548) y, además, **dos piezas en la misma rama** (el entorno de la nube solo deja subir a esta). Van en commits separados para que el gestor las pueda partir.

## Qué sigue

1. Revisión del gestor (con la prueba de punta a punta en la vista previa) y «publica» del founder.
2. Ya en producción: ficha del Teatro El Rinoceronte Enamorado › «···» › «Publicar en Instagram» › «Publicar otra vez» › «Sí, publicar otra vez».
