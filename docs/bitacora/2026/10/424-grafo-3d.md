# 424 · El grafo cultural en 3D: lectura, reglas y prototipo (OL-393)

**Fecha:** 2026-10-12. **Rama:** `grafo-3d`, base `origin/main` (`939badc1`). **Operador:** Claude Fable 5.1 (sesión del gestor VI). **Sin código de la app, sin migración, sin tablas nuevas.**
**Estado:** entregada al gestor; él abre el PR. Falta la revisión del founder en su iPhone y sus respuestas a las diez preguntas del doc 56.

## El encargo

El founder dictó el 12 de octubre que quiere «simular un ambiente tridimensional para que se pueda navegar entre los grafos» y «definir cómo se organizan los puntos de cada uno de los nodos»: lugar, artista y asistente, con reglas de posición (lugares en su sitio geográfico real a escala; artistas cerca del lugar donde más tocan; los sin conexión «literalmente excluidos»; asistentes por sus coordenadas, que cambian, «sin revelar nunca su nombre») y de tamaño (seguidores y asistentes dan notoriedad). La referencia visual es el Preset Explorer de Absynth 6. Pidió primero confirmar si la posición real a escala es posible.

Tres entregas: el documento, el prototipo navegable y esta bitácora con la línea OL-393.

## Lo entregado

1. **[`docs/rediseno/56-grafo-cultural-3d.md`](../../../rediseno/56-grafo-cultural-3d.md).** Las reglas del founder con sus palabras; la respuesta «sí es posible» con la proyección de latitud y longitud a metros (equirrectangular local: a 10 km del centro se desvía menos de 10 m), las medidas reales de la ciudad (11 × 7,4 km; dos tercios de los lugares en un círculo de 1 km), la tercera dimensión como capas por tipo, los artistas en el promedio ponderado de sus lugares con un halo por ángulo áureo, los sin conexión en un anillo exterior, el tamaño `5 + 4·√min(peso, 64)` con tabla, la regla de privacidad de los asistentes en nueve puntos, los datos que ya hay en la base, la tecnología y lo medido, y diez preguntas numeradas. **Numeración:** el encargo decía doc 53, pero 53, 54 y 55 ya existen en `main`; es el 56.
2. **[`docs/rediseno/prototipos/grafo-3d.html`](../../../rediseno/prototipos/grafo-3d.html)** (172 KB, una sola página). three.js 0.186.1 como módulo desde cdnjs (versión fija). La nube al centro: esferas en una sola malla instanciada, violeta los lugares, crema los artistas, naranja cempasúchil los asistentes, gris los sin conexión; anillos de 1 km en el suelo. Tocar un nodo lo pone blanco con anillo, dibuja sus líneas, rotula a sus vecinos y abre una tarjeta con sus números. Árbol a la izquierda (Todo · Lugares › tipo · Artistas › con lugar / disciplina · Solo en sitios libres · Sin conexión · Asistentes) con dos controles (tamaño de las esferas, altura de las capas) y la casilla «Mostrar sin conexión»; lista a la derecha de lo filtrado, de mayor a menor, que al tocar vuela al nodo; mando de cámara abajo a la derecha (girar, inclinar, +, −, centro; mantener pulsado repite; también las teclas de flecha); un dedo gira, dos dedos acercan y mueven, la rueda acerca. En el teléfono el árbol entra de la izquierda y la lista de abajo (botones «Filtros» y «Lista»); desde 792 px son tres columnas. Tema oscuro por omisión y «Claro» a un toque. Se dibuja solo cuando algo cambia; «en reposo» en la barra cuando no.
3. **Datos reales, solo lectura, anonimizados.** Leídos el 12 de octubre por la tarde con la llave de servicio del `.env` local (script en el scratchpad, la llave nunca se imprime, nada se escribe). Solo lo visible y no borrador: 69 lugares, 663 artistas (122 con lugar, 23 solo en sitios libres, 518 sin conexión), 336 eventos, 262 seguimientos, 67 asistencias. Los asistentes del prototipo son 13 (quienes dijeron Voy o Me interesa a eventos visibles): sin id ni nombre, en orden barajado, con tramo de actividad en vez de número, **posición inventada** (la base no guarda dónde está nadie) y líneas solo desde Voy y Me interesa (lo que la app ya enseña con nombre a quien tiene sesión). Las 27 personas que solo siguen no se dibujan; los seguimientos solo suman al tamaño. 745 nodos y 419 líneas (129 artista–lugar, 36 asistente–lugar, 84 asistente–artista, 133 artista–artista, 22 lugar–lugar, 15 asistente–asistente).
4. **Capturas en `docs/rediseno/capturas-424/`** (13 PNG a 2×, con el Chrome real de la Mac vía playwright-core, WebGL por ANGLE/Metal), descritas abajo.
5. La línea OL-393 y la cabecera «Last updated» en `docs/ops/OPEN_LOOPS.md`.

