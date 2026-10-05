# 54 — Cómo afecta el canon por pasos al alta de lugar y de artista

**Fecha:** 2026-10-05 · **Pieza:** OL-295 (análisis pedido por el founder antes de construir) · **Estado:** análisis y recomendación; sin prototipo ni código.

Pedido del founder: «antes de comenzar a ejecutar ese plan, por favor analiza como es que este nuevo canon afecta a los otros flujos de crear (lugar y artistas) y que mejoras pondrías para ellos». Base: el canon aceptado en la bitácora 323 y la medición de hoy en el doc 53 (§ 3 y § 4).

## Lo que hay hoy

| | Lugar | Artista |
| --- | --- | --- |
| Controles a la vista al llegar | 10 | 13 |
| Obligatorio | Nombre y dónde | Nombre |
| Caso corto | 2 toques y 1 escritura | 1 toque y 1 escritura |
| Caso largo | 13 toques y 4 escrituras | 16 toques y 3 escrituras |

El caso corto ya es muy corto. El problema no son los toques: es la pared de controles (el artista enseña nueve bloques para un dato obligatorio) y lo que se publica sin que nadie lo lea.

## Lo que se publica hoy sin leerse (el mismo defecto que la fecha del evento)

- **Artista · disciplina:** sin pista en el nombre, queda «Música». Un pintor que solo escribe su nombre sale como músico en el directorio y en sus filtros.
- **Artista · solista, grupo o colectivo:** sin pista, «Solista».
- **Artista · «Soy yo / es mi grupo»:** queda en «No»; quien registra su propia ficha y no ve el interruptor se queda sin poder editarla.
- **Lugar · tipo:** sin pista, «Otro», sin preguntar.
- **Lugar · ciudad:** si el mapa no la da, el servidor pone San Luis Potosí. Con el catálogo abriéndose a más ciudades, esto ya es un error de datos.
- **Lugar · repetido:** el aviso «¿Es este?» llega después de tocar «Publicar» y cuesta dos toques más.

## Qué partes del canon aplican tal cual

1. Una cosa a la vez, con el botón pegado abajo que dice qué falta.
2. Lo que el sistema resuelve no se pregunta; lo que no pudo resolver se pregunta en su propia pantalla, con opciones grandes que avanzan al tocarlas.
3. «Revisa» antes de publicar: renglones sin etiqueta, lo opcional en un enlace quieto, lo obligatorio que falta con la línea gris de guion 4 y aire 5.
4. Confirmar en el mapa todo punto que no venga del directorio.
5. «Publicado» como final: confirmación grande, la ficha como quedó, «Compartir» y una sola sugerencia en punteado.
6. Editar entra directo a «Revisa».

## Qué cambia respecto al evento

- **No hay cartel.** Lo que resuelve casi todo es el **nombre**: en el lugar trae punto, dirección, ciudad y tipo si se toca una sugerencia del mapa; en el artista trae disciplina y si es grupo. El primer paso es el nombre, no una pregunta de «¿tienes…?».
- **Son más cortos:** dos o tres pantallas, no cinco.

## Recorrido propuesto: lugar

1. **¿Cómo se llama?** Campo con las sugerencias debajo (del mapa y «Ya tiene ficha»). Si ya tiene ficha, se dice aquí y se ofrece ir a ella: no se llega a «Publicar».
2. **¿Es aquí?** El mapa con el pin y la dirección como confirmación. Sale siempre, porque un lugar se queda en el directorio y su punto lo usarán todos sus eventos. Sin sugerencia tocada, este paso es «¿Dónde está?» (buscar la dirección, «Estoy aquí» o mover el pin). Aquí va también «¿Es este?» si hay uno parecido a menos de 150 m, y el aviso de que los negocios no entran si el mapa dice bar, café o restaurante.
3. **¿Qué tipo de lugar es?** Solo si el nombre no lo dijo: nueve opciones, una se toca y avanza.
4. **Revisa:** nombre, dirección y tipo; enlace quieto «Agregar foto, descripción o redes». «Publicar lugar».
5. **Publicado:** «Compartir» y una sugerencia en punteado: «Publica un evento aquí».

Costo: el caso corto pasa de 2 a 3 toques (se suma confirmar el mapa). El caso sin pista deja de publicar «Otro» a ciegas.

## Recorrido propuesto: artista

1. **¿Cómo se llama?** Con el aviso «Ya tiene ficha» mientras se escribe, como hoy.
2. **¿Qué hace?** Solo si el nombre no lo dijo: ocho opciones, una se toca y avanza. La subcategoría («Fotografía», «Clown») deja de ser un segundo paso obligado: queda en «Revisa» como opcional.
3. **Revisa:** disciplina, solista o grupo, ciudad; la casilla «Soy yo / es mi grupo» a la vista y con su consecuencia dicha («podrás editar la ficha»); enlace quieto «Agregar foto, portada, redes o descripción». «Publicar artista».
4. **Publicado:** «Compartir» y una sugerencia en punteado: «Agrega una foto»: las fichas sin foto no salen en destacados, así que es la que más le sirve.

Costo: el caso más corto pasa de 1 a 2 toques (o 3 si hay que decir qué hace). A cambio, nadie sale como «Música» por omisión.

## Mejoras comunes a los tres

- **Elegir qué se publica antes de entrar.** La tira Evento · Lugar · Artista al pie choca con el botón pegado abajo. Al tocar «+» sin contexto, una pantalla con tres opciones; desde Lugares o Artistas, se entra directo.
- **Un solo armazón de pasos** para los tres (barra, avance, pie, transiciones, guardia de salida). Hoy los tres formularios viven montados a la vez y lo escrito en uno cuenta para la guardia de los otros.
- **Altas chicas dentro del evento, con las mismas pantallas:** «Guardarlo como lugar» (ya trae nombre y punto: solo pregunta el tipo) y agregar un artista que no existe desde «Quién» (nombre y qué hace).
- **Nada se publica sin leerse,** que es la regla que ya aceptamos para la fecha.

## Recomendación

1. **Primero el evento,** como está planeado: es donde más se gana (cartel a medias: de 6-8 toques a 4) y donde nace el armazón.
2. **Lugar y artista después, reutilizando ese armazón.** Son baratos una vez que existe, y corrigen datos que hoy salen mal.
3. **Mientras tanto, dos arreglos chicos que no esperan al rediseño,** porque ya ensucian el directorio: (a) el artista sin pista no debe quedar como «Música» sin que alguien lo elija; (b) el lugar no debe quedar en San Luis Potosí cuando el mapa no dio ciudad.
4. El canon de renglones sin etiqueta (OL-297) ya toca las tres altas de hoy y es coherente con todo lo anterior.

## Por decidir

- Si el lugar confirma siempre en el mapa (lo recomiendo) o solo cuando no vino de una sugerencia.
- Si «Soy yo / es mi grupo» es una casilla en «Revisa» (lo recomiendo) o una pregunta propia.
- Qué sugerencia lleva cada «Publicado».
- Si los dos arreglos chicos del punto 3 se hacen ya.
