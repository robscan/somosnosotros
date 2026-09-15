# 041 · Agenda desde redes sociales: 46 eventos cargados

**Fecha:** 2026-09-15 (noche) · **Pieza:** OL-020 (d), a partir de [PROMPT_REDES.md](../../ops/PROMPT_REDES.md)

## Qué pasó
El founder corrió el prompt de redes en Chrome y entregó `agenda_slp_2026-09-15_a_2026-10-30.json` (79 eventos del 17 sep al 2 oct, Instagram de la Secretaría, CEART, Laberinto, Máscara, Cossío, Leonora Carrington, Sinfónica, Ferrocarril) y un índice de publicaciones (`indice_imagenes_ig_1.csv`, 29 posts). Pidió localizar y revisar cada una y proponer solo lo que no tuviéramos.

## Cruce
Los 79 se cruzaron con los 48 eventos en producción por día local y palabras del título y del lugar (`scratchpad/cruce.json`), con corrección a mano de los falsos "ya lo tenemos" (el taller Ilumina y conoce tu independencia y tres charlas de Fotovisión coincidían por el nombre del lugar). Resultado: **35 ya estaban** con otro título (los de la agenda de la Secretaría), **5 dudosos** que el founder dejó fuera (Sinfónica el 17 y Camerata el 20 en la Parroquia de San Sebastián, que la Secretaría tiene al revés; dos inauguraciones de Fotovisión del 25 quizá agrupadas en la colectiva; caminata al Cerro de San Pedro, otro municipio) y **46 nuevos**. Copia de la investigación en `scripts/instituciones/investigacion-redes-2026-09-15.json`; la propuesta en `scripts/instituciones/eventos-redes-2026-09.json`.

## Carga
`node scripts/instituciones/correr.mjs importar-eventos scripts/instituciones/eventos-redes-2026-09.json --autor <admin>`: simulación 46/46 sin choques; carga 46 · fallaron 0. 22 van en lugares registrados y 24 en otro sitio (Museo Interactivo de Astronomía El Meteorito, Museo Tamuantzán, Teatro del Centro de Difusión Cultural del IPBA, facultades de la UASLP, Edificio Central). La agenda de producción ya los muestra (comprobado: Tin-Tan el 17, Family Weekend, Grayson Perry).

## Imágenes
En la Mac del founder solo estaba el cartel del MAC (`museomacslp_DdCrB9kH79u_1.jpg`); el índice anota 61 archivos más que no están en Descargas ni en ninguna carpeta, y el JSON no trae direcciones de imagen. El cartel del MAC se subió a `fotos/lugares/<admin>/importadas/` y quedó como imagen de "Inauguración de la nueva temporada de exposiciones del MAC" (24 sep, 19:00, entrada libre). Los otros 45 van sin cartel hasta que lleguen los archivos.

## Corrección (misma noche)
Al buscar la dirección para registrarlos como lugares resultó que el Museo Interactivo de Astronomía El Meteorito está en Charcas y el Museo Tamuantzán en Ciudad Valles: fuera de la ciudad. Se borraron sus 9 eventos (incluida la Ruta literaria por la Paz, que cita al Centro Cultural de la Huasteca; si era en la capital, se recarga). Quedan 37 eventos nuevos de redes. Imágenes: con el Chrome del founder se leen las publicaciones y se descargan las fotos desde la propia página, pero Chrome bloquea las descargas automáticas repetidas desde instagram.com; hace falta permitirlas una vez.

## Carteles (misma noche, después de permitir las descargas)
Con las descargas permitidas, un guion en la página de cada publicación recorre el carrusel (botón Siguiente), baja cada foto con `fetch` desde la propia página y guarda un paquete JSON por publicación: 26 publicaciones, 76 fotos. Lo que aprendí: la página de publicación no tiene `article`; las fotos del post se distinguen de la cuadrícula "Más publicaciones" por su posición vertical, y en algunas cuentas las fotos miden menos de 800 px (umbral 600); un `fetch` sin tiempo límite se colgaba, ahora aborta a los 8 s. Resultado: 14 carteles puestos en 14 eventos sin imagen (solo se llena lo vacío), 15 eventos futuros con cartel contando el MAC. El cartel de Cultura para el 17 a las 20:00 en la Parroquia de San Sebastián dice Orquesta Sinfónica y la agenda cargada dice Banda del Estado: se deja al founder.

## Pendiente
- Si el founder pasa la carpeta con los archivos del índice, revisarlos y cargarlos como carteles (`scripts/fotos/correr.mjs eventos` acepta URL; para archivos locales hace falta un paso de subida como el del MAC).
- Registrar como lugares, si el founder quiere, los sitios que se repiten: Museo Interactivo de Astronomía El Meteorito (5 eventos) y Museo Tamuantzán (3).
