# 529 · OL-497 · Auditoría de carga y rendimiento: Inicio, Administración (portada e Instagram) y el estado al publicar

**Fecha:** 2026-10-31. **Rama:** `carga-rendimiento` (desde `origin/main` `257406b1`). **Quién:** operador del Gestor de cambios VII (agente en
árbol aislado, sin subagentes, council ni workflows). **Sin cambios de código de la app, sin migración, sin variables de entorno.** **Estado:**
documento entregado; espera la revisión del gestor y las decisiones del founder.

Documento para el founder: [`docs/investigaciones/carga-y-rendimiento-2026-10-31.md`](../../../investigaciones/carga-y-rendimiento-2026-10-31.md).
Capturas del recorrido de publicar: `docs/rediseno/capturas-529/`.

## El pedido

El founder (2026-10-31): «revisa cómo está la arquitectura de carga. […] Donde lo veo más grave es en el nuevo rediseño de Administración, con
los números y el acceso a Instagram: toda esa sección toma bastante tiempo antes de mostrar algo, y no tiene carga progresiva ni skeletons. […]
En Instagram hice una publicación: tomó unos segundos, se activó un letrero pequeño debajo del objeto, pero hubo una leve recarga de la pantalla
y el scroll cayó más arriba; perdí de vista el objeto y no noté el cambio de estado; el letrero es muy pequeño. ¿Un estado cargando para todo el
contenedor del objeto, como un hover en escritorio, más el cargador de abajo? […] Cuestiona fuertemente cómo estamos haciendo la carga.»

## Método

### Tiempos de pantalla: `scripts/ops/auditoria-ui/medir-tiempos.mjs` (nuevo)

- La app compilada (`next build` + `next start`) contra el respaldo local (`respaldo-local/server.mjs`, datos inventados), con la sesión de la
  cuenta de administración del respaldo y el reloj fijo de `npm run medir` (miércoles 7 de octubre de 2026, 10:00). Nunca producción ni `.env`
  (el guion se niega a correr si hay un `.env` en el árbol).
- **Un intermediario** entre la app y el respaldo cuenta y cronometra cada petición a la base y le suma un retraso fijo a las del servidor
  (`--latencia`, 80 ms por omisión; la parte A también con 0, 30 y 150): el respaldo contesta en memoria, al instante, y en producción cada
  consulta es un viaje de Vercel a Supabase. Lo que pide el navegador no se retrasa ahí (ya lo frena la red simulada). Con `--extra=funcion:ms`
  se suma el costo medido de una función concreta.
- **A · servidor:** el HTML pedido desde Node como el iPhone: primer byte, cuándo llega el contenido (la primera aparición de una marca de cada
  pantalla en el flujo: «Esta semana en números», `aria-label="Instagram"`, el primer enlace a una ficha, `<h1`), fin, trozos, consultas y la
  **cadena en serie más larga** (cuántas consultas empiezan después de que terminó otra).
- **B · navegador:** Chrome de la Mac (playwright-core) a 390×844 como iPhone, red «Fast 3G» de Chrome (562,5 ms, 180 KB/s de bajada) y CPU ×4 por
  CDP; en frío (contexto nuevo) y en caliente (una visita completa antes, sin red lenta: la app instalada). Primer byte por CDP (con la red
  simulada, `responseStart` de la página no cuenta el retraso en Chrome 156), FCP, contenido y último cambio del DOM (con un `MutationObserver`
  instalado antes de todo; «completa» resultó ser el fin de la hidratación: los últimos cambios son el cebo del teclado y el título), peso del HTML,
  del JavaScript y de los datos de React en línea. Dos detalles que costaron una vuelta: el reloj de Playwright (`clock.setFixedTime`) también
  cambia `performance` y estropea las marcas, así que se fija solo `Date` con un guion; e interceptar peticiones (`ctx.route`) apaga la caché del
  navegador, así que lo de fuera se bloquea con `--host-resolver-rules`.
- **C · navegación dentro de la app:** de Inicio a Administración con el botón de la barra y de Administración a Instagram con su renglón (clic real
  por coordenadas), con la red lenta: cuándo sale la espera y cuándo el contenido; también tocando Instagram en cuanto se ve (sin dar tiempo al
  prefetch).
