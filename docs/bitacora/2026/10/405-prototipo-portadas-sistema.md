# 405 · Prototipo de portadas del sistema para festivales, exposiciones y talleres (OL-374)

**Fecha:** 2026-10-11. **Rama:** `prototipo-portadas-sistema`, base `origin/main` (`622cd190`). **Operador:** Claude (agente del gestor V), retomando el trabajo de otro agente que se quedó sin cuota a medias. **Sin código de la app y sin migración.**
**Estado:** prototipo listo para que el founder lo pruebe en su iPhone y lo firme o lo corrija; lo publica el gestor como página privada.

## Lo que pidió el founder (textual)

- 2026-10-11: «Quisiera facilitar que se distingan los festivales, galerías, talleres de los eventos en inicio. Ya tenemos un chip que lo hace. Además de un carril. Pero tenemos también la desventaja de la sobrecarga cognitiva con carteles que tienen mucho texto y no se leen por el tamaño. […] me gustaría que me ayudaras a generar una solución para las cards de este tipo de eventos. Quisiera que se usaran portadas del sistema […] partículas y figuras geométricas (como ley de Prägnanz) que dejen claro qué tipo de objeto es con el uso de figuras. Estas cards podrían definir sus colores usando […] la identificación de colores en el cartel. Si identificamos los colores que se usan en el cartel podemos definir colores distintivos por cada card. […] En estos elementos podemos integrar el título a la card.»
- Después del análisis del gestor: «Elimina movimiento por ahora, tu punto de saturación es cierto. Revisa la página de lawsofux, a eso me refiero con uso de figuras geométricas, pero quiero que usemos lineamientos de Bauhaus de diseño gráfico. Tienes razón con que se perdería identidad en galerías si solo mostramos la tarjeta, pero pienso que ganamos claridad en lectura. ¿Y si haces una propuesta donde las figuras reaccionen al movimiento del celular? Prepara por favor.»

## El prototipo

[`docs/rediseno/prototipos/portadas-sistema.html`](../../../rediseno/prototipos/portadas-sistema.html) (180 KB) con sus imágenes en [`portadas-sistema/`](../../../rediseno/prototipos/portadas-sistema/) (47 archivos, 956 KB). Mismo armazón y misma forma de trabajar que el prototipo firmado de las tarjetas (bitácora [398](398-prototipo-inicio-tarjetas.md)): tokens de la app, Bricolage de Google Fonts, el logotipo, la barra, la fila de contexto, la fila «Ahora» y la barra de secciones; sin `<!doctype>` ni `<head>` (la publicación los pone). El teléfono va siempre en tema claro; el marco de la página sigue el tema de quien mira.

- **En el iPhone:** Inicio a todo lo ancho y un botón flotante «Ejercicios · Propuesta» que abre una hoja con los preajustes, el medidor, el porqué, los interruptores, las medidas por tarjeta, las pruebas y las notas.
- **Desde 760 px:** el teléfono (390×844, escalado) y los controles al lado. **Desde 1180 px:** «Hoy» a la izquierda, la combinación a la derecha y los controles al costado; los dos teléfonos se desplazan juntos.
- Abre en «Propuesta» y recuerda la última combinación en ese navegador (`portadas-sistema:estado:1`). Con `#hoy`, `#propuesta`, `#minima` o `#muestrario` abre en ese estado.
- «Ver todas las portadas» abre el muestrario: los 22 festivales, expos y talleres de hoy en grande y los 4 eventos sin imagen en mediana, cada uno con su composición, de dónde sale su color y su contraste.

### Cómo se armó «Hoy»

- **Hora fija:** dom 11 de oct de 2026, 14:16 en San Luis Potosí (20:16 UTC, la de la extracción del gestor).
- **Datos:** los públicos que extrajo el gestor (`eventos.json`, `lugares.json`, `artistas.json`), sin consultar producción. 80 eventos vigentes: 6 festivales (3 con cartel), 15 exposiciones (10 con cartel; una es un acto de Fotovisión y no sale suelta) y 3 talleres (1 con cartel).
- **Con el código de la app:** un guion empaqueta con esbuild las funciones de `src/lib` (`calcularCarrilesAgenda`, `carrilTusPlanes`, `tarjetaDeInicio`, `cejaDeTarjeta`, `chipDeTarjeta`, `ordenarTarjetasPorFoto`, `candidatosAhora`, `rotulosAhora`, `tarjetasDeSemana`, `sedesDeFestival`, `portadaDeFestival`, `paletaPropia`, `degradadoTarjeta`, `TRAZO_SN`) y escribe el modelo que va dentro de la página.
- **Persona de ejemplo:** va al laboratorio de exploración sonora (taller) y le interesan KOWAIFEST (festival) y DESIERTO (expo), para que las tres clases salgan en «Tus planes».
- **Carriles:** Tus planes 3, Destacados 4, Esta semana 20, Festivales y expos 19, Lugares de la semana 13, Artistas destacadxs 7, Artistas de la semana 7. «Nuevos eventos» no sale: la app pide 3 como mínimo y hoy no hay. La fila «Ahora» tiene dos: Verbena y Cine en el museo.
- **«Hoy» es la producción de hoy** (lo firmado en OL-367, «Firmada»): medido contra `inicio-tarjetas.html` en el mismo Chrome, la tarjeta grande mide 165×206, el título 17 px 700, el sello 26 px 600, el lugar 15 px gris y cuándo 15 px violeta, igual en los dos.

