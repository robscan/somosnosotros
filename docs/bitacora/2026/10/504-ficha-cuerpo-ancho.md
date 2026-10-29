# 504 · La columna del cuerpo de la ficha mide la pantalla (higiene: la fila de artistas se desliza y «Informe» cabe)

**Pieza:** OL-472. **Rama:** `ficha-cuerpo-ancho`, base `origin/main` (`e0e65408`). **Fecha:** 2026-10-28. **Operador:** Gestor de cambios VII (Fable 5.1).
**Manda:** el reporte del founder del 2026-10-28 («aparecen círculos de artistas en carrusel pero no se puede navegar. Solo se muestran 5 de 9… el botón del reporte… no se desplaza con slide y solo se ve una parte del botón») y el diagnóstico de OL-469 (bitácora 501, §1): el arreglo de una línea que el founder pidió sacar antes del rediseño (pregunta 4, respuesta del gestor: sí).
**Estado:** hecho, sin migración ni variables nuevas. Espera el «publica» del founder.

## La causa (bitácora 501)

`.cuerpo` en `src/components/ui/Ficha.module.css` es una rejilla sin columnas: su única columna crece con lo que lleva dentro. La fila «Han pasado por aquí» con 9 fotos mide 744 px y ensanchaba el cuerpo entero en una pantalla de 390: la fila no tenía nada que desplazar, el dedo corría la página de lado 374 px, «Informe» quedaba entre 396 y 764 px (solo asomaba su borde) y «Dónde», «Sobre» y los títulos largos se salían. Falla desde 5 fotos; OL-390 se probó con 4.

## El cambio

Una regla en `.cuerpo`: `grid-template-columns: minmax(0, 1fr)`. La columna mide la pantalla, como ya hace `.ficha`; cualquier fila que se deslice dentro de una sección se desliza sola. Nada de lo que hoy cabe cambia (`npm run medir`: 60 pantallas × 4 anchos sin novedades).

## Comprobado

- `scripts/ops/auditoria-ui/capturar-historial-escalable.mjs docs/rediseno/capturas-504` (la app compilada contra el respaldo con el historial grande: Museo Leonora Carrington (demo) con 84 eventos y 9 artistas; Valeria Quiroz (demo) con 30 fechas en 8 lugares; Chrome real; toques y gesto del dedo de verdad). Con el arreglo, a 320, 390 y 430 y con y sin sesión: el cuerpo mide la pantalla, la fila mide su columna (744/350 a 390) y se desliza (`scrollLeft` 394 a 390, 464 a 320, 354 a 430), la página no se corre de lado (0 px), y «Tu año» e «Informe» (o «Presentación») caben enteros: ningún botón cortado. Errores de página: 0. Las 6 «comprobaciones» que el guion da por fallidas son las que afirman el estado roto de hoy (el plegado más ancho que la pantalla, la fila sin desplazamiento, la página corrida, el botón fuera): con el arreglo ya no se cumplen, que es lo que se buscaba.
- `npm run lint` (0 errores; 2 avisos ajenos), `npm run typecheck`, `npm run test:componentes` (754 de 754), `npm run medir` (sin novedades).

## Capturas (`docs/rediseno/capturas-504/`, abiertas)

- `01-lugar-ana-2-fila.png` / `01-lugar-ana-3-tras-deslizar.png` (390, con sesión): la fila de 9 fotos dentro de la pantalla y, tras el gesto, desplazada: asoman las siguientes.
- `01-lugar-ana-4-final.png`: «Tu año» e «Informe» enteros, lado a lado, sobre «Dónde» con su mapa completo; nada se sale.
- `02-lugar-ana-regla-*`: lo mismo con la regla inyectada por el guion (ahora redundante: igual que sin ella).
- `03-lugar-sin-sesion-*`: sin sesión no existen «Tu año» ni «Informe»; la fila se desliza igual.
- `04-artista-ana-*` / `05-artista-ana-regla-*`: la Trayectoria de la artista (8 lugares): fila desplazable y «Tu año» · «Presentación» enteros.
- `06-lugar-ana-320-*`: a 320, 3 fotos enteras y una asomando; los botones a 136 px cada uno, sin cortes.

## Lo que sigue

El rediseño de la sección (OL-469, prototipo firmado F1 · L1 · A1) usa esta misma rejilla; este arreglo sale antes para que hoy la fila y el informe funcionen.
