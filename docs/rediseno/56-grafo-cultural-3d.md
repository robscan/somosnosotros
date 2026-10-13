# 56 · El grafo cultural en 3D: reglas de posición y de tamaño, y si es posible

**Estado:** propuesta para el founder, sin código de la app. **Prototipo navegable:** [`prototipos/grafo-3d.html`](prototipos/grafo-3d.html) (una sola página; datos reales de solo lectura del 12 de octubre de 2026, anonimizados). · **OL:** OL-393 · **Bitácora:** [424](../bitacora/2026/10/424-grafo-3d.md) · **Capturas:** `capturas-424/`.

Nota de numeración: el encargo decía «doc 53», pero el 53 (inventario de Publicar), el 54 y el 55 ya existen en `main`; este es el 56.

## 1. Lo que pidió el founder (12 de octubre de 2026, dictado)

«Primero me gustaría ver si podemos simular un ambiente tridimensional para que se pueda navegar entre los grafos, ya que podrían tener profundidad en los tres ejes. Como regla principal, me gustaría comenzar a definir cómo se organizan los puntos de cada uno de los nodos. Tenemos diferentes entidades: el lugar, el artista y el asistente. Las correlaciones son las que formarían el grafo. Debemos establecer reglas de posición y de tamaño.»

**Tamaño** («la intensidad de cada punto»):
- Lugares: a mayor cantidad de seguidores, más tamaño; a mayor cantidad de asistentes a sus eventos, también.
- Artistas: igual: más seguidores, más tamaño («les da notoriedad»); más asistentes a sus eventos en ciertos lugares, más tamaño.
- Asistentes: al decir que asisten a eventos aumentan su tamaño; se correlacionan al lugar al que van, al artista que siguen y al artista que fueron a ver («una correlación de forma indirecta»).

**Posición** («un plano tridimensional»):
- Lugares primero: «se posicionan con respecto a su posición geográfica real». Si un lugar está dos kilómetros al este de otro, el punto (serían esferas) queda alejado a escala en el espacio 3D en la medida que corresponde a esos metros. «Eso debería darnos la información suficiente para colocar los puntos.» Pide confirmar si es posible.
- Asistentes: cuando navegan y dan su posición (IP, coordenadas), esas coordenadas los colocan, «entendiendo que pueden cambiar»: hoy consulta desde un sitio y mañana desde otro, y el punto se mueve. **Sin revelar nunca su nombre, esto es muy importante.** Su punto se correlaciona con los lugares y los artistas.
- Artistas («los más difíciles»): más cerca del lugar en el que más tocan. Los que no están correlacionados ni con un lugar ni con un usuario «se podrían colocar fuera del ecosistema», como nodos sin conexión, «literalmente excluidos».

**Referencia visual:** el Preset Explorer de Absynth 6: fondo muy oscuro, una nube de puntos de colores con profundidad al centro, un punto elegido en blanco con anillo del que salen líneas a sus vecinos, un menú de árbol a la izquierda que apaga la nube salvo lo elegido, una lista a la derecha con lo filtrado y un mando de cuatro flechas con + y − abajo a la derecha. «Si se presiona, agranda los puntos y permite navegación […] y de esta manera profundizar en los puntos de interés.»

## 2. Respuesta corta: sí es posible, y ya se puede tocar

Las tres reglas se pueden cumplir con lo que la base guarda hoy, salvo una: **la base no guarda dónde está ninguna persona**, así que los asistentes del prototipo llevan posiciones inventadas (marcadas como tales) y la regla real de los asistentes necesita decisiones del founder (§ 5). El prototipo dibuja 745 esferas y 419 conexiones en el teléfono sin despeinarse (§ 7).

En una línea cada regla, tal como está en el prototipo:

| Nodo | Dónde va | Qué tan grande |
| --- | --- | --- |
| Lugar | En su sitio real, a escala: 1 unidad = 10 m desde el centro de la ciudad; en el suelo | Seguidores + asistencias a sus eventos |
| Artista | Flotando sobre el lugar donde más toca (promedio de sus lugares, pesando más lo próximo); en un halo para no encimarse | Seguidores + asistencias a sus eventos |
| Artista sin conexión | En un anillo exterior, a 8–9,5 km del centro, chico y gris | Fijo, el más chico |
| Asistente | Bajo el suelo, cerca de los lugares a los que va (**inventado** en el prototipo) | Tramos (baja · media · alta), nunca el número exacto |

## 3. Posición

### 3.1 Lugares: de latitud y longitud a metros

Sí es posible y es aritmética de una línea. Alrededor de un centro (lat₀, lng₀):

```
x (este)  = (lng − lng₀) · 111,32 km · cos(lat₀)
z (norte) = (lat − lat₀) · 111,32 km
```

Es la proyección equirrectangular local. A escala de ciudad el error es despreciable: a 10 km del centro se desvía menos de 10 m. El centro es el promedio de los lugares de San Luis Potosí (22,149 N, −100,979 O); allí un grado de longitud mide 103,1 km. Con los 66 lugares de la ciudad:

| Medida | Valor |
| --- | --- |
| Extensión este–oeste | 11,0 km |
| Extensión norte–sur | 7,4 km |
| Distancia al centro: mediana | 0,7 km |
| Distancia al centro: 9 de cada 10 están a menos de | 3,5 km |
| El más lejano | 6,65 km |

Es decir, dos tercios de los lugares caben en un círculo de 1 km y los demás se reparten hasta 7 km. En el prototipo 1 unidad = 10 m, los anillos del suelo marcan cada kilómetro, y el que está «dos kilómetros al este» queda exactamente 200 unidades a la derecha. El norte queda «hacia el fondo» con la cámara inicial.

**Otras ciudades.** Hay 3 lugares en San Miguel de Allende, a 140 km. A escala real quedarían fuera de cualquier pantalla. Opciones: (a) una escena por ciudad, como ordena «el contexto ordena, no limita» (la cercanía ordena, el país distingue); (b) comprimir lo lejano: más allá de 10 km la distancia crece en logaritmo (San Miguel aparece a unos 18 km «aparentes», en su rumbo real). El prototipo hace (b) para no esconder nada; propongo (a) para la app, con la otra ciudad como un cúmulo lejano al que se salta desde el árbol. Decide el founder (pregunta 5).

### 3.2 La tercera dimensión: capas por tipo de nodo

El plano del suelo ya gasta dos ejes en la geografía. Para la altura había tres candidatos:

- **Tiempo** (más arriba lo más reciente): mueve los lugares, que son lo fijo del grafo, y vuelve ambigua la distancia (¿lejos porque está lejos o porque fue hace mucho?).
- **Notoriedad**: ya la dice el tamaño; codificarla dos veces no suma.
- **Tipo de nodo, en capas**: lugares en el suelo (y = 0), artistas flotando encima (45–140 unidades) y asistentes debajo (−45 a −140). Es lo que hace el prototipo.

Elijo las capas: se lee de un vistazo quién es quién, la geografía se conserva al mirar desde arriba y, al inclinar la cámara, cada relación es una línea corta que cruza una capa. La profundidad de la cámara (acercarse, girar) da la sensación de «navegar entre los grafos» que pide el founder. El prototipo trae el control «Altura de las capas» (de 0, todo plano, a 2) para probarlo con los dedos y decidir (pregunta 4).

### 3.3 Artistas: cerca del lugar donde más tocan

1. Por cada artista se toman sus eventos visibles con ficha de lugar y se pesan: un evento próximo o en curso vale 2, uno pasado vale 1.
2. Su punto base es el **promedio ponderado** de las coordenadas de esos lugares. Con un solo lugar, es ese lugar; con varios, queda entre ellos, cargado hacia el que más pesa.
3. Para no encimarse, cada artista se corre un poco del punto base: los que tocan en un solo lugar forman un **halo** alrededor de él (radio 28 + 11·√k unidades, es decir 280 m para el primero y unos 880 m para el trigésimo, repartidos con el ángulo áureo para que no hagan filas); los que tocan en varios lugares se corren 180 m del promedio. La altura (45–140 unidades) es al azar con semilla fija, para que el prototipo salga igual cada vez.
4. Los que solo tienen eventos en **sitios libres** (sin ficha de lugar, con coordenadas) se colocan en ese sitio, sin línea a ningún lugar.