### Lo que dejó el agente anterior y qué hice con ello

- **Usé tal cual:** el servidor de vista previa, el modelo (`modelo.ts`) y las 47 imágenes. Las revisé contra el modelo: están las 44 que pide la página (todas de 400 px de ancho o menos; los avatares, de 384) más el logotipo, el símbolo SN y la imagen sin foto. No sobra ninguna.
- **Amplié el modelo** con el trazo del símbolo SN (para pintarlo del color del título), de dónde sale la foto de cada tarjeta (su cartel, el cartel de su próximo acto o la foto del lugar) y los colores guardados del acto. Los festivales sin cartel propio (Cinema, Verbena) enseñan en producción el cartel de su próximo acto, así que su portada toma el color de ese cartel.
- **Conservé el armazón de la plantilla:** los dos teléfonos, la hoja, los preajustes, las pruebas y los ganchos para las capturas.
- **Rehíce el sistema de portadas:** el color, las composiciones, el dibujo, el medidor y la inclinación. La plantilla anterior ponía el título en una franja de otro tono, más oscura y con texto blanco, y deformaba las figuras al estirar el dibujo. Esta propuesta usa un solo color plano por tarjeta, como las tarjetas de lawsofux, y el título del color que le toca (crema u oscuro).
- **Arreglé** el botón «Parar» de las pruebas, que llevaba dos atributos `class` y nunca se pintaba como activo.

## Las referencias

- **lawsofux.com** (abierta en el navegador integrado). Cada ley es una tarjeta de un color sólido medio (verde olivo `#5d883a`, magenta `#a6307f`, naranja `#de6717`, ciruela `#7e3e57`), con un solo crema (`#f4f1d0`) y escalones del mismo color (el crema o el negro al 20 %). Las figuras son primitivas centradas: anillos concéntricos (Fitts), marcos anidados que se aclaran (Flow), una retícula de puntos (Proximidad) y otra con unos cuantos en crema (Similitud). Sin degradados, sin sombras y sin texturas.
- **Bauhaus en diseño gráfico.** Tres figuras primarias, color plano, equilibrio asimétrico sobre retícula, figuras que se solapan y cuyo cruce toma un tercer tono, contraste fuerte y nada de adorno. El cuestionario de Kandinsky de 1923 pedía asociar cada figura con un primario: triángulo amarillo, cuadrado rojo, círculo azul. Albers, maestro de la Bauhaus, pintó cuadrados anidados que bajan hacia el pie («Homenaje al cuadrado»). La letra es la de la app: la marca no cambia.

## El razonamiento

- **Prägnanz:** la figura más simple y regular se reconoce primero y desde lejos. Una sola figura grande se lee a 132 px; un cartel lleno de texto no se lee a 165. Por eso la clase la dice una figura, no un detalle.
- **Semejanza:** lo que se parece se agrupa. Todos los círculos de Inicio se leen como «lo mismo» (festivales), en cualquier carril. Los tres arreglos son los mismos para las tres clases, así que las portadas se reconocen como un solo sistema y solo la figura cambia.
- **Figura y fondo, región común:** el título vive en una zona tranquila, del mismo color plano y sin ninguna figura detrás. El sello de fecha y el chip conservan su fondo propio, como en producción.
- **El color distingue tarjetas, no clases:** cada tarjeta toma el color de su cartel, así que dos festivales seguidos tienen colores distintos. La clase la dicen la figura y la palabra de la ceja; el color nunca la dice.

## La correspondencia de figuras

- **Festival = círculo:** lo que reúne, un centro y todo lo que pasa alrededor (el ruedo, el sol, el público).
- **Exposición = cuadrado:** un cuadro. En español es la misma palabra, y la retícula de cuadros es la pared de una galería.
- **Taller = triángulo:** la escuadra, la herramienta, lo que se construye paso a paso.

