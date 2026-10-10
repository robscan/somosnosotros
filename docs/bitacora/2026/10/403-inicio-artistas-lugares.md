# 403 · Artistas y lugares firmados en Inicio (OL-372)

**Fecha:** 2026-10-10. **Rama:** `inicio-artistas-lugares`, base `origin/inicio-tarjeta-evento` (`61ac29e3`, OL-370, PR #478 entonces sin unir: de ahí sale la tarjeta de evento firmada que esta pieza reutiliza). Al cerrar, OL-370 (#478) y OL-371 (#477) ya estaban en `main`, y la rama trae `origin/main` (`b5877544`; § Verificación). **Operador:** Claude (agente del gestor V). **Sin migración.**
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder.

## Lo que se lleva a la app

Lo que firmó el founder el 2026-10-10 en el prototipo [`inicio-tarjetas.html`](../../../rediseno/prototipos/inicio-tarjetas.html), preajuste **«Firmada»** (bitácora [398](398-prototipo-inicio-tarjetas.md), § Firma y § Versión final), en los tres carriles que OL-370 dejó como estaban: E9 en «Artistas destacadxs» y E5 en «Lugares de la semana» y «Artistas de la semana». El código del prototipo (`htmlArtistaEvento`, `htmlEntidad` con `forma: 'avatar'`, `.tira.avatar` y `.avatar .en`) fue la especificación.

1. **E9 · «Artistas destacadxs» con la tarjeta de un evento** (founder: «para este carril usar jerarquía de nuevos eventos»). La mediana: 132×165, se ven dos y media (152×190 desde 1048, como la mediana de un evento). La foto del artista entera, como el cartel, sin franja; sin foto, la imagen ya generada con el símbolo SN (`/sin-foto.png`). Encima, abajo a la izquierda, «Nuevo video» o «Nuevo audio» solo si hay una novedad vigente (`selloNovedadArtista`, la regla de siempre), con el trato de «Hoy» de producción: el violeta de la app con el texto blanco. Debajo, la disciplina en la ceja («MÚSICA»), el nombre como título tal como está escrito (sin `comoOracion`: es un nombre propio), cortado en palabra entera con «…» si no cabe en dos líneas, el género en gris en la línea del lugar y su fecha en violeta en la línea de cuándo. Sin sello de fecha ni botón de seguir. El nombre del enlace: nombre, disciplina, género, cuándo y novedad, separados por punto («Feleal. Música. Acordeón. sáb 17 de oct · 19:00. Nuevo video»).
2. **E5 · «Lugares de la semana» y «Artistas de la semana» en avatares de 64.** La foto redonda al centro de su columna (64 + 12, con 8 entre columnas); sin foto, la imagen del símbolo SN. Debajo, a 12 px, el nombre centrado en `--letra-xs`, en una línea con «…»; debajo, a 8 px, solo si hay una novedad, «Nuevo video» o «Nuevo audio» en violeta. Nada más: el detalle de antes («En curso», «Mañana · 19:30») ya no va y no hay botón de seguir ni de campana (seguir queda en la ficha). El nombre del enlace lleva el nombre completo, que a la vista se corta, y la novedad («Abril Merlot. Nuevo audio»).
3. **La novedad de «Artistas de la semana».** Ese carril no la traía. Para que la línea violeta del avatar diga algo, el servidor lee la novedad vigente del lote (doce como mucho) con la lectura que ya usa la lista de Artistas (`leerNovedadesRecientes`, la RPC `novedades_recientes_artistas` de OL-275; sin migración). Si falla, el carril sale igual, sin novedades. Como en «Artistas destacadxs», el enlace abre la ficha en esa novedad (`?novedad=…`).
4. **Tokens** en `globals.css`: `--avatar-carril: 64px` (nuevo); la tarjeta del artista usa los de la mediana de OL-370 (`--tarjeta-cartel-mediana` y su foto). Se van los que ya no usa nadie: `--tarjeta-grande-foto` (248; 285 desde 1048), `--tarjeta-mediana` (220), `--tarjeta-mediana-foto` (132), `--tarjeta-chica` (104) y `--tarjeta-sola-foto` (264).
5. **Esqueletos de carga** (`CarrilEsqueleto`, ahora con `forma`): el de «Artistas destacadxs» mide lo que la tarjeta de un artista con su fecha (la foto, la ceja, el nombre en una línea, el género y la fecha: 246,2, la de Un León Marinero en el prototipo); el de los avatares, el círculo y el nombre (92,1), cinco para llenar el ancho como el carril. Los de eventos no cambian.
6. **Código que queda sin uso al quitar los botones, fuera:** la tarjeta vieja de `Destacados` (rótulo sobre la foto, botón sobre la foto, tarjeta sin foto compacta, grande de 165×248, redonda de 104 y la sola en 5:3) con su CSS; `selloDeTarjeta`; las props `boton` y `cartel` de `Destacados`; `sobreFoto` de `ui/BotonRenglon`; en Inicio, la lectura de lo que sigue la persona para estos carriles y `useSeguirEnLista` en `CarrilEntidadCliente`; y las cajas «mediana», «chica» y «sola» de `tamanoImagenCarril`. Las listas de Lugares, Artistas y Mi perfil siguen con su botón de seguir (`useSeguirEnLista` + `BotonRenglon`), sin cambios.

## Dónde vive

- **`src/lib/tarjetaInicio.ts`** (con `tarjetaInicio.test.ts`): `tarjetaArtistaDeInicio` (la tarjeta de siempre, `tarjetaArtista`, con su disciplina y su género; se arma en el servidor), `piezasDeArtista` (ceja, título, género, cuándo, novedad y nombre del enlace) y `avatarDeInicio` (nombre, novedad y nombre del enlace).
- **`src/lib/eventosSemana.ts`** (con su prueba): `conNovedades`, la novedad vigente de cada artista de la semana y su enlace.
- **`src/lib/destacados.ts`:** `Tarjeta` suma `disciplina` y `genero` (solo los trae la tarjeta de un artista en Inicio); se va `selloDeTarjeta`. Buscar sigue con `tarjetaArtista` tal cual.
- **`src/components/inicio/TarjetaEvento.tsx` + `.module.css`:** la tarjeta firmada pasa a una pieza interna, `TarjetaCartel`, que recibe lo que dice cada tarjeta ya resuelto (portada, sello, chip, ceja, título, lugar y cuándo). `TarjetaEvento` la arma como antes y `TarjetaArtista` (nueva) con lo del artista. En el CSS solo entra `.chip.nuevo`. Las tarjetas de eventos salen idénticas (§ Verificación).
- **`src/components/inicio/TarjetaAvatar.tsx` + `.module.css`** (nuevos): el avatar, una rejilla plana con áreas (foto · nombre · novedad), todo al centro; sin novedad, su fila no mide nada.
- **`src/components/Destacados.tsx` + `.module.css`:** solo el carril (título, «Ver…», la tira que se desliza y recuerda dónde quedó) y la `forma` de sus tarjetas: `grande` y `mediana` (eventos), `artista` y `avatar`. El CSS conserva `.cartelGrande` y `.cartelMediana` y suma `.avatar` (columna de 64 + 12, hueco de 8).
- **`src/components/CarrilEsqueleto.tsx`:** `forma` y `columnasDe` (las columnas de cada forma, las mismas para el carril y su esqueleto).
- **`CarrilEntidad` y `CarrilEntidadCliente`:** sin lo que sigue la persona ni avisos; pasan la `forma`. **`Inicio.tsx`:** los esqueletos de cada carril. **`src/app/page.tsx`:** `tarjetaArtistaDeInicio` y la novedad de la semana.
- **`src/lib/imagenOptima.ts`:** `tamanoImagenCarril("avatar")` = «64px» (a 2× pide la variante de 192 y no la de 384 de la redonda de 104).
- **`src/components/ui/BotonRenglon.tsx`:** sin `sobreFoto`; la prueba de que no parpadea (`BotonesSinParpadeo.componentes`) prueba ahora el «Voy» de un renglón, que es donde vive.

## Lo que decidí yo

- **La fecha de un artista es su próxima fecha, sea cuando sea**, como ya la decía su tarjeta en producción. La firma de E9 dice «debajo, su género y su próxima fecha»; el «si tiene fecha esta semana» del código del prototipo sale de sus datos, que solo llegaban al 18 de octubre. Si se prefiere solo la de esta semana, es una línea en `piezasDeArtista`.
- **Leo la novedad de «Artistas de la semana»** (una lectura más por Inicio, la que ya existe): sin ella, la línea violeta del avatar no saldría nunca. Será rara: un artista con novedad y foto ya sale en «Artistas destacadxs»; aquí quedan los que no tienen foto o pasan de los doce.
- **Lo que tiene foto sigue primero** (`ordenarTarjetasPorFoto`, la regla de siempre de los carriles), también en los avatares. El prototipo dejaba los lugares sin foto en su orden de fechas.
- **El género, tal como se escribió** («jazz, blues y soul», con su minúscula), como el prototipo. Sin subcategoría, no hay línea de género; una ficha por completar no tiene disciplina que decir: sin ceja.
- **Una sola tarjeta para eventos y artistas** (`TarjetaCartel`), con lo que dice cada una resuelto antes de pintar. Nada de duplicar la rejilla ni su CSS.
- **El nombre bajo el avatar mide lo que su texto, centrado** (y los 76 de la columna si no cabe): el texto queda en el mismo sitio que en el prototipo, que le da siempre los 76.
- **`.carril > li` pierde `position: relative`**: solo servía para colocar el botón.

## Comparado con el prototipo firmado, medida por medida

Medido a 390×844 en el Chrome de la Mac: el prototipo «Firmada» servido como al publicarlo y la app compilada contra el respaldo local, con el reloj del prototipo (sáb 10 de oct, 11:49) y la sesión de Ana. La línea de novedad del avatar se midió en una copia del prototipo con una novedad en Denisse Hervert (sus datos no traían ninguna en ese carril).

| Qué | Prototipo «Firmada» | App |
|---|---|---|
| Carril de avatares | columna 76 (64 + 12), hueco 8, relleno 4/20/8; sección 196,1; título a 39,7, de 28,6; tira a 92 | igual |
| Avatar | 76×92,1; foto 64×64 a 6 px del borde de la columna, redonda, `--fondo-miniatura`, encuadre al centro | igual |
| Nombre | a 12 px de la foto, 14 px, 700, wdth 75, interlineado 16,1, una línea con «…», centrado | igual |
| Novedad bajo el avatar | a 8 px del nombre, 15 px, 400, wdth 80, interlineado 19,5, `--primario`, centrada; «Nuevo video» de 69,1; el avatar mide 119,6 | igual («Nuevo audio» de 69,8) |
| Carril de «Artistas destacadxs» | columna 132, hueco 12, relleno 4/20/8 | igual |
| Foto | 132×165, radio 8, encuadre arriba al centro (`50% 0%`) | igual |
| Chip | a 8 px abajo a la izquierda (8; 131,4), 25,6 de alto, 14 px, 700, blanco sobre `--primario`; «Nuevo video» 85,1, «Nuevo audio» 85,6 | igual, los mismos anchos |
| Ceja | a 8 px de la foto (173), 12 px, 700, mayúsculas, espaciado 0,72, `--texto-suave` | igual |
| Nombre (título) | a 190,6, 15 px, 700, wdth 75, interlineado 17,25 | igual |
| Género | a 209,8, 14 px, 400, wdth 80, `--texto-suave`, una línea con «…» | igual |
| Fecha | a 228,0, 14 px, `--primario` | igual |
| Tarjeta | 228,0 sin fecha y 246,2 con fecha (Un León Marinero) | 246,2 con fecha (Pimpolina, Feleal); la Orquesta, con el nombre en dos líneas, 263,5 |
| Corte del nombre | — (ningún nombre del prototipo se corta) | en dos líneas como mucho y en palabra entera: «Orquesta Sinfónica de San Luis Potosí y su coro de cámara» queda «Orquesta Sinfónica de San Luis Potosí y su…» con la letra de la app (prueba de componente con `FUENTE`) |

## Diferencias que quedan contra el prototipo

- **Los lugares y artistas sin foto van al final del carril** (regla de siempre de la app). En el prototipo, «Casa de Cultura Banamex» y «Galería Casa Diana» salían entre los que tienen foto.
- **La fecha del artista puede ser de más adelante** que esta semana (§ Lo que decidí yo).
- **Los datos:** el prototipo usa los artistas y lugares reales del 10 de octubre y la app, los inventados del respaldo; por eso cambian los nombres, las fotos y el alto del carril de artistas (la Orquesta tiene el nombre en dos líneas y fecha).
- **Lo que no es de esta pieza:** la barra de abajo de la app se esconde al bajar y, abajo a la izquierda, flota el botón «Volver arriba», que en algunas capturas tapa el nombre del primer avatar de «Artistas de la semana»; el prototipo no los tiene.

## Presupuestos de `npm run medir`

| Pantalla | Antes | Ahora | Por qué |
|---|---|---|---|
| 01-inicio | 381 (383 desde 820), prof. 10 | 345 (347), prof. 10 | Con los datos de antes mide 342 (344): −39. Cada avatar son 4 nodos en vez de 8 (sin el botón con su icono, sin la línea de detalle): 6 lugares, −24, y 3 artistas, −12; cada tarjeta de artista, 7 en vez de 8, −3. Los +3 son del respaldo: los chips «Nuevo audio» y «Nuevo video» y la línea «Nuevo audio» de Abril Merlot. |
| s01-inicio-sesion | 383 (385), prof. 10 | 347 (349), prof. 10 | Igual: 344 (346) con los datos de antes. |
| 05-artistas | 143 (145) | 146 (148) | +3 solo por los datos: tres artistas del respaldo publicaron una novedad y la lista de Artistas ya pinta su sello (OL-275), un nodo por renglón. Con los datos de antes mide 143: el código de Artistas no cambia. |

Las demás pantallas no se mueven. `npm run inventario`: 333 medidas en duro (igual) y los bloques repetidos bajan de 2 a 1: se fue `.tarjeta > small > span` de la tarjeta vieja, que repetía `.textoAgregar` de `HojaDonde`.

## El respaldo local

`scripts/ops/auditoria-ui/respaldo-local/fixture.mjs` suma los dos contratos de OL-275, que antes contestaban vacío (y «Artistas destacadxs» salía del respaldo por seguidores): `artistas_destacados_novedades` (los que eligió la administración y luego los que tienen una novedad vigente, de la más reciente a la más vieja, todos con foto, doce como mucho) y `novedades_recientes_artistas`. Con eso, para ver cada caso:

- **Pimpolina**, elegida por la administración (`artistasElegidos`), sin novedad: «TEATRO», «Clown», «mar 13 de oct · 18:00».
- **La Orquesta Sinfónica de San Luis Potosí**, con un audio de hace un día: «Nuevo audio», el nombre largo en dos líneas, «hoy · 18:00».
- **Feleal**, con un video de hace dos días: «Nuevo video».
- **Abril Merlot**, sin foto, con un audio de hace tres días: no puede ser destacada (un destacado exige foto) y lo dice bajo su avatar en «Artistas de la semana».
- **0Backside0** pasa a tener foto (un cartel público), para ver un avatar con foto junto a los del símbolo SN.
- Los lugares sin foto ya estaban: el Centro Cultural Universitario Bicentenario y Aether.

## Verificación

- `npm run lint` (0 errores; la advertencia de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (3503 unitarias, 191 archivos; nuevas: 10 de `tarjetaArtistaDeInicio`, `piezasDeArtista` y `avatarDeInicio` y 2 de `conNovedades`, y `tamanoImagenCarril("avatar")` en la de siempre; se van las 5 de `selloDeTarjeta`), también con `TZ=UTC`; `npm run inventario`; `npm run medir` (37 pantallas × 4 anchos, presupuestos de arriba; sin toques menores de 44, desbordes ni desplazamiento lateral) y `next build` en verde.
- **Componentes:** `npm run test:componentes`, 558 en verde con el Chromium de Playwright, el de la CI. `Destacados.componentes.test.mjs` lleva 11 pruebas nuevas (E9: medidas a 390 y 1280, sin botón ni sello, el chip, la ceja, el nombre, el género y la fecha, el nombre del enlace, sin foto; E5: columnas, foto y nombre a 390 y 1280, la novedad, el nombre del enlace y sin foto; el centro de cada tarjeta es su enlace; los esqueletos) y pierde las 19 de la tarjeta vieja. Pasan con Arial, con la letra de la app (`FUENTE=…woff2`, donde se comprueba el corte exacto del nombre largo) y con `TZ=UTC`. `Inicio.componentes.test.mjs`: «Artistas destacadxs» sin botón y con su «Ver artistas».
- **Las tarjetas de eventos no cambian:** la huella de cada carril de Inicio (cada elemento con su etiqueta, su texto, su caja, su enlace, su nombre accesible y 33 estilos calculados), antes y después, a 390 con sesión, a 1280 con sesión y a 390 sin sesión: Tus planes, Seleccionados para ti, Destacados, Esta semana, Festivales y expos y la fila «Ahora» salen idénticos. Lo único distinto es la opacidad del esqueleto que respira en el carril vacío de «Nuevos eventos», que cambia según el instante de la medida.
- **Toques reales** en el navegador integrado contra `next dev` y el respaldo, con la sesión inventada de Ana, a 390×844: `elementFromPoint` en el centro de cada tarjeta y de su foto, con cada una entera a la vista: las 24 caen en su enlace (6 lugares, 3 artistas destacadxs y 3 de la semana), sin botones ni nada al lado del enlace; cajas de 76×92 (avatar), 76×120 (con novedad) y 132×246 o 263 (artista). Clic por coordenadas en el centro de la foto de la Orquesta: abre `/artistas/orquesta-sinfonica-de-san-luis-potosi?novedad=…`; en el avatar del Teatro de la Paz: `/lugares/teatro-de-la-paz`; en el de Abril Merlot: `/artistas/abril-merlot?novedad=…`. Al volver, Inicio queda donde estaba. Arrastrar el carril de lugares desde un avatar no lo abre. En la consola, ningún aviso de hidratación; solo el error de siempre del registro del service worker en `next dev` («An unknown error occurred when fetching the script»).

## Capturas

[`docs/rediseno/capturas-403/`](../../../rediseno/capturas-403/), Chrome de la Mac con playwright-core a 2×, la app compilada contra el respaldo con el reloj fijo en la hora del prototipo (sáb 10 de oct, 11:49) y la sesión de Ana; los guiones son copia de los del gestor para OL-370 (`capturar401-completo.mjs` y `capturar401.mjs`). Abiertas una por una.

- `01-lugares-y-artistas-destacadxs-390.png` — los tres carriles en una pantalla. «Lugares de la semana»: MUNI, Casa de Cultura, ACHE Galería y Teatro de la Paz en círculos de 64 con su nombre en una línea («MUNI Museo…», «Casa de Cult…», «Teatro de la …»); asoma el Centro Cultural con el símbolo SN. «Artistas destacadxs»: Pimpolina («TEATRO», «Clown», «mar 13 de oct · 18:00» en violeta), la Orquesta («Nuevo audio» sobre la foto, «MÚSICA», el nombre en dos líneas, «Música académica y cl…», «hoy · 18:00») y asoma Feleal con «Nuevo video». Abajo, «Artistas de la semana» con 0Backside0 (con foto; el botón «Volver arriba» tapa su nombre), Abril Merlot con el símbolo SN y «Nuevo audio» en violeta, y Aaron Cadena.
- `02-artistas-destacadxs-al-final-390.png` — «Artistas destacadxs» deslizado al final: Feleal entero, con «Nuevo video», «MÚSICA», «Feleal», «Acordeón» y «sáb 17 de oct · 19:00».
- `03-artistas-de-la-semana-390.png` — al final de la página: «Artistas de la semana» entero, con «0Backside0», «Abril Merlot» con «Nuevo audio» debajo, y «Aaron Cadena»; sin botones.
- `04-lugares-al-final-390.png` — «Lugares de la semana» deslizado al final: el Centro Cultural («Centro Cultu…») y Aether con el símbolo SN, los dos sin foto, al final.
- `05-lugares-y-artistas-320.png` — a 320×568: los títulos en dos líneas (como desde OL-361), los avatares iguales (se ven tres y medio) y las tarjetas de artista de 132.
- `06-artistas-320.png` — a 320: «Artistas destacadxs» con sus líneas y, abajo, los avatares de la semana.
- `07-tableta-768.png` — a 768: los seis lugares a la vista, las tres tarjetas de artista enteras y los tres avatares de la semana con «Nuevo audio».
- `08-lado-a-lado-lugares-y-destacadxs.png` — izquierda, el prototipo «Firmada»; derecha, la app, con «Lugares de la semana» a la misma altura: el título, los círculos, los nombres, el título de «Artistas destacadxs», las fotos, los chips, la ceja, el nombre y el género caen a la misma altura; cambian los datos.
- `09-lado-a-lado-artistas-destacadxs.png` — los dos con «Artistas destacadxs» a la misma altura: Markosblues («Nuevo video») junto a Pimpolina, Fozco junto a la Orquesta («Nuevo audio»). La app suma la línea violeta de la fecha porque sus artistas la tienen.
- `10-lado-a-lado-artistas-de-la-semana.png` — los dos con «Artistas de la semana» a la misma altura: avatares de 64 con su nombre a la misma altura; en la app, «Nuevo audio» bajo Abril Merlot.

## Límites

- **Safari del iPhone sin probar:** todo se midió en Chrome. Las alturas son tokens y no porcentajes (OL-246); el corte del nombre usa el mismo mecanismo que el título de un evento (OL-370).
- **La tarjeta de un artista sin foto** no sale hoy en «Artistas destacadxs» (un destacado exige foto, `cargarArtistasDestacados`), pero la cubre la prueba de componente.
- **`Tarjeta.colores`** sigue sin pintarse en Inicio (lo dejó así OL-370).
- Las capturas usan los carteles públicos de `imagenes.json`, que el optimizador pidió al almacenamiento una vez; `medir` y las pruebas no salen a la red.

## Pendiente

El PR de esta rama (lo abre el gestor) y el «publica» del founder.
