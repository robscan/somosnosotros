# Carga y rendimiento: Inicio, Administración (portada e Instagram) y el estado al publicar

**Fecha:** 2026-10-31. **OL-497**, bitácora [529](../bitacora/2026/10/529-carga-y-rendimiento.md). **Qué es:** una auditoría con mediciones en
local, sin cambios de código de la app. **Para quién:** el founder y el gestor. Las cifras crudas, el método y los guiones están en la bitácora;
aquí van las conclusiones y el plan.

> Palabras que se repiten (cada una en una línea):
> - **Consulta**: cada pregunta que el servidor le hace a la base de datos (Supabase). Cada una es un viaje de ida y vuelta.
> - **Cadena en serie**: consultas que van una detrás de otra porque la segunda necesita la respuesta de la primera. Lo que tarda una pantalla
>   es, sobre todo, cuántos eslabones tiene esa cadena, no cuántas consultas hay en total.
> - **Primer byte**: cuándo llega al teléfono el primer pedazo de la página.
> - **FCP** (primer pintado con contenido): el primer momento en que la pantalla deja de estar en blanco.
> - **Contenido**: cuándo aparece lo primero de verdad de la pantalla (no su esqueleto gris).
> - **Hidratada**: cuándo los botones ya responden (el JavaScript terminó de engancharse a lo que se ve).
> - **Esqueleto**: la forma gris de la pantalla mientras llegan los datos.
> - **Streaming / `Suspense`**: mandar la pantalla por partes, cada una en cuanto está lista, en vez de esperar a la más lenta.
> - **`Promise.all`**: «espera a que terminen todas estas lecturas»; la pantalla no sale hasta que acaba la más lenta.
> - **Refresco (`router.refresh`)**: pedirle al servidor la pantalla entera otra vez y ponerla encima de la que se ve.
> - **Prefetch**: lo que Next adelanta en segundo plano al ver un enlace, para que tocarlo sea instantáneo.
> - **Fast 3G y CPU ×4**: la red y el procesador simulados de un teléfono normal (562 ms de ida y vuelta, 180 KB/s; el procesador 4 veces más lento).

## 1. Resumen en diez líneas

1. **El culpable principal no es cómo se construyó la pantalla, es una sola función de la base:** `instagram_falta_material`, que la portada
   llama solo para escribir «N sin material» en el renglón de Instagram, tarda **457 ms** con el tamaño de hoy (en un Postgres de la Mac; en el
   servidor de Supabase, probablemente más) y **45,7 s** con diez veces más fichas. Crece al cuadrado: revisa cada evento por cada ficha.
2. Con ese costo, Administración tarda en el servidor **917 ms** hasta tener algo que mandar, contra **475 ms** de Inicio. Sin él, las dos
   pantallas cuestan lo mismo (457 y 471 ms). Eso explica que el founder la sienta más lenta que Inicio.
3. Administración no tiene carga progresiva: un solo esqueleto de siete barras y luego **todo a la vez**, cuando termina la lectura más lenta de
   un `Promise.all` de seis (más un séptimo, el renglón de Showcase, que espera a todos).
4. Administración › Instagram es peor: calcula **las dos pestañas** en el servidor aunque se vea una, llama `instagram_sugerencias` hasta 4 veces
   y la misma función lenta otra vez, y su cadena tiene 7 eslabones. Sin streaming dentro: la pantalla sale entera o no sale.
5. Dentro de la app, del toque al contenido: **1,5 s** a Administración y **2,0 s** a Instagram con red de teléfono. Si se toca Instagram en cuanto
   aparece su renglón, **1,1 s sin ninguna señal** de que el toque sirvió (no hay esqueleto todavía) y 2,5 s hasta el contenido.
6. Publicar: el renglón **no se mueve de sitio mientras publica**, pero al terminar **salta** de «Para publicar» a «Ya en Instagram» (437 px más
   abajo, fuera de la pantalla) y React lo vuelve a crear. El desplazamiento no cambia: lo que cambia es la lista debajo del dedo.
