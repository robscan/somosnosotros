# 538 · OL-505 · «Repisa» en código: el estilo propio de las tarjetas de @smsnstrsapp, L2 para lugares, sin línea de descripción y menos material

**Fecha:** 2026-11-02. **Rama:** `instagram-repisa` (desde `origin/main` `8c974c2a` con `origin/instagram-estilo-propio-v2`, el prototipo de OL-490
y la bitácora 522). **Quién:** operador del Gestor de cambios VIII (agente en árbol aislado; sin subagentes, council ni workflows).
**Migración:** `20261029320000_material_solo_foto.sql` (solo `create or replace` de cinco funciones con la misma firma; no toca tablas, filas ni
permisos; la aplica el gestor). **Sin variables de entorno nuevas.** **Estado:** listo para revisar; falta el iPhone del founder.

> Palabras que se repiten (cada una en una línea):
> - **Repisa**: la variante A firmada del prototipo OL-490: la figura se apoya en la línea del título, como un objeto en una repisa.
> - **L1 / L2**: el lugar sin imagen (el arco con el símbolo SN) o con su portada dentro del arco.
> - **Respaldo**: los nueve colores del sistema de Inicio; el id de la ficha elige uno cuando no hay foto o la foto es casi gris.
> - **Material**: la imagen que la tarjeta necesita y que vive en el Storage de la app (`instagram_material_propio`, `cartelDescargable`).

## El pedido

El founder firmó el 2026-10-31 la tercera vuelta del prototipo OL-490 («Continuemos con Repisa… eliminar la imagen de portada en la composición
y solo usaremos perfil; así el material necesario será menor y evitamos dejar fuera a los que no tengan portada»), la dejó en pausa esa noche y
hoy la reactivó: «Publica repisa. Te la firmo». Aceptó las recomendaciones del gestor: **lugares con L2** (el arco con su portada cuando la
tenga; L1 cuando no) y **sin la línea de la descripción** bajo el nombre. Las tarjetas que salían (`dibujarDestacado` y `dibujarPortadaSemana`,
plantilla `plantillas/destacado.tsx`, con las paletas de «Crear cartel») se reemplazan por Repisa.

## 1 · La tarjeta (commit `ccce75a8`)

**Archivos:** `src/lib/carteles/plantillas/repisa.tsx` (nueva, pura), `src/lib/carteles/dibujar.ts` (`dibujarDestacado`, `dibujarPortadaSemana`,
`coloresDeBytes`), `src/lib/instagram/ficha.ts` (`dibujarFicha`, `dibujarPortadaDeSemana`, `fichaConMaterial`, `textoDeFicha`, `RAZON`).
`plantillas/destacado.tsx` se borró (solo la usaba la cuenta); `CATALOGO` y las doce plantillas de «Crear cartel», intactas.

La plantilla es la función `dibujar("A", formato, cosa)` del prototipo pasada al código de la app, sin el SVG rasterizado aparte: todo es un
árbol de satori (las figuras son `div` con `borderRadius`: el círculo con radio de la mitad, el arco con las esquinas de arriba redondas; la foto
es un `img` con la misma forma; el contenedor de las figuras mide hasta la repisa con `overflow: hidden`, así nada pasa debajo de la línea). Usa
las fuentes de la app (`cargarFuentes` de `dibujar.ts`), `pie()` de `piezas.tsx`, `ajustar`/`ajustarRenglon`, `FORMATOS`/`MARGEN` y `TRAZO_SN`.
Puro: recibe la paleta y las imágenes ya recortadas (data URL); `cajaDeFoto(t)` y `cajasDeCarteles(s)` dicen la medida exacta de cada hueco para
que `dibujar.ts` recorte la foto a esa medida (sharp, `fit: cover`, `position: attention`, como el prototipo).