Hoy: 122 artistas tienen lugar (6 de ellos más de uno), 23 solo sitios libres y 518 nada.

### 3.4 Los que no tienen conexión: fuera, pero a la vista

Los 518 artistas sin evento ni lugar (casi todos los importados del catálogo municipal, CAPO) van en un **anillo exterior** a 8–9,5 km del centro, con altura al azar, chicos y en gris. Están «literalmente excluidos» del ecosistema, como pidió el founder, pero se ven: son los que faltan por conectar, y la casilla «Mostrar sin conexión» los apaga. Cuando a uno le llega su primer evento, salta del anillo al halo de su lugar.

### 3.5 Asistentes: la base no sabe dónde están

Hoy `perfiles` guarda nombre, foto, colonia (texto libre, apenas usado) y bio; **ninguna coordenada**. La app pide la ubicación solo con el botón «Dónde estás» y la usa para ordenar por cercanía; no la guarda. Así que en el prototipo cada asistente está en una posición **inventada**: cerca del promedio de los lugares a los que dijo que va, corrido 300–900 m al azar y bajo el suelo, con la etiqueta «posición inventada» en su tarjeta y en la leyenda.

Lo que haría falta para que fuera real está en § 5, porque no es un problema técnico: es de privacidad.

### 3.6 Correlaciones entre iguales

Pedido del founder la misma noche: «Me faltó agregar correlaciones entre iguales. Como entre artistas que tocan juntos en uno o varios lugares y entre lugares que participan en un mismo festival. Usuarios que coinciden en eventos también.» Las tres salen de lo que ya hay, sin tabla nueva, y van en el prototipo como líneas del color del tipo (las cruzadas son blancas):

| Entre | De dónde sale | Peso de la línea | Hoy |
| --- | --- | --- | --- |
| Artista y artista | Comparten un evento en `eventos_artistas` («tocan juntos») | Eventos compartidos | 133 líneas |
| Lugar y lugar | Son sede de actos del mismo festival (`evento_padre_id`) | Festivales compartidos | 22 líneas |
| Asistente y asistente | Voy o Me interesa al mismo evento («coinciden») | Eventos en común | 15 líneas |

Como dice el doc de Artistas (investigaciones), «compartió actividad con» es más preciso que «colaboró con»: estar en el mismo festival no prueba una actuación compartida. Por eso la línea artista–artista sale solo del mismo evento (el acto), no del festival entero. Las de lugares sí son por festival, que es lo que une a dos sedes. Las de asistentes son las más delicadas: dicen que dos personas estuvieron en el mismo sitio; en el prototipo son anónimas, y en la app dependen del umbral de la pregunta 10.

La tarjeta del elegido desglosa sus conexiones: «toca con 4 artistas · en 2 lugares · 3 asistentes».

## 4. Tamaño: raíz cuadrada con techo

```
peso  = seguidores + asistencias (Voy y Me interesa a sus eventos)
radio = 5 + 4 · √min(peso, 64)
```

| peso | 0 | 1 | 4 | 9 | 16 | 36 | 64 o más |
| --- | --- | --- | --- | --- | --- | --- | --- |
| radio (unidades) | 5 | 9 | 13 | 17 | 21 | 29 | 37 |