7. Entre que se cierra la hoja y aparece «Publicando…» pasan **0,5 s sin señal** (lo que tarda en volver la pantalla entera), y «Publicado» llega
   hasta **5 s tarde** porque se pregunta cada 5 s. Cada cambio de estado recarga la pantalla entera: **45 consultas** y **10 prefetch** de fichas.
8. Lo que el founder propone (estado de carga en toda la tarjeta) mejora que se note, pero no quita el salto ni la recarga. La propuesta: la
   tarjeta se queda en su sitio y cambia ella sola, sin recargar la lista.
9. Inicio está razonablemente bien en la app instalada: pinta a los **0,67 s** y tiene contenido a los **0,95 s**. Lo que le queda es poco.
10. Plan en cinco piezas; la primera (arreglar la función, una migración) quita más tiempo que todas las demás juntas y cuesta 2–3 horas.

## 2. Cómo se carga hoy

### 2.1 Cómo se midió (en una línea)

La app compilada (`next build` + `next start`) contra el respaldo local de datos inventados, con un intermediario que cuenta cada consulta y le
suma **80 ms** (el viaje de Vercel a Supabase más lo que tarda la consulta, que el respaldo no tiene); el Chrome de la Mac como iPhone a 390×844
con Fast 3G y CPU ×4; 5 corridas y la mediana. Aparte, las funciones de la base en un Postgres propio con datos del tamaño de producción (×1) y
diez veces más (×10). Detalle en la bitácora 529.

Dos versiones de cada cifra: **«viajes»** (solo los 80 ms por consulta, como si la base contestara al instante) y **«con la función»** (además, los
460 ms que se midieron para `instagram_falta_material`). La segunda es la que se parece a producción.

### 2.2 En la app instalada (la que usa el founder)

| Del toque a… | Viajes | Con la función |
| --- | --- | --- |
| Inicio → Administración (botón de la barra): esqueleto | 40 ms | 40 ms |
| Inicio → Administración: contenido | 1 290 ms | **1 537 ms** |
| Administración → Instagram (esperando a que el renglón se vea 1,5 s): esqueleto | 33 ms | 36 ms |
| Administración → Instagram: contenido | 1 503 ms | **1 960 ms** |
| Administración → Instagram tocado en cuanto se ve: **sin señal** | 1 146 ms | 1 147 ms |
| Administración → Instagram tocado en cuanto se ve: contenido | 1 860 ms | **2 494 ms** |

### 2.3 Abriendo la pantalla (Fast 3G, CPU ×4)

«Caliente» = el JavaScript ya está en el teléfono (la app instalada); «fría» = primera visita.

| Pantalla | Caché | Primer byte | FCP | Contenido | Hidratada | JS | Datos de React en el HTML |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Inicio | caliente | 579 ms | **672 ms** | 950 ms | 1 067 ms | 296 KB (de la caché) | 83,5 KB |
| Inicio | fría | 574 ms | 1 828 ms | 1 783 ms | 5 147 ms | 296 KB | 83,5 KB |
| Administración | caliente | 578 ms | **1 264 ms** | 911 ms | 1 221 ms | 256 KB (de la caché) | 44,1 KB |
| Administración | fría | 574 ms | 1 604 ms | 1 582 ms | 3 915 ms | 256 KB | 44,1 KB |
| Instagram | caliente | 580 ms | **1 260 ms** | 1 083 ms | 1 247 ms | 282 KB (de la caché) | 44,9 KB |
| Instagram | fría | 574 ms | 1 812 ms | 1 791 ms | 5 171 ms | 282 KB | 44,9 KB |
| Ficha de evento | caliente | 580 ms | **640 ms** | 715 ms | 959 ms | 289 KB (de la caché) | 60,1 KB |
| Ficha de evento | fría | 575 ms | 1 916 ms | 1 885 ms | 5 088 ms | 289 KB | 60,1 KB |