- **Artista:** su foto de perfil dentro del círculo (dos aros, `c` y `o`, y el punto de la tinta en el aro), sin portada. Arriba del nombre
  **ARTISTA DE LA SEMANA** en versalitas; el nombre con `nombreAjustado` (un renglón de 132 a 84; si no, dos parejos de 120 a 64); «Música ·
  Folk… · San Luis Potosí», la cuenta, «Próxima fecha: …» y el sello de fecha arriba a la derecha (vidrio, mes en violeta, día en negro). **Sin
  la línea de la descripción.** Sin foto legible (no debería publicarse: ver §2), el círculo de adentro en `oo` con el símbolo SN.
- **Lugar:** tres arcos con la base en la repisa y un sol de la tinta del lado libre. **L2** si la portada se puede bajar (`bajarCartel`, que
  solo baja lo de nuestro Storage) y leer; si no, **L1**: el arco de adentro en la tinta y el símbolo SN en el color de la tarjeta. **LUGAR DE
  LA SEMANA**, el nombre, «Foro · San Luis Potosí», la cuenta y la pastilla «Esta semana: N eventos» como hoy. El crédito de la portada
  (`portada_credito`, OL-491) va en el texto de la publicación (`textoDeFicha` → `conCreditoDeFoto`) **solo si la portada sale en la
  tarjeta** (lugar L2); nunca sobre la imagen. El artista ya no lleva portada: su crédito es el de siempre, «Foto: @cuenta».
- **«Esta semana»:** una barra por evento (hasta tres; con uno o dos, una o dos), la más alta del alto del cartel en 4:5 más su franja, ritmo
  0,84 · 0,92 · 1; en cada barra el cartel real recortado y su día («VIE 30») en una franja de la tinta al pie; «ESTA SEMANA EN SAN LUIS
  POTOSÍ», el título en dos renglones y los tres eventos con su día, hora **y lugar** («Vie 30 · 5:30 pm · Aurora Co-Lab», como en `A3-semana`)
  con su filete. Un cartel que no se puede bajar deja su barra en el color oscuro con el símbolo SN. Los carteles del carrusel no cambian.
- **9:16:** la misma tarjeta más alta; ningún texto en lo que tapa Instagram (250 arriba, 340 abajo). La portada de «Esta semana» también se
  puede dibujar en 9:16 (`dibujarPortadaDeSemana(s, ahora, ancho, "9x16")`), pero el contrato no cambia: el carrusel y la vista previa siguen
  en 4:5.

### Cómo se deriva el color

La misma cuenta que Inicio con los carteles (`portadasSistema.ts`), con la foto en el sitio del cartel (bitácora 522, «Cómo se calcula el color de
la foto»):

1. `coloresDeBytes`: la imagen girada por su EXIF se reduce a **16×20** con sharp (`fit: fill`) y `paletaDePixeles` (`coloresCartel.ts`) junta los
   píxeles en 12 cubos de tono de 30° y uno de grises (saturación menor de 0,2 o muy oscuros), pesando más los vivos; de los tres cubos que más
   pesan se queda el de más croma, avivado (`colores[1]`).
2. `origenDe(colores, id)`: si ese color tiene tono (canal mayor menos menor ≥ 28) es el origen; si la foto es casi gris, o no hay foto o no se
   pudo leer, el **respaldo del sistema por el id** (nueve colores; el artista y el lugar por el id de su ficha; «Esta semana» por
   `semana-<ciudad>-<primer día>`, así cada semana toca otro).
3. `paleta(origen)`: se queda el tono, la saturación entre 0,32 y 0,7 y la luz en su banda: **oscura** con tinta crema `#f4efd6` o **clara** (tonos
   de 40° a 80°) con negro `#1a1a1a`; de la base salen los escalones de las figuras (`c`, `o`, `oo`) y la tinta `f`.

Para el artista el color sale de su foto de perfil; para el lugar L2, de su portada; L1 y «Esta semana», del respaldo. El color solo sale de la
foto si la foto se ve en la tarjeta (si no se pudo recortar, respaldo). El resultado trae `color: { origen, deDonde: "foto" | "respaldo", base,
banda, tinta }` en lugar de la paleta de «Crear cartel».

## 2 · Menos material obligatorio (commit `839ff83d`)

**Qué exige ahora cada tipo de ficha para la semana de Instagram:**

