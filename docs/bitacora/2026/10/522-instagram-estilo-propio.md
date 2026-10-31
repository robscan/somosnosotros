# 522 · Estilo propio Bauhaus para las publicaciones de Somos Nosotrxs en Instagram (prototipo, OL-490)

**Fecha:** 2026-10-29. **Rama:** `instagram-estilo-propio`, base `origin/main` (`5bd1ec60`). **Operador:** agente de la pieza (Gestor VII),
sin otros agentes. **Estado:** **prototipo, espera la firma del founder.** Sin código de la app ni migración. Prototipo:
`docs/rediseno/prototipos/instagram-estilo-propio.html` (1,9 MB, todo adentro). Capturas: `docs/rediseno/capturas-522/` (27 tarjetas PNG
reales de 1080 de ancho, 18 capturas del prototipo, 7 recortes de Inicio y `medidas.json`).

## El pedido

- Founder, 29 de octubre, al ver las tarjetas de artista, lugar y «Esta semana» de OL-477/479 (hechas con las plantillas de «Crear cartel»):
  «me parece muy bien que hayas usado nuestras plantillas… pero te quiero pedir que continúes con la línea de diseño que ya habíamos definido y
  que está reflejada en la sección de Inicio: este corte Bauhaus que hemos utilizado con figuras geométricas basadas en pregnancia. Revisa cuál
  es ese estilo, sobre todo las tonalidades. Sin eliminar los estilos que creaste para cuando el usuario sube un evento sin cartel, creando un
  nuevo estilo propio, específico para nosotros, reemplaza esas plantillas. Este estilo es específico para las publicaciones que hagamos desde
  nuestra cuenta».
- Lo que no se toca: las doce plantillas de «Crear cartel» (`plantillas/index.ts`, `CATALOGO`) para eventos sin cartel de la gente. Este
  estilo es solo para lo que publica @smsnstrsapp.

## Cómo es el estilo de Inicio (lo que se revisó)

Fuentes: `src/lib/portadasSistema.ts`, `components/inicio/PortadaSistema.tsx` y su CSS, `TarjetaEvento.module.css` (el sello de fecha),
bitácoras 405 y 446, y la **maqueta real de Inicio** (`maqueta-pantalla.mjs --solo=inicio-slp` contra el respaldo local, con las fuentes de la
compilación): las seis portadas del sistema que hoy pinta Inicio, recortadas en `capturas-522/inicio-*.png`.

- **Un color plano por tarjeta** que sale del color más vivo del cartel (`colores[1]`, `paletaDePixeles` sobre 16×20). Se queda el tono; la
  saturación va de 0,32 a 0,7 (medios tonos, como lawsofux); la luz se lleva a una de dos bandas:
  - **oscura** (luminancia 0,13 o menos) con tinta y figura de adelante **crema `#f4efd6`** (5:1 o más);
  - **clara** (0,30 o más) con **negro `#1a1a1a`** (5,8:1 o más): los amarillos, mostazas y olivos (tono de 40° a 80°), el amarillo con negro
    de los carteles de la Bauhaus.
- **Escalones del mismo color** para las figuras: claro `c` (la base con 34 % de crema; 50 % en la clara), oscuro `o` (28 % de negro; 22 %),
  más oscuro `oo` (50 %; 42 %) y la tinta `f`.
- **Respaldo** (cartel gris o sin cartel), elegido por el id: Cantera `#ff6f61`, Real de Catorce `#b5541c`, Xantolo `#ffd23f`, Huasteca
  `#c6f68d` y `#0f7c6c`, Media Luna `#0077b6`, Tangamanga `#2d3fd6`, Xantolo `#6d34c8`, Cantera `#b0306a`.
- **Composición:** la figura se apoya en la línea del título «como un objeto en una repisa», alineada con el margen; deja libre la esquina del
  sello (el espacio libre tiene forma de L y gana la caja más grande); debajo de la línea no entra nada. Tres arreglos (Anidados, Retícula,
  Ritmo); la figura dice la clase (círculo festival, cuadrado expo, triángulo taller).
- **Sello de fecha:** vidrio blanco, el mes en el violeta de la app `#6d34c8`, el día grande en negro.
- **Letra:** Bricolage Grotesque condensada (ceja en mayúsculas espaciadas, título a 800).

## El estilo propio «Somos Nosotrxs» (lo que se propone)

