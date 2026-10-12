# 408 · Prototipo con propuestas para las pruebas de usuario (OL-377)

**Fecha:** 2026-10-12. **Rama:** `prototipo-inicio-propuestas`, base `origin/main` (`152ea11a`). **Operador:** Gestor de cambios VI (Fable 5.1), sin agentes. **Sin migración ni código de la app.**
**Página privada para comentarios:** https://claude.ai/artifact/8EpqEMd3c3n553UqND5KQ8 (versión 7, «Propuesta 7 · Ya fui, cartel del acto, títulos»). **Estado:** esperando los comentarios del founder; la firma quedará como preajuste «Firmada».

## Qué pidió el founder (2026-10-12, pruebas de usuario con su iPhone)

«Revisa lo que te digo y arma prototipo con propuestas.» Los puntos que no son fallos (los fallos van a código aparte: OL-378 a OL-381):
1. Nombres cortados en «Lugares de la semana» y «Artistas de la semana» («Casa de C…», «Centro de…»): que se lean.
2. Destacados y «Seleccionados para ti» siempre en la primera línea, y un tamaño más grande, «como el de Instagram».
3. Lo que le interesa, solo con el icono arriba a la derecha en vez del chip «Te interesa».
4. Bajo la tarjeta, primero la fecha y luego el lugar.
5. Dentro de un festival se ven actos que ya pasaron, con enlace a «Esto ya no está»: lo pasado se queda, pero separado y sin enlaces rotos.

## La página

`docs/rediseno/prototipos/inicio-propuestas.html` con 74 archivos en `inicio-propuestas/` (1,9 MB). Armazón de `portadas-sistema.html` (bitácora 405): los dos teléfonos («Hoy» y la combinación), la hoja con preajustes, medidor, ejercicios, pruebas con cronómetro y notas; desde 760 px el teléfono y la hoja al lado; desde 1180, los dos teléfonos.

- **«Hoy» es la producción del 12 de octubre a las 09:21**, con el código de la app empaquetado con esbuild (`cargarAgenda`, `calcularCarrilesAgenda`, `tarjetaDeInicio`, `paletasDeCarril`, `candidatosAhora`, `cargarEventosSemana`, `cargarArtistasDestacados`…), leído de producción en solo lectura con la cuenta del founder: sus «Voy» y «Me interesa» reales son «Tus planes» (6) y el carril estelar se llama «Seleccionados para ti» (12). 124 eventos vigentes, 20 de esta semana, 9 festivales y expos, 4 nuevos, 21 lugares y 15 artistas de la semana, 10 artistas destacadxs. La fila «Ahora» trae el «Inaugura hoy» de DESIERTO (lo arregla OL-379) y Destacados trae «Cinema» y «CINEMA, clausura» (lo arregla OL-378): el prototipo no los esconde.
- **Las portadas del sistema** se dibujan con el mismo módulo del prototipo 405 (el de la app), con la base y la banda que calculó `paletasDeCarril` en la extracción.
- **Los festivales traen todos sus actos**, también los pasados (CINEMA 5 de 11, Fotovisión 11 de 16, Ciclo Fellini 3 de 6), para la ficha.
- Los guiones (extracción, armado, capturas) quedaron en el scratchpad de la sesión, no en el repo. La página trae su modelo dentro (`<script type="application/json" id="datos">`).

## Los ejercicios (cada uno mueve una palanca; se combinan)

| Clave | Qué cambia | Opciones |
|---|---|---|
| **N** | El nombre en los avatares de 64 | Una línea (hoy) · **Dos líneas** (cortadas en palabra) · Columna ancha (96 px, se ven 3,5) · Nombre al lado (foto de 48 y el nombre en dos líneas a su derecha, 168 px) |
| **T1** | El título de la tarjeta | Corto (hoy: `tituloCorto` + `comoOracion`) · **Completo, tal cual lo escribió quien publicó** (dos líneas, cortado en palabra) · Completo a oración (las mayúsculas sostenidas a oración) · Corto + el resto debajo (el corto de título y lo que sigue a los dos puntos o la coma, en gris, en una línea: nada se pierde) |
| **T2** | Título en tres líneas antes de cortarse | interruptor |
| **D1** | Destacados antes de «Tus planes», debajo de la fila «Ahora» | interruptor |
| **D2** | Tamaño de Destacados (solo ese carril) | Grande (165, hoy) · **XL** (248, se ve una y media, título 19 px) · Ancho (350, una por pantalla, «como Instagram») |
| **D3** | Solo eventos en Destacados: las expos que llegan por lo que sigue la persona bajan a «Festivales y expos»; la expo destacada por la administración sí entra | interruptor |
| **I1** | Lo que te interesa | Chip (hoy) · **Icono arriba a la derecha** (el sello pasa a la izquierda) · Icono bajo el sello · Icono junto al título. «3 van» sigue como chip |
| **F1** | Bajo la tarjeta, primero cuándo (violeta) y luego dónde (gris) | interruptor |
| **Y1** | «Ya fui»: en «Tus planes», una expo o un festival que ya empezó lleva un botón «Ya fui»; al tocarlo sale del carril (con «Deshacer» en el aviso) y queda para el historial | interruptor |
| **F2** | En «Tus planes», el festival enseña el cartel del acto que la persona marcó; sin ninguno, su portada genérica | interruptor |
| **X1** | En la ficha del festival, lo que ya pasó | Todos juntos (hoy, con enlace a «Esto ya no está») · **Aparte, sin enlace** (sección «Ya pasó», en gris) · Aparte, como pasado (cada acto abre su ficha en pasado: lo que traerá el historial) |
| **X2** | «Ya pasó» empieza plegado («Ya pasó · 5 actividades») | interruptor |