| | Antes (OL-488) | Ahora (OL-505) |
|---|---|---|
| Artista | foto **y** portada propias (Storage de la app), descripción de 120 y su Instagram | **solo su foto propia**, descripción de 120 y su Instagram; la portada es opcional |
| Lugar | portada propia y descripción de 120 | **ningún material**: con portada propia sale L2, sin ella L1; descripción de 120 |
| Evento / «Esta semana» | cartel propio | igual |

**Migración** `supabase/migrations/20261029320000_material_solo_foto.sql` (solo `create or replace`, misma firma, nada se borra; la aplica el
gestor):
- `instagram_candidatos`: el artista con `instagram_material_propio(a.foto)` (sin la portada); el lugar sin `instagram_material_propio(l.portada)`.
- `instagram_semana_cambiar` y `instagram_semana_programar`: la misma comprobación (artista: su foto; lugar: nada; evento y semana: su cartel). Sus
  frases: «A esa ficha le falta material: su foto o su cartel.» y «Le falta material: foto o cartel.».
- `instagram_falta_material`: parte de la versión rápida de OL-498 (migración 310000), con el mismo plan. En `falta` del artista solo `foto` o
  `foto_ajena`; la portada que falte (vacía o de otra página) pasa a `otros` como `portada`, en los dos tipos; el lugar ya no entra por
  material (su `falta` es vacía y el filtro `cardinality(falta) > 0` lo deja fuera).
- `instagram_pedir_material`: solo se pide si falta la foto del artista (si no, «Esa ficha ya tiene su material.»); la portada que también falte se
  anota en el pedido (`falta = {foto, portada}`) para que el aviso la sugiera. A un lugar ya no se le pide. La columna y el `check` de
  `instagram_material_pedidos.falta` no cambian (siguen admitiendo `portada`).

**En la app:**
- `fichaConMaterial` (`lib/instagram/ficha.ts`): el lugar siempre; el artista con `cartelDescargable(foto)`. El trabajador ya no deja un lugar
  sin publicar por la portada; la frase del artista sin foto: «Le falta su foto en la app: no se publicó sin ella. Súbela o pídesela en
  «Falta material».» (`FRASE_SIN_MATERIAL`).
- `avisoPrevio`: «…entre lxs artistas destacadxs de la semana: **tu foto y lo que dice tu ficha**»; el lugar: «tu portada (si la tienes) y lo que
  dice tu ficha».
- «Falta material»: el resumen «N artistas con fecha se quedaron fuera por falta de foto»; `otrosDeLaFalta` (nueva, `lib/instagram/semana.ts`):
  «También le falta la descripción y su Instagram para entrar. La portada es opcional»; la hoja (`HojaMaterial`): «con su foto, cada artista
  entra solo a la semana. La portada es opcional»; «Subir yo» pide solo los huecos de `falta` (ahora la foto); «Pedírselo» explica el aviso
  «Completa tu foto y te presentamos en Instagram».
- `razonDelPedido` (el aviso y Novedades): «Completa tu foto y te presentamos en Instagram» y, si también falta la portada, «. La portada es
  opcional». Novedades (`app/novedades/consultas.ts`): el aviso se queda mientras le falte la **foto** al artista; un pedido viejo de un lugar
  o solo de portada ya no sale.
- «Cambiar» (las notas de la lista): «Solo fichas completas (foto, descripción e Instagram)…» y, en lugares, «Solo fichas con descripción (sin
  portada salen con el símbolo SN)…».

### Ajuste para casar con OL-504 (tras unir `origin/main` con el PR #631)

OL-504 dejó en `prepararDia` (`accionesSemana.ts`) el crédito de la portada para artista y lugar si había portada, y `HojaDia` lo pone en la vista
previa del texto. Con Repisa, `credito` sale de `creditoDeTarjeta` (nueva, `lib/instagram/ficha.ts`), la misma regla que usa `textoDeFicha`:
null en el artista y, en el lugar, solo si sale L2 (`cartelDescargable` de su portada). `HojaDia.tsx` no se tocó. En
`HojaDia.componentes.test.mjs` el caso del crédito pasó a un lugar L2 (Bajo Ceiba, sigue pasando) y se añadió el del artista con portada: sin
crédito, «Foto: @cuenta».