- **Color:** la misma cuenta, `paleta(origenDe(colores, id))`, con **la portada de la ficha en el sitio del cartel**. Sin portada, el respaldo
  del sistema por el id de la ficha; la semana, por el id de la semana (`semana-<ciudad>-<fecha>`): cada semana toca otro.
- **Figuras (una por pieza, sin choque con las de Inicio):** **artista = círculo** (como su avatar en la app), **lugar = arco** (la puerta),
  **«Esta semana» = barras** (una por día, el Ritmo de Inicio). La foto de la persona o la portada del lugar van **dentro** de la figura; sin
  foto, el **símbolo SN** en su lugar.
- **Texto, abajo y del color de la tinta:** ceja (disciplina o tipo · ciudad), el nombre en la condensada negra, la cuenta, la próxima fecha o
  la pastilla «Esta semana: N eventos» (tinta de fondo, base de letra), y el pie de «Crear cartel» (`pie()`: símbolo SN y somosnosotrxs.org)
  en la tinta. El sello de fecha de Inicio arriba (artista con fecha y semana).
- **Nombre:** en un renglón mientras quepa a 84 px o más; si no, dos renglones parejos de 120 a 64. Medido con `medir.ts` en 952 de ancho
  (tabla en «Medida de nombres»): 7 a 34 letras en un renglón (de 132 a 84 px); el peor caso de 32 letras en mayúsculas («ORQUESTA MEXICANA DE
  MÚSICA MAYA») y todos de 37 a 64 letras, en dos renglones; **ninguno cortado, ni el de 64**.
- **Historia 9:16:** la misma tarjeta, más alta: ningún texto en lo que tapa Instagram (250 arriba, 340 abajo); las figuras sí pueden pasar.

### Los colores de los casos (medidos en las tarjetas)

| Caso | Origen | Base · banda | Tinta | Figuras (claro · oscuro · más oscuro) | Contraste del texto |
|---|---|---|---|---|---|
| Valeria Quiroz (portada cálida, terracota) | portada `#c03e23` | `#b43a21` oscura | `#f4efd6` | `#ca785f` · `#822a18` · `#5a1d11` | 5,09:1 |
| Teatro de la Paz (portada fría, verde azulado) | portada `#2b6066` | `#2d656c` oscura | `#f4efd6` | `#719490` · `#20494e` · `#173336` | 5,69:1 |
| Museo Leonora Carrington (su sol amarillo) | portada `#dfb34a` | `#dfb349` clara | `#1a1a1a` | `#ead190` · `#ae8c39` · `#81682a` | 8,85:1 |
| Museo del Ferrocarril (nombre largo) | portada `#583793` | `#583793` oscura | `#f4efd6` | `#8d76aa` · `#3f286a` · `#2c1c4a` | 7,62:1 |
| Aaron Cadena (sin portada ni foto) y «Esta semana» | respaldo Real de Catorce `#b5541c` | `#a04d1c` oscura | `#f4efd6` | `#bd845b` · `#733714` · `#50270e` | 5,08:1 |
| Variante C (cualquiera) | — | fondo crema `#f4efd6` | `#1a1a1a` | la base y sus oscuros | 15,05:1 |

El sello: negro sobre blanco 17,4:1, violeta sobre blanco 7,06:1.

## Las tres variantes

- **A · «Repisa» (recomendada).** La portada del sistema hecha tarjeta: color plano de la portada, la figura apoyada en la línea del título y
  alineada con el margen, libre la esquina del sello. Artista: dos aros del mismo color, la foto adentro y el punto crema del anidado. Lugar:
  tres arcos que comparten la base, la portada adentro y un sol pequeño en la tinta. Semana: tres barras que crecen con el día al pie.
- **B · «Cruce».** Cambia solo la composición: la figura grande se sale por la derecha (el arco, por arriba) y una barra translúcida la cruza en
  la repisa (el cruce toma otro tono); un triángulo o un sol crema de contrapeso; el sello al lado contrario. Semana: barras que cuelgan del
  borde de arriba hasta la barra. Más cartel; se aleja de Inicio (allá nada se sale del borde) y la cara puede quedar bajo la barra.
- **C · «Papel».** Cambia solo el color: composición de A, fondo crema del sistema, el color de la portada en las figuras y el texto en negro.
  Cuadrícula de perfil pareja; la familia con Inicio se nota menos (allá la portada **es** el color) y los amarillos se apagan sobre el crema.