Preajustes: **Hoy** (todo apagado), **Propuesta** (N dos líneas · T1 completo · D1 · D2 XL · D3 · I1 arriba a la derecha · F1 · Y1 · F2 · X1 aparte · X2) y **Firmada** (por firmar: mientras, es la propuesta). La ficha del festival se abre tocando Cinema, Fotovisión o Ciclo Fellini; Atrás vuelve a Inicio; la hoja trae los botones «Inicio» y «Ficha del CINEMA».

## Lo que mide (medidor de la hoja, en Chrome a 390×844)

| | Hoy | Propuesta | Columna ancha | Nombre al lado |
|---|---|---|---|---|
| Nombres cortados (de 36: 21 lugares + 15 artistas) | 26 | 19 | 10 | 7 |
| Altura hasta el título de Destacados | 623 px | 225 px | | |
| Ancho de la tarjeta de Destacados | 165 px | 248 px (XL) · 350 (ancho) | | |
| Actos pasados con enlace roto en la ficha del CINEMA | 5 | 0 | | |
| Títulos de tarjeta cortados con «…» (de 60 en todos los carriles) | 7 (corto) | 31 (completo) · 7 (corto + resto) · 10 (completo en tres líneas) | | |

**Hallazgo:** dos líneas no bastan para que los nombres se lean: en la columna de 64 + 12 todavía se cortan 19 de 36 («Casa de Cultura del…», «Centro de Difusión…»). La columna ancha baja a 10 y el nombre al lado a 7; los que siguen cortados son los larguísimos («Centro de las Artes de San Luis Potosí Centenario (CEART)»). La propuesta lleva dos líneas porque no ensancha el carril; si el founder prefiere leerlos enteros, «Columna ancha» o «Nombre al lado» (el medidor lo enseña).

## Capturas (`docs/rediseno/capturas-408/`, 390×844, Chrome real)