- La **raíz** hace que el doble de seguidores no sea el doble de esfera: lo que se percibe es el área, y el área crece con el cuadrado del radio. Con radio lineal, un lugar con 60 seguidores taparía a todos sus vecinos.
- El **techo** (64) evita que el día que un lugar junte 500 seguidores el grafo se vuelva una sola bola.
- Misma fórmula para lugares y artistas; las asistencias a un evento suman a su lugar y a cada artista del evento (la «correlación indirecta» del founder).
- Los **asistentes** no llevan número: tres tramos por su actividad (1 acción · 2 a 5 · 6 o más), radios 7, 10 y 13. Así nadie se distingue por «ser el que tiene 161».
- Los sin conexión miden 2,5 fijos.
- El prototipo trae el control «Tamaño de las esferas» (×0,4 a ×2,2) para calibrar a ojo.

**Con los datos de hoy el grafo se ve casi plano:** el lugar con más asistencias tiene 7 y el artista más seguido 6, así que casi todo mide entre 9 y 17. Es honesto: la app tiene 40 personas que han dicho Voy, Me interesa o Seguir. La fórmula está pensada para cuando sean miles.

**Un choque que decide el founder (pregunta 3):** la definición firmada el 2026-09-21 dice «las conexiones se muestran, no se puntúan: no hay ranking de artistas ni de lugares, y nada se destaca por tener más conexiones». Un tamaño por seguidores es, en la práctica, destacar por conexiones. Mi lectura: en una vista exploratoria el tamaño es un dato visual más, no una lista ordenada ni un «top», y los criterios de destacar del Inicio no cambian; pero hay que escribirlo en DEFINICION si se acepta.

## 5. La privacidad de los asistentes

**Lo firmado hoy choca con lo pedido.** DEFINICION, firmado el 2026-09-21: «El grafo es de lo público. Las personas que asisten no son fichas del grafo: se cuentan. Para entender la participación […] se usa un identificador sin nombre, solo en Administración y solo con lo que la persona declaró (Voy, Me interesa, Seguir); **nunca su ubicación ni lo que navega**». Y el doc 24 lo razona: «las personas no son nodos». El pedido del 12 de octubre pone a los asistentes como nodos, con ubicación que cambia. No es un detalle: hace falta una decisión expresa del founder y, si se acepta, cambiar DEFINICION y el aviso de privacidad (preguntas 1 y 2).

**La regla que propongo, si el founder decide que los asistentes sí son nodos:**

1. **Nunca nombre, foto, id ni enlace al perfil.** Tocar un asistente abre una tarjeta sin identidad: «Asistente · actividad media · 3 conexiones». Ni el admin ve más desde el grafo (para eso está Administración con su identificador sin nombre).
2. **Solo con permiso explícito**, apagado de origen: un interruptor en Ajustes, «Aparecer en el grafo como punto anónimo», con su frase de qué se muestra y qué no. Quien no lo enciende suma a los tamaños (ya lo hace hoy: «12 van») pero no es un punto.
3. **La posición nunca sale de la IP.** La IP da la ciudad con suerte y a veces otra; y pedirla sin que la persona haga nada es rastreo. Solo la ubicación que la persona da con el botón «Dónde estás» (un gesto suyo, con permiso del navegador), y solo si tiene encendido el interruptor del punto 2.
4. **Redondeada antes de guardarse:** a una cuadrícula de 500 m y con un corrimiento al azar de hasta 300 m que se fija por persona y no cambia (si cambiara en cada consulta, se promediaría y se recuperaría la casa). Nunca se guarda la coordenada cruda ni un historial: cada posición nueva **reemplaza** a la anterior, así «hoy consulta desde un sitio y mañana desde otro, y el punto se mueve», como pidió el founder, sin dejar rastro del recorrido.
5. **Tamaño por tramos**, nunca el número (§ 4).
6. **Sin líneas desde Seguir.** Seguir es privado (la ficha dice «3 siguen», no quiénes). Las líneas de un asistente salen solo de Voy y Me interesa, que la app ya enseña con nombre a quien tiene sesión («Van 2: Ana y Marcos»).
7. **Umbral de anonimato:** si un evento tiene menos de 3 personas con Voy, las líneas de sus asistentes no se dibujan (si no, «un asistente anónimo → ese evento» más «Fueron 1: Ana» en la ficha es Ana con otro nombre). El 3 es propuesta (pregunta 10).
8. **Se borra con la cuenta** y al apagar el interruptor.
9. En Administración puede existir una variante con el identificador sin nombre, como ya está firmado; no en lo público.