(Con la función; sin ella, Administración caliente pinta a los 980 ms e Instagram a los 968 ms. En la primera visita, el pintado lo frena bajar
el HTML y la hoja de estilos por 3G, y la hidratación, bajar ~280 KB de JavaScript: es igual en todas las pantallas.)

### 2.4 En el servidor (sin teléfono): cuándo tiene listo el contenido

| Pantalla | Consultas | Cadena en serie | Contenido listo, viajes de 30 ms | de 80 ms | de 150 ms | de 80 ms con la función |
| --- | --- | --- | --- | --- | --- | --- |
| Inicio | 27 | 6 | 208 ms | 471 ms | 827 ms | 475 ms |
| Administración | 22 | 5 (+ Showcase) | 196 ms | 457 ms | 806 ms | **917 ms** |
| Instagram | 26 | 7 | 275 ms | 646 ms | 1 129 ms | **1 096 ms** |
| Ficha de evento | 22 | 8 | 312 ms | 719 ms | 1 278 ms | 718 ms |

Lo que tarda crece con el largo de la cadena: con viajes de 150 ms (si Supabase y Vercel están en regiones distintas) todo pasa de 0,8 s.

### 2.5 Qué espera a qué

**Administración** (`src/app/admin/page.tsx`), con viajes de 80 ms y la función medida:

```
toque
 └─ proxy: revisa la sesión ............................ 1 viaje
    └─ página: usuarioActual (mi_perfil) ............... 1 viaje   (la barra pide el mismo mi_perfil otra vez, en paralelo)
       └─ Promise.all, la pantalla espera a TODAS ...... 1 viaje, salvo:
          ├─ panel_resumen + panel_pendientes
          ├─ panel_aportes
          ├─ panel_ciudades (baja hasta 300 corridas para contar dos cosas)
          ├─ showcase_evidencias (por páginas, para contar)
          ├─ configuracion (el interruptor de rutinas)
          └─ Instagram: publicadas · último trabajo · conexión · zona de la ciudad
                                                     └─ instagram_falta_material ... 460 ms  ◄── el 50 % del tiempo
       └─ RenglonShowcase: dos conteos más ............. 1 viaje (empieza cuando todo lo anterior acabó)
 → la pantalla entera sale de una vez (917 ms en el servidor)
```

Mientras tanto se ve `admin/loading.tsx`: siete barras grises, sin títulos. No hay ningún `Suspense` dentro de la página.

**Administración › Instagram** (`src/app/admin/instagram/page.tsx`): calcula las dos pestañas aunque se vea una.

```
proxy (sesión) ─► usuarioActual ─► ciudadDeLaPantalla (ciudad_de_persona si no hay ciudad en la dirección ni en la galleta)
 └─ Promise.all:
    ├─ Eventos: instagram_sugerencias (7 días) ─► fichas de festivales · facebook · trabajos de la cola
    ├─ ciudades (dos veces: la hoja y los nombres)
    ├─ conexión
    └─ Semana: zona ─► días guardados ─► (si faltan días) instagram_candidatos ×2 + instagram_sugerencias (14) ─► guardar ─► días otra vez
                 ─► Promise.all: decir los días · instagram_sugerencias (14) + candidatos ×2 · instagram_falta_material (460 ms)
 → la pantalla entera sale de una vez (1 096 ms en el servidor)
```

**Inicio** (`src/app/page.tsx`): ya está bien hecho. Espera solo la ciudad y la sesión (2 viajes) y manda el armazón con los esqueletos de cada
carril; cada carril llega por su cuenta. El primer carril con contenido sale a los 471 ms; el último, a los 560 ms.

### 2.6 Publicar en Instagram, cuadro a cuadro