Pensé en otras dos y las descarté. Taller = cuadrado (la mesa de trabajo) le quitaba a la expo su lectura más directa, «cuadro». Festival = estrella o rayos rompía la regla de las tres primarias. La correspondencia del encargo es la mejor que encontré.

## Las composiciones

**Reglas de la retícula, para todas:**
- La figura se apoya en la línea del título, como un objeto sobre una repisa, y se alinea con su margen (12 px).
- Deja libre la esquina del sello de fecha. El espacio libre tiene forma de L: la figura toma la mayor de dos cajas, la de todo el ancho por debajo del sello o la de todo el alto a la izquierda del sello.
- Debajo de la línea no entra nada: el dibujo se recorta ahí.

Cada evento lleva siempre el mismo arreglo, elegido por su id (FNV-1a, distinto del que elige la paleta propia de la app, para que color y arreglo no vayan de la mano).

**A · una figura por clase, a la Kandinsky.** Tres arreglos que comparten las tres clases:
- **Cruce:** dos figuras iguales que se cruzan; el cruce, en un tercer tono (la transparencia de la Bauhaus).
- **Escala:** una figura grande y oscura que entra por el borde izquierdo y una chica en crema que se le monta.
- **La firma de la clase:** para el festival, el **Horizonte** (un sol entero sobre la línea con dos círculos mayores detrás que la línea corta); para la expo, el **Cuadro** (el homenaje al cuadrado de Albers); para el taller, la **Escuadra** (un triángulo recto con su hueco).

**B · patrones, a la lawsofux.** Tres arreglos que comparten las tres clases:
- **Anidados:** la figura repetida hacia adentro en escalones de tono (diana, cuadros de Albers, triángulos).
- **Retícula:** muchas figuras iguales y oscuras con unas cuantas en crema, en diagonal (semejanza). Son las «partículas» del pedido. En la expo, un cuadro grande en crema en la pared de cuadros.
- **Ritmo:** una hilera que crece sobre la línea (círculos y cuadros) o, en el taller, una tira de triángulos alternados.

**Lo que probé y descarté** en el laboratorio (tres vueltas, mirando cada una en Chrome a 2×):
- Puntos sueltos de acento y barras o líneas horizontales: se leían como ruido o como subrayado del título.
- Figuras que pasaban bajo el sello o que no se alineaban con el título.
- Un triángulo «cuña» en un taller de 165 px: se leía como flecha de «reproducir».

## Las paletas y sus respaldos

- **P3 «Cartel» (la de la Propuesta):** el color más vivo del cartel (`colores_cartel[1]`, el que ya guarda la app al subirlo) llevado a un medio tono. Se queda el tono; la saturación va entre 0,32 y 0,7; la luz se lleva a una de dos bandas:
  - **Oscura** (luminancia 0,13 o menos), con figura y título en crema `#f4efd6`: 5,0:1 o más por construcción.
  - **Clara** (luminancia 0,30 o más), con figura y título en negro `#1a1a1a`: 5,8:1 o más. Les toca a los amarillos, mostazas y olivos (tono de 40° a 80°): un amarillo oscurecido se vuelve café verdoso, y amarillo con negro es el cartel de la Bauhaus.
  - Entre 0,15 y 0,23 ni crema ni negro llegan a 4,5:1, por eso la base nunca se queda ahí.
  - Escalones del mismo color: oscuro, más oscuro (para lo de atrás) y claro (el cruce), y un solo crema para todo el sistema.
- **Respaldo:** cuando el cartel es gris (croma menor que 28 de 255; hoy Fotovisión, `#614b47`), cuando la tarjeta enseña la foto del lugar o cuando no hay imagen, el color sale de las luces de las paletas propias de la app, sin repetir tono: nueve colores (cada paleta trae dos luces casi iguales). Lo elige el id.
- **Un festival sin cartel propio** toma el color del cartel de su próximo acto, que es lo que la tarjeta enseña hoy (OL-346): Cinema, `#c61b17` de Chatbot Challenge; Verbena, `#e19e53`.
- **P3 «Bauhaus»:** azul, rojo y amarillo por clase (círculo azul, cuadrado rojo, triángulo amarillo, el cuestionario de Kandinsky).
- **P3 «Propias»:** el respaldo para todas.

## El título

Con P4 encendido, el chip, la ceja y el título van abajo, dentro de la portada:
- El chip y la ceja comparten renglón, para no quitarle a la figura un renglón entero.
- La ceja va en el mismo color que el título: en la tarjeta sin cartel de hoy era blanca al 72 % y no llegaba a 4,5:1.
- El título va a 19 px 800 en la grande y 17 px en la mediana, en dos líneas como mucho, cortado en palabra entera con «…».