## La recomendación

**A · «Repisa».** Es la que se reconoce como Inicio sin copiarlo: mismos tonos (la misma cuenta `paleta()`), misma regla de figura sobre la
repisa, mismo sello de fecha, misma tinta crema o negra.
La foto va dentro de la figura, y cada artista o lugar se ve distinto por el color de su portada, sin inventar color.
Es la más simple de las tres (una figura y un acento) y la que mejor aguanta la cuadrícula del perfil.
B se aleja de Inicio y arriesga la cara; C apaga el color, que es lo que distingue cada tarjeta.

## El prototipo

`docs/rediseno/prototipos/instagram-estilo-propio.html`, armazón de propuestas (hecho para esta pieza siguiendo el armazón del gestor; nada de
`privado/` en el repo). Siete piezas en la primera fila (Artista 4:5 · Lugar 4:5 · Esta semana 4:5 · Historia 9:16 · Casos límite · Medida de
nombres · Inicio hoy); en la segunda, Hoy · A ★ · B · C. Cada vista: la tarjeta (JPEG de 540), su revisión, sus colores con su valor y, al
lado, dos portadas reales de Inicio de la misma banda. Anchos 320 · 390 · 430 · 1280 (desde 900, la tarjeta a la izquierda y lo demás a la
derecha). Notas con qué es, qué reutiliza, por qué y riesgos; las preguntas abajo. Recuerda la vista en la dirección (`#artista/A`).

**Cómo se hizo**
- `scripts/ops/auditoria-ui/prototipo/instagram-estilo-propio.tsx` dibuja con **satori y sharp, las cinco instancias de Bricolage**,
  `paleta`/`origenDe`/`respaldoDe`/`CREMA`/`NEGRO`/`contraste` (`portadasSistema.ts`), `paletaDePixeles` (`coloresCartel.ts`),
  `ajustar`/`ajustarRenglon` (`medir.ts`), `renglones` y `pie` (`plantillas/piezas.tsx`), `FORMATOS`/`MARGEN` (`tokens.ts`) y `TRAZO_SN`, sin
  cambiar ninguno. Las figuras y la foto (recortada con `clipPath`) van en un SVG recortado en la repisa; el texto, encima con satori.
- `instagram-estilo-propio.mjs` lo empaqueta con esbuild, toma las fichas del respaldo (`RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`,
  fotos dibujadas, nada de la red), escribe las PNG y arma el HTML desde `instagram-estilo-propio.plantilla.html`. `--solo=A` dibuja una
  variante; `--colores` lista el color de cada portada del respaldo (con él se eligieron la cálida y la fría: Leonora, que se pensó fría, da
  amarillo por su sol y quedó como el caso de la banda clara).
- `scripts/ops/auditoria-ui/capturar-instagram-estilo-propio.mjs` recorre el prototipo en el Chrome de la Mac con **toques reales** (clic de
  Playwright en el centro de cada chip), lee el medidor y guarda las capturas del teléfono a 2×.

## Verificación

- **Las 27 tarjetas** (`revisar`, con las cajas que da satori): ningún texto fuera del margen ni en lo que tapa la historia, ninguno encima de
  otro, ninguno cortado con «…», todo el texto a 4,5:1 o más (el más bajo, crema sobre `#a04d1c`, 5,08:1). 0 con falla de 27
  (`capturas-522/medidas.json`).
- **Medidor del prototipo**, en las 16 vistas recorridas y a 320: 0 textos cortados, 0 desbordes, 0 toques menores de 44, 0 tarjetas con falla;
  profundidad 5 como mucho. Las notas se pliegan y se abren. **Sin errores en la consola.**
- Es prototipo: no corrí `lint`/`typecheck`/`test` de la app porque no cambia; el `.tsx` es del prototipo y lo compila esbuild.

## Las capturas (`docs/rediseno/capturas-522/`), cada una abierta

**Inicio hoy (maqueta real, respaldo local):** `00-inicio-festivales-y-expos.png` (el carril: «Un mundo para mí» en mostaza con su retícula de
cuadros y «Reflejo atemporal» en amarillo con su ritmo, ambas con título negro y sello de fecha); `00-inicio-tus-planes.png` (un evento con
foto junto al taller de grabado en olivo con sus triángulos anidados); `inicio-festival.png` (Festival de Cine de Invierno, magenta `#b0306a`,
diana anidada, título crema), `inicio-festival-ritmo.png` (KOWAIFEST, vino `#821729`, hilera de círculos), `inicio-expo.png`,
`inicio-expo-ritmo.png`, `inicio-taller.png` (recortes a 3× de cada portada, sin la barra encima).

