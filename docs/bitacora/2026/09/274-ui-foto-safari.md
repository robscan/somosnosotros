# 274 · Carril de Inicio: la foto a su alto en Safari (OL-246)

**Fecha:** 2026-09-30 · **Rama:** `ui-foto-safari`, desde `origin/main` (`74fdca0d`, la reestructura ya publicada) · **OL:** OL-246 · **PR:** por abrir, contra `main` (sin unir hasta el «publica» del founder) · **Quién:** el gestor de cambios III.

## Pedido

Founder, a las 18:09, con la reestructura recién publicada y una captura de Inicio con sesión (TestFlight y Safari): «creo que estoy viendo una versión de caché en safari dentro de mi celular y en la app. se empalman textos de título en cards con la imagen, imagenes de diferentes tamaños en esas mismas cards de slider».

## Qué pasaba

No era caché. En Chromium (navegador integrado, 375×812, producción recién cargada) las tres tiras de Inicio daban todas las tarjetas iguales: mediana 220×132, grande 165×248, el título 4 px bajo la foto, aunque las imágenes originales tuvieran proporciones distintas. En Safari no: la foto del carril llevaba `height: 100%` dentro de una subrejilla doble (`.carril > li` y `.tarjeta`, los dos con `grid-template-rows: subgrid` sobre las filas del carril), y Safari resolvía ese porcentaje como `auto`: la imagen tomaba su alto natural (un cartel vertical de 1279×1600 a 220 px de ancho da 275 px) y se pintaba sobre el título. Depende de cuándo llega la imagen respecto del primer pintado: en producción, en el simulador, las dos primeras tarjetas de cada tira salían bien (por eso parecía caché), y en una página de reproducción con las mismas reglas y tres carteles verticales con `loading="lazy"` fallaban las tres. En el iPhone del founder fallaba la segunda tarjeta de «Esta semana» y la de «Nuevos eventos».

## Qué cambió

`src/components/Destacados.module.css`, siete líneas: el alto de la fila de la foto pasa a una propiedad del carril (`--foto`, la mediana por defecto; `.grande` y `.chica` la cambian en vez de repetir `grid-template-rows`), `grid-template-rows` la lee, y la foto la toma como alto explícito (`height: var(--foto)`) en lugar de `height: 100%`. `.sola` sigue con `height: auto` y 5:3. Sin medidas nuevas en duro.

## Medida

- **Safari del simulador** (iPhone SE, iOS 26.3, 375×667), página de reproducción servida desde la Mac con las reglas del carril y dos tiras iguales salvo una línea: A con `height: 100%` (producción) y B con el alto explícito; las mismas tres imágenes (carteles de Destacados de producción, `loading="lazy"`). A: las fotos a su alto natural y el título encima de la foto. B: las fotos a 132 px y el título debajo (captura 274-02).
- **Chromium, la app real con la corrección** (Chrome de la Mac, `playwright-core`): `Destacados.componentes.test.mjs` 16 de 16, con la 10 comprobando desde los tokens 220×132, 165×248 (190×285 desde 1048) y 104, y la 9 las filas compartidas; `npm run inventario`: 344 medidas en duro, las mismas; `npm run medir`: 24 pantallas × 4 anchos en 86 s, sin novedades (presupuestos de nodos y profundidad iguales).
- Lint y typecheck no tocan CSS; los corre la CI del PR.

## Capturas (`docs/rediseno/capturas-274/`)

1. **`274-01`** · el iPhone del founder, producción con sesión, antes: en «Esta semana» la primera tarjeta bien (foto 3:2, «Hoy», título debajo) y la segunda con la foto más alta y «CINEMA: Who Am I…» pintado sobre ella; lo mismo en «Nuevos eventos» («Laboratorio de exploración sonora…» sobre su cartel).
2. **`274-02`** · Safari del simulador, la página de reproducción: tira A («foto con height: 100 %») con los carteles a su alto natural y «A tarjeta 3 con título largo…» encima de la foto; tira B («foto con alto fijo») con las fotos a 132 px y los títulos debajo.
3. **`274-03`** · Safari del simulador, producción sin sesión: «Esta semana» y «Nuevos eventos» con las dos primeras tarjetas bien, que es lo que hacía pensar en caché.

## Límites

- La app compilada contra el respaldo local no pinta el contenido de Inicio en el Safari del simulador (queda en blanco bajo la cabecera; producción sí pinta ahí, y la misma compilación responde con las tiras por `curl`). No lo perseguí: la prueba «después» en Safari es la tira B de la página de reproducción, con las mismas reglas, y la de la app real es en Chromium. Queda anotado para mirarlo: los operadores sí pintaron la app local en ese Safari con un intermediario.
- Sin migraciones ni variables de entorno. El `.env.local` temporal del respaldo (sin llaves reales) y `.next` se borraron al cerrar.
