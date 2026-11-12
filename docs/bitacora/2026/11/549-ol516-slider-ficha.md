# 549 · OL-516 · El lugar o el artista de la semana, con sus eventos de esa semana en un carrusel

**Fecha:** 2026-11-12. **Rama:** `slider-ficha`, apilada sobre `publicar-desde-ficha` (OL-515, PR #650, todavía sin unir: el gestor trae `main` cuando #650 se una). **Quién:** operador del Gestor de cambios IX. **Migración:** ninguna: el trabajador calcula las imágenes al publicar con lo que ya hay en la base.

## Qué pidió el founder

«cuando publicamos lugares y en la ficha o en la imagen que publicamos dice dos eventos esta semana, me gustaría ver si podemos publicar un slider, o sea, varias fotografías y cada fotografía pues con el evento al que se refiere, es decir, el usuario ve la ficha del lugar destacado y si hace swipe ve los dos carteles a los que se refieren… solamente para cuando los lugares tengan eventos o los artistas tengan eventos de esa semana, que se enlacen en un slider.» Aceptó la propuesta del gestor: «sí al slider, con la tarjeta de la app».

## Qué cambió

1. **Qué eventos entran** (`lib/instagram/semanaDeFicha.ts`, puro, y `cargarFicha`): los de la semana del día en que sale (de su lunes a su domingo en la zona de su ciudad; a mano, la de hoy) que no hayan terminado ese día o al publicar; visibles, sin borrador, cancelados ni retirados; **sin los marcos de festival** (cuentan sus funciones). El lugar ya los cargaba (sin `clase` ni más datos); **el artista ahora también**, por `eventos_artistas`. Dos funciones de **la misma obra** (el mismo título sin acentos, signos ni mayúsculas) son una sola: la primera fecha manda y guarda todas. Son los mismos que cuenta la píldora «Esta semana: N eventos» de la tarjeta del lugar: la tarjeta y el carrusel nunca dicen cosas distintas.
2. **Las imágenes:** la 1, la tarjeta de siempre (`dibujarFicha`, con «… de la semana» el día de la semana y sin él a mano, OL-515); de la 2 en adelante, una por obra en orden de fecha y hasta cinco: su cartel completo a 4:5 con el margen de su color (como «Esta semana» y los actos de un festival) o, sin cartel, **el diseño de Crear cartel que la app ya dibuja para publicar un evento sin cartel** (`armarImagen`, diseño 0). La lista la arma `armarCarrusel` (`carruselDeFicha`), el mismo del festival y de «Esta semana», sin un armador nuevo: dos obras con el mismo cartel van en **una** imagen (así sale Un León Marinero). Un cartel que no se puede bajar se queda fuera (como en «Esta semana»); si ningún evento se pudo dibujar, sale la tarjeta sola, como antes, sin fallar.
3. **El texto:** «Esta semana:» y un renglón por obra con el formato de «Esta semana» («Vie 13 · 7:30 pm · Aires revolucionarios»; varias funciones: «Sáb 14, 8:00 pm y dom 15, 7:00 pm · …» o, a la misma hora, «Vie 13 y sáb 14 · 8:00 pm · …»; el artista, con el lugar y su cuenta). Antes el lugar decía hasta tres en una línea; ahora son hasta cinco renglones y «Y N más en su ficha.». El artista con eventos cambia «Próxima fecha: …» por la lista (la tarjeta sigue diciendo su próxima fecha). Si no cabe en lo que deja Instagram, `textoDeDestacado` recorta la lista antes de rendirse. El texto propio de la hoja sigue mandando tal cual.
4. **Etiquetas y coautor:** la tarjeta lleva la cuenta de la ficha como hoy; cada evento, las reglas del carrusel de «Esta semana» y del festival (`etiquetasPorImagen`: la cuenta de la ficha en todas y, en la de cada evento, su lugar y sus artistas), sin las quitadas en la hoja. El artista sigue invitado como coautor: `publicarCarrusel` acepta ahora `coautores` (en el contenedor del carrusel; si Instagram no lo acepta, sale sin él y se dice, como en una imagen).
5. **La historia** sigue siendo la tarjeta sola; **Facebook** espeja todas las fotos (el espejo de siempre con `formato: carrusel`).
6. **Anotado:** `instagram_publicaciones` con `formato: "carrusel"`, `imagenes: n` y las direcciones en `carrusel`, a nombre de la ficha; el resultado del trabajo igual. Sin eventos, la misma fila 4x5 de antes. Las etiquetas de cada imagen quedan en el avance (`claves`, como `enSemana`): si el trabajo se retoma, no se vuelve a dibujar.
7. **Las hojas enseñan lo que saldrá:** en la del día de la semana y en la de «Publicar en Instagram» de la ficha, bajo la tarjeta, «Sale con 3 imágenes: su tarjeta y sus 2 eventos de esta semana.» y todas las imágenes en la tira del carrusel de la hoja de un evento (OL-464), sin mover ni quitar (`TiraDeFicha`, en `MandosPublicacion.tsx`). En la historia: «La historia lleva solo su tarjeta.». Las rutas de la vista previa aceptan `imagen=<n>` (0, la tarjeta; luego cada evento) y `mini=1`: `/api/instagram/ficha/<id>` y `/api/instagram/semana/<día>`, solo administración, con la misma lista que publica el trabajador (`dibujarImagenDeFicha`).

Archivos nuevos: `src/lib/instagram/semanaDeFicha.ts` y su prueba, `scripts/ops/auditoria-ui/ejemplos-slider-ficha.mjs`, `scripts/ops/auditoria-ui/capturar-slider-ficha.mjs`. Tocados: `lib/instagram/ficha.ts`, `destacado.ts`, `api.ts`, `lib/redes/trabajar.ts` y `herramientas.ts`, las dos rutas de la vista previa, `accionesFicha.ts`, `accionesSemana.ts`, `HojaFicha.tsx`, `HojaDia.tsx`, `MandosPublicacion.tsx`, sus pruebas y `medidas.aceptadas.json`.

## Decisiones por confirmar (gestor y founder)

- **La píldora cuenta obras, no funciones.** El Rinoceronte, con dos funciones de «Awkward Latino», dice «Esta semana: 1 evento» y sale con dos imágenes (la tarjeta y la obra). Es lo que hace que la tarjeta y el carrusel digan lo mismo; si el founder prefiere «2 funciones», es cambiar la frase de la píldora.
- **Las exposiciones que empezaron antes de la semana no cuentan** (Fotovisión 31, abierta desde septiembre): la semana es la de los eventos que empiezan en ella, como la píldora de antes. Si se quieren las que siguen abiertas, es una condición más en la consulta (y la píldora contaría lo mismo).
- **El artista cambia «Próxima fecha» por la lista** cuando tiene eventos esa semana (sería repetir el primero).
- **El diseño sin cartel dice la primera fecha** (el de Crear cartel es de un evento): «Awkward Latino» sale con «SÁB 14 NOV · 8:00 pm»; el texto dice las dos.
- **Dos obras con el mismo cartel van en una imagen** (Un León Marinero: León y Aguascalientes comparten cartel), por la regla del founder del festival («que no se repitan las imágenes»). La hoja lo dice: «Sale con 2 imágenes: su tarjeta y los carteles de sus 2 eventos de esta semana.».
- **Un cartel que no se puede bajar se queda fuera** (como en «Esta semana»), no se cambia por el diseño: el diseño no es su cartel.
- **La tira de las hojas no deja mover ni quitar** imágenes: salen las que dice la ficha. El pedido de la ficha no guarda imágenes (`redes_encolar_ficha` solo guarda `tipo`, `facebook`, `texto` y `quitadas`); por eso `imagenesPedidas` no entra aquí: el trabajador calcula la lista al publicar, la misma que dibuja la vista previa.
- **El gancho del Raúl Gamboa se corta en «Arq.»** (la frase gancho toma el punto de la abreviatura como fin de oración): ya pasaba antes de esta pieza; no lo toqué.

## Los ejemplos reales (`docs/rediseno/capturas-549/ejemplo-*`)

Guion: `node scripts/ops/auditoria-ui/ejemplos-slider-ficha.mjs <datos públicos .json> docs/rediseno/capturas-549` (el .json con los datos públicos de las tres fichas no está en el repo). **El trabajador de verdad** (`correrUnTrabajo`) sobre una base en memoria, con la tarjeta, las imágenes de los eventos y el texto de la app; Instagram y Facebook de mentira (se guarda lo que se les mandaría); las fotos y los carteles bajados de sus direcciones públicas del Storage. Para cada uno: cada imagen en JPEG a 1080 (`ejemplo-<ficha>-<n>.jpg`), la historia (`-historia.jpg`), la hoja de contacto (`ejemplo-<ficha>.jpg`) y el texto completo con las etiquetas de cada imagen y el de Facebook (`ejemplo-<ficha>.txt`). Todas abiertas y miradas.

- **Teatro El Rinoceronte Enamorado**, a mano el jueves 12 a las 10:00: 2 imágenes. La tarjeta («LUGAR», su sala en el arco, «Esta semana: 1 evento») y el diseño de «Awkward Latino, de Disco Bamba» (sin cartel). Texto: «Sáb 14, 8:00 pm y dom 15, 7:00 pm · Awkward Latino, de Disco Bamba». @elrinoenamorado en las dos.
- **Centro de Difusión Cultural Raúl Gamboa**, a mano el jueves 12 a las 10:00: 3 imágenes. La tarjeta, el cartel de la charla de Fotovisión 31 (hoy, 4:30 pm) y el de «Aires revolucionarios» (vie 13). Las otras funciones son de la semana que viene.
- **Raúl Gamboa, el día del lugar de la semana que viene** (miércoles 18, 7:00 pm): 3 imágenes. La tarjeta («LUGAR DE LA SEMANA»), el diseño de «Entre rieleras y juanes» (sin cartel) y el cartel de «Aires revolucionarios» con sus dos funciones juntas: «Jue 19 y vie 20 · 7:30 pm · Aires revolucionarios». Aquí se ve la regla de las funciones repetidas.
- **Un León Marinero**, a mano el jueves 12: 2 imágenes. La tarjeta (su foto, «Próxima fecha: Vie 13 de nov, 8:00 pm») y el cartel de la gira (el mismo para León y Aguascalientes: una imagen). El texto lista los dos conciertos; @unleonmarinero etiquetado e invitado como coautor del carrusel. El .json no trae el sitio de esos eventos: en la app cada renglón lleva « · <lugar>» si lo tiene.

Las tres fichas tienen menos de cinco obras en una semana: el tope de cinco y «Y N más en su ficha.» están en las pruebas.

## Capturas (`docs/rediseno/capturas-549/`, 390×844 a 2×)

Guion: `node scripts/ops/auditoria-ui/capturar-slider-ficha.mjs . docs/rediseno/capturas-549`. La app compilada contra el respaldo local (`RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`, reloj fijo en el miércoles 7 de octubre de 2026, sesión de la administración): el museo Leonora Carrington (demo) es el lugar del día y tiene dos eventos esa semana, el taller del sábado con su cartel dibujado y la visita guiada del domingo sin cartel. Chrome real con la letra de la app (Bricolage comprobada), la API de Instagram y la página de Facebook de mentira del respaldo y el trabajador de verdad. Todas abiertas y miradas; `recorrido.txt`: «todo bien», sin errores de página ni de consola.

- `01-dia-lugar.png`: la hoja del día («Hoy · 7:00 pm · Lugar»): la tarjeta «LUGAR DE LA SEMANA» con «Esta semana: 2 eventos», «Sale con 3 imágenes: su tarjeta y sus 2 eventos de esta semana.» y la tira (la tarjeta, el cartel «Gráfica» del taller y el diseño de la visita guiada, que se desliza dentro de la hoja).
- `02-dia-lugar-tira.png`: la misma hoja con la tira al centro, debajo «Lugar con 2 eventos esta semana… Cambiar», el aviso y la etiqueta.
- `03-dia-lugar-historia.png`: en «Historia 9:16», la tarjeta alta, «La historia lleva solo su tarjeta.» y sin tira.
- `04-dia-imagenes-del-servidor.png`: las tres imágenes que dibuja el servidor para ese día (`hoja-dia-imagen-1..3.jpg`, a 720).
- `05-ficha-hoja.png` y `06-ficha-hoja-tira.png`: la hoja de «Publicar en Instagram» de la ficha del museo: la tarjeta «LUGAR» (sin «de la semana»), la línea y la tira; abajo, «Sale ahora en @smsnstrsapp, con su historia.» y el aviso de que la semana ya la tiene programada.
- `07-ficha-imagenes-del-servidor.png`: las tres de la ficha (`hoja-ficha-imagen-1..3.jpg`), la tarjeta sin «de la semana».
- `08-lugar-menu-salio.png`: después de «Publicar ahora»: el trabajador publicó en el Instagram de mentira el **carrusel de 3** (`instagram_publicaciones`: `carrusel`, 3 imágenes, @museoleonoracarrington.demo) y la **historia sola** (9x16, 1), y Facebook espejó el carrusel; el renglón dice «Salió en Instagram hoy».

En las dos hojas el texto lleva «Esta semana:\nSáb 10 · 11:00 am · Taller de máscaras para familias\nDom 11 · 7:00 pm · Visita guiada: Leonora y el teatro» (comprobado en el guion).

## Evidencia

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` | 0 errores (2 avisos que ya estaban, en archivos no tocados) |
| `npm run typecheck` | bien |
| `npm test` | 332 archivos, **5 250 pruebas en verde**. Nuevas: `semanaDeFicha.test.ts` (12: la semana a mano y de un día por venir, el domingo; marcos fuera y cuentas por evento para el lugar y el artista; funciones repetidas juntas con la primera fecha y su cartel; sin lo que terminó; tope de cinco con la tarjeta primero y el diseño sin cartel; el mismo cartel en una imagen; sin eventos, la tarjeta sola; los renglones de una, varias a la misma hora y a otra hora, con lugar; «Y N más en su ficha.»; el lugar y el artista con la lista; el recorte si no cabe), `trabajar.test.ts` (+6: a mano con carrusel, etiquetas por imagen, texto, anotado como carrusel, historia sola y Facebook con todas; el día de la semana con «de la semana»; un cartel que no se baja, ninguno dibujado y un fallo al dibujar: la tarjeta sola; sin eventos: lo de antes; quitadas y el artista coautor del carrusel; retomar sin volver a dibujar), `api.test.ts` (+1: el coautor en el contenedor del carrusel y sin él si no lo acepta), `destacado.test.ts` (el lugar con renglones) |
| `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db` | **3 152 comprobaciones, 0 fallaron** (sin cambios en la base) |
| `npm run test:componentes` | **823 de 823** (+2 de `HojaFicha`: la tira de tres con sus direcciones, la línea, el texto con cada evento, la historia sin tira y el pedido de siempre; sin eventos, sin tira. +2 de `HojaDia`: lo mismo en el día de un lugar, y sin tira sin eventos) |
| `npm run inventario` | sin novedades |
| `npm run medir` | 64 pantallas × 4 anchos, **sin novedades** (con el presupuesto y la excepción de `s50` puestos al día: ver abajo) |
| Capturas y ejemplos | todo bien, sin errores de página |

**`medir`:** la hoja `s50-ficha-publicar-instagram` (Teatro de la Paz) ahora enseña la tira, porque ese lugar tiene eventos esa semana en el respaldo: su presupuesto sube de 126/161 a 132/167 nodos (la línea, la lista y tres imágenes), y la excepción del chip de quitar la etiqueta (OL-515, 36 de alto) se mueve de 320 a 820 y 1280, donde ahora queda a la vista (la tira lo baja). Anotado en `medidas.aceptadas.json` con su porqué.

## Lo que NO se comprobó

- Nada contra producción (ni lecturas) ni Instagram ni Facebook de verdad: un carrusel real con coautor no se ha publicado nunca (`collaborators` en el contenedor del carrusel está en la documentación de Meta; si no lo acepta, sale sin él y se dice).
- El teléfono de verdad: las hojas en Chromium a 390×844.

## Qué debe comprobar el gestor en producción (tras unir #650 y esta rama)

1. Con la vista previa de Vercel y la cuenta de administración, en un lugar con eventos esta semana (el Raúl Gamboa o el Rinoceronte): «···» › «Publicar en Instagram»: la línea «Sale con N imágenes…» y la tira con la tarjeta y cada cartel o diseño; «Historia 9:16» sin tira. No publicar.
2. Lo mismo en la hoja del día de un lugar de la semana con eventos (Administración › Instagram › Semana).
3. Un lugar sin eventos esa semana: ni línea ni tira, y la tarjeta sola.
4. **Cuando el founder lo diga**, publicar uno de punta a punta y, solo lectura: `instagram_publicaciones` con `formato = 'carrusel'`, `imagenes = n` y `carrusel` con n direcciones a nombre de la ficha, más su fila 9x16; `facebook_publicaciones` con `formato = 'carrusel'`; en Instagram, deslizar y ver la tarjeta y luego cada evento; un artista, que la invitación de coautor llegue (o que el resultado diga que salió sin él).

## Qué sigue

1. Revisión del gestor; unir después de #650 (OL-515); «publica» del founder.
2. Por confirmar con el founder: la píldora por obras, las exposiciones abiertas, «Próxima fecha» del artista y el diseño con la primera fecha (los ejemplos lo enseñan).