- **D · publicar:** Administración › Instagram, pestaña Eventos; se baja hasta «Delirium Pollum» (a 420 px del borde), se abre su hoja y se toca
  «Publicar» con Instagram tardando 8 s (`/__lento?ms=8000` del respaldo; la API de Instagram y la página de Facebook son las de mentira del
  respaldo, el trabajador de la cola es el de verdad, como `capturar-redes-en-cola.mjs`). Cada 500 ms: captura, desplazamiento, posición del
  renglón, si es el mismo nodo del DOM (una marca puesta antes del toque), su grupo y su texto; y cada petición de React (acciones del servidor,
  refrescos, prefetch).
- 5 corridas, mediana.

```
node scripts/ops/auditoria-ui/medir-tiempos.mjs --corridas=5 --salida=<carpeta>
SIN_BUILD=1 node scripts/ops/auditoria-ui/medir-tiempos.mjs --corridas=5 --sin-publicar --latencias=30 \
  --extra=instagram_falta_material:460,panel_resumen:10 --salida=<carpeta>
```

### Funciones de la base: `scripts/ops/auditoria-ui/banco-funciones.mjs` (nuevo)

Un Postgres 17 propio en el scratchpad (`initdb`, puerto 55497, solo 127.0.0.1; el Postgres que ya corría en la Mac es de otro chat y no se tocó),
con lo de Supabase imitado como `scripts/test-db.mjs` (copia su `fixtureSql` leyendo ese archivo) y las 129 migraciones. Se llena con datos
inventados del tamaño de producción (×1, sacado de las bitácoras: ~80 cuentas, ~700 artistas casi todos sin foto, ~250 lugares, ~1 500 eventos)
y diez veces más (×10), sin disparadores al llenar (`session_replication_role = replica`), y se cronometra cada función con el rol
`authenticated` y la sesión de la administración: mediana de 9 vueltas (3 si es lenta). Para ver por qué tardaba `instagram_falta_material`, su
plan con `auto_explain`. El guion del repo se comprobó en una base nueva (mismas cifras: 450 ms la función a ×1). El clúster se apagó al terminar.

```
node scripts/ops/auditoria-ui/banco-funciones.mjs postgres://postgres@127.0.0.1:55497/banco 1     # y 10
```

## Cifras crudas

### Corrida 1 · solo viajes (80 ms por consulta), con el recorrido de publicar
Retraso por consulta a la base: 80 ms. Corridas: 5 (mediana). Navegador: Fast 3G (562,5 ms, 180 KB/s) y CPU ×4.

#### A · servidor (HTML pedido desde Node, sin navegador)

| Pantalla | Retraso | Primer byte | Llega el contenido | Fin del HTML | HTML | Trozos | Consultas | Antes del contenido | Cadena en serie hasta el contenido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Inicio | 0 ms | 21 ms | 48 ms | 48 ms | 181,1 KB | 15 | 27 | 26 | 15 |
| Inicio | 30 ms | 52 ms | 208 ms | 238 ms | 181,2 KB | 17 | 27 | 26 | 6 |
| Inicio | 80 ms | 101 ms | 471 ms | 560 ms | 181,2 KB | 18 | 27 | 26 | 6 |
| Inicio | 150 ms | 172 ms | 827 ms | 965 ms | 181,2 KB | 17 | 27 | 26 | 6 |
| Administración (portada) | 0 ms | 18 ms | 31 ms | 34 ms | 66,4 KB | 12 | 22 | 20 | 13 |
| Administración (portada) | 30 ms | 50 ms | 196 ms | 234 ms | 66,4 KB | 14 | 22 | 20 | 5 |
| Administración (portada) | 80 ms | 102 ms | 457 ms | 546 ms | 66,4 KB | 14 | 22 | 20 | 5 |
| Administración (portada) | 150 ms | 171 ms | 806 ms | 963 ms | 66,4 KB | 14 | 22 | 20 | 5 |
| Administración › Instagram | 0 ms | 17 ms | 37 ms | 37 ms | 95,8 KB | 9 | 26 | 26 | 22 |
| Administración › Instagram | 30 ms | 50 ms | 275 ms | 276 ms | 95,9 KB | 11 | 26 | 26 | 7 |
| Administración › Instagram | 80 ms | 101 ms | 646 ms | 646 ms | 95,9 KB | 11 | 26 | 26 | 7 |
| Administración › Instagram | 150 ms | 172 ms | 1,129 ms | 1,129 ms | 95,9 KB | 11 | 26 | 26 | 7 |
| Ficha de evento | 0 ms | 19 ms | 35 ms | 37 ms | 106,5 KB | 21 | 22 | 19 | 16 |
| Ficha de evento | 30 ms | 49 ms | 312 ms | 349 ms | 106,4 KB | 18 | 22 | 19 | 8 |
| Ficha de evento | 80 ms | 103 ms | 719 ms | 810 ms | 106,4 KB | 18 | 22 | 19 | 8 |
| Ficha de evento | 150 ms | 171 ms | 1,278 ms | 1,437 ms | 106,4 KB | 18 | 22 | 19 | 8 |

