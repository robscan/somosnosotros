# 391 · Tarjetas «título + cartel» en Inicio y colores del cartel guardados (OL-360)

2026-10-09 · rama `tarjetas-titulo-cartel` · operador (Agent, árbol aislado).

Firmado por el founder (2026-10-09): «aprobado […] tarjetas: título + cartel y degradado vivo»; después, solo en Inicio. Referencia: el prototipo
`docs/rediseno/prototipos/barra-ahora.html` con «Tarjetas: título + cartel» y la bitácora 388.

## Qué cambia

- **Colores del cartel con el evento.** Migración `20261009120000_colores_cartel.sql` (solo añade):
  - columna `eventos.colores_cartel jsonb` (null = sin calcular);
  - restricción `eventos_colores_cartel_forma`: cuatro `#rrggbb` o null;
  - función `eventos_colores_cartel_al_cambiar()` y disparador `before update of imagen`: un cartel nuevo que llega sin sus colores deja los colores en null (no hereda los del anterior).
  - Inicio lee con selects directos (`cargarAgenda.ts`, `personas/consultas.ts`): se añadió la columna al select; ninguna función SQL cambia.
- **Dónde se calculan.**
  - Alta y editar por pasos: el teléfono los lee del archivo mientras sube (`coloresDeArchivo`, `useLeerCartel`), van en el campo `colores_cartel` y la misma acción (`crearEvento`, `actualizarEvento`) los guarda tras guardar el evento, con `imagen = la subida`.
  - Creador de cartel: el cartel lo dibuja el servidor, así que sus colores salen del mismo dibujo con `sharp` (`coloresCartelServidor.ts`) y van en la misma escritura que la imagen. Con eso queda cubierta también la foto propia: lo que se guarda es el cartel final.
  - Eventos que ya tenían cartel: `scripts/ops/colores-cartel.mjs` (ensayo por defecto; `--escribir` guarda). No se corrió contra producción.
- **Tarjeta «título + cartel»** (`Destacados` con `titular`, solo desde `CarrilEventosCliente`: Seleccionados/Destacados, Esta semana, Festivales y exposiciones, Nuevos, Más adelante, Tus planes). Agenda, Lugares y Artistas no cambian.
  - Arriba, la franja con el título corto (hasta tres líneas) sobre `degradadoTarjeta`: el color más vivo del cartel hecho legible (`legible`, luminancia ≤ 0,12, 6:1 con blanco) con dos luces.
  - Abajo, el cartel recortado desde arriba, con corte limpio.
  - Sin cartel: toda la tarjeta es de título, con la paleta propia, «Hoy» abajo a la izquierda y el símbolo SN (18 px) abajo a la derecha.
  - Sin colores guardados, o si la foto es la portada del lugar: paleta propia. La tarjeta nunca pide la imagen para calcularlos.
  - Debajo, solo cuándo (violeta) y dónde. El título completo va en el `aria-label` del enlace.
  - El botón de asistencia y el rótulo (Hoy, Festival, Te interesa…) siguen.
- **Título corto** `src/lib/tituloCorto.ts` con las reglas de la 388. El nombre del festival de un acto sale de los eventos ya cargados (`nombreDeFestival`). Las historias no lo usan (no repetían esa lógica).

## Lo que decidí yo

- **Todas las tarjetas de eventos de Inicio con la medida grande** (165×248 a 390, 190×285 desde 1048, tokens que ya existen). La mediana (220×132, apaisada) no admite franja y cartel. El prototipo usa 200 px en «Esta semana», pero no hay token para eso. Los esqueletos de esos carriles pasaron a «grande» sin la línea del título.
- **Una sola tarjeta no se estira a lo ancho** (la regla «sola» de OL-226 no aplica a la tarjeta de título): mantiene 165.
- **Los colores solo valen si la foto es el cartel del propio evento.** Con la portada del lugar o el cartel de un acto (festival sin imagen), se usa la paleta propia.
- **Guardado aparte, en la misma acción.** El RPC de guardado no se tocó. Un `update` posterior guarda los colores; sube `actualizado_en`, pero no encola avisos (el disparador de avisos solo mira fecha y sitio).
- **Sin sombra de texto en la franja.** El inventario la marcaba como color literal y el fondo ya da 6:1. `overflow-wrap: anywhere` para palabras largas («INCONSCIENTE»).
- **`medidasEnDuro` 332 → 333:** los 18 px del símbolo SN, que pidió el founder; no hay token de ese alto.

