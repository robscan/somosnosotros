# 52 · Generador de flyers por plantillas (OL-291, propuesta)

**Estado:** propuesta, sin código. **No autoriza construir nada**: ni pantallas, ni tablas, ni gasto en la API de IA. Recoge una idea del founder, lo medido en producción y seis muestras hechas a mano. Se retoma cuando termine el flujo nuevo de eventos (doc 51, que lleva el gestor y aún no está en `main`), donde entraría por la rama «No tengo cartel».
**Origen:** chat de investigación de redes, 2026-10-05. Bitácora [319](../bitacora/2026/10/319-generador-de-flyers.md).

## 1. Qué pidió el founder (palabras suyas)

- 2026-10-04, la idea: «podríamos ofrecer generador de flyers en la plataforma? Que los usuarios pudieran ingresar la información ya sea hablando o contestando formulario y que pudieran seleccionar un diseño que les hagamos? Incluso si ya tienen flyers ofrecer un diseño similar al que ya usan? Esto con la intención de crear cuentas de paga. Digamos un flyer gratis al mes y luego pagar 100 pesos para tener un paquete de 6 flyers y así pagar 200 si se quieren 15 como un ejemplo. Esto para todo tipo de usuarios no solo los lugares.»
- 2026-10-04, tras preguntar por Canva: «solo me preocupa que las plantillas no tengan buena calidad gráfica. Puedas hacer algunas muestras? Como le ofreceríamos a los usuarios opciones variadas para que pueda escoger estilos?»
- 2026-10-05, tras ver las seis muestras: «gestor está trabajando en nuevo flujo de eventos, una vez que termine veremos como incertar esa funcion para los casos donde no hay cartel. […] me parece que lo mejor es que contigo hagamos muchas plantillas (después de estudiar los estilos mas usados en la plataforma) y que usemos esas plantillas de diseño para llenarlas con textos e imagenes según disponibilidad de lugar, artistas y usuarios, presentar unas 4 opciones por vez según estilos de diseño adecuados para lugar y de esa manera agilizar creación, me gustaron mucho tus propuestas pero me preocupó el señalamiento de que dependerá de extención de textos, entonces asegurémonos de que el prompt/skill que hagamos para resolver eso sea inteliegente para resolver variantes de extención de texto y desde plantillas preveer eso aunque definir maximo de extencion por campo.»
- 2026-10-05, formatos: «Ese flyer se deberá general con formato para publicación e historia por favor. Considera formatos nativos de instagram y Facebook, dame dos formatos flexibles que se puedan usar.»

Relación con OL-290 (2026-10-05): el founder retiró la leyenda «sin fines de lucro» pensando en esta función («Podríamos introducir un creador de flyers en el futuro»). El modelo de cobro de arriba es un ejemplo suyo, no una decisión; el sitio no promete nada gratuito por esto.

## 2. Lo que se midió en producción (2026-10-05, solo lectura, todos los eventos de la tabla)

| Dato | Valor |
|---|---|
| Eventos | 273 |
| Sin cartel | 144 (53 %) |
| Largo del título: mediana / 9 de cada 10 / máximo | 51 / 70 / 107 caracteres (la base admite 120) |
| Títulos de más de 60 caracteres | 80 de 273 |
| Nombre del lugar: mediana / 9 de cada 10 | 39 / 57 caracteres |
| Artistas por evento (102 eventos con artistas) | 69 con uno, 26 con 2 a 4, 7 con 5 o más, máximo 8 |
| Precio | hasta 47 caracteres |
| Tipo de lugar | museo 105, casa de cultura 80, otro sitio 39, foro 27, escuela 8, galería 5, biblioteca 5 |

Consecuencia: el título largo es el caso normal, no la excepción. Las seis muestras usaron títulos cortos y aun así pidieron tres vueltas de ajuste a mano por textos encimados. Las plantillas se diseñan primero para el título largo.

## 3. Propuesta

### 3.1 El formato