#### B · navegador (Fast 3G, CPU ×4)

| Pantalla | Caché | Primer byte | FCP | Contenido | Completa | HTML | JS (peso · bajado) | Datos de React en el HTML | Nodos | Consultas (servidor · navegador) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Inicio | fría | 574 ms | 1,828 ms | 1,794 ms | 5,234 ms | 35,3 KB | 295,9 KB · 301,8 KB | 83,5 KB | 641 | 41 · 0 |
| Inicio | caliente | 579 ms | 680 ms | 949 ms | 1,063 ms | 35,0 KB | 295,9 KB · 0,0 KB | 83,5 KB | 640 | 51 · 0 |
| Administración (portada) | fría | 574 ms | 1,544 ms | 1,507 ms | 3,907 ms | 18,1 KB | 255,9 KB · 260,9 KB | 44,1 KB | 324 | 39 · 0 |
| Administración (portada) | caliente | 579 ms | 980 ms | 674 ms | 929 ms | 18,1 KB | 255,9 KB · 0,0 KB | 44,1 KB | 324 | 36 · 0 |
| Administración › Instagram | fría | 574 ms | 1,592 ms | 1,567 ms | 5,118 ms | 19,3 KB | 282,2 KB · 287,5 KB | 44,9 KB | 289 | 41 · 0 |
| Administración › Instagram | caliente | 579 ms | 968 ms | 682 ms | 958 ms | 19,3 KB | 282,2 KB · 0,0 KB | 44,9 KB | 289 | 37 · 0 |
| Ficha de evento | fría | 574 ms | 1,912 ms | 1,883 ms | 5,089 ms | 28,2 KB | 289,1 KB · 295,0 KB | 60,1 KB | 269 | 37 · 0 |
| Ficha de evento | caliente | 577 ms | 648 ms | 713 ms | 957 ms | 28,2 KB | 289,1 KB · 0,0 KB | 60,1 KB | 270 | 33 · 0 |

#### C · navegación dentro de la app (Fast 3G, CPU ×4)

| Viaje | Espera visible | Contenido | Completa | Consultas del servidor |
| --- | --- | --- | --- | --- |
| Inicio → Administración (botón de la barra) | 40 ms | 1,290 ms | 1,290 ms | 30 |
| Administración → Instagram (su renglón) | 33 ms | 1,503 ms | 1,510 ms | 43 |
| Administración → Instagram, tocado en cuanto se ve | 1,146 ms | 1,860 ms | 1,864 ms | 42 |

#### D · publicar en Instagram

Antes de tocar «Publicar»: desplazamiento 874, renglón a 420 px del borde de arriba, página de 2052 px.