Administración › Instagram, pestaña Eventos, la persona bajó hasta «Delirium Pollum» (a 420 px del borde de arriba), abre su hoja y toca
«Publicar»; Instagram tarda 8 s. Capturas cada 500 ms en `docs/rediseno/capturas-529/`.

| Tiempo | Qué se ve | Desplazamiento | El renglón | Por qué |
| --- | --- | --- | --- | --- |
| 0 s | La hoja: «Publicando…» en el botón | 874 | a 420 px | la acción del servidor guarda el trabajo (600 ms) |
| 1,0 s | La hoja se cerró; **el renglón no dice nada** | 874 | a 420 px | `router.refresh()`: la pantalla entera va y viene |
| 1,5 s | «Publicando…» con su anillo, una línea de 14 px | 874 | a 420 px | llegó la pantalla nueva (45 consultas, 10 prefetch de fichas) |
| 6,3 s y 11,3 s | igual | 874 | igual | `useAlDia` pregunta cada 5 s por el trabajo |
| 13,0 s | **El renglón ya no está.** En su sitio, el siguiente evento | 874 | a 857 px, fuera de la pantalla, en «Ya en Instagram» | segundo refresco entero; el renglón cambia de grupo y React lo crea de nuevo |

El desplazamiento no se movió ni un píxel (874 de principio a fin). Lo que vio el founder como «el scroll cayó más arriba» es que **el renglón
se fue de debajo de su dedo** y todo lo de abajo subió un renglón.

### 2.7 El lado del teléfono

- **Componentes de cliente en la portada:** tres (`Pendientes`, `Indicadores`, `TodosLosNumeros`; `Reintentar` solo si algo falla). La hoja
  «Todos los números» ya se pide al abrirla, no al entrar: eso está bien.
- **Datos que viajan dentro del HTML** (lo que React necesita para engancharse): 44 KB en Administración, 45 KB en Instagram, 84 KB en Inicio.
  No hay datos que bajen sin verse en la portada; en Instagram baja la pestaña que no se ve (la semana o la lista).
- **Volver con Atrás repone el desplazamiento:** sí, `MemoriaScroll` (global) lo hace por dirección; la pestaña Semana además usa
  `useMemoriaPantalla`. Un refresco no toca el desplazamiento (medido).
- **La memoria de 60 s del teléfono** (`staleTimes.dynamic`, `next.config.ts:37`): volver a Administración antes de un minuto es instantáneo, pero
  cualquier `router.refresh()` la borra entera.

## 3. Qué está mal y por qué

Ordenados por lo que cuestan a la persona.

**H1 · `instagram_falta_material` revisa cada evento por cada ficha.** `supabase/migrations/20261029240000_instagram_material.sql:240-252`. Para
cada artista o lugar sin foto (hoy ~900 de ~950: el Catálogo CAPO casi no tiene fotos) busca su próxima fecha recorriendo **todos** los eventos
por fecha, y en cada uno convierte la hora con la zona de ese evento (así no puede usar el índice) y pregunta si el artista está en él. En el
banco: 935 fichas × 1 371 eventos descartados cada vez = 1,3 millones de comprobaciones. **457 ms con el tamaño de hoy; 45 657 ms con diez veces
más** (crece al cuadrado). Además `ciudad_slug()` se calcula por fila (17 ms para 700 artistas, contra 0,2 ms comparando el nombre). La portada
solo usa cuántas son (`src/app/admin/portada.ts:38`, `.length`), pero baja la lista entera. La llaman la portada, la pestaña Semana
(`semana.ts:216`, `leerFalta`) y cada refresco de Instagram. **Costo medido: +460 ms en Administración y en Instagram; +460 ms en cada cambio de
estado al publicar.** Causa: escrita para la hoja «Falta material» (donde se necesita la lista) y reutilizada para un número.

