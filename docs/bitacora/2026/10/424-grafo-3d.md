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

## Las capturas (`capturas-424/`)

1. `01-movil-nube.png` (390×844): la nube entera desde la cámara inicial: el cúmulo del centro (lugares violeta con los artistas crema flotando encima y los asistentes naranja debajo), los lugares de las afueras a su distancia real, los anillos de 1 km y, al fondo, el polvo gris del anillo de los sin conexión.
2. `02-movil-lugar-elegido.png`: el Museo de Arte Contemporáneo elegido: blanco con anillo, tarjeta «Museo · San Luis Potosí · 0 seguidores · 7 asistencias · 10 eventos (4 próximos) · 7 conexiones», líneas a sus artistas (rotulados) y a tres asistentes anónimos; lo demás apagado.
3. `03-movil-artista-elegido.png`: Canto Quetzal (artista «por completar», en 1 lugar): líneas a Estudio Ojo Zarco y a dos asistentes.
4. `04-movil-asistente-elegido.png`: un asistente anónimo: tarjeta «Asistente · sin nombre ni perfil · Actividad media · posición inventada (la base no guarda dónde está nadie) · 8 conexiones».
5. `05-movil-filtros.png`: la hoja del árbol abierta desde la izquierda, con las cuentas por tipo y disciplina.
6. `06-movil-filtro-museos.png`: filtro «Museo»: solo las 13 esferas violeta.
7. `07-movil-lista.png`: la hoja de abajo con «Museo · 13», cada renglón con tipo, «n siguen · n van» y sus conexiones.
8. `08-movil-sin-conexion.png`: filtro «Sin conexión» desde lejos: el anillo de polvo gris a 8–9,5 km, la ciudad vacía en medio.
9. `09-movil-desde-arriba.png`: la cámara casi vertical: el mapa de la ciudad tal cual (el cúmulo del centro, un cúmulo al oeste, otro al sur) con los halos de artistas alrededor de cada lugar.
10. `10-movil-tema-claro.png`: el tema claro: fondo crema, lugares violeta, artistas en tinta, asistentes naranja.
11. `11-ancho-nube.png` (844×390): a lo ancho, la nube cabe con el mando y la leyenda.
12. `12-ancho-lugar-elegido.png`: el MAC elegido a lo ancho.
13. `13-escritorio-tres-columnas.png` (1280×800): árbol · escena · lista; el Centro de las Artes (CEART) elegido con sus 20 conexiones rotuladas.

Lo que vi y no corregí: con el nodo elegido cerca, los rótulos de los vecinos se enciman entre sí y con la leyenda (captura 2 y 13); es cosmético y depende de cómo decida el founder la pantalla.

## Para el gestor

- Rama `grafo-3d` subida; sin PR (lo abre el gestor). Tres commits: el doc, el prototipo con sus capturas, y bitácora + OPEN_LOOPS.
- Solo documentos y un HTML: no hace falta build ni suite; sí el enlace de la vista previa para que el founder lo abra en su iPhone (ahí se mide lo que aquí no).
- Las diez preguntas están al final del doc 56; las tres primeras (asistentes como nodos, posición solo con «Dónde estás», tamaño vs «sin ranking») son las que cambian DEFINICION.