**Tarjetas A · Repisa:** `A-artista-4x5` (terracota; dos aros, la foto de Valeria adentro y el punto crema; sello «oct 16» arriba a la derecha;
nombre en un renglón a 132; fecha y pie en crema) · `A-lugar-4x5` (verde azulado; tres arcos con la portada del Teatro adentro y un sol crema;
pastilla crema «Esta semana: 2 eventos») · `A-semana-4x5` (cobre del respaldo; tres barras Vie 9 · Sáb 10 · Dom 11, la última crema con el día
en negro; sello «oct 9–11»; título en dos renglones; tres eventos con filete) · `A-artista-9x16`, `A-lugar-9x16`, `A-semana-9x16` (lo mismo más
alto; el sello y todo el texto entre 266 y 1580) · `A-clara-4x5` (Leonora: amarillo con figuras y texto negros, la portada en el arco) ·
`A-sinportada-4x5` (Aaron Cadena: aros de cobre y el símbolo SN crema al centro) · `A-largo-4x5` (Ferrocarril, violeta: el nombre en dos
renglones parejos a 120, el arco se achica).

**Tarjetas B · Cruce:** `B-artista-4x5` (el círculo con la foto se sale por la derecha, triángulo crema a la izquierda, barra oscura translúcida
que lo cruza; sello a la izquierda) · `B-lugar-4x5` (arco que se sale por arriba a la derecha, sol crema a la izquierda, la barra cruza la base
del arco) · `B-semana-4x5` (barras que cuelgan del borde hasta la barra; sello a la derecha) · `B-artista-9x16`, `B-lugar-9x16`,
`B-semana-9x16` · `B-clara-4x5` (sol negro y arco con la portada) · `B-sinportada-4x5` (el SN en el círculo que se sale) · `B-largo-4x5`.

**Tarjetas C · Papel:** `C-artista-4x5` (fondo crema, aros terracota, texto negro, punto negro) · `C-lugar-4x5` (arcos verde azulado sobre crema,
sol negro, pastilla negra) · `C-semana-4x5` (barras cobre, cobre oscuro y negra) · `C-artista-9x16`, `C-lugar-9x16`, `C-semana-9x16` ·
`C-clara-4x5` (arcos amarillos sobre crema: el amarillo se apaga) · `C-sinportada-4x5` · `C-largo-4x5`.

**El prototipo (teléfono a 2×):** `10-artista-hoy` (la tarjeta de hoy, durazno, de referencia) · `11-artista-A` (la tarjeta, «Revisado…», sus
seis colores y las dos portadas de Inicio) · `12-artista-B` · `13-artista-C` · `14-lugar-A` · `15-lugar-B` · `16-lugar-C` · `17-semana-hoy`
(la portada de papel de hoy) · `18-semana-A` · `19-semana-B` · `20-semana-C` · `21-historia-A` (la historia de Valeria arriba) ·
`22-limites-A` (banda clara, sin portada y nombre largo con su explicación) · `23-nombres` (la tabla: ninguno cortado) · `24-inicio` (las
portadas de Inicio en cuadrícula) · `25-artista-A-320` (a 320, sin desborde) · `26-artista-A-1280` (escritorio con las notas plegadas: la
tarjeta a la izquierda, colores y familia a la derecha) · `27-historia-A-1280` (las tres historias lado a lado).

## Plan de código tras la firma

1. **`src/lib/carteles/plantillas/somos.tsx`** (nueva): `arbolSomos(t: Destacado, P: PaletaPortada)` y `arbolSomosSemana(s, P, formato)`,
   puras, con el código de este prototipo (figuras en SVG recortadas en la repisa, texto con `renglones`, `pie()` en la tinta, sello de fecha).
   Se dibujan con la variante firmada; sin `elegirPaleta`.
2. **`src/lib/carteles/dibujar.ts`**: `dibujarDestacado` y `dibujarPortadaSemana` (los que usa `src/lib/instagram/ficha.ts` para la cuenta)
   pasan a `somos.tsx`: el color con `paletaDePixeles` de la portada (16×20 con sharp) → `origenDe` → `paleta`; sin portada, `respaldoDe(id)`;
   la semana, por su id. «Esta semana» suma su 9:16 si el founder lo quiere (pregunta 4).
