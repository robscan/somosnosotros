# 387 · Vuelve la cabecera clara al evento suelto (OL-356)

**Fecha:** 2026-10-08. **Rama:** `volver-cabecera-por-clase`. **Operador:** Gestor V.

El founder, tras ver en producción la cabecera oscura en todas las fichas de evento (OL-355, #453), pidió «regresar a la versión anterior donde solo fichas de expos, galerías eran negras». Se revierte #453 con `git revert -m 1 3fd4e2e`: la cabecera oscura (OL-351) queda solo para exposición, taller y festival; el evento suelto y el acto de un festival recuperan la cabecera clara con sus KPI en el cuerpo. Vuelven los presupuestos de medición de `06-ficha-evento` y `s06-ficha-evento-voy` y la prueba «el evento suelto no cambia». Sin migración. OL-354 (#454) no se toca.
