# 437 · Foro Sombra y el Circuito Nacional de Artes Escénicas en Espacios Independientes 2026 en San Luis Potosí (OL-406)

**Fecha:** 2026-10-13 (noche). **Rama:** `datos-foro-sombra`, base `origin/main` (`88b4a33f`), solo esta bitácora, la línea OL-406 y el «Last updated». **Operador:** sesión de investigación de redes (Fable 5.1), sin otros agentes. **Sin código, sin migración:** los datos entraron directo a producción con la llave de servicio, como en las cargas anteriores de la rutina de redes.
**Estado:** datos en producción; pendiente la revisión del gestor y del founder.

## El encargo

Founder, 13 de octubre, textual: «Investiga por favor el foro sombra: https://instagram.com/forosombra dalo de alta en lugares con su ficha llena. Revisa sus eventos y agrégalos. Revisa también que es el circuito nacional de artes escénicas en espacios independientes 2026 y agrega cartelera. Revisa que otros foros o lugares tienen eventos de este circuito y agrega.»

## Qué encontré

- **Foro Sombra** ([Instagram](https://www.instagram.com/forosombra/), [boletera](https://waccess.net/foro-sombra)): foro escénico independiente en Juan de Oñate 340, Col. del Valle, 78200 San Luis Potosí. Caja negra con piso de madera, parrilla de iluminación y aforo de 110 personas; teatro, danza, música, muestras escénicas, residencias, ensayos, talleres y conferencias. Taquilla de lunes a jueves de 16:00 a 20:30; boletos en línea en waccess.net. Punto geocodificado con Mapbox (22.15294, −101.003973). En su cartelera de octubre: El Roperazo (bazar de vestuario, 10 de octubre, ya pasó), las conferencias del 6.º aniversario de CUSAME (16 de octubre), «El juego de mesa II» de Hazte Brillar (24 de octubre, dos funciones) y «Cantares» (30 de octubre) como sede del circuito.
- **Circuito Nacional de Artes Escénicas en Espacios Independientes 2026 (CINAEEI):** programa de la Secretaría de Cultura federal y el INBAL (Coordinaciones Nacionales de Teatro y Danza) con 15 millones de pesos en estímulos; cada agrupación seleccionada da diez funciones entre septiembre y diciembre, ocho en espacios independientes de su circuito. San Luis Potosí está en el **Circuito 5** con Aguascalientes, Nayarit y Zacatecas. Fuentes: [convocatoria (PDF)](https://inba.gob.mx/multimedia/convocatorias/2026/CNT/CN-ArtesEscenicasEnEspaciosIndependientes.pdf), [boletín 405 del INBAL](https://inba.gob.mx/prensa/23678/abre-la-convocatoria-del-circuito-nacional-de-artes-esc-eacutenicas-en-espacios-independientes), [cartelera oficial](https://teatro.inba.gob.mx/circuitonacional/web/programacion?circuito=5), [proyectos seleccionados](https://teatro.inba.gob.mx/circuitonacional/web/seleccion) y la cuenta [@cinaeei](https://www.instagram.com/cinaeei/) (141 espacios, 530 funciones, 53 agrupaciones).
- **Funciones del circuito en San Luis Potosí** (cartelera oficial): «Cantares», unipersonal de Sayuri Navarro con IYARI, teatro de la vida ([ficha 28](https://teatro.inba.gob.mx/circuitonacional/web/seleccion/28)): La Carrilla 22 y 23 de octubre 20:00, Foro Sombra 30 de octubre 20:00 ($100) y Teatro de la Paz 24 de noviembre 19:00; «Esas que no fui», monólogo de Mauricio Popoca dirigido por Daniela Vasch con La marcha encuentros artísticos A.C. ([ficha 6](https://teatro.inba.gob.mx/circuitonacional/web/seleccion/6)): Teatro El Rinoceronte Enamorado 24 de octubre 18:00 y 20:00. Los otros tres proyectos del Circuito 5 (Awkward Latino, El rey sin traje, Atracadero) no tienen funciones en el estado. Los tres foros potosinos ya estaban en el catálogo.

## Qué di de alta (ids en `redes/respaldo-foro-sombra-2026-10-14T04-20-00.json`, fuera del repo)

- **Lugar** Foro Sombra `160c24e8-5f7f-4d08-8769-03efda7bcf22` (`/lugares/foro-sombra`): tipo foro, dirección completa con punto, descripción, detalle, Instagram y sitio, horario de taquilla (lunes a jueves 16:00–20:30) y portada 3:2 recortada de una foto de función sin texto.
- **Marco** «Circuito Nacional de Artes Escénicas en Espacios Independientes 2026 en San Luis Potosí» `593d4255-02a0-4355-b06e-844a9209c7ee`, clase festival, con descripción y enlaces, rango recalculado del 22 de octubre al 24 de noviembre y portada generada (`deco-sol`, sin foto).
- **Seis actos** ligados al marco: Cantares ×4 (`629075b9…` 22 oct, `e6abd8be…` 23 oct en La Carrilla; `98099c96…` 30 oct en Foro Sombra; `ebb94f62…` 24 nov en Teatro de la Paz) y Esas que no fui ×2 (`285353a4…` 18:00, `d9154403…` 20:00 en el Rinoceronte). Carteles: el del circuito para La Carrilla (fecha y sede visibles), el de Foro Sombra para el 30, la lámina de la gira para el Teatro de la Paz; las dos de «Esas que no fui» sin cartel (la compañía no tiene publicación con él).
- **Tres eventos propios de Foro Sombra:** «El juego de mesa II, de Hazte Brillar» (`c275110b…` 17:00, `3c53c056…` 20:00, 24 oct, boletos con la compañía) y «Conferencias por la salud mental: 6.º aniversario de CUSAME» (`6573f89f…`, 16 oct 17:00, entrada libre con registro).
- **Fichas de artistas** (regla del 4 de octubre: foto y portada de su obra): IYARI, teatro de la vida `07124340…` (foto y portada), Hazte Brillar México `5e29d310…` (foto y portada), La marcha encuentros artísticos `e524644d…` (sin foto ni redes, «ficha incompleta»). Sayuri Navarro ya existía y quedó ligada a las cuatro funciones de Cantares.

## Qué no pude confirmar

- **La procedencia de La marcha encuentros artísticos:** la cartelera no dice su estado; cuatro de sus diez funciones son en Aguascalientes, así que la ficha dice «Aguascalientes» con la nota «por confirmar». Tampoco el precio de sus funciones en el Rinoceronte (el sitio elrino.mx no las tiene todavía): van con «Costo por confirmar».
- **El precio de Cantares en La Carrilla** (los boletos se piden a la compañía) y en el Teatro de la Paz («Entrada por confirmar»).
- **Noviembre y diciembre del Circuito 5:** la cartelera oficial se corta al leerla por trozos; las fichas de los dos proyectos potosinos sí dan su gira completa y de ahí salió la función del 24 de noviembre.
- Claude in Chrome se desconectó al final; las capturas se tomaron con el navegador integrado.

## Capturas (`docs/rediseno/capturas-437/`, navegador integrado, 390×844, producción)

- `01-movil-foro-sombra.png`: la ficha del lugar con sus cuatro próximos eventos, dirección, horario y descripción.
- `02-movil-cantares-foro-sombra.png`: la función de Cantares del 30 de octubre en Foro Sombra.
- `03-movil-circuito-5.png`: el marco del circuito con sus actos.

## Búsquedas web

11 búsquedas web en toda la sesión (cupo de 200), 9 lecturas de páginas con WebFetch.
