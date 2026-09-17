# 095 · El cartel, fuera del campo del nombre (prototipo)

**Fecha:** 2026-09-17 · **Rama:** `cartel-aparte` · **OL:** OL-064 · **PR:** pendiente · **Solo documentos**

## Qué pidió el founder

2026-09-17, al ver el arreglo del toque de la cámara (bitácora [093](093-toques-en-el-alta-de-evento.md)): «con esa x el riesgo de error aumenta, te propongo sacar el accionable de capturar desde flyer (foto o galería) y ponerlo por separado. De hecho es una funcion estelar, pienso que hay que decirlo desde la descripción que se tiene esa super herramienta».

Gestión de cambios lo convirtió en pieza con prototipo antes que código y firma del founder antes de escribir la pantalla.

## Qué se hizo

- **Prototipo:** [`docs/rediseno/prototipos/cartel-aparte.html`](../../../rediseno/prototipos/cartel-aparte.html), con los tokens y las clases del canon. Seis pantallas de 390×844: la de hoy en producción para comparar, tres variantes y los tres estados de la recomendada (leyendo, leído, falló).
- **Documento:** [`docs/rediseno/22-cartel-aparte.md`](../../../rediseno/22-cartel-aparte.md), con los textos, los estados, qué cambiaría en el código y las tres cosas que falta decidir.

## La recomendación

**Variante A, la tarjeta arriba.** Es la única que cumple las dos cosas que pidió: saca el control del campo apretado *y* se anuncia sola. La B (el cartel como un renglón más del canon) lo saca del campo pero lo vuelve a esconder: queda debajo del nombre y con el mismo peso que Cuándo o Dónde.

Dato comprobado en el simulador que evita trabajo: **no hace falta ofrecer «foto o galería» como dos salidas**. El iPhone ya pregunta por su cuenta (*Photo Library · Take Photo · Choose File*) al tocar el campo de archivo.

## Lo que se vio al mirar el prototipo (disciplina front-visual)

Dos defectos que solo salieron mirando el render, no leyendo el código:

1. La barra fina de espera del estado «Leyendo» **no se veía**: era un `<span>` en línea, y la altura no aplica a un elemento en línea.
2. En el estado «No pude leerlo», el botón «Probar con otra foto» quedaba **pegado al final del texto rojo**, en la misma línea. Ahora va en su propio renglón.

Los dos corregidos y vueltos a mirar.

## Lo que falta

La firma del founder, con tres preguntas abiertas: si se queda la línea «o escríbelo tú», si la tarjeta va en color de acción o solo con borde, y si esto vale también para las cámaras del alta de lugar y de artista (mi opinión: no, porque ahí la foto no llena nada).

Sin código todavía: la pieza toca `FormularioEvento.tsx`, los mismos archivos que `topes-de-campos` (OL-065), y no se escribe hasta que el founder firme.