**H2 · Administración espera a la lectura más lenta antes de pintar nada.** `src/app/admin/page.tsx:72-79` (`Promise.all` de seis) y
`page.tsx:110` (`RenglonShowcase`, que lee aparte y empieza cuando acaban los seis). Ningún `Suspense`: Pendiente, que es lo único urgente, espera
a la función de H1, que solo alimenta una línea gris del renglón de Instagram. Los grupos Gestionar y Herramientas son casi fijos y también
esperan. `admin/loading.tsx` son siete barras sin forma de la pantalla real. **Costo: lo de H1 entero, más la cadena (5 eslabones + Showcase).**

**H3 · La cadena de Instagram es larga y calcula las dos pestañas.** `src/app/admin/instagram/page.tsx:47-59`: la semana se arma
(`semana.ts:201-216`: zona → días → llenar → días otra vez → tres lecturas más) aunque se esté viendo Eventos, y Eventos se lee aunque se vea la
Semana. `instagram_sugerencias` se pide hasta 4 veces por carga (`datos.ts:96`, `semana.ts:182`, `semana.ts:270`) e `instagram_candidatos` hasta
4. `ciudadDeLaPantalla` (`page.tsx:104-111`) añade un eslabón antes de todo cuando no hay ciudad en la dirección. Además **la pantalla escribe al
leerse** (`instagram_semana_guardar`, si a la semana le faltan días): una lectura no debería guardar. **Costo: 7 eslabones; 1 096 ms en el
servidor con la función.** (En producción, con la semana ya armada, `llenar` no corre y bajan a 2 las `instagram_sugerencias`; en el respaldo
corre siempre porque no guarda.)

**H4 · Publicar recarga la pantalla entera dos veces y mueve el renglón.** `src/components/instagram/HojaInstagram.tsx:181-184` (`onPublicado` →
`router.refresh()` en `ListaInstagram.tsx:143`) y `src/components/instagram/useAlDia.ts:30-34` (al cambiar el trabajo, otro `router.refresh()`).
Cada refresco vuelve a correr la página entera de H3 (45 consultas, la función de H1 incluida) y Next vuelve a adelantar las 10 fichas de la lista
(cada una pasa por el proxy y el layout). El renglón cambia de grupo (`src/app/admin/instagram/datos.ts:149-150`: «Para publicar» por señal, «Ya
en Instagram» por fecha) y React lo vuelve a crear en otro sitio. **Costo: 0,5 s sin señal tras cerrar la hoja; «Publicado» hasta 5 s tarde
(`REFRESCO_MS`, `src/lib/redes/reglas.ts:21`); el objeto desaparece de la vista al terminar.** Causa: el estado del renglón no vive en el
teléfono; todo cambio se pide al servidor como pantalla nueva.

**H5 · El letrero de estado es una línea más del renglón.** `ListaInstagram.tsx:99`: «Publicando…» (`ui/Girando`) es la tercera línea gris, del
mismo tamaño que «0 van · 0 les interesa». El founder tiene razón: no se nota. Pero arreglar solo esto no quita H4.

**H6 · El tap sin respuesta.** Si se toca Instagram antes de que Next haya adelantado su esqueleto (el renglón está abajo, en Difusión, y el
prefetch empieza al verse), pasan **1,1 s sin ningún cambio** en pantalla. No es un error de la pantalla, es cómo funciona el prefetch de las rutas
dinámicas; la cura es que el renglón mismo responda al toque (estado de presionado) y que la ruta pinte antes.

**H7 · Lo que se repite en cada pantalla y en cada refresco (chico, pero suma).**
- `mi_perfil` se pide **dos veces** por pantalla: la página usa `usuarioActual` (`src/lib/supabase/servidor.ts:71`) y la barra su copia con
  `cache` (`src/components/usuarioDeLaBarra.ts`). En paralelo, no alarga la cadena; es carga de más.
- La campana (`src/components/Sesion.tsx:18`) calcula **todas** las novedades (cuatro lecturas y dos más) para pintar un punto, en cada pantalla,
  cada refresco y cada prefetch.