- `01-hoy-arriba.png` — producción: fila «Ahora» con DESIERTO «Inaugura hoy», «Tus planes» arriba, Cinema con «Te interesa» como chip.
- `02-hoy-lugares.png` — «Lugares de la semana» con los nombres cortados en una línea («Casa de Cult…», «Centro de Di…», «Museo de Ar…»).
- `03-propuesta-arriba.png` — «Seleccionados para ti» en la primera línea, XL (248 px), sello a la derecha, fecha y luego lugar; con D3 solo quedan los 3 eventos destacados por la administración.
- `04-propuesta-lugares-dos-lineas.png` — nombres en dos líneas («Casa de Cultura del…»): se leen más, no todos.
- `05-n-columna-ancha.png` — columna de 96: «Casa de Cultura del Barrio de…», «Museo de Arte Contemporáneo…».
- `06-n-nombre-al-lado.png` — foto de 48 con el nombre al lado, en dos líneas.
- `07-i1-icono-arriba-derecha.png` — «Tus planes»: el marcador relleno arriba a la derecha y el sello a la izquierda, sin chip.
- `08-i1-icono-bajo-el-sello.png` — el marcador debajo del sello.
- `09-i1-icono-junto-al-titulo.png` — el marcador en el pie, a la derecha de la primera línea.
- `10-i1-chip-hoy.png` — el chip «Te interesa» de producción, para comparar.
- `11-d2-ancho.png` — una tarjeta de 350 a lo ancho, como un post de Instagram.
- `12-d2-grande-d1.png` — Destacados en grande (165) pero en la primera línea.
- `21-t1-corto-hoy.png`, `22-t1-completo-a-oracion.png`, `23-t1-completo-tal-cual.png` — «Tus planes» con el título corto («Cinema»), completo a oración y completo tal cual («CINEMA: XV Festival de Cine…»).
- `24-t1-corto-mas-resto.png`, `25-t2-tres-lineas.png` — las dos salidas para los títulos cortados.
- `26-y1-f2-tus-planes.png`, `27-y1-ya-fui-tocado.png` — «Tus planes» con CINEMA con el cartel de Chatbot Challenge y los botones «Ya fui»; después de tocar «Ya fui» en CINEMA: sale del carril y el aviso ofrece «Deshacer».
- `13-ficha-hoy-arriba.png` — la ficha del CINEMA como en producción (cabecera oscura, KPI, acciones).
- `14-ficha-hoy-programa-con-pasados.png` — el programa de hoy: los 5 actos pasados mezclados y enlazados.
- `15-ficha-aparte-plegado.png` — «Programa registrado: 11 actividades · 6 por venir» y «Ya pasó · 5 actividades · sin enlace» plegado.
- `16-ficha-aparte-abierto.png` — «Ya pasó» abierto: los 5 en gris, foto apagada, sin chevrón ni enlace.
- `17-ficha-como-pasado.png` — los pasados con enlace a su ficha en pasado («· ya pasó»).
- `18-hoja-ejercicios.png`, `19-hoja-ejercicios-2.png` — la hoja con preajustes, medidor y ejercicios.
- `20-ancho-1280.png` — a lo ancho: «Hoy» a la izquierda, la propuesta en medio y la hoja a la derecha.

## Por confirmar con el founder (en la página, con comentarios)

0. **T1/T2:** ¿el título tal cual (31 de 60 cortados), en tres líneas (10), corto + el resto debajo (7), o el corto de hoy?
0b. **Y1/F2:** ¿«Ya fui» así, bajo la tarjeta, y el festival con el cartel de tu acto?
1. **N:** ¿dos líneas (19 de 36 cortados), columna ancha (10) o nombre al lado (7)?
2. **D2:** ¿XL (se ve una y media) o ancho (una por pantalla)?
3. **I1:** ¿el marcador arriba a la derecha con el sello a la izquierda, bajo el sello, o junto al título?
4. **X1:** ¿lo pasado sin enlace, o como pasado (pide la ficha en pasado del historial, pieza 1)?
5. **X2:** ¿«Ya pasó» plegado o abierto?

## Comentarios del founder en la página