Ninguna figura pasa detrás: el dibujo se recorta en el borde de la zona del título, que se mide en la página después de colocar el texto.

## El contraste medido

Medido en los píxeles reales a 2× con el Chrome de la Mac: se esconde el texto, se captura cada portada y se toma el peor píxel dentro de cada renglón del título y de la ceja. Cada renglón se recorta a la caja del elemento, porque lo que sobresale no se pinta. El medidor de la página da lo mismo, con 0,02 de diferencia como mucho.

**Propuesta, las 26 portadas con texto encima** (A, «Cartel», título sobre la portada, todo Inicio, P7):

| Tarjeta | Clase | Arreglo | Color de origen | Base · banda | Título | Ceja |
|---|---|---|---|---|---|---|
| Ciclo Fellini | Festival | Cruce | cartel `#d7396c` | `#bd2657` oscura | 5,08:1 | 5,08:1 |
| Fotovision 31 | Festival | Horizonte | cartel gris `#614b47` → respaldo `#0f7c6c` | `#147163` oscura | 5,09:1 | 5,09:1 |
| Cinema | Festival | Horizonte | cartel de su próximo acto `#c61b17` | `#bc2521` oscura | 5,30:1 | 5,30:1 |
| Verbena | Festival | Cruce | cartel de su próximo acto `#e19e53` | `#8f5719` oscura | 5,12:1 | 5,12:1 |
| Kowaifest | Festival | Cruce | cartel `#721323` | `#821729` oscura | 8,63:1 | 8,63:1 |
| Xantolo ¡Se vive en tu ciudad! | Festival | Escala | foto del lugar → respaldo `#ffd23f` | `#dfbc49` clara | 9,47:1 | 9,47:1 |
| El desplazamiento del eco | Expo | Cruce | cartel `#832478` | `#832478` oscura | 7,30:1 | 7,30:1 |
| Cachorros de Tigre | Expo | Escala | foto del lugar → respaldo `#ffd23f` | `#dfbc49` clara | 9,47:1 | 9,47:1 |
| La memoria del agua | Expo | Cuadro | foto del lugar → respaldo `#2d3fd6` | `#2637c4` oscura | 7,49:1 | 7,49:1 |
| Pre-Ruptura | Expo | Cruce | foto del lugar → respaldo `#6d34c8` | `#6530ba` oscura | 6,76:1 | 6,76:1 |
| Reflejo atemporal | Expo | Cuadro | foto del lugar → respaldo `#ffd23f` | `#dfbc49` clara | 9,47:1 | 9,47:1 |
| El rostro del paisaje es una máscara | Expo | Escala | cartel `#b37f3a` | `#835d2a` oscura | 5,10:1 | 5,10:1 |
| Esencialismo | Expo | Escala | cartel `#235a8a` | `#235a8a` oscura | 6,26:1 | 6,26:1 |
| Homenaje al Dr. Salvador Gómez Eichelman | Expo | Escala | cartel `#a27486` | `#974e6a` oscura | 5,03:1 | 5,03:1 |
| Lxs colocaos | Expo | Cuadro | cartel `#9a674a` | `#875a41` oscura | 5,09:1 | 5,09:1 |
| Hilaridad y melancolía | Expo | Cruce | cartel `#9b6a45` | `#865c3c` oscura | 5,03:1 | 5,03:1 |
| Líneas de fuga | Expo | Escala | cartel `#9b6a45` | `#865c3c` oscura | 5,03:1 | 5,03:1 |
| Privacidad y elegancia | Expo | Cruce | cartel `#9b6a45` | `#865c3c` oscura | 5,03:1 | 5,03:1 |
| Una vez más | Expo | Escala | cartel `#e3cb00` | `#c1b022` clara | 7,87:1 | 7,87:1 |
| Desierto | Expo | Cruce | cartel `#374e5a` | `#345465` oscura | 6,98:1 | 6,98:1 |
| Querida yo | Taller | Cruce | foto del lugar → respaldo `#ffd23f` | `#dfbc49` clara | 9,47:1 | 9,47:1 |
| Laboratorio de exploración sonora | Taller | Escuadra | cartel `#3e3f23` | `#979a4f` clara | 5,84:1 | 5,84:1 |
| Primer recital musical de otoño… | Evento sin imagen | Neutra (P7) | respaldo `#0f7c6c` | `#147163` oscura | 5,09:1 | – |
| Lectura homenaje a la poeta Olimpia Badillo | Evento sin imagen | Neutra (P7) | respaldo `#6d34c8` | `#6530ba` oscura | 6,76:1 | – |
| Yo Marcos | Evento sin imagen | Neutra (P7) | respaldo `#ffd23f` | `#dfbc49` clara | 9,47:1 | – |
| Presentación de Palabra fértil | Evento sin imagen | Neutra (P7) | respaldo `#6d34c8` | `#6530ba` oscura | 6,76:1 | – |