**Alcance acortado por el founder (2026-10-05):** «acortaremos el alcance, solo publicacion por ahora, es muy complejo buscar cubrir todo desde inicio y se ahorran tokens si solo atacamos la mas probable y común.»

| Formato | Medida | Dónde sirve | Cuándo |
|---|---|---|---|
| Publicación 4:5 | 1080 × 1350 | Publicación de Instagram y de Facebook; también WhatsApp | Ahora |
| Historia 9:16 | 1080 × 1920 | Historias de Instagram y de Facebook, estados de WhatsApp | Después |

- Publicación: lo esencial dentro del cuadrado central, porque la cuadrícula del perfil recorta la vista previa.
- La historia se pidió el mismo día y queda para después. Para no cerrarle la puerta, cada plantilla se diseña por zonas (foto, título, datos, pie) que se puedan reacomodar; la historia pediría 250 px libres arriba y 340 px abajo, donde Instagram pone su interfaz.

### 3.2 Campos y máximos

| Campo | Máximo en el flyer | De dónde sale |
|---|---|---|
| Etiqueta («Estreno · Documental») | 28 | tipo de evento o disciplina |
| Título | 80 (tres tramos: hasta 25, hasta 50, hasta 80) | título del evento |
| Subtítulo | 90, opcional | lo que no cupo en el título |
| Fecha y hora | formato fijo que escribe el sistema | evento |
| Lugar | 60 | ficha del lugar u «otro sitio» |
| Artistas | 8 nombres; si hay más, «y 4 más» | artistas ligados |
| Precio | 24 («Entrada libre», «$150 preventa») | evento |
| Pie | dirección corta de la ficha del evento o código QR | sistema |

### 3.3 Cómo se resuelve el largo del texto (cuatro capas)

1. **Variantes por tramo.** Cada plantilla trae tres composiciones del título (corto, medio, largo). Cambia la composición, no solo el tamaño de letra.
2. **Ajuste medido.** Dentro de su tramo la letra baja por pasos hasta un mínimo legible. Es cálculo, no IA.
3. **Reparto con IA solo si no cabe.** Si el título pasa de 80 o trae varios datos pegados, la IA propone repartirlo: «Estreno Sangre de Coyote: Semilla que florece el barrio (documental)» pasa a etiqueta «Estreno · Documental», título «Sangre de Coyote», subtítulo «Semilla que florece el barrio». La persona lo ve y lo acepta o lo corrige; nunca se cambia su texto a escondidas. No inventa datos ni recorta nombres propios.
4. **Comprobación antes de mostrar.** Cada opción se dibuja y se mide: si un texto se desborda o se encima, esa plantilla no se ofrece. Las 4 que se ven ya pasaron.

Además, **banco de pruebas para dar de alta una plantilla**: no entra al catálogo hasta pasar unos 12 casos reales (título de 107 caracteres, sin foto, 8 artistas, lugar de 59 caracteres, precio largo, sin precio). Esto y las reglas del reparto son el «prompt/skill» que pide el founder.

### 3.4 Catálogo de plantillas y cómo se eligen 4

- **Paso previo:** estudiar los carteles ya cargados (129 eventos con cartel) y clasificarlos por familia de estilo, para construir las que la gente ya usa.
- **Arranque:** 12 plantillas (6 familias × 2), cada una con tres tramos de título, versión con foto y sin foto. Después se añaden por tandas.
- Cada plantilla lleva etiquetas: familia, si necesita foto, cuántos artistas aguanta, para qué tipo de lugar y disciplina va bien.
- **Selección por reglas (sin IA):** se descartan las que no sirven con los datos disponibles, se ordena por afinidad con el lugar y la disciplina, y se muestran 4 de familias distintas. «Ver otras 4» trae las siguientes.
- **Memoria del lugar:** el estilo elegido la vez anterior sale primero.
- **Color:** la paleta se toma de la portada del lugar o de la foto del evento, dentro de combinaciones ya probadas de contraste.
- **Imagen, por orden:** foto que suba la persona, portada o foto del artista, portada del lugar; si no hay ninguna, solo plantillas tipográficas.

