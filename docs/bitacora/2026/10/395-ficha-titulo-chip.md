# 395 · Título de ficha al tamaño de los carriles y rótulo de clase en las tarjetas de Inicio

**Pieza:** OL-364. **Rama:** `ficha-titulo-chip`, base `origin/main` (`4ea2d779`). **Fecha:** 2026-10-09. **Operador:** Claude (agente del gestor V). **Sin migración.**

## Lo pedido

Founder, 2026-10-09: «aplicar el mismo token de estilo a los títulos de las fichas, por consistencia»; «señalar que se trata de un evento así como se hace con un festival» y, precisado por el gestor, «este último comentario se refiere a las cards»: el rótulo va en las tarjetas de Inicio, no en la ficha. Después: «En mi carril “Tus planes” se pueden acumular más de un chip. Diciendo si es un evento o un festival. Además de si voy o me interesa.»

## Qué cambió

- **`ui/Ficha.module.css` § 3**: el título de la cabecera clara (evento suelto, acto, lugar, artista) pasa de `--letra-xl` (19 px) a `--letra-2xl` (26 px) con interlineado 1,1, el mismo token y el mismo interlineado de los títulos de carril (OL-361). La cabecera oscura ya estaba en 26 px: ahora hereda tamaño e interlineado de esa misma regla y solo le suma su peso 800 (antes interlineado 1,15). Escritorio (≥ 1048) sigue en `--letra-3xl`, sin cambio.
- **La ficha no lleva chip nuevo** (corrección del founder). Lugar y artista ya llevan su tipo como etiqueta sobre el título («FORO», «ARTES VISUALES»); no se tocó.
- **`lib/destacados.ts`**: `tarjetaConClase` usa la palabra corta de `CLASES` (`cortoDeClase`: «Evento», «Exposición», «Taller», «Festival»; antes «Taller o curso»). Nueva `rotulosDeTarjeta(t, interesa)`: la clase aparte y, como mucho, un dato (`selloDeTarjeta` sin la clase).
- **Carriles de eventos de Inicio** (`CarrilAgenda`, `CarrilTusPlanes`, `CarrilMasAdelante`): todas sus tarjetas salen con `tarjetaConClase`; un evento suelto y un acto de un festival dicen «Evento».
- **`Destacados.tsx` / `.module.css`** (solo la tarjeta «título + cartel», `titular`): `.rotulos`, una fila abajo a la izquierda con la clase y a su lado el dato; `flex-wrap: wrap-reverse` para que, si no caben, el dato suba sobre la clase en vez de cortarse. La tarjeta sin cartel usa la misma fila en su celda `rotulo`, junto al símbolo SN.
- **`personas/consultas.ts`**: «Tus planes» pide también `clase` (el taller salía «Evento»). **`useAsistenciaEnLista`**: la tarjeta recordada de una decisión nueva guarda su clase.
- **Respaldo local**: a Ana le interesan el festival y el taller de linóleo, y el festival «Festival de Cine de Invierno» pasa a visible (sus actos siguen ocultos) para medir «Tus planes» y «Festivales y expos» con un festival.
- **Pruebas**: `agendaPorClase.test.ts`, caso OL-364 (`rotulosDeTarjeta` con festival + «Hoy», festival + «Te interesa», exposición sola, evento + «2 van», «Taller» corto, lugar/artista sin nada).

## La regla de los rótulos (una frase)

En toda tarjeta de evento de Inicio, abajo a la izquierda va primero la clase y a su lado, como mucho, un dato («Te interesa», «Hoy», «Hoy · Sesión 1 de 3» o «n van», en ese orden de prioridad); «Voy» no lleva texto porque lo dice el botón verde de arriba a la derecha, y nunca hay tres rótulos.

Por qué «Te interesa» se queda en texto: el botón redondo de la tarjeta es el de «Voy»; con «Me interesa» queda blanco (sin marcar), y una exposición o un festival ni siquiera llevan botón. Quitarlo dejaría «Tus planes» sin decir por qué está ahí esa tarjeta.

## Títulos largos