## Decisiones que tomé (todas revisables)

- **Tercera dimensión = capas por tipo** (lugares en el suelo, artistas arriba, asistentes abajo), no tiempo ni notoriedad: la geografía ya gasta dos ejes, la notoriedad ya es el tamaño y el tiempo movería los lugares. El control «Altura de las capas» en 0 enseña la alternativa plana.
- **Pesos al colocar artistas:** un evento próximo o en curso vale 2, uno pasado 1. Halo de radio 28 + 11·√k unidades (280 m el primero) con ángulo áureo; los que tocan en varios lugares, a 180 m del promedio.
- **Otras ciudades comprimidas en logaritmo** más allá de 10 km (San Miguel de Allende, a 140 km, aparece a unos 18 km) para no esconder nada; en el doc propongo una escena por ciudad para la app.
- **Tamaño por raíz con techo 64** y asistentes por tramos (1 · 2–5 · 6+), nunca el número.
- **Tercer color naranja** (`--destacado`): el negro de la línea gráfica desaparece sobre fondo oscuro. En tema claro: violeta, tinta y naranja.
- **Tocar por cercanía en pantalla** (22 px más el radio aparente) en vez de un rayo exacto: con el dedo no se acierta a una esfera de 5 unidades a 1 500 de distancia.
- **Órbita propia** (60 líneas) en vez de `OrbitControls`; los arrastres terminan solo con `pointerup`/`pointercancel`.
- **Sin librerías de grafos 3D:** su motor de fuerzas contradice la regla geográfica.
- **Anonimato en un repo público:** el prototipo no lleva ids de personas ni líneas desde Seguir (privado). Lo escribí como regla en el doc (§ 5) con un umbral de anonimato propuesto (3 Voy por evento) que el prototipo no aplica porque la cuenta es chica.

## Ajuste tras la primera revisión del founder (misma noche)

«¿Por qué el grafo no muestra conexiones entre elementos hasta que se seleccionan? Podríamos verlas aunque sea más tenues que cuando se seleccionan.» Era decisión mía copiando a Absynth. Ahora todas las líneas se ven siempre, tenues (16 % en oscuro, 14 % en claro, sin escribir profundidad), y las del elegido brillantes encima; con un elegido las demás bajan a menos de la mitad. Solo se dibujan entre nodos que pasan el filtro. Casilla «Todas las líneas, tenues» en Ajustes para comparar con la versión anterior. Capturas vueltas a sacar.

## Segundo ajuste: correlaciones entre iguales

Founder: «Me faltó agregar correlaciones entre iguales. Como entre artistas que tocan juntos en uno o varios lugares y entre lugares que participan en un mismo festival. Usuarios que coinciden en eventos también.» Las tres salen de la base sin tabla nueva (doc 56 § 3.6): artista–artista por evento compartido en `eventos_artistas` (133 líneas; por el acto, no por el festival entero: compartir festival no prueba tocar juntos), lugar–lugar por ser sedes de actos del mismo festival vía `evento_padre_id` (22), asistente–asistente por Voy o Me interesa al mismo evento (15, anónimas). Total 419 líneas. Las de iguales llevan el color del tipo (crema, violeta, naranja) y las cruzadas siguen blancas; la tarjeta desglosa «toca con 7 artistas · en 1 lugar · 1 asistente». Capturas vueltas a sacar. Un dato de hoy: el artista con más colegas es uno de artes visuales con 7 (una exposición colectiva).