## Medición

`npm run medir`: Inicio pasó de 367/369 a 396/398 nodos (con sesión, de 376/378 a 405/407): +29 por la portada, la franja y su texto en cada tarjeta (y el símbolo en las que no tienen cartel), contra el `<b>` de antes. Presupuestos de `01-inicio` y `s01-inicio-sesion` ajustados a lo medido.

## Pruebas

- `tituloCorto.test.ts` (8).
- `coloresCartel.test.ts`: `legible`, `degradadoTarjeta`, `comoPaleta`.
- `destacados.test.ts`: corto y colores; colores null con la portada del lugar o mal formados.
- `Destacados.componentes.test.mjs`, 3 nuevas: 165×248 y corte limpio, sin título repetido, `aria-label`, luminancia del fondo ≤ 0,12; sin colores con paleta propia; sin cartel con «Hoy» y SN de 18 px; festival con su rótulo; una sola tarjeta sin estirarse.
- `Inicio.componentes.test.mjs`: el rótulo se busca dentro de la portada.
- `supabase/tests/pg/colores-cartel.test.mjs`: forma, limpieza al cambiar la imagen y guardado en la misma escritura.

## Toques reales y capturas (`docs/rediseno/capturas-391/`, 390×844 y 320, respaldo local con sesión)

Contra `next build` + `next start` con el respaldo local (datos inventados; carteles del prototipo en lugar de las imágenes). Clic por coordenadas, con `elementFromPoint` comprobado:

- La primera tarjeta de «Seleccionados para ti» mide 165×248 y abre `/eventos/master-class-9-festival-de-cine-uaslp`.
- El botón de asistencia de «Esta semana» pasó de `aria-pressed=false` a `true`.

Capturas:

- `01-destacados-con-colores.png`:
  - «Tus planes»: «SAN LUIS POTOSÍ EN LA CRISTIADA» en violeta (paleta propia: sin colores guardados) y «LXS COLOCAOS» en azul pizarra, con los colores guardados.
  - Abajo, «MASTER CLASS - 9° FESTIVAL DE…» en verde oliva oscuro sobre su cartel negro y «DESIERTO» en azul petróleo.
  - Debajo de cada tarjeta, solo la fecha violeta y el lugar.
- `02-esta-semana-sin-cartel.png`: «Esta semana» con «TALLER DE GRABADO EN LINÓLEO» y «DELIRIUM POLLUM» (paletas propias), el rótulo «Sesión 1 de 3» y el botón en la esquina.
- `07-sin-cartel-simbolo.png`: «MACARIO, XANTOLO CAMINO AL…» sin cartel, toda de título en granate, con «Hoy» abajo a la izquierda y el símbolo SN abajo a la derecha. A su lado, «SUSURROS DEL INCONSCIEN…» cortado a tres líneas.
- `03-festival-con-franja.png`: «FESTIVAL DE CINE DE INVIERNO» en su franja con el cartel debajo y el rótulo «Festival». Debajo, «Del 16 al 18 de oct» y «Varias sedes · 3 actividades». El festival del respaldo está oculto; para esta captura se hizo visible en una copia del respaldo en el scratchpad, no en el repo.
- `04-destacados-a-320.png`, `05-esta-semana-a-320.png`: lo mismo a 320; la segunda tarjeta asoma y no hay cortes.
- `06-voy-tocado.png`: después del toque, el botón queda en verde.

## Fuera de esta pieza

- El círculo sin cartel de la fila «Ahora» se deja como está.
- No se rellenaron los colores en producción ni se aplicó la migración: los dos van al gestor.
- **Orden obligatorio: la migración antes del despliegue.** Sin la columna, el select de `cargarAgenda` fallaría y Agenda e Inicio se quedarían sin eventos.
- El marco de un festival publicado con su programa (`publicarPrograma`) no guarda colores al publicarse; los pone el relleno.
