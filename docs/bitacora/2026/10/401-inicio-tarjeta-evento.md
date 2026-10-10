# 401 · La tarjeta de evento firmada en Inicio (OL-370)

**Fecha:** 2026-10-10. **Rama:** `inicio-tarjeta-evento`, base `origin/main` (`c6591538`, la unión del PR #476 con el prototipo firmado). **Operador:** Claude (agente del gestor V). **Sin migración.**
**Estado:** lista para la revisión del gestor; falta el «publica» del founder.

## Lo que se lleva a la app

La versión que firmó el founder el 2026-10-10 en el prototipo [`inicio-tarjetas.html`](../../../rediseno/prototipos/inicio-tarjetas.html), preajuste **«Firmada»** (E1 · E3 · E3b · E5 · E7 · E8 · E8c · E9 · E10; bitácora [398](398-prototipo-inicio-tarjetas.md), § Firma y § Versión final). Esta pieza hace las tarjetas de **eventos** de todos los carriles de Inicio: Tus planes, Destacados (o Seleccionados para ti), Esta semana, Festivales y expos, Nuevos eventos y Más adelante. Los carriles de lugares y artistas no cambian (OL-372) y la fila «Ahora» tampoco (OL-371, otro agente). E7 (la fila «Ahora» sin repetir) y E9 (artistas como eventos) quedan para esas piezas.

1. **E1 · La tarjeta es el cartel entero en 4:5**, sin la franja de color. Debajo, el título como oración (`comoOracion`: una palabra en mayúsculas de cuatro letras o más pasa a minúsculas, «DESIERTO» → «Desierto»), a partir del título corto (`tituloCorto`), en dos líneas como mucho y cortado en la última palabra entera con «…».
2. **E8 + E8c · Sin el botón de «Voy».** En su lugar, el sello de fecha arriba a la derecha: vidrio, el mes en minúsculas y en `--primario` (700) y el día grande en negro. Un día, «oct» / «11»; un rango del mismo mes, «oct» / «10–31»; un rango entre meses, «oct» / «→ 28» si ya empezó y «oct» / «12 →» si no. Tocar el sello abre la ficha (está dentro del enlace).
3. **E3 + E3b · Rótulos fuera del cartel.** Arriba del título, chica, en mayúsculas y gris, la clase solo si no es evento («TALLER», «EXPO», «FESTIVAL»), con la sesión al lado («TALLER · SESIÓN 1 DE 4»). «Hoy» va en la línea de cuándo («hoy · 13:00»).
4. **Un solo chip sobre el cartel**, abajo a la izquierda: «Te interesa» (violeta claro) o cuántos van («1 va», «2 van», vidrio), también en lo de hoy.
5. **Debajo del título**, el lugar en gris y la fecha en violeta. Un festival que ya empezó dice cuándo termina con la función de las exposiciones (`textoVisita`): «Hasta el sáb 24 de oct». El que no ha empezado conserva su rango.
6. **«Tus planes»:** «Vas» no se dice; «Te interesa» sí. Sin marca de carril.
7. **E10 · Sin cartel:** la paleta propia de siempre, el símbolo SN blanco arriba a la izquierda (20 px), el sello arriba a la derecha y, en la base, el chip, la ceja y el título.
8. **E5 · Tamaños:** grande, 165×206, en Tus planes, Destacados y Festivales y expos; mediana, 132×165, en Esta semana, Nuevos eventos y Más adelante, con el título (15 px) y las líneas (14 px) un escalón más chicos. Los esqueletos de carga miden igual.

## Dónde vive

- **`src/lib/tarjetaInicio.ts`** (nuevo, con `tarjetaInicio.test.ts`): `selloDeFecha` (en la zona del evento; el fin a la medianoche es el final del día anterior con `ultimoDiaDelPeriodo`, como el prototipo), `cuandoEnInicio`, `tarjetaDeInicio` (la tarjeta de siempre con su clase, su línea de cuándo y su sello, armada en el servidor), `selloFechaDe` (el sello de una tarjeta que «Tus planes» guardó en el teléfono antes de esta pieza y no lo trae), `cejaDeTarjeta`, `chipDeTarjeta`, `nombreDeTarjeta` y `cortarEnPalabra`.
- **`src/lib/tituloCorto.ts`:** `comoOracion`.
- **`src/components/inicio/TarjetaEvento.tsx` + `.module.css`** (nuevos): la tarjeta. Una rejilla plana con áreas (portada · respiro · ceja · título · lugar · cuándo); el sello y el chip comparten la celda del cartel, sin `z-index`. El corte del título se mide en su sitio antes de pintar y se rehace al cargar la letra o al cambiar de ancho.
- **`src/components/Destacados.tsx` y su CSS:** el prop `titular` (OL-360) pasa a `cartel` y entrega cada tarjeta a `TarjetaEvento`; se van la franja, el cartel recortado y los rótulos apilados de OL-360/OL-364. Las tarjetas de lugares y artistas no cambian. Medidas nuevas del carril: `.cartelGrande` y `.cartelMediana`.
- **`src/app/globals.css`:** `--tarjeta-cartel-foto` (165 × 5/4), `--tarjeta-cartel-mediana` (4/5 de la grande, 132) y su foto (165), y `--sello-fecha` (40). `--tarjeta-grande-foto` (248) no se toca: es la de «Artistas destacadxs».
- **Carriles:** `CarrilAgenda`, `CarrilTusPlanes` y `CarrilMasAdelante` arman con `tarjetaDeInicio`; Esta semana, Nuevos y Más adelante van en mediana; `CarrilEventosCliente` ya no pasa el botón (de `useAsistenciaEnLista` solo lee el estado, para el chip y para «Tus planes»; el hook no cambia y Agenda, Mi perfil y las demás pantallas siguen con su botón). `CarrilEsqueleto` e `Inicio` con el esqueleto de cada tamaño.
- **`src/lib/imagenOptima.ts`:** `sizes` de la mediana («(min-width: 1048px) 152px, 132px»).
- **`rotulosDeTarjeta`** (OL-364) se va: ya no lo usa nadie.

## Lo que decidí yo

- **«Ya empezó» es por día en el sello y en la línea.** El prototipo usaba el día para el sello y el instante para la línea del festival; con eso, un festival que empieza hoy a las 19:00 diría «→ 24» en el sello y «hoy · del 10 al 24 de oct» abajo. Con la misma regla en los dos dice «→ 24» y «hoy · hasta el sáb 24 de oct».
- **El sello y la línea de cuándo se arman en el servidor** (`tarjetaDeInicio`): el cliente no calcula fechas al hidratar, así no hay diferencias entre servidor y teléfono. Solo una tarjeta guardada antes en el teléfono (sin sello) lo calcula en el cliente.
- **La mediana crece desde 1048 con la grande** (152×190, 4/5 de 190×237,5), porque la regla de la app es que desde 1048 las tarjetas de cartel crecen. El prototipo solo define el teléfono.
- **La ceja es un solo texto** con espacios duros dentro de cada parte y el punto al final de la primera: si no cabe, la segunda parte baja entera, como en el prototipo, con dos nodos menos por tarjeta.
- **El nombre del enlace suma la clase con su sesión y el chip** («Laboratorio… Taller · Sesión 1 de 4. hoy · 17:00. Aurora Co-Lab. 1 va»): lo que se ve, también para quien no lo ve. «Vas» va solo en el nombre.
- **El título se corta midiendo en su sitio**, como el prototipo. El CSS de `-webkit-line-clamp` corta a media palabra, y la firma pide no hacerlo.

## Comparado con el prototipo firmado, medida por medida

Medido a 390×844 en Chrome: el prototipo «Firmada» servido como al publicarlo, y la app (`next dev` y la compilada) contra el respaldo local. Las cifras de la app son las mismas en los dos casos.

| Qué | Prototipo «Firmada» | App |
|---|---|---|
| Carril | columna 165, hueco 12, relleno 4/20/8 | igual |
| Cartel grande | 165×206,3, radio 8, fondo `--fondo-miniatura` | 165×206,3 (x=20, y=320,8 en «Tus planes», como el prototipo) |
| Cartel mediano | 132×165, columna 132 | 132×165 |
| Sello | 40×48 a 8 px de arriba y de la derecha (137, 328,8); relleno 4/8; radio 8; `--vidrio`; `--sombra` | 40×48 en (137, 328,8) |
| Mes del sello | 12 px, 700, `rgb(109, 52, 200)`, minúsculas, interlineado 1 | igual |
| Día del sello | 26 px, 600, `rgb(26, 26, 26)`, ancho 75 | igual |
| Flecha | trazo de 11×11, `--texto-suave`, grosor 2; antes del día si ya empezó, después si no | igual |
| Chip | abajo a la izquierda a 8 px; 14 px, 700; «1 va» de 38,9×25,6 en (28, 493,5) | igual, en (28, 493,5) |
| Orden de las líneas | ceja · título · lugar · cuándo, a 8 px del cartel | igual (título en y=535) |
| Ceja | 12 px, 700, mayúsculas, espaciado 0,06 em, `--texto-suave`, 2 px abajo | igual; «TALLER · SESIÓN 1 DE 4» mide 122,4 px contra 123,6 |
| Título | 17 px, 700, ancho 75, interlineado 1,15, dos líneas, 2 px abajo | igual |
| Lugar / cuándo | 15 px, interlineado 1,3; `rgb(92, 92, 92)` / `rgb(109, 52, 200)` | igual |
| Mediana | título 15 px (17,25 de línea), líneas 14 px (18,2) | igual |
| Sin cartel | columnas 38 / 94; filas 64 · 42,2 · 0 · 58,8; SN 26×20 a 12 px; sello a 8 px; título 800, mayúsculas, interlineado 1,04, 12 px de margen | igual (una fila más de 0 para la ceja) |
| Corte del título | «Día Nacional de las Cactáceas en el…» en la mediana | lo mismo con la letra de la app (prueba de componente con `FUENTE`) |

## Diferencias que quedan contra el prototipo

- **La ceja mide 1,2 px menos** cuando tiene dos partes: el hueco entre ellas es un espacio y no 0,35 em.
- **Las siglas de cuatro letras o más pasan a minúsculas** dentro de un título mixto: «Master Class - 9° Festival de Cine UASLP» queda «…de Cine uaslp». Es la regla firmada tal cual (`comoOracion`); en los datos del prototipo solo había nombres gritados enteros (KOWAIFEST, DESIERTO, CINEMA, LXS COLOCAOS) y ninguna sigla dentro de un título. **Por decidir con el founder:** convertir solo cuando el título corto entero va en mayúsculas, o dejarlo así.
- **En «Tus planes» un taller dice «TALLER» sin su sesión**, igual que hoy en producción: esa consulta (`cargarPersona`) no trae las sesiones, y repartirlo sin ellas lo partiría por días.
- **La barra de abajo de la app se esconde al bajar**, como siempre; el prototipo la deja fija. No es de esta pieza.
- **«Te interesa»** usa el `--primario-suave` de la app (`color-mix` del violeta al 12 %), un punto más oscuro en el rojo que el `#eee7f8` del prototipo.

## Presupuestos de `npm run medir`

| Pantalla | Antes | Ahora | Por qué |
|---|---|---|---|
| 01-inicio | 412 (414 desde 820), prof. 11 | 381 (383), prof. 10 | Con los datos de antes mediría 351 (353): −61, la tarjeta firmada no lleva botón, franja ni rótulos apilados. Los +30 son la expo y el festival nuevos del respaldo, dos tarjetas más en «Festivales y expos». |
| s01-inicio-sesion | 406 (408), prof. 11 | 383 (385), prof. 10 | Igual: 353 (355) con los datos de antes. |
| 02-agenda | 305 (307) | 320 (322) | +15 solo por los dos eventos nuevos del respaldo; con los datos de antes mide 305 (307): el código de Agenda no cambia. |
| s02-agenda-sesion | 311 (313) | 326 (328) | Igual: +15 por los datos. |

Las demás pantallas no se mueven. `npm run inventario` sin novedades: 333 medidas en duro (se va el `18px` del símbolo de OL-360 y entra el `20px` firmado) y 2 bloques repetidos.

## El respaldo local

`scripts/ops/auditoria-ui/respaldo-local/fixture.mjs` suma dos eventos visibles y en curso que cruzan de un mes a otro, con sus días contados desde el primero del mes, así cruzan cualquier día: **KOWAIFEST** (festival, del 27 del mes pasado al 23 del que viene, en el CCUB, cartel público `kowaifest`) y **Un mundo para mí** (exposición, del 21 del mes pasado al 8 del que viene, en el MUNI, que tiene horario). Sin actos ni asistencias: no aparecen en otros carriles ni cambian los «van». Lo demás ya estaba: el evento sin cartel (Macario), el taller con sesiones (Taller de grabado en linóleo), los «Te interesa» de Ana (Leonora, el Festival de Cine de Invierno, el taller) y los «van» (LXS COLOCAOS 2, la Cristiada 1).

## Verificación

- `npm run lint` (0 errores; la advertencia de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (3495 unitarias, 191 archivos; nuevas: 26 de `tarjetaInicio`, 3 de `comoOracion`, la de `sizes` y la de OL-370 en `agendaPorClase`), `npm run inventario`, `npm run medir` (37 pantallas × 4 anchos; presupuestos de arriba) y `next build` en verde.
- **Componentes:** `npm run test:componentes`, 566 en verde con el Chromium de Playwright, el de la CI. `Destacados.componentes.test.mjs` lleva 9 pruebas nuevas de la tarjeta firmada (medidas a 390 y 1280, sin botón, sello, chip, ceja, título y líneas, sin cartel, esqueleto) que pasan con Arial, con la letra de la app (`FUENTE=…woff2`, donde también se comprueba el corte exacto del título) y con `TZ=UTC`. `Inicio.componentes.test.mjs`: la clase va en la ceja y ninguna tarjeta de Inicio lleva «Voy». Con el Chrome de la Mac falla una prueba ajena de «Publicado» (OL-365, navega a un 404 del servidor de prueba); con el Chromium de la CI pasa.
- **Toques reales** en el navegador integrado contra `next dev` y el respaldo, con la sesión inventada de Ana, a 390×844: `elementFromPoint` en el centro del sello y del cartel de las 16 tarjetas de eventos (con cada tarjeta entera a la vista): las 32 caen en su enlace, nada encima. Clic por coordenadas en el centro del sello «oct / 19–21»: abre `/eventos/festival-de-cine-de-invierno`. Clic en el centro del cartel de Leonora: abre su ficha. A 320 y a 1280, el documento mide lo que la ventana (sin desplazamiento lateral); a 1280 la grande mide 190×237,5 y la mediana 152×190. Sin avisos de hidratación en la consola.
- **Decidir en la ficha y volver:** el respaldo contesta las escrituras sin guardarlas, así que al volver la tarjeta sigue con lo que dice el servidor. El chip según lo decidido lo cubren las pruebas de componentes.

## Capturas

[`docs/rediseno/capturas-401/`](../../../rediseno/capturas-401/), Chrome de la Mac con playwright-core a 2×, la app compilada contra el respaldo con el reloj fijo en la hora del prototipo (sáb 10 de oct, 11:49) y la sesión de Ana. Los carteles son los públicos que trae el respaldo (`imagenes.json`): el optimizador de la app reutilizó su caché y pidió una sola vez los tamaños que faltaban. Abiertas una por una:

- `01-pliegue-390.png` — Inicio al abrir. Fila «Ahora» con dos círculos (18:00 y 19:00). «Tus planes»: la Cristiada (foto de la Casa de Cultura, sello «oct / 11», chip «1 va», «San Luis Potosí en la / Cristiada», «Casa de Cultura del Barrio d…» en gris, «mañana · 19:30» en violeta) y el taller (sello «oct / 12», «Te interesa», ceja «TALLER», «Taller de grabado en / linóleo», «ACHE Galería», «lun 12 de oct · 17:00»); asoma LXS COLOCAOS. Abajo empieza «Seleccionados para ti» con «oct / 18» y «oct / 21».
- `02-bajando-una-pantalla-390.png` — «Seleccionados para ti»: «Master Class - 9° Festival / de Cine uaslp» (la sigla en minúsculas, ver Diferencias) y «Desierto». «Esta semana» en mediana, dos y media a la vista: Delirium Pollum («oct / 13»), «Inauguración de Uno / de Uno · Custom Art…» (cortado en palabra) y Susurros. Empieza «Festivales y expos» con «nov / →8» y «nov / →23».
- `03-bajando-dos-pantallas-390.png` — «Festivales y expos»: «EXPO / Un mundo para mí / MUNI… / Hasta el dom 8 de nov» y «FESTIVAL / Kowaifest / Centro Cultural… / Hasta el lun 23 de nov»; asoma el Festival de Cine de Invierno. Debajo, «Lugares de la semana» y «Artistas destacadxs» como en producción, con sus botones de seguir (no son de esta pieza).
- `04-sin-cartel-y-festivales-390.png` — «Esta semana» deslizado al final: Susurros («oct / 16») y Macario sin cartel (paleta magenta, «SN» arriba a la izquierda, «oct / 10» arriba a la derecha, «MACARIO, XANTOLO CAMINO AL MICTLÁN» en la base; debajo «Teatro del Centro de Dif…» y «hoy · 19:00»). Debajo, «Festivales y expos».
- `05-tus-planes-festival-y-taller-390.png` — «Tus planes» deslizado al final: Leonora («oct / 19», «Te interesa») y el Festival de Cine de Invierno («oct / 19–21», «Te interesa», ceja «FESTIVAL», «Del 19 al 21 de oct»).
- `06-pliegue-320.png` — a 320×568: la misma tarjeta de 165 con su sello; la segunda asoma; la fila de contexto se desliza como siempre.
- `07-bajando-320.png` — a 320: «Seleccionados / para ti» en dos líneas (como desde OL-361) y las tarjetas sin cambio.
- `08-tableta-768.png` — a 768: cuatro grandes a la vista en «Tus planes»; LXS COLOCAOS con «2 van» (Ana va y no se dice «Vas»).
- `09-tableta-768-bajando.png` — a 768: las cuatro medianas de «Esta semana» (con Macario sin cartel) y los tres de «Festivales y expos» con «nov / →8», «nov / →23» y «oct / 19–21».
- `10-lado-a-lado-pliegue.png` — izquierda, el prototipo «Firmada» (Kopk Poj con «1 va», el tributo con «Te interesa»); derecha, la app. El cartel, el sello, el chip y las tres líneas caen a la misma altura; cambian los datos (el prototipo usa los eventos reales del 10 de oct y la app el respaldo inventado).
- `11-lado-a-lado-bajando.png` — una pantalla abajo: la mediana de «Esta semana» igual en los dos (132×165, sello en la misma esquina). La barra de abajo de la app se esconde al bajar; la del prototipo no.
- `12-lado-a-lado-esta-semana.png` — «Esta semana» a la misma altura en los dos y, debajo, «Festivales y expos» con sus sellos de rango: «oct / →24» y «oct / →28» en el prototipo, «nov / →8» y «nov / →23» en la app.

## Límites

- **Safari del iPhone sin probar:** todo se midió en Chrome (navegador integrado y playwright-core). El corte del título usa `scrollHeight` y `clientHeight`, que Safari mide igual; el cartel tiene alto explícito y no en porcentaje (OL-246).
- **«Tus planes al instante» (OL-224) queda dormido:** guardaba en el teléfono la tarjeta de un evento al tocar «Voy» en otra fila de Inicio; sin botones, solo quedan las que se guardaron antes. El código sigue (y esas tarjetas calculan su sello), por si el botón vuelve en otro lado.
- **`Tarjeta.colores`** (los colores del cartel guardados en OL-360) ya no los pinta ninguna tarjeta de Inicio: la franja se fue. La columna y su cálculo siguen (las historias de la fila «Ahora» usan los colores del cartel por su cuenta). Limpieza posible en otra pieza.
- Las capturas usan los carteles públicos de `imagenes.json`, que el optimizador pidió al almacenamiento una vez; `medir` y las pruebas no salen a la red.

## Pendiente

Revisión del gestor y «publica» del founder; decidir lo de las siglas en minúsculas.