### 3.5 Dónde entra en la app

En el flujo nuevo de eventos, cuando el evento no trae cartel: «¿Quieres un flyer?». Lo diseña el gestor en su momento, con prototipo antes que código.

### 3.6 Dónde se guardan las imágenes (propuesta, sin decidir)

El founder pidió (2026-10-05): «Propón donde se guardan las imagenes, ahora tenemos supabase pro pero dime si no es suficiente para probar.»

1. **Las 4 opciones no se guardan.** Se dibujan en el teléfono mientras la persona elige.
2. **Solo se guarda la elegida**, en JPEG, en el bucket `fotos`, y queda como cartel del evento.
3. **Junto a la imagen, su «receta»:** plantilla, textos y paleta. Permite corregir o rehacer el flyer sin guardar más imágenes y ofrecer «como mi flyer anterior». Necesita un lugar en la base (migración que solo añade), sin diseñar.
4. **La descarga sale del teléfono**, no del servidor.

Tamaño medido con las seis muestras en JPEG de calidad 85: de 99 a 272 KB, unos 200 KB de media. Mil flyers son unos 0,2 GB; diez mil, unos 2 GB. El plan Pro de Supabase alcanza para probar; sus topes (100 GB de almacenamiento y 250 GB de tráfico al mes, según la lista de precios conocida) no se consultaron en el panel ese día.

Para quien lo construya:

- El bucket `fotos` es público y las imágenes se sirven por el optimizador de Vercel solo desde `/storage/v1/object/public/fotos/` con extensión jpg, png, webp o avif (OL-263, `src/lib/imagenOptima.ts`). El flyer guardado debe cumplirlo.
- Si el flyer queda como cartel del evento, la lectura de carteles con IA no debe volver a leerlo como si fuera un cartel subido.
- Depende de que el flyer se dibuje fiel en el teléfono, que no está probado (sección 4). Si hubiera que dibujarlo en el servidor, sería una sola vez al elegir y el guardado no cambia.

## 4. Límites y dudas abiertas

- **Cómo se dibuja la imagen final** está sin decidir y sin probar: en el servidor de Vercel con la herramienta de imágenes de Next (acepta solo una parte de CSS) o con un navegador sin pantalla (acepta todo, más pesado). Hace falta una prueba corta antes de diseñar las plantillas, porque decide qué CSS se puede usar.
- **Costo de IA:** con plantillas la IA solo reparte textos que no caben; se espera de centavos por flyer, sin medir. El cálculo anterior (4 a 6 pesos) era con la IA diseñando cada flyer.
- **Tráfico de imágenes:** la cuota de Supabase se agotó una vez con el plan anterior (2026-10-03) por el tráfico general de imágenes de la app. Un flyer guardado se sirve como cualquier cartel: no empeora ese problema ni lo arregla. Propuesta de guardado en 3.6.
- **Lo que no se puede hacer bien:** ilustración y lettering dibujado. Las plantillas son tipografía, foto y formas.
- **Canva descartado:** su conexión pide plan Enterprise y cuenta de Canva por usuario, y ya no tiene editor para incrustar.
- **Por decidir el founder:** el modelo de cobro (su ejemplo: uno al mes sin costo y paquetes de 6 y 15), si los flyers sin costo llevan el sello «somosnosotros.org», y si el flyer generado se guarda como cartel del evento.

## 5. Las muestras

En [`prototipos/flyers/`](prototipos/flyers/): `1-cine`, `2-tipografico`, `3-feria`, `4-zine`, `5-galeria` y `6-deco` (HTML de 1080 × 1350 con `base.css`), `marcador.svg` (imagen neutra en lugar de la foto) y `render.mjs` (las dibuja como PNG con el Chrome de la Mac). Hoja con las seis: [`capturas-319/seis-muestras.png`](capturas-319/seis-muestras.png).

Las muestras son de calidad gráfica, no plantillas: tienen el texto y las medidas escritos a mano para un solo título corto. Las que el founder vio llevaban la portada de un artista; esas copias no están en el repo (es público).