3. **`plantillas/destacado.tsx`** se retira (solo lo usaba la cuenta). **`CATALOGO` y las doce plantillas de «Crear cartel», intactas.**
4. **Pruebas** (`destacado.test.ts` adaptada): con las cajas de satori, ningún texto fuera de su zona ni encimado; contraste de 4,5:1 o más en
   toda la tinta; nombres de hasta 64 letras sin cortar (y el de 32 en mayúsculas); sin foto, el símbolo SN; mismo id → mismo color.
5. Sin migración. Lo dibuja el servidor como hoy; solo cambia la forma.

## Preguntas al founder

1. ¿Firmas **A · «Repisa»**, con qué cambios?
2. Figuras: ¿**artista = círculo, lugar = arco, semana = barras**? (En Inicio el círculo es el festival; aquí es la persona, como su avatar).
3. ¿El sello de fecha va también en la tarjeta del lugar cuando tiene eventos (su próximo día), o solo en el artista y en la semana?
4. ¿«Esta semana» lleva también historia 9:16 (hoy no la tiene), y el evento del día se queda con su cartel tal cual?

## Tercera vuelta: Repisa con fotos reales y sin portada (2026-10-31)

**Rama:** `instagram-estilo-propio-v2` (desde `origin/instagram-estilo-propio`, con `origin/main` unido; `OPEN_LOOPS.md` resuelto con
`resolver_ol.py`). **Operador:** agente de la pieza (Gestor VII), sin otros agentes. **Estado:** prototipo, espera la firma del founder. Sin
código de la app ni migración. Solo la variante A.

Founder (2026-10-31): «Continuemos con Repisa como lo habías planeado. Vamos a eliminar la imagen de portada en la composición y solo usaremos
perfil; así el material necesario será menor y evitamos dejar fuera a los que no tengan portada». Sigue en pie la regla del 29 de octubre: todo
con fotos reales, nada de siluetas.

### Qué cambió

- **Sin portada en el artista.** Su **foto de perfil real** va dentro del círculo (los dos aros y el punto crema de siempre) y **el color de la
  tarjeta sale de esa misma foto**; si la foto es casi gris (blanco y negro, por ejemplo), sale del respaldo del sistema por su id.
- **El lugar en dos opciones**, para que el founder elija:
  - **L1:** el arco sin ninguna foto. El arco de adentro va en la tinta (crema, o negro en la banda clara) y el **símbolo SN en el color de la
    tarjeta** al centro. El color sale del respaldo del sistema por el id: L1 no necesita ninguna imagen.
  - **L2:** el arco con la portada del lugar y el color de ella. Sin portada no hay L2: se queda como L1.
- **La razón de la publicación** en versalitas arriba del nombre: ARTISTA DE LA SEMANA, ARTISTA DESTACADO, LUGAR DE LA SEMANA, LUGAR DESTACADO;
  en la semana, ESTA SEMANA EN SAN LUIS POTOSÍ.
- **La línea opcional** bajo el nombre: la primera oración de la descripción de la ficha si cabe en 90 letras; si no, cortada en la última palabra
  que cabe, con «…» (`fraseDe`). Cada caso con y sin ella. Si la ficha no tiene descripción (Teatro de las Artes), va sin línea.
- **«Esta semana» real:** del viernes 30 de octubre al domingo 1 de noviembre en San Luis Potosí, con los carteles reales de tres eventos de la
  agenda pública (Cultura Mística en Aurora Co-Lab; Merk Local edición Catrinas en el Museo Francisco Cossío; Los Auténticos Decadentes y Los
  Caligaris en el Parque Tangamanga II). La barra más alta mide lo que el cartel en 4:5 más su franja, así el cartel casi no se recorta.
- Las fichas se leyeron de las páginas públicas de somosnosotros.org y las imágenes se bajan del Storage público con `fetch`; nada de `.env`
  (`scripts/ops/auditoria-ui/prototipo/instagram-estilo-propio.tercera.json`).

### Cómo se calcula el color de la foto

La misma cuenta que Inicio con los carteles (`portadasSistema.ts`), con la foto de perfil (o la portada en L2) en el sitio del cartel:

1. La imagen se reduce a 16×20 con sharp y `paletaDePixeles` (`coloresCartel.ts`) junta los píxeles por tono en 12 cubos de 30° más uno de
   grises (saturación menor de 0,2 o muy oscuros); pesan más los vivos. De los tres cubos que más pesan se queda el de más croma, avivado
   (`colores[1]`).
2. `origenDe` lo toma si tiene tono (diferencia entre su canal mayor y el menor de 28 o más). Si no, la foto es «muy neutra» y el color es el
   respaldo del sistema por el id (nueve colores: Cantera, Real de Catorce, Xantolo, Huasteca, Media Luna, Tangamanga…).
3. `paleta()` se queda el tono, lleva la saturación a 0,32–0,7 y la luz a su banda: **oscura** (luminancia 0,13 o menos) con tinta crema
   `#f4efd6`, o **clara** (0,30 o más; tonos de 40° a 80°: amarillos, mostazas, olivos) con negro `#1a1a1a`. De esa base salen los escalones de
   las figuras: claro (base con crema), oscuro y más oscuro (base con negro).

| Caso | De dónde | Origen → base · banda | Figuras (claro · oscuro · más oscuro) |
|---|---|---|---|
| Un León Marinero | foto (cielo azul) | `#3e7096` → `#3a698d` oscura | `#7997a6` · `#2a4c66` · `#1d3547` |
| Hunik | foto (turquesa) | `#007c89` → `#156f78` oscura | `#619b98` · `#0f5056` · `#0b383c` |
| Ifigenia Muluk | foto (rojo de la blusa y los labios) | `#8f0f38` → `#86183b` oscura | `#ab6170` · `#60112a` · `#430c1e` |
| Kawasound | foto (rojo oscuro) | `#3f180d` → `#7f301a` oscura | `#a7715a` · `#5b2313` · `#40180d` |
| Eva D Santos | foto (olivo de la pared) | `#bfba6b` → `#beb969` **clara** (texto negro) | `#d9d4a0` · `#949052` · `#6e6b3d` |
| Emilio Manuel Palomino Santibáñez | foto (la piel) | `#a67a60` → `#845c44` oscura | `#aa8e76` · `#5f4231` · `#422e22` |
| Carlos Alejandro Guevara Requena | **respaldo** (foto en blanco y negro) | `#c6f68d` → `#467014` oscura | `#819b56` · `#32510e` · `#23380a` |
| Teatro de las Artes L2 | portada (verde) | `#284f3a` → `#33664b` oscura | `#75957a` · `#254936` · `#1a3326` |
| Caja Real L2 | portada (cantera) | `#a06c47` → `#865b3c` oscura | `#ab8d70` · `#60422b` · `#432e1e` |
| Museo Federico Silva L2 | portada (cielo) | `#4d80c1` → `#3866a1` oscura | `#7895b3` · `#284974` · `#1c3351` |
| Bajo Ceiba L2 | portada (hojas) | `#8e9157` → `#969a4f` **clara** | `#c5c593` · `#75783e` · `#57592e` |
| L1 (los cinco lugares) | respaldo por el id | Teatro de las Artes `#a04d1c`; Caja Real, Federico Silva y La Guarida `#b0306a`; Bajo Ceiba `#bd2f21` | — |
| Esta semana | respaldo por el id de la semana | `#2d3fd6` → `#2637c4` oscura | `#6c76ca` · `#1b288d` · `#131c62` |

### Las imágenes nuevas (`docs/rediseno/capturas-522/`, PNG de 1080), cada una abierta

**Artistas** (`A3-artista-<clave>-con-linea-4x5`, `-sin-linea-4x5`, `-con-linea-9x16`):
- `un-leon-marinero`: azul del cielo de su foto; él al centro del círculo; sello «nov 7»; «Próxima fecha: Sáb 7 de nov, 7:00 pm · Monterrey».
- `hunik`: turquesa; la foto trae su nombre escrito («URIEL HUNIK») dentro del círculo; la línea corta en «Musica: techno…».
- `ifigenia-muluk`: vino; su cara de cerca y la blusa roja; sin cuenta de Instagram (no se pone el renglón).
- `kawasound`: rojo óxido; él contra el muro al sol.
- `eva-d-santos`: banda clara, olivo con texto y punto en negro; ella sentada en el piso.
- `emilio-palomino`: café (la piel de la foto); nombre de 33 letras en un renglón.
- `carlos-guevara`: foto en blanco y negro → respaldo verde Huasteca; nombre de 32 letras en un renglón a 84.

