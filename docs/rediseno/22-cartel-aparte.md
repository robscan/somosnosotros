# 22 · El cartel, fuera del campo del nombre

**Estado:** propuesta sin firmar. **Prototipo:** [`prototipos/cartel-aparte.html`](prototipos/cartel-aparte.html) · **OL:** OL-064 · **Bitácora:** [095](../bitacora/2026/09/095-cartel-aparte.md)

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

## Los textos de A

- **Subtítulo:** «**Con el cartel lo llenamos por ti.** Si no lo tienes, con el nombre y dónde basta.» (la primera frase en negrita; la segunda conserva la promesa de hoy).
- **Tarjeta:** «Sube el cartel» · «Leemos el nombre, la fecha, el lugar y el precio.»
- **Separación:** «o escríbelo tú».
- **Leyendo:** «Leyendo el cartel…» · «Tarda unos segundos. No cierres la pantalla.»
- **Leído:** «Leí el cartel» · «Revisa que todo esté bien y publica.»
- **Falló:** «No pude leer el cartel» · «Llena los datos a mano; la imagen se queda puesta.» + botón «Probar con otra foto».

No hace falta ofrecer «foto o galería» como dos salidas: el iPhone ya pregunta por su cuenta (*Photo Library · Take Photo · Choose File*) al tocar el campo de archivo. Está comprobado en el simulador.

## Los cuatro estados

1. **Llega:** tarjeta en color de acción, el formulario vacío debajo.
2. **Leyendo:** la miniatura de lo que subió sustituye al icono, en el mismo sitio; la espera se dice donde estaba el detalle, con una barra fina. Nada se mueve de sitio.
3. **Leído:** la tarjeta baja de tono (ya hizo su trabajo), desaparece la línea de separación y los renglones quedan llenos. El cartel se queda como imagen del evento, dentro de «Más».
4. **Falló:** la tarjeta se pone en rojo con el motivo y el botón de reintentar dentro. Hoy ese aviso sale debajo del campo del nombre, lejos de donde se tocó.

## Qué cambia en el código (cuando esté firmado)

- `src/app/eventos/FormularioEvento.tsx`: el `<label className={canon.accionCampo}>` de la cámara sale del campo del nombre y se vuelve la tarjeta; los estados `subiendo`, `leyendo` y `avisoCartel` se pintan dentro de ella en vez de en párrafos sueltos.
- `src/components/ui/FormularioCanon.module.css`: nace `.cartel` (y sus estados) y se puede retirar `.accionCampo`, `.conAccion` y la ✕ desplazada (`Limpiar desplazada`), que solo existían para que la cámara cupiera en el campo.
- El subtítulo vive en `src/app/eventos/nuevo/page.tsx`.
- La pieza toca los mismos archivos que `topes-de-campos` (OL-065), así que van una después de la otra, no a la vez.

## Lo que falta decidir (para la firma)

1. **¿La línea «o escríbelo tú»?** Ayuda a separar los dos caminos, pero es texto de ayuda, y la regla es tener el menos posible. Sin ella, el campo del nombre queda justo debajo de la tarjeta.
2. **¿La tarjeta en color de acción?** Así se ve estelar, pero cuando el botón «Publicar evento» se enciende hay dos cosas en el mismo color, una arriba y otra abajo. La alternativa es la tarjeta con borde de color y fondo blanco.
3. **¿Vale también para el alta de lugar y de artista?** Las dos tienen cámara (foto de portada, foto del artista), pero ahí la foto **no llena nada**: es solo una foto. No la tocaría en esta pieza.
