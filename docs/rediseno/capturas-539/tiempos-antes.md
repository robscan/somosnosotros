# Tiempos de carga · 2026-11-03T01:18:36.873Z

Retraso por consulta a la base: 80 ms. Corridas: 1 (mediana). Navegador: Fast 3G (562,5 ms, 180 KB/s) y CPU ×4.

## A · servidor (HTML pedido desde Node, sin navegador)

| Pantalla | Retraso | Primer byte | Llega el contenido | Fin del HTML | HTML | Trozos | Consultas | Antes del contenido | Cadena en serie hasta el contenido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Administración › Instagram | 0 ms | 27 ms | 47 ms | 47 ms | 107,1 KB | 9 | 26 | 26 | 22 |
| Administración › Instagram | 30 ms | 56 ms | 283 ms | 283 ms | 107,2 KB | 11 | 26 | 26 | 7 |
| Administración › Instagram | 80 ms | 108 ms | 649 ms | 649 ms | 107,2 KB | 11 | 26 | 26 | 7 |
| Administración › Instagram | 150 ms | 181 ms | 1,155 ms | 1,155 ms | 107,1 KB | 9 | 26 | 26 | 7 |

## B · navegador (Fast 3G, CPU ×4)

| Pantalla | Caché | Primer byte | FCP | Contenido | Completa | HTML | JS (peso · bajado) | Datos de React en el HTML | Nodos | Consultas (servidor · navegador) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Administración › Instagram | fría | 575 ms | 1,608 ms | 1,898 ms | 5,338 ms | 20,2 KB | 302,5 KB · 309,2 KB | 52,1 KB | 294 | 43 · 0 |
| Administración › Instagram | caliente | 94 ms | 168 ms | 745 ms | 768 ms | 107,2 KB | 302,5 KB · 0,3 KB | 52,1 KB | 294 | 38 · 0 |

## C · navegación dentro de la app (Fast 3G, CPU ×4)

| Viaje | Señal del toque | Espera visible | Contenido | Completa | Consultas del servidor |
| --- | --- | --- | --- | --- | --- |
| Administración → Instagram (su renglón) | 12 ms | 44 ms | 1,055 ms | 1,067 ms | 45 |
| Administración → Instagram, tocado en cuanto se ve | 9 ms | — | 1,881 ms | 1,893 ms | 44 |

## D · publicar en Instagram

Antes de tocar «Publicar»: desplazamiento 874, renglón a 420 px del borde de arriba, página de 2052 px.

| t | Hoja | Desplazamiento | Renglón (top) | A la vista | Mismo nodo | Grupo | Alto de la página | Texto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 11 ms | abierta | 874 | 420 | sí | sí | Para publicar· 11 | 2052 | Delirium Pollum, clown y pantomima con Pimpolina sáb 10 de oct · 6:00–8:00 pm Teatro de la Paz 0 van · 0 les interesa |
| 1,000 ms | — | 874 | 420 | sí | sí | Para publicar· 11 | 2052 | Delirium Pollum, clown y pantomima con Pimpolina sáb 10 de oct · 6:00–8:00 pm Teatro de la Paz 0 van · 0 les interesa |
| 1,502 ms | — | 874 | 420 | sí | sí | Para publicar· 11 | 2052 | Delirium Pollum, clown y pantomima con Pimpolina sáb 10 de oct · 6:00–8:00 pm Teatro de la Paz Publicando… |
| 13,002 ms | — | 874 | 857 | no | no | Ya en Instagram· 2 | 2075 | Delirium Pollum, clown y pantomima con Pimpolina sáb 10 de oct · 6:00–8:00 pm Teatro de la Paz Publicación · Hoy, 10:00 am Facebook: publicado |

Al milisegundo (desde el toque, en la página):

- primera señal («Publicando…» en el botón de la hoja o en el renglón): 6 ms
- la hoja se cierra: 607 ms
- el renglón dice «Publicando…»: 1,315 ms
- el renglón dice «Publicado» (o pasó a «Ya en Instagram»): 12,652 ms
- el trabajo terminó en el respaldo (publicado): 10,083 ms → «Publicado» llega 2,569 ms después
- peticiones de refresco (RSC) tras el toque: 22
- el renglón, en el mismo nodo, el mismo sitio y el mismo desplazamiento en todos los cuadros: no