- El proxy (`src/proxy.ts:46`) revisa la sesión en cada petición, también en cada prefetch. En el respaldo eso es un viaje a Auth cada vez (la
  llave de prueba es de las antiguas); en producción depende de la llave de Supabase (ver § 6).

**H8 · `panel_resumen` recalcula y escribe en cada visita.** `supabase/migrations/20261029270000_panel_comparado.sql`: ~20 conteos y
`indicadores_ahora()` con `rol_en()` por fila, más un `insert` en `indicadores_diarios`. Hoy **10 ms** (63 ms ×10): no es un problema todavía. Lo
anoto porque es el segundo que más crece.

**Lo que está bien (para no tocarlo):** Inicio con streaming por carril y su esqueleto (OL-455); la hoja «Todos los números» que se pide al abrirla
(OL-494); `panel_pendientes`, `panel_ciudades`, `panel_aportes` e `instagram_sugerencias` cuestan menos de 5 ms; la memoria de desplazamiento al
volver; la acción «Publicar» responde rápido (600 ms con la red del teléfono) y no usa `revalidatePath` (`acciones.ts:177`).

## 4. Lo que el founder propone, cuestionado

> «¿Un estado cargando para todo el contenedor del objeto, como un hover en escritorio, más el cargador de abajo?»

**Qué resuelve:** que el cambio se note. Hoy el estado es una línea de 14 px en gris violeta; un cambio en toda la tarjeta se ve de reojo.

**Qué no resuelve:**
1. **El salto.** Al terminar, la tarjeta sigue cambiando de grupo y desaparece de la vista (H4). Una tarjeta muy visible que luego se va es peor:
   llama la atención y luego la pierde.
2. **La recarga.** Seguirían los dos refrescos enteros (0,5 s sin señal tras cerrar la hoja; 45 consultas cada uno) y la espera de hasta 5 s.
3. **El teléfono no tiene hover.** «Como un hover» sirve de referencia visual (el fondo que cambia), pero en el iPhone no hay puntero: tiene que ser
   un estado de la tarjeta, no una reacción al cursor.
4. **Un velo sobre la tarjeta tapa lo que dice:** si se cubre todo con un gris, no se lee qué evento se está publicando.

**La alternativa, con el canon de la app** («el objeto se queda en su sitio y cambia él solo», «filtrar no es navegar», memoria de pantalla):

- **Al tocar «Publicar», la tarjeta cambia en el teléfono en el mismo instante**, sin esperar al servidor: fondo de la tarjeta entera en el violeta
  de lo que pide atención, muy suave; el anillo (`ui/Girando`) **sobre la miniatura** (donde mira el ojo), y la línea de estado en negritas
  «Publicando en Instagram…». Sin velo: el título se sigue leyendo.
- **La tarjeta no se mueve de grupo mientras la pantalla está abierta.** Al terminar se queda donde está y cambia ella sola: «Publicado · Ver» con
  una palomita, el fondo vuelve a blanco con una transición corta. Pasa a «Ya en Instagram» la próxima vez que se abra la pantalla (o con una
  animación que la acompañe hasta allá, si el founder la prefiere: es más trabajo y vuelve a sacarla de la vista).
- **Un aviso abajo** (`components/Hecho.tsx`, el que ya usa la app) cuando termina, también si la persona ya bajó o cambió de pestaña: «Se publicó Delirium
  Pollum · Ver». Ese es «el cargador de abajo» de la propuesta, pero al terminar, no mientras.
- **Sin recargar la pantalla:** el teléfono pregunta por **ese** trabajo (`estadosTrabajos`, que ya existe y es una consulta chica) y actualiza solo
  esa tarjeta. Cada 2 s en vez de 5 mientras haya algo en camino (es una consulta de un renglón). Nada de `router.refresh()`.
- Lo mismo en la pestaña Semana: el día que se publica cambia en su renglón (allí ya no salta, porque los días no cambian de sitio, pero se
  recarga entera igual).

## 5. Plan por piezas