## 3 · La evidencia con fichas reales (`docs/rediseno/capturas-538/`)

`scripts/ops/auditoria-ui/instagram-repisa.mjs` empaqueta el **código de la app** (`dibujarDestacado`, `dibujarPortadaSemana`, `cajaDeFoto`,
`cajasDeCarteles`) con esbuild, toma las fichas reales que el prototipo leyó de somosnosotros.org (`prototipo/instagram-estilo-propio.tercera.json`)
y baja sus imágenes del Storage público con `fetch` (caché en `.next/cache/instagram-repisa/`; nada de `.env`, ninguna base). Cada PNG a 1080 y la
misma a 540 (`-540.png`); la revisión en `medidas.json`. **Las 12: 0 con falla** (ningún texto fuera del margen ni en lo que tapa la historia,
ninguno encimado ni cortado, ninguno sobre una foto o un cartel; tinta a 4,5:1 o más). El id de cada ficha es su clave del `.json` (el prototipo no
guardó los id reales): con los id reales, el respaldo de una foto gris o de un lugar sin portada puede tocar otro de los nueve colores.

Los colores salen idénticos a los de la tabla de la tercera vuelta (bitácora 522): la cuenta es la misma.

| Captura | Qué se ve | Color (de dónde → base · banda) | Tinta |
|---|---|---|---|
| `artista-un-leon-marinero-4x5.png` | Azul de su cielo; él al centro del círculo, los dos aros azul claro y azul hondo, el punto crema; sello «nov 7» arriba a la derecha; ARTISTA DE LA SEMANA, «Un León Marinero» en un renglón, «Música · Folk y canción de autor · San Luis Potosí», @unleonmarinero, «Próxima fecha: Sáb 7 de nov, 7:00 pm · Monterrey» y el pie | foto `#3e7096` → `#3a698d` oscura | 5,07:1 |
| `artista-un-leon-marinero-9x16.png` | Lo mismo más alto: el sello bajo la zona que tapa Instagram arriba, el texto encima de los 340 de abajo | igual | 5,07:1 |
| `artista-emilio-palomino-4x5.png` / `-9x16` | Café de la piel; su retrato en el círculo; el nombre de 33 letras en dos renglones parejos («Emilio Manuel / Palomino Santibáñez»), sin sello (sin fecha) | foto `#a67a60` → `#845c44` oscura | 5,05:1 |
| `artista-carlos-guevara-4x5.png` / `-9x16` | Foto en blanco y negro → verde Huasteca del respaldo; la foto gris en el círculo; el nombre de 32 letras en un renglón | respaldo `#c6f68d` → `#467014` oscura | 5,06:1 |
| `lugar-L2-bajo-ceiba-4x5.png` / `-9x16` | **L2**, banda clara: olivo con texto negro; las hojas de la ceiba en el arco de adentro, el sol negro a la derecha; LUGAR DE LA SEMANA, «Bajo Ceiba», «Foro · San Luis Potosí», @bajoceiba_salas | portada `#8e9157` → `#969a4f` clara | 5,83:1 |
| `lugar-L1-guarida-del-coyote-4x5.png` / `-9x16` | **L1** (sin portada): magenta; el arco de adentro crema con el símbolo SN magenta, el sol crema; sin cuenta | respaldo `#b0306a` oscura | 5,22:1 |
| `semana-4x5.png` | Azul Tangamanga; tres barras con los carteles reales (Mística, Merk Local Catrinas, Los Caligaris), su día en la franja crema; ESTA SEMANA EN SAN LUIS POTOSÍ, «Del viernes 30 de octubre / al domingo 1 de noviembre» y los tres eventos con día, hora y lugar | respaldo `#2d3fd6` → `#2637c4` oscura | 7,49:1 |
| `semana-9x16.png` | Lo mismo en 9:16 (la cuenta no la publica así hoy: ver §1) | igual | 7,49:1 |

Cada PNG se abrió (las doce en dos hojas de contacto y la de León a 540 aparte) y coincide con las `A3-*` firmadas «sin línea».

## 4 · La vista previa y la hoja del día

`/api/instagram/semana/<día>` no cambió: llama a `dibujarFicha(f, formato, ahora, ancho)` y `dibujarPortadaDeSemana(s, ahora, ancho)` como antes
(misma firma; `dibujarPortadaDeSemana` gana un cuarto parámetro opcional, el formato). `HojaDia.tsx` **no se tocó** (OL-504). `imagenDeRelleno`
(la imagen `public/sin-foto.png`) ya no hace falta: el círculo o el arco sin imagen llevan el símbolo SN vectorial; la función se quitó de
`dibujar.ts` (solo la usaba la tarjeta); el archivo `public/sin-foto.png` sigue para el resto de la app.

Comprobado con la app compilada contra el respaldo local y el recorrido de la bitácora 511 (`capturar-instagram-semana.mjs`, Chrome real,
390×844 a 2×, toques reales): las tarjetas que dibuja el servidor por la ruta de la vista previa salen con Repisa (lugar L2 con la portada
dibujada del respaldo, artistas con sus fotos de iniciales, «Esta semana» con una barra). Capturas copiadas:
- `hoja-dia-lugar-390.png`: la hoja de hoy, «Hoy · 7:00 pm · Lugar», con la tarjeta de «Museo Leonora Carrington (demo)» en mostaza (banda
  clara, texto negro): tres arcos con la portada del respaldo, el sol negro, LUGAR DE LA SEMANA, «Museo · San Luis Potosí», la cuenta y la
  pastilla «Esta semana: 2 eventos»; debajo, el porqué, «Cambiar», el aviso y «Publicar ahora». Nada de la hoja cambió.
- `hoja-dia-artista-390.png`: «Lun 12 · 7:00 pm · Artista», Ximena Urquidi (demo) en ocre con su foto en el círculo, sin sello (sin fecha).
- `hoja-dia-esta-semana-390.png`: «Jue 8 · 9:00 am · Esta semana», magenta del respaldo, una barra con el cartel del evento y «SÁB 10» en su
  franja, el título y el evento con día, hora y lugar.

Todas las comprobaciones del recorrido salen bien salvo una: «la portada: «Semana: N de M programadas»» (`23-portada-admin`), una comprobación del guion de la
bitácora 511 que ya no corresponde a la portada de Administración de hoy (desde OL-494/498 el renglón de Instagram dice «@smsnstrsapp · 6
publicadas esta semana · 5 sin material»); no la toca esta pieza. Sin errores de página ni de consola.

## Comprobaciones

