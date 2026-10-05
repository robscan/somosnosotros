# 319 · Generador de flyers: propuesta y muestras

**Pieza:** OL-291. **Rama:** `generador-flyers` (base `origin/main` `65bb7585`). **Fecha:** 2026-10-05.
**Estado:** solo documentos. Sin código de la app, sin migraciones, sin pruebas con la API de IA.

## Qué pasó

El founder planteó en el chat de investigación de redes un generador de flyers para eventos sin cartel, como base de cuentas de paga. Pidió no correr pruebas («solo estoy rebotando ideas»), investigar Canva y después unas muestras de calidad gráfica. Tras verlas decidió el camino (plantillas hechas de antemano, 4 opciones por vez, máximo por campo, dos formatos) y pidió documentarlo y avisar al gestor. El Gestor IV reservó OL-291, bitácora 319, doc 52 y esta rama.

## Qué entra

- `docs/rediseno/52-generador-de-flyers.md`: palabras del founder con fecha, medición de producción, propuesta y dudas abiertas.
- `docs/rediseno/prototipos/flyers/`: seis muestras en HTML y CSS, `marcador.svg` y `render.mjs`.
- `docs/rediseno/capturas-319/seis-muestras.png`: hoja con las seis, comprimida con `comprimir.mjs` (1660 × 1370, 201 KB).

## Medición (2026-10-05, lectura con la llave de servicio, sin escribir)

273 eventos; 144 sin cartel (53 %). Título: mediana 51 caracteres, percentil 90 de 70, máximo 107; 80 pasan de 60 y 8 pasan de 80. Nombre del lugar o sitio: mediana 39, percentil 90 de 57, máximo 59. De 102 eventos con artistas ligados: 69 con uno, 26 con 2 a 4, 7 con 5 o más, máximo 8. Precio: hasta 47 caracteres.

## Investigado y descartado

Canva: la conexión para llenar plantillas pide el plan Enterprise y una cuenta de Canva por usuario; el botón para incrustar su editor se retiró el 2025-12-30. Fuente: su documentación para desarrolladores, leída el 2026-10-04.

## Evidencia

`capturas-319/seis-muestras.png`, abierta y revisada: seis carteles del mismo evento («Sangre de Coyote», estreno en el Festival de Cine UASLP) en dos filas de tres. Arriba: Cine (fondo oscuro, título condensado blanco enorme sobre la imagen, datos al pie en dos columnas), Tipográfico (crema con franja roja vertical «Estreno internacional», título negro en tres líneas, sin foto) y Feria (papel picado de colores arriba, imagen enmarcada, título rojo con sombra, datos en una píldora oscura). Abajo: Zine (imagen teñida de magenta pegada con cinta, título a marcador con «Coyote» subrayado en amarillo, sello redondo con la fecha), Galería (blanco, imagen rectangular, título en serif fino, tres columnas Cuándo, Dónde, Dirige) y Art déco (negro con filetes dorados, imagen en arco, título dorado centrado). En todas la imagen es el marcador gris de montañas, no una foto real.

Defecto visible: en Zine la cinta amarilla de la izquierda pisa la palabra «Estreno» de la etiqueta. Se deja así: son muestras de estilo y el doc 52 explica que hicieron falta tres vueltas de ajuste a mano por textos encimados, que es justo lo que la propuesta resuelve con variantes y comprobación.

## No se hizo

- Ninguna prueba de cómo dibujar la imagen en el servidor.
- Ningún gasto ni llamada a la API de IA; el costo por flyer es una estimación.
- El estudio de los carteles ya cargados para elegir las familias de estilo.
- Las copias con la portada del artista y los PNG grandes quedan fuera del repo, en la máquina del founder.