| t | Hoja | Desplazamiento | Renglón (top) | A la vista | Mismo nodo | Grupo | Alto de la página | Texto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9 ms | abierta | 874 | 420 | sí | sí | Para publicar· 11 | 2052 | Delirium Pollum, clown y pantomima con Pimpolina sáb 10 de oct · 6:00–8:00 pm Teatro de la Paz 0 van · 0 les interesa |
| 1,001 ms | — | 874 | 420 | sí | sí | Para publicar· 11 | 2052 | Delirium Pollum, clown y pantomima con Pimpolina sáb 10 de oct · 6:00–8:00 pm Teatro de la Paz 0 van · 0 les interesa |
| 1,502 ms | — | 874 | 420 | sí | sí | Para publicar· 11 | 2052 | Delirium Pollum, clown y pantomima con Pimpolina sáb 10 de oct · 6:00–8:00 pm Teatro de la Paz Publicando… |
| 13,002 ms | — | 874 | 857 | no | no | Ya en Instagram· 2 | 2075 | Delirium Pollum, clown y pantomima con Pimpolina sáb 10 de oct · 6:00–8:00 pm Teatro de la Paz Publicación · Hoy, 10:00 am Facebook: publicado |

Peticiones de React tras el toque:

- 10 ms → 605 ms · acción del servidor · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos
- 605 ms → 1,313 ms · refresco/RSC · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos&_rsc=4P3649LWlU6icRlt
- 605 ms → — · refresco/RSC · /eventos/concierto-de-la-orquesta-sinfonica-de-san-luis-potosi?_rsc=cCrRM5Z4i2HVg5Rp
- 605 ms → 1,198 ms · refresco/RSC · /eventos/cine-de-barrio-ciclo-fellini-2026-09-30?_rsc=hhM-R5ZL1u_i--xL
- 605 ms → 1,207 ms · refresco/RSC · /eventos/delirium-pollum-clown-y-pantomima-con-pimpolina?_rsc=ctRe-6AGbPZVtNSM
- 605 ms → 1,215 ms · refresco/RSC · /eventos/inauguracion-de-uno-de-uno-custom-art-toy-2026?_rsc=u0TxowTAMngwPl5f
- 1,198 ms → 1,772 ms · refresco/RSC · /eventos/reflejo-atemporal-pintura-y-grafica?_rsc=ADsDyYWJdLpwzoDu
- 1,207 ms → 1,783 ms · refresco/RSC · /eventos/macario-xantolo-camino-al-mictlan?_rsc=8H-q-RaHx-aHNU8i
- 1,215 ms → 1,787 ms · refresco/RSC · /eventos/susurros-del-inconsciente?_rsc=Us61NBTAq_-Z-jKN
- 1,280 ms → — · refresco/RSC · /eventos/taller-de-grabado-en-linoleo?_rsc=YJU-UZRkaRDQZtA9
- 1,771 ms → — · refresco/RSC · /eventos/un-mundo-para-mi?_rsc=YJU-UZRkaRDQZtA9
- 1,783 ms → — · refresco/RSC · /eventos/kowaifest?_rsc=YJU-UZRkaRDQZtA9
- 6,328 ms → 6,923 ms · acción del servidor · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos
- 11,328 ms → 11,917 ms · acción del servidor · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos
- 11,916 ms → — · refresco/RSC · /admin/instagram?ciudad=san-luis-potosi&pestana=eventos&_rsc=4P3649LWlU6icRlt
- 11,917 ms → — · refresco/RSC · /eventos/concierto-de-la-orquesta-sinfonica-de-san-luis-potosi?_rsc=cCrRM5Z4i2HVg5Rp
- 11,917 ms → 12,514 ms · refresco/RSC · /eventos/cine-de-barrio-ciclo-fellini-2026-09-30?_rsc=hhM-R5ZL1u_i--xL
- 11,917 ms → 12,524 ms · refresco/RSC · /eventos/delirium-pollum-clown-y-pantomima-con-pimpolina?_rsc=ctRe-6AGbPZVtNSM
- 11,917 ms → 12,530 ms · refresco/RSC · /eventos/inauguracion-de-uno-de-uno-custom-art-toy-2026?_rsc=u0TxowTAMngwPl5f
- 12,514 ms → 13,096 ms · refresco/RSC · /eventos/reflejo-atemporal-pintura-y-grafica?_rsc=ADsDyYWJdLpwzoDu
- 12,524 ms → 13,107 ms · refresco/RSC · /eventos/macario-xantolo-camino-al-mictlan?_rsc=8H-q-RaHx-aHNU8i
- 12,530 ms → 13,113 ms · refresco/RSC · /eventos/susurros-del-inconsciente?_rsc=Us61NBTAq_-Z-jKN
- 12,598 ms → — · refresco/RSC · /eventos/taller-de-grabado-en-linoleo?_rsc=YJU-UZRkaRDQZtA9
- 13,096 ms → — · refresco/RSC · /eventos/un-mundo-para-mi?_rsc=YJU-UZRkaRDQZtA9
- 13,107 ms → — · refresco/RSC · /eventos/kowaifest?_rsc=YJU-UZRkaRDQZtA9