**Lo mínimo de cada combinación** (las mismas 26):

| Combinación | Peor título | Mejor |
|---|---|---|
| Propuesta (A, cartel) | 5,03:1 | 9,47:1 |
| P2 patrones (B) | 5,03:1 | 9,47:1 |
| P3 Bauhaus | 5,04:1 | 9,47:1 |
| P3 Propias | 5,06:1 | 9,47:1 |
| P6 enmarcada | 5,03:1 | 9,47:1 |
| Hoy, sin cartel (E10), las 4 de la semana | **2,52:1** (Lectura homenaje) | 3,08:1 |
| Título debajo (Hoy, Mínima, P4 apagado) | 16,0:1 (negro sobre `#f6f5f1`) | – |

El arreglo no cambia el contraste: el título nunca tiene figuras detrás, así que solo cuenta la base. La tarjeta sin cartel de hoy (E10) se queda entre 2,5:1 y 3,1:1, porque el degradado claro pasa detrás de las letras blancas (el gestor midió 2,3:1 en el peor punto). Con P7 esas cuatro suben a 5,1–9,5:1.

## Los ejercicios

- **P1 · Portada del sistema.** Festival, exposición y taller llevan una portada hecha por la app en vez del cartel. El cartel sigue en la ficha y en la historia, que es donde la identidad de una galería se puede ver a buen tamaño.
- **P2 · Patrones en vez de una figura.** Apagado, A; encendido, B.
- **P3 · Paleta.** Cartel (con respaldo), Bauhaus o Propias.
- **P4 · Título sobre la portada.** Encendido, en la zona de abajo. Apagado, debajo de la tarjeta como lo firmado, y la figura usa toda la portada.
- **P5 · En todo Inicio.** Encendido: Tus planes, Destacados, Esta semana y Festivales y expos. Apagado: solo «Festivales y expos».
- **P6 · Exposición enmarcada.** El cartel, chico, como cuadro colgado (marialuisa crema, una línea oscura y una sombra plana del escalón oscuro) en una pared de sus colores, apoyado en la línea del título. Sin cartel propio, su cuadrado de siempre.
- **P7 · Sin imagen, la misma gramática.** El evento común sin imagen deja el degradado de E10. Lleva un color plano de respaldo, el símbolo SN arriba a la izquierda (donde E10 lo tenía, pintado del color del título) y el título abajo. **Sin figura:** la figura queda para las tres clases. Así una tarjeta con figura es siempre festival, expo o taller, y una con el SN es un evento sin imagen. Resuelve el riesgo de confundirlas: las dos gramáticas se vuelven una.
- **P8 · Reacciona al teléfono.** Ver abajo.
- **Medidas.** Cada portada con texto encima enseña su contraste en la esquina; en la hoja, una tabla por tarjeta (título y ceja).

### Preajustes

- **Hoy:** todo apagado (producción).
- **Propuesta:** P1 + P2 A + P3 «Cartel» + P4 sobre + P5 todo Inicio + P7. Sin P6 ni P8. La página lo explica en la hoja: una figura grande por clase se reconoce de un vistazo (Prägnanz); el arreglo cambia de tarjeta en tarjeta sin cambiar la figura (semejanza); el color sale del cartel y distingue cada tarjeta; el título va dentro, en su zona sin figuras, a 5:1 o más; en todo Inicio, para que un taller se vea igual en cada carril; y el evento sin imagen entra al mismo sistema, sin figura, para no confundirse.
- **Mínima:** P1 solo en «Festivales y expos», con el título debajo como lo firmado.

### Las pruebas

Tres tareas con cronómetro, como en el prototipo 398: «Encuentra un taller», «¿Qué festival está pasando?» y «Encuentra una expo que cierre en noviembre». El tiempo se guarda por preajuste en ese navegador (`portadas-sistema:tiempos`).

## P8 · Las figuras reaccionan al teléfono