1. **«Se corta la imagen, revisa que sí se use proporción de Instagram»** (2026-10-12, 09:36, sobre «CINEMA, clausura» en Seleccionados para ti). Medido: la tarjeta es 4:5 (165×206, 248×310 en XL, 350×437 en ancho) y ese cartel mide 400×511 (0,78), casi 4:5, así que apenas se recorta; lo cortado en esa captura es la tarjeta asomando por el borde (XL enseña una y media). Lo que sí se recortaba: 18 de los 40 carteles de hoy no son 4:5 (las fotos de película del CINEMA son apaisadas, de 1,14 a 1,51; KOWAIFEST es 9:16; cuatro fotos son 3:4) y con `object-fit: cover` anclado arriba pierden los lados o el pie. Añadido **C1** con cuatro opciones en la versión 2.
2. **«Se sigue cortando, el problema es la captura del cartel, revierte por favor»** (09:42). Revertido en la versión 3: C1 fuera, el cartel vuelve al recorte de hoy. Lo que se ve cortado es el archivo mismo del cartel de la clausura en producción (400×511, con «INEMA» y «ROGRAMA» ya cortados por la izquierda: se subió recortado); no es la tarjeta. Queda para el founder: volver a subir ese cartel desde la ficha del acto.
3. **«Aquí mostremos solo eventos con sus portadas. El espacio para expos es abajo, ojo si se destaca un evento de expo ese es el que va acá»** (09:45, sobre Fotovisión 31 en «Seleccionados para ti»). Comprobado con la tira de la administración (`tira_destacados`): de las 12 tarjetas del carril del founder, 3 son destacadas por la administración (Cinema, CINEMA clausura, Austin TV) y las otras 9 son expos de los lugares que sigue (`carrilEstelar`: destacados y después lo que sigue). Añadido **D3** en la versión 4: en el carril estelar solo eventos, salvo la expo destacada a propósito; las expos que salen de ahí dejan de estar «vistas» y aparecen en «Festivales y expos» (de 9 a 17 tarjetas) y, si toca, en «Nuevos». La «Propuesta» lo lleva encendido. Para la app sería un cambio en `carrilEstelar` (`src/lib/inicio.ts`): los favoritos sin exposiciones.
4. **«Esta no la considero propuesta formal porque está rota, los elementos de navegación se movieron y el fondo degradado abajo no está»** (09:46), con una captura de su iPhone de la ficha del Ciclo Fellini. Era la cabecera oscura de la ficha del festival del prototipo: Atrás y ··· quedaban a media cabecera (`align-content: end` empujaba todas las filas al pie) y el velo oscuro iba en `::before`, que el cartel (`position: absolute`, después en el DOM) tapaba; el título blanco quedaba sobre el cartel claro. Versión 5: la cabecera con la rejilla de producción (los botones en la primera fila, el cartel en medio, el título y los KPI abajo), el velo en `::after` con z-index sobre el cartel y lo demás encima.
5. **«¿De dónde sacas este título corto? Me parece un campo adicional que no viene en el formulario (y no lo pondría). Podríamos usar el mismo título que ingresa el usuario? Entiendo que puede ser grande pero hay riesgo de imponerle un título que no le guste»** (09:49, sobre «CINEMA: El atractivo de la resistencia…»). No es un campo: lo calcula `tituloCorto` (lo que va antes de los dos puntos o de la primera coma) y `comoOracion` (mayúsculas sostenidas a oración), desde OL-360/OL-370. Añadido **T1** en la versión 6: corto (hoy), completo tal cual, completo a oración; la «Propuesta» lleva el título tal cual. Medido: con el título completo se cortan con «…» 31 de 60 tarjetas (con el corto, 7 de 61); el título entero siempre está en el nombre del enlace, la ficha y la historia. Si el founder firma T1 completo, OL-378 (`tituloCorto` salta el festival) deja de verse en Inicio aunque siga siendo correcto donde se use el corto.
6. **«¿Cómo propones resolver esto?»** (10:14, sobre «Títulos cortados 31 de 60»). Versión 7: dos salidas medidas. T1 «Corto + el resto debajo»: el corto de título y el resto del texto de quien publicó en una línea gris (7 de 60 cortados, nada se pierde, pero el corto manda en la primera línea). T2 «Título en tres líneas»: el completo con una línea más (10 de 60; unos 18 px más por carril). Lo que no propongo: letra más chica (el founder pidió más grande) ni una cuarta línea.
7. **«Si planeo ir a una expo y ya fui, ¿cómo hago que se mueva de mis planes? En el caso de los festivales, lo que quisiera ver aquí es el cartel del evento que sí me interesa (si es que existe); si no, la portada genérica»** (10:13, sobre Mirar debajo de los pies en Tus planes). Versión 7: **Y1** «Ya fui» (botón bajo la tarjeta de una expo o un festival ya empezado en Tus planes; al tocarlo sale del carril, aviso con «Deshacer», y queda para el historial: es la pieza 1 que sigue; en la app iría también en la ficha junto a «Voy») y **F2** (la tarjeta del festival en Tus planes con el cartel del acto marcado: CINEMA con el de Chatbot Challenge; sin acto con cartel, la portada del sistema).
8. **«Re apruebo esta propuesta, pero ojo con los errores que te dije, no reconstruyas la pantalla completa para no echar a perder lo que está bien en prod»** (10:15, sobre «Ya pasó · 3 actividades · sin enlace» en el Ciclo Fellini). **Firmado parcial: X1 «aparte, sin enlace» con X2 plegado.** La pieza de código tocará solo el programa por día y el bloque «Ya pasó» de la ficha del festival; cabecera, KPI, acciones, Dónde y pie quedan como en producción.
9. **«No se ve igual a prod, pero con que mantengas prod como está todo bien»** (10:16, sobre la cabecera de la ficha) y **«¿Esta me imagino que es una representación del mapa, verdad?»** (10:15, sobre «Dónde»): la cabecera y el «Dónde» del prototipo son bocetos de contexto (el «Dónde» resumido en una línea; en producción van la lista de sedes y el mapa); no se proponen cambios ahí.

## Lo que no entra aquí

Lo firmado en OL-367 (tarjetas 4:5, sello de fecha, ceja, chips) y OL-374 (portadas del sistema) no se toca. La ficha del festival solo cambia en el programa y en «Ya pasó»; el resto (cabecera, KPI, Dónde) es un boceto fiel de producción, no una propuesta. Las fichas en pasado (X1 «como pasado») son del historial de artistas y lugares, pieza 1.
