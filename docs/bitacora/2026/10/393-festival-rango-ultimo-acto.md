# 393 · Rango de un festival cuyo último acto no tiene hora de fin (OL-362)

**Fecha:** 2026-10-09 · **Rama:** `festival-rango-ultimo-acto` · **Migración `20261009130000_festival_rango_ultimo_acto.sql`, sin aplicar.**

## Problema
Desde OL-358 un acto sin fin termina 3 h después de empezar (`eventos.termina`). `recalcular_festival` guardaba como fin del festival `max(termina)` de sus actos: un último acto a las 22:00 sin fin dejaba el festival a la 1:00 del día siguiente y «Del 12 al 14 de nov» decía «al 15». Decisión del founder (2026-10-09): el último día del rango es el día de inicio de ese acto, en su zona.

## Regla (un solo sitio en cada lado)
Un acto cuenta en el periodo de su festival hasta su fin, aunque cruce la medianoche; sin fin, hasta 3 h después de empezar sin pasar de la medianoche que cierra su día. La medianoche exacta ya se leía como final del día anterior (`ultimoDiaDelPeriodo`, OL-336), así que ficha, cartel y compartir, que leen el `fin` guardado del marco, dicen el día correcto sin cambios.
- Base: función nueva `fin_en_programa(inicio, fin, zona)` y `recalcular_festival` la usa (`create or replace`). `publicar_programa` termina llamando a `recalcular_festival`, así que no se toca. La migración recalcula al final los festivales ya guardados.
- App: `finEnPrograma` en `src/lib/claseEvento.ts`, usada por `periodoDePrograma`.
- Que el marco deje de verse a medianoche en vez de a la 1:00 no esconde el acto: el acto conserva su propio `termina`.

## Pruebas
`claseEvento.test.ts`: acto 22:00 sin fin → «Del 12 al 14 de nov»; 18:00 sin fin → 21:00; acto con fin a la 1:00 del día siguiente → se respeta y el rango llega al 15.

## Verificación
`npm run lint` (0 errores; el aviso previo de `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (3442 pasan), `npm run inventario` y `npm run medir` sin novedades. El SQL no se ejecutó: `test:db` pide `TEST_DATABASE_URL` y no hay base local en el árbol. Sin cambio visual, sin capturas.

## Para el founder
Aplicar la migración `20261009130000` en Supabase antes o junto con el «publica».