- **Qué hace:** con la inclinación, las figuras de adelante se corren hasta 4 unidades (6,6 px en la tarjeta grande, 5,3 px en la mediana) y las de atrás la mitad, así parece que tienen profundidad. ±25° desde la postura en que se activó llenan el recorrido. El cruce sigue a su figura de atrás. El título, el chip, el sello y la línea del título no se mueven: el recorte del campo es fijo, así que nada entra a la zona del título. Solo se mueven las portadas a la vista (`IntersectionObserver`), y el cálculo se detiene en cuanto el teléfono se queda quieto.
- **Apagado por omisión** (decisión del founder: nada de movimiento automático). Con «Reducir movimiento» el interruptor queda deshabilitado y la hoja lo dice.
- **El permiso:** en iPhone, `DeviceOrientationEvent.requestPermission()` solo funciona después de un toque. Por eso al encender P8 aparece el botón «Activar el giroscopio». Si se niega, queda el arrastre.
- **La página publicada:** en claude.ai la página vive dentro de un marco de otro origen. Es probable que Safari no le entregue el giroscopio. Si nada se mueve, la hoja lo dice y propone el respaldo.
- **El respaldo:** mantener el dedo 250 ms sobre una portada y arrastrarlo la inclina; al soltar, vuelve, y soltar no abre la ficha. Si el dedo se mueve antes de los 250 ms, es un desplazamiento normal y no se toca. Con P8 encendido, mantener el dedo no abre la vista previa del enlace de Safari ni selecciona texto.
- **Los costos:**
  - **El permiso:** es un aviso del sistema que hay que explicar y que se puede negar.
  - **La batería:** el sensor queda encendido mientras se ve Inicio, y las portadas a la vista se repintan mientras el teléfono se mueve.
  - **El roce con el desplazamiento:** el gesto del arrastre compite con deslizar los carriles, y el giroscopio mueve las figuras al caminar o al ir en el camión.
- **Comprobado** con eventos `deviceorientation` sintéticos. La postura de partida y luego 25° a la derecha y 12,5° hacia el frente dan 4 y 2 unidades: la capa de adelante en `translate(3.98 1.99)`, la de atrás en `translate(1.99 1.00)`, el título sin transformación. Al volver a la postura de partida, todo regresa. El arrastre real con el dedo (eventos táctiles por CDP) corre 30 px a la izquierda y da `translate(-3.00 0.00)`; al soltar, vuelve. **No se probó en un iPhone real.**

## Comprobado con toques reales

Chrome de la Mac con playwright-core, 390×844 a 2×, táctil, la página envuelta como la publicación. Antes de cada toque, `elementFromPoint` confirma que el centro del control es el control. 64 comprobaciones, todas bien, sin errores en la consola:

- Con la hoja cerrada, el velo no tapa el teléfono y el botón flotante recibe el toque.
- La hoja se abre. Los tres preajustes aplican su combinación; los cinco interruptores (P2, P4, P5, P6, P7) cambian y vuelven; las tres opciones de P3 responden; «Medidas» pone el contraste en cada portada.
- P8 enseña «Activar el giroscopio», que responde («Esperando al giroscopio…»), y la ✕ cierra la hoja.
- La inclinación y el arrastre, como arriba.
- Tocar una portada del sistema abre la ficha; tocar el sello de fecha también, porque está dentro del enlace.
- El muestrario se abre y se cierra. Una prueba cronometrada arranca, se para y guarda el tiempo con «Propuesta». Tocar el velo cierra la hoja.
- A 360, 390 y 400 px no hay desplazamiento lateral.
- **Además:** a 1280×800, los dos teléfonos y el panel; a 1024×768 en modo oscuro, el marco oscuro y el teléfono claro; con «Reducir movimiento», P8 deshabilitado.

Un tropiezo que salió aquí: el porqué de la Propuesta estaba dentro del resumen fijo de la hoja, que creció tanto que tapaba los interruptores al desplazarse. Lo saqué del resumen y la prueba volvió a pasar.

## Capturas

[`docs/rediseno/capturas-405/`](../../../rediseno/capturas-405/), Chrome de la Mac con playwright-core: 390×844 a 2×, las hojas de contactos a 2× en tres columnas y los lados a lado a 1280×844. Pasadas al repo con `scripts/ops/auditoria-ui/comprimir.mjs` (4,2 MB). Abiertas una por una:

- `01-hoy-pliegue.png` — Inicio de hoy. En «Tus planes», el cartel del laboratorio (título en letra de máquina, duración, sesiones, sede: ilegible a este tamaño) y el de DESIERTO; la fila «Ahora» con Verbena y Cine en el museo; asoman Destacados con Verbena y CINEMA.
- `02-hoy-festivales-y-expos.png` — el carril «Festivales y expos» de hoy: Verbena (cartel con dos columnas de texto) y Cinema (el cartel de su próximo acto, Chatbot Challenge, con más texto).
- `03-propuesta-pliegue.png` — la Propuesta. El laboratorio con la escuadra negra sobre olivo, «2 van» y TALLER · SESIÓN 2 DE 4 y el título en negro. DESIERTO con dos cuadrados cruzados sobre azul pizarra, «Te interesa» junto a EXPO y el título en crema. Destacados no cambia: son eventos con cartel.
- `04-propuesta-festivales-y-expos.png` — Verbena con dos círculos cruzados sobre café (el color de su próximo acto) y Cinema con el sol en el horizonte sobre rojo. FESTIVAL en la ceja, el título dentro y debajo el lugar y «Hasta el…».
- `05-propuesta-expos.png` — La memoria del agua (el cuadro de Albers sobre azul de respaldo) y El desplazamiento del eco (cruce sobre el magenta de su cartel).
- `06-propuesta-expos-cafes.png` — El rostro del paisaje (escala) y Lxs colocaos (cuadro), los dos en café: sus carteles son cafés. Las separa el arreglo, no el color.
- `07-propuesta-esta-semana-taller.png` — en «Esta semana», mediana: Querida yo (dos triángulos cruzados sobre amarillo, título en negro) entre Cine de barrio y La sexualidad antes, que conservan su imagen.
- `08-p7-sin-imagen.png` — P7: los eventos sin imagen de «Esta semana» con el mismo sistema. El SN arriba a la izquierda y el título abajo, sin figura: Yo Marcos en amarillo y tinta negra, Presentación de Palabra fértil en violeta y tinta crema.
- `09-hoy-sin-imagen-e10-medidas.png` — las mismas tarjetas como están hoy (E10, degradado y mayúsculas blancas) con «Medidas»: 2,8:1 y 3,1:1 en rojo.
- `10-p1-solo.png` — P1 con sus valores, sin P7: en el pliegue se ve igual que la Propuesta (P7 solo toca los eventos sin imagen).
- `11-p2-patrones-pliegue.png` — B en «Tus planes»: el laboratorio con una tira de triángulos y DESIERTO con cuadrados anidados.
- `12-p2-patrones-festivales.png` — B en festivales: Verbena con anillos anidados y Cinema con una hilera de círculos que crecen.
- `13-p3-bauhaus.png` — P3 Bauhaus: Verbena y Cinema en el mismo azul. Todos los festivales iguales; el color ya dice la clase.
- `14-p3-propias.png` — P3 Propias: Verbena en violeta y Cinema en magenta, colores de respaldo sin relación con sus carteles.
- `15-p4-titulo-debajo.png` — P4 apagado: el título debajo y la figura en toda la portada (escuadra y cuadrados más grandes), con el chip sobre la portada.
- `16-p5-solo-un-carril.png` — P5 apagado: «Tus planes» con los carteles de hoy; la portada del sistema solo en «Festivales y expos».
- `17-p6-enmarcada.png` — P6: Una vez más con su cartel colgado como cuadro sobre una pared mostaza, y Reflejo atemporal, sin cartel propio, con su cuadro de Albers.
- `18-p8-inclinado.png` — P8 con la inclinación sintética: las figuras de «Tus planes» corridas a la derecha y abajo; el título, el chip y el sello quietos.
- `19-p8-quieto-e-inclinado.png` — recorte de «Tus planes», quieto a la izquierda e inclinado a la derecha. La escuadra y los cuadrados se corren 6,6 px y los de atrás 3,3; el cruce sigue a su cuadrado. Las medidas del contraste quedan a la vista: 5,8:1 y 7,0:1.
- `20-p8-arrastre.png` — el dedo sostenido sobre Verbena y arrastrado: sus círculos corridos a la izquierda; Cinema quieto.
- `21-minima.png` — Mínima: «Festivales y expos» con la portada y el título debajo, como lo firmado; la figura más grande.
- `22-medidas.png` — la Propuesta con «Medidas»: 5,8:1 en el laboratorio y 7,0:1 en DESIERTO.
- `23-hoja-abierta.png` — la hoja en la Propuesta: preajustes, la combinación, el medidor (5,8:1 esta, 16,0:1 Hoy), el porqué y P1.
- `24-todas-las-portadas-propuesta.png` — la hoja de contactos de la Propuesta: los 6 festivales, las 14 expos, los 2 talleres y los 4 eventos sin imagen. Cada uno con su arreglo, el origen de su color y su contraste.
- `25-todas-las-portadas-patrones.png` — la misma hoja con B: dianas, retículas, hileras y anidados.
- `26-lado-a-lado-pliegue.png` — a 1280: «Hoy» a la izquierda (los carteles del laboratorio y de DESIERTO), la Propuesta en medio (escuadra y cuadrados) y el panel.
- `27-lado-a-lado-festivales.png` — lo mismo en «Festivales y expos»: los carteles de Verbena y Cinema contra sus portadas.