## Tercer ajuste: las mejoras que acepté proponer y el founder aprobó

Founder: «bien, ahora responde: ¿Este es un grafo? ¿Cumple con la definición? ¿Qué mejorarías? ¿Cómo facilitarías su lectura y la elaboración de diagnósticos?» y, tras la respuesta: «adelante con tus ajustes propuestos, entiendo la advertencia, aún no lanzamos oficialmente». La respuesta y lo que entró están en el doc 56 (§ 3.7 y § 7 bis): tiempo (ventana y «Hasta», por semanas: la base cubre 80 días), dos lecturas «Mapa» y «Red» (fuerzas en 3D sobre los nodos con línea, 62 ms, transición de 0,9 s) y «Desde arriba», líneas como tubos con grosor por eventos en común, segundo paso al elegir, los 518 sin conexión resumidos en un nodo «por conectar», nombres de lugares al acercarse, seis lentes de diagnóstico con su lista, diagnóstico en frases calculadas y «Copiar lista». Los datos se regeneraron con los días de cada línea (`generar2.mjs` en el scratchpad); el prototipo pasa de 173 a 207 KB. Capturas vueltas a sacar (21).

Lo que se corrigió al probar: la vista «Red» salió primero como una columna y luego como una bolita (los lugares sin línea y los cúmulos sueltos se repelen lejos y mandaban en la escala): ahora los sin línea van a un anillo aparte, la escala la fija el percentil 85 y lo que sobra se recoge a 720. Los nombres de lugares de cerca solo salen sin nodo elegido, para no encimarse con los rótulos de los vecinos. El medidor de cuadros por segundo con el panel oculto se cuelga (limitación ya conocida del navegador integrado): se midió con el panel visible, 57–99 fps mientras se mueve.

## Lo que choca con lo firmado

DEFINICION (firmado el 2026-09-21): «Las personas que asisten no son fichas del grafo: se cuentan […] nunca su ubicación» y «las conexiones se muestran, no se puntúan […] nada se destaca por tener más conexiones». El pedido pone a los asistentes como nodos con ubicación y da tamaño por seguidores. No lo resolví: está como preguntas 1 a 3 del doc, con la regla que propongo si el founder decide que sí (interruptor apagado de origen, posición solo del botón «Dónde estás», redondeada a 500 m con corrimiento fijo, sin historial, tramos, sin líneas desde Seguir, umbral de 3, se borra con la cuenta).

## Lo medido

Chrome 152 (navegador integrado de la sesión), Mac con Apple M4 Pro, pantalla a 2×. El iPhone no se puede medir desde aquí: queda para la vista previa de la rama en el teléfono del founder (Safari y app instalada).

| Escena | fps | CPU por cuadro |
| --- | --- | --- |
| 745 nodos en 390×844 | 120 (tope de la pantalla) | 0,05 ms |
| + 5 000 esferas | 119 | 0,07 ms |
| + 20 000 esferas | 117 | 0,04 ms |

three.js pesa 194 KB comprimido (90 + 104). Las funciones `medirFps()`, `medirRender()` y `estresar(n)` quedan en la página para repetir la medición en el iPhone desde la consola de Safari.

Probado con toques reales en el navegador integrado a 390×844: tocar la nube elige el nodo más cercano (salió «Canto Quetzal» al tocar cerca de su esfera), «Filtros» abre el árbol, «Museo» deja 13 esferas violeta y cierra la hoja, «Lista» abre la hoja con «Museo · 13» ordenados por tamaño. Sin errores en la consola.

## Las capturas (`capturas-424/`, versión final de la noche)

Teléfono 390×844, tema oscuro salvo donde se dice:

1. `01-movil-mapa.png`: la lectura «Mapa» entera: el cúmulo del centro con sus líneas tenues, los lugares de las afueras a su distancia real con líneas largas hacia el centro, los anillos de 1 km y, arriba a la derecha, el nodo gris «518 artistas por conectar».
2. `02-movil-lugar-elegido-dos-pasos.png`: el Museo de Arte Contemporáneo elegido: tarjeta «12 conexiones: 4 artistas · 5 lugares del mismo festival · 3 asistentes · a dos pasos, 98»; sus líneas gruesas (violeta las de festival, blancas las demás), sus vecinos rotulados y, a media luz, los vecinos de sus vecinos.
3. `03-movil-artista-tocan-juntos.png`: Octavio Vázquez (artes visuales): «toca con 7 artistas · en 1 lugar · 1 asistente», las líneas crema entre artistas de la misma exposición colectiva.
4. `04-movil-asistente-elegido.png`: un asistente anónimo: sin nombre ni perfil, posición inventada, sus líneas a lugares, artistas y a los asistentes con los que coincide (naranja).
5. `05-movil-vista-red.png`: la lectura «Red»: el núcleo conectado (CEART, Cossío, Gamboa y sus artistas) y, alrededor, los cúmulos chicos y los lugares sin línea en su anillo.
6. `06-movil-red-ceart.png`: el CEART elegido en «Red», con sus 25 conexiones y el segundo paso.
7. `07-movil-lentes.png`: la hoja de la izquierda: las seis lentes arriba, luego Filtrar, Tiempo y Ajustes.
8. `08-movil-lente-zonas-lista.png` y 9. `09-movil-lente-zonas-mapa.png`: la lente «¿Qué zonas no tienen un lugar a 2 km?»: la hoja con el diagnóstico y las tres zonas («4,3 km al sureste del centro · 43 km²»…) y la planta desde arriba con las celdas sin lugar en naranja.
10. `10-movil-lente-islas.png`: «¿Qué lugares no comparten artista con nadie?»: las islas encendidas, lo demás apagado.
11. `11-movil-lente-puentes-lista.png` y 12. `12-movil-lente-puentes-red.png`: «¿Quién une lugares distintos?»: los 6 puentes en la lista («une Centro de Difusión Cultural Raúl Gamboa y Museo Francisco Cossío») y, en «Red», solo ellos y sus lugares con sus líneas.
13. `13-movil-lente-por-conectar.png`: el nodo «518 artistas por conectar» elegido: «Música 293 · Artes visuales 90 · Teatro 50…» y la lista por disciplina con «Copiar lista».
14. `14-movil-tiempo-ventana.png` y 15. `15-movil-tiempo-nube.png`: ventana de 2 semanas hasta el 16 de octubre: en el árbol, el deslizador; en la nube, solo las líneas con un evento en esas dos semanas y los nodos sin línea activa atenuados; el diagnóstico añade «189 conexiones activas de 419».
16. `16-movil-diagnostico.png`: la hoja de la lista con las cuatro frases del diagnóstico y «Todo · 227».
17. `17-movil-tema-claro.png`: el tema claro.
18. `18-ancho-lugar-elegido.png` (844×390): el MAC elegido a lo ancho.
19. `19-escritorio-mapa.png` (1280×800): lentes y filtros · escena · diagnóstico y lista.
20. `20-escritorio-lente-islas.png`: la lente de islas en escritorio.
21. `21-escritorio-lente-puentes-red.png`: la lente de puentes en «Red» en escritorio.

Lo que vi y no corregí: de cerca, los rótulos de los vecinos se enciman entre sí (capturas 2 y 6); con el elegido muy conectado las líneas gruesas tapan parte de la nube. Es cosmético y depende de cómo decida el founder la pantalla.

## Para el gestor

- Rama `grafo-3d` subida; sin PR (lo abre el gestor). Tres commits: el doc, el prototipo con sus capturas, y bitácora + OPEN_LOOPS.
- Solo documentos y un HTML: no hace falta build ni suite; sí el enlace de la vista previa para que el founder lo abra en su iPhone (ahí se mide lo que aquí no).
- Las diez preguntas están al final del doc 56; las tres primeras (asistentes como nodos, posición solo con «Dónde estás», tamaño vs «sin ranking») son las que cambian DEFINICION.