### Corrida 2 · con el costo medido de `instagram_falta_material` (460 ms) y `panel_resumen` (10 ms)
Retraso por consulta a la base: 80 ms (y de más: instagram_falta_material 460 ms, panel_resumen 10 ms). Corridas: 5 (mediana). Navegador: Fast 3G (562,5 ms, 180 KB/s) y CPU ×4.

#### A · servidor (HTML pedido desde Node, sin navegador)

| Pantalla | Retraso | Primer byte | Llega el contenido | Fin del HTML | HTML | Trozos | Consultas | Antes del contenido | Cadena en serie hasta el contenido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Inicio | 0 ms | 21 ms | 46 ms | 47 ms | 181,2 KB | 17 | 27 | 26 | 16 |
| Inicio | 30 ms | 49 ms | 212 ms | 241 ms | 181,2 KB | 17 | 27 | 26 | 6 |
| Inicio | 80 ms | 100 ms | 475 ms | 557 ms | 181,2 KB | 17 | 27 | 26 | 6 |
| Administración (portada) | 0 ms | 19 ms | 499 ms | 503 ms | 66,4 KB | 12 | 22 | 20 | 12 |
| Administración (portada) | 30 ms | 52 ms | 660 ms | 700 ms | 66,4 KB | 14 | 22 | 20 | 5 |
| Administración (portada) | 80 ms | 102 ms | 917 ms | 1,008 ms | 66,4 KB | 14 | 22 | 20 | 5 |
| Administración › Instagram | 0 ms | 19 ms | 507 ms | 507 ms | 95,8 KB | 9 | 26 | 26 | 19 |
| Administración › Instagram | 30 ms | 53 ms | 736 ms | 736 ms | 95,9 KB | 11 | 26 | 26 | 7 |
| Administración › Instagram | 80 ms | 102 ms | 1,096 ms | 1,097 ms | 95,9 KB | 11 | 26 | 26 | 7 |
| Ficha de evento | 0 ms | 20 ms | 34 ms | 37 ms | 106,5 KB | 20 | 22 | 19 | 17 |
| Ficha de evento | 30 ms | 50 ms | 309 ms | 345 ms | 106,4 KB | 18 | 22 | 19 | 8 |
| Ficha de evento | 80 ms | 102 ms | 718 ms | 803 ms | 106,4 KB | 19 | 22 | 19 | 8 |

#### B · navegador (Fast 3G, CPU ×4)

