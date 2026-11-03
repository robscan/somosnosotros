# Tiempos de carga · 2026-11-03T01:19:51.715Z

Retraso por consulta a la base: 80 ms. Corridas: 1 (mediana). Navegador: Fast 3G (562,5 ms, 180 KB/s) y CPU ×4.

## A · servidor (HTML pedido desde Node, sin navegador)

| Pantalla | Retraso | Primer byte | Llega el contenido | Fin del HTML | HTML | Trozos | Consultas | Antes del contenido | Cadena en serie hasta el contenido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Administración › Instagram | 0 ms | 28 ms | 48 ms | 48 ms | 108,0 KB | 9 | 26 | 26 | 18 |
| Administración › Instagram | 30 ms | 61 ms | 291 ms | 291 ms | 108,0 KB | 12 | 26 | 26 | 7 |
| Administración › Instagram | 80 ms | 105 ms | 647 ms | 647 ms | 108,0 KB | 11 | 26 | 26 | 7 |
| Administración › Instagram | 150 ms | 183 ms | 1,151 ms | 1,151 ms | 108,0 KB | 11 | 26 | 26 | 7 |

## B · navegador (Fast 3G, CPU ×4)

| Pantalla | Caché | Primer byte | FCP | Contenido | Completa | HTML | JS (peso · bajado) | Datos de React en el HTML | Nodos | Consultas (servidor · navegador) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Administración › Instagram | fría | 573 ms | 1,808 ms | 1,787 ms | 5,442 ms | 20,3 KB | 304,5 KB · 311,2 KB | 52,8 KB | 295 | 43 · 0 |
| Administración › Instagram | caliente | 96 ms | 172 ms | 747 ms | 775 ms | 108,0 KB | 304,5 KB · 0,3 KB | 52,8 KB | 295 | 38 · 0 |

## C · navegación dentro de la app (Fast 3G, CPU ×4)

| Viaje | Señal del toque | Espera visible | Contenido | Completa | Consultas del servidor |
| --- | --- | --- | --- | --- | --- |
| Administración → Instagram (su renglón) | 11 ms | 40 ms | 1,406 ms | 1,417 ms | 45 |
| Administración → Instagram, tocado en cuanto se ve | 10 ms | 1,161 ms | 1,954 ms | 1,960 ms | 45 |

## D · publicar en Instagram

Antes de tocar «Publicar»: desplazamiento 874, renglón a 420 px del borde de arriba, página de 2052 px.

| t | Hoja | Desplazamiento | Renglón (top) | A la vista | Mismo nodo | Grupo | Alto de la página | Texto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 ms | abierta | 874 | 420 | sí | sí | Para publicar· 11 | 2052 | Delirium Pollum, clown y pantomima con Pimpolina sáb 10 de oct · 6:00–8:00 pm Teatro de la Paz 0 van · 0 les interesa |
| 1,003 ms | — | 874 | 420 | sí | sí | Para publicar· 11 | 2052 | Delirium Pollum, clown y pantomima con Pimpolina sáb 10 de oct · 6:00–8:00 pm Teatro de la Paz Publicando… |
| 11,500 ms | — | 874 | 420 | sí | sí | Para publicar· 11 | 2075 | Delirium Pollum, clown y pantomima con Pimpolina sáb 10 de oct · 6:00–8:00 pm Teatro de la Paz Publicado · hace un momento Facebook: publicado |

Al milisegundo (desde el toque, en la página):

- primera señal («Publicando…» en el botón de la hoja o en el renglón): 6 ms
- la hoja se cierra: 602 ms
- el renglón dice «Publicando…»: 602 ms
- el renglón dice «Publicado» (o pasó a «Ya en Instagram»): 11,189 ms
- el trabajo terminó en el respaldo (publicado): 10,076 ms → «Publicado» llega 1,113 ms después
- peticiones de refresco (RSC) tras el toque: 0
- el renglón, en el mismo nodo, el mismo sitio y el mismo desplazamiento en todos los cuadros: sí

Peticiones de React tras el toque:

- 11 ms → 604 ms · acción del servidor · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos
- 2,606 ms → 3,185 ms · acción del servidor · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos
- 4,606 ms → 5,202 ms · acción del servidor · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos
- 6,606 ms → 7,185 ms · acción del servidor · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos
- 8,606 ms → 9,202 ms · acción del servidor · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos
- 10,606 ms → 11,191 ms · acción del servidor · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos
