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