| Comando | Resultado |
|---|---|
| `npm run lint` | 0 errores, 2 avisos de antes (`capturar-inicio-vacio.mjs`, `VisorImagen.componentes.test.mjs`) |
| `npm run typecheck` | bien |
| `npm test` | 321 archivos, **5 158 pruebas**, todas bien (nuevas: `carteles/destacado.test.ts` reescrita, 19; `instagram/ficha.test.ts`, 5; casos nuevos en `instagram/semana.test.ts`) |
| `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db` | 131 migraciones aplicadas, **3 076 comprobaciones, 0 fallaron** (nueva `instagram-material-solo-foto.test.mjs`; adaptadas `instagram-material`, `instagram-semana` y `instagram-sin-material-rapida`) |
| `npm run inventario` | sin novedades |
| `npm run medir` | 63 pantallas × 4 anchos, sin novedades (s46 a s49 de Instagram iguales) |
| `npm run test:componentes` | **802 de 802** (`HojaMaterial` con los datos nuevos: solo la foto, sin hueco de portada) |
| `node scripts/ops/auditoria-ui/instagram-repisa.mjs` | 12 tarjetas, 0 con falla |
| Tras unir `origin/main` (#631) y el ajuste de OL-504 | lint 0 errores; typecheck bien; `npm test` 5 174 de 5 174; `test:componentes` 806 de 806 (el lugar L2 con crédito y el artista con portada sin él); `test:db` 3 076, 0 fallaron |

`instagram-sin-material-rapida.test.mjs` compara la función rápida con una copia de la lenta: la copia ahora lleva la misma regla de OL-505
(`conReglaOL505`, cuatro cambios de texto que la prueba comprueba antes de crear la función), así la comparación fila por fila sigue valiendo.

## Desviaciones

- **El lugar sin portada ni material, también al «Cambiar» y al «Programar»** (no solo en candidatos): es la consecuencia de «el lugar no
  necesita material»; el evento y «Esta semana» siguen pidiendo su cartel.
- **«Pedírselo» guarda la portada como sugerencia** (`falta = {foto, portada}`) y el aviso la nombra opcional; Novedades lo quita en cuanto llega
  la foto. «Subir yo» pide solo la foto (no ofrece la portada opcional).
- **La línea de cada evento de «Esta semana» lleva su lugar** («Vie 30 · 5:30 pm · Aurora Co-Lab»), como la `A3-semana` firmada; antes no.
- **`textoDeFicha`**: el crédito de la portada (OL-491) ya no va en el texto del artista (su tarjeta no lleva portada) y en el lugar solo si sale
  L2. Lleva un cuarto parámetro opcional (`supabaseUrl`) para probarlo.
- **El nombre de Emilio Palomino** (33 letras) sale en dos renglones parejos; la bitácora 522 decía «en un renglón» pero su captura `A3` con la
  misma cuenta también lo parte. La prueba de un renglón usa el de Carlos (32).
- Se arreglaron dos errores de tipos del guion del prototipo (`instagram-estilo-propio.tsx`, sin cambiar lo que dibuja): `typecheck` lo incluye.
- La portada de «Esta semana» se baja dos veces al publicar el carrusel (los tres carteles para la portada y luego para el carrusel); son 3
  descargas más del Storage propio por semana.

## Preguntas (por confirmar)

1. **OL-504** (crédito de la foto en `HojaDia`): si esa pieza enseña en la hoja el crédito de la portada, para el artista ya no aplica (sale su foto
   de perfil, «Foto: @cuenta»), y en el lugar solo con L2. Hay que alinearla con `textoDeFicha` al unir las dos.
2. ¿«Subir yo» ofrece también la portada del artista como opcional, o basta con la foto?
3. Con un solo evento en «Esta semana», el título dice «Del sábado 10 al sábado 10 de octubre» (`tituloSemana`, de antes); ¿«El sábado 10 de
   octubre»?
4. El guion de la bitácora 511 tiene una comprobación vieja de la portada de Administración (arriba): ¿se actualiza aparte?

## Archivos

Nuevos: `src/lib/carteles/plantillas/repisa.tsx`, `src/lib/instagram/ficha.test.ts`, `supabase/migrations/20261029320000_material_solo_foto.sql`,
`supabase/tests/pg/instagram-material-solo-foto.test.mjs`, `scripts/ops/auditoria-ui/instagram-repisa.mjs`, `docs/rediseno/capturas-538/` (12
tarjetas a 1080 y a 540, 3 capturas de la hoja, `medidas.json`) y esta bitácora. Borrado: `src/lib/carteles/plantillas/destacado.tsx`. Cambiados:
`src/lib/carteles/{dibujar.ts,destacado.test.ts}`, `src/lib/instagram/{ficha,destacado,semana,semana.test}.ts`, `src/lib/redes/trabajar.ts`,
`src/app/admin/instagram/{accionesSemana.ts,semana.ts,RenglonFalta.tsx,SemanaInstagram.tsx}`, `src/app/novedades/consultas.ts`,
`src/components/instagram/{HojaMaterial.tsx,HojaMaterial.componentes.test.mjs}`, `supabase/tests/pg/{instagram-material,instagram-semana,
instagram-sin-material-rapida}.test.mjs`, `scripts/ops/auditoria-ui/prototipo/instagram-estilo-propio.tsx` y `docs/ops/OPEN_LOOPS.md`.