Ordenado por lo que más tiempo le quita a la persona y menos cuesta. Cada pieza en su rama, con su medición antes y después con
`scripts/ops/auditoria-ui/medir-tiempos.mjs` (y `banco-funciones.mjs` cuando toca la base).

| # | Pieza | Qué cambia | Archivos | Qué mide que mejoró | Horas |
| --- | --- | --- | --- | --- | --- |
| **a** | **La función lenta** | Reescribir `instagram_falta_material`: los eventos de la ventana de 30 días se leen **una vez** y se cruzan con las fichas (en vez de buscar por ficha); la ciudad se compara una vez, no por fila. Una función nueva que solo **cuenta** para la portada (`instagram_falta_material_cuenta`), o el número dentro de la misma lectura. Migración que solo añade o reemplaza la función (misma firma). | migración nueva; `src/app/admin/portada.ts` | banco: de 457 ms a < 20 ms (×1) y de 45 s a < 0,3 s (×10); Administración en el servidor de 917 a ~460 ms | 2–3 |
| **b** | **Administración por partes** | `Suspense` por bloque: Pendiente primero (lo urgente), los números después con su esqueleto de cuadros, Gestionar con sus totales; el renglón de Instagram y el de Showcase con su línea gris aparte (el título sale ya, la línea de estado llega después). `loading.tsx` con la forma real (títulos de los grupos sin datos). | `src/app/admin/page.tsx`, `loading.tsx`, componentes de cada bloque | el título y Pendiente a los ~2 eslabones (≈ 250 ms en el servidor); el número de cosas que esperan al bloque más lento: 0 | 3–4 |
| **c** | **Publicar sin recargar** | El estado del renglón vive en el teléfono: al tocar «Publicar», la tarjeta entera dice «Publicando…» (fondo, anillo sobre la miniatura, texto en negritas); `useAlDia` actualiza **esa** tarjeta con `estadosTrabajos` (cada 2 s) en vez de `router.refresh()`; al terminar se queda en su sitio con «Publicado · Ver» y el aviso `Hecho`; pasa de grupo al volver a abrir. Igual en la Semana y en la ficha (`PublicarDesdeFicha`). | `ListaInstagram.tsx`, `SemanaInstagram.tsx`, `useAlDia.ts`, `HojaInstagram.tsx`, `HojaDia.tsx`, CSS del renglón | en `medir-tiempos` (parte D): señal a < 100 ms del toque, 0 refrescos de pantalla, 0 prefetch, «Publicado» < 2 s después de que termina el trabajo, el renglón no cambia de posición | 4–6 |
| **d** | **Instagram: solo la pestaña que se ve** | Cada pestaña en su `Suspense` y solo se calcula la que se ve (la otra, al tocarla); `cache()` de React para que `instagram_sugerencias` e `instagram_candidatos` se pidan una vez por carga; armar la semana fuera de la lectura de la pantalla (el latido de los miércoles ya la arma: OL-487); la ciudad de la persona en la galleta para no preguntarla antes de todo. | `src/app/admin/instagram/page.tsx`, `semana.ts`, `datos.ts`, `PantallaInstagram.tsx` | cadena de 7 a ≤ 4 eslabones; consultas por carga de 26 a ~12; contenido en el servidor < 400 ms con viajes de 80 ms | 4–6 |
| **e** | **Lo de todas las pantallas** | La página usa la misma `usuarioDeLaBarra` (un `mi_perfil` menos por pantalla); la campana pregunta solo si hay algo nuevo (un `count`, no la lista); el renglón que se toca muestra su estado presionado en seguida (H6). Inicio: no tocar el streaming; solo esto. | `src/lib/supabase/servidor.ts` o las páginas, `Sesion.tsx`, `ui/Renglon` | consultas por pantalla −5 a −7; en Instagram, señal del toque < 100 ms aunque el prefetch no haya llegado | 1–2 |
| **f** | **Presupuesto de tiempos en `medir`** | `medir-tiempos.mjs` con `--presupuesto`: falla si una pantalla pasa de su **cadena** y de sus **consultas** (cifras exactas, sin ruido de la máquina) y, en la Mac, si el FCP en caliente pasa de 1,5 s con Fast 3G ×4. Y `banco-funciones.mjs` falla si una función de la portada pasa de 50 ms (×1). En la CI solo lo exacto (cadena y consultas); los tiempos, a mano antes de publicar. | `scripts/ops/auditoria-ui/medir-tiempos.mjs`, un `tiempos.aceptados.json`, `.github/workflows/ci.yml` | que una pieza nueva no pueda volver a meter un eslabón o una función lenta sin que se vea | 2–3 |