No hizo falta una regla nueva: en el teléfono el título de la cabecera clara nunca va en una columna junto a la portada, va sobre ella, a todo lo ancho, al pie de su velo. Un título largo crece hacia arriba; si pasara del alto de la portada, la celda crece con él (no se trunca). Medido con un título de 104 caracteres («Concierto de clausura de la Orquesta Sinfónica de San Luis Potosí con el Coro de la Universidad Autónoma», puesto a mano en la página): 4 líneas, 114 px de título y 170 px de cabecera, dentro de la portada de 213 px a 320 y de 260 px a 390. A dos columnas (≥ 1048) la columna del título es 7/12 del ancho: tampoco se estrecha.

## Medidas (fuente Bricolage cargada, Chrome de la Mac, 390 y 320)

| Ficha | Antes | Después |
|---|---|---|
| Evento «Concierto de la Orquesta Sinfónica de San Luis Potosí» | 19 px, 2 líneas, 44 px de título, cabecera 100 | 26 px, 2 líneas, 57 px, cabecera 113 (390 y 320) |
| Lugar «Centro Cultural Universitario Bicentenario» | 19 px, 1 línea a 390 (22 px), 2 a 320 (44 px); cabecera 109 / 131 | 26 px, 2 líneas (57 px) en ambos; cabecera 145 |
| Artista «Aaron Cadena» | 19 px, 22 px; cabecera 138 | 26 px, 29 px; cabecera 145 |
| Acto «Inauguración: «La luz que queda»» | 19 px, 22 px; cabecera 78 | 26 px, 29 px; cabecera 85 |
| Festival (oscura) | 26 px / 800, interlineado 29,9 | 26 px / 800, interlineado 28,6 (el mismo de las claras) |

`npm run medir`: subió el número de nodos donde hay más rótulos o tarjetas, y se anotó con `--aceptar` (la herramienta reescribe el bloque de presupuestos en una línea por pantalla): `01-inicio` 396 → 412 (el festival ya visible y la fila de rótulos en cada tarjeta), `s01-inicio-sesion` 405 → 406, `s02-agenda-sesion` 308 → 311 y `s14-agenda-nuevos` 194 → 208 (el festival visible en el respaldo), `s25-ficha-festival` 124 → 122 (bajó). Profundidad sin cambio; ninguna otra regla falla.

Verificación: `npm run lint` (0 errores; 1 aviso ya existente en `VisorImagen.componentes.test.mjs`), `typecheck`, `npm test` (190 archivos, 3445 pruebas), `inventario` sin novedades, `medir` sin fallos tras anotar.

## Capturas (`docs/rediseno/capturas-395/`, 390×844 y 320×568 a 2×, reloj fijo del respaldo, sesión de Ana)

- `antes-evento-390/320`: título de 19 px en dos líneas sobre el cartel del concierto.
- `despues-evento-390/320`: el mismo título a 26 px, dos líneas, con el velo bajo él; sin chip en la ficha.
- `despues-largo-evento-390/320`: cuatro líneas a 26 px; a 320 la última queda a ~45 px del pie de la portada y la primera bajo los botones de Atrás y «···», sin tocarlos.
- `despues-lugar-390/320`: «FORO» y «Centro Cultural Universitario Bicentenario» en dos líneas, entero.
- `despues-artista-390`: «ARTES VISUALES», avatar SN y «Aaron Cadena» a 26 px con su meta debajo.
- `despues-acto-390`: el acto oculto del festival a 26 px; la ficha sigue diciendo «Parte de Festival de Cine de Invierno».
- `despues-festival-390`: la cabecera oscura con «FESTIVAL», título 26 px/800 y la banda de números: hermana de las claras.
- `antes-inicio-planes-390/320`: «1 va», «Te interesa» sin decir qué es cada tarjeta.
- `despues-inicio-planes-390/320`: «Evento · 1 va» en «San Luis Potosí en la Cristiada» (Voy: botón verde), «Taller · Te interesa» en el taller de linóleo (a 320 el segundo rótulo queda al borde de la tarjeta que asoma); más a la derecha «Festival · Te interesa».
- `antes-inicio-festivales-390`: el festival solo con «Te interesa».
- `despues-inicio-festivales-390/320` y `despues-inicio-semana-390/320`: «Evento» en «Delirium Pollum» y en la inauguración de Uno de Uno; «Festival» + «Te interesa» en el festival; dos rótulos en fila sin tapar el botón ni salirse.

## Pendiente

Revisión del gestor y «publica» del founder. Sin migración.
