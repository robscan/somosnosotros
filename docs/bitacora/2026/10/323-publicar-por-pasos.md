# 323 — Prototipo: publicar un evento por pasos (OL-295)

**Fecha:** 2026-10-05 · **Quién:** Gestor de cambios IV (Fable 5.1) · **Rama:** `prototipo-publicar-pasos` · **Solo prototipo; nada de `src/`.**

## De dónde viene

El founder (2026-10-05): la carga de opciones del canon de publicación es demasiado alta; pide paginar como Instagram, una cosa a la vez, con animación que introduzca los elementos, y cuidar el final. Precisó: «si el usuario ingresa cartel entonces se usa la información capturada para ahorrar pasos y solo se presenta para confirmación». Análisis en el doc 51; línea base de hoy en el doc 53 (inventario). Las casuísticas (exposición, festival con programa, taller con sesiones, sitio fuera del directorio) son las del prototipo aceptado en la bitácora 314.

## Qué es

`docs/rediseno/prototipos/publicar-por-pasos.html`: HTML autónomo, móvil primero, con las medidas de `globals.css`. Cinco casos en el selector; arriba cuenta en vivo los toques y las escrituras del recorrido y los compara con los de hoy.

1. **Empieza:** una sola cosa en pantalla, «Sube el cartel», y abajo «No tengo cartel».
2. **Leyendo:** un segundo, con el cartel a la vista.
3. **Solo lo que falta, una pregunta por pantalla:** ¿Cómo se llama? ¿Cuándo es? ¿Dónde es? ¿Cuánto cuesta? Lo leído no se pregunta. Cuando la respuesta es un toque (una hora, un lugar de la lista, «Gratis»), elegir avanza solo; cuando hay que escribir, el botón va pegado abajo y dice qué falta.
4. **Revisa:** el evento como se verá, con «Leído del cartel» y cada dato en su renglón; tocar un renglón abre solo su pregunta. Lo opcional (artistas, descripción, enlace) es un enlace quieto. Sin cartel, un renglón punteado «Cartel · Crear uno con estos datos»: la puerta del generador de flyers (doc 52), que no bloquea publicar.
5. **Publicado:** confirmación grande, el evento como quedó, y una sola sugerencia en punteado cuando aplica; «Compartir» y «Publicar otro».

Transiciones: el paso siguiente entra desde la derecha y Atrás desde la izquierda (200 ms); los datos leídos caen en sus renglones uno tras otro; el sello de publicado crece. Todo se apaga con «reducir movimiento».

## Medido en el prototipo (toques y escrituras, sin contar el selector de fotos)

| Caso | Aquí | Hoy (doc 53) |
| --- | --- | --- |
| Cartel que se lee completo | 2 y 0 | 2 y 0 |
| Cartel sin lugar ni precio (lugar del directorio, gratis) | 4 y 1 | 6 a 8 y 1 a 2 |
| Sin cartel, con precio | 8 y 3 | 8 a 10 y 2 a 3 |
| Sin cartel, gratis | 7 y 2 (contado a mano) | 6 y 2, aceptando una fecha que nadie leyó |
| Cartel de festival con 3 eventos | 2 y 0 | tres altas seguidas |
| Cartel de taller con 4 sesiones | 2 y 0 (4 si se cambia un dato) | no existe: se publica como un solo día |

Lectura honesta: con cartel completo no se ahorran toques (ya eran 2); se gana que la pantalla es solo confirmar. Con cartel a medias sí se ahorran. Sin cartel NO se ahorran toques: se gana una pregunta por pantalla y que ningún dato se publica sin leerse; el toque de más es elegir la fecha, que hoy se acepta a ciegas.

## Evidencia

`docs/rediseno/capturas-323/` (21 PNG a 390×844, 2×), abiertas en hojas de contacto: `legible-1…4` (subir, leyendo, revisar con los cuatro renglones, publicado con la sugerencia de exposición en punteado), `medias-1…5` (¿Dónde es? vacío con «Estoy aquí», lista bajo el campo, ¿Cuánto cuesta? con tres opciones, revisar, publicado), `sin-1…7` (nombre vacío con «Falta el nombre», nombre escrito, día, día y hora, precio, revisar con el renglón del flyer, publicado), `programa-1…2`, `taller-1…3`. Chrome: sin errores de página ni desbordes a 320 y 390; letra Bricolage cargada. En la primera pasada encontré y corregí un choque de clases (al escribir se subrayaba toda la pantalla).

## Lo que no está en el prototipo

Calendario y selector de hora de «Otro día» / «Otra hora» (se reutilizan los que existen); la pregunta del sitio fuera del directorio (ya aceptada en 314); el paso de artistas, descripción y enlace; editar un evento ya publicado (entraría directo a «Revisa»); alta de lugar y de artista por pasos; el teclado real de iOS sobre el botón pegado abajo (hay que probarlo en el simulador cuando sea código).

## Pendiente de decidir con el founder

- Si este recorrido es la base para rehacer el alta de evento.
- Si «Cuándo» siempre se pregunta sin cartel (hoy se propone una fecha y se puede publicar sin tocarla).
- El final: ¿«Compartir» como acción principal?
- Orden de construcción: evento primero; lugar y artista después.

## Segunda vuelta (2026-10-05, noche): tres correcciones del founder

Sus palabras: «la opción de no tengo cartel no debe ir en terciario, por que no es un caso borde, y subir cartel tiene demasiada jerarquía visual. En ¿Donde es? me gustaria considerar caso donde lugar no está en catálogo, agregar paso adicional donde usuario confirma en mapa ubicación, al igual que cuando pone estoy aqui. el componente de "Cartel" podría presentarse desde inicio, como un check box o algo que se seleccione claramente.»

1. **Primera pantalla:** «¿Tienes cartel?» con tres opciones del mismo peso: «Sí, subirlo», «No, hazme uno» y «No, seguir sin cartel». Se quita el recuadro grande de subir.
2. **Confirmar en el mapa:** paso «¿Es aquí?» con el pin, la dirección como confirmación y «Sí, es aquí», tanto para un sitio que no está en el directorio como para «Estoy aquí». Un lugar del directorio no pasa por ahí. Si el sitio no está en el directorio, sigue el paso de las tres opciones ya aceptadas (solo este evento, guardarlo como lugar, sitio reservado).
3. **El cartel hecho por la plataforma se elige desde el inicio** («No, hazme uno»). En «Revisa» el renglón «Cartel» dice «Falta elegir el diseño» y el botón principal lleva a elegir entre cuatro diseños ya rellenos (marcadores de color; doc 52); «Publicar sin cartel» queda como salida.

Las 20 capturas de `docs/rediseno/capturas-323/` se rehicieron con esta versión (sustituyen a las de la primera vuelta): `legible-1-inicio` (las tres opciones), `medias-1…6` (lista con un resultado «Del mapa», ¿Es aquí? con pin punteado, «No está en el directorio», ¿Cuánto cuesta?, revisar, publicado), `sin-1…7` (nombre, ¿Dónde es? con «Estoy aquí», ¿Es aquí? a 40 m de un lugar del directorio, revisar con «Falta elegir el diseño», cuatro diseños, revisar con el diseño puesto, publicado), `programa-1…2`, `taller-1…2` (revisar y revisar tras cambiar el sitio por uno fuera del directorio). Sin errores ni desbordes a 320 y 390.

Conteo con las correcciones (toques y escrituras): cartel completo 2 y 0; cartel sin lugar ni precio con un sitio fuera del directorio 6 y 1 (dos toques más que con un lugar del directorio: confirmar el mapa y decir qué hacer con el sitio); sin cartel, con «Estoy aquí», gratis y cartel hecho por la plataforma 10 y 1.

## Tercera vuelta (2026-10-05, noche): el recuadro vuelve y «Hazme un cartel» va después

El founder corrigió la segunda vuelta: «no, la opción de "No hazme uno" aparece después de decir que no tengo cartel, me gustaba el componente que usabas antes para leer cartel.»

- **Primera pantalla:** vuelve el recuadro «Sube el cartel», más chico (200 px de alto en vez de media pantalla), y justo debajo «No tengo cartel» como botón del mismo ancho. Ya no hay tres opciones.
- **«Hazme un cartel»** aparece tras tocar «No tengo cartel», en el primer paso (¿Cómo se llama?), como casilla que se marca; se puede seguir sin tocarla. En «Revisa», el renglón «Cartel» y el botón principal siguen como en la segunda vuelta.
- Capturas rehechas (21): `legible-1-inicio` muestra el recuadro y el botón; `sin-1-nombre-vacio` la casilla sin marcar con «Falta el nombre»; `sin-2-nombre` la casilla marcada. Sin errores ni desbordes a 320 y 390.

**Decisiones del founder («Adelante con tus recomendaciones»):** este recorrido es la base para rehacer el alta de evento (evento primero; lugar y artista después); sin cartel, la fecha se pregunta siempre; al final «Compartir» es la acción principal salvo que haya una sugerencia en punteado. Preguntó además por crear sin conexión: ver la respuesta del gestor en el registro.

## Cuarta vuelta (2026-10-05, noche): sugerencias con datos, hoja de fecha y lo que falta en el color de acción

Preguntas y pedido del founder: «de donde sacas las sugerencias de cuando es? y a que hora? tienes datos para presentar esas? Al seleccionar otro día y otra hora se muestran los selectores de fecha y hora… que hicimos verdad? Respecto a Cartel, falta elegir diseño, debes separar más el elemento del resto, y la linea punteada mas acentuada… colorearla de color accionable, lo mismo que el texto… aplicalo al canon de esos campos por completar».

- **Las sugerencias de la primera vuelta eran inventadas.** Medido en producción el 2026-10-05, solo lectura, 274 eventos visibles:
  - Hora de inicio: 19:00 (52), 20:00 (39), 17:00 (28), 12:00 (22), 19:30 (20), 18:00 (18), 11:00 (18). Las cuatro primeras suman el 51 %.
  - Día: sábado 71, viernes 68, jueves 51, miércoles 30, domingo 23, martes 19, lunes 12. Viernes y sábado, el 51 %.
  - Anticipación al publicar (eventos con autor): mismo día 2, día siguiente 5, de 2 a 7 días 86, de 8 a 30 días 158, más de 30 días 23.
  - Límite: casi todos los cargó la administración desde agendas institucionales; no es todavía el comportamiento de la gente.
- **Cambio:** los chips de día son «Este viernes», «Este sábado» y «Otro día» (se quitan «Hoy» y «Mañana»); los de hora, 19:00, 20:00, 17:00, 12:00 y «Otra hora», en ese orden.
- **«Otro día» y «Otra hora»** abren la hoja «Selecciona la fecha del evento», como la de `ui/SelectorFecha` de la app: calendario del mes y lista de horas cada 15 minutos en la misma hoja, con «Listo» que dice qué falta. (En la app esa hoja ya existe y se usa en «Empieza» y «Termina».)
- **Lo que falta por completar:** borde punteado de 2 px en el violeta de acción y su texto en el mismo color; el renglón «Cartel» va separado del grupo de datos. Aplicado también al prototipo de Eventos (`eventos-superficies.html`). Para la app se abre una pieza aparte (OL-297): es el estado `pendiente` de `ui/Renglon` y el campo faltante de `FormularioCanon`.
- Capturas rehechas (25): nuevas `sin-3-cuando` (tres chips de día), `sin-4-hoja-fecha` (hoja con «Falta el día»), `sin-5-hoja-fecha-lista` (día 14 y 10:30 elegidos, «Listo»), `sin-8-revisar-falta-diseno` (renglón «Cartel» punteado en violeta y separado). Sin errores ni desbordes a 320 y 390.

## Quinta vuelta (2026-10-05, noche): día y hora por separado con inicio y fin, pendientes afinados y descargar el cartel

Palabras del founder:
- «sigue presentando fecha y hora por separado y ese componente… donde se ve calendario y horas uno sobre otro hay que partirlo en dos, no sirve, es muy grande, adicional deja que el usuario pueda seleccionar inicio y fin en los dos casos».
- «no me gusta que pintaste todos los elementos del campo vacio de morado… solo linea y texto Falta elegir y elegir. No "Cartel" ni icono.»
- «ofrece opción de descargar cartel de eventos. Al final del flujo y en la ficha del evento».

Cambios:
1. **Dos pasos:** «¿Qué día es?» (chips «Este viernes», «Este sábado», «Otro día» y el enlace «Dura varios días») y «¿A qué hora?» («Empieza» con 19:00, 20:00, 17:00, 12:00 y «Otra hora»; al elegir aparece «Termina» a una, dos y tres horas, «Otra hora» y «Sin hora de fin»).
2. **La hoja se parte en dos:** una solo con el calendario (primer toque, inicio; segundo toque en un día posterior, fin; el botón dice «Falta el día», «Listo, un solo día» o «Listo») y otra solo con la lista de horas cada 15 minutos (para «Empieza» o para «Termina», que solo ofrece horas posteriores al inicio). **En la app esto implica partir `ui/SelectorFecha`**, que hoy apila calendario y horas: va con la construcción del flujo.
3. **Pendientes:** en violeta solo la línea punteada de 2 px, el valor («Falta elegir el diseño») y la acción («Elegir»); la clave («CARTEL») y el icono siguen grises. Igual en el prototipo de Eventos. La pieza de la app (OL-297) recibió la misma corrección.
4. **Descargar el cartel:** botón secundario en «Publicado» cuando el evento tiene cartel (subido o hecho por la plataforma) y cuarta acción «Cartel» en la ficha del evento (prototipo de Eventos; captura `ficha-evento-con-descargar`).

Costo medido: sin cartel, con rango de días, fin de hora y cartel hecho por la plataforma, el recorrido de prueba sube a 16 toques y 1 escritura (el camino corto con chips, un día, fin a dos horas, lugar del directorio y gratis son 8 toques y 2 escrituras). La hora de fin suma un toque siempre.

Capturas rehechas (27 del flujo más la de la ficha): nuevas `sin-3-dia`, `sin-4-hoja-calendario`, `sin-5-hoja-calendario-rango` (14 al 16 con su banda), `sin-6-hora`, `sin-7-hora-termina` (19:00 marcada y los chips de fin), `sin-8-hoja-termina` (solo horas desde 19:15), `sin-11-revisar-falta-diseno` (solo línea, valor y acción en violeta). Sin errores ni desbordes a 320 y 390 en los dos prototipos.

## Aceptación del founder (2026-10-05, noche)

«muy bien! me gusta la solución Avancemos». El recorrido por pasos, con sus cinco vueltas, queda como base para construir el alta de evento.

## Plan de construcción propuesto (piezas chicas, cada una con su «publica»)

1. **Partir `ui/SelectorFecha` en dos** (calendario solo, con inicio y fin; lista de horas sola), sin cambiar todavía el alta actual más que en eso. Pedido expreso del founder.
2. **Armazón del flujo por pasos** del alta de evento (barra con Atrás, avance, pie pegado, transiciones con «reducir movimiento»), con los pasos de nombre, día, hora, dónde, cuánto y «Revisa» para el caso sin cartel.
3. **Con cartel:** leer → «Revisa» con «Leído del cartel»; solo se pregunta lo que falte.
4. **Dónde:** confirmar en el mapa (sitio fuera del directorio y «Estoy aquí») y las tres opciones del sitio.
5. **Publicado:** el final con «Compartir», «Descargar el cartel» y la sugerencia en punteado; «Descargar» también en la ficha del evento.
6. **Después, con su propio diseño y decisiones:** exposición, festival con programa y taller con sesiones (necesitan modelo de datos: doc `investigaciones/eventos-modelo.md`), el cartel hecho por la plataforma (doc 52), guardar lo contestado y crear sin conexión, y el alta de lugar y de artista por pasos.