| Pantalla | Caché | Primer byte | FCP | Contenido | Completa | HTML | JS (peso · bajado) | Datos de React en el HTML | Nodos | Consultas (servidor · navegador) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Inicio | fría | 574 ms | 1,828 ms | 1,783 ms | 5,147 ms | 35,3 KB | 295,9 KB · 301,8 KB | 83,5 KB | 641 | 40 · 0 |
| Inicio | caliente | 579 ms | 672 ms | 950 ms | 1,067 ms | 35,3 KB | 295,9 KB · 0,0 KB | 83,5 KB | 641 | 51 · 0 |
| Administración (portada) | fría | 574 ms | 1,604 ms | 1,582 ms | 3,915 ms | 18,1 KB | 255,9 KB · 260,9 KB | 44,1 KB | 324 | 39 · 0 |
| Administración (portada) | caliente | 578 ms | 1,264 ms | 911 ms | 1,221 ms | 18,1 KB | 255,9 KB · 0,0 KB | 44,1 KB | 324 | 36 · 0 |
| Administración › Instagram | fría | 574 ms | 1,812 ms | 1,791 ms | 5,171 ms | 19,3 KB | 282,2 KB · 287,5 KB | 44,9 KB | 289 | 41 · 0 |
| Administración › Instagram | caliente | 580 ms | 1,260 ms | 1,083 ms | 1,247 ms | 19,3 KB | 282,2 KB · 0,0 KB | 44,9 KB | 289 | 37 · 0 |
| Ficha de evento | fría | 575 ms | 1,916 ms | 1,885 ms | 5,088 ms | 28,2 KB | 289,1 KB · 295,0 KB | 60,1 KB | 269 | 37 · 0 |
| Ficha de evento | caliente | 580 ms | 640 ms | 715 ms | 959 ms | 28,2 KB | 289,1 KB · 0,0 KB | 60,1 KB | 270 | 33 · 0 |

#### C · navegación dentro de la app (Fast 3G, CPU ×4)

| Viaje | Espera visible | Contenido | Completa | Consultas del servidor |
| --- | --- | --- | --- | --- |
| Inicio → Administración (botón de la barra) | 40 ms | 1,537 ms | 1,537 ms | 30 |
| Administración → Instagram (su renglón) | 36 ms | 1,960 ms | 1,964 ms | 43 |
| Administración → Instagram, tocado en cuanto se ve | 1,147 ms | 2,494 ms | 2,495 ms | 42 |

### Banco de la base (mediana)

×1: 80 perfiles, 250 lugares, 700 artistas, 1500 eventos, 1200 eventos_artistas, 480 asistencias, 80 cuentas_vistas. ×10: 800 perfiles, 2500 lugares, 7000 artistas, 15000 eventos, 12000 eventos_artistas, 4800 asistencias, 800 cuentas_vistas.

| Lectura | ×1 | ×10 |
| --- | --- | --- |
| mi_perfil (cada pantalla, dos veces) | 0,1 ms | 0,1 ms |
| panel_resumen (portada: números) | 10,4 ms | 62,9 ms |
| panel_pendientes (portada: Pendiente) | 0,5 ms | 0,6 ms |
| panel_aportes (portada: Voy y Me interesa) | 3,9 ms | 24,4 ms |
| panel_ciudades (portada: Ciudades y Rutinas) | 0,7 ms | 0,7 ms |
| instagram_falta_material (portada: «N sin material») | 457,4 ms | 45 657,0 ms |
| instagram_sugerencias 7 días (Instagram: Eventos) | 2,4 ms | 21,2 ms |
| instagram_sugerencias 14 días (Instagram: Semana) | 4,0 ms | 33,1 ms |
| panel_comunidad (hoja «Todos los números») | 0,6 ms | 2,1 ms |
| contar publicadas 7 días (portada: Instagram) | 0,2 ms | 0,2 ms |
| Inicio: eventos por venir de la ciudad (referencia) | 1,0 ms | 1,4 ms |

El plan de `instagram_falta_material` (×1, `auto_explain`): 935 fichas sin material; por cada una, `Index Scan using eventos_inicio_idx on
eventos` con 1 371 filas descartadas (el límite de fecha convierte la hora con la zona de cada evento y no acota el índice; el «¿está el artista en
este evento?» va dentro del filtro): 0,49 ms × 935 = 457 ms. Por partes: `ciudad_slug()` por fila, 17 ms para 700 artistas (comparar el nombre,
0,2 ms); la búsqueda de la próxima fecha unida por `eventos_artistas`, 1,5 ms para las 700.

### Consultas del servidor por pantalla (corrida 1, caliente, una carga con sus prefetch)

- Inicio: 21 «auth user» (el proxy de cada prefetch, ver abajo), `mi_perfil` ×2, `eventos` ×6, y una de cada una de las demás.
- Administración: `mi_perfil` ×2, las de la campana y del botón de Administración (reportes, seguimientos, asistencias, novedades, pedidos de
  material), las de la portada y 16 «auth user».