## Lo que funcionó y lo que no

- **Funcionó:**
  - Una figura grande por clase (A) se lee de un vistazo, también en la mediana: en la hoja de contactos los círculos, los cuadrados y los triángulos se separan sin leer nada.
  - El título queda entre 5,0:1 y 9,5:1 en todas las combinaciones, contra 2,5–3,1:1 de la tarjeta sin cartel de hoy.
  - P7 une las dos gramáticas: la figura significa clase y el SN significa sin imagen.
  - El color del cartel sí distingue tarjetas vecinas de colores distintos: Verbena, Cinema y Ciclo Fellini; Kowaifest y Xantolo.
- **Funcionó a medias:**
  - **B (patrones):** está más cerca de lawsofux y la retícula se ve fina, pero a 165 px una retícula de piezas chicas se lee como textura antes que como figura. La hilera de círculos parece burbujas y la tira de triángulos del laboratorio, una corona. Prägnanz favorece a A.
  - **P6 (enmarcada):** conserva la identidad de la expo, pero el cartel a 70 px vuelve al problema de origen (no se lee) y compite con el título. Puede servir para galerías en la ficha, no en Inicio.
- **No funcionó:**
  - **P3 Bauhaus:** un color por clase deja el carril monótono (todos los festivales azules) y hace que el color diga la clase, que es justo lo que había que evitar.
  - **P3 Propias:** bonita pero arbitraria: pierde el lazo con el cartel.
- **Lo que no resolví:** carteles parecidos dan colores parecidos.
  - Al final de «Festivales y expos» salen cinco cafés seguidos: las tres expos de Friedeberg comparten un cartel y las dos del MUNI son cafés. Las separa el arreglo, no el color.
  - El respaldo por id dejó 5 de 11 en amarillo, y Una vez más (mostaza de su cartel) cae junto a Reflejo atemporal (amarillo de respaldo).
  - Una regla para la pieza de código: «si la vecina del carril tiene el mismo tono, esta toma el respaldo». Tiene un costo: el color de un evento cambiaría según el carril.

## Lo que recomiendo

**La Propuesta:** P1 + A + «Cartel» con respaldo + título sobre la portada + en todo Inicio + P7, sin P6 y sin P8.
- La clase se lee por la figura en cualquier carril.
- El texto ilegible de los carteles sale de Inicio, pero el cartel sigue en la ficha y en la historia.
- El título se lee en todas las tarjetas.
- La tarjeta sin imagen deja de ser una gramática aparte.

**P8:** apagado. Es vistoso, pero suma un permiso, batería y un gesto que compite con el desplazamiento. Lo dejaría para la app nativa, si el founder lo quiere.

**Para la pieza de código** (si la firma):
- El color ya se guarda (`eventos.colores_cartel`).
- Hace falta llevar a la tarjeta los colores del cartel del acto cuando el festival enseña ese cartel.
- La portada es un SVG chico generado por la app: figura, arreglo por id y recorte en la zona del título.
- Las reglas de contraste son las de arriba. La regla de vecinas, si el founder la quiere.

## Límites

- **Navegador:** probado en Chrome (playwright-core y el navegador integrado), no en Safari del iPhone. El giroscopio no se probó en un teléfono real.
- **Datos:** «Nuevos eventos» no sale (regla de la app, hoy no hay tres). Las sesiones del laboratorio salen de su cartel, como en el prototipo 398. El género y las novedades de los artistas vienen del modelo del 10 de octubre: la extracción de hoy no los trae.
- **Interacción:** las fichas, las historias, la ciudad, «Cuándo» y «Filtros» no se abren; un aviso dice qué se abriría.
- **Calidad:** las figuras son primitivas puestas por código sobre una retícula, es decir, un sistema, no una ilustración. Si alcanza la calidad de un cartel Bauhaus lo juzga el founder.
- **Guiones:** el modelo, el laboratorio de composiciones, la construcción, las capturas, los toques y la medida de contraste quedaron en el scratchpad de la sesión, no en el repo. La página trae su modelo y sus composiciones dentro.

## Para publicar

La página `docs/rediseno/prototipos/portadas-sistema.html` y los 47 archivos de `docs/rediseno/prototipos/portadas-sistema/`:
- 44 webp de carteles, lugares y artistas;
- `logotipo.svg`, `simbolo-sn-blanco.svg` y `sin-foto.webp`.

La página los pide con rutas relativas `portadas-sistema/…`.

## Pendiente

Que el founder lo pruebe en su iPhone: la Propuesta, el muestrario, las tres pruebas y, si quiere, P8 con el botón del giroscopio. Después, que lo firme o lo corrija.