No propongo caché de 60 s para la portada todavía: con (a) hecho, `panel_resumen` cuesta 10 ms y lo demás menos de 5; un número de hace un
minuto confunde más de lo que ahorra. Si con ×10 `panel_resumen` pasa de 100 ms, entonces sí (su foto diaria ya existe en `indicadores_diarios`).

**Lo que quita cada pieza a la persona** (con viajes de 80 ms, en la app instalada):

| | Administración: contenido | Instagram: contenido | Publicar: señal / «Publicado» |
| --- | --- | --- | --- |
| Hoy | 1,5 s | 2,0 s | 0,5 s sin señal / hasta 5 s tarde, el renglón se va |
| Tras (a) | ~1,3 s | ~1,5 s | igual |
| Tras (a) + (b) | Pendiente a ~0,9 s, el resto llega solo | ~1,5 s | igual |
| Tras (a)–(d) | ~0,9 s | ~1,0 s | al instante / < 2 s, el renglón se queda |

(Estimado a partir de lo medido: cada eslabón menos son ~80 ms en el servidor; la red del teléfono pone ~0,6–0,8 s fijos que ninguna pieza quita.)

## 6. Lo que no pude medir

- **Producción.** No se leyó nada de producción ni de Vercel (regla del encargo). Las cifras son locales; las proporciones valen, los
  milisegundos absolutos no.
- **Dónde están Vercel y Supabase.** El retraso por consulta (80 ms) es una suposición. Si los dos están en la misma región, se parece más a
  30 ms (la tabla 2.4 lo da); si no, a 150 ms. *Cómo lo mide el gestor:* Vercel → proyecto → Settings → Functions → región; Supabase → Settings
  → General → región; y la cabecera `x-vercel-id` de una respuesta de producción dice dónde corrió la función.
- **Lo que tarda la base de Supabase.** El banco corrió en un Postgres de la Mac, más rápido que una instancia chica de Supabase. *Cómo lo mide el
  gestor:* en Supabase → SQL editor, `explain analyze select count(*) from instagram_falta_material('san-luis-potosi', '<lunes>');` con la
  sesión de la administración (es una lectura), o en Reports → Query performance buscar `instagram_falta_material`.
- **Si el proxy va a Auth en cada petición.** Depende de la llave con la que Supabase firma las sesiones. *Cómo:* Supabase → Settings → JWT Keys:
  si la que está en uso es la «Legacy JWT secret», cada petición (y cada prefetch) hace un viaje a Auth antes de empezar; si es una llave nueva
  (ECC/RSA), se verifica sin viaje.
- **El arranque en frío de Vercel** (la primera petición tras un rato sin uso puede tardar más de un segundo extra) y **la red real del
  founder.** *Cómo:* el founder abre Administración desde la app con Safari conectado a la Mac (Web Inspector → Network) dos veces seguidas: la
  diferencia entre la primera y la segunda es el arranque en frío; o `Vercel → Observability` con la duración de `/admin`.
- **El iPhone de verdad.** CPU ×4 en Chrome se parece a un teléfono de gama media; Safari puede pintar distinto. La prueba final de cada pieza es
  la del founder en su iPhone.