Peticiones de React tras el toque:

- 12 ms → 601 ms · acción del servidor · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos
- 600 ms → — · refresco/RSC · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos&_rsc=Wbu9X0E0mYcpHIQG
- 600 ms → — · refresco/RSC · /eventos/concierto-de-la-orquesta-sinfonica-de-san-luis-potosi?_rsc=cCrRM5Z4i2HVg5Rp
- 601 ms → 1,187 ms · refresco/RSC · /eventos/cine-de-barrio-ciclo-fellini-2026-09-30?_rsc=hhM-R5ZL1u_i--xL
- 601 ms → 1,199 ms · refresco/RSC · /eventos/delirium-pollum-clown-y-pantomima-con-pimpolina?_rsc=ctRe-6AGbPZVtNSM
- 601 ms → 1,205 ms · refresco/RSC · /eventos/inauguracion-de-uno-de-uno-custom-art-toy-2026?_rsc=u0TxowTAMngwPl5f
- 1,187 ms → 1,770 ms · refresco/RSC · /eventos/reflejo-atemporal-pintura-y-grafica?_rsc=ADsDyYWJdLpwzoDu
- 1,198 ms → 1,780 ms · refresco/RSC · /eventos/macario-xantolo-camino-al-mictlan?_rsc=8H-q-RaHx-aHNU8i
- 1,205 ms → 1,787 ms · refresco/RSC · /eventos/susurros-del-inconsciente?_rsc=Us61NBTAq_-Z-jKN
- 1,273 ms → — · refresco/RSC · /eventos/taller-de-grabado-en-linoleo?_rsc=YJU-UZRkaRDQZtA9
- 1,770 ms → — · refresco/RSC · /eventos/un-mundo-para-mi?_rsc=YJU-UZRkaRDQZtA9
- 1,780 ms → 2,378 ms · refresco/RSC · /eventos/kowaifest?_rsc=YJU-UZRkaRDQZtA9
- 6,329 ms → 6,919 ms · acción del servidor · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos
- 11,329 ms → 11,922 ms · acción del servidor · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos
- 11,922 ms → — · refresco/RSC · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos&_rsc=Wbu9X0E0mYcpHIQG
- 11,922 ms → — · refresco/RSC · /eventos/concierto-de-la-orquesta-sinfonica-de-san-luis-potosi?_rsc=cCrRM5Z4i2HVg5Rp
- 11,922 ms → 12,522 ms · refresco/RSC · /eventos/cine-de-barrio-ciclo-fellini-2026-09-30?_rsc=hhM-R5ZL1u_i--xL
- 11,922 ms → 12,530 ms · refresco/RSC · /eventos/delirium-pollum-clown-y-pantomima-con-pimpolina?_rsc=ctRe-6AGbPZVtNSM
- 11,922 ms → 12,538 ms · refresco/RSC · /eventos/inauguracion-de-uno-de-uno-custom-art-toy-2026?_rsc=u0TxowTAMngwPl5f
- 12,522 ms → 13,105 ms · refresco/RSC · /eventos/reflejo-atemporal-pintura-y-grafica?_rsc=ADsDyYWJdLpwzoDu
- 12,530 ms → 13,112 ms · refresco/RSC · /eventos/macario-xantolo-camino-al-mictlan?_rsc=8H-q-RaHx-aHNU8i
- 12,538 ms → 13,119 ms · refresco/RSC · /eventos/susurros-del-inconsciente?_rsc=Us61NBTAq_-Z-jKN
- 12,602 ms → — · refresco/RSC · /eventos/taller-de-grabado-en-linoleo?_rsc=YJU-UZRkaRDQZtA9
- 13,105 ms → — · refresco/RSC · /eventos/un-mundo-para-mi?_rsc=YJU-UZRkaRDQZtA9
- 13,112 ms → — · refresco/RSC · /eventos/kowaifest?_rsc=YJU-UZRkaRDQZtA9