**Lo que hace el prototipo** (está en un repositorio público, así que se trató como público): 13 asistentes, los que dijeron Voy o Me interesa a eventos visibles; sin id, en orden barajado, con tramo en vez de número, posición inventada y líneas solo desde Voy y Me interesa. Las 27 personas que solo siguen no se dibujan; sus seguimientos solo suman a los tamaños. No aplica el umbral del punto 7 (la cuenta es tan chica que casi nada se dibujaría); por eso mismo conviene decidirlo antes de que esto sea pantalla.

## 6. Qué datos hay ya en la base (12 de octubre, solo lectura)

Leído con la llave de servicio del `.env` local, sin escribir nada y sin imprimir la llave. Solo lo visible y no borrador.

| Dato | Cuenta | Para el grafo |
| --- | --- | --- |
| Lugares con coordenadas | 69 (66 en San Luis, 3 en San Miguel de Allende; 18 casas de cultura, 13 museos, 12 foros, 9 escuelas, 5 galerías, 3 colectivos, 3 bibliotecas, 6 otros) | 69 nodos, posición real |
| Artistas | 663 (333 música, 116 artes visuales, 67 teatro, 42 letras, 32 danza, 29 cine, 7 circo, 37 por completar) | 663 nodos: 122 con lugar, 23 en sitios libres, 518 sin conexión |
| Eventos | 336 (167 pasados, 169 próximos o en curso; 298 con ficha de lugar, 38 en sitio libre; 10 festivales) | Las líneas artista–lugar salen de aquí; 39 lugares tienen eventos; 22 líneas lugar–lugar por festival compartido |
| Evento–artista | 190 pares válidos | 129 líneas artista–lugar (sumando por lugar) y 133 artista–artista (comparten evento) |
| Seguimientos | 262 (213 a artistas, 49 a lugares) | Solo tamaño |
| Asistencias | 67 (59 Voy, 8 Me interesa), de 14 personas | 36 líneas asistente–lugar, 84 asistente–artista y 15 asistente–asistente (coinciden) |
| Personas con alguna acción | 40 de 71 perfiles; dos cuentas concentran 264 de las 329 acciones | 13 nodos en el prototipo |

**Total hoy: 745 nodos y 419 líneas** (249 cruzadas y 170 entre iguales). Lo que falta en la base para que esto sea más que un prototipo: la posición de las personas (§ 5), el papel y la procedencia de cada relación (hueco 2 del doc 24: hoy «participa» es la única relación artista–evento) y, con uso, las relaciones con papel (quién curó, quién organizó) que afinarían las líneas entre iguales de § 3.6.

## 7. La tecnología en la PWA del iPhone

- **three.js 0.186.1** (WebGL), cargado como módulo desde cdnjs en el prototipo; en la app iría dentro del paquete, en una ruta que se carga solo al entrar al grafo. Pesa 194 KB comprimido (90 KB el módulo + 104 KB el núcleo), más que cualquier pantalla de hoy: por eso no debe cargarse en Inicio.
- **Una sola malla instanciada** para todas las esferas (`InstancedMesh`: una geometría, una llamada de dibujo, color y tamaño por instancia). Todas las líneas se ven siempre, tenues (`LineSegments` al 16 %), y las del nodo elegido brillantes encima; con un elegido las demás bajan aún más. Pedido del founder al ver la primera versión, que copiaba a Absynth (líneas solo del elegido); la casilla «Todas las líneas, tenues» apaga las tenues para comparar.
- **Tocar:** un rayo exacto contra esferas de 5 unidades a 1 500 de distancia no acierta nunca con el dedo. El prototipo proyecta los nodos visibles a la pantalla y elige el más cercano al dedo dentro de 22 px (más el radio aparente). Son 745 proyecciones por toque: nada.
- **Cámara:** órbita propia de 60 líneas, sin `OrbitControls` (que en three moderno vive fuera del núcleo): un dedo gira e inclina, dos dedos acercan y mueven, la rueda acerca; el mando de flechas (girar, inclinar, +, −, centro) y las teclas de flecha hacen lo mismo; tocar un renglón de la lista vuela al nodo. Los arrastres terminan solo con `pointerup`/`pointercancel`, como aprendimos en Safari.
- **Se dibuja solo cuando algo cambia** (no hay bucle fijo): en reposo no gasta batería, y «fps» en la barra solo cuenta mientras hay movimiento.
- **Sin librerías de grafos 3D** (3d-force-graph, etc.): traen un motor de fuerzas que colocaría los nodos por atracción, justo lo contrario de la regla geográfica del founder, y pesan el doble. Lo nuestro es colocar por reglas y dibujar; three.js basta.

**Lo medido** (Chrome 152, navegador integrado de la sesión, Mac con Apple M4 Pro, pantalla a 2×; el iPhone no se puede medir desde aquí):

| Escena | Cuadros por segundo | CPU por cuadro |
| --- | --- | --- |
| 745 nodos, 390×844 | 120 (es el tope de la pantalla) | 0,05 ms |
| + 5 000 esferas más | 119 | 0,07 ms |
| + 20 000 esferas más | 117 | 0,04 ms |

Es decir, en la Mac el límite no se alcanza ni con 28 veces los nodos de hoy. En un iPhone la tarjeta gráfica es menor y Safari limita a 60 cuadros: la prueba que cuenta es en el iPhone del founder, en Safari y en la app instalada, con la vista previa de la rama. Las funciones `medirFps()`, `medirRender()` y `estresar(n)` quedan en la página para repetir la medición en cualquier aparato desde la consola.

## 8. Lo que no entra todavía

- Rutas, trayectos y «recorridos» de personas: no (sin rastreo).
- Eventos como nodos: hoy son las líneas (un evento une artista y lugar). Dibujarlos como esferas duplicaría el grafo; se puede probar en una segunda vuelta si el founder lo quiere.
- Obras y novedades: siguen fuera, como en el doc 24.

## 9. Preguntas abiertas

1. **¿Los asistentes son nodos?** Lo firmado el 2026-09-21 dice que no («se cuentan»; «nunca su ubicación»). Si sí, ¿con el interruptor apagado de origen y la regla de § 5?
2. **¿La posición de una persona sale solo del botón «Dónde estás»?** Propongo que nunca de la IP.
3. **¿El tamaño por seguidores y asistencias cabe con «no hay ranking»?** Propongo sí, escribiéndolo en DEFINICION como vista exploratoria, sin listas ordenadas públicas.
4. **Tercera dimensión:** capas por tipo (lugares en el suelo, artistas arriba, asistentes abajo), ¿o todo en el plano con la profundidad solo de la cámara? El control «Altura de las capas» en 0 enseña la segunda.
5. **Otras ciudades:** una escena por ciudad (propuesta) o lo lejano comprimido en logaritmo (lo que hace el prototipo).
6. **¿Fondo oscuro para esta pantalla?** La app es de tema claro; la referencia es oscura y la cabecera oscura de las fichas ya existe. El prototipo trae los dos a un toque.
7. **El tercer color.** Violeta para lugares y crema para artistas; el negro de la línea gráfica desaparece sobre fondo oscuro, así que los asistentes van en el naranja cempasúchil de los destacados (en tema claro: violeta, tinta y naranja). ¿Vale, o prefiere otro?
8. **¿Dónde vive y quién lo ve?** Una pantalla aparte fuera de las cinco pestañas (por ejemplo desde «···» o desde Lugares), pública o solo con sesión.
9. **Los sin conexión:** ¿a la vista en gris, como ahora, o escondidos de origen?
10. **Umbral de anonimato:** ¿3 personas con Voy para dibujar las líneas de un asistente a ese evento?
