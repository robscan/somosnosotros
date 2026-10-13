# 428 · El banner para compartir la app, para todo el mundo desde el primer día (OL-397)

**Fecha:** 2026-10-12 (noche). **Rama:** `banner-para-todos`, desde `origin/main` (`271085ad`). **Operador:** Claude Fable 5.1 (Gestor de cambios VI, pieza chica hecha por el gestor). **Sin migración.**

## El encargo

El founder preguntó por qué no veía el banner de compartir (OL-387, bitácora 418): la regla firmada lo sacaba solo con sesión y desde el tercer día distinto en que se abre Inicio, contado en el teléfono desde que la pieza llegó a producción (el 12 de oct, día 1). Su decisión, la misma noche: **«Ok mejor que lo vea todos siempre. Luego volvemos a este criterio de 3 días»**.

## Lo que cambió

- **`src/lib/visitasInicio.ts`:** `DIAS_PARA_BANNER` pasa de 3 a **1**: el banner sale desde el primer día. El mecanismo queda entero (los días distintos se siguen anotando en el teléfono) para volver al criterio de tres días cambiando ese número. La × sigue escondiéndolo 30 días y tras compartir sigue sin volver. Sin almacenamiento (modo privado o bloqueado) sigue sin salir, porque no podría recordar la ×.
- **`src/components/Inicio.tsx`:** el banner se monta **con o sin sesión** (antes `conSesion && …`).
- **`src/components/inicio/BannerCompartir.tsx`:** solo el comentario de cabecera.
- **Pruebas:** `visitasInicio.test.ts` (sale el primer día y cada día), `BannerCompartir.componentes.test.mjs` (prueba nueva «primera visita … sale y anota el día»; «cerrado o ya compartido: no sale» queda) e `Inicio.componentes.test.mjs` (en la segunda visita y sin sesión también sale).

## Verificación

- lint: 0 errores, 1 aviso que ya estaba en `main`. typecheck: limpio.
- test: 208 archivos, **3 761 pruebas** en verde.
- test:componentes del banner e Inicio: 16 de 16.
- inventario: sin novedades (342 medidas en duro aceptadas).
- medir: 38 pantallas × 4 anchos. Las dos pantallas de Inicio crecen los 9 nodos del banner (01-inicio de 363/365 a 372/374; s01-inicio-sesion de 368/370 a 377/379): línea base ajustada a mano en `medidas.aceptadas.json` solo para esas dos, sin `--aceptar`. Lo demás sin novedades.

## Para que el founder confirme

- En modo privado o con el almacenamiento bloqueado el banner no sale (no podría recordar la ×). Si quieres que salga también ahí, es una línea.
- Sin sesión, «Compartir» comparte somosnosotros.org igual; la medición `compartir` con `que: "app"` no distingue sesión.