- Instagram: `instagram_sugerencias` ×4, `instagram_candidatos` ×4, `ciudades` ×2, `instagram_falta_material` ×1, 12 «auth user».
- Publicar (de 0 a 16 s): 122 consultas; 45–48 en cada refresco de la pantalla.

«auth user»: el respaldo firma la sesión con una llave de las antiguas (HS256), así que `getClaims()` va a Auth en cada petición, también en cada
prefetch. En producción depende de la llave en uso (documento, § 6); las cadenas de la tabla A cuentan esos dos viajes iniciales (proxy y página).

## Lo que se vio y no se esperaba

- **El desplazamiento no se mueve al publicar** (874 px de principio a fin): el «scroll cayó más arriba» del founder es el renglón que cambia de
  grupo y se va de debajo del dedo (`05-publicado-13s-el-renglon-se-fue.jpg`), no un salto del desplazamiento.
- **Tras cada refresco, Next vuelve a adelantar las 10 fichas de la lista** (`router.refresh()` borra la memoria del teléfono): 20 peticiones de
  React de más por publicación.
- **Sin el costo de la función, Administración cuesta lo mismo que Inicio** en el servidor (457 contra 471 ms): la construcción en un solo
  `Promise.all` no es lo que más pesa hoy; la función sí. Pero el `Promise.all` es lo que hace que la función frene la pantalla entera.
- **Instagram tocado en cuanto se ve: 1,1 s sin ninguna señal.** Esperando 1,5 s a que el prefetch llegue, el esqueleto sale a los 36 ms.

## Capturas (`docs/rediseno/capturas-529/`, 390×844 a 1×, Fast 3G ×4)

- `01-toque-publicar-0s.jpg`: la hoja al tocar «Publicar»: el botón dice «Publicando…» y se apaga.
- `02-hoja-cerrada-sin-senal-1s.jpg`: la hoja ya se cerró; el renglón de Delirium Pollum sigue diciendo «0 van · 0 les interesa»: nada dice que
  se está publicando.
- `03-publicando-1-5s.jpg`: llegó el refresco: «Publicando…» con su anillo, en la tercera línea del renglón, del tamaño de las demás.
- `04-publicando-12-5s.jpg`: igual a los 12,5 s (el trabajo terminó antes; la lista se entera en la pregunta de los 11,3 s).
- `05-publicado-13s-el-renglon-se-fue.jpg`: a los 13 s el renglón ya no está; en su sitio, «Inauguración de Uno de Uno»; Delirium Pollum está en
  «Ya en Instagram», fuera de la pantalla.

## Archivos

- `docs/investigaciones/carga-y-rendimiento-2026-10-31.md` (nuevo): el documento.
- `scripts/ops/auditoria-ui/medir-tiempos.mjs` (nuevo): partes A–D.
- `scripts/ops/auditoria-ui/banco-funciones.mjs` (nuevo): el banco de la base.
- `docs/rediseno/capturas-529/` (nuevo): cinco capturas.
- `docs/ops/OPEN_LOOPS.md`: OL-497 en «Ahora» y «Last updated».

Sin cambios en `src/`, `supabase/` ni en la CI. `npx eslint` de los dos guiones nuevos, sin avisos. No corrí `npm test` ni `npm run medir`: no se
tocó nada de lo que miden.

## Preguntas al founder

1. Al terminar de publicar, ¿la tarjeta se queda en su sitio con «Publicado · Ver» hasta que vuelvas a abrir la pantalla (la propuesta), o
   prefieres que baje a «Ya en Instagram» acompañada de una animación (se vuelve a ir de la vista)?
2. ¿Empezamos por la pieza (a) sola (la función, una migración, 2–3 h), que es la que más tiempo quita, y la pruebas en tu iPhone antes de seguir
   con (b) y (c)?
3. En la portada, el renglón de Instagram dice «N sin material». ¿Lo necesitas ahí, o basta con que lo diga la pantalla de Instagram? Sin él, la
   portada no espera ninguna lectura cara de Instagram (el último trabajo, para el pendiente rojo, es una lectura chica).
