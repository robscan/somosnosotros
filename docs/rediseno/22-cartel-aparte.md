# 22 · El cartel, fuera del campo del nombre

**Estado:** **firmado por el founder el 2026-09-17.** **Prototipo:** [`prototipos/cartel-aparte.html`](prototipos/cartel-aparte.html) · **OL:** OL-064 · **Bitácora:** [095](../bitacora/2026/09/095-cartel-aparte.md)

## Lo que pidió el founder

2026-09-17, después de ver el arreglo del toque de la cámara (bitácora [093](../bitacora/2026/09/093-toques-en-el-alta-de-evento.md)):

> «con esa x el riesgo de error aumenta, te propongo sacar el accionable de capturar desde flyer (foto o galería) y ponerlo por separado. De hecho es una funcion estelar, pienso que hay que decirlo desde la descripción que se tiene esa super herramienta»

Son dos cosas: **sacarlo del campo** y **anunciarlo**.

## Por qué tiene razón

1. **La zona más apretada de la app.** Con el nombre escrito, la ✕ de borrar y la cámara comparten los 40 px de la derecha de un campo de 48 px de alto. Son dos blancos pequeños y pegados, y el de la izquierda (la ✕) borra lo escrito. El bug del 2026-09-17 nació justo ahí: el toque en la cámara caía en el campo de texto.
2. **Nadie sabe que existe.** Es un icono de 22 px sin texto. El subtítulo dice «Con el nombre y dónde basta. Lo demás ya está resuelto.» y no menciona que subir el cartel llena el nombre, la fecha, el lugar, el precio, la descripción y hasta los artistas. Es lo más potente que hace la app al publicar y está escondido.

## Las tres variantes (mirar el prototipo)

| | Qué es | A favor | En contra |
|---|---|---|---|
| **Hoy** | La cámara dentro del campo del nombre | No ocupa espacio | Dos blancos pegados; nadie sabe qué hace |
| **A · La tarjeta arriba** *(recomendada)* | Una tarjeta ancha antes del campo: icono, «Sube el cartel» y qué llena | Es lo primero que se ve y se explica sola; el campo se queda solo con su ✕; el subtítulo la anuncia | Cuesta 76 px de alto y una línea de separación («o escríbelo tú») |
| **B · Un renglón más** | El cartel como renglón del canon, arriba de Cuándo | Sin patrón nuevo; consistente | Queda debajo del nombre y con el mismo peso que lo demás: sigue sin verse estelar. Y es el único renglón que no guarda un dato: hace un trabajo |

**Recomiendo A.** Es la única que cumple las dos cosas que pidió el founder: lo saca del campo *y* lo anuncia por sí sola. B lo saca del campo pero lo vuelve a esconder.

## Lo que firmó el founder (2026-09-17)

Tomó la variante A y con ella dos recortes:

> «no agregues más texto a la instrucción, el texto de la tarjeta ancha debe hacer ese trabajo»

> «En el texto debajo de titulo de publicar evento, no digas que basta con nombre y lugar, que llene lo que quiera, no promovemos la creación de eventos incompletos»

De ahí salen tres decisiones firmes:

1. **La frase de debajo del título se va.** En el alta de evento no hay subtítulo: la tarjeta es lo único que explica. La pantalla queda título → tarjeta → formulario.
2. **Fuera la promesa de mínimos.** «Con el nombre y dónde basta. Lo demás ya está resuelto.» desaparece. El sistema sigue dejando publicar con el nombre y el lugar (la validación no cambia: «que llene lo que quiera»), pero la pantalla ya no lo invita.
3. **Sin línea de separación.** No hay «o escríbelo tú». Lo que separa los dos caminos es el aire: 24 px entre la tarjeta y el campo del nombre.

«Duplicar evento» conserva su propia línea («Mismo evento, nueva fecha. Cambia lo que haga falta.»): informa de otra cosa y no promete mínimos.

## Los textos de A

- **Tarjeta:** «Sube el cartel» · «Leemos el nombre, la fecha, el lugar y el precio.»
- **Leyendo:** «Leyendo el cartel…» · «Tarda unos segundos. No cierres la pantalla.»
- **Leído:** «Leí el cartel» · «Revisa que todo esté bien y publica.»
- **Falló:** «No pude leer el cartel» · «Llena los datos a mano; la imagen se queda puesta.» + botón «Probar con otra foto».

No hace falta ofrecer «foto o galería» como dos salidas: el iPhone ya pregunta por su cuenta (*Photo Library · Take Photo · Choose File*) al tocar el campo de archivo. Está comprobado en el simulador.

## Los cuatro estados

1. **Llega:** tarjeta en color de acción justo bajo el título, el formulario vacío debajo.
2. **Leyendo:** la miniatura de lo que subió sustituye al icono, en el mismo sitio; la espera se dice donde estaba el detalle, con una barra fina. Nada se mueve de sitio.
3. **Leído:** la tarjeta baja de tono (ya hizo su trabajo) y los renglones quedan llenos, ninguno en «Falta». Es el estado que mejor cumple lo que pidió el founder: por el camino del cartel el evento sale completo. El cartel se queda como imagen del evento, dentro de «Más».
4. **Falló:** la tarjeta se pone en rojo con el motivo y el botón de reintentar dentro. Hoy ese aviso sale debajo del campo del nombre, lejos de donde se tocó.

## Qué cambia en el código (cuando esté firmado)

- `src/app/eventos/FormularioEvento.tsx`: el `<label className={canon.accionCampo}>` de la cámara sale del campo del nombre y se vuelve la tarjeta; los estados `subiendo`, `leyendo` y `avisoCartel` se pintan dentro de ella en vez de en párrafos sueltos.
- `src/components/ui/FormularioCanon.module.css`: nace `.cartel` (y sus estados) y se puede retirar `.accionCampo`, `.conAccion` y la ✕ desplazada (`Limpiar desplazada`), que solo existían para que la cámara cupiera en el campo. Con ellas se va también la prueba de marcado que nació del bug: ya no hay dos campos bajo un `<label>` (`src/lib/marcado.test.ts` sigue vigilando que no vuelva).
- `src/app/eventos/nuevo/page.tsx`: se quita el `<p className="subtitulo">` del alta (se queda el de duplicar).
- La pieza toca los mismos archivos que `topes-de-campos` (OL-065), así que van una después de la otra, no a la vez.

## Dos cosas que quedaron cerradas al tomar la recomendación, y conviene mirar en el iPhone

1. **La tarjeta va en color de acción.** Es lo que se firmó. Cuando «Publicar evento» se enciende hay dos cosas del mismo color, una arriba y otra abajo; en el prototipo no estorba porque el botón está apagado hasta que el evento está listo. Si en el teléfono molesta, la tarjeta con borde de color y fondo blanco es un cambio de una línea.
2. **No se toca el alta de lugar ni la de artista.** Las dos tienen cámara, pero ahí la foto no llena nada: es solo una foto. Su sitio actual (un renglón propio con la cámara a la derecha) no tiene el problema del campo apretado.