## Sexta vuelta (2026-10-05, noche): renglones sin etiqueta

El founder cuestionó: «Tenemos que seguir poniendo "cuando" "donde" "cuanto" como labels en los campos? … cuestionaria si funciona sin ellos, los iconos y el campo llenado nos da para intuir de que se trata».

Probado en «Revisa»: los renglones resueltos muestran solo icono, valor y «Cambiar» («Jueves 5 de noviembre · 19:00», «Museo Federico Silva», «Gratis», «Lucía Montaño»). Se entiende sin la clave y cada renglón baja de 60 a 48 px de alto. Lo que falta lo dice el propio valor («Falta el lugar», «Falta el precio», «Falta elegir el diseño del cartel»), porque «Falta» a secas ya no tendría contexto. La clave se conserva como nombre accesible (`aria-label`) para lectores de pantalla. Capturas `legible-2-revisar`, `sin-11-revisar-falta-diseno`, `sin-13-revisar`, `taller-1-revisar`. Sin errores ni desbordes a 320 y 390.

Riesgo anotado: funciona mientras el valor se explica solo; un valor ambiguo (un número suelto, un nombre que puede ser lugar o artista) depende del icono. Por eso el cartel lleva la palabra en el valor («Cartel: diseño 2»).

## Séptima vuelta (2026-10-05, noche): el pendiente, solo línea y acción

El founder: «ok, solo deja en morado elegir y la linea, disminuye grosor, pero aumenta el espacio en blanco entre lineas punteadas» y «con elegir quise decir el accionable». Su «ok» responde a la propuesta de llevar al canon de la app (a) violeta punteado solo para lo obligatorio que falta y (b) renglones sin etiqueta visible.

- **Pendiente:** en violeta solo la línea y la acción de la derecha («Elegir», «Poner», «Buscar»). El valor («Falta elegir el diseño del cartel») va en tinta, y la clave y el icono, en gris. La línea baja a 1,5 px con guiones de 6 y 8 de aire. El punteado de CSS no deja fijar el aire, así que se dibuja con un SVG de fondo (en el prototipo, con el color escrito; en la app habrá que hacerlo con máscara para usar el token).
- Igual en el prototipo de Eventos. Capturas `sin-11-revisar-falta-diseno` y `eventos-pendiente-en-hoja`. Sin errores ni desbordes a 320 y 390.

**Idea del founder, misma noche:** «Para eventos creados sin cartel, al editar podemos presentar opción de generar cartel.» De acuerdo: editar entra directo a «Revisa», y ahí el renglón «Sin cartel · Hacer uno» ya existe; sirve además para los eventos que hoy no tienen cartel (144 de 273 según la medición del doc 52). Va con la pieza del generador de flyers.

## Octava vuelta (2026-10-05, noche): la línea del pendiente, decidida, y «Ver otros»

- El founder retiró el violeta de la línea: «la linea punteada es agresiva visualmente en ese color, regresemos al color que usabas antes». Pidió ver opciones en una imagen: `opciones-linea-ocho.png` (ocho tratamientos, A a H). Eligió el color de la A («me gusta la opción A por el color, pero me gustaría ver un poco mas de aire sin llegar a opción B ahí ya te pasaste») y, sobre `opciones-linea-aire.png` (cuatro aires intermedios), **la opción 2**: «vamos con opción 2 por favor para campos faltantes, actualiza el canon cuando publiquemos».
- **Regla final del campo por completar:** línea gris (`--texto-suave`), 1 px, guion de 4 px con 5 px de aire; en violeta solo la acción de la derecha; el valor en tinta; el icono en gris. Aplicada en los dos prototipos; en la app va en OL-297.
- **Si no gustan los diseños del cartel** («acepto Ver otros y publicar sin cartel cuando no guste»): la pantalla «Elige un diseño» lleva «Ver otros» (trae otros cuatro) y «Publicar sin cartel». Sin editor de colores ni letras. Capturas `sin-12-disenos` y `sin-13-disenos-otros`.
- Sin errores ni desbordes a 320 y 390 en los dos prototipos.