**Lugares** (`A3-lugar-L1-<clave>-…` y `A3-lugar-L2-<clave>-…`, mismos tres formatos):
- `teatro-de-las-artes` (Ciudad de México, sin descripción: solo `sin-linea-4x5` y `sin-linea-9x16`): L1 cobre con el SN cobre sobre crema;
  L2 verde con las columnas del teatro en el arco.
- `caja-real` (39 letras, dos renglones): L1 magenta; L2 café cantera con la fachada en el arco.
- `federico-silva` (44 letras, dos renglones parejos): L1 magenta; L2 azul con el edificio del museo.
- `bajo-ceiba`: L1 rojo Cantera; L2 banda clara, olivo con las hojas de la ceiba y texto negro.
- `guarida-del-coyote` (sin portada): solo L1, magenta (L2 no existe: se queda como L1).

**Esta semana:** `A3-semana-4x5` y `A3-semana-9x16`: azul Tangamanga, tres barras con los carteles Mística, Catrinas y Caligaris, el día en
su franja crema al pie, el título en dos renglones y los tres eventos con filete.

**El prototipo (teléfono a 2×):** `A3-proto-artistas-A3c` / `-A3s` / `-A3h`, `A3-proto-lugares-A3c` / `-A3s` / `-A3h` (L1 y L2 lado a lado por
lugar), `A3-proto-semana`, `A3-proto-lugares-320` (a 320, sin desborde), `A3-proto-lugares-1280` y `A3-proto-artistas-1280` (escritorio, notas
abiertas y plegadas). Medidas de cada tarjeta en `medidas-A3.json`.

### El prototipo

`docs/rediseno/prototipos/instagram-estilo-propio.html` abre en la sección nueva **«Tercera vuelta: Repisa con fotos reales y sin portada»**
(pantallas «3ª · Artistas», «3ª · Lugares L1 o L2», «3ª · Esta semana»), con sus notas (qué cambió, el color de la foto, riesgos) y las dos
preguntas. Las vueltas anteriores siguen ahí. Se arma con `node scripts/ops/auditoria-ui/prototipo/instagram-estilo-propio.mjs --solo-tercera`
(dibuja solo las `A3-*` y reutiliza las PNG y medidas de A/B/C y A2 ya guardadas) y se recorre con
`node scripts/ops/auditoria-ui/capturar-instagram-estilo-propio.mjs docs/rediseno/capturas-522 --solo-tercera`.

### Verificación

- **Las 48 tarjetas A3** (`revisar`, con las cajas de satori): 0 con falla. Ningún texto fuera del margen ni en lo que tapa la historia, ninguno
  encimado, ninguno cortado; todo el texto a 4,5:1 o más; ningún texto encima de una foto ni de un cartel (el texto va bajo la repisa, el día de
  cada barra en su franja, el sello en la esquina libre). Nombres de 32, 33, 39 y 44 letras sin cortes; la tabla de nombres hasta 64 sigue igual.
- **Medidor del prototipo**, en las 7 vistas de la tercera vuelta y a 320: 0 textos cortados, 0 desbordes, 0 toques menores de 44, 0 tarjetas
  con falla; profundidad 5 como mucho. Recorrido con toques reales (Playwright en el Chrome de la Mac). **Sin errores en la consola.**
- Es prototipo: no corrí `lint`/`typecheck`/`test` de la app porque no cambia.

### Riesgos

- En retratos el color tiende a la piel (café, terracota): Emilio sale café. Cuando hay ropa o fondo vivos, gana ese (Ifigenia, Hunik, León).
- Una foto en blanco y negro toma el respaldo (Carlos, verde): no recuerda a la foto, pero se lee bien.
- L1 con el respaldo: con nueve colores y el id, varios lugares repiten (aquí tres de cinco salen magenta; con los id reales, otro reparto).
- La línea corta la primera oración: puede quedar a medias («activo desde…», «Musica: techno…»), y repite las erratas de la ficha.
- L2 con fotos de Wikimedia con CC BY o CC BY-SA pide el crédito (OL-491): iría en el texto de la publicación, no en la tarjeta.

### Preguntas al founder

1. Lugares: ¿**L1** (el arco con el símbolo SN, sin foto) o **L2** (el arco con su portada cuando la tenga, y L1 cuando no)?
2. ¿**Con** la línea de la descripción bajo el nombre, o **sin** ella?
